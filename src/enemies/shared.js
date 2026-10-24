// src/enemies/shared.js
// Shared constants, procedural geometry helpers, material caches, and enemy archetypes.
import * as THREE from 'three';

export const CACHES = {
  geoms: new Map(),
  mats: new Map(),
  textures: new Map()
};

export function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getGradientMap() {
  if (CACHES.textures.has('toonGrad4')) return CACHES.textures.get('toonGrad4');
  const data = new Uint8Array([
    48, 48, 58, 255,
    110, 110, 122, 255,
    182, 182, 195, 255,
    252, 252, 255, 255
  ]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  CACHES.textures.set('toonGrad4', tex);
  return tex;
}

export function getSharedVertexColorMat(key = 'vcToon') {
  if (CACHES.mats.has(key)) return CACHES.mats.get(key);
  const mat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    vertexColors: true,
    gradientMap: getGradientMap()
  });
  CACHES.mats.set(key, mat);
  return mat;
}

export function getSharedSkinMat() {
  if (CACHES.mats.has('sharedSkinToon')) return CACHES.mats.get('sharedSkinToon');
  const mat = new THREE.MeshToonMaterial({
    color: 0x6a6a2e,
    vertexColors: true,
    gradientMap: getGradientMap()
  });
  CACHES.mats.set('sharedSkinToon', mat);
  return mat;
}

export function getOutlineMat() {
  if (CACHES.mats.has('outline')) return CACHES.mats.get('outline');
  const mat = new THREE.MeshBasicMaterial({
    color: 0x14101c,
    side: THREE.BackSide
  });
  CACHES.mats.set('outline', mat);
  return mat;
}

export function getGeom(key, factory) {
  if (CACHES.geoms.has(key)) return CACHES.geoms.get(key);
  const g = factory();
  CACHES.geoms.set(key, g);
  return g;
}

// Fast internal geometry merger with automatic vertex color baking and normal-extruded outline creation
export function paintGeom(geom, hex, shadeBottom = 1.0) {
  const g = geom.index ? geom.toNonIndexed() : geom.clone();
  const pos = g.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color(hex);
  let minY = Infinity;
  let maxY = -Infinity;
  if (shadeBottom !== 1.0) {
    for (let i = 0; i < count; i++) {
      const y = pos.getY(i);
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const span = Math.max(0.001, maxY - minY);
  for (let i = 0; i < count; i++) {
    const k = shadeBottom !== 1.0
      ? THREE.MathUtils.lerp(shadeBottom, 1.0, (pos.getY(i) - minY) / span)
      : 1.0;
    colors[i * 3] = c.r * k;
    colors[i * 3 + 1] = c.g * k;
    colors[i * 3 + 2] = c.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

export function mergeGeoms(list) {
  let total = 0;
  const nonIdx = list.map((g) => {
    const ng = g.index ? g.toNonIndexed() : g;
    if (!ng.attributes.normal) ng.computeVertexNormals();
    total += ng.attributes.position.count;
    return ng;
  });
  const pos = new Float32Array(total * 3);
  const norm = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  let offset = 0;
  for (const g of nonIdx) {
    const p = g.attributes.position.array;
    const n = g.attributes.normal.array;
    const c = g.attributes.color ? g.attributes.color.array : null;
    pos.set(p, offset);
    norm.set(n, offset);
    if (c) {
      col.set(c, offset);
    } else {
      for (let i = 0; i < p.length; i++) col[offset + i] = 1.0;
    }
    offset += p.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

export function makeTransformMatrix(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));
  return m;
}

export function placeGeom(geom, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, shade = 0.88) {
  const g = paintGeom(geom, hex, shade);
  g.applyMatrix4(makeTransformMatrix(x, y, z, rx, ry, rz, sx, sy, sz));
  return g;
}

export function buildInvertedHullGeom(srcGeom, push = 0.011) {
  const g = srcGeom.clone();
  const pos = g.attributes.position;
  const norm = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) + norm.getX(i) * push,
      pos.getY(i) + norm.getY(i) * push,
      pos.getZ(i) + norm.getZ(i) * push
    );
  }
  g.deleteAttribute('color');
  return g;
}

// Procedural part shapes
export function buildTaperedLimbGeom(rTop, rBot, len, radSeg = 7, yFromTop = true) {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, radSeg, 2, false);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    // Slight muscular bulge in the middle
    const mid = 1.0 - Math.abs(y / (len * 0.5));
    const bulge = 1.0 + mid * 0.14;
    pos.setX(i, pos.getX(i) * bulge);
    pos.setZ(i, pos.getZ(i) * bulge);
  }
  g.translate(0, yFromTop ? -len * 0.5 : len * 0.5, 0);
  g.computeVertexNormals();
  return g;
}

