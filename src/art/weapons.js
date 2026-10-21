import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const WEAPON_KINDS = [
  'sword', 'greatsword', 'spear', 'dagger', 'bow', 'staff', 'mace', 'club', 'pickaxe'
];

export const SHIELD_KINDS = [
  'woodenRound', 'plank', 'ironRound', 'kite'
];

export const GRADE_UI_COLORS = {
  'E': 0x9a9a9a,
  'D': 0x6fbf73,
  'C': 0x4aa3ff,
  'B': 0xb26bff,
  'A': 0xffc83a,
  'S': 0xff4d5e,
  'S+': 0xffffff
};

const GRADE_STYLES = {
  'E': {
    blade: 0x826f61, edge: 0x9e8b7c, guard: 0x574639, wood: 0x694a32, grip: 0x473324,
    gem: 0x6e584f, rune: 0xff6a33, glow: 0.0, rust: 0.85, trim: 0x695546
  },
  'D': {
    blade: 0xb6c7d9, edge: 0xdbe9f7, guard: 0x748291, wood: 0x785538, grip: 0x543c2b,
    gem: 0x52c478, rune: 0x6fbf73, glow: 0.08, rust: 0.0, trim: 0x8d9dad
  },
  'C': {
    blade: 0xd8e4f0, edge: 0xf7fbff, guard: 0x8e9eab, wood: 0x855c3a, grip: 0x693722,
    gem: 0x429bff, rune: 0x4aa3ff, glow: 0.16, rust: 0.0, trim: 0xb2c2d1
  },
  'B': {
    blade: 0x647d9e, edge: 0xa3c1e8, guard: 0xd9a843, wood: 0x61422f, grip: 0x472736,
    gem: 0xa95cff, rune: 0xb26bff, glow: 0.28, rust: 0.0, trim: 0xf0be54
  },
  'A': {
    blade: 0xeef5fc, edge: 0xffffff, guard: 0xf7c53b, wood: 0x7a4e30, grip: 0x2e4066,
    gem: 0x1cb0ff, rune: 0x47b8ff, glow: 0.45, rust: 0.0, trim: 0xffdb63
  },
  'S': {
    blade: 0x362d38, edge: 0xd92b42, guard: 0xa81e30, wood: 0x3b2026, grip: 0x591520,
    gem: 0xff2440, rune: 0xff3347, glow: 0.90, rust: 0.0, trim: 0xe62942
  },
  'S+': {
    blade: 0xf7fbff, edge: 0xffffff, guard: 0xffe078, wood: 0x997963, grip: 0x5a4c7a,
    gem: 0x78faff, rune: 0x8affff, glow: 1.25, rust: 0.0, trim: 0xffec9e
  }
};

const _geomCache = new Map();
const _matCache = new Map();
const _texCache = new Map();

