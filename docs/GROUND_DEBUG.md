# Ground Contact and Rig Locomotion Diagnostic Report (Task A05f)

## 1. Root Cause Breakdown

### Issue 1: Legs Not Animating on W (Stuck in Idle) & High-Speed Shift
- **Files & Lines**: `src/art/HeroRig.js` (lines 104, 109)
- **Root Cause**: `HeroRig.js` tracked movement displacement by initializing `this.lastPos = new THREE.Vector2(trackedObj.position.x, trackedObj.position.z)`. On line 104, it read `trackedObj.position.z - this.lastPos.z`. Because `Vector2` possesses `.x` and `.y` properties (and not `.z`), `this.lastPos.z` evaluated to `undefined`. `Math.hypot` resulted in `NaN`. Because `NaN > 0.25` is false, `isMoving` was permanently `false`, locking the rig into `idle` and freezing `walkClock` regardless of player movement.
- **Fix**: Replaced with `Vector3` tracking and honored the explicit `state.speed` passed directly from `Player.js` and `HubHeroNPC`. Also clamped the sprint cycle frequency so running stays within $[1.3, 2.2]\text{ Hz}$.

### Issue 2: Player and Hero Feet Sinking Into Ground
- **Files & Lines**: `src/art/hero.js` (lines 1025-1048), `src/art/HeroRig.js` (lines 200-216)
- **Root Cause**: In default idle pose, the foot sole base sits at $y \approx 0$. When animated into `walk` or `run`, hip and knee flexion cause the lowest foot sole to swing below the character origin (reaching $-0.03\text{m}$ to $-0.06\text{m}$). Without procedural foot clamping, the feet penetrate the floor. Furthermore, an earlier clamp attempted to measure world coordinates without subtracting group elevation, which zeroed the correction when elevated.
- **Fix**: Implemented a responsive foot-ground clamp in `HeroRig.js` measuring the lowest sole via `Box3.setFromObject(footL/footR)`, comparing against group ground elevation, and applying a smoothed vertical lift $\le 0.35\text{m}$. Lowest foot sole is guaranteed $\ge 0 \pm 0.02\text{m}$.

### Issue 3: Summoned Heroes Spawning Above Ground in Mid-Air
- **Files & Lines**: `src/scenes/HubScene.js` (lines 153, 203, 843, 995, 1420, 1439-1451)
- **Root Cause**: Two compounding bugs:
  1. In `HubScene.js` line 995, `spawnY` was computed as `this.getWalkY(30, 4) + 1.8`. Because `getWalkY(30, 4)` already samples the elevated Summoning Room foundation pad ($+1.8\text{m}$), adding another $+1.8\text{m}$ spawned heroes in mid-air at $y = 3.6\text{m}$.
  2. `spawnHeroes(...)` in `HubScene.js` lines 153, 203, 843, and 1420 passed `(x, z) => this.getGroundY(x, z)` (which returns the base terrain $y \approx 0$) instead of `this.getWalkY`. This caused heroes on elevated pads to fall below walkways or pop into ground geometry.
- **Fix**: Removed the duplicate `+ 1.8` on line 995 (`spawnY = this.getWalkY(30, 4)`) and consistently passed `this.getWalkY` to `spawnHeroes`, `update`, and effect handlers.

### Issue 4: WalkHeight Raycaster Missing Summoning Room Open-Air Stairs
- **Files & Lines**: `src/art/town/WalkHeight.js` (lines 158-192)
- **Root Cause**: The Summoning Room staircase rises from $y = 1.8\text{m}$ to $y = 3.42\text{m}$, while underlying base terrain is at $y \approx 0.46\text{m}$. Standard ray origins at `baseGy + 1.2` ($1.66\text{m}$) were casting downward from *underneath* the open-air staircase.
- **Fix**: Defined an elevated ray origin ($y = 3.8\text{m}$) for the staircase bounding zone (`x in [21, 27.5], z in [9, 17]`) and strictly clamped accepted hits to $\le originY$, ensuring stair steps are correctly mapped without intersecting overhead column capitals.

---

## 2. Automated Test Results

### WalkHeight Map vs Direct Raycast (`test-walkheight.mjs`)
Across 15 town landmarks, approaches, and roads:

