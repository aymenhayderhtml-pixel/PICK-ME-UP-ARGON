import * as THREE from 'three';
import { createPortalSwirlTexture } from './landmarksMain.js';
import { PALETTE, BAKED_KEY_DIR } from './shellConfig.js';
import {
  createRng,
  hash2D,
  fbm2D,
  ensureNonIndexedColoredGeometry,
  getQuadrantIndex,
  createTaperedVineGeometry
} from './shellTextures.js';

const _tempMat4 = new THREE.Matrix4();
const _tempPos = new THREE.Vector3();
const _tempScale = new THREE.Vector3(1, 1, 1);

export function createStoneVertexColorizer(seed, colors) {
  const {
    cStoneLit,
    cStoneMid,
    cStoneShade,
    cCrevice,
    cMossMid,
    cMossLight,
    colorA
  } = colors;

  return (color, v, n, vertIdx, aoBoost = 0) => {
    const worldNoise = fbm2D(v.x * 0.15, v.z * 0.15 + v.y * 0.18, seed + 29, 2);
    const crackNoise = fbm2D(v.x * 0.42 + 5.1, v.y * 0.42 + v.z * 0.42, seed + 43, 2);
    const blockHash = hash2D(Math.floor(v.x * 1.1), Math.floor(v.y * 1.1 + v.z * 1.1), seed + 41);

    const keyDot = Math.max(0, n.x * BAKED_KEY_DIR.x + n.y * BAKED_KEY_DIR.y + n.z * BAKED_KEY_DIR.z);
    const heightGrad = Math.max(0, Math.min(1, (v.y - 1.0) / 9.2));
    const litFactor = Math.min(1, 0.35 + keyDot * 0.50 + heightGrad * 0.25);

    color.copy(cStoneShade).lerp(cStoneLit, litFactor);
    color.lerp(cStoneMid, worldNoise * 0.28);

    if (blockHash > 0.84) {
      color.lerp(cCrevice, 0.42);
    } else if (blockHash < 0.18) {
      color.lerp(cStoneLit, 0.35);
    }

    if (crackNoise > 0.66 && v.y < 8.8) {
      const crackMoss = Math.min(1, (crackNoise - 0.66) * 4.2);
      colorA.copy(cMossMid).lerp(cMossLight, blockHash * 0.6);
      color.lerp(colorA, crackMoss * 0.80);
    }

    if (v.y < 3.0) {
      const baseFrac = Math.max(0, Math.min(1, (3.0 - v.y) / 3.0));
      const mossHeight = 1.65 + worldNoise * 1.45;
      if (v.y < mossHeight) {
        const mFrac = Math.max(0, Math.min(1, (mossHeight - v.y) / mossHeight));
        colorA.copy(cMossMid).lerp(cMossLight, worldNoise * 0.7);
        color.lerp(colorA, mFrac * 0.84);
      }
      color.multiplyScalar(1.0 - baseFrac * 0.26);
    }

    if (n.y > 0.55 && worldNoise > 0.32) {
      colorA.copy(cMossMid).lerp(cMossLight, Math.min(1, (worldNoise - 0.32) * 1.7));
      color.lerp(colorA, 0.68);
    }

    if (aoBoost > 0) {
      color.lerp(cCrevice, Math.min(1, aoBoost * 0.72));
      color.multiplyScalar(1.0 - aoBoost * 0.34);
    }
  };
}

