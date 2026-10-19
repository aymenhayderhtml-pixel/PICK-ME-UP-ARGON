import * as THREE from 'three';
import { attachOrnateCorners } from './ornaments.js';
import { EnemyTagsOverlay } from './EnemyTags.js';
import { getActiveTrailsCount } from '../fx/SlashTrail.js';
import { drawIsellePortrait } from '../art/iselle.js';

export class Hud {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'hud-tower';
    this.container.style.position = 'fixed';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.userSelect = 'none';
    this.container.style.zIndex = '9999';
    this.container.style.fontFamily = 'monospace, sans-serif';
    this.container.style.display = 'none';

    // 1. Top-Left: HP Bar & Stamina Bar
    const barsBox = document.createElement('div');
    barsBox.style.position = 'absolute';
    barsBox.style.top = '12px';
    barsBox.style.left = '12px';
    barsBox.style.display = 'flex';
    barsBox.style.flexDirection = 'column';
    barsBox.style.gap = '6px';

    // HP Bar
    this.hpBarBg = document.createElement('div');
    this.hpBarBg.style.width = '200px';
    this.hpBarBg.style.height = '20px';
    this.hpBarBg.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.hpBarBg.style.border = '2px solid #662222';
    this.hpBarBg.style.borderRadius = '4px';
    this.hpBarBg.style.overflow = 'hidden';
    this.hpBarBg.style.position = 'relative';

    this.hpBarFill = document.createElement('div');
    this.hpBarFill.style.width = '100%';
    this.hpBarFill.style.height = '100%';
    this.hpBarFill.style.backgroundColor = '#e53935';
    this.hpBarFill.style.transition = 'width 0.1s ease-out';
    this.hpBarBg.appendChild(this.hpBarFill);

    this.hpLabel = document.createElement('div');
    this.hpLabel.style.position = 'absolute';
    this.hpLabel.style.top = '0';
    this.hpLabel.style.left = '0';
    this.hpLabel.style.width = '100%';
    this.hpLabel.style.height = '100%';
    this.hpLabel.style.display = 'flex';
    this.hpLabel.style.alignItems = 'center';
    this.hpLabel.style.justifyContent = 'center';
    this.hpLabel.style.fontSize = '11px';
    this.hpLabel.style.fontWeight = 'bold';
    this.hpLabel.style.color = '#ffffff';
    this.hpLabel.style.textShadow = '0 1px 2px #000';
    this.hpLabel.textContent = 'HP 100/100';
    this.hpBarBg.appendChild(this.hpLabel);

    // Stamina Bar
    this.staBarBg = document.createElement('div');
    this.staBarBg.style.width = '200px';
    this.staBarBg.style.height = '14px';
    this.staBarBg.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.staBarBg.style.border = '2px solid #226622';
    this.staBarBg.style.borderRadius = '4px';
    this.staBarBg.style.overflow = 'hidden';
    this.staBarBg.style.position = 'relative';

    this.staBarFill = document.createElement('div');
    this.staBarFill.style.width = '100%';
    this.staBarFill.style.height = '100%';
    this.staBarFill.style.backgroundColor = '#43a047';
    this.staBarFill.style.transition = 'width 0.1s ease-out';
    this.staBarBg.appendChild(this.staBarFill);

    this.staLabel = document.createElement('div');
    this.staLabel.style.position = 'absolute';
    this.staLabel.style.top = '0';
    this.staLabel.style.left = '0';
    this.staLabel.style.width = '100%';
    this.staLabel.style.height = '100%';
    this.staLabel.style.display = 'flex';
    this.staLabel.style.alignItems = 'center';
    this.staLabel.style.justifyContent = 'center';
    this.staLabel.style.fontSize = '10px';
    this.staLabel.style.fontWeight = 'bold';
    this.staLabel.style.color = '#ffffff';
    this.staLabel.style.textShadow = '0 1px 2px #000';
    this.staLabel.textContent = 'STA 100/100';
    this.staBarBg.appendChild(this.staLabel);

    barsBox.appendChild(this.hpBarBg);
    barsBox.appendChild(this.staBarBg);

