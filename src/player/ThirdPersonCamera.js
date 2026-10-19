import * as THREE from 'three';

function testSegmentColliders(x0, z0, dirX, dirZ, maxDist2D, colliders) {
  let closestDist = maxDist2D;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (c.type === 'circle') {
      const vx = x0 - c.x;
      const vz = z0 - c.z;
      const b = 2 * (vx * dirX + vz * dirZ);
      const cVal = vx * vx + vz * vz - c.r * c.r;
      if (cVal < 0) {
        return 0;
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
    this.distance = 6;
    this.sensitivity = 0.002;
    this.colliders = [];
    this.raycaster = new THREE.Raycaster();
    this.currentDistance = this.distance;
    this.groundClearance = 1.2;

    // Camera shake state
    this.shakeStrength = 0;
    this.shakeDuration = 0;

    // Mouse wheel zooms between 4 and 10 units
    if (typeof window !== 'undefined') {
      window.addEventListener(
        'wheel',
        (e) => {
          const zoomDelta = Math.sign(e.deltaY) * 0.7;
          this.distance = Math.max(4.0, Math.min(10.0, this.distance + zoomDelta));
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

  handleMouse(mouseDelta) {
    // Moving the mouse must NOT rotate the camera.
  }

  getYaw() {
    return this.yaw;
  }

  update(delta, input = null) {
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

    if (!this.target) return;

    const targetPos = this.target.position;
    const lookAtPos = new THREE.Vector3(
      targetPos.x,
      targetPos.y + 1.5,
      targetPos.z
    );

    const horizontalDistance = this.distance * Math.cos(this.pitch);
    const offsetX = Math.sin(this.yaw) * horizontalDistance;
    const offsetY = Math.sin(this.pitch) * this.distance;
    const offsetZ = Math.cos(this.yaw) * horizontalDistance;

    const fullCamOffset = new THREE.Vector3(offsetX, offsetY, offsetZ);
    let targetDistance = this.distance;

    // Camera collision: analytical 2D segment test against collider circles/boxes, or mesh raycasting fallback
    if (this.colliders && this.colliders.length > 0) {
      if (this.colliders[0] && (this.colliders[0].type === 'circle' || this.colliders[0].type === 'box')) {
        const cosPitch = Math.max(0.1, Math.cos(this.pitch));
        const maxDist2D = this.distance * cosPitch;
        const dir2DX = offsetX / (horizontalDistance || 1e-5);
        const dir2DZ = offsetZ / (horizontalDistance || 1e-5);
        const hit2D = testSegmentColliders(lookAtPos.x, lookAtPos.z, dir2DX, dir2DZ, maxDist2D, this.colliders);
        if (hit2D < maxDist2D) {
          const hit3D = hit2D / cosPitch;
          targetDistance = Math.max(1.5, hit3D - 0.4);
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

    // Smooth distance adjustment with lerp 12 * delta
    this.currentDistance = THREE.MathUtils.lerp(
      this.currentDistance ?? this.distance,
      targetDistance,
      Math.min(1, 12 * delta)
    );

    const actualHorizontal = this.currentDistance * Math.cos(this.pitch);
    const actualOffsetX = Math.sin(this.yaw) * actualHorizontal;
    const actualOffsetY = Math.sin(this.pitch) * this.currentDistance;
    const actualOffsetZ = Math.cos(this.yaw) * actualHorizontal;

    const desiredPosition = new THREE.Vector3(
      lookAtPos.x + actualOffsetX,
      lookAtPos.y + actualOffsetY,
      lookAtPos.z + actualOffsetZ
    );

    const lerpFactor = Math.min(1, 10 * delta);
    this.camera.position.lerp(desiredPosition, lerpFactor);

    // Camera avoids the ground
    if (typeof this.getGroundY === 'function') {
      const groundY = this.getGroundY(this.camera.position.x, this.camera.position.z);
      const clearance = this.groundClearance ?? 1.2;
      if (this.camera.position.y < groundY + clearance) {
        this.camera.position.y = groundY + clearance;
      }
    }

    // Apply camera shake if active
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
