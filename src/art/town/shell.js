import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const PALETTE = {
  stoneLit: 0xc4cbcf,
  stoneMid: 0xaab4ba,
  stoneShade: 0x8e9da3,
  stoneCrevice: 0x5c6b73,
  groundBase: 0xa9b6ba,
  groundLight: 0xc2cdd0,
  groundWarm: 0xb8b9b4,
  groundCrack: 0x68767c,
  mossDark: 0x436836,
  mossMid: 0x5f8a4a,
  mossLight: 0x7aa860,
  mud: 0x7c857d,
  strataLight: 0x939a9e,
  strataBrown: 0x767068,
  strataDarkBrown: 0x54504a,
  strataTeal: 0x455e66,
  strataDeep: 0x23353d,
  iron: 0x2c3236,
  plaqueBronze: 0x5a6b64,
  plaqueFrame: 0x98a2a8,
  tealGlow: 0x6fe0f0,
  tealBright: 0xb8f8ff,
  warmGlow: 0xffc27a
};

const DEFAULT_AO_PADS = [
  { id: 'summoning_room', x: 30, z: 4, r: 12, strength: 0.36 },
  { id: 'synthesis_chamber', x: 0, z: -32, r: 10, strength: 0.34 },
  { id: 'landing_area', x: 20, z: 26, r: 14, strength: 0.26 },
  { id: 'town_square', x: 14, z: -8, r: 12, strength: 0.16 },
  { id: 'rift', x: 27, z: -27, r: 8, strength: 0.38 },
  { id: 'armory', x: -6, z: -20, r: 8, strength: 0.34 },
  { id: 'residences', x: -26, z: -4, r: 15, strength: 0.30 },
  { id: 'training', x: -24, z: 20, r: 13, strength: 0.26 },
  { id: 'mess_hall', x: 8, z: 38, r: 10, strength: 0.32 }
];

const QUALITY_PRESETS = {
  high: {
    terrainSegs: 120,
    wallArchSegs: 7,
    pillarCapSegs: 4,
    vineLeavesPerMeter: 3.2,
    cliffRadialSegs: 72,
    cliffRingSegs: 4,
    undersideRadSegs: 52,
    undersideHeightSegs: 16,
    undersideChunks: 44,
    undersideSpikes: 26,
    rootCount: 48,
    cloudSheets: 4,
    leafCount: 120,
    glintCount: 200,
    starCount: 150
  },
  medium: {
    terrainSegs: 92,
    wallArchSegs: 5,
    pillarCapSegs: 4,
    vineLeavesPerMeter: 2.0,
    cliffRadialSegs: 52,
    cliffRingSegs: 3,
    undersideRadSegs: 36,
    undersideHeightSegs: 11,
    undersideChunks: 28,
    undersideSpikes: 16,
    rootCount: 30,
    cloudSheets: 3,
    leafCount: 72,
    glintCount: 120,
    starCount: 110
  },
  low: {
    terrainSegs: 64,
    wallArchSegs: 4,
    pillarCapSegs: 4,
    vineLeavesPerMeter: 1.1,
    cliffRadialSegs: 36,
    cliffRingSegs: 2,
    undersideRadSegs: 24,
    undersideHeightSegs: 8,
    undersideChunks: 14,
    undersideSpikes: 8,
    rootCount: 16,
    cloudSheets: 3,
    leafCount: 36,
    glintCount: 60,
    starCount: 75
  }
};

