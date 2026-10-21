// src/combat/StateMachine.js
// Universal Combat Engine Phase 1 - Combatant State Machine & Phase Engine

import * as THREE from 'three';
import { getMoveFrameData, STAMINA_COSTS, MELEE_HIT_SECTORS } from './CombatData.js';
import { timeScale } from './TimeScale.js';
import { combatEvents } from './CombatEvents.js';

export const COMBAT_STATES = Object.freeze({
  IDLE: 'IDLE',
  MOVE: 'MOVE',
  ATTACK: 'ATTACK',
  BLOCK: 'BLOCK',
  PARRY: 'PARRY',
  DODGE: 'DODGE',
  STAGGER: 'STAGGER',
  CAST: 'CAST',
  AIM: 'AIM',
  DEAD: 'DEAD',
});

export const STATE_PRIORITY = Object.freeze({
  IDLE: 0,
  MOVE: 10,
  AIM: 45,
  BLOCK: 50,
  ATTACK: 60,
  CAST: 65,
  DODGE: 70,
  PARRY: 80,
  STAGGER: 90,
  DEAD: 100,
});

export const ATTACK_PHASES = Object.freeze({
  NONE: 'NONE',
  STARTUP: 'STARTUP',
  ACTIVE: 'ACTIVE',
  RECOVERY: 'RECOVERY',
});

export const CAST_PHASES = Object.freeze({
  NONE: 'NONE',
  STARTUP: 'STARTUP',
  CAST_POINT: 'CAST_POINT',
  RECOVERY: 'RECOVERY',
});

export class StateMachine {
  constructor(combatant) {
    this.combatant = combatant;
    this.state = COMBAT_STATES.IDLE;
    this.stateTime = 0.0;

    // Action data for current state
    this.currentAction = 'none';
    this.currentMoveKey = '';
    this.currentFrameData = null;
    this.attackPhase = ATTACK_PHASES.NONE;
    this.castPhase = CAST_PHASES.NONE;
    this.currentSpell = null;
    this.currentSpellId = null;

    // Combo tracking
    this.comboIndex = 0; // 0: attack1, 1: attack2, 2: attack3
    this.comboBufferWindow = 0.18; // Seconds into recovery where combo can buffer
    this.comboTimer = 0.0;

    // Input buffer (150ms window)
    this.bufferedAction = null;
    this.bufferedPayload = null;
    this.bufferedTimer = 0.0;

    // Dodge execution parameters
    this.dodgeDirection = new THREE.Vector3(0, 0, 1);
    this.dodgeSpeed = 11.5;
    this.dodgeDuration = 0.35;

    // Stagger execution parameters
    this.staggerDuration = 0.45;

    // Attack magnetism tracking (soft target lock)
    this.magnetismTimer = 0.0;
    this.magnetismTurnRemaining = 0.0;
    this.magnetismStepRemaining = 0.0;
  }

  bufferInput(action, payload = null) {
    this.bufferedAction = action;
    this.bufferedPayload = payload;
    this.bufferedTimer = 0.150; // 150ms buffer
  }

  canTransitionTo(newState) {
    if (this.state === COMBAT_STATES.DEAD) return false;
    if (newState === COMBAT_STATES.DEAD) return true;

    // Stagger is absolute unless dead
    if (this.state === COMBAT_STATES.STAGGER) {
      return this.stateTime >= this.staggerDuration || newState === COMBAT_STATES.STAGGER;
    }

    // Attacks commit during STARTUP and ACTIVE
    if (this.state === COMBAT_STATES.ATTACK) {
      if (newState === COMBAT_STATES.STAGGER) return true;

      if (this.attackPhase === ATTACK_PHASES.STARTUP || this.attackPhase === ATTACK_PHASES.ACTIVE) {
        return false; // Attack commits!
      }

      // During RECOVERY:
      if (this.attackPhase === ATTACK_PHASES.RECOVERY) {
        // Hit-Cancel into DODGE
        if (newState === COMBAT_STATES.DODGE) {
          return this.combatant.hasHitCurrentSwing === true || this.stateTime >= (this.currentFrameData?.duration || 0.45);
        }
        // Combo into next attack
        if (newState === COMBAT_STATES.ATTACK) {
          return true;
        }
        // Normal transitions after duration
        if (this.stateTime >= (this.currentFrameData?.duration || 0.45)) {
          return true;
        }
        return false;
      }
    }

    // Dodge cannot be canceled until i-frames finish
    if (this.state === COMBAT_STATES.DODGE) {
      if (newState === COMBAT_STATES.STAGGER) {
        return this.combatant.iFrameTimer <= 0;
      }
      return this.stateTime >= this.dodgeDuration;
    }

    return true;
  }

