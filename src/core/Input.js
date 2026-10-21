// src/core/Input.js
import { gameState } from './GameState.js';
import { isAnySystemWindowOpen } from '../ui/Hud.js';

export class Input {
  constructor(domElement) {
    this.domElement = domElement;
    this.keys = new Set();
    this.mouseButtons = new Set();
    this.mouseDelta = { x: 0, y: 0 };
    this.isLocked = false;
    this._actionListeners = new Map();

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        this.keys.add(e.code);
      });

      window.addEventListener('keyup', (e) => {
        this.keys.delete(e.code);
      });

      // Canvas pointer events
      if (this.domElement) {
        this.domElement.addEventListener('contextmenu', (e) => {
          e.preventDefault();
        });

        this.domElement.addEventListener('pointerdown', (e) => {
          if (e.target !== this.domElement) return;
          if (this.isBlockedByUI()) return;

          this.mouseButtons.add(e.button);
          this.handlePointerDown(e);
        });

        this.domElement.addEventListener('pointerup', (e) => {
          this.mouseButtons.delete(e.button);
        });

        this.domElement.addEventListener('pointerleave', () => {
          this.mouseButtons.clear();
        });

        window.addEventListener('pointermove', (e) => {
          this.mouseDelta.x += e.movementX || 0;
          this.mouseDelta.y += e.movementY || 0;
        });
      }

      window.addEventListener('contextmenu', (e) => {
        if (e.target === this.domElement) {
          e.preventDefault();
        }
      });
    }
  }

  isBlockedByUI() {
    if (typeof document === 'undefined') return false;
    if (typeof isAnySystemWindowOpen === 'function' && isAnySystemWindowOpen()) return true;
    const wheel = document.getElementById('pm-command-wheel') || document.getElementById('command-wheel');
    if (wheel && wheel.style.display !== 'none' && wheel.style.opacity !== '0') return true;
    return false;
  }

  getActionButton(action) {
    const controls = gameState?.settings?.controls || { attackButton: 'left', blockButton: 'right' };
    const btn = controls[action + 'Button'];
    if (btn === 'left') return 0;
    if (btn === 'right') return 2;
    return action === 'attack' ? 0 : 2;
  }

  isActionDown(action) {
    if (this.isLocked || this.isBlockedByUI()) return false;
    const btn = this.getActionButton(action);
    return this.mouseButtons.has(btn);
  }

  handlePointerDown(e) {
    const attackBtn = this.getActionButton('attack');
    const blockBtn = this.getActionButton('block');

    if (e.button === attackBtn) {
      this.triggerAction('attack');
    } else if (e.button === blockBtn) {
      this.triggerAction('block');
    }
  }

  onAction(action, callback) {
    if (!this._actionListeners.has(action)) {
      this._actionListeners.set(action, new Set());
    }
    this._actionListeners.get(action).add(callback);
    return () => this._actionListeners.get(action)?.delete(callback);
  }

  triggerAction(action) {
    const listeners = this._actionListeners.get(action);
    if (listeners) {
      for (const cb of listeners) {
        cb();
      }
    }
  }

  isDown(code) {
    if (this.isLocked) return false;
    return this.keys.has(code);
  }

  isMouseButtonDown(button) {
    if (this.isLocked || this.isBlockedByUI()) return false;
    return this.mouseButtons.has(button);
  }

  isRmbDown() {
    return this.isMouseButtonDown(2);
  }

  isLmbDown() {
    return this.isMouseButtonDown(0);
  }

  consumeMouseDelta() {
    const delta = { x: this.mouseDelta.x, y: this.mouseDelta.y };
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    return delta;
  }
}
