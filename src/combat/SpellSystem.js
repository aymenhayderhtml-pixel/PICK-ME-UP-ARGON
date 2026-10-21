// src/combat/SpellSystem.js
// Universal Combat Engine Phase 2 - Spell Execution & Projectile Simulation Engine
// Zero runtime allocations: Pre-allocated scratch vectors, cached query lists.

import * as THREE from 'three';
import { SPELLS_TABLE } from './CombatData.js';
import { testSphereVsCapsule, testCylinderVsCapsule, testRayChain, queryHostilesInRadius, queryAlliesInRadius } from './HitPipeline.js';
import { combatEvents } from './CombatEvents.js';
import { timeScale } from './TimeScale.js';
import { COMBO_CONFIG, MASTERY_CONFIG } from './spells.config.js';

// Pre-allocated module scratch objects
const _castOriginVec = new THREE.Vector3();
const _aimDirVec = new THREE.Vector3();
const _spreadDirVec = new THREE.Vector3();
const _targetGroundPos = new THREE.Vector3();
const _hitPointVec = new THREE.Vector3();
const _toTargetVec = new THREE.Vector3();
const _tempP1 = new THREE.Vector3();
const _tempP2 = new THREE.Vector3();
const _meteorTargetScratch = new THREE.Vector3();
const _splashHitList = [];
const _chainHitList = [];
const _allyQueryList = [];
const _hostileQueryList = [];

