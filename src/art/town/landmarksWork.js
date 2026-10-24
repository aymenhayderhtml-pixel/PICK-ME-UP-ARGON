import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE } from './palette.js';
import {
  mulberry32,
  createStoneTexture,
  createPlasterWoodTexture,
  buildSynthesisChamber,
  buildArmory,
  buildTrainingGrounds,
  buildMessHallRow,
  buildDungeonBoard,
  buildWorkInstancedMeshes
} from './landmarksWorkZones.js';

export function buildLandmarksWork(ctx = {}) {
  const layout = ctx.layout || {};
  const getGroundY = typeof ctx.getGroundY === 'function' ? ctx.getGroundY : () => 0;
  let currentQuality = ctx.quality || 'high';
  const seed = ctx.seed || 2468;
  const P = ctx.PALETTE || PALETTE;

  const rootGroup = new THREE.Group();
  rootGroup.name = 'landmarksWork';

  const stoneTex = createStoneTexture(seed);
  const plasterTex = createPlasterWoodTexture(seed + 19);

  const matStone = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: stoneTex,
    roughness: 0.86,
    metalness: 0.06,
    vertexColors: true
  });

  const matPlasterWood = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: plasterTex,
    roughness: 0.82,
    metalness: 0.05,
    vertexColors: true
  });

  const matMetalGold = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.36,
    metalness: 0.72,
    vertexColors: true
  });

  const matMossDirt = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.94,
    metalness: 0.02,
    vertexColors: true
  });

  const matCrimson = new THREE.MeshStandardMaterial({
    color: P.crimsonGlow || 0xff3a4a,
    emissive: P.crimsonGlow || 0xff3a4a,
    emissiveIntensity: 1.65,
    roughness: 0.28,
    metalness: 0.1,
    vertexColors: true
  });

  const matForge = new THREE.MeshStandardMaterial({
    color: P.forgeOrange || 0xff8a3a,
    emissive: P.forgeOrange || 0xff8a3a,
    emissiveIntensity: 1.85,
    roughness: 0.25,
    metalness: 0.08,
    vertexColors: true
  });

  const matWindow = new THREE.MeshStandardMaterial({
    color: P.warmWindow || 0xffc27a,
    emissive: P.warmWindow || 0xffc27a,
    emissiveIntensity: 0.9,
    roughness: 0.35,
    metalness: 0.05,
    vertexColors: true
  });

  const matSignGlyph = new THREE.MeshStandardMaterial({
    color: P.teal || 0x6fe0f0,
    emissive: P.teal || 0x6fe0f0,
    emissiveIntensity: 1.35,
    roughness: 0.3,
    metalness: 0.1,
    vertexColors: true
  });

  const matAO = new THREE.MeshBasicMaterial({
    color: 0x161e22,
    transparent: true,
    opacity: 0.44,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });

  const matTrainWood = new THREE.MeshStandardMaterial({
    color: P.wood || 0x6a4a2e, roughness: 0.85, metalness: 0.05
  });
  const matTrainStraw = new THREE.MeshStandardMaterial({
    color: 0xc9b183, roughness: 0.95, metalness: 0.0
  });
  const matTrainStone = new THREE.MeshStandardMaterial({
    color: P.stoneMid || 0xaab4ba, roughness: 0.88, metalness: 0.05
  });
  const matTrainFlame = new THREE.MeshStandardMaterial({
    color: P.forgeOrange || 0xff8a3a,
    emissive: P.forgeOrange || 0xff8a3a,
    emissiveIntensity: 1.6,
    roughness: 0.3,
    metalness: 0.05
  });
  const matTrainRope = new THREE.MeshStandardMaterial({
    color: P.gold || 0xd8b45a, roughness: 0.45, metalness: 0.5
  });

  const materials = [
    matStone,
    matPlasterWood,
    matMetalGold,
    matMossDirt,
    matCrimson,
    matForge,
    matWindow,
    matSignGlyph,
    matAO,
    matTrainWood,
    matTrainStraw,
    matTrainStone,
    matTrainFlame,
    matTrainRope
  ];

  const colliders = [];
  const doors = [];
  const anchors = {};
  const lights = [];

  let animRefs = {
    forgeLightIdx: -1,
    synthLightIdx: -1,
    dummies: [],
    flames: [],
    time: 0
  };

  let stats = { meshes: 0, triangles: 0, drawCallsEstimate: 0 };
  let activeDisposables = [];

  function clearScene() {
    while (rootGroup.children.length > 0) {
      rootGroup.remove(rootGroup.children[0]);
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
      forgeLightIdx: -1,
      synthLightIdx: -1,
      dummies: [],
      flames: [],
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
    const rng = mulberry32(seed + 99);

    const stoneGeos = [];
    const plasterWoodGeos = [];
    const metalGoldGeos = [];
    const mossDirtGeos = [];
    const crimsonGeos = [];
    const forgeGeos = [];
    const windowGeos = [];
    const signGlyphGeos = [];
    const aoGeos = [];

    const columnMatrices = [];
    const stakeMatrices = [];
    const crateMatrices = [];

    const dummy = new THREE.Object3D();

    const bCtx = {
      q,
      rng,
      layout,
      getGroundY,
      P,
      rootGroup,
      dummy,
      stoneGeos,
      plasterWoodGeos,
      metalGoldGeos,
      mossDirtGeos,
      crimsonGeos,
      forgeGeos,
      windowGeos,
      signGlyphGeos,
      aoGeos,
      columnMatrices,
      stakeMatrices,
      crateMatrices,
      activeDisposables,
      colliders,
      doors,
      anchors,
      lights,
      animRefs,
      registerAnchor,
      matStone,
      matPlasterWood,
      matTrainWood,
      matTrainStraw,
      matTrainStone,
      matTrainFlame,
      matTrainRope
    };

    buildSynthesisChamber(bCtx);
    buildArmory(bCtx);
    const sharedDummyGeo = buildTrainingGrounds(bCtx);
    buildMessHallRow(bCtx);
    buildDungeonBoard(bCtx);

    let totalTris = 0;
    let totalMeshes = 0;

    function addMergedMesh(geoList, mat, name, renderOrder = 0) {
      if (geoList.length === 0) return;
      const merged = mergeGeometries(geoList, false);
      for (const g of geoList) g.dispose();
      if (!merged) return;
      activeDisposables.push(merged);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = name;
      mesh.frustumCulled = true;
      if (renderOrder !== 0) mesh.renderOrder = renderOrder;
      rootGroup.add(mesh);
      totalMeshes++;
      totalTris += merged.attributes.position.count / 3;
    }

    addMergedMesh(stoneGeos, matStone, 'landmarksWork_stone');
    addMergedMesh(plasterWoodGeos, matPlasterWood, 'landmarksWork_plasterWood');
    addMergedMesh(metalGoldGeos, matMetalGold, 'landmarksWork_metalGold');
    addMergedMesh(mossDirtGeos, matMossDirt, 'landmarksWork_mossDirt');
    addMergedMesh(crimsonGeos, matCrimson, 'landmarksWork_crimson');
    addMergedMesh(forgeGeos, matForge, 'landmarksWork_forge');
    addMergedMesh(windowGeos, matWindow, 'landmarksWork_windows');
    addMergedMesh(signGlyphGeos, matSignGlyph, 'landmarksWork_signGlyphs');

    if (aoGeos.length > 0) {
      const nonIdxAo = aoGeos.map(g => (g.index ? g.toNonIndexed() : g));
      const mergedAo = mergeGeometries(nonIdxAo, false);
      for (const g of aoGeos) g.dispose();
      for (const g of nonIdxAo) g.dispose();
      if (mergedAo) {
        activeDisposables.push(mergedAo);
        const aoMesh = new THREE.Mesh(mergedAo, matAO);
        aoMesh.name = 'landmarksWork_ao';
        aoMesh.renderOrder = 1;
        rootGroup.add(aoMesh);
        totalMeshes++;
        totalTris += mergedAo.attributes.position.count / 3;
      }
    }

    const { addedMeshes, addedTris } = buildWorkInstancedMeshes(bCtx);
    totalMeshes += addedMeshes;
    totalTris += addedTris;

    if (animRefs.dummies.length > 0 && sharedDummyGeo) {
      const dTris = sharedDummyGeo.attributes.position.count / 3;
      totalMeshes += animRefs.dummies.length;
      totalTris += dTris * animRefs.dummies.length;
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

    const flicker = 1.0 + Math.sin(t * 9.5) * 0.12 + Math.cos(t * 15.3) * 0.06;
    matForge.emissiveIntensity = (matForge.userData.baseEmissive || 1.85) * flicker;
    matCrimson.emissiveIntensity = (matCrimson.userData.baseEmissive || 1.65) * (0.94 + Math.sin(t * 2.4) * 0.08);

    if (animRefs.forgeLightIdx >= 0 && lights[animRefs.forgeLightIdx]) {
      const fl = lights[animRefs.forgeLightIdx];
      fl.intensity = (fl.baseIntensity || 5.5) * flicker;
    }

    if (animRefs.flames.length > 0) {
      matTrainFlame.emissiveIntensity = 1.6 * flicker;
      for (let i = 0; i < animRefs.flames.length; i++) {
        const f = animRefs.flames[i];
        const s = 1.0 + Math.sin(t * 8.0 + i * 1.7) * 0.16 + Math.cos(t * 13.1 + i) * 0.07;
        f.scale.set(0.9 + (s - 1) * 0.4, s, 0.9 + (s - 1) * 0.4);
      }
    }
  }

  function setLighting(lighting = {}) {
    const winGlow = typeof lighting.windowGlow === 'number' ? lighting.windowGlow : 0.65;
    const lampGlow = typeof lighting.lampGlow === 'number' ? lighting.lampGlow : winGlow;

    matWindow.emissiveIntensity = 0.15 + winGlow * 1.45;
    matSignGlyph.emissiveIntensity = 1.05 + lampGlow * 0.55;

    const forgeBase = 1.65 + lampGlow * 0.65;
    const crimsonBase = 1.45 + lampGlow * 0.65;
    matForge.userData.baseEmissive = forgeBase;
    matCrimson.userData.baseEmissive = crimsonBase;
    matForge.emissiveIntensity = forgeBase;
    matCrimson.emissiveIntensity = crimsonBase;

    if (animRefs.forgeLightIdx >= 0 && lights[animRefs.forgeLightIdx]) {
      lights[animRefs.forgeLightIdx].baseIntensity = 5.5 * (0.88 + lampGlow * 0.28);
      lights[animRefs.forgeLightIdx].intensity = lights[animRefs.forgeLightIdx].baseIntensity;
    }
  }

  function setTimeOfDay(t = 0.3) {
    const isNight = t < 0.22 || t > 0.78;
    const factor = isNight ? 1.0 : 0.22;
    setLighting({ windowGlow: factor, lampGlow: factor });
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
    plasterTex.dispose();
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