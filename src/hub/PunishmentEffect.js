// src/hub/PunishmentEffect.js - Cinematic Divine Punishment Execution Sequence
import * as THREE from 'three';
import { showHeroDeathNotice } from '../ui/Notices.js';
import { pickLine } from '../data/iselle.js';

export class PunishmentEffect {
  constructor(scene) {
    this.scene = scene;
    this.isPlaying = false;

    // 1. Pre-pooled Strike Beam (handR -> Hero)
    const beamGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
    beamGeo.translate(0, 0.5, 0); // Origin at base for easy scaling/aiming
    beamGeo.rotateX(Math.PI * 0.5);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xedd6ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.beam = new THREE.Mesh(beamGeo, beamMat);
    this.beam.visible = false;
    this.scene.add(this.beam);

    // 2. Pre-pooled Vertical Column of Light (radius 0.5, height 12)
    const colGeo = new THREE.CylinderGeometry(0.5, 0.5, 12, 16);
    colGeo.translate(0, 6, 0);
    const colMat = new THREE.MeshBasicMaterial({
      color: 0xd8b4fe,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.column = new THREE.Mesh(colGeo, colMat);
    this.column.visible = false;
    this.scene.add(this.column);

    // 3. Pre-pooled 40 Dissolve Light Particles
    this.particleCount = 40;
    const partGeo = new THREE.BufferGeometry();
    const posArr = new Float32Array(this.particleCount * 3);
    this.particleVelocities = new Float32Array(this.particleCount * 3);
    partGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));

    const partMat = new THREE.PointsMaterial({
      color: 0xe9d5ff,
      size: 0.16,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.particles = new THREE.Points(partGeo, partMat);
    this.particles.visible = false;
    this.scene.add(this.particles);

    // 4. White Screen Flash Overlay (opacity 0.25 max)
    this.flashEl = document.getElementById('punishment-flash-overlay');
    if (!this.flashEl && typeof document !== 'undefined') {
      this.flashEl = document.createElement('div');
      this.flashEl.id = 'punishment-flash-overlay';
      this.flashEl.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: #ffffff;
        opacity: 0;
        pointer-events: none;
        z-index: 10099;
        transition: opacity 0.05s ease-out;
      `;
      document.body.appendChild(this.flashEl);
    }
  }

  play(npc, iselle, camera, onComplete = null) {
    if (this.isPlaying || !npc) return;
    this.isPlaying = true;

    const heroPos = npc.mesh.position.clone();
    const heroTargetPos = heroPos.clone().add(new THREE.Vector3(0, 0.7, 0));

    // (a) Iselle flies to 5 units from hero in 1.2s with 'fly', turns to face hero
    if (iselle) {
      const approachAngle = Math.atan2(iselle.group.position.x - heroPos.x, iselle.group.position.z - heroPos.z);
      const targetFlyPos = new THREE.Vector3(
        heroPos.x + Math.sin(approachAngle) * 4.5,
        2.4,
        heroPos.z + Math.cos(approachAngle) * 4.5
      );
      iselle.overrideTarget = targetFlyPos;
      iselle.setPose('fly');
    }

    // Step sequence timestamps
    setTimeout(() => {
      // (b) At 1.2s: 'scold' pose with 'stern' expression for 1.0s while line plays
      if (iselle) {
        // Face the hero directly
        const dx = heroPos.x - iselle.group.position.x;
        const dz = heroPos.z - iselle.group.position.z;
        iselle.group.rotation.y = Math.atan2(dx, dz);
        iselle.say('punish', { force: true, text: pickLine('punish') });
        iselle.setPose('scold');
        iselle.setExpression('stern');
      }

      setTimeout(() => {
        // (c) At 2.2s: 'punish' pose (duration 1.2s)
        if (iselle) {
          iselle.setPose('punish');
        }

        // Snap point at t = 0.7s of punish pose (2.2s + 0.7s = 2.9s)
        setTimeout(() => {
          this.fireStrike(heroPos, heroTargetPos, iselle, camera);

          // (d) Notices appear at the moment particles start
          showHeroDeathNotice(npc.heroData, 'Punished for breaking the rules');

          // Dissolve 40 light particles rising over 1.2s while hero fades
          this.spawnDissolveParticles(heroPos, npc);

          setTimeout(() => {
            // (e) At 4.1s: Iselle plays 'bow' with 'cheerful', returns to loop
            if (iselle) {
              iselle.setExpression('cheerful');
              iselle.playOnce('bow');
              setTimeout(() => {
                if (iselle) iselle.overrideTarget = null;
              }, 1000);
            }

            this.isPlaying = false;
            if (onComplete) onComplete();
          }, 1200);

        }, 700);

      }, 1000);

    }, 1200);
  }

  fireStrike(heroPos, heroTargetPos, iselle, camera) {
    // 1. Aim beam from model.anchors.handR to hero
    const handWorldPos = new THREE.Vector3();
    const handAnchor = iselle?.model?.anchors?.handR || iselle?.group;
    if (handAnchor) {
      handAnchor.getWorldPosition(handWorldPos);
    } else {
      handWorldPos.copy(heroTargetPos).add(new THREE.Vector3(0, 5, 0));
    }

    const dist = handWorldPos.distanceTo(heroTargetPos);
    this.beam.position.copy(handWorldPos);
    this.beam.lookAt(heroTargetPos);
    this.beam.scale.set(1, 1, dist);
    this.beam.visible = true;

    // 2. Light Column at hero position
    this.column.position.set(heroPos.x, heroPos.y, heroPos.z);
    this.column.material.opacity = 0.5;
    this.column.visible = true;

    // 3. Screen flash (0.25 opacity for 0.15s)
    if (this.flashEl) {
      this.flashEl.style.opacity = '0.25';
      setTimeout(() => {
        if (this.flashEl) this.flashEl.style.opacity = '0';
      }, 150);
    }

    // 4. Camera Shake (amplitude 0.06 for 0.3s)
    if (camera) {
      this.triggerCameraShake(camera, 0.06, 0.3);
    }

    // Sound Zap
    try {
      if (typeof window !== 'undefined' && !window.__audioMaster?.isMuted) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = window.__tinkAudioCtx || new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.45);
          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.45);
        }
      }
    } catch (e) {}

    // Fade light column and beam over 0.5s
    let colTimer = 0;
    const fadeInterval = setInterval(() => {
      colTimer += 0.05;
      const progress = Math.min(1, colTimer / 0.5);
      this.column.material.opacity = 0.5 * (1 - progress);
      this.beam.material.opacity = 0.95 * (1 - progress);
      if (progress >= 1) {
        clearInterval(fadeInterval);
        this.column.visible = false;
        this.beam.visible = false;
      }
    }, 50);
  }

  triggerCameraShake(camera, amplitude = 0.06, duration = 0.3) {
    const originalPos = camera.position.clone();
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 0.03;
      if (elapsed >= duration) {
        clearInterval(interval);
        return;
      }
      const decay = 1 - (elapsed / duration);
      camera.position.x += (Math.random() - 0.5) * amplitude * 2 * decay;
      camera.position.y += (Math.random() - 0.5) * amplitude * 2 * decay;
    }, 30);
  }

  spawnDissolveParticles(heroPos, npc) {
    const pPos = this.particles.geometry.attributes.position.array;
    for (let i = 0; i < this.particleCount; i++) {
      pPos[i * 3]     = heroPos.x + (Math.random() - 0.5) * 0.8;
      pPos[i * 3 + 1] = heroPos.y + Math.random() * 1.5;
      pPos[i * 3 + 2] = heroPos.z + (Math.random() - 0.5) * 0.8;

      this.particleVelocities[i * 3]     = (Math.random() - 0.5) * 0.4;
      this.particleVelocities[i * 3 + 1] = 0.8 + Math.random() * 1.2; // Rise upward
      this.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.visible = true;
    this.particles.material.opacity = 0.95;

    let dissolveTime = 0;
    const interval = setInterval(() => {
      dissolveTime += 0.05;
      const p = Math.min(1, dissolveTime / 1.2);

      // Fade out hero model
      if (npc.heroRig && typeof npc.heroRig.setOpacity === 'function') {
        npc.heroRig.setOpacity(Math.max(0, 1 - p));
      } else if (npc.mesh) {
        npc.mesh.traverse((c) => {
          if (c.isMesh && c.material) {
            c.material.transparent = true;
            c.material.opacity = Math.max(0, 1 - p);
          }
        });
      }

      // Rise particles
      const pos = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < this.particleCount; i++) {
        pos[i * 3]     += this.particleVelocities[i * 3] * 0.05;
        pos[i * 3 + 1] += this.particleVelocities[i * 3 + 1] * 0.05;
        pos[i * 3 + 2] += this.particleVelocities[i * 3 + 2] * 0.05;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
      this.particles.material.opacity = Math.max(0, 0.95 * (1 - p));

      if (p >= 1) {
        clearInterval(interval);
        this.particles.visible = false;
      }
    }, 50);
  }

  dispose() {
    this.scene.remove(this.beam);
    this.scene.remove(this.column);
    this.scene.remove(this.particles);
    this.beam.geometry.dispose();
    this.beam.material.dispose();
    this.column.geometry.dispose();
    this.column.material.dispose();
    this.particles.geometry.dispose();
    this.particles.material.dispose();
    if (this.flashEl && this.flashEl.parentNode) {
      this.flashEl.parentNode.removeChild(this.flashEl);
    }
  }
}
