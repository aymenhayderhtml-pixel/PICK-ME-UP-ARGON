import * as THREE from 'three';

/**
 * Camera blocking: allies, enemies, or player closer than 2.5 units to the camera
 * fade out to 0.15 opacity over 0.2 seconds, and back to 1.0 when moving away.
 * Never sets depthWrite false on body parts, and always restores opacity 1 when far.
 */
export function updateHumanoidCameraFade(group, cameraPosition, delta) {
  if (!group || !cameraPosition) return;

  const dist = group.position.distanceTo(cameraPosition);
  const targetOpacity = dist < 2.5 ? 0.15 : 1.0;

  if (group._camFadeOpacity === undefined) {
    group._camFadeOpacity = 1.0;
  }

  const speed = 5.0 * delta; // 0.2s full transition
  if (group._camFadeOpacity < targetOpacity) {
    group._camFadeOpacity = Math.min(targetOpacity, group._camFadeOpacity + speed);
  } else if (group._camFadeOpacity > targetOpacity) {
    group._camFadeOpacity = Math.max(targetOpacity, group._camFadeOpacity - speed);
  }

  const op = group._camFadeOpacity;
  const isFar = op >= 0.999;

  const rig = group._heroRig || group.userData?.heroRig;
  if (rig && typeof rig.setOpacity === 'function') {
    rig.setOpacity(isFar ? 1.0 : op);
    return;
  }

  group.traverse((child) => {
    if (child.isMesh && child.material) {
      const applyMat = (mat) => {
        // Body parts must NEVER have depthWrite false
        mat.depthWrite = true;
        if (isFar) {
          mat.transparent = false;
          mat.opacity = 1.0;
        } else {
          mat.transparent = true;
          mat.opacity = op;
        }
      };

      if (Array.isArray(child.material)) {
        for (const mat of child.material) applyMat(mat);
      } else {
        applyMat(child.material);
      }
    }
  });
}
