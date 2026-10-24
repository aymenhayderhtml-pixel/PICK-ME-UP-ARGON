import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE, TIME_KEYFRAMES } from './shellConfig.js';
import { createRng, ensureNonIndexedColoredGeometry } from './shellTextures.js';

const _tempMat4 = new THREE.Matrix4();
const _tempPos = new THREE.Vector3();
const _tempQuat = new THREE.Quaternion();
const _tempEuler = new THREE.Euler();
const _tempScale = new THREE.Vector3(1, 1, 1);
const _colorA = new THREE.Color();
const _colorB = new THREE.Color();
const _colorC = new THREE.Color();
const _dirA = new THREE.Vector3();
const _dirB = new THREE.Vector3();
const _ORIGIN = new THREE.Vector3(0, 0, 0);
const _UP = new THREE.Vector3(0, 1, 0);

const CLOUD_SHEET_SPECS = [
  { x: 0, y: -68.0, z: 0, size: 360.0, rotY: 0.2, brightness: 1.0 },
  { x: -75.0, y: -48.0, z: -85.0, size: 250.0, rotY: 1.1, brightness: 0.92 },
  { x: 85.0, y: -54.0, z: 70.0, size: 260.0, rotY: 2.3, brightness: 0.90 },
  { x: 25.0, y: -82.0, z: -60.0, size: 320.0, rotY: 3.7, brightness: 0.82 }
];

export function createInitialLightingState(currentTimeOfDay) {
  return {
    timeOfDay: currentTimeOfDay,
    background: 0x1d4a55,
    skyTop: 0x07161c,
    skyHorizon: 0x1d4a55,
    ambient: { color: 0x6f94a8, intensity: 0.60 },
    hemi: { sky: 0x8fc4d6, ground: 0x2f3f44, intensity: 0.65 },
    hemisphere: { skyColor: 0x8fc4d6, groundColor: 0x2f3f44, intensity: 0.65 },
    directional: {
      direction: new THREE.Vector3(-0.46, 0.68, -0.57).normalize(),
      color: 0xbfe4ff,
      intensity: 1.00
    },
    sun: {
      direction: new THREE.Vector3(-0.46, 0.68, -0.57).normalize(),
      color: 0xbfe4ff,
      intensity: 1.00,
      alpha: 0.0
    },
    moon: {
      direction: new THREE.Vector3(-0.46, 0.68, -0.57).normalize(),
      color: 0xbfe4ff,
      intensity: 1.00,
      alpha: 1.0
    },
    moonDirection: new THREE.Vector3(-0.46, 0.68, -0.57).normalize(),
    moonColor: 0xbfe4ff,
    fog: { color: 0x1d4a55, near: 70.0, far: 240.0 },
    fogColor: 0x1d4a55,
    fogNear: 70.0,
    fogFar: 240.0,
    sky: { horizonColor: 0x1d4a55, horizonBandColor: 0x133540, topColor: 0x07161c },
    exposure: 1.15,
    windowGlow: 1.0,
    lampGlow: 1.0,
    starsAlpha: 1.0,
    leafGlow: 1.0,
    cloudTint: 0x427888,
    cloudOpacity: 0.28
  };
}

export function buildDistantSoftCloudSheets({
  preset,
  cloudSheetMat,
  contentGroup,
  disposableGeometries
}) {
  const count = Math.min(preset.cloudSheets, CLOUD_SHEET_SPECS.length);
  const sheetGeoms = [];

  for (let i = 0; i < count; i++) {
    const sp = CLOUD_SHEET_SPECS[i];
    const plane = new THREE.PlaneGeometry(sp.size, sp.size, 4, 4);
    plane.rotateX(-Math.PI / 2);

    const pos = plane.attributes.position;
    for (let vi = 0; vi < pos.count; vi++) {
      const lx = pos.getX(vi);
      const lz = pos.getZ(vi);
      const gentleArch = Math.cos((Math.hypot(lx, lz) / (sp.size * 0.5)) * Math.PI * 0.5) * 3.0;
      pos.setY(vi, gentleArch);
    }

    _tempPos.set(sp.x, sp.y, sp.z);
    _tempEuler.set(0, sp.rotY, 0);
    _tempQuat.setFromEuler(_tempEuler);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    plane.applyMatrix4(_tempMat4);

    const colored = ensureNonIndexedColoredGeometry(plane, 0xffffff, (c) => {
      c.multiplyScalar(sp.brightness);
    });
    sheetGeoms.push(colored);
  }

  const mergedSheets = mergeGeometries(sheetGeoms, false);
  for (const g of sheetGeoms) g.dispose();
  disposableGeometries.push(mergedSheets);

  const cloudSheetMesh = new THREE.Mesh(mergedSheets, cloudSheetMat);
  cloudSheetMesh.name = 'DistantSoftCloudSheets';
  cloudSheetMesh.renderOrder = 1;
  contentGroup.add(cloudSheetMesh);
  return cloudSheetMesh;
}

