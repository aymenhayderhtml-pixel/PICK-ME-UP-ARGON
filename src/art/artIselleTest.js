// src/art/artIselleTest.js - Interactive Art Test Viewer for Iselle (Guide Fairy)
import * as THREE from 'three';
import {
  createIselleModel,
  drawIsellePortrait,
  disposeIselleCaches,
  ISELLE_POSES,
  ISELLE_EXPRESSIONS,
  POSE_INFO
} from './iselle.js';
import { createHeroModel } from './hero.js';
import { PRESETS } from './presets.js';

// Global error banner
const errorBox = document.getElementById('error-box');
function showError(msg) {
  if (!errorBox) return;
  errorBox.style.display = 'block';
  errorBox.textContent = `[Iselle Test Error]: ${msg}`;
}
window.addEventListener('error', (e) => {
  showError(`${e.message} at ${e.filename}:${e.lineno}`);
});

// Scene & Renderer
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e17);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Lighting
const hemiLight = new THREE.HemisphereLight(0xe8d5ff, 0x141220, 1.4);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(5, 12, 7);
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x9d4edd, 0.8);
fillLight.position.set(-6, -2, -4);
scene.add(fillLight);

// Grid floor
const grid = new THREE.GridHelper(20, 20, 0x7c3aed, 0x1e1b4b);
grid.position.y = 0;
scene.add(grid);

// Manual Orbit Camera (no OrbitControls)
let isDragging = false;
let prevPointerX = 0;
let prevPointerY = 0;
let cameraYaw = 0.3;
let cameraPitch = 0.18;
let cameraDistance = 2.4;
let targetLookAt = new THREE.Vector3(0, 1.2, 0);
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
  cameraDistance = Math.max(0.4, Math.min(25, cameraDistance * (1 + e.deltaY * 0.001)));
}, { passive: false });

// Viewer State
let currentPose = 'float';
let currentExpression = 'smile';
let glowVal = 1.0;
let opacityVal = 1.0;
let scaleVal = 1.0;
let tintRed = false;
let showAnchors = false;
let scaleRefEnabled = false;
let flightDemoEnabled = false;

let animTime = 0;
let flightTime = 0;

// Iselle Model
let iselle = null;
const anchorSpheres = [];

function spawnIselle() {
  if (iselle) {
    scene.remove(iselle.group);
    iselle.dispose();
  }
  clearAnchorSpheres();

  try {
    iselle = createIselleModel({ scale: scaleVal, outline: true });
    iselle.group.position.set(0, 1.2, 0);
    scene.add(iselle.group);

    iselle.setExpression(currentExpression);
    iselle.setGlow(glowVal);
    iselle.setOpacity(opacityVal);
    iselle.setTint(tintRed ? 0xff0033 : null, tintRed ? 0.7 : 0);

    setupAnchorSpheres();
  } catch (err) {
    showError(`Failed to create Iselle model: ${err.message}`);
  }
}

// Anchors Visualizer
function setupAnchorSpheres() {
  clearAnchorSpheres();
  if (!iselle || !iselle.anchors) return;

  const anchorColors = {
    head: 0xff3366,
    mouth: 0xff9900,
    handL: 0x33ccff,
    handR: 0x3366ff,
    wingTipL: 0xcc33ff,
    wingTipR: 0x9933ff,
    aura: 0x00ffcc,
    feet: 0x66ff33
  };

  for (const [name, anchorObj] of Object.entries(iselle.anchors)) {
    const col = anchorColors[name] || 0xffffff;
    const sph = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 8, 8),
      new THREE.MeshBasicMaterial({ color: col, wireframe: false })
    );
    sph.visible = showAnchors;
    anchorObj.add(sph);
    anchorSpheres.push(sph);
  }
}

function clearAnchorSpheres() {
  for (const s of anchorSpheres) {
    if (s.parent) s.parent.remove(s);
    s.geometry.dispose();
    s.material.dispose();
  }
  anchorSpheres.length = 0;
}

// Scale Reference: Han Hero Model
let refHero = null;
function setScaleRef(flag) {
  scaleRefEnabled = flag;
  if (scaleRefEnabled) {
    if (!refHero) {
      refHero = createHeroModel(PRESETS.han);
      refHero.group.position.set(0.9, 0, 0);
      scene.add(refHero.group);
    }
  } else {
    if (refHero) {
      scene.remove(refHero.group);
      refHero.dispose();
      refHero = null;
    }
  }
}

