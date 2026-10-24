// src/art/floors/forestGeometries.js
// Procedural primitive geometry builders for Floor 3: rolling meadow, trees, pillars, boulders, mountains, and sky.

import * as THREE from 'three';
import {
  valueNoise2D,
  fbm2D,
  smoothstep,
  mergeStaticGeometries,
  paintGeometryGradientY,
  evaluateTerrainHeight
} from './forestUtils.js';

export function buildRollingMeadowTerrainGeometry() {
  const size = 136;
  const segs = 180;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);

  const cDeepGreen = new THREE.Color(0x36642b);
  const cMidGreen = new THREE.Color(0x558c36);
  const cLushGreen = new THREE.Color(0x76b040);
  const cSunlitChartreuse = new THREE.Color(0x9ed14b);
  const cEarthyBrown = new THREE.Color(0x7f6c4f);
  const cWornDirt = new THREE.Color(0x948060);
  const cWork = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = evaluateTerrainHeight(x, z);
    pos.setY(i, y);

    const r = Math.hypot(x, z);
    const nBroad = fbm2D(x * 0.09 + 3.1, z * 0.09 - 5.4);
    const nDetail = valueNoise2D(x * 0.28 - 11.2, z * 0.28 + 6.8);
    const nPatch = valueNoise2D(x * 0.19 + 21.0, z * 0.19 + 19.0);

    if (r > 22.0) {
      const outerT = smoothstep(22.0, 48.0, r);
      cWork.copy(cMidGreen).lerp(cDeepGreen, outerT * 0.72 + (1 - nBroad) * 0.28);
    } else {
      const innerT = 1.0 - smoothstep(4.0, 21.0, r);
      cWork.copy(cMidGreen).lerp(cLushGreen, nBroad * 0.75 + innerT * 0.25);
      if (nDetail > 0.56) {
        cWork.lerp(cSunlitChartreuse, (nDetail - 0.56) * 1.45);
      }
    }

    if (nPatch > 0.68 && r < 25.0) {
      const brownWeight = smoothstep(0.68, 0.86, nPatch) * 0.62;
      cWork.lerp(cEarthyBrown, brownWeight);
    }

    const clearingWarp = (nDetail - 0.5) * 1.9 + (nBroad - 0.5) * 1.4;
    const clearingDist = Math.hypot(x * 0.9, (z + 2.2) * 1.05) + clearingWarp;
    if (clearingDist < 8.8) {
      const dirtFactor = 1.0 - smoothstep(4.2, 8.8, clearingDist);
      cWork.lerp(cWornDirt, dirtFactor * 0.88);
    }

    if (z > -2.5 && z < 44.0) {
      const pathCenter = Math.sin(z * 0.11) * 0.85;
      const dPath = Math.abs(x - pathCenter) + (nDetail - 0.5) * 0.85;
      if (dPath < 3.4) {
        const pathFactor = (1.0 - smoothstep(1.35, 3.4, dPath)) * (1.0 - smoothstep(38.0, 44.0, z));
        cWork.lerp(cWornDirt, pathFactor * 0.86);
      }
    }

    colors[i * 3] = cWork.r;
    colors[i * 3 + 1] = cWork.g;
    colors[i * 3 + 2] = cWork.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export function buildWornDirtOverlayGeometry() {
  const parts = [];

  const centerGeo = new THREE.RingGeometry(0.0, 7.2, 48, 8);
  centerGeo.rotateX(-Math.PI / 2);
  const cPos = centerGeo.attributes.position;
  for (let i = 0; i < cPos.count; i++) {
    const vx = cPos.getX(i);
    const vz = cPos.getZ(i);
    const r = Math.hypot(vx, vz);
    const ang = Math.atan2(vz, vx);
    const lobe = 1.0 + 0.14 * Math.sin(ang * 3 + 0.7) + 0.08 * Math.cos(ang * 5 - 1.2);
    const nx = vx * lobe * 1.12;
    const nz = (vz * lobe * 0.95) - 1.8;
    const lift = r < 6.4 ? 0.014 : 0.002;
    cPos.setXYZ(i, nx, lift, nz);
  }
  paintGeometryGradientY(centerGeo, 0x7a684b, 0x998464, 0.08);
  parts.push(centerGeo);

  const pathGeo = new THREE.PlaneGeometry(3.7, 42.0, 16, 72);
  pathGeo.rotateX(-Math.PI / 2);
  const pPos = pathGeo.attributes.position;
  for (let i = 0; i < pPos.count; i++) {
    const vx = pPos.getX(i);
    const vz = pPos.getZ(i) + 19.5;
    const curveX = Math.sin(vz * 0.11) * 0.85;
    const widthMod = 1.0 + 0.18 * Math.sin(vz * 0.37) + 0.1 * Math.cos(vz * 0.73);
    const edgeDist = Math.abs(vx) / 1.85;
    const y = (1.0 - edgeDist * edgeDist) * 0.013;
    pPos.setXYZ(i, vx * widthMod + curveX, Math.max(0.002, y), vz);
  }
  paintGeometryGradientY(pathGeo, 0x786649, 0x978362, 0.08);
  parts.push(pathGeo);

  const merged = mergeStaticGeometries(parts);
  parts.forEach((p) => p.dispose());
  merged.computeVertexNormals();
  return merged;
}

