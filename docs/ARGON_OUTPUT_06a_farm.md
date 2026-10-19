```javascript
// src/art/floors/farm.js
// Procedural 3D floor art module for Floor 1: "The Sun-Bleached Farm"
// Self-contained Three.js r160 module following the Argon Floor Art Contract.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const DEFAULT_PALETTE = {
  wallLit: 0xc4cbcf,
  wallShade: 0x8e9da3,
  groundBase: 0xa9b6ba,
  groundDark: 0x68767c,
  moss: 0x5f8a4a,
  mossDark: 0x436836,
  ivy: 0x436836,
  plaster: 0xdfe3df,
  timber: 0x2b2623,
  slate: 0x4a5560,
  warmWindow: 0xffc27a,
  teal: 0x6fe0f0,
  portalBlue: 0x5ab4ff,
  forgeOrange: 0xff8a3a,
  sphereCyan: 0xa8f4ff,
  crimsonGlow: 0xff3a4a,
  gold: 0xd8b45a,
  dirt: 0xa89f8a,
  wood: 0x6a4a2e,
  stoneLit: 0xc4cbcf,
  stoneMid: 0xaab4ba,
  stoneShade: 0x8e9da3,
  stoneCrevice: 0x5c6b73,
  groundLight: 0xc2cdd0,
  groundWarm: 0xb8b9b4,
  groundCrack: 0x68767c,
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

const FARM_COLORS = {
  ochreLight: 0xd2be96,
  ochreBase: 0xb89f74,
  ochreRut: 0x8d7652,
  ochreDark: 0x6e5b3e,
  dryGrassLight: 0xc5b36e,
  dryGrassMid: 0x9e9252,
  dryGrassOlive: 0x767542,
  dryGrassDark: 0x575832,
  wheatGold: 0xd9b85b,
  hayBright: 0xd8b458,
  hayShade: 0x9e7d34,
  oliveLeafLight: 0x6d7d48,
  oliveLeafMid: 0x5b6b3a,
  oliveLeafDark: 0x3f4f2c,
  oliveSilver: 0x8b9674,
  cypressDark: 0x2f3e26,
  trunkBark: 0x584636,
  trunkDark: 0x3b2e23,
  marbleLit: 0xeae6dc,
  marbleMid: 0xd2ccc0,
  marbleShade: 0x9f998e,
  plasterWarm: 0xe6e1d6,
  plasterWeathered: 0xc4bca9,
  terracottaLit: 0xb45f42,
  terracottaMid: 0xa4553a,
  terracottaDark: 0x7c3b2a,
  woodWeathered: 0x78583c,
  woodDark: 0x4b3624,
  ironRust: 0x4a352d,
  goblinRed: 0x9e342b,
  goblinCream: 0xd4c5a9,
  goblinHide: 0x634b37,
  bone: 0xdcd5c4,
  outline: 0x14101c,
  shadowDecal: 0x241d15,
  amberFire: 0xff9d3b,
  lanternWarm: 0xffb066,
  waterDark: 0x1d2c30
};

const QUALITY_CONFIG = {
  high: {
    terrainSegX: 96,
    terrainSegZ: 140,
    grassCount: 2200,
    wheatCount: 900,
    stoneCount: 280,
    dustCount: 90,
    canopyLobes: 9,
    columnRadial: 12,
    baleRadial: 12,
    useOutlines: true
  },
  medium: {
    terrainSegX: 68,
    terrainSegZ: 96,
    grassCount: 1300,
    wheatCount: 540,
    stoneCount: 170,
    dustCount: 55,
    canopyLobes: 7,
    columnRadial: 10,
    baleRadial: 10,
    useOutlines: true
  },
  low: {
    terrainSegX: 44,
    terrainSegZ: 64,
    grassCount: 650,
    wheatCount: 260,
    stoneCount: 85,
    dustCount: 28,
    canopyLobes: 5,
    columnRadial: 8,
    baleRadial: 8,
    useOutlines: false
  }
};

function createRng(seed) {
  let a = (seed >>> 0) || 7932;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2D(x, z, seed = 7932) {
  const n = Math.sin(x * 127.1 + z * 311.7 + seed * 0.13) * 43758.5453;
  return n - Math.floor(n);
}

function valueNoise2D(x, z, seed = 7932) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2D(ix, iz, seed);
  const b = hash2D(ix + 1, iz, seed);
  const c = hash2D(ix, iz + 1, seed);
  const d = hash2D(ix + 1, iz + 1, seed);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm2D(x, z, seed = 7932) {
  let v = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < 3; i++) {
    v += amp * valueNoise2D(x * freq, z * freq, seed + i * 37);
    freq *= 2.07;
    amp *= 0.5;
  }
  return v;
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function distToSegment2D(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-6) {
    const ex = px - ax;
    const ez = pz - az;
    return { dist: Math.sqrt(ex * ex + ez * ez), t: 0, cx: ax, cz: az };
  }
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / lenSq, 0, 1);
  const cx = ax + t * dx;
  const cz = az + t * dz;
  const ex = px - cx;
  const ez = pz - cz;
  return { dist: Math.sqrt(ex * ex + ez * ez), t, cx, cz };
}

function distanceToPolyline(px, pz, polyline) {
  let bestDist = Infinity;
  let bestCx = 0;
  let bestCz = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    const res = distToSegment2D(px, pz, a.x, a.z, b.x, b.z);
    if (res.dist < bestDist) {
      bestDist = res.dist;
      bestCx = res.cx;
      bestCz = res.cz;
    }
  }
  return { dist: bestDist, cx: bestCx, cz: bestCz };
}

function ensureNonIndexedAndNormals(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.computeVertexNormals();
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}

function paintGeometry(geo, hexBase, hexTop = null, shadeFactor = 0.14, rng = null) {
  const g = ensureNonIndexedAndNormals(geo);
  const pos = g.attributes.position;
  const norm = g.attributes.normal;
  const count = pos.count;
  const colors = new Float32Array(count * 3);

  const cBase = new THREE.Color(hexBase);
  const cTop = hexTop !== null ? new THREE.Color(hexTop) : cBase.clone().offsetHSL(0, 0, 0.05);
  const cTmp = new THREE.Color();

  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < count; i++) {
    const y = pos.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const spanY = Math.max(0.001, maxY - minY);

  for (let i = 0; i < count; i++) {
    const y = pos.getY(i);
    const ny = norm ? norm.getY(i) : 1;
    const tY = clamp((y - minY) / spanY, 0, 1);
    cTmp.copy(cBase).lerp(cTop, tY);

    const ao = 0.85 + 0.15 * tY;
    const nLight = 1.0 + ny * shadeFactor;
    const jitter = rng ? (rng() - 0.5) * 0.04 : 0;

    colors[i * 3] = clamp(cTmp.r * ao * nLight + jitter, 0, 1);
    colors[i * 3 + 1] = clamp(cTmp.g * ao * nLight + jitter, 0, 1);
    colors[i * 3 + 2] = clamp(cTmp.b * ao * nLight + jitter, 0, 1);
  }

  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

function ensureUVs(geo, scale = 0.25) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.computeVertexNormals();
  const pos = g.attributes.position;
  const norm = g.attributes.normal;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    const nz = Math.abs(norm.getZ(i));
    if (ny >= nx && ny >= nz) {
      uvs[i * 2] = x * scale;
      uvs[i * 2 + 1] = z * scale;
    } else if (nx >= nz) {
      uvs[i * 2] = z * scale;
      uvs[i * 2 + 1] = y * scale;
    } else {
      uvs[i * 2] = x * scale;
      uvs[i * 2 + 1] = y * scale;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return g;
}

function paintTexturedGeometry(geo, hexBase, hexTop = null, shadeFactor = 0.14, rng = null, uvScale = 0.3) {
  const g = paintGeometry(geo, hexBase, hexTop, shadeFactor, rng);
  return ensureUVs(g, uvScale);
}

function createToonGradientTexture() {
  const data = new Uint8Array([
    118, 110, 104, 255,
    166, 158, 148, 255,
    218, 212, 202, 255,
    255, 252, 245, 255
  ]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function createCanvasTextures(seed) {
  const rng = createRng(seed ^ 0x45d9f3b);

  // Canvas Texture 1: 512x512 Sun-bleached ochre dirt / limestone grain
  const c1 = document.createElement('canvas');
  c1.width = 512;
  c1.height = 512;
  const ctx1 = c1.getContext('2d');
  ctx1.fillStyle = '#ebe6dc';
  ctx1.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4200; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const r = 1 + rng() * 6;
    const v = Math.floor(215 + (rng() - 0.5) * 48);
    ctx1.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
    ctx1.fillRect(x, y, r, r * (0.6 + rng() * 0.8));
  }
  ctx1.strokeStyle = 'rgba(165, 152, 132, 0.22)';
  ctx1.lineWidth = 1.5;
  for (let i = 0; i < 140; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    ctx1.beginPath();
    ctx1.moveTo(x, y);
    ctx1.lineTo(x + (rng() - 0.5) * 44, y + (rng() - 0.5) * 44);
    ctx1.stroke();
  }
  const groundTex = new THREE.CanvasTexture(c1);
  groundTex.wrapS = THREE.RepeatWrapping;
  groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.generateMipmaps = true;
  groundTex.needsUpdate = true;

  // Canvas Texture 2: 512x512 Weathered stone, plaster, wood & straw fibrous detail
  const c2 = document.createElement('canvas');
  c2.width = 512;
  c2.height = 512;
  const ctx2 = c2.getContext('2d');
  ctx2.fillStyle = '#f0ece4';
  ctx2.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 3600; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const w = 2 + rng() * 14;
    const h = 1 + rng() * 3;
    const v = Math.floor(220 + (rng() - 0.5) * 44);
    ctx2.fillStyle = `rgb(${v},${v - 3},${v - 7})`;
    ctx2.fillRect(x, y, w, h);
  }
  const detailTex = new THREE.CanvasTexture(c2);
  detailTex.wrapS = THREE.RepeatWrapping;
  detailTex.wrapT = THREE.RepeatWrapping;
  detailTex.generateMipmaps = true;
  detailTex.needsUpdate = true;

  return { groundTex, detailTex };
}

function buildOutlinedClone(geo, thickness = 0.032) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.computeVertexNormals();
  const pos = g.attributes.position;
  const norm = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) + norm.getX(i) * thickness,
      pos.getY(i) + norm.getY(i) * thickness,
      pos.getZ(i) + norm.getZ(i) * thickness
    );
  }
  if (g.attributes.color) g.deleteAttribute('color');
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}

export function buildFarmFloorArt(ctx = {}) {
  const layout = ctx.layout || {};
  const seed = (ctx.seed ?? layout.seed ?? 7932) | 0;
  const palette = { ...DEFAULT_PALETTE, ...(ctx.palette || {}) };
  let currentQuality = QUALITY_CONFIG[ctx.quality] ? ctx.quality : 'high';

  const group = new THREE.Group();
  group.name = 'FarmFloorArt';

  const anchors = {};
  const lights = [];

  // Shared Textures & Materials (strictly <= 12 materials, <= 2 canvas textures)
  const gradientMap = createToonGradientTexture();
  const { groundTex, detailTex } = createCanvasTextures(seed);

  const materials = {
    ground: new THREE.MeshToonMaterial({
      vertexColors: true,
      map: groundTex,
      gradientMap
    }),
    solid: new THREE.MeshToonMaterial({
      vertexColors: true,
      map: detailTex,
      gradientMap
    }),
    foliage: new THREE.MeshToonMaterial({
      vertexColors: true,
      gradientMap
    }),
    grass: new THREE.MeshToonMaterial({
      vertexColors: true,
      gradientMap,
      side: THREE.DoubleSide
    }),
    cloth: new THREE.MeshToonMaterial({
      vertexColors: true,
      gradientMap,
      side: THREE.DoubleSide
    }),
    outline: new THREE.MeshBasicMaterial({
      color: FARM_COLORS.outline,
      side: THREE.BackSide
    }),
    emissive: new THREE.MeshBasicMaterial({
      vertexColors: true
    }),
    contactShadow: new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    })
  };

  const trackedGeometries = new Set();
  const animatedRefs = {
    grassInst: null,
    grassBaseMatrices: null,
    grassPhases: null,
    wheatInst: null,
    wheatBaseMatrices: null,
    wheatPhases: null,
    dustInst: null,
    dustData: null,
    vultureInst: null,
    vultureData: null,
    clothMeshes: [],
    flameMeshes: [],
    entranceLeftBar: null,
    entranceRightBar: null,
    exitLeftLeaf: null,
    exitRightLeaf: null
  };

  let gateState = {
    entranceOpen: false,
    exitOpen: false,
    arenaSealed: false
  };

  const tempMat4 = new THREE.Matrix4();
  const tempPos = new THREE.Vector3();
  const tempQuat = new THREE.Quaternion();
  const tempScale = new THREE.Vector3();
  const tempEuler = new THREE.Euler();

  let statsCache = { meshes: 0, triangles: 0, drawCallsEstimate: 0 };

  function trackGeo(g) {
    if (g) trackedGeometries.add(g);
    return g;
  }

  function clearSceneGraph() {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    for (const g of trackedGeometries) {
      g.dispose();
    }
    trackedGeometries.clear();
    animatedRefs.grassInst = null;
    animatedRefs.wheatInst = null;
    animatedRefs.dustInst = null;
    animatedRefs.vultureInst = null;
    animatedRefs.clothMeshes.length = 0;
    animatedRefs.flameMeshes.length = 0;
    animatedRefs.entranceLeftBar = null;
    animatedRefs.entranceRightBar = null;
    animatedRefs.exitLeftLeaf = null;
    animatedRefs.exitRightLeaf = null;
  }

  function classifyObstacles() {
    const obstacles = layout.obstacles || [];
    const chokes = layout.chokePoints || [];
    const camps = layout.campSpots || [];
    const templeSpot = camps.find((c) => c.type === 'temple') || { x: 16, z: -75, radius: 9 };
    const farmSpot = camps.find((c) => c.type === 'farm') || { x: -14, z: -112, radius: 5.5 };
    const wellSpot = camps.find((c) => c.type === 'well') || { x: -8, z: -105, radius: 3 };

    const result = {
      chokePosts: [],
      templeColumns: [],
      oliveTrees: [],
      hayBales: [],
      farmhouse: null,
      well: null
    };

    for (let i = 0; i < obstacles.length; i++) {
      const ob = obstacles[i];
      const r = ob.radius || 0.8;

      if (r >= 2.5 || (Math.hypot(ob.x - farmSpot.x, ob.z - farmSpot.z) < 2.0 && r >= 2.0)) {
        result.farmhouse = ob;
        continue;
      }
      if ((r > 1.0 && r < 2.5) || Math.hypot(ob.x - wellSpot.x, ob.z - wellSpot.z) < 1.5) {
        result.well = ob;
        continue;
      }

      let isChokePost = false;
      for (let c = 0; c < chokes.length; c++) {
        const ch = chokes[c].position;
        if (Math.abs(ob.z - ch.z) < 1.5 && Math.abs(Math.abs(ob.x - ch.x) - 2.0) < 1.2) {
          isChokePost = true;
          break;
        }
      }
      if (isChokePost) {
        result.chokePosts.push(ob);
        continue;
      }

      if (
        Math.abs(ob.x - templeSpot.x) <= 8.5 &&
        Math.abs(ob.z - templeSpot.z) <= 8.5 &&
        r >= 0.7
      ) {
        result.templeColumns.push(ob);
        continue;
      }

      if (r <= 0.68) {
        result.oliveTrees.push(ob);
      } else {
        result.hayBales.push(ob);
      }
    }

    if (!result.farmhouse) result.farmhouse = { x: farmSpot.x, z: farmSpot.z, radius: 4.0 };
    if (!result.well) result.well = { x: wellSpot.x, z: wellSpot.z, radius: 1.2 };

    return { ...result, templeSpot, farmSpot, wellSpot };
  }

  function isWalkableOrClear(x, z, margin = 0.8) {
    const poly = layout.pathPolyline || [
      { x: 0, z: 6 },
      { x: 0, z: -125 }
    ];
    const pw = (layout.pathWidth || 4.7) * 0.5 + margin;
    const dRoad = distanceToPolyline(x, z, poly).dist;
    if (dRoad < pw) return true;

    const clearings = layout.clearings || [];
    for (let i = 0; i < clearings.length; i++) {
      const c = clearings[i];
      const d = Math.hypot(x - c.center.x, z - c.center.z);
      if (d < c.radius - margin) return true;
    }
    return false;
  }

  function buildTerrainMesh(qCfg, rng) {
    const b = layout.bounds || { minX: -46, maxX: 46, minZ: -130, maxZ: 7 };
    const padX = 28;
    const padZ = 24;
    const width = b.maxX - b.minX + padX * 2;
    const depth = b.maxZ - b.minZ + padZ * 2;
    const centerX = (b.minX + b.maxX) * 0.5;
    const centerZ = (b.minZ + b.maxZ) * 0.5;

    const geo = new THREE.PlaneGeometry(width, depth, qCfg.terrainSegX, qCfg.terrainSegZ);
    geo.rotateX(-Math.PI / 2);
    geo.translate(centerX, 0, centerZ);

    const pos = geo.attributes.position;
    const uvs = geo.attributes.uv;
    const count = pos.count;
    const colors = new Float32Array(count * 3);

    const poly = layout.pathPolyline || [
      { x: 0, z: 6 },
      { x: 0, z: -20 },
      { x: 2, z: -55 },
      { x: -2, z: -94 },
      { x: 0, z: -125 }
    ];
    const halfPath = (layout.pathWidth || 4.7) * 0.5;
    const clearings = layout.clearings || [];
    const chokes = layout.chokePoints || [];
    const camps = layout.campSpots || [];
    const templeSpot = camps.find((c) => c.type === 'temple') || { x: 16, z: -75, radius: 9 };
    const farmSpot = camps.find((c) => c.type === 'farm') || { x: -14, z: -112, radius: 5.5 };

    const cRoadCenter = new THREE.Color(FARM_COLORS.ochreLight);
    const cRoadBase = new THREE.Color(FARM_COLORS.ochreBase);
    const cRoadRut = new THREE.Color(FARM_COLORS.ochreRut);
    const cClearing = new THREE.Color(palette.dirt).lerp(new THREE.Color(FARM_COLORS.ochreBase), 0.65);
    const cGrassLight = new THREE.Color(FARM_COLORS.dryGrassLight);
    const cGrassMid = new THREE.Color(FARM_COLORS.dryGrassMid);
    const cGrassOlive = new THREE.Color(FARM_COLORS.dryGrassOlive);
    const cGrassDark = new THREE.Color(FARM_COLORS.dryGrassDark);
    const cStone = new THREE.Color(FARM_COLORS.marbleMid);
    const cTmp = new THREE.Color();
    const cGrassMix = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      uvs.setXY(i, x * 0.16, z * 0.16);

      const n1 = fbm2D(x * 0.06, z * 0.06, seed);
      const n2 = fbm2D(x * 0.18 + 19.3, z * 0.18 - 7.1, seed + 101);
      const edgeNoise = (n2 - 0.5) * 0.85;

      const roadInfo = distanceToPolyline(x, z, poly);
      const dRoad = roadInfo.dist + edgeNoise * 0.35;

      let roadWeight = 1.0 - smoothstep(halfPath - 0.55, halfPath + 0.65, dRoad);
      for (let c = 0; c < chokes.length; c++) {
        const ch = chokes[c];
        const dz = Math.abs(z - ch.position.z);
        if (dz < 2.5) {
          const halfChoke = ch.width * 0.5;
          const dChoke = Math.abs(x - ch.position.x);
          const chokeMask = 1.0 - smoothstep(halfChoke - 0.25, halfChoke + 0.35, dChoke);
          roadWeight = Math.max(roadWeight * 0.3, chokeMask);
        }
      }

      let clearingWeight = 0;
      for (let c = 0; c < clearings.length; c++) {
        const cl = clearings[c];
        const dCl = Math.hypot(x - cl.center.x, z - cl.center.z) + edgeNoise * 0.9;
        const w = 1.0 - smoothstep(cl.radius - 2.4, cl.radius + 0.8, dCl);
        if (w > clearingWeight) clearingWeight = w;
      }

      const dTemple = Math.hypot(x - templeSpot.x, z - templeSpot.z);
      const templeWeight = 1.0 - smoothstep(templeSpot.radius - 2.5, templeSpot.radius + 1.2, dTemple);

      const dFarm = Math.hypot(x - farmSpot.x, z - farmSpot.z);
      const farmWeight = 1.0 - smoothstep(farmSpot.radius - 1.0, farmSpot.radius + 2.0, dFarm);

      // Base grass coloration
      cGrassMix.copy(cGrassMid).lerp(cGrassLight, smoothstep(0.35, 0.75, n1));
      cGrassMix.lerp(cGrassOlive, smoothstep(0.4, 0.8, n2) * 0.65);

      // Blend clearing dirt
      cTmp.copy(cGrassMix).lerp(cClearing, clearingWeight * (0.68 + 0.25 * n2));

      // Blend temple limestone dust & farmhouse courtyard
      if (templeWeight > 0.01) {
        cTmp.lerp(cStone, templeWeight * 0.55);
      }
      if (farmWeight > 0.01) {
        cTmp.lerp(cRoadRut, farmWeight * 0.45);
      }

      // Blend main ochre road + cart ruts + central dust crown
      if (roadWeight > 0.001) {
        const rutDist = Math.abs(roadInfo.dist - 1.05);
        const rutFactor = 1.0 - smoothstep(0.08, 0.44, rutDist);
        const centerCrown = 1.0 - smoothstep(0.0, 0.75, roadInfo.dist);

        const cRoadLocal = cTmp.clone();
        cRoadLocal.copy(cRoadBase);
        cRoadLocal.lerp(cRoadCenter, centerCrown * 0.65);
        cRoadLocal.lerp(cRoadRut, rutFactor * 0.72);
        cTmp.lerp(cRoadLocal, roadWeight);
      }

      // Subtle height relief: strictly <= 0.035m inside playable bounds, gentle hills outside bounds
      const outX = Math.max(0, Math.abs(x) - (b.maxX - 2));
      const outZMin = Math.max(0, b.minZ + 2 - z);
      const outZMax = Math.max(0, z - (b.maxZ - 1));
      const outDist = Math.sqrt(outX * outX + outZMin * outZMin + outZMax * outZMax);

      let y = (n1 - 0.5) * 0.035 * (1.0 - Math.max(roadWeight, clearingWeight * 0.8));
      if (roadWeight > 0.2) {
        const rutDist = Math.abs(roadInfo.dist - 1.05);
        const rutIndent = (1.0 - smoothstep(0.05, 0.4, rutDist)) * 0.016;
        y -= rutIndent * roadWeight;
      }

      if (outDist > 0) {
        const hillT = smoothstep(0, 26, outDist);
        const hillH = (0.4 + 0.6 * n1 + 0.35 * n2) * hillT * 9.5;
        y += hillH;
        cTmp.lerp(cGrassDark, hillT * 0.45);
      }

      pos.setY(i, y);
      colors[i * 3] = clamp(cTmp.r, 0, 1);
      colors[i * 3 + 1] = clamp(cTmp.g, 0, 1);
      colors[i * 3 + 2] = clamp(cTmp.b, 0, 1);
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return trackGeo(geo);
  }

  function getChunkIndex(z) {
    if (z >= -32) return 0;
    if (z >= -68) return 1;
    if (z >= -100) return 2;
    return 3;
  }

  function pushToChunk(chunks, geo, z, outlineChunks = null, outlineThickness = 0) {
    const idx = getChunkIndex(z);
    chunks[idx].push(geo);
    if (outlineChunks && outlineThickness > 0) {
      outlineChunks[idx].push(buildOutlinedClone(geo, outlineThickness));
    }
  }

  function createContactDecal(x, z, rx, rz, alphaScale = 1.0) {
    const segs = 12;
    const geo = new THREE.CircleGeometry(1.0, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cCenter = new THREE.Color(FARM_COLORS.shadowDecal);
    const cEdge = new THREE.Color(FARM_COLORS.ochreBase);

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const r = Math.min(1, Math.hypot(vx, vz));
      pos.setXYZ(i, x + vx * rx, 0.012, z + vz * rz);
      const c = cCenter.clone().lerp(cEdge, r * r * (1.2 - 0.2 * alphaScale));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return ensureNonIndexedAndNormals(geo);
  }

  function buildChokeWallsAndPosts(chokePosts, chunks, outlineChunks, shadowDecals, fenceInstances, rng, qCfg) {
    const chokes = layout.chokePoints || [];
    const b = layout.bounds || { minX: -46, maxX: 46 };

    // Heavy stone & timber gate piers at exact choke obstacle positions
    for (let i = 0; i < chokePosts.length; i++) {
      const ob = chokePosts[i];
      const r = ob.radius || 0.8;

      // Stone base pier
      const baseGeo = new THREE.CylinderGeometry(r * 0.82, r * 0.96, 1.45, 8);
      baseGeo.translate(ob.x, 0.725, ob.z);
      pushToChunk(
        chunks,
        paintTexturedGeometry(baseGeo, FARM_COLORS.marbleShade, FARM_COLORS.plasterWarm, 0.16, rng),
        ob.z,
        qCfg.useOutlines ? outlineChunks : null,
        0.03
      );

      // Moss cap ring on stone ledge
      const capGeo = new THREE.BoxGeometry(r * 1.75, 0.18, r * 1.75);
      capGeo.translate(ob.x, 1.5, ob.z);
      pushToChunk(
        chunks,
        paintTexturedGeometry(capGeo, palette.moss, FARM_COLORS.marbleLit, 0.18, rng),
        ob.z
      );

      // Sturdy timber post rising to 2.35m
      const timberGeo = new THREE.BoxGeometry(0.46, 1.1, 0.46);
      timberGeo.translate(ob.x, 1.95, ob.z);
      pushToChunk(
        chunks,
        paintTexturedGeometry(timberGeo, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.15, rng),
        ob.z,
        qCfg.useOutlines ? outlineChunks : null,
        0.025
      );

      // Iron strap
      const strapGeo = new THREE.BoxGeometry(0.52, 0.1, 0.52);
      strapGeo.translate(ob.x, 2.2, ob.z);
      pushToChunk(
        chunks,
        paintTexturedGeometry(strapGeo, palette.iron, FARM_COLORS.ironRust, 0.12, rng),
        ob.z
      );

      shadowDecals.push(createContactDecal(ob.x, ob.z, r * 1.35, r * 1.35, 1.0));
    }

    // Dry-stone walls and wooden fence rails running outward from each choke gap
    for (let c = 0; c < chokes.length; c++) {
      const ch = chokes[c];
      const z = ch.position.z;

      for (const side of [-1, 1]) {
        const startX = side * 2.55;
        const endX = side * (b.maxX - 3);
        const span = Math.abs(endX - startX);
        const wallSegments = 7;
        const segLen = span / wallSegments;

        for (let s = 0; s < wallSegments; s++) {
          const t0 = s / wallSegments;
          const fadeHeight = 1.0 - smoothstep(0.55, 1.0, t0) * 0.45;
          const xCenter = startX + side * (s + 0.5) * segLen;
          const zWave = z + Math.sin(s * 1.3 + c) * 0.35;
          const h = (0.78 + (rng() - 0.5) * 0.14) * fadeHeight;

          // Dry-stone wall course
          if (s < 5) {
            const wallGeo = new THREE.BoxGeometry(segLen * 0.96, h, 0.72);
            wallGeo.rotateY((rng() - 0.5) * 0.06);
            wallGeo.translate(xCenter, h * 0.5, zWave);
            const topColor = rng() > 0.45 ? FARM_COLORS.marbleLit : palette.moss;
            pushToChunk(
              chunks,
              paintTexturedGeometry(wallGeo, FARM_COLORS.marbleShade, topColor, 0.16, rng),
              zWave
            );
            shadowDecals.push(createContactDecal(xCenter, zWave, segLen * 0.52, 0.65, 0.7));
          }

          // Wooden fence posts & double rails extending along the stone wall into the grass
          const postCount = 2;
          for (let p = 0; p < postCount; p++) {
            const px = startX + side * (s * segLen + (p + 0.5) * (segLen / postCount));
            const pz = zWave + (rng() - 0.5) * 0.15;
            fenceInstances.push({
              x: px,
              y: 0,
              z: pz,
              rotY: (rng() - 0.5) * 0.18,
              rotZ: (rng() - 0.5) * 0.12,
              scaleY: 0.85 + rng() * 0.25,
              hasRails: p === 0,
              railLen: segLen * 0.52 * side
            });
          }
        }
      }
    }
  }

  function buildClearing0ArrivalYard(chunks, outlineChunks, shadowDecals, rng) {
    // Clearing 0 (0,0 r13): arrival yard. Keep centre completely open; place signpost & hitching post near edge.
    const signX = -9.5;
    const signZ = -2.5;
    anchors.arrivalSignpost = new THREE.Vector3(signX, 0, signZ);

    // Weathered wooden signpost
    const postGeo = new THREE.CylinderGeometry(0.11, 0.14, 2.25, 7);
    postGeo.rotateZ(0.04);
    postGeo.translate(signX, 1.12, signZ);
    pushToChunk(
      chunks,
      paintTexturedGeometry(postGeo, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.16, rng),
      signZ
    );

    const boardGeo = new THREE.BoxGeometry(1.15, 0.34, 0.08);
    boardGeo.rotateY(0.35);
    boardGeo.translate(signX + 0.35, 1.85, signZ + 0.12);
    pushToChunk(
      chunks,
      paintTexturedGeometry(boardGeo, FARM_COLORS.woodWeathered, FARM_COLORS.ochreLight, 0.15, rng),
      signZ
    );

    // Horse hitching rail & stone water trough on east edge (9.8, -1.5)
    const hitchX = 9.8;
    const hitchZ = -1.5;
    for (const dx of [-0.9, 0.9]) {
      const hp = new THREE.CylinderGeometry(0.09, 0.11, 1.25, 6);
      hp.translate(hitchX + dx, 0.62, hitchZ);
      pushToChunk(
        chunks,
        paintTexturedGeometry(hp, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.14, rng),
        hitchZ
      );
    }
    const bar = new THREE.CylinderGeometry(0.06, 0.06, 2.1, 6);
    bar.rotateZ(Math.PI / 2);
    bar.translate(hitchX, 1.08, hitchZ);
    pushToChunk(
      chunks,
      paintTexturedGeometry(bar, FARM_COLORS.woodWeathered, FARM_COLORS.ochreLight, 0.14, rng),
      hitchZ
    );

    // Carved stone water trough
    const trough = new THREE.BoxGeometry(1.4, 0.45, 0.65);
    trough.translate(hitchX, 0.225, hitchZ + 0.65);
    pushToChunk(
      chunks,
      paintTexturedGeometry(trough, FARM_COLORS.marbleShade, palette.moss, 0.16, rng),
      hitchZ
    );
    shadowDecals.push(createContactDecal(signX, signZ, 0.7, 0.7, 0.8));
    shadowDecals.push(createContactDecal(hitchX, hitchZ + 0.3, 1.4, 1.1, 0.85));

    // Flat road cobbles near arrival
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + rng() * 0.4;
      const rad = 3.2 + rng() * 6.5;
      const sx = Math.cos(angle) * rad;
      const sz = Math.sin(angle) * rad - 1.0;
      const cobble = new THREE.CylinderGeometry(0.32 + rng() * 0.25, 0.38 + rng() * 0.25, 0.035, 6);
      cobble.rotateY(rng() * Math.PI);
      cobble.translate(sx, 0.015, sz);
      pushToChunk(
        chunks,
        paintTexturedGeometry(cobble, FARM_COLORS.marbleShade, FARM_COLORS.marbleMid, 0.1, rng),
        sz
      );
    }
  }

  function buildCartAndPloughLandmark(x, z, rotY, chunks, shadowDecals, rng) {
    const cartGroup = [];
    // Wooden cart bed
    const bed = new THREE.BoxGeometry(1.65, 0.16, 2.3);
    bed.translate(0, 0.68, 0);
    cartGroup.push(paintTexturedGeometry(bed, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.16, rng));

    // Side rails (one broken/tilted)
    for (const side of [-1, 1]) {
      const rail = new THREE.BoxGeometry(0.1, 0.48, 2.2);
      if (side === 1) rail.rotateZ(-0.22);
      rail.translate(side * 0.78, 0.96, 0);
      cartGroup.push(paintTexturedGeometry(rail, FARM_COLORS.woodWeathered, FARM_COLORS.ochreLight, 0.15, rng));
    }

    // Two shafts resting on the ground
    for (const side of [-0.48, 0.48]) {
      const shaft = new THREE.CylinderGeometry(0.05, 0.06, 1.8, 6);
      shaft.rotateX(Math.PI / 2 + 0.28);
      shaft.translate(side, 0.42, 1.85);
      cartGroup.push(paintTexturedGeometry(shaft, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.14, rng));
    }

    // Spoked wheels (one upright, one detached leaning)
    for (const side of [-1, 1]) {
      const wheelRing = new THREE.TorusGeometry(0.58, 0.07, 6, 12);
      wheelRing.rotateY(Math.PI / 2);
      if (side === -1) {
        wheelRing.rotateZ(0.35);
        wheelRing.translate(side * 0.95, 0.52, -0.1);
      } else {
        wheelRing.translate(side * 0.88, 0.58, -0.1);
      }
      cartGroup.push(paintTexturedGeometry(wheelRing, FARM_COLORS.ironRust, FARM_COLORS.woodWeathered, 0.15, rng));
    }

    // Rusted iron plough blade beside cart
    const ploughBeam = new THREE.CylinderGeometry(0.06, 0.08, 1.9, 6);
    ploughBeam.rotateZ(0.65);
    ploughBeam.translate(-1.35, 0.45, 0.6);
    cartGroup.push(paintTexturedGeometry(ploughBeam, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.15, rng));

    const ploughShare = new THREE.ConeGeometry(0.28, 0.65, 4);
    ploughShare.rotateX(Math.PI / 2);
    ploughShare.translate(-1.75, 0.18, 0.7);
    cartGroup.push(paintTexturedGeometry(ploughShare, palette.iron, FARM_COLORS.ironRust, 0.18, rng));

    const merged = mergeGeometries(cartGroup, false);
    merged.rotateY(rotY);
    merged.translate(x, 0, z);
    pushToChunk(chunks, merged, z);
    shadowDecals.push(createContactDecal(x, z, 1.8, 2.1, 0.9));
  }

  function buildTempleRuin(templeSpot, templeColumns, chunks, outlineChunks, shadowDecals, rng, qCfg) {
    const tx = templeSpot.x;
    const tz = templeSpot.z;
    anchors.templeRuin = new THREE.Vector3(tx, 0, tz);

    // Cracked marble stylobate slabs (kept <= 0.04m on west walkable side, stepped up on east ruin side)
    const slabDefs = [
      { x: tx - 3.2, z: tz, w: 6.4, d: 14.2, h: 0.038 },
      { x: tx + 2.4, z: tz, w: 6.8, d: 14.2, h: 0.18 },
      { x: tx + 3.2, z: tz, w: 5.2, d: 12.6, h: 0.34 }
    ];
    for (let i = 0; i < slabDefs.length; i++) {
      const s = slabDefs[i];
      const slab = new THREE.BoxGeometry(s.w, s.h, s.d, 4, 1, 6);
      const pos = slab.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        if (pos.getY(v) > 0) {
          pos.setY(v, pos.getY(v) + (rng() - 0.5) * 0.012);
        }
      }
      slab.translate(s.x, s.h * 0.5, s.z);
      const topCol = i === 0 ? FARM_COLORS.marbleMid : FARM_COLORS.marbleLit;
      pushToChunk(
        chunks,
        paintTexturedGeometry(slab, FARM_COLORS.marbleShade, topCol, 0.16, rng),
        tz
      );
    }

    // Moss strips in stylobate joints
    for (let m = 0; m < 10; m++) {
      const mx = tx - 5.5 + rng() * 11.5;
      const mz = tz - 6.2 + rng() * 12.4;
      const mossPatch = new THREE.BoxGeometry(0.6 + rng() * 1.1, 0.03, 0.25 + rng() * 0.4);
      mossPatch.rotateY(rng() * Math.PI);
      mossPatch.translate(mx, 0.025, mz);
      pushToChunk(
        chunks,
        paintTexturedGeometry(mossPatch, palette.mossDark, palette.moss, 0.12, rng),
        mz
      );
    }

    // Eight weathered marble columns at exact obstacle coordinates (x = 10,14,18,22; z = -81,-69)
    const colHeights = [3.8, 2.4, 4.1, 4.1, 1.9, 3.7, 4.1, 2.8];
    const sortedCols = [...templeColumns].sort((a, b) => a.z - b.z || a.x - b.x);

    for (let i = 0; i < sortedCols.length; i++) {
      const col = sortedCols[i];
      const r = col.radius || 0.8;
      const h = colHeights[i % colHeights.length];
      const radial = qCfg.columnRadial;

      // Square plinth base
      const plinth = new THREE.BoxGeometry(r * 1.85, 0.32, r * 1.85);
      plinth.translate(col.x, 0.16, col.z);
      pushToChunk(
        chunks,
        paintTexturedGeometry(plinth, FARM_COLORS.marbleShade, palette.moss, 0.16, rng),
        col.z
      );

      // Torus base molding
      const torusBase = new THREE.CylinderGeometry(r * 0.88, r * 0.94, 0.24, radial);
      torusBase.translate(col.x, 0.44, col.z);
      pushToChunk(
        chunks,
        paintTexturedGeometry(torusBase, FARM_COLORS.marbleMid, FARM_COLORS.marbleLit, 0.15, rng),
        col.z
      );

      // Fluted marble shaft
      const shaft = new THREE.CylinderGeometry(r * 0.72, r * 0.82, h, radial, 3);
      const sPos = shaft.attributes.position;
      for (let v = 0; v < sPos.count; v++) {
        const vx = sPos.getX(v);
        const vz = sPos.getZ(v);
        const vy = sPos.getY(v);
        const ang = Math.atan2(vz, vx);
        const flute = Math.cos(ang * 12) * 0.025;
        sPos.setX(v, vx + Math.cos(ang) * flute);
        sPos.setZ(v, vz + Math.sin(ang) * flute);
        if (vy > h * 0.45 && h < 3.5) {
          sPos.setY(v, vy + Math.sin(ang * 3 + i) * 0.16);
        }
      }
      shaft.translate(col.x, 0.56 + h * 0.5, col.z);
      pushToChunk(
        chunks,
        paintTexturedGeometry(shaft, FARM_COLORS.marbleMid, FARM_COLORS.marbleLit, 0.18, rng),
        col.z,
        qCfg.useOutlines ? outlineChunks : null,
        0.032
      );

      // Doric echinus & abacus capital on full-height columns
      if (h >= 3.6) {
        const echinus = new THREE.CylinderGeometry(r * 0.95, r * 0.72, 0.28, radial);
        echinus.translate(col.x, 0.56 + h + 0.14, col.z);
        pushToChunk(
          chunks,
          paintTexturedGeometry(echinus, FARM_COLORS.marbleMid, FARM_COLORS.marbleLit, 0.16, rng),
          col.z
        );

        const abacus = new THREE.BoxGeometry(r * 1.95, 0.24, r * 1.95);
        abacus.translate(col.x, 0.56 + h + 0.4, col.z);
        pushToChunk(
          chunks,
          paintTexturedGeometry(abacus, FARM_COLORS.marbleShade, palette.moss, 0.18, rng),
          col.z,
          qCfg.useOutlines ? outlineChunks : null,
          0.028
        );
      }

      shadowDecals.push(createContactDecal(col.x, col.z, r * 1.45, r * 1.45, 1.0));
    }

    // Broken architrave beams spanning the tall columns
    const beams = [
      { x: 20.0, y: 5.3, z: -81.0, w: 5.2, h: 0.62, d: 1.15 },
      { x: 16.0, y: 5.3, z: -69.0, w: 5.2, h: 0.62, d: 1.15 },
      { x: 18.0, y: 5.85, z: -81.0, w: 3.4, h: 0.45, d: 1.05 }
    ];
    for (let i = 0; i < beams.length; i++) {
      const b = beams[i];
      const beamGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
      beamGeo.translate(b.x, b.y, b.z);
      pushToChunk(
        chunks,
        paintTexturedGeometry(beamGeo, FARM_COLORS.marbleMid, palette.moss, 0.18, rng),
        b.z,
        qCfg.useOutlines ? outlineChunks : null,
        0.032
      );
    }

    // Fallen column drums outside the east/south temple edge (clear of road and columns)
    const fallenDrums = [
      { x: 24.2, z: -76.5, rotX: 1.48, rotZ: 0.4 },
      { x: 23.5, z: -74.8, rotX: 1.52, rotZ: -0.25 },
      { x: 19.5, z: -83.2, rotX: 1.45, rotZ: 1.1 }
    ];
    for (let i = 0; i < fallenDrums.length; i++) {
      const fd = fallenDrums[i];
      const drum = new THREE.CylinderGeometry(0.56, 0.58, 1.15, qCfg.columnRadial);
      drum.rotateX(fd.rotX);
      drum.rotateY(fd.rotZ);
      drum.translate(fd.x, 0.48, fd.z);
      pushToChunk(
        chunks,
        paintTexturedGeometry(drum, FARM_COLORS.marbleShade, palette.moss, 0.16, rng),
        fd.z
      );
      shadowDecals.push(createContactDecal(fd.x, fd.z, 0.9, 0.9, 0.8));
    }

    // Temple ritual brazier (warm light source #2)
    const brazierX = 16.0;
    const brazierZ = -75.0;
    const pedestal = new THREE.CylinderGeometry(0.45, 0.58, 0.95, 8);
    pedestal.translate(brazierX, 0.475, brazierZ);
    pushToChunk(
      chunks,
      paintTexturedGeometry(pedestal, FARM_COLORS.marbleShade, FARM_COLORS.marbleLit, 0.16, rng),
      brazierZ
    );

    const bowl = new THREE.CylinderGeometry(0.68, 0.35, 0.38, 8);
    bowl.translate(brazierX, 1.1, brazierZ);
    pushToChunk(
      chunks,
      paintTexturedGeometry(bowl, palette.iron, FARM_COLORS.ironRust, 0.18, rng),
      brazierZ
    );
    shadowDecals.push(createContactDecal(brazierX, brazierZ, 1.0, 1.0, 0.9));

    addFireFlameMesh(brazierX, 1.32, brazierZ, 0.55, rng);
    lights.push({
      position: new THREE.Vector3(brazierX, 1.65, brazierZ),
      color: FARM_COLORS.amberFire,
      intensity: 1.35,
      distance: 13
    });

    // Tattered red/cream cloth banner hanging from temple architrave
    addFlutteringBanner(16.0, 4.95, -69.0, 0.95, 2.1, 0, FARM_COLORS.goblinRed, FARM_COLORS.goblinCream, rng);
    addFlutteringBanner(20.0, 4.95, -81.0, 0.85, 1.85, Math.PI, FARM_COLORS.goblinCream, FARM_COLORS.goblinRed, rng);
  }

  function buildFarmhouseAndWell(farmhouseOb, wellOb, chunks, outlineChunks, shadowDecals, rng, qCfg) {
    // 1. Ruined Whitewashed Farmhouse at (-14, -112), footprint blocker radius 4.0
    const fx = farmhouseOb.x;
    const fz = farmhouseOb.z;
    anchors.farmhouse = new THREE.Vector3(fx, 0, fz);

    // Low dry-stone courtyard terrace (<= 0.04m height so feet never clip)
    const terrace = new THREE.CylinderGeometry(5.6, 5.8, 0.038, 12);
    terrace.translate(fx + 0.6, 0.019, fz + 0.4);
    pushToChunk(
      chunks,
      paintTexturedGeometry(terrace, FARM_COLORS.marbleShade, FARM_COLORS.marbleMid, 0.12, rng),
      fz
    );

    // Whitewashed stone cottage walls fitting tightly inside radius 4.0 blocker
    // Open doorway (2.2m tall, 1.35m wide) on the east wall facing the courtyard
    const wallH = 3.15;
    const halfW = 2.45;
    const halfD = 2.35;
    const wallThick = 0.42;

    const houseParts = [];
    const outlineParts = [];

    // Stone socle base
    const socle = new THREE.CylinderGeometry(3.85, 3.98, 0.55, 10);
    socle.translate(fx, 0.275, fz);
    houseParts.push(paintTexturedGeometry(socle, FARM_COLORS.marbleShade, FARM_COLORS.plasterWeathered, 0.16, rng));

    // West, North, South whitewashed plaster walls (south wall partially collapsed)
    const westWall = new THREE.BoxGeometry(wallThick, wallH, halfD * 2);
    westWall.translate(fx - halfW, wallH * 0.5, fz);
    houseParts.push(paintTexturedGeometry(westWall, FARM_COLORS.plasterWeathered, FARM_COLORS.plasterWarm, 0.16, rng));
    outlineParts.push(westWall);

    const northWall = new THREE.BoxGeometry(halfW * 2, wallH, wallThick);
    northWall.translate(fx, wallH * 0.5, fz - halfD);
    houseParts.push(paintTexturedGeometry(northWall, FARM_COLORS.plasterWeathered, FARM_COLORS.plasterWarm, 0.16, rng));
    outlineParts.push(northWall);

    const southWallLow = new THREE.BoxGeometry(halfW * 2, wallH * 0.62, wallThick);
    southWallLow.translate(fx, wallH * 0.31, fz + halfD);
    houseParts.push(paintTexturedGeometry(southWallLow, FARM_COLORS.plasterWeathered, FARM_COLORS.plasterWarm, 0.16, rng));
    outlineParts.push(southWallLow);

    // East wall flanking the 2.2m open doorway
    for (const side of [-1, 1]) {
      const pier = new THREE.BoxGeometry(wallThick, wallH, 1.55);
      pier.translate(fx + halfW, wallH * 0.5, fz + side * 1.55);
      houseParts.push(paintTexturedGeometry(pier, FARM_COLORS.plasterWeathered, FARM_COLORS.plasterWarm, 0.16, rng));
      outlineParts.push(pier);
    }
    // Lintel above 2.2m doorway
    const lintelWall = new THREE.BoxGeometry(wallThick, wallH - 2.25, 1.65);
    lintelWall.translate(fx + halfW, 2.25 + (wallH - 2.25) * 0.5, fz);
    houseParts.push(paintTexturedGeometry(lintelWall, FARM_COLORS.plasterWeathered, FARM_COLORS.plasterWarm, 0.16, rng));

    // Heavy dark timber door frame & lintel beam (2.2m clearance)
    const timberLintel = new THREE.BoxGeometry(0.54, 0.22, 1.85);
    timberLintel.translate(fx + halfW, 2.3, fz);
    houseParts.push(paintTexturedGeometry(timberLintel, palette.timber, FARM_COLORS.woodDark, 0.14, rng));

    for (const side of [-0.75, 0.75]) {
      const jamb = new THREE.BoxGeometry(0.48, 2.25, 0.2);
      jamb.translate(fx + halfW, 1.125, fz + side);
      houseParts.push(paintTexturedGeometry(jamb, palette.timber, FARM_COLORS.woodDark, 0.14, rng));
    }

    // Dark interior backstop behind open doorway so it reads with depth, not a void
    const interiorBack = new THREE.BoxGeometry(0.2, 2.25, 1.5);
    interiorBack.translate(fx + halfW - 0.65, 1.125, fz);
    houseParts.push(paintTexturedGeometry(interiorBack, FARM_COLORS.trunkDark, FARM_COLORS.woodDark, 0.08, rng));

    // Exposed dark timber roof rafters
    for (let r = 0; r < 5; r++) {
      const rz = fz - halfD + 0.45 + r * 0.95;
      const rafter = new THREE.BoxGeometry(halfW * 2.2, 0.18, 0.18);
      rafter.rotateZ(r > 2 ? -0.18 : 0.05);
      rafter.translate(fx, wallH + 0.15 - (r > 2 ? 0.35 : 0), rz);
      houseParts.push(paintTexturedGeometry(rafter, palette.timber, FARM_COLORS.woodDark, 0.15, rng));
    }

    // Terracotta roof (intact north slope, collapsed south slope with fallen tiles)
    const roofNorth = new THREE.BoxGeometry(halfW * 2.25, 0.24, 2.8);
    roofNorth.rotateX(0.38);
    roofNorth.translate(fx, wallH + 0.58, fz - 1.15);
    houseParts.push(
      paintTexturedGeometry(roofNorth, FARM_COLORS.terracottaDark, FARM_COLORS.terracottaLit, 0.2, rng)
    );
    outlineParts.push(roofNorth);

    const roofCollapsed = new THREE.BoxGeometry(halfW * 1.9, 0.22, 2.3);
    roofCollapsed.rotateX(-0.55);
    roofCollapsed.rotateZ(0.22);
    roofCollapsed.translate(fx - 0.2, wallH - 0.35, fz + 1.05);
    houseParts.push(
      paintTexturedGeometry(roofCollapsed, FARM_COLORS.terracottaDark, FARM_COLORS.terracottaMid, 0.2, rng)
    );

    // Timber lean-to shed on north side (within blocker radius)
    const leanToRoof = new THREE.BoxGeometry(2.6, 0.14, 1.5);
    leanToRoof.rotateX(0.32);
    leanToRoof.translate(fx, 2.15, fz - halfD - 0.65);
    houseParts.push(paintTexturedGeometry(leanToRoof, FARM_COLORS.woodDark, FARM_COLORS.terracottaMid, 0.16, rng));

    for (const lx of [fx - 1.1, fx + 1.1]) {
      const lPost = new THREE.CylinderGeometry(0.09, 0.1, 1.9, 6);
      lPost.translate(lx, 0.95, fz - halfD - 1.2);
      houseParts.push(paintTexturedGeometry(lPost, palette.timber, FARM_COLORS.woodWeathered, 0.14, rng));
    }

    const mergedHouse = mergeGeometries(houseParts, false);
    pushToChunk(chunks, mergedHouse, fz);

    if (qCfg.useOutlines && outlineParts.length > 0) {
      const mergedHouseOutline = mergeGeometries(outlineParts, false);
      outlineChunks[getChunkIndex(fz)].push(buildOutlinedClone(mergedHouseOutline, 0.038));
    }
    shadowDecals.push(createContactDecal(fx, fz, 4.4, 4.4, 1.0));

    // Warm lantern by the farmhouse door (-12, -109, warm 0xffb066)
    const lanternX = -11.4;
    const lanternZ = -109.8;
    const bracket = new THREE.BoxGeometry(0.45, 0.08, 0.08);
    bracket.translate(lanternX - 0.15, 2.25, lanternZ);
    pushToChunk(chunks, paintTexturedGeometry(bracket, palette.iron, FARM_COLORS.ironRust, 0.12, rng), lanternZ);

    const lanternCage = new THREE.CylinderGeometry(0.16, 0.12, 0.34, 6);
    lanternCage.translate(lanternX, 2.04, lanternZ);
    pushToChunk(chunks, paintTexturedGeometry(lanternCage, palette.iron, FARM_COLORS.ironRust, 0.12, rng), lanternZ);

    addFireFlameMesh(lanternX, 2.04, lanternZ, 0.22, rng);
    lights.push({
      position: new THREE.Vector3(-12, 2.1, -109),
      color: FARM_COLORS.lanternWarm,
      intensity: 1.25,
      distance: 11
    });

    // 2. Stone Well at (-8, -105), radius 1.2
    const wx = wellOb.x;
    const wz = wellOb.z;
    anchors.well = new THREE.Vector3(wx, 0, wz);

    const wellParts = [];
    const wellRim = new THREE.CylinderGeometry(1.16, 1.22, 0.88, 12);
    wellRim.translate(wx, 0.44, wz);
    wellParts.push(paintTexturedGeometry(wellRim, FARM_COLORS.marbleShade, palette.moss, 0.18, rng));

    const wellInner = new THREE.CylinderGeometry(0.88, 0.88, 0.9, 10);
    wellInner.translate(wx, 0.46, wz);
    wellParts.push(paintTexturedGeometry(wellInner, FARM_COLORS.waterDark, FARM_COLORS.outline, 0.05, rng));

    // Two timber uprights + winch axle + rope + hanging bucket + small pitched roof
    for (const side of [-0.95, 0.95]) {
      const wPost = new THREE.BoxGeometry(0.16, 1.65, 0.16);
      wPost.translate(wx + side, 1.65, wz);
      wellParts.push(paintTexturedGeometry(wPost, palette.timber, FARM_COLORS.woodWeathered, 0.15, rng));
    }

    const winch = new THREE.CylinderGeometry(0.09, 0.09, 2.05, 8);
    winch.rotateZ(Math.PI / 2);
    winch.translate(wx, 2.15, wz);
    wellParts.push(paintTexturedGeometry(winch, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.14, rng));

    const ropeCoil = new THREE.CylinderGeometry(0.15, 0.15, 0.35, 8);
    ropeCoil.rotateZ(Math.PI / 2);
    ropeCoil.translate(wx, 2.15, wz);
    wellParts.push(paintTexturedGeometry(ropeCoil, FARM_COLORS.hayShade, FARM_COLORS.ochreLight, 0.14, rng));

    const ropeDrop = new THREE.CylinderGeometry(0.025, 0.025, 0.85, 5);
    ropeDrop.translate(wx, 1.72, wz);
    wellParts.push(paintTexturedGeometry(ropeDrop, FARM_COLORS.hayShade, FARM_COLORS.ochreLight, 0.12, rng));

    const bucket = new THREE.CylinderGeometry(0.18, 0.14, 0.28, 7);
    bucket.translate(wx, 1.22, wz);
    wellParts.push(paintTexturedGeometry(bucket, FARM_COLORS.woodDark, FARM_COLORS.ironRust, 0.15, rng));

    const wellRoof = new THREE.ConeGeometry(1.35, 0.65, 4);
    wellRoof.rotateY(Math.PI / 4);
    wellRoof.scale(1.05, 1.0, 0.72);
    wellRoof.translate(wx, 2.72, wz);
    wellParts.push(paintTexturedGeometry(wellRoof, FARM_COLORS.terracottaDark, FARM_COLORS.terracottaLit, 0.18, rng));

    const mergedWell = mergeGeometries(wellParts, false);
    pushToChunk(chunks, mergedWell, wz, qCfg.useOutlines ? outlineChunks : null, 0.028);
    shadowDecals.push(createContactDecal(wx, wz, 1.65, 1.65, 0.95));
  }

  function buildGoblinCampsAndCourtyardProps(chunks, shadowDecals, rng) {
    // Goblin camp pockets near fence lines and clearings 1-3 (never blocking road or spawn points)
    const campSites = [
      { x: -11.5, z: -23.5, rotY: 0.6, hasFire: false },
      { x: 11.8, z: -42.0, rotY: -0.7, hasFire: false },
      { x: 19.5, z: -75.0, rotY: -1.4, hasFire: false },
      { x: -3.5, z: -104.5, rotY: 0.4, hasFire: true }
    ];

    for (let i = 0; i < campSites.length; i++) {
      const cs = campSites[i];
      const parts = [];

      // Hide lean-to tent (flap >= 1.95m tall per contract rule 8)
      const tentFlap = new THREE.ConeGeometry(1.75, 2.15, 5, 1, true);
      tentFlap.rotateY(cs.rotY);
      tentFlap.translate(cs.x, 1.075, cs.z);
      parts.push(paintTexturedGeometry(tentFlap, FARM_COLORS.goblinHide, FARM_COLORS.goblinCream, 0.18, rng));

      // Tent support poles
      for (const side of [-0.85, 0.85]) {
        const pole = new THREE.CylinderGeometry(0.05, 0.07, 2.35, 5);
        pole.rotateZ(side * 0.28);
        pole.translate(cs.x + Math.cos(cs.rotY) * side, 1.12, cs.z - Math.sin(cs.rotY) * side);
        parts.push(paintTexturedGeometry(pole, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.14, rng));
      }

      // Spear rack & bone charm totem beside tent
      const rackX = cs.x + Math.cos(cs.rotY + 1.2) * 2.1;
      const rackZ = cs.z + Math.sin(cs.rotY + 1.2) * 2.1;
      for (let s = 0; s < 3; s++) {
        const spear = new THREE.CylinderGeometry(0.025, 0.035, 2.1, 5);
        spear.rotateZ((s - 1) * 0.14);
        spear.translate(rackX + (s - 1) * 0.22, 1.02, rackZ);
        parts.push(paintTexturedGeometry(spear, FARM_COLORS.woodDark, FARM_COLORS.ironRust, 0.15, rng));
      }

      // Bone skull charm on tall stake
      const totemPole = new THREE.CylinderGeometry(0.05, 0.07, 2.2, 5);
      totemPole.translate(rackX - 0.7, 1.1, rackZ + 0.4);
      parts.push(paintTexturedGeometry(totemPole, FARM_COLORS.woodDark, FARM_COLORS.goblinRed, 0.15, rng));

      const skull = new THREE.IcosahedronGeometry(0.22, 0);
      skull.scale(0.85, 1.1, 1.25);
      skull.translate(rackX - 0.7, 2.25, rackZ + 0.4);
      parts.push(paintTexturedGeometry(skull, FARM_COLORS.marbleShade, FARM_COLORS.bone, 0.18, rng));

      // Fluttering goblin camp banner
      addFlutteringBanner(
        rackX - 0.7,
        1.95,
        rackZ + 0.4,
        0.55,
        1.25,
        cs.rotY,
        FARM_COLORS.goblinRed,
        FARM_COLORS.goblinCream,
        rng
      );

      // Cook-fire stone ring
      if (cs.hasFire) {
        const fx = cs.x + 2.4;
        const fz = cs.z - 1.2;
        for (let st = 0; st < 8; st++) {
          const ang = (st / 8) * Math.PI * 2;
          const stone = new THREE.DodecahedronGeometry(0.18, 0);
          stone.scale(1.2, 0.7, 1.0);
          stone.translate(fx + Math.cos(ang) * 0.52, 0.1, fz + Math.sin(ang) * 0.52);
          parts.push(paintTexturedGeometry(stone, FARM_COLORS.marbleShade, FARM_COLORS.outline, 0.15, rng));
        }
        addFireFlameMesh(fx, 0.26, fz, 0.45, rng);
        lights.push({
          position: new THREE.Vector3(fx, 0.85, fz),
          color: FARM_COLORS.amberFire,
          intensity: 1.2,
          distance: 10
        });
      }

      pushToChunk(chunks, mergeGeometries(parts, false), cs.z);
      shadowDecals.push(createContactDecal(cs.x, cs.z, 2.1, 2.1, 0.85));
    }

    // Scarecrow in the dry fallow field on east side of Clearing 2/3 (-13.5, -99)
    const scX = 13.5;
    const scZ = -100.5;
    const scParts = [];
    const scPole = new THREE.CylinderGeometry(0.06, 0.07, 2.15, 6);
    scPole.translate(scX, 1.07, scZ);
    scParts.push(paintTexturedGeometry(scPole, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.14, rng));

    const scArms = new THREE.CylinderGeometry(0.045, 0.045, 1.55, 5);
    scArms.rotateZ(Math.PI / 2 - 0.08);
    scArms.translate(scX, 1.62, scZ);
    scParts.push(paintTexturedGeometry(scArms, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.14, rng));

    const scTorso = new THREE.ConeGeometry(0.38, 0.95, 6);
    scTorso.translate(scX, 1.38, scZ);
    scParts.push(paintTexturedGeometry(scTorso, FARM_COLORS.goblinHide, FARM_COLORS.hayBright, 0.16, rng));

    const scHead = new THREE.SphereGeometry(0.22, 7, 6);
    scHead.translate(scX, 1.98, scZ);
    scParts.push(paintTexturedGeometry(scHead, FARM_COLORS.hayShade, FARM_COLORS.hayBright, 0.16, rng));

    pushToChunk(chunks, mergeGeometries(scParts, false), scZ);
    shadowDecals.push(createContactDecal(scX, scZ, 0.8, 0.8, 0.75));

    // Scattered terracotta amphorae, pottery shards & crates near farmhouse and temple
    const propSpots = [
      { x: -10.2, z: -114.5 },
      { x: -11.0, z: -108.2 },
      { x: 8.5, z: -117.5 },
      { x: 12.2, z: -70.5 },
      { x: -7.5, z: -17.5 }
    ];
    for (let i = 0; i < propSpots.length; i++) {
      const ps = propSpots[i];
      const crate = new THREE.BoxGeometry(0.65, 0.55, 0.65);
      crate.rotateY(rng() * Math.PI);
      crate.translate(ps.x, 0.275, ps.z);
      pushToChunk(chunks, paintTexturedGeometry(crate, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.15, rng), ps.z);

      const amphora = new THREE.CylinderGeometry(0.14, 0.22, 0.62, 7);
      amphora.rotateZ((rng() - 0.5) * 0.9);
      amphora.translate(ps.x + 0.55, 0.26, ps.z + 0.35);
      pushToChunk(
        chunks,
        paintTexturedGeometry(amphora, FARM_COLORS.terracottaDark, FARM_COLORS.terracottaLit, 0.18, rng),
        ps.z
      );
    }
  }

  function buildGates(chunks, outlineChunks, shadowDecals, rng, qCfg) {
    // 1. Entrance Barrier at (0, 6.5, width 14)
    const ent = layout.entranceBarrier || { position: { x: 0, z: 6.5 }, rotationY: 0, width: 14 };
    const ex = ent.position.x;
    const ez = ent.position.z;
    const ew = ent.width || 14;
    anchors.entranceGate = new THREE.Vector3(ex, 0, ez);

    // Side field fences & stone piers framing the 4.8m central wooden farm gate
    const gateGap = 4.8;
    for (const side of [-1, 1]) {
      const pierX = ex + side * (gateGap * 0.5);
      const pier = new THREE.CylinderGeometry(0.45, 0.55, 2.35, 8);
      pier.translate(pierX, 1.175, ez);
      pushToChunk(
        chunks,
        paintTexturedGeometry(pier, FARM_COLORS.marbleShade, FARM_COLORS.marbleLit, 0.16, rng),
        ez,
        qCfg.useOutlines ? outlineChunks : null,
        0.028
      );
      shadowDecals.push(createContactDecal(pierX, ez, 0.85, 0.85, 0.9));

      // Low wooden wing fence extending to full width 14
      const wingLen = (ew - gateGap) * 0.5;
      const wingX = pierX + side * (wingLen * 0.5);
      for (const railY of [0.55, 1.05]) {
        const rail = new THREE.BoxGeometry(wingLen, 0.11, 0.1);
        rail.translate(wingX, railY, ez);
        pushToChunk(
          chunks,
          paintTexturedGeometry(rail, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.14, rng),
          ez
        );
      }
    }

    // Entrance lantern on west gate pier (warm light source #4)
    const entLanternX = ex - gateGap * 0.5 + 0.35;
    const entLanternZ = ez - 0.35;
    addFireFlameMesh(entLanternX, 2.15, entLanternZ, 0.22, rng);
    lights.push({
      position: new THREE.Vector3(entLanternX, 2.2, entLanternZ),
      color: FARM_COLORS.lanternWarm,
      intensity: 1.15,
      distance: 11
    });

    // Movable entrance gate leaves
    const buildGateLeafMesh = (leafWidth, height) => {
      const leafParts = [];
      const stiles = [0, leafWidth];
      for (const sx of stiles) {
        const stile = new THREE.BoxGeometry(0.12, height, 0.12);
        stile.translate(sx, height * 0.5, 0);
        leafParts.push(paintTexturedGeometry(stile, palette.timber, FARM_COLORS.woodWeathered, 0.15, rng));
      }
      for (const ry of [0.4, 1.15, 1.95]) {
        const rail = new THREE.BoxGeometry(leafWidth, 0.12, 0.1);
        rail.translate(leafWidth * 0.5, ry, 0);
        leafParts.push(paintTexturedGeometry(rail, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.15, rng));
      }
      const brace = new THREE.BoxGeometry(Math.hypot(leafWidth, 1.5), 0.1, 0.08);
      brace.rotateZ(Math.atan2(1.5, leafWidth));
      brace.translate(leafWidth * 0.5, 1.15, 0);
      leafParts.push(paintTexturedGeometry(brace, FARM_COLORS.woodDark, FARM_COLORS.ochreLight, 0.15, rng));

      const geo = trackGeo(mergeGeometries(leafParts, false));
      return new THREE.Mesh(geo, materials.solid);
    };

    const entLeafW = gateGap * 0.48;
    const entLeft = buildGateLeafMesh(entLeafW, 2.2);
    entLeft.position.set(ex - gateGap * 0.5, 0, ez);
    group.add(entLeft);
    animatedRefs.entranceLeftBar = entLeft;

    const entRight = buildGateLeafMesh(entLeafW, 2.2);
    entRight.scale.x = -1;
    entRight.position.set(ex + gateGap * 0.5, 0, ez);
    group.add(entRight);
    animatedRefs.entranceRightBar = entRight;

    // 2. Exit Gate at (0, -125, width 3.6)
    const ext = layout.exitGate || { position: { x: 0, z: -125 }, rotationY: 0, width: 3.6 };
    const xgx = ext.position.x;
    const xgz = ext.position.z;
    const xgw = ext.width || 3.6;
    anchors.exitGate = new THREE.Vector3(xgx, 0, xgz);

    for (const side of [-1, 1]) {
      const px = xgx + side * (xgw * 0.5 + 0.42);
      const pillar = new THREE.BoxGeometry(0.92, 2.65, 0.92);
      pillar.translate(px, 1.325, xgz);
      pushToChunk(
        chunks,
        paintTexturedGeometry(pillar, FARM_COLORS.marbleShade, FARM_COLORS.marbleLit, 0.18, rng),
        xgz,
        qCfg.useOutlines ? outlineChunks : null,
        0.032
      );

      const cap = new THREE.BoxGeometry(1.12, 0.24, 1.12);
      cap.translate(px, 2.75, xgz);
      pushToChunk(
        chunks,
        paintTexturedGeometry(cap, FARM_COLORS.terracottaDark, FARM_COLORS.terracottaLit, 0.18, rng),
        xgz
      );
      shadowDecals.push(createContactDecal(px, xgz, 0.95, 0.95, 1.0));
    }

    const exitLeafW = xgw * 0.49;
    const exitLeft = buildGateLeafMesh(exitLeafW, 2.4);
    exitLeft.position.set(xgx - xgw * 0.5, 0, xgz);
    group.add(exitLeft);
    animatedRefs.exitLeftLeaf = exitLeft;

    const exitRight = buildGateLeafMesh(exitLeafW, 2.4);
    exitRight.scale.x = -1;
    exitRight.position.set(xgx + xgw * 0.5, 0, xgz);
    group.add(exitRight);
    animatedRefs.exitRightLeaf = exitRight;

    applyGateVisuals();
  }

  function applyGateVisuals() {
    const entOpenAngle = gateState.entranceOpen ? 1.35 : 0.0;
    const exitOpenAngle = gateState.exitOpen && !gateState.arenaSealed ? -1.42 : 0.0;

    if (animatedRefs.entranceLeftBar) {
      animatedRefs.entranceLeftBar.rotation.y = entOpenAngle;
    }
    if (animatedRefs.entranceRightBar) {
      animatedRefs.entranceRightBar.rotation.y = -entOpenAngle;
    }
    if (animatedRefs.exitLeftLeaf) {
      animatedRefs.exitLeftLeaf.rotation.y = exitOpenAngle;
    }
    if (animatedRefs.exitRightLeaf) {
      animatedRefs.exitRightLeaf.rotation.y = -exitOpenAngle;
    }
  }

  function addFlutteringBanner(x, y, z, width, height, rotY, colorTop, colorBot, rng) {
    const geo = new THREE.PlaneGeometry(width, height, 3, 6);
    geo.translate(0, -height * 0.5, 0);
    const painted = paintGeometry(geo, colorBot, colorTop, 0.15, rng);
    const pos = painted.attributes.position;
    const baseY = new Float32Array(pos.count);
    const baseZ = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      baseY[i] = pos.getY(i);
      baseZ[i] = pos.getZ(i);
    }
    trackGeo(painted);
    const mesh = new THREE.Mesh(painted, materials.cloth);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    group.add(mesh);
    animatedRefs.clothMeshes.push({ mesh, geo: painted, baseY, baseZ, height, phase: rng() * Math.PI * 2 });
  }

  function addFireFlameMesh(x, y, z, scale, rng) {
    const flameGeo = new THREE.ConeGeometry(scale * 0.5, scale * 1.35, 6);
    flameGeo.translate(0, scale * 0.5, 0);
    const painted = paintGeometry(flameGeo, FARM_COLORS.amberFire, 0xfff3b0, 0.05, rng);
    trackGeo(painted);
    const mesh = new THREE.Mesh(painted, materials.emissive);
    mesh.position.set(x, y, z);
    group.add(mesh);
    animatedRefs.flameMeshes.push({ mesh, baseY: y, baseScale: 1.0, phase: rng() * Math.PI * 2 });
  }

  function buildInstancedOliveTrees(oliveObstacles, shadowDecals, rng, qCfg) {
    const treePlacements = [];

    // 1. Every gameplay olive tree obstacle (radius 0.6) at its exact position
    for (let i = 0; i < oliveObstacles.length; i++) {
      const ob = oliveObstacles[i];
      treePlacements.push({
        x: ob.x,
        z: ob.z,
        scale: 0.96 + rng() * 0.18,
        rotY: rng() * Math.PI * 2,
        isObstacle: true
      });
      shadowDecals.push(createContactDecal(ob.x, ob.z, 2.3, 2.3, 0.9));
    }

    // 2. Additional grove & perimeter olive trees strictly outside walkable clearings/paths
    // Clearing 1 (-35 r15) olive grove framing + outer bounds silhouettes
    const extraGroveCoords = [
      { x: -16.5, z: -26 },
      { x: 16.5, z: -26 },
      { x: -17.2, z: -38 },
      { x: 17.2, z: -38 },
      { x: -15.8, z: -44 },
      { x: 15.8, z: -44 },
      { x: -34, z: -12 },
      { x: 34, z: -14 },
      { x: -36, z: -35 },
      { x: 36, z: -36 },
      { x: -35, z: -68 },
      { x: 37, z: -72 },
      { x: -36, z: -98 },
      { x: 35, z: -102 },
      { x: -32, z: -122 },
      { x: 32, z: -120 }
    ];
    for (let i = 0; i < extraGroveCoords.length; i++) {
      const eg = extraGroveCoords[i];
      treePlacements.push({
        x: eg.x,
        z: eg.z,
        scale: 0.9 + rng() * 0.35,
        rotY: rng() * Math.PI * 2,
        isObstacle: false
      });
      shadowDecals.push(createContactDecal(eg.x, eg.z, 2.1, 2.1, 0.75));
    }

    // Build shared gnarled olive trunk geometry (radius 0.58 at base to match 0.6 collider)
    const trunkParts = [];
    const mainTrunk = new THREE.CylinderGeometry(0.36, 0.58, 2.35, 8, 4);
    const tPos = mainTrunk.attributes.position;
    for (let i = 0; i < tPos.count; i++) {
      const vy = tPos.getY(i);
      const t = (vy + 1.175) / 2.35;
      const twist = t * 0.65;
      const vx = tPos.getX(i);
      const vz = tPos.getZ(i);
      tPos.setX(i, vx * Math.cos(twist) - vz * Math.sin(twist) + Math.sin(t * 3.1) * 0.14);
      tPos.setZ(i, vx * Math.sin(twist) + vz * Math.cos(twist) + Math.cos(t * 2.7) * 0.1);
    }
    mainTrunk.translate(0, 1.175, 0);
    trunkParts.push(paintTexturedGeometry(mainTrunk, FARM_COLORS.trunkDark, FARM_COLORS.trunkBark, 0.18, rng));

    // Root buttresses
    for (let r = 0; r < 3; r++) {
      const ang = (r / 3) * Math.PI * 2 + 0.3;
      const root = new THREE.ConeGeometry(0.24, 0.75, 5);
      root.rotateZ(0.48);
      root.rotateY(ang);
      root.translate(Math.cos(ang) * 0.42, 0.32, Math.sin(ang) * 0.42);
      trunkParts.push(paintTexturedGeometry(root, FARM_COLORS.trunkDark, FARM_COLORS.trunkBark, 0.16, rng));
    }

    // 3 gnarled primary boughs
    const boughAngles = [0.2, 2.3, 4.4];
    for (let b = 0; b < boughAngles.length; b++) {
      const ang = boughAngles[b];
      const bough = new THREE.CylinderGeometry(0.14, 0.26, 1.65, 6);
      bough.rotateZ(0.58);
      bough.rotateY(ang);
      bough.translate(Math.cos(ang) * 0.55, 2.55, Math.sin(ang) * 0.55);
      trunkParts.push(paintTexturedGeometry(bough, FARM_COLORS.trunkDark, FARM_COLORS.trunkBark, 0.16, rng));
    }

    const trunkGeo = trackGeo(mergeGeometries(trunkParts, false));

    // Build airy layered Mediterranean olive canopy geometry
    const canopyParts = [];
    const lobeCount = qCfg.canopyLobes;
    for (let l = 0; l < lobeCount; l++) {
      const ang = (l / lobeCount) * Math.PI * 2 + rng() * 0.35;
      const dist = l === 0 ? 0 : 0.95 + (l % 2) * 0.65;
      const rad = l === 0 ? 1.55 : 1.05 + (l % 3) * 0.22;
      const lobe = new THREE.IcosahedronGeometry(rad, 1);
      lobe.scale(1.25, 0.58, 1.15);
      lobe.translate(
        Math.cos(ang) * dist,
        3.35 + (l % 3) * 0.32,
        Math.sin(ang) * dist
      );
      const topC = l % 2 === 0 ? FARM_COLORS.oliveSilver : FARM_COLORS.oliveLeafLight;
      canopyParts.push(paintGeometry(lobe, FARM_COLORS.oliveLeafDark, topC, 0.22, rng));
    }
    const canopyGeo = trackGeo(mergeGeometries(canopyParts, false));

    const trunkInst = new THREE.InstancedMesh(trunkGeo, materials.solid, treePlacements.length);
    const canopyInst = new THREE.InstancedMesh(canopyGeo, materials.foliage, treePlacements.length);

    for (let i = 0; i < treePlacements.length; i++) {
      const tp = treePlacements[i];
      tempPos.set(tp.x, 0, tp.z);
      tempEuler.set(0, tp.rotY, 0);
      tempQuat.setFromEuler(tempEuler);
      tempScale.set(tp.scale, tp.scale, tp.scale);
      tempMat4.compose(tempPos, tempQuat, tempScale);
      trunkInst.setMatrixAt(i, tempMat4);
      canopyInst.setMatrixAt(i, tempMat4);
    }

    trunkInst.instanceMatrix.needsUpdate = true;
    canopyInst.instanceMatrix.needsUpdate = true;
    group.add(trunkInst);
    group.add(canopyInst);
  }

  function buildInstancedHayBales(baleObstacles, shadowDecals, rng, qCfg) {
    if (baleObstacles.length === 0) return;

    const r = 0.8;
    const baleParts = [];
    const mainCyl = new THREE.CylinderGeometry(r * 0.96, r * 0.98, 1.08, qCfg.baleRadial, 2);
    const pos = mainCyl.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vy = pos.getY(i);
      const bulge = 1.0 + (1.0 - (vy / 0.54) * (vy / 0.54)) * 0.05;
      pos.setX(i, pos.getX(i) * bulge);
      pos.setZ(i, pos.getZ(i) * bulge);
    }
    mainCyl.translate(0, 0.54, 0);
    baleParts.push(paintTexturedGeometry(mainCyl, FARM_COLORS.hayShade, FARM_COLORS.hayBright, 0.18, rng));

    // Twine binding bands
    for (const bandY of [0.32, 0.76]) {
      const band = new THREE.CylinderGeometry(r * 1.01, r * 1.01, 0.06, qCfg.baleRadial);
      band.translate(0, bandY, 0);
      baleParts.push(paintTexturedGeometry(band, FARM_COLORS.woodDark, FARM_COLORS.ochreRut, 0.12, rng));
    }

    const baleGeo = trackGeo(mergeGeometries(baleParts, false));
    const baleInst = new THREE.InstancedMesh(baleGeo, materials.solid, baleObstacles.length);

    for (let i = 0; i < baleObstacles.length; i++) {
      const ob = baleObstacles[i];
      const s = (ob.radius || 0.8) / 0.8;
      tempPos.set(ob.x, 0, ob.z);
      tempEuler.set((rng() - 0.5) * 0.06, rng() * Math.PI * 2, (rng() - 0.5) * 0.06);
      tempQuat.setFromEuler(tempEuler);
      tempScale.set(s, s * (0.92 + rng() * 0.18), s);
      tempMat4.compose(tempPos, tempQuat, tempScale);
      baleInst.setMatrixAt(i, tempMat4);
      shadowDecals.push(createContactDecal(ob.x, ob.z, (ob.radius || 0.8) * 1.35, (ob.radius || 0.8) * 1.35, 0.95));
    }
    baleInst.instanceMatrix.needsUpdate = true;
    group.add(baleInst);
  }

  function buildInstancedFenceRails(fenceInstances, rng) {
    if (fenceInstances.length === 0) return;

    const parts = [];
    const post = new THREE.CylinderGeometry(0.08, 0.1, 1.25, 6);
    post.translate(0, 0.625, 0);
    parts.push(paintTexturedGeometry(post, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.15, rng));

    for (const ry of [0.48, 0.92]) {
      const rail = new THREE.BoxGeometry(2.6, 0.09, 0.07);
      rail.translate(1.3, ry, 0);
      parts.push(paintTexturedGeometry(rail, FARM_COLORS.woodDark, FARM_COLORS.woodWeathered, 0.15, rng));
    }

    const fenceGeo = trackGeo(mergeGeometries(parts, false));
    const inst = new THREE.InstancedMesh(fenceGeo, materials.solid, fenceInstances.length);

    for (let i = 0; i < fenceInstances.length; i++) {
      const f = fenceInstances[i];
      tempPos.set(f.x, f.y, f.z);
      tempEuler.set(0, f.rotY, f.rotZ);
      tempQuat.setFromEuler(tempEuler);
      const sx = f.hasRails ? (f.railLen >= 0 ? 1 : -1) : 0.15;
      tempScale.set(sx, f.scaleY, 1);
      tempMat4.compose(tempPos, tempQuat, tempScale);
      inst.setMatrixAt(i, tempMat4);
    }
    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
  }

  function buildInstancedFieldStonesAndCypress(chunks, rng, qCfg) {
    const b = layout.bounds || { minX: -46, maxX: 46, minZ: -130, maxZ: 7 };

    // 1. Instanced field stones scattered along road edges, ruins, and clearings
    const stoneRaw = new THREE.DodecahedronGeometry(0.32, 0);
    stoneRaw.scale(1.25, 0.68, 0.95);
    stoneRaw.translate(0, 0.16, 0);
    const stoneGeo = trackGeo(
      paintTexturedGeometry(stoneRaw, FARM_COLORS.marbleShade, FARM_COLORS.marbleLit, 0.18, rng)
    );

    const stoneMatrices = [];
    for (let i = 0; i < qCfg.stoneCount; i++) {
      const x = (rng() - 0.5) * 84;
      const z = 5 - rng() * 132;
      if (isWalkableOrClear(x, z, -0.4)) continue;
      const s = 0.45 + rng() * 1.25;
      tempPos.set(x, 0, z);
      tempEuler.set(rng() * 0.3, rng() * Math.PI * 2, rng() * 0.3);
      tempQuat.setFromEuler(tempEuler);
      tempScale.set(s, s * (0.6 + rng() * 0.6), s);
      tempMat4.compose(tempPos, tempQuat, tempScale);
      stoneMatrices.push(tempMat4.clone());
    }

    if (stoneMatrices.length > 0) {
      const stoneInst = new THREE.InstancedMesh(stoneGeo, materials.solid, stoneMatrices.length);
      for (let i = 0; i < stoneMatrices.length; i++) {
        stoneInst.setMatrixAt(i, stoneMatrices[i]);
      }
      stoneInst.instanceMatrix.needsUpdate = true;
      group.add(stoneInst);
    }

    // 2. Distant Mediterranean cypress silhouettes outside playable bounds
    const cypParts = [];
    const cypTrunk = new THREE.CylinderGeometry(0.18, 0.28, 1.6, 6);
    cypTrunk.translate(0, 0.8, 0);
    cypParts.push(paintGeometry(cypTrunk, FARM_COLORS.trunkDark, FARM_COLORS.trunkBark, 0.14, rng));

    const cypCone1 = new THREE.ConeGeometry(0.95, 5.2, 7);
    cypCone1.translate(0, 3.8, 0);
    cypParts.push(paintGeometry(cypCone1, FARM_COLORS.cypressDark, FARM_COLORS.oliveLeafMid, 0.18, rng));

    const cypCone2 = new THREE.ConeGeometry(0.72, 4.2, 7);
    cypCone2.translate(0, 5.4, 0);
    cypParts.push(paintGeometry(cypCone2, FARM_COLORS.cypressDark, FARM_COLORS.oliveLeafLight, 0.18, rng));

    const cypGeo = trackGeo(mergeGeometries(cypParts, false));
    const cypCount = 32;
    const cypInst = new THREE.InstancedMesh(cypGeo, materials.foliage, cypCount);

    for (let i = 0; i < cypCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (b.maxX + 2 + rng() * 18);
      const z = b.maxZ - (i / cypCount) * (b.maxZ - b.minZ + 12) + (rng() - 0.5) * 6;
      const hY = 1.5 + rng() * 3.5;
      const s = 0.85 + rng() * 0.55;
      tempPos.set(x, hY, z);
      tempEuler.set(0, rng() * Math.PI * 2, (rng() - 0.5) * 0.08);
      tempQuat.setFromEuler(tempEuler);
      tempScale.set(s, s, s);
      tempMat4.compose(tempPos, tempQuat, tempScale);
      cypInst.setMatrixAt(i, tempMat4);
    }
    cypInst.instanceMatrix.needsUpdate = true;
    group.add(cypInst);
  }

  function buildAnimatedFoliageAndAtmosphere(rng, qCfg) {
    const poly = layout.pathPolyline || [
      { x: 0, z: 6 },
      { x: 0, z: -125 }
    ];
    const halfPath = (layout.pathWidth || 4.7) * 0.5;

    // 1. Swaying dry grass tufts (3 crossed blades per tuft)
    const grassParts = [];
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.ConeGeometry(0.14, 0.55, 3);
      blade.translate(0, 0.275, 0);
      blade.rotateZ((b - 1) * 0.26);
      blade.rotateY((b / 3) * Math.PI);
      grassParts.push(paintGeometry(blade, FARM_COLORS.dryGrassDark, FARM_COLORS.dryGrassLight, 0.15, rng));
    }
    const grassGeo = trackGeo(mergeGeometries(grassParts, false));

    const grassBase = [];
    const grassPhases = [];
    for (let i = 0; i < qCfg.grassCount; i++) {
      const x = (rng() - 0.5) * 86;
      const z = 6 - rng() * 134;
      const dRoad = distanceToPolyline(x, z, poly).dist;
      if (dRoad < halfPath - 0.25) continue;

      const s = 0.65 + rng() * 0.85;
      tempPos.set(x, 0, z);
      tempEuler.set(0, rng() * Math.PI * 2, 0);
      tempQuat.setFromEuler(tempEuler);
      tempScale.set(s, s, s);
      tempMat4.compose(tempPos, tempQuat, tempScale);
      grassBase.push(tempMat4.clone());
      grassPhases.push(x * 0.17 + z * 0.13 + rng() * 2.5);
    }

    const grassInst = new THREE.InstancedMesh(grassGeo, materials.grass, grassBase.length);
    for (let i = 0; i < grassBase.length; i++) {
      grassInst.setMatrixAt(i, grassBase[i]);
    }
    grassInst.instanceMatrix.needsUpdate = true;
    group.add(grassInst);
    animatedRefs.grassInst = grassInst;
    animatedRefs.grassBaseMatrices = grassBase;
    animatedRefs.grassPhases = new Float32Array(grassPhases);

    // 2. Golden wheat clumps & Mediterranean thistles
    const wheatParts = [];
    for (let s = 0; s < 4; s++) {
      const ang = (s / 4) * Math.PI * 2;
      const stalk = new THREE.CylinderGeometry(0.02, 0.03, 0.78, 4);
      stalk.translate(Math.cos(ang) * 0.08, 0.39, Math.sin(ang) * 0.08);
      wheatParts.push(paintGeometry(stalk, FARM_COLORS.hayShade, FARM_COLORS.wheatGold, 0.14, rng));

      const ear = new THREE.ConeGeometry(0.065, 0.24, 5);
      ear.translate(Math.cos(ang) * 0.1, 0.82, Math.sin(ang) * 0.1);
      wheatParts.push(paintGeometry(ear, FARM_COLORS.hayBright, 0xffe48a, 0.16, rng));
    }
    const wheatGeo = trackGeo(mergeGeometries(wheatParts, false));

    const wheatBase = [];
    const wheatPhases = [];
    for (let i = 0; i < qCfg.wheatCount; i++) {
      const x = (rng() - 0.5) * 78;
      const z = 4 - rng() * 130;
      if (isWalkableOrClear(x, z, -1.2)) continue;

      const s = 0.75 + rng() * 0.7;
      tempPos.set(x, 0, z);
      tempEuler.set(0, rng() * Math.PI * 2, 0);
      tempQuat.setFromEuler(tempEuler);
      tempScale.set(s, s, s);
      tempMat4.compose(tempPos, tempQuat, tempScale);
      wheatBase.push(tempMat4.clone());
      wheatPhases.push(x * 0.21 + z * 0.19 + rng() * 3.14);
    }

    const wheatInst = new THREE.InstancedMesh(wheatGeo, materials.grass, wheatBase.length);
    for (let i = 0; i < wheatBase.length; i++) {
      wheatInst.setMatrixAt(i, wheatBase[i]);
    }
    wheatInst.instanceMatrix.needsUpdate = true;
    group.add(wheatInst);
    animatedRefs.wheatInst = wheatInst;
    animatedRefs.wheatBaseMatrices = wheatBase;
    animatedRefs.wheatPhases = new Float32Array(wheatPhases);

    // 3. Drifting warm golden dust motes
    const moteGeo = trackGeo(paintGeometry(new THREE.OctahedronGeometry(0.045, 0), 0xffe4a0, 0xffffff, 0.0, rng));
    const dustInst = new THREE.InstancedMesh(moteGeo, materials.emissive, qCfg.dustCount);
    const dustData = [];
    for (let i = 0; i < qCfg.dustCount; i++) {
      const dx = (rng() - 0.5) * 44;
      const dy = 0.4 + rng() * 3.2;
      const dz = 4 - rng() * 128;
      const phase = rng() * Math.PI * 2;
      const speed = 0.35 + rng() * 0.55;
      dustData.push({ x: dx, y: dy, z: dz, phase, speed });
      tempPos.set(dx, dy, dz);
      tempQuat.identity();
      tempScale.setScalar(0.6 + rng() * 0.8);
      tempMat4.compose(tempPos, tempQuat, tempScale);
      dustInst.setMatrixAt(i, tempMat4);
    }
    dustInst.instanceMatrix.needsUpdate = true;
    group.add(dustInst);
    animatedRefs.dustInst = dustInst;
    animatedRefs.dustData = dustData;

    // 4. Two lazy circling vultures outside the bounds
    const birdParts = [];
    const body = new THREE.ConeGeometry(0.14, 0.65, 5);
    body.rotateX(Math.PI / 2);
    birdParts.push(paintGeometry(body, FARM_COLORS.outline, FARM_COLORS.trunkDark, 0.1, rng));
    for (const side of [-1, 1]) {
      const wing = new THREE.BoxGeometry(0.95, 0.04, 0.28);
      wing.rotateZ(side * 0.14);
      wing.translate(side * 0.48, 0.05, 0);
      birdParts.push(paintGeometry(wing, FARM_COLORS.outline, FARM_COLORS.woodDark, 0.1, rng));
    }
    const birdGeo = trackGeo(mergeGeometries(birdParts, false));
    const vultureInst = new THREE.InstancedMesh(birdGeo, materials.solid, 2);
    animatedRefs.vultureInst = vultureInst;
    animatedRefs.vultureData = [
      { cx: -32, cz: -55, y: 18, radius: 16, speed: 0.22, phase: 0 },
      { cx: 30, cz: -85, y: 20, radius: 18, speed: 0.19, phase: 2.4 }
    ];
    group.add(vultureInst);
  }

  function computeSceneStats() {
    let meshes = 0;
    let triangles = 0;
    let drawCalls = 0;

    group.traverse((obj) => {
      if (obj.isMesh) {
        meshes++;
        drawCalls++;
        const geo = obj.geometry;
        if (geo && geo.attributes && geo.attributes.position) {
          const triCount = geo.index
            ? geo.index.count / 3
            : geo.attributes.position.count / 3;
          const count = obj.isInstancedMesh ? obj.count : 1;
          triangles += Math.round(triCount * count);
        }
      }
    });

    statsCache = {
      meshes,
      triangles,
      drawCallsEstimate: drawCalls
    };
  }

  function buildScene() {
    clearSceneGraph();
    lights.length = 0;

    const rng = createRng(seed);
    const qCfg = QUALITY_CONFIG[currentQuality] || QUALITY_CONFIG.high;

    // Populate named anchors for clearings and camps
    const clearings = layout.clearings || [];
    for (let i = 0; i < clearings.length; i++) {
      const cl = clearings[i];
      anchors[cl.id || `clearing_${i}`] = new THREE.Vector3(cl.center.x, 0, cl.center.z);
    }
    const campSpots = layout.campSpots || [];
    for (let i = 0; i < campSpots.length; i++) {
      const cs = campSpots[i];
      anchors[`camp_${cs.type || i}`] = new THREE.Vector3(cs.x, 0, cs.z);
    }

    // 1. Ground & Road Mesh
    const terrainGeo = buildTerrainMesh(qCfg, rng);
    const terrainMesh = new THREE.Mesh(terrainGeo, materials.ground);
    terrainMesh.name = 'FarmGround';
    group.add(terrainMesh);

    // 2. Classify layout obstacles and build 4 spatial chunks
    const classified = classifyObstacles();
    const solidChunks = [[], [], [], []];
    const outlineChunks = [[], [], [], []];
    const shadowDecals = [];
    const fenceInstances = [];

    buildClearing0ArrivalYard(solidChunks, outlineChunks, shadowDecals, rng);
    buildChokeWallsAndPosts(
      classified.chokePosts,
      solidChunks,
      outlineChunks,
      shadowDecals,
      fenceInstances,
      rng,
      qCfg
    );

    // Clearing 1 broken cart & plough landmark on west edge (-13.2, -37.5)
    buildCartAndPloughLandmark(-13.2, -37.5, 0.42, solidChunks, shadowDecals, rng);
    // Clearing 3 second handcart outside walkway (11.5, -113.5)
    buildCartAndPloughLandmark(11.5, -113.5, -1.15, solidChunks, shadowDecals, rng);

    buildTempleRuin(
      classified.templeSpot,
      classified.templeColumns,
      solidChunks,
      outlineChunks,
      shadowDecals,
      rng,
      qCfg
    );

    buildFarmhouseAndWell(
      classified.farmhouse,
      classified.well,
      solidChunks,
      outlineChunks,
      shadowDecals,
      rng,
      qCfg
    );

    buildGoblinCampsAndCourtyardProps(solidChunks, shadowDecals, rng);
    buildGates(solidChunks, outlineChunks, shadowDecals, rng, qCfg);

    // Assemble the 4 spatial static chunks for frustum culling
    for (let c = 0; c < 4; c++) {
      if (solidChunks[c].length > 0) {
        const mergedSolid = trackGeo(mergeGeometries(solidChunks[c], false));
        mergedSolid.computeBoundingSphere();
        const chunkMesh = new THREE.Mesh(mergedSolid, materials.solid);
        chunkMesh.name = `StaticChunk_${c}`;
        group.add(chunkMesh);
      }
      if (qCfg.useOutlines && outlineChunks[c].length > 0) {
        const mergedOutline = trackGeo(mergeGeometries(outlineChunks[c], false));
        mergedOutline.computeBoundingSphere();
        const outlineMesh = new THREE.Mesh(mergedOutline, materials.outline);
        outlineMesh.name = `OutlineChunk_${c}`;
        group.add(outlineMesh);
      }
    }

    // Instanced Props
    buildInstancedOliveTrees(classified.oliveTrees, shadowDecals, rng, qCfg);
    buildInstancedHayBales(classified.hayBales, shadowDecals, rng, qCfg);
    buildInstancedFenceRails(fenceInstances, rng);
    buildInstancedFieldStonesAndCypress(solidChunks, rng, qCfg);

    // Contact shadow decals merged into 1 draw call
    if (shadowDecals.length > 0) {
      const mergedShadows = trackGeo(mergeGeometries(shadowDecals, false));
      const shadowMesh = new THREE.Mesh(mergedShadows, materials.contactShadow);
      shadowMesh.name = 'ContactShadows';
      group.add(shadowMesh);
    }

    // Animated foliage, banners, flames, dust motes & vultures
    buildAnimatedFoliageAndAtmosphere(rng, qCfg);

    computeSceneStats();
  }

  buildScene();

  function update(dt, time = 0) {
    // 1. Swaying dry grass (stride-interleaved update to stay ultra-fast & allocation-free)
    const grassInst = animatedRefs.grassInst;
    if (grassInst && animatedRefs.grassBaseMatrices) {
      const base = animatedRefs.grassBaseMatrices;
      const phases = animatedRefs.grassPhases;
      const count = base.length;
      for (let i = 0; i < count; i++) {
        tempMat4.copy(base[i]);
        const sway = Math.sin(time * 1.85 + phases[i]) * 0.085;
        tempMat4.elements[4] += sway;
        grassInst.setMatrixAt(i, tempMat4);
      }
      grassInst.instanceMatrix.needsUpdate = true;
    }

    // 2. Swaying golden wheat clumps
    const wheatInst = animatedRefs.wheatInst;
    if (wheatInst && animatedRefs.wheatBaseMatrices) {
      const base = animatedRefs.wheatBaseMatrices;
      const phases = animatedRefs.wheatPhases;
      const count = base.length;
      for (let i = 0; i < count; i++) {
        tempMat4.copy(base[i]);
        const sway = Math.sin(time * 2.1 + phases[i]) * 0.11;
        tempMat4.elements[4] += sway;
        wheatInst.setMatrixAt(i, tempMat4);
      }
      wheatInst.instanceMatrix.needsUpdate = true;
    }

    // 3. Fluttering temple & goblin camp cloth banners
    for (let i = 0; i < animatedRefs.clothMeshes.length; i++) {
      const c = animatedRefs.clothMeshes[i];
      const pos = c.geo.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const by = c.baseY[v];
        const pinFactor = clamp(-by / c.height, 0, 1);
        const wave = Math.sin(time * 3.2 + c.phase + by * 2.5) * 0.14 * pinFactor;
        pos.setZ(v, c.baseZ[v] + wave);
      }
      pos.needsUpdate = true;
    }

    // 4. Flickering lantern & brazier flames
    for (let i = 0; i < animatedRefs.flameMeshes.length; i++) {
      const f = animatedRefs.flameMeshes[i];
      const s = 0.88 + Math.sin(time * 11.0 + f.phase) * 0.14 + Math.cos(time * 17.3 + f.phase) * 0.08;
      f.mesh.scale.set(s, s * 1.12, s);
    }

    // 5. Drifting warm dust motes
    const dustInst = animatedRefs.dustInst;
    if (dustInst && animatedRefs.dustData) {
      const dd = animatedRefs.dustData;
      for (let i = 0; i < dd.length; i++) {
        const d = dd[i];
        const x = d.x + Math.sin(time * d.speed + d.phase) * 0.65;
        const y = d.y + Math.cos(time * d.speed * 0.8 + d.phase) * 0.28;
        const z = d.z + Math.sin(time * d.speed * 0.6 + d.phase * 1.3) * 0.65;
        tempPos.set(x, y, z);
        tempQuat.identity();
        tempScale.setScalar(0.75 + Math.sin(time * 2.2 + d.phase) * 0.25);
        tempMat4.compose(tempPos, tempQuat, tempScale);
        dustInst.setMatrixAt(i, tempMat4);
      }
      dustInst.instanceMatrix.needsUpdate = true;
    }

    // 6. Circling vultures outside bounds
    const vultureInst = animatedRefs.vultureInst;
    if (vultureInst && animatedRefs.vultureData) {
      const vd = animatedRefs.vultureData;
      for (let i = 0; i < vd.length; i++) {
        const v = vd[i];
        const ang = time * v.speed + v.phase;
        const vx = v.cx + Math.cos(ang) * v.radius;
        const vz = v.cz + Math.sin(ang) * v.radius;
        const vy = v.y + Math.sin(ang * 2.0) * 0.6;
        tempPos.set(vx, vy, vz);
        tempEuler.set(0.05, -ang, 0.22);
        tempQuat.setFromEuler(tempEuler);
        tempScale.setScalar(1.2);
        tempMat4.compose(tempPos, tempQuat, tempScale);
        vultureInst.setMatrixAt(i, tempMat4);
      }
      vultureInst.instanceMatrix.needsUpdate = true;
    }
  }

  function setQuality(q) {
    const nextQ = QUALITY_CONFIG[q] ? q : 'high';
    if (nextQ === currentQuality) return;
    currentQuality = nextQ;
    buildScene();
  }

  function setLighting(lighting) {
    if (!lighting) return;
    if (typeof lighting.lampGlow === 'number') {
      const b = clamp(0.75 + lighting.lampGlow * 0.35, 0.5, 1.5);
      materials.emissive.color.setScalar(b);
    }
  }

  function setGateState(nextState = {}) {
    if (typeof nextState.entranceOpen === 'boolean') {
      gateState.entranceOpen = nextState.entranceOpen;
    }
    if (typeof nextState.exitOpen === 'boolean') {
      gateState.exitOpen = nextState.exitOpen;
    }
    if (typeof nextState.arenaSealed === 'boolean') {
      gateState.arenaSealed = nextState.arenaSealed;
    }
    applyGateVisuals();
  }

  function destroyPillar() {
    return false;
  }

  function getStats() {
    return { ...statsCache };
  }

  function dispose() {
    clearSceneGraph();
    gradientMap.dispose();
    groundTex.dispose();
    detailTex.dispose();
    for (const key of Object.keys(materials)) {
      materials[key].dispose();
    }
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
    dispose
  };
}

export default buildFarmFloorArt;

```