export function buildOpenSkyAndCelestialDiscs({
  skyMat,
  celestialDiscMat,
  contentGroup,
  disposableGeometries
}) {
  const domeRadius = 340.0;
  const rawDome = new THREE.SphereGeometry(domeRadius, 32, 18);
  const domeGeom = ensureNonIndexedColoredGeometry(rawDome, 0x1d4a55);
  disposableGeometries.push(domeGeom);

  const skyDomeMesh = new THREE.Mesh(domeGeom, skyMat);
  skyDomeMesh.name = 'SkyDome';
  contentGroup.add(skyDomeMesh);

  const buildDiscHierarchy = (specs) => {
    const parts = [];
    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      const g = s.innerR === 0
        ? new THREE.CircleGeometry(s.outerR, 28)
        : new THREE.RingGeometry(s.innerR, s.outerR, 28, 1);
      g.translate(0, 0, s.zOff);

      const cIn = new THREE.Color(s.innerHex);
      const cOut = new THREE.Color(s.outerHex);
      const nonIdx = ensureNonIndexedColoredGeometry(g, s.innerHex, (c, v) => {
        const r = Math.hypot(v.x, v.y);
        const t = s.outerR > s.innerR ? Math.max(0, Math.min(1, (r - s.innerR) / (s.outerR - s.innerR))) : 0;
        c.copy(cIn).lerp(cOut, t);
      });
      parts.push(nonIdx);
    }
    const merged = mergeGeometries(parts, false);
    for (const p of parts) p.dispose();
    return merged;
  };

  const sunGeom = buildDiscHierarchy([
    { innerR: 22.0, outerR: 52.0, zOff: 0.0, innerHex: 0xffe4b5, outerHex: 0x000000 },
    { innerR: 10.5, outerR: 22.0, zOff: 0.4, innerHex: 0xfff6e0, outerHex: 0xffe4b5 },
    { innerR: 0.0, outerR: 10.5, zOff: 0.8, innerHex: 0xffffff, outerHex: 0xfff6e0 }
  ]);

  const moonGeom = buildDiscHierarchy([
    { innerR: 20.0, outerR: 44.0, zOff: 0.0, innerHex: 0x4ca4bd, outerHex: 0x000000 },
    { innerR: 9.8, outerR: 20.0, zOff: 0.4, innerHex: 0xaef0ff, outerHex: 0x4ca4bd },
    { innerR: 0.0, outerR: 9.8, zOff: 0.8, innerHex: 0xf7fdff, outerHex: 0xd8f6ff }
  ]);

  const sunVertCount = sunGeom.attributes.position.count;
  const sunBasePositions = new Float32Array(sunGeom.attributes.position.array);
  const sunBaseColors = new Float32Array(sunGeom.attributes.color.array);

  const moonBasePositions = new Float32Array(moonGeom.attributes.position.array);
  const moonBaseColors = new Float32Array(moonGeom.attributes.color.array);

  const combinedCelestialGeom = mergeGeometries([sunGeom, moonGeom], false);
  sunGeom.dispose();
  moonGeom.dispose();
  disposableGeometries.push(combinedCelestialGeom);

  const celestialMesh = new THREE.Mesh(combinedCelestialGeom, celestialDiscMat);
  celestialMesh.name = 'SunAndMoonDiscs';
  celestialMesh.frustumCulled = false;
  contentGroup.add(celestialMesh);

  return {
    skyDomeMesh,
    celestialMesh,
    sunVertCount,
    sunBasePositions,
    sunBaseColors,
    moonBasePositions,
    moonBaseColors
  };
}

