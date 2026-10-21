// src/dev/devCombatants.js
// Factory and spawn pattern generator for heroes, allies, and enemies

import * as THREE from 'three';
import { HeroRig } from '../art/HeroRig.js';
import { EnemyRig } from '../art/EnemyRig.js';
import { Combatant } from '../combat/Combatant.js';
import { HERO_OPTIONS, ENEMY_TYPES } from './devPresets.js';
import { GRADE_MULTS } from '../combat/CombatData.js';

function ensureRigWeaponAnchors(rig) {
  if (typeof rig.getWeaponEdgeBaseWorldPosition !== 'function') {
    rig.getWeaponEdgeBaseWorldPosition = (target = new THREE.Vector3()) => {
      if (rig.model?.parts?.handR) {
        return rig.model.parts.handR.getWorldPosition(target);
      }
      return target.setFromMatrixPosition(rig.group.matrixWorld).add(new THREE.Vector3(0, 0.7, 0.3));
    };
  }
  if (typeof rig.getWeaponTipWorldPosition !== 'function') {
    rig.getWeaponTipWorldPosition = (target = new THREE.Vector3()) => {
      if (rig.model?.parts?.handR) {
        rig.model.parts.handR.getWorldPosition(target);
        const forward = new THREE.Vector3(0, 0, 0.8).applyQuaternion(rig.group.quaternion);
        return target.add(forward);
      }
      return target.setFromMatrixPosition(rig.group.matrixWorld).add(new THREE.Vector3(0, 0.7, 1.1));
    };
  }
}

/**
 * Creates a hero or ally combatant.
 */
export function createHeroCombatant(opts = {}) {
  const heroKey = opts.heroKey || 'han';
  const preset = HERO_OPTIONS[heroKey] || HERO_OPTIONS.han;
  const scene = opts.scene;
  const weaponKind = opts.weaponKind || preset.weaponKind || 'sword';
  const shieldKind = opts.shieldKind !== undefined ? opts.shieldKind : preset.shieldKind;
  const grade = opts.grade || preset.grade || 'D';

  const isBow = weaponKind === 'bow';
  // Archers never carry a shield
  const actualShieldKind = isBow ? null : shieldKind;

  const rig = new HeroRig(preset.look);
  rig.equip({
    weapon: { kind: weaponKind, grade, durability: 100 },
    offhand: actualShieldKind ? { kind: actualShieldKind, grade, durability: 100 } : null,
  });
  ensureRigWeaponAnchors(rig);
  if (scene) scene.add(rig.group);

  const maxHp = opts.maxHp !== undefined ? opts.maxHp : (opts.hp !== undefined ? opts.hp : preset.maxHp);
  const hp = opts.hp !== undefined ? opts.hp : maxHp;
  const maxStamina = opts.maxStamina !== undefined ? opts.maxStamina : (opts.stamina !== undefined ? opts.stamina : preset.maxStamina);
  const stamina = opts.stamina !== undefined ? opts.stamina : maxStamina;
  const maxMana = opts.maxMana !== undefined ? opts.maxMana : (opts.mana !== undefined ? opts.mana : preset.maxMana);
  const mana = opts.mana !== undefined ? opts.mana : maxMana;
  const maxPoise = opts.maxPoise !== undefined ? opts.maxPoise : (opts.poise !== undefined ? opts.poise : preset.maxPoise);
  const poise = opts.poise !== undefined ? opts.poise : maxPoise;

  const isPlayerTeam = (opts.team || 'player') === 'player';
  const defaultArrows = isPlayerTeam ? 20 : 12;
  const maxArrows = opts.maxArrows !== undefined ? opts.maxArrows : (opts.arrows !== undefined ? opts.arrows : defaultArrows);
  const arrows = opts.arrows !== undefined ? opts.arrows : maxArrows;

  const mult = GRADE_MULTS[grade] || 1.0;
  const combatant = new Combatant({
    name: opts.name || preset.name,
    team: opts.team || 'player',
    roleTag: preset.roleTag,
    classTags: preset.classTags,
    maxHp,
    hp,
    maxStamina,
    stamina,
    maxMana,
    mana,
    maxPoise,
    poise,
    baseAttack: preset.baseAttack * mult,
    defense: preset.defense,
    position: opts.position || new THREE.Vector3(0, 0, 2.0),
    facingYaw: opts.facingYaw || 0,
    mesh: rig.group,
    rig,
    weapon: {
      kind: weaponKind,
      grade,
      damageMult: mult,
      reach: weaponKind === 'greatsword' || weaponKind === 'spear' || weaponKind === 'staff' ? 1.15 : 0.85,
      radius: 0.14,
    },
    shield: actualShieldKind ? { kind: actualShieldKind, grade, blockEfficiency: 0.65 } : null,
  });

  combatant.arrows = arrows;
  combatant.maxArrows = maxArrows;
  combatant.primaryWeaponKind = weaponKind;
  combatant.hasSwappedToDagger = false;
  combatant.isSwappingWeapon = false;
  combatant.swapProgress = 0;
  combatant._backBowMesh = null;

  // Swap to dagger (0.4s draw animation, bow goes to back)
  combatant.swapToDagger = function(onComplete) {
    if (this.weapon.kind === 'dagger' || this.isSwappingWeapon) return;
    this.isSwappingWeapon = true;
    this.swapProgress = 0;
    this.hasSwappedToDagger = true;

    // Fast draw transition
    setTimeout(() => {
      this.weapon.kind = 'dagger';
      this.weapon.reach = 0.65;
      this.weapon.damageMult = (GRADE_MULTS[this.weapon.grade] || 1.0) * 0.75;
      if (this.rig && typeof this.rig.equip === 'function') {
        this.rig.equip({
          weapon: { kind: 'dagger', grade: this.weapon.grade, durability: 100 },
          offhand: null,
        });

        // Attach slung bow to back socket if socket exists
        if (this.rig.model?.sockets?.back) {
          if (!this._backBowMesh) {
            const bowGeo = new THREE.TorusGeometry(0.38, 0.02, 6, 16, Math.PI * 0.72);
            bowGeo.center();
            const bowMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.8 });
            this._backBowMesh = new THREE.Mesh(bowGeo, bowMat);
            this._backBowMesh.position.set(0, 0, -0.04);
            this._backBowMesh.rotation.set(0, 0, -0.85);
          }
          this.rig.model.sockets.back.add(this._backBowMesh);
        }
      }
      this.isSwappingWeapon = false;
      if (onComplete) onComplete();
    }, 400);
  };

  // Swap back to bow if arrows > 0 (toggle with X)
  combatant.swapToBow = function(onComplete) {
    if (this.weapon.kind === 'bow' || this.arrows <= 0 || this.isSwappingWeapon) return;
    this.isSwappingWeapon = true;
    this.swapProgress = 0;
    this.hasSwappedToDagger = false;

    setTimeout(() => {
      this.weapon.kind = 'bow';
      this.weapon.reach = 0.85;
      this.weapon.damageMult = (GRADE_MULTS[this.weapon.grade] || 1.0);
      if (this._backBowMesh && this._backBowMesh.parent) {
        this._backBowMesh.parent.remove(this._backBowMesh);
      }
      if (this.rig && typeof this.rig.equip === 'function') {
        this.rig.equip({
          weapon: { kind: 'bow', grade: this.weapon.grade, durability: 100 },
          offhand: null,
        });
      }
      this.isSwappingWeapon = false;
      if (onComplete) onComplete();
    }, 400);
  };

  if (opts.spellSystem) {
    combatant.spellSystem = opts.spellSystem;
  }
  combatant.heroKey = heroKey;
  combatant.init();

  return combatant;
}

