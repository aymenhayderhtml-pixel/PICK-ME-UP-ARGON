import * as THREE from 'three';
import { createEnemyModel, ENEMY_TYPES, ENEMY_POSES, POSE_INFO } from './enemies.js';
import { ENEMY_PRESETS } from './enemyPresets.js';

// Setup Three.js scene
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x120d18); // Dark maroon/violet

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Lighting
const hemiLight = new THREE.HemisphereLight(0xeddceb, 0x1b1424, 1.4);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
dirLight.position.set(6, 14, 8);
scene.add(dirLight);

// Grid floor
const grid = new THREE.GridHelper(24, 24, 0xad1457, 0x3d172e);
grid.position.y = 0;
scene.add(grid);

// Hero scale reference (1.75m tall marker)
const scaleRefGroup = new THREE.Group();
const refMat = new THREE.MeshStandardMaterial({ color: 0x4fc3f7, roughness: 0.5 });
const refBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.75, 16), refMat);
refBody.position.y = 1.75 / 2;
const refHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), refMat);
refHead.position.y = 1.75;
scaleRefGroup.add(refBody, refHead);
scaleRefGroup.position.set(-1.2, 0, 0);
scaleRefGroup.visible = false;
scene.add(scaleRefGroup);

// Manual Orbit Camera
let isDragging = false;
let prevPointerX = 0;
let prevPointerY = 0;
let cameraYaw = 0;
let cameraPitch = 0.25;
let cameraDistance = 4.5;
let targetLookAt = new THREE.Vector3(0, 0.85, 0);
let turntableEnabled = true;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.domElement.addEventListener('pointerdown', (e) => {
  isDragging = true;
  prevPointerX = e.clientX;
  prevPointerY = e.clientY;
});

window.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - prevPointerX;
  const dy = e.clientY - prevPointerY;
  prevPointerX = e.clientX;
  prevPointerY = e.clientY;

  cameraYaw -= dx * 0.006;
  cameraPitch = Math.max(-1.4, Math.min(1.4, cameraPitch + dy * 0.006));
});

window.addEventListener('pointerup', () => {
  isDragging = false;
});

renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  cameraDistance = Math.max(0.6, Math.min(30, cameraDistance * (1 + e.deltaY * 0.001)));
}, { passive: false });

let activeEnemies = [];
let currentType = 'goblin_grunt';
let currentPresetName = null;
let currentPose = 'idle';
let currentExpression = 'neutral';
let currentOutline = true;
let currentOpacity = 1.0;
let currentTint = false;
let currentEyeGlow = 1.0;
let currentEnrage = 0.0;
let isSpawn25Mode = false;

// Playback controls
let animTime = 0;
let playbackSpeed = 1.0;
let isFrozen = false;
let freezeT = 0.0;

function computePoseT(poseName, localTime) {
  if (isFrozen) return freezeT;
  const info = POSE_INFO[poseName] || { loop: true, duration: 1.0 };
  if (!info.loop) {
    const period = info.duration + 0.6;
    const modTime = ((localTime % period) + period) % period;
    return Math.min(info.duration, modTime);
  }
  return Math.max(0, localTime);
}

function clearActiveEnemies() {
  for (const entry of activeEnemies) {
    scene.remove(entry.model.group);
    entry.model.dispose();
  }
  activeEnemies = [];
}

function spawnSingle(type, opts = {}) {
  clearActiveEnemies();
  isSpawn25Mode = false;

  const model = createEnemyModel(type, { ...opts, outline: currentOutline });
  model.setEyeGlow(currentEyeGlow);
  model.setEnrage(currentEnrage);
  model.setOpacity(currentOpacity);
  model.setOutlineVisible(currentOutline);
  if (currentTint) model.setTint(0xff2222, 0.7);
  model.setExpression(currentExpression);

  scene.add(model.group);
  activeEnemies.push({ model, phase: 0 });

  targetLookAt.set(0, 0.8, 0);
  cameraDistance = type === 'hobgoblin_chief' ? 7.5 : type.includes('orc_lord') ? 9.0 : 4.5;
}

function spawn25Grid() {
  clearActiveEnemies();
  isSpawn25Mode = true;

  const types = [
    'goblin_grunt',
    'goblin_grunt',
    'goblin_archer',
    'goblin_shaman',
    'goblin_grunt'
  ];

  const spacing = 2.4;
  const offset = 2 * spacing;

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      let t = types[(r + c) % types.length];
      let opts = {};

      // Place 1 leader in the exact center (r = 2, c = 2)
      if (r === 2 && c === 2) {
        t = 'goblin_leader';
      } else if (t === 'goblin_grunt') {
        const weps = ['dualKnives', 'knifeShield', 'club'];
        opts.weapon = weps[(r * 5 + c) % weps.length];
      }

      const model = createEnemyModel(t, { ...opts, outline: currentOutline, seed: (r * 17 + c * 31) });
      model.group.position.set(c * spacing - offset, 0, r * spacing - offset);
      model.setEyeGlow(currentEyeGlow);
      model.setEnrage(currentEnrage);
      model.setOpacity(currentOpacity);
      model.setOutlineVisible(currentOutline);
      if (currentTint) model.setTint(0xff2222, 0.7);
      model.setExpression(currentExpression);

      scene.add(model.group);
      activeEnemies.push({ model, phase: Math.random() * 10 });
    }
  }

  targetLookAt.set(0, 0.8, 0);
  cameraDistance = 18.0;
}

