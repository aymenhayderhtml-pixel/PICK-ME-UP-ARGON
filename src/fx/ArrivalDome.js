// src/fx/ArrivalDome.js
import * as THREE from 'three';

export class ArrivalDome {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'ArrivalDome';
    this.group.visible = false;

    this.active = false;
    this.elapsed = 0;
    this.duration = 2.0;
    this.inputRef = null;
    this.cameraRef = null;
    this.originalPitch = 0.3;
    this.controlUnlocked = false;

    // 1. Translucent Hemisphere (Radius 4.5, additive, opacity 0.22, 2 nested shells)
    const domeGeomOuter = new THREE.SphereGeometry(4.5, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeGeomInner = new THREE.SphereGeometry(4.35, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);

    this.matOuter = new THREE.MeshBasicMaterial({
      color: 0x4ff0ff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.matInner = new THREE.MeshBasicMaterial({
      color: 0x22ccee,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.meshOuter = new THREE.Mesh(domeGeomOuter, this.matOuter);
    this.meshInner = new THREE.Mesh(domeGeomInner, this.matInner);
    this.group.add(this.meshOuter, this.meshInner);

    // 2. Bright thin rim ring on the ground
    const rimGeom = new THREE.RingGeometry(4.35, 4.65, 48);
    rimGeom.rotateX(-Math.PI * 0.5);
    this.matRim = new THREE.MeshBasicMaterial({
      color: 0x77ffff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.meshRim = new THREE.Mesh(rimGeom, this.matRim);
    this.meshRim.position.y = 0.03;
    this.group.add(this.meshRim);

    // 3. 100 small cyan square pixels (instanced boxes 0.12, emissive 0x4ff0ff)
    const boxGeom = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    this.matPixels = new THREE.MeshBasicMaterial({
      color: 0x4ff0ff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.pixelCount = 100;
    this.instancedPixels = new THREE.InstancedMesh(boxGeom, this.matPixels, this.pixelCount);
    this.instancedPixels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Pre-allocated particle states (zero per-frame allocation)
    this.pixelData = new Float32Array(this.pixelCount * 7); // x, y, z, speed, angle, radius, phase
    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.pixelCount; i++) {
      const idx = i * 7;
      const angle = Math.random() * Math.PI * 2;
      const rad = Math.sqrt(Math.random()) * 4.1;
      const x = Math.cos(angle) * rad;
      const z = Math.sin(angle) * rad;
      const y = Math.random() * 3.8 + 0.1;
      const speed = 0.8 + Math.random() * 1.4;
      const phase = Math.random() * Math.PI * 2;

      this.pixelData[idx] = x;
      this.pixelData[idx + 1] = y;
      this.pixelData[idx + 2] = z;
      this.pixelData[idx + 3] = speed;
      this.pixelData[idx + 4] = angle;
      this.pixelData[idx + 5] = rad;
      this.pixelData[idx + 6] = phase;

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      this.instancedPixels.setMatrixAt(i, dummy.matrix);
    }
    this.instancedPixels.instanceMatrix.needsUpdate = true;
    this.group.add(this.instancedPixels);

    // 4. 24 thin vertical light streaks (planes 0.05 wide, 6 high) around it
    const streakGeom = new THREE.PlaneGeometry(0.05, 6.0);
    this.matStreaks = new THREE.MeshBasicMaterial({
      color: 0x4feeff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.streakCount = 24;
    this.instancedStreaks = new THREE.InstancedMesh(streakGeom, this.matStreaks, this.streakCount);
    this.instancedStreaks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i < this.streakCount; i++) {
      const angle = (i / this.streakCount) * Math.PI * 2;
      const r = 4.45 + (Math.random() - 0.5) * 0.2;
      dummy.position.set(Math.cos(angle) * r, 3.0, Math.sin(angle) * r);
      dummy.rotation.set(0, -angle + Math.PI * 0.5, 0);
      dummy.updateMatrix();
      this.instancedStreaks.setMatrixAt(i, dummy.matrix);
    }
    this.instancedStreaks.instanceMatrix.needsUpdate = true;
    this.group.add(this.instancedStreaks);

    this.scene.add(this.group);
    this.dummy = dummy;
  }

  play(origin, camera = null, input = null) {
    if (origin) {
      this.group.position.set(origin.x, origin.y || 0, origin.z);
    }
    this.elapsed = 0;
    this.active = true;
    this.group.visible = true;
    this.controlUnlocked = false;
    this.cameraRef = camera;
    this.inputRef = input;

    // Lock controls for 1.2s
    if (this.inputRef) {
      this.inputRef.isLocked = true;
    }

    if (this.cameraRef) {
      this.originalPitch = this.cameraRef.pitch ?? 0.3;
      // Camera starts slightly lower
      this.cameraRef.pitch = Math.max(-0.05, this.originalPitch - 0.25);
    }

    this.update(0);
  }

  update(dt) {
    if (!this.active) return;

    this.elapsed += dt;
    const t = Math.min(this.duration, this.elapsed);

    // Lock control for 1.2s then release
    if (!this.controlUnlocked && this.elapsed >= 1.2) {
      this.controlUnlocked = true;
      if (this.inputRef) {
        this.inputRef.isLocked = false;
      }
    }

    // Camera smoothly moves up behind party over the 2.0s
    if (this.cameraRef) {
      const camProgress = Math.min(1.0, t / this.duration);
      const easeCam = camProgress * camProgress * (3 - 2 * camProgress);
      const startPitch = Math.max(-0.05, this.originalPitch - 0.25);
      this.cameraRef.pitch = THREE.MathUtils.lerp(startPitch, this.originalPitch, easeCam);
    }

    // Timeline: 0.0 to 0.3s fade in, hold to 1.3s, dissolve 1.3 to 2.0s (0.7s)
    let domeOpacity = 0.0;
    let streakOpacity = 0.0;
    let pixelOpacity = 0.0;
    const isDissolving = t >= 1.3;

    if (t < 0.3) {
      const u = t / 0.3;
      domeOpacity = u * 0.22;
      streakOpacity = u * 0.45;
      pixelOpacity = u * 0.85;
    } else if (t < 1.3) {
      domeOpacity = 0.22;
      streakOpacity = 0.45 + Math.sin(t * 12) * 0.08;
      pixelOpacity = 0.85;
    } else {
      // 0.7s dissolve into rising pixel squares
      const u = (t - 1.3) / 0.7;
      domeOpacity = (1.0 - u) * 0.22;
      streakOpacity = (1.0 - u) * 0.45;
      pixelOpacity = (1.0 - u * u) * 0.85;
    }

    // Two nested shells with different phases
    const phaseOuter = Math.sin(t * 6.0) * 0.04;
    const phaseInner = Math.sin(t * 7.5 + 1.2) * 0.04;
    this.matOuter.opacity = Math.max(0, domeOpacity + phaseOuter * domeOpacity);
    this.matInner.opacity = Math.max(0, domeOpacity * 0.75 + phaseInner * domeOpacity);
    this.matRim.opacity = domeOpacity * 2.5;
    this.matStreaks.opacity = streakOpacity;
    this.matPixels.opacity = pixelOpacity;

    // Animate pixels: falling inside dome and dissolving, then rising on dissolve
    const dummy = this.dummy;
    for (let i = 0; i < this.pixelCount; i++) {
      const idx = i * 7;
      let y = this.pixelData[idx + 1];
      const speed = this.pixelData[idx + 3];
      const x = this.pixelData[idx];
      const z = this.pixelData[idx + 2];

      if (isDissolving) {
        // Dissolve: rise upwards
        y += speed * 3.2 * dt;
      } else {
        // Hold/enter: falling inside dome
        y -= speed * dt;
        if (y < 0.05) y = 3.6 + Math.random() * 0.5;
      }
      this.pixelData[idx + 1] = y;

      dummy.position.set(x, y, z);
      const sc = 0.8 + Math.sin(t * 8 + i) * 0.25;
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      this.instancedPixels.setMatrixAt(i, dummy.matrix);
    }
    this.instancedPixels.instanceMatrix.needsUpdate = true;

    // Check completion
    if (this.elapsed >= this.duration) {
      this.active = false;
      this.group.visible = false;
      if (this.inputRef) {
        this.inputRef.isLocked = false;
      }
    }
  }

  dispose() {
    if (this.scene) {
      this.scene.remove(this.group);
    }
    this.meshOuter.geometry.dispose();
    this.meshInner.geometry.dispose();
    this.meshRim.geometry.dispose();
    this.instancedPixels.geometry.dispose();
    this.instancedStreaks.geometry.dispose();

    this.matOuter.dispose();
    this.matInner.dispose();
    this.matRim.dispose();
    this.matPixels.dispose();
    this.matStreaks.dispose();
  }
}