    // Shield State Badge
    this.shieldBadge = document.createElement('div');
    this.shieldBadge.style.display = 'inline-flex';
    this.shieldBadge.style.alignItems = 'center';
    this.shieldBadge.style.width = 'fit-content';
    this.shieldBadge.style.padding = '2px 8px';
    this.shieldBadge.style.borderRadius = '4px';
    this.shieldBadge.style.fontSize = '11px';
    this.shieldBadge.style.fontWeight = 'bold';
    this.shieldBadge.style.border = '1px solid #43a047';
    this.shieldBadge.style.backgroundColor = 'rgba(0, 0, 0, 0.65)';
    this.shieldBadge.style.color = '#43a047';
    this.shieldBadge.textContent = '🛡️ READY';
    barsBox.appendChild(this.shieldBadge);

    this.container.appendChild(barsBox);

    // 2. Top-Center: Floor & Enemies Counter (One line)
    this.topCenterBox = document.createElement('div');
    this.topCenterBox.style.position = 'absolute';
    this.topCenterBox.style.top = '12px';
    this.topCenterBox.style.left = '50%';
    this.topCenterBox.style.transform = 'translateX(-50%)';
    this.topCenterBox.style.backgroundColor = 'rgba(11, 8, 16, 0.88)';
    this.topCenterBox.style.border = '1px solid var(--frame-inner)';
    this.topCenterBox.style.boxShadow = '0 0 10px var(--glow)';
    this.topCenterBox.style.borderRadius = '6px';
    this.topCenterBox.style.padding = '6px 20px';
    this.topCenterBox.style.pointerEvents = 'none';
    this.topCenterBox.style.color = 'var(--frame)';
    this.topCenterBox.style.fontSize = '14px';
    this.topCenterBox.style.fontWeight = 'bold';
    this.topCenterBox.style.letterSpacing = '1px';
    this.topCenterBox.textContent = 'Floor 1 | Enemies: 0';
    this.container.appendChild(this.topCenterBox);

    // 2b. Mission Box (Sub-dungeon objectives)
    this.missionBox = document.createElement('div');
    this.missionBox.style.position = 'absolute';
    this.missionBox.style.top = '50px';
    this.missionBox.style.left = '50%';
    this.missionBox.style.transform = 'translateX(-50%)';
    this.missionBox.style.backgroundColor = 'rgba(10, 20, 30, 0.85)';
    this.missionBox.style.border = '1px solid #ffd700';
    this.missionBox.style.borderRadius = '6px';
    this.missionBox.style.padding = '4px 14px';
    this.missionBox.style.display = 'none';
    this.missionBox.style.flexDirection = 'column';
    this.missionBox.style.alignItems = 'center';
    this.missionBox.style.pointerEvents = 'none';

    this.missionTitle = document.createElement('div');
    this.missionTitle.style.fontSize = '11px';
    this.missionTitle.style.fontWeight = 'bold';
    this.missionTitle.style.color = '#ffd700';
    this.missionBox.appendChild(this.missionTitle);

    this.missionObj = document.createElement('div');
    this.missionObj.style.fontSize = '10px';
    this.missionObj.style.color = '#cccccc';
    this.missionBox.appendChild(this.missionObj);
    this.container.appendChild(this.missionBox);

    // 2c. Mining Prompt & Progress
    this.miningPrompt = document.createElement('div');
    this.miningPrompt.style.position = 'absolute';
    this.miningPrompt.style.top = '62%';
    this.miningPrompt.style.left = '50%';
    this.miningPrompt.style.transform = 'translate(-50%, -50%)';
    this.miningPrompt.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.miningPrompt.style.border = '1px solid #ffd700';
    this.miningPrompt.style.borderRadius = '6px';
    this.miningPrompt.style.padding = '8px 16px';
    this.miningPrompt.style.display = 'none';
    this.miningPrompt.style.flexDirection = 'column';
    this.miningPrompt.style.alignItems = 'center';
    this.miningPrompt.style.gap = '6px';
    this.miningPrompt.style.zIndex = '9999';

    this.miningPromptText = document.createElement('div');
    this.miningPromptText.style.color = '#ffd700';
    this.miningPromptText.style.fontSize = '12px';
    this.miningPromptText.style.fontWeight = 'bold';
    this.miningPromptText.textContent = 'Hold [E] to Mine Ore';
    this.miningPrompt.appendChild(this.miningPromptText);

