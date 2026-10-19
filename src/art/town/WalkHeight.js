// src/art/town/WalkHeight.js
import * as THREE from 'three';

export const WALK_RAY_TOP = 6.0;
export const MAX_WALK_HEIGHT = 4.2;
export const HEAD_CLEARANCE = 2.0;

// Maximum height of a walkable floor surface in town (excludes overhead structures/lintels/roofs)
const MAX_FLOOR_Y = 2.15;

// Building floor envelopes for continuous interior floors
const buildingFloors = [
  { id: 'summoning_room', type: 'circle', cx: 30.0, cz: 4.0, radius: 10.4, floorY: 1.625, maxWalkY: 1.75 },
  { id: 'synthesis_chamber', type: 'circle', cx: 0.0, cz: -32.0, radius: 12.0, floorY: 0.81, maxWalkY: 0.90 },
  { id: 'armory', type: 'box', cx: -6.0, cz: -20.0, hw: 6.0, hd: 8.0, floorY: 0.81, maxWalkY: 0.85 },
  { id: 'space_time_rift', type: 'box', cx: 27.0, cz: -29.0, hw: 4.5, hd: 7.0, floorY: 0.88, maxWalkY: 0.95 },
  { id: 'training_grounds', type: 'box', cx: -24.0, cz: 20.0, hw: 12.0, hd: 12.0, floorY: 0.10, maxWalkY: 0.20 },
  { id: 'cottage_1', type: 'box', cx: -32.5, cz: -15.5, hw: 5.5, hd: 7.0, floorY: 0.40, maxWalkY: 0.45 },
  { id: 'mess_hall_row', type: 'box', cx: 8.0, cz: 40.0, hw: 14.0, hd: 7.0, floorY: 1.575, maxWalkY: 1.65 },
  { id: 'dungeon_board', type: 'box', cx: 6.0, cz: -2.0, hw: 3.5, hd: 3.5, floorY: 0.06, maxWalkY: 0.20 },
];

function getBuildingSpec(x, z) {
  for (const bf of buildingFloors) {
    if (bf.type === 'circle') {
      if (Math.hypot(x - bf.cx, z - bf.cz) <= bf.radius) return bf;
    } else if (bf.type === 'box') {
      if (Math.abs(x - bf.cx) <= bf.hw && Math.abs(z - bf.cz) <= bf.hd) return bf;
    }
  }
  return null;
}

function getBuildingFloorY(x, z) {
  const spec = getBuildingSpec(x, z);
  return spec ? spec.floorY : null;
}

function getMaxWalkY(x, z) {
  const spec = getBuildingSpec(x, z);
  return spec ? spec.maxWalkY : MAX_FLOOR_Y;
}

/**
 * Builds a 2D walk-height grid map by raycasting/sampling against town walkable geometry.
 * Spreads work progressively across animation frames using a 2D spatial triangle index,
 * guaranteeing zero main-thread hitching while achieving exact step/platform contact.
 *
 * @param {THREE.Group} townGroup Assembled town group containing all meshes
 * @param {Function} getGroundY Base analytical terrain ground height function
 * @param {Object} bounds { minX, maxX, minZ, maxZ }
 * @param {number} spacing Grid resolution in world units (default 0.25m for sharp stairs)
 * @param {boolean} synchronous If true, computes entire map immediately in one pass
 * @returns {{ getWalkY: Function, directRaycast: Function, getSurfaceCandidates: Function, dispose: Function, isReady: Function, getProgress: Function }}
 */
