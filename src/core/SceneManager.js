export class SceneManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.scenes = new Map();
    this.currentScene = null;
    this.currentName = null;
  }

  register(name, sceneObject) {
    this.scenes.set(name, sceneObject);
    sceneObject.sceneManager = this;
  }

  switchTo(name, params = {}) {
    if (this.currentScene && typeof this.currentScene.exit === 'function') {
      this.currentScene.exit();
    }

    const nextScene = this.scenes.get(name);
    if (!nextScene) {
      console.error(`Scene '${name}' not found in SceneManager.`);
      return;
    }

    this.currentName = name;
    this.currentScene = nextScene;

    // Enforce HUD mutual exclusivity as a safeguard
    const hubHud = document.getElementById('hud-hub');
    const towerHud = document.getElementById('hud-tower');
    if (name === 'tower' && hubHud) hubHud.style.display = 'none';
    if (name === 'hub' && towerHud) towerHud.style.display = 'none';

    if (typeof this.currentScene.enter === 'function') {
      this.currentScene.enter(params);
    }
  }

  update(delta) {
    if (!this.currentScene) return;

    if (typeof this.currentScene.update === 'function') {
      this.currentScene.update(delta);
    }

    if (this.renderer && this.currentScene.scene && this.currentScene.camera) {
      this.renderer.render(this.currentScene.scene, this.currentScene.camera);
    }
  }
}
