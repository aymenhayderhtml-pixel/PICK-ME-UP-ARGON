# ARGON REPORT — ARMORED GOBLIN (FLOOR 3)

## 1. Tech Stack & Unit Scale

- **Three.js**: 0.160.0 (`package.json` dependency `"three": "^0.160.0"`).
- **Vite**: 8.3.0 (`devDependencies` `"vite": "^8.3.0"`). Dev server command `vite`; `base: './'`.
- **Runtime**: Node `^20.19.0 || >=22.12.0`, project `"type": "module"` (ES modules).
- **Import style**: `import * as THREE from 'three';` (namespace import). `index.html` uses an importmap mapping `"three"` -> `./node_modules/three/build/three.module.js` and `BufferGeometryUtils`.
- **Unit scale**: 1 world unit = 1 meter. Player height sanity check in `TowerScene.logScaleCheck()` expects hero ~1.75 units. Y is up (Three.js default). Forward direction is +Z: `Player.moveInDirection` sets `this.mesh.rotation.y = Math.atan2(dirX, dirZ)`, so rotation.y = 0 faces +Z.

## 2. The Armored Goblin Builder

- **File**: `src/art/enemies.js`
- **Builder function**: `createGnollWarriorModel(seed = 1, opts = {})`
- **Supporting helpers**: `getGnollMaterials()`, `getGnollGeometries()` (cached singletons).
- **Routing**: `createEnemyModel(type, opts)` in the same file maps `'goblin_armored' | 'armored_goblin' | 'gnoll' | 'gnoll_warrior'` to `createGnollWarriorModel(opts.seed ?? 1, opts)`.

Full code of the builder block (materials + geometries + mesh hierarchy) follows.

