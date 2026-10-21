// src/dev/devArena.js
// Full-screen 3D arena setup with responsive framing for all screen sizes

import * as THREE from 'three';
import { createArenaFloor } from './devShared.js';

export class DevArena {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c1219);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 150);
    this.updateCameraFraming();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xdcebf5, 0x141e28, 1.3);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.7);
    dirLight.position.set(10, 18, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    dirLight.shadow.camera.left = -18;
    dirLight.shadow.camera.right = 18;
    dirLight.shadow.camera.top = 18;
    dirLight.shadow.camera.bottom = -18;
    this.scene.add(dirLight);

    // 36m circular stone arena floor with perimeter rings
    this.floor = createArenaFloor(this.scene, 18.0, 12.0);

    // Camera follow / orbit state
    this.cameraMode = 'follow'; // 'follow' | 'orbit' | 'free'
    this.cameraOffset = new THREE.Vector3(0, 10.5, 15.5);
    this.orbitYaw = 0;
    this.orbitPitch = 0.55;
    this.orbitDistance = 22.0;
    this.targetLookAt = new THREE.Vector3(0, 0, 0);

    this.isDragging = false;
    this.prevPointerX = 0;
    this.prevPointerY = 0;

    // Over-the-shoulder aim mode controls & state (Issue 2)
    this.aimYaw = 0;
    this.aimPitch = 0.05;
    this.prevAimX = 0;
    this.prevAimY = 0;
    this.mouseRaycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.setupResize();
    this.setupCameraControls();
  }

  updateCameraFraming() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.aspect = aspect;
    // Ensure 36m circle is fully framed across narrow or wide viewports
    if (aspect < 1.0) {
      this.camera.fov = 60;
      this.camera.position.set(0, 20.0, 24.0);
    } else if (aspect < 1.5) {
      this.camera.fov = 50;
      this.camera.position.set(0, 14.0, 18.0);
    } else {
      this.camera.fov = 46;
      this.camera.position.set(0, 10.5, 15.5);
    }
    this.camera.updateProjectionMatrix();
  }

  setupResize() {
    window.addEventListener('resize', () => {
      this.updateCameraFraming();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  setupCameraControls() {
    // Right click drag or Alt+Left click drag to orbit camera
    window.addEventListener('mousedown', (e) => {
      if (e.target.closest('#left-panel, #right-panel, #top-navbar, .side-panel, button, select, input')) return;
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        this.isDragging = true;
        this.prevPointerX = e.clientX;
        this.prevPointerY = e.clientY;
        this.cameraMode = 'orbit';
      }
    });

    window.addEventListener('mousemove', (e) => {
      // Over-the-shoulder screen aim mode (Issue 2)
      if (this.cameraMode === 'aim') {
        const dx = e.clientX - this.prevAimX;
        const dy = e.clientY - this.prevAimY;
        this.prevAimX = e.clientX;
        this.prevAimY = e.clientY;

        // Slow aiming sensitivity while holding RMB (precise aiming)
        const aimSensitivity = 0.0022;
        this.aimYaw -= dx * aimSensitivity;
        this.aimPitch = Math.max(-0.6, Math.min(0.6, this.aimPitch - dy * aimSensitivity));
        return;
      }

      if (!this.isDragging) return;
      const dx = e.clientX - this.prevPointerX;
      const dy = e.clientY - this.prevPointerY;
      this.prevPointerX = e.clientX;
      this.prevPointerY = e.clientY;

      this.orbitYaw -= dx * 0.006;
      this.orbitPitch = Math.max(0.1, Math.min(1.4, this.orbitPitch + dy * 0.006));
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('wheel', (e) => {
      if (e.target.closest('#left-panel, #right-panel, #top-navbar, .side-panel, button, select, input')) return;
      this.orbitDistance = Math.max(5.0, Math.min(45.0, this.orbitDistance * (1 + e.deltaY * 0.001)));
    }, { passive: true });
  }

  setAimMode(enabled, activeHero) {
    if (enabled) {
      if (this.cameraMode !== 'aim') this.prevCameraMode = this.cameraMode;
      this.cameraMode = 'aim';
      this.isAiming = true;
      if (activeHero) {
        this.aimYaw = activeHero.facingYaw;
      }
      this.aimPitch = 0.05;
    } else if (this.cameraMode === 'aim') {
      this.isAiming = false;
      this.cameraMode = this.prevCameraMode || 'follow';
      this.setHeroOpacity(activeHero, 1.0);
      this.updateCameraFraming();
    }
  }

  triggerRecoilKick() {
    this.recoilKickTimer = 0.10;
  }

  setHeroOpacity(activeHero, opacity) {
    if (!activeHero?.mesh) return;
    activeHero.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          for (const m of child.material) {
            m.transparent = opacity < 0.99;
            m.opacity = opacity;
          }
        } else {
          child.material.transparent = opacity < 0.99;
          child.material.opacity = opacity;
        }
      }
    });
  }

  getScreenAimPoint(target = new THREE.Vector3(), combatants = [], activeHero = null) {
    // Cast ray directly through screen center (reticle position)
    this.mouseRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const ray = this.mouseRaycaster.ray;

    // 1. Raycast test against living enemy combatants (capsule approximation)
    if (combatants && combatants.length > 0) {
      let closestT = Infinity;
      let hitTarget = null;
      const rayDir = ray.direction;
      const rayOrigin = ray.origin;

      for (const c of combatants) {
        if (!c || c.isDead || c === activeHero) continue;
        if (activeHero?.team && c.team === activeHero.team) continue;

        const pos = c.position;
        const h = c.capsuleHeight ?? (c.isBoss ? 3.2 : 1.8);
        const r = (c.capsuleRadius ?? (c.isBoss ? 1.4 : 0.6)) + 0.18;

        // XZ horizontal ray-cylinder intersection
        const dx = pos.x - rayOrigin.x;
        const dz = pos.z - rayOrigin.z;
        const dirLenXZ = Math.hypot(rayDir.x, rayDir.z);
        if (dirLenXZ < 0.0001) continue;

        const normDirX = rayDir.x / dirLenXZ;
        const normDirZ = rayDir.z / dirLenXZ;
        const proj = dx * normDirX + dz * normDirZ;
        if (proj <= 0.2) continue; // Behind or too close to camera

        const tRay = proj / dirLenXZ;
        const rayPointX = rayOrigin.x + rayDir.x * tRay;
        const rayPointY = rayOrigin.y + rayDir.y * tRay;
        const rayPointZ = rayOrigin.z + rayDir.z * tRay;

        const distXZ = Math.hypot(rayPointX - pos.x, rayPointZ - pos.z);
        if (distXZ <= r && rayPointY >= pos.y - 0.15 && rayPointY <= pos.y + h + 0.25) {
          if (tRay < closestT) {
            closestT = tRay;
            hitTarget = new THREE.Vector3(rayPointX, rayPointY, rayPointZ);
          }
        }
      }

      if (hitTarget) {
        return target.copy(hitTarget);
      }
    }

    // 2. Fall back to ground intersection
    const hit = ray.intersectPlane(this.groundPlane, target);
    if (hit && target.y >= -1.0) {
      return target;
    }

    // 3. Fall back to 35m along screen aim vector
    return target.copy(ray.origin).addScaledVector(ray.direction, 35.0);
  }

  update(activeHero, rawDt = 0.016) {
    if (this.cameraMode === 'aim' && activeHero) {
      // Smooth camera zoom over 0.15s (FOV from 46 down to 36)
      if (this.aimZoomProgress === undefined) this.aimZoomProgress = 0.0;
      this.aimZoomProgress = Math.min(1.0, this.aimZoomProgress + rawDt / 0.15);
      this.camera.fov = 46 - 10 * this.aimZoomProgress;
      this.camera.updateProjectionMatrix();

      // Screen aiming directs hero facing yaw
      activeHero.facingYaw = this.aimYaw;

      const fwdX = Math.sin(this.aimYaw);
      const fwdZ = Math.cos(this.aimYaw);
      const rightX = Math.cos(this.aimYaw);
      const rightZ = -Math.sin(this.aimYaw);

      // Over the right shoulder (2.35m back, 1.35m high, 0.60m right)
      let targetCamX = activeHero.position.x - fwdX * 2.35 + rightX * 0.60;
      let targetCamY = activeHero.position.y + 1.35;
      let targetCamZ = activeHero.position.z - fwdZ * 2.35 + rightZ * 0.60;

      // Juice: light camera recoil kick (2-3px back & up, damped over 0.10s)
      if (this.recoilKickTimer > 0) {
        this.recoilKickTimer -= rawDt;
        const kickFrac = Math.max(0, this.recoilKickTimer / 0.10);
        const kickDist = kickFrac * 0.09;
        targetCamX -= fwdX * kickDist;
        targetCamZ -= fwdZ * kickDist;
        targetCamY += kickDist * 0.5;
      }

      this.camera.position.x += (targetCamX - this.camera.position.x) * 0.40;
      this.camera.position.y += (targetCamY - this.camera.position.y) * 0.40;
      this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.40;

      // Transparency if camera is closer than 1.5m to hero
      const camDistToHero = this.camera.position.distanceTo(activeHero.position);
      if (camDistToHero < 1.55) {
        this.setHeroOpacity(activeHero, 0.40);
      } else {
        this.setHeroOpacity(activeHero, 1.0);
      }

      const lookDist = 30.0;
      const lookPitch = Math.sin(this.aimPitch) * lookDist;
      this.targetLookAt.set(
        this.camera.position.x + fwdX * lookDist,
        this.camera.position.y + lookPitch,
        this.camera.position.z + fwdZ * lookDist
      );
      this.camera.lookAt(this.targetLookAt);
    } else {
      if (this.aimZoomProgress !== undefined && this.aimZoomProgress > 0) {
        this.aimZoomProgress = Math.max(0, this.aimZoomProgress - rawDt / 0.15);
        this.camera.fov = 46 - 10 * this.aimZoomProgress;
        this.camera.updateProjectionMatrix();
      }
      if (this.cameraMode === 'follow' && activeHero) {
        const targetCamX = activeHero.position.x;
        const targetCamZ = activeHero.position.z + 11.0;
        const targetCamY = activeHero.position.y + 9.0;
        this.camera.position.x += (targetCamX - this.camera.position.x) * 0.08;
        this.camera.position.y += (targetCamY - this.camera.position.y) * 0.08;
        this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.08;
        this.targetLookAt.set(activeHero.position.x, activeHero.position.y + 1.1, activeHero.position.z);
        this.camera.lookAt(this.targetLookAt);
      } else if (this.cameraMode === 'orbit') {
        const cy = Math.sin(this.orbitPitch) * this.orbitDistance;
        const hDist = Math.cos(this.orbitPitch) * this.orbitDistance;
        const cx = Math.sin(this.orbitYaw) * hDist;
        const cz = Math.cos(this.orbitYaw) * hDist;
        const look = activeHero ? activeHero.position : this.targetLookAt;
        this.camera.position.set(look.x + cx, look.y + cy, look.z + cz);
        this.camera.lookAt(look.x, look.y + 1.1, look.z);
      }
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
