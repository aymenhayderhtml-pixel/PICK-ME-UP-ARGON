import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE } from './shellConfig.js';
import {
  hash2D,
  ensureNonIndexedColoredGeometry,
  getQuadrantIndex
} from './shellTextures.js';
import {
  createStoneVertexColorizer,
  appendHangingVine,
  appendMossStreak,
  buildRiftArchwayPanel,
  buildCliffSkirtSegments
} from './shellWallFeatures.js';

const _tempMat4 = new THREE.Matrix4();
const _tempPos = new THREE.Vector3();
const _tempQuat = new THREE.Quaternion();
const _tempEuler = new THREE.Euler();
const _tempScale = new THREE.Vector3(1, 1, 1);
const _colorA = new THREE.Color();
const _colorB = new THREE.Color();

export function buildWallAndCliffQuadrants({
  preset,
  seed,
  wallSpec,
  riftSideIndex,
  getGroundY,
  stoneMat,
  foliageMat,
  trimEmissiveMat,
  contentGroup,
  disposableGeometries
}) {
  const stoneQuadrants = [[], [], [], []];
  const foliageGeoms = [];
  const trimGeoms = [];
  let riftPortalDisc = null;
  const riftPortalRings = [];
  const extraDisposables = [];

  const sideLength = 2 * wallSpec.apothem * Math.tan(Math.PI / 12);
  const baseDepth = 2.6;
  const wallH = wallSpec.height;
  const wallT = wallSpec.thickness;

  const colors = {
    cStoneLit: new THREE.Color(PALETTE.stoneLit),
    cStoneMid: new THREE.Color(PALETTE.stoneMid),
    cStoneShade: new THREE.Color(PALETTE.stoneShade),
    cCrevice: new THREE.Color(PALETTE.stoneCrevice),
    cMossDark: new THREE.Color(PALETTE.mossDark),
    cMossMid: new THREE.Color(PALETTE.mossMid),
    cMossLight: new THREE.Color(PALETTE.mossLight),
    colorA: _colorA,
    colorB: _colorB
  };

  const stoneVertexColorizer = createStoneVertexColorizer(seed, colors);

  function addStonePart(geom, mat4, quadIdx, aoBoost = 0) {
    geom.applyMatrix4(mat4);
    const colored = ensureNonIndexedColoredGeometry(geom, PALETTE.stoneLit, (c, v, n, i) => {
      stoneVertexColorizer(c, v, n, i, aoBoost);
    });
    stoneQuadrants[quadIdx].push(colored);
  }

  function addTrimPart(geom, mat4, hexColor, brightnessFn) {
    geom.applyMatrix4(mat4);
    const colored = ensureNonIndexedColoredGeometry(geom, hexColor, brightnessFn);
    trimGeoms.push(colored);
  }

  function addHangingVine(originX, originY, originZ, faceAngleY, length, spreadW, vineSeed, leavesPerMeter) {
    appendHangingVine({
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
    });
  }

  function addMossStreak(originX, originY, originZ, faceAngleY, width, height, streakSeed) {
    appendMossStreak({
      foliageGeoms,
      originX,
      originY,
      originZ,
      faceAngleY,
      width,
      height,
      streakSeed,
      colors
    });
  }

  for (let k = 0; k < 12; k++) {
    const vAngle = k * (Math.PI / 6);
    const vx = Math.cos(vAngle) * wallSpec.vertexRadius;
    const vz = Math.sin(vAngle) * wallSpec.vertexRadius;
    const gy = getGroundY(vx, vz);
    const quadIdx = getQuadrantIndex(vx, vz);

    const pillarTotalH = wallSpec.pillarHeight + baseDepth;
    const shaftGeom = new THREE.BoxGeometry(wallSpec.pillarWidth, pillarTotalH, wallSpec.pillarWidth, 1, 5, 1);
    _tempEuler.set(0, -vAngle, 0);
    _tempQuat.setFromEuler(_tempEuler);
    _tempPos.set(vx, gy + (wallSpec.pillarHeight - baseDepth) * 0.5, vz);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    addStonePart(shaftGeom, _tempMat4, quadIdx, 0.08);

    const plinthGeom = new THREE.BoxGeometry(wallSpec.pillarWidth + 0.6, 1.5, wallSpec.pillarWidth + 0.6);
    _tempPos.set(vx, gy + 0.55, vz);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    addStonePart(plinthGeom, _tempMat4, quadIdx, 0.28);

    const collarGeom = new THREE.BoxGeometry(wallSpec.pillarWidth + 0.48, 0.68, wallSpec.pillarWidth + 0.48);
    _tempPos.set(vx, gy + wallSpec.pillarHeight - 0.3, vz);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    addStonePart(collarGeom, _tempMat4, quadIdx, 0.22);

    const capGeom = new THREE.ConeGeometry(wallSpec.pillarCapRadius, wallSpec.pillarCapHeight, preset.pillarCapSegs);
    _tempEuler.set(0, -vAngle + Math.PI / 4, 0);
    _tempQuat.setFromEuler(_tempEuler);
    _tempPos.set(vx, gy + wallSpec.pillarHeight + wallSpec.pillarCapHeight * 0.5, vz);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    addStonePart(capGeom, _tempMat4, quadIdx, 0);

    if (k % 2 === 0) {
      const inX = vx - Math.cos(vAngle) * (wallSpec.pillarWidth * 0.50);
      const inZ = vz - Math.sin(vAngle) * (wallSpec.pillarWidth * 0.50);
      const inFaceAngle = Math.atan2(-Math.cos(vAngle), -Math.sin(vAngle));
      const vineLen = 4.0 + hash2D(k, 1, seed + 55) * 3.5;
      addHangingVine(inX, gy + 11.2, inZ, inFaceAngle, vineLen, 0.40, seed + k * 37, preset.vineLeavesPerMeter);
    }
  }

  const denseVinePanels = new Set([0, 2, 5, 7, 10]);

  for (let k = 0; k < 12; k++) {
    const midAngle = (k + 0.5) * (Math.PI / 6);
    const nx = Math.cos(midAngle);
    const nz = Math.sin(midAngle);
    const tx = -nz;
    const tz = nx;
    const cx = nx * wallSpec.apothem;
    const cz = nz * wallSpec.apothem;
    const gy = getGroundY(cx, cz);
    const quadIdx = getQuadrantIndex(cx, cz);

    const panelRotY = Math.atan2(nx, nz);
    const innerFaceRotY = Math.atan2(-nx, -nz);
    const panelQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, panelRotY, 0));

    const placePanelPart = (geom, localX, localY, localZ, aoBoost = 0) => {
      _tempPos.set(
        cx + tx * localX + nx * localZ,
        gy + localY,
        cz + tz * localX + nz * localZ
      );
      _tempMat4.compose(_tempPos, panelQuat, _tempScale);
      addStonePart(geom, _tempMat4, quadIdx, aoBoost);
    };

    const placeTrimPart = (geom, localX, localY, localZ, hexColor, fn) => {
      _tempPos.set(
        cx + tx * localX + nx * localZ,
        gy + localY,
        cz + tz * localX + nz * localZ
      );
      _tempMat4.compose(_tempPos, panelQuat, _tempScale);
      addTrimPart(geom, _tempMat4, hexColor, fn);
    };

    if (k === riftSideIndex) {
      riftPortalDisc = buildRiftArchwayPanel({
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
      });
    } else {
      const totalH = wallH + baseDepth;
      const wallPanelGeom = new THREE.BoxGeometry(sideLength, totalH, wallT, 4, 5, 1);
      placePanelPart(wallPanelGeom, 0, (wallH - baseDepth) * 0.5, 0);

      const basePlinthGeom = new THREE.BoxGeometry(sideLength, 1.15, wallT + 0.58, 3, 1, 1);
      placePanelPart(basePlinthGeom, 0, 0.4, 0, 0.34);

      const underCorniceGeom = new THREE.BoxGeometry(sideLength, 0.42, wallT + 0.42, 3, 1, 1);
      placePanelPart(underCorniceGeom, 0, wallH - 0.62, 0, 0.42);

      const walkwayTopGeom = new THREE.BoxGeometry(sideLength, 0.45, wallT + 0.82, 4, 1, 1);
      placePanelPart(walkwayTopGeom, 0, wallH - 0.18, 0);

      const copingCount = 4;
      const copingSpan = sideLength / copingCount;
      for (let c = 0; c < copingCount; c++) {
        const lx = (c + 0.5 - copingCount * 0.5) * copingSpan;
        const merlonW = copingSpan * 0.68;
        const merlonGeom = new THREE.BoxGeometry(merlonW, 0.64, 0.65);
        placePanelPart(merlonGeom, lx, wallH + 0.35, wallT * 0.5 - 0.22);

        const curbGeom = new THREE.BoxGeometry(merlonW * 0.9, 0.34, 0.45);
        placePanelPart(curbGeom, lx, wallH + 0.2, -wallT * 0.5 + 0.18);
      }

      for (let ms = 0; ms < 5; ms++) {
        const lx = ((ms + 0.5) / 5 - 0.5) * (sideLength - 2.4);
        const wx = cx + tx * lx - nx * (wallT * 0.5 + 0.03);
        const wz = cz + tz * lx - nz * (wallT * 0.5 + 0.03);
        const streakW = 0.28 + hash2D(k, ms, seed + 141) * 0.16;
        const streakH = 0.65 + hash2D(ms, k, seed + 151) * 1.15;
        addMossStreak(wx, gy + wallH - 0.65, wz, innerFaceRotY, streakW, streakH, seed + k * 19 + ms);
      }

      const pilasterOffsets = [-wallSpec.pilasterSpacing, 0, wallSpec.pilasterSpacing];
      for (let p = 0; p < pilasterOffsets.length; p++) {
        const px = pilasterOffsets[p];
        const pilH = wallSpec.pilasterHeight + baseDepth;

        const innerPilGeom = new THREE.BoxGeometry(
          wallSpec.pilasterWidth,
          pilH,
          wallSpec.pilasterDepth,
          1,
          4,
          1
        );
        placePanelPart(
          innerPilGeom,
          px,
          (wallSpec.pilasterHeight - baseDepth) * 0.5,
          -(wallT * 0.5 + wallSpec.pilasterDepth * 0.45),
          0.18
        );

        const capGeom = new THREE.BoxGeometry(
          wallSpec.pilasterWidth + 0.18,
          0.46,
          wallSpec.pilasterDepth + 0.22
        );
        capGeom.rotateX(0.22);
        placePanelPart(
          capGeom,
          px,
          wallSpec.pilasterHeight + 0.12,
          -(wallT * 0.5 + wallSpec.pilasterDepth * 0.45)
        );

        const outerPilGeom = new THREE.BoxGeometry(
          wallSpec.pilasterWidth * 0.8,
          pilH * 0.92,
          wallSpec.pilasterDepth * 0.75
        );
        placePanelPart(
          outerPilGeom,
          px,
          (wallSpec.pilasterHeight * 0.92 - baseDepth) * 0.5,
          wallT * 0.5 + wallSpec.pilasterDepth * 0.32,
          0.20
        );

        if ((k + p) % 2 === 0) {
          const bracketZ = -(wallT * 0.5 + wallSpec.pilasterDepth + 0.34);
          const bracketArm = new THREE.BoxGeometry(0.16, 0.18, 0.85);
          placeTrimPart(bracketArm, px, 4.75, bracketZ, PALETTE.iron);

          const bracketWallPlate = new THREE.BoxGeometry(0.28, 0.75, 0.10);
          placeTrimPart(bracketWallPlate, px, 4.50, -(wallT * 0.5 + wallSpec.pilasterDepth + 0.04), PALETTE.iron);

          const bracketBrace = new THREE.BoxGeometry(0.14, 0.75, 0.14);
          bracketBrace.rotateX(0.65);
          placeTrimPart(bracketBrace, px, 4.40, bracketZ + 0.18, PALETTE.iron);
        }

        if (p === 1 && k % 3 === 1) {
          const pZ = -(wallT * 0.5 + wallSpec.pilasterDepth + 0.06);
          const plaqueFrame = new THREE.BoxGeometry(1.15, 0.82, 0.12);
          placeTrimPart(plaqueFrame, px, 2.85, pZ, PALETTE.plaqueFrame);
          const plaqueFace = new THREE.BoxGeometry(0.95, 0.64, 0.15);
          placeTrimPart(plaqueFace, px, 2.85, pZ - 0.02, PALETTE.plaqueBronze);
        }
      }

      const alcoveOffsets = [-wallSpec.pilasterSpacing * 0.5, wallSpec.pilasterSpacing * 0.5];
      for (let a = 0; a < alcoveOffsets.length; a++) {
        const ax = alcoveOffsets[a];
        const alcoveW = 2.15;
        const straightH = 2.65;
        const sillY = 0.85;
        const archR = alcoveW * 0.5;
        const zSurface = -(wallT * 0.5);

        const sillGeom = new THREE.BoxGeometry(alcoveW + 0.62, 0.30, 0.52);
        placePanelPart(sillGeom, ax, sillY, zSurface - 0.22, 0.14);

        for (const s of [-1, 1]) {
          const corbel = new THREE.BoxGeometry(0.32, 0.34, 0.38);
          placePanelPart(corbel, ax + s * (alcoveW * 0.36), sillY - 0.28, zSurface - 0.15, 0.35);

          const jamb = new THREE.BoxGeometry(0.36, straightH, 0.42);
          placePanelPart(jamb, ax + s * (alcoveW * 0.5 + 0.16), sillY + straightH * 0.5, zSurface - 0.18, 0.24);
        }

        const sillWorldX = cx + tx * ax - nx * (wallT * 0.5 + 0.04);
        const sillWorldZ = cz + tz * ax - nz * (wallT * 0.5 + 0.04);
        addMossStreak(sillWorldX, gy + sillY - 0.12, sillWorldZ, innerFaceRotY, 0.42, 0.65, seed + k * 41 + a);

        const archSegs = preset.wallArchSegs;
        const archCenterY = sillY + straightH;
        for (let vs = 0; vs < archSegs; vs++) {
          const t0 = (vs / archSegs) * Math.PI;
          const t1 = ((vs + 1) / archSegs) * Math.PI;
          const tm = (t0 + t1) * 0.5;
          const rMid = archR + 0.18;
          const chord = 2 * rMid * Math.sin((t1 - t0) * 0.5) + 0.08;
          const vx = ax - Math.cos(tm) * rMid;
          const vy = archCenterY + Math.sin(tm) * rMid;
          const isKeystone = vs === Math.floor(archSegs * 0.5);

          const voussoir = new THREE.BoxGeometry(chord, isKeystone ? 0.48 : 0.38, isKeystone ? 0.48 : 0.42);
          voussoir.rotateZ(tm - Math.PI * 0.5);
          placePanelPart(voussoir, vx, vy, zSurface - 0.19, 0.20);
        }

        const backPositions = [];
        const backUvs = [];
        const halfW = alcoveW * 0.5;
        const yBot = sillY + 0.12;
        const yMid = archCenterY;
        const zBack = zSurface - 0.05;

        backPositions.push(
          -halfW, yBot, zBack, halfW, yBot, zBack, halfW, yMid, zBack,
          -halfW, yBot, zBack, halfW, yMid, zBack, -halfW, yMid, zBack
        );
        backUvs.push(
          0, 0, alcoveW * 0.35, 0, alcoveW * 0.35, straightH * 0.35,
          0, 0, alcoveW * 0.35, straightH * 0.35, 0, straightH * 0.35
        );

        for (let vs = 0; vs < archSegs; vs++) {
          const t0 = (vs / archSegs) * Math.PI;
          const t1 = ((vs + 1) / archSegs) * Math.PI;
          const x0 = -Math.cos(t0) * halfW;
          const y0 = yMid + Math.sin(t0) * halfW;
          const x1 = -Math.cos(t1) * halfW;
          const y1 = yMid + Math.sin(t1) * halfW;

          backPositions.push(0, yMid, zBack, x0, y0, zBack, x1, y1, zBack);
          backUvs.push(
            halfW * 0.35, straightH * 0.35,
            (x0 + halfW) * 0.35, (y0 - yBot) * 0.35,
            (x1 + halfW) * 0.35, (y1 - yBot) * 0.35
          );
        }

        const backGeom = new THREE.BufferGeometry();
        backGeom.setAttribute('position', new THREE.Float32BufferAttribute(backPositions, 3));
        backGeom.setAttribute('uv', new THREE.Float32BufferAttribute(backUvs, 2));
        backGeom.computeVertexNormals();
        const bNorm = backGeom.attributes.normal;
        for (let ni = 0; ni < bNorm.count; ni++) {
          bNorm.setXYZ(ni, 0, 0, -1);
        }
        placePanelPart(backGeom, ax, 0, 0, 0.45);

        if ((k + a) % 2 === 0) {
          const grateZ = zSurface - 0.14;
          for (const barX of [-0.55, 0, 0.55]) {
            const vBar = new THREE.BoxGeometry(0.06, straightH + 0.55, 0.06);
            placeTrimPart(vBar, ax + barX, sillY + (straightH + 0.55) * 0.5, grateZ, PALETTE.iron);
          }
          for (const barY of [1.55, 2.35, 3.15]) {
            const hBar = new THREE.BoxGeometry(alcoveW - 0.12, 0.06, 0.06);
            placeTrimPart(hBar, ax, barY, grateZ, PALETTE.iron);
          }
        }

        if (k % 3 === 0 && a === 0) {
          const lanternGeom = new THREE.OctahedronGeometry(0.24, 0);
          placeTrimPart(lanternGeom, ax, 3.15, zSurface - 0.36, PALETTE.warmGlow);
        }
      }

      const isDensePanel = denseVinePanels.has(k);
      const vinePositionsLocalX = isDensePanel
        ? [-8.2, -6.3, -5.6, -4.3, -1.7, -0.4, 0.4, 1.7, 4.3, 5.6, 6.3, 8.2]
        : (k % 2 === 1 ? [-6.1, -1.6, 5.8] : [-5.9, 1.6]);

      for (let vIdx = 0; vIdx < vinePositionsLocalX.length; vIdx++) {
        const lx = vinePositionsLocalX[vIdx];
        const vSeed = seed + k * 131 + vIdx * 17;
        const hRand = hash2D(k, vIdx, vSeed);
        const reachesGround = isDensePanel && (vIdx === 2 || vIdx === 7);
        const vineLen = reachesGround ? (6.8 + hRand * 1.1) : (3.0 + hRand * 3.8);
        const startY = gy + wallH - 0.25 - (vIdx % 3) * 0.35;
        const depthOffset = Math.abs(Math.abs(lx) - 6.0) < 0.8 || Math.abs(lx) < 0.8
          ? (wallT * 0.5 + wallSpec.pilasterDepth + 0.03)
          : (wallT * 0.5 + 0.04);

        const wx = cx + tx * lx - nx * depthOffset;
        const wz = cz + tz * lx - nz * depthOffset;
        addHangingVine(wx, startY, wz, innerFaceRotY, vineLen, 0.40, vSeed, preset.vineLeavesPerMeter);

        if (isDensePanel && vIdx % 3 === 0) {
          const ox = cx + tx * lx + nx * (wallT * 0.5 + 0.04);
          const oz = cz + tz * lx + nz * (wallT * 0.5 + 0.04);
          addHangingVine(ox, gy + wallH - 0.3, oz, panelRotY, 3.5 + hRand * 3.5, 0.38, vSeed + 77, preset.vineLeavesPerMeter);
        }
      }
    }
  }

  buildCliffSkirtSegments({
    preset,
    seed,
    wallSpec,
    getGroundY,
    stoneQuadrants,
    colors
  });

  for (let q = 0; q < 4; q++) {
    if (stoneQuadrants[q].length > 0) {
      const mergedStone = mergeGeometries(stoneQuadrants[q], false);
      for (const g of stoneQuadrants[q]) g.dispose();
      disposableGeometries.push(mergedStone);

      const stoneMesh = new THREE.Mesh(mergedStone, stoneMat);
      stoneMesh.name = `WallCliffQuadrant_${q}`;
      contentGroup.add(stoneMesh);
    }
  }

  if (foliageGeoms.length > 0) {
    const mergedFoliage = mergeGeometries(foliageGeoms, false);
    for (const g of foliageGeoms) g.dispose();
    disposableGeometries.push(mergedFoliage);

    const foliageMesh = new THREE.Mesh(mergedFoliage, foliageMat);
    foliageMesh.name = 'WallVinesAndMoss';
    contentGroup.add(foliageMesh);
  }

  if (trimGeoms.length > 0) {
    const mergedTrim = mergeGeometries(trimGeoms, false);
    for (const g of trimGeoms) g.dispose();
    disposableGeometries.push(mergedTrim);

    const trimMesh = new THREE.Mesh(mergedTrim, trimEmissiveMat);
    trimMesh.name = 'WallGratesBracketsAndPlaques';
    contentGroup.add(trimMesh);
  }

  for (let i = 0; i < extraDisposables.length; i++) {
    disposableGeometries.push(extraDisposables[i]);
  }

  return {
    riftPortalDisc,
    riftPortalRings
  };
}