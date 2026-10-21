import { SystemWindow } from './SystemWindow.js';
import { gameState } from '../core/GameState.js';
import { getRarityHexString } from '../data/rules.js';
import { autoEquipParty } from '../core/Inventory.js';
import { showSystemMessage } from './Hud.js';
import { showEquipmentNotice } from './Notices.js';
import { getDisplayStats, formatStatDisplay, getHeroThreeGroups } from '../core/Stats.js';
import { getItemIcon } from './ItemIcon.js';

export class DeployWindow extends SystemWindow {
  constructor(onEnterFloor, onOpenEquipmentSummon = null) {
    super('DEPLOY - TOWER EXPEDITION');
    this.onEnterFloor = onEnterFloor;
    this.onOpenEquipmentSummon = onOpenEquipmentSummon;
    this.equipNoticeDismissed = false;

    this.container.style.width = '780px';
    this.container.style.maxWidth = '95vw';

    this.buildUI();
  }

  hasUnarmedHeroes() {
    const partyHeroes = (gameState.party || [])
      .map((p) => gameState.heroes.find((h) => h.id === (p.id || p)))
      .filter(Boolean);
    return partyHeroes.some((h) => !h.equipment || !h.equipment.weapon);
  }

  open() {
    this.render();
    super.open();
    if (this.hasUnarmedHeroes() && !this.equipNoticeDismissed) {
      showEquipmentNotice({
        onSummon: () => {
          this.close();
          if (this.onOpenEquipmentSummon) this.onOpenEquipmentSummon();
        },
        onLater: () => {
          this.equipNoticeDismissed = true;
        },
      });
    }
  }

