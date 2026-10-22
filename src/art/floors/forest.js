import * as THREE from 'three';

export const BRIGHT_FOREST_LIGHTING = {
  background: 0xccead9,
  fog: { color: 0xd8efe2, near: 26, far: 88, density: 0.0105 },
  exposure: 1.14,
  ambient: { color: 0x6b8f8c, intensity: 0.48 },
  hemi: { sky: 0xdcf7e8, ground: 0x314927, intensity: 0.75 },
  sun: { color: 0xfff3d1, intensity: 1.85, direction: { x: 24, y: 44, z: 16 } },
};

export const FOREST_FLOOR_LIGHTING = BRIGHT_FOREST_LIGHTING;

let _activeDebrisState = null;

const _tempMat4 = new THREE.Matrix4();
const _tempPos = new THREE.Vector3();
const _tempQuat = new THREE.Quaternion();
const _tempScale = new THREE.Vector3();
const _tempEuler = new THREE.Euler();
const _tempColor = new THREE.Color();

export function createSeededRandom(seed = 3005) {
  let s = (seed >>> 0) || 3005;
  return function nextRandom() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2D(ix, iz) {
  let n = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function valueNoise2D(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const a = hash2D(ix, iz);
  const b = hash2D(ix + 1, iz);
  const c = hash2D(ix, iz + 1);
  const d = hash2D(ix + 1, iz + 1);

  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm2D(x, z) {
  let v = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < 4; i++) {
    v += amp * valueNoise2D(x * freq, z * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return v;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function mergeStaticGeometries(geometries) {
  const valid = geometries.filter(Boolean);
  if (valid.length === 0) return new THREE.BufferGeometry();

  const nonIndexed = valid.map((g) => (g.index ? g.toNonIndexed() : g.clone()));
  let totalVerts = 0;
  let hasColor = false;
  let hasUV = false;

  for (let i = 0; i < nonIndexed.length; i++) {
    totalVerts += nonIndexed[i].attributes.position.count;
    if (nonIndexed[i].attributes.color) hasColor = true;
    if (nonIndexed[i].attributes.uv) hasUV = true;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const colors = hasColor ? new Float32Array(totalVerts * 3) : null;
  const uvs = hasUV ? new Float32Array(totalVerts * 2) : null;

  let offset3 = 0;
  let offset2 = 0;

  for (let i = 0; i < nonIndexed.length; i++) {
    const g = nonIndexed[i];
    if (!g.attributes.normal) g.computeVertexNormals();

    const posAttr = g.attributes.position;
    const normAttr = g.attributes.normal;
    const colAttr = g.attributes.color;
    const uvAttr = g.attributes.uv;
    const count = posAttr.count;

    positions.set(posAttr.array, offset3);
    normals.set(normAttr.array, offset3);

    if (colors) {
      if (colAttr) {
        colors.set(colAttr.array, offset3);
      } else {
        for (let k = 0; k < count * 3; k++) colors[offset3 + k] = 1.0;
      }
    }

    if (uvs) {
      if (uvAttr) {
        uvs.set(uvAttr.array, offset2);
      } else {
        for (let k = 0; k < count * 2; k++) uvs[offset2 + k] = 0.0;
      }
    }

    offset3 += count * 3;
    offset2 += count * 2;
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  if (colors) merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (uvs) merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return merged;
}

function paintGeometryGradientY(geom, bottomColorHex, topColorHex, noiseAmount = 0.06) {
  geom.computeBoundingBox();
  const minY = geom.boundingBox.min.y;
  const maxY = Math.max(minY + 0.0001, geom.boundingBox.max.y);
  const pos = geom.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  const cBot = new THREE.Color(bottomColorHex);
  const cTop = new THREE.Color(topColorHex);
  const cMix = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = Math.max(0, Math.min(1, (y - minY) / (maxY - minY)));
    const n = (valueNoise2D(x * 1.7 + 11.3, z * 1.7 - 7.1) - 0.5) * noiseAmount;
    cMix.copy(cBot).lerp(cTop, Math.max(0, Math.min(1, t + n)));
    colors[i * 3] = cMix.r;
    colors[i * 3 + 1] = cMix.g;
    colors[i * 3 + 2] = cMix.b;
  }
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geom;
}

function evaluateTerrainHeight(localX, localZ) {
  const distFromCenter = Math.hypot(localX, localZ);
  const arenaMask = smoothstep(18.5, 27.5, distFromCenter);

  let corridorMask = 1.0;
  if (localZ > -2.0 && localZ < 48.0) {
    const pathCenterOffset = Math.sin(localZ * 0.11) * 0.85;
    const dx = Math.abs(localX - pathCenterOffset);
    corridorMask = smoothstep(5.8, 13.5, dx);
  }

  let gateMask = 1.0;
  if (localZ < -12.0 && localZ > -23.0) {
    const dx = Math.abs(localX);
    gateMask = smoothstep(4.2, 9.5, dx);
  }

  const flatMask = arenaMask * corridorMask * gateMask;
  if (flatMask <= 0.0001) return 0;

  const n1 = fbm2D(localX * 0.045 + 13.7, localZ * 0.045 - 9.2);
  const n2 = valueNoise2D(localX * 0.11 - 4.1, localZ * 0.11 + 8.3);
  const rimLift = smoothstep(22.0, 56.0, distFromCenter) * 1.65;
  const rolling = (n1 - 0.36) * 2.65 + (n2 - 0.5) * 0.65 + rimLift;
  return rolling * flatMask;
}

function buildRollingMeadowTerrainGeometry() {
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

function buildWornDirtOverlayGeometry() {
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

function buildTapered3VertexGrassBladeGeometry() {
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

function buildFlowerClusterGeometry(petalHex, centerHex) {
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

function buildPineTreeGeometry() {
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

function buildBroadleafTrunkWithBranchesGeometry() {
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

function buildBroadleafCanopyGeometry() {
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

function buildBushGeometry() {
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

function buildFernGeometry() {
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

function buildMossBoulderGeometry() {
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

function buildAncientBrokenPillarAssembly(seedOffset = 0, rand) {
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

function buildMountainRingLayerGeometry(innerR, outerR, minH, maxH, segs, colorBot, colorTop, seed) {
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

function buildSkyDomeGeometry() {
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

function buildTaperedGodRayGeometry() {
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

function buildSwirlingLeafGeometry() {
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

export function getForestPalette() {
  return {};
}

export function getForestGeometries() {
  return {};
}

export function updateFloor3Debris(delta) {
  const state = _activeDebrisState;
  if (!state) return;

  const dt = delta > 0 && delta < 0.25 ? delta : 0.016;
  state.time += dt;
  const t = state.time;

  for (let i = 0; i < state.windUniforms.length; i++) {
    state.windUniforms[i].value = t;
  }

  if (state.godRayMesh && state.godRayBaseScales) {
    const count = state.godRayBaseScales.length;
    for (let i = 0; i < count; i++) {
      const d = state.godRayData[i];
      const pulse = 0.86 + 0.22 * Math.sin(t * d.speed + d.phase);
      _tempPos.set(d.x, d.y, d.z);
      _tempEuler.set(d.rx, d.ry, d.rz);
      _tempQuat.setFromEuler(_tempEuler);
      _tempScale.set(d.sx * pulse, d.sy, d.sz * pulse);
      _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
      state.godRayMesh.setMatrixAt(i, _tempMat4);
    }
    state.godRayMesh.instanceMatrix.needsUpdate = true;
    state.godRayMaterial.opacity = 0.072 + 0.022 * Math.sin(t * 0.85);
  }

  if (state.leafMesh) {
    const n = state.leafCount;
    const lx = state.leafX;
    const ly = state.leafY;
    const lz = state.leafZ;
    const lvx = state.leafVX;
    const lvy = state.leafVY;
    const lvz = state.leafVZ;
    const lPhase = state.leafPhase;
    const lScale = state.leafScale;

    const gustX = Math.sin(t * 0.65) * 1.15 + 0.55;
    const gustZ = Math.cos(t * 0.48) * 0.85 + 0.35;

    for (let i = 0; i < n; i++) {
      const ph = lPhase[i];
      const relX = lx[i] - state.centerX;
      const relZ = lz[i] - state.centerZ;

      const swirlX = -relZ * 0.085 + Math.sin(t * 1.9 + ph) * 1.35 + gustX;
      const swirlZ =  relX * 0.085 + Math.cos(t * 1.6 + ph) * 1.35 + gustZ;

      lx[i] += (lvx[i] + swirlX) * dt;
      ly[i] += (lvy[i] + Math.sin(t * 2.8 + ph) * 0.28) * dt;
      lz[i] += (lvz[i] + swirlZ) * dt;

      if (ly[i] < state.centerY + 0.15 || Math.hypot(lx[i] - state.centerX, lz[i] - state.centerZ) > 28.0) {
        const respawnAngle = (ph * 3.7 + t * 0.4) % (Math.PI * 2);
        const respawnRadius = 3.0 + ((i * 0.6180339) % 1) * 18.5;
        lx[i] = state.centerX + Math.cos(respawnAngle) * respawnRadius;
        lz[i] = state.centerZ + Math.sin(respawnAngle) * respawnRadius;
        ly[i] = state.centerY + 6.5 + (i % 7) * 0.85;
      }

      _tempPos.set(lx[i], ly[i], lz[i]);
      _tempEuler.set(
        t * 2.4 + ph,
        t * 1.8 + ph * 1.3,
        Math.sin(t * 3.1 + ph) * 0.95
      );
      _tempQuat.setFromEuler(_tempEuler);
      const sc = lScale[i];
      _tempScale.set(sc, sc, sc);
      _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
      state.leafMesh.setMatrixAt(i, _tempMat4);
    }
    state.leafMesh.instanceMatrix.needsUpdate = true;
  }

  if (state.pollenMesh) {
    const pCount = state.pollenCount;
    const px = state.pollenBaseX;
    const py = state.pollenBaseY;
    const pz = state.pollenBaseZ;
    const pPhase = state.pollenPhase;
    const pScale = state.pollenScale;

    for (let i = 0; i < pCount; i++) {
      const ph = pPhase[i];
      const x = px[i] + Math.sin(t * 0.55 + ph) * 0.85;
      const y = py[i] + Math.sin(t * 0.92 + ph * 1.7) * 0.42;
      const z = pz[i] + Math.cos(t * 0.61 + ph * 1.3) * 0.85;

      _tempPos.set(x, y, z);
      _tempQuat.identity();
      const s = pScale[i] * (0.75 + 0.35 * Math.sin(t * 2.2 + ph));
      _tempScale.set(s, s, s);
      _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
      state.pollenMesh.setMatrixAt(i, _tempMat4);
    }
    state.pollenMesh.instanceMatrix.needsUpdate = true;
  }

  if (state.gatePortalMesh && state.gatePortalMesh.visible) {
    state.gatePortalMesh.rotation.z = t * 1.4;
  }
}

export function buildFloor3Clearing(ctx = {}) {
  const rand = createSeededRandom(ctx.seed ?? 3005);

  const centerX = ctx.center?.x ?? 0;
  const centerY = ctx.center?.y ?? 0;
  const centerZ = ctx.center?.z ?? -34;

  const group = new THREE.Group();
  group.name = 'Floor3_ForestGlade';

  const ownedGeometries = [];
  const ownedMaterials = [];
  const windUniforms = [];

  let drawCalls = 0;
  let triangleCount = 0;

  const trackGeometry = (g) => {
    ownedGeometries.push(g);
    return g;
  };
  const trackMaterial = (m) => {
    ownedMaterials.push(m);
    return m;
  };

  const registerMesh = (mesh, instanceCount = 1) => {
    group.add(mesh);
    drawCalls += 1;
    const geom = mesh.geometry;
    const trisPerInstance = geom.index
      ? geom.index.count / 3
      : geom.attributes.position.count / 3;
    triangleCount += Math.round(trisPerInstance * instanceCount);
  };

  const attachWindSwayShader = (material, swayAmplitude = 0.18, swayFrequency = 2.1) => {
    const uTime = { value: 0 };
    windUniforms.push(uTime);
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTime;
      shader.vertexShader = `uniform float uTime;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vec3 instWorld = vec3(0.0);
        #ifdef USE_INSTANCING
          instWorld = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #endif
        float hFactor = clamp(position.y * 1.65, 0.0, 1.4);
        float wave = sin(uTime * ${swayFrequency.toFixed(2)} + instWorld.x * 0.34 + instWorld.z * 0.29)
                   + 0.45 * cos(uTime * ${(swayFrequency * 1.6).toFixed(2)} - instWorld.z * 0.52 + instWorld.x * 0.21);
        transformed.x += wave * ${swayAmplitude.toFixed(3)} * hFactor * hFactor;
        transformed.z += wave * ${(swayAmplitude * 0.65).toFixed(3)} * hFactor * hFactor;
        `
      );
    };
    return material;
  };

  const skyGeo = trackGeometry(buildSkyDomeGeometry());
  const skyMat = trackMaterial(
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    })
  );
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  skyMesh.position.set(centerX, centerY - 6.0, centerZ);
  skyMesh.renderOrder = -10;

  const fallbackSun = new THREE.DirectionalLight(0xfff3d1, 1.85);
  fallbackSun.position.set(centerX + 24, centerY + 44, centerZ + 16);
  fallbackSun.target.position.set(centerX, centerY, centerZ);
  fallbackSun.visible = false;
  group.add(fallbackSun);
  group.add(fallbackSun.target);

  const fallbackHemi = new THREE.HemisphereLight(0xdcf7e8, 0x314927, 0.75);
  fallbackHemi.visible = false;
  group.add(fallbackHemi);

  const fallbackAmb = new THREE.AmbientLight(0x6b8f8c, 0.48);
  fallbackAmb.visible = false;
  group.add(fallbackAmb);

  let sceneConfigured = false;
  let configuredSceneRef = null;
  let previousFogRef = null;

  const configureSceneAndShadows = (renderer, scene) => {
    if (sceneConfigured || !scene) return;
    sceneConfigured = true;
    configuredSceneRef = scene;
    previousFogRef = scene.fog;

    scene.fog = new THREE.FogExp2(0xd8efe2, 0.0105);
    if (!scene.background) {
      scene.background = new THREE.Color(BRIGHT_FOREST_LIGHTING.background);
    }

    if (renderer && renderer.shadowMap) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    let foundDir = null;
    let foundHemi = null;
    let foundAmb = null;

    for (let i = 0; i < scene.children.length; i++) {
      const child = scene.children[i];
      if (child.isDirectionalLight && !foundDir) foundDir = child;
      else if (child.isHemisphereLight && !foundHemi) foundHemi = child;
      else if (child.isAmbientLight && !foundAmb) foundAmb = child;
    }

    const activeSun = foundDir || fallbackSun;
    if (!foundDir) fallbackSun.visible = true;
    if (!foundHemi) fallbackHemi.visible = true;
    if (!foundAmb) fallbackAmb.visible = true;

    if (foundHemi) {
      foundHemi.color.setHex(BRIGHT_FOREST_LIGHTING.hemi.sky);
      foundHemi.groundColor.setHex(BRIGHT_FOREST_LIGHTING.hemi.ground);
      foundHemi.intensity = BRIGHT_FOREST_LIGHTING.hemi.intensity;
    }
    if (foundAmb) {
      foundAmb.color.setHex(BRIGHT_FOREST_LIGHTING.ambient.color);
      foundAmb.intensity = BRIGHT_FOREST_LIGHTING.ambient.intensity;
    }

    activeSun.color.setHex(BRIGHT_FOREST_LIGHTING.sun.color);
    activeSun.intensity = BRIGHT_FOREST_LIGHTING.sun.intensity;
    activeSun.position.set(centerX + 24, centerY + 44, centerZ + 16);
    if (!activeSun.target.parent) scene.add(activeSun.target);
    activeSun.target.position.set(centerX, centerY, centerZ);

    activeSun.castShadow = true;
    activeSun.shadow.mapSize.set(2048, 2048);
    activeSun.shadow.camera.near = 1;
    activeSun.shadow.camera.far = 60;
    activeSun.shadow.camera.left = -14;
    activeSun.shadow.camera.right = 14;
    activeSun.shadow.camera.top = 14;
    activeSun.shadow.camera.bottom = -14;
    activeSun.shadow.bias = -0.0004;
    activeSun.shadow.normalBias = 0.02;
    activeSun.shadow.camera.updateProjectionMatrix();
  };

  if (ctx.scene) {
    configureSceneAndShadows(ctx.renderer, ctx.scene);
  }
  skyMesh.onBeforeRender = (renderer, scene) => {
    configureSceneAndShadows(renderer, scene);
  };
  registerMesh(skyMesh);

  const terrainGeo = trackGeometry(buildRollingMeadowTerrainGeometry());
  const terrainMat = trackMaterial(
    new THREE.MeshLambertMaterial({
      vertexColors: true,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.position.set(centerX, centerY, centerZ);
  terrainMesh.receiveShadow = true;
  registerMesh(terrainMesh);

  const dirtOverlayGeo = trackGeometry(buildWornDirtOverlayGeometry());
  const dirtOverlayMat = trackMaterial(
    new THREE.MeshLambertMaterial({
      vertexColors: true,
    })
  );
  const dirtOverlayMesh = new THREE.Mesh(dirtOverlayGeo, dirtOverlayMat);
  dirtOverlayMesh.position.set(centerX, centerY, centerZ);
  dirtOverlayMesh.receiveShadow = true;
  registerMesh(dirtOverlayMesh);

  const grassBladeGeo = trackGeometry(buildTapered3VertexGrassBladeGeometry());
  const grassMat = trackMaterial(
    attachWindSwayShader(
      new THREE.MeshLambertMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      }),
      0.19,
      2.15
    )
  );

  const grassCount = 33750;
  const grassInst = new THREE.InstancedMesh(grassBladeGeo, grassMat, grassCount);
  grassInst.receiveShadow = true;

  const grassPalette = [
    new THREE.Color(0x4b8732),
    new THREE.Color(0x63a13b),
    new THREE.Color(0x7ebb42),
    new THREE.Color(0x9bd14a),
    new THREE.Color(0xb2df54),
  ];

  for (let i = 0; i < grassCount; i++) {
    let lx = 0;
    let lz = 0;
    let scaleY = 0.7 + rand() * 0.6;
    let scaleXZ = 0.8 + rand() * 0.4;

    if (i < 7500) {
      const side = i % 2 === 0 ? -1 : 1;
      lz = -1.5 + rand() * 41.0;
      const pathCurve = Math.sin(lz * 0.11) * 0.85;
      const edgeOffset = 1.65 + Math.pow(rand(), 1.6) * 2.8;
      lx = pathCurve + side * edgeOffset;
      scaleY = 0.8 + rand() * 0.5;
    } else if (i < 13000) {
      const ang = rand() * Math.PI * 2;
      const rad = 5.6 + Math.pow(rand(), 1.35) * 4.5;
      lx = Math.cos(ang) * rad * 1.08;
      lz = Math.sin(ang) * rad * 0.96 - 1.6;
      scaleY = 0.7 + rand() * 0.5;
    } else {
      const ang = rand() * Math.PI * 2;
      const rad = Math.sqrt(rand()) * 37.5;
      lx = Math.cos(ang) * rad;
      lz = Math.sin(ang) * rad;

      const dClear = Math.hypot(lx * 0.9, (lz + 1.8) * 1.05);
      const pathCenter = Math.sin(lz * 0.11) * 0.85;
      const onTrail = lz > -2.0 && lz < 40.0 && Math.abs(lx - pathCenter) < 1.35;
      if (dClear < 5.1 || onTrail) {
        const pushAng = Math.atan2(lz, lx);
        const pushRad = 6.2 + rand() * 14.0;
        lx = Math.cos(pushAng) * pushRad;
        lz = Math.sin(pushAng) * pushRad;
      }
    }

    const ly = evaluateTerrainHeight(lx, lz);
    _tempPos.set(centerX + lx, centerY + ly, centerZ + lz);
    _tempEuler.set((rand() - 0.5) * 0.22, rand() * Math.PI * 2, (rand() - 0.5) * 0.22);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.set(scaleXZ, scaleY, scaleXZ);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    grassInst.setMatrixAt(i, _tempMat4);

    const nCol = valueNoise2D(lx * 0.14 + 5.2, lz * 0.14 - 3.8);
    const colIdx = Math.min(grassPalette.length - 1, Math.floor(nCol * grassPalette.length));
    _tempColor.copy(grassPalette[colIdx]);
    _tempColor.offsetHSL((rand() - 0.5) * 0.03, (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.06);
    grassInst.setColorAt(i, _tempColor);
  }
  grassInst.instanceMatrix.needsUpdate = true;
  if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
  registerMesh(grassInst, grassCount);

  const flowerMat = trackMaterial(
    attachWindSwayShader(
      new THREE.MeshLambertMaterial({
        vertexColors: true,
      }),
      0.12,
      2.0
    )
  );

  const whiteFlowerGeo = trackGeometry(buildFlowerClusterGeometry(0xfafdf6, 0xf2c138));
  const yellowFlowerGeo = trackGeometry(buildFlowerClusterGeometry(0xffdd3c, 0xe07b18));

  const whiteFlowerCount = 1750;
  const yellowFlowerCount = 1750;
  const whiteFlowerInst = new THREE.InstancedMesh(whiteFlowerGeo, flowerMat, whiteFlowerCount);
  const yellowFlowerInst = new THREE.InstancedMesh(yellowFlowerGeo, flowerMat, yellowFlowerCount);

  const populateFlowers = (instMesh, count, phaseShift) => {
    for (let i = 0; i < count; i++) {
      let lx = 0;
      let lz = 0;
      if (i < count * 0.22) {
        const side = i % 2 === 0 ? -1 : 1;
        lz = -1.0 + rand() * 38.0;
        const pathCurve = Math.sin(lz * 0.11) * 0.85;
        lx = pathCurve + side * (2.0 + rand() * 3.2);
      } else {
        const ang = rand() * Math.PI * 2 + phaseShift;
        const rad = 6.2 + Math.sqrt(rand()) * 27.5;
        lx = Math.cos(ang) * rad;
        lz = Math.sin(ang) * rad;
        if (lz > -1.0 && lz < 40.0) {
          const pathCurve = Math.sin(lz * 0.11) * 0.85;
          if (Math.abs(lx - pathCurve) < 1.8) {
            lx += (lx >= pathCurve ? 1 : -1) * 2.4;
          }
        }
      }
      const ly = evaluateTerrainHeight(lx, lz);
      const sc = 0.72 + rand() * 0.62;
      _tempPos.set(centerX + lx, centerY + ly, centerZ + lz);
      _tempEuler.set((rand() - 0.5) * 0.12, rand() * Math.PI * 2, (rand() - 0.5) * 0.12);
      _tempQuat.setFromEuler(_tempEuler);
      _tempScale.set(sc, sc, sc);
      _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
      instMesh.setMatrixAt(i, _tempMat4);
    }
    instMesh.instanceMatrix.needsUpdate = true;
  };

  populateFlowers(whiteFlowerInst, whiteFlowerCount, 0.0);
  populateFlowers(yellowFlowerInst, yellowFlowerCount, 1.57);
  registerMesh(whiteFlowerInst, whiteFlowerCount);
  registerMesh(yellowFlowerInst, yellowFlowerCount);

  const pillarSpecs = [
    { dx: -7.5, dz: -6.5, leanX:  0.045, leanZ: -0.055, rotY: 0.4 },
    { dx:  7.5, dz: -6.5, leanX: -0.050, leanZ:  0.040, rotY: 1.9 },
    { dx: -8.2, dz:  5.5, leanX:  0.055, leanZ:  0.035, rotY: 3.1 },
    { dx:  8.2, dz:  5.5, leanX: -0.040, leanZ: -0.060, rotY: 4.5 },
    { dx: -13.6, dz: -1.2, leanX:  0.065, leanZ:  0.045, rotY: 0.8 },
    { dx:  13.6, dz: -1.2, leanX: -0.060, leanZ: -0.050, rotY: 2.3 },
    { dx: -12.2, dz: -10.8, leanX: 0.050, leanZ: -0.065, rotY: 3.7 },
    { dx:  12.2, dz: -10.8, leanX:-0.055, leanZ:  0.055, rotY: 5.1 },
    { dx: -5.8,  dz: -14.8, leanX: 0.070, leanZ:  0.030, rotY: 1.2 },
    { dx:  5.8,  dz: -14.8, leanX:-0.065, leanZ: -0.035, rotY: 2.8 },
    { dx: -11.8, dz:  11.2, leanX: 0.045, leanZ:  0.070, rotY: 4.1 },
    { dx:  11.8, dz:  11.2, leanX:-0.050, leanZ: -0.065, rotY: 5.6 },
  ];

  const pillarMat = trackMaterial(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.86,
      metalness: 0.05,
    })
  );

  const pillars = [];
  const colliders = [];
  const blockers = [];

  for (let i = 0; i < pillarSpecs.length; i++) {
    const spec = pillarSpecs[i];
    const px = centerX + spec.dx;
    const pz = centerZ + spec.dz;
    const py = centerY + evaluateTerrainHeight(spec.dx, spec.dz);

    const pGeo = trackGeometry(buildAncientBrokenPillarAssembly(i + 1, rand));
    const pillarMesh = new THREE.Mesh(pGeo, pillarMat);
    pillarMesh.position.set(px, py, pz);
    pillarMesh.rotation.set(spec.leanX, spec.rotY, spec.leanZ);
    pillarMesh.castShadow = true;
    pillarMesh.receiveShadow = true;

    const radius = 0.66;
    const height = 3.8;
    const blockerEntry = {
      id: i,
      index: i,
      type: 'pillar',
      x: px,
      y: py,
      z: pz,
      radius,
      height,
      minX: px - radius,
      maxX: px + radius,
      minZ: pz - radius,
      maxZ: pz + radius,
      position: new THREE.Vector3(px, py, pz),
      mesh: pillarMesh,
      destroyed: false,
      active: true,
    };

    pillarMesh.userData = {
      id: i,
      index: i,
      destroyed: false,
      collider: true,
      radius,
      height,
      blocker: blockerEntry,
    };

    pillars.push(pillarMesh);
    colliders.push(pillarMesh);
    blockers.push(blockerEntry);
    registerMesh(pillarMesh);
  }

  const gateStoneGeo = trackGeometry(buildAncientBrokenPillarAssembly(99, rand));
  const gateLeft = new THREE.Mesh(gateStoneGeo, pillarMat);
  gateLeft.position.set(centerX - 2.35, centerY, centerZ - 17.5);
  gateLeft.scale.set(0.85, 1.05, 0.85);
  gateLeft.castShadow = true;
  gateLeft.receiveShadow = true;
  registerMesh(gateLeft);

  const gateRight = new THREE.Mesh(gateStoneGeo, pillarMat);
  gateRight.position.set(centerX + 2.35, centerY, centerZ - 17.5);
  gateRight.rotation.y = Math.PI;
  gateRight.scale.set(0.85, 1.05, 0.85);
  gateRight.castShadow = true;
  gateRight.receiveShadow = true;
  registerMesh(gateRight);

  const gatePortalGeo = trackGeometry(new THREE.CircleGeometry(1.85, 24));
  const gatePortalMat = trackMaterial(
    new THREE.MeshBasicMaterial({
      color: 0x9b6bff,
      transparent: true,
      opacity: 0.68,
      side: THREE.DoubleSide,
    })
  );
  const gatePortalMesh = new THREE.Mesh(gatePortalGeo, gatePortalMat);
  gatePortalMesh.position.set(centerX, centerY + 2.0, centerZ - 17.5);
  gatePortalMesh.visible = false;
  registerMesh(gatePortalMesh);

  const pineCount = 145;
  const broadleafCount = 165;
  const totalTrees = pineCount + broadleafCount;

  const pineGeo = trackGeometry(buildPineTreeGeometry());
  const pineMat = trackMaterial(
    new THREE.MeshLambertMaterial({
      vertexColors: true,
    })
  );
  const pineInst = new THREE.InstancedMesh(pineGeo, pineMat, pineCount);
  pineInst.castShadow = true;
  pineInst.receiveShadow = true;

  const broadleafTrunkGeo = trackGeometry(buildBroadleafTrunkWithBranchesGeometry());
  const broadleafTrunkMat = trackMaterial(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.0,
    })
  );
  const broadleafTrunkInst = new THREE.InstancedMesh(
    broadleafTrunkGeo,
    broadleafTrunkMat,
    broadleafCount
  );
  broadleafTrunkInst.castShadow = true;
  broadleafTrunkInst.receiveShadow = true;

  const broadleafCanopyGeo = trackGeometry(buildBroadleafCanopyGeometry());
  const broadleafCanopyMat = trackMaterial(
    new THREE.MeshLambertMaterial({
      vertexColors: true,
    })
  );
  const broadleafCanopyInst = new THREE.InstancedMesh(
    broadleafCanopyGeo,
    broadleafCanopyMat,
    broadleafCount
  );
  broadleafCanopyInst.castShadow = true;
  broadleafCanopyInst.receiveShadow = true;

  const treePositions = [];

  const sampleValidTreeCoord = (idx, total) => {
    for (let attempt = 0; attempt < 16; attempt++) {
      let lx = 0;
      let lz = 0;
      if (idx < 34 && attempt === 0) {
        const side = idx % 2 === 0 ? -1 : 1;
        lz = 15.0 + (idx / 34) * 27.0 + (rand() - 0.5) * 2.2;
        const pathCenter = Math.sin(lz * 0.11) * 0.85;
        lx = pathCenter + side * (6.8 + rand() * 14.5);
      } else {
        const goldenAngle = idx * 2.399963229728653 + attempt * 0.47;
        const ringT = (idx / total + rand() * 0.12) % 1.0;
        const radius = 19.2 + Math.pow(ringT, 0.82) * 29.5;
        lx = Math.cos(goldenAngle) * radius;
        lz = Math.sin(goldenAngle) * radius;
      }

      if (lz > -2.0 && lz < 46.0) {
        const pathCenter = Math.sin(lz * 0.11) * 0.85;
        if (Math.abs(lx - pathCenter) < 6.2) continue;
      }
      if (lz < -14.0 && lz > -24.0 && Math.abs(lx) < 4.5) continue;

      return { lx, lz };
    }
    const fallbackAngle = (idx / total) * Math.PI * 2;
    return {
      lx: Math.cos(fallbackAngle) * 24.0,
      lz: Math.sin(fallbackAngle) * 24.0,
    };
  };

  let pIdx = 0;
  let bIdx = 0;

  for (let i = 0; i < totalTrees; i++) {
    const { lx, lz } = sampleValidTreeCoord(i, totalTrees);
    const ly = evaluateTerrainHeight(lx, lz) - 0.12;
    const rotY = rand() * Math.PI * 2;
    const tiltX = (rand() - 0.5) * 0.07;
    const tiltZ = (rand() - 0.5) * 0.07;
    const scaleXZ = 0.84 + rand() * 0.56;
    const scaleY = 0.86 + rand() * 0.64;

    treePositions.push({ lx, ly, lz, scale: scaleXZ });

    _tempPos.set(centerX + lx, centerY + ly, centerZ + lz);
    _tempEuler.set(tiltX, rotY, tiltZ);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.set(scaleXZ, scaleY, scaleXZ);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);

    const isPine = (i % 2 === 0 && pIdx < pineCount) || bIdx >= broadleafCount;
    if (isPine) {
      pineInst.setMatrixAt(pIdx, _tempMat4);
      _tempColor.setHSL(0.31 + (rand() - 0.5) * 0.04, 0.52, 0.48 + (rand() - 0.5) * 0.08);
      pineInst.setColorAt(pIdx, _tempColor);
      pIdx++;
    } else {
      broadleafTrunkInst.setMatrixAt(bIdx, _tempMat4);
      broadleafCanopyInst.setMatrixAt(bIdx, _tempMat4);
      _tempColor.setHSL(0.27 + (rand() - 0.5) * 0.05, 0.62, 0.52 + (rand() - 0.5) * 0.10);
      broadleafCanopyInst.setColorAt(bIdx, _tempColor);
      bIdx++;
    }
  }

  pineInst.instanceMatrix.needsUpdate = true;
  if (pineInst.instanceColor) pineInst.instanceColor.needsUpdate = true;
  broadleafTrunkInst.instanceMatrix.needsUpdate = true;
  broadleafCanopyInst.instanceMatrix.needsUpdate = true;
  if (broadleafCanopyInst.instanceColor) broadleafCanopyInst.instanceColor.needsUpdate = true;

  registerMesh(pineInst, pineCount);
  registerMesh(broadleafTrunkInst, broadleafCount);
  registerMesh(broadleafCanopyInst, broadleafCount);

  const bushCount = 520;
  const bushGeo = trackGeometry(buildBushGeometry());
  const bushMat = trackMaterial(
    new THREE.MeshLambertMaterial({
      vertexColors: true,
    })
  );
  const bushInst = new THREE.InstancedMesh(bushGeo, bushMat, bushCount);
  bushInst.castShadow = true;
  bushInst.receiveShadow = true;

  for (let i = 0; i < bushCount; i++) {
    const baseTree = treePositions[i % treePositions.length];
    const ang = rand() * Math.PI * 2;
    const dist = 0.9 + rand() * 2.8;
    let lx = baseTree.lx + Math.cos(ang) * dist;
    let lz = baseTree.lz + Math.sin(ang) * dist;
    if (Math.hypot(lx, lz) < 17.8) {
      const push = 18.2 / Math.max(0.1, Math.hypot(lx, lz));
      lx *= push;
      lz *= push;
    }
    const ly = evaluateTerrainHeight(lx, lz) - 0.06;
    const sx = 0.72 + rand() * 0.75;
    const sy = 0.68 + rand() * 0.68;

    _tempPos.set(centerX + lx, centerY + ly, centerZ + lz);
    _tempEuler.set((rand() - 0.5) * 0.1, rand() * Math.PI * 2, (rand() - 0.5) * 0.1);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.set(sx, sy, sx);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    bushInst.setMatrixAt(i, _tempMat4);

    _tempColor.setHSL(0.28 + (rand() - 0.5) * 0.05, 0.58, 0.48 + (rand() - 0.5) * 0.10);
    bushInst.setColorAt(i, _tempColor);
  }
  bushInst.instanceMatrix.needsUpdate = true;
  if (bushInst.instanceColor) bushInst.instanceColor.needsUpdate = true;
  registerMesh(bushInst, bushCount);

  const fernCount = 850;
  const fernGeo = trackGeometry(buildFernGeometry());
  const fernMat = trackMaterial(
    attachWindSwayShader(
      new THREE.MeshLambertMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      }),
      0.09,
      1.85
    )
  );
  const fernInst = new THREE.InstancedMesh(fernGeo, fernMat, fernCount);
  fernInst.receiveShadow = true;

  for (let i = 0; i < fernCount; i++) {
    let lx = 0;
    let lz = 0;
    if (i < 120) {
      const pSpec = pillarSpecs[i % pillarSpecs.length];
      const ang = rand() * Math.PI * 2;
      const dist = 0.85 + rand() * 1.45;
      lx = pSpec.dx + Math.cos(ang) * dist;
      lz = pSpec.dz + Math.sin(ang) * dist;
    } else {
      const baseTree = treePositions[i % treePositions.length];
      const ang = rand() * Math.PI * 2;
      const dist = 0.65 + rand() * 2.6;
      lx = baseTree.lx + Math.cos(ang) * dist;
      lz = baseTree.lz + Math.sin(ang) * dist;
    }
    const ly = evaluateTerrainHeight(lx, lz);
    const sc = 0.68 + rand() * 0.72;
    _tempPos.set(centerX + lx, centerY + ly, centerZ + lz);
    _tempEuler.set((rand() - 0.5) * 0.14, rand() * Math.PI * 2, (rand() - 0.5) * 0.14);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.set(sc, sc, sc);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    fernInst.setMatrixAt(i, _tempMat4);
  }
  fernInst.instanceMatrix.needsUpdate = true;
  registerMesh(fernInst, fernCount);

  const rockCount = 250;
  const { rock: boulderGeo, moss: mossCapGeo } = buildMossBoulderGeometry();
  trackGeometry(boulderGeo);
  trackGeometry(mossCapGeo);

  const boulderMat = trackMaterial(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.04,
    })
  );
  const mossCapMat = trackMaterial(
    new THREE.MeshLambertMaterial({
      vertexColors: true,
    })
  );

  const stoneInst = new THREE.InstancedMesh(boulderGeo, boulderMat, rockCount);
  const mossCapInst = new THREE.InstancedMesh(mossCapGeo, mossCapMat, rockCount);
  stoneInst.castShadow = true;
  stoneInst.receiveShadow = true;
  mossCapInst.receiveShadow = true;

  for (let i = 0; i < rockCount; i++) {
    const baseTree = treePositions[(i * 3) % treePositions.length];
    const ang = rand() * Math.PI * 2;
    const dist = 0.8 + rand() * 2.5;
    let lx = baseTree.lx + Math.cos(ang) * dist;
    let lz = baseTree.lz + Math.sin(ang) * dist;
    if (Math.hypot(lx, lz) < 17.2) {
      const push = 17.6 / Math.max(0.1, Math.hypot(lx, lz));
      lx *= push;
      lz *= push;
    }
    const ly = evaluateTerrainHeight(lx, lz) - 0.08;
    const sx = 0.45 + rand() * 0.78;
    const sy = 0.38 + rand() * 0.65;
    const sz = 0.45 + rand() * 0.78;

    _tempPos.set(centerX + lx, centerY + ly, centerZ + lz);
    _tempEuler.set((rand() - 0.5) * 0.25, rand() * Math.PI * 2, (rand() - 0.5) * 0.25);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.set(sx, sy, sz);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);

    stoneInst.setMatrixAt(i, _tempMat4);
    mossCapInst.setMatrixAt(i, _tempMat4);
  }
  stoneInst.instanceMatrix.needsUpdate = true;
  mossCapInst.instanceMatrix.needsUpdate = true;
  registerMesh(stoneInst, rockCount);
  registerMesh(mossCapInst, rockCount);

  const mountainMat = trackMaterial(
    new THREE.MeshLambertMaterial({
      vertexColors: true,
      fog: true,
    })
  );

  const hillLayer1Geo = trackGeometry(
    buildMountainRingLayerGeometry(54, 66, 9, 17, 44, 0x477856, 0x6ea07c, 11.4)
  );
  const hillLayer1Mesh = new THREE.Mesh(hillLayer1Geo, mountainMat);
  hillLayer1Mesh.position.set(centerX, centerY - 0.5, centerZ);
  registerMesh(hillLayer1Mesh);

  const hillLayer2Geo = trackGeometry(
    buildMountainRingLayerGeometry(72, 88, 18, 33, 48, 0x689984, 0x91bca9, 27.9)
  );
  const hillLayer2Mesh = new THREE.Mesh(hillLayer2Geo, mountainMat);
  hillLayer2Mesh.position.set(centerX, centerY - 1.0, centerZ);
  registerMesh(hillLayer2Mesh);

  const hillLayer3Geo = trackGeometry(
    buildMountainRingLayerGeometry(94, 116, 30, 54, 52, 0x8bb6a4, 0xc3e2d3, 53.2)
  );
  const hillLayer3Mesh = new THREE.Mesh(hillLayer3Geo, mountainMat);
  hillLayer3Mesh.position.set(centerX, centerY - 1.5, centerZ);
  registerMesh(hillLayer3Mesh);

  const godRayCount = 5;
  const godRayGeo = trackGeometry(buildTaperedGodRayGeometry());
  const godRayMat = trackMaterial(
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    })
  );
  const godRayInst = new THREE.InstancedMesh(godRayGeo, godRayMat, godRayCount);

  const godRayData = [
    { x: centerX - 5.5, y: centerY + 12.0, z: centerZ - 4.5, rx: -0.22, ry: 0.2, rz:  0.34, sx: 1.15, sy: 1.05, sz: 1.15, speed: 0.95, phase: 0.0 },
    { x: centerX + 4.8, y: centerY + 12.5, z: centerZ - 6.0, rx: -0.22, ry: 0.8, rz:  0.34, sx: 1.30, sy: 1.10, sz: 1.30, speed: 0.80, phase: 1.3 },
    { x: centerX - 1.2, y: centerY + 13.0, z: centerZ - 1.2, rx: -0.22, ry: 1.5, rz:  0.34, sx: 1.45, sy: 1.15, sz: 1.45, speed: 1.10, phase: 2.6 },
    { x: centerX + 7.2, y: centerY + 11.8, z: centerZ + 3.5, rx: -0.22, ry: 2.1, rz:  0.34, sx: 1.05, sy: 1.00, sz: 1.05, speed: 0.88, phase: 3.9 },
    { x: centerX - 6.8, y: centerY + 11.8, z: centerZ + 4.2, rx: -0.22, ry: 2.7, rz:  0.34, sx: 1.10, sy: 1.00, sz: 1.10, speed: 1.02, phase: 5.1 },
  ];
  const godRayBaseScales = new Float32Array(godRayCount);

  for (let i = 0; i < godRayCount; i++) {
    const d = godRayData[i];
    godRayBaseScales[i] = d.sx;
    _tempPos.set(d.x, d.y, d.z);
    _tempEuler.set(d.rx, d.ry, d.rz);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.set(d.sx, d.sy, d.sz);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    godRayInst.setMatrixAt(i, _tempMat4);
  }
  godRayInst.instanceMatrix.needsUpdate = true;
  registerMesh(godRayInst, godRayCount);

  const leafCount = 110;
  const leafGeo = trackGeometry(buildSwirlingLeafGeometry());
  const leafMat = trackMaterial(
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    })
  );
  const leafInst = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
  leafInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const leafX = new Float32Array(leafCount);
  const leafY = new Float32Array(leafCount);
  const leafZ = new Float32Array(leafCount);
  const leafVX = new Float32Array(leafCount);
  const leafVY = new Float32Array(leafCount);
  const leafVZ = new Float32Array(leafCount);
  const leafPhase = new Float32Array(leafCount);
  const leafScale = new Float32Array(leafCount);

  for (let i = 0; i < leafCount; i++) {
    const ang = rand() * Math.PI * 2;
    const rad = Math.sqrt(rand()) * 21.0;
    leafX[i] = centerX + Math.cos(ang) * rad;
    leafY[i] = centerY + 0.5 + rand() * 8.5;
    leafZ[i] = centerZ + Math.sin(ang) * rad;
    leafVX[i] = (rand() - 0.35) * 0.85;
    leafVY[i] = -(0.42 + rand() * 0.55);
    leafVZ[i] = (rand() - 0.35) * 0.85;
    leafPhase[i] = rand() * Math.PI * 2;
    leafScale[i] = 0.75 + rand() * 0.85;

    _tempPos.set(leafX[i], leafY[i], leafZ[i]);
    _tempEuler.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    _tempQuat.setFromEuler(_tempEuler);
    _tempScale.setScalar(leafScale[i]);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    leafInst.setMatrixAt(i, _tempMat4);

    _tempColor.setHSL(0.21 + rand() * 0.08, 0.82, 0.58 + rand() * 0.16);
    leafInst.setColorAt(i, _tempColor);
  }
  leafInst.instanceMatrix.needsUpdate = true;
  if (leafInst.instanceColor) leafInst.instanceColor.needsUpdate = true;
  registerMesh(leafInst, leafCount);

  const pollenCount = 600;
  const pollenGeo = trackGeometry(new THREE.OctahedronGeometry(0.028, 0));
  const pollenMat = trackMaterial(
    new THREE.MeshBasicMaterial({
      color: 0xfffbe0,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const pollenInst = new THREE.InstancedMesh(pollenGeo, pollenMat, pollenCount);
  pollenInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const pollenBaseX = new Float32Array(pollenCount);
  const pollenBaseY = new Float32Array(pollenCount);
  const pollenBaseZ = new Float32Array(pollenCount);
  const pollenPhase = new Float32Array(pollenCount);
  const pollenScale = new Float32Array(pollenCount);

  for (let i = 0; i < pollenCount; i++) {
    const ang = rand() * Math.PI * 2;
    const rad = Math.sqrt(rand()) * 22.0;
    pollenBaseX[i] = centerX + Math.cos(ang) * rad;
    pollenBaseY[i] = centerY + 0.4 + rand() * 5.6;
    pollenBaseZ[i] = centerZ + Math.sin(ang) * rad;
    pollenPhase[i] = rand() * Math.PI * 2;
    pollenScale[i] = 0.65 + rand() * 0.95;

    _tempPos.set(pollenBaseX[i], pollenBaseY[i], pollenBaseZ[i]);
    _tempQuat.identity();
    _tempScale.setScalar(pollenScale[i]);
    _tempMat4.compose(_tempPos, _tempQuat, _tempScale);
    pollenInst.setMatrixAt(i, _tempMat4);
  }
  pollenInst.instanceMatrix.needsUpdate = true;
  registerMesh(pollenInst, pollenCount);

  const debrisState = {
    time: 0,
    centerX,
    centerY,
    centerZ,
    windUniforms,
    godRayMesh: godRayInst,
    godRayMaterial: godRayMat,
    godRayData,
    godRayBaseScales,
    mesh: leafInst,
    leafMesh: leafInst,
    leafCount,
    leafX,
    leafY,
    leafZ,
    leafVX,
    leafVY,
    leafVZ,
    leafPhase,
    leafScale,
    pollenMesh: pollenInst,
    pollenCount,
    pollenBaseX,
    pollenBaseY,
    pollenBaseZ,
    pollenPhase,
    pollenScale,
    gatePortalMesh,
  };
  _activeDebrisState = debrisState;

  const anchors = {
    arena: new THREE.Vector3(centerX, centerY, centerZ),
    center: new THREE.Vector3(centerX, centerY, centerZ),
    playerSpawn: new THREE.Vector3(centerX, centerY, centerZ + 11.0),
    gate: new THREE.Vector3(centerX, centerY, centerZ - 17.5),
    bossSpawn: new THREE.Vector3(centerX, centerY, centerZ - 6.0),
    enemySpawns: [
      new THREE.Vector3(centerX - 4.5, centerY, centerZ - 3.5),
      new THREE.Vector3(centerX + 4.5, centerY, centerZ - 3.5),
      new THREE.Vector3(centerX - 2.5, centerY, centerZ - 7.0),
      new THREE.Vector3(centerX + 2.5, centerY, centerZ - 7.0),
      new THREE.Vector3(centerX, centerY, centerZ - 5.0),
    ],
  };

  function update(delta, time) {
    if (typeof time === 'number' && (!delta || delta <= 0)) {
      const computedDt = time - debrisState.time;
      updateFloor3Debris(computedDt > 0 && computedDt < 0.25 ? computedDt : 0.016);
    } else {
      updateFloor3Debris(delta);
    }
  }

  function setQuality(quality) {
    if (quality === 'low') {
      pollenInst.count = Math.floor(pollenCount * 0.4);
      leafInst.count = Math.floor(leafCount * 0.6);
    } else {
      pollenInst.count = pollenCount;
      leafInst.count = leafCount;
    }
  }

  function setLighting(lightOverride) {
    if (!lightOverride) return;
    if (lightOverride.sun?.intensity !== undefined) {
      fallbackSun.intensity = lightOverride.sun.intensity;
    }
  }

  function setGateState(state) {
    const isOpen =
      state === true ||
      state === 'open' ||
      state === 'active' ||
      (typeof state === 'object' && state !== null && (state.open || state.active));
    gatePortalMesh.visible = Boolean(isOpen);
  }

  function destroyPillar(indexOrId) {
    const target = pillars.find(
      (p, idx) => idx === indexOrId || p.userData?.id === indexOrId
    );
    if (!target || target.userData.destroyed) return false;
    target.userData.destroyed = true;
    target.scale.y = 0.22;
    if (target.userData.blocker) {
      target.userData.blocker.destroyed = true;
      target.userData.blocker.active = false;
      target.userData.blocker.radius = 0;
    }
    return true;
  }

  function getStats() {
    return {
      floor: 3,
      drawCalls,
      triangles: triangleCount,
      instancedLeaves: leafCount,
      instancedGrass: grassCount,
      instancedTrees: totalTrees,
      pillars: pillars.length,
    };
  }

  function dispose() {
    if (_activeDebrisState === debrisState) {
      _activeDebrisState = null;
    }
    if (configuredSceneRef && previousFogRef !== undefined) {
      configuredSceneRef.fog = previousFogRef;
    }
    for (let i = 0; i < ownedGeometries.length; i++) {
      ownedGeometries[i].dispose();
    }
    ownedGeometries.length = 0;

    for (let i = 0; i < ownedMaterials.length; i++) {
      const mat = ownedMaterials[i];
      if (mat.map) mat.map.dispose();
      mat.dispose();
    }
    ownedMaterials.length = 0;

    if (group.parent) {
      group.parent.remove(group);
    }
  }

  return {
    group,
    anchors,
    lights: BRIGHT_FOREST_LIGHTING,
    pillars,
    colliders,
    blockers,
    update,
    setQuality,
    setLighting,
    setGateState,
    destroyPillar,
    getStats,
    dispose,
  };
}

export const buildForestFloor = buildFloor3Clearing;

export const buildForestFloorArt = buildFloor3Clearing;
