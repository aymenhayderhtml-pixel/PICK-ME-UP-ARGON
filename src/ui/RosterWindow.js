import { SystemWindow } from './SystemWindow.js';
import { gameState } from '../core/GameState.js';
import { getRarityHexString, getXpForLevel, LEVEL_CAP_PER_STAR, getPromotionCost, getSkillXpNeeded } from '../data/rules.js';
import { showSystemMessage } from './Hud.js';
import { pickLine } from '../data/iselle.js';
import { EquipmentWindow } from './EquipmentWindow.js';
import { getDisplayStats, formatStatDisplay, getHeroThreeGroups, getGrowthRate } from '../core/Stats.js';
import { autoEquipHero } from '../core/Inventory.js';

function getMotivationTagHtml(motivation) {
  const mot = motivation || 'normal';
  if (mot === 'diligent') {
    return `<span style="font-size:9px; font-weight:bold; color:var(--ok); border:1px solid var(--ok); padding:1px 5px; border-radius:3px; letter-spacing:0.5px;">DILIGENT</span>`;
  }
  if (mot === 'lazy') {
    return `<span style="font-size:9px; font-weight:bold; color:var(--danger); border:1px solid var(--danger); padding:1px 5px; border-radius:3px; letter-spacing:0.5px;">LAZY</span>`;
  }
  return `<span style="font-size:9px; font-weight:bold; color:#88aacc; border:1px solid #446688; padding:1px 5px; border-radius:3px; letter-spacing:0.5px;">NORMAL</span>`;
}

export class RosterWindow extends SystemWindow {
  constructor(onOpenSynthesis, onNewGameReset, onAwakenCallback = null) {
    super('HERO ROSTER & STATUS');
    this.onOpenSynthesis = onOpenSynthesis;
    this.onNewGameReset = onNewGameReset;
    this.onAwakenCallback = onAwakenCallback;

    this.container.style.width = '880px';
    this.container.style.maxWidth = '95vw';

    this.currentTab = 'active'; // 'active' | 'equipment' | 'fallen'
    this.sortBy = 'star'; // 'star' | 'level' | 'name'
    this.sortAsc = false;
    this.selectedHeroId = null;

    this.equipmentSubWindow = new EquipmentWindow(() => {
      this.render();
    });

    // Golden Flash Overlay for Promotion
    this.flashEl = document.createElement('div');
    this.flashEl.style.position = 'fixed';
    this.flashEl.style.top = '0';
    this.flashEl.style.left = '0';
    this.flashEl.style.width = '100vw';
    this.flashEl.style.height = '100vh';
    this.flashEl.style.backgroundColor = '#ffd700';
    this.flashEl.style.zIndex = '10010';
    this.flashEl.style.pointerEvents = 'none';
    this.flashEl.style.opacity = '0';
    this.flashEl.style.transition = 'opacity 0.4s ease-out';
    document.body.appendChild(this.flashEl);

    this.buildUI();
  }

  open(heroId = null, defaultTab = null) {
    if (defaultTab) {
      this.currentTab = defaultTab;
    }
    if (heroId) {
      this.selectedHeroId = heroId;
    } else if (!this.selectedHeroId && gameState.heroes.length > 0) {
      this.selectedHeroId = gameState.heroes[0].id;
    }
    this.render();
    super.open();
  }

  buildUI() {
    this.contentElement.style.padding = '12px 16px';
    this.contentElement.style.display = 'flex';
    this.contentElement.style.flexDirection = 'column';
    this.contentElement.style.gap = '10px';

    // 1. Top Tabs & Controls Bar
    this.topBar = document.createElement('div');
    this.topBar.style.display = 'flex';
    this.topBar.style.justifyContent = 'space-between';
    this.topBar.style.alignItems = 'center';
    this.topBar.style.borderBottom = '1px solid var(--frame-inner)';
    this.topBar.style.paddingBottom = '8px';
    this.contentElement.appendChild(this.topBar);

    this.tabsContainer = document.createElement('div');
    this.tabsContainer.style.display = 'flex';
    this.tabsContainer.style.gap = '8px';
    this.topBar.appendChild(this.tabsContainer);

    this.activeTabBtn = this.createTabButton('Active Heroes', 'active');
    this.equipmentTabBtn = this.createTabButton('Equipment', 'equipment');
    this.fallenTabBtn = this.createTabButton('Fallen Heroes', 'fallen');
    this.tabsContainer.appendChild(this.activeTabBtn);
    this.tabsContainer.appendChild(this.equipmentTabBtn);
    this.tabsContainer.appendChild(this.fallenTabBtn);

    // 2. Main Content Split View
    this.mainSplit = document.createElement('div');
    this.mainSplit.style.display = 'flex';
    this.mainSplit.style.gap = '16px';
    this.mainSplit.style.minHeight = '420px';
    this.contentElement.appendChild(this.mainSplit);

    // 3. Bottom Action Bar (Stats count & New Game Hold button)
    this.bottomBar = document.createElement('div');
    this.bottomBar.style.display = 'flex';
    this.bottomBar.style.justifyContent = 'space-between';
    this.bottomBar.style.alignItems = 'center';
    this.bottomBar.style.borderTop = '1px solid var(--frame-inner)';
    this.bottomBar.style.paddingTop = '10px';
    this.bottomBar.style.marginTop = '4px';
    this.contentElement.appendChild(this.bottomBar);

    this.summaryText = document.createElement('div');
    this.summaryText.style.fontSize = '12px';
    this.summaryText.style.color = '#88aacc';
    this.bottomBar.appendChild(this.summaryText);

    this.newGameBtn = this.createHoldButton('Reset / New Game (Hold 1.5s)', 1500, '#ff3344', () => {
      gameState.initNewGame();
      this.selectedHeroId = 'hero_han';
      this.render();
      showSystemMessage('[Save data reset. Welcome to a new journey.]');
      if (this.onNewGameReset) this.onNewGameReset();
    });
    this.bottomBar.appendChild(this.newGameBtn);
  }

