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

    // Mess Hall / Cook Assignment
    const cookSection = document.createElement('div');
    cookSection.style.backgroundColor = 'rgba(20, 15, 35, 0.7)';
    cookSection.style.border = '1px solid var(--frame-inner)';
    cookSection.style.borderRadius = '6px';
    cookSection.style.padding = '8px 12px';
    cookSection.style.display = 'flex';
    cookSection.style.flexDirection = 'column';
    cookSection.style.gap = '6px';

    const assignedCook = (gameState.heroes || []).find((h) => h.id === gameState.assignedCookId);
    const cookName = assignedCook ? assignedCook.name : 'NONE';
    const cookStar = assignedCook ? '★'.repeat(assignedCook.star || 1) : '';
    const hasCookingSkill = assignedCook ? (assignedCook.skills || []).some((s) => s.id === 'cooking') : false;

    const cookHeader = document.createElement('div');
    cookHeader.style.display = 'flex';
    cookHeader.style.justifyContent = 'space-between';
    cookHeader.style.alignItems = 'center';
    cookHeader.innerHTML = `
      <span style="font-weight:bold; font-size:12px; color:var(--gold);">MESS HALL — COOK ASSIGNMENT</span>
      <span style="font-size:11px; color:#a0b0c0;">Current Cook: <b style="color:#ffffff;">${cookName} ${cookStar}</b></span>
    `;
    cookSection.appendChild(cookHeader);

    const cookSelect = document.createElement('select');
    cookSelect.style.padding = '4px 8px';
    cookSelect.style.fontSize = '11px';
    cookSelect.style.borderRadius = '4px';
    cookSelect.style.backgroundColor = 'rgba(15, 10, 25, 0.6)';
    cookSelect.style.color = '#cccccc';
    cookSelect.style.border = '1px solid var(--frame-inner)';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- Select Cook --';
    cookSelect.appendChild(defaultOpt);
    (gameState.heroes || []).filter((h) => h.alive).forEach((h) => {
      const opt = document.createElement('option');
      opt.value = h.id;
      opt.textContent = `${h.name} (${ '★'.repeat(h.star || 1) })`;
      if (h.id === gameState.assignedCookId) opt.selected = true;
      cookSelect.appendChild(opt);
    });
    cookSelect.addEventListener('change', () => {
      const newId = cookSelect.value;
      if (!newId) return;
      const newHero = (gameState.heroes || []).find((h) => h.id === newId);
      const oldHero = assignedCook;
      if (oldHero && oldHero.id !== newId) {
        const confirmBox = document.createElement('div');
        confirmBox.style.position = 'fixed';
        confirmBox.style.top = '50%';
        confirmBox.style.left = '50%';
        confirmBox.style.transform = 'translate(-50%, -50%)';
        confirmBox.style.zIndex = '10030';
        confirmBox.style.padding = '16px';
        confirmBox.style.background = 'rgba(11,8,16,0.95)';
        confirmBox.style.border = '1px solid var(--gold)';
        confirmBox.style.borderRadius = '8px';
        confirmBox.style.textAlign = 'center';
        confirmBox.innerHTML = `<div style="color:var(--gold); font-weight:bold; margin-bottom:8px;">WILL YOU MAKE ${String(newHero.name).toUpperCase()} (★) THE COOK? ${String(oldHero.name).toUpperCase()} (★)'S SPOT WILL BE TAKEN. [Yes] [No]</div>`;
        const yes = document.createElement('button');
        yes.textContent = 'Yes';
        yes.className = 'mm-btn mm-btn-ok';
        yes.style.marginRight = '8px';
        const no = document.createElement('button');
        no.textContent = 'No';
        no.className = 'mm-btn mm-btn-danger';
        yes.addEventListener('click', () => {
          gameState.assignedCookId = newId;
          gameState.saveToLocalStorage();
          document.body.removeChild(confirmBox);
          this.render();
        });
        no.addEventListener('click', () => {
          document.body.removeChild(confirmBox);
          this.render();
        });
        confirmBox.appendChild(yes);
        confirmBox.appendChild(no);
        document.body.appendChild(confirmBox);
      } else {
        gameState.assignedCookId = newId;
        gameState.saveToLocalStorage();
        this.render();
      }
    });
    cookSection.appendChild(cookSelect);

    // Service result / logs
    if (assignedCook) {
      if (hasCookingSkill) {
        const feast = document.createElement('div');
        feast.style.fontSize = '11px';
        feast.style.color = '#7dffb0';
        feast.textContent = 'POTATO FEAST SERVED — HUNGER REDUCED, PARTY MORALE & STAMINA BOOSTED.';
        cookSection.appendChild(feast);
      } else {
        const distaste = document.createElement('div');
        distaste.style.fontSize = '11px';
        distaste.style.color = '#aaaaaa';
        distaste.style.opacity = '0.7';
        distaste.style.transform = 'skewX(-8deg)';
        const partyHeroes = (gameState.party || []).map((p) => gameState.heroes.find((h) => h.id === (typeof p === 'string' ? p : p.id))).filter(Boolean);
        const targetNames = ['JENNA', 'HAN'];
        targetNames.forEach((n) => {
          const line = document.createElement('div');
          line.textContent = `${n} (★) SHOWS DISTASTE AT THE COOKING.`;
          distaste.appendChild(line);
        });
        cookSection.appendChild(distaste);
      }
    }

    // Meat Feast button (when beast_meat > 0)
    if ((gameState.materials?.beast_meat || 0) > 0) {
      const feastBtn = document.createElement('button');
      feastBtn.textContent = 'SERVE MEAT FEAST';
      feastBtn.className = 'mm-btn mm-btn-gold';
      feastBtn.style.padding = '6px 16px';
      feastBtn.style.fontSize = '12px';
      feastBtn.addEventListener('click', () => {
        if ((gameState.materials?.beast_meat || 0) <= 0) return;
        gameState.materials.beast_meat -= 1;
        (gameState.heroes || []).forEach((h) => {
          if (h.alive) {
            h.hunger = 0;
            h.fatigue = 0;
            h.morale = 100;
          }
        });
        gameState.saveToLocalStorage();
        showSystemMessage("OOH-! MEAT! I'VE MISSED EATING MEAT! EVERYONE SHOULD BE ABLE TO EAT WELL FOR NOW.");
        this.render();
      });
      cookSection.appendChild(feastBtn);
    }

    this.contentElement.appendChild(cookSection);

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
