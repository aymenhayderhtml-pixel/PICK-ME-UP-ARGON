import * as THREE from 'three';
import { gameState } from '../core/GameState.js';

export function testSegmentColliders(x0, z0, dirX, dirZ, maxDist2D, colliders) {
  let closestDist = maxDist2D;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (c.type === 'circle') {
      const vx = x0 - c.x;
      const vz = z0 - c.z;
      const b = 2 * (vx * dirX + vz * dirZ);
      const cVal = vx * vx + vz * vz - c.r * c.r;
      if (cVal < 0) {
        // The segment starts inside the circle: the camera may not travel
        // past the far side of it.
        const disc = b * b - 4 * cVal;
        const tExit = (-b + Math.sqrt(Math.max(0, disc))) * 0.5;
        if (tExit > 0 && tExit < closestDist) {
          closestDist = tExit;
        }
        continue;
      }
      const disc = b * b - 4 * cVal;
      if (disc >= 0) {
        const sqrtDisc = Math.sqrt(disc);
        const t = (-b - sqrtDisc) * 0.5;
        if (t > 0 && t < closestDist) {
          closestDist = t;
        }
      }
    } else if (c.type === 'box') {
      const rot = c.rotY || 0;
      let relX = x0 - c.x;
      let relZ = z0 - c.z;
      let dX = dirX;
      let dZ = dirZ;

      if (rot !== 0) {
        const cosR = Math.cos(-rot);
        const sinR = Math.sin(-rot);
        const rx = relX * cosR - relZ * sinR;
        const rz = relX * sinR + relZ * cosR;
        relX = rx;
        relZ = rz;
        const rdx = dX * cosR - dZ * sinR;
        const rdz = dX * sinR + dZ * cosR;
        dX = rdx;
        dZ = rdz;
      }

      const hw = (c.w || 1) * 0.5;
      const hd = (c.d || 1) * 0.5;

      let tMin = 0;
      let tMax = closestDist;

      if (Math.abs(dX) < 1e-7) {
        if (relX < -hw || relX > hw) continue;
      } else {
        let t1 = (-hw - relX) / dX;
        let t2 = (hw - relX) / dX;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        if (t1 > tMin) tMin = t1;
        if (t2 < tMax) tMax = t2;
        if (tMin > tMax) continue;
      }

      if (Math.abs(dZ) < 1e-7) {
        if (relZ < -hd || relZ > hd) continue;
      } else {
        let t1 = (-hd - relZ) / dZ;
        let t2 = (hd - relZ) / dZ;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        if (t1 > tMin) tMin = t1;
        if (t2 < tMax) tMax = t2;
        if (tMin > tMax) continue;
      }

      if (tMin > 0 && tMin < closestDist) {
        closestDist = tMin;
      } else if (tMin <= 0 && tMax > 0 && tMax < closestDist) {
        // The segment starts inside the box (the player stands in a doorway
        // or inside a room): the camera may not travel past the far face, so
        // it can never pass through the wall.
        closestDist = tMax;
      }
    }
  }
  return closestDist;
}

export class ThirdPersonCamera {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target;
    this.yaw = 0;
    this.pitch = 0.3;
    this.pitchLift = 0;
    this.distance = 6.0;
    this.sensitivity = 0.002;
    this.colliders = [];
    this.raycaster = new THREE.Raycaster();
    this.currentDistance = this.distance;
    this.groundClearance = 1.4;

    // Follow smoothing state
    this.currentLookAt = new THREE.Vector3();
    this.lookAheadOffset = new THREE.Vector3();
    this.isInitialized = false;

    // Aim Mode state
    this.isAiming = false;
    this.currentRightOffset = 0.0;
    this.currentUpOffset = 0.0;

    // Camera shake state
    this.shakeStrength = 0;
    this.shakeDuration = 0;