export function buildFloatingLeavesAndGlints({
  preset,
  seed,
  getGroundY,
  leafMat,
  glintPointMat,
  contentGroup,
  disposableGeometries
}) {
  const rng = createRng(seed + 613);

  const ribbonGeom = new THREE.PlaneGeometry(0.18, 0.72, 1, 4);
  const rPos = ribbonGeom.attributes.position;
  const rColors = new Float32Array(rPos.count * 3);

  const cTip = new THREE.Color(PALETTE.tealBright);
  const cBody = new THREE.Color(PALETTE.tealGlow);

  for (let i = 0; i < rPos.count; i++) {
    const vx = rPos.getX(i);
    const vy = rPos.getY(i);
    const t = vy / 0.36;
    const widthProfile = Math.max(0.08, Math.cos(t * Math.PI * 0.48));
    const archZ = Math.cos(t * Math.PI * 0.5) * 0.14;
    const twistX = Math.sin(t * Math.PI) * 0.05;

    rPos.setXYZ(i, vx * widthProfile + twistX, vy, archZ);

    _colorA.copy(cBody).lerp(cTip, Math.abs(t) * 0.75);
    rColors[i * 3] = _colorA.r;
    rColors[i * 3 + 1] = _colorA.g;
    rColors[i * 3 + 2] = _colorA.b;
  }
  ribbonGeom.setAttribute('color', new THREE.BufferAttribute(rColors, 3));
  ribbonGeom.computeVertexNormals();
  disposableGeometries.push(ribbonGeom);

  const leafCount = preset.leafCount;
  const leafInstancedMesh = new THREE.InstancedMesh(ribbonGeom, leafMat, leafCount);
  leafInstancedMesh.name = 'FloatingTealRibbonLeaves';

  const cLeafA = new THREE.Color(PALETTE.tealGlow);
  const cLeafB = new THREE.Color(0x52d1e3);
  const cLeafC = new THREE.Color(PALETTE.tealBright);

  const leafData = new Array(leafCount);
  for (let i = 0; i < leafCount; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = Math.sqrt(rng()) * 44.5;
    const baseX = Math.cos(angle) * radius;
    const baseZ = Math.sin(angle) * radius;
    const baseY = 1.4 + rng() * 13.5;
    const scale = 0.85 + rng() * 0.80;

    const item = {
      baseX,
      baseY,
      baseZ,
      scale,
      swayRadius: 0.75 + rng() * 1.5,
      swaySpeed: 0.38 + rng() * 0.58,
      fallSpeed: 0.18 + rng() * 0.32,
      spinSpeedX: (rng() - 0.5) * 1.15,
      spinSpeedY: (rng() - 0.5) * 1.45,
      spinSpeedZ: (rng() - 0.5) * 1.05,
      phase: rng() * Math.PI * 2
    };
    leafData[i] = item;

    _tempPos.set(baseX, baseY, baseZ);
    _tempEuler.set(item.phase, item.phase * 0.7, item.phase * 1.3);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.setScalar(scale);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    leafInstancedMesh.setMatrixAt(i, _tempMat4);

    _colorA.copy(cLeafA).lerp(cLeafB, rng()).lerp(cLeafC, rng() * 0.45);
    leafInstancedMesh.setColorAt(i, _colorA);
  }
  _tempScale.set(1, 1, 1);
  leafInstancedMesh.instanceMatrix.needsUpdate = true;
  if (leafInstancedMesh.instanceColor) leafInstancedMesh.instanceColor.needsUpdate = true;
  contentGroup.add(leafInstancedMesh);

  const glintCount = preset.glintCount;
  const starCount = preset.starCount;
  const totalPoints = glintCount + starCount;

  const ptPositions = new Float32Array(totalPoints * 3);
  const ptColors = new Float32Array(totalPoints * 3);
  const glintBasePositions = new Float32Array(glintCount * 3);
  const glintBaseColors = new Float32Array(glintCount * 3);
  const glintPhases = new Float32Array(glintCount);
  const starBaseColors = new Float32Array(starCount * 3);

  for (let i = 0; i < glintCount; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = Math.sqrt(rng()) * 45.0;
    const gx = Math.cos(angle) * radius;
    const gz = Math.sin(angle) * radius;
    const gy = getGroundY(gx, gz) + 0.6 + rng() * 11.5;

    glintBasePositions[i * 3] = gx;
    glintBasePositions[i * 3 + 1] = gy;
    glintBasePositions[i * 3 + 2] = gz;
    glintPhases[i] = rng() * Math.PI * 2;

    ptPositions[i * 3] = gx;
    ptPositions[i * 3 + 1] = gy;
    ptPositions[i * 3 + 2] = gz;

    _colorA.setHex(rng() > 0.22 ? PALETTE.tealGlow : 0xd8fbff);
    glintBaseColors[i * 3] = _colorA.r;
    glintBaseColors[i * 3 + 1] = _colorA.g;
    glintBaseColors[i * 3 + 2] = _colorA.b;

    ptColors[i * 3] = _colorA.r;
    ptColors[i * 3 + 1] = _colorA.g;
    ptColors[i * 3 + 2] = _colorA.b;
  }

  for (let s = 0; s < starCount; s++) {
    const idx = glintCount + s;
    const theta = rng() * Math.PI * 2;
    const phi = 0.16 + rng() * (Math.PI * 0.48 - 0.16);
    const r = 296.0;

    ptPositions[idx * 3] = Math.cos(theta) * Math.cos(phi) * r;
    ptPositions[idx * 3 + 1] = Math.sin(phi) * r;
    ptPositions[idx * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;

    const brightness = 0.45 + rng() * 0.55;
    _colorA.setHex(0xd4f6ff).multiplyScalar(brightness);
    starBaseColors[s * 3] = _colorA.r;
    starBaseColors[s * 3 + 1] = _colorA.g;
    starBaseColors[s * 3 + 2] = _colorA.b;

    ptColors[idx * 3] = _colorA.r;
    ptColors[idx * 3 + 1] = _colorA.g;
    ptColors[idx * 3 + 2] = _colorA.b;
  }

  const ptGeom = new THREE.BufferGeometry();
  ptGeom.setAttribute('position', new THREE.BufferAttribute(ptPositions, 3));
  ptGeom.setAttribute('color', new THREE.BufferAttribute(ptColors, 3));
  disposableGeometries.push(ptGeom);

  const glintPoints = new THREE.Points(ptGeom, glintPointMat);
  glintPoints.name = 'FloatingGlintsAndStars';
  contentGroup.add(glintPoints);

  return {
    leafInstancedMesh,
    leafData,
    glintPoints,
    glintBasePositions,
    glintBaseColors,
    glintPhases,
    starBaseColors
  };
}

export function applyTimeVisuals(lightingState, skyState, materials) {
  const {
    skyDomeMesh,
    celestialMesh,
    sunVertCount,
    sunBasePositions,
    sunBaseColors,
    moonBasePositions,
    moonBaseColors,
    glintPoints,
    glintBaseColors,
    glintPhases,
    starBaseColors
  } = skyState;
  const { cloudSheetMat, foliageMat, leafMat } = materials;

  if (skyDomeMesh) {
    const domeGeom = skyDomeMesh.geometry;
    const pos = domeGeom.attributes.position;
    const col = domeGeom.attributes.color;
    const domeRadius = 340.0;

    _colorA.setHex(lightingState.sky.horizonColor);
    _colorB.setHex(lightingState.sky.horizonBandColor);
    _colorC.setHex(lightingState.sky.topColor);

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const h = y / domeRadius;
      if (h < 0.0) {
        const t = Math.max(0, Math.min(1, (h + 0.35) / 0.35));
        const r = _colorB.r + (_colorA.r - _colorB.r) * t;
        const g = _colorB.g + (_colorA.g - _colorB.g) * t;
        const b = _colorB.b + (_colorA.b - _colorB.b) * t;
        col.setXYZ(i, r, g, b);
      } else if (h < 0.25) {
        const t = h / 0.25;
        const r = _colorA.r + (_colorB.r - _colorA.r) * t;
        const g = _colorA.g + (_colorB.g - _colorA.g) * t;
        const b = _colorA.b + (_colorB.b - _colorA.b) * t;
        col.setXYZ(i, r, g, b);
      } else {
        const t = Math.pow(Math.min(1, (h - 0.25) / 0.75), 0.8);
        const r = _colorB.r + (_colorC.r - _colorB.r) * t;
        const g = _colorB.g + (_colorC.g - _colorB.g) * t;
        const b = _colorB.b + (_colorC.b - _colorB.b) * t;
        col.setXYZ(i, r, g, b);
      }
    }
    col.needsUpdate = true;
  }

  if (celestialMesh && sunBasePositions && moonBasePositions) {
    const geom = celestialMesh.geometry;
    const posAttr = geom.attributes.position;
    const colAttr = geom.attributes.color;
    const posArr = posAttr.array;
    const colArr = colAttr.array;
    const dist = 312.0;

    const sDir = lightingState.sun.direction;
    const sCenter = _tempPos.copy(sDir).multiplyScalar(dist);
    _tempMat4.lookAt(sCenter, _ORIGIN, _UP);
    const sAlpha = lightingState.sun.alpha;
    _colorA.setHex(lightingState.sun.color);

    for (let i = 0; i < sunVertCount; i++) {
      _dirA.set(
        sunBasePositions[i * 3],
        sunBasePositions[i * 3 + 1],
        sunBasePositions[i * 3 + 2]
      ).applyMatrix4(_tempMat4).add(sCenter);

      posArr[i * 3] = _dirA.x;
      posArr[i * 3 + 1] = _dirA.y;
      posArr[i * 3 + 2] = _dirA.z;

      colArr[i * 3] = sunBaseColors[i * 3] * _colorA.r * sAlpha;
      colArr[i * 3 + 1] = sunBaseColors[i * 3 + 1] * _colorA.g * sAlpha;
      colArr[i * 3 + 2] = sunBaseColors[i * 3 + 2] * _colorA.b * sAlpha;
    }

    const mDir = lightingState.moon.direction;
    const mCenter = _tempPos.copy(mDir).multiplyScalar(dist);
    _tempMat4.lookAt(mCenter, _ORIGIN, _UP);
    const mAlpha = lightingState.moon.alpha;
    const moonVertCount = moonBasePositions.length / 3;

    for (let i = 0; i < moonVertCount; i++) {
      const dstIdx = (sunVertCount + i) * 3;
      _dirA.set(
        moonBasePositions[i * 3],
        moonBasePositions[i * 3 + 1],
        moonBasePositions[i * 3 + 2]
      ).applyMatrix4(_tempMat4).add(mCenter);

      posArr[dstIdx] = _dirA.x;
      posArr[dstIdx + 1] = _dirA.y;
      posArr[dstIdx + 2] = _dirA.z;

      colArr[dstIdx] = moonBaseColors[i * 3] * mAlpha;
      colArr[dstIdx + 1] = moonBaseColors[i * 3 + 1] * mAlpha;
      colArr[dstIdx + 2] = moonBaseColors[i * 3 + 2] * mAlpha;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  cloudSheetMat.color.setHex(lightingState.cloudTint);
  cloudSheetMat.opacity = lightingState.cloudOpacity;

  const leafGlow = lightingState.leafGlow;
  foliageMat.emissiveIntensity = 0.06 + leafGlow * 0.16;
  _colorA.setHex(0x4c7a6e).lerp(_colorB.setHex(0xffffff), leafGlow);
  leafMat.color.copy(_colorA);
  leafMat.opacity = 0.65 + leafGlow * 0.35;

  if (glintPoints && glintBaseColors && starBaseColors) {
    const colAttr = glintPoints.geometry.attributes.color;
    const colArr = colAttr.array;
    const gCount = glintPhases.length;
    const sCount = starBaseColors.length / 3;
    const glintScale = 0.25 + leafGlow * 0.75;
    const starScale = lightingState.starsAlpha;

    for (let i = 0; i < gCount; i++) {
      colArr[i * 3] = glintBaseColors[i * 3] * glintScale;
      colArr[i * 3 + 1] = glintBaseColors[i * 3 + 1] * glintScale;
      colArr[i * 3 + 2] = glintBaseColors[i * 3 + 2] * glintScale;
    }
    for (let s = 0; s < sCount; s++) {
      const idx = (gCount + s) * 3;
      colArr[idx] = starBaseColors[s * 3] * starScale;
      colArr[idx + 1] = starBaseColors[s * 3 + 1] * starScale;
      colArr[idx + 2] = starBaseColors[s * 3 + 2] * starScale;
    }
    colAttr.needsUpdate = true;
  }
}

export function updateTimeOfDayState(t, lightingState, skyState, materials) {
  const normT = ((Number(t) || 0) % 1 + 1) % 1;

  let k0 = TIME_KEYFRAMES[TIME_KEYFRAMES.length - 1];
  let k1 = TIME_KEYFRAMES[0];
  let span = (1.0 - k0.t) + k1.t;
  let local = normT >= k0.t ? (normT - k0.t) : (normT + (1.0 - k0.t));

  for (let i = 0; i < TIME_KEYFRAMES.length - 1; i++) {
    const a = TIME_KEYFRAMES[i];
    const b = TIME_KEYFRAMES[i + 1];
    if (normT >= a.t && normT < b.t) {
      k0 = a;
      k1 = b;
      span = b.t - a.t;
      local = normT - a.t;
      break;
    }
  }

  const rawU = span > 0 ? Math.max(0, Math.min(1, local / span)) : 0;
  const u = rawU * rawU * (3 - 2 * rawU);

  const lerpNum = (a, b) => a + (b - a) * u;
  const lerpHex = (hexA, hexB) => _colorA.setHex(hexA).lerp(_colorB.setHex(hexB), u).getHex();

  lightingState.timeOfDay = normT;
  lightingState.ambient.color = lerpHex(k0.ambientColor, k1.ambientColor);
  lightingState.ambient.intensity = Math.max(0.55, lerpNum(k0.ambientIntensity, k1.ambientIntensity));

  lightingState.hemisphere.skyColor = lerpHex(k0.hemiSky, k1.hemiSky);
  lightingState.hemisphere.groundColor = lerpHex(k0.hemiGround, k1.hemiGround);
  lightingState.hemisphere.intensity = Math.max(0.60, lerpNum(k0.hemiIntensity, k1.hemiIntensity));

  _dirA.fromArray(k0.sunDir);
  _dirB.fromArray(k1.sunDir);
  lightingState.directional.direction.copy(_dirA).lerp(_dirB, u).normalize();
  lightingState.directional.color = lerpHex(k0.sunColor, k1.sunColor);
  lightingState.directional.intensity = Math.max(0.90, lerpNum(k0.sunIntensity, k1.sunIntensity));

  const sunAlpha = lerpNum(k0.sunAlpha, k1.sunAlpha);
  const moonAlpha = lerpNum(k0.moonAlpha, k1.moonAlpha);

  const sunAngle = (normT / 0.68) * Math.PI;
  lightingState.sun.direction.set(
    -Math.cos(sunAngle) * 0.78,
    Math.max(0.18, Math.sin(sunAngle) * 0.88),
    -0.48
  ).normalize();
  lightingState.sun.color = lerpHex(k0.sunColor, k1.sunColor);
  lightingState.sun.intensity = lightingState.directional.intensity;
  lightingState.sun.alpha = sunAlpha;

  lightingState.moon.direction.set(-0.46, 0.68, -0.57).normalize();
  lightingState.moon.color = 0xbfe4ff;
  lightingState.moon.intensity = Math.max(0.90, lightingState.directional.intensity);
  lightingState.moon.alpha = moonAlpha;

  lightingState.moonDirection.copy(lightingState.directional.direction);
  lightingState.moonColor = lightingState.directional.color;

  const fogHex = lerpHex(k0.fogColor, k1.fogColor);
  const fogNear = lerpNum(k0.fogNear, k1.fogNear);
  const fogFar = lerpNum(k0.fogFar, k1.fogFar);
  lightingState.fog.color = fogHex;
  lightingState.fog.near = fogNear;
  lightingState.fog.far = fogFar;
  lightingState.fogColor = fogHex;
  lightingState.fogNear = fogNear;
  lightingState.fogFar = fogFar;

  lightingState.sky.horizonColor = lerpHex(k0.skyHorizon, k1.skyHorizon);
  lightingState.sky.horizonBandColor = lerpHex(k0.skyHorizonBand, k1.skyHorizonBand);
  lightingState.sky.topColor = lerpHex(k0.skyTop, k1.skyTop);

  lightingState.exposure = Math.max(1.10, lerpNum(k0.exposure, k1.exposure));
  lightingState.windowGlow = lerpNum(k0.windowGlow, k1.windowGlow);
  lightingState.lampGlow = lerpNum(k0.lampGlow, k1.lampGlow);
  lightingState.starsAlpha = lerpNum(k0.starsAlpha, k1.starsAlpha);
  lightingState.leafGlow = lerpNum(k0.leafGlow, k1.leafGlow);
  lightingState.cloudTint = lerpHex(k0.cloudTint, k1.cloudTint);
  lightingState.cloudOpacity = lerpNum(k0.cloudOpacity, k1.cloudOpacity);

  lightingState.background = fogHex;
  lightingState.skyTop = lightingState.sky.topColor;
  lightingState.skyHorizon = lightingState.sky.horizonColor;
  lightingState.hemi.sky = lightingState.hemisphere.skyColor;
  lightingState.hemi.ground = lightingState.hemisphere.groundColor;
  lightingState.hemi.intensity = lightingState.hemisphere.intensity;

  applyTimeVisuals(lightingState, skyState, materials);
  return normT;
}

export function updateAtmosphereFrame(safeDt, elapsedTime, skyState, portalState) {
  const {
    cloudSheetMesh,
    leafInstancedMesh,
    leafData,
    glintPoints,
    glintBasePositions,
    glintPhases
  } = skyState;
  const { riftPortalDisc, riftPortalRings } = portalState;

  if (cloudSheetMesh) {
    cloudSheetMesh.rotation.y = elapsedTime * 0.004;
    cloudSheetMesh.position.x = Math.sin(elapsedTime * 0.12) * 2.5;
    cloudSheetMesh.position.z = Math.cos(elapsedTime * 0.10) * 2.5;
  }

  if (riftPortalDisc) {
    riftPortalDisc.rotation.z -= safeDt * 0.55;
  }
  if (riftPortalRings) {
    for (let r = 0; r < riftPortalRings.length; r++) {
      const dir = r % 2 === 0 ? 1 : -1;
      riftPortalRings[r].rotation.z += safeDt * (0.35 + r * 0.18) * dir;
    }
  }

  if (leafInstancedMesh && leafData && leafData.length > 0) {
    for (let i = 0; i < leafData.length; i++) {
      const item = leafData[i];
      const t = elapsedTime * item.swaySpeed + item.phase;

      const x = item.baseX + Math.sin(t) * item.swayRadius;
      const z = item.baseZ + Math.cos(t * 0.82) * item.swayRadius;

      const spanY = 13.5;
      let y = item.baseY - ((elapsedTime * item.fallSpeed + item.phase * 2.0) % spanY);
      if (y < 0.8) y += spanY;

      _tempPos.set(x, y, z);
      _tempEuler.set(
        item.phase + elapsedTime * item.spinSpeedX + Math.sin(t) * 0.35,
        item.phase + elapsedTime * item.spinSpeedY,
        Math.cos(t * 0.9) * 0.5 + elapsedTime * item.spinSpeedZ
      );
      _tempQuat.setFromEuler(_tempEuler);
      _tempScale.setScalar(item.scale);
      _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
      leafInstancedMesh.setMatrixAt(i, _tempMat4);
    }
    _tempScale.set(1, 1, 1);
    leafInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  if (glintPoints && glintBasePositions && glintPhases) {
    const posAttr = glintPoints.geometry.attributes.position;
    const arr = posAttr.array;
    const gCount = glintPhases.length;
    for (let i = 0; i < gCount; i++) {
      const ph = glintPhases[i];
      const t = elapsedTime * 1.15 + ph;
      arr[i * 3] = glintBasePositions[i * 3] + Math.sin(t * 0.7) * 0.28;
      arr[i * 3 + 1] = glintBasePositions[i * 3 + 1] + Math.cos(t) * 0.35;
      arr[i * 3 + 2] = glintBasePositions[i * 3 + 2] + Math.sin(t * 0.9) * 0.28;
    }
    posAttr.needsUpdate = true;
  }
}