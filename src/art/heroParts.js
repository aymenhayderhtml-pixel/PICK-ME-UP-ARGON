import * as THREE from 'three';

const GEO_CACHE = new Map();
const MAT_CACHE = new Map();
const TEX_CACHE = new Map();
let GRADIENT_TEX = null;

export const OUTLINE_COLOR = 0x14101c;

export const SKIN_PALETTE = [0xf3d8c4, 0xe8c3a5, 0xd8a987, 0xbc8762, 0x8c5b3e, 0xf7e2d2];
export const HAIR_PALETTE = [0x141418, 0x2a211d, 0x453022, 0x6b3e26, 0xa85232, 0xc29b58, 0x6e7278];
export const TOP_PALETTE = [0xe8e4dc, 0xdcd3c2, 0xc4b59d, 0x9ca19e, 0x73828c, 0x768572, 0x7d6856];
export const VEST_PALETTE = [0x363338, 0x47392f, 0x2c353d, 0x4d473e, 0x3b2f2a];
export const BOTTOM_PALETTE = [0x1c1b20, 0x36322e, 0x45372b, 0x262e38, 0x33363b];
export const BOOTS_PALETTE = [0x181619, 0x2b221e, 0x3d2b20, 0x4a3525];
export const ACCENT_PALETTE = [0x4a3728, 0x362b22, 0x574332, 0x2e2b29];

export const BUILD_SCALES = {
  slim:     { sx: 0.85, sz: 0.84, shoulder: 0.86, arm: 0.85, leg: 0.88 },
  average:  { sx: 1.00, sz: 1.00, shoulder: 1.00, arm: 1.00, leg: 1.00 },
  stocky:   { sx: 1.18, sz: 1.16, shoulder: 1.10, arm: 1.12, leg: 1.12 },
  muscular: { sx: 1.12, sz: 1.08, shoulder: 1.20, arm: 1.24, leg: 1.10 }
};

export function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function pickMutedColor(rng, palette, maxS = 0.38, minL = 0.06, maxL = 0.92) {
  const c = new THREE.Color(pick(rng, palette));
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  const hJitter = (rng() - 0.5) * 0.03;
  const lJitter = (rng() - 0.5) * 0.05;
  c.setHSL(
    (hsl.h + hJitter + 1) % 1,
    Math.min(hsl.s, maxS),
    Math.max(minL, Math.min(maxL, hsl.l + lJitter))
  );
  return c.getHex();
}

export function getGradientTexture() {
  if (GRADIENT_TEX) return GRADIENT_TEX;
  const data = new Uint8Array([96, 150, 212, 255]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  GRADIENT_TEX = tex;
  return tex;
}

export function getToonMaterial(colorHex, extra = {}) {
  const key = `${colorHex}_${extra.mapId || ''}_${extra.outline ? 1 : 0}`;
  if (MAT_CACHE.has(key)) return MAT_CACHE.get(key);
  let mat;
  if (extra.outline) {
    mat = new THREE.MeshBasicMaterial({ color: OUTLINE_COLOR, side: THREE.BackSide });
  } else {
    mat = new THREE.MeshToonMaterial({
      color: colorHex,
      gradientMap: getGradientTexture(),
      map: extra.map || null
    });
  }
  MAT_CACHE.set(key, mat);
  return mat;
}

export function mergeGeometries(geos) {
  let totalVerts = 0;
  let totalIndices = 0;
  const valid = geos.filter(Boolean);
  for (const g of valid) {
    if (!g.attributes.uv) {
      const c = g.attributes.position.count;
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(c * 2), 2));
    }
    totalVerts += g.attributes.position.count;
    totalIndices += g.index ? g.index.count : g.attributes.position.count;
  }

  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const uv = new Float32Array(totalVerts * 2);
  const indices = new Uint16Array(totalIndices);

  let vOffset = 0;
  let iOffset = 0;

  for (const g of valid) {
    const pArr = g.attributes.position.array;
    const nArr = g.attributes.normal.array;
    const uArr = g.attributes.uv.array;
    const vCount = g.attributes.position.count;

    pos.set(pArr, vOffset * 3);
    norm.set(nArr, vOffset * 3);
    uv.set(uArr, vOffset * 2);

    if (g.index) {
      const idxArr = g.index.array;
      for (let i = 0; i < idxArr.length; i++) {
        indices[iOffset + i] = idxArr[i] + vOffset;
      }
      iOffset += idxArr.length;
    } else {
      for (let i = 0; i < vCount; i++) {
        indices[iOffset + i] = vOffset + i;
      }
      iOffset += vCount;
    }
    vOffset += vCount;
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(indices, 1));
  return out;
}

