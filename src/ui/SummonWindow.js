import { SystemWindow } from './SystemWindow.js';
import { gameState } from '../core/GameState.js';
import { gachaSystem } from '../gacha/GachaSystem.js';
import { getRarityHexString } from '../data/rules.js';
import { createHeroFromTemplate } from '../data/heroes.js';
import { ITEM_GRADES, rollEquipmentGacha } from '../data/items.js';
import { showSystemMessage } from './Hud.js';

export class SummonWindow extends SystemWindow {
  constructor(onPullCallback, onEquipPullCallback = null) {
    super('SUMMONING HOUSE');
    this.onPullCallback = onPullCallback;
    this.onEquipPullCallback = onEquipPullCallback;
    this.currentTab = 'heroes'; // 'heroes' | 'equipment'

    this.container.style.width = '520px';
    this.buildUI();

    // ESC key closes window
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  buildUI() {
    this.contentElement.innerHTML = `
      <div id="summon-tabs-bar" style="display:flex; gap:10px; margin-bottom:14px; border-bottom:1px solid var(--frame-inner); padding-bottom:8px;">
        <button id="tab-btn-heroes" class="mm-btn mm-btn-accent" style="flex:1; padding:8px; font-weight:bold; font-size:13px;">HEROES</button>
        <button id="tab-btn-equipment" class="mm-btn" style="flex:1; padding:8px; font-weight:bold; font-size:13px; color:#888888;">EQUIPMENT</button>
      </div>

      <!-- HEROES TAB CONTENT -->
      <div id="summon-heroes-pane">
        <div id="summon-currency-row" style="display:flex; justify-content:space-between; margin-bottom:14px; padding:8px 12px; background:rgba(91, 74, 138, 0.2); border:1px solid var(--frame-inner); border-radius:4px; font-weight:bold;">
          <span style="color:var(--frame);">GEMS: <span id="summon-gems-val">0</span></span>
          <span style="color:var(--accent);">FREE TICKETS: <span id="summon-tickets-val">0</span></span>
        </div>

        <button id="btn-premium-summon" class="mm-btn mm-btn-gold" style="width:100%; padding:12px; margin-bottom:12px; font-size:13px; letter-spacing:1px; display:none;">
          ★ PREMIUM SUMMON (FREE) - GUARANTEED 4★ HERO!
        </button>

        <div style="display:flex; gap:12px; margin-bottom:16px;">
          <button id="btn-pull-1" class="mm-btn" style="flex:1; padding:12px 8px; font-size:12px;"></button>
          <button id="btn-pull-10" class="mm-btn mm-btn-gold" style="flex:1; padding:12px 8px; font-size:12px;"></button>
        </div>

        <div style="margin-bottom:14px; padding:8px 12px; background:rgba(255, 255, 255, 0.04); border:1px solid var(--frame-inner); border-radius:4px; font-size:11px; line-height:1.6;">
          <div style="color:var(--frame); font-weight:bold; margin-bottom:4px;">HERO RATES (NO PITY):</div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#9a9a9a;">1★: 68.0%</span>
            <span style="color:#cd7f32;">2★: 24.0%</span>
            <span style="color:#3a7bff;">3★: 6.2%</span>
            <span style="color:#a84bff;">4★: 1.5%</span>
            <span style="color:#ffc83a;">5★: 0.3%</span>
          </div>
          <div style="color:#88a0b0; font-size:10px; margin-top:4px;">* 10-Pull guarantees at least one 2★ or higher.</div>
        </div>

        <div style="border-top:1px solid var(--frame-inner); padding-top:10px;">
          <div style="color:var(--frame); font-size:11px; font-weight:bold; margin-bottom:6px;">RECENT SUMMON HISTORY (LAST 10):</div>
          <div id="summon-history-list" style="display:flex; flex-wrap:wrap; gap:6px; min-height:40px; font-size:11px;"></div>
        </div>
      </div>

      <!-- EQUIPMENT TAB CONTENT -->
      <div id="summon-equip-pane" style="display:none;">
        <div id="summon-gold-row" style="margin-bottom:12px; font-weight:bold; color:var(--gold); font-size:14px; text-align:center; padding:8px; background:rgba(255, 211, 107, 0.1); border:1px solid var(--frame-inner); border-radius:4px;">
          TREASURY GOLD: <span id="summon-gold-val">0</span> G
        </div>

        <div style="display:flex; gap:12px; margin-bottom:14px;">
          <button id="btn-equip-pull-1" class="mm-btn" style="flex:1; min-height:54px; padding:10px 8px; font-size:12px; font-weight:bold; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer;"></button>
          <button id="btn-equip-pull-10" class="mm-btn" style="flex:1; min-height:54px; padding:10px 8px; font-size:12px; font-weight:bold; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer;"></button>
        </div>

        <details id="equip-rates-details" style="margin-bottom:14px; background:rgba(255, 255, 255, 0.04); border:1px solid var(--frame-inner); border-radius:4px; padding:8px 12px; cursor:pointer;">
          <summary style="font-weight:bold; color:var(--frame); font-size:12px; outline:none; user-select:none; text-align:left;">▶ RATES (CLICK TO EXPAND)</summary>
          <div style="margin-top:8px; display:grid; grid-template-columns: repeat(4, 1fr); gap:6px; font-size:11px;">
            <span style="color:#9e9e9e;">[E] 45.0%</span>
            <span style="color:#4caf50;">[D] 28.0%</span>
            <span style="color:#2196f3;">[C] 14.0%</span>
            <span style="color:#9c27b0;">[B] 8.0%</span>
            <span style="color:#ff9800;">[A] 3.5%</span>
            <span style="color:#e91e63;">[S] 1.3%</span>
            <span style="color:#ffd700;">[S+] 0.2%</span>
          </div>
          <div style="color:#88a0b0; font-size:10px; margin-top:6px; text-align:left;">* 10-Pull guarantees at least one D+ grade equipment.</div>
        </details>

        <div id="equip-results-box" style="display:none; border-top:1px solid var(--frame-inner); padding-top:10px; margin-top:10px;">
          <div style="color:var(--gold); font-size:12px; font-weight:bold; margin-bottom:6px; text-align:left;">ACQUIRED EQUIPMENT:</div>
          <div id="equip-results-list" style="display:flex; flex-direction:column; gap:4px; max-height:160px; overflow-y:auto; font-size:11px;"></div>
        </div>
      </div>
    `;

    // Tabs
    this.tabHeroes = this.contentElement.querySelector('#tab-btn-heroes');
    this.tabEquip = this.contentElement.querySelector('#tab-btn-equipment');
    this.paneHeroes = this.contentElement.querySelector('#summon-heroes-pane');
    this.paneEquip = this.contentElement.querySelector('#summon-equip-pane');

    this.tabHeroes.addEventListener('click', () => this.switchTab('heroes'));
    this.tabEquip.addEventListener('click', () => this.switchTab('equipment'));

    // Hero Pull Buttons
    this.btn1 = this.contentElement.querySelector('#btn-pull-1');
    this.btn10 = this.contentElement.querySelector('#btn-pull-10');
    this.btnPremium = this.contentElement.querySelector('#btn-premium-summon');

    this.btn1.addEventListener('click', () => this.handlePull(1));
    this.btn10.addEventListener('click', () => this.handlePull(10));
    this.btnPremium.addEventListener('click', () => this.handlePremiumPull());

    // Equipment Pull Buttons
    this.btnEquip1 = this.contentElement.querySelector('#btn-equip-pull-1');
    this.btnEquip10 = this.contentElement.querySelector('#btn-equip-pull-10');

    this.btnEquip1.addEventListener('click', () => this.handleEquipPull(1));
    this.btnEquip10.addEventListener('click', () => this.handleEquipPull(10));
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    if (tabName === 'heroes') {
      this.tabHeroes.style.background = 'rgba(180, 140, 255, 0.25)';
      this.tabHeroes.style.border = '1px solid var(--accent)';
      this.tabHeroes.style.color = 'var(--frame)';

      this.tabEquip.style.background = 'rgba(255, 255, 255, 0.05)';
      this.tabEquip.style.border = '1px solid #555555';
      this.tabEquip.style.color = '#888888';

      this.paneHeroes.style.display = 'block';
      this.paneEquip.style.display = 'none';
    } else {
      this.tabEquip.style.background = 'rgba(255, 215, 0, 0.25)';
      this.tabEquip.style.border = '1px solid #ffd700';
      this.tabEquip.style.color = '#ffd700';

      this.tabHeroes.style.background = 'rgba(255, 255, 255, 0.05)';
      this.tabHeroes.style.border = '1px solid #555555';
      this.tabHeroes.style.color = '#888888';

      this.paneHeroes.style.display = 'none';
      this.paneEquip.style.display = 'block';
    }
    this.refreshState();
  }

  handleEquipPull(count) {
    const cost = count === 1 ? 5500 : 50000;
    if ((gameState.gold || 0) < cost) {
      return;
    }

    gameState.gold -= cost;
    gameState.equipmentSummoned = true;
    if (!gameState.flags) gameState.flags = {};
    gameState.flags.equipmentSummoned = true;

    const pulledItems = rollEquipmentGacha(count);
    if (!gameState.inventory) gameState.inventory = [];
    for (const item of pulledItems) {
      gameState.inventory.push(item);
    }
    gameState.saveToLocalStorage();

    // Display results in compact equipment results box inside the window
    const resultsBox = this.contentElement.querySelector('#equip-results-box');
    const resultsList = this.contentElement.querySelector('#equip-results-list');
    if (resultsBox && resultsList) {
      resultsBox.style.display = 'block';
      resultsList.innerHTML = '';

      for (const item of pulledItems) {
        const gInfo = ITEM_GRADES[item.grade] || ITEM_GRADES.D;
        const row = document.createElement('div');
        row.style.padding = '4px 8px';
        row.style.borderRadius = '3px';
        row.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.borderLeft = `3px solid ${gInfo.color}`;

        const weaponType = (item.weaponType || item.type || item.slot || '').toUpperCase();
        row.innerHTML = `
          <span><b style="color:${gInfo.color};">[${item.grade}]</b> ${item.name}</span>
          <span style="color:#aaa;">${weaponType}</span>
        `;
        resultsList.appendChild(row);
      }
    }

    this.refreshState();

    if (this.onEquipPullCallback) {
      this.onEquipPullCallback(count, pulledItems);
    }
  }

  handlePull(count) {
    if (count === 10) {
      showSystemMessage('MASTER, BEGINNING 10 SUMMONINGS. EXCITED TO SEE WHAT HEROES WILL COME!');
    }
    const result = gachaSystem.pull(count);
    if (result.error) {
      alert(result.error);
      return;
    }

    this.close();
    if (this.onPullCallback) {
      this.onPullCallback(result.heroes);
    }
  }

  handlePremiumPull() {
    if ((gameState.premiumSummons || 0) <= 0) return;
    gameState.premiumSummons--;

    let pulledHero;
    if (!gameState.flags?.shaySummoned) {
      if (!gameState.flags) gameState.flags = {};
      gameState.flags.shaySummoned = true;
      pulledHero = createHeroFromTemplate('SHAY');
    } else {
      pulledHero = gachaSystem.rollHeroByStar(4);
    }

    gameState.addHero(pulledHero);
    gameState.saveToLocalStorage();
    gachaSystem.history.unshift({ name: pulledHero.name, star: pulledHero.star });
    if (gachaSystem.history.length > 10) gachaSystem.history.pop();

    this.close();
    if (this.onPullCallback) {
      this.onPullCallback([pulledHero]);
    }
  }

  refreshState() {
    const gemsEl = this.contentElement.querySelector('#summon-gems-val');
    const tixEl = this.contentElement.querySelector('#summon-tickets-val');
    const goldEl = this.contentElement.querySelector('#summon-gold-val');

    if (gemsEl) gemsEl.textContent = gameState.gems;
    if (tixEl) tixEl.textContent = gameState.freeTickets;
    if (goldEl) goldEl.textContent = (gameState.gold || 0).toLocaleString();

    // Premium summon button visibility and exact text format
    if ((gameState.premiumSummons || 0) > 0) {
      this.btnPremium.style.display = 'block';
      this.btnPremium.textContent = `PREMIUM SUMMON (${gameState.premiumSummons})`;
    } else {
      this.btnPremium.style.display = 'none';
    }

    // Button 1 logic
    const can1 = gachaSystem.canAfford(1);
    if (can1) {
      this.btn1.disabled = false;
      this.btn1.style.backgroundColor = 'rgba(180, 140, 255, 0.2)';
      this.btn1.style.border = '2px solid var(--accent)';
      this.btn1.style.color = 'var(--accent)';
      this.btn1.textContent = gameState.freeTickets >= 1
        ? 'SUMMON x1 (1 TICKET)'
        : 'SUMMON x1 (100 GEMS)';
    } else {
      this.btn1.disabled = true;
      this.btn1.style.backgroundColor = 'rgba(80, 80, 80, 0.2)';
      this.btn1.style.border = '2px solid #555555';
      this.btn1.style.color = '#888888';
      this.btn1.textContent = 'Not enough gems';
    }

    // Button 10 logic
    const can10 = gachaSystem.canAfford(10);
    if (can10) {
      this.btn10.disabled = false;
      this.btn10.style.backgroundColor = 'rgba(255, 170, 0, 0.2)';
      this.btn10.style.border = '2px solid #ffaa00';
      this.btn10.style.color = '#ffaa00';
      this.btn10.textContent = 'SUMMON x10 (900 Gems)';
    } else {
      this.btn10.disabled = true;
      this.btn10.style.backgroundColor = 'rgba(80, 80, 80, 0.2)';
      this.btn10.style.border = '2px solid #555555';
      this.btn10.style.color = '#888888';
      this.btn10.textContent = 'Not enough gems';
    }

    // Equipment pull buttons logic (red NEED <amount> MORE when unaffordable, gold glow when affordable)
    const g = gameState.gold || 0;
    if (this.btnEquip1) {
      const cost1 = 5500;
      if (g >= cost1) {
        this.btnEquip1.disabled = false;
        this.btnEquip1.innerHTML = `<div>EQUIPMENT x1</div><div style="font-size:11px; color:var(--gold);">${cost1.toLocaleString()} GOLD</div>`;
        this.btnEquip1.style.border = '2px solid var(--gold)';
        this.btnEquip1.style.boxShadow = '0 0 10px rgba(255, 211, 107, 0.5)';
        this.btnEquip1.style.color = 'var(--text)';
      } else {
        this.btnEquip1.disabled = true;
        this.btnEquip1.innerHTML = `<div>EQUIPMENT x1</div><div style="font-size:11px; color:var(--danger); font-weight:bold;">NEED ${(cost1 - g).toLocaleString()} MORE</div>`;
        this.btnEquip1.style.border = '1px solid #555555';
        this.btnEquip1.style.boxShadow = 'none';
        this.btnEquip1.style.color = '#888888';
      }
    }
    if (this.btnEquip10) {
      const cost10 = 50000;
      if (g >= cost10) {
        this.btnEquip10.disabled = false;
        this.btnEquip10.innerHTML = `<div>EQUIPMENT x10</div><div style="font-size:11px; color:var(--gold);">${cost10.toLocaleString()} GOLD</div>`;
        this.btnEquip10.style.border = '2px solid var(--gold)';
        this.btnEquip10.style.boxShadow = '0 0 14px rgba(255, 211, 107, 0.6)';
        this.btnEquip10.style.color = 'var(--text)';
      } else {
        this.btnEquip10.disabled = true;
        this.btnEquip10.innerHTML = `<div>EQUIPMENT x10</div><div style="font-size:11px; color:var(--danger); font-weight:bold;">NEED ${(cost10 - g).toLocaleString()} MORE</div>`;
        this.btnEquip10.style.border = '1px solid #555555';
        this.btnEquip10.style.boxShadow = 'none';
        this.btnEquip10.style.color = '#888888';
      }
    }

    // History rendering
    const histContainer = this.contentElement.querySelector('#summon-history-list');
    if (histContainer) {
      histContainer.innerHTML = '';
      if (gachaSystem.history.length === 0) {
        histContainer.innerHTML = '<span style="color:#667788; font-style:italic;">No summons yet.</span>';
      } else {
        gachaSystem.history.forEach((item) => {
          const chip = document.createElement('span');
          const color = getRarityHexString(item.star);
          chip.style.border = `1px solid ${color}`;
          chip.style.color = color;
          chip.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
          chip.style.padding = '2px 6px';
          chip.style.borderRadius = '3px';
          chip.textContent = `${item.name} (${item.star}★)`;
          histContainer.appendChild(chip);
        });
      }
    }
  }

  open(initialTab = 'heroes') {
    this.switchTab(initialTab);
    super.open();
  }
}
