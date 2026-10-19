// src/art/artTownTest.js
// Test viewer implementation for Niflheimr town art modules.

import * as THREE from 'three';
import { LAYOUT } from './town/layout.js';
import { getGroundY } from './town/ground.js';
import { buildTown } from './town/TownAssembler.js';
import { createHeroModel } from './hero.js';

// ---------------------------------------------------------------------------
// 1. Error Banner Handling
// ---------------------------------------------------------------------------
const errorBox = document.getElementById('error-box');
function reportError(msg) {
  if (errorBox) {
    errorBox.style.display = 'block';
    errorBox.textContent = `[Viewer Error]: ${msg}\n` + errorBox.textContent;
  }
  console.error(msg);
}

window.addEventListener('error', (e) => {
  reportError(e.message || String(e));
});
window.addEventListener('unhandledrejection', (e) => {
  reportError(e.reason ? (e.reason.stack || e.reason.message || String(e.reason)) : String(e));
});

// ---------------------------------------------------------------------------
// 2. Three.js Setup & Lighting
// ---------------------------------------------------------------------------
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f2a33);
scene.fog = new THREE.Fog(0x1d4a55, 72, 275);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

// Base dynamic lights (driven by shell getLighting())
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
scene.add(hemiLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
sunLight.castShadow = false;
scene.add(sunLight);

// Dynamic 8-PointLight Pool (Engine Light Budget)
const activePointLights = [];
for (let i = 0; i < 8; i++) {
  const pl = new THREE.PointLight(0xffffff, 0, 10);
  pl.visible = false;
  scene.add(pl);
  activePointLights.push(pl);
}

// ---------------------------------------------------------------------------
// 3. Free-Fly Camera Implementation (WASD + Mouse Look)
// ---------------------------------------------------------------------------
let cameraYaw = -Math.PI * 0.75;
let cameraPitch = -0.6;
let flySpeed = 25.0; // m/s
const keysDown = {};

// Initial camera position (Bird's eye)
camera.position.set(0, 95, 80);

function updateCameraOrientation() {
  const cosPitch = Math.cos(cameraPitch);
  const lookDir = new THREE.Vector3(
    Math.sin(cameraYaw) * cosPitch,
    Math.sin(cameraPitch),
    Math.cos(cameraYaw) * cosPitch
  );
  const target = camera.position.clone().add(lookDir);
  camera.lookAt(target);
}
updateCameraOrientation();

let isDragging = false;
let prevMouseX = 0;
let prevMouseY = 0;

window.addEventListener('mousedown', (e) => {
  if (e.button === 2) {
    isDragging = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
    e.preventDefault();
  }
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - prevMouseX;
  const dy = e.clientY - prevMouseY;
  prevMouseX = e.clientX;
  prevMouseY = e.clientY;

  cameraYaw -= dx * 0.0035;
  cameraPitch -= dy * 0.0035;
  cameraPitch = Math.max(-1.5, Math.min(1.5, cameraPitch));
  updateCameraOrientation();
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 2) isDragging = false;
});
window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('wheel', (e) => {
  flySpeed = Math.max(5, Math.min(100, flySpeed - Math.sign(e.deltaY) * 5));
  const el = document.getElementById('cam-speed-val');
  if (el) el.textContent = flySpeed.toFixed(0);
});

window.addEventListener('keydown', (e) => {
  keysDown[e.code] = true;
});
window.addEventListener('keyup', (e) => {
  keysDown[e.code] = false;
});

function handleMovement(dt) {
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

  // Horizontal plane forward
  const flatForward = forward.clone();
  flatForward.y = 0;
  if (flatForward.lengthSq() > 0.0001) flatForward.normalize();

  const moveDir = new THREE.Vector3();
  if (keysDown['KeyW']) moveDir.add(flatForward);
  if (keysDown['KeyS']) moveDir.sub(flatForward);
  if (keysDown['KeyD']) moveDir.add(right);
  if (keysDown['KeyA']) moveDir.sub(right);
  if (keysDown['KeyE']) moveDir.y += 1;
  if (keysDown['KeyQ']) moveDir.y -= 1;

  if (moveDir.lengthSq() > 0.0001) {
    moveDir.normalize();
    camera.position.addScaledVector(moveDir, flySpeed * dt);
    updateCameraOrientation();
  }
}

