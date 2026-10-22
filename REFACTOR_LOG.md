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
