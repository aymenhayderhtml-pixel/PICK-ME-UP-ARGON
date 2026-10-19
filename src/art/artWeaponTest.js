// src/art/artWeaponTest.js
import * as THREE from 'three';
import {
  createWeaponModel,
  createShieldModel,
  createPickupModel,
  WEAPON_KINDS,
  SHIELD_KINDS
} from './weapons.js';
import { createHeroModel } from './hero.js';
import { PRESETS } from './presets.js';

// Setup Three.js scene
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d131a);

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
const hemiLight = new THREE.HemisphereLight(0xdcebf5, 0x141e28, 1.4);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(6, 14, 8);
scene.add(dirLight);

// Grid floor
const grid = new THREE.GridHelper(24, 24, 0x0284c7, 0x1e293b);
grid.position.y = 0;
scene.add(grid);

// Manual Orbit Camera
let isDragging = false;
let prevPointerX = 0;
let prevPointerY = 0;
let cameraYaw = 0;
let cameraPitch = 0.25;
let cameraDistance = 3.5;
let targetLookAt = new THREE.Vector3(0, 0, 0);
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
  cameraDistance = Math.max(0.4, Math.min(30, cameraDistance * (1 + e.deltaY * 0.001)));
}, { passive: false });

// State
let currentKind = 'sword';
let isShield = false;
let currentGrade = 'E';
let currentMode = 'single'; // 'single', 'pickup', 'lineup', 'gradeLineup'
let showOnHero = false;
let currentPose = 'idle';
let heroAnimTime = 0;

let enhanceVal = 0;
let wearVal = 0.0;
let glowVal = 0.0;
let drawVal = 0.0;
let opacityVal = 1.0;
let tintRed = false;
let showAnchors = false;

let activeModels = []; // array of { model, isPickup, anchorsHelper }
let heroInstance = null;

const HERO_POSE_INFO = {
  idle: { loop: true, duration: 2.0 },
  attack1: { loop: false, duration: 0.5 },
  attack2: { loop: false, duration: 0.5 },
  attack3: { loop: false, duration: 0.5 },
  block: { loop: true, duration: 1.0 },
  trainSword: { loop: true, duration: 1.2 },
  trainSpear: { loop: true, duration: 1.2 },
  trainBow: { loop: true, duration: 1.2 },
  mine: { loop: true, duration: 1.0 }
};

function clearActive() {
  for (const item of activeModels) {
    if (item.anchorsHelper) scene.remove(item.anchorsHelper);
    scene.remove(item.model.group);
    item.model.dispose();
  }
  activeModels = [];

  if (heroInstance) {
    scene.remove(heroInstance.group);
    heroInstance.dispose();
    heroInstance = null;
  }
}

function createAnchorVisualizer(model) {
  const helperGroup = new THREE.Group();
  const colors = {
    grip: 0x22c55e,    // Green
    tip: 0xef4444,     // Red
    edgeBase: 0xeab308,// Yellow
    edgeTip: 0xf97316, // Orange
    hit: 0xd946ef,     // Magenta
    pommel: 0x06b6d4   // Cyan
  };

  const sphereGeo = new THREE.SphereGeometry(0.015, 8, 8);
  for (const [key, anchor] of Object.entries(model.anchors || {})) {
    if (!anchor) continue;
    const col = colors[key] || 0xffffff;
    const mat = new THREE.MeshBasicMaterial({ color: col, wireframe: false });
    const sph = new THREE.Mesh(sphereGeo, mat);
    anchor.add(sph);
  }

  // Edge line
  if (model.anchors?.edgeBase && model.anchors?.edgeTip) {
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffff00 });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0)
    ]);
    const line = new THREE.Line(lineGeo, lineMat);
    line.name = 'anchor_edge_line';
    model.group.add(line);
  }

  helperGroup.visible = showAnchors;
  return helperGroup;
}

function applyModelProps(model) {
  model.setEnhance(enhanceVal);
  model.setWear(wearVal);
  model.setGlow(glowVal);
  model.setDraw(drawVal);
  model.setOpacity(opacityVal);
  if (tintRed) {
    model.setTint(0xff2222, 0.7);
  } else {
    model.setTint(null, 0);
  }
}