// ---------------------------------------------------------------------------
// 4. Town Building & State
// ---------------------------------------------------------------------------
let currentQuality = 'high';
let currentTimeOfDay = 0.78; // 0..1
let exposureMultiplier = 1.0;
let isPlayingCycle = false;
let isFlatDebugLight = false;
let isFogEnabled = true;
let town = null;

function applyLighting() {
  if (!town) return;
  const lighting = town.getLighting ? town.getLighting() : null;
  if (!lighting) return;

  if (isFlatDebugLight) {
    ambientLight.color.setHex(0xffffff);
    ambientLight.intensity = 1.0;
    hemiLight.intensity = 0.0;
    sunLight.intensity = 0.0;
    scene.fog = null;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    return;
  }

  // Background
  if (!scene.background) scene.background = new THREE.Color();
  scene.background.setHex(lighting.background);

  // Ambient
  ambientLight.color.setHex(lighting.ambient.color);
  ambientLight.intensity = lighting.ambient.intensity;

  // Hemisphere
  hemiLight.color.setHex(lighting.hemi.sky);
  hemiLight.groundColor.setHex(lighting.hemi.ground);
  hemiLight.intensity = lighting.hemi.intensity;

  // Sun / Directional
  sunLight.color.setHex(lighting.sun.color);
  sunLight.intensity = lighting.sun.intensity;
  // sun.direction is the direction the light comes FROM, normalized
  sunLight.position.copy(lighting.sun.direction).multiplyScalar(80);

  // Fog
  if (isFogEnabled) {
    if (!scene.fog) {
      scene.fog = new THREE.Fog(lighting.fog.color, lighting.fog.near, lighting.fog.far);
    } else {
      scene.fog.color.setHex(lighting.fog.color);
      scene.fog.near = lighting.fog.near;
      scene.fog.far = lighting.fog.far;
    }
  } else {
    scene.fog = null;
  }

  // Tone mapping
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = lighting.exposure * exposureMultiplier;
}

function getTimeLabel(t) {
  if (t < 0.15) return `${t.toFixed(3)} - Morning`;
  if (t < 0.45) return `${t.toFixed(3)} - Noon`;
  if (t < 0.70) return `${t.toFixed(3)} - Dusk`;
  if (t < 0.88) return `${t.toFixed(3)} - Night`;
  return `${t.toFixed(3)} - Deep Night`;
}

function setTime(t, updateSlider = true) {
  currentTimeOfDay = ((t % 1) + 1) % 1;
  if (town && town.setTimeOfDay) {
    town.setTimeOfDay(currentTimeOfDay);
  }
  applyLighting();

  const labelEl = document.getElementById('time-label');
  if (labelEl) labelEl.textContent = getTimeLabel(currentTimeOfDay);

  const sliderEl = document.getElementById('time-slider');
  if (sliderEl && updateSlider) sliderEl.value = currentTimeOfDay;

  const statTimeEl = document.getElementById('stat-time-val');
  if (statTimeEl) statTimeEl.textContent = getTimeLabel(currentTimeOfDay);

  const statExposureEl = document.getElementById('stat-exposure-val');
  if (statExposureEl) statExposureEl.textContent = renderer.toneMappingExposure.toFixed(2);

  const timeBtns = {
    'btn-time-morning': Math.abs(currentTimeOfDay - 0.00) < 0.05,
    'btn-time-noon': Math.abs(currentTimeOfDay - 0.30) < 0.05,
    'btn-time-dusk': Math.abs(currentTimeOfDay - 0.62) < 0.05,
    'btn-time-night': Math.abs(currentTimeOfDay - 0.78) < 0.05
  };
  for (const [id, active] of Object.entries(timeBtns)) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', active);
  }
}

