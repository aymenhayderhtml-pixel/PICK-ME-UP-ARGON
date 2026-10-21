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
import { getPoseCycleDuration, getAttackSpec, WEAPON_ANIMATIONS } from './weaponAnimations.js';
import { SlashTrail } from '../fx/SlashTrail.js';
import { ArrowPool } from '../combat/ArrowPool.js';

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
let isSlowMo = false;
let isAimCam = false;

// Projectile Engine & Trajectory Preview
const arrowPool = new ArrowPool(scene);

const trajPointsCount = 35;
const trajPositions = new Float32Array(trajPointsCount * 3);
const trajGeom = new THREE.BufferGeometry();
trajGeom.setAttribute('position', new THREE.BufferAttribute(trajPositions, 3));
const trajMat = new THREE.LineDashedMaterial({
  color: 0x38bdf8,
  dashSize: 0.12,
  gapSize: 0.06,
  transparent: true,
  opacity: 0.75
});
const trajLine = new THREE.Line(trajGeom, trajMat);
trajLine.visible = false;
scene.add(trajLine);

function updateTrajectoryPreview(startPos, velocity) {
  const g = new THREE.Vector3(0, -9.81, 0);
  const pos = new THREE.Vector3();
  for (let i = 0; i < trajPointsCount; i++) {
    const t = i * 0.035;
    pos.copy(startPos).addScaledVector(velocity, t).addScaledVector(g, 0.5 * t * t);
    trajPositions[i * 3 + 0] = pos.x;
    trajPositions[i * 3 + 1] = Math.max(0, pos.y);
    trajPositions[i * 3 + 2] = pos.z;
    if (pos.y <= 0 && i > 0) {
      for (let j = i; j < trajPointsCount; j++) {
        trajPositions[j * 3 + 0] = pos.x;
        trajPositions[j * 3 + 1] = 0;
        trajPositions[j * 3 + 2] = pos.z;
      }
      break;
    }
  }
  trajLine.geometry.attributes.position.needsUpdate = true;
  trajLine.computeLineDistances();
  trajLine.visible = true;
}

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
let showGripDebug = false;

const palmDebugSphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.024, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0x22c55e, wireframe: true })
);
palmDebugSphere.visible = false;
scene.add(palmDebugSphere);

const gripDebugSphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.020, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xef4444 })
);
gripDebugSphere.visible = false;
scene.add(gripDebugSphere);

const _vPalmDebug = new THREE.Vector3();
const _vGripDebug = new THREE.Vector3();

let activeModels = []; // array of { model, isPickup, anchorsHelper }
let heroInstance = null;
let liveSlashTrail = null;

function clearActive() {
  if (liveSlashTrail) {
    liveSlashTrail.dispose();
    liveSlashTrail = null;
  }

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
  if (!model) return;
  if (model.setEnhance) model.setEnhance(enhanceVal);
  if (model.setWear) model.setWear(wearVal);
  if (model.setGlow) model.setGlow(glowVal);
  if (model.setDraw) model.setDraw(drawVal);
  if (model.setOpacity) model.setOpacity(opacityVal);
  if (tintRed) {
    if (model.setTint) model.setTint(0xff2222, 0.7);
  } else {
    if (model.setTint) model.setTint(null, 0);
  }
}

