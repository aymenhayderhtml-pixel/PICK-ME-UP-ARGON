import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FLOOR_DECAL_LAYERS } from './layout.js';

export function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createStoneTexture(seed = 101) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rng = mulberry32(seed);

  ctx.fillStyle = '#d6dce0';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 6000; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const v = 185 + Math.floor(rng() * 55);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
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
      const shade = 215 + Math.floor((rng() - 0.5) * 26);
      ctx.fillStyle = `rgba(${shade},${shade + 3},${shade + 6},0.28)`;
      ctx.fillRect(bx + 2, y + 2, colW - 4, rowH - 4);

      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.lineTo(bx + (rng() - 0.5) * 2, y + rowH);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx + 3, y + 3, colW - 6, rowH - 6);
      ctx.strokeStyle = '#68767c';
      ctx.lineWidth = 3;
    }
  }

  for (let i = 0; i < 28; i++) {
    const cx = rng() * 512;
    const cy = rng() * 512;
    const rad = 10 + rng() * 28;
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, rad);
    grad.addColorStop(0, 'rgba(67, 104, 54, 0.38)');
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

export function createPortalSwirlTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const cx = 256;
  const cy = 256;

  ctx.clearRect(0, 0, 512, 512);

  const bgGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 250);
  bgGrad.addColorStop(0, 'rgba(235, 252, 255, 1.0)');
  bgGrad.addColorStop(0.22, 'rgba(130, 225, 255, 0.92)');
  bgGrad.addColorStop(0.55, 'rgba(55, 145, 255, 0.65)');
  bgGrad.addColorStop(0.85, 'rgba(25, 70, 175, 0.22)');
  bgGrad.addColorStop(1.0, 'rgba(10, 30, 90, 0.0)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 512);

  ctx.save();
  ctx.translate(cx, cy);
  for (let arm = 0; arm < 6; arm++) {
    ctx.save();
    ctx.rotate((arm * Math.PI * 2) / 6);
    ctx.beginPath();
    for (let r = 8; r < 235; r += 3) {
      const a = r * 0.026;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (r === 8) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = arm % 2 === 0 ? 'rgba(210, 248, 255, 0.55)' : 'rgba(90, 195, 255, 0.4)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(220, 250, 255, 0.75)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r1 = 155 + (i % 2) * 8;
    const r2 = 185 - (i % 3) * 5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a + 0.06) * r2, Math.sin(a + 0.06) * r2);
    ctx.stroke();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function prepareGeo(geo, baseHex, bottomDark = 0.78, topLight = 1.06, noiseAmp = 0.05, rng = Math.random) {
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
  const c = new THREE.Color(baseHex);

  const uvs = new Float32Array(count * 2);
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
    const f = Math.max(0.25, Math.min(1.35, grad + upBias + n));

    colors[i * 3] = Math.min(1, c.r * f);
    colors[i * 3 + 1] = Math.min(1, c.g * f);
    colors[i * 3 + 2] = Math.min(1, c.b * f);

    if (Math.abs(ny) > 0.75) {
      uvs[i * 2] = x * 0.18;
      uvs[i * 2 + 1] = z * 0.18;
    } else if (Math.abs(nx) > Math.abs(nz)) {
      uvs[i * 2] = z * 0.18;
      uvs[i * 2 + 1] = y * 0.18;
    } else {
      uvs[i * 2] = x * 0.18;
      uvs[i * 2 + 1] = y * 0.18;
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
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rotX, rotY, rotZ, 'YXZ'));
    pg.applyMatrix4(m);
  }
  pg.translate(x, y, z);
  list.push(pg);
}

export function addCyl(list, rTop, rBot, h, segs, x, y, z, hex, rotY = 0, rotX = 0, rotZ = 0, aoBot = 0.76, aoTop = 1.06, rng = Math.random) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, segs);
  const pg = prepareGeo(g, hex, aoBot, aoTop, 0.05, rng);
  g.dispose();
  if (rotX !== 0 || rotY !== 0 || rotZ !== 0) {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rotX, rotY, rotZ, 'YXZ'));
    pg.applyMatrix4(m);
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

export function decalCenterY(floorY, height, layer) {
  if (height >= layer.top) return floorY + layer.top - height * 0.5;
  return floorY + layer.lift + height * 0.5;
}