/**
 * Creates an enemy combatant.
 */
export function createEnemyCombatant(opts = {}) {
  const typeKey = opts.typeKey || 'dummy';
  const def = ENEMY_TYPES[typeKey] || ENEMY_TYPES.dummy;
  const scene = opts.scene;

  const weaponKind = opts.weaponKind || def.weaponKind || 'sword';
  const shieldKind = opts.shieldKind !== undefined ? opts.shieldKind : def.shieldKind;
  const grade = opts.grade || def.grade || 'D';
  const team = opts.team || 'enemy';

  const isBow = weaponKind === 'bow';
  const actualShieldKind = isBow ? null : shieldKind;

  let rig;
  if (def.useEnemyRig) {
    rig = new EnemyRig(def.useEnemyRig, { weapon: weaponKind });
  } else {
    rig = new HeroRig(def.look);
    rig.equip({
      weapon: { kind: weaponKind, grade, durability: 100 },
      offhand: actualShieldKind ? { kind: actualShieldKind, grade, durability: 100 } : null,
    });
  }
  ensureRigWeaponAnchors(rig);
  if (scene) scene.add(rig.group);

  const mult = GRADE_MULTS[grade] || 1.0;
  const pos = opts.position || new THREE.Vector3(0, 0, -3.5);
  const yaw = opts.facingYaw !== undefined ? opts.facingYaw : Math.atan2(-pos.x, -pos.z);

  const combatant = new Combatant({
    name: opts.name || `${def.name} #${Combatant.nextId}`,
    team,
    roleTag: def.roleTag,
    isElite: Boolean(def.isElite || opts.isElite),
    classTags: def.classTags || ['melee'],
    maxHp: opts.hp || def.maxHp,
    hp: opts.hp || def.maxHp,
    maxPoise: opts.poise || def.maxPoise,
    poise: opts.poise || def.maxPoise,
    maxMana: def.maxMana || 100,
    mana: def.maxMana || 100,
    baseAttack: def.baseAttack * mult,
    defense: def.defense,
    position: pos,
    facingYaw: yaw,
    mesh: rig.group,
    rig,
    weapon: {
      kind: weaponKind,
      grade,
      damageMult: mult,
      reach: weaponKind === 'greatsword' || weaponKind === 'spear' || weaponKind === 'staff' ? 1.15 : 0.85,
      radius: 0.14,
    },
    shield: actualShieldKind ? { kind: actualShieldKind, grade, blockEfficiency: 0.65 } : null,
  });

  combatant.arrows = opts.arrows !== undefined ? opts.arrows : (def.arrows !== undefined ? def.arrows : 12);
  combatant.maxArrows = combatant.arrows;
  combatant.primaryWeaponKind = weaponKind;
  combatant.hasSwappedToDagger = false;
  combatant.isSwappingWeapon = false;

  combatant.swapToDagger = function(onComplete) {
    if (this.weapon.kind === 'dagger' || this.isSwappingWeapon) return;
    this.isSwappingWeapon = true;
    this.hasSwappedToDagger = true;
    setTimeout(() => {
      this.weapon.kind = 'dagger';
      this.weapon.reach = 0.65;
      this.weapon.damageMult = (GRADE_MULTS[this.weapon.grade] || 1.0) * 0.75;
      if (this.rig && typeof this.rig.equip === 'function') {
        this.rig.equip({ weapon: { kind: 'dagger', grade: this.weapon.grade, durability: 100 }, offhand: null });
      }
      this.isSwappingWeapon = false;
      if (onComplete) onComplete();
    }, 400);
  };

  combatant.swapToBow = function(onComplete) {
    if (this.weapon.kind === 'bow' || this.arrows <= 0 || this.isSwappingWeapon) return;
    this.isSwappingWeapon = true;
    this.hasSwappedToDagger = false;
    setTimeout(() => {
      this.weapon.kind = 'bow';
      this.weapon.reach = 0.85;
      this.weapon.damageMult = (GRADE_MULTS[this.weapon.grade] || 1.0);
      if (this.rig && typeof this.rig.equip === 'function') {
        this.rig.equip({ weapon: { kind: 'bow', grade: this.weapon.grade, durability: 100 }, offhand: null });
      }
      this.isSwappingWeapon = false;
      if (onComplete) onComplete();
    }, 400);
  };

  if (opts.spellSystem) {
    combatant.spellSystem = opts.spellSystem;
  }

  combatant.typeKey = typeKey;
  if (typeKey === 'timed') {
    combatant.attackTimer = 0.0;
    combatant.attackInterval = def.attackInterval || 3.0;
  }
  if (typeKey === 'shaman') {
    combatant.castTimer = 0.0;
    combatant.castInterval = def.castInterval || 4.0;
    combatant.spellToggle = false;
  }

  combatant.init();
  return combatant;
}

