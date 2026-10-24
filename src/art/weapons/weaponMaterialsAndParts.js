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

export const GRADE_STYLES = {
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

export const _geomCache = new Map();
export const _matCache = new Map();
export const _texCache = new Map();

export function getToonGradient() {
  if (_texCache.has('toonGrad')) return _texCache.get('toonGrad');
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

export function getGradeTexture(grade) {
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

export function getOutlineMaterial() {
  if (_matCache.has('outline')) return _matCache.get('outline');
  const mat = new THREE.MeshBasicMaterial({
    color: 0x14101c,
    side: THREE.BackSide
  });
  _matCache.set('outline', mat);
  return mat;
}

export function getBaseToonMaterial(grade) {
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

export function getBaseRuneMaterial(grade) {
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

export function prepPart(geom, hexColor, isMetal = true, wearTag = 0, edgeHex = null) {
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

export function makeDiamondBlade(length, widthBase, widthTip, thickBase, thickTip) {
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
      [0, y0, p0.w * 0.5],
      [p0.th * 0.5, y0, 0],
      [0, y0, -p0.w * 0.5],
      [-p0.th * 0.5, y0, 0]
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

export function makeCurvedPickArm(dirZ) {
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

export function makeBox(sx, sy, sz, tx = 0, ty = 0, tz = 0) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.translate(tx, ty, tz);
  return g;
}

export function makeCyl(rt, rb, h, segs, tx = 0, ty = 0, tz = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, segs, 1);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(tx, ty, tz);
  return g;
}

export function makeOcta(r, sx = 1, sy = 1, sz = 1, tx = 0, ty = 0, tz = 0) {
  const g = new THREE.OctahedronGeometry(r, 0);
  g.scale(sx, sy, sz);
  g.translate(tx, ty, tz);
  return g;
}

export function buildRuneStrips(strips) {
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