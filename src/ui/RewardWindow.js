// src/ui/RewardWindow.js
import { SystemWindow } from './SystemWindow.js';
import { gameState } from '../core/GameState.js';
import { showSystemMessage } from './Hud.js';
import { getFloorClearReward } from '../data/rewards.js';
import { drawRewardIcon } from './RewardIcons.js';
import { attachOrnateCorners } from './ornaments.js';

function getStarString(star = 1) {
  return '★'.repeat(Math.max(1, Math.min(7, star)));
}

export class RewardWindow extends SystemWindow {
  constructor({ onNextFloor, onReturnToHub }) {
    super('STAGE CLEAR');
    this.onNextFloor = onNextFloor;
    this.onReturnToHub = onReturnToHub;

    // Outer container acts as transparent flex column at top-center
    this.container.classList.remove('mm-panel');
    this.container.style.position = 'fixed';
    this.container.style.top = '32px';
    this.container.style.left = '50%';
    this.container.style.transform = 'translateX(-50%)';
    this.container.style.backgroundColor = 'transparent';
    this.container.style.border = 'none';
    this.container.style.boxShadow = 'none';
    this.container.style.backdropFilter = 'none';
    this.container.style.padding = '0';
    this.container.style.width = 'auto';
    this.container.style.maxWidth = '92vw';
    this.container.style.alignItems = 'center';
    this.container.style.gap = '14px';
    this.titleBar.style.display = 'none';
  }

