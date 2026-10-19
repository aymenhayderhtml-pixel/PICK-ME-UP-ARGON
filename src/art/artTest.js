import * as THREE from 'three';
import { createHeroModel, HERO_POSES } from './hero.js';
import { PRESETS } from './presets.js';

// Setup Three.js scene
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1c20); // Dark teal

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
const hemiLight = new THREE.HemisphereLight(0xcde8ec, 0x142b30, 1.3);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
dirLight.position.set(6, 12, 8);
scene.add(dirLight);

// Grid floor
const grid = new THREE.GridHelper(24, 24, 0x26c6da, 0x143e47);
grid.position.y = 0;
scene.add(grid);

// Manual Orbit Camera
let isDragging = false;
let prevPointerX = 0;
let prevPointerY = 0;
let cameraYaw = 0;
let cameraPitch = 0.25;
let cameraDistance = 4.2;
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

// Pose Durations & Animation Timing
const ONE_SHOT_DURATIONS = {
  attack1: 0.5,
  attack2: 0.5,
  attack3: 0.5,
  roll: 0.4,
  hit: 0.25,
  death: 1.6,
};

let activeHeroes = [];
let currentPose = 'idle';
let currentExpression = 'neutral';
let currentArmor = 'none';
let currentOutline = true;
let currentOpacity = 1.0;
let currentTint = false;
let currentPresetName = 'han';
let isGridMode = false;

// Playback controls
let animTime = 0;
let playbackSpeed = 1.0;
let isFrozen = false;
let freezeT = 0.0;

function computePoseT(poseName, localTime) {
  if (isFrozen) return freezeT;
  const dur = ONE_SHOT_DURATIONS[poseName];
  if (dur !== undefined) {
    const period = dur + 0.6;
    const modTime = ((localTime % period) + period) % period;
    return Math.min(dur, modTime);
  }
  return Math.max(0, localTime);
}

function buildOptsFromPreset(presetKey) {
  const p = PRESETS[presetKey] || PRESETS.han;
  return JSON.parse(JSON.stringify(p));
}

function getRandomOpts() {
  const seeds = Math.floor(Math.random() * 999999);
  const builds = ['slim', 'average', 'stocky', 'muscular'];
  const faceStyles = ['neutral', 'stern', 'young', 'old', 'fierce'];
  const hairStyles = ['spiky', 'short', 'long', 'braid', 'ponytail', 'bowl', 'bald', 'messy'];
  const tops = ['shirt', 'shirtRolled', 'tunic', 'vest', 'robe'];
  const hairs = [0x181619, 0x2c221e, 0x4a3222, 0xc85a32, 0xd6b46c, 0x7a7d82, 0x3b2e28];
  const skins = [0xf2d3be, 0xe8be9e, 0xd9a17c, 0xba7d57, 0x845236, 0xf7dfce];

  return {
    seed: seeds,
    heightScale: 0.9 + Math.random() * 0.2,
    build: builds[Math.floor(Math.random() * builds.length)],
    faceStyle: faceStyles[Math.floor(Math.random() * faceStyles.length)],
    skinTone: skins[Math.floor(Math.random() * skins.length)],
    hair: {
      style: hairStyles[Math.floor(Math.random() * hairStyles.length)],
      color: hairs[Math.floor(Math.random() * hairs.length)],
    },
    outfit: {
      top: tops[Math.floor(Math.random() * tops.length)],
      topColor: Math.floor(Math.random() * 0xffffff),
      vestColor: Math.floor(Math.random() * 0xffffff),
      bottom: 'trousers',
      bottomColor: Math.floor(Math.random() * 0x444444),
      bootsColor: Math.floor(Math.random() * 0x333333),
    },
    outline: currentOutline,
  };
}

function applyStateToHero(heroEntry) {
  const { model } = heroEntry;
  model.setExpression(currentExpression);

  if (currentArmor === 'none') {
    model.setArmor(null);
  } else {
    model.setArmor({ type: currentArmor });
  }

  model.setOutlineVisible(currentOutline);
  model.setOpacity(currentOpacity);
  model.setTint(currentTint ? 0xff2222 : null, currentTint ? 0.75 : 0);
}

function clearHeroes() {
  activeHeroes.forEach((h) => {
    scene.remove(h.model.group);
    h.model.dispose();
  });
  activeHeroes = [];
}

function spawnSingleHero(opts) {
  clearHeroes();
  isGridMode = false;
  cameraDistance = 4.2;
  targetLookAt.set(0, 0.85, 0);

  const model = createHeroModel(opts);
  scene.add(model.group);
  const heroEntry = { model, phase: 0 };
  activeHeroes.push(heroEntry);
  applyStateToHero(heroEntry);
  animTime = 0;
}

function spawn30Grid() {
  clearHeroes();
  isGridMode = true;
  cameraDistance = 14.0;
  targetLookAt.set(0, 0.85, 0);

  const cols = 6;
  const rows = 5;
  const spacingX = 1.9;
  const spacingZ = 1.9;
  const startX = -((cols - 1) * spacingX) / 2;
  const startZ = -((rows - 1) * spacingZ) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const opts = getRandomOpts();
      const model = createHeroModel(opts);
      model.group.position.set(startX + c * spacingX, 0, startZ + r * spacingZ);
      scene.add(model.group);

      const heroEntry = {
        model,
        phase: Math.random() * 10,
      };
      applyStateToHero(heroEntry);
      activeHeroes.push(heroEntry);
    }
  }
  animTime = 0;
}