export class SpellSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {SpellVFXPool} vfxPool
   * @param {Combatant[]} combatants
   */
  constructor(scene, vfxPool, combatants = []) {
    this.scene = scene;
    this.vfxPool = vfxPool;
    this.combatants = combatants;
    this.activeFlameWalls = [];
    this.activeMeteorSwarm = null;
    this.onScreenShake = null;
    SpellSystem.activeInstance = this;
  }

  setCombatants(combatants) {
    this.combatants = combatants;
  }

  /**
   * Releases spell at the cast point anchor.
   * @param {Combatant} caster
   * @param {object} spell
   * @param {THREE.Vector3} [targetPos]
   * @param {Combatant} [targetEntity]
   */
  releaseSpell(caster, spell, targetPos = null, targetEntity = null) {
    if (!caster || caster.isDead || !spell) return;

    // 1. Query Cast Origin (Staff gem or fallback hand height)
    if (caster.rig && typeof caster.rig.getWeaponTipWorldPosition === 'function') {
      caster.rig.getWeaponTipWorldPosition(_castOriginVec);
    } else {
      _castOriginVec.set(caster.position.x, caster.position.y + 1.35, caster.position.z);
    }

    // 2. Compute Target & Aim Direction
    if (targetPos && targetPos.isVector3) {
      _targetGroundPos.copy(targetPos);
    } else if (targetEntity && !targetEntity.isDead) {
      _targetGroundPos.copy(targetEntity.position);
    } else {
      const yaw = caster.facingYaw;
      _targetGroundPos.set(
        caster.position.x + Math.sin(yaw) * 10.0,
        caster.position.y,
        caster.position.z + Math.cos(yaw) * 10.0
      );
    }

    const targetY = (_targetGroundPos.y || 0) + 0.9;
    _aimDirVec.set(
      _targetGroundPos.x - _castOriginVec.x,
      targetY - _castOriginVec.y,
      _targetGroundPos.z - _castOriginVec.z
    );
    if (_aimDirVec.lengthSq() > 0.0001) {
      _aimDirVec.normalize();
    } else {
      const yaw = caster.facingYaw;
      _aimDirVec.set(Math.sin(yaw), 0, Math.cos(yaw));
    }

    // 3. Dispatch Specific Spell Behavior
    switch (spell.id) {
      case 'emberBolt':
        this._executeEmberBolt(caster, spell, _castOriginVec, _aimDirVec);
        break;

      case 'fireDartVolley':
        this._executeFireDartVolley(caster, spell, _castOriginVec, _aimDirVec);
        break;

      case 'fireball':
        this.vfxPool.spawnProjectile({
          from: _castOriginVec,
          dir: _aimDirVec,
          speed: spell.speed || 22.0,
          range: spell.range || 20.0,
          radius: spell.projectileRadius || 0.32,
          spell,
          caster,
        });
        break;

      case 'flameWall':
        this._executeFlameWall(caster, spell, _targetGroundPos);
        break;

      case 'infernoBeam':
        this.startChanneledSpell(caster, spell, _targetGroundPos);
        break;

      case 'fireNova':
        this._executeFireNova(caster, spell);
        break;

      case 'solarCataclysm':
        this._executeSolarCataclysm(caster, spell, _targetGroundPos);
        break;

      case 'iceSpike':
        this.vfxPool.spawnProjectile({
          from: _castOriginVec,
          dir: _aimDirVec,
          speed: spell.speed || 32.0,
          range: spell.range || 20.0,
          radius: spell.projectileRadius || 0.22,
          spell,
          caster,
        });
        break;

      case 'lightningChain':
        this._executeLightningChain(caster, spell, _castOriginVec, targetEntity);
        break;

      case 'heal':
        this._executeHeal(caster, spell);
        break;

      case 'ward':
        this._executeWard(caster, spell);
        break;

      case 'meteor':
        this._executeMeteor(caster, spell, _targetGroundPos);
        break;

      default:
        console.warn(`[SpellSystem.releaseSpell] Unknown spell id: ${spell.id}`);
        break;
    }

    combatEvents.emit('onSpellCast', {
      caster,
      spellId: spell.id,
      spell,
      targetPos: _targetGroundPos,
    });
  }

  // ---------------------------------------------------------------------------
  // 1. Ember Bolt: Fast single-target fireball
  // ---------------------------------------------------------------------------
  _executeEmberBolt(caster, spell, origin, dir) {
    this.vfxPool.spawnProjectile({
      from: origin,
      dir,
      speed: spell.speed || 34.0,
      range: spell.range || 22.0,
      radius: spell.projectileRadius || 0.20,
      spell,
      caster,
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Fire Dart Volley: 3 darts in tight spread
  // ---------------------------------------------------------------------------
  _executeFireDartVolley(caster, spell, origin, dir) {
    const spread = spell.spreadAngle || 0.24;
    const angles = [-spread, 0, spread];

    for (const ang of angles) {
      _spreadDirVec.copy(dir);
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      const nx = _spreadDirVec.x * cos - _spreadDirVec.z * sin;
      const nz = _spreadDirVec.x * sin + _spreadDirVec.z * cos;
      _spreadDirVec.x = nx;
      _spreadDirVec.z = nz;
      _spreadDirVec.normalize();

      this.vfxPool.spawnProjectile({
        from: origin,
        dir: _spreadDirVec,
        speed: spell.speed || 30.0,
        range: spell.range || 18.0,
        radius: spell.projectileRadius || 0.16,
        spell,
        caster,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Flame Wall: 8m wide fiery wall lasting 6s
  // ---------------------------------------------------------------------------
  _executeFlameWall(caster, spell, groundTarget) {
    const fw = this.vfxPool.spawnFlameWall({
      origin: groundTarget,
      facingYaw: caster.facingYaw,
      width: spell.wallWidth || 8.0,
      duration: spell.duration || 6.0,
      caster,
      spell,
    });
    if (fw) {
      this.activeFlameWalls.push(fw);
    }
    this.vfxPool.spawnScorchMark(groundTarget, 4.0, spell.duration || 6.0);
  }

  // ---------------------------------------------------------------------------
  // 5. Inferno Beam (Channeled)
  // ---------------------------------------------------------------------------
  startChanneledSpell(caster, spell, targetPos) {
    this.vfxPool.startInfernoBeam(caster, targetPos);
    this.tickChanneledSpell(caster, spell, targetPos);
  }

  tickChanneledSpell(caster, spell, targetPos) {
    if (!caster || caster.isDead) {
      this.stopChanneledSpell(caster);
      return;
    }
    this.vfxPool.updateInfernoBeam(caster, targetPos);

    if (caster.rig && typeof caster.rig.getWeaponTipWorldPosition === 'function') {
      caster.rig.getWeaponTipWorldPosition(_tempP1);
    } else {
      _tempP1.set(caster.position.x, caster.position.y + 1.2, caster.position.z);
    }

    _tempP2.copy(targetPos);
    _tempP2.y = Math.max(0.4, _tempP2.y);

    const dx = _tempP2.x - _tempP1.x;
    const dz = _tempP2.z - _tempP1.z;
    const lenXZ = Math.sqrt(dx * dx + dz * dz);
    const invLenXZ = lenXZ > 0.0001 ? 1.0 / lenXZ : 0;
    const dirX = dx * invLenXZ;
    const dirZ = dz * invLenXZ;
    const beamLen = Math.min(spell.range || 16.0, lenXZ > 0.0001 ? lenXZ : (spell.range || 16.0));

    // Query hostiles along beam segment
    for (let i = 0; i < this.combatants.length; i++) {
      const target = this.combatants[i];
      if (target.isDead || target.team === caster.team || target.team === 'neutral') continue;

      const toX = target.position.x - _tempP1.x;
      const toZ = target.position.z - _tempP1.z;
      const proj = toX * dirX + toZ * dirZ;
      if (proj >= -0.5 && proj <= beamLen + 0.5) {
        const perpDistSq = (toX * toX + toZ * toZ) - (proj * proj);
        const hitRadius = (spell.beamRadius || 0.50) + (target.capsuleRadius || 0.45);
        if (perpDistSq <= hitRadius * hitRadius) {
          const isTargetBurning = Boolean(target.statusEffects?.get('burn')?.active);
          const comboMult = isTargetBurning ? (1.0 + (COMBO_CONFIG.infernoBurningDamageBonus || 0.30)) : 1.0;
          const masteryMult = 1.0 + (caster.spellMastery?.infernoBeam?.level || 0) * (MASTERY_CONFIG.damageBonusPerLevel || 0.05);
          const dmg = Math.max(1, Math.round((caster.baseAttack || 20) * (spell.damageMultPerTick || 0.80) * comboMult * masteryMult));
          target.receiveAttack({
            attacker: caster,
            attackerName: caster.name,
            attackerPosition: _tempP1,
            damage: dmg,
            poiseDamage: spell.poiseDamagePerTick || 15,
            knockbackSpeed: 0.1,
            attackMoveMult: 1.0,
            weaponGrade: 'B',
            weaponKind: 'staff',
            statusEffect: { type: 'burn', dps: 6, tickDamage: 3, tickInterval: 0.5, duration: 2.0 },
          });
          this.vfxPool.spawnSparks(target.position, isTargetBurning ? 8 : 4, isTargetBurning ? 0xff4400 : 0xffea00);
        }
      }
    }
  }

  stopChanneledSpell(caster) {
    this.vfxPool.stopInfernoBeam(caster);
  }

  // ---------------------------------------------------------------------------
  // 6. Fire Nova: 6m radial blast around mage with knockback
  // ---------------------------------------------------------------------------
  _executeFireNova(caster, spell) {
    const center = caster.position;
    const r = spell.radius || 6.0;

    // Firestorm Combo: if cast near an active flame wall, detonate the wall for +50% damage
    let firestormWall = null;
    for (let i = 0; i < this.activeFlameWalls.length; i++) {
      const fw = this.activeFlameWalls[i];
      if (fw.active && fw.position.distanceTo(center) <= (r + (COMBO_CONFIG.firestormWallExplosionRadius || 5.0))) {
        firestormWall = fw;
        break;
      }
    }

    const isFirestormCombo = Boolean(firestormWall);
    if (isFirestormCombo) {
      firestormWall.active = false;
      this.vfxPool.spawnBurst(firestormWall.position, 5.5, 0xff2200);
      this.vfxPool.spawnScorchMark(firestormWall.position, 5.0, 6.0);
      this.vfxPool.spawnSparks(firestormWall.position, 32, 0xffaa00);
      combatEvents.emit('onCombo', { name: 'Firestorm Combo', bonus: '+50% Damage' });
    }

    this.vfxPool.spawnNovaRing(center, r, 0.50);
    this.vfxPool.spawnBurst(center, r * 0.7, isFirestormCombo ? 0xff2200 : 0xff3b11);
    this.vfxPool.spawnScorchMark(center, r * 0.9, 6.0);
    this.vfxPool.spawnSparks(center, isFirestormCombo ? 36 : 24, 0xffaa22);

    const comboMult = isFirestormCombo ? (1.0 + (COMBO_CONFIG.firestormDamageMultBonus || 0.50)) : 1.0;
    const masteryMult = 1.0 + (caster.spellMastery?.fireNova?.level || 0) * (MASTERY_CONFIG.damageBonusPerLevel || 0.05);
    const damage = Math.round((caster.baseAttack || 20) * (spell.damageMult || 3.0) * comboMult * masteryMult);

    // Hit-stop (0.05s) & camera shake scaled by damage
    timeScale.applyHitStop(caster, 0.05);
    const shake = Math.min(1.0, (spell.cameraShake || 0.40) * (damage / 45));
    if (this.onScreenShake) {
      this.onScreenShake(shake);
    }

    queryHostilesInRadius(caster, center, r, this.combatants, _hostileQueryList);
    for (let i = 0; i < _hostileQueryList.length; i++) {
      const target = _hostileQueryList[i];
      timeScale.applyHitStop(target, 0.05);

      target.receiveAttack({
        attacker: caster,
        attackerName: caster.name,
        attackerPosition: center,
        spellId: 'fireNova',
        damage,
        poiseDamage: spell.poiseDamage || 90,
        knockbackSpeed: spell.knockbackSpeed || 8.5,
        attackMoveMult: 1.5,
        weaponGrade: 'A',
        weaponKind: 'staff',
        statusEffect: { type: 'burn', dps: 8, tickDamage: 4, tickInterval: 0.5, duration: 4.0 },
      });
    }

    combatEvents.emit('onSpellImpact', {
      spellId: 'fireNova',
      targetsHit: _hostileQueryList.length,
      combo: isFirestormCombo ? 'firestorm' : null,
    });
  }

  // ---------------------------------------------------------------------------
  // 7. Solar Cataclysm (Ultimate)
  // ---------------------------------------------------------------------------
  _executeSolarCataclysm(caster, spell, groundTarget) {
    const lvl = caster.mageLevel || 1;
    const radius = (spell.baseRadius || 10.0) + (lvl - 1) * (spell.radiusPerLevel || 0.30);
    const damageMult = (spell.baseDamageMult || 8.0) * (1.0 + (lvl - 1) * (spell.damageMultPerLevel || 0.10));

    if (this.onScreenShake) {
      this.onScreenShake(spell.cameraShake || 0.75);
    }

    this.vfxPool.spawnBurst(groundTarget, radius * 0.6, 0xffd700);

    // Spawn 22 meteors falling across the area over 4.0 seconds
    const count = spell.meteorCount || 22;
    const duration = spell.barrageDuration || 4.0;
    const stepDelay = duration / count;

    for (let i = 0; i < count; i++) {
      const delay = i * stepDelay + Math.random() * 0.08;
      const angle = Math.random() * Math.PI * 2;
      const dist = (i < 5) ? (Math.random() * 1.5) : (Math.sqrt(Math.random()) * radius);
      _meteorTargetScratch.set(
        groundTarget.x + Math.cos(angle) * dist,
        0,
        groundTarget.z + Math.sin(angle) * dist
      );

      this.vfxPool.spawnMeteor({
        targetPos: _meteorTargetScratch,
        delay,
        blastRadius: 2.5,
        onImpact: (pos) => {
          queryHostilesInRadius(caster, pos, 2.5, this.combatants, _hostileQueryList);
          const masteryMult = 1.0 + (caster.spellMastery?.solarCataclysm?.level || 0) * (MASTERY_CONFIG.damageBonusPerLevel || 0.05);
          const dmg = Math.round((caster.baseAttack || 20) * (damageMult / 3.5) * masteryMult);
          
          timeScale.applyHitStop(caster, 0.05);
          const shake = Math.min(1.0, (spell.cameraShake || 0.75) * (dmg / 35));
          if (this.onScreenShake) this.onScreenShake(shake);

          for (let h = 0; h < _hostileQueryList.length; h++) {
            const target = _hostileQueryList[h];
            timeScale.applyHitStop(target, 0.05);
            target.receiveAttack({
              attacker: caster,
              attackerName: caster.name,
              attackerPosition: pos,
              damage: dmg,
              poiseDamage: spell.poiseDamagePerMeteor || 110,
              knockbackSpeed: 5.0,
              attackMoveMult: 1.6,
              weaponGrade: 'S',
              weaponKind: 'staff',
              statusEffect: { type: 'burn', dps: 12, tickDamage: 6, tickInterval: 0.5, duration: 4.0 },
            });
          }
        }
      });
    }

    combatEvents.emit('onSpellImpact', {
      spellId: 'solarCataclysm',
      radius,
      damageMult,
    });
  }

  // ---------------------------------------------------------------------------
  // Check if position overlaps any active Flame Wall (for enemy avoidance)
  // ---------------------------------------------------------------------------
  isPointInFlameWall(pos, margin = 1.0) {
    for (let i = 0; i < this.activeFlameWalls.length; i++) {
      const fw = this.activeFlameWalls[i];
      if (!fw.active) continue;

      const dx = pos.x - fw.position.x;
      const dz = pos.z - fw.position.z;
      // Rotate into flame wall local coordinate
      const cos = Math.cos(-fw.facingYaw);
      const sin = Math.sin(-fw.facingYaw);
      const localX = dx * cos - dz * sin;
      const localZ = dx * sin + dz * cos;

      if (Math.abs(localX) <= 4.0 + margin && Math.abs(localZ) <= 0.8 + margin) {
        return true;
      }
    }
    return false;
  }

  static isPointInFlameWall(pos, margin = 1.0) {
    if (SpellSystem.activeInstance) {
      return SpellSystem.activeInstance.isPointInFlameWall(pos, margin);
    }
    return false;
  }

  // Legacy Spells
  _executeLightningChain(caster, spell, castOrigin, initialTarget) {
    const jumpCount = testRayChain(
      castOrigin,
      initialTarget,
      spell.chainJumps || 3,
      spell.jumpRadius || 5.0,
      caster.team,
      this.combatants,
      _chainHitList
    );
    if (jumpCount === 0) return;
    let prevPos = castOrigin;
    for (let j = 0; j < _chainHitList.length; j++) {
      const target = _chainHitList[j];
      const jumpFalloff = Math.pow(1 - (spell.jumpFalloff || 0.15), j);
      const damage = Math.max(1, Math.round((spell.directDamage || 55) * jumpFalloff));
      this.vfxPool.spawnLightningArc(prevPos, target.position, spell.colorPrimary || 0xa855f7);
      this.vfxPool.spawnBurst(target.position, 1.2, spell.colorSecondary || 0xf0abfc);
      target.receiveAttack({
        attacker: caster,
        attackerName: caster.name,
        attackerPosition: caster.position,
        damage,
        poiseDamage: spell.poiseDamage || 30,
        attackMoveMult: 1.0,
        weaponGrade: 'B',
        weaponKind: 'staff',
        statusEffect: spell.statusEffect,
      });
      prevPos = target.position;
    }
  }

  _executeHeal(caster, spell) {
    queryAlliesInRadius(caster, caster.position, spell.range || 12.0, this.combatants, _allyQueryList, true);
    if (_allyQueryList.length === 0) return;
    let lowestAlly = _allyQueryList[0];
    let lowestRatio = lowestAlly.hp / lowestAlly.maxHp;
    for (let i = 1; i < _allyQueryList.length; i++) {
      const ally = _allyQueryList[i];
      const ratio = ally.hp / ally.maxHp;
      if (ratio < lowestRatio) {
        lowestRatio = ratio;
        lowestAlly = ally;
      }
    }
    lowestAlly.receiveHeal(spell.healAmount || 50, caster);
    this.vfxPool.spawnBurst(lowestAlly.position, 1.8, spell.colorPrimary || 0x22c55e);
  }

  _executeWard(caster, spell) {
    queryAlliesInRadius(caster, caster.position, spell.range || 3.0, this.combatants, _allyQueryList, true);
    for (let i = 0; i < _allyQueryList.length; i++) {
      const ally = _allyQueryList[i];
      ally.applyWard(spell.barrierHp || 60, spell.duration || 6.0);
      this.vfxPool.attachWardBubble(ally);
      this.vfxPool.spawnBurst(ally.position, 1.5, spell.colorPrimary || 0x06b6d4);
    }
  }

  _executeMeteor(caster, spell, groundTarget) {
    this._executeSolarCataclysm(caster, spell, groundTarget);
  }

  // ---------------------------------------------------------------------------
  // Per-Frame Update
  // ---------------------------------------------------------------------------
  update(worldDt) {
    this.vfxPool.update(worldDt);

    // Sync Staff Glow / Magic Circle for active casters
    for (let i = 0; i < this.combatants.length; i++) {
      const c = this.combatants[i];
      const sm = c.stateMachine;

      if (sm) {
        // New engine: the state machine owns the cast phase.
        if (!c.isDead && sm.state === 'CAST') {
          const spell = sm.currentSpell;
          if (spell?.isUltimate && sm.castPhase === 'STARTUP' && !c.hasSpawnedMagicCircle) {
            c.hasSpawnedMagicCircle = true;
            this.vfxPool.spawnMagicCircle(c.position, spell.baseRadius || 10.0, spell.castTime || 5.0);
          }
          continue;
        }
      } else if (c.isCasting && c.currentSpell?.isUltimate) {
        // Legacy live-game caster (src/player/Player.js) drives its own cast
        // progress and has no state machine.
        if (!c.hasSpawnedMagicCircle) {
          c.hasSpawnedMagicCircle = true;
          this.vfxPool.spawnMagicCircle(
            c.position,
            c.currentSpell.baseRadius || 10.0,
            c.currentSpell.castTime || 5.0
          );
        }
        continue;
      }

      // Not casting: hide the magic circle.
      if (c.hasSpawnedMagicCircle) {
        c.hasSpawnedMagicCircle = false;
        if (typeof this.vfxPool.hideMagicCircle === 'function') {
          this.vfxPool.hideMagicCircle();
        }
      }
    }

    // Update Flame Walls
    for (let i = this.activeFlameWalls.length - 1; i >= 0; i--) {
      const fw = this.activeFlameWalls[i];
      if (!fw.active) {
        this.activeFlameWalls.splice(i, 1);
        continue;
      }
      fw.tickTimer += worldDt;
      if (fw.tickTimer >= fw.tickInterval) {
        fw.tickTimer = 0;
        this._tickFlameWall(fw);
      }
    }

    // Update Projectiles
    const projs = this.vfxPool.projectiles;
    for (let i = 0; i < projs.length; i++) {
      const p = projs[i];
      if (!p.active) continue;

      const step = p.speed * worldDt;
      p.position.addScaledVector(p.velocity, worldDt);
      p.group.position.copy(p.position);
      p.distTraveled += step;

      if (p.distTraveled >= p.maxRange) {
        if (p.spell.id === 'fireball') {
          this._detonateFireball(p, p.position);
        }
        p.active = false;
        p.group.visible = false;
        continue;
      }

      // Collision vs Hostiles
      for (let j = 0; j < this.combatants.length; j++) {
        const target = this.combatants[j];
        if (
          target.isDead ||
          target.id === p.caster.id ||
          target.team === p.caster.team ||
          target.team === 'neutral' ||
          p.hitCombatantIds.has(target.id)
        ) {
          continue;
        }

        if (testSphereVsCapsule(p.position, p.radius, target, _hitPointVec)) {
          p.hitCombatantIds.add(target.id);

          if (p.spell.id === 'fireball') {
            this._detonateFireball(p, target.position);
            p.active = false;
            p.group.visible = false;
            break;
          } else if (p.spell.id === 'emberBolt') {
            const dmg = Math.round((p.caster.baseAttack || 20) * (p.spell.damageMult || 1.0));
            target.receiveAttack({
              attacker: p.caster,
              attackerName: p.caster.name,
              attackerPosition: p.position,
              damage: dmg,
              poiseDamage: p.spell.poiseDamage || 18,
              knockbackSpeed: p.spell.knockbackSpeed || 1.5,
              attackMoveMult: 1.0,
              weaponGrade: 'C',
              weaponKind: 'staff',
              statusEffect: { type: 'burn', dps: 6, tickDamage: 3, tickInterval: 0.5, duration: 2.0 },
            });
            this.vfxPool.spawnSparks(p.position, 8, 0xffcc33);
            this.vfxPool.spawnScorchMark(target.position, 0.8, 4.0);
            p.active = false;
            p.group.visible = false;
            break;
          } else if (p.spell.id === 'fireDartVolley') {
            const dmg = Math.round((p.caster.baseAttack || 20) * (p.spell.damageMult || 0.60));
            target.receiveAttack({
              attacker: p.caster,
              attackerName: p.caster.name,
              attackerPosition: p.position,
              damage: dmg,
              poiseDamage: p.spell.poiseDamage || 14,
              knockbackSpeed: p.spell.knockbackSpeed || 2.0,
              attackMoveMult: 1.0,
              weaponGrade: 'C',
              weaponKind: 'staff',
              statusEffect: { type: 'burn', dps: 5, tickDamage: 2, tickInterval: 0.5, duration: 2.0 },
            });
            this.vfxPool.spawnSparks(p.position, 6, 0xffdd44);
            p.active = false;
            p.group.visible = false;
            break;
          } else if (p.spell.id === 'iceSpike') {
            target.receiveAttack({
              attacker: p.caster,
              attackerName: p.caster.name,
              attackerPosition: p.position,
              damage: p.spell.directDamage || 38,
              poiseDamage: p.spell.poiseDamage || 50,
              knockbackSpeed: p.spell.knockbackSpeed || 2.0,
              attackMoveMult: 1.0,
              weaponGrade: 'C',
              weaponKind: 'staff',
              statusEffect: p.spell.statusEffect,
            });
            this.vfxPool.spawnBurst(p.position, 1.2, p.spell.colorPrimary || 0x38bdf8);
            p.piercesRemaining--;
            if (p.piercesRemaining <= 0) {
              p.active = false;
              p.group.visible = false;
              break;
            }
          }
        }
      }
    }
  }

  _tickFlameWall(fw) {
    const caster = fw.caster;
    const spell = fw.spell;
    if (!caster || !spell) return;

    for (let i = 0; i < this.combatants.length; i++) {
      const target = this.combatants[i];
      if (target.isDead || target.team === caster.team || target.team === 'neutral') continue;

      const dx = target.position.x - fw.position.x;
      const dz = target.position.z - fw.position.z;
      const cos = Math.cos(-fw.facingYaw);
      const sin = Math.sin(-fw.facingYaw);
      const localX = dx * cos - dz * sin;
      const localZ = dx * sin + dz * cos;

      if (Math.abs(localX) <= 4.2 && Math.abs(localZ) <= 0.8) {
        const dmg = Math.max(1, Math.round((caster.baseAttack || 20) * (spell.damageMultPerTick || 0.35)));
        target.receiveAttack({
          attacker: caster,
          attackerName: caster.name,
          attackerPosition: fw.position,
          spellId: 'flameWall',
          damage: dmg,
          poiseDamage: spell.poiseDamagePerTick || 12,
          knockbackSpeed: 0.2,
          attackMoveMult: 0.8,
          weaponGrade: 'B',
          weaponKind: 'staff',
          statusEffect: { type: 'burn', dps: 6, tickDamage: 3, tickInterval: 0.5, duration: 2.5 },
        });
        this.vfxPool.spawnSparks(target.position, 4, 0xfde047);
      }
    }
  }

  _detonateFireball(proj, impactPos) {
    const spell = proj.spell;
    const caster = proj.caster;
    const radius = spell.blastRadius || 2.50;

    const masteryMult = 1.0 + (caster.spellMastery?.fireball?.level || 0) * (MASTERY_CONFIG.damageBonusPerLevel || 0.05);
    const damage = Math.round((caster.baseAttack || 20) * (spell.damageMult || 2.20) * masteryMult);

    this.vfxPool.spawnBurst(impactPos, radius, spell.colorPrimary || 0xff3b11);
    this.vfxPool.spawnScorchMark(impactPos, radius * 0.9, 6.0);
    this.vfxPool.spawnSparks(impactPos, 16, 0xffaa22);

    timeScale.applyHitStop(caster, 0.05);
    const shake = Math.min(1.0, (spell.cameraShake || 0.25) * (damage / 35));
    if (this.onScreenShake) {
      this.onScreenShake(shake);
    }

    queryHostilesInRadius(caster, impactPos, radius, this.combatants, _splashHitList);

    for (let i = 0; i < _splashHitList.length; i++) {
      const target = _splashHitList[i];
      timeScale.applyHitStop(target, 0.05);

      target.receiveAttack({
        attacker: caster,
        attackerName: caster.name,
        attackerPosition: impactPos,
        damage,
        poiseDamage: spell.poiseDamage || 55,
        knockbackSpeed: spell.knockbackSpeed || 4.5,
        attackMoveMult: 1.2,
        weaponGrade: 'C',
        weaponKind: 'staff',
        statusEffect: { type: 'burn', dps: 8, tickDamage: 4, tickInterval: 0.5, duration: spell.burnDuration || 3.0 },
      });
    }

    combatEvents.emit('onSpellImpact', {
      spellId: 'fireball',
      targetsHit: Math.max(1, _splashHitList.length),
    });
  }

  clear() {
    this.vfxPool.clear();
    this.activeFlameWalls = [];
  }
}
