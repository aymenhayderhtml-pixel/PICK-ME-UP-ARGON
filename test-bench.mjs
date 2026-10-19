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

console.log('Total walkable direct meshes:', directMeshes.length);

const raycaster = new THREE.Raycaster();
const rayOrigin = new THREE.Vector3();
const rayDir = new THREE.Vector3(0, -1, 0);

const WALK_RAY_TOP = 6.0;
const MAX_WALK_HEIGHT = 4.2;
const HEAD_CLEARANCE = 2.0;

export function directRaycastSurfaces(x, z) {
  rayOrigin.set(x, WALK_RAY_TOP, z);
  raycaster.set(rayOrigin, rayDir);
  raycaster.near = 0;
  raycaster.far = WALK_RAY_TOP - getGroundY(x, z) + 5.0;

  const rawHits = raycaster.intersectObjects(directMeshes, false);
  // Sort hits by y descending (top to bottom)
  rawHits.sort((a, b) => b.point.y - a.point.y);

  // Group / deduplicate hits within 0.05m
  const mergedHits = [];
  for (const h of rawHits) {
    const y = h.point.y;
    // Calculate world normal
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
      mesh: h.object.name
    });
  }

  // Calculate clearance for each hit
  for (let i = 0; i < mergedHits.length; i++) {
    const hit = mergedHits[i];
    if (i === 0) {
      hit.clearance = Infinity;
    } else {
      hit.clearance = mergedHits[i - 1].y - hit.y;
    }
    hit.isValid = hit.normalY >= 0.6 && hit.y <= MAX_WALK_HEIGHT && hit.clearance >= HEAD_CLEARANCE;
  }

  let chosenY = getGroundY(x, z);
  const validHits = mergedHits.filter(h => h.isValid);
  if (validHits.length > 0) {
    chosenY = validHits[0].y; // highest valid surface
  }

  return { chosenY, mergedHits };
}

const t0 = performance.now();
for (let i = 0; i < 500; i++) {
  directRaycastSurfaces(20 + (i % 20) * 0.5, 10 + Math.floor(i / 20) * 0.5);
}
const t1 = performance.now();
console.log(`500 raycasts took ${(t1 - t0).toFixed(2)} ms (${((t1 - t0) / 500).toFixed(3)} ms/ray)`);
