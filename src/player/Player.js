import * as THREE from 'three';
import { getCombatStats } from '../core/Stats.js';
import { gameState } from '../core/GameState.js';
import { showSystemMessage } from '../ui/Hud.js';
import { addSkillExp } from '../data/skills.js';
import { playParrySound, calculateAttackAngle, spawnSparks } from '../combat/Combat.js';
import { spawnHitSparks, triggerShieldBlock, triggerParryFlash, spawnItemBreakShards, spawnBlockHitEffect } from '../fx/WeaponFX.js';
import { ITEM_TEMPLATES } from '../combat/Items.js';

import { HeroRig } from '../art/HeroRig.js';
import { PRESETS } from '../art/presets.js';
import { ArrowPool, GRADE_ARROW_STATS } from '../combat/ArrowPool.js';
import { MANA_CONFIG, FIRE_SPELLS, calculateMaxMana, OVERHEAT_CONFIG, MASTERY_CONFIG } from '../combat/spells.config.js';
import { combatEvents } from '../combat/CombatEvents.js';
import { playSpellSound, playPotionSound, playFizzleSound } from '../combat/SpellAudio.js';
import { getHeroLoadout } from '../core/loadout.js';
import { onEquipmentChanged } from '../core/equipmentEvents.js';

const _arrowOrigin = new THREE.Vector3();
const _arrowQuat = new THREE.Quaternion();
const _arrowAimDir = new THREE.Vector3();
const _spellDirScratch = new THREE.Vector3();

