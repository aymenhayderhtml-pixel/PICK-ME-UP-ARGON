import { SystemWindow } from './SystemWindow.js';
import { gameState } from '../core/GameState.js';
import { fpsCounter } from './FpsCounter.js';

const GOLD = 'var(--gold, #ffd36b)';
const FRAME_INNER = 'var(--frame-inner, #5b4a8a)';
const OK = 'var(--ok, #7dffb0)';
const TEXT = 'var(--text, #d0d7de)';

/** Repaints a segmented button group so the active option reads as a gold pill. */
function paintSegmented(buttons, activeId) {
  Object.entries(buttons || {}).forEach(([id, btn]) => {
    const on = id === String(activeId);
    btn.style.backgroundColor = on ? 'rgba(255, 211, 107, 0.18)' : 'rgba(20, 15, 30, 0.7)';
    btn.style.color = on ? GOLD : '#9a9a9a';
    btn.style.borderColor = on ? GOLD : FRAME_INNER;
    btn.style.boxShadow = on ? '0 0 8px rgba(255, 211, 107, 0.35)' : 'none';
  });
}

/** A bordered section card with a gold accent bar and a spaced title. */
function createSection(titleText) {
  const section = document.createElement('div');
  section.style.display = 'flex';
  section.style.flexDirection = 'column';
  section.style.gap = '9px';
  section.style.backgroundColor = 'rgba(15, 12, 24, 0.55)';
  section.style.border = `1px solid ${FRAME_INNER}`;
  section.style.borderRadius = '6px';
  section.style.padding = '10px 12px';

  const head = document.createElement('div');
  head.style.display = 'flex';
  head.style.alignItems = 'center';
  head.style.gap = '8px';

  const accent = document.createElement('div');
  accent.style.width = '3px';
  accent.style.height = '13px';
  accent.style.borderRadius = '1px';
  accent.style.background = GOLD;
  accent.style.boxShadow = '0 0 6px rgba(255, 211, 107, 0.6)';

  const title = document.createElement('span');
  title.textContent = titleText;
  title.style.fontWeight = 'bold';
  title.style.color = GOLD;
  title.style.fontSize = '11px';
  title.style.letterSpacing = '1.5px';

  head.appendChild(accent);
  head.appendChild(title);
  section.appendChild(head);
  return section;
}

/** Small grey field caption used above a segmented group. */
function createFieldLabel(text) {
  const label = document.createElement('div');
  label.textContent = text;
  label.style.fontSize = '10px';
  label.style.fontWeight = 'bold';
  label.style.color = '#8fa3b8';
  label.style.letterSpacing = '1px';
  return label;
}

/** Builds a segmented pill group. Returns the row and the id -> button map. */
function createSegmented(options, activeId, onSelect) {
  const group = document.createElement('div');
  group.style.display = 'flex';
  group.style.gap = '6px';

  const buttons = {};
  options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.textContent = opt.label;
    btn.style.flex = '1';
    btn.style.padding = '6px 4px';
    btn.style.fontFamily = 'monospace, sans-serif';
    btn.style.fontSize = '11px';
    btn.style.fontWeight = 'bold';
    btn.style.cursor = 'pointer';
    btn.style.borderRadius = '4px';
    btn.style.border = `1px solid ${FRAME_INNER}`;
    btn.style.backgroundColor = 'rgba(20, 15, 30, 0.7)';
    btn.style.color = '#9a9a9a';
    btn.style.transition = 'background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease';
    btn.addEventListener('click', () => onSelect(opt.id));
    buttons[opt.id] = btn;
    group.appendChild(btn);
  });

  paintSegmented(buttons, activeId);
  return { group, buttons };
}

/**
 * A real switch: a hidden native checkbox drives the state, the visible
 * track and knob are painted from it. Clicking the label or the track both
 * toggle it exactly once.
 */
