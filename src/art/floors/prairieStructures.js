import * as THREE from 'three';
import {
  OUTLINE_COLOR,
  MOSS_COLOR,
} from './prairieConfig.js';
import {
  createRng,
  clamp,
  lerp,
  normalizeGeometry,
  createInvertedOutlineGeometry,
  getChunkIndex,
  createSculptedRockGeometry,
  createContactDecalGeometry,
} from './prairieHelpers.js';
import {
  buildAncientRuins,
  buildGoblinCampsite,
  buildGates,
  createGateDoorLeafMesh,
} from './prairieLandmarks.js';

export {
  buildAncientRuins,
  buildGoblinCampsite,
  buildGates,
  createGateDoorLeafMesh,
};

export function addBoulderOutcrop(x, z, radius, seed, palette, cfg, stoneChunks, propChunks, isChoke) {
  const rng = createRng(seed);
  const cIdx = getChunkIndex(z);
  const mainH = isChoke ? radius * (1.85 + rng() * 0.35) : radius * (1.25 + rng() * 0.45);
  const mainRock = createSculptedRockGeometry(radius * 0.96, mainH, cfg.rockDetail, seed + 1);
  mainRock.rotateY(rng() * Math.PI * 2);
  mainRock.translate(x, 0, z);

  stoneChunks[cIdx].push(
    normalizeGeometry(mainRock, palette.rockBase, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.65,
      bottomAO: 0.34,
      aoHeight: mainH * 0.55,
      variation: 0.06,
    })
  );

  if (isChoke || radius >= 1.45) {
    propChunks[cIdx].push(createInvertedOutlineGeometry(mainRock, 0.036, OUTLINE_COLOR));
  }

  const subCount = isChoke ? 3 : 2 + Math.floor(rng() * 2);
  for (let i = 0; i < subCount; i++) {
    const ang = (i / subCount) * Math.PI * 2 + rng() * 0.9;
    const dist = radius * (0.48 + rng() * 0.28);
    const sr = radius * (0.36 + rng() * 0.24);
    const sh = sr * (0.9 + rng() * 0.55);
    const sub = createSculptedRockGeometry(sr, sh, 1, seed + 17 + i * 13);
    sub.rotateY(rng() * Math.PI * 2);
    sub.translate(x + Math.cos(ang) * dist, 0, z + Math.sin(ang) * dist);
    const col = i % 2 === 0 ? palette.rockHighlight : palette.rockCrevice;
    stoneChunks[cIdx].push(
      normalizeGeometry(sub, col, {
        mossColor: MOSS_COLOR,
        mossStrength: 0.5,
        bottomAO: 0.32,
        aoHeight: sh * 0.6,
      })
    );
  }

  propChunks[cIdx].push(createContactDecalGeometry(x, z, radius * 1.18, radius * 1.12, rng() * Math.PI));
}

