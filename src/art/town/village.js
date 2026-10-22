import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE as DEFAULT_PALETTE } from './palette.js';
import { LAYOUT, PROP_COLLIDERS, getSignLayout } from './layout.js';

const COTTAGE_SPECS = [
  { id: 'cottage_1', row: 1, x: -33.0, z: -14.0, doorX: -33.8, doorZ: -12.19, corrZ: -10.8, variant: 0 },
  { id: 'cottage_2', row: 1, x: -31.0, z: -8.0,  doorX: -31.8, doorZ: -6.19,  corrZ: -4.8,  variant: 1 },
  { id: 'cottage_3', row: 1, x: -29.0, z: -2.0,  doorX: -29.8, doorZ: -0.19,  corrZ: 1.2,   variant: 2 },
  { id: 'cottage_4', row: 1, x: -27.0, z: 4.0,   doorX: -27.8, doorZ: 5.81,   corrZ: 7.2,   variant: 3 },
  { id: 'cottage_5', row: 1, x: -25.0, z: 10.0,  doorX: -25.8, doorZ: 11.81,  corrZ: 13.2,  variant: 0 },
  { id: 'cottage_6', row: 2, x: -23.0, z: -16.0, doorX: -23.8, doorZ: -14.19, corrZ: -12.8, variant: 2 },
  { id: 'cottage_7', row: 2, x: -21.0, z: -10.0, doorX: -21.8, doorZ: -8.19,  corrZ: -6.8,  variant: 3 },
  { id: 'cottage_8', row: 2, x: -19.0, z: -4.0,  doorX: -19.8, doorZ: -2.19,  corrZ: -0.8,  variant: 1 },
  { id: 'cottage_9', row: 2, x: -17.0, z: 2.0,   doorX: -17.8, doorZ: 3.81,   corrZ: 5.2,   variant: 0 },
  { id: 'cottage_10', row: 2, x: -15.0, z: 8.0,  doorX: -15.8, doorZ: 9.81,   corrZ: 11.2,  variant: 3 }
];

const ROAD_SPECS = [
  { id: 'road_square_landing', x1: 14.0, z1: -8.0, x2: 20.0, z2: 26.0, w: 4.8 },
  { id: 'road_square_summoning', x1: 14.0, z1: -8.0, x2: 26.0, z2: 4.0, w: 4.5 },
  { id: 'road_square_rift', x1: 14.0, z1: -8.0, x2: 30.6, z2: -30.6, w: 5.0 },
  { id: 'road_square_synthesis', x1: 14.0, z1: -8.0, x2: 0.0, z2: -32.0, w: 4.5 },
  { id: 'road_square_armory', x1: 14.0, z1: -8.0, x2: -6.0, z2: -20.0, w: 4.2 },
  { id: 'road_square_residences', x1: 14.0, z1: -8.0, x2: -26.0, z2: -4.0, w: 5.0 },
  { id: 'road_square_training', x1: 14.0, z1: -8.0, x2: -24.0, z2: 20.0, w: 4.5 },
  { id: 'road_residences_inner', x1: -32.0, z1: -14.0, x2: -20.0, z2: 10.0, w: 4.0 },
  { id: 'road_landing_mess', x1: 20.0, z1: 26.0, x2: 8.0, z2: 38.0, w: 4.0 },
  // Secondary village crossing paths
  { id: 'path_res_east', x1: -23.0, z1: -16.0, x2: -13.0, z2: 10.0, w: 2.8 },
  { id: 'path_res_south_link', x1: -31.0, z1: -11.5, x2: -19.0, z2: -13.0, w: 2.4 },
  { id: 'path_res_north_link', x1: -25.0, z1: 12.8, x2: -15.0, z2: 11.2, w: 2.4 },
  { id: 'path_armory_res', x1: -6.0, z1: -14.0, x2: -17.5, z2: -11.0, w: 2.6 },
  { id: 'path_training_res', x1: -15.0, z1: 18.0, x2: -16.5, z2: 11.2, w: 2.6 }
];

const LAMP_SPECS = [
  { id: 'lamp_1', x: 14.0, z: -8.0, color: 0xffaa44, intensity: 7.0, distance: 14.0, rotY: 0.4 },
  { id: 'lamp_2', x: 20.0, z: 22.0, color: 0xffaa44, intensity: 7.0, distance: 14.0, rotY: -1.1 },
  { id: 'lamp_3', x: -16.0, z: -4.0, color: 0xffaa44, intensity: 7.0, distance: 14.0, rotY: 0.0 },
  { id: 'lamp_4', x: -18.0, z: 18.0, color: 0xffaa44, intensity: 7.0, distance: 14.0, rotY: 0.8 },
  // Additional decorative street lamps (reuse emissive material, top 4 go into primary lights list)
  { id: 'lamp_5', x: -27.5, z: -5.0, color: 0xffaa44, intensity: 5.5, distance: 11.0, rotY: 1.57, extra: true },
  { id: 'lamp_6', x: -23.5, z: 3.0, color: 0xffaa44, intensity: 5.5, distance: 11.0, rotY: -1.57, extra: true },
  { id: 'lamp_7', x: 3.0, z: -14.0, color: 0xffaa44, intensity: 5.5, distance: 11.0, rotY: 2.2, extra: true },
  { id: 'lamp_8', x: 17.5, z: 7.0, color: 0xffaa44, intensity: 5.5, distance: 11.0, rotY: -0.5, extra: true }
];

const LANDMARK_EXCLUSIONS = [
  { x: 20.0, z: 26.0, r: 14.2 },  // Landing Area terrace
  { x: 30.0, z: 4.0, r: 12.4 },   // Summoning Room terrace
  { x: 14.0, z: -8.0, r: 12.0 },  // Town Square
  { x: 32.53, z: -32.53, r: 6.5 },  // Space-Time Rift
  { x: 0.0, z: -32.0, r: 10.4 },  // Synthesis Chamber
  { x: -6.0, z: -20.0, r: 8.4 },  // Armory
  { x: -24.0, z: 20.0, r: 13.4 }, // Training Grounds
  { x: 8.0, z: 38.0, r: 12.2 },   // Mess Hall row
  { x: 6.0, z: -2.0, r: 5.2 }     // Dungeon Board
];

const DOOR_CORRIDORS = [
  { x1: 20.0, z1: 26.0, x2: 20.0, z2: 13.0, r: 3.2 },
  { x1: 30.0, z1: 4.0, x2: 23.5, z2: 11.5, r: 3.2 },
  { x1: 23.5, z1: 11.5, x2: 19.5, z2: 20.0, r: 3.2 },
  { x1: 31.8, z1: -31.8, x2: 28.5, z2: -28.5, r: 3.2 },
  { x1: 0.0, z1: -32.0, x2: 0.0, z2: -20.0, r: 3.2 },
  { x1: -6.0, z1: -20.0, x2: -6.0, z2: -14.0, r: 3.2 },
  { x1: -24.0, z1: 20.0, x2: -18.0, z2: 18.0, r: 3.2 },
  { x1: -18.0, z1: 18.0, x2: -15.0, z2: 18.0, r: 3.2 },
  { x1: 8.0, z1: 38.0, x2: 8.0, z2: 33.0, r: 3.2 },
  { x1: -26.0, z1: -4.0, x2: -14.0, z2: -4.0, r: 3.2 } // Residences zone door corridor
];

for (const c of COTTAGE_SPECS) {
  DOOR_CORRIDORS.push({ x1: c.x, z1: c.z, x2: c.doorX, z2: c.doorZ, r: 2.6 });
  DOOR_CORRIDORS.push({ x1: c.doorX, z1: c.doorZ, x2: c.doorX, z2: c.corrZ, r: 3.1 });
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function distToSegmentSq(px, pz, x1, z1, x2, z2) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const l2 = dx * dx + dz * dz;
  if (l2 === 0) return (px - x1) * (px - x1) + (pz - z1) * (pz - z1);
  let t = ((px - x1) * dx + (pz - z1) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cz = z1 + t * dz;
  return (px - cx) * (px - cx) + (pz - cz) * (pz - cz);
}

function isInsideDodecagon(x, z, apothem = 43.8) {
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const nx = Math.cos(a);
    const nz = Math.sin(a);
    if (x * nx + z * nz > apothem) return false;
  }
  return true;
}

function isClearOfDoors(x, z, extraMargin = 0) {
  for (const dc of DOOR_CORRIDORS) {
    const r = dc.r + extraMargin;
    if (distToSegmentSq(x, z, dc.x1, dc.z1, dc.x2, dc.z2) < r * r) return false;
  }
  return true;
}

function isClearOfRoads(x, z, extraMargin = 0.4, maxRoadIdx = ROAD_SPECS.length) {
  for (let i = 0; i < maxRoadIdx; i++) {
    const rd = ROAD_SPECS[i];
    const r = rd.w * 0.5 + extraMargin;
    if (distToSegmentSq(x, z, rd.x1, rd.z1, rd.x2, rd.z2) < r * r) return false;
  }
  return true;
}

function isClearOfLandmarks(x, z, extraMargin = 0) {
  for (const lm of LANDMARK_EXCLUSIONS) {
    const dx = x - lm.x;
    const dz = z - lm.z;
    const r = lm.r + extraMargin;
    if (dx * dx + dz * dz < r * r) return false;
  }
  return true;
}

function isClearOfCottages(x, z, extraMargin = 0.5) {
  for (const c of COTTAGE_SPECS) {
    const hw = 2.4 + extraMargin;
    const hd = 2.2 + extraMargin;
    if (Math.abs(x - c.x) < hw && Math.abs(z - c.z) < hd) return false;
  }
  return true;
}

function paintVertexColors(geom, baseHex, topHex, bottomHex, aoBottom = 0.68) {
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

function makePart(geom, x, y, z, rx, ry, rz, sx, sy, sz, cBase, cTop, cBot, ao = 0.72) {
  const g = paintVertexColors(geom, cBase, cTop, cBot, ao);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0));
  m.compose(new THREE.Vector3(x || 0, y || 0, z || 0), q, new THREE.Vector3(sx || 1, sy || 1, sz || 1));
  g.applyMatrix4(m);
  return g;
}