  transitionTo(newState, payload = {}) {
    if (!payload.force && !this.canTransitionTo(newState)) {
      return false;
    }

    const prevState = this.state;
    this.state = newState;
    this.stateTime = 0.0;

    // Reset swing tracking flags on state transition
    if (newState !== COMBAT_STATES.ATTACK) {
      this.combatant.hasHitCurrentSwing = false;
      this.combatant.hitTargetsThisSwing.clear();
      this.attackPhase = ATTACK_PHASES.NONE;
    }

    if (prevState === COMBAT_STATES.CAST && newState !== COMBAT_STATES.CAST) {
      if (this.combatant.rig && this.combatant.rig.setEmpowered) {
        this.combatant.rig.setEmpowered(false);
      }
      this.combatant.isCastingSuperArmor = false;
      this.combatant.isCastingUltimate = false;
      this.combatant.hasSpawnedMagicCircle = false;
      if (this.combatant.spellSystem && this.combatant.spellSystem.vfxPool && typeof this.combatant.spellSystem.vfxPool.hideMagicCircle === 'function') {
        this.combatant.spellSystem.vfxPool.hideMagicCircle();
      }
      this.castPhase = CAST_PHASES.NONE;
      this.currentAction = 'none';
      this.currentSpell = null;
      this.currentSpellId = null;
      this.castDuration = 0;
      this.castTimer = 0;
    }

    // 1. Enter ATTACK
    if (newState === COMBAT_STATES.ATTACK) {
      const isHeavy = payload.heavy || false;
      let moveName = 'attack1';

      if (isHeavy) {
        moveName = 'heavy1';
        this.comboIndex = 0;
      } else {
        if (prevState === COMBAT_STATES.ATTACK && this.comboTimer > 0) {
          this.comboIndex = (this.comboIndex + 1) % 3;
        } else {
          this.comboIndex = 0;
        }
        moveName = this.comboIndex === 2 ? 'attack3' : this.comboIndex === 1 ? 'attack2' : 'attack1';
      }

      this.currentAction = moveName;
      this.currentMoveKey = `${this.combatant.weapon.kind}.${moveName}`;
      this.currentFrameData = getMoveFrameData(this.combatant.weapon.kind, moveName);
      this.attackPhase = ATTACK_PHASES.STARTUP;
      this.comboTimer = (this.currentFrameData.duration || 0.46) + 0.18;

      this.combatant.hasHitCurrentSwing = false;
      this.combatant.hitTargetsThisSwing.clear();
      this.combatant.weaponAnchorsValid = false;

      // Spend stamina
      const cost = isHeavy ? STAMINA_COSTS.CHARGED_HEAVY : STAMINA_COSTS.LIGHT_ATTACK;
      this.combatant.spendStamina(cost);

      // Attack Magnetism (Soft target lock)
      this.checkAttackMagnetism(payload);
    }

    // 2. Enter BLOCK / PARRY
    else if (newState === COMBAT_STATES.BLOCK) {
      this.currentAction = 'block';
      this.combatant.parryWindowTimer = 0.12; // Active parry frames on initial block raise
    }

    // 3. Enter DODGE
    else if (newState === COMBAT_STATES.DODGE) {
      this.currentAction = 'roll';
      this.combatant.spendStamina(STAMINA_COSTS.DODGE_ROLL);
      this.combatant.iFrameTimer = 0.22; // I-Frames active from 0.05s to 0.22s

      if (payload.direction && payload.direction.isVector3) {
        this.dodgeDirection.copy(payload.direction).normalize();
      } else {
        const yaw = this.combatant.facingYaw;
        this.dodgeDirection.set(Math.sin(yaw), 0, Math.cos(yaw));
      }

      if (this.combatant.rig && this.combatant.rig.setTint) {
        this.combatant.rig.setTint(0x38bdf8, 0.4); // Blue ghost dodge trail tint
      }
    }

    // 4. Enter STAGGER
    else if (newState === COMBAT_STATES.STAGGER) {
      this.staggerDuration = payload.duration ?? this.combatant.defaultStaggerDuration ?? 0.45;
      this.currentAction = 'flinch';
      if (this.combatant.rig && this.combatant.rig.setTint) {
        this.combatant.rig.setTint(0xffffff, 0.9); // White damage flash
      }
      this.combatant.damageFlashTimer = 0.12;
    }

    // 5. Enter CAST
    else if (newState === COMBAT_STATES.CAST) {
      const spell = payload.spell;
      this.currentSpell = spell;
      this.currentSpellId = payload.spellId;
      this.currentAction = spell?.isUltimate ? 'ultimateChannel' : (spell?.animAction || 'cast');
      this.castDuration = spell?.castTime ?? 0.50;
      this.castTimer = 0.0;
      this.currentFrameData = {
        duration: spell?.castTime ?? 0.50,
        castPoint: spell?.castPoint ?? 0.25,
        recoveryTime: spell?.recoveryTime ?? 0.25,
        superArmor: Boolean(spell?.superArmor),
      };
      this.castPhase = CAST_PHASES.STARTUP;
      this.combatant.hasCastReleased = false;
      this.combatant.isCastingSuperArmor = Boolean(spell?.superArmor);
      if (this.combatant.rig && this.combatant.rig.setEmpowered) {
        this.combatant.rig.setEmpowered(true);
      }
    }

    // 6. Enter AIM
    else if (newState === COMBAT_STATES.AIM) {
      this.currentAction = 'aim';
    }

    // 7. Enter IDLE / MOVE / DEAD
    else if (newState === COMBAT_STATES.IDLE) {
      this.currentAction = 'idle';
    } else if (newState === COMBAT_STATES.MOVE) {
      this.currentAction = 'walk';
    } else if (newState === COMBAT_STATES.DEAD) {
      this.currentAction = 'death';
    }

    return true;
  }

