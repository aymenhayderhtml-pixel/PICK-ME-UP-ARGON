import { COMMAND_LIST } from '../combat/Commands.js';

export class CommandWheel {
  constructor(onSelectCommand) {
    this.onSelectCommand = onSelectCommand;
    this.isOpen = false;
    this.selectedIndex = 0;

    // Outer Container
    this.container = document.createElement('div');
    this.container.id = 'pm-command-wheel';
    this.container.style.position = 'fixed';
    this.container.style.top = '50%';
    this.container.style.left = '50%';
    this.container.style.transform = 'translate(-50%, -50%)';
    this.container.style.width = '300px';
    this.container.style.height = '300px';
    this.container.style.borderRadius = '50%';
    this.container.style.backgroundColor = 'rgba(11, 8, 16, 0.92)';
    this.container.style.border = '2px solid var(--frame)';
    this.container.style.boxShadow = '0 0 24px var(--glow), inset 0 0 16px rgba(170, 130, 255, 0.2)';
    this.container.style.display = 'none';
    this.container.style.zIndex = '10003';
    this.container.style.fontFamily = 'monospace, sans-serif';
    this.container.style.pointerEvents = 'auto';
    this.container.style.userSelect = 'none';

    // Center Display
    this.centerHub = document.createElement('div');
    this.centerHub.style.position = 'absolute';
    this.centerHub.style.top = '50%';
    this.centerHub.style.left = '50%';
    this.centerHub.style.transform = 'translate(-50%, -50%)';
    this.centerHub.style.width = '110px';
    this.centerHub.style.height = '110px';
    this.centerHub.style.borderRadius = '50%';
    this.centerHub.style.backgroundColor = 'rgba(26, 19, 38, 0.95)';
    this.centerHub.style.border = '1px solid var(--frame-inner)';
    this.centerHub.style.display = 'flex';
    this.centerHub.style.flexDirection = 'column';
    this.centerHub.style.alignItems = 'center';
    this.centerHub.style.justifyContent = 'center';
    this.centerHub.style.textAlign = 'center';
    this.centerHub.style.padding = '6px';
    this.container.appendChild(this.centerHub);

    this.centerIcon = document.createElement('div');
    this.centerIcon.style.fontSize = '24px';
    this.centerHub.appendChild(this.centerIcon);

    this.centerTitle = document.createElement('div');
    this.centerTitle.style.color = 'var(--frame)';
    this.centerTitle.style.fontWeight = 'bold';
    this.centerTitle.style.fontSize = '12px';
    this.centerTitle.style.marginTop = '2px';
    this.centerHub.appendChild(this.centerTitle);

    this.centerKey = document.createElement('div');
    this.centerKey.style.color = 'var(--accent)';
    this.centerKey.style.fontSize = '10px';
    this.centerHub.appendChild(this.centerKey);

    // Radial buttons
    this.items = [];
    const radius = 100;
    const count = COMMAND_LIST.length;

    COMMAND_LIST.forEach((cmd, i) => {
      // Start from top (-90 deg)
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const x = 150 + Math.cos(angle) * radius;
      const y = 150 + Math.sin(angle) * radius;

      const itemEl = document.createElement('div');
      itemEl.style.position = 'absolute';
      itemEl.style.left = `${x}px`;
      itemEl.style.top = `${y}px`;
      itemEl.style.transform = 'translate(-50%, -50%)';
      itemEl.style.width = '52px';
      itemEl.style.height = '52px';
      itemEl.style.borderRadius = '50%';
      itemEl.style.backgroundColor = 'rgba(26, 19, 38, 0.85)';
      itemEl.style.border = '1px solid var(--frame-inner)';
      itemEl.style.display = 'flex';
      itemEl.style.flexDirection = 'column';
      itemEl.style.alignItems = 'center';
      itemEl.style.justifyContent = 'center';
      itemEl.style.color = '#ffffff';
      itemEl.style.cursor = 'pointer';
      itemEl.style.transition = 'all 0.1s ease';

      const iconSpan = document.createElement('span');
      iconSpan.textContent = cmd.icon;
      iconSpan.style.fontSize = '18px';
      itemEl.appendChild(iconSpan);

      const keySpan = document.createElement('span');
      keySpan.textContent = `[${cmd.key}]`;
      keySpan.style.fontSize = '9px';
      keySpan.style.color = 'var(--accent)';
      itemEl.appendChild(keySpan);

      itemEl.addEventListener('mouseenter', () => {
        this.selectIndex(i);
      });

      itemEl.addEventListener('click', () => {
        this.confirmSelection(i);
      });

      this.container.appendChild(itemEl);
      this.items.push(itemEl);
    });

    document.body.appendChild(this.container);

    // Mouse tracking for angle selection
    window.addEventListener('mousemove', (e) => {
      if (!this.isOpen) return;
      const rect = this.container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist > 30) {
        // Angle in radians from top
        let a = Math.atan2(dy, dx) + Math.PI / 2;
        if (a < 0) a += Math.PI * 2;
        const segment = Math.PI * 2 / count;
        const index = Math.floor((a + segment / 2) % (Math.PI * 2) / segment);
        this.selectIndex(index);
      }
    });

    this.selectIndex(0);
  }

  selectIndex(index) {
    if (index < 0 || index >= COMMAND_LIST.length) return;
    this.selectedIndex = index;
    const cmd = COMMAND_LIST[index];

    this.centerIcon.textContent = cmd.icon;
    this.centerTitle.textContent = cmd.label;
    this.centerKey.textContent = `Key ${cmd.key}`;

    this.items.forEach((el, i) => {
      if (i === index) {
        el.style.backgroundColor = 'rgba(180, 140, 255, 0.35)';
        el.style.borderColor = 'var(--frame)';
        el.style.boxShadow = '0 0 12px var(--glow)';
        el.style.transform = 'translate(-50%, -50%) scale(1.15)';
      } else {
        el.style.backgroundColor = 'rgba(26, 19, 38, 0.85)';
        el.style.borderColor = 'var(--frame-inner)';
        el.style.boxShadow = 'none';
        el.style.transform = 'translate(-50%, -50%) scale(1.0)';
      }
    });
  }

  open() {
    this.isOpen = true;
    this.container.style.display = 'block';
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  close() {
    if (!this.isOpen) return null;
    this.isOpen = false;
    this.container.style.display = 'none';
    const chosen = COMMAND_LIST[this.selectedIndex];
    if (this.onSelectCommand) {
      this.onSelectCommand(chosen);
    }
    return chosen;
  }

  confirmSelection(index) {
    this.selectedIndex = index;
    this.close();
  }
}
