// src/art/town/landmarks.js
// Thin wrapper merging landmarksMain (Summoning Room, Landing Area, Town Square, Space-Time Rift)
// and landmarksWork (Synthesis Chamber, Armory, Training Grounds, Mess Hall row, Dungeon Board).

import * as THREE from 'three';
import { buildLandmarksMain } from './landmarksMain.js';
import { buildLandmarksWork } from './landmarksWork.js';

export function buildTownLandmarks(ctx) {
  const main = buildLandmarksMain(ctx);
  const work = buildLandmarksWork(ctx);

  const group = new THREE.Group();
  group.name = 'TownLandmarks';
  group.add(main.group);
  group.add(work.group);

  const mergedColliders = [...main.colliders, ...work.colliders];
  const mergedDoors = [...main.doors, ...work.doors];
  const mergedAnchors = { ...main.anchors, ...work.anchors };
  const mergedLights = [...main.lights, ...work.lights];

  return {
    group,
    modules: {
      landmarksMain: main,
      landmarksWork: work
    },
    colliders: mergedColliders,
    doors: mergedDoors,
    anchors: mergedAnchors,
    lights: mergedLights,
    update(dt, camera) {
      if (main.update) main.update(dt, camera);
      if (work.update) work.update(dt, camera);
    },
    setTimeOfDay(t) {
      if (main.setTimeOfDay) main.setTimeOfDay(t);
      if (work.setTimeOfDay) work.setTimeOfDay(t);
    },
    setLighting(lighting) {
      if (main.setLighting) main.setLighting(lighting);
      if (work.setLighting) work.setLighting(lighting);
    },
    setQuality(q) {
      if (main.setQuality) main.setQuality(q);
      if (work.setQuality) work.setQuality(q);
    },
    getStats() {
      const sMain = main.getStats ? main.getStats() : { meshes: 0, triangles: 0, drawCallsEstimate: 0 };
      const sWork = work.getStats ? work.getStats() : { meshes: 0, triangles: 0, drawCallsEstimate: 0 };
      return {
        meshes: sMain.meshes + sWork.meshes,
        triangles: sMain.triangles + sWork.triangles,
        drawCallsEstimate: sMain.drawCallsEstimate + sWork.drawCallsEstimate,
        landmarksMain: sMain,
        landmarksWork: sWork
      };
    },
    dispose() {
      if (main.dispose) main.dispose();
      if (work.dispose) work.dispose();
    }
  };
}
