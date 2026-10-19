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

const town = buildTown(LAYOUT, getGroundY, 'high');
town.group.updateMatrixWorld(true);

const directMeshes = [];
town.group.traverse((obj) => {
  if (!obj.isMesh || !obj.visible) return;
  if (obj.userData?.noWalk) return;
  const name = (obj.name || '').toLowerCase();
  if (
    name === 'townterrain' ||
    name.includes('leaf') ||
    name.includes('leaves') ||
    name.includes('mist') ||
    name.includes('shaft') ||
    name.includes('portal') ||
    name.includes('cloud') ||
    name.includes('glint') ||
    name.includes('sky') ||
    name.includes('dust') ||
    name.includes('underside') ||
    name.includes('roots') ||
    name.includes('disc') ||
    name.includes('ao') ||
    name.includes('cliff') ||
    name.includes('vine') ||
    name.includes('dummy') ||
    name.includes('crate') ||
    name.includes('stake') ||
    name.includes('lantern') ||
    name.includes('window') ||
    name.includes('glyph') ||
    name.includes('baluster')
  ) {
    return;
  }
  const mat = obj.material;
  if (!mat) return;
  const isTransparentOrAdditive = Array.isArray(mat)
    ? mat.some((m) => m.transparent || m.blending === THREE.AdditiveBlending)
    : mat.transparent || mat.blending === THREE.AdditiveBlending;
  if (isTransparentOrAdditive) return;

  if (obj.isInstancedMesh && (obj.count > 100 || obj.count === 0)) return;

  if (obj.geometry) {
    if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere();
    if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
  }
  directMeshes.push(obj);
});

const raycaster = new THREE.Raycaster();
const rayOrigin = new THREE.Vector3();
const rayDir = new THREE.Vector3(0, -1, 0);

export const WALK_RAY_TOP = 6.0;
export const MAX_WALK_HEIGHT = 4.2;
export const HEAD_CLEARANCE = 2.0;

export function directRaycastSurfaces(x, z) {
  const baseGy = getGroundY(x, z);
  rayOrigin.set(x, WALK_RAY_TOP, z);
  raycaster.set(rayOrigin, rayDir);
  raycaster.near = 0;
  raycaster.far = WALK_RAY_TOP - baseGy + 5.0;

  const rawHits = raycaster.intersectObjects(directMeshes, false);
  rawHits.sort((a, b) => b.point.y - a.point.y);

  // Group / deduplicate hits within 0.05m
  const mergedHits = [];
  for (const h of rawHits) {
    const y = h.point.y;
    let worldNormal = new THREE.Vector3(0, 1, 0);
    if (h.face && h.face.normal) {
      worldNormal.copy(h.face.normal);
      if (h.object) {
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(h.object.matrixWorld);
        worldNormal.applyMatrix3(normalMatrix).normalize();
      }
    }
    const last = mergedHits[mergedHits.length - 1];
    if (last && Math.abs(last.y - y) < 0.05) {
      if (worldNormal.y > last.normalY) {
        last.normalY = worldNormal.y;
      }
      continue;
    }
    mergedHits.push({
      y,
      normalY: worldNormal.y,
      mesh: h.object.name || 'instanced'
    });
  }

  // Always include base terrain at the bottom if not already present
  const lastHit = mergedHits[mergedHits.length - 1];
  if (!lastHit || Math.abs(lastHit.y - baseGy) >= 0.05) {
    mergedHits.push({
      y: baseGy,
      normalY: 1.0,
      mesh: 'base_terrain'
    });
  }

  // Calculate clearance for each hit (distance to next hit above it)
  for (let i = 0; i < mergedHits.length; i++) {
    const hit = mergedHits[i];
    hit.clearance = i === 0 ? Infinity : (mergedHits[i - 1].y - hit.y);
  }

  // A hit is a candidate floor if normal.y >= 0.6 and y <= MAX_WALK_HEIGHT
  // A candidate hit is an OVERHEAD COVER / LINTEL if there is another valid surface below it
  // with at least 1.7m clearance under it.
  for (let i = 0; i < mergedHits.length; i++) {
    const hit = mergedHits[i];
    const slopeOk = hit.normalY >= 0.6;
    const heightOk = hit.y <= MAX_WALK_HEIGHT;
    const clearanceOk = hit.clearance >= 1.7; // Head clearance threshold

    // Check if this hit is an overhead roof/lintel above a lower walkable surface
    let isOverheadCover = false;
    for (let k = i + 1; k < mergedHits.length; k++) {
      const lower = mergedHits[k];
      if (lower.normalY >= 0.6 && (hit.y - lower.y) >= 1.7) {
        isOverheadCover = true;
        break;
      }
    }

    hit.isValid = slopeOk && heightOk && clearanceOk && !isOverheadCover;
  }

  let chosenY = baseGy;
  const validHits = mergedHits.filter(h => h.isValid);
  if (validHits.length > 0) {
    chosenY = validHits[0].y; // Highest valid floor surface
  }

  return { chosenY, mergedHits };
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
for (const b of buildings) {
  let corridor;
  if (b.id === 'cottage_1') {
    corridor = [
      { x: -33.0, z: -14.0 },
      { x: -33.8, z: -12.19 },
      { x: -33.8, z: -10.8 }
    ];
  } else if (b.id === 'dungeon_board') {
    corridor = [
      { x: 6.0, z: -2.0 },
      { x: 6.0, z: 0.0 },
      { x: 6.0, z: 2.0 }
    ];
  } else {
    corridor = LAYOUT.zones[b.id].doorCorridor;
  }

  const pInside = corridor[0];
  const pDoor = corridor[1];
  const pOutside = corridor[2];

  const dx = pInside.x - pDoor.x;
  const dz = pInside.z - pDoor.z;
  const len = Math.hypot(dx, dz);
  const ux = len > 0.001 ? dx / len : 0;
  const uz = len > 0.001 ? dz / len : 0;
  const pBeyond = { x: pInside.x + ux * 6, z: pInside.z + uz * 6 };

  const waypoints = [pOutside, pDoor, pInside, pBeyond];
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
      const res = directRaycastSurfaces(x, z);
      const isInside = (seg >= 1);
      samples.push({ x, z, y: res.chosenY, isInside, hits: res.mergedHits });
    }
  }

  const doorSample = directRaycastSurfaces(pDoor.x, pDoor.z);
  const doorSill = doorSample.chosenY;
  let maxJump = 0;
  let jumpIdx = -1;
  let failsC = 0;

  for (let i = 1; i < samples.length; i++) {
    const diff = Math.abs(samples[i].y - samples[i - 1].y);
    if (diff > maxJump) {
      maxJump = diff;
      jumpIdx = i;
    }
    if (samples[i].isInside && samples[i].y < doorSill - 0.1) {
      failsC++;
    }
  }

  console.log(`Building: ${b.name.padEnd(20)} | DoorSill: ${doorSill.toFixed(2)} | MaxJump: ${maxJump.toFixed(3)} | Fails (c): ${failsC}`);
  if (maxJump > 0.35 || failsC > 0) {
    console.log(`  -> Max jump at sample ${jumpIdx}: from ${samples[jumpIdx-1].y.toFixed(3)} at (${samples[jumpIdx-1].x.toFixed(1)}, ${samples[jumpIdx-1].z.toFixed(1)}) to ${samples[jumpIdx].y.toFixed(3)} at (${samples[jumpIdx].x.toFixed(1)}, ${samples[jumpIdx].z.toFixed(1)})`);
  }
}