export function appendHangingVine({
  foliageGeoms,
  originX,
  originY,
  originZ,
  faceAngleY,
  length,
  spreadW,
  vineSeed,
  leavesPerMeter,
  colors
}) {
  const { cMossDark, cMossMid, cMossLight, colorA, colorB } = colors;
  const rng = createRng(vineSeed);
  const clampedLen = Math.min(8.0, Math.max(2.0, length));
  const clampedSpread = Math.min(0.42, spreadW);
  const outDir = new THREE.Vector3(Math.sin(faceAngleY), 0, Math.cos(faceAngleY));

  const stemGeom = createTaperedVineGeometry(
    new THREE.Vector3(originX, originY, originZ),
    outDir,
    0.16,
    clampedLen,
    Math.max(4, Math.floor(clampedLen * 0.85)),
    vineSeed
  );
  foliageGeoms.push(stemGeom);

  const vineQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, faceAngleY, 0));
  const clusterCount = Math.max(4, Math.floor(clampedLen * leavesPerMeter));
  const positions = [];
  const vertColors = [];

  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(vineQuat);
  const up = new THREE.Vector3(0, 1, 0);
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(vineQuat);

  for (let cIdx = 0; cIdx < clusterCount; cIdx++) {
    const frac = (cIdx + 0.35 * rng()) / clusterCount;
    const envelope = Math.sin(Math.min(1, frac * 1.4) * Math.PI * 0.85) * (1.0 - frac * 0.45);
    const stemWaveX = Math.sin(frac * Math.PI * 2.1 + vineSeed) * 0.16 * frac;
    const offsetSide = (rng() - 0.5) * clampedSpread * (0.35 + envelope * 0.55) + stemWaveX;
    const dropY = -frac * clampedLen;
    const outZ = 0.08 + Math.sin(frac * Math.PI * 0.9) * 0.22;

    const center = new THREE.Vector3(originX, originY + dropY, originZ)
      .addScaledVector(right, offsetSide)
      .addScaledVector(forward, outZ);

    const leavesInNode = frac < 0.45 ? 2 : 1;
    for (let l = 0; l < leavesInNode; l++) {
      const leafLen = (0.24 + rng() * 0.18) * (0.75 + envelope * 0.40);
      const leafHalfW = Math.min(0.18, leafLen * (0.38 + rng() * 0.14));

      const yaw = (rng() - 0.5) * 1.25;
      const pitch = -0.45 - rng() * 0.65;
      const lDir = new THREE.Vector3(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        Math.cos(yaw) * Math.cos(pitch)
      ).applyQuaternion(vineQuat).normalize();

      const lSide = new THREE.Vector3().crossVectors(lDir, up).normalize();
      if (lSide.lengthSq() < 0.01) lSide.copy(right);

      const pBase = center.clone();
      const pTip = center.clone().addScaledVector(lDir, leafLen);
      const pMidL = center.clone().addScaledVector(lDir, leafLen * 0.45).addScaledVector(lSide, leafHalfW);
      const pMidR = center.clone().addScaledVector(lDir, leafLen * 0.45).addScaledVector(lSide, -leafHalfW);

      positions.push(
        pBase.x, pBase.y, pBase.z, pMidL.x, pMidL.y, pMidL.z, pMidR.x, pMidR.y, pMidR.z,
        pMidR.x, pMidR.y, pMidR.z, pMidL.x, pMidL.y, pMidL.z, pTip.x, pTip.y, pTip.z
      );

      const shade = rng();
      colorA.copy(cMossDark).lerp(cMossMid, 0.45 + shade * 0.55);
      colorB.copy(cMossMid).lerp(cMossLight, 0.55 + frac * 0.45);

      for (let v = 0; v < 6; v++) {
        const cLeaf = (v === 1 || v === 4 || v === 5) ? colorB : colorA;
        vertColors.push(cLeaf.r, cLeaf.g, cLeaf.b);
      }
    }
  }

  if (positions.length > 0) {
    const leafClusterGeom = new THREE.BufferGeometry();
    leafClusterGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    leafClusterGeom.setAttribute('color', new THREE.Float32BufferAttribute(vertColors, 3));
    leafClusterGeom.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((positions.length / 3) * 2), 2));
    leafClusterGeom.computeVertexNormals();
    foliageGeoms.push(leafClusterGeom);
  }
}

