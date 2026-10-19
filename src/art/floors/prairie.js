import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const DEFAULT_PALETTE = {
  sky: 0x9fc3c0,
  fog: 0xa9c9c4,
  terrainBase: 0x5a7a44,
  terrainDry: 0x6e884e,
  grassDark: 0x6f9a4a,
  grassLight: 0x86ad55,
  flowerWhite: 0xf4f2ea,
  flowerYellow: 0xf5df6b,
  flowerLilac: 0xb59bc7,
  pathDirt: 0x8f8468,
  pathGravel: 0x766c56,
  rockBase: 0x686c70,
  rockHighlight: 0x878d94,
  rockCrevice: 0x3e4044,
  woodDark: 0x3d3028,
  woodLight: 0x5a4638,
  woodWeathered: 0x646059,
  stoneRuin: 0x7c7e82,
  furBedroll: 0x544738,
  boneIvory: 0xd8d0bc,
};

const OUTLINE_COLOR = 0x14101c;
const MOSS_COLOR = 0x5d8243;
const ASH_COLOR = 0x2c2826;
const EMBER_ORANGE = 0xff7b29;
const EMBER_GOLD = 0xffd269;

const DEFAULT_LAYOUT = {
  floorNumber: 2,
  seed: 15851,
  bounds: { minX: -48, maxX: 48, minZ: -132, maxZ: 7 },
  pathPolyline: [
    { x: 0, z: 6 },
    { x: 0, z: -20 },
    { x: 2, z: -55 },
    { x: -1, z: -94 },
    { x: 0, z: -125 },
  ],
  pathWidth: 5.8,
  clearings: [
    { id: 'clearing_0', center: { x: 0, z: 0 }, radius: 14, spawnPoints: [], triggerRadius: 16 },
    {
      id: 'clearing_1',
      center: { x: 0, z: -35 },
      radius: 16,
      spawnPoints: [
        { x: -3, z: -32 },
        { x: 3, z: -32 },
        { x: -7, z: -36 },
        { x: 0, z: -37 },
        { x: 7, z: -36 },
      ],
      triggerRadius: 18,
    },
    {
      id: 'clearing_2',
      center: { x: 2, z: -75 },
      radius: 17,
      spawnPoints: [
        { x: -4, z: -72 },
        { x: 0, z: -70 },
        { x: 5, z: -72 },
        { x: -7, z: -76 },
        { x: 6, z: -77 },
        { x: 0, z: -80 },
        { x: 2, z: -83 },
      ],
      triggerRadius: 19,
    },
    {
      id: 'clearing_3',
      center: { x: -1, z: -112 },
      radius: 16,
      spawnPoints: [
        { x: -5, z: -110 },
        { x: 0, z: -108 },
        { x: 5, z: -110 },
        { x: -7, z: -114 },
        { x: 7, z: -114 },
        { x: -2, z: -116 },
        { x: 3, z: -116 },
        { x: 0, z: -119 },
      ],
      triggerRadius: 18,
    },
  ],
  chokePoints: [
    { position: { x: 0, z: -20 }, direction: { x: 0, z: -1 }, width: 4.2 },
    { position: { x: 1, z: -55 }, direction: { x: 0, z: -1 }, width: 4.2 },
    { position: { x: -1, z: -94 }, direction: { x: 0, z: -1 }, width: 4.2 },
  ],
  ambushSpots: [
    { x: -9, z: -18 },
    { x: 9, z: -18 },
    { x: -12, z: -28 },
    { x: 11, z: -28 },
    { x: -13, z: -50 },
    { x: 13, z: -50 },
    { x: -12, z: -70 },
    { x: 14, z: -72 },
    { x: -11, z: -90 },
    { x: 11, z: -90 },
    { x: -9, z: -106 },
    { x: 10, z: -106 },
  ],
  startPosition: { x: 0, z: 4 },
  exitPosition: { x: 0, z: -125 },
  exitGate: { position: { x: 0, z: -125 }, rotationY: 0, width: 4 },
  entranceBarrier: { position: { x: 0, z: 6.5 }, rotationY: 0, width: 14 },
  bossArena: null,
  campSpots: [
    { x: 18, z: -75, radius: 7.5, type: 'ruin' },
    { x: -14, z: -114, radius: 5.5, type: 'camp' },
  ],
  obstacles: [
    { x: -2.8, z: -20, radius: 1.1 },
    { x: 2.8, z: -20, radius: 1.1 },
    { x: -2, z: -55, radius: 1.2 },
    { x: 3.8, z: -55, radius: 1.2 },
    { x: -3.6, z: -94, radius: 1.1 },
    { x: 2.2, z: -94, radius: 1.1 },
    { x: -16, z: -6, radius: 1.4 },
    { x: 15, z: -4, radius: 1.3 },
    { x: -19, z: -34, radius: 1.6 },
    { x: 18, z: -36, radius: 1.5 },
    { x: -22, z: -76, radius: 1.8 },
    { x: 18, z: -75, radius: 3.2 },
    { x: -18, z: -114, radius: 1.5 },
    { x: 16, z: -116, radius: 1.6 },
    { x: -8, z: -122, radius: 1.2 },
    { x: 10, z: -124, radius: 1.3 },
  ],
};

const QUALITY_CONFIG = {
  low: {
    terrainSegX: 64,
    terrainSegZ: 84,
    roadLengthSegs: 76,
    clearingRingSegs: 28,
    grassTuftsPerShade: 900,
    grassBladesPerTuft: 4,
    flowerCount: 420,
    distantTrees: 180,
    fieldRocks: 110,
    dustCount: 90,
    rockDetail: 1,
    canopyPuffsPerTree: 8,
  },
  medium: {
    terrainSegX: 88,
    terrainSegZ: 112,
    roadLengthSegs: 96,
    clearingRingSegs: 36,
    grassTuftsPerShade: 1800,
    grassBladesPerTuft: 5,
    flowerCount: 750,
    distantTrees: 260,
    fieldRocks: 170,
    dustCount: 130,
    rockDetail: 1,
    canopyPuffsPerTree: 11,
  },
  high: {
    terrainSegX: 110,
    terrainSegZ: 140,
    roadLengthSegs: 120,
    clearingRingSegs: 44,
    grassTuftsPerShade: 2500,
    grassBladesPerTuft: 6,
    flowerCount: 1100,
    distantTrees: 380,
    fieldRocks: 240,
    dustCount: 180,
    rockDetail: 2,
    canopyPuffsPerTree: 14,
  },
};

function createRng(seed) {
  let state = (seed >>> 0) || 1;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgb(hex) {
  return {
    r: ((hex >> 16) & 255) / 255,
    g: ((hex >> 8) & 255) / 255,
    b: (hex & 255) / 255,
  };
}

function createToonGradientTexture() {
  const data = new Uint8Array([
    68, 68, 68, 255,
    126, 126, 126, 255,
    192, 192, 192, 255,
    255, 255, 255, 255,
  ]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function createGrassCanvasTexture(seed) {
  const rng = createRng(seed ^ 0x41a7f3);
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#dde5d4';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 480; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 10 + rng() * 34;
    const tone = Math.floor(204 + rng() * 36);
    const green = Math.floor(tone + 6);
    const blue = Math.floor(tone - 12);
    ctx.fillStyle = `rgba(${tone},${green},${blue},0.16)`;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        ctx.beginPath();
        ctx.arc(x + dx * size, y + dy * size, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.lineCap = 'round';
  for (let i = 0; i < 4200; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const len = 6 + rng() * 14;
    const tilt = (rng() - 0.35) * 0.65;
    const shade = rng() > 0.45 ? 'rgba(246,252,238,0.28)' : 'rgba(154,172,140,0.26)';
    ctx.strokeStyle = shade;
    ctx.lineWidth = 1 + rng() * 1.4;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const sx = x + dx * size;
        const sy = y + dy * size;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + tilt * len * 0.6, sy - len * 0.5, sx + tilt * len, sy - len);
        ctx.stroke();
      }
    }
  }

  for (let i = 0; i < 1100; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const rad = 0.8 + rng() * 2.1;
    ctx.fillStyle = rng() > 0.5 ? 'rgba(130,140,118,0.22)' : 'rgba(250,252,244,0.22)';
    ctx.fillRect(x, y, rad, rad);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createStoneCanvasTexture(seed) {
  const rng = createRng(seed ^ 0x9b37c1);
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#d9dde0';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 360; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const w = 14 + rng() * 48;
    const h = 8 + rng() * 26;
    const v = Math.floor(188 + rng() * 54);
    ctx.fillStyle = `rgba(${v},${v + 2},${v + 5},0.18)`;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        ctx.fillRect(x + dx * size, y + dy * size, w, h);
      }
    }
  }

  ctx.lineCap = 'round';
  for (let i = 0; i < 320; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const segs = 3 + Math.floor(rng() * 4);
    ctx.strokeStyle = rng() > 0.3 ? 'rgba(88,94,102,0.30)' : 'rgba(248,250,255,0.26)';
    ctx.lineWidth = 0.8 + rng() * 1.6;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        let cx = x + dx * size;
        let cy = y + dy * size;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        for (let s = 0; s < segs; s++) {
          cx += (rng() - 0.48) * 26;
          cy += (rng() - 0.48) * 18;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }
    }
  }

  for (let i = 0; i < 950; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 1 + rng() * 2.5;
    ctx.fillStyle = rng() > 0.5 ? 'rgba(92,98,104,0.22)' : 'rgba(246,248,250,0.24)';
    ctx.fillRect(x, y, r, r);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function normalizeGeometry(geom, hexColor, opts = {}) {
  const g = geom.index ? geom.toNonIndexed() : geom.clone();
  if (!g.attributes.normal) {
    g.computeVertexNormals();
  }
  const pos = g.attributes.position;
  const norm = g.attributes.normal;
  const count = pos.count;

  if (!g.attributes.uv) {
    const uvs = new Float32Array(count * 2);
    const uvScale = opts.uvScale || 0.25;
    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const nx = Math.abs(norm.getX(i));
      const ny = Math.abs(norm.getY(i));
      if (ny > 0.55) {
        uvs[i * 2] = x * uvScale;
        uvs[i * 2 + 1] = z * uvScale;
      } else if (nx > 0.55) {
        uvs[i * 2] = z * uvScale;
        uvs[i * 2 + 1] = y * uvScale;
      } else {
        uvs[i * 2] = x * uvScale;
        uvs[i * 2 + 1] = y * uvScale;
      }
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }

  const base = hexToRgb(hexColor);
  const mossRgb = opts.mossColor ? hexToRgb(opts.mossColor) : null;
  const mossStrength = opts.mossStrength || 0;
  const bottomAO = opts.bottomAO !== undefined ? opts.bottomAO : 0.26;
  const minY = opts.minY !== undefined ? opts.minY : 0;
  const aoHeight = opts.aoHeight || 0.7;
  const variation = opts.variation || 0.05;

  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const ny = norm.getY(i);

    let r = base.r;
    let gCol = base.g;
    let b = base.b;

    const topShade = 0.92 + clamp(ny, -0.6, 1.0) * 0.14;
    r *= topShade;
    gCol *= topShade;
    b *= topShade;

    if (mossRgb && mossStrength > 0 && ny > 0.38) {
      const mFactor = clamp((ny - 0.38) * 1.65 * mossStrength, 0, 0.78);
      r = lerp(r, mossRgb.r, mFactor);
      gCol = lerp(gCol, mossRgb.g, mFactor);
      b = lerp(b, mossRgb.b, mFactor);
    }

    if (bottomAO > 0) {
      const hFactor = clamp((vy - minY) / aoHeight, 0, 1);
      const ao = lerp(1 - bottomAO, 1.0, hFactor);
      r *= ao;
      gCol *= ao;
      b *= ao;
    }

    if (variation > 0) {
      const hash = Math.sin(vx * 12.9898 + vy * 78.233 + vz * 37.719) * 43758.5453;
      const noise = (hash - Math.floor(hash) - 0.5) * variation;
      r = clamp(r + noise, 0, 1);
      gCol = clamp(gCol + noise, 0, 1);
      b = clamp(b + noise, 0, 1);
    }

    colors[i * 3] = clamp(r, 0, 1);
    colors[i * 3 + 1] = clamp(gCol, 0, 1);
    colors[i * 3 + 2] = clamp(b, 0, 1);
  }

  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const allowed = { position: true, normal: true, uv: true, color: true };
  for (const key of Object.keys(g.attributes)) {
    if (!allowed[key]) {
      g.deleteAttribute(key);
    }
  }
  return g;
}

function createInvertedOutlineGeometry(sourceGeom, thickness = 0.038, outlineHex = OUTLINE_COLOR) {
  const g = sourceGeom.index ? sourceGeom.toNonIndexed() : sourceGeom.clone();
  if (!g.attributes.normal) {
    g.computeVertexNormals();
  }
  const pos = g.attributes.position;
  const norm = g.attributes.normal;
  const count = pos.count;

  for (let i = 0; i < count; i++) {
    const nx = norm.getX(i);
    const ny = norm.getY(i);
    const nz = norm.getZ(i);
    pos.setXYZ(
      i,
      pos.getX(i) + nx * thickness,
      Math.max(0.005, pos.getY(i) + ny * thickness),
      pos.getZ(i) + nz * thickness
    );
    norm.setXYZ(i, -nx, -ny, -nz);
  }

  for (let i = 0; i < count; i += 3) {
    const i1 = i + 1;
    const i2 = i + 2;
    const x1 = pos.getX(i1), y1 = pos.getY(i1), z1 = pos.getZ(i1);
    pos.setXYZ(i1, pos.getX(i2), pos.getY(i2), pos.getZ(i2));
    pos.setXYZ(i2, x1, y1, z1);

    const nx1 = norm.getX(i1), ny1 = norm.getY(i1), nz1 = norm.getZ(i1);
    norm.setXYZ(i1, norm.getX(i2), norm.getY(i2), norm.getZ(i2));
    norm.setXYZ(i2, nx1, ny1, nz1);
  }

  return normalizeGeometry(g, outlineHex, { bottomAO: 0, variation: 0 });
}

