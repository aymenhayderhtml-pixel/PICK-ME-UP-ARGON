import * as THREE from 'three';
import { evaluateWeaponPose } from './weaponAnimations.js';
import {
  OUTLINE_COLOR,
  SKIN_PALETTE,
  HAIR_PALETTE,
  TOP_PALETTE,
  VEST_PALETTE,
  BOTTOM_PALETTE,
  BOOTS_PALETTE,
  ACCENT_PALETTE,
  BUILD_SCALES,
  mulberry32,
  pick,
  pickMutedColor,
  getToonMaterial,
  createInflatedOutlineGeo,
  getCachedGeo,
  makeHeadGeo,
  getFaceTexture,
  buildHairAndBeardGeo,
  getPelvisGeo,
  getTorsoGeo,
  getChestGeo,
  getChestDetailGeo,
  getNeckGeo,
  getUpperArmGeo,
  getForearmGeo,
  getHandMeshGeo,
  getThighGeo,
  getCalfGeo,
  getFootGeo,
  getArmorCuirassGeo,
  getArmorPauldronsGeo
} from './heroParts.js';

export const HERO_POSES = [
  'idle', 'walk', 'run', 'attack1', 'attack2', 'attack3', 'comboLoop',
  'block', 'roll', 'hit', 'panic', 'afraid', 'death',
  'trainWeapon', 'trainSword', 'trainGreatsword', 'trainSpear', 'trainDagger',
  'trainBow', 'trainStaff', 'trainMace', 'trainClub', 'trainPickaxe', 'trainMagic',
  'mine', 'talk', 'cheer'
];

const _scratchTintColor = new THREE.Color();
const _scratchInvMatrix = new THREE.Matrix4();

