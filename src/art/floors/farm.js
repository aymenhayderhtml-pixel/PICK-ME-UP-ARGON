// src/art/floors/farm.js
// Procedural 3D floor art module for Floor 1: "The Sun-Bleached Farm"
// Self-contained Three.js r160 module following the Argon Floor Art Contract.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  DEFAULT_PALETTE,
  FARM_COLORS,
  QUALITY_CONFIG,
  classifyObstacles
} from './farmConfig.js';
import {
  createRng,
  clamp,
  createFarmMaterials
} from './farmMaterials.js';
import {
  buildTerrainMesh,
  buildChokeWallsAndPosts,
  buildClearing0ArrivalYard,
  buildCartAndPloughLandmark,
  buildTempleRuin,
  buildFarmhouseAndWell
} from './farmTerrainAndStructures.js';
import {
  createBannerAndFlameHelpers,
  buildGoblinCampsAndCourtyardProps,
  buildGates,
  applyGateVisuals
} from './farmCampsAndGates.js';
import {
  buildInstancedOliveTrees,
  buildInstancedHayBales,
  buildInstancedFenceRails,
  buildInstancedFieldStonesAndCypress,
  buildAnimatedFoliageAndAtmosphere,
  updateFarmAnimations
} from './farmFoliageAndAtmosphere.js';

export { DEFAULT_PALETTE, FARM_COLORS, QUALITY_CONFIG };

