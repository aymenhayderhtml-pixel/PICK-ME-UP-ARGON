import * as THREE from 'three';

const dummyCtx = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
    if (prop === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
    if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => ({ addColorStop: () => {} });
    return () => {};
  },
  set: () => true
});
globalThis.document = { createElement: () => ({ width: 512, height: 512, getContext: () => dummyCtx }) };
const { LAYOUT } = await import('./src/art/town/layout.js');
const { getGroundY } = await import('./src/art/town/ground.js');
const { buildTown } = await import('./src/art/town/TownAssembler.js');
const town = buildTown(LAYOUT, getGroundY, 'high');
town.group.updateMatrixWorld(true);

export const WALK_RAY_TOP = 6.0;
export const MAX_WALK_HEIGHT = 4.2;
export const HEAD_CLEARANCE = 2.0;

// Maximum height of a walkable floor surface in town (excludes overhead structures/lintels/roofs)
const MAX_FLOOR_Y = 2.15;

// Building floor envelopes for continuous interior floors
const buildingFloors = [
  { id: 'summoning_room', type: 'circle', cx: 30.0, cz: 4.0, radius: 10.2, floorY: 1.625 },
  { id: 'synthesis_chamber', type: 'circle', cx: 0.0, cz: -32.0, radius: 8.5, floorY: 0.81 },
  { id: 'armory', type: 'box', cx: -6.0, cz: -21.0, hw: 5.5, hd: 6.5, floorY: 0.81 },
  { id: 'space_time_rift', type: 'box', cx: 27.0, cz: -29.0, hw: 3.5, hd: 5.0, floorY: 0.88 },
  { id: 'training_grounds', type: 'box', cx: -24.0, cz: 20.0, hw: 8.5, hd: 8.5, floorY: 0.05 },
  { id: 'cottage_1', type: 'box', cx: -33.0, cz: -16.0, hw: 3.5, hd: 5.5, floorY: 0.40 },
  { id: 'mess_hall_row', type: 'box', cx: 8.0, cz: 40.0, hw: 12.0, hd: 5.5, floorY: 1.575 },
];

function getBuildingFloorY(x, z) {
  for (const bf of buildingFloors) {
    if (bf.type === 'circle') {
      if (Math.hypot(x - bf.cx, z - bf.cz) <= bf.radius) return bf.floorY;
    } else if (bf.type === 'box') {
      if (Math.abs(x - bf.cx) <= bf.hw && Math.abs(z - bf.cz) <= bf.hd) return bf.floorY;
    }
  }
  return null;
}

// Filter walkable meshes
const walkableMeshes = [];
town.group.traverse((obj) => {
  if (!obj.isMesh || !obj.visible) return;
  if (obj.userData?.noWalk) return;
  const name = (obj.name || '').toLowerCase();
  if (
    name === 'townterrain' ||
    name.includes('leaf') || name.includes('leaves') || name.includes('mist') ||
    name.includes('shaft') || name.includes('portal') || name.includes('cloud') ||
    name.includes('glint') || name.includes('sky') || name.includes('dust') ||
    name.includes('underside') || name.includes('roots') || name.includes('disc') ||
    name.includes('ao') || name.includes('cliff') || name.includes('vine') ||
    name.includes('dummy') || name.includes('crate') || name.includes('stake') ||
    name.includes('lantern') || name.includes('window') || name.includes('glyph') ||
    name.includes('column') || name.includes('baluster') || name.includes('barrel') ||
    name.includes('sack') || name.includes('fence') || name.includes('bench') ||
    name.includes('lamp') || name.includes('festoon')
  ) return;
  const mat = obj.material;
  if (!mat) return;
  if (Array.isArray(mat) ? mat.some(m => m.transparent || m.blending === THREE.AdditiveBlending) : (mat.transparent || mat.blending === THREE.AdditiveBlending)) return;
  if (obj.isInstancedMesh && (obj.count > 10 || obj.count === 0)) return;

  if (obj.geometry) {
    if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere();
    if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
  }
  walkableMeshes.push(obj);
});

// Fast 2D spatial triangle grid
const minX = -50, maxX = 50, minZ = -50, maxZ = 50, cellSize = 2.0;
const gridW = Math.ceil((maxX - minX) / cellSize);
const gridH = Math.ceil((maxZ - minZ) / cellSize);
const grid = new Array(gridW * gridH);
for (let i = 0; i < grid.length; i++) grid[i] = [];

const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
const dummyMatrix = new THREE.Matrix4();

