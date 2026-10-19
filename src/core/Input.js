export class Input {
  constructor(domElement) {
    this.domElement = domElement;
    this.keys = new Set();
    this.mouseButtons = new Set();
    this.mouseDelta = { x: 0, y: 0 };
    this.isLocked = false;

    // Track pressed keys
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    // Track mouse buttons
    window.addEventListener('mousedown', (e) => {
      this.mouseButtons.add(e.button);
    });

    window.addEventListener('mouseup', (e) => {
      this.mouseButtons.delete(e.button);
    });

    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  isDown(code) {
    if (this.isLocked) return false;
    return this.keys.has(code);
  }

  isMouseButtonDown(button) {
    if (this.isLocked) return false;
    return this.mouseButtons.has(button);
  }

  isRmbDown() {
    if (this.isLocked) return false;
    return this.mouseButtons.has(2);
  }

  isLmbDown() {
    if (this.isLocked) return false;
    return this.mouseButtons.has(0);
  }

  consumeMouseDelta() {
    const delta = { x: this.mouseDelta.x, y: this.mouseDelta.y };
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    return delta;
  }
}
