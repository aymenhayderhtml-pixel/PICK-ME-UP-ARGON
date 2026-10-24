import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE, BAKED_KEY_DIR } from './shellConfig.js';
import {
  createRng,
  hash2D,
  fbm2D,
  ensureNonIndexedColoredGeometry,
  getDodecagonSignedDistance,
  createTaperedVineGeometry
} from './shellTextures.js';

const _tempMat4 = new THREE.Matrix4();
const _tempPos = new THREE.Vector3();
const _tempQuat = new THREE.Quaternion();
const _tempEuler = new THREE.Euler();
const _tempScale = new THREE.Vector3(1, 1, 1);
const _colorA = new THREE.Color();

export function buildTerrainMesh({
  preset,
  seed,
  wallSpec,
  aoPads,
  getGroundY,
  terrainMat,
  contentGroup,
  disposableGeometries
}) {
  const segs = preset.terrainSegs;
  const size = 94.0;
  const geom = new THREE.PlaneGeometry(size, size, segs, segs);
  geom.rotateX(-Math.PI / 2);

  const pos = geom.attributes.position;
  const uv = geom.attributes.uv;
  const count = pos.count;

  const maxSafeApothem = wallSpec.apothem + 0.65;

  for (let i = 0; i < count; i++) {
    let x = pos.getX(i);
    let z = pos.getZ(i);

    let maxRatio = 0;
    for (let k = 0; k < 12; k++) {
      const theta = (k + 0.5) * (Math.PI / 6);
      const proj = x * Math.cos(theta) + z * Math.sin(theta);
      const ratio = proj / maxSafeApothem;
      if (ratio > maxRatio) maxRatio = ratio;
    }

    let edgeSink = 0;
    if (maxRatio > 1.0) {
      x /= maxRatio;
      z /= maxRatio;
      edgeSink = -0.35;
    }

    const y = getGroundY(x, z) + edgeSink;
    pos.setXYZ(i, x, y, z);
    uv.setXY(i, (x + 48.0) * 0.22, (z + 48.0) * 0.22);
  }

  geom.computeVertexNormals();
  const norm = geom.attributes.normal;

  const colors = new Float32Array(count * 3);
  const cGroundBase = new THREE.Color(PALETTE.groundBase);
  const cGroundLight = new THREE.Color(PALETTE.groundLight);
  const cGroundWarm = new THREE.Color(PALETTE.groundWarm);
  const cGroundDark = new THREE.Color(PALETTE.groundCrack);
  const cMossMid = new THREE.Color(PALETTE.mossMid);
  const cMossLight = new THREE.Color(PALETTE.mossLight);
  const cTemp = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const nx = norm.getX(i);
    const ny = norm.getY(i);
    const nz = norm.getZ(i);

    const patchNoise = fbm2D(x * 0.065 + 3.7, z * 0.065 - 2.1, seed + 5, 3);
    const detailNoise = fbm2D(x * 0.19 - 8.4, z * 0.19 + 5.2, seed + 17, 2);
    const slabHash = hash2D(Math.floor(x * 0.44), Math.floor(z * 0.44), seed + 23);

    cTemp.copy(cGroundBase).lerp(cGroundWarm, 0.35 + slabHash * 0.45);
    cTemp.lerp(cGroundLight, patchNoise * 0.48);
    if (slabHash < 0.22) {
      cTemp.lerp(cGroundDark, 0.18);
    }

    const keyDot = Math.max(0, nx * BAKED_KEY_DIR.x + ny * BAKED_KEY_DIR.y + nz * BAKED_KEY_DIR.z);
    cTemp.multiplyScalar(0.95 + keyDot * 0.12);

    const mossMask = Math.max(0, Math.min(1, (detailNoise - 0.58) * 3.4 + (1.0 - ny) * 1.4));
    if (mossMask > 0.02) {
      _colorA.copy(cMossMid).lerp(cMossLight, slabHash * 0.6);
      cTemp.lerp(_colorA, Math.min(0.78, mossMask * 0.72));
    }

    const wallDist = -getDodecagonSignedDistance(x, z, wallSpec.apothem - wallSpec.thickness * 0.5);
    if (wallDist < 8.0) {
      const wallProx = Math.max(0, Math.min(1, 1.0 - wallDist / 8.0));
      cTemp.lerp(cGroundDark, wallProx * 0.28);

      const wallMoss = Math.max(0, Math.min(1, (1.0 - wallDist / 5.5) * (0.45 + detailNoise * 0.85)));
      if (wallMoss > 0.04) {
        _colorA.copy(cMossMid).lerp(cMossLight, slabHash * 0.55);
        cTemp.lerp(_colorA, wallMoss * 0.76);
      }

      if (wallDist < 2.4) {
        const wallAo = Math.max(0, Math.min(1, 1.0 - wallDist / 2.4));
        cTemp.multiplyScalar(1.0 - wallAo * 0.32);
      }
    }

    let aoFactor = 1.0;
    for (let p = 0; p < aoPads.length; p++) {
      const pad = aoPads[p];
      const dist = Math.hypot(x - pad.x, z - pad.z);
      if (dist < pad.r) {
        const t = 1.0 - dist / pad.r;
        const smooth = t * t * (3 - 2 * t);
        const strength = pad.strength ?? 0.30;
        aoFactor *= (1.0 - smooth * strength);

        if (t > 0.25 && t < 0.75 && detailNoise > 0.52) {
          cTemp.lerp(cMossMid, (detailNoise - 0.52) * 0.65);
        }
      }
    }
    cTemp.multiplyScalar(aoFactor);

    colors[i * 3] = Math.min(1, cTemp.r);
    colors[i * 3 + 1] = Math.min(1, cTemp.g);
    colors[i * 3 + 2] = Math.min(1, cTemp.b);
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  disposableGeometries.push(geom);

  const mesh = new THREE.Mesh(geom, terrainMat);
  mesh.name = 'TownTerrain';
  contentGroup.add(mesh);
}