  buildUI() {
    this.contentElement.style.padding = '14px 18px';
    this.contentElement.style.display = 'flex';
    this.contentElement.style.flexDirection = 'column';
    this.contentElement.style.gap = '14px';

    // No Equipment Gold Banner
    this.noEquipBanner = document.createElement('div');
    this.noEquipBanner.style.backgroundColor = 'rgba(255, 215, 0, 0.15)';
    this.noEquipBanner.style.border = '1px solid #ffd700';
    this.noEquipBanner.style.borderRadius = '6px';
    this.noEquipBanner.style.padding = '8px 14px';
    this.noEquipBanner.style.display = 'none';
    this.noEquipBanner.style.alignItems = 'center';
    this.noEquipBanner.style.justifyContent = 'space-between';
    this.noEquipBanner.style.color = '#ffd700';
    this.noEquipBanner.style.fontWeight = 'bold';
    this.noEquipBanner.style.fontSize = '12px';
    this.contentElement.appendChild(this.noEquipBanner);

    // 1. Party Slots Section (5 slots) with Combat Power
    const slotsHeader = document.createElement('div');
    slotsHeader.style.display = 'flex';
    slotsHeader.style.justifyContent = 'space-between';
    slotsHeader.style.alignItems = 'center';

    const headerLeft = document.createElement('div');
    headerLeft.style.display = 'flex';
    headerLeft.style.alignItems = 'center';
    headerLeft.style.gap = '10px';

    const slotsTitle = document.createElement('div');
    slotsTitle.style.fontSize = '13px';
    slotsTitle.style.fontWeight = 'bold';
    slotsTitle.style.color = 'var(--frame)';
    slotsTitle.textContent = 'PARTY FORMATION (UP TO 5 HEROES):';
    headerLeft.appendChild(slotsTitle);

    const autoPartyBtn = document.createElement('button');
    autoPartyBtn.className = 'mm-btn mm-btn-accent';
    autoPartyBtn.textContent = '⚡ AUTO PARTY';
    autoPartyBtn.style.padding = '4px 12px';
    autoPartyBtn.style.fontSize = '11px';
    autoPartyBtn.title = 'Auto-assign best heroes and roles';
    autoPartyBtn.addEventListener('click', () => {
      this.autoSelectParty();
      this.render();
    });
    headerLeft.appendChild(autoPartyBtn);

    const autoEquipBtn = document.createElement('button');
    autoEquipBtn.className = 'mm-btn mm-btn-gold';
    autoEquipBtn.textContent = '🛡️ AUTO EQUIP';
    autoEquipBtn.style.padding = '4px 12px';
    autoEquipBtn.style.fontSize = '11px';
    autoEquipBtn.title = 'Auto-equip best weapons and armor to party';
    autoEquipBtn.addEventListener('click', () => {
      const equipped = autoEquipParty(gameState.party, gameState.inventory, gameState.heroes);
      gameState.saveToLocalStorage();
      this.render();
      showSystemMessage(`[Auto-Equipped ${equipped} items to party]`);
    });
    headerLeft.appendChild(autoEquipBtn);

    slotsHeader.appendChild(headerLeft);

    this.powerLabel = document.createElement('div');
    this.powerLabel.style.fontSize = '13px';
    this.powerLabel.style.fontWeight = 'bold';
    this.powerLabel.style.color = '#ffd700';
    this.powerLabel.textContent = 'Combat Power: 0';
    slotsHeader.appendChild(this.powerLabel);

    this.contentElement.appendChild(slotsHeader);

    this.slotsContainer = document.createElement('div');
    this.slotsContainer.style.display = 'grid';
    this.slotsContainer.style.gridTemplateColumns = 'repeat(5, 1fr)';
    this.slotsContainer.style.gap = '8px';
    this.contentElement.appendChild(this.slotsContainer);

    // Heart Link Bar between party slots
    this.bondsBar = document.createElement('div');
    this.bondsBar.style.display = 'flex';
    this.bondsBar.style.flexWrap = 'wrap';
    this.bondsBar.style.gap = '8px';
    this.bondsBar.style.alignItems = 'center';
    this.bondsBar.style.padding = '6px 12px';
    this.bondsBar.style.backgroundColor = 'rgba(20, 15, 35, 0.7)';
    this.bondsBar.style.borderRadius = '6px';
    this.bondsBar.style.border = '1px solid var(--frame-inner)';
    this.contentElement.appendChild(this.bondsBar);

    // 2. Available Heroes Section
    const availTitle = document.createElement('div');
    availTitle.style.fontSize = '13px';
    availTitle.style.fontWeight = 'bold';
    availTitle.style.color = '#88aacc';
    availTitle.textContent = 'AVAILABLE HEROES (CLICK TO ASSIGN):';
    this.contentElement.appendChild(availTitle);

    this.availableContainer = document.createElement('div');
    this.availableContainer.style.maxHeight = '180px';
    this.availableContainer.style.overflowY = 'auto';
    this.availableContainer.style.display = 'grid';
    this.availableContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
    this.availableContainer.style.gap = '6px';
    this.availableContainer.style.padding = '4px';
    this.contentElement.appendChild(this.availableContainer);

    // 3. Permadeath Warning Banner
    const warningBox = document.createElement('div');
    warningBox.style.backgroundColor = 'rgba(255, 34, 34, 0.15)';
    warningBox.style.border = '1px solid #ff3333';
    warningBox.style.borderRadius = '6px';
    warningBox.style.padding = '6px 12px';
    warningBox.style.textAlign = 'center';
    warningBox.style.color = '#ff4444';
    warningBox.style.fontWeight = 'bold';
    warningBox.style.fontSize = '12px';
    warningBox.innerHTML = '⚠️ Permadeath active inside the Tower.<br><span style="color:#6fe0f0;font-size:11px;font-weight:normal;">CONTROLS &mdash; RIGHT CLICK: ATTACK | LEFT CLICK (HOLD): BLOCK | F: BASH | Q: ROLL</span>';
    this.contentElement.appendChild(warningBox);

    // 4. Floor Selector Bar
    this.floorSelectBar = document.createElement('div');
    this.floorSelectBar.style.display = 'flex';
    this.floorSelectBar.style.alignItems = 'center';
    this.floorSelectBar.style.gap = '8px';
    this.floorSelectBar.style.fontSize = '12px';
    this.floorSelectBar.style.color = '#88aacc';
    this.contentElement.appendChild(this.floorSelectBar);

    // 5. Bottom Enter Button Bar
    const bottomBar = document.createElement('div');
    bottomBar.style.display = 'flex';
    bottomBar.style.justifyContent = 'flex-end';
    bottomBar.style.gap = '10px';
    bottomBar.style.marginTop = '4px';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'mm-btn';
    cancelBtn.textContent = 'CANCEL';
    cancelBtn.style.padding = '8px 24px';
    cancelBtn.style.fontSize = '13px';
    cancelBtn.addEventListener('click', () => this.close());
    bottomBar.appendChild(cancelBtn);

    this.enterBtn = document.createElement('button');
    this.enterBtn.className = 'mm-btn mm-btn-accent';
    this.enterBtn.textContent = 'ENTER FLOOR';
    this.enterBtn.style.padding = '10px 32px';
    this.enterBtn.style.fontSize = '14px';
    this.enterBtn.style.letterSpacing = '1.5px';
    this.enterBtn.addEventListener('click', () => {
      if (this.hasUnarmedHeroes() && !this.equipNoticeDismissed) {
        showEquipmentNotice({
          onSummon: () => {
            this.close();
            if (this.onOpenEquipmentSummon) this.onOpenEquipmentSummon();
          },
          onLater: () => {
            this.equipNoticeDismissed = true;
          },
        });
        return;
      }
      this.close();
      if (this.onEnterFloor) {
        this.onEnterFloor(gameState.currentFloor || 1);
      }
    });
    bottomBar.appendChild(this.enterBtn);

    this.contentElement.appendChild(bottomBar);
  }