function getToonGradient() {
  if (_texCache.has('toonGrad')) return _texCache.get('toonGrad');
  // Higher lightness steps so steel reads bright against dark backgrounds
  const data = new Uint8Array([
    115, 118, 130, 255,
    170, 175, 188, 255,
    222, 226, 236, 255,
    255, 255, 255, 255
  ]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  _texCache.set('toonGrad', tex);
  return tex;
}

function getGradeTexture(grade) {
  const key = `tex_${grade}`;
  if (_texCache.has(key)) return _texCache.get(key);
  if (typeof document === 'undefined') {
    const tex = new THREE.Texture();
    _texCache.set(key, tex);
    return tex;
  }
  const st = GRADE_STYLES[grade] || GRADE_STYLES['E'];
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Top half: metal sheen + fuller + bright edge; Bottom half: wood & leather wrap
  const grad = ctx.createLinearGradient(0, 0, 128, 0);
  grad.addColorStop(0.0, '#eef4fa');
  grad.addColorStop(0.25, '#ffffff');
  grad.addColorStop(0.5, grade === 'C' || grade === 'A' ? '#becce0' : '#d8e0e8');
  grad.addColorStop(0.75, '#ffffff');
  grad.addColorStop(1.0, '#eef4fa');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 64);

  if (st.rust > 0) {
    for (let i = 0; i < 55; i++) {
      const rx = (Math.sin(i * 73.1) * 0.5 + 0.5) * 128;
      const ry = (Math.cos(i * 39.7) * 0.5 + 0.5) * 60;
      const rr = (2.5 + (i % 6) * 2.4) * st.rust;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(186, 85, 32, 0.72)' : 'rgba(120, 56, 24, 0.60)';
      ctx.beginPath();
      ctx.arc(rx, ry, rr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Bottom half: wood grain & crisp leather wrap bands
  ctx.fillStyle = '#e8dfd5';
  ctx.fillRect(0, 64, 128, 64);
  ctx.strokeStyle = 'rgba(55, 34, 18, 0.42)';
  ctx.lineWidth = 2.5;
  for (let y = 68; y < 128; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y + (y % 16 === 0 ? 3 : -3));
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  _texCache.set(key, tex);
  return tex;
}

function getOutlineMaterial() {
  if (_matCache.has('outline')) return _matCache.get('outline');
  const mat = new THREE.MeshBasicMaterial({
    color: 0x14101c,
    side: THREE.BackSide
  });
  _matCache.set('outline', mat);
  return mat;
}

function getBaseToonMaterial(grade) {
  const key = `toon_${grade}`;
  if (_matCache.has(key)) return _matCache.get(key);
  const mat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    vertexColors: true,
    gradientMap: getToonGradient(),
    map: getGradeTexture(grade)
  });
  _matCache.set(key, mat);
  return mat;
}

function getBaseRuneMaterial(grade) {
  const key = `rune_${grade}`;
  if (_matCache.has(key)) return _matCache.get(key);
  const st = GRADE_STYLES[grade] || GRADE_STYLES['E'];
  const mat = new THREE.MeshBasicMaterial({
    color: st.rune,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide
  });
  _matCache.set(key, mat);
  return mat;
}

export function disposeWeaponCaches() {
  for (const g of _geomCache.values()) g.dispose();
  for (const m of _matCache.values()) m.dispose();
  for (const t of _texCache.values()) t.dispose();
  _geomCache.clear();
  _matCache.clear();
  _texCache.clear();
}

function prepPart(geom, hexColor, isMetal = true, wearTag = 0, edgeHex = null) {
  const g = geom.index ? geom.toNonIndexed() : geom.clone();
  g.computeVertexNormals();
  const count = g.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const baseCol = new THREE.Color(hexColor);
  const edgeCol = edgeHex !== null ? new THREE.Color(edgeHex) : baseCol;
  const uv = g.attributes.uv || new THREE.BufferAttribute(new Float32Array(count * 2), 2);
  const pos = g.attributes.position;

  let maxAbsZ = 0.001;
  if (edgeHex !== null) {
    for (let i = 0; i < count; i++) {
      const az = Math.abs(pos.getZ(i));
      if (az > maxAbsZ) maxAbsZ = az;
    }
  }

  for (let i = 0; i < count; i++) {
    const px = pos.getX(i);
    const pz = pos.getZ(i);
    const isEdgeVertex = edgeHex !== null && Math.abs(px) < 0.003 && Math.abs(pz) > maxAbsZ * 0.45;
    const c = isEdgeVertex ? edgeCol : baseCol;
    const shade = isEdgeVertex ? 1.08 : (0.95 + 0.05 * Math.sin(i * 1.7));

    colors[i * 3] = Math.min(1, c.r * shade);
    colors[i * 3 + 1] = Math.min(1, c.g * shade);
    colors[i * 3 + 2] = Math.min(1, c.b * shade);

    const u = isEdgeVertex ? 0.25 : ((px * 2.5 + 0.5) % 1);
    const vBase = isMetal ? 0.25 : 0.78;
    uv.setXY(i, Math.abs(u), vBase);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.setAttribute('uv', uv);

  const tags = new Float32Array(count);
  tags.fill(wearTag);
  g.setAttribute('aWearTag', new THREE.BufferAttribute(tags, 1));
  return g;
}

function makeDiamondBlade(length, widthBase, widthTip, thickBase, thickTip) {
  const g = new THREE.BufferGeometry();
  const segs = 6;
  const positions = [];

  const profile = (t) => {
    if (t > 0.80) {
      const k = 1 - (t - 0.80) / 0.20;
      return {
        w: (widthBase + (widthTip - widthBase) * 0.80) * Math.max(0.01, k),
        th: (thickBase + (thickTip - thickBase) * 0.80) * Math.max(0.03, k)
      };
    }
    const f = t / 0.80;
    return {
      w: widthBase + (widthTip - widthBase) * f,
      th: thickBase + (thickTip - thickBase) * f
    };
  };

  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const y0 = -t0 * length;
    const y1 = -t1 * length;
    const p0 = profile(t0);
    const p1 = profile(t1);

    const pts0 = [
      [0, y0, p0.w * 0.5],     // +Z cutting edge
      [p0.th * 0.5, y0, 0],    // +X central ridge
      [0, y0, -p0.w * 0.5],    // -Z back edge
      [-p0.th * 0.5, y0, 0]    // -X central ridge
    ];
    const pts1 = [
      [0, y1, p1.w * 0.5],
      [p1.th * 0.5, y1, 0],
      [0, y1, -p1.w * 0.5],
      [-p1.th * 0.5, y1, 0]
    ];

    for (let s = 0; s < 4; s++) {
      const sn = (s + 1) % 4;
      const a = pts0[s], b = pts0[sn], c = pts1[sn], d = pts1[s];
      positions.push(...a, ...d, ...c, ...a, ...c, ...b);
    }
  }

  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

function makeCurvedPickArm(dirZ) {
  // Continuous 4-segment tapered curved pick starting deep inside the eye block (z=0, y=-0.62)
  const g = new THREE.BufferGeometry();
  const nodes = [
    { y: -0.620, z: dirZ * 0.010, wx: 0.017, hy: 0.024 },
    { y: -0.614, z: dirZ * 0.095, wx: 0.014, hy: 0.020 },
    { y: -0.596, z: dirZ * 0.185, wx: 0.010, hy: 0.014 },
    { y: -0.568, z: dirZ * 0.265, wx: 0.002, hy: 0.002 }
  ];
  const positions = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const n0 = nodes[i];
    const n1 = nodes[i + 1];
    const p0 = [
      [0, n0.y + n0.hy, n0.z],
      [n0.wx, n0.y, n0.z],
      [0, n0.y - n0.hy, n0.z],
      [-n0.wx, n0.y, n0.z]
    ];
    const p1 = [
      [0, n1.y + n1.hy, n1.z],
      [n1.wx, n1.y, n1.z],
      [0, n1.y - n1.hy, n1.z],
      [-n1.wx, n1.y, n1.z]
    ];
    for (let s = 0; s < 4; s++) {
      const sn = (s + 1) % 4;
      const a = p0[s], b = p0[sn], c = p1[sn], d = p1[s];
      if (dirZ > 0) {
        positions.push(...a, ...b, ...c, ...a, ...c, ...d);
      } else {
        positions.push(...a, ...d, ...c, ...a, ...c, ...b);
      }
    }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

function makeBox(sx, sy, sz, tx = 0, ty = 0, tz = 0) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.translate(tx, ty, tz);
  return g;
}

function makeCyl(rt, rb, h, segs, tx = 0, ty = 0, tz = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, segs, 1);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(tx, ty, tz);
  return g;
}

function makeOcta(r, sx = 1, sy = 1, sz = 1, tx = 0, ty = 0, tz = 0) {
  const g = new THREE.OctahedronGeometry(r, 0);
  g.scale(sx, sy, sz);
  g.translate(tx, ty, tz);
  return g;
}

function buildRuneStrips(strips) {
  const parts = [];
  for (const s of strips) {
    const g = new THREE.BoxGeometry(s.sx, s.sy, s.sz);
    if (s.rx) g.rotateX(s.rx);
    if (s.ry) g.rotateY(s.ry);
    if (s.rz) g.rotateZ(s.rz);
    g.translate(s.x, s.y, s.z);
    parts.push(g);
  }
  return mergeGeometries(parts, false);
}

function getWeaponGeometryData(kind, grade) {
  const cacheKey = `wgeom_${kind}_${grade}`;
  if (_geomCache.has(cacheKey)) return _geomCache.get(cacheKey);

  const st = GRADE_STYLES[grade] || GRADE_STYLES['E'];
  const isHigh = grade === 'A' || grade === 'S' || grade === 'S+';
  const hasFuller = grade !== 'E';
  const bodyParts = [];
  const runeStrips = [];
  let specialGeom = null;
  let anchors = {};

  if (kind === 'sword') {
    // Total length 1.0m: pommel +0.16, grip [-0.09..+0.13], guard -0.09, blade [-0.08..-0.84]
    bodyParts.push(prepPart(makeCyl(0.017, 0.020, 0.22, 6, 0, 0.02, 0), st.grip, false, 0));
    bodyParts.push(prepPart(makeOcta(0.035, 1, 1.15, 1, 0, 0.14, 0), st.guard, true, 0));
    const gw = isHigh ? 0.26 : 0.22;
    bodyParts.push(prepPart(makeBox(0.036, 0.038, gw, 0, -0.09, 0), st.guard, true, 0));
    if (isHigh) {
      bodyParts.push(prepPart(makeOcta(0.025, 1.25, 1, 1, 0, -0.09, 0), st.gem, true, 0));
      bodyParts.push(prepPart(makeBox(0.024, 0.052, 0.036, 0, -0.10, gw * 0.47), st.trim, true, 0));
      bodyParts.push(prepPart(makeBox(0.024, 0.052, 0.036, 0, -0.10, -gw * 0.47), st.trim, true, 0));
    }
    // Blade overlaps inside guard (-0.08 to -0.84) with bright edge highlight
    const blade = makeDiamondBlade(0.76, 0.076, 0.052, 0.022, 0.014);
    blade.translate(0, -0.08, 0);
    bodyParts.push(prepPart(blade, st.blade, true, 1, st.edge));
    if (hasFuller) {
      bodyParts.push(prepPart(makeBox(0.025, 0.48, 0.016, 0, -0.34, 0), st.guard, true, 0));
    }

    runeStrips.push(
      { sx: 0.028, sy: 0.46, sz: 0.009, x: 0, y: -0.37, z: 0 },
      { sx: 0.030, sy: 0.012, sz: 0.038, x: 0, y: -0.22, z: 0 },
      { sx: 0.030, sy: 0.012, sz: 0.034, x: 0, y: -0.38, z: 0 },
      { sx: 0.030, sy: 0.012, sz: 0.028, x: 0, y: -0.54, z: 0 }
    );
    anchors = {
      grip: [0, 0, 0], pommel: [0, 0.16, 0], tip: [0, -0.84, 0],
      edgeBase: [0, -0.11, 0.038], edgeTip: [0, -0.83, 0.01], hit: [0, -0.48, 0]
    };
  } else if (kind === 'greatsword') {
    // Total length 1.5m: pommel +0.26, grip [-0.15..+0.23], guard -0.15, blade [-0.13..-1.24]
    bodyParts.push(prepPart(makeCyl(0.021, 0.024, 0.38, 6, 0, 0.04, 0), st.grip, false, 0));
    bodyParts.push(prepPart(makeOcta(0.046, 1, 1.2, 1, 0, 0.24, 0), st.guard, true, 0));
    const gw = isHigh ? 0.38 : 0.33;
    bodyParts.push(prepPart(makeBox(0.048, 0.048, gw, 0, -0.15, 0), st.guard, true, 0));
    bodyParts.push(prepPart(makeBox(0.034, 0.13, 0.09, 0, -0.21, 0), st.trim, true, 0));
    if (isHigh) {
      bodyParts.push(prepPart(makeOcta(0.032, 1.3, 1, 1, 0, -0.15, 0), st.gem, true, 0));
    }
    const blade = makeDiamondBlade(1.11, 0.106, 0.075, 0.030, 0.018);
    blade.translate(0, -0.13, 0);
    bodyParts.push(prepPart(blade, st.blade, true, 1, st.edge));
    if (hasFuller) {
      bodyParts.push(prepPart(makeBox(0.033, 0.68, 0.022, 0, -0.58, 0), st.guard, true, 0));
    }

    runeStrips.push(
      { sx: 0.035, sy: 0.78, sz: 0.014, x: 0, y: -0.58, z: 0 },
      { sx: 0.037, sy: 0.016, sz: 0.055, x: 0, y: -0.35, z: 0 },
      { sx: 0.037, sy: 0.016, sz: 0.050, x: 0, y: -0.58, z: 0 },
      { sx: 0.037, sy: 0.016, sz: 0.042, x: 0, y: -0.81, z: 0 }
    );
    anchors = {
      grip: [0, 0, 0], pommel: [0, 0.26, 0], tip: [0, -1.24, 0],
      edgeBase: [0, -0.18, 0.052], edgeTip: [0, -1.22, 0.012], hit: [0, -0.72, 0]
    };
  } else if (kind === 'spear') {
    // Total length 2.0m: pommel +0.65, shaft [+0.63..-0.96], ferrule [-0.88..-0.98], leaf blade [-0.93..-1.35]
    bodyParts.push(prepPart(makeCyl(0.018, 0.019, 1.59, 6, 0, -0.165, 0), st.wood, false, 0));
    bodyParts.push(prepPart(makeCyl(0.022, 0.022, 0.36, 6, 0, 0.0, 0), st.grip, false, 0));
    bodyParts.push(prepPart(makeOcta(0.028, 0.9, 1.4, 0.9, 0, 0.63, 0), st.guard, true, 0));
    // Overlapping ferrule collar & tassel
    bodyParts.push(prepPart(makeCyl(0.030, 0.021, 0.11, 6, 0, -0.93, 0), st.guard, true, 0));
    bodyParts.push(prepPart(makeBox(0.018, 0.13, 0.036, 0, -0.89, -0.026), 0xc42b2b, false, 0));
    // Leaf blade deeply socketed into ferrule (-0.93 to -1.35)
    const blade = makeDiamondBlade(0.42, 0.056, 0.090, 0.025, 0.016);
    blade.translate(0, -0.93, 0);
    bodyParts.push(prepPart(blade, st.blade, true, 1, st.edge));

    runeStrips.push(
      { sx: 0.028, sy: 0.28, sz: 0.012, x: 0, y: -1.11, z: 0 },
      { sx: 0.044, sy: 0.05, sz: 0.044, x: 0, y: -0.93, z: 0 }
    );
    anchors = {
      grip: [0, 0, 0], pommel: [0, 0.65, 0], tip: [0, -1.35, 0],
      edgeBase: [0, -0.95, 0.042], edgeTip: [0, -1.35, 0.01], hit: [0, -1.15, 0]
    };
  } else if (kind === 'dagger') {
    // Total length 0.40m: pommel +0.08, grip [-0.055..+0.068], guard -0.055, blade [-0.045..-0.32]
    bodyParts.push(prepPart(makeCyl(0.014, 0.016, 0.125, 6, 0, 0.005, 0), st.grip, false, 0));
    bodyParts.push(prepPart(makeOcta(0.025, 1, 0.95, 1, 0, 0.070, 0), st.guard, true, 0));
    bodyParts.push(prepPart(makeBox(0.028, 0.024, 0.12, 0, -0.055, 0), st.guard, true, 0));
    const blade = makeDiamondBlade(0.275, 0.052, 0.038, 0.018, 0.012);
    blade.translate(0, -0.045, 0);
    bodyParts.push(prepPart(blade, st.blade, true, 1, st.edge));

    runeStrips.push(
      { sx: 0.022, sy: 0.18, sz: 0.008, x: 0, y: -0.16, z: 0 }
    );
    anchors = {
      grip: [0, 0, 0], pommel: [0, 0.08, 0], tip: [0, -0.32, 0],
      edgeBase: [0, -0.06, 0.026], edgeTip: [0, -0.32, 0.008], hit: [0, -0.19, 0]
    };
  } else if (kind === 'bow') {
    // Height 1.2m along Y [-0.60..+0.60], grip at [0,0,0], limbs curve toward -Z
    const riserParts = [];
    riserParts.push(prepPart(makeCyl(0.021, 0.021, 0.22, 6, 0, 0, 0.018), st.grip, false, 0));
    riserParts.push(prepPart(makeBox(0.034, 0.045, 0.046, 0, 0.10, 0.016), st.guard, true, 0));
    riserParts.push(prepPart(makeBox(0.034, 0.045, 0.046, 0, -0.10, 0.016), st.guard, true, 0));

    // Grade upgrades: C/B adds iron reinforced plates; A adds rune trims
    if (grade === 'C' || grade === 'B' || isHigh) {
      riserParts.push(prepPart(makeBox(0.038, 0.16, 0.012, 0, 0, 0.038), st.guard, true, 1));
    }

    const segs = [
      { y0: 0.09, z0: 0.016, y1: 0.29, z1: 0.04, r0: 0.020, r1: 0.017 },
      { y0: 0.27, z0: 0.038, y1: 0.47, z1: -0.02, r0: 0.017, r1: 0.014 },
      { y0: 0.45, z0: -0.018, y1: 0.60, z1: -0.13, r0: 0.014, r1: 0.010 }
    ];

    const topParts = [];
    const botParts = [];

    for (const s of segs) {
      const dy = s.y1 - s.y0;
      const dz = s.z1 - s.z0;
      const len = Math.hypot(dy, dz);
      const angle = Math.atan2(dz, dy);

      // Top limb relative to pivot [0, 0.10, 0.016]
      const gTop = new THREE.CylinderGeometry(s.r1, s.r0, len, 6, 1);
      gTop.rotateX(angle);
      gTop.translate(0, (s.y0 + s.y1) * 0.5 - 0.10, (s.z0 + s.z1) * 0.5 - 0.016);
      topParts.push(prepPart(gTop, isHigh ? st.blade : st.wood, isHigh, 1));

      // Bot limb relative to pivot [0, -0.10, 0.016]
      const gBot = new THREE.CylinderGeometry(s.r1, s.r0, len, 6, 1);
      gBot.rotateX(-angle);
      gBot.translate(0, -((s.y0 + s.y1) * 0.5) - (-0.10), (s.z0 + s.z1) * 0.5 - 0.016);
      botParts.push(prepPart(gBot, isHigh ? st.blade : st.wood, isHigh, 1));
    }

    // Tips
    const topTip = makeOcta(0.020, 0.85, 1.4, 1.0, 0, 0.595 - 0.10, -0.128 - 0.016);
    topParts.push(prepPart(topTip, (grade === 'S' || grade === 'S+') ? st.gem : st.trim, true, 0));

    const botTip = makeOcta(0.020, 0.85, 1.4, 1.0, 0, -0.595 - (-0.10), -0.128 - 0.016);
    botParts.push(prepPart(botTip, (grade === 'S' || grade === 'S+') ? st.gem : st.trim, true, 0));

    if (grade === 'S+') {
      topParts.push(prepPart(makeBox(0.008, 0.14, 0.05, 0, 0.52 - 0.10, -0.10 - 0.016), st.gem, true, 0));
      botParts.push(prepPart(makeBox(0.008, 0.14, 0.05, 0, -0.52 - (-0.10), -0.10 - 0.016), st.gem, true, 0));
    }

    const riserGeom = mergeGeometries(riserParts, false);
    const limbTopGeom = mergeGeometries(topParts, false);
    const limbBotGeom = mergeGeometries(botParts, false);

    // Merge static version into bodyParts for bounds & fallback
    bodyParts.push(...riserParts);
    for (const sign of [1, -1]) {
      for (const s of segs) {
        const dy = (s.y1 - s.y0) * sign;
        const dz = s.z1 - s.z0;
        const len = Math.hypot(dy, dz);
        const angle = Math.atan2(dz, dy);
        const g = new THREE.CylinderGeometry(s.r1, s.r0, len, 6, 1);
        g.rotateX(angle);
        g.translate(0, (s.y0 + s.y1) * 0.5 * sign, (s.z0 + s.z1) * 0.5);
        bodyParts.push(prepPart(g, isHigh ? st.blade : st.wood, isHigh, 1));
      }
      bodyParts.push(prepPart(makeOcta(0.020, 0.85, 1.4, 1.0, 0, 0.595 * sign, -0.128), st.trim, true, 0));
    }

    specialGeom = { riserGeom, limbTopGeom, limbBotGeom };

    runeStrips.push(
      { sx: 0.036, sy: 0.18, sz: 0.015, x: 0, y: 0.25, z: 0.03 },
      { sx: 0.036, sy: 0.18, sz: 0.015, x: 0, y: -0.25, z: 0.03 }
    );
    anchors = {
      grip: [0, 0, 0], pommel: [0, 0.60, -0.13], tip: [0, -0.60, -0.13],
      nock: [0, 0, -0.13], arrowShelf: [0.015, 0.02, 0.02],
      edgeBase: [0, 0.58, 0.03], edgeTip: [0, -0.58, 0.03], hit: [0, 0, 0.05]
    };
  } else if (kind === 'staff') {
    // Total length 1.70m: bottom butt +0.79, grip [0,0,0] (46% from bottom), crown [-0.78..-1.02], orb at [-0.91, 0.03] (up and forward)
    bodyParts.push(prepPart(makeCyl(0.019, 0.017, 1.62, 6, 0, -0.06, 0.01), st.wood, false, 0));
    bodyParts.push(prepPart(makeCyl(0.023, 0.023, 0.32, 6, 0, 0, 0), st.grip, false, 0));
    bodyParts.push(prepPart(makeOcta(0.029, 1, 1.4, 1, 0, 0.79, -0.02), st.guard, true, 0));
    // Crown base collar & wide bridge tilted slightly forward (+Z)
    bodyParts.push(prepPart(makeCyl(0.036, 0.022, 0.10, 6, 0, -0.78, 0.03), st.guard, true, 0));
    const prongOffset = isHigh ? 0.088 : 0.072;
    bodyParts.push(prepPart(makeBox(0.030, 0.036, prongOffset * 1.7, 0, -0.80, 0.03), st.guard, true, 0));

    for (const dir of [1, -1]) {
      const p1 = makeBox(0.024, 0.16, 0.026, 0, 0, 0);
      p1.rotateX(dir * -0.15);
      p1.translate(0, -0.86, 0.03 + dir * prongOffset * 0.68);
      bodyParts.push(prepPart(p1, st.guard, true, 1));

      const p2 = makeBox(0.020, 0.13, 0.024, 0, 0, 0);
      p2.rotateX(dir * 0.25);
      p2.translate(0, -0.97, 0.04 + dir * prongOffset * 0.52);
      bodyParts.push(prepPart(p2, st.trim, true, 1));
    }
    if (isHigh) {
      bodyParts.push(prepPart(makeBox(0.022, 0.12, 0.19, 0, -0.81, 0.03), st.trim, true, 0));
    }
    specialGeom = prepPart(makeOcta(0.058, 1, 1.15, 1, 0, 0, 0), st.gem, true, 0);

    runeStrips.push(
      { sx: 0.042, sy: 0.04, sz: 0.042, x: 0, y: -0.78, z: 0.03 },
      { sx: 0.026, sy: 0.25, sz: 0.026, x: 0, y: -0.55, z: 0.02 }
    );
    anchors = {
      grip: [0, 0, 0],
      staffGrip: [0, 0, 0], // exactly 46% (~40%) from bottom pommel
      pommel: [0, 0.79, -0.02],
      tip: [0, -1.02, 0.05],
      edgeBase: [0, -0.78, 0.05],
      edgeTip: [0, -1.02, 0.05],
      hit: [0, -0.91, 0.03]
    };
  } else if (kind === 'mace') {
    // Morning star 0.90m: pommel +0.18, haft [+0.17..-0.61] embedded directly into spiked ball at -0.64
    bodyParts.push(prepPart(makeCyl(0.021, 0.018, 0.78, 6, 0, -0.22, 0), st.wood, false, 0));
    bodyParts.push(prepPart(makeCyl(0.024, 0.024, 0.24, 6, 0, 0.0, 0), st.grip, false, 0));
    bodyParts.push(prepPart(makeOcta(0.031, 1, 1.1, 1, 0, 0.17, 0), st.guard, true, 0));
    bodyParts.push(prepPart(makeCyl(0.036, 0.024, 0.09, 6, 0, -0.55, 0), st.guard, true, 0));

    // Morning star ball + 8 spikes overlapping inside the ball (radius 0.082, spike bases at 0.055)
    const headParts = [];
    headParts.push(prepPart(new THREE.IcosahedronGeometry(0.082, 0), st.blade, true, 1, st.edge));
    const spikeDirs = [
      [0, -1, 0], [0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0],
      [0, -0.707, 0.707], [0, -0.707, -0.707], [0.707, -0.707, 0]
    ];
    const up = new THREE.Vector3(0, 1, 0);
    for (const d of spikeDirs) {
      const v = new THREE.Vector3(d[0], d[1], d[2]).normalize();
      const sp = new THREE.ConeGeometry(0.025, 0.085, 4);
      sp.translate(0, 0.042, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(up, v);
      sp.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));
      sp.translate(v.x * 0.055, v.y * 0.055, v.z * 0.055);
      headParts.push(prepPart(sp, st.trim, true, 1, st.edge));
    }
    specialGeom = mergeGeometries(headParts, false);

    runeStrips.push(
      { sx: 0.12, sy: 0.12, sz: 0.03, x: 0, y: -0.64, z: 0 },
      { sx: 0.03, sy: 0.12, sz: 0.12, x: 0, y: -0.64, z: 0 }
    );
    anchors = {
      grip: [0, 0, 0], pommel: [0, 0.18, 0], tip: [0, -0.72, 0],
      edgeBase: [0, -0.55, 0.09], edgeTip: [0, -0.72, 0.09], hit: [0, -0.64, 0]
    };
  } else if (kind === 'club') {
    // Tapered wooden club 0.80m: pommel +0.15, thick head to -0.65 with iron studs embedded inside wood
    bodyParts.push(prepPart(makeCyl(0.056, 0.020, 0.78, 7, 0, -0.23, 0), st.wood, false, 1));
    bodyParts.push(prepPart(makeCyl(0.024, 0.022, 0.22, 6, 0, 0.0, 0), st.grip, false, 0));
    bodyParts.push(prepPart(makeOcta(0.028, 1, 0.95, 1, 0, 0.15, 0), st.guard, true, 0));
    // End cap & iron band
    bodyParts.push(prepPart(makeOcta(0.052, 1, 0.5, 1, 0, -0.62, 0), st.wood, false, 1));
    bodyParts.push(prepPart(makeCyl(0.053, 0.049, 0.045, 7, 0, -0.48, 0), st.guard, true, 0));

    // Studs embedded deep into the club radius (~0.042 from center so no gaps)
    const studOffsets = [
      [0, -0.38, 0.040], [0, -0.38, -0.040],
      [0.043, -0.48, 0], [-0.043, -0.48, 0],
      [0, -0.55, 0.046], [0, -0.55, -0.046]
    ];
    for (const so of studOffsets) {
      bodyParts.push(prepPart(makeOcta(0.022, 1, 1, 1, so[0], so[1], so[2]), st.blade, true, 1, st.edge));
    }

    runeStrips.push(
      { sx: 0.09, sy: 0.26, sz: 0.02, x: 0, y: -0.46, z: 0 },
      { sx: 0.02, sy: 0.26, sz: 0.09, x: 0, y: -0.46, z: 0 }
    );
    anchors = {
      grip: [0, 0, 0], pommel: [0, 0.15, 0], tip: [0, -0.65, 0],
      edgeBase: [0, -0.30, 0.06], edgeTip: [0, -0.63, 0.06], hit: [0, -0.48, 0]
    };
  } else if (kind === 'pickaxe') {
    // Miner's pickaxe 0.90m: pommel +0.20, shaft [+0.19..-0.67], eye block at -0.62, connected curved picks
    bodyParts.push(prepPart(makeCyl(0.022, 0.019, 0.86, 6, 0, -0.24, 0), st.wood, false, 0));
    bodyParts.push(prepPart(makeCyl(0.025, 0.025, 0.24, 6, 0, 0.0, 0), st.grip, false, 0));
    bodyParts.push(prepPart(makeOcta(0.027, 1, 0.9, 1, 0, 0.19, 0), st.guard, true, 0));
    // Heavy eye sleeve block & top cap overlapping shaft
    bodyParts.push(prepPart(makeBox(0.048, 0.085, 0.076, 0, -0.62, 0), st.guard, true, 0));
    bodyParts.push(prepPart(makeCyl(0.016, 0.025, 0.06, 6, 0, -0.68, 0), st.trim, true, 0));
    // Connected one-piece curved tapered pick spikes starting inside the eye block
    bodyParts.push(prepPart(makeCurvedPickArm(1), st.blade, true, 1, st.edge));
    bodyParts.push(prepPart(makeCurvedPickArm(-1), st.blade, true, 1, st.edge));

    runeStrips.push(
      { sx: 0.036, sy: 0.022, sz: 0.34, x: 0, y: -0.61, z: 0 },
      { sx: 0.032, sy: 0.22, sz: 0.022, x: 0, y: -0.48, z: 0 }
    );
    anchors = {
      grip: [0, 0, 0], pommel: [0, 0.20, 0], tip: [0, -0.70, 0],
      edgeBase: [0, -0.568, 0.265], edgeTip: [0, -0.62, 0.14], hit: [0, -0.59, 0.22]
    };
  }

  const bodyGeom = mergeGeometries(bodyParts, false);
  const runeGeom = buildRuneStrips(runeStrips);
  const data = { bodyGeom, runeGeom, specialGeom, anchors };
  _geomCache.set(cacheKey, data);
  return data;
}