export function addWindsweptTree(x, z, baseRadius, isBirch, seed, palette, cfg, propChunks, canopyInstances) {
  const rng = createRng(seed);
  const cIdx = getChunkIndex(z);
  const trunkColor = isBirch ? 0xd5cfc2 : palette.woodDark;
  const trunkH = (isBirch ? 4.4 : 4.8) + rng() * 1.1;
  const rBottom = clamp(baseRadius * 0.34, 0.28, 0.58);
  const rTop = rBottom * 0.42;

  const windLeanX = 0.55 + rng() * 0.35;
  const windLeanZ = -0.25 + (rng() - 0.5) * 0.3;

  const segsH = 6;
  const trunkGeom = new THREE.CylinderGeometry(rTop, rBottom, trunkH, 7, segsH, false).toNonIndexed();
  const pos = trunkGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let vx = pos.getX(i);
    let vy = pos.getY(i) + trunkH * 0.5;
    let vz = pos.getZ(i);
    const t = clamp(vy / trunkH, 0, 1);
    const bend = t * t;
    vx += windLeanX * bend + Math.sin(t * Math.PI) * 0.14;
    vz += windLeanZ * bend;
    if (t < 0.22) {
      const flare = 1.0 + (0.22 - t) * 1.4;
      vx *= flare;
      vz *= flare;
    }
    pos.setXYZ(i, vx + x, vy, vz + z);
  }
  trunkGeom.computeVertexNormals();

  propChunks[cIdx].push(
    normalizeGeometry(trunkGeom, trunkColor, {
      mossColor: MOSS_COLOR,
      mossStrength: isBirch ? 0.2 : 0.45,
      bottomAO: 0.38,
      aoHeight: 1.4,
      variation: isBirch ? 0.08 : 0.05,
    })
  );
  propChunks[cIdx].push(createInvertedOutlineGeometry(trunkGeom, 0.03, OUTLINE_COLOR));

  const topX = x + windLeanX;
  const topY = trunkH * 0.92;
  const topZ = z + windLeanZ;

  const branchCount = 3;
  for (let b = 0; b < branchCount; b++) {
    const bAng = (b / branchCount) * Math.PI * 2 + rng() * 0.5;
    const bLen = 1.5 + rng() * 0.8;
    const bGeom = new THREE.CylinderGeometry(rTop * 0.32, rTop * 0.72, bLen, 5, 1, false);
    bGeom.translate(0, bLen * 0.5, 0);
    bGeom.rotateZ(-0.62 - rng() * 0.25);
    bGeom.rotateY(bAng);
    const startH = trunkH * (0.68 + b * 0.08);
    const startT = startH / trunkH;
    const bx = x + windLeanX * startT * startT;
    const bz = z + windLeanZ * startT * startT;
    bGeom.translate(bx, startH, bz);
    propChunks[cIdx].push(
      normalizeGeometry(bGeom, isBirch ? palette.woodWeathered : palette.woodDark, {
        bottomAO: 0.15,
      })
    );

    const tipX = bx + Math.cos(bAng) * bLen * 0.78 + 0.25;
    const tipY = startH + bLen * 0.58;
    const tipZ = bz - Math.sin(bAng) * bLen * 0.78;
    canopyInstances.push({
      x: tipX,
      y: tipY,
      z: tipZ,
      sx: 1.45 + rng() * 0.45,
      sy: 0.82 + rng() * 0.25,
      sz: 1.35 + rng() * 0.45,
      rotY: rng() * Math.PI * 2,
      colorHex: b % 2 === 0 ? palette.grassDark : palette.grassLight,
    });
  }

  const puffs = cfg.canopyPuffsPerTree;
  for (let p = 0; p < puffs; p++) {
    const pAng = (p / puffs) * Math.PI * 2 + rng() * 0.4;
    const pRad = (p === 0 ? 0 : 0.65 + rng() * 1.45) * (isBirch ? 0.85 : 1.1);
    const px = topX + Math.cos(pAng) * pRad + 0.35;
    const py = topY + (rng() - 0.3) * 0.95;
    const pz = topZ + Math.sin(pAng) * pRad * 0.85;
    const sx = (isBirch ? 1.25 : 1.65) + rng() * 0.65;
    const sy = (isBirch ? 0.85 : 0.95) + rng() * 0.35;
    const sz = (isBirch ? 1.15 : 1.5) + rng() * 0.55;
    const shade = p % 3 === 0 ? palette.grassLight : p % 3 === 1 ? palette.grassDark : palette.terrainBase;
    canopyInstances.push({
      x: px,
      y: py,
      z: pz,
      sx,
      sy,
      sz,
      rotY: rng() * Math.PI * 2,
      colorHex: shade,
    });
  }
}

