// src/combat/Combatant.js
// Universal Combat Engine Phase 1 - Unified Combatant Entity Component

import * as THREE from 'three';
import { STAMINA_COSTS, POISE_TIERS, SPELLS_TABLE } from './CombatData.js';
import { MANA_CONFIG, calculateMaxMana, FIRE_SPELLS, OVERHEAT_CONFIG, MASTERY_CONFIG } from './spells.config.js';
import { combatEvents } from './CombatEvents.js';
import { StateMachine } from './StateMachine.js';

let _combatantIdCounter = 1;

export class Combatant {
  static get nextId() {
    return _combatantIdCounter++;
  }

  constructor(config = {}) {
    this.id = config.id ?? Combatant.nextId;
    this.name = config.name ?? `Combatant_${this.id}`;
    this.team = config.team ?? 'enemy'; // 'player' | 'enemy' | 'neutral'
    this.roleTag = config.roleTag ?? 'grunt'; // 'vanguard'|'scout'|'tank'|'berserker'|'mage'|'grunt'|'archer'|'boss'
    this.isElite = Boolean(config.isElite);
    this.isBoss = Boolean(config.isBoss);
    this.classTags = new Set(config.classTags ?? (this.roleTag === 'mage' ? ['mage'] : ['melee'])); // e.g. 'mage', 'archer', 'melee'

    // Health
    this.maxHp = config.maxHp ?? 100;
    this.hp = config.hp ?? this.maxHp;
    this.isDead = false;
    this.deathTimer = 0.0;

    // Stamina (Unified across Player, Allies, Enemies)
    this.maxStamina = config.maxStamina ?? 100;
    this.stamina = config.stamina ?? this.maxStamina;
    this.staminaRegenDelay = STAMINA_COSTS.REGEN_DELAY; // 0.80s
    this.staminaRegenTimer = 0.0;
    this.staminaRegenRate = STAMINA_COSTS.REGEN_RATE;   // 35.0 units/sec

    // Intelligence & Mage Leveling (Scales Max Mana)
    this.intelligence = config.intelligence ?? (this.roleTag === 'mage' || this.classTags.has('mage') ? 18 : 10);
    this.mageLevel = config.mageLevel ?? (config.level ?? 1);

    // Mana (Unified Resource for Magic & Spells)
    this.maxMana = config.maxMana ?? calculateMaxMana(this.intelligence, this.mageLevel);
    this.mana = config.mana ?? this.maxMana;
    this.manaRegenRate = config.manaRegenRate ?? MANA_CONFIG.baseManaRegenRate; // 4.5 mana/sec
    this.manaRegenDelay = MANA_CONFIG.regenPauseAfterCast; // 2.0s after casting
    this.manaRegenTimer = 0.0;
    this.manaFizzleTimer = 0.0;

    // Mana Potions (Key Q: 3 charges, restores 40%, 8s cd)
    this.manaPotions = config.manaPotions ?? MANA_CONFIG.potion.initialCount;
    this.maxManaPotions = MANA_CONFIG.potion.initialCount;
    this.manaPotionCooldown = 0.0;
    this.maxManaPotionCooldown = MANA_CONFIG.potion.cooldown;

    // Channeled & Ultimate Spellcast State
    this.channeledSpell = null;
    this.channelTimer = 0.0;
    this.channelTickTimer = 0.0;
    this.isCastingUltimate = false;
    this.ultimateHpAtStart = 0;

    // Spell Cooldown Tracking
    this.spellCooldowns = {
      emberBolt: 0,
      fireDartVolley: 0,
      fireball: 0,
      flameWall: 0,
      infernoBeam: 0,
      fireNova: 0,
      solarCataclysm: 0,
      iceSpike: 0,
      lightningChain: 0,
      heal: 0,
      ward: 0,
      meteor: 0
    };

    // Spellcast Execution State
    this.castTargetPos = new THREE.Vector3();
    this.castTargetEntity = null;
    this.hasCastReleased = false;
    this.isCastingSuperArmor = false;
    this.spellSystem = null; // Injected by SpellSystem or Sandbox

    // Overheat & Mastery State
    this.recentSpellCastTimes = [];
    this.isOverheated = false;
    this.overheatTimer = 0.0;
    this.spellMastery = {};

    // Poise / Posture
    const tier = this.isBoss
      ? POISE_TIERS.BOSS
      : this.isElite
      ? POISE_TIERS.ELITE
      : this.team === 'player'
      ? POISE_TIERS.PLAYER
      : POISE_TIERS.GRUNT;

    this.maxPoise = config.maxPoise ?? tier.maxPoise;
    this.poise = this.maxPoise;
    this.poiseRegenDelay = POISE_TIERS.REGEN_DELAY; // 3.0s
    this.poiseRegenTimer = 0.0;
    this.poiseRegenRate = POISE_TIERS.REGEN_RATE;   // 25.0 units/sec
    this.isPoiseBroken = false;
    this.defaultStaggerDuration = tier.staggerDuration;

    // Combat Stats & Equipment
    this.baseAttack = config.baseAttack ?? 15;
    this.defense = config.defense ?? 0.10; // 0.0 to 0.75 damage reduction

    this.weapon = {
      kind: config.weapon?.kind ?? 'sword',
      grade: config.weapon?.grade ?? 'D',
      damageMult: config.weapon?.damageMult ?? 1.0,
      reach: config.weapon?.reach ?? 0.85,
      radius: config.weapon?.radius ?? 0.12,
      durability: config.weapon?.durability ?? 100,
    };

    this.shield = config.shield
      ? {
          kind: config.shield.kind ?? 'ironRound',
          grade: config.shield.grade ?? 'D',
          blockEfficiency: config.shield.blockEfficiency ?? 0.65, // Lower stamina cost
          durability: config.shield.durability ?? 100,
        }
      : null;

    // Transform & Physics (Pre-allocated Vector3s)
    this.position = new THREE.Vector3().copy(config.position ?? new THREE.Vector3());
    this.velocity = new THREE.Vector3();
    this.knockbackVelocity = new THREE.Vector3();
    this.facingYaw = config.facingYaw ?? 0.0;
    this.moveSpeed = config.moveSpeed ?? 4.8;
    this.capsuleRadius = config.capsuleRadius ?? 0.35;
    this.capsuleHeight = config.capsuleHeight ?? 1.55;

    // Visual Rig & Swept Capsule Anchors
    this.mesh = config.mesh ?? null; // THREE.Group
    this.rig = config.rig ?? null;   // HeroRig / DummyRig
    this.prevWeaponBase = new THREE.Vector3();
    this.prevWeaponTip = new THREE.Vector3();
    this.currWeaponBase = new THREE.Vector3();
    this.currWeaponTip = new THREE.Vector3();
    this.weaponAnchorsValid = false;

    // Timers & Combat Flags
    this.hitStopTimer = 0.0;
    this.damageFlashTimer = 0.0;
    this.iFrameTimer = 0.0;
    this.counterWindowTimer = 0.0; // 0.80s (+40% dmg bonus after parry/perfect dodge)
    this.parryWindowTimer = 0.0;   // 0.12s active parry frames on block start
    this.incomingThreatTimer = 0.0; // Set by nearby active attacker windup
    this.hasHitCurrentSwing = false;
    this.hitTargetsThisSwing = new Set();
    this.currentTarget = null;

    // Status Effects (Pre-allocated fixed slot objects for zero GC)
    this.statusEffects = new Map([
      ['burn',        { active: false, duration: 0, tickInterval: 0.50, tickTimer: 0, potency: 6, tickDamage: 3 }],
      ['freeze_slow', { active: false, duration: 0, tickInterval: 0.00, tickTimer: 0, potency: 0.60 }],
      ['stun',        { active: false, duration: 0, tickInterval: 0.00, tickTimer: 0, potency: 1 }],
      ['ward_barrier',{ active: false, duration: 0, tickInterval: 0.00, tickTimer: 0, barrierHp: 60, maxBarrierHp: 60 }],
      ['poison',      { active: false, duration: 0, tickInterval: 1.00, tickTimer: 0, potency: 3, tickDamage: 3 }],
    ]);

    // Finite State Machine
    this.stateMachine = new StateMachine(this);
  }

