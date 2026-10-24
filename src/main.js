import './ui/theme.css';
import './ui/hud-floor3.css';
import * as THREE from 'three';
import { Input } from './core/Input.js';
import { SceneManager } from './core/SceneManager.js';
import { HubScene } from './scenes/HubScene.js';
import { TowerScene } from './scenes/TowerScene.js';
import { showSystemMessage } from './ui/SystemWindow.js';
import './ui/FpsCounter.js';

// Prevent browser context menu on right-click for combat/dodge actions
window.addEventListener('contextmenu', (e) => e.preventDefault());

// Basic page styling
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.backgroundColor = '#000000';

// 1. Renderer setup
const renderer = new THREE.WebGLRenderer({
  antialias: false,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

// 2. Core Systems & Input
const input = new Input(renderer.domElement);
const sceneManager = new SceneManager(renderer);

// 3. Register Hub & Tower Scenes
const hubScene = new HubScene(renderer, input);
const towerScene = new TowerScene(renderer, input);

sceneManager.register('hub', hubScene);
sceneManager.register('tower', towerScene);
if (typeof window !== 'undefined') {
  window.sceneManager = sceneManager;
  window.hubScene = hubScene;
  window.towerScene = towerScene;
}

// 4. Handle Window Resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
});

// 5. Main Game Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  sceneManager.update(delta);
}

// 6. Start in Hub (Niflheimr)
try {
  sceneManager.switchTo('hub');
} catch (err) {
  console.error('Failed to switch to hub on start:', err);
}

// Start loop
animate();

// Helper to capture canvas frame if test server is running
setTimeout(() => {
  try {
    const dataUrl = renderer.domElement.toDataURL('image/png');
    fetch('/screenshot', {
      method: 'POST',
      body: dataUrl,
    }).catch(() => {});
  } catch (e) {}
}, 1200);
