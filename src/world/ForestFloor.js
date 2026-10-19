// src/world/ForestFloor.js
// Floors 2 to 5 (the tower forest) are now assembled by TowerFloor: the pure
// layout (src/world/floorLayouts.js) plus the procedural art module
// (src/art/floors/forest.js). This thin adapter keeps the old export name.
import { buildTowerFloor } from './TowerFloor.js';

export function buildForestFloor(floorNumber, seed) {
  const floor = floorNumber === 1 ? 2 : floorNumber;
  return buildTowerFloor({ floorNumber: floor, seed, quality: 'medium' });
}
