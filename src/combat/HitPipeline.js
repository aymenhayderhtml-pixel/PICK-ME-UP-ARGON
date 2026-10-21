// src/combat/HitPipeline.js
// Universal Combat Engine Phase 1 - Swept-Capsule Collision Pipeline & Spatial Hash Broadphase

import * as THREE from 'three';
import { ATTACK_PHASES } from './StateMachine.js';
import { MELEE_HIT_SECTORS } from './CombatData.js';

/**
 * Computes the squared distance between two 3D line segments:
 * S1: P(s) = p1 + s * (q1 - p1), s in [0, 1]
 * S2: Q(t) = p2 + t * (q2 - p2), t in [0, 1]
 * Optionally writes the closest points to outC1 and outC2.
 */
export function segmentToSegmentDistanceSq(p1, q1, p2, q2, outC1 = null, outC2 = null) {
  const d1x = q1.x - p1.x;
  const d1y = q1.y - p1.y;
  const d1z = q1.z - p1.z;

  const d2x = q2.x - p2.x;
  const d2y = q2.y - p2.y;
  const d2z = q2.z - p2.z;

  const rx = p1.x - p2.x;
  const ry = p1.y - p2.y;
  const rz = p1.z - p2.z;

  const a = d1x * d1x + d1y * d1y + d1z * d1z; // Squared length of segment S1
  const e = d2x * d2x + d2y * d2y + d2z * d2z; // Squared length of segment S2
  const f = d2x * rx + d2y * ry + d2z * rz;

  let s = 0.0;
  let t = 0.0;

  // Check if both segments degenerate into points
  if (a <= 0.00001 && e <= 0.00001) {
    if (outC1) outC1.copy(p1);
    if (outC2) outC2.copy(p2);
    return rx * rx + ry * ry + rz * rz;
  }

  if (a <= 0.00001) {
    s = 0.0;
    t = Math.max(0.0, Math.min(1.0, f / e));
  } else {
    const c = d1x * rx + d1y * ry + d1z * rz;
    if (e <= 0.00001) {
      t = 0.0;
      s = Math.max(0.0, Math.min(1.0, -c / a));
    } else {
      const b = d1x * d2x + d1y * d2y + d1z * d2z;
      const denom = a * e - b * b;

      if (denom !== 0.0) {
        s = Math.max(0.0, Math.min(1.0, (b * f - c * e) / denom));
      } else {
        s = 0.0;
      }

      t = (b * s + f) / e;
      if (t < 0.0) {
        t = 0.0;
        s = Math.max(0.0, Math.min(1.0, -c / a));
      } else if (t > 1.0) {
        t = 1.0;
        s = Math.max(0.0, Math.min(1.0, (b - c) / a));
      }
    }
  }

  const c1x = p1.x + d1x * s;
  const c1y = p1.y + d1y * s;
  const c1z = p1.z + d1z * s;

  const c2x = p2.x + d2x * t;
  const c2y = p2.y + d2y * t;
  const c2z = p2.z + d2z * t;

  if (outC1) outC1.set(c1x, c1y, c1z);
  if (outC2) outC2.set(c2x, c2y, c2z);

  const diffX = c1x - c2x;
  const diffY = c1y - c2y;
  const diffZ = c1z - c2z;

  return diffX * diffX + diffY * diffY + diffZ * diffZ;
}

/**
 * Zero-Allocation Spatial Hash Grid for 2D XZ broadphase queries.
 */
export class SpatialHashGrid {
  constructor(cellSize = 2.0, tableSize = 512) {
    this.cellSize = cellSize;
    this.invCellSize = 1.0 / cellSize;
    this.tableSize = tableSize;
    this.mask = tableSize - 1;
    this.buckets = [];
    for (let i = 0; i < tableSize; i++) {
      this.buckets.push([]);
    }
    this._usedBuckets = [];
  }

  clear() {
    for (let i = 0; i < this._usedBuckets.length; i++) {
      this._usedBuckets[i].length = 0;
    }
    this._usedBuckets.length = 0;
  }

  insert(combatant) {
    const cx = Math.floor(combatant.position.x * this.invCellSize);
    const cz = Math.floor(combatant.position.z * this.invCellSize);
    const h = (((cx * 73856093) ^ (cz * 19349663)) & 0x7fffffff) & this.mask;
    const bucket = this.buckets[h];
    if (bucket.length === 0) {
      this._usedBuckets.push(bucket);
    }
    bucket.push(combatant);
  }

