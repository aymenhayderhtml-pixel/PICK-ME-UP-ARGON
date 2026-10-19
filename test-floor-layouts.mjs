// test-floor-layouts.mjs
// Equality test for src/world/floorLayouts.js.
//
// The reference values below are the ORIGINAL layout computations of
// src/world/FarmFloor.js and src/world/ForestFloor.js (copied before the
// refactor). generateFloorLayout must reproduce them exactly, so the gameplay
// layout can never diverge from what the game shipped with.
//
// Run: node test-floor-layouts.mjs

import assert from 'node:assert/strict';
import { generateFloorLayout } from './src/world/floorLayouts.js';

// --- reference PRNG (same Mulberry32 the floors use) ------------------------
function createRng(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t >>> 0) / 4294967296;
  };
}

const H = (x, z) => Math.hypot(x, z);

// --- reference: floor 1 (FarmFloor.js, fixed layout) ------------------------
function refFarmLayout() {
  const startPosition = { x: 0, z: 4 };
  const exitPosition = { x: 0, z: -125 };
  const clearings = [
    { center: { x: 0, z: 0 }, radius: 13, triggerRadius: 15 },
    { center: { x: 0, z: -35 }, radius: 15, triggerRadius: 17 },
    { center: { x: 0, z: -75 }, radius: 16, triggerRadius: 18 },
    { center: { x: 0, z: -112 }, radius: 15, triggerRadius: 17 },
  ];
  const chokePoints = [
    { position: { x: 0, z: -20 }, direction: { x: 0, z: -1 }, width: 3.2 },
    { position: { x: 0, z: -55 }, direction: { x: 0, z: -1 }, width: 3.2 },
    { position: { x: 0, z: -94 }, direction: { x: 0, z: -1 }, width: 3.2 },
  ];
  const ambushSpots = [
    { x: -8, z: -18 }, { x: 8, z: -18 }, { x: -10, z: -28 }, { x: 10, z: -28 },
    { x: -12, z: -50 }, { x: 12, z: -50 }, { x: -10, z: -90 }, { x: 10, z: -90 },
  ];

  const fenceZLocations = [-20, -55, -94];
  const obstacles = [];
  for (const fz of fenceZLocations) {
    obstacles.push({ x: -2.0, z: fz, radius: 0.8 }, { x: 2.0, z: fz, radius: 0.8 });
  }
  const treeLocations = [
    { x: -14, z: -4 }, { x: 14, z: -4 }, { x: -22, z: 2 }, { x: 22, z: 2 },
    { x: -18, z: -32 }, { x: 18, z: -32 }, { x: -25, z: -48 }, { x: 25, z: -48 },
    { x: 8, z: -70 }, { x: 22, z: -72 }, { x: 10, z: -84 }, { x: 24, z: -84 },
    { x: 16, z: -64 }, { x: 26, z: -68 },
    { x: -16, z: -102 }, { x: -25, z: -115 }, { x: -18, z: -122 },
    { x: 15, z: -105 }, { x: 20, z: -118 }, { x: 14, z: -124 },
  ];
  for (const t of treeLocations) obstacles.push({ x: t.x, z: t.z, radius: 0.6 });
  const colPositions = [
    { x: 10, z: -81 }, { x: 14, z: -81 }, { x: 18, z: -81 }, { x: 22, z: -81 },
    { x: 10, z: -69 }, { x: 14, z: -69 }, { x: 18, z: -69 }, { x: 22, z: -69 },
  ];
  for (const c of colPositions) obstacles.push({ x: c.x, z: c.z, radius: 0.8 });
  obstacles.push({ x: -14, z: -112, radius: 4.0 });
  obstacles.push({ x: -8, z: -105, radius: 1.2 });
  const hayLocations = [
    { x: -5, z: -16 }, { x: -6.5, z: -17 }, { x: 6, z: -22 },
    { x: -12, z: -62 }, { x: -14, z: -63 }, { x: -13, z: -61 },
    { x: -6, z: -108 }, { x: -5, z: -110 }, { x: -7, z: -112 },
    { x: 6, z: -116 }, { x: 7.5, z: -117 },
  ];
  for (const h of hayLocations) obstacles.push({ x: h.x, z: h.z, radius: 0.8 });

  function walkable(x, z) {
    if (x < -46 || x > 46 || z > 7 || z < -130) return false;
    for (const fz of fenceZLocations) {
      if (Math.abs(z - fz) < 0.6 && Math.abs(x) > 1.6) return false;
    }
    for (const o of obstacles) {
      if (H(x - o.x, z - o.z) < o.radius) return false;
    }
    return true;
  }

  return { startPosition, exitPosition, clearings, chokePoints, ambushSpots, obstacles, walkable };
}