  init() {
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = this.facingYaw;
    }
  }

  update(rawDt, worldDt) {
    if (this.isDead) {
      this.deathTimer += worldDt;
      return;
    }

    // 1. Tick Flash & Visual Effects
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= rawDt;
      if (this.damageFlashTimer <= 0) {
        this.damageFlashTimer = 0;
        if (this.rig && this.rig.setTint) {
          this.rig.setTint(null, 0);
        }
      }
    }

    // 2. Tick Spell & Potion Cooldowns
    for (const k in this.spellCooldowns) {
      if (this.spellCooldowns[k] > 0) {
        this.spellCooldowns[k] = Math.max(0, this.spellCooldowns[k] - worldDt);
      }
    }
    if (this.manaPotionCooldown > 0) {
      this.manaPotionCooldown = Math.max(0, this.manaPotionCooldown - worldDt);
    }
    if (this.manaFizzleTimer > 0) {
      this.manaFizzleTimer = Math.max(0, this.manaFizzleTimer - worldDt);
    }

    // 2b. Channeled Spell Update (Inferno Beam)
    if (this.channeledSpell) {
      this.channelTimer += worldDt;
      this.channelTickTimer += worldDt;
      const interval = this.channeledSpell.tickInterval || 0.20;
      if (this.channelTickTimer >= interval) {
        this.channelTickTimer = 0;
        const tickCost = (this.channeledSpell.manaCostPerSecond || 8.0) * interval;
        if (this.mana < tickCost || this.channelTimer >= (this.channeledSpell.maxChannelDuration || 3.0)) {
          this.stopChannel();
        } else {
          this.spendMana(tickCost);
          if (this.spellSystem && typeof this.spellSystem.tickChanneledSpell === 'function') {
            this.spellSystem.tickChanneledSpell(this, this.channeledSpell, this.castTargetPos);
          }
        }
      }
    }

    // 3. Tick Mana Regeneration
    if (this.overheatTimer > 0) {
      this.overheatTimer = Math.max(0, this.overheatTimer - worldDt);
      if (this.overheatTimer <= 0) {
        this.isOverheated = false;
      }
    }

    if (this.manaRegenTimer > 0) {
      this.manaRegenTimer = Math.max(0, this.manaRegenTimer - worldDt);
    } else if (this.overheatTimer <= 0 && this.mana < this.maxMana && this.stateMachine.state !== 'DEAD') {
      this.mana = Math.min(this.maxMana, this.mana + this.manaRegenRate * worldDt);
    }

    // 4. Tick Status Effects
    for (const [key, effect] of this.statusEffects) {
      if (!effect.active) continue;
      effect.duration -= worldDt;
      if (effect.duration <= 0) {
        effect.active = false;
        effect.duration = 0;
        if (key === 'ward_barrier') {
          effect.barrierHp = 0;
        }
      } else if (effect.tickInterval > 0) {
        effect.tickTimer += worldDt;
        if (effect.tickTimer >= effect.tickInterval) {
          effect.tickTimer = 0;
          const dmg = effect.tickDamage || effect.potency || 3;
          this.hp = Math.max(0, this.hp - dmg);
          this.damageFlashTimer = 0.12;
          if (this.rig && this.rig.setTint) {
            this.rig.setTint(key === 'burn' ? 0xff5522 : 0x22c55e, 0.7);
          }
          combatEvents.emit('onStatusTick', { targetName: this.name, status: key, damage: dmg });
          combatEvents.emit('onHit', {
            attackerName: 'Burn',
            targetName: this.name,
            damage: dmg,
            poiseDamage: 0,
            isCritical: false,
            isPoiseBreak: false,
            isBurn: key === 'burn',
            hitPoint: this.position,
          });
          if (this.hp <= 0) {
            this.die();
          }
        }
      }
    }

    // 5. Tick Counter Window (+40% bonus damage window after parry / perfect dodge)
    if (this.counterWindowTimer > 0) {
      this.counterWindowTimer = Math.max(0, this.counterWindowTimer - worldDt);
    }

    // 6. Tick Parry Window
    if (this.parryWindowTimer > 0) {
      this.parryWindowTimer = Math.max(0, this.parryWindowTimer - worldDt);
    }

    // 7. Tick I-Frames
    if (this.iFrameTimer > 0) {
      this.iFrameTimer = Math.max(0, this.iFrameTimer - worldDt);
    }

    // 8. Stamina Regeneration
    if (this.stateMachine.state !== 'BLOCK') {
      if (this.staminaRegenTimer > 0) {
        this.staminaRegenTimer -= worldDt;
      } else if (this.stamina < this.maxStamina) {
        this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenRate * worldDt);
      }
    } else {
      // Holding block drains stamina slowly
      this.spendStamina(STAMINA_COSTS.BLOCK_HOLD_PER_SEC * worldDt, false);
    }

    // 9. Poise Regeneration
    if (!this.isPoiseBroken && this.poise < this.maxPoise) {
      if (this.poiseRegenTimer > 0) {
        this.poiseRegenTimer -= worldDt;
      } else {
        this.poise = Math.min(this.maxPoise, this.poise + this.poiseRegenRate * worldDt);
      }
    }

    // 10. Knockback Integration with Exponential Damping
    if (this.knockbackVelocity.lengthSq() > 0.001) {
      this.position.addScaledVector(this.knockbackVelocity, worldDt);
      this.knockbackVelocity.multiplyScalar(Math.exp(-8.0 * worldDt));
      if (this.knockbackVelocity.lengthSq() < 0.01) {
        this.knockbackVelocity.set(0, 0, 0);
      }
    }

    // 11. Update State Machine & Rig
    this.stateMachine.update(worldDt, rawDt);

    // 12. Sync mesh position and yaw
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = this.facingYaw;
    }
  }

  get effectiveMoveSpeed() {
    let spd = this.moveSpeed;
    if (this.statusEffects.get('freeze_slow')?.active) {
      spd *= 0.60;
    }
    if (this.channeledSpell) {
      spd *= (this.channeledSpell.mageMoveSpeedMult || 0.30);
    } else if (this.stateMachine.state === 'CAST') {
      spd *= 0.35;
    }
    return spd;
  }

  spendStamina(amount, setDelay = true) {
    this.stamina = Math.max(0, this.stamina - amount);
    if (setDelay) {
      this.staminaRegenTimer = this.staminaRegenDelay;
    }
    return this.stamina > 0;
  }

  spendMana(amount) {
    if (this.mana < amount) return false;
    this.mana = Math.max(0, this.mana - amount);
    this.manaRegenTimer = this.manaRegenDelay; // 2.0s pause after casting
    return true;
  }

  useManaPotion() {
    if (this.isDead) return false;
    if (this.manaPotions <= 0) return false;
    if (this.manaPotionCooldown > 0) return false;

    const restoreAmount = Math.round(this.maxMana * MANA_CONFIG.potion.restoreRatio);
    this.mana = Math.min(this.maxMana, this.mana + restoreAmount);
    this.manaPotions--;
    this.manaPotionCooldown = this.maxManaPotionCooldown;

    combatEvents.emit('onPotionUsed', {
      combatant: this,
      name: this.name,
      restoreAmount,
      potionsRemaining: this.manaPotions,
    });
    return true;
  }

  triggerManaFizzle() {
    this.manaFizzleTimer = MANA_CONFIG.fizzleFlashDuration;
    combatEvents.emit('onManaFizzle', { combatant: this, name: this.name });
  }

  setMageLevel(lvl) {
    this.mageLevel = Math.max(1, Math.min(20, lvl));
    this.maxMana = calculateMaxMana(this.intelligence, this.mageLevel);
    this.mana = Math.min(this.mana, this.maxMana);
  }

  stopChannel() {
    if (this.channeledSpell) {
      this.spellCooldowns[this.channeledSpell.id] = this.channeledSpell.cooldown;
      this.channeledSpell = null;
      this.channelTimer = 0;
      this.channelTickTimer = 0;
      if (this.spellSystem && typeof this.spellSystem.stopChanneledSpell === 'function') {
        this.spellSystem.stopChanneledSpell(this);
      }
      if (this.stateMachine.state === 'CAST') {
        this.stateMachine.transitionTo('IDLE');
      }
    }
  }

  receiveHeal(amount, source = null) {
    if (this.isDead) return 0;
    const oldHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const healed = Math.round(this.hp - oldHp);
    if (healed > 0) {
      this.damageFlashTimer = 0.15;
      if (this.rig && this.rig.setTint) {
        this.rig.setTint(0x22c55e, 0.6);
      }
      combatEvents.emit('onHeal', {
        targetName: this.name,
        amount: healed,
        currentHp: Math.round(this.hp),
        maxHp: this.maxHp,
        sourceName: source?.name || 'Healing'
      });
    }
    return healed;
  }

  applyWard(barrierHp = 60, duration = 6.0) {
    const ward = this.statusEffects.get('ward_barrier');
    if (ward) {
      ward.active = true;
      ward.duration = duration;
      ward.barrierHp = barrierHp;
      ward.maxBarrierHp = barrierHp;
      combatEvents.emit('onWard', {
        targetName: this.name,
        barrierHp
      });
    }
  }

  applyStatusEffect(type, conf = {}) {
    let eff = this.statusEffects.get(type);
    if (!eff) {
      eff = { active: false, duration: 0, tickInterval: 0.5, tickTimer: 0, tickDamage: 4, potency: 1.0 };
      this.statusEffects.set(type, eff);
    }
    eff.active = true;
    eff.duration = typeof conf === 'number' ? conf : (conf.duration ?? eff.duration);
    if (typeof conf === 'object') {
      if (conf.potency !== undefined) eff.potency = conf.potency;
      if (conf.tickDamage !== undefined) eff.tickDamage = conf.tickDamage;
      if (conf.tickInterval !== undefined) eff.tickInterval = conf.tickInterval;
      if (conf.barrierHp !== undefined) eff.barrierHp = conf.barrierHp;
    }
    eff.tickTimer = 0;
  }

  castSpell(spellId, targetPos = null, targetEntity = null) {
    const spell = SPELLS_TABLE[spellId];
    if (!spell) {
      console.warn(`[Combatant.castSpell] Unknown spellId: ${spellId}`);
      return false;
    }

    const hasAccess = this.classTags.has(spell.requiredTag) || this.classTags.has('shaman') || this.classTags.has('mage');
    if (!hasAccess) {
      console.warn(`[Combatant.castSpell] ${this.name} lacks required class tag '${spell.requiredTag}'`);
      return false;
    }

    // Check level lock
    if (spell.unlockLevel && (this.mageLevel || 1) < spell.unlockLevel) {
      this.triggerManaFizzle();
      return false;
    }

    // Check cooldown
    if ((this.spellCooldowns[spellId] || 0) > 0) {
      return false;
    }

    // Check mastery level and adjust required mana
    const mastery = this.spellMastery[spellId] || { casts: 0, level: 0 };
    let requiredMana = spell.isUltimate
      ? Math.round(this.maxMana * (spell.manaCostRatio ?? 0.70))
      : (spell.manaCost ?? 0);
    if (mastery.level > 0 && !spell.isUltimate) {
      requiredMana = Math.max(1, Math.round(requiredMana * (1.0 - mastery.level * (MASTERY_CONFIG.manaCostReductionPerLevel || 0.03))));
    }

    if (this.mana < requiredMana) {
      this.triggerManaFizzle();
      return false;
    }

    // Track spell casts for mastery (+1 level per 25 casts, max 5)
    mastery.casts++;
    mastery.level = Math.min(MASTERY_CONFIG.maxLevel, Math.floor(mastery.casts / MASTERY_CONFIG.castsPerLevel));
    this.spellMastery[spellId] = mastery;

    // Overheat Tracking: 5 spells cast within 6 seconds
    const nowSec = performance.now() / 1000;
    this.recentSpellCastTimes = this.recentSpellCastTimes.filter(t => nowSec - t <= OVERHEAT_CONFIG.castWindowSeconds);
    this.recentSpellCastTimes.push(nowSec);
    if (this.recentSpellCastTimes.length >= OVERHEAT_CONFIG.maxCastsInWindow) {
      this.isOverheated = true;
      this.overheatTimer = OVERHEAT_CONFIG.overheatDuration; // 4s freeze
      this.manaRegenTimer = Math.max(this.manaRegenTimer, OVERHEAT_CONFIG.overheatDuration);
      this.recentSpellCastTimes = [];
      combatEvents.emit('onOverheat', { name: this.name, duration: OVERHEAT_CONFIG.overheatDuration });
    }

    if (targetPos) {
      this.castTargetPos.copy(targetPos);
    }
    this.castTargetEntity = targetEntity;
    this.hasCastReleased = false;
    this.isCastingSuperArmor = Boolean(spell.superArmor || spell.isUltimate);

    if (spell.isUltimate) {
      this.isCastingUltimate = true;
      this.ultimateHpAtStart = this.hp;
    } else {
      this.isCastingUltimate = false;
    }

    if (spell.isChanneled) {
      this.channeledSpell = spell;
      this.channelTimer = 0.0;
      this.channelTickTimer = 0.0;
    }

    const transitioned = this.stateMachine.transitionTo('CAST', {
      spellId,
      spell,
      targetPos,
      targetEntity,
      requiredMana,
      masteryLevel: mastery.level,
    });
    return transitioned;
  }

  setMageLevel(lvl) {
    this.mageLevel = Math.max(1, Math.min(20, lvl || 1));
    this.maxMana = calculateMaxMana(this.intelligence || 10, this.mageLevel);
    this.mana = Math.min(this.maxMana, Math.max(this.mana, this.maxMana));
  }

  getDiscountedManaCost(spellId, baseCost) {
    const mastery = this.spellMastery ? (this.spellMastery[spellId] || { level: 0 }) : { level: 0 };
    if (mastery.level > 0) {
      return Math.max(1, Math.round(baseCost * (1.0 - mastery.level * (MASTERY_CONFIG.manaCostReductionPerLevel || 0.03))));
    }
    return baseCost;
  }

  startAim() {
    this.stateMachine.transitionTo('AIM');
  }

  releaseShot() {
    if (this.stateMachine.state === 'AIM') {
      this.stateMachine.transitionTo('IDLE');
    }
  }

  receiveAttack(hitPayload) {
    // Strongly typed validation preventing argument-order bugs
    if (!hitPayload || typeof hitPayload !== 'object' || !hitPayload.attackerPosition?.isVector3) {
      console.error('[Combatant.receiveAttack] Invalid hitPayload:', hitPayload);
      return null;
    }

    // Dynamic import avoidance: DamageResolver is wired via dependency injection or direct method
    if (Combatant.damageResolver) {
      const wasCastingUltimate = this.isCastingUltimate;
      const res = Combatant.damageResolver.resolve(this, hitPayload);
      if (wasCastingUltimate && res && res.damage > 0) {
        const damageTaken = this.ultimateHpAtStart - this.hp;
        if (damageTaken > (0.15 * this.maxHp)) {
          // Interrupt Solar Cataclysm: cancel cast and lose half mana
          this.isCastingUltimate = false;
          const manaLost = Math.round(this.maxMana * 0.50);
          this.mana = Math.max(0, this.mana - manaLost);
          this.stateMachine.transitionTo('STAGGER', { duration: 1.2 });
          combatEvents.emit('onCastInterrupted', {
            combatant: this,
            manaLost,
            reason: 'Damage exceeded 15% max HP during cast',
          });
        }
      }
      return res;
    }
    return null;
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.deathTimer = 0;
    this.stateMachine.transitionTo('DEAD');
    combatEvents.emit('onDeath', { name: this.name, team: this.team, id: this.id });
  }

  dispose() {
    if (this.rig && this.rig.dispose) {
      this.rig.dispose();
    }
    this.statusEffects.clear();
    this.hitTargetsThisSwing.clear();
  }
}

