# REFACTOR LOG — enemies.js Refactor

## enemies.js exports BEFORE
- ENEMY_POSES (const array)
- ENEMY_TYPES (const array)
- POSE_INFO (const object)
- createEnemyModel (function)
- createGnollWarriorModel (function)

## enemies.js exports AFTER
- ENEMY_POSES (const array)
- ENEMY_TYPES (const array)
- POSE_INFO (const object)
- createEnemyModel (function)
- createGnollWarriorModel (function)

## STEP 2 RESULT
### New file list with line counts:
- src/enemies/shared.js: 485 lines
- src/enemies/models/ArmoredGoblin.js: 790 lines
- src/enemies/models/EnemyFactory.js: 598 lines
- src/enemies/models/Geometries.js: 401 lines
- src/enemies/models/Wolf.js: 272 lines
- src/enemies/models/WolfAssets.js: 572 lines
- src/enemies/poses/bipedPoses.js: 302 lines
- src/enemies/poses/poseInfo.js: 32 lines
- src/enemies/poses/wolfPoses.js: 538 lines
- src/enemies/index.js: 28 lines
- src/art/enemies.js (compatibility re-export): 2 lines

All files are strictly under the 800-line ceiling.

### Problems found and resolved:
1. `applyBipedPose` in `bipedPoses.js` originally referenced variables (`applyExpressionOffsets`, `tongueMesh`, `orbMat`, `healRingMesh`, `bowStringMesh`) that were declared inside `createEnemyModel`. These were explicitly passed into `applyBipedPose` as parameters, preserving identical zero-GC behavior.
2. `ArmoredGoblin.js` required an import of `POSE_INFO` from `../poses/poseInfo.js` to evaluate poses without relying on global scope.

### Anything done differently:
- Wolf logic was cleanly organized into procedural assets (`WolfAssets.js`), quad poses (`wolfPoses.js`), and model controller (`Wolf.js`), keeping all components modular, under 800 lines, and strictly acyclic.
- `src/art/enemies.js` remains as a thin 2-line compatibility file (`export * from '../enemies/index.js';`) so all existing callers across the codebase continue to work seamlessly.

## HUB outline

Methods with line ranges from original `src/scenes/HubScene.js` (1813 lines) and their target groups:

### Retained in HubScene.js
- imports and class declaration
- constructor: lines 47-327

### Group 1: TownInit (TownInitMixin.js)
Town setup, building interactions, layout, signposts, and scene entry:
- 329-361: `playAnvilClang` (33 lines)
- 363-401: `playAwakeningEffect` (39 lines)
- 403-408: `checkWalkable` (6 lines)
- 410-417: `getCottagePosition` (8 lines)
- 419-463: `getNearestBuilding` (45 lines)
- 465-477: `playRiftFlash` (13 lines)
- 479-705: `setupInputs` (227 lines)
- 711-727: `requestTowerDeploy` (17 lines)
- 729-747: `isTowerGateLocked` (19 lines)
- 752-772: `createSignLabels` (21 lines)
- 774-883: `enter` (110 lines)

### Group 2: NPCDialogue (NPCDialogueMixin.js)
NPC interactions, offline report simulation, tutorial sequences, and punishments:
- 890-908: `checkOfflineLoginReport` (19 lines)
- 913-927: `playHeroDissolve` (15 lines)
- 934-945: `startPendingTownFights` (12 lines)
- 948-959: `showLatestIselleReport` (12 lines)
- 965-976: `feedSquadAtMessHall` (12 lines)
- 978-1044: `checkTutorial` (67 lines)
- 1046-1102: `playTutorialWalkout` (57 lines)
- 1104-1120: `triggerScriptedPunishment` (17 lines)
- 1122-1129: `showIselleEquipmentPrompt` (8 lines)
- 1131-1173: `playJennaAaronWalkout` (43 lines)

### Group 3: HubUpdate (HubUpdateMixin.js)
Collision debugging, walk height debugging, teardown/exit, showcase effects, lighting, and per-frame update loop:
- 1179-1219: `buildColliderDebug` (41 lines)
- 1221-1229: `clearColliderDebug` (9 lines)
- 1231-1245: `toggleWalkHeightDebug` (15 lines)
- 1247-1283: `updateWalkHeightDebug` (37 lines)
- 1285-1355: `exit` (71 lines)
- 1357-1389: `triggerForgeShowcase` (33 lines)
- 1391-1421: `applyLighting` (31 lines)
- 1423-1463: `updatePointLightPool` (41 lines)
- 1465-1488: `checkAdaptiveQuality` (24 lines)
- 1490-1512: `updateF3DebugStats` (23 lines)
- 1514-1812: `update` (299 lines)

## STEP 5 RESULT
### New file list with line counts:
- `src/scenes/hub/TownInitMixin.js`: 572 lines
- `src/scenes/hub/NPCDialogueMixin.js`: 308 lines
- `src/scenes/hub/HubUpdateMixin.js`: 656 lines
- `src/scenes/HubScene.js`: 315 lines

All files are strictly under the 800-line limit.

### Problems found and resolved:
- All methods were cleanly extracted verbatim without logic or signature changes.
- Unused imports were pruned from `src/scenes/HubScene.js`.
- All 32 original prototype methods were verified to exist on `HubScene.prototype`.
- No circular dependencies or broken references.

### Verification status:
- `node --check` passed on all modified and new files.
- `node scripts/check_codemap.mjs` passed with `CODEMAP OK`.
- All headless test suites passed.
- `npx vite build` succeeded with 0 errors.