// --- reference: floors 2 to 5 (ForestFloor.js, seeded layout) ---------------
function refForestLayout(floorNumber, seed) {
  const rng = createRng(seed);
  const isFloor5 = floorNumber === 5;
  const clearings = [];
  const chokePoints = [];
  const chokeObstacles = [];
  const ambushSpots = [];
  const pathSegments = [];
  let startPosition;
  let exitPosition;
  let pillars = [];
  let wallSegments = [];

  if (!isFloor5) {
    const c0Radius = 13 + rng() * 2;
    const c1Radius = 13 + rng() * 2;
    const c2Radius = 14 + rng() * 2;
    const c3Radius = 15 + rng() * 2;

    const c0 = { center: { x: 0, z: 0 }, radius: c0Radius, spawnPoints: [], triggerRadius: c0Radius + 2 };
    const c1 = {
      center: { x: (rng() - 0.5) * 14, z: -38 - rng() * 6 },
      radius: c1Radius,
      spawnPoints: [],
      triggerRadius: c1Radius + 2,
    };
    const c2 = {
      center: { x: (rng() - 0.5) * 16, z: -78 - rng() * 6 },
      radius: c2Radius,
      spawnPoints: [],
      triggerRadius: c2Radius + 2,
    };
    const c3 = {
      center: { x: (rng() - 0.5) * 12, z: -122 - rng() * 6 },
      radius: c3Radius,
      spawnPoints: [],
      triggerRadius: c3Radius + 2,
    };
    clearings.push(c0, c1, c2, c3);

    startPosition = { x: 0, z: 4 };
    exitPosition = { x: c3.center.x, z: c3.center.z - c3.radius + 1.8 };

    const polyline = [
      { ...c0.center },
      { x: (c0.center.x + c1.center.x) / 2 + (rng() - 0.5) * 6, z: (c0.center.z + c1.center.z) / 2 },
      { ...c1.center },
      { x: (c1.center.x + c2.center.x) / 2 + (rng() - 0.5) * 6, z: (c1.center.z + c2.center.z) / 2 },
      { ...c2.center },
      { x: (c2.center.x + c3.center.x) / 2 + (rng() - 0.5) * 6, z: (c2.center.z + c3.center.z) / 2 },
      { ...c3.center },
      { ...exitPosition },
    ];
    for (let i = 0; i < polyline.length - 1; i++) {
      pathSegments.push({ p1: polyline[i], p2: polyline[i + 1], chokePoints: [] });
    }

    const corridorPairs = [
      { from: c0.center, to: c1.center, segIdx: 0 },
      { from: c1.center, to: c2.center, segIdx: 2 },
      { from: c2.center, to: c3.center, segIdx: 4 },
    ];
    for (const cpPair of corridorPairs) {
      for (const t of [0.35, 0.68]) {
        const pos = {
          x: cpPair.from.x + (cpPair.to.x - cpPair.from.x) * t,
          z: cpPair.from.z + (cpPair.to.z - cpPair.from.z) * t,
        };
        const dx = cpPair.to.x - cpPair.from.x;
        const dz = cpPair.to.z - cpPair.from.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        const dir = { x: dx / len, z: dz / len };
        const chokeObj = { position: pos, direction: dir, width: 3.0 };
        chokePoints.push(chokeObj);
        pathSegments[cpPair.segIdx].chokePoints.push(chokeObj);
        const perpX = -dir.z;
        const perpZ = dir.x;
        chokeObstacles.push(
          { x: pos.x + perpX * 2.7, z: pos.z + perpZ * 2.7, radius: 1.2 },
          { x: pos.x - perpX * 2.7, z: pos.z - perpZ * 2.7, radius: 1.2 }
        );
      }
    }
  } else {
    const c0 = { center: { x: 0, z: 0 }, radius: 10, spawnPoints: [], triggerRadius: 12 };
    const arena = { center: { x: 0, z: -48 }, radius: 24, spawnPoints: [], triggerRadius: 26 };
    clearings.push(c0, arena);

    startPosition = { x: 0, z: 3 };
    exitPosition = { x: 0, z: -70 };

    const polyline = [
      { x: 0, z: 0 }, { x: 0, z: -14 }, { x: 0, z: -28 }, { x: 0, z: -48 }, { x: 0, z: -70 },
    ];
    for (let i = 0; i < polyline.length - 1; i++) {
      pathSegments.push({ p1: polyline[i], p2: polyline[i + 1], chokePoints: [] });
    }

    const cpPos = { x: 0, z: -20 };
    const cpDir = { x: 0, z: -1 };
    const chokeObj = { position: cpPos, direction: cpDir, width: 3.0 };
    chokePoints.push(chokeObj);
    pathSegments[1].chokePoints.push(chokeObj);
    chokeObstacles.push({ x: cpPos.x + 2.7, z: cpPos.z, radius: 1.2 }, { x: cpPos.x - 2.7, z: cpPos.z, radius: 1.2 });

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      pillars.push({
        x: arena.center.x + Math.cos(angle) * 14,
        z: arena.center.z + Math.sin(angle) * 14,
        radius: 1.2,
      });
    }
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      if (Math.abs(angle - Math.PI / 2) < 0.35 || Math.abs(angle - (3 * Math.PI) / 2) < 0.35) continue;
      wallSegments.push({
        x: arena.center.x + Math.cos(angle) * 23.5,
        z: arena.center.z + Math.sin(angle) * 23.5,
        length: 3.5,
        rotationY: angle + Math.PI / 2,
      });
    }
  }

  for (let c = 1; c < clearings.length; c++) {
    const cl = clearings[c];
    const isBossRoom = c === clearings.length - 1;
    const count = isBossRoom && isFloor5 ? 1 : 4;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rng();
      const dist = cl.radius * 0.45 + rng() * (cl.radius * 0.25);
      cl.spawnPoints.push({
        x: cl.center.x + Math.cos(angle) * dist,
        z: cl.center.z + Math.sin(angle) * dist,
      });
    }
  }
  for (let c = 0; c < clearings.length; c++) {
    const cl = clearings[c];
    for (let i = 0; i < 2; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = cl.radius * 0.85;
      ambushSpots.push({ x: cl.center.x + Math.cos(angle) * dist, z: cl.center.z + Math.sin(angle) * dist });
    }
  }
  for (const cp of chokePoints) {
    const perpX = -cp.direction.z;
    const perpZ = cp.direction.x;
    ambushSpots.push({ x: cp.position.x + perpX * 3.8, z: cp.position.z + perpZ * 3.8 });
  }

  function walkable(x, z) {
    for (const p of pillars) {
      if (H(x - p.x, z - p.z) < p.radius + 0.35) return false;
    }
    for (const o of chokeObstacles) {
      if (H(x - o.x, z - o.z) < o.radius) return false;
    }
    for (const cl of clearings) {
      if (H(x - cl.center.x, z - cl.center.z) <= cl.radius - 0.5) return true;
    }
    for (const seg of pathSegments) {
      const dx = seg.p2.x - seg.p1.x;
      const dz = seg.p2.z - seg.p1.z;
      const l2 = dx * dx + dz * dz;
      let dist;
      if (l2 === 0) {
        dist = H(x - seg.p1.x, z - seg.p1.z);
      } else {
        let t = ((x - seg.p1.x) * dx + (z - seg.p1.z) * dz) / l2;
        t = Math.max(0, Math.min(1, t));
        dist = H(x - (seg.p1.x + t * dx), z - (seg.p1.z + t * dz));
      }
      let maxDist = 4.5;
      for (const cp of seg.chokePoints) {
        if (H(x - cp.position.x, z - cp.position.z) < 3.2) {
          maxDist = 1.5;
          break;
        }
      }
      if (dist <= maxDist) return true;
    }
    return false;
  }

  return { startPosition, exitPosition, clearings, chokePoints, ambushSpots, obstacles: chokeObstacles, pillars, wallSegments, walkable };
}

