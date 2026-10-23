// CombatMixin.js — Aiming raycasts, squad commands, Han shout/death handling, boss overlay, and rewards
// Extracted from src/scenes/TowerScene.js
import * as THREE from 'three';
import { showSystemMessage } from '../../ui/Hud.js';
import { gameState } from '../../core/GameState.js';

let _towerAimPlane = null;
let _towerRaycaster = null;
let _towerAimTarget = null;
let _towerCamFwd = null;

export const CombatMixin = (Base) => class extends Base {
  toggleAutoMode() {
    this.isAutoMode = !this.isAutoMode;
    if (this.hud) {
      this.hud.setAuto(this.isAutoMode);
    }
    showSystemMessage(this.isAutoMode ? '[AUTO Mode: ON]' : '[AUTO Mode: OFF]');
  }
  getAimGroundPosition() {
    if (!_towerAimPlane) {
      _towerAimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      _towerRaycaster = new THREE.Raycaster();
      _towerAimTarget = new THREE.Vector3();
      _towerCamFwd = new THREE.Vector3();
    }
    _towerRaycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const hit = _towerRaycaster.ray.intersectPlane(_towerAimPlane, _towerAimTarget);
    if (hit) return _towerAimTarget;
    this.camera.getWorldDirection(_towerCamFwd);
    _towerAimTarget.copy(this.player.mesh.position).addScaledVector(_towerCamFwd, 15);
    return _towerAimTarget;
  }
  handleCommandSelect(cmd) {
    if (!cmd) return;
    let target = null;
    if (cmd.id === 'ATTACK_TARGET') {
      target = this.getClosestEnemyToCrosshair();
    }
    this.squadAI.setCommand(cmd, target);
    showSystemMessage(`[Command: ${cmd.label}]`);
  }
  getClosestEnemyToCrosshair() {
    let best = null;
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    for (const en of this.enemyManager.enemies) {
      if (en.dead || en.isDying) continue;
      const toEn = en.mesh.position.clone().sub(this.player.mesh.position).normalize();
      const dot = camDir.dot(toEn);
      if (dot > 0.65 && (!best || dot > best.dot)) {
        best = { enemy: en, dot };
      }
    }
    return best ? best.enemy : null;
  }
  showHanShout(text) {
    if (!this.hanShoutEl) {
      this.hanShoutEl = document.createElement('div');
      this.hanShoutEl.id = 'han-shout-bubble';
      this.hanShoutEl.style.position = 'fixed';
      this.hanShoutEl.style.backgroundColor = 'rgba(0, 229, 255, 0.25)';
      this.hanShoutEl.style.border = '2px solid #00ffff';
      this.hanShoutEl.style.boxShadow = '0 0 16px rgba(0, 255, 255, 0.6)';
      this.hanShoutEl.style.borderRadius = '8px';
      this.hanShoutEl.style.padding = '6px 16px';
      this.hanShoutEl.style.color = '#00ffff';
      this.hanShoutEl.style.fontFamily = 'monospace, sans-serif';
      this.hanShoutEl.style.fontSize = '14px';
      this.hanShoutEl.style.fontWeight = 'bold';
      this.hanShoutEl.style.pointerEvents = 'none';
      this.hanShoutEl.style.zIndex = '10002';
      this.hanShoutEl.style.display = 'none';
      document.body.appendChild(this.hanShoutEl);
    }

    this.hanShoutEl.textContent = `🗣️ Han: "${text}"`;
    this.hanShoutEl.style.display = 'block';
    this.hanShoutTimer = 1.5;
  }
  updateHanShout(delta) {
    if (this.hanShoutTimer > 0) {
      this.hanShoutTimer -= delta;
      if (this.hanShoutEl && this.player && this.camera) {
        const v = this.player.mesh.position.clone().add(new THREE.Vector3(0, 2.2, 0));
        v.project(this.camera);
        if (v.z < 1) {
          const sx = v.x * (window.innerWidth / 2) + (window.innerWidth / 2);
          const sy = -v.y * (window.innerHeight / 2) + (window.innerHeight / 2);
          this.hanShoutEl.style.left = `${sx}px`;
          this.hanShoutEl.style.top = `${sy - 30}px`;
          this.hanShoutEl.style.transform = 'translate(-50%, -50%)';
          this.hanShoutEl.style.opacity = '1';
        } else {
          this.hanShoutEl.style.display = 'none';
        }
      }
      if (this.hanShoutTimer <= 0 && this.hanShoutEl) {
        this.hanShoutEl.style.display = 'none';
      }
    }
  }
  handleHanDeath() {
    if (this.hanDeathHandled) return;
    this.hanDeathHandled = true;

    // Flash screen red
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(180, 0, 0, 0.75)';
    overlay.style.zIndex = '10006';
    overlay.style.pointerEvents = 'none';
    overlay.style.transition = 'opacity 2.5s ease-in';
    document.body.appendChild(overlay);

    showSystemMessage('[Han Islat has fallen.]');

    // Living heroes fatigue +20, stress +20
    for (const h of gameState.heroes) {
      if (gameState.isInParty(h.id)) {
        h.fatigue = Math.min(100, (h.fatigue || 0) + 20);
        gameState.addStress(h, 20);
      }
    }

    // Han is revived in hub at full HP
    this.player.hp = this.player.maxHp;
    this.player.dead = false;
    gameState.saveToLocalStorage();

    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (this.sceneManager) {
        this.sceneManager.switchTo('hub');
      }
    }, 3000);
  }
  openRewardWindow() {
    if (this.rewardWindowShown) return;
    this.rewardWindowShown = true;

    if (this.player) {
      this.player.isCheering = true;
    }
    for (const ally of (this.squadAI?.allies || [])) {
      if (!ally.dead) {
        ally.isCheering = true;
      }
    }

    // Calculate MVP
    let bestHero = { name: 'Han Islat', id: 'hero_han' };
    let bestScore = (this.player.damageDealt || 0) + (this.player.kills || 0) * 20;

    for (const ally of this.squadAI.allies) {
      const score = (ally.damageDealt || 0) + (ally.kills || 0) * 20;
      if (score > bestScore) {
        bestScore = score;
        bestHero = ally.hero;
      }
    }

    const living = [
      { name: 'Han Islat', id: 'hero_han', level: gameState.heroes.find((h) => h.id === 'hero_han')?.level || 1 },
      ...this.squadAI.allies.filter((a) => !a.dead).map((a) => a.hero),
    ];

    const dead = this.squadAI.allies.filter((a) => a.dead).map((a) => a.hero);

    const scavenged = (this.itemsManager ? this.itemsManager.groundItems : []).map((e) => e.item);

    this.rewardWindow.showRewards({
      mode: this.mode || 'tower',
      difficulty: this.difficulty || 1,
      floorNumber: this.currentFloorNumber,
      mvpHero: bestHero,
      mvpScore: bestScore,
      livingHeroes: living,
      deadHeroes: dead,
      scavengedItems: scavenged,
      materials: this.gatheredMaterials || this.expeditionMaterials || {},
    });
  }
  showBossTitleOverlay(name, subtitle) {
    if (this.bossTitleOverlay && this.bossTitleOverlay.parentNode) {
      this.bossTitleOverlay.parentNode.removeChild(this.bossTitleOverlay);
    }
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '22%';
    overlay.style.left = '50%';
    overlay.style.transform = 'translate(-50%, -50%)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '10005';
    overlay.style.transition = 'opacity 0.8s ease-out';
    overlay.style.fontFamily = 'monospace, sans-serif';

    const h1 = document.createElement('h1');
    h1.textContent = name;
    h1.style.color = '#ff2222';
    h1.style.fontSize = '38px';
    h1.style.margin = '0 0 6px 0';
    h1.style.letterSpacing = '6px';
    h1.style.textShadow = '0 0 24px rgba(255, 34, 34, 0.9)';
    overlay.appendChild(h1);

    const sub = document.createElement('div');
    sub.textContent = subtitle;
    sub.style.color = '#dddddd';
    sub.style.fontSize = '14px';
    sub.style.letterSpacing = '3px';
    sub.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.7)';
    overlay.appendChild(sub);

    document.body.appendChild(overlay);
    this.bossTitleOverlay = overlay;

    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (this.bossTitleOverlay === overlay) this.bossTitleOverlay = null;
      }, 800);
    }, 2200);
  }
};
