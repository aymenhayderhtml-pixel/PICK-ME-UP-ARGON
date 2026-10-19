import * as THREE from 'three';
import { assembleFloor } from './floors/FloorAssembler.js';
import { createHeroModel } from './hero.js';
import { PRESETS } from './presets.js';
import { createEnemyModel } from './enemies.js';

const errorBox = document.getElementById('error-box');
function showError(message) {
  errorBox.style.display = 'block';
  errorBox.textContent += message + '\n';
}
window.addEventListener('error', (event) => {
  showError(`Error: ${event.message}\n${event.filename || ''}:${event.lineno || ''}`);
});
window.addEventListener('unhandledrejection', (event) => {
  showError(`Unhandled rejection: ${event.reason}`);
});

const el = {
  fps: document.getElementById('fps-val'),
  floor: document.getElementById('stat-floor-val'),
  moduleTris: document.getElementById('module-tris-val'),
  moduleCalls: document.getElementById('module-calls-val'),
  budgetTris: document.getElementById('budget-tris-val'),
  budgetCalls: document.getElementById('budget-calls-val'),
  sceneTris: document.getElementById('scene-tris-val'),
  sceneCalls: document.getElementById('scene-calls-val'),
  activeLights: document.getElementById('active-lights-val'),
  camPos: document.getElementById('cam-pos-val'),
  camSpeed: document.getElementById('cam-speed-val'),
  colliderCount: document.getElementById('collider-count-val'),
  walkStatus: document.getElementById('walk-status-val'),
  seed: document.getElementById('seed-val'),
  floorSelect: document.getElementById('floor-select'),
  qualitySelect: document.getElementById('quality-select'),
  btnGates: document.getElementById('btn-gates'),
  btnPillar: document.getElementById('btn-pillar'),
  btnWalk: document.getElementById('btn-walk'),
  chkLighting: document.getElementById('chk-lighting'),
  chkFlat: document.getElementById('chk-flat'),
  chkRefs: document.getElementById('chk-refs'),
  chkPath: document.getElementById('chk-path'),
  chkChokes: document.getElementById('chk-chokes'),
  chkSpawns: document.getElementById('chk-spawns'),
  chkAmbush: document.getElementById('chk-ambush'),
  chkColliders: document.getElementById('chk-colliders'),
  chkCamps: document.getElementById('chk-camps'),
  chkGates: document.getElementById('chk-gates'),
  chkBnds: document.getElementById('chk-bounds'),
  btnScreenshot: document.getElementById('btn-screenshot'),
  btnPlayer: document.getElementById('btn-cam-player'),
  btnBird: document.getElementById('btn-cam-bird'),
  btnReset: document.getElementById('btn-reset-cam'),
};