// --- helpers ----------------------------------------------------------------
function close(a, b, label) {
  assert.ok(Math.abs(a - b) < 1e-9, `${label}: ${a} !== ${b}`);
}
function closePt(a, b, label) {
  close(a.x, b.x, label + '.x');
  close(a.z, b.z, label + '.z');
}

function compareLayout(actual, ref, label) {
  closePt(actual.startPosition, ref.startPosition, `${label} startPosition`);
  closePt(actual.exitPosition, ref.exitPosition, `${label} exitPosition`);
  closePt(actual.exitGate.position, ref.exitPosition, `${label} exitGate.position`);
  closePt(actual.entranceBarrier.position, ref.entranceBarrier ? ref.entranceBarrier.position : { x: 0, z: 6.5 }, `${label} entranceBarrier.position`);

  assert.equal(actual.clearings.length, ref.clearings.length, `${label} clearing count`);
  for (let i = 0; i < ref.clearings.length; i++) {
    const a = actual.clearings[i];
    const r = ref.clearings[i];
    closePt(a.center, r.center, `${label} clearing ${i} center`);
    close(a.radius, r.radius, `${label} clearing ${i} radius`);
    close(a.triggerRadius, r.triggerRadius, `${label} clearing ${i} triggerRadius`);
    if (r.spawnPoints) {
      assert.equal(a.spawnPoints.length, r.spawnPoints.length, `${label} clearing ${i} spawnPoints length`);
      for (let j = 0; j < r.spawnPoints.length; j++) {
        closePt(a.spawnPoints[j], r.spawnPoints[j], `${label} clearing ${i} spawnPoint ${j}`);
      }
    }
  }

  assert.equal(actual.chokePoints.length, ref.chokePoints.length, `${label} chokePoints count`);
  for (let i = 0; i < ref.chokePoints.length; i++) {
    const a = actual.chokePoints[i];
    const r = ref.chokePoints[i];
    closePt(a.position, r.position, `${label} choke ${i} position`);
    closePt(a.direction, r.direction, `${label} choke ${i} direction`);
    close(a.width, r.width, `${label} choke ${i} width`);
  }

  assert.equal(actual.ambushSpots.length, ref.ambushSpots.length, `${label} ambushSpots count`);
  for (let i = 0; i < ref.ambushSpots.length; i++) {
    closePt(actual.ambushSpots[i], ref.ambushSpots[i], `${label} ambush ${i}`);
  }

  assert.equal(actual.obstacles.length, ref.obstacles.length, `${label} obstacles count`);
  for (let i = 0; i < ref.obstacles.length; i++) {
    close(actual.obstacles[i].x, ref.obstacles[i].x, `${label} obstacle ${i} x`);
    close(actual.obstacles[i].z, ref.obstacles[i].z, `${label} obstacle ${i} z`);
    close(actual.obstacles[i].radius, ref.obstacles[i].radius, `${label} obstacle ${i} radius`);
  }

  if (ref.pillars && ref.pillars.length > 0) {
    assert.ok(actual.bossArena, `${label} bossArena missing`);
    assert.equal(actual.bossArena.pillars.length, ref.pillars.length, `${label} pillar count`);
    for (let i = 0; i < ref.pillars.length; i++) {
      close(actual.bossArena.pillars[i].x, ref.pillars[i].x, `${label} pillar ${i} x`);
      close(actual.bossArena.pillars[i].z, ref.pillars[i].z, `${label} pillar ${i} z`);
      close(actual.bossArena.pillars[i].radius, ref.pillars[i].radius, `${label} pillar ${i} radius`);
    }
    assert.equal(actual.bossArena.wallSegments.length, ref.wallSegments.length, `${label} wall count`);
    for (let i = 0; i < ref.wallSegments.length; i++) {
      close(actual.bossArena.wallSegments[i].x, ref.wallSegments[i].x, `${label} wall ${i} x`);
      close(actual.bossArena.wallSegments[i].z, ref.wallSegments[i].z, `${label} wall ${i} z`);
      close(actual.bossArena.wallSegments[i].rotationY, ref.wallSegments[i].rotationY, `${label} wall ${i} rotY`);
      close(actual.bossArena.wallSegments[i].length, ref.wallSegments[i].length, `${label} wall ${i} length`);
    }
  } else {
    assert.equal(actual.bossArena, null, `${label} bossArena should be null`);
  }

  // Walkability: compare on a grid covering the layout bounds.
  const b = actual.bounds;
  const step = 1.0;
  let checked = 0;
  for (let x = b.minX - 2; x <= b.maxX + 2; x += step) {
    for (let z = b.minZ - 2; z <= b.maxZ + 2; z += step) {
      const a = actual.walkable(x, z);
      const r = ref.walkable(x, z);
      assert.equal(a, r, `${label} walkable mismatch at (${x.toFixed(1)}, ${z.toFixed(1)}): layout=${a} ref=${r}`);
      checked++;
    }
  }
  return checked;
}

