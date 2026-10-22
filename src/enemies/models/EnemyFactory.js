// src/enemies/models/EnemyFactory.js
// Main enemy model builder creating humanoid, non-humanoid, and boss models.
import * as THREE from 'three';
import { mulberry32, getGradientMap, getSharedVertexColorMat, getSharedSkinMat, getOutlineMat, getGeom, paintGeom, mergeGeoms, placeGeom, buildInvertedHullGeom, buildBannerGeom, ARCHETYPES } from '../shared.js';
import { getTypeGeometries } from './Geometries.js';
import { createGnollWarriorModel } from './ArmoredGoblin.js';
import { buildQuadrupedModel } from './Wolf.js';
import { applyBipedPose } from '../poses/bipedPoses.js';

export function createEnemyModel(type = 'goblin_grunt', opts = {}) {
  type = String(type || 'goblin_grunt').toLowerCase();
  if (
    type === 'goblin_armored' ||
    type === 'armored_goblin' ||
    type === 'gnoll' ||
    type === 'gnoll_warrior'
  ) {
    return createGnollWarriorModel(opts.seed ?? 1, opts);
  }
  const arch = ARCHETYPES[type] || ARCHETYPES.goblin_grunt;
  if (arch.isQuadruped) {
    return buildQuadrupedModel(type, arch, opts);
  }
  const seed = opts.seed ?? 1337;
  const rng = mulberry32(seed);
  const level = Math.max(1, Math.min(10, opts.level ?? 1));
  const useOutline = opts.outline !== undefined ? Boolean(opts.outline) : true;
  const scaleVar = opts.seed !== undefined ? 0.94 + rng() * 0.12 : 1.0;

  // Explicit opts.weapon ALWAYS overrides seed
  const validGruntWeapons = ['dualKnives', 'knifeShield', 'club'];
  const wVariant =
    type === 'goblin_grunt'
      ? validGruntWeapons.includes(opts.weapon)
        ? opts.weapon
        : validGruntWeapons[Math.floor(rng() * validGruntWeapons.length)]
      : opts.weapon || 'default';

  const armorTier = level >= 8 ? 2 : level >= 5 ? 1 : 0;

  const group = new THREE.Group();
  group.name = `enemy_${type}`;
  group.userData.weaponVariant = wVariant;

  const parts = {};
  const sockets = {};
  const anchors = {};
  const meshes = [];
  const outlines = [];
  const baseMats = new Map();

  let matsCloned = false;
  let currentEyeGlow = 1.0;
  let currentEnrage = 0.0;
  let currentExpr = 'neutral';

  const sharedVCMat = getSharedVertexColorMat();
  const sharedSkinMat = getSharedSkinMat();
  const outlineMat = getOutlineMat();

  const eyeMat = new THREE.MeshToonMaterial({
    color: 0xff2a2a,
    emissive: 0xff2a2a,
    emissiveIntensity: 1.5,
    gradientMap: getGradientMap()
  });

  let orbMat = null;
  let healRingMesh = null;
  let auraMesh = null;
  let bannerMesh = null;
  let bowStringMesh = null;
  let eyesMesh = null;
  let tongueMesh = null;

  function addPair(parent, geom, mat, olGeom = null) {
    const m = new THREE.Mesh(geom, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    meshes.push(m);
    baseMats.set(m, mat);

    if (olGeom) {
      const ol = new THREE.Mesh(olGeom, outlineMat);
      ol.visible = useOutline;
      m.add(ol);
      outlines.push(ol);
    }
    return m;
  }

  function makePivot(name, parent, x = 0, y = 0, z = 0) {
    const p = new THREE.Object3D();
    p.name = name;
    p.position.set(x, y, z);
    p.userData.restPos = p.position.clone();
    p.userData.restRot = new THREE.Euler();
    parent.add(p);
    parts[name] = p;
    return p;
  }

  const root = makePivot('root', group, 0, 0, 0);
  root.scale.setScalar(scaleVar);

  if (arch.isNonHumanoid) {
    const bodyY = arch.height * 0.45;
    const hips = makePivot('hips', root, 0, bodyY, 0);
    const torso = makePivot('torso', hips, 0, 0, 0);
    const head = makePivot('head', torso, 0, arch.height * 0.18, 0.12);
    const allNames = [
      'chest', 'neck', 'jaw', 'earL', 'earR',
      'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR',
      'hipL', 'hipR', 'kneeL', 'kneeR', 'footL', 'footR'
    ];
    for (const n of allNames) parts[n] = parts[n] || root;

    const mainG = getGeom(`nonHum_${type}`, () =>
      paintGeom(
        arch.isNonHumanoid === 'slime'
          ? new THREE.OctahedronGeometry(arch.height * 0.5, 2)
          : new THREE.DodecahedronGeometry(arch.height * 0.48, 1),
        arch.skinHex,
        0.75
      )
    );
    const mainOl = getGeom(`nonHumOl_${type}`, () => buildInvertedHullGeom(mainG, 0.015));
    addPair(torso, mainG, sharedVCMat, mainOl);

    const eyeG = getGeom('nonHumEyes', () => {
      const s = new THREE.SphereGeometry(0.038, 6, 5);
      return mergeGeoms([
        placeGeom(s, 0xff2a2a, 0.09, 0, 0.22),
        placeGeom(s, 0xff2a2a, -0.09, 0, 0.22)
      ]);
    });
    eyesMesh = addPair(head, eyeG, eyeMat, null);

    sockets.handR = root;
    sockets.handL = root;
    sockets.back = torso;
    sockets.head = head;
    anchors.head = new THREE.Object3D();
    anchors.head.position.set(0, arch.height, 0);
    root.add(anchors.head);
    anchors.chest = torso;
    anchors.weapon = head;
    anchors.feet = root;
  } else if (arch.isQuadruped) {
    const quadEyeColor = type === 'black_wolf' ? 0xff3322 : 0xffd23a;
    eyeMat.color.setHex(quadEyeColor);
    eyeMat.emissive.setHex(quadEyeColor);

    const shoulderH = arch.height || 0.95;
    const bodyL = arch.length || 1.7;
    const hipH = shoulderH * 0.92;

    const hips = makePivot('hips', root, 0, hipH, -bodyL * 0.35);
    const torso = makePivot('torso', hips, 0, 0, bodyL * 0.35);
    const chest = makePivot('chest', torso, 0, shoulderH * 0.08, bodyL * 0.35);
    const neck = makePivot('neck', chest, 0, shoulderH * 0.15, 0.22);
    const head = makePivot('head', neck, 0, 0.12, 0.25);
    const jaw = makePivot('jaw', head, 0, -0.08, 0.15);
    const earL = makePivot('earL', head, 0.12, 0.15, -0.05);
    const earR = makePivot('earR', head, -0.12, 0.15, -0.05);

    const tail1 = makePivot('tail1', hips, 0, 0.05, -0.15);
    const tail2 = makePivot('tail2', tail1, 0, -0.15, -0.2);
    const tail3 = makePivot('tail3', tail2, 0, -0.15, -0.2);

    const shoulderFL = makePivot('shoulderFL', chest, 0.22, -0.1, 0.1);
    const shoulderFR = makePivot('shoulderFR', chest, -0.22, -0.1, 0.1);
    const elbowFL = makePivot('elbowFL', shoulderFL, 0, -shoulderH * 0.4, 0);
    const elbowFR = makePivot('elbowFR', shoulderFR, 0, -shoulderH * 0.4, 0);
    const pawFL = makePivot('pawFL', elbowFL, 0, -shoulderH * 0.42, 0);
    const pawFR = makePivot('pawFR', elbowFR, 0, -shoulderH * 0.42, 0);

    const hipBL = makePivot('hipBL', hips, 0.20, -0.05, 0);
    const hipBR = makePivot('hipBR', hips, -0.20, -0.05, 0);
    const kneeBL = makePivot('kneeBL', hipBL, 0, -hipH * 0.42, 0);
    const kneeBR = makePivot('kneeBR', hipBR, 0, -hipH * 0.42, 0);
    const pawBL = makePivot('pawBL', kneeBL, 0, -hipH * 0.45, 0);
    const pawBR = makePivot('pawBR', kneeBR, 0, -hipH * 0.45, 0);

    anchors.head = new THREE.Object3D();
    anchors.head.position.set(0, 0.3, 0);
    head.add(anchors.head);

    anchors.chest = new THREE.Object3D();
    chest.add(anchors.chest);

    anchors.mouth = new THREE.Object3D();
    anchors.mouth.position.set(0, -0.05, 0.25);
    head.add(anchors.mouth);
    anchors.weapon = anchors.mouth;

    anchors.feet = new THREE.Object3D();
    root.add(anchors.feet);

    sockets.head = head;
    sockets.back = torso;
    sockets.handR = pawFR;
    sockets.handL = pawFL;

    const furColor = arch.skinHex || 0x4a4d55;
    const bodyG = getGeom('wolfBody', () => paintGeom(new THREE.BoxGeometry(0.44, 0.46, bodyL * 0.75), furColor, 0.85));
    addPair(torso, bodyG, sharedVCMat, null);

    const headG = getGeom('wolfHead', () => paintGeom(new THREE.BoxGeometry(0.32, 0.30, 0.42), furColor, 0.88));
    addPair(head, headG, sharedVCMat, null);

    const snoutG = getGeom('wolfSnout', () => paintGeom(new THREE.BoxGeometry(0.18, 0.16, 0.28), arch.furLightHex || 0x7c808c, 0.9));
    const snout = addPair(head, snoutG, sharedVCMat, null);
    snout.position.set(0, -0.05, 0.28);

    const earG = getGeom('wolfEar', () => paintGeom(new THREE.ConeGeometry(0.08, 0.2, 4), furColor, 0.8));
    earG.rotateX(0.2);
    addPair(earL, earG, sharedVCMat, null);
    addPair(earR, earG, sharedVCMat, null);

    const wolfEyeG = getGeom('wolfEyes', () => {
      const s = new THREE.SphereGeometry(0.035, 6, 5);
      return mergeGeoms([
        placeGeom(s, 0xffd23a, 0.10, 0.05, 0.2),
        placeGeom(s, 0xffd23a, -0.10, 0.05, 0.2)
      ]);
    });
    eyesMesh = addPair(head, wolfEyeG, eyeMat, null);

    if (type === 'goblin_hound') {
      const fangG = getGeom('houndFangs', () => {
        const c = new THREE.ConeGeometry(0.025, 0.12, 4);
        return mergeGeoms([
          placeGeom(c, 0xe5dec9, 0.06, -0.06, 0.26, Math.PI, 0, 0),
          placeGeom(c, 0xe5dec9, -0.06, -0.06, 0.26, Math.PI, 0, 0),
          placeGeom(c, 0xe5dec9, 0.03, -0.04, 0.30, Math.PI, 0, 0),
          placeGeom(c, 0xe5dec9, -0.03, -0.04, 0.30, Math.PI, 0, 0)
        ]);
      });
      addPair(head, fangG, sharedVCMat, null);
    }

    const legG = getGeom('wolfLeg', () => paintGeom(new THREE.BoxGeometry(0.12, shoulderH * 0.42, 0.14), furColor, 0.82));
    addPair(elbowFL, legG, sharedVCMat, null);
    addPair(elbowFR, legG, sharedVCMat, null);
    addPair(kneeBL, legG, sharedVCMat, null);
    addPair(kneeBR, legG, sharedVCMat, null);

    const tailG = getGeom('wolfTail', () => paintGeom(new THREE.BoxGeometry(0.12, 0.12, 0.26), furColor, 0.8));
    addPair(tail1, tailG, sharedVCMat, null);
    addPair(tail2, tailG, sharedVCMat, null);
    addPair(tail3, tailG, sharedVCMat, null);
  } else {
    const b = getTypeGeometries(type, arch, wVariant, armorTier);
    const legL = arch.legLen;
    const torsoH = arch.torsoH;
    const armL = arch.armLen;
    const hScale = arch.headScale;
    const hipW = arch.torsoWBot * 0.78;
    const shldrW = arch.torsoWTop * 1.12;
    const kBend = arch.kneeBend ?? 0.34;

    // Deep crouched legs & aggressive ~35 deg hunched torso with head thrust forward and low
    const hips = makePivot('hips', root, 0, legL * 1.74, 0);
    const torso = makePivot('torso', hips, 0, 0, 0);
    if (arch.hasWings) root.position.y = 0.3;
    torso.rotation.x = arch.hunch;
    torso.userData.restRot.copy(torso.rotation);

    const chest = makePivot('chest', torso, 0, torsoH * 0.55, 0);
    // Neck & head thrust forward (+Z) and kept lower than shoulder line
    const neck = makePivot('neck', chest, 0, torsoH * 0.28, arch.torsoWTop * 0.55);
    const head = makePivot('head', neck, 0, hScale * 0.06, hScale * 0.18);
    head.rotation.x = -arch.hunch * 0.85;
    head.userData.restRot.copy(head.rotation);

    const jaw = makePivot('jaw', head, 0, -hScale * 0.11, hScale * 0.20);
    const earL = makePivot('earL', head, hScale * 0.46, hScale * 0.14, 0);
    const earR = makePivot('earR', head, -hScale * 0.46, hScale * 0.14, 0);

    // Shoulders sit high & wide above head line from side view
    const shoulderL = makePivot('shoulderL', chest, shldrW, torsoH * 0.40, -0.02);
    const shoulderR = makePivot('shoulderR', chest, -shldrW, torsoH * 0.40, -0.02);
    shoulderL.rotation.set(-arch.hunch * 0.65, 0, 0.12);
    shoulderR.rotation.set(-arch.hunch * 0.65, 0, -0.12);
    shoulderL.userData.restRot.copy(shoulderL.rotation);
    shoulderR.userData.restRot.copy(shoulderR.rotation);

    const elbowL = makePivot('elbowL', shoulderL, 0, -armL, 0);
    const elbowR = makePivot('elbowR', shoulderR, 0, -armL, 0);
    elbowL.rotation.x = -0.32;
    elbowR.rotation.x = -0.32;
    elbowL.userData.restRot.copy(elbowL.rotation);
    elbowR.userData.restRot.copy(elbowR.rotation);

    const handL = makePivot('handL', elbowL, 0, -armL * 0.95, 0);
    const handR = makePivot('handR', elbowR, 0, -armL * 0.95, 0);

    // Bent knees in rest posture
    const hipL = makePivot('hipL', hips, hipW, 0, 0);
    const hipR = makePivot('hipR', hips, -hipW, 0, 0);
    hipL.rotation.set(-kBend, 0, 0.08);
    hipR.rotation.set(-kBend, 0, -0.08);
    hipL.userData.restRot.copy(hipL.rotation);
    hipR.userData.restRot.copy(hipR.rotation);

    const kneeL = makePivot('kneeL', hipL, 0, -legL, 0);
    const kneeR = makePivot('kneeR', hipR, 0, -legL, 0);
    kneeL.rotation.x = kBend * 1.85;
    kneeR.rotation.x = kBend * 1.85;
    kneeL.userData.restRot.copy(kneeL.rotation);
    kneeR.userData.restRot.copy(kneeR.rotation);

    const footL = makePivot('footL', kneeL, 0, -legL * 0.92, 0);
    const footR = makePivot('footR', kneeR, 0, -legL * 0.92, 0);

    // Avian talons for harpy
    if (arch.hasTalons) {
      const talonG = getGeom('harpyTalon', () => paintGeom(new THREE.ConeGeometry(0.025, 0.12, 4), 0x2a1a2a, 0.8));
      addPair(footL, talonG, sharedVCMat, null);
      addPair(footR, talonG, sharedVCMat, null);
    }

    // Feathered wings for harpy
    if (arch.hasWings) {
      const wingL = makePivot('wingL', chest, shldrW * 0.55, torsoH * 0.30, -0.05);
      const wingR = makePivot('wingR', chest, -shldrW * 0.55, torsoH * 0.30, -0.05);
      const featherG = getGeom('harpyFeather', () => paintGeom(new THREE.BoxGeometry(0.06, 0.02, 0.35), 0x6a4a8a, 0.8));
      for (let i = 0; i < 4; i++) {
        const fL = makePivot(`featherL${i}`, wingL, 0.05, 0, 0.12 + i * 0.09);
        addPair(fL, featherG, sharedVCMat, null);
        const fR = makePivot(`featherR${i}`, wingR, -0.05, 0, 0.12 + i * 0.09);
        addPair(fR, featherG, sharedVCMat, null);
      }
    }

    sockets.handR = handR;
    sockets.handL = handL;
    sockets.back = chest;
    sockets.head = head;

    if (arch.hasHorn) {
      const hornG = getGeom('goblinHorn', () => paintGeom(new THREE.ConeGeometry(0.08, 0.4, 8), 0xb8860b, 0.8));
      const horn = new THREE.Mesh(hornG, sharedVCMat);
      horn.position.set(0, 0, 0.15);
      handR.add(horn);
      parts.hornMesh = horn;
    }

    anchors.head = new THREE.Object3D();
    anchors.head.position.set(0, hScale * 0.95, 0);
    head.add(anchors.head);

    anchors.chest = new THREE.Object3D();
    anchors.chest.position.set(0, torsoH * 0.1, arch.torsoWTop * 0.5);
    chest.add(anchors.chest);

    anchors.feet = new THREE.Object3D();
    root.add(anchors.feet);

    anchors.weapon = new THREE.Object3D();
    anchors.weapon.position.set(0, 0, arch.isBoss ? 1.15 : 0.45);
    handR.add(anchors.weapon);

    // Attach merged limb & body meshes (minimal mesh count!)
    addPair(hips, b.hipsGeom, sharedVCMat, b.hipsOl);
    addPair(torso, b.torsoSkinGeom, sharedSkinMat, b.torsoOl);
    if (b.chestGearGeom) addPair(torso, b.chestGearGeom, sharedVCMat, null);

    addPair(head, b.headSkinGeom, sharedSkinMat, b.headOl);
    addPair(head, b.headDetailGeom, sharedVCMat, null);
    eyesMesh = addPair(head, b.eyesGeom, eyeMat, null);
    addPair(jaw, b.jawGeom, sharedVCMat, b.jawOl);

    if (!arch.isBoss && !arch.hasPointedHood) {
      tongueMesh = addPair(jaw, b.tongueGeom, sharedVCMat, null);
      tongueMesh.position.set(0, -0.01, hScale * 0.35);
      tongueMesh.rotation.x = Math.PI * 0.78;
    }

    addPair(shoulderL, b.uArmLGeom, sharedVCMat, b.uArmLOl);
    addPair(shoulderR, b.uArmRGeom, sharedVCMat, b.uArmROl);
    addPair(elbowL, b.fArmLGeom, sharedVCMat, b.fArmLOl);
    addPair(elbowR, b.fArmRGeom, sharedVCMat, b.fArmROl);

    addPair(hipL, b.thighGeom, sharedSkinMat, b.thighOl);
    addPair(hipR, b.thighGeom, sharedSkinMat, b.thighOl);
    addPair(kneeL, b.calfGeom, sharedVCMat, b.calfOl);
    addPair(kneeR, b.calfGeom, sharedVCMat, b.calfOl);

    // Special animated attachments (bowstring, shaman orb+heal ring, leader banner, boss aura)
    if (type === 'goblin_archer' || type === 'orc_archer') {
      const strG = getGeom('bowString', () => paintGeom(new THREE.CylinderGeometry(0.004, 0.004, 0.58, 4), 0xd2c8b0));
      bowStringMesh = addPair(handL, strG, sharedVCMat, null);
      bowStringMesh.position.set(0, 0, -0.05);
    }

    if (type === 'goblin_shaman') {
      orbMat = new THREE.MeshToonMaterial({
        color: 0x33ff66,
        emissive: 0x22ee55,
        emissiveIntensity: 1.6,
        gradientMap: getGradientMap()
      });
      const orbG = getGeom('shamanOrb', () => new THREE.SphereGeometry(0.08, 8, 6));
      const orb = addPair(elbowR, orbG, orbMat, null);
      orb.position.set(0, -armL * 0.95 + 0.85, 0.30);

      const ringG = getGeom('healPulseRing', () => {
        const g = new THREE.RingGeometry(0.32, 0.44, 16);
        g.rotateX(-Math.PI * 0.5);
        return g;
      });
      healRingMesh = new THREE.Mesh(ringG, orbMat);
      healRingMesh.position.y = 0.03;
      healRingMesh.visible = false;
      root.add(healRingMesh);
    }

    if (arch.hasBanner) {
      const banG = buildBannerGeom();
      const banMat = getSharedVertexColorMat('vcDouble');
      banMat.side = THREE.DoubleSide;
      bannerMesh = addPair(torso, banG, banMat, null);
      bannerMesh.position.set(0, torsoH * 1.92, -arch.torsoWTop * 0.60);
      bannerMesh.userData.baseZ = Float32Array.from(banG.attributes.position.array);
    }

    if (arch.isBoss || type === 'goblin_leader') {
      const auraG = getGeom(`aura_${type}`, () =>
        new THREE.CapsuleGeometry(arch.torsoWTop * 1.35, arch.torsoH * 1.1, 4, 8)
      );
      const auraMat = new THREE.MeshBasicMaterial({
        color: 0xff2200,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide
      });
      auraMesh = new THREE.Mesh(auraG, auraMat);
      auraMesh.position.y = arch.torsoH * 0.45;
      auraMesh.visible = false;
      torso.add(auraMesh);
    }
  }

  function ensureClonedMaterials() {
    if (matsCloned) return;
    matsCloned = true;
    for (const m of meshes) {
      m.material = m.material.clone();
    }
    for (const ol of outlines) {
      ol.material = ol.material.clone();
    }
  }

  function resetRigToRest() {
    for (const key in parts) {
      const p = parts[key];
      if (p.userData.restPos) p.position.copy(p.userData.restPos);
      if (p.userData.restRot) p.rotation.copy(p.userData.restRot);
    }
    root.scale.setScalar(scaleVar * (1 + currentEnrage * 0.06));
    if (healRingMesh) healRingMesh.visible = false;
    if (tongueMesh) {
      tongueMesh.rotation.set(Math.PI * 0.78, 0, 0);
      tongueMesh.scale.set(1, 1, 1);
    }
  }

  function applyExpressionOffsets(t = 0) {
    if (!parts.jaw || arch.isNonHumanoid) return;
    if (tongueMesh) {
      tongueMesh.rotation.z = Math.sin(t * 5.2) * 0.22;
    }
    if (currentExpr === 'snarl') {
      parts.jaw.rotation.x += 0.38;
    } else if (currentExpr === 'pain') {
      parts.jaw.rotation.x += 0.48;
      parts.head.rotation.z += 0.16;
    } else if (currentExpr === 'afraid') {
      parts.jaw.rotation.x += 0.28;
      parts.head.rotation.x -= 0.15;
    } else if (currentExpr === 'dead') {
      parts.jaw.rotation.x += 0.52;
      if (eyesMesh) eyesMesh.scale.y = 0.15;
    }
  }


  function setPose(name, t = 0, intensity = 1) {
    applyBipedPose(name, t, intensity, parts, arch, bannerMesh, eyesMesh, tongueMesh, resetRigToRest, applyExpressionOffsets);
  }


  function setEyeGlow(intensity = 1) {
    currentEyeGlow = Math.max(0, Math.min(2, intensity));
    eyeMat.emissiveIntensity = currentEyeGlow * 1.5 + currentEnrage * 0.8;
    const s = 1 + Math.max(0, currentEyeGlow - 1) * 0.35;
    if (eyesMesh) eyesMesh.scale.set(1, s, 1);
  }

  function setExpression(name = 'neutral') {
    currentExpr = name;
    if (eyesMesh && name !== 'dead') {
      eyesMesh.scale.y = 1;
    }
  }

  function setTint(hex, amount = 0) {
    ensureClonedMaterials();
    const a = Math.max(0, Math.min(1, amount));
    const target = hex !== null && hex !== undefined ? new THREE.Color(hex) : null;
    for (const m of meshes) {
      const base = baseMats.get(m);
      if (!base) continue;
      m.material.color.copy(base.color);
      if (target && a > 0) {
        m.material.color.lerp(target, a);
      }
    }
  }

  function setOpacity(a = 1) {
    ensureClonedMaterials();
    const op = Math.max(0, Math.min(1, a));
    const isTrans = op < 0.999;
    for (const m of meshes) {
      m.material.transparent = isTrans;
      m.material.opacity = op;
      m.material.depthWrite = !isTrans;
    }
    for (const ol of outlines) {
      ol.material.transparent = isTrans;
      ol.material.opacity = op;
      ol.material.depthWrite = !isTrans;
    }
  }

  function setEnrage(amount = 0) {
    currentEnrage = Math.max(0, Math.min(1, amount));
    ensureClonedMaterials();
    const rageCol = new THREE.Color(0xc82818);
    for (const m of meshes) {
      const base = baseMats.get(m);
      if (base === sharedSkinMat) {
        m.material.color.copy(base.color).lerp(rageCol, currentEnrage * 0.45);
      }
    }
    if (auraMesh) {
      auraMesh.visible = currentEnrage > 0.01;
      auraMesh.material.opacity = currentEnrage * 0.34;
    }
    setEyeGlow(1 + currentEnrage);
    root.scale.setScalar(scaleVar * (1 + currentEnrage * 0.06));
  }

  function setOutlineVisible(bool) {
    const v = Boolean(bool);
    for (const ol of outlines) ol.visible = v;
  }

  function getBounds() {
    group.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(group);
  }

  function dispose() {
    if (matsCloned) {
      for (const m of meshes) m.material.dispose();
      for (const ol of outlines) ol.material.dispose();
    }
    eyeMat.dispose();
    if (orbMat) orbMat.dispose();
    if (auraMesh) auraMesh.material.dispose();
  }

  setPose('idle', 0, 1);

  return {
    group,
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
    dispose
  };
}
