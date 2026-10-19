import * as THREE from 'three';

export class ForestProps {
  constructor() {
    this.flickerLights = [];
    this.dustSystems = [];
  }

  // 1. Goblin Camp
  createGoblinCamp(parentGroup, cx, cz, options = {}) {
    const campGroup = new THREE.Group();
    campGroup.position.set(cx, 0, cz);

    // Tent Material
    const tentMat = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.95,
    });
    const tentGeo = new THREE.ConeGeometry(1.5, 2.2, 6);

    // 2-3 crude tents
    const tentOffsets = [
      { x: -3.2, z: -2.0, rot: 0.2 },
      { x: 3.0, z: -1.8, rot: -0.4 },
    ];
    if (options.extraTent) {
      tentOffsets.push({ x: 0.5, z: -3.8, rot: 0.1 });
    }

    for (const t of tentOffsets) {
      const tent = new THREE.Mesh(tentGeo, tentMat);
      tent.position.set(t.x, 1.1, t.z);
      tent.rotation.y = t.rot;
      tent.rotation.z = (Math.random() - 0.5) * 0.1;
      campGroup.add(tent);
    }

    // Campfire Base (stones)
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
    const stoneGeo = new THREE.BoxGeometry(0.35, 0.2, 0.35);
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const st = new THREE.Mesh(stoneGeo, stoneMat);
      st.position.set(Math.cos(angle) * 0.65, 0.1, Math.sin(angle) * 0.65);
      campGroup.add(st);
    }

    // Campfire Flame (emissive cone)
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 6), fireMat);
    flame.position.set(0, 0.45, 0);
    campGroup.add(flame);

    // Flickering PointLight (intensity 10, distance 14)
    if (options.addLight !== false) {
      const fireLight = new THREE.PointLight(0xff6600, 10, 14, 2);
      fireLight.position.set(0, 0.9, 0);
      campGroup.add(fireLight);
      this.flickerLights.push({ light: fireLight, baseIntensity: 10 });
    }

    // Bone Pile (stacked small white boxes)
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.8 });
    const boneGeo = new THREE.BoxGeometry(0.12, 0.38, 0.12);
    const boneGroup = new THREE.Group();
    boneGroup.position.set(1.8, 0, 1.6);
    for (let i = 0; i < 8; i++) {
      const bone = new THREE.Mesh(boneGeo, boneMat);
      bone.position.set((Math.random() - 0.5) * 0.4, 0.08 + Math.random() * 0.15, (Math.random() - 0.5) * 0.4);
      bone.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      boneGroup.add(bone);
    }
    campGroup.add(boneGroup);

    // Skull on a stick
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2715 });
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), woodMat);
    stick.position.set(-2.2, 0.9, 1.5);
    stick.rotation.z = 0.08;
    campGroup.add(stick);

    const skullMat = new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.7 });
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 7), skullMat);
    skull.position.set(-2.25, 1.8, 1.5);
    campGroup.add(skull);

    // Sharpened Wooden Stakes in a ring
    const stakeMat = new THREE.MeshStandardMaterial({ color: 0x5a3d24, roughness: 0.9 });
    const stakeGeo = new THREE.CylinderGeometry(0.04, 0.14, 1.5, 6);
    const stakeCount = 10;
    const stakeRadius = 4.2;
    for (let i = 0; i < stakeCount; i++) {
      const angle = (i / stakeCount) * Math.PI * 2;
      // Leave entrance opening
      if (angle > 0.8 && angle < 1.8) continue;
      const sx = Math.cos(angle) * stakeRadius;
      const sz = Math.sin(angle) * stakeRadius;
      const stake = new THREE.Mesh(stakeGeo, stakeMat);
      stake.position.set(sx, 0.65, sz);
      // Tilt outwards
      stake.rotation.x = Math.sin(angle) * 0.35;
      stake.rotation.z = -Math.cos(angle) * 0.35;
      campGroup.add(stake);
    }

    // Floor 5 boss arena banner pole
    if (options.isBossArena) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.5, 6), woodMat);
      pole.position.set(3.5, 2.25, 2.5);
      const bannerMat = new THREE.MeshStandardMaterial({ color: 0x881122, side: THREE.DoubleSide });
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), bannerMat);
      banner.position.set(4.1, 3.2, 2.5);
      banner.rotation.y = 0.4;
      campGroup.add(pole, banner);
    }

    parentGroup.add(campGroup);
    return campGroup;
  }

  // 2. Broken Stone Walls and Ruined Arches (Floors 3-5)
  createRuins(parentGroup, cx, cz) {
    const ruinsGroup = new THREE.Group();
    ruinsGroup.position.set(cx, 0, cz);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x555855, roughness: 0.95 });

    // Arch pillars + lintel
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.2, 0.8), stoneMat);
    p1.position.set(-1.8, 1.6, 0);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.2, 0.8), stoneMat);
    p2.position.set(1.8, 1.6, 0);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.7, 0.9), stoneMat);
    lintel.position.set(0, 3.4, 0);
    ruinsGroup.add(p1, p2, lintel);

    // Broken wall segments nearby
    const wall1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.6), stoneMat);
    wall1.position.set(-3.2, 0.7, -0.6);
    wall1.rotation.y = 0.3;

    const wall2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.6), stoneMat);
    wall2.position.set(3.0, 0.45, 0.8);
    wall2.rotation.y = -0.4;

    ruinsGroup.add(wall1, wall2);
    parentGroup.add(ruinsGroup);
    return ruinsGroup;
  }

  // 3. Boss Arena Broken Stone Pillars (Floor 5)
  createArenaPillar(parentGroup, cx, cz) {
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x5a5e5a, roughness: 0.9 });
    const height = 3.6 + Math.random() * 1.2;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.25, height, 14),
      pillarMat
    );
    pillar.position.set(cx, height / 2, cz);
    pillar.rotation.y = Math.random() * Math.PI;

    // Small broken top cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 1.4), pillarMat);
    cap.position.set(cx + (Math.random() - 0.5) * 0.3, height + 0.15, cz + (Math.random() - 0.5) * 0.3);
    cap.rotation.set((Math.random() - 0.5) * 0.2, Math.random(), (Math.random() - 0.5) * 0.2);

    const pGroup = new THREE.Group();
    pGroup.position.set(0, 0, 0);
    pGroup.add(pillar, cap);
    parentGroup.add(pGroup);
    return pGroup;
  }

  createDebrisEffect(parentGroup, pos) {
    const debrisGroup = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x5a5e5a });
    const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const count = 10;
    const pieces = [];

    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(
        pos.x + (Math.random() - 0.5) * 1.5,
        1.5 + Math.random() * 2.0,
        pos.z + (Math.random() - 0.5) * 1.5
      );
      debrisGroup.add(m);
      pieces.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 6,
        vy: 2 + Math.random() * 4,
        vz: (Math.random() - 0.5) * 6,
      });
    }

    parentGroup.add(debrisGroup);

    let life = 1.8;
    const interval = setInterval(() => {
      life -= 0.05;
      for (const p of pieces) {
        p.mesh.position.x += p.vx * 0.05;
        p.mesh.position.y += p.vy * 0.05;
        p.mesh.position.z += p.vz * 0.05;
        p.vy -= 15 * 0.05; // gravity
        if (p.mesh.position.y < 0.15) {
          p.mesh.position.y = 0.15;
          p.vx *= 0.7;
          p.vz *= 0.7;
        }
      }
      if (life <= 0) {
        clearInterval(interval);
        parentGroup.remove(debrisGroup);
      }
    }, 50);
  }

  // 4. Glowing Blue Mushroom Cluster
  createMushroomCluster(parentGroup, cx, cz, hasLight = false) {
    const group = new THREE.Group();
    group.position.set(cx, 0, cz);

    const shroomMat = new THREE.MeshStandardMaterial({
      color: 0x00ccff,
      emissive: 0x0088cc,
      emissiveIntensity: 2.2,
      roughness: 0.4,
    });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x224455, roughness: 0.8 });

    const stemGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.4, 6);
    const capGeo = new THREE.SphereGeometry(0.24, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);

    for (let i = 0; i < 5; i++) {
      const ox = (Math.random() - 0.5) * 0.8;
      const oz = (Math.random() - 0.5) * 0.8;
      const s = 0.6 + Math.random() * 0.7;

      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.scale.set(s, s, s);
      stem.position.set(ox, 0.2 * s, oz);

      const cap = new THREE.Mesh(capGeo, shroomMat);
      cap.scale.set(s, s, s);
      cap.position.set(ox, 0.38 * s, oz);

      group.add(stem, cap);
    }

    if (hasLight) {
      const pLight = new THREE.PointLight(0x00ccff, 6, 12, 2);
      pLight.position.set(0, 0.8, 0);
      group.add(pLight);
    }

    parentGroup.add(group);
    return group;
  }

  // 5. Ambush Bush Cluster (3 dark green spheres)
  createBushCluster(parentGroup, cx, cz) {
    const group = new THREE.Group();
    group.position.set(cx, 0, cz);

    const bushMat = new THREE.MeshStandardMaterial({
      color: 0x162c16,
      roughness: 0.9,
    });
    const sphereGeo = new THREE.SphereGeometry(0.75, 7, 7);

    const offsets = [
      { x: -0.4, y: 0.55, z: 0 },
      { x: 0.4, y: 0.5, z: 0.2 },
      { x: 0.0, y: 0.65, z: -0.3 },
    ];

    for (const off of offsets) {
      const b = new THREE.Mesh(sphereGeo, bushMat);
      b.position.set(off.x, off.y, off.z);
      group.add(b);
    }

    parentGroup.add(group);
    return group;
  }

  // 6. Choke Point Trunks & Faint Dust
  createChokePointProps(parentGroup, pos, dir, width = 3.0) {
    // Perpendicular vector across the path
    const perpX = -dir.z;
    const perpZ = dir.x;
    const halfCorridor = width / 2;

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2514, roughness: 0.9 });
    const trunkGeo = new THREE.CylinderGeometry(1.1, 1.35, 6, 10);

    // Left trunk
    const leftTrunk = new THREE.Mesh(trunkGeo, trunkMat);
    leftTrunk.position.set(
      pos.x + perpX * (halfCorridor + 1.2),
      3.0,
      pos.z + perpZ * (halfCorridor + 1.2)
    );
    leftTrunk.rotation.z = (Math.random() - 0.5) * 0.12;

    // Right trunk
    const rightTrunk = new THREE.Mesh(trunkGeo, trunkMat);
    rightTrunk.position.set(
      pos.x - perpX * (halfCorridor + 1.2),
      3.0,
      pos.z - perpZ * (halfCorridor + 1.2)
    );
    rightTrunk.rotation.z = (Math.random() - 0.5) * 0.12;

    parentGroup.add(leftTrunk, rightTrunk);

    // Faint dust particles drifting in the gap (no UI marker)
    const particleCount = 12;
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = pos.x + (Math.random() - 0.5) * width;
      positions[i * 3 + 1] = 0.2 + Math.random() * 1.5;
      positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * width;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x889988,
      size: 0.18,
      transparent: true,
      opacity: 0.25,
      blending: THREE.NormalBlending,
    });
    const dust = new THREE.Points(pGeo, pMat);
    parentGroup.add(dust);
    this.dustSystems.push({ points: dust, positions, origin: pos.clone() });
    return { leftTrunk, rightTrunk };
  }

  update(delta, time) {
    // Flickering campfire lights
    for (const f of this.flickerLights) {
      const noise = Math.sin(time * 12) * 1.5 + Math.cos(time * 23) * 0.8;
      f.light.intensity = f.baseIntensity + noise;
    }

    // Drifting dust particles in choke points
    for (const d of this.dustSystems) {
      const posAttr = d.points.geometry.attributes.position;
      const arr = posAttr.array;
      for (let i = 0; i < arr.length / 3; i++) {
        arr[i * 3 + 1] += delta * 0.15;
        if (arr[i * 3 + 1] > 2.0) {
          arr[i * 3 + 1] = 0.2;
          arr[i * 3 + 0] = d.origin.x + (Math.random() - 0.5) * 2.5;
          arr[i * 3 + 2] = d.origin.z + (Math.random() - 0.5) * 2.5;
        }
      }
      posAttr.needsUpdate = true;
    }
  }

  dispose() {
    this.flickerLights = [];
    this.dustSystems = [];
  }
}