function rebuildScene() {
  clearActive();

  if (showOnHero) {
    // Show Han hero holding weapon/shield
    heroInstance = createHeroModel(PRESETS.han || {});
    scene.add(heroInstance.group);

    // Create current weapon in handR
    const wepKind = isShield ? 'sword' : currentKind;
    const wep = createWeaponModel(wepKind, { grade: currentGrade });
    applyModelProps(wep);
    heroInstance.sockets.handR.add(wep.group);
    activeModels.push({ model: wep, isPickup: false });

    // Create shield in handL (if current is shield, or default woodenRound)
    const shKind = isShield ? currentKind : 'woodenRound';
    const sh = createShieldModel(shKind, { grade: currentGrade });
    applyModelProps(sh);
    heroInstance.sockets.handL.add(sh.group);
    activeModels.push({ model: sh, isPickup: false });

    targetLookAt.set(0, 1.0, 0);
    cameraDistance = 2.8;
    return;
  }

  if (currentMode === 'single') {
    const opts = { grade: currentGrade };
    const model = isShield ? createShieldModel(currentKind, opts) : createWeaponModel(currentKind, opts);
    applyModelProps(model);
    scene.add(model.group);

    const helper = createAnchorVisualizer(model);
    scene.add(helper);
    activeModels.push({ model, isPickup: false, anchorsHelper: helper });

    targetLookAt.set(0, 0, 0);
    cameraDistance = isShield ? 1.8 : 2.2;
  } else if (currentMode === 'pickup') {
    const opts = { grade: currentGrade };
    const pickup = createPickupModel(currentKind, opts);
    scene.add(pickup.group);
    activeModels.push({ model: pickup, isPickup: true });

    targetLookAt.set(0, 0.1, 0);
    cameraDistance = 2.0;
  } else if (currentMode === 'lineup') {
    // Show all 9 weapon kinds and 4 shields in a row
    const allKinds = [...WEAPON_KINDS, ...SHIELD_KINDS];
    const spacing = 1.0;
    const startX = -((allKinds.length - 1) * spacing) / 2;

    allKinds.forEach((k, idx) => {
      const isSh = SHIELD_KINDS.includes(k);
      const m = isSh
        ? createShieldModel(k, { grade: currentGrade })
        : createWeaponModel(k, { grade: currentGrade });
      m.group.position.set(startX + idx * spacing, 0, 0);
      applyModelProps(m);
      scene.add(m.group);
      activeModels.push({ model: m, isPickup: false });
    });

    targetLookAt.set(0, 0, 0);
    cameraDistance = 10.0;
  } else if (currentMode === 'gradeLineup') {
    // Show one kind in all 7 grades side by side
    const grades = ['E', 'D', 'C', 'B', 'A', 'S', 'S+'];
    const spacing = 1.1;
    const startX = -((grades.length - 1) * spacing) / 2;

    grades.forEach((g, idx) => {
      const m = isShield
        ? createShieldModel(currentKind, { grade: g })
        : createWeaponModel(currentKind, { grade: g });
      m.group.position.set(startX + idx * spacing, 0, 0);
      applyModelProps(m);
      scene.add(m.group);
      activeModels.push({ model: m, isPickup: false });
    });

    targetLookAt.set(0, 0, 0);
    cameraDistance = 7.0;
  }
}

