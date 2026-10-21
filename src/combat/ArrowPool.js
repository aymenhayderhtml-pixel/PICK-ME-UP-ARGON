// src/combat/ArrowPool.js
// High-Performance Ballistic Projectile Engine for Realistic Archery
// Pre-allocated pool of 24 arrow meshes with continuous segment collision,
// dynamic trail slipstreams, headshot crit detection, and target embedding.

import * as THREE from 'three';
import { buildArrowGeometry } from '../art/weapons.js';
import { ARCHERY_CONFIG } from './CombatData.js';

const POOL_SIZE = 24;
const GRAVITY = new THREE.Vector3(0, -9.81, 0);

// Grade velocity tuning table (m/s at full draw)
export const GRADE_ARROW_STATS = {
  E:  { speed: 20.0, drawTime: 0.65, dmgMult: 1.0, pierce: 0 },
  D:  { speed: 22.0, drawTime: 0.60, dmgMult: 1.15, pierce: 0 },
  C:  { speed: 24.0, drawTime: 0.58, dmgMult: 1.30, pierce: 0 },
  B:  { speed: 25.0, drawTime: 0.55, dmgMult: 1.45, pierce: 0 },
  A:  { speed: 28.0, drawTime: 0.50, dmgMult: 1.70, pierce: 0 },
  S:  { speed: 31.0, drawTime: 0.45, dmgMult: 2.00, pierce: 1 },
  'S+': { speed: 34.0, drawTime: 0.40, dmgMult: 2.25, pierce: 1 }
};

export class ArrowPool {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.arrows = [];
    this.group = new THREE.Group();
    this.group.name = 'ArrowPool';
    this.scene.add(this.group);