// UI Setup
function buildUI() {
  // Types
  const typeContainer = document.getElementById('type-buttons');
  ENEMY_TYPES.forEach((t) => {
    const btn = document.createElement('button');
    btn.textContent = t.replace('goblin_', 'g_').replace('orc_', 'o_');
    btn.title = t;
    if (t === currentType) btn.classList.add('active');
    btn.addEventListener('click', () => {
      document.querySelectorAll('#type-buttons button').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('#preset-buttons button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentType = t;
      currentPresetName = null;
      spawnSingle(t);
    });
    typeContainer.appendChild(btn);
  });

  // Presets
  const presetContainer = document.getElementById('preset-buttons');
  Object.keys(ENEMY_PRESETS).forEach((pKey) => {
    const btn = document.createElement('button');
    btn.textContent = pKey;
    btn.addEventListener('click', () => {
      document.querySelectorAll('#type-buttons button').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('#preset-buttons button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentPresetName = pKey;
      const p = ENEMY_PRESETS[pKey];
      currentType = p.type;
      spawnSingle(p.type, p.opts);
    });
    presetContainer.appendChild(btn);
  });

  // Spawn modes
  const btnSingle = document.getElementById('btn-single');
  const btnSpawn25 = document.getElementById('btn-spawn25');
  btnSingle.addEventListener('click', () => {
    btnSingle.classList.add('active');
    btnSpawn25.classList.remove('active');
    spawnSingle(currentType);
  });
  btnSpawn25.addEventListener('click', () => {
    btnSpawn25.classList.add('active');
    btnSingle.classList.remove('active');
    spawn25Grid();
  });

  // Poses
  const poseContainer = document.getElementById('pose-buttons');
  ENEMY_POSES.forEach((p) => {
    const btn = document.createElement('button');
    btn.textContent = p;
    if (p === currentPose) btn.classList.add('active');
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pose-buttons button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentPose = p;
      animTime = 0;
    });
    poseContainer.appendChild(btn);
  });

  // Playback
  const btnReplay = document.getElementById('btn-replay');
  btnReplay.addEventListener('click', () => {
    animTime = 0;
  });

  const btnFreeze = document.getElementById('btn-freeze-toggle');
  btnFreeze.addEventListener('click', () => {
    isFrozen = !isFrozen;
    btnFreeze.textContent = `Freeze: ${isFrozen ? 'ON' : 'OFF'}`;
    btnFreeze.classList.toggle('active', isFrozen);
  });

  const sliderSpeed = document.getElementById('slider-speed');
  const speedVal = document.getElementById('speed-val');
  sliderSpeed.addEventListener('input', (e) => {
    playbackSpeed = parseFloat(e.target.value);
    speedVal.textContent = `${playbackSpeed.toFixed(2)}x`;
  });

  const sliderFreeze = document.getElementById('slider-freeze');
  const freezeVal = document.getElementById('freeze-val');
  sliderFreeze.addEventListener('input', (e) => {
    freezeT = parseFloat(e.target.value);
    freezeVal.textContent = `${freezeT.toFixed(2)}s`;
    if (!isFrozen) {
      isFrozen = true;
      btnFreeze.textContent = 'Freeze: ON';
      btnFreeze.classList.add('active');
    }
  });

  // Expressions
  document.querySelectorAll('#expression-buttons button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#expression-buttons button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentExpression = btn.dataset.expr;
      for (const e of activeEnemies) {
        e.model.setExpression(currentExpression);
      }
    });
  });

  // Sliders & Controls
  const sliderGlow = document.getElementById('slider-eyeglow');
  const glowVal = document.getElementById('eyeglow-val');
  sliderGlow.addEventListener('input', (e) => {
    currentEyeGlow = parseFloat(e.target.value);
    glowVal.textContent = currentEyeGlow.toFixed(1);
    for (const en of activeEnemies) en.model.setEyeGlow(currentEyeGlow);
  });

  const sliderEnrage = document.getElementById('slider-enrage');
  const enrageVal = document.getElementById('enrage-val');
  sliderEnrage.addEventListener('input', (e) => {
    currentEnrage = parseFloat(e.target.value);
    enrageVal.textContent = currentEnrage.toFixed(1);
    for (const en of activeEnemies) en.model.setEnrage(currentEnrage);
  });

  const sliderOpacity = document.getElementById('slider-opacity');
  const opacityVal = document.getElementById('opacity-val');
  sliderOpacity.addEventListener('input', (e) => {
    currentOpacity = parseFloat(e.target.value);
    opacityVal.textContent = currentOpacity.toFixed(2);
    for (const en of activeEnemies) en.model.setOpacity(currentOpacity);
  });

  const btnTint = document.getElementById('btn-tint');
  btnTint.addEventListener('click', () => {
    currentTint = !currentTint;
    btnTint.textContent = `Tint Red: ${currentTint ? 'ON' : 'OFF'}`;
    btnTint.classList.toggle('active', currentTint);
    for (const en of activeEnemies) {
      en.model.setTint(currentTint ? 0xff2222 : null, currentTint ? 0.7 : 0);
    }
  });

  const btnOutline = document.getElementById('btn-outline');
  btnOutline.addEventListener('click', () => {
    currentOutline = !currentOutline;
    btnOutline.textContent = `Outline: ${currentOutline ? 'ON' : 'OFF'}`;
    btnOutline.classList.toggle('active', currentOutline);
    for (const en of activeEnemies) en.model.setOutlineVisible(currentOutline);
  });

  const btnScaleRef = document.getElementById('btn-scale-ref');
  btnScaleRef.addEventListener('click', () => {
    scaleRefGroup.visible = !scaleRefGroup.visible;
    btnScaleRef.textContent = `Scale Ref (1.75m): ${scaleRefGroup.visible ? 'ON' : 'OFF'}`;
    btnScaleRef.classList.toggle('active', scaleRefGroup.visible);
  });

  const btnTurntable = document.getElementById('btn-turntable');
  btnTurntable.addEventListener('click', () => {
    turntableEnabled = !turntableEnabled;
    btnTurntable.textContent = `Turntable: ${turntableEnabled ? 'ON' : 'OFF'}`;
    btnTurntable.classList.toggle('active', turntableEnabled);
  });

  // Close-up face button
  const btnCloseup = document.getElementById('btn-closeup');
  btnCloseup.addEventListener('click', () => {
    if (activeEnemies.length > 0) {
      const primary = activeEnemies[0].model;
      const headAnchor = primary.anchors?.head || primary.parts?.head;
      const wp = new THREE.Vector3();
      if (headAnchor) {
        headAnchor.getWorldPosition(wp);
      } else {
        wp.set(0, 1.2, 0);
      }
      targetLookAt.copy(wp);
      cameraDistance = 1.2;
      cameraPitch = 0.05;
      cameraYaw = 0.0;
    }
  });

  // Screenshot button
  const btnScreenshot = document.getElementById('btn-screenshot');
  btnScreenshot.addEventListener('click', () => {
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = `enemy_${currentType}_${currentPose}.png`;
    a.href = dataUrl;
    a.click();
  });
}