export function buildTapered3VertexGrassBladeGeometry() {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array([
    -0.026, 0.0, 0.0,
     0.026, 0.0, 0.0,
     0.0,   0.35, 0.03,
  ]);
  const normals = new Float32Array([
    0.0, 0.35, 0.93,
    0.0, 0.35, 0.93,
    0.0, 0.45, 0.89,
  ]);
  const colors = new Float32Array([
    0.42, 0.58, 0.28,
    0.42, 0.58, 0.28,
    1.00, 1.00, 0.86,
  ]);
  const uvs = new Float32Array([
    0.0, 0.0,
    1.0, 0.0,
    0.5, 1.0,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geo;
}

export function buildFlowerClusterGeometry(petalHex, centerHex) {
  const parts = [];
  const stemOffsets = [
    { x: -0.09, z: -0.06, h: 0.34, tiltX: -0.14, tiltZ: 0.12 },
    { x:  0.10, z: -0.04, h: 0.39, tiltX:  0.11, tiltZ: -0.15 },
    { x:  0.01, z:  0.09, h: 0.31, tiltX:  0.16, tiltZ: 0.06 },
  ];

  for (let s = 0; s < stemOffsets.length; s++) {
    const st = stemOffsets[s];
    const stemGeo = new THREE.CylinderGeometry(0.012, 0.018, st.h, 5, 1);
    stemGeo.translate(0, st.h * 0.5, 0);
    paintGeometryGradientY(stemGeo, 0x356428, 0x5c9c38, 0.02);

    const headParts = [stemGeo];

    const coreGeo = new THREE.DodecahedronGeometry(0.036, 0);
    coreGeo.scale(1, 0.6, 1);
    coreGeo.translate(0, st.h, 0);
    paintGeometryGradientY(coreGeo, centerHex, centerHex, 0.02);
    headParts.push(coreGeo);

    const petalCount = 6;
    for (let p = 0; p < petalCount; p++) {
      const ang = (p / petalCount) * Math.PI * 2;
      const petalGeo = new THREE.ConeGeometry(0.028, 0.068, 4, 1);
      petalGeo.rotateX(Math.PI * 0.45);
      petalGeo.rotateY(ang);
      petalGeo.translate(Math.cos(ang) * 0.042, st.h - 0.004, Math.sin(ang) * 0.042);
      paintGeometryGradientY(petalGeo, petalHex, petalHex, 0.03);
      headParts.push(petalGeo);
    }

    const blossom = mergeStaticGeometries(headParts);
    headParts.forEach((h) => h.dispose());
    blossom.rotateX(st.tiltX);
    blossom.rotateZ(st.tiltZ);
    blossom.translate(st.x, 0, st.z);
    parts.push(blossom);
  }

  const merged = mergeStaticGeometries(parts);
  parts.forEach((p) => p.dispose());
  merged.computeVertexNormals();
  return merged;
}

export function buildPineTreeGeometry() {
  const parts = [];

  const trunk = new THREE.CylinderGeometry(0.16, 0.42, 3.2, 8, 2);
  trunk.translate(0, 1.5, 0);
  paintGeometryGradientY(trunk, 0x3d2a1b, 0x5c4028, 0.05);
  parts.push(trunk);

  const tiers = [
    { r: 2.35, h: 2.55, y: 2.75, segs: 11 },
    { r: 1.98, h: 2.35, y: 4.15, segs: 11 },
    { r: 1.62, h: 2.15, y: 5.45, segs: 10 },
    { r: 1.24, h: 1.90, y: 6.65, segs: 10 },
    { r: 0.84, h: 1.65, y: 7.75, segs: 9 },
  ];

  for (let t = 0; t < tiers.length; t++) {
    const tier = tiers[t];
    const cone = new THREE.ConeGeometry(tier.r, tier.h, tier.segs, 2);
    const pos = cone.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const ang = Math.atan2(vz, vx);
      if (vy < -tier.h * 0.25) {
        const droop = Math.sin(ang * 5 + t * 1.3) * 0.18;
        const flare = 1.0 + Math.cos(ang * 4 - t) * 0.08;
        pos.setXYZ(i, vx * flare, vy + droop, vz * flare);
      }
    }
    cone.rotateY(t * 0.55);
    cone.translate(0, tier.y, 0);
    paintGeometryGradientY(cone, 0x1e4a28, 0x5ca144, 0.08);
    parts.push(cone);
  }

  const merged = mergeStaticGeometries(parts);
  parts.forEach((p) => p.dispose());
  merged.computeVertexNormals();
  return merged;
}

export function buildBroadleafTrunkWithBranchesGeometry() {
  const parts = [];

  const mainTrunk = new THREE.CylinderGeometry(0.28, 0.56, 3.8, 9, 5);
  const pos = mainTrunk.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i) + 1.9;
    const vz = pos.getZ(i);
    const bendX = Math.sin(vy * 0.85) * 0.18;
    const bendZ = Math.cos(vy * 0.72) * 0.14;
    const rootFlare = vy < 0.65 ? 1.0 + (0.65 - vy) * 0.55 * (1 + 0.25 * Math.sin(Math.atan2(vz, vx) * 5)) : 1.0;
    pos.setXYZ(i, vx * rootFlare + bendX, vy, vz * rootFlare + bendZ);
  }
  paintGeometryGradientY(mainTrunk, 0x3b291a, 0x5e442c, 0.05);
  parts.push(mainTrunk);

  const branches = [
    { x:  0.12, y: 3.1, z:  0.05, rx:  0.52, rz: -0.64, len: 2.1, r1: 0.10, r2: 0.22 },
    { x: -0.10, y: 3.3, z: -0.08, rx: -0.48, rz:  0.68, len: 2.2, r1: 0.10, r2: 0.23 },
    { x:  0.08, y: 3.5, z: -0.10, rx: -0.62, rz: -0.35, len: 1.9, r1: 0.09, r2: 0.19 },
    { x: -0.06, y: 3.6, z:  0.12, rx:  0.58, rz:  0.42, len: 2.0, r1: 0.09, r2: 0.20 },
    { x:  0.02, y: 3.8, z:  0.02, rx:  0.18, rz: -0.22, len: 1.7, r1: 0.11, r2: 0.18 },
  ];

  for (let b = 0; b < branches.length; b++) {
    const br = branches[b];
    const bGeo = new THREE.CylinderGeometry(br.r1, br.r2, br.len, 7, 3);
    bGeo.translate(0, br.len * 0.5, 0);
    bGeo.rotateX(br.rx);
    bGeo.rotateZ(br.rz);
    bGeo.translate(br.x, br.y, br.z);
    paintGeometryGradientY(bGeo, 0x453120, 0x664a31, 0.04);
    parts.push(bGeo);
  }

  const merged = mergeStaticGeometries(parts);
  parts.forEach((p) => p.dispose());
  merged.computeVertexNormals();
  return merged;
}