// Build UI
function initUI() {
  // Presets
  const presetContainer = document.getElementById('preset-buttons');
  const presetKeys = [
    { key: 'han', label: 'Han' },
    { key: 'jenna', label: 'Jenna' },
    { key: 'aaron', label: 'Aaron' },
    { key: 'novice1', label: 'Novice 1' },
    { key: 'novice2', label: 'Novice 2' },
    { key: 'novice3', label: 'Novice 3' },
    { key: 'novice4', label: 'Novice 4' },
  ];

  presetKeys.forEach(({ key, label }) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    if (key === currentPresetName) btn.classList.add('active');
    btn.addEventListener('click', () => {
      document.querySelectorAll('#preset-buttons button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentPresetName = key;
      spawnSingleHero(buildOptsFromPreset(key));
    });
    presetContainer.appendChild(btn);
  });

  // Random Look
  document.getElementById('btn-random').addEventListener('click', () => {
    document.querySelectorAll('#preset-buttons button').forEach((b) => b.classList.remove('active'));
    spawnSingleHero(getRandomOpts());
  });

  // Spawn Mode
  const btnSingle = document.getElementById('btn-single');
  const btnSpawn30 = document.getElementById('btn-spawn30');

  btnSingle.addEventListener('click', () => {
    btnSingle.classList.add('active');
    btnSpawn30.classList.remove('active');
    spawnSingleHero(buildOptsFromPreset(currentPresetName));
  });

  btnSpawn30.addEventListener('click', () => {
    btnSpawn30.classList.add('active');
    btnSingle.classList.remove('active');
    spawn30Grid();
  });

  // Poses
  const poseContainer = document.getElementById('pose-buttons');
  HERO_POSES.forEach((poseName) => {
    const btn = document.createElement('button');
    btn.textContent = poseName;
    if (poseName === currentPose) btn.classList.add('active');
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pose-buttons button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentPose = poseName;
      animTime = 0; // Replay from start
    });
    poseContainer.appendChild(btn);
  });

  // Replay Button
  const btnReplay = document.getElementById('btn-replay');
  btnReplay.addEventListener('click', () => {
    animTime = 0;
    if (isFrozen) {
      isFrozen = false;
      const btnFreezeToggle = document.getElementById('btn-freeze-toggle');
      if (btnFreezeToggle) {
        btnFreezeToggle.textContent = 'Freeze: OFF';
        btnFreezeToggle.classList.remove('active');
      }
    }
  });

  // Speed Slider
  const sliderSpeed = document.getElementById('slider-speed');
  const speedVal = document.getElementById('speed-val');
  sliderSpeed.addEventListener('input', () => {
    playbackSpeed = parseFloat(sliderSpeed.value);
    speedVal.textContent = `${playbackSpeed.toFixed(2)}x`;
  });

  // Freeze Toggle & Slider
  const btnFreezeToggle = document.getElementById('btn-freeze-toggle');
  const sliderFreeze = document.getElementById('slider-freeze');
  const freezeVal = document.getElementById('freeze-val');

  btnFreezeToggle.addEventListener('click', () => {
    isFrozen = !isFrozen;
    if (isFrozen) {
      freezeT = parseFloat(sliderFreeze.value);
    }
    btnFreezeToggle.textContent = isFrozen ? 'Freeze: ON' : 'Freeze: OFF';
    btnFreezeToggle.classList.toggle('active', isFrozen);
  });

  sliderFreeze.addEventListener('input', () => {
    freezeT = parseFloat(sliderFreeze.value);
    freezeVal.textContent = `${freezeT.toFixed(2)}s`;
    isFrozen = true;
    btnFreezeToggle.textContent = 'Freeze: ON';
    btnFreezeToggle.classList.add('active');
  });

  // Expressions
  const expContainer = document.getElementById('expression-buttons');
  const expressions = ['neutral', 'angry', 'afraid', 'pain', 'dead', 'happy'];
  expressions.forEach((exp) => {
    const btn = document.createElement('button');
    btn.textContent = exp;
    if (exp === currentExpression) btn.classList.add('active');
    btn.addEventListener('click', () => {
      document.querySelectorAll('#expression-buttons button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentExpression = exp;
      activeHeroes.forEach((h) => h.model.setExpression(exp));
    });
    expContainer.appendChild(btn);
  });

  // Armor
  const armorBtns = document.querySelectorAll('#armor-buttons button');
  armorBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      armorBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentArmor = btn.getAttribute('data-armor');
      activeHeroes.forEach((h) => {
        if (currentArmor === 'none') h.model.setArmor(null);
        else h.model.setArmor({ type: currentArmor });
      });
    });
  });

  // Outline Toggle
  const btnOutline = document.getElementById('btn-outline');
  btnOutline.addEventListener('click', () => {
    currentOutline = !currentOutline;
    btnOutline.textContent = `Outline: ${currentOutline ? 'ON' : 'OFF'}`;
    btnOutline.classList.toggle('active', currentOutline);
    activeHeroes.forEach((h) => h.model.setOutlineVisible(currentOutline));
  });

  // Turntable Toggle
  const btnTurntable = document.getElementById('btn-turntable');
  btnTurntable.addEventListener('click', () => {
    turntableEnabled = !turntableEnabled;
    btnTurntable.textContent = `Turntable: ${turntableEnabled ? 'ON' : 'OFF'}`;
    btnTurntable.classList.toggle('active', turntableEnabled);
  });

  // Close-up face Button
  const btnCloseup = document.getElementById('btn-closeup');
  btnCloseup.addEventListener('click', () => {
    if (activeHeroes.length === 0) return;
    const hero = activeHeroes[0].model;
    const headWorldPos = new THREE.Vector3();
    hero.parts.head.getWorldPosition(headWorldPos);

    targetLookAt.copy(headWorldPos);
    targetLookAt.y -= 0.02; // focus on eye/face level
    cameraDistance = 1.2;
    cameraPitch = 0.04;
    cameraYaw = 0; // Face front
    turntableEnabled = false;
    btnTurntable.textContent = 'Turntable: OFF';
    btnTurntable.classList.remove('active');
  });

  // Screenshot Button
  const btnScreenshot = document.getElementById('btn-screenshot');
  btnScreenshot.addEventListener('click', () => {
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = `pickmeup_${currentPresetName}_${currentPose}_${Date.now()}.png`;
    a.href = dataUrl;
    a.click();
  });

  // Tint Toggle
  const btnTint = document.getElementById('btn-tint');
  btnTint.addEventListener('click', () => {
    currentTint = !currentTint;
    btnTint.textContent = `Tint Red: ${currentTint ? 'ON' : 'OFF'}`;
    btnTint.classList.toggle('active', currentTint);
    activeHeroes.forEach((h) => h.model.setTint(currentTint ? 0xff2222 : null, currentTint ? 0.75 : 0));
  });

  // Opacity Slider
  const sliderOpacity = document.getElementById('slider-opacity');
  const opacityVal = document.getElementById('opacity-val');
  sliderOpacity.addEventListener('input', () => {
    currentOpacity = parseFloat(sliderOpacity.value);
    opacityVal.textContent = currentOpacity.toFixed(2);
    activeHeroes.forEach((h) => h.model.setOpacity(currentOpacity));
  });
}