export function addDryStoneWallSegment(x0, z0, x1, z1, seed, palette, stoneChunks, propChunks) {
  const rng = createRng(seed);
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  if (len < 0.6) return;

  const ang = Math.atan2(dx, dz);
  const cIdx = getChunkIndex((z0 + z1) * 0.5);
  const midX = (x0 + x1) * 0.5;
  const midZ = (z0 + z1) * 0.5;

  const coreH = 0.58;
  const coreW = 0.62;
  const core = new THREE.BoxGeometry(coreW, coreH, len, 1, 2, Math.max(2, Math.floor(len * 1.5))).toNonIndexed();
  const pos = core.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let vx = pos.getX(i);
    let vy = pos.getY(i) + coreH * 0.5;
    let vz = pos.getZ(i);
    const taper = 1.0 - (vy / coreH) * 0.24;
    const wobble = Math.sin(vz * 2.3 + vy * 4.1) * 0.05;
    vx = vx * taper + wobble;
    pos.setXYZ(i, vx, vy, vz);
  }
  core.rotateY(ang);
  core.translate(midX, 0, midZ);
  core.computeVertexNormals();

  stoneChunks[cIdx].push(
    normalizeGeometry(core, palette.rockBase, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.72,
      bottomAO: 0.35,
      aoHeight: 0.45,
      variation: 0.07,
    })
  );

  const capCount = Math.max(3, Math.floor(len * 1.35));
  for (let i = 0; i < capCount; i++) {
    const t = (i + 0.5) / capCount;
    const cx = lerp(x0, x1, t) + (rng() - 0.5) * 0.08;
    const cz = lerp(z0, z1, t) + (rng() - 0.5) * 0.08;
    const cw = 0.52 + rng() * 0.22;
    const ch = 0.16 + rng() * 0.12;
    const cl = (len / capCount) * (0.78 + rng() * 0.28);
    const cap = new THREE.BoxGeometry(cw, ch, cl);
    cap.rotateY(ang + (rng() - 0.5) * 0.18);
    cap.translate(cx, coreH + ch * 0.35, cz);
    stoneChunks[cIdx].push(
      normalizeGeometry(cap, i % 2 === 0 ? palette.rockHighlight : palette.stoneRuin, {
        mossColor: MOSS_COLOR,
        mossStrength: 0.8,
        bottomAO: 0.15,
      })
    );
  }

  propChunks[cIdx].push(createContactDecalGeometry(midX, midZ, coreW * 0.9, len * 0.55, ang));
}

export function addRanchFenceSegment(x0, z0, x1, z1, seed, palette, propChunks, fencePostInstances) {
  const rng = createRng(seed);
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  if (len < 1.0) return;

  const spanCount = Math.max(1, Math.round(len / 2.8));
  const ang = Math.atan2(dx, dz);
  const cIdx = getChunkIndex((z0 + z1) * 0.5);

  for (let i = 0; i <= spanCount; i++) {
    const t = i / spanCount;
    const px = lerp(x0, x1, t);
    const pz = lerp(z0, z1, t);
    fencePostInstances.push({
      x: px,
      y: 0,
      z: pz,
      sx: 0.95 + rng() * 0.18,
      sy: 0.92 + rng() * 0.18,
      sz: 0.95 + rng() * 0.18,
      rotY: ang + (rng() - 0.5) * 0.22,
      tiltX: (rng() - 0.5) * 0.07,
      tiltZ: (rng() - 0.5) * 0.07,
    });
  }

  const spanLen = len / spanCount;
  for (let i = 0; i < spanCount; i++) {
    const tMid = (i + 0.5) / spanCount;
    const mx = lerp(x0, x1, tMid);
    const mz = lerp(z0, z1, tMid);

    const railHeights = [0.44, 0.86];
    for (let r = 0; r < railHeights.length; r++) {
      const rail = new THREE.BoxGeometry(0.08, 0.11, spanLen * 1.04);
      rail.rotateX((rng() - 0.5) * 0.04);
      rail.rotateY(ang + (rng() - 0.5) * 0.03);
      rail.translate(mx, railHeights[r], mz);
      propChunks[cIdx].push(
        normalizeGeometry(rail, r === 0 ? palette.woodWeathered : palette.woodLight, {
          mossColor: MOSS_COLOR,
          mossStrength: 0.35,
          bottomAO: 0.12,
        })
      );
    }
  }
}