function getChunkIndex(z) {
  if (z >= -15) return 0;
  if (z >= -52) return 1;
  if (z >= -92) return 2;
  return 3;
}

function distToSegment2D(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-6) {
    const ex = px - ax;
    const ez = pz - az;
    return { dist: Math.hypot(ex, ez), t: 0, cx: ax, cz: az };
  }
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / lenSq, 0, 1);
  const cx = ax + t * dx;
  const cz = az + t * dz;
  return { dist: Math.hypot(px - cx, pz - cz), t, cx, cz };
}

function getPathInfo(x, z, layout) {
  const pts = layout.pathPolyline || DEFAULT_LAYOUT.pathPolyline;
  let minDist = Infinity;
  let closestX = 0;
  let closestZ = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const res = distToSegment2D(x, z, a.x, a.z, b.x, b.z);
    if (res.dist < minDist) {
      minDist = res.dist;
      closestX = res.cx;
      closestZ = res.cz;
    }
  }

  let effectiveWidth = layout.pathWidth || 5.8;
  const chokes = layout.chokePoints || [];
  for (let i = 0; i < chokes.length; i++) {
    const cp = chokes[i];
    const dChoke = Math.hypot(x - cp.position.x, z - cp.position.z);
    if (dChoke < 8.5) {
      const f = smoothstep(0, 8.5, dChoke);
      const w = lerp(cp.width || 4.2, effectiveWidth, f);
      if (w < effectiveWidth) effectiveWidth = w;
    }
  }

  return { dist: minDist, halfWidth: effectiveWidth * 0.5, closestX, closestZ };
}

function getSurfaceMetrics(x, z, layout) {
  const pathInfo = getPathInfo(x, z, layout);
  const clearings = layout.clearings || DEFAULT_LAYOUT.clearings;
  let minClearingNorm = Infinity;
  let clearingEdgeDist = Infinity;
  let nearestClearing = null;

  for (let i = 0; i < clearings.length; i++) {
    const c = clearings[i];
    const d = Math.hypot(x - c.center.x, z - c.center.z);
    const norm = d / c.radius;
    if (norm < minClearingNorm) {
      minClearingNorm = norm;
      clearingEdgeDist = Math.abs(d - c.radius);
      nearestClearing = c;
    }
  }

  const obstacles = layout.obstacles || [];
  let minObstacleClearance = Infinity;
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    const d = Math.hypot(x - o.x, z - o.z) - o.radius;
    if (d < minObstacleClearance) minObstacleClearance = d;
  }

  const camps = layout.campSpots || [];
  let ruinDist = Infinity;
  let goblinCampDist = Infinity;
  for (let i = 0; i < camps.length; i++) {
    const c = camps[i];
    const d = Math.hypot(x - c.x, z - c.z);
    if (c.type === 'ruin') ruinDist = d;
    if (c.type === 'camp') goblinCampDist = d;
  }

  return {
    pathDist: pathInfo.dist,
    pathHalfWidth: pathInfo.halfWidth,
    clearingNorm: minClearingNorm,
    clearingEdgeDist,
    nearestClearing,
    obstacleClearance: minObstacleClearance,
    ruinDist,
    goblinCampDist,
  };
}

function computeTerrainHeight(x, z, bounds) {
  if (x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ) {
    return 0;
  }

  const dx = Math.max(0, bounds.minX - x, x - bounds.maxX);
  const dz = Math.max(0, bounds.minZ - z, z - bounds.maxZ);
  const dOut = Math.hypot(dx, dz);

  const hillRamp = smoothstep(0.0, 26.0, dOut);
  const mtnRamp = smoothstep(22.0, 86.0, dOut);

  const wave1 = Math.sin(x * 0.055 + z * 0.042) * 0.5 + 0.5;
  const wave2 = Math.cos(x * 0.095 - z * 0.068 + 1.2) * 0.5 + 0.5;
  const ridge = Math.abs(Math.sin(x * 0.048 - z * 0.036 + 0.7));

  let passFactor = 1.0;
  if (z > bounds.maxZ || z < bounds.minZ) {
    const corridor = smoothstep(4.0, 26.0, Math.abs(x));
    const farCap = smoothstep(18.0, 58.0, dz);
    passFactor = clamp(corridor + farCap * 0.85, 0.22, 1.0);
  }

  const hills = hillRamp * (3.6 + wave1 * 4.8 + wave2 * 3.2);
  const mountains = mtnRamp * (6.5 + ridge * 11.5 + wave1 * 4.0);
  return (hills + mountains) * passFactor;
}

function createSculptedRockGeometry(radius, height, detail, seed) {
  const rng = createRng(seed);
  const geom = new THREE.IcosahedronGeometry(1.0, detail).toNonIndexed();
  const pos = geom.attributes.position;

  const p1 = rng() * Math.PI * 2;
  const p2 = rng() * Math.PI * 2;
  const p3 = rng() * Math.PI * 2;

  for (let i = 0; i < pos.count; i++) {
    let vx = pos.getX(i);
    let vy = pos.getY(i);
    let vz = pos.getZ(i);

    const n1 = Math.sin(vx * 2.7 + p1) * Math.cos(vz * 2.5 + p2);
    const n2 = Math.sin(vy * 3.4 + p3) * 0.14;
    const scale = 0.88 + n1 * 0.16 + n2;

    vx *= radius * scale;
    vz *= radius * scale;

    if (vy < 0) {
      vy *= height * 0.32;
    } else {
      vy = Math.pow(vy, 0.85) * height * (0.85 + 0.15 * scale);
    }

    const terrace = Math.floor(vy * 2.4) / 2.4;
    vy = lerp(vy, terrace, 0.18);

    pos.setXYZ(i, vx, vy + height * 0.18, vz);
  }

  geom.computeVertexNormals();
  return geom;
}

function createContactDecalGeometry(x, z, radiusX, radiusZ, rotY, hexColor = 0x26321d) {
  const geom = new THREE.CircleGeometry(1.0, 12);
  geom.rotateX(-Math.PI / 2);
  geom.scale(radiusX, 1, radiusZ);
  if (rotY) geom.rotateY(rotY);
  geom.translate(x, 0.012, z);
  return normalizeGeometry(geom, hexColor, { bottomAO: 0, variation: 0.02 });
}

function buildTerrainAndPaths(layout, palette, cfg, terrainChunks) {
  const bounds = layout.bounds || DEFAULT_LAYOUT.bounds;
  const padX = 86;
  const padZ = 76;
  const minX = bounds.minX - padX;
  const maxX = bounds.maxX + padX;
  const minZ = bounds.minZ - padZ;
  const maxZ = bounds.maxZ + padZ;

  const segX = cfg.terrainSegX;
  const segZ = cfg.terrainSegZ;
  const stepX = (maxX - minX) / segX;
  const stepZ = (maxZ - minZ) / segZ;

  const cBase = hexToRgb(palette.terrainBase);
  const cDry = hexToRgb(palette.terrainDry);
  const cDarkGrass = hexToRgb(palette.grassDark);
  const cDirt = hexToRgb(palette.pathDirt);
  const cGravel = hexToRgb(palette.pathGravel);
  const cRock = hexToRgb(palette.rockBase);
  const cSky = hexToRgb(palette.sky);
  const cRuin = hexToRgb(palette.stoneRuin);
  const cAsh = hexToRgb(ASH_COLOR);

  const gridCols = segX + 1;
  const gridRows = segZ + 1;
  const vxArr = new Float32Array(gridCols * gridRows);
  const vyArr = new Float32Array(gridCols * gridRows);
  const vzArr = new Float32Array(gridCols * gridRows);
  const colArr = new Float32Array(gridCols * gridRows * 3);

  for (let iz = 0; iz <= segZ; iz++) {
    const z = minZ + iz * stepZ;
    for (let ix = 0; ix <= segX; ix++) {
      const x = minX + ix * stepX;
      const idx = iz * gridCols + ix;

      const y = computeTerrainHeight(x, z, bounds);
      vxArr[idx] = x;
      vyArr[idx] = y;
      vzArr[idx] = z;

      const m = getSurfaceMetrics(x, z, layout);
      const meadowNoise = Math.sin(x * 0.14 + z * 0.11) * Math.cos(x * 0.08 - z * 0.13) * 0.5 + 0.5;

      let r = lerp(cBase.r, cDry.r, meadowNoise * 0.52);
      let g = lerp(cBase.g, cDry.g, meadowNoise * 0.52);
      let b = lerp(cBase.b, cDry.b, meadowNoise * 0.52);

      if (m.clearingNorm < 1.25) {
        const cBlend = 1.0 - smoothstep(0.55, 1.2, m.clearingNorm);
        r = lerp(r, lerp(cDry.r, cDirt.r, 0.35), cBlend * 0.65);
        g = lerp(g, lerp(cDry.g, cDirt.g, 0.35), cBlend * 0.65);
        b = lerp(b, lerp(cDry.b, cDirt.b, 0.35), cBlend * 0.65);

        const ring = 1.0 - smoothstep(0.0, 1.4, m.clearingEdgeDist);
        r = lerp(r, cDirt.r * 0.9, ring * 0.45);
        g = lerp(g, cDirt.g * 0.9, ring * 0.45);
        b = lerp(b, cDirt.b * 0.9, ring * 0.45);
      }

      if (m.pathDist < m.pathHalfWidth + 1.8) {
        const roadFactor = 1.0 - smoothstep(m.pathHalfWidth - 0.3, m.pathHalfWidth + 1.4, m.pathDist);
        const rut = Math.sin((m.pathDist / m.pathHalfWidth) * Math.PI * 2.0) * 0.5 + 0.5;
        const pr = lerp(cDirt.r, cGravel.r, rut * 0.55);
        const pg = lerp(cDirt.g, cGravel.g, rut * 0.55);
        const pb = lerp(cDirt.b, cGravel.b, rut * 0.55);
        r = lerp(r, pr, roadFactor);
        g = lerp(g, pg, roadFactor);
        b = lerp(b, pb, roadFactor);
      }

      if (m.ruinDist < 8.8) {
        const rf = 1.0 - smoothstep(4.5, 8.8, m.ruinDist);
        r = lerp(r, cRuin.r * 0.88, rf * 0.65);
        g = lerp(g, cRuin.g * 0.92, rf * 0.65);
        b = lerp(b, cRuin.b * 0.88, rf * 0.65);
      }

      if (m.goblinCampDist < 6.8) {
        const gf = 1.0 - smoothstep(2.0, 6.8, m.goblinCampDist);
        const fireCore = 1.0 - smoothstep(0.0, 2.2, m.goblinCampDist);
        const tr = lerp(cDirt.r * 0.72, cAsh.r, fireCore);
        const tg = lerp(cDirt.g * 0.68, cAsh.g, fireCore);
        const tb = lerp(cDirt.b * 0.64, cAsh.b, fireCore);
        r = lerp(r, tr, gf * 0.85);
        g = lerp(g, tg, gf * 0.85);
        b = lerp(b, tb, gf * 0.85);
      }

      if (m.obstacleClearance < 0.9) {
        const ao = smoothstep(-0.4, 0.9, m.obstacleClearance);
        const mul = lerp(0.62, 1.0, ao);
        r *= mul;
        g *= mul;
        b *= mul;
      }

      if (y > 0.05) {
        const hillT = smoothstep(0.2, 8.5, y);
        r = lerp(r, cDarkGrass.r * 0.88, hillT * 0.45);
        g = lerp(g, cDarkGrass.g * 0.88, hillT * 0.45);
        b = lerp(b, cDarkGrass.b * 0.88, hillT * 0.45);

        const rockT = smoothstep(6.5, 16.0, y);
        r = lerp(r, cRock.r * 0.92, rockT * 0.68);
        g = lerp(g, cRock.g * 0.95, rockT * 0.68);
        b = lerp(b, cRock.b * 0.98, rockT * 0.68);

        const hazeT = smoothstep(10.0, 24.0, y);
        r = lerp(r, cSky.r * 0.82, hazeT * 0.62);
        g = lerp(g, cSky.g * 0.86, hazeT * 0.62);
        b = lerp(b, cSky.b * 0.88, hazeT * 0.62);
      }

      colArr[idx * 3] = clamp(r, 0, 1);
      colArr[idx * 3 + 1] = clamp(g, 0, 1);
      colArr[idx * 3 + 2] = clamp(b, 0, 1);
    }
  }

  const chunkPositions = [[], [], [], []];
  const chunkColors = [[], [], [], []];
  const chunkUvs = [[], [], [], []];

  const uvScale = 0.14;
  function pushTri(cIdx, i0, i1, i2) {
    const posList = chunkPositions[cIdx];
    const colList = chunkColors[cIdx];
    const uvList = chunkUvs[cIdx];

    const indices = [i0, i1, i2];
    for (let k = 0; k < 3; k++) {
      const id = indices[k];
      const px = vxArr[id];
      const py = vyArr[id];
      const pz = vzArr[id];
      posList.push(px, py, pz);
      colList.push(colArr[id * 3], colArr[id * 3 + 1], colArr[id * 3 + 2]);
      uvList.push(px * uvScale, pz * uvScale);
    }
  }

  for (let iz = 0; iz < segZ; iz++) {
    const zMid = minZ + (iz + 0.5) * stepZ;
    const cIdx = getChunkIndex(zMid);
    for (let ix = 0; ix < segX; ix++) {
      const i00 = iz * gridCols + ix;
      const i10 = i00 + 1;
      const i01 = (iz + 1) * gridCols + ix;
      const i11 = i01 + 1;
      pushTri(cIdx, i00, i01, i10);
      pushTri(cIdx, i10, i01, i11);
    }
  }

  for (let c = 0; c < 4; c++) {
    if (chunkPositions[c].length > 0) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(chunkPositions[c], 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(chunkColors[c], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(chunkUvs[c], 2));
      g.computeVertexNormals();
      terrainChunks[c].push(g);
    }
  }

  buildRoadRibbonAndClearings(layout, palette, cfg, terrainChunks);
}