  showRewards({
    mode = 'tower',
    difficulty = 1,
    floorNumber = 1,
    mvpHero,
    mvpScore,
    livingHeroes = [],
    deadHeroes = [],
    scavengedItems = [],
    skillGains,
    materials = {},
  }) {
    const isHunt = mode === 'hunt';
    const isMine = mode === 'mine';

    // 1. Calculate Rewards
    let goldEarned = 0;
    let gemsEarned = 0;
    let ticketsEarned = 0;
    let expPerHero = 0;
    const rewardSlots = []; // { id, label }

    if (isHunt) {
      goldEarned = 300 * difficulty;
      expPerHero = 40 * difficulty;
      const goblinHideCount = Math.floor(Math.random() * 3) + 2; // 2-4
      const goblinToothCount = Math.floor(Math.random() * 2) + 1; // 1-2
      const leatherCount = Math.floor(Math.random() * 3) + 1; // 1-3

      if (!gameState.materials) gameState.materials = {};
      gameState.materials.goblin_hide = (gameState.materials.goblin_hide || 0) + goblinHideCount;
      gameState.materials.goblin_tooth = (gameState.materials.goblin_tooth || 0) + goblinToothCount;
      gameState.materials.leather = (gameState.materials.leather || 0) + leatherCount;

      rewardSlots.push({ id: 'gold', label: `'${goldEarned.toLocaleString()}G'` });
      rewardSlots.push({ id: 'goblin_hide', label: `'GOBLIN HIDE' X${goblinHideCount}` });
      rewardSlots.push({ id: 'goblin_tooth', label: `'GOBLIN TOOTH' X${goblinToothCount}` });
      rewardSlots.push({ id: 'leather', label: `'LEATHER (C)' X${leatherCount}` });
    } else if (isMine) {
      expPerHero = 25 * difficulty;
      goldEarned = 1000 * difficulty;
      rewardSlots.push({ id: 'gold', label: `'${goldEarned.toLocaleString()}G'` });
      if (!gameState.materials) gameState.materials = {};
      for (const [k, v] of Object.entries(materials)) {
        if (v > 0) {
          gameState.materials[k] = (gameState.materials[k] || 0) + v;
          const labelName = k === 'crude_iron' ? 'IRON ORE (C)' : (k.replace('_', ' ').toUpperCase() + ' (C)');
          rewardSlots.push({ id: k, label: `'${labelName}' X${v}` });
        }
      }
    } else {
      // Main tower floor clear
      const isFirstFloor5 = floorNumber === 5 && (gameState.clearedFloors || 0) < 5;
      const clearDef = getFloorClearReward(floorNumber, isFirstFloor5);

      goldEarned = clearDef.gold;
      gemsEarned = clearDef.gems;
      ticketsEarned = clearDef.tickets;

      rewardSlots.push({ id: 'gold', label: `'${goldEarned.toLocaleString()}G'` });

      if (!gameState.materials) gameState.materials = {};
      for (const mat of clearDef.materials) {
        gameState.materials[mat.id] = (gameState.materials[mat.id] || 0) + mat.count;
        rewardSlots.push({
          id: mat.id,
          label: `'${mat.name}' X${mat.count}`,
        });
      }

      if (gemsEarned > 0) {
        rewardSlots.push({ id: 'gem', label: `'${gemsEarned} GEMS'` });
      }
      if (ticketsEarned > 0) {
        rewardSlots.push({ id: 'ticket', label: `'TICKET' X${ticketsEarned}` });
      }

      const totalExp = 30 * floorNumber;
      expPerHero = livingHeroes.length > 0 ? Math.round(totalExp / livingHeroes.length) : 0;
    }

    // Apply currency gains
    gameState.gold += goldEarned;
    gameState.gems += gemsEarned;
    gameState.freeTickets += ticketsEarned;

    // Stress falls: -10 per cleared floor for party if all survived
    const allPartySurvived = (gameState.party || []).length > 0 && livingHeroes.length >= (gameState.party || []).length;
    if (allPartySurvived) {
      for (const h of livingHeroes) {
        if (gameState.addStress) {
          gameState.addStress(h, -10);
        } else {
          h.stress = Math.max(0, (h.stress || 0) - 10);
        }
      }
    }

    // Apply EXP & fatigue to heroes
    const leveledUpHeroes = [];
    for (const h of livingHeroes) {
      const oldLevel = h.level || 1;
      gameState.addExp(h.id, expPerHero);
      const updated = gameState.heroes.find((x) => x.id === h.id);
      if (updated && updated.level > oldLevel) {
        leveledUpHeroes.push(updated);
        showSystemMessage(`[${h.name} leveled up.]`);
      }
      if (updated) {
        updated.fatigue = Math.min(100, (updated.fatigue || 0) + 20);
      }
    }

    // Save scavenged items into GameState inventory
    if (!gameState.inventory) gameState.inventory = [];
    for (const item of scavengedItems || []) {
      gameState.inventory.push({ ...item });
    }

    // Floor advancement rules
    if (!isHunt && !isMine) {
      gameState.clearedFloors = Math.max(gameState.clearedFloors || 0, floorNumber);
      if ((gameState.currentFloor || 1) === floorNumber) {
        gameState.currentFloor = floorNumber + 1;
      }
      if (floorNumber === 5 && !gameState.isFacilityUnlocked('blacksmith')) {
        gameState.unlockFacility('blacksmith', 0);
        showSystemMessage('[The Blacksmith facility has been unlocked.]');
      }
    }

    // Intimacy gain: +4 per cleared floor together alive
    const partyAliveIds = (gameState.party || [])
      .map((p) => (typeof p === 'string' ? p : p.id))
      .filter((id) => {
        const hero = gameState.heroes.find((h) => h.id === id);
        return hero && hero.alive;
      });
    for (let i = 0; i < partyAliveIds.length; i++) {
      for (let j = i + 1; j < partyAliveIds.length; j++) {
        gameState.addIntimacy(partyAliveIds[i], partyAliveIds[j], 4);
      }
    }

    gameState.saveToLocalStorage();

    // 2. Build Manhwa-Style 2 Stacked .mm-panel DOM Boxes
    const root = document.createElement('div');
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.alignItems = 'center';
    root.style.gap = '14px';
    root.style.width = '100%';

    // PANEL 1: STAGE CLEAR! / Leveled up heroes / MVP
    const panel1 = document.createElement('div');
    panel1.className = 'mm-panel';
    panel1.style.padding = '18px 36px';
    panel1.style.minWidth = '420px';
    panel1.style.textAlign = 'center';
    panel1.style.display = 'flex';
    panel1.style.flexDirection = 'column';
    panel1.style.alignItems = 'center';
    panel1.style.gap = '8px';
    panel1.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.65)';
    attachOrnateCorners(panel1);

