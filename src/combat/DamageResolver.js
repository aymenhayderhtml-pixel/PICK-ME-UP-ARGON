// src/combat/DamageResolver.js
// Universal Combat Engine Phase 1 - Damage & Defense Resolution Core

import * as THREE from 'three';
import { GRADE_MULTS, POISE_TIERS } from './CombatData.js';
import { combatEvents } from './CombatEvents.js';
import { timeScale } from './TimeScale.js';
import { Combatant } from './Combatant.js';
import { rollHitZone } from '../core/TrainingEngine.js';
import { TRAINING_CONFIG } from '../data/training.config.js';

// Pre-allocated scratch objects for angle math
const _defenderForward = new THREE.Vector3();
const _toAttacker = new THREE.Vector3();

export class DamageResolver {
  static resolve(defender, hitPayload) {
    if (!defender || defender.isDead || !hitPayload) {
      return null;
    }

    const attacker = hitPayload.attacker;
    const attackerPos = hitPayload.attackerPosition;

    // -------------------------------------------------------------------------
    // 0. HIT ZONE
    // Every blow lands on a zone (head / heart / torso / limbs). The zone
    // scales the damage and decides whether the wound is serious.
    // -------------------------------------------------------------------------
    const attackKind = hitPayload.attackKind || (hitPayload.spellId ? 'spell' : 'melee');
    const hitZone = hitPayload.hitZone || rollHitZone(attackKind);
    const zoneMult = TRAINING_CONFIG.HIT_ZONE_DAMAGE_MULT[hitZone] ?? 1;

    // -------------------------------------------------------------------------
    // 1. DODGE I-FRAME CHECK
    // -------------------------------------------------------------------------
    if (defender.iFrameTimer > 0) {
      // Perfect Dodge Check: Dodged within 0.08s of active hit
      const isPerfectDodge = defender.stateMachine.stateTime <= 0.13;
      if (isPerfectDodge) {
        timeScale.requestSlowMo(0.3, 0.25, 0.04, 0.08);
        defender.counterWindowTimer = 0.80; // +40% counter-attack bonus
      }

      combatEvents.emit('onDodge', {
        name: defender.name,
        perfect: isPerfectDodge,
      });

      return {
        dodged: true,
        perfectDodge: isPerfectDodge,
        damage: 0,
        poiseDamage: 0,
      };
    }

    // -------------------------------------------------------------------------
    // 2. FRONTAL 120-DEGREE DEFENSE CONE CHECK
    // -------------------------------------------------------------------------
    const yaw = defender.facingYaw;
    _defenderForward.set(Math.sin(yaw), 0, Math.cos(yaw));

    _toAttacker.subVectors(attackerPos, defender.position);
    _toAttacker.y = 0;
    if (_toAttacker.lengthSq() > 0.0001) {
      _toAttacker.normalize();
    } else {
      _toAttacker.set(0, 0, 1);
    }

    // cos(60 deg) = 0.5 -> 120 degree frontal arc
    const isFrontal = _defenderForward.dot(_toAttacker) >= 0.5;

    // -------------------------------------------------------------------------
    // 3. PARRY CHECK (Frontal + Active Parry Window)
    // -------------------------------------------------------------------------
    if (isFrontal && defender.parryWindowTimer > 0) {
      // Parry Success: 0 damage, 0 stamina cost
      timeScale.requestSlowMo(0.3, 0.25, 0.04, 0.08);
      defender.counterWindowTimer = 0.80; // Counter-attack bonus active!

      timeScale.applyHitStop(defender, 0.12);
      if (attacker) {
        timeScale.applyHitStop(attacker, 0.12);
        // Force attacker into vulnerable stagger
        attacker.stateMachine.transitionTo('STAGGER', {
          duration: POISE_TIERS.PARRY_STAGGER_DURATION, // 1.0s
        });
      }

      // Visual flash on defender shield/rig
      if (defender.rig && defender.rig.setTint) {
        defender.rig.setTint(0x00ffff, 0.8);
        defender.damageFlashTimer = 0.15;
      }

      combatEvents.emit('onParry', {
        targetName: defender.name,
        attackerName: hitPayload.attackerName,
      });

      return {
        parried: true,
        damage: 0,
        poiseDamage: 0,
      };
    }

    // -------------------------------------------------------------------------
    // 4. BLOCK CHECK (Frontal + In BLOCK State)
    // -------------------------------------------------------------------------
    if (isFrontal && defender.stateMachine.state === 'BLOCK') {
      const blockEff = defender.shield ? defender.shield.blockEfficiency : 0.50;
      const rawPoise = hitPayload.poiseDamage || 20;
      const staminaCost = Math.max(15, Math.min(35, Math.round(rawPoise * blockEff)));

      // Calculate 20% chip damage
      const weaponMult = hitPayload.weaponMult || 1.0;
      const gradeMult = GRADE_MULTS[hitPayload.weaponGrade || 'D'] || 1.0;
      const moveMult = hitPayload.attackMoveMult || 1.0;
      const rawDmg = (hitPayload.rawDamage ?? hitPayload.damage ?? 15) * weaponMult * gradeMult * moveMult * zoneMult;
      const chipDamage = Math.max(1, Math.round(rawDmg * 0.20));

      // Guard Break Check
      if (defender.stamina - staminaCost <= 0) {
        defender.stamina = 0;
        defender.isPoiseBroken = true;
        defender.hp = Math.max(0, defender.hp - chipDamage);

        defender.stateMachine.transitionTo('STAGGER', {
          duration: POISE_TIERS.GUARD_BREAK_DURATION, // 1.5s
        });

        combatEvents.emit('onPoiseBreak', {
          name: defender.name,
          reason: 'guard_break',
        });

        if (defender.hp <= 0) {
          defender.die();
        }

        return {
          guardBroken: true,
          damage: chipDamage,
          staminaCost,
        };
      }

      // Successful block
      defender.spendStamina(staminaCost);
      defender.hp = Math.max(0, defender.hp - chipDamage);

      // Light hit-stop and knockback on block
      timeScale.applyHitStop(defender, 0.05);
      if (attacker) {
        timeScale.applyHitStop(attacker, 0.05);
      }

      // Push back slightly (2.5 m/s away from attacker)
      defender.knockbackVelocity.copy(_toAttacker).multiplyScalar(-2.5);

      if (defender.rig && defender.rig.setTint) {
        defender.rig.setTint(0x38bdf8, 0.5);
        defender.damageFlashTimer = 0.08;
      }

      combatEvents.emit('onBlock', {
        targetName: defender.name,
        staminaCost,
        chipDamage,
      });

      if (defender.hp <= 0) {
        defender.die();
      }

      return {
        blocked: true,
        damage: chipDamage,
        staminaCost,
      };
    }

    // -------------------------------------------------------------------------
    // 5. UNBLOCKED HIT RESOLUTION
    // -------------------------------------------------------------------------
    const weaponMult = hitPayload.weaponMult || 1.0;
    const gradeMult = GRADE_MULTS[hitPayload.weaponGrade || 'D'] || 1.0;
    const moveMult = hitPayload.attackMoveMult || 1.0;
    const counterMult = attacker && attacker.counterWindowTimer > 0 ? 1.40 : 1.00;

    const baseDmg = hitPayload.rawDamage ?? hitPayload.damage ?? 15;
    const rawDmg = baseDmg * weaponMult * gradeMult * moveMult * counterMult * zoneMult;
    const defReduction = Math.max(0.0, Math.min(0.75, defender.defense || 0.10));
    let finalDamage = Math.max(1, Math.round(rawDmg * (1 - defReduction)));

    // Pain Tolerance shaves a slice off every incoming blow.
    const painReduction = defender.incomingDamageReduction || 0;
    if (painReduction > 0) {
      finalDamage = Math.max(1, Math.round(finalDamage * (1 - painReduction)));
    }

    // Ward Barrier Absorption
    const ward = defender.statusEffects?.get('ward_barrier');
    if (ward && ward.active && ward.barrierHp > 0) {
      const absorbed = Math.min(ward.barrierHp, finalDamage);
      ward.barrierHp -= absorbed;
      finalDamage -= absorbed;
      if (ward.barrierHp <= 0) {
        ward.active = false;
      }
    }

    defender.hp = Math.max(0, defender.hp - finalDamage);

    // Status Effect Application
    if (hitPayload.statusEffect) {
      defender.applyStatusEffect(hitPayload.statusEffect.type, hitPayload.statusEffect);
    }

    // Poise damage application
    const poiseDmg = hitPayload.poiseDamage || 20;
    defender.poise = Math.max(0, defender.poise - poiseDmg);
    defender.poiseRegenTimer = POISE_TIERS.REGEN_DELAY; // Reset 3.0s delay

    // Hit-Stop
    const isHeavy = moveMult >= 1.4;
    const hitStopDur = isHeavy ? 0.09 : 0.05;
    timeScale.applyHitStop(defender, hitStopDur);
    if (attacker) {
      timeScale.applyHitStop(attacker, hitStopDur);
    }

    // Knockback
    const knockbackForce = hitPayload.knockbackSpeed ?? (isHeavy ? 8.5 : 4.0);
    defender.knockbackVelocity.copy(_toAttacker).multiplyScalar(knockbackForce);

    // Stagger / Flinch Evaluation
    let didStagger = false;
    let didPoiseBreak = false;
    const isCasting = defender.stateMachine.state === 'CAST';
    const hasSuperArmor = isCasting && defender.isCastingSuperArmor;

    // Check poise break first
    if (defender.poise <= 0) {
      didStagger = true;
      didPoiseBreak = true;
      defender.isPoiseBroken = true;

      const duration = defender.isBoss
        ? POISE_TIERS.BOSS.staggerDuration // 2.50s
        : POISE_TIERS.ELITE.staggerDuration; // 1.20s

      defender.stateMachine.transitionTo('STAGGER', { duration });
      combatEvents.emit('onPoiseBreak', { name: defender.name });
    }
    // Grunt flinch rule (unless super-armor active)
    else if (defender.maxPoise <= 15) {
      if (!hasSuperArmor) {
        didStagger = true;
        defender.stateMachine.transitionTo('STAGGER', {
          duration: POISE_TIERS.GRUNT.staggerDuration, // 0.45s
        });
        defender.poise = defender.maxPoise;
      }
    }
    // Non-super-armor caster interruption
    else if (isCasting && !hasSuperArmor) {
      didStagger = true;
      defender.stateMachine.transitionTo('STAGGER', {
        duration: 0.45,
      });
    }

    combatEvents.emit('onHit', {
      attackerName: hitPayload.attackerName ?? attacker?.name,
      targetName: defender.name,
      damage: finalDamage,
      poiseDamage: poiseDmg,
      isCritical: counterMult > 1.0,
      isPoiseBreak: didPoiseBreak,
      spellId: hitPayload.spellId || hitPayload.attackKind || null,
      hitZone,
    });

    if (didStagger && !didPoiseBreak) {
      combatEvents.emit('onStagger', {
        name: defender.name,
        duration: 0.45,
      });
    }

    if (defender.hp <= 0) {
      defender.die();
    }

    return {
      damage: finalDamage,
      poiseDamage: poiseDmg,
      staggered: didStagger,
      poiseBroken: didPoiseBreak,
    };
  }

  static resolveHeal(target, amount, source = null) {
    if (!target || target.isDead) return 0;
    return target.receiveHeal(amount, source);
  }
}

// Bind DamageResolver to Combatant static resolver
Combatant.damageResolver = DamageResolver;
