// src/world/TowerFloor.js
// Gameplay wrapper that pairs the pure floor layout (src/world/floorLayouts.js)
// with the procedural art module (src/art/floors/FloorAssembler.js).
//
// The layout stays the single source of truth for gameplay (walkability, gates,
// triggers, spawns, the boss arena). The art module is only visuals: this file
// keeps every consumer's API (Player, EnemyManager, Ally, SquadAI, Projectiles,
// ThirdPersonCamera, HobgoblinChief) working unchanged.

import * as THREE from 'three';
import { generateFloorLayout } from './floorLayouts.js';
import { assembleFloor } from '../art/floors/FloorAssembler.js';
import { spawnSparks } from '../combat/Combat.js';
import { showSystemMessage } from '../ui/Hud.js';

function distanceToSegment(px, pz, p1, p2) {
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  const l2 = dx * dx + dz * dz;
  if (l2 === 0) return Math.hypot(px - p1.x, pz - p1.z);
  let t = ((px - p1.x) * dx + (pz - p1.z) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (p1.x + t * dx), pz - (p1.z + t * dz));
}

function insideBox(c, x, z) {
  const rot = c.rotY || 0;
  const dx = x - c.x;
  const dz = z - c.z;
  const cos = Math.cos(-rot);
  const sin = Math.sin(-rot);
  const lx = dx * cos - dz * sin;
  const lz = dx * sin + dz * cos;
  return Math.abs(lx) <= (c.w || 1) * 0.5 && Math.abs(lz) <= (c.d || 1) * 0.5;
}

// A point is "open ground" when it is well inside a clearing interior, on the
// path corridor, or at the start/exit. Colliders found there are bugs: the
// startup self-check warns and ignores them.
function onOpenGround(layout, x, z) {
  for (const cl of layout.clearings || []) {
    if (Math.hypot(x - cl.center.x, z - cl.center.z) < cl.radius - 1.5) return true;
  }
  const poly = layout.pathPolyline || [];
  const half = (layout.pathWidth || 8) * 0.5 - 0.5;
  for (let i = 0; i < poly.length - 1; i++) {
    if (distanceToSegment(x, z, poly[i], poly[i + 1]) <= half) return true;
  }
  const sp = layout.startPosition;
  const ep = layout.exitPosition;
  if (sp && Math.hypot(x - sp.x, z - sp.z) < 4) return true;
  if (ep && Math.hypot(x - ep.x, z - ep.z) < 4) return true;
  return false;
}