function canMoveTo(dungeon, x, z, r = 0.4) {
  if (!dungeon) return true;
  return (
    dungeon.isWalkable(x - r, z - r) &&
    dungeon.isWalkable(x + r, z - r) &&
    dungeon.isWalkable(x - r, z + r) &&
    dungeon.isWalkable(x + r, z + r)
  );
}

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();

    const controlledHero = typeof gameState?.getControlledHero === 'function'
      ? gameState.getControlledHero()
      : (gameState?.heroes?.find((h) => h.id === 'hero_han') || null);
    this.hero = controlledHero;
    this.heroId = controlledHero?.id || 'hero_han';
    this.look = controlledHero?.look || PRESETS.han;
    this.rig = new HeroRig(this.look);
    this.mesh.add(this.rig.group);
    this.mesh._heroRig = this.rig;

    // Soft circular blob shadow
    const shadowGeo = new THREE.CircleGeometry(0.45, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.y = 0.02;
    this.mesh.add(shadow);

    // 5. Footstep Dust Pool (20 reused meshes)
    this.dustPool = [];
    const dustGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    for (let i = 0; i < 20; i++) {
      const dustMat = new THREE.MeshBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.5,
      });
      const dustMesh = new THREE.Mesh(dustGeo, dustMat);
      dustMesh.visible = false;
      if (this.scene) this.scene.add(dustMesh);
      this.dustPool.push({
        mesh: dustMesh,
        life: 0,
        maxLife: 0.5,
        vy: 0.8,
      });
    }
    this.dustStepTimer = 0;

    // Movement & Physics
    this.mesh.position.set(0, 0, 0);
    this.velocityY = 0;
    this.isGrounded = true;
    this.walkSpeed = 5;
    this.sprintSpeed = 9;
    this.jumpVelocity = 7;
    this.gravity = 20;
    this.animTime = 0;

    // Combat Stats & Resources
    this.hp = 100;
    this.maxHp = 100;
    this.stamina = 100;
    this.maxStamina = 100;
    this.baseDamage = 14;
    this.staminaRegenDelay = 0;
    this.dead = false;
    this.damageDealt = 0;
    this.kills = 0;

    // Economy
    this.gold = 0;
    this.tickets = 0;

    // Equipment: taken from the controlled hero's loadout
    this.weapon = this.hero?.equipment?.weapon || null;
    this.shield = this.hero?.equipment?.offhand || null;
    this.armor = this.hero?.equipment?.armor || null;
    this.loadout = getHeroLoadout(this.hero);
    this.rebuildWeaponMesh();

    // Combat Mechanics
    this.comboStep = 0;
    this.comboTimer = 0;
    this.swingAnimTimer = 0;
    this.attackTimer = 0;
    this.attackDuration = 0.48;
    this.hitStop = 0;
    this.hitTimer = 0;
    this.deathTimer = 0;
    this.isMining = false;
    this.miningTimer = 0;
    this.isCheering = false;
    this.cheerTimer = 0;
    this.enemyNearby = 999;

    // Blocking & Parry
    this.isBlocking = false;
    this.blockTimer = 0;
    this.guardBreakTimer = 0;
    this.bashCooldown = 0;
    this.bashAnimTimer = 0;

    // Footwork Step (Double-tap movement key)
    this.footworkTimer = 0;
    this.footworkCooldown = 0;
    this.footworkDir = new THREE.Vector3();
    this.lastTapTimes = { KeyW: 0, KeyA: 0, KeyS: 0, KeyD: 0 };
    this.prevKeysDown = new Set();

    // Dodge Roll (Key Q only)
    this.isRolling = false;
    this.rollTimer = 0;
    this.rollCooldown = 0;
    this.rollDir = new THREE.Vector3(0, 0, 1);

    // Feedback
    this.invulnerableTimer = 0;
    this.flashRedTimer = 0;
    this.damageFlashTimer = 0;
    this.onParryText = null;

    // Archery State Machine (Realistic Archery Engine)
    this.isAiming = false;
    this.drawAmount = 0.0;
    this.drawTimer = 0.0;
    this.isTremor = false;
    this.releaseTimer = 0.0;
    this.snapshotTimer = 0.0;
    this.snapshotDuration = 0.30;
    this.pendingSnapshotShot = false;
    this.snapshotShotDelay = 0;
    this.prevLmbDown = false;
    this.arrowPool = this.scene ? new ArrowPool(this.scene) : null;
    this.lastEnemies = [];
    this.arrows = gameState?.arrows ?? 20;
    this.maxArrows = 20;

    // Fire Mage Spell & Mana System
    this.playerClass = gameState?.playerClass || 'Vanguard';
    this.mageLevel = 1;
    this.intelligence = 16;
    this.maxMana = calculateMaxMana(this.intelligence, this.mageLevel);
    this.mana = this.maxMana;
    this.manaRegenTimer = 0;
    this.manaRegenDelay = MANA_CONFIG.regenPauseAfterCast;
    this.manaPotions = gameState?.manaPotions ?? MANA_CONFIG.potion.initialCount;
    this.manaPotionCooldown = 0;
    this.maxManaPotionCooldown = MANA_CONFIG.potion.cooldown;
    this.spellCooldowns = {};
    this.spellMastery = gameState?.spellMastery || {};
    this.recentSpellCastTimes = [];
    this.isOverheated = false;
    this.overheatTimer = 0;
    this.manaFizzleTimer = 0;
    this.isCasting = false;
    this.isCastingUltimate = false;
    this.castProgress = 0;
    this.castDuration = 0;
    this.castPoint = 0;
    this.hasCastReleased = false;
    this.currentSpell = null;
    this.castTargetPos = new THREE.Vector3();
    this.channeledSpell = null;
    this.channelTimer = 0;
    this.channelTickTimer = 0;
    this.spellSystem = null;
    this.team = 'player';
    this.id = 'hero_player';

    this.refreshStats();

    // Rebuild the weapon/offhand models as soon as the Equipment screen
    // changes the controlled hero's gear.
    this._unsubscribeEquipment = onEquipmentChanged((hero) => {
      if (!hero || hero.id === this.heroId) {
        this.syncLoadout();
      }
    });
  }

  get position() {
    return this.mesh.position;
  }

  /** Facing yaw used by the spell system (matches the Combatant convention). */
  get facingYaw() {
    return this.mesh.rotation.y;
  }

  get isDead() {
    return this.dead;
  }

  get baseAttack() {
    return this.baseDamage || 20;
  }

  isBowEquipped() {
    return this.loadout?.weaponType === 'bow';
  }

  isStaffEquipped() {
    return this.loadout?.weaponType === 'staff';
  }

  setMageLevel(lvl) {
    const oldLvl = this.mageLevel || 1;
    this.mageLevel = Math.max(1, Math.min(20, lvl || 1));
    this.maxMana = calculateMaxMana(this.intelligence, this.mageLevel);
    this.mana = Math.min(this.mana, this.maxMana);

    for (const spellKey in FIRE_SPELLS) {
      const sp = FIRE_SPELLS[spellKey];
      if (sp.unlockLevel > oldLvl && sp.unlockLevel <= this.mageLevel) {
        showSystemMessage(`[New Spell Unlocked: ${sp.name} (Lv ${sp.unlockLevel})!]`);
      }
    }
  }

  spendMana(amount) {
    if (this.mana < amount) return false;
    this.mana = Math.max(0, this.mana - amount);
    this.manaRegenTimer = this.manaRegenDelay;
    return true;
  }

  useManaPotion() {
    if (this.dead || this.manaPotions <= 0 || this.manaPotionCooldown > 0) return false;
    const restoreAmount = Math.round(this.maxMana * MANA_CONFIG.potion.restoreRatio);
    this.mana = Math.min(this.maxMana, this.mana + restoreAmount);
    this.manaPotions--;
    if (gameState) gameState.manaPotions = this.manaPotions;
    this.manaPotionCooldown = this.maxManaPotionCooldown;
    playPotionSound();
    combatEvents.emit('onPotionUsed', {
      combatant: this,
      name: 'Han',
      restoreAmount,
      potionsRemaining: this.manaPotions,
    });
    showSystemMessage(`[Mana Potion: +${restoreAmount} MP (${this.manaPotions} left)]`);
    return true;
  }

  triggerManaFizzle() {
    this.manaFizzleTimer = MANA_CONFIG.fizzleFlashDuration;
    playFizzleSound();
    combatEvents.emit('onManaFizzle', { combatant: this, name: 'Han' });
    showSystemMessage('[Not enough mana!]');
  }

  getDiscountedManaCost(spellId, baseCost) {
    const mastery = this.spellMastery ? (this.spellMastery[spellId] || { level: 0 }) : { level: 0 };
    if (mastery.level > 0) {
      return Math.max(1, Math.round(baseCost * (1.0 - mastery.level * (MASTERY_CONFIG.manaCostReductionPerLevel || 0.03))));
    }
    return baseCost;
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
    }
  }

  castSpell(spellId, targetPos = null) {
    const spell = FIRE_SPELLS[spellId];
    if (!spell) return false;
    if (this.dead || this.isRolling || this.guardBreakTimer > 0) return false;

    // Check level lock
    if (spell.unlockLevel && (this.mageLevel || 1) < spell.unlockLevel) {
      this.triggerManaFizzle();
      showSystemMessage(`[${spell.name} unlocks at Mage Level ${spell.unlockLevel}]`);
      return false;
    }

    // Check cooldown
    if ((this.spellCooldowns[spellId] || 0) > 0) {
      return false;
    }

    // Check mastery & required mana
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

    if (this.channeledSpell) {
      this.stopChannel();
    }

    // Overheat Tracking: 5 spells in 6 seconds
    const nowSec = performance.now() / 1000;
    this.recentSpellCastTimes = this.recentSpellCastTimes.filter(t => nowSec - t <= OVERHEAT_CONFIG.castWindowSeconds);
    this.recentSpellCastTimes.push(nowSec);
    if (this.recentSpellCastTimes.length >= OVERHEAT_CONFIG.maxCastsInWindow) {
      this.isOverheated = true;
      this.overheatTimer = OVERHEAT_CONFIG.overheatDuration;
      this.manaRegenTimer = Math.max(this.manaRegenTimer, OVERHEAT_CONFIG.overheatDuration);
      this.recentSpellCastTimes = [];
      combatEvents.emit('onOverheat', { name: 'Han', duration: OVERHEAT_CONFIG.overheatDuration });
      showSystemMessage('[OVERHEATED! Mana regen halted for 4s!]');
    }

    // Track mastery (+1 level per 25 casts)
    mastery.casts++;
    const oldMLevel = mastery.level;
    mastery.level = Math.min(MASTERY_CONFIG.maxLevel, Math.floor(mastery.casts / MASTERY_CONFIG.castsPerLevel));
    this.spellMastery[spellId] = mastery;
    if (gameState) {
      gameState.spellMastery = this.spellMastery;
    }
    if (mastery.level > oldMLevel) {
      showSystemMessage(`[${spell.name} reached Mastery ★${mastery.level}!]`);
    }

    this.spendMana(requiredMana);
    playSpellSound(spell.id);

    if (targetPos) {
      this.castTargetPos.copy(targetPos);
    } else {
      const fwdYaw = this.mesh.rotation.y;
      this.castTargetPos.set(
        this.mesh.position.x + Math.sin(fwdYaw) * (spell.range || 10),
        0,
        this.mesh.position.z + Math.cos(fwdYaw) * (spell.range || 10)
      );
    }

    this.isCasting = true;
    this.castProgress = 0;
    this.castDuration = spell.castTime || 0.3;
    this.castPoint = spell.castPoint || (this.castDuration * 0.7);
    this.hasCastReleased = false;
    this.currentSpell = spell;
    this.isCastingUltimate = Boolean(spell.isUltimate);
    if (this.isCastingUltimate) {
      this.ultimateHpAtStart = this.hp;
    }

    if (spell.isChanneled) {
      this.channeledSpell = spell;
      this.channelTimer = 0;
      this.channelTickTimer = 0;
      if (this.spellSystem && typeof this.spellSystem.startChanneledSpell === 'function') {
        this.spellSystem.startChanneledSpell(this, spell, this.castTargetPos);
      }
    }

    if (this.rig?.triggerSpellCast) {
      this.rig.triggerSpellCast();
    }
    return true;
  }

  receiveAttack(hitPayload) {
    if (this.dead || this.isRolling) return { dodged: true };
    const dmg = hitPayload?.damage ?? hitPayload?.rawDamage ?? 0;
    const wasCastingUltimate = this.isCastingUltimate;

    const res = this.takeDamage(dmg, null, hitPayload?.attackerPosition);

    if (wasCastingUltimate && res && res.damage > 0) {
      const damageTaken = (this.ultimateHpAtStart || this.hp) - this.hp;
      if (damageTaken > (0.15 * this.maxHp)) {
        this.isCastingUltimate = false;
        this.isCasting = false;
        this.currentSpell = null;
        const manaLost = Math.round(this.maxMana * 0.50);
        this.mana = Math.max(0, this.mana - manaLost);
        this.guardBreakTimer = 1.2;
        combatEvents.emit('onCastInterrupted', {
          combatant: this,
          manaLost,
          reason: 'Damage exceeded 15% max HP during cast',
        });
        showSystemMessage('[Solar Cataclysm INTERRUPTED! Lost 50% Mana!]');
      }
    }
    return res;
  }

  releaseAimedArrow(enemies = null, camera = null, onDamageNumber = null) {
    if (!this.arrowPool || !this.weapon || (this.weapon.durability <= 0 && this.weapon.id !== 'bare_fists')) return;
    if (this.arrows <= 0) {
      showSystemMessage('[Out of arrows! Quiver is empty!]');
      return;
    }
    this.arrows--;
    if (gameState) gameState.arrows = this.arrows;

    const grade = this.weapon?.grade || 'C';

    if (this.rig?.weaponModel?.getArrowWorldTransform) {
      this.rig.weaponModel.getArrowWorldTransform(_arrowOrigin, _arrowQuat);
    } else {
      _arrowOrigin.copy(this.mesh.position).add(new THREE.Vector3(0, 1.3, 0));
    }

    if (camera && typeof camera.getAimDirection === 'function') {
      _arrowAimDir.copy(camera.getAimDirection(_arrowOrigin));
    } else {
      _arrowAimDir.set(Math.sin(this.mesh.rotation.y), 0.05, Math.cos(this.mesh.rotation.y)).normalize();
    }

    // Shot dispersion angle: theta = 0.12 * (1 - drawAmount)^1.5 + tremor
    const spread = 0.12 * Math.pow(Math.max(0, 1.0 - this.drawAmount), 1.5) + (this.isTremor ? 0.04 : 0.0);

    const hero = this.getHero();
    const stats = getCombatStats(hero, gameState.party, gameState.relations);
    const weaponMult = this.weapon && this.weapon.durability > 0 ? (this.weapon.damageMult || 1.0) : 0.4;
    const baseDmg = Math.round(stats.damage * weaponMult);

    this.arrowPool.spawnArrow({
      position: _arrowOrigin,
      direction: _arrowAimDir,
      drawAmount: this.drawAmount,
      grade,
      damage: baseDmg,
      owner: 'player',
      spread
    });

    // Weapon durability cost: 1 per shot fired
    if (this.weapon && this.weapon.durability > 0) {
      this.weapon.durability -= 1;
      if (this.weapon.durability <= 0) {
        this.breakWeapon();
      }
    }

    if (this.rig?.weaponModel?.setDraw) {
      this.rig.weaponModel.setDraw(0, false, 0.02);
    }

    this.releaseTimer = 0.35;
    this.drawTimer = 0;
    this.drawAmount = 0;
    this.isTremor = false;
  }

  triggerHipfireSnapshot(enemies = null, camera = null, onDamageNumber = null) {
    if (this.dead || this.isRolling || this.stamina < 10 || this.guardBreakTimer > 0) return;
    if (this.snapshotTimer > 0 || this.releaseTimer > 0) return;
    if (this.arrows <= 0) {
      showSystemMessage('[Out of arrows! Quiver is empty!]');
      return;
    }

    this.stamina -= 10;
    this.staminaRegenDelay = 0.8;
    this.snapshotTimer = 0.30;
    this.snapshotDuration = 0.30;
    this.pendingSnapshotShot = true;
    this.snapshotShotDelay = 0.10; // snapshot windup releases at 0.10s
    this.attackTimer = 0.30;
    this.attackDuration = 0.30;
    this.comboStep = 0;
  }

  fireSoftAutoAimArrow(enemies = null, onDamageNumber = null) {
    if (!this.arrowPool || !this.weapon || (this.weapon.durability <= 0 && this.weapon.id !== 'bare_fists')) return;
    if (this.arrows <= 0) {
      showSystemMessage('[Out of arrows! Quiver is empty!]');
      return;
    }
    this.arrows--;
    if (gameState) gameState.arrows = this.arrows;

    const grade = this.weapon?.grade || 'C';
    const gradeStats = GRADE_ARROW_STATS[grade] || GRADE_ARROW_STATS.C;

    const hero = this.getHero();
    const stats = getCombatStats(hero, gameState.party, gameState.relations);
    const weaponMult = this.weapon && this.weapon.durability > 0 ? (this.weapon.damageMult || 1.0) : 0.4;
    const baseDmg = Math.round(stats.damage * weaponMult);

    if (this.rig?.weaponModel?.getArrowWorldTransform) {
      this.rig.weaponModel.getArrowWorldTransform(_arrowOrigin, _arrowQuat);
    } else {
      _arrowOrigin.copy(this.mesh.position).add(new THREE.Vector3(0, 1.3, 0));
    }

    const fwdYaw = this.mesh.rotation.y;
    _spellDirScratch.set(Math.sin(fwdYaw), 0, Math.cos(fwdYaw)).normalize();

    // Soft Auto-Aim Assist: scan 25° forward cone up to 18m
    let bestEnemy = null;
    let bestScore = -1;
    const cos25 = Math.cos((25 * Math.PI) / 180);
    const enemyList = enemies || this.lastEnemies || [];

    for (const enemy of enemyList) {
      if (!enemy || enemy.dead || enemy.isDying) continue;
      const ePos = enemy.mesh ? enemy.mesh.position : (enemy.position || enemy.root?.position);
      if (!ePos) continue;

      const toEnemyX = ePos.x - _arrowOrigin.x;
      const toEnemyZ = ePos.z - _arrowOrigin.z;
      const d = Math.hypot(toEnemyX, toEnemyZ);
      if (d > 18.0 || d < 0.5) continue;

      const dot = _spellDirScratch.x * (toEnemyX / d) + _spellDirScratch.z * (toEnemyZ / d);
      if (dot >= cos25) {
        const score = dot / d;
        if (score > bestScore) {
          bestScore = score;
          bestEnemy = enemy;
        }
      }
    }

    _arrowAimDir.copy(_spellDirScratch).add(new THREE.Vector3(0, 0.05, 0)).normalize();

    if (bestEnemy) {
      const ePos = bestEnemy.mesh ? bestEnemy.mesh.position : bestEnemy.position;
      const eHeight = bestEnemy.isBoss ? 3.2 : (bestEnemy.height || 1.8);
      const torsoPosY = ePos.y + eHeight * 0.55;
      const toTorso = new THREE.Vector3(ePos.x - _arrowOrigin.x, torsoPosY - _arrowOrigin.y, ePos.z - _arrowOrigin.z);
      const d = toTorso.length();
      toTorso.normalize();

      // Ballistic gravity compensation pitch offset
      const vLaunch = (gradeStats.speed || 23.0) * Math.pow(0.55, 1.2);
      const val = (9.81 * d) / (vLaunch * vLaunch);
      const pitchComp = 0.5 * Math.asin(Math.max(-0.99, Math.min(0.99, val)));
      toTorso.y += Math.sin(pitchComp);
      toTorso.normalize();

      const dotBetween = Math.max(-1, Math.min(1, _arrowAimDir.dot(toTorso)));
      const angleBetween = Math.acos(dotBetween);
      if (angleBetween > 0.001) {
        const maxRot = Math.min(angleBetween, (10 * Math.PI) / 180);
        const tLerp = maxRot / angleBetween;
        _arrowAimDir.lerp(toTorso, tLerp).normalize();
      }
    }

    this.arrowPool.spawnArrow({
      position: _arrowOrigin,
      direction: _arrowAimDir,
      drawAmount: 0.55,
      grade,
      damage: baseDmg,
      owner: 'player',
      spread: 0.03
    });

    if (this.weapon && this.weapon.durability > 0) {
      this.weapon.durability -= 1;
      if (this.weapon.durability <= 0) {
        this.breakWeapon();
      }
    }

    if (this.rig?.weaponModel?.setDraw) {
      this.rig.weaponModel.setDraw(0, false, 0.02);
    }
  }

  rebuildWeaponMesh() {
    this.rig.equip({ weapon: this.weapon, offhand: this.shield, armor: this.armor });
  }

  rebuildShieldMesh() {
    this.rig.equip({ weapon: this.weapon, offhand: this.shield, armor: this.armor });
  }

  equipWeapon(item) {
    const hero = this.getHero();
    if (hero) {
      hero.equipment = hero.equipment || { weapon: null, offhand: null, armor: null };
      hero.equipment.weapon = item;
    }
    this.weapon = item;
    this.syncLoadout();
  }

  equipShield(item) {
    const hero = this.getHero();
    if (hero) {
      hero.equipment = hero.equipment || { weapon: null, offhand: null, armor: null };
      hero.equipment.offhand = item;
    }
    this.shield = item;
    this.syncLoadout();
  }

  /**
   * The hero the player currently controls.
   */
  getHero() {
    if (this.hero) return this.hero;
    if (typeof gameState?.getControlledHero === 'function') {
      this.hero = gameState.getControlledHero();
    }
    return this.hero;
  }

  /**
   * Re-reads the controlled hero's gear and rebuilds the weapon/offhand models.
   * Keeps HP and stamina untouched.
   */
  syncLoadout() {
    const hero = this.getHero();
    this.heroId = hero?.id || this.heroId;
    this.playerClass = hero?.class || this.playerClass;
    this.weapon = hero?.equipment?.weapon || null;
    this.shield = hero?.equipment?.offhand || null;
    this.armor = hero?.equipment?.armor || null;
    this.loadout = getHeroLoadout(hero);
    this.rebuildWeaponMesh();
    return this.loadout;
  }

  /**
   * Switches the controlled hero: rebuilds the rig so the new hero's body and
   * equipped gear are shown, then refreshes stats, controls and HUD.
   */
  setControlledHero(heroId) {
    const hero = gameState.heroes?.find((h) => h.id === heroId);
    if (!hero || hero.id === this.heroId) return false;

    this.hero = hero;
    this.heroId = hero.id;
    this.look = hero.look || PRESETS.han;

    if (this.rig) {
      this.mesh.remove(this.rig.group);
      this.rig.dispose();
    }
    this.rig = new HeroRig(this.look);
    this.mesh.add(this.rig.group);
    this.mesh._heroRig = this.rig;

    this.syncLoadout();
    this.refreshStats();
    return true;
  }

  refreshStats() {
    const hero = this.getHero();
    const stats = getCombatStats(hero, gameState.party, gameState.relations);
    this.maxHp = stats.maxHp;
    this.maxStamina = stats.maxStamina;
    this.baseDamage = stats.damage;
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;

    // Equip / visual updates
    this.syncLoadout();
  }

  performShieldBash(enemies, camera, onDamageNumber) {
    if (this.dead || this.guardBreakTimer > 0 || this.bashCooldown > 0 || this.stamina < 15 || !this.isBlocking) {
      return false;
    }

    const hasShield = this.shield && this.shield.durability > 0;
    if (!hasShield) return false;

    this.stamina -= 15;
    this.staminaRegenDelay = 1.0;
    this.bashCooldown = 1.0;
    this.bashAnimTimer = 0.2;

    // Short forward push (1.5 units)
    const fwdX = Math.sin(this.mesh.rotation.y);
    const fwdZ = Math.cos(this.mesh.rotation.y);
    const pushDist = 1.5;
    this.mesh.position.x += fwdX * pushDist;
    this.mesh.position.z += fwdZ * pushDist;

    if (camera) camera.shake(0.06, 0.15);
    spawnSparks(this.scene, this.mesh.position.clone().add(new THREE.Vector3(fwdX * 0.8, 1.0, fwdZ * 0.8)), 0x00bfff, 12);

    // Stagger enemies in front cone (110 deg, range 2.5) for 0.5s with 5 damage
    const minCos = Math.cos((55 * Math.PI) / 180);
    if (enemies) {
      for (const enemy of enemies) {
        if (enemy.dead || enemy.isDying) continue;
        const dx = enemy.mesh.position.x - this.mesh.position.x;
        const dz = enemy.mesh.position.z - this.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        const maxRange = enemy.isBoss ? 3.8 : 2.5;

        if (dist <= maxRange) {
          const dot = dist > 0.001 ? (fwdX * dx + fwdZ * dz) / dist : 1;
          if (dot >= minCos) {
            enemy.takeDamage(5);
            if (enemy.enterHesitate) {
              enemy.enterHesitate(0.5);
            }
            if (enemy.applyKnockback) {
              enemy.applyKnockback(fwdX, fwdZ, 8);
            }
            if (onDamageNumber) {
              onDamageNumber(5, enemy.mesh.position, false);
            }
          }
        }
      }
    }
    return true;
  }

  triggerFootwork(key, cameraYaw) {
    if (this.dead || this.isRolling || this.guardBreakTimer > 0 || this.footworkCooldown > 0 || this.stamina < 12) {
      return false;
    }

    this.stamina -= 12;
    this.staminaRegenDelay = 0.8;
    this.footworkCooldown = 0.5;
    this.footworkTimer = 0.15; // 0.15s duration

    const sinYaw = Math.sin(cameraYaw);
    const cosYaw = Math.cos(cameraYaw);

    let fx = 0;
    let fz = 0;
    if (key === 'KeyW' || key === 'ArrowUp') {
      fx = -sinYaw;
      fz = -cosYaw;
    } else if (key === 'KeyS' || key === 'ArrowDown') {
      fx = sinYaw;
      fz = cosYaw;
    } else if (key === 'KeyA' || key === 'ArrowLeft') {
      fx = -cosYaw;
      fz = sinYaw;
    } else if (key === 'KeyD' || key === 'ArrowRight') {
      fx = cosYaw;
      fz = -sinYaw;
    }

    const len = Math.hypot(fx, fz) || 1;
    this.footworkDir.set(fx / len, 0, fz / len);
    this.spawnFootstepDust();
    return true;
  }

  takeDamage(amount, camera, attackerPos = null, attackType = 'melee', attacker = null) {
    if (this.dead || this.isRolling) return { dodged: true };

    const hero = this.getHero();
    const stats = getCombatStats(hero, gameState.party, gameState.relations);

    // 1. Guard Break check: takes full damage while stunned
    if (this.guardBreakTimer > 0) {
      this.hp = Math.max(0, this.hp - amount);
      this.damageFlashTimer = 0.1;
      this.hitTimer = 0.25;
      this.rig.setTint(0xffffff, 0.8);
      if (camera) camera.shake(0.15, 0.2);
      if (this.hp <= 0) {
        this.dead = true;
        this.deathTimer = 0;
      }
      return { guardBroken: true, damage: amount };
    }

    // 2. Shield Block / Parry logic
    const hasShield = Boolean(this.loadout?.canBlock) && this.shield && this.shield.durability > 0;
    if (this.isBlocking && hasShield && attackerPos) {
      const angle = calculateAttackAngle(this.mesh.rotation.y, this.mesh.position, attackerPos);

      // A. Perfect Parry: raised in parryWindow (0.18s + skill bonus), angle <= 60 deg, not boss cleave/slam
      const parryWindow = stats.parryWindow || 0.18;
      const canParry = attackType !== 'boss_cleave' && attackType !== 'boss_slam';

      if (this.blockTimer <= parryWindow && angle <= 60) {
        if (canParry) {
          playParrySound();
          if (this.rig?.shieldModel) {
            triggerParryFlash(this.scene, this.rig.shieldModel);
          }
          spawnBlockHitEffect(this.scene, this.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)), camera);
          this.hitStop = 0.08;

          if (attacker && !attacker.dead) {
            if (attacker.enterHesitate) {
              attacker.enterHesitate(0.8);
            }
            attacker.staggerTimer = 0.8;
            attacker.isVulnerable = true;
          }

          if (this.onParryText) {
            this.onParryText('PARRY', attackerPos);
          }

          addSkillExp(hero, 'basic_shield_technique', 5);
          showSystemMessage('[PERFECT PARRY!]');
          return { parried: true, damage: 0 };
        } else {
          showSystemMessage('[Unparriable!]');
          if (this.onParryText) {
            this.onParryText('UNPARRIABLE', attackerPos);
          }
        }
      }

      // B. Angled Deflection Block
      if (angle <= 90) {
        let reduction = 0.7; // < 60 deg: 70% reduced
        if (angle > 60) {
          reduction = 0.4; // 60 to 90 deg: 40% reduced
        }

        let reducedDmg = Math.round(amount * (1 - reduction));
        let staminaCost;

        if (attackType === 'boss_cleave') {
          staminaCost = 40;
          reducedDmg = Math.round(amount * 0.5);
        } else if (attackType === 'boss_slam') {
          staminaCost = amount * 1.0;
        } else {
          const mult = 1 + (stats.blockStaminaMult || 0);
          staminaCost = Math.round(amount * Math.max(0.2, mult));
        }

        // Shield loses 2 durability
        this.shield.durability -= 2;
        if (this.shield.durability <= 0) {
          const sGrade = this.shield.grade || 'E';
          spawnItemBreakShards(this.scene, this.mesh.position, sGrade);
          showSystemMessage(`[${this.shield.name} has broken!]`);
          this.shield = null;
          this.rebuildShieldMesh();
        }

        // Stamina check -> Guard Break
        if (this.stamina < staminaCost) {
          this.stamina = 0;
          this.guardBreakTimer = 1.2;
          showSystemMessage('[GUARD BROKEN!]');
          this.hp = Math.max(0, this.hp - amount);
          this.damageFlashTimer = 0.1;
          this.hitTimer = 0.25;
          this.rig.setTint(0xffffff, 0.8);
          if (camera) camera.shake(0.2, 0.3);
          if (this.hp <= 0) {
            this.dead = true;
            this.deathTimer = 0;
          }
          return { guardBroken: true, damage: amount };
        }

        // Successful block
        this.stamina -= staminaCost;
        this.staminaRegenDelay = 1.2;
        this.hp = Math.max(0, this.hp - reducedDmg);
        this.damageFlashTimer = 0.1;
        this.rig.setTint(0xffffff, 0.8);
        if (this.rig?.shieldModel) {
          triggerShieldBlock(this.rig.shieldModel, this.scene, this.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0)), camera);
        } else {
          spawnBlockHitEffect(this.scene, this.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)), camera);
        }
        if (camera) camera.shake(0.06, 0.15);

        addSkillExp(hero, 'basic_shield_technique', 1);

        if (this.hp <= 0) {
          this.dead = true;
          this.deathTimer = 0;
        }
        return { blocked: true, damage: reducedDmg };
      }
    }

    // 3. Normal Damage
    if (this.invulnerableTimer > 0) return { invulnerable: true };
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableTimer = 0.5;
    this.damageFlashTimer = 0.1;
    this.hitTimer = 0.25;
    this.rig.setTint(0xffffff, 0.8);
    if (camera) camera.shake(0.15, 0.2);
    if (this.hp <= 0) {
      this.dead = true;
      this.deathTimer = 0;
    }
    return { damage: amount };
  }

  applyKnockback(dirX, dirZ, force = 6) {
    if (this.dead) return;
    this.mesh.position.x += dirX * (force * 0.15);
    this.mesh.position.z += dirZ * (force * 0.15);
  }

  startRoll(input, cameraYaw) {
    if (this.dead || this.isRolling || this.rollCooldown > 0 || this.stamina < 25 || this.guardBreakTimer > 0) {
      return false;
    }

    this.stamina -= 25;
    this.staminaRegenDelay = 0.8;
    this.isRolling = true;
    this.rollTimer = 0.35;
    this.rollCooldown = 0.8;

    // Direction from input or facing direction
    const forward = input ? input.isDown('KeyW') || input.isDown('ArrowUp') : false;
    const backward = input ? input.isDown('KeyS') || input.isDown('ArrowDown') : false;
    const left = input ? input.isDown('KeyA') || input.isDown('ArrowLeft') : false;
    const right = input ? input.isDown('KeyD') || input.isDown('ArrowRight') : false;

    const sinYaw = Math.sin(cameraYaw);
    const cosYaw = Math.cos(cameraYaw);
    let rx = 0;
    let rz = 0;

    if (forward) { rx -= sinYaw; rz -= cosYaw; }
    if (backward) { rx += sinYaw; rz += cosYaw; }
    if (left) { rx -= cosYaw; rz += sinYaw; }
    if (right) { rx += cosYaw; rz -= sinYaw; }

    if (Math.hypot(rx, rz) > 0.1) {
      this.rollDir.set(rx, 0, rz).normalize();
    } else {
      this.rollDir.set(sinYaw, 0, cosYaw).normalize();
    }

    return true;
  }

  attack(enemies, camera, onDamageNumber) {
    if (this.dead || this.isRolling || this.swingAnimTimer > 0 || this.stamina < 10 || this.guardBreakTimer > 0) {
      return;
    }

    // Bow attacks: bypass melee cone
    if (this.loadout?.attackMode === 'bow') {
      if (this.isAiming) {
        if (this.drawAmount >= 0.15) {
          this.releaseAimedArrow(enemies, camera, onDamageNumber);
        }
      } else {
        this.triggerHipfireSnapshot(enemies, camera, onDamageNumber);
      }
      return;
    }

    // Staff attacks: quick cast Ember Bolt
    if (this.loadout?.attackMode === 'spell') {
      if (!this.isCasting && !this.channeledSpell) {
        this.castSpell('emberBolt');
      }
      return;
    }

    // Shield Bash if blocking
    if (this.isBlocking) {
      this.performShieldBash(enemies, camera, onDamageNumber);
      return;
    }

    this.stamina -= 10;
    this.staminaRegenDelay = 0.8;

    // Advance combo step or reset
    if (this.comboTimer > 0) {
      this.comboStep = (this.comboStep + 1) % 3;
    } else {
      this.comboStep = 0;
    }
    const aPose = this.comboStep === 2 ? 'attack3' : (this.comboStep === 1 ? 'attack2' : 'attack1');
    const atkSpec = this.rig?.getActiveAttackSpec ? this.rig.getActiveAttackSpec(aPose) : null;
    const duration = atkSpec?.duration || 0.48;
    this.attackDuration = duration;
    this.attackTimer = duration;
    this.comboTimer = duration + 0.18;
    this.swingAnimTimer = duration;

    const hero = this.getHero();
    const stats = getCombatStats(hero, gameState.party, gameState.relations);
    const weaponMult = this.weapon && this.weapon.durability > 0 ? (this.weapon.damageMult || 1.0) : 0.4;
    const baseDmg = stats.damage * weaponMult;

    const isFinisher = this.comboStep === 2;
    const damage = isFinisher ? Math.round(baseDmg * 1.8) : Math.round(baseDmg);
    const knockbackForce = isFinisher ? 12 : 6;

    // Hitbox cone 110 degrees, range 2.6 units
    const facingYaw = this.mesh.rotation.y;
    const forwardX = Math.sin(facingYaw);
    const forwardZ = Math.cos(facingYaw);
    const minCos = Math.cos((55 * Math.PI) / 180);

    let hitAny = false;

    if (enemies) {
      for (const enemy of enemies) {
        if (enemy.dead || enemy.isDying) continue;

        const toEnemyX = enemy.mesh.position.x - this.mesh.position.x;
        const toEnemyZ = enemy.mesh.position.z - this.mesh.position.z;
        const dist = Math.hypot(toEnemyX, toEnemyZ);

        const maxRange = enemy.isBoss ? 4.2 : 2.6;
        if (dist <= maxRange) {
          const dot = dist > 0.001 ? (forwardX * toEnemyX + forwardZ * toEnemyZ) / dist : 1;
          if (dot >= minCos) {
            const actualDmg = enemy.takeDamage(damage, isFinisher, this.mesh.position) || damage;
            this.damageDealt = (this.damageDealt || 0) + actualDmg;
            if (enemy.dead || enemy.hp <= 0) this.kills = (this.kills || 0) + 1;
            if (enemy.applyKnockback) {
              const kx = dist > 0.001 ? toEnemyX / dist : forwardX;
              const kz = dist > 0.001 ? toEnemyZ / dist : forwardZ;
              enemy.applyKnockback(kx, kz, knockbackForce);
            }
            if (onDamageNumber) {
              onDamageNumber(actualDmg, enemy.mesh.position, isFinisher);
            }
            const wepGrade = (this.weapon && this.weapon.grade) || 'E';
            spawnHitSparks(this.scene, enemy.mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)), wepGrade);
            hitAny = true;
          }
        }
      }
    }

    if (hitAny) {
      const hitStopDur = atkSpec?.hitStop || 0.05;
      this.hitStop = hitStopDur;
      if (this.rig && this.rig.triggerHitStop) {
        this.rig.triggerHitStop(hitStopDur);
      }
      if (this.rig && this.rig.onWeaponHit) {
        this.rig.onWeaponHit();
      }
      const shakeAmt = atkSpec?.cameraShake || 0.08;
      if (camera && camera.shake) {
        camera.shake(shakeAmt, 0.12);
      }

      // Weapon durability cost: 1 per hit
      if (this.weapon && this.weapon.durability > 0) {
        this.weapon.durability -= 1;
        if (this.weapon.durability <= 0) {
          const wepGrade = this.weapon.grade || 'E';
          spawnItemBreakShards(this.scene, this.mesh.position, wepGrade);
          showSystemMessage(`[${this.weapon.name} has broken!]`);
          this.weapon = { id: 'bare_fists', name: 'Bare Fists', durability: 0, maxDurability: 0, damageMult: 0.4 };
          this.rebuildWeaponMesh();
        }
      }

      // Skill XP: Basic Swordsmanship
      if (this.weapon && this.weapon.type === 'sword') {
        addSkillExp(hero, 'basic_swordsmanship', 1);
      }
    }
  }

  breakWeapon() {
    if (!this.weapon || this.weapon.id === 'bare_fists') return;
    const wepGrade = this.weapon.grade || 'E';
    spawnItemBreakShards(this.scene, this.mesh.position, wepGrade);
    showSystemMessage(`[${this.weapon.name} has broken!]`);
    this.weapon = { id: 'bare_fists', name: 'Bare Fists', durability: 0, maxDurability: 0, damageMult: 0.4 };
    this.rebuildWeaponMesh();
  }

  spawnFootstepDust() {
    for (const d of this.dustPool) {
      if (!d.mesh.visible) {
        d.mesh.visible = true;
        d.mesh.position.copy(this.mesh.position);
        d.mesh.position.y = 0.08;
        d.mesh.scale.set(1, 1, 1);
        d.life = d.maxLife;
        break;
      }
    }
  }

  update(delta, input, cameraYaw, dungeon, camera, enemies = null, onDamageNumber = null) {
    this.animTime += delta;
    if (enemies) this.lastEnemies = enemies;
    if (onDamageNumber) this.onDamageNumber = onDamageNumber;

    // The player may switch which hero they control: rebuild the model, the
    // controls and the HUD for the new hero immediately.
    if (gameState.controlledHeroId && gameState.controlledHeroId !== this.heroId) {
      this.setControlledHero(gameState.controlledHeroId);
    }

    // 1. Guard Break Stun
    if (this.guardBreakTimer > 0) {
      this.guardBreakTimer -= delta;
      this.rig.update(delta, { action: 'hit', actionTime: 0.2, mood: 'pain' });
      return;
    }

    // Archery State Machine (Ranged Combat & Over-the-Shoulder Aiming)
    const isBow = this.loadout?.attackMode === 'bow';
    const isAimKeyDown = input ? (input.isDown('KeyV') || input.isDown('KeyC')) : false;
    const isRmbDown = input && typeof input.isRmbDown === 'function' ? input.isRmbDown() : false;
    const wantsAim = isBow && !this.dead && this.guardBreakTimer <= 0 && (isAimKeyDown || isRmbDown);

    if (wantsAim) {
      if (!this.isAiming) {
        this.isAiming = true;
        this.drawTimer = 0;
        this.drawAmount = 0;
        this.isTremor = false;
        this.releaseTimer = 0;
        if (camera && typeof camera.setAimMode === 'function') {
          camera.setAimMode(true);
        }
      }

      // Draw progress scaled by bow grade
      const grade = this.weapon?.grade || 'C';
      const gradeStats = GRADE_ARROW_STATS[grade] || GRADE_ARROW_STATS.C;
      const drawDuration = gradeStats.drawTime || 0.58;
      this.drawTimer += delta;
      this.drawAmount = Math.min(1.0, this.drawTimer / drawDuration);

      if (this.drawTimer > drawDuration + 3.0) {
        this.isTremor = true;
        this.stamina = Math.max(0, this.stamina - 5.0 * delta);
      } else {
        this.isTremor = false;
      }

      // Tap LMB while aiming looses the arrow
      const isLmb = input && typeof input.isLmbDown === 'function' ? input.isLmbDown() : false;
      if (isLmb && !this.prevLmbDown) {
        if (this.drawAmount >= 0.15) {
          this.releaseAimedArrow(this.lastEnemies, camera, this.onDamageNumber);
          this.drawTimer = 0;
          this.drawAmount = 0;
        }
      }
    } else if (this.isAiming && !wantsAim) {
      // Released aim button
      if (this.drawAmount >= 0.15) {
        this.releaseAimedArrow(this.lastEnemies, camera, this.onDamageNumber);
      } else {
        this.drawTimer = 0;
        this.drawAmount = 0;
        this.isTremor = false;
      }
      this.isAiming = false;
      if (camera && typeof camera.setAimMode === 'function') {
        camera.setAimMode(false);
      }
    }

    // Release animation timer
    if (this.releaseTimer > 0) {
      this.releaseTimer -= delta;
    }

    // Hipfire snapshot timers
    if (this.snapshotTimer > 0) {
      this.snapshotTimer -= delta;
    }
    if (this.pendingSnapshotShot) {
      this.snapshotShotDelay -= delta;
      if (this.snapshotShotDelay <= 0) {
        this.pendingSnapshotShot = false;
        this.fireSoftAutoAimArrow(this.lastEnemies, this.onDamageNumber);
      }
    }

    this.prevLmbDown = input && typeof input.isLmbDown === 'function' ? input.isLmbDown() : false;

    // Cooldown timers
    if (this.comboTimer > 0) this.comboTimer -= delta;
    if (this.rollCooldown > 0) this.rollCooldown -= delta;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= delta;
    if (this.bashCooldown > 0) this.bashCooldown -= delta;
    if (this.bashAnimTimer > 0) this.bashAnimTimer -= delta;
    if (this.footworkCooldown > 0) this.footworkCooldown -= delta;
    if (this.hitTimer > 0) this.hitTimer -= delta;
    if (this.attackTimer > 0) this.attackTimer -= delta;
    if (this.swingAnimTimer > 0) this.swingAnimTimer -= delta;

    // Mana & Spell timers
    if (this.manaPotionCooldown > 0) {
      this.manaPotionCooldown = Math.max(0, this.manaPotionCooldown - delta);
    }
    if (this.overheatTimer > 0) {
      this.overheatTimer = Math.max(0, this.overheatTimer - delta);
      if (this.overheatTimer === 0) this.isOverheated = false;
    }
    if (this.manaFizzleTimer > 0) {
      this.manaFizzleTimer = Math.max(0, this.manaFizzleTimer - delta);
    }
    if (this.manaRegenTimer > 0) {
      this.manaRegenTimer = Math.max(0, this.manaRegenTimer - delta);
    } else if (!this.isOverheated && this.mana < this.maxMana) {
      this.mana = Math.min(this.maxMana, this.mana + MANA_CONFIG.baseManaRegenRate * delta);
    }

    // Tick spell cooldowns
    for (const sId in this.spellCooldowns) {
      if (this.spellCooldowns[sId] > 0) {
        this.spellCooldowns[sId] = Math.max(0, this.spellCooldowns[sId] - delta);
      }
    }

    // Casting update
    if (this.isCasting && this.currentSpell) {
      this.castProgress += delta;
      if (!this.hasCastReleased && this.castProgress >= this.castPoint) {
        this.hasCastReleased = true;
        if (this.spellSystem && !this.currentSpell.isChanneled) {
          this.spellSystem.releaseSpell(this, this.currentSpell, this.castTargetPos);
        }
      }
      if (this.castProgress >= this.castDuration) {
        this.spellCooldowns[this.currentSpell.id] = this.currentSpell.cooldown;
        this.isCasting = false;
        this.isCastingUltimate = false;
        this.currentSpell = null;
      }
    }

    // Channeling update (Inferno Beam)
    if (this.channeledSpell) {
      this.channelTimer += delta;
      this.channelTickTimer += delta;
      const interval = this.channeledSpell.tickInterval || 0.2;
      if (this.channelTickTimer >= interval) {
        this.channelTickTimer = 0;
        const manaCost = (this.channeledSpell.manaCostPerSecond || 8.0) * interval;
        if (this.mana >= manaCost) {
          this.spendMana(manaCost);
          if (this.spellSystem) {
            this.spellSystem.tickChanneledSpell(this, this.channeledSpell, this.castTargetPos);
          }
        } else {
          this.stopChannel();
          this.triggerManaFizzle();
        }
      }
      if (this.channelTimer >= (this.channeledSpell.maxChannelDuration || 3.0)) {
        this.stopChannel();
      }
    }

    // Tints: Damage flash > Poison > Severe Stress > default
    const hero = this.getHero();
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= delta;
      this.rig.setTint(0xffffff, 0.8);
    } else if (this.isPoisoned) {
      this.rig.setTint(0x4fbf3a, 0.3);
    } else if (hero && hero.stress >= 80) {
      this.rig.setTint(0x2a1a3a, 0.25);
    } else {
      this.rig.setTint(null, 0);
    }

    // Footstep dust updates
    for (const d of this.dustPool) {
      if (d.mesh.visible) {
        d.life -= delta;
        d.mesh.position.y += d.vy * delta;
        const progress = Math.max(0, d.life / d.maxLife);
        d.mesh.scale.set(progress, progress, progress);
        if (d.life <= 0) {
          d.mesh.visible = false;
        }
      }
    }

    // Dead player skips movement
    if (this.dead) {
      this.deathTimer = (this.deathTimer || 0) + delta;
      this.rig.update(delta, { action: 'death', actionTime: Math.min(1.6, this.deathTimer), mood: 'dead' });
      return;
    }

    // 2. Footwork Step Movement (Double-tap movement key: 3 units in 0.15s)
    if (this.footworkTimer > 0) {
      this.footworkTimer -= delta;
      const stepSpeed = 20.0;
      const nextX = this.mesh.position.x + this.footworkDir.x * stepSpeed * delta;
      const nextZ = this.mesh.position.z + this.footworkDir.z * stepSpeed * delta;

      if (canMoveTo(dungeon, nextX, this.mesh.position.z, 0.4)) {
        this.mesh.position.x = nextX;
      }
      if (canMoveTo(dungeon, this.mesh.position.x, nextZ, 0.4)) {
        this.mesh.position.z = nextZ;
      }
      return;
    }

    // 3. Dodge Roll Movement
    if (this.isRolling) {
      this.rollTimer -= delta;
      this.rollTimeElapsed = (this.rollTimeElapsed || 0) + delta;
      const rollSpeed = 12;
      const nextX = this.mesh.position.x + this.rollDir.x * rollSpeed * delta;
      const nextZ = this.mesh.position.z + this.rollDir.z * rollSpeed * delta;

      if (canMoveTo(dungeon, nextX, this.mesh.position.z, 0.4)) {
        this.mesh.position.x = nextX;
      }
      if (canMoveTo(dungeon, this.mesh.position.x, nextZ, 0.4)) {
        this.mesh.position.z = nextZ;
      }

      this.mesh.rotation.y = Math.atan2(this.rollDir.x, this.rollDir.z);
      this.rig.update(delta, { action: 'roll', actionTime: Math.min(0.4, this.rollTimeElapsed) });

      if (this.rollTimer <= 0) {
        this.isRolling = false;
        this.rollTimeElapsed = 0;
      }
      return;
    }

    // 4. Double-tap detection on movement keys
    if (input) {
      const moveKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
      for (const k of moveKeys) {
        const isDown = input.isDown(k);
        const wasDown = this.prevKeysDown.has(k);
        if (isDown && !wasDown) {
          const now = performance.now() * 0.001;
          if (now - (this.lastTapTimes[k] || 0) < 0.28) {
            this.triggerFootwork(k, cameraYaw);
          }
          this.lastTapTimes[k] = now;
        }
        if (isDown) this.prevKeysDown.add(k);
        else this.prevKeysDown.delete(k);
      }
    }

    // 5. Shield Block State (Hold block action)
    // Only a hero that actually carries a shield can raise it: a staff or bow
    // hero never blocks, so RMB is free for aiming/casting.
    const hasShield = Boolean(this.loadout?.canBlock) && this.shield && this.shield.durability > 0;
    const blockDown = input
      ? (typeof input.isActionDown === 'function'
          ? input.isActionDown('block')
          : (typeof input.isLmbDown === 'function' ? input.isLmbDown() : false))
      : false;

    if (blockDown && hasShield) {
      if (!this.isBlocking) {
        this.isBlocking = true;
        this.blockTimer = 0;
      }
      this.blockTimer += delta;

      // Face camera look direction while blocking
      this.mesh.rotation.y = cameraYaw + Math.PI;
    } else {
      this.isBlocking = false;
      this.blockTimer = 0;
    }

    // 6. Normal Movement Handling (WASD only)
    const forward = input ? input.isDown('KeyW') : false;
    const backward = input ? input.isDown('KeyS') : false;
    const left = input ? input.isDown('KeyA') : false;
    const right = input ? input.isDown('KeyD') : false;
    let isSprinting = input ? input.isDown('ShiftLeft') || input.isDown('ShiftRight') : false;

    const sinYaw = Math.sin(cameraYaw);
    const cosYaw = Math.cos(cameraYaw);
    let moveX = 0;
    let moveZ = 0;

    if (forward) { moveX -= sinYaw; moveZ -= cosYaw; }
    if (backward) { moveX += sinYaw; moveZ += cosYaw; }
    if (left) { moveX -= cosYaw; moveZ += sinYaw; }
    if (right) { moveX += cosYaw; moveZ -= sinYaw; }

    const moveLength = Math.hypot(moveX, moveZ);
    const isMoving = moveLength > 0.05;

    // Sprinting stamina drain (8 stamina per second)
    if (isSprinting && isMoving && !this.isBlocking && this.stamina > 0) {
      this.stamina = Math.max(0, this.stamina - 8 * delta);
      if (this.stamina === 0) isSprinting = false;
    } else if (this.stamina <= 0) {
      isSprinting = false;
    }

    // Stamina regeneration
    if (this.isBlocking || isSprinting) {
      this.staminaRegenDelay = 0.5;
    } else if (this.staminaRegenDelay > 0) {
      this.staminaRegenDelay -= delta;
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + 25 * delta);
    }

    if (this.isAiming) {
      isSprinting = false;
    }

    if (isMoving) {
      moveX /= moveLength;
      moveZ /= moveLength;

      let speed = isSprinting ? this.sprintSpeed : this.walkSpeed;
      if (this.isAiming) {
        speed = 2.2; // Aiming movement speed capped at 2.2 m/s
      } else if (this.isBlocking) {
        speed = this.walkSpeed * 0.5; // Blocking movement speed x0.5
      }

      const nextX = this.mesh.position.x + moveX * speed * delta;
      const nextZ = this.mesh.position.z + moveZ * speed * delta;

      if (canMoveTo(dungeon, nextX, this.mesh.position.z, 0.4)) {
        this.mesh.position.x = nextX;
      }
      if (canMoveTo(dungeon, this.mesh.position.x, nextZ, 0.4)) {
        this.mesh.position.z = nextZ;
      }

      if (this.isAiming) {
        this.mesh.rotation.y = cameraYaw + Math.PI;
      } else if (!this.isBlocking) {
        const targetRotation = Math.atan2(moveX, moveZ);
        let diff = targetRotation - this.mesh.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.mesh.rotation.y += diff * Math.min(1, 14 * delta);
      }

      this.dustStepTimer += delta;
      if (this.dustStepTimer >= 0.25) {
        this.dustStepTimer = 0;
        this.spawnFootstepDust();
      }
    } else if (this.isAiming) {
      // Stand-still aim lock to crosshair ray
      this.mesh.rotation.y = cameraYaw + Math.PI;
    }

    // Determine animation pose and mood
    let action = 'none';
    let actionTime = 0;
    let mood = (this.enemyNearby <= 10) ? 'angry' : 'neutral';

    if (this.isCastingUltimate) {
      action = 'ultimateChannel';
      actionTime = this.castProgress;
      mood = 'angry';
    } else if (this.isCasting || this.channeledSpell) {
      action = 'cast';
      actionTime = this.castProgress || this.channelTimer;
      mood = 'angry';
    } else if (this.isAiming) {
      action = 'aim';
      actionTime = this.drawTimer;
      mood = 'angry';
    } else if (this.releaseTimer > 0) {
      action = 'release';
      actionTime = 0.35 - this.releaseTimer;
      mood = 'angry';
    } else if (this.snapshotTimer > 0) {
      action = 'attack1';
      actionTime = this.snapshotDuration - this.snapshotTimer;
      mood = 'angry';
    } else if (this.attackTimer > 0) {
      const aPose = this.comboStep === 2 ? 'attack3' : (this.comboStep === 1 ? 'attack2' : 'attack1');
      action = aPose;
      actionTime = (this.attackDuration || 0.48) - Math.max(0, this.attackTimer);
      mood = 'angry';
    } else if (this.isBlocking) {
      action = 'block';
      actionTime = this.blockTimer;
    } else if (this.hitTimer > 0) {
      action = 'hit';
      actionTime = 0.25 - Math.max(0, this.hitTimer);
      mood = 'pain';
    } else if (this.isMining) {
      action = 'mine';
      actionTime = this.miningTimer || 0;
    } else if (this.isCheering) {
      this.cheerTimer = (this.cheerTimer || 0) + delta;
      action = 'cheer';
      actionTime = this.cheerTimer;
      mood = 'happy';
    }

    const currentSpeed = isMoving ? (this.isAiming ? 2.2 : (isSprinting ? this.sprintSpeed : this.walkSpeed)) : 0;
    this.rig.update(delta, {
      moving: isMoving,
      speed: currentSpeed,
      sprinting: isSprinting,
      action,
      actionTime,
      mood,
      bowDraw: this.drawAmount,
      arrowVisible: (this.isAiming && this.drawAmount > 0.02) || (this.snapshotTimer > 0 && this.snapshotTimer > 0.18),
      isTremor: this.isTremor,
      isCasting: this.isCasting || Boolean(this.channeledSpell),
      manaRatio: this.maxMana > 0 ? (this.mana / this.maxMana) : 1.0,
      activeSpell: this.currentSpell || this.channeledSpell,
    });

    if (this.rig?.updateMagicEmpower) {
      this.rig.updateMagicEmpower(action, {
        isCasting: this.isCasting || Boolean(this.channeledSpell),
        manaRatio: this.maxMana > 0 ? (this.mana / this.maxMana) : 1.0,
        activeSpell: this.currentSpell || this.channeledSpell,
      });
    }

    // Dodge Roll on Space key
    if (input && input.isDown('Space')) {
      this.startRoll(input, cameraYaw);
    }

    // Gravity
    const groundY = (dungeon && typeof dungeon.getGroundY === 'function')
      ? dungeon.getGroundY(this.mesh.position.x, this.mesh.position.z)
      : 0;

    if (!this.isGrounded || this.mesh.position.y > groundY) {
      this.velocityY -= this.gravity * delta;
      this.mesh.position.y += this.velocityY * delta;

      if (this.mesh.position.y <= groundY) {
        this.mesh.position.y = groundY;
        this.velocityY = 0;
        this.isGrounded = true;
      }
    } else {
      this.mesh.position.y = groundY;
    }

    // Ballistic arrow pool update
    if (this.arrowPool) {
      const ens = this.lastEnemies || enemies || [];
      this.arrowPool.update(delta, {
        enemies: ens,
        dungeon,
        onHit: (enemy, hitPos, isHeadshot, dmg) => {
          const wGrade = this.weapon?.grade || 'C';
          spawnHitSparks(this.scene, hitPos, isHeadshot ? 'S' : wGrade);
          if (this.drawAmount >= 0.85) {
            this.hitStop = 0.04;
            if (this.rig && this.rig.triggerHitStop) {
              this.rig.triggerHitStop(0.04);
            }
          }
          if (this.onDamageNumber) {
            this.onDamageNumber(dmg, hitPos, isHeadshot ? 'headshot' : false);
          }
          this.damageDealt = (this.damageDealt || 0) + dmg;
          if (enemy.dead || enemy.hp <= 0) this.kills = (this.kills || 0) + 1;
        },
        onHeadshot: (enemy, hitPos, dmg) => {
          spawnHitSparks(this.scene, hitPos, 'S+');
          playParrySound();
          showSystemMessage('[CRITICAL HEADSHOT! 2.0x]');
          if (this.onDamageNumber) {
            this.onDamageNumber(dmg, hitPos, 'headshot');
          }
          this.damageDealt = (this.damageDealt || 0) + dmg;
          if (enemy.dead || enemy.hp <= 0) this.kills = (this.kills || 0) + 1;
        }
      });
    }
  }
}