function getShieldGeometryData(kind, grade) {
  const cacheKey = `sgeom_${kind}_${grade}`;
  if (_geomCache.has(cacheKey)) return _geomCache.get(cacheKey);

  const st = GRADE_STYLES[grade] || GRADE_STYLES['E'];
  const isHigh = grade === 'A' || grade === 'S' || grade === 'S+';
  const bodyParts = [];
  const runeStrips = [];

  // Build shield centered at [0,0,0] with face normal +Z, then shift +0.06 along face normal and orient for handL
  // Interior strap bridges from origin [0,0,0] into the back of the shield plate at z = 0.05
  bodyParts.push(prepPart(makeBox(0.11, 0.035, 0.055, 0, 0, 0.025), st.grip, false, 0));

  if (kind === 'woodenRound') {
    // Required size: diameter 0.55m (radius 0.275m), center at z = 0.06
    const disc = new THREE.CylinderGeometry(0.255, 0.265, 0.028, 12, 1);
    disc.rotateX(Math.PI * 0.5);
    disc.translate(0, 0, 0.058);
    bodyParts.push(prepPart(disc, st.wood, false, 1));

    // Overlapping 12-segment iron rim (outer diameter 0.55m)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const seg = makeBox(0.15, 0.034, 0.036, 0, 0, 0);
      seg.rotateZ(a);
      seg.translate(Math.sin(a) * 0.260, -Math.cos(a) * 0.260, 0.060);
      bodyParts.push(prepPart(seg, st.guard, true, 1, st.edge));
    }
    // Center boss deeply seated into the wooden disc
    bodyParts.push(prepPart(makeOcta(0.068, 1, 1, 0.65, 0, 0, 0.072), st.blade, true, 0, st.edge));
    if (isHigh) {
      bodyParts.push(prepPart(makeBox(0.48, 0.032, 0.018, 0, 0, 0.070), st.trim, true, 0));
      bodyParts.push(prepPart(makeBox(0.032, 0.48, 0.018, 0, 0, 0.070), st.trim, true, 0));
    }
    runeStrips.push(
      { sx: 0.36, sy: 0.020, sz: 0.014, x: 0, y: 0, z: 0.076 },
      { sx: 0.020, sy: 0.36, sz: 0.014, x: 0, y: 0, z: 0.076 }
    );
  } else if (kind === 'plank') {
    // Required size: 0.50m wide by 0.60m tall, overlapping planks with slight bend
    const plankX = [-0.18, -0.06, 0.06, 0.18];
    for (let i = 0; i < 4; i++) {
      const px = plankX[i];
      const bz = 0.062 - Math.abs(px) * 0.05;
      const p = makeBox(0.132, 0.58 + (i % 2) * 0.02, 0.028, px, 0, bz);
      p.rotateY(px * -0.18);
      bodyParts.push(prepPart(p, st.wood, false, 1));
    }
    // Iron cross-bars seated flush across the planks
    bodyParts.push(prepPart(makeBox(0.49, 0.048, 0.036, 0, 0.17, 0.060), st.guard, true, 0));
    bodyParts.push(prepPart(makeBox(0.49, 0.048, 0.036, 0, -0.17, 0.060), st.guard, true, 0));
    // Embedded spikes along the bars and edges
    const spikes = [
      [-0.24, 0.17, 0.056], [0.24, 0.17, 0.056],
      [-0.24, -0.17, 0.056], [0.24, -0.17, 0.056],
      [-0.12, 0.17, 0.075], [0.12, 0.17, 0.075],
      [-0.12, -0.17, 0.075], [0.12, -0.17, 0.075]
    ];
    for (const sp of spikes) {
      bodyParts.push(prepPart(makeOcta(0.026, 0.8, 0.8, 1.5, sp[0], sp[1], sp[2]), st.blade, true, 1, st.edge));
    }
    runeStrips.push(
      { sx: 0.42, sy: 0.020, sz: 0.014, x: 0, y: 0.17, z: 0.078 },
      { sx: 0.42, sy: 0.020, sz: 0.014, x: 0, y: -0.17, z: 0.078 }
    );
  } else if (kind === 'ironRound') {
    // Required size: diameter 0.55m (radius 0.275m), domed iron shield with rivets
    const outer = new THREE.CylinderGeometry(0.255, 0.275, 0.030, 12, 1);
    outer.rotateX(Math.PI * 0.5);
    outer.translate(0, 0, 0.056);
    bodyParts.push(prepPart(outer, st.blade, true, 1, st.edge));

    const innerDome = new THREE.CylinderGeometry(0.15, 0.255, 0.028, 12, 1);
    innerDome.rotateX(Math.PI * 0.5);
    innerDome.translate(0, 0, 0.072);
    bodyParts.push(prepPart(innerDome, st.guard, true, 0));

    bodyParts.push(prepPart(makeOcta(0.068, 1, 1, 0.65, 0, 0, 0.088), st.trim, true, 0, st.edge));

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      bodyParts.push(prepPart(
        makeOcta(0.018, 1, 1, 0.8, Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0.070),
        st.trim, true, 0
      ));
    }
    runeStrips.push(
      { sx: 0.36, sy: 0.022, sz: 0.015, x: 0, y: 0, z: 0.086 },
      { sx: 0.022, sy: 0.36, sz: 0.015, x: 0, y: 0, z: 0.086 }
    );
  } else if (kind === 'kite') {
    // Required size: 0.50m wide by 0.85m tall (Y from +0.425 down to -0.425)
    // Upper curved wings overlapping seamlessly at X=0
    const leftWing = makeBox(0.26, 0.46, 0.030, 0, 0, 0);
    leftWing.rotateY(0.16);
    leftWing.translate(-0.12, 0.19, 0.058);
    bodyParts.push(prepPart(leftWing, st.blade, true, 1, st.edge));

    const rightWing = makeBox(0.26, 0.46, 0.030, 0, 0, 0);
    rightWing.rotateY(-0.16);
    rightWing.translate(0.12, 0.19, 0.058);
    bodyParts.push(prepPart(rightWing, st.blade, true, 1, st.edge));

    // Pointed lower half overlapping upper wings from Y=+0.02 down to Y=-0.425
    const lowerCone = new THREE.ConeGeometry(0.35, 0.45, 4);
    lowerCone.rotateY(Math.PI * 0.25);
    lowerCone.rotateX(Math.PI);
    lowerCone.scale(1.0, 1.0, 0.14);
    lowerCone.translate(0, -0.20, 0.060);
    bodyParts.push(prepPart(lowerCone, st.blade, true, 1, st.edge));

    // Raised metallic Cross emblem seated into the front plate
    bodyParts.push(prepPart(makeBox(0.058, 0.72, 0.026, 0, 0.0, 0.074), st.trim, true, 0));
    bodyParts.push(prepPart(makeBox(0.38, 0.058, 0.026, 0, 0.15, 0.072), st.trim, true, 0));
    if (isHigh) {
      bodyParts.push(prepPart(makeOcta(0.038, 1, 1.2, 0.7, 0, 0.15, 0.088), st.gem, true, 0));
    }

    runeStrips.push(
      { sx: 0.026, sy: 0.64, sz: 0.014, x: 0, y: 0.0, z: 0.086 },
      { sx: 0.34, sy: 0.026, sz: 0.014, x: 0, y: 0.15, z: 0.084 }
    );
  }

  const bodyGeom = mergeGeometries(bodyParts, false);
  const runeGeom = buildRuneStrips(runeStrips);

  // Rotate shield geometries so when attached to `handL` in block/combat poses:
  // the shield face points forward (+X in handL local space -> away from forearm/chest)
  // and the vertical rim aligns upright perpendicular to the forearm (-Y).
  const shieldOrient = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(0, 0, 1),  // shield local X (width) -> socket +Z
    new THREE.Vector3(0, 1, 0),  // shield local Y (height) -> socket +Y
    new THREE.Vector3(1, 0, 0)   // shield face normal (+Z) -> socket +X (out of outer forearm)
  );
  // Handedness-preserving proper rotation: R_y(PI/2) * R_z(-PI/2) puts face normal along +X
  // and shield vertical top along +Z (which points up when forearm is horizontal in block pose)
  const blockRot = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(0, Math.PI * 0.5, -Math.PI * 0.5, 'YXZ')
  );
  bodyGeom.applyMatrix4(blockRot);
  runeGeom.applyMatrix4(blockRot);

  const anchors = {
    grip: [0, 0, 0], pommel: [0, 0, 0.28], tip: [0, 0, -0.28],
    edgeBase: [0.06, 0, 0.25], edgeTip: [0.06, 0, -0.25], hit: [0.07, 0, 0]
  };
  const data = { bodyGeom, runeGeom, specialGeom: null, anchors };
  _geomCache.set(cacheKey, data);
  return data;
}