export function buildTorsoGeom(wTop, wBot, h, dTop, dBot, hunchZ = 0.05) {
  const g = new THREE.CylinderGeometry(1, 1, h, 8, 3, false);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = (y + h * 0.5) / h;
    const w = THREE.MathUtils.lerp(wBot, wTop, t);
    const d = THREE.MathUtils.lerp(dBot, dTop, t);
    const arch = Math.sin(t * Math.PI) * hunchZ;
    pos.setX(i, pos.getX(i) * w);
    pos.setZ(i, pos.getZ(i) * d + arch);
    pos.setY(i, y + h * 0.5);
  }
  g.computeVertexNormals();
  return g;
}

export function buildWedgeGeom(w, h, d, curveZ = 0) {
  const g = new THREE.ConeGeometry(w, h, 4, 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) + h * 0.5;
    const t = y / h;
    pos.setY(i, y);
    pos.setZ(i, pos.getZ(i) * (d / w) + t * t * curveZ);
  }
  g.computeVertexNormals();
  return g;
}

export function buildCurvedBladeGeom(len, width, curve) {
  const g = new THREE.BoxGeometry(0.018, len, width, 1, 5, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) + len * 0.5;
    // BoxGeometry rounds the bottom row to a tiny negative y (e.g. -1.8e-9),
    // so t can dip below 0 and Math.pow(negative, 1.65) would be NaN.
    const t = Math.min(1, Math.max(0, y / len));
    const z = pos.getZ(i);
    const taper = 1 - Math.pow(t, 1.65) * 0.88;
    const bend = t * t * curve;
    const xScale = z > 0 ? 0.14 : 1.0;
    pos.setX(i, pos.getX(i) * xScale * taper);
    pos.setY(i, y);
    pos.setZ(i, z * taper + bend);
  }
  g.computeVertexNormals();
  return g;
}

export function buildLatheClubGeom() {
  // 0.8m long thick tapered wooden club with stone spikes
  const pts = [
    new THREE.Vector2(0.001, 0.0),
    new THREE.Vector2(0.024, 0.02),
    new THREE.Vector2(0.020, 0.22),
    new THREE.Vector2(0.036, 0.45),
    new THREE.Vector2(0.068, 0.68),
    new THREE.Vector2(0.056, 0.77),
    new THREE.Vector2(0.001, 0.80)
  ];
  const lathe = new THREE.LatheGeometry(pts, 7);
  lathe.rotateX(Math.PI * 0.5); // Extend along +Z from hand
  const parts = [placeGeom(lathe, 0x5c3d24, 0, 0, -0.08, 0, 0, 0, 1, 1, 1, 0.85)];

  // Iron grip ring
  const ring = new THREE.CylinderGeometry(0.027, 0.027, 0.04, 6);
  parts.push(placeGeom(ring, 0x3b3e45, 0, 0, -0.06, Math.PI * 0.5, 0, 0));

  // 3 protruding stone spikes near the thick business end
  const spike = new THREE.ConeGeometry(0.026, 0.095, 4);
  parts.push(placeGeom(spike, 0x9aa2ad, 0.065, 0.01, 0.54, 0, 0, -Math.PI * 0.45));
  parts.push(placeGeom(spike, 0x9aa2ad, -0.055, 0.035, 0.58, 0.3, 0, Math.PI * 0.42));
  parts.push(placeGeom(spike, 0x9aa2ad, 0.0, -0.065, 0.50, Math.PI * 0.92, 0, 0));

  return mergeGeoms(parts);
}

export function buildPlankShieldGeom() {
  // Round-ish 4-vertical-plank shield with iron boss and edge spikes
  const parts = [];
  const heights = [0.34, 0.44, 0.44, 0.34];
  const shades = [0x583920, 0x654326, 0x54361e, 0x614024];
  for (let i = 0; i < 4; i++) {
    const zOff = (i - 1.5) * 0.076;
    const plank = new THREE.BoxGeometry(0.026, heights[i], 0.07);
    parts.push(placeGeom(plank, shades[i], 0.05, -0.10, zOff));
  }
  // Horizontal iron brace bars
  const bar = new THREE.BoxGeometry(0.032, 0.035, 0.30);
  parts.push(placeGeom(bar, 0x3b3e45, 0.052, -0.01, 0));
  parts.push(placeGeom(bar, 0x3b3e45, 0.052, -0.19, 0));

  // Row of 4 metal spikes along outer edge
  const spike = new THREE.ConeGeometry(0.016, 0.065, 4);
  for (let i = 0; i < 4; i++) {
    const yOff = -0.22 + i * 0.08;
    parts.push(placeGeom(spike, 0x9aa2ad, 0.072, yOff, 0.12, 0, 0, -Math.PI * 0.5));
  }
  return mergeGeoms(parts);
}

