// src/art/town/TownAssembler.js
// Assembles the town art modules (shell, landmarks, village) into a unified TownModule.

import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { buildTownShell } from './shell.js';
import { buildTownLandmarks } from './landmarks.js';
import { buildTownVillage } from './village.js';

export function buildTown(layout, getGroundY, quality = 'high', options = {}) {
  const ctx = {
    layout,
    getGroundY: getGroundY || (() => 0),
    quality,
    seed: options.seed || 12345,
    time: options.time || 'night',
    PALETTE
  };

  const shell = buildTownShell(ctx);
  const landmarks = buildTownLandmarks(ctx);
  const village = buildTownVillage(ctx);

  const group = new THREE.Group();
  group.name = 'TownNiflheimr';
  group.add(shell.group);
  group.add(landmarks.group);
  group.add(village.group);

  const mergedColliders = [...shell.colliders, ...landmarks.colliders, ...village.colliders];
  const mergedDoors = [...shell.doors, ...landmarks.doors, ...village.doors];
  const mergedLights = [...shell.lights, ...landmarks.lights, ...village.lights];
  const mergedAnchors = { ...shell.anchors, ...landmarks.anchors, ...village.anchors };

  function applyModuleLighting(lighting) {
    if (!lighting) return;
    if (shell.setLighting) shell.setLighting(lighting);
    if (landmarks.setLighting) landmarks.setLighting(lighting);
    if (village.setLighting) village.setLighting(lighting);
  }

  // Initial lighting dispatch
  if (shell.getLighting) {
    applyModuleLighting(shell.getLighting());
  }

  return {
    group,
    modules: {
      shell,
      landmarks,
      landmarksMain: landmarks.modules?.landmarksMain,
      landmarksWork: landmarks.modules?.landmarksWork,
      village
    },
    colliders: mergedColliders,
    doors: mergedDoors,
    lights: mergedLights,
    anchors: mergedAnchors,
    update(dt, camera) {
      if (shell.update) shell.update(dt, camera);
      if (landmarks.update) landmarks.update(dt, camera);
      if (village.update) village.update(dt, camera);
    },
    setTimeOfDay(t) {
      if (shell.setTimeOfDay) shell.setTimeOfDay(t);
      const lighting = shell.getLighting ? shell.getLighting() : null;
      if (lighting) {
        applyModuleLighting(lighting);
      }
      if (landmarks.setTimeOfDay) landmarks.setTimeOfDay(t);
      if (village.setTimeOfDay) village.setTimeOfDay(t);
    },
    setLighting(lighting) {
      applyModuleLighting(lighting);
    },
    getLighting() {
      if (shell.getLighting) return shell.getLighting();
      return null;
    },
    setQuality(q) {
      if (shell.setQuality) shell.setQuality(q);
      if (landmarks.setQuality) landmarks.setQuality(q);
      if (village.setQuality) village.setQuality(q);
    },
    getStats() {
      const s = shell.getStats ? shell.getStats() : { meshes: 0, triangles: 0, drawCallsEstimate: 0 };
      const l = landmarks.getStats ? landmarks.getStats() : { meshes: 0, triangles: 0, drawCallsEstimate: 0 };
      const v = village.getStats ? village.getStats() : { meshes: 0, triangles: 0, drawCallsEstimate: 0 };
      const lm = l.landmarksMain || (landmarks.modules?.landmarksMain?.getStats?.()) || { meshes: 0, triangles: 0, drawCallsEstimate: 0 };
      const lw = l.landmarksWork || (landmarks.modules?.landmarksWork?.getStats?.()) || { meshes: 0, triangles: 0, drawCallsEstimate: 0 };
      return {
        totalMeshes: s.meshes + l.meshes + v.meshes,
        totalTriangles: s.triangles + l.triangles + v.triangles,
        totalDrawCalls: s.drawCallsEstimate + l.drawCallsEstimate + v.drawCallsEstimate,
        shell: s,
        landmarks: l,
        landmarksMain: lm,
        landmarksWork: lw,
        village: v
      };
    },
    dispose() {
      if (shell.dispose) shell.dispose();
      if (landmarks.dispose) landmarks.dispose();
      if (village.dispose) village.dispose();
    }
  };
}
