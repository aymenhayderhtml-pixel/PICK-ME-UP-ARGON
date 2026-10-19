// src/world/FarmFloor.js
// Floor 1 (the Greek countryside farm) is now assembled by TowerFloor: the pure
// layout (src/world/floorLayouts.js) plus the procedural art module
// (src/art/floors/farm.js). This thin adapter keeps the old export name.
import { buildTowerFloor } from './TowerFloor.js';

export function buildFarmFloor(floorNumber = 1, seed = 1337) {
  return buildTowerFloor({ floorNumber: 1, seed, quality: 'medium' });
}
