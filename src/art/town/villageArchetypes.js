import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function paintVertexColors(geom, baseHex, topHex, bottomHex, aoBottom = 0.68) {
  const g = geom.index ? geom.toNonIndexed() : geom.clone();
  g.computeVertexNormals();
  g.computeBoundingBox();
  const pos = g.attributes.position;
  const norm = g.attributes.normal;
  const minY = g.boundingBox ? g.boundingBox.min.y : 0;
  const maxY = g.boundingBox ? Math.max(minY + 0.001, g.boundingBox.max.y) : 1;
  const spanY = maxY - minY;

  const cBase = new THREE.Color(baseHex);
  const cTop = new THREE.Color(topHex !== undefined ? topHex : baseHex);
  const cBot = new THREE.Color(bottomHex !== undefined ? bottomHex : baseHex);
  const cWork = new THREE.Color();

  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const ny = norm ? norm.getY(i) : 0;
    const ty = Math.max(0, Math.min(1, (y - minY) / spanY));
    cWork.copy(cBot).lerp(cBase, Math.min(1, ty * 1.6)).lerp(cTop, Math.max(0, (ty - 0.4) / 0.6));
    const shade = (0.88 + 0.12 * Math.max(-0.5, ny)) * (aoBottom + (1 - aoBottom) * Math.pow(ty, 0.65));
    colors[i * 3] = Math.min(1, cWork.r * shade);
    colors[i * 3 + 1] = Math.min(1, cWork.g * shade);
    colors[i * 3 + 2] = Math.min(1, cWork.b * shade);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  delete g.attributes.uv;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    const nx = norm ? Math.abs(norm.getX(i)) : 0;
    const ny = norm ? Math.abs(norm.getY(i)) : 1;
    if (ny > 0.6) {
      uv[i * 2] = px * 0.35;
      uv[i * 2 + 1] = pz * 0.35;
    } else if (nx > 0.5) {
      uv[i * 2] = pz * 0.4;
      uv[i * 2 + 1] = py * 0.4;
    } else {
      uv[i * 2] = px * 0.4;
      uv[i * 2 + 1] = py * 0.4;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

export function makePart(geom, x, y, z, rx, ry, rz, sx, sy, sz, cBase, cTop, cBot, ao = 0.72) {
  const g = paintVertexColors(geom, cBase, cTop, cBot, ao);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0));
  m.compose(new THREE.Vector3(x || 0, y || 0, z || 0), q, new THREE.Vector3(sx || 1, sy || 1, sz || 1));
  g.applyMatrix4(m);
  return g;
}

