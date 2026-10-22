// src/hub/FairyInterventionEffect.js
// Iselle's fight intervention: the separation beam, the healing columns and
// the calming motes.
//
// PROTECTED AREA (src/hub/*): this is a NEW file, so nothing existing is
// modified. It follows the structure of src/hub/PunishmentEffect.js (pre-pooled
// meshes, additive blending, a timed sequence) but is driven by `update(delta)`
// instead of setTimeout, so it pauses with the game.
//
// Zero allocations per frame: every mesh, material and vector is preallocated.

import * as THREE from 'three';
import { EMOTION_CONFIG } from '../data/emotions.config.js';
import { spawnSparks } from '../combat/Combat.js';

// Pre-allocated scratch (module scope, never per frame)
const _mid = new THREE.Vector3();
const _hand = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _sepA = new THREE.Vector3();
const _sepB = new THREE.Vector3();

const STEP_APPROACH = 0;
const STEP_BEAM = 1;
const STEP_HEAL = 2;
const STEP_RELEASE = 3;

export class FairyInterventionEffect {
  constructor(scene) {
    this.scene = scene;
    this.isPlaying = false;
    this.elapsed = 0;
    this.step = STEP_APPROACH;
    this.onComplete = null;
    this.npcA = null;
    this.npcB = null;
    this.iselle = null;
    this.reprimandSpoken = false;
    this.sparksFired = false;
    this.separated = false;

    // 1. Separation beam (origin at the base, scaled along Z to aim).
    const beamGeo = new THREE.CylinderGeometry(0.06, 0.12, 1, 8, 1, true);
    beamGeo.translate(0, 0.5, 0);
    beamGeo.rotateX(Math.PI * 0.5);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x8ef0ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.beam = new THREE.Mesh(beamGeo, beamMat);
    this.beam.visible = false;
    this.scene.add(this.beam);

    // 2. Two healing columns, one per fighter.
    const colGeo = new THREE.CylinderGeometry(0.55, 0.75, 3.2, 14, 1, true);
    colGeo.translate(0, 1.6, 0);
    const colMat = new THREE.MeshBasicMaterial({
      color: 0x7dffb0,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.columnA = new THREE.Mesh(colGeo, colMat);
    this.columnB = new THREE.Mesh(colGeo, colMat.clone());
    this.columnA.visible = false;
    this.columnB.visible = false;
    this.scene.add(this.columnA);
    this.scene.add(this.columnB);

    // 3. Calming motes rising around the fighters.
    this.particleCount = 40;
    const partGeo = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.particleCount * 3);
    this.particleVelocities = new Float32Array(this.particleCount * 3);
    partGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    const partMat = new THREE.PointsMaterial({
      color: 0xbdffe0,
      size: 0.14,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.particles = new THREE.Points(partGeo, partMat);
    this.particles.visible = false;
    this.scene.add(this.particles);
  }

  /**
   * Starts the intervention.
   * @param {object} npcA - the first fighter (HubHeroNPC)
   * @param {object} npcB - the second fighter (HubHeroNPC)
   * @param {object} iselle - the IselleRig
   * @param {object} camera - optional, for screen effects
   * @param {Function} onComplete - called when the sequence finishes
   */
  play(npcA, npcB, iselle, camera = null, onComplete = null) {
    if (this.isPlaying || !npcA || !npcB) return false;
    this.isPlaying = true;
    this.elapsed = 0;
    this.step = STEP_APPROACH;
    this.onComplete = onComplete;
    this.npcA = npcA;
    this.npcB = npcB;
    this.iselle = iselle;
    this.camera = camera;
    this.reprimandSpoken = false;
    this.sparksFired = false;
    this.separated = false;

    // The midpoint between the two fighters.
    _mid.set(
      (npcA.mesh.position.x + npcB.mesh.position.x) * 0.5,
      0,
      (npcA.mesh.position.z + npcB.mesh.position.z) * 0.5
    );
    this.midpoint = _mid.clone();

    // Iselle flies to a raised position next to the fight.
    if (iselle) {
      const angle = Math.atan2(
        iselle.group.position.x - this.midpoint.x,
        iselle.group.position.z - this.midpoint.z
      );
      this.iselleTarget = new THREE.Vector3(
        this.midpoint.x + Math.sin(angle) * 4.5,
        2.4,
        this.midpoint.z + Math.cos(angle) * 4.5
      );
      iselle.overrideTarget = this.iselleTarget;
      if (iselle.setPose) iselle.setPose('fly');
    }

    // The fighters freeze while Iselle is on her way.
    if (npcA.state) npcA.state = 'idle';
    if (npcB.state) npcB.state = 'idle';

    return true;
  }

  /** Advances the timeline. Call every frame. */
  update(delta, time = 0) {
    if (!this.isPlaying) return;
    this.elapsed += delta;

    const cfg = EMOTION_CONFIG;
    const tWalk = cfg.ISELLE_INTERVENE_WALK_DURATION_SEC;
    const tBeam = tWalk + cfg.ISELLE_INTERVENE_BEAM_DURATION_SEC;
    const tHeal = tBeam + cfg.ISELLE_INTERVENE_HEAL_DURATION_SEC;
    const tEnd = tHeal + cfg.ISELLE_INTERVENE_RELEASE_DELAY_SEC;

    // --- Step 1: Iselle flies in -----------------------------------------
    if (this.elapsed < tWalk) {
      this.step = STEP_APPROACH;
      this.beam.visible = false;
      this.columnA.visible = false;
      this.columnB.visible = false;
      this.particles.visible = false;
      return;
    }

    // --- Step 2: the separation beam --------------------------------------
    if (this.elapsed < tBeam) {
      if (this.step !== STEP_BEAM) {
        this.step = STEP_BEAM;
        this.beam.visible = true;
      }
      this.beam.material.opacity = 0.9;

      if (this.iselle) {
        this.iselle.getHeadWorldPosition
          ? this.iselle.getHeadWorldPosition(_hand)
          : _hand.copy(this.iselle.group.position);
      }
      _dir.subVectors(this.midpoint, _hand);
      const len = _dir.length() || 1;
      _dir.normalize();
      this.beam.position.copy(_hand);
      this.beam.lookAt(this.midpoint);
      this.beam.scale.set(1, 1, len);

      if (!this.sparksFired) {
        this.sparksFired = true;
        spawnSparks(
          this.scene,
          new THREE.Vector3(this.midpoint.x, 1.2, this.midpoint.z),
          0x8ef0ff,
          14
        );
      }

      // Push the fighters apart.
      this.separateFighters();
      return;
    }

    // --- Step 3: heal and reprimand --------------------------------------
    if (this.elapsed < tHeal) {
      if (this.step !== STEP_HEAL) {
        this.step = STEP_HEAL;
        this.columnA.visible = true;
        this.columnB.visible = true;
        this.particles.visible = true;
        this.resetParticles();
      }
      const fade = Math.min(1, (this.elapsed - tBeam) / 0.25);
      this.columnA.material.opacity = 0.45 * fade;
      this.columnB.material.opacity = 0.45 * fade;
      this.particles.material.opacity = 0.85 * fade;
      this.beam.material.opacity = Math.max(0, 0.9 - (this.elapsed - tBeam) * 3);

      this.columnA.position.set(this.npcA.mesh.position.x, this.npcA.mesh.position.y, this.npcA.mesh.position.z);
      this.columnB.position.set(this.npcB.mesh.position.x, this.npcB.mesh.position.y, this.npcB.mesh.position.z);
      this.updateParticles(delta);

      // The reprimand lands halfway through the healing.
      if (!this.reprimandSpoken && this.elapsed >= tBeam + cfg.ISELLE_LAW_REPRIMAND_DELAY) {
        this.reprimandSpoken = true;
        if (this.iselle && this.iselle.say) {
          this.iselle.say('lawReprimand', { force: true });
        }
      }
      return;
    }

    // --- Step 4: release ---------------------------------------------------
    if (this.step !== STEP_RELEASE) {
      this.step = STEP_RELEASE;
      this.beam.visible = false;
    }
    const releaseFade = Math.max(0, 1 - (this.elapsed - tHeal) / cfg.ISELLE_INTERVENE_RELEASE_DELAY_SEC);
    this.columnA.material.opacity = 0.45 * releaseFade;
    this.columnB.material.opacity = 0.45 * releaseFade;
    this.particles.material.opacity = 0.85 * releaseFade;
    this.updateParticles(delta);

    if (this.elapsed >= tEnd) {
      this.endEffect();
    }
  }

  /** Pushes the two fighters apart to the separation distance. */
  separateFighters() {
    if (this.separated || !this.npcA || !this.npcB) return;
    this.separated = true;
    const dist = EMOTION_CONFIG.ISELLE_SEPARATION_DISTANCE;
    _sepA.subVectors(this.npcA.mesh.position, this.npcB.mesh.position);
    if (_sepA.lengthSq() < 0.0001) _sepA.set(1, 0, 0);
    _sepA.normalize();
    _sepB.copy(_sepA).multiplyScalar(-1);
    if (this.npcA.setDestination) {
      this.npcA.setDestination(
        this.midpoint.x + _sepA.x * dist,
        this.midpoint.z + _sepA.z * dist,
        null
      );
    }
    if (this.npcB.setDestination) {
      this.npcB.setDestination(
        this.midpoint.x + _sepB.x * dist,
        this.midpoint.z + _sepB.z * dist,
        null
      );
    }
  }

  /** Scatters the calming motes around the midpoint. */
  resetParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const angle = (i / this.particleCount) * Math.PI * 2;
      const radius = 0.6 + (i % 5) * 0.28;
      this.particlePositions[i3] = this.midpoint.x + Math.cos(angle) * radius;
      this.particlePositions[i3 + 1] = 0.2 + (i % 4) * 0.25;
      this.particlePositions[i3 + 2] = this.midpoint.z + Math.sin(angle) * radius;
      this.particleVelocities[i3] = Math.cos(angle) * 0.12;
      this.particleVelocities[i3 + 1] = 0.7 + (i % 7) * 0.14;
      this.particleVelocities[i3 + 2] = Math.sin(angle) * 0.12;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  updateParticles(delta) {
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      this.particlePositions[i3] += this.particleVelocities[i3] * delta;
      this.particlePositions[i3 + 1] += this.particleVelocities[i3 + 1] * delta;
      this.particlePositions[i3 + 2] += this.particleVelocities[i3 + 2] * delta;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  /** True while the sequence is running. */
  isActive() {
    return this.isPlaying;
  }

  /** Stops the sequence and releases the fighters. */
  endEffect() {
    this.isPlaying = false;
    this.beam.visible = false;
    this.columnA.visible = false;
    this.columnB.visible = false;
    this.particles.visible = false;
    this.beam.material.opacity = 0;
    this.columnA.material.opacity = 0;
    this.columnB.material.opacity = 0;
    this.particles.material.opacity = 0;
    this.npcA = null;
    this.npcB = null;
    this.iselle = null;
    if (this.onComplete) {
      const cb = this.onComplete;
      this.onComplete = null;
      cb();
    }
  }

  dispose() {
    this.endEffect();
    this.scene.remove(this.beam);
    this.scene.remove(this.columnA);
    this.scene.remove(this.columnB);
    this.scene.remove(this.particles);
    this.beam.geometry.dispose();
    this.beam.material.dispose();
    this.columnA.geometry.dispose();
    this.columnA.material.dispose();
    this.columnB.material.dispose();
    this.particles.geometry.dispose();
    this.particles.material.dispose();
  }
}