// Initial Spawn
initUI();
spawnSingleHero(buildOptsFromPreset('han'));

// Animation & Render Loop
let lastTime = performance.now();
let frameCount = 0;
let lastFpsTime = performance.now();
let fpsDisplay = 60;
const statsFps = document.getElementById('stats-fps');
const statsPose = document.getElementById('stats-pose');

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = Math.min(0.1, (now - lastTime) * 0.001);
  lastTime = now;

  if (!isFrozen) {
    animTime += delta * playbackSpeed;
  }

  // FPS calculation
  frameCount++;
  if (now - lastFpsTime >= 500) {
    fpsDisplay = Math.round((frameCount * 1000) / (now - lastFpsTime));
    frameCount = 0;
    lastFpsTime = now;
  }

  // Turntable rotation
  if (turntableEnabled && !isDragging) {
    cameraYaw += delta * 0.35;
  }

  // Camera Orbit position
  const cosPitch = Math.cos(cameraPitch);
  const sinPitch = Math.sin(cameraPitch);
  const sinYaw = Math.sin(cameraYaw);
  const cosYaw = Math.cos(cameraYaw);

  camera.position.set(
    targetLookAt.x + cameraDistance * cosPitch * sinYaw,
    targetLookAt.y + cameraDistance * sinPitch,
    targetLookAt.z + cameraDistance * cosPitch * cosYaw
  );
  camera.lookAt(targetLookAt);

  // Update Hero Poses
  let primaryPoseT = 0;
  for (let i = 0; i < activeHeroes.length; i++) {
    const h = activeHeroes[i];
    const heroLocalTime = animTime + h.phase;
    const poseT = computePoseT(currentPose, heroLocalTime);
    if (i === 0) primaryPoseT = poseT;
    h.model.setPose(currentPose, poseT, 1.0);
  }

  renderer.render(scene, camera);

  // Update Stats & Pose HUD
  if (statsFps) {
    const calls = renderer.info.render.calls;
    const triangles = renderer.info.render.triangles;
    statsFps.textContent = `FPS: ${fpsDisplay} | Calls: ${calls} | Triangles: ${triangles.toLocaleString()}`;
  }

  if (statsPose) {
    const dur = ONE_SHOT_DURATIONS[currentPose];
    let tText = `t: ${primaryPoseT.toFixed(2)}s`;
    if (dur !== undefined) {
      tText += ` / ${dur.toFixed(2)}s`;
    }
    if (isFrozen) {
      tText += ' [FROZEN]';
    }
    statsPose.textContent = `Pose: ${currentPose} | ${tText}`;
  }
}

animate();