const TIME_KEYFRAMES = [
  {
    t: 0.00, // Early morning mist
    skyHorizon: 0xdcefee,
    skyHorizonBand: 0xc8e4e6,
    skyTop: 0x8fc4cf,
    sunColor: 0xfff1d6,
    sunIntensity: 1.0,
    sunDir: [-0.72, 0.36, -0.59],
    sunAlpha: 1.0,
    moonAlpha: 0.0,
    ambientColor: 0xcfe6ea,
    ambientIntensity: 0.80,
    hemiSky: 0xcfe9ee,
    hemiGround: 0x6c7d78,
    hemiIntensity: 0.80,
    fogColor: 0xcfe3e4,
    fogNear: 60.0,
    fogFar: 220.0,
    exposure: 1.18,
    windowGlow: 0.0,
    lampGlow: 0.1,
    starsAlpha: 0.0,
    leafGlow: 0.0,
    cloudTint: 0xe8f6f6,
    cloudOpacity: 0.34
  },
  {
    t: 0.30, // Bright midday
    skyHorizon: 0xbfe3ea,
    skyHorizonBand: 0x9fd2e0,
    skyTop: 0x6fb2c8,
    sunColor: 0xffffff,
    sunIntensity: 1.30,
    sunDir: [-0.24, 0.90, -0.36],
    sunAlpha: 1.0,
    moonAlpha: 0.0,
    ambientColor: 0xdff1f2,
    ambientIntensity: 0.90,
    hemiSky: 0xdbf0f5,
    hemiGround: 0x7c8c88,
    hemiIntensity: 0.85,
    fogColor: 0xbfe0e4,
    fogNear: 85.0,
    fogFar: 260.0,
    exposure: 1.25,
    windowGlow: 0.0,
    lampGlow: 0.0,
    starsAlpha: 0.0,
    leafGlow: 0.0,
    cloudTint: 0xf4fbfd,
    cloudOpacity: 0.30
  },
  {
    t: 0.62, // Dusk
    skyHorizon: 0xe0a8b8,
    skyHorizonBand: 0x5a6fa0,
    skyTop: 0x23305a,
    sunColor: 0xffb98a,
    sunIntensity: 0.90,
    sunDir: [0.68, 0.32, -0.66],
    sunAlpha: 0.85,
    moonAlpha: 0.35,
    ambientColor: 0x9a9fc0,
    ambientIntensity: 0.70,
    hemiSky: 0x9ea8cc,
    hemiGround: 0x484d5e,
    hemiIntensity: 0.70,
    fogColor: 0x4a5a82,
    fogNear: 68.0,
    fogFar: 235.0,
    exposure: 1.15,
    windowGlow: 0.70,
    lampGlow: 0.80,
    starsAlpha: 0.45,
    leafGlow: 0.45,
    cloudTint: 0x8b8eb8,
    cloudOpacity: 0.32
  },
  {
    t: 0.78, // Night
    skyHorizon: 0x1d4a55,
    skyHorizonBand: 0x133540,
    skyTop: 0x07161c,
    sunColor: 0xbfe4ff,
    sunIntensity: 1.00,
    sunDir: [-0.46, 0.68, -0.57],
    sunAlpha: 0.0,
    moonAlpha: 1.0,
    ambientColor: 0x6f94a8,
    ambientIntensity: 0.60,
    hemiSky: 0x8fc4d6,
    hemiGround: 0x2f3f44,
    hemiIntensity: 0.65,
    fogColor: 0x1d4a55,
    fogNear: 70.0,
    fogFar: 240.0,
    exposure: 1.15,
    windowGlow: 1.0,
    lampGlow: 1.0,
    starsAlpha: 1.0,
    leafGlow: 1.0,
    cloudTint: 0x427888,
    cloudOpacity: 0.28
  },
  {
    t: 0.95, // Deep night (slightly darker than night, still clearly readable)
    skyHorizon: 0x173e48,
    skyHorizonBand: 0x0f2c36,
    skyTop: 0x051218,
    sunColor: 0xb4dcf8,
    sunIntensity: 0.92,
    sunDir: [-0.35, 0.74, -0.57],
    sunAlpha: 0.0,
    moonAlpha: 1.0,
    ambientColor: 0x66899c,
    ambientIntensity: 0.56,
    hemiSky: 0x82b8ca,
    hemiGround: 0x2b3a40,
    hemiIntensity: 0.62,
    fogColor: 0x18404a,
    fogNear: 70.0,
    fogFar: 240.0,
    exposure: 1.12,
    windowGlow: 1.0,
    lampGlow: 1.0,
    starsAlpha: 1.0,
    leafGlow: 1.0,
    cloudTint: 0x396b7a,
    cloudOpacity: 0.26
  }
];

