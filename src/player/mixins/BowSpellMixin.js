import * as THREE from 'three';
import { getCombatStats } from '../../core/Stats.js';
import { gameState } from '../../core/GameState.js';
import { showSystemMessage } from '../../ui/Hud.js';
import { GRADE_ARROW_STATS } from '../../combat/ArrowPool.js';
import { MANA_CONFIG, FIRE_SPELLS, calculateMaxMana, OVERHEAT_CONFIG, MASTERY_CONFIG } from '../../combat/spells.config.js';
import { combatEvents } from '../../combat/CombatEvents.js';
import { playSpellSound, playPotionSound, playFizzleSound } from '../../combat/SpellAudio.js';

const _arrowOrigin = new THREE.Vector3();
const _arrowQuat = new THREE.Quaternion();
const _arrowAimDir = new THREE.Vector3();
const _spellDirScratch = new THREE.Vector3();

export const BowSpellMixin = (Base) => class extends Base {
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
    const baseDmg = Math.round(stats.damage * weaponMult * (this.berserkActive ? 1.5 : 1));

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
    const baseDmg = Math.round(stats.damage * weaponMult * (this.berserkActive ? 1.5 : 1));

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
};