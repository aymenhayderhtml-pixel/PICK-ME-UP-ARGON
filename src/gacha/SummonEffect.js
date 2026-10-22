import * as THREE from 'three';
import { getRarityColor, getRarityHexString } from '../data/rules.js';
import { pickLine } from '../data/iselle.js';
import { showSystemMessage } from '../ui/Hud.js';
import { queueHeroWalkoutNotice } from '../ui/Notices.js';
import { createLabelSprite } from '../ui/Label.js';
import { HubHeroNPC } from '../hub/HubHeroes.js';
import { getAudioContext, getMasterVolume, isAudioMuted } from '../core/AudioManager.js';

function createTextSprite(text, isSign = false) {
  return createLabelSprite({ text, isSign });
}

// Global Master Sound Switch (Key M toggles mute, Master volume 0.3)
if (typeof window !== 'undefined') {
  if (!window.__audioMaster) {
    window.__audioMaster = { isMuted: false, masterVolume: 0.3 };
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        window.__audioMaster.isMuted = !window.__audioMaster.isMuted;
        showSystemMessage(window.__audioMaster.isMuted ? '[AUDIO MUTED]' : '[AUDIO UNMUTED]');
      }
    });
  }
}

export class SummonEffect {
  constructor(hubScene) {
    this.hub = hubScene;
    this.isPlaying = false; // Never locks player control
    this.toastContainer = null;
    this.activeVFX = [];
  }

  playDoorClick() {
    if (typeof window === 'undefined') return;
    if (isAudioMuted()) return;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.04);

