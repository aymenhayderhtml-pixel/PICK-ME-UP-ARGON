# Argon Prompt: Niflheimr Town Landmarks Main (Task A05b1)

Attach: the Summoning Room panel with the three men, the night plaza with the colonnade, the bright plaza panel with the light beam, the labeled top-down map, the aerial view of the island, the three-buildings panel (look at the Space-Time Rift), the top view showing the wheel emblem, a screenshot of the current town in the viewer.

---

## Context
We are building a browser game with Three.js r160 based on the manhwa Pick Me Up: Infinite Gacha. Heroes, enemies, weapons, the guide fairy and the floating walled city shell already exist. Now I need the main buildings of the hub (the Waiting Room, called Niflheimr): the most important place of the game, so make them as beautiful and detailed as the budget allows. The city floats in the sky; its time of day changes (morning, noon, dusk, night); I attach reference panels.

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
- `anchors: object of named Object3D or Vector3` (signs positions: `anchors['sign_<id>']`, lights, portal center, sphere center, pedestal, etc.)
- `lights: array of { position: Vector3, color: hex, intensity: number, distance: number }` // desired point lights; engine activates max 8. Do NOT add `THREE.PointLight` or `SpotLight` yourself; use emissive materials for glow.
- `update(dt, camera)` // optional animation (flicker, portal pulse, sphere rotation); cheap; safe every frame
- `setLighting(lighting)` // updates material emissive intensities and light scales based on shell lighting state; cheap and allocation-free
- `setTimeOfDay(t)` // optional time callback [0, 1)
- `setQuality(q)` // rebuilds or toggles detail without leaking
- `getStats() -> { meshes, triangles, drawCallsEstimate }`
- `dispose()`
`}`

BUDGET (quality 'high' on an Intel UHD integrated GPU, the visible whole town must stay above 30 FPS): shell at most 70,000 triangles and 20 draw calls; landmarksMain at most 62,000 triangles and 25 draw calls; landmarksWork at most 60,000 triangles and 25 draw calls; village at most 150,000 triangles and 60 draw calls. 'medium' is about 60 percent of those numbers and 'low' about 30 percent.
METHOD: merge all static geometry that shares a material into one BufferGeometry (vertex colors for variation); use InstancedMesh for repeated elements (columns, balusters, steps, paving stones); give every module at most 12 distinct materials; share and cache geometry; no per-frame allocation; no real-time shadows (shadows are faked with baked vertex-color ambient occlusion and a few dark decal quads); use at most 2 canvas textures per module (stone, plaster, moss) with mipmaps and repeat wrapping. Frustum culling stays enabled; split big merged meshes into spatial chunks if helpful.