// UI Setup
function setupUI() {
  const wepContainer = document.getElementById('weapon-buttons');
  WEAPON_KINDS.forEach((k) => {
    const btn = document.createElement('button');
    btn.textContent = k;
    if (k === currentKind && !isShield) btn.classList.add('active');
    btn.addEventListener('click', () => {
      currentKind = k;
      isShield = false;
      document.querySelectorAll('#weapon-buttons button, #shield-buttons button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      rebuildScene();
      updateInfo();
    });
    wepContainer.appendChild(btn);
  });

  const shieldContainer = document.getElementById('shield-buttons');
  SHIELD_KINDS.forEach((k) => {
    const btn = document.createElement('button');
    btn.textContent = k;
    if (k === currentKind && isShield) btn.classList.add('active');
    btn.addEventListener('click', () => {
      currentKind = k;
      isShield = true;
      document.querySelectorAll('#weapon-buttons button, #shield-buttons button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      rebuildScene();
      updateInfo();
    });
    shieldContainer.appendChild(btn);
  });

  document.querySelectorAll('#grade-buttons button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#grade-buttons button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentGrade = btn.dataset.grade;
      rebuildScene();
      updateInfo();
    });
  });

  const modeSingle = document.getElementById('btn-mode-single');
  const modePickup = document.getElementById('btn-mode-pickup');
  const modeLineup = document.getElementById('btn-mode-lineup');
  const modeGradeLineup = document.getElementById('btn-mode-grade-lineup');
  const modeHero = document.getElementById('btn-mode-hero');
  const heroPoseSec = document.getElementById('hero-pose-section');

  function setMode(mode) {
    currentMode = mode;
    showOnHero = false;
    modeSingle.classList.remove('active');
    modePickup.classList.remove('active');
    modeLineup.classList.remove('active');
    modeGradeLineup.classList.remove('active');
    modeHero.classList.remove('active');
    modeHero.textContent = '👤 Show on Hero (Han): OFF';
    heroPoseSec.style.display = 'none';

    if (mode === 'single') modeSingle.classList.add('active');
    if (mode === 'pickup') modePickup.classList.add('active');
    if (mode === 'lineup') modeLineup.classList.add('active');
    if (mode === 'gradeLineup') modeGradeLineup.classList.add('active');

    rebuildScene();
    updateInfo();
  }

  modeSingle.addEventListener('click', () => setMode('single'));
  modePickup.addEventListener('click', () => setMode('pickup'));
  modeLineup.addEventListener('click', () => setMode('lineup'));
  modeGradeLineup.addEventListener('click', () => setMode('gradeLineup'));

  modeHero.addEventListener('click', () => {
    showOnHero = !showOnHero;
    if (showOnHero) {
      modeSingle.classList.remove('active');
      modePickup.classList.remove('active');
      modeLineup.classList.remove('active');
      modeGradeLineup.classList.remove('active');
      modeHero.classList.add('active');
      modeHero.textContent = '👤 Show on Hero (Han): ON';
      heroPoseSec.style.display = 'flex';
    } else {
      setMode('single');
    }
    rebuildScene();
    updateInfo();
  });

  document.querySelectorAll('#pose-buttons button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pose-buttons button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentPose = btn.dataset.pose;
      heroAnimTime = 0;
    });
  });

  document.getElementById('btn-hero-replay').addEventListener('click', () => {
    heroAnimTime = 0;
  });

  // Sliders
  const sEnhance = document.getElementById('slider-enhance');
  sEnhance.addEventListener('input', (e) => {
    enhanceVal = parseInt(e.target.value, 10);
    document.getElementById('enhance-val').textContent = `+${enhanceVal}`;
    activeModels.forEach((i) => !i.isPickup && i.model.setEnhance(enhanceVal));
  });

  const sWear = document.getElementById('slider-wear');
  sWear.addEventListener('input', (e) => {
    wearVal = parseFloat(e.target.value);
    document.getElementById('wear-val').textContent = wearVal.toFixed(2);
    activeModels.forEach((i) => !i.isPickup && i.model.setWear(wearVal));
  });

  const sGlow = document.getElementById('slider-glow');
  sGlow.addEventListener('input', (e) => {
    glowVal = parseFloat(e.target.value);
    document.getElementById('glow-val').textContent = glowVal.toFixed(2);
    activeModels.forEach((i) => !i.isPickup && i.model.setGlow(glowVal));
  });

  const sDraw = document.getElementById('slider-draw');
  sDraw.addEventListener('input', (e) => {
    drawVal = parseFloat(e.target.value);
    document.getElementById('draw-val').textContent = drawVal.toFixed(2);
    activeModels.forEach((i) => !i.isPickup && i.model.setDraw(drawVal));
  });

  const sOpacity = document.getElementById('slider-opacity');
  sOpacity.addEventListener('input', (e) => {
    opacityVal = parseFloat(e.target.value);
    document.getElementById('opacity-val').textContent = opacityVal.toFixed(2);
    activeModels.forEach((i) => !i.isPickup && i.model.setOpacity(opacityVal));
  });

  const btnTint = document.getElementById('btn-tint');
  btnTint.addEventListener('click', () => {
    tintRed = !tintRed;
    btnTint.classList.toggle('active', tintRed);
    btnTint.textContent = tintRed ? 'Tint Red: ON' : 'Tint Red: OFF';
    activeModels.forEach((i) => {
      if (!i.isPickup) {
        if (tintRed) i.model.setTint(0xff2222, 0.7);
        else i.model.setTint(null, 0);
      }
    });
  });

  const btnAnchors = document.getElementById('btn-anchors');
  btnAnchors.addEventListener('click', () => {
    showAnchors = !showAnchors;
    btnAnchors.classList.toggle('active', showAnchors);
    btnAnchors.textContent = showAnchors ? 'Show Anchors: ON' : 'Show Anchors: OFF';
    rebuildScene();
  });

  const btnTurntable = document.getElementById('btn-turntable');
  btnTurntable.addEventListener('click', () => {
    turntableEnabled = !turntableEnabled;
    btnTurntable.classList.toggle('active', turntableEnabled);
    btnTurntable.textContent = turntableEnabled ? 'Turntable: ON' : 'Turntable: OFF';
  });

  document.getElementById('btn-screenshot').addEventListener('click', () => {
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `weapon_${currentKind}_${currentGrade}_${Date.now()}.png`;
    a.click();
  });
}