export function buildBroadleafCanopyGeometry() {
  const blobs = [
    { x:  0.00, y: 5.85, z:  0.00, rx: 1.95, ry: 1.55, rz: 1.95 },
    { x: -1.45, y: 4.85, z:  0.55, rx: 1.55, ry: 1.25, rz: 1.48 },
    { x:  1.50, y: 4.95, z: -0.45, rx: 1.58, ry: 1.28, rz: 1.50 },
    { x:  0.45, y: 5.05, z:  1.45, rx: 1.50, ry: 1.22, rz: 1.45 },
    { x: -0.55, y: 4.90, z: -1.42, rx: 1.52, ry: 1.25, rz: 1.48 },
    { x: -1.15, y: 5.55, z: -0.95, rx: 1.38, ry: 1.18, rz: 1.35 },
    { x:  1.20, y: 5.60, z:  0.98, rx: 1.42, ry: 1.20, rz: 1.38 },
    { x:  0.85, y: 4.55, z: -1.15, rx: 1.28, ry: 1.05, rz: 1.25 },
    { x: -0.95, y: 4.50, z:  1.18, rx: 1.30, ry: 1.08, rz: 1.28 },
  ];

  const parts = [];
  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i];
    const ico = new THREE.IcosahedronGeometry(1.0, 2);
    const pos = ico.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const vx = pos.getX(v);
      const vy = pos.getY(v);
      const vz = pos.getZ(v);
      const n = 1.0 + (valueNoise2D(vx * 2.3 + i, vz * 2.3 - i) - 0.5) * 0.16;
      pos.setXYZ(v, vx * b.rx * n + b.x, vy * b.ry * n + b.y, vz * b.rz * n + b.z);
    }
    parts.push(ico);
  }

  const merged = mergeStaticGeometries(parts);
  parts.forEach((p) => p.dispose());
  paintGeometryGradientY(merged, 0x265429, 0x99d147, 0.12);
  merged.computeVertexNormals();
  return merged;
}

