import * as THREE from 'three';

export function disposeGroup(root) {
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

export function makeLine(points, color, y = 0.06) {
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

export function makeLoop(points, color, y = 0.06) {
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

export function circlePoints(x, z, radius, segments = 28) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: x + Math.cos(a) * radius, z: z + Math.sin(a) * radius });
  }
  return pts;
}

export function makeRing(x, z, radius, color, y = 0.07, segments = 28) {
  return makeLoop(circlePoints(x, z, radius, segments), color, y);
}

export function buildFloorOverlays(layout, overlayRoot, state, el) {
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
  syncFloorOverlayVisibility(state, el);
  syncFloorGateOverlay(state);
}

export function syncFloorOverlayVisibility(state, el) {
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

export function syncFloorGateOverlay(state) {
  const color = state.gatesOpen ? 0x4ade80 : 0xef4444;
  for (const line of state.gateLines) line.material.color.setHex(color);
}

export function applyFloorLighting({ state, el, renderer, scene, ambient, hemi, sun }) {
  const flat = el.chkFlat.checked;
  const preset = el.chkLighting.checked && !flat;
  renderer.toneMapping = flat ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

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
    sun.position.set(-30, 40, -30);
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