export function buildArrowGeometry(grade = 'E') {
  const key = `arrow_${grade}`;
  if (_geomCache.has(key)) return _geomCache.get(key);
  const st = GRADE_STYLES[grade] || GRADE_STYLES['E'];
  const parts = [];

  // 1. Shaft: Cylinder length 0.72m, radius 0.005m, along +Z centered at [0, 0, 0.36]
  const shaft = new THREE.CylinderGeometry(0.005, 0.005, 0.72, 6, 1);
  shaft.rotateX(Math.PI * 0.5);
  shaft.translate(0, 0, 0.36);
  parts.push(prepPart(shaft, st.wood, false, 0));

  // 2. Broadhead: Diamond razor head (Cone radius 0.014m, length 0.06m, 4 segments) at z = 0.75
  const head = new THREE.ConeGeometry(0.014, 0.06, 4);
  head.rotateX(Math.PI * 0.5);
  head.translate(0, 0, 0.75);
  parts.push(prepPart(head, st.blade, true, 0, st.edge));

  // 3. 3 Radial Fletching Vanes (0.09m long, 0.018m wide, 0.002m thick) at z = 0.06m, spaced 120 deg apart
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const vane = makeBox(0.002, 0.018, 0.09, 0, 0.009, 0.06);
    vane.rotateZ(angle);
    parts.push(prepPart(vane, st.rune, false, 0));
  }

  // 4. Carved wooden nock groove at [0, 0, 0]
  const nock = new THREE.CylinderGeometry(0.006, 0.006, 0.02, 6, 1);
  nock.rotateX(Math.PI * 0.5);
  nock.translate(0, 0, 0.01);
  parts.push(prepPart(nock, st.wood, false, 0));

  const geom = mergeGeometries(parts, false);
  _geomCache.set(key, geom);
  return geom;
}

