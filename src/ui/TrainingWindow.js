import { SystemWindow } from './SystemWindow.js';
import { gameState } from '../core/GameState.js';
import { getRarityHexString } from '../data/rules.js';
import { showSystemMessage } from './Hud.js';

export class TrainingWindow extends SystemWindow {
  constructor() {
    super('TRAINING GROUNDS');
    this.container.style.width = '680px';
    this.container.style.maxWidth = '95vw';
    this.refreshTimer = null;

    this.buildUI();
  }

  buildUI() {
    this.contentElement.style.padding = '14px 18px';
    this.contentElement.style.display = 'flex';
    this.contentElement.style.flexDirection = 'column';
    this.contentElement.style.gap = '12px';
  }

  open() {
    this.render();
    super.open();
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = setInterval(() => {
      if (this.isOpen()) {
        this.updateBars();
      }
    }, 500);
  }

  close() {
    super.close();
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  getMotivationBadge(motivation) {
    const m = (motivation || 'normal').toLowerCase();
    if (m === 'diligent') {
      return `<span style="font-size:11px; padding:2px 7px; border-radius:3px; background:rgba(255,211,107,0.2); border:1px solid var(--gold); color:var(--gold); font-weight:bold;">DILIGENT</span>`;
    }
    if (m === 'lazy') {
      return `<span style="font-size:11px; padding:2px 7px; border-radius:3px; background:rgba(255,90,110,0.15); border:1px solid var(--danger); color:var(--danger); font-weight:bold;">LAZY</span>`;
    }
    return `<span style="font-size:11px; padding:2px 7px; border-radius:3px; background:rgba(180,140,255,0.2); border:1px solid var(--accent); color:var(--accent); font-weight:bold;">NORMAL</span>`;
  }

  render() {
    this.contentElement.innerHTML = '';

    const isUnlocked = gameState.isFacilityUnlocked('training');

    if (!isUnlocked) {
      this.setTitle('CONSTRUCT TRAINING GROUNDS');
      const box = document.createElement('div');
      box.style.display = 'flex';
      box.style.flexDirection = 'column';
      box.style.alignItems = 'center';
      box.style.justifyContent = 'center';
      box.style.padding = '28px 20px';
      box.style.gap = '14px';
      box.style.textAlign = 'center';

      const desc = document.createElement('div');
      desc.style.fontSize = '14px';
      desc.style.lineHeight = '1.6';
      desc.style.color = '#ccddee';
      desc.innerHTML = `Construct the <b>Training Grounds</b> to let heroes autonomously practice combat techniques.<br>Equipped with 3 training dummies where heroes train according to their motivation.<br><br><span style="color:var(--gold); font-size:16px; font-weight:bold;">Construction Cost: 200 Gold</span><br><span style="color:#88aacc; font-size:12px;">Treasury Gold: ${gameState.gold.toLocaleString()} G</span>`;
      box.appendChild(desc);

      const buildBtn = document.createElement('button');
      buildBtn.className = 'mm-btn mm-btn-gold';
      buildBtn.textContent = '🔨 BUILD TRAINING GROUNDS (200 GOLD)';
      buildBtn.style.padding = '10px 24px';
      buildBtn.style.fontSize = '14px';
      buildBtn.style.letterSpacing = '1px';
      buildBtn.style.cursor = gameState.gold >= 200 ? 'pointer' : 'not-allowed';

      buildBtn.addEventListener('click', () => {
        if (gameState.gold < 200) {
          showSystemMessage('[Insufficient Gold to construct Training Grounds!]');
          return;
        }
        const ok = gameState.unlockFacility('training', 200);
        if (ok) {
          showSystemMessage('[Training Grounds constructed successfully!]');
          this.render();
        }
      });
      box.appendChild(buildBtn);

      this.contentElement.appendChild(box);
      return;
    }

    const tgFacility = gameState.facilities?.training || { level: 1, unlocked: true };
    const level = tgFacility.level || 1;
    this.setTitle(`TRAINING GROUNDS (LEVEL ${level})`);

    // Header with facility level and upgrade button
    const topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.justifyContent = 'space-between';
    topRow.style.alignItems = 'center';
    topRow.style.borderBottom = '1px solid var(--frame-inner)';
    topRow.style.paddingBottom = '10px';

    const lvlInfo = document.createElement('div');
    lvlInfo.style.fontSize = '13px';
    lvlInfo.style.color = 'var(--text)';
    lvlInfo.innerHTML = `Facility Level: <b style="color:var(--gold); font-size:15px;">${level} / 5</b> &bull; <span style="color:#88aacc;">Training Chance Bonus: +${level * 10}%</span>`;
    topRow.appendChild(lvlInfo);

    if (level < 5) {
      const upCost = 300 * level;
      const canAfford = (gameState.gold || 0) >= upCost;
      const upBtn = document.createElement('button');
      upBtn.className = canAfford ? 'mm-btn mm-btn-gold' : 'mm-btn';
      upBtn.textContent = `UPGRADE (+10% BONUS) - ${upCost.toLocaleString()} GOLD`;
      upBtn.style.fontSize = '12px';
      upBtn.style.padding = '6px 14px';
      upBtn.disabled = !canAfford;
      if (!canAfford) {
        upBtn.style.opacity = '0.5';
        upBtn.style.cursor = 'not-allowed';
      }

      upBtn.addEventListener('click', () => {
        if ((gameState.gold || 0) < upCost) return;
        gameState.gold -= upCost;
        tgFacility.level = (tgFacility.level || 1) + 1;
        gameState.saveToLocalStorage();
        showSystemMessage(`[Training Grounds upgraded to Level ${tgFacility.level}!]`);
        this.render();
      });
      topRow.appendChild(upBtn);
    } else {
      const maxTag = document.createElement('span');
      maxTag.style.cssText = 'color:var(--ok); font-weight:bold; font-size:12px; letter-spacing:1px;';
      maxTag.textContent = '★ MAX LEVEL REACHED';
      topRow.appendChild(maxTag);
    }
    this.contentElement.appendChild(topRow);

    // 3 Dummies status list
    const dummiesGrid = document.createElement('div');
    dummiesGrid.id = 'tg-dummies-container';
    dummiesGrid.style.display = 'flex';
    dummiesGrid.style.flexDirection = 'column';
    dummiesGrid.style.gap = '10px';

    const slots = gameState.trainingSlots || [null, null, null];

    for (let i = 0; i < 3; i++) {
      const slotData = slots[i];
      const slotBox = document.createElement('div');
      slotBox.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
      slotBox.style.border = '1px solid var(--frame-inner)';
      slotBox.style.borderRadius = '5px';
      slotBox.style.padding = '10px 14px';
      slotBox.style.display = 'flex';
      slotBox.style.flexDirection = 'column';
      slotBox.style.gap = '6px';

      const sHeader = document.createElement('div');
      sHeader.style.display = 'flex';
      sHeader.style.justifyContent = 'space-between';
      sHeader.style.alignItems = 'center';

      const dTitle = document.createElement('span');
      dTitle.style.color = 'var(--frame)';
      dTitle.style.fontWeight = 'bold';
      dTitle.style.fontSize = '12px';
      dTitle.textContent = `TRAINING DUMMY ${i + 1}`;
      sHeader.appendChild(dTitle);

      if (slotData && slotData.heroId) {
        const hero = gameState.heroes.find((h) => h.id === slotData.heroId);
        if (hero) {
          const starColor = getRarityHexString(hero.star);
          const skill = (hero.skills || []).find((s) => s.id === slotData.skillId) || hero.skills[0] || { id: 'skill', name: 'Skill', level: 1, exp: 0 };
          const neededXp = 100 * (skill.level || 1);
          const pct = Math.min(100, Math.round(((skill.exp || 0) / neededXp) * 100));

          const badge = document.createElement('div');
          badge.innerHTML = this.getMotivationBadge(hero.motivation);
          sHeader.appendChild(badge);
          slotBox.appendChild(sHeader);

          const hRow = document.createElement('div');
          hRow.style.display = 'flex';
          hRow.style.justifyContent = 'space-between';
          hRow.style.fontSize = '13px';
          hRow.innerHTML = `
            <span><b style="color:#ffffff;">${hero.name}</b> <span style="color:${starColor};">${'★'.repeat(hero.star)}</span> (${hero.class})</span>
            <span style="color:var(--gold); font-weight:bold;">${skill.name || skill.id} (Lv ${skill.level || 1})</span>
          `;
          slotBox.appendChild(hRow);

          // Progress Bar
          const barWrap = document.createElement('div');
          barWrap.style.width = '100%';
          barWrap.style.height = '8px';
          barWrap.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
          barWrap.style.borderRadius = '4px';
          barWrap.style.overflow = 'hidden';
          barWrap.style.border = '1px solid #334455';

          const barFill = document.createElement('div');
          barFill.id = `tg-bar-${i}`;
          barFill.style.width = `${pct}%`;
          barFill.style.height = '100%';
          barFill.style.backgroundColor = 'var(--accent)';
          barFill.style.transition = 'width 0.3s ease';
          barWrap.appendChild(barFill);
          slotBox.appendChild(barWrap);

          const statsRow = document.createElement('div');
          statsRow.style.display = 'flex';
          statsRow.style.justifyContent = 'space-between';
          statsRow.style.fontSize = '10px';
          statsRow.style.color = '#88aacc';
          statsRow.innerHTML = `
            <span>EXP: ${skill.exp || 0} / ${neededXp} (${pct}%)</span>
            <span>Fatigue: <b style="color:${(hero.fatigue || 0) > 60 ? 'var(--danger)' : 'var(--ok)'};">${Math.round(hero.fatigue || 0)}/100</b></span>
          `;
          slotBox.appendChild(statsRow);
        } else {
          sHeader.appendChild(document.createElement('span'));
          slotBox.appendChild(sHeader);
          const empty = document.createElement('div');
          empty.style.color = '#778899';
          empty.style.fontSize = '11px';
          empty.style.fontStyle = 'italic';
          empty.textContent = '(Available)';
          slotBox.appendChild(empty);
        }
      } else {
        sHeader.appendChild(document.createElement('span'));
        slotBox.appendChild(sHeader);

        const empty = document.createElement('div');
        empty.style.color = '#778899';
        empty.style.fontSize = '11px';
        empty.style.fontStyle = 'italic';
        empty.textContent = '(Available - Heroes autonomously choose to train)';
        slotBox.appendChild(empty);
      }

      dummiesGrid.appendChild(slotBox);
    }

    this.contentElement.appendChild(dummiesGrid);

    // Footnote
    const note = document.createElement('div');
    note.style.fontSize = '11px';
    note.style.color = '#778899';
    note.style.lineHeight = '1.4';
    note.style.marginTop = '4px';
    note.innerHTML = `* Heroes autonomously choose when to train based on motivation, stress, fatigue, and Han's inspiring presence. Master cannot force training.`;
    this.contentElement.appendChild(note);
  }

  updateBars() {
    const slots = gameState.trainingSlots || [null, null, null];
    for (let i = 0; i < 3; i++) {
      const slot = slots[i];
      const bar = this.contentElement.querySelector(`#tg-bar-${i}`);
      if (slot && slot.heroId && bar) {
        const hero = gameState.heroes.find((h) => h.id === slot.heroId);
        if (hero) {
          const skill = (hero.skills || []).find((s) => s.id === slot.skillId) || hero.skills[0];
          if (skill) {
            const neededXp = 100 * (skill.level || 1);
            const pct = Math.min(100, Math.round(((skill.exp || 0) / neededXp) * 100));
            bar.style.width = `${pct}%`;
          }
        }
      }
    }
  }
}
