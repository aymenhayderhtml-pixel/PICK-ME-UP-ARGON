// src/combat/SpellVFXPool.js
// Universal Combat Engine Phase 2 - Pre-Allocated Zero-Allocation VFX Pool
// Primitives only: Spheres, Cones, Rings, Cylinders, Lines, Icosahedrons
// Zero heap allocations in simulation loop.

import * as THREE from 'three';

const POOL_PROJECTILES = 48;
const POOL_TELEGRAPHS = 8;
const POOL_BURSTS = 16;
const POOL_LIGHTNING = 8;
const POOL_WARDS = 8;
const POOL_GLOWS = 4;
const POOL_SCORCH = 24;
const POOL_SPARKS = 64;
const POOL_FLAME_WALLS = 4;
const POOL_NOVA_RINGS = 4;
const POOL_MAGIC_CIRCLES = 2;
const POOL_METEORS = 48;
const POOL_BURN_FLAMES = 16;

const _forwardUnitVec = new THREE.Vector3(0, 0, -1);
const _dirNormVec = new THREE.Vector3();

export class SpellVFXPool {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'SpellVFXPool';
    this.scene.add(this.group);

    this.projectiles = [];
    this.telegraphs = [];
    this.bursts = [];
    this.lightningArcs = [];
    this.wardBubbles = [];
    this.staffGlows = [];
    this.scorchMarks = [];
    this.sparks = [];
    this.flameWalls = [];
    this.novaRings = [];
    this.magicCircles = [];
    this.meteors = [];
    this.burnFlames = [];

    // Channeled Inferno Beam single instance
    this.infernoBeamMesh = null;
    this.infernoBeamCore = null;
    this.infernoBeamGroup = null;
    this.activeBeamCaster = null;

    // Screen Shake Hook
    this.onScreenShake = null;