    this.miningProgressBg = document.createElement('div');
    this.miningProgressBg.style.width = '140px';
    this.miningProgressBg.style.height = '8px';
    this.miningProgressBg.style.backgroundColor = 'rgba(255,255,255,0.2)';
    this.miningProgressBg.style.borderRadius = '4px';
    this.miningProgressBg.style.overflow = 'hidden';

    this.miningProgressFill = document.createElement('div');
    this.miningProgressFill.style.width = '0%';
    this.miningProgressFill.style.height = '100%';
    this.miningProgressFill.style.backgroundColor = '#ffd700';
    this.miningProgressBg.appendChild(this.miningProgressFill);
    this.miningPrompt.appendChild(this.miningProgressBg);
    this.container.appendChild(this.miningPrompt);

    // 4. Bottom-Center: Hotkey Hints (Auto-hide after 20s, ? toggles)
    this.hints = document.createElement('div');
    this.hints.style.position = 'absolute';
    this.hints.style.bottom = '12px';
    this.hints.style.left = '50%';
    this.hints.style.transform = 'translateX(-50%)';
    this.hints.style.backgroundColor = 'rgba(0, 0, 0, 0.65)';
    this.hints.style.padding = '6px 16px';
    this.hints.style.borderRadius = '6px';
    this.hints.style.color = '#cccccc';
    this.hints.style.fontSize = '12px';
    this.hints.textContent =
      'WASD Move | Arrow Keys Rotate/Pitch | Wheel Zoom | L-Click Attack | Hold RMB Block | Q Roll | X Auto | C Command | M Mute | ? Toggle Hints';
    this.container.appendChild(this.hints);

    this.hintsVisible = true;
    this.hintTimeout = null;

    window.addEventListener('keydown', (e) => {
      if (e.key === '?') {
        this.toggleHints();
      }
    });