export function xform(geo, { pos, rot, scale } = {}) {
  const g = geo.clone();
  const m = new THREE.Matrix4();
  const p = pos ? new THREE.Vector3(...pos) : new THREE.Vector3();
  const e = rot ? new THREE.Euler(...rot) : new THREE.Euler();
  const q = new THREE.Quaternion().setFromEuler(e);
  const s = scale ? new THREE.Vector3(...scale) : new THREE.Vector3(1, 1, 1);
  m.compose(p, q, s);
  g.applyMatrix4(m);
  return g;
}

export function createInflatedOutlineGeo(geo, thickness = 0.007) {
  const g = geo.clone();
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
  return g;
}

export function getCachedGeo(key, builder) {
  if (GEO_CACHE.has(key)) return GEO_CACHE.get(key);
  const geo = builder();
  if (geo) GEO_CACHE.set(key, geo);
  return geo;
}

export function makeTaperedLimb(len, rTop, rMid, rBot, segs = 8, yOffsetTop = true, roundShoulder = false) {
  const pts = [
    new THREE.Vector2(0.0001, 0),
    new THREE.Vector2(rBot * 0.85, len * 0.05),
    new THREE.Vector2(rBot, len * 0.18),
    new THREE.Vector2(rMid, len * 0.56),
    new THREE.Vector2(rTop, len * 0.86)
  ];
  if (roundShoulder) {
    pts.push(
      new THREE.Vector2(rTop * 0.96, len * 0.96),
      new THREE.Vector2(rTop * 0.65, len * 1.05),
      new THREE.Vector2(0.0001, len * 1.09)
    );
  } else {
    pts.push(
      new THREE.Vector2(rTop * 0.82, len * 0.96),
      new THREE.Vector2(0.0001, len)
    );
  }
  const g = new THREE.LatheGeometry(pts, segs);
  if (yOffsetTop) g.translate(0, -len, 0);
  g.computeVertexNormals();
  return g;
}

export function makeHeadGeo() {
  return getCachedGeo('head_sculpt_v3', () => {
    const g = new THREE.SphereGeometry(0.10, 12, 10).toNonIndexed();
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      v.y *= 1.15;
      v.x *= 0.88;
      v.z *= 0.95;
      if (v.y < 0) {
        const t = Math.min(1, -v.y / 0.115);
        v.x *= 1 - t * 0.44;
        v.z *= 1 - t * 0.24;
        if (v.z > 0) v.z += (1 - t) * 0.012;
      }
      if (v.z > 0.035 && v.y > -0.075 && v.y < 0.055) {
        v.z = 0.035 + (v.z - 0.035) * 0.72;
      }
      pos.setXYZ(i, v.x, v.y + 0.105, v.z);
    }

    const nose = xform(new THREE.ConeGeometry(0.011, 0.034, 4).toNonIndexed(), {
      pos: [0, 0.092, 0.092],
      rot: [Math.PI * 0.18, Math.PI * 0.25, 0],
      scale: [0.68, 1, 1.05]
    });
    const earBase = new THREE.SphereGeometry(0.020, 5, 4).toNonIndexed();
    const earL = xform(earBase, { pos: [0.086, 0.10, -0.005], scale: [0.45, 1.1, 0.75] });
    const earR = xform(earBase, { pos: [-0.086, 0.10, -0.005], scale: [0.45, 1.1, 0.75] });

    const merged = mergeGeometries([g, nose, earL, earR]);
    const mPos = merged.attributes.position;
    const mUv = merged.attributes.uv;

    for (let i = 0; i < mPos.count; i += 3) {
      const z0 = mPos.getZ(i), z1 = mPos.getZ(i + 1), z2 = mPos.getZ(i + 2);
      const x0 = mPos.getX(i), x1 = mPos.getX(i + 1), x2 = mPos.getX(i + 2);
      const y0 = mPos.getY(i), y1 = mPos.getY(i + 1), y2 = mPos.getY(i + 2);
      const cz = (z0 + z1 + z2) / 3;
      const cx = Math.abs(x0 + x1 + x2) / 3;
      const cy = (y0 + y1 + y2) / 3;

      if (cz > 0.045 && cx < 0.075 && cy > 0.018 && cy < 0.178) {
        for (let k = 0; k < 3; k++) {
          const px = mPos.getX(i + k);
          const py = mPos.getY(i + k);
          const u = 0.5 + (px / 0.070) * 0.42;
          const vTex = 0.08 + ((py - 0.020) / 0.145) * 0.84;
          mUv.setXY(i + k, u, vTex);
        }
      } else {
        for (let k = 0; k < 3; k++) {
          mUv.setXY(i + k, 0.02, 0.02);
        }
      }
    }
    merged.computeVertexNormals();
    return merged;
  });
}

