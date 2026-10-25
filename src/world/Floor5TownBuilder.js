// src/world/Floor5TownBuilder.js
// Ruined medieval town at sunset for Floor 5 (SURVIVAL).
import * as THREE from 'three';
import { FLOOR5_CONFIG } from '../data/floor5.config.js';

export function buildFloor5Town({ floorNumber = 5, seed = 5 * 7919 + 13, quality = 'medium', scene = null } = {}) {
  const cfg = FLOOR5_CONFIG;
  const group = new THREE.Group();

  const chokeW = cfg.layout.chokepointWidth;
  const platformH = cfg.layout.platformHeight;

  // Ground plane (cobblestone street area)
  const groundGeo = new THREE.PlaneGeometry(60, 80);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x6e5a4f, roughness: 0.95 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -20);
  group.add(ground);

  // Cobblestone paving blocks along central street
  const cobbleMat = new THREE.MeshStandardMaterial({ color: 0x6e5a4f, roughness: 0.9 });
  for (let z = 12; z >= -40; z -= 1.2) {
    for (let x = -chokeW / 2; x <= chokeW / 2; x += 1.2) {
      const cb = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 1.1), cobbleMat);
      cb.position.set(x, 0.04, z);
      group.add(cb);
    }
  }

  // Raised wooden walkway / wall platform
  const platformMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.85 });
  const platform = new THREE.Mesh(new THREE.BoxGeometry(cfg.layout.platformWidth, 0.4, cfg.layout.platformDepth), platformMat);
  platform.position.set(8, platformH, -15);
  group.add(platform);
  // platform posts
  for (let i = 0; i < 4; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, platformH, 8), platformMat);
    post.position.set(8 + (i % 2 === 0 ? -2 : 2), platformH / 2, -15 + (i < 2 ? -1.5 : 1.5));
    group.add(post);
  }
  // Ramp
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 7.0), platformMat);
  ramp.position.set(6, platformH / 2, -11);
  ramp.rotation.x = -Math.atan2(platformH, 7);
  group.add(ramp);

  // Multi-story ruined half-timbered houses along both sides
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xc89d7c, roughness: 0.95 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x3a2314, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5a3020, roughness: 0.85 });
  const windowMat = new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff8822, emissiveIntensity: 0.6 });
  const houses = [
    { x: -6, z: 8, w: 3.5, d: 5, h: 6 },
    { x: -7, z: -2, w: 4, d: 5, h: 7 },
    { x: -6.5, z: -14, w: 3.5, d: 5, h: 6 },
    { x: -7, z: -26, w: 4, d: 5, h: 7 },
    { x: -6, z: -38, w: 3.5, d: 5, h: 6 },
    { x: 6, z: 8, w: 3.5, d: 5, h: 6 },
    { x: 7, z: -2, w: 4, d: 5, h: 7 },
    { x: 6.5, z: -14, w: 3.5, d: 5, h: 6 },
    { x: 7, z: -26, w: 4, d: 5, h: 7 },
    { x: 6, z: -38, w: 3.5, d: 5, h: 6 },
  ];
  for (const h of houses) {
    const stoneBase = new THREE.Mesh(new THREE.BoxGeometry(h.w, h.h * 0.4, h.d), stoneMat);
    stoneBase.position.set(h.x, h.h * 0.2, h.z);
    group.add(stoneBase);
    const timber = new THREE.Mesh(new THREE.BoxGeometry(h.w * 0.9, h.h * 0.6, h.d * 0.9), timberMat);
    timber.position.set(h.x, h.h * 0.7, h.z);
    group.add(timber);
    // pitched roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(h.w * 0.7, 2.5, 4), roofMat);
    roof.position.set(h.x, h.h + 1.25, h.z);
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
    // warm window
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), windowMat);
    win.position.set(h.x, h.h * 0.5, h.z + h.d / 2 + 0.01);
    group.add(win);
    // broken beam (some houses)
    if (Math.abs(h.x) > 6.5) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.15, h.h * 0.8, 0.15), timberMat);
      beam.position.set(h.x + (h.x > 0 ? -h.w / 2 : h.w / 2), h.h * 0.5, h.z);
      beam.rotation.z = 0.3;
      group.add(beam);
    }
  }

  const startPosition = new THREE.Vector3(0, 0, 0);
  const exitPosition = new THREE.Vector3(0, 0, -45);

  const blockers = [];
  for (const h of houses) {
    blockers.push({ id: `house_${h.x}_${h.z}`, type: 'box', x: h.x, z: h.z, w: h.w + 0.5, d: h.d + 0.5, rotY: 0 });
  }

  const clearings = [];
  const chokePoints = [];
  const ambushSpots = [];

  function isWalkable(x, z) {
    if (Math.abs(x) <= chokeW / 2 + 1.5) return true;
    if (x >= 4 && x <= 12 && z >= -20 && z <= -10) return true;
    for (const sp of cfg.layout.spawnPoints) {
      if (Math.hypot(x - sp.x, z - sp.z) < 6) return true;
    }
    return false;
  }

  function findNearestWalkable(x, z) {
    if (isWalkable(x, z)) return { x, z };
    return { x: 0, z };
  }

  function getGroundY(x, z) {
    if (x >= 4 && x <= 12 && z >= -20 && z <= -10) return platformH;
    return 0;
  }

  const partySlotPositions = [
    new THREE.Vector3(startPosition.x - 1.5, 0, startPosition.z + 2.2),
    new THREE.Vector3(startPosition.x + 1.5, 0, startPosition.z + 2.2),
  ];

  const entranceGate = { isClosed: false, close() { this.isClosed = true; } };
  const exitGate = { isOpen: false, open() { this.isOpen = true; } };

  if (scene) scene.add(group);

  return {
    group,
    art: { moduleName: 'floor5town', update() {}, dispose() {}, setQuality() {}, setGateState() {}, colliders: [], lights: [] },
    layout: { clearings, chokePoints, ambushSpots, startPosition: { x: 0, y: 0, z: 0 }, exitPosition: { x: 0, y: 0, z: -45 }, walkable: isWalkable, getGroundY: () => 0 },
    moduleName: 'floor5town',
    anchors: {},
    lights: [],
    colliders: [],
    blockers,
    clearings,
    chokePoints,
    ambushSpots,
    startPosition,
    exitPosition,
    partySlotPositions,
    entranceGate,
    exitGate,
    pillars: [],
    isArenaSealed: false,
    isWalkable,
    findNearestWalkable,
    getGroundY,
    destroyPillarAt: () => false,
    update(delta, time, playerPos, camera) {
      if (this.art && this.art.update) this.art.update(delta, time, camera);
    },
    dispose() {
      if (this.art && this.art.dispose) this.art.dispose();
    },
  };
}