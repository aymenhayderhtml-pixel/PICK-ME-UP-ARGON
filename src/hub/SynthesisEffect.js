import * as THREE from 'three';

export class SynthesisEffect {
  constructor(hubScene) {
    this.hub = hubScene;
    this.isPlaying = false;
    this.timer = 0;
    this.duration = 2.0;
    this.onComplete = null;

    // Center of the Synthesis Room ritual circle in world coords
    this.circleCenter = new THREE.Vector3(-15, 0, -10.5);
    this.basePos = new THREE.Vector3(-15, 0, -8.0);

    this.group = new THREE.Group();
    this.hub.scene.add(this.group);

    this.materialMeshes = [];
    this.particles = [];
  }

  play(baseHero, materials, onComplete) {
    this.isPlaying = true;
    this.timer = 0;
    this.onComplete = onComplete;
    this.group.clear();
    this.materialMeshes = [];
    this.particles = [];

    // 1. Create Base Hero representative mesh
    const baseMat = new THREE.MeshStandardMaterial({
      color: baseHero.armor || 0x224488,
      emissive: 0x330000,
    });
    this.baseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.5), baseMat);
    this.baseMesh.position.copy(this.basePos);
    this.baseMesh.position.y = 0.7;
    this.group.add(this.baseMesh);

    // 2. Create Material representations on the ritual circle
    const count = materials.length;
    materials.forEach((matHero, idx) => {
      const angle = (idx / Math.max(1, count)) * Math.PI * 2;
      const r = 1.3;
      const x = this.circleCenter.x + Math.cos(angle) * r;
      const z = this.circleCenter.z + Math.sin(angle) * r;

      const mMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.1, 0.4),
        new THREE.MeshStandardMaterial({
          color: matHero.armor || 0x664422,
          transparent: true,
          opacity: 1,
        })
      );
      mMesh.position.set(x, 0.55, z);
      this.group.add(mMesh);
      this.materialMeshes.push(mMesh);
    });

    // 3. Create 100 glowing red dissolving particles
    const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    for (let i = 0; i < 100; i++) {
      const pMat = new THREE.MeshBasicMaterial({
        color: 0xff1122,
        transparent: true,
        opacity: 0.9,
      });
      const p = new THREE.Mesh(pGeo, pMat);
      // Spawn near circle
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 1.5;
      const startPos = new THREE.Vector3(
        this.circleCenter.x + Math.cos(angle) * dist,
        0.2 + Math.random() * 0.8,
        this.circleCenter.z + Math.sin(angle) * dist
      );
      p.position.copy(startPos);
      this.group.add(p);

      this.particles.push({
        mesh: p,
        startPos: startPos.clone(),
        delay: Math.random() * 0.6,
        speed: 1.5 + Math.random() * 1.5,
      });
    }

    // 4. Red Point Light
    this.pulseLight = new THREE.PointLight(0xff0022, 10, 15);
    this.pulseLight.position.set(this.circleCenter.x, 2, this.circleCenter.z);
    this.group.add(this.pulseLight);
  }

  update(delta, time) {
    if (!this.isPlaying) return;

    this.timer += delta;
    const progress = Math.min(1, this.timer / this.duration);

    // Camera view of the ritual circle
    const targetCam = new THREE.Vector3(this.circleCenter.x, 4.0, this.circleCenter.z + 5.5);
    this.hub.camera.position.lerp(targetCam, Math.min(1, 4 * delta));
    this.hub.camera.lookAt(this.circleCenter.x, 1.0, this.circleCenter.z);

    // Fade & dissolve materials
    for (const m of this.materialMeshes) {
      const dissolve = Math.max(0, 1 - progress * 1.4);
      m.scale.set(dissolve, dissolve, dissolve);
      m.material.opacity = dissolve;
    }

    // Fly particles toward base hero
    for (const p of this.particles) {
      const t = Math.max(0, (this.timer - p.delay) / (this.duration - p.delay));
      if (t > 0) {
        // Curve trajectory toward base hero
        p.mesh.position.lerpVectors(p.startPos, this.basePos, Math.min(1, t * p.speed));
        p.mesh.position.y += Math.sin(t * Math.PI) * 1.2;
        p.mesh.rotation.x += delta * 6;
        p.mesh.rotation.y += delta * 8;
      }
    }

    // Base hero absorbs light pulse
    if (this.baseMesh) {
      const pulse = 1 + Math.sin(progress * Math.PI * 4) * 0.15;
      this.baseMesh.scale.set(pulse, pulse, pulse);
      if (progress > 0.8) {
        this.baseMesh.material.emissive.setHex(0xff3344);
        this.baseMesh.material.emissiveIntensity = 2.0;
      }
    }

    if (this.timer >= this.duration) {
      this.endEffect();
    }
  }

  endEffect() {
    this.isPlaying = false;
    this.group.clear();
    this.materialMeshes = [];
    this.particles = [];
    if (this.onComplete) {
      const cb = this.onComplete;
      this.onComplete = null;
      cb();
    }
  }
}