    const title1 = document.createElement('div');
    title1.textContent = isHunt ? 'HUNT COMPLETE!' : (isMine ? 'MINE COMPLETE!' : 'STAGE CLEAR!');
    title1.style.fontSize = '28px';
    title1.style.fontWeight = '900';
    title1.style.letterSpacing = '3px';
    title1.style.color = '#ffffff';
    title1.style.textShadow = '0 0 16px rgba(255, 215, 0, 0.6), 0 0 30px rgba(255, 215, 0, 0.3)';
    panel1.appendChild(title1);

    // Leveled up line: '<NAME> (★), <NAME> (★) LEVELED UP!'
    if (leveledUpHeroes.length > 0) {
      const lvlLine = document.createElement('div');
      const namesStr = leveledUpHeroes
        .map((h) => `${(h.name || 'Hero').toUpperCase()} (${getStarString(h.star || 1)})`)
        .join(', ');
      lvlLine.textContent = `${namesStr} LEVELED UP!`;
      lvlLine.style.fontSize = '14px';
      lvlLine.style.fontWeight = '700';
      lvlLine.style.color = '#6ee7b7';
      lvlLine.style.letterSpacing = '1px';
      lvlLine.style.textShadow = '0 0 10px rgba(110, 231, 183, 0.4)';
      panel1.appendChild(lvlLine);
    }

    // MVP line: 'MVP - <NAME> (★)'
    const mvpName = (mvpHero ? mvpHero.name : 'Han Islat').toUpperCase();
    const mvpStar = getStarString(mvpHero?.star || 1);
    const mvpLine = document.createElement('div');
    mvpLine.textContent = `MVP - ${mvpName} (${mvpStar})`;
    mvpLine.style.fontSize = '15px';
    mvpLine.style.fontWeight = '800';
    mvpLine.style.color = '#ffd700';
    mvpLine.style.letterSpacing = '1.5px';
    mvpLine.style.textShadow = '0 0 12px rgba(255, 215, 0, 0.5)';
    panel1.appendChild(mvpLine);

    root.appendChild(panel1);