function createEquipmentInstance(kind, isShield, opts = {}) {
  const grade = GRADE_STYLES[opts.grade] ? opts.grade : 'E';
  const st = GRADE_STYLES[grade];
  const seed = Number.isFinite(opts.seed) ? opts.seed : 1337;

  const data = isShield
    ? getShieldGeometryData(kind, grade)
    : getWeaponGeometryData(kind, grade);

  const group = new THREE.Group();
  group.name = `${isShield ? 'shield' : 'weapon'}_${kind}_${grade}`;

  const anchors = {};
  for (const [k, pos] of Object.entries(data.anchors)) {
    const obj = new THREE.Object3D();
    obj.name = `anchor_${k}`;
    obj.position.set(pos[0], pos[1], pos[2]);
    group.add(obj);
    anchors[k] = obj;
  }

  let bodyMat = getBaseToonMaterial(grade);
  let bodyMatCloned = false;
  let outlineMat = getOutlineMaterial();
  let outlineMatCloned = false;
  const runeMat = getBaseRuneMaterial(grade).clone();

  let limbTopGroup = null;
  let limbBotGroup = null;
  let limbTopMesh = null;
  let limbBotMesh = null;
  let limbTopOutline = null;
  let limbBotOutline = null;
  let specialMesh = null;
  let stringTop = null;
  let stringBot = null;
  let arrowMesh = null;

  const ensureUniqueBodyMat = () => {
    if (!bodyMatCloned) {
      bodyMat = bodyMat.clone();
      bodyMesh.material = bodyMat;
      if (specialMesh) specialMesh.material = bodyMat;
      if (arrowMesh) arrowMesh.material = bodyMat;
      if (limbTopMesh) limbTopMesh.material = bodyMat;
      if (limbBotMesh) limbBotMesh.material = bodyMat;
      bodyMatCloned = true;
    }
  };

  let bodyGeom = data.bodyGeom;
  let bodyGeomCloned = false;
  let basePosArray = null;
  let baseColArray = null;

  let bodyMesh = null;
  let outlineMesh = null;

  if (kind === 'bow' && data.specialGeom?.riserGeom) {
    bodyMesh = new THREE.Mesh(data.specialGeom.riserGeom, bodyMat);
    group.add(bodyMesh);

    outlineMesh = new THREE.Mesh(data.specialGeom.riserGeom, outlineMat);
    outlineMesh.scale.set(1.04, 1.015, 1.04);
    group.add(outlineMesh);

    limbTopGroup = new THREE.Group();
    limbTopGroup.position.set(0, 0.10, 0.016);
    limbTopMesh = new THREE.Mesh(data.specialGeom.limbTopGeom, bodyMat);
    limbTopOutline = new THREE.Mesh(data.specialGeom.limbTopGeom, outlineMat);
    limbTopOutline.scale.set(1.04, 1.015, 1.04);
    limbTopGroup.add(limbTopMesh, limbTopOutline);

    limbBotGroup = new THREE.Group();
    limbBotGroup.position.set(0, -0.10, 0.016);
    limbBotMesh = new THREE.Mesh(data.specialGeom.limbBotGeom, bodyMat);
    limbBotOutline = new THREE.Mesh(data.specialGeom.limbBotGeom, outlineMat);
    limbBotOutline.scale.set(1.04, 1.015, 1.04);
    limbBotGroup.add(limbBotMesh, limbBotOutline);

    group.add(limbTopGroup, limbBotGroup);
  } else {
    bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    group.add(bodyMesh);

    outlineMesh = new THREE.Mesh(bodyGeom, outlineMat);
    outlineMesh.scale.set(1.04, 1.015, 1.04);
    group.add(outlineMesh);
  }

  const runeMesh = new THREE.Mesh(data.runeGeom, runeMat);
  runeMesh.visible = false;
  group.add(runeMesh);

  let orbMat = null;
  if (kind === 'staff' && data.specialGeom) {
    orbMat = new THREE.MeshToonMaterial({
      color: 0xff5511,
      emissive: 0xff3b11,
      emissiveIntensity: 1.5,
    });
    specialMesh = new THREE.Mesh(data.specialGeom, orbMat);
    specialMesh.name = 'staff_orb';
    specialMesh.position.set(0, -0.91, 0.03);
    group.add(specialMesh);
  } else if (kind === 'mace' && data.specialGeom) {
    specialMesh = new THREE.Mesh(data.specialGeom, bodyMat);
    specialMesh.position.set(0, -0.64, 0);
    group.add(specialMesh);
  } else if (kind === 'bow') {
    const strGeomKey = 'bow_str_unit';
    if (!_geomCache.has(strGeomKey)) {
      const sg = new THREE.CylinderGeometry(0.003, 0.003, 1.0, 4, 1);
      sg.translate(0, 0.5, 0);
      sg.rotateX(Math.PI * 0.5);
      _geomCache.set(strGeomKey, prepPart(sg, 0xeae6df, false, 0));
    }
    const strGeom = _geomCache.get(strGeomKey);
    let stringMat = bodyMat;
    if (grade === 'S' || grade === 'S+') {
      stringMat = new THREE.MeshToonMaterial({
        color: grade === 'S+' ? 0xfff0aa : 0x7dd3fc,
        emissive: grade === 'S+' ? 0xeab308 : 0x0284c7,
        emissiveIntensity: 1.2
      });
    }
    stringTop = new THREE.Mesh(strGeom, stringMat);
    stringBot = new THREE.Mesh(strGeom, stringMat);
    group.add(stringTop, stringBot);

    arrowMesh = new THREE.Mesh(buildArrowGeometry(grade), bodyMat);
    arrowMesh.visible = false;
    group.add(arrowMesh);
  }

  let currentEnhance = opts.enhance || 0;
  let currentWear = opts.wear || 0;
  let currentGlow = 0;
  let currentDraw = 0;
  let currentEmpowered = false;
  let currentTintHex = null;
  let currentTintAmt = 0;
  let time = (seed % 100) * 0.1;

  const updateEmissive = () => {
    const enhFactor = (currentEnhance / 5) * 0.55;
    const empFactor = currentEmpowered ? 0.65 : 0;
    const totalGlow = st.glow * 0.25 + currentGlow * 0.35 + enhFactor * 0.35 + empFactor;

    if (totalGlow > 0.02 || currentTintAmt > 0 || currentWear > 0.01) {
      ensureUniqueBodyMat();
    }

    if (bodyMatCloned) {
      const wearBright = 1.0 - currentWear * 0.42;
      const baseC = new THREE.Color().setScalar(wearBright);
      if (currentTintHex !== null && currentTintAmt > 0) {
        baseC.lerp(new THREE.Color(currentTintHex), currentTintAmt);
      }
      bodyMat.color.copy(baseC);

      const emCol = new THREE.Color(st.rune);
      if (grade === 'S+') {
        emCol.setHSL((time * 0.18) % 1.0, 0.85, 0.65);
      }
      if (currentTintHex !== null && currentTintAmt > 0) {
        emCol.lerp(new THREE.Color(currentTintHex), currentTintAmt);
      }
      bodyMat.emissive.copy(emCol);
      bodyMat.emissiveIntensity = totalGlow * (0.85 + 0.15 * Math.sin(time * 4.0));
    }

    if (currentEnhance > 0 || st.glow >= 0.8 || currentWear > 0.8) {
      runeMesh.visible = true;
      if (currentWear > 0.8 && currentEnhance === 0 && st.glow < 0.8) {
        runeMat.color.setHex(0x1a110d);
        runeMat.opacity = Math.min(1, (currentWear - 0.75) * 3.5);
      } else {
        if (grade === 'S+') {
          runeMat.color.setHSL(((time * 0.22) + 0.15) % 1.0, 0.9, 0.65);
        } else {
          runeMat.color.setHex(st.rune);
        }
        const pulse = 0.72 + 0.28 * Math.sin(time * 5.0);
        const lvl = Math.max(currentEnhance / 5, st.glow * 0.7);
        runeMat.opacity = Math.min(1, (0.25 + lvl * 0.75) * pulse);
      }
    } else {
      runeMesh.visible = false;
    }
  };

  const updateBowString = (d = 0, arrowVisible = undefined, vibTime = -1) => {
    if (kind !== 'bow') return;
    currentDraw = Math.max(0, Math.min(1, d));

    // 1. Flex limbs
    if (limbTopGroup && limbBotGroup) {
      limbTopGroup.rotation.x = -0.16 * currentDraw;
      limbBotGroup.rotation.x = 0.16 * currentDraw;
    }

    // 2. Dynamic tip endpoints
    const tipTop = new THREE.Vector3(0, 0.595 - 0.045 * currentDraw, -0.128 - 0.110 * currentDraw);
    const tipBot = new THREE.Vector3(0, -0.595 + 0.045 * currentDraw, -0.128 - 0.110 * currentDraw);

    // 3. Nock position Z
    let nockZ;
    if (vibTime >= 0 && vibTime <= 0.30) {
      nockZ = -0.13 + 0.065 * Math.exp(-12 * vibTime) * Math.cos(45 * vibTime);
    } else {
      nockZ = -0.13 - currentDraw * 0.38;
    }
    const nockPos = new THREE.Vector3(0, 0, nockZ);

    // 4. Update string orientations in local group space
    const _vStrDir = new THREE.Vector3();
    const _vUnitZ = new THREE.Vector3(0, 0, 1);

    _vStrDir.subVectors(nockPos, tipTop);
    const lenTop = _vStrDir.length();
    _vStrDir.normalize();
    stringTop.position.copy(tipTop);
    stringTop.quaternion.setFromUnitVectors(_vUnitZ, _vStrDir);
    stringTop.scale.set(1, 1, Math.max(0.001, lenTop));

    _vStrDir.subVectors(nockPos, tipBot);
    const lenBot = _vStrDir.length();
    _vStrDir.normalize();
    stringBot.position.copy(tipBot);
    stringBot.quaternion.setFromUnitVectors(_vUnitZ, _vStrDir);
    stringBot.scale.set(1, 1, Math.max(0.001, lenBot));

    // 5. Arrow visibility and position
    const isArrowVis = arrowVisible !== undefined ? Boolean(arrowVisible) : (currentDraw > 0.01);
    arrowMesh.visible = isArrowVis;
    if (isArrowVis) {
      arrowMesh.position.set(0.015, 0.02, nockZ);
      arrowMesh.rotation.set(0, 0, 0);
    }
  };

  if (kind === 'bow') updateBowString(0);

  const api = {
    group,
    anchors,
    setOpacity(a) {
      const alpha = Math.max(0, Math.min(1, a));
      ensureUniqueBodyMat();
      if (!outlineMatCloned) {
        outlineMat = outlineMat.clone();
        outlineMesh.material = outlineMat;
        outlineMatCloned = true;
      }
      const isTrans = alpha < 0.999;
      bodyMat.transparent = isTrans;
      bodyMat.opacity = alpha;
      outlineMat.transparent = isTrans;
      outlineMat.opacity = alpha;
      outlineMesh.visible = alpha > 0.02;
      runeMat.opacity = Math.min(runeMat.opacity, alpha);
    },
    setTint(hex, amount = 0) {
      currentTintHex = hex;
      currentTintAmt = hex === null ? 0 : Math.max(0, Math.min(1, amount));
      updateEmissive();
    },
    setWear(w) {
      const effW = Math.max(0, Math.min(1, w));
      currentWear = effW;
      if (effW > 0.01 && !bodyGeomCloned) {
        bodyGeom = data.bodyGeom.clone();
        basePosArray = new Float32Array(bodyGeom.attributes.position.array);
        baseColArray = new Float32Array(bodyGeom.attributes.color.array);
        bodyMesh.geometry = bodyGeom;
        outlineMesh.geometry = bodyGeom;
        bodyGeomCloned = true;
      }
      if (bodyGeomCloned) {
        const pos = bodyGeom.attributes.position;
        const col = bodyGeom.attributes.color;
        const tags = bodyGeom.attributes.aWearTag;
        const rustR = 0.58, rustG = 0.28, rustB = 0.14;

        for (let i = 0; i < pos.count; i++) {
          const bx = basePosArray[i * 3];
          const by = basePosArray[i * 3 + 1];
          const bz = basePosArray[i * 3 + 2];
          const tag = tags.getX(i);

          const h = Math.sin(bx * 91.7 + by * 47.3 + bz * 61.1 + seed);
          if (tag > 0.5 && h > 0.35) {
            const chip = effW * 0.015 * (h - 0.35);
            pos.setXYZ(
              i,
              bx + (h * 0.3) * chip,
              by + Math.cos(by * 33.1) * chip * 0.4,
              bz - Math.sign(bz || 1) * chip
            );
          } else {
            pos.setXYZ(i, bx, by, bz);
          }

          const patch = Math.max(0, Math.sin(by * 19.3 + bz * 23.7 + seed)) * effW * 0.72;
          const cr = baseColArray[i * 3];
          const cg = baseColArray[i * 3 + 1];
          const cb = baseColArray[i * 3 + 2];
          col.setXYZ(
            i,
            cr * (1 - patch) + rustR * patch,
            cg * (1 - patch) + rustG * patch,
            cb * (1 - patch) + rustB * patch
          );
        }
        pos.needsUpdate = true;
        col.needsUpdate = true;
      }
      updateEmissive();
    },
    setEnhance(n) {
      currentEnhance = Math.max(0, Math.min(5, n || 0));
      updateEmissive();
    },
    setDraw(drawAmount = 0, arrowVisible = undefined, vibTime = -1) {
      updateBowString(drawAmount, arrowVisible, vibTime);
    },
    getArrowWorldTransform(targetPos = new THREE.Vector3(), targetQuat = new THREE.Quaternion()) {
      if (arrowMesh) {
        arrowMesh.getWorldPosition(targetPos);
        arrowMesh.getWorldQuaternion(targetQuat);
      } else {
        group.getWorldPosition(targetPos);
        group.getWorldQuaternion(targetQuat);
      }
      return { position: targetPos, quaternion: targetQuat };
    },
    setEmpowered(flag) {
      currentEmpowered = Boolean(flag);
      if (specialMesh) {
        const s = currentEmpowered ? 1.18 : 1.0;
        specialMesh.scale.setScalar(s);
      }
      updateEmissive();
    },
    setOrbGlow(colorHex = 0xff5511, intensity = 1.0) {
      if (orbMat) {
        orbMat.color.setHex(colorHex);
        orbMat.emissive.setHex(colorHex);
        orbMat.emissiveIntensity = Math.max(0.1, intensity * 1.5);
      }
    },
    update(dt = 0.016) {
      time += dt;
      if (kind === 'staff' && specialMesh) {
        const bob = Math.sin(time * (currentEmpowered ? 6.0 : 2.5)) * 0.015;
        specialMesh.position.y = -0.91 + bob;
        specialMesh.position.z = 0.03;
        specialMesh.rotation.y = time * (currentEmpowered ? 3.2 : 1.0);
      } else if (kind === 'mace' && specialMesh && currentEmpowered) {
        const s = 1.12 + 0.08 * Math.sin(time * 8.0);
        specialMesh.scale.setScalar(s);
      }
      if (grade === 'S+' || grade === 'S' || currentEnhance > 0 || currentGlow > 0 || currentEmpowered) {
        updateEmissive();
      }
    },
    getBounds() {
      return new THREE.Box3().setFromObject(group);
    },
    dispose() {
      if (bodyGeomCloned) bodyGeom.dispose();
      if (bodyMatCloned) bodyMat.dispose();
      if (outlineMatCloned) outlineMat.dispose();
      if (orbMat) orbMat.dispose();
      runeMat.dispose();
    }
  };

  if (currentEnhance > 0) api.setEnhance(currentEnhance);
  if (grade === 'E' && currentWear < 0.25) {
    api.setWear(Math.max(currentWear, 0.28));
  } else if (currentWear > 0) {
    api.setWear(currentWear);
  }
  updateEmissive();

  return api;
}