export function buildSignPost(stoneList, glyphList, plan, P, rng) {
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

export function createLandmarkMaterials(P, stoneTex, portalTex) {
  const matStone = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: stoneTex,
    roughness: 0.86,
    metalness: 0.06,
    vertexColors: true
  });

  const matMoss = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.02,
    vertexColors: true,
    polygonOffset: true,
    polygonOffsetFactor: FLOOR_DECAL_LAYERS.moss.polygonOffsetFactor,
    polygonOffsetUnits: FLOOR_DECAL_LAYERS.moss.polygonOffsetUnits
  });

  const matGlyph = new THREE.MeshStandardMaterial({
    color: P.teal || 0x6fe0f0,
    emissive: P.teal || 0x6fe0f0,
    emissiveIntensity: 1.45,
    roughness: 0.3,
    metalness: 0.1,
    vertexColors: true
  });

  const matFloorGlyph = new THREE.MeshStandardMaterial({
    color: P.teal || 0x6fe0f0,
    emissive: P.teal || 0x6fe0f0,
    emissiveIntensity: 1.45,
    roughness: 0.3,
    metalness: 0.1,
    vertexColors: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: FLOOR_DECAL_LAYERS.inlay.polygonOffsetFactor,
    polygonOffsetUnits: FLOOR_DECAL_LAYERS.inlay.polygonOffsetUnits
  });

  const matSphere = new THREE.MeshStandardMaterial({
    color: P.sphereCyan || 0xa8f4ff,
    emissive: P.sphereCyan || 0xa8f4ff,
    emissiveIntensity: 1.75,
    roughness: 0.18,
    metalness: 0.15
  });

  const matSphereRing = new THREE.MeshStandardMaterial({
    color: 0xe6fbff,
    emissive: P.teal || 0x6fe0f0,
    emissiveIntensity: 1.5,
    roughness: 0.25,
    metalness: 0.65
  });

  const matPortal = new THREE.MeshBasicMaterial({
    map: portalTex,
    color: 0x99dcff,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const matShaft = new THREE.MeshBasicMaterial({
    color: P.sphereCyan || 0xa8f4ff,
    transparent: true,
    opacity: 0.13,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexColors: true
  });

  const matAO = new THREE.MeshBasicMaterial({
    color: 0x182228,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: FLOOR_DECAL_LAYERS.patch.polygonOffsetFactor,
    polygonOffsetUnits: FLOOR_DECAL_LAYERS.patch.polygonOffsetUnits
  });

  return {
    matStone,
    matMoss,
    matGlyph,
    matFloorGlyph,
    matSphere,
    matSphereRing,
    matPortal,
    matShaft,
    matAO,
    list: [
      matStone,
      matMoss,
      matGlyph,
      matFloorGlyph,
      matSphere,
      matSphereRing,
      matPortal,
      matShaft,
      matAO
    ]
  };
}

export function buildColumnPrototype(q, P, rng) {
  const colParts = [];
  const colSegs = q === 'low' ? 10 : q === 'medium' ? 14 : 18;
  addBox(colParts, 1.42, 0.42, 1.42, 0, 0.21, 0, P.wallShade || 0x8e9da3, 0, 0, 0, 0.72, 1.0, rng);
  addCyl(colParts, 0.62, 0.68, 0.32, colSegs, 0, 0.58, 0, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.78, 1.04, rng);
  addCyl(colParts, 0.48, 0.56, 7.2, colSegs, 0, 4.34, 0, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.76, 1.08, rng);
  addCyl(colParts, 0.68, 0.48, 0.42, colSegs, 0, 8.15, 0, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.84, 1.08, rng);
  addBox(colParts, 1.38, 0.36, 1.38, 0, 8.54, 0, P.wallShade || 0x8e9da3, 0, 0, 0, 0.84, 1.08, rng);

  const colProto = mergeGeometries(colParts, false);
  for (const p of colParts) p.dispose();
  return colProto;
}

export function buildBalusterPrototype(q, P, rng) {
  const balParts = [];
  const bSegs = q === 'low' ? 6 : 8;
  addBox(balParts, 0.24, 0.14, 0.24, 0, 0.07, 0, P.wallShade || 0x8e9da3, 0, 0, 0, 0.75, 1.0, rng);
  addCyl(balParts, 0.07, 0.11, 0.56, bSegs, 0, 0.42, 0, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.8, 1.06, rng);
  addBox(balParts, 0.24, 0.12, 0.24, 0, 0.76, 0, P.wallLit || 0xc4cbcf, 0, 0, 0, 0.85, 1.08, rng);

  const balProto = mergeGeometries(balParts, false);
  for (const p of balParts) p.dispose();
  return balProto;
}