export function buildBushGeometry() {
  const blobs = [
    { x:  0.00, y: 0.58, z:  0.00, rx: 0.78, ry: 0.62, rz: 0.78 },
    { x: -0.52, y: 0.42, z:  0.24, rx: 0.58, ry: 0.46, rz: 0.56 },
    { x:  0.54, y: 0.44, z: -0.20, rx: 0.60, ry: 0.48, rz: 0.58 },
    { x:  0.18, y: 0.40, z:  0.52, rx: 0.54, ry: 0.44, rz: 0.52 },
    { x: -0.22, y: 0.38, z: -0.50, rx: 0.52, ry: 0.42, rz: 0.52 },
    { x:  0.28, y: 0.68, z:  0.22, rx: 0.50, ry: 0.45, rz: 0.50 },
  ];
  const parts = [];
  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i];
    const ico = new THREE.IcosahedronGeometry(1.0, 1);
    ico.scale(b.rx, b.ry, b.rz);
    ico.translate(b.x, b.y, b.z);
    parts.push(ico);
  }
  const merged = mergeStaticGeometries(parts);
  parts.forEach((p) => p.dispose());
  paintGeometryGradientY(merged, 0x285828, 0x82bf3e, 0.10);
  merged.computeVertexNormals();
  return merged;
}

export function buildFernGeometry() {
  const parts = [];
  const frondCount = 8;
  for (let f = 0; f < frondCount; f++) {
    const ang = (f / frondCount) * Math.PI * 2 + (f % 2) * 0.14;
    const frond = new THREE.PlaneGeometry(0.24, 0.92, 2, 5);
    const pos = frond.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i) + 0.46;
      const t = vy / 0.92;
      const taper = Math.sin(t * Math.PI) * (1.0 - t * 0.35);
      const archY = Math.sin(t * Math.PI * 0.78) * 0.48;
      const outZ = t * 0.78;
      pos.setXYZ(i, vx * taper, archY, outZ);
    }
    frond.rotateY(ang);
    parts.push(frond);
  }
  const merged = mergeStaticGeometries(parts);
  parts.forEach((p) => p.dispose());
  paintGeometryGradientY(merged, 0x2f6329, 0x91ca43, 0.08);
  merged.computeVertexNormals();
  return merged;
}

