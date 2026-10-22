// src/enemies/models/ArmoredGoblin.js
// Procedural mesh builder and animator for Armored Goblin / Gnoll Warrior.
import * as THREE from 'three';
import { getGradientMap } from '../shared.js';

let _gnollMaterials = null;
let _gnollGeometries = null;

function getGnollMaterials() {
  if (_gnollMaterials) return _gnollMaterials;

  _gnollMaterials = {
    goblinSkin: new THREE.MeshToonMaterial({ color: 0x5a8f3a, gradientMap: getGradientMap() }),
    goblinSkinDark: new THREE.MeshToonMaterial({ color: 0x3d6626, gradientMap: getGradientMap() }),
    goblinEarInner: new THREE.MeshToonMaterial({ color: 0x4b5c32, gradientMap: getGradientMap() }),
    tuskIvory: new THREE.MeshStandardMaterial({ color: 0xf2ebd9, roughness: 0.32, metalness: 0.05 }),
    eyeCrimson: new THREE.MeshBasicMaterial({ color: 0xff3311 }),
    leatherHarness: new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.85, metalness: 0.05 }),
    clothTattered: new THREE.MeshToonMaterial({ color: 0x4a251d, gradientMap: getGradientMap() }),
    pauldronDome: new THREE.MeshStandardMaterial({ color: 0x464e56, roughness: 0.44, metalness: 0.78 }),
    steelBright: new THREE.MeshStandardMaterial({ color: 0xcfd6de, roughness: 0.28, metalness: 0.88 }),
    ironCrude: new THREE.MeshStandardMaterial({ color: 0x2f343a, roughness: 0.52, metalness: 0.75 }),
    brassTrim: new THREE.MeshStandardMaterial({ color: 0x9c7a38, roughness: 0.38, metalness: 0.82 }),
    woodHaft: new THREE.MeshStandardMaterial({ color: 0x4d321e, roughness: 0.88, metalness: 0.0 }),
  };

  return _gnollMaterials;
}

