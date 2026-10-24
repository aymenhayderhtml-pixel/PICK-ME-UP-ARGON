import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE } from './palette.js';
import { FLOOR_DECAL_LAYERS } from './layout.js';
import {
  mulberry32,
  createStoneTexture,
  createPortalSwirlTexture,
  createLandmarkMaterials,
  buildColumnPrototype,
  buildBalusterPrototype
} from './landmarksShared.js';
import {
  buildLandingAreaZone,
  buildSummoningRoomZone,
  buildTownSquareZone
} from './landmarksZones.js';

export { createPortalSwirlTexture };

export function buildLandmarksMain(ctx = {}) {
  const layout = ctx.layout || {};
  const getGroundY = typeof ctx.getGroundY === 'function' ? ctx.getGroundY : () => 0;
  let currentQuality = ctx.quality || 'high';
  const seed = ctx.seed || 1337;
  const P = ctx.PALETTE || PALETTE;

  const rootGroup = new THREE.Group();
  rootGroup.name = 'landmarksMain';

  const stoneTex = createStoneTexture(seed);
  const portalTex = createPortalSwirlTexture();

  const {
    matStone,
    matMoss,
    matGlyph,
    matFloorGlyph,
    matSphere,
    matSphereRing,
    matPortal,
    matShaft,
    matAO,
    list: materials
  } = createLandmarkMaterials(P, stoneTex, portalTex);

  const colliders = [];
  const doors = [];
  const anchors = {};
  const lights = [];

  let animRefs = {
    sphereMesh: null,
    sphereRings: [],
    portalDisc: null,
    portalRings: [],
    shaftMesh: null,
    time: 0
  };

  let stats = { meshes: 0, triangles: 0, drawCallsEstimate: 0 };
  let activeDisposables = [];

  function clearScene() {
    while (rootGroup.children.length > 0) {
      const ch = rootGroup.children[0];
      rootGroup.remove(ch);
    }
    for (const d of activeDisposables) {
      if (d && typeof d.dispose === 'function') d.dispose();
    }
    activeDisposables = [];
    colliders.length = 0;
    doors.length = 0;
    lights.length = 0;
    for (const k of Object.keys(anchors)) delete anchors[k];
    animRefs = {
      sphereMesh: null,
      sphereRings: [],
      portalDisc: null,
      portalRings: [],
      shaftMesh: null,
      time: animRefs.time
    };
  }

  function registerAnchor(name, vec) {
    const obj = new THREE.Object3D();
    obj.name = name;
    obj.position.copy(vec);
    rootGroup.add(obj);
    anchors[name] = vec.clone();
    anchors[`${name}_obj`] = obj;
  }

  function buildGeometryForQuality(q) {
    clearScene();
    const rng = mulberry32(seed + 77);
    const qMult = q === 'low' ? 0.35 : q === 'medium' ? 0.65 : 1.0;

    const stoneGeos = [];
    const mossGeos = [];
    const glyphGeos = [];
    const floorGlyphGeos = [];
    const aoGeos = [];
    const shaftGeos = [];
    const columnMatrices = [];
    const balusterMatrices = [];

    const dummy = new THREE.Object3D();

    const sharedParams = {
      layout,
      getGroundY,
      q,
      qMult,
      P,
      rng,
      rootGroup,
      stoneGeos,
      mossGeos,
      glyphGeos,
      floorGlyphGeos,
      aoGeos,
      shaftGeos,
      columnMatrices,
      balusterMatrices,
      dummy,
      matSphere,
      matSphereRing,
      activeDisposables,
      animRefs,
      colliders,
      doors,
      anchors,
      lights,
      registerAnchor
    };

    buildLandingAreaZone(sharedParams);
    buildSummoningRoomZone(sharedParams);
    buildTownSquareZone(sharedParams);

    let totalTris = 0;
    let totalMeshes = 0;

    function addMergedMesh(geoList, mat, name, receiveOrder = 0) {
      if (geoList.length === 0) return;
      const merged = mergeGeometries(geoList, false);
      for (const g of geoList) g.dispose();
      if (!merged) return;
      activeDisposables.push(merged);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = name;
      mesh.frustumCulled = true;
      if (receiveOrder !== 0) mesh.renderOrder = receiveOrder;
      rootGroup.add(mesh);
      totalMeshes++;
      totalTris += merged.attributes.position.count / 3;
    }

    addMergedMesh(stoneGeos, matStone, 'landmarksMain_stone');
    addMergedMesh(mossGeos, matMoss, 'landmarksMain_moss', FLOOR_DECAL_LAYERS.moss.renderOrder);
    addMergedMesh(floorGlyphGeos, matFloorGlyph, 'landmarksMain_floorGlyphs', FLOOR_DECAL_LAYERS.inlay.renderOrder);
    addMergedMesh(glyphGeos, matGlyph, 'landmarksMain_glyphs');
    addMergedMesh(shaftGeos, matShaft, 'landmarksMain_shafts', 2);

    if (aoGeos.length > 0) {
      const nonIdxAo = aoGeos.map(g => (g.index ? g.toNonIndexed() : g));
      const mergedAo = mergeGeometries(nonIdxAo, false);
      for (const g of aoGeos) g.dispose();
      for (const g of nonIdxAo) g.dispose();
      if (mergedAo) {
        activeDisposables.push(mergedAo);
        const aoMesh = new THREE.Mesh(mergedAo, matAO);
        aoMesh.name = 'landmarksMain_ao';
        aoMesh.renderOrder = 1;
        rootGroup.add(aoMesh);
        totalMeshes++;
        totalTris += mergedAo.attributes.position.count / 3;
      }
    }

    if (columnMatrices.length > 0) {
      const colProto = buildColumnPrototype(q, P, rng);
      activeDisposables.push(colProto);

      const colInst = new THREE.InstancedMesh(colProto, matStone, columnMatrices.length);
      colInst.name = 'landmarksMain_columns';
      for (let i = 0; i < columnMatrices.length; i++) {
        colInst.setMatrixAt(i, columnMatrices[i]);
      }
      colInst.instanceMatrix.needsUpdate = true;
      rootGroup.add(colInst);
      totalMeshes++;
      totalTris += (colProto.attributes.position.count / 3) * columnMatrices.length;
    }

    if (balusterMatrices.length > 0) {
      const balProto = buildBalusterPrototype(q, P, rng);
      activeDisposables.push(balProto);

      const balInst = new THREE.InstancedMesh(balProto, matStone, balusterMatrices.length);
      balInst.name = 'landmarksMain_balusters';
      for (let i = 0; i < balusterMatrices.length; i++) {
        balInst.setMatrixAt(i, balusterMatrices[i]);
      }
      balInst.instanceMatrix.needsUpdate = true;
      rootGroup.add(balInst);
      totalMeshes++;
      totalTris += (balProto.attributes.position.count / 3) * balusterMatrices.length;
    }

    if (animRefs.sphereMesh) {
      totalMeshes++;
      totalTris += animRefs.sphereMesh.geometry.attributes.position.count / 3;
    }
    for (const r of animRefs.sphereRings) {
      totalMeshes++;
      totalTris += r.geometry.attributes.position.count / 3;
    }
    if (animRefs.portalDisc) {
      totalMeshes++;
      totalTris += animRefs.portalDisc.geometry.attributes.position.count / 3;
    }
    for (const r of animRefs.portalRings) {
      totalMeshes++;
      totalTris += r.geometry.attributes.position.count / 3;
    }

    stats = {
      meshes: totalMeshes,
      triangles: Math.round(totalTris),
      drawCallsEstimate: totalMeshes
    };
  }

  buildGeometryForQuality(currentQuality);

  function update(dt = 0.016) {
    animRefs.time += dt;
    const t = animRefs.time;

    if (animRefs.sphereMesh) {
      animRefs.sphereMesh.rotation.y += dt * 0.35;
      animRefs.sphereMesh.position.y = getGroundY(30.0, 4.0) + 1.6 + 5.3 + Math.sin(t * 1.6) * 0.12;
    }

    for (let i = 0; i < animRefs.sphereRings.length; i++) {
      const ring = animRefs.sphereRings[i];
      ring.rotation.y += dt * (0.45 + i * 0.18) * (i % 2 === 0 ? 1 : -1);
      ring.rotation.z += dt * (0.25 + i * 0.1);
      if (animRefs.sphereMesh) {
        ring.position.y = animRefs.sphereMesh.position.y;
      }
    }

    if (animRefs.portalDisc) {
      animRefs.portalDisc.rotation.z -= dt * 0.55;
      const pulse = 0.86 + Math.sin(t * 2.8) * 0.12;
      matPortal.opacity = pulse;
    }

    for (let i = 0; i < animRefs.portalRings.length; i++) {
      const pr = animRefs.portalRings[i];
      pr.rotation.z += dt * (0.65 - i * 0.22) * (i % 2 === 0 ? 1 : -1);
    }
  }

  function setLighting(lighting = {}) {
    const nightBoost = typeof lighting.lampGlow === 'number'
      ? lighting.lampGlow
      : (typeof lighting.windowGlow === 'number' ? lighting.windowGlow : 0.7);

    matSphere.emissiveIntensity = 1.45 + nightBoost * 0.65;
    matSphereRing.emissiveIntensity = 1.25 + nightBoost * 0.55;
    matGlyph.emissiveIntensity = 1.15 + nightBoost * 0.65;
    matShaft.opacity = 0.09 + nightBoost * 0.08;

    for (let i = 0; i < lights.length; i++) {
      const l = lights[i];
      const base = l.baseIntensity || 6.0;
      l.intensity = base * (0.85 + nightBoost * 0.35);
    }
  }

  function setTimeOfDay(t = 0.3) {
    const isNight = t < 0.22 || t > 0.78;
    const nightFactor = isNight ? 1.0 : 0.25;
    setLighting({ lampGlow: nightFactor, windowGlow: nightFactor });
  }

  function setQuality(q) {
    if (!q || q === currentQuality) return;
    currentQuality = q;
    buildGeometryForQuality(currentQuality);
  }

  function getStats() {
    return { ...stats };
  }

  function dispose() {
    clearScene();
    stoneTex.dispose();
    portalTex.dispose();
    for (const m of materials) {
      if (m && typeof m.dispose === 'function') m.dispose();
    }
  }

  return {
    group: rootGroup,
    colliders,
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