export function buildTowerFloor({
  floorNumber = 1,
  seed = floorNumber * 7919 + 13,
  quality = 'medium',
  scene = null,
} = {}) {
  const layout = generateFloorLayout(floorNumber, seed);
  const art = assembleFloor(floorNumber, seed, quality);
  const group = art.group;

  const startPosition = new THREE.Vector3(layout.startPosition.x, 0, layout.startPosition.z);
  const exitPosition = new THREE.Vector3(layout.exitPosition.x, 0, layout.exitPosition.z);

  const clearings = (layout.clearings || []).map((cl) => ({
    center: new THREE.Vector3(cl.center.x, 0, cl.center.z),
    radius: cl.radius,
    spawnPoints: (cl.spawnPoints || []).map((p) => new THREE.Vector3(p.x, 0, p.z)),
    triggerRadius: cl.triggerRadius,
  }));
  const chokePoints = (layout.chokePoints || []).map((cp) => ({
    position: new THREE.Vector3(cp.position.x, 0, cp.position.z),
    direction: new THREE.Vector3(cp.direction.x, 0, cp.direction.z),
    width: cp.width,
  }));
  const ambushSpots = (layout.ambushSpots || []).map((s) => new THREE.Vector3(s.x, 0, s.z));

  // --- Colliders: the layout obstacles (already enforced by layout.walkable)
  // feed the camera pull-in; the boss-arena walls are extra gameplay blockers
  // that the layout does not model. A module may expose its own `colliders`.
  const cameraColliders = [];
  for (const o of layout.obstacles || []) {
    cameraColliders.push({ id: 'obstacle', type: 'circle', x: o.x, z: o.z, r: o.radius });
  }
  const extraColliders = [];
  if (layout.bossArena) {
    layout.bossArena.wallSegments.forEach((w, i) => {
      const box = { id: `arena_wall_${i}`, type: 'box', x: w.x, z: w.z, w: w.length, d: 0.8, rotY: w.rotationY };
      cameraColliders.push(box);
      extraColliders.push(box);
    });
  }
  for (const c of art.colliders || []) {
    cameraColliders.push(c);
    extraColliders.push(c);
  }

  // Startup self-check: never let a new collider block the path, a clearing,
  // the start, the exit, a choke point, a spawn or an ambush point.
  const blockers = [];
  for (const c of extraColliders) {
    if (onOpenGround(layout, c.x, c.z)) {
      console.warn(
        `[A06c] collider ${c.id} at (${c.x.toFixed(1)}, ${c.z.toFixed(1)}) sits on playable ground; ignoring it.`
      );
      continue;
    }
    blockers.push(c);
  }

  // --- Gate state (gameplay) ---
  let entranceOpen = true;
  let exitOpen = false;
  let arenaSealed = false;
  const entranceZ = layout.entranceBarrier ? layout.entranceBarrier.position.z : 6.5;

  function applyGateState() {
    if (art.setGateState) {
      art.setGateState({ entranceOpen, exitOpen, arenaSealed });
    }
  }
  applyGateState();

  const entranceGate = {
    isClosed: false,
    close() {
      if (!entranceOpen) return;
      entranceOpen = false;
      this.isClosed = true;
      applyGateState();
      showSystemMessage('[Warning! The gate has closed. Retreat is not possible until the floor is cleared.]');
    },
  };

  const exitGate = {
    isOpen: false,
    open() {
      if (exitOpen) return;
      exitOpen = true;
      this.isOpen = true;
      applyGateState();
      showSystemMessage('[The floor exit gate has unlocked!]');
    },
  };

  // --- Floor 5 destructible pillars (driven by HobgoblinChief) ---
  const pillars = (layout.bossArena ? layout.bossArena.pillars : []).map((p, index) => ({
    id: p.id,
    x: p.x,
    z: p.z,
    radius: p.radius,
    height: p.height,
    index,
  }));
  const destroyedPillars = [];

  function destroyPillarAt(x, z, radius = 2.0) {
    for (let i = pillars.length - 1; i >= 0; i--) {
      const p = pillars[i];
      if (Math.hypot(p.x - x, p.z - z) > radius) continue;
      let destroyed = false;
      if (art.destroyPillar) destroyed = art.destroyPillar(p.index);
      if (!destroyed) {
        const mesh = group.getObjectByName ? group.getObjectByName(p.id) : null;
        if (mesh) {
          mesh.visible = false;
          destroyed = true;
        } else {
          console.warn(`[A06c] no destructible found for ${p.id}; using layout data only.`);
        }
      }
      destroyedPillars.push({ x: p.x, z: p.z, radius: p.radius });
      if (scene) {
        const count = Math.max(8, Math.round(14 * p.radius));
        spawnSparks(scene, new THREE.Vector3(p.x, (p.height || 4) * 0.5, p.z), 0x9aa0a6, count);
      }
      pillars.splice(i, 1);
      return true;
    }
    return false;
  }

  // --- Walkability: layout + dynamic gates + extra colliders ---
  function isWalkable(x, z) {
    if (!entranceOpen && z > entranceZ - 0.5) return false;
    if (arenaSealed && z > -24.5 && z < -23.0 && Math.abs(x) < 5.0) return false;
    if (!exitOpen && z < exitPosition.z - 0.5) return false;

    for (const p of pillars) {
      if (Math.hypot(x - p.x, z - p.z) < p.radius + 0.35) return false;
    }
    for (const p of destroyedPillars) {
      if (Math.hypot(x - p.x, z - p.z) < p.radius + 0.35) return true;
    }
    for (const c of blockers) {
      if (c.type === 'circle') {
        if (Math.hypot(x - c.x, z - c.z) < (c.r || 0.5)) return false;
      } else if (insideBox(c, x, z)) {
        return false;
      }
    }
    return layout.walkable(x, z);
  }

  function findNearestWalkable(x, z) {
    if (isWalkable(x, z)) return { x, z };
    let bestDist = Infinity;
    let bestPt = { x, z };
    for (const cl of clearings) {
      const dx = x - cl.center.x;
      const dz = z - cl.center.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.001) {
        const clampedR = Math.min(dist, cl.radius - 1.2);
        const px = cl.center.x + (dx / dist) * clampedR;
        const pz = cl.center.z + (dz / dist) * clampedR;
        const d = Math.hypot(x - px, z - pz);
        if (d < bestDist && isWalkable(px, pz)) {
          bestDist = d;
          bestPt = { x: px, z: pz };
        }
      }
    }
    if (!isWalkable(bestPt.x, bestPt.z)) {
      for (let r = 0.5; r <= 8.0; r += 0.5) {
        for (let a = 0; a < 16; a++) {
          const ang = (a / 16) * Math.PI * 2;
          const tx = x + Math.cos(ang) * r;
          const tz = z + Math.sin(ang) * r;
          if (isWalkable(tx, tz)) return { x: tx, z: tz };
        }
      }
    }
    return bestPt;
  }

  function getGroundY(x, z) {
    return typeof layout.getGroundY === 'function' ? layout.getGroundY(x, z) : 0;
  }

  const partySlotPositions = [
    new THREE.Vector3(startPosition.x - 1.5, 0, startPosition.z + 2.2),
    new THREE.Vector3(startPosition.x + 1.5, 0, startPosition.z + 2.2),
  ];

  return {
    group,
    art,
    layout,
    moduleName: art.moduleName || (floorNumber === 1 ? 'farm' : 'forest'),
    anchors: art.anchors || {},
    lights: art.lights || [],
    colliders: cameraColliders,
    blockers,
    clearings,
    chokePoints,
    ambushSpots,
    startPosition,
    exitPosition,
    partySlotPositions,
    entranceGate,
    exitGate,
    pillars,
    get isArenaSealed() {
      return arenaSealed;
    },
    set isArenaSealed(val) {
      arenaSealed = !!val;
      applyGateState();
    },
    isWalkable,
    findNearestWalkable,
    getGroundY,
    destroyPillarAt,
    update(delta, time, playerPos, camera) {
      if (art.update) art.update(delta, time, camera || null);
      if (entranceOpen && playerPos && playerPos.distanceTo(startPosition) > 6.0) {
        entranceGate.close();
      }
    },
    dispose() {
      if (art.dispose) art.dispose();
    },
  };
}