  createTabButton(label, tabKey) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.padding = '6px 14px';
    btn.style.fontFamily = 'monospace, sans-serif';
    btn.style.fontSize = '12px';
    btn.style.fontWeight = 'bold';
    btn.style.cursor = 'pointer';
    btn.style.borderRadius = '4px';
    btn.style.border = '1px solid var(--frame-inner)';
    btn.addEventListener('click', () => {
      this.currentTab = tabKey;
      this.render();
    });
    return btn;
  }

  createHoldButton(label, holdMs, color, onConfirmed) {
    const btn = document.createElement('button');
    btn.style.position = 'relative';
    btn.style.padding = '6px 16px';
    btn.style.fontFamily = 'monospace, sans-serif';
    btn.style.fontSize = '12px';
    btn.style.fontWeight = 'bold';
    btn.style.color = '#ffffff';
    btn.style.backgroundColor = 'rgba(20, 20, 30, 0.8)';
    btn.style.border = `1px solid ${color}`;
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    btn.style.overflow = 'hidden';
    btn.style.userSelect = 'none';

    const fillBar = document.createElement('div');
    fillBar.style.position = 'absolute';
    fillBar.style.top = '0';
    fillBar.style.left = '0';
    fillBar.style.height = '100%';
    fillBar.style.width = '0%';
    fillBar.style.backgroundColor = color;
    fillBar.style.opacity = '0.4';
    fillBar.style.pointerEvents = 'none';
    fillBar.style.transition = 'width 0.1s linear';
    btn.appendChild(fillBar);

    const textSpan = document.createElement('span');
    textSpan.textContent = label;
    textSpan.style.position = 'relative';
    textSpan.style.zIndex = '1';
    btn.appendChild(textSpan);

    let holdTimer = null;
    let startTime = 0;
    let animFrame = null;

    const startHold = (e) => {
      e.preventDefault();
      startTime = Date.now();
      const updateFill = () => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min(100, (elapsed / holdMs) * 100);
        fillBar.style.width = `${pct}%`;
        if (elapsed < holdMs) {
          animFrame = requestAnimationFrame(updateFill);
        } else {
          fillBar.style.width = '100%';
          onConfirmed();
          resetHold();
        }
      };
      animFrame = requestAnimationFrame(updateFill);
    };

    const resetHold = () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      fillBar.style.width = '0%';
    };

    btn.addEventListener('mousedown', startHold);
    btn.addEventListener('mouseup', resetHold);
    btn.addEventListener('mouseleave', resetHold);
    btn.addEventListener('touchstart', startHold);
    btn.addEventListener('touchend', resetHold);

    return btn;
  }

  playGoldenFlash() {
    this.flashEl.style.opacity = '0.85';
    setTimeout(() => {
      this.flashEl.style.opacity = '0';
    }, 450);
  }

  render() {
    // 1. Update Tabs styling
    this.activeTabBtn.style.backgroundColor =
      this.currentTab === 'active' ? 'rgba(180, 140, 255, 0.25)' : 'transparent';
    this.activeTabBtn.style.color = this.currentTab === 'active' ? 'var(--accent)' : '#888888';

    this.equipmentTabBtn.style.backgroundColor =
      this.currentTab === 'equipment' ? 'rgba(180, 140, 255, 0.25)' : 'transparent';
    this.equipmentTabBtn.style.color = this.currentTab === 'equipment' ? 'var(--accent)' : '#888888';

    this.fallenTabBtn.style.backgroundColor =
      this.currentTab === 'fallen' ? 'rgba(255, 68, 68, 0.3)' : 'transparent';
    this.fallenTabBtn.style.color = this.currentTab === 'fallen' ? '#ff6666' : '#888888';

    this.mainSplit.innerHTML = '';

    if (this.currentTab === 'fallen') {
      this.renderFallenTab();
    } else if (this.currentTab === 'equipment') {
      this.renderEquipmentTab();
    } else {
      this.renderActiveTab();
    }

    // Update bottom summary stats
    this.summaryText.textContent = `Active: ${gameState.heroes.length} | Fallen: ${gameState.deadHeroes.length} | Dissolved: ${gameState.dissolvedHeroes || 0} | Gems: ${gameState.gems}`;
  }

  renderEquipmentTab() {
    const leftPanel = document.createElement('div');
    leftPanel.style.width = '240px';
    leftPanel.style.display = 'flex';
    leftPanel.style.flexDirection = 'column';
    leftPanel.style.gap = '6px';
    leftPanel.style.maxHeight = '420px';
    leftPanel.style.overflowY = 'auto';

    gameState.heroes.forEach((h) => {
      const isSelected = h.id === this.selectedHeroId;
      const item = document.createElement('div');
      item.style.padding = '8px 10px';
      item.style.backgroundColor = isSelected ? 'rgba(180, 140, 255, 0.2)' : 'rgba(15, 10, 25, 0.6)';
      item.style.border = isSelected ? '1px solid var(--accent)' : '1px solid rgba(180, 140, 255, 0.2)';
      item.style.borderRadius = '5px';
      item.style.cursor = 'pointer';
      item.style.fontSize = '12px';
      const nameStyle = h.star >= 7 ? 'background: linear-gradient(90deg, #ff0055, #ffaa00, #00ffaa, #00e5ff, #bb00ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight:bold;' : 'color:#ffffff; font-weight:bold;';
      item.innerHTML = `<div style="${nameStyle}">${h.name}</div><div style="font-size:11px; color:${getRarityHexString(h.star)}">${'★'.repeat(h.star)} (${h.class || 'Unknown'})</div>`;
      item.addEventListener('click', () => {
        this.selectedHeroId = h.id;
        this.render();
      });
      leftPanel.appendChild(item);
    });

    this.mainSplit.appendChild(leftPanel);

    const rightPanel = document.createElement('div');
    rightPanel.style.flex = '1';
    rightPanel.style.backgroundColor = 'rgba(8, 16, 32, 0.7)';
    rightPanel.style.border = '1px solid var(--frame-inner)';
    rightPanel.style.borderRadius = '6px';
    rightPanel.style.padding = '12px';
    rightPanel.style.display = 'flex';
    rightPanel.style.flexDirection = 'column';

    this.equipmentSubWindow.render(rightPanel, this.selectedHeroId);
    this.mainSplit.appendChild(rightPanel);
  }

  renderFallenTab() {
    const listWrap = document.createElement('div');
    listWrap.style.flex = '1';
    listWrap.style.maxHeight = '420px';
    listWrap.style.overflowY = 'auto';
    listWrap.style.display = 'flex';
    listWrap.style.flexDirection = 'column';
    listWrap.style.gap = '8px';

    if (gameState.deadHeroes.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No heroes have fallen... yet.';
      empty.style.color = '#777777';
      empty.style.fontStyle = 'italic';
      empty.style.padding = '30px';
      empty.style.textAlign = 'center';
      listWrap.appendChild(empty);
    } else {
      gameState.deadHeroes.forEach((h) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.padding = '10px 16px';
        row.style.backgroundColor = 'rgba(20, 20, 25, 0.7)';
        row.style.border = '1px solid #444450';
        row.style.borderRadius = '6px';
        row.style.color = '#888888';

        const left = document.createElement('div');
        left.innerHTML = `<span style="color:#aaaaaa; font-weight:bold;">${h.name}</span> <span style="color:#888;">${'★'.repeat(h.star)}</span> (${h.class || 'Unknown'})`;
        row.appendChild(left);

        const right = document.createElement('div');
        right.style.color = '#ff5555';
        right.textContent = h.deathCause ? `Cause: ${h.deathCause}` : `Perished on Floor ${h.deathFloor || 1}`;
        row.appendChild(right);

        listWrap.appendChild(row);
      });
    }

    this.mainSplit.appendChild(listWrap);
  }

  renderActiveTab() {
    // 1. Left List Container
    const leftPanel = document.createElement('div');
    leftPanel.style.width = '300px';
    leftPanel.style.display = 'flex';
    leftPanel.style.flexDirection = 'column';
    leftPanel.style.gap = '8px';

    // Sort Bar
    const sortBar = document.createElement('div');
    sortBar.style.display = 'flex';
    sortBar.style.gap = '4px';
    sortBar.style.alignItems = 'center';

    const sortLabel = document.createElement('span');
    sortLabel.textContent = 'Sort:';
    sortLabel.style.fontSize = '11px';
    sortLabel.style.color = '#888';
    sortBar.appendChild(sortLabel);

    const sortOptions = [
      { key: 'star', label: '★ Star' },
      { key: 'level', label: 'Lv Level' },
      { key: 'name', label: 'Name' },
      { key: 'mentality', label: 'M Mentality' },
      { key: 'skills', label: 'S Skills' },
      { key: 'physical', label: 'P Physical' },
    ];

    sortOptions.forEach((opt) => {
      const btn = document.createElement('button');
      btn.textContent = opt.label;
      btn.style.padding = '3px 8px';
      btn.style.fontSize = '11px';
      btn.style.fontFamily = 'monospace';
      btn.style.cursor = 'pointer';
      btn.style.borderRadius = '3px';
      btn.style.border = '1px solid var(--frame-inner)';
      btn.style.backgroundColor = this.sortBy === opt.key ? 'var(--accent)' : 'transparent';
      btn.style.color = this.sortBy === opt.key ? '#ffffff' : 'var(--accent)';
      btn.addEventListener('click', () => {
        if (this.sortBy === opt.key) {
          this.sortAsc = !this.sortAsc;
        } else {
          this.sortBy = opt.key;
          this.sortAsc = false;
        }
        this.render();
      });
      sortBar.appendChild(btn);
    });

    const autoEquipActiveBtn = document.createElement('button');
    autoEquipActiveBtn.textContent = 'AUTO EQUIP';
    autoEquipActiveBtn.className = 'mm-btn mm-btn-gold';
    autoEquipActiveBtn.style.padding = '3px 8px';
    autoEquipActiveBtn.style.fontSize = '11px';
    autoEquipActiveBtn.style.marginLeft = 'auto';
    autoEquipActiveBtn.style.fontWeight = 'bold';
    autoEquipActiveBtn.title = 'Equip best gear to selected hero';
    autoEquipActiveBtn.addEventListener('click', () => {
      const curHero = gameState.heroes.find((h) => h.id === this.selectedHeroId) || gameState.heroes[0];
      if (curHero) {
        const count = autoEquipHero(curHero, gameState.inventory);
        gameState.saveToLocalStorage();
        this.render();
        showSystemMessage(`[Auto-equipped ${curHero.name} with ${count} piece${count !== 1 ? 's' : ''} of gear!]`);
      }
    });
    sortBar.appendChild(autoEquipActiveBtn);

    leftPanel.appendChild(sortBar);

    // Sorted Hero List
    const heroes = [...gameState.heroes].sort((a, b) => {
      if (this.sortBy === 'name') {
        const valA = a.name || '';
        const valB = b.name || '';
        return this.sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (this.sortBy === 'mentality' || this.sortBy === 'skills' || this.sortBy === 'physical') {
        const scoreA = getHeroThreeGroups(a)[this.sortBy].score;
        const scoreB = getHeroThreeGroups(b)[this.sortBy].score;
        return this.sortAsc ? scoreA - scoreB : scoreB - scoreA;
      }
      let valA = a[this.sortBy] ?? 0;
      let valB = b[this.sortBy] ?? 0;
      return this.sortAsc ? valA - valB : valB - valA;
    });

    const listScroll = document.createElement('div');
    listScroll.style.maxHeight = '390px';
    listScroll.style.overflowY = 'auto';
    listScroll.style.display = 'flex';
    listScroll.style.flexDirection = 'column';
    listScroll.style.gap = '6px';
    listScroll.style.paddingRight = '4px';

    heroes.forEach((h) => {
      const isSelected = h.id === this.selectedHeroId;
      const inParty = gameState.isInParty(h.id);
      const slot = gameState.getPartySlot(h.id);
      const starColor = getRarityHexString(h.star);

      const item = document.createElement('div');
      item.style.padding = '8px 10px';
      item.style.backgroundColor = isSelected
        ? 'rgba(180, 140, 255, 0.2)'
        : 'rgba(15, 10, 25, 0.6)';
      item.style.border = isSelected ? '1px solid var(--accent)' : '1px solid rgba(180, 140, 255, 0.2)';
      item.style.borderRadius = '5px';
      item.style.cursor = 'pointer';
      item.style.display = 'flex';
      item.style.flexDirection = 'column';
      item.style.gap = '4px';

      item.addEventListener('click', () => {
        this.selectedHeroId = h.id;
        this.render();
      });

      // Name & Stars row
      const isAwakened = h.star >= 7;
      const nameStyle = isAwakened
        ? 'font-weight:bold; background: linear-gradient(90deg, #ff0055, #ffaa00, #00ffaa, #00e5ff, #bb00ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent;'
        : 'font-weight:bold; color:#ffffff;';
      const starsHtml = isAwakened
        ? '<span style="background: linear-gradient(90deg, #ff0055, #ffaa00, #00ffaa, #00e5ff, #bb00ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size:12px;">★★★★★★★</span>'
        : `<span style="color:${starColor}; font-size:12px;">${'★'.repeat(h.star)}</span>`;

      const coopHtml = h.cooperation === 'uncooperative'
        ? '<span style="color:#ff3344; font-weight:bold; margin-left:4px; font-size:11px;" title="Uncooperative">[!]</span>'
        : '';
      const isPanicProne = h.composure !== undefined && h.composure < 45;
      const panicTag = isPanicProne
        ? '<span style="color:var(--danger); font-weight:bold; margin-left:4px; font-size:10px; border:1px solid var(--danger); padding:0 3px; border-radius:2px;" title="Low Composure: prone to battle panic">[PANIC-PRONE]</span>'
        : '';
      const nameRow = document.createElement('div');
      nameRow.style.display = 'flex';
      nameRow.style.justifyContent = 'space-between';
      nameRow.style.alignItems = 'center';
      nameRow.innerHTML = `
        <span style="${nameStyle}">${h.name}${coopHtml}${panicTag}</span>
        ${starsHtml}
      `;
      item.appendChild(nameRow);

      // Class, Level, Motivation & Party Badge
      const subRow = document.createElement('div');
      subRow.style.display = 'flex';
      subRow.style.justifyContent = 'space-between';
      subRow.style.alignItems = 'center';
      subRow.style.fontSize = '11px';
      subRow.style.color = '#88aacc';
      subRow.innerHTML = `
        <span>${h.class} | Lv ${h.level} ${getMotivationTagHtml(h.motivation)}</span>
        <span>${inParty ? `<span style="color:#00ffcc; font-weight:bold;">[Slot ${slot}]</span>` : ''}</span>
      `;
      item.appendChild(subRow);

      // Three Groups (M, S, P) & Home Cottage
      const grp = getHeroThreeGroups(h);
      const groupsRow = document.createElement('div');
      groupsRow.style.display = 'flex';
      groupsRow.style.justifyContent = 'space-between';
      groupsRow.style.alignItems = 'center';
      groupsRow.style.fontSize = '10px';
      groupsRow.style.fontWeight = 'bold';
      groupsRow.innerHTML = `
        <span style="letter-spacing:0.8px;">
          <span style="color:#b48cff;">M:${grp.mentality.grade}</span>
          <span style="color:#7dffb0; margin-left:6px;">S:${grp.skills.grade}</span>
          <span style="color:#ffd36b; margin-left:6px;">P:${grp.physical.grade}</span>
        </span>
        <span style="color:#a0b8cf;">HOME: HOUSE ${h.houseIndex || 1}</span>
      `;
      item.appendChild(groupsRow);

      // Fatigue Bar
      const fatPct = Math.min(100, h.fatigue || 0);
      const fatColor = fatPct > 80 ? '#ff3333' : fatPct > 50 ? '#ffaa00' : '#44bb44';
      const fatWrap = document.createElement('div');
      fatWrap.style.width = '100%';
      fatWrap.style.height = '4px';
      fatWrap.style.backgroundColor = 'rgba(0,0,0,0.5)';
      fatWrap.style.borderRadius = '2px';
      fatWrap.style.overflow = 'hidden';

      const fatFill = document.createElement('div');
      fatFill.style.width = `${fatPct}%`;
      fatFill.style.height = '100%';
      fatFill.style.backgroundColor = fatColor;
      fatWrap.appendChild(fatFill);
      item.appendChild(fatWrap);

      listScroll.appendChild(item);
    });

    leftPanel.appendChild(listScroll);
    this.mainSplit.appendChild(leftPanel);

    // 2. Right Detail Panel
    const rightPanel = document.createElement('div');
    rightPanel.style.flex = '1';
    rightPanel.style.backgroundColor = 'rgba(8, 16, 32, 0.7)';
    rightPanel.style.border = '1px solid var(--frame-inner)';
    rightPanel.style.borderRadius = '6px';
    rightPanel.style.padding = '14px 18px';
    rightPanel.style.display = 'flex';
    rightPanel.style.flexDirection = 'column';
    rightPanel.style.gap = '12px';

    const selHero = gameState.heroes.find((h) => h.id === this.selectedHeroId) || heroes[0];
    if (selHero) {
      const starColor = getRarityHexString(selHero.star);
      const cap = selHero.star * LEVEL_CAP_PER_STAR;
      const xpNeeded = getXpForLevel(selHero.level);
      const xpPct = selHero.level >= cap ? 100 : Math.min(100, (selHero.exp / xpNeeded) * 100);

      // Detail Header
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'flex-start';
      const isSelAwakened = selHero.star >= 7;
      const selNameStyle = isSelAwakened
        ? 'font-size:20px; font-weight:bold; background: linear-gradient(90deg, #ff0055, #ffaa00, #00ffaa, #00e5ff, #bb00ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent;'
        : 'font-size:20px; font-weight:bold; color:#ffffff;';
      const selStarsHtml = isSelAwakened
        ? '<span style="background: linear-gradient(90deg, #ff0055, #ffaa00, #00ffaa, #00e5ff, #bb00ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">★★★★★★★</span>'
        : `<span style="color:${starColor};">${'★'.repeat(selHero.star)}</span>`;

      const selPanicTag = (selHero.composure !== undefined && selHero.composure < 45)
        ? '<span style="color:var(--danger); font-weight:bold; font-size:11px; border:1px solid var(--danger); padding:1px 4px; border-radius:3px; margin-left:6px;">[PANIC-PRONE]</span>'
        : '';
      const growthRate = selHero.level > 1 ? getGrowthRate(selHero) : null;
      const growthHtml = growthRate
        ? ` &bull; GROWTH: <span style="font-weight:bold; color:${growthRate === 'HIGH' ? '#7dffb0' : growthRate === 'LOW' ? '#ff5a6e' : '#ffd36b'};">${growthRate}</span>`
        : '';

      header.innerHTML = `
        <div>
          <div style="${selNameStyle}">
            ${selHero.name} ${selStarsHtml}${selPanicTag}
          </div>
          <div style="font-size:12px; color:#88aacc; margin-top:2px;">
            Class: ${selHero.class}${selHero.pastJob ? ` (Former ${selHero.pastJob})` : ''} &bull; ${selHero.personality || 'Standard'} &bull; ${getMotivationTagHtml(selHero.motivation)} &bull; <span style="color:var(--gold);">HOME: HOUSE ${selHero.houseIndex || 1}</span>${growthHtml}
          </div>
        </div>
        <div>
          <div style="font-size:16px; font-weight:bold; color:var(--frame); text-align:right;">Lv ${selHero.level}/${cap}</div>
          <div style="display:flex; align-items:center; gap:6px; margin-top:4px; justify-content:flex-end;">
            <div style="width:60px; height:6px; background:rgba(0,0,0,0.6); border-radius:3px; overflow:hidden; border:1px solid #334455;">
              <div style="width:${Math.min(100, selHero.fatigue || 0)}%; height:100%; background:${(selHero.fatigue || 0) > 80 ? 'var(--danger)' : (selHero.fatigue || 0) > 40 ? 'var(--gold)' : 'var(--ok)'};"></div>
            </div>
            <span style="font-size:10px; color:#88aacc;">${Math.round(selHero.fatigue || 0)}</span>
          </div>
        </div>
      `;
      rightPanel.appendChild(header);

      // EXP Bar
      const expContainer = document.createElement('div');
      expContainer.style.display = 'flex';
      expContainer.style.flexDirection = 'column';
      expContainer.style.gap = '3px';

      const expLabel = document.createElement('div');
      expLabel.style.display = 'flex';
      expLabel.style.justifyContent = 'space-between';
      expLabel.style.fontSize = '11px';
      expLabel.style.color = '#aaaaaa';
      expLabel.innerHTML = `
        <span>EXP</span>
        <span>${selHero.level >= cap ? 'CAP REACHED' : `${selHero.exp} / ${xpNeeded} EXP`}</span>
      `;
      expContainer.appendChild(expLabel);

      const expBarBg = document.createElement('div');
      expBarBg.style.width = '100%';
      expBarBg.style.height = '6px';
      expBarBg.style.backgroundColor = 'rgba(255,255,255,0.06)';
      expBarBg.style.borderRadius = '3px';
      expBarBg.style.overflow = 'hidden';

      const expFill = document.createElement('div');
      expFill.style.width = `${xpPct}%`;
      expFill.style.height = '100%';
      expFill.style.backgroundColor = 'var(--accent)';
      expBarBg.appendChild(expFill);
      expContainer.appendChild(expBarBg);
      rightPanel.appendChild(expContainer);

      // Stress bar (purple)
      const stressVal = Math.round(selHero.stress || 0);
      const stressContainer = document.createElement('div');
      stressContainer.style.display = 'flex';
      stressContainer.style.flexDirection = 'column';
      stressContainer.style.gap = '3px';

      const stressLabelRow = document.createElement('div');
      stressLabelRow.style.display = 'flex';
      stressLabelRow.style.justifyContent = 'space-between';
      stressLabelRow.style.fontSize = '11px';
      stressLabelRow.style.color = '#c084fc';
      stressLabelRow.innerHTML = `<span>STRESS</span><span>${stressVal}/100</span>`;
      stressContainer.appendChild(stressLabelRow);

      const stressBarBg = document.createElement('div');
      stressBarBg.style.width = '100%';
      stressBarBg.style.height = '6px';
      stressBarBg.style.backgroundColor = '#1f132b';
      stressBarBg.style.borderRadius = '3px';
      stressBarBg.style.overflow = 'hidden';

      const stressFill = document.createElement('div');
      stressFill.style.width = `${Math.min(100, Math.max(0, stressVal))}%`;
      stressFill.style.height = '100%';
      stressFill.style.backgroundColor = stressVal >= 80 ? '#e879f9' : '#a84bff';
      stressBarBg.appendChild(stressFill);
      stressContainer.appendChild(stressBarBg);
      rightPanel.appendChild(stressContainer);

      // Three Groups Visual Bars (Mentality, Skills, Physical)
      const groupsData = getHeroThreeGroups(selHero);
      const groupsPanel = document.createElement('div');
      groupsPanel.style.display = 'grid';
      groupsPanel.style.gridTemplateColumns = 'repeat(3, 1fr)';
      groupsPanel.style.gap = '8px';
      groupsPanel.style.backgroundColor = 'rgba(20, 15, 35, 0.6)';
      groupsPanel.style.border = '1px solid var(--frame-inner)';
      groupsPanel.style.borderRadius = '6px';
      groupsPanel.style.padding = '8px 10px';

      const groupDefs = [
        { key: 'mentality', label: 'MENTALITY', col: '#b48cff', data: groupsData.mentality },
        { key: 'skills', label: 'SKILLS', col: '#7dffb0', data: groupsData.skills },
        { key: 'physical', label: 'PHYSICAL', col: '#ffd36b', data: groupsData.physical },
      ];

      groupDefs.forEach((g) => {
        const gBox = document.createElement('div');
        gBox.style.display = 'flex';
        gBox.style.flexDirection = 'column';
        gBox.style.gap = '2px';

        const gTop = document.createElement('div');
        gTop.style.display = 'flex';
        gTop.style.justifyContent = 'space-between';
        gTop.style.alignItems = 'center';
        gTop.style.fontSize = '10px';
        gTop.innerHTML = `
          <span style="color:${g.col}; font-weight:bold;">${g.label}</span>
          <span style="background:${g.col}25; color:${g.col}; border:1px solid ${g.col}; padding:0 5px; border-radius:3px; font-weight:bold;">${g.data.grade}</span>
        `;
        gBox.appendChild(gTop);

        const gBar = document.createElement('div');
        gBar.style.width = '100%';
        gBar.style.height = '5px';
        gBar.style.backgroundColor = 'rgba(0,0,0,0.5)';
        gBar.style.borderRadius = '2px';
        gBar.style.overflow = 'hidden';

        const gFill = document.createElement('div');
        gFill.style.width = `${Math.min(100, Math.max(5, g.data.score))}%`;
        gFill.style.height = '100%';
        gFill.style.backgroundColor = g.col;
        gBar.appendChild(gFill);
        gBox.appendChild(gBar);

        groupsPanel.appendChild(gBox);
      });
      rightPanel.appendChild(groupsPanel);

      // Stats Grid (STR, INT, HP, AGI, WIL)
      const statsGrid = document.createElement('div');
      statsGrid.style.display = 'grid';
      statsGrid.style.gridTemplateColumns = 'repeat(5, 1fr)';
      statsGrid.style.gap = '8px';

      const ds = getDisplayStats(selHero);
      const statsKeys = [
        { k: 'str', label: 'STR', color: '#ff6666', obj: ds.str },
        { k: 'int', label: 'INT', color: '#44aaff', obj: ds.int },
        { k: 'hp', label: 'HP', color: '#ffaa44', obj: ds.vit },
        { k: 'agi', label: 'AGI', color: '#66ff88', obj: ds.agi },
        { k: 'wil', label: 'WIL', color: '#cc66ff', obj: ds.wil },
      ];

      statsKeys.forEach((s) => {
        const box = document.createElement('div');
        box.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
        box.style.border = `1px solid ${s.color}44`;
        box.style.borderRadius = '4px';
        box.style.padding = '6px 4px';
        box.style.textAlign = 'center';
        box.innerHTML = `
          <div style="font-size:10px; color:${s.color}; font-weight:bold;">${s.label}</div>
          <div style="font-size:13px; font-weight:bold; color:#ffffff; margin-top:2px;">${formatStatDisplay(s.obj)}</div>
        `;
        statsGrid.appendChild(box);
      });
      rightPanel.appendChild(statsGrid);

      // Talents Row
      const talentsWrap = document.createElement('div');
      talentsWrap.style.display = 'flex';
      talentsWrap.style.alignItems = 'center';
      talentsWrap.style.gap = '6px';
      talentsWrap.style.fontSize = '12px';

      const tTitle = document.createElement('span');
      tTitle.textContent = 'Talents:';
      tTitle.style.color = '#ffcc00';
      tTitle.style.fontWeight = 'bold';
      talentsWrap.appendChild(tTitle);

      const isTalentsHidden = selHero.talentsRevealed === false;
      if (isTalentsHidden) {
        const hiddenChip = document.createElement('span');
        hiddenChip.textContent = 'TALENTS: ???';
        hiddenChip.style.color = '#888888';
        hiddenChip.style.border = '1px dashed #666666';
        hiddenChip.style.borderRadius = '3px';
        hiddenChip.style.padding = '2px 6px';
        hiddenChip.style.fontSize = '10px';
        talentsWrap.appendChild(hiddenChip);
      } else {
        const talentsList = selHero.talents || [];
        if (talentsList.length === 0) {
          const noT = document.createElement('span');
          noT.textContent = 'None';
          noT.style.color = '#777';
          talentsWrap.appendChild(noT);
        } else {
          talentsList.forEach((t) => {
            const chip = document.createElement('span');
            chip.textContent = t.replace(/_/g, ' ').toUpperCase();
            chip.style.backgroundColor = 'rgba(255, 204, 0, 0.15)';
            chip.style.border = '1px solid #ffcc00';
            chip.style.color = '#ffdd44';
            chip.style.borderRadius = '3px';
            chip.style.padding = '2px 6px';
            chip.style.fontSize = '10px';
            talentsWrap.appendChild(chip);
          });
        }
      }
      rightPanel.appendChild(talentsWrap);

      // Skills List with level & skill XP bar
      const skillsContainer = document.createElement('div');
      skillsContainer.style.display = 'flex';
      skillsContainer.style.flexDirection = 'column';
      skillsContainer.style.gap = '6px';

      const sTitle = document.createElement('div');
      sTitle.textContent = 'SKILLS:';
      sTitle.style.fontSize = '12px';
      sTitle.style.color = 'var(--frame)';
      sTitle.style.fontWeight = 'bold';
      skillsContainer.appendChild(sTitle);

      (selHero.skills || []).forEach((sk) => {
        const sNeeded = getSkillXpNeeded(sk.level || 1);
        const sPct = Math.min(100, ((sk.exp || 0) / sNeeded) * 100);

        const skRow = document.createElement('div');
        skRow.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        skRow.style.padding = '5px 8px';
        skRow.style.borderRadius = '4px';
        skRow.style.display = 'flex';
        skRow.style.flexDirection = 'column';
        skRow.style.gap = '2px';

        const rowTop = document.createElement('div');
        rowTop.style.display = 'flex';
        rowTop.style.justifyContent = 'space-between';
        rowTop.style.fontSize = '11px';
        rowTop.innerHTML = `
          <span style="color:#ffffff;">${(sk.name || sk.id).toUpperCase()}</span>
          <span style="color:var(--accent);">Lv ${sk.level || 1}/10 (${sk.exp || 0}/${sNeeded} EXP)</span>
        `;
        skRow.appendChild(rowTop);

        const sBarBg = document.createElement('div');
        sBarBg.style.width = '100%';
        sBarBg.style.height = '3px';
        sBarBg.style.backgroundColor = '#112233';
        sBarBg.style.borderRadius = '2px';
        sBarBg.style.overflow = 'hidden';

        const sBarFill = document.createElement('div');
        sBarFill.style.width = `${sPct}%`;
        sBarFill.style.height = '100%';
        sBarFill.style.backgroundColor = '#00ffaa';
        sBarBg.appendChild(sBarFill);
        skRow.appendChild(sBarBg);

        skillsContainer.appendChild(skRow);
      });
      rightPanel.appendChild(skillsContainer);

      // Top 3 Bonds List
      const bondsWrap = document.createElement('div');
      bondsWrap.style.display = 'flex';
      bondsWrap.style.flexDirection = 'column';
      bondsWrap.style.gap = '4px';
      bondsWrap.style.fontSize = '11px';

      const bTitle = document.createElement('div');
      bTitle.innerHTML = `<span style="font-weight:bold; color:var(--frame);">TOP BONDS & INTIMACY:</span>`;
      bondsWrap.appendChild(bTitle);

      const bondList = [];
      for (const other of gameState.heroes) {
        if (other.id === selHero.id) continue;
        const val = gameState.getRelation(selHero.id, other.id);
        bondList.push({ hero: other, val });
      }
      bondList.sort((a, b) => b.val - a.val);
      const top3 = bondList.slice(0, 3);
      if (top3.length === 0) {
        const noneB = document.createElement('div');
        noneB.textContent = 'No companion bonds recorded yet.';
        noneB.style.color = '#777';
        noneB.style.fontStyle = 'italic';
        bondsWrap.appendChild(noneB);
      } else {
        const bRow = document.createElement('div');
        bRow.style.display = 'flex';
        bRow.style.flexWrap = 'wrap';
        bRow.style.gap = '8px';
        top3.forEach((b) => {
          const tier = b.val >= 90 ? '+10%' : b.val >= 60 ? '+6%' : b.val >= 25 ? '+3%' : '0%';
          const col = b.val >= 25 ? '#ff66aa' : '#8899aa';
          const bCard = document.createElement('div');
          bCard.style.backgroundColor = 'rgba(0,0,0,0.35)';
          bCard.style.border = `1px solid ${col}44`;
          bCard.style.borderRadius = '4px';
          bCard.style.padding = '3px 8px';
          bCard.innerHTML = `<span style="color:${col}; font-weight:bold;">♥ ${b.hero.name}</span>: <b style="color:#ffffff;">${b.val}</b> <span style="font-size:10px; color:#a0b8cf;">(${tier})</span>`;
          bRow.appendChild(bCard);
        });
        bondsWrap.appendChild(bRow);
      }
      rightPanel.appendChild(bondsWrap);

      // Party Slot Status
      const inParty = gameState.isInParty(selHero.id);
      const slot = gameState.getPartySlot(selHero.id);
      const formation = gameState.getPartyFormation(selHero.id);

      const partyStatus = document.createElement('div');
      partyStatus.style.fontSize = '12px';
      partyStatus.style.padding = '4px 0';
      partyStatus.innerHTML = inParty
        ? `<span style="color:#00ffcc; font-weight:bold;">Deploy Status: In Party (Slot ${slot} &bull; ${formation.toUpperCase()})</span>`
        : `<span style="color:#888888;">Deploy Status: Standby in Dormitory</span>`;
      rightPanel.appendChild(partyStatus);

      // Actions Row: Party Button, Promote Button, Synthesize Button
      const actionsRow = document.createElement('div');
      actionsRow.style.display = 'flex';
      actionsRow.style.gap = '8px';
      actionsRow.style.marginTop = 'auto';

      // Party Toggle Button
      const partyBtn = document.createElement('button');
      partyBtn.style.padding = '8px 14px';
      partyBtn.style.fontFamily = 'monospace';
      partyBtn.style.fontSize = '12px';
      partyBtn.style.fontWeight = 'bold';
      partyBtn.style.cursor = 'pointer';
      partyBtn.style.borderRadius = '4px';

      if (inParty) {
        partyBtn.textContent = 'Remove from Party';
        if (selHero.id === 'hero_han') {
          partyBtn.disabled = true;
          partyBtn.style.opacity = '0.5';
          partyBtn.style.cursor = 'not-allowed';
          partyBtn.title = 'Han Islat cannot be removed from the party!';
        } else {
          partyBtn.style.border = '1px solid #ff4444';
          partyBtn.style.backgroundColor = 'rgba(255, 68, 68, 0.2)';
          partyBtn.style.color = '#ff6666';
          partyBtn.addEventListener('click', () => {
            gameState.removeFromParty(selHero.id);
            this.render();
          });
        }
      } else {
        partyBtn.textContent = 'Add to Party';
        if (gameState.party.length >= 5) {
          partyBtn.disabled = true;
          partyBtn.style.opacity = '0.5';
          partyBtn.style.cursor = 'not-allowed';
          partyBtn.title = 'Party is full (5 heroes maximum)';
        } else {
          partyBtn.style.border = '1px solid #00ffcc';
          partyBtn.style.backgroundColor = 'rgba(0, 255, 204, 0.2)';
          partyBtn.style.color = '#00ffcc';
          partyBtn.addEventListener('click', () => {
            gameState.addToParty(selHero.id);
            this.render();
          });
        }
      }
      actionsRow.appendChild(partyBtn);

      // Promotion Button
      if (selHero.star < 6) {
        const promoCost = getPromotionCost(selHero.star);
        const canPromote = selHero.level >= cap && gameState.gems >= promoCost;

        const promoBtn = document.createElement('button');
        promoBtn.textContent = `Promote (${promoCost} Gems)`;
        promoBtn.style.padding = '8px 14px';
        promoBtn.style.fontFamily = 'monospace';
        promoBtn.style.fontSize = '12px';
        promoBtn.style.fontWeight = 'bold';
        promoBtn.style.borderRadius = '4px';

        if (canPromote) {
          promoBtn.style.border = '1px solid #ffd700';
          promoBtn.style.backgroundColor = 'rgba(255, 215, 0, 0.25)';
          promoBtn.style.color = '#ffd700';
          promoBtn.style.cursor = 'pointer';
          promoBtn.addEventListener('click', () => {
            const res = gameState.promoteHero(selHero.id);
            if (res.success) {
              this.playGoldenFlash();
              showSystemMessage(`[${selHero.name} has been promoted to ${res.newStar} star!]`);
              if (typeof window !== 'undefined' && window.__iselleRig) {
                window.__iselleRig.say('promotionDone', { force: true });
              } else {
                const iselleLine = pickLine('promotionDone');
                showSystemMessage(`[Iselle]: "${iselleLine}"`);
              }
              if (res.unlockedTalent) {
                showSystemMessage(`[${selHero.name} has awakened the latent talent: ${res.unlockedTalent}!]`);
              }
              this.render();
            } else {
              showSystemMessage(`[Promotion failed: ${res.error}]`);
            }
          });
        } else {
          promoBtn.disabled = true;
          promoBtn.style.border = '1px solid #555555';
          promoBtn.style.backgroundColor = 'rgba(30, 30, 30, 0.5)';
          promoBtn.style.color = '#777777';
          promoBtn.style.cursor = 'not-allowed';
          promoBtn.title =
            selHero.level < cap
              ? `Requires Lv ${cap} (currently Lv ${selHero.level})`
              : `Requires ${promoCost} gems (have ${gameState.gems})`;
        }
        actionsRow.appendChild(promoBtn);
      } else if (selHero.star === 6) {
        const awakenCostStone = 1;
        const awakenCostGems = 2000;
        const stonesCount = gameState.materials?.awakening_stone || 0;
        const canAwaken =
          selHero.level >= 60 && stonesCount >= awakenCostStone && gameState.gems >= awakenCostGems;

        const awakenBtn = document.createElement('button');
        awakenBtn.textContent = 'Awaken (7 star)';
        awakenBtn.style.padding = '8px 14px';
        awakenBtn.style.fontFamily = 'monospace';
        awakenBtn.style.fontSize = '12px';
        awakenBtn.style.fontWeight = 'bold';
        awakenBtn.style.borderRadius = '4px';

        if (canAwaken) {
          awakenBtn.style.border = '2px solid #ffffff';
          awakenBtn.style.background = 'linear-gradient(45deg, #ff0055, #ffaa00, #00ffaa, #00eeff, #bb00ff)';
          awakenBtn.style.color = '#ffffff';
          awakenBtn.style.cursor = 'pointer';
          awakenBtn.style.boxShadow = '0 0 10px var(--glow)';
          awakenBtn.addEventListener('click', () => {
            if (this.onAwakenCallback) {
              this.close();
              this.onAwakenCallback(selHero.id);
            } else {
              const res = gameState.awakenHero(selHero.id);
              if (res.success) {
                this.playGoldenFlash();
                showSystemMessage(`[${selHero.name} has undergone 7-Star Awakening and acquired Transcendence!]`);
                if (typeof window !== 'undefined' && window.__iselleRig) {
                  window.__iselleRig.say('promotionDone', { force: true });
                } else {
                  const iselleLine = pickLine('promotionDone');
                  showSystemMessage(`[Iselle]: "${iselleLine}"`);
                }
                this.render();
              } else {
                showSystemMessage(`[Awakening failed: ${res.error}]`);
              }
            }
          });
        } else {
          awakenBtn.disabled = true;
          awakenBtn.style.border = '1px dashed #777777';
          awakenBtn.style.backgroundColor = 'rgba(30, 30, 30, 0.5)';
          awakenBtn.style.color = '#777777';
          awakenBtn.style.cursor = 'not-allowed';
          const reqs = [];
          if (selHero.level < 60) reqs.push(`Lv 60 (currently Lv ${selHero.level})`);
          if (stonesCount < 1) reqs.push(`1 Awakening Stone (have ${stonesCount})`);
          if (gameState.gems < 2000) reqs.push(`2000 Gems (have ${gameState.gems})`);
          awakenBtn.title = `Requires: ${reqs.join(', ')}`;
        }
        actionsRow.appendChild(awakenBtn);
      } else if (selHero.star >= 7) {
        const awakenTag = document.createElement('div');
        awakenTag.style.padding = '8px 14px';
        awakenTag.style.fontFamily = 'monospace';
        awakenTag.style.fontSize = '12px';
        awakenTag.style.fontWeight = 'bold';
        awakenTag.style.borderRadius = '4px';
        awakenTag.style.background = 'linear-gradient(90deg, #ff0055, #ffaa00, #00ffaa, #00eeff, #bb00ff)';
        awakenTag.style.color = '#ffffff';
        awakenTag.textContent = '★ 7-STAR TRANSCENDED';
        actionsRow.appendChild(awakenTag);
      }

      // Synthesize Button
      const synthBtn = document.createElement('button');
      synthBtn.textContent = 'Synthesize';
      synthBtn.style.padding = '8px 14px';
      synthBtn.style.fontFamily = 'monospace';
      synthBtn.style.fontSize = '12px';
      synthBtn.style.fontWeight = 'bold';
      synthBtn.style.border = '1px solid #ff3344';
      synthBtn.style.backgroundColor = 'rgba(255, 51, 68, 0.2)';
      synthBtn.style.color = '#ff6677';
      synthBtn.style.cursor = 'pointer';
      synthBtn.style.borderRadius = '4px';
      synthBtn.addEventListener('click', () => {
        this.close();
        if (this.onOpenSynthesis) {
          this.onOpenSynthesis(selHero.id);
        }
      });
      actionsRow.appendChild(synthBtn);

      rightPanel.appendChild(actionsRow);
    }

    this.mainSplit.appendChild(rightPanel);
  }
}