export function buildMossBoulderGeometry() {
  const rock = new THREE.IcosahedronGeometry(1.0, 2);
  const rPos = rock.attributes.position;
  for (let i = 0; i < rPos.count; i++) {
    const vx = rPos.getX(i);
    const vy = rPos.getY(i);
    const vz = rPos.getZ(i);
    const n = 0.84 + valueNoise2D(vx * 2.1 + 4.2, vz * 2.1 - 3.7) * 0.32;
    const flatBottom = vy < -0.2 ? 0.55 : 0.82;
    rPos.setXYZ(i, vx * n * 1.15, vy * n * flatBottom + 0.36, vz * n * 1.05);
  }
  paintGeometryGradientY(rock, 0x525b54, 0x869188, 0.07);
  rock.computeVertexNormals();

  const moss = new THREE.SphereGeometry(0.96, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.48);
  const mPos = moss.attributes.position;
  for (let i = 0; i < mPos.count; i++) {
    const vx = mPos.getX(i);
    const vy = mPos.getY(i);
    const vz = mPos.getZ(i);
    const n = 0.88 + valueNoise2D(vx * 2.5 - 1.2, vz * 2.5 + 5.1) * 0.26;
    const skirtDrop = vy < 0.25 ? Math.sin(Math.atan2(vz, vx) * 6) * 0.09 : 0;
    mPos.setXYZ(i, vx * n * 1.14, vy * 0.78 + 0.42 + skirtDrop, vz * n * 1.04);
  }
  paintGeometryGradientY(moss, 0x3f752d, 0x7cb83e, 0.08);
  moss.computeVertexNormals();

  return { rock, moss };
}

