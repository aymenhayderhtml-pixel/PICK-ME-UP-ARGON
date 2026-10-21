import { SystemWindow } from './SystemWindow.js';
import { gameState } from '../core/GameState.js';
import { fpsCounter } from './FpsCounter.js';

export class OptionsWindow extends SystemWindow {
  constructor(options = {}) {
    super('SYSTEM OPTIONS');
    this.onQualityChange = options.onQualityChange || (() => {});
    this.onResolutionChange = options.onResolutionChange || (() => {});
    this.onFpsToggle = options.onFpsToggle || (() => {});
    this.onVolumeChange = options.onVolumeChange || (() => {});

    this.container.style.width = '520px';
    this.container.style.maxWidth = '92vw';

    this.content = document.createElement('div');
    this.content.style.padding = '14px 20px';
    this.content.style.display = 'flex';
    this.content.style.flexDirection = 'column';
    this.content.style.gap = '14px';
    this.content.style.color = 'var(--text, #d0d7de)';
    this.content.style.fontSize = '13px';
    this.container.appendChild(this.content);

    this.buildUI();
  }

  buildUI() {
    this.content.innerHTML = '';
    const settings = gameState.settings || { quality: 'medium', resolutionScale: 1, showFps: false };
    if (!settings.controls) settings.controls = { attackButton: 'right', blockButton: 'left' };
    if (!settings.camera) settings.camera = { followSpeed: 'tight', autoTurn: true, distance: 'normal' };

    // 1. Graphics Quality Setting
    const qRow = document.createElement('div');
    qRow.style.display = 'flex';
    qRow.style.flexDirection = 'column';
    qRow.style.gap = '6px';

    const qLabel = document.createElement('div');
    qLabel.textContent = 'GRAPHICS QUALITY';
    qLabel.style.fontWeight = 'bold';
    qLabel.style.color = 'var(--frame, #ffd36b)';
    qLabel.style.letterSpacing = '1px';
    qRow.appendChild(qLabel);

    const qBtnGroup = document.createElement('div');
    qBtnGroup.style.display = 'flex';
    qBtnGroup.style.gap = '8px';

    const qualities = ['low', 'medium', 'high'];
    this.qualityBtns = {};

    qualities.forEach((q) => {
      const btn = document.createElement('button');
      btn.textContent = q.toUpperCase();
      btn.style.flex = '1';
      btn.style.padding = '8px 12px';
      btn.style.fontFamily = 'monospace';
      btn.style.fontSize = '12px';
      btn.style.cursor = 'pointer';
      btn.style.border = '1px solid var(--frame-inner, #4a3e66)';
      btn.style.borderRadius = '4px';
      btn.style.backgroundColor = settings.quality === q ? 'rgba(111, 224, 240, 0.25)' : 'rgba(20, 15, 30, 0.7)';
      btn.style.color = settings.quality === q ? '#6fe0f0' : '#cccccc';
      btn.style.boxShadow = settings.quality === q ? '0 0 8px rgba(111, 224, 240, 0.4)' : 'none';

      btn.addEventListener('click', () => {
        settings.quality = q;
        gameState.saveToLocalStorage();
        this.updateQualityBtnStyles();
        this.onQualityChange(q);
      });

      this.qualityBtns[q] = btn;
      qBtnGroup.appendChild(btn);
    });
    qRow.appendChild(qBtnGroup);
    this.content.appendChild(qRow);

    // 2. Camera Settings Section
    const camSec = document.createElement('div');
    camSec.style.display = 'flex';
    camSec.style.flexDirection = 'column';
    camSec.style.gap = '8px';

    const camLabel = document.createElement('div');
    camLabel.textContent = 'CAMERA SETTINGS';
    camLabel.style.fontWeight = 'bold';
    camLabel.style.color = 'var(--frame, #ffd36b)';
    camLabel.style.letterSpacing = '1px';
    camSec.appendChild(camLabel);

    // Follow Speed: Tight, Normal, Loose
    const spdBox = document.createElement('div');
    spdBox.style.display = 'flex';
    spdBox.style.alignItems = 'center';
    spdBox.style.justifyContent = 'space-between';

    const spdTitle = document.createElement('span');
    spdTitle.textContent = 'Follow Speed:';
    spdTitle.style.fontSize = '12px';
    spdBox.appendChild(spdTitle);

    const spdGroup = document.createElement('div');
    spdGroup.style.display = 'flex';
    spdGroup.style.gap = '6px';
    const speeds = [
      { id: 'tight', label: 'TIGHT' },
      { id: 'normal', label: 'NORMAL' },
      { id: 'loose', label: 'LOOSE' }
    ];
    this.camSpeedBtns = {};
    speeds.forEach((sp) => {
      const b = document.createElement('button');
      b.textContent = sp.label;
      b.style.padding = '4px 10px';
      b.style.fontSize = '11px';
      b.style.cursor = 'pointer';
      b.style.borderRadius = '4px';
      b.style.border = '1px solid var(--frame-inner, #4a3e66)';
      const isSel = (settings.camera.followSpeed || 'tight') === sp.id;
      b.style.backgroundColor = isSel ? 'rgba(111, 224, 240, 0.25)' : 'rgba(20, 15, 30, 0.7)';
      b.style.color = isSel ? '#6fe0f0' : '#cccccc';

      b.addEventListener('click', () => {
        settings.camera.followSpeed = sp.id;
        gameState.saveToLocalStorage();
        this.updateCamSpeedBtnStyles();
      });
      this.camSpeedBtns[sp.id] = b;
      spdGroup.appendChild(b);
    });
    spdBox.appendChild(spdGroup);
    camSec.appendChild(spdBox);

    // Camera Distance: Near, Normal, Far
    const distBox = document.createElement('div');
    distBox.style.display = 'flex';
    distBox.style.alignItems = 'center';
    distBox.style.justifyContent = 'space-between';

    const distTitle = document.createElement('span');
    distTitle.textContent = 'Camera Distance:';
    distTitle.style.fontSize = '12px';
    distBox.appendChild(distTitle);

    const distGroup = document.createElement('div');
    distGroup.style.display = 'flex';
    distGroup.style.gap = '6px';
    const dists = [
      { id: 'near', label: 'NEAR' },
      { id: 'normal', label: 'NORMAL' },
      { id: 'far', label: 'FAR' }
    ];
    this.camDistBtns = {};
    dists.forEach((d) => {
      const b = document.createElement('button');
      b.textContent = d.label;
      b.style.padding = '4px 10px';
      b.style.fontSize = '11px';
      b.style.cursor = 'pointer';
      b.style.borderRadius = '4px';
      b.style.border = '1px solid var(--frame-inner, #4a3e66)';
      const isSel = (settings.camera.distance || 'normal') === d.id;
      b.style.backgroundColor = isSel ? 'rgba(111, 224, 240, 0.25)' : 'rgba(20, 15, 30, 0.7)';
      b.style.color = isSel ? '#6fe0f0' : '#cccccc';

      b.addEventListener('click', () => {
        settings.camera.distance = d.id;
        gameState.saveToLocalStorage();
        this.updateCamDistBtnStyles();
      });
      this.camDistBtns[d.id] = b;
      distGroup.appendChild(b);
    });
    distBox.appendChild(distGroup);
    camSec.appendChild(distBox);

    // Auto-turn behind character checkbox
    const autoTurnBox = document.createElement('div');
    autoTurnBox.style.display = 'flex';
    autoTurnBox.style.alignItems = 'center';
    autoTurnBox.style.gap = '8px';

    const autoTurnCheck = document.createElement('input');
    autoTurnCheck.type = 'checkbox';
    autoTurnCheck.id = 'opt-auto-turn';
    autoTurnCheck.checked = settings.camera.autoTurn ?? true;
    autoTurnCheck.style.cursor = 'pointer';
    autoTurnCheck.addEventListener('change', (e) => {
      settings.camera.autoTurn = e.target.checked;
      gameState.saveToLocalStorage();
    });

    const autoTurnLbl = document.createElement('label');
    autoTurnLbl.htmlFor = 'opt-auto-turn';
    autoTurnLbl.textContent = 'Auto-turn camera behind character';
    autoTurnLbl.style.cursor = 'pointer';
    autoTurnLbl.style.fontSize = '12px';
    autoTurnLbl.style.fontWeight = 'bold';
    autoTurnBox.appendChild(autoTurnCheck);
    autoTurnBox.appendChild(autoTurnLbl);
    camSec.appendChild(autoTurnBox);

    this.content.appendChild(camSec);

    // 3. Controls Toggle (Swap attack and block buttons)
    const ctrlSec = document.createElement('div');
    ctrlSec.style.display = 'flex';
    ctrlSec.style.flexDirection = 'column';
    ctrlSec.style.gap = '6px';

    const ctrlLabel = document.createElement('div');
    ctrlLabel.textContent = 'COMBAT CONTROLS';
    ctrlLabel.style.fontWeight = 'bold';
    ctrlLabel.style.color = 'var(--frame, #ffd36b)';
    ctrlLabel.style.letterSpacing = '1px';
    ctrlSec.appendChild(ctrlLabel);

    const swapBox = document.createElement('div');
    swapBox.style.display = 'flex';
    swapBox.style.alignItems = 'center';
    swapBox.style.gap = '8px';

    const swapCheck = document.createElement('input');
    swapCheck.type = 'checkbox';
    swapCheck.id = 'opt-swap-buttons';
    // Checked if attack is left and block is right (swapped from default)
    swapCheck.checked = settings.controls.attackButton === 'left' && settings.controls.blockButton === 'right';
    swapCheck.style.cursor = 'pointer';
    swapCheck.addEventListener('change', (e) => {
      if (e.target.checked) {
        settings.controls.attackButton = 'left';
        settings.controls.blockButton = 'right';
      } else {
        settings.controls.attackButton = 'right';
        settings.controls.blockButton = 'left';
      }
      gameState.saveToLocalStorage();
      this.updateControlsKeyList();
    });

    const swapLbl = document.createElement('label');
    swapLbl.htmlFor = 'opt-swap-buttons';
    swapLbl.textContent = 'Swap attack and block buttons (Left = Attack, Right = Block)';
    swapLbl.style.cursor = 'pointer';
    swapLbl.style.fontSize = '12px';
    swapLbl.style.fontWeight = 'bold';
    swapBox.appendChild(swapCheck);
    swapBox.appendChild(swapLbl);
    ctrlSec.appendChild(swapBox);

    this.content.appendChild(ctrlSec);

    // 4. Audio Controls & FPS Overlay
    const optGrid = document.createElement('div');
    optGrid.style.display = 'grid';
    optGrid.style.gridTemplateColumns = '1fr 1fr';
    optGrid.style.gap = '12px';

    // FPS Toggle
    const fpsBox = document.createElement('div');
    fpsBox.style.display = 'flex';
    fpsBox.style.alignItems = 'center';
    fpsBox.style.gap = '8px';

    const fpsCheck = document.createElement('input');
    fpsCheck.type = 'checkbox';
    fpsCheck.id = 'opt-fps-toggle';
    fpsCheck.checked = gameState.settings?.showFps ?? true;
    fpsCheck.style.cursor = 'pointer';
    fpsCheck.addEventListener('change', (e) => {
      settings.showFps = e.target.checked;
      gameState.saveToLocalStorage();
      fpsCounter.setVisible(settings.showFps);
      this.onFpsToggle(settings.showFps);
    });

    const fpsLbl = document.createElement('label');
    fpsLbl.htmlFor = 'opt-fps-toggle';
    fpsLbl.textContent = 'SHOW FPS COUNTER';
    fpsLbl.style.cursor = 'pointer';
    fpsLbl.style.fontSize = '12px';
    fpsLbl.style.fontWeight = 'bold';
    fpsBox.appendChild(fpsCheck);
    fpsBox.appendChild(fpsLbl);
    optGrid.appendChild(fpsBox);

    // Volume Slider
    const volBox = document.createElement('div');
    volBox.style.display = 'flex';
    volBox.style.flexDirection = 'column';
    volBox.style.gap = '4px';

    const volLabel = document.createElement('div');
    volLabel.textContent = 'MASTER VOLUME';
    volLabel.style.fontSize = '12px';
    volLabel.style.fontWeight = 'bold';
    volBox.appendChild(volLabel);

    const volSlider = document.createElement('input');
    volSlider.type = 'range';
    volSlider.min = '0';
    volSlider.max = '1';
    volSlider.step = '0.05';
    const curVol = (typeof window !== 'undefined' && window.__audioMaster?.masterVolume !== undefined)
      ? window.__audioMaster.masterVolume
      : 0.3;
    volSlider.value = String(curVol);
    volSlider.style.cursor = 'pointer';

    volSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (typeof window !== 'undefined') {
        if (!window.__audioMaster) window.__audioMaster = { isMuted: false, masterVolume: 0.3 };
        window.__audioMaster.masterVolume = v;
      }
      this.onVolumeChange(v);
    });
    volBox.appendChild(volSlider);
    optGrid.appendChild(volBox);
    this.content.appendChild(optGrid);

    // 5. Keyboard & Mouse Controls Reference
    const keySec = document.createElement('div');
    keySec.style.display = 'flex';
    keySec.style.flexDirection = 'column';
    keySec.style.gap = '6px';
    keySec.style.backgroundColor = 'rgba(15, 12, 24, 0.6)';
    keySec.style.border = '1px solid rgba(74, 62, 102, 0.4)';
    keySec.style.borderRadius = '4px';
    keySec.style.padding = '8px 12px';

    const keyTitle = document.createElement('div');
    keyTitle.textContent = 'CONTROLS REFERENCE';
    keyTitle.style.fontWeight = 'bold';
    keyTitle.style.color = 'var(--gold, #ffc27a)';
    keyTitle.style.fontSize = '11px';
    keyTitle.style.letterSpacing = '1px';
    keySec.appendChild(keyTitle);

    this.keyGrid = document.createElement('div');
    this.keyGrid.style.display = 'grid';
    this.keyGrid.style.gridTemplateColumns = '120px 1fr';
    this.keyGrid.style.gap = '3px 8px';
    this.keyGrid.style.fontSize = '11px';
    keySec.appendChild(this.keyGrid);

    this.content.appendChild(keySec);
    this.updateControlsKeyList();
  }

  updateControlsKeyList() {
    if (!this.keyGrid) return;
    this.keyGrid.innerHTML = '';
    const ctrl = gameState.settings?.controls || { attackButton: 'right', blockButton: 'left' };
    const atkStr = ctrl.attackButton === 'left' ? 'LEFT CLICK' : 'RIGHT CLICK';
    const blkStr = ctrl.blockButton === 'right' ? 'RIGHT CLICK (HOLD)' : 'LEFT CLICK (HOLD)';

    const keysList = [
      [atkStr, 'ATTACK (3-hit combo, 1 per press)'],
      [blkStr, 'BLOCK (hold to raise shield; parry)'],
      ['F', 'Shield bash while blocking / attack alias'],
      ['Q', 'Roll / Dodge evasion'],
      ['WASD', 'Move player character'],
      ['E', 'Interact with building / door / item'],
      ['C', 'Squad Command Wheel (hold)'],
      ['X', 'Toggle Auto-combat mode'],
      ['Arrows', 'Rotate camera yaw & pitch'],
      ['Wheel', 'Zoom camera in / out'],
      ['R', 'Open Hero Roster'],
      ['T', 'Deploy / Enter Tower Gate'],
      ['O', 'Toggle Options Window'],
      ['M', 'Toggle Audio Mute'],
      ['\\', 'Toggle Ground & surfaces debug overlay'],
    ];

    keysList.forEach(([k, desc]) => {
      const kEl = document.createElement('span');
      kEl.textContent = k;
      kEl.style.color = '#6fe0f0';
      kEl.style.fontWeight = 'bold';
      const dEl = document.createElement('span');
      dEl.textContent = desc;
      dEl.style.color = '#aaaaaa';
      this.keyGrid.appendChild(kEl);
      this.keyGrid.appendChild(dEl);
    });
  }

  updateQualityBtnStyles() {
    const q = gameState.settings?.quality || 'medium';
    for (const [key, btn] of Object.entries(this.qualityBtns || {})) {
      const isSel = key === q;
      btn.style.backgroundColor = isSel ? 'rgba(111, 224, 240, 0.25)' : 'rgba(20, 15, 30, 0.7)';
      btn.style.color = isSel ? '#6fe0f0' : '#cccccc';
      btn.style.boxShadow = isSel ? '0 0 8px rgba(111, 224, 240, 0.4)' : 'none';
    }
  }

  updateCamSpeedBtnStyles() {
    const spd = gameState.settings?.camera?.followSpeed || 'tight';
    for (const [key, btn] of Object.entries(this.camSpeedBtns || {})) {
      const isSel = key === spd;
      btn.style.backgroundColor = isSel ? 'rgba(111, 224, 240, 0.25)' : 'rgba(20, 15, 30, 0.7)';
      btn.style.color = isSel ? '#6fe0f0' : '#cccccc';
    }
  }

  updateCamDistBtnStyles() {
    const dist = gameState.settings?.camera?.distance || 'normal';
    for (const [key, btn] of Object.entries(this.camDistBtns || {})) {
      const isSel = key === dist;
      btn.style.backgroundColor = isSel ? 'rgba(111, 224, 240, 0.25)' : 'rgba(20, 15, 30, 0.7)';
      btn.style.color = isSel ? '#6fe0f0' : '#cccccc';
    }
  }

  open() {
    this.buildUI();
    super.open();
  }
}