```js
// src/art/enemies.js  (Floor 3 Gnoll / Beastman Warrior block)

let _gnollMaterials = null;
let _gnollGeometries = null;

function getGnollMaterials() {
  if (_gnollMaterials) return _gnollMaterials;

  _gnollMaterials = {
    beastSkin: new THREE.MeshToonMaterial({ color: 0x5a6332, gradientMap: getGradientMap() }),
    beastSkinDark: new THREE.MeshToonMaterial({ color: 0x3f4722, gradientMap: getGradientMap() }),
    muzzleDark: new THREE.MeshToonMaterial({ color: 0x383e20, gradientMap: getGradientMap() }),
    noseBlack: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.35, metalness: 0.1 }),
    tuskIvory: new THREE.MeshStandardMaterial({ color: 0xf5f0e1, roughness: 0.3, metalness: 0.05 }),
    eyeCrimson: new THREE.MeshBasicMaterial({ color: 0xff2211 }),
    maneDark: new THREE.MeshToonMaterial({ color: 0x1f1713, gradientMap: getGradientMap() }),
    furTrim: new THREE.MeshToonMaterial({ color: 0xd8d2c5, gradientMap: getGradientMap() }),
    leatherHarness: new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.85, metalness: 0.05 }),
    pauldronDome: new THREE.MeshStandardMaterial({ color: 0x4c545c, roughness: 0.42, metalness: 0.78 }),
    steelBright: new THREE.MeshStandardMaterial({ color: 0xcfd6de, roughness: 0.28, metalness: 0.88 }),
    ironCrude: new THREE.MeshStandardMaterial({ color: 0x33383e, roughness: 0.55, metalness: 0.72 }),
    woodHaft: new THREE.MeshStandardMaterial({ color: 0x4d321e, roughness: 0.88, metalness: 0.0 }),
  };

  return _gnollMaterials;
}

function getGnollGeometries() {
  if (_gnollGeometries) return _gnollGeometries;

  const chestGeo = new THREE.CylinderGeometry(0.28, 0.18, 0.32, 8);
  chestGeo.scale(1.0, 1.0, 0.72);

  const spineGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.18, 8);
  spineGeo.scale(1.0, 1.0, 0.68);

  const hipsGeo = new THREE.CylinderGeometry(0.16, 0.15, 0.15, 8);
  hipsGeo.scale(1.0, 1.0, 0.72);

  const neckGeo = new THREE.CylinderGeometry(0.105, 0.135, 0.16, 7);

  const craniumGeo = new THREE.DodecahedronGeometry(0.155, 1);
  craniumGeo.scale(0.95, 0.88, 1.12);

  const upperSnoutGeo = new THREE.BoxGeometry(0.135, 0.095, 0.22);
  const lowerJawGeo = new THREE.BoxGeometry(0.125, 0.055, 0.19);
  const noseGeo = new THREE.BoxGeometry(0.065, 0.045, 0.045);

  const tuskGeo = new THREE.ConeGeometry(0.022, 0.095, 5);
  const fangGeo = new THREE.ConeGeometry(0.015, 0.05, 5);

  const earGeo = new THREE.ConeGeometry(0.055, 0.18, 5);
  earGeo.scale(0.65, 1.0, 1.0);
  const earTuftGeo = new THREE.ConeGeometry(0.035, 0.09, 4);

  const eyeGeo = new THREE.SphereGeometry(0.026, 6, 6);
  eyeGeo.scale(1.3, 0.65, 0.8);
  const browGeo = new THREE.BoxGeometry(0.09, 0.03, 0.06);

  const maneSpikeGeo = new THREE.ConeGeometry(0.055, 0.18, 5);
  maneSpikeGeo.scale(0.65, 1.0, 1.25);

  const pauldronDomeGeo = new THREE.SphereGeometry(0.155, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const pauldronRimGeo = new THREE.TorusGeometry(0.148, 0.018, 6, 12);
  pauldronRimGeo.rotateX(Math.PI / 2);
  const pauldronSpikeGeo = new THREE.ConeGeometry(0.028, 0.115, 5);

  const strapFrontGeo = new THREE.BoxGeometry(0.062, 0.42, 0.035);
  const buckleRingGeo = new THREE.TorusGeometry(0.052, 0.015, 6, 12);
  const buckleStudGeo = new THREE.SphereGeometry(0.018, 5, 5);

  const upperArmGeo = new THREE.CylinderGeometry(0.075, 0.062, 0.24, 7);
  upperArmGeo.translate(0, -0.11, 0);

  const foreArmGeo = new THREE.CylinderGeometry(0.068, 0.052, 0.23, 7);
  foreArmGeo.translate(0, -0.11, 0);

  const bracerGeo = new THREE.CylinderGeometry(0.074, 0.062, 0.12, 7);
  bracerGeo.translate(0, -0.14, 0);

  const wristFurGeo = new THREE.TorusGeometry(0.068, 0.028, 6, 9);
  wristFurGeo.rotateX(Math.PI / 2);

  const handGeo = new THREE.BoxGeometry(0.075, 0.085, 0.075);
  handGeo.translate(0, -0.04, 0);

  const thighGeo = new THREE.CylinderGeometry(0.095, 0.072, 0.26, 7);
  thighGeo.translate(0, -0.13, 0);

  const shinGeo = new THREE.CylinderGeometry(0.072, 0.055, 0.25, 7);
  shinGeo.translate(0, -0.125, 0);

  const ankleFurGeo = new THREE.TorusGeometry(0.065, 0.028, 6, 9);
  ankleFurGeo.rotateX(Math.PI / 2);

  const footGeo = new THREE.BoxGeometry(0.095, 0.06, 0.16);
  footGeo.translate(0, -0.03, 0.04);

  const axeHaftGeo = new THREE.CylinderGeometry(0.022, 0.026, 0.78, 7);
  const axeGripWrapGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.26, 7);
  const axeSocketCollarGeo = new THREE.BoxGeometry(0.075, 0.14, 0.09);

  const bladeBodyGeo = new THREE.ConeGeometry(0.22, 0.28, 4);
  bladeBodyGeo.rotateZ(-Math.PI / 2);
  bladeBodyGeo.scale(1.0, 0.95, 0.18);

  const bladeEdgeGeo = new THREE.BoxGeometry(0.035, 0.34, 0.018);
  const backSpikeGeo = new THREE.ConeGeometry(0.038, 0.14, 4);
  backSpikeGeo.rotateZ(Math.PI / 2);

  _gnollGeometries = {
    chestGeo, spineGeo, hipsGeo, neckGeo, craniumGeo, upperSnoutGeo, lowerJawGeo, noseGeo,
    tuskGeo, fangGeo, earGeo, earTuftGeo, eyeGeo, browGeo, maneSpikeGeo, pauldronDomeGeo,
    pauldronRimGeo, pauldronSpikeGeo, strapFrontGeo, buckleRingGeo, buckleStudGeo, upperArmGeo,
    foreArmGeo, bracerGeo, wristFurGeo, handGeo, thighGeo, shinGeo, ankleFurGeo, footGeo,
    axeHaftGeo, axeGripWrapGeo, axeSocketCollarGeo, bladeBodyGeo, bladeEdgeGeo, backSpikeGeo,
  };

  return _gnollGeometries;
}

export function createGnollWarriorModel(seed = 1, opts = {}) {
  const mats = getGnollMaterials();
  const geos = getGnollGeometries();

  const variation = ((seed * 9301 + 49297) % 233280) / 233280;
  const scaleVar = (opts.seed !== undefined ? 0.94 + variation * 0.12 : 1.0) * 1.12;

  const root = new THREE.Group();
  root.name = 'enemy_goblin_armored';
  root.scale.setScalar(scaleVar);

  const hips = new THREE.Group();
  hips.name = 'hips';
  hips.position.set(0, 0.54, 0);
  root.add(hips);

  const spine = new THREE.Group();
  spine.name = 'spine';
  spine.position.set(0, 0.08, 0);
  spine.rotation.x = 0.25;
  hips.add(spine);

  const chest = new THREE.Group();
  chest.name = 'chest';
  chest.position.set(0, 0.16, 0);
  chest.rotation.x = 0.30;
  spine.add(chest);

  const neck = new THREE.Group();
  neck.name = 'neck';
  neck.position.set(0, 0.18, 0.04);
  neck.rotation.x = -0.36;
  chest.add(neck);

  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.11, 0.04);
  head.rotation.x = -0.14;
  neck.add(head);

  const meshes = [];

  // Torso / Hips meshes
  const hipsMesh = new THREE.Mesh(geos.hipsGeo, mats.leatherHarness);
  hips.add(hipsMesh); meshes.push(hipsMesh);

  const beltBuckle = new THREE.Mesh(geos.buckleRingGeo, mats.ironCrude);
  beltBuckle.position.set(0, 0.01, 0.115);
  beltBuckle.scale.setScalar(0.75);
  hips.add(beltBuckle); meshes.push(beltBuckle);

  const spineMesh = new THREE.Mesh(geos.spineGeo, mats.beastSkinDark);
  spine.add(spineMesh); meshes.push(spineMesh);

  const chestMesh = new THREE.Mesh(geos.chestGeo, mats.beastSkin);
  chestMesh.position.set(0, 0.04, 0);
  chestMesh.castShadow = true;
  chest.add(chestMesh); meshes.push(chestMesh);

  // Crossed Leather Harness
  const harnessGroup = new THREE.Group();
  harnessGroup.name = 'chest_harness';
  chest.add(harnessGroup);

  const strapFL = new THREE.Mesh(geos.strapFrontGeo, mats.leatherHarness);
  strapFL.position.set(0, 0.05, 0.165); strapFL.rotation.set(-0.14, 0, 0.62);
  harnessGroup.add(strapFL); meshes.push(strapFL);

  const strapFR = new THREE.Mesh(geos.strapFrontGeo, mats.leatherHarness);
  strapFR.position.set(0, 0.05, 0.165); strapFR.rotation.set(-0.14, 0, -0.62);
  harnessGroup.add(strapFR); meshes.push(strapFR);

  const strapBL = new THREE.Mesh(geos.strapFrontGeo, mats.leatherHarness);
  strapBL.position.set(0, 0.05, -0.165); strapBL.rotation.set(0.14, 0, 0.62);
  harnessGroup.add(strapBL); meshes.push(strapBL);

  const strapBR = new THREE.Mesh(geos.strapFrontGeo, mats.leatherHarness);
  strapBR.position.set(0, 0.05, -0.165); strapBR.rotation.set(0.14, 0, -0.62);
  harnessGroup.add(strapBR); meshes.push(strapBR);

  const centerBuckle = new THREE.Mesh(geos.buckleRingGeo, mats.steelBright);
  centerBuckle.position.set(0, 0.055, 0.185);
  harnessGroup.add(centerBuckle); meshes.push(centerBuckle);

  for (let r = 0; r < 4; r++) {
    const a = (r * Math.PI) / 2 + Math.PI / 4;
    const stud = new THREE.Mesh(geos.buckleStudGeo, mats.steelBright);
    stud.position.set(Math.cos(a) * 0.052, 0.055 + Math.sin(a) * 0.052, 0.192);
    harnessGroup.add(stud); meshes.push(stud);
  }

  // Head, Snout, Tusks, Glowing Red Eyes & Ears
  const neckMesh = new THREE.Mesh(geos.neckGeo, mats.beastSkinDark);
  neckMesh.position.set(0, 0.04, 0);
  neck.add(neckMesh); meshes.push(neckMesh);

  const craniumMesh = new THREE.Mesh(geos.craniumGeo, mats.beastSkin);
  craniumMesh.position.set(0, 0.03, 0); craniumMesh.castShadow = true;
  head.add(craniumMesh); meshes.push(craniumMesh);

  const upperSnout = new THREE.Mesh(geos.upperSnoutGeo, mats.muzzleDark);
  upperSnout.position.set(0, -0.015, 0.165); upperSnout.rotation.x = 0.08;
  head.add(upperSnout); meshes.push(upperSnout);

  const noseTip = new THREE.Mesh(geos.noseGeo, mats.noseBlack);
  noseTip.position.set(0, 0.022, 0.275);
  head.add(noseTip); meshes.push(noseTip);

  const jawGroup = new THREE.Group();
  jawGroup.name = 'jaw';
  jawGroup.position.set(0, -0.068, 0.08);
  jawGroup.rotation.x = 0.18;
  head.add(jawGroup);

  const lowerJaw = new THREE.Mesh(geos.lowerJawGeo, mats.beastSkinDark);
  lowerJaw.position.set(0, 0, 0.085);
  jawGroup.add(lowerJaw); meshes.push(lowerJaw);

  const tuskL = new THREE.Mesh(geos.tuskGeo, mats.tuskIvory);
  tuskL.position.set(0.054, 0.052, 0.155); tuskL.rotation.set(0.18, 0, -0.14);
  jawGroup.add(tuskL); meshes.push(tuskL);

  const tuskR = new THREE.Mesh(geos.tuskGeo, mats.tuskIvory);
  tuskR.position.set(-0.054, 0.052, 0.155); tuskR.rotation.set(0.18, 0, 0.14);
  jawGroup.add(tuskR); meshes.push(tuskR);

  const fangL = new THREE.Mesh(geos.fangGeo, mats.tuskIvory);
  fangL.position.set(0.042, -0.068, 0.21); fangL.rotation.x = Math.PI;
  head.add(fangL); meshes.push(fangL);

  const fangR = new THREE.Mesh(geos.fangGeo, mats.tuskIvory);
  fangR.position.set(-0.042, -0.068, 0.21); fangR.rotation.x = Math.PI;
  head.add(fangR); meshes.push(fangR);

  // Glowing Crimson Red Eyes (#ff2211)
  const eyeL = new THREE.Mesh(geos.eyeGeo, mats.eyeCrimson);
  eyeL.position.set(0.068, 0.048, 0.125); eyeL.rotation.set(0.1, 0.28, -0.25);
  head.add(eyeL); meshes.push(eyeL);

  const eyeR = new THREE.Mesh(geos.eyeGeo, mats.eyeCrimson);
  eyeR.position.set(-0.068, 0.048, 0.125); eyeR.rotation.set(0.1, -0.28, 0.25);
  head.add(eyeR); meshes.push(eyeR);

  const browL = new THREE.Mesh(geos.browGeo, mats.beastSkinDark);
  browL.position.set(0.065, 0.078, 0.135); browL.rotation.z = -0.28;
  head.add(browL); meshes.push(browL);

  const browR = new THREE.Mesh(geos.browGeo, mats.beastSkinDark);
  browR.position.set(-0.065, 0.078, 0.135); browR.rotation.z = 0.28;
  head.add(browR); meshes.push(browR);

  const earL = new THREE.Mesh(geos.earGeo, mats.beastSkin);
  earL.position.set(0.135, 0.095, -0.02); earL.rotation.set(-0.35, 0.2, -0.75);
  head.add(earL); meshes.push(earL);

  const earTuftL = new THREE.Mesh(geos.earTuftGeo, mats.maneDark);
  earTuftL.position.set(0, 0.10, 0); earL.add(earTuftL); meshes.push(earTuftL);

  const earR = new THREE.Mesh(geos.earGeo, mats.beastSkin);
  earR.position.set(-0.135, 0.095, -0.02); earR.rotation.set(-0.35, -0.2, 0.75);
  head.add(earR); meshes.push(earR);

  const earTuftR = new THREE.Mesh(geos.earTuftGeo, mats.maneDark);
  earTuftR.position.set(0, 0.10, 0); earR.add(earTuftR); meshes.push(earTuftR);

  // Wild Spiky Back Mane
  const headManeCoords = [
    { y: 0.16, z: 0.05, rx: -0.35, s: 0.9 },
    { y: 0.17, z: -0.02, rx: -0.65, s: 1.15 },
    { y: 0.14, z: -0.09, rx: -0.95, s: 1.25 },
    { y: 0.08, z: -0.14, rx: -1.25, s: 1.1 },
  ];
  for (let i = 0; i < headManeCoords.length; i++) {
    const mc = headManeCoords[i];
    const spike = new THREE.Mesh(geos.maneSpikeGeo, mats.maneDark);
    spike.position.set(0, mc.y, mc.z); spike.rotation.x = mc.rx; spike.scale.setScalar(mc.s);
    head.add(spike); meshes.push(spike);

    if (i === 1 || i === 2) {
      const sideL = new THREE.Mesh(geos.maneSpikeGeo, mats.maneDark);
      sideL.position.set(0.045, mc.y - 0.02, mc.z); sideL.rotation.set(mc.rx, 0, -0.35); sideL.scale.setScalar(mc.s * 0.85);
      head.add(sideL); meshes.push(sideL);

      const sideR = new THREE.Mesh(geos.maneSpikeGeo, mats.maneDark);
      sideR.position.set(-0.045, mc.y - 0.02, mc.z); sideR.rotation.set(mc.rx, 0, 0.35); sideR.scale.setScalar(mc.s * 0.85);
      head.add(sideR); meshes.push(sideR);
    }
  }

  const backManeCoords = [
    { y: 0.21, z: -0.14, rx: -1.35, s: 1.3 },
    { y: 0.14, z: -0.18, rx: -1.45, s: 1.25 },
    { y: 0.06, z: -0.19, rx: -1.52, s: 1.15 },
    { y: -0.02, z: -0.18, rx: -1.6, s: 1.0 },
    { y: -0.09, z: -0.16, rx: -1.65, s: 0.85 },
  ];
  for (let i = 0; i < backManeCoords.length; i++) {
    const bm = backManeCoords[i];
    const spike = new THREE.Mesh(geos.maneSpikeGeo, mats.maneDark);
    spike.position.set(0, bm.y, bm.z); spike.rotation.x = bm.rx; spike.scale.setScalar(bm.s);
    chest.add(spike); meshes.push(spike);
  }

  // Arms, Spiked Pauldrons & Weapon
  function buildArmBranch(isLeft) {
    const side = isLeft ? 1 : -1;
    const suffix = isLeft ? 'L' : 'R';

    const shoulder = new THREE.Group();
    shoulder.name = `shoulder${suffix}`;
    shoulder.position.set(side * 0.33, 0.14, 0.0);
    chest.add(shoulder);

    const pauldronGroup = new THREE.Group();
    pauldronGroup.name = `pauldron${suffix}`;
    pauldronGroup.position.set(side * 0.02, 0.02, 0);
    pauldronGroup.rotation.z = -side * 0.32;
    shoulder.add(pauldronGroup);

    const dome = new THREE.Mesh(geos.pauldronDomeGeo, mats.pauldronDome);
    dome.castShadow = true;
    pauldronGroup.add(dome); meshes.push(dome);

    const rim = new THREE.Mesh(geos.pauldronRimGeo, mats.ironCrude);
    rim.position.set(0, 0.02, 0);
    pauldronGroup.add(rim); meshes.push(rim);

    const spikeOffsets = [
      { x: side * 0.06, y: 0.18, z: 0.0, rz: -side * 0.35, rx: 0 },
      { x: side * 0.14, y: 0.11, z: 0.0, rz: -side * 1.05, rx: 0 },
      { x: side * 0.09, y: 0.13, z: 0.09, rz: -side * 0.65, rx: 0.55 },
      { x: side * 0.09, y: 0.13, z: -0.09, rz: -side * 0.65, rx: -0.55 },
    ];
    for (let s = 0; s < spikeOffsets.length; s++) {
      const so = spikeOffsets[s];
      const pSpike = new THREE.Mesh(geos.pauldronSpikeGeo, mats.steelBright);
      pSpike.position.set(so.x, so.y, so.z);
      pSpike.rotation.set(so.rx, 0, so.rz);
      pauldronGroup.add(pSpike); meshes.push(pSpike);
    }

    const upperArm = new THREE.Group();
    upperArm.name = `upperArm${suffix}`;
    upperArm.position.set(side * 0.03, -0.03, 0);
    upperArm.rotation.set(-0.25, 0, side * 0.16);
    shoulder.add(upperArm);

    const upperArmMesh = new THREE.Mesh(geos.upperArmGeo, mats.beastSkin);
    upperArmMesh.castShadow = true;
    upperArm.add(upperArmMesh); meshes.push(upperArmMesh);

    const foreArm = new THREE.Group();
    foreArm.name = `foreArm${suffix}`;
    foreArm.position.set(0, -0.22, 0);
    foreArm.rotation.x = -0.55;
    upperArm.add(foreArm);

    const foreArmMesh = new THREE.Mesh(geos.foreArmGeo, mats.beastSkin);
    foreArm.add(foreArmMesh); meshes.push(foreArmMesh);

    const bracerMesh = new THREE.Mesh(geos.bracerGeo, mats.ironCrude);
    foreArm.add(bracerMesh); meshes.push(bracerMesh);

    const wristFur = new THREE.Mesh(geos.wristFurGeo, mats.furTrim);
    wristFur.position.set(0, -0.08, 0);
    foreArm.add(wristFur); meshes.push(wristFur);

    const hand = new THREE.Group();
    hand.name = `hand${suffix}`;
    hand.position.set(0, -0.22, 0);
    foreArm.add(hand);

    const handMesh = new THREE.Mesh(geos.handGeo, mats.beastSkinDark);
    hand.add(handMesh); meshes.push(handMesh);

    return { shoulder, upperArm, foreArm, hand };
  }

  const leftArm = buildArmBranch(true);
  const rightArm = buildArmBranch(false);

  // Weapon socket on right hand
  const weaponSocketR = new THREE.Group();
  weaponSocketR.name = 'weapon_socket_r';
  weaponSocketR.position.set(0, -0.05, 0.02);
  weaponSocketR.rotation.x = Math.PI * 0.5;
  rightArm.hand.add(weaponSocketR);

  const battleAxeGroup = new THREE.Group();
  battleAxeGroup.name = 'gnoll_battleaxe';
  weaponSocketR.add(battleAxeGroup);

  const haft = new THREE.Mesh(geos.axeHaftGeo, mats.woodHaft);
  haft.position.set(0, 0.16, 0); battleAxeGroup.add(haft); meshes.push(haft);

  const gripWrap = new THREE.Mesh(geos.axeGripWrapGeo, mats.leatherHarness);
  gripWrap.position.set(0, -0.02, 0); battleAxeGroup.add(gripWrap); meshes.push(gripWrap);

  const axeCollar = new THREE.Mesh(geos.axeSocketCollarGeo, mats.ironCrude);
  axeCollar.position.set(0, 0.42, 0); battleAxeGroup.add(axeCollar); meshes.push(axeCollar);

  const axeBlade = new THREE.Mesh(geos.bladeBodyGeo, mats.ironCrude);
  axeBlade.position.set(0, 0.42, 0.14); axeBlade.castShadow = true; battleAxeGroup.add(axeBlade); meshes.push(axeBlade);

  const axeEdge = new THREE.Mesh(geos.bladeEdgeGeo, mats.steelBright);
  axeEdge.position.set(0, 0.42, 0.27); battleAxeGroup.add(axeEdge); meshes.push(axeEdge);

  const axeBackSpike = new THREE.Mesh(geos.backSpikeGeo, mats.steelBright);
  axeBackSpike.position.set(0, 0.42, -0.09); axeBackSpike.rotation.x = Math.PI * 0.5; battleAxeGroup.add(axeBackSpike); meshes.push(axeBackSpike);

  // Legs
  function buildLegBranch(isLeft) {
    const side = isLeft ? 1 : -1;
    const suffix = isLeft ? 'L' : 'R';

    const thigh = new THREE.Group();
    thigh.name = `thigh${suffix}`;
    thigh.position.set(side * 0.14, -0.04, 0);
    thigh.rotation.set(-0.18, 0, side * 0.06);
    hips.add(thigh);

    const thighMesh = new THREE.Mesh(geos.thighGeo, mats.beastSkinDark);
    thighMesh.castShadow = true; thigh.add(thighMesh); meshes.push(thighMesh);

    const shin = new THREE.Group();
    shin.name = `shin${suffix}`;
    shin.position.set(0, -0.25, 0);
    shin.rotation.x = 0.28;
    thigh.add(shin);

    const shinMesh = new THREE.Mesh(geos.shinGeo, mats.leatherHarness);
    shin.add(shinMesh); meshes.push(shinMesh);

    const ankleFur = new THREE.Mesh(geos.ankleFurGeo, mats.furTrim);
    ankleFur.position.set(0, -0.05, 0);
    shin.add(ankleFur); meshes.push(ankleFur);

    const foot = new THREE.Group();
    foot.name = `foot${suffix}`;
    foot.position.set(0, -0.24, 0);
    foot.rotation.x = -0.1;
    shin.add(foot);

    const footMesh = new THREE.Mesh(geos.footGeo, mats.leatherHarness);
    foot.add(footMesh); meshes.push(footMesh);

    return { thigh, shin, foot };
  }

  const leftLeg = buildLegBranch(true);
  const rightLeg = buildLegBranch(false);

  // Rigid body hierarchy mapping to satisfy EnemyRig and Combatant controllers
  const parts = {
    root,
    hips,
    spine,
    chest,
    torso: chest,
    neck,
    head,
    jaw: jawGroup,
    earL,
    earR,
    shoulderL: leftArm.shoulder,
    shoulderR: rightArm.shoulder,
    upperArmL: leftArm.upperArm,
    upperArmR: rightArm.upperArm,
    armL: leftArm.upperArm,
    armR: rightArm.upperArm,
    foreArmL: leftArm.foreArm,
    foreArmR: rightArm.foreArm,
    elbowL: leftArm.foreArm,
    elbowR: rightArm.foreArm,
    handL: leftArm.hand,
    handR: rightArm.hand,
    thighL: leftLeg.thigh,
    thighR: rightLeg.thigh,
    hipL: leftLeg.thigh,
    hipR: rightLeg.thigh,
    shinL: leftLeg.shin,
    shinR: rightLeg.shin,
    kneeL: leftLeg.shin,
    kneeR: rightLeg.shin,
    footL: leftLeg.foot,
    footR: rightLeg.foot,
    weapon_socket_r: weaponSocketR,
  };

  const sockets = {
    handR: rightArm.hand,
    handL: leftArm.hand,
    weapon_socket_r: weaponSocketR,
    back: chest,
    head,
  };

  const anchors = {
    head: new THREE.Object3D(),
    chest,
    feet: root,
    weapon: weaponSocketR,
  };
  anchors.head.position.set(0, 0.22, 0);
  head.add(anchors.head);

  // Store rest transforms for zero-GC animation blending
  const restPos = {};
  const restRot = {};
  for (const k in parts) {
    restPos[k] = parts[k].position.clone();
    restRot[k] = parts[k].rotation.clone();
  }

  function resetRigToRest() {
    for (const k in parts) {
      parts[k].position.copy(restPos[k]);
      parts[k].rotation.copy(restRot[k]);
    }
  }

  let matsCloned = false;
  let currentEyeGlow = 1.0;
  let currentEnrage = 0.0;
  let currentExpr = 'neutral';

  function ensureClonedMaterials() {
    if (matsCloned) return;
    matsCloned = true;
    for (const m of meshes) {
      m.material = m.material.clone();
    }
  }

  function setPose(name, t = 0, intensity = 1) {
    const info = POSE_INFO[name] || POSE_INFO.idle;
    const time = info.loop ? t : Math.max(0, Math.min(info.duration, t));
    const u = info.duration > 0 ? time / info.duration : 0;
    const k = Math.max(0, Math.min(1.5, intensity));

    resetRigToRest();

    switch (name) {
      case 'idle': {
        const w = t * 3.2;
        chest.rotation.x = restRot.chest.x + Math.sin(w) * 0.04 * k;
        hips.position.y = restPos.hips.y + Math.sin(w) * 0.015 * k;
        jawGroup.rotation.x = restRot.jaw.x + (0.05 + Math.sin(w * 0.8) * 0.06) * k;
        leftArm.shoulder.rotation.x = restRot.shoulderL.x + Math.sin(w + 1) * 0.06 * k;
        rightArm.shoulder.rotation.x = restRot.shoulderR.x - Math.sin(w + 1) * 0.06 * k;
        break;
      }
      case 'walk':
      case 'run': {
        const isRun = name === 'run';
        const freq = isRun ? 11.0 : 7.0;
        const ph = t * freq;
        const stride = (isRun ? 0.9 : 0.55) * k;

        leftLeg.thigh.rotation.x = restRot.thighL.x + Math.sin(ph) * stride;
        rightLeg.thigh.rotation.x = restRot.thighR.x - Math.sin(ph) * stride;
        leftLeg.shin.rotation.x = restRot.shinL.x + Math.max(0, -Math.cos(ph) * stride * 0.8);
        rightLeg.shin.rotation.x = restRot.shinR.x + Math.max(0, Math.cos(ph) * stride * 0.8);

        leftArm.shoulder.rotation.x = restRot.shoulderL.x - Math.sin(ph) * stride * 0.7;
        rightArm.shoulder.rotation.x = restRot.shoulderR.x + Math.sin(ph) * stride * 0.7;

        chest.rotation.y = Math.sin(ph) * 0.12 * k;
        hips.position.y = restPos.hips.y + Math.abs(Math.sin(ph)) * (isRun ? 0.07 : 0.035) * k;
        break;
      }
      case 'attack1':
      case 'attack2': {
        const swing = Math.sin(u * Math.PI);
        chest.rotation.y = Math.sin(u * Math.PI * 2) * 0.25 * k;
        chest.rotation.x = restRot.chest.x + (u < 0.4 ? -0.35 : 0.45) * swing * k;
        rightArm.shoulder.rotation.x = restRot.shoulderR.x + (u < 0.4 ? -1.4 : 1.2) * swing * k;
        rightArm.foreArm.rotation.x = restRot.foreArmR.x + (u < 0.4 ? -0.8 : 0.4) * swing * k;
        jawGroup.rotation.x = restRot.jaw.x + swing * 0.28 * k;
        break;
      }
      case 'hit':
      case 'stagger': {
        const flinch = Math.sin(u * Math.PI);
        chest.rotation.x = restRot.chest.x - flinch * 0.35 * k;
        head.rotation.x = restRot.head.x - flinch * 0.3 * k;
        hips.position.z = restPos.hips.z - flinch * 0.12 * k;
        jawGroup.rotation.x = restRot.jaw.x + flinch * 0.35 * k;
        break;
      }
      case 'death': {
        const fall = Math.min(1, u * 1.35);
        const ease = fall * fall * (3 - 2 * fall);
        hips.position.y = THREE.MathUtils.lerp(restPos.hips.y, 0.18, ease);
        chest.rotation.x = THREE.MathUtils.lerp(restRot.chest.x, 0.85, ease);
        head.rotation.x = THREE.MathUtils.lerp(restRot.head.x, 0.5, ease);
        leftLeg.thigh.rotation.x = THREE.MathUtils.lerp(restRot.thighL.x, -1.2, ease);
        rightLeg.thigh.rotation.x = THREE.MathUtils.lerp(restRot.thighR.x, -1.2, ease);
        jawGroup.rotation.x = restRot.jaw.x + 0.38;
        break;
      }
      default: {
        const w = t * 3.0;
        chest.rotation.x = restRot.chest.x + Math.sin(w) * 0.03 * k;
        break;
      }
    }

    if (currentExpr === 'snarl') {
      jawGroup.rotation.x += 0.25;
    } else if (currentExpr === 'pain') {
      jawGroup.rotation.x += 0.42;
      head.rotation.z += 0.15;
    } else if (currentExpr === 'dead') {
      jawGroup.rotation.x += 0.45;
    }
  }

  function setEyeGlow(intensity = 1) {
    currentEyeGlow = Math.max(0, Math.min(2, intensity));
    const s = 1 + Math.max(0, currentEyeGlow - 1) * 0.4;
    eyeL.scale.set(1, s, 1);
    eyeR.scale.set(1, s, 1);
  }

  function setExpression(name = 'neutral') {
    currentExpr = name;
  }

  function setTint(hex, amount = 0) {
    ensureClonedMaterials();
    const a = Math.max(0, Math.min(1, amount));
    const target = hex !== null && hex !== undefined ? new THREE.Color(hex) : null;
    for (const m of meshes) {
      if (m.material && m.material.color) {
        if (target && a > 0) m.material.color.lerp(target, a);
      }
    }
  }

  function setOpacity(a = 1) {
    ensureClonedMaterials();
    const op = Math.max(0, Math.min(1, a));
    const isTrans = op < 0.999;
    for (const m of meshes) {
      if (m.material) {
        m.material.transparent = isTrans;
        m.material.opacity = op;
        m.material.depthWrite = !isTrans;
      }
    }
  }

  function setEnrage(amount = 0) {
    currentEnrage = Math.max(0, Math.min(1, amount));
    setEyeGlow(1 + currentEnrage);
    root.scale.setScalar(scaleVar * (1 + currentEnrage * 0.08));
  }

  function setOutlineVisible() {}

  function getBounds() {
    root.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(root);
  }

  function dispose() {
    if (matsCloned) {
      for (const m of meshes) {
        if (m.material) m.material.dispose();
      }
    }
  }

  root.userData.bones = parts;
  root.userData.rig = parts;
  root.userData.weapon_socket_r = weaponSocketR;

  setPose('idle', 0, 1);

  return {
    group: root,
    root,
    parts,
    sockets,
    anchors,
    setPose,
    setEyeGlow,
    setExpression,
    setTint,
    setOpacity,
    setEnrage,
    setOutlineVisible,
    getBounds,
    dispose,
  };
}
```

