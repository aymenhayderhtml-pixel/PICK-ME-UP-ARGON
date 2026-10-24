import * as THREE from 'three';
import { PALETTE } from './shellConfig.js';

const _vineColorTemp = new THREE.Color();

export function createRng(seed = 1337) {
  let s = (seed >>> 0) || 1337;
  return function rand() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2D(x, z, seed = 1337) {
  const n = Math.sin(x * 127.1 + z * 311.7 + seed * 0.13) * 43758.5453123;
  return n - Math.floor(n);
}

export function valueNoise2D(x, z, seed = 1337) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = hash2D(ix, iz, seed);
  const b = hash2D(ix + 1, iz, seed);
  const c = hash2D(ix, iz + 1, seed);
  const d = hash2D(ix + 1, iz + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm2D(x, z, seed = 1337, octaves = 3) {
  let value = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    value += amp * valueNoise2D(x * freq, z * freq, seed + i * 19);
    freq *= 2.02;
    amp *= 0.5;
  }
  return value;
}

export function createToonGradientTexture() {
  const data = new Uint8Array([
    132, 132, 132, 255,
    178, 178, 178, 255,
    222, 222, 222, 255,
    255, 255, 255, 255
  ]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export function createStoneCanvasTexture(seed) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rng = createRng(seed + 101);

  ctx.fillStyle = '#e6eaec';
  ctx.fillRect(0, 0, 512, 512);

  const rowY = [0, 56, 124, 184, 256, 316, 388, 448, 512];
  const rows = rowY.length - 1;

  for (let r = 0; r < rows; r++) {
    const y0 = rowY[r];
    const h = rowY[r + 1] - y0;
    const cols = 4 + (r % 3);
    const baseW = 512 / cols;
    const rowShift = Math.floor(hash2D(r, 9, seed + 3) * baseW);

    const jointsX = [0];
    for (let c = 1; c < cols; c++) {
      const jitter = Math.floor((hash2D(c, r, seed + 11) - 0.5) * (baseW * 0.28));
      const jx = Math.max(jointsX[jointsX.length - 1] + 28, Math.min(484, Math.floor(c * baseW + jitter)));
      jointsX.push(jx);
    }
    jointsX.push(512);

    for (let c = 0; c < jointsX.length - 1; c++) {
      const xStart = jointsX[c];
      const w = jointsX[c + 1] - xStart;

      const toneBase = 212 + Math.floor((hash2D(c + 13, r, seed + 7) - 0.5) * 42);
      const warmShift = Math.floor((hash2D(c, r + 23, seed + 19) - 0.42) * 14);
      const cr = Math.min(252, Math.max(176, toneBase + warmShift));
      const cg = Math.min(253, Math.max(180, toneBase + 2));
      const cb = Math.min(255, Math.max(182, toneBase + 3 - Math.floor(warmShift * 0.5)));

      for (const wrapOffset of [-512, 0, 512]) {
        const bx = xStart + rowShift + wrapOffset;
        if (bx + w < 0 || bx > 512) continue;

        ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
        ctx.fillRect(bx, y0, w, h);

        const cx = bx + w * 0.5;
        const cy = y0 + h * 0.5;
        const rad = Math.max(w, h) * 0.55;
        const grad = ctx.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
        grad.addColorStop(1, 'rgba(58, 66, 70, 0.18)');
        ctx.fillStyle = grad;
        ctx.fillRect(bx + 2, y0 + 2, w - 4, h - 4);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(bx + 2, y0 + h - 2);
        ctx.lineTo(bx + 2, y0 + 2);
        ctx.lineTo(bx + w - 2, y0 + 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(42, 50, 54, 0.84)';
        ctx.lineWidth = 2.4;
        ctx.strokeRect(bx + 0.5, y0 + 0.5, w - 1.0, h - 1.0);
      }
    }
  }

  for (let i = 0; i < 1600; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const rad = 1.2 + rng() * 7.5;
    ctx.fillStyle = rng() > 0.48 ? 'rgba(72, 80, 84, 0.07)' : 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(44, 52, 56, 0.58)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 28; i++) {
    let cx = rng() * 512;
    let cy = rng() * 512;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 3; s++) {
      cx += (rng() - 0.5) * 16;
      cy += (rng() - 0.2) * 14;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSoftCloudCanvasTexture(seed) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(512, 512);
  const data = imgData.data;

  for (let y = 0; y < 512; y++) {
    const ny = (y / 512) * 2.0 - 1.0;
    for (let x = 0; x < 512; x++) {
      const nx = (x / 512) * 2.0 - 1.0;
      const r = Math.hypot(nx, ny);
      const radialMask = Math.max(0, 1.0 - Math.pow(r, 1.65));

      const n1 = fbm2D(nx * 2.8 + 3.1, ny * 2.8 + 5.4, seed + 31, 4);
      const n2 = fbm2D(nx * 5.6 - 1.7, ny * 5.6 + 2.2, seed + 67, 3);
      const wisp = Math.max(0, Math.min(1, (n1 * 0.68 + n2 * 0.32 - 0.26) * 1.45));
      const alpha = Math.pow(wisp * radialMask, 1.25);

      const lum = Math.min(255, Math.floor((0.82 + wisp * 0.18) * 255));
      const idx = (y * 512 + x) * 4;
      data[idx] = lum;
      data[idx + 1] = lum;
      data[idx + 2] = lum;
      data[idx + 3] = Math.min(255, Math.floor(alpha * 255));
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export function ensureNonIndexedColoredGeometry(geom, baseColorHex, colorFn) {
  const nonIndexed = geom.index ? geom.toNonIndexed() : geom.clone();
  if (geom !== nonIndexed) geom.dispose();

  if (!nonIndexed.attributes.normal) {
    nonIndexed.computeVertexNormals();
  }

  const pos = nonIndexed.attributes.position;
  const norm = nonIndexed.attributes.normal;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color(baseColorHex);
  const tempColor = new THREE.Color();
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    v.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(norm, i);
    tempColor.copy(c);
    if (colorFn) {
      colorFn(tempColor, v, n, i);
    }
    colors[i * 3] = tempColor.r;
    colors[i * 3 + 1] = tempColor.g;
    colors[i * 3 + 2] = tempColor.b;
  }

  nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  if (!nonIndexed.attributes.uv) {
    const uvs = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(pos, i);
      n.fromBufferAttribute(norm, i);
      if (Math.abs(n.y) > 0.7) {
        uvs[i * 2] = v.x * 0.22;
        uvs[i * 2 + 1] = v.z * 0.22;
      } else {
        uvs[i * 2] = (v.x + v.z) * 0.22;
        uvs[i * 2 + 1] = v.y * 0.22;
      }
    }
    nonIndexed.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }

  return nonIndexed;
}

export function getQuadrantIndex(x, z) {
  if (x >= 0 && z < 0) return 0;
  if (x < 0 && z < 0) return 1;
  if (x < 0 && z >= 0) return 2;
  return 3;
}

export function getDodecagonSignedDistance(x, z, apothem) {
  let maxProj = -Infinity;
  for (let k = 0; k < 12; k++) {
    const theta = (k + 0.5) * (Math.PI / 6);
    const proj = x * Math.cos(theta) + z * Math.sin(theta);
    if (proj > maxProj) maxProj = proj;
  }
  return maxProj - apothem;
}

export function createTaperedVineGeometry(startPos, outDir, width, length, segsY, vineSeed) {
  const clampedW = Math.min(0.40, Math.max(0.15, width));
  const clampedL = Math.min(8.0, Math.max(2.0, length));
  const geom = new THREE.PlaneGeometry(clampedW, clampedL, 1, segsY);
  const pos = geom.attributes.position;
  const cDark = new THREE.Color(PALETTE.mossDark).multiplyScalar(0.82);
  const cTip = new THREE.Color(PALETTE.mossLight);
  const colors = new Float32Array(pos.count * 3);

  const forward = new THREE.Vector3(outDir?.x || 0, 0, outDir?.z || 0);
  if (forward.lengthSq() < 0.001) forward.set(0, 0, 1);
  else forward.normalize();
  const right = new THREE.Vector3(-forward.z, 0, forward.x);

  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const ly = pos.getY(i);
    const frac = Math.max(0, Math.min(1, 0.5 - ly / clampedL));

    const halfSpan = lx * (1.0 - Math.pow(frac, 0.85) * 0.90);
    const swaySide = Math.sin(frac * Math.PI * 2.1 + vineSeed) * 0.22 * frac;
    const curveOut = -0.32 * (1.0 - Math.min(1, frac * 2.5)) + Math.sin(frac * Math.PI * 0.9) * 0.35;

    const wx = startPos.x + right.x * (halfSpan + swaySide) + forward.x * curveOut;
    const wy = startPos.y - frac * clampedL;
    const wz = startPos.z + right.z * (halfSpan + swaySide) + forward.z * curveOut;
    pos.setXYZ(i, wx, wy, wz);

    _vineColorTemp.copy(cDark).lerp(cTip, Math.pow(frac, 0.9));
    colors[i * 3] = _vineColorTemp.r;
    colors[i * 3 + 1] = _vineColorTemp.g;
    colors[i * 3 + 2] = _vineColorTemp.b;
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const nonIdx = geom.index ? geom.toNonIndexed() : geom;
  if (nonIdx !== geom) geom.dispose();
  nonIdx.computeVertexNormals();
  return nonIdx;
}

export function createShellMaterials(seed) {
  const toonGradTex = createToonGradientTexture();
  const stoneTex = createStoneCanvasTexture(seed);
  const cloudTex = createSoftCloudCanvasTexture(seed);

  const stoneMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    map: stoneTex,
    gradientMap: toonGradTex,
    vertexColors: true
  });

  const terrainMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    map: stoneTex,
    gradientMap: toonGradTex,
    vertexColors: true
  });

  const undersideMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    gradientMap: toonGradTex,
    vertexColors: true
  });

  const foliageMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    gradientMap: toonGradTex,
    vertexColors: true,
    emissive: new THREE.Color(0x16444a),
    emissiveIntensity: 0.16,
    side: THREE.DoubleSide
  });

  const trimEmissiveMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    gradientMap: toonGradTex,
    vertexColors: true
  });

  const skyMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false
  });

  const celestialDiscMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: false
  });

  const cloudSheetMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: cloudTex,
    alphaMap: cloudTex,
    transparent: true,
    opacity: 0.28,
    blending: THREE.NormalBlending,
    vertexColors: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false
  });

  const leafMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
    fog: false
  });

  const glintPointMat = new THREE.PointsMaterial({
    size: 0.28,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });

  const sharedMaterials = [
    stoneMat,
    terrainMat,
    undersideMat,
    foliageMat,
    trimEmissiveMat,
    skyMat,
    celestialDiscMat,
    cloudSheetMat,
    leafMat,
    glintPointMat
  ];

  const sharedTextures = [toonGradTex, stoneTex, cloudTex];

  return {
    stoneMat,
    terrainMat,
    undersideMat,
    foliageMat,
    trimEmissiveMat,
    skyMat,
    celestialDiscMat,
    cloudSheetMat,
    leafMat,
    glintPointMat,
    sharedMaterials,
    sharedTextures
  };
}