function createSwitch(labelText, checked, onChange, id) {
  const row = document.createElement('div');
  row.style.position = 'relative';
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.justifyContent = 'space-between';
  row.style.gap = '12px';

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.id = id;
  check.checked = checked;
  check.setAttribute('aria-label', labelText);
  check.style.position = 'absolute';
  check.style.top = '0';
  check.style.left = '0';
  check.style.width = '1px';
  check.style.height = '1px';
  check.style.opacity = '0';

  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = labelText;
  label.style.fontSize = '12px';
  label.style.cursor = 'pointer';
  label.style.color = checked ? TEXT : '#8fa3b8';

  const track = document.createElement('div');
  track.style.position = 'relative';
  track.style.width = '40px';
  track.style.height = '18px';
  track.style.flex = '0 0 auto';
  track.style.borderRadius = '9px';
  track.style.border = `1px solid ${FRAME_INNER}`;
  track.style.backgroundColor = 'rgba(0, 0, 0, 0.55)';
  track.style.cursor = 'pointer';
  track.style.transition = 'background-color 0.15s ease, border-color 0.15s ease';

  const knob = document.createElement('div');
  knob.style.position = 'absolute';
  knob.style.top = '2px';
  knob.style.left = '2px';
  knob.style.width = '12px';
  knob.style.height = '12px';
  knob.style.borderRadius = '50%';
  knob.style.backgroundColor = '#6a6a7a';
  knob.style.transition = 'left 0.15s ease, background-color 0.15s ease';
  track.appendChild(knob);

  const paint = (on) => {
    track.style.backgroundColor = on ? 'rgba(125, 255, 176, 0.22)' : 'rgba(0, 0, 0, 0.55)';
    track.style.borderColor = on ? OK : FRAME_INNER;
    knob.style.left = on ? '24px' : '2px';
    knob.style.backgroundColor = on ? OK : '#6a6a7a';
    label.style.color = on ? TEXT : '#8fa3b8';
  };

  check.addEventListener('change', () => {
    paint(check.checked);
    onChange(check.checked);
  });

  track.addEventListener('click', () => {
    check.checked = !check.checked;
    paint(check.checked);
    onChange(check.checked);
  });

  row.appendChild(check);
  row.appendChild(label);
  row.appendChild(track);
  paint(checked);
  return row;
}

export class OptionsWindow extends SystemWindow {
  constructor(options = {}) {
    super('SYSTEM OPTIONS');
    this.onQualityChange = options.onQualityChange || (() => {});
    this.onResolutionChange = options.onResolutionChange || (() => {});
    this.onFpsToggle = options.onFpsToggle || (() => {});
    this.onVolumeChange = options.onVolumeChange || (() => {});

    this.container.style.width = '640px';
    this.container.style.maxWidth = '92vw';
    this.container.style.maxHeight = 'calc(100vh - 40px)';
    this.container.style.boxSizing = 'border-box';
    this.titleBar.style.flex = '0 0 auto';

    // The base class leaves an empty content element behind: hide it so the
    // options sections start right under the title bar.
    this.contentElement.style.display = 'none';

    this.content = document.createElement('div');
    this.content.style.padding = '14px 18px';
    this.content.style.display = 'flex';
    this.content.style.flexDirection = 'column';
    this.content.style.gap = '12px';
    this.content.style.flex = '1 1 auto';
    this.content.style.minHeight = '0';
    this.content.style.overflowY = 'auto';
    this.content.style.color = TEXT;
    this.content.style.fontSize = '13px';
    this.container.appendChild(this.content);

    this.buildUI();
  }

