// src/combat/MageAI.js
// Universal Combat Engine Phase 2 - Autonomous Mage Ally & Shaman Enemy AI
// Range keeping (7m-11m band, kiting <4m), Priority spell selection, Mana budgeting

import * as THREE from 'three';
import { queryAlliesInRadius, queryHostilesInRadius } from './HitPipeline.js';
import { SpellSystem } from './SpellSystem.js';

const _toEnemyVec = new THREE.Vector3();
const _moveDirVec = new THREE.Vector3();
const _probeVec = new THREE.Vector3();
const _centroidVec = new THREE.Vector3();
const _alliesCache = [];
const _enemiesCache = [];

export class MageAI {
  /**
   * @param {Combatant} combatant
   * @param {Combatant[]} allCombatants
   */
  constructor(combatant, allCombatants = []) {
    this.combatant = combatant;
    this.allCombatants = allCombatants;
    this.decisionTimer = 0.0;
    this.decisionInterval = 0.25; // Re-evaluate choices every 250ms
    this.isKiting = false;
  }

  setCombatants(allCombatants) {
    this.allCombatants = allCombatants;
  }

  update(delta) {
    if (!this.combatant || this.combatant.isDead) return;

    // Do not alter movement while performing committed attack/cast/stagger/dodge
    const state = this.combatant.stateMachine.state;
    if (state === 'DODGE' || state === 'STAGGER' || state === 'DEAD') {
      return;
    }

    // 1. Locate Closest Living Hostile
    let closestEnemy = null;
    let closestDistSq = Infinity;

    for (let i = 0; i < this.allCombatants.length; i++) {
      const c = this.allCombatants[i];
      if (c.isDead || c.id === this.combatant.id || c.team === this.combatant.team || c.team === 'neutral') {
        continue;
      }
      const dSq = this.combatant.position.distanceToSquared(c.position);
      if (dSq < closestDistSq) {
        closestDistSq = dSq;
        closestEnemy = c;
      }
    }

    if (!closestEnemy) {
      if (state === 'MOVE') {
        this.combatant.stateMachine.transitionTo('IDLE');
      }
      return;
    }

    const dist = Math.sqrt(closestDistSq);
    _toEnemyVec.subVectors(closestEnemy.position, this.combatant.position);
    _toEnemyVec.y = 0;
    if (_toEnemyVec.lengthSq() > 0.0001) {
      _toEnemyVec.normalize();
    }

    // Always face towards primary threat
    this.combatant.facingYaw = Math.atan2(_toEnemyVec.x, _toEnemyVec.z);

    // 2. Spatial Range Keeping (7.0m - 11.0m Band) & Hazard Avoidance
    const canMove = state === 'IDLE' || state === 'MOVE' || state === 'CAST';
    if (canMove && state !== 'CAST') {
      if (dist < 4.0) {
        // Kite backward away from enemy
        this.isKiting = true;
        _moveDirVec.copy(_toEnemyVec).multiplyScalar(-1);
      } else if (dist > 11.0) {
        // Advance toward combat
        this.isKiting = false;
        _moveDirVec.copy(_toEnemyVec);
      } else {
        // In sweet spot (4m - 11m): Hold ground or step out of active flame walls
        this.isKiting = false;
        _moveDirVec.set(0, 0, 0);
      }

      // Avoid standing in or walking into active Flame Walls
      _probeVec.copy(this.combatant.position).addScaledVector(_moveDirVec, 1.2);
      if (SpellSystem.isPointInFlameWall(_probeVec, 1.0) || SpellSystem.isPointInFlameWall(this.combatant.position, 0.5)) {
        // Steer laterally away from hazard
        const origX = _moveDirVec.x || 1.0;
        const origZ = _moveDirVec.z;
        _moveDirVec.set(-origZ, 0, origX).normalize();
      }

      if (_moveDirVec.lengthSq() > 0.001) {
        const step = this.combatant.effectiveMoveSpeed * delta;
        this.combatant.position.addScaledVector(_moveDirVec, step);
        if (state !== 'MOVE') {
          this.combatant.stateMachine.transitionTo('MOVE');
        }
      } else if (state === 'MOVE') {
        this.combatant.stateMachine.transitionTo('IDLE');
      }
    }

    // 3. Periodic Spell Priority Evaluation
    this.decisionTimer += delta;
    if (this.decisionTimer >= this.decisionInterval) {
      this.decisionTimer = 0.0;

      if (state === 'IDLE' || state === 'MOVE') {
        this._evaluateSpells(closestEnemy, dist);
      }
    }
  }

  _evaluateSpells(closestEnemy, distToEnemy) {
    const c = this.combatant;
    const mana = c.mana;
    const maxMana = c.maxMana;
    const isManaConserved = mana < maxMana * 0.50; // Skip >= 40 mana spells if mana < 50%

    // PRIORITY 1: Heal lowest ally under 45% HP
    if (c.spellCooldowns.heal <= 0 && mana >= 30) {
      queryAlliesInRadius(c, c.position, 12.0, this.allCombatants, _alliesCache, true);
      let lowestAlly = null;
      let lowestRatio = 0.45; // Threshold: only heal if <= 45%

      for (let i = 0; i < _alliesCache.length; i++) {
        const ally = _alliesCache[i];
        const ratio = ally.hp / ally.maxHp;
        if (ratio < lowestRatio) {
          lowestRatio = ratio;
          lowestAlly = ally;
        }
      }

      if (lowestAlly) {
        c.castSpell('heal', lowestAlly.position, lowestAlly);
        return;
      }
    }

    // PRIORITY 2: Meteor Bombardment on Enemy Cluster (>= 3 within 4.0m)
    if (!isManaConserved && c.spellCooldowns.meteor <= 0 && mana >= 65 && distToEnemy <= 16.0) {
      queryHostilesInRadius(c, closestEnemy.position, 4.0, this.allCombatants, _enemiesCache);
      if (_enemiesCache.length >= 3) {
        // Calculate cluster centroid
        _centroidVec.set(0, 0, 0);
        for (let i = 0; i < _enemiesCache.length; i++) {
          _centroidVec.add(_enemiesCache[i].position);
        }
        _centroidVec.multiplyScalar(1 / _enemiesCache.length);
        c.castSpell('meteor', _centroidVec);
        return;
      }
    }

    // PRIORITY 3: Lightning Chain if >= 2 enemies in chain jump range
    if (c.spellCooldowns.lightningChain <= 0 && mana >= 35 && distToEnemy <= 14.0) {
      queryHostilesInRadius(c, closestEnemy.position, 5.0, this.allCombatants, _enemiesCache);
      if (_enemiesCache.length >= 2) {
        c.castSpell('lightningChain', closestEnemy.position, closestEnemy);
        return;
      }
    }

    // PRIORITY 4: Direct Ranged Single-Target Spells
    if (c.spellCooldowns.fireball <= 0 && mana >= 25 && distToEnemy <= 18.0) {
      c.castSpell('fireball', closestEnemy.position, closestEnemy);
      return;
    }

    if (c.spellCooldowns.iceSpike <= 0 && mana >= 20 && distToEnemy <= 20.0) {
      c.castSpell('iceSpike', closestEnemy.position, closestEnemy);
      return;
    }

    // FALLBACK: Melee Staff Whack if out of mana and rushed down (< 2.4m)
    if (distToEnemy <= 2.4 && mana < 20 && c.stamina >= 12) {
      c.stateMachine.transitionTo('ATTACK', { heavy: false });
    }
  }
}