  autoSelectParty() {
    const isBossFloor = (gameState.currentFloor || 1) % 5 === 0;
    const candidates = gameState.heroes
      .filter((h) => h.alive && h.id !== 'hero_han' && (h.fatigue || 0) < 100)
      .sort((a, b) => {
        const groupsA = getHeroThreeGroups(a);
        const groupsB = getHeroThreeGroups(b);
        if (isBossFloor) {
          return groupsB.mentality.score - groupsA.mentality.score;
        } else {
          return groupsB.skills.score - groupsA.skills.score;
        }
      });

    const chosen = candidates.slice(0, 4);
    gameState.party = [
      { id: 'hero_han', formation: 'front' },
      ...chosen.map((h) => {
        const isFront = (h.class || '').includes('Tank') || (h.class || '').includes('Vanguard') || h.weapon === 'sword+shield' || h.weapon === 'spear';
        return {
          id: h.id,
          formation: isFront ? 'front' : 'back',
        };
      }),
    ];
    gameState.saveToLocalStorage();
  }

  render() {
    this.enterBtn.textContent = `Enter Tower Floor ${gameState.currentFloor || 1}`;

    // No Equipment Banner check
    const unequippedCount = (gameState.party || []).filter((p) => {
      const heroId = typeof p === 'string' ? p : p.id;
      const hero = gameState.heroes.find((h) => h.id === heroId);
      return hero && (!hero.equipment || !hero.equipment.weapon);
    }).length;

    if (unequippedCount === 0) {
      this.equipNoticeDismissed = false;
    }

    if (unequippedCount > 0 && this.noEquipBanner) {
      this.noEquipBanner.style.display = 'flex';
      this.noEquipBanner.innerHTML = '';
      const bannerText = document.createElement('span');
      bannerText.textContent = `⚠️ [${unequippedCount} heroes have no equipment. Summon equipment?]`;
      this.noEquipBanner.appendChild(bannerText);

      const summonRedirectBtn = document.createElement('button');
      summonRedirectBtn.textContent = 'Equipment Summon';
      summonRedirectBtn.style.padding = '4px 12px';
      summonRedirectBtn.style.backgroundColor = '#ffd700';
      summonRedirectBtn.style.color = '#111111';
      summonRedirectBtn.style.border = 'none';
      summonRedirectBtn.style.borderRadius = '4px';
      summonRedirectBtn.style.fontWeight = 'bold';
      summonRedirectBtn.style.fontFamily = 'monospace';
      summonRedirectBtn.style.cursor = 'pointer';
      summonRedirectBtn.addEventListener('click', () => {
        this.close();
        if (this.onOpenEquipmentSummon) {
          this.onOpenEquipmentSummon();
        }
      });
      this.noEquipBanner.appendChild(summonRedirectBtn);
    } else if (this.noEquipBanner) {
      this.noEquipBanner.style.display = 'none';
    }

    // Calculate Combat Power
    let totalPower = 0;
    const party = gameState.party || [];
    for (const p of party) {
      const h = gameState.heroes.find((hero) => hero.id === (typeof p === 'string' ? p : p.id));
      if (h && h.stats) {
        totalPower += (h.stats.str || 0) + (h.stats.agi || 0) + (h.stats.vit || 0);
      }
    }
    if (this.powerLabel) {
      this.powerLabel.textContent = `Combat Power: ${totalPower}`;
    }

    // Single Floor Display (No selector, locked to currentFloor)
    if (this.floorSelectBar) {
      this.floorSelectBar.innerHTML = `
        <span style="font-weight:bold; color:var(--frame); font-size:13px;">EXPEDITION TARGET:</span>
        <span style="font-size:15px; font-weight:bold; color:var(--gold); letter-spacing:1px; background:rgba(255, 211, 107, 0.15); border:1px solid var(--gold); padding:3px 12px; border-radius:4px;">FLOOR ${gameState.currentFloor || 1}</span>
      `;
    }

    // 1. Render Party Slots (Always 5 slots)
    this.slotsContainer.innerHTML = '';

    for (let slotIdx = 0; slotIdx < 5; slotIdx++) {
      const partyItem = party[slotIdx];
      const hero = partyItem ? gameState.heroes.find((h) => h.id === partyItem.id) : null;
      const isLeaderSlot = slotIdx === 0;

      const slotCard = document.createElement('div');
      slotCard.style.backgroundColor = hero
        ? 'rgba(15, 10, 25, 0.85)'
        : 'rgba(10, 8, 16, 0.5)';
      slotCard.style.border = hero
        ? isLeaderSlot ? '1px solid var(--gold)' : '1px solid var(--accent)'
        : '1px dashed var(--frame-inner)';
      slotCard.style.borderRadius = '6px';
      slotCard.style.padding = '8px';
      slotCard.style.display = 'flex';
      slotCard.style.flexDirection = 'column';
      slotCard.style.justifyContent = 'space-between';
      slotCard.style.minHeight = '140px';

      if (hero) {
        const starColor = getRarityHexString(hero.star);
        const formation = partyItem.formation || 'front';
        const isExhausted = (hero.fatigue || 0) > 80;

        const top = document.createElement('div');
        top.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:10px; color:${isLeaderSlot ? '#ffd700' : '#88aacc'}; font-weight:bold;">
              ${isLeaderSlot ? 'SLOT 1 (LEADER)' : `SLOT ${slotIdx + 1}`}
            </span>
            ${
              !isLeaderSlot
                ? `<span style="cursor:pointer; color:#ff4444; font-size:12px; font-weight:bold;" title="Remove">✕</span>`
                : ''
            }
          </div>
          <div style="font-size:12px; font-weight:bold; color:#ffffff; margin-top:4px;">
            ${hero.name}
          </div>
          <div style="font-size:11px; color:${starColor};">${'★'.repeat(hero.star)} <span style="color:#aaa;">Lv ${hero.level}</span></div>
          <div style="font-size:10px; color:#888;">${hero.class}</div>
          <div style="font-size:10px; color:#aaa; margin-top:2px;">
            S:${formatStatDisplay(getDisplayStats(hero).str)} A:${formatStatDisplay(getDisplayStats(hero).agi)} V:${formatStatDisplay(getDisplayStats(hero).vit)}
          </div>
          ${
            isExhausted
              ? `<div style="color:#ff3333; font-size:10px; font-weight:bold; margin-top:2px;">[Exhausted] -20% stats</div>`
              : ''
          }
          ${(() => {
            const partyHeroes = (party || [])
              .map((p) => gameState.heroes.find((h) => h.id === (typeof p === 'string' ? p : p.id)))
              .filter((h) => h && h.alive);
            let totalHeroBonus = 0;
            for (const other of partyHeroes) {
              if (other.id !== hero.id) {
                const relVal = gameState.getRelation(hero.id, other.id);
                if (relVal >= 90) totalHeroBonus += 10;
                else if (relVal >= 60) totalHeroBonus += 6;
                else if (relVal >= 25) totalHeroBonus += 3;
              }
            }
            totalHeroBonus = Math.min(20, totalHeroBonus);
            return totalHeroBonus > 0
              ? `<div style="color:#ff66aa; font-size:10px; font-weight:bold; margin-top:2px;">♥ Synergy: +${totalHeroBonus}% stats</div>`
              : '';
          })()}
        `;

        if (!isLeaderSlot) {
          const closeX = top.querySelector('span[title="Remove"]');
          if (closeX) {
            closeX.addEventListener('click', (e) => {
              e.stopPropagation();
              gameState.removeFromParty(hero.id);
              this.render();
            });
          }
        }
        slotCard.appendChild(top);

        // Equipment items row
        const eqRow = document.createElement('div');
        eqRow.style.display = 'flex';
        eqRow.style.gap = '4px';
        eqRow.style.marginTop = '4px';

        const wep = hero.equipment?.weapon;
        const off = hero.equipment?.offhand;
        const arm = hero.equipment?.armor;

        [wep, off, arm].forEach((it, idx) => {
          const itemBox = document.createElement('div');
          itemBox.style.width = '24px';
          itemBox.style.height = '24px';
          itemBox.style.borderRadius = '3px';
          itemBox.style.border = '1px solid var(--frame-inner)';
          itemBox.style.backgroundColor = 'rgba(0,0,0,0.5)';
          itemBox.style.overflow = 'hidden';
          itemBox.style.position = 'relative';

          if (it) {
            const icon = getItemIcon(it);
            icon.style.width = '100%';
            icon.style.height = '100%';
            itemBox.appendChild(icon);
            itemBox.title = `${it.name} [${it.grade || 'E'}]`;
          } else {
            itemBox.style.opacity = '0.35';
            itemBox.title = idx === 0 ? 'No Weapon' : idx === 1 ? 'No Offhand' : 'No Armor';
          }
          eqRow.appendChild(itemBox);
        });
        slotCard.appendChild(eqRow);

        // Formation Toggle Button
        const formBtn = document.createElement('button');
        formBtn.textContent = formation.toUpperCase();
        formBtn.style.marginTop = '6px';
        formBtn.style.padding = '3px 0';
        formBtn.style.fontSize = '10px';
        formBtn.style.fontFamily = 'monospace';
        formBtn.style.fontWeight = 'bold';
        formBtn.style.borderRadius = '3px';
        formBtn.style.cursor = 'pointer';
        formBtn.style.border = formation === 'front' ? '1px solid #ffaa00' : '1px solid #3399ff';
        formBtn.style.backgroundColor = formation === 'front' ? 'rgba(255,170,0,0.2)' : 'rgba(51,153,255,0.2)';
        formBtn.style.color = formation === 'front' ? '#ffaa00' : '#3399ff';
        formBtn.title = 'Toggle Frontline / Backline';

        formBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const nextForm = formation === 'front' ? 'back' : 'front';
          gameState.setPartyFormation(hero.id, nextForm);
          this.render();
        });

        slotCard.appendChild(formBtn);
      } else {
        slotCard.style.alignItems = 'center';
        slotCard.style.justifyContent = 'center';
        slotCard.innerHTML = `
          <div style="color:#556677; font-size:11px; font-weight:bold;">SLOT ${slotIdx + 1}</div>
          <div style="color:#445566; font-size:10px; margin-top:4px;">[Empty]</div>
        `;
      }

      this.slotsContainer.appendChild(slotCard);
    }

    // Render Heart Link Bar
    this.bondsBar.innerHTML = '';
    const partyHeroes = (party || [])
      .map((p) => gameState.heroes.find((h) => h.id === (typeof p === 'string' ? p : p.id)))
      .filter((h) => h && h.alive);

    const activeLinks = [];
    for (let i = 0; i < partyHeroes.length; i++) {
      for (let j = i + 1; j < partyHeroes.length; j++) {
        const hA = partyHeroes[i];
        const hB = partyHeroes[j];
        const val = gameState.getRelation(hA.id, hB.id);
        if (val >= 25) {
          const bonusPct = val >= 90 ? '+10%' : val >= 60 ? '+6%' : '+3%';
          activeLinks.push({ hA, hB, val, bonusPct });
        }
      }
    }

    if (activeLinks.length === 0) {
      this.bondsBar.innerHTML = `<span style="font-size:11px; color:#888899; font-style:italic;">♥ Party Synergy: No active bonds (reach intimacy 25+ to unlock stat bonuses in Tower)</span>`;
    } else {
      const titleSpan = document.createElement('span');
      titleSpan.style.fontSize = '11px';
      titleSpan.style.fontWeight = 'bold';
      titleSpan.style.color = '#ff66aa';
      titleSpan.textContent = '♥ ACTIVE BONDS:';
      this.bondsBar.appendChild(titleSpan);

      activeLinks.forEach((link) => {
        const chip = document.createElement('div');
        chip.style.display = 'flex';
        chip.style.alignItems = 'center';
        chip.style.gap = '5px';
        chip.style.backgroundColor = 'rgba(255, 102, 170, 0.15)';
        chip.style.border = '1px solid #ff66aa';
        chip.style.borderRadius = '4px';
        chip.style.padding = '2px 8px';
        chip.style.fontSize = '11px';
        chip.innerHTML = `
          <span style="color:#ffffff; font-weight:bold;">${link.hA.name}</span>
          <span style="color:#ff66aa;">♥</span>
          <span style="color:#ffffff; font-weight:bold;">${link.hB.name}</span>
          <span style="color:#7dffb0; font-weight:bold; margin-left:2px;">${link.bonusPct}</span>
        `;
        this.bondsBar.appendChild(chip);
      });
    }

    // 2. Render Available Heroes (Not currently in party)
    this.availableContainer.innerHTML = '';
    const availableHeroes = gameState.heroes.filter((h) => !gameState.isInParty(h.id));

    if (availableHeroes.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'All available heroes are already deployed.';
      empty.style.color = '#667788';
      empty.style.fontStyle = 'italic';
      empty.style.padding = '12px';
      empty.style.gridColumn = 'span 2';
      this.availableContainer.appendChild(empty);
    } else {
      availableHeroes.forEach((h) => {
        const starColor = getRarityHexString(h.star);
        const isExhausted = (h.fatigue || 0) > 80;

        const row = document.createElement('div');
        row.style.padding = '6px 10px';
        row.style.backgroundColor = 'rgba(15, 10, 25, 0.75)';
        row.style.border = '1px solid rgba(180, 140, 255, 0.25)';
        row.style.borderRadius = '4px';
        row.style.cursor = 'pointer';
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';

        row.addEventListener('click', () => {
          if (gameState.party.length < 5) {
            gameState.addToParty(h.id, 'front');
            this.render();
          }
        });

        row.innerHTML = `
          <div>
            <span style="font-weight:bold; color:#ffffff; font-size:12px;">${h.name}</span>
            <span style="color:${starColor}; font-size:11px;">${'★'.repeat(h.star)}</span>
            <span style="color:#88aacc; font-size:11px;">Lv ${h.level}</span>
            <span style="color:#8899aa; font-size:10px; margin-left:6px;">S:${formatStatDisplay(getDisplayStats(h).str)} A:${formatStatDisplay(getDisplayStats(h).agi)} V:${formatStatDisplay(getDisplayStats(h).vit)}</span>
          </div>
          <div>
            ${
              isExhausted
                ? `<span style="color:var(--danger); font-size:10px; font-weight:bold; margin-right:6px;">[EXHAUSTED]</span>`
                : ''
            }
            <span style="color:var(--accent); font-size:11px; font-weight:bold;">+ ASSIGN</span>
          </div>
        `;

        this.availableContainer.appendChild(row);
      });
    }
  }
}