    // PANEL 2: REWARD + row of up to 5 item slots (icon 64x64 + label in quotes)
    const panel2 = document.createElement('div');
    panel2.className = 'mm-panel';
    panel2.style.padding = '18px 32px';
    panel2.style.minWidth = '420px';
    panel2.style.textAlign = 'center';
    panel2.style.display = 'flex';
    panel2.style.flexDirection = 'column';
    panel2.style.alignItems = 'center';
    panel2.style.gap = '14px';
    panel2.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.65)';
    attachOrnateCorners(panel2);

    const title2 = document.createElement('div');
    title2.textContent = 'REWARD';
    title2.style.fontSize = '24px';
    title2.style.fontWeight = '900';
    title2.style.letterSpacing = '3px';
    title2.style.color = '#ffffff';
    title2.style.textShadow = '0 0 14px rgba(56, 189, 248, 0.6), 0 0 24px rgba(56, 189, 248, 0.3)';
    panel2.appendChild(title2);

    // Row of up to 5 item slots
    const slotsRow = document.createElement('div');
    slotsRow.style.display = 'flex';
    slotsRow.style.justifyContent = 'center';
    slotsRow.style.alignItems = 'flex-start';
    slotsRow.style.gap = '18px';
    slotsRow.style.flexWrap = 'wrap';

    const displaySlots = rewardSlots.slice(0, 5);
    for (const slot of displaySlots) {
      const slotBox = document.createElement('div');
      slotBox.style.display = 'flex';
      slotBox.style.flexDirection = 'column';
      slotBox.style.alignItems = 'center';
      slotBox.style.width = '84px';
      slotBox.style.gap = '6px';

      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      canvas.style.width = '64px';
      canvas.style.height = '64px';
      canvas.style.borderRadius = '6px';
      canvas.style.border = '1px solid var(--frame-inner)';
      canvas.style.backgroundColor = '#130d1f';
      canvas.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.5)';

      const ctx = canvas.getContext('2d');
      drawRewardIcon(ctx, slot.id, 64);
      slotBox.appendChild(canvas);

      const label = document.createElement('div');
      label.textContent = slot.label;
      label.style.fontSize = '11px';
      label.style.fontWeight = '700';
      label.style.color = '#e2e8f0';
      label.style.textAlign = 'center';
      label.style.lineHeight = '1.25';
      label.style.whiteSpace = 'normal';
      label.style.wordBreak = 'break-word';
      slotBox.appendChild(label);

      slotsRow.appendChild(slotBox);
    }
    panel2.appendChild(slotsRow);
    root.appendChild(panel2);

    // BUTTONS: stay below in the small panel style
    const btnPanel = document.createElement('div');
    btnPanel.className = 'mm-panel';
    btnPanel.style.padding = '8px 16px';
    btnPanel.style.display = 'flex';
    btnPanel.style.gap = '12px';
    btnPanel.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.5)';
    attachOrnateCorners(btnPanel);

    const hubBtn = document.createElement('button');
    hubBtn.textContent = 'Return to Hub';
    hubBtn.style.padding = '8px 16px';
    hubBtn.style.backgroundColor = '#1e293b';
    hubBtn.style.border = '1px solid #0284c7';
    hubBtn.style.borderRadius = '4px';
    hubBtn.style.color = '#ffffff';
    hubBtn.style.cursor = 'pointer';
    hubBtn.style.fontWeight = 'bold';
    hubBtn.style.fontSize = '12px';
    hubBtn.addEventListener('click', () => {
      this.close();
      if (this.onReturnToHub) this.onReturnToHub();
    });
    btnPanel.appendChild(hubBtn);

    const partyHeroObjects = (gameState.party || []).map((p) => {
      const pId = typeof p === 'string' ? p : p.id;
      return gameState.heroes.find((h) => h.id === pId);
    }).filter(Boolean);
    const anyFatigued = partyHeroObjects.some((h) => (h.fatigue || 0) >= 80);

    const nextBtn = document.createElement('button');
    nextBtn.style.padding = '8px 18px';
    nextBtn.style.borderRadius = '4px';
    nextBtn.style.fontWeight = 'bold';
    nextBtn.style.fontSize = '12px';
    nextBtn.style.fontFamily = 'monospace';

    if (anyFatigued) {
      nextBtn.textContent = 'Go to next floor (Heroes need rest)';
      nextBtn.disabled = true;
      nextBtn.style.backgroundColor = 'rgba(60, 60, 60, 0.4)';
      nextBtn.style.border = '1px solid #555555';
      nextBtn.style.color = '#777777';
      nextBtn.style.cursor = 'not-allowed';
      nextBtn.title = 'Heroes are exhausted. Rest them in the Dormitory first.';
    } else {
      nextBtn.textContent = `Go to Floor ${gameState.currentFloor} →`;
      nextBtn.disabled = false;
      nextBtn.style.backgroundColor = 'var(--accent)';
      nextBtn.style.border = '1px solid var(--frame)';
      nextBtn.style.color = '#ffffff';
      nextBtn.style.cursor = 'pointer';
      nextBtn.addEventListener('click', () => {
        this.close();
        if (this.onReturnToHub) this.onReturnToHub({ openDeploy: true });
      });
    }

    if (!isHunt && !isMine) {
      btnPanel.appendChild(nextBtn);
    }
    root.appendChild(btnPanel);

    this.setContent(root);
    this.open();
  }
}
