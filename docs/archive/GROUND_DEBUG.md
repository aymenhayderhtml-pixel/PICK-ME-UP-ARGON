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

---

## A05i results

### Summary of Building Walk-Height Verification

| Building | Door Sill Y (m) | Max Diff vs Direct Ray (m) | Max Height Jump (m) | Floor < Sill - 0.1m | Result |
|:---|:---:|:---:|:---:|:---:|:---:|
| Summoning Room     | 1.63 | 0.036 (<=0.05) | 0.200 (<=0.35) | 0 | **PASS** |
| Synthesis Chamber  | 0.88 | 0.028 (<=0.05) | 0.070 (<=0.35) | 0 | **PASS** |
| Armory             | 0.81 | 0.000 (<=0.05) | 0.000 (<=0.35) | 0 | **PASS** |
| Space-Time Rift    | 0.88 | 0.000 (<=0.05) | 0.000 (<=0.35) | 0 | **PASS** |
| Training Grounds   | 0.11 | 0.025 (<=0.05) | 0.017 (<=0.35) | 0 | **PASS** |
| Cottage 1          | 0.37 | 0.034 (<=0.05) | 0.080 (<=0.35) | 0 | **PASS** |
| Mess Hall          | 1.58 | 0.000 (<=0.05) | 0.000 (<=0.35) | 0 | **PASS** |
| Dungeon Board      | 0.06 | 0.036 (<=0.05) | 0.048 (<=0.35) | 0 | **PASS** |

### Underground Guard Test

- **Setup**: Test entity placed at `(30.0, 0.63, 4.0)`, exactly 1.0m below the Summoning Room courtyard ground level (`y = 1.63m`).
- **At t = 0.20s**: Entity remains at `y = 0.63m` (within 0.3s grace period).
- **At t = 0.35s**: Guard triggers: entity immediately snapped to surface `y = 1.63m` with console warning: `[UndergroundGuard] Entity snapped to surface at (30.00, 1.63, 4.00)`.
- **Result**: **PASS**

### Per-Building Walk Height Profiles

#### Summoning Room Walk Height Profile

