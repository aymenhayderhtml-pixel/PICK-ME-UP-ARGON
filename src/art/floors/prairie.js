import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  DEFAULT_PALETTE,
  DEFAULT_LAYOUT,
  QUALITY_CONFIG,
  MOSS_COLOR,
} from './prairieConfig.js';
import {
  createRng,
  clamp,
  lerp,
  createToonGradientTexture,
  createGrassCanvasTexture,
  createStoneCanvasTexture,
  normalizeGeometry,
  getChunkIndex,
  createSculptedRockGeometry,
} from './prairieHelpers.js';
import { buildTerrainAndPaths } from './prairieTerrain.js';
import {
  addBoulderOutcrop,
  addWindsweptTree,
  addDryStoneWallSegment,
  addRanchFenceSegment,
  buildAncientRuins,
  buildGoblinCampsite,
  buildGates,
  createGateDoorLeafMesh,
} from './prairieStructures.js';
import {
  buildInstancedVegetationAndProps,
  updatePrairieInstances,
} from './prairieVegetation.js';

export { DEFAULT_PALETTE, DEFAULT_LAYOUT, QUALITY_CONFIG };

export function buildPrairieFloorArt(ctx = {}) {
  const layout = ctx.layout || DEFAULT_LAYOUT;
  const seed = ctx.seed !== undefined ? ctx.seed : (layout.seed || 15851);
  const palette = { ...DEFAULT_PALETTE, ...(ctx.palette || {}) };
  let currentQuality = QUALITY_CONFIG[ctx.quality] ? ctx.quality : 'high';

  const group = new THREE.Group();
  group.name = 'PrairieFloorArt';

  const anchors = {
    entranceGate: new THREE.Vector3(0, 0, 6.5),
    exitGate: new THREE.Vector3(0, 0, -125),
    startPosition: new THREE.Vector3(
      (layout.startPosition && layout.startPosition.x) || 0,
      0,
      (layout.startPosition && layout.startPosition.z) || 4
    ),
    ruinCenter: new THREE.Vector3(18, 0, -75),
    goblinCamp: new THREE.Vector3(-14, 0, -114),
    torches: [],
  };

  const clearings = layout.clearings || DEFAULT_LAYOUT.clearings;
  for (let i = 0; i < clearings.length; i++) {
    const cl = clearings[i];
    anchors[cl.id || `clearing_${i}`] = new THREE.Vector3(cl.center.x, 0, cl.center.z);
  }
  const chokes = layout.chokePoints || DEFAULT_LAYOUT.chokePoints;
  for (let i = 0; i < chokes.length; i++) {
    const cp = chokes[i];
    anchors[`choke_${i}`] = new THREE.Vector3(cp.position.x, 0, cp.position.z);
  }

  const lights = [];

  const toonGradTex = createToonGradientTexture();
  const grassCanvasTex = createGrassCanvasTexture(seed);
  const stoneCanvasTex = createStoneCanvasTexture(seed);

  const terrainMat = new THREE.MeshToonMaterial({
    map: grassCanvasTex,
    gradientMap: toonGradTex,
    vertexColors: true,
  });

  const stoneMat = new THREE.MeshToonMaterial({
    map: stoneCanvasTex,
    gradientMap: toonGradTex,
    vertexColors: true,
  });

  const propMat = new THREE.MeshToonMaterial({
    gradientMap: toonGradTex,
    vertexColors: true,
  });

  const foliageMat = new THREE.MeshToonMaterial({
    gradientMap: toonGradTex,
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  const grassDarkMat = new THREE.MeshToonMaterial({
    color: palette.grassDark,
    gradientMap: toonGradTex,
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  const grassLightMat = new THREE.MeshToonMaterial({
    color: palette.grassLight,
    gradientMap: toonGradTex,
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  const flowerMat = new THREE.MeshToonMaterial({
    gradientMap: toonGradTex,
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  const emissiveMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const materials = {
    terrainMat,
    stoneMat,
    propMat,
    foliageMat,
    grassDarkMat,
    grassLightMat,
    flowerMat,
    emissiveMat,
  };

  const allMaterials = Object.values(materials);

  let activeGeometries = [];
  let instState = null;

  let entranceLeftDoor = null;
  let entranceRightDoor = null;
  let exitLeftDoor = null;
  let exitRightDoor = null;
  let exitSealMesh = null;

  const gateState = {
    entranceOpen: false,
    exitOpen: false,
    arenaSealed: false,
    entFactor: 0,
    exitFactor: 0,
  };

  function clearCurrentBuild() {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    for (let i = 0; i < activeGeometries.length; i++) {
      activeGeometries[i].dispose();
    }
    activeGeometries = [];
    instState = null;
    entranceLeftDoor = null;
    entranceRightDoor = null;
    exitLeftDoor = null;
    exitRightDoor = null;
    exitSealMesh = null;
  }

  function applyGateTransforms() {
    if (entranceLeftDoor && entranceRightDoor) {
      const angle = gateState.entFactor * (Math.PI * 0.48);
      entranceLeftDoor.rotation.y = angle;
      entranceRightDoor.rotation.y = -angle;
    }
    if (exitLeftDoor && exitRightDoor) {
      const angle = gateState.exitFactor * (Math.PI * 0.48);
      exitLeftDoor.rotation.y = -angle;
      exitRightDoor.rotation.y = angle;
    }
    if (exitSealMesh) {
      exitSealMesh.visible = Boolean(gateState.arenaSealed && !gateState.exitOpen);
    }
  }

  function buildSceneForQuality(qualityKey) {
    clearCurrentBuild();
    lights.length = 0;
    anchors.torches.length = 0;

    const cfg = QUALITY_CONFIG[qualityKey] || QUALITY_CONFIG.high;
    const rng = createRng(seed);
    const bounds = layout.bounds || DEFAULT_LAYOUT.bounds;

    const terrainChunks = [[], [], [], []];
    const stoneChunks = [[], [], [], []];
    const propChunks = [[], [], [], []];

    const canopyInstances = [];
    const fencePostInstances = [];
    const flagInstances = [];
    const emberSources = [];

    buildTerrainAndPaths(layout, palette, cfg, terrainChunks);

    const campSpots = layout.campSpots || DEFAULT_LAYOUT.campSpots;
    let ruinSpot = null;
    let goblinSpot = null;
    for (let i = 0; i < campSpots.length; i++) {
      if (campSpots[i].type === 'ruin') ruinSpot = campSpots[i];
      if (campSpots[i].type === 'camp') goblinSpot = campSpots[i];
    }

    if (ruinSpot) {
      buildAncientRuins(
        ruinSpot,
        layout,
        seed,
        palette,
        cfg,
        stoneChunks,
        propChunks,
        flagInstances,
        emberSources,
        lights,
        anchors
      );
    }

    if (goblinSpot) {
      buildGoblinCampsite(
        goblinSpot,
        layout,
        seed,
        palette,
        cfg,
        stoneChunks,
        propChunks,
        flagInstances,
        emberSources,
        lights,
        anchors
      );
    }

    buildGates(layout, palette, stoneChunks, propChunks, flagInstances, emberSources, lights, anchors);

    const obstacles = layout.obstacles || DEFAULT_LAYOUT.obstacles;
    const chokeList = layout.chokePoints || DEFAULT_LAYOUT.chokePoints;

    for (let i = 0; i < obstacles.length; i++) {
      const ob = obstacles[i];
      if (ruinSpot && Math.hypot(ob.x - ruinSpot.x, ob.z - ruinSpot.z) < 2.2) {
        continue;
      }

      let isChokeOb = false;
      for (let c = 0; c < chokeList.length; c++) {
        if (Math.hypot(ob.x - chokeList[c].position.x, ob.z - chokeList[c].position.z) < 5.2) {
          isChokeOb = true;
          break;
        }
      }

      addBoulderOutcrop(
        ob.x,
        ob.z,
        ob.radius,
        seed + 1000 + i * 37,
        palette,
        cfg,
        stoneChunks,
        propChunks,
        isChokeOb
      );

      if (!isChokeOb && (i === 6 || i === 9 || i === 10 || i === 13)) {
        const isBirch = i % 2 === 1;
        addWindsweptTree(
          ob.x,
          ob.z,
          ob.radius,
          isBirch,
          seed + 2000 + i * 53,
          palette,
          cfg,
          propChunks,
          canopyInstances
        );
      }
    }

    const scenicTreeSpots = [
      { x: -25, z: 2, r: 1.5, birch: false },
      { x: 24, z: -12, r: 1.4, birch: true },
      { x: -26, z: -24, r: 1.6, birch: false },
      { x: 27, z: -48, r: 1.5, birch: false },
      { x: -28, z: -64, r: 1.4, birch: true },
      { x: 29, z: -66, r: 1.6, birch: false },
      { x: 26, z: -88, r: 1.4, birch: true },
      { x: -27, z: -98, r: 1.6, birch: false },
      { x: 25, z: -108, r: 1.5, birch: false },
      { x: -24, z: -126, r: 1.4, birch: true },
      { x: 22, z: -128, r: 1.5, birch: false },
    ];

    for (let i = 0; i < scenicTreeSpots.length; i++) {
      const st = scenicTreeSpots[i];
      addWindsweptTree(
        st.x,
        st.z,
        st.r,
        st.birch,
        seed + 3000 + i * 41,
        palette,
        cfg,
        propChunks,
        canopyInstances
      );
    }

    const wallSegments = [
      { x0: -4.1, z0: -20.0, x1: -11.5, z1: -19.2 },
      { x0: 4.1, z0: -20.0, x1: 11.5, z1: -20.8 },
      { x0: -3.4, z0: -55.0, x1: -11.2, z1: -53.8 },
      { x0: 5.2, z0: -55.0, x1: 12.8, z1: -56.2 },
      { x0: -4.9, z0: -94.0, x1: -12.4, z1: -92.8 },
      { x0: 3.5, z0: -94.0, x1: 11.2, z1: -95.2 },
      { x0: -14.8, z0: -29.0, x1: -17.2, z1: -39.5 },
      { x0: 15.2, z0: -64.0, x1: 12.2, z1: -59.5 },
    ];

    for (let i = 0; i < wallSegments.length; i++) {
      const ws = wallSegments[i];
      addDryStoneWallSegment(
        ws.x0,
        ws.z0,
        ws.x1,
        ws.z1,
        seed + 4000 + i * 29,
        palette,
        stoneChunks,
        propChunks
      );
    }

    const fenceSegments = [
      { x0: -11.5, z0: -19.2, x1: -19.5, z1: -16.8 },
      { x0: 11.5, z0: -20.8, x1: 19.5, z1: -23.0 },
      { x0: -5.2, z0: -9.0, x1: -12.8, z1: -3.5 },
      { x0: 5.2, z0: -9.0, x1: 12.8, z1: -3.5 },
      { x0: -11.2, z0: -53.8, x1: -19.8, z1: -50.5 },
      { x0: 12.8, z0: -56.2, x1: 21.0, z1: -59.5 },
      { x0: -12.4, z0: -92.8, x1: -20.2, z1: -89.5 },
      { x0: 11.2, z0: -95.2, x1: 19.4, z1: -98.5 },
      { x0: 14.5, z0: -30.0, x1: 16.8, z1: -41.0 },
      { x0: -16.0, z0: -68.0, x1: -18.5, z1: -81.0 },
    ];

    for (let i = 0; i < fenceSegments.length; i++) {
      const fs = fenceSegments[i];
      addRanchFenceSegment(
        fs.x0,
        fs.z0,
        fs.x1,
        fs.z1,
        seed + 5000 + i * 31,
        palette,
        propChunks,
        fencePostInstances
      );
    }

    const chokeSentinelX = -3.6;
    const chokeSentinelZ = -20.4;
    const cTorchPost = new THREE.CylinderGeometry(0.08, 0.11, 2.0, 6);
    cTorchPost.translate(chokeSentinelX, 1.0, chokeSentinelZ);
    propChunks[getChunkIndex(chokeSentinelZ)].push(
      normalizeGeometry(cTorchPost, palette.woodDark, { bottomAO: 0.3 })
    );
    const chokeTorchPos = new THREE.Vector3(chokeSentinelX, 2.08, chokeSentinelZ);
    lights.push({ position: chokeTorchPos, color: 0xff9e44, intensity: 1.6, distance: 12 });
    anchors.torches.push(chokeTorchPos);
    emberSources.push({ x: chokeTorchPos.x, y: chokeTorchPos.y, z: chokeTorchPos.z, radius: 0.14, count: 7 });

    const ambushSpots = layout.ambushSpots || DEFAULT_LAYOUT.ambushSpots;
    for (let i = 0; i < ambushSpots.length; i++) {
      const as = ambushSpots[i];
      const sideSign = as.x < 0 ? -1 : 1;
      const rockX = as.x + sideSign * 1.45;
      const rockZ = as.z - 0.65;
      const crouchRock = createSculptedRockGeometry(0.78, 0.65, 1, seed + 6000 + i * 19);
      crouchRock.rotateY(i * 1.1);
      crouchRock.translate(rockX, 0, rockZ);
      stoneChunks[getChunkIndex(rockZ)].push(
        normalizeGeometry(crouchRock, palette.rockBase, {
          mossColor: MOSS_COLOR,
          mossStrength: 0.6,
          bottomAO: 0.35,
        })
      );

      for (let b = 0; b < 2; b++) {
        const ba = i * 1.7 + b * 2.4;
        canopyInstances.push({
          x: as.x + Math.cos(ba) * 0.85,
          y: 0.35,
          z: as.z + Math.sin(ba) * 0.85,
          sx: 0.92,
          sy: 0.58,
          sz: 0.88,
          rotY: ba,
          colorHex: b === 0 ? palette.grassDark : palette.terrainBase,
        });
      }
    }

    for (let c = 0; c < 4; c++) {
      if (terrainChunks[c].length > 0) {
        const merged = mergeGeometries(terrainChunks[c], false);
        for (const g of terrainChunks[c]) g.dispose();
        activeGeometries.push(merged);
        const mesh = new THREE.Mesh(merged, terrainMat);
        mesh.name = `PrairieTerrainChunk_${c}`;
        mesh.frustumCulled = true;
        group.add(mesh);
      }

      if (stoneChunks[c].length > 0) {
        const merged = mergeGeometries(stoneChunks[c], false);
        for (const g of stoneChunks[c]) g.dispose();
        activeGeometries.push(merged);
        const mesh = new THREE.Mesh(merged, stoneMat);
        mesh.name = `PrairieStoneChunk_${c}`;
        mesh.frustumCulled = true;
        group.add(mesh);
      }

      if (propChunks[c].length > 0) {
        const merged = mergeGeometries(propChunks[c], false);
        for (const g of propChunks[c]) g.dispose();
        activeGeometries.push(merged);
        const mesh = new THREE.Mesh(merged, propMat);
        mesh.name = `PrairiePropChunk_${c}`;
        mesh.frustumCulled = true;
        group.add(mesh);
      }
    }

    const ent = layout.entranceBarrier || DEFAULT_LAYOUT.entranceBarrier;
    const ex = layout.exitGate || DEFAULT_LAYOUT.exitGate;
    const entHalfOpening = (layout.pathWidth || 5.8) * 0.5 + 0.1;

    entranceLeftDoor = createGateDoorLeafMesh(entHalfOpening, 2.15, true, palette, propMat);
    entranceLeftDoor.position.set(ent.position.x - entHalfOpening, 0, ent.position.z);
    activeGeometries.push(entranceLeftDoor.geometry);
    group.add(entranceLeftDoor);

    entranceRightDoor = createGateDoorLeafMesh(entHalfOpening, 2.15, false, palette, propMat);
    entranceRightDoor.position.set(ent.position.x + entHalfOpening, 0, ent.position.z);
    activeGeometries.push(entranceRightDoor.geometry);
    group.add(entranceRightDoor);

    const exHalfOpening = (ex.width || 4.0) * 0.5;
    exitLeftDoor = createGateDoorLeafMesh(exHalfOpening, 2.38, true, palette, propMat);
    exitLeftDoor.position.set(ex.position.x - exHalfOpening, 0, ex.position.z);
    activeGeometries.push(exitLeftDoor.geometry);
    group.add(exitLeftDoor);

    exitRightDoor = createGateDoorLeafMesh(exHalfOpening, 2.38, false, palette, propMat);
    exitRightDoor.position.set(ex.position.x + exHalfOpening, 0, ex.position.z);
    activeGeometries.push(exitRightDoor.geometry);
    group.add(exitRightDoor);

    const sealGeom = normalizeGeometry(
      new THREE.PlaneGeometry(ex.width || 4.0, 2.25),
      0x7ad9ff,
      { bottomAO: 0, variation: 0.05 }
    );
    activeGeometries.push(sealGeom);
    exitSealMesh = new THREE.Mesh(sealGeom, emissiveMat);
    exitSealMesh.position.set(ex.position.x, 1.25, ex.position.z + 0.08);
    exitSealMesh.visible = gateState.arenaSealed;
    group.add(exitSealMesh);

    instState = buildInstancedVegetationAndProps({
      group,
      layout,
      bounds,
      palette,
      cfg,
      seed,
      rng,
      materials,
      activeGeometries,
      canopyInstances,
      fencePostInstances,
      flagInstances,
      emberSources,
    });

    applyGateTransforms();
  }

  buildSceneForQuality(currentQuality);

  function update(dt = 0.016, time = 0) {
    const step = clamp(dt, 0.001, 0.1);
    const targetEnt = gateState.entranceOpen ? 1 : 0;
    const targetExit = gateState.exitOpen ? 1 : 0;
    if (
      Math.abs(gateState.entFactor - targetEnt) > 0.001 ||
      Math.abs(gateState.exitFactor - targetExit) > 0.001
    ) {
      gateState.entFactor = lerp(gateState.entFactor, targetEnt, clamp(step * 6.0, 0, 1));
      gateState.exitFactor = lerp(gateState.exitFactor, targetExit, clamp(step * 6.0, 0, 1));
      applyGateTransforms();
    }

    updatePrairieInstances(instState, time);
  }

  function setQuality(q) {
    const nextQ = QUALITY_CONFIG[q] ? q : 'high';
    if (nextQ === currentQuality) return;
    currentQuality = nextQ;
    buildSceneForQuality(currentQuality);
  }

  function setLighting(lighting) {
    if (!lighting) return;
    if (lighting.lampGlow !== undefined) {
      emissiveMat.opacity = clamp(0.65 + lighting.lampGlow * 0.3, 0.4, 1.0);
    }
  }

  function setGateState(state = {}) {
    if (state.entranceOpen !== undefined) gateState.entranceOpen = Boolean(state.entranceOpen);
    if (state.exitOpen !== undefined) gateState.exitOpen = Boolean(state.exitOpen);
    if (state.arenaSealed !== undefined) gateState.arenaSealed = Boolean(state.arenaSealed);
    applyGateTransforms();
  }

  function destroyPillar() {
    return false;
  }

  function getStats() {
    let meshes = 0;
    let triangles = 0;
    let drawCallsEstimate = 0;

    group.traverse((obj) => {
      if (!obj.isMesh || !obj.visible) return;
      meshes += 1;
      drawCallsEstimate += 1;
      const geom = obj.geometry;
      if (!geom) return;
      const triPerMesh = geom.index
        ? geom.index.count / 3
        : geom.attributes.position
          ? geom.attributes.position.count / 3
          : 0;
      const instances = obj.isInstancedMesh ? obj.count : 1;
      triangles += Math.round(triPerMesh * instances);
    });

    return { meshes, triangles, drawCallsEstimate };
  }

  function dispose() {
    clearCurrentBuild();
    for (let i = 0; i < allMaterials.length; i++) {
      allMaterials[i].dispose();
    }
    toonGradTex.dispose();
    grassCanvasTex.dispose();
    stoneCanvasTex.dispose();
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
    dispose,
  };
}