    this._initProjectiles();
    this._initTelegraphs();
    this._initBursts();
    this._initLightning();
    this._initWardBubbles();
    this._initStaffGlows();
    this._initScorchMarks();
    this._initSparks();
    this._initFlameWalls();
    this._initInfernoBeam();
    this._initNovaRings();
    this._initMagicCircles();
    this._initMeteors();
    this._initBurnFlames();
  }

  _initProjectiles() {
    const sphereGeo = new THREE.SphereGeometry(0.32, 10, 8);
    const coneGeo = new THREE.ConeGeometry(0.24, 0.85, 8);
    coneGeo.rotateX(-Math.PI / 2); // Point forward along -Z

    for (let i = 0; i < POOL_PROJECTILES; i++) {
      const group = new THREE.Group();
      group.visible = false;

      const coreMat = new THREE.MeshBasicMaterial({ color: 0xff5511 });
      const coreMesh = new THREE.Mesh(sphereGeo, coreMat);

      const tailMat = new THREE.MeshBasicMaterial({
        color: 0xffaa22,
        transparent: true,
        opacity: 0.85,
      });
      const tailMesh = new THREE.Mesh(coneGeo, tailMat);
      tailMesh.position.z = 0.45;

      group.add(coreMesh, tailMesh);
      this.group.add(group);

      this.projectiles.push({
        id: i,
        group,
        coreMesh,
        tailMesh,
        coreMat,
        tailMat,
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        speed: 24.0,
        radius: 0.28,
        distTraveled: 0,
        maxRange: 18.0,
        pierceCount: 0,
        piercesRemaining: 0,
        caster: null,
        spell: null,
        isMeteorBoulder: false,
        meteorProgress: 0,
        meteorStart: new THREE.Vector3(),
        meteorEnd: new THREE.Vector3(),
        hitCombatantIds: new Set(),
      });
    }
  }

  _initTelegraphs() {
    const ringGeo = new THREE.RingGeometry(0.92, 1.0, 36);
    ringGeo.rotateX(-Math.PI / 2);

    const discGeo = new THREE.CircleGeometry(1.0, 36);
    discGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < POOL_TELEGRAPHS; i++) {
      const group = new THREE.Group();
      group.visible = false;

      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.04;
      ringMesh.renderOrder = 10;

      const fillMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const fillMesh = new THREE.Mesh(discGeo, fillMat);
      fillMesh.position.y = 0.035;
      fillMesh.renderOrder = 9;

      group.add(ringMesh, fillMesh);
      this.group.add(group);

      this.telegraphs.push({
        id: i,
        group,
        ringMesh,
        fillMesh,
        ringMat,
        fillMat,
        active: false,
        position: new THREE.Vector3(),
        radius: 4.0,
        duration: 1.10,
        elapsed: 0.0,
        onDetonate: null,
      });
    }
  }

  _initBursts() {
    const torusGeo = new THREE.TorusGeometry(0.8, 0.14, 8, 24);
    torusGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < POOL_BURSTS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffaa22,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(torusGeo, mat);
      mesh.visible = false;
      mesh.renderOrder = 15;
      this.group.add(mesh);

      this.bursts.push({
        id: i,
        mesh,
        mat,
        active: false,
        position: new THREE.Vector3(),
        elapsed: 0,
        duration: 0.28,
        maxRadius: 2.4,
      });
    }
  }

  _initLightning() {
    for (let i = 0; i < POOL_LIGHTNING; i++) {
      const positions = new Float32Array(7 * 3);
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const mat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      const line = new THREE.Line(geom, mat);
      line.visible = false;
      line.renderOrder = 20;
      this.group.add(line);

      this.lightningArcs.push({
        id: i,
        line,
        geom,
        mat,
        positions,
        active: false,
        elapsed: 0,
        duration: 0.28,
      });
    }
  }

  _initWardBubbles() {
    const bubbleGeo = new THREE.IcosahedronGeometry(1.2, 1);
    const innerGeo = new THREE.SphereGeometry(1.05, 14, 10);

    for (let i = 0; i < POOL_WARDS; i++) {
      const group = new THREE.Group();
      group.visible = false;

      const outerMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
      });
      const outerMesh = new THREE.Mesh(bubbleGeo, outerMat);

      const innerMat = new THREE.MeshBasicMaterial({
        color: 0x0891b2,
        transparent: true,
        opacity: 0.30,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const innerMesh = new THREE.Mesh(innerGeo, innerMat);
      innerMesh.renderOrder = 8;

      group.add(outerMesh, innerMesh);
      this.group.add(group);

      this.wardBubbles.push({
        id: i,
        group,
        mesh: group,
        outerMat,
        innerMat,
        active: false,
        targetCombatant: null,
      });
    }
  }

  _initStaffGlows() {
    const sphereGeo = new THREE.SphereGeometry(0.24, 10, 8);

    for (let i = 0; i < POOL_GLOWS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.90,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.visible = false;
      mesh.renderOrder = 25;
      this.group.add(mesh);

      this.staffGlows.push({
        id: i,
        mesh,
        mat,
        active: false,
        caster: null,
      });
    }
  }

  _initScorchMarks() {
    const circleGeo = new THREE.CircleGeometry(1.0, 24);
    circleGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < POOL_SCORCH; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x181008,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(circleGeo, mat);
      mesh.position.y = 0.02;
      mesh.visible = false;
      mesh.renderOrder = 4;
      this.group.add(mesh);

      this.scorchMarks.push({
        id: i,
        mesh,
        mat,
        active: false,
        elapsed: 0.0,
        duration: 5.0,
      });
    }
  }

  _initSparks() {
    const sparkGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);

    for (let i = 0; i < POOL_SPARKS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffaa22,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(sparkGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);

      this.sparks.push({
        id: i,
        mesh,
        mat,
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        elapsed: 0.0,
        duration: 0.40,
      });
    }
  }

  _initFlameWalls() {
    for (let i = 0; i < POOL_FLAME_WALLS; i++) {
      const wallGroup = new THREE.Group();
      wallGroup.visible = false;

      // 9 procedural flame pillars along 8m width
      const pillars = [];
      const pillarCount = 9;
      const step = 8.0 / (pillarCount - 1);

      for (let p = 0; p < pillarCount; p++) {
        const xOffset = -4.0 + p * step;
        const flameGeo = new THREE.ConeGeometry(0.40, 2.2, 6);
        flameGeo.translate(0, 1.1, 0);

        const flameMat = new THREE.MeshBasicMaterial({
          color: (p % 2 === 0) ? 0xf97316 : 0xfde047,
          transparent: true,
          opacity: 0.85,
        });
        const flameMesh = new THREE.Mesh(flameGeo, flameMat);
        flameMesh.position.set(xOffset, 0, 0);
        wallGroup.add(flameMesh);

        pillars.push({
          mesh: flameMesh,
          mat: flameMat,
          baseScaleY: 1.0 + (p % 3) * 0.2,
          phase: p * 0.7,
        });
      }

      this.group.add(wallGroup);

      this.flameWalls.push({
        id: i,
        group: wallGroup,
        pillars,
        active: false,
        position: new THREE.Vector3(),
        facingYaw: 0,
        elapsed: 0.0,
        duration: 6.0,
        tickTimer: 0.0,
        tickInterval: 0.35,
        caster: null,
        spell: null,
      });
    }
  }

  _initInfernoBeam() {
    this.infernoBeamGroup = new THREE.Group();
    this.infernoBeamGroup.visible = false;

    // Outer flame sheath
    const outerGeo = new THREE.CylinderGeometry(0.35, 0.45, 1.0, 8, 1, true);
    outerGeo.translate(0, 0.5, 0);
    outerGeo.rotateX(Math.PI / 2);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xf97316, // Orange plasma edge
      transparent: true,
      opacity: 0.80,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.infernoBeamMesh = new THREE.Mesh(outerGeo, outerMat);

    // Inner bright white-hot core
    const coreGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.0, 8, 1, true);
    coreGeo.translate(0, 0.5, 0);
    coreGeo.rotateX(Math.PI / 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, // White-hot core
      transparent: true,
      opacity: 0.98,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.infernoBeamCore = new THREE.Mesh(coreGeo, coreMat);

    this.infernoBeamGroup.add(this.infernoBeamMesh, this.infernoBeamCore);
    this.group.add(this.infernoBeamGroup);
  }

  _initNovaRings() {
    const ringGeo = new THREE.RingGeometry(0.9, 1.0, 36);
    ringGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < POOL_NOVA_RINGS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff4411,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.position.y = 0.06;
      mesh.visible = false;
      mesh.renderOrder = 18;
      this.group.add(mesh);

      this.novaRings.push({
        id: i,
        mesh,
        mat,
        active: false,
        pos: new THREE.Vector3(),
        elapsed: 0.0,
        duration: 0.50,
        maxRadius: 6.0,
      });
    }
  }

  _initMagicCircles() {
    for (let i = 0; i < POOL_MAGIC_CIRCLES; i++) {
      const circleGroup = new THREE.Group();
      circleGroup.visible = false;

      // Outer gold ring
      const outerRingGeo = new THREE.RingGeometry(0.95, 1.0, 48);
      outerRingGeo.rotateX(-Math.PI / 2);
      const outerMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const outerRing = new THREE.Mesh(outerRingGeo, outerMat);
      outerRing.position.y = 0.04;

      // Inner red ring
      const innerRingGeo = new THREE.RingGeometry(0.60, 0.64, 36);
      innerRingGeo.rotateX(-Math.PI / 2);
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const innerRing = new THREE.Mesh(innerRingGeo, innerMat);
      innerRing.position.y = 0.045;

      // Star runes (triangles)
      const starGeo = new THREE.RingGeometry(0.20, 0.24, 6);
      starGeo.rotateX(-Math.PI / 2);
      const starMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const starMesh = new THREE.Mesh(starGeo, starMat);
      starMesh.position.y = 0.05;

      circleGroup.add(outerRing, innerRing, starMesh);
      this.group.add(circleGroup);

      this.magicCircles.push({
        id: i,
        group: circleGroup,
        outerRing,
        innerRing,
        starMesh,
        outerMat,
        innerMat,
        starMat,
        active: false,
        pos: new THREE.Vector3(),
        elapsed: 0.0,
        duration: 5.0,
        maxRadius: 10.0,
      });
    }
  }

  _initMeteors() {
    const meteorGeo = new THREE.IcosahedronGeometry(0.85, 1);
    const tailGeo = new THREE.ConeGeometry(0.55, 3.2, 8);
    tailGeo.translate(0, 1.6, 0);
    tailGeo.rotateX(Math.PI);
    const smokeGeo = new THREE.ConeGeometry(0.72, 4.8, 6);
    smokeGeo.translate(0, 2.4, 0);
    smokeGeo.rotateX(Math.PI);

    for (let i = 0; i < POOL_METEORS; i++) {
      const group = new THREE.Group();
      group.visible = false;

      const rockMat = new THREE.MeshBasicMaterial({ color: 0x331100 });
      const rockMesh = new THREE.Mesh(meteorGeo, rockMat);

      const flameMat = new THREE.MeshBasicMaterial({
        color: 0xff5511,
        transparent: true,
        opacity: 0.85,
      });
      const flameMesh = new THREE.Mesh(tailGeo, flameMat);

      const smokeMat = new THREE.MeshBasicMaterial({
        color: 0x27272a,
        transparent: true,
        opacity: 0.60,
      });
      const smokeMesh = new THREE.Mesh(smokeGeo, smokeMat);
      smokeMesh.position.z = 0.5;

      group.add(rockMesh, flameMesh, smokeMesh);
      this.group.add(group);

      this.meteors.push({
        id: i,
        group,
        rockMesh,
        flameMesh,
        active: false,
        targetPos: new THREE.Vector3(),
        startPos: new THREE.Vector3(),
        currentPos: new THREE.Vector3(),
        progress: 0.0,
        speed: 28.0,
        duration: 0.75,
        blastRadius: 2.5,
        onImpact: null,
      });
    }
  }

  _initBurnFlames() {
    const coneGeo = new THREE.ConeGeometry(0.18, 0.55, 5);
    coneGeo.translate(0, 0.28, 0);

    for (let i = 0; i < POOL_BURN_FLAMES; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff6611,
        transparent: true,
        opacity: 0.85,
      });
      const mesh = new THREE.Mesh(coneGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);

      this.burnFlames.push({
        id: i,
        mesh,
        mat,
        active: false,
        combatant: null,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Allocation-free Spawn Methods
  // ---------------------------------------------------------------------------

  spawnProjectile({ from, dir, speed, range, radius, spell, caster }) {
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      if (!p.active) {
        p.active = true;
        p.group.visible = true;
        p.position.copy(from);
        p.group.position.copy(from);
        p.velocity.copy(dir).normalize().multiplyScalar(speed);
        p.speed = speed;
        p.maxRange = range;
        p.distTraveled = 0;
        p.radius = radius;
        p.spell = spell;
        p.caster = caster;
        p.pierceCount = spell.pierceCount || 0;
        p.piercesRemaining = p.pierceCount;
        p.hitCombatantIds.clear();

        p.coreMat.color.setHex(spell.colorPrimary || 0xff5511);
        p.tailMat.color.setHex(spell.colorSecondary || 0xffaa22);

        // Distinct projectile profiles: dart volley is thin, fireball is large, ember is snappy
        if (spell.id === 'fireDartVolley') {
          p.group.scale.set(radius * 1.6, radius * 1.6, radius * 6.5);
        } else if (spell.id === 'fireball') {
          p.group.scale.setScalar(radius * 4.4);
        } else {
          p.group.scale.setScalar(radius * 3.0);
        }

        _dirNormVec.copy(dir).normalize();
        p.group.quaternion.setFromUnitVectors(_forwardUnitVec, _dirNormVec);
        return p;
      }
    }
    return null;
  }

  spawnBurst(position, maxRadius = 1.8, color = 0xffaa22) {
    for (let i = 0; i < this.bursts.length; i++) {
      const b = this.bursts[i];
      if (!b.active) {
        b.active = true;
        b.mesh.visible = true;
        b.position.copy(position);
        b.mesh.position.set(position.x, 0.04, position.z);
        b.elapsed = 0.0;
        b.maxRadius = maxRadius;
        b.mat.color.setHex(color);
        b.mat.opacity = 0.95;
        b.mesh.scale.setScalar(0.2);
        return b;
      }
    }
    return null;
  }

  spawnLightningArc(startPos, endPos, color = 0x38bdf8) {
    for (let i = 0; i < this.lightningArcs.length; i++) {
      const a = this.lightningArcs[i];
      if (!a.active) {
        a.active = true;
        a.line.visible = true;
        a.elapsed = 0.0;
        a.duration = 0.28;
        a.mat.color.setHex(color);
        a.mat.opacity = 0.95;

        const count = 7;
        const dx = (endPos.x - startPos.x) / (count - 1);
        const dy = (endPos.y - startPos.y) / (count - 1);
        const dz = (endPos.z - startPos.z) / (count - 1);

        for (let j = 0; j < count; j++) {
          const idx = j * 3;
          if (j === 0) {
            a.positions[idx] = startPos.x;
            a.positions[idx + 1] = startPos.y;
            a.positions[idx + 2] = startPos.z;
          } else if (j === count - 1) {
            a.positions[idx] = endPos.x;
            a.positions[idx + 1] = endPos.y;
            a.positions[idx + 2] = endPos.z;
          } else {
            const jitter = (Math.random() - 0.5) * 0.45;
            a.positions[idx] = startPos.x + dx * j + jitter;
            a.positions[idx + 1] = startPos.y + dy * j + Math.abs(jitter);
            a.positions[idx + 2] = startPos.z + dz * j + jitter;
          }
        }
        a.geom.attributes.position.needsUpdate = true;
        return a;
      }
    }
    return null;
  }

  spawnScorchMark(pos, radius = 1.5, duration = 6.0) {
    for (let i = 0; i < this.scorchMarks.length; i++) {
      const s = this.scorchMarks[i];
      if (!s.active) {
        s.active = true;
        s.mesh.visible = true;
        s.mesh.position.set(pos.x, 0.02, pos.z);
        s.mesh.scale.setScalar(radius);
        s.elapsed = 0.0;
        s.duration = duration;
        s.mat.opacity = 0.85;
        return s;
      }
    }
    return null;
  }

  spawnSparks(pos, count = 8, color = 0xffaa22) {
    let spawned = 0;
    for (let i = 0; i < this.sparks.length && spawned < count; i++) {
      const sp = this.sparks[i];
      if (!sp.active) {
        sp.active = true;
        sp.mesh.visible = true;
        sp.pos.set(pos.x, Math.max(0.2, pos.y), pos.z);
        sp.mesh.position.copy(sp.pos);
        const theta = Math.random() * Math.PI * 2;
        const speed = 2.5 + Math.random() * 4.0;
        sp.vel.set(
          Math.cos(theta) * speed,
          2.0 + Math.random() * 3.5,
          Math.sin(theta) * speed
        );
        sp.elapsed = 0.0;
        sp.duration = 0.35 + Math.random() * 0.25;
        sp.mat.color.setHex(color);
        sp.mat.opacity = 1.0;
        spawned++;
      }
    }
  }

  spawnFlameWall({ origin, facingYaw, width = 8.0, duration = 6.0, caster = null, spell = null }) {
    for (let i = 0; i < this.flameWalls.length; i++) {
      const fw = this.flameWalls[i];
      if (!fw.active) {
        fw.active = true;
        fw.group.visible = true;
        fw.position.copy(origin);
        fw.group.position.set(origin.x, 0, origin.z);
        fw.facingYaw = facingYaw;
        fw.group.rotation.y = facingYaw;
        fw.elapsed = 0.0;
        fw.duration = duration;
        fw.tickTimer = 0.0;
        fw.caster = caster;
        fw.spell = spell;
        return fw;
      }
    }
    return null;
  }

  startInfernoBeam(caster, targetPos) {
    this.activeBeamCaster = caster;
    this.infernoBeamGroup.visible = true;
    this.updateInfernoBeam(caster, targetPos);
  }

  updateInfernoBeam(caster, targetPos) {
    if (!this.infernoBeamGroup.visible) return;
    const from = new THREE.Vector3();
    if (caster.rig && typeof caster.rig.getWeaponTipWorldPosition === 'function') {
      caster.rig.getWeaponTipWorldPosition(from);
    } else {
      from.set(caster.position.x, caster.position.y + 1.2, caster.position.z);
    }

    const to = targetPos.clone();
    to.y = Math.max(0.4, to.y);

    const dir = new THREE.Vector3().subVectors(to, from);
    const dist = Math.min(16.0, dir.length());
    dir.normalize();

    this.infernoBeamGroup.position.copy(from);
    this.infernoBeamGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    this.infernoBeamMesh.scale.set(1.0, 1.0, dist);
    this.infernoBeamCore.scale.set(1.0, 1.0, dist);
  }

  stopInfernoBeam(caster) {
    if (this.activeBeamCaster === caster || !caster) {
      this.infernoBeamGroup.visible = false;
      this.activeBeamCaster = null;
    }
  }

  spawnNovaRing(pos, maxRadius = 6.0, duration = 0.50) {
    for (let i = 0; i < this.novaRings.length; i++) {
      const nr = this.novaRings[i];
      if (!nr.active) {
        nr.active = true;
        nr.mesh.visible = true;
        nr.pos.copy(pos);
        nr.mesh.position.set(pos.x, 0.06, pos.z);
        nr.elapsed = 0.0;
        nr.duration = duration;
        nr.maxRadius = maxRadius;
        nr.mesh.scale.setScalar(0.2);
        nr.mat.opacity = 0.95;
        return nr;
      }
    }
    return null;
  }

  spawnMagicCircle(pos, maxRadius = 10.0, duration = 5.0) {
    for (let i = 0; i < this.magicCircles.length; i++) {
      const mc = this.magicCircles[i];
      if (!mc.active) {
        mc.active = true;
        mc.group.visible = true;
        mc.pos.copy(pos);
        mc.group.position.set(pos.x, 0, pos.z);
        mc.elapsed = 0.0;
        mc.duration = duration;
        mc.maxRadius = maxRadius;
        mc.group.scale.setScalar(0.1);
        return mc;
      }
    }
    return null;
  }

  removeMagicCircle() {
    for (const mc of this.magicCircles) {
      mc.active = false;
      mc.group.visible = false;
    }
  }

  hideMagicCircle() {
    this.removeMagicCircle();
  }

  spawnMeteor({ targetPos, delay = 0, blastRadius = 2.5, onImpact = null }) {
    for (let i = 0; i < this.meteors.length; i++) {
      const m = this.meteors[i];
      if (!m.active) {
        m.active = true;
        m.group.visible = false;
        m.targetPos.copy(targetPos);
        // Fall from high diagonal
        m.startPos.set(targetPos.x - 3.5, 16.0, targetPos.z - 2.5);
        m.currentPos.copy(m.startPos);
        m.group.position.copy(m.startPos);
        m.progress = -delay;
        m.duration = 0.65;
        m.blastRadius = blastRadius;
        m.onImpact = onImpact;
        return m;
      }
    }
    return null;
  }

  attachStaffGlow(caster) {
    for (let i = 0; i < this.staffGlows.length; i++) {
      const g = this.staffGlows[i];
      if (g.active && g.caster === caster) return g;
    }
    for (let i = 0; i < this.staffGlows.length; i++) {
      const g = this.staffGlows[i];
      if (!g.active) {
        g.active = true;
        g.mesh.visible = true;
        g.caster = caster;
        return g;
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Per-Frame Update Loop
  // ---------------------------------------------------------------------------
  update(worldDt) {
    // 1. Bursts
    for (let i = 0; i < this.bursts.length; i++) {
      const b = this.bursts[i];
      if (!b.active) continue;
      b.elapsed += worldDt;
      const progress = Math.min(1.0, b.elapsed / b.duration);
      const currentR = 0.2 + (b.maxRadius - 0.2) * progress;
      b.mesh.scale.setScalar(currentR);
      b.mat.opacity = 0.95 * (1.0 - progress);

      if (progress >= 1.0) {
        b.active = false;
        b.mesh.visible = false;
      }
    }

    // 1b. Lightning Arcs
    for (let i = 0; i < this.lightningArcs.length; i++) {
      const a = this.lightningArcs[i];
      if (!a.active) continue;
      a.elapsed += worldDt;
      const progress = a.elapsed / a.duration;
      a.mat.opacity = Math.max(0, 0.95 * (1.0 - progress));
      if (progress >= 1.0) {
        a.active = false;
        a.line.visible = false;
      }
    }

    // 2. Scorch Marks (fading ground decals)
    for (let i = 0; i < this.scorchMarks.length; i++) {
      const s = this.scorchMarks[i];
      if (!s.active) continue;
      s.elapsed += worldDt;
      const p = s.elapsed / s.duration;
      s.mat.opacity = Math.max(0, 0.85 * (1.0 - p));
      if (p >= 1.0) {
        s.active = false;
        s.mesh.visible = false;
      }
    }

    // 3. Sparks physics
    for (let i = 0; i < this.sparks.length; i++) {
      const sp = this.sparks[i];
      if (!sp.active) continue;
      sp.elapsed += worldDt;
      sp.vel.y -= 12.0 * worldDt; // Gravity
      sp.pos.addScaledVector(sp.vel, worldDt);
      sp.mesh.position.copy(sp.pos);
      const p = sp.elapsed / sp.duration;
      sp.mat.opacity = Math.max(0, 1.0 - p);
      if (sp.pos.y <= 0.02 || p >= 1.0) {
        sp.active = false;
        sp.mesh.visible = false;
      }
    }

    // 4. Flame Walls
    for (let i = 0; i < this.flameWalls.length; i++) {
      const fw = this.flameWalls[i];
      if (!fw.active) continue;
      fw.elapsed += worldDt;
      const p = fw.elapsed / fw.duration;

      // Animate flickering flame pillars
      for (const pillar of fw.pillars) {
        const flicker = Math.sin(fw.elapsed * 12.0 + pillar.phase);
        pillar.mesh.scale.y = Math.max(0.4, pillar.baseScaleY + flicker * 0.25);
        pillar.mesh.rotation.y += worldDt * 3.0;
        pillar.mat.opacity = 0.85 * (1.0 - Math.max(0, (p - 0.75) / 0.25));
      }

      if (p >= 1.0) {
        fw.active = false;
        fw.group.visible = false;
      }
    }

    // 5. Nova Rings
    for (let i = 0; i < this.novaRings.length; i++) {
      const nr = this.novaRings[i];
      if (!nr.active) continue;
      nr.elapsed += worldDt;
      const p = Math.min(1.0, nr.elapsed / nr.duration);
      const r = Math.max(0.2, nr.maxRadius * p);
      nr.mesh.scale.setScalar(r);
      nr.mat.opacity = 0.95 * (1.0 - p);
      if (p >= 1.0) {
        nr.active = false;
        nr.mesh.visible = false;
      }
    }

    // 6. Magic Circles (grows during 5s ultimate cast)
    for (let i = 0; i < this.magicCircles.length; i++) {
      const mc = this.magicCircles[i];
      if (!mc.active) continue;
      mc.elapsed += worldDt;
      const p = Math.min(1.0, mc.elapsed / mc.duration);
      const r = Math.max(0.1, mc.maxRadius * p);
      mc.group.scale.setScalar(r);

      // Spin rings in opposing directions
      mc.outerRing.rotation.z += worldDt * 0.6;
      mc.innerRing.rotation.z -= worldDt * 1.2;
      mc.starMesh.rotation.z += worldDt * 2.0;

      if (p >= 1.0) {
        mc.active = false;
        mc.group.visible = false;
      }
    }

    // 7. Meteors (falling diagonally into ground)
    for (let i = 0; i < this.meteors.length; i++) {
      const m = this.meteors[i];
      if (!m.active) continue;
      m.progress += worldDt;
      if (m.progress < 0) continue; // Waiting for delay

      m.group.visible = true;
      const t = Math.min(1.0, m.progress / m.duration);
      m.currentPos.lerpVectors(m.startPos, m.targetPos, t);
      m.group.position.copy(m.currentPos);
      m.rockMesh.rotation.x += worldDt * 8.0;
      m.rockMesh.rotation.y += worldDt * 10.0;

      if (t >= 1.0) {
        m.active = false;
        m.group.visible = false;
        this.spawnBurst(m.targetPos, m.blastRadius, 0xff3b11);
        this.spawnScorchMark(m.targetPos, m.blastRadius * 0.9, 6.0);
        this.spawnSparks(m.targetPos, 12, 0xffdd44);
        if (m.onImpact) {
          m.onImpact(m.targetPos);
        }
      }
    }

    // 8. Channeled Inferno Beam Flickering
    if (this.infernoBeamGroup.visible) {
      const flicker = 1.0 + Math.sin(Date.now() * 0.03) * 0.12;
      this.infernoBeamMesh.scale.x = flicker;
      this.infernoBeamMesh.scale.y = flicker;
    }
  }

  clear() {
    for (const p of this.projectiles) {
      p.active = false;
      p.group.visible = false;
    }
    for (const b of this.bursts) {
      b.active = false;
      b.mesh.visible = false;
    }
    for (const s of this.scorchMarks) {
      s.active = false;
      s.mesh.visible = false;
    }
    for (const sp of this.sparks) {
      sp.active = false;
      sp.mesh.visible = false;
    }
    for (const fw of this.flameWalls) {
      fw.active = false;
      fw.group.visible = false;
    }
    for (const nr of this.novaRings) {
      nr.active = false;
      nr.mesh.visible = false;
    }
    for (const mc of this.magicCircles) {
      mc.active = false;
      mc.group.visible = false;
    }
    for (const m of this.meteors) {
      m.active = false;
      m.group.visible = false;
    }
    if (this.infernoBeamGroup) {
      this.infernoBeamGroup.visible = false;
    }
    this.activeBeamCaster = null;
  }
}