function initTown() {
  if (town) {
    scene.remove(town.group);
    town.dispose();
  }
  town = buildTown(LAYOUT, getGroundY, currentQuality, { timeOfDay: currentTimeOfDay });
  scene.add(town.group);
  setTime(currentTimeOfDay);
}

try {
  initTown();
} catch (err) {
  reportError(err.stack || err.message);
}

// ---------------------------------------------------------------------------
// 5. Visual Overlays: Colliders, Corridors, Labels, Han References
// ---------------------------------------------------------------------------
// a. Colliders Wireframe Group
const collidersGroup = new THREE.Group();
collidersGroup.name = 'CollidersWireframes';
collidersGroup.visible = false;
scene.add(collidersGroup);

function rebuildCollidersVisual() {
  while (collidersGroup.children.length > 0) {
    const c = collidersGroup.children.pop();
    if (c.geometry) c.geometry.dispose();
  }
  const wireMat = new THREE.MeshBasicMaterial({ color: 0xff3344, wireframe: true });
  for (const col of town.colliders) {
    let geom = null;
    let y = getGroundY(col.x, col.z) + 0.5;
    if (col.type === 'circle') {
      geom = new THREE.CylinderGeometry(col.r, col.r, 1.0, 16);
    } else if (col.type === 'box') {
      geom = new THREE.BoxGeometry(col.w, 1.0, col.d);
    }
    if (geom) {
      const mesh = new THREE.Mesh(geom, wireMat);
      mesh.position.set(col.x, y, col.z);
      if (col.rotY) mesh.rotation.y = col.rotY;
      collidersGroup.add(mesh);
    }
  }
}
rebuildCollidersVisual();

// b. Door Corridors Group
const corridorsGroup = new THREE.Group();
corridorsGroup.name = 'CorridorsVisual';
corridorsGroup.visible = false;
scene.add(corridorsGroup);

function rebuildCorridorsVisual() {
  while (corridorsGroup.children.length > 0) {
    const c = corridorsGroup.children.pop();
    if (c.geometry) c.geometry.dispose();
  }
  const lineMat = new THREE.LineBasicMaterial({ color: 0x00ffcc, linewidth: 2 });
  const ptGeo = new THREE.SphereGeometry(0.2, 8, 8);
  const ptMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

  // Gather all corridors from zones and cottages
  const allCorridors = [];
  for (const k in LAYOUT.zones) {
    if (LAYOUT.zones[k].doorCorridor) allCorridors.push(LAYOUT.zones[k].doorCorridor);
  }
  for (const cot of LAYOUT.cottages) {
    if (cot.doorCorridor) allCorridors.push(cot.doorCorridor);
  }

  for (const pts of allCorridors) {
    const points = pts.map((p) => new THREE.Vector3(p.x, getGroundY(p.x, p.z) + 0.2, p.z));
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, lineMat);
    corridorsGroup.add(line);

    for (const p of points) {
      const dot = new THREE.Mesh(ptGeo, ptMat);
      dot.position.copy(p);
      corridorsGroup.add(dot);
    }
  }
}
rebuildCorridorsVisual();

// c. Zone Labels
const labelsGroup = new THREE.Group();
labelsGroup.name = 'ZoneLabels';
labelsGroup.visible = true;
scene.add(labelsGroup);

function createLabelSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.roundRect ? ctx.roundRect(4, 4, 248, 56, 8) : ctx.rect(4, 4, 248, 56);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(4, 1, 1);
  return sprite;
}

for (const k in LAYOUT.zones) {
  const z = LAYOUT.zones[k];
  const gy = getGroundY(z.center.x, z.center.z);
  const spr = createLabelSprite(z.name);
  spr.position.set(z.center.x, gy + (z.signOffset ? z.signOffset.y : 4.0), z.center.z);
  labelsGroup.add(spr);
}