function buildRoadRibbonAndClearings(layout, palette, cfg, terrainChunks) {
  const pts = layout.pathPolyline || DEFAULT_LAYOUT.pathPolyline;
  if (pts.length < 2) return;

  const curvePts = pts.map((p) => new THREE.Vector3(p.x, 0, p.z));
  const curve = new THREE.CatmullRomCurve3(curvePts, false, 'catmullrom', 0.18);
  const segsZ = cfg.roadLengthSegs;
  const segsX = 6;

  const cDirt = hexToRgb(palette.pathDirt);
  const cGravel = hexToRgb(palette.pathGravel);
  const cDry = hexToRgb(palette.terrainDry);

  const chokes = layout.chokePoints || [];
  const baseWidth = layout.pathWidth || 5.8;

  const ringCols = segsX + 1;
  const roadVerts = [];
  const roadCols = [];
  const roadUvs = [];

  for (let i = 0; i <= segsZ; i++) {
    const u = i / segsZ;
    const pt = curve.getPoint(u);
    const tan = curve.getTangent(u);
    const nx = -tan.z;
    const nz = tan.x;

    let width = baseWidth;
    for (let k = 0; k < chokes.length; k++) {
      const cp = chokes[k];
      const d = Math.hypot(pt.x - cp.position.x, pt.z - cp.position.z);
      if (d < 9.0) {
        const f = smoothstep(0.0, 9.0, d);
        width = Math.min(width, lerp(cp.width || 4.2, baseWidth, f));
      }
    }

    const halfW = width * 0.5;
    const meander = Math.sin(pt.z * 0.22) * 0.16;

    for (let j = 0; j <= segsX; j++) {
      const v = j / segsX;
      const side = (v - 0.5) * 2.0;
      const absSide = Math.abs(side);

      const wx = pt.x + nx * (side * halfW + meander * (1 - absSide * 0.5));
      const wz = pt.z + nz * (side * halfW);
      const wy = (1.0 - absSide * absSide) * 0.018 + 0.003;

      roadVerts.push(wx, wy, wz);
      roadUvs.push(wx * 0.22, wz * 0.22);

      let r = cDirt.r;
      let g = cDirt.g;
      let b = cDirt.b;

      const track = Math.exp(-Math.pow(absSide - 0.42, 2) / 0.045);
      r = lerp(r, cGravel.r * 0.96, track * 0.72);
      g = lerp(g, cGravel.g * 0.96, track * 0.72);
      b = lerp(b, cGravel.b * 0.96, track * 0.72);

      if (absSide > 0.78) {
        const edgeT = (absSide - 0.78) / 0.22;
        r = lerp(r, cDry.r * 0.85, edgeT);
        g = lerp(g, cDry.g * 0.85, edgeT);
        b = lerp(b, cDry.b * 0.85, edgeT);
      }

      roadCols.push(r, g, b);
    }
  }

  for (let i = 0; i < segsZ; i++) {
    const zMid = roadVerts[(i * ringCols + 3) * 3 + 2];
    const cIdx = getChunkIndex(zMid);
    const posArr = [];
    const colArr = [];
    const uvArr = [];

    for (let j = 0; j < segsX; j++) {
      const a = i * ringCols + j;
      const b = a + 1;
      const c = (i + 1) * ringCols + j;
      const d = c + 1;
      const tris = [a, c, b, b, c, d];
      for (let t = 0; t < 6; t++) {
        const idx = tris[t];
        posArr.push(roadVerts[idx * 3], roadVerts[idx * 3 + 1], roadVerts[idx * 3 + 2]);
        colArr.push(roadCols[idx * 3], roadCols[idx * 3 + 1], roadCols[idx * 3 + 2]);
        uvArr.push(roadUvs[idx * 2], roadUvs[idx * 2 + 1]);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
    g.computeVertexNormals();
    terrainChunks[cIdx].push(g);
  }

  const clearings = layout.clearings || DEFAULT_LAYOUT.clearings;
  for (let c = 0; c < clearings.length; c++) {
    const cl = clearings[c];
    const cIdx = getChunkIndex(cl.center.z);
    const radSegs = cfg.clearingRingSegs;
    const innerR = cl.radius - 1.15;
    const outerR = cl.radius + 0.35;

    const posArr = [];
    const colArr = [];
    const uvArr = [];

    for (let s = 0; s < radSegs; s++) {
      const a0 = (s / radSegs) * Math.PI * 2;
      const a1 = ((s + 1) / radSegs) * Math.PI * 2;
      const wobble0 = Math.sin(a0 * 5 + c) * 0.25;
      const wobble1 = Math.sin(a1 * 5 + c) * 0.25;

      const x0i = cl.center.x + Math.cos(a0) * (innerR + wobble0);
      const z0i = cl.center.z + Math.sin(a0) * (innerR + wobble0);
      const x0o = cl.center.x + Math.cos(a0) * (outerR + wobble0);
      const z0o = cl.center.z + Math.sin(a0) * (outerR + wobble0);

      const x1i = cl.center.x + Math.cos(a1) * (innerR + wobble1);
      const z1i = cl.center.z + Math.sin(a1) * (innerR + wobble1);
      const x1o = cl.center.x + Math.cos(a1) * (outerR + wobble1);
      const z1o = cl.center.z + Math.sin(a1) * (outerR + wobble1);

      const quad = [
        [x0i, 0.011, z0i, cDirt.r * 0.94, cDirt.g * 0.94, cDirt.b * 0.94],
        [x0o, 0.003, z0o, cGravel.r * 0.86, cGravel.g * 0.88, cGravel.b * 0.84],
        [x1i, 0.011, z1i, cDirt.r * 0.94, cDirt.g * 0.94, cDirt.b * 0.94],
        [x1i, 0.011, z1i, cDirt.r * 0.94, cDirt.g * 0.94, cDirt.b * 0.94],
        [x0o, 0.003, z0o, cGravel.r * 0.86, cGravel.g * 0.88, cGravel.b * 0.84],
        [x1o, 0.003, z1o, cGravel.r * 0.86, cGravel.g * 0.88, cGravel.b * 0.84],
      ];

      for (let q = 0; q < 6; q++) {
        const v = quad[q];
        posArr.push(v[0], v[1], v[2]);
        colArr.push(v[3], v[4], v[5]);
        uvArr.push(v[0] * 0.2, v[2] * 0.2);
      }
    }

    const ringGeom = new THREE.BufferGeometry();
    ringGeom.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    ringGeom.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
    ringGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
    ringGeom.computeVertexNormals();
    terrainChunks[cIdx].push(ringGeom);

    const spawns = cl.spawnPoints || [];
    for (let s = 0; s < spawns.length; s++) {
      const sp = spawns[s];
      const patch = new THREE.CircleGeometry(1.15, 10);
      patch.rotateX(-Math.PI / 2);
      patch.translate(sp.x, 0.009, sp.z);
      terrainChunks[cIdx].push(
        normalizeGeometry(patch, palette.pathDirt, { bottomAO: 0, variation: 0.04 })
      );
    }
  }
}

function addBoulderOutcrop(x, z, radius, seed, palette, cfg, stoneChunks, propChunks, isChoke) {
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

function addWindsweptTree(x, z, baseRadius, isBirch, seed, palette, cfg, propChunks, canopyInstances) {
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

function addDryStoneWallSegment(x0, z0, x1, z1, seed, palette, stoneChunks, propChunks) {
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

function addRanchFenceSegment(x0, z0, x1, z1, seed, palette, propChunks, fencePostInstances) {
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

function buildAncientRuins(campSpot, layout, seed, palette, cfg, stoneChunks, propChunks, flagInstances, emberSources, lights, anchors) {
  const rng = createRng(seed ^ 0x7712b9);
  const cx = campSpot.x;
  const cz = campSpot.z;
  const rad = campSpot.radius || 7.5;
  const cIdx = getChunkIndex(cz);

  anchors.ruinCenter = new THREE.Vector3(cx, 0, cz);

  const slabCount = 22;
  for (let i = 0; i < slabCount; i++) {
    const a = (i / slabCount) * Math.PI * 2 + rng() * 0.35;
    const d = 1.6 + rng() * (rad - 2.1);
    const sx = cx + Math.cos(a) * d;
    const sz = cz + Math.sin(a) * d;
    const sw = 0.9 + rng() * 1.3;
    const sd = 0.8 + rng() * 1.2;
    const sh = 0.038;
    const slab = new THREE.BoxGeometry(sw, sh, sd);
    slab.rotateY(rng() * Math.PI);
    slab.translate(sx, sh * 0.5, sz);
    stoneChunks[cIdx].push(
      normalizeGeometry(slab, i % 2 === 0 ? palette.stoneRuin : palette.rockBase, {
        mossColor: MOSS_COLOR,
        mossStrength: 0.75,
        bottomAO: 0.1,
        variation: 0.06,
      })
    );
  }

  const centerPlinth1 = new THREE.CylinderGeometry(2.85, 3.15, 0.42, 8);
  centerPlinth1.translate(cx, 0.21, cz);
  stoneChunks[cIdx].push(
    normalizeGeometry(centerPlinth1, palette.stoneRuin, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.78,
      bottomAO: 0.35,
    })
  );

  const centerPlinth2 = new THREE.CylinderGeometry(1.95, 2.25, 0.48, 8);
  centerPlinth2.translate(cx, 0.66, cz);
  stoneChunks[cIdx].push(
    normalizeGeometry(centerPlinth2, palette.rockHighlight, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.65,
      bottomAO: 0.25,
    })
  );

  const obeliskH = 2.85;
  const obelisk = new THREE.CylinderGeometry(0.55, 0.92, obeliskH, 6);
  obelisk.rotateZ(0.06);
  obelisk.translate(cx, 0.9 + obeliskH * 0.5, cz);
  stoneChunks[cIdx].push(
    normalizeGeometry(obelisk, palette.stoneRuin, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.85,
      bottomAO: 0.35,
      aoHeight: 1.5,
    })
  );
  propChunks[cIdx].push(createInvertedOutlineGeometry(obelisk, 0.036, OUTLINE_COLOR));

  const fallenTop = new THREE.CylinderGeometry(0.32, 0.54, 1.45, 6);
  fallenTop.rotateZ(Math.PI * 0.44);
  fallenTop.rotateY(0.75);
  fallenTop.translate(cx + 1.45, 0.52, cz + 0.95);
  stoneChunks[cIdx].push(
    normalizeGeometry(fallenTop, palette.rockBase, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.88,
      bottomAO: 0.3,
    })
  );

  const pillarAngles = [0.2, 1.05, 1.92, 2.75, 3.85, 4.75, 5.55];
  const pillarHeights = [3.6, 3.6, 2.1, 1.45, 3.1, 1.75, 2.55];
  const ringR = rad - 1.05;

  for (let i = 0; i < pillarAngles.length; i++) {
    const ang = pillarAngles[i];
    const px = cx + Math.cos(ang) * ringR;
    const pz = cz + Math.sin(ang) * ringR;
    const ph = pillarHeights[i];

    const base = new THREE.BoxGeometry(1.12, 0.36, 1.12);
    base.rotateY(ang);
    base.translate(px, 0.18, pz);
    stoneChunks[cIdx].push(
      normalizeGeometry(base, palette.rockBase, {
        mossColor: MOSS_COLOR,
        mossStrength: 0.7,
        bottomAO: 0.35,
      })
    );

    const shaft = new THREE.CylinderGeometry(0.38, 0.44, ph, 8);
    shaft.translate(px, 0.36 + ph * 0.5, pz);
    stoneChunks[cIdx].push(
      normalizeGeometry(shaft, palette.stoneRuin, {
        mossColor: MOSS_COLOR,
        mossStrength: 0.72,
        bottomAO: 0.32,
        aoHeight: 1.2,
      })
    );
    if (ph >= 2.5) {
      propChunks[cIdx].push(createInvertedOutlineGeometry(shaft, 0.032, OUTLINE_COLOR));
    }

    if (ph >= 3.0) {
      const cap = new THREE.BoxGeometry(1.06, 0.32, 1.06);
      cap.rotateY(ang);
      cap.translate(px, 0.36 + ph + 0.16, pz);
      stoneChunks[cIdx].push(
        normalizeGeometry(cap, palette.rockHighlight, {
          mossColor: MOSS_COLOR,
          mossStrength: 0.85,
          bottomAO: 0.15,
        })
      );
    }

    propChunks[cIdx].push(createContactDecalGeometry(px, pz, 0.88, 0.88, ang));

    if (i < pillarAngles.length - 1 && i !== 2 && i !== 5) {
      const nextAng = pillarAngles[i + 1];
      const nx = cx + Math.cos(nextAng) * ringR;
      const nz = cz + Math.sin(nextAng) * ringR;
      addDryStoneWallSegment(px, pz, nx, nz, seed + 300 + i * 19, palette, stoneChunks, propChunks);
    }
  }

  const p0x = cx + Math.cos(pillarAngles[0]) * ringR;
  const p0z = cz + Math.sin(pillarAngles[0]) * ringR;
  const p1x = cx + Math.cos(pillarAngles[1]) * ringR;
  const p1z = cz + Math.sin(pillarAngles[1]) * ringR;
  const lintelLen = Math.hypot(p1x - p0x, p1z - p0z) + 0.85;
  const lintelAng = Math.atan2(p1x - p0x, p1z - p0z);
  const lintel = new THREE.BoxGeometry(0.82, 0.52, lintelLen);
  lintel.rotateY(lintelAng);
  lintel.translate((p0x + p1x) * 0.5, 0.36 + 3.6 + 0.52, (p0z + p1z) * 0.5);
  stoneChunks[cIdx].push(
    normalizeGeometry(lintel, palette.stoneRuin, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.9,
      bottomAO: 0.22,
    })
  );
  propChunks[cIdx].push(createInvertedOutlineGeometry(lintel, 0.032, OUTLINE_COLOR));

  const brazierX = cx - rad + 1.65;
  const brazierZ = cz + 0.6;
  const bPedestal = new THREE.CylinderGeometry(0.45, 0.62, 1.15, 7);
  bPedestal.translate(brazierX, 0.575, brazierZ);
  stoneChunks[cIdx].push(
    normalizeGeometry(bPedestal, palette.rockCrevice, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.45,
      bottomAO: 0.35,
    })
  );
  const bBowl = new THREE.CylinderGeometry(0.68, 0.38, 0.36, 7);
  bBowl.translate(brazierX, 1.28, brazierZ);
  propChunks[cIdx].push(normalizeGeometry(bBowl, palette.woodDark, { bottomAO: 0.2 }));

  const lightPos = new THREE.Vector3(brazierX, 1.65, brazierZ);
  lights.push({ position: lightPos, color: 0xffaa4c, intensity: 1.9, distance: 14 });
  anchors.torches.push(lightPos);
  emberSources.push({ x: brazierX, y: 1.46, z: brazierZ, radius: 0.32, count: 14 });

  flagInstances.push({
    x: p0x - 0.42,
    y: 3.3,
    z: p0z,
    sx: 0.95,
    sy: 1.15,
    sz: 0.95,
    rotY: -0.4,
  });
}