export function createGablePrism(width, height, depth) {
  const hw = width * 0.5;
  const hd = depth * 0.5;
  const positions = new Float32Array([
    -hw, 0, hd,   hw, 0, hd,   0, height, hd,
    hw, 0, -hd,  -hw, 0, -hd,  0, height, -hd,
    -hw, 0, -hd, -hw, 0, hd,   0, height, hd,
    -hw, 0, -hd,  0, height, hd, 0, height, -hd,
    hw, 0, hd,    hw, 0, -hd,  0, height, -hd,
    hw, 0, hd,    0, height, -hd, 0, height, hd,
    -hw, 0, -hd,  hw, 0, -hd,  hw, 0, hd,
    -hw, 0, -hd,  hw, 0, hd,  -hw, 0, hd
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

export function createStonePlasterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rng = mulberry32(90125);

  ctx.fillStyle = '#d8dedc';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4500; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const w = 2 + rng() * 14;
    const h = 2 + rng() * 10;
    const v = Math.floor(200 + (rng() - 0.5) * 42);
    ctx.fillStyle = `rgb(${v},${v + 3},${v + 4})`;
    ctx.fillRect(x, y, w, h);
  }

  ctx.strokeStyle = 'rgba(92, 107, 115, 0.24)';
  ctx.lineWidth = 2;
  const rows = 8;
  const rowH = 512 / rows;
  for (let r = 0; r < rows; r++) {
    const y = Math.floor(r * rowH);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
    const cols = 4 + (r % 2);
    const colW = 512 / cols;
    const offset = (r % 2) * (colW * 0.5);
    for (let c = 0; c < cols; c++) {
      const x = Math.floor((c * colW + offset) % 512);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowH);
      ctx.stroke();
    }
  }

  for (let i = 0; i < 180; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const rad = 4 + rng() * 16;
    ctx.fillStyle = 'rgba(95, 138, 74, 0.08)';
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function createFoliageBarkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rng = mulberry32(44187);

  ctx.fillStyle = '#c8d2c6';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 3600; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const r = 3 + rng() * 11;
    const v = Math.floor(175 + (rng() - 0.45) * 65);
    ctx.fillStyle = `rgba(${v - 6}, ${v + 8}, ${v - 4}, 0.35)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 400; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    ctx.fillStyle = 'rgba(65, 80, 70, 0.14)';
    ctx.fillRect(x, y, 2 + rng() * 4, 18 + rng() * 34);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function buildCottageArchetypes(PAL) {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 6);
  const gable = createGablePrism(4.2, 1.9, 3.6);
  const variants = [];

  for (let v = 0; v < 4; v++) {
    const opaqueParts = [];
    const winParts = [];
    const lampParts = [];

    opaqueParts.push(
      makePart(box, 0, 0.08, 0, 0, 0, 0, 4.36, 0.86, 3.76, PAL.stoneMid, PAL.stoneLit, PAL.stoneCrevice, 0.62)
    );
    opaqueParts.push(
      makePart(box, 0, 0.04, 1.86, 0, 0, 0, 4.4, 0.14, 0.12, PAL.moss, PAL.mossLight, PAL.mossDark, 0.7),
      makePart(box, 0, 0.04, -1.86, 0, 0, 0, 4.4, 0.14, 0.12, PAL.moss, PAL.mossLight, PAL.mossDark, 0.7)
    );

    opaqueParts.push(
      makePart(box, 0, 1.82, 0, 0, 0, 0, 4.16, 2.74, 3.56, PAL.plaster, 0xeef2ee, 0xb8c2c0, 0.76)
    );

    opaqueParts.push(
      makePart(gable, 0, 3.18, 0, 0, 0, 0, 0.99, 1.0, 0.99, PAL.plaster, 0xeef2ee, 0xc2cbc9, 0.82)
    );

    const tCol = PAL.timber;
    const tTop = 0x3d3632;
    const tBot = 0x1c1816;
    for (const sx of [-2.06, 2.06]) {
      for (const sz of [-1.76, 1.76]) {
        opaqueParts.push(makePart(box, sx, 1.82, sz, 0, 0, 0, 0.16, 2.78, 0.16, tCol, tTop, tBot, 0.75));
      }
    }
    for (const yBand of [0.52, 1.78, 3.12]) {
      opaqueParts.push(makePart(box, 0, yBand, 0, 0, 0, 0, 4.28, 0.13, 3.68, tCol, tTop, tBot, 0.78));
    }
    for (const sx of [-0.95, 0.35, 1.25]) {
      opaqueParts.push(makePart(box, sx, 1.82, 1.77, 0, 0, 0, 0.11, 2.72, 0.08, tCol, tTop, tBot, 0.78));
      opaqueParts.push(makePart(box, -sx, 1.82, -1.77, 0, 0, 0, 0.11, 2.72, 0.08, tCol, tTop, tBot, 0.78));
    }
    for (const sz of [-0.75, 0.75]) {
      opaqueParts.push(makePart(box, -2.07, 1.82, sz, 0, 0, 0, 0.08, 2.72, 0.11, tCol, tTop, tBot, 0.78));
      opaqueParts.push(makePart(box, 2.07, 1.82, sz, 0, 0, 0, 0.08, 2.72, 0.11, tCol, tTop, tBot, 0.78));
    }
    opaqueParts.push(
      makePart(box, 1.62, 2.45, 1.78, 0, 0, 0.62, 0.09, 1.42, 0.07, tCol, tTop, tBot, 0.8),
      makePart(box, -1.52, 2.45, 1.78, 0, 0, -0.62, 0.09, 1.42, 0.07, tCol, tTop, tBot, 0.8),
      makePart(box, 1.52, 2.45, -1.78, 0, 0, -0.62, 0.09, 1.42, 0.07, tCol, tTop, tBot, 0.8),
      makePart(box, -1.52, 2.45, -1.78, 0, 0, 0.62, 0.09, 1.42, 0.07, tCol, tTop, tBot, 0.8),
      makePart(box, 0, 4.05, 1.78, 0, 0, 0, 0.12, 1.7, 0.08, tCol, tTop, tBot, 0.82),
      makePart(box, 0, 4.05, -1.78, 0, 0, 0, 0.12, 1.7, 0.08, tCol, tTop, tBot, 0.82)
    );

    const roofAngle = Math.atan2(1.95, 2.25);
    const slopeLen = Math.hypot(2.48, 2.08);
    opaqueParts.push(
      makePart(box, -1.16, 4.12, 0, 0, 0, roofAngle, slopeLen, 0.18, 4.12, PAL.slate, 0x677582, 0x333c44, 0.78),
      makePart(box, 1.16, 4.12, 0, 0, 0, -roofAngle, slopeLen, 0.18, 4.12, PAL.slate, 0x677582, 0x333c44, 0.78),
      makePart(box, 0, 5.12, 0, 0, 0, 0, 0.28, 0.22, 4.22, PAL.stoneMid, PAL.stoneLit, PAL.stoneShade, 0.85),
      makePart(box, -2.18, 3.22, 0.4, 0, 0, roofAngle, 0.35, 0.08, 1.8, PAL.moss, PAL.mossLight, PAL.mossDark, 0.8),
      makePart(box, 2.18, 3.22, -0.5, 0, 0, -roofAngle, 0.35, 0.08, 1.6, PAL.moss, PAL.mossLight, PAL.mossDark, 0.8)
    );

    const chimX = v % 2 === 0 ? 1.35 : -1.35;
    const chimZ = v < 2 ? -0.65 : 0.45;
    opaqueParts.push(
      makePart(box, chimX, 4.45, chimZ, 0, 0, 0, 0.68, 2.3, 0.68, PAL.stoneMid, PAL.stoneLit, PAL.stoneCrevice, 0.75),
      makePart(box, chimX, 5.62, chimZ, 0, 0, 0, 0.82, 0.18, 0.82, PAL.stoneLit, 0xd8e0e4, PAL.stoneShade, 0.85),
      makePart(cyl, chimX, 5.82, chimZ, 0, 0, 0, 0.18, 0.28, 0.18, PAL.stoneCrevice, PAL.stoneShade, PAL.iron, 0.8)
    );

    opaqueParts.push(
      makePart(box, -0.8, 0.10, 2.06, 0, 0, 0, 1.64, 0.20, 0.56, PAL.stoneLit, 0xdce2e6, PAL.stoneCrevice, 0.72),
      makePart(box, -0.8, 0.28, 1.92, 0, 0, 0, 1.52, 0.18, 0.34, PAL.stoneMid, PAL.stoneLit, PAL.stoneCrevice, 0.75),
      makePart(box, -0.8, 1.38, 1.78, 0, 0, 0, 1.48, 2.26, 0.18, PAL.stoneShade, PAL.stoneLit, PAL.stoneCrevice, 0.75),
      makePart(box, -0.8, 1.36, 1.83, 0, 0, 0, 1.28, 2.12, 0.12, PAL.wood, 0x825c3a, 0x45301d, 0.76),
      makePart(box, -0.8, 1.85, 1.88, 0, 0, 0, 1.16, 0.07, 0.04, PAL.iron, PAL.stoneShade, PAL.iron, 0.8),
      makePart(box, -0.8, 0.90, 1.88, 0, 0, 0, 1.16, 0.07, 0.04, PAL.iron, PAL.stoneShade, PAL.iron, 0.8),
      makePart(box, -0.35, 1.32, 1.90, 0, 0, 0, 0.10, 0.18, 0.06, PAL.gold, PAL.warmWindow, PAL.wood, 0.85)
    );

    const winSpecs = [
      { x: 0.95, y: 1.62, z: 1.79, w: 0.96, h: 1.02, rotY: 0, planter: true },
      { x: 0.0, y: 3.82, z: 1.78, w: 0.62, h: 0.68, rotY: 0, planter: false },
      { x: -2.09, y: 1.65, z: 0.0, w: 0.88, h: 0.92, rotY: -Math.PI / 2, planter: true },
      { x: 2.09, y: 1.65, z: -0.2, w: 0.88, h: 0.92, rotY: Math.PI / 2, planter: false },
      { x: 0.5, y: 1.65, z: -1.79, w: 0.92, h: 0.95, rotY: Math.PI, planter: false }
    ];
    for (const ws of winSpecs) {
      const isZ = Math.abs(Math.cos(ws.rotY)) > 0.5;
      const sx = isZ ? ws.w : 0.14;
      const sz = isZ ? 0.14 : ws.w;
      opaqueParts.push(
        makePart(box, ws.x, ws.y, ws.z, 0, 0, 0, sx + 0.12, ws.h + 0.12, sz + 0.12, tCol, tTop, tBot, 0.78),
        makePart(box, ws.x, ws.y, ws.z, 0, 0, 0, isZ ? 0.06 : sx + 0.15, ws.h + 0.04, isZ ? sz + 0.15 : 0.06, tCol, tTop, tBot, 0.8),
        makePart(box, ws.x, ws.y, ws.z, 0, 0, 0, sx + 0.15, 0.06, sz + 0.15, tCol, tTop, tBot, 0.8)
      );
      winParts.push(
        makePart(box, ws.x, ws.y, ws.z, 0, 0, 0, isZ ? ws.w : 0.09, ws.h, isZ ? 0.09 : ws.w, 0xffffff, 0xffffff, 0xe8d8c0, 0.95)
      );
      if (ws.planter) {
        const px = ws.x + Math.sin(ws.rotY) * 0.18;
        const pz = ws.z + Math.cos(ws.rotY) * 0.18;
        opaqueParts.push(
          makePart(box, px, ws.y - ws.h * 0.5 - 0.14, pz, 0, 0, 0, isZ ? ws.w + 0.16 : 0.34, 0.24, isZ ? 0.34 : ws.w + 0.16, PAL.wood, 0x7c5836, 0x3d2a18, 0.75),
          makePart(box, px, ws.y - ws.h * 0.5 + 0.02, pz, 0, 0, 0, isZ ? ws.w + 0.06 : 0.24, 0.16, isZ ? 0.24 : ws.w + 0.06, PAL.mossLight, 0x94c478, PAL.mossDark, 0.85)
        );
      }
    }

    opaqueParts.push(
      makePart(box, -1.58, 2.18, 1.92, 0, 0, 0, 0.08, 0.08, 0.32, PAL.iron, PAL.stoneShade, PAL.iron, 0.8),
      makePart(box, -1.58, 2.12, 2.04, 0, 0, 0, 0.24, 0.07, 0.24, PAL.iron, PAL.stoneShade, PAL.iron, 0.8),
      makePart(box, -1.58, 1.84, 2.04, 0, 0, 0, 0.18, 0.06, 0.18, PAL.iron, PAL.stoneShade, PAL.iron, 0.8)
    );
    lampParts.push(
      makePart(box, -1.58, 1.98, 2.04, 0, 0, 0, 0.16, 0.22, 0.16, 0xffffff, 0xffffff, 0xffe0b0, 0.98)
    );

    if (v === 0) {
      opaqueParts.push(
        makePart(box, -0.8, 2.68, 2.25, 0.25, 0, 0, 1.95, 0.14, 0.98, PAL.slate, 0x677582, 0x333c44, 0.8),
        makePart(box, -1.62, 1.42, 2.58, 0, 0, 0, 0.12, 2.35, 0.12, tCol, tTop, tBot, 0.75),
        makePart(box, 0.02, 1.42, 2.58, 0, 0, 0, 0.12, 2.35, 0.12, tCol, tTop, tBot, 0.75)
      );
    } else if (v === 1) {
      opaqueParts.push(
        makePart(box, 2.52, 1.05, -0.2, 0, 0, 0, 0.92, 1.85, 2.2, PAL.wood, 0x7c5836, 0x3d2a18, 0.72),
        makePart(box, 2.56, 2.08, -0.2, 0, 0, -0.38, 1.18, 0.14, 2.4, PAL.slate, 0x677582, 0x333c44, 0.8)
      );
    } else if (v === 2) {
      opaqueParts.push(
        makePart(box, 2.38, 0.95, 0.3, 0, 0, -0.25, 0.72, 0.10, 1.9, PAL.slate, 0x677582, 0x333c44, 0.8),
        makePart(box, 2.32, 0.45, 0.3, 0, 0, 0, 0.52, 0.78, 1.65, PAL.wood, 0x8a6440, 0x3b2816, 0.68),
        makePart(cyl, 1.92, 0.48, 1.98, 0, 0, 0, 0.32, 0.78, 0.32, PAL.wood, 0x7c5836, 0x3d2a18, 0.72)
      );
    } else {
      opaqueParts.push(
        makePart(box, 0.95, 1.38, 1.96, 0, 0, 0, 1.28, 2.25, 0.42, PAL.plaster, 0xeef2ee, PAL.stoneMid, 0.76),
        makePart(box, 0.95, 2.58, 2.02, 0.32, 0, 0, 1.42, 0.14, 0.56, PAL.slate, 0x677582, 0x333c44, 0.82),
        makePart(box, -2.22, 1.1, -0.9, 0, 0, 0, 0.38, 1.9, 0.65, PAL.stoneMid, PAL.stoneLit, PAL.stoneCrevice, 0.72)
      );
    }

    variants.push({
      opaque: mergeGeometries(opaqueParts, false),
      windows: mergeGeometries(winParts, false),
      lantern: mergeGeometries(lampParts, false)
    });
  }

  const lodOpaque = mergeGeometries([
    makePart(box, 0, 1.65, 0, 0, 0, 0, 4.2, 3.1, 3.6, PAL.plaster, 0xeef2ee, PAL.stoneShade, 0.72),
    makePart(gable, 0, 3.18, 0, 0, 0, 0, 1.0, 1.0, 1.0, PAL.plaster, 0xeef2ee, PAL.stoneShade, 0.8),
    makePart(box, -1.16, 4.12, 0, 0, 0, Math.atan2(1.95, 2.25), 3.22, 0.18, 4.1, PAL.slate, 0x677582, 0x333c44, 0.8),
    makePart(box, 1.16, 4.12, 0, 0, 0, -Math.atan2(1.95, 2.25), 3.22, 0.18, 4.1, PAL.slate, 0x677582, 0x333c44, 0.8)
  ], false);
  const lodWin = makePart(box, 0.95, 1.62, 1.80, 0, 0, 0, 0.94, 0.98, 0.1, 0xffffff, 0xffffff, 0xe8d8c0, 0.95);

  box.dispose();
  cyl.dispose();
  gable.dispose();

  return { variants, lodOpaque, lodWin };
}

export function buildTreeArchetypes(PAL) {
  const trunkCyl = new THREE.CylinderGeometry(0.24, 0.44, 2.5, 7);
  const branchCyl = new THREE.CylinderGeometry(0.10, 0.18, 1.2, 5);
  const blobHigh = new THREE.IcosahedronGeometry(1.0, 1);
  const blobLow = new THREE.IcosahedronGeometry(1.0, 0);

  const variants = [];
  const specs = [
    {
      blobs: [
        [0, 3.3, 0, 1.45, 1.18, 1.42],
        [-0.75, 2.85, 0.45, 1.05, 0.88, 1.02],
        [0.82, 2.95, -0.35, 1.12, 0.92, 1.08],
        [0.15, 3.95, 0.25, 1.02, 0.85, 0.98]
      ]
    },
    {
      blobs: [
        [0, 3.45, 0, 1.35, 1.28, 1.35],
        [-0.85, 3.0, -0.45, 1.08, 0.92, 1.05],
        [0.75, 2.8, 0.55, 1.15, 0.90, 1.12],
        [-0.25, 3.85, 0.60, 0.95, 0.82, 0.95],
        [0.45, 4.15, -0.25, 0.92, 0.80, 0.92]
      ]
    },
    {
      blobs: [
        [0, 3.1, 0, 1.52, 1.12, 1.48],
        [-0.68, 2.65, -0.52, 1.05, 0.84, 1.02],
        [0.72, 2.75, 0.42, 1.02, 0.86, 1.05],
        [0.0, 3.85, -0.1, 1.12, 0.90, 1.10]
      ]
    }
  ];

  for (let v = 0; v < 3; v++) {
    const trunkParts = [
      makePart(trunkCyl, 0, 1.15, 0, 0, v * 1.1, 0, 1, 1, 1, PAL.wood, 0x785638, 0x332214, 0.65),
      makePart(branchCyl, 0.24, 0.25, 0.15, 0, 0, -0.45, 0.9, 0.7, 0.9, PAL.wood, PAL.moss, 0x2d1e12, 0.6),
      makePart(branchCyl, -0.22, 0.25, -0.18, 0.35, 0, 0.4, 0.9, 0.7, 0.9, PAL.wood, PAL.moss, 0x2d1e12, 0.6),
      makePart(branchCyl, 0.35, 2.25, 0.15, 0.2, 0, -0.55, 1, 1, 1, PAL.wood, 0x785638, 0x3b2818, 0.75),
      makePart(branchCyl, -0.32, 2.18, -0.22, -0.25, 0, 0.5, 1, 1, 1, PAL.wood, 0x785638, 0x3b2818, 0.75)
    ];

    const crownParts = [];
    for (const b of specs[v].blobs) {
      crownParts.push(
        makePart(blobHigh, b[0], b[1], b[2], 0.2, v * 0.7, -0.15, b[3], b[4], b[5], PAL.moss, PAL.mossLight, PAL.mossDark, 0.68)
      );
    }

    const lodParts = [
      makePart(trunkCyl, 0, 1.15, 0, 0, 0, 0, 0.95, 1.0, 0.95, PAL.wood, 0x785638, 0x332214, 0.65),
      makePart(blobLow, 0, 3.35, 0, 0, v * 0.8, 0, 1.65, 1.38, 1.65, PAL.moss, PAL.mossLight, PAL.mossDark, 0.7)
    ];

    variants.push({
      trunk: mergeGeometries(trunkParts, false),
      crown: mergeGeometries(crownParts, false),
      lod: mergeGeometries(lodParts, false)
    });
  }

  trunkCyl.dispose();
  branchCyl.dispose();
  blobHigh.dispose();
  blobLow.dispose();

  return variants;
}

export function buildPropGeometries(PAL) {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 8);
  const blob = new THREE.IcosahedronGeometry(1.0, 0);

  const lampPostOpaque = mergeGeometries([
    makePart(cyl, 0, 0.22, 0, 0, 0, 0, 0.28, 0.55, 0.28, PAL.iron, PAL.stoneShade, 0x181c1e, 0.65),
    makePart(cyl, 0, 0.62, 0, 0, 0, 0, 0.18, 0.35, 0.18, PAL.iron, PAL.stoneShade, 0x181c1e, 0.75),
    makePart(cyl, 0, 2.05, 0, 0, 0, 0, 0.08, 2.65, 0.08, PAL.iron, PAL.stoneShade, 0x181c1e, 0.8),
    makePart(box, 0.28, 3.32, 0, 0, 0, 0, 0.68, 0.08, 0.08, PAL.iron, PAL.stoneShade, 0x181c1e, 0.85),
    makePart(box, 0.18, 3.16, 0, 0, 0, 0.65, 0.38, 0.06, 0.06, PAL.iron, PAL.stoneShade, 0x181c1e, 0.85),
    makePart(cyl, 0.52, 3.22, 0, 0, Math.PI / 4, 0, 0.26, 0.14, 0.26, PAL.iron, PAL.stoneShade, 0x181c1e, 0.88),
    makePart(box, 0.52, 2.82, 0, 0, 0, 0, 0.22, 0.06, 0.22, PAL.iron, PAL.stoneShade, 0x181c1e, 0.85)
  ], false);

  const lampPostGlow = makePart(
    box, 0.52, 3.02, 0, 0, 0, 0, 0.20, 0.32, 0.20, 0xffffff, 0xffffff, 0xffdba0, 0.98
  );

  const hedgeGeom = mergeGeometries([
    makePart(box, 0, 0.34, 0, 0, 0, 0, 1.02, 0.68, 0.52, PAL.mossDark, PAL.moss, 0x284020, 0.62),
    makePart(box, 0, 0.68, 0, 0, 0, 0, 0.92, 0.14, 0.42, PAL.moss, PAL.mossLight, PAL.mossDark, 0.82)
  ], false);

  const fenceGeom = mergeGeometries([
    makePart(box, -0.88, 0.48, 0, 0, 0, 0, 0.14, 1.06, 0.14, PAL.wood, 0x825c3a, 0x3b2816, 0.68),
    makePart(box, 0.88, 0.48, 0, 0, 0, 0, 0.14, 1.06, 0.14, PAL.wood, 0x825c3a, 0x3b2816, 0.68),
    makePart(box, 0, 0.74, 0, 0, 0, 0, 1.82, 0.10, 0.07, PAL.wood, 0x8a6440, 0x45301d, 0.78),
    makePart(box, 0, 0.38, 0, 0, 0, 0, 1.82, 0.10, 0.07, PAL.wood, 0x8a6440, 0x45301d, 0.74)
  ], false);

  const benchGeom = mergeGeometries([
    makePart(box, -0.68, 0.24, 0, 0, 0, 0, 0.12, 0.48, 0.48, PAL.stoneMid, PAL.stoneLit, PAL.stoneCrevice, 0.7),
    makePart(box, 0.68, 0.24, 0, 0, 0, 0, 0.12, 0.48, 0.48, PAL.stoneMid, PAL.stoneLit, PAL.stoneCrevice, 0.7),
    makePart(box, 0, 0.48, 0, 0, 0, 0, 1.68, 0.09, 0.52, PAL.wood, 0x8a6440, 0x45301d, 0.8),
    makePart(box, 0, 0.82, -0.22, -0.15, 0, 0, 1.64, 0.34, 0.08, PAL.wood, 0x8a6440, 0x45301d, 0.82)
  ], false);

  const barrelGeom = mergeGeometries([
    makePart(cyl, 0, 0.42, 0, 0, 0, 0, 0.34, 0.84, 0.34, PAL.wood, 0x86603c, 0x3a2615, 0.68),
    makePart(cyl, 0, 0.64, 0, 0, 0, 0, 0.355, 0.07, 0.355, PAL.iron, PAL.stoneShade, 0x181c1e, 0.8),
    makePart(cyl, 0, 0.22, 0, 0, 0, 0, 0.355, 0.07, 0.355, PAL.iron, PAL.stoneShade, 0x181c1e, 0.75)
  ], false);

  const crateGeom = mergeGeometries([
    makePart(box, 0, 0.38, 0, 0, 0, 0, 0.76, 0.76, 0.76, PAL.wood, 0x8e6844, 0x3d2817, 0.68),
    makePart(box, 0, 0.38, 0, 0, 0, 0, 0.80, 0.12, 0.80, PAL.timber, 0x4a3c32, 0x221c18, 0.75)
  ], false);

  const sackGeom = makePart(blob, 0, 0.28, 0, 0.2, 0.4, 0, 0.38, 0.46, 0.34, PAL.dirt, 0xc8bfa8, 0x6e6656, 0.68);
  const hayGeom = makePart(box, 0, 0.32, 0, 0, 0, 0, 0.86, 0.58, 0.56, PAL.gold, 0xe6c875, 0x8c7232, 0.72);

  const flowerBedGeom = mergeGeometries([
    makePart(box, 0, 0.12, 0, 0, 0, 0, 1.56, 0.26, 0.78, PAL.stoneMid, PAL.stoneLit, PAL.stoneCrevice, 0.68),
    makePart(box, 0, 0.24, 0, 0, 0, 0, 1.38, 0.08, 0.60, PAL.dirt, PAL.mud, 0x453e34, 0.75),
    makePart(blob, -0.42, 0.34, 0.06, 0, 0, 0, 0.28, 0.22, 0.24, PAL.mossLight, 0x92c472, PAL.mossDark, 0.82),
    makePart(blob, 0.02, 0.36, -0.05, 0, 0.5, 0, 0.30, 0.24, 0.26, PAL.moss, PAL.mossLight, PAL.mossDark, 0.82),
    makePart(blob, 0.44, 0.34, 0.04, 0, 1.1, 0, 0.28, 0.22, 0.24, PAL.mossLight, 0x92c472, PAL.mossDark, 0.82),
    makePart(box, -0.40, 0.46, 0.06, 0.2, 0.3, 0, 0.14, 0.12, 0.14, PAL.warmWindow, 0xffe4a8, PAL.gold, 0.92),
    makePart(box, 0.05, 0.48, -0.04, -0.2, 0.7, 0, 0.14, 0.12, 0.14, PAL.tealBright, 0xffffff, PAL.teal, 0.92),
    makePart(box, 0.42, 0.46, 0.04, 0.1, 1.2, 0, 0.14, 0.12, 0.14, 0xf2a6c2, 0xffd2e4, 0xb86886, 0.92)
  ], false);

  const paverGeom = makePart(cyl, 0, 0.025, 0, 0, 0.3, 0, 0.58, 0.06, 0.48, PAL.stoneLit, 0xd8e0e4, PAL.stoneShade, 0.82);

  const grassGeom = mergeGeometries([
    makePart(box, 0, 0.14, 0, 0.12, 0.2, 0, 0.32, 0.28, 0.04, PAL.moss, PAL.mossLight, PAL.mossDark, 0.65),
    makePart(box, 0, 0.15, 0, -0.1, 1.25, 0, 0.32, 0.30, 0.04, PAL.moss, PAL.mossLight, PAL.mossDark, 0.65),
    makePart(box, 0, 0.12, 0, 0.15, 2.3, 0, 0.28, 0.24, 0.04, PAL.mossDark, PAL.mossLight, PAL.mossDark, 0.65)
  ], false);

  const pebbleGeom = makePart(blob, 0, 0.04, 0, 0, 0.4, 0, 0.16, 0.08, 0.13, PAL.stoneMid, PAL.stoneLit, PAL.stoneCrevice, 0.75);

  box.dispose();
  cyl.dispose();
  blob.dispose();

  return {
    lampPostOpaque,
    lampPostGlow,
    hedgeGeom,
    fenceGeom,
    benchGeom,
    barrelGeom,
    crateGeom,
    sackGeom,
    hayGeom,
    flowerBedGeom,
    paverGeom,
    grassGeom,
    pebbleGeom
  };
}