      // Very soft short 'door open' click at 20% volume
      const masterVol = getMasterVolume();
      const vol = 0.2 * masterVol;

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      // Audio error ignored
    }
  }

  play(heroes) {
    if (!heroes || heroes.length === 0) return;

    // 1. Immediately close the summon window
    if (this.hub.summonWindow) {
      this.hub.summonWindow.close();
    }

    // 2. Non-blocking status notices queue for walkouts
    queueHeroWalkoutNotice(heroes);

    // 3. Gentle cyan light pulse at the door for 1 second (no fullscreen flash)
    this.pulseDoorLight();

    // 4. One quiet door click sound
    this.playDoorClick();

    // 5. Heroes walk out one by one (1.2s delay for 10-pulls)
    const isMulti = heroes.length > 1;
    const bestStar = Math.max(...heroes.map((h) => h.star || 1));
    const walkoutDuration = 1.0 + (heroes.length - 1) * (isMulti ? 1.2 : 0) + 1.2;

    if (this.hub.iselle) {
      // Iselle plays summon at Summoning Room door for duration of walkout
      this.hub.iselle.overrideTarget = new THREE.Vector3(0, 3.2, 2.4);
      this.hub.iselle.setPose('summon');
      setTimeout(() => {
        if (this.hub.iselle) {
          this.hub.iselle.say(bestStar >= 3 ? 'summonGood' : 'summonBad', { force: true });
          setTimeout(() => {
            if (this.hub.iselle) this.hub.iselle.overrideTarget = null;
          }, 3500);
        }
      }, walkoutDuration * 1000);
    }

    heroes.forEach((hero, idx) => {
      const delay = 1.0 + idx * (isMulti ? 1.2 : 0);
      setTimeout(() => {
        this.spawnWalkingHero(hero, idx === 0);
      }, delay * 1000);
    });
  }

  pulseDoorLight() {
    const doorMat = this.hub.buildings?.summoningDoorMat;
    if (!doorMat) return;

    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 0.05;
      const progress = elapsed / 1.0;
      if (progress >= 1.0) {
        doorMat.emissiveIntensity = 0.85;
        clearInterval(interval);
      } else {
        // Soft pulse up and down
        doorMat.emissiveIntensity = 0.85 + Math.sin(progress * Math.PI) * 0.9;
      }
    }, 50);
  }

  showToast(heroes) {
    if (typeof document === 'undefined') return;

    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'summon-toast-container';
      this.toastContainer.style.position = 'fixed';
      this.toastContainer.style.top = '16px';
      this.toastContainer.style.right = '16px';
      this.toastContainer.style.zIndex = '9998';
      this.toastContainer.style.display = 'flex';
      this.toastContainer.style.flexDirection = 'column';
      this.toastContainer.style.gap = '6px';
      this.toastContainer.style.pointerEvents = 'none';
      document.body.appendChild(this.toastContainer);
    }

    heroes.forEach((h) => {
      const row = document.createElement('div');
      row.style.backgroundColor = 'rgba(10, 20, 35, 0.85)';
      row.style.border = '1px solid rgba(0, 229, 255, 0.35)';
      row.style.boxShadow = '0 0 10px rgba(0, 229, 255, 0.2)';
      row.style.borderRadius = '5px';
      row.style.padding = '6px 14px';
      row.style.fontFamily = 'monospace, sans-serif';
      row.style.fontSize = '13px';
      row.style.color = '#ffffff';
      row.style.transition = 'opacity 0.6s ease, transform 0.3s ease';

      const starColor = getRarityHexString(h.star);
      row.innerHTML = `${h.name} <span style="color:${starColor}; font-weight:bold;">★${h.star}</span>`;
      this.toastContainer.appendChild(row);

      setTimeout(() => {
        row.style.opacity = '0';
        row.style.transform = 'translateX(20px)';
        setTimeout(() => row.remove(), 600);
      }, 6000);
    });
  }

  spawnWalkingHero(heroData, isFirst) {
    if (!this.hub || !this.hub.scene) return;

    const getWalkY = (x, z) => (this.hub.getWalkY ? this.hub.getWalkY(x, z) : this.hub.getGroundY(x, z));
    const npc = new HubHeroNPC(
      heroData,
      this.hub.scene,
      (obj) => this.hub.heroesManager?.handleRuleBreak(obj),
      getWalkY,
      this.hub.navGrid,
      true // isNewSummon = true triggers startArrivalBehavior down stairs to Landing Area
    );

    if (this.hub.heroesManager && this.hub.heroesManager.spawnedHeroes) {
      this.hub.heroesManager.spawnedHeroes.push(npc);
    }

    // Small colored ring on the ground under each new hero (color of star) for 4s
    const ringRadius = heroData.star >= 4 ? 1.4 : 0.85;
    const ringGeo = new THREE.TorusGeometry(ringRadius, 0.04, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: getRarityColor(heroData.star),
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.set(0, 0.04, 0.1);
    this.hub.scene.add(ringMesh);

    // Follow the hero for 4 seconds, then remove
    let ringTimer = 4.0;
    const ringFollow = {
      mesh: ringMesh,
      mat: ringMat,
      update: (dt) => {
        ringTimer -= dt;
        if (npc && npc.mesh) {
          ringMesh.position.x = npc.mesh.position.x;
          ringMesh.position.z = npc.mesh.position.z;
          ringMesh.position.y = getWalkY(npc.mesh.position.x, npc.mesh.position.z) + 0.04;
        }
        if (ringTimer <= 1.0) {
          ringMat.opacity = Math.max(0, ringTimer);
        }
        if (ringTimer <= 0) {
          this.hub.scene.remove(ringMesh);
          ringGeo.dispose();
          ringMat.dispose();
          return false;
        }
        return true;
      },
    };
    this.activeVFX.push(ringFollow);

    // For 4 star or higher: soft golden light column (low opacity, 0.15) rises for 2 seconds
    if (heroData.star >= 4) {
      const colGeo = new THREE.CylinderGeometry(1.2, 1.2, 7, 24);
      const colMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const colMesh = new THREE.Mesh(colGeo, colMat);
      colMesh.position.set(0, 3.5, 0.1);
      this.hub.scene.add(colMesh);

      let colTimer = 2.0;
      const colFollow = {
        mesh: colMesh,
        mat: colMat,
        update: (dt) => {
          colTimer -= dt;
          if (npc && npc.mesh) {
            colMesh.position.x = npc.mesh.position.x;
            colMesh.position.z = npc.mesh.position.z;
            colMesh.position.y = getWalkY(npc.mesh.position.x, npc.mesh.position.z) + 3.5;
          }
          if (colTimer <= 0.8) {
            colMat.opacity = Math.max(0, (colTimer / 0.8) * 0.15);
          }
          if (colTimer <= 0) {
            this.hub.scene.remove(colMesh);
            colGeo.dispose();
            colMat.dispose();
            return false;
          }
          return true;
        },
      };
      this.activeVFX.push(colFollow);
    }

    // Floating label 'Name ★N' for 6 seconds
    const labelSprite = createTextSprite(`${heroData.name} ★${heroData.star}`);
    labelSprite.scale.set(3.4, 0.85, 1);
    labelSprite.position.set(0, 2.3, 0);
    npc.mesh.add(labelSprite);

    setTimeout(() => {
      if (labelSprite.parent) labelSprite.parent.remove(labelSprite);
    }, 6000);
  }

  update(delta) {
    // Tick active ground rings and light columns
    for (let i = this.activeVFX.length - 1; i >= 0; i--) {
      const alive = this.activeVFX[i].update(delta);
      if (!alive) {
        this.activeVFX.splice(i, 1);
      }
    }
  }

  endEffect() {
    this.isPlaying = false;
  }
}
