import * as THREE from 'three';
import { evaluateWeaponPose } from './weaponAnimations.js';

export const HERO_POSES = [
  'idle', 'walk', 'run', 'attack1', 'attack2', 'attack3', 'comboLoop',
  'block', 'roll', 'hit', 'panic', 'afraid', 'death',
  'trainWeapon', 'trainSword', 'trainGreatsword', 'trainSpear', 'trainDagger',
  'trainBow', 'trainStaff', 'trainMace', 'trainClub', 'trainPickaxe', 'trainMagic',
  'mine', 'talk', 'cheer'
];

const GEO_CACHE = new Map();
const MAT_CACHE = new Map();
const TEX_CACHE = new Map();
let GRADIENT_TEX = null;

const OUTLINE_COLOR = 0x14101c;

const SKIN_PALETTE = [0xf3d8c4, 0xe8c3a5, 0xd8a987, 0xbc8762, 0x8c5b3e, 0xf7e2d2];
const HAIR_PALETTE = [0x141418, 0x2a211d, 0x453022, 0x6b3e26, 0xa85232, 0xc29b58, 0x6e7278];
const TOP_PALETTE = [0xe8e4dc, 0xdcd3c2, 0xc4b59d, 0x9ca19e, 0x73828c, 0x768572, 0x7d6856];
const VEST_PALETTE = [0x363338, 0x47392f, 0x2c353d, 0x4d473e, 0x3b2f2a];
const BOTTOM_PALETTE = [0x1c1b20, 0x36322e, 0x45372b, 0x262e38, 0x33363b];
const BOOTS_PALETTE = [0x181619, 0x2b221e, 0x3d2b20, 0x4a3525];
const ACCENT_PALETTE = [0x4a3728, 0x362b22, 0x574332, 0x2e2b29];