export function createWeaponModel(kind = 'sword', opts = {}) {
  const validKind = WEAPON_KINDS.includes(kind) ? kind : 'sword';
  return createEquipmentInstance(validKind, false, opts);
}

export function createShieldModel(kind = 'woodenRound', opts = {}) {
  const validKind = SHIELD_KINDS.includes(kind) ? kind : 'woodenRound';
  return createEquipmentInstance(validKind, true, opts);
}

export function createPickupModel(kind = 'sword', opts = {}) {
  const grade = GRADE_STYLES[opts.grade] ? opts.grade : 'E';
  const uiColor = GRADE_UI_COLORS[grade] || 0x9a9a9a;
  const isShield = SHIELD_KINDS.includes(kind);
  const itemModel = isShield
    ? createShieldModel(kind, opts)
    : createWeaponModel(kind, opts);

  const group = new THREE.Group();
  group.name = `pickup_${kind}_${grade}`;

  const holder = new THREE.Group();
  if (isShield) {
    itemModel.group.rotation.z = Math.PI * 0.5;
    itemModel.group.position.set(0, 0.02, 0);
  } else {
    itemModel.group.rotation.z = Math.PI * 0.5;
    itemModel.group.rotation.y = 0.25;
    itemModel.group.position.set(-0.18, 0.055, 0);
  }
  holder.add(itemModel.group);
  group.add(holder);

  const ringKey = 'pickup_ring_geom';
  if (!_geomCache.has(ringKey)) {
    const rg = new THREE.RingGeometry(0.26, 0.34, 24);
    rg.rotateX(-Math.PI * 0.5);
    _geomCache.set(ringKey, rg);
  }
  const ringMat = new THREE.MeshBasicMaterial({
    color: uiColor,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(_geomCache.get(ringKey), ringMat);
  ring.position.y = 0.008;
  group.add(ring);

  let highlighted = false;
  let t = 0;

  return {
    group,
    ring,
    setHighlight(flag) {
      highlighted = Boolean(flag);
      ring.scale.setScalar(highlighted ? 1.22 : 1.0);
      ringMat.opacity = highlighted ? 1.0 : 0.75;
      itemModel.setGlow(highlighted ? 1.0 : 0.0);
    },
    update(dt = 0.016) {
      t += dt;
      ring.rotation.y = t * 1.1;
      holder.position.y = Math.sin(t * 2.6) * 0.025;
      ringMat.opacity = (highlighted ? 0.88 : 0.60) + 0.12 * Math.sin(t * 4.0);
      itemModel.update(dt);
    },
    dispose() {
      itemModel.dispose();
      ringMat.dispose();
    }
  };
}
