// src/art/town/collision.js
// Data-only collision shapes that block the player in the town hub.
//
// The walk-height map (WalkHeight.js) answers "where does the hero stand",
// never "what stops him": LAND_ONLY drops every prop from the height map, so a
// fence, a tree trunk or a boulder is invisible to it. These shapes are the
// obstacle layer for the player only; the camera keeps its own footprint list
// (town.colliders) and the NavGrid keeps its coarse 1 m grid.
//
// Shape format (plain data, no Three.js objects):
//   { type: 'circle', x, z, r }        - trunk, boulder, barrel, crate
//   { type: 'box', x, z, hx, hz, rot } - oriented box, hx/hz are half sizes
// `rot` is a Three.js Y rotation: the box local X axis points along
// (cos rot, -sin rot) in world (x, z), and the box local Z axis along
// (sin rot, cos rot).

import { WALL_COLLIDERS } from './layout.js';

/**
 * Emits one oriented box for a straight wall run.
 * A door gap splits the run into two boxes so the opening stays walkable.
 *
 * @param {Array} blockers Output list
 * @param {number} ax,az Start of the run
 * @param {number} bx,bz End of the run
 * @param {number} thickness Wall thickness
 * @param {?{at:number, half:number}} gap Door opening: `at` is the distance
 *        along the run from (ax,az) to the opening, `half` its half width.
 */
function addWallRun(blockers, ax, az, bx, bz, thickness, gap) {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  if (len < 1e-4) return;

  const ux = dx / len;
  const uz = dz / len;
  // rot so the box long axis (cos rot, -sin rot) points along (ux, uz)
  const rot = Math.atan2(-uz, ux);
  const hz = thickness * 0.5;

  if (gap) {
    const g0 = Math.max(0, gap.at - gap.half);
    const g1 = Math.min(len, gap.at + gap.half);
    if (g1 > g0) {
      if (g0 > 1e-4) {
        blockers.push({
          type: 'box',
          x: ax + ux * g0 * 0.5,
          z: az + uz * g0 * 0.5,
          hx: g0 * 0.5,
          hz,
          rot
        });
      }
      if (g1 < len - 1e-4) {
        blockers.push({
          type: 'box',
          x: ax + ux * (g1 + len) * 0.5,
          z: az + uz * (g1 + len) * 0.5,
          hx: (len - g1) * 0.5,
          hz,
          rot
        });
      }
      return;
    }
  }

  blockers.push({
    type: 'box',
    x: ax + ux * len * 0.5,
    z: az + uz * len * 0.5,
    hx: len * 0.5,
    hz,
    rot
  });
}

/**
 * Emits a ring of oriented boxes around a circular building, leaving a door
 * opening centred on `doorAngle`.
 */
function addCircularWall(blockers, cx, cz, radius, doorAngle, gapHalfWidth, thickness, segments) {
  const step = (Math.PI * 2) / segments;
  const hz = thickness * 0.5;
  const gapAngle = Math.min(step * 0.5, gapHalfWidth / radius);
  const hx = radius * Math.sin(step * 0.5) * 1.12 + hz;

  const half = Math.floor(segments / 2);
  for (let k = 0; k < half; k++) {
    for (let s = -1; s <= 1; s += 2) {
      const a = doorAngle + s * (gapAngle + (k + 0.5) * step);
      blockers.push({
        type: 'box',
        x: cx + Math.cos(a) * radius,
        z: cz + Math.sin(a) * radius,
        hx,
        hz,
        // The box long axis is the tangent of the circle at angle a
        rot: Math.atan2(-Math.cos(a), -Math.sin(a))
      });
    }
  }
}

/**
 * Four wall runs around a rectangular building, with the door opening carved
 * out of the wall the door sits on.
 */
