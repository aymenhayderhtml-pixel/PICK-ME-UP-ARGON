import * as THREE from 'three';
import { WEAPON_KINDS, SHIELD_KINDS } from './weapons.js';

const _trajGravity = new THREE.Vector3(0, -9.81, 0);
const _trajPos = new THREE.Vector3();
const _fireOrigin = new THREE.Vector3();
const _fireDir = new THREE.Vector3();
const _fireDummyQuat = new THREE.Quaternion();

export function createTrajectoryPreview(scene) {
  const trajPointsCount = 35;
  const trajPositions = new Float32Array(trajPointsCount * 3);
  const trajGeom = new THREE.BufferGeometry();
  trajGeom.setAttribute('position', new THREE.BufferAttribute(trajPositions, 3));
  const trajMat = new THREE.LineDashedMaterial({
    color: 0x38bdf8,
    dashSize: 0.12,
    gapSize: 0.06,
    transparent: true,
    opacity: 0.75,
  });
  const trajLine = new THREE.Line(trajGeom, trajMat);
  trajLine.visible = false;
  scene.add(trajLine);

  function updateTrajectoryPreview(startPos, velocity) {
    for (let i = 0; i < trajPointsCount; i++) {
      const t = i * 0.035;
      _trajPos.copy(startPos).addScaledVector(velocity, t).addScaledVector(_trajGravity, 0.5 * t * t);
      trajPositions[i * 3 + 0] = _trajPos.x;
      trajPositions[i * 3 + 1] = Math.max(0, _trajPos.y);
      trajPositions[i * 3 + 2] = _trajPos.z;
      if (_trajPos.y <= 0 && i > 0) {
        for (let j = i; j < trajPointsCount; j++) {
          trajPositions[j * 3 + 0] = _trajPos.x;
          trajPositions[j * 3 + 1] = 0;
          trajPositions[j * 3 + 2] = _trajPos.z;
        }
        break;
      }
    }
    trajLine.geometry.attributes.position.needsUpdate = true;
    trajLine.computeLineDistances();
    trajLine.visible = true;
  }

  return { trajLine, updateTrajectoryPreview };
}

export function createAnchorVisualizer(model, showAnchors) {
  const helperGroup = new THREE.Group();
  const colors = {
    grip: 0x22c55e,
    tip: 0xef4444,
    edgeBase: 0xeab308,
    edgeTip: 0xf97316,
    hit: 0xd946ef,
    pommel: 0x06b6d4,
  };

  const sphereGeo = new THREE.SphereGeometry(0.015, 8, 8);
  for (const [key, anchor] of Object.entries(model.anchors || {})) {
    if (!anchor) continue;
    const col = colors[key] || 0xffffff;
    const mat = new THREE.MeshBasicMaterial({ color: col, wireframe: false });
    const sph = new THREE.Mesh(sphereGeo, mat);
    anchor.add(sph);
  }

  if (model.anchors?.edgeBase && model.anchors?.edgeTip) {
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffff00 });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    const line = new THREE.Line(lineGeo, lineMat);
    line.name = 'anchor_edge_line';
    model.group.add(line);
  }

  helperGroup.visible = showAnchors;
  return helperGroup;
}

export function applyModelProps(model, state) {
  if (!model) return;
  if (model.setEnhance) model.setEnhance(state.enhanceVal);
  if (model.setWear) model.setWear(state.wearVal);
  if (model.setGlow) model.setGlow(state.glowVal);
  if (model.setDraw) model.setDraw(state.drawVal);
  if (model.setOpacity) model.setOpacity(state.opacityVal);
  if (state.tintRed) {
    if (model.setTint) model.setTint(0xff2222, 0.7);
  } else {
    if (model.setTint) model.setTint(null, 0);
  }
}

export function updateInfo(state) {
  const infoEl = document.getElementById('stats-info');
  if (infoEl) {
    const modeName = state.showOnHero ? 'Hero Preview' : state.currentMode;
    infoEl.textContent = `Item: ${state.currentKind} [${state.currentGrade}] | Mode: ${modeName}`;
  }
}

