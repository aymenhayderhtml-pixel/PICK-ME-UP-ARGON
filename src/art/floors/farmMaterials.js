// src/art/floors/farmMaterials.js
// Deterministic PRNG, noise, geometry painting, procedural canvas textures, and shared materials for Floor 1.

import * as THREE from 'three';
import { FARM_COLORS } from './farmConfig.js';

export function createRng(seed) {
  let a = (seed >>> 0) || 7932;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2D(x, z, seed = 7932) {
  const n = Math.sin(x * 127.1 + z * 311.7 + seed * 0.13) * 43758.5453;
  return n - Math.floor(n);
}

export function valueNoise2D(x, z, seed = 7932) {
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

export function fbm2D(x, z, seed = 7932) {
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

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function distToSegment2D(px, pz, ax, az, bx, bz) {
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

export function distanceToPolyline(px, pz, polyline) {
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

export function ensureNonIndexedAndNormals(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.computeVertexNormals();
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}

export function paintGeometry(geo, hexBase, hexTop = null, shadeFactor = 0.14, rng = null) {
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

export function ensureUVs(geo, scale = 0.25) {
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

export function paintTexturedGeometry(geo, hexBase, hexTop = null, shadeFactor = 0.14, rng = null, uvScale = 0.3) {
  const g = paintGeometry(geo, hexBase, hexTop, shadeFactor, rng);
  return ensureUVs(g, uvScale);
}

export function createToonGradientTexture() {
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

export function createCanvasTextures(seed) {
  const rng = createRng(seed ^ 0x45d9f3b);

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

export function buildOutlinedClone(geo, thickness = 0.032) {
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

export function getChunkIndex(z) {
  if (z >= -32) return 0;
  if (z >= -68) return 1;
  if (z >= -100) return 2;
  return 3;
}

export function pushToChunk(chunks, geo, z, outlineChunks = null, outlineThickness = 0) {
  const idx = getChunkIndex(z);
  chunks[idx].push(geo);
  if (outlineChunks && outlineThickness > 0) {
    outlineChunks[idx].push(buildOutlinedClone(geo, outlineThickness));
  }
}

export function createContactDecal(x, z, rx, rz, alphaScale = 1.0) {
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

export function createFarmMaterials(seed) {
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

  return {
    materials,
    gradientMap,
    groundTex,
    detailTex
  };
}