export function createHeroModel(opts = {}) {
  const seed = opts.seed !== undefined ? opts.seed : 1337;
  const rng = mulberry32(seed);

  const heightScale = opts.heightScale ?? (0.94 + rng() * 0.14);
  const buildName = opts.build ?? pick(rng, ['slim', 'average', 'stocky', 'muscular']);
  const build = BUILD_SCALES[buildName] || BUILD_SCALES.average;

  const skinTone = opts.skinTone !== undefined ? opts.skinTone : pickMutedColor(rng, SKIN_PALETTE, 0.48, 0.22, 0.90);
  const faceStyle = opts.faceStyle ?? pick(rng, ['neutral', 'stern', 'young', 'old', 'fierce']);

  const hairStyles = ['spiky', 'short', 'long', 'braid', 'ponytail', 'bowl', 'bald', 'messy'];
  const hairStyle = opts.hair?.style ?? (typeof opts.hair === 'string' ? opts.hair : pick(rng, hairStyles));
  const hairColor = opts.hair?.color !== undefined
    ? opts.hair.color
    : (typeof opts.hair === 'number' ? opts.hair : pickMutedColor(rng, HAIR_PALETTE, 0.45, 0.05, 0.75));
  const facialHair = opts.facialHair ?? (faceStyle === 'old' ? 'beard' : pick(rng, ['none', 'none', 'stubble', 'mustache', 'beard']));

  const outfitOpts = opts.outfit || {};
  const armorColor = typeof opts.armor === 'number' ? opts.armor : (opts.armor?.color);
  const topType = outfitOpts.top ?? (opts.armor ? 'vest' : pick(rng, ['shirt', 'shirtRolled', 'tunic', 'vest', 'robe']));
  const topColor = outfitOpts.topColor !== undefined ? outfitOpts.topColor : (armorColor !== undefined ? armorColor : pickMutedColor(rng, TOP_PALETTE, 0.30, 0.20, 0.92));
  const vestColor = outfitOpts.vestColor !== undefined ? outfitOpts.vestColor : pickMutedColor(rng, VEST_PALETTE, 0.28, 0.12, 0.55);
  const bottomType = outfitOpts.bottom ?? 'trousers';
  const bottomColor = outfitOpts.bottomColor !== undefined ? outfitOpts.bottomColor : pickMutedColor(rng, BOTTOM_PALETTE, 0.25, 0.08, 0.45);
  const bootsColor = outfitOpts.bootsColor !== undefined ? outfitOpts.bootsColor : pickMutedColor(rng, BOOTS_PALETTE, 0.30, 0.06, 0.38);
  const accentColor = outfitOpts.accentColor !== undefined ? outfitOpts.accentColor : pickMutedColor(rng, ACCENT_PALETTE, 0.32, 0.10, 0.48);
  let outlineVisible = opts.outline !== undefined ? Boolean(opts.outline) : true;

  const group = new THREE.Group();
  group.userData.equippedWeaponKind = opts.weaponKind || 'sword';
  group.userData.equippedShieldKind = opts.shieldKind || null;
  group.userData.animBlender = {
    lastAction: null,
    lastWeapon: null,
    blendElapsed: 1.0,
    blendDuration: 0.09,
    snapshot: null,
    current: null
  };
  const root = new THREE.Group();
  root.scale.setScalar(heightScale);
  group.add(root);

  const hips = new THREE.Group();
  hips.position.set(0, 0.88, 0);
  root.add(hips);

  const torso = new THREE.Group();
  torso.position.set(0, 0.04, 0);
  hips.add(torso);

  const chest = new THREE.Group();
  chest.position.set(0, 0.18, 0);
  torso.add(chest);

  const neck = new THREE.Group();
  neck.position.set(0, 0.24, 0);
  chest.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 0.05, 0);
  neck.add(head);

  const shoulderX = 0.162 * build.shoulder;
  const shoulderL = new THREE.Group();
  shoulderL.position.set(shoulderX, 0.21, 0);
  chest.add(shoulderL);

  const shoulderR = new THREE.Group();
  shoulderR.position.set(-shoulderX, 0.21, 0);
  chest.add(shoulderR);

  const elbowL = new THREE.Group();
  elbowL.position.set(0, -0.24, 0);
  shoulderL.add(elbowL);

  const elbowR = new THREE.Group();
  elbowR.position.set(0, -0.24, 0);
  shoulderR.add(elbowR);

  const handL = new THREE.Group();
  handL.position.set(0, -0.21, 0);
  elbowL.add(handL);

  const handR = new THREE.Group();
  handR.position.set(0, -0.21, 0);
  elbowR.add(handR);

  const hipX = 0.084 * build.sx;
  const hipL = new THREE.Group();
  hipL.position.set(hipX, 0, 0);
  hips.add(hipL);

  const hipR = new THREE.Group();
  hipR.position.set(-hipX, 0, 0);
  hips.add(hipR);

  const kneeL = new THREE.Group();
  kneeL.position.set(0, -0.40, 0);
  hipL.add(kneeL);

  const kneeR = new THREE.Group();
  kneeR.position.set(0, -0.40, 0);
  hipR.add(kneeR);

  const footL = new THREE.Group();
  footL.position.set(0, -0.40, 0);
  kneeL.add(footL);

  const footR = new THREE.Group();
  footR.position.set(0, -0.40, 0);
  kneeR.add(footR);

  const sockets = {
    handR: new THREE.Group(),
    handL: new THREE.Group(),
    staffHand: new THREE.Group(),
    back: new THREE.Group(),
    hip: new THREE.Group(),
    head: new THREE.Group()
  };
  sockets.handR.position.set(0, -0.022, 0.005);
  handR.add(sockets.handR);
  sockets.staffHand.name = 'socket_staffHand';
  sockets.staffHand.position.set(0, -0.022, 0.005);
  handR.add(sockets.staffHand);
  sockets.handL.position.set(0, -0.022, 0.005);
  handL.add(sockets.handL);
  sockets.back.position.set(0, 0.12, -0.11 * build.sz);
  chest.add(sockets.back);
  sockets.hip.position.set(-0.13 * build.sx, -0.02, 0);
  hips.add(sockets.hip);
  sockets.head.position.set(0, 0.21, 0);
  head.add(sockets.head);

  const allMeshes = [];
  const outlineMeshes = [];
  const baseColors = new Map();
  let hasClonedMaterials = false;

  const skinMat = getToonMaterial(skinTone);
  const hairMat = getToonMaterial(hairColor);
  const topMat = getToonMaterial(topColor);
  const detailMat = getToonMaterial(topType === 'vest' ? vestColor : accentColor);
  const bottomMat = getToonMaterial(bottomColor);
  const bootsMat = getToonMaterial(bootsColor);
  const outlineMat = getToonMaterial(OUTLINE_COLOR, { outline: true });

  let currentExpression = 'neutral';
  const makeFaceMat = (expr) => {
    const tex = getFaceTexture(skinTone, faceStyle, expr, facialHair, hairColor);
    const mapId = `${skinTone}_${faceStyle}_${expr}_${facialHair}_${hairColor}`;
    return getToonMaterial(0xffffff, { map: tex, mapId });
  };

  function addPartMesh(parent, geo, mat, scaleVec = [1, 1, 1], withOutline = false) {
    if (!geo) return null;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(...scaleVec);
    parent.add(mesh);
    allMeshes.push(mesh);
    baseColors.set(mesh, mat.color.clone());

    if (withOutline) {
      const outGeo = getCachedGeo(`out_${geo.uuid}`, () => createInflatedOutlineGeo(geo, 0.007));
      const outMesh = new THREE.Mesh(outGeo, outlineMat);
      outMesh.visible = outlineVisible;
      mesh.add(outMesh);
      outlineMeshes.push(outMesh);
    }
    return mesh;
  }

  addPartMesh(hips, getPelvisGeo(), bottomMat, [build.sx, 1, build.sz], false);
  addPartMesh(torso, getTorsoGeo(topType), topMat, [build.sx, 1, build.sz], true);
  addPartMesh(chest, getChestGeo(topType), topMat, [build.sx, 1, build.sz], true);
  addPartMesh(chest, getChestDetailGeo(topType), detailMat, [build.sx, 1, build.sz], false);

  const neckGeo = getNeckGeo();
  addPartMesh(neck, neckGeo, skinMat, [1, 1, 1], false);

  const headMesh = addPartMesh(head, makeHeadGeo(), makeFaceMat(currentExpression), [1, 1, 1], true);
  const hairGeo = buildHairAndBeardGeo(hairStyle, facialHair === 'beard');
  if (hairGeo) addPartMesh(head, hairGeo, hairMat, [1, 1, 1], true);

  const upperArmGeo = getUpperArmGeo(topType);
  addPartMesh(shoulderL, upperArmGeo, topMat, [build.arm, 1, build.arm], true);
  addPartMesh(shoulderR, upperArmGeo, topMat, [build.arm, 1, build.arm], true);

  const forearmGeo = getForearmGeo();
  addPartMesh(elbowL, forearmGeo, skinMat, [build.arm, 1, build.arm], false);
  addPartMesh(elbowR, forearmGeo, skinMat, [build.arm, 1, build.arm], false);

  const handMeshGeo = getHandMeshGeo();
  addPartMesh(handL, handMeshGeo, skinMat, [build.arm, 1, build.arm], false);
  addPartMesh(handR, handMeshGeo, skinMat, [build.arm, 1, build.arm], false);

  const thighGeo = getThighGeo();
  addPartMesh(hipL, thighGeo, bottomMat, [build.leg, 1, build.leg], true);
  addPartMesh(hipR, thighGeo, bottomMat, [build.leg, 1, build.leg], true);

  const calfGeo = getCalfGeo(bottomType);
  const calfMat = bottomType === 'shorts' ? skinMat : bootsMat;
  addPartMesh(kneeL, calfGeo, calfMat, [build.leg, 1, build.leg], true);
  addPartMesh(kneeR, calfGeo, calfMat, [build.leg, 1, build.leg], true);

  const footGeo = getFootGeo();
  addPartMesh(footL, footGeo, bootsMat, [1, 1, 1], false);
  addPartMesh(footR, footGeo, bootsMat, [1, 1, 1], false);

  const armorMeshes = [];

  function clearArmor() {
    while (armorMeshes.length > 0) {
      const m = armorMeshes.pop();
      if (m.parent) m.parent.remove(m);
      const idx = allMeshes.indexOf(m);
      if (idx !== -1) allMeshes.splice(idx, 1);
      baseColors.delete(m);
    }
  }

  function setArmor(spec) {
    clearArmor();
    if (!spec) return;
    const armorCol = spec.color ?? (spec.type === 'leather' ? 0x6b472e : spec.type === 'chain' ? 0x7c8288 : 0x9aa2ab);
    const aMat = getToonMaterial(armorCol);

    const cuirassGeo = getArmorCuirassGeo(spec.type);
    const pauldronsGeo = getArmorPauldronsGeo(spec.type);

    const mChest = addPartMesh(chest, cuirassGeo, aMat, [build.sx, 1, build.sz], false);
    const mShL = addPartMesh(shoulderL, pauldronsGeo, aMat, [1, 1, 1], false);
    const mShR = addPartMesh(shoulderR, pauldronsGeo, aMat, [1, 1, 1], false);
    armorMeshes.push(mChest, mShL, mShR);
  }

  if (opts.armor) {
    const aType = typeof opts.armor === 'string' ? opts.armor : (opts.armor?.type || 'plate');
    const aColor = typeof opts.armor === 'number' ? opts.armor : (opts.armor?.color ?? 0x7c8288);
    setArmor({ type: aType, color: aColor });
  }

  function ensureClonedMaterials() {
    if (hasClonedMaterials) return;
    hasClonedMaterials = true;
    for (const m of allMeshes) {
      m.material = m.material.clone();
      baseColors.set(m, m.material.color.clone());
    }
  }

  function setTint(hex, amount = 0) {
    if (!hex || amount <= 0) {
      if (!hasClonedMaterials) return;
      for (const m of allMeshes) {
        const base = baseColors.get(m);
        if (base) m.material.color.copy(base);
      }
      return;
    }
    ensureClonedMaterials();
    const target = new THREE.Color(hex);
    const clamped = Math.max(0, Math.min(1, amount));
    for (const m of allMeshes) {
      const base = baseColors.get(m);
      if (base) m.material.color.copy(base).lerp(target, clamped);
    }
  }

  let clonedOutlineMat = null;
  function setOpacity(a) {
    const alpha = Math.max(0, Math.min(1, a));
    const isTrans = alpha < 0.999;
    ensureClonedMaterials();
    for (const m of allMeshes) {
      m.material.transparent = isTrans;
      m.material.opacity = alpha;
      m.material.depthWrite = !isTrans;
      m.material.needsUpdate = true;
    }
    if (!clonedOutlineMat && isTrans) {
      clonedOutlineMat = outlineMat.clone();
      for (const om of outlineMeshes) om.material = clonedOutlineMat;
    }
    if (clonedOutlineMat) {
      clonedOutlineMat.transparent = isTrans;
      clonedOutlineMat.opacity = alpha;
      clonedOutlineMat.depthWrite = !isTrans;
    }
  }

  function setOutlineVisible(bool) {
    outlineVisible = Boolean(bool);
    for (const om of outlineMeshes) om.visible = outlineVisible;
  }

  function setExpression(name) {
    const valid = ['neutral', 'angry', 'afraid', 'pain', 'dead', 'happy'];
    currentExpression = valid.includes(name) ? name : 'neutral';
    const nextMat = makeFaceMat(currentExpression);
    if (hasClonedMaterials) {
      headMesh.material.map = nextMat.map;
      headMesh.material.needsUpdate = true;
    } else {
      headMesh.material = nextMat;
    }
  }

  const parts = {
    root, hips, torso, chest, neck, head,
    shoulderL, shoulderR, elbowL, elbowR, handL, handR,
    hipL, hipR, kneeL, kneeR, footL, footR
  };

  function resetPose() {
    hips.position.set(0, 0.88, 0);
    for (const key in parts) {
      if (key !== 'root') parts[key].rotation.set(0, 0, 0);
    }
    shoulderL.rotation.z = 0.08;
    shoulderR.rotation.z = -0.08;
  }

  function setPose(name, t = 0, intensity = 1, context = null) {
    resetPose();
    const k = Math.max(0, intensity);

    const weaponKind = context?.weaponKind || group.userData.equippedWeaponKind || 'sword';
    const shieldKind = context?.shieldKind !== undefined ? context.shieldKind : (group.userData.equippedShieldKind || null);

    const WEAPON_AWARE_POSES = new Set([
      'idle', 'walk', 'run', 'attack1', 'attack2', 'attack3', 'comboLoop',
      'block', 'mine', 'trainWeapon', 'trainSword', 'trainGreatsword', 'trainSpear',
      'trainDagger', 'trainBow', 'trainStaff', 'trainMace', 'trainClub', 'trainPickaxe', 'trainMagic',
      'aimReady', 'reach', 'nock', 'raise', 'fullDraw', 'release', 'vibrate', 'aim', 'shoot',
      'cast', 'ultimateChannel', 'spellCast', 'staffCast'
    ]);

    if (WEAPON_AWARE_POSES.has(name)) {
      evaluateWeaponPose(parts, sockets, {
        name,
        t,
        intensity: k,
        weaponKind,
        shieldKind,
        dt: context?.dt || 0.016,
        moving: context?.moving,
        bowDraw: context?.bowDraw,
        arrowVisible: context?.arrowVisible,
        vibTime: context?.vibTime,
        isTremor: context?.isTremor,
        overdraw: context?.overdraw
      });
      if (parts.root.userData.bowState) {
        group.userData.bowState = parts.root.userData.bowState;
      }
      return;
    }

    switch (name) {
      case 'roll': {
        const raw = t > 0.4 ? (t % 0.55) : Math.max(0, t);
        const u = Math.min(1, raw / 0.4);
        const tuck = Math.sin(u * Math.PI);
        hips.position.y = 0.88 - tuck * 0.46;
        hips.position.z = Math.sin(u * Math.PI) * 0.18;
        hips.rotation.x = u * Math.PI * 2;
        torso.rotation.x = tuck * 0.75;
        head.rotation.x = tuck * 0.55;
        hipL.rotation.x = -tuck * 1.35;
        hipR.rotation.x = -tuck * 1.35;
        kneeL.rotation.x = tuck * 1.75;
        kneeR.rotation.x = tuck * 1.75;
        shoulderL.rotation.x = -tuck * 1.25;
        shoulderR.rotation.x = -tuck * 1.25;
        elbowL.rotation.x = -tuck * 1.35;
        elbowR.rotation.x = -tuck * 1.35;
        break;
      }
      case 'hit': {
        const raw = t > 0.25 ? (t % 0.45) : Math.max(0, t);
        const u = Math.min(1, raw / 0.25);
        const recoil = Math.sin(u * Math.PI) * k;
        hips.position.z = -recoil * 0.10;
        hips.position.y = 0.88 - recoil * 0.04;
        torso.rotation.x = -0.45 * recoil;
        chest.rotation.x = -0.25 * recoil;
        chest.rotation.y = 0.28 * recoil;
        head.rotation.x = -0.52 * recoil;
        shoulderL.rotation.x = -0.45 * recoil;
        shoulderR.rotation.x = -0.45 * recoil;
        shoulderL.rotation.z = 0.65 * recoil;
        shoulderR.rotation.z = -0.65 * recoil;
        hipL.rotation.x = 0.22 * recoil;
        kneeL.rotation.x = 0.25 * recoil;
        break;
      }
      case 'panic': {
        const w = t * 14.0;
        hips.position.y = 0.86 + Math.abs(Math.sin(w)) * 0.04 * k;
        torso.rotation.z = Math.sin(w * 0.5) * 0.15 * k;
        head.rotation.y = Math.sin(w * 0.7) * 0.35 * k;
        shoulderL.rotation.x = -2.4 + Math.sin(w) * 0.45 * k;
        shoulderR.rotation.x = -2.4 - Math.sin(w) * 0.45 * k;
        hipL.rotation.x = Math.sin(w) * 0.45 * k;
        hipR.rotation.x = -Math.sin(w) * 0.45 * k;
        break;
      }
      case 'afraid': {
        const tremor = Math.sin(t * 38.0) * 0.025 * k;
        hips.position.y = 0.78;
        hips.position.x = tremor;
        torso.rotation.x = 0.38 * k;
        head.rotation.x = -0.22 * k;
        head.rotation.y = tremor * 2.5;
        shoulderL.rotation.x = -1.35 * k;
        shoulderR.rotation.x = -1.35 * k;
        elbowL.rotation.x = -1.55 * k;
        elbowR.rotation.x = -1.55 * k;
        hipL.rotation.x = -0.45 * k;
        hipR.rotation.x = -0.45 * k;
        kneeL.rotation.x = 0.75 * k;
        kneeR.rotation.x = 0.75 * k;
        break;
      }
      case 'death': {
        const u = Math.min(1, Math.max(0, t / 1.6));
        if (u < 0.45) {
          const k1 = u / 0.45;
          hips.position.y = 0.88 - k1 * 0.38;
          torso.rotation.x = k1 * 0.45;
          kneeL.rotation.x = k1 * 1.35;
          kneeR.rotation.x = k1 * 1.35;
          hipL.rotation.x = -k1 * 0.65;
          hipR.rotation.x = -k1 * 0.65;
        } else {
          const k2 = (u - 0.45) / 0.55;
          const ease = 1 - Math.pow(1 - k2, 3);
          hips.position.y = 0.50 - ease * 0.39;
          hips.rotation.x = ease * (Math.PI * 0.48);
          torso.rotation.x = 0.45 * (1 - ease);
          kneeL.rotation.x = 1.35 * (1 - ease * 0.8);
          kneeR.rotation.x = 1.35 * (1 - ease * 0.8);
          shoulderL.rotation.z = 0.45 * ease;
          shoulderR.rotation.z = -0.45 * ease;
        }
        break;
      }
      case 'talk': {
        const w = t * 4.5;
        head.rotation.x = Math.sin(w) * 0.08 * k;
        head.rotation.y = Math.cos(w * 0.6) * 0.12 * k;
        shoulderR.rotation.x = -0.45 + Math.sin(w * 0.8) * 0.18 * k;
        elbowR.rotation.x = -0.85 + Math.cos(w) * 0.15 * k;
        elbowL.rotation.x = -0.25;
        break;
      }
      case 'cheer': {
        const w = t * 7.5;
        const jump = Math.max(0, Math.sin(w));
        hips.position.y = 0.88 + jump * 0.08 * k;
        shoulderL.rotation.x = -2.6 + Math.sin(w) * 0.25 * k;
        shoulderR.rotation.x = -2.6 - Math.sin(w) * 0.25 * k;
        head.rotation.x = -0.18 * k;
        break;
      }
    }
  }

  setPose('idle', 0, 1);

  function getBounds() {
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    box.applyMatrix4(group.matrixWorld.clone().invert());
    return box;
  }

  function dispose() {
    clearArmor();
    if (hasClonedMaterials) {
      for (const m of allMeshes) m.material.dispose();
    }
    if (clonedOutlineMat) clonedOutlineMat.dispose();
  }

  return {
    group,
    parts,
    sockets,
    userData: group.userData,
    setPose,
    setExpression,
    setArmor,
    setTint,
    setOpacity,
    setOutlineVisible,
    getBounds,
    dispose
  };
}