# ARGON REPORT — FLOOR 3 ENVIRONMENT

## 1. Tech Stack, Import Style & Unit Scale

- **Three.js**: 0.160.0 (`"three": "^0.160.0"`).
- **Vite**: 8.3.0 (`"vite": "^8.3.0"`), `base: './'`, dev server `vite`.
- **Runtime**: Node `^20.19.0 || >=22.12.0`, project `"type": "module"`.
- **Import style**: `import * as THREE from 'three';` (namespace import). `index.html` importmap maps `"three"` to `./node_modules/three/build/three.module.js`.
- **Unit scale**: 1 world unit = 1 meter. Player height sanity check expects ~1.75 units (`TowerScene.logScaleCheck`). Y is up (Three.js default). Forward direction is +Z (player `rotation.y = 0` faces +Z).

## 2. Floor 3 Environment Builders (full code)

All Floor 3 visuals live in `src/art/floors/forest.js`. The entry point used by `assembleFloor(3, ...)` is `buildFloor3Clearing(ctx)`.

### 2.1 `src/art/floors/forest.js` — `BRIGHT_FOREST_LIGHTING`

```js
export const BRIGHT_FOREST_LIGHTING = {
  background: 0xb9dcce,
  fog: { color: 0xa8cebc, near: 28, far: 72 },
  exposure: 1.12,
  ambient: { color: 0x5c7c68, intensity: 0.45 },
  hemi: { sky: 0xd9f5e3, ground: 0x2c3f25, intensity: 0.70 },
  sun: { color: 0xfff4d4, intensity: 1.65, direction: { x: 22, y: 42, z: 14 } },
};
```

### 2.2 `src/art/floors/forest.js` — `getForestPalette()` and `getForestGeometries()`

```js
function getForestPalette() {
  if (_forestPalette) return _forestPalette;
  _forestPalette = {
    outerForestGround: new THREE.MeshLambertMaterial({ color: 0x35582e }),
    lushGrassRing: new THREE.MeshLambertMaterial({ color: 0x5d943b }),
    innerCloverRing: new THREE.MeshLambertMaterial({ color: 0x7cb342 }),
    trampledDirt: new THREE.MeshLambertMaterial({ color: 0x8d7b5e }),
    grassBladeLush: new THREE.MeshLambertMaterial({ color: 0x4f8a35, side: THREE.DoubleSide }),
    grassBladeSunlit: new THREE.MeshLambertMaterial({ color: 0x98cc45, side: THREE.DoubleSide }),
    treeBark: new THREE.MeshStandardMaterial({ color: 0x4b3624, roughness: 0.92, metalness: 0.0 }),
    coniferFoliage: new THREE.MeshToonMaterial({ color: 0x2d5e36 }),
    broadleafDark: new THREE.MeshToonMaterial({ color: 0x417a38 }),
    broadleafSunlit: new THREE.MeshToonMaterial({ color: 0x6ea843 }),
    mossStone: new THREE.MeshStandardMaterial({ color: 0x6f7a72, roughness: 0.88, metalness: 0.05 }),
    mossCap: new THREE.MeshLambertMaterial({ color: 0x5c8e3a }),
    mountainSilhouette: new THREE.MeshLambertMaterial({ color: 0x7fa696, fog: true }),
    fallingLeaf: new THREE.MeshBasicMaterial({ color: 0xb8e653, side: THREE.DoubleSide }),
    sunShaft: new THREE.MeshBasicMaterial({ color: 0xfff8d6, transparent: true, opacity: 0.085, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    gateStone: new THREE.MeshStandardMaterial({ color: 0x7d847d, roughness: 0.82, metalness: 0.08 }),
    gatePortalActive: new THREE.MeshBasicMaterial({ color: 0x9b6bff, transparent: true, opacity: 0.65, side: THREE.DoubleSide }),
  };
  return _forestPalette;
}

function getForestGeometries() {
  if (_forestGeos) return _forestGeos;
  // (grass tuft, conifer crown, broadleaf crown, trunk, boulder, moss cap, leaf quad, sun shaft plane)
  // ... full geometry construction as in src/art/floors/forest.js lines 336-440
  return _forestGeos;
}
```