## 3. Enemy Base System

- **File**: `src/combat/Enemy.js` (legacy base entity) + `src/art/EnemyRig.js` (rig controller) + `src/data/enemies.js` (stats).
- **AI states**: `idle`, `ambushWait`, `chase`, `flank`, `windup`, `attack`, `stagger`, `hesitate`, `flee` (GoblinAI). Additional `hornWindup` for scout. Wolves use WolfAI. Bosses use Boss/HobgoblinChief.
- **Stats (Armored Goblin base)**: level 4, hp 55, speed 2.8, damage 8, detectionRange 16, attackRange 1.5, size 1.05, color 0x5a8f3a.
  - Scaling: `getEnemyStats(type, floor)` applies `floorMultiplier = 1 + 0.1*(floor-1)`. `Enemy` constructor applies `levelMult = 1 + 0.1*(level-1)` to maxHp/hp/damage. Speed not scaled.
- **Hitbox/collision**: `capsuleRadius = 0.35 * size` (~0.3675), `capsuleHeight = 1.55 * size` (~1.6275). Separation steering radius 0.9.
- **Hit flash**: `flashTimer = 0.1` on `takeDamage`; `rig.setTint(0xffffff, 0.85)`; reset to no tint when timer expires.
- **Death handling**: `dead=true`, `isDying=true`, `state='dead'`, `deathTimer=0.8`, `corpseTimer=6.0`, then `corpseFadeTimer=0.8` opacity fade via `rig.setOpacity`, then `isCorpseCleaned=true` and removal. Rig plays `'death'` pose with `actionTime`.
- **Loot**: material drops — goblin_hide 40%, crude_iron 25%, goblin_tooth 20%; regular drop 25% HEALTH/STAMINA; scavenge weapon drop 35% (club/dagger/sword candidate). Armored goblin falls into the default grunt branch in `EnemyManager.onEnemyDeath`.
- **Animation**: procedural, driven by code. `EnemyRig.update(dt, state)` selects a pose and calls `model.setPose(pose, t, intensity)`. No skeleton/bones; transforms are applied to named `THREE.Group` pivots.
- **Object/bone names the animation code expects** (from `parts` map): `root, hips, spine, chest, torso, neck, head, jaw, earL, earR, shoulderL, shoulderR, upperArmL, upperArmR, armL, armR, foreArmL, foreArmR, elbowL, elbowR, handL, handR, thighL, thighR, hipL, hipR, shinL, shinR, kneeL, kneeR, footL, footR, weapon_socket_r`. Sockets: `handR, handL, weapon_socket_r, back, head`. Anchors: `head, chest, feet, weapon`. `root.userData.bones/rig/weapon_socket_r` must be set. `EnemyRig` also reads `model.parts.shoulderL/shoulderR/hipL/hipR/torso` for backward-compat pivots.

