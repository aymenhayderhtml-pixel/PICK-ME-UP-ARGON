// src/art/enemies.js
import * as THREE from 'three';

export const ENEMY_TYPES = [
  'goblin_grunt',
  'goblin_archer',
  'goblin_shaman',
  'goblin_leader',
  'goblin_armored',
  'hobgoblin_chief',
  'prairie_wolf',
  'orc_warrior',
  'orc_archer',
  'orc_berserker',
  'orc_lord',
  'crystal_slime',
  'rock_crawler'
];

export const POSE_INFO = {
  idle: { loop: true, duration: 2.0 },
  walk: { loop: true, duration: 0.9 },
  run: { loop: true, duration: 0.6 },
  attack1: { loop: false, duration: 0.5 },
  attack2: { loop: false, duration: 0.65 },
  heavy: { loop: false, duration: 0.95 },
  cast: { loop: false, duration: 0.9 },
  shoot: { loop: false, duration: 0.7 },
  roar: { loop: false, duration: 1.2 },
  block: { loop: true, duration: 1.0 },
  pounce: { loop: false, duration: 0.9 },
  windup: { loop: true, duration: 1.0 },
  circle: { loop: true, duration: 1.2 },
  howl: { loop: false, duration: 1.5 },
  hit: { loop: false, duration: 0.25 },
  stagger: { loop: false, duration: 0.6 },
  flee: { loop: true, duration: 0.55 },
  hesitate: { loop: true, duration: 1.4 },
  spawn: { loop: false, duration: 1.0 },
  death: { loop: false, duration: 1.0 },
  ambushWait: { loop: true, duration: 2.4 },
  slam: { loop: false, duration: 0.9 },
  charge: { loop: true, duration: 0.55 },
  heal: { loop: false, duration: 0.8 },
  throw: { loop: false, duration: 0.6 }
};

export const ENEMY_POSES = Object.keys(POSE_INFO);

const CACHES = {
  geoms: new Map(),
  mats: new Map(),
  textures: new Map()
};

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getGradientMap() {
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

function getSharedVertexColorMat(key = 'vcToon') {
  if (CACHES.mats.has(key)) return CACHES.mats.get(key);
  const mat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    vertexColors: true,
    gradientMap: getGradientMap()
  });
  CACHES.mats.set(key, mat);
  return mat;
}

function getSharedSkinMat() {
  if (CACHES.mats.has('sharedSkinToon')) return CACHES.mats.get('sharedSkinToon');
  const mat = new THREE.MeshToonMaterial({
    color: 0x6a6a2e,
    vertexColors: true,
    gradientMap: getGradientMap()
  });
  CACHES.mats.set('sharedSkinToon', mat);
  return mat;
}

function getOutlineMat() {
  if (CACHES.mats.has('outline')) return CACHES.mats.get('outline');
  const mat = new THREE.MeshBasicMaterial({
    color: 0x14101c,
    side: THREE.BackSide
  });
  CACHES.mats.set('outline', mat);
  return mat;
}

function getGeom(key, factory) {
  if (CACHES.geoms.has(key)) return CACHES.geoms.get(key);
  const g = factory();
  CACHES.geoms.set(key, g);
  return g;
}

// Fast internal geometry merger with automatic vertex color baking and normal-extruded outline creation
function paintGeom(geom, hex, shadeBottom = 1.0) {
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

function mergeGeoms(list) {
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

function makeTransformMatrix(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));
  return m;
}

function placeGeom(geom, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, shade = 0.88) {
  const g = paintGeom(geom, hex, shade);
  g.applyMatrix4(makeTransformMatrix(x, y, z, rx, ry, rz, sx, sy, sz));
  return g;
}