export function setupWeaponTestUI({
  state,
  rebuildScene,
  arrowPool,
  updateTrajectoryPreview,
  palmDebugSphere,
  gripDebugSphere,
  renderer,
  scene,
  camera,
}) {
  const wepContainer = document.getElementById('weapon-buttons');
  WEAPON_KINDS.forEach((k) => {
    const btn = document.createElement('button');
    btn.textContent = k;
    if (k === state.currentKind && !state.isShield) btn.classList.add('active');
    btn.addEventListener('click', () => {
      state.currentKind = k;
      state.isShield = false;
      document.querySelectorAll('#weapon-buttons button, #shield-buttons button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      rebuildScene();
      updateInfo(state);
    });
    wepContainer.appendChild(btn);
  });

  const shieldContainer = document.getElementById('shield-buttons');
  SHIELD_KINDS.forEach((k) => {
    const btn = document.createElement('button');
    btn.textContent = k;
    if (k === state.currentKind && state.isShield) btn.classList.add('active');
    btn.addEventListener('click', () => {
      state.currentKind = k;
      state.isShield = true;
      document.querySelectorAll('#weapon-buttons button, #shield-buttons button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      rebuildScene();
      updateInfo(state);
    });
    shieldContainer.appendChild(btn);
  });

  document.querySelectorAll('#grade-buttons button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#grade-buttons button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentGrade = btn.dataset.grade;
      rebuildScene();
      updateInfo(state);
    });
  });

  const modeSingle = document.getElementById('btn-mode-single');
  const modePickup = document.getElementById('btn-mode-pickup');
  const modeLineup = document.getElementById('btn-mode-lineup');
  const modeGradeLineup = document.getElementById('btn-mode-grade-lineup');
  const modeHero = document.getElementById('btn-mode-hero');
  const heroPoseSec = document.getElementById('hero-pose-section');

  function setMode(mode) {
    state.currentMode = mode;
    state.showOnHero = false;
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
    updateInfo(state);
  }

  modeSingle.addEventListener('click', () => setMode('single'));
  modePickup.addEventListener('click', () => setMode('pickup'));
  modeLineup.addEventListener('click', () => setMode('lineup'));
  modeGradeLineup.addEventListener('click', () => setMode('gradeLineup'));

  modeHero.addEventListener('click', () => {
    state.showOnHero = !state.showOnHero;
    if (state.showOnHero) {
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
    updateInfo(state);
  });

  document.querySelectorAll('#pose-buttons button, #archery-panel button[data-pose]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pose-buttons button, #archery-panel button[data-pose]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentPose = btn.dataset.pose;
      state.heroAnimTime = 0;
    });
  });

  document.getElementById('btn-hero-replay').addEventListener('click', () => {
    state.heroAnimTime = 0;
  });

  const btnSlowMo = document.getElementById('btn-slowmo');
  if (btnSlowMo) {
    btnSlowMo.addEventListener('click', () => {
      state.isSlowMo = !state.isSlowMo;
      btnSlowMo.classList.toggle('active', state.isSlowMo);
      btnSlowMo.textContent = state.isSlowMo ? 'Slow-Mo: ON' : 'Slow-Mo: OFF';
    });
  }

  const btnAimCam = document.getElementById('btn-aim-cam');
  if (btnAimCam) {
    btnAimCam.addEventListener('click', () => {
      state.isAimCam = !state.isAimCam;
      btnAimCam.classList.toggle('active', state.isAimCam);
      btnAimCam.textContent = state.isAimCam ? 'Aim Cam: ON' : 'Aim Cam: OFF';
      if (state.isAimCam) {
        state.turntableEnabled = false;
        document.getElementById('btn-turntable')?.classList.remove('active');
        const b = document.getElementById('btn-turntable');
        if (b) b.textContent = 'Turntable: OFF';
        state.cameraYaw = 0;
        state.cameraPitch = 0.08;
        state.cameraDistance = 2.4;
        state.targetLookAt.set(0.40, 1.25, 0);
      } else {
        state.targetLookAt.set(0, 1.0, 0);
        state.cameraDistance = 2.8;
      }
    });
  }

  const btnFire = document.getElementById('btn-fire-arrow');
  if (btnFire) {
    btnFire.addEventListener('click', () => {
      const equippedWep = state.activeModels.find((m) => m.model && m.model.getArrowWorldTransform);
      _fireDir.set(0, 0, 1);

      if (equippedWep && equippedWep.model) {
        equippedWep.model.getArrowWorldTransform(_fireOrigin, _fireDummyQuat);
        _fireDir.set(0, 0, 1).applyQuaternion(_fireDummyQuat).normalize();
      } else if (state.heroInstance) {
        _fireOrigin.copy(state.heroInstance.group.position);
        _fireOrigin.y += 1.25;
        _fireOrigin.z += 0.25;
      } else {
        _fireOrigin.set(0, 1.2, 0);
      }

      const effDraw = state.drawVal > 0.05 ? state.drawVal : 1.0;
      const spawned = arrowPool.spawnArrow({
        position: _fireOrigin,
        direction: _fireDir,
        drawAmount: effDraw,
        grade: state.currentGrade,
        damage: 15,
      });

      if (spawned) {
        updateTrajectoryPreview(_fireOrigin, spawned.velocity);
      }

      if (equippedWep && equippedWep.model) {
        equippedWep.model.setDraw(0, false, 0.02);
      }
    });
  }

  const sEnhance = document.getElementById('slider-enhance');
  sEnhance.addEventListener('input', (e) => {
    state.enhanceVal = parseInt(e.target.value, 10);
    document.getElementById('enhance-val').textContent = `+${state.enhanceVal}`;
    state.activeModels.forEach((i) => !i.isPickup && i.model.setEnhance && i.model.setEnhance(state.enhanceVal));
  });

  const sWear = document.getElementById('slider-wear');
  sWear.addEventListener('input', (e) => {
    state.wearVal = parseFloat(e.target.value);
    document.getElementById('wear-val').textContent = state.wearVal.toFixed(2);
    state.activeModels.forEach((i) => !i.isPickup && i.model.setWear && i.model.setWear(state.wearVal));
  });

  const sGlow = document.getElementById('slider-glow');
  sGlow.addEventListener('input', (e) => {
    state.glowVal = parseFloat(e.target.value);
    document.getElementById('glow-val').textContent = state.glowVal.toFixed(2);
    state.activeModels.forEach((i) => !i.isPickup && i.model.setGlow && i.model.setGlow(state.glowVal));
  });

  const sDraw = document.getElementById('slider-draw');
  sDraw.addEventListener('input', (e) => {
    state.drawVal = parseFloat(e.target.value);
    document.getElementById('draw-val').textContent = state.drawVal.toFixed(2);
    state.activeModels.forEach((i) => !i.isPickup && i.model.setDraw && i.model.setDraw(state.drawVal));
    if (state.showOnHero) {
      state.currentPose = 'aim';
      state.heroAnimTime = 0;
    }
  });

  const sOpacity = document.getElementById('slider-opacity');
  sOpacity.addEventListener('input', (e) => {
    state.opacityVal = parseFloat(e.target.value);
    document.getElementById('opacity-val').textContent = state.opacityVal.toFixed(2);
    state.activeModels.forEach((i) => !i.isPickup && i.model.setOpacity && i.model.setOpacity(state.opacityVal));
  });

  const btnTint = document.getElementById('btn-tint');
  btnTint.addEventListener('click', () => {
    state.tintRed = !state.tintRed;
    btnTint.classList.toggle('active', state.tintRed);
    btnTint.textContent = state.tintRed ? 'Tint Red: ON' : 'Tint Red: OFF';
    state.activeModels.forEach((i) => {
      if (!i.isPickup) {
        if (state.tintRed) i.model.setTint(0xff2222, 0.7);
        else i.model.setTint(null, 0);
      }
    });
  });

  const btnAnchors = document.getElementById('btn-anchors');
  btnAnchors.addEventListener('click', () => {
    state.showAnchors = !state.showAnchors;
    btnAnchors.classList.toggle('active', state.showAnchors);
    btnAnchors.textContent = state.showAnchors ? 'Show Anchors: ON' : 'Show Anchors: OFF';
    rebuildScene();
  });

  const btnGripDebug = document.getElementById('btn-grip-debug');
  const statsGrip = document.getElementById('stats-grip-debug');
  if (btnGripDebug) {
    btnGripDebug.addEventListener('click', () => {
      state.showGripDebug = !state.showGripDebug;
      btnGripDebug.classList.toggle('active', state.showGripDebug);
      btnGripDebug.textContent = state.showGripDebug ? 'Grip Debug: ON' : 'Grip Debug: OFF';
      palmDebugSphere.visible = state.showGripDebug;
      gripDebugSphere.visible = state.showGripDebug;
      if (statsGrip) statsGrip.style.display = state.showGripDebug ? 'block' : 'none';
      if (state.showGripDebug && !state.showOnHero) {
        state.currentKind = 'staff';
        state.isShield = false;
        modeHero.click();
      }
    });
  }

  const btnTurntable = document.getElementById('btn-turntable');
  btnTurntable.addEventListener('click', () => {
    state.turntableEnabled = !state.turntableEnabled;
    btnTurntable.classList.toggle('active', state.turntableEnabled);
    btnTurntable.textContent = state.turntableEnabled ? 'Turntable: ON' : 'Turntable: OFF';
  });

  const btnCamFront = document.getElementById('btn-cam-front');
  if (btnCamFront) {
    btnCamFront.addEventListener('click', () => {
      state.turntableEnabled = false;
      btnTurntable.classList.remove('active');
      btnTurntable.textContent = 'Turntable: OFF';
      state.cameraYaw = 0;
      state.cameraPitch = 0.10;
      state.cameraDistance = 2.8;
      state.targetLookAt.set(0, 1.0, 0);
    });
  }

  const btnCamSide = document.getElementById('btn-cam-side');
  if (btnCamSide) {
    btnCamSide.addEventListener('click', () => {
      state.turntableEnabled = false;
      btnTurntable.classList.remove('active');
      btnTurntable.textContent = 'Turntable: OFF';
      state.cameraYaw = Math.PI * 0.5;
      state.cameraPitch = 0.10;
      state.cameraDistance = 2.8;
      state.targetLookAt.set(0, 1.0, 0);
    });
  }

  const btnCamBack = document.getElementById('btn-cam-back');
  if (btnCamBack) {
    btnCamBack.addEventListener('click', () => {
      state.turntableEnabled = false;
      btnTurntable.classList.remove('active');
      btnTurntable.textContent = 'Turntable: OFF';
      state.cameraYaw = Math.PI;
      state.cameraPitch = 0.10;
      state.cameraDistance = 2.8;
      state.targetLookAt.set(0, 1.0, 0);
    });
  }

  document.getElementById('btn-screenshot').addEventListener('click', () => {
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `weapon_${state.currentKind}_${state.currentGrade}_${Date.now()}.png`;
    a.click();
  });
}