import * as THREE from 'three';

const _tempColor = new THREE.Color();
const _tempEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _tempMat4 = new THREE.Matrix4();

export function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createStoneTexture(seed = 202) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rng = mulberry32(seed);

  ctx.fillStyle = '#d4dadd';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 5500; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const v = 180 + Math.floor(rng() * 60);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
    ctx.fillRect(x, y, 2 + rng() * 3, 2 + rng() * 3);
  }

  const rows = 8;
  const rowH = 512 / rows;
  ctx.strokeStyle = '#68767c';
  ctx.lineWidth = 3;

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 32; x <= 512; x += 32) {
      ctx.lineTo(x, y + (rng() - 0.5) * 2.5);
    }
    ctx.stroke();

    const cols = 4 + (r % 2);
    const colW = 512 / cols;
    const offset = (r % 2) * (colW * 0.5);
    for (let c = 0; c < cols; c++) {
      const bx = (c * colW + offset) % 512;
      const shade = 210 + Math.floor((rng() - 0.5) * 30);
      ctx.fillStyle = `rgba(${shade},${shade + 3},${shade + 5},0.28)`;
      ctx.fillRect(bx + 2, y + 2, colW - 4, rowH - 4);

      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.lineTo(bx + (rng() - 0.5) * 2, y + rowH);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,0.32)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx + 3, y + 3, colW - 6, rowH - 6);
      ctx.strokeStyle = '#68767c';
      ctx.lineWidth = 3;
    }
  }

  for (let i = 0; i < 26; i++) {
    const cx = rng() * 512;
    const cy = rng() * 512;
    const rad = 12 + rng() * 28;
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, rad);
    grad.addColorStop(0, 'rgba(67, 104, 54, 0.36)');
    grad.addColorStop(1, 'rgba(67, 104, 54, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function createPlasterWoodTexture(seed = 303) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rng = mulberry32(seed);

  ctx.fillStyle = '#e2e5e1';
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 4) {
    const v = 220 + Math.floor((rng() - 0.5) * 20);
    ctx.fillStyle = `rgba(${v},${v - 2},${v - 5},0.35)`;
    ctx.fillRect(0, y, 512, 3);
  }

  for (let i = 0; i < 90; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const w = 16 + rng() * 64;
    const h = 2 + rng() * 4;
    ctx.fillStyle = rng() > 0.5 ? 'rgba(120,115,108,0.18)' : 'rgba(255,255,255,0.22)';
    ctx.fillRect(x, y, w, h);
  }

  ctx.strokeStyle = 'rgba(70,65,60,0.22)';
  ctx.lineWidth = 2;
  for (let p = 0; p < 8; p++) {
    const px = p * 64;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, 512);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function prepareGeo(geo, baseHex, bottomDark = 0.76, topLight = 1.06, noiseAmp = 0.05, rng = Math.random) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (g.attributes.uv) g.deleteAttribute('uv');
  if (g.attributes.uv2) g.deleteAttribute('uv2');
  g.computeVertexNormals();

  const pos = g.attributes.position;
  const norm = g.attributes.normal;
  g.computeBoundingBox();
  const minY = g.boundingBox.min.y;
  const maxY = g.boundingBox.max.y;
  const spanY = Math.max(0.001, maxY - minY);

  const count = pos.count;
  const colors = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const c = _tempColor.set(baseHex);

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = norm.getX(i);
    const ny = norm.getY(i);
    const nz = norm.getZ(i);

    const tY = (y - minY) / spanY;
    const grad = bottomDark + (topLight - bottomDark) * tY;
    const upBias = ny * 0.07;
    const n = (rng() - 0.5) * noiseAmp;
    const f = Math.max(0.22, Math.min(1.35, grad + upBias + n));

    colors[i * 3] = Math.min(1, c.r * f);
    colors[i * 3 + 1] = Math.min(1, c.g * f);
    colors[i * 3 + 2] = Math.min(1, c.b * f);

    if (Math.abs(ny) > 0.75) {
      uvs[i * 2] = x * 0.2;
      uvs[i * 2 + 1] = z * 0.2;
    } else if (Math.abs(nx) > Math.abs(nz)) {
      uvs[i * 2] = z * 0.2;
      uvs[i * 2 + 1] = y * 0.2;
    } else {
      uvs[i * 2] = x * 0.2;
      uvs[i * 2 + 1] = y * 0.2;
    }
  }

  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return g;
}

export function addBox(list, w, h, d, x, y, z, hex, rotY = 0, rotX = 0, rotZ = 0, aoBot = 0.76, aoTop = 1.06, rng = Math.random) {
  const g = new THREE.BoxGeometry(w, h, d);
  const pg = prepareGeo(g, hex, aoBot, aoTop, 0.05, rng);
  g.dispose();
  if (rotX !== 0 || rotY !== 0 || rotZ !== 0) {
    _tempEuler.set(rotX, rotY, rotZ, 'YXZ');
    _tempMat4.makeRotationFromEuler(_tempEuler);
    pg.applyMatrix4(_tempMat4);
  }
  pg.translate(x, y, z);
  list.push(pg);
}

export function addCyl(list, rTop, rBot, h, segs, x, y, z, hex, rotY = 0, rotX = 0, rotZ = 0, aoBot = 0.76, aoTop = 1.06, rng = Math.random) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, segs);
  const pg = prepareGeo(g, hex, aoBot, aoTop, 0.05, rng);
  g.dispose();
  if (rotX !== 0 || rotY !== 0 || rotZ !== 0) {
    _tempEuler.set(rotX, rotY, rotZ, 'YXZ');
    _tempMat4.makeRotationFromEuler(_tempEuler);
    pg.applyMatrix4(_tempMat4);
  }
  pg.translate(x, y, z);
  list.push(pg);
}

export function createArchBlockGeo(innerR, outerR, height, startAngle, endAngle, segs, hex, yBase, cx, cz, rng) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= segs; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / segs);
    const x = Math.cos(a) * outerR;
    const y = -Math.sin(a) * outerR;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let i = segs; i >= 0; i--) {
    const a = startAngle + (endAngle - startAngle) * (i / segs);
    const x = Math.cos(a) * innerR;
    const y = -Math.sin(a) * innerR;
    shape.lineTo(x, y);
  }
  shape.closePath();

  const extrudeSettings = { depth: height, bevelEnabled: false, curveSegments: segs };
  const g = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  g.rotateX(-Math.PI / 2);
  const pg = prepareGeo(g, hex, 0.74, 1.06, 0.05, rng);
  g.dispose();
  pg.translate(cx, yBase, cz);
  return pg;
}

export function buildSignPost(stoneList, glyphList, plan, rng, P) {
  const postH = plan.post.height;
  addBox(stoneList, plan.post.width, postH + 0.12, plan.post.width,
    plan.x, plan.groundY + (postH + 0.12) * 0.5, plan.z,
    P.timber || 0x2b2623, plan.rotY, 0, 0, 0.72, 1.0, rng);
  addBox(stoneList, plan.board.width, plan.board.height, plan.board.depth,
    plan.x, plan.boardY, plan.z, P.slate || 0x4a5560, plan.rotY, 0, 0, 0.8, 1.05, rng);
  addBox(glyphList, plan.board.width - 0.3, 0.06, plan.board.depth + 0.02,
    plan.x, plan.boardY - plan.board.height * 0.5 + 0.1, plan.z,
    P.teal || 0x6fe0f0, plan.rotY, 0, 0, 0.95, 1.05, rng);
}