function buildGoblinCampsite(campSpot, layout, seed, palette, cfg, stoneChunks, propChunks, flagInstances, emberSources, lights, anchors) {
  const rng = createRng(seed ^ 0x5581e2);
  const cx = campSpot.x;
  const cz = campSpot.z;
  const rad = campSpot.radius || 5.5;
  const cIdx = getChunkIndex(cz);

  anchors.goblinCamp = new THREE.Vector3(cx, 0, cz);

  const ashDisc = new THREE.CircleGeometry(1.45, 14);
  ashDisc.rotateX(-Math.PI / 2);
  ashDisc.translate(cx, 0.016, cz);
  propChunks[cIdx].push(normalizeGeometry(ashDisc, ASH_COLOR, { bottomAO: 0, variation: 0.05 }));

  const ringStones = 11;
  for (let i = 0; i < ringStones; i++) {
    const a = (i / ringStones) * Math.PI * 2 + rng() * 0.15;
    const rx = cx + Math.cos(a) * 1.05;
    const rz = cz + Math.sin(a) * 1.05;
    const st = createSculptedRockGeometry(0.32 + rng() * 0.1, 0.28 + rng() * 0.12, 1, seed + 500 + i);
    st.rotateY(a);
    st.translate(rx, 0, rz);
    stoneChunks[cIdx].push(
      normalizeGeometry(st, i % 2 === 0 ? palette.rockCrevice : palette.rockBase, {
        bottomAO: 0.4,
      })
    );
  }

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const log = new THREE.CylinderGeometry(0.09, 0.11, 1.35, 6);
    log.rotateZ(Math.PI * 0.38);
    log.rotateY(a);
    log.translate(cx + Math.cos(a) * 0.25, 0.22, cz + Math.sin(a) * 0.25);
    propChunks[cIdx].push(normalizeGeometry(log, palette.woodDark, { bottomAO: 0.35 }));
  }

  const spitY = 1.08;
  const forkL = new THREE.CylinderGeometry(0.05, 0.07, 1.25, 5);
  forkL.rotateZ(0.08);
  forkL.translate(cx - 1.15, 0.6, cz - 0.15);
  const forkR = new THREE.CylinderGeometry(0.05, 0.07, 1.25, 5);
  forkR.rotateZ(-0.08);
  forkR.translate(cx + 1.15, 0.6, cz + 0.15);
  const crossbar = new THREE.CylinderGeometry(0.035, 0.035, 2.55, 5);
  crossbar.rotateZ(Math.PI * 0.5);
  crossbar.rotateY(-0.13);
  crossbar.translate(cx, spitY, cz);
  propChunks[cIdx].push(normalizeGeometry(forkL, palette.woodLight, { bottomAO: 0.25 }));
  propChunks[cIdx].push(normalizeGeometry(forkR, palette.woodLight, { bottomAO: 0.25 }));
  propChunks[cIdx].push(normalizeGeometry(crossbar, palette.woodDark, { bottomAO: 0.1 }));

  const fireLightPos = new THREE.Vector3(cx, 0.85, cz);
  lights.push({ position: fireLightPos, color: 0xff7b29, intensity: 2.5, distance: 18 });
  anchors.torches.push(fireLightPos);
  emberSources.push({ x: cx, y: 0.25, z: cz, radius: 0.58, count: 28 });

  const bedrollSpecs = [
    { dx: 0.4, dz: -2.65, rot: 0.22 },
    { dx: 2.55, dz: -0.85, rot: -1.18 },
    { dx: 1.15, dz: 2.45, rot: 2.75 },
  ];

  for (let i = 0; i < bedrollSpecs.length; i++) {
    const b = bedrollSpecs[i];
    const bx = cx + b.dx;
    const bz = cz + b.dz;

    const matGeom = new THREE.BoxGeometry(1.12, 0.08, 1.92, 2, 1, 3).toNonIndexed();
    const pos = matGeom.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const vx = pos.getX(k);
      const vy = pos.getY(k) + 0.04;
      const vz = pos.getZ(k);
      const wave = Math.sin(vz * 2.5 + vx * 3.0) * 0.015;
      pos.setXYZ(k, vx, Math.max(0.005, vy + wave), vz);
    }
    matGeom.rotateY(b.rot);
    matGeom.translate(bx, 0, bz);
    matGeom.computeVertexNormals();
    propChunks[cIdx].push(
      normalizeGeometry(matGeom, palette.furBedroll, {
        bottomAO: 0.28,
        variation: 0.08,
      })
    );

    const pillow = new THREE.CylinderGeometry(0.16, 0.16, 0.98, 7);
    pillow.rotateZ(Math.PI * 0.5);
    pillow.rotateY(b.rot);
    pillow.translate(
      bx - Math.sin(b.rot) * 0.72,
      0.14,
      bz - Math.cos(b.rot) * 0.72
    );
    propChunks[cIdx].push(
      normalizeGeometry(pillow, palette.woodLight, {
        bottomAO: 0.2,
        variation: 0.06,
      })
    );
  }

  const tentX = cx - 3.35;
  const tentZ = cz - 0.35;
  const tentRot = 1.35;
  const doorH = 2.15;
  const tentW = 2.8;
  const tentD = 2.5;

  const poleFrontL = new THREE.CylinderGeometry(0.06, 0.08, doorH + 0.2, 6);
  poleFrontL.translate(-tentW * 0.45, (doorH + 0.2) * 0.5, tentD * 0.42);
  const poleFrontR = new THREE.CylinderGeometry(0.06, 0.08, doorH + 0.2, 6);
  poleFrontR.translate(tentW * 0.45, (doorH + 0.2) * 0.5, tentD * 0.42);
  const ridgePole = new THREE.CylinderGeometry(0.055, 0.055, tentW * 1.12, 6);
  ridgePole.rotateZ(Math.PI * 0.5);
  ridgePole.translate(0, doorH + 0.08, tentD * 0.42);

  const canopySlopeLen = Math.hypot(tentD, doorH - 0.35);
  const canopySlopeAng = Math.atan2(doorH - 0.35, tentD);
  const canopyHide = new THREE.BoxGeometry(tentW * 1.04, 0.07, canopySlopeLen);
  canopyHide.rotateX(canopySlopeAng);
  canopyHide.translate(0, (doorH + 0.35) * 0.5, -0.05);

  const tentParts = [poleFrontL, poleFrontR, ridgePole, canopyHide];
  for (let t = 0; t < tentParts.length; t++) {
    const g = tentParts[t];
    g.rotateY(tentRot);
    g.translate(tentX, 0, tentZ);
    const col = t === 3 ? palette.furBedroll : palette.woodDark;
    propChunks[cIdx].push(
      normalizeGeometry(g, col, {
        bottomAO: 0.28,
        variation: 0.07,
      })
    );
    if (t === 3) {
      propChunks[cIdx].push(createInvertedOutlineGeometry(g, 0.028, OUTLINE_COLOR));
    }
  }

  const totemX = cx - 2.15;
  const totemZ = cz + 2.85;
  const totemPole = new THREE.CylinderGeometry(0.07, 0.1, 2.65, 6);
  totemPole.rotateZ(-0.08);
  totemPole.translate(totemX, 1.32, totemZ);
  propChunks[cIdx].push(normalizeGeometry(totemPole, palette.woodDark, { bottomAO: 0.3 }));

  const totemSkull = new THREE.IcosahedronGeometry(0.28, 1);
  totemSkull.scale(0.85, 1.1, 1.25);
  totemSkull.translate(totemX + 0.08, 2.68, totemZ);
  propChunks[cIdx].push(normalizeGeometry(totemSkull, palette.boneIvory, { bottomAO: 0.2 }));

  const hornL = new THREE.ConeGeometry(0.07, 0.48, 5);
  hornL.rotateZ(-0.95);
  hornL.translate(totemX - 0.18, 2.82, totemZ + 0.08);
  const hornR = new THREE.ConeGeometry(0.07, 0.48, 5);
  hornR.rotateZ(0.95);
  hornR.translate(totemX + 0.34, 2.82, totemZ - 0.08);
  propChunks[cIdx].push(normalizeGeometry(hornL, palette.boneIvory, { bottomAO: 0.15 }));
  propChunks[cIdx].push(normalizeGeometry(hornR, palette.boneIvory, { bottomAO: 0.15 }));

  flagInstances.push({
    x: totemX + 0.05,
    y: 2.1,
    z: totemZ,
    sx: 0.9,
    sy: 1.05,
    sz: 0.9,
    rotY: 0.65,
  });

  const boneCount = 14;
  for (let i = 0; i < boneCount; i++) {
    const a = (i / boneCount) * Math.PI * 2 + rng() * 0.45;
    const d = 1.65 + rng() * (rad - 2.1);
    const bx = cx + Math.cos(a) * d;
    const bz = cz + Math.sin(a) * d;

    if (i % 4 === 0) {
      const skull = new THREE.IcosahedronGeometry(0.22, 1);
      skull.scale(0.9, 0.82, 1.25);
      skull.rotateY(rng() * Math.PI * 2);
      skull.translate(bx, 0.14, bz);
      propChunks[cIdx].push(
        normalizeGeometry(skull, palette.boneIvory, {
          bottomAO: 0.35,
          aoHeight: 0.25,
          variation: 0.05,
        })
      );
    } else {
      const len = 0.42 + rng() * 0.45;
      const shaft = new THREE.CylinderGeometry(0.04, 0.045, len, 5);
      shaft.rotateZ(Math.PI * 0.48);
      shaft.rotateY(rng() * Math.PI * 2);
      shaft.translate(bx, 0.045, bz);
      propChunks[cIdx].push(
        normalizeGeometry(shaft, palette.boneIvory, {
          bottomAO: 0.3,
          aoHeight: 0.12,
          variation: 0.05,
        })
      );
    }
  }
}