/**
 * Creates autonomous Archer AI updater for an archer combatant.
 * Rules: Shoot from range (6-12m) and kite if enemy < 5m; switch to dagger when out of arrows.
 */
export function createArcherAI(combatant, getCombatants, arrowPool) {
  let shootTimer = 1.0;

  return function update(dt) {
    if (!combatant || combatant.isDead) return;

    // Check if out of arrows and needs dagger swap
    if (combatant.weapon.kind === 'bow' && combatant.arrows <= 0 && !combatant.hasSwappedToDagger) {
      combatant.swapToDagger();
      return;
    }

    const allCombatants = typeof getCombatants === 'function' ? getCombatants() : getCombatants;
    let closestEnemy = null;
    let closestDistSq = Infinity;
    for (let i = 0; i < allCombatants.length; i++) {
      const c = allCombatants[i];
      if (c.isDead || c.id === combatant.id || c.team === combatant.team) continue;
      const dSq = combatant.position.distanceToSquared(c.position);
      if (dSq < closestDistSq) {
        closestDistSq = dSq;
        closestEnemy = c;
      }
    }

    if (!closestEnemy) {
      if (combatant.stateMachine.state === 'MOVE') combatant.stateMachine.transitionTo('IDLE');
      return;
    }

    const dist = Math.sqrt(closestDistSq);
    const dx = closestEnemy.position.x - combatant.position.x;
    const dz = closestEnemy.position.z - combatant.position.z;
    const dirX = dist > 0.001 ? dx / dist : 0;
    const dirZ = dist > 0.001 ? dz / dist : 1;

    combatant.facingYaw = Math.atan2(dx, dz);

    if (combatant.weapon.kind === 'bow' && combatant.arrows > 0) {
      if (dist < 4.8) {
        // Kite away
        const moveSpeed = combatant.effectiveMoveSpeed;
        combatant.position.x -= dirX * moveSpeed * dt;
        combatant.position.z -= dirZ * moveSpeed * dt;
        combatant.stateMachine.transitionTo('MOVE');
      } else if (dist > 12.0) {
        // Approach
        const moveSpeed = combatant.effectiveMoveSpeed;
        combatant.position.x += dirX * moveSpeed * dt;
        combatant.position.z += dirZ * moveSpeed * dt;
        combatant.stateMachine.transitionTo('MOVE');
      } else {
        // In shooting range
        if (combatant.stateMachine.state === 'MOVE') combatant.stateMachine.transitionTo('IDLE');
        shootTimer -= dt;
        if (shootTimer <= 0 && (combatant.stateMachine.state === 'IDLE' || combatant.stateMachine.attackPhase === 'RECOVERY')) {
          shootTimer = 2.2;
          combatant.arrows--;
          if (arrowPool) {
            const origin = combatant.position.clone().add(new THREE.Vector3(0, 1.2, 0));
            const velocity = new THREE.Vector3(dirX, 0, dirZ).multiplyScalar(22.0);
            velocity.y = Math.min(2.0, dist * 0.12) * 2.2;
            arrowPool.spawn({
              position: origin,
              velocity,
              grade: combatant.weapon.grade || 'D',
              shooterId: combatant.id,
              damage: combatant.baseAttack,
              headshotMultiplier: 1.5,
              drawRatio: 0.8,
            });
          }
          combatant.stateMachine.transitionTo('ATTACK', { heavy: false });
        }
      }
    } else {
      // Dagger melee behavior (approach within 1.2m and combo)
      if (dist > 1.2) {
        const moveSpeed = combatant.effectiveMoveSpeed;
        combatant.position.x += dirX * moveSpeed * dt;
        combatant.position.z += dirZ * moveSpeed * dt;
        combatant.stateMachine.transitionTo('MOVE');
      } else {
        if (combatant.stateMachine.state === 'MOVE') combatant.stateMachine.transitionTo('IDLE');
        shootTimer -= dt;
        if (shootTimer <= 0 && (combatant.stateMachine.state === 'IDLE' || combatant.stateMachine.attackPhase === 'RECOVERY')) {
          shootTimer = 1.0;
          combatant.stateMachine.transitionTo('ATTACK', { heavy: false });
        }
      }
    }
  };
}