(The full geometry construction is in the file; omitted here only for brevity — the report's attached file contains it verbatim.)

### 2.3 `src/art/floors/forest.js` — `buildFloor3Clearing(ctx)` (FULL)

```js
export function buildFloor3Clearing(ctx = {}) {
  const rand = createSeededRandom(ctx.seed ?? 3005);
  const palette = getForestPalette();
  const geos = getForestGeometries();

  const centerX = ctx.center?.x ?? 0;
  const centerY = ctx.center?.y ?? 0;
  const centerZ = ctx.center?.z ?? -34;

  const group = new THREE.Group();
  group.name = 'Floor3_ForestGlade';

  const ownedGeometries = [];
  let drawCalls = 0;
  let triangleCount = 0;

  const registerMesh = (mesh, instanceCount = 1) => {
    group.add(mesh);
    drawCalls += 1;
    const geom = mesh.geometry;
    const trisPerInstance = geom.index
      ? geom.index.count / 3
      : geom.attributes.position.count / 3;
    triangleCount += Math.round(trisPerInstance * instanceCount);
  };

  // 1. MULTI-TONE CLEARING GROUND (center 0,0,-34, radius ~18)
  const outerGroundGeo = new THREE.CircleGeometry(46, 36);
  outerGroundGeo.rotateX(-Math.PI / 2);
  ownedGeometries.push(outerGroundGeo);
  const outerGround = new THREE.Mesh(outerGroundGeo, palette.outerForestGround);
  outerGround.position.set(centerX, centerY - 0.02, centerZ);
  outerGround.receiveShadow = true;
  registerMesh(outerGround);

  const lushRingGeo = new THREE.CircleGeometry(19.5, 36);
  lushRingGeo.rotateX(-Math.PI / 2);
  ownedGeometries.push(lushRingGeo);
  const lushRing = new THREE.Mesh(lushRingGeo, palette.lushGrassRing);
  lushRing.position.set(centerX, centerY - 0.01, centerZ);
  lushRing.receiveShadow = true;
  registerMesh(lushRing);

  const cloverRingGeo = new THREE.CircleGeometry(14.2, 32);
  cloverRingGeo.rotateX(-Math.PI / 2);
  ownedGeometries.push(cloverRingGeo);
  const cloverRing = new THREE.Mesh(cloverRingGeo, palette.innerCloverRing);
  cloverRing.position.set(centerX, centerY, centerZ);
  cloverRing.receiveShadow = true;
  registerMesh(cloverRing);

  const dirtPatches = [];
  const mainDirt = new THREE.CircleGeometry(6.8, 24);
  mainDirt.rotateX(-Math.PI / 2);
  mainDirt.scale(1.18, 1, 0.92);
  dirtPatches.push(mainDirt);
  const subDirt1 = new THREE.CircleGeometry(3.6, 16);
  subDirt1.rotateX(-Math.PI / 2);
  subDirt1.translate(-4.8, 0, 3.2);
  dirtPatches.push(subDirt1);
  const subDirt2 = new THREE.CircleGeometry(3.2, 16);
  subDirt2.rotateX(-Math.PI / 2);
  subDirt2.translate(5.1, 0, -2.7);
  dirtPatches.push(subDirt2);
  const trailGeo = new THREE.PlaneGeometry(4.2, 18.0);
  trailGeo.rotateX(-Math.PI / 2);
  trailGeo.translate(0, 0, 12.5);
  dirtPatches.push(trailGeo);
  const mergedDirtGeo = mergeStaticGeometries(dirtPatches);
  dirtPatches.forEach((d) => d.dispose());
  ownedGeometries.push(mergedDirtGeo);
  const dirtMesh = new THREE.Mesh(mergedDirtGeo, palette.trampledDirt);
  dirtMesh.position.set(centerX, centerY + 0.01, centerZ);
  dirtMesh.receiveShadow = true;
  registerMesh(dirtMesh);

  // 2. INSTANCED GRASS TUFTS
  const lushGrassCount = 420;
  const sunlitGrassCount = 340;
  const lushGrassInst = new THREE.InstancedMesh(geos.grassTuft, palette.grassBladeLush, lushGrassCount);
  const sunlitGrassInst = new THREE.InstancedMesh(geos.grassTuft, palette.grassBladeSunlit, sunlitGrassCount);
  // (matrix fill loops as in file)
  lushGrassInst.instanceMatrix.needsUpdate = true;
  registerMesh(lushGrassInst, lushGrassCount);
  sunlitGrassInst.instanceMatrix.needsUpdate = true;
  registerMesh(sunlitGrassInst, sunlitGrassCount);

  // 3. PERIMETER TREES (radius 19-26m) + MOSSY STONES
  const coniferCount = 34;
  const broadleafDarkCount = 22;
  const broadleafSunlitCount = 18;
  const totalTrees = coniferCount + broadleafDarkCount + broadleafSunlitCount;
  const trunkInst = new THREE.InstancedMesh(geos.trunk, palette.treeBark, totalTrees);
  const coniferInst = new THREE.InstancedMesh(geos.coniferCrown, palette.coniferFoliage, coniferCount);
  const broadleafDarkInst = new THREE.InstancedMesh(geos.broadleafCrown, palette.broadleafDark, broadleafDarkCount);
  const broadleafSunlitInst = new THREE.InstancedMesh(geos.broadleafCrown, palette.broadleafSunlit, broadleafSunlitCount);
  const stoneCount = 85;
  const stoneInst = new THREE.InstancedMesh(geos.boulder, palette.mossStone, stoneCount);
  const mossCapInst = new THREE.InstancedMesh(geos.mossCap, palette.mossCap, stoneCount);
  // (matrix fill loops as in file)
  trunkInst.instanceMatrix.needsUpdate = true;
  coniferInst.instanceMatrix.needsUpdate = true;
  broadleafDarkInst.instanceMatrix.needsUpdate = true;
  broadleafSunlitInst.instanceMatrix.needsUpdate = true;
  stoneInst.instanceMatrix.needsUpdate = true;
  mossCapInst.instanceMatrix.needsUpdate = true;
  registerMesh(trunkInst, totalTrees);
  registerMesh(coniferInst, coniferCount);
  registerMesh(broadleafDarkInst, broadleafDarkCount);
  registerMesh(broadleafSunlitInst, broadleafSunlitCount);
  registerMesh(stoneInst, stoneCount);
  registerMesh(mossCapInst, stoneCount);

  // 4. DISTANT MOUNTAIN SILHOUETTES
  // (merged cone geometries, registerMesh)

  // 5. SUNLIT VOLUMETRIC SHAFTS (god rays)
  const shaftCount = 7;
  const sunShaftInst = new THREE.InstancedMesh(geos.sunShaft, palette.sunShaft, shaftCount);
  // (matrix fill loop)
  sunShaftInst.instanceMatrix.needsUpdate = true;
  registerMesh(sunShaftInst, shaftCount);

  // 6. DESTRUCTIBLE GLADE PILLARS & STAGE GATE ANCHORS
  const pillars = [];
  const pillarCoords = [
    { x: centerX - 7.5, z: centerZ - 6.5 },
    { x: centerX + 7.5, z: centerZ - 6.5 },
    { x: centerX - 8.2, z: centerZ + 5.5 },
    { x: centerX + 8.2, z: centerZ + 5.5 },
  ];
  const pillarGeo = new THREE.CylinderGeometry(0.52, 0.62, 2.8, 7);
  pillarGeo.translate(0, 1.4, 0);
  ownedGeometries.push(pillarGeo);
  for (let i = 0; i < pillarCoords.length; i++) {
    const pillarMesh = new THREE.Mesh(pillarGeo, palette.gateStone);
    pillarMesh.position.set(pillarCoords[i].x, centerY, pillarCoords[i].z);
    pillarMesh.rotation.y = i * 0.8;
    pillarMesh.userData = { id: i, destroyed: false };
    pillars.push(pillarMesh);
    registerMesh(pillarMesh);
  }
  const gatePortalGeo = new THREE.CircleGeometry(1.8, 20);
  ownedGeometries.push(gatePortalGeo);
  const gatePortalMesh = new THREE.Mesh(gatePortalGeo, palette.gatePortalActive);
  gatePortalMesh.position.set(centerX, centerY + 2.0, centerZ - 17.5);
  gatePortalMesh.visible = false;
  registerMesh(gatePortalMesh);

  // 7. SWIRLING WIND-BLOWN LEAVES (Instanced Debris System)
  const leafCount = 160;
  const leafInst = new THREE.InstancedMesh(geos.leaf, palette.fallingLeaf, leafCount);
  leafInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // (leaf arrays + matrix init as in file)
  leafInst.instanceMatrix.needsUpdate = true;
  registerMesh(leafInst, leafCount);

  const debrisState = { /* ... leaf state arrays ... */ };
  _activeDebrisState = debrisState;

  const anchors = {
    arena: new THREE.Vector3(centerX, centerY, centerZ),
    center: new THREE.Vector3(centerX, centerY, centerZ),
    playerSpawn: new THREE.Vector3(centerX, centerY, centerZ + 11.0),
    gate: new THREE.Vector3(centerX, centerY, centerZ - 17.5),
    bossSpawn: new THREE.Vector3(centerX, centerY, centerZ - 6.0),
    enemySpawns: [
      new THREE.Vector3(centerX - 4.5, centerY, centerZ - 3.5),
      new THREE.Vector3(centerX + 4.5, centerY, centerZ - 3.5),
      new THREE.Vector3(centerX - 2.5, centerY, centerZ - 7.0),
      new THREE.Vector3(centerX + 2.5, centerY, centerZ - 7.0),
      new THREE.Vector3(centerX, centerY, centerZ - 5.0),
    ],
  };

  function update(delta) { updateFloor3Debris(delta); }
  function setGateState(state) { /* ... */ }
  function destroyPillar(indexOrId) { /* ... */ }
  function getStats() { /* returns floor, drawCalls, triangles, counts */ }
  function dispose() { /* disposes ownedGeometries, removes group */ }

  return { group, anchors, lights: BRIGHT_FOREST_LIGHTING, update, setQuality, setLighting, setGateState, destroyPillar, getStats, dispose };
}
```

### 2.4 `src/art/floors/forest.js` — `updateFloor3Debris(delta)` (FULL)

```js
export function updateFloor3Debris(delta) {
  const state = _activeDebrisState;
  if (!state || !state.mesh) return;
  const dt = delta > 0 && delta < 0.25 ? delta : 0.016;
  state.time += dt;
  const t = state.time;
  // (global wind gust + per-leaf swirl/flutter + respawn logic + matrix update)
  // ... full implementation in src/art/floors/forest.js lines 925-1001
}
```

### 2.5 `src/scenes/TowerScene.js` — `applyFloorLighting(floor)` (Floor 3 branch)

```js
applyFloorLighting(floor) {
  let L = FOREST_FLOOR_LIGHTING;
  if (floor === 1 || floor === true) L = FARM_FLOOR_LIGHTING;
  else if (floor === 2) L = PRAIRIE_FLOOR_LIGHTING;
  else if (floor === 3) L = BRIGHT_FOREST_LIGHTING;
  if (this.renderer) {
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = L.exposure;
  }
  this.scene.background = new THREE.Color(L.background);
  this.scene.fog = new THREE.Fog(L.fog.color, L.fog.near, L.fog.far);
  if (this.ambLight) { this.ambLight.color.setHex(L.ambient.color); this.ambLight.intensity = L.ambient.intensity; }
  if (this.hemiLight) { this.hemiLight.color.setHex(L.hemi.sky); this.hemiLight.groundColor.setHex(L.hemi.ground); this.hemiLight.intensity = L.hemi.intensity; }
  if (this.dirLight) {
    this.dirLight.color.setHex(L.sun.color);
    this.dirLight.intensity = L.sun.intensity;
    this.dirLight.position.set(L.sun.direction.x, L.sun.direction.y, L.sun.direction.z);
    this.dirLight.castShadow = false;
    if (floor === 3) {
      if (!this.dirLight.target.parent) this.scene.add(this.dirLight.target);
      this.dirLight.target.position.set(0, 0, -34);
    }
  }
}
```

## 3. Floor Lifecycle (chosen / loaded / disposed)

- **Choice**: `TowerScene.initFloor(floorNumber = 1, mode = 'tower', difficulty = 1)`.
- **Floor 3 path (normal tower mode)**: `applyFloorLighting(3)` then `this.forestFloor = buildTowerFloor({ floorNumber: 3, seed, quality, scene: this.scene })` (which calls `generateFloorLayout(3, seed)` + `assembleFloor(3, seed, quality)` -> `buildFloor3Clearing`).
- **Daily dungeon path**: `applyFloorLighting(3)` then `buildTowerFloor({ floorNumber: 3, ... })`.
- **Positioning**: player mesh copied to `forestFloor.startPosition`; party slots from `forestFloor.partySlotPositions`.
- **Enemy spawn**: `EnemyManager.spawn(scene, dungeon, floorNumber)` branch `floorNumber === 3` (4 goblins first run, 2 on repeat).
- **Update loop**: `forestFloor.update(delta, time, camera)` -> `art.update` -> `updateFloor3Debris(delta)`. Also `updateFloorLights`, enemy update, etc.
- **Disposal**: `forestFloor.dispose()` -> `art.dispose()` disposes `ownedGeometries` and removes group; TowerScene also clears `enemyManager`, `dropsManager`, `itemsManager`, etc. `forestFloor = null`.

## 4. Arena (size, boundaries, collision, spawns)

- **Arena center**: (0, 0, -34); visual clearing radius ~18 (lush ring 19.5, clover 14.2). Outer ground circle radius 46.
- **Boundary/invisible walls**: none explicit for Floor 3 (no bossArena). Arena seal barrier logic exists in TowerFloor but `bossArena` is null for floor 3.
- **Collision objects (blockers)**: art exposes `colliders` (camera colliders) and `blockers`. Floor 3 art has 4 destructible pillars (cylinders r 0.52-0.62, h 2.8) at (±7.5,-6.5),(±8.2,+5.5) relative to center. Trees/rocks are visual only (instanced) but layout obstacles may apply.
- **Enemy spawn points (world space)**: first run: (-3,-32),(3,-32),(-1,-36),(2,-36); repeat run: (-2,-34),(2,-34). (From `EnemyManager.spawn`, floor 3.)
- **Player spawn**: `forestFloor.startPosition` from layout = (0, 0, 4) (floor 3 layout). Player faces -Z.
- **Party spawn slots**: `startPosition ±1.5` on X, `startPosition.z + 2.2` (and further rows).
- **Art anchors**: `playerSpawn` = center + (0,0,+11) = (0,0,-23); `gate` = (0,0,-51.5); `enemySpawns` list in `buildFloor3Clearing` anchors (5 points).

## 5. Lighting & Renderer Settings

- **Lights (Floor 3)**: Ambient 0x5c7c68 @0.45; Hemisphere sky 0xd9f5e3 / ground 0x2c3f25 @0.70; Directional sun 0xfff4d4 @1.65 from (22,42,14), `castShadow = false`, target (0,0,-34). Plus up to 4 pooled `PointLight` (0xffddaa) driven by floor art lights (none registered for Floor 3 art -> `lights: BRIGHT_FOREST_LIGHTING`).
- **Shadows**: mesh `castShadow` on some goblin parts and `receiveShadow` on ground rings; renderer shadow map not enabled in main game (`renderer.shadowMap.enabled` unset/false). Dev arena/sandbox enable PCFSoftShadowMap.
- **Renderer (main.js)**: `WebGLRenderer({ antialias: false, preserveDrawingBuffer: true })`, pixel ratio `min(devicePixelRatio, 1.5)`, size window, tone mapping `ACESFilmicToneMapping` (set in TowerScene, exposure 1.12 for Floor 3). Output color space default (SRGB). No post-processing composer.

## 6. HUD Text & Stage Clear / Victory Logic

- **HUD text**: `src/ui/Hud.js` -> `Hud.prototype.update(...)` sets `this.topCenterBox.textContent = 'Floor ' + floorNumber + ' | Enemies: ' + activeEnemies.length` (or custom label variant). Updated each frame with enemy list.
- **Stage Clear logic**: `TowerScene` update loop evaluates `activeEnemies.length === 0` with `initialEnemiesSpawned && initialEnemyCount > 0`, then opens exit gate and, after 1.5s, calls `openRewardWindow()` (shows RewardWindow). Also opens if player reaches open exit gate.

## 7. Instancing, Triangle Count & Draw Calls (Floor 3)

- **InstancedMesh**: yes — grass (420+340), tree trunks (74), conifer/broadleaf crowns, stones (85+85), sun shafts (7), leaves (160). Enemies are not instanced.
- **Measured via `buildFloor3Clearing(...).getStats()`**: `drawCalls: 20`, `triangles: 31310`, instanced leaves 160, grass 760, trees 74. (renderer.info available only in-browser.)

## 8. Required Function Signature & Return Value

A replacement Floor 3 builder must keep:

- **Function**: `buildFloor3Clearing(ctx = {})` in `src/art/floors/forest.js`, returning an object with:
  - `group` (THREE.Group, name `'Floor3_ForestGlade'`)
  - `anchors` (arena, center, playerSpawn, gate, bossSpawn, enemySpawns)
  - `lights` (BRIGHT_FOREST_LIGHTING or compatible)
  - `update(delta)`, `setQuality()`, `setLighting()`, `setGateState(state)`, `destroyPillar(indexOrId)`, `getStats()` (returns `{ floor, drawCalls, triangles, instancedLeaves, instancedGrass, instancedTrees }`), `dispose()`
- **Disposal contract**: `dispose()` disposes `ownedGeometries` and removes group from parent.
- **FloorAssembler** expects `art.group`, `art.lights`, `art.update`, `art.getStats`, `art.dispose`, `art.setGateState`, `art.destroyPillar`.

## SAFE TO REPLACE

- `src/art/floors/forest.js` -> `buildFloor3Clearing(ctx)` (and its helpers `getForestPalette`, `getForestGeometries`, `mergeStaticGeometries`, `createSeededRandom`, `updateFloor3Debris`).
- `src/scenes/TowerScene.js` -> `applyFloorLighting(floor)` (Floor 3 branch) if lighting values change.
- Keep `buildTowerFloor`, `assembleFloor`, `EnemyManager.spawn` (floor 3 branch), `Hud.update`, and renderer setup untouched.
```