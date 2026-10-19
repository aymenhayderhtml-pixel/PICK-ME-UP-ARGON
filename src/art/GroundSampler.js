// src/art/GroundSampler.js
/**
 * Shared ground height sampler for characters, allies, NPCs and enemies across both Hub and Tower.
 *
 * @param {object} scene The active scene (HubScene or TowerScene)
 * @param {number} x World X coordinate
 * @param {number} z World Z coordinate
 * @returns {number} Ground elevation in world units
 */
export function getEntityGroundY(scene, x, z) {
  if (!scene) return 0;

  // In HubScene: favor getWalkY (sampling walk-height map including platforms/stairs)
  if (typeof scene.getWalkY === 'function') {
    return scene.getWalkY(x, z);
  }

  // In TowerScene: query active floor height function if non-flat, otherwise 0
  if (scene.currentFloor && typeof scene.currentFloor.getGroundY === 'function') {
    return scene.currentFloor.getGroundY(x, z);
  }
  if (scene.floor && typeof scene.floor.getGroundY === 'function') {
    return scene.floor.getGroundY(x, z);
  }
  if (typeof scene.getGroundY === 'function') {
    return scene.getGroundY(x, z);
  }

  return 0;
}
