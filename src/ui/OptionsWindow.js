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

    this.container.style.width = '480px';
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

    // 1. Quality Setting
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

    // 2. Resolution Scale Setting
    const resRow = document.createElement('div');
    resRow.style.display = 'flex';
    resRow.style.flexDirection = 'column';
    resRow.style.gap = '6px';

    const resLabel = document.createElement('div');
    resLabel.textContent = 'RESOLUTION SCALE';
    resLabel.style.fontWeight = 'bold';
    resLabel.style.color = 'var(--frame, #ffd36b)';
    resLabel.style.letterSpacing = '1px';
    resRow.appendChild(resLabel);

    const resBtnGroup = document.createElement('div');
    resBtnGroup.style.display = 'flex';
    resBtnGroup.style.gap = '8px';

    const resScales = [
      { id: 1, label: '100% (NATIVE)' },
      { id: 0.75, label: '75% (PERFORMANCE)' }
    ];
    this.resBtns = {};

    resScales.forEach((rs) => {
      const btn = document.createElement('button');
      btn.textContent = rs.label;
      btn.style.flex = '1';
      btn.style.padding = '8px 12px';
      btn.style.fontFamily = 'monospace';
      btn.style.fontSize = '12px';
      btn.style.cursor = 'pointer';
      btn.style.border = '1px solid var(--frame-inner, #4a3e66)';
      btn.style.borderRadius = '4px';
      const isSel = Math.abs(settings.resolutionScale - rs.id) < 0.05;
      btn.style.backgroundColor = isSel ? 'rgba(111, 224, 240, 0.25)' : 'rgba(20, 15, 30, 0.7)';
      btn.style.color = isSel ? '#6fe0f0' : '#cccccc';
      btn.style.boxShadow = isSel ? '0 0 8px rgba(111, 224, 240, 0.4)' : 'none';

      btn.addEventListener('click', () => {
        settings.resolutionScale = rs.id;
        gameState.saveToLocalStorage();
        this.updateResBtnStyles();
        this.onResolutionChange(rs.id);
      });

      this.resBtns[rs.id] = btn;
      resBtnGroup.appendChild(btn);
    });
    resRow.appendChild(resBtnGroup);
    this.content.appendChild(resRow);

    // 3. FPS Overlay & Audio Controls
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

    // 4. Keyboard Controls Reference
    const keySec = document.createElement('div');
    keySec.style.display = 'flex';
    keySec.style.flexDirection = 'column';
    keySec.style.gap = '6px';
    keySec.style.backgroundColor = 'rgba(15, 12, 24, 0.6)';
    keySec.style.border = '1px solid rgba(74, 62, 102, 0.4)';
    keySec.style.borderRadius = '4px';
    keySec.style.padding = '8px 12px';

    const keyTitle = document.createElement('div');
    keyTitle.textContent = 'KEYBOARD SHORTCUTS';
    keyTitle.style.fontWeight = 'bold';
    keyTitle.style.color = 'var(--gold, #ffc27a)';
    keyTitle.style.fontSize = '11px';
    keyTitle.style.letterSpacing = '1px';
    keySec.appendChild(keyTitle);

    const keysList = [
      ['WASD', 'Move player character'],
      ['Arrows', 'Rotate & pitch camera'],
      ['Wheel', 'Zoom camera in / out'],
      ['E', 'Interact with building / door'],
      ['R', 'Open Hero Roster'],
      ['T', 'Deploy / Enter Tower Gate'],
      ['O', 'Toggle Options Window'],
      ['M', 'Toggle Audio Mute'],
      ['[ / ]', 'Shift time of day by -/+ 0.05'],
      ['Shift+[', 'Pause / resume day cycle'],
      ['Shift+]', 'Jump to next keyframe'],
      ['F3', 'Toggle diagnostics & render stats'],
      ['F6', 'Toggle NavGrid & colliders debug'],
      ['F7', 'Ground height alignment audit'],
    ];

    const keyGrid = document.createElement('div');
    keyGrid.style.display = 'grid';
    keyGrid.style.gridTemplateColumns = '80px 1fr';
    keyGrid.style.gap = '3px 8px';
    keyGrid.style.fontSize = '11px';

    keysList.forEach(([k, desc]) => {
      const kEl = document.createElement('span');
      kEl.textContent = k;
      kEl.style.color = '#6fe0f0';
      kEl.style.fontWeight = 'bold';
      const dEl = document.createElement('span');
      dEl.textContent = desc;
      dEl.style.color = '#aaaaaa';
      keyGrid.appendChild(kEl);
      keyGrid.appendChild(dEl);
    });

    keySec.appendChild(keyGrid);
    this.content.appendChild(keySec);
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

  updateResBtnStyles() {
    const rs = gameState.settings?.resolutionScale ?? 1;
    for (const [key, btn] of Object.entries(this.resBtns || {})) {
      const isSel = Math.abs(parseFloat(key) - rs) < 0.05;
      btn.style.backgroundColor = isSel ? 'rgba(111, 224, 240, 0.25)' : 'rgba(20, 15, 30, 0.7)';
      btn.style.color = isSel ? '#6fe0f0' : '#cccccc';
      btn.style.boxShadow = isSel ? '0 0 8px rgba(111, 224, 240, 0.4)' : 'none';
    }
  }

  open() {
    this.buildUI();
    super.open();
  }
}
