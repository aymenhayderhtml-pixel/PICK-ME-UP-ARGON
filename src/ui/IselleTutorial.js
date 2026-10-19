import { gameState } from '../core/GameState.js';
import { attachOrnateCorners } from './ornaments.js';
import { drawIsellePortrait } from '../art/iselle.js';

export class IselleTutorial {
  constructor(onComplete, iselle = null) {
    this.onComplete = onComplete;
    this.iselle = iselle || (typeof window !== 'undefined' ? window.__iselleRig : null);
    this.step = 0;
    this.dialogEl = null;
    this.expression = 'sweet_cruel';
  }

  getSteps() {
    const masterName = gameState.masterName || 'MASTER';
    return [
      {
        topic: 'THE MASTER',
        text: `MASTER ${masterName}, you command our town, heroes, and resources from above.`,
      },
      {
        topic: 'SUMMONING',
        text: `MASTER ${masterName}, use the Summoning House to call brave heroes across dimensions.`,
      },
      {
        topic: 'PERMADEATH',
        text: `MASTER ${masterName}, death in the Tower is permanent. Fallen heroes never return.`,
      },
      {
        topic: 'THE TOWER',
        text: `MASTER ${masterName}, command Han and your squad to conquer all 100 floors.`,
      },
      {
        topic: 'SYNTHESIS',
        text: `MASTER ${masterName}, absorb weaker heroes to empower your finest champions.`,
      },
      {
        topic: 'THE GODDESS',
        text: `MASTER ${masterName}, obey divine rules. The goddess punishes rebellion with death.`,
      },
    ];
  }

  open() {
    this.show();
  }

  close() {
    if (this.dialogEl && this.dialogEl.parentNode) {
      this.dialogEl.parentNode.removeChild(this.dialogEl);
    }
    this.dialogEl = null;
  }

  show() {
    if (this.dialogEl) return;

    this.dialogEl = document.createElement('div');
    this.dialogEl.id = 'iselle-tutorial-dialog';
    this.dialogEl.className = 'mm-panel';
    this.dialogEl.style.position = 'fixed';
    this.dialogEl.style.bottom = '80px';
    this.dialogEl.style.left = '50%';
    this.dialogEl.style.transform = 'translateX(-50%)';
    this.dialogEl.style.width = '460px';
    this.dialogEl.style.maxWidth = '92vw';
    this.dialogEl.style.padding = '18px 24px';
    this.dialogEl.style.zIndex = '10040';
    this.dialogEl.style.color = '#ffffff';
    this.dialogEl.style.overflow = 'visible';
    this.dialogEl.style.boxSizing = 'border-box';

    attachOrnateCorners(this.dialogEl);

    this.renderStep();
    document.body.appendChild(this.dialogEl);
  }

  renderStep() {
    if (!this.dialogEl) return;
    const steps = this.getSteps();
    const current = steps[this.step] || steps[0];

    // Explain pose with sweet_cruel expression during tutorial
    const iselle = this.iselle || (typeof window !== 'undefined' ? window.__iselleRig : null);
    if (iselle) {
      iselle.setPose('explain');
      iselle.setExpression(this.expression);
    }

    this.dialogEl.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid var(--frame-inner); padding-bottom:6px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <canvas id="tutorial-portrait-canvas" width="96" height="96" style="width:48px; height:48px; border-radius:6px; border:1px solid var(--frame-inner); background:#171026; flex-shrink:0;"></canvas>
          <div style="display:flex; flex-direction:column; text-align:left;">
            <span style="color:var(--frame); font-weight:bold; font-size:15px; letter-spacing:1.5px; line-height:1.2;">ISELLE</span>
            <span style="color:var(--accent); font-size:10px; letter-spacing:1px; line-height:1;">GUIDE FAIRY</span>
          </div>
        </div>
        <span style="color:var(--accent); font-size:12px; font-weight:bold;">${this.step + 1} / ${steps.length}</span>
      </div>
      <div style="font-size:15px; line-height:1.45; color:var(--text); margin-bottom:16px; min-height:42px; text-transform:none;">
        "${current.text}"
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <button id="tutorial-skip-btn" class="mm-btn" style="padding:6px 14px; font-size:12px;">
          SKIP
        </button>
        <button id="tutorial-next-btn" class="mm-btn mm-btn-accent" style="padding:6px 20px; font-size:13px;">
          ${this.step === steps.length - 1 ? 'UNDERSTOOD' : 'NEXT →'}
        </button>
      </div>
    `;

    const canvas = this.dialogEl.querySelector('#tutorial-portrait-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      try {
        drawIsellePortrait(ctx, this.expression, 96);
      } catch (e) {}
    }

    const skipBtn = this.dialogEl.querySelector('#tutorial-skip-btn');
    const nextBtn = this.dialogEl.querySelector('#tutorial-next-btn');

    skipBtn.addEventListener('click', () => this.finish());
    nextBtn.addEventListener('click', () => {
      this.step++;
      if (this.step >= this.getSteps().length) {
        this.finish();
      } else {
        this.renderStep();
      }
    });
  }

  finish() {
    if (!gameState.flags) gameState.flags = {};
    gameState.flags.tutorialSeen = true;
    gameState.saveToLocalStorage();

    if (this.dialogEl && this.dialogEl.parentNode) {
      this.dialogEl.parentNode.removeChild(this.dialogEl);
    }
    this.dialogEl = null;

    if (this.onComplete) {
      this.onComplete();
    }
  }
}
