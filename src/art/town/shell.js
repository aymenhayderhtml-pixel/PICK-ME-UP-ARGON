import * as THREE from 'three';
import {
  PALETTE,
  DEFAULT_AO_PADS,
  QUALITY_PRESETS,
  TIME_KEYFRAMES,
  parseInitialTimeOfDay,
  createWallSpec,
  findRiftSideIndex,
  buildSpatialMetadata
} from './shellConfig.js';
import { createShellMaterials } from './shellTextures.js';
import {
  buildTerrainMesh,
  buildJaggedIslandUnderside
} from './shellTerrainAndUnderside.js';
import { buildWallAndCliffQuadrants } from './shellWalls.js';
import {
  createInitialLightingState,
  buildDistantSoftCloudSheets,
  buildOpenSkyAndCelestialDiscs,
  buildFloatingLeavesAndGlints,
  updateTimeOfDayState,
  updateAtmosphereFrame
} from './shellSkyAndAtmosphere.js';

export { PALETTE, DEFAULT_AO_PADS, QUALITY_PRESETS, TIME_KEYFRAMES };

export function buildTownShell(ctx = {}) {
  const seed = Number.isInteger(ctx.seed) ? ctx.seed : 1337;
  let currentTimeOfDay = parseInitialTimeOfDay(ctx.time);
  let currentQuality = QUALITY_PRESETS[ctx.quality] ? ctx.quality : 'high';

  const defaultGroundY = (x, z) => {
    const r = Math.hypot(x, z);
    const gentleRoll = Math.sin(x * 0.07) * Math.cos(z * 0.07) * 0.28;
    const centerFlat = Math.min(1, r / 18);
    return gentleRoll * centerFlat;
  };
  const getGroundY = typeof ctx.getGroundY === 'function' ? ctx.getGroundY : defaultGroundY;

  const layout = ctx.layout || {};
  const wallSpec = createWallSpec(layout);
  const aoPads = Array.isArray(layout.aoPads) && layout.aoPads.length > 0
    ? layout.aoPads
    : DEFAULT_AO_PADS;

  const rootGroup = new THREE.Group();
  rootGroup.name = 'NiflheimrTownShell';

  const contentGroup = new THREE.Group();
  contentGroup.name = 'ShellContent';
  rootGroup.add(contentGroup);

  const materials = createShellMaterials(seed);

  const colliders = [];
  const doors = [];
  const lights = [];
  const anchors = {};

  const lightingState = createInitialLightingState(currentTimeOfDay);
  anchors.lighting = lightingState;
  anchors.islandCenter = new THREE.Vector3(0, getGroundY(0, 0), 0);

  const riftSideIndex = findRiftSideIndex(wallSpec);
  buildSpatialMetadata({
    wallSpec,
    layout,
    getGroundY,
    riftSideIndex,
    colliders,
    doors,
    lights,
    anchors
  });

  let disposableGeometries = [];
  const skyState = {
    skyDomeMesh: null,
    celestialMesh: null,
    sunVertCount: 0,
    sunBasePositions: null,
    sunBaseColors: null,
    moonBasePositions: null,
    moonBaseColors: null,
    cloudSheetMesh: null,
    leafInstancedMesh: null,
    leafData: [],
    glintPoints: null,
    glintBasePositions: null,
    glintBaseColors: null,
    glintPhases: null,
    starBaseColors: null
  };
  const portalState = {
    riftPortalDisc: null,
    riftPortalRings: []
  };

  let elapsedTime = 0;
  let currentStats = { meshes: 0, triangles: 0, drawCallsEstimate: 0 };

  function clearBuiltContent() {
    while (contentGroup.children.length > 0) {
      contentGroup.remove(contentGroup.children[0]);
    }
    for (let i = 0; i < disposableGeometries.length; i++) {
      if (disposableGeometries[i] && typeof disposableGeometries[i].dispose === 'function') {
        disposableGeometries[i].dispose();
      }
    }
    disposableGeometries = [];
    skyState.skyDomeMesh = null;
    skyState.celestialMesh = null;
    skyState.sunVertCount = 0;
    skyState.sunBasePositions = null;
    skyState.sunBaseColors = null;
    skyState.moonBasePositions = null;
    skyState.moonBaseColors = null;
    skyState.cloudSheetMesh = null;
    skyState.leafInstancedMesh = null;
    skyState.leafData = [];
    skyState.glintPoints = null;
    skyState.glintBasePositions = null;
    skyState.glintBaseColors = null;
    skyState.glintPhases = null;
    skyState.starBaseColors = null;
    portalState.riftPortalDisc = null;
    portalState.riftPortalRings.length = 0;
  }

  function setTimeOfDay(t) {
    currentTimeOfDay = updateTimeOfDayState(t, lightingState, skyState, materials);
    return lightingState;
  }

  function getLighting() {
    return {
      ...lightingState,
      background: lightingState.background ?? lightingState.fog.color,
      skyTop: lightingState.skyTop ?? lightingState.sky.topColor,
      skyHorizon: lightingState.skyHorizon ?? lightingState.sky.horizonColor,
      hemi: lightingState.hemi ?? {
        sky: lightingState.hemisphere.skyColor,
        ground: lightingState.hemisphere.groundColor,
        intensity: lightingState.hemisphere.intensity
      }
    };
  }

  function computeModuleStats() {
    let meshes = 0;
    let triangles = 0;
    let drawCallsEstimate = 0;

    contentGroup.traverse((obj) => {
      if (obj.isMesh || obj.isInstancedMesh || obj.isPoints) {
        meshes++;
        drawCallsEstimate++;
        const geom = obj.geometry;
        if (geom && (obj.isMesh || obj.isInstancedMesh)) {
          const triCount = geom.index
            ? geom.index.count / 3
            : (geom.attributes.position ? geom.attributes.position.count / 3 : 0);
          const instances = obj.isInstancedMesh ? obj.count : 1;
          triangles += Math.round(triCount * instances);
        }
      }
    });

    currentStats = { meshes, triangles, drawCallsEstimate };
  }

  function rebuildForQuality(q) {
    currentQuality = QUALITY_PRESETS[q] ? q : 'high';
    const preset = QUALITY_PRESETS[currentQuality];

    clearBuiltContent();

    buildTerrainMesh({
      preset,
      seed,
      wallSpec,
      aoPads,
      getGroundY,
      terrainMat: materials.terrainMat,
      contentGroup,
      disposableGeometries
    });

    const builtPortal = buildWallAndCliffQuadrants({
      preset,
      seed,
      wallSpec,
      riftSideIndex,
      getGroundY,
      stoneMat: materials.stoneMat,
      foliageMat: materials.foliageMat,
      trimEmissiveMat: materials.trimEmissiveMat,
      contentGroup,
      disposableGeometries
    });
    portalState.riftPortalDisc = builtPortal.riftPortalDisc;
    portalState.riftPortalRings = builtPortal.riftPortalRings;

    buildJaggedIslandUnderside({
      preset,
      seed,
      getGroundY,
      undersideMat: materials.undersideMat,
      foliageMat: materials.foliageMat,
      contentGroup,
      disposableGeometries
    });

    skyState.cloudSheetMesh = buildDistantSoftCloudSheets({
      preset,
      cloudSheetMat: materials.cloudSheetMat,
      contentGroup,
      disposableGeometries
    });

    const builtSky = buildOpenSkyAndCelestialDiscs({
      skyMat: materials.skyMat,
      celestialDiscMat: materials.celestialDiscMat,
      contentGroup,
      disposableGeometries
    });
    Object.assign(skyState, builtSky);

    const builtAtmosphere = buildFloatingLeavesAndGlints({
      preset,
      seed,
      getGroundY,
      leafMat: materials.leafMat,
      glintPointMat: materials.glintPointMat,
      contentGroup,
      disposableGeometries
    });
    Object.assign(skyState, builtAtmosphere);

    setTimeOfDay(currentTimeOfDay);
    computeModuleStats();
  }

  rebuildForQuality(currentQuality);

  function update(dt = 0.016) {
    const safeDt = Math.min(Math.max(dt, 0), 0.1);
    elapsedTime += safeDt;
    updateAtmosphereFrame(safeDt, elapsedTime, skyState, portalState);
  }

  function setQuality(q) {
    if (q && QUALITY_PRESETS[q] && q !== currentQuality) {
      rebuildForQuality(q);
    }
  }

  function getStats() {
    return { ...currentStats };
  }

  function dispose() {
    clearBuiltContent();
    for (let i = 0; i < materials.sharedMaterials.length; i++) {
      materials.sharedMaterials[i].dispose();
    }
    for (let i = 0; i < materials.sharedTextures.length; i++) {
      materials.sharedTextures[i].dispose();
    }
  }

  return {
    group: rootGroup,
    colliders,
    doors,
    anchors,
    lights,
    setTimeOfDay,
    getLighting,
    update,
    setQuality,
    getStats,
    dispose
  };
}