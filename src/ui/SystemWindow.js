import { attachOrnateCorners } from './ornaments.js';
export { showSystemMessage } from './Notices.js';

export class SystemWindow {
  constructor(title = 'SYSTEM') {
    this.container = document.createElement('div');
    this.container.classList.add('mm-panel');
    // Marks the root of a system window so the input layer can tell a wheel
    // over the UI from a wheel over the game canvas.
    this.container.classList.add('mm-system-window');
    this.container.style.position = 'fixed';
    this.container.style.top = '50%';
    this.container.style.left = '50%';
    this.container.style.transform = 'translate(-50%, -50%)';
    this.container.style.minWidth = '340px';
    this.container.style.maxWidth = '90vw';
    this.container.style.zIndex = '10000';
    this.container.style.display = 'none';
    this.container.style.flexDirection = 'column';
    this.container.style.overflow = 'visible';
    this.container.style.backdropFilter = 'blur(6px)';
    this.container.style.paddingTop = '14px';

    // Attach manhua filigree corners
    attachOrnateCorners(this.container);

    // Title Bar (centered title, height 40px, padding 0 14px, below corner ornaments)
    this.titleBar = document.createElement('div');
    this.titleBar.style.position = 'relative';
    this.titleBar.style.display = 'flex';
    this.titleBar.style.justifyContent = 'center';
    this.titleBar.style.alignItems = 'center';
    this.titleBar.style.height = '40px';
    this.titleBar.style.padding = '0 14px';
    this.titleBar.style.boxSizing = 'border-box';
    this.titleBar.style.backgroundColor = 'rgba(91, 74, 138, 0.25)';
    this.titleBar.style.borderBottom = '1px solid var(--frame-inner)';

    this.titleLabel = document.createElement('span');
    this.titleLabel.style.fontWeight = 'bold';
    this.titleLabel.style.color = 'var(--frame)';
    this.titleLabel.style.letterSpacing = '1.5px';
    this.titleLabel.style.textTransform = 'uppercase';
    this.titleLabel.style.textAlign = 'center';
    this.titleLabel.style.width = '100%';
    this.titleLabel.textContent = title;
    this.titleBar.appendChild(this.titleLabel);

    this.closeBtn = document.createElement('button');
    this.closeBtn.textContent = '✕';
    this.closeBtn.style.position = 'absolute';
    this.closeBtn.style.right = '14px';
    this.closeBtn.style.background = 'transparent';
    this.closeBtn.style.border = 'none';
    this.closeBtn.style.color = 'var(--accent)';
    this.closeBtn.style.fontSize = '16px';
    this.closeBtn.style.cursor = 'pointer';
    this.closeBtn.style.padding = '0 4px';
    this.closeBtn.addEventListener('click', () => this.close());
    this.titleBar.appendChild(this.closeBtn);

    this.container.appendChild(this.titleBar);

    // Content container
    this.contentElement = document.createElement('div');
    this.contentElement.style.padding = '16px';
    this.contentElement.style.fontSize = '13px';
    this.contentElement.style.lineHeight = '1.5';
    this.container.appendChild(this.contentElement);

    // The third-person camera zooms on every 'wheel' event that reaches
    // `window`, so a wheel over this window would zoom the camera behind
    // the UI. Stopping the propagation here keeps the wheel in the window.
    // Passive, and never preventDefault: the scrollable lists inside keep
    // scrolling natively.
    this.container.addEventListener(
      'wheel',
      (e) => {
        e.stopPropagation();
      },
      { passive: true }
    );

    document.body.appendChild(this.container);
  }

  setTitle(title) {
    this.titleLabel.textContent = title.toUpperCase();
  }

  setContent(content) {
    if (typeof content === 'string') {
      this.contentElement.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.contentElement.innerHTML = '';
      this.contentElement.appendChild(content);
    }
  }

  open() {
    this.container.style.display = 'flex';
  }

  close() {
    this.container.style.display = 'none';
  }

  isOpen() {
    return this.container.style.display === 'flex';
  }
}