    // Mouse wheel zoom
    if (typeof window !== 'undefined') {
      window.addEventListener(
        'wheel',
        (e) => {
          const zoomDelta = Math.sign(e.deltaY) * 0.7;
          this.distance = Math.max(3.5, Math.min(10.0, this.distance + zoomDelta));
        },
        { passive: true }
      );
    }

    this.update(1.0);
  }

  setColliders(colliders) {
    this.colliders = colliders || [];
  }

  shake(strength, duration) {
    this.shakeStrength = Math.max(this.shakeStrength, strength);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  handleMouse(dx, dy) {
    let mx = 0, my = 0;
    if (typeof dx === 'object' && dx !== null) {
      mx = dx.x || 0;
      my = dx.y || 0;
    } else {
      mx = dx || 0;
      my = dy || 0;
    }
    const sens = this.sensitivity || 0.0025;
    this.yaw -= mx * sens;
    this.pitch = Math.max(-0.65, Math.min(0.65, this.pitch + my * sens));
  }

  setAimMode(isAiming) {
    this.isAiming = Boolean(isAiming);
  }

  getAimDirection(originWorldPos) {
    const targetPoint = new THREE.Vector3();
    this.camera.getWorldDirection(targetPoint);
    targetPoint.multiplyScalar(40.0).add(this.camera.position);

    const aimDir = new THREE.Vector3().subVectors(targetPoint, originWorldPos).normalize();
    return aimDir;
  }

  getYaw() {
    return this.yaw;
  }

  getFollowTimeConstant() {
    const speed = gameState?.settings?.camera?.followSpeed || 'tight';
    if (speed === 'normal') return 0.12;
    if (speed === 'loose') return 0.25;
    return 0.06; // 'tight' default
  }

  getBaseDistance() {
    const distPreset = gameState?.settings?.camera?.distance || 'normal';
    if (distPreset === 'near') return 4.5;
    if (distPreset === 'far') return 8.5;
    return 6.0; // 'normal' default
  }

  update(delta, input = null) {
    if (delta <= 0) delta = 0.016;

    // Sync camera preset distance if not manually wheel-zoomed
    const basePreset = this.getBaseDistance();
    if (this._lastPreset !== basePreset) {
      this._lastPreset = basePreset;
      this.distance = basePreset;
    }

    // Arrow keys control camera yaw & pitch
    if (input && typeof input.isDown === 'function') {
      if (input.isDown('ArrowLeft')) {
        this.yaw += 1.8 * delta;
      }
      if (input.isDown('ArrowRight')) {
        this.yaw -= 1.8 * delta;
      }
      if (input.isDown('ArrowUp')) {
        this.pitch = Math.min(1.0, this.pitch + 1.8 * delta);
      }
      if (input.isDown('ArrowDown')) {
        this.pitch = Math.max(-0.3, this.pitch - 1.8 * delta);
      }
    }

    // Mouse Look: the cursor is hidden while playing, so any mouse movement
    // over the canvas steers the camera. UI windows replace the input with a
    // stub that reports no movement, so the camera never spins over a menu.
    if (input && typeof input.consumeMouseDelta === 'function') {
      const mDelta = input.consumeMouseDelta();
      if (mDelta && (mDelta.x !== 0 || mDelta.y !== 0)) {
        this.handleMouse(mDelta.x, mDelta.y);
      }
    }

    if (!this.target) return;

    // Effective pitch: the player's pitch plus the collision lift. The lift
    // raises the camera over an obstacle instead of letting it clip into the
    // geometry.
    const pitch = Math.max(-0.65, Math.min(0.85, this.pitch + this.pitchLift));

    // Target position
    const targetPos = this.target.position;
    const charFacing = this.target.rotation ? this.target.rotation.y : 0;

    // Camera orientation is driven by the mouse (or the arrow keys), never by
    // the movement keys. W/A/S/D translate the character along fixed
    // camera-relative axes, so A/D no longer swings the camera around the
    // character (which used to send the player travelling in a circle).

    // Keep yaw normalized in [-PI, PI]
    while (this.yaw < -Math.PI) this.yaw += Math.PI * 2;
    while (this.yaw > Math.PI) this.yaw -= Math.PI * 2;

    // Look-ahead: shift target 0.6m in movement direction while running
    const isRunning = input ? (input.isDown('ShiftLeft') || input.isDown('ShiftRight')) : false;
    const isMoving = input ? (input.isDown('KeyW') || input.isDown('KeyS') || input.isDown('KeyA') || input.isDown('KeyD')) : false;
    const desiredLookAhead = new THREE.Vector3();
    if (!this.isAiming && isRunning && isMoving) {
      const fwdX = Math.sin(charFacing);
      const fwdZ = Math.cos(charFacing);
      desiredLookAhead.set(fwdX * 0.6, 0, fwdZ * 0.6);
    }
    this.lookAheadOffset.lerp(desiredLookAhead, Math.min(1.0, 8.0 * delta));

    // Desired lookAt position
    const desiredLookAt = new THREE.Vector3(
      targetPos.x + this.lookAheadOffset.x,
      targetPos.y + 1.5,
      targetPos.z + this.lookAheadOffset.z
    );

    if (!this.isInitialized) {
      this.currentLookAt.copy(desiredLookAt);
      this.isInitialized = true;
    } else {
      // (a) Critically damped spring / exponential smoothing
      // Horizontal time constant (tight 0.06s, normal 0.12s, loose 0.25s)
      const tauH = this.isAiming ? 0.04 : this.getFollowTimeConstant();
      const alphaH = 1.0 - Math.exp(-delta / Math.max(0.01, tauH));
      // Vertical time constant (0.18s) so stairs do not jerk the view
      const alphaV = 1.0 - Math.exp(-delta / (this.isAiming ? 0.06 : 0.18));

      this.currentLookAt.x += (desiredLookAt.x - this.currentLookAt.x) * alphaH;
      this.currentLookAt.z += (desiredLookAt.z - this.currentLookAt.z) * alphaH;
      this.currentLookAt.y += (desiredLookAt.y - this.currentLookAt.y) * alphaV;

      // Horizontal lag clamp: must never lag behind sprinting character by > 1.2 units
      const lagX = desiredLookAt.x - this.currentLookAt.x;
      const lagZ = desiredLookAt.z - this.currentLookAt.z;
      const lagDist = Math.hypot(lagX, lagZ);
      if (lagDist > 1.2) {
        this.currentLookAt.x = desiredLookAt.x - (lagX / lagDist) * 1.2;
        this.currentLookAt.z = desiredLookAt.z - (lagZ / lagDist) * 1.2;
      }
    }

    // Aim Mode shoulder offset & distance smoothing
    let targetDistance = this.distance;
    if (this.isAiming) {
      targetDistance = 2.4;
      this.currentRightOffset = THREE.MathUtils.lerp(this.currentRightOffset, 0.55, Math.min(1.0, 10.0 * delta));
      this.currentUpOffset = THREE.MathUtils.lerp(this.currentUpOffset, 0.35, Math.min(1.0, 10.0 * delta));
    } else {
      this.currentRightOffset = THREE.MathUtils.lerp(this.currentRightOffset, 0.0, Math.min(1.0, 8.0 * delta));
      this.currentUpOffset = THREE.MathUtils.lerp(this.currentUpOffset, 0.0, Math.min(1.0, 8.0 * delta));
    }

    const lookAtPos = this.currentLookAt.clone();
    lookAtPos.x += Math.cos(this.yaw) * (this.currentRightOffset * 0.5);
    lookAtPos.z -= Math.sin(this.yaw) * (this.currentRightOffset * 0.5);
    lookAtPos.y += this.currentUpOffset * 0.5;

    const effDist = this.isAiming ? targetDistance : this.distance;
    const horizontalDistance = effDist * Math.cos(pitch);
    const offsetX = Math.sin(this.yaw) * horizontalDistance + Math.cos(this.yaw) * this.currentRightOffset;
    const offsetY = Math.sin(pitch) * effDist + this.currentUpOffset;
    const offsetZ = Math.cos(this.yaw) * horizontalDistance - Math.sin(this.yaw) * this.currentRightOffset;

    const fullCamOffset = new THREE.Vector3(offsetX, offsetY, offsetZ);

    // Camera collision detection
    if (this.colliders && this.colliders.length > 0) {
      if (this.colliders[0] && (this.colliders[0].type === 'circle' || this.colliders[0].type === 'box')) {
        const cosPitch = Math.max(0.1, Math.cos(pitch));
        const maxDist2D = this.distance * cosPitch;
        const dir2DX = offsetX / (horizontalDistance || 1e-5);
        const dir2DZ = offsetZ / (horizontalDistance || 1e-5);
        const hit2D = testSegmentColliders(lookAtPos.x, lookAtPos.z, dir2DX, dir2DZ, maxDist2D, this.colliders);
        if (hit2D < maxDist2D) {
          const hit3D = hit2D / cosPitch;
          targetDistance = Math.max(1.2, hit3D - 0.55);
        }
      } else {
        const rayDir = fullCamOffset.clone().normalize();
        this.raycaster.set(lookAtPos, rayDir);
        this.raycaster.far = this.distance;
        const hits = this.raycaster.intersectObjects(this.colliders, true);
        if (hits.length > 0) {
          targetDistance = Math.max(2.5, hits[0].distance - 0.4);
        }
      }
    }

    // When the camera is blocked, lift it so it looks over the obstacle
    // instead of clipping into the wall or the ground.
    const blockedRatio = Math.max(0, (this.distance - targetDistance) / this.distance);
    const liftTarget = Math.min(0.5, blockedRatio * 0.8);
    this.pitchLift = THREE.MathUtils.lerp(this.pitchLift, liftTarget, Math.min(1, 5 * delta));

    // Smooth distance adjustment
    this.currentDistance = THREE.MathUtils.lerp(
      this.currentDistance ?? this.distance,
      targetDistance,
      Math.min(1, 12 * delta)
    );

    const actualHorizontal = this.currentDistance * Math.cos(pitch);
    const actualOffsetX = Math.sin(this.yaw) * actualHorizontal;
    const actualOffsetY = Math.sin(pitch) * this.currentDistance;
    const actualOffsetZ = Math.cos(this.yaw) * actualHorizontal;

    const desiredPosition = new THREE.Vector3(
      lookAtPos.x + actualOffsetX,
      lookAtPos.y + actualOffsetY,
      lookAtPos.z + actualOffsetZ
    );

    const lerpFactor = Math.min(1, 14 * delta);
    this.camera.position.lerp(desiredPosition, lerpFactor);

    // Camera avoids ground
    if (typeof this.getGroundY === 'function') {
      const groundY = this.getGroundY(this.camera.position.x, this.camera.position.z);
      const clearance = this.groundClearance ?? 1.2;
      if (this.camera.position.y < groundY + clearance) {
        this.camera.position.y = groundY + clearance;
      }
    }

    // Camera shake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= delta;
      const shakeX = (Math.random() - 0.5) * 2 * this.shakeStrength;
      const shakeY = (Math.random() - 0.5) * 2 * this.shakeStrength;
      const shakeZ = (Math.random() - 0.5) * 2 * this.shakeStrength;
      this.camera.position.x += shakeX;
      this.camera.position.y += shakeY;
      this.camera.position.z += shakeZ;
      lookAtPos.x += shakeX * 0.5;
      lookAtPos.y += shakeY * 0.5;
      lookAtPos.z += shakeZ * 0.5;
    }

    this.camera.lookAt(lookAtPos);
  }
}