export function buildWalkHeightMap(townGroup, getGroundY, bounds = {}, spacing = 0.25, synchronous = false) {
  const minX = bounds.minX ?? -50;
  const maxX = bounds.maxX ?? 50;
  const minZ = bounds.minZ ?? -50;
  const maxZ = bounds.maxZ ?? 50;

  const cols = Math.round((maxX - minX) / spacing) + 1;
  const rows = Math.round((maxZ - minZ) / spacing) + 1;
  const totalRays = cols * rows;
  const heightData = new Float32Array(totalRays);

  // Initialize heightData with base terrain height
  for (let idx = 0; idx < totalRays; idx++) {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = minX + col * spacing;
    const z = minZ + row * spacing;
    heightData[idx] = getGroundY(x, z);
  }

  // 1. Build a 2D spatial grid of walkable triangles
  const cellSize = 2.0;
  const gridW = Math.ceil((maxX - minX) / cellSize);
  const gridH = Math.ceil((maxZ - minZ) / cellSize);
  const grid = new Array(gridW * gridH);
  for (let i = 0; i < grid.length; i++) grid[i] = [];

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
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

  if (townGroup && typeof townGroup.traverse === 'function') {
    townGroup.updateMatrixWorld(true);
    townGroup.traverse((obj) => {
      if (!obj.isMesh || !obj.visible) return;
      if (obj.userData?.noWalk) return;

      const name = (obj.name || '').toLowerCase();
      // Skip decorative, translucent, environmental or non-walkable meshes per contract
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
      ) {
        return;
      }

      const mat = obj.material;
      if (!mat) return;
      const isTransparentOrAdditive = Array.isArray(mat)
        ? mat.some((m) => m.transparent || m.blending === THREE.AdditiveBlending)
        : mat.transparent || mat.blending === THREE.AdditiveBlending;

      if (isTransparentOrAdditive) return;

      // Keep only cottage architectural instanced meshes
      if (obj.isInstancedMesh && (obj.count > 10 || obj.count === 0)) return;

      const geo = obj.geometry;
      if (!geo || !geo.attributes || !geo.attributes.position) return;

      if (!geo.boundingSphere) geo.computeBoundingSphere();
      if (!geo.boundingBox) geo.computeBoundingBox();

      if (obj.isInstancedMesh) {
        for (let inst = 0; inst < obj.count; inst++) {
          obj.getMatrixAt(inst, dummyMatrix);
          dummyMatrix.premultiply(obj.matrixWorld);
          addMeshTriangles(geo, dummyMatrix);
        }
      } else {
        addMeshTriangles(geo, obj.matrixWorld);
      }
    });
  }

  function sampleSurfaces(x, z) {
    const baseGy = getGroundY(x, z);
    const bfY = getBuildingFloorY(x, z);

    const gx = Math.min(gridW - 1, Math.max(0, Math.floor((x - minX) / cellSize)));
    const gz = Math.min(gridH - 1, Math.max(0, Math.floor((z - minZ) / cellSize)));
    const cellTris = grid[gz * gridW + gx];

    const rawHits = [];
    if (cellTris) {
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
      hit.isValid = hit.normalY >= 0.6 && hit.y <= MAX_FLOOR_Y && hit.clearance >= 1.5;
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

  function directRaycast(x, z) {
    return sampleSurfaces(x, z).chosenY;
  }

  function getSurfaceCandidates(x, z) {
    const res = sampleSurfaces(x, z);
    const candidates = res.mergedHits.slice(0, 4).map(h => ({
      y: Number(h.y.toFixed(2)),
      normalY: Number(h.normalY.toFixed(2)),
      clearance: h.clearance === Infinity ? 'inf' : Number(h.clearance.toFixed(2)),
      isValid: Boolean(h.isValid)
    }));
    return { chosenY: Number(res.chosenY.toFixed(2)), candidates };
  }

  // 2. Progressive multi-frame height evaluation
  let currentIndex = 0;
  let isReadyFlag = false;
  let rafId = null;
  let disposed = false;

  function processCell(idx) {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = minX + col * spacing;
    const z = minZ + row * spacing;
    heightData[idx] = sampleSurfaces(x, z).chosenY;
  }

  function processChunk() {
    if (disposed) return;
    const frameStart = performance.now();
    const chunkEnd = Math.min(totalRays, currentIndex + 2500);

    for (; currentIndex < chunkEnd; currentIndex++) {
      processCell(currentIndex);
      if (currentIndex % 250 === 0 && performance.now() - frameStart >= 4.0) {
        currentIndex++;
        break;
      }
    }

    if (currentIndex < totalRays) {
      if (typeof requestAnimationFrame !== 'undefined') {
        rafId = requestAnimationFrame(processChunk);
      } else {
        processChunk();
      }
    } else {
      isReadyFlag = true;
    }
  }

  if (synchronous) {
    for (let i = 0; i < totalRays; i++) {
      processCell(i);
    }
    isReadyFlag = true;
    currentIndex = totalRays;
  } else {
    processChunk();
  }

  /**
   * Bilinear interpolation for height at (x, z).
   * Stair edge rule: do not interpolate across height jump > 0.6 between neighboring cells.
   */
  function getWalkY(x, z) {
    if (x < minX || x > maxX || z < minZ || z > maxZ) {
      return getGroundY(x, z);
    }

    const u = (x - minX) / spacing;
    const v = (z - minZ) / spacing;
    const c0 = Math.floor(u);
    const r0 = Math.floor(v);
    const c1 = Math.min(cols - 1, c0 + 1);
    const r1 = Math.min(rows - 1, r0 + 1);

    const fx = u - c0;
    const fz = v - r0;

    const y00 = heightData[r0 * cols + c0];
    const y10 = heightData[r0 * cols + c1];
    const y01 = heightData[r1 * cols + c0];
    const y11 = heightData[r1 * cols + c1];

    // Sharp stair edge clamping rule: do not interpolate across a height jump larger than 0.6m
    if (
      Math.abs(y10 - y00) > 0.6 || Math.abs(y01 - y00) > 0.6 ||
      Math.abs(y11 - y10) > 0.6 || Math.abs(y11 - y01) > 0.6
    ) {
      const nearCol = fx < 0.5 ? c0 : c1;
      const nearRow = fz < 0.5 ? r0 : r1;
      return heightData[nearRow * cols + nearCol];
    }

    const y0 = y00 + (y10 - y00) * fx;
    const y1 = y01 + (y11 - y01) * fx;
    return y0 + (y1 - y0) * fz;
  }

  function dispose() {
    disposed = true;
    if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function isReady() {
    return isReadyFlag;
  }

  function getProgress() {
    return totalRays > 0 ? currentIndex / totalRays : 1.0;
  }

  return {
    getWalkY,
    directRaycast,
    getSurfaceCandidates,
    dispose,
    isReady,
    getProgress,
    _data: heightData,
    _bounds: { minX, maxX, minZ, maxZ, spacing, cols, rows },
  };
}

/**
 * Runtime underground guard: if an entity's feet stay more than 0.4 below getWalkY for 0.3 seconds,
 * snap it up to the surface immediately and console.warn once per entity with its position.
 */
export function updateUndergroundGuard(entity, delta, getWalkY) {
  if (!entity) return;
  const pos = entity.position || entity.mesh?.position;
  if (!pos || typeof getWalkY !== 'function') return;

  const walkY = getWalkY(pos.x, pos.z);
  if (pos.y < walkY - 0.4) {
    entity._undergroundTimer = (entity._undergroundTimer || 0) + delta;
    if (entity._undergroundTimer >= 0.3) {
      pos.y = walkY;
      entity._undergroundTimer = 0;
      if (!entity._undergroundWarned) {
        entity._undergroundWarned = true;
        console.warn(`[UndergroundGuard] Entity snapped to surface at (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
      }
    }
  } else {
    entity._undergroundTimer = 0;
  }
}