// UI Setup: Poses
const posesGrid = document.getElementById('poses-grid');
for (const poseName of ISELLE_POSES) {
  const btn = document.createElement('button');
  btn.textContent = poseName;
  if (poseName === currentPose) btn.classList.add('active');
  btn.addEventListener('click', () => {
    currentPose = poseName;
    animTime = 0;
    posesGrid.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
  posesGrid.appendChild(btn);
}

document.getElementById('btn-replay').addEventListener('click', () => {
  animTime = 0;
});

// UI Setup: Expressions
const expressionsGrid = document.getElementById('expressions-grid');
for (const exprName of ISELLE_EXPRESSIONS) {
  const btn = document.createElement('button');
  btn.textContent = exprName;
  if (exprName === currentExpression) btn.classList.add('active');
  btn.addEventListener('click', () => {
    currentExpression = exprName;
    expressionsGrid.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    if (iselle) iselle.setExpression(currentExpression);
  });
  expressionsGrid.appendChild(btn);
}

// UI Sliders
const sliderGlow = document.getElementById('slider-glow');
const glowValSpan = document.getElementById('glow-val');
sliderGlow.addEventListener('input', (e) => {
  glowVal = parseFloat(e.target.value);
  glowValSpan.textContent = glowVal.toFixed(2);
  if (iselle) iselle.setGlow(glowVal);
});

const sliderOpacity = document.getElementById('slider-opacity');
const opacityValSpan = document.getElementById('opacity-val');
sliderOpacity.addEventListener('input', (e) => {
  opacityVal = parseFloat(e.target.value);
  opacityValSpan.textContent = opacityVal.toFixed(2);
  if (iselle) iselle.setOpacity(opacityVal);
});

const sliderScale = document.getElementById('slider-scale');
const scaleValSpan = document.getElementById('scale-val');
sliderScale.addEventListener('input', (e) => {
  scaleVal = parseFloat(e.target.value);
  scaleValSpan.textContent = scaleVal.toFixed(2);
  if (iselle) iselle.group.scale.setScalar(scaleVal);
});

// UI Buttons & Toggles
const btnTint = document.getElementById('btn-tint');
btnTint.addEventListener('click', () => {
  tintRed = !tintRed;
  btnTint.textContent = `Tint Red: ${tintRed ? 'ON' : 'OFF'}`;
  btnTint.classList.toggle('active', tintRed);
  if (iselle) iselle.setTint(tintRed ? 0xff0033 : null, tintRed ? 0.7 : 0);
});

const btnCloseup = document.getElementById('btn-closeup');
btnCloseup.addEventListener('click', () => {
  targetLookAt.set(0, (flightDemoEnabled ? 2.2 : 1.2) + 0.18 * scaleVal, 0);
  cameraDistance = 0.85 * scaleVal;
  cameraPitch = 0.05;
});

const btnReference = document.getElementById('btn-reference');
btnReference.addEventListener('click', () => {
  setScaleRef(!scaleRefEnabled);
  btnReference.textContent = `Scale Ref: ${scaleRefEnabled ? 'ON' : 'OFF'}`;
  btnReference.classList.toggle('active', scaleRefEnabled);
});

const btnFlight = document.getElementById('btn-flight');
btnFlight.addEventListener('click', () => {
  flightDemoEnabled = !flightDemoEnabled;
  btnFlight.textContent = `Flight Demo: ${flightDemoEnabled ? 'ON' : 'OFF'}`;
  btnFlight.classList.toggle('active', flightDemoEnabled);
  if (flightDemoEnabled) {
    flightTime = 0;
  } else if (iselle) {
    iselle.group.position.set(0, 1.2, 0);
    iselle.group.rotation.set(0, 0, 0);
  }
});

const btnAnchors = document.getElementById('btn-anchors');
btnAnchors.addEventListener('click', () => {
  showAnchors = !showAnchors;
  btnAnchors.textContent = `Anchors: ${showAnchors ? 'ON' : 'OFF'}`;
  btnAnchors.classList.toggle('active', showAnchors);
  for (const s of anchorSpheres) s.visible = showAnchors;
});

const btnTurntable = document.getElementById('btn-turntable');
btnTurntable.addEventListener('click', () => {
  turntableEnabled = !turntableEnabled;
  btnTurntable.textContent = `Turntable: ${turntableEnabled ? 'ON' : 'OFF'}`;
  btnTurntable.classList.toggle('active', turntableEnabled);
});

const btnScreenshot = document.getElementById('btn-screenshot');
btnScreenshot.addEventListener('click', () => {
  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL('image/png');
  const a = document.createElement('a');
  a.download = `iselle_${currentPose}_${currentExpression}.png`;
  a.href = dataUrl;
  a.click();
});

// Render 2D Portrait Strip (drawIsellePortrait for each expression)
function renderPortraitsStrip() {
  const pCanvas = document.getElementById('portraits-canvas');
  if (!pCanvas) return;
  const ctx = pCanvas.getContext('2d');
  ctx.clearRect(0, 0, pCanvas.width, pCanvas.height);

  const thumbSize = 128;
  const offCanvas = document.createElement('canvas');
  offCanvas.width = thumbSize;
  offCanvas.height = thumbSize;
  const offCtx = offCanvas.getContext('2d');

  ISELLE_EXPRESSIONS.forEach((expr, idx) => {
    const x = idx * thumbSize;
    offCtx.clearRect(0, 0, thumbSize, thumbSize);
    try {
      drawIsellePortrait(offCtx, expr, thumbSize);
      ctx.drawImage(offCanvas, x, 0);

      // Label
      ctx.fillStyle = expr === currentExpression ? '#c084fc' : '#94a3b8';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(expr, x + thumbSize * 0.5, 144);
    } catch (e) {
      showError(`drawIsellePortrait error on ${expr}: ${e.message}`);
    }
  });
}

document.getElementById('btn-refresh-portraits').addEventListener('click', renderPortraitsStrip);

// Initialize
spawnIselle();
renderPortraitsStrip();

// Render Loop & Performance Stats
const statsOverlay = document.getElementById('stats-overlay');
let frameCount = 0;
let lastFpsTime = performance.now();
let lastTime = performance.now();
let fps = 60;

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.1, (now - lastTime) * 0.001);
  lastTime = now;

  // FPS calculation
  frameCount++;
  if (now - lastFpsTime >= 500) {
    fps = Math.round((frameCount * 1000) / (now - lastFpsTime));
    frameCount = 0;
    lastFpsTime = now;
  }

  // Camera Turntable
  if (turntableEnabled && !isDragging && !flightDemoEnabled) {
    cameraYaw += dt * 0.35;
  }

  // Update Camera position
  const cy = Math.cos(cameraYaw);
  const sy = Math.sin(cameraYaw);
  const cp = Math.cos(cameraPitch);
  const sp = Math.sin(cameraPitch);

  camera.position.x = targetLookAt.x + cameraDistance * cp * sy;
  camera.position.y = targetLookAt.y + cameraDistance * sp;
  camera.position.z = targetLookAt.z + cameraDistance * cp * cy;
  camera.lookAt(targetLookAt);

  // Flight demo mode vs In-place pose
  if (iselle) {
    if (flightDemoEnabled) {
      flightTime += dt;
      // Figure-eight trajectory at height 2.2
      const x = Math.sin(flightTime * 0.8) * 3.2;
      const z = Math.sin(flightTime * 1.6) * 2.0;
      const y = 2.2 + Math.sin(flightTime * 3.2) * 0.18;

      // Velocity for yaw
      const vx = Math.cos(flightTime * 0.8) * 0.8 * 3.2;
      const vz = Math.cos(flightTime * 1.6) * 1.6 * 2.0;
      const yaw = Math.atan2(vx, vz);

      iselle.group.position.set(x, y, z);
      iselle.group.rotation.y = yaw;
      iselle.setPose('fly', flightTime);
      targetLookAt.lerp(new THREE.Vector3(x * 0.4, 2.0, z * 0.4), dt * 3.0);
    } else {
      // Normal pose playback with replay logic for one-shots
      const poseInfo = POSE_INFO[currentPose] || POSE_INFO.float;
      animTime += dt;
      if (!poseInfo.loop) {
        const totalDuration = (poseInfo.duration || 1.0) + 0.6;
        if (animTime >= totalDuration) {
          animTime = 0;
        }
      }
      iselle.setPose(currentPose, animTime);
      if (!btnCloseup.matches(':focus')) {
        targetLookAt.lerp(new THREE.Vector3(0, 1.2, 0), dt * 4.0);
      }
    }
    iselle.update(dt);
  }

  if (refHero) {
    refHero.update(dt);
  }

  renderer.render(scene, camera);

  // Stats Overlay
  if (statsOverlay) {
    const calls = renderer.info.render.calls;
    const tris = renderer.info.render.triangles;
    statsOverlay.textContent = `FPS: ${fps} | Calls: ${calls} | Tris: ${tris} | Pose: ${flightDemoEnabled ? 'fly (flight demo)' : currentPose} | Expr: ${currentExpression}`;
  }
}

requestAnimationFrame(animate);