export function buildJaggedIslandUnderside({
  preset,
  seed,
  getGroundY,
  undersideMat,
  foliageMat,
  contentGroup,
  disposableGeometries
}) {
  const rockGeoms = [];
  const rootVineGeoms = [];
  const topRadius = 51.2;
  const depth = 60.0;
  const radSegs = preset.undersideRadSegs;
  const hSegs = preset.undersideHeightSegs;
  const rng = createRng(seed + 211);

  const cStrataLight = new THREE.Color(PALETTE.strataLight);
  const cStrataBrown = new THREE.Color(PALETTE.strataBrown);
  const cStrataDarkBrown = new THREE.Color(PALETTE.strataDarkBrown);
  const cStrataTeal = new THREE.Color(PALETTE.strataTeal);
  const cStrataDeep = new THREE.Color(PALETTE.strataDeep);
  const cMossMid = new THREE.Color(PALETTE.mossMid);
  const cMossLight = new THREE.Color(PALETTE.mossLight);

  function getUndersideCoreRadius(angle, y) {
    const dFrac = Math.max(0, Math.min(1, (-y - 1.5) / depth));
    if (dFrac >= 0.98) return 0.2;
    const strataTier = Math.floor(dFrac * 8.0) / 8.0;
    const tierStep = (dFrac * 8.0 - Math.floor(dFrac * 8.0)) < 0.30 ? 2.6 : -1.2;
    const crag = (hash2D(Math.round(angle * 16), Math.round(strataTier * 14), seed + 241) - 0.5) * 4.8;
    const fissure = Math.pow(Math.abs(Math.sin(angle * 6.0 + strataTier * 1.5)), 8.0) * -4.6;
    const profileR = Math.pow(1.0 - dFrac, 0.82) * topRadius;
    return Math.max(0.5, profileR + (tierStep + crag + fissure) * (1.0 - dFrac * 0.78));
  }

  const rockStrataColorizer = (c, v, n) => {
    const dFrac = Math.max(0, Math.min(1, (-v.y - 1.5) / depth));
    const strataY = v.y * 0.72 + fbm2D(v.x * 0.06, v.z * 0.06, seed + 223, 2) * 1.8;
    const bandWave = Math.sin(strataY);
    const fineLayer = Math.cos(strataY * 2.7);

    if (bandWave > 0.20) {
      c.copy(cStrataBrown).lerp(cStrataLight, Math.max(0, fineLayer) * 0.45);
    } else if (bandWave < -0.18) {
      c.copy(cStrataTeal).lerp(cStrataDarkBrown, Math.max(0, -fineLayer) * 0.35);
    } else {
      c.copy(cStrataDarkBrown).lerp(cStrataBrown, 0.55);
    }

    const keyDot = Math.max(0, n.x * BAKED_KEY_DIR.x + n.y * BAKED_KEY_DIR.y + n.z * BAKED_KEY_DIR.z);
    c.lerp(cStrataLight, Math.pow(keyDot, 1.1) * 0.32 * (1.0 - dFrac * 0.5));

    if (n.y > 0.48 && dFrac < 0.52) {
      const mBlend = Math.min(1, (n.y - 0.48) * 2.4);
      _colorA.copy(cMossMid).lerp(cMossLight, keyDot * 0.7);
      c.lerp(_colorA, mBlend * 0.85);
    }

    const angle = Math.atan2(v.z, v.x);
    const crack = Math.pow(Math.abs(Math.sin(angle * 6.0 + v.y * 0.04)), 12.0);
    c.multiplyScalar(1.0 - crack * 0.40);
    c.lerp(cStrataDeep, Math.pow(dFrac, 1.18) * 0.84);
  };

  const coneGeom = new THREE.ConeGeometry(topRadius, depth, radSegs, hSegs, true);
  coneGeom.rotateX(Math.PI);
  coneGeom.translate(0, -depth * 0.5 - 1.8, 0);

  const pos = coneGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const dFrac = Math.max(0, Math.min(1, (-y - 1.8) / depth));
    const angle = Math.atan2(z, x);
    const baseR = Math.hypot(x, z);

    if (baseR > 0.05 && dFrac < 0.98) {
      const finalR = getUndersideCoreRadius(angle, y);
      const nx = Math.cos(angle) * finalR;
      const nz = Math.sin(angle) * finalR;
      const rimGround = getGroundY(Math.cos(angle) * 46.0, Math.sin(angle) * 46.0);
      const stepY = y + (1.0 - dFrac) * rimGround;
      pos.setXYZ(i, nx, stepY, nz);
    } else if (dFrac >= 0.98) {
      pos.setXYZ(i, 0, -depth - 1.8, 0);
    }
  }

  const facetedCore = coneGeom.index ? coneGeom.toNonIndexed() : coneGeom;
  if (facetedCore !== coneGeom) coneGeom.dispose();
  facetedCore.computeVertexNormals();
  rockGeoms.push(ensureNonIndexedColoredGeometry(facetedCore, PALETTE.strataBrown, rockStrataColorizer));

  for (let c = 0; c < preset.undersideChunks; c++) {
    const tierFrac = 0.08 + (c / preset.undersideChunks) * 0.74;
    const angle = c * 2.39996 + (rng() - 0.5) * 0.30;
    const chunkY = -3.0 - tierFrac * depth;
    const surfaceR = getUndersideCoreRadius(angle, chunkY);

    const chunkW = 4.8 + (1.0 - tierFrac) * (5.2 + rng() * 4.5);
    const chunkH = 4.2 + rng() * 7.5;
    const chunkD = 4.2 + (1.0 - tierFrac) * (4.5 + rng() * 4.0);

    const chunkGeom = new THREE.BoxGeometry(chunkW, chunkH, chunkD, 2, 2, 2);
    const cPos = chunkGeom.attributes.position;
    for (let vi = 0; vi < cPos.count; vi++) {
      const vx = cPos.getX(vi);
      const vy = cPos.getY(vi);
      const vz = cPos.getZ(vi);
      const bottomTaper = vy < 0 ? 0.35 : 0.92;
      const radialTaper = vz > 0 ? 0.78 : 1.05;
      const cragJitter = (hash2D(vi, c, seed + 257) - 0.5) * 1.1;
      const roofSlope = vy > 0 ? -Math.abs(vx) * 0.18 - Math.max(0, vz) * 0.22 : 0;

      cPos.setXYZ(
        vi,
        vx * bottomTaper * radialTaper + cragJitter,
        vy + roofSlope + cragJitter * 0.4,
        vz * bottomTaper
      );
    }

    const embedR = Math.max(1.0, surfaceR - chunkD * 0.22);
    _tempPos.set(Math.cos(angle) * embedR, chunkY, Math.sin(angle) * embedR);
    _tempEuler.set((rng() - 0.5) * 0.22, -angle + Math.PI * 0.5, (rng() - 0.5) * 0.22);
    _tempQuat.setFromEuler(_tempEuler);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    chunkGeom.applyMatrix4(_tempMat4);

    const facetedChunk = chunkGeom.index ? chunkGeom.toNonIndexed() : chunkGeom;
    if (facetedChunk !== chunkGeom) chunkGeom.dispose();
    facetedChunk.computeVertexNormals();
    rockGeoms.push(ensureNonIndexedColoredGeometry(facetedChunk, PALETTE.strataBrown, rockStrataColorizer));
  }

  for (let s = 0; s < preset.undersideSpikes; s++) {
    const isCentralApex = s < 5;
    const dFrac = isCentralApex ? (0.74 + rng() * 0.20) : (0.14 + rng() * 0.64);
    const angle = rng() * Math.PI * 2;
    const startY = -3.2 - dFrac * (depth * 0.84);
    const surfaceR = getUndersideCoreRadius(angle, startY);
    const rad = isCentralApex ? (1.2 + rng() * 3.8) : Math.max(1.5, surfaceR * (0.72 + rng() * 0.22));
    const spikeLen = isCentralApex ? (11.0 + rng() * 9.0) : (6.0 + rng() * 10.0);
    const spikeR = isCentralApex ? (1.6 + rng() * 1.6) : (1.0 + rng() * 1.5);

    const spikeGeom = new THREE.ConeGeometry(spikeR, spikeLen, 5, 2);
    spikeGeom.rotateX(Math.PI);
    _tempPos.set(Math.cos(angle) * rad, startY - spikeLen * 0.35, Math.sin(angle) * rad);
    _tempEuler.set((rng() - 0.5) * 0.12, rng() * Math.PI * 2, (rng() - 0.5) * 0.12);
    _tempQuat.setFromEuler(_tempEuler);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    spikeGeom.applyMatrix4(_tempMat4);

    const facetedSpike = spikeGeom.index ? spikeGeom.toNonIndexed() : spikeGeom;
    if (facetedSpike !== spikeGeom) spikeGeom.dispose();
    facetedSpike.computeVertexNormals();
    rockGeoms.push(ensureNonIndexedColoredGeometry(facetedSpike, PALETTE.strataTeal, rockStrataColorizer));
  }

  for (let r = 0; r < preset.rootCount; r++) {
    const fromRim = r < preset.rootCount * 0.58;
    const angle = (r / preset.rootCount) * Math.PI * 2 + (rng() - 0.5) * 0.12;
    const outDir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));

    let startY;
    let startR;
    if (fromRim) {
      const rimGround = getGroundY(Math.cos(angle) * 46.0, Math.sin(angle) * 46.0);
      startY = rimGround - 1.6 - rng() * 1.8;
      startR = getUndersideCoreRadius(angle, startY) - 0.35;
    } else {
      const dFrac = 0.12 + rng() * 0.48;
      startY = -4.0 - dFrac * depth;
      startR = Math.max(2.0, getUndersideCoreRadius(angle, startY) - 0.35);
    }

    const vineWidth = 0.15 + rng() * 0.25;
    const vineLength = 2.2 + rng() * 5.8;
    const startPos = new THREE.Vector3(Math.cos(angle) * startR, startY, Math.sin(angle) * startR);

    const vineStrip = createTaperedVineGeometry(startPos, outDir, vineWidth, vineLength, 5, seed + 701 + r);
    rootVineGeoms.push(vineStrip);
  }

  const mergedUnderside = mergeGeometries(rockGeoms, false);
  for (const g of rockGeoms) g.dispose();
  disposableGeometries.push(mergedUnderside);

  const undersideMesh = new THREE.Mesh(mergedUnderside, undersideMat);
  undersideMesh.name = 'IslandUnderside';
  contentGroup.add(undersideMesh);

  if (rootVineGeoms.length > 0) {
    const mergedRoots = mergeGeometries(rootVineGeoms, false);
    for (const g of rootVineGeoms) g.dispose();
    disposableGeometries.push(mergedRoots);

    const rootsMesh = new THREE.Mesh(mergedRoots, foliageMat);
    rootsMesh.name = 'UndersideHangingRootsAndVines';
    contentGroup.add(rootsMesh);
  }
}