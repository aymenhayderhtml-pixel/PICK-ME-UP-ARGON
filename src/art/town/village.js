import * as THREE from 'three';
import { PALETTE as DEFAULT_PALETTE } from './palette.js';
import { LAYOUT } from './layout.js';
import {
  createStonePlasterTexture,
  createFoliageBarkTexture,
  buildCottageArchetypes,
  buildTreeArchetypes,
  buildPropGeometries
} from './villageArchetypes.js';
import {
  COTTAGE_SPECS,
  LAMP_SPECS,
  buildRoadsAndCurbs,
  buildUniqueVillageStructures,
  generateLayoutPlacements
} from './villageLayout.js';

function makeInstanced(geom, mat, items, colorCallback) {
  const count = Math.max(1, items.length);
  const mesh = new THREE.InstancedMesh(geom, mat, count);
  mesh.count = items.length;
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    dummy.position.set(it.x, it.y, it.z);
    dummy.rotation.set(0, it.rotY || 0, 0);
    dummy.scale.set(
      it.sx !== undefined ? it.sx : (it.sc || 1),
      it.sy !== undefined ? it.sy : (it.sc || 1),
      it.sz !== undefined ? it.sz : (it.sc || 1)
    );
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (colorCallback) {
      colorCallback(col, it, i);
      mesh.setColorAt(i, col);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}

export function buildTownVillage(ctx = {}) {
  const PAL = { ...DEFAULT_PALETTE, ...(ctx.PALETTE || {}) };
  const getY = typeof ctx.getGroundY === 'function' ? ctx.getGroundY : () => 0;
  const layout = ctx.layout || LAYOUT;
  let currentQuality = ctx.quality || 'high';
  const isNightInit = ctx.time === 'night' || ctx.time === 'dusk';

  const group = new THREE.Group();
  group.name = 'TownVillage';

  const texStone = createStonePlasterTexture();
  const texFoliage = createFoliageBarkTexture();

  const matArchitecture = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texStone,
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.06
  });

  const matFoliage = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texFoliage,
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.02,
    emissive: new THREE.Color(PAL.teal),
    emissiveIntensity: isNightInit ? 0.06 : 0.0
  });

  const matProps = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.86,
    metalness: 0.08
  });

  const matWindowGlow = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PAL.warmWindow),
    vertexColors: true,
    roughness: 0.35,
    metalness: 0.0,
    emissive: new THREE.Color(PAL.warmWindow),
    emissiveIntensity: isNightInit ? 1.35 : 0.0
  });

  const matLampGlow = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xffdfa0),
    vertexColors: true,
    roughness: 0.25,
    metalness: 0.0,
    emissive: new THREE.Color(0xffaa44),
    emissiveIntensity: isNightInit ? 1.65 : 0.0
  });

  const materials = [matArchitecture, matFoliage, matProps, matWindowGlow, matLampGlow];
  const geometries = [];

  const colliders = [];
  const blockers = [];
  const doors = [];
  const anchors = {};
  const lights = [];

  const { roadGeometry, paverTransforms } = buildRoadsAndCurbs(getY, PAL);
  geometries.push(roadGeometry);
  const roadMesh = new THREE.Mesh(roadGeometry, matArchitecture);
  roadMesh.name = 'VillageRoads';
  group.add(roadMesh);

  const { uniqueOpaque, uniqueLanternGlow } = buildUniqueVillageStructures(getY, PAL, colliders, anchors, blockers, layout);
  geometries.push(uniqueOpaque, uniqueLanternGlow);
  const uniqueMesh = new THREE.Mesh(uniqueOpaque, matArchitecture);
  uniqueMesh.name = 'VillageUniqueStructures';
  group.add(uniqueMesh);

  const festoonGlowMesh = new THREE.Mesh(uniqueLanternGlow, matLampGlow);
  festoonGlowMesh.name = 'VillageFestoonLanterns';
  group.add(festoonGlowMesh);

  const cottageArch = buildCottageArchetypes(PAL);
  geometries.push(cottageArch.lodOpaque, cottageArch.lodWin);
  for (const v of cottageArch.variants) {
    geometries.push(v.opaque, v.windows, v.lantern);
  }

  const cottageByVariant = [[], [], [], []];
  const allCottageInstances = [];

  for (let i = 0; i < COTTAGE_SPECS.length; i++) {
    const c = COTTAGE_SPECS[i];
    const cy = getY(c.x, c.z);
    const inst = {
      spec: c,
      x: c.x,
      y: cy,
      z: c.z,
      rotY: 0,
      sc: 1.0,
      tint: i
    };
    cottageByVariant[c.variant].push(inst);
    allCottageInstances.push(inst);

    colliders.push({ type: 'box', x: c.x, z: c.z, w: 4.3, d: 3.7, rotY: 0 });

    const dy = getY(c.doorX, c.doorZ);
    doors.push({
      id: c.id,
      position: new THREE.Vector3(c.doorX, dy, c.doorZ),
      outward: new THREE.Vector3(0, 0, 1)
    });

    const lx = c.x - 1.58;
    const lz = c.z + 2.04;
    anchors[`lantern_${c.id}`] = new THREE.Vector3(lx, cy + 1.98, lz);
    anchors[`${c.id}_lantern`] = anchors[`lantern_${c.id}`];
  }

  doors.push({
    id: 'residences',
    position: new THREE.Vector3(-18.0, getY(-18.0, -4.0), -4.0),
    outward: new THREE.Vector3(1, 0, 0)
  });

  const cottageVariantMeshes = [];
  for (let v = 0; v < 4; v++) {
    const list = cottageByVariant[v];
    const mOpaque = makeInstanced(cottageArch.variants[v].opaque, matArchitecture, list, (col, it) => {
      const shift = (it.tint % 3 - 1) * 0.03;
      col.setRGB(1.0 + shift, 1.0 + shift * 0.5, 1.0 - shift);
    });
    const mWin = makeInstanced(cottageArch.variants[v].windows, matWindowGlow, list);
    const mLantern = makeInstanced(cottageArch.variants[v].lantern, matLampGlow, list);
    group.add(mOpaque, mWin, mLantern);
    cottageVariantMeshes.push({ list, mOpaque, mWin, mLantern });
  }

  const cottageLodOpaqueMesh = makeInstanced(cottageArch.lodOpaque, matArchitecture, allCottageInstances);
  const cottageLodWinMesh = makeInstanced(cottageArch.lodWin, matWindowGlow, allCottageInstances);
  cottageLodOpaqueMesh.count = 0;
  cottageLodWinMesh.count = 0;
  group.add(cottageLodOpaqueMesh, cottageLodWinMesh);

  const treeArch = buildTreeArchetypes(PAL);
  for (const tv of treeArch) {
    geometries.push(tv.trunk, tv.crown, tv.lod);
  }

  const placements = generateLayoutPlacements(getY, PAL);
  for (const pc of placements.propColliders) {
    colliders.push(pc);
  }
  for (const pb of placements.blockers) {
    blockers.push(pb);
  }

  const treesByVariant = [[], [], []];
  for (const t of placements.trees) {
    treesByVariant[t.variant % 3].push(t);
  }

  const treeVariantMeshes = [];
  for (let v = 0; v < 3; v++) {
    const list = treesByVariant[v];
    const mTrunk = makeInstanced(treeArch[v].trunk, matProps, list, (col, it, idx) => {
      const s = 0.92 + (idx % 4) * 0.04;
      col.setRGB(s, s * 0.98, s * 0.95);
    });
    const mCrown = makeInstanced(treeArch[v].crown, matFoliage, list, (col, it, idx) => {
      const s = 0.90 + (idx % 5) * 0.045;
      col.setRGB(s * 0.96, s * 1.03, s);
    });
    const mLod = makeInstanced(treeArch[v].lod, matFoliage, list);
    mLod.count = 0;
    group.add(mTrunk, mCrown, mLod);
    treeVariantMeshes.push({ list, mTrunk, mCrown, mLod });
  }

  const propGeoms = buildPropGeometries(PAL);
  Object.values(propGeoms).forEach((g) => geometries.push(g));

  const lampItems = [];
  for (const lp of LAMP_SPECS) {
    const ly = getY(lp.x, lp.z);
    lampItems.push({ x: lp.x, y: ly, z: lp.z, rotY: lp.rotY, sc: 1.0 });
    colliders.push({ type: 'circle', x: lp.x, z: lp.z, r: 0.35 });

    const lightPos = new THREE.Vector3(
      lp.x + Math.cos(lp.rotY) * 0.52,
      ly + 3.02,
      lp.z - Math.sin(lp.rotY) * 0.52
    );
    anchors[lp.id] = lightPos.clone();

    if (!lp.extra) {
      lights.push({
        position: lightPos,
        color: lp.color,
        intensity: isNightInit ? lp.intensity : 0.0,
        baseIntensity: lp.intensity,
        distance: lp.distance
      });
    }
  }

  const lampOpaqueMesh = makeInstanced(propGeoms.lampPostOpaque, matArchitecture, lampItems);
  const lampGlowMesh = makeInstanced(propGeoms.lampPostGlow, matLampGlow, lampItems);
  group.add(lampOpaqueMesh, lampGlowMesh);

  const hedgeMesh = makeInstanced(propGeoms.hedgeGeom, matFoliage, placements.hedges, (col, it, idx) => {
    const v = 0.92 + (idx % 3) * 0.05;
    col.setRGB(v * 0.95, v * 1.02, v);
  });
  const fenceMesh = makeInstanced(propGeoms.fenceGeom, matProps, placements.fences);
  const benchMesh = makeInstanced(propGeoms.benchGeom, matProps, placements.benches);
  const barrelMesh = makeInstanced(propGeoms.barrelGeom, matProps, placements.barrels);
  const crateMesh = makeInstanced(propGeoms.crateGeom, matProps, placements.crates);
  const sackMesh = makeInstanced(propGeoms.sackGeom, matProps, placements.sacks);
  const hayMesh = makeInstanced(propGeoms.hayGeom, matProps, placements.hays);
  const flowerBedMesh = makeInstanced(propGeoms.flowerBedGeom, matProps, placements.flowerBeds);
  const paverMesh = makeInstanced(propGeoms.paverGeom, matArchitecture, paverTransforms, (col, it) => {
    const v = 0.90 + it.tint * 0.16;
    col.setRGB(v, v * 1.01, v * 1.02);
  });
  const grassMesh = makeInstanced(propGeoms.grassGeom, matFoliage, placements.grass, (col, it) => {
    const v = 0.86 + it.tint * 0.26;
    col.setRGB(v * 0.94, v * 1.04, v * 0.98);
  });
  const pebbleMesh = makeInstanced(propGeoms.pebbleGeom, matProps, placements.pebbles, (col, it) => {
    if (it.tint > 0.72) {
      col.setHex(0x6fe0f0);
    } else if (it.tint > 0.52) {
      col.setHex(0xffd28a);
    } else {
      const v = 0.85 + it.tint * 0.25;
      col.setRGB(v, v, v);
    }
  });

  group.add(
    hedgeMesh,
    fenceMesh,
    benchMesh,
    barrelMesh,
    crateMesh,
    sackMesh,
    hayMesh,
    flowerBedMesh,
    paverMesh,
    grassMesh,
    pebbleMesh
  );

  const _dummy = new THREE.Object3D();
  let _lodTimer = 0;
  let _lastLampGlow = isNightInit ? 1.0 : 0.0;
  let _lastWindowGlow = isNightInit ? 1.0 : 0.0;
  let _timeAccum = 0;

  function applyQualityCounts(q) {
    currentQuality = q || 'high';
    const scale = currentQuality === 'low' ? 0.30 : currentQuality === 'medium' ? 0.60 : 1.0;

    grassMesh.count = Math.floor(placements.grass.length * scale);
    pebbleMesh.count = Math.floor(placements.pebbles.length * scale);
    paverMesh.count = Math.floor(paverTransforms.length * (currentQuality === 'low' ? 0.45 : currentQuality === 'medium' ? 0.75 : 1.0));
    flowerBedMesh.count = Math.max(4, Math.floor(placements.flowerBeds.length * (currentQuality === 'low' ? 0.5 : 1.0)));
    sackMesh.count = Math.max(2, Math.floor(placements.sacks.length * scale));
    hayMesh.count = Math.max(2, Math.floor(placements.hays.length * scale));

    const treeRatio = currentQuality === 'low' ? 0.42 : currentQuality === 'medium' ? 0.72 : 1.0;
    for (let v = 0; v < 3; v++) {
      const tv = treeVariantMeshes[v];
      const activeCount = Math.max(4, Math.floor(tv.list.length * treeRatio));
      tv.mTrunk.count = activeCount;
      tv.mCrown.count = activeCount;
      tv.mLod.count = 0;
    }

    for (let v = 0; v < 4; v++) {
      const cv = cottageVariantMeshes[v];
      cv.mOpaque.count = cv.list.length;
      cv.mWin.count = cv.list.length;
      cv.mLantern.count = cv.list.length;
    }
    cottageLodOpaqueMesh.count = 0;
    cottageLodWinMesh.count = 0;
  }

  applyQualityCounts(currentQuality);

  function updateDistanceLOD(camera) {
    if (!camera || !camera.position) return;
    const camX = camera.position.x;
    const camZ = camera.position.z;

    const cottageDistSq = 64 * 64;
    let lodCottageIdx = 0;

    for (let v = 0; v < 4; v++) {
      const cv = cottageVariantMeshes[v];
      let nearIdx = 0;
      for (let i = 0; i < cv.list.length; i++) {
        const it = cv.list[i];
        const dx = it.x - camX;
        const dz = it.z - camZ;
        const d2 = dx * dx + dz * dz;
        _dummy.position.set(it.x, it.y, it.z);
        _dummy.rotation.set(0, it.rotY, 0);
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();

        if (d2 > cottageDistSq && currentQuality !== 'low') {
          cottageLodOpaqueMesh.setMatrixAt(lodCottageIdx, _dummy.matrix);
          cottageLodWinMesh.setMatrixAt(lodCottageIdx, _dummy.matrix);
          lodCottageIdx++;
        } else {
          cv.mOpaque.setMatrixAt(nearIdx, _dummy.matrix);
          cv.mWin.setMatrixAt(nearIdx, _dummy.matrix);
          cv.mLantern.setMatrixAt(nearIdx, _dummy.matrix);
          nearIdx++;
        }
      }
      cv.mOpaque.count = nearIdx;
      cv.mWin.count = nearIdx;
      cv.mLantern.count = nearIdx;
      cv.mOpaque.instanceMatrix.needsUpdate = true;
      cv.mWin.instanceMatrix.needsUpdate = true;
      cv.mLantern.instanceMatrix.needsUpdate = true;
    }
    cottageLodOpaqueMesh.count = lodCottageIdx;
    cottageLodWinMesh.count = lodCottageIdx;
    cottageLodOpaqueMesh.instanceMatrix.needsUpdate = true;
    cottageLodWinMesh.instanceMatrix.needsUpdate = true;

    const treeDistSq = 56 * 56;
    const treeRatio = currentQuality === 'low' ? 0.42 : currentQuality === 'medium' ? 0.72 : 1.0;
    for (let v = 0; v < 3; v++) {
      const tv = treeVariantMeshes[v];
      const maxActive = Math.max(4, Math.floor(tv.list.length * treeRatio));
      let nearIdx = 0;
      let farIdx = 0;
      for (let i = 0; i < maxActive; i++) {
        const it = tv.list[i];
        const dx = it.x - camX;
        const dz = it.z - camZ;
        const d2 = dx * dx + dz * dz;
        _dummy.position.set(it.x, it.y, it.z);
        _dummy.rotation.set(0, it.rotY, 0);
        _dummy.scale.set(it.sc, it.sc, it.sc);
        _dummy.updateMatrix();

        if (d2 > treeDistSq) {
          tv.mLod.setMatrixAt(farIdx++, _dummy.matrix);
        } else {
          tv.mTrunk.setMatrixAt(nearIdx, _dummy.matrix);
          tv.mCrown.setMatrixAt(nearIdx, _dummy.matrix);
          nearIdx++;
        }
      }
      tv.mTrunk.count = nearIdx;
      tv.mCrown.count = nearIdx;
      tv.mLod.count = farIdx;
      tv.mTrunk.instanceMatrix.needsUpdate = true;
      tv.mCrown.instanceMatrix.needsUpdate = true;
      tv.mLod.instanceMatrix.needsUpdate = true;
    }
  }

  function setLighting(lighting) {
    if (!lighting) return;
    const winGlow = lighting.windowGlow !== undefined ? lighting.windowGlow : 0;
    const lmpGlow = lighting.lampGlow !== undefined ? lighting.lampGlow : 0;
    _lastWindowGlow = winGlow;
    _lastLampGlow = lmpGlow;

    matWindowGlow.emissiveIntensity = winGlow * 1.45;
    matLampGlow.emissiveIntensity = lmpGlow * 1.75;
    matFoliage.emissiveIntensity = lmpGlow * 0.075;

    for (let i = 0; i < lights.length; i++) {
      lights[i].intensity = lights[i].baseIntensity * lmpGlow;
    }
  }

  function setTimeOfDay(t) {
    const isNight = t >= 0.58 || t <= 0.08;
    const g = isNight ? 1.0 : 0.0;
    setLighting({ windowGlow: g, lampGlow: g });
  }

  function update(dt = 0.016, camera = null) {
    _timeAccum += dt;
    _lodTimer += dt;

    if (_lastLampGlow > 0.01) {
      const flicker = 1.0 + Math.sin(_timeAccum * 7.5) * 0.04 + Math.cos(_timeAccum * 13.0) * 0.025;
      matLampGlow.emissiveIntensity = _lastLampGlow * 1.75 * flicker;
    }

    if (camera && _lodTimer >= 0.25) {
      _lodTimer = 0;
      updateDistanceLOD(camera);
    }
  }

  function setQuality(q) {
    applyQualityCounts(q);
  }

  function getStats() {
    let meshes = 0;
    let triangles = 0;
    let drawCallsEstimate = 0;

    group.traverse((obj) => {
      if (obj.isMesh && obj.visible) {
        const count = obj.isInstancedMesh ? obj.count : 1;
        if (count <= 0) return;
        meshes++;
        drawCallsEstimate++;
        const geom = obj.geometry;
        if (geom) {
          const triCount = geom.index
            ? geom.index.count / 3
            : (geom.attributes.position ? geom.attributes.position.count / 3 : 0);
          triangles += Math.round(triCount * count);
        }
      }
    });

    return { meshes, triangles, drawCallsEstimate };
  }

  function dispose() {
    for (const g of geometries) {
      if (g && typeof g.dispose === 'function') g.dispose();
    }
    for (const m of materials) {
      if (m && typeof m.dispose === 'function') m.dispose();
    }
    texStone.dispose();
    texFoliage.dispose();
  }

  return {
    group,
    colliders,
    blockers,
    doors,
    anchors,
    lights,
    update,
    setLighting,
    setTimeOfDay,
    setQuality,
    getStats,
    dispose
  };
}