// d. Han Scale Reference Models at Landing Area and each building door
const heroesGroup = new THREE.Group();
heroesGroup.name = 'HanScaleRefs';
heroesGroup.visible = true;
scene.add(heroesGroup);

function spawnHanReference(x, z, rotY = 0) {
  const hero = createHeroModel({
    seed: 1001,
    heightScale: 1.0,
    build: 'average',
    skinTone: 0xf3d8c4,
    hair: { style: 'short', color: 0x141418 }
  });
  hero.setPose('idle', 0);
  hero.group.position.set(x, getGroundY(x, z), z);
  hero.group.rotation.y = rotY;
  heroesGroup.add(hero.group);
}

// Landing Area Han
spawnHanReference(20.0, 26.0, 0);

// Building door Hans
for (const k in LAYOUT.zones) {
  const z = LAYOUT.zones[k];
  if (z.door) {
    const yaw = Math.atan2(z.door.outward.x, z.door.outward.z);
    spawnHanReference(z.door.position.x, z.door.position.z, yaw);
  }
}

// ---------------------------------------------------------------------------
// 6. Dynamic 8-PointLight Manager (Updated every 0.25s)
// ---------------------------------------------------------------------------
let lightUpdateTimer = 0;
const lightsListEl = document.getElementById('lights-list');

function updatePointLights() {
  const allLights = town ? town.lights || [] : [];
  const camPos = camera.position;
  const lighting = town && town.getLighting ? town.getLighting() : null;
  const lampGlow = lighting ? lighting.lampGlow : 1.0;
  const windowGlow = lighting ? lighting.windowGlow : 1.0;

  // Sort by distance to camera
  const sorted = allLights
    .map((l) => ({ ...l, dist: camPos.distanceTo(l.position) }))
    .sort((a, b) => a.dist - b.dist);

  let activeCount = 0;
  let html = '';
  for (let i = 0; i < 8; i++) {
    const pl = activePointLights[i];
    if (i < sorted.length && !isFlatDebugLight) {
      const l = sorted[i];
      const isWindow = (l.id && String(l.id).toLowerCase().includes('window')) || (l.type === 'window');
      const glowScale = isWindow ? windowGlow : lampGlow;

      pl.position.copy(l.position);
      pl.color.setHex(l.color);
      pl.intensity = l.intensity * glowScale;
      pl.distance = l.distance;
      pl.visible = pl.intensity > 0.01;
      if (pl.visible) activeCount++;

      const hexStr = '#' + l.color.toString(16).padStart(6, '0');
      html += `<div class="light-row">
        <span class="light-dot" style="background:${hexStr};"></span>
        <span>Pos: (${l.position.x.toFixed(0)}, ${l.position.z.toFixed(0)}) | ${l.dist.toFixed(1)}m | Int: ${pl.intensity.toFixed(2)}</span>
      </div>`;
    } else {
      pl.visible = false;
    }
  }
  if (lightsListEl) lightsListEl.innerHTML = html || 'No active lights';

  const statLightsEl = document.getElementById('stat-active-lights-val');
  if (statLightsEl) statLightsEl.textContent = activeCount;
}

// ---------------------------------------------------------------------------
// 7. UI Controls Wiring
// ---------------------------------------------------------------------------
// Camera Presets
document.getElementById('btn-cam-bird')?.addEventListener('click', () => {
  camera.position.set(0, 95, 80);
  cameraYaw = -Math.PI;
  cameraPitch = -0.85;
  updateCameraOrientation();
});

document.getElementById('btn-cam-walk')?.addEventListener('click', () => {
  const gy = getGroundY(20, 26);
  camera.position.set(20, gy + 1.7, 26);
  cameraYaw = Math.atan2(14 - 20, -8 - 26);
  cameraPitch = 0.0;
  updateCameraOrientation();
});

