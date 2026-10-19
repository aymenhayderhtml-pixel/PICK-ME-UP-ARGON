export class BossBar {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'boss-bar-container';
    this.container.style.position = 'fixed';
    this.container.style.top = '24px';
    this.container.style.left = '50%';
    this.container.style.transform = 'translateX(-50%)';
    this.container.style.display = 'none';
    this.container.style.flexDirection = 'column';
    this.container.style.alignItems = 'center';
    this.container.style.gap = '6px';
    this.container.style.zIndex = '10002';
    this.container.style.fontFamily = 'monospace, sans-serif';
    this.container.style.userSelect = 'none';
    this.container.style.pointerEvents = 'none';

    // Boss Name Label + Enrage Tag
    this.labelBox = document.createElement('div');
    this.labelBox.style.display = 'flex';
    this.labelBox.style.alignItems = 'center';
    this.labelBox.style.gap = '8px';

    this.nameLabel = document.createElement('span');
    this.nameLabel.style.fontSize = '16px';
    this.nameLabel.style.fontWeight = 'bold';
    this.nameLabel.style.color = '#ff4444';
    this.nameLabel.style.letterSpacing = '2px';
    this.nameLabel.style.textShadow = '0 0 10px rgba(255, 68, 68, 0.6)';
    this.nameLabel.textContent = 'HOBGOBLIN CHIEF';
    this.labelBox.appendChild(this.nameLabel);

    this.enrageTag = document.createElement('span');
    this.enrageTag.style.fontSize = '12px';
    this.enrageTag.style.fontWeight = 'bold';
    this.enrageTag.style.color = '#ff1122';
    this.enrageTag.style.border = '1px solid #ff1122';
    this.enrageTag.style.padding = '1px 6px';
    this.enrageTag.style.borderRadius = '3px';
    this.enrageTag.style.display = 'none';
    this.enrageTag.textContent = 'ENRAGED';
    this.labelBox.appendChild(this.enrageTag);

    this.container.appendChild(this.labelBox);

    // HP Bar Frame
    this.barFrame = document.createElement('div');
    this.barFrame.style.width = '520px';
    this.barFrame.style.maxWidth = '88vw';
    this.barFrame.style.height = '18px';
    this.barFrame.style.backgroundColor = 'rgba(20, 10, 10, 0.88)';
    this.barFrame.style.border = '2px solid #882222';
    this.barFrame.style.borderRadius = '4px';
    this.barFrame.style.position = 'relative';
    this.barFrame.style.overflow = 'hidden';
    this.barFrame.style.boxShadow = '0 0 14px rgba(255, 34, 34, 0.4)';

    // Damage Trail Fill (follows slowly)
    this.trailFill = document.createElement('div');
    this.trailFill.style.position = 'absolute';
    this.trailFill.style.top = '0';
    this.trailFill.style.left = '0';
    this.trailFill.style.height = '100%';
    this.trailFill.style.width = '100%';
    this.trailFill.style.backgroundColor = '#ff7722';
    this.barFrame.appendChild(this.trailFill);

    // Main HP Fill (updates instantly)
    this.hpFill = document.createElement('div');
    this.hpFill.style.position = 'absolute';
    this.hpFill.style.top = '0';
    this.hpFill.style.left = '0';
    this.hpFill.style.height = '100%';
    this.hpFill.style.width = '100%';
    this.hpFill.style.backgroundColor = '#d32f2f';
    this.barFrame.appendChild(this.hpFill);

    // 50% Marker Line
    this.marker50 = document.createElement('div');
    this.marker50.style.position = 'absolute';
    this.marker50.style.top = '0';
    this.marker50.style.left = '50%';
    this.marker50.style.width = '2px';
    this.marker50.style.height = '100%';
    this.marker50.style.backgroundColor = '#ffffff';
    this.marker50.style.opacity = '0.8';
    this.marker50.style.boxShadow = '0 0 6px #ffffff';
    this.barFrame.appendChild(this.marker50);

    // HP Text
    this.hpText = document.createElement('div');
    this.hpText.style.position = 'absolute';
    this.hpText.style.top = '0';
    this.hpText.style.left = '0';
    this.hpText.style.width = '100%';
    this.hpText.style.height = '100%';
    this.hpText.style.display = 'flex';
    this.hpText.style.alignItems = 'center';
    this.hpText.style.justifyContent = 'center';
    this.hpText.style.fontSize = '10px';
    this.hpText.style.fontWeight = 'bold';
    this.hpText.style.color = '#ffffff';
    this.hpText.style.textShadow = '0 1px 3px #000000';
    this.hpText.textContent = '600 / 600';
    this.barFrame.appendChild(this.hpText);

    this.container.appendChild(this.barFrame);
    document.body.appendChild(this.container);

    this.maxHp = 600;
    this.currentHp = 600;
    this.trailHp = 600;
  }

  show(bossName = 'HOBGOBLIN CHIEF', maxHp = 600) {
    this.nameLabel.textContent = bossName.toUpperCase();
    this.maxHp = maxHp;
    this.currentHp = maxHp;
    this.trailHp = maxHp;
    this.enrageTag.style.display = 'none';
    this.container.style.display = 'flex';
    this.render();
  }

  update(currentHp, delta = 0.016) {
    this.currentHp = Math.max(0, currentHp);

    // Trail HP follows slowly towards current HP
    if (this.trailHp > this.currentHp) {
      this.trailHp -= (this.trailHp - this.currentHp) * Math.min(1.0, delta * 3.5);
    } else {
      this.trailHp = this.currentHp;
    }

    // Enrage tag at 50%
    if (this.currentHp <= this.maxHp * 0.5 && this.currentHp > 0) {
      this.enrageTag.style.display = 'inline-block';
    } else {
      this.enrageTag.style.display = 'none';
    }

    this.render();
  }

  render() {
    const hpRatio = Math.max(0, Math.min(1, this.currentHp / this.maxHp));
    const trailRatio = Math.max(0, Math.min(1, this.trailHp / this.maxHp));

    this.hpFill.style.width = `${(hpRatio * 100).toFixed(1)}%`;
    this.trailFill.style.width = `${(trailRatio * 100).toFixed(1)}%`;
    this.hpText.textContent = `${Math.ceil(this.currentHp)} / ${this.maxHp}`;
  }

  hide() {
    this.container.style.display = 'none';
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