LOOK (the manhwa's Waiting Room): a cold teal moonlit night. Pale ivory-gray stone covered in moss and ivy, slightly ruined but orderly: weathered walls, small cracks, worn steps, mossy edges. Floating blue-teal curved leaves and glints drifting in the air.
SCALE: heroes are 1.75 units tall. Doors are 2.2 units tall and 1.4 wide. Steps 0.2 high.

### TOWN CONTRACT ADDENDUM
(a) Landmarks are two modules:
- `src/art/town/landmarksMain.js` exports `buildLandmarksMain(ctx)` for `summoning_room`, `landing_area`, `town_square`, and `space_time_rift`.
- `src/art/town/landmarksWork.js` exports `buildLandmarksWork(ctx)` for `synthesis_chamber`, `armory`, `training_grounds`, `mess_hall_row`, and `dungeon_board`.
Each returns a `TownModule` exactly as in the TOWN CONTRACT. `src/art/town/landmarks.js` stays as a thin wrapper that calls both and merges `group`, `colliders`, `doors`, `anchors`, `lights`, `update`, `setQuality`, `getStats`, and `dispose`.

(b) Every town module also exports `setLighting(lighting)` where `lighting` is the object from `shell.getLighting()`; it only changes material emissive intensities and sign or light intensities: windows scale with `lighting.windowGlow`, lamps and torches with `lighting.lampGlow`, while the portal, the Summoning Room sphere, the Armory forge, and the Synthesis door glow stay always on (their glow may increase a little at night). It must be cheap and allocation-free.

(c) `ctx` also contains `PALETTE` (imported from `src/art/town/palette.js`, modules may import it as a relative path `import { PALETTE } from './palette.js'`).

(d) Readability rule: every building must be clearly readable at every time of day; no black voids (windows and alcoves are recessed with a lighter back wall), every sub-part must touch its neighbor (no floating or loose parts), no concentric ring patterns on any surface, strong silhouettes, pale stone with dark crevices and baked ambient occlusion, moss in joints and on upward-facing edges.

(e) Budgets (high): `landmarksMain` at most 62,000 triangles and 25 draw calls; `landmarksWork` at most 60,000 triangles and 25 draw calls.

(f) Argon reply format for this module: the FIRST reply is the complete file; every later round must be a patch of changed functions or constants only (`REPLACE function`, `ADD function`, `REPLACE constant`, `ADD constant`, `DELETE`) with complete function bodies, as used for the shell.

---

## Shared Palette Values (`PALETTE`)
```javascript
export const PALETTE = {
  wallLit: 0xc4cbcf,
  wallShade: 0x8e9da3,
  groundBase: 0xa9b6ba,
  groundDark: 0x68767c,
  moss: 0x5f8a4a,
  mossDark: 0x436836,
  ivy: 0x436836,
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
  wood: 0x6a4a2e
};
```

---

## Layout Slice: Landmarks Main Buildings
Extracted from `docs/TOWN_LAYOUT.md` and `src/art/town/layout.js`:

```javascript
// 1. Landing Area
landing_area: {
  id: 'landing_area',
  name: 'Landing Area',
  center: { x: 20.0, z: 26.0 },
  footprint: { type: 'circle', radius: 8.0, terraceRadius: 14.0 },
  rotation: 0,
  door: {
    id: 'door_landing_area',
    position: { x: 20.0, y: 0.0, z: 16.0 },
    outward: { x: 0.0, y: 0.0, z: -1.0 }
  },
  doorCorridor: [
    { x: 20.0, z: 26.0 },
    { x: 20.0, z: 16.0 },
    { x: 20.0, z: 13.0 }
  ],
  interactionRadius: 8.0,
  signText: 'LANDING AREA',
  signOffset: { x: 0, y: 6.0, z: 0 }
}

// 2. Summoning Room
summoning_room: {
  id: 'summoning_room',
  name: 'Summoning Room',
  center: { x: 30.0, z: 4.0 },
  footprint: { type: 'circle', radius: 10.0, height: 11.0, wallRadius: 10.2 },
  rotation: 0,
  door: {
    id: 'door_summoning_room',
    position: { x: 23.5, y: 1.8, z: 11.5 },
    outward: { x: -0.4138, y: 0.0, z: 0.9104 }
  },
  doorCorridor: [
    { x: 30.0, z: 4.0 },
    { x: 23.5, z: 11.5 },
    { x: 19.5, z: 20.0 }
  ],
  interactionRadius: 8.5,
  signText: 'SUMMONING ROOM',
  signOffset: { x: 0, y: 13.0, z: 0 }
}

// 3. Town Square
town_square: {
  id: 'town_square',
  name: 'Town Square',
  center: { x: 14.0, z: -8.0 },
  footprint: { type: 'circle', radius: 11.0 },
  rotation: 0,
  door: null,
  doorCorridor: null,
  interactionRadius: 8.0,
  signText: 'TOWN SQUARE',
  signOffset: { x: 0, y: 4.0, z: 0 }
}

// 4. Space-Time Rift
space_time_rift: {
  id: 'space_time_rift',
  name: 'Space-Time Rift',
  center: { x: 27.0, z: -27.0 },
  footprint: { type: 'box', width: 6.5, height: 10.0, depth: 2.5 },
  rotation: 0,
  door: {
    id: 'door_space_time_rift',
    position: { x: 27.0, y: 0.0, z: -25.5 },
    outward: { x: 0.0, y: 0.0, z: 1.0 }
  },
  doorCorridor: [
    { x: 27.0, z: -27.0 },
    { x: 27.0, z: -25.5 },
    { x: 27.0, z: -23.0 }
  ],
  interactionRadius: 4.5,
  signText: 'SPACE-TIME RIFT',
  signOffset: { x: 0, y: 12.0, z: 0 }
}
```

---

## Building Brief: `landmarksMain.js` (4 buildings)

1. **Summoning Room (hero building, ~30,000 triangles)**:
   - A large round building (radius and height from layout) in pale ivory stone with a wide colonnade of tall fluted columns with capitals and bases on its south-west side.
   - Cornice and a low ribbed roof or open dome edge.
   - An open courtyard inside holding a large pale-cyan glowing sphere (radius 2.2, emissive, `setLighting` keeps it always lit and brighter at night, slowly rotating, `update(dt)` animates it) on an ornate carved pedestal, surrounded by 3 thin rotating rings.
   - Glowing glyph lines inlaid in the courtyard floor.
   - Wide stair of 8 steps with side balustrades going down toward the Landing Area.
   - Doorway at the top with an arched frame.
   - Moss and ivy on the ledges, a few cracks, soft light shafts as faint additive planes.
   - Anchors: `sphere_center` (or `anchors.summoningSphere`), `pedestal`, `door`, `sign_summoning_room`.

2. **Landing Area (~8,000 triangles)**:
   - Paved circular area with a big summoning glyph made of thin emissive lines, inscribed rings and runes in the stones (clear and bright enough to see at every time of day).
   - 4 broken tall pillars with fallen drums.
   - Wide steps toward the Summoning Room.
   - Worn flagstones with moss in the crevices.
   - Anchors: `door`, `sign_landing_area`.

3. **Town Square (~6,000 triangles)**:
   - Circular plaza with a big wheel emblem inlaid in the floor (2 concentric rings, 8 spokes, central hub) in contrasting lighter and darker stone.
   - Low central plinth.
   - A few curved stone benches around the perimeter.
   - Flagstones with a distinct geometric pattern differing from the regular roads.
   - Anchors: `sign_town_square`.

4. **Space-Time Rift (~16,000 triangles)**:
   - Tall dark-stone arch set into the wall opening (use layout opening dimensions).
   - Carved relief of two winged figures facing each other with raised wings and bowed heads (layered extruded shapes and tapered wing feathers).
   - Carved keystone eye, side pillars, steps in front.
   - Glowing blue portal in the opening: transparent plane with canvas swirl texture and 3 slowly rotating thin ring meshes, pulsing in `update(dt)`; always glowing.
   - Faint blue light entry in returned `lights` array (`{ position, color: 0x5ab4ff, intensity: 6.0, distance: 12 }`).
   - Anchors: `portal_center` (or `anchors.portal`), `door`, `sign_space_time_rift`.

5. **Signs**:
   - Plate geometry placed at the sign anchors for all 4 zones.

---

## Instructions for Argon
Reply with ONE complete file in a single code block (at most 1500 lines, no TODO placeholders, only the allowed imports). After the code write WIRING NOTES in at most 6 lines (real triangle and draw call estimates per quality, anything the engineer must know). Do not repeat the contract.
