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

export function drawIselleFace(ctx, expression = 'neutral', size = 256) {
  const expr = ISELLE_EXPRESSIONS.includes(expression) ? expression : 'neutral';
  const s = size / 256;
  ctx.save();
  ctx.scale(s, s);

  const cx = 128;
  const cy = 132;
  const eyeSpanX = 48;
  const eyeW = 58;
  const eyeH = 56;

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

    ctx.fillStyle = '#fffafb';
    ctx.beginPath();
    ctx.ellipse(0, 2, eyeW * 0.50, eyeH * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

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

    ctx.fillStyle = '#1f0514';
    ctx.beginPath();
    ctx.ellipse(0, 3, irisR * 0.40, irisR * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 160, 190, 0.58)';
    ctx.beginPath();
    ctx.ellipse(0, irisR * 0.48, irisR * 0.52, irisR * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-side * irisR * 0.35, -irisR * 0.34, irisR * 0.29, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(side * irisR * 0.34, irisR * 0.36, irisR * 0.14, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(45, 20, 55, 0.38)';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.arc(0, -4, eyeW * 0.46, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    ctx.strokeStyle = '#1b0d24';
    ctx.fillStyle = '#1b0d24';
    ctx.lineWidth = 8.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 3, eyeW * 0.49, Math.PI * 1.06, Math.PI * 1.94);
    ctx.stroke();

    ctx.lineWidth = 5.2;
    ctx.beginPath();
    ctx.moveTo(side * eyeW * 0.42, -8);
    ctx.lineTo(side * eyeW * 0.60, -18);
    ctx.moveTo(side * eyeW * 0.46, 0);
    ctx.lineTo(side * eyeW * 0.62, -4);
    ctx.stroke();

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

  ctx.fillStyle = 'rgba(175, 115, 132, 0.75)';
  ctx.beginPath();
  ctx.arc(cx, cy + 20, 2.6, 0, Math.PI * 2);
  ctx.fill();

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

  const bg = ctx.createRadialGradient(128, 120, 20, 128, 128, 136);
  bg.addColorStop(0, glow > 0 ? '#3a245e' : '#251a38');
  bg.addColorStop(0.65, '#171026');
  bg.addColorStop(1, '#0c0814');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);

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

  ctx.beginPath();
  ctx.arc(128, 102, 74, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

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

  ctx.fillStyle = '#f8f5ff';
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(128 + i * 16, 198 + Math.abs(i) * 2, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

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

  ctx.save();
  ctx.translate(128, 118);
  ctx.scale(0.62, 0.62);
  ctx.translate(-128, -132);
  drawIselleFace(ctx, expression, 256);
  ctx.restore();

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

const FACE_TEX_CACHE = new Map();

export function getFacePlateTexture(expression) {
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