  update(worldDt, rawDt) {
    const combatantDt = timeScale.getCombatantDt(this.combatant, worldDt, rawDt);

    // If combatant is hit-stopped, freeze their internal state & rig
    if (combatantDt <= 0) {
      return;
    }

    this.stateTime += combatantDt;
    if (this.comboTimer > 0) {
      this.comboTimer -= combatantDt;
    }

    // Update attack magnetism smooth turn & step
    if (this.magnetismTimer > 0) {
      this.updateAttackMagnetism(combatantDt);
    }

    // Process buffered inputs
    if (this.bufferedTimer > 0) {
      this.bufferedTimer -= combatantDt;
      if (this.bufferedTimer <= 0) {
        this.bufferedAction = null;
        this.bufferedPayload = null;
      }
    }

    // 1. ATTACK STATE PHASE TRACKING
    if (this.state === COMBAT_STATES.ATTACK && this.currentFrameData) {
      const [hitStart, hitEnd] = this.currentFrameData.hitWindow || [0.16, 0.26];
      const duration = this.currentFrameData.duration || 0.46;

      if (this.stateTime < hitStart) {
        this.attackPhase = ATTACK_PHASES.STARTUP;
      } else if (this.stateTime <= hitEnd) {
        this.attackPhase = ATTACK_PHASES.ACTIVE;
      } else {
        this.attackPhase = ATTACK_PHASES.RECOVERY;
      }

      // Check input buffer during recovery (combo chain or hit-cancel)
      if (this.attackPhase === ATTACK_PHASES.RECOVERY && this.bufferedAction) {
        if (this.bufferedAction === 'ATTACK') {
          this.transitionTo(COMBAT_STATES.ATTACK, this.bufferedPayload || {});
          this.bufferedAction = null;
          return;
        } else if (this.bufferedAction === 'DODGE' && this.combatant.hasHitCurrentSwing) {
          this.transitionTo(COMBAT_STATES.DODGE, this.bufferedPayload || {});
          this.bufferedAction = null;
          return;
        }
      }

      // Natural recovery finish
      if (this.stateTime >= duration) {
        this.transitionTo(COMBAT_STATES.IDLE);
      }
    }

    // 2. DODGE ROLL MOVEMENT & FINISH
    else if (this.state === COMBAT_STATES.DODGE) {
      const step = this.dodgeSpeed * combatantDt;
      this.combatant.position.x += this.dodgeDirection.x * step;
      this.combatant.position.z += this.dodgeDirection.z * step;

      if (this.stateTime >= this.dodgeDuration) {
        if (this.combatant.rig && this.combatant.rig.setTint) {
          this.combatant.rig.setTint(null, 0);
        }
        this.transitionTo(COMBAT_STATES.IDLE);
      }
    }

    // 3. STAGGER RECOVERY
    else if (this.state === COMBAT_STATES.STAGGER) {
      if (this.stateTime >= this.staggerDuration) {
        if (this.combatant.isPoiseBroken) {
          this.combatant.isPoiseBroken = false;
          this.combatant.poise = this.combatant.maxPoise; // Restore full poise on guard-break recovery
        }
        this.transitionTo(COMBAT_STATES.IDLE);
      }
    }

    // 4. CAST SPELL LIFECYCLE
    else if (this.state === COMBAT_STATES.CAST && this.currentSpell) {
      const spell = this.currentSpell;
      const castPoint = this.currentFrameData?.castPoint ?? 0.25;
      const duration = this.currentFrameData?.duration ?? 0.50;

      this.castTimer = this.stateTime;

      if (this.stateTime < castPoint) {
        this.castPhase = CAST_PHASES.STARTUP;
      } else if (!this.combatant.hasCastReleased) {
        this.castPhase = CAST_PHASES.CAST_POINT;
        const requiredMana = spell.isUltimate
          ? Math.round(this.combatant.maxMana * (spell.manaCostRatio ?? 0.70))
          : (spell.isChanneled ? 0 : this.combatant.getDiscountedManaCost(spell.id, spell.manaCost ?? 0));
        if (requiredMana > 0) {
          this.combatant.spendMana(requiredMana);
        }
        this.combatant.spellCooldowns[spell.id] = spell.cooldown;
        this.combatant.hasCastReleased = true;

        if (this.combatant.spellSystem) {
          this.combatant.spellSystem.releaseSpell(
            this.combatant,
            spell,
            this.combatant.castTargetPos,
            this.combatant.castTargetEntity
          );
        }

        combatEvents.emit('onCast', {
          caster: this.combatant,
          name: this.combatant.name,
          spellId: spell.id,
          targetPos: this.combatant.castTargetPos,
          team: this.combatant.team,
        });
      } else {
        this.castPhase = CAST_PHASES.RECOVERY;
        if (this.combatant.rig && this.combatant.rig.setEmpowered) {
          this.combatant.rig.setEmpowered(false);
        }
      }

      // Cast-Cancel into Dodge: Recovery frames can be cancelled into dodge if spell has released
      if (this.castPhase === CAST_PHASES.RECOVERY && this.bufferedAction === 'DODGE' && this.combatant.hasCastReleased) {
        this.combatant.isCastingUltimate = false;
        this.transitionTo(COMBAT_STATES.DODGE, this.bufferedPayload || {});
        this.bufferedAction = null;
        return;
      }

      if (this.stateTime >= duration) {
        this.combatant.isCastingUltimate = false;
        this.transitionTo(COMBAT_STATES.IDLE);
      }
    }

    // 5. UPDATE RIG WITH ANIMATION CONTEXT
    if (this.combatant.rig && typeof this.combatant.rig.update === 'function') {
      this.frameIndex = (this.frameIndex || 0) + 1;
      const isIdleSwarm = this.combatant.isSwarmDummy && this.state === COMBAT_STATES.IDLE;
      if (!isIdleSwarm || ((this.combatant.id + this.frameIndex) % 3 === 0)) {
        const rigAction = this.currentAction === 'heavy1' ? 'attack3' : this.currentAction;
        const rigState = {
          action: rigAction,
          actionTime: this.currentAction === 'heavy1' ? (this.stateTime * 0.78) : this.stateTime,
          moving: this.state === COMBAT_STATES.MOVE,
          speed: this.state === COMBAT_STATES.MOVE ? this.combatant.effectiveMoveSpeed : 0,
          sprinting: false,
          mood: this.state === COMBAT_STATES.STAGGER ? 'sad' : 'neutral',
          bowDraw: this.combatant.bowDrawRatio !== undefined ? this.combatant.bowDrawRatio : (this.combatant.bowDraw || 0),
          arrowVisible: this.combatant.arrowVisible !== undefined ? this.combatant.arrowVisible : (this.combatant.arrows > 0),
          vibTime: this.combatant.bowVibTime !== undefined ? this.combatant.bowVibTime : -1,
          isCasting: this.state === COMBAT_STATES.CAST,
          manaRatio: this.combatant.maxMana > 0 ? (this.combatant.mana / this.combatant.maxMana) : 1.0,
          spellColor: this.currentSpell?.colorPrimary,
          activeSpell: this.currentSpell,
        };
        this.combatant.rig.update(combatantDt, rigState);
      }

      // 6. SAMPLE AND RECORD WEAPON ANCHOR POSITIONS (for Swept Capsule Pipeline)
      if (this.state === COMBAT_STATES.ATTACK && this.attackPhase === ATTACK_PHASES.ACTIVE) {
        if (this.combatant.weaponAnchorsValid) {
          this.combatant.prevWeaponBase.copy(this.combatant.currWeaponBase);
          this.combatant.prevWeaponTip.copy(this.combatant.currWeaponTip);
        }
        this.combatant.rig.getWeaponEdgeBaseWorldPosition(this.combatant.currWeaponBase);
        this.combatant.rig.getWeaponTipWorldPosition(this.combatant.currWeaponTip);

        if (!this.combatant.weaponAnchorsValid) {
          this.combatant.prevWeaponBase.copy(this.combatant.currWeaponBase);
          this.combatant.prevWeaponTip.copy(this.combatant.currWeaponTip);
          this.combatant.weaponAnchorsValid = true;
        }
      } else {
        this.combatant.weaponAnchorsValid = false;
      }
    }
  }