function addMeshTriangles(geo, matrix) {
  const pos = geo.attributes.position;
  const index = geo.index;
  const count = index ? index.count : pos.count;
  for (let i = 0; i < count; i += 3) {
    const iA = index ? index.getX(i) : i;
    const iB = index ? index.getX(i + 1) : i + 1;
    const iC = index ? index.getX(i + 2) : i + 2;
    vA.fromBufferAttribute(pos, iA).applyMatrix4(matrix);
    vB.fromBufferAttribute(pos, iB).applyMatrix4(matrix);
    vC.fromBufferAttribute(pos, iC).applyMatrix4(matrix);

    const abX = vB.x - vA.x, abY = vB.y - vA.y, abZ = vB.z - vA.z;
    const acX = vC.x - vA.x, acY = vC.y - vA.y, acZ = vC.z - vA.z;
    const nx = abY * acZ - abZ * acY;
    const ny = abZ * acX - abX * acZ;
    const nz = abX * acY - abY * acX;
    const len = Math.hypot(nx, ny, nz) || 1;
    const normY = ny / len;

    const triMinX = Math.min(vA.x, vB.x, vC.x);
    const triMaxX = Math.max(vA.x, vB.x, vC.x);
    const triMinZ = Math.min(vA.z, vB.z, vC.z);
    const triMaxZ = Math.max(vA.z, vB.z, vC.z);

    const gx0 = Math.max(0, Math.floor((triMinX - minX) / cellSize));
    const gx1 = Math.min(gridW - 1, Math.floor((triMaxX - minX) / cellSize));
    const gz0 = Math.max(0, Math.floor((triMinZ - minZ) / cellSize));
    const gz1 = Math.min(gridH - 1, Math.floor((triMaxZ - minZ) / cellSize));

    const tri = [
      vA.x, vA.y, vA.z,
      vB.x, vB.y, vB.z,
      vC.x, vC.y, vC.z,
      nx / len, normY, nz / len
    ];

    for (let gz = gz0; gz <= gz1; gz++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        grid[gz * gridW + gx].push(tri);
      }
    }
  }
}

for (const obj of walkableMeshes) {
  const geo = obj.geometry;
  if (!geo || !geo.attributes?.position) continue;
  if (obj.isInstancedMesh) {
    for (let inst = 0; inst < obj.count; inst++) {
      obj.getMatrixAt(inst, dummyMatrix);
      dummyMatrix.premultiply(obj.matrixWorld);
      addMeshTriangles(geo, dummyMatrix);
    }
  } else {
    addMeshTriangles(geo, obj.matrixWorld);
  }
}

export function directRaycastSurfaces(x, z) {
  const baseGy = getGroundY(x, z);
  const bfY = getBuildingFloorY(x, z);

  const gx = Math.min(gridW - 1, Math.max(0, Math.floor((x - minX) / cellSize)));
  const gz = Math.min(gridH - 1, Math.max(0, Math.floor((z - minZ) / cellSize)));
  const cellTris = grid[gz * gridW + gx];

  const rawHits = [];
  for (let i = 0; i < cellTris.length; i++) {
    const tri = cellTris[i];
    const normY = tri[10];
    const x1 = tri[0], y1 = tri[1], z1 = tri[2];
    const x2 = tri[3], y2 = tri[4], z2 = tri[5];
    const x3 = tri[6], y3 = tri[7], z3 = tri[8];

    const d1 = (x - x2) * (z1 - z2) - (x1 - x2) * (z - z2);
    const d2 = (x - x3) * (z2 - z3) - (x2 - x3) * (z - z3);
    const d3 = (x - x1) * (z3 - z1) - (x3 - x1) * (z - z1);

    if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) {
      const nx = tri[9], nz = tri[11];
      if (Math.abs(normY) > 0.001) {
        const hitY = y1 - (nx * (x - x1) + nz * (z - z1)) / normY;
        if (hitY <= WALK_RAY_TOP && hitY >= baseGy - 1.0) {
          rawHits.push({ y: hitY, normalY: normY });
        }
      }
    }
  }

  rawHits.sort((a, b) => b.y - a.y);
  const mergedHits = [];
  for (const h of rawHits) {
    const last = mergedHits[mergedHits.length - 1];
    if (last && Math.abs(last.y - h.y) < 0.06) {
      if (h.normalY > last.normalY) last.normalY = h.normalY;
      continue;
    }
    mergedHits.push({ y: h.y, normalY: h.normalY });
  }

  if (bfY !== null) {
    let found = false;
    for (const h of mergedHits) {
      if (Math.abs(h.y - bfY) < 0.1) {
        found = true;
        h.normalY = Math.max(h.normalY, 1.0);
        break;
      }
    }
    if (!found) {
      mergedHits.push({ y: bfY, normalY: 1.0 });
      mergedHits.sort((a, b) => b.y - a.y);
    }
  }

  const last = mergedHits[mergedHits.length - 1];
  if (!last || Math.abs(last.y - baseGy) >= 0.06) {
    mergedHits.push({ y: baseGy, normalY: 1.0 });
  }

  for (let i = 0; i < mergedHits.length; i++) {
    const hit = mergedHits[i];
    let ceilY = Infinity;
    for (let k = i - 1; k >= 0; k--) {
      if (mergedHits[k].y - hit.y >= 1.5) {
        ceilY = mergedHits[k].y;
        break;
      }
    }
    hit.clearance = ceilY === Infinity ? Infinity : ceilY - hit.y;
    hit.isValid = hit.normalY >= 0.6 && hit.y <= MAX_FLOOR_Y && hit.clearance >= 1.6;
  }

  let chosenY = (bfY !== null) ? bfY : baseGy;
  const validHits = mergedHits.filter(h => h.isValid);
  if (validHits.length > 0) {
    chosenY = validHits[0].y;
  }
  if (bfY !== null && chosenY < bfY - 0.05) {
    chosenY = bfY;
  }

  return { chosenY, mergedHits };
}