function rebuildScene() {
  clearActive();

  if (showOnHero) {
    // Show Han hero holding weapon/shield
    heroInstance = createHeroModel(PRESETS.han || {});
    scene.add(heroInstance.group);

    const wepKind = isShield ? 'sword' : currentKind;
    const is2H = ['greatsword', 'spear', 'staff', 'bow'].includes(wepKind);
    const wep = createWeaponModel(wepKind, { grade: currentGrade });
    applyModelProps(wep);

    const wepSocket = wepKind === 'staff'
      ? (heroInstance.sockets.staffHand || heroInstance.sockets.handR)
      : (wepKind === 'bow' ? heroInstance.sockets.handL : heroInstance.sockets.handR);
    wepSocket.add(wep.group);
    activeModels.push({ model: wep, isPickup: false });

    heroInstance.userData.equippedWeaponKind = wepKind;

    // Create shield in handL (only if 1-handed melee weapon)
    let shKind = null;
    if (!is2H) {
      shKind = isShield ? currentKind : 'woodenRound';
      const sh = createShieldModel(shKind, { grade: currentGrade });
      applyModelProps(sh);
      heroInstance.sockets.handL.add(sh.group);
      activeModels.push({ model: sh, isPickup: false });
    }
    heroInstance.userData.equippedShieldKind = shKind;

    // Live Slash Trail for hero
    liveSlashTrail = new SlashTrail(scene, wep);
    liveSlashTrail.setWeaponModel(wep, currentGrade);

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

  document.querySelectorAll('#pose-buttons button, #archery-panel button[data-pose]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pose-buttons button, #archery-panel button[data-pose]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentPose = btn.dataset.pose;
      heroAnimTime = 0;
    });
  });

  document.getElementById('btn-hero-replay').addEventListener('click', () => {
    heroAnimTime = 0;
  });

  // Archery Debug Controls
  const btnSlowMo = document.getElementById('btn-slowmo');
  if (btnSlowMo) {
    btnSlowMo.addEventListener('click', () => {
      isSlowMo = !isSlowMo;
      btnSlowMo.classList.toggle('active', isSlowMo);
      btnSlowMo.textContent = isSlowMo ? 'Slow-Mo: ON' : 'Slow-Mo: OFF';
    });
  }

  const btnAimCam = document.getElementById('btn-aim-cam');
  if (btnAimCam) {
    btnAimCam.addEventListener('click', () => {
      isAimCam = !isAimCam;
      btnAimCam.classList.toggle('active', isAimCam);
      btnAimCam.textContent = isAimCam ? 'Aim Cam: ON' : 'Aim Cam: OFF';
      if (isAimCam) {
        turntableEnabled = false;
        document.getElementById('btn-turntable')?.classList.remove('active');
        const b = document.getElementById('btn-turntable');
        if (b) b.textContent = 'Turntable: OFF';
        cameraYaw = 0;
        cameraPitch = 0.08;
        cameraDistance = 2.4;
        targetLookAt.set(0.40, 1.25, 0);
      } else {
        targetLookAt.set(0, 1.0, 0);
        cameraDistance = 2.8;
      }
    });
  }

  const btnFire = document.getElementById('btn-fire-arrow');
  if (btnFire) {
    btnFire.addEventListener('click', () => {
      const equippedWep = activeModels.find(m => m.model && m.model.getArrowWorldTransform);
      const origin = new THREE.Vector3();
      const direction = new THREE.Vector3(0, 0, 1);

      if (equippedWep && equippedWep.model) {
        const dummyQuat = new THREE.Quaternion();
        equippedWep.model.getArrowWorldTransform(origin, dummyQuat);
        direction.set(0, 0, 1).applyQuaternion(dummyQuat).normalize();
      } else if (heroInstance) {
        origin.copy(heroInstance.group.position).add(new THREE.Vector3(0, 1.25, 0.25));
        direction.set(0, 0, 1);
      } else {
        origin.set(0, 1.2, 0);
        direction.set(0, 0, 1);
      }

      const effDraw = drawVal > 0.05 ? drawVal : 1.0;
      const spawned = arrowPool.spawnArrow({
        position: origin,
        direction: direction,
        drawAmount: effDraw,
        grade: currentGrade,
        damage: 15
      });

      if (spawned) {
        updateTrajectoryPreview(origin, spawned.velocity);
      }

      // Quick visual loose recoil on equipped bow
      if (equippedWep && equippedWep.model) {
        equippedWep.model.setDraw(0, false, 0.02);
      }
    });
  }

  // Sliders
  const sEnhance = document.getElementById('slider-enhance');
  sEnhance.addEventListener('input', (e) => {
    enhanceVal = parseInt(e.target.value, 10);
    document.getElementById('enhance-val').textContent = `+${enhanceVal}`;
    activeModels.forEach((i) => !i.isPickup && i.model.setEnhance && i.model.setEnhance(enhanceVal));
  });

  const sWear = document.getElementById('slider-wear');
  sWear.addEventListener('input', (e) => {
    wearVal = parseFloat(e.target.value);
    document.getElementById('wear-val').textContent = wearVal.toFixed(2);
    activeModels.forEach((i) => !i.isPickup && i.model.setWear && i.model.setWear(wearVal));
  });

  const sGlow = document.getElementById('slider-glow');
  sGlow.addEventListener('input', (e) => {
    glowVal = parseFloat(e.target.value);
    document.getElementById('glow-val').textContent = glowVal.toFixed(2);
    activeModels.forEach((i) => !i.isPickup && i.model.setGlow && i.model.setGlow(glowVal));
  });

  const sDraw = document.getElementById('slider-draw');
  sDraw.addEventListener('input', (e) => {
    drawVal = parseFloat(e.target.value);
    document.getElementById('draw-val').textContent = drawVal.toFixed(2);
    activeModels.forEach((i) => !i.isPickup && i.model.setDraw && i.model.setDraw(drawVal));
    if (showOnHero) {
      currentPose = 'aim';
      heroAnimTime = 0;
    }
  });

  const sOpacity = document.getElementById('slider-opacity');
  sOpacity.addEventListener('input', (e) => {
    opacityVal = parseFloat(e.target.value);
    document.getElementById('opacity-val').textContent = opacityVal.toFixed(2);
    activeModels.forEach((i) => !i.isPickup && i.model.setOpacity && i.model.setOpacity(opacityVal));
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

  const btnGripDebug = document.getElementById('btn-grip-debug');
  const statsGrip = document.getElementById('stats-grip-debug');
  if (btnGripDebug) {
    btnGripDebug.addEventListener('click', () => {
      showGripDebug = !showGripDebug;
      btnGripDebug.classList.toggle('active', showGripDebug);
      btnGripDebug.textContent = showGripDebug ? 'Grip Debug: ON' : 'Grip Debug: OFF';
      palmDebugSphere.visible = showGripDebug;
      gripDebugSphere.visible = showGripDebug;
      if (statsGrip) statsGrip.style.display = showGripDebug ? 'block' : 'none';
      if (showGripDebug && !showOnHero) {
        currentKind = 'staff';
        isShield = false;
        modeHero.click();
      }
    });
  }

  const btnTurntable = document.getElementById('btn-turntable');
  btnTurntable.addEventListener('click', () => {
    turntableEnabled = !turntableEnabled;
    btnTurntable.classList.toggle('active', turntableEnabled);
    btnTurntable.textContent = turntableEnabled ? 'Turntable: ON' : 'Turntable: OFF';
  });

  const btnCamFront = document.getElementById('btn-cam-front');
  if (btnCamFront) {
    btnCamFront.addEventListener('click', () => {
      turntableEnabled = false;
      btnTurntable.classList.remove('active');
      btnTurntable.textContent = 'Turntable: OFF';
      cameraYaw = 0;
      cameraPitch = 0.10;
      cameraDistance = 2.8;
      targetLookAt.set(0, 1.0, 0);
    });
  }

  const btnCamSide = document.getElementById('btn-cam-side');
  if (btnCamSide) {
    btnCamSide.addEventListener('click', () => {
      turntableEnabled = false;
      btnTurntable.classList.remove('active');
      btnTurntable.textContent = 'Turntable: OFF';
      cameraYaw = Math.PI * 0.5;
      cameraPitch = 0.10;
      cameraDistance = 2.8;
      targetLookAt.set(0, 1.0, 0);
    });
  }

  const btnCamBack = document.getElementById('btn-cam-back');
  if (btnCamBack) {
    btnCamBack.addEventListener('click', () => {
      turntableEnabled = false;
      btnTurntable.classList.remove('active');
      btnTurntable.textContent = 'Turntable: OFF';
      cameraYaw = Math.PI;
      cameraPitch = 0.10;
      cameraDistance = 2.8;
      targetLookAt.set(0, 1.0, 0);
    });
  }

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

  const rawDt = Math.min(0.1, (currentTime - lastTime) / 1000);
  lastTime = currentTime;
  const dt = isSlowMo ? rawDt * 0.1 : rawDt;

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
    const wepKind = heroInstance.userData.equippedWeaponKind || 'sword';
    const shKind = heroInstance.userData.equippedShieldKind || null;
    const cycleDuration = getPoseCycleDuration(currentPose, wepKind);

    const isLoop = currentPose === 'idle' || currentPose === 'walk' || currentPose === 'run' ||
                   currentPose === 'block' || currentPose === 'comboLoop' || currentPose.startsWith('train') || currentPose === 'mine' ||
                   currentPose.startsWith('staff') ||
                   currentPose === 'aimReady' || currentPose === 'reach' || currentPose === 'nock' || currentPose === 'raise' || currentPose === 'fullDraw' || currentPose === 'release' || currentPose === 'vibrate';
    let poseT = heroAnimTime;
    if (!isLoop) {
      const period = cycleDuration + 0.4;
      const modTime = ((heroAnimTime % period) + period) % period;
      poseT = Math.min(cycleDuration, modTime);
    } else {
      poseT = ((heroAnimTime % cycleDuration) + cycleDuration) % cycleDuration;
    }

    heroInstance.setPose(currentPose, poseT, 1, {
      weaponKind: wepKind,
      shieldKind: shKind,
      dt,
      bowDraw: currentPose === 'aim' ? drawVal : undefined
    });

    const equippedBow = activeModels.find(m => m.model && m.model.setDraw);
    if (equippedBow && (heroInstance.userData.bowState || heroInstance.parts?.root?.userData?.bowState)) {
      const bs = heroInstance.userData.bowState || heroInstance.parts.root.userData.bowState;
      equippedBow.model.setDraw(bs.drawAmount, bs.arrowVisible, bs.vibTime);
    }

    if (liveSlashTrail) {
      let inActiveWindow = false;
      if (currentPose === 'attack1' || currentPose === 'attack2' || currentPose === 'attack3') {
        const spec = getAttackSpec(wepKind, currentPose);
        if (spec && spec.trailWindow) {
          inActiveWindow = poseT >= spec.trailWindow[0] && poseT <= spec.trailWindow[1];
        }
      } else if (currentPose === 'comboLoop') {
        const a1 = getAttackSpec(wepKind, 'attack1');
        const a2 = getAttackSpec(wepKind, 'attack2');
        const a3 = getAttackSpec(wepKind, 'attack3');
        if (a1 && a2 && a3) {
          const d1 = a1.duration;
          const d2 = a2.duration;
          const d3 = a3.duration;
          if (poseT < d1) {
            inActiveWindow = poseT >= a1.trailWindow[0] && poseT <= a1.trailWindow[1];
          } else if (poseT < d1 + d2) {
            const subT = poseT - d1;
            inActiveWindow = subT >= a2.trailWindow[0] && subT <= a2.trailWindow[1];
          } else if (poseT < d1 + d2 + d3) {
            const subT = poseT - d1 - d2;
            inActiveWindow = subT >= a3.trailWindow[0] && subT <= a3.trailWindow[1];
          }
        }
      }

      if (inActiveWindow) {
        liveSlashTrail.start();
      } else {
        liveSlashTrail.stop();
      }
      liveSlashTrail.update(dt, camera, heroInstance.group.position);
    }

    if (showGripDebug) {
      const palmSocket = heroInstance.sockets.staffHand || heroInstance.sockets.handR;
      palmSocket.getWorldPosition(_vPalmDebug);
      palmDebugSphere.position.copy(_vPalmDebug);
      palmDebugSphere.visible = true;

      const equippedStaff = activeModels.find(m => m.model?.anchors?.staffGrip);
      if (equippedStaff && equippedStaff.model) {
        equippedStaff.model.group.localToWorld(_vGripDebug.set(...equippedStaff.model.anchors.staffGrip));
        gripDebugSphere.position.copy(_vGripDebug);
        gripDebugSphere.visible = true;

        const dist = _vPalmDebug.distanceTo(_vGripDebug);
        const statsGrip = document.getElementById('stats-grip-debug');
        if (statsGrip) {
          const pass = dist < 0.02;
          statsGrip.textContent = `Palm-to-StaffGrip Dist: ${dist.toFixed(4)}m (${pass ? 'PASS < 0.02' : 'FAIL >= 0.02'}) [Pose: ${currentPose}]`;
          statsGrip.style.color = pass ? '#4ade80' : '#ef4444';
        }
      }
    } else {
      palmDebugSphere.visible = false;
      gripDebugSphere.visible = false;
    }
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

  // Update ballistic projectiles
  arrowPool.update(dt, { dungeon: null, enemies: [] });

  renderer.render(scene, camera);
}

// Initialize
setupUI();
rebuildScene();
updateInfo();
requestAnimationFrame(animate);