function createGablePrism(width, height, depth) {
  const hw = width * 0.5;
  const hd = depth * 0.5;
  const positions = new Float32Array([
    // Front triangle
    -hw, 0, hd,   hw, 0, hd,   0, height, hd,
    // Back triangle
    hw, 0, -hd,  -hw, 0, -hd,  0, height, -hd,
    // Left slope
    -hw, 0, -hd, -hw, 0, hd,   0, height, hd,
    -hw, 0, -hd,  0, height, hd, 0, height, -hd,
    // Right slope
    hw, 0, hd,    hw, 0, -hd,  0, height, -hd,
    hw, 0, hd,    0, height, -hd, 0, height, hd,
    // Bottom
    -hw, 0, -hd,  hw, 0, -hd,  hw, 0, hd,
    -hw, 0, -hd,  hw, 0, hd,  -hw, 0, hd
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

function createStonePlasterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rng = mulberry32(90125);

  ctx.fillStyle = '#d8dedc';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle stone/plaster grain & weathered streaks
  for (let i = 0; i < 4500; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const w = 2 + rng() * 14;
    const h = 2 + rng() * 10;
    const v = Math.floor(200 + (rng() - 0.5) * 42);
    ctx.fillStyle = `rgb(${v},${v + 3},${v + 4})`;
    ctx.fillRect(x, y, w, h);
  }

  // Faint masonry block courses for stone/flagstone modularity
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

  // Slight mossy lower damp patches
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

function createFoliageBarkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rng = mulberry32(44187);

  ctx.fillStyle = '#c8d2c6';
  ctx.fillRect(0, 0, 512, 512);

  // Leaf cluster dapple + wood grain streaks
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

function buildCottageArchetypes(PAL) {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 6);
  const gable = createGablePrism(4.2, 1.9, 3.6);
  const variants = [];

  for (let v = 0; v < 4; v++) {
    const opaqueParts = [];
    const winParts = [];
    const lampParts = [];

    // 1. Stone foundation plinth (touches ground to -0.35 so uneven terrain never leaves a gap)
    opaqueParts.push(
      makePart(box, 0, 0.08, 0, 0, 0, 0, 4.36, 0.86, 3.76, PAL.stoneMid, PAL.stoneLit, PAL.stoneCrevice, 0.62)
    );
    // Moss trim around foundation base
    opaqueParts.push(
      makePart(box, 0, 0.04, 1.86, 0, 0, 0, 4.4, 0.14, 0.12, PAL.moss, PAL.mossLight, PAL.mossDark, 0.7),
      makePart(box, 0, 0.04, -1.86, 0, 0, 0, 4.4, 0.14, 0.12, PAL.moss, PAL.mossLight, PAL.mossDark, 0.7)
    );

    // 2. Main plaster walls (2.75m high on top of 0.45m visible foundation)
    opaqueParts.push(
      makePart(box, 0, 1.82, 0, 0, 0, 0, 4.16, 2.74, 3.56, PAL.plaster, 0xeef2ee, 0xb8c2c0, 0.76)
    );

    // 3. Gable plaster triangles (front and back)
    opaqueParts.push(
      makePart(gable, 0, 3.18, 0, 0, 0, 0, 0.99, 1.0, 0.99, PAL.plaster, 0xeef2ee, 0xc2cbc9, 0.82)
    );

    // 4. Half-timber frame posts, horizontal beams & diagonal cross braces
    const tCol = PAL.timber;
    const tTop = 0x3d3632;
    const tBot = 0x1c1816;
    // Corner posts
    for (const sx of [-2.06, 2.06]) {
      for (const sz of [-1.76, 1.76]) {
        opaqueParts.push(makePart(box, sx, 1.82, sz, 0, 0, 0, 0.16, 2.78, 0.16, tCol, tTop, tBot, 0.75));
      }
    }
    // Horizontal bands (sill, mid-rail, wall-plate)
    for (const yBand of [0.52, 1.78, 3.12]) {
      opaqueParts.push(makePart(box, 0, yBand, 0, 0, 0, 0, 4.28, 0.13, 3.68, tCol, tTop, tBot, 0.78));
    }
    // Vertical studs on front, back, and sides
    for (const sx of [-0.95, 0.35, 1.25]) {
      opaqueParts.push(makePart(box, sx, 1.82, 1.77, 0, 0, 0, 0.11, 2.72, 0.08, tCol, tTop, tBot, 0.78));
      opaqueParts.push(makePart(box, -sx, 1.82, -1.77, 0, 0, 0, 0.11, 2.72, 0.08, tCol, tTop, tBot, 0.78));
    }
    for (const sz of [-0.75, 0.75]) {
      opaqueParts.push(makePart(box, -2.07, 1.82, sz, 0, 0, 0, 0.08, 2.72, 0.11, tCol, tTop, tBot, 0.78));
      opaqueParts.push(makePart(box, 2.07, 1.82, sz, 0, 0, 0, 0.08, 2.72, 0.11, tCol, tTop, tBot, 0.78));
    }
    // Diagonal cross-braces on front, back, and gable
    opaqueParts.push(
      makePart(box, 1.62, 2.45, 1.78, 0, 0, 0.62, 0.09, 1.42, 0.07, tCol, tTop, tBot, 0.8),
      makePart(box, -1.52, 2.45, 1.78, 0, 0, -0.62, 0.09, 1.42, 0.07, tCol, tTop, tBot, 0.8),
      makePart(box, 1.52, 2.45, -1.78, 0, 0, -0.62, 0.09, 1.42, 0.07, tCol, tTop, tBot, 0.8),
      makePart(box, -1.52, 2.45, -1.78, 0, 0, 0.62, 0.09, 1.42, 0.07, tCol, tTop, tBot, 0.8),
      makePart(box, 0, 4.05, 1.78, 0, 0, 0, 0.12, 1.7, 0.08, tCol, tTop, tBot, 0.82),
      makePart(box, 0, 4.05, -1.78, 0, 0, 0, 0.12, 1.7, 0.08, tCol, tTop, tBot, 0.82)
    );

    // 5. Gray slate gable roof slopes + ridge cap + bargeboards + eaves
    const roofAngle = Math.atan2(1.95, 2.25);
    const slopeLen = Math.hypot(2.48, 2.08);
    opaqueParts.push(
      makePart(box, -1.16, 4.12, 0, 0, 0, roofAngle, slopeLen, 0.18, 4.12, PAL.slate, 0x677582, 0x333c44, 0.78),
      makePart(box, 1.16, 4.12, 0, 0, 0, -roofAngle, slopeLen, 0.18, 4.12, PAL.slate, 0x677582, 0x333c44, 0.78),
      // Ridge beam & stone cap
      makePart(box, 0, 5.12, 0, 0, 0, 0, 0.28, 0.22, 4.22, PAL.stoneMid, PAL.stoneLit, PAL.stoneShade, 0.85),
      // Moss patches along roof eaves
      makePart(box, -2.18, 3.22, 0.4, 0, 0, roofAngle, 0.35, 0.08, 1.8, PAL.moss, PAL.mossLight, PAL.mossDark, 0.8),
      makePart(box, 2.18, 3.22, -0.5, 0, 0, -roofAngle, 0.35, 0.08, 1.6, PAL.moss, PAL.mossLight, PAL.mossDark, 0.8)
    );

    // 6. Stone Chimney with cap and mossy collar
    const chimX = v % 2 === 0 ? 1.35 : -1.35;
    const chimZ = v < 2 ? -0.65 : 0.45;
    opaqueParts.push(
      makePart(box, chimX, 4.45, chimZ, 0, 0, 0, 0.68, 2.3, 0.68, PAL.stoneMid, PAL.stoneLit, PAL.stoneCrevice, 0.75),
      makePart(box, chimX, 5.62, chimZ, 0, 0, 0, 0.82, 0.18, 0.82, PAL.stoneLit, 0xd8e0e4, PAL.stoneShade, 0.85),
      makePart(cyl, chimX, 5.82, chimZ, 0, 0, 0, 0.18, 0.28, 0.18, PAL.stoneCrevice, PAL.stoneShade, PAL.iron, 0.8)
    );

    // 7. Front Door at x = -0.8, z = +1.80 (2.2m tall, 1.4m wide per contract) + stone steps
    opaqueParts.push(
      // Stone steps
      makePart(box, -0.8, 0.10, 2.06, 0, 0, 0, 1.64, 0.20, 0.56, PAL.stoneLit, 0xdce2e6, PAL.stoneCrevice, 0.72),
      makePart(box, -0.8, 0.28, 1.92, 0, 0, 0, 1.52, 0.18, 0.34, PAL.stoneMid, PAL.stoneLit, PAL.stoneCrevice, 0.75),
      // Recessed lighter stone doorframe & wood door leaf (no black void)
      makePart(box, -0.8, 1.38, 1.78, 0, 0, 0, 1.48, 2.26, 0.18, PAL.stoneShade, PAL.stoneLit, PAL.stoneCrevice, 0.75),
      makePart(box, -0.8, 1.36, 1.83, 0, 0, 0, 1.28, 2.12, 0.12, PAL.wood, 0x825c3a, 0x45301d, 0.76),
      // Iron straps & handle ring
      makePart(box, -0.8, 1.85, 1.88, 0, 0, 0, 1.16, 0.07, 0.04, PAL.iron, PAL.stoneShade, PAL.iron, 0.8),
      makePart(box, -0.8, 0.90, 1.88, 0, 0, 0, 1.16, 0.07, 0.04, PAL.iron, PAL.stoneShade, PAL.iron, 0.8),
      makePart(box, -0.35, 1.32, 1.90, 0, 0, 0, 0.10, 0.18, 0.06, PAL.gold, PAL.warmWindow, PAL.wood, 0.85)
    );

    // 8. Small paned windows (front right, left side, right side, back, upper gable) + planter boxes
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
      // Window frame & mullions
      opaqueParts.push(
        makePart(box, ws.x, ws.y, ws.z, 0, 0, 0, sx + 0.12, ws.h + 0.12, sz + 0.12, tCol, tTop, tBot, 0.78),
        makePart(box, ws.x, ws.y, ws.z, 0, 0, 0, isZ ? 0.06 : sx + 0.15, ws.h + 0.04, isZ ? sz + 0.15 : 0.06, tCol, tTop, tBot, 0.8),
        makePart(box, ws.x, ws.y, ws.z, 0, 0, 0, sx + 0.15, 0.06, sz + 0.15, tCol, tTop, tBot, 0.8)
      );
      // Emissive warm window pane
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

    // 9. Cottage Door Lantern at (-1.58, 2.05, 1.98)
    opaqueParts.push(
      makePart(box, -1.58, 2.18, 1.92, 0, 0, 0, 0.08, 0.08, 0.32, PAL.iron, PAL.stoneShade, PAL.iron, 0.8),
      makePart(box, -1.58, 2.12, 2.04, 0, 0, 0, 0.24, 0.07, 0.24, PAL.iron, PAL.stoneShade, PAL.iron, 0.8),
      makePart(box, -1.58, 1.84, 2.04, 0, 0, 0, 0.18, 0.06, 0.18, PAL.iron, PAL.stoneShade, PAL.iron, 0.8)
    );
    lampParts.push(
      makePart(box, -1.58, 1.98, 2.04, 0, 0, 0, 0.16, 0.22, 0.16, 0xffffff, 0xffffff, 0xffe0b0, 0.98)
    );

    // 10. Per-cottage Variant Additions (v0: timber porch canopy, v1: side lean-to shed, v2: stacked firewood + rain barrel, v3: stone bay alcove + side dormer)
    if (v === 0) {
      // Timber front porch canopy over door
      opaqueParts.push(
        makePart(box, -0.8, 2.68, 2.25, 0.25, 0, 0, 1.95, 0.14, 0.98, PAL.slate, 0x677582, 0x333c44, 0.8),
        makePart(box, -1.62, 1.42, 2.58, 0, 0, 0, 0.12, 2.35, 0.12, tCol, tTop, tBot, 0.75),
        makePart(box, 0.02, 1.42, 2.58, 0, 0, 0, 0.12, 2.35, 0.12, tCol, tTop, tBot, 0.75)
      );
    } else if (v === 1) {
      // Side lean-to wooden shed on right (+x)
      opaqueParts.push(
        makePart(box, 2.52, 1.05, -0.2, 0, 0, 0, 0.92, 1.85, 2.2, PAL.wood, 0x7c5836, 0x3d2a18, 0.72),
        makePart(box, 2.56, 2.08, -0.2, 0, 0, -0.38, 1.18, 0.14, 2.4, PAL.slate, 0x677582, 0x333c44, 0.8)
      );
    } else if (v === 2) {
      // Stacked firewood rack on right + rain barrel at front corner
      opaqueParts.push(
        makePart(box, 2.38, 0.95, 0.3, 0, 0, -0.25, 0.72, 0.10, 1.9, PAL.slate, 0x677582, 0x333c44, 0.8),
        makePart(box, 2.32, 0.45, 0.3, 0, 0, 0, 0.52, 0.78, 1.65, PAL.wood, 0x8a6440, 0x3b2816, 0.68),
        makePart(cyl, 1.92, 0.48, 1.98, 0, 0, 0, 0.32, 0.78, 0.32, PAL.wood, 0x7c5836, 0x3d2a18, 0.72)
      );
    } else {
      // Stone bay window bump-out on front right + side stone buttress
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

  // Low-poly Distant LOD Cottage (used when camera > 58m on high quality)
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

function buildTreeArchetypes(PAL) {
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
      // Root flares touching deep into ground
      makePart(branchCyl, 0.24, 0.25, 0.15, 0, 0, -0.45, 0.9, 0.7, 0.9, PAL.wood, PAL.moss, 0x2d1e12, 0.6),
      makePart(branchCyl, -0.22, 0.25, -0.18, 0.35, 0, 0.4, 0.9, 0.7, 0.9, PAL.wood, PAL.moss, 0x2d1e12, 0.6),
      // Upper branches
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

function buildPropGeometries(PAL) {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 8);
  const blob = new THREE.IcosahedronGeometry(1.0, 0);

  // 1. Lamp Post (iron post + base + roof + emissive glass)
  const lampPostOpaque = mergeGeometries([
    makePart(cyl, 0, 0.22, 0, 0, 0, 0, 0.28, 0.55, 0.28, PAL.iron, PAL.stoneShade, 0x181c1e, 0.65),
    makePart(cyl, 0, 0.62, 0, 0, 0, 0, 0.18, 0.35, 0.18, PAL.iron, PAL.stoneShade, 0x181c1e, 0.75),
    makePart(cyl, 0, 2.05, 0, 0, 0, 0, 0.08, 2.65, 0.08, PAL.iron, PAL.stoneShade, 0x181c1e, 0.8),
    // Top cross arm & bracket
    makePart(box, 0.28, 3.32, 0, 0, 0, 0, 0.68, 0.08, 0.08, PAL.iron, PAL.stoneShade, 0x181c1e, 0.85),
    makePart(box, 0.18, 3.16, 0, 0, 0, 0.65, 0.38, 0.06, 0.06, PAL.iron, PAL.stoneShade, 0x181c1e, 0.85),
    // Lantern cap & base frame at x = 0.52, y = 3.05
    makePart(cyl, 0.52, 3.22, 0, 0, Math.PI / 4, 0, 0.26, 0.14, 0.26, PAL.iron, PAL.stoneShade, 0x181c1e, 0.88),
    makePart(box, 0.52, 2.82, 0, 0, 0, 0, 0.22, 0.06, 0.22, PAL.iron, PAL.stoneShade, 0x181c1e, 0.85)
  ], false);

  const lampPostGlow = makePart(
    box, 0.52, 3.02, 0, 0, 0, 0, 0.20, 0.32, 0.20, 0xffffff, 0xffffff, 0xffdba0, 0.98
  );

  // 2. Box Hedge Segment (unit length 1.0m, 0.72m high, 0.52m wide with bevel top)
  const hedgeGeom = mergeGeometries([
    makePart(box, 0, 0.34, 0, 0, 0, 0, 1.02, 0.68, 0.52, PAL.mossDark, PAL.moss, 0x284020, 0.62),
    makePart(box, 0, 0.68, 0, 0, 0, 0, 0.92, 0.14, 0.42, PAL.moss, PAL.mossLight, PAL.mossDark, 0.82)
  ], false);

  // 3. Wooden Fence Segment (unit length 1.8m, two posts + two rails)
  const fenceGeom = mergeGeometries([
    makePart(box, -0.88, 0.48, 0, 0, 0, 0, 0.14, 1.06, 0.14, PAL.wood, 0x825c3a, 0x3b2816, 0.68),
    makePart(box, 0.88, 0.48, 0, 0, 0, 0, 0.14, 1.06, 0.14, PAL.wood, 0x825c3a, 0x3b2816, 0.68),
    makePart(box, 0, 0.74, 0, 0, 0, 0, 1.82, 0.10, 0.07, PAL.wood, 0x8a6440, 0x45301d, 0.78),
    makePart(box, 0, 0.38, 0, 0, 0, 0, 1.82, 0.10, 0.07, PAL.wood, 0x8a6440, 0x45301d, 0.74)
  ], false);

  // 4. Wooden Bench
  const benchGeom = mergeGeometries([
    makePart(box, -0.68, 0.24, 0, 0, 0, 0, 0.12, 0.48, 0.48, PAL.stoneMid, PAL.stoneLit, PAL.stoneCrevice, 0.7),
    makePart(box, 0.68, 0.24, 0, 0, 0, 0, 0.12, 0.48, 0.48, PAL.stoneMid, PAL.stoneLit, PAL.stoneCrevice, 0.7),
    makePart(box, 0, 0.48, 0, 0, 0, 0, 1.68, 0.09, 0.52, PAL.wood, 0x8a6440, 0x45301d, 0.8),
    makePart(box, 0, 0.82, -0.22, -0.15, 0, 0, 1.64, 0.34, 0.08, PAL.wood, 0x8a6440, 0x45301d, 0.82)
  ], false);

  // 5. Barrel
  const barrelGeom = mergeGeometries([
    makePart(cyl, 0, 0.42, 0, 0, 0, 0, 0.34, 0.84, 0.34, PAL.wood, 0x86603c, 0x3a2615, 0.68),
    makePart(cyl, 0, 0.64, 0, 0, 0, 0, 0.355, 0.07, 0.355, PAL.iron, PAL.stoneShade, 0x181c1e, 0.8),
    makePart(cyl, 0, 0.22, 0, 0, 0, 0, 0.355, 0.07, 0.355, PAL.iron, PAL.stoneShade, 0x181c1e, 0.75)
  ], false);

  // 6. Crate
  const crateGeom = mergeGeometries([
    makePart(box, 0, 0.38, 0, 0, 0, 0, 0.76, 0.76, 0.76, PAL.wood, 0x8e6844, 0x3d2817, 0.68),
    makePart(box, 0, 0.38, 0, 0, 0, 0, 0.80, 0.12, 0.80, PAL.timber, 0x4a3c32, 0x221c18, 0.75)
  ], false);

  // 7. Grain Sack & Hay Bale
  const sackGeom = makePart(blob, 0, 0.28, 0, 0.2, 0.4, 0, 0.38, 0.46, 0.34, PAL.dirt, 0xc8bfa8, 0x6e6656, 0.68);
  const hayGeom = makePart(box, 0, 0.32, 0, 0, 0, 0, 0.86, 0.58, 0.56, PAL.gold, 0xe6c875, 0x8c7232, 0.72);

  // 8. Flower Bed (stone border + soil + colorful blossoms)
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

  // 9. Paving Slab (for road variation & stepping stones)
  const paverGeom = makePart(cyl, 0, 0.025, 0, 0, 0.3, 0, 0.58, 0.06, 0.48, PAL.stoneLit, 0xd8e0e4, PAL.stoneShade, 0.82);

  // 10. Grass Tuft (crossed blades + small flower)
  const grassGeom = mergeGeometries([
    makePart(box, 0, 0.14, 0, 0.12, 0.2, 0, 0.32, 0.28, 0.04, PAL.moss, PAL.mossLight, PAL.mossDark, 0.65),
    makePart(box, 0, 0.15, 0, -0.1, 1.25, 0, 0.32, 0.30, 0.04, PAL.moss, PAL.mossLight, PAL.mossDark, 0.65),
    makePart(box, 0, 0.12, 0, 0.15, 2.3, 0, 0.28, 0.24, 0.04, PAL.mossDark, PAL.mossLight, PAL.mossDark, 0.65)
  ], false);

  // 11. Pebble / Fallen Leaf / Small Flower cluster
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

function buildRoadsAndCurbs(getY, PAL) {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const roadParts = [];
  const paverTransforms = [];
  const rng = mulberry32(77312);

  for (let rIdx = 0; rIdx < ROAD_SPECS.length; rIdx++) {
    const rd = ROAD_SPECS[rIdx];
    const dx = rd.x2 - rd.x1;
    const dz = rd.z2 - rd.z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const steps = Math.max(4, Math.ceil(len / 2.4));
    const stepLen = len / steps;
    const nx = Math.cos(angle);
    const nz = -Math.sin(angle);

    for (let s = 0; s < steps; s++) {
      const t0 = (s + 0.5) / steps;
      const cx = rd.x1 + dx * t0;
      const cz = rd.z1 + dz * t0;
      const gy = getY(cx, cz);

      // Alternating running-bond flagstone slabs (distinct from Landing Area radial rings)
      const cols = rd.w >= 4.0 ? 3 : 2;
      const slabW = (rd.w - 0.36) / cols;
      for (let c = 0; c < cols; c++) {
        const lat = (c - (cols - 1) * 0.5) * (slabW + 0.06);
        const stagger = ((s + c) % 2 === 0 ? 0.12 : -0.12);
        const sx = cx + nx * lat + Math.sin(angle) * stagger;
        const sz = cz + nz * lat + Math.cos(angle) * stagger;
        const sy = getY(sx, sz);
        const shadePick = (s + c + rIdx) % 3;
        const colBase = shadePick === 0 ? PAL.stoneLit : shadePick === 1 ? PAL.stoneMid : PAL.groundLight;
        roadParts.push(
          makePart(box, sx, sy + 0.018, sz, 0, angle, 0, slabW * 0.94, 0.08, stepLen * 0.92, colBase, 0xd8e0e4, PAL.stoneCrevice, 0.78)
        );
      }

      // Mossy joint strip down center & edges
      if (s % 2 === 0) {
        roadParts.push(
          makePart(box, cx, gy + 0.012, cz, 0, angle, 0, rd.w * 0.82, 0.05, stepLen * 0.96, PAL.mossDark, PAL.moss, PAL.stoneCrevice, 0.75)
        );
      }

      // Raised stone curbs on both sides with occasional worn breaks
      for (const side of [-1, 1]) {
        if ((s + rIdx + (side > 0 ? 1 : 0)) % 5 === 0) continue; // worn break for drainage/paths
        const kx = cx + nx * side * (rd.w * 0.5 + 0.14);
        const kz = cz + nz * side * (rd.w * 0.5 + 0.14);
        if (!isClearOfDoors(kx, kz, -0.4)) continue;
        const ky = getY(kx, kz);
        roadParts.push(
          makePart(box, kx, ky + 0.05, kz, 0, angle, 0, 0.26, 0.15, stepLen * 0.88, PAL.stoneMid, PAL.stoneLit, PAL.mossDark, 0.72)
        );
      }

      // Scattered decorative flagstones at worn edges
      if (rng() < 0.65) {
        const lat = (rng() - 0.5) * (rd.w + 0.5);
        const px = cx + nx * lat;
        const pz = cz + nz * lat;
        const py = getY(px, pz);
        paverTransforms.push({
          x: px,
          y: py + 0.015,
          z: pz,
          rotY: angle + (rng() - 0.5) * 0.6,
          sx: 0.7 + rng() * 0.6,
          sy: 1.0,
          sz: 0.7 + rng() * 0.6,
          tint: rng()
        });
      }
    }
  }

  // Stepping stones along each cottage door corridor
  for (const c of COTTAGE_SPECS) {
    for (let i = 0; i < 4; i++) {
      const pz = c.doorZ + 0.45 + i * 0.58;
      const px = c.doorX + (i % 2 === 0 ? -0.12 : 0.12);
      const py = getY(px, pz);
      paverTransforms.push({
        x: px,
        y: py + 0.016,
        z: pz,
        rotY: i * 0.4,
        sx: 0.85,
        sy: 1.0,
        sz: 0.68,
        tint: (i % 3) * 0.35
      });
    }
  }

  box.dispose();
  return {
    roadGeometry: mergeGeometries(roadParts, false),
    paverTransforms
  };
}

function buildUniqueVillageStructures(getY, PAL, colliders, anchors, blockers, layout) {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 10);
  const rock = new THREE.IcosahedronGeometry(1, 1);
  const parts = [];
  const glowParts = [];

  // 1. Residences Zone Entrance Arch & Signpost at (-18.0, gy, -4.0), leaving door (-18,0,-4) clear!
  // We straddle the path at z = -4.0 with stone pillars at z = -6.2 and z = -1.8 (4.4m clear span)
  const gx = -18.0;
  const gz = -4.0;
  const gy = getY(gx, gz);
  parts.push(
    // South & North Stone Pillars
    makePart(box, gx, gy + 1.9, gz - 2.25, 0, 0, 0, 0.78, 4.2, 0.78, PAL.stoneMid, PAL.stoneLit, PAL.stoneCrevice, 0.68),
    makePart(box, gx, gy + 1.9, gz + 2.25, 0, 0, 0, 0.78, 4.2, 0.78, PAL.stoneMid, PAL.stoneLit, PAL.stoneCrevice, 0.68),
    makePart(box, gx, gy + 0.25, gz - 2.25, 0, 0, 0, 0.98, 0.65, 0.98, PAL.stoneShade, PAL.moss, PAL.stoneCrevice, 0.65),
    makePart(box, gx, gy + 0.25, gz + 2.25, 0, 0, 0, 0.98, 0.65, 0.98, PAL.stoneShade, PAL.moss, PAL.stoneCrevice, 0.65),
    // Overhead Timber & Slate Arch Beam at y = gy + 4.05 (plenty of headroom)
    makePart(box, gx, gy + 3.95, gz, 0, 0, 0, 0.42, 0.32, 5.4, PAL.timber, 0x3d3632, 0x1c1816, 0.8),
    makePart(box, gx, gy + 4.25, gz, 0, 0, 0, 0.68, 0.22, 5.6, PAL.slate, 0x677582, 0x333c44, 0.85),
    // Decorative plaque on the arch (the readable zone sign is the signpost below)
    makePart(box, gx + 0.22, gy + 3.55, gz, 0, 0, 0, 0.14, 0.56, 1.85, PAL.plaqueFrame, PAL.stoneLit, PAL.iron, 0.85),
    makePart(box, gx + 0.26, gy + 3.55, gz, 0, 0, 0, 0.10, 0.44, 1.68, PAL.plaqueBronze, PAL.teal, 0x2c3834, 0.88)
  );
  colliders.push(
    { type: 'circle', x: gx, z: gz - 2.25, r: 0.52 },
    { type: 'circle', x: gx, z: gz + 2.25, r: 0.52 }
  );

  // Residences signpost: post on the ground, board 2m above it, facing the road
  const resSign = getSignLayout(layout, 'residences');
  if (resSign) {
    const postH = resSign.post.height;
    parts.push(
      makePart(box, resSign.x, resSign.groundY + (postH + 0.12) * 0.5, resSign.z,
        0, resSign.rotY, 0, resSign.post.width, postH + 0.12, resSign.post.width,
        PAL.timber, 0x3d3632, 0x1c1816, 0.72),
      makePart(box, resSign.x, resSign.boardY, resSign.z,
        0, resSign.rotY, 0, resSign.board.width, resSign.board.height, resSign.board.depth,
        PAL.slate, 0x677582, 0x333c44, 0.8),
      // Teal trim along the lower edge, clear of the text in the middle
      makePart(box, resSign.x, resSign.boardY - resSign.board.height * 0.5 + 0.1, resSign.z,
        0, resSign.rotY, 0, resSign.board.width - 0.3, 0.06, resSign.board.depth + 0.02,
        PAL.teal, 0xb8f8ff, 0x6fe0f0, 0.95)
    );
    anchors['sign_residences'] = new THREE.Vector3(resSign.x, resSign.boardY, resSign.z);
  }

  // 2. Two Village Stone Wells with Timber Roofs & Buckets
  const wells = [
    { x: -25.0, z: -6.2 },
    { x: -13.5, z: -11.5 }
  ];
  for (const w of wells) {
    const wy = getY(w.x, w.z);
    parts.push(
      makePart(cyl, w.x, wy + 0.42, w.z, 0, 0, 0, 1.15, 0.95, 1.15, PAL.stoneMid, PAL.stoneLit, PAL.mossDark, 0.68),
      makePart(cyl, w.x, wy + 0.86, w.z, 0, 0, 0, 1.24, 0.14, 1.24, PAL.stoneLit, 0xdce2e6, PAL.stoneShade, 0.8),
      // Inner water surface (teal-tinted stone/water, never a black void)
      makePart(cyl, w.x, wy + 0.65, w.z, 0, 0, 0, 0.92, 0.08, 0.92, PAL.strataTeal, PAL.teal, PAL.strataDeep, 0.9),
      // Timber roof posts & pitched slate canopy
      makePart(box, w.x - 0.95, wy + 1.65, w.z, 0, 0, 0, 0.14, 1.65, 0.14, PAL.timber, 0x3d3632, 0x1c1816, 0.78),
      makePart(box, w.x + 0.95, wy + 1.65, w.z, 0, 0, 0, 0.14, 1.65, 0.14, PAL.timber, 0x3d3632, 0x1c1816, 0.78),
      makePart(box, w.x, wy + 2.15, w.z, 0, 0, Math.PI / 2, 0.12, 1.9, 0.12, PAL.wood, 0x825c3a, 0x3b2816, 0.8),
      makePart(box, w.x, wy + 2.62, w.z - 0.42, 0.48, 0, 0, 2.35, 0.12, 1.12, PAL.slate, 0x677582, 0x333c44, 0.82),
      makePart(box, w.x, wy + 2.62, w.z + 0.42, -0.48, 0, 0, 2.35, 0.12, 1.12, PAL.slate, 0x677582, 0x333c44, 0.82),
      makePart(cyl, w.x, wy + 1.45, w.z, 0, 0, 0, 0.22, 0.32, 0.22, PAL.wood, 0x825c3a, 0x3b2816, 0.78)
    );
    colliders.push({ type: 'circle', x: w.x, z: w.z, r: 1.28 });
  }

  // 3. Stone Water Troughs
  const troughs = [
    { x: -15.2, z: -15.2, rotY: 0.3 },
    { x: -11.5, z: 12.5, rotY: -0.5 },
    { x: 4.5, z: 16.5, rotY: 1.1 }
  ];
  for (const tr of troughs) {
    const ty = getY(tr.x, tr.z);
    parts.push(
      makePart(box, tr.x, ty + 0.32, tr.z, 0, tr.rotY, 0, 1.85, 0.68, 0.82, PAL.stoneMid, PAL.stoneLit, PAL.mossDark, 0.68),
      makePart(box, tr.x, ty + 0.56, tr.z, 0, tr.rotY, 0, 1.58, 0.12, 0.56, PAL.strataTeal, PAL.teal, PAL.strataDeep, 0.88)
    );
    colliders.push({ type: 'box', x: tr.x, z: tr.z, w: 1.9, d: 0.85, rotY: tr.rotY });
  }

  // 4. Wooden Supply Carts (near Residences & Mess Hall road)
  const carts = [
    { x: -12.5, z: -6.8, rotY: 0.45 },
    { x: 14.5, z: 31.0, rotY: -0.75 }
  ];
  for (const ct of carts) {
    const cy = getY(ct.x, ct.z);
    const cos = Math.cos(ct.rotY);
    const sin = Math.sin(ct.rotY);
    parts.push(
      // Cart bed & side rails
      makePart(box, ct.x, cy + 0.68, ct.z, 0, ct.rotY, 0, 1.55, 0.14, 2.25, PAL.wood, 0x8a6440, 0x3d2817, 0.75),
      makePart(box, ct.x - cos * 0.72, cy + 0.98, ct.z + sin * 0.72, 0, ct.rotY, 0, 0.10, 0.52, 2.20, PAL.wood, 0x8a6440, 0x3d2817, 0.78),
      makePart(box, ct.x + cos * 0.72, cy + 0.98, ct.z - sin * 0.72, 0, ct.rotY, 0, 0.10, 0.52, 2.20, PAL.wood, 0x8a6440, 0x3d2817, 0.78),
      // Wheels
      makePart(cyl, ct.x - cos * 0.84, cy + 0.48, ct.z + sin * 0.84, 0, ct.rotY, Math.PI / 2, 0.48, 0.12, 0.48, PAL.timber, PAL.wood, 0x1c1816, 0.7),
      makePart(cyl, ct.x + cos * 0.84, cy + 0.48, ct.z - sin * 0.84, 0, ct.rotY, Math.PI / 2, 0.48, 0.12, 0.48, PAL.timber, PAL.wood, 0x1c1816, 0.7),
      // Cargo sacks inside cart
      makePart(rock, ct.x, cy + 0.96, ct.z - 0.3, 0, ct.rotY, 0, 0.52, 0.38, 0.62, PAL.dirt, 0xd0c6b0, 0x6e6452, 0.8)
    );
    colliders.push({ type: 'box', x: ct.x, z: ct.z, w: 1.75, d: 2.35, rotY: ct.rotY });
  }

  // 5. Directional Signposts at Road Junctions
  const signposts = [
    { x: 7.2, z: -6.8, rotY: 0.4 },
    { x: 16.5, z: 14.5, rotY: -0.8 },
    { x: -9.5, z: 6.5, rotY: 1.1 }
  ];
  for (const sp of signposts) {
    const sy = getY(sp.x, sp.z);
    parts.push(
      makePart(cyl, sp.x, sy + 1.25, sp.z, 0, 0, 0, 0.10, 2.6, 0.10, PAL.timber, PAL.wood, 0x1c1816, 0.72),
      makePart(box, sp.x + 0.35, sy + 2.15, sp.z, 0, sp.rotY, 0, 0.88, 0.24, 0.07, PAL.wood, 0x946c46, 0x45301d, 0.82),
      makePart(box, sp.x - 0.32, sy + 1.85, sp.z, 0, sp.rotY + 1.2, 0, 0.82, 0.22, 0.07, PAL.wood, 0x946c46, 0x45301d, 0.82)
    );
  }

  // 6. Hanging Laundry Lines & Festoon Lantern Lines between Cottage Rows (high up at y = gy + 3.6m so heroes walk freely underneath)
  const festoonPairs = [
    { c1: COTTAGE_SPECS[0], c2: COTTAGE_SPECS[5], laundry: true },
    { c1: COTTAGE_SPECS[1], c2: COTTAGE_SPECS[6], laundry: false },
    { c1: COTTAGE_SPECS[2], c2: COTTAGE_SPECS[7], laundry: true },
    { c1: COTTAGE_SPECS[3], c2: COTTAGE_SPECS[8], laundry: false },
    { c1: COTTAGE_SPECS[4], c2: COTTAGE_SPECS[9], laundry: true }
  ];
  for (const fp of festoonPairs) {
    const x1 = fp.c1.x + 2.05;
    const z1 = fp.c1.z;
    const x2 = fp.c2.x - 2.05;
    const z2 = fp.c2.z;
    const mx = (x1 + x2) * 0.5;
    const mz = (z1 + z2) * 0.5;
    const my = getY(mx, mz) + 3.65;
    const span = Math.hypot(x2 - x1, z2 - z1);
    const ang = Math.atan2(x2 - x1, z2 - z1);

    parts.push(
      makePart(box, mx, my, mz, 0, ang, 0, 0.04, 0.04, span, PAL.iron, PAL.stoneShade, PAL.iron, 0.85)
    );

    const count = 4;
    for (let k = 1; k <= count; k++) {
      const t = k / (count + 1);
      const px = x1 + (x2 - x1) * t;
      const pz = z1 + (z2 - z1) * t;
      const sag = Math.sin(t * Math.PI) * 0.28;
      const py = my - sag;

      if (fp.laundry && k % 2 === 1) {
        const clothCol = k === 1 ? PAL.plaster : 0xc4d4dc;
        parts.push(
          makePart(box, px, py - 0.34, pz, 0.06, ang, 0, 0.05, 0.62, 0.48, clothCol, 0xffffff, PAL.stoneShade, 0.88)
        );
      } else {
        // Hanging warm paper/iron lantern
        parts.push(
          makePart(box, px, py - 0.08, pz, 0, ang, 0, 0.18, 0.05, 0.18, PAL.iron, PAL.stoneShade, PAL.iron, 0.85)
        );
        glowParts.push(
          makePart(box, px, py - 0.20, pz, 0, ang, 0, 0.16, 0.22, 0.16, 0xffffff, 0xffffff, 0xffd89a, 0.98)
        );
      }
    }
  }

  // 7. Mossy Boulders near perimeter & garden corners
  const rockSpots = [
    [-38.5, -12.0, 1.3], [-36.5, 6.0, 1.1], [-28.0, 16.5, 1.2],
    [-12.0, -24.0, 1.4], [12.0, -24.0, 1.1], [28.0, 16.0, 1.3],
    [34.0, -12.0, 1.25], [-4.0, 28.0, 1.2], [-34.0, -22.0, 1.35]
  ];
  for (const rs of rockSpots) {
    const rx = rs[0];
    const rz = rs[1];
    const sc = rs[2];
    if (!isClearOfRoads(rx, rz, 1.2) || !isClearOfDoors(rx, rz, 1.2)) continue;
    const ry = getY(rx, rz);
    parts.push(
      makePart(rock, rx, ry + sc * 0.35, rz, 0.3, rx * 0.5, 0.2, sc * 1.1, sc * 0.75, sc * 0.95, PAL.stoneMid, PAL.moss, PAL.stoneCrevice, 0.68)
    );
    colliders.push({ type: 'circle', x: rx, z: rz, r: sc * 0.85 });
    // The player collides with the boulder itself, not with the camera list.
    if (blockers) {
      blockers.push({ type: 'circle', x: rx, z: rz, r: sc * PROP_COLLIDERS.boulder });
    }
  }

  box.dispose();
  cyl.dispose();
  rock.dispose();

  return {
    uniqueOpaque: mergeGeometries(parts, false),
    uniqueLanternGlow: mergeGeometries(glowParts, false)
  };
}

function generateLayoutPlacements(getY, PAL) {
  const rng = mulberry32(10503);
  const hedges = [];
  const fences = [];
  const benches = [];
  const barrels = [];
  const crates = [];
  const sacks = [];
  const hays = [];
  const flowerBeds = [];
  const trees = [];
  const grass = [];
  const pebbles = [];
  const propColliders = [];
  // Player-only obstacle shapes (see src/art/town/collision.js for the format).
  const blockers = [];

  // 1. Per-Cottage Hedged Gardens, Flower Beds, Trees & Side Props
  for (let i = 0; i < COTTAGE_SPECS.length; i++) {
    const c = COTTAGE_SPECS[i];
    const gy = getY(c.x, c.z);

    // Low dark-green box hedges framing the front-right & side garden (strictly clear of door x = c.doorX = c.x - 0.8)
    const hFrontZ = c.z + 3.05;
    hedges.push(
      { x: c.x + 0.65, y: getY(c.x + 0.65, hFrontZ), z: hFrontZ, rotY: 0, sx: 1.25, sy: 1.0, sz: 1.0 },
      { x: c.x + 1.85, y: getY(c.x + 1.85, hFrontZ), z: hFrontZ, rotY: 0, sx: 1.20, sy: 1.0, sz: 1.0 },
      { x: c.x + 2.45, y: getY(c.x + 2.45, c.z + 2.15), z: c.z + 2.15, rotY: Math.PI / 2, sx: 1.45, sy: 1.0, sz: 1.0 },
      { x: c.x - 2.45, y: getY(c.x - 2.45, c.z - 0.6), z: c.z - 0.6, rotY: Math.PI / 2, sx: 1.65, sy: 0.95, sz: 1.0 }
    );

    // Flower beds in each cottage garden
    flowerBeds.push(
      { x: c.x + 1.15, y: getY(c.x + 1.15, c.z + 2.35), z: c.z + 2.35, rotY: 0, sc: 0.95 },
      { x: c.x - 2.45, y: getY(c.x - 2.45, c.z + 0.95), z: c.z + 0.95, rotY: Math.PI / 2, sc: 0.85 }
    );

    // 2 to 3 Garden Trees per cottage (24 cottage garden trees total)
    const gt1x = c.x - 2.85;
    const gt1z = c.z - 1.85;
    const gt2x = c.x + 2.85;
    const gt2z = c.z - 1.75;
    const treeCandidates = [
      { x: gt1x, z: gt1z, sc: 0.78 + (i % 3) * 0.08, variant: i % 3 },
      { x: gt2x, z: gt2z, sc: 0.82 + ((i + 1) % 3) * 0.08, variant: (i + 1) % 3 }
    ];
    if (i % 2 === 0) {
      treeCandidates.push({ x: c.x + 2.75, z: c.z + 2.65, sc: 0.72, variant: (i + 2) % 3 });
    }
    for (const tc of treeCandidates) {
      if (isClearOfRoads(tc.x, tc.z, 0.6) && isClearOfDoors(tc.x, tc.z, 0.5)) {
        trees.push({
          x: tc.x,
          y: getY(tc.x, tc.z),
          z: tc.z,
          rotY: rng() * Math.PI * 2,
          sc: tc.sc,
          variant: tc.variant,
          hasCollider: tc.sc >= 0.85
        });
      }
    }

    // Barrels, Crates, Sacks & Benches tucked neatly beside cottage walls
    const bx = c.x + 2.25;
    const bz = c.z - 1.25;
    barrels.push({ x: bx, y: getY(bx, bz), z: bz, rotY: i * 0.7, sc: 0.95 });
    propColliders.push({ type: 'circle', x: bx, z: bz, r: 0.38 });

    if (i % 2 === 0) {
      const cx = c.x - 2.25;
      const cz = c.z - 1.55;
      crates.push({ x: cx, y: getY(cx, cz), z: cz, rotY: 0.25 + i * 0.3, sc: 0.92 });
      sacks.push({ x: cx + 0.45, y: getY(cx + 0.45, cz + 0.2), z: cz + 0.2, rotY: i, sc: 0.95 });
      propColliders.push({ type: 'circle', x: cx, z: cz, r: 0.48 });
    } else {
      const hx = c.x + 2.25;
      const hz = c.z - 0.45;
      hays.push({ x: hx, y: getY(hx, hz), z: hz, rotY: 1.57, sc: 0.9 });
    }

    if (i % 3 === 0) {
      const benchX = c.x + 1.15;
      const benchZ = c.z + 3.55;
      if (isClearOfRoads(benchX, benchZ, 0.3) && isClearOfDoors(benchX, benchZ, 0.2)) {
        benches.push({ x: benchX, y: getY(benchX, benchZ), z: benchZ, rotY: 0, sc: 0.92 });
      }
    }
  }

  // 2. Wooden Fences bordering the outer western/southern Residences perimeter and road edges
  const fenceLines = [
    { x1: -36.5, z1: -17.0, x2: -30.5, z2: 12.5, count: 14 },
    { x1: -35.5, z1: -17.5, x2: -21.5, z2: -19.0, count: 7 },
    { x1: -13.0, z1: -16.5, x2: -11.5, z2: -6.8, count: 5 },
    { x1: -11.5, z1: -1.2, x2: -10.5, z2: 9.5, count: 6 },
    { x1: -10.0, z1: 15.5, x2: -4.0, z2: 22.0, count: 5 },
    { x1: 10.5, z1: 20.0, x2: 4.5, z2: 31.0, count: 6 }
  ];
  for (const fl of fenceLines) {
    const dx = fl.x2 - fl.x1;
    const dz = fl.z2 - fl.z1;
    const rotY = Math.atan2(dx, dz) + Math.PI / 2;
    const lineLen = Math.hypot(dx, dz);
    const spacing = lineLen / fl.count;
    const placed = [];
    for (let s = 0; s < fl.count; s++) {
      const t = (s + 0.5) / fl.count;
      const fx = fl.x1 + dx * t;
      const fz = fl.z1 + dz * t;
      if (!isClearOfDoors(fx, fz, 0.6) || !isClearOfRoads(fx, fz, 0.4)) continue;
      fences.push({ x: fx, y: getY(fx, fz), z: fz, rotY, sc: 1.0 });
      propColliders.push({ type: 'box', x: fx, z: fz, w: 1.8, d: 0.25, rotY });
      placed.push({ x: fx, z: fz });
    }

    // One blocker per straight fence run (never one per post): consecutive
    // fences form a single wall, a skipped fence ends the run.
    const maxGap = spacing * 1.6;
    let runStart = 0;
    while (runStart < placed.length) {
      let runEnd = runStart;
      while (runEnd + 1 < placed.length) {
        const gap = Math.hypot(
          placed[runEnd + 1].x - placed[runEnd].x,
          placed[runEnd + 1].z - placed[runEnd].z
        );
        if (gap > maxGap) break;
        runEnd++;
      }
      const a = placed[runStart];
      const b = placed[runEnd];
      const runLen = Math.hypot(b.x - a.x, b.z - a.z);
      blockers.push({
        type: 'box',
        x: (a.x + b.x) * 0.5,
        z: (a.z + b.z) * 0.5,
        hx: runLen * 0.5 + PROP_COLLIDERS.fenceHalfLength,
        hz: PROP_COLLIDERS.fenceHalfThickness,
        // The long axis follows the fence line (a lone fence has no direction
        // of its own): rot so the box axis (cos rot, -sin rot) points along it.
        rot: Math.atan2(-dz / lineLen, dx / lineLen)
      });
      runStart = runEnd + 1;
    }
  }

  // Extra Plaza & Road Benches + Props
  const extraBenches = [
    { x: 5.5, z: -9.8, rotY: 0.35 },
    { x: 18.5, z: 3.2, rotY: -2.1 },
    { x: 13.8, z: 14.0, rotY: 1.4 },
    { x: -7.5, z: -6.5, rotY: -0.2 },
    { x: -12.5, z: 5.5, rotY: 1.75 },
    { x: 21.5, z: -16.5, rotY: -0.9 }
  ];
  for (const eb of extraBenches) {
    if (isClearOfRoads(eb.x, eb.z, 0.4) && isClearOfLandmarks(eb.x, eb.z, 0.2)) {
      benches.push({ x: eb.x, y: getY(eb.x, eb.z), z: eb.z, rotY: eb.rotY, sc: 1.0 });
      propColliders.push({ type: 'box', x: eb.x, z: eb.z, w: 1.65, d: 0.55, rotY: eb.rotY });
    }
  }

  const propClusters = [
    { x: -12.0, z: -13.5 },
    { x: 2.5, z: -18.5 },
    { x: 15.5, z: 32.5 },
    { x: 24.5, z: 14.5 },
    { x: -13.5, z: 16.0 }
  ];
  for (let i = 0; i < propClusters.length; i++) {
    const pc = propClusters[i];
    if (!isClearOfRoads(pc.x, pc.z, 0.8)) continue;
    barrels.push({ x: pc.x, y: getY(pc.x, pc.z), z: pc.z, rotY: i * 1.1, sc: 1.0 });
    crates.push({ x: pc.x + 0.72, y: getY(pc.x + 0.72, pc.z + 0.2), z: pc.z + 0.2, rotY: 0.4 + i, sc: 0.98 });
    sacks.push({ x: pc.x + 0.35, y: getY(pc.x + 0.35, pc.z - 0.55), z: pc.z - 0.55, rotY: i * 0.8, sc: 1.0 });
    propColliders.push({ type: 'circle', x: pc.x + 0.3, z: pc.z, r: 0.85 });
  }

  // 3. Open Town Trees (Required 4 layout trees + 56 curated grove trees = ~84 total trees)
  const mandatoryTrees = [
    { x: 8.0, z: -14.0, r: 1.2 },
    { x: 22.0, z: -16.0, r: 1.2 },
    { x: 10.0, z: 12.0, r: 1.1 },
    { x: -8.0, z: 6.0, r: 1.1 }
  ];
  for (let i = 0; i < mandatoryTrees.length; i++) {
    const mt = mandatoryTrees[i];
    trees.push({
      x: mt.x,
      y: getY(mt.x, mt.z),
      z: mt.z,
      rotY: i * 1.5,
      sc: mt.r,
      variant: i % 3,
      hasCollider: true
    });
  }

  // Curated candidate groves between zones & near inner wall perimeter (never on roads or landmarks)
  let attempts = 0;
  while (trees.length < 80 && attempts < 900) {
    attempts++;
    const angle = rng() * Math.PI * 2;
    const rad = 11.0 + Math.pow(rng(), 0.75) * 31.5;
    const tx = Math.cos(angle) * rad;
    const tz = Math.sin(angle) * rad;

    if (!isInsideDodecagon(tx, tz, 42.2)) continue;
    if (!isClearOfLandmarks(tx, tz, 1.8)) continue;
    if (!isClearOfRoads(tx, tz, 1.65)) continue;
    if (!isClearOfDoors(tx, tz, 1.8)) continue;
    if (!isClearOfCottages(tx, tz, 1.5)) continue;

    let tooClose = false;
    for (const other of trees) {
      const d2 = (tx - other.x) * (tx - other.x) + (tz - other.z) * (tz - other.z);
      if (d2 < 10.5) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    const sc = 0.78 + rng() * 0.48;
    trees.push({
      x: tx,
      y: getY(tx, tz),
      z: tz,
      rotY: rng() * Math.PI * 2,
      sc,
      variant: trees.length % 3,
      hasCollider: sc >= 0.95
    });
  }

  for (const t of trees) {
    if (t.hasCollider) {
      propColliders.push({ type: 'circle', x: t.x, z: t.z, r: 0.42 * t.sc });
    }
    // The player collides with the trunk only, never with the leaves.
    blockers.push({ type: 'circle', x: t.x, z: t.z, r: PROP_COLLIDERS.treeTrunk * t.sc });
  }

  // Solid props the hero cannot walk through.
  for (const b of barrels) {
    blockers.push({ type: 'circle', x: b.x, z: b.z, r: PROP_COLLIDERS.barrel * b.sc });
  }
  for (const c of crates) {
    blockers.push({ type: 'circle', x: c.x, z: c.z, r: PROP_COLLIDERS.crate * c.sc });
  }

  // 4. Ground Detail: 1650 Grass Tufts & 450 Pebbles/Fallen Leaves scattered near roads, walls, cottages, and trees
  for (let i = 0; i < 1650; i++) {
    let gx = 0;
    let gz = 0;
    const mode = i % 3;
    if (mode === 0) {
      // Near road edges
      const rd = ROAD_SPECS[i % ROAD_SPECS.length];
      const t = rng();
      const side = rng() < 0.5 ? -1 : 1;
      const dx = rd.x2 - rd.x1;
      const dz = rd.z2 - rd.z1;
      const ang = Math.atan2(dx, dz);
      const offset = rd.w * 0.5 + 0.15 + rng() * 1.4;
      gx = rd.x1 + dx * t + Math.cos(ang) * side * offset;
      gz = rd.z1 + dz * t - Math.sin(ang) * side * offset;
    } else if (mode === 1) {
      // Around cottages and trees
      const ref = i % 2 === 0 ? COTTAGE_SPECS[i % COTTAGE_SPECS.length] : trees[i % trees.length];
      const a = rng() * Math.PI * 2;
      const r = 1.6 + rng() * 3.2;
      gx = ref.x + Math.cos(a) * r;
      gz = ref.z + Math.sin(a) * r;
    } else {
      // Scattered across green spaces and near outer wall
      const a = rng() * Math.PI * 2;
      const r = 8.0 + Math.sqrt(rng()) * 35.0;
      gx = Math.cos(a) * r;
      gz = Math.sin(a) * r;
    }

    if (!isInsideDodecagon(gx, gz, 43.8)) continue;
    if (!isClearOfRoads(gx, gz, -0.15, 9)) continue;
    if (!isClearOfCottages(gx, gz, 0.05)) continue;

    grass.push({
      x: gx,
      y: getY(gx, gz),
      z: gz,
      rotY: rng() * Math.PI * 2,
      sc: 0.65 + rng() * 0.75,
      tint: rng()
    });
  }

  for (let i = 0; i < 450; i++) {
    const rd = ROAD_SPECS[i % ROAD_SPECS.length];
    const t = rng();
    const side = rng() < 0.5 ? -1 : 1;
    const dx = rd.x2 - rd.x1;
    const dz = rd.z2 - rd.z1;
    const ang = Math.atan2(dx, dz);
    const offset = rd.w * 0.45 + rng() * 2.2;
    const px = rd.x1 + dx * t + Math.cos(ang) * side * offset;
    const pz = rd.z1 + dz * t - Math.sin(ang) * side * offset;
    if (!isInsideDodecagon(px, pz, 43.8)) continue;
    pebbles.push({
      x: px,
      y: getY(px, pz),
      z: pz,
      rotY: rng() * Math.PI * 2,
      sc: 0.6 + rng() * 0.9,
      tint: rng()
    });
  }

  return {
    hedges,
    fences,
    benches,
    barrels,
    crates,
    sacks,
    hays,
    flowerBeds,
    trees,
    grass,
    pebbles,
    propColliders,
    blockers
  };
}

function makeInstanced(geom, mat, items, colorCallback) {
  const count = Math.max(1, items.length);
  const mesh = new THREE.InstancedMesh(geom, mat, count);
  mesh.count = items.length;
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    dummy.position.set(it.x, it.y, it.z);
    dummy.rotation.set(0, it.rotY || 0, 0);
    dummy.scale.set(
      it.sx !== undefined ? it.sx : (it.sc || 1),
      it.sy !== undefined ? it.sy : (it.sc || 1),
      it.sz !== undefined ? it.sz : (it.sc || 1)
    );
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (colorCallback) {
      colorCallback(col, it, i);
      mesh.setColorAt(i, col);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}

export function buildTownVillage(ctx = {}) {
  const PAL = { ...DEFAULT_PALETTE, ...(ctx.PALETTE || {}) };
  const getY = typeof ctx.getGroundY === 'function' ? ctx.getGroundY : () => 0;
  const layout = ctx.layout || LAYOUT;
  let currentQuality = ctx.quality || 'high';
  const isNightInit = ctx.time === 'night' || ctx.time === 'dusk';

  const group = new THREE.Group();
  group.name = 'TownVillage';

  // 2 Procedural Canvas Textures (stone/plaster + foliage/bark)
  const texStone = createStonePlasterTexture();
  const texFoliage = createFoliageBarkTexture();

  // 6 Shared Materials (well under the 12-material ceiling)
  const matArchitecture = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texStone,
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.06
  });

  const matFoliage = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texFoliage,
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.02,
    emissive: new THREE.Color(PAL.teal),
    emissiveIntensity: isNightInit ? 0.06 : 0.0
  });

  const matProps = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.86,
    metalness: 0.08
  });

  const matWindowGlow = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PAL.warmWindow),
    vertexColors: true,
    roughness: 0.35,
    metalness: 0.0,
    emissive: new THREE.Color(PAL.warmWindow),
    emissiveIntensity: isNightInit ? 1.35 : 0.0
  });

  const matLampGlow = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xffdfa0),
    vertexColors: true,
    roughness: 0.25,
    metalness: 0.0,
    emissive: new THREE.Color(0xffaa44),
    emissiveIntensity: isNightInit ? 1.65 : 0.0
  });

  const materials = [matArchitecture, matFoliage, matProps, matWindowGlow, matLampGlow];
  const geometries = [];

  const colliders = [];
  // Player-only obstacle shapes (fences, tree trunks, boulders, barrels, crates).
  const blockers = [];
  const doors = [];
  const anchors = {};
  const lights = [];

  // 1. Roads, Curbs & Unique Village Structures
  const { roadGeometry, paverTransforms } = buildRoadsAndCurbs(getY, PAL);
  geometries.push(roadGeometry);
  const roadMesh = new THREE.Mesh(roadGeometry, matArchitecture);
  roadMesh.name = 'VillageRoads';
  group.add(roadMesh);

  const { uniqueOpaque, uniqueLanternGlow } = buildUniqueVillageStructures(getY, PAL, colliders, anchors, blockers, layout);
  geometries.push(uniqueOpaque, uniqueLanternGlow);
  const uniqueMesh = new THREE.Mesh(uniqueOpaque, matArchitecture);
  uniqueMesh.name = 'VillageUniqueStructures';
  group.add(uniqueMesh);

  const festoonGlowMesh = new THREE.Mesh(uniqueLanternGlow, matLampGlow);
  festoonGlowMesh.name = 'VillageFestoonLanterns';
  group.add(festoonGlowMesh);

  // 2. Residences Cottages (Instanced per variant + Distant LOD InstancedMesh + Colliders, Doors & Lantern Anchors)
  const cottageArch = buildCottageArchetypes(PAL);
  geometries.push(cottageArch.lodOpaque, cottageArch.lodWin);
  for (const v of cottageArch.variants) {
    geometries.push(v.opaque, v.windows, v.lantern);
  }

  const cottageByVariant = [[], [], [], []];
  const allCottageInstances = [];

  for (let i = 0; i < COTTAGE_SPECS.length; i++) {
    const c = COTTAGE_SPECS[i];
    const cy = getY(c.x, c.z);
    const inst = {
      spec: c,
      x: c.x,
      y: cy,
      z: c.z,
      rotY: 0,
      sc: 1.0,
      tint: i
    };
    cottageByVariant[c.variant].push(inst);
    allCottageInstances.push(inst);

    // Cottage footprint collider
    colliders.push({ type: 'box', x: c.x, z: c.z, w: 4.3, d: 3.7, rotY: 0 });

    // Cottage door entry
    const dy = getY(c.doorX, c.doorZ);
    doors.push({
      id: c.id,
      position: new THREE.Vector3(c.doorX, dy, c.doorZ),
      outward: new THREE.Vector3(0, 0, 1)
    });

    // Cottage door lantern anchor
    const lx = c.x - 1.58;
    const lz = c.z + 2.04;
    anchors[`lantern_${c.id}`] = new THREE.Vector3(lx, cy + 1.98, lz);
    anchors[`${c.id}_lantern`] = anchors[`lantern_${c.id}`];
  }

  // Also register the Residences zone door from layout
  doors.push({
    id: 'residences',
    position: new THREE.Vector3(-18.0, getY(-18.0, -4.0), -4.0),
    outward: new THREE.Vector3(1, 0, 0)
  });

  const cottageVariantMeshes = [];
  for (let v = 0; v < 4; v++) {
    const list = cottageByVariant[v];
    const mOpaque = makeInstanced(cottageArch.variants[v].opaque, matArchitecture, list, (col, it) => {
      const shift = (it.tint % 3 - 1) * 0.03;
      col.setRGB(1.0 + shift, 1.0 + shift * 0.5, 1.0 - shift);
    });
    const mWin = makeInstanced(cottageArch.variants[v].windows, matWindowGlow, list);
    const mLantern = makeInstanced(cottageArch.variants[v].lantern, matLampGlow, list);
    group.add(mOpaque, mWin, mLantern);
    cottageVariantMeshes.push({ list, mOpaque, mWin, mLantern });
  }

  const cottageLodOpaqueMesh = makeInstanced(cottageArch.lodOpaque, matArchitecture, allCottageInstances);
  const cottageLodWinMesh = makeInstanced(cottageArch.lodWin, matWindowGlow, allCottageInstances);
  cottageLodOpaqueMesh.count = 0;
  cottageLodWinMesh.count = 0;
  group.add(cottageLodOpaqueMesh, cottageLodWinMesh);

  // 3. Trees (3 Round-Crowned Variants + Distant LOD)
  const treeArch = buildTreeArchetypes(PAL);
  for (const tv of treeArch) {
    geometries.push(tv.trunk, tv.crown, tv.lod);
  }

  const placements = generateLayoutPlacements(getY, PAL);
  for (const pc of placements.propColliders) {
    colliders.push(pc);
  }
  for (const pb of placements.blockers) {
    blockers.push(pb);
  }

  const treesByVariant = [[], [], []];
  for (const t of placements.trees) {
    treesByVariant[t.variant % 3].push(t);
  }

  const treeVariantMeshes = [];
  for (let v = 0; v < 3; v++) {
    const list = treesByVariant[v];
    const mTrunk = makeInstanced(treeArch[v].trunk, matProps, list, (col, it, idx) => {
      const s = 0.92 + (idx % 4) * 0.04;
      col.setRGB(s, s * 0.98, s * 0.95);
    });
    const mCrown = makeInstanced(treeArch[v].crown, matFoliage, list, (col, it, idx) => {
      const s = 0.90 + (idx % 5) * 0.045;
      col.setRGB(s * 0.96, s * 1.03, s);
    });
    const mLod = makeInstanced(treeArch[v].lod, matFoliage, list);
    mLod.count = 0;
    group.add(mTrunk, mCrown, mLod);
    treeVariantMeshes.push({ list, mTrunk, mCrown, mLod });
  }

  // 4. Lamp Posts & PointLight descriptors
  const propGeoms = buildPropGeometries(PAL);
  Object.values(propGeoms).forEach((g) => geometries.push(g));

  const lampItems = [];
  for (const lp of LAMP_SPECS) {
    const ly = getY(lp.x, lp.z);
    lampItems.push({ x: lp.x, y: ly, z: lp.z, rotY: lp.rotY, sc: 1.0 });
    colliders.push({ type: 'circle', x: lp.x, z: lp.z, r: 0.35 });

    const lightPos = new THREE.Vector3(
      lp.x + Math.cos(lp.rotY) * 0.52,
      ly + 3.02,
      lp.z - Math.sin(lp.rotY) * 0.52
    );
    anchors[lp.id] = lightPos.clone();

    if (!lp.extra) {
      lights.push({
        position: lightPos,
        color: lp.color,
        intensity: isNightInit ? lp.intensity : 0.0,
        baseIntensity: lp.intensity,
        distance: lp.distance
      });
    }
  }

  const lampOpaqueMesh = makeInstanced(propGeoms.lampPostOpaque, matArchitecture, lampItems);
  const lampGlowMesh = makeInstanced(propGeoms.lampPostGlow, matLampGlow, lampItems);
  group.add(lampOpaqueMesh, lampGlowMesh);

  // 5. Instanced Village Props & Ground Details
  const hedgeMesh = makeInstanced(propGeoms.hedgeGeom, matFoliage, placements.hedges, (col, it, idx) => {
    const v = 0.92 + (idx % 3) * 0.05;
    col.setRGB(v * 0.95, v * 1.02, v);
  });
  const fenceMesh = makeInstanced(propGeoms.fenceGeom, matProps, placements.fences);
  const benchMesh = makeInstanced(propGeoms.benchGeom, matProps, placements.benches);
  const barrelMesh = makeInstanced(propGeoms.barrelGeom, matProps, placements.barrels);
  const crateMesh = makeInstanced(propGeoms.crateGeom, matProps, placements.crates);
  const sackMesh = makeInstanced(propGeoms.sackGeom, matProps, placements.sacks);
  const hayMesh = makeInstanced(propGeoms.hayGeom, matProps, placements.hays);
  const flowerBedMesh = makeInstanced(propGeoms.flowerBedGeom, matProps, placements.flowerBeds);
  const paverMesh = makeInstanced(propGeoms.paverGeom, matArchitecture, paverTransforms, (col, it) => {
    const v = 0.90 + it.tint * 0.16;
    col.setRGB(v, v * 1.01, v * 1.02);
  });
  const grassMesh = makeInstanced(propGeoms.grassGeom, matFoliage, placements.grass, (col, it) => {
    const v = 0.86 + it.tint * 0.26;
    col.setRGB(v * 0.94, v * 1.04, v * 0.98);
  });
  const pebbleMesh = makeInstanced(propGeoms.pebbleGeom, matProps, placements.pebbles, (col, it) => {
    if (it.tint > 0.72) {
      col.setHex(0x6fe0f0); // fallen blue-teal leaf accent
    } else if (it.tint > 0.52) {
      col.setHex(0xffd28a); // tiny wildflower glint
    } else {
      const v = 0.85 + it.tint * 0.25;
      col.setRGB(v, v, v);
    }
  });

  group.add(
    hedgeMesh,
    fenceMesh,
    benchMesh,
    barrelMesh,
    crateMesh,
    sackMesh,
    hayMesh,
    flowerBedMesh,
    paverMesh,
    grassMesh,
    pebbleMesh
  );

  // Reusable scratch objects for allocation-free LOD & update
  const _dummy = new THREE.Object3D();
  let _lodTimer = 0;
  let _lastLampGlow = isNightInit ? 1.0 : 0.0;
  let _lastWindowGlow = isNightInit ? 1.0 : 0.0;
  let _timeAccum = 0;

  function applyQualityCounts(q) {
    currentQuality = q || 'high';
    const scale = currentQuality === 'low' ? 0.30 : currentQuality === 'medium' ? 0.60 : 1.0;

    grassMesh.count = Math.floor(placements.grass.length * scale);
    pebbleMesh.count = Math.floor(placements.pebbles.length * scale);
    paverMesh.count = Math.floor(paverTransforms.length * (currentQuality === 'low' ? 0.45 : currentQuality === 'medium' ? 0.75 : 1.0));
    flowerBedMesh.count = Math.max(4, Math.floor(placements.flowerBeds.length * (currentQuality === 'low' ? 0.5 : 1.0)));
    sackMesh.count = Math.max(2, Math.floor(placements.sacks.length * scale));
    hayMesh.count = Math.max(2, Math.floor(placements.hays.length * scale));

    const treeRatio = currentQuality === 'low' ? 0.42 : currentQuality === 'medium' ? 0.72 : 1.0;
    for (let v = 0; v < 3; v++) {
      const tv = treeVariantMeshes[v];
      const activeCount = Math.max(4, Math.floor(tv.list.length * treeRatio));
      tv.mTrunk.count = activeCount;
      tv.mCrown.count = activeCount;
      tv.mLod.count = 0;
    }

    for (let v = 0; v < 4; v++) {
      const cv = cottageVariantMeshes[v];
      cv.mOpaque.count = cv.list.length;
      cv.mWin.count = cv.list.length;
      cv.mLantern.count = cv.list.length;
    }
    cottageLodOpaqueMesh.count = 0;
    cottageLodWinMesh.count = 0;
  }

  applyQualityCounts(currentQuality);

  function updateDistanceLOD(camera) {
    if (!camera || !camera.position) return;
    const camX = camera.position.x;
    const camZ = camera.position.z;

    // Swap far cottages (> 64m) to low-poly LOD on high/medium
    const cottageDistSq = 64 * 64;
    let lodCottageIdx = 0;

    for (let v = 0; v < 4; v++) {
      const cv = cottageVariantMeshes[v];
      let nearIdx = 0;
      for (let i = 0; i < cv.list.length; i++) {
        const it = cv.list[i];
        const dx = it.x - camX;
        const dz = it.z - camZ;
        const d2 = dx * dx + dz * dz;
        _dummy.position.set(it.x, it.y, it.z);
        _dummy.rotation.set(0, it.rotY, 0);
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();

        if (d2 > cottageDistSq && currentQuality !== 'low') {
          cottageLodOpaqueMesh.setMatrixAt(lodCottageIdx, _dummy.matrix);
          cottageLodWinMesh.setMatrixAt(lodCottageIdx, _dummy.matrix);
          lodCottageIdx++;
        } else {
          cv.mOpaque.setMatrixAt(nearIdx, _dummy.matrix);
          cv.mWin.setMatrixAt(nearIdx, _dummy.matrix);
          cv.mLantern.setMatrixAt(nearIdx, _dummy.matrix);
          nearIdx++;
        }
      }
      cv.mOpaque.count = nearIdx;
      cv.mWin.count = nearIdx;
      cv.mLantern.count = nearIdx;
      cv.mOpaque.instanceMatrix.needsUpdate = true;
      cv.mWin.instanceMatrix.needsUpdate = true;
      cv.mLantern.instanceMatrix.needsUpdate = true;
    }
    cottageLodOpaqueMesh.count = lodCottageIdx;
    cottageLodWinMesh.count = lodCottageIdx;
    cottageLodOpaqueMesh.instanceMatrix.needsUpdate = true;
    cottageLodWinMesh.instanceMatrix.needsUpdate = true;

    // Swap far trees (> 56m) to low-poly LOD
    const treeDistSq = 56 * 56;
    const treeRatio = currentQuality === 'low' ? 0.42 : currentQuality === 'medium' ? 0.72 : 1.0;
    for (let v = 0; v < 3; v++) {
      const tv = treeVariantMeshes[v];
      const maxActive = Math.max(4, Math.floor(tv.list.length * treeRatio));
      let nearIdx = 0;
      let farIdx = 0;
      for (let i = 0; i < maxActive; i++) {
        const it = tv.list[i];
        const dx = it.x - camX;
        const dz = it.z - camZ;
        const d2 = dx * dx + dz * dz;
        _dummy.position.set(it.x, it.y, it.z);
        _dummy.rotation.set(0, it.rotY, 0);
        _dummy.scale.set(it.sc, it.sc, it.sc);
        _dummy.updateMatrix();

        if (d2 > treeDistSq) {
          tv.mLod.setMatrixAt(farIdx++, _dummy.matrix);
        } else {
          tv.mTrunk.setMatrixAt(nearIdx, _dummy.matrix);
          tv.mCrown.setMatrixAt(nearIdx, _dummy.matrix);
          nearIdx++;
        }
      }
      tv.mTrunk.count = nearIdx;
      tv.mCrown.count = nearIdx;
      tv.mLod.count = farIdx;
      tv.mTrunk.instanceMatrix.needsUpdate = true;
      tv.mCrown.instanceMatrix.needsUpdate = true;
      tv.mLod.instanceMatrix.needsUpdate = true;
    }
  }

  function setLighting(lighting) {
    if (!lighting) return;
    const winGlow = lighting.windowGlow !== undefined ? lighting.windowGlow : 0;
    const lmpGlow = lighting.lampGlow !== undefined ? lighting.lampGlow : 0;
    _lastWindowGlow = winGlow;
    _lastLampGlow = lmpGlow;

    matWindowGlow.emissiveIntensity = winGlow * 1.45;
    matLampGlow.emissiveIntensity = lmpGlow * 1.75;
    // Subtle teal crown rim at night
    matFoliage.emissiveIntensity = lmpGlow * 0.075;

    for (let i = 0; i < lights.length; i++) {
      lights[i].intensity = lights[i].baseIntensity * lmpGlow;
    }
  }

  function setTimeOfDay(t) {
    // Fallback if called directly without shell getLighting
    const isNight = t >= 0.58 || t <= 0.08;
    const g = isNight ? 1.0 : 0.0;
    setLighting({ windowGlow: g, lampGlow: g });
  }

  function update(dt = 0.016, camera = null) {
    _timeAccum += dt;
    _lodTimer += dt;

    // Gentle warm lantern flicker when lamps are lit
    if (_lastLampGlow > 0.01) {
      const flicker = 1.0 + Math.sin(_timeAccum * 7.5) * 0.04 + Math.cos(_timeAccum * 13.0) * 0.025;
      matLampGlow.emissiveIntensity = _lastLampGlow * 1.75 * flicker;
    }

    if (camera && _lodTimer >= 0.25) {
      _lodTimer = 0;
      updateDistanceLOD(camera);
    }
  }

  function setQuality(q) {
    applyQualityCounts(q);
  }

  function getStats() {
    let meshes = 0;
    let triangles = 0;
    let drawCallsEstimate = 0;

    group.traverse((obj) => {
      if (obj.isMesh && obj.visible) {
        const count = obj.isInstancedMesh ? obj.count : 1;
        if (count <= 0) return;
        meshes++;
        drawCallsEstimate++;
        const geom = obj.geometry;
        if (geom) {
          const triCount = geom.index
            ? geom.index.count / 3
            : (geom.attributes.position ? geom.attributes.position.count / 3 : 0);
          triangles += Math.round(triCount * count);
        }
      }
    });

    return { meshes, triangles, drawCallsEstimate };
  }

  function dispose() {
    for (const g of geometries) {
      if (g && typeof g.dispose === 'function') g.dispose();
    }
    for (const m of materials) {
      if (m && typeof m.dispose === 'function') m.dispose();
    }
    texStone.dispose();
    texFoliage.dispose();
  }

  return {
    group,
    colliders,
    blockers,
    doors,
    anchors,
    lights,
    update,
    setLighting,
    setTimeOfDay,
    setQuality,
    getStats,
    dispose
  };
}
