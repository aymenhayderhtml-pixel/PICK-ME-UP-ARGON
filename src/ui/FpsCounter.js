// src/ui/FpsCounter.js
import { gameState } from '../core/GameState.js';

class FpsCounter {
  constructor() {
    this.container = null;
    this.fpsValueEl = null;
    this.qualityEl = null;
    this.visible = true;

    this.frameCount = 0;
    this.lastTime = performance.now();
    this.updateTimer = 0;
    this.currentFps = 60;

    if (typeof document !== 'undefined') {
      this.initUI();
      this.initEvents();
      this.startLoop();
    }
  }

  initUI() {
    this.container = document.createElement('div');
    this.container.id = 'fps-counter-overlay';
    this.container.style.position = 'fixed';
    this.container.style.bottom = '12px';
    this.container.style.right = '12px';
    this.container.style.zIndex = '10005';
    this.container.style.pointerEvents = 'none';
    this.container.style.backgroundColor = 'rgba(11, 8, 16, 0.88)';
    this.container.style.border = '1px solid var(--frame, #ffd36b)';
    this.container.style.borderRadius = '4px';
    this.container.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.6)';
    this.container.style.padding = '4px 10px';
    this.container.style.fontFamily = 'monospace, sans-serif';
    this.container.style.fontSize = '12px';
    this.container.style.display = 'flex';
    this.container.style.alignItems = 'baseline';
    this.container.style.gap = '8px';
    this.container.style.color = '#ffffff';

    this.fpsValueEl = document.createElement('span');
    this.fpsValueEl.textContent = 'FPS 60';
    this.fpsValueEl.style.fontWeight = 'bold';
    this.fpsValueEl.style.color = '#4ade80';

    this.qualityEl = document.createElement('span');
    this.qualityEl.style.fontSize = '10px';
    this.qualityEl.style.opacity = '0.75';
    this.qualityEl.style.letterSpacing = '0.5px';
    this.qualityEl.style.color = 'var(--frame, #ffd36b)';
    this.qualityEl.textContent = 'MEDIUM';

    this.container.appendChild(this.fpsValueEl);
    this.container.appendChild(this.qualityEl);
    document.body.appendChild(this.container);

    // Default ON unless explicitly disabled in settings
    const show = gameState.settings?.showFps ?? true;
    this.setVisible(show);
  }

  initEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote') {
        e.preventDefault();
        const next = !this.visible;
        this.setVisible(next);
        if (gameState.settings) {
          gameState.settings.showFps = next;
          gameState.saveToLocalStorage();
        }
      }
    });
  }

  setVisible(show) {
    this.visible = Boolean(show);
    if (this.container) {
      this.container.style.display = this.visible ? 'flex' : 'none';
    }
  }

  isVisible() {
    return this.visible;
  }

  setQuality(qualityStr) {
    if (this.qualityEl && qualityStr) {
      this.qualityEl.textContent = qualityStr.toUpperCase();
    }
  }

  startLoop() {
    const loop = (now) => {
      this.frameCount++;
      const dt = (now - this.lastTime) / 1000;

      // 4 updates per second = every 0.25s
      this.updateTimer += dt;
      this.lastTime = now;

      if (this.updateTimer >= 0.25) {
        this.currentFps = Math.round(this.frameCount / this.updateTimer);
        this.frameCount = 0;
        this.updateTimer = 0;

        if (this.visible && this.fpsValueEl) {
          const fps = this.currentFps;
          const color = fps >= 50 ? '#4ade80' : fps >= 30 ? '#facc15' : '#f87171';
          this.fpsValueEl.textContent = `FPS ${fps}`;
          this.fpsValueEl.style.color = color;

          const currentQ = (gameState.settings?.quality || 'medium').toUpperCase();
          if (this.qualityEl && this.qualityEl.textContent !== currentQ) {
            this.qualityEl.textContent = currentQ;
          }
        }
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}

export const fpsCounter = new FpsCounter();