// Build grid data
const spacing = 0.5;
const cols = Math.round((maxX - minX) / spacing) + 1;
const rows = Math.round((maxZ - minZ) / spacing) + 1;
const gridData = new Float32Array(cols * rows);

for (let r = 0; r < rows; r++) {
  const z = minZ + r * spacing;
  for (let c = 0; c < cols; c++) {
    const x = minX + c * spacing;
    gridData[r * cols + c] = directRaycastSurfaces(x, z).chosenY;
  }
}

export function getWalkY(x, z) {
  const direct = directRaycastSurfaces(x, z);
  return direct.chosenY;
}

const buildings = [
  { id: 'summoning_room', name: 'Summoning Room' },
  { id: 'synthesis_chamber', name: 'Synthesis Chamber' },
  { id: 'armory', name: 'Armory' },
  { id: 'space_time_rift', name: 'Space-Time Rift' },
  { id: 'training_grounds', name: 'Training Grounds' },
  { id: 'cottage_1', name: 'Cottage 1' },
  { id: 'mess_hall_row', name: 'Mess Hall' },
  { id: 'dungeon_board', name: 'Dungeon Board' },
];

console.log('Testing all 8 buildings:');
let totalFails = 0;
for (const b of buildings) {
  let corridor;
  if (b.id === 'cottage_1') {
    corridor = [{ x: -33.8, z: -10.8 }, { x: -33.8, z: -12.19 }, { x: -33.0, z: -14.0 }];
  } else if (b.id === 'dungeon_board') {
    corridor = [{ x: 6.0, z: 2.0 }, { x: 6.0, z: 0.0 }, { x: 6.0, z: -2.0 }];
  } else {
    const raw = LAYOUT.zones[b.id].doorCorridor;
    corridor = [raw[2], raw[1], raw[0]];
  }

  const pOut = corridor[0];
  const pDoor = corridor[1];
  const pIn = corridor[2];
  const dx = pIn.x - pDoor.x;
  const dz = pIn.z - pDoor.z;
  const len = Math.hypot(dx, dz) || 1;
  const pBeyond = { x: pIn.x + (dx / len) * 6, z: pIn.z + (dz / len) * 6 };

  const waypoints = [pOut, pDoor, pIn, pBeyond];
  const samples = [];
  for (let seg = 0; seg < waypoints.length - 1; seg++) {
    const pA = waypoints[seg];
    const pB = waypoints[seg + 1];
    const segDist = Math.hypot(pB.x - pA.x, pB.z - pA.z);
    const steps = Math.round(segDist / 0.1);
    const startStep = seg === 0 ? 0 : 1;
    for (let s = startStep; s <= steps; s++) {
      const t = steps > 0 ? s / steps : 0;
      const x = pA.x + (pB.x - pA.x) * t;
      const z = pA.z + (pB.z - pA.z) * t;
      const wy = getWalkY(x, z);
      const dy = directRaycastSurfaces(x, z).chosenY;
      const isInside = (seg >= 1);
      samples.push({ x, z, y: wy, directY: dy, diff: Math.abs(wy - dy), isInside });
    }
  }

  const doorSill = getWalkY(pDoor.x, pDoor.z);
  let maxJump = 0;
  let maxDiff = 0;
  let jumpIdx = -1;
  let failsC = 0;

  for (let i = 0; i < samples.length; i++) {
    if (samples[i].diff > maxDiff) maxDiff = samples[i].diff;
    if (i > 0) {
      const diff = Math.abs(samples[i].y - samples[i - 1].y);
      if (diff > maxJump) {
        maxJump = diff;
        jumpIdx = i;
      }
    }
    if (samples[i].isInside && samples[i].y < doorSill - 0.1) {
      failsC++;
    }
  }

  const passA = maxDiff <= 0.05;
  const passB = maxJump <= 0.35;
  const passC = failsC === 0;
  console.log(`Building: ${b.name.padEnd(20)} | DoorSill: ${doorSill.toFixed(2)} | MaxDiff: ${maxDiff.toFixed(3)} [${passA ? 'PASS' : 'FAIL'}] | MaxJump: ${maxJump.toFixed(3)} [${passB ? 'PASS' : 'FAIL'}] | Fails(c): ${failsC} [${passC ? 'PASS' : 'FAIL'}]`);
  if (!passA || !passB || !passC) {
    totalFails++;
    if (!passB) {
      console.log(`  -> Max jump at sample ${jumpIdx}: from ${samples[jumpIdx-1].y.toFixed(3)} at (${samples[jumpIdx-1].x.toFixed(1)}, ${samples[jumpIdx-1].z.toFixed(1)}) to ${samples[jumpIdx].y.toFixed(3)} at (${samples[jumpIdx].x.toFixed(1)}, ${samples[jumpIdx].z.toFixed(1)})`);
    }
  }
}
console.log('Total Fails:', totalFails);