function addBoxBuildingWalls(blockers, cx, cz, width, depth, door, doorHalf) {
  const t = WALL_COLLIDERS.thickness;
  const x1 = cx - width * 0.5;
  const x2 = cx + width * 0.5;
  const z1 = cz - depth * 0.5;
  const z2 = cz + depth * 0.5;

  // The door opens through the wall face it is closest to: a front or back
  // wall (a wall that runs along X) or a side wall (a wall that runs along Z).
  const distToZFace = Math.min(Math.abs(door.z - z1), Math.abs(door.z - z2));
  const distToXFace = Math.min(Math.abs(door.x - x1), Math.abs(door.x - x2));

  if (distToXFace < distToZFace) {
    // Door on the -X or +X wall: that wall is split by the opening.
    const x = door.x > cx ? x2 : x1;
    addWallRun(blockers, x1, z2, x2, z2, t, null);
    addWallRun(blockers, x1, z1, x2, z1, t, null);
    addWallRun(blockers, x, z1, x, z2, t, { at: door.z - z1, half: doorHalf });
    addWallRun(blockers, x1, z1, x1, z2, t, null);
    return;
  }

  // Door on the -Z or +Z wall: that wall is split by the opening, the
  // opposite wall stays solid.
  const z = door.z > cz ? z2 : z1;
  const oppositeZ = z === z1 ? z2 : z1;
  addWallRun(blockers, x1, z, x2, z, t, { at: door.x - x1, half: doorHalf });
  addWallRun(blockers, x1, oppositeZ, x2, oppositeZ, t, null);
  addWallRun(blockers, x1, z1, x1, z2, t, null);
  addWallRun(blockers, x2, z1, x2, z2, t, null);
}

/**
 * Builds the building wall blockers of the town from the layout footprints.
 * Every door opening stays open, so the hero can still walk into a building.
 *
 * Not covered here (the NavGrid already blocks them and they are not walls):
 * the Summoning Room drum (its south-west face is an open colonnade and its
 * ramp must stay clear), the Space-Time Rift gate, the training yard and the
 * dungeon board.
 */
export function buildBuildingBlockers(layout) {
  const blockers = [];
  const L = layout || {};

  // Residences: 10 cottages, each with a door on its front (+Z) wall.
  for (const c of L.cottages || []) {
    const door = c.door?.position || { x: c.center.x, z: c.center.z + c.size.depth * 0.5 };
    addBoxBuildingWalls(
      blockers,
      c.center.x,
      c.center.z,
      c.size.width,
      c.size.depth,
      door,
      WALL_COLLIDERS.cottageDoorHalf
    );
  }

  const zones = L.zones || {};

  // Armory: the main hall only, the lean-to forge shed stays open.
  const armory = zones.armory;
  if (armory) {
    const wallBox = armory.wallBox || {
      x: armory.center.x,
      z: armory.center.z,
      width: armory.footprint?.width || 0,
      depth: armory.footprint?.depth || 0
    };
    const door = armory.door?.position || { x: wallBox.x, z: wallBox.z + wallBox.depth * 0.5 };
    addBoxBuildingWalls(
      blockers,
      wallBox.x,
      wallBox.z,
      wallBox.width,
      wallBox.depth,
      door,
      WALL_COLLIDERS.buildingDoorHalf
    );
  }

  // Mess Hall row: one long block with the door on its front (-Z) wall.
  const mess = zones.mess_hall_row;
  if (mess && mess.footprint && mess.footprint.type === 'box') {
    const door = mess.door?.position || { x: mess.center.x, z: mess.center.z - mess.footprint.depth * 0.5 };
    addBoxBuildingWalls(
      blockers,
      mess.center.x,
      mess.center.z,
      mess.footprint.width,
      mess.footprint.depth,
      door,
      WALL_COLLIDERS.buildingDoorHalf
    );
  }

  // Synthesis Chamber: a round drum with one door opening.
  const synth = zones.synthesis_chamber;
  if (synth && synth.footprint && synth.footprint.type === 'circle') {
    const door = synth.door?.position || { x: synth.center.x, z: synth.center.z + synth.footprint.radius };
    const doorAngle = Math.atan2(door.z - synth.center.z, door.x - synth.center.x);
    addCircularWall(
      blockers,
      synth.center.x,
      synth.center.z,
      synth.footprint.radius,
      doorAngle,
      WALL_COLLIDERS.synthesisDoorHalf,
      WALL_COLLIDERS.thickness,
      16
    );
  }

  return blockers;
}