export function buildSickleKnifeGeom() {
  const hilt = new THREE.CylinderGeometry(0.018, 0.022, 0.13, 6);
  const guard = new THREE.BoxGeometry(0.028, 0.025, 0.085);
  const blade = buildCurvedBladeGeom(0.34, 0.068, -0.085);
  return mergeGeoms([
    placeGeom(hilt, 0x5c3d24, 0, 0, 0, Math.PI * 0.5, 0, 0),
    placeGeom(guard, 0x3b3e45, 0, 0, 0.065),
    placeGeom(blade, 0xa8b2be, 0, 0, 0.07, Math.PI * 0.5, 0, 0, 1, 1, 1, 0.92)
  ]);
}

export function buildCleaverGeom() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.24, 0.05);
  shape.lineTo(0.30, 0.98);
  shape.lineTo(0.02, 1.05);
  shape.lineTo(-0.04, 0.74);
  shape.lineTo(0.03, 0.67);
  shape.lineTo(-0.04, 0.58);
  shape.lineTo(-0.03, 0.02);
  shape.closePath();

  const blade = new THREE.ExtrudeGeometry(shape, {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1
  });
  blade.translate(0, 0, -0.0225);
  blade.rotateY(Math.PI * 0.5);
  blade.rotateX(Math.PI * 0.5);

  const hilt = new THREE.CylinderGeometry(0.042, 0.038, 0.54, 7);
  const pommel = new THREE.DodecahedronGeometry(0.06, 0);
  const rustSpot = new THREE.BoxGeometry(0.052, 0.16, 0.22);

  return mergeGeoms([
    placeGeom(hilt, 0x36281e, 0, 0, 0.14, Math.PI * 0.5, 0, 0),
    placeGeom(pommel, 0x3b3e45, 0, 0, -0.14),
    placeGeom(blade, 0x626770, 0, 0, 0.36, 0, 0, 0, 1, 1, 1, 0.78),
    placeGeom(rustSpot, 0x6e281a, 0, -0.06, 0.75),
    placeGeom(rustSpot, 0x642216, 0, -0.12, 1.05)
  ]);
}

export function buildBannerGeom() {
  const g = new THREE.PlaneGeometry(0.34, 0.64, 2, 5);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i) - 0.32;
    const tear = y < -0.48 ? Math.abs(x) * 0.48 : 0;
    pos.setY(i, y + tear);
  }
  return paintGeom(g, 0x8f1d1d, 0.75);
}

