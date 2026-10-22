export class HubHud {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'hud-hub';
    this.container.style.position = 'fixed';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.userSelect = 'none';
    this.container.style.fontFamily = 'monospace, sans-serif';
    this.container.style.zIndex = '9999';
    this.container.style.display = 'none';

    // 1. Top-Left: Currency Panel (Gold, Gems, Free Tickets)
    // The currency readout and the day badge share a flex row, so the badge
    // always sits right after the text instead of at a hardcoded offset that
    // a longer readout (more gold, more tickets) slides underneath.
    this.topLeftBar = document.createElement('div');
    this.topLeftBar.style.position = 'absolute';
    this.topLeftBar.style.top = '12px';
    this.topLeftBar.style.left = '12px';
    this.topLeftBar.style.display = 'flex';
    this.topLeftBar.style.alignItems = 'center';
    this.topLeftBar.style.gap = '10px';
    this.topLeftBar.style.zIndex = '10002'; // Above sign sprites
    this.container.appendChild(this.topLeftBar);

    this.currencyBox = document.createElement('div');
    this.currencyBox.style.backgroundColor = 'rgba(11, 8, 16, 0.9)';
    this.currencyBox.style.border = '1px solid var(--frame-inner)';
    this.currencyBox.style.boxShadow = '0 0 12px var(--glow)';
    this.currencyBox.style.borderRadius = '6px';
    this.currencyBox.style.padding = '8px 14px';
    this.currencyBox.style.color = 'var(--text)';
    this.currencyBox.style.fontSize = '13px';
    this.currencyBox.style.whiteSpace = 'nowrap';
    this.topLeftBar.appendChild(this.currencyBox);

    // 1b. Day Badge next to Currency
    this.dayBadge = document.createElement('div');
    this.dayBadge.style.backgroundColor = 'rgba(11, 8, 16, 0.9)';
    this.dayBadge.style.border = '1px solid var(--frame-inner)';
    this.dayBadge.style.boxShadow = '0 0 12px var(--glow)';
    this.dayBadge.style.borderRadius = '6px';
    this.dayBadge.style.padding = '8px 14px';
    this.dayBadge.style.color = 'var(--gold)';
    this.dayBadge.style.fontSize = '13px';
    this.dayBadge.style.fontWeight = 'bold';
    this.dayBadge.style.letterSpacing = '1px';
    this.dayBadge.style.whiteSpace = 'nowrap';
    this.dayBadge.textContent = 'DAY 1';
    this.topLeftBar.appendChild(this.dayBadge);

    // 1c. F3 Diagnostics Overlay
    this.showF3 = false;
    this.f3DebugBox = document.createElement('div');
    this.f3DebugBox.style.position = 'absolute';
    this.f3DebugBox.style.top = '52px';
    this.f3DebugBox.style.left = '12px';
    this.f3DebugBox.style.backgroundColor = 'rgba(11, 8, 16, 0.92)';
    this.f3DebugBox.style.border = '1px solid var(--frame-inner)';
    this.f3DebugBox.style.boxShadow = '0 0 12px var(--glow)';
    this.f3DebugBox.style.borderRadius = '6px';
    this.f3DebugBox.style.padding = '10px 14px';
    this.f3DebugBox.style.color = '#d0d7de';
    this.f3DebugBox.style.fontSize = '11px';
    this.f3DebugBox.style.lineHeight = '1.45';
    this.f3DebugBox.style.zIndex = '10002';
    this.f3DebugBox.style.display = 'none';
    this.f3DebugBox.style.whiteSpace = 'pre';
    this.container.appendChild(this.f3DebugBox);

    // 2. Top-Center: Niflheimr Title
    this.titleText = document.createElement('div');
    this.titleText.textContent = 'NIFLHEIMR';
    this.titleText.style.position = 'absolute';
    this.titleText.style.top = '12px';
    this.titleText.style.left = '50%';
    this.titleText.style.transform = 'translateX(-50%)';
    this.titleText.style.backgroundColor = 'rgba(11, 8, 16, 0.88)';
    this.titleText.style.border = '1px solid var(--frame-inner)';
    this.titleText.style.boxShadow = '0 0 12px var(--glow)';
    this.titleText.style.borderRadius = '6px';
    this.titleText.style.padding = '8px 24px';
    this.titleText.style.color = 'var(--frame)';
    this.titleText.style.fontSize = '16px';
    this.titleText.style.fontWeight = 'bold';
    this.titleText.style.letterSpacing = '2px';
    this.container.appendChild(this.titleText);

    // 3. Top-Right: Minimap (150px Circle Canvas)
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.width = 150;
    this.minimapCanvas.height = 150;
    this.minimapCanvas.style.position = 'absolute';
    this.minimapCanvas.style.top = '12px';
    this.minimapCanvas.style.right = '12px';
    this.minimapCanvas.style.borderRadius = '50%';
    this.minimapCanvas.style.border = '2px solid var(--frame)';
    this.minimapCanvas.style.boxShadow = '0 0 14px var(--glow)';
    this.minimapCanvas.style.backgroundColor = 'rgba(11, 8, 16, 0.88)';
    this.container.appendChild(this.minimapCanvas);

    // 4. Interaction Prompt: sits bottom-center at bottom: 90px (above hints)
    this.promptBox = document.createElement('div');
    this.promptBox.style.position = 'absolute';
    this.promptBox.style.bottom = '90px';
    this.promptBox.style.left = '50%';
    this.promptBox.style.transform = 'translateX(-50%)';
    this.promptBox.style.backgroundColor = 'rgba(26, 19, 38, 0.9)';
    this.promptBox.style.border = '1px solid var(--frame)';
    this.promptBox.style.boxShadow = '0 0 14px var(--glow)';
    this.promptBox.style.borderRadius = '6px';
    this.promptBox.style.padding = '10px 22px';
    this.promptBox.style.color = 'var(--text)';
    this.promptBox.style.fontSize = '15px';
    this.promptBox.style.fontWeight = 'bold';
    this.promptBox.style.textTransform = 'uppercase';
    this.promptBox.style.letterSpacing = '1px';
    this.promptBox.style.display = 'none';
    this.container.appendChild(this.promptBox);

    // 5. Bottom Hotkey Hints: sits bottom: 12px
    this.bottomHints = document.createElement('div');
    this.bottomHints.textContent =
      'WASD Move | MOUSE Rotate Camera (Click to Capture) | Arrow Keys Rotate/Pitch | Wheel Zoom | E Interact | R Roster | O Options | T Enter Tower | M Mute | ? Toggle Hints';
    this.bottomHints.style.position = 'absolute';
    this.bottomHints.style.bottom = '12px';
    this.bottomHints.style.left = '50%';
    this.bottomHints.style.transform = 'translateX(-50%)';
    this.bottomHints.style.backgroundColor = 'rgba(10, 20, 40, 0.8)';
    this.bottomHints.style.padding = '6px 16px';
    this.bottomHints.style.borderRadius = '6px';
    this.bottomHints.style.color = '#aaaaaa';
    this.bottomHints.style.fontSize = '12px';
    this.container.appendChild(this.bottomHints);

    this.hintsVisible = true;
    this.hintTimeout = null;

    window.addEventListener('keydown', (e) => {
      if (e.key === '?') {
        this.toggleHints();
      }
    });

    document.body.appendChild(this.container);
  }

  toggleHints() {
    this.hintsVisible = !this.hintsVisible;
    this.bottomHints.style.display = this.hintsVisible ? 'block' : 'none';
    if (this.hintTimeout) {
      clearTimeout(this.hintTimeout);
      this.hintTimeout = null;
    }
  }

  show() {
    this.container.style.display = 'block';
    this.hintsVisible = true;
    this.bottomHints.style.display = 'block';
    if (this.hintTimeout) clearTimeout(this.hintTimeout);
    this.hintTimeout = setTimeout(() => {
      this.hintsVisible = false;
      this.bottomHints.style.display = 'none';
    }, 20000);
  }

  hide() {
    this.container.style.display = 'none';
    this.promptBox.style.display = 'none';
    if (this.hintTimeout) clearTimeout(this.hintTimeout);
  }

  setPrompt(text) {
    if (text) {
      this.promptBox.textContent = text;
      this.promptBox.style.display = 'block';
    } else {
      this.promptBox.style.display = 'none';
    }
  }

  updateCurrency(gold, gems, freeTickets, day = null) {
    this.currencyBox.textContent = `Gold: ${gold} | Gems: ${gems} | Free Tickets: ${freeTickets}`;
    if (day !== null && this.dayBadge) {
      this.dayBadge.textContent = `DAY ${day}`;
    }
  }

  renderMinimap(playerX, playerZ, playerYaw, buildings = []) {
    const ctx = this.minimapCanvas.getContext('2d');
    const w = 150;
    const h = 150;
    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const toMap = (wx, wz) => ({
      x: centerX + (wx / 48) * 63,
      y: centerY + (wz / 48) * 63,
    });

    // 1. 12-sided (dodecagon) stone wall outline & island background
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const mx = centerX + Math.cos(angle) * 64;
      const my = centerY + Math.sin(angle) * 64;
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(15, 42, 51, 0.85)';
    ctx.fill();
    ctx.clip(); // Clip contents within island wall

    // 2. Zone fills with story-accurate manhua colors
    const zones = [
      // Residences: West (-26, -4) -> dark red
      { x: -26, z: -4, r: 15, color: 'rgba(140, 30, 35, 0.55)', border: '#aa2a30' },
      // Town Square: Centre-East (14, -8) -> orange-yellow
      { x: 14, z: -8, r: 13, color: 'rgba(225, 155, 30, 0.55)', border: '#e5a525' },
      // Synthesis Chamber: North (0, -32) -> green
      { x: 0, z: -32, r: 10, color: 'rgba(38, 155, 75, 0.55)', border: '#35b558' },
      // Training Grounds: South-West (-24, 20) -> purple
      { x: -24, z: 20, r: 11, color: 'rgba(125, 50, 165, 0.55)', border: '#8c42b5' },
      // Landing Area: South-East (20, 26) -> red
      { x: 20, z: 26, r: 14, color: 'rgba(195, 40, 45, 0.55)', border: '#d5353c' },
      // Summoning Room: East (30, 4) -> blue
      { x: 30, z: 4, r: 11, color: 'rgba(35, 115, 215, 0.55)', border: '#3085e5' },
    ];

    for (const z of zones) {
      const pos = toMap(z.x, z.z);
      const pr = (z.r / 48) * 63;
      ctx.fillStyle = z.color;
      ctx.strokeStyle = z.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Paved road hints
    ctx.strokeStyle = 'rgba(184, 196, 200, 0.25)';
    ctx.lineWidth = 3;
    const sqPos = toMap(14, -8);
    for (const dest of [toMap(20, 26), toMap(30, 4), toMap(31, -31), toMap(0, -32), toMap(-6, -20), toMap(-26, -4), toMap(-24, 20)]) {
      ctx.beginPath();
      ctx.moveTo(sqPos.x, sqPos.y);
      ctx.lineTo(dest.x, dest.y);
      ctx.stroke();
    }

    // Building markers
    for (const b of buildings) {
      const bp = toMap(b.x, b.z);
      if (b.isGate || b.name === 'Space-Time Rift' || b.name === 'Tower Gate') {
        ctx.fillStyle = '#33b4ff';
        ctx.fillRect(bp.x - 3, bp.y - 3, 6, 6);
      } else if (b.name === 'Armory' || b.name === 'Blacksmith') {
        ctx.fillStyle = '#ff8822';
        ctx.beginPath();
        ctx.arc(bp.x, bp.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // 3. Draw outer wall border
    ctx.strokeStyle = '#d9ccff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const mx = centerX + Math.cos(angle) * 64;
      const my = centerY + Math.sin(angle) * 64;
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    }
    ctx.closePath();
    ctx.stroke();

    // 4. Player arrow (yellow)
    const pp = toMap(playerX, playerZ);
    ctx.save();
    ctx.translate(pp.x, pp.y);
    ctx.rotate(playerYaw);
    ctx.fillStyle = '#ffd36b';
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(-4, -5);
    ctx.lineTo(4, -5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  toggleF3() {
    this.showF3 = !this.showF3;
    this.f3DebugBox.style.display = this.showF3 ? 'block' : 'none';
    return this.showF3;
  }

  updateF3(text) {
    if (this.showF3) {
      this.f3DebugBox.textContent = text;
    }
  }
}