// --- run --------------------------------------------------------------------
const CASES = [
  { floor: 1, seed: 1 * 7919 + 13, ref: () => refFarmLayout() },
  { floor: 2, seed: 2 * 7919 + 13, ref: () => refForestLayout(2, 2 * 7919 + 13) },
  { floor: 3, seed: 3 * 7919 + 13, ref: () => refForestLayout(3, 3 * 7919 + 13) },
  { floor: 4, seed: 4 * 7919 + 13, ref: () => refForestLayout(4, 4 * 7919 + 13) },
  { floor: 5, seed: 5 * 7919 + 13, ref: () => refForestLayout(5, 5 * 7919 + 13) },
  // Additional seeds make sure the RNG ordering matters (not just one lucky seed).
  { floor: 2, seed: 777, ref: () => refForestLayout(2, 777) },
  { floor: 3, seed: 12345, ref: () => refForestLayout(3, 12345) },
  { floor: 5, seed: 999331, ref: () => refForestLayout(5, 999331) },
];

let totalPoints = 0;
for (const c of CASES) {
  const actual = generateFloorLayout(c.floor, c.seed);
  const ref = c.ref();
  totalPoints += compareLayout(actual, ref, `floor ${c.floor} seed ${c.seed}`);
}

// Floor 1 must be deterministic even with a different seed (fixed layout).
{
  const a = generateFloorLayout(1, 1);
  const b = generateFloorLayout(1, 99999);
  assert.equal(a.startPosition.x, b.startPosition.x);
  assert.equal(a.clearings.length, b.clearings.length);
  assert.deepEqual(a.clearings[1].spawnPoints, b.clearings[1].spawnPoints);
}

// getGroundY: documented as flat.
for (const f of [1, 2, 5]) {
  const L = generateFloorLayout(f, f * 7919 + 13);
  assert.equal(L.getGroundY(0, 0), 0, `floor ${f} getGroundY must be 0`);
}

console.log(`OK: floor layout equality test passed (${CASES.length} cases, ${totalPoints} walkability samples).`);
