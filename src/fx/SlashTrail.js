// src/fx/SlashTrail.js
import * as THREE from 'three';

const GRADE_TRAIL_COLORS = {
  'E': 0xb0b0b0,
  'D': 0xb8d8c0,
  'C': 0xcfe6ff,
  'B': 0xd7b8ff,
  'A': 0xffe08a,
  'S': 0xff6a78,
  'S+': 0xffffff
};

const MAX_SAMPLES = 8;
const MAX_GLOBAL_ACTIVE_TRAILS = 8;

export class SlashTrail {
  static activeTrailsCount = 0;

  constructor(scene, weaponModel = null, colorHex = 0xffe08a) {
    this.scene = scene;
    this.weaponModel = weaponModel;
    this.baseColor = new THREE.Color(colorHex);
    this.isSPlus = false;

    this.active = false;
    this.samples = []; // array of { base: Vector3, tip: Vector3, time: number }
    this.elapsed = 0;

    // Buffer geometry: 8 samples * 2 vertices = 16 vertices
    const vertexCount = MAX_SAMPLES * 2;
    this.positions = new Float32Array(vertexCount * 3);
    this.colors = new Float32Array(vertexCount * 3);

    const indices = [];
    for (let i = 0; i < MAX_SAMPLES - 1; i++) {
      const b0 = i * 2;
      const t0 = i * 2 + 1;
      const b1 = (i + 1) * 2;
      const t1 = (i + 1) * 2 + 1;
      indices.push(b0, t0, b1);
      indices.push(t0, t1, b1);
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setIndex(indices);

    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'slash_trail';
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;

    if (this.scene) {
      this.scene.add(this.mesh);
    }

    this.vBaseWorld = new THREE.Vector3();
    this.vTipWorld = new THREE.Vector3();
  }

  setWeaponModel(model, grade = 'E') {
    this.weaponModel = model;
    this.isSPlus = grade === 'S+';
    const hex = GRADE_TRAIL_COLORS[grade] || 0xb0b0b0;
    this.baseColor.setHex(hex);
  }

  setColor(hex) {
    this.baseColor.set(hex);
  }

  start() {
    if (this.active) return;
    if (SlashTrail.activeTrailsCount >= MAX_GLOBAL_ACTIVE_TRAILS) return;

    this.active = true;
    SlashTrail.activeTrailsCount++;
    this.samples = [];
    this.mesh.visible = true;
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    SlashTrail.activeTrailsCount = Math.max(0, SlashTrail.activeTrailsCount - 1);
    this.samples = [];
    this.mesh.visible = false;
  }

  update(dt, camera = null, rigPosition = null) {
    if (!this.active) return;

    if (camera && rigPosition) {
      const dist = camera.position.distanceTo(rigPosition);
      if (dist > 40) {
        this.mesh.visible = false;
        return;
      }
    }

    if (!this.weaponModel || !this.weaponModel.anchors) {
      this.stop();
      return;
    }

    this.elapsed += dt;
    this.mesh.visible = true;

    // Sample current world positions of edgeBase and edgeTip
    const { edgeBase, edgeTip, tip, hit } = this.weaponModel.anchors;
    const aBase = edgeBase || hit;
    const aTip = edgeTip || tip;

    if (!aBase || !aTip) {
      this.stop();
      return;
    }

    aBase.getWorldPosition(this.vBaseWorld);
    aTip.getWorldPosition(this.vTipWorld);

    // Push new sample to beginning
    this.samples.unshift({
      base: this.vBaseWorld.clone(),
      tip: this.vTipWorld.clone()
    });

    if (this.samples.length > MAX_SAMPLES) {
      this.samples.pop();
    }

    // Color computation
    let currentColor = this.baseColor;
    if (this.isSPlus) {
      const hue = (this.elapsed * 0.4) % 1.0;
      currentColor = new THREE.Color().setHSL(hue, 0.8, 0.85);
    }

    // Fill buffer attributes
    const pos = this.geometry.attributes.position.array;
    const col = this.geometry.attributes.color.array;

    const sampleCount = this.samples.length;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      const s = i < sampleCount ? this.samples[i] : (sampleCount > 0 ? this.samples[sampleCount - 1] : { base: this.vBaseWorld, tip: this.vTipWorld });
      const alpha = Math.max(0, 1.0 - i / (MAX_SAMPLES - 1));

      // Base vertex
      const idxB = i * 2;
      pos[idxB * 3 + 0] = s.base.x;
      pos[idxB * 3 + 1] = s.base.y;
      pos[idxB * 3 + 2] = s.base.z;

      col[idxB * 3 + 0] = currentColor.r * alpha;
      col[idxB * 3 + 1] = currentColor.g * alpha;
      col[idxB * 3 + 2] = currentColor.b * alpha;

      // Tip vertex
      const idxT = i * 2 + 1;
      pos[idxT * 3 + 0] = s.tip.x;
      pos[idxT * 3 + 1] = s.tip.y;
      pos[idxT * 3 + 2] = s.tip.z;

      col[idxT * 3 + 0] = currentColor.r * alpha;
      col[idxT * 3 + 1] = currentColor.g * alpha;
      col[idxT * 3 + 2] = currentColor.b * alpha;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  dispose() {
    this.stop();
    if (this.scene && this.mesh) {
      this.scene.remove(this.mesh);
    }
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
  }
}

export function getActiveTrailsCount() {
  return SlashTrail.activeTrailsCount;
}