export function appendMossStreak({
  foliageGeoms,
  originX,
  originY,
  originZ,
  faceAngleY,
  width,
  height,
  streakSeed,
  colors
}) {
  const { cMossDark, cMossLight } = colors;
  const clampedW = Math.min(0.45, width);
  const geom = new THREE.BufferGeometry();
  const hw = clampedW * 0.5;
  const tipShift = (hash2D(originX, originZ, streakSeed) - 0.5) * clampedW * 0.4;
  const positions = new Float32Array([
    -hw, 0, 0.04,
    hw, 0, 0.04,
    tipShift, -height, 0.06
  ]);
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.computeVertexNormals();

  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, faceAngleY, 0));
  _tempPos.set(originX, originY, originZ);
  _tempMat4.compose(_tempPos, q, _tempScale);
  geom.applyMatrix4(_tempMat4);

  const colored = ensureNonIndexedColoredGeometry(geom, PALETTE.mossMid, (c, v) => {
    const t = Math.max(0, Math.min(1, (originY - v.y) / height));
    c.copy(cMossDark).lerp(cMossLight, t * 0.75);
  });
  foliageGeoms.push(colored);
}

export function buildRiftArchwayPanel({
  preset,
  seed,
  wallSpec,
  sideLength,
  baseDepth,
  wallH,
  wallT,
  cx,
  cz,
  gy,
  nx,
  nz,
  tx,
  tz,
  innerFaceRotY,
  placePanelPart,
  placeTrimPart,
  addHangingVine,
  contentGroup,
  disposableGeometries,
  extraDisposables,
  riftPortalRings
}) {
  const openW = wallSpec.riftWidth;
  const wingW = (sideLength - openW) * 0.5;
  const wingCenterOffset = (openW + wingW) * 0.5;
  const totalH = wallH + baseDepth;

  for (const sign of [-1, 1]) {
    const wingGeom = new THREE.BoxGeometry(wingW, totalH, wallT, 2, 4, 1);
    placePanelPart(wingGeom, sign * wingCenterOffset, (wallH - baseDepth) * 0.5, 0);

    const ledgeGeom = new THREE.BoxGeometry(wingW + 0.25, 0.55, wallT + 0.65);
    placePanelPart(ledgeGeom, sign * wingCenterOffset, wallH - 0.25, 0, 0.22);

    const jambGeom = new THREE.BoxGeometry(1.35, wallH + 1.8, wallT + 0.88, 1, 4, 1);
    placePanelPart(jambGeom, sign * (openW * 0.5 + 0.55), (wallH + 1.8) * 0.5 - 0.2, 0, 0.24);

    const pilasterGeom = new THREE.BoxGeometry(
      wallSpec.pilasterWidth * 0.75,
      wallSpec.pilasterHeight + baseDepth,
      wallSpec.pilasterDepth,
      1,
      4,
      1
    );
    placePanelPart(
      pilasterGeom,
      sign * (openW * 0.5 + 3.4),
      (wallSpec.pilasterHeight - baseDepth) * 0.5,
      -(wallT * 0.5 + wallSpec.pilasterDepth * 0.45),
      0.20
    );

    const vWorldX = cx + tx * (sign * (openW * 0.5 + 1.2)) - nx * (wallT * 0.5 + 0.05);
    const vWorldZ = cz + tz * (sign * (openW * 0.5 + 1.2)) - nz * (wallT * 0.5 + 0.05);
    addHangingVine(vWorldX, gy + 9.6, vWorldZ, innerFaceRotY, 5.8, 0.40, seed + 901 + sign, preset.vineLeavesPerMeter);
  }

  const lintelGeom = new THREE.BoxGeometry(openW + 3.4, 1.55, wallT + 1.0, 3, 1, 1);
  placePanelPart(lintelGeom, 0, wallH + 0.85, 0, 0.16);

  const crownGeom = new THREE.BoxGeometry(openW + 2.2, 0.85, wallT + 0.6, 2, 1, 1);
  placePanelPart(crownGeom, 0, wallH + 1.95, 0);

  const archSegments = preset.wallArchSegs;
  const archRadius = openW * 0.5;
  for (let a = 0; a < archSegments; a++) {
    const t0 = (a / archSegments) * Math.PI;
    const t1 = ((a + 1) / archSegments) * Math.PI;
    const tm = (t0 + t1) * 0.5;
    const chord = 2 * archRadius * Math.sin((t1 - t0) * 0.5) + 0.16;
    const vx = -Math.cos(tm) * archRadius;
    const vy = (wallH - archRadius * 0.48) + Math.sin(tm) * (archRadius * 0.48);

    const voussoir = new THREE.BoxGeometry(chord, 0.75, wallT + 0.75);
    voussoir.rotateZ(tm - Math.PI * 0.5);
    placePanelPart(voussoir, vx, vy, 0, 0.25);
  }

  const backWallGeom = new THREE.BoxGeometry(openW + 0.8, wallH + 1.6, 0.55);
  placePanelPart(backWallGeom, 0, (wallH + 1.6) * 0.5 - 0.2, wallT * 0.5 - 0.22, 0.12);

  const transomGeom = new THREE.BoxGeometry(openW + 0.4, archRadius * 0.95, 0.55);
  placePanelPart(transomGeom, 0, wallH - archRadius * 0.35, wallT * 0.5 - 0.22, 0.12);

  for (let st = 0; st < 3; st++) {
    const sw = openW - 0.4 - st * 0.35;
    const sd = 0.55;
    const sh = 0.18;
    const stepGeom = new THREE.BoxGeometry(sw, sh, sd);
    placePanelPart(stepGeom, 0, (st + 0.5) * sh, -(wallT * 0.5 + (2.5 - st) * sd), 0.12);
  }

  const openInnerW = 3.6;
  const pierW = (openW - openInnerW) * 0.5;
  const pierH = 6.8;
  for (const side of [-1, 1]) {
    const px = side * (openInnerW * 0.5 + pierW * 0.5);
    const plinthGeom = new THREE.BoxGeometry(pierW + 0.25, 0.85, wallT + 0.2);
    placePanelPart(plinthGeom, px, 0.425, -0.05, 0.18);
    const shaftGeom = new THREE.BoxGeometry(pierW, pierH, wallT - 0.1);
    placePanelPart(shaftGeom, px, 0.85 + pierH * 0.5, -0.05, 0.18);
    const runeGeom = new THREE.BoxGeometry(0.18, pierH - 1.2, 0.12);
    placeTrimPart(runeGeom, px, 0.85 + pierH * 0.5, -(wallT * 0.5 + 0.08), PALETTE.tealGlow);
    const capGeom = new THREE.BoxGeometry(pierW + 0.35, 0.65, wallT + 0.25);
    placePanelPart(capGeom, px, 0.85 + pierH + 0.325, -0.05, 0.18);
  }

  for (const side of [-1, 1]) {
    const figGeom = new THREE.BoxGeometry(0.55, 1.6, 0.35);
    placePanelPart(figGeom, side * (openInnerW * 0.5 + 0.45), pierH - 0.2, -(wallT * 0.5 + 0.1), 0.15);
  }

  const portalCenter = new THREE.Vector3(
    cx - nx * (wallT * 0.25),
    gy + 4.0,
    cz - nz * (wallT * 0.25)
  );
  const portalGeo = new THREE.PlaneGeometry(3.5, 5.6);
  disposableGeometries.push(portalGeo);
  const portalTex = createPortalSwirlTexture();
  const portalMat = new THREE.MeshBasicMaterial({
    map: portalTex,
    color: 0x99dcff,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  extraDisposables.push(portalTex, portalMat);

  const pDisc = new THREE.Mesh(portalGeo, portalMat);
  pDisc.position.copy(portalCenter);
  pDisc.rotation.y = innerFaceRotY;
  contentGroup.add(pDisc);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x6fe0f0,
    transparent: true,
    opacity: 0.55,
    wireframe: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  extraDisposables.push(ringMat);

  const pRingRadii = [1.35, 1.75, 2.1];
  for (let r = 0; r < 3; r++) {
    const prGeo = new THREE.TorusGeometry(pRingRadii[r], 0.045, 8, 36);
    disposableGeometries.push(prGeo);
    const prMesh = new THREE.Mesh(prGeo, ringMat);
    prMesh.position.copy(portalCenter);
    prMesh.scale.set(1.0, 1.35, 1.0);
    prMesh.rotation.set((r - 1) * 0.18, innerFaceRotY + (r % 2 === 0 ? 1 : -1) * 0.15, r * 0.8);
    contentGroup.add(prMesh);
    riftPortalRings.push(prMesh);
  }

  return pDisc;
}

export function buildCliffSkirtSegments({
  preset,
  seed,
  wallSpec,
  getGroundY,
  stoneQuadrants,
  colors
}) {
  const { cStoneShade, cMossMid, cMossLight, colorB } = colors;
  const cliffRadSegs = preset.cliffRadialSegs;
  const cliffRingSegs = preset.cliffRingSegs;

  for (let s = 0; s < cliffRadSegs; s++) {
    const a0 = (s / cliffRadSegs) * Math.PI * 2;
    const a1 = ((s + 1) / cliffRadSegs) * Math.PI * 2;
    const am = (a0 + a1) * 0.5;
    const quadIdx = getQuadrantIndex(Math.cos(am), Math.sin(am));

    const segGeom = new THREE.BufferGeometry();
    const positions = [];
    const uvs = [];

    const ringPt = (angle, ringIdx) => {
      const t = ringIdx / cliffRingSegs;
      const sectorAngle = ((angle % (Math.PI / 6)) + (Math.PI / 6)) % (Math.PI / 6) - (Math.PI / 12);
      const wallOuterR = (wallSpec.apothem + wallSpec.thickness * 0.45) / Math.cos(sectorAngle);
      const cragNoise = (fbm2D(Math.cos(angle) * 3.2, Math.sin(angle) * 3.2, seed + 91 + ringIdx, 2) - 0.5) * 1.35 * t;
      const r = wallOuterR - 0.4 + t * 3.8 + cragNoise;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const baseGround = getGroundY(Math.cos(angle) * wallSpec.apothem, Math.sin(angle) * wallSpec.apothem);
      const drop = -Math.pow(t, 1.5) * 2.8;
      return new THREE.Vector3(x, baseGround + drop, z);
    };

    for (let r = 0; r < cliffRingSegs; r++) {
      const p00 = ringPt(a0, r);
      const p10 = ringPt(a1, r);
      const p01 = ringPt(a0, r + 1);
      const p11 = ringPt(a1, r + 1);

      positions.push(
        p00.x, p00.y, p00.z, p01.x, p01.y, p01.z, p10.x, p10.y, p10.z,
        p10.x, p10.y, p10.z, p01.x, p01.y, p01.z, p11.x, p11.y, p11.z
      );
      uvs.push(
        p00.x * 0.22, p00.z * 0.22, p01.x * 0.22, p01.z * 0.22, p10.x * 0.22, p10.z * 0.22,
        p10.x * 0.22, p10.z * 0.22, p01.x * 0.22, p01.z * 0.22, p11.x * 0.22, p11.z * 0.22
      );
    }

    segGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    segGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    segGeom.computeVertexNormals();

    const coloredCliff = ensureNonIndexedColoredGeometry(segGeom, PALETTE.mossMid, (c, v, n) => {
      const mNoise = fbm2D(v.x * 0.16, v.z * 0.16, seed + 107, 2);
      const keyDot = Math.max(0, n.x * BAKED_KEY_DIR.x + n.y * BAKED_KEY_DIR.y + n.z * BAKED_KEY_DIR.z);
      if (n.y > 0.50) {
        c.copy(cMossMid).lerp(cMossLight, mNoise * 0.65 + keyDot * 0.35);
      } else {
        c.copy(cStoneShade).lerp(colorB.setHex(PALETTE.strataBrown), 0.55);
        c.multiplyScalar(0.80 + keyDot * 0.25);
      }
    });
    stoneQuadrants[quadIdx].push(coloredCliff);
  }
}