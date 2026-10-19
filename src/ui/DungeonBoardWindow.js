import { SystemWindow } from './SystemWindow.js';
import { gameState } from '../core/GameState.js';
import { showSystemMessage } from './Hud.js';

export class DungeonBoardWindow extends SystemWindow {
  constructor(onOpenTowerDeploy, onEnterHuntingGround, onEnterMine) {
    super('DUNGEON BOARD - EXPEDITIONS');
    this.onOpenTowerDeploy = onOpenTowerDeploy;
    this.onEnterHuntingGround = onEnterHuntingGround;
    this.onEnterMine = onEnterMine;

    this.selectedHuntD = 1;
    this.selectedMineD = 1;

    this.container.style.width = '680px';
    this.container.style.maxWidth = '92vw';
    this.buildUI();
  }

  buildUI() {
    this.contentElement.style.padding = '16px';
    this.contentElement.style.display = 'flex';
    this.contentElement.style.flexDirection = 'column';
    this.contentElement.style.gap = '14px';
  }

  open() {
    this.render();
    super.open();
  }

  render() {
    this.contentElement.innerHTML = '';

    const cleared = gameState.clearedFloors || 0;
    const maxHuntD = Math.max(1, Math.min(5, cleared));
    const maxMineD = Math.max(1, Math.min(5, cleared));

    if (this.selectedHuntD > maxHuntD) this.selectedHuntD = maxHuntD;
    if (this.selectedMineD > maxMineD) this.selectedMineD = maxMineD;

    // Header info
    const info = document.createElement('div');
    info.style.fontSize = '12px';
    info.style.color = '#88aacc';
    info.style.borderBottom = '1px solid rgba(0, 229, 255, 0.2)';
    info.style.paddingBottom = '8px';
    info.innerHTML = `Select an expedition. Sub-dungeons are repeatable areas for farming experience, materials, and gold.`;
    this.contentElement.appendChild(info);

    // List container
    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '12px';

    // 1. Tower of Trials
    const towerCard = document.createElement('div');
    towerCard.style.padding = '12px 16px';
    towerCard.style.backgroundColor = 'rgba(15, 10, 25, 0.75)';
    towerCard.style.border = '1px solid var(--accent)';
    towerCard.style.borderRadius = '6px';
    towerCard.style.display = 'flex';
    towerCard.style.justifyContent = 'space-between';
    towerCard.style.alignItems = 'center';

    towerCard.innerHTML = `
      <div>
        <div style="font-size:14px; font-weight:bold; color:var(--frame);">🏰 TOWER OF TRIALS</div>
        <div style="font-size:11px; color:#88aacc; margin-top:2px;">Main Tower Expedition · Progress to Floor 100.</div>
        <div style="font-size:11px; color:var(--gold); margin-top:4px;">Current Floor: <b>Floor ${gameState.currentFloor || 1}</b> (Cleared: ${cleared})</div>
      </div>
    `;

    const towerBtn = document.createElement('button');
    towerBtn.className = 'mm-btn mm-btn-accent';
    towerBtn.textContent = 'DEPLOY PARTY ⚔️';
    towerBtn.style.padding = '8px 16px';
    towerBtn.style.fontSize = '12px';
    towerBtn.addEventListener('click', () => {
      this.close();
      if (this.onOpenTowerDeploy) this.onOpenTowerDeploy();
    });
    towerCard.appendChild(towerBtn);
    list.appendChild(towerCard);

    // 2. Hunting Ground
    const huntUnlocked = cleared >= 1;
    const huntCard = document.createElement('div');
    huntCard.style.padding = '12px 16px';
    huntCard.style.backgroundColor = huntUnlocked ? 'rgba(20, 35, 20, 0.65)' : 'rgba(25, 25, 30, 0.5)';
    huntCard.style.border = huntUnlocked ? '1px solid #4ade80' : '1px solid #444455';
    huntCard.style.borderRadius = '6px';
    huntCard.style.display = 'flex';
    huntCard.style.justifyContent = 'space-between';
    huntCard.style.alignItems = 'center';

    const huntCost = 100 * this.selectedHuntD;
    const huntLeft = document.createElement('div');
    if (!huntUnlocked) {
      huntLeft.innerHTML = `
        <div style="font-size:14px; font-weight:bold; color:#888899;">🏹 Hunting Ground [LOCKED]</div>
        <div style="font-size:11px; color:#ef4444; margin-top:4px;">🔒 Clear Floor 1 of Tower of Trials to unlock.</div>
      `;
      huntCard.appendChild(huntLeft);
    } else {
      huntLeft.innerHTML = `
        <div style="font-size:14px; font-weight:bold; color:#4ade80;">🏹 Hunting Ground</div>
        <div style="font-size:11px; color:#88aacc; margin-top:2px;">Repeatable Hunt · Slay 12 goblins in the wild forests.</div>
        <div style="font-size:11px; color:#a3e635; margin-top:4px;">
          Difficulty: <b>D${this.selectedHuntD}</b> · Entry: <b>${huntCost} G</b> · EXP: <b>${40 * this.selectedHuntD} / survivor</b> · Gold: <b>${300 * this.selectedHuntD} G</b>
        </div>
      `;
      huntCard.appendChild(huntLeft);

      const huntRight = document.createElement('div');
      huntRight.style.display = 'flex';
      huntRight.style.flexDirection = 'column';
      huntRight.style.alignItems = 'flex-end';
      huntRight.style.gap = '6px';

      // Difficulty buttons
      const diffContainer = document.createElement('div');
      diffContainer.style.display = 'flex';
      diffContainer.style.gap = '4px';
      for (let d = 1; d <= maxHuntD; d++) {
        const btn = document.createElement('button');
        btn.textContent = `D${d}`;
        btn.style.padding = '2px 6px';
        btn.style.fontSize = '10px';
        btn.style.fontWeight = 'bold';
        btn.style.cursor = 'pointer';
        btn.style.borderRadius = '3px';
        btn.style.border = this.selectedHuntD === d ? '1px solid #4ade80' : '1px solid #446644';
        btn.style.backgroundColor = this.selectedHuntD === d ? '#166534' : 'rgba(0,0,0,0.4)';
        btn.style.color = this.selectedHuntD === d ? '#ffffff' : '#88aa88';
        btn.addEventListener('click', () => {
          this.selectedHuntD = d;
          this.render();
        });
        diffContainer.appendChild(btn);
      }
      huntRight.appendChild(diffContainer);

      const deployHuntBtn = document.createElement('button');
      deployHuntBtn.textContent = `Hunt (${huntCost} G)`;
      deployHuntBtn.style.padding = '6px 14px';
      deployHuntBtn.style.backgroundColor = '#15803d';
      deployHuntBtn.style.color = '#ffffff';
      deployHuntBtn.style.border = '1px solid #4ade80';
      deployHuntBtn.style.borderRadius = '4px';
      deployHuntBtn.style.cursor = 'pointer';
      deployHuntBtn.style.fontWeight = 'bold';
      deployHuntBtn.style.fontSize = '12px';
      deployHuntBtn.addEventListener('click', () => {
        if (gameState.gold < huntCost) {
          showSystemMessage(`[Not enough gold! Entry cost is ${huntCost} G]`);
          return;
        }
        gameState.gold -= huntCost;
        gameState.saveToLocalStorage();
        this.close();
        if (this.onEnterHuntingGround) this.onEnterHuntingGround(this.selectedHuntD);
      });
      huntRight.appendChild(deployHuntBtn);
      huntCard.appendChild(huntRight);
    }
    list.appendChild(huntCard);

    // 3. Mine
    const mineUnlocked = cleared >= 2;
    const mineCard = document.createElement('div');
    mineCard.style.padding = '12px 16px';
    mineCard.style.backgroundColor = mineUnlocked ? 'rgba(35, 25, 45, 0.65)' : 'rgba(25, 25, 30, 0.5)';
    mineCard.style.border = mineUnlocked ? '1px solid #c084fc' : '1px solid #444455';
    mineCard.style.borderRadius = '6px';
    mineCard.style.display = 'flex';
    mineCard.style.justifyContent = 'space-between';
    mineCard.style.alignItems = 'center';

    const mineCost = 150 * this.selectedMineD;
    const mineLeft = document.createElement('div');
    if (!mineUnlocked) {
      mineLeft.innerHTML = `
        <div style="font-size:14px; font-weight:bold; color:#888899;">⛏️ Mine [LOCKED]</div>
        <div style="font-size:11px; color:#ef4444; margin-top:4px;">🔒 Clear Floor 2 of Tower of Trials to unlock.</div>
      `;
      mineCard.appendChild(mineLeft);
    } else {
      mineLeft.innerHTML = `
        <div style="font-size:14px; font-weight:bold; color:#c084fc;">⛏️ Mine</div>
        <div style="font-size:11px; color:#88aacc; margin-top:2px;">Subterranean Caves · Mine Copper, Crude Iron${this.selectedMineD >= 2 ? ', Steel' : ''} & hunt crystal monsters.</div>
        <div style="font-size:11px; color:#e9d5ff; margin-top:4px;">
          Difficulty: <b>D${this.selectedMineD}</b> · Entry: <b>${mineCost} G</b> · 10-14 Ore nodes · 15% Gem drops
        </div>
      `;
      mineCard.appendChild(mineLeft);

      const mineRight = document.createElement('div');
      mineRight.style.display = 'flex';
      mineRight.style.flexDirection = 'column';
      mineRight.style.alignItems = 'flex-end';
      mineRight.style.gap = '6px';

      // Difficulty buttons
      const diffContainer = document.createElement('div');
      diffContainer.style.display = 'flex';
      diffContainer.style.gap = '4px';
      for (let d = 1; d <= maxMineD; d++) {
        const btn = document.createElement('button');
        btn.textContent = `D${d}`;
        btn.style.padding = '2px 6px';
        btn.style.fontSize = '10px';
        btn.style.fontWeight = 'bold';
        btn.style.cursor = 'pointer';
        btn.style.borderRadius = '3px';
        btn.style.border = this.selectedMineD === d ? '1px solid #c084fc' : '1px solid #553366';
        btn.style.backgroundColor = this.selectedMineD === d ? '#6b21a8' : 'rgba(0,0,0,0.4)';
        btn.style.color = this.selectedMineD === d ? '#ffffff' : '#c084fc';
        btn.addEventListener('click', () => {
          this.selectedMineD = d;
          this.render();
        });
        diffContainer.appendChild(btn);
      }
      mineRight.appendChild(diffContainer);

      const deployMineBtn = document.createElement('button');
      deployMineBtn.textContent = `Mine (${mineCost} G)`;
      deployMineBtn.style.padding = '6px 14px';
      deployMineBtn.style.backgroundColor = '#7e22ce';
      deployMineBtn.style.color = '#ffffff';
      deployMineBtn.style.border = '1px solid #c084fc';
      deployMineBtn.style.borderRadius = '4px';
      deployMineBtn.style.cursor = 'pointer';
      deployMineBtn.style.fontWeight = 'bold';
      deployMineBtn.style.fontSize = '12px';
      deployMineBtn.addEventListener('click', () => {
        if (gameState.gold < mineCost) {
          showSystemMessage(`[Not enough gold! Entry cost is ${mineCost} G]`);
          return;
        }
        gameState.gold -= mineCost;
        gameState.saveToLocalStorage();
        this.close();
        if (this.onEnterMine) this.onEnterMine(this.selectedMineD);
      });
      mineRight.appendChild(deployMineBtn);
      mineCard.appendChild(mineRight);
    }
    list.appendChild(mineCard);

    this.contentElement.appendChild(list);
  }
}