export function buildAncientBrokenPillarAssembly(seedOffset = 0, rand) {
  const stoneParts = [];
  const mossParts = [];

  const height = 3.2 + rand() * 1.35;
  const baseRadius = 0.54 + rand() * 0.08;
  const topRadius = baseRadius * (0.84 + rand() * 0.08);

  const plinth1 = new THREE.CylinderGeometry(baseRadius * 1.38, baseRadius * 1.46, 0.34, 8, 1);
  plinth1.translate(0, 0.17, 0);
  stoneParts.push(plinth1);

  const plinth2 = new THREE.CylinderGeometry(baseRadius * 1.18, baseRadius * 1.30, 0.28, 8, 1);
  plinth2.translate(0, 0.46, 0);
  stoneParts.push(plinth2);

  const radialSegs = 12;
  const heightSegs = 14;
  const shaft = new THREE.CylinderGeometry(topRadius, baseRadius, height, radialSegs, heightSegs);
  shaft.translate(0, height * 0.5 + 0.52, 0);

  const breakSlopeX = (rand() - 0.5) * 0.55;
  const breakSlopeZ = (rand() - 0.5) * 0.55;
  const crackAngle1 = rand() * Math.PI * 2;
  const crackAngle2 = crackAngle1 + 1.8 + rand() * 1.2;

  const sPos = shaft.attributes.position;
  for (let i = 0; i < sPos.count; i++) {
    let vx = sPos.getX(i);
    let vy = sPos.getY(i);
    let vz = sPos.getZ(i);
    const r = Math.hypot(vx, vz);

    if (r > 0.001) {
      const ang = Math.atan2(vz, vx);
      const flute = Math.cos(ang * radialSegs) * 0.022;
      const chipNoise = valueNoise2D(vx * 3.8 + seedOffset * 7.1, vy * 2.6 - seedOffset * 3.3);
      const chip = chipNoise > 0.72 ? -(chipNoise - 0.72) * 0.34 : 0;

      const dCrack1 = Math.abs(Math.atan2(Math.sin(ang - crackAngle1 - vy * 0.18), Math.cos(ang - crackAngle1 - vy * 0.18)));
      const dCrack2 = Math.abs(Math.atan2(Math.sin(ang - crackAngle2 + vy * 0.14), Math.cos(ang - crackAngle2 + vy * 0.14)));
      let crackIndent = 0;
      if (dCrack1 < 0.22 && vy > 1.1 && vy < height + 0.2) {
        crackIndent -= (1.0 - dCrack1 / 0.22) * 0.085;
      }
      if (dCrack2 < 0.18 && vy > 0.8 && vy < height - 0.4) {
        crackIndent -= (1.0 - dCrack2 / 0.18) * 0.07;
      }

      const scaleR = (r + flute + chip + crackIndent) / r;
      vx *= scaleR;
      vz *= scaleR;
    }

    if (vy > height + 0.15) {
      const jagged = (valueNoise2D(vx * 4.5 + seedOffset, vz * 4.5 - seedOffset) - 0.5) * 0.28;
      vy += vx * breakSlopeX + vz * breakSlopeZ + jagged;
    }

    sPos.setXYZ(i, vx, vy, vz);
  }
  stoneParts.push(shaft);

  const mossCollar = new THREE.CylinderGeometry(baseRadius * 1.06, baseRadius * 1.44, 0.95, 12, 4);
  mossCollar.translate(0, 0.48, 0);
  const mPos = mossCollar.attributes.position;
  for (let i = 0; i < mPos.count; i++) {
    const vx = mPos.getX(i);
    const vy = mPos.getY(i);
    const vz = mPos.getZ(i);
    const ang = Math.atan2(vz, vx);
    const creep = (Math.sin(ang * 2 + seedOffset) * 0.5 + 0.5) * 0.55;
    const ny = vy > 0.45 ? vy + creep * (vy - 0.45) : vy;
    mPos.setXYZ(i, vx * 1.03, ny, vz * 1.03);
  }
  mossParts.push(mossCollar);

  const chunkCount = 3 + Math.floor(rand() * 2);
  for (let c = 0; c < chunkCount; c++) {
    const cAngle = rand() * Math.PI * 2;
    const cDist = baseRadius * 1.45 + 0.35 + rand() * 0.95;
    const cx = Math.cos(cAngle) * cDist;
    const cz = Math.sin(cAngle) * cDist;
    const cSize = 0.24 + rand() * 0.24;

    const chunk = new THREE.DodecahedronGeometry(cSize, 1);
    const cPos = chunk.attributes.position;
    for (let k = 0; k < cPos.count; k++) {
      const kx = cPos.getX(k);
      const ky = cPos.getY(k);
      const kz = cPos.getZ(k);
      const n = 0.78 + valueNoise2D(kx * 3.5 + c, kz * 3.5 - c) * 0.38;
      cPos.setXYZ(k, kx * n * 1.25, ky * n * 0.72, kz * n * 1.1);
    }
    chunk.rotateY(rand() * Math.PI * 2);
    chunk.rotateZ((rand() - 0.5) * 0.4);
    chunk.translate(cx, cSize * 0.36, cz);
    stoneParts.push(chunk);

    if (c % 2 === 0) {
      const chunkMoss = new THREE.SphereGeometry(cSize * 0.88, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.45);
      chunkMoss.scale(1.15, 0.55, 1.02);
      chunkMoss.translate(cx, cSize * 0.42, cz);
      mossParts.push(chunkMoss);
    }
  }

  const mergedStone = mergeStaticGeometries(stoneParts);
  stoneParts.forEach((p) => p.dispose());
  paintGeometryGradientY(mergedStone, 0x525a54, 0x9aa29c, 0.09);
  mergedStone.computeVertexNormals();

  const mergedMoss = mergeStaticGeometries(mossParts);
  mossParts.forEach((p) => p.dispose());
  paintGeometryGradientY(mergedMoss, 0x3a6e29, 0x76b33c, 0.08);
  mergedMoss.computeVertexNormals();

  const combined = mergeStaticGeometries([mergedStone, mergedMoss]);
  mergedStone.dispose();
  mergedMoss.dispose();
  combined.computeVertexNormals();
  return combined;
}