  buildUI() {
    this.content.innerHTML = '';
    const settings = gameState.settings || { quality: 'medium', resolutionScale: 1, showFps: false };
    if (!settings.controls) settings.controls = { attackButton: 'left', blockButton: 'right' };
    if (!settings.camera) settings.camera = { followSpeed: 'tight', autoTurn: true, distance: 'normal' };

    // --- 1. DISPLAY -------------------------------------------------------
    const displaySec = createSection('DISPLAY');
    displaySec.appendChild(createFieldLabel('GRAPHICS QUALITY'));

    const quality = createSegmented(
      [
        { id: 'low', label: 'LOW' },
        { id: 'medium', label: 'MEDIUM' },
        { id: 'high', label: 'HIGH' },
      ],
      settings.quality || 'medium',
      (id) => {
        settings.quality = id;
        gameState.saveToLocalStorage();
        this.updateQualityBtnStyles();
        this.onQualityChange(id);
      }
    );
    this.qualityBtns = quality.buttons;
    displaySec.appendChild(quality.group);

    displaySec.appendChild(createFieldLabel('RESOLUTION SCALE'));

    const resolution = createSegmented(
      [
        { id: '0.5', label: '50%' },
        { id: '0.75', label: '75%' },
        { id: '1', label: '100%' },
      ],
      settings.resolutionScale ?? 1,
      (id) => {
        settings.resolutionScale = parseFloat(id);
        gameState.saveToLocalStorage();
        this.updateResolutionBtnStyles();
        this.onResolutionChange(settings.resolutionScale);
      }
    );
    this.resolutionBtns = resolution.buttons;
    displaySec.appendChild(resolution.group);

    displaySec.appendChild(
      createSwitch('SHOW FPS COUNTER', settings.showFps ?? true, (on) => {
        settings.showFps = on;
        gameState.saveToLocalStorage();
        fpsCounter.setVisible(on);
        this.onFpsToggle(on);
      }, 'opt-fps-toggle')
    );

    this.content.appendChild(displaySec);

    // --- 2. CAMERA --------------------------------------------------------
    const camSec = createSection('CAMERA');
    camSec.appendChild(createFieldLabel('FOLLOW SPEED'));

    const speed = createSegmented(
      [
        { id: 'tight', label: 'TIGHT' },
        { id: 'normal', label: 'NORMAL' },
        { id: 'loose', label: 'LOOSE' },
      ],
      settings.camera.followSpeed || 'tight',
      (id) => {
        settings.camera.followSpeed = id;
        gameState.saveToLocalStorage();
        this.updateCamSpeedBtnStyles();
      }
    );
    this.camSpeedBtns = speed.buttons;
    camSec.appendChild(speed.group);

    camSec.appendChild(createFieldLabel('CAMERA DISTANCE'));

    const distance = createSegmented(
      [
        { id: 'near', label: 'NEAR' },
        { id: 'normal', label: 'NORMAL' },
        { id: 'far', label: 'FAR' },
      ],
      settings.camera.distance || 'normal',
      (id) => {
        settings.camera.distance = id;
        gameState.saveToLocalStorage();
        this.updateCamDistBtnStyles();
      }
    );
    this.camDistBtns = distance.buttons;
    camSec.appendChild(distance.group);

    this.content.appendChild(camSec);

    // --- 3. COMBAT CONTROLS ----------------------------------------------
    const ctrlSec = createSection('COMBAT CONTROLS');
    // The switch is ON when the buttons are swapped from the default
    // (default: LEFT = ATTACK, RIGHT = BLOCK).
    ctrlSec.appendChild(
      createSwitch('SWAP ATTACK & BLOCK BUTTONS', settings.controls.attackButton === 'right', (on) => {
        if (on) {
          settings.controls.attackButton = 'right';
          settings.controls.blockButton = 'left';
        } else {
          settings.controls.attackButton = 'left';
          settings.controls.blockButton = 'right';
        }
        gameState.saveToLocalStorage();
        this.updateControlsKeyList();
      }, 'opt-swap-buttons')
    );

    const ctrlHint = document.createElement('div');
    ctrlHint.textContent = 'OFF: LEFT CLICK ATTACKS, RIGHT CLICK BLOCKS. ON: REVERSED.';
    ctrlHint.style.fontSize = '10px';
    ctrlHint.style.color = '#7f8fa0';
    ctrlHint.style.letterSpacing = '0.5px';
    ctrlSec.appendChild(ctrlHint);

    this.content.appendChild(ctrlSec);

    // --- 4. AUDIO ---------------------------------------------------------
    const audioSec = createSection('AUDIO');

    const volHead = document.createElement('div');
    volHead.style.display = 'flex';
    volHead.style.alignItems = 'center';
    volHead.style.justifyContent = 'space-between';

    const volLabel = createFieldLabel('MASTER VOLUME');
    volHead.appendChild(volLabel);

    const volValue = document.createElement('span');
    volValue.style.fontSize = '11px';
    volValue.style.fontWeight = 'bold';
    volValue.style.color = GOLD;
    volHead.appendChild(volValue);

    audioSec.appendChild(volHead);

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
    volSlider.style.width = '100%';
    volSlider.style.accentColor = GOLD;

    const showVol = (v) => {
      volValue.textContent = `${Math.round(v * 100)}%`;
    };
    showVol(curVol);

    volSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (typeof window !== 'undefined') {
        if (!window.__audioMaster) window.__audioMaster = { isMuted: false, masterVolume: 0.3 };
        window.__audioMaster.masterVolume = v;
      }
      showVol(v);
      this.onVolumeChange(v);
    });

    audioSec.appendChild(volSlider);
    this.content.appendChild(audioSec);

    // --- 5. CONTROLS REFERENCE -------------------------------------------
    const keySec = createSection('CONTROLS REFERENCE');

    this.keyGrid = document.createElement('div');
    this.keyGrid.style.display = 'grid';
    this.keyGrid.style.gridTemplateColumns = 'auto 1fr auto 1fr';
    this.keyGrid.style.gap = '6px 14px';
    this.keyGrid.style.alignItems = 'center';
    keySec.appendChild(this.keyGrid);

    this.content.appendChild(keySec);
    this.updateControlsKeyList();
  }

  updateControlsKeyList() {
    if (!this.keyGrid) return;
    this.keyGrid.innerHTML = '';
    const ctrl = gameState.settings?.controls || { attackButton: 'left', blockButton: 'right' };
    const atkStr = ctrl.attackButton === 'left' ? 'LEFT CLICK' : 'RIGHT CLICK';
    const blkStr = ctrl.blockButton === 'right' ? 'RIGHT CLICK (HOLD)' : 'LEFT CLICK (HOLD)';

    const keysList = [
      ['MOUSE', 'ROTATE CAMERA (CLICK TO CAPTURE)'],
      ['ARROWS', 'ROTATE CAMERA'],
      [atkStr, 'ATTACK (3-HIT COMBO)'],
      [blkStr, 'BLOCK (HOLD TO PARRY)'],
      ['F', 'SHIELD BASH / ATTACK ALIAS'],
      ['Q', 'ROLL / DODGE'],
      ['WASD', 'MOVE CHARACTER'],
      ['E', 'INTERACT'],
      ['C', 'SQUAD COMMAND WHEEL (HOLD)'],
      ['X', 'TOGGLE AUTO-COMBAT'],
      ['WHEEL', 'ZOOM CAMERA'],
      ['R', 'OPEN HERO ROSTER'],
      ['T', 'DEPLOY / TOWER GATE'],
      ['O', 'TOGGLE OPTIONS'],
      ['M', 'TOGGLE AUDIO MUTE'],
      ['\\', 'GROUND & SURFACE DEBUG'],
    ];

    const makeKey = (text) => {
      const el = document.createElement('span');
      el.textContent = text;
      el.style.fontFamily = 'monospace, sans-serif';
      el.style.fontSize = '10px';
      el.style.fontWeight = 'bold';
      el.style.color = GOLD;
      el.style.background = 'rgba(0, 0, 0, 0.45)';
      el.style.border = `1px solid ${FRAME_INNER}`;
      el.style.borderRadius = '3px';
      el.style.padding = '1px 6px';
      el.style.justifySelf = 'start';
      el.style.whiteSpace = 'nowrap';
      return el;
    };

    const makeDesc = (text) => {
      const el = document.createElement('span');
      el.textContent = text;
      el.style.fontSize = '10px';
      el.style.color = '#9fb0c0';
      el.style.letterSpacing = '0.3px';
      return el;
    };

    // Two key/description pairs per row.
    for (let i = 0; i < keysList.length; i += 2) {
      const left = keysList[i];
      const right = keysList[i + 1];
      this.keyGrid.appendChild(makeKey(left[0]));
      this.keyGrid.appendChild(makeDesc(left[1]));
      if (right) {
        this.keyGrid.appendChild(makeKey(right[0]));
        this.keyGrid.appendChild(makeDesc(right[1]));
      }
    }
  }

  updateQualityBtnStyles() {
    paintSegmented(this.qualityBtns, gameState.settings?.quality || 'medium');
  }

  updateResolutionBtnStyles() {
    paintSegmented(this.resolutionBtns, gameState.settings?.resolutionScale ?? 1);
  }

  updateCamSpeedBtnStyles() {
    paintSegmented(this.camSpeedBtns, gameState.settings?.camera?.followSpeed || 'tight');
  }

  updateCamDistBtnStyles() {
    paintSegmented(this.camDistBtns, gameState.settings?.camera?.distance || 'normal');
  }

  open() {
    this.buildUI();
    super.open();
  }
}