function main() {
  const container = document.getElementById('canvas-container');
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x10161c);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.08, 900);
  camera.position.set(0, 40, 30);

  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  const hemi = new THREE.HemisphereLight(0xbfe3ea, 0x1a2a20, 0.5);
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(40, 70, 30);
  scene.add(ambient, hemi, sun);

  const floorRoot = new THREE.Group();
  const refsRoot = new THREE.Group();
  const lightsRoot = new THREE.Group();
  scene.add(floorRoot, refsRoot, lightsRoot);

  let overlayRoot = new THREE.Group();
  scene.add(overlayRoot);

  const state = {
    floorNumber: 1,
    quality: 'high',
    assembled: null,
    overlayGroups: {},
    gateLines: [],
    moduleLights: [],
    entries: [],
    gatesOpen: false,
    destroyedPillars: 0,
    walk: null,
  };

  let yaw = 0;
  let pitch = 0;
  let flySpeed = 25;
  const keys = new Set();
  let dragging = false;
  let lastPointer = { x: 0, y: 0 };

  const clock = new THREE.Clock();
  let elapsed = 0;
  let statsTimer = 0;
  let lightTimer = 0;
  let fpsTimer = 0;
  let fpsFrames = 0;
  let fpsValue = 60;

  function floorSeed(floor) {
    return floor * 7919 + 13;
  }

  function disposeGroup(root) {
    const geometries = new Set();
    const materials = new Set();
    root.traverse((obj) => {
      if (obj.geometry) geometries.add(obj.geometry);
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          for (const m of obj.material) materials.add(m);
        } else {
          materials.add(obj.material);
        }
      }
    });
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    root.clear();
  }

  function makeLine(points, color, y = 0.06) {
    const geo = new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(p.x, y, p.z))
    );
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    });
    const line = new THREE.Line(geo, mat);
    line.renderOrder = 20;
    return line;
  }

  function makeLoop(points, color, y = 0.06) {
    const geo = new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(p.x, y, p.z))
    );
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    });
    const line = new THREE.LineLoop(geo, mat);
    line.renderOrder = 20;
    return line;
  }

  function circlePoints(x, z, radius, segments = 28) {
    const pts = [];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push({ x: x + Math.cos(a) * radius, z: z + Math.sin(a) * radius });
    }
    return pts;
  }

  function makeRing(x, z, radius, color, y = 0.07, segments = 28) {
    return makeLoop(circlePoints(x, z, radius, segments), color, y);
  }

  function buildOverlays(layout) {
    if (overlayRoot) {
      scene.remove(overlayRoot);
      disposeGroup(overlayRoot);
    }
    overlayRoot = new THREE.Group();
    scene.add(overlayRoot);
    const groups = {
      path: new THREE.Group(),
      chokes: new THREE.Group(),
      spawns: new THREE.Group(),
      ambush: new THREE.Group(),
      colliders: new THREE.Group(),
      camps: new THREE.Group(),
      gates: new THREE.Group(),
      bounds: new THREE.Group(),
    };
    state.gateLines = [];

    groups.path.add(makeLine(layout.pathPolyline, 0x38bdf8, 0.08));
    for (const cl of layout.clearings) {
      groups.path.add(makeRing(cl.center.x, cl.center.z, cl.radius, 0x60a5fa, 0.07));
      groups.path.add(makeRing(cl.center.x, cl.center.z, cl.triggerRadius, 0x2563eb, 0.065, 40));
    }

    for (const cp of layout.chokePoints) {
      const perpX = -cp.direction.z;
      const perpZ = cp.direction.x;
      const half = cp.width / 2;
      groups.chokes.add(
        makeLine(
          [
            { x: cp.position.x + perpX * half, z: cp.position.z + perpZ * half },
            { x: cp.position.x - perpX * half, z: cp.position.z - perpZ * half },
          ],
          0xf59e0b,
          0.09
        )
      );
      groups.chokes.add(makeRing(cp.position.x, cp.position.z, 0.35, 0xf59e0b, 0.09, 12));
    }

    const spawnGeo = new THREE.ConeGeometry(0.24, 0.6, 8);
    const spawnMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
    for (const cl of layout.clearings) {
      for (const sp of cl.spawnPoints) {
        const cone = new THREE.Mesh(spawnGeo, spawnMat);
        cone.position.set(sp.x, 0.3, sp.z);
        groups.spawns.add(cone);
      }
    }

    for (const a of layout.ambushSpots) {
      groups.ambush.add(makeRing(a.x, a.z, 0.5, 0xf97316, 0.08, 16));
    }

    for (const o of layout.obstacles) {
      groups.colliders.add(makeRing(o.x, o.z, o.radius, 0xef4444, 0.08, 18));
    }
    if (layout.bossArena) {
      layout.bossArena.pillars.forEach((p, index) => {
        const ring = makeRing(p.x, p.z, p.radius + 0.35, 0xef4444, 0.09, 20);
        ring.name = `collider_pillar_${index}`;
        groups.colliders.add(ring);
      });
      for (const w of layout.bossArena.wallSegments) {
        const dx = Math.cos(w.rotationY) * (w.length / 2);
        const dz = -Math.sin(w.rotationY) * (w.length / 2);
        groups.colliders.add(
          makeLine(
            [
              { x: w.x - dx, z: w.z - dz },
              { x: w.x + dx, z: w.z + dz },
            ],
            0xef4444,
            0.09
          )
        );
      }
    }

    for (const c of layout.campSpots) {
      groups.camps.add(makeRing(c.x, c.z, c.radius, 0xfacc15, 0.075, 20));
    }

    const entranceLine = makeLine(
      [
        {
          x: layout.entranceBarrier.position.x - layout.entranceBarrier.width / 2,
          z: layout.entranceBarrier.position.z,
        },
        {
          x: layout.entranceBarrier.position.x + layout.entranceBarrier.width / 2,
          z: layout.entranceBarrier.position.z,
        },
      ],
      0xef4444,
      0.09
    );
    const exitLine = makeLine(
      [
        { x: layout.exitGate.position.x - layout.exitGate.width / 2, z: layout.exitGate.position.z },
        { x: layout.exitGate.position.x + layout.exitGate.width / 2, z: layout.exitGate.position.z },
      ],
      0xef4444,
      0.09
    );
    groups.gates.add(entranceLine, exitLine);
    state.gateLines = [entranceLine, exitLine];

    groups.bounds.add(
      makeLoop(
        [
          { x: layout.bounds.minX, z: layout.bounds.minZ },
          { x: layout.bounds.maxX, z: layout.bounds.minZ },
          { x: layout.bounds.maxX, z: layout.bounds.maxZ },
          { x: layout.bounds.minX, z: layout.bounds.maxZ },
        ],
        0x94a3b8,
        0.05
      )
    );

    for (const key of Object.keys(groups)) {
      groups[key].traverse((obj) => {
        obj.renderOrder = 20;
      });
      overlayRoot.add(groups[key]);
    }
    state.overlayGroups = groups;
    syncOverlayVisibility();
    syncGateOverlay();
  }

  function syncOverlayVisibility() {
    const map = {
      path: el.chkPath,
      chokes: el.chkChokes,
      spawns: el.chkSpawns,
      ambush: el.chkAmbush,
      colliders: el.chkColliders,
      camps: el.chkCamps,
      gates: el.chkGates,
      bounds: el.chkBnds,
    };
    for (const key of Object.keys(map)) {
      const group = state.overlayGroups[key];
      if (group) group.visible = map[key].checked;
    }
  }

  function syncGateOverlay() {
    const color = state.gatesOpen ? 0x4ade80 : 0xef4444;
    for (const line of state.gateLines) line.material.color.setHex(color);
  }

  function spawnReferences(layout) {
    for (const entry of state.entries) {
      if (entry.dispose) entry.dispose();
    }
    state.entries = [];
    refsRoot.clear();

    const hero = createHeroModel({ ...PRESETS.han });
    hero.setPose('idle', 0);
    hero.group.position.set(layout.startPosition.x, layout.getGroundY(layout.startPosition.x, layout.startPosition.z), layout.startPosition.z);
    hero.group.rotation.y = Math.PI;
    refsRoot.add(hero.group);
    state.entries.push(hero);

    layout.clearings.forEach((cl, index) => {
      const goblin = createEnemyModel('goblin_grunt', { seed: 3000 + index, level: 2 });
      goblin.setPose('idle', 0);
      goblin.group.position.set(cl.center.x, layout.getGroundY(cl.center.x, cl.center.z), cl.center.z);
      goblin.group.rotation.y = (index * 1.7) % (Math.PI * 2);
      refsRoot.add(goblin.group);
      state.entries.push(goblin);
    });

    if (layout.bossArena) {
      const chief = createEnemyModel('hobgoblin_chief', { seed: 777, level: 10 });
      chief.setPose('idle', 0);
      chief.group.position.set(
        layout.bossArena.center.x,
        layout.getGroundY(layout.bossArena.center.x, layout.bossArena.center.z),
        layout.bossArena.center.z
      );
      refsRoot.add(chief.group);
      state.entries.push(chief);
    }
    refsRoot.visible = el.chkRefs.checked;
  }

  function spawnModuleLights() {
    for (const light of state.moduleLights) {
      if (light.parent) light.parent.remove(light);
    }
    state.moduleLights = [];
    if (!state.assembled) return;
    const descriptors = state.assembled.art.lights || [];
    for (const d of descriptors) {
      const light = new THREE.PointLight(d.color, d.intensity, d.distance, 2);
      light.position.set(d.position.x, d.position.y ?? 0, d.position.z);
      light.visible = false;
      lightsRoot.add(light);
      state.moduleLights.push(light);
    }
  }

  function updateModuleLights() {
    if (state.moduleLights.length === 0) return;
    const sorted = state.moduleLights
      .map((light) => ({ light, d: light.position.distanceToSquared(camera.position) }))
      .sort((a, b) => a.d - b.d);
    const visible = new Set(sorted.slice(0, 6).map((entry) => entry.light));
    let active = 0;
    for (const light of state.moduleLights) {
      light.visible = visible.has(light);
      if (light.visible) active++;
    }
    el.activeLights.textContent = String(active);
  }

  function applyLighting() {
    const flat = el.chkFlat.checked;
    const preset = el.chkLighting.checked && !flat;
    renderer.toneMapping = flat ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = flat ? 1.0 : 1.0;

    if (flat) {
      scene.background = new THREE.Color(0x8f9296);
      scene.fog = null;
      ambient.color.setHex(0xffffff);
      ambient.intensity = 2.6;
      hemi.intensity = 0;
      sun.intensity = 0;
      return;
    }

    if (!preset) {
      scene.background = new THREE.Color(0x171b20);
      scene.fog = null;
      ambient.color.setHex(0xffffff);
      ambient.intensity = 0.85;
      hemi.color.setHex(0xcfe3e8);
      hemi.groundColor.setHex(0x2b2b33);
      hemi.intensity = 0.45;
      sun.color.setHex(0xffffff);
      sun.intensity = 0.9;
      sun.position.set(40, 70, 30);
      return;
    }

    const floor = state.floorNumber;
    if (floor === 1) {
      scene.background = new THREE.Color(0xe4c69a);
      scene.fog = new THREE.Fog(0xdcbf95, 80, 260);
      ambient.color.setHex(0xffd7a8);
      ambient.intensity = 0.55;
      hemi.color.setHex(0xffe6c0);
      hemi.groundColor.setHex(0x6b5a3a);
      hemi.intensity = 0.6;
      sun.color.setHex(0xffcf8a);
      sun.intensity = 2.4;
      sun.position.set(45, 65, 35);
    } else if (floor === 2) {
      scene.background = new THREE.Color(0x9fc3c0);
      scene.fog = new THREE.Fog(0xa9c9c4, 40, 170);
      ambient.color.setHex(0xdaf0ec);
      ambient.intensity = 0.9;
      hemi.color.setHex(0xcfe9e6);
      hemi.groundColor.setHex(0x5f7a4a);
      hemi.intensity = 0.8;
      sun.color.setHex(0xeaf6ff);
      sun.intensity = 0.9;
      sun.position.set(-30, 40, -30); // from north-west
    } else if (floor === 5) {
      scene.background = new THREE.Color(0x0d2026);
      scene.fog = new THREE.Fog(0x153c42, 20, 130);
      ambient.color.setHex(0x2e4e56);
      ambient.intensity = 0.5;
      hemi.color.setHex(0x6fa0a8);
      hemi.groundColor.setHex(0x101a14);
      hemi.intensity = 0.5;
      sun.color.setHex(0x9fd0da);
      sun.intensity = 1.3;
      sun.position.set(35, 60, 25);
    } else {
      scene.background = new THREE.Color(0x1a3238);
      scene.fog = new THREE.Fog(0x1d4a55, 25, 160);
      ambient.color.setHex(0x355a66);
      ambient.intensity = 0.5;
      hemi.color.setHex(0x88b8c0);
      hemi.groundColor.setHex(0x16241a);
      hemi.intensity = 0.55;
      sun.color.setHex(0xbfe3ea);
      sun.intensity = 1.6;
      sun.position.set(35, 60, 20);
    }
  }

  function updateCameraFromAngles() {
    camera.rotation.order = 'YXZ';
    camera.rotation.set(pitch, yaw, 0);
  }

  function syncAnglesFromCamera() {
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    yaw = euler.y;
    pitch = euler.x;
  }

  function setPlayerView() {
    if (!state.assembled) return;
    const layout = state.assembled.layout;
    stopWalk();
    const next = layout.pathPolyline[1] || { x: layout.startPosition.x, z: layout.startPosition.z - 1 };
    const dx = next.x - layout.startPosition.x;
    const dz = next.z - layout.startPosition.z;
    yaw = Math.atan2(-dx, -dz);
    pitch = 0;
    camera.position.set(layout.startPosition.x, 1.7, layout.startPosition.z);
    updateCameraFromAngles();
  }

  function setBirdView() {
    if (!state.assembled) return;
    stopWalk();
    const b = state.assembled.layout.bounds;
    const cx = (b.minX + b.maxX) / 2;
    const cz = (b.minZ + b.maxZ) / 2;
    const size = Math.max(b.maxX - b.minX, b.maxZ - b.minZ);
    camera.position.set(cx, size * 0.95, cz + size * 0.55);
    camera.lookAt(cx, 0, cz);
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    yaw = euler.y;
    pitch = euler.x;
  }

  function resetCamera() {
    setBirdView();
  }

  function stopWalk() {
    if (state.walk) {
      state.walk = null;
      el.btnWalk.textContent = 'Walk the Path (4 m/s)';
      el.btnWalk.classList.remove('active');
      el.walkStatus.textContent = 'Free-fly';
    }
  }

  function startWalk() {
    if (!state.assembled) return;
    if (state.walk) {
      stopWalk();
      return;
    }
    const layout = state.assembled.layout;
    const segments = [];
    let total = 0;
    for (let i = 0; i < layout.pathPolyline.length - 1; i++) {
      const a = layout.pathPolyline[i];
      const b = layout.pathPolyline[i + 1];
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      if (length > 0.0001) {
        segments.push({ a, b, length, start: total });
        total += length;
      }
    }
    if (segments.length === 0) return;
    state.walk = { segments, total, distance: 0 };
    el.btnWalk.textContent = 'Stop Walking';
    el.btnWalk.classList.add('active');
    el.walkStatus.textContent = 'Walking the path at 4 m/s';
  }

  function samplePath(walk, distance) {
    const d = Math.max(0, Math.min(distance, walk.total));
    for (const seg of walk.segments) {
      if (d <= seg.start + seg.length) {
        const t = (d - seg.start) / seg.length;
        return {
          x: seg.a.x + (seg.b.x - seg.a.x) * t,
          z: seg.a.z + (seg.b.z - seg.a.z) * t,
        };
      }
    }
    const last = walk.segments[walk.segments.length - 1];
    return { x: last.b.x, z: last.b.z };
  }

  function updateWalk(dt) {
    if (!state.walk) return;
    state.walk.distance += 4 * dt;
    if (state.walk.distance >= state.walk.total) {
      state.walk.distance = state.walk.total;
      const pos = samplePath(state.walk, state.walk.distance);
      camera.position.set(pos.x, 1.7, pos.z);
      syncAnglesFromCamera();
      stopWalk();
      return;
    }
    const pos = samplePath(state.walk, state.walk.distance);
    const ahead = samplePath(state.walk, state.walk.distance + 2.0);
    camera.position.set(pos.x, 1.7, pos.z);
    camera.lookAt(ahead.x, 1.65, ahead.z);
    syncAnglesFromCamera();
  }

  function updateFly(dt) {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
    const move = new THREE.Vector3();
    if (keys.has('KeyW')) move.add(forward);
    if (keys.has('KeyS')) move.sub(forward);
    if (keys.has('KeyD')) move.add(right);
    if (keys.has('KeyA')) move.sub(right);
    if (keys.has('KeyE')) move.y += 1;
    if (keys.has('KeyQ')) move.y -= 1;
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(flySpeed * dt);
      camera.position.add(move);
    }
  }

  function buildFloor(seed, resetView) {
    stopWalk();
    if (state.assembled) {
      floorRoot.remove(state.assembled.group);
      state.assembled.dispose();
      state.assembled = null;
    }
    for (const entry of state.entries) {
      if (entry.dispose) entry.dispose();
    }
    state.entries = [];
    refsRoot.clear();
    for (const light of state.moduleLights) {
      if (light.parent) light.parent.remove(light);
    }
    state.moduleLights = [];

    state.gatesOpen = false;
    state.destroyedPillars = 0;
    el.btnGates.textContent = 'Open Gates';
    el.btnGates.classList.remove('active');

    state.assembled = assembleFloor(state.floorNumber, seed, state.quality);
    floorRoot.add(state.assembled.group);
    state.assembled.setGateState({ entranceOpen: false, exitOpen: false, arenaSealed: false });

    buildOverlays(state.assembled.layout);
    spawnReferences(state.assembled.layout);
    spawnModuleLights();
    applyLighting();

    const stats = state.assembled.getStats();
    el.floor.textContent = `${state.floorNumber} (${state.assembled.moduleName})`;
    el.seed.textContent = String(seed);
    el.moduleTris.textContent = Math.round(stats.triangles).toLocaleString();
    el.moduleCalls.textContent = String(stats.drawCallsEstimate);
    el.budgetTris.textContent = stats.budget.triangles.toLocaleString();
    el.budgetCalls.textContent = String(stats.budget.drawCalls);
    const hasArena = Boolean(state.assembled.layout.bossArena);
    el.btnPillar.disabled = !hasArena;
    el.btnPillar.textContent = hasArena ? 'Destroy Pillar' : 'No Pillars';
    el.colliderCount.textContent = String(
      state.assembled.layout.obstacles.length +
        (hasArena ? state.assembled.layout.bossArena.pillars.length : 0)
    );
    if (resetView) setBirdView();
    updateModuleLights();
  }

  function rebuildFloor(resetView) {
    const floor = parseInt(el.floorSelect.value, 10);
    state.floorNumber = Number.isFinite(floor) ? floor : 1;
    state.quality = el.qualitySelect.value;
    buildFloor(floorSeed(state.floorNumber), resetView);
  }

  function toggleGates() {
    state.gatesOpen = !state.gatesOpen;
    el.btnGates.textContent = state.gatesOpen ? 'Close Gates' : 'Open Gates';
    el.btnGates.classList.toggle('active', state.gatesOpen);
    if (state.assembled) {
      state.assembled.setGateState({
        entranceOpen: state.gatesOpen,
        exitOpen: state.gatesOpen,
        arenaSealed: false,
      });
    }
    syncGateOverlay();
  }

  function destroyNextPillar() {
    if (!state.assembled || !state.assembled.layout.bossArena) return;
    const pillars = state.assembled.layout.bossArena.pillars;
    if (state.destroyedPillars >= pillars.length) return;
    const index = state.destroyedPillars;
    const pillar = pillars[index];
    let destroyed = false;
    const art = state.assembled.art;
    if (typeof art.destroyPillar === 'function') {
      destroyed = art.destroyPillar(index);
    }
    if (!destroyed) {
      const mesh = art.group.getObjectByName(pillar.id);
      if (mesh) {
        mesh.visible = false;
        destroyed = true;
      }
    }
    const ring = overlayRoot.getObjectByName(`collider_pillar_${index}`);
    if (ring) ring.visible = false;
    state.destroyedPillars++;
    el.btnPillar.textContent =
      state.destroyedPillars >= pillars.length
        ? 'All Pillars Destroyed'
        : `Destroy Pillar (${pillars.length - state.destroyedPillars} left)`;
    if (state.destroyedPillars >= pillars.length) el.btnPillar.disabled = true;
  }

  function updateStats() {
    const assembled = state.assembled;
    if (!assembled) return;
    const stats = assembled.getStats();
    const tris = Math.round(stats.triangles);
    const calls = stats.drawCallsEstimate;
    el.moduleTris.textContent = tris.toLocaleString();
    el.moduleCalls.textContent = String(calls);
    el.moduleTris.className = stats.overTriangles ? 'stat-over' : 'stat-ok';
    el.moduleCalls.className = stats.overDrawCalls ? 'stat-over' : 'stat-ok';
    el.sceneTris.textContent = renderer.info.render.triangles.toLocaleString();
    el.sceneCalls.textContent = String(renderer.info.render.calls);
    const speed = state.walk ? '4' : flySpeed.toFixed(0);
    el.camSpeed.textContent = speed;
    el.camPos.textContent = `${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}`;
    el.fps.textContent = fpsValue.toFixed(0);
  }

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);
    elapsed += dt;
    fpsFrames++;
    fpsTimer += dt;

    if (state.walk) updateWalk(dt);
    else updateFly(dt);

    if (state.assembled) state.assembled.update(dt, elapsed, camera);

    lightTimer += dt;
    if (lightTimer >= 0.25) {
      lightTimer = 0;
      updateModuleLights();
    }

    renderer.render(scene, camera);

    statsTimer += dt;
    if (statsTimer >= 0.25) {
      statsTimer = 0;
      updateStats();
    }
    if (fpsTimer >= 0.5) {
      fpsValue = fpsFrames / fpsTimer;
      fpsFrames = 0;
      fpsTimer = 0;
    }
  }

  el.floorSelect.addEventListener('change', () => rebuildFloor(true));
  el.qualitySelect.addEventListener('change', () => rebuildFloor(false));
  el.btnGates.addEventListener('click', toggleGates);
  el.btnPillar.addEventListener('click', destroyNextPillar);
  el.btnWalk.addEventListener('click', startWalk);
  el.btnPlayer.addEventListener('click', setPlayerView);
  el.btnBird.addEventListener('click', () => setBirdView());
  el.btnReset.addEventListener('click', resetCamera);
  el.chkLighting.addEventListener('change', applyLighting);
  el.chkFlat.addEventListener('change', applyLighting);
  el.chkRefs.addEventListener('change', () => {
    refsRoot.visible = el.chkRefs.checked;
  });
  for (const chk of [el.chkPath, el.chkChokes, el.chkSpawns, el.chkAmbush, el.chkColliders, el.chkCamps, el.chkGates, el.chkBnds]) {
    chk.addEventListener('change', syncOverlayVisibility);
  }

  el.btnScreenshot.addEventListener('click', () => {
    renderer.render(scene, camera);
    const link = document.createElement('a');
    link.href = renderer.domElement.toDataURL('image/png');
    link.download = `floor-${state.floorNumber}-${state.quality}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

  const moveCodes = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE']);
  window.addEventListener('keydown', (event) => {
    if (moveCodes.has(event.code)) {
      keys.add(event.code);
      if (!state.walk) event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
    dragging = false;
  });

  renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (event.button !== 2) return;
    dragging = true;
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastPointer.x;
    const dy = event.clientY - lastPointer.y;
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;
    yaw -= dx * 0.0026;
    pitch -= dy * 0.0026;
    pitch = Math.max(-1.5, Math.min(1.5, pitch));
    if (!state.walk) updateCameraFromAngles();
  });
  renderer.domElement.addEventListener('pointerup', (event) => {
    if (event.button !== 2) return;
    dragging = false;
  });
  renderer.domElement.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      flySpeed *= Math.exp(-event.deltaY * 0.0012);
      flySpeed = Math.max(2, Math.min(140, flySpeed));
    },
    { passive: false }
  );

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  rebuildFloor(true);
  animate();
}

try {
  main();
} catch (error) {
  showError(error && error.stack ? error.stack : String(error));
}
