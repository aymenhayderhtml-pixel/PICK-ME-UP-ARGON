# TowerScene Split Outline

This document outlines the structure, line ranges, calls, `this.` state interactions, and proposed modular groupings for [`TowerScene.js`](file:///home/aymen/Documents/ContextForge Games/pick-me-up (2)/src/scenes/TowerScene.js) (2045 lines).

---

## 1. Top-Level Blocks & Declarations

| Range | Name / Construct | One-line Purpose | Calls | `this.` Access | Proposed Group |
|---|---|---|---|---|---|
| **L1–30** | Import block | Module imports for Three.js, players, combat managers, UI, and state | None | None | **Setup** |
| **L32–35** | Scratch math vars (`_towerAimPlane`, `_towerRaycaster`, etc.) | Module-scoped scratch objects for cursor-to-world raycasting | None | None | **Setup** |
| **L40–47** | `FARM_FLOOR_LIGHTING` | Preset lighting parameters for Farm floor environments | None | None | **FloorLoader** |
| **L49–56** | `PRAIRIE_FLOOR_LIGHTING` | Preset lighting parameters for Prairie floor environments | None | None | **FloorLoader** |
| **L58–65** | `FOREST_FLOOR_LIGHTING` | Preset lighting parameters for Forest floor environments | None | None | **FloorLoader** |
| **L67–74** | `BRIGHT_FOREST_LIGHTING` | Preset lighting parameters for Bright Forest floor environments | None | None | **FloorLoader** |
| **L76** | `export class TowerScene` | Class declaration line | None | None | **Setup** |
| **L77–239** | `constructor(renderer, input)` | Instantiates scene state, sub-managers, pools, UI, and event listeners | `toggleAutoMode`, `initFloor`, `playOpeningTransition`, `setupInputs`, `getAimGroundPosition`, `handleCommandSelect`, `showHanShout` | Reads 16 fields, writes 70 fields | **Setup** |
| **L2045** | Class closing brace `}` | End of `TowerScene` class | None | None | **Setup** |

---

## 2. Class Methods Outline

| Range | Method Name | One-line Purpose | Methods Called | `this.` Fields Read | `this.` Fields Written | Proposed Group |
|---|---|---|---|---|---|---|
| **L77–239** | `constructor` | Initializes scene, camera, managers, UI, subscriptions | `toggleAutoMode`, `initFloor`, `playOpeningTransition`, `setupInputs`, `getAimGroundPosition`, `handleCommandSelect`, `showHanShout` | `ambLight`, `camera`, `dirLight`, `dropsManager`, `enemyManager`, `floorPointLights`, `hemiLight`, `hud`, `itemsManager`, `player`, `scene`, `sceneManager`, `spellSystem`, `squadAI`, `thirdPersonCamera`, `vfxPool` | 70 initialization fields | **Setup** |
| **L241–247** | `toggleAutoMode` | Toggles automated AI combat control on/off and updates HUD | *(none)* | `hud`, `isAutoMode` | `isAutoMode` | **CombatHandler** |
| **L249–628** | `initFloor` | Builds floor geometry, sets lighting, spawns party/enemies/boss, configures objectives | `applyFloorLighting`, `logScaleCheck` | `activeFloorLights`, `ambLight`, `arenaBarrierMesh`, `arrivalDome`, `boss`, `bossBar`, `bossTitleOverlay`, `camera`, `dailyDungeonType`, `dirLight`, `dropsManager`, `enemyManager`, `floorPointLights`, `forestFloor`, `hemiLight`, `hud`, `initialEnemyCount`, `input`, `isTutorial`, `itemsManager`, `materialNodes`, `partyPanel`, `player`, `projectilesManager`, `scene`, `spellSystem`, `squadAI`, `survivalTimerEl`, `telegraph`, `thirdPersonCamera` | `adaptiveQualityLowered`, `arenaBarrierMesh`, `arenaSealed`, `boss`, `bossIntroPlayed`, `bossTitleOverlay`, `currentFloorNumber`, `dailyDungeonType`, `difficulty`, `expeditionMaterials`, `f3IntroActive`, `f3IntroTimer`, `floorQuality`, `forestFloor`, `fps5sFrames`, `fps5sTimer`, `gatheredMaterials`, `hanDeathHandled`, `initialEnemiesSpawned`, `initialEnemyCount`, `introElapsed`, `introTimer`, `isIntroPlaying`, `isTutorial`, `materialNodes`, `miningTimer`, `mode`, `partySlotPositions`, `rewardWindowShown`, `scaleCheckLogged`, `slowMotionTimer`, `survivalTimer`, `survivalTimerEl`, `tutorialAmbushTriggered`, `tutorialNoviceDeathTimers` | **FloorLoader** |
| **L632–666** | `applyFloorLighting` | Applies ambient, hemisphere, and directional lighting presets for current floor | *(none)* | `ambLight`, `dirLight`, `hemiLight`, `renderer`, `scene` | *(none)* | **FloorLoader** |
| **L668–675** | `setupFloorLights` | Instantiates point light pools for decorative floor lights | *(none)* | `activeFloorLights`, `floorPointLights` | `floorLightTimer` | **FloorLoader** |
| **L679–722** | `updateFloorLights` | Culls and enables point lights near the player to optimize performance | *(none)* | `activeFloorLights`, `floorLightTimer`, `floorPointLights`, `forestFloor` | `activeFloorLights`, `floorLightTimer` | **FloorLoader** |
| **L724–729** | `applyFloorQuality` | Applies graphics quality tier (high/med/low) to active floor art | *(none)* | `forestFloor` | `floorQuality` | **FloorLoader** |
| **L732–745** | `updateAdaptiveQuality` | Adjusts floor visual quality dynamically if FPS drops below threshold | `applyFloorQuality` | `adaptiveQualityLowered`, `floorQuality`, `fps5sFrames`, `fps5sTimer` | `adaptiveQualityLowered`, `fps5sFrames`, `fps5sTimer`, `mode` | **UpdateLoop** |
| **L748–761** | `logScaleCheck` | Debug sanity check for character dimensions against world metrics | *(none)* | `player`, `scaleCheckLogged` | `scaleCheckLogged` | **Setup** |
| **L763–767** | `toggleArtVisibility` | Debug toggle for toggling visibility of procedural floor art | *(none)* | `forestFloor` | *(none)* | **FloorLoader** |
| **L770–773** | `forceOpenGates` | Debug command to force open arena/floor gates | *(none)* | `forestFloor` | *(none)* | **FloorLoader** |
| **L775–784** | `updateF3FloorStats` | Updates F3 floor performance metrics and light count overlay | `getSceneTotals` | `floorPointLights`, `forestFloor`, `hud` | *(none)* | **UpdateLoop** |
| **L786–798** | `getSceneTotals` | Traverses scene hierarchy to aggregate total meshes, triangles, and lights | *(none)* | `scene` | *(none)* | **UpdateLoop** |
| **L800–817** | `ensureDebugOverlay` | Lazily creates DOM debug overlay element | *(none)* | `debugOverlayEl` | `debugOverlayEl` | **Setup** |
| **L819–823** | `toggleDebugOverlay` | Toggles debug stats HUD display | `ensureDebugOverlay` | `debugOverlayEl`, `debugOverlayOpen` | `debugOverlayOpen` | **UpdateLoop** |
| **L825–843** | `updateDebugOverlay` | Refreshes real-time render metrics and floor stats in debug overlay | `getSceneTotals` | `currentFloorNumber`, `debugOverlayEl`, `debugOverlayOpen`, `floorPointLights`, `floorQuality`, `forestFloor`, `mode` | `mode` | **UpdateLoop** |
| **L845–915** | `playOpeningTransition` | Plays arrival camera animation sweep and intro floor banners | *(none)* | `camera` | `f3IntroActive`, `f3IntroTimer` | **FloorLoader** |
| **L917–1087** | `setupInputs` | Registers keyboard, mouse, wheel, and debug keybindings | `toggleAutoMode`, `initFloor`, `toggleArtVisibility`, `forceOpenGates`, `toggleDebugOverlay`, `getAimGroundPosition`, `handleCommandSelect` | `boss`, `commandWheel`, `currentFloorNumber`, `enemyManager`, `hud`, `input`, `isActive`, `itemsManager`, `player`, `scene`, `sceneManager`, `thirdPersonCamera` | `hanDeathHandled`, `isActive`, `mode`, `rewardWindowShown` | **Setup** |
| **L1089–1102** | `getAimGroundPosition` | Projects crosshair cursor ray onto ground plane for skill aiming | *(none)* | `camera`, `player` | *(none)* | **CombatHandler** |
| **L1104–1112** | `handleCommandSelect` | Issues squad tactical command to closest target or squad AI | `getClosestEnemyToCrosshair` | `squadAI` | *(none)* | **CombatHandler** |
| **L1114–1128** | `getClosestEnemyToCrosshair` | Finds alive enemy nearest to center screen / crosshair aim | *(none)* | `camera`, `enemyManager`, `player` | *(none)* | **CombatHandler** |
| **L1130–1153** | `showHanShout` | Displays speech balloon overlay above Han during story events | *(none)* | `hanShoutEl` | `hanShoutEl`, `hanShoutTimer` | **CombatHandler** |
| **L1155–1176** | `updateHanShout` | Updates screen position and duration timer of Han shout overlay | *(none)* | `camera`, `hanShoutEl`, `hanShoutTimer`, `player` | `hanShoutTimer` | **CombatHandler** |
| **L1178–1216** | `handleHanDeath` | Handles player defeat, party death camera, and defeat banner/transition | *(none)* | `hanDeathHandled`, `player`, `sceneManager` | `hanDeathHandled` | **CombatHandler** |
| **L1218–1263** | `openRewardWindow` | Shows victory screen and summarizes loot/expedition drops | *(none)* | `currentFloorNumber`, `difficulty`, `expeditionMaterials`, `gatheredMaterials`, `itemsManager`, `mode`, `player`, `rewardWindow`, `rewardWindowShown`, `squadAI` | `rewardWindowShown` | **CombatHandler** |
| **L1265–1295** | `enter` | Scene lifecycle entry: activates HUD, loads gear, and initializes floor | `initFloor`, `setupFloorLights`, `playOpeningTransition` | `forestFloor`, `hud`, `partyPanel`, `player`, `thirdPersonCamera` | `isActive` | **Setup** |
| **L1297–1372** | `exit` | Scene lifecycle exit: cleans up DOM overlays, camera, and entities | *(none)* | `activeFloorLights`, `arenaBarrierMesh`, `arrivalDome`, `boss`, `bossBar`, `bossTitleOverlay`, `camera`, `commandWheel`, `debugOverlayEl`, `dropsManager`, `enemyManager`, `floorPointLights`, `forestFloor`, `hanShoutEl`, `hud`, `itemsManager`, `partyPanel`, `projectilesManager`, `rewardWindow`, `scene`, `squadAI`, `survivalTimerEl`, `telegraph`, `thirdPersonCamera` | `arenaBarrierMesh`, `boss`, `bossTitleOverlay`, `debugOverlayOpen`, `forestFloor`, `hanShoutTimer`, `isActive`, `survivalTimerEl` | **Setup** |
| **L1374–1418** | `showBossTitleOverlay` | Renders animated DOM boss title overlay during boss intro | *(none)* | `bossTitleOverlay` | `bossTitleOverlay` | **CombatHandler** |
| **L1420–2044** | `update` | Per-frame update loop: input, AI, combat, timers, encounters, camera | `updateFloorLights`, `updateAdaptiveQuality`, `updateF3FloorStats`, `updateDebugOverlay`, `updateHanShout`, `handleHanDeath`, `openRewardWindow`, `showBossTitleOverlay` | Reads 40 fields | Writes 17 fields | **UpdateLoop** |

---

## 3. Structural Summary & Inter-Method Call Graph

### Key Structural Landmarks
- **Import Statements**: Lines 1–30
- **Scratch & Lighting Constants**: Lines 32–74
- **Class Declaration**: Line 76 (`export class TowerScene {`)
- **Constructor Range**: Lines 77–239
- **Lifecycle Methods**: `enter` (1265–1295), `exit` (1297–1372), `update` (1420–2044)

### Call Dependencies (`Caller -> [Callees]`)
```
constructor -> [toggleAutoMode, initFloor, playOpeningTransition, setupInputs, getAimGroundPosition, handleCommandSelect, showHanShout]
enter -> [initFloor, setupFloorLights, playOpeningTransition]
initFloor -> [applyFloorLighting, logScaleCheck]
updateAdaptiveQuality -> [applyFloorQuality]
updateF3FloorStats -> [getSceneTotals]
toggleDebugOverlay -> [ensureDebugOverlay]
updateDebugOverlay -> [getSceneTotals]
setupInputs -> [toggleAutoMode, initFloor, toggleArtVisibility, forceOpenGates, toggleDebugOverlay, getAimGroundPosition, handleCommandSelect]
handleCommandSelect -> [getClosestEnemyToCrosshair]
update -> [updateFloorLights, updateAdaptiveQuality, updateF3FloorStats, updateDebugOverlay, updateHanShout, handleHanDeath, openRewardWindow, showBossTitleOverlay]
```

---

## 4. Proposed Groups & Architecture Constraints

### Proposed Groups
1. **Setup (`src/scenes/tower/TowerScene.js` or `TowerSetup.js`)**
   - Lines 1–35, 76–239, 748–761, 800–817, 917–1087, 1265–1372, 2045.
   - Core scene class lifecycle, event setup, input listeners, debug overlay construction.
2. **FloorLoader (`src/scenes/tower/FloorLoader.js`)**
   - Lines 40–74, 249–628, 632–729, 763–773, 845–915.
   - Floor presets, floor building/instantiation, lighting setups, opening camera flythrough, gate controls.
3. **CombatHandler (`src/scenes/tower/TowerCombat.js` or `CombatHandler.js`)**
   - Lines 241–247, 1089–1263, 1374–1418.
   - Targeting raycasts, tactical commands, Han death/defeat handling, shout UI, boss banners, reward loot window.
4. **UpdateLoop (`src/scenes/tower/TowerUpdate.js` or `UpdateLoop.js`)**
   - Lines 732–745, 775–798, 819–843, 1420–2044.
   - Per-frame ticks, adaptive quality checks, debug metrics refresh, enemy and encounter ticking.

### Architectural Constraint Note: `this` Access
> [!IMPORTANT]
> **Every single method in `TowerScene` reads and/or writes properties directly on `this`.**
> No method can be extracted into an independent standalone function without either:
> 1. Passing the `TowerScene` instance (`scene` context) as the first argument (e.g. `updateFloorLights(scene, delta, playerPos)` or `initFloor(scene, floorNumber, ...)`).
> 2. Binding or delegating via helper controller classes that hold a reference to `this` (e.g. `this.floorLoader = new FloorLoader(this)`).
>
> Moving any block without keeping access to `this` would break the game immediately due to tight state coupling across entities, managers, and UI elements.