export function buildFarmFloorArt(ctx = {}) {
  const layout = ctx.layout || {};
  const seed = (ctx.seed ?? layout.seed ?? 7932) | 0;
  const palette = { ...DEFAULT_PALETTE, ...(ctx.palette || {}) };
  let currentQuality = QUALITY_CONFIG[ctx.quality] ? ctx.quality : 'high';

  const group = new THREE.Group();
  group.name = 'FarmFloorArt';

  const anchors = {};
  const lights = [];

  const { materials, gradientMap, groundTex, detailTex } = createFarmMaterials(seed);

  const trackedGeometries = new Set();
  const animatedRefs = {
    grassInst: null,
    grassBaseMatrices: null,
    grassPhases: null,
    wheatInst: null,
    wheatBaseMatrices: null,
    wheatPhases: null,
    dustInst: null,
    dustData: null,
    vultureInst: null,
    vultureData: null,
    clothMeshes: [],
    flameMeshes: [],
    entranceLeftBar: null,
    entranceRightBar: null,
    exitLeftLeaf: null,
    exitRightLeaf: null
  };

  const gateState = {
    entranceOpen: false,
    exitOpen: false,
    arenaSealed: false
  };

  let statsCache = { meshes: 0, triangles: 0, drawCallsEstimate: 0 };

  function trackGeo(g) {
    if (g) trackedGeometries.add(g);
    return g;
  }

  const { addFlutteringBanner, addFireFlameMesh } = createBannerAndFlameHelpers({
    group,
    materials,
    animatedRefs,
    trackGeo
  });

  function clearSceneGraph() {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    for (const g of trackedGeometries) {
      g.dispose();
    }
    trackedGeometries.clear();
    animatedRefs.grassInst = null;
    animatedRefs.wheatInst = null;
    animatedRefs.dustInst = null;
    animatedRefs.vultureInst = null;
    animatedRefs.clothMeshes.length = 0;
    animatedRefs.flameMeshes.length = 0;
    animatedRefs.entranceLeftBar = null;
    animatedRefs.entranceRightBar = null;
    animatedRefs.exitLeftLeaf = null;
    animatedRefs.exitRightLeaf = null;
  }

  function computeSceneStats() {
    let meshes = 0;
    let triangles = 0;
    let drawCalls = 0;

    group.traverse((obj) => {
      if (obj.isMesh) {
        meshes++;
        drawCalls++;
        const geo = obj.geometry;
        if (geo && geo.attributes && geo.attributes.position) {
          const triCount = geo.index
            ? geo.index.count / 3
            : geo.attributes.position.count / 3;
          const count = obj.isInstancedMesh ? obj.count : 1;
          triangles += Math.round(triCount * count);
        }
      }
    });

    statsCache = {
      meshes,
      triangles,
      drawCallsEstimate: drawCalls
    };
  }

  function buildScene() {
    clearSceneGraph();
    lights.length = 0;

    const rng = createRng(seed);
    const qCfg = QUALITY_CONFIG[currentQuality] || QUALITY_CONFIG.high;

    const clearings = layout.clearings || [];
    for (let i = 0; i < clearings.length; i++) {
      const cl = clearings[i];
      anchors[cl.id || `clearing_${i}`] = new THREE.Vector3(cl.center.x, 0, cl.center.z);
    }
    const campSpots = layout.campSpots || [];
    for (let i = 0; i < campSpots.length; i++) {
      const cs = campSpots[i];
      anchors[`camp_${cs.type || i}`] = new THREE.Vector3(cs.x, 0, cs.z);
    }

    const terrainGeo = buildTerrainMesh({ layout, seed, palette, qCfg, trackGeo });
    const terrainMesh = new THREE.Mesh(terrainGeo, materials.ground);
    terrainMesh.name = 'FarmGround';
    group.add(terrainMesh);

    const classified = classifyObstacles(layout);
    const solidChunks = [[], [], [], []];
    const outlineChunks = [[], [], [], []];
    const shadowDecals = [];
    const fenceInstances = [];

    buildClearing0ArrivalYard({
      anchors,
      palette,
      chunks: solidChunks,
      shadowDecals,
      rng
    });

    buildChokeWallsAndPosts({
      layout,
      palette,
      chokePosts: classified.chokePosts,
      chunks: solidChunks,
      outlineChunks,
      shadowDecals,
      fenceInstances,
      rng,
      qCfg
    });

    buildCartAndPloughLandmark({
      x: -13.2,
      z: -37.5,
      rotY: 0.42,
      palette,
      chunks: solidChunks,
      shadowDecals,
      rng
    });

    buildCartAndPloughLandmark({
      x: 11.5,
      z: -113.5,
      rotY: -1.15,
      palette,
      chunks: solidChunks,
      shadowDecals,
      rng
    });

    buildTempleRuin({
      anchors,
      lights,
      palette,
      templeSpot: classified.templeSpot,
      templeColumns: classified.templeColumns,
      chunks: solidChunks,
      outlineChunks,
      shadowDecals,
      rng,
      qCfg,
      addFireFlameMesh,
      addFlutteringBanner
    });

    buildFarmhouseAndWell({
      anchors,
      lights,
      palette,
      farmhouseOb: classified.farmhouse,
      wellOb: classified.well,
      chunks: solidChunks,
      outlineChunks,
      shadowDecals,
      rng,
      qCfg,
      addFireFlameMesh
    });

    buildGoblinCampsAndCourtyardProps({
      lights,
      chunks: solidChunks,
      shadowDecals,
      rng,
      addFlutteringBanner,
      addFireFlameMesh
    });

    buildGates({
      layout,
      group,
      anchors,
      lights,
      palette,
      materials,
      animatedRefs,
      gateState,
      trackGeo,
      chunks: solidChunks,
      outlineChunks,
      shadowDecals,
      rng,
      qCfg,
      addFireFlameMesh
    });

    for (let c = 0; c < 4; c++) {
      if (solidChunks[c].length > 0) {
        const mergedSolid = trackGeo(mergeGeometries(solidChunks[c], false));
        mergedSolid.computeBoundingSphere();
        const chunkMesh = new THREE.Mesh(mergedSolid, materials.solid);
        chunkMesh.name = `StaticChunk_${c}`;
        group.add(chunkMesh);
      }
      if (qCfg.useOutlines && outlineChunks[c].length > 0) {
        const mergedOutline = trackGeo(mergeGeometries(outlineChunks[c], false));
        mergedOutline.computeBoundingSphere();
        const outlineMesh = new THREE.Mesh(mergedOutline, materials.outline);
        outlineMesh.name = `OutlineChunk_${c}`;
        group.add(outlineMesh);
      }
    }

    buildInstancedOliveTrees({
      group,
      materials,
      trackGeo,
      oliveObstacles: classified.oliveTrees,
      shadowDecals,
      rng,
      qCfg
    });

    buildInstancedHayBales({
      group,
      materials,
      trackGeo,
      baleObstacles: classified.hayBales,
      shadowDecals,
      rng,
      qCfg
    });

    buildInstancedFenceRails({
      group,
      materials,
      trackGeo,
      fenceInstances,
      rng
    });

    buildInstancedFieldStonesAndCypress({
      layout,
      group,
      materials,
      trackGeo,
      rng,
      qCfg
    });

    if (shadowDecals.length > 0) {
      const mergedShadows = trackGeo(mergeGeometries(shadowDecals, false));
      const shadowMesh = new THREE.Mesh(mergedShadows, materials.contactShadow);
      shadowMesh.name = 'ContactShadows';
      group.add(shadowMesh);
    }

    buildAnimatedFoliageAndAtmosphere({
      layout,
      group,
      materials,
      animatedRefs,
      trackGeo,
      rng,
      qCfg
    });

    computeSceneStats();
  }

  buildScene();

  function update(dt, time = 0) {
    updateFarmAnimations(dt, time, animatedRefs);
  }

  function setQuality(q) {
    const nextQ = QUALITY_CONFIG[q] ? q : 'high';
    if (nextQ === currentQuality) return;
    currentQuality = nextQ;
    buildScene();
  }

  function setLighting(lighting) {
    if (!lighting) return;
    if (typeof lighting.lampGlow === 'number') {
      const b = clamp(0.75 + lighting.lampGlow * 0.35, 0.5, 1.5);
      materials.emissive.color.setScalar(b);
    }
  }

  function setGateState(nextState = {}) {
    if (typeof nextState.entranceOpen === 'boolean') {
      gateState.entranceOpen = nextState.entranceOpen;
    }
    if (typeof nextState.exitOpen === 'boolean') {
      gateState.exitOpen = nextState.exitOpen;
    }
    if (typeof nextState.arenaSealed === 'boolean') {
      gateState.arenaSealed = nextState.arenaSealed;
    }
    applyGateVisuals(gateState, animatedRefs);
  }

  function destroyPillar() {
    return false;
  }

  function getStats() {
    return { ...statsCache };
  }

  function dispose() {
    clearSceneGraph();
    gradientMap.dispose();
    groundTex.dispose();
    detailTex.dispose();
    for (const key of Object.keys(materials)) {
      materials[key].dispose();
    }
  }

  return {
    group,
    anchors,
    lights,
    update,
    setQuality,
    setLighting,
    setGateState,
    destroyPillar,
    getStats,
    dispose
  };
}

export default buildFarmFloorArt;