function focusOnBuilding(zoneId, mode) {
  const z = LAYOUT.zones[zoneId];
  if (!z) return;

  if (mode === 'closeup') {
    // 1.7 above the ground, 9 units in front of the door, looking at the door
    if (z.door) {
      const px = z.door.position.x + z.door.outward.x * 9.0;
      const pz = z.door.position.z + z.door.outward.z * 9.0;
      const py = getGroundY(px, pz) + 1.7;
      const tx = z.door.position.x;
      const ty = z.door.position.y + 1.2;
      const tz = z.door.position.z;
      setCameraOrientationTowards(px, py, pz, tx, ty, tz);
    } else {
      const px = z.center.x;
      const pz = z.center.z + 9.0;
      const py = getGroundY(px, pz) + 1.7;
      const tx = z.center.x;
      const ty = getGroundY(tx, z.center.z) + 1.2;
      const tz = z.center.z;
      setCameraOrientationTowards(px, py, pz, tx, ty, tz);
    }
  } else if (mode === 'overview') {
    // 25 units away, 12 high
    const ox = z.door ? z.door.outward.x : 0.0;
    const oz = z.door ? z.door.outward.z : 1.0;
    const px = z.center.x + ox * 25.0;
    const pz = z.center.z + oz * 25.0;
    const py = getGroundY(z.center.x, z.center.z) + 12.0;
    const tx = z.center.x;
    const ty = getGroundY(z.center.x, z.center.z) + 1.5;
    const tz = z.center.z;
    setCameraOrientationTowards(px, py, pz, tx, ty, tz);
  }
}

function setCameraOrientationTowards(px, py, pz, tx, ty, tz) {
  camera.position.set(px, py, pz);
  const dir = new THREE.Vector3(tx - px, ty - py, tz - pz).normalize();
  cameraPitch = Math.asin(Math.max(-0.99, Math.min(0.99, dir.y)));
  cameraYaw = Math.atan2(dir.x, dir.z);
  updateCameraOrientation();
}

// Building preset buttons wiring
document.getElementById('btn-cam-closeup')?.addEventListener('click', () => {
  const sel = document.getElementById('building-select');
  if (sel) focusOnBuilding(sel.value, 'closeup');
});

document.getElementById('btn-cam-overview')?.addEventListener('click', () => {
  const sel = document.getElementById('building-select');
  if (sel) focusOnBuilding(sel.value, 'overview');
});

document.querySelectorAll('[data-cam]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const camMode = btn.getAttribute('data-cam');
    const zoneId = btn.getAttribute('data-zone');
    focusOnBuilding(zoneId, camMode);
  });
});

// Quality buttons
['low', 'medium', 'high'].forEach((q) => {
  document.getElementById(`q-${q}`)?.addEventListener('click', (e) => {
    document.querySelectorAll('[id^="q-"]').forEach((b) => b.classList.remove('active'));
    e.target.classList.add('active');
    currentQuality = q;
    initTown();
    rebuildCollidersVisual();
    rebuildCorridorsVisual();
  });
});

// Time of Day slider
document.getElementById('time-slider')?.addEventListener('input', (e) => {
  setTime(parseFloat(e.target.value), false);
  updatePointLights();
});

// Time preset buttons
document.getElementById('btn-time-morning')?.addEventListener('click', () => {
  setTime(0.00);
  updatePointLights();
});
document.getElementById('btn-time-noon')?.addEventListener('click', () => {
  setTime(0.30);
  updatePointLights();
});
document.getElementById('btn-time-dusk')?.addEventListener('click', () => {
  setTime(0.62);
  updatePointLights();
});
document.getElementById('btn-time-night')?.addEventListener('click', () => {
  setTime(0.78);
  updatePointLights();
});

// Play day cycle toggle
document.getElementById('btn-play-cycle')?.addEventListener('click', (e) => {
  isPlayingCycle = !isPlayingCycle;
  e.target.textContent = isPlayingCycle ? '⏸ Pause Day Cycle: ON' : '▶ Play Day Cycle (60s): OFF';
  e.target.classList.toggle('active', isPlayingCycle);
});

