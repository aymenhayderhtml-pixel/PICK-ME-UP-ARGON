import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PROP_COLLIDERS, getSignLayout } from './layout.js';
import { mulberry32, makePart } from './villageArchetypes.js';

export const COTTAGE_SPECS = [
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

export const ROAD_SPECS = [
  { id: 'road_square_landing', x1: 14.0, z1: -8.0, x2: 20.0, z2: 26.0, w: 4.8 },
  { id: 'road_square_summoning', x1: 14.0, z1: -8.0, x2: 26.0, z2: 4.0, w: 4.5 },
  { id: 'road_square_rift', x1: 14.0, z1: -8.0, x2: 30.6, z2: -30.6, w: 5.0 },
  { id: 'road_square_synthesis', x1: 14.0, z1: -8.0, x2: 0.0, z2: -32.0, w: 4.5 },
  { id: 'road_square_armory', x1: 14.0, z1: -8.0, x2: -6.0, z2: -20.0, w: 4.2 },
  { id: 'road_square_residences', x1: 14.0, z1: -8.0, x2: -26.0, z2: -4.0, w: 5.0 },
  { id: 'road_square_training', x1: 14.0, z1: -8.0, x2: -24.0, z2: 20.0, w: 4.5 },
  { id: 'road_residences_inner', x1: -32.0, z1: -14.0, x2: -20.0, z2: 10.0, w: 4.0 },
  { id: 'road_landing_mess', x1: 20.0, z1: 26.0, x2: 8.0, z2: 38.0, w: 4.0 },
  { id: 'path_res_east', x1: -23.0, z1: -16.0, x2: -13.0, z2: 10.0, w: 2.8 },
  { id: 'path_res_south_link', x1: -31.0, z1: -11.5, x2: -19.0, z2: -13.0, w: 2.4 },
  { id: 'path_res_north_link', x1: -25.0, z1: 12.8, x2: -15.0, z2: 11.2, w: 2.4 },
  { id: 'path_armory_res', x1: -6.0, z1: -14.0, x2: -17.5, z2: -11.0, w: 2.6 },
  { id: 'path_training_res', x1: -15.0, z1: 18.0, x2: -16.5, z2: 11.2, w: 2.6 }
];

export const LAMP_SPECS = [
  { id: 'lamp_1', x: 14.0, z: -8.0, color: 0xffaa44, intensity: 7.0, distance: 14.0, rotY: 0.4 },
  { id: 'lamp_2', x: 20.0, z: 22.0, color: 0xffaa44, intensity: 7.0, distance: 14.0, rotY: -1.1 },
  { id: 'lamp_3', x: -16.0, z: -4.0, color: 0xffaa44, intensity: 7.0, distance: 14.0, rotY: 0.0 },
  { id: 'lamp_4', x: -18.0, z: 18.0, color: 0xffaa44, intensity: 7.0, distance: 14.0, rotY: 0.8 },
  { id: 'lamp_5', x: -27.5, z: -5.0, color: 0xffaa44, intensity: 5.5, distance: 11.0, rotY: 1.57, extra: true },
  { id: 'lamp_6', x: -23.5, z: 3.0, color: 0xffaa44, intensity: 5.5, distance: 11.0, rotY: -1.57, extra: true },
  { id: 'lamp_7', x: 3.0, z: -14.0, color: 0xffaa44, intensity: 5.5, distance: 11.0, rotY: 2.2, extra: true },
  { id: 'lamp_8', x: 17.5, z: 7.0, color: 0xffaa44, intensity: 5.5, distance: 11.0, rotY: -0.5, extra: true }
];

export const LANDMARK_EXCLUSIONS = [
  { x: 20.0, z: 26.0, r: 14.2 },
  { x: 30.0, z: 4.0, r: 12.4 },
  { x: 14.0, z: -8.0, r: 12.0 },
  { x: 32.53, z: -32.53, r: 6.5 },
  { x: 0.0, z: -32.0, r: 10.4 },
  { x: -6.0, z: -20.0, r: 8.4 },
  { x: -24.0, z: 20.0, r: 13.4 },
  { x: 8.0, z: 38.0, r: 12.2 },
  { x: 6.0, z: -2.0, r: 5.2 }
];

export const DOOR_CORRIDORS = [
  { x1: 20.0, z1: 26.0, x2: 20.0, z2: 13.0, r: 3.2 },
  { x1: 30.0, z1: 4.0, x2: 23.5, z2: 11.5, r: 3.2 },
  { x1: 23.5, z1: 11.5, x2: 19.5, z2: 20.0, r: 3.2 },
  { x1: 31.8, z1: -31.8, x2: 28.5, z2: -28.5, r: 3.2 },
  { x1: 0.0, z1: -32.0, x2: 0.0, z2: -20.0, r: 3.2 },
  { x1: -6.0, z1: -20.0, x2: -6.0, z2: -14.0, r: 3.2 },
  { x1: -24.0, z1: 20.0, x2: -18.0, z2: 18.0, r: 3.2 },
  { x1: -18.0, z1: 18.0, x2: -15.0, z2: 18.0, r: 3.2 },
  { x1: 8.0, z1: 38.0, x2: 8.0, z2: 33.0, r: 3.2 },
  { x1: -26.0, z1: -4.0, x2: -14.0, z2: -4.0, r: 3.2 }
];

for (const c of COTTAGE_SPECS) {
  DOOR_CORRIDORS.push({ x1: c.x, z1: c.z, x2: c.doorX, z2: c.doorZ, r: 2.6 });
  DOOR_CORRIDORS.push({ x1: c.doorX, z1: c.doorZ, x2: c.doorX, z2: c.corrZ, r: 3.1 });
}

export function distToSegmentSq(px, pz, x1, z1, x2, z2) {
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

export function isInsideDodecagon(x, z, apothem = 43.8) {
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const nx = Math.cos(a);
    const nz = Math.sin(a);
    if (x * nx + z * nz > apothem) return false;
  }
  return true;
}

export function isClearOfDoors(x, z, extraMargin = 0) {
  for (const dc of DOOR_CORRIDORS) {
    const r = dc.r + extraMargin;
    if (distToSegmentSq(x, z, dc.x1, dc.z1, dc.x2, dc.z2) < r * r) return false;
  }
  return true;
}

export function isClearOfRoads(x, z, extraMargin = 0.4, maxRoadIdx = ROAD_SPECS.length) {
  for (let i = 0; i < maxRoadIdx; i++) {
    const rd = ROAD_SPECS[i];
    const r = rd.w * 0.5 + extraMargin;
    if (distToSegmentSq(x, z, rd.x1, rd.z1, rd.x2, rd.z2) < r * r) return false;
  }
  return true;
}

export function isClearOfLandmarks(x, z, extraMargin = 0) {
  for (const lm of LANDMARK_EXCLUSIONS) {
    const dx = x - lm.x;
    const dz = z - lm.z;
    const r = lm.r + extraMargin;
    if (dx * dx + dz * dz < r * r) return false;
  }
  return true;
}

export function isClearOfCottages(x, z, extraMargin = 0.5) {
  for (const c of COTTAGE_SPECS) {
    const hw = 2.4 + extraMargin;
    const hd = 2.2 + extraMargin;
    if (Math.abs(x - c.x) < hw && Math.abs(z - c.z) < hd) return false;
  }
  return true;
}

export function buildRoadsAndCurbs(getY, PAL) {
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

      if (s % 2 === 0) {
        roadParts.push(
          makePart(box, cx, gy + 0.012, cz, 0, angle, 0, rd.w * 0.82, 0.05, stepLen * 0.96, PAL.mossDark, PAL.moss, PAL.stoneCrevice, 0.75)
        );
      }

      for (const side of [-1, 1]) {
        if ((s + rIdx + (side > 0 ? 1 : 0)) % 5 === 0) continue;
        const kx = cx + nx * side * (rd.w * 0.5 + 0.14);
        const kz = cz + nz * side * (rd.w * 0.5 + 0.14);
        if (!isClearOfDoors(kx, kz, -0.4)) continue;
        const ky = getY(kx, kz);
        roadParts.push(
          makePart(box, kx, ky + 0.05, kz, 0, angle, 0, 0.26, 0.15, stepLen * 0.88, PAL.stoneMid, PAL.stoneLit, PAL.mossDark, 0.72)
        );
      }

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

export function buildUniqueVillageStructures(getY, PAL, colliders, anchors, blockers, layout) {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 10);
  const rock = new THREE.IcosahedronGeometry(1, 1);
  const parts = [];
  const glowParts = [];

  const gx = -18.0;
  const gz = -4.0;
  const gy = getY(gx, gz);
  parts.push(
    makePart(box, gx, gy + 1.9, gz - 2.25, 0, 0, 0, 0.78, 4.2, 0.78, PAL.stoneMid, PAL.stoneLit, PAL.stoneCrevice, 0.68),
    makePart(box, gx, gy + 1.9, gz + 2.25, 0, 0, 0, 0.78, 4.2, 0.78, PAL.stoneMid, PAL.stoneLit, PAL.stoneCrevice, 0.68),
    makePart(box, gx, gy + 0.25, gz - 2.25, 0, 0, 0, 0.98, 0.65, 0.98, PAL.stoneShade, PAL.moss, PAL.stoneCrevice, 0.65),
    makePart(box, gx, gy + 0.25, gz + 2.25, 0, 0, 0, 0.98, 0.65, 0.98, PAL.stoneShade, PAL.moss, PAL.stoneCrevice, 0.65),
    makePart(box, gx, gy + 3.95, gz, 0, 0, 0, 0.42, 0.32, 5.4, PAL.timber, 0x3d3632, 0x1c1816, 0.8),
    makePart(box, gx, gy + 4.25, gz, 0, 0, 0, 0.68, 0.22, 5.6, PAL.slate, 0x677582, 0x333c44, 0.85),
    makePart(box, gx + 0.22, gy + 3.55, gz, 0, 0, 0, 0.14, 0.56, 1.85, PAL.plaqueFrame, PAL.stoneLit, PAL.iron, 0.85),
    makePart(box, gx + 0.26, gy + 3.55, gz, 0, 0, 0, 0.10, 0.44, 1.68, PAL.plaqueBronze, PAL.teal, 0x2c3834, 0.88)
  );
  colliders.push(
    { type: 'circle', x: gx, z: gz - 2.25, r: 0.52 },
    { type: 'circle', x: gx, z: gz + 2.25, r: 0.52 }
  );

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
      makePart(box, resSign.x, resSign.boardY - resSign.board.height * 0.5 + 0.1, resSign.z,
        0, resSign.rotY, 0, resSign.board.width - 0.3, 0.06, resSign.board.depth + 0.02,
        PAL.teal, 0xb8f8ff, 0x6fe0f0, 0.95)
    );
    anchors['sign_residences'] = new THREE.Vector3(resSign.x, resSign.boardY, resSign.z);
  }

  const wells = [
    { x: -25.0, z: -6.2 },
    { x: -13.5, z: -11.5 }
  ];
  for (const w of wells) {
    const wy = getY(w.x, w.z);
    parts.push(
      makePart(cyl, w.x, wy + 0.42, w.z, 0, 0, 0, 1.15, 0.95, 1.15, PAL.stoneMid, PAL.stoneLit, PAL.mossDark, 0.68),
      makePart(cyl, w.x, wy + 0.86, w.z, 0, 0, 0, 1.24, 0.14, 1.24, PAL.stoneLit, 0xdce2e6, PAL.stoneShade, 0.8),
      makePart(cyl, w.x, wy + 0.65, w.z, 0, 0, 0, 0.92, 0.08, 0.92, PAL.strataTeal, PAL.teal, PAL.strataDeep, 0.9),
      makePart(box, w.x - 0.95, wy + 1.65, w.z, 0, 0, 0, 0.14, 1.65, 0.14, PAL.timber, 0x3d3632, 0x1c1816, 0.78),
      makePart(box, w.x + 0.95, wy + 1.65, w.z, 0, 0, 0, 0.14, 1.65, 0.14, PAL.timber, 0x3d3632, 0x1c1816, 0.78),
      makePart(box, w.x, wy + 2.15, w.z, 0, 0, Math.PI / 2, 0.12, 1.9, 0.12, PAL.wood, 0x825c3a, 0x3b2816, 0.8),
      makePart(box, w.x, wy + 2.62, w.z - 0.42, 0.48, 0, 0, 2.35, 0.12, 1.12, PAL.slate, 0x677582, 0x333c44, 0.82),
      makePart(box, w.x, wy + 2.62, w.z + 0.42, -0.48, 0, 0, 2.35, 0.12, 1.12, PAL.slate, 0x677582, 0x333c44, 0.82),
      makePart(cyl, w.x, wy + 1.45, w.z, 0, 0, 0, 0.22, 0.32, 0.22, PAL.wood, 0x825c3a, 0x3b2816, 0.78)
    );
    colliders.push({ type: 'circle', x: w.x, z: w.z, r: 1.28 });
  }

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

  const carts = [
    { x: -12.5, z: -6.8, rotY: 0.45 },
    { x: 14.5, z: 31.0, rotY: -0.75 }
  ];
  for (const ct of carts) {
    const cy = getY(ct.x, ct.z);
    const cos = Math.cos(ct.rotY);
    const sin = Math.sin(ct.rotY);
    parts.push(
      makePart(box, ct.x, cy + 0.68, ct.z, 0, ct.rotY, 0, 1.55, 0.14, 2.25, PAL.wood, 0x8a6440, 0x3d2817, 0.75),
      makePart(box, ct.x - cos * 0.72, cy + 0.98, ct.z + sin * 0.72, 0, ct.rotY, 0, 0.10, 0.52, 2.20, PAL.wood, 0x8a6440, 0x3d2817, 0.78),
      makePart(box, ct.x + cos * 0.72, cy + 0.98, ct.z - sin * 0.72, 0, ct.rotY, 0, 0.10, 0.52, 2.20, PAL.wood, 0x8a6440, 0x3d2817, 0.78),
      makePart(cyl, ct.x - cos * 0.84, cy + 0.48, ct.z + sin * 0.84, 0, ct.rotY, Math.PI / 2, 0.48, 0.12, 0.48, PAL.timber, PAL.wood, 0x1c1816, 0.7),
      makePart(cyl, ct.x + cos * 0.84, cy + 0.48, ct.z - sin * 0.84, 0, ct.rotY, Math.PI / 2, 0.48, 0.12, 0.48, PAL.timber, PAL.wood, 0x1c1816, 0.7),
      makePart(rock, ct.x, cy + 0.96, ct.z - 0.3, 0, ct.rotY, 0, 0.52, 0.38, 0.62, PAL.dirt, 0xd0c6b0, 0x6e6452, 0.8)
    );
    colliders.push({ type: 'box', x: ct.x, z: ct.z, w: 1.75, d: 2.35, rotY: ct.rotY });
  }

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
        parts.push(
          makePart(box, px, py - 0.08, pz, 0, ang, 0, 0.18, 0.05, 0.18, PAL.iron, PAL.stoneShade, PAL.iron, 0.85)
        );
        glowParts.push(
          makePart(box, px, py - 0.20, pz, 0, ang, 0, 0.16, 0.22, 0.16, 0xffffff, 0xffffff, 0xffd89a, 0.98)
        );
      }
    }
  }

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

