# Floor Art Integration Issues (A06c)

Issues found while wiring the procedural floor art modules into `TowerScene`.
The layout (`src/world/floorLayouts.js`) remains the single source of truth for
gameplay; the art module is visuals only.

## Open items

- **Modules expose no `colliders` list.** `farm.js` / `forest.js` return
  `group`, `anchors`, `lights`, `setGateState`, `setQuality`, `update`,
  `destroyPillar`, `getStats`, `dispose` but no gameplay colliders. A06c
  therefore builds camera colliders from `layout.obstacles` (circles) and adds
  the floor-5 `bossArena.wallSegments` as extra blockers. If a module ever
  exports `colliders`, `TowerFloor` already merges them and the startup
  self-check validates them against open ground.
- **Modules expose no `getLighting()`.** The hub reads `town.getLighting()`;
  floor modules do not. `TowerScene.applyFloorLighting()` uses hard-coded farm
  and forest presets (background, fog, ACES exposure, ambient, hemisphere,
  directional, no shadows) plus the module's `lights` descriptors through a
  4-light pool. If a module adds `getLighting()`, prefer it.
- **No `ambush_*` anchors.** `EnemyManager` uses `layout.ambushSpots`, which is
  data-only; the art has no matching ambush geometry to place foes inside.
- **`forest.js` is still a stub.** Floors 2-5 currently show placeholder art
  (few hundred triangles). Everything is wired, but the visual pass is pending
  A06b/A06d. Floors 2+ will look sparse until the forest module lands.
- **Camera pull-in is thinner in the forest.** Trees are not in
  `layout.obstacles`, so `ThirdPersonCamera` will not pull in around them; the
  camera can clip foliage. Add tree colliders via a module `colliders` export
  once available.
- **Hero height check.** `TowerScene.logScaleCheck()` warns once if the player
  bounding box height deviates from 1.75 m (the scale the art assumes). Run and
  clear this warning before A06d passes.

## Verified working

- Floor 1 (farm) at high/medium/low, floors 2 and 5 smoke-tested via
  `/tmp/opencode/run-towerfloor.mjs`: build, gates, seal, pillar destroy,
  ground, clearings/chokes/ambush, walkability, `update`, `dispose`.
- `npm run build` passes.
- Startup self-check ignores any collider found on open ground (path, clearing
  interior, start, exit) and logs its id.
