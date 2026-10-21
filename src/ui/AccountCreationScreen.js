import { gameState } from '../core/GameState.js';
import { showSystemMessage } from './Hud.js';
import { attachOrnateCorners } from './ornaments.js';

export class AccountCreationScreen {
  constructor(onComplete) {
    this.onComplete = onComplete;
    this.overlay = null;
  }

  open() {
    this.show();
  }

  close() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
  }

  show() {
    if (this.overlay) return;

    this.overlay = document.createElement('div');
    this.overlay.id = 'account-creation-screen';
    this.overlay.style.position = 'fixed';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.width = '100vw';
    this.overlay.style.height = '100vh';
    this.overlay.style.backgroundColor = 'var(--panel-bg-1, #0b0810)';
    this.overlay.style.zIndex = '10050';
    this.overlay.style.display = 'flex';
    this.overlay.style.flexDirection = 'column';
    this.overlay.style.alignItems = 'center';
    this.overlay.style.justifyContent = 'center';
    this.overlay.style.transition = 'opacity 0.5s ease-out';

    // Title
    const title = document.createElement('h1');
    title.textContent = 'PICK ME UP';
    title.style.color = 'var(--frame)';
    title.style.fontSize = '46px';
    title.style.fontWeight = 'bold';
    title.style.letterSpacing = '8px';
    title.style.margin = '0 0 10px 0';
    title.style.textShadow = '0 0 20px var(--glow), 0 0 40px var(--glow)';
    this.overlay.appendChild(title);

    const sub = document.createElement('div');
    sub.textContent = 'INFINITE GACHA - MASTER REGISTRATION';
    sub.style.color = 'var(--accent)';
    sub.style.fontSize = '12px';
    sub.style.letterSpacing = '3px';
    sub.style.margin = '0 0 32px 0';
    this.overlay.appendChild(sub);

    // Form box
    const formBox = document.createElement('div');
    formBox.className = 'mm-panel';
    formBox.style.display = 'flex';
    formBox.style.flexDirection = 'column';
    formBox.style.alignItems = 'center';
    formBox.style.gap = '14px';
    formBox.style.width = '360px';
    formBox.style.maxWidth = '90vw';
    formBox.style.padding = '28px 24px';
    formBox.style.overflow = 'visible';

    attachOrnateCorners(formBox);

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 6;
    input.placeholder = 'CHOOSE A NAME (2 TO 6 CHARS, NO SPACES)';
    input.style.width = '100%';
    input.style.padding = '12px 14px';
    input.style.backgroundColor = 'rgba(11, 8, 16, 0.9)';
    input.style.border = '1px solid var(--frame-inner)';
    input.style.borderRadius = '5px';
    input.style.color = '#ffffff';
    input.style.fontSize = '13px';
    input.style.textAlign = 'center';
    input.style.outline = 'none';
    input.style.boxSizing = 'border-box';
    formBox.appendChild(input);

    // Class Selection: Vanguard (Sword+Shield), Mage (Staff+Fire), Archer (Bow+Quiver)
    const classContainer = document.createElement('div');
    classContainer.style.display = 'flex';
    classContainer.style.gap = '8px';
    classContainer.style.width = '100%';
    classContainer.style.justifyContent = 'center';

    let selectedClass = gameState.playerClass || 'Vanguard';
    const classes = [
      { id: 'Vanguard', label: '⚔️ Vanguard', desc: 'Sword & Shield' },
      { id: 'Mage', label: '🔥 Mage', desc: 'Staff & Fire Spells' },
      { id: 'Archer', label: '🏹 Archer', desc: 'Bow & Quiver' },
    ];
    const classButtons = [];

    classes.forEach(c => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mm-btn';
      btn.textContent = c.label;
      btn.title = c.desc;
      btn.style.flex = '1';
      btn.style.padding = '8px 4px';
      btn.style.fontSize = '11px';
      btn.style.fontWeight = 'bold';
      btn.style.cursor = 'pointer';

      const updateStyle = () => {
        if (selectedClass === c.id) {
          btn.style.backgroundColor = 'var(--frame-inner, #2563eb)';
          btn.style.borderColor = 'var(--frame, #ffd700)';
          btn.style.color = '#ffffff';
        } else {
          btn.style.backgroundColor = 'rgba(20, 25, 35, 0.7)';
          btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          btn.style.color = '#aaaaaa';
        }
      };
      updateStyle();

      btn.addEventListener('click', () => {
        selectedClass = c.id;
        classButtons.forEach(b => b.update());
      });
      btn.update = updateStyle;
      classButtons.push(btn);
      classContainer.appendChild(btn);
    });
    formBox.appendChild(classContainer);

    const errorMsg = document.createElement('div');
    errorMsg.style.color = 'var(--danger)';
    errorMsg.style.fontSize = '12px';
    errorMsg.style.minHeight = '16px';
    errorMsg.style.textAlign = 'center';
    errorMsg.style.fontWeight = 'bold';
    formBox.appendChild(errorMsg);

    const startBtn = document.createElement('button');
    startBtn.className = 'mm-btn mm-btn-accent';
    startBtn.textContent = 'START';
    startBtn.style.padding = '10px 42px';
    startBtn.style.fontSize = '15px';
    startBtn.style.letterSpacing = '2px';
    formBox.appendChild(startBtn);

    const handleSubmit = () => {
      const val = input.value;
      if (!val || val.length < 2 || val.length > 6 || /\s/.test(val)) {
        errorMsg.textContent = 'Name must be 2 to 6 characters with no spaces.';
        input.style.borderColor = '#ff4444';
        return;
      }

      gameState.masterName = val;
      if (typeof gameState.setPlayerClass === 'function') {
        gameState.setPlayerClass(selectedClass);
      }
      gameState.saveToLocalStorage();

      this.overlay.style.opacity = '0';
      setTimeout(() => {
        if (this.overlay && this.overlay.parentNode) {
          this.overlay.parentNode.removeChild(this.overlay);
        }
        this.overlay = null;
        showSystemMessage('[Welcome to the world of Pick Me Up!]');
        if (this.onComplete) {
          this.onComplete(val);
        }
      }, 500);
    };

    startBtn.addEventListener('click', handleSubmit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleSubmit();
      }
    });

    this.overlay.appendChild(formBox);
    document.body.appendChild(this.overlay);
    input.focus();
  }
}