  queryRadius(x, z, radius, outResults) {
    outResults.length = 0;
    const minCx = Math.floor((x - radius) * this.invCellSize);
    const maxCx = Math.floor((x + radius) * this.invCellSize);
    const minCz = Math.floor((z - radius) * this.invCellSize);
    const maxCz = Math.floor((z + radius) * this.invCellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const h = (((cx * 73856093) ^ (cz * 19349663)) & 0x7fffffff) & this.mask;
        const bucket = this.buckets[h];
        for (let i = 0; i < bucket.length; i++) {
          outResults.push(bucket[i]);
        }
      }
    }
  }
}

// Pre-allocated scratch objects for zero GC during collision pipeline
const _subBase = new THREE.Vector3();
const _subTip = new THREE.Vector3();
const _bodyC0 = new THREE.Vector3();
const _bodyC1 = new THREE.Vector3();
const _closestWeapon = new THREE.Vector3();
const _closestBody = new THREE.Vector3();
const _hitNormal = new THREE.Vector3();
const _queryList = [];

const _hitPayload = {
  attacker: null,
  attackerName: '',
  attackerPosition: new THREE.Vector3(),
  hitPoint: new THREE.Vector3(),
  hitNormal: new THREE.Vector3(),
  damage: 0,
  poiseDamage: 0,
  attackMoveMult: 1.0,
  weaponKind: 'sword',
  weaponGrade: 'D',
};

export class HitPipeline {
  constructor() {
    this.grid = new SpatialHashGrid(2.0);
  }

  update(combatants, delta) {
    // 1. Rebuild Spatial Hash broadphase
    this.grid.clear();
    for (let i = 0; i < combatants.length; i++) {
      const c = combatants[i];
      if (!c.isDead) {
        this.grid.insert(c);
      }
    }

    // 2. Test active attackers
    for (let i = 0; i < combatants.length; i++) {
      const attacker = combatants[i];
      if (attacker.isDead) continue;

      const sm = attacker.stateMachine;
      if (sm.state !== 'ATTACK' || sm.attackPhase !== ATTACK_PHASES.ACTIVE) {
        continue;
      }

      const frameData = sm.currentFrameData;
      if (!frameData) continue;

      const weaponRadius = attacker.weapon.radius || 0.12;
      const weaponReach = attacker.weapon.reach || 0.85;
      const isMelee = attacker.weapon && attacker.weapon.kind !== 'bow';
      const sector = isMelee ? (MELEE_HIT_SECTORS[attacker.weapon.kind] || MELEE_HIT_SECTORS.sword) : null;

      if (!attacker.weaponAnchorsValid && !sector) {
        continue;
      }

      // Broadphase query centered on hero position covering weapon reach and sector radius
      const queryRadius = Math.max(weaponReach + 1.2, sector ? (sector.radius + 1.2) : 2.5);
      this.grid.queryRadius(attacker.position.x, attacker.position.z, queryRadius, _queryList);
      if (_queryList.length === 0) continue;

      // Sub-step count: 3 if weapon moved, 1 if stationary or testing sector only
      const hasAnchors = Boolean(attacker.weaponAnchorsValid);
      const moved = hasAnchors && attacker.prevWeaponBase.distanceToSquared(attacker.currWeaponBase) > 0.0001;
      const K = moved ? 3 : 1;

      for (let k = 1; k <= K; k++) {
        const s = k / K;
        if (hasAnchors) {
          _subBase.lerpVectors(attacker.prevWeaponBase, attacker.currWeaponBase, s);
          _subTip.lerpVectors(attacker.prevWeaponTip, attacker.currWeaponTip, s);
        }

        for (let j = 0; j < _queryList.length; j++) {
          const target = _queryList[j];

          // Filter rules:
          // 1. Cannot hit self
          // 2. Friendly Fire OFF: target team must not match attacker team
          // 3. Cannot hit dead targets
          // 4. One hit per target per swing
          if (
            target.id === attacker.id ||
            target.team === attacker.team ||
            target.team === 'neutral' ||
            target.isDead ||
            attacker.hitTargetsThisSwing.has(target.id)
          ) {
            continue;
          }

          const targetRadius = target.capsuleRadius || 0.35;
          const targetHeight = target.capsuleHeight || 1.55;
          let isHit = false;

          // Hit Test 1: Swept Capsule on weapon line
          if (hasAnchors) {
            _bodyC0.set(target.position.x, target.position.y + targetRadius, target.position.z);
            _bodyC1.set(target.position.x, target.position.y + targetHeight - targetRadius, target.position.z);

            const distSq = segmentToSegmentDistanceSq(_subBase, _subTip, _bodyC0, _bodyC1, _closestWeapon, _closestBody);
            const collisionDist = weaponRadius + targetRadius;
            if (distSq <= collisionDist * collisionDist) {
              isHit = true;
            }
          }

          // Hit Test 2: Melee Circle Sector Hit Zone
          if (!isHit && sector) {
            // d. Vertical check: enemy within 2m vertically of hero
            const dY = Math.abs(target.position.y - attacker.position.y);
            if (dY <= 2.0) {
              // c. Distance test in XZ plane with target body radius included
              const dx = target.position.x - attacker.position.x;
              const dz = target.position.z - attacker.position.z;
              const distXZ = Math.hypot(dx, dz);
              const maxDist = sector.radius + targetRadius;

              if (distXZ <= maxDist) {
                // Personal space contact (<= targetRadius + 0.30m) or angular sector cone
                if (distXZ <= targetRadius + 0.30) {
                  isHit = true;
                } else {
                  // b. Angle centered on facing direction
                  const dirX = dx / distXZ;
                  const dirZ = dz / distXZ;
                  const fwdX = Math.sin(attacker.facingYaw);
                  const fwdZ = Math.cos(attacker.facingYaw);
                  const dot = dirX * fwdX + dirZ * fwdZ;
                  const halfAngleRad = (sector.angleDeg * Math.PI) / 360;
                  const minDot = Math.cos(halfAngleRad);
                  if (dot >= minDot) {
                    isHit = true;
                  }
                }

                if (isHit) {
                  _closestBody.set(target.position.x, target.position.y + targetHeight * 0.5, target.position.z);
                  _closestWeapon.copy(attacker.position);
                }
              }
            }
          }

          if (isHit) {
            // Collision detected! Record hit on this swing
            attacker.hitTargetsThisSwing.add(target.id);
            attacker.hasHitCurrentSwing = true;

            // Compute hit normal
            _hitNormal.subVectors(_closestBody, _closestWeapon);
            if (_hitNormal.lengthSq() > 0.0001) {
              _hitNormal.normalize();
            } else {
              _hitNormal.set(0, 1, 0);
            }

            // Populate reusable hitPayload
            _hitPayload.attacker = attacker;
            _hitPayload.attackerName = attacker.name;
            _hitPayload.attackerPosition.copy(attacker.position);
            _hitPayload.hitPoint.copy(_closestBody);
            _hitPayload.hitNormal.copy(_hitNormal);
            _hitPayload.damage = attacker.baseAttack;
            _hitPayload.poiseDamage = frameData.poiseDamage || 20;
            _hitPayload.attackMoveMult = frameData.moveMult || 1.0;
            _hitPayload.weaponKind = attacker.weapon.kind;
            _hitPayload.weaponGrade = attacker.weapon.grade;

            // Dispatch to target's damage resolver
            target.receiveAttack(_hitPayload);
          }
        }
      }
    }
  }
}

