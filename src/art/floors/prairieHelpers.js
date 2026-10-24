import * as THREE from 'three';
import { DEFAULT_LAYOUT, OUTLINE_COLOR } from './prairieConfig.js';

export function createRng(seed) {
  let state = (seed >>> 0) || 1;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function hexToRgb(hex) {
  return {
    r: ((hex >> 16) & 255) / 255,
    g: ((hex >> 8) & 255) / 255,
    b: (hex & 255) / 255,
  };
}

export function createToonGradientTexture() {
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

export function createGrassCanvasTexture(seed) {
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

export function createStoneCanvasTexture(seed) {
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

export function normalizeGeometry(geom, hexColor, opts = {}) {
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

export function createInvertedOutlineGeometry(sourceGeom, thickness = 0.038, outlineHex = OUTLINE_COLOR) {
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

export function getChunkIndex(z) {
  if (z >= -15) return 0;
  if (z >= -52) return 1;
  if (z >= -92) return 2;
  return 3;
}

export function distToSegment2D(px, pz, ax, az, bx, bz) {
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

export function getPathInfo(x, z, layout) {
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

export function getSurfaceMetrics(x, z, layout) {
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

export function computeTerrainHeight(x, z, bounds) {
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

export function createSculptedRockGeometry(radius, height, detail, seed) {
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

export function createContactDecalGeometry(x, z, radiusX, radiusZ, rotY, hexColor = 0x26321d) {
  const geom = new THREE.CircleGeometry(1.0, 12);
  geom.rotateX(-Math.PI / 2);
  geom.scale(radiusX, 1, radiusZ);
  if (rotY) geom.rotateY(rotY);
  geom.translate(x, 0.012, z);
  return normalizeGeometry(geom, hexColor, { bottomAO: 0, variation: 0.02 });
}