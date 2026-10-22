// Camera collision tests: the camera must never travel through a wall.
//
// Run: node scripts/test_camera_collision.mjs
import { testSegmentColliders } from '../src/player/ThirdPersonCamera.js';

let failures = 0;

function check(name, actual, expected, tolerance = 0.001) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (got ${actual.toFixed(3)}, expected ${expected.toFixed(3)})`);
}

const MAX = 6;

// 1. Clear line: nothing blocks the camera.
check(
  'clear line returns the max distance',
  testSegmentColliders(0, 0, 1, 0, MAX, [{ type: 'box', x: 20, z: 0, w: 4, d: 4 }]),
  MAX
);

// 2. A wall in front: the camera stops at the near face.
check(
  'wall in front stops at the near face',
  testSegmentColliders(0, 0, 1, 0, MAX, [{ type: 'box', x: 3, z: 0, w: 2, d: 2 }]),
  2
);

// 3. The player stands in a doorway (inside the footprint): the camera may
//    not travel past the far face, so it can never pass through the wall.
check(
  'starting inside a box stops at the far face',
  testSegmentColliders(0, 0, 1, 0, MAX, [{ type: 'box', x: 0, z: 0, w: 2, d: 2 }]),
  1
);

// 4. Same, but the camera points the other way: it exits on that side.
check(
  'starting inside a box, opposite direction',
  testSegmentColliders(0, 0, -1, 0, MAX, [{ type: 'box', x: 0, z: 0, w: 2, d: 2 }]),
  1
);

// 5. A circle in front.
check(
  'circle in front stops at its edge',
  testSegmentColliders(0, 0, 1, 0, MAX, [{ type: 'circle', x: 3, z: 0, r: 1 }]),
  2
);

// 6. Starting inside a circle: the camera leaves through the far side.
check(
  'starting inside a circle stops at the far edge',
  testSegmentColliders(0, 0, 1, 0, MAX, [{ type: 'circle', x: 0, z: 0, r: 1 }]),
  1
);

function checkBool(name, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (got ${actual}, expected ${expected})`);
}

// 7. A rotated box still blocks.
const rot = Math.PI / 4;
const rotHit = testSegmentColliders(0, 0, 1, 0, MAX, [{ type: 'box', x: 3, z: 0, w: 2, d: 2, rotY: rot }]);
checkBool('rotated box still blocks', rotHit > 0 && rotHit < MAX, true);

// 8. The closest collider wins.
check(
  'the closest collider wins',
  testSegmentColliders(0, 0, 1, 0, MAX, [
    { type: 'box', x: 5, z: 0, w: 2, d: 2 },
    { type: 'box', x: 2, z: 0, w: 2, d: 2 },
  ]),
  1
);

if (failures > 0) {
  console.error(`\n${failures} camera collision test(s) failed.`);
  process.exit(1);
}
console.log('\nALL CAMERA COLLISION TESTS PASSED');