// Module-scoped scratch objects for zero GC
const _visitedChainSet = new Set();

/**
 * Tests a 3D sphere against a combatant's vertical capsule body.
 * @param {THREE.Vector3} spherePos
 * @param {number} sphereRadius
 * @param {Combatant} targetCombatant
 * @param {THREE.Vector3} [outHitPoint]
 * @returns {boolean}
 */
export function testSphereVsCapsule(spherePos, sphereRadius, targetCombatant, outHitPoint = null) {
  if (!targetCombatant || targetCombatant.isDead) return false;
  const rc = targetCombatant.capsuleRadius || 0.35;
  const hc = targetCombatant.capsuleHeight || 1.55;
  const yt = targetCombatant.position.y;
  const y0 = yt + rc;
  const y1 = yt + hc - rc;

  const closestY = Math.max(y0, Math.min(y1, spherePos.y));
  const dx = spherePos.x - targetCombatant.position.x;
  const dy = spherePos.y - closestY;
  const dz = spherePos.z - targetCombatant.position.z;
  const distSq = dx * dx + dy * dy + dz * dz;
  const totalR = sphereRadius + rc;

  if (distSq <= totalR * totalR) {
    if (outHitPoint) {
      outHitPoint.set(targetCombatant.position.x, closestY, targetCombatant.position.z);
    }
    return true;
  }
  return false;
}

/**
 * Tests a vertical cylinder / ground ring against a combatant's vertical capsule.
 * @param {THREE.Vector3|{x: number, z: number}} centerXZ
 * @param {number} cylRadius
 * @param {number} yMin
 * @param {number} yMax
 * @param {Combatant} targetCombatant
 * @returns {boolean}
 */