// Initial Spawn & UI
buildUI();
spawnSingle('goblin_grunt');

// Main Render & Animation Loop
let lastTime = performance.now();
let frameCount = 0;
let lastFpsUpdate = performance.now();
const statsFps = document.getElementById('stats-fps');
const statsPose = document.getElementById('stats-pose');

function animate(now) {
  requestAnimationFrame(animate);

  const delta = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  if (!isFrozen) {
    animTime += delta * playbackSpeed;
  }

  // Turntable rotation
  if (turntableEnabled && !isDragging) {
    cameraYaw += delta * 0.25;
  }

  // Camera Orbit Position
  const cy = Math.cos(cameraPitch);
  const cx = Math.sin(cameraYaw) * cy;
  const cz = Math.cos(cameraYaw) * cy;
  const sy = Math.sin(cameraPitch);

  camera.position.set(
    targetLookAt.x + cx * cameraDistance,
    targetLookAt.y + sy * cameraDistance,
    targetLookAt.z + cz * cameraDistance
  );
  camera.lookAt(targetLookAt);

  // Update enemy poses
  let currentEvalT = 0;
  for (const entry of activeEnemies) {
    const t = computePoseT(currentPose, animTime + entry.phase);
    entry.model.setPose(currentPose, t);
    currentEvalT = t;
  }

  renderer.render(scene, camera);

  // FPS & Stat counters
  frameCount++;
  if (now - lastFpsUpdate >= 400) {
    const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    frameCount = 0;
    lastFpsUpdate = now;
    const calls = renderer.info.render.calls;
    const triangles = renderer.info.render.triangles;
    statsFps.textContent = `FPS: ${fps} | Calls: ${calls} | Triangles: ${triangles}`;
  }

  statsPose.textContent = `Pose: ${currentPose} | t: ${currentEvalT.toFixed(2)}s`;
}

requestAnimationFrame(animate);