## 4. Nameplate & Health Bar

- **File**: `src/ui/EnemyTags.js` (`EnemyTagsOverlay`).
- **Creation**: `getOrCreateTag(enemy)` builds a DOM `div` with a text element `textEl.textContent = '<NAME LV.x>'` (e.g. `<ARMORED GOBLIN LV.4>`) and an HP bar (`hpBar`/`hpFill`) shown only after damage (`enemy.hp < enemy.maxHp`).
- **Attachment**: appended to a fixed overlay container `#mm-enemy-tags-overlay` in `document.body`; positioned each frame in `update(camera, enemies)` by projecting `enemy.mesh.position + tagHeight` to screen space. `enemy.tagHeight` is set in `Enemy.buildModel()` as `rig.getHeadHeight() + 0.15`.
- Name source: `enemy.name` -> stats.name `'Armored Goblin'` (from `src/data/enemies.js` `ARMORED_GOBLIN`).

## 5. Floor 3 Spawns & Environment

- **Spawn (file/function/count)**: `src/combat/EnemyManager.js` -> `spawn(scene, dungeon, floorNumber)`, branch `if (floorNumber === 3)`. First run: 4 `ARMORED_GOBLIN` at (-3,-32),(3,-32),(-1,-36),(2,-36) (z ~ -32/-36). Repeat run (`clearedFloors >= 3`): 2 at (-2,-34),(2,-34). All `new Enemy(x, z, 'ARMORED_GOBLIN', false, 3, 4)` (floor 3, level 4).
- **Environment (file)**: `src/art/floors/forest.js` -> `buildFloor3Clearing(ctx)` (single clearing arena at center (0,0,-34), radius ~18). Called via TowerScene floor build (`buildTowerFloor` path for floor 3) / `buildFloor3Clearing`. TowerScene `applyFloorLighting(3)` sets `BRIGHT_FOREST_LIGHTING`: background 0xb9dcce, fog 0xa8cebc near 28 far 72, exposure 1.12, ambient 0x5c7c68 @0.45, hemi sky 0xd9f5e3 / ground 0x2c3f25 @0.70, sun 0xfff4d4 @1.65 from (22,42,14). Dir light `castShadow = false` in TowerScene. Floor meshes use `receiveShadow = true`; several goblin meshes set `castShadow = true`. Ground: multi-ring circles (outer forest, lush grass, clover, trampled dirt trail) all `receiveShadow`. Trees: instanced trunks/conifers/broadleaf crowns. Rocks: instanced mossy boulders with moss caps. Grass: 420+340 instanced tufts. Mountains, sun shafts, pillars, gate portal, 160 instanced drifting leaves. Debris updated via `updateFloor3Debris`.