function buildGates(layout, palette, stoneChunks, propChunks, flagInstances, emberSources, lights, anchors) {
  const ent = layout.entranceBarrier || DEFAULT_LAYOUT.entranceBarrier;
  const ex = layout.exitGate || DEFAULT_LAYOUT.exitGate;
  const pathW = layout.pathWidth || 5.8;

  anchors.entranceGate = new THREE.Vector3(ent.position.x, 0, ent.position.z);
  anchors.exitGate = new THREE.Vector3(ex.position.x, 0, ex.position.z);

  const entChunk = getChunkIndex(ent.position.z);
  const entHalfRoad = pathW * 0.5 + 0.25;
  const entTotalHalf = (ent.width || 14) * 0.5;
  const postH = 2.75;

  const entPostsX = [-entHalfRoad, entHalfRoad, -entTotalHalf, entTotalHalf];
  for (let i = 0; i < entPostsX.length; i++) {
    const px = ent.position.x + entPostsX[i];
    const pz = ent.position.z;
    const isMain = i < 2;
    const ph = isMain ? postH : 1.65;
    const pr = isMain ? 0.24 : 0.16;

    const plinth = new THREE.CylinderGeometry(pr * 1.55, pr * 1.85, 0.38, 7);
    plinth.translate(px, 0.19, pz);
    stoneChunks[entChunk].push(
      normalizeGeometry(plinth, palette.rockBase, {
        mossColor: MOSS_COLOR,
        mossStrength: 0.55,
        bottomAO: 0.35,
      })
    );

    const post = new THREE.BoxGeometry(pr * 2, ph, pr * 2);
    post.translate(px, ph * 0.5 + 0.2, pz);
    propChunks[entChunk].push(
      normalizeGeometry(post, isMain ? palette.woodDark : palette.woodWeathered, {
        mossColor: MOSS_COLOR,
        mossStrength: 0.3,
        bottomAO: 0.3,
        aoHeight: 1.0,
      })
    );
    if (isMain) {
      propChunks[entChunk].push(createInvertedOutlineGeometry(post, 0.03, OUTLINE_COLOR));
    }
  }

  const lintelW = entHalfRoad * 2 + 1.35;
  const entLintel = new THREE.BoxGeometry(lintelW, 0.34, 0.42);
  entLintel.translate(ent.position.x, postH + 0.22, ent.position.z);
  propChunks[entChunk].push(
    normalizeGeometry(entLintel, palette.woodLight, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.65,
      bottomAO: 0.18,
    })
  );
  propChunks[entChunk].push(createInvertedOutlineGeometry(entLintel, 0.03, OUTLINE_COLOR));

  const entSubBeam = new THREE.BoxGeometry(lintelW - 0.5, 0.2, 0.28);
  entSubBeam.translate(ent.position.x, postH - 0.18, ent.position.z);
  propChunks[entChunk].push(normalizeGeometry(entSubBeam, palette.woodDark, { bottomAO: 0.15 }));

  for (let side of [-1, 1]) {
    const xInner = ent.position.x + side * entHalfRoad;
    const xOuter = ent.position.x + side * entTotalHalf;
    const wingLen = Math.abs(xOuter - xInner);
    const wingMidX = (xInner + xOuter) * 0.5;

    for (let rh of [0.52, 1.02, 1.44]) {
      const rail = new THREE.BoxGeometry(wingLen, 0.12, 0.1);
      rail.translate(wingMidX, rh, ent.position.z);
      propChunks[entChunk].push(
        normalizeGeometry(rail, palette.woodWeathered, {
          mossColor: MOSS_COLOR,
          mossStrength: 0.35,
          bottomAO: 0.12,
        })
      );
    }

    const torchX = xInner + side * 0.05;
    const torchZ = ent.position.z - 0.34;
    const sconce = new THREE.CylinderGeometry(0.12, 0.06, 0.38, 6);
    sconce.rotateX(-0.25);
    sconce.translate(torchX, 2.05, torchZ);
    propChunks[entChunk].push(normalizeGeometry(sconce, palette.woodDark, { bottomAO: 0.2 }));

    const tPos = new THREE.Vector3(torchX, 2.28, torchZ - 0.05);
    lights.push({ position: tPos, color: 0xffa84a, intensity: 1.75, distance: 13 });
    anchors.torches.push(tPos);
    emberSources.push({ x: tPos.x, y: tPos.y, z: tPos.z, radius: 0.14, count: 8 });

    flagInstances.push({
      x: xInner - side * 0.18,
      y: postH - 0.2,
      z: ent.position.z - 0.22,
      sx: 0.85,
      sy: 1.05,
      sz: 0.85,
      rotY: side * 0.2,
    });
  }

  const exChunk = getChunkIndex(ex.position.z);
  const exHalfW = (ex.width || 4.0) * 0.5;
  const exPostH = 2.85;

  for (let side of [-1, 1]) {
    const px = ex.position.x + side * (exHalfW + 0.26);
    const pz = ex.position.z;

    const plinth = new THREE.BoxGeometry(0.96, 0.55, 0.96);
    plinth.translate(px, 0.275, pz);
    stoneChunks[exChunk].push(
      normalizeGeometry(plinth, palette.stoneRuin, {
        mossColor: MOSS_COLOR,
        mossStrength: 0.65,
        bottomAO: 0.38,
      })
    );

    const post = new THREE.BoxGeometry(0.46, exPostH, 0.46);
    post.translate(px, exPostH * 0.5 + 0.4, pz);
    propChunks[exChunk].push(
      normalizeGeometry(post, palette.woodDark, {
        mossColor: MOSS_COLOR,
        mossStrength: 0.4,
        bottomAO: 0.3,
        aoHeight: 1.2,
      })
    );
    propChunks[exChunk].push(createInvertedOutlineGeometry(post, 0.032, OUTLINE_COLOR));

    const buttress = new THREE.BoxGeometry(0.95, 1.15, 0.55);
    buttress.translate(px + side * 0.55, 0.575, pz);
    stoneChunks[exChunk].push(
      normalizeGeometry(buttress, palette.rockBase, {
        mossColor: MOSS_COLOR,
        mossStrength: 0.75,
        bottomAO: 0.35,
      })
    );

    const torchX = px - side * 0.12;
    const torchZ = pz + 0.35;
    const sconce = new THREE.CylinderGeometry(0.13, 0.06, 0.4, 6);
    sconce.rotateX(0.25);
    sconce.translate(torchX, 2.15, torchZ);
    propChunks[exChunk].push(normalizeGeometry(sconce, palette.woodDark, { bottomAO: 0.2 }));

    const tPos = new THREE.Vector3(torchX, 2.38, torchZ + 0.06);
    if (side === -1) {
      lights.push({ position: new THREE.Vector3(ex.position.x, 2.38, pz + 0.4), color: 0xffa84a, intensity: 2.0, distance: 15 });
    }
    anchors.torches.push(tPos);
    emberSources.push({ x: tPos.x, y: tPos.y, z: tPos.z, radius: 0.14, count: 8 });

    flagInstances.push({
      x: px + side * 0.25,
      y: exPostH + 0.1,
      z: pz + 0.22,
      sx: 0.95,
      sy: 1.2,
      sz: 0.95,
      rotY: -side * 0.25,
    });
  }

  const exLintelW = exHalfW * 2 + 1.85;
  const exLintel = new THREE.BoxGeometry(exLintelW, 0.42, 0.56);
  exLintel.translate(ex.position.x, exPostH + 0.48, ex.position.z);
  propChunks[exChunk].push(
    normalizeGeometry(exLintel, palette.woodLight, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.72,
      bottomAO: 0.2,
    })
  );
  propChunks[exChunk].push(createInvertedOutlineGeometry(exLintel, 0.032, OUTLINE_COLOR));

  const exCapStone = new THREE.BoxGeometry(exLintelW - 0.4, 0.26, 0.46);
  exCapStone.translate(ex.position.x, exPostH + 0.82, ex.position.z);
  stoneChunks[exChunk].push(
    normalizeGeometry(exCapStone, palette.stoneRuin, {
      mossColor: MOSS_COLOR,
      mossStrength: 0.85,
      bottomAO: 0.15,
    })
  );
}

function createGateDoorLeafMesh(leafWidth, height, isLeft, palette, material) {
  const parts = [];
  const sign = isLeft ? 1 : -1;
  const midX = sign * (leafWidth * 0.5);

  const railBottom = new THREE.BoxGeometry(leafWidth, 0.14, 0.12);
  railBottom.translate(midX, 0.32, 0);
  const railMid = new THREE.BoxGeometry(leafWidth, 0.14, 0.12);
  railMid.translate(midX, height * 0.52, 0);
  const railTop = new THREE.BoxGeometry(leafWidth, 0.15, 0.12);
  railTop.translate(midX, height - 0.18, 0);
  parts.push(
    normalizeGeometry(railBottom, palette.woodDark, { bottomAO: 0.2 }),
    normalizeGeometry(railMid, palette.woodDark, { bottomAO: 0.15 }),
    normalizeGeometry(railTop, palette.woodDark, { bottomAO: 0.1 })
  );

  const diagLen = Math.hypot(leafWidth * 0.9, height - 0.55);
  const diagAng = Math.atan2(height - 0.55, leafWidth * 0.9) * sign;
  const brace = new THREE.BoxGeometry(diagLen, 0.11, 0.1);
  brace.rotateZ(diagAng);
  brace.translate(midX, height * 0.52, 0);
  parts.push(normalizeGeometry(brace, palette.woodWeathered, { bottomAO: 0.15 }));

  const slatCount = Math.max(4, Math.floor(leafWidth / 0.36));
  for (let i = 0; i < slatCount; i++) {
    const t = (i + 0.5) / slatCount;
    const sx = sign * (t * leafWidth);
    const sh = height - 0.12 + (i % 2) * 0.08;
    const slat = new THREE.BoxGeometry(0.11, sh, 0.06);
    slat.translate(sx, sh * 0.5 + 0.08, 0);
    parts.push(
      normalizeGeometry(slat, i % 2 === 0 ? palette.woodLight : palette.woodWeathered, {
        bottomAO: 0.25,
        aoHeight: 0.8,
      })
    );
  }

  const merged = mergeGeometries(parts, false);
  for (let i = 0; i < parts.length; i++) parts[i].dispose();
  const mesh = new THREE.Mesh(merged, material);
  mesh.frustumCulled = true;
  return mesh;
}

function createGrassTuftGeometry(bladeCount) {
  const blades = [];
  for (let i = 0; i < bladeCount; i++) {
    const ang = (i / bladeCount) * Math.PI * 2 + (i * 1.17);
    const dist = i === 0 ? 0 : 0.08 + (i % 3) * 0.045;
    const ox = Math.cos(ang) * dist;
    const oz = Math.sin(ang) * dist;
    const h = 0.58 + (i % 3) * 0.14;
    const w = 0.068;
    const lean = 0.14 + (i % 2) * 0.08;
    const lx = Math.cos(ang + 0.3) * lean;
    const lz = Math.sin(ang + 0.3) * lean;

    const p0x = ox - Math.sin(ang) * w;
    const p0z = oz + Math.cos(ang) * w;
    const p1x = ox + Math.sin(ang) * w;
    const p1z = oz - Math.cos(ang) * w;

    const m0x = ox + lx * 0.45 - Math.sin(ang) * (w * 0.62);
    const m0z = oz + lz * 0.45 + Math.cos(ang) * (w * 0.62);
    const m1x = ox + lx * 0.45 + Math.sin(ang) * (w * 0.62);
    const m1z = oz + lz * 0.45 - Math.cos(ang) * (w * 0.62);
    const my = h * 0.52;

    const tx = ox + lx;
    const tz = oz + lz;
    const ty = h;

    const posArr = [
      p0x, 0, p0z,
      p1x, 0, p1z,
      m0x, my, m0z,
      m0x, my, m0z,
      p1x, 0, p1z,
      m1x, my, m1z,
      m0x, my, m0z,
      m1x, my, m1z,
      tx, ty, tz,
    ];

    const colArr = [
      0.58, 0.62, 0.55,
      0.58, 0.62, 0.55,
      0.86, 0.90, 0.84,
      0.86, 0.90, 0.84,
      0.58, 0.62, 0.55,
      0.86, 0.90, 0.84,
      0.86, 0.90, 0.84,
      0.86, 0.90, 0.84,
      1.08, 1.12, 1.02,
    ];

    const uvArr = [
      0, 0, 1, 0, 0, 0.5,
      0, 0.5, 1, 0, 1, 0.5,
      0, 0.5, 1, 0.5, 0.5, 1,
    ];

    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    bg.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
    bg.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
    bg.computeVertexNormals();
    blades.push(bg);
  }
  const merged = mergeGeometries(blades, false);
  for (let i = 0; i < blades.length; i++) blades[i].dispose();
  return merged;
}

function createWildflowerClusterGeometry() {
  const parts = [];
  const blossoms = [
    { x: 0.0, y: 0.36, z: 0.0, r: 0.095, tiltX: 0.18, tiltZ: -0.12 },
    { x: 0.11, y: 0.30, z: 0.08, r: 0.082, tiltX: -0.22, tiltZ: 0.16 },
    { x: -0.09, y: 0.27, z: -0.07, r: 0.076, tiltX: 0.14, tiltZ: 0.22 },
  ];

  for (let i = 0; i < blossoms.length; i++) {
    const b = blossoms[i];
    const head = new THREE.CircleGeometry(b.r, 5);
    head.rotateX(-Math.PI * 0.5 + b.tiltX);
    head.rotateZ(b.tiltZ);
    head.translate(b.x, b.y, b.z);
    parts.push(normalizeGeometry(head, 0xffffff, { bottomAO: 0, variation: 0.03 }));
  }

  const stem = new THREE.PlaneGeometry(0.035, 0.34);
  stem.translate(0, 0.17, 0);
  parts.push(normalizeGeometry(stem, 0x7ea058, { bottomAO: 0.25, variation: 0 }));

  const merged = mergeGeometries(parts, false);
  for (let i = 0; i < parts.length; i++) parts[i].dispose();
  return merged;
}

function createCanopyPuffGeometry() {
  const geom = new THREE.IcosahedronGeometry(1.0, 1).toNonIndexed();
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let vx = pos.getX(i);
    let vy = pos.getY(i);
    let vz = pos.getZ(i);
    const lump = 0.9 + Math.sin(vx * 3.1 + vz * 2.7) * 0.14;
    if (vy < 0) vy *= 0.62;
    pos.setXYZ(i, vx * lump, vy * lump, vz * lump);
  }
  geom.computeVertexNormals();
  return normalizeGeometry(geom, 0xffffff, {
    bottomAO: 0.32,
    minY: -0.7,
    aoHeight: 1.5,
    variation: 0.05,
  });
}

function createDistantConiferGeometry(palette) {
  const parts = [];
  const c1 = new THREE.ConeGeometry(1.15, 2.4, 6);
  c1.translate(0, 1.4, 0);
  const c2 = new THREE.ConeGeometry(0.88, 2.0, 6);
  c2.translate(0, 2.6, 0);
  const c3 = new THREE.ConeGeometry(0.58, 1.6, 6);
  c3.translate(0, 3.6, 0);

  parts.push(
    normalizeGeometry(c1, 0x3b5842, { bottomAO: 0.35, minY: 0, aoHeight: 2.2 }),
    normalizeGeometry(c2, 0x46684c, { bottomAO: 0.25, minY: 1.4, aoHeight: 2.0 }),
    normalizeGeometry(c3, palette.grassDark, { bottomAO: 0.15, minY: 2.6, aoHeight: 1.6 })
  );

  const merged = mergeGeometries(parts, false);
  for (let i = 0; i < parts.length; i++) parts[i].dispose();
  return merged;
}

function createFencePostGeometry(palette) {
  const geom = new THREE.CylinderGeometry(0.085, 0.105, 1.18, 6, 1).toNonIndexed();
  geom.translate(0, 0.59, 0);
  geom.computeVertexNormals();
  return normalizeGeometry(geom, palette.woodWeathered, {
    mossColor: MOSS_COLOR,
    mossStrength: 0.5,
    bottomAO: 0.35,
    aoHeight: 0.6,
  });
}

function createFlagPennantGeometry(palette) {
  const geom = new THREE.PlaneGeometry(0.95, 0.42, 4, 1).toNonIndexed();
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i) + 0.475;
    let vy = pos.getY(i);
    const taper = 1.0 - (vx / 0.95) * 0.65;
    vy *= taper;
    pos.setXYZ(i, vx, vy, pos.getZ(i));
  }
  geom.computeVertexNormals();
  return normalizeGeometry(geom, 0x9b4b38, { bottomAO: 0.15, variation: 0.06 });
}

function createEmberMoteGeometry() {
  const geom = new THREE.OctahedronGeometry(0.09, 0);
  return normalizeGeometry(geom, 0xffffff, { bottomAO: 0, variation: 0 });
}

