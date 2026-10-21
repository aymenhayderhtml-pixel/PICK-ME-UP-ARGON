import { SystemWindow } from './SystemWindow.js';
import { gameState } from '../core/GameState.js';
import { getCombatStats } from '../core/Stats.js';
import { canHeroEquipItem, equipItem, unequipItem, autoEquipHero, autoEquipRoster, MAX_INVENTORY_CAPACITY } from '../core/Inventory.js';
import { getHeroLoadout } from '../core/loadout.js';
import { showSystemMessage } from './Hud.js';
import { getItemIcon, ItemPreviewViewer } from './ItemIcon.js';

function getGradeColor(grade) {
  switch (grade) {
    case 'S+': return '#ffd700';
    case 'S': return '#ff3b5c';
    case 'A': return '#ffaa00';
    case 'B': return '#b48cff';
    case 'C': return '#33aaff';
    case 'D': return '#4caf50';
    case 'E':
    default:
      return '#9e9e9e';
  }
}

export class EquipmentWindow extends SystemWindow {
  constructor(onEquipChangeCallback = null) {
    super('EQUIPMENT & INVENTORY');
    this.onEquipChangeCallback = onEquipChangeCallback;
    this.container.style.width = '740px';
    this.container.style.maxWidth = '95vw';

    this.selectedHeroId = null;
    this.selectedItem = null;
    this.errorMsg = '';
    this.errorTimer = null;
    this.highlightAutoEquip = false;
    this.previewViewer = new ItemPreviewViewer(140);

    this.buildUI();

    // Close on ESC
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  close() {
    if (this.previewViewer) this.previewViewer.stop();
    super.close();
  }

  open(heroId = null, highlightAutoEquip = false) {
    this.highlightAutoEquip = !!highlightAutoEquip;
    if (heroId) {
      this.selectedHeroId = heroId;
    } else if (!this.selectedHeroId) {
      this.selectedHeroId = gameState.heroes[0]?.id || 'hero_han';
    }
    this.errorMsg = '';
    this.selectedItem = null;
    this.render();
    super.open();
  }

  buildUI() {
    this.contentElement.style.padding = '12px 16px';
    this.contentElement.style.display = 'flex';
    this.contentElement.style.flexDirection = 'column';
    this.contentElement.style.gap = '10px';
  }

  showError(msg) {
    this.errorMsg = msg;
    if (this.errorTimer) clearTimeout(this.errorTimer);
    this.errorTimer = setTimeout(() => {
      this.errorMsg = '';
      this.render();
    }, 2500);
    this.render();
  }

  render(targetContainer = null, embeddedHeroId = null) {
    const root = targetContainer || this.contentElement;
    root.innerHTML = '';

    const heroId = embeddedHeroId || this.selectedHeroId || gameState.heroes[0]?.id;
    const hero = gameState.heroes.find((h) => h.id === heroId) || gameState.heroes[0];
    if (!hero) {
      root.innerHTML = '<div style="color:#aaa;">No heroes available.</div>';
      return;
    }

    hero.equipment = hero.equipment || { weapon: null, offhand: null, armor: null };
    const currentStats = getCombatStats(hero);
    // Single source of truth: what this hero may wield and what it currently
    // holds (weapon type, offhand type, pose set, attack mode, HUD).
    const loadout = getHeroLoadout(hero);

    // 1. Top Action & Controls Bar (Auto-Equip, Auto-Equip All, Hero dropdown & Stats)
    const topBar = document.createElement('div');
    topBar.style.display = 'flex';
    topBar.style.justifyContent = 'space-between';
    topBar.style.alignItems = 'center';
    topBar.style.borderBottom = '1px solid var(--frame-inner)';
    topBar.style.paddingBottom = '8px';

    const leftControls = document.createElement('div');
    leftControls.style.display = 'flex';
    leftControls.style.alignItems = 'center';
    leftControls.style.gap = '8px';

    if (!targetContainer) {
      const label = document.createElement('span');
      label.textContent = 'HERO:';
      label.style.color = 'var(--frame)';
      label.style.fontWeight = 'bold';
      label.style.fontSize = '12px';
      leftControls.appendChild(label);

      const select = document.createElement('select');
      select.style.padding = '4px 8px';
      select.style.backgroundColor = 'var(--panel-bg-1)';
      select.style.border = '1px solid var(--frame-inner)';
      select.style.color = '#ffffff';
      select.style.fontFamily = 'monospace';
      select.style.borderRadius = '4px';

      gameState.heroes.forEach((h) => {
        const opt = document.createElement('option');
        opt.value = h.id;
        opt.textContent = `${h.name} (${h.star}★ ${h.class || ''})`;
        if (h.id === hero.id) opt.selected = true;
        select.appendChild(opt);
      });

      select.addEventListener('change', (e) => {
        this.selectedHeroId = e.target.value;
        this.selectedItem = null;
        this.render(targetContainer, embeddedHeroId);
      });
      leftControls.appendChild(select);
    }

    // Auto Equip (selected hero)
    const autoEquipBtn = document.createElement('button');
    autoEquipBtn.type = 'button';
    autoEquipBtn.className = 'mm-btn mm-btn-gold';
    autoEquipBtn.textContent = 'AUTO EQUIP';
    autoEquipBtn.style.padding = '5px 12px';
    autoEquipBtn.style.fontSize = '11px';
    autoEquipBtn.style.fontWeight = 'bold';
    autoEquipBtn.style.letterSpacing = '1px';
    if (this.highlightAutoEquip) {
      autoEquipBtn.style.border = '2px solid var(--gold)';
      autoEquipBtn.style.boxShadow = '0 0 16px var(--gold)';
    }
    autoEquipBtn.addEventListener('click', () => {
      this.highlightAutoEquip = false;
      const count = autoEquipHero(hero, gameState.inventory);
      gameState.saveToLocalStorage();
      this.selectedItem = null;
      this.render(targetContainer, embeddedHeroId);
      showSystemMessage(`[Auto-equipped ${hero.name} with ${count} piece${count !== 1 ? 's' : ''} of gear!]`);
      if (this.onEquipChangeCallback) this.onEquipChangeCallback();
    });
    leftControls.appendChild(autoEquipBtn);

    // Auto Equip All (whole roster, highest-grade gear to highest-star/level heroes first)
    const autoEquipAllBtn = document.createElement('button');
    autoEquipAllBtn.type = 'button';
    autoEquipAllBtn.className = 'mm-btn';
    autoEquipAllBtn.textContent = 'AUTO EQUIP ALL';
    autoEquipAllBtn.style.padding = '5px 12px';
    autoEquipAllBtn.style.fontSize = '11px';
    autoEquipAllBtn.style.fontWeight = 'bold';
    autoEquipAllBtn.style.letterSpacing = '1px';
    autoEquipAllBtn.addEventListener('click', () => {
      this.highlightAutoEquip = false;
      const count = autoEquipRoster(gameState.heroes, gameState.inventory);
      gameState.saveToLocalStorage();
      this.selectedItem = null;
      this.render(targetContainer, embeddedHeroId);
      showSystemMessage(`[Auto-equipped whole roster with ${count} piece${count !== 1 ? 's' : ''} of gear!]`);
      if (this.onEquipChangeCallback) this.onEquipChangeCallback();
    });
    leftControls.appendChild(autoEquipAllBtn);

    topBar.appendChild(leftControls);

    const heroInfo = document.createElement('div');
    heroInfo.style.fontSize = '12px';
    heroInfo.style.color = '#88aacc';
    const classLabel = loadout.profile ? loadout.profile.label : (hero.class || 'Unknown');
    const kitLabel = loadout.weaponType === 'none'
      ? 'Empty Hands'
      : `${loadout.weaponType.toUpperCase()}${loadout.offhandType === 'shield' ? ' + SHIELD' : ''}`;
    heroInfo.innerHTML =
      `<span style="color:var(--frame);font-weight:bold">${classLabel}</span> | ` +
      `Kit: <b style="color:#ffcc00">${kitLabel}</b> | ` +
      `Usable: <b style="color:#88aacc">${loadout.allowedWeapons.join(', ')}</b> | ` +
      `Atk: <b style="color:#ffcc00">${currentStats.damage}</b> | ` +
      `Def: <b style="color:var(--ok)">${currentStats.defense}</b> | ` +
      `HP: <b style="color:var(--frame)">${currentStats.maxHp}</b>`;
    topBar.appendChild(heroInfo);

    root.appendChild(topBar);

    // 2. Equipped Slots Container (Weapon, Offhand, Armor) - Clickable to unequip
    const slotsWrap = document.createElement('div');
    slotsWrap.style.display = 'grid';
    slotsWrap.style.gridTemplateColumns = 'repeat(3, 1fr)';
    slotsWrap.style.gap = '10px';

    const slots = [
      { key: 'weapon', label: 'WEAPON', item: hero.equipment.weapon },
      { key: 'offhand', label: 'OFFHAND', item: hero.equipment.offhand },
      { key: 'armor', label: 'ARMOR', item: hero.equipment.armor },
    ];

    slots.forEach((s) => {
      const slotBtn = document.createElement('button');
      slotBtn.type = 'button';
      slotBtn.style.all = 'unset';
      slotBtn.style.boxSizing = 'border-box';
      slotBtn.style.backgroundColor = 'rgba(10, 20, 35, 0.7)';
      slotBtn.style.border = '1px solid var(--frame-inner)';
      slotBtn.style.borderRadius = '6px';
      slotBtn.style.padding = '6px 8px';
      slotBtn.style.display = 'flex';
      slotBtn.style.flexDirection = 'column';
      slotBtn.style.gap = '4px';
      slotBtn.style.minHeight = '84px';
      slotBtn.style.cursor = s.item ? 'pointer' : 'default';
      slotBtn.title = s.item ? 'Click to unequip' : 'Empty slot';

      const sHeader = document.createElement('div');
      sHeader.style.display = 'flex';
      sHeader.style.justifyContent = 'space-between';
      sHeader.style.fontSize = '10px';
      sHeader.style.color = 'var(--frame)';
      sHeader.style.fontWeight = 'bold';
      sHeader.textContent = s.label;

      if (s.item) {
        const gradeLetter = s.item.grade || 'E';
        const gCol = getGradeColor(gradeLetter);
        const gradeBadge = document.createElement('span');
        gradeBadge.style.color = gCol;
        gradeBadge.style.fontWeight = 'bold';
        gradeBadge.textContent = `[${gradeLetter}]`;
        sHeader.appendChild(gradeBadge);
      }
      slotBtn.appendChild(sHeader);

      if (s.item) {
        const it = s.item;
        const bodyRow = document.createElement('div');
        bodyRow.style.display = 'flex';
        bodyRow.style.alignItems = 'center';
        bodyRow.style.gap = '8px';

        const iconEl = getItemIcon(it);
        iconEl.style.width = '42px';
        iconEl.style.height = '42px';
        iconEl.style.borderRadius = '4px';
        iconEl.style.flexShrink = '0';
        bodyRow.appendChild(iconEl);

        const infoCol = document.createElement('div');
        infoCol.style.display = 'flex';
        infoCol.style.flexDirection = 'column';
        infoCol.style.gap = '2px';
        infoCol.style.overflow = 'hidden';
        infoCol.style.flex = '1';

        const enhanceTag = it.enhance ? ` <span style="color:#ffcc00; font-weight:bold;">+${it.enhance}</span>` : '';
        const nameColor = it.quality === 'Fine' ? '#ffd700' : '#ffffff';

        const nameEl = document.createElement('div');
        nameEl.style.fontSize = '11px';
        nameEl.style.fontWeight = 'bold';
        nameEl.style.color = nameColor;
        nameEl.style.whiteSpace = 'nowrap';
        nameEl.style.overflow = 'hidden';
        nameEl.style.textOverflow = 'ellipsis';
        nameEl.innerHTML = `${it.name}${enhanceTag}`;
        infoCol.appendChild(nameEl);

        const duraWrap = document.createElement('div');
        duraWrap.style.width = '100%';
        duraWrap.style.height = '3px';
        duraWrap.style.backgroundColor = 'rgba(0,0,0,0.6)';
        duraWrap.style.borderRadius = '1.5px';
        duraWrap.style.overflow = 'hidden';
        duraWrap.style.marginTop = '2px';

        const maxD = it.maxDurability || 40;
        const curD = it.durability !== undefined ? it.durability : maxD;
        const duraPct = Math.max(0, Math.min(100, (curD / maxD) * 100));
        const duraCol = duraPct > 50 ? 'var(--ok)' : duraPct > 20 ? 'var(--gold)' : 'var(--danger)';

        const duraFill = document.createElement('div');
        duraFill.style.width = `${duraPct}%`;
        duraFill.style.height = '100%';
        duraFill.style.backgroundColor = duraCol;
        duraWrap.appendChild(duraFill);
        infoCol.appendChild(duraWrap);

        const hint = document.createElement('div');
        hint.style.fontSize = '9px';
        hint.style.color = 'var(--danger)';
        hint.textContent = 'Click to unequip';
        infoCol.appendChild(hint);

        bodyRow.appendChild(infoCol);
        slotBtn.appendChild(bodyRow);

        slotBtn.addEventListener('click', () => {
          const res = unequipItem(hero, s.key, gameState.inventory);
          if (res.success) {
            gameState.saveToLocalStorage();
            this.selectedItem = null;
            if (this.onEquipChangeCallback) this.onEquipChangeCallback();
            this.render(targetContainer, embeddedHeroId);
          } else {
            this.showError(res.reason);
          }
        });
      } else {
        const emptyEl = document.createElement('div');
        emptyEl.style.fontSize = '11px';
        emptyEl.style.color = '#556677';
        emptyEl.style.marginTop = '12px';
        emptyEl.textContent = '(Empty Slot)';
        slotBtn.appendChild(emptyEl);
      }

      slotsWrap.appendChild(slotBtn);
    });
    root.appendChild(slotsWrap);

    // 3. Selection, Stat Comparison / 3D Rotating Preview & Equip Action Banner
    const previewBanner = document.createElement('div');
    previewBanner.style.minHeight = '40px';
    previewBanner.style.padding = '8px 14px';
    previewBanner.style.borderRadius = '4px';
    previewBanner.style.display = 'flex';
    previewBanner.style.alignItems = 'center';
    previewBanner.style.justifyContent = 'space-between';
    previewBanner.style.fontSize = '11px';
    previewBanner.style.backgroundColor = 'rgba(0, 0, 0, 0.45)';
    previewBanner.style.border = '1px solid var(--frame-inner)';

    if (this.errorMsg) {
      this.previewViewer.stop();
      previewBanner.style.borderColor = 'var(--danger)';
      previewBanner.style.backgroundColor = 'rgba(255, 51, 68, 0.15)';
      previewBanner.innerHTML = `<span style="color:var(--danger); font-weight:bold; font-size:12px;">⚠️ ${this.errorMsg}</span>`;
    } else if (this.selectedItem) {
      const it = this.selectedItem;
      const check = canHeroEquipItem(hero, it);
      const gradeLetter = it.grade || 'E';
      const gradeCol = getGradeColor(gradeLetter);
      const is3D = this.previewViewer.setItem(it);

      const previewRow = document.createElement('div');
      previewRow.style.display = 'flex';
      previewRow.style.alignItems = 'center';
      previewRow.style.gap = '14px';
      previewRow.style.width = '100%';

      if (is3D) {
        previewRow.appendChild(this.previewViewer.canvas);
      } else {
        const icon2d = getItemIcon(it);
        icon2d.style.width = '70px';
        icon2d.style.height = '70px';
        icon2d.style.borderRadius = '6px';
        previewRow.appendChild(icon2d);
      }

      const infoCol = document.createElement('div');
      infoCol.style.display = 'flex';
      infoCol.style.flexDirection = 'column';
      infoCol.style.gap = '6px';
      infoCol.style.flex = '1';

      const enhanceTag = it.enhance ? ` <span style="color:#ffcc00; font-weight:bold;">+${it.enhance}</span>` : '';
      const titleSpan = document.createElement('div');
      titleSpan.innerHTML = `<b style="color:${gradeCol}; font-size:13px;">[${gradeLetter}]</b> <b style="color:#ffffff; font-size:13px;">${it.name}</b>${enhanceTag}`;
      infoCol.appendChild(titleSpan);

      if (!check.canEquip) {
        const wrongTag = document.createElement('span');
        wrongTag.style.cssText = 'color:var(--danger); background:rgba(255,50,50,0.2); border:1px solid var(--danger); padding:2px 8px; border-radius:3px; font-weight:bold; font-size:11px; align-self:flex-start;';
        wrongTag.textContent = 'WRONG TYPE';
        infoCol.appendChild(wrongTag);
        previewRow.appendChild(infoCol);

        const disabledBtn = document.createElement('button');
        disabledBtn.className = 'mm-btn';
        disabledBtn.textContent = 'EQUIP';
        disabledBtn.disabled = true;
        disabledBtn.style.opacity = '0.4';
        disabledBtn.style.cursor = 'not-allowed';
        disabledBtn.style.padding = '6px 16px';
        previewRow.appendChild(disabledBtn);
      } else {
        const simulatedHero = {
          ...hero,
          equipment: {
            ...hero.equipment,
            [it.slot]: it,
          },
        };
        const simStats = getCombatStats(simulatedHero);
        const dmgDiff = Math.round((simStats.damage - currentStats.damage) * 10) / 10;
        const defDiff = Math.round((simStats.defense - currentStats.defense) * 10) / 10;
        const hpDiff = simStats.maxHp - currentStats.maxHp;

        const formatDiff = (label, diff) => {
          if (diff > 0) return `<span style="color:var(--ok); font-weight:bold;">${label}: +${diff} ▲</span>`;
          if (diff < 0) return `<span style="color:var(--danger); font-weight:bold;">${label}: ${diff} ▼</span>`;
          return `<span style="color:#88a0b0;">${label}: +0</span>`;
        };

        const diffsEl = document.createElement('div');
        diffsEl.style.display = 'flex';
        diffsEl.style.gap = '14px';
        diffsEl.innerHTML = `${formatDiff('Δ Atk', dmgDiff)} ${formatDiff('Δ Def', defDiff)} ${formatDiff('Δ HP', hpDiff)}`;
        infoCol.appendChild(diffsEl);
        previewRow.appendChild(infoCol);

        const equipBtn = document.createElement('button');
        equipBtn.type = 'button';
        equipBtn.className = 'mm-btn mm-btn-gold';
        equipBtn.textContent = 'EQUIP';
        equipBtn.style.padding = '8px 20px';
        equipBtn.style.fontSize = '12px';
        equipBtn.style.fontWeight = 'bold';
        equipBtn.style.letterSpacing = '1px';

        equipBtn.addEventListener('click', () => {
          const res = equipItem(hero, it, gameState.inventory);
          if (res.success) {
            gameState.saveToLocalStorage();
            this.selectedItem = null;
            if (this.onEquipChangeCallback) this.onEquipChangeCallback();
            this.render(targetContainer, embeddedHeroId);
          } else {
            this.showError(res.reason);
          }
        });
        previewRow.appendChild(equipBtn);
      }
      previewBanner.appendChild(previewRow);
    } else {
      this.previewViewer.stop();
      previewBanner.innerHTML = `<span style="color:#778899;">Click any inventory item to select and preview stat changes, or double-click to equip directly.</span>`;
    }
    root.appendChild(previewBanner);

    // 4. Inventory Section (All 48 inventory cells with icons and grade badge)
    const invHeader = document.createElement('div');
    invHeader.style.display = 'flex';
    invHeader.style.justifyContent = 'space-between';
    invHeader.style.alignItems = 'center';

    const invTitle = document.createElement('span');
    invTitle.textContent = `INVENTORY (${gameState.inventory.length}/${MAX_INVENTORY_CAPACITY})`;
    invTitle.style.color = 'var(--frame)';
    invTitle.style.fontSize = '12px';
    invTitle.style.fontWeight = 'bold';
    invHeader.appendChild(invTitle);

    root.appendChild(invHeader);

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(8, 1fr)';
    grid.style.gap = '6px';
    grid.style.maxHeight = '210px';
    grid.style.overflowY = 'auto';
    grid.style.padding = '4px';
    grid.style.backgroundColor = 'rgba(5, 10, 20, 0.6)';
    grid.style.border = '1px solid var(--frame-inner)';
    grid.style.borderRadius = '6px';

    for (let i = 0; i < MAX_INVENTORY_CAPACITY; i++) {
      const item = gameState.inventory[i] || null;
      const slotBtn = document.createElement('button');
      slotBtn.type = 'button';
      slotBtn.style.all = 'unset';
      slotBtn.style.boxSizing = 'border-box';
      slotBtn.style.height = '52px';
      slotBtn.style.borderRadius = '4px';
      slotBtn.style.border = '1px solid var(--frame-inner)';
      slotBtn.style.backgroundColor = item ? 'rgba(15, 30, 50, 0.8)' : 'rgba(10, 15, 25, 0.3)';
      slotBtn.style.position = 'relative';
      slotBtn.style.overflow = 'hidden';
      slotBtn.style.cursor = item ? 'pointer' : 'default';

      if (item) {
        const isSelected = this.selectedItem && this.selectedItem.id === item.id;
        if (isSelected) {
          slotBtn.style.border = '1.5px solid var(--gold)';
          slotBtn.style.backgroundColor = 'rgba(255, 211, 107, 0.2)';
          slotBtn.style.boxShadow = '0 0 8px rgba(255, 211, 107, 0.4)';
        }

        const iconEl = getItemIcon(item);
        iconEl.style.width = '100%';
        iconEl.style.height = '100%';
        iconEl.style.objectFit = 'contain';
        slotBtn.appendChild(iconEl);

        const gradeLetter = item.grade || 'E';
        const gCol = getGradeColor(gradeLetter);
        const gradeBadge = document.createElement('span');
        gradeBadge.style.position = 'absolute';
        gradeBadge.style.top = '1px';
        gradeBadge.style.right = '3px';
        gradeBadge.style.fontSize = '9px';
        gradeBadge.style.fontWeight = 'bold';
        gradeBadge.style.color = gCol;
        gradeBadge.style.textShadow = '0 0 3px #000, 0 0 2px #000';
        gradeBadge.textContent = gradeLetter;
        slotBtn.appendChild(gradeBadge);

        if (item.enhance) {
          const enhBadge = document.createElement('span');
          enhBadge.style.position = 'absolute';
          enhBadge.style.top = '1px';
          enhBadge.style.left = '3px';
          enhBadge.style.fontSize = '9px';
          enhBadge.style.fontWeight = 'bold';
          enhBadge.style.color = '#ffcc00';
          enhBadge.style.textShadow = '0 0 3px #000';
          enhBadge.textContent = `+${item.enhance}`;
          slotBtn.appendChild(enhBadge);
        }

        const maxD = item.maxDurability || 40;
        const curD = item.durability !== undefined ? item.durability : maxD;
        const duraPct = Math.max(0, Math.min(100, (curD / maxD) * 100));
        const duraCol = duraPct > 50 ? 'var(--ok)' : duraPct > 20 ? 'var(--gold)' : 'var(--danger)';

        const duraWrap = document.createElement('div');
        duraWrap.style.position = 'absolute';
        duraWrap.style.bottom = '2px';
        duraWrap.style.left = '3px';
        duraWrap.style.right = '3px';
        duraWrap.style.height = '3px';
        duraWrap.style.backgroundColor = 'rgba(0,0,0,0.7)';
        duraWrap.style.borderRadius = '1.5px';
        duraWrap.style.overflow = 'hidden';

        const duraFill = document.createElement('div');
        duraFill.style.width = `${duraPct}%`;
        duraFill.style.height = '100%';
        duraFill.style.backgroundColor = duraCol;
        duraWrap.appendChild(duraFill);
        slotBtn.appendChild(duraWrap);

        slotBtn.title = `${item.name} [${gradeLetter}] (Durability: ${curD}/${maxD})`;

        slotBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectedItem = item;
          this.render(targetContainer, embeddedHeroId);
        });

        slotBtn.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          const check = canHeroEquipItem(hero, item);
          if (!check.canEquip) {
            this.showError('Wrong weapon type');
            return;
          }
          const res = equipItem(hero, item, gameState.inventory);
          if (res.success) {
            gameState.saveToLocalStorage();
            this.selectedItem = null;
            if (this.onEquipChangeCallback) this.onEquipChangeCallback();
            this.render(targetContainer, embeddedHeroId);
          } else {
            this.showError(res.reason);
          }
        });
      }

      grid.appendChild(slotBtn);
    }

    root.appendChild(grid);
  }
}
