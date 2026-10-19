export class PartyPanel {
  constructor(parentContainer) {
    this.container = document.createElement('div');
    this.container.id = 'hud-party-panel';
    this.container.style.position = 'absolute';
    this.container.style.top = '96px';
    this.container.style.left = '12px';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.gap = '6px';
    this.container.style.padding = '8px 10px';
    this.container.style.backgroundColor = 'rgba(11, 8, 16, 0.9)';
    this.container.style.border = '1px solid var(--frame-inner)';
    this.container.style.borderRadius = '6px';
    this.container.style.fontSize = '11px';
    this.container.style.color = '#ffffff';
    this.container.style.fontFamily = 'monospace, sans-serif';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '9999';

    // Command Header
    this.commandBadge = document.createElement('div');
    this.commandBadge.style.color = 'var(--frame)';
    this.commandBadge.style.fontWeight = 'bold';
    this.commandBadge.style.marginBottom = '4px';
    this.commandBadge.style.borderBottom = '1px solid var(--frame-inner)';
    this.commandBadge.style.paddingBottom = '3px';
    this.commandBadge.textContent = 'ORDER: 🏃 Follow';
    this.container.appendChild(this.commandBadge);

    // List of hero rows
    this.rowsContainer = document.createElement('div');
    this.rowsContainer.style.display = 'flex';
    this.rowsContainer.style.flexDirection = 'column';
    this.rowsContainer.style.gap = '5px';
    this.container.appendChild(this.rowsContainer);

    this.heroRows = [];

    if (parentContainer) {
      parentContainer.appendChild(this.container);
    } else {
      document.body.appendChild(this.container);
    }
  }

  setupParty(partyMembers) {
    this.rowsContainer.innerHTML = '';
    this.heroRows = [];

    for (const member of partyMembers) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.flexDirection = 'column';
      row.style.gap = '2px';

      // Top line: Name + Composure icon + Status
      const topLine = document.createElement('div');
      topLine.style.display = 'flex';
      topLine.style.justifyContent = 'space-between';
      topLine.style.alignItems = 'center';

      const nameLabel = document.createElement('span');
      nameLabel.style.fontWeight = 'bold';
      nameLabel.style.color = member.isLeader ? '#ffdd44' : '#aaddff';
      nameLabel.textContent = member.name;
      topLine.appendChild(nameLabel);

      const statusIcon = document.createElement('span');
      statusIcon.textContent = '😌';
      statusIcon.style.fontSize = '12px';
      topLine.appendChild(statusIcon);
      row.appendChild(topLine);

      // Bottom line: mini HP bar
      const barBox = document.createElement('div');
      barBox.style.width = '140px';
      barBox.style.height = '6px';
      barBox.style.backgroundColor = '#222222';
      barBox.style.borderRadius = '2px';
      barBox.style.overflow = 'hidden';
      barBox.style.position = 'relative';

      const barFill = document.createElement('div');
      barFill.style.width = '100%';
      barFill.style.height = '100%';
      barFill.style.backgroundColor = 'var(--ok)';
      barFill.style.transition = 'width 0.1s ease';
      barBox.appendChild(barFill);
      row.appendChild(barBox);

      this.rowsContainer.appendChild(row);
      this.heroRows.push({
        id: member.id,
        isLeader: member.isLeader,
        nameLabel,
        statusIcon,
        barFill,
      });
    }
  }

  update(player, allies, currentCommand) {
    if (currentCommand) {
      this.commandBadge.textContent = `ORDER: ${currentCommand.icon} ${currentCommand.label}`;
    }

    // 1. Han (Leader)
    const hanRow = this.heroRows.find((r) => r.isLeader);
    if (hanRow && player) {
      if (player.dead) {
        hanRow.statusIcon.textContent = '☠️';
        hanRow.barFill.style.width = '0%';
        hanRow.nameLabel.style.color = '#888888';
      } else {
        const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
        hanRow.barFill.style.width = `${hpPct}%`;
        hanRow.barFill.style.backgroundColor = hpPct > 50 ? 'var(--ok)' : hpPct > 20 ? 'var(--gold)' : 'var(--danger)';
        hanRow.statusIcon.textContent = player.guardBreakTimer > 0 ? '⚠️' : '😌';
      }
    }

    // 2. Allies
    for (const ally of allies || []) {
      const row = this.heroRows.find((r) => r.id === ally.hero.id);
      if (!row) continue;

      if (ally.dead) {
        row.statusIcon.textContent = '☠️';
        row.barFill.style.width = '0%';
        row.nameLabel.style.color = '#888888';
      } else {
        const hpPct = Math.max(0, (ally.hp / ally.maxHp) * 100);
        row.barFill.style.width = `${hpPct}%`;
        row.barFill.style.backgroundColor = hpPct > 50 ? 'var(--ok)' : hpPct > 20 ? 'var(--gold)' : 'var(--danger)';
        row.statusIcon.textContent = ally.isPanicking ? '😱' : '😌';
      }
    }
  }

  show() {
    this.container.style.display = 'flex';
  }

  hide() {
    this.container.style.display = 'none';
  }
}