// Exposure multiplier slider
document.getElementById('exposure-slider')?.addEventListener('input', (e) => {
  exposureMultiplier = parseFloat(e.target.value);
  const expValEl = document.getElementById('exposure-val');
  if (expValEl) expValEl.textContent = `${exposureMultiplier.toFixed(2)}x`;
  applyLighting();
  const statExposureEl = document.getElementById('stat-exposure-val');
  if (statExposureEl) statExposureEl.textContent = renderer.toneMappingExposure.toFixed(2);
});

// Flat debug light toggle
document.getElementById('btn-flat-light')?.addEventListener('click', (e) => {
  isFlatDebugLight = !isFlatDebugLight;
  e.target.textContent = isFlatDebugLight ? '💡 Flat Debug Light: ON' : '💡 Flat Debug Light: OFF';
  e.target.classList.toggle('active', isFlatDebugLight);
  applyLighting();
  updatePointLights();
});

// Module toggles
document.getElementById('toggle-shell')?.addEventListener('click', (e) => {
  town.modules.shell.group.visible = !town.modules.shell.group.visible;
  e.target.classList.toggle('active', town.modules.shell.group.visible);
});
document.getElementById('toggle-landmarks-main')?.addEventListener('click', (e) => {
  if (town.modules.landmarksMain) {
    town.modules.landmarksMain.group.visible = !town.modules.landmarksMain.group.visible;
    e.target.classList.toggle('active', town.modules.landmarksMain.group.visible);
  }
});
document.getElementById('toggle-landmarks-work')?.addEventListener('click', (e) => {
  if (town.modules.landmarksWork) {
    town.modules.landmarksWork.group.visible = !town.modules.landmarksWork.group.visible;
    e.target.classList.toggle('active', town.modules.landmarksWork.group.visible);
  }
});
document.getElementById('toggle-village')?.addEventListener('click', (e) => {
  town.modules.village.group.visible = !town.modules.village.group.visible;
  e.target.classList.toggle('active', town.modules.village.group.visible);
});

// Debug toggles
document.getElementById('toggle-colliders')?.addEventListener('click', (e) => {
  collidersGroup.visible = !collidersGroup.visible;
  e.target.textContent = `Colliders: ${collidersGroup.visible ? 'ON' : 'OFF'}`;
  e.target.classList.toggle('active', collidersGroup.visible);
});

document.getElementById('toggle-corridors')?.addEventListener('click', (e) => {
  corridorsGroup.visible = !corridorsGroup.visible;
  e.target.textContent = `Corridors: ${corridorsGroup.visible ? 'ON' : 'OFF'}`;
  e.target.classList.toggle('active', corridorsGroup.visible);
});

document.getElementById('toggle-labels')?.addEventListener('click', (e) => {
  labelsGroup.visible = !labelsGroup.visible;
  e.target.textContent = `Zone Labels: ${labelsGroup.visible ? 'ON' : 'OFF'}`;
  e.target.classList.toggle('active', labelsGroup.visible);
});

document.getElementById('toggle-fog')?.addEventListener('click', (e) => {
  isFogEnabled = !isFogEnabled;
  e.target.textContent = `Fog: ${isFogEnabled ? 'ON' : 'OFF'}`;
  e.target.classList.toggle('active', isFogEnabled);
  applyLighting();
});

document.getElementById('toggle-heroes')?.addEventListener('click', (e) => {
  heroesGroup.visible = !heroesGroup.visible;
  e.target.textContent = `🧍 Han Scale Ref (At Doors): ${heroesGroup.visible ? 'ON' : 'OFF'}`;
  e.target.classList.toggle('active', heroesGroup.visible);
});