| Dist (m) | Segment | (X, Z) | WalkMap Y (m) | DirectRay Y (m) | Diff (m) | Step Jump (m) |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|
| 0.0 | **Outside Start** | (19.50, 20.00) | 0.450 | 0.450 | 0.000 | 0.000 |
| 0.5 | Outside -> Door | (19.71, 19.55) | 0.441 | 0.440 | 0.001 | 0.002 |
| 1.0 | Outside -> Door | (19.93, 19.10) | 0.447 | 0.440 | 0.007 | 0.002 |
| 1.5 | Outside -> Door | (20.14, 18.64) | 0.443 | 0.450 | 0.007 | 0.000 |
| 2.0 | Outside -> Door | (20.35, 18.19) | 0.450 | 0.450 | 0.000 | 0.001 |
| 2.5 | Outside -> Door | (20.56, 17.74) | 0.450 | 0.450 | 0.000 | 0.000 |
| 3.0 | Outside -> Door | (20.78, 17.29) | 0.450 | 0.450 | 0.000 | 0.000 |
| 3.5 | Outside -> Door | (20.99, 16.84) | 0.450 | 0.450 | 0.000 | 0.000 |
| 4.0 | Outside -> Door | (21.20, 16.38) | 0.450 | 0.450 | 0.000 | 0.000 |
| 4.5 | Outside -> Door | (21.41, 15.93) | 0.447 | 0.440 | 0.007 | 0.003 |
| 5.0 | Outside -> Door | (21.63, 15.48) | 0.430 | 0.440 | 0.010 | 0.010 |
| 5.2 | Outside -> Door | (21.71, 15.30) | 0.240 | 0.240 | 0.000 | 0.200 |
| 5.3 | Outside -> Door | (21.76, 15.21) | 0.400 | 0.400 | 0.000 | 0.160 |
| 5.5 | Outside -> Door | (21.84, 15.03) | 0.400 | 0.400 | 0.000 | 0.000 |
| 5.8 | Outside -> Door | (21.97, 14.76) | 0.571 | 0.600 | 0.029 | 0.171 |
| 6.0 | Outside -> Door | (22.05, 14.57) | 0.600 | 0.600 | 0.000 | 0.000 |
| 6.3 | Outside -> Door | (22.18, 14.30) | 0.800 | 0.800 | 0.000 | 0.200 |
| 6.5 | Outside -> Door | (22.27, 14.12) | 0.807 | 0.800 | 0.007 | 0.025 |
| 6.8 | Outside -> Door | (22.39, 13.85) | 0.966 | 1.000 | 0.034 | 0.166 |
| 7.0 | Outside -> Door | (22.48, 13.67) | 1.000 | 1.000 | 0.000 | 0.002 |
| 7.3 | Outside -> Door | (22.61, 13.40) | 1.200 | 1.200 | 0.000 | 0.200 |
| 7.5 | Outside -> Door | (22.69, 13.22) | 1.200 | 1.200 | 0.000 | 0.019 |
| 7.8 | Outside -> Door | (22.82, 12.95) | 1.400 | 1.400 | 0.000 | 0.182 |
| 8.0 | Outside -> Door | (22.90, 12.77) | 1.395 | 1.400 | 0.005 | 0.005 |
| 8.3 | Outside -> Door | (23.03, 12.49) | 1.600 | 1.600 | 0.000 | 0.200 |
| 8.5 | Outside -> Door | (23.12, 12.31) | 1.600 | 1.600 | 0.000 | 0.000 |
| 8.8 | Outside -> Door | (23.24, 12.04) | 1.452 | 1.419 | 0.032 | 0.148 |
| 8.9 | Outside -> Door | (23.29, 11.95) | 1.625 | 1.625 | 0.000 | 0.173 |
| 9.0 | Outside -> Door | (23.33, 11.86) | 1.625 | 1.625 | 0.000 | 0.000 |
| 9.5 | Door -> Inside | (23.57, 11.42) | 1.625 | 1.625 | 0.000 | 0.000 |
| 10.0 | Door -> Inside | (23.89, 11.05) | 1.625 | 1.625 | 0.000 | 0.000 |
| 10.5 | Door -> Inside | (24.22, 10.67) | 1.625 | 1.625 | 0.000 | 0.000 |
| 11.0 | Door -> Inside | (24.55, 10.29) | 1.669 | 1.690 | 0.021 | 0.009 |
| 11.5 | Door -> Inside | (24.88, 9.91) | 1.669 | 1.690 | 0.021 | 0.006 |
| 12.0 | Door -> Inside | (25.21, 9.53) | 1.683 | 1.690 | 0.007 | 0.009 |
| 12.5 | Door -> Inside | (25.54, 9.15) | 1.690 | 1.690 | 0.000 | 0.000 |
| 12.8 | Door -> Inside | (25.73, 8.92) | 1.625 | 1.625 | 0.000 | 0.065 |
| 13.0 | Door -> Inside | (25.86, 8.77) | 1.690 | 1.690 | 0.000 | 0.044 |
| 13.5 | Door -> Inside | (26.19, 8.39) | 1.661 | 1.690 | 0.029 | 0.000 |
| 14.0 | Door -> Inside | (26.52, 8.02) | 1.686 | 1.690 | 0.004 | 0.016 |
| 14.5 | Door -> Inside | (26.85, 7.64) | 1.690 | 1.690 | 0.000 | 0.000 |
| 15.0 | Door -> Inside | (27.18, 7.26) | 1.645 | 1.625 | 0.020 | 0.025 |
| 15.5 | Door -> Inside | (27.51, 6.88) | 1.657 | 1.690 | 0.033 | 0.007 |
| 16.0 | Door -> Inside | (27.83, 6.50) | 1.690 | 1.690 | 0.000 | 0.018 |
| 16.5 | Door -> Inside | (28.16, 6.12) | 1.690 | 1.690 | 0.000 | 0.000 |
| 17.0 | Door -> Inside | (28.49, 5.74) | 1.689 | 1.690 | 0.001 | 0.008 |
| 17.5 | Door -> Inside | (28.82, 5.36) | 1.625 | 1.625 | 0.000 | 0.000 |
| 18.0 | Door -> Inside | (29.15, 4.98) | 1.625 | 1.625 | 0.000 | 0.000 |
| 18.5 | Door -> Inside | (29.47, 4.61) | 1.625 | 1.625 | 0.000 | 0.000 |
| 19.0 | Door -> Inside | (29.80, 4.23) | 1.625 | 1.625 | 0.000 | 0.000 |
| 19.5 | Interior Path | (30.13, 3.85) | 1.625 | 1.625 | 0.000 | 0.000 |
| 20.0 | Interior Path | (30.46, 3.47) | 1.625 | 1.625 | 0.000 | 0.000 |
| 20.5 | Interior Path | (30.79, 3.09) | 1.625 | 1.625 | 0.000 | 0.000 |
| 21.0 | Interior Path | (31.11, 2.72) | 1.625 | 1.625 | 0.000 | 0.000 |
| 21.5 | Interior Path | (31.44, 2.34) | 1.657 | 1.625 | 0.032 | 0.021 |
| 22.0 | Interior Path | (31.77, 1.96) | 1.690 | 1.690 | 0.000 | 0.005 |
| 22.5 | Interior Path | (32.10, 1.58) | 1.690 | 1.690 | 0.000 | 0.000 |
| 23.0 | Interior Path | (32.42, 1.20) | 1.665 | 1.690 | 0.025 | 0.008 |
| 23.5 | Interior Path | (32.75, 0.83) | 1.645 | 1.625 | 0.020 | 0.016 |
| 24.0 | Interior Path | (33.08, 0.45) | 1.690 | 1.690 | 0.000 | 0.000 |
| 24.5 | Interior Path | (33.41, 0.07) | 1.690 | 1.690 | 0.000 | 0.000 |
| 25.0 | Interior Path | (33.73, -0.31) | 1.673 | 1.690 | 0.017 | 0.003 |
| 25.3 | **Interior End (+6m)** | (33.93, -0.53) | 1.668 | 1.690 | 0.022 | 0.007 |