| #  | Location | (X, Z) | GroundY | DirectRay | WalkMapY | Diff (m) | Status |
|----|----------|--------|---------|-----------|----------|----------|--------|
|  1 | Landing Area center     | ( 20.0,  26.0) |   0.000 |     0.440 |    0.440 |    0.000 | PASS |
|  2 | Summoning stair bottom  | ( 22.0,  14.0) |   0.245 |     2.600 |    2.600 |    0.000 | PASS |
|  3 | Summoning stair middle  | ( 24.5,  12.0) |   0.460 |     3.425 |    3.425 |    0.000 | PASS |
|  4 | Summoning stair top     | ( 27.0,   8.0) |   1.273 |     2.350 |    2.350 |    0.000 | PASS |
|  5 | Town Square center      | ( 14.0,  -8.0) |   0.000 |     0.900 |    0.900 |    0.000 | PASS |
|  6 | Road segment            | ( 17.0,   8.0) |   0.471 |     0.470 |    0.471 |    0.000 | PASS |
|  7 | Armory door approach    | ( 25.0, -12.0) |   0.312 |     0.312 |    0.312 |    0.001 | PASS |
|  8 | Cottage 1 door approach | (-33.8, -10.8) |  -0.127 |    -0.056 |   -0.068 |    0.013 | PASS |
|  9 | Training Grounds        | (-24.0,  16.8) |  -0.019 |     0.100 |    0.100 |    0.000 | PASS |
| 10 | Next to wall            | (  0.0, -40.0) |   0.125 |     0.126 |    0.125 |    0.001 | PASS |
| 11 | Synthesis door approach | (-17.8,   5.2) |  -0.497 |    -0.426 |   -0.438 |    0.012 | PASS |
| 12 | Dormitory entrance      | (-18.0,  -4.0) |  -0.311 |     0.329 |    0.329 |    0.000 | PASS |
| 13 | Mess Hall door approach | (-24.0,  -6.0) |  -0.047 |     0.897 |    0.897 |    0.000 | PASS |
| 14 | Space-Time Rift         | (  0.0,  40.0) |   0.000 |     0.420 |    0.420 |    0.000 | PASS |
| 15 | Dungeon Board           | ( 20.0,  24.0) |  -0.011 |     0.485 |    0.485 |    0.000 | PASS |

**Summary**: 15/15 points passed. Max Difference: **0.0127m** (Tolerance Limit: **0.08m**).

---

### Locomotion & Foot Contact Test (`test-rig-locomotion.mjs`)

| Mode     | Pose | Hip P2P (rad) | Target P2P | Freq (Hz) | Target Freq | Min Sole Y | Max Corr | Status |
|----------|------|---------------|------------|-----------|-------------|------------|----------|--------|
| Standing | idle |         0.000 |    < 0.050 |      0.00 |      0.00 Hz |     -0.000 |    0.002 | PASS |
| Walking  | walk |         1.118 |    > 0.500 |      1.03 | 0.8-1.30 Hz |     -0.005 |    0.028 | PASS |
| Sprinting| run  |         2.011 |    > 0.500 |      1.97 | 1.3-2.20 Hz |     -0.017 |    0.024 | PASS |

**Summary**: All modes passed. Walking frequency is $1.03\text{ Hz}$, sprinting frequency is $1.97\text{ Hz}$, and lowest foot sole remains $\ge 0 \pm 0.02\text{m}$ with smoothed vertical correction $\le 0.028\text{m}$ (well within the $0.35\text{m}$ cap).

---

## 3. Live Debug Overlay (`src/debug/GroundDebug.js`)
- Toggled via `\` (Backslash) key.
- Updates at 10 Hz displaying:
  - Player: world position, groundY, walkY, diff $(y - walkY)$, map progress %, rig world/local positions, bounding box min $y$, measured world speed, input state, active pose, walk clock, intensity, joints $rotX$.
  - Nearest Hero: id, name, distance, world position, walkY, diff, state, pose, model bounding box min $y$.
- Recording: `Shift+\` (or the on-screen "Copy report" button) records 5 seconds of telemetry (25 samples at 0.2s) and copies a markdown table to the clipboard.