function createRng(seed = 1337) {
  let s = (seed >>> 0) || 1337;
  return function rand() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2D(x, z, seed = 1337) {
  const n = Math.sin(x * 127.1 + z * 311.7 + seed * 0.13) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise2D(x, z, seed = 1337) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = hash2D(ix, iz, seed);
  const b = hash2D(ix + 1, iz, seed);
  const c = hash2D(ix, iz + 1, seed);
  const d = hash2D(ix + 1, iz + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm2D(x, z, seed = 1337, octaves = 3) {
  let value = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    value += amp * valueNoise2D(x * freq, z * freq, seed + i * 19);
    freq *= 2.02;
    amp *= 0.5;
  }
  return value;
}

function createToonGradientTexture() {
  const data = new Uint8Array([
    132, 132, 132, 255,
    178, 178, 178, 255,
    222, 222, 222, 255,
    255, 255, 255, 255
  ]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function createStoneCanvasTexture(seed) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rng = createRng(seed + 101);

  ctx.fillStyle = '#e6eaec';
  ctx.fillRect(0, 0, 512, 512);

  // Varied rectangular flagstone grid (unequal row heights & varied slab widths)
  const rowY = [0, 56, 124, 184, 256, 316, 388, 448, 512];
  const rows = rowY.length - 1;

  for (let r = 0; r < rows; r++) {
    const y0 = rowY[r];
    const h = rowY[r + 1] - y0;
    const cols = 4 + (r % 3);
    const baseW = 512 / cols;
    const rowShift = Math.floor(hash2D(r, 9, seed + 3) * baseW);

    const jointsX = [0];
    for (let c = 1; c < cols; c++) {
      const jitter = Math.floor((hash2D(c, r, seed + 11) - 0.5) * (baseW * 0.28));
      const jx = Math.max(jointsX[jointsX.length - 1] + 28, Math.min(484, Math.floor(c * baseW + jitter)));
      jointsX.push(jx);
    }
    jointsX.push(512);

    for (let c = 0; c < jointsX.length - 1; c++) {
      const xStart = jointsX[c];
      const w = jointsX[c + 1] - xStart;

      const toneBase = 212 + Math.floor((hash2D(c + 13, r, seed + 7) - 0.5) * 42);
      const warmShift = Math.floor((hash2D(c, r + 23, seed + 19) - 0.42) * 14);
      const cr = Math.min(252, Math.max(176, toneBase + warmShift));
      const cg = Math.min(253, Math.max(180, toneBase + 2));
      const cb = Math.min(255, Math.max(182, toneBase + 3 - Math.floor(warmShift * 0.5)));

      for (const wrapOffset of [-512, 0, 512]) {
        const bx = xStart + rowShift + wrapOffset;
        if (bx + w < 0 || bx > 512) continue;

        ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
        ctx.fillRect(bx, y0, w, h);

        // Worn brighter stone center
        const cx = bx + w * 0.5;
        const cy = y0 + h * 0.5;
        const rad = Math.max(w, h) * 0.55;
        const grad = ctx.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
        grad.addColorStop(1, 'rgba(58, 66, 70, 0.18)');
        ctx.fillStyle = grad;
        ctx.fillRect(bx + 2, y0 + 2, w - 4, h - 4);

        // Crisp sunlit/moonlit top-left bevel
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(bx + 2, y0 + h - 2);
        ctx.lineTo(bx + 2, y0 + 2);
        ctx.lineTo(bx + w - 2, y0 + 2);
        ctx.stroke();

        // Thin dark rectangular mortar joint around each slab
        ctx.strokeStyle = 'rgba(42, 50, 54, 0.84)';
        ctx.lineWidth = 2.4;
        ctx.strokeRect(bx + 0.5, y0 + 0.5, w - 1.0, h - 1.0);
      }
    }
  }

  // Fine stone surface grain
  for (let i = 0; i < 1600; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const rad = 1.2 + rng() * 7.5;
    ctx.fillStyle = rng() > 0.48 ? 'rgba(72, 80, 84, 0.07)' : 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Occasional hairline cracks inside individual slabs
  ctx.strokeStyle = 'rgba(44, 52, 56, 0.58)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 28; i++) {
    let cx = rng() * 512;
    let cy = rng() * 512;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 3; s++) {
      cx += (rng() - 0.5) * 16;
      cy += (rng() - 0.2) * 14;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSoftCloudCanvasTexture(seed) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(512, 512);
  const data = imgData.data;

  // Radially fading wispy cloud sheet texture (zero hard edges)
  for (let y = 0; y < 512; y++) {
    const ny = (y / 512) * 2.0 - 1.0;
    for (let x = 0; x < 512; x++) {
      const nx = (x / 512) * 2.0 - 1.0;
      const r = Math.hypot(nx, ny);
      const radialMask = Math.max(0, 1.0 - Math.pow(r, 1.65));

      const n1 = fbm2D(nx * 2.8 + 3.1, ny * 2.8 + 5.4, seed + 31, 4);
      const n2 = fbm2D(nx * 5.6 - 1.7, ny * 5.6 + 2.2, seed + 67, 3);
      const wisp = Math.max(0, Math.min(1, (n1 * 0.68 + n2 * 0.32 - 0.26) * 1.45));
      const alpha = Math.pow(wisp * radialMask, 1.25);

      const lum = Math.min(255, Math.floor((0.82 + wisp * 0.18) * 255));
      const idx = (y * 512 + x) * 4;
      data[idx] = lum;
      data[idx + 1] = lum;
      data[idx + 2] = lum;
      data[idx + 3] = Math.min(255, Math.floor(alpha * 255));
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

function ensureNonIndexedColoredGeometry(geom, baseColorHex, colorFn) {
  const nonIndexed = geom.index ? geom.toNonIndexed() : geom.clone();
  if (geom !== nonIndexed) geom.dispose();

  if (!nonIndexed.attributes.normal) {
    nonIndexed.computeVertexNormals();
  }

  const pos = nonIndexed.attributes.position;
  const norm = nonIndexed.attributes.normal;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color(baseColorHex);
  const tempColor = new THREE.Color();
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    v.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(norm, i);
    tempColor.copy(c);
    if (colorFn) {
      colorFn(tempColor, v, n, i);
    }
    colors[i * 3] = tempColor.r;
    colors[i * 3 + 1] = tempColor.g;
    colors[i * 3 + 2] = tempColor.b;
  }

  nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  if (!nonIndexed.attributes.uv) {
    const uvs = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(pos, i);
      n.fromBufferAttribute(norm, i);
      if (Math.abs(n.y) > 0.7) {
        uvs[i * 2] = v.x * 0.22;
        uvs[i * 2 + 1] = v.z * 0.22;
      } else {
        uvs[i * 2] = (v.x + v.z) * 0.22;
        uvs[i * 2 + 1] = v.y * 0.22;
      }
    }
    nonIndexed.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }

  return nonIndexed;
}

function getQuadrantIndex(x, z) {
  if (x >= 0 && z < 0) return 0; // NE
  if (x < 0 && z < 0) return 1;  // NW
  if (x < 0 && z >= 0) return 2; // SW
  return 3;                      // SE
}

function getDodecagonSignedDistance(x, z, apothem) {
  let maxProj = -Infinity;
  for (let k = 0; k < 12; k++) {
    const theta = (k + 0.5) * (Math.PI / 6);
    const proj = x * Math.cos(theta) + z * Math.sin(theta);
    if (proj > maxProj) maxProj = proj;
  }
  return maxProj - apothem;
}

function parseInitialTimeOfDay(timeParam) {
  if (typeof timeParam === 'number' && Number.isFinite(timeParam)) {
    return ((timeParam % 1) + 1) % 1;
  }
  if (timeParam === 'morning') return 0.00;
  if (timeParam === 'noon' || timeParam === 'day') return 0.30;
  if (timeParam === 'dusk') return 0.62;
  if (timeParam === 'deep_night') return 0.95;
  return 0.78; // Default 'night'
}

export function buildTownShell(ctx = {}) {
  const seed = Number.isInteger(ctx.seed) ? ctx.seed : 1337;
  let currentTimeOfDay = parseInitialTimeOfDay(ctx.time);
  let currentQuality = QUALITY_PRESETS[ctx.quality] ? ctx.quality : 'high';

  const defaultGroundY = (x, z) => {
    const r = Math.hypot(x, z);
    const gentleRoll = Math.sin(x * 0.07) * Math.cos(z * 0.07) * 0.28;
    const centerFlat = Math.min(1, r / 18);
    return gentleRoll * centerFlat;
  };
  const getGroundY = typeof ctx.getGroundY === 'function' ? ctx.getGroundY : defaultGroundY;

  const layout = ctx.layout || {};
  const wallSpec = {
    sides: 12,
    apothem: layout.wall?.apothem ?? 46.0,
    vertexRadius: layout.wall?.vertexRadius ?? 47.62,
    height: layout.wall?.height ?? 10.0,
    thickness: layout.wall?.thickness ?? 2.5,
    pillarWidth: 3.0,
    pillarHeight: 13.0,
    pillarCapRadius: 2.3,
    pillarCapHeight: 1.5,
    pilasterSpacing: 6.0,
    pilasterWidth: 2.85,
    pilasterHeight: 10.5,
    pilasterDepth: 0.7,
    riftTargetX: layout.rift?.x ?? 27.0,
    riftTargetZ: layout.rift?.z ?? -27.0,
    riftWidth: layout.rift?.openingWidth ?? 6.5,
    riftHeight: layout.rift?.openingHeight ?? 10.0
  };

  const aoPads = Array.isArray(layout.aoPads) && layout.aoPads.length > 0
    ? layout.aoPads
    : DEFAULT_AO_PADS;

  const rootGroup = new THREE.Group();
  rootGroup.name = 'NiflheimrTownShell';

  const contentGroup = new THREE.Group();
  contentGroup.name = 'ShellContent';
  rootGroup.add(contentGroup);

  // Strictly 2 procedural 512x512 CanvasTextures + 1 4-step Toon DataTexture
  const toonGradTex = createToonGradientTexture();
  const stoneTex = createStoneCanvasTexture(seed);
  const cloudTex = createSoftCloudCanvasTexture(seed);

  // Shared materials (10 materials total, well under the 12-material limit)
  const stoneMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    map: stoneTex,
    gradientMap: toonGradTex,
    vertexColors: true
  });

  const terrainMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    map: stoneTex,
    gradientMap: toonGradTex,
    vertexColors: true
  });

  // Procedural strata rock material (no ashlar brick map on the natural rock underside)
  const undersideMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    gradientMap: toonGradTex,
    vertexColors: true
  });

  const foliageMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    gradientMap: toonGradTex,
    vertexColors: true,
    emissive: new THREE.Color(0x16444a),
    emissiveIntensity: 0.16,
    side: THREE.DoubleSide
  });

  const trimEmissiveMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    gradientMap: toonGradTex,
    vertexColors: true
  });

  const skyMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false
  });

  const celestialDiscMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: false
  });

  const cloudSheetMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: cloudTex,
    alphaMap: cloudTex,
    transparent: true,
    opacity: 0.28,
    blending: THREE.NormalBlending,
    vertexColors: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false
  });

  const leafMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
    fog: false
  });

  const glintPointMat = new THREE.PointsMaterial({
    size: 0.28,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });

  const sharedMaterials = [
    stoneMat,
    terrainMat,
    undersideMat,
    foliageMat,
    trimEmissiveMat,
    skyMat,
    celestialDiscMat,
    cloudSheetMat,
    leafMat,
    glintPointMat
  ];

  const colliders = [];
  const doors = [];
  const lights = [];
  const anchors = {};

  const bakedKeyDir = new THREE.Vector3(-0.42, 0.74, -0.52).normalize();

  const lightingState = {
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

  anchors.lighting = lightingState;
  anchors.islandCenter = new THREE.Vector3(0, getGroundY(0, 0), 0);

  const riftAngle = Math.atan2(wallSpec.riftTargetZ, wallSpec.riftTargetX);
  let riftSideIndex = 0;
  let bestAngleDiff = Infinity;
  for (let k = 0; k < 12; k++) {
    const midAngle = (k + 0.5) * (Math.PI / 6);
    const diff = Math.abs(Math.atan2(Math.sin(midAngle - riftAngle), Math.cos(midAngle - riftAngle)));
    if (diff < bestAngleDiff) {
      bestAngleDiff = diff;
      riftSideIndex = k;
    }
  }

  function buildSpatialMetadata() {
    colliders.length = 0;
    doors.length = 0;
    lights.length = 0;

    const sideLength = 2 * wallSpec.apothem * Math.tan(Math.PI / 12);

    for (let k = 0; k < 12; k++) {
      const vAngle = k * (Math.PI / 6);
      const vx = Math.cos(vAngle) * wallSpec.vertexRadius;
      const vz = Math.sin(vAngle) * wallSpec.vertexRadius;

      colliders.push({
        type: 'circle',
        x: vx,
        z: vz,
        r: wallSpec.pillarWidth * 0.68
      });

      const midAngle = (k + 0.5) * (Math.PI / 6);
      const nx = Math.cos(midAngle);
      const nz = Math.sin(midAngle);
      const tx = -nz;
      const tz = nx;
      const cx = nx * wallSpec.apothem;
      const cz = nz * wallSpec.apothem;
      const rotY = Math.atan2(nx, nz);

      if (k === riftSideIndex) {
        const wingWidth = (sideLength - wallSpec.riftWidth) * 0.5;
        const offset = (wallSpec.riftWidth + wingWidth) * 0.5;
        for (const sign of [-1, 1]) {
          colliders.push({
            type: 'box',
            x: cx + tx * offset * sign,
            z: cz + tz * offset * sign,
            w: wingWidth,
            d: wallSpec.thickness,
            rotY
          });
        }

        const gateGroundY = getGroundY(cx, cz);
        const gatePos = new THREE.Vector3(cx, gateGroundY, cz);
        const inward = new THREE.Vector3(-nx, 0, -nz).normalize();

        const riftDoorId = layout.doors?.rift?.id || 'space_time_rift';
        doors.push({
          id: riftDoorId,
          position: gatePos.clone(),
          outward: inward.clone()
        });

        anchors.riftGate = gatePos.clone();
        anchors.sign_space_time_rift = gatePos
          .clone()
          .addScaledVector(inward, 2.2)
          .addScaledVector(new THREE.Vector3(tx, 0, tz), -4.2);

        lights.push({
          position: new THREE.Vector3(cx - nx * 1.4, gateGroundY + 5.5, cz - nz * 1.4),
          color: PALETTE.tealGlow,
          intensity: 1.35,
          distance: 18.0
        });
      } else {
        colliders.push({
          type: 'box',
          x: cx,
          z: cz,
          w: sideLength,
          d: wallSpec.thickness,
          rotY
        });

        if (k % 3 === 0) {
          const wallY = getGroundY(cx, cz);
          lights.push({
            position: new THREE.Vector3(cx - nx * 1.8, wallY + 4.2, cz - nz * 1.8),
            color: PALETTE.warmGlow,
            intensity: 0.95,
            distance: 14.0
          });
        }
      }
    }
  }

  buildSpatialMetadata();

  let disposableGeometries = [];
  let skyDomeMesh = null;
  let celestialMesh = null;
  let sunVertCount = 0;
  let sunBasePositions = null;
  let moonBasePositions = null;
  let sunBaseColors = null;
  let moonBaseColors = null;
  let cloudSheetMesh = null;
  let leafInstancedMesh = null;
  let leafData = [];
  let glintPoints = null;
  let glintBasePositions = null;
  let glintBaseColors = null;
  let glintPhases = null;
  let starBaseColors = null;
  let elapsedTime = 0;
  let currentStats = { meshes: 0, triangles: 0, drawCallsEstimate: 0 };

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

  function clearBuiltContent() {
    while (contentGroup.children.length > 0) {
      contentGroup.remove(contentGroup.children[0]);
    }
    for (let i = 0; i < disposableGeometries.length; i++) {
      disposableGeometries[i].dispose();
    }
    disposableGeometries = [];
    skyDomeMesh = null;
    celestialMesh = null;
    sunVertCount = 0;
    sunBasePositions = null;
    moonBasePositions = null;
    sunBaseColors = null;
    moonBaseColors = null;
    cloudSheetMesh = null;
    leafInstancedMesh = null;
    leafData = [];
    glintPoints = null;
    glintBasePositions = null;
    glintBaseColors = null;
    glintPhases = null;
    starBaseColors = null;
  }

  // Helper: Thin tapered vine/root strip (width 0.15 to 0.40, length 2 to 8) starting INSIDE rock/wall, curving smoothly
  function createTaperedVineGeometry(startPos, outDir, width, length, segsY, vineSeed) {
    const clampedW = Math.min(0.40, Math.max(0.15, width));
    const clampedL = Math.min(8.0, Math.max(2.0, length));
    const geom = new THREE.PlaneGeometry(clampedW, clampedL, 1, segsY);
    const pos = geom.attributes.position;
    const cDark = new THREE.Color(PALETTE.mossDark).multiplyScalar(0.82);
    const cTip = new THREE.Color(PALETTE.mossLight);
    const colors = new Float32Array(pos.count * 3);

    const forward = new THREE.Vector3(outDir?.x || 0, 0, outDir?.z || 0);
    if (forward.lengthSq() < 0.001) forward.set(0, 0, 1); else forward.normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);

    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const ly = pos.getY(i);
      const frac = Math.max(0, Math.min(1, 0.5 - ly / clampedL)); // 0 at embedded root start, 1 at hanging tip

      // Taper smoothly to a fine tip (never a wide rectangle)
      const halfSpan = lx * (1.0 - Math.pow(frac, 0.85) * 0.90);
      const swaySide = Math.sin(frac * Math.PI * 2.1 + vineSeed) * 0.22 * frac;
      // Start embedded -0.32m inside the rock/wall, arch out slightly, then hang down
      const curveOut = -0.32 * (1.0 - Math.min(1, frac * 2.5)) + Math.sin(frac * Math.PI * 0.9) * 0.35;

      const wx = startPos.x + right.x * (halfSpan + swaySide) + forward.x * curveOut;
      const wy = startPos.y - frac * clampedL;
      const wz = startPos.z + right.z * (halfSpan + swaySide) + forward.z * curveOut;
      pos.setXYZ(i, wx, wy, wz);

      _colorA.copy(cDark).lerp(cTip, Math.pow(frac, 0.9));
      colors[i * 3] = _colorA.r;
      colors[i * 3 + 1] = _colorA.g;
      colors[i * 3 + 2] = _colorA.b;
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const nonIdx = geom.index ? geom.toNonIndexed() : geom;
    if (nonIdx !== geom) geom.dispose();
    nonIdx.computeVertexNormals();
    return nonIdx;
  }

  function buildTerrainMesh(preset) {
    const segs = preset.terrainSegs;
    const size = 94.0;
    const geom = new THREE.PlaneGeometry(size, size, segs, segs);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const uv = geom.attributes.uv;
    const count = pos.count;

    // Keep terrain strictly within the inner wall & cliff rim so NO flat quads ever poke outside the wall
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

      // Direct world-coordinate rectangular UV mapping (zero radial rings or cumulative stretching)
      uv.setXY(i, (x + 48.0) * 0.22, (z + 48.0) * 0.22);
    }

    geom.computeVertexNormals();
    const norm = geom.attributes.normal;

    // Warm-neutral pale gray-blue flagstones (0xa9b6ba) with rectangular patch variation & green moss in wall joints
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

      // Rectangular grid & large organic patch variation (no concentric or sin*cos ring patterns)
      const patchNoise = fbm2D(x * 0.065 + 3.7, z * 0.065 - 2.1, seed + 5, 3);
      const detailNoise = fbm2D(x * 0.19 - 8.4, z * 0.19 + 5.2, seed + 17, 2);
      const slabHash = hash2D(Math.floor(x * 0.44), Math.floor(z * 0.44), seed + 23);

      cTemp.copy(cGroundBase).lerp(cGroundWarm, 0.35 + slabHash * 0.45);
      cTemp.lerp(cGroundLight, patchNoise * 0.48);
      if (slabHash < 0.22) {
        cTemp.lerp(cGroundDark, 0.18);
      }

      const keyDot = Math.max(0, nx * bakedKeyDir.x + ny * bakedKeyDir.y + nz * bakedKeyDir.z);
      cTemp.multiplyScalar(0.95 + keyDot * 0.12);

      // Green moss in joints near slopes and damp pockets
      const mossMask = Math.max(0, Math.min(1, (detailNoise - 0.58) * 3.4 + (1.0 - ny) * 1.4));
      if (mossMask > 0.02) {
        _colorA.copy(cMossMid).lerp(cMossLight, slabHash * 0.6);
        cTemp.lerp(_colorA, Math.min(0.78, mossMask * 0.72));
      }

      // Darker stone and green moss near walls
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

      // Darker stone & joint moss near building footprints and stairs from layout
      let aoFactor = 1.0;
      for (let p = 0; p < aoPads.length; p++) {
        const pad = aoPads[p];
        const dist = Math.hypot(x - pad.x, z - pad.z);
        if (dist < pad.r) {
          const t = 1.0 - dist / pad.r;
          const smooth = t * t * (3 - 2 * t);
          const strength = pad.strength ?? 0.30;
          aoFactor *= (1.0 - smooth * strength);

          // Subtle moss in flagstone joints around building bases & steps
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

  function buildWallAndCliffQuadrants(preset) {
    const stoneQuadrants = [[], [], [], []];
    const foliageGeoms = [];
    const trimGeoms = [];

    const sideLength = 2 * wallSpec.apothem * Math.tan(Math.PI / 12);
    const baseDepth = 2.6;
    const wallH = wallSpec.height;
    const wallT = wallSpec.thickness;

    const cStoneLit = new THREE.Color(PALETTE.stoneLit);
    const cStoneMid = new THREE.Color(PALETTE.stoneMid);
    const cStoneShade = new THREE.Color(PALETTE.stoneShade);
    const cCrevice = new THREE.Color(PALETTE.stoneCrevice);
    const cMossDark = new THREE.Color(PALETTE.mossDark);
    const cMossMid = new THREE.Color(PALETTE.mossMid);
    const cMossLight = new THREE.Color(PALETTE.mossLight);

    const stoneVertexColorizer = (color, v, n, vertIdx, aoBoost = 0) => {
      const worldNoise = fbm2D(v.x * 0.15, v.z * 0.15 + v.y * 0.18, seed + 29, 2);
      const crackNoise = fbm2D(v.x * 0.42 + 5.1, v.y * 0.42 + v.z * 0.42, seed + 43, 2);
      const blockHash = hash2D(Math.floor(v.x * 1.1), Math.floor(v.y * 1.1 + v.z * 1.1), seed + 41);

      const keyDot = Math.max(0, n.x * bakedKeyDir.x + n.y * bakedKeyDir.y + n.z * bakedKeyDir.z);
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
        _colorA.copy(cMossMid).lerp(cMossLight, blockHash * 0.6);
        color.lerp(_colorA, crackMoss * 0.80);
      }

      if (v.y < 3.0) {
        const baseFrac = Math.max(0, Math.min(1, (3.0 - v.y) / 3.0));
        const mossHeight = 1.65 + worldNoise * 1.45;
        if (v.y < mossHeight) {
          const mFrac = Math.max(0, Math.min(1, (mossHeight - v.y) / mossHeight));
          _colorA.copy(cMossMid).lerp(cMossLight, worldNoise * 0.7);
          color.lerp(_colorA, mFrac * 0.84);
        }
        color.multiplyScalar(1.0 - baseFrac * 0.26);
      }

      if (n.y > 0.55 && worldNoise > 0.32) {
        _colorA.copy(cMossMid).lerp(cMossLight, Math.min(1, (worldNoise - 0.32) * 1.7));
        color.lerp(_colorA, 0.68);
      }

      if (aoBoost > 0) {
        color.lerp(cCrevice, Math.min(1, aoBoost * 0.72));
        color.multiplyScalar(1.0 - aoBoost * 0.34);
      }
    };

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

    // Wall hanging vine: starts embedded inside wall masonry, width <= 0.35m, length 2 to 8m
    function addHangingVine(originX, originY, originZ, faceAngleY, length, spreadW, vineSeed, leavesPerMeter) {
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
      const colors = [];

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
          _colorA.copy(cMossDark).lerp(cMossMid, 0.45 + shade * 0.55);
          _colorB.copy(cMossMid).lerp(cMossLight, 0.55 + frac * 0.45);

          for (let v = 0; v < 6; v++) {
            const cLeaf = (v === 1 || v === 4 || v === 5) ? _colorB : _colorA;
            colors.push(cLeaf.r, cLeaf.g, cLeaf.b);
          }
        }
      }

      if (positions.length > 0) {
        const leafClusterGeom = new THREE.BufferGeometry();
        leafClusterGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        leafClusterGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        leafClusterGeom.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((positions.length / 3) * 2), 2));
        leafClusterGeom.computeVertexNormals();
        foliageGeoms.push(leafClusterGeom);
      }
    }

    function addMossStreak(originX, originY, originZ, faceAngleY, width, height, streakSeed) {
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

    // 1. Build 12 Corner Pillars
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

    // 2. Build 12 Wall Panels, Stepped Ledges, Pilasters, Arched Alcoves, Grates, Plaques & Rift Opening
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

        const keystoneGeom = new THREE.BoxGeometry(0.68, 1.18, wallT + 1.12);
        placeTrimPart(keystoneGeom, 0, wallH + 0.45, 0, PALETTE.tealGlow, (c, v) => {
          c.multiplyScalar(0.88 + 0.12 * Math.sin(v.y * 2.0));
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

    // 4. Clean Dodecagon-Conforming Cliff Ledge Ring (follows the 12 wall sides tightly, no outward slabs)
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
        // Follow the 12-sided wall contour on the inner edge and transition to a craggy rim 3.8m outside the wall
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
        const keyDot = Math.max(0, n.x * bakedKeyDir.x + n.y * bakedKeyDir.y + n.z * bakedKeyDir.z);
        if (n.y > 0.50) {
          c.copy(cMossMid).lerp(cMossLight, mNoise * 0.65 + keyDot * 0.35);
        } else {
          c.copy(cStoneShade).lerp(_colorB.setHex(PALETTE.strataBrown), 0.55);
          c.multiplyScalar(0.80 + keyDot * 0.25);
        }
      });
      stoneQuadrants[quadIdx].push(coloredCliff);
    }

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
  }

  function buildJaggedIslandUnderside(preset) {
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

    // Helper: Evaluate exact rock surface radius at (angle, y) so chunks and roots embed INSIDE the rock
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

    // Horizontal strata bands of gray-brown and dark teal-gray; moss ONLY on upward-facing parts
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

      const keyDot = Math.max(0, n.x * bakedKeyDir.x + n.y * bakedKeyDir.y + n.z * bakedKeyDir.z);
      c.lerp(cStrataLight, Math.pow(keyDot, 1.1) * 0.32 * (1.0 - dFrac * 0.5));

      // Moss strictly on upward-facing rock shelves (n.y > 0.48), never on vertical or downward faces
      if (n.y > 0.48 && dFrac < 0.52) {
        const mBlend = Math.min(1, (n.y - 0.48) * 2.4);
        _colorA.copy(cMossMid).lerp(cMossLight, keyDot * 0.7);
        c.lerp(_colorA, mBlend * 0.85);
      }

      // Vertical crack darkening and deep point gradient to -60m
      const angle = Math.atan2(v.z, v.x);
      const crack = Math.pow(Math.abs(Math.sin(angle * 6.0 + v.y * 0.04)), 12.0);
      c.multiplyScalar(1.0 - crack * 0.40);
      c.lerp(cStrataDeep, Math.pow(dFrac, 1.18) * 0.84);
    };

    // 1. Jagged stepped inverted rock cone under the island
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

    // 2. Angular rock chunks and jutting strata ledges embedded deep into the core
    for (let c = 0; c < preset.undersideChunks; c++) {
      const tierFrac = 0.08 + (c / preset.undersideChunks) * 0.74;
      const angle = c * 2.39996 + (rng() - 0.5) * 0.30;
      const chunkY = -3.0 - tierFrac * depth;
      const surfaceR = getUndersideCoreRadius(angle, chunkY);

      const chunkW = 4.8 + (1.0 - tierFrac) * (5.2 + rng() * 4.5);
      const chunkH = 4.2 + rng() * 7.5;
      const chunkD = 4.2 + (1.0 - tierFrac) * (4.5 + rng() * 4.0);

      // Irregular angular crag geometry (tapered bottom, sloped irregular top so it never looks like a flat box)
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

      // Position inside the core surface (surfaceR - chunkD * 0.25) so the chunk is solidly rooted in the rock
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

    // 3. Stalactite-like rock spikes hanging under ledges and near the -60m apex
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

    // 4. Thin tapered hanging vines & roots (width 0.15 to 0.40, length 2 to 8) starting INSIDE the rock & cliff rim
    for (let r = 0; r < preset.rootCount; r++) {
      const fromRim = r < preset.rootCount * 0.58;
      const angle = (r / preset.rootCount) * Math.PI * 2 + (rng() - 0.5) * 0.12;
      const outDir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));

      let startY;
      let startR;
      if (fromRim) {
        const rimGround = getGroundY(Math.cos(angle) * 46.0, Math.sin(angle) * 46.0);
        startY = rimGround - 1.6 - rng() * 1.8;
        // Start slightly inside the rock rim radius so it emerges directly out of the cliff rock
        startR = getUndersideCoreRadius(angle, startY) - 0.35;
      } else {
        const dFrac = 0.12 + rng() * 0.48;
        startY = -4.0 - dFrac * depth;
        startR = Math.max(2.0, getUndersideCoreRadius(angle, startY) - 0.35);
      }

      const vineWidth = 0.15 + rng() * 0.25; // strictly 0.15 to 0.40m
      const vineLength = 2.2 + rng() * 5.8;  // strictly 2.0 to 8.0m
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

  function buildDistantSoftCloudSheets(preset) {
    const sheetSpecs = [
      { x: 0, y: -68.0, z: 0, size: 360.0, rotY: 0.2, brightness: 1.0 },
      { x: -75.0, y: -48.0, z: -85.0, size: 250.0, rotY: 1.1, brightness: 0.92 },
      { x: 85.0, y: -54.0, z: 70.0, size: 260.0, rotY: 2.3, brightness: 0.90 },
      { x: 25.0, y: -82.0, z: -60.0, size: 320.0, rotY: 3.7, brightness: 0.82 }
    ];

    const count = Math.min(preset.cloudSheets, sheetSpecs.length);
    const sheetGeoms = [];

    for (let i = 0; i < count; i++) {
      const sp = sheetSpecs[i];
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

    cloudSheetMesh = new THREE.Mesh(mergedSheets, cloudSheetMat);
    cloudSheetMesh.name = 'DistantSoftCloudSheets';
    cloudSheetMesh.renderOrder = 1;
    contentGroup.add(cloudSheetMesh);
  }

  function buildOpenSkyAndCelestialDiscs() {
    const domeRadius = 340.0;
    const rawDome = new THREE.SphereGeometry(domeRadius, 32, 18);
    const domeGeom = ensureNonIndexedColoredGeometry(rawDome, 0x1d4a55);
    disposableGeometries.push(domeGeom);

    skyDomeMesh = new THREE.Mesh(domeGeom, skyMat);
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

    sunVertCount = sunGeom.attributes.position.count;
    sunBasePositions = new Float32Array(sunGeom.attributes.position.array);
    sunBaseColors = new Float32Array(sunGeom.attributes.color.array);

    moonBasePositions = new Float32Array(moonGeom.attributes.position.array);
    moonBaseColors = new Float32Array(moonGeom.attributes.color.array);

    const combinedCelestialGeom = mergeGeometries([sunGeom, moonGeom], false);
    sunGeom.dispose();
    moonGeom.dispose();
    disposableGeometries.push(combinedCelestialGeom);

    celestialMesh = new THREE.Mesh(combinedCelestialGeom, celestialDiscMat);
    celestialMesh.name = 'SunAndMoonDiscs';
    celestialMesh.frustumCulled = false;
    contentGroup.add(celestialMesh);
  }

  function buildFloatingLeavesAndGlints(preset) {
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
    leafInstancedMesh = new THREE.InstancedMesh(ribbonGeom, leafMat, leafCount);
    leafInstancedMesh.name = 'FloatingTealRibbonLeaves';

    const cLeafA = new THREE.Color(PALETTE.tealGlow);
    const cLeafB = new THREE.Color(0x52d1e3);
    const cLeafC = new THREE.Color(PALETTE.tealBright);

    leafData = new Array(leafCount);
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
    glintBasePositions = new Float32Array(glintCount * 3);
    glintBaseColors = new Float32Array(glintCount * 3);
    glintPhases = new Float32Array(glintCount);
    starBaseColors = new Float32Array(starCount * 3);

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

    glintPoints = new THREE.Points(ptGeom, glintPointMat);
    glintPoints.name = 'FloatingGlintsAndStars';
    contentGroup.add(glintPoints);
  }

  function applyTimeVisuals() {
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
      _tempMat4.lookAt(sCenter, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
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
      _tempMat4.lookAt(mCenter, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
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

  function setTimeOfDay(t) {
    const normT = ((Number(t) || 0) % 1 + 1) % 1;
    currentTimeOfDay = normT;

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
    lightingState.hemi = {
      sky: lightingState.hemisphere.skyColor,
      ground: lightingState.hemisphere.groundColor,
      intensity: lightingState.hemisphere.intensity
    };

    applyTimeVisuals();
    return lightingState;
  }

  function getLighting() {
    return {
      ...lightingState,
      background: lightingState.background ?? lightingState.fog.color,
      skyTop: lightingState.skyTop ?? lightingState.sky.topColor,
      skyHorizon: lightingState.skyHorizon ?? lightingState.sky.horizonColor,
      hemi: lightingState.hemi ?? {
        sky: lightingState.hemisphere.skyColor,
        ground: lightingState.hemisphere.groundColor,
        intensity: lightingState.hemisphere.intensity
      }
    };
  }

  function computeModuleStats() {
    let meshes = 0;
    let triangles = 0;
    let drawCallsEstimate = 0;

    contentGroup.traverse((obj) => {
      if (obj.isMesh || obj.isInstancedMesh || obj.isPoints) {
        meshes++;
        drawCallsEstimate++;
        const geom = obj.geometry;
        if (geom && (obj.isMesh || obj.isInstancedMesh)) {
          const triCount = geom.index
            ? geom.index.count / 3
            : (geom.attributes.position ? geom.attributes.position.count / 3 : 0);
          const instances = obj.isInstancedMesh ? obj.count : 1;
          triangles += Math.round(triCount * instances);
        }
      }
    });

    currentStats = { meshes, triangles, drawCallsEstimate };
  }

  function rebuildForQuality(q) {
    currentQuality = QUALITY_PRESETS[q] ? q : 'high';
    const preset = QUALITY_PRESETS[currentQuality];

    clearBuiltContent();
    buildTerrainMesh(preset);
    buildWallAndCliffQuadrants(preset);
    buildJaggedIslandUnderside(preset);
    buildDistantSoftCloudSheets(preset);
    buildOpenSkyAndCelestialDiscs();
    buildFloatingLeavesAndGlints(preset);
    setTimeOfDay(currentTimeOfDay);
    computeModuleStats();
  }

  rebuildForQuality(currentQuality);

  function update(dt = 0.016) {
    const safeDt = Math.min(Math.max(dt, 0), 0.1);
    elapsedTime += safeDt;

    if (cloudSheetMesh) {
      cloudSheetMesh.rotation.y = elapsedTime * 0.004;
      cloudSheetMesh.position.x = Math.sin(elapsedTime * 0.12) * 2.5;
      cloudSheetMesh.position.z = Math.cos(elapsedTime * 0.10) * 2.5;
    }

    if (leafInstancedMesh && leafData.length > 0) {
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

  function setQuality(q) {
    if (q && QUALITY_PRESETS[q] && q !== currentQuality) {
      rebuildForQuality(q);
    }
  }

  function getStats() {
    return { ...currentStats };
  }

  function dispose() {
    clearBuiltContent();
    for (let i = 0; i < sharedMaterials.length; i++) {
      sharedMaterials[i].dispose();
    }
    toonGradTex.dispose();
    stoneTex.dispose();
    cloudTex.dispose();
  }

  return {
    group: rootGroup,
    colliders,
    doors,
    anchors,
    lights,
    setTimeOfDay,
    getLighting,
    update,
    setQuality,
    getStats,
    dispose
  };
}