function updateInfo() {
  const infoEl = document.getElementById('stats-info');
  if (infoEl) {
    const modeName = showOnHero ? 'Hero Preview' : currentMode;
    infoEl.textContent = `Item: ${currentKind} [${currentGrade}] | Mode: ${modeName}`;
  }
}

// Animation loop
let lastTime = performance.now();
let frames = 0;
let lastFpsTime = lastTime;

function animate(currentTime) {
  requestAnimationFrame(animate);

  const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
  lastTime = currentTime;

  // FPS & render stats
  frames++;
  if (currentTime - lastFpsTime >= 500) {
    const fps = Math.round((frames * 1000) / (currentTime - lastFpsTime));
    frames = 0;
    lastFpsTime = currentTime;
    const info = renderer.info.render;
    const statsEl = document.getElementById('stats-fps');
    if (statsEl) {
      statsEl.textContent = `FPS: ${fps} | Calls: ${info.calls} | Triangles: ${info.triangles}`;
    }
  }

  // Camera orbit & turntable
  if (turntableEnabled && !isDragging) {
    cameraYaw += 0.4 * dt;
  }

  const cx = targetLookAt.x + cameraDistance * Math.sin(cameraYaw) * Math.cos(cameraPitch);
  const cy = targetLookAt.y + cameraDistance * Math.sin(cameraPitch);
  const cz = targetLookAt.z + cameraDistance * Math.cos(cameraYaw) * Math.cos(cameraPitch);
  camera.position.set(cx, cy, cz);
  camera.lookAt(targetLookAt);

  // Update hero pose if hero mode
  if (heroInstance) {
    heroAnimTime += dt;
    const pInfo = HERO_POSE_INFO[currentPose] || { loop: true, duration: 1.0 };
    let poseT = heroAnimTime;
    if (!pInfo.loop) {
      const period = pInfo.duration + 0.6;
      const modTime = ((heroAnimTime % period) + period) % period;
      poseT = Math.min(pInfo.duration, modTime);
    }
    heroInstance.setPose(currentPose, poseT);
  }

  // Update edge line if anchors visualizer is present
  for (const item of activeModels) {
    if (!item.isPickup && item.model.update) {
      item.model.update(dt);
    } else if (item.isPickup && item.model.update) {
      item.model.update(dt);
    }

    if (showAnchors && item.model.anchors?.edgeBase && item.model.anchors?.edgeTip) {
      const line = item.model.group.getObjectByName('anchor_edge_line');
      if (line) {
        const p1 = item.model.anchors.edgeBase.position;
        const p2 = item.model.anchors.edgeTip.position;
        line.geometry.setFromPoints([p1, p2]);
      }
    }
  }

  renderer.render(scene, camera);
}

// Initialize
setupUI();
rebuildScene();
updateInfo();
requestAnimationFrame(animate);