## 6. Material Types, Shadows, Instancing

- **Materials used**: `MeshToonMaterial` (skin, mane, fur trim, muzzle), `MeshStandardMaterial` (nose, tusks, leather, metal armor, wood haft; metalness 0.72-0.88, roughness 0.28-0.55), `MeshBasicMaterial` (eyes, outline).
- **Shadows**: mesh-level `castShadow` on some goblin parts (chest, cranium, pauldron dome, upper arms, thigh, axe blade) and `receiveShadow` on floors. Live-game directional light has `castShadow = false` in TowerScene (dev arena/test sandbox enable shadows). So effective shadow casting in the live game is off unless changed.
- **Instancing**: yes — floors use `THREE.InstancedMesh` (grass, tree trunks/crowns, stones, leaves, sun shafts). Enemies are NOT instanced; each enemy builds its own mesh set, but geometries and materials are cached/shared (`getGnollGeometries`/`getGnollMaterials` singletons, plus `CACHES`).

## 7. Required Function Signature & Return Value

A replacement builder must keep:

- **Signature**: `createGnollWarriorModel(seed = 1, opts = {})` (called as `createGnollWarriorModel(opts.seed ?? 1, opts)`).
- **Return value**: an object with exactly these keys:
  - `group` (root `THREE.Group`, named `'enemy_goblin_armored'`, scaled by `scaleVar`)
  - `root` (same group)
  - `parts` (map of named pivots/meshes listed in section 3)
  - `sockets` (`handR`, `handL`, `weapon_socket_r`, `back`, `head`)
  - `anchors` (`head`, `chest`, `feet`, `weapon`)
  - `setPose(name, t, intensity)`, `setEyeGlow(intensity)`, `setExpression(name)`, `setTint(hex, amount)`, `setOpacity(a)`, `setEnrage(amount)`, `setOutlineVisible()`, `getBounds()`, `dispose()`
- **Side effects required**: `root.userData.bones = parts`, `root.userData.rig = parts`, `root.userData.weapon_socket_r = weaponSocketR`; call `setPose('idle', 0, 1)` before return. `EnemyRig` reads `model.group`, `model.parts`, `model.sockets`, `model.anchors`, and calls `model.setPose/setTint/setOpacity/setEyeGlow/setExpression/setEnrage/setOutlineVisible/getBounds/dispose`.

## 8. Current Triangle Count per Enemy

- Measured by traversing `model.group` meshes: **2,825 triangles per armored goblin** (79 meshes), including the axe. (Outline hulls are not generated for this model.)

## SAFE TO REPLACE

- `src/art/enemies.js` -> `createGnollWarriorModel(seed, opts)` (the whole Floor 3 Gnoll/Beastman block).
- `src/art/enemies.js` -> `getGnollMaterials()` and `getGnollGeometries()` (its cached material/geometry helpers).
- Nothing else: keep `createEnemyModel` routing, `EnemyRig`, `Enemy`, `EnemyManager`, `EnemyTags`, and `TowerScene`/`forest.js` untouched.
```