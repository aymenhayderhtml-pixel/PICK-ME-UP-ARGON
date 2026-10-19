import * as THREE from 'three';

const dummyCtx = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'createImageData' || prop === 'getImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
    if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => ({ addColorStop: () => {} });
    return () => {};
  },
  set: () => true
});
globalThis.document = { createElement: () => ({ width: 512, height: 512, getContext: () => dummyCtx }) };

const { LAYOUT } = await import('./src/art/town/layout.js');
const { getGroundY } = await import('./src/art/town/ground.js');
const { buildTown } = await import('./src/art/town/TownAssembler.js');
const { WALK_RAY_TOP, MAX_WALK_HEIGHT, HEAD_CLEARANCE, buildWalkHeightMap, updateUndergroundGuard } = await import('./src/art/town/WalkHeight.js');

const town = buildTown(LAYOUT, getGroundY, 'high');
town.group.updateMatrixWorld(true);

console.log('Building synchronous walk height map...');
const walkMap = buildWalkHeightMap(town.group, getGroundY, { minX: -50, maxX: 50, minZ: -50, maxZ: 50 }, 0.25, true);

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

let allPassed = true;
const results = [];

for (const b of buildings) {
  let corridor;
  if (b.id === 'cottage_1') {
    corridor = [
      { x: -33.8, z: -10.8 },
      { x: -33.8, z: -12.19 },
      { x: -33.0, z: -14.0 }
    ];
  } else if (b.id === 'dungeon_board') {
    corridor = [
      { x: 6.0, z: 2.0 },
      { x: 6.0, z: 0.0 },
      { x: 6.0, z: -2.0 }
    ];
  } else {
    const raw = LAYOUT.zones[b.id].doorCorridor;
    corridor = [raw[2], raw[1], raw[0]]; // outside, door, inside
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
      const wy = walkMap.getWalkY(x, z);
      const dy = walkMap.directRaycast(x, z);
      const isInside = (seg >= 1);
      samples.push({ x, z, y: wy, directY: dy, diff: Math.abs(wy - dy), isInside });
    }
  }

  const doorSill = walkMap.getWalkY(pDoor.x, pDoor.z);
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
  if (!passA || !passB || !passC) allPassed = false;

  results.push({
    name: b.name,
    doorSill,
    maxDiff,
    maxJump,
    failsC,
    passA,
    passB,
    passC,
    samples
  });

  console.log(`Building: ${b.name.padEnd(20)} | Sill: ${doorSill.toFixed(2)} | MaxDiff: ${maxDiff.toFixed(3)} [${passA ? 'PASS' : 'FAIL'}] | MaxJump: ${maxJump.toFixed(3)} [${passB ? 'PASS' : 'FAIL'}] | Fails(c): ${failsC} [${passC ? 'PASS' : 'FAIL'}]`);
  if (!passA) {
    const bad = samples.filter(s => s.diff > 0.05);
    console.log(`  -> Bad diffs (${bad.length}):`, bad.slice(0, 5).map(s => `(${s.x.toFixed(1)}, ${s.z.toFixed(1)}: wy=${s.y.toFixed(2)}, dy=${s.directY.toFixed(2)}, diff=${s.diff.toFixed(3)})`));
  }
  if (!passB) {
    console.log(`  -> Max jump at sample ${jumpIdx}: from ${samples[jumpIdx-1].y.toFixed(3)} at (${samples[jumpIdx-1].x.toFixed(1)}, ${samples[jumpIdx-1].z.toFixed(1)}) to ${samples[jumpIdx].y.toFixed(3)} at (${samples[jumpIdx].x.toFixed(1)}, ${samples[jumpIdx].z.toFixed(1)})`);
  }
}

// Underground Guard Test
console.log('\nTesting Underground Guard...');
let guardPassed = false;
let warnLogged = false;
const originalWarn = console.warn;
console.warn = (...args) => {
  warnLogged = true;
  originalWarn(...args);
};

// Place entity 1.0 below Summoning Room courtyard floor
const summonCourtyardY = walkMap.getWalkY(30, 4);
const testEntity = {
  position: { x: 30, y: summonCourtyardY - 1.0, z: 4 }
};

// Tick 0.2s: entity should still be underground
updateUndergroundGuard(testEntity, 0.2, walkMap.getWalkY);
const after02 = testEntity.position.y;

// Tick another 0.15s (total 0.35s >= 0.3s): entity should snap up to summonCourtyardY
updateUndergroundGuard(testEntity, 0.15, walkMap.getWalkY);
const after035 = testEntity.position.y;

console.warn = originalWarn;

if (after02 === summonCourtyardY - 1.0 && Math.abs(after035 - summonCourtyardY) < 0.001 && warnLogged) {
  guardPassed = true;
  console.log(`Underground Guard PASS: entity snapped from ${(summonCourtyardY - 1.0).toFixed(2)} to ${after035.toFixed(2)} after 0.35s with console.warn.`);
} else {
  console.log(`Underground Guard FAIL: after02=${after02}, after035=${after035}, expected=${summonCourtyardY}, warnLogged=${warnLogged}`);
  allPassed = false;
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log('\nALL 8 BUILDINGS AND UNDERGROUND GUARD PASSED!');
}