// Screenshot button
document.getElementById('btn-screenshot')?.addEventListener('click', () => {
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `niflheimr-town-${currentQuality}-${Date.now()}.png`;
  a.click();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// 8. Main Render & Stats Loop
// ---------------------------------------------------------------------------
let lastTime = performance.now();
let frameCount = 0;
let fpsTimer = 0;

const fpsEl = document.getElementById('fps-val');
const totalTrisEl = document.getElementById('total-tris-val');
const drawCallsEl = document.getElementById('draw-calls-val');
const shellStatsEl = document.getElementById('shell-stats');
const landmarksMainStatsEl = document.getElementById('landmarks-main-stats');
const landmarksWorkStatsEl = document.getElementById('landmarks-work-stats');
const villageStatsEl = document.getElementById('village-stats');

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min(0.1, (now - lastTime) * 0.001);
  lastTime = now;

  // Day cycle progression (one full cycle in 60s)
  if (isPlayingCycle) {
    const nextTime = (currentTimeOfDay + dt / 60.0) % 1.0;
    setTime(nextTime, true);
  }

  // Movement
  handleMovement(dt);

  // Town animation update
  if (town && town.update) {
    town.update(dt, camera);
  }

  // 8-Light budget update
  lightUpdateTimer += dt;
  if (lightUpdateTimer >= 0.25) {
    lightUpdateTimer = 0;
    updatePointLights();
  }

  // Render scene
  renderer.render(scene, camera);

  // Stats calculation
  frameCount++;
  fpsTimer += dt;
  if (fpsTimer >= 0.5) {
    const fps = Math.round(frameCount / fpsTimer);
    frameCount = 0;
    fpsTimer = 0;
    if (fpsEl) fpsEl.textContent = fps;

    const statTimeEl = document.getElementById('stat-time-val');
    if (statTimeEl) statTimeEl.textContent = getTimeLabel(currentTimeOfDay);

    const statExposureEl = document.getElementById('stat-exposure-val');
    if (statExposureEl) statExposureEl.textContent = renderer.toneMappingExposure.toFixed(2);

    const stats = town ? town.getStats() : null;
    if (stats) {
      if (totalTrisEl) {
        totalTrisEl.textContent = stats.totalTriangles.toLocaleString();
        totalTrisEl.className = stats.totalTriangles > 340000 ? 'stat-over' : 'stat-ok';
      }
      if (drawCallsEl) {
        const calls = stats.totalDrawCalls;
        drawCallsEl.textContent = calls;
        drawCallsEl.className = calls > 130 ? 'stat-over' : 'stat-ok';
      }

      if (shellStatsEl) {
        shellStatsEl.textContent = `${stats.shell.triangles.toLocaleString()} tris, ${stats.shell.drawCallsEstimate} calls`;
        shellStatsEl.className = (stats.shell.triangles > 70000 || stats.shell.drawCallsEstimate > 20) ? 'stat-over' : 'stat-ok';
      }
      if (landmarksMainStatsEl) {
        const lm = stats.landmarksMain || { triangles: 0, drawCallsEstimate: 0 };
        landmarksMainStatsEl.textContent = `${lm.triangles.toLocaleString()} tris, ${lm.drawCallsEstimate} calls`;
        landmarksMainStatsEl.className = (lm.triangles > 62000 || lm.drawCallsEstimate > 25) ? 'stat-over' : 'stat-ok';
      }
      if (landmarksWorkStatsEl) {
        const lw = stats.landmarksWork || { triangles: 0, drawCallsEstimate: 0 };
        landmarksWorkStatsEl.textContent = `${lw.triangles.toLocaleString()} tris, ${lw.drawCallsEstimate} calls`;
        landmarksWorkStatsEl.className = (lw.triangles > 60000 || lw.drawCallsEstimate > 25) ? 'stat-over' : 'stat-ok';
      }
      if (villageStatsEl) {
        villageStatsEl.textContent = `${stats.village.triangles.toLocaleString()} tris, ${stats.village.drawCallsEstimate} calls`;
        villageStatsEl.className = (stats.village.triangles > 150000 || stats.village.drawCallsEstimate > 60) ? 'stat-over' : 'stat-ok';
      }
    }
  }
}

animate();