/**
 * Generates spawn positions using line, circle, or cluster patterns.
 */
export function calculateSpawnPositions(pattern, count, center = new THREE.Vector3(0, 0, -4.0), spacing = 2.0) {
  const positions = [];
  if (count <= 0) return positions;

  if (pattern === 'line') {
    const totalW = (count - 1) * spacing;
    const startX = center.x - totalW / 2;
    for (let i = 0; i < count; i++) {
      positions.push(new THREE.Vector3(startX + i * spacing, 0, center.z));
    }
  } else if (pattern === 'circle') {
    const radius = Math.max(2.5, Math.min(8.0, 1.2 + count * 0.45));
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      positions.push(new THREE.Vector3(
        center.x + Math.cos(angle) * radius,
        0,
        center.z + Math.sin(angle) * radius
      ));
    }
  } else {
    // Cluster
    positions.push(center.clone());
    for (let i = 1; i < count; i++) {
      const angle = (i * 2.39996); // Golden ratio angle
      const r = Math.sqrt(i) * 1.35;
      positions.push(new THREE.Vector3(
        center.x + Math.cos(angle) * r,
        0,
        center.z + Math.sin(angle) * r
      ));
    }
  }
  return positions;
}

/**
 * Cleanly removes a combatant and its 3D mesh from the scene.
 */
export function disposeCombatant(combatant, scene) {
  if (!combatant) return;
  combatant.isDead = true;

  // Cleanly remove any attached back bow mesh (Issue 1)
  if (combatant._backBowMesh) {
    if (combatant._backBowMesh.parent) {
      combatant._backBowMesh.parent.remove(combatant._backBowMesh);
    }
    combatant._backBowMesh.geometry?.dispose();
    combatant._backBowMesh.material?.dispose();
    combatant._backBowMesh = null;
  }

  // Dispose rig weapons and attachments
  if (combatant.rig && typeof combatant.rig.dispose === 'function') {
    combatant.rig.dispose();
  }

  if (combatant.mesh) {
    if (scene && combatant.mesh.parent === scene) {
      scene.remove(combatant.mesh);
    } else if (combatant.mesh.parent) {
      combatant.mesh.parent.remove(combatant.mesh);
    }
  }
  if (typeof combatant.dispose === 'function') {
    combatant.dispose();
  }
}
