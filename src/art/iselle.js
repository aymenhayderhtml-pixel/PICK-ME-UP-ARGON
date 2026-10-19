// src/art/iselle.js
import * as THREE from 'three';

export const ISELLE_POSES = ['idle', 'float', 'walk', 'fly', 'cast', 'hit', 'ko', 'victory'];
export const ISELLE_EXPRESSIONS = ['neutral', 'smile', 'surprised', 'angry', 'sad', 'blink', 'wink'];

export const POSE_INFO = {
  idle:    { loop: true,  duration: 2.4, label: 'Idle' },
  float:   { loop: true,  duration: 2.0, label: 'Float' },
  walk:    { loop: true,  duration: 1.0, label: 'Walk' },
  fly:     { loop: true,  duration: 0.8, label: 'Fly' },
  cast:    { loop: false, duration: 1.1, label: 'Cast' },
  hit:     { loop: false, duration: 0.45, label: 'Hit' },
  ko:      { loop: false, duration: 1.2, label: 'K.O.' },
  victory: { loop: true,  duration: 1.6, label: 'Victory' },
};

// ---------------------------------------------------------------------------
// GEOMETRY MERGING & HELPERS
// ---------------------------------------------------------------------------

function mergeGeos(list) {
  let totalVerts = 0;
  let totalIdx = 0;
  const geos = list.map(g => {
    const nonIdx = g.index ? g.toNonIndexed() : g;
    totalVerts += nonIdx.attributes.position.count;
    totalIdx += nonIdx.index ? nonIdx.index.count : nonIdx.attributes.position.count;
    return nonIdx;
  });

  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const uv = new Float32Array(totalVerts * 2);
  const indices = new Uint32Array(totalIdx);

  let vOffset = 0;
  let iOffset = 0;

  for (const g of geos) {
    const pAttr = g.attributes.position;
    const nAttr = g.attributes.normal;
    const uAttr = g.attributes.uv;
    const count = pAttr.count;

    for (let i = 0; i < count; i++) {
      pos[(vOffset + i) * 3]     = pAttr.getX(i);
      pos[(vOffset + i) * 3 + 1] = pAttr.getY(i);
      pos[(vOffset + i) * 3 + 2] = pAttr.getZ(i);
      if (nAttr) {
        norm[(vOffset + i) * 3]     = nAttr.getX(i);
        norm[(vOffset + i) * 3 + 1] = nAttr.getY(i);
        norm[(vOffset + i) * 3 + 2] = nAttr.getZ(i);
      }
      if (uAttr) {
        uv[(vOffset + i) * 2]     = uAttr.getX(i);
        uv[(vOffset + i) * 2 + 1] = uAttr.getY(i);
      }
    }

    if (g.index) {
      const idx = g.index.array;
      for (let i = 0; i < idx.length; i++) {
        indices[iOffset + i] = idx[i] + vOffset;
      }
      iOffset += idx.length;
    } else {
      for (let i = 0; i < count; i++) {
        indices[iOffset + i] = vOffset + i;
      }
      iOffset += count;
    }
    vOffset += count;
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(indices, 1));
  return out;
}

function xform(geo, tx = 0, ty = 0, tz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  m.compose(new THREE.Vector3(tx, ty, tz), q, new THREE.Vector3(sx, sy, sz));
  geo.applyMatrix4(m);
  return geo;
}