const BUILD_SCALES = {
  slim:     { sx: 0.85, sz: 0.84, shoulder: 0.86, arm: 0.85, leg: 0.88 },
  average:  { sx: 1.00, sz: 1.00, shoulder: 1.00, arm: 1.00, leg: 1.00 },
  stocky:   { sx: 1.18, sz: 1.16, shoulder: 1.10, arm: 1.12, leg: 1.12 },
  muscular: { sx: 1.12, sz: 1.08, shoulder: 1.20, arm: 1.24, leg: 1.10 }
};

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function pickMutedColor(rng, palette, maxS = 0.38, minL = 0.06, maxL = 0.92) {
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

function getGradientTexture() {
  if (GRADIENT_TEX) return GRADIENT_TEX;
  const data = new Uint8Array([96, 150, 212, 255]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  GRADIENT_TEX = tex;
  return tex;
}

function getToonMaterial(colorHex, extra = {}) {
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

function mergeGeometries(geos) {
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

function xform(geo, { pos, rot, scale } = {}) {
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

function createInflatedOutlineGeo(geo, thickness = 0.007) {
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

function getCachedGeo(key, builder) {
  if (GEO_CACHE.has(key)) return GEO_CACHE.get(key);
  const geo = builder();
  if (geo) GEO_CACHE.set(key, geo);
  return geo;
}

function makeTaperedLimb(len, rTop, rMid, rBot, segs = 8, yOffsetTop = true, roundShoulder = false) {
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

function makeHeadGeo() {
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

    // Map front-facing triangles generously so facial features appear 30% larger across the face
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

function getFaceTexture(skinTone, faceStyle, expression, facialHair, hairColor) {
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

  // Subtle nose bridge shadow
  ctx.fillStyle = `#${shadowCol.getHexString()}`;
  ctx.beginPath();
  ctx.moveTo(126, 124);
  ctx.lineTo(119, 158);
  ctx.lineTo(131, 160);
  ctx.closePath();
  ctx.fill();

  // Young freckles
  if (faceStyle === 'young') {
    ctx.fillStyle = 'rgba(135, 78, 50, 0.48)';
    for (const [fx, fy] of [[70, 156], [82, 160], [92, 154], [164, 154], [174, 160], [186, 156]]) {
      ctx.beginPath();
      ctx.arc(fx, fy, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Old facial lines
  if (faceStyle === 'old') {
    ctx.strokeStyle = `#${shadowCol.getHexString()}`;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(72, 164); ctx.quadraticCurveTo(92, 178, 98, 196);
    ctx.moveTo(184, 164); ctx.quadraticCurveTo(164, 178, 158, 196);
    ctx.stroke();
  }

  // Facial hair
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

  // Large sharp manhwa eyes (~30% larger than v2, crisp highlight & thin dark upper lash line)
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

      // Almond sclera shape
      ctx.fillStyle = '#fdfbf8';
      ctx.beginPath();
      ctx.moveTo(-eyeW, 2);
      ctx.quadraticCurveTo(0, -eyeH * 1.15, eyeW, 0);
      ctx.quadraticCurveTo(0, eyeH * 1.05, -eyeW, 2);
      ctx.closePath();
      ctx.fill();

      // Large dark iris
      const irisR = expression === 'afraid' ? 9.5 : 14.5;
      ctx.fillStyle = '#120f18';
      ctx.beginPath();
      ctx.arc(0, -0.5, irisR, 0, Math.PI * 2);
      ctx.fill();

      // Clear white primary highlight + small secondary glint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-5.5 * side, -5.0, expression === 'afraid' ? 3.5 : 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(4.5 * side, 4.5, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Subtle lower lash line
      ctx.strokeStyle = `#${shadowCol.getHexString()}`;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-eyeW * 0.75, eyeH * 0.45);
      ctx.quadraticCurveTo(0, eyeH * 0.85, eyeW * 0.75, eyeH * 0.38);
      ctx.stroke();

      // Thin, sharp dark upper lash line
      ctx.strokeStyle = '#0e0b12';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(-eyeW - 2, 3);
      ctx.quadraticCurveTo(0, -eyeH * 1.18, eyeW + 2, 0);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Left side on canvas (cx = 76) maps to -X, Right side (cx = 180) maps to +X
  drawEye(76, -1);
  drawEye(180, 1);

  // Eyebrows (placed at y = 92 so they remain clearly visible below the hair fringe;
  // remember flipY = true on CanvasTexture means positive canvas Y is DOWN on the texture,
  // so to angle inner brow DOWN toward the nose at x = 128, inner end needs a HIGHER canvas Y:
  // for left brow (cx = 76, inner is +X): positive rotation tilts +X down toward nose.
  // for right brow (cx = 180, inner is -X): negative rotation tilts -X down toward nose.)
  const drawBrow = (cx, side) => {
    ctx.save();
    ctx.translate(cx, 94);
    let angle = 0;
    let yOff = 0;
    if (expression === 'angry' || faceStyle === 'fierce') {
      angle = -side * 0.24; // Steep downward angle toward nose
      yOff = 2;
    } else if (faceStyle === 'stern') {
      angle = -side * 0.15; // Slight downward angle toward nose (Han Islat look)
      yOff = 1;
    } else if (expression === 'afraid' || expression === 'pain') {
      angle = side * 0.20; // Inner ends raised up in fear/pain
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

  // Mouth (canvas y = 192)
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
  // Smooth tapered lock hanging from origin (0,0,0) downward along -Y
  const g = new THREE.ConeGeometry(rBase, len, 5);
  g.rotateX(Math.PI); // Tip points down (-Y), base sits at hairline
  g.translate(0, -len * 0.45, 0);
  g.scale(1.0, 1.0, 0.55); // Flatten slightly front-to-back like a real hair strand
  return g;
}

function buildHairAndBeardGeo(style, hasBeard) {
  return getCachedGeo(`hair_v3_${style}_${hasBeard ? 1 : 0}`, () => {
    const pieces = [];
    if (style !== 'bald') {
      // Smooth upper/back cranium dome rotated backward so its front edge stays above the hairline (y > 0.185)
      pieces.push(xform(new THREE.SphereGeometry(0.101, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.50), {
        pos: [0, 0.132, -0.015],
        rot: [-0.46, 0, 0],
        scale: [0.93, 1.06, 0.98]
      }));

      // Helper to add 5 to 7 smooth tapered forehead locks hanging from hairline (y = 0.192)
      const addForeheadFringe = (lockCount, baseLen) => {
        const lockGeo = makeHairLockGeo(baseLen, 0.017);
        const span = 0.112;
        for (let i = 0; i < lockCount; i++) {
          const u = lockCount === 1 ? 0 : (i / (lockCount - 1)) - 0.5; // -0.5 .. 0.5
          const x = u * span;
          const z = 0.078 - u * u * 0.055; // Follows curved forehead contour
          const y = 0.194 - Math.abs(u) * 0.008;
          // Center locks are shorter and sweep sideways so eyebrows & eyes stay 100% clear
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
          const ang = ((i / crownSpikes) * Math.PI * 1.4) + Math.PI * 0.3; // Sides and back crown
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

function getTorsoGeo(topType) {
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

function getChestGeo(topType) {
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

function getChestDetailGeo(topType) {
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

export function createHeroModel(opts = {}) {
  const seed = opts.seed !== undefined ? opts.seed : 1337;
  const rng = mulberry32(seed);

  const heightScale = opts.heightScale ?? (0.94 + rng() * 0.14);
  const buildName = opts.build ?? pick(rng, ['slim', 'average', 'stocky', 'muscular']);
  const build = BUILD_SCALES[buildName] || BUILD_SCALES.average;

  // Use opts colors EXACTLY as given; apply muted palette generator ONLY when missing
  const skinTone = opts.skinTone !== undefined ? opts.skinTone : pickMutedColor(rng, SKIN_PALETTE, 0.48, 0.22, 0.90);
  const faceStyle = opts.faceStyle ?? pick(rng, ['neutral', 'stern', 'young', 'old', 'fierce']);

  const hairStyles = ['spiky', 'short', 'long', 'braid', 'ponytail', 'bowl', 'bald', 'messy'];
  const hairStyle = opts.hair?.style ?? (typeof opts.hair === 'string' ? opts.hair : pick(rng, hairStyles));
  const hairColor = opts.hair?.color !== undefined
    ? opts.hair.color
    : (typeof opts.hair === 'number' ? opts.hair : pickMutedColor(rng, HAIR_PALETTE, 0.45, 0.05, 0.75));
  const facialHair = opts.facialHair ?? (faceStyle === 'old' ? 'beard' : pick(rng, ['none', 'none', 'stubble', 'mustache', 'beard']));

  const outfitOpts = opts.outfit || {};
  const armorColor = typeof opts.armor === 'number' ? opts.armor : (opts.armor?.color);
  const topType = outfitOpts.top ?? (opts.armor ? 'vest' : pick(rng, ['shirt', 'shirtRolled', 'tunic', 'vest', 'robe']));
  const topColor = outfitOpts.topColor !== undefined ? outfitOpts.topColor : (armorColor !== undefined ? armorColor : pickMutedColor(rng, TOP_PALETTE, 0.30, 0.20, 0.92));
  const vestColor = outfitOpts.vestColor !== undefined ? outfitOpts.vestColor : pickMutedColor(rng, VEST_PALETTE, 0.28, 0.12, 0.55);
  const bottomType = outfitOpts.bottom ?? 'trousers';
  const bottomColor = outfitOpts.bottomColor !== undefined ? outfitOpts.bottomColor : pickMutedColor(rng, BOTTOM_PALETTE, 0.25, 0.08, 0.45);
  const bootsColor = outfitOpts.bootsColor !== undefined ? outfitOpts.bootsColor : pickMutedColor(rng, BOOTS_PALETTE, 0.30, 0.06, 0.38);
  const accentColor = outfitOpts.accentColor !== undefined ? outfitOpts.accentColor : pickMutedColor(rng, ACCENT_PALETTE, 0.32, 0.10, 0.48);
  let outlineVisible = opts.outline !== undefined ? Boolean(opts.outline) : true;

  const group = new THREE.Group();
  group.userData.equippedWeaponKind = opts.weaponKind || 'sword';
  group.userData.equippedShieldKind = opts.shieldKind || null;
  group.userData.animBlender = {
    lastAction: null,
    lastWeapon: null,
    blendElapsed: 1.0,
    blendDuration: 0.09,
    snapshot: null,
    current: null
  };
  const root = new THREE.Group();
  root.scale.setScalar(heightScale);
  group.add(root);

  // Skeleton joint pivots
  const hips = new THREE.Group();
  hips.position.set(0, 0.88, 0);
  root.add(hips);

  const torso = new THREE.Group();
  torso.position.set(0, 0.04, 0);
  hips.add(torso);

  const chest = new THREE.Group();
  chest.position.set(0, 0.18, 0);
  torso.add(chest);

  const neck = new THREE.Group();
  neck.position.set(0, 0.24, 0);
  chest.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 0.05, 0);
  neck.add(head);

  const shoulderX = 0.162 * build.shoulder;
  const shoulderL = new THREE.Group();
  shoulderL.position.set(shoulderX, 0.21, 0);
  chest.add(shoulderL);

  const shoulderR = new THREE.Group();
  shoulderR.position.set(-shoulderX, 0.21, 0);
  chest.add(shoulderR);

  const elbowL = new THREE.Group();
  elbowL.position.set(0, -0.24, 0);
  shoulderL.add(elbowL);

  const elbowR = new THREE.Group();
  elbowR.position.set(0, -0.24, 0);
  shoulderR.add(elbowR);

  const handL = new THREE.Group();
  handL.position.set(0, -0.21, 0);
  elbowL.add(handL);

  const handR = new THREE.Group();
  handR.position.set(0, -0.21, 0);
  elbowR.add(handR);

  const hipX = 0.084 * build.sx;
  const hipL = new THREE.Group();
  hipL.position.set(hipX, 0, 0);
  hips.add(hipL);

  const hipR = new THREE.Group();
  hipR.position.set(-hipX, 0, 0);
  hips.add(hipR);

  const kneeL = new THREE.Group();
  kneeL.position.set(0, -0.40, 0);
  hipL.add(kneeL);

  const kneeR = new THREE.Group();
  kneeR.position.set(0, -0.40, 0);
  hipR.add(kneeR);

  const footL = new THREE.Group();
  footL.position.set(0, -0.40, 0);
  kneeL.add(footL);

  const footR = new THREE.Group();
  footR.position.set(0, -0.40, 0);
  kneeR.add(footR);

  // Item attachment sockets
  const sockets = {
    handR: new THREE.Group(),
    handL: new THREE.Group(),
    staffHand: new THREE.Group(),
    back: new THREE.Group(),
    hip: new THREE.Group(),
    head: new THREE.Group()
  };
  sockets.handR.position.set(0, -0.022, 0.005);
  handR.add(sockets.handR);
  sockets.staffHand.name = 'socket_staffHand';
  sockets.staffHand.position.set(0, -0.022, 0.005);
  handR.add(sockets.staffHand);
  sockets.handL.position.set(0, -0.022, 0.005);
  handL.add(sockets.handL);
  sockets.back.position.set(0, 0.12, -0.11 * build.sz);
  chest.add(sockets.back);
  sockets.hip.position.set(-0.13 * build.sx, -0.02, 0);
  hips.add(sockets.hip);
  sockets.head.position.set(0, 0.21, 0);
  head.add(sockets.head);

  const allMeshes = [];
  const outlineMeshes = [];
  const baseColors = new Map();
  let hasClonedMaterials = false;

  const skinMat = getToonMaterial(skinTone);
  const hairMat = getToonMaterial(hairColor);
  const topMat = getToonMaterial(topColor);
  const detailMat = getToonMaterial(topType === 'vest' ? vestColor : accentColor);
  const bottomMat = getToonMaterial(bottomColor);
  const bootsMat = getToonMaterial(bootsColor);
  const outlineMat = getToonMaterial(OUTLINE_COLOR, { outline: true });

  let currentExpression = 'neutral';
  const makeFaceMat = (expr) => {
    const tex = getFaceTexture(skinTone, faceStyle, expr, facialHair, hairColor);
    const mapId = `${skinTone}_${faceStyle}_${expr}_${facialHair}_${hairColor}`;
    return getToonMaterial(0xffffff, { map: tex, mapId });
  };

  function addPartMesh(parent, geo, mat, scaleVec = [1, 1, 1], withOutline = false) {
    if (!geo) return null;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(...scaleVec);
    parent.add(mesh);
    allMeshes.push(mesh);
    baseColors.set(mesh, mat.color.clone());

    if (withOutline) {
      const outGeo = getCachedGeo(`out_${geo.uuid}`, () => createInflatedOutlineGeo(geo, 0.007));
      const outMesh = new THREE.Mesh(outGeo, outlineMat);
      outMesh.visible = outlineVisible;
      mesh.add(outMesh);
      outlineMeshes.push(outMesh);
    }
    return mesh;
  }

  // Pelvis + Torso + Chest
  const pelvisGeo = getCachedGeo('pelvis_v2', () => {
    const g = xform(new THREE.CylinderGeometry(0.106, 0.102, 0.13, 9), {
      pos: [0, 0.01, 0],
      scale: [1.04, 1, 0.72]
    });
    g.computeVertexNormals();
    return g;
  });
  addPartMesh(hips, pelvisGeo, bottomMat, [build.sx, 1, build.sz], false);
  addPartMesh(torso, getTorsoGeo(topType), topMat, [build.sx, 1, build.sz], true);
  addPartMesh(chest, getChestGeo(topType), topMat, [build.sx, 1, build.sz], true);
  addPartMesh(chest, getChestDetailGeo(topType), detailMat, [build.sx, 1, build.sz], false);

  // Neck + Head + Hair/Beard merged
  const neckGeo = getCachedGeo('neck_v2', () => makeTaperedLimb(0.085, 0.038, 0.041, 0.046, 7, false));
  addPartMesh(neck, neckGeo, skinMat, [1, 1, 1], false);

  const headMesh = addPartMesh(head, makeHeadGeo(), makeFaceMat(currentExpression), [1, 1, 1], true);
  const hairGeo = buildHairAndBeardGeo(hairStyle, facialHair === 'beard');
  if (hairGeo) addPartMesh(head, hairGeo, hairMat, [1, 1, 1], true);

  // Tapered Upper Arms with rounded shoulder cap
  const upperArmGeo = getCachedGeo(`uarm_v2_${topType}`, () => {
    const sleeve = makeTaperedLimb(0.24, 0.047, 0.041, 0.036, 8, true, true);
    if (topType === 'shirtRolled' || topType === 'tunic') {
      const cuff = xform(new THREE.CylinderGeometry(0.042, 0.041, 0.032, 8), { pos: [0, -0.21, 0] });
      return mergeGeometries([sleeve, cuff]);
    }
    return sleeve;
  });
  addPartMesh(shoulderL, upperArmGeo, topMat, [build.arm, 1, build.arm], true);
  addPartMesh(shoulderR, upperArmGeo, topMat, [build.arm, 1, build.arm], true);

  // Forearms attached to elbow pivots
  const forearmGeo = getCachedGeo('forearm_v2', () => {
    const fa = makeTaperedLimb(0.21, 0.036, 0.031, 0.023, 8, true);
    fa.computeVertexNormals();
    return fa;
  });
  addPartMesh(elbowL, forearmGeo, skinMat, [build.arm, 1, build.arm], false);
  addPartMesh(elbowR, forearmGeo, skinMat, [build.arm, 1, build.arm], false);

  // Compact Hands (palm + thumb) attached to hand joints with sockets
  const handMeshGeo = getCachedGeo('hand_palm_v2', () => {
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
  addPartMesh(handL, handMeshGeo, skinMat, [build.arm, 1, build.arm], false);
  addPartMesh(handR, handMeshGeo, skinMat, [build.arm, 1, build.arm], false);

  // Thighs
  const thighGeo = getCachedGeo('thigh_v2', () => makeTaperedLimb(0.40, 0.068, 0.056, 0.044, 8, true));
  addPartMesh(hipL, thighGeo, bottomMat, [build.leg, 1, build.leg], true);
  addPartMesh(hipR, thighGeo, bottomMat, [build.leg, 1, build.leg], true);

  // Calves / Boots
  const calfGeo = getCachedGeo(`calf_v2_${bottomType}`, () => {
    const base = makeTaperedLimb(0.40, 0.046, 0.041, 0.032, 8, true);
    const cuff = xform(new THREE.CylinderGeometry(0.048, 0.043, 0.048, 8), { pos: [0, -0.17, 0] });
    const m = mergeGeometries([base, cuff]);
    m.computeVertexNormals();
    return m;
  });
  const calfMat = bottomType === 'shorts' ? skinMat : bootsMat;
  addPartMesh(kneeL, calfGeo, calfMat, [build.leg, 1, build.leg], true);
  addPartMesh(kneeR, calfGeo, calfMat, [build.leg, 1, build.leg], true);

  // Feet / Boots
  const footGeo = getCachedGeo('foot_boot_v2', () => {
    const sole = xform(new THREE.BoxGeometry(0.068, 0.048, 0.145), { pos: [0, -0.050, 0.032] });
    const toe = xform(new THREE.SphereGeometry(0.034, 6, 5), {
      pos: [0, -0.052, 0.098],
      scale: [0.95, 0.65, 1.1]
    });
    const m = mergeGeometries([sole, toe]);
    m.computeVertexNormals();
    return m;
  });
  addPartMesh(footL, footGeo, bootsMat, [1, 1, 1], false);
  addPartMesh(footR, footGeo, bootsMat, [1, 1, 1], false);

  const armorMeshes = [];

  function clearArmor() {
    while (armorMeshes.length > 0) {
      const m = armorMeshes.pop();
      if (m.parent) m.parent.remove(m);
      const idx = allMeshes.indexOf(m);
      if (idx !== -1) allMeshes.splice(idx, 1);
      baseColors.delete(m);
    }
  }

  function setArmor(spec) {
    clearArmor();
    if (!spec) return;
    const armorCol = spec.color ?? (spec.type === 'leather' ? 0x6b472e : spec.type === 'chain' ? 0x7c8288 : 0x9aa2ab);
    const aMat = getToonMaterial(armorCol);

    const cuirassGeo = getCachedGeo(`armor_chest_v2_${spec.type}`, () => {
      return xform(new THREE.CylinderGeometry(0.148, 0.124, 0.24, 9), {
        pos: [0, 0.115, 0],
        scale: [1.10, 1, 0.78]
      });
    });
    const pauldronsGeo = getCachedGeo(`armor_pauldron_v2_${spec.type}`, () => {
      const s = spec.type === 'plate' ? 0.068 : 0.058;
      return xform(new THREE.SphereGeometry(s, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.6), {
        pos: [0, 0.02, 0],
        scale: [1.1, 0.9, 1.1]
      });
    });

    const mChest = addPartMesh(chest, cuirassGeo, aMat, [build.sx, 1, build.sz], false);
    const mShL = addPartMesh(shoulderL, pauldronsGeo, aMat, [1, 1, 1], false);
    const mShR = addPartMesh(shoulderR, pauldronsGeo, aMat, [1, 1, 1], false);
    armorMeshes.push(mChest, mShL, mShR);
  }

  if (opts.armor) {
    const aType = typeof opts.armor === 'string' ? opts.armor : (opts.armor?.type || 'plate');
    const aColor = typeof opts.armor === 'number' ? opts.armor : (opts.armor?.color ?? 0x7c8288);
    setArmor({ type: aType, color: aColor });
  }

  function ensureClonedMaterials() {
    if (hasClonedMaterials) return;
    hasClonedMaterials = true;
    for (const m of allMeshes) {
      m.material = m.material.clone();
      baseColors.set(m, m.material.color.clone());
    }
  }

  function setTint(hex, amount = 0) {
    if (!hex || amount <= 0) {
      if (!hasClonedMaterials) return;
      for (const m of allMeshes) {
        const base = baseColors.get(m);
        if (base) m.material.color.copy(base);
      }
      return;
    }
    ensureClonedMaterials();
    const target = new THREE.Color(hex);
    const clamped = Math.max(0, Math.min(1, amount));
    for (const m of allMeshes) {
      const base = baseColors.get(m);
      if (base) m.material.color.copy(base).lerp(target, clamped);
    }
  }

  let clonedOutlineMat = null;
  function setOpacity(a) {
    const alpha = Math.max(0, Math.min(1, a));
    const isTrans = alpha < 0.999;
    ensureClonedMaterials();
    for (const m of allMeshes) {
      m.material.transparent = isTrans;
      m.material.opacity = alpha;
      m.material.depthWrite = !isTrans;
      m.material.needsUpdate = true;
    }
    if (!clonedOutlineMat && isTrans) {
      clonedOutlineMat = outlineMat.clone();
      for (const om of outlineMeshes) om.material = clonedOutlineMat;
    }
    if (clonedOutlineMat) {
      clonedOutlineMat.transparent = isTrans;
      clonedOutlineMat.opacity = alpha;
      clonedOutlineMat.depthWrite = !isTrans;
    }
  }

  function setOutlineVisible(bool) {
    outlineVisible = Boolean(bool);
    for (const om of outlineMeshes) om.visible = outlineVisible;
  }

  function setExpression(name) {
    const valid = ['neutral', 'angry', 'afraid', 'pain', 'dead', 'happy'];
    currentExpression = valid.includes(name) ? name : 'neutral';
    const nextMat = makeFaceMat(currentExpression);
    if (hasClonedMaterials) {
      headMesh.material.map = nextMat.map;
      headMesh.material.needsUpdate = true;
    } else {
      headMesh.material = nextMat;
    }
  }

  const parts = {
    root, hips, torso, chest, neck, head,
    shoulderL, shoulderR, elbowL, elbowR, handL, handR,
    hipL, hipR, kneeL, kneeR, footL, footR
  };

  function resetPose() {
    hips.position.set(0, 0.88, 0);
    for (const key in parts) {
      if (key !== 'root') parts[key].rotation.set(0, 0, 0);
    }
    shoulderL.rotation.z = 0.08;
    shoulderR.rotation.z = -0.08;
  }

  function setPose(name, t = 0, intensity = 1, context = null) {
    resetPose();
    const k = Math.max(0, intensity);

    const weaponKind = context?.weaponKind || group.userData.equippedWeaponKind || 'sword';
    const shieldKind = context?.shieldKind !== undefined ? context.shieldKind : (group.userData.equippedShieldKind || null);

    const WEAPON_AWARE_POSES = new Set([
      'idle', 'walk', 'run', 'attack1', 'attack2', 'attack3', 'comboLoop',
      'block', 'mine', 'trainWeapon', 'trainSword', 'trainGreatsword', 'trainSpear',
      'trainDagger', 'trainBow', 'trainStaff', 'trainMace', 'trainClub', 'trainPickaxe', 'trainMagic',
      'aimReady', 'reach', 'nock', 'raise', 'fullDraw', 'release', 'vibrate', 'aim', 'shoot',
      'cast', 'ultimateChannel', 'spellCast', 'staffCast'
    ]);

    if (WEAPON_AWARE_POSES.has(name)) {
      evaluateWeaponPose(parts, sockets, {
        name,
        t,
        intensity: k,
        weaponKind,
        shieldKind,
        dt: context?.dt || 0.016,
        moving: context?.moving,
        bowDraw: context?.bowDraw,
        arrowVisible: context?.arrowVisible,
        vibTime: context?.vibTime,
        isTremor: context?.isTremor,
        overdraw: context?.overdraw
      });
      if (parts.root.userData.bowState) {
        group.userData.bowState = parts.root.userData.bowState;
      }
      return;
    }

    switch (name) {
      case 'roll': {
        const raw = t > 0.4 ? (t % 0.55) : Math.max(0, t);
        const u = Math.min(1, raw / 0.4);
        const tuck = Math.sin(u * Math.PI);
        hips.position.y = 0.88 - tuck * 0.46;
        hips.position.z = Math.sin(u * Math.PI) * 0.18;
        hips.rotation.x = u * Math.PI * 2;
        torso.rotation.x = tuck * 0.75;
        head.rotation.x = tuck * 0.55;
        hipL.rotation.x = -tuck * 1.35;
        hipR.rotation.x = -tuck * 1.35;
        kneeL.rotation.x = tuck * 1.75;
        kneeR.rotation.x = tuck * 1.75;
        shoulderL.rotation.x = -tuck * 1.25;
        shoulderR.rotation.x = -tuck * 1.25;
        elbowL.rotation.x = -tuck * 1.35;
        elbowR.rotation.x = -tuck * 1.35;
        break;
      }
      case 'hit': {
        const raw = t > 0.25 ? (t % 0.45) : Math.max(0, t);
        const u = Math.min(1, raw / 0.25);
        const recoil = Math.sin(u * Math.PI) * k;
        hips.position.z = -recoil * 0.10;
        hips.position.y = 0.88 - recoil * 0.04;
        torso.rotation.x = -0.45 * recoil;
        chest.rotation.x = -0.25 * recoil;
        chest.rotation.y = 0.28 * recoil;
        head.rotation.x = -0.52 * recoil;
        shoulderL.rotation.x = -0.45 * recoil;
        shoulderR.rotation.x = -0.45 * recoil;
        shoulderL.rotation.z = 0.65 * recoil;
        shoulderR.rotation.z = -0.65 * recoil;
        hipL.rotation.x = 0.22 * recoil;
        kneeL.rotation.x = 0.25 * recoil;
        break;
      }
      case 'panic': {
        const w = t * 14.0;
        hips.position.y = 0.86 + Math.abs(Math.sin(w)) * 0.04 * k;
        torso.rotation.z = Math.sin(w * 0.5) * 0.15 * k;
        head.rotation.y = Math.sin(w * 0.7) * 0.35 * k;
        shoulderL.rotation.x = -2.4 + Math.sin(w) * 0.45 * k;
        shoulderR.rotation.x = -2.4 - Math.sin(w) * 0.45 * k;
        hipL.rotation.x = Math.sin(w) * 0.45 * k;
        hipR.rotation.x = -Math.sin(w) * 0.45 * k;
        break;
      }
      case 'afraid': {
        const tremor = Math.sin(t * 38.0) * 0.025 * k;
        hips.position.y = 0.78;
        hips.position.x = tremor;
        torso.rotation.x = 0.38 * k;
        head.rotation.x = -0.22 * k;
        head.rotation.y = tremor * 2.5;
        shoulderL.rotation.x = -1.35 * k;
        shoulderR.rotation.x = -1.35 * k;
        elbowL.rotation.x = -1.55 * k;
        elbowR.rotation.x = -1.55 * k;
        hipL.rotation.x = -0.45 * k;
        hipR.rotation.x = -0.45 * k;
        kneeL.rotation.x = 0.75 * k;
        kneeR.rotation.x = 0.75 * k;
        break;
      }
      case 'death': {
        const u = Math.min(1, Math.max(0, t / 1.6));
        if (u < 0.45) {
          const k1 = u / 0.45;
          hips.position.y = 0.88 - k1 * 0.38;
          torso.rotation.x = k1 * 0.45;
          kneeL.rotation.x = k1 * 1.35;
          kneeR.rotation.x = k1 * 1.35;
          hipL.rotation.x = -k1 * 0.65;
          hipR.rotation.x = -k1 * 0.65;
        } else {
          const k2 = (u - 0.45) / 0.55;
          const ease = 1 - Math.pow(1 - k2, 3);
          hips.position.y = 0.50 - ease * 0.39;
          hips.rotation.x = ease * (Math.PI * 0.48);
          torso.rotation.x = 0.45 * (1 - ease);
          kneeL.rotation.x = 1.35 * (1 - ease * 0.8);
          kneeR.rotation.x = 1.35 * (1 - ease * 0.8);
          shoulderL.rotation.z = 0.45 * ease;
          shoulderR.rotation.z = -0.45 * ease;
        }
        break;
      }
      case 'talk': {
        const w = t * 4.5;
        head.rotation.x = Math.sin(w) * 0.08 * k;
        head.rotation.y = Math.cos(w * 0.6) * 0.12 * k;
        shoulderR.rotation.x = -0.45 + Math.sin(w * 0.8) * 0.18 * k;
        elbowR.rotation.x = -0.85 + Math.cos(w) * 0.15 * k;
        elbowL.rotation.x = -0.25;
        break;
      }
      case 'cheer': {
        const w = t * 7.5;
        const jump = Math.max(0, Math.sin(w));
        hips.position.y = 0.88 + jump * 0.08 * k;
        shoulderL.rotation.x = -2.6 + Math.sin(w) * 0.25 * k;
        shoulderR.rotation.x = -2.6 - Math.sin(w) * 0.25 * k;
        head.rotation.x = -0.18 * k;
        break;
      }
    }
  }

  setPose('idle', 0, 1);

  function getBounds() {
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    box.applyMatrix4(group.matrixWorld.clone().invert());
    return box;
  }

  function dispose() {
    clearArmor();
    if (hasClonedMaterials) {
      for (const m of allMeshes) m.material.dispose();
    }
    if (clonedOutlineMat) clonedOutlineMat.dispose();
  }

  return {
    group,
    parts,
    sockets,
    userData: group.userData,
    setPose,
    setExpression,
    setArmor,
    setTint,
    setOpacity,
    setOutlineVisible,
    getBounds,
    dispose
  };
}

