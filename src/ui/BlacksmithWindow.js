import { SystemWindow } from './SystemWindow.js';
import { gameState } from '../core/GameState.js';
import { FORGE_RECIPES, ITEM_TEMPLATES } from '../data/items.js';
import { getBestSmith, calculateRepairCost, getEnhanceCost, ENHANCE_RATES } from '../core/Inventory.js';
import { showSystemMessage } from './Hud.js';
import { getItemIcon } from './ItemIcon.js';

export class BlacksmithWindow extends SystemWindow {
  constructor(onForgeStartedCallback = null, onStateChangeCallback = null) {
    super('BLACKSMITH WORKSHOP');
    this.onForgeStartedCallback = onForgeStartedCallback;
    this.onStateChangeCallback = onStateChangeCallback;

    this.container.style.width = '740px';
    this.container.style.maxWidth = '95vw';

    this.currentTab = 'repair'; // 'repair' | 'forge' | 'enhance'
    this.selectedEnhanceItemId = null;
    this.enhanceResult = null; // { success: boolean, text: string } | null

    this.buildUI();

    // Close on ESC
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  open() {
    this.enhanceResult = null;
    this.render();
    super.open();
  }

  buildUI() {
    this.contentElement.style.padding = '12px 16px';
    this.contentElement.style.display = 'flex';
    this.contentElement.style.flexDirection = 'column';
    this.contentElement.style.gap = '10px';
  }

  getAllDamagedItems() {
    const list = [];
    const bestSmith = getBestSmith(gameState.heroes);

    // 1. Equipped items on all living heroes
    for (const h of gameState.heroes) {
      if (!h.alive || !h.equipment) continue;
      for (const [slotKey, it] of Object.entries(h.equipment)) {
        if (it && it.durability < it.maxDurability) {
          list.push({
            item: it,
            owner: h.name,
            slot: slotKey,
            cost: calculateRepairCost(it, bestSmith),
          });
        }
      }
    }

    // 2. Inventory items
    for (const it of gameState.inventory || []) {
      if (it && it.durability < it.maxDurability) {
        list.push({
          item: it,
          owner: 'Inventory',
          slot: it.slot || 'item',
          cost: calculateRepairCost(it, bestSmith),
        });
      }
    }

    return list;
  }

  getAllEnhanceableItems() {
    const list = [];
    for (const h of gameState.heroes) {
      if (!h.alive || !h.equipment) continue;
      for (const [slotKey, it] of Object.entries(h.equipment)) {
        if (it && (it.enhance || 0) < 5) {
          list.push({ item: it, location: `${h.name} (${slotKey.toUpperCase()})` });
        }
      }
    }
    for (const it of gameState.inventory || []) {
      if (it && (it.enhance || 0) < 5) {
        list.push({ item: it, location: 'Inventory' });
      }
    }
    return list;
  }

  render() {
    this.contentElement.innerHTML = '';

    const bestSmith = getBestSmith(gameState.heroes);

    // 1. Header with Artisan Status & Currency
    const statusRow = document.createElement('div');
    statusRow.style.display = 'flex';
    statusRow.style.justifyContent = 'space-between';
    statusRow.style.alignItems = 'center';
    statusRow.style.padding = '8px 12px';
    statusRow.style.backgroundColor = 'rgba(10, 20, 35, 0.7)';
    statusRow.style.borderRadius = '5px';
    statusRow.style.border = '1px solid var(--frame-inner)';

    const smithInfo = document.createElement('div');
    smithInfo.style.fontSize = '12px';
    if (bestSmith) {
      const qPct = Math.round(bestSmith.forgeQuality * 100);
      const dPct = Math.round(bestSmith.repairDiscount * 100);
      smithInfo.innerHTML = `
        <span style="color:#ffd700; font-weight:bold;">Artisan: ${bestSmith.hero.name}</span>
        <span style="color:var(--accent);">(Smithing Lv ${bestSmith.level} &bull; Quality +${qPct}% &bull; Repair -${dPct}%)</span>
      `;
    } else {
      smithInfo.innerHTML = `
        <span style="color:#ffaa00; font-weight:bold;">⚠️ No smith assigned. Summon an artisan hero.</span>
        <span style="color:#88a0b0; font-size:11px;">(Repairs available at 2x cost)</span>
      `;
    }
    statusRow.appendChild(smithInfo);

    const currencyInfo = document.createElement('div');
    currencyInfo.style.fontSize = '12px';
    currencyInfo.style.fontWeight = 'bold';
    currencyInfo.innerHTML = `
      <span style="color:#ffcc00;">🪙 ${gameState.gold} Gold</span> |
      <span style="color:var(--frame);">🔩 ${gameState.materials?.iron_ingot || 0} Ingots</span>
    `;
    statusRow.appendChild(currencyInfo);

    this.contentElement.appendChild(statusRow);

    // 2. Tabs Bar (Repair, Forge, Enhance)
    const tabsBar = document.createElement('div');
    tabsBar.style.display = 'flex';
    tabsBar.style.gap = '8px';
    tabsBar.style.borderBottom = '1px solid var(--frame-inner)';
    tabsBar.style.paddingBottom = '6px';

    const tabs = [
      { key: 'repair', label: 'Repair' },
      { key: 'forge', label: 'Forge' },
      { key: 'enhance', label: 'Enhance (+0 to +5)' },
    ];

    tabs.forEach((t) => {
      const btn = document.createElement('button');
      btn.textContent = t.label;
      btn.style.padding = '6px 14px';
      btn.style.fontFamily = 'monospace';
      btn.style.fontSize = '12px';
      btn.style.fontWeight = 'bold';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.style.border = '1px solid var(--frame-inner)';
      btn.style.backgroundColor = this.currentTab === t.key ? 'rgba(180, 140, 255, 0.25)' : 'transparent';
      btn.style.color = this.currentTab === t.key ? 'var(--frame)' : '#888888';

      btn.addEventListener('click', () => {
        this.currentTab = t.key;
        this.enhanceResult = null;
        this.render();
      });
      tabsBar.appendChild(btn);
    });

    this.contentElement.appendChild(tabsBar);

    // 3. Main Tab Content
    const tabContent = document.createElement('div');
    tabContent.style.minHeight = '340px';
    tabContent.style.display = 'flex';
    tabContent.style.flexDirection = 'column';
    tabContent.style.gap = '10px';

    if (this.currentTab === 'repair') {
      this.renderRepairTab(tabContent, bestSmith);
    } else if (this.currentTab === 'forge') {
      this.renderForgeTab(tabContent, bestSmith);
    } else {
      this.renderEnhanceTab(tabContent);
    }

    this.contentElement.appendChild(tabContent);
  }

  // --- TAB 1: REPAIR ---
  renderRepairTab(container, bestSmith) {
    const damagedList = this.getAllDamagedItems();

    if (damagedList.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'All equipment is in pristine condition. No repairs needed.';
      empty.style.color = '#00ffaa';
      empty.style.padding = '40px';
      empty.style.textAlign = 'center';
      empty.style.fontStyle = 'italic';
      container.appendChild(empty);
      return;
    }

    // Top action bar with Repair All
    const totalCost = damagedList.reduce((sum, d) => sum + d.cost, 0);
    const topBar = document.createElement('div');
    topBar.style.display = 'flex';
    topBar.style.justifyContent = 'space-between';
    topBar.style.alignItems = 'center';
    topBar.style.padding = '4px 0';

    const countLabel = document.createElement('span');
    countLabel.textContent = `${damagedList.length} Damaged Item(s) Found`;
    countLabel.style.fontSize = '12px';
    countLabel.style.color = '#88aacc';
    topBar.appendChild(countLabel);

    const repairAllBtn = document.createElement('button');
    repairAllBtn.textContent = `Repair All (${totalCost} Gold)`;
    repairAllBtn.style.padding = '6px 14px';
    repairAllBtn.style.fontFamily = 'monospace';
    repairAllBtn.style.fontSize = '12px';
    repairAllBtn.style.fontWeight = 'bold';
    repairAllBtn.style.borderRadius = '4px';

    if (gameState.gold >= totalCost) {
      repairAllBtn.style.border = '1px solid #00ffaa';
      repairAllBtn.style.backgroundColor = 'rgba(0, 255, 170, 0.2)';
      repairAllBtn.style.color = '#00ffaa';
      repairAllBtn.style.cursor = 'pointer';
      repairAllBtn.addEventListener('click', () => {
        gameState.gold -= totalCost;
        damagedList.forEach((d) => {
          d.item.durability = d.item.maxDurability;
        });
        gameState.saveToLocalStorage();
        showSystemMessage(`[All items repaired for ${totalCost} Gold.]`);
        if (this.onStateChangeCallback) this.onStateChangeCallback();
        this.render();
      });
    } else {
      repairAllBtn.disabled = true;
      repairAllBtn.style.border = '1px solid #555';
      repairAllBtn.style.backgroundColor = 'rgba(50, 50, 50, 0.4)';
      repairAllBtn.style.color = '#777';
      repairAllBtn.style.cursor = 'not-allowed';
      repairAllBtn.title = `Requires ${totalCost} Gold (have ${gameState.gold})`;
    }
    topBar.appendChild(repairAllBtn);
    container.appendChild(topBar);

    // List of Damaged Items
    const listWrap = document.createElement('div');
    listWrap.style.display = 'flex';
    listWrap.style.flexDirection = 'column';
    listWrap.style.gap = '6px';
    listWrap.style.maxHeight = '280px';
    listWrap.style.overflowY = 'auto';

    damagedList.forEach((d) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '8px 12px';
      row.style.backgroundColor = 'rgba(15, 25, 40, 0.6)';
      row.style.border = '1px solid var(--frame-inner)';
      row.style.borderRadius = '5px';

      const left = document.createElement('div');
      const enhanceTag = d.item.enhance ? ` <span style="color:#ffcc00;">+${d.item.enhance}</span>` : '';
      left.innerHTML = `
        <div style="font-weight:bold; color:#ffffff; font-size:12px;">${d.item.name}${enhanceTag}</div>
        <div style="font-size:10px; color:#88a0b0;">Equipped on: <b style="color:var(--accent);">${d.owner}</b> (${d.slot})</div>
      `;
      row.appendChild(left);

      const mid = document.createElement('div');
      mid.style.fontSize = '11px';
      mid.style.color = '#ffaa00';
      mid.textContent = `Durability: ${d.item.durability}/${d.item.maxDurability}`;
      row.appendChild(mid);

      const btn = document.createElement('button');
      btn.textContent = `Repair (${d.cost}G)`;
      btn.style.padding = '4px 10px';
      btn.style.fontFamily = 'monospace';
      btn.style.fontSize = '11px';
      btn.style.fontWeight = 'bold';
      btn.style.borderRadius = '3px';

      if (gameState.gold >= d.cost) {
        btn.style.border = '1px solid var(--accent)';
        btn.style.backgroundColor = 'rgba(180, 140, 255, 0.15)';
        btn.style.color = 'var(--frame)';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', () => {
          gameState.gold -= d.cost;
          d.item.durability = d.item.maxDurability;
          gameState.saveToLocalStorage();
          showSystemMessage(`[${d.item.name} repaired to full durability.]`);
          if (this.onStateChangeCallback) this.onStateChangeCallback();
          this.render();
        });
      } else {
        btn.disabled = true;
        btn.style.border = '1px solid #555';
        btn.style.backgroundColor = 'rgba(40, 40, 40, 0.4)';
        btn.style.color = '#666';
        btn.style.cursor = 'not-allowed';
      }

      row.appendChild(btn);
      listWrap.appendChild(row);
    });

    container.appendChild(listWrap);
  }

  // --- TAB 2: FORGE ---
  renderForgeTab(container, bestSmith) {
    // 1. Active Forge Progress Bar (if active)
    const activeJobs = gameState.forgeQueue || [];
    if (activeJobs.length > 0) {
      const job = activeJobs[0];
      const pct = Math.min(100, Math.round(((job.progress || 0) / (job.duration || 20)) * 100));
      const secLeft = Math.max(0, Math.ceil((job.duration || 20) - (job.progress || 0)));

      const activeBox = document.createElement('div');
      activeBox.style.padding = '10px 14px';
      activeBox.style.backgroundColor = 'rgba(255, 120, 0, 0.12)';
      activeBox.style.border = '1px solid #ff7700';
      activeBox.style.borderRadius = '6px';
      activeBox.style.display = 'flex';
      activeBox.style.flexDirection = 'column';
      activeBox.style.gap = '6px';

      const topRow = document.createElement('div');
      topRow.style.display = 'flex';
      topRow.style.justifyContent = 'space-between';
      topRow.style.fontSize = '12px';
      topRow.style.fontWeight = 'bold';
      topRow.innerHTML = `
        <span style="color:#ffaa00;">🔨 FORGING: ${job.recipeName}</span>
        <span style="color:#ffcc00;">${secLeft}s remaining (${pct}%)</span>
      `;
      activeBox.appendChild(topRow);

      const pBarBg = document.createElement('div');
      pBarBg.style.width = '100%';
      pBarBg.style.height = '8px';
      pBarBg.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
      pBarBg.style.borderRadius = '4px';
      pBarBg.style.overflow = 'hidden';

      const pBarFill = document.createElement('div');
      pBarFill.style.width = `${pct}%`;
      pBarFill.style.height = '100%';
      pBarFill.style.backgroundColor = '#ff8800';
      pBarFill.style.transition = 'width 0.2s';
      pBarBg.appendChild(pBarFill);
      activeBox.appendChild(pBarBg);

      container.appendChild(activeBox);
    }

    // 2. Recipe Cards Grid
    const recipesWrap = document.createElement('div');
    recipesWrap.style.display = 'grid';
    recipesWrap.style.gridTemplateColumns = 'repeat(2, 1fr)';
    recipesWrap.style.gap = '8px';
    recipesWrap.style.maxHeight = '280px';
    recipesWrap.style.overflowY = 'auto';

    FORGE_RECIPES.forEach((rec) => {
      const card = document.createElement('div');
      card.style.padding = '8px 10px';
      card.style.backgroundColor = 'rgba(12, 22, 36, 0.7)';
      card.style.border = '1px solid var(--frame-inner)';
      card.style.borderRadius = '5px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.justifyContent = 'space-between';
      card.style.gap = '6px';

      // Header
      const head = document.createElement('div');
      head.style.display = 'flex';
      head.style.justifyContent = 'space-between';
      head.style.alignItems = 'center';
      head.style.fontSize = '12px';

      const leftHead = document.createElement('div');
      leftHead.style.display = 'flex';
      leftHead.style.alignItems = 'center';
      leftHead.style.gap = '8px';

      const tmplKey = rec.resultTemplateId ? rec.resultTemplateId.toUpperCase() : null;
      const tmpl = (tmplKey && ITEM_TEMPLATES[tmplKey]) || { name: rec.name, slot: rec.slot, grade: 'D' };
      const icon = getItemIcon(tmpl);
      icon.style.width = '32px';
      icon.style.height = '32px';
      icon.style.borderRadius = '4px';
      leftHead.appendChild(icon);

      const nameSpan = document.createElement('span');
      nameSpan.style.fontWeight = 'bold';
      nameSpan.style.color = '#ffffff';
      nameSpan.textContent = rec.name;
      leftHead.appendChild(nameSpan);

      head.appendChild(leftHead);

      const costSpan = document.createElement('span');
      costSpan.style.color = '#ffcc00';
      costSpan.style.fontWeight = 'bold';
      costSpan.textContent = `${rec.goldCost}G`;
      head.appendChild(costSpan);

      card.appendChild(head);

      // Materials Required
      const matsList = document.createElement('div');
      matsList.style.fontSize = '11px';
      matsList.style.display = 'flex';
      matsList.style.flexWrap = 'wrap';
      matsList.style.gap = '6px';

      let canAffordMats = true;
      for (const [matId, reqCount] of Object.entries(rec.materials)) {
        const owned = gameState.materials?.[matId] || 0;
        const ok = owned >= reqCount;
        if (!ok) canAffordMats = false;
        const color = ok ? '#00ffaa' : '#ff5555';
        const matName = matId.replace(/_/g, ' ');
        const badge = document.createElement('span');
        badge.style.color = color;
        badge.innerHTML = `${matName}: <b>${owned}/${reqCount}</b>`;
        matsList.appendChild(badge);
      }
      card.appendChild(matsList);

      // Forge Button
      const canAffordAll = canAffordMats && gameState.gold >= rec.goldCost;
      const isBusy = (gameState.forgeQueue || []).length > 0;

      const forgeBtn = document.createElement('button');
      forgeBtn.textContent = isBusy ? 'Forge Busy...' : 'Forge (20s)';
      forgeBtn.style.padding = '4px 8px';
      forgeBtn.style.fontFamily = 'monospace';
      forgeBtn.style.fontSize = '11px';
      forgeBtn.style.fontWeight = 'bold';
      forgeBtn.style.borderRadius = '3px';

      if (canAffordAll && !isBusy) {
        forgeBtn.style.border = '1px solid #ff8800';
        forgeBtn.style.backgroundColor = 'rgba(255, 136, 0, 0.2)';
        forgeBtn.style.color = '#ff9911';
        forgeBtn.style.cursor = 'pointer';
        forgeBtn.addEventListener('click', () => {
          const res = gameState.startForge(rec.id);
          if (res.success) {
            showSystemMessage(`[Began forging ${rec.name}. Takes 20s.]`);
            if (this.onForgeStartedCallback) this.onForgeStartedCallback(rec);
            this.render();
          } else {
            showSystemMessage(`[Forge failed: ${res.error}]`);
          }
        });
      } else {
        forgeBtn.disabled = true;
        forgeBtn.style.border = '1px solid #555';
        forgeBtn.style.backgroundColor = 'rgba(40, 40, 40, 0.3)';
        forgeBtn.style.color = '#777';
        forgeBtn.style.cursor = 'not-allowed';
      }

      card.appendChild(forgeBtn);
      recipesWrap.appendChild(card);
    });

    container.appendChild(recipesWrap);
  }

  // --- TAB 3: ENHANCE ---
  renderEnhanceTab(container) {
    const enhanceable = this.getAllEnhanceableItems();

    if (enhanceable.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No enhanceable equipment found (all items are max +5 or none available).';
      empty.style.color = '#88aacc';
      empty.style.padding = '40px';
      empty.style.textAlign = 'center';
      container.appendChild(empty);
      return;
    }

    if (!this.selectedEnhanceItemId && enhanceable.length > 0) {
      this.selectedEnhanceItemId = enhanceable[0].item.id;
    }

    // Select row
    const selectRow = document.createElement('div');
    selectRow.style.display = 'flex';
    selectRow.style.alignItems = 'center';
    selectRow.style.gap = '8px';

    const lbl = document.createElement('span');
    lbl.textContent = 'Select Item to Enhance:';
    lbl.style.fontSize = '12px';
    lbl.style.color = 'var(--frame)';
    lbl.style.fontWeight = 'bold';
    selectRow.appendChild(lbl);

    const select = document.createElement('select');
    select.style.padding = '4px 8px';
    select.style.backgroundColor = '#0b1626';
    select.style.border = '1px solid var(--frame-inner)';
    select.style.color = '#ffffff';
    select.style.fontFamily = 'monospace';
    select.style.borderRadius = '4px';
    select.style.flex = '1';

    enhanceable.forEach((e) => {
      const opt = document.createElement('option');
      opt.value = e.item.id;
      const tag = e.item.enhance ? `+${e.item.enhance}` : '+0';
      opt.textContent = `${e.item.name} [${tag}] - Location: ${e.location}`;
      if (e.item.id === this.selectedEnhanceItemId) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener('change', (ev) => {
      this.selectedEnhanceItemId = ev.target.value;
      this.enhanceResult = null;
      this.render();
    });
    selectRow.appendChild(select);
    container.appendChild(selectRow);

    // Selected item detail card
    const targetObj = enhanceable.find((e) => e.item.id === this.selectedEnhanceItemId) || enhanceable[0];
    const item = targetObj.item;
    const enhanceCost = getEnhanceCost(item);

    const detailCard = document.createElement('div');
    detailCard.style.padding = '14px 18px';
    detailCard.style.backgroundColor = 'rgba(15, 25, 42, 0.7)';
    detailCard.style.border = '1px solid var(--frame-inner)';
    detailCard.style.borderRadius = '6px';
    detailCard.style.display = 'flex';
    detailCard.style.flexDirection = 'column';
    detailCard.style.gap = '10px';

    // Result Flash Banner if just enhanced
    if (this.enhanceResult) {
      const resBanner = document.createElement('div');
      resBanner.style.padding = '8px 12px';
      resBanner.style.borderRadius = '4px';
      resBanner.style.fontWeight = 'bold';
      resBanner.style.fontSize = '13px';
      resBanner.style.textAlign = 'center';
      if (this.enhanceResult.success) {
        resBanner.style.backgroundColor = 'rgba(255, 215, 0, 0.25)';
        resBanner.style.border = '1px solid #ffd700';
        resBanner.style.color = '#ffd700';
      } else {
        resBanner.style.backgroundColor = 'rgba(255, 51, 68, 0.2)';
        resBanner.style.border = '1px solid #ff3344';
        resBanner.style.color = '#ff6677';
      }
      resBanner.textContent = this.enhanceResult.text;
      detailCard.appendChild(resBanner);
    }

    if (enhanceCost) {
      const curEnhance = item.enhance || 0;
      const nextEnhance = enhanceCost.targetEnhance;
      const ratePct = Math.round(enhanceCost.successRate * 100);

      const titleEl = document.createElement('div');
      titleEl.style.fontSize = '14px';
      titleEl.style.fontWeight = 'bold';
      titleEl.innerHTML = `
        <span style="color:#ffffff;">${item.name}</span>
        <span style="color:#00ffaa;"> (+${curEnhance} &rarr; +${nextEnhance})</span>
      `;
      detailCard.appendChild(titleEl);

      // Stat Changes preview
      const preview = document.createElement('div');
      preview.style.fontSize = '12px';
      preview.style.color = '#88aacc';
      if (item.slot === 'weapon') {
        const curDmg = Math.round((item.damageMult || 1.0) * (1 + 0.1 * curEnhance) * 100) / 100;
        const nextDmg = Math.round((item.damageMult || 1.0) * (1 + 0.1 * nextEnhance) * 100) / 100;
        preview.innerHTML = `Damage Multiplier: <b style="color:#ffcc00">${curDmg}x</b> &rarr; <b style="color:#00ffaa">${nextDmg}x (+10%)</b>`;
      } else if (item.slot === 'armor') {
        const curDef = Math.round((item.defense || 0) * (1 + 0.1 * curEnhance));
        const nextDef = Math.round((item.defense || 0) * (1 + 0.1 * nextEnhance));
        preview.innerHTML = `Defense: <b style="color:var(--frame)">${curDef}</b> &rarr; <b style="color:var(--ok)">${nextDef} (+10%)</b>`;
      } else {
        preview.innerHTML = `Block & Def Multiplier: <b style="color:var(--frame)">+${curEnhance * 10}%</b> &rarr; <b style="color:var(--ok)">+${nextEnhance * 10}%</b>`;
      }
      detailCard.appendChild(preview);

      // Cost & Success Rate Row
      const costBox = document.createElement('div');
      costBox.style.display = 'flex';
      costBox.style.justifyContent = 'space-between';
      costBox.style.alignItems = 'center';
      costBox.style.padding = '8px 12px';
      costBox.style.backgroundColor = 'rgba(5, 12, 24, 0.6)';
      costBox.style.borderRadius = '4px';
      costBox.style.fontSize = '12px';

      const ownedIngots = gameState.materials?.iron_ingot || 0;
      const hasGold = gameState.gold >= enhanceCost.goldCost;
      const hasIngots = ownedIngots >= enhanceCost.ironIngots;
      const canAfford = hasGold && hasIngots;

      costBox.innerHTML = `
        <div>Cost: <b style="color:${hasGold ? '#ffcc00' : '#ff4444'};">${enhanceCost.goldCost}G</b> &bull; Iron Ingots: <b style="color:${hasIngots ? 'var(--frame)' : '#ff4444'};">${ownedIngots}/${enhanceCost.ironIngots}</b></div>
        <div style="font-weight:bold; color:var(--ok);">Success Rate: ${ratePct}%</div>
      `;
      detailCard.appendChild(costBox);

      // Notice
      const notice = document.createElement('div');
      notice.style.fontSize = '10px';
      notice.style.color = '#88a0b0';
      notice.textContent = '* On failure: Iron Ingots and 50% gold are consumed. Item never breaks.';
      detailCard.appendChild(notice);

      // Enhance Button
      const enhanceBtn = document.createElement('button');
      enhanceBtn.textContent = `Attempt Enhancement (+${nextEnhance})`;
      enhanceBtn.style.padding = '10px 16px';
      enhanceBtn.style.fontFamily = 'monospace';
      enhanceBtn.style.fontSize = '13px';
      enhanceBtn.style.fontWeight = 'bold';
      enhanceBtn.style.borderRadius = '5px';

      if (canAfford) {
        enhanceBtn.style.border = '2px solid var(--accent)';
        enhanceBtn.style.backgroundColor = 'rgba(180, 140, 255, 0.25)';
        enhanceBtn.style.color = 'var(--frame)';
        enhanceBtn.style.cursor = 'pointer';

        enhanceBtn.addEventListener('click', () => {
          // Deduct materials
          gameState.materials.iron_ingot -= enhanceCost.ironIngots;

          const roll = Math.random();
          if (roll < enhanceCost.successRate) {
            // Success!
            gameState.gold -= enhanceCost.goldCost;
            item.enhance = nextEnhance;
            this.enhanceResult = {
              success: true,
              text: `✨ SUCCESS! ${item.name} is now +${nextEnhance}!`,
            };
            showSystemMessage(`[Enhance Success: ${item.name} reached +${nextEnhance}!]`);
          } else {
            // Failure!
            const lostGold = Math.floor(enhanceCost.goldCost * 0.5);
            gameState.gold -= lostGold;
            this.enhanceResult = {
              success: false,
              text: `❌ FAILED! Consumed materials and ${lostGold}G. Item remains +${curEnhance}.`,
            };
            showSystemMessage(`[Enhance Failed: materials and ${lostGold}G lost.]`);
          }

          gameState.saveToLocalStorage();
          if (this.onStateChangeCallback) this.onStateChangeCallback();
          this.render();
        });
      } else {
        enhanceBtn.disabled = true;
        enhanceBtn.style.border = '1px solid #555';
        enhanceBtn.style.backgroundColor = 'rgba(40, 40, 40, 0.4)';
        enhanceBtn.style.color = '#666';
        enhanceBtn.style.cursor = 'not-allowed';
      }

      detailCard.appendChild(enhanceBtn);
    }

    container.appendChild(detailCard);
  }
}
