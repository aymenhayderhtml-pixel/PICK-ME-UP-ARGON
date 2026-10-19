import { SystemWindow } from './SystemWindow.js';
import { gameState } from '../core/GameState.js';
import { getRarityHexString } from '../data/rules.js';
import { showSystemMessage } from './Hud.js';

export class DormitoryWindow extends SystemWindow {
  constructor(onRestAllCallback) {
    super('DORMITORY - REST & RECOVERY');
    this.onRestAllCallback = onRestAllCallback;

    this.container.style.width = '640px';
    this.container.style.maxWidth = '92vw';

    this.refreshTimer = null;
    this.buildUI();
  }

  buildUI() {
    this.contentElement.style.padding = '14px';
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
        this.render();
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

  render() {
    this.contentElement.innerHTML = '';

    // Description header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.borderBottom = '1px solid var(--frame-inner)';
    header.style.paddingBottom = '8px';

    const info = document.createElement('div');
    info.style.fontSize = '12px';
    info.style.color = '#88aacc';
    info.innerHTML = `Heroes resting in the Dormitory recover <b style="color:var(--ok)">2 fatigue / sec</b>.<br>Exhausted heroes (fatigue &gt; 80) suffer -20% stats in the Tower.`;
    header.appendChild(info);

    const restAllBtn = document.createElement('button');
    restAllBtn.textContent = '🛏️ Rest All Heroes';
    restAllBtn.style.padding = '8px 16px';
    restAllBtn.style.backgroundColor = 'var(--accent)';
    restAllBtn.style.color = '#ffffff';
    restAllBtn.style.border = '1px solid var(--frame)';
    restAllBtn.style.borderRadius = '4px';
    restAllBtn.style.fontWeight = 'bold';
    restAllBtn.style.cursor = 'pointer';
    restAllBtn.style.fontSize = '12px';
    restAllBtn.style.boxShadow = '0 0 10px var(--glow)';
    restAllBtn.addEventListener('click', () => {
      if (this.onRestAllCallback) {
        this.onRestAllCallback();
      }
      showSystemMessage('[All heroes sent to rest in the Dormitory]');
      this.render();
    });
    header.appendChild(restAllBtn);

    this.contentElement.appendChild(header);

    // MEALS quality selector (basic, good, feast)
    const mealsBar = document.createElement('div');
    mealsBar.style.display = 'flex';
    mealsBar.style.justifyContent = 'space-between';
    mealsBar.style.alignItems = 'center';
    mealsBar.style.backgroundColor = 'rgba(20, 15, 35, 0.7)';
    mealsBar.style.border = '1px solid var(--frame-inner)';
    mealsBar.style.borderRadius = '6px';
    mealsBar.style.padding = '8px 12px';

    const mealsLeft = document.createElement('div');
    mealsLeft.style.display = 'flex';
    mealsLeft.style.flexDirection = 'column';
    mealsLeft.innerHTML = `
      <span style="font-weight:bold; font-size:12px; color:var(--gold);">MEALS QUALITY</span>
      <span style="font-size:11px; color:#a0b0c0;">Affects daily hero satisfaction & discontent</span>
    `;
    mealsBar.appendChild(mealsLeft);

    const mealsBtns = document.createElement('div');
    mealsBtns.style.display = 'flex';
    mealsBtns.style.gap = '6px';

    const mealOptions = [
      { key: 'basic', label: 'BASIC (FREE)' },
      { key: 'good', label: 'GOOD (15G/D)' },
      { key: 'feast', label: 'FEAST (40G/D)' },
    ];

    mealOptions.forEach((opt) => {
      const btn = document.createElement('button');
      const isCur = (gameState.foodQuality || 'basic') === opt.key;
      btn.textContent = opt.label;
      btn.style.padding = '5px 10px';
      btn.style.fontSize = '11px';
      btn.style.fontFamily = 'monospace';
      btn.style.fontWeight = 'bold';
      btn.style.cursor = 'pointer';
      btn.style.borderRadius = '4px';
      btn.style.border = isCur ? '1px solid var(--gold)' : '1px solid var(--frame-inner)';
      btn.style.backgroundColor = isCur ? 'rgba(255, 211, 107, 0.25)' : 'rgba(15, 10, 25, 0.6)';
      btn.style.color = isCur ? 'var(--gold)' : '#cccccc';
      btn.addEventListener('click', () => {
        gameState.foodQuality = opt.key;
        gameState.saveToLocalStorage();
        this.render();
      });
      mealsBtns.appendChild(btn);
    });

    mealsBar.appendChild(mealsBtns);
    this.contentElement.appendChild(mealsBar);

    // Hero List
    const listContainer = document.createElement('div');
    listContainer.style.display = 'flex';
    listContainer.style.flexDirection = 'column';
    listContainer.style.gap = '8px';
    listContainer.style.maxHeight = '380px';
    listContainer.style.overflowY = 'auto';
    listContainer.style.paddingRight = '4px';

    const trainingHeroIds = new Set(
      (gameState.trainingSlots || []).filter(Boolean).map((s) => s.heroId)
    );

    const aliveHeroes = gameState.heroes.filter((h) => h.alive);

    if (aliveHeroes.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No alive heroes in Niflheimr.';
      empty.style.color = '#667788';
      listContainer.appendChild(empty);
    }

    for (const hero of aliveHeroes) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '8px 12px';
      row.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
      row.style.border = '1px solid var(--frame-inner)';
      row.style.borderRadius = '4px';

      // Left info
      const left = document.createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.gap = '10px';

      const starColor = getRarityHexString(hero.star);
      const starSpan = `<span style="color:${starColor}">★${hero.star}</span>`;
      left.innerHTML = `
        <span style="font-weight:bold; color:#ffffff; font-size:13px;">${hero.name}</span>
        ${starSpan}
        <span style="font-size:11px; color:#88aacc;">Lv ${hero.level || 1} ${hero.class || 'Vanguard'}</span>
      `;
      row.appendChild(left);

      // Right: Fatigue Bar + Status
      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '12px';

      const isTraining = trainingHeroIds.has(hero.id);
      const fatigue = Math.round(hero.fatigue || 0);

      let statusBadge = '';
      if (isTraining) {
        statusBadge = `<span style="font-size:10px; color:#ffcc00; border:1px solid #ffcc00; padding:1px 5px; border-radius:3px;">TRAINING</span>`;
      } else if (fatigue >= 80) {
        statusBadge = `<span style="font-size:10px; color:#ff3333; border:1px solid #ff3333; padding:1px 5px; border-radius:3px;">EXHAUSTED</span>`;
      } else if (fatigue >= 20) {
        statusBadge = `<span style="font-size:10px; color:#00ffcc; border:1px solid #00ffcc; padding:1px 5px; border-radius:3px;">RESTING</span>`;
      } else {
        statusBadge = `<span style="font-size:10px; color:#88bb88; border:1px solid #88bb88; padding:1px 5px; border-radius:3px;">READY</span>`;
      }

      right.innerHTML = statusBadge;

      // Bars container (Fatigue + Stress)
      const barsCol = document.createElement('div');
      barsCol.style.display = 'flex';
      barsCol.style.flexDirection = 'column';
      barsCol.style.gap = '3px';

      // Fatigue Bar
      const barBg = document.createElement('div');
      barBg.style.width = '130px';
      barBg.style.height = '12px';
      barBg.style.backgroundColor = 'rgba(0,0,0,0.6)';
      barBg.style.border = '1px solid #335566';
      barBg.style.borderRadius = '3px';
      barBg.style.overflow = 'hidden';
      barBg.style.position = 'relative';

      const barFill = document.createElement('div');
      barFill.style.height = '100%';
      barFill.style.width = `${Math.min(100, Math.max(0, fatigue))}%`;
      barFill.style.backgroundColor =
        fatigue >= 80 ? 'var(--danger, #e53935)' : fatigue >= 40 ? 'var(--gold, #fbc02d)' : 'var(--ok, #7dffb0)';
      barFill.style.transition = 'width 0.2s ease-out';
      barBg.appendChild(barFill);

      const barText = document.createElement('div');
      barText.style.position = 'absolute';
      barText.style.top = '0';
      barText.style.left = '0';
      barText.style.width = '100%';
      barText.style.height = '100%';
      barText.style.fontSize = '8px';
      barText.style.display = 'flex';
      barText.style.alignItems = 'center';
      barText.style.justifyContent = 'center';
      barText.style.color = '#ffffff';
      barText.textContent = `FAT: ${fatigue}/100`;
      barBg.appendChild(barText);
      barsCol.appendChild(barBg);

      // Stress Bar
      const stress = Math.round(hero.stress || 0);
      const stressBg = document.createElement('div');
      stressBg.style.width = '130px';
      stressBg.style.height = '12px';
      stressBg.style.backgroundColor = 'rgba(0,0,0,0.6)';
      stressBg.style.border = '1px solid #7e22ce';
      stressBg.style.borderRadius = '3px';
      stressBg.style.overflow = 'hidden';
      stressBg.style.position = 'relative';

      const stressFill = document.createElement('div');
      stressFill.style.height = '100%';
      stressFill.style.width = `${Math.min(100, Math.max(0, stress))}%`;
      stressFill.style.backgroundColor = stress >= 80 ? '#ef4444' : '#a855f7';
      stressFill.style.transition = 'width 0.2s ease-out';
      stressBg.appendChild(stressFill);

      const stressText = document.createElement('div');
      stressText.style.position = 'absolute';
      stressText.style.top = '0';
      stressText.style.left = '0';
      stressText.style.width = '100%';
      stressText.style.height = '100%';
      stressText.style.fontSize = '8px';
      stressText.style.display = 'flex';
      stressText.style.alignItems = 'center';
      stressText.style.justifyContent = 'center';
      stressText.style.color = '#ffffff';
      stressText.textContent = hero.id === 'hero_han' ? 'STRESS: IMMUNE' : `STR: ${stress}/100`;
      stressBg.appendChild(stressText);
      barsCol.appendChild(stressBg);

      right.appendChild(barsCol);

      // Comfort Button (300 G, sets stress to 40, 120s cooldown)
      if (hero.id !== 'hero_han') {
        const cdRemaining = Math.max(0, Math.ceil(120 - (Date.now() - (hero.lastComfortTime || 0)) / 1000));
        const comfortBtn = document.createElement('button');
        comfortBtn.style.padding = '4px 8px';
        comfortBtn.style.fontSize = '10px';
        comfortBtn.style.fontFamily = 'monospace';
        comfortBtn.style.borderRadius = '4px';
        comfortBtn.style.border = '1px solid #a855f7';
        comfortBtn.style.cursor = cdRemaining > 0 ? 'default' : 'pointer';

        if (cdRemaining > 0) {
          comfortBtn.textContent = `Comfort (${cdRemaining}s)`;
          comfortBtn.style.backgroundColor = 'rgba(60, 60, 70, 0.5)';
          comfortBtn.style.color = '#888899';
          comfortBtn.style.borderColor = '#555566';
        } else {
          comfortBtn.textContent = '☕ Comfort (300G)';
          comfortBtn.style.backgroundColor = 'rgba(168, 85, 247, 0.2)';
          comfortBtn.style.color = '#d8b4fe';
          comfortBtn.addEventListener('click', () => {
            if (gameState.gold < 300) {
              showSystemMessage('[Not enough gold! Comfort requires 300 G]');
              return;
            }
            gameState.gold -= 300;
            hero.stress = 40;
            hero.lastComfortTime = Date.now();
            gameState.saveToLocalStorage();
            showSystemMessage(`[${hero.name} was comforted in the Dormitory. Stress reduced to 40.]`);
            this.render();
          });
        }
        right.appendChild(comfortBtn);
      }

      row.appendChild(right);
      listContainer.appendChild(row);
    }

    this.contentElement.appendChild(listContainer);
  }
}
