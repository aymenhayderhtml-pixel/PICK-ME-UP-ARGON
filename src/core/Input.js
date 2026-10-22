// src/core/Input.js
import { gameState } from './GameState.js';
import { isAnySystemWindowOpen } from '../ui/Hud.js';

// The root element of every system window (see SystemWindow.js). The camera
// zooms on the 'wheel' events that reach `window`, so a wheel over the UI has
// to be stopped before it gets there.
const SYSTEM_WINDOW_SELECTOR = '.mm-system-window';

export class Input {
  constructor(domElement) {
    this.domElement = domElement;
    this.keys = new Set();
    this.mouseButtons = new Set();
    this.mouseDelta = { x: 0, y: 0 };
    this.isLocked = false;
    this.pointerCaptured = false;
    this.wantPointerLock = false;
    this.pointerLockDeadline = 0;
    this.pointerLockNextTry = 0;
    this.overlayWasOpen = false;
    this._actionListeners = new Map();

    if (typeof document !== 'undefined') {
      document.addEventListener('pointerlockchange', () => {
        this.pointerCaptured = Boolean(document.pointerLockElement);
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        this.keys.add(e.code);
      });

      window.addEventListener('keyup', (e) => {
        this.keys.delete(e.code);
      });

      // A key held while the window loses focus never delivers its keyup, so
      // it would stay "down" and walk the character on its own.
      window.addEventListener('blur', () => {
        this.keys.clear();
        this.mouseButtons.clear();
      });

      // Canvas pointer events
      if (this.domElement) {
        this.domElement.addEventListener('contextmenu', (e) => {
          e.preventDefault();
        });

        this.domElement.addEventListener('pointerdown', (e) => {
          if (e.target !== this.domElement) return;
          if (this.isBlockedByUI()) return;

          // Capture the pointer so the camera can be turned without the
          // mouse running out of screen.
          this.requestPointerLock();

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
          // Only steer the camera from movement over the game canvas: the HUD
          // and the menus live in the DOM above it.
          if (this.domElement && e.target !== this.domElement) return;
          this.mouseDelta.x += e.movementX || 0;
          this.mouseDelta.y += e.movementY || 0;
        });
      }

      window.addEventListener('contextmenu', (e) => {
        if (e.target === this.domElement) {
          e.preventDefault();
        }
      });

      // Wheel guard. The third-person camera zooms on every 'wheel' event
      // that reaches `window`, so a wheel over an open window zoomed the
      // camera behind the UI. `document` bubbles before `window`, so
      // stopping the propagation here keeps the wheel inside the window.
      // Passive, and never preventDefault: the scrollable lists keep
      // scrolling natively. The camera applies the zoom the moment it gets
      // the event, so a stopped wheel is never applied later either.
      if (typeof document !== 'undefined') {
        document.addEventListener(
          'wheel',
          (e) => {
            if (!this.isWheelBlockedByUI(e.target)) return;
            e.stopPropagation();
          },
          { passive: true }
        );
      }
    }
  }

  /**
   * True when a wheel event belongs to the UI and must not reach the camera:
   * the pointer is over a system window, a system window is open (the camera
   * never steers over a menu), or a pointer overlay (the tutorial dialogue,
   * the equipment notice) is up.
   */
  isWheelBlockedByUI(target) {
    if (typeof document === 'undefined') return false;
    if (target && typeof target.closest === 'function') {
      if (target.closest(SYSTEM_WINDOW_SELECTOR)) return true;
    }
    if (typeof isAnySystemWindowOpen === 'function' && isAnySystemWindowOpen()) return true;
    return this.hasPointerOverlay();
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

  /**
   * Hides the OS cursor while the player is in the world and restores it for
   * the UI windows. The mouse steers the camera, so a pointer floating over
   * the canvas is just noise.
   */
  setCursorHidden(hidden) {
    if (typeof document === 'undefined') return;
    const next = hidden ? 'none' : '';
    if (document.body.style.cursor !== next) {
      document.body.style.cursor = next;
    }
  }

  /** Captures the pointer so the mouse can turn the camera without limits. */
  requestPointerLock() {
    if (typeof document === 'undefined') return;
    const el = this.domElement || document.body;
    if (document.pointerLockElement) return;
    if (typeof el.requestPointerLock !== 'function') return;
    try {
      const result = el.requestPointerLock();
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch (e) {
      // The browser refuses a lock without a fresh user gesture.
    }
  }

  /** Releases the captured pointer so the UI can be used. */
  exitPointerLock() {
    if (typeof document === 'undefined') return;
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  /**
   * Overlays that are not system windows but still need the pointer: the
   * Iselle tutorial dialogue and the equipment notice. Both remove
   * themselves from the DOM when they close.
   */
  hasPointerOverlay() {
    if (typeof document === 'undefined') return false;
    return Boolean(
      document.getElementById('iselle-tutorial-dialog') ||
      document.getElementById('mm-equipment-notice')
    );
  }

  /**
   * Decides the cursor state:
   * - an overlay is up: release the capture and show the pointer.
   * - the pointer is captured: the browser hides it, keep it that way.
   * - otherwise: show the pointer so the player can click to capture it.
   */
  updateCursor(systemWindowOpen = false) {
    const overlayOpen = systemWindowOpen || this.hasPointerOverlay();
    const wasOpen = this.overlayWasOpen;
    this.overlayWasOpen = overlayOpen;
    const now = performance.now();

    if (overlayOpen) {
      this.exitPointerLock();
      this.wantPointerLock = false;
      this.setCursorHidden(false);
      return;
    }

    if (wasOpen) {
      // The overlay just closed: grab the pointer again.
      this.wantPointerLock = true;
      this.pointerLockDeadline = now + 1500;
      this.pointerLockNextTry = now;
    }

    if (this.pointerCaptured) {
      this.wantPointerLock = false;
      this.setCursorHidden(true);
      return;
    }

    this.setCursorHidden(false);

    // Retry for a moment: the browser only grants a lock while the page
    // still has a fresh user gesture.
    if (this.wantPointerLock && now < this.pointerLockDeadline && now >= this.pointerLockNextTry) {
      this.pointerLockNextTry = now + 100;
      this.requestPointerLock();
    }
  }
}