export function buildPrairieFloorArt(ctx = {}) {
  const layout = ctx.layout || DEFAULT_LAYOUT;
  const seed = ctx.seed !== undefined ? ctx.seed : (layout.seed || 15851);
  const palette = { ...DEFAULT_PALETTE, ...(ctx.palette || {}) };
  let currentQuality = QUALITY_CONFIG[ctx.quality] ? ctx.quality : 'high';

  const group = new THREE.Group();
  group.name = 'PrairieFloorArt';

  const anchors = {
    entranceGate: new THREE.Vector3(0, 0, 6.5),
    exitGate: new THREE.Vector3(0, 0, -125),
    startPosition: new THREE.Vector3(
      (layout.startPosition && layout.startPosition.x) || 0,
      0,
      (layout.startPosition && layout.startPosition.z) || 4
    ),
    ruinCenter: new THREE.Vector3(18, 0, -75),
    goblinCamp: new THREE.Vector3(-14, 0, -114),
    torches: [],
  };

  const clearings = layout.clearings || DEFAULT_LAYOUT.clearings;
  for (let i = 0; i < clearings.length; i++) {
    const cl = clearings[i];
    anchors[cl.id || `clearing_${i}`] = new THREE.Vector3(cl.center.x, 0, cl.center.z);
  }
  const chokes = layout.chokePoints || DEFAULT_LAYOUT.chokePoints;
  for (let i = 0; i < chokes.length; i++) {
    const cp = chokes[i];
    anchors[`choke_${i}`] = new THREE.Vector3(cp.position.x, 0, cp.position.z);
  }

  const lights = [];

  const toonGradTex = createToonGradientTexture();
  const grassCanvasTex = createGrassCanvasTexture(seed);
  const stoneCanvasTex = createStoneCanvasTexture(seed);

  const terrainMat = new THREE.MeshToonMaterial({
    map: grassCanvasTex,
    gradientMap: toonGradTex,
    vertexColors: true,
  });

  const stoneMat = new THREE.MeshToonMaterial({
    map: stoneCanvasTex,
    gradientMap: toonGradTex,
    vertexColors: true,
  });

  const propMat = new THREE.MeshToonMaterial({
    gradientMap: toonGradTex,
    vertexColors: true,
  });

  const foliageMat = new THREE.MeshToonMaterial({
    gradientMap: toonGradTex,
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  const grassDarkMat = new THREE.MeshToonMaterial({
    color: palette.grassDark,
    gradientMap: toonGradTex,
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  const grassLightMat = new THREE.MeshToonMaterial({
    color: palette.grassLight,
    gradientMap: toonGradTex,
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  const flowerMat = new THREE.MeshToonMaterial({
    gradientMap: toonGradTex,
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  const emissiveMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const allMaterials = [
    terrainMat,
    stoneMat,
    propMat,
    foliageMat,
    grassDarkMat,
    grassLightMat,
    flowerMat,
    emissiveMat,
  ];

  let activeGeometries = [];
  let grassDarkInst = null;
  let grassLightInst = null;
  let flowerInst = null;
  let canopyInst = null;
  let flagInst = null;
  let emberDustInst = null;

  let grassDarkData = null;
  let grassLightData = null;
  let flowerData = null;
  let canopyData = null;
  let flagData = null;
  let emberDustData = null;

  let entranceLeftDoor = null;
  let entranceRightDoor = null;
  let exitLeftDoor = null;
  let exitRightDoor = null;
  let exitSealMesh = null;

  const gateState = {
    entranceOpen: false,
    exitOpen: false,
    arenaSealed: false,
    entFactor: 0,
    exitFactor: 0,
  };

  function clearCurrentBuild() {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    for (let i = 0; i < activeGeometries.length; i++) {
      activeGeometries[i].dispose();
    }
    activeGeometries = [];
    grassDarkInst = null;
    grassLightInst = null;
    flowerInst = null;
    canopyInst = null;
    flagInst = null;
    emberDustInst = null;
    entranceLeftDoor = null;
    entranceRightDoor = null;
    exitLeftDoor = null;
    exitRightDoor = null;
    exitSealMesh = null;
  }

  function buildSceneForQuality(qualityKey) {
    clearCurrentBuild();
    lights.length = 0;
    anchors.torches.length = 0;

    const cfg = QUALITY_CONFIG[qualityKey] || QUALITY_CONFIG.high;
    const rng = createRng(seed);
    const bounds = layout.bounds || DEFAULT_LAYOUT.bounds;

    const terrainChunks = [[], [], [], []];
    const stoneChunks = [[], [], [], []];
    const propChunks = [[], [], [], []];

    const canopyInstances = [];
    const fencePostInstances = [];
    const flagInstances = [];
    const emberSources = [];

    buildTerrainAndPaths(layout, palette, cfg, terrainChunks);

    const campSpots = layout.campSpots || DEFAULT_LAYOUT.campSpots;
    let ruinSpot = null;
    let goblinSpot = null;
    for (let i = 0; i < campSpots.length; i++) {
      if (campSpots[i].type === 'ruin') ruinSpot = campSpots[i];
      if (campSpots[i].type === 'camp') goblinSpot = campSpots[i];
    }

    if (ruinSpot) {
      buildAncientRuins(
        ruinSpot,
        layout,
        seed,
        palette,
        cfg,
        stoneChunks,
        propChunks,
        flagInstances,
        emberSources,
        lights,
        anchors
      );
    }

    if (goblinSpot) {
      buildGoblinCampsite(
        goblinSpot,
        layout,
        seed,
        palette,
        cfg,
        stoneChunks,
        propChunks,
        flagInstances,
        emberSources,
        lights,
        anchors
      );
    }

    buildGates(layout, palette, stoneChunks, propChunks, flagInstances, emberSources, lights, anchors);

    const obstacles = layout.obstacles || DEFAULT_LAYOUT.obstacles;
    const chokeList = layout.chokePoints || DEFAULT_LAYOUT.chokePoints;

    for (let i = 0; i < obstacles.length; i++) {
      const ob = obstacles[i];
      if (ruinSpot && Math.hypot(ob.x - ruinSpot.x, ob.z - ruinSpot.z) < 2.2) {
        continue;
      }

      let isChokeOb = false;
      for (let c = 0; c < chokeList.length; c++) {
        if (Math.hypot(ob.x - chokeList[c].position.x, ob.z - chokeList[c].position.z) < 5.2) {
          isChokeOb = true;
          break;
        }
      }

      addBoulderOutcrop(
        ob.x,
        ob.z,
        ob.radius,
        seed + 1000 + i * 37,
        palette,
        cfg,
        stoneChunks,
        propChunks,
        isChokeOb
      );

      if (!isChokeOb && (i === 6 || i === 9 || i === 10 || i === 13)) {
        const isBirch = i % 2 === 1;
        addWindsweptTree(
          ob.x,
          ob.z,
          ob.radius,
          isBirch,
          seed + 2000 + i * 53,
          palette,
          cfg,
          propChunks,
          canopyInstances
        );
      }
    }

    const scenicTreeSpots = [
      { x: -25, z: 2, r: 1.5, birch: false },
      { x: 24, z: -12, r: 1.4, birch: true },
      { x: -26, z: -24, r: 1.6, birch: false },
      { x: 27, z: -48, r: 1.5, birch: false },
      { x: -28, z: -64, r: 1.4, birch: true },
      { x: 29, z: -66, r: 1.6, birch: false },
      { x: 26, z: -88, r: 1.4, birch: true },
      { x: -27, z: -98, r: 1.6, birch: false },
      { x: 25, z: -108, r: 1.5, birch: false },
      { x: -24, z: -126, r: 1.4, birch: true },
      { x: 22, z: -128, r: 1.5, birch: false },
    ];

    for (let i = 0; i < scenicTreeSpots.length; i++) {
      const st = scenicTreeSpots[i];
      addWindsweptTree(
        st.x,
        st.z,
        st.r,
        st.birch,
        seed + 3000 + i * 41,
        palette,
        cfg,
        propChunks,
        canopyInstances
      );
    }

    const wallSegments = [
      { x0: -4.1, z0: -20.0, x1: -11.5, z1: -19.2 },
      { x0: 4.1, z0: -20.0, x1: 11.5, z1: -20.8 },
      { x0: -3.4, z0: -55.0, x1: -11.2, z1: -53.8 },
      { x0: 5.2, z0: -55.0, x1: 12.8, z1: -56.2 },
      { x0: -4.9, z0: -94.0, x1: -12.4, z1: -92.8 },
      { x0: 3.5, z0: -94.0, x1: 11.2, z1: -95.2 },
      { x0: -14.8, z0: -29.0, x1: -17.2, z1: -39.5 },
      { x0: 15.2, z0: -64.0, x1: 12.2, z1: -59.5 },
    ];

    for (let i = 0; i < wallSegments.length; i++) {
      const ws = wallSegments[i];
      addDryStoneWallSegment(
        ws.x0,
        ws.z0,
        ws.x1,
        ws.z1,
        seed + 4000 + i * 29,
        palette,
        stoneChunks,
        propChunks
      );
    }

    const fenceSegments = [
      { x0: -11.5, z0: -19.2, x1: -19.5, z1: -16.8 },
      { x0: 11.5, z0: -20.8, x1: 19.5, z1: -23.0 },
      { x0: -5.2, z0: -9.0, x1: -12.8, z1: -3.5 },
      { x0: 5.2, z0: -9.0, x1: 12.8, z1: -3.5 },
      { x0: -11.2, z0: -53.8, x1: -19.8, z1: -50.5 },
      { x0: 12.8, z0: -56.2, x1: 21.0, z1: -59.5 },
      { x0: -12.4, z0: -92.8, x1: -20.2, z1: -89.5 },
      { x0: 11.2, z0: -95.2, x1: 19.4, z1: -98.5 },
      { x0: 14.5, z0: -30.0, x1: 16.8, z1: -41.0 },
      { x0: -16.0, z0: -68.0, x1: -18.5, z1: -81.0 },
    ];

    for (let i = 0; i < fenceSegments.length; i++) {
      const fs = fenceSegments[i];
      addRanchFenceSegment(
        fs.x0,
        fs.z0,
        fs.x1,
        fs.z1,
        seed + 5000 + i * 31,
        palette,
        propChunks,
        fencePostInstances
      );
    }

    const chokeSentinelX = -3.6;
    const chokeSentinelZ = -20.4;
    const cTorchPost = new THREE.CylinderGeometry(0.08, 0.11, 2.0, 6);
    cTorchPost.translate(chokeSentinelX, 1.0, chokeSentinelZ);
    propChunks[getChunkIndex(chokeSentinelZ)].push(
      normalizeGeometry(cTorchPost, palette.woodDark, { bottomAO: 0.3 })
    );
    const chokeTorchPos = new THREE.Vector3(chokeSentinelX, 2.08, chokeSentinelZ);
    lights.push({ position: chokeTorchPos, color: 0xff9e44, intensity: 1.6, distance: 12 });
    anchors.torches.push(chokeTorchPos);
    emberSources.push({ x: chokeTorchPos.x, y: chokeTorchPos.y, z: chokeTorchPos.z, radius: 0.14, count: 7 });

    const ambushSpots = layout.ambushSpots || DEFAULT_LAYOUT.ambushSpots;
    for (let i = 0; i < ambushSpots.length; i++) {
      const as = ambushSpots[i];
      const sideSign = as.x < 0 ? -1 : 1;
      const rockX = as.x + sideSign * 1.45;
      const rockZ = as.z - 0.65;
      const crouchRock = createSculptedRockGeometry(0.78, 0.65, 1, seed + 6000 + i * 19);
      crouchRock.rotateY(i * 1.1);
      crouchRock.translate(rockX, 0, rockZ);
      stoneChunks[getChunkIndex(rockZ)].push(
        normalizeGeometry(crouchRock, palette.rockBase, {
          mossColor: MOSS_COLOR,
          mossStrength: 0.6,
          bottomAO: 0.35,
        })
      );

      for (let b = 0; b < 2; b++) {
        const ba = i * 1.7 + b * 2.4;
        canopyInstances.push({
          x: as.x + Math.cos(ba) * 0.85,
          y: 0.35,
          z: as.z + Math.sin(ba) * 0.85,
          sx: 0.92,
          sy: 0.58,
          sz: 0.88,
          rotY: ba,
          colorHex: b === 0 ? palette.grassDark : palette.terrainBase,
        });
      }
    }

    for (let c = 0; c < 4; c++) {
      if (terrainChunks[c].length > 0) {
        const merged = mergeGeometries(terrainChunks[c], false);
        for (let g of terrainChunks[c]) g.dispose();
        activeGeometries.push(merged);
        const mesh = new THREE.Mesh(merged, terrainMat);
        mesh.name = `PrairieTerrainChunk_${c}`;
        mesh.frustumCulled = true;
        group.add(mesh);
      }

      if (stoneChunks[c].length > 0) {
        const merged = mergeGeometries(stoneChunks[c], false);
        for (let g of stoneChunks[c]) g.dispose();
        activeGeometries.push(merged);
        const mesh = new THREE.Mesh(merged, stoneMat);
        mesh.name = `PrairieStoneChunk_${c}`;
        mesh.frustumCulled = true;
        group.add(mesh);
      }

      if (propChunks[c].length > 0) {
        const merged = mergeGeometries(propChunks[c], false);
        for (let g of propChunks[c]) g.dispose();
        activeGeometries.push(merged);
        const mesh = new THREE.Mesh(merged, propMat);
        mesh.name = `PrairiePropChunk_${c}`;
        mesh.frustumCulled = true;
        group.add(mesh);
      }
    }

    const ent = layout.entranceBarrier || DEFAULT_LAYOUT.entranceBarrier;
    const ex = layout.exitGate || DEFAULT_LAYOUT.exitGate;
    const entHalfOpening = (layout.pathWidth || 5.8) * 0.5 + 0.1;

    entranceLeftDoor = createGateDoorLeafMesh(entHalfOpening, 2.15, true, palette, propMat);
    entranceLeftDoor.position.set(ent.position.x - entHalfOpening, 0, ent.position.z);
    activeGeometries.push(entranceLeftDoor.geometry);
    group.add(entranceLeftDoor);

    entranceRightDoor = createGateDoorLeafMesh(entHalfOpening, 2.15, false, palette, propMat);
    entranceRightDoor.position.set(ent.position.x + entHalfOpening, 0, ent.position.z);
    activeGeometries.push(entranceRightDoor.geometry);
    group.add(entranceRightDoor);

    const exHalfOpening = (ex.width || 4.0) * 0.5;
    exitLeftDoor = createGateDoorLeafMesh(exHalfOpening, 2.38, true, palette, propMat);
    exitLeftDoor.position.set(ex.position.x - exHalfOpening, 0, ex.position.z);
    activeGeometries.push(exitLeftDoor.geometry);
    group.add(exitLeftDoor);

    exitRightDoor = createGateDoorLeafMesh(exHalfOpening, 2.38, false, palette, propMat);
    exitRightDoor.position.set(ex.position.x + exHalfOpening, 0, ex.position.z);
    activeGeometries.push(exitRightDoor.geometry);
    group.add(exitRightDoor);

    const sealGeom = normalizeGeometry(
      new THREE.PlaneGeometry(ex.width || 4.0, 2.25),
      0x7ad9ff,
      { bottomAO: 0, variation: 0.05 }
    );
    activeGeometries.push(sealGeom);
    exitSealMesh = new THREE.Mesh(sealGeom, emissiveMat);
    exitSealMesh.position.set(ex.position.x, 1.25, ex.position.z + 0.08);
    exitSealMesh.visible = gateState.arenaSealed;
    group.add(exitSealMesh);

    buildInstancedVegetationAndProps(
      layout,
      bounds,
      palette,
      cfg,
      rng,
      canopyInstances,
      fencePostInstances,
      flagInstances,
      emberSources
    );

    applyGateTransforms();
  }

  function buildInstancedVegetationAndProps(
    layout,
    bounds,
    palette,
    cfg,
    rng,
    canopyInstances,
    fencePostInstances,
    flagInstances,
    emberSources
  ) {
    const dummy = new THREE.Object3D();
    const colorTmp = new THREE.Color();

    const tuftGeom = createGrassTuftGeometry(cfg.grassBladesPerTuft);
    activeGeometries.push(tuftGeom);

    const grassTotalPerShade = cfg.grassTuftsPerShade;
    grassDarkInst = new THREE.InstancedMesh(tuftGeom, grassDarkMat, grassTotalPerShade);
    grassLightInst = new THREE.InstancedMesh(tuftGeom, grassLightMat, grassTotalPerShade);
    grassDarkInst.name = 'PrairieGrassDark';
    grassLightInst.name = 'PrairieGrassLight';

    grassDarkData = {
      x: new Float32Array(grassTotalPerShade),
      z: new Float32Array(grassTotalPerShade),
      sy: new Float32Array(grassTotalPerShade),
      phase: new Float32Array(grassTotalPerShade),
      count: 0,
    };
    grassLightData = {
      x: new Float32Array(grassTotalPerShade),
      z: new Float32Array(grassTotalPerShade),
      sy: new Float32Array(grassTotalPerShade),
      phase: new Float32Array(grassTotalPerShade),
      count: 0,
    };

    function pushGrassInstance(isLight, gx, gy, gz, gScaleXZ, gScaleY, yaw) {
      const targetInst = isLight ? grassLightInst : grassDarkInst;
      const targetData = isLight ? grassLightData : grassDarkData;
      const idx = targetData.count;
      if (idx >= grassTotalPerShade) return false;

      dummy.position.set(gx, gy, gz);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(gScaleXZ, gScaleY, gScaleXZ);
      dummy.updateMatrix();
      targetInst.setMatrixAt(idx, dummy.matrix);

      targetData.x[idx] = gx;
      targetData.z[idx] = gz;
      targetData.sy[idx] = gScaleY;
      targetData.phase[idx] = gx * 0.19 + gz * 0.14 + (isLight ? 1.1 : 0.0);
      targetData.count = idx + 1;
      return true;
    }

    const ambushSpots = layout.ambushSpots || DEFAULT_LAYOUT.ambushSpots;
    for (let i = 0; i < ambushSpots.length; i++) {
      const as = ambushSpots[i];
      const clumpCount = 24;
      for (let k = 0; k < clumpCount; k++) {
        const a = rng() * Math.PI * 2;
        const d = Math.pow(rng(), 0.65) * 2.65;
        const gx = as.x + Math.cos(a) * d;
        const gz = as.z + Math.sin(a) * d;
        const gy = computeTerrainHeight(gx, gz, bounds);
        const sXZ = 1.15 + rng() * 0.45;
        const sY = 1.25 + rng() * 0.55;
        pushGrassInstance(k % 2 === 0, gx, gy, gz, sXZ, sY, rng() * Math.PI * 2);
      }
    }

    let attempts = 0;
    const maxAttempts = grassTotalPerShade * 6;
    while (
      (grassDarkData.count < grassTotalPerShade || grassLightData.count < grassTotalPerShade) &&
      attempts < maxAttempts
    ) {
      attempts++;
      const spreadHill = rng() < 0.22;
      const gx = spreadHill
        ? lerp(bounds.minX - 24, bounds.maxX + 24, rng())
        : lerp(bounds.minX + 1, bounds.maxX - 1, rng());
      const gz = spreadHill
        ? lerp(bounds.minZ - 20, bounds.maxZ + 18, rng())
        : lerp(bounds.minZ + 1, bounds.maxZ - 1, rng());

      const m = getSurfaceMetrics(gx, gz, layout);
      if (m.obstacleClearance < 0.25) continue;
      if (m.goblinCampDist < 4.6) continue;

      let scaleMult = 1.0;
      if (m.pathDist < m.pathHalfWidth + 0.4) {
        if (m.pathDist > m.pathHalfWidth - 0.55 && rng() < 0.32) {
          scaleMult = 0.58;
        } else {
          continue;
        }
      } else if (m.clearingNorm < 0.88) {
        if (rng() > 0.16) continue;
        scaleMult = 0.62;
      } else if (m.clearingNorm < 1.22) {
        scaleMult = 1.15;
      }

      const gy = computeTerrainHeight(gx, gz, bounds);
      const isLight =
        grassDarkData.count >= grassTotalPerShade
          ? true
          : grassLightData.count >= grassTotalPerShade
            ? false
            : rng() > 0.48;

      const sXZ = (0.85 + rng() * 0.55) * scaleMult;
      const sY = (0.82 + rng() * 0.68) * scaleMult;
      pushGrassInstance(isLight, gx, gy, gz, sXZ, sY, rng() * Math.PI * 2);
    }

    grassDarkInst.count = grassDarkData.count;
    grassLightInst.count = grassLightData.count;
    grassDarkInst.instanceMatrix.needsUpdate = true;
    grassLightInst.instanceMatrix.needsUpdate = true;
    grassDarkInst.frustumCulled = false;
    grassLightInst.frustumCulled = false;
    group.add(grassDarkInst);
    group.add(grassLightInst);

    const flowerGeom = createWildflowerClusterGeometry();
    activeGeometries.push(flowerGeom);
    const flowerMax = cfg.flowerCount;
    flowerInst = new THREE.InstancedMesh(flowerGeom, flowerMat, flowerMax);
    flowerInst.name = 'PrairieWildflowers';
    flowerData = {
      x: new Float32Array(flowerMax),
      z: new Float32Array(flowerMax),
      sy: new Float32Array(flowerMax),
      phase: new Float32Array(flowerMax),
      count: 0,
    };

    const flowerPalette = [palette.flowerWhite, palette.flowerYellow, palette.flowerLilac];
    let fAttempts = 0;
    while (flowerData.count < flowerMax && fAttempts < flowerMax * 5) {
      fAttempts++;
      const fx = lerp(bounds.minX - 10, bounds.maxX + 10, rng());
      const fz = lerp(bounds.minZ - 10, bounds.maxZ + 8, rng());
      const m = getSurfaceMetrics(fx, fz, layout);
      if (m.pathDist < m.pathHalfWidth + 0.35) continue;
      if (m.obstacleClearance < 0.35) continue;
      if (m.goblinCampDist < 5.2) continue;
      if (m.clearingNorm < 0.82 && rng() > 0.14) continue;

      const fy = computeTerrainHeight(fx, fz, bounds);
      const idx = flowerData.count;
      const sc = 0.82 + rng() * 0.55;
      dummy.position.set(fx, fy, fz);
      dummy.rotation.set(0, rng() * Math.PI * 2, 0);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      flowerInst.setMatrixAt(idx, dummy.matrix);

      const patchHash = Math.floor((fx + 60) * 0.18) + Math.floor((fz + 150) * 0.18);
      const colHex = flowerPalette[Math.abs(patchHash + Math.floor(rng() * 2)) % 3];
      colorTmp.setHex(colHex);
      flowerInst.setColorAt(idx, colorTmp);

      flowerData.x[idx] = fx;
      flowerData.z[idx] = fz;
      flowerData.sy[idx] = sc;
      flowerData.phase[idx] = fx * 0.22 + fz * 0.17;
      flowerData.count = idx + 1;
    }

    flowerInst.count = flowerData.count;
    flowerInst.instanceMatrix.needsUpdate = true;
    if (flowerInst.instanceColor) flowerInst.instanceColor.needsUpdate = true;
    flowerInst.frustumCulled = false;
    group.add(flowerInst);

    const canopyGeom = createCanopyPuffGeometry();
    activeGeometries.push(canopyGeom);
    canopyInst = new THREE.InstancedMesh(canopyGeom, foliageMat, Math.max(1, canopyInstances.length));
    canopyInst.name = 'PrairieCanopyAndBushes';
    canopyData = {
      baseY: new Float32Array(canopyInstances.length),
      sy: new Float32Array(canopyInstances.length),
      phase: new Float32Array(canopyInstances.length),
      count: canopyInstances.length,
    };

    for (let i = 0; i < canopyInstances.length; i++) {
      const ci = canopyInstances[i];
      dummy.position.set(ci.x, ci.y, ci.z);
      dummy.rotation.set(0, ci.rotY, 0);
      dummy.scale.set(ci.sx, ci.sy, ci.sz);
      dummy.updateMatrix();
      canopyInst.setMatrixAt(i, dummy.matrix);
      colorTmp.setHex(ci.colorHex);
      canopyInst.setColorAt(i, colorTmp);

      canopyData.baseY[i] = ci.y;
      canopyData.sy[i] = ci.sy;
      canopyData.phase[i] = ci.x * 0.15 + ci.z * 0.12 + i * 0.3;
    }
    canopyInst.instanceMatrix.needsUpdate = true;
    if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
    canopyInst.frustumCulled = false;
    group.add(canopyInst);

    const coniferGeom = createDistantConiferGeometry(palette);
    activeGeometries.push(coniferGeom);
    const distTreeCount = cfg.distantTrees;
    const distantTreeInst = new THREE.InstancedMesh(coniferGeom, foliageMat, distTreeCount);
    distantTreeInst.name = 'PrairieHorizonForest';
    let dtPlaced = 0;
    let dtAttempts = 0;

    while (dtPlaced < distTreeCount && dtAttempts < distTreeCount * 6) {
      dtAttempts++;
      const angle = rng() * Math.PI * 2;
      const radX = 52 + rng() * 58;
      const radZ = 75 + rng() * 62;
      const tx = Math.cos(angle) * radX;
      const tz = -62 + Math.sin(angle) * radZ;

      if (tx > bounds.minX - 5 && tx < bounds.maxX + 5 && tz > bounds.minZ - 5 && tz < bounds.maxZ + 5) {
        continue;
      }
      if (Math.abs(tx) < 11 && (tz > bounds.maxZ - 2 || tz < bounds.minZ + 2)) {
        continue;
      }

      const ty = computeTerrainHeight(tx, tz, bounds);
      if (ty > 17.5) continue;

      const sc = 0.95 + rng() * 1.15;
      dummy.position.set(tx, ty - 0.25, tz);
      dummy.rotation.set(0, rng() * Math.PI * 2, 0);
      dummy.scale.set(sc, sc * (0.9 + rng() * 0.3), sc);
      dummy.updateMatrix();
      distantTreeInst.setMatrixAt(dtPlaced, dummy.matrix);

      colorTmp.setHex(dtPlaced % 2 === 0 ? 0x3b5842 : 0x4b6b4f);
      distantTreeInst.setColorAt(dtPlaced, colorTmp);
      dtPlaced++;
    }
    distantTreeInst.count = dtPlaced;
    distantTreeInst.instanceMatrix.needsUpdate = true;
    if (distantTreeInst.instanceColor) distantTreeInst.instanceColor.needsUpdate = true;
    distantTreeInst.frustumCulled = false;
    group.add(distantTreeInst);

    const fieldRockGeom = normalizeGeometry(
      createSculptedRockGeometry(0.42, 0.32, 1, seed ^ 0x19a4),
      palette.rockBase,
      { mossColor: MOSS_COLOR, mossStrength: 0.55, bottomAO: 0.35 }
    );
    activeGeometries.push(fieldRockGeom);
    const rockCount = cfg.fieldRocks;
    const fieldRockInst = new THREE.InstancedMesh(fieldRockGeom, stoneMat, rockCount);
    fieldRockInst.name = 'PrairieFieldRocks';
    let rPlaced = 0;
    let rAttempts = 0;

    while (rPlaced < rockCount && rAttempts < rockCount * 5) {
      rAttempts++;
      const rx = lerp(bounds.minX - 18, bounds.maxX + 18, rng());
      const rz = lerp(bounds.minZ - 14, bounds.maxZ + 10, rng());
      const m = getSurfaceMetrics(rx, rz, layout);
      if (m.pathDist < m.pathHalfWidth - 0.2) continue;
      if (m.clearingNorm < 0.92) continue;

      const ry = computeTerrainHeight(rx, rz, bounds);
      const sx = 0.55 + rng() * 1.25;
      const sy = 0.45 + rng() * 0.95;
      const sz = 0.55 + rng() * 1.25;
      dummy.position.set(rx, ry, rz);
      dummy.rotation.set(0, rng() * Math.PI * 2, 0);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      fieldRockInst.setMatrixAt(rPlaced, dummy.matrix);
      rPlaced++;
    }
    fieldRockInst.count = rPlaced;
    fieldRockInst.instanceMatrix.needsUpdate = true;
    fieldRockInst.frustumCulled = false;
    group.add(fieldRockInst);

    const postGeom = createFencePostGeometry(palette);
    activeGeometries.push(postGeom);
    const fencePostInst = new THREE.InstancedMesh(postGeom, propMat, Math.max(1, fencePostInstances.length));
    fencePostInst.name = 'PrairieFencePosts';
    for (let i = 0; i < fencePostInstances.length; i++) {
      const fp = fencePostInstances[i];
      dummy.position.set(fp.x, fp.y, fp.z);
      dummy.rotation.set(fp.tiltX, fp.rotY, fp.tiltZ);
      dummy.scale.set(fp.sx, fp.sy, fp.sz);
      dummy.updateMatrix();
      fencePostInst.setMatrixAt(i, dummy.matrix);
    }
    fencePostInst.instanceMatrix.needsUpdate = true;
    fencePostInst.frustumCulled = false;
    group.add(fencePostInst);

    const flagGeom = createFlagPennantGeometry(palette);
    activeGeometries.push(flagGeom);
    flagInst = new THREE.InstancedMesh(flagGeom, propMat, Math.max(1, flagInstances.length));
    flagInst.name = 'PrairieFlags';
    flagData = {
      x: new Float32Array(flagInstances.length),
      y: new Float32Array(flagInstances.length),
      z: new Float32Array(flagInstances.length),
      sx: new Float32Array(flagInstances.length),
      sy: new Float32Array(flagInstances.length),
      sz: new Float32Array(flagInstances.length),
      rotY: new Float32Array(flagInstances.length),
      count: flagInstances.length,
    };

    for (let i = 0; i < flagInstances.length; i++) {
      const fl = flagInstances[i];
      dummy.position.set(fl.x, fl.y, fl.z);
      dummy.rotation.set(0, fl.rotY, 0);
      dummy.scale.set(fl.sx, fl.sy, fl.sz);
      dummy.updateMatrix();
      flagInst.setMatrixAt(i, dummy.matrix);

      flagData.x[i] = fl.x;
      flagData.y[i] = fl.y;
      flagData.z[i] = fl.z;
      flagData.sx[i] = fl.sx;
      flagData.sy[i] = fl.sy;
      flagData.sz[i] = fl.sz;
      flagData.rotY[i] = fl.rotY;
    }
    flagInst.instanceMatrix.needsUpdate = true;
    flagInst.frustumCulled = false;
    group.add(flagInst);

    let totalEmbers = 0;
    for (let i = 0; i < emberSources.length; i++) {
      totalEmbers += emberSources[i].count;
    }
    const totalParticles = totalEmbers + cfg.dustCount;
    const moteGeom = createEmberMoteGeometry();
    activeGeometries.push(moteGeom);

    emberDustInst = new THREE.InstancedMesh(moteGeom, emissiveMat, totalParticles);
    emberDustInst.name = 'PrairieEmbersAndDust';
    emberDustData = {
      baseX: new Float32Array(totalParticles),
      baseY: new Float32Array(totalParticles),
      baseZ: new Float32Array(totalParticles),
      rad: new Float32Array(totalParticles),
      speed: new Float32Array(totalParticles),
      phase: new Float32Array(totalParticles),
      isEmber: new Uint8Array(totalParticles),
      count: totalParticles,
    };

    let pIdx = 0;
    for (let s = 0; s < emberSources.length; s++) {
      const src = emberSources[s];
      for (let k = 0; k < src.count; k++) {
        emberDustData.baseX[pIdx] = src.x;
        emberDustData.baseY[pIdx] = src.y;
        emberDustData.baseZ[pIdx] = src.z;
        emberDustData.rad[pIdx] = src.radius * (0.25 + rng() * 0.75);
        emberDustData.speed[pIdx] = 0.8 + rng() * 1.4;
        emberDustData.phase[pIdx] = rng() * Math.PI * 2;
        emberDustData.isEmber[pIdx] = 1;

        colorTmp.setHex(k % 3 === 0 ? EMBER_GOLD : EMBER_ORANGE);
        emberDustInst.setColorAt(pIdx, colorTmp);
        pIdx++;
      }
    }

    for (let d = 0; d < cfg.dustCount; d++) {
      const dx = lerp(bounds.minX + 4, bounds.maxX - 4, rng());
      const dz = lerp(bounds.minZ + 4, bounds.maxZ - 2, rng());
      const dy = 0.45 + rng() * 2.4;
      emberDustData.baseX[pIdx] = dx;
      emberDustData.baseY[pIdx] = dy;
      emberDustData.baseZ[pIdx] = dz;
      emberDustData.rad[pIdx] = 0.6 + rng() * 1.6;
      emberDustData.speed[pIdx] = 0.35 + rng() * 0.55;
      emberDustData.phase[pIdx] = rng() * Math.PI * 2;
      emberDustData.isEmber[pIdx] = 0;

      colorTmp.setHex(d % 2 === 0 ? palette.flowerWhite : palette.flowerYellow);
      emberDustInst.setColorAt(pIdx, colorTmp);
      pIdx++;
    }

    for (let i = 0; i < totalParticles; i++) {
      dummy.position.set(emberDustData.baseX[i], emberDustData.baseY[i], emberDustData.baseZ[i]);
      dummy.scale.setScalar(0.5);
      dummy.updateMatrix();
      emberDustInst.setMatrixAt(i, dummy.matrix);
    }
    emberDustInst.instanceMatrix.needsUpdate = true;
    if (emberDustInst.instanceColor) emberDustInst.instanceColor.needsUpdate = true;
    emberDustInst.frustumCulled = false;
    group.add(emberDustInst);
  }

  function applyGateTransforms() {
    if (entranceLeftDoor && entranceRightDoor) {
      const angle = gateState.entFactor * (Math.PI * 0.48);
      entranceLeftDoor.rotation.y = angle;
      entranceRightDoor.rotation.y = -angle;
    }
    if (exitLeftDoor && exitRightDoor) {
      const angle = gateState.exitFactor * (Math.PI * 0.48);
      exitLeftDoor.rotation.y = -angle;
      exitRightDoor.rotation.y = angle;
    }
    if (exitSealMesh) {
      exitSealMesh.visible = Boolean(gateState.arenaSealed && !gateState.exitOpen);
    }
  }

  buildSceneForQuality(currentQuality);

  function update(dt = 0.016, time = 0) {
    const step = clamp(dt, 0.001, 0.1);
    const targetEnt = gateState.entranceOpen ? 1 : 0;
    const targetExit = gateState.exitOpen ? 1 : 0;
    if (Math.abs(gateState.entFactor - targetEnt) > 0.001 || Math.abs(gateState.exitFactor - targetExit) > 0.001) {
      gateState.entFactor = lerp(gateState.entFactor, targetEnt, clamp(step * 6.0, 0, 1));
      gateState.exitFactor = lerp(gateState.exitFactor, targetExit, clamp(step * 6.0, 0, 1));
      applyGateTransforms();
    }

    const t1 = time * 2.15;
    const t2 = time * 3.45;

    if (grassDarkInst && grassDarkData) {
      const arr = grassDarkInst.instanceMatrix.array;
      const count = grassDarkData.count;
      const phArr = grassDarkData.phase;
      const syArr = grassDarkData.sy;
      for (let i = 0; i < count; i++) {
        const ph = phArr[i];
        const sy = syArr[i];
        const gust = Math.sin(t1 + ph) * 0.16 + Math.sin(t2 + ph * 1.7) * 0.06 + 0.08;
        const base = i * 16;
        arr[base + 4] = gust * sy;
        arr[base + 6] = gust * 0.42 * sy;
      }
      grassDarkInst.instanceMatrix.needsUpdate = true;
    }

    if (grassLightInst && grassLightData) {
      const arr = grassLightInst.instanceMatrix.array;
      const count = grassLightData.count;
      const phArr = grassLightData.phase;
      const syArr = grassLightData.sy;
      for (let i = 0; i < count; i++) {
        const ph = phArr[i];
        const sy = syArr[i];
        const gust = Math.sin(t1 + ph) * 0.18 + Math.cos(t2 + ph * 1.5) * 0.07 + 0.09;
        const base = i * 16;
        arr[base + 4] = gust * sy;
        arr[base + 6] = gust * 0.45 * sy;
      }
      grassLightInst.instanceMatrix.needsUpdate = true;
    }

    if (flowerInst && flowerData) {
      const arr = flowerInst.instanceMatrix.array;
      const count = flowerData.count;
      const phArr = flowerData.phase;
      const syArr = flowerData.sy;
      for (let i = 0; i < count; i++) {
        const ph = phArr[i];
        const sy = syArr[i];
        const sway = Math.sin(t1 + ph) * 0.12 + 0.05;
        const base = i * 16;
        arr[base + 4] = sway * sy;
        arr[base + 6] = sway * 0.35 * sy;
      }
      flowerInst.instanceMatrix.needsUpdate = true;
    }

    if (canopyInst && canopyData) {
      const arr = canopyInst.instanceMatrix.array;
      const count = canopyData.count;
      const phArr = canopyData.phase;
      const syArr = canopyData.sy;
      for (let i = 0; i < count; i++) {
        const ph = phArr[i];
        const sy = syArr[i];
        const sway = Math.sin(time * 1.65 + ph) * 0.075;
        const base = i * 16;
        arr[base + 4] = sway * sy;
        arr[base + 6] = sway * 0.5 * sy;
      }
      canopyInst.instanceMatrix.needsUpdate = true;
    }

    if (flagInst && flagData) {
      const arr = flagInst.instanceMatrix.array;
      const count = flagData.count;
      for (let i = 0; i < count; i++) {
        const rot = flagData.rotY[i] + Math.sin(time * 4.2 + i * 1.3) * 0.22;
        const sx = flagData.sx[i];
        const sy = flagData.sy[i];
        const sz = flagData.sz[i];
        const c = Math.cos(rot);
        const s = Math.sin(rot);
        const base = i * 16;
        arr[base + 0] = c * sx;
        arr[base + 2] = -s * sx;
        arr[base + 4] = Math.sin(time * 6.5 + i) * 0.14;
        arr[base + 5] = sy;
        arr[base + 8] = s * sz;
        arr[base + 10] = c * sz;
      }
      flagInst.instanceMatrix.needsUpdate = true;
    }

    if (emberDustInst && emberDustData) {
      const arr = emberDustInst.instanceMatrix.array;
      const count = emberDustData.count;
      for (let i = 0; i < count; i++) {
        const base = i * 16;
        const ph = emberDustData.phase[i];
        const spd = emberDustData.speed[i];
        const rad = emberDustData.rad[i];

        if (emberDustData.isEmber[i]) {
          const cycle = (time * spd + ph) % 1.0;
          const sc = (1.0 - cycle) * 0.95 + 0.15;
          arr[base + 0] = sc;
          arr[base + 5] = sc * 1.45;
          arr[base + 10] = sc;
          arr[base + 12] = emberDustData.baseX[i] + Math.sin(time * 3.8 + ph * 4.0) * rad;
          arr[base + 13] = emberDustData.baseY[i] + cycle * 1.35;
          arr[base + 14] = emberDustData.baseZ[i] + Math.cos(time * 3.4 + ph * 3.0) * rad;
        } else {
          const sc = 0.28 + Math.sin(time * 2.0 + ph) * 0.1;
          arr[base + 0] = sc;
          arr[base + 5] = sc;
          arr[base + 10] = sc;
          arr[base + 12] = emberDustData.baseX[i] + Math.sin(time * spd + ph) * rad * 1.8;
          arr[base + 13] = emberDustData.baseY[i] + Math.cos(time * spd * 1.3 + ph) * 0.35;
          arr[base + 14] = emberDustData.baseZ[i] + Math.cos(time * spd * 0.8 + ph) * rad;
        }
      }
      emberDustInst.instanceMatrix.needsUpdate = true;
    }
  }

  function setQuality(q) {
    const nextQ = QUALITY_CONFIG[q] ? q : 'high';
    if (nextQ === currentQuality) return;
    currentQuality = nextQ;
    buildSceneForQuality(currentQuality);
  }

  function setLighting(lighting) {
    if (!lighting) return;
    if (lighting.lampGlow !== undefined) {
      emissiveMat.opacity = clamp(0.65 + lighting.lampGlow * 0.3, 0.4, 1.0);
    }
  }

  function setGateState(state = {}) {
    if (state.entranceOpen !== undefined) gateState.entranceOpen = Boolean(state.entranceOpen);
    if (state.exitOpen !== undefined) gateState.exitOpen = Boolean(state.exitOpen);
    if (state.arenaSealed !== undefined) gateState.arenaSealed = Boolean(state.arenaSealed);
    applyGateTransforms();
  }

  function destroyPillar() {
    return false;
  }

  function getStats() {
    let meshes = 0;
    let triangles = 0;
    let drawCallsEstimate = 0;

    group.traverse((obj) => {
      if (!obj.isMesh || !obj.visible) return;
      meshes += 1;
      drawCallsEstimate += 1;
      const geom = obj.geometry;
      if (!geom) return;
      const triPerMesh = geom.index
        ? geom.index.count / 3
        : geom.attributes.position
          ? geom.attributes.position.count / 3
          : 0;
      const instances = obj.isInstancedMesh ? obj.count : 1;
      triangles += Math.round(triPerMesh * instances);
    });

    return { meshes, triangles, drawCallsEstimate };
  }

  function dispose() {
    clearCurrentBuild();
    for (let i = 0; i < allMaterials.length; i++) {
      allMaterials[i].dispose();
    }
    toonGradTex.dispose();
    grassCanvasTex.dispose();
    stoneCanvasTex.dispose();
  }

  return {
    group,
    anchors,
    lights,
    update,
    setQuality,
    setLighting,
    setGateState,
    destroyPillar,
    getStats,
    dispose,
  };
}