    // AUTO button (bottom-right)
    this.autoBtn = document.createElement('button');
    this.autoBtn.textContent = 'AUTO [X]';
    this.autoBtn.style.position = 'absolute';
    this.autoBtn.style.bottom = '16px';
    this.autoBtn.style.right = '16px';
    this.autoBtn.style.padding = '8px 18px';
    this.autoBtn.style.backgroundColor = 'rgba(10, 20, 30, 0.85)';
    this.autoBtn.style.border = '2px solid #555555';
    this.autoBtn.style.borderRadius = '6px';
    this.autoBtn.style.color = '#888888';
    this.autoBtn.style.fontFamily = 'monospace, sans-serif';
    this.autoBtn.style.fontSize = '13px';
    this.autoBtn.style.fontWeight = 'bold';
    this.autoBtn.style.cursor = 'pointer';
    this.autoBtn.style.pointerEvents = 'auto';
    this.autoBtn.style.transition = 'all 0.15s ease';
    this.autoBtn.title = 'Toggle Auto Mode (Key X)';
    this.autoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onToggleAuto) this.onToggleAuto();
    });
    this.container.appendChild(this.autoBtn);

    // 5. Bottom-Left: Equipment Durability Panel
    this.equipPanel = document.createElement('div');
    this.equipPanel.style.position = 'absolute';
    this.equipPanel.style.bottom = '16px';
    this.equipPanel.style.left = '16px';
    this.equipPanel.style.display = 'flex';
    this.equipPanel.style.flexDirection = 'column';
    this.equipPanel.style.gap = '6px';
    this.equipPanel.style.padding = '8px 12px';
    this.equipPanel.style.backgroundColor = 'rgba(10, 15, 12, 0.82)';
    this.equipPanel.style.border = '1px solid #2a3a30';
    this.equipPanel.style.borderRadius = '6px';
    this.equipPanel.style.fontSize = '11px';

    // Weapon Row
    this.weaponRow = document.createElement('div');
    this.weaponRow.style.display = 'flex';
    this.weaponRow.style.alignItems = 'center';
    this.weaponRow.style.gap = '8px';

    this.weaponNameLabel = document.createElement('span');
    this.weaponNameLabel.style.width = '105px';
    this.weaponNameLabel.style.color = '#ffd700';
    this.weaponNameLabel.style.fontWeight = 'bold';
    this.weaponNameLabel.textContent = '⚔️ Rusty Sword';
    this.weaponRow.appendChild(this.weaponNameLabel);

    this.weaponBarBg = document.createElement('div');
    this.weaponBarBg.style.width = '75px';
    this.weaponBarBg.style.height = '7px';
    this.weaponBarBg.style.backgroundColor = '#222';
    this.weaponBarBg.style.borderRadius = '2px';
    this.weaponBarBg.style.overflow = 'hidden';

    this.weaponBarFill = document.createElement('div');
    this.weaponBarFill.style.width = '100%';
    this.weaponBarFill.style.height = '100%';
    this.weaponBarFill.style.backgroundColor = '#ffaa00';
    this.weaponBarBg.appendChild(this.weaponBarFill);
    this.weaponRow.appendChild(this.weaponBarBg);

    this.weaponDuraText = document.createElement('span');
    this.weaponDuraText.style.color = '#ccc';
    this.weaponDuraText.style.fontSize = '10px';
    this.weaponDuraText.textContent = '40/40';
    this.weaponRow.appendChild(this.weaponDuraText);
    this.equipPanel.appendChild(this.weaponRow);

    // Shield Row
    this.shieldRow = document.createElement('div');
    this.shieldRow.style.display = 'flex';
    this.shieldRow.style.alignItems = 'center';
    this.shieldRow.style.gap = '8px';

    this.shieldNameLabel = document.createElement('span');
    this.shieldNameLabel.style.width = '105px';
    this.shieldNameLabel.style.color = '#00bfff';
    this.shieldNameLabel.style.fontWeight = 'bold';
    this.shieldNameLabel.textContent = '🛡️ Wooden Shield';
    this.shieldRow.appendChild(this.shieldNameLabel);

    this.shieldBarBg = document.createElement('div');
    this.shieldBarBg.style.width = '75px';
    this.shieldBarBg.style.height = '7px';
    this.shieldBarBg.style.backgroundColor = '#222';
    this.shieldBarBg.style.borderRadius = '2px';
    this.shieldBarBg.style.overflow = 'hidden';

    this.shieldBarFill = document.createElement('div');
    this.shieldBarFill.style.width = '100%';
    this.shieldBarFill.style.height = '100%';
    this.shieldBarFill.style.backgroundColor = '#00bfff';
    this.shieldBarBg.appendChild(this.shieldBarFill);
    this.shieldRow.appendChild(this.shieldBarBg);

    this.shieldDuraText = document.createElement('span');
    this.shieldDuraText.style.color = '#ccc';
    this.shieldDuraText.style.fontSize = '10px';
    this.shieldDuraText.textContent = '50/50';
    this.shieldRow.appendChild(this.shieldDuraText);
    this.equipPanel.appendChild(this.shieldRow);

    this.container.appendChild(this.equipPanel);

    // 5. Centered Death Overlay
    this.deathOverlay = document.createElement('div');
    this.deathOverlay.style.position = 'absolute';
    this.deathOverlay.style.top = '50%';
    this.deathOverlay.style.left = '50%';
    this.deathOverlay.style.transform = 'translate(-50%, -50%)';
    this.deathOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.88)';
    this.deathOverlay.style.border = '2px solid #aa2222';
    this.deathOverlay.style.borderRadius = '8px';
    this.deathOverlay.style.padding = '24px 40px';
    this.deathOverlay.style.textAlign = 'center';
    this.deathOverlay.style.display = 'none';

    const deathTitle = document.createElement('div');
    deathTitle.style.color = '#ff3333';
    deathTitle.style.fontSize = '36px';
    deathTitle.style.fontWeight = 'bold';
    deathTitle.textContent = 'Han has fallen';
    this.deathOverlay.appendChild(deathTitle);

    const deathSub = document.createElement('div');
    deathSub.style.color = '#aaaaaa';
    deathSub.style.fontSize = '14px';
    deathSub.style.marginTop = '12px';
    deathSub.textContent = 'Returning to Niflheimr...';
    this.deathOverlay.appendChild(deathSub);

    this.container.appendChild(this.deathOverlay);

    document.body.appendChild(this.container);

    // Floating Enemy Health Bars Pool
    this.enemyBarsContainer = document.createElement('div');
    this.enemyBarsContainer.style.position = 'absolute';
    this.enemyBarsContainer.style.top = '0';
    this.enemyBarsContainer.style.left = '0';
    this.container.appendChild(this.enemyBarsContainer);

    this.enemyBars = new Map();
    this.enemyTags = new EnemyTagsOverlay();
    this.damageNumbers = [];

    // F3 & F4 Debug state
    this.showDebug = false;
    this._lastPlayer = null;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        this.showDebug = !this.showDebug;
        this.debugBox.style.display = this.showDebug ? 'block' : 'none';
      } else if (e.code === 'F4') {
        if (this._lastPlayer && this._lastPlayer.breakWeapon) {
          this._lastPlayer.breakWeapon();
        }
      } else if (e.code === 'Insert' && this.showDebug) {
        e.preventDefault();
        const iselle = window.__iselleRig;
        if (iselle) {
          if (e.shiftKey) {
            const exprs = ['neutral', 'smile', 'surprised', 'angry', 'sad', 'blink', 'wink', 'sweet_cruel', 'cheerful', 'smug', 'stern'];
            const curIdx = exprs.indexOf(iselle.currentExpression);
            const nextExpr = exprs[(curIdx + 1) % exprs.length];
            iselle.setExpression(nextExpr);
          } else {
            const poses = ['idle', 'float', 'walk', 'fly', 'cast', 'hit', 'ko', 'victory', 'cheerful', 'announce', 'scold', 'bow'];
            const curIdx = poses.indexOf(iselle.currentPose);
            const nextPose = poses[(curIdx + 1) % poses.length];
            iselle.setPose(nextPose);
          }
        }
      }
    });

    this.fpsCounter = 60;
    this.fpsTimer = 0;
    this.frames = 0;
  }

  showDamageNumber(damage, worldPos, isFinisher) {
    const el = document.createElement('div');
    el.textContent = `${damage}`;
    el.style.position = 'absolute';
    el.style.fontWeight = 'bold';
    el.style.fontSize = isFinisher ? '24px' : '18px';
    el.style.color = isFinisher ? '#ffeb3b' : '#ffffff';
    el.style.textShadow = '0 1px 3px #000';
    el.style.pointerEvents = 'none';
    this.container.appendChild(el);

    this.damageNumbers.push({
      el,
      pos: worldPos.clone().add(new THREE.Vector3(0, 1.2, 0)),
      life: 0.8,
      maxLife: 0.8,
    });
  }

  showNotification(text, worldPos) {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.position = 'absolute';
    el.style.fontWeight = 'bold';
    el.style.fontSize = '16px';
    el.style.color = '#b388ff';
    el.style.textShadow = '0 1px 3px #000';
    el.style.pointerEvents = 'none';
    this.container.appendChild(el);

    this.damageNumbers.push({
      el,
      pos: worldPos.clone().add(new THREE.Vector3(0, 1.0, 0)),
      life: 1.2,
      maxLife: 1.2,
    });
  }

  showParryText(worldPos) {
    const el = document.createElement('div');
    el.textContent = 'PARRY';
    el.style.position = 'absolute';
    el.style.fontWeight = 'bold';
    el.style.fontSize = '26px';
    el.style.color = '#ffffff';
    el.style.textShadow = '0 0 14px var(--glow), 0 2px 4px #000';
    el.style.pointerEvents = 'none';
    el.style.letterSpacing = '3px';
    this.container.appendChild(el);

    this.damageNumbers.push({
      el,
      pos: (worldPos ? worldPos.clone() : new THREE.Vector3()).add(new THREE.Vector3(0, 1.4, 0)),
      life: 0.9,
      maxLife: 0.9,
    });
  }

  showMissionBox(missionData = {}) {
    if (this.missionBox) {
      if (this.missionBox.parentNode) this.missionBox.parentNode.removeChild(this.missionBox);
      this.missionBox = null;
    }

    let title = 'FLOOR 1';
    let line1 = 'MISSION TYPE – SUBJUGATION';
    let line2 = 'OBJECTIVE – ANNIHILATE YOUR ENEMIES!';

    if (typeof missionData === 'object' && missionData !== null && missionData.title) {
      title = missionData.title;
      line1 = missionData.line1 || `MISSION TYPE – ${missionData.missionType || 'SUBJUGATION'}`;
      line2 = missionData.line2 || `OBJECTIVE – ${missionData.objective || 'ANNIHILATE YOUR ENEMIES!'}`;
    } else if (typeof missionData === 'string') {
      title = missionData.toUpperCase();
    }

    const box = document.createElement('div');
    box.className = 'mm-panel';
    box.style.position = 'fixed';
    box.style.top = '28px';
    box.style.left = '50%';
    box.style.transform = 'translate(-50%, -40px)';
    box.style.maxWidth = '560px';
    box.style.width = 'min(560px, 92vw)';
    box.style.padding = '22px 34px';
    box.style.zIndex = '10015';
    box.style.opacity = '0';
    box.style.transition = 'transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.3s ease-out';
    box.style.pointerEvents = 'none';

    box.innerHTML = `
      <div style="display:flex; align-items:center; gap:20px; width:100%; text-align:left;">
        <canvas id="mission-iselle-portrait" width="64" height="64" style="width:64px; height:64px; border-radius:6px; border:1px solid var(--frame-inner); background:#171026; flex-shrink:0;"></canvas>
        <div style="flex:1;">
          <div style="font-size:36px; font-weight:800; color:var(--text); letter-spacing:2px; margin-bottom:6px; line-height:1.1;">${title}</div>
          <div style="font-size:20px; font-weight:700; color:var(--text); letter-spacing:1px; margin-bottom:4px; line-height:1.25;">${line1}</div>
          <div style="font-size:20px; font-weight:700; color:var(--text); letter-spacing:1px; line-height:1.25;">${line2}</div>
        </div>
      </div>
    `;

    const canvas = box.querySelector('#mission-iselle-portrait');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      try {
        drawIsellePortrait(ctx, 'sweet_cruel', 64);
      } catch (e) {}
    }

    attachOrnateCorners(box);
    document.body.appendChild(box);
    this.missionBox = box;

    // 0.3 second slide down from the top
    requestAnimationFrame(() => {
      box.style.opacity = '1';
      box.style.transform = 'translate(-50%, 0)';
    });

    // Display for 5 seconds, then slide up and fade out
    setTimeout(() => {
      if (this.missionBox === box) {
        box.style.opacity = '0';
        box.style.transform = 'translate(-50%, -25px)';
        setTimeout(() => {
          if (box.parentNode) box.parentNode.removeChild(box);
          if (this.missionBox === box) this.missionBox = null;
        }, 350);
      }
    }, 5000);
  }

  setFloorLabel(label) {
    this.customFloorLabel = label;
  }

  showMiningPrompt(visible, progress = 0) {
    if (this.miningPrompt) {
      this.miningPrompt.style.display = visible ? 'flex' : 'none';
      if (this.miningProgressFill) {
        this.miningProgressFill.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
      }
    }
  }

  update(delta, player, enemies, camera, renderer, bossDefeated, floorNumber = null) {
    if (!player) return;

    // Shield State Badge
    if (this.shieldBadge) {
      if (player.guardBreakTimer > 0) {
        this.shieldBadge.textContent = '⚠️ GUARD BROKEN';
        this.shieldBadge.style.color = '#ff4444';
        this.shieldBadge.style.borderColor = '#ff4444';
      } else if (player.isBlocking) {
        if (player.blockTimer <= 0.22) {
          this.shieldBadge.textContent = '⚡ PARRY READY';
          this.shieldBadge.style.color = '#00ffff';
          this.shieldBadge.style.borderColor = '#00ffff';
        } else {
          this.shieldBadge.textContent = '🛡️ BLOCKING';
          this.shieldBadge.style.color = '#ffbb33';
          this.shieldBadge.style.borderColor = '#ffbb33';
        }
      } else if (!player.shield || player.shield.durability <= 0) {
        this.shieldBadge.textContent = '🛡️ NO SHIELD';
        this.shieldBadge.style.color = '#777777';
        this.shieldBadge.style.borderColor = '#555555';
      } else {
        this.shieldBadge.textContent = '🛡️ READY';
        this.shieldBadge.style.color = '#43a047';
        this.shieldBadge.style.borderColor = '#43a047';
      }
    }

    // Equipment Durability Panel
    if (this.equipPanel) {
      if (player.weapon && player.weapon.durability > 0 && player.weapon.id !== 'bare_fists') {
        this.weaponNameLabel.textContent = `⚔️ ${player.weapon.name}`;
        const pct = Math.max(0, Math.min(100, (player.weapon.durability / player.weapon.maxDurability) * 100));
        this.weaponBarFill.style.width = `${pct}%`;
        this.weaponBarFill.style.backgroundColor = pct > 50 ? '#43a047' : pct > 20 ? '#ffaa00' : '#e53935';
        this.weaponDuraText.textContent = `${player.weapon.durability}/${player.weapon.maxDurability}`;
      } else {
        this.weaponNameLabel.textContent = '👊 Bare Fists';
        this.weaponBarFill.style.width = '100%';
        this.weaponBarFill.style.backgroundColor = '#666666';
        this.weaponDuraText.textContent = '∞';
      }

      if (player.shield && player.shield.durability > 0) {
        this.shieldNameLabel.textContent = `🛡️ ${player.shield.name}`;
        const pct = Math.max(0, Math.min(100, (player.shield.durability / player.shield.maxDurability) * 100));
        this.shieldBarFill.style.width = `${pct}%`;
        this.shieldBarFill.style.backgroundColor = pct > 50 ? '#00bfff' : pct > 20 ? '#ffaa00' : '#e53935';
        this.shieldDuraText.textContent = `${player.shield.durability}/${player.shield.maxDurability}`;
      } else {
        this.shieldNameLabel.textContent = 'No Shield';
        this.shieldBarFill.style.width = '0%';
        this.shieldBarFill.style.backgroundColor = '#444444';
        this.shieldDuraText.textContent = '0/0';
      }
    }

    // 1. Update Player HP & Stamina Bars
    const hp = Math.max(0, player.hp);
    const hpPct = (hp / player.maxHp) * 100;
    this.hpBarFill.style.width = `${hpPct}%`;
    this.hpLabel.textContent = `HP ${Math.round(hp)}/${player.maxHp}`;

    const sta = Math.max(0, player.stamina);
    const staPct = (sta / player.maxStamina) * 100;
    this.staBarFill.style.width = `${staPct}%`;
    this.staLabel.textContent = `STA ${Math.round(sta)}/${player.maxStamina}`;

    // 2. Enemies Remaining & Floor Label (Single line)
    const activeEnemies = (enemies || []).filter((e) => !e.dead && !e.isDying);
    if (this.topCenterBox) {
      if (this.customFloorLabel) {
        this.topCenterBox.textContent = `${this.customFloorLabel} | Enemies: ${activeEnemies.length}`;
      } else {
        this.topCenterBox.textContent = `Floor ${floorNumber || 1} | Enemies: ${activeEnemies.length}`;
      }
    }

    // 4. Death Overlay
    if (player.dead) {
      this.deathOverlay.style.display = 'block';
    } else {
      this.deathOverlay.style.display = 'none';
    }

    this._lastPlayer = player;

    // 5. FPS & F3 Debug
    if (this.showDebug && renderer) {
      this.frames++;
      this.fpsTimer += delta;
      if (this.fpsTimer >= 0.5) {
        this.fpsCounter = Math.round(this.frames / this.fpsTimer);
        this.frames = 0;
        this.fpsTimer = 0;
      }
      const calls = renderer.info.render.calls;
      const tris = renderer.info.render.triangles;

      let wepCalls = 0;
      if (player?.scene) {
        player.scene.traverse((obj) => {
          if (obj.isMesh && (obj.name.startsWith('weapon_') || obj.name.startsWith('shield_') || obj.name.startsWith('pickup_'))) {
            wepCalls++;
          }
        });
      }
      const trailsCount = getActiveTrailsCount();
      const iselle = window.__iselleRig;
      const iselleInfo = iselle ? ` | Iselle: [pose: ${iselle.currentPose}, expr: ${iselle.currentExpression}, meshes: ${iselle.meshCount || 17}]` : '';
      this.debugBox.textContent = `Calls: ${calls} | Tris: ${tris} | FPS: ${this.fpsCounter} | WepCalls: ${wepCalls} | Trails: ${trailsCount}${iselleInfo}`;
    }

    // 6. Floating Damage Numbers update
    const tempVec = new THREE.Vector3();
    const halfWidth = window.innerWidth / 2;
    const halfHeight = window.innerHeight / 2;

    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const item = this.damageNumbers[i];
      item.life -= delta;
      const progress = 1 - Math.max(0, item.life / item.maxLife);

      tempVec.copy(item.pos);
      tempVec.y += progress * 1.0; // Float up
      tempVec.project(camera);

      // Check if in front of camera
      if (tempVec.z < 1) {
        const screenX = tempVec.x * halfWidth + halfWidth;
        const screenY = -tempVec.y * halfHeight + halfHeight;
        item.el.style.left = `${screenX}px`;
        item.el.style.top = `${screenY}px`;
        item.el.style.opacity = `${item.life / item.maxLife}`;
        item.el.style.display = 'block';
      } else {
        item.el.style.display = 'none';
      }

      if (item.life <= 0) {
        item.el.remove();
        this.damageNumbers.splice(i, 1);
      }
    }

    // 7. Floating Enemy Tags & Damage HP Bars
    if (this.enemyTags && enemies && camera) {
      this.enemyTags.update(camera, enemies);
    }
  }

  setAuto(isAuto) {
    if (!this.autoBtn) return;
    if (isAuto) {
      this.autoBtn.style.backgroundColor = 'rgba(0, 255, 136, 0.25)';
      this.autoBtn.style.borderColor = '#00ff88';
      this.autoBtn.style.color = '#00ff88';
      this.autoBtn.style.boxShadow = '0 0 12px rgba(0, 255, 136, 0.5)';
      this.autoBtn.textContent = 'AUTO ON [X]';
    } else {
      this.autoBtn.style.backgroundColor = 'rgba(10, 20, 30, 0.85)';
      this.autoBtn.style.borderColor = '#555555';
      this.autoBtn.style.color = '#888888';
      this.autoBtn.style.boxShadow = 'none';
      this.autoBtn.textContent = 'AUTO [X]';
    }
  }

  toggleHints() {
    this.hintsVisible = !this.hintsVisible;
    this.hints.style.display = this.hintsVisible ? 'block' : 'none';
    if (this.hintTimeout) {
      clearTimeout(this.hintTimeout);
      this.hintTimeout = null;
    }
  }

  show() {
    this.container.style.display = 'block';
    this.hintsVisible = true;
    this.hints.style.display = 'block';
    if (this.hintTimeout) clearTimeout(this.hintTimeout);
    this.hintTimeout = setTimeout(() => {
      this.hintsVisible = false;
      this.hints.style.display = 'none';
    }, 20000);
  }

  hide() {
    this.container.style.display = 'none';
    this.deathOverlay.style.display = 'none';
    if (this.hintTimeout) clearTimeout(this.hintTimeout);
    this.clearFloating();
  }

  clearFloating() {
    for (const d of this.damageNumbers) d.el.remove();
    this.damageNumbers = [];
    if (this.enemyTags) this.enemyTags.clear();
  }
}

// Stacking System Messages: at most 2 at once, shorter text, 2.5 seconds, merge duplicates
let activeSystemMessages = [];

export {
  showSystemMessage,
  showNotices,
  showStatusNotice,
  showHeroDeathNotice,
  showEquipmentNotice,
  clearSystemMessages,
} from './Notices.js';

// Check if any interactive SystemWindow or modal is open
export function isAnySystemWindowOpen() {
  if (typeof document === 'undefined') return false;
  const els = document.querySelectorAll('body > div');
  for (const el of els) {
    const zi = parseInt(el.style.zIndex, 10);
    if (zi >= 10000 && el.style.display && el.style.display !== 'none' && el.style.opacity !== '0') {
      if (el.style.pointerEvents !== 'none') {
        return true;
      }
    }
  }
  return false;
}

// Intercept any legacy pm-system-notif element if created by SystemWindow.js
if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.id === 'pm-system-notif') {
          node.style.display = 'none';
          showSystemMessage(node.textContent);
        }
      }
    }
  });
  if (document.body) {
    observer.observe(document.body, { childList: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true });
    });
  }
}