function buildInvertedHullGeom(srcGeom, push = 0.011) {
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
function buildTaperedLimbGeom(rTop, rBot, len, radSeg = 7, yFromTop = true) {
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

function buildTorsoGeom(wTop, wBot, h, dTop, dBot, hunchZ = 0.05) {
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

function buildWedgeGeom(w, h, d, curveZ = 0) {
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

function buildCurvedBladeGeom(len, width, curve) {
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

function buildLatheClubGeom() {
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

function buildPlankShieldGeom() {
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

function buildSickleKnifeGeom() {
  const hilt = new THREE.CylinderGeometry(0.018, 0.022, 0.13, 6);
  const guard = new THREE.BoxGeometry(0.028, 0.025, 0.085);
  const blade = buildCurvedBladeGeom(0.34, 0.068, -0.085);
  return mergeGeoms([
    placeGeom(hilt, 0x5c3d24, 0, 0, 0, Math.PI * 0.5, 0, 0),
    placeGeom(guard, 0x3b3e45, 0, 0, 0.065),
    placeGeom(blade, 0xa8b2be, 0, 0, 0.07, Math.PI * 0.5, 0, 0, 1, 1, 1, 0.92)
  ]);
}

function buildCleaverGeom() {
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

function buildBannerGeom() {
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

const ARCHETYPES = {
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
  prairie_wolf: { height: 0.95, isQuadruped: 'wolf', skinHex: 0x4a4d55, furLightHex: 0x7c808c, length: 1.7 }
};

// Build and cache merged geometries per type + weapon + levelTier so 25 enemies share exact buffers
function getTypeGeometries(type, arch, wVariant, armorTier) {
  const cacheKey = `rigGeoms_${type}_${wVariant}_${armorTier}`;
  if (CACHES.geoms.has(cacheKey)) return CACHES.geoms.get(cacheKey);

  const legL = arch.legLen;
  const torsoH = arch.torsoH;
  const armL = arch.armLen;
  const hScale = arch.headScale;
  const shldrW = arch.torsoWTop * 1.12;

  const skinWhite = 0xffffff; // Driven by shared/tinted skinMat.color
  const darkLeather = 0x36281e;
  const tanFur = 0x8c7248;
  const whiteTuft = 0xd2c8b0;
  const darkIron = 0x3b3e45;
  const boneWhite = 0xe5dec9;
  const hairBlack = 0x16181c;
  const goldHex = 0xd4af37;
  const tongueRed = 0xc42424;
  const robeHex = 0x2b2523;
  const woodHex = 0x5c3d24;

  // 1. HIPS (Loincloth + tufts + shaman skirt + chief skull belt)
  const hipsParts = [];
  const loinBase = new THREE.CylinderGeometry(arch.torsoWBot * 1.05, arch.torsoWBot * 1.28, legL * 0.72, 8, 1, false);
  hipsParts.push(placeGeom(loinBase, tanFur, 0, -legL * 0.22, 0));

  // White/tan fur tufts around waist
  const tuftWedge = buildWedgeGeom(arch.torsoWBot * 0.28, legL * 0.42, arch.torsoWBot * 0.18, 0.02);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    hipsParts.push(
      placeGeom(
        tuftWedge,
        i % 2 === 0 ? whiteTuft : tanFur,
        Math.sin(a) * arch.torsoWBot * 1.02,
        -legL * 0.35,
        Math.cos(a) * arch.torsoWBot * 0.82,
        Math.PI,
        a,
        0
      )
    );
  }
  if (arch.hasRobe) {
    const skirt = new THREE.CylinderGeometry(arch.torsoWBot * 1.08, arch.torsoWBot * 1.75, legL * 1.55, 8, 1, true);
    hipsParts.push(placeGeom(skirt, robeHex, 0, -legL * 0.75, 0));
  }
  if (arch.hasSkullBelt) {
    const skG = new THREE.IcosahedronGeometry(0.088, 1);
    const jawB = new THREE.BoxGeometry(0.075, 0.05, 0.07);
    for (let i = -2; i <= 2; i++) {
      const ang = i * 0.42;
      const sx = Math.sin(ang) * arch.torsoWBot * 1.08;
      const sz = Math.cos(ang) * arch.torsoWBot * 0.78;
      hipsParts.push(placeGeom(skG, boneWhite, sx, 0.02, sz));
      hipsParts.push(placeGeom(jawB, boneWhite, sx, -0.04, sz + 0.03));
    }
  }
  const hipsGeom = mergeGeoms(hipsParts);

  // 2. TORSO + CHEST (Lean muscular ribcage + chest strap / bone necklace / spiked collar / quiver / banner pole)
  const torsoSkinParts = [
    placeGeom(
      buildTorsoGeom(arch.torsoWTop, arch.torsoWBot, torsoH, arch.torsoWTop * 0.68, arch.torsoWBot * 0.65, 0.04),
      skinWhite,
      0, 0, 0, 0, 0, 0, 1, 1, 1, 0.82
    )
  ];
  // Sculpted rib ridges on goblin/chief chest
  const ribG = new THREE.CylinderGeometry(0.014, 0.014, arch.torsoWTop * 0.85, 5);
  for (let r = 0; r < 3; r++) {
    const ry = torsoH * (0.28 + r * 0.14);
    const rz = arch.torsoWTop * 0.56;
    torsoSkinParts.push(placeGeom(ribG, 0xd8d8d8, arch.torsoWTop * 0.25, ry, rz, 0, 0.35, Math.PI * 0.42));
    torsoSkinParts.push(placeGeom(ribG, 0xd8d8d8, -arch.torsoWTop * 0.25, ry, rz, 0, -0.35, -Math.PI * 0.42));
  }
  // Pectoral slabs
  const pecG = new THREE.BoxGeometry(arch.torsoWTop * 0.75, torsoH * 0.24, arch.torsoWTop * 0.45);
  torsoSkinParts.push(placeGeom(pecG, skinWhite, arch.torsoWTop * 0.36, torsoH * 0.74, arch.torsoWTop * 0.42, 0.15, 0.18, -0.08));
  torsoSkinParts.push(placeGeom(pecG, skinWhite, -arch.torsoWTop * 0.36, torsoH * 0.74, arch.torsoWTop * 0.42, 0.15, -0.18, 0.08));

  const torsoSkinGeom = mergeGeoms(torsoSkinParts);

  const chestGearParts = [];
  if (!arch.hasRobe && !arch.isBoss) {
    const strap = new THREE.TorusGeometry(arch.torsoWTop * 0.82, 0.022, 5, 10);
    chestGearParts.push(placeGeom(strap, darkLeather, 0, torsoH * 0.62, 0.02, 0.5, 0.6, 0.7));
    const buckle = new THREE.BoxGeometry(0.055, 0.055, 0.03);
    chestGearParts.push(placeGeom(buckle, goldHex, 0, torsoH * 0.62, arch.torsoWTop * 0.68));
  }
  if (arch.hasChestPlate) {
    const plate = new THREE.BoxGeometry(arch.torsoWTop * 0.95, torsoH * 0.70, 0.08);
    chestGearParts.push(placeGeom(plate, darkIron, 0, torsoH * 0.55, arch.torsoWTop * 0.42));
  }
  if (arch.hasBoneNecklace) {
    const neckRing = new THREE.TorusGeometry(arch.torsoWTop * 0.66, 0.018, 5, 8);
    chestGearParts.push(placeGeom(neckRing, darkLeather, 0, torsoH * 0.88, 0.04, 1.25, 0, 0));
    const fang = buildWedgeGeom(0.022, 0.085, 0.022, 0.01);
    for (let i = -2; i <= 2; i++) {
      chestGearParts.push(
        placeGeom(fang, boneWhite, i * 0.045, torsoH * 0.78, arch.torsoWTop * 0.66, Math.PI * 0.88, 0, i * 0.12)
      );
    }
  }
  if (arch.hasSpikedCollar) {
    const col = new THREE.TorusGeometry(arch.torsoWTop * 0.56, 0.048, 6, 10);
    chestGearParts.push(placeGeom(col, darkIron, 0, torsoH * 0.92, 0.02, 1.45, 0, 0));
    const cSpike = new THREE.ConeGeometry(0.028, 0.11, 4);
    for (let i = -2; i <= 2; i++) {
      const a = i * 0.55;
      chestGearParts.push(
        placeGeom(cSpike, boneWhite, Math.sin(a) * arch.torsoWTop * 0.6, torsoH * 0.95, Math.cos(a) * arch.torsoWTop * 0.55, 0.7, a, 0)
      );
    }
  }
  if (arch.hasQuiver) {
    const quiv = new THREE.CylinderGeometry(0.055, 0.045, 0.38, 6);
    chestGearParts.push(placeGeom(quiv, darkLeather, -0.08, torsoH * 0.70, -0.15, 0, 0, -0.38));
    const shaft = new THREE.CylinderGeometry(0.007, 0.007, 0.24, 4);
    const fletch = new THREE.BoxGeometry(0.028, 0.06, 0.008);
    for (let i = 0; i < 3; i++) {
      const ox = -0.13 + i * 0.025;
      const oy = torsoH * 0.90 + (i % 2) * 0.03;
      chestGearParts.push(placeGeom(shaft, woodHex, ox, oy, -0.15, 0.1 * i, 0, -0.35));
      chestGearParts.push(placeGeom(fletch, whiteTuft, ox - 0.03, oy + 0.08, -0.15, 0, 0, -0.35));
    }
  }
  if (arch.hasBanner) {
    const pole = new THREE.CylinderGeometry(0.018, 0.02, torsoH * 1.65, 5);
    const cross = new THREE.CylinderGeometry(0.015, 0.015, 0.38, 5);
    chestGearParts.push(placeGeom(pole, woodHex, 0, torsoH * 1.15, -arch.torsoWTop * 0.58));
    chestGearParts.push(placeGeom(cross, woodHex, 0, torsoH * 1.92, -arch.torsoWTop * 0.58, 0, 0, Math.PI * 0.5));
  }
  const chestGearGeom = chestGearParts.length > 0 ? mergeGeoms(chestGearParts) : null;

  // 3. HEAD & EXPRESSIVE GOBLIN FACE (Cranium + heavy brow ridges + flat wide nose + pointed ears + gold ring + upper fangs + 10 spiky hair wedges / hood / horned helm)
  const headSkinParts = [];
  const cranium = new THREE.IcosahedronGeometry(hScale * 0.50, 1);
  cranium.scale(1.16, 0.92, 1.08);
  headSkinParts.push(placeGeom(cranium, skinWhite, 0, hScale * 0.18, 0.02));

  // Heavy angry V-shaped brow ridges over the eyes
  const brow = new THREE.BoxGeometry(hScale * 0.38, hScale * 0.095, hScale * 0.18);
  headSkinParts.push(placeGeom(brow, skinWhite, hScale * 0.19, hScale * 0.25, hScale * 0.48, 0.15, -0.22, -0.32));
  headSkinParts.push(placeGeom(brow, skinWhite, -hScale * 0.19, hScale * 0.25, hScale * 0.48, 0.15, 0.22, 0.32));

  // Wide flat hooked goblin nose + cheekbones
  const nose = buildWedgeGeom(hScale * 0.15, hScale * 0.24, hScale * 0.16, 0.02);
  headSkinParts.push(placeGeom(nose, skinWhite, 0, hScale * 0.04, hScale * 0.54, Math.PI * 0.62, 0, 0));

  const cheek = new THREE.BoxGeometry(hScale * 0.22, hScale * 0.16, hScale * 0.24);
  headSkinParts.push(placeGeom(cheek, skinWhite, hScale * 0.34, hScale * 0.05, hScale * 0.34, 0, 0.3, 0));
  headSkinParts.push(placeGeom(cheek, skinWhite, -hScale * 0.34, hScale * 0.05, hScale * 0.34, 0, -0.3, 0));

  // Big pointed swept-back goblin ears baked into head skin
  const earWedge = buildWedgeGeom(hScale * 0.17, hScale * 0.88, hScale * 0.11, -0.06);
  headSkinParts.push(
    placeGeom(earWedge, skinWhite, hScale * 0.46, hScale * 0.14, -hScale * 0.02, -0.28, -0.25, -1.28)
  );
  headSkinParts.push(
    placeGeom(earWedge, skinWhite, -hScale * 0.46, hScale * 0.14, -hScale * 0.02, -0.28, 0.25, 1.28)
  );
  const headSkinGeom = mergeGeoms(headSkinParts);

  // Head non-skin details (Upper row of sharp white fangs + gold ear ring + 10 spiky hair wedges or hood/helmet)
  const headDetailParts = [];
  // Upper row of 5 sharp white fangs hanging from upper lip
  const uFang = new THREE.ConeGeometry(hScale * 0.042, hScale * 0.13, 4);
  for (let i = -2; i <= 2; i++) {
    headDetailParts.push(
      placeGeom(
        uFang,
        boneWhite,
        i * hScale * 0.11,
        -hScale * 0.04,
        hScale * 0.47 - Math.abs(i) * hScale * 0.03,
        Math.PI,
        0,
        0
      )
    );
  }
  // Dark inner mouth cavity behind teeth so opened mouth reads clearly at 10m
  const mouthCav = new THREE.BoxGeometry(hScale * 0.52, hScale * 0.18, hScale * 0.25);
  headDetailParts.push(placeGeom(mouthCav, 0x24080c, 0, -hScale * 0.04, hScale * 0.32));

  if (arch.hasEarring) {
    const ring = new THREE.TorusGeometry(hScale * 0.095, hScale * 0.025, 5, 8);
    headDetailParts.push(placeGeom(ring, goldHex, hScale * 0.78, hScale * 0.02, -hScale * 0.06, 0.3, 0.4, 0));
  }

  if (arch.hasHair) {
    // 10 layered black spiky wedges swept back from forehead and down the neck
    const spike = buildWedgeGeom(hScale * 0.18, hScale * 0.68, hScale * 0.14, -0.08);
    const hairTransforms = [
      // Crown row swept sharply back
      [0, 0.36, 0.12, -1.25, 0, 0, 1.1],
      [0.18, 0.34, 0.08, -1.22, 0.28, -0.32, 1.0],
      [-0.18, 0.34, 0.08, -1.22, -0.28, 0.32, 1.0],
      [0.32, 0.26, 0.0, -1.15, 0.48, -0.62, 0.9],
      [-0.32, 0.26, 0.0, -1.15, -0.48, 0.62, 0.9],
      // Middle wild layer
      [0, 0.30, -0.14, -1.58, 0, 0, 1.2],
      [0.22, 0.26, -0.16, -1.52, 0.35, -0.38, 1.05],
      [-0.22, 0.26, -0.16, -1.52, -0.35, 0.38, 1.05],
      // Nape/neck layer pointing down-back
      [0.12, 0.12, -0.26, -1.95, 0.18, -0.2, 0.95],
      [-0.12, 0.12, -0.26, -1.95, -0.18, 0.2, 0.95]
    ];
    for (const [hx, hy, hz, rx, ry, rz, sc] of hairTransforms) {
      headDetailParts.push(
        placeGeom(spike, hairBlack, hx * hScale, hy * hScale, hz * hScale, rx, ry, rz, sc, sc, sc, 0.75)
      );
    }
  }

  if (arch.hasHood || arch.hasPointedHood) {
    const hoodH = arch.hasPointedHood ? hScale * 1.48 : hScale * 1.08;
    const hood = new THREE.ConeGeometry(hScale * 0.72, hoodH, 7, 1, true);
    headDetailParts.push(
      placeGeom(hood, arch.hasPointedHood ? robeHex : darkLeather, 0, hoodH * 0.38, -0.02, 0.22, 0, 0)
    );
  }

  if (arch.hasHelm) {
    const helm = new THREE.CylinderGeometry(hScale * 0.56, hScale * 0.60, hScale * 0.54, 8, 1);
    const noseGuard = new THREE.BoxGeometry(hScale * 0.12, hScale * 0.38, hScale * 0.08);
    const horn = buildWedgeGeom(hScale * 0.16, hScale * 0.78, hScale * 0.16, 0.16);
    headDetailParts.push(placeGeom(helm, darkIron, 0, hScale * 0.34, 0));
    headDetailParts.push(placeGeom(noseGuard, darkIron, 0, hScale * 0.18, hScale * 0.56));
    headDetailParts.push(placeGeom(horn, darkIron, hScale * 0.46, hScale * 0.42, 0, 0, 0, -0.88));
    headDetailParts.push(placeGeom(horn, darkIron, -hScale * 0.46, hScale * 0.42, 0, 0, 0, 0.88));
  }
  const headDetailGeom = mergeGeoms(headDetailParts);

  // Glowing narrow slanted eyes merged into 1 geometry
  const eyeBox = new THREE.BoxGeometry(hScale * 0.23, hScale * 0.075, hScale * 0.09);
  const eyesGeom = mergeGeoms([
    placeGeom(eyeBox, 0xff2a2a, hScale * 0.20, hScale * 0.15, hScale * 0.49, 0, 0.18, -0.26, 1, 1, 1, 1.0),
    placeGeom(eyeBox, 0xff2a2a, -hScale * 0.20, hScale * 0.15, hScale * 0.49, 0, -0.18, 0.26, 1, 1, 1, 1.0)
  ]);

  // 4. JAW (Lower jaw + 2 large curved lower tusks + lower fang row + long red swaying tongue)
  const jawParts = [];
  const jawBox = new THREE.BoxGeometry(hScale * 0.68, hScale * 0.26, hScale * 0.56);
  jawParts.push(placeGeom(jawBox, arch.skinHex, 0, -hScale * 0.07, hScale * 0.14));

  // Two prominent curved lower tusks rising from the jaw
  const tuskLen = arch.isBoss ? hScale * 0.48 : hScale * 0.34;
  const tuskG = buildWedgeGeom(hScale * 0.085, tuskLen, hScale * 0.085, -0.04);
  jawParts.push(placeGeom(tuskG, boneWhite, hScale * 0.26, 0.0, hScale * 0.36, 0.15, 0, -0.08));
  jawParts.push(placeGeom(tuskG, boneWhite, -hScale * 0.26, 0.0, hScale * 0.36, 0.15, 0, 0.08));

  // Lower row of 4 sharp white fangs between tusks
  const lFang = new THREE.ConeGeometry(hScale * 0.036, hScale * 0.11, 4);
  for (let i = -1.5; i <= 1.5; i += 1) {
    jawParts.push(placeGeom(lFang, boneWhite, i * hScale * 0.11, 0.02, hScale * 0.38));
  }
  const jawGeom = mergeGeoms(jawParts);

  const tongueGeom = paintGeom(
    buildWedgeGeom(hScale * 0.15, hScale * 0.44, hScale * 0.065, 0.06),
    tongueRed,
    0.8
  );

  // 5. ARMS (Upper arm + shoulder plates; Forearm wrapped bandages + hands + weapons merged!)
  const uArmBase = buildTaperedLimbGeom(arch.torsoWTop * 0.35, arch.torsoWTop * 0.26, armL, 7, true);
  const uArmLParts = [placeGeom(uArmBase, arch.skinHex, 0, 0, 0)];
  const uArmRParts = [placeGeom(uArmBase, arch.skinHex, 0, 0, 0)];

  if (arch.shoulderL || armorTier >= 1) {
    const pad = new THREE.SphereGeometry(arch.torsoWTop * 0.54, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const pSpike = new THREE.ConeGeometry(arch.torsoWTop * 0.12, arch.torsoWTop * 0.38, 4);
    uArmLParts.push(placeGeom(pad, darkIron, 0.03, 0.02, 0, 0, 0, -0.38));
    uArmLParts.push(placeGeom(pSpike, boneWhite, arch.torsoWTop * 0.36, arch.torsoWTop * 0.32, 0, 0, 0, -0.65));
    if (arch.shoulderR || armorTier >= 2) {
      uArmRParts.push(placeGeom(pad, darkIron, -0.03, 0.02, 0, 0, 0, 0.38));
      uArmRParts.push(placeGeom(pSpike, boneWhite, -arch.torsoWTop * 0.36, arch.torsoWTop * 0.32, 0, 0, 0, 0.65));
    }
  }
  const uArmLGeom = mergeGeoms(uArmLParts);
  const uArmRGeom = mergeGeoms(uArmRParts);

  // Forearms + hands + weapons merged directly per elbow pivot to eliminate extra draw calls
  const fArmBase = buildTaperedLimbGeom(arch.torsoWTop * 0.29, arch.torsoWTop * 0.22, armL * 0.95, 7, true);
  const handBox = new THREE.BoxGeometry(armL * 0.28, armL * 0.28, armL * 0.32);
  const fArmLParts = [
    placeGeom(fArmBase, darkLeather, 0, 0, 0),
    placeGeom(handBox, arch.skinHex, 0, -armL * 0.95, 0.02)
  ];
  const fArmRParts = [
    placeGeom(fArmBase, darkLeather, 0, 0, 0),
    placeGeom(handBox, arch.skinHex, 0, -armL * 0.95, 0.02)
  ];

  const handY = -armL * 0.95;
  if (type === 'goblin_grunt') {
    if (wVariant === 'dualKnives') {
      const knife = buildSickleKnifeGeom();
      fArmRParts.push(placeGeom(knife, 0xffffff, 0, handY, 0.04, 0, 0, 0, 1, 1, 1, 1.0));
      fArmLParts.push(placeGeom(knife, 0xffffff, 0, handY, 0.04, 0, 0, 0, 1, 1, 1, 1.0));
    } else if (wVariant === 'knifeShield') {
      const knife = buildSickleKnifeGeom();
      const shield = buildPlankShieldGeom();
      fArmRParts.push(placeGeom(knife, 0xffffff, 0, handY, 0.04, 0, 0, 0, 1, 1, 1, 1.0));
      fArmLParts.push(placeGeom(shield, 0xffffff, 0.03, -armL * 0.45, 0.04, 0, 0, 0, 1, 1, 1, 1.0));
    } else if (wVariant === 'club') {
      const club = buildLatheClubGeom();
      fArmRParts.push(placeGeom(club, 0xffffff, 0, handY, 0.04, 0, 0, 0, 1, 1, 1, 1.0));
    }
  } else if (type === 'goblin_archer' || type === 'orc_archer') {
    const bow = new THREE.TorusGeometry(0.32, 0.022, 5, 10, Math.PI * 0.88);
    fArmLParts.push(placeGeom(bow, woodHex, 0, handY, 0.04, 0, Math.PI * 0.5, -Math.PI * 0.44));
  } else if (type === 'goblin_shaman') {
    const staff = new THREE.CylinderGeometry(0.022, 0.018, 1.38, 6);
    const skullTop = new THREE.IcosahedronGeometry(0.055, 1);
    fArmRParts.push(placeGeom(staff, boneWhite, 0, handY + 0.15, 0.12, 0.25, 0, 0));
    fArmRParts.push(placeGeom(skullTop, boneWhite, 0, handY + 0.72, 0.26));
  } else if (type === 'goblin_leader' || type === 'orc_warrior' || type === 'orc_berserker' || type === 'orc_lord') {
    const sc = arch.height / 1.7;
    const haft = new THREE.CylinderGeometry(0.024 * sc, 0.022 * sc, 0.88 * sc, 6);
    const blade = buildWedgeGeom(0.04 * sc, 0.32 * sc, 0.28 * sc, 0.04);
    fArmRParts.push(placeGeom(haft, woodHex, 0, handY, 0.26 * sc, Math.PI * 0.5, 0, 0));
    fArmRParts.push(placeGeom(blade, darkIron, 0, handY - 0.16 * sc, 0.58 * sc, 0, 0, 0));
  } else if (type === 'hobgoblin_chief') {
    const cleaver = buildCleaverGeom();
    fArmRParts.push(placeGeom(cleaver, 0xffffff, 0, handY, 0.05, 0, 0, 0, 1, 1, 1, 1.0));
  }

  const fArmLGeom = mergeGeoms(fArmLParts);
  const fArmRGeom = mergeGeoms(fArmRParts);

  // 6. LEGS (Thighs & Calves with clawed bare feet merged into calf)
  const thighGeom = paintGeom(
    buildTaperedLimbGeom(arch.torsoWBot * 0.48, arch.torsoWBot * 0.34, legL, 7, true),
    skinWhite,
    0.85
  );

  const calfBase = buildTaperedLimbGeom(arch.torsoWBot * 0.35, arch.torsoWBot * 0.25, legL * 0.92, 7, true);
  const footBox = new THREE.BoxGeometry(arch.torsoWBot * 0.44, legL * 0.20, legL * 0.65);
  const claw = new THREE.ConeGeometry(arch.torsoWBot * 0.08, legL * 0.18, 4);
  const calfParts = [
    placeGeom(calfBase, arch.skinHex, 0, 0, 0),
    placeGeom(footBox, arch.skinHex, 0, -legL * 0.95, legL * 0.16)
  ];
  for (let c = -1; c <= 1; c++) {
    calfParts.push(
      placeGeom(
        claw,
        boneWhite,
        c * arch.torsoWBot * 0.13,
        -legL * 0.98,
        legL * 0.52,
        Math.PI * 0.48,
        0,
        0
      )
    );
  }
  const calfGeom = mergeGeoms(calfParts);

  // Build single merged inverted-hull outline geometries per limb group
  const bundle = {
    hipsGeom,
    hipsOl: buildInvertedHullGeom(hipsGeom, 0.009),
    torsoSkinGeom,
    torsoOl: buildInvertedHullGeom(torsoSkinGeom, 0.011),
    chestGearGeom,
    headSkinGeom,
    headOl: buildInvertedHullGeom(headSkinGeom, 0.010),
    headDetailGeom,
    eyesGeom,
    jawGeom,
    jawOl: buildInvertedHullGeom(jawGeom, 0.008),
    tongueGeom,
    uArmLGeom,
    uArmLOl: buildInvertedHullGeom(uArmLGeom, 0.009),
    uArmRGeom,
    uArmROl: buildInvertedHullGeom(uArmRGeom, 0.009),
    fArmLGeom,
    fArmLOl: buildInvertedHullGeom(fArmLGeom, 0.009),
    fArmRGeom,
    fArmROl: buildInvertedHullGeom(fArmRGeom, 0.009),
    thighGeom,
    thighOl: buildInvertedHullGeom(thighGeom, 0.009),
    calfGeom,
    calfOl: buildInvertedHullGeom(calfGeom, 0.009)
  };

  CACHES.geoms.set(cacheKey, bundle);
  return bundle;
}


// ============================================================================
// PRAIRIE WOLF PROCEDURAL ART (Task A02b - Argon)
// ============================================================================

const WOLF_ART_CACHE = {
  initialized: false,
  gradientTex: null,
  furMat: null,
  outlineMat: null,
  eyeMat: null,
  geomsBody: {},
  geomsOutlined: {},
  outlineShells: {},
};

function getPrairieWolfAssets() {
  if (WOLF_ART_CACHE.initialized) {
    return WOLF_ART_CACHE;
  }

  const gradData = new Uint8Array([
    64, 64, 64, 255,
    124, 124, 124, 255,
    190, 190, 190, 255,
    255, 255, 255, 255,
  ]);
  const gradientTex = new THREE.DataTexture(gradData, 4, 1, THREE.RGBAFormat);
  gradientTex.minFilter = THREE.NearestFilter;
  gradientTex.magFilter = THREE.NearestFilter;
  gradientTex.generateMipmaps = false;
  gradientTex.needsUpdate = true;

  const furMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    gradientMap: gradientTex,
    vertexColors: true,
  });

  const outlineMat = new THREE.MeshBasicMaterial({
    color: 0x14101c,
    side: THREE.BackSide,
  });

  const eyeMat = new THREE.MeshBasicMaterial({
    color: 0xffd23a,
    vertexColors: true,
  });

  const C_FUR_DARK = 0x4a4d55;
  const C_FUR_DEEP = 0x353840;
  const C_FUR_PAW = 0x24262c;
  const C_FUR_LIGHT = 0x7c808c;
  const C_EAR_INNER = 0x9fa5b3;
  const C_NOSE = 0x16161c;
  const C_FANG = 0xd8d0bc;
  const C_GUM = 0x78262e;
  const C_SCAR = 0x7e242b;
  const C_OUTLINE = 0x14101c;
  const C_EYE = 0xffd23a;
  const C_STREAK = 0xffb82e;

  function rgb(hex) {
    return [
      ((hex >> 16) & 255) / 255,
      ((hex >> 8) & 255) / 255,
      (hex & 255) / 255,
    ];
  }

  function colorizeGeom(geom, baseHex, bellyHex = null, bellyY = -99, topHex = null, topY = 99) {
    const g = geom.index ? geom.toNonIndexed() : geom.clone();
    g.computeVertexNormals();
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    const count = pos.count;
    const col = new Float32Array(count * 3);
    const cBase = rgb(baseHex);
    const cBelly = bellyHex !== null ? rgb(bellyHex) : null;
    const cTop = topHex !== null ? rgb(topHex) : null;

    for (let i = 0; i < count; i++) {
      const vy = pos.getY(i);
      const ny = norm.getY(i);
      let r = cBase[0];
      let gr = cBase[1];
      let b = cBase[2];

      const shade = 0.92 + Math.max(-0.5, Math.min(1.0, ny)) * 0.12;
      r *= shade;
      gr *= shade;
      b *= shade;

      if (cBelly && (vy < bellyY || ny < -0.25)) {
        const t = Math.max(0, Math.min(1, (bellyY - vy) * 4.5 + Math.max(0, -ny - 0.2) * 0.75));
        r = r + (cBelly[0] - r) * t;
        gr = gr + (cBelly[1] - gr) * t;
        b = b + (cBelly[2] - b) * t;
      }

      if (cTop && vy > topY) {
        const t = Math.max(0, Math.min(1, (vy - topY) * 5.0));
        r = r + (cTop[0] - r) * t;
        gr = gr + (cTop[1] - gr) * t;
        b = b + (cTop[2] - b) * t;
      }

      col[i * 3] = Math.max(0, Math.min(1, r));
      col[i * 3 + 1] = Math.max(0, Math.min(1, gr));
      col[i * 3 + 2] = Math.max(0, Math.min(1, b));
    }

    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    for (const k of Object.keys(g.attributes)) {
      if (k !== 'position' && k !== 'normal' && k !== 'color') {
        g.deleteAttribute(k);
      }
    }
    return g;
  }

  function joinGeoms(list) {
    let totalVerts = 0;
    for (let i = 0; i < list.length; i++) {
      totalVerts += list[i].attributes.position.count;
    }
    const pos = new Float32Array(totalVerts * 3);
    const norm = new Float32Array(totalVerts * 3);
    const col = new Float32Array(totalVerts * 3);
    let offset = 0;
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      const p = g.attributes.position.array;
      const n = g.attributes.normal.array;
      const c = g.attributes.color.array;
      pos.set(p, offset);
      norm.set(n, offset);
      col.set(c, offset);
      offset += p.length;
      g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return out;
  }

  function appendInvertedOutline(baseGeom, scale = 1.03) {
    const hull = baseGeom.clone();
    const pos = hull.attributes.position;
    const norm = hull.attributes.normal;
    const count = pos.count;
    const thickness = (scale - 1.0) * 0.42;

    for (let i = 0; i < count; i++) {
      const nx = norm.getX(i);
      const ny = norm.getY(i);
      const nz = norm.getZ(i);
      pos.setXYZ(
        i,
        pos.getX(i) * scale + nx * thickness,
        pos.getY(i) * scale + ny * thickness,
        pos.getZ(i) * scale + nz * thickness
      );
      norm.setXYZ(i, -nx, -ny, -nz);
    }

    for (let i = 0; i < count; i += 3) {
      const i1 = i + 1;
      const i2 = i + 2;
      const tx = pos.getX(i1), ty = pos.getY(i1), tz = pos.getZ(i1);
      pos.setXYZ(i1, pos.getX(i2), pos.getY(i2), pos.getZ(i2));
      pos.setXYZ(i2, tx, ty, tz);

      const tnx = norm.getX(i1), tny = norm.getY(i1), tnz = norm.getZ(i1);
      norm.setXYZ(i1, norm.getX(i2), norm.getY(i2), norm.getZ(i2));
      norm.setXYZ(i2, tnx, tny, tnz);
    }

    const col = new Float32Array(count * 3);
    const cOut = rgb(C_OUTLINE);
    for (let i = 0; i < count; i++) {
      col[i * 3] = cOut[0];
      col[i * 3 + 1] = cOut[1];
      col[i * 3 + 2] = cOut[2];
    }
    hull.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return joinGeoms([baseGeom.clone(), hull]);
  }

  function makeFurWedge(w, h, len, x, y, z, rx, ry, rz, hex = C_FUR_DEEP) {
    const cone = new THREE.ConeGeometry(w, h, 4);
    cone.scale(0.65, 1.0, len / Math.max(0.01, w));
    cone.rotateX(rx);
    cone.rotateY(ry);
    cone.rotateZ(rz);
    cone.translate(x, y, z);
    return colorizeGeom(cone, hex);
  }

  function registerPart(name, bodyGeom, withEmbeddedOutline = true) {
    WOLF_ART_CACHE.geomsBody[name] = bodyGeom;
    WOLF_ART_CACHE.geomsOutlined[name] = withEmbeddedOutline
      ? appendInvertedOutline(bodyGeom, 1.03)
      : bodyGeom;
  }

  // 1. HIPS (pelvis + muscular hindquarters + spine wedges)
  {
    const parts = [];
    const pelvis = new THREE.CylinderGeometry(0.19, 0.21, 0.46, 8, 2);
    pelvis.scale(1.05, 0.96, 1.0);
    pelvis.rotateX(Math.PI * 0.52);
    pelvis.translate(0, 0.0, 0.02);
    parts.push(colorizeGeom(pelvis, C_FUR_DARK, C_FUR_LIGHT, -0.06, C_FUR_DEEP, 0.12));

    for (let i = 0; i < 3; i++) {
      parts.push(
        makeFurWedge(0.07, 0.14, 0.11, 0, 0.19 - i * 0.01, 0.14 - i * 0.13, -0.85, 0, 0, C_FUR_DEEP)
      );
    }
    registerPart('hips', joinGeoms(parts), true);
  }

  // 2. TORSO (tucked athletic flank bridging hips to chest + dorsal fur ridge)
  {
    const parts = [];
    const flank = new THREE.CylinderGeometry(0.23, 0.18, 0.62, 8, 2);
    flank.scale(0.95, 0.92, 1.0);
    flank.rotateX(Math.PI * 0.48);
    flank.translate(0, 0.02, -0.12);
    parts.push(colorizeGeom(flank, C_FUR_DARK, C_FUR_LIGHT, -0.05, C_FUR_DEEP, 0.12));

    for (let i = 0; i < 4; i++) {
      parts.push(
        makeFurWedge(0.075, 0.16, 0.12, 0, 0.21 + i * 0.012, -0.34 + i * 0.15, -0.82, 0, 0, C_FUR_DEEP)
      );
    }
    registerPart('torso', joinGeoms(parts), true);
  }

  // 3. CHEST (broad muscular ribcage + spiky manhwa shoulder mane + pale throat/chest patch)
  {
    const parts = [];
    const ribcage = new THREE.CylinderGeometry(0.24, 0.26, 0.56, 8, 2);
    ribcage.scale(1.08, 1.04, 1.0);
    ribcage.rotateX(Math.PI * 0.46);
    ribcage.translate(0, -0.01, -0.02);
    parts.push(colorizeGeom(ribcage, C_FUR_DARK, C_FUR_LIGHT, -0.06, C_FUR_DEEP, 0.15));

    const breast = new THREE.ConeGeometry(0.18, 0.28, 6);
    breast.scale(1.0, 1.0, 0.85);
    breast.rotateX(Math.PI * 0.68);
    breast.translate(0, -0.05, 0.24);
    parts.push(colorizeGeom(breast, C_FUR_LIGHT));

    // Spiky shoulder and upper-back fur mane wedges
    const maneSpecs = [
      [0.0, 0.27, 0.08, -0.85, 0, 0],
      [0.0, 0.25, -0.08, -0.9, 0, 0],
      [0.16, 0.20, 0.04, -0.75, 0.35, -0.48],
      [-0.16, 0.20, 0.04, -0.75, -0.35, 0.48],
      [0.24, 0.08, 0.02, -0.65, 0.45, -0.82],
      [-0.24, 0.08, 0.02, -0.65, -0.45, 0.82],
      [0.19, -0.04, 0.16, -0.55, 0.4, -0.75],
      [-0.19, -0.04, 0.16, -0.55, -0.4, 0.75],
    ];
    for (let i = 0; i < maneSpecs.length; i++) {
      const m = maneSpecs[i];
      parts.push(makeFurWedge(0.09, 0.22, 0.14, m[0], m[1], m[2], m[3], m[4], m[5], C_FUR_DEEP));
    }

    const chestGeom = joinGeoms(parts);
    registerPart('chest', chestGeom, true);
    WOLF_ART_CACHE.outlineShells.chest = chestGeom;
  }

  // 4. NECK (muscular angled wolf neck + spiky ruff collar)
  {
    const parts = [];
    const neckCyl = new THREE.CylinderGeometry(0.15, 0.20, 0.34, 7, 1);
    neckCyl.rotateX(Math.PI * 0.32);
    neckCyl.translate(0, 0.05, 0.10);
    parts.push(colorizeGeom(neckCyl, C_FUR_DARK, C_FUR_LIGHT, 0.0, C_FUR_DEEP, 0.12));

    const ruffSpecs = [
      [0.0, 0.17, 0.04, -0.95, 0, 0],
      [0.13, 0.12, 0.05, -0.8, 0.35, -0.55],
      [-0.13, 0.12, 0.05, -0.8, -0.35, 0.55],
      [0.16, 0.02, 0.08, -0.65, 0.48, -0.88],
      [-0.16, 0.02, 0.08, -0.65, -0.48, 0.88],
    ];
    for (let i = 0; i < ruffSpecs.length; i++) {
      const r = ruffSpecs[i];
      parts.push(makeFurWedge(0.08, 0.19, 0.12, r[0], r[1], r[2], r[3], r[4], r[5], C_FUR_DEEP));
    }
    registerPart('neck', joinGeoms(parts), true);
  }

  // 5. HEAD (angular wolf cranium, cheek spikes, snarling snout, scars, fangs & teeth)
  {
    const parts = [];

    const cranium = new THREE.BoxGeometry(0.26, 0.21, 0.24, 2, 2, 2).toNonIndexed();
    const cPos = cranium.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      let vx = cPos.getX(i);
      let vy = cPos.getY(i);
      let vz = cPos.getZ(i);
      if (vz > 0) {
        vx *= 0.84;
        vy *= 0.88;
      }
      if (vy > 0) {
        vx *= 0.88;
      }
      cPos.setXYZ(i, vx, vy + 0.02, vz + 0.02);
    }
    parts.push(colorizeGeom(cranium, C_FUR_DARK, C_FUR_LIGHT, -0.05, C_FUR_DEEP, 0.08));

    // Snarling tapered upper muzzle
    const snout = new THREE.BoxGeometry(0.16, 0.12, 0.30, 2, 1, 2).toNonIndexed();
    const sPos = snout.attributes.position;
    for (let i = 0; i < sPos.count; i++) {
      let vx = sPos.getX(i);
      let vy = sPos.getY(i);
      let vz = sPos.getZ(i);
      const t = (vz + 0.15) / 0.30;
      vx *= 1.0 - t * 0.34;
      vy *= 1.0 - t * 0.28;
      if (vy > 0) {
        vy += Math.sin(t * Math.PI) * 0.015;
      }
      sPos.setXYZ(i, vx, vy - 0.01, vz + 0.26);
    }
    parts.push(colorizeGeom(snout, C_FUR_DARK, C_FUR_LIGHT, -0.02, C_FUR_LIGHT, 0.03));

    // Black nose tip
    const nose = new THREE.BoxGeometry(0.075, 0.055, 0.055);
    nose.rotateX(0.18);
    nose.translate(0, 0.015, 0.42);
    parts.push(colorizeGeom(nose, C_NOSE));

    // Jagged cheek ruffs (left and right)
    for (const side of [-1, 1]) {
      parts.push(
        makeFurWedge(0.065, 0.16, 0.10, side * 0.14, 0.01, -0.02, -0.45, side * 0.55, -side * 1.1, C_FUR_DEEP),
        makeFurWedge(0.06, 0.14, 0.09, side * 0.13, -0.05, 0.04, -0.35, side * 0.45, -side * 1.25, C_FUR_LIGHT),
        makeFurWedge(0.055, 0.13, 0.08, side * 0.09, 0.11, -0.08, -0.85, side * 0.25, -side * 0.35, C_FUR_DEEP)
      );
    }

    // Battle scars across left brow and snout bridge
    const scar1 = new THREE.BoxGeometry(0.016, 0.014, 0.15);
    scar1.rotateY(-0.28);
    scar1.rotateX(0.24);
    scar1.translate(0.068, 0.068, 0.15);
    parts.push(colorizeGeom(scar1, C_SCAR));

    const scar2 = new THREE.BoxGeometry(0.11, 0.014, 0.016);
    scar2.rotateZ(-0.22);
    scar2.translate(0.02, 0.046, 0.26);
    parts.push(colorizeGeom(scar2, C_SCAR));

    // Long curved ivory fangs protruding from upper jaw + sharp upper incisors
    for (const side of [-1, 1]) {
      const fang = new THREE.ConeGeometry(0.022, 0.125, 5);
      fang.rotateX(Math.PI - 0.16);
      fang.rotateZ(side * 0.06);
      fang.translate(side * 0.056, -0.095, 0.31);
      parts.push(colorizeGeom(fang, C_FANG));

      const premolar = new THREE.ConeGeometry(0.014, 0.055, 4);
      premolar.rotateX(Math.PI);
      premolar.translate(side * 0.052, -0.068, 0.24);
      parts.push(colorizeGeom(premolar, C_FANG));

      const incisor = new THREE.ConeGeometry(0.011, 0.042, 4);
      incisor.rotateX(Math.PI - 0.1);
      incisor.translate(side * 0.022, -0.065, 0.37);
      parts.push(colorizeGeom(incisor, C_FANG));
    }

    const headGeom = joinGeoms(parts);
    registerPart('head', headGeom, true);
    WOLF_ART_CACHE.outlineShells.head = headGeom;
  }

  // 6. EYES & GOLDEN STREAK MARKINGS
  {
    const parts = [];
    for (const side of [-1, 1]) {
      const eye = new THREE.BoxGeometry(0.036, 0.024, 0.048);
      eye.rotateY(side * 0.38);
      eye.rotateZ(-side * 0.26);
      eye.translate(side * 0.088, 0.036, 0.145);
      parts.push(colorizeGeom(eye, C_EYE));

      const streak1 = new THREE.ConeGeometry(0.018, 0.16, 4);
      streak1.scale(0.65, 1.0, 0.45);
      streak1.rotateX(-Math.PI * 0.38);
      streak1.rotateZ(-side * 0.28);
      streak1.translate(side * 0.098, 0.078, 0.09);
      parts.push(colorizeGeom(streak1, C_STREAK));

      const streak2 = new THREE.ConeGeometry(0.014, 0.14, 4);
      streak2.scale(0.55, 1.0, 0.45);
      streak2.rotateX(-Math.PI * 0.44);
      streak2.rotateZ(-side * 0.34);
      streak2.translate(side * 0.112, 0.115, -0.01);
      parts.push(colorizeGeom(streak2, C_EYE));
    }
    registerPart('eyes', joinGeoms(parts), false);
  }

  // 7. JAW (articulated lower jaw + tongue/gums + lower canines & teeth)
  {
    const parts = [];
    const jawBone = new THREE.BoxGeometry(0.125, 0.052, 0.25, 1, 1, 2).toNonIndexed();
    const jPos = jawBone.attributes.position;
    for (let i = 0; i < jPos.count; i++) {
      let vx = jPos.getX(i);
      let vy = jPos.getY(i);
      let vz = jPos.getZ(i);
      const t = (vz + 0.125) / 0.25;
      vx *= 1.0 - t * 0.38;
      jPos.setXYZ(i, vx, vy - 0.018, vz + 0.11);
    }
    parts.push(colorizeGeom(jawBone, C_FUR_DARK, C_FUR_LIGHT, -0.01));

    const gum = new THREE.BoxGeometry(0.09, 0.024, 0.21);
    gum.translate(0, 0.008, 0.11);
    parts.push(colorizeGeom(gum, C_GUM));

    for (const side of [-1, 1]) {
      const lFang = new THREE.ConeGeometry(0.015, 0.068, 4);
      lFang.rotateX(0.14);
      lFang.translate(side * 0.042, 0.038, 0.19);
      parts.push(colorizeGeom(lFang, C_FANG));

      const lTooth = new THREE.ConeGeometry(0.011, 0.036, 4);
      lTooth.translate(side * 0.018, 0.026, 0.22);
      parts.push(colorizeGeom(lTooth, C_FANG));
    }
    registerPart('jaw', joinGeoms(parts), true);
  }

  // 8. EAR L (torn left ear with battle notch) & EAR R (intact right ear)
  {
    function makeEar(isTornLeft) {
      const parts = [];
      const outer = new THREE.ConeGeometry(0.062, 0.21, 4).toNonIndexed();
      outer.scale(0.82, 1.0, 0.55);
      if (isTornLeft) {
        const pos = outer.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let vx = pos.getX(i);
          let vy = pos.getY(i);
          let vz = pos.getZ(i);
          if (vy > 0.02) {
            vy *= 0.78;
            vx -= 0.012;
          }
          if (vx > 0.01 && Math.abs(vy) < 0.05) {
            vx -= 0.026;
          }
          pos.setXYZ(i, vx, vy, vz);
        }
      }
      outer.rotateX(-0.18);
      outer.rotateZ(isTornLeft ? -0.22 : 0.22);
      outer.translate(0, 0.09, 0);
      parts.push(colorizeGeom(outer, C_FUR_DEEP));

      const inner = new THREE.ConeGeometry(0.038, 0.15, 3);
      inner.scale(0.75, 1.0, 0.35);
      inner.rotateX(-0.18);
      inner.rotateZ(isTornLeft ? -0.22 : 0.22);
      inner.translate(0, 0.075, 0.016);
      parts.push(colorizeGeom(inner, C_EAR_INNER));

      return joinGeoms(parts);
    }

    registerPart('earL', makeEar(true), true);
    registerPart('earR', makeEar(false), true);
  }

  // 9. BUSHY SEGMENTED TAIL (tail1, tail2, tail3)
  {
    const t1Parts = [];
    const seg1 = new THREE.CylinderGeometry(0.068, 0.095, 0.28, 6, 1);
    seg1.rotateX(Math.PI * 0.28);
    seg1.translate(0, -0.07, -0.10);
    t1Parts.push(colorizeGeom(seg1, C_FUR_DARK, C_FUR_LIGHT, -0.08));
    t1Parts.push(makeFurWedge(0.055, 0.14, 0.08, 0, -0.04, -0.12, -1.1, 0, 0, C_FUR_DEEP));
    registerPart('tail1', joinGeoms(t1Parts), true);

    const t2Parts = [];
    const seg2 = new THREE.CylinderGeometry(0.095, 0.072, 0.30, 6, 1);
    seg2.rotateX(Math.PI * 0.28);
    seg2.translate(0, -0.08, -0.11);
    t2Parts.push(colorizeGeom(seg2, C_FUR_DARK, C_FUR_LIGHT, -0.10));
    t2Parts.push(
      makeFurWedge(0.06, 0.15, 0.09, 0.04, -0.09, -0.12, -1.05, 0.25, -0.35, C_FUR_DEEP),
      makeFurWedge(0.06, 0.15, 0.09, -0.04, -0.09, -0.12, -1.05, -0.25, 0.35, C_FUR_DEEP)
    );
    registerPart('tail2', joinGeoms(t2Parts), true);

    const t3Parts = [];
    const seg3 = new THREE.ConeGeometry(0.085, 0.32, 6, 1);
    seg3.rotateX(-Math.PI * 0.72);
    seg3.translate(0, -0.09, -0.12);
    t3Parts.push(colorizeGeom(seg3, C_FUR_DEEP, C_FUR_LIGHT, -0.12));
    registerPart('tail3', joinGeoms(t3Parts), true);
  }

  // 10. FORELEG & HINDLEG SEGMENTS + PAWS WITH CLAWS
  {
    const uFrontParts = [];
    const uFront = new THREE.CylinderGeometry(0.098, 0.064, 0.40, 7, 1);
    uFront.translate(0, -0.19, 0);
    uFrontParts.push(colorizeGeom(uFront, C_FUR_DARK, null, -99, C_FUR_DEEP, -0.05));
    uFrontParts.push(makeFurWedge(0.045, 0.13, 0.07, 0, -0.32, -0.055, -2.2, 0, 0, C_FUR_DEEP));
    registerPart('upperForeleg', joinGeoms(uFrontParts), true);

    const lFront = new THREE.CylinderGeometry(0.062, 0.046, 0.41, 6, 1);
    lFront.translate(0, -0.20, 0.01);
    registerPart('lowerForeleg', colorizeGeom(lFront, C_FUR_PAW, null, -99, C_FUR_DARK, -0.12), true);

    const uHindParts = [];
    const uHind = new THREE.CylinderGeometry(0.125, 0.072, 0.39, 7, 1);
    uHind.scale(0.92, 1.0, 1.18);
    uHind.rotateX(-0.10);
    uHind.translate(0, -0.18, 0.015);
    uHindParts.push(colorizeGeom(uHind, C_FUR_DARK, null, -99, C_FUR_DEEP, -0.05));
    uHindParts.push(makeFurWedge(0.05, 0.14, 0.08, 0, -0.24, -0.075, -2.15, 0, 0, C_FUR_DEEP));
    registerPart('upperHindleg', joinGeoms(uHindParts), true);

    const lHindParts = [];
    const shinUpper = new THREE.CylinderGeometry(0.066, 0.052, 0.21, 6, 1);
    shinUpper.rotateX(0.34);
    shinUpper.translate(0, -0.095, -0.032);
    lHindParts.push(colorizeGeom(shinUpper, C_FUR_DARK));

    const metatarsus = new THREE.CylinderGeometry(0.050, 0.044, 0.23, 6, 1);
    metatarsus.rotateX(-0.26);
    metatarsus.translate(0, -0.285, -0.032);
    lHindParts.push(colorizeGeom(metatarsus, C_FUR_PAW));
    registerPart('lowerHindleg', joinGeoms(lHindParts), true);

    const pawParts = [];
    const pad = new THREE.BoxGeometry(0.105, 0.068, 0.135);
    pad.translate(0, -0.036, 0.032);
    pawParts.push(colorizeGeom(pad, C_FUR_PAW));

    const clawOffsets = [-0.034, -0.011, 0.011, 0.034];
    for (let i = 0; i < 4; i++) {
      const claw = new THREE.ConeGeometry(0.011, 0.045, 4);
      claw.rotateX(Math.PI * 0.44);
      claw.translate(clawOffsets[i], -0.054, 0.112);
      pawParts.push(colorizeGeom(claw, C_NOSE));
    }
    registerPart('paw', joinGeoms(pawParts), true);
  }

  WOLF_ART_CACHE.gradientTex = gradientTex;
  WOLF_ART_CACHE.furMat = furMat;
  WOLF_ART_CACHE.outlineMat = outlineMat;
  WOLF_ART_CACHE.eyeMat = eyeMat;
  WOLF_ART_CACHE.initialized = true;
  return WOLF_ART_CACHE;
}

function applyPrairieWolfPose(parts, poseName, t, intensity = 1, modelState = null) {
  const info = POSE_INFO[poseName] || POSE_INFO.idle;
  const dur = info.duration || 1.0;
  const rawPhase = t / dur;
  const u = info.loop ? ((rawPhase % 1) + 1) % 1 : Math.max(0, Math.min(1, rawPhase));
  const tau = u * Math.PI * 2;
  const k = Math.max(0, Math.min(1.5, intensity));

  const shoulderH = (modelState && modelState.shoulderH) || 0.95;
  const bodyL = (modelState && modelState.bodyL) || 1.7;
  const hipH = shoulderH * 0.92;
  const baseHipsY = hipH;
  const baseHipsZ = -bodyL * 0.35;

  const jointNames = [
    'hips', 'torso', 'chest', 'neck', 'head', 'jaw',
    'earL', 'earR', 'tail1', 'tail2', 'tail3',
    'shoulderFL', 'shoulderFR', 'elbowFL', 'elbowFR', 'pawFL', 'pawFR',
    'hipBL', 'hipBR', 'kneeBL', 'kneeBR', 'pawBL', 'pawBR',
  ];
  for (let i = 0; i < jointNames.length; i++) {
    const j = parts[jointNames[i]];
    if (j) {
      j.rotation.set(0, 0, 0);
    }
  }

  parts.hips.position.set(0, baseHipsY, baseHipsZ);
  parts.torso.position.set(0, 0, bodyL * 0.35);
  parts.chest.position.set(0, shoulderH * 0.08, bodyL * 0.35);
  parts.neck.position.set(0, shoulderH * 0.15, 0.22);
  parts.head.position.set(0, 0.12, 0.25);

  parts.jaw.rotation.x = 0.08;
  parts.earL.rotation.set(0.08, 0, -0.15);
  parts.earR.rotation.set(0.08, 0, 0.15);
  parts.tail1.rotation.x = -0.18;
  parts.tail2.rotation.x = 0.12;
  parts.tail3.rotation.x = 0.16;

  function stepLegF(shoulder, elbow, paw, phase) {
    const a = phase * Math.PI * 2;
    const swing = Math.sin(a);
    const lift = Math.max(0, Math.cos(a));
    shoulder.rotation.x = -swing * 0.44 * k;
    elbow.rotation.x = (lift * 0.65 + 0.08) * k;
    paw.rotation.x = (-lift * 0.35 + swing * 0.15) * k;
  }

  function stepLegB(hip, knee, paw, phase) {
    const a = phase * Math.PI * 2;
    const swing = Math.sin(a);
    const lift = Math.max(0, Math.cos(a));
    hip.rotation.x = -swing * 0.48 * k;
    knee.rotation.x = (-lift * 0.58 - 0.06) * k;
    paw.rotation.x = (lift * 0.38 + swing * 0.14) * k;
  }

  switch (poseName) {
    case 'idle': {
      const breath = Math.sin(tau);
      parts.hips.position.y = baseHipsY + breath * 0.012 * k;
      parts.torso.rotation.x = breath * 0.025 * k;
      parts.chest.rotation.x = -breath * 0.03 * k;
      parts.neck.rotation.x = 0.06 + breath * 0.03 * k;
      parts.head.rotation.x = -0.04 - breath * 0.02 * k;
      parts.head.rotation.y = Math.sin(tau * 0.5) * 0.06 * k;
      parts.jaw.rotation.x = (0.09 + (breath * 0.5 + 0.5) * 0.05) * k;

      const twitch = Math.pow(Math.max(0, Math.sin(tau * 2.0 + 0.8)), 8);
      parts.earL.rotation.z = -0.15 - twitch * 0.32 * k;
      parts.earR.rotation.z = 0.15 + Math.pow(Math.max(0, Math.sin(tau * 1.0 - 0.5)), 10) * 0.25 * k;

      const swish = Math.sin(tau);
      parts.tail1.rotation.y = swish * 0.16 * k;
      parts.tail2.rotation.y = Math.sin(tau - 0.6) * 0.22 * k;
      parts.tail3.rotation.y = Math.sin(tau - 1.2) * 0.26 * k;
      break;
    }

    case 'walk': {
      stepLegF(parts.shoulderFL, parts.elbowFL, parts.pawFL, u);
      stepLegB(parts.hipBR, parts.kneeBR, parts.pawBR, (u + 0.25) % 1);
      stepLegF(parts.shoulderFR, parts.elbowFR, parts.pawFR, (u + 0.5) % 1);
      stepLegB(parts.hipBL, parts.kneeBL, parts.pawBL, (u + 0.75) % 1);

      const bob = Math.sin(tau * 2);
      parts.hips.position.y = baseHipsY + Math.abs(bob) * 0.028 * k;
      parts.hips.rotation.y = Math.sin(tau) * 0.05 * k;
      parts.torso.rotation.y = -Math.sin(tau) * 0.06 * k;
      parts.chest.rotation.x = bob * 0.03 * k;
      parts.neck.rotation.x = 0.12 - bob * 0.04 * k;
      parts.head.rotation.x = -0.08 + bob * 0.03 * k;
      parts.jaw.rotation.x = 0.12 * k;

      parts.tail1.rotation.x = -0.12 + bob * 0.06 * k;
      parts.tail1.rotation.y = Math.sin(tau) * 0.18 * k;
      parts.tail2.rotation.y = Math.sin(tau - 0.5) * 0.22 * k;
      parts.tail3.rotation.y = Math.sin(tau - 1.0) * 0.25 * k;
      break;
    }

    case 'run': {
      const spineWave = Math.sin(tau);
      const liftWave = Math.cos(tau);

      parts.hips.position.y = baseHipsY + (0.04 + liftWave * 0.09) * k;
      parts.hips.rotation.x = spineWave * 0.22 * k;
      parts.torso.rotation.x = -spineWave * 0.26 * k;
      parts.chest.rotation.x = -spineWave * 0.18 * k;
      parts.neck.rotation.x = (0.28 + spineWave * 0.14) * k;
      parts.head.rotation.x = (-0.22 - spineWave * 0.10) * k;
      parts.jaw.rotation.x = (0.24 + Math.max(0, spineWave) * 0.12) * k;

      parts.earL.rotation.x = -0.45 * k;
      parts.earR.rotation.x = -0.45 * k;

      const fL = tau;
      const fR = tau + 0.42;
      const bL = tau + Math.PI + 0.15;
      const bR = tau + Math.PI + 0.55;

      parts.shoulderFL.rotation.x = -Math.sin(fL) * 0.78 * k;
      parts.elbowFL.rotation.x = (Math.max(0, Math.cos(fL)) * 0.95 + 0.12) * k;
      parts.pawFL.rotation.x = -Math.cos(fL) * 0.45 * k;

      parts.shoulderFR.rotation.x = -Math.sin(fR) * 0.78 * k;
      parts.elbowFR.rotation.x = (Math.max(0, Math.cos(fR)) * 0.95 + 0.12) * k;
      parts.pawFR.rotation.x = -Math.cos(fR) * 0.45 * k;

      parts.hipBL.rotation.x = -Math.sin(bL) * 0.82 * k;
      parts.kneeBL.rotation.x = (-Math.max(0, Math.cos(bL)) * 0.88 - 0.1) * k;
      parts.pawBL.rotation.x = Math.cos(bL) * 0.48 * k;

      parts.hipBR.rotation.x = -Math.sin(bR) * 0.82 * k;
      parts.kneeBR.rotation.x = (-Math.max(0, Math.cos(bR)) * 0.88 - 0.1) * k;
      parts.pawBR.rotation.x = Math.cos(bR) * 0.48 * k;

      parts.tail1.rotation.x = (0.32 - spineWave * 0.18) * k;
      parts.tail2.rotation.x = (0.18 - liftWave * 0.16) * k;
      parts.tail3.rotation.x = (0.12 - spineWave * 0.14) * k;
      break;
    }

    case 'attack1':
    case 'attack2':
    case 'heavy': {
      if (u < 0.28) {
        const p = u / 0.28;
        parts.hips.position.z = baseHipsZ - p * 0.16 * k;
        parts.hips.position.y = baseHipsY - p * 0.10 * k;
        parts.torso.rotation.x = p * 0.14 * k;
        parts.neck.rotation.x = -p * 0.18 * k;
        parts.head.rotation.z = p * 0.24 * k;
        parts.jaw.rotation.x = (0.15 + p * 0.58) * k;
        parts.shoulderFL.rotation.x = p * 0.35 * k;
        parts.elbowFL.rotation.x = p * 0.45 * k;
        parts.shoulderFR.rotation.x = p * 0.35 * k;
        parts.elbowFR.rotation.x = p * 0.45 * k;
      } else if (u < 0.62) {
        const p = (u - 0.28) / 0.34;
        const snap = Math.sin(p * Math.PI);
        parts.hips.position.z = baseHipsZ + (-0.16 + p * 0.54) * k;
        parts.hips.position.y = baseHipsY + snap * 0.08 * k;
        parts.torso.rotation.x = -0.16 * snap * k;
        parts.chest.rotation.x = 0.18 * snap * k;
        parts.neck.rotation.x = 0.32 * snap * k;
        parts.head.rotation.x = -0.18 * snap * k;
        parts.head.rotation.z = (1 - p * 2) * 0.22 * k;
        parts.jaw.rotation.x = Math.max(0.02, (1 - Math.pow(p, 0.45)) * 0.72) * k;

        parts.shoulderFL.rotation.x = -0.52 * snap * k;
        parts.shoulderFR.rotation.x = -0.38 * snap * k;
        parts.hipBL.rotation.x = 0.48 * snap * k;
        parts.hipBR.rotation.x = 0.48 * snap * k;
      } else {
        const p = 1 - (u - 0.62) / 0.38;
        parts.hips.position.z = baseHipsZ + p * 0.38 * k;
        parts.jaw.rotation.x = (0.08 + p * 0.12) * k;
      }
      parts.earL.rotation.x = -0.55 * k;
      parts.earR.rotation.x = -0.55 * k;
      parts.tail1.rotation.x = 0.28 * k;
      break;
    }

    case 'pounce': {
      const cEnd = 0.25 / 0.9;
      const aEnd = 0.70 / 0.9;

      if (u < cEnd) {
        const p = u / cEnd;
        const ease = p * p * (3 - 2 * p);
        parts.hips.position.y = baseHipsY - ease * 0.28 * k;
        parts.hips.position.z = baseHipsZ - ease * 0.20 * k;
        parts.hips.rotation.x = ease * 0.18 * k;
        parts.torso.rotation.x = ease * 0.14 * k;
        parts.chest.rotation.x = ease * 0.12 * k;
        parts.neck.rotation.x = -ease * 0.28 * k;
        parts.head.rotation.x = -ease * 0.16 * k;
        parts.jaw.rotation.x = (0.12 + ease * 0.36) * k;

        parts.shoulderFL.rotation.x = ease * 0.58 * k;
        parts.elbowFL.rotation.x = ease * 0.92 * k;
        parts.pawFL.rotation.x = -ease * 0.65 * k;
        parts.shoulderFR.rotation.x = ease * 0.58 * k;
        parts.elbowFR.rotation.x = ease * 0.92 * k;
        parts.pawFR.rotation.x = -ease * 0.65 * k;

        parts.hipBL.rotation.x = -ease * 0.52 * k;
        parts.kneeBL.rotation.x = -ease * 0.85 * k;
        parts.pawBL.rotation.x = ease * 0.72 * k;
        parts.hipBR.rotation.x = -ease * 0.52 * k;
        parts.kneeBR.rotation.x = -ease * 0.85 * k;
        parts.pawBR.rotation.x = ease * 0.72 * k;

        parts.earL.rotation.x = -0.65 * k;
        parts.earR.rotation.x = -0.65 * k;
      } else if (u < aEnd) {
        const p = (u - cEnd) / (aEnd - cEnd);
        const arc = Math.sin(p * Math.PI);
        parts.hips.position.y = baseHipsY + (-0.28 * (1 - p) + arc * 0.56) * k;
        parts.hips.position.z = baseHipsZ + (-0.20 + p * 0.72) * k;
        parts.hips.rotation.x = (-0.32 + p * 0.64) * k;
        parts.torso.rotation.x = (-0.22 + p * 0.38) * k;
        parts.chest.rotation.x = -0.14 * arc * k;
        parts.neck.rotation.x = 0.24 * arc * k;
        parts.head.rotation.x = -0.18 * arc * k;
        parts.jaw.rotation.x = (0.35 + arc * 0.42) * k;

        parts.shoulderFL.rotation.x = (-0.92 + p * 0.25) * k;
        parts.elbowFL.rotation.x = 0.22 * k;
        parts.pawFL.rotation.x = 0.32 * k;
        parts.shoulderFR.rotation.x = (-0.86 + p * 0.25) * k;
        parts.elbowFR.rotation.x = 0.22 * k;
        parts.pawFR.rotation.x = 0.32 * k;

        parts.hipBL.rotation.x = (0.78 * arc) * k;
        parts.kneeBL.rotation.x = (-0.25 * arc) * k;
        parts.pawBL.rotation.x = (-0.55 * arc) * k;
        parts.hipBR.rotation.x = (0.78 * arc) * k;
        parts.kneeBR.rotation.x = (-0.25 * arc) * k;
        parts.pawBR.rotation.x = (-0.55 * arc) * k;

        parts.tail1.rotation.x = 0.38 * k;
        parts.tail2.rotation.x = 0.18 * k;
      } else {
        const p = (u - aEnd) / (1.0 - aEnd);
        const dip = Math.sin(p * Math.PI);
        parts.hips.position.y = baseHipsY - dip * 0.16 * k;
        parts.hips.position.z = baseHipsZ + (1 - p) * 0.52 * k;
        parts.hips.rotation.x = (1 - p) * 0.16 * k;
        parts.torso.rotation.x = dip * 0.18 * k;
        parts.jaw.rotation.x = (0.1 + (1 - p) * 0.25) * k;

        parts.shoulderFL.rotation.x = dip * 0.42 * k;
        parts.elbowFL.rotation.x = dip * 0.68 * k;
        parts.shoulderFR.rotation.x = dip * 0.42 * k;
        parts.elbowFR.rotation.x = dip * 0.68 * k;
      }
      break;
    }

    case 'windup': {
      const tremor = Math.sin(tau * 6) * 0.012;
      const pulse = Math.sin(tau);
      parts.hips.position.y = baseHipsY - (0.22 + pulse * 0.02) * k;
      parts.hips.position.z = baseHipsZ - 0.16 * k;
      parts.hips.position.x = tremor * k;
      parts.hips.rotation.x = 0.12 * k;
      parts.torso.rotation.x = 0.16 * k;
      parts.chest.rotation.x = 0.12 * k;
      parts.neck.rotation.x = -0.26 * k;
      parts.head.rotation.x = -0.14 * k;
      parts.jaw.rotation.x = (0.36 + Math.sin(tau * 3) * 0.08) * k;

      parts.earL.rotation.x = -0.68 * k;
      parts.earR.rotation.x = -0.68 * k;

      parts.shoulderFL.rotation.x = 0.48 * k;
      parts.elbowFL.rotation.x = 0.82 * k;
      parts.pawFL.rotation.x = -0.52 * k;
      parts.shoulderFR.rotation.x = 0.48 * k;
      parts.elbowFR.rotation.x = 0.82 * k;
      parts.pawFR.rotation.x = -0.52 * k;

      parts.hipBL.rotation.x = -0.44 * k;
      parts.kneeBL.rotation.x = -0.74 * k;
      parts.pawBL.rotation.x = 0.58 * k;
      parts.hipBR.rotation.x = -0.44 * k;
      parts.kneeBR.rotation.x = -0.74 * k;
      parts.pawBR.rotation.x = 0.58 * k;

      parts.tail1.rotation.x = 0.25 * k;
      parts.tail2.rotation.y = Math.sin(tau * 2) * 0.24 * k;
      break;
    }

    case 'circle': {
      parts.hips.position.y = baseHipsY - 0.11 * k;
      parts.hips.position.x = Math.sin(tau) * 0.06 * k;
      parts.hips.rotation.y = 0.22 * k;
      parts.torso.rotation.x = 0.10 * k;
      parts.chest.rotation.x = 0.08 * k;
      parts.neck.rotation.x = 0.22 * k;
      parts.neck.rotation.y = -0.12 * k;
      parts.head.rotation.x = -0.34 * k;
      parts.head.rotation.y = -0.10 * k;
      parts.jaw.rotation.x = 0.22 * k;

      stepLegF(parts.shoulderFL, parts.elbowFL, parts.pawFL, u);
      stepLegB(parts.hipBR, parts.kneeBR, parts.pawBR, (u + 0.25) % 1);
      stepLegF(parts.shoulderFR, parts.elbowFR, parts.pawFR, (u + 0.5) % 1);
      stepLegB(parts.hipBL, parts.kneeBL, parts.pawBL, (u + 0.75) % 1);

      parts.shoulderFL.rotation.z = Math.sin(tau) * 0.18 * k;
      parts.shoulderFR.rotation.z = Math.cos(tau) * 0.18 * k;
      parts.hipBL.rotation.z = -Math.sin(tau) * 0.16 * k;
      parts.hipBR.rotation.z = -Math.cos(tau) * 0.16 * k;

      parts.earL.rotation.x = -0.38 * k;
      parts.earR.rotation.x = -0.38 * k;
      parts.tail1.rotation.x = -0.25 * k;
      parts.tail2.rotation.y = Math.sin(tau) * 0.16 * k;
      break;
    }

    case 'howl':
    case 'roar':
    case 'cast': {
      const env = u < 0.18
        ? u / 0.18
        : u < 0.80
          ? 1.0
          : 1.0 - (u - 0.80) / 0.20;
      const vib = u >= 0.18 && u <= 0.80 ? Math.sin(u * 62) * 0.035 : 0;

      parts.hips.position.y = baseHipsY - env * 0.09 * k;
      parts.hips.rotation.x = -env * 0.24 * k;
      parts.torso.rotation.x = -env * 0.18 * k;
      parts.chest.rotation.x = (-env * 0.22 + vib) * k;
      parts.neck.rotation.x = (-env * 0.52 + vib) * k;
      parts.head.rotation.x = (-env * 0.65) * k;
      parts.jaw.rotation.x = (0.1 + env * 0.56 + Math.abs(vib) * 2.0) * k;

      parts.earL.rotation.x = -env * 0.52 * k;
      parts.earR.rotation.x = -env * 0.52 * k;

      parts.shoulderFL.rotation.x = env * 0.22 * k;
      parts.elbowFL.rotation.x = -env * 0.12 * k;
      parts.shoulderFR.rotation.x = env * 0.22 * k;
      parts.elbowFR.rotation.x = -env * 0.12 * k;

      parts.hipBL.rotation.x = env * 0.18 * k;
      parts.kneeBL.rotation.x = -env * 0.35 * k;
      parts.hipBR.rotation.x = env * 0.18 * k;
      parts.kneeBR.rotation.x = -env * 0.35 * k;

      parts.tail1.rotation.x = -0.35 * env * k;
      break;
    }

    case 'hit': {
      const env = Math.sin(u * Math.PI);
      parts.hips.position.z = baseHipsZ - env * 0.16 * k;
      parts.hips.position.y = baseHipsY - env * 0.08 * k;
      parts.torso.rotation.x = env * 0.22 * k;
      parts.neck.rotation.x = -env * 0.38 * k;
      parts.head.rotation.x = -env * 0.28 * k;
      parts.head.rotation.z = env * 0.28 * k;
      parts.jaw.rotation.x = (0.1 + env * 0.48) * k;
      parts.shoulderFL.rotation.x = env * 0.35 * k;
      parts.shoulderFR.rotation.x = env * 0.35 * k;
      break;
    }

    case 'stagger': {
      const env = Math.sin(u * Math.PI);
      const wobble = Math.sin(u * Math.PI * 3);
      parts.hips.position.z = baseHipsZ - env * 0.22 * k;
      parts.hips.position.x = wobble * 0.12 * env * k;
      parts.hips.position.y = baseHipsY - env * 0.14 * k;
      parts.hips.rotation.z = wobble * 0.18 * env * k;
      parts.neck.rotation.z = -wobble * 0.28 * env * k;
      parts.head.rotation.x = env * 0.26 * k;
      parts.jaw.rotation.x = (0.14 + env * 0.35) * k;

      parts.shoulderFL.rotation.x = env * 0.38 * k;
      parts.elbowFL.rotation.x = env * 0.55 * k;
      parts.shoulderFR.rotation.x = env * 0.25 * k;
      parts.elbowFR.rotation.x = env * 0.45 * k;
      break;
    }

    case 'flee': {
      const wave = Math.sin(tau);
      parts.hips.position.y = baseHipsY + Math.cos(tau) * 0.08 * k;
      parts.hips.rotation.x = wave * 0.24 * k;
      parts.torso.rotation.x = -wave * 0.25 * k;
      parts.neck.rotation.x = 0.22 * k;
      parts.head.rotation.y = Math.sin(tau * 0.5) * 0.32 * k;
      parts.earL.rotation.x = -0.72 * k;
      parts.earR.rotation.x = -0.72 * k;

      parts.tail1.rotation.x = -0.95 * k;
      parts.tail2.rotation.x = -0.75 * k;
      parts.tail3.rotation.x = -0.45 * k;

      stepLegF(parts.shoulderFL, parts.elbowFL, parts.pawFL, u);
      stepLegF(parts.shoulderFR, parts.elbowFR, parts.pawFR, (u + 0.15) % 1);
      stepLegB(parts.hipBL, parts.kneeBL, parts.pawBL, (u + 0.5) % 1);
      stepLegB(parts.hipBR, parts.kneeBR, parts.pawBR, (u + 0.65) % 1);
      break;
    }

    case 'hesitate': {
      const sway = Math.sin(tau);
      parts.hips.position.z = baseHipsZ - (0.06 + sway * 0.06) * k;
      parts.hips.position.y = baseHipsY - 0.05 * k;
      parts.head.rotation.z = sway * 0.16 * k;
      parts.head.rotation.y = Math.cos(tau) * 0.18 * k;
      parts.neck.rotation.x = 0.15 * k;
      parts.jaw.rotation.x = 0.18 * k;

      const lift = Math.max(0, sway);
      parts.shoulderFL.rotation.x = -lift * 0.35 * k;
      parts.elbowFL.rotation.x = lift * 0.78 * k;
      parts.pawFL.rotation.x = -lift * 0.45 * k;

      parts.tail1.rotation.x = -0.45 * k;
      parts.tail2.rotation.y = sway * 0.14 * k;
      break;
    }

    case 'spawn': {
      if (u < 0.55) {
        const p = u / 0.55;
        const inv = 1 - p;
        const arc = Math.sin(p * Math.PI);
        parts.hips.position.y = baseHipsY - inv * 0.42 + arc * 0.22;
        parts.hips.position.z = baseHipsZ - inv * 0.45;
        parts.torso.rotation.x = -arc * 0.24;
        parts.shoulderFL.rotation.x = -arc * 0.55;
        parts.shoulderFR.rotation.x = -arc * 0.55;
      } else {
        const p = (u - 0.55) / 0.45;
        const snarl = Math.sin(p * Math.PI);
        parts.neck.rotation.x = -snarl * 0.22;
        parts.head.rotation.z = snarl * 0.18;
        parts.jaw.rotation.x = 0.1 + snarl * 0.52;
      }
      break;
    }

    case 'death': {
      const p1 = Math.min(1, u / 0.40);
      const p2 = u > 0.30 ? Math.min(1, (u - 0.30) / 0.55) : 0;
      const ease2 = p2 * p2 * (3 - 2 * p2);

      parts.hips.position.y = baseHipsY * (1 - p1 * 0.45) * (1 - ease2 * 0.68) + 0.18 * ease2;
      parts.hips.position.x = ease2 * 0.18 * k;
      parts.hips.rotation.z = ease2 * (Math.PI * 0.47) * k;
      parts.torso.rotation.z = ease2 * 0.08 * k;
      parts.neck.rotation.x = (-p1 * 0.32 + ease2 * 0.48) * k;
      parts.head.rotation.z = ease2 * 0.22 * k;
      parts.jaw.rotation.x = (0.12 + ease2 * 0.26) * k;

      parts.earL.rotation.x = -ease2 * 0.5 * k;
      parts.earR.rotation.x = -ease2 * 0.5 * k;

      parts.shoulderFL.rotation.x = (p1 * 0.45 - ease2 * 0.25) * k;
      parts.elbowFL.rotation.x = (p1 * 0.75 - ease2 * 0.35) * k;
      parts.shoulderFR.rotation.x = (p1 * 0.45 - ease2 * 0.15) * k;
      parts.elbowFR.rotation.x = (p1 * 0.75 - ease2 * 0.42) * k;

      parts.hipBL.rotation.x = (-p1 * 0.38 + ease2 * 0.28) * k;
      parts.kneeBL.rotation.x = (-p1 * 0.65 + ease2 * 0.32) * k;
      parts.hipBR.rotation.x = (-p1 * 0.38 + ease2 * 0.18) * k;
      parts.kneeBR.rotation.x = (-p1 * 0.65 + ease2 * 0.38) * k;

      parts.tail1.rotation.x = -ease2 * 0.45 * k;
      parts.tail2.rotation.z = -ease2 * 0.35 * k;
      break;
    }

    case 'ambushWait': {
      const breath = Math.sin(tau) * 0.008;
      parts.hips.position.y = 0.35 + breath;
      parts.hips.position.z = baseHipsZ - 0.08;
      parts.hips.rotation.x = 0.06;
      parts.torso.rotation.x = 0.05;
      parts.chest.rotation.x = 0.06;
      parts.neck.rotation.x = -0.18;
      parts.head.rotation.x = -0.02;
      parts.jaw.rotation.x = 0.14;

      parts.earL.rotation.set(-0.74, 0, -0.25);
      parts.earR.rotation.set(-0.74, 0, 0.25);

      parts.shoulderFL.rotation.x = 0.78;
      parts.elbowFL.rotation.x = 1.42;
      parts.pawFL.rotation.x = -0.68;
      parts.shoulderFR.rotation.x = 0.78;
      parts.elbowFR.rotation.x = 1.42;
      parts.pawFR.rotation.x = -0.68;

      parts.hipBL.rotation.x = -0.74;
      parts.kneeBL.rotation.x = -1.32;
      parts.pawBL.rotation.x = 0.64;
      parts.hipBR.rotation.x = -0.74;
      parts.kneeBR.rotation.x = -1.32;
      parts.pawBR.rotation.x = 0.64;

      parts.tail1.rotation.x = 0.18;
      parts.tail2.rotation.x = 0.12;
      parts.tail3.rotation.y = Math.sin(tau) * 0.05;
      break;
    }

    default:
      break;
  }

  if (modelState && modelState.expression) {
    if (modelState.expression === 'snarl' || modelState.expression === 'angry') {
      parts.jaw.rotation.x = Math.max(parts.jaw.rotation.x, 0.38);
      parts.earL.rotation.x -= 0.25;
      parts.earR.rotation.x -= 0.25;
    } else if (modelState.expression === 'howl') {
      parts.jaw.rotation.x = Math.max(parts.jaw.rotation.x, 0.58);
    }
  }
}

function buildQuadrupedModel(type, arch = {}, opts = {}) {
  const assets = getPrairieWolfAssets();
  const showOutlineInit = opts.outline !== false;

  const shoulderH = arch.height || 0.95;
  const bodyL = arch.length || 1.7;
  const hipH = shoulderH * 0.92;

  const group = new THREE.Group();
  group.name = 'Enemy_' + type;
  const parts = {};

  function ensurePivot(name, parent, x, y, z) {
    const p = new THREE.Group();
    p.name = name;
    p.position.set(x, y, z);
    parent.add(p);
    parts[name] = p;
    return p;
  }

  const root = ensurePivot('root', group, 0, 0, 0);
  const hips = ensurePivot('hips', root, 0, hipH, -bodyL * 0.35);
  const torso = ensurePivot('torso', hips, 0, 0, bodyL * 0.35);
  const chest = ensurePivot('chest', torso, 0, shoulderH * 0.08, bodyL * 0.35);
  const neck = ensurePivot('neck', chest, 0, shoulderH * 0.15, 0.22);
  const head = ensurePivot('head', neck, 0, 0.12, 0.25);
  const jaw = ensurePivot('jaw', head, 0, -0.08, 0.15);
  const earL = ensurePivot('earL', head, 0.12, 0.15, -0.05);
  const earR = ensurePivot('earR', head, -0.12, 0.15, -0.05);
  const tail1 = ensurePivot('tail1', hips, 0, 0.05, -0.15);
  const tail2 = ensurePivot('tail2', tail1, 0, -0.15, -0.2);
  const tail3 = ensurePivot('tail3', tail2, 0, -0.15, -0.2);
  const shoulderFL = ensurePivot('shoulderFL', chest, 0.22, -0.1, 0.1);
  const shoulderFR = ensurePivot('shoulderFR', chest, -0.22, -0.1, 0.1);
  const elbowFL = ensurePivot('elbowFL', shoulderFL, 0, -shoulderH * 0.4, 0);
  const elbowFR = ensurePivot('elbowFR', shoulderFR, 0, -shoulderH * 0.4, 0);
  const pawFL = ensurePivot('pawFL', elbowFL, 0, -shoulderH * 0.42, 0);
  const pawFR = ensurePivot('pawFR', elbowFR, 0, -shoulderH * 0.42, 0);
  const hipBL = ensurePivot('hipBL', hips, 0.20, -0.05, 0);
  const hipBR = ensurePivot('hipBR', hips, -0.20, -0.05, 0);
  const kneeBL = ensurePivot('kneeBL', hipBL, 0, -hipH * 0.42, 0);
  const kneeBR = ensurePivot('kneeBR', hipBR, 0, -hipH * 0.42, 0);
  const pawBL = ensurePivot('pawBL', kneeBL, 0, -hipH * 0.45, 0);
  const pawBR = ensurePivot('pawBR', kneeBR, 0, -hipH * 0.45, 0);

  const bodyMeshes = [];
  const switchableOutlineEntries = [];
  const backSideOutlineMeshes = [];

  let currentFurMat = assets.furMat;
  let currentEyeMat = assets.eyeMat;
  let currentOutlineMat = assets.outlineMat;
  let furMatCloned = false;
  let eyeMatCloned = false;
  let outlineMatCloned = false;

  function addPartMesh(pivot, partKey) {
    const geom = showOutlineInit ? assets.geomsOutlined[partKey] : assets.geomsBody[partKey];
    const mesh = new THREE.Mesh(geom, currentFurMat);
    mesh.name = 'wolf_' + partKey;
    pivot.add(mesh);
    bodyMeshes.push(mesh);
    if (assets.geomsOutlined[partKey] !== assets.geomsBody[partKey]) {
      switchableOutlineEntries.push({ mesh, partKey });
    }
    return mesh;
  }

  addPartMesh(hips, 'hips');
  addPartMesh(torso, 'torso');
  addPartMesh(chest, 'chest');
  addPartMesh(neck, 'neck');
  addPartMesh(head, 'head');
  addPartMesh(jaw, 'jaw');
  addPartMesh(earL, 'earL');
  addPartMesh(earR, 'earR');
  addPartMesh(tail1, 'tail1');
  addPartMesh(tail2, 'tail2');
  addPartMesh(tail3, 'tail3');
  addPartMesh(shoulderFL, 'upperForeleg');
  addPartMesh(shoulderFR, 'upperForeleg');
  addPartMesh(elbowFL, 'lowerForeleg');
  addPartMesh(elbowFR, 'lowerForeleg');
  addPartMesh(pawFL, 'paw');
  addPartMesh(pawFR, 'paw');
  addPartMesh(hipBL, 'upperHindleg');
  addPartMesh(hipBR, 'upperHindleg');
  addPartMesh(kneeBL, 'lowerHindleg');
  addPartMesh(kneeBR, 'lowerHindleg');
  addPartMesh(pawBL, 'paw');
  addPartMesh(pawBR, 'paw');

  // Glowing yellow eyes and golden brow streaks on head
  const eyesMesh = new THREE.Mesh(assets.geomsBody.eyes, currentEyeMat);
  eyesMesh.name = 'wolf_eyes';
  head.add(eyesMesh);

  // Anchors & Sockets
  const mouthAnchor = new THREE.Object3D();
  mouthAnchor.name = 'mouth';
  mouthAnchor.position.set(0, -0.04, 0.34);
  head.add(mouthAnchor);

  const feetAnchor = new THREE.Object3D();
  feetAnchor.name = 'feet';
  feetAnchor.position.set(0, 0, 0);
  root.add(feetAnchor);

  const anchors = {
    head,
    chest,
    mouth: mouthAnchor,
    feet: feetAnchor,
    weapon: mouthAnchor,
  };

  const sockets = {
    handR: pawFR,
    handL: pawFL,
    back: torso,
    head,
  };

  const modelState = {
    shoulderH,
    bodyL,
    expression: 'neutral',
    eyeGlow: 1.0,
    enrage: 0,
    outlineVisible: showOutlineInit,
  };

  function ensureClonedFurMat() {
    if (!furMatCloned) {
      currentFurMat = assets.furMat.clone();
      furMatCloned = true;
      for (let i = 0; i < bodyMeshes.length; i++) {
        bodyMeshes[i].material = currentFurMat;
      }
    }
    return currentFurMat;
  }

  function ensureClonedEyeMat() {
    if (!eyeMatCloned) {
      currentEyeMat = assets.eyeMat.clone();
      eyeMatCloned = true;
      eyesMesh.material = currentEyeMat;
    }
    return currentEyeMat;
  }

  function ensureClonedOutlineMat() {
    if (!outlineMatCloned) {
      currentOutlineMat = assets.outlineMat.clone();
      outlineMatCloned = true;
      for (let i = 0; i < backSideOutlineMeshes.length; i++) {
        backSideOutlineMeshes[i].material = currentOutlineMat;
      }
    }
    return currentOutlineMat;
  }

  function setPose(name, t = 0, intensity = 1) {
    applyPrairieWolfPose(parts, name, t, intensity, modelState);
  }

  function setEyeGlow(intensity = 1) {
    modelState.eyeGlow = Math.max(0, Math.min(2, intensity));
    const mat = ensureClonedEyeMat();
    const g = modelState.eyeGlow;
    mat.color.setRGB(
      Math.min(1, 0.35 + g * 0.65),
      Math.min(1, 0.25 + g * 0.57),
      Math.min(1, 0.05 + g * 0.18)
    );
  }

  function setExpression(name = 'neutral') {
    modelState.expression = name;
  }

  function setTint(hex, amount = 0) {
    const mat = ensureClonedFurMat();
    if (!hex || amount <= 0) {
      mat.color.setHex(0xffffff);
      mat.emissive.setHex(0x000000);
      return;
    }
    const a = Math.max(0, Math.min(1, amount));
    const target = new THREE.Color(hex);
    mat.color.setHex(0xffffff).lerp(target, a * 0.65);
    mat.emissive.copy(target).multiplyScalar(a * 0.35);
  }

  function setOpacity(a = 1) {
    const op = Math.max(0, Math.min(1, a));
    const fMat = ensureClonedFurMat();
    const eMat = ensureClonedEyeMat();
    const oMat = ensureClonedOutlineMat();
    const isTrans = op < 0.999;

    fMat.transparent = isTrans;
    fMat.opacity = op;
    eMat.transparent = isTrans;
    eMat.opacity = op;
    oMat.transparent = isTrans;
    oMat.opacity = op;
  }

  function setEnrage(amount = 0) {
    const e = Math.max(0, Math.min(1, amount));
    modelState.enrage = e;
    chest.scale.setScalar(1 + e * 0.08);
    neck.scale.setScalar(1 + e * 0.10);
    setEyeGlow(1.0 + e * 1.0);
    if (e > 0.01) {
      setTint(0xff4422, e * 0.35);
    } else {
      setTint(null, 0);
    }
  }

  function setOutlineVisible(visible) {
    const v = Boolean(visible);
    modelState.outlineVisible = v;
    for (let i = 0; i < backSideOutlineMeshes.length; i++) {
      backSideOutlineMeshes[i].visible = v;
    }
    for (let i = 0; i < switchableOutlineEntries.length; i++) {
      const entry = switchableOutlineEntries[i];
      entry.mesh.geometry = v
        ? assets.geomsOutlined[entry.partKey]
        : assets.geomsBody[entry.partKey];
    }
  }

  function getBounds() {
    group.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(group);
  }

  function dispose() {
    if (furMatCloned) currentFurMat.dispose();
    if (eyeMatCloned) currentEyeMat.dispose();
    if (outlineMatCloned) currentOutlineMat.dispose();
  }

  setPose('idle', 0, 1);

  return {
    group,
    parts,
    sockets,
    anchors,
    setPose,
    setEyeGlow,
    setExpression,
    setTint,
    setOpacity,
    setEnrage,
    setOutlineVisible,
    getBounds,
    dispose,
  };
}

export function createEnemyModel(type = 'goblin_grunt', opts = {}) {
  const arch = ARCHETYPES[type] || ARCHETYPES.goblin_grunt;
  if (arch.isQuadruped) {
    return buildQuadrupedModel(type, arch, opts);
  }
  const seed = opts.seed ?? 1337;
  const rng = mulberry32(seed);
  const level = Math.max(1, Math.min(10, opts.level ?? 1));
  const useOutline = opts.outline !== undefined ? Boolean(opts.outline) : true;
  const scaleVar = opts.seed !== undefined ? 0.94 + rng() * 0.12 : 1.0;

  // Explicit opts.weapon ALWAYS overrides seed
  const validGruntWeapons = ['dualKnives', 'knifeShield', 'club'];
  const wVariant =
    type === 'goblin_grunt'
      ? validGruntWeapons.includes(opts.weapon)
        ? opts.weapon
        : validGruntWeapons[Math.floor(rng() * validGruntWeapons.length)]
      : opts.weapon || 'default';

  const armorTier = level >= 8 ? 2 : level >= 5 ? 1 : 0;

  const group = new THREE.Group();
  group.name = `enemy_${type}`;
  group.userData.weaponVariant = wVariant;

  const parts = {};
  const sockets = {};
  const anchors = {};
  const meshes = [];
  const outlines = [];
  const baseMats = new Map();

  let matsCloned = false;
  let currentEyeGlow = 1.0;
  let currentEnrage = 0.0;
  let currentExpr = 'neutral';

  const sharedVCMat = getSharedVertexColorMat();
  const sharedSkinMat = getSharedSkinMat();
  const outlineMat = getOutlineMat();

  const eyeMat = new THREE.MeshToonMaterial({
    color: 0xff2a2a,
    emissive: 0xff2a2a,
    emissiveIntensity: 1.5,
    gradientMap: getGradientMap()
  });

  let orbMat = null;
  let healRingMesh = null;
  let auraMesh = null;
  let bannerMesh = null;
  let bowStringMesh = null;
  let eyesMesh = null;
  let tongueMesh = null;

  function addPair(parent, geom, mat, olGeom = null) {
    const m = new THREE.Mesh(geom, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    meshes.push(m);
    baseMats.set(m, mat);

    if (olGeom) {
      const ol = new THREE.Mesh(olGeom, outlineMat);
      ol.visible = useOutline;
      m.add(ol);
      outlines.push(ol);
    }
    return m;
  }

  function makePivot(name, parent, x = 0, y = 0, z = 0) {
    const p = new THREE.Object3D();
    p.name = name;
    p.position.set(x, y, z);
    p.userData.restPos = p.position.clone();
    p.userData.restRot = new THREE.Euler();
    parent.add(p);
    parts[name] = p;
    return p;
  }

  const root = makePivot('root', group, 0, 0, 0);
  root.scale.setScalar(scaleVar);

  if (arch.isNonHumanoid) {
    const bodyY = arch.height * 0.45;
    const hips = makePivot('hips', root, 0, bodyY, 0);
    const torso = makePivot('torso', hips, 0, 0, 0);
    const head = makePivot('head', torso, 0, arch.height * 0.18, 0.12);
    const allNames = [
      'chest', 'neck', 'jaw', 'earL', 'earR',
      'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR',
      'hipL', 'hipR', 'kneeL', 'kneeR', 'footL', 'footR'
    ];
    for (const n of allNames) parts[n] = parts[n] || root;

    const mainG = getGeom(`nonHum_${type}`, () =>
      paintGeom(
        arch.isNonHumanoid === 'slime'
          ? new THREE.OctahedronGeometry(arch.height * 0.5, 2)
          : new THREE.DodecahedronGeometry(arch.height * 0.48, 1),
        arch.skinHex,
        0.75
      )
    );
    const mainOl = getGeom(`nonHumOl_${type}`, () => buildInvertedHullGeom(mainG, 0.015));
    addPair(torso, mainG, sharedVCMat, mainOl);

    const eyeG = getGeom('nonHumEyes', () => {
      const s = new THREE.SphereGeometry(0.038, 6, 5);
      return mergeGeoms([
        placeGeom(s, 0xff2a2a, 0.09, 0, 0.22),
        placeGeom(s, 0xff2a2a, -0.09, 0, 0.22)
      ]);
    });
    eyesMesh = addPair(head, eyeG, eyeMat, null);

    sockets.handR = root;
    sockets.handL = root;
    sockets.back = torso;
    sockets.head = head;
    anchors.head = new THREE.Object3D();
    anchors.head.position.set(0, arch.height, 0);
    root.add(anchors.head);
    anchors.chest = torso;
    anchors.weapon = head;
    anchors.feet = root;
  } else if (arch.isQuadruped) {
    eyeMat.color.setHex(0xffd23a);
    eyeMat.emissive.setHex(0xffd23a);

    const shoulderH = arch.height || 0.95;
    const bodyL = arch.length || 1.7;
    const hipH = shoulderH * 0.92;

    const hips = makePivot('hips', root, 0, hipH, -bodyL * 0.35);
    const torso = makePivot('torso', hips, 0, 0, bodyL * 0.35);
    const chest = makePivot('chest', torso, 0, shoulderH * 0.08, bodyL * 0.35);
    const neck = makePivot('neck', chest, 0, shoulderH * 0.15, 0.22);
    const head = makePivot('head', neck, 0, 0.12, 0.25);
    const jaw = makePivot('jaw', head, 0, -0.08, 0.15);
    const earL = makePivot('earL', head, 0.12, 0.15, -0.05);
    const earR = makePivot('earR', head, -0.12, 0.15, -0.05);

    const tail1 = makePivot('tail1', hips, 0, 0.05, -0.15);
    const tail2 = makePivot('tail2', tail1, 0, -0.15, -0.2);
    const tail3 = makePivot('tail3', tail2, 0, -0.15, -0.2);

    const shoulderFL = makePivot('shoulderFL', chest, 0.22, -0.1, 0.1);
    const shoulderFR = makePivot('shoulderFR', chest, -0.22, -0.1, 0.1);
    const elbowFL = makePivot('elbowFL', shoulderFL, 0, -shoulderH * 0.4, 0);
    const elbowFR = makePivot('elbowFR', shoulderFR, 0, -shoulderH * 0.4, 0);
    const pawFL = makePivot('pawFL', elbowFL, 0, -shoulderH * 0.42, 0);
    const pawFR = makePivot('pawFR', elbowFR, 0, -shoulderH * 0.42, 0);

    const hipBL = makePivot('hipBL', hips, 0.20, -0.05, 0);
    const hipBR = makePivot('hipBR', hips, -0.20, -0.05, 0);
    const kneeBL = makePivot('kneeBL', hipBL, 0, -hipH * 0.42, 0);
    const kneeBR = makePivot('kneeBR', hipBR, 0, -hipH * 0.42, 0);
    const pawBL = makePivot('pawBL', kneeBL, 0, -hipH * 0.45, 0);
    const pawBR = makePivot('pawBR', kneeBR, 0, -hipH * 0.45, 0);

    anchors.head = new THREE.Object3D();
    anchors.head.position.set(0, 0.3, 0);
    head.add(anchors.head);

    anchors.chest = new THREE.Object3D();
    chest.add(anchors.chest);

    anchors.mouth = new THREE.Object3D();
    anchors.mouth.position.set(0, -0.05, 0.25);
    head.add(anchors.mouth);
    anchors.weapon = anchors.mouth;

    anchors.feet = new THREE.Object3D();
    root.add(anchors.feet);

    sockets.head = head;
    sockets.back = torso;
    sockets.handR = pawFR;
    sockets.handL = pawFL;

    const furColor = arch.skinHex || 0x4a4d55;
    const bodyG = getGeom('wolfBody', () => paintGeom(new THREE.BoxGeometry(0.44, 0.46, bodyL * 0.75), furColor, 0.85));
    addPair(torso, bodyG, sharedVCMat, null);

    const headG = getGeom('wolfHead', () => paintGeom(new THREE.BoxGeometry(0.32, 0.30, 0.42), furColor, 0.88));
    addPair(head, headG, sharedVCMat, null);

    const snoutG = getGeom('wolfSnout', () => paintGeom(new THREE.BoxGeometry(0.18, 0.16, 0.28), arch.furLightHex || 0x7c808c, 0.9));
    const snout = addPair(head, snoutG, sharedVCMat, null);
    snout.position.set(0, -0.05, 0.28);

    const earG = getGeom('wolfEar', () => paintGeom(new THREE.ConeGeometry(0.08, 0.2, 4), furColor, 0.8));
    earG.rotateX(0.2);
    addPair(earL, earG, sharedVCMat, null);
    addPair(earR, earG, sharedVCMat, null);

    const wolfEyeG = getGeom('wolfEyes', () => {
      const s = new THREE.SphereGeometry(0.035, 6, 5);
      return mergeGeoms([
        placeGeom(s, 0xffd23a, 0.10, 0.05, 0.2),
        placeGeom(s, 0xffd23a, -0.10, 0.05, 0.2)
      ]);
    });
    eyesMesh = addPair(head, wolfEyeG, eyeMat, null);

    const legG = getGeom('wolfLeg', () => paintGeom(new THREE.BoxGeometry(0.12, shoulderH * 0.42, 0.14), furColor, 0.82));
    addPair(elbowFL, legG, sharedVCMat, null);
    addPair(elbowFR, legG, sharedVCMat, null);
    addPair(kneeBL, legG, sharedVCMat, null);
    addPair(kneeBR, legG, sharedVCMat, null);

    const tailG = getGeom('wolfTail', () => paintGeom(new THREE.BoxGeometry(0.12, 0.12, 0.26), furColor, 0.8));
    addPair(tail1, tailG, sharedVCMat, null);
    addPair(tail2, tailG, sharedVCMat, null);
    addPair(tail3, tailG, sharedVCMat, null);
  } else {
    const b = getTypeGeometries(type, arch, wVariant, armorTier);
    const legL = arch.legLen;
    const torsoH = arch.torsoH;
    const armL = arch.armLen;
    const hScale = arch.headScale;
    const hipW = arch.torsoWBot * 0.78;
    const shldrW = arch.torsoWTop * 1.12;
    const kBend = arch.kneeBend ?? 0.34;

    // Deep crouched legs & aggressive ~35 deg hunched torso with head thrust forward and low
    const hips = makePivot('hips', root, 0, legL * 1.74, 0);
    const torso = makePivot('torso', hips, 0, 0, 0);
    torso.rotation.x = arch.hunch;
    torso.userData.restRot.copy(torso.rotation);

    const chest = makePivot('chest', torso, 0, torsoH * 0.55, 0);
    // Neck & head thrust forward (+Z) and kept lower than shoulder line
    const neck = makePivot('neck', chest, 0, torsoH * 0.28, arch.torsoWTop * 0.55);
    const head = makePivot('head', neck, 0, hScale * 0.06, hScale * 0.18);
    head.rotation.x = -arch.hunch * 0.85;
    head.userData.restRot.copy(head.rotation);

    const jaw = makePivot('jaw', head, 0, -hScale * 0.11, hScale * 0.20);
    const earL = makePivot('earL', head, hScale * 0.46, hScale * 0.14, 0);
    const earR = makePivot('earR', head, -hScale * 0.46, hScale * 0.14, 0);

    // Shoulders sit high & wide above head line from side view
    const shoulderL = makePivot('shoulderL', chest, shldrW, torsoH * 0.40, -0.02);
    const shoulderR = makePivot('shoulderR', chest, -shldrW, torsoH * 0.40, -0.02);
    shoulderL.rotation.set(-arch.hunch * 0.65, 0, 0.12);
    shoulderR.rotation.set(-arch.hunch * 0.65, 0, -0.12);
    shoulderL.userData.restRot.copy(shoulderL.rotation);
    shoulderR.userData.restRot.copy(shoulderR.rotation);

    const elbowL = makePivot('elbowL', shoulderL, 0, -armL, 0);
    const elbowR = makePivot('elbowR', shoulderR, 0, -armL, 0);
    elbowL.rotation.x = -0.32;
    elbowR.rotation.x = -0.32;
    elbowL.userData.restRot.copy(elbowL.rotation);
    elbowR.userData.restRot.copy(elbowR.rotation);

    const handL = makePivot('handL', elbowL, 0, -armL * 0.95, 0);
    const handR = makePivot('handR', elbowR, 0, -armL * 0.95, 0);

    // Bent knees in rest posture
    const hipL = makePivot('hipL', hips, hipW, 0, 0);
    const hipR = makePivot('hipR', hips, -hipW, 0, 0);
    hipL.rotation.set(-kBend, 0, 0.08);
    hipR.rotation.set(-kBend, 0, -0.08);
    hipL.userData.restRot.copy(hipL.rotation);
    hipR.userData.restRot.copy(hipR.rotation);

    const kneeL = makePivot('kneeL', hipL, 0, -legL, 0);
    const kneeR = makePivot('kneeR', hipR, 0, -legL, 0);
    kneeL.rotation.x = kBend * 1.85;
    kneeR.rotation.x = kBend * 1.85;
    kneeL.userData.restRot.copy(kneeL.rotation);
    kneeR.userData.restRot.copy(kneeR.rotation);

    const footL = makePivot('footL', kneeL, 0, -legL * 0.92, 0);
    const footR = makePivot('footR', kneeR, 0, -legL * 0.92, 0);

    sockets.handR = handR;
    sockets.handL = handL;
    sockets.back = chest;
    sockets.head = head;

    anchors.head = new THREE.Object3D();
    anchors.head.position.set(0, hScale * 0.95, 0);
    head.add(anchors.head);

    anchors.chest = new THREE.Object3D();
    anchors.chest.position.set(0, torsoH * 0.1, arch.torsoWTop * 0.5);
    chest.add(anchors.chest);

    anchors.feet = new THREE.Object3D();
    root.add(anchors.feet);

    anchors.weapon = new THREE.Object3D();
    anchors.weapon.position.set(0, 0, arch.isBoss ? 1.15 : 0.45);
    handR.add(anchors.weapon);

    // Attach merged limb & body meshes (minimal mesh count!)
    addPair(hips, b.hipsGeom, sharedVCMat, b.hipsOl);
    addPair(torso, b.torsoSkinGeom, sharedSkinMat, b.torsoOl);
    if (b.chestGearGeom) addPair(torso, b.chestGearGeom, sharedVCMat, null);

    addPair(head, b.headSkinGeom, sharedSkinMat, b.headOl);
    addPair(head, b.headDetailGeom, sharedVCMat, null);
    eyesMesh = addPair(head, b.eyesGeom, eyeMat, null);
    addPair(jaw, b.jawGeom, sharedVCMat, b.jawOl);

    if (!arch.isBoss && !arch.hasPointedHood) {
      tongueMesh = addPair(jaw, b.tongueGeom, sharedVCMat, null);
      tongueMesh.position.set(0, -0.01, hScale * 0.35);
      tongueMesh.rotation.x = Math.PI * 0.78;
    }

    addPair(shoulderL, b.uArmLGeom, sharedVCMat, b.uArmLOl);
    addPair(shoulderR, b.uArmRGeom, sharedVCMat, b.uArmROl);
    addPair(elbowL, b.fArmLGeom, sharedVCMat, b.fArmLOl);
    addPair(elbowR, b.fArmRGeom, sharedVCMat, b.fArmROl);

    addPair(hipL, b.thighGeom, sharedSkinMat, b.thighOl);
    addPair(hipR, b.thighGeom, sharedSkinMat, b.thighOl);
    addPair(kneeL, b.calfGeom, sharedVCMat, b.calfOl);
    addPair(kneeR, b.calfGeom, sharedVCMat, b.calfOl);

    // Special animated attachments (bowstring, shaman orb+heal ring, leader banner, boss aura)
    if (type === 'goblin_archer' || type === 'orc_archer') {
      const strG = getGeom('bowString', () => paintGeom(new THREE.CylinderGeometry(0.004, 0.004, 0.58, 4), 0xd2c8b0));
      bowStringMesh = addPair(handL, strG, sharedVCMat, null);
      bowStringMesh.position.set(0, 0, -0.05);
    }

    if (type === 'goblin_shaman') {
      orbMat = new THREE.MeshToonMaterial({
        color: 0x33ff66,
        emissive: 0x22ee55,
        emissiveIntensity: 1.6,
        gradientMap: getGradientMap()
      });
      const orbG = getGeom('shamanOrb', () => new THREE.SphereGeometry(0.08, 8, 6));
      const orb = addPair(elbowR, orbG, orbMat, null);
      orb.position.set(0, -armL * 0.95 + 0.85, 0.30);

      const ringG = getGeom('healPulseRing', () => {
        const g = new THREE.RingGeometry(0.32, 0.44, 16);
        g.rotateX(-Math.PI * 0.5);
        return g;
      });
      healRingMesh = new THREE.Mesh(ringG, orbMat);
      healRingMesh.position.y = 0.03;
      healRingMesh.visible = false;
      root.add(healRingMesh);
    }

    if (arch.hasBanner) {
      const banG = buildBannerGeom();
      const banMat = getSharedVertexColorMat('vcDouble');
      banMat.side = THREE.DoubleSide;
      bannerMesh = addPair(torso, banG, banMat, null);
      bannerMesh.position.set(0, torsoH * 1.92, -arch.torsoWTop * 0.60);
      bannerMesh.userData.baseZ = Float32Array.from(banG.attributes.position.array);
    }

    if (arch.isBoss || type === 'goblin_leader') {
      const auraG = getGeom(`aura_${type}`, () =>
        new THREE.CapsuleGeometry(arch.torsoWTop * 1.35, arch.torsoH * 1.1, 4, 8)
      );
      const auraMat = new THREE.MeshBasicMaterial({
        color: 0xff2200,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide
      });
      auraMesh = new THREE.Mesh(auraG, auraMat);
      auraMesh.position.y = arch.torsoH * 0.45;
      auraMesh.visible = false;
      torso.add(auraMesh);
    }
  }

  function ensureClonedMaterials() {
    if (matsCloned) return;
    matsCloned = true;
    for (const m of meshes) {
      m.material = m.material.clone();
    }
    for (const ol of outlines) {
      ol.material = ol.material.clone();
    }
  }

  function resetRigToRest() {
    for (const key in parts) {
      const p = parts[key];
      if (p.userData.restPos) p.position.copy(p.userData.restPos);
      if (p.userData.restRot) p.rotation.copy(p.userData.restRot);
    }
    root.scale.setScalar(scaleVar * (1 + currentEnrage * 0.06));
    if (healRingMesh) healRingMesh.visible = false;
    if (tongueMesh) {
      tongueMesh.rotation.set(Math.PI * 0.78, 0, 0);
      tongueMesh.scale.set(1, 1, 1);
    }
  }

  function applyExpressionOffsets(t = 0) {
    if (!parts.jaw || arch.isNonHumanoid) return;
    if (tongueMesh) {
      tongueMesh.rotation.z = Math.sin(t * 5.2) * 0.22;
    }
    if (currentExpr === 'snarl') {
      parts.jaw.rotation.x += 0.38;
    } else if (currentExpr === 'pain') {
      parts.jaw.rotation.x += 0.48;
      parts.head.rotation.z += 0.16;
    } else if (currentExpr === 'afraid') {
      parts.jaw.rotation.x += 0.28;
      parts.head.rotation.x -= 0.15;
    } else if (currentExpr === 'dead') {
      parts.jaw.rotation.x += 0.52;
      if (eyesMesh) eyesMesh.scale.y = 0.15;
    }
  }

  function setPose(name, t = 0, intensity = 1) {
    const info = POSE_INFO[name] || POSE_INFO.idle;
    const time = info.loop ? t : Math.max(0, Math.min(info.duration, t));
    const u = info.duration > 0 ? time / info.duration : 0;
    const k = Math.max(0, Math.min(1.5, intensity));

    resetRigToRest();

    if (bannerMesh) {
      const pos = bannerMesh.geometry.attributes.position;
      const base = bannerMesh.userData.baseZ;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const wave = Math.sin(t * 7.5 + y * 9.0) * (-y * 0.15);
        pos.setZ(i, base[i * 3 + 2] + wave);
      }
      pos.needsUpdate = true;
    }

    if (arch.isNonHumanoid) {
      const bounce = Math.sin(t * 5) * 0.08 * k;
      parts.hips.position.y += bounce;
      if (name === 'attack1' || name === 'slam') {
        parts.torso.position.z = Math.sin(u * Math.PI) * 0.45 * k;
      } else if (name === 'death') {
        parts.torso.scale.set(1 + u * 0.35, Math.max(0.15, 1 - u * 0.75), 1 + u * 0.35);
      }
      return;
    }

    if (arch.isQuadruped) {
      const p = parts;
      if (name === 'death') {
        const fall = Math.min(1, u * 1.35);
        const ease = fall * fall * (3 - 2 * fall);
        p.hips.position.y = THREE.MathUtils.lerp(p.hips.userData.restPos.y, 0.22, ease);
        p.chest.position.y = THREE.MathUtils.lerp(p.chest.userData.restPos.y, 0.22, ease);
        p.root.rotation.z = ease * 1.52;
        p.head.rotation.x = ease * 0.2;
      } else if (name === 'walk' || name === 'run' || name === 'flee' || name === 'charge' || name === 'pounce' || name === 'attack1') {
        const isFast = name === 'run' || name === 'charge' || name === 'pounce';
        const freq = isFast ? 12 : 7;
        const ph = t * freq;
        const stride = (isFast ? 0.75 : 0.45) * k;
        p.shoulderFL.rotation.x = Math.sin(ph) * stride;
        p.shoulderFR.rotation.x = -Math.sin(ph) * stride;
        p.hipBL.rotation.x = -Math.sin(ph) * stride;
        p.hipBR.rotation.x = Math.sin(ph) * stride;
        p.torso.rotation.x = Math.sin(ph * 2) * 0.08 * k;
        p.tail1.rotation.y = Math.sin(ph) * 0.25;
        p.tail1.rotation.x = -0.3;
        p.hips.position.y = p.hips.userData.restPos.y + Math.abs(Math.sin(ph)) * 0.06 * k;
      } else {
        const w = t * 3.0;
        p.chest.position.y = p.chest.userData.restPos.y + Math.sin(w) * 0.02 * k;
        p.head.rotation.x = Math.sin(w) * 0.04 * k;
        p.tail1.rotation.y = Math.sin(t * 4.0) * 0.3 * k;
        p.tail1.rotation.x = -0.3 + Math.sin(w) * 0.05;
        p.earL.rotation.z = Math.sin(t * 5.0) * 0.1 * k;
        p.earR.rotation.z = -Math.sin(t * 5.0 + 1) * 0.1 * k;
      }
      return;
    }

    const p = parts;
    const isHeavy = arch.isBoss;

    switch (name) {
      case 'idle': {
        const w = t * (isHeavy ? 2.4 : 3.6);
        p.hips.position.y += Math.sin(w) * 0.025 * k;
        p.torso.rotation.x += Math.sin(w) * 0.045 * k;
        p.jaw.rotation.x += (0.12 + Math.sin(w * 0.8) * 0.08) * k;
        p.shoulderL.rotation.x += Math.sin(w + 1) * 0.08 * k;
        p.shoulderR.rotation.x -= Math.sin(w + 1) * 0.08 * k;
        break;
      }
      case 'walk':
      case 'run': {
        const isRun = name === 'run';
        const freq = (isRun ? 10.5 : 6.8) * (isHeavy ? 0.72 : 1.0);
        const ph = t * freq;
        const stride = (isRun ? 0.95 : 0.55) * k;

        p.hipL.rotation.x += Math.sin(ph) * stride;
        p.hipR.rotation.x -= Math.sin(ph) * stride;
        p.kneeL.rotation.x += Math.max(0, -Math.cos(ph) * stride * 0.75);
        p.kneeR.rotation.x += Math.max(0, Math.cos(ph) * stride * 0.75);

        const bounce = isHeavy
          ? -Math.pow(Math.abs(Math.sin(ph)), 3) * 0.09
          : Math.abs(Math.sin(ph)) * (isRun ? 0.08 : 0.035);
        p.hips.position.y += bounce * k;

        // Deep forward sprint hunch with long arm swings
        p.torso.rotation.x += (isRun ? 0.28 : 0.06) * k;
        p.head.rotation.x -= (isRun ? 0.26 : 0.05) * k;
        p.jaw.rotation.x += (isRun ? 0.35 : 0.15) * k;
        p.shoulderL.rotation.x += -Math.sin(ph) * stride * (isRun ? 1.25 : 0.85);
        p.shoulderR.rotation.x += Math.sin(ph) * stride * (isRun ? 1.25 : 0.85);
        break;
      }
      case 'attack1': {
        // Wild overhand slash (goblin) or heavy horizontal sweep (chief)
        const swing = u < 0.32 ? -u / 0.32 : (u - 0.32) / 0.68;
        const arc = Math.sin(Math.min(1, Math.max(0, (u - 0.2) / 0.5)) * Math.PI);
        if (isHeavy) {
          p.torso.rotation.y = THREE.MathUtils.lerp(-0.75, 0.95, Math.min(1, u * 1.5)) * k;
          p.shoulderR.rotation.z = -0.85 * k;
          p.shoulderR.rotation.y = THREE.MathUtils.lerp(-0.9, 1.2, Math.min(1, u * 1.4)) * k;
        } else {
          p.shoulderR.rotation.x += (swing < 0 ? swing * 2.4 : -2.4 + swing * 3.9) * k;
          p.elbowR.rotation.x += swing < 0 ? -0.4 : 0.3;
          p.torso.rotation.x += arc * 0.42 * k;
          p.torso.rotation.y = -arc * 0.45 * k;
          p.hips.position.z = arc * 0.14 * k;
        }
        p.jaw.rotation.x += arc * 0.65 * k;
        break;
      }
      case 'attack2': {
        // Aggressive cross slash
        const arc = Math.sin(u * Math.PI);
        p.torso.rotation.y = Math.sin(u * Math.PI * 2) * 0.68 * k;
        p.shoulderL.rotation.x += (-1.7 + u * 3.1) * k;
        p.shoulderL.rotation.z = (0.7 - u * 1.5) * k;
        p.shoulderR.rotation.x += (-1.2 + arc * 1.9) * k;
        p.shoulderR.rotation.z = (-0.6 + u * 1.2) * k;
        p.jaw.rotation.x += arc * 0.55 * k;
        break;
      }
      case 'windup': {
        const pulse = 0.85 + Math.sin(t * 9) * 0.15;
        p.torso.rotation.x -= 0.28 * k;
        p.shoulderR.rotation.x -= 2.25 * pulse * k;
        p.jaw.rotation.x += 0.45 * k;
        break;
      }
      case 'slam': {
        let armX = 0;
        let torsoX = 0;
        if (u < 0.55) {
          const r = Math.min(1, u / 0.4);
          armX = -2.5 * r;
          torsoX = -0.38 * r;
        } else if (u < 0.78) {
          const s = (u - 0.55) / 0.23;
          armX = THREE.MathUtils.lerp(-2.5, 1.25, s);
          torsoX = THREE.MathUtils.lerp(-0.38, 0.58, s);
          p.hips.position.y -= s * 0.22 * k;
        } else {
          const rec = (u - 0.78) / 0.22;
          armX = THREE.MathUtils.lerp(1.25, 0, rec);
          torsoX = THREE.MathUtils.lerp(0.58, 0, rec);
        }
        p.shoulderR.rotation.x += armX * k;
        p.shoulderL.rotation.x += armX * 0.8 * k;
        p.torso.rotation.x += torsoX * k;
        p.jaw.rotation.x += 0.55 * k;
        break;
      }
      case 'charge': {
        const ph = t * 11.5;
        p.torso.rotation.x += 0.35 * k;
        p.head.rotation.x -= 0.30 * k;
        p.shoulderL.rotation.x += 0.85 * k;
        p.shoulderR.rotation.x += 0.85 * k;
        p.hipL.rotation.x += Math.sin(ph) * 0.9 * k;
        p.hipR.rotation.x -= Math.sin(ph) * 0.9 * k;
        p.hips.position.y += Math.abs(Math.sin(ph)) * 0.08 * k;
        break;
      }
      case 'shoot': {
        const draw = u < 0.7 ? u / 0.7 : Math.max(0, 1 - (u - 0.7) / 0.12);
        p.torso.rotation.y = -0.55 * k;
        p.head.rotation.y = 0.5 * k;
        p.shoulderL.rotation.x = -1.25 * k;
        p.shoulderL.rotation.y = 0.45 * k;
        p.shoulderR.rotation.x = -1.25 * k;
        p.elbowR.rotation.y = -draw * 1.15 * k;
        if (bowStringMesh) bowStringMesh.position.z = -0.05 - draw * 0.14;
        break;
      }
      case 'cast': {
        const flare = Math.sin(u * Math.PI);
        p.shoulderR.rotation.x -= 2.1 * flare * k;
        p.shoulderL.rotation.x -= 1.2 * flare * k;
        p.torso.rotation.x -= 0.22 * flare * k;
        if (orbMat) orbMat.emissiveIntensity = 1.6 + flare * 3.5;
        break;
      }
      case 'heal': {
        const flare = Math.sin(u * Math.PI);
        p.shoulderL.rotation.z += 1.25 * flare * k;
        p.shoulderR.rotation.z -= 1.25 * flare * k;
        if (healRingMesh) {
          healRingMesh.visible = true;
          const sc = 0.2 + u * 3.2;
          healRingMesh.scale.set(sc, 1, sc);
        }
        break;
      }
      case 'roar': {
        const open = Math.sin(u * Math.PI);
        p.torso.rotation.x -= 0.48 * open * k;
        p.head.rotation.x -= 0.42 * open * k;
        p.jaw.rotation.x += 0.85 * open * k;
        p.shoulderL.rotation.z += 1.05 * open * k;
        p.shoulderR.rotation.z -= 1.05 * open * k;
        p.shoulderL.rotation.x -= 0.45 * open * k;
        p.shoulderR.rotation.x -= 0.45 * open * k;
        break;
      }
      case 'throw': {
        const spin = u < 0.45 ? -u * 3.2 : -1.44 + (u - 0.45) * 5.2;
        p.torso.rotation.y = spin * 0.65 * k;
        p.shoulderR.rotation.x += (-1.8 + u * 3.1) * k;
        break;
      }
      case 'hit': {
        const snap = Math.sin(u * Math.PI);
        p.torso.rotation.x -= 0.45 * snap * k;
        p.head.rotation.x -= 0.5 * snap * k;
        p.jaw.rotation.x += 0.45 * snap * k;
        break;
      }
      case 'stagger': {
        const w = Math.sin(u * Math.PI * 2);
        p.hips.position.z = -Math.sin(u * Math.PI) * 0.20 * k;
        p.torso.rotation.z = w * 0.30 * k;
        p.torso.rotation.x -= Math.sin(u * Math.PI) * 0.28 * k;
        break;
      }
      case 'flee': {
        // Panicked sprint looking back over shoulder with flailing raised arms
        const ph = t * 11.5;
        p.hipL.rotation.x += Math.sin(ph) * 0.9 * k;
        p.hipR.rotation.x -= Math.sin(ph) * 0.9 * k;
        p.shoulderL.rotation.x = -2.2 + Math.sin(ph) * 0.45;
        p.shoulderR.rotation.x = -2.2 - Math.sin(ph) * 0.45;
        p.torso.rotation.y = 0.38 * k;
        p.head.rotation.y = ( 1.15 + Math.sin(t * 6.0) * 0.25 ) * k;
        p.jaw.rotation.x += 0.55;
        break;
      }
      case 'hesitate': {
        const w = Math.sin(t * 4.5);
        p.hips.position.z = -0.10 * k;
        p.torso.rotation.x += 0.15 * k;
        p.head.rotation.y = w * 0.28 * k;
        p.shoulderR.rotation.x += 0.35 * k;
        break;
      }
      case 'spawn': {
        const rise = 1 - Math.pow(1 - u, 2);
        p.hips.position.y *= rise;
        p.torso.rotation.x += (1 - rise) * 0.85;
        break;
      }
      case 'death': {
        // Collapse onto side and end lying flat on ground
        const fall = Math.min(1, u * 1.35);
        const ease = fall * fall * (3 - 2 * fall);
        p.hips.position.y = THREE.MathUtils.lerp(p.hips.userData.restPos.y, arch.torsoWTop * 0.62, ease);
        p.hips.position.x = ease * arch.height * 0.18;
        p.hips.rotation.z = ease * 1.52;
        p.torso.rotation.x = THREE.MathUtils.lerp(p.torso.userData.restRot.x, 0.12, ease);
        p.hipL.rotation.x = THREE.MathUtils.lerp(p.hipL.userData.restRot.x, -0.15, ease);
        p.hipR.rotation.x = THREE.MathUtils.lerp(p.hipR.userData.restRot.x, 0.25, ease);
        p.kneeL.rotation.x = THREE.MathUtils.lerp(p.kneeL.userData.restRot.x, 0.35, ease);
        p.kneeR.rotation.x = THREE.MathUtils.lerp(p.kneeR.userData.restRot.x, 0.55, ease);
        p.shoulderL.rotation.z = ease * 0.85;
        p.shoulderR.rotation.z = -ease * 0.55;
        p.jaw.rotation.x += ease * 0.5;
        break;
      }
      case 'ambushWait': {
        // Crouched very low & still with tongue hanging out
        const w = Math.sin(t * 2.4);
        p.hips.position.y *= 0.48;
        p.hipL.rotation.x = -0.95;
        p.hipR.rotation.x = -0.95;
        p.kneeL.rotation.x = 1.65;
        p.kneeR.rotation.x = 1.65;
        p.torso.rotation.x += 0.32;
        p.head.rotation.x -= 0.48;
        p.head.rotation.y = w * 0.22;
        p.jaw.rotation.x += 0.48;
        if (tongueMesh) {
          tongueMesh.scale.set(1.15, 1.45, 1.15);
          tongueMesh.rotation.z = Math.sin(t * 4.5) * 0.28;
        }
        break;
      }
    }

    applyExpressionOffsets(t);
  }

  function setEyeGlow(intensity = 1) {
    currentEyeGlow = Math.max(0, Math.min(2, intensity));
    eyeMat.emissiveIntensity = currentEyeGlow * 1.5 + currentEnrage * 0.8;
    const s = 1 + Math.max(0, currentEyeGlow - 1) * 0.35;
    if (eyesMesh) eyesMesh.scale.set(1, s, 1);
  }

  function setExpression(name = 'neutral') {
    currentExpr = name;
    if (eyesMesh && name !== 'dead') {
      eyesMesh.scale.y = 1;
    }
  }

  function setTint(hex, amount = 0) {
    ensureClonedMaterials();
    const a = Math.max(0, Math.min(1, amount));
    const target = hex !== null && hex !== undefined ? new THREE.Color(hex) : null;
    for (const m of meshes) {
      const base = baseMats.get(m);
      if (!base) continue;
      m.material.color.copy(base.color);
      if (target && a > 0) {
        m.material.color.lerp(target, a);
      }
    }
  }

  function setOpacity(a = 1) {
    ensureClonedMaterials();
    const op = Math.max(0, Math.min(1, a));
    const isTrans = op < 0.999;
    for (const m of meshes) {
      m.material.transparent = isTrans;
      m.material.opacity = op;
      m.material.depthWrite = !isTrans;
    }
    for (const ol of outlines) {
      ol.material.transparent = isTrans;
      ol.material.opacity = op;
      ol.material.depthWrite = !isTrans;
    }
  }

  function setEnrage(amount = 0) {
    currentEnrage = Math.max(0, Math.min(1, amount));
    ensureClonedMaterials();
    const rageCol = new THREE.Color(0xc82818);
    for (const m of meshes) {
      const base = baseMats.get(m);
      if (base === sharedSkinMat) {
        m.material.color.copy(base.color).lerp(rageCol, currentEnrage * 0.45);
      }
    }
    if (auraMesh) {
      auraMesh.visible = currentEnrage > 0.01;
      auraMesh.material.opacity = currentEnrage * 0.34;
    }
    setEyeGlow(1 + currentEnrage);
    root.scale.setScalar(scaleVar * (1 + currentEnrage * 0.06));
  }

  function setOutlineVisible(bool) {
    const v = Boolean(bool);
    for (const ol of outlines) ol.visible = v;
  }

  function getBounds() {
    group.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(group);
  }

  function dispose() {
    if (matsCloned) {
      for (const m of meshes) m.material.dispose();
      for (const ol of outlines) ol.material.dispose();
    }
    eyeMat.dispose();
    if (orbMat) orbMat.dispose();
    if (auraMesh) auraMesh.material.dispose();
  }

  setPose('idle', 0, 1);

  return {
    group,
    parts,
    sockets,
    anchors,
    setPose,
    setEyeGlow,
    setExpression,
    setTint,
    setOpacity,
    setEnrage,
    setOutlineVisible,
    getBounds,
    dispose
  };
}