  checkAttackMagnetism(payload = null) {
    if (!this.combatant || !this.combatant.weapon || this.combatant.weapon.kind === 'bow') return;
    const sector = MELEE_HIT_SECTORS[this.combatant.weapon.kind] || MELEE_HIT_SECTORS.sword;
    const lockRadius = sector.radius + 1.0;

    const targets = typeof this.combatant.targetsProvider === 'function'
      ? this.combatant.targetsProvider()
      : (this.combatant.magnetismTargets || payload?.targets || null);
    if (!targets || !Array.isArray(targets)) return;

    let nearest = null;
    let minDist = Infinity;
    const px = this.combatant.position.x;
    const pz = this.combatant.position.z;

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t || t.id === this.combatant.id || t.team === this.combatant.team || t.team === 'neutral' || t.isDead) continue;
      const dx = t.position.x - px;
      const dz = t.position.z - pz;
      const d = Math.hypot(dx, dz);
      if (d <= lockRadius && d < minDist) {
        minDist = d;
        nearest = t;
      }
    }

    if (nearest) {
      const targetYaw = Math.atan2(nearest.position.x - px, nearest.position.z - pz);
      let yawDiff = targetYaw - this.combatant.facingYaw;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

      // Max 25° per attack (25 * Math.PI / 180 = ~0.4363 rad)
      const maxTurn = (25 * Math.PI) / 180;
      this.magnetismTurnRemaining = Math.max(-maxTurn, Math.min(maxTurn, yawDiff));

      // Forward step that stops 0.6m from target
      const stepDist = sector.step || 0.20;
      const allowedStep = Math.max(0, Math.min(stepDist, minDist - 0.6));
      this.magnetismStepRemaining = allowedStep;

      this.magnetismTimer = 0.08;
    } else {
      this.magnetismTimer = 0;
      this.magnetismTurnRemaining = 0;
      this.magnetismStepRemaining = 0;
    }
  }

  updateAttackMagnetism(dt) {
    if (this.magnetismTimer <= 0) return;
    const mDt = Math.min(dt, this.magnetismTimer);
    const fraction = mDt / this.magnetismTimer;

    const dYaw = this.magnetismTurnRemaining * fraction;
    this.combatant.facingYaw += dYaw;
    if (this.combatant.mesh) this.combatant.mesh.rotation.y = this.combatant.facingYaw;
    this.magnetismTurnRemaining -= dYaw;

    const dStep = this.magnetismStepRemaining * fraction;
    if (dStep > 0) {
      const fwdX = Math.sin(this.combatant.facingYaw);
      const fwdZ = Math.cos(this.combatant.facingYaw);
      this.combatant.position.x += fwdX * dStep;
      this.combatant.position.z += fwdZ * dStep;
      if (this.combatant.mesh) {
        this.combatant.mesh.position.x = this.combatant.position.x;
        this.combatant.mesh.position.z = this.combatant.position.z;
      }
    }
    this.magnetismStepRemaining -= dStep;
    this.magnetismTimer -= mDt;
  }
}