export function getFaceTexture(skinTone, faceStyle, expression, facialHair, hairColor) {
  const key = `face_v3_${skinTone}_${faceStyle}_${expression}_${facialHair}_${hairColor}`;
  if (TEX_CACHE.has(key)) return TEX_CACHE.get(key);

  if (typeof document === 'undefined') {
    const fallbackTex = new THREE.Texture();
    TEX_CACHE.set(key, fallbackTex);
    return fallbackTex;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const baseCol = new THREE.Color(skinTone);
  ctx.fillStyle = `#${baseCol.getHexString()}`;
  ctx.fillRect(0, 0, 256, 256);

  const shadowCol = baseCol.clone().multiplyScalar(0.82);
  const hCol = `#${new THREE.Color(hairColor).getHexString()}`;

  ctx.fillStyle = `#${shadowCol.getHexString()}`;
  ctx.beginPath();
  ctx.moveTo(126, 124);
  ctx.lineTo(119, 158);
  ctx.lineTo(131, 160);
  ctx.closePath();
  ctx.fill();

  if (faceStyle === 'young') {
    ctx.fillStyle = 'rgba(135, 78, 50, 0.48)';
    for (const [fx, fy] of [[70, 156], [82, 160], [92, 154], [164, 154], [174, 160], [186, 156]]) {
      ctx.beginPath();
      ctx.arc(fx, fy, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (faceStyle === 'old') {
    ctx.strokeStyle = `#${shadowCol.getHexString()}`;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(72, 164); ctx.quadraticCurveTo(92, 178, 98, 196);
    ctx.moveTo(184, 164); ctx.quadraticCurveTo(164, 178, 158, 196);
    ctx.stroke();
  }

  if (facialHair === 'stubble') {
    ctx.fillStyle = 'rgba(35, 30, 32, 0.25)';
    ctx.beginPath();
    ctx.arc(128, 198, 50, 0, Math.PI);
    ctx.fill();
  } else if (facialHair === 'mustache' || facialHair === 'beard') {
    ctx.fillStyle = hCol;
    ctx.beginPath();
    ctx.moveTo(92, 180);
    ctx.quadraticCurveTo(128, 168, 164, 180);
    ctx.quadraticCurveTo(128, 190, 92, 180);
    ctx.fill();
  }

  const drawEye = (cx, side) => {
    ctx.save();
    ctx.translate(cx, 126);
    if (expression === 'dead') {
      ctx.strokeStyle = '#141018';
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(-20, -12); ctx.lineTo(20, 12);
      ctx.moveTo(20, -12); ctx.lineTo(-20, 12);
      ctx.stroke();
    } else if (expression === 'pain') {
      ctx.strokeStyle = '#141018';
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(-22, -9 * side);
      ctx.lineTo(18, 2);
      ctx.lineTo(-22, 12);
      ctx.stroke();
    } else {
      const eyeW = 27;
      const eyeH = expression === 'afraid' ? 19.5 : (faceStyle === 'fierce' || faceStyle === 'stern' ? 14.0 : 16.8);

      ctx.fillStyle = '#fdfbf8';
      ctx.beginPath();
      ctx.moveTo(-eyeW, 2);
      ctx.quadraticCurveTo(0, -eyeH * 1.15, eyeW, 0);
      ctx.quadraticCurveTo(0, eyeH * 1.05, -eyeW, 2);
      ctx.closePath();
      ctx.fill();

      const irisR = expression === 'afraid' ? 9.5 : 14.5;
      ctx.fillStyle = '#120f18';
      ctx.beginPath();
      ctx.arc(0, -0.5, irisR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-5.5 * side, -5.0, expression === 'afraid' ? 3.5 : 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(4.5 * side, 4.5, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `#${shadowCol.getHexString()}`;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-eyeW * 0.75, eyeH * 0.45);
      ctx.quadraticCurveTo(0, eyeH * 0.85, eyeW * 0.75, eyeH * 0.38);
      ctx.stroke();

      ctx.strokeStyle = '#0e0b12';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(-eyeW - 2, 3);
      ctx.quadraticCurveTo(0, -eyeH * 1.18, eyeW + 2, 0);
      ctx.stroke();
    }
    ctx.restore();
  };

  drawEye(76, -1);
  drawEye(180, 1);

  const drawBrow = (cx, side) => {
    ctx.save();
    ctx.translate(cx, 94);
    let angle = 0;
    let yOff = 0;
    if (expression === 'angry' || faceStyle === 'fierce') {
      angle = -side * 0.24;
      yOff = 2;
    } else if (faceStyle === 'stern') {
      angle = -side * 0.15;
      yOff = 1;
    } else if (expression === 'afraid' || expression === 'pain') {
      angle = side * 0.20;
      yOff = -4;
    }
    ctx.rotate(angle);
    ctx.fillStyle = hCol;
    ctx.beginPath();
    ctx.moveTo(-28, yOff - 2);
    ctx.lineTo(28, yOff - 3.5);
    ctx.lineTo(26, yOff + 3.5);
    ctx.lineTo(-26, yOff + 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  drawBrow(76, -1);
  drawBrow(180, 1);

  ctx.strokeStyle = '#261715';
  ctx.fillStyle = '#38191b';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  if (expression === 'happy') {
    ctx.arc(128, 186, 16, 0.12 * Math.PI, 0.88 * Math.PI);
    ctx.stroke();
  } else if (expression === 'angry') {
    ctx.moveTo(108, 196);
    ctx.quadraticCurveTo(128, 184, 148, 196);
    ctx.stroke();
  } else if (expression === 'afraid' || expression === 'pain') {
    ctx.ellipse(128, 192, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.moveTo(110, 192);
    ctx.lineTo(146, 192);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  TEX_CACHE.set(key, tex);
  return tex;
}

function makeHairLockGeo(len = 0.068, rBase = 0.017) {
  const g = new THREE.ConeGeometry(rBase, len, 5);
  g.rotateX(Math.PI);
  g.translate(0, -len * 0.45, 0);
  g.scale(1.0, 1.0, 0.55);
  return g;
}

export function buildHairAndBeardGeo(style, hasBeard) {
  return getCachedGeo(`hair_v3_${style}_${hasBeard ? 1 : 0}`, () => {
    const pieces = [];
    if (style !== 'bald') {
      pieces.push(xform(new THREE.SphereGeometry(0.101, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.50), {
        pos: [0, 0.132, -0.015],
        rot: [-0.46, 0, 0],
        scale: [0.93, 1.06, 0.98]
      }));

      const addForeheadFringe = (lockCount, baseLen) => {
        const lockGeo = makeHairLockGeo(baseLen, 0.017);
        const span = 0.112;
        for (let i = 0; i < lockCount; i++) {
          const u = lockCount === 1 ? 0 : (i / (lockCount - 1)) - 0.5;
          const x = u * span;
          const z = 0.078 - u * u * 0.055;
          const y = 0.194 - Math.abs(u) * 0.008;
          const lenScale = 0.72 + Math.abs(u) * 0.52 + ((i % 2) * 0.08);
          const swayZ = -u * 0.42 + ((i % 2 === 0 ? 1 : -1) * 0.07);
          const pitchX = -0.18 + Math.abs(u) * 0.12;
          pieces.push(xform(lockGeo, {
            pos: [x, y, z],
            rot: [pitchX, u * 0.35, swayZ],
            scale: [1, lenScale, 1]
          }));
        }
      };

      if (style === 'spiky' || style === 'messy') {
        addForeheadFringe(7, 0.062);
        const crownSpikes = style === 'spiky' ? 7 : 5;
        const spikeGeo = makeHairLockGeo(0.082, 0.025);
        for (let i = 0; i < crownSpikes; i++) {
          const ang = ((i / crownSpikes) * Math.PI * 1.4) + Math.PI * 0.3;
          const tilt = style === 'spiky' ? 0.55 : 0.38;
          pieces.push(xform(spikeGeo, {
            pos: [Math.sin(ang) * 0.070, 0.185 + (i % 2) * 0.012, Math.cos(ang) * 0.072 - 0.012],
            rot: [Math.PI + Math.cos(ang) * tilt, 0, -Math.sin(ang) * tilt]
          }));
        }
      } else if (style === 'short') {
        addForeheadFringe(5, 0.052);
      } else if (style === 'bowl') {
        addForeheadFringe(6, 0.056);
        pieces.push(xform(new THREE.SphereGeometry(0.103, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.38), {
          pos: [0, 0.136, -0.006],
          rot: [-0.22, 0, 0],
          scale: [0.94, 1.05, 0.97]
        }));
      } else if (style === 'long') {
        addForeheadFringe(6, 0.064);
        pieces.push(xform(new THREE.CylinderGeometry(0.082, 0.098, 0.21, 8), {
          pos: [0, 0.035, -0.058],
          rot: [0.14, 0, 0],
          scale: [0.92, 1, 0.52]
        }));
      } else if (style === 'ponytail') {
        addForeheadFringe(5, 0.055);
        pieces.push(xform(new THREE.ConeGeometry(0.038, 0.17, 6), {
          pos: [0, 0.085, -0.12],
          rot: [-2.4, 0, 0]
        }));
      } else if (style === 'braid') {
        addForeheadFringe(5, 0.060);
        for (let b = 0; b < 4; b++) {
          pieces.push(xform(new THREE.SphereGeometry(0.025 - b * 0.002, 6, 5), {
            pos: [0.058 + b * 0.008, 0.085 - b * 0.042, -0.045 + b * 0.032],
            scale: [0.85, 1.25, 0.85]
          }));
        }
      }
    }

    if (hasBeard) {
      pieces.push(xform(new THREE.ConeGeometry(0.064, 0.09, 6), {
        pos: [0, 0.012, 0.052],
        rot: [Math.PI * 0.92, 0, 0],
        scale: [1.02, 1, 0.82]
      }));
    }

    if (pieces.length === 0) return null;
    const merged = mergeGeometries(pieces);
    merged.computeVertexNormals();
    return merged;
  });
}

export function getPelvisGeo() {
  return getCachedGeo('pelvis_v2', () => {
    const g = xform(new THREE.CylinderGeometry(0.106, 0.102, 0.13, 9), {
      pos: [0, 0.01, 0],
      scale: [1.04, 1, 0.72]
    });
    g.computeVertexNormals();
    return g;
  });
}

export function getTorsoGeo(topType) {
  return getCachedGeo(`torso_v2_${topType}`, () => {
    const geos = [];
    geos.push(xform(new THREE.CylinderGeometry(0.118, 0.104, 0.21, 9), {
      pos: [0, 0.10, 0],
      scale: [1.04, 1, 0.72]
    }));
    if (topType === 'tunic' || topType === 'robe') {
      const skirtLen = topType === 'robe' ? 0.35 : 0.15;
      geos.push(xform(new THREE.CylinderGeometry(0.108, 0.145, skirtLen, 9), {
        pos: [0, -skirtLen * 0.45, 0],
        scale: [1.05, 1, 0.75]
      }));
    }
    const m = mergeGeometries(geos);
    m.computeVertexNormals();
    return m;
  });
}

export function getChestGeo(topType) {
  return getCachedGeo(`chest_v2_${topType}`, () => {
    const geos = [];
    const pts = [
      new THREE.Vector2(0.001, 0),
      new THREE.Vector2(0.116, 0.02),
      new THREE.Vector2(0.136, 0.14),
      new THREE.Vector2(0.142, 0.21),
      new THREE.Vector2(0.105, 0.25),
      new THREE.Vector2(0.001, 0.255)
    ];
    const chestLathe = new THREE.LatheGeometry(pts, 10);
    geos.push(xform(chestLathe, { scale: [1.08, 1, 0.74] }));

    if (topType === 'shirt' || topType === 'shirtRolled' || topType === 'vest') {
      geos.push(xform(new THREE.BoxGeometry(0.048, 0.040, 0.016), {
        pos: [0.038, 0.23, 0.070],
        rot: [0.25, 0.3, -0.4]
      }));
      geos.push(xform(new THREE.BoxGeometry(0.048, 0.040, 0.016), {
        pos: [-0.038, 0.23, 0.070],
        rot: [0.25, -0.3, 0.4]
      }));
    }
    const m = mergeGeometries(geos);
    m.computeVertexNormals();
    return m;
  });
}

export function getChestDetailGeo(topType) {
  return getCachedGeo(`chest_detail_v2_${topType}`, () => {
    const geos = [];
    geos.push(xform(new THREE.CylinderGeometry(0.112, 0.112, 0.038, 9), {
      pos: [0, -0.165, 0],
      scale: [1.06, 1, 0.75]
    }));
    for (let i = 0; i < 3; i++) {
      geos.push(xform(new THREE.BoxGeometry(0.012, 0.012, 0.010), {
        pos: [0, 0.05 + i * 0.055, 0.096]
      }));
    }
    if (topType === 'vest') {
      geos.push(xform(new THREE.CylinderGeometry(0.144, 0.120, 0.23, 9), {
        pos: [0, 0.115, -0.003],
        scale: [1.09, 1, 0.75]
      }));
    }
    const m = mergeGeometries(geos);
    m.computeVertexNormals();
    return m;
  });
}

export function getNeckGeo() {
  return getCachedGeo('neck_v2', () => makeTaperedLimb(0.085, 0.038, 0.041, 0.046, 7, false));
}

export function getUpperArmGeo(topType) {
  return getCachedGeo(`uarm_v2_${topType}`, () => {
    const sleeve = makeTaperedLimb(0.24, 0.047, 0.041, 0.036, 8, true, true);
    if (topType === 'shirtRolled' || topType === 'tunic') {
      const cuff = xform(new THREE.CylinderGeometry(0.042, 0.041, 0.032, 8), { pos: [0, -0.21, 0] });
      return mergeGeometries([sleeve, cuff]);
    }
    return sleeve;
  });
}

export function getForearmGeo() {
  return getCachedGeo('forearm_v2', () => {
    const fa = makeTaperedLimb(0.21, 0.036, 0.031, 0.023, 8, true);
    fa.computeVertexNormals();
    return fa;
  });
}

export function getHandMeshGeo() {
  return getCachedGeo('hand_palm_v2', () => {
    const palm = xform(new THREE.SphereGeometry(0.023, 6, 5), {
      pos: [0, -0.022, 0],
      scale: [0.62, 1.18, 0.82]
    });
    const thumb = xform(new THREE.ConeGeometry(0.009, 0.024, 4), {
      pos: [0, -0.014, 0.018],
      rot: [2.2, 0, 0]
    });
    const m = mergeGeometries([palm, thumb]);
    m.computeVertexNormals();
    return m;
  });
}

export function getThighGeo() {
  return getCachedGeo('thigh_v2', () => makeTaperedLimb(0.40, 0.068, 0.056, 0.044, 8, true));
}

export function getCalfGeo(bottomType) {
  return getCachedGeo(`calf_v2_${bottomType}`, () => {
    const base = makeTaperedLimb(0.40, 0.046, 0.041, 0.032, 8, true);
    const cuff = xform(new THREE.CylinderGeometry(0.048, 0.043, 0.048, 8), { pos: [0, -0.17, 0] });
    const m = mergeGeometries([base, cuff]);
    m.computeVertexNormals();
    return m;
  });
}

export function getFootGeo() {
  return getCachedGeo('foot_boot_v2', () => {
    const sole = xform(new THREE.BoxGeometry(0.068, 0.048, 0.145), { pos: [0, -0.050, 0.032] });
    const toe = xform(new THREE.SphereGeometry(0.034, 6, 5), {
      pos: [0, -0.052, 0.098],
      scale: [0.95, 0.65, 1.1]
    });
    const m = mergeGeometries([sole, toe]);
    m.computeVertexNormals();
    return m;
  });
}

export function getArmorCuirassGeo(type) {
  return getCachedGeo(`armor_chest_v2_${type}`, () => {
    return xform(new THREE.CylinderGeometry(0.148, 0.124, 0.24, 9), {
      pos: [0, 0.115, 0],
      scale: [1.10, 1, 0.78]
    });
  });
}

export function getArmorPauldronsGeo(type) {
  return getCachedGeo(`armor_pauldron_v2_${type}`, () => {
    const s = type === 'plate' ? 0.068 : 0.058;
    return xform(new THREE.SphereGeometry(s, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.6), {
      pos: [0, 0.02, 0],
      scale: [1.1, 0.9, 1.1]
    });
  });
}