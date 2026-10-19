# Argon Prompt: Niflheimr Town Village (Task A05c)

Attach: the labeled top-down map (Residences, Town Square and Training Grounds zones), the aerial view of the island, the top view of the town, the fireplace and cozy interior panel (for the warm color), the training grounds panel with the hedge and fence, a screenshot of the current town in the viewer at night, a screenshot of the current town at noon.

---

## Context
We are building a browser game with Three.js r160 based on the manhwa Pick Me Up: Infinite Gacha. Heroes, enemies, weapons, the fairy and the shell and the landmarks already exist. Now I need the village of the hub (the Waiting Room, called Niflheimr): the most important place of the game, so make it as beautiful and detailed as the budget allows. The city floats in the sky; its time of day changes (morning, noon, dusk, night); I attach reference panels.

---

## Town Contract & Addendum

### TOWN CONTRACT
The town is split into art modules, each a separate file in `src/art/town/` that Argon writes. All are ES modules; only import: `import * as THREE from 'three'` (Three.js r160) and, allowed, `mergeGeometries` from `'three/examples/jsm/utils/BufferGeometryUtils.js'`. No external files and no network; canvas textures up to 512x512 are allowed. Everything is procedural.

MODULES:
(1) `src/art/town/shell.js` exports `buildTownShell(ctx)`: the 12-sided wall, the terrain mesh, the island underside, the cliff edge, the moss and ivy, the sky dome and the sea of clouds, the lighting preset, the floating leaves and sparkles, the fog settings.
(2) `src/art/town/landmarksMain.js` exports `buildLandmarksMain(ctx)`: Landing Area, Summoning Room, Town Square, Space-Time Rift.
(3) `src/art/town/landmarksWork.js` exports `buildLandmarksWork(ctx)`: Synthesis Chamber, Armory, Training Grounds, Mess Hall row, Dungeon Board.
(4) `src/art/town/village.js` exports `buildTownVillage(ctx)`: the residences (cottages with gardens), hedges, trees, lamp posts, fences, benches, barrels, crates, paving stones, road decoration, small props, ground details (flowers, grass tufts, pebbles).

`ctx = { layout: LAYOUT, getGroundY: (x,z) => y, quality: 'low' | 'medium' | 'high', seed: integer, time: 'night' | 'dusk', PALETTE }`.

Every build function returns `TownModule = {`
- `group: THREE.Group`,
- `colliders: array of { type: 'circle', x, z, r } or { type: 'box', x, z, w, d, rotY }` // ground-plane footprints that block walking
- `doors: array of { id, position: Vector3, outward: Vector3 (unit, ground plane) }` // must match the layout door ids
- `anchors: object of named Object3D or Vector3` (signs positions: `anchors['sign_<id>']`, lights, cottage door lanterns, etc.)
- `lights: array of { position: Vector3, color: hex, intensity: number, distance: number }` // desired point lights; engine activates max 8. Do NOT add `THREE.PointLight` or `SpotLight` yourself; use emissive materials for glow.
- `update(dt, camera)` // optional animation (flicker, portal pulse, sphere rotation); cheap; safe every frame
- `setLighting(lighting)` // updates material emissive intensities and light scales based on shell lighting state; cheap and allocation-free
- `setTimeOfDay(t)` // optional time callback [0, 1)
- `setQuality(q)` // rebuilds or toggles detail without leaking
- `getStats() -> { meshes, triangles, drawCallsEstimate }`
- `dispose()`
`}`

BUDGET (quality 'high' on an Intel UHD integrated GPU, the visible whole town must stay above 30 FPS): shell at most 70,000 triangles and 20 draw calls; landmarksMain at most 62,000 triangles and 25 draw calls; landmarksWork at most 60,000 triangles and 25 draw calls; village at most 150,000 triangles and 45 draw calls. 'medium' is about 60 percent of those numbers and 'low' about 30 percent. The modules together must keep the whole town under 340,000 triangles and 130 draw calls on 'high'.
METHOD: merge all static geometry that shares a material into one BufferGeometry (vertex colors for variation); use InstancedMesh for repeated elements (cottages, trees, hedges, paving stones, fence posts, lamp posts, props, grass tufts); give every module at most 12 distinct materials; share and cache geometry; no per-frame allocation; no real-time shadows (shadows are faked with baked vertex-color ambient occlusion and a few dark decal quads); use at most 2 canvas textures per module (stone, plaster, moss) with mipmaps and repeat wrapping; LOD: for 'high' provide simple distant versions for far cottages and trees (swap by distance in update(dt, camera) using InstancedMesh counts or visibility, not new allocations). Frustum culling stays enabled; split big merged meshes into spatial chunks if helpful.

