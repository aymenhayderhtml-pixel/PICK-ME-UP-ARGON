import * as THREE from 'three';
import { attachOrnateCorners } from './ornaments.js';
import { EnemyTagsOverlay } from './EnemyTags.js';
import { getActiveTrailsCount } from '../fx/SlashTrail.js';
import { drawIsellePortrait } from '../art/iselle.js';
import { FIRE_SPELLS } from '../combat/spells.config.js';

const _castScreenPos = new THREE.Vector3();

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

    // Mana Bar (Blue, under stamina)
    this.manaBarBg = document.createElement('div');
    this.manaBarBg.style.width = '200px';
    this.manaBarBg.style.height = '14px';
    this.manaBarBg.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.manaBarBg.style.border = '2px solid #1d4ed8';
    this.manaBarBg.style.borderRadius = '4px';
    this.manaBarBg.style.overflow = 'hidden';
    this.manaBarBg.style.position = 'relative';
    this.manaBarBg.style.display = 'none';

    this.manaBarFill = document.createElement('div');
    this.manaBarFill.style.width = '100%';
    this.manaBarFill.style.height = '100%';
    this.manaBarFill.style.backgroundColor = '#2563eb';
    this.manaBarFill.style.transition = 'width 0.08s ease-out, background-color 0.15s ease';
    this.manaBarBg.appendChild(this.manaBarFill);

    this.manaLabel = document.createElement('div');
    this.manaLabel.style.position = 'absolute';
    this.manaLabel.style.top = '0';
    this.manaLabel.style.left = '0';
    this.manaLabel.style.width = '100%';
    this.manaLabel.style.height = '100%';
    this.manaLabel.style.display = 'flex';
    this.manaLabel.style.alignItems = 'center';
    this.manaLabel.style.justifyContent = 'center';
    this.manaLabel.style.fontSize = '10px';
    this.manaLabel.style.fontWeight = 'bold';
    this.manaLabel.style.color = '#ffffff';
    this.manaLabel.style.textShadow = '0 1px 2px #000';
    this.manaLabel.textContent = 'MP 100/100';
    this.manaBarBg.appendChild(this.manaLabel);
    barsBox.appendChild(this.manaBarBg);

    // Badges Row
    const badgesRow = document.createElement('div');
    badgesRow.style.display = 'flex';
    badgesRow.style.flexWrap = 'wrap';
    badgesRow.style.gap = '4px';

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
    badgesRow.appendChild(this.shieldBadge);

    // Mana Potion Badge
    this.potionBadge = document.createElement('div');
    this.potionBadge.style.display = 'none';
    this.potionBadge.style.alignItems = 'center';
    this.potionBadge.style.width = 'fit-content';
    this.potionBadge.style.padding = '2px 8px';
    this.potionBadge.style.borderRadius = '4px';
    this.potionBadge.style.fontSize = '11px';
    this.potionBadge.style.fontWeight = 'bold';
    this.potionBadge.style.border = '1px solid #0284c7';
    this.potionBadge.style.backgroundColor = 'rgba(0, 0, 0, 0.65)';
    this.potionBadge.style.color = '#38bdf8';
    this.potionBadge.textContent = '🧪 3/3 [Q]';
    badgesRow.appendChild(this.potionBadge);

    // Quiver Badge
    this.quiverBadge = document.createElement('div');
    this.quiverBadge.style.display = 'none';
    this.quiverBadge.style.alignItems = 'center';
    this.quiverBadge.style.width = 'fit-content';
    this.quiverBadge.style.padding = '2px 8px';
    this.quiverBadge.style.borderRadius = '4px';
    this.quiverBadge.style.fontSize = '11px';
    this.quiverBadge.style.fontWeight = 'bold';
    this.quiverBadge.style.border = '1px solid #d97706';
    this.quiverBadge.style.backgroundColor = 'rgba(0, 0, 0, 0.65)';
    this.quiverBadge.style.color = '#fbbf24';
    this.quiverBadge.textContent = '🏹 20/20';
    badgesRow.appendChild(this.quiverBadge);

    // Overheat Badge
    this.overheatBadge = document.createElement('div');
    this.overheatBadge.style.display = 'none';
    this.overheatBadge.style.alignItems = 'center';
    this.overheatBadge.style.width = 'fit-content';
    this.overheatBadge.style.padding = '2px 8px';
    this.overheatBadge.style.borderRadius = '4px';
    this.overheatBadge.style.fontSize = '11px';
    this.overheatBadge.style.fontWeight = 'bold';
    this.overheatBadge.style.border = '1px solid #ef4444';
    this.overheatBadge.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    this.overheatBadge.style.color = '#f87171';
    this.overheatBadge.textContent = '🔥 OVERHEATED!';
    badgesRow.appendChild(this.overheatBadge);

    barsBox.appendChild(badgesRow);

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
      'WASD Move | MOUSE Rotate Camera (Click to Capture) | Arrow Keys Rotate/Pitch | Wheel Zoom | LEFT CLICK: ATTACK | RIGHT CLICK (HOLD): BLOCK | Q Roll | F Bash | X Auto | C Wheel | ? Toggle Hints';
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
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug') !== '1') return;
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

    // Dynamic Archery Reticle
    this.reticle = document.createElement('div');
    this.reticle.id = 'hud-archery-reticle';
    this.reticle.style.position = 'absolute';
    this.reticle.style.top = '50%';
    this.reticle.style.left = '50%';
    this.reticle.style.transform = 'translate(-50%, -50%)';
    this.reticle.style.pointerEvents = 'none';
    this.reticle.style.display = 'none';
    this.reticle.style.alignItems = 'center';
    this.reticle.style.justifyContent = 'center';
    this.reticle.style.zIndex = '10000';

    this.reticleCircle = document.createElement('div');
    this.reticleCircle.style.width = '48px';
    this.reticleCircle.style.height = '48px';
    this.reticleCircle.style.border = '2px solid rgba(255, 255, 255, 0.75)';
    this.reticleCircle.style.borderRadius = '50%';
    this.reticleCircle.style.position = 'relative';
    this.reticleCircle.style.transition = 'border-color 0.1s, box-shadow 0.1s';

    this.reticleDot = document.createElement('div');
    this.reticleDot.style.position = 'absolute';
    this.reticleDot.style.top = '50%';
    this.reticleDot.style.left = '50%';
    this.reticleDot.style.width = '4px';
    this.reticleDot.style.height = '4px';
    this.reticleDot.style.backgroundColor = '#ffffff';
    this.reticleDot.style.borderRadius = '50%';
    this.reticleDot.style.transform = 'translate(-50%, -50%)';

    this.reticle.appendChild(this.reticleCircle);
    this.reticle.appendChild(this.reticleDot);
    this.container.appendChild(this.reticle);

    // 6. Fire Mage Spell Bar (Bottom-Center)
    this.spellBar = document.createElement('div');
    this.spellBar.id = 'hud-spell-bar';
    this.spellBar.style.position = 'fixed';
    this.spellBar.style.bottom = '12px';
    this.spellBar.style.left = '50%';
    this.spellBar.style.transform = 'translateX(-50%)';
    this.spellBar.style.display = 'none';
    this.spellBar.style.gap = '6px';
    this.spellBar.style.zIndex = '9999';
    this.spellBar.style.background = 'rgba(12, 18, 25, 0.94)';
    this.spellBar.style.border = '1px solid #1e3a5f';
    this.spellBar.style.padding = '6px 8px';
    this.spellBar.style.borderRadius = '8px';
    this.spellBar.style.boxShadow = '0 4px 18px rgba(0, 0, 0, 0.75)';
    this.spellBar.style.pointerEvents = 'auto';

    this.spellSlots = new Map();
    const spellList = [
      FIRE_SPELLS.emberBolt,
      FIRE_SPELLS.fireDartVolley,
      FIRE_SPELLS.fireball,
      FIRE_SPELLS.flameWall,
      FIRE_SPELLS.infernoBeam,
      FIRE_SPELLS.fireNova,
      FIRE_SPELLS.solarCataclysm,
    ];

    for (const sp of spellList) {
      if (!sp) continue;
      const slot = document.createElement('div');
      slot.className = 'hud-spell-slot';
      slot.style.width = '54px';
      slot.style.height = '60px';
      slot.style.position = 'relative';
      slot.style.background = sp.isUltimate ? '#1e1b18' : '#132235';
      slot.style.border = `1px solid ${sp.isUltimate ? '#d97706' : '#334155'}`;
      slot.style.borderRadius = '6px';
      slot.style.cursor = 'pointer';
      slot.style.display = 'flex';
      slot.style.flexDirection = 'column';
      slot.style.alignItems = 'center';
      slot.style.justifyContent = 'center';
      slot.style.userSelect = 'none';
      slot.style.boxSizing = 'border-box';

      // Key badge
      const keyBadge = document.createElement('span');
      keyBadge.textContent = sp.key;
      keyBadge.style.position = 'absolute';
      keyBadge.style.top = '2px';
      keyBadge.style.left = '3px';
      keyBadge.style.fontSize = '8px';
      keyBadge.style.fontWeight = '800';
      keyBadge.style.background = sp.isUltimate ? '#7c2d12' : '#1e293b';
      keyBadge.style.color = sp.isUltimate ? '#fed7aa' : '#94a3b8';
      keyBadge.style.padding = '1px 3px';
      keyBadge.style.borderRadius = '2px';
      slot.appendChild(keyBadge);

      // Mastery stars
      const stars = document.createElement('span');
      stars.className = 'slot-stars';
      stars.style.position = 'absolute';
      stars.style.top = '2px';
      stars.style.right = '3px';
      stars.style.fontSize = '8px';
      stars.style.color = '#facc15';
      stars.style.lineHeight = '1';
      slot.appendChild(stars);

      // Icon
      const icon = document.createElement('span');
      icon.textContent = sp.icon;
      icon.style.fontSize = '18px';
      icon.style.marginTop = '2px';
      slot.appendChild(icon);

      // Name
      const name = document.createElement('span');
      name.textContent = sp.name.split(' ')[0];
      name.style.fontSize = '8px';
      name.style.color = sp.isUltimate ? '#fde047' : '#94a3b8';
      name.style.fontWeight = 'bold';
      name.style.marginTop = '1px';
      slot.appendChild(name);

      // Cost
      const cost = document.createElement('span');
      cost.className = 'slot-cost';
      cost.textContent = sp.isUltimate ? '70% MP' : `${sp.manaCost} MP`;
      cost.style.position = 'absolute';
      cost.style.bottom = '2px';
      cost.style.right = '3px';
      cost.style.fontSize = '7px';
      cost.style.fontWeight = '700';
      cost.style.color = sp.isUltimate ? '#fde047' : '#38bdf8';
      slot.appendChild(cost);

      // Cooldown overlay
      const cdOverlay = document.createElement('div');
      cdOverlay.className = 'slot-cd';
      cdOverlay.style.position = 'absolute';
      cdOverlay.style.inset = '0';
      cdOverlay.style.background = 'rgba(0, 0, 0, 0.75)';
      cdOverlay.style.borderRadius = '5px';
      cdOverlay.style.display = 'none';
      cdOverlay.style.alignItems = 'center';
      cdOverlay.style.justifyContent = 'center';
      cdOverlay.style.fontSize = '11px';
      cdOverlay.style.fontWeight = 'bold';
      cdOverlay.style.color = '#fde047';
      slot.appendChild(cdOverlay);

      // Locked overlay
      const lockedOverlay = document.createElement('div');
      lockedOverlay.className = 'slot-locked';
      lockedOverlay.style.position = 'absolute';
      lockedOverlay.style.inset = '0';
      lockedOverlay.style.background = 'rgba(0, 0, 0, 0.82)';
      lockedOverlay.style.borderRadius = '5px';
      lockedOverlay.style.display = 'none';
      lockedOverlay.style.alignItems = 'center';
      lockedOverlay.style.justifyContent = 'center';
      lockedOverlay.style.fontSize = '9px';
      lockedOverlay.style.fontWeight = 'bold';
      lockedOverlay.style.color = '#ef4444';
      lockedOverlay.textContent = `🔒 Lv${sp.unlockLevel}`;
      slot.appendChild(lockedOverlay);

      slot.addEventListener('click', () => {
        if (this.onCastSpell) this.onCastSpell(sp.id);
      });

      slot.addEventListener('mouseenter', () => {
        this.showSpellTooltip(sp, slot);
      });
      slot.addEventListener('mouseleave', () => {
        this.hideSpellTooltip();
      });

      this.spellBar.appendChild(slot);
      this.spellSlots.set(sp.id, { slot, stars, cost, cdOverlay, lockedOverlay, sp });
    }
    this.container.appendChild(this.spellBar);

    // Spell Tooltip
    this.spellTooltip = document.createElement('div');
    this.spellTooltip.id = 'hud-spell-tooltip';
    this.spellTooltip.style.display = 'none';
    this.spellTooltip.style.position = 'fixed';
    this.spellTooltip.style.zIndex = '10005';
    this.spellTooltip.style.pointerEvents = 'none';
    this.spellTooltip.style.background = 'rgba(12, 18, 25, 0.96)';
    this.spellTooltip.style.border = '1px solid #f97316';
    this.spellTooltip.style.borderRadius = '6px';
    this.spellTooltip.style.padding = '8px 12px';
    this.spellTooltip.style.maxWidth = '260px';
    this.spellTooltip.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.85)';
    this.spellTooltip.style.color = '#f1f5f9';
    this.spellTooltip.style.fontSize = '11px';
    this.spellTooltip.style.lineHeight = '1.4';
    this.container.appendChild(this.spellTooltip);

    // Overhead Cast Bar
    this.castBar = document.createElement('div');
    this.castBar.id = 'hud-overhead-cast-bar';
    this.castBar.style.position = 'fixed';
    this.castBar.style.width = '160px';
    this.castBar.style.height = '14px';
    this.castBar.style.background = 'rgba(15, 23, 42, 0.9)';
    this.castBar.style.border = '1px solid #f97316';
    this.castBar.style.borderRadius = '4px';
    this.castBar.style.overflow = 'hidden';
    this.castBar.style.transform = 'translate(-50%, -100%)';
    this.castBar.style.pointerEvents = 'none';
    this.castBar.style.display = 'none';
    this.castBar.style.zIndex = '10000';
    this.castBar.style.boxShadow = '0 0 10px rgba(249, 115, 22, 0.6)';

    this.castFill = document.createElement('div');
    this.castFill.style.height = '100%';
    this.castFill.style.width = '0%';
    this.castFill.style.background = 'linear-gradient(90deg, #ea580c, #facc15)';
    this.castFill.style.transition = 'width 0.04s linear';
    this.castBar.appendChild(this.castFill);

    this.castText = document.createElement('div');
    this.castText.style.position = 'absolute';
    this.castText.style.inset = '0';
    this.castText.style.display = 'flex';
    this.castText.style.alignItems = 'center';
    this.castText.style.justifyContent = 'center';
    this.castText.style.fontSize = '9px';
    this.castText.style.fontWeight = 'bold';
    this.castText.style.color = '#fff';
    this.castText.style.textShadow = '0 1px 2px #000';
    this.castBar.appendChild(this.castText);

    this.container.appendChild(this.castBar);
  }

  showSpellTooltip(spell, targetElement) {
    if (!this.spellTooltip) return;
    const costText = spell.isUltimate ? `${Math.round((spell.manaCostRatio || 0.70) * 100)}% Max MP` : `${spell.manaCost} MP`;
    this.spellTooltip.innerHTML = `
      <div style="font-weight:bold; color:#f97316; font-size:12px; margin-bottom:4px;">${spell.name} [${spell.key}]</div>
      <div style="display:flex; justify-content:space-between; color:#94a3b8; font-size:10px; margin-bottom:4px;">
        <span>Cost: <strong style="color:#38bdf8;">${costText}</strong></span>
        <span>Cast: <strong style="color:#fde047;">${spell.castTime}s</strong></span>
        <span>CD: <strong style="color:#fde047;">${spell.cooldown}s</strong></span>
      </div>
      <div style="color:#cbd5e1; font-size:10px;">${spell.description}</div>
    `;
    const rect = targetElement.getBoundingClientRect();
    this.spellTooltip.style.left = `${Math.max(10, rect.left + rect.width / 2 - 130)}px`;
    this.spellTooltip.style.bottom = `${window.innerHeight - rect.top + 10}px`;
    this.spellTooltip.style.display = 'block';
  }

  hideSpellTooltip() {
    if (this.spellTooltip) this.spellTooltip.style.display = 'none';
  }

  updateReticle(isAiming, drawAmount = 0, isTremor = false) {
    if (!this.reticle) return;
    if (isAiming) {
      this.reticle.style.display = 'flex';
      const tremor = isTremor ? (Math.random() - 0.5) * 6 : 0;
      const radius = Math.max(12, Math.round(48 - drawAmount * 36 + tremor));
      this.reticleCircle.style.width = `${radius}px`;
      this.reticleCircle.style.height = `${radius}px`;

      if (drawAmount >= 0.95) {
        this.reticleCircle.style.borderColor = '#facc15';
        this.reticleCircle.style.boxShadow = '0 0 8px #eab308';
        this.reticleDot.style.backgroundColor = '#fef08a';
      } else {
        this.reticleCircle.style.borderColor = 'rgba(255, 255, 255, 0.75)';
        this.reticleCircle.style.boxShadow = 'none';
        this.reticleDot.style.backgroundColor = '#ffffff';
      }
    } else {
      this.reticle.style.display = 'none';
    }
  }

  showDamageNumber(damage, worldPos, isFinisher) {
    const el = document.createElement('div');
    el.textContent = `${damage}`;
    el.style.position = 'absolute';
    el.style.fontWeight = 'bold';
    const isBurn = isFinisher === 'burn';
    const isCrit = isFinisher === true || isFinisher === 'headshot' || isFinisher === 'crit';
    el.style.fontSize = isCrit ? '24px' : '18px';
    el.style.color = isBurn ? '#ff9800' : (isCrit ? '#facc15' : '#ffffff');
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

    const isFloor3 = title.includes('3') || title === 'FLOOR 3';
    const box = document.createElement('div');
    if (isFloor3) {
      box.className = 'pmu-crystal-box';
      box.style.position = 'fixed';
      box.style.top = '28px';
      box.style.left = '50%';
      box.style.transform = 'translate(-50%, -40px)';
      box.style.zIndex = '10015';
      box.style.opacity = '0';
      box.style.transition = 'transform 0.38s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.38s ease-out';
      box.style.pointerEvents = 'none';

      const cornerSvg = `
        <svg viewBox="0 0 32 32" width="26" height="26" fill="none">
          <path d="M2 30V6L6 2H30" stroke="#F0E6FF" stroke-width="2.5"/>
          <path d="M6 22V10L10 6H22" stroke="#C7A4FF" stroke-width="1.5"/>
          <polygon points="4,4 11,4 4,11" fill="#FFF3D1"/>
        </svg>`;

      box.innerHTML = `
        <div class="pmu-corner pmu-corner-tl">${cornerSvg}</div>
        <div class="pmu-corner pmu-corner-tr">${cornerSvg}</div>
        <div class="pmu-corner pmu-corner-bl">${cornerSvg}</div>
        <div class="pmu-corner pmu-corner-br">${cornerSvg}</div>
        <div class="pmu-mission-header">${title}</div>
        <div class="pmu-mission-divider">
          <span class="pmu-mission-divider-line"></span>
          <span class="pmu-mission-divider-gem"></span>
          <span class="pmu-mission-divider-line"></span>
        </div>
        <div class="pmu-mission-category">${line1}</div>
        <div class="pmu-mission-goal">${line2}</div>
      `;
    } else {
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
    }
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

    // The HUD follows the controlled hero's equipped weapon (single source of
    // truth: getHeroLoadout). Widgets that do not belong are hidden.
    const hudMode = player.loadout?.hudMode || 'melee';
    const isMage = hudMode === 'mage';
    const isArcher = hudMode === 'archer';
    const isMelee = hudMode === 'melee';

    this.applyHintText(hudMode);

    // Archery Aim Reticle
    const isAimingBow = Boolean(player.isAiming && player.loadout?.weaponType === 'bow');
    this.updateReticle(isAimingBow, player.drawAmount || 0, Boolean(player.isTremor));

    // Shield State Badge (melee loadouts only)
    if (this.shieldBadge) {
      if (!isMelee) {
        this.shieldBadge.style.display = 'none';
      } else {
        this.shieldBadge.style.display = 'inline-flex';
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
    }

    // Equipment Durability Panel
    if (this.equipPanel) {
      // The shield row only belongs to a melee loadout.
      this.shieldRow.style.display = isMelee ? 'flex' : 'none';

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

    // Mana Bar & Potion / Quiver Badges
    if (this.manaBarBg) {
      if (isMage) {
        this.manaBarBg.style.display = 'block';
        const mp = Math.max(0, player.mana || 0);
        const maxMp = player.maxMana || 100;
        const mpPct = Math.min(100, Math.max(0, (mp / maxMp) * 100));
        this.manaBarFill.style.width = `${mpPct}%`;
        this.manaLabel.textContent = `MP ${Math.round(mp)}/${maxMp}`;
        if (player.manaFizzleTimer > 0) {
          this.manaBarFill.style.backgroundColor = '#ef4444';
        } else {
          this.manaBarFill.style.backgroundColor = '#2563eb';
        }
      } else {
        this.manaBarBg.style.display = 'none';
      }
    }

    if (this.potionBadge) {
      if (isMage) {
        this.potionBadge.style.display = 'inline-flex';
        const cdStr = player.manaPotionCooldown > 0 ? ` (${player.manaPotionCooldown.toFixed(1)}s)` : '';
        this.potionBadge.textContent = `🧪 ${player.manaPotions ?? 3}/3 [Q]${cdStr}`;
      } else {
        this.potionBadge.style.display = 'none';
      }
    }

    if (this.quiverBadge) {
      if (isArcher) {
        this.quiverBadge.style.display = 'inline-flex';
        this.quiverBadge.textContent = `🏹 ${player.arrows ?? 20}/${player.maxArrows || 20}`;
      } else {
        this.quiverBadge.style.display = 'none';
      }
    }

    if (this.overheatBadge) {
      if (isMage && player.isOverheated) {
        this.overheatBadge.style.display = 'inline-flex';
        this.overheatBadge.textContent = `🔥 OVERHEATED! (${player.overheatTimer.toFixed(1)}s)`;
      } else {
        this.overheatBadge.style.display = 'none';
      }
    }

    // Bottom Spell Bar
    if (this.spellBar) {
      if (isMage) {
        this.spellBar.style.display = 'flex';
        for (const [sId, slotObj] of this.spellSlots) {
          const sp = slotObj.sp;
          const cd = player.spellCooldowns ? (player.spellCooldowns[sId] || 0) : 0;
          if (cd > 0) {
            slotObj.cdOverlay.style.display = 'flex';
            slotObj.cdOverlay.textContent = `${cd.toFixed(1)}s`;
          } else {
            slotObj.cdOverlay.style.display = 'none';
          }

          const isLocked = (player.mageLevel || 1) < sp.unlockLevel;
          slotObj.lockedOverlay.style.display = isLocked ? 'flex' : 'none';

          const mastery = player.spellMastery ? (player.spellMastery[sId]?.level || 0) : 0;
          slotObj.stars.textContent = mastery > 0 ? '★'.repeat(mastery) : '';

          let reqMana = sp.isUltimate ? ((player.maxMana || 100) * (sp.manaCostRatio || 0.70)) : sp.manaCost;
          if (mastery > 0 && !sp.isUltimate && player.getDiscountedManaCost) {
            reqMana = player.getDiscountedManaCost(sId, reqMana);
          }
          if (slotObj.cost && !sp.isUltimate && sId !== 'infernoBeam') {
            slotObj.cost.textContent = `${reqMana} MP`;
          }

          const canAfford = (player.mana || 0) >= reqMana;
          if (!canAfford && !isLocked && cd <= 0) {
            slotObj.slot.style.opacity = '0.6';
          } else {
            slotObj.slot.style.opacity = '1.0';
          }

          if (sId === 'infernoBeam' && player.channeledSpell) {
            slotObj.slot.style.borderColor = '#ef4444';
            slotObj.slot.style.boxShadow = '0 0 10px #ef4444';
          } else {
            slotObj.slot.style.borderColor = sp.isUltimate ? '#d97706' : '#334155';
            slotObj.slot.style.boxShadow = 'none';
          }
        }
      } else {
        this.spellBar.style.display = 'none';
      }
    }

    // Overhead Cast Bar
    if (this.castBar) {
      if (player.isCasting && player.currentSpell && camera) {
        this.castBar.style.display = 'block';
        _castScreenPos.copy(player.mesh.position).add(new THREE.Vector3(0, 2.3, 0));
        _castScreenPos.project(camera);
        const sx = ((_castScreenPos.x + 1) * 0.5) * window.innerWidth;
        const sy = ((-_castScreenPos.y + 1) * 0.5) * window.innerHeight;
        this.castBar.style.left = `${sx}px`;
        this.castBar.style.top = `${sy}px`;

        const pct = player.castDuration > 0 ? Math.min(100, (player.castProgress / player.castDuration) * 100) : 0;
        this.castFill.style.width = `${pct}%`;
        this.castText.textContent = `Casting ${player.currentSpell.name}...`;
      } else {
        this.castBar.style.display = 'none';
      }
    }

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

  /**
   * Swaps the hotkey hint line to match the controlled hero's weapon.
   */
  applyHintText(hudMode) {
    if (this._hintMode === hudMode) return;
    this._hintMode = hudMode;
    if (!this.hints) return;
    if (hudMode === 'mage') {
      this.hints.textContent =
        'WASD Move | MOUSE Rotate Camera (Click to Capture) | LEFT CLICK: CAST EMBER BOLT | 1-6 Spells | R Ultimate | Q Mana Potion | SPACE Roll | X Auto | ? Toggle Hints';
    } else if (hudMode === 'archer') {
      this.hints.textContent =
        'WASD Move | MOUSE Rotate Camera (Click to Capture) | HOLD RIGHT CLICK: Draw Bow | LEFT CLICK: Loose Arrow | Q Roll | SPACE Roll | X Auto | ? Toggle Hints';
    } else {
      this.hints.textContent =
        'WASD Move | MOUSE Rotate Camera (Click to Capture) | Arrow Keys Rotate/Pitch | Wheel Zoom | LEFT CLICK: ATTACK | RIGHT CLICK (HOLD): BLOCK | Q Roll | F Bash | X Auto | C Wheel | ? Toggle Hints';
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