function makeToonGrad() {
  const data = new Uint8Array([95, 165, 235, 255]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// SHARED 2D / 3D FACE DRAWING
// ---------------------------------------------------------------------------

/**
 * Shared facial features renderer used by both 2D portraits and 3D face plate.
 * Expects square coordinate space [0..size, 0..size] centered at (size/2, size/2).
 */
export function drawIselleFace(ctx, expression = 'neutral', size = 256) {
  const expr = ISELLE_EXPRESSIONS.includes(expression) ? expression : 'neutral';
  const s = size / 256;
  ctx.save();
  ctx.scale(s, s);

  const cx = 128;
  const cy = 132;
  const eyeSpanX = 48;
  const eyeW = 58; // ~22.6% of 256 width
  const eyeH = 56;

  // Soft cheek blush
  const blushGradL = ctx.createRadialGradient(cx - 64, cy + 30, 2, cx - 64, cy + 30, 28);
  blushGradL.addColorStop(0, 'rgba(245, 115, 148, 0.55)');
  blushGradL.addColorStop(1, 'rgba(245, 115, 148, 0)');
  ctx.fillStyle = blushGradL;
  ctx.beginPath();
  ctx.arc(cx - 64, cy + 30, 28, 0, Math.PI * 2);
  ctx.fill();

  const blushGradR = ctx.createRadialGradient(cx + 64, cy + 30, 2, cx + 64, cy + 30, 28);
  blushGradR.addColorStop(0, 'rgba(245, 115, 148, 0.55)');
  blushGradR.addColorStop(1, 'rgba(245, 115, 148, 0)');
  ctx.fillStyle = blushGradR;
  ctx.beginPath();
  ctx.arc(cx + 64, cy + 30, 28, 0, Math.PI * 2);
  ctx.fill();

  const drawSingleEye = (ex, ey, side, closed) => {
    ctx.save();
    ctx.translate(ex, ey);

    if (closed) {
      ctx.strokeStyle = '#24142c';
      ctx.lineWidth = 7.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-eyeW * 0.48, 2);
      ctx.quadraticCurveTo(0, 16, eyeW * 0.48, 2);
      ctx.stroke();

      ctx.lineWidth = 4.8;
      ctx.beginPath();
      ctx.moveTo(side * eyeW * 0.38, 6);
      ctx.lineTo(side * eyeW * 0.56, 0);
      ctx.moveTo(side * eyeW * 0.22, 10);
      ctx.lineTo(side * eyeW * 0.36, 17);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const scaleY = expr === 'surprised' ? 1.12 : 1.0;
    ctx.scale(1, scaleY);

    // Sclera
    ctx.fillStyle = '#fffafb';
    ctx.beginPath();
    ctx.ellipse(0, 2, eyeW * 0.50, eyeH * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    // Large Crimson/Ruby Iris with Dark Ring
    const irisR = eyeW * 0.42;
    ctx.fillStyle = '#2b091c';
    ctx.beginPath();
    ctx.ellipse(0, 3, irisR, irisR * 1.06, 0, 0, Math.PI * 2);
    ctx.fill();

    const irisGrad = ctx.createLinearGradient(0, -irisR, 0, irisR);
    irisGrad.addColorStop(0, '#7a0d2e');
    irisGrad.addColorStop(0.55, '#d91c4b');
    irisGrad.addColorStop(1, '#ff668c');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.ellipse(0, 3, irisR * 0.85, irisR * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark pupil
    ctx.fillStyle = '#1f0514';
    ctx.beginPath();
    ctx.ellipse(0, 3, irisR * 0.40, irisR * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lower bright ruby crescent bounce
    ctx.fillStyle = 'rgba(255, 160, 190, 0.58)';
    ctx.beginPath();
    ctx.ellipse(0, irisR * 0.48, irisR * 0.52, irisR * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Big crisp white primary highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-side * irisR * 0.35, -irisR * 0.34, irisR * 0.29, 0, Math.PI * 2);
    ctx.fill();

    // Secondary lower highlight dot
    ctx.beginPath();
    ctx.arc(side * irisR * 0.34, irisR * 0.36, irisR * 0.14, 0, Math.PI * 2);
    ctx.fill();

    // Upper eyelid crease
    ctx.strokeStyle = 'rgba(45, 20, 55, 0.38)';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.arc(0, -4, eyeW * 0.46, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Thick long upper eyelashes
    ctx.strokeStyle = '#1b0d24';
    ctx.fillStyle = '#1b0d24';
    ctx.lineWidth = 8.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 3, eyeW * 0.49, Math.PI * 1.06, Math.PI * 1.94);
    ctx.stroke();

    // Winged outer lash spikes
    ctx.lineWidth = 5.2;
    ctx.beginPath();
    ctx.moveTo(side * eyeW * 0.42, -8);
    ctx.lineTo(side * eyeW * 0.60, -18);
    ctx.moveTo(side * eyeW * 0.46, 0);
    ctx.lineTo(side * eyeW * 0.62, -4);
    ctx.stroke();

    // Subtle lower lash hint
    ctx.strokeStyle = '#4a2c48';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 3, eyeW * 0.48, Math.PI * 0.18, Math.PI * 0.82);
    ctx.stroke();

    ctx.restore();
  };

  const leftClosed = expr === 'blink';
  const rightClosed = expr === 'blink' || expr === 'wink';
  drawSingleEye(cx - eyeSpanX, cy - 2, -1, leftClosed);
  drawSingleEye(cx + eyeSpanX, cy - 2, 1, rightClosed);

  // Eyebrows
  const drawBrow = (bx, by, side) => {
    ctx.save();
    ctx.translate(bx, by);
    ctx.strokeStyle = '#5c4268';
    ctx.lineWidth = 4.8;
    ctx.lineCap = 'round';

    let rot = 0;
    let yOff = 0;
    if (expr === 'angry') {
      rot = -side * 0.32;
      yOff = 6;
    } else if (expr === 'sad') {
      rot = side * 0.28;
      yOff = 2;
    } else if (expr === 'surprised') {
      yOff = -8;
    }

    ctx.translate(0, yOff);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(-22, 2);
    ctx.quadraticCurveTo(0, -6, 22, 2);
    ctx.stroke();
    ctx.restore();
  };

  drawBrow(cx - eyeSpanX, cy - 38, -1);
  drawBrow(cx + eyeSpanX, cy - 38, 1);

  // Tiny delicate nose dot
  ctx.fillStyle = 'rgba(175, 115, 132, 0.75)';
  ctx.beginPath();
  ctx.arc(cx, cy + 20, 2.6, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  const my = cy + 44;
  ctx.strokeStyle = '#6b2d46';
  ctx.fillStyle = '#c84b6b';
  ctx.lineWidth = 4.4;
  ctx.lineCap = 'round';

  if (expr === 'smile' || expr === 'wink') {
    ctx.beginPath();
    ctx.arc(cx, my - 4, 13, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (expr === 'surprised') {
    ctx.fillStyle = '#8f2447';
    ctx.beginPath();
    ctx.ellipse(cx, my + 2, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (expr === 'angry') {
    ctx.beginPath();
    ctx.moveTo(cx - 12, my + 4);
    ctx.quadraticCurveTo(cx, my - 4, cx + 12, my + 4);
    ctx.stroke();
  } else if (expr === 'sad') {
    ctx.beginPath();
    ctx.moveTo(cx - 11, my + 5);
    ctx.quadraticCurveTo(cx, my - 2, cx + 11, my + 5);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - 10, my);
    ctx.quadraticCurveTo(cx, my + 4, cx + 10, my);
    ctx.stroke();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 2D PORTRAIT RENDERER (EXACTLY AS IN SCREENSHOT)
// ---------------------------------------------------------------------------

export function drawIsellePortrait(ctx, options = {}, sizeArg) {
  if (!ctx) return;
  let expression = 'neutral';
  let w = 256;
  let h = 256;
  let glow = 1;

  if (typeof options === 'string') {
    expression = options;
    if (typeof sizeArg === 'number') {
      w = sizeArg;
      h = sizeArg;
    } else {
      w = ctx.canvas?.width || 256;
      h = ctx.canvas?.height || 256;
    }
  } else if (typeof options === 'object' && options !== null) {
    w = options.width || ctx.canvas?.width || 256;
    h = options.height || ctx.canvas?.height || 256;
    expression = options.expression || 'neutral';
    glow = options.glow ?? 1;
  }

  ctx.save();
  ctx.clearRect(0, 0, w, h);

  const scale = Math.min(w, h) / 256;
  ctx.translate((w - 256 * scale) * 0.5, (h - 256 * scale) * 0.5);
  ctx.scale(scale, scale);

  // Background gothic vignette
  const bg = ctx.createRadialGradient(128, 120, 20, 128, 128, 136);
  bg.addColorStop(0, glow > 0 ? '#3a245e' : '#251a38');
  bg.addColorStop(0.65, '#171026');
  bg.addColorStop(1, '#0c0814');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);

  // Faint magical halo behind head
  if (glow > 0) {
    const aura = ctx.createRadialGradient(128, 118, 10, 128, 118, 108);
    aura.addColorStop(0, 'rgba(217, 200, 255, 0.35)');
    aura.addColorStop(0.6, 'rgba(155, 115, 245, 0.15)');
    aura.addColorStop(1, 'rgba(122, 79, 208, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(128, 118, 108, 0, Math.PI * 2);
    ctx.fill();
  }

  // Back twin-tails and rear hair volume
  ctx.fillStyle = '#c8bedb';
  ctx.strokeStyle = '#231733';
  ctx.lineWidth = 4;

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(128 + side * 72, 106);
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.bezierCurveTo(side * 42, -6, side * 52, 70, side * 26, 136);
    ctx.bezierCurveTo(side * 4, 120, -side * 6, 62, 0, -18);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Back hair dome
  ctx.beginPath();
  ctx.arc(128, 102, 74, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Small bat wings peeking from behind shoulders
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(128 + side * 58, 198);
    ctx.fillStyle = '#7a4fd0';
    ctx.strokeStyle = '#d9c8ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(side * 38, -28, side * 62, -8);
    ctx.quadraticCurveTo(side * 44, 10, side * 34, 24);
    ctx.quadraticCurveTo(side * 18, 14, 0, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Shoulders, Gothic Dress & White Lace Ruffles
  ctx.fillStyle = '#f6e3e6';
  ctx.strokeStyle = '#231733';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(110, 165, 36, 42, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1b1528';
  ctx.beginPath();
  ctx.moveTo(68, 256);
  ctx.lineTo(82, 196);
  ctx.quadraticCurveTo(128, 188, 174, 196);
  ctx.lineTo(188, 256);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // White lace shoulder ruffles
  ctx.fillStyle = '#f8f5ff';
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(128 + i * 16, 198 + Math.abs(i) * 2, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Black choker + silver emblem
  ctx.fillStyle = '#140e1d';
  ctx.fillRect(110, 178, 36, 9);
  ctx.strokeRect(110, 178, 36, 9);
  ctx.fillStyle = '#e6e9f5';
  ctx.beginPath();
  ctx.moveTo(128, 179);
  ctx.lineTo(134, 186);
  ctx.lineTo(128, 193);
  ctx.lineTo(122, 186);
  ctx.closePath();
  ctx.fill();

  // Head silhouette
  ctx.fillStyle = '#f6e3e6';
  ctx.strokeStyle = '#231733';
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(64, 102);
  ctx.bezierCurveTo(64, 52, 192, 52, 192, 102);
  ctx.bezierCurveTo(192, 144, 156, 174, 128, 177);
  ctx.bezierCurveTo(100, 174, 64, 144, 64, 102);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Shared Face Drawing
  ctx.save();
  ctx.translate(128, 118);
  ctx.scale(0.62, 0.62);
  ctx.translate(-128, -132);
  drawIselleFace(ctx, expression, 256);
  ctx.restore();

  // Parted Fringe
  ctx.fillStyle = '#dcd4eb';
  ctx.strokeStyle = '#231733';
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(58, 104);
  ctx.bezierCurveTo(56, 40, 200, 40, 198, 104);
  ctx.bezierCurveTo(186, 76, 158, 66, 128, 64);
  ctx.bezierCurveTo(98, 66, 70, 76, 58, 104);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(128 + side * 10, 62);
    ctx.quadraticCurveTo(128 + side * 56, 68, 128 + side * 68, 114);
    ctx.quadraticCurveTo(128 + side * 72, 152, 128 + side * 54, 178);
    ctx.quadraticCurveTo(128 + side * 46, 142, 128 + side * 48, 106);
    ctx.quadraticCurveTo(128 + side * 34, 78, 128 + side * 10, 62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(128 + side * 52, 54);
    ctx.fillStyle = '#241536';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(side * 24, -14);
    ctx.lineTo(side * 20, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#dcd4eb';
    ctx.beginPath();
    ctx.moveTo(-side * 10, 4);
    ctx.quadraticCurveTo(side * 6, -26, side * 18, -22);
    ctx.quadraticCurveTo(side * 22, 0, side * 6, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// FACE PLATE TEXTURE CACHE (256x256 per expression, enlarged for 3D readability)
// ---------------------------------------------------------------------------

const FACE_TEX_CACHE = new Map();

function getFacePlateTexture(expression) {
  const expr = ISELLE_EXPRESSIONS.includes(expression) ? expression : 'neutral';
  if (FACE_TEX_CACHE.has(expr)) return FACE_TEX_CACHE.get(expr);

  let canvas;
  if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
  } else if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(256, 256);
  }

  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);
    // Scale up slightly on the 256x256 plate so the eyes fill ~24% of the 3D head width
    ctx.save();
    ctx.translate(128, 136);
    ctx.scale(1.24, 1.24);
    ctx.translate(-128, -132);
    drawIselleFace(ctx, expr, 256);
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    FACE_TEX_CACHE.set(expr, tex);
    return tex;
  }

  const fallback = new THREE.DataTexture(new Uint8Array([255, 255, 255, 0]), 1, 1);
  FACE_TEX_CACHE.set(expr, fallback);
  return fallback;
}

export function disposeIselleCaches() {
  FACE_TEX_CACHE.forEach(t => {
    if (t && typeof t.dispose === 'function') t.dispose();
  });
  FACE_TEX_CACHE.clear();
}

// ---------------------------------------------------------------------------
// 3D GEOMETRY BUILDERS (CLEAN SILHOUETTES & LOW TRIANGLE COUNT)
// ---------------------------------------------------------------------------

function createCurvedFacePlateGeo(width, height, radius, segX = 6, segY = 6) {
  const geo = new THREE.PlaneGeometry(width, height, segX, segY);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const angle = x / radius;
    const ny = y / (height * 0.5);
    const yCurve = (1 - ny * ny * 0.13);
    const r = radius * yCurve;
    pos.setX(i, Math.sin(angle) * r);
    pos.setZ(i, Math.cos(angle) * r);
  }
  geo.computeVertexNormals();
  return geo;
}

function createHeadGeometry() {
  const sphere = new THREE.SphereGeometry(0.18, 14, 10);
  const pos = sphere.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    x *= 1.06;
    z *= 0.90;
    if (y < 0) {
      const t = Math.min(1, -y / 0.18);
      x *= (1.0 - t * 0.35);
      z *= (1.0 - t * 0.22);
      if (z > 0) z += t * 0.012;
    }
    pos.setXYZ(i, x, y, z);
  }
  sphere.computeVertexNormals();
  return sphere;
}

function createHairCrownAndFringeGeo() {
  const parts = [];

  // Rear/Top hair dome
  const cap = new THREE.SphereGeometry(0.194, 12, 9);
  const cPos = cap.attributes.position;
  for (let i = 0; i < cPos.count; i++) {
    let x = cPos.getX(i);
    let y = cPos.getY(i);
    let z = cPos.getZ(i);
    x *= 1.06;
    // Keep front hairline high so forehead and top of eyes are 100% unobstructed
    if (z > 0.03 && y < 0.12) {
      y += (0.12 - y) * 0.72;
      z *= 0.84;
    }
    cPos.setXYZ(i, x, y + 0.015, z - 0.014);
  }
  cap.computeVertexNormals();
  parts.push(cap);

  // Parted fringe: two side arches + cheek locks + horn-buns
  for (const side of [-1, 1]) {
    const arch = xform(
      new THREE.ConeGeometry(0.050, 0.16, 5),
      side * 0.095, 0.112, 0.138,
      0.22, 0, side * 1.15,
      1.0, 1.0, 0.50
    );
    const lock = xform(
      new THREE.ConeGeometry(0.045, 0.24, 5),
      side * 0.172, -0.025, 0.092,
      0.06, 0, -side * 0.10,
      0.85, 1.0, 0.55
    );
    const bunBase = xform(
      new THREE.SphereGeometry(0.045, 6, 5),
      side * 0.145, 0.175, 0.01,
      0, 0, -side * 0.45,
      1.0, 0.85, 0.9
    );
    const bunHorn = xform(
      new THREE.ConeGeometry(0.040, 0.115, 6),
      side * 0.175, 0.235, 0.01,
      -0.1, 0, -side * 0.52
    );
    parts.push(arch, lock, bunBase, bunHorn);
  }

  return mergeGeos(parts);
}

function createTwinTailGeo(side) {
  const seg1 = xform(
    new THREE.CylinderGeometry(0.035, 0.056, 0.26, 6),
    0, -0.12, 0,
    0.10, 0, side * 0.18
  );
  const seg2 = xform(
    new THREE.ConeGeometry(0.060, 0.30, 6),
    side * 0.045, -0.36, -0.02,
    Math.PI + 0.12, 0, -side * 0.12
  );
  return mergeGeos([seg1, seg2]);
}

/**
 * Builds a cohesive, 4-segment gothic bat/fairy wing starting cleanly at (0,0,0)
 * with a violet membrane (0x7a4fd0) and a continuous glowing lilac frame (0xd9c8ff).
 */
function createCohesiveWingGeos(side) {
  // 4-scalloped wing membrane silhouette using THREE.Shape
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.02);
  // Top leading arch out to wingtip (span = 0.64m per wing)
  shape.quadraticCurveTo(side * 0.24, 0.26, side * 0.64, 0.18);
  // Scallop 1 (outermost segment)
  shape.quadraticCurveTo(side * 0.54, 0.04, side * 0.56, -0.08);
  // Scallop 2 (second segment)
  shape.quadraticCurveTo(side * 0.43, -0.02, side * 0.41, -0.18);
  // Scallop 3 (third segment)
  shape.quadraticCurveTo(side * 0.28, -0.08, side * 0.24, -0.22);
  // Scallop 4 (innermost segment back to shoulder)
  shape.quadraticCurveTo(side * 0.12, -0.10, 0, -0.05);
  shape.closePath();

  const membraneGeo = new THREE.ShapeGeometry(shape, 5);

  // Glowing lilac frame: top leading bone + 4 radiating finger ribs + scalloped bottom edge strips
  const edgeParts = [];

  const addStrut = (x1, y1, x2, y2, thickness = 0.018) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    const bar = xform(
      new THREE.BoxGeometry(len, thickness, 0.018),
      (x1 + x2) * 0.5, (y1 + y2) * 0.5, 0,
      0, 0, ang
    );
    edgeParts.push(bar);
  };

  // Top leading edge arch (2 connected bone segments)
  addStrut(0, 0.02, side * 0.28, 0.20, 0.024);
  addStrut(side * 0.28, 0.20, side * 0.64, 0.18, 0.022);

  // 4 radiating wing ribs from the top arch down to each scallop tip
  addStrut(side * 0.26, 0.19, side * 0.56, -0.08, 0.016);
  addStrut(side * 0.22, 0.16, side * 0.41, -0.18, 0.016);
  addStrut(side * 0.15, 0.11, side * 0.24, -0.22, 0.016);
  addStrut(side * 0.06, 0.05, 0, -0.05, 0.015);

  // Bright glowing bottom trim strip along each of the 4 segment scallops
  addStrut(side * 0.64, 0.18, side * 0.56, -0.08, 0.016);
  addStrut(side * 0.56, -0.08, side * 0.41, -0.18, 0.016);
  addStrut(side * 0.41, -0.18, side * 0.24, -0.22, 0.016);
  addStrut(side * 0.24, -0.22, 0, -0.05, 0.016);

  return {
    membraneGeo,
    edgeGeo: mergeGeos(edgeParts),
  };
}

// ---------------------------------------------------------------------------
// 3D MODEL FACTORY
// ---------------------------------------------------------------------------

export function createIselleModel(options = {}) {
  const root = new THREE.Group();
  root.name = 'IselleRoot';
  if (options.scale) {
    root.scale.setScalar(options.scale);
  }

  const toonGrad = makeToonGrad();
  const disposables = [toonGrad];
  const matList = [];

  const regMat = (m) => {
    matList.push(m);
    disposables.push(m);
    return m;
  };
  const regGeo = (g) => {
    disposables.push(g);
    return g;
  };

  // Materials
  const skinMat = regMat(new THREE.MeshToonMaterial({
    color: 0xf6e3e6,
    emissive: 0x261520,
    emissiveIntensity: 0.18,
    gradientMap: toonGrad,
  }));

  const hairMat = regMat(new THREE.MeshToonMaterial({
    color: 0xdcd4eb,
    emissive: 0x221838,
    emissiveIntensity: 0.15,
    gradientMap: toonGrad,
  }));

  const dressMat = regMat(new THREE.MeshToonMaterial({
    color: 0x1c152b,
    emissive: 0x0e081a,
    emissiveIntensity: 0.15,
    gradientMap: toonGrad,
  }));

  const darkTrimMat = regMat(new THREE.MeshToonMaterial({
    color: 0x150d22,
    emissive: 0x120824,
    emissiveIntensity: 0.2,
    gradientMap: toonGrad,
  }));

  const whiteLaceMat = regMat(new THREE.MeshToonMaterial({
    color: 0xf7f4ff,
    emissive: 0x4a3d66,
    emissiveIntensity: 0.25,
    gradientMap: toonGrad,
  }));

  const wingMembraneMat = regMat(new THREE.MeshToonMaterial({
    color: 0x7a4fd0,
    emissive: 0x4c2896,
    emissiveIntensity: 0.45,
    gradientMap: toonGrad,
    side: THREE.DoubleSide,
  }));

  const wingEdgeMat = regMat(new THREE.MeshBasicMaterial({
    color: 0xd9c8ff,
  }));

  const outlineMat = regMat(new THREE.MeshBasicMaterial({
    color: 0x140b21,
    side: THREE.BackSide,
  }));

  const facePlateMat = regMat(new THREE.MeshBasicMaterial({
    map: getFacePlateTexture('neutral'),
    transparent: true,
    alphaTest: 0.03,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  }));

  // Very subtle additive lilac aura shell (FrontSide so front+back don't double-up into a grey egg)
  const auraMat = regMat(new THREE.MeshBasicMaterial({
    color: 0xcdb8ff,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  }));

  // -------------------------------------------------------------------------
  // HIERARCHY & RIG (17 Total Meshes, ~1,580 Triangles)
  // -------------------------------------------------------------------------

  const bodyPivot = new THREE.Group();
  bodyPivot.position.set(0, 0.56, 0);
  root.add(bodyPivot);

  const torsoPivot = new THREE.Group();
  bodyPivot.add(torsoPivot);

  // 1. Dress + Choker + Bodice (Merged -> 1 Mesh)
  const bodiceGeo = xform(new THREE.CylinderGeometry(0.085, 0.115, 0.24, 8), 0, 0.13, 0);
  const skirtGeo = xform(new THREE.ConeGeometry(0.27, 0.34, 12, 1, false), 0, -0.08, 0);
  const chokerBand = xform(new THREE.CylinderGeometry(0.053, 0.055, 0.028, 8), 0, 0.275, 0);
  const dressMesh = new THREE.Mesh(regGeo(mergeGeos([bodiceGeo, skirtGeo, chokerBand])), dressMat);
  torsoPivot.add(dressMesh);

  // 2. White Lace Ruffles (Collar + Shoulders + Hem + Silver Choker Emblem -> 1 Mesh)
  const neckRing = xform(new THREE.TorusGeometry(0.092, 0.024, 5, 10), 0, 0.245, 0, Math.PI * 0.5, 0, 0);
  const leftShoulderRuffle = xform(new THREE.TorusGeometry(0.058, 0.022, 5, 7), -0.105, 0.225, 0, 0.3, 0, 0.55);
  const rightShoulderRuffle = xform(new THREE.TorusGeometry(0.058, 0.022, 5, 7), 0.105, 0.225, 0, 0.3, 0, -0.55);
  const hemRing = xform(new THREE.TorusGeometry(0.262, 0.028, 5, 12), 0, -0.24, 0, Math.PI * 0.5, 0, 0);
  const silverEmblem = xform(new THREE.OctahedronGeometry(0.024, 0), 0, 0.272, 0.068, 0, 0, Math.PI * 0.25, 0.9, 1.3, 0.5);
  const rufflesMesh = new THREE.Mesh(
    regGeo(mergeGeos([neckRing, leftShoulderRuffle, rightShoulderRuffle, hemRing, silverEmblem])),
    whiteLaceMat
  );
  torsoPivot.add(rufflesMesh);

  // 3. Neck Mesh -> 1 Mesh
  const neckGeo = xform(new THREE.CylinderGeometry(0.048, 0.056, 0.10, 7), 0, 0.28, 0);
  const neckMesh = new THREE.Mesh(regGeo(neckGeo), skinMat);
  torsoPivot.add(neckMesh);

  // -------------------------------------------------------------------------
  // HEAD & CURVED FACE PLATE
  // -------------------------------------------------------------------------

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.31, 0);
  torsoPivot.add(headPivot);

  // 4. Head Mesh
  const headGeo = regGeo(createHeadGeometry());
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.set(0, 0.15, 0);
  headPivot.add(headMesh);

  // 5. Head Outline Shell
  const headOutlineGeo = regGeo(xform(createHeadGeometry(), 0, 0.15, 0, 0, 0, 0, 1.065, 1.065, 1.065));
  const headOutlineMesh = new THREE.Mesh(headOutlineGeo, outlineMat);
  headPivot.add(headOutlineMesh);

  // 6. Curved Front-Facing FACE PLATE (0.9 of head width, 0.8 of head height, 6x6 segments, +0.005 in front)
  const headWidth = 0.36;
  const headHeight = 0.34;
  const plateW = headWidth * 0.90;
  const plateH = headHeight * 0.80;
  const plateRadius = 0.162 + 0.005;
  const facePlateGeo = regGeo(createCurvedFacePlateGeo(plateW, plateH, plateRadius, 6, 6));
  const facePlateMesh = new THREE.Mesh(facePlateGeo, facePlateMat);
  facePlateMesh.position.set(0, 0.145, 0.005);
  facePlateMesh.renderOrder = 2;
  headPivot.add(facePlateMesh);

  // 7. Parted Fringe + Hair Crown + Horn-Buns -> 1 Mesh
  const hairCrownMesh = new THREE.Mesh(regGeo(createHairCrownAndFringeGeo()), hairMat);
  hairCrownMesh.position.set(0, 0.15, 0);
  headPivot.add(hairCrownMesh);

  // 8. Head Ribbons -> 1 Mesh
  const ribbonParts = [];
  for (const side of [-1, 1]) {
    ribbonParts.push(
      xform(new THREE.ConeGeometry(0.038, 0.085, 4), side * 0.13, 0.31, 0.01, 0.2, 0, side * 1.15),
      xform(new THREE.ConeGeometry(0.038, 0.085, 4), side * 0.18, 0.29, -0.01, -0.2, 0, -side * 1.25)
    );
  }
  const headRibbonsMesh = new THREE.Mesh(regGeo(mergeGeos(ribbonParts)), darkTrimMat);
  headPivot.add(headRibbonsMesh);

  // 9 & 10. Twin-Tails
  const tailPivotL = new THREE.Group();
  tailPivotL.position.set(-0.16, 0.26, -0.03);
  headPivot.add(tailPivotL);
  tailPivotL.add(new THREE.Mesh(regGeo(createTwinTailGeo(-1)), hairMat));

  const tailPivotR = new THREE.Group();
  tailPivotR.position.set(0.16, 0.26, -0.03);
  headPivot.add(tailPivotR);
  tailPivotR.add(new THREE.Mesh(regGeo(createTwinTailGeo(1)), hairMat));

  // -------------------------------------------------------------------------
  // COHESIVE 4-SEGMENT BAT/FAIRY WINGS
  // -------------------------------------------------------------------------

  const wingPivotL = new THREE.Group();
  wingPivotL.position.set(-0.06, 0.19, -0.08);
  torsoPivot.add(wingPivotL);

  const wingPivotR = new THREE.Group();
  wingPivotR.position.set(0.06, 0.19, -0.08);
  torsoPivot.add(wingPivotR);

  // 11 & 12. Left Wing Membrane + Glowing Lilac Edge Frame
  const wGeoL = createCohesiveWingGeos(-1);
  wingPivotL.add(
    new THREE.Mesh(regGeo(wGeoL.membraneGeo), wingMembraneMat),
    new THREE.Mesh(regGeo(wGeoL.edgeGeo), wingEdgeMat)
  );

  // 13 & 14. Right Wing Membrane + Glowing Lilac Edge Frame
  const wGeoR = createCohesiveWingGeos(1);
  wingPivotR.add(
    new THREE.Mesh(regGeo(wGeoR.membraneGeo), wingMembraneMat),
    new THREE.Mesh(regGeo(wGeoR.edgeGeo), wingEdgeMat)
  );

  // -------------------------------------------------------------------------
  // ARMS & LEGS (1 Mesh per limb = 4 Meshes total)
  // -------------------------------------------------------------------------

  const makeArmSingleGeo = () => {
    const sleeve = xform(new THREE.ConeGeometry(0.048, 0.15, 6), 0, -0.075, 0, 0, 0, Math.PI);
    const forearm = xform(new THREE.CylinderGeometry(0.025, 0.022, 0.14, 6), 0, -0.19, 0);
    const hand = xform(new THREE.SphereGeometry(0.028, 6, 5), 0, -0.27, 0);
    return mergeGeos([sleeve, forearm, hand]);
  };

  // 15 & 16. Left & Right Arms
  const armPivotL = new THREE.Group();
  armPivotL.position.set(-0.115, 0.22, 0);
  torsoPivot.add(armPivotL);
  armPivotL.add(new THREE.Mesh(regGeo(makeArmSingleGeo()), skinMat));

  const armPivotR = new THREE.Group();
  armPivotR.position.set(0.115, 0.22, 0);
  torsoPivot.add(armPivotR);
  armPivotR.add(new THREE.Mesh(regGeo(makeArmSingleGeo()), skinMat));

  const makeLegSingleGeo = () => {
    const thigh = xform(new THREE.CylinderGeometry(0.040, 0.032, 0.25, 6), 0, -0.14, 0);
    const boot = xform(new THREE.CylinderGeometry(0.035, 0.040, 0.22, 6), 0, -0.36, 0);
    const foot = xform(new THREE.BoxGeometry(0.068, 0.052, 0.12), 0, -0.46, 0.02);
    return mergeGeos([thigh, boot, foot]);
  };

  // 17 & 18. Left & Right Legs
  const legPivotL = new THREE.Group();
  legPivotL.position.set(-0.068, -0.06, 0);
  bodyPivot.add(legPivotL);
  legPivotL.add(new THREE.Mesh(regGeo(makeLegSingleGeo()), darkTrimMat));

  const legPivotR = new THREE.Group();
  legPivotR.position.set(0.068, -0.06, 0);
  bodyPivot.add(legPivotR);
  legPivotR.add(new THREE.Mesh(regGeo(makeLegSingleGeo()), darkTrimMat));

  // 19. Subtle Additive Lilac Aura Shell
  const auraGeo = regGeo(xform(new THREE.SphereGeometry(0.46, 10, 8), 0, 0.12, 0, 0, 0, 0, 0.85, 1.32, 0.75));
  const auraMesh = new THREE.Mesh(auraGeo, auraMat);
  auraMesh.renderOrder = 3;
  bodyPivot.add(auraMesh);

  // -------------------------------------------------------------------------
  // ANCHORS
  // -------------------------------------------------------------------------

  const anchorHead = new THREE.Object3D();
  anchorHead.position.set(0, 0.36, 0);
  headPivot.add(anchorHead);

  const anchorChest = new THREE.Object3D();
  anchorChest.position.set(0, 0.15, 0.10);
  torsoPivot.add(anchorChest);

  const anchorHandL = new THREE.Object3D();
  anchorHandL.position.set(0, -0.27, 0);
  armPivotL.add(anchorHandL);

  const anchorHandR = new THREE.Object3D();
  anchorHandR.position.set(0, -0.27, 0);
  armPivotR.add(anchorHandR);

  const anchorFeet = new THREE.Object3D();
  anchorFeet.position.set(0, 0, 0);
  root.add(anchorFeet);

  const anchors = {
    root,
    head: anchorHead,
    mouth: anchorHead,
    chest: anchorChest,
    leftHand: anchorHandL,
    rightHand: anchorHandR,
    handL: anchorHandL,
    handR: anchorHandR,
    wingTipL: wingPivotL,
    wingTipR: wingPivotR,
    wings: wingPivotL,
    aura: auraMesh,
    feet: anchorFeet,
  };

  // -------------------------------------------------------------------------
  // STATE & API METHODS
  // -------------------------------------------------------------------------

  let currentPose = options.pose || 'idle';
  let currentExpr = options.expression || 'neutral';
  let glowLevel = options.glow ?? 1;
  let currentOpacity = 1.0;
  let animTime = 0;
  let autoBlinkTimer = 0;

  function applyAuraState(pulseFactor = 1.0) {
    if (glowLevel <= 0) {
      auraMesh.visible = false;
      auraMat.opacity = 0;
      return;
    }
    auraMesh.visible = currentOpacity > 0.001;
    // Ultra-faint additive glow so it never creates a grey egg around her
    const maxCap = glowLevel >= 2 ? 0.12 : 0.06;
    const baseOp = maxCap * (0.75 + 0.25 * pulseFactor);
    auraMat.opacity = Math.min(maxCap, baseOp) * currentOpacity;
  }

  function setPose(pose, t) {
    if (ISELLE_POSES.includes(pose) && currentPose !== pose) {
      currentPose = pose;
      animTime = 0;
    }
    if (typeof t === 'number') {
      animTime = t;
    }
  }

  function setExpression(expr) {
    if (ISELLE_EXPRESSIONS.includes(expr)) {
      currentExpr = expr;
      facePlateMat.map = getFacePlateTexture(expr);
      facePlateMat.needsUpdate = true;
    }
  }

  function setGlow(level) {
    glowLevel = Math.max(0, Math.min(2, Number(level) || 0));
    wingMembraneMat.emissiveIntensity = glowLevel === 0 ? 0.25 : glowLevel === 1 ? 0.48 : 0.78;
    wingEdgeMat.color.setHex(glowLevel >= 2 ? 0xefe6ff : 0xd9c8ff);
    applyAuraState(1.0);
  }

  function setOpacity(opacity) {
    currentOpacity = Math.max(0, Math.min(1, Number(opacity) ?? 1));
    const isTranslucent = currentOpacity < 0.999;

    for (const m of matList) {
      if (m === auraMat) continue;
      if (m === facePlateMat) {
        m.transparent = true;
        m.depthWrite = false;
        m.opacity = currentOpacity;
        m.needsUpdate = true;
        continue;
      }
      m.transparent = isTranslucent;
      m.opacity = currentOpacity;
      m.depthWrite = !isTranslucent;
      m.needsUpdate = true;
    }
    facePlateMesh.visible = currentOpacity > 0.001;
    applyAuraState(1.0);
  }

  function setTint(color, amount = 1.0) {
    if (!color || amount <= 0) {
      skinMat.color.setHex(0xf6e3e6);
      hairMat.color.setHex(0xdcd4eb);
      dressMat.color.setHex(0x1c152b);
      whiteLaceMat.color.setHex(0xf7f4ff);
      wingMembraneMat.color.setHex(0x7a4fd0);
      facePlateMat.color.setHex(0xffffff);
      return;
    }
    const c = new THREE.Color(color);
    skinMat.color.setHex(0xf6e3e6).lerp(c, amount);
    hairMat.color.setHex(0xdcd4eb).lerp(c, amount);
    dressMat.color.setHex(0x1c152b).lerp(c, amount);
    whiteLaceMat.color.setHex(0xf7f4ff).lerp(c, amount);
    wingMembraneMat.color.setHex(0x7a4fd0).lerp(c, amount);
    facePlateMat.color.setHex(0xffffff).lerp(c, amount);
  }

  function resetRig() {
    bodyPivot.position.set(0, 0.56, 0);
    bodyPivot.rotation.set(0, 0, 0);
    torsoPivot.rotation.set(0, 0, 0);
    headPivot.rotation.set(0, 0, 0);
    armPivotL.rotation.set(0, 0, 0.28);
    armPivotR.rotation.set(0, 0, -0.28);
    legPivotL.rotation.set(0, 0, 0);
    legPivotR.rotation.set(0, 0, 0);
    tailPivotL.rotation.set(0, 0, 0.12);
    tailPivotR.rotation.set(0, 0, -0.12);
    wingPivotL.rotation.set(0, 0.18, 0.06);
    wingPivotR.rotation.set(0, -0.18, -0.06);
  }

  function update(dt = 0.016) {
    animTime += dt;
    autoBlinkTimer += dt;

    const pulse = 0.5 + 0.5 * Math.sin(animTime * 3.2);
    const auraScale = 1.0 + 0.03 * Math.sin(animTime * 2.6);
    auraMesh.scale.set(auraScale, auraScale, auraScale);
    applyAuraState(pulse);

    if (currentExpr === 'neutral') {
      const blinkCycle = autoBlinkTimer % 4.2;
      const shouldBlink = blinkCycle > 4.02;
      const targetTex = getFacePlateTexture(shouldBlink ? 'blink' : 'neutral');
      if (facePlateMat.map !== targetTex) {
        facePlateMat.map = targetTex;
        facePlateMat.needsUpdate = true;
      }
    }

    resetRig();
    const t = animTime;

    switch (currentPose) {
      case 'idle': {
        const w = t * (Math.PI * 2 / 2.4);
        bodyPivot.position.y = 0.56 + Math.sin(w) * 0.018;
        torsoPivot.rotation.x = Math.sin(w) * 0.03;
        headPivot.rotation.z = Math.sin(w * 0.5) * 0.04;
        armPivotL.rotation.z = 0.28 + Math.sin(w) * 0.05;
        armPivotR.rotation.z = -0.28 - Math.sin(w) * 0.05;
        tailPivotL.rotation.z = 0.12 + Math.sin(w - 0.5) * 0.06;
        tailPivotR.rotation.z = -0.12 - Math.sin(w - 0.5) * 0.06;
        const wf = Math.sin(w * 2) * 0.14;
        wingPivotL.rotation.y = 0.20 + wf;
        wingPivotR.rotation.y = -0.20 - wf;
        break;
      }

      case 'float': {
        const w = t * (Math.PI * 2 / 2.0);
        bodyPivot.position.y = 0.68 + Math.sin(w) * 0.055;
        torsoPivot.rotation.x = 0.06 + Math.sin(w) * 0.04;
        headPivot.rotation.x = -0.05;
        armPivotL.rotation.z = 0.46 + Math.sin(w) * 0.08;
        armPivotR.rotation.z = -0.46 - Math.sin(w) * 0.08;
        legPivotL.rotation.x = 0.18 + Math.sin(w) * 0.06;
        legPivotR.rotation.x = 0.28 - Math.sin(w) * 0.06;
        tailPivotL.rotation.z = 0.20 + Math.sin(w - 0.4) * 0.10;
        tailPivotR.rotation.z = -0.20 - Math.sin(w - 0.4) * 0.10;
        const flutter = Math.sin(t * 18.0) * 0.34;
        wingPivotL.rotation.y = 0.22 + flutter;
        wingPivotR.rotation.y = -0.22 - flutter;
        wingPivotL.rotation.z = 0.10 + flutter * 0.30;
        wingPivotR.rotation.z = -0.10 - flutter * 0.30;
        break;
      }

      case 'walk': {
        const w = t * (Math.PI * 2 / 1.0);
        bodyPivot.position.y = 0.56 + Math.abs(Math.sin(w)) * 0.032;
        torsoPivot.rotation.x = 0.07;
        torsoPivot.rotation.y = Math.sin(w) * 0.08;
        legPivotL.rotation.x = Math.sin(w) * 0.48;
        legPivotR.rotation.x = -Math.sin(w) * 0.48;
        armPivotL.rotation.x = -Math.sin(w) * 0.36;
        armPivotR.rotation.x = Math.sin(w) * 0.36;
        tailPivotL.rotation.x = 0.12 + Math.abs(Math.cos(w)) * 0.12;
        tailPivotR.rotation.x = 0.12 + Math.abs(Math.cos(w)) * 0.12;
        const wf = Math.sin(w * 2) * 0.18;
        wingPivotL.rotation.y = 0.22 + wf;
        wingPivotR.rotation.y = -0.22 - wf;
        break;
      }

      case 'fly': {
        const w = t * (Math.PI * 2 / 0.8);
        bodyPivot.position.y = 0.74 + Math.sin(w) * 0.065;
        torsoPivot.rotation.x = 0.28;
        headPivot.rotation.x = -0.22;
        armPivotL.rotation.x = 0.25;
        armPivotR.rotation.x = 0.25;
        armPivotL.rotation.z = 0.52;
        armPivotR.rotation.z = -0.52;
        legPivotL.rotation.x = 0.35 + Math.sin(w) * 0.08;
        legPivotR.rotation.x = 0.42 - Math.sin(w) * 0.08;
        tailPivotL.rotation.x = 0.35 + Math.sin(w) * 0.12;
        tailPivotR.rotation.x = 0.35 + Math.sin(w) * 0.12;
        const flap = Math.sin(w) * 0.68;
        wingPivotL.rotation.y = 0.18 + flap;
        wingPivotR.rotation.y = -0.18 - flap;
        wingPivotL.rotation.z = 0.16 + flap * 0.40;
        wingPivotR.rotation.z = -0.16 - flap * 0.40;
        break;
      }

      case 'cast': {
        const p = Math.min(1, t / POSE_INFO.cast.duration);
        const lift = Math.sin(p * Math.PI);
        bodyPivot.position.y = 0.56 + lift * 0.16;
        torsoPivot.rotation.x = -lift * 0.14;
        headPivot.rotation.x = -lift * 0.12;
        armPivotL.rotation.x = -lift * 1.35;
        armPivotR.rotation.x = -lift * 1.35;
        armPivotL.rotation.z = 0.35 + lift * 0.35;
        armPivotR.rotation.z = -0.35 - lift * 0.35;
        const flare = Math.sin(t * 20) * 0.25 + lift * 0.45;
        wingPivotL.rotation.y = 0.1 + flare;
        wingPivotR.rotation.y = -0.1 - flare;
        wingPivotL.rotation.z = 0.22 * lift;
        wingPivotR.rotation.z = -0.22 * lift;
        break;
      }

      case 'hit': {
        const p = Math.min(1, t / POSE_INFO.hit.duration);
        const recoil = Math.sin(p * Math.PI);
        bodyPivot.position.z = -recoil * 0.08;
        torsoPivot.rotation.x = -recoil * 0.28;
        headPivot.rotation.x = -recoil * 0.25;
        armPivotL.rotation.z = 0.65 * recoil + 0.28;
        armPivotR.rotation.z = -0.65 * recoil - 0.28;
        wingPivotL.rotation.y = 0.55 * recoil;
        wingPivotR.rotation.y = -0.55 * recoil;
        break;
      }

      case 'ko': {
        const p = Math.min(1, t / POSE_INFO.ko.duration);
        const e = 1 - Math.pow(1 - p, 3);
        bodyPivot.position.y = 0.56 - e * 0.42;
        bodyPivot.rotation.x = -e * 1.42;
        armPivotL.rotation.z = 0.28 + e * 0.55;
        armPivotR.rotation.z = -0.28 - e * 0.55;
        wingPivotL.rotation.y = 0.65 * e;
        wingPivotR.rotation.y = -0.65 * e;
        break;
      }

      case 'victory': {
        const w = t * (Math.PI * 2 / 1.6);
        bodyPivot.position.y = 0.62 + Math.abs(Math.sin(w)) * 0.06;
        headPivot.rotation.z = Math.sin(w) * 0.08;
        armPivotR.rotation.x = -2.45;
        armPivotR.rotation.z = -0.22 + Math.sin(w) * 0.12;
        armPivotL.rotation.z = 0.45;
        legPivotL.rotation.x = 0.15;
        legPivotR.rotation.x = -0.10;
        const wf = Math.sin(w * 2) * 0.32;
        wingPivotL.rotation.y = 0.15 + wf;
        wingPivotR.rotation.y = -0.15 - wf;
        break;
      }
    }
  }

  function getBounds() {
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    return { box, size, center, min: box.min, max: box.max };
  }

  function dispose() {
    for (const item of disposables) {
      if (item && typeof item.dispose === 'function') {
        item.dispose();
      }
    }
  }

  setExpression(currentExpr);
  setGlow(glowLevel);
  update(0);

  return {
    root,
    group: root,
    parts: {
      root,
      body: bodyPivot,
      torso: torsoPivot,
      head: headPivot,
      tailL: tailPivotL,
      tailR: tailPivotR,
      armL: armPivotL,
      armR: armPivotR,
      legL: legPivotL,
      legR: legPivotR,
      wingL: wingPivotL,
      wingR: wingPivotR,
      dress: dressMesh,
      facePlate: facePlateMesh,
    },
    anchors,
    setPose,
    setExpression,
    setGlow,
    setOpacity,
    setTint,
    update,
    getBounds,
    dispose,
  };
}