export function buildMountainRingLayerGeometry(innerR, outerR, minH, maxH, segs, colorBot, colorTop, seed) {
  const parts = [];
  const peakCount = segs;
  for (let i = 0; i < peakCount; i++) {
    const a0 = (i / peakCount) * Math.PI * 2;
    const viewDip = 1.0 - 0.25 * Math.exp(-Math.pow(Math.sin(a0 - Math.PI * 0.5), 2) * 4.0);
    const n = valueNoise2D(Math.cos(a0) * 2.4 + seed, Math.sin(a0) * 2.4 - seed);
    const h = (minH + n * (maxH - minH)) * viewDip;
    const r = innerR + (outerR - innerR) * (0.3 + 0.7 * valueNoise2D(i * 0.7, seed));
    const baseW = ((Math.PI * 2 * r) / peakCount) * 1.48;

    const cone = new THREE.ConeGeometry(baseW, h, 7, 3);
    const pos = cone.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const vx = pos.getX(v);
      const vy = pos.getY(v) + h * 0.5;
      const vz = pos.getZ(v);
      const ridgeJitter = (valueNoise2D(vx * 0.18 + i, vz * 0.18 - seed) - 0.5) * 1.8 * (1 - vy / h);
      pos.setXYZ(v, vx + ridgeJitter, vy - 0.5, vz + ridgeJitter);
    }
    cone.rotateY(a0 + i * 0.3);
    cone.translate(Math.cos(a0) * r, 0, Math.sin(a0) * r);
    paintGeometryGradientY(cone, colorBot, colorTop, 0.04);
    parts.push(cone);
  }

  const merged = mergeStaticGeometries(parts);
  parts.forEach((p) => p.dispose());
  merged.computeVertexNormals();
  return merged;
}

export function buildSkyDomeGeometry() {
  const geo = new THREE.SphereGeometry(148, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const pos = geo.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);

  const cHorizon = new THREE.Color(0xe2f6ea);
  const cMidSky = new THREE.Color(0xb7e4d1);
  const cZenith = new THREE.Color(0x82c4b9);
  const cMix = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const y = Math.max(0, pos.getY(i));
    const t = Math.min(1, y / 148);
    if (t < 0.38) {
      cMix.copy(cHorizon).lerp(cMidSky, t / 0.38);
    } else {
      cMix.copy(cMidSky).lerp(cZenith, (t - 0.38) / 0.62);
    }
    colors[i * 3] = cMix.r;
    colors[i * 3 + 1] = cMix.g;
    colors[i * 3 + 2] = cMix.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

export function buildTaperedGodRayGeometry() {
  const cone = new THREE.CylinderGeometry(1.15, 3.35, 28.0, 14, 6, true);
  const pos = cone.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const baseCol = new THREE.Color(0xfff9d8);

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const normY = (y + 14.0) / 28.0;
    const fade = Math.sin(normY * Math.PI) * (1.0 - normY * 0.35);
    colors[i * 3] = baseCol.r * fade;
    colors[i * 3 + 1] = baseCol.g * fade;
    colors[i * 3 + 2] = baseCol.b * fade;
  }
  cone.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return cone;
}

export function buildSwirlingLeafGeometry() {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array([
     0.00,  0.00, -0.15,
     0.08,  0.02, -0.02,
     0.00,  0.00,  0.16,

     0.00,  0.00, -0.15,
     0.00,  0.00,  0.16,
    -0.08,  0.02, -0.02,
  ]);
  const colors = new Float32Array([
    0.72, 0.90, 0.28,
    0.88, 0.96, 0.38,
    0.95, 0.98, 0.45,

    0.72, 0.90, 0.28,
    0.95, 0.98, 0.45,
    0.82, 0.94, 0.34,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}