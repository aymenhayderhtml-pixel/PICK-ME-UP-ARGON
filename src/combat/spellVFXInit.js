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

export const spellVFXInitMethods = {
  _initProjectiles() {
    const sphereGeo = new THREE.SphereGeometry(0.32, 10, 8);
    const coneGeo = new THREE.ConeGeometry(0.24, 0.85, 8);
    coneGeo.rotateX(-Math.PI / 2);

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
  },

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
  },

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
  },

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
  },

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
  },

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
  },

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
  },

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
  },

  _initFlameWalls() {
    for (let i = 0; i < POOL_FLAME_WALLS; i++) {
      const wallGroup = new THREE.Group();
      wallGroup.visible = false;

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
  },

  _initInfernoBeam() {
    this.infernoBeamGroup = new THREE.Group();
    this.infernoBeamGroup.visible = false;

    const outerGeo = new THREE.CylinderGeometry(0.35, 0.45, 1.0, 8, 1, true);
    outerGeo.translate(0, 0.5, 0);
    outerGeo.rotateX(Math.PI / 2);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.80,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.infernoBeamMesh = new THREE.Mesh(outerGeo, outerMat);

    const coreGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.0, 8, 1, true);
    coreGeo.translate(0, 0.5, 0);
    coreGeo.rotateX(Math.PI / 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.98,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.infernoBeamCore = new THREE.Mesh(coreGeo, coreMat);

    this.infernoBeamGroup.add(this.infernoBeamMesh, this.infernoBeamCore);
    this.group.add(this.infernoBeamGroup);
  },

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
  },

  _initMagicCircles() {
    for (let i = 0; i < POOL_MAGIC_CIRCLES; i++) {
      const circleGroup = new THREE.Group();
      circleGroup.visible = false;

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
  },

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
  },

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
  },
};