export function generateLayoutPlacements(getY) {
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
  const blockers = [];

  for (let i = 0; i < COTTAGE_SPECS.length; i++) {
    const c = COTTAGE_SPECS[i];

    const hFrontZ = c.z + 3.05;
    hedges.push(
      { x: c.x + 0.65, y: getY(c.x + 0.65, hFrontZ), z: hFrontZ, rotY: 0, sx: 1.25, sy: 1.0, sz: 1.0 },
      { x: c.x + 1.85, y: getY(c.x + 1.85, hFrontZ), z: hFrontZ, rotY: 0, sx: 1.20, sy: 1.0, sz: 1.0 },
      { x: c.x + 2.45, y: getY(c.x + 2.45, c.z + 2.15), z: c.z + 2.15, rotY: Math.PI / 2, sx: 1.45, sy: 1.0, sz: 1.0 },
      { x: c.x - 2.45, y: getY(c.x - 2.45, c.z - 0.6), z: c.z - 0.6, rotY: Math.PI / 2, sx: 1.65, sy: 0.95, sz: 1.0 }
    );

    flowerBeds.push(
      { x: c.x + 1.15, y: getY(c.x + 1.15, c.z + 2.35), z: c.z + 2.35, rotY: 0, sc: 0.95 },
      { x: c.x - 2.45, y: getY(c.x - 2.45, c.z + 0.95), z: c.z + 0.95, rotY: Math.PI / 2, sc: 0.85 }
    );

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
        rot: Math.atan2(-dz / lineLen, dx / lineLen)
      });
      runStart = runEnd + 1;
    }
  }

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
    blockers.push({ type: 'circle', x: t.x, z: t.z, r: PROP_COLLIDERS.treeTrunk * t.sc });
  }

  for (const b of barrels) {
    blockers.push({ type: 'circle', x: b.x, z: b.z, r: PROP_COLLIDERS.barrel * b.sc });
  }
  for (const c of crates) {
    blockers.push({ type: 'circle', x: c.x, z: c.z, r: PROP_COLLIDERS.crate * c.sc });
  }

  for (let i = 0; i < 1650; i++) {
    let gx = 0;
    let gz = 0;
    const mode = i % 3;
    if (mode === 0) {
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
      const ref = i % 2 === 0 ? COTTAGE_SPECS[i % COTTAGE_SPECS.length] : trees[i % trees.length];
      const a = rng() * Math.PI * 2;
      const r = 1.6 + rng() * 3.2;
      gx = ref.x + Math.cos(a) * r;
      gz = ref.z + Math.sin(a) * r;
    } else {
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