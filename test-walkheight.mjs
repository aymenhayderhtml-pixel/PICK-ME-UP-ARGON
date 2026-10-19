// test-walkheight.mjs
// Automated verification for WalkHeight map vs direct raycasts across 15 town points.

import * as THREE from 'three';

// Minimal canvas mock for Node.js texture generation in shell/landmarks/village
const dummyCtx = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
    if (prop === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
    if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => ({ addColorStop: () => {} });
    return () => {};
  },
  set: () => true
});
globalThis.document = {
  createElement: () => ({
    width: 512,
    height: 512,
    getContext: () => dummyCtx
  })
};

const { LAYOUT } = await import('./src/art/town/layout.js');
const { getGroundY } = await import('./src/art/town/ground.js');
const { buildTown } = await import('./src/art/town/TownAssembler.js');
const { buildWalkHeightMap } = await import('./src/art/town/WalkHeight.js');

console.log('Building town on "high" quality for WalkHeight verification...');
const town = buildTown(LAYOUT, getGroundY, 'high');

console.log('Building synchronous WalkHeightMap...');
const bounds = { minX: -50, maxX: 50, minZ: -50, maxZ: 50 };
const walkMap = buildWalkHeightMap(town.group, getGroundY, bounds, 0.5, true);

// Collect walkable meshes for direct reference raycast (same criteria as WalkHeight.js)
const directMeshes = [];
town.group.updateMatrixWorld(true);
town.group.traverse((obj) => {
  if (!obj.isMesh) return;
  if (obj.userData?.noWalk) return;
  if (obj.name && (obj.name.includes('leaf') || obj.name.includes('mist') || obj.name.includes('shaft') || obj.name.includes('portal') || obj.name.includes('cloud'))) return;
  const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
  if (!mat) return;
  if (mat.transparent && mat.opacity < 0.6) return;
  if (mat.blending === THREE.AdditiveBlending) return;
  directMeshes.push(obj);
});

const raycaster = new THREE.Raycaster();
const rayOrigin = new THREE.Vector3();
const rayDir = new THREE.Vector3(0, -1, 0);

function getDirectRaycastY(x, z) {
  const baseGy = getGroundY(x, z);
  const isStairs = (x >= 21 && x <= 27.5 && z >= 9 && z <= 17);
  const originY = isStairs ? 3.8 : (baseGy + 1.2);
  const far = isStairs ? 5.0 : 3.0;

  rayOrigin.set(x, originY, z);
  raycaster.set(rayOrigin, rayDir);
  raycaster.near = 0.01;
  raycaster.far = far;

  const hits = raycaster.intersectObjects(directMeshes, false);
  let bestY = baseGy;
  for (const h of hits) {
    if (h.point.y <= originY) {
      bestY = h.point.y;
      break;
    }
  }
  return bestY;
}

const TEST_POINTS = [
  { name: 'Landing Area center', x: 20.0, z: 26.0 },
  { name: 'Summoning stair bottom', x: 22.0, z: 14.0 },
  { name: 'Summoning stair middle', x: 24.5, z: 12.0 },
  { name: 'Summoning stair top', x: 27.0, z: 8.0 },
  { name: 'Town Square center', x: 14.0, z: -8.0 },
  { name: 'Road segment', x: 17.0, z: 8.0 },
  { name: 'Armory door approach', x: 25.0, z: -12.0 },
  { name: 'Cottage 1 door approach', x: -33.8, z: -10.8 },
  { name: 'Training Grounds', x: -24.0, z: 16.8 },
  { name: 'Next to wall', x: 0.0, z: -40.0 },
  { name: 'Synthesis door approach', x: -17.8, z: 5.2 },
  { name: 'Dormitory entrance', x: -18.0, z: -4.0 },
  { name: 'Mess Hall door approach', x: -24.0, z: -6.0 },
  { name: 'Space-Time Rift', x: 0.0, z: 40.0 },
  { name: 'Dungeon Board', x: 20.0, z: 24.0 },
];

console.log('\n================================================================================');
console.log('WALK HEIGHT VERIFICATION REPORT');
console.log('================================================================================');
console.log('| #  | Location | (X, Z) | GroundY | DirectRay | WalkMapY | Diff (m) | Status |');
console.log('|----|----------|--------|---------|-----------|----------|----------|--------|');

let maxDiff = 0;
let passCount = 0;
const results = [];

for (let i = 0; i < TEST_POINTS.length; i++) {
  const pt = TEST_POINTS[i];
  const gy = getGroundY(pt.x, pt.z);
  const directY = getDirectRaycastY(pt.x, pt.z);
  const mapY = walkMap.getWalkY(pt.x, pt.z);
  const diff = Math.abs(mapY - directY);
  if (diff > maxDiff) maxDiff = diff;

  const passed = diff <= 0.08;
  if (passed) passCount++;

  const row = `| ${(i + 1).toString().padStart(2)} | ${pt.name.padEnd(23)} | (${pt.x.toFixed(1).padStart(5)}, ${pt.z.toFixed(1).padStart(5)}) | ${gy.toFixed(3).padStart(7)} | ${directY.toFixed(3).padStart(9)} | ${mapY.toFixed(3).padStart(8)} | ${diff.toFixed(3).padStart(8)} | ${passed ? 'PASS' : 'FAIL'} |`;
  console.log(row);
  results.push({ ...pt, gy, directY, mapY, diff, passed });
}

console.log('================================================================================');
console.log(`Summary: ${passCount}/${TEST_POINTS.length} points passed. Max Difference: ${maxDiff.toFixed(4)}m (Limit: 0.08m)`);

walkMap.dispose();
town.dispose();

if (passCount !== TEST_POINTS.length) {
  console.error('TEST FAILED: Some points exceeded the 0.08m tolerance threshold.');
  process.exit(1);
} else {
  console.log('TEST PASSED: All walk heights match within 0.08m tolerance.\n');
  process.exit(0);
}