export function testCylinderVsCapsule(centerXZ, cylRadius, yMin, yMax, targetCombatant) {
  if (!targetCombatant || targetCombatant.isDead) return false;
  const yt = targetCombatant.position.y;
  const hc = targetCombatant.capsuleHeight || 1.55;
  const rc = targetCombatant.capsuleRadius || 0.35;

  const overlapY = (yt + hc >= yMin) && (yt <= yMax);
  if (!overlapY) return false;

  const dx = centerXZ.x - targetCombatant.position.x;
  const dz = centerXZ.z - targetCombatant.position.z;
  const totalR = cylRadius + rc;
  return (dx * dx + dz * dz) <= (totalR * totalR);
}

/**
 * Resolves a bouncing chain ray through enemies.
 * @param {THREE.Vector3} startPos
 * @param {Combatant} initialTarget
 * @param {number} maxJumps
 * @param {number} jumpRadius
 * @param {string} casterTeam
 * @param {Combatant[]} allCombatants
 * @param {Combatant[]} outChainList Pre-allocated array
 * @returns {number} Target count found
 */
export function testRayChain(startPos, initialTarget, maxJumps, jumpRadius, casterTeam, allCombatants, outChainList) {
  _visitedChainSet.clear();
  outChainList.length = 0;

  let current = initialTarget;
  if (!current || current.isDead || current.team === casterTeam || current.team === 'neutral') {
    // Find closest living hostile to startPos
    let closestDistSq = Infinity;
    current = null;
    for (let i = 0; i < allCombatants.length; i++) {
      const c = allCombatants[i];
      if (c.isDead || c.team === casterTeam || c.team === 'neutral') continue;
      const dSq = startPos.distanceToSquared(c.position);
      if (dSq <= 196.0 && dSq < closestDistSq) { // 14m range
        closestDistSq = dSq;
        current = c;
      }
    }
  }

  if (!current) return 0;

  outChainList.push(current);
  _visitedChainSet.add(current.id);

  const jumpRadSq = jumpRadius * jumpRadius;
  for (let j = 0; j < maxJumps; j++) {
    let nextTarget = null;
    let nextDistSq = jumpRadSq;

    for (let i = 0; i < allCombatants.length; i++) {
      const c = allCombatants[i];
      if (c.isDead || c.team === casterTeam || c.team === 'neutral' || _visitedChainSet.has(c.id)) {
        continue;
      }
      const dSq = current.position.distanceToSquared(c.position);
      if (dSq <= nextDistSq) {
        nextDistSq = dSq;
        nextTarget = c;
      }
    }

    if (nextTarget) {
      outChainList.push(nextTarget);
      _visitedChainSet.add(nextTarget.id);
      current = nextTarget;
    } else {
      break;
    }
  }

  return outChainList.length;
}

/**
 * Queries hostile combatants within radius of a 3D point.
 * @param {Combatant} caster
 * @param {THREE.Vector3} center
 * @param {number} radius
 * @param {Combatant[]} allCombatants
 * @param {Combatant[]} outList
 * @returns {Combatant[]}
 */
export function queryHostilesInRadius(caster, center, radius, allCombatants, outList) {
  outList.length = 0;
  for (let i = 0; i < allCombatants.length; i++) {
    const c = allCombatants[i];
    if (c.isDead || c.id === caster.id || c.team === caster.team || c.team === 'neutral') {
      continue;
    }
    const effR = radius + (c.capsuleRadius || 0.35);
    const dx = center.x - c.position.x;
    const dz = center.z - c.position.z;
    if ((dx * dx + dz * dz) <= effR * effR) {
      outList.push(c);
    }
  }
  return outList;
}

/**
 * Queries allied combatants within radius of a 3D point.
 * @param {Combatant} caster
 * @param {THREE.Vector3} center
 * @param {number} radius
 * @param {Combatant[]} allCombatants
 * @param {Combatant[]} outList
 * @param {boolean} [includeCaster=true]
 * @returns {Combatant[]}
 */
export function queryAlliesInRadius(caster, center, radius, allCombatants, outList, includeCaster = true) {
  outList.length = 0;
  for (let i = 0; i < allCombatants.length; i++) {
    const c = allCombatants[i];
    if (c.isDead || c.team !== caster.team) continue;
    if (!includeCaster && c.id === caster.id) continue;
    const effR = radius + (c.capsuleRadius || 0.35);
    const dx = center.x - c.position.x;
    const dz = center.z - c.position.z;
    if ((dx * dx + dz * dz) <= effR * effR) {
      outList.push(c);
    }
  }
  return outList;
}