function getGnollGeometries() {
  if (_gnollGeometries) return _gnollGeometries;

  // Torso & Cuirass
  const chestGeo = new THREE.CylinderGeometry(0.25, 0.18, 0.30, 8);
  chestGeo.scale(1.0, 1.0, 0.76);

  const cuirassGeo = new THREE.CylinderGeometry(0.27, 0.20, 0.28, 8);
  cuirassGeo.scale(1.02, 1.0, 0.80);

  const chestGuardGeo = new THREE.BoxGeometry(0.32, 0.16, 0.08);
  const gorgetGeo = new THREE.TorusGeometry(0.145, 0.028, 6, 10);
  gorgetGeo.rotateX(Math.PI / 2);

  const spineGeo = new THREE.CylinderGeometry(0.17, 0.16, 0.16, 8);
  spineGeo.scale(1.0, 1.0, 0.70);

  const hipsGeo = new THREE.CylinderGeometry(0.17, 0.16, 0.15, 8);
  hipsGeo.scale(1.0, 1.0, 0.75);

  const tassetGeo = new THREE.BoxGeometry(0.13, 0.16, 0.035);
  const loinclothGeo = new THREE.BoxGeometry(0.14, 0.22, 0.025);

  // Goblin Head & Iron Helm
  const neckGeo = new THREE.CylinderGeometry(0.095, 0.12, 0.14, 7);

  const craniumGeo = new THREE.DodecahedronGeometry(0.155, 1);
  craniumGeo.scale(1.02, 0.92, 1.05);

  const noseGeo = new THREE.ConeGeometry(0.042, 0.13, 5);
  noseGeo.rotateX(Math.PI * 0.58);

  const chinGeo = new THREE.BoxGeometry(0.125, 0.065, 0.13);
  const tuskGeo = new THREE.ConeGeometry(0.022, 0.085, 5);

  const earGeo = new THREE.ConeGeometry(0.052, 0.26, 5);
  earGeo.scale(0.55, 1.0, 1.15);

  const eyeGeo = new THREE.SphereGeometry(0.028, 6, 6);
  eyeGeo.scale(1.35, 0.7, 0.8);
  const browGeo = new THREE.BoxGeometry(0.095, 0.032, 0.06);

  const helmDomeGeo = new THREE.SphereGeometry(0.172, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const helmRimGeo = new THREE.TorusGeometry(0.165, 0.018, 6, 12);
  helmRimGeo.rotateX(Math.PI / 2);
  const helmNasalGeo = new THREE.BoxGeometry(0.032, 0.11, 0.028);
  const helmCrestGeo = new THREE.BoxGeometry(0.036, 0.065, 0.28);
  const helmHornGeo = new THREE.ConeGeometry(0.032, 0.14, 5);

  // Pauldrons, Straps & Hardware
  const pauldronDomeGeo = new THREE.SphereGeometry(0.155, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const pauldronRimGeo = new THREE.TorusGeometry(0.148, 0.018, 6, 12);
  pauldronRimGeo.rotateX(Math.PI / 2);
  const pauldronSpikeGeo = new THREE.ConeGeometry(0.028, 0.115, 5);

  const strapFrontGeo = new THREE.BoxGeometry(0.058, 0.36, 0.032);
  const buckleRingGeo = new THREE.TorusGeometry(0.050, 0.014, 6, 12);
  const rivetStudGeo = new THREE.SphereGeometry(0.018, 5, 5);

  // Limbs & Armor
  const upperArmGeo = new THREE.CylinderGeometry(0.068, 0.056, 0.23, 7);
  upperArmGeo.translate(0, -0.105, 0);

  const foreArmGeo = new THREE.CylinderGeometry(0.062, 0.048, 0.22, 7);
  foreArmGeo.translate(0, -0.105, 0);

  const bracerGeo = new THREE.CylinderGeometry(0.072, 0.058, 0.13, 7);
  bracerGeo.translate(0, -0.13, 0);

  const bucklerDiscGeo = new THREE.CylinderGeometry(0.19, 0.17, 0.03, 9);
  bucklerDiscGeo.rotateZ(Math.PI / 2);
  const bucklerBossGeo = new THREE.SphereGeometry(0.055, 7, 6);

  const handGeo = new THREE.BoxGeometry(0.072, 0.08, 0.072);
  handGeo.translate(0, -0.04, 0);

  const thighGeo = new THREE.CylinderGeometry(0.088, 0.068, 0.24, 7);
  thighGeo.translate(0, -0.12, 0);

  const shinGeo = new THREE.CylinderGeometry(0.068, 0.052, 0.24, 7);
  shinGeo.translate(0, -0.12, 0);

  const greaveGeo = new THREE.BoxGeometry(0.082, 0.18, 0.065);

  const footGeo = new THREE.BoxGeometry(0.092, 0.058, 0.165);
  footGeo.translate(0, -0.029, 0.042);

  // Weapon: Jagged Goblin War-Axe / Cleaver
  const axeHaftGeo = new THREE.CylinderGeometry(0.022, 0.026, 0.74, 7);
  const axeGripWrapGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.25, 7);
  const axeSocketCollarGeo = new THREE.BoxGeometry(0.072, 0.13, 0.085);

  const bladeBodyGeo = new THREE.ConeGeometry(0.21, 0.28, 4);
  bladeBodyGeo.rotateZ(-Math.PI / 2);
  bladeBodyGeo.scale(1.0, 0.95, 0.18);

  const bladeEdgeGeo = new THREE.BoxGeometry(0.035, 0.33, 0.018);
  const backSpikeGeo = new THREE.ConeGeometry(0.036, 0.14, 4);
  backSpikeGeo.rotateZ(Math.PI / 2);

  _gnollGeometries = {
    chestGeo, cuirassGeo, chestGuardGeo, gorgetGeo, spineGeo, hipsGeo, tassetGeo, loinclothGeo,
    neckGeo, craniumGeo, noseGeo, chinGeo, tuskGeo, earGeo, eyeGeo, browGeo,
    helmDomeGeo, helmRimGeo, helmNasalGeo, helmCrestGeo, helmHornGeo,
    pauldronDomeGeo, pauldronRimGeo, pauldronSpikeGeo,
    strapFrontGeo, buckleRingGeo, rivetStudGeo,
    upperArmGeo, foreArmGeo, bracerGeo, bucklerDiscGeo, bucklerBossGeo, handGeo,
    thighGeo, shinGeo, greaveGeo, footGeo,
    axeHaftGeo, axeGripWrapGeo, axeSocketCollarGeo, bladeBodyGeo, bladeEdgeGeo, backSpikeGeo,
  };

  return _gnollGeometries;
}

export function createGnollWarriorModel(seed = 1, opts = {}) {
  const mats = getGnollMaterials();
  const geos = getGnollGeometries();

  const variation = ((seed * 9301 + 49297) % 233280) / 233280;
  const scaleVar = (opts.seed !== undefined ? 0.94 + variation * 0.12 : 1.0) * 1.06;

  const root = new THREE.Group();
  root.name = 'enemy_goblin_armored';
  root.scale.setScalar(scaleVar);

  const hips = new THREE.Group();
  hips.name = 'hips';
  hips.position.set(0, 0.50, 0);
  root.add(hips);

  const spine = new THREE.Group();
  spine.name = 'spine';
  spine.position.set(0, 0.08, 0);
  spine.rotation.x = 0.22;
  hips.add(spine);

  const chest = new THREE.Group();
  chest.name = 'chest';
  chest.position.set(0, 0.15, 0);
  chest.rotation.x = 0.26;
  spine.add(chest);

  const neck = new THREE.Group();
  neck.name = 'neck';
  neck.position.set(0, 0.17, 0.03);
  neck.rotation.x = -0.30;
  chest.add(neck);

  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.10, 0.03);
  head.rotation.x = -0.14;
  neck.add(head);

  const meshes = [];

  // Hips, Belt, Tassets & Loincloth
  const hipsMesh = new THREE.Mesh(geos.hipsGeo, mats.leatherHarness);
  hips.add(hipsMesh); meshes.push(hipsMesh);

  const beltBuckle = new THREE.Mesh(geos.buckleRingGeo, mats.brassTrim);
  beltBuckle.position.set(0, 0.015, 0.125);
  beltBuckle.scale.setScalar(0.8);
  hips.add(beltBuckle); meshes.push(beltBuckle);

  const loincloth = new THREE.Mesh(geos.loinclothGeo, mats.clothTattered);
  loincloth.position.set(0, -0.11, 0.115);
  loincloth.rotation.x = -0.12;
  hips.add(loincloth); meshes.push(loincloth);

  for (const side of [-1, 1]) {
    const tasset = new THREE.Mesh(geos.tassetGeo, mats.ironCrude);
    tasset.position.set(side * 0.145, -0.07, 0.05);
    tasset.rotation.set(-0.1, side * 0.35, side * 0.22);
    hips.add(tasset); meshes.push(tasset);

    const rivet = new THREE.Mesh(geos.rivetStudGeo, mats.steelBright);
    rivet.position.set(side * 0.155, -0.02, 0.075);
    hips.add(rivet); meshes.push(rivet);
  }

  // Spine & Armored Chest Cuirass
  const spineMesh = new THREE.Mesh(geos.spineGeo, mats.goblinSkinDark);
  spine.add(spineMesh); meshes.push(spineMesh);

  const chestMesh = new THREE.Mesh(geos.chestGeo, mats.goblinSkin);
  chestMesh.position.set(0, 0.03, 0);
  chestMesh.castShadow = true;
  chest.add(chestMesh); meshes.push(chestMesh);

  const cuirassMesh = new THREE.Mesh(geos.cuirassGeo, mats.ironCrude);
  cuirassMesh.position.set(0, 0.03, 0);
  cuirassMesh.castShadow = true;
  chest.add(cuirassMesh); meshes.push(cuirassMesh);

  const chestPlate = new THREE.Mesh(geos.chestGuardGeo, mats.pauldronDome);
  chestPlate.position.set(0, 0.06, 0.145);
  chestPlate.rotation.x = 0.16;
  chest.add(chestPlate); meshes.push(chestPlate);

  const gorget = new THREE.Mesh(geos.gorgetGeo, mats.ironCrude);
  gorget.position.set(0, 0.175, 0.015);
  gorget.rotation.x = 0.22;
  chest.add(gorget); meshes.push(gorget);

  // Crossed Leather Straps & Rivets over Cuirass
  const harnessGroup = new THREE.Group();
  harnessGroup.name = 'chest_harness';
  chest.add(harnessGroup);

  const strapFL = new THREE.Mesh(geos.strapFrontGeo, mats.leatherHarness);
  strapFL.position.set(0, 0.05, 0.185); strapFL.rotation.set(-0.12, 0, 0.58);
  harnessGroup.add(strapFL); meshes.push(strapFL);

  const strapFR = new THREE.Mesh(geos.strapFrontGeo, mats.leatherHarness);
  strapFR.position.set(0, 0.05, 0.185); strapFR.rotation.set(-0.12, 0, -0.58);
  harnessGroup.add(strapFR); meshes.push(strapFR);

  const strapBL = new THREE.Mesh(geos.strapFrontGeo, mats.leatherHarness);
  strapBL.position.set(0, 0.05, -0.175); strapBL.rotation.set(0.12, 0, 0.58);
  harnessGroup.add(strapBL); meshes.push(strapBL);

  const strapBR = new THREE.Mesh(geos.strapFrontGeo, mats.leatherHarness);
  strapBR.position.set(0, 0.05, -0.175); strapBR.rotation.set(0.12, 0, -0.58);
  harnessGroup.add(strapBR); meshes.push(strapBR);

  const centerBuckle = new THREE.Mesh(geos.buckleRingGeo, mats.brassTrim);
  centerBuckle.position.set(0, 0.055, 0.202);
  harnessGroup.add(centerBuckle); meshes.push(centerBuckle);

  for (let r = 0; r < 4; r++) {
    const a = (r * Math.PI) / 2 + Math.PI / 4;
    const stud = new THREE.Mesh(geos.rivetStudGeo, mats.steelBright);
    stud.position.set(Math.cos(a) * 0.11, 0.06 + Math.sin(a) * 0.055, 0.188);
    harnessGroup.add(stud); meshes.push(stud);
  }

  // Goblin Head, Hooked Nose, Tusks, Swept Ears & Iron Helm
  const neckMesh = new THREE.Mesh(geos.neckGeo, mats.goblinSkinDark);
  neckMesh.position.set(0, 0.035, 0);
  neck.add(neckMesh); meshes.push(neckMesh);

  const craniumMesh = new THREE.Mesh(geos.craniumGeo, mats.goblinSkin);
  craniumMesh.position.set(0, 0.03, 0);
  craniumMesh.castShadow = true;
  head.add(craniumMesh); meshes.push(craniumMesh);

  const hookedNose = new THREE.Mesh(geos.noseGeo, mats.goblinSkinDark);
  hookedNose.position.set(0, 0.01, 0.185);
  head.add(hookedNose); meshes.push(hookedNose);

  const jawGroup = new THREE.Group();
  jawGroup.name = 'jaw';
  jawGroup.position.set(0, -0.058, 0.065);
  jawGroup.rotation.x = 0.14;
  head.add(jawGroup);

  const lowerJaw = new THREE.Mesh(geos.chinGeo, mats.goblinSkinDark);
  lowerJaw.position.set(0, 0, 0.06);
  jawGroup.add(lowerJaw); meshes.push(lowerJaw);

  const tuskL = new THREE.Mesh(geos.tuskGeo, mats.tuskIvory);
  tuskL.position.set(0.048, 0.045, 0.115);
  tuskL.rotation.set(0.22, 0, -0.14);
  jawGroup.add(tuskL); meshes.push(tuskL);

  const tuskR = new THREE.Mesh(geos.tuskGeo, mats.tuskIvory);
  tuskR.position.set(-0.048, 0.045, 0.115);
  tuskR.rotation.set(0.22, 0, 0.14);
  jawGroup.add(tuskR); meshes.push(tuskR);

  // Glowing Crimson Eyes & Heavy Brows
  const eyeL = new THREE.Mesh(geos.eyeGeo, mats.eyeCrimson);
  eyeL.position.set(0.065, 0.038, 0.132);
  eyeL.rotation.set(0.08, 0.25, -0.22);
  head.add(eyeL); meshes.push(eyeL);

  const eyeR = new THREE.Mesh(geos.eyeGeo, mats.eyeCrimson);
  eyeR.position.set(-0.065, 0.038, 0.132);
  eyeR.rotation.set(0.08, -0.25, 0.22);
  head.add(eyeR); meshes.push(eyeR);

  const browL = new THREE.Mesh(geos.browGeo, mats.goblinSkinDark);
  browL.position.set(0.062, 0.068, 0.142);
  browL.rotation.z = -0.30;
  head.add(browL); meshes.push(browL);

  const browR = new THREE.Mesh(geos.browGeo, mats.goblinSkinDark);
  browR.position.set(-0.062, 0.068, 0.142);
  browR.rotation.z = 0.30;
  head.add(browR); meshes.push(browR);

  // Long Swept-Back Goblin Ears
  const earL = new THREE.Mesh(geos.earGeo, mats.goblinSkin);
  earL.position.set(0.185, 0.035, -0.02);
  earL.rotation.set(-0.42, 0.18, -1.18);
  head.add(earL); meshes.push(earL);

  const earR = new THREE.Mesh(geos.earGeo, mats.goblinSkin);
  earR.position.set(-0.185, 0.035, -0.02);
  earR.rotation.set(-0.42, -0.18, 1.18);
  head.add(earR); meshes.push(earR);

  // Riveted Iron Nasal Helm
  const helmGroup = new THREE.Group();
  helmGroup.name = 'goblin_helm';
  helmGroup.position.set(0, 0.045, 0);
  head.add(helmGroup);

  const helmDome = new THREE.Mesh(geos.helmDomeGeo, mats.ironCrude);
  helmDome.castShadow = true;
  helmGroup.add(helmDome); meshes.push(helmDome);

  const helmRim = new THREE.Mesh(geos.helmRimGeo, mats.pauldronDome);
  helmRim.position.set(0, 0.025, 0);
  helmGroup.add(helmRim); meshes.push(helmRim);

  const helmNasal = new THREE.Mesh(geos.helmNasalGeo, mats.steelBright);
  helmNasal.position.set(0, -0.015, 0.165);
  helmNasal.rotation.x = -0.08;
  helmGroup.add(helmNasal); meshes.push(helmNasal);

  const helmCrest = new THREE.Mesh(geos.helmCrestGeo, mats.pauldronDome);
  helmCrest.position.set(0, 0.155, -0.01);
  helmGroup.add(helmCrest); meshes.push(helmCrest);

  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(geos.helmHornGeo, mats.steelBright);
    horn.position.set(side * 0.135, 0.115, 0.02);
    horn.rotation.set(0.25, 0, -side * 0.72);
    helmGroup.add(horn); meshes.push(horn);
  }

  // Arms, Spiked Pauldrons, Left Buckler & Right Weapon Socket
  function buildArmBranch(isLeft) {
    const side = isLeft ? 1 : -1;
    const suffix = isLeft ? 'L' : 'R';

    const shoulder = new THREE.Group();
    shoulder.name = `shoulder${suffix}`;
    shoulder.position.set(side * 0.31, 0.13, 0.0);
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
    upperArm.position.set(side * 0.025, -0.03, 0);
    upperArm.rotation.set(-0.22, 0, side * 0.16);
    shoulder.add(upperArm);

    const upperArmMesh = new THREE.Mesh(geos.upperArmGeo, mats.goblinSkin);
    upperArmMesh.castShadow = true;
    upperArm.add(upperArmMesh); meshes.push(upperArmMesh);

    const foreArm = new THREE.Group();
    foreArm.name = `foreArm${suffix}`;
    foreArm.position.set(0, -0.21, 0);
    foreArm.rotation.x = -0.55;
    upperArm.add(foreArm);

    const foreArmMesh = new THREE.Mesh(geos.foreArmGeo, mats.goblinSkin);
    foreArm.add(foreArmMesh); meshes.push(foreArmMesh);

    const bracerMesh = new THREE.Mesh(geos.bracerGeo, mats.ironCrude);
    foreArm.add(bracerMesh); meshes.push(bracerMesh);

    // Left forearm carries a spiked iron goblin buckler
    if (isLeft) {
      const bucklerGroup = new THREE.Group();
      bucklerGroup.name = 'goblin_buckler';
      bucklerGroup.position.set(0.085, -0.12, 0.02);
      bucklerGroup.rotation.y = 0.25;
      foreArm.add(bucklerGroup);

      const disc = new THREE.Mesh(geos.bucklerDiscGeo, mats.ironCrude);
      disc.castShadow = true;
      bucklerGroup.add(disc); meshes.push(disc);

      const boss = new THREE.Mesh(geos.bucklerBossGeo, mats.steelBright);
      boss.position.set(0.02, 0, 0);
      bucklerGroup.add(boss); meshes.push(boss);

      const centerSpike = new THREE.Mesh(geos.pauldronSpikeGeo, mats.steelBright);
      centerSpike.position.set(0.08, 0, 0);
      centerSpike.rotation.z = -Math.PI / 2;
      bucklerGroup.add(centerSpike); meshes.push(centerSpike);
    }

    const hand = new THREE.Group();
    hand.name = `hand${suffix}`;
    hand.position.set(0, -0.21, 0);
    foreArm.add(hand);

    const handMesh = new THREE.Mesh(geos.handGeo, mats.goblinSkinDark);
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
  battleAxeGroup.name = 'goblin_waraxe';
  weaponSocketR.add(battleAxeGroup);

  const haft = new THREE.Mesh(geos.axeHaftGeo, mats.woodHaft);
  haft.position.set(0, 0.15, 0);
  battleAxeGroup.add(haft); meshes.push(haft);

  const gripWrap = new THREE.Mesh(geos.axeGripWrapGeo, mats.leatherHarness);
  gripWrap.position.set(0, -0.02, 0);
  battleAxeGroup.add(gripWrap); meshes.push(gripWrap);

  const axeCollar = new THREE.Mesh(geos.axeSocketCollarGeo, mats.ironCrude);
  axeCollar.position.set(0, 0.40, 0);
  battleAxeGroup.add(axeCollar); meshes.push(axeCollar);

  const axeBlade = new THREE.Mesh(geos.bladeBodyGeo, mats.ironCrude);
  axeBlade.position.set(0, 0.40, 0.14);
  axeBlade.castShadow = true;
  battleAxeGroup.add(axeBlade); meshes.push(axeBlade);

  const axeEdge = new THREE.Mesh(geos.bladeEdgeGeo, mats.steelBright);
  axeEdge.position.set(0, 0.40, 0.265);
  battleAxeGroup.add(axeEdge); meshes.push(axeEdge);

  const axeBackSpike = new THREE.Mesh(geos.backSpikeGeo, mats.steelBright);
  axeBackSpike.position.set(0, 0.40, -0.085);
  axeBackSpike.rotation.x = Math.PI * 0.5;
  battleAxeGroup.add(axeBackSpike); meshes.push(axeBackSpike);

  // Legs with Iron Greaves
  function buildLegBranch(isLeft) {
    const side = isLeft ? 1 : -1;
    const suffix = isLeft ? 'L' : 'R';

    const thigh = new THREE.Group();
    thigh.name = `thigh${suffix}`;
    thigh.position.set(side * 0.135, -0.04, 0);
    thigh.rotation.set(-0.18, 0, side * 0.06);
    hips.add(thigh);

    const thighMesh = new THREE.Mesh(geos.thighGeo, mats.goblinSkinDark);
    thighMesh.castShadow = true;
    thigh.add(thighMesh); meshes.push(thighMesh);

    const shin = new THREE.Group();
    shin.name = `shin${suffix}`;
    shin.position.set(0, -0.23, 0);
    shin.rotation.x = 0.26;
    thigh.add(shin);

    const shinMesh = new THREE.Mesh(geos.shinGeo, mats.leatherHarness);
    shin.add(shinMesh); meshes.push(shinMesh);

    const greaveMesh = new THREE.Mesh(geos.greaveGeo, mats.ironCrude);
    greaveMesh.position.set(0, -0.115, 0.032);
    shin.add(greaveMesh); meshes.push(greaveMesh);

    const foot = new THREE.Group();
    foot.name = `foot${suffix}`;
    foot.position.set(0, -0.23, 0);
    foot.rotation.x = -0.08;
    shin.add(foot);

    const footMesh = new THREE.Mesh(geos.footGeo, mats.ironCrude);
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
      if (m.material.color) {
        m.userData.baseColor = m.material.color.clone();
      }
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
        jawGroup.rotation.x = restRot.jaw.x + (0.04 + Math.sin(w * 0.8) * 0.05) * k;
        earL.rotation.z = restRot.earL.z + Math.sin(w * 1.3) * 0.04 * k;
        earR.rotation.z = restRot.earR.z - Math.sin(w * 1.3) * 0.04 * k;
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

        leftArm.shoulder.rotation.x = restRot.shoulderL.x - Math.sin(ph) * stride * 0.65;
        rightArm.shoulder.rotation.x = restRot.shoulderR.x + Math.sin(ph) * stride * 0.7;

        chest.rotation.y = Math.sin(ph) * 0.12 * k;
        hips.position.y = restPos.hips.y + Math.abs(Math.sin(ph)) * (isRun ? 0.065 : 0.032) * k;
        break;
      }
      case 'attack1':
      case 'attack2': {
        const swing = Math.sin(u * Math.PI);
        chest.rotation.y = Math.sin(u * Math.PI * 2) * 0.25 * k;
        chest.rotation.x = restRot.chest.x + (u < 0.4 ? -0.35 : 0.45) * swing * k;
        rightArm.shoulder.rotation.x = restRot.shoulderR.x + (u < 0.4 ? -1.4 : 1.2) * swing * k;
        rightArm.foreArm.rotation.x = restRot.foreArmR.x + (u < 0.4 ? -0.8 : 0.4) * swing * k;
        leftArm.shoulder.rotation.x = restRot.shoulderL.x - 0.35 * swing * k;
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
      if (m.material && m.material.color && m.userData.baseColor) {
        m.material.color.copy(m.userData.baseColor);
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