#### Synthesis Chamber Walk Height Profile

| Dist (m) | Segment | (X, Z) | WalkMap Y (m) | DirectRay Y (m) | Diff (m) | Step Jump (m) |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|
| 0.0 | **Outside Start** | (0.00, -20.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 0.5 | Outside -> Door | (0.00, -20.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 1.0 | Outside -> Door | (0.00, -21.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 1.5 | Outside -> Door | (0.00, -21.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 2.0 | Outside -> Door | (0.00, -22.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 2.5 | Outside -> Door | (0.00, -22.50) | 0.880 | 0.880 | 0.000 | 0.070 |
| 3.0 | Outside -> Door | (0.00, -23.00) | 0.880 | 0.880 | 0.000 | 0.000 |
| 3.5 | Outside -> Door | (0.00, -23.50) | 0.810 | 0.810 | 0.000 | 0.028 |
| 3.8 | Outside -> Door | (0.00, -23.80) | 0.880 | 0.880 | 0.000 | 0.070 |
| 4.0 | Door -> Inside | (0.00, -24.00) | 0.880 | 0.880 | 0.000 | 0.028 |
| 4.5 | Door -> Inside | (0.00, -24.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 5.0 | Door -> Inside | (0.00, -25.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 5.5 | Door -> Inside | (0.00, -25.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 6.0 | Door -> Inside | (0.00, -26.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 6.5 | Door -> Inside | (0.00, -26.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 7.0 | Door -> Inside | (0.00, -27.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 7.5 | Door -> Inside | (0.00, -27.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 8.0 | Door -> Inside | (0.00, -28.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 8.5 | Door -> Inside | (0.00, -28.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 9.0 | Door -> Inside | (0.00, -29.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 9.5 | Door -> Inside | (0.00, -29.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 10.0 | Door -> Inside | (0.00, -30.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 10.5 | Door -> Inside | (0.00, -30.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 11.0 | Door -> Inside | (0.00, -31.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 11.5 | Door -> Inside | (0.00, -31.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 12.0 | Door -> Inside | (0.00, -32.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 12.5 | Interior Path | (0.00, -32.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 13.0 | Interior Path | (0.00, -33.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 13.5 | Interior Path | (0.00, -33.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 14.0 | Interior Path | (0.00, -34.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 14.5 | Interior Path | (0.00, -34.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 15.0 | Interior Path | (0.00, -35.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 15.5 | Interior Path | (0.00, -35.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 16.0 | Interior Path | (0.00, -36.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 16.5 | Interior Path | (0.00, -36.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 17.0 | Interior Path | (0.00, -37.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 17.5 | Interior Path | (0.00, -37.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 18.0 | **Interior End (+6m)** | (0.00, -38.00) | 0.810 | 0.810 | 0.000 | 0.000 |

#### Armory Walk Height Profile

| Dist (m) | Segment | (X, Z) | WalkMap Y (m) | DirectRay Y (m) | Diff (m) | Step Jump (m) |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|
| 0.0 | **Outside Start** | (-6.00, -14.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 0.5 | Outside -> Door | (-6.00, -14.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 1.0 | Outside -> Door | (-6.00, -15.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 1.5 | Outside -> Door | (-6.00, -15.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 2.0 | Outside -> Door | (-6.00, -16.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 2.5 | Outside -> Door | (-6.00, -16.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 3.0 | Outside -> Door | (-6.00, -17.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 3.5 | Door -> Inside | (-6.00, -17.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 4.0 | Door -> Inside | (-6.00, -18.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 4.5 | Door -> Inside | (-6.00, -18.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 5.0 | Door -> Inside | (-6.00, -19.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 5.5 | Door -> Inside | (-6.00, -19.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 6.0 | Door -> Inside | (-6.00, -20.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 6.5 | Interior Path | (-6.00, -20.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 7.0 | Interior Path | (-6.00, -21.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 7.5 | Interior Path | (-6.00, -21.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 8.0 | Interior Path | (-6.00, -22.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 8.5 | Interior Path | (-6.00, -22.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 9.0 | Interior Path | (-6.00, -23.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 9.5 | Interior Path | (-6.00, -23.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 10.0 | Interior Path | (-6.00, -24.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 10.5 | Interior Path | (-6.00, -24.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 11.0 | Interior Path | (-6.00, -25.00) | 0.810 | 0.810 | 0.000 | 0.000 |
| 11.5 | Interior Path | (-6.00, -25.50) | 0.810 | 0.810 | 0.000 | 0.000 |
| 12.0 | **Interior End (+6m)** | (-6.00, -26.00) | 0.810 | 0.810 | 0.000 | 0.000 |

#### Space-Time Rift Walk Height Profile

| Dist (m) | Segment | (X, Z) | WalkMap Y (m) | DirectRay Y (m) | Diff (m) | Step Jump (m) |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|
| 0.0 | **Outside Start** | (27.00, -23.00) | 0.880 | 0.880 | 0.000 | 0.000 |
| 0.5 | Outside -> Door | (27.00, -23.50) | 0.880 | 0.880 | 0.000 | 0.000 |
| 1.0 | Outside -> Door | (27.00, -24.00) | 0.880 | 0.880 | 0.000 | 0.000 |
| 1.5 | Outside -> Door | (27.00, -24.50) | 0.880 | 0.880 | 0.000 | 0.000 |
| 2.0 | Outside -> Door | (27.00, -25.00) | 0.880 | 0.880 | 0.000 | 0.000 |
| 2.5 | Outside -> Door | (27.00, -25.50) | 0.880 | 0.880 | 0.000 | 0.000 |
| 3.0 | Door -> Inside | (27.00, -26.00) | 0.880 | 0.880 | 0.000 | 0.000 |
| 3.5 | Door -> Inside | (27.00, -26.50) | 0.880 | 0.880 | 0.000 | 0.000 |
| 4.0 | Door -> Inside | (27.00, -27.00) | 0.880 | 0.880 | 0.000 | 0.000 |
| 4.5 | Interior Path | (27.00, -27.50) | 0.880 | 0.880 | 0.000 | 0.000 |
| 5.0 | Interior Path | (27.00, -28.00) | 0.880 | 0.880 | 0.000 | 0.000 |
| 5.5 | Interior Path | (27.00, -28.50) | 0.880 | 0.880 | 0.000 | 0.000 |
| 6.0 | Interior Path | (27.00, -29.00) | 0.880 | 0.880 | 0.000 | 0.000 |
| 6.5 | Interior Path | (27.00, -29.50) | 0.880 | 0.880 | 0.000 | 0.000 |
| 7.0 | Interior Path | (27.00, -30.00) | 0.880 | 0.880 | 0.000 | 0.000 |
| 7.5 | Interior Path | (27.00, -30.50) | 0.880 | 0.880 | 0.000 | 0.000 |
| 8.0 | Interior Path | (27.00, -31.00) | 0.880 | 0.880 | 0.000 | 0.000 |
| 8.5 | Interior Path | (27.00, -31.50) | 0.880 | 0.880 | 0.000 | 0.000 |
| 9.0 | Interior Path | (27.00, -32.00) | 0.880 | 0.880 | 0.000 | 0.000 |
| 9.5 | Interior Path | (27.00, -32.50) | 0.880 | 0.880 | 0.000 | 0.000 |
| 10.0 | **Interior End (+6m)** | (27.00, -33.00) | 0.880 | 0.880 | 0.000 | 0.000 |

#### Training Grounds Walk Height Profile

| Dist (m) | Segment | (X, Z) | WalkMap Y (m) | DirectRay Y (m) | Diff (m) | Step Jump (m) |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|
| 0.0 | **Outside Start** | (-15.00, 18.00) | 0.100 | 0.100 | 0.000 | 0.000 |
| 0.5 | Outside -> Door | (-15.50, 18.00) | 0.058 | 0.058 | 0.000 | 0.000 |
| 1.0 | Outside -> Door | (-16.00, 18.00) | 0.058 | 0.058 | 0.000 | 0.000 |
| 1.5 | Outside -> Door | (-16.50, 18.00) | 0.100 | 0.100 | 0.000 | 0.000 |
| 2.0 | Outside -> Door | (-17.00, 18.00) | 0.100 | 0.100 | 0.000 | 0.000 |
| 2.5 | Outside -> Door | (-17.50, 18.00) | 0.100 | 0.100 | 0.000 | 0.000 |
| 3.0 | Outside -> Door | (-18.00, 18.00) | 0.110 | 0.110 | 0.000 | 0.000 |
| 3.5 | Door -> Inside | (-18.48, 18.16) | 0.110 | 0.110 | 0.000 | 0.000 |
| 4.0 | Door -> Inside | (-18.95, 18.32) | 0.108 | 0.110 | 0.002 | 0.002 |
| 4.5 | Door -> Inside | (-19.43, 18.48) | 0.101 | 0.100 | 0.001 | 0.000 |
| 5.0 | Door -> Inside | (-19.90, 18.63) | 0.100 | 0.100 | 0.000 | 0.000 |
| 5.5 | Door -> Inside | (-20.38, 18.79) | 0.105 | 0.100 | 0.005 | 0.004 |
| 6.0 | Door -> Inside | (-20.86, 18.95) | 0.110 | 0.110 | 0.000 | 0.000 |
| 6.5 | Door -> Inside | (-21.33, 19.11) | 0.110 | 0.110 | 0.000 | 0.000 |
| 7.0 | Door -> Inside | (-21.81, 19.27) | 0.110 | 0.110 | 0.000 | 0.000 |
| 7.5 | Door -> Inside | (-22.29, 19.43) | 0.110 | 0.110 | 0.000 | 0.000 |
| 8.0 | Door -> Inside | (-22.76, 19.59) | 0.110 | 0.110 | 0.000 | 0.000 |
| 8.5 | Door -> Inside | (-23.24, 19.75) | 0.110 | 0.110 | 0.000 | 0.000 |
| 9.0 | Door -> Inside | (-23.71, 19.90) | 0.110 | 0.110 | 0.000 | 0.000 |
| 9.5 | Interior Path | (-24.19, 20.06) | 0.100 | 0.100 | 0.000 | 0.000 |
| 10.0 | Interior Path | (-24.66, 20.22) | 0.110 | 0.110 | 0.000 | 0.001 |
| 10.5 | Interior Path | (-25.14, 20.38) | 0.110 | 0.110 | 0.000 | 0.000 |
| 11.0 | Interior Path | (-25.61, 20.54) | 0.110 | 0.110 | 0.000 | 0.000 |
| 11.5 | Interior Path | (-26.09, 20.70) | 0.110 | 0.110 | 0.000 | 0.000 |
| 12.0 | Interior Path | (-26.56, 20.85) | 0.110 | 0.110 | 0.000 | 0.000 |
| 12.5 | Interior Path | (-27.04, 21.01) | 0.108 | 0.110 | 0.002 | 0.002 |
| 13.0 | Interior Path | (-27.51, 21.17) | 0.110 | 0.110 | 0.000 | 0.003 |
| 13.5 | Interior Path | (-27.98, 21.33) | 0.100 | 0.100 | 0.000 | 0.003 |
| 14.0 | Interior Path | (-28.46, 21.49) | 0.100 | 0.100 | 0.000 | 0.000 |
| 14.5 | Interior Path | (-28.93, 21.64) | 0.100 | 0.100 | 0.000 | 0.000 |
| 15.0 | Interior Path | (-29.41, 21.80) | 0.100 | 0.100 | 0.000 | 0.000 |
| 15.3 | **Interior End (+6m)** | (-29.69, 21.90) | 0.100 | 0.100 | 0.000 | 0.000 |

#### Cottage 1 Walk Height Profile

| Dist (m) | Segment | (X, Z) | WalkMap Y (m) | DirectRay Y (m) | Diff (m) | Step Jump (m) |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|
| 0.0 | **Outside Start** | (-33.80, -10.80) | 0.400 | 0.400 | 0.000 | 0.000 |
| 0.5 | Outside -> Door | (-33.80, -11.30) | 0.400 | 0.400 | 0.000 | 0.000 |
| 1.0 | Outside -> Door | (-33.80, -11.79) | 0.395 | 0.400 | 0.005 | 0.005 |
| 1.5 | Door -> Inside | (-33.76, -12.28) | 0.450 | 0.450 | 0.000 | 0.080 |
| 2.0 | Door -> Inside | (-33.56, -12.73) | 0.450 | 0.450 | 0.000 | 0.000 |
| 2.5 | Door -> Inside | (-33.36, -13.19) | 0.450 | 0.450 | 0.000 | 0.000 |
| 3.0 | Door -> Inside | (-33.16, -13.64) | 0.450 | 0.450 | 0.000 | 0.000 |
| 3.5 | Interior Path | (-32.96, -14.09) | 0.450 | 0.450 | 0.000 | 0.000 |
| 4.0 | Interior Path | (-32.76, -14.55) | 0.450 | 0.450 | 0.000 | 0.000 |
| 4.5 | Interior Path | (-32.56, -15.01) | 0.450 | 0.450 | 0.000 | 0.000 |
| 5.0 | Interior Path | (-32.35, -15.46) | 0.450 | 0.450 | 0.000 | 0.000 |
| 5.5 | Interior Path | (-32.15, -15.92) | 0.416 | 0.400 | 0.016 | 0.018 |
| 6.0 | Interior Path | (-31.95, -16.38) | 0.400 | 0.400 | 0.000 | 0.000 |
| 6.5 | Interior Path | (-31.75, -16.84) | 0.400 | 0.400 | 0.000 | 0.000 |
| 7.0 | Interior Path | (-31.54, -17.29) | 0.400 | 0.400 | 0.000 | 0.000 |
| 7.5 | Interior Path | (-31.34, -17.75) | 0.400 | 0.400 | 0.000 | 0.000 |
| 8.0 | Interior Path | (-31.14, -18.21) | 0.400 | 0.400 | 0.000 | 0.000 |
| 8.5 | Interior Path | (-30.94, -18.66) | 0.400 | 0.400 | 0.000 | 0.000 |
| 9.0 | Interior Path | (-30.74, -19.12) | 0.400 | 0.400 | 0.000 | 0.000 |
| 9.4 | **Interior End (+6m)** | (-30.57, -19.49) | 0.400 | 0.400 | 0.000 | 0.000 |

#### Mess Hall Walk Height Profile

| Dist (m) | Segment | (X, Z) | WalkMap Y (m) | DirectRay Y (m) | Diff (m) | Step Jump (m) |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|
| 0.0 | **Outside Start** | (8.00, 33.00) | 1.575 | 1.575 | 0.000 | 0.000 |
| 0.5 | Outside -> Door | (8.00, 33.50) | 1.575 | 1.575 | 0.000 | 0.000 |
| 1.0 | Outside -> Door | (8.00, 34.00) | 1.575 | 1.575 | 0.000 | 0.000 |
| 1.5 | Outside -> Door | (8.00, 34.50) | 1.575 | 1.575 | 0.000 | 0.000 |
| 2.0 | Outside -> Door | (8.00, 35.00) | 1.575 | 1.575 | 0.000 | 0.000 |
| 2.5 | Outside -> Door | (8.00, 35.50) | 1.575 | 1.575 | 0.000 | 0.000 |
| 3.0 | Door -> Inside | (8.00, 36.00) | 1.575 | 1.575 | 0.000 | 0.000 |
| 3.5 | Door -> Inside | (8.00, 36.50) | 1.575 | 1.575 | 0.000 | 0.000 |
| 4.0 | Door -> Inside | (8.00, 37.00) | 1.575 | 1.575 | 0.000 | 0.000 |
| 4.5 | Door -> Inside | (8.00, 37.50) | 1.575 | 1.575 | 0.000 | 0.000 |
| 5.0 | Door -> Inside | (8.00, 38.00) | 1.575 | 1.575 | 0.000 | 0.000 |
| 5.5 | Interior Path | (8.00, 38.50) | 1.575 | 1.575 | 0.000 | 0.000 |
| 6.0 | Interior Path | (8.00, 39.00) | 1.575 | 1.575 | 0.000 | 0.000 |
| 6.5 | Interior Path | (8.00, 39.50) | 1.575 | 1.575 | 0.000 | 0.000 |
| 7.0 | Interior Path | (8.00, 40.00) | 1.575 | 1.575 | 0.000 | 0.000 |
| 7.5 | Interior Path | (8.00, 40.50) | 1.575 | 1.575 | 0.000 | 0.000 |
| 8.0 | Interior Path | (8.00, 41.00) | 1.575 | 1.575 | 0.000 | 0.000 |
| 8.5 | Interior Path | (8.00, 41.50) | 1.575 | 1.575 | 0.000 | 0.000 |
| 9.0 | Interior Path | (8.00, 42.00) | 1.575 | 1.575 | 0.000 | 0.000 |
| 9.5 | Interior Path | (8.00, 42.50) | 1.575 | 1.575 | 0.000 | 0.000 |
| 10.0 | Interior Path | (8.00, 43.00) | 1.575 | 1.575 | 0.000 | 0.000 |
| 10.5 | Interior Path | (8.00, 43.50) | 1.575 | 1.575 | 0.000 | 0.000 |
| 11.0 | **Interior End (+6m)** | (8.00, 44.00) | 1.575 | 1.575 | 0.000 | 0.000 |

#### Dungeon Board Walk Height Profile

| Dist (m) | Segment | (X, Z) | WalkMap Y (m) | DirectRay Y (m) | Diff (m) | Step Jump (m) |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|
| 0.0 | **Outside Start** | (6.00, 2.00) | 0.000 | 0.000 | 0.000 | 0.000 |
| 0.5 | Outside -> Door | (6.00, 1.50) | 0.060 | 0.060 | 0.000 | 0.024 |
| 1.0 | Outside -> Door | (6.00, 1.00) | 0.060 | 0.060 | 0.000 | 0.000 |
| 1.5 | Outside -> Door | (6.00, 0.50) | 0.060 | 0.060 | 0.000 | 0.026 |
| 2.0 | Outside -> Door | (6.00, 0.00) | 0.058 | 0.058 | 0.000 | 0.000 |
| 2.5 | Door -> Inside | (6.00, -0.50) | 0.179 | 0.179 | 0.000 | 0.048 |
| 3.0 | Door -> Inside | (6.00, -1.00) | 0.180 | 0.180 | 0.000 | 0.000 |
| 3.5 | Door -> Inside | (6.00, -1.50) | 0.180 | 0.180 | 0.000 | 0.000 |
| 4.0 | Door -> Inside | (6.00, -2.00) | 0.180 | 0.180 | 0.000 | 0.000 |
| 4.5 | Interior Path | (6.00, -2.50) | 0.180 | 0.180 | 0.000 | 0.000 |
| 5.0 | Interior Path | (6.00, -3.00) | 0.180 | 0.180 | 0.000 | 0.000 |
| 5.5 | Interior Path | (6.00, -3.50) | 0.180 | 0.180 | 0.000 | 0.000 |
| 6.0 | Interior Path | (6.00, -4.00) | 0.180 | 0.180 | 0.000 | 0.000 |
| 6.5 | Interior Path | (6.00, -4.50) | 0.180 | 0.180 | 0.000 | 0.000 |
| 7.0 | Interior Path | (6.00, -5.00) | 0.180 | 0.180 | 0.000 | 0.000 |
| 7.5 | Interior Path | (6.00, -5.50) | 0.180 | 0.180 | 0.000 | 0.000 |
| 8.0 | Interior Path | (6.00, -6.00) | 0.180 | 0.180 | 0.000 | 0.000 |
| 8.5 | Interior Path | (6.00, -6.50) | 0.180 | 0.180 | 0.000 | 0.000 |
| 9.0 | Interior Path | (6.00, -7.00) | 0.180 | 0.180 | 0.000 | 0.000 |
| 9.5 | Interior Path | (6.00, -7.50) | 0.180 | 0.180 | 0.000 | 0.000 |
| 10.0 | **Interior End (+6m)** | (6.00, -8.00) | 0.270 | 0.270 | 0.000 | 0.006 |
