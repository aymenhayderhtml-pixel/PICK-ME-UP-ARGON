import * as THREE from 'three';

function groundPlane(layout) {
  const w = layout.bounds.maxX - layout.bounds.minX;
  const d = layout.bounds.maxZ - layout.bounds.minZ;
  const geo = new THREE.PlaneGeometry(w, d, 1, 1);
  geo.rotateX(-Math.PI / 2);
  geo.translate((layout.bounds.minX + layout.bounds.maxX) / 2, -0.02, (layout.bounds.minZ + layout.bounds.maxZ) / 2);
  return geo;
}

function ribbonGeometry(points, width) {
  const positions = [];
  const indices = [];
  const half = width / 2;
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    let dx = next.x - prev.x;
    let dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const nx = -dz * half;
    const nz = dx * half;
    positions.push(points[i].x + nx, 0.01, points[i].z + nz);
    positions.push(points[i].x - nx, 0.01, points[i].z - nz);
    if (i > 0) {
      const a = (i - 1) * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function gateGroup(spec, color) {
  const g = new THREE.Group();
  g.position.set(spec.position.x, 0, spec.position.z);
  g.rotation.y = spec.rotationY;
  const mat = new THREE.MeshBasicMaterial({ color });
  const half = spec.width / 2;
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 0.3), mat);
    post.position.set(side * (half - 0.15), 1.3, 0);
    g.add(post);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(spec.width, 0.25, 0.2), mat);
  bar.position.y = 1.9;
  bar.name = 'gate_bar';
  g.add(bar);
  return g;
}

export function buildForestFloorArt(ctx) {
  const { layout } = ctx;
  const group = new THREE.Group();
  group.name = 'forest_floor_art';

  const groundMat = new THREE.MeshToonMaterial({ color: 0x3c4a3a });
  const pathMat = new THREE.MeshToonMaterial({ color: 0x7c857d });
  const stoneMat = new THREE.MeshToonMaterial({ color: 0x8e9da3 });

  const ground = new THREE.Mesh(groundPlane(layout), groundMat);
  ground.name = 'ground';
  group.add(ground);

  const road = new THREE.Mesh(ribbonGeometry(layout.pathPolyline, layout.pathWidth), pathMat);
  road.name = 'road';
  group.add(road);

  for (const cl of layout.clearings) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(cl.radius, 32), pathMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(cl.center.x, 0.005, cl.center.z);
    group.add(disc);
  }

  const entranceGate = gateGroup(layout.entranceBarrier, 0x2b2623);
  const exitGate = gateGroup(layout.exitGate, 0x2b2623);
  group.add(entranceGate, exitGate);

  if (layout.bossArena) {
    for (const p of layout.bossArena.pillars) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(p.radius, p.radius * 1.15, p.height, 8), stoneMat);
      pillar.name = p.id;
      pillar.position.set(p.x, p.height / 2, p.z);
      group.add(pillar);
    }
    for (const w of layout.bossArena.wallSegments) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w.length, 2.4, 0.6), stoneMat);
      wall.position.set(w.x, 1.2, w.z);
      wall.rotation.y = w.rotationY;
      group.add(wall);
    }
  }

  const anchors = {
    entranceGate: new THREE.Vector3(layout.entranceBarrier.position.x, 0, layout.entranceBarrier.position.z),
    exitGate: new THREE.Vector3(layout.exitGate.position.x, 0, layout.exitGate.position.z),
    camps: layout.campSpots.map((c) => new THREE.Vector3(c.x, 0, c.z)),
  };
  if (layout.bossArena) {
    anchors.arena = new THREE.Vector3(layout.bossArena.center.x, 0, layout.bossArena.center.z);
    anchors.arenaEntrance = new THREE.Vector3(
      layout.bossArena.entrance.position.x,
      0,
      layout.bossArena.entrance.position.z
    );
  }

  function setGateState(state = {}) {
    const entranceBar = entranceGate.getObjectByName('gate_bar');
    const exitBar = exitGate.getObjectByName('gate_bar');
    if (entranceBar) entranceBar.visible = !state.entranceOpen;
    if (exitBar) exitBar.visible = !state.exitOpen;
  }

  function getStats() {
    let meshes = 0;
    let triangles = 0;
    const materials = new Set();
    group.traverse((obj) => {
      if (!obj.isMesh) return;
      meshes++;
      const geo = obj.geometry;
      const count = geo.index ? geo.index.count : geo.attributes.position.count;
      triangles += count / 3;
      materials.add(obj.material);
    });
    return { meshes, triangles, drawCallsEstimate: materials.size };
  }

  function destroyPillar(index) {
    if (!layout.bossArena) return false;
    const pillar = layout.bossArena.pillars[index];
    if (!pillar) return false;
    const mesh = group.getObjectByName(pillar.id);
    if (!mesh) return false;
    mesh.visible = false;
    return true;
  }

  return {
    group,
    anchors,
    lights: [],
    update() {},
    setQuality() {},
    setLighting() {},
    setGateState,
    destroyPillar,
    getStats,
    dispose() {
      const geos = new Set();
      const mats = new Set();
      group.traverse((obj) => {
        if (!obj.isMesh) return;
        geos.add(obj.geometry);
        mats.add(obj.material);
      });
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}