LOOK (the manhwa's Waiting Room): a cold teal moonlit night. Pale ivory-gray stone covered in moss and ivy, slightly ruined but orderly: weathered walls, small cracks, worn steps, mossy edges. White plaster half-timbered cottages with dark timber beams, gray slate gable roofs, small windows with a warm 0xffc27a glow. Floating blue-teal curved leaves and glints drifting in the air. A sea of fog clouds below the floating island, with dark forest tops showing through.
SCALE: heroes are 1.75 units tall. Doors are 2.2 units tall and 1.4 wide. Steps 0.2 high.

### SHELL TIME OF DAY & LIGHTING CONTRACT
The shell also exports on its TownModule: setTimeOfDay(t) with t in [0,1) wrapping, where 0.00 = early morning mist, 0.30 = bright midday, 0.62 = dusk, 0.78 = night, 0.95 = deep night, and the cycle returns to morning at 1.0, with SMOOTH interpolation between keyframes; and getLighting() -> { background: hex, exposure: number, ambient: { color, intensity }, hemi: { sky, ground, intensity }, sun: { color, intensity, direction: Vector3 (the direction the light comes FROM, normalized) }, fog: { color, near, far }, windowGlow: 0..1, lampGlow: 0..1, skyTop: hex, skyHorizon: hex }. setTimeOfDay updates the sky dome, the sun or moon disc, the stars, the cloud tint and the leaf glow inside the shell; the engine applies getLighting() to its own lights and fog every time it changes. The shell must NOT create real lights. The whole town must be clearly readable at every time of day.

### TOWN CONTRACT ADDENDUM
(a) Landmarks are two modules:
- `src/art/town/landmarksMain.js` exports `buildLandmarksMain(ctx)` for `summoning_room`, `landing_area`, `town_square`, and `space_time_rift`.
- `src/art/town/landmarksWork.js` exports `buildLandmarksWork(ctx)` for `synthesis_chamber`, `armory`, `training_grounds`, `mess_hall_row`, and `dungeon_board`.
Each returns a `TownModule` exactly as in the TOWN CONTRACT. `src/art/town/landmarks.js` stays as a thin wrapper that calls both and merges `group`, `colliders`, `doors`, `anchors`, `lights`, `update`, `setQuality`, `getStats`, and `dispose`.

(b) Every town module also exports `setLighting(lighting)` where `lighting` is the object from `shell.getLighting()`; it only changes material emissive intensities and sign or light intensities: windows scale with `lighting.windowGlow`, lamps and torches with `lighting.lampGlow`, while the portal, the Summoning Room sphere, the Armory forge, and the Synthesis door glow stay always on (their glow may increase a little at night). It must be cheap and allocation-free.

(c) `ctx` also contains `PALETTE` (imported from `src/art/town/palette.js`, modules may import it as a relative path `import { PALETTE } from './palette.js'`).

(d) Readability rule: every building must be clearly readable at every time of day; no black voids (windows and alcoves are recessed with a lighter back wall), every sub-part must touch its neighbor (no floating or loose parts), no concentric ring patterns on any surface, strong silhouettes, pale stone with dark crevices and baked ambient occlusion, moss in joints and on upward-facing edges.

(e) Budgets (quality 'high'):
- `landmarksMain`: at most 62,000 triangles and 25 draw calls.
- `landmarksWork`: at most 60,000 triangles and 25 draw calls.
- `village`: at most 150,000 triangles and 45 draw calls.

(f) Argon reply format for this module: the FIRST reply is the complete file; every later round must be a patch of changed functions or constants only (`REPLACE function`, `ADD function`, `REPLACE constant`, `ADD constant`, `DELETE`) with complete function bodies, as used for the shell.

---

## Shared Palette Values (`PALETTE`)
```javascript
export const PALETTE = {
  // Shell base stone and ground (real values from shell.js)
  wallLit: 0xc4cbcf,
  wallShade: 0x8e9da3,
  groundBase: 0xa9b6ba,
  groundDark: 0x68767c,
  moss: 0x5f8a4a,
  mossDark: 0x436836,
  ivy: 0x436836,

  // Sky colors per time of day (from shell.js TIME_KEYFRAMES)
  skyHorizon: {
    morning: 0xdcefee,
    midday: 0xbfe3ea,
    dusk: 0xe0a8b8,
    night: 0x1d4a55,
    deepNight: 0x173e48
  },
  skyTop: {
    morning: 0x8fc4cf,
    midday: 0x6fb2c8,
    dusk: 0x23305a,
    night: 0x07161c,
    deepNight: 0x051218
  },

  // Default flat sky fallbacks
  skyHorizonNight: 0x1d4a55,
  skyTopNight: 0x07161c,

  // Fixed palette colors
  plaster: 0xdfe3df,
  timber: 0x2b2623,
  slate: 0x4a5560,
  warmWindow: 0xffc27a,
  teal: 0x6fe0f0,
  portalBlue: 0x5ab4ff,
  forgeOrange: 0xff8a3a,
  sphereCyan: 0xa8f4ff,
  crimsonGlow: 0xff3a4a,
  gold: 0xd8b45a,
  dirt: 0xa89f8a,
  wood: 0x6a4a2e,

  // Shell stone and strata compatibility aliases
  stoneLit: 0xc4cbcf,
  stoneMid: 0xaab4ba,
  stoneShade: 0x8e9da3,
  stoneCrevice: 0x5c6b73,
  groundLight: 0xc2cdd0,
  groundWarm: 0xb8b9b4,
  groundCrack: 0x68767c,
  mossMid: 0x5f8a4a,
  mossLight: 0x7aa860,
  mud: 0x7c857d,
  strataLight: 0x939a9e,
  strataBrown: 0x767068,
  strataDarkBrown: 0x54504a,
  strataTeal: 0x455e66,
  strataDeep: 0x23353d,
  iron: 0x2c3236,
  plaqueBronze: 0x5a6b64,
  plaqueFrame: 0x98a2a8,
  tealGlow: 0x6fe0f0,
  tealBright: 0xb8f8ff,
  warmGlow: 0xffc27a
};
```

---

## Layout Slice: Village Specifications
Extracted from `docs/TOWN_LAYOUT.md` and `src/art/town/layout.js`:

### 1. Wall Inner Boundary
- **Sides**: 12 (regular dodecagon perimeter)
- **Apothem**: 46.0 m
- **Inner Apothem**: 44.5 m (inner walkable clear boundary for NavGrid; keep all village structures, fences and props strictly inside R <= 44.5 m)
- **Wall Thickness**: 2.5 m

### 2. Landmark Zone Footprints (DO NOT place village buildings, fences, or trees inside these)
1. **Landing Area**: Center `(20.0, 26.0)`, Footprint Circle `R = 8.0 m` (terrace `R = 14.0 m`), Door at `(20.0, 0.0, 16.0)`, Door Corridor: `[(20.0, 26.0), (20.0, 16.0), (20.0, 13.0)]`.
2. **Summoning Room**: Center `(30.0, 4.0)`, Footprint Cylinder `R = 10.0 m` (terrace pad `R = 12.0 m`, pad height `+1.8 m`), Door at `(23.5, 1.8, 11.5)`, Door Corridor: `[(30.0, 4.0), (23.5, 11.5), (19.5, 20.0)]`.
3. **Town Square**: Center `(14.0, -8.0)`, Footprint Circle `R = 11.0 m` (terrace pad `R = 12.0 m`), Open central wheel emblem plaza.
4. **Space-Time Rift**: Center `(27.0, -27.0)`, Footprint Box `6.5 × 10.0 × 2.5 m` (clearing `R = 8.0 m`), Door at `(27.0, 0.0, -25.5)`, Door Corridor: `[(27.0, -27.0), (27.0, -25.5), (27.0, -23.0)]`.
5. **Synthesis Chamber**: Center `(0.0, -32.0)`, Footprint Cylinder `R = 8.2 m` (terrace pad `R = 10.0 m`, pad height `+1.2 m`), Door at `(0.0, 0.0, -23.8)`, Door Corridor: `[(0.0, -32.0), (0.0, -23.8), (0.0, -20.0)]`.
6. **Armory**: Center `(-6.0, -20.0)`, Footprint Box `10.5 × 4.5 × 5.0 m` (with forge `3.5 × 3.8 m`, clearing `R = 8.0 m`), Door at `(-6.0, 0.0, -17.4)`, Door Corridor: `[(-6.0, -20.0), (-6.0, -17.4), (-6.0, -14.0)]`.
7. **Training Grounds**: Center `(-24.0, 20.0)`, Footprint Box `16.0 × 2.5 × 16.0 m` (field pad `R = 13.0 m`), Door at `(-18.0, 0.0, 18.0)`, Door Corridor: `[(-24.0, 20.0), (-18.0, 18.0), (-15.0, 18.0)]`.
8. **Mess Hall row**: Center `(8.0, 38.0)`, Footprint Box `22.8 × 4.4 × 4.4 m` (6 units, street pad `R = 10.0 m`), Door at `(8.0, 0.0, 35.8)`, Door Corridor: `[(8.0, 38.0), (8.0, 35.8), (8.0, 33.0)]`.
9. **Dungeon Board**: Center `(6.0, -2.0)`, Footprint Box `2.3 × 3.0 × 0.8 m` (clearing `R = 5.0 m`).

### 3. Residences Cottages Registry (Cluster Center: -26.0, -4.0, R = 15.0 m)
Every cottage has base footprint `4.2 × 3.6 × 5.0 m` (W × D × H), rotation `rotY = 0`. Keep 3 units clear in front of every door and along the door corridor.
- `cottage_1`: Row 1 (Outer), Center `(-33.0, -14.0)`, Door `(-33.8, 0.0, -12.19)`, Outward `(0, 0, 1)`, Door Corridor: `[(-33.0, -14.0), (-33.8, -12.19), (-33.8, -10.8)]`
- `cottage_2`: Row 1 (Outer), Center `(-31.0, -8.0)`, Door `(-31.8, 0.0, -6.19)`, Outward `(0, 0, 1)`, Door Corridor: `[(-31.0, -8.0), (-31.8, -6.19), (-31.8, -4.8)]`
- `cottage_3`: Row 1 (Outer), Center `(-29.0, -2.0)`, Door `(-29.8, 0.0, -0.19)`, Outward `(0, 0, 1)`, Door Corridor: `[(-29.0, -2.0), (-29.8, -0.19), (-29.8, 1.2)]`
- `cottage_4`: Row 1 (Outer), Center `(-27.0, 4.0)`, Door `(-27.8, 0.0, 5.81)`, Outward `(0, 0, 1)`, Door Corridor: `[(-27.0, 4.0), (-27.8, 5.81), (-27.8, 7.2)]`
- `cottage_5`: Row 1 (Outer), Center `(-25.0, 10.0)`, Door `(-25.8, 0.0, 11.81)`, Outward `(0, 0, 1)`, Door Corridor: `[(-25.0, 10.0), (-25.8, 11.81), (-25.8, 13.2)]`
- `cottage_6`: Row 2 (Inner), Center `(-23.0, -16.0)`, Door `(-23.8, 0.0, -14.19)`, Outward `(0, 0, 1)`, Door Corridor: `[(-23.0, -16.0), (-23.8, -14.19), (-23.8, -12.8)]`
- `cottage_7`: Row 2 (Inner), Center `(-21.0, -10.0)`, Door `(-21.8, 0.0, -8.19)`, Outward `(0, 0, 1)`, Door Corridor: `[(-21.0, -10.0), (-21.8, -8.19), (-21.8, -6.8)]`
- `cottage_8`: Row 2 (Inner), Center `(-19.0, -4.0)`, Door `(-19.8, 0.0, -2.19)`, Outward `(0, 0, 1)`, Door Corridor: `[(-19.0, -4.0), (-19.8, -2.19), (-19.8, -0.8)]`
- `cottage_9`: Row 2 (Inner), Center `(-17.0, 2.0)`, Door `(-17.8, 0.0, 3.81)`, Outward `(0, 0, 1)`, Door Corridor: `[(-17.0, 2.0), (-17.8, 3.81), (-17.8, 5.2)]`
- `cottage_10`: Row 2 (Inner), Center `(-15.0, 8.0)`, Door `(-15.8, 0.0, 9.81)`, Outward `(0, 0, 1)`, Door Corridor: `[(-15.0, 8.0), (-15.8, 9.81), (-15.8, 11.2)]`
- Zone Door: `residences`, Door `(-18.0, 0.0, -4.0)`, Outward `(1, 0, 0)`, Corridor: `[(-26.0, -4.0), (-18.0, -4.0), (-14.0, -4.0)]`
- Zone Sign Anchor: `anchors['sign_residences']` at `(-18.0, gy + 4.0, -4.0)`

### 4. Paved Road Polylines (from -> to, width)
1. `road_square_landing`: `(14.0, -8.0)` -> `(20.0, 26.0)`, width = 4.8 m
2. `road_square_summoning`: `(14.0, -8.0)` -> `(26.0, 4.0)`, width = 4.5 m
3. `road_square_rift`: `(14.0, -8.0)` -> `(27.0, -27.0)`, width = 5.0 m
4. `road_square_synthesis`: `(14.0, -8.0)` -> `(0.0, -32.0)`, width = 4.5 m
5. `road_square_armory`: `(14.0, -8.0)` -> `(-6.0, -20.0)`, width = 4.2 m
6. `road_square_residences`: `(14.0, -8.0)` -> `(-26.0, -4.0)`, width = 5.0 m
7. `road_square_training`: `(14.0, -8.0)` -> `(-24.0, 20.0)`, width = 4.5 m
8. `road_residences_inner`: `(-32.0, -14.0)` -> `(-20.0, 10.0)`, width = 4.0 m
9. `road_landing_mess`: `(20.0, 26.0)` -> `(8.0, 38.0)`, width = 4.0 m

### 5. Lamp Posts (Positions and Light Specs)
- `lamp_1`: `(14.0, -8.0)`, light: `0xffaa44`, intensity 7.0, distance 14.0 m
- `lamp_2`: `(20.0, 22.0)`, light: `0xffaa44`, intensity 7.0, distance 14.0 m
- `lamp_3`: `(-16.0, -4.0)`, light: `0xffaa44`, intensity 7.0, distance 14.0 m
- `lamp_4`: `(-18.0, 18.0)`, light: `0xffaa44`, intensity 7.0, distance 14.0 m

### 6. Trees
- Cottage gardens: 2 trees per cottage (20 trees total at cottages in layout).
- Open town trees: `(8.0, -14.0, r=1.2)`, `(22.0, -16.0, r=1.2)`, `(10.0, 12.0, r=1.1)`, `(-8.0, 6.0, r=1.1)`.
- Total trees for village: 60 to 90 trees placed between zones, along roads, and in gardens (never on roads or in landmark footprints).

---

## Village Brief

BUDGET on 'high' up to 150,000 triangles and 45 draw calls (the village must keep the whole town under 340,000 triangles and 130 draw calls with the other modules; the other modules use about 82,000 triangles and 53 draw calls now); low about 30 percent and medium about 60 percent.

Contents and details:
(1) **RESIDENCES**: the cottages from the layout, half-timbered with white plaster walls and visible dark timber frames with cross braces, gray slate gable roofs with ridge caps, eaves and a chimney, small paned windows with a warm glow (emissive `0xffc27a`, scaled by `lighting.windowGlow` in `setLighting`, off at morning and noon), a front door with a step and a small lantern (`lampGlow`), planter boxes, 3 or more per-cottage variants (porch, lean-to, side shed, stacked firewood), each cottage with a small hedged garden: a low dark-green box hedge, 2 to 3 round trees, flower beds; cottages are instanced with per-instance color variation; a distance LOD for far cottages; cottage collider footprints.
(2) **ROADS**: pale flagstone roads along the layout polylines with curbs, worn patches, moss in the joints and small grass tufts at the edges, with a different slab pattern from the Landing Area; crossing paths between zones.
(3) **TREES**: round-crowned trees in 3 variants (trunk flare, 3 to 5 blobby crown clusters, dark green with a lighter top, the crowns slightly teal at night), instanced, 60 to 90 trees placed between zones, along the roads and in the gardens, never on a road or in a landmark footprint, with colliders only for big trunks.
(4) **LAMP POSTS**: at the layout positions: an iron post with a base, a lantern with emissive warm glass and a small roof; the lights list gets one entry per lamp; glow scales with `lampGlow`.
(5) **PROPS**: wooden fences, benches, barrels, crates, sacks, wells, stone troughs, flower beds, hay bales, hanging laundry lines in the residences, hanging lanterns between cottages, a cart, signposts; instanced where repeated.
(6) **GROUND DETAIL**: grass tufts, small flowers, pebbles and puddles scattered near paths and walls (instanced, 1500 to 2500 on high), a few mossy rocks, fallen leaves.
(7) **SIGN**: the plate geometry at the ‘residences’ sign anchor.
(8) **ORDER & READABILITY**: Make it feel lived in but orderly, with clear readable paths, nothing blocking the doors (keep 3 units clear in front of every door and along the doorCorridors). Colliders for cottages, fences, wells, big trees, barrels and crates; doors for each cottage; anchors for the residences sign and each cottage door lantern.

---

## Deliverable Rules

Reply with ONE complete file in a single code block (at most 1500 lines, no TODO placeholders, only the allowed imports). After the code write WIRING NOTES in at most 6 lines. Do not repeat the contract. Later rounds will be patches only.