    this._initPool();
  }

  _initPool() {
    const arrowGeom = buildArrowGeometry('C');

    // Create shared materials
    const shaftMat = new THREE.MeshToonMaterial({
      color: 0x6e503b
    });
    const sMat = new THREE.MeshToonMaterial({
      color: 0xfff0aa,
      emissive: 0xeab308,
      emissiveIntensity: 0.8
    });

    for (let i = 0; i < POOL_SIZE; i++) {
      const mesh = new THREE.Mesh(arrowGeom, shaftMat.clone());
      mesh.visible = false;
      this.group.add(mesh);

      // 6-point slipstream line trail
      const trailPositions = new Float32Array(6 * 3);
      const trailGeom = new THREE.BufferGeometry();
      trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      const trailMat = new THREE.LineBasicMaterial({
        color: 0xeae6df,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending
      });
      const trail = new THREE.Line(trailGeom, trailMat);
      trail.visible = false;
      this.group.add(trail);

      this.arrows.push({
        id: i,
        mesh,
        trail,
        trailPositions,
        active: false,
        stuck: false,
        stuckParent: null,
        stuckLocalPos: new THREE.Vector3(),
        stuckLocalQuat: new THREE.Quaternion(),
        stuckTimer: 0,
        position: new THREE.Vector3(),
        prevPosition: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        spin: 0,
        spinRate: 15.0,
        drawAmount: 0,
        grade: 'C',
        damage: 10,
        pierceRemaining: 0,
        owner: 'player',
        hitEnemies: new Set(),
        trailHistory: []
      });
    }
  }

  /**
   * Spawns an arrow from pool with realistic ballistic trajectory.
   * @param {object} params
   * @returns {object|null} The spawned arrow object or null if pool exhausted
   */
  spawnArrow({
    position,
    direction,
    velocity = null,
    drawAmount = 1.0,
    grade = 'C',
    damage = 10,
    pierce = undefined,
    owner = 'player',
    shooter = null,
    spread = 0.0
  }) {
    const arrow = this.arrows.find(a => !a.active);
    if (!arrow) return null;

    const stats = GRADE_ARROW_STATS[grade] || GRADE_ARROW_STATS.C;
    const baseSpeed = stats.speed;
    const effDraw = Math.max(0.15, Math.min(1.0, drawAmount));
    const launchSpeed = baseSpeed * Math.pow(effDraw, 1.2);

    // Apply dispersion angle if any
    const dirNorm = direction ? direction.clone().normalize() : new THREE.Vector3(0, 0, -1);
    if (spread > 0.001) {
      const spreadAngle = (Math.random() - 0.5) * spread;
      const spreadPitch = (Math.random() - 0.5) * (spread * 0.5);
      const axisY = new THREE.Vector3(0, 1, 0);
      const axisRight = new THREE.Vector3().crossVectors(dirNorm, axisY).normalize();
      dirNorm.applyAxisAngle(axisY, spreadAngle);
      if (axisRight.lengthSq() > 0.01) {
        dirNorm.applyAxisAngle(axisRight, spreadPitch);
      }
    }

    arrow.active = true;
    arrow.stuck = false;
    arrow.stuckParent = null;
    arrow.stuckTimer = 5.0;
    arrow.position.copy(position);
    arrow.prevPosition.copy(position);
    if (velocity && velocity.isVector3) {
      arrow.velocity.copy(velocity);
      if (spread > 0.001) {
        const spreadAngle = (Math.random() - 0.5) * spread;
        const axisY = new THREE.Vector3(0, 1, 0);
        arrow.velocity.applyAxisAngle(axisY, spreadAngle);
      }
    } else {
      arrow.velocity.copy(dirNorm).multiplyScalar(launchSpeed);
    }
    arrow.spin = 0;
    arrow.drawAmount = effDraw;
    arrow.grade = grade;
    arrow.damage = damage * (stats.dmgMult || 1.0);
    arrow.pierceRemaining = pierce !== undefined ? pierce : stats.pierce;
    arrow.owner = owner;
    arrow.shooter = shooter || null;
    arrow.hitEnemies.clear();
    arrow.trailHistory = [position.clone()];

    // Setup visual appearance by grade
    arrow.mesh.material.opacity = 1.0;
    arrow.mesh.material.transparent = false;
    if (grade === 'S' || grade === 'S+') {
      arrow.mesh.material.color.setHex(grade === 'S+' ? 0xfff0aa : 0x7dd3fc);
      arrow.mesh.material.emissive.setHex(grade === 'S+' ? 0xeab308 : 0x0284c7);
      arrow.mesh.material.emissiveIntensity = 0.9;
      arrow.trail.material.color.setHex(grade === 'S+' ? 0xffea75 : 0x38bdf8);
      arrow.trail.material.opacity = 0.85;
    } else {
      arrow.mesh.material.color.setHex(0x6e503b);
      arrow.mesh.material.emissive.setHex(0x000000);
      arrow.mesh.material.emissiveIntensity = 0.0;
      arrow.trail.material.color.setHex(0xeae6df);
      arrow.trail.material.opacity = 0.55;
    }

    arrow.mesh.position.copy(arrow.position);
    arrow.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirNorm);
    arrow.mesh.visible = true;
    arrow.trail.visible = true;

    // Reset trail buffer
    for (let i = 0; i < 6; i++) {
      arrow.trailPositions[i * 3 + 0] = arrow.position.x;
      arrow.trailPositions[i * 3 + 1] = arrow.position.y;
      arrow.trailPositions[i * 3 + 2] = arrow.position.z;
    }
    arrow.trail.geometry.attributes.position.needsUpdate = true;

    return arrow;
  }

  /**
   * Updates flight physics, continuous segment collision, and stuck fade-out.
   * @param {number} dt Delta time
   * @param {object} context { enemies, combatants, dungeon, onHit, onHeadshot }
   */
  update(dt, context = {}) {
    const { enemies = [], combatants = [], dungeon = null, onHit = null, onHeadshot = null } = context;
    const targetList = combatants && combatants.length > 0 ? combatants : enemies;
    const _vUnitZ = new THREE.Vector3(0, 0, 1);
    const _vFlightDir = new THREE.Vector3();
    const _qRoll = new THREE.Quaternion();

    for (let i = 0; i < POOL_SIZE; i++) {
      const a = this.arrows[i];
      if (!a.active) continue;

      if (a.stuck) {
        // Embedded arrow countdown and fade out
        a.stuckTimer -= dt;
        if (a.stuckParent && a.stuckParent.parent) {
          // Follow moving parent (e.g. moving enemy)
          const worldPos = a.stuckLocalPos.clone().applyMatrix4(a.stuckParent.matrixWorld);
          const worldQuat = a.stuckParent.quaternion.clone().multiply(a.stuckLocalQuat);
          a.mesh.position.copy(worldPos);
          a.mesh.quaternion.copy(worldQuat);
        }

        if (a.stuckTimer < 1.0) {
          const alpha = Math.max(0, a.stuckTimer);
          a.mesh.material.transparent = true;
          a.mesh.material.opacity = alpha;
          a.trail.visible = false;
        }

        if (a.stuckTimer <= 0) {
          a.active = false;
          a.stuck = false;
          a.mesh.visible = false;
          a.trail.visible = false;
        }
        continue;
      }

      // In flight: Integrate ballistics
      a.prevPosition.copy(a.position);
      a.velocity.addScaledVector(GRAVITY, dt);
      a.position.addScaledVector(a.velocity, dt);

      _vFlightDir.copy(a.velocity).normalize();
      a.mesh.position.copy(a.position);
      a.mesh.quaternion.setFromUnitVectors(_vUnitZ, _vFlightDir);

      // Axial spin around local flight line
      a.spin += a.spinRate * dt;
      _qRoll.setFromAxisAngle(_vUnitZ, a.spin);
      a.mesh.quaternion.multiply(_qRoll);

      // Update trail history (6-point slipstream)
      a.trailHistory.unshift(a.position.clone());
      if (a.trailHistory.length > 6) a.trailHistory.pop();

      for (let p = 0; p < a.trailHistory.length; p++) {
        const pt = a.trailHistory[p];
        a.trailPositions[p * 3 + 0] = pt.x;
        a.trailPositions[p * 3 + 1] = pt.y;
        a.trailPositions[p * 3 + 2] = pt.z;
      }
      a.trail.geometry.attributes.position.needsUpdate = true;

      // Continuous Segment Collision Check [prevPos -> pos]
      const segVec = new THREE.Vector3().subVectors(a.position, a.prevPosition);
      const segLen = segVec.length();
      const segDir = segVec.clone().normalize();

      let didHit = false;

      // 1. Target Collision Check (Combatants / Enemies)
      for (const target of targetList) {
        if (!target || target.isDead || target.dead || target.isDying || a.hitEnemies.has(target)) continue;

        // Skip shooter and same-team allies
        if (a.shooter && (target === a.shooter || target.id === a.shooter.id)) continue;
        if (a.shooter?.team && target.team && target.team === a.shooter.team) continue;
        if (!a.shooter && a.owner === 'player' && target.team === 'player') continue;

        const ePos = target.position || (target.mesh ? target.mesh.position : target.root?.position);
        if (!ePos) continue;

        const eHeight = target.capsuleHeight ?? (target.isBoss ? 3.2 : 1.8);
        const eRadius = (target.capsuleRadius ?? (target.isBoss ? 1.4 : 0.60)) + 0.12;

        // Closest point on flight segment to target vertical cylinder axis
        const segDx = a.position.x - a.prevPosition.x;
        const segDz = a.position.z - a.prevPosition.z;
        const segLenSqXZ = segDx * segDx + segDz * segDz;
        let tClamped = 0.5;

        if (segLenSqXZ > 0.00001) {
          const toTargetX = ePos.x - a.prevPosition.x;
          const toTargetZ = ePos.z - a.prevPosition.z;
          const tProj = (toTargetX * segDx + toTargetZ * segDz) / segLenSqXZ;
          tClamped = Math.max(0, Math.min(1.0, tProj));
        }

        const closestSegPt = new THREE.Vector3(
          a.prevPosition.x + segDx * tClamped,
          a.prevPosition.y + (a.position.y - a.prevPosition.y) * tClamped,
          a.prevPosition.z + segDz * tClamped
        );

        const dx = closestSegPt.x - ePos.x;
        const dz = closestSegPt.z - ePos.z;
        const horizontalDist = Math.hypot(dx, dz);
        const relY = closestSegPt.y - ePos.y;

        if (horizontalDist <= eRadius && relY >= 0.05 && relY <= eHeight + 0.20) {
          a.hitEnemies.add(target);

          // Headshot Weak-Point Critical Check (Top 26% of target height)
          const isHeadshot = relY >= eHeight * ARCHERY_CONFIG.HEADSHOT_HEIGHT_THRESHOLD;
          const finalDamage = isHeadshot ? a.damage * ARCHERY_CONFIG.HEADSHOT_DAMAGE_MULT : a.damage;
          const hitPoint = closestSegPt.clone();

          let resolveResult = null;
          if (typeof target.receiveAttack === 'function') {
            resolveResult = target.receiveAttack({
              attacker: a.shooter || null,
              attackerName: a.shooter?.name || (a.owner === 'player' ? 'Archer' : 'Enemy Archer'),
              attackerPosition: a.shooter?.position || a.prevPosition.clone(),
              hitPoint: hitPoint,
              damage: Math.round(finalDamage),
              poiseDamage: isHeadshot ? ARCHERY_CONFIG.HEADSHOT_POISE_DAMAGE : ARCHERY_CONFIG.BODY_POISE_DAMAGE,
              weaponGrade: a.grade || 'C',
              weaponKind: 'bow',
              isCritical: isHeadshot,
              attackMoveMult: 1.0,
            });
          } else if (typeof target.takeDamage === 'function') {
            target.takeDamage(finalDamage, isHeadshot, hitPoint);
          }

          if (isHeadshot && onHeadshot) {
            onHeadshot(target, hitPoint, finalDamage, resolveResult);
          } else if (onHit) {
            onHit(target, hitPoint, isHeadshot, finalDamage, resolveResult);
          }

          if (a.pierceRemaining > 0) {
            a.pierceRemaining--;
            // Pierce through, continues flight
          } else {
            // Embed into target
            const parentObj = target.mesh || this.scene;
            this._embedArrow(a, parentObj, hitPoint, _vFlightDir);
            didHit = true;
            break;
          }
        }
      }

      if (didHit) continue;

      // 2. Ground / Floor Collision
      if (a.position.y <= 0.0) {
        // Embed into ground
        const groundHit = a.position.clone();
        groundHit.y = 0.0;
        this._embedArrow(a, this.scene, groundHit, _vFlightDir);
        continue;
      }

      // 3. Wall / Dungeon Collision
      if (dungeon && dungeon.isWalkable && !dungeon.isWalkable(a.position.x, a.position.z)) {
        this._embedArrow(a, this.scene, a.position, _vFlightDir);
        continue;
      }

      // Max flight range cutoff (60m)
      if (a.position.lengthSq() > 3600) {
        a.active = false;
        a.mesh.visible = false;
        a.trail.visible = false;
      }
    }
  }

  _embedArrow(arrow, parentObj, hitPoint, flightDir) {
    arrow.stuck = true;
    arrow.velocity.set(0, 0, 0);
    // Embed 0.12m deep along flight line
    const embeddedPos = hitPoint.clone().addScaledVector(flightDir, 0.12);
    arrow.position.copy(embeddedPos);
    arrow.mesh.position.copy(embeddedPos);
    arrow.trail.visible = false;

    if (parentObj && parentObj !== this.scene) {
      arrow.stuckParent = parentObj;
      arrow.stuckLocalPos.copy(embeddedPos).applyMatrix4(new THREE.Matrix4().copy(parentObj.matrixWorld).invert());
      arrow.stuckLocalQuat.copy(arrow.mesh.quaternion).premultiply(parentObj.quaternion.clone().invert());
    } else {
      arrow.stuckParent = null;
    }
  }

  dispose() {
    for (const a of this.arrows) {
      if (a.mesh.geometry) a.mesh.geometry.dispose();
      if (a.mesh.material) a.mesh.material.dispose();
      if (a.trail.geometry) a.trail.geometry.dispose();
      if (a.trail.material) a.trail.material.dispose();
    }
    this.arrows = [];
    if (this.group.parent) this.group.parent.remove(this.group);
  }
}
