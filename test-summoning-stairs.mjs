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
    name.includes('vine')
  ) {
    return;
  }
  const mat = obj.material;
  if (!mat) return;
  const isTransparentOrAdditive = Array.isArray(mat)
    ? mat.some((m) => m.transparent || m.blending === THREE.AdditiveBlending)
    : mat.transparent || mat.blending === THREE.AdditiveBlending;
  if (isTransparentOrAdditive) return;

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

  // Calculate clearance for each hit (distance to next hit above it)
  for (let i = 0; i < mergedHits.length; i++) {
    const hit = mergedHits[i];
    hit.clearance = (i === 0) ? Infinity : (mergedHits[i - 1].y - hit.y);
    hit.isValid = hit.normalY >= 0.6 && hit.y <= MAX_WALK_HEIGHT && hit.clearance >= HEAD_CLEARANCE;
  }

  let chosenY = baseGy;
  const validHits = mergedHits.filter(h => h.isValid);
  if (validHits.length > 0) {
    chosenY = validHits[0].y; // Highest valid surface
  }

  return { chosenY, mergedHits };
}

console.log('Testing Summoning Room staircase steps from outside (19.5, 20) to door (23.5, 11.5):');
const pOut = { x: 19.5, z: 20.0 };
const pDoor = { x: 23.5, z: 11.5 };
const dist = Math.hypot(pDoor.x - pOut.x, pDoor.z - pOut.z);
const steps = Math.round(dist / 0.1);
let prevY = directRaycastSurfaces(pOut.x, pOut.z).chosenY;
let maxStepJump = 0;
for (let i = 0; i <= steps; i++) {
  const t = i / steps;
  const x = pOut.x + (pDoor.x - pOut.x) * t;
  const z = pOut.z + (pDoor.z - pOut.z) * t;
  const curY = directRaycastSurfaces(x, z).chosenY;
  const jump = Math.abs(curY - prevY);
  if (jump > maxStepJump) maxStepJump = jump;
  if (i % 10 === 0 || i === steps) {
    console.log(`  s=${i}/${steps} (${x.toFixed(2)}, ${z.toFixed(2)}): Y = ${curY.toFixed(3)}, jump = ${jump.toFixed(3)}`);
  }
  prevY = curY;
}
console.log(`Max jump along Summoning Room stairs: ${maxStepJump.toFixed(3)} m`);