export const ARCHETYPES = {
  goblin_grunt: {
    height: 1.15,
    skinHex: 0x6a6a2e,
    legLen: 0.24,
    torsoH: 0.35,
    torsoWTop: 0.17,
    torsoWBot: 0.115,
    armLen: 0.26, // Long arms nearly reaching knees in hunched stance
    headScale: 0.25,
    hunch: 0.62, // ~35 deg deep forward hunch
    kneeBend: 0.36,
    hasHair: true,
    hasEarring: true,
    shoulderL: true,
    shoulderR: false
  },
  goblin_archer: {
    height: 1.15,
    skinHex: 0x6e6c32,
    legLen: 0.24,
    torsoH: 0.34,
    torsoWTop: 0.155,
    torsoWBot: 0.105,
    armLen: 0.25,
    headScale: 0.24,
    hunch: 0.58,
    kneeBend: 0.38,
    hasHood: true,
    hasQuiver: true,
    hasEarring: true
  },
  goblin_shaman: {
    height: 1.30,
    skinHex: 0x5c6832,
    legLen: 0.27,
    torsoH: 0.40,
    torsoWTop: 0.15,
    torsoWBot: 0.105,
    armLen: 0.27,
    headScale: 0.24,
    hunch: 0.50,
    kneeBend: 0.28,
    hasPointedHood: true,
    hasRobe: true,
    hasBoneNecklace: true
  },
  goblin_leader: {
    height: 1.70,
    skinHex: 0x5f6429,
    legLen: 0.35,
    torsoH: 0.50,
    torsoWTop: 0.26,
    torsoWBot: 0.175,
    armLen: 0.34,
    headScale: 0.28,
    hunch: 0.46,
    kneeBend: 0.26,
    hasHelm: true,
    shoulderL: true,
    shoulderR: true,
    hasBanner: true
  },
  goblin_armored: {
    height: 1.20,
    skinHex: 0x6a6a2e,
    legLen: 0.25,
    torsoH: 0.36,
    torsoWTop: 0.18,
    torsoWBot: 0.12,
    armLen: 0.26,
    headScale: 0.25,
    hunch: 0.58,
    kneeBend: 0.34,
    hasHelm: true,
    shoulderL: true,
    shoulderR: true,
    hasChestPlate: true,
  },
  goblin_scout: {
    height: 1.15,
    skinHex: 0x6a6a2e,
    legLen: 0.25,
    torsoH: 0.36,
    torsoWTop: 0.18,
    torsoWBot: 0.12,
    armLen: 0.26,
    headScale: 0.25,
    hunch: 0.58,
    kneeBend: 0.34,
    hasHelm: true,
    shoulderL: true,
    shoulderR: true,
    hasChestPlate: true,
    hasHorn: true,
  },
  harpy: {
    height: 1.5,
    skinHex: 0x8a5a9a,
    legLen: 0.30,
    torsoH: 0.40,
    torsoWTop: 0.16,
    torsoWBot: 0.12,
    armLen: 0.32,
    headScale: 0.22,
    hunch: 0.20,
    kneeBend: 0.12,
    hasWings: true,
    hasTalons: true,
  },
  hobgoblin_chief: {
    height: 2.70,
    skinHex: 0x6a7a3a,
    legLen: 0.54,
    torsoH: 0.86,
    torsoWTop: 0.50,
    torsoWBot: 0.32,
    armLen: 0.56,
    headScale: 0.35,
    hunch: 0.52,
    kneeBend: 0.28,
    isBoss: true,
    hasHelm: true,
    shoulderL: true,
    shoulderR: true,
    hasSkullBelt: true,
    hasSpikedCollar: true
  },
  // Batch 2 placeholders
  orc_warrior: { height: 2.15, skinHex: 0x526838, legLen: 0.44, torsoH: 0.66, torsoWTop: 0.36, torsoWBot: 0.25, armLen: 0.38, headScale: 0.28, hunch: 0.28, kneeBend: 0.15, shoulderL: true, shoulderR: true },
  orc_archer: { height: 2.10, skinHex: 0x566c3b, legLen: 0.43, torsoH: 0.64, torsoWTop: 0.33, torsoWBot: 0.23, armLen: 0.37, headScale: 0.27, hunch: 0.28, kneeBend: 0.18, hasQuiver: true },
  orc_berserker: { height: 2.35, skinHex: 0x625834, legLen: 0.47, torsoH: 0.72, torsoWTop: 0.42, torsoWBot: 0.27, armLen: 0.42, headScale: 0.30, hunch: 0.35, kneeBend: 0.2, hasHair: true },
  orc_lord: { height: 4.00, skinHex: 0x4b5830, legLen: 0.82, torsoH: 1.24, torsoWTop: 0.68, torsoWBot: 0.45, armLen: 0.70, headScale: 0.46, hunch: 0.28, kneeBend: 0.16, isBoss: true, hasHelm: true, shoulderL: true, shoulderR: true, hasBanner: true },
  crystal_slime: { height: 0.90, isNonHumanoid: 'slime', skinHex: 0x38b8d8 },
  rock_crawler: { height: 0.60, isNonHumanoid: 'crawler', skinHex: 0x5a534a },
  prairie_wolf: { height: 0.95, isQuadruped: 'wolf', skinHex: 0x4a4d55, furLightHex: 0x7c808c, length: 1.7 },
  goblin_hound: { height: 0.85, isQuadruped: 'wolf', skinHex: 0x3a3d2a, furLightHex: 0x6b6e55, length: 1.5 },
  black_wolf: { height: 1.05, isQuadruped: 'wolf', skinHex: 0x1a1a22, furLightHex: 0x333340, length: 1.85 },
  queen_of_the_forest: { height: 1.5, isQuadruped: 'wolf', skinHex: 0xfff3b0, furLightHex: 0xffffff, length: 2.0 },
  lightning_wolf: { height: 1.1, isQuadruped: 'wolf', skinHex: 0x1a2a44, furLightHex: 0x4aa3ff, length: 1.9 }
};
