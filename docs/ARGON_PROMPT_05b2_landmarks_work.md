# Argon Prompt: Niflheimr Town Landmarks Work (Task A05b2)

Attach: the three-buildings panel (Synthesis Chamber and Armory), the training grounds panels (two), the aerial view of the island, the labeled top-down map, a screenshot of the current town in the viewer.

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
- `anchors: object of named Object3D or Vector3` (signs positions: `anchors['sign_<id>']`, lights, anvil, forge fire, dummy hit targets, etc.)
- `lights: array of { position: Vector3, color: hex, intensity: number, distance: number }` // desired point lights; engine activates max 8. Do NOT add `THREE.PointLight` or `SpotLight` yourself; use emissive materials for glow.
- `update(dt, camera)` // optional animation; cheap; safe every frame
- `setLighting(lighting)` // updates material emissive intensities and light scales based on shell lighting state; cheap and allocation-free
- `setTimeOfDay(t)` // optional time callback [0, 1)
- `setQuality(q)` // rebuilds or toggles detail without leaking
- `getStats() -> { meshes, triangles, drawCallsEstimate }`
- `dispose()`
`}`

BUDGET (quality 'high' on an Intel UHD integrated GPU, the visible whole town must stay above 30 FPS): shell at most 70,000 triangles and 20 draw calls; landmarksMain at most 62,000 triangles and 25 draw calls; landmarksWork at most 60,000 triangles and 25 draw calls; village at most 150,000 triangles and 60 draw calls. 'medium' is about 60 percent of those numbers and 'low' about 30 percent.
METHOD: merge all static geometry that shares a material into one BufferGeometry (vertex colors for variation); use InstancedMesh for repeated elements (columns, dummy posts, barricade stakes, paper sheets, crates); give every module at most 12 distinct materials; share and cache geometry; no per-frame allocation; no real-time shadows (shadows are faked with baked vertex-color ambient occlusion and a few dark decal quads); use at most 2 canvas textures per module (stone, plaster, moss) with mipmaps and repeat wrapping. Frustum culling stays enabled; split big merged meshes into spatial chunks if helpful.

LOOK (the manhwa's Waiting Room): a cold teal moonlit night. Pale ivory-gray stone covered in moss and ivy, slightly ruined but orderly: weathered walls, small cracks, worn steps, mossy edges. Dark timber beams, slate roofs, warm orange forge fire glow.
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

## Layout Slice: Landmarks Work Buildings
Extracted from `docs/TOWN_LAYOUT.md` and `src/art/town/layout.js`:

```javascript
// 1. Synthesis Chamber
synthesis_chamber: {
  id: 'synthesis_chamber',
  name: 'Synthesis Chamber',
  center: { x: 0.0, z: -32.0 },
  footprint: { type: 'circle', radius: 8.2, height: 9.0 },
  rotation: 0,
  door: {
    id: 'door_synthesis_chamber',
    position: { x: 0.0, y: 0.0, z: -23.8 },
    outward: { x: 0.0, y: 0.0, z: 1.0 }
  },
  doorCorridor: [
    { x: 0.0, z: -32.0 },
    { x: 0.0, z: -23.8 },
    { x: 0.0, z: -20.0 }
  ],
  interactionRadius: 7.5,
  signText: 'SYNTHESIS CHAMBER',
  signOffset: { x: 0, y: 15.0, z: 0 }
}

// 2. Armory
armory: {
  id: 'armory',
  name: 'Armory',
  center: { x: -6.0, z: -20.0 },
  footprint: {
    type: 'box',
    width: 10.5,
    height: 4.5,
    depth: 5.0,
    mainWidth: 7.0,
    mainDepth: 5.0,
    forgeWidth: 3.5,
    forgeDepth: 3.8
  },
  rotation: 0,
  door: {
    id: 'door_armory',
    position: { x: -6.0, y: 0.0, z: -17.4 },
    outward: { x: 0.0, y: 0.0, z: 1.0 }
  },
  doorCorridor: [
    { x: -6.0, z: -20.0 },
    { x: -6.0, z: -17.4 },
    { x: -6.0, z: -14.0 }
  ],
  interactionRadius: 4.5,
  signText: 'ARMORY',
  signOffset: { x: 0, y: 5.6, z: 0 }
}

// 3. Training Grounds
training_grounds: {
  id: 'training_grounds',
  name: 'Training Grounds',
  center: { x: -24.0, z: 20.0 },
  footprint: { type: 'box', width: 16.0, depth: 16.0, height: 2.5 },
  rotation: 0,
  door: {
    id: 'door_training_grounds',
    position: { x: -18.0, y: 0.0, z: 18.0 },
    outward: { x: 1.0, y: 0.0, z: 0.0 }
  },
  doorCorridor: [
    { x: -24.0, z: 20.0 },
    { x: -18.0, z: 18.0 },
    { x: -15.0, z: 18.0 }
  ],
  interactionRadius: 8.5,
  signText: 'TRAINING GROUNDS',
  signOffset: { x: 0, y: 4.0, z: 0 },
  dummyPositions: [
    { id: 'dummy_1', stand: { x: -26.4, y: 0, z: 16.8 }, dummy: { x: -26.4, y: 0, z: 18.0 } },
    { id: 'dummy_2', stand: { x: -24.0, y: 0, z: 16.8 }, dummy: { x: -24.0, y: 0, z: 18.0 } },
    { id: 'dummy_3', stand: { x: -21.6, y: 0, z: 16.8 }, dummy: { x: -21.6, y: 0, z: 18.0 } }
  ]
}

// 4. Mess Hall row
mess_hall_row: {
  id: 'mess_hall_row',
  name: 'Mess Hall',
  center: { x: 8.0, z: 38.0 },
  footprint: { type: 'box', width: 22.8, depth: 4.4, height: 4.4 },
  rotation: 0,
  door: {
    id: 'door_mess_hall',
    position: { x: 8.0, y: 0.0, z: 35.8 },
    outward: { x: 0.0, y: 0.0, z: -1.0 }
  },
  doorCorridor: [
    { x: 8.0, z: 38.0 },
    { x: 8.0, z: 35.8 },
    { x: 8.0, z: 33.0 }
  ],
  interactionRadius: 9.0,
  signText: 'MESS HALL (LOCKED)',
  signOffset: { x: 0, y: 5.2, z: 0 }
}

// 5. Dungeon Board
dungeon_board: {
  id: 'dungeon_board',
  name: 'Dungeon Board',
  center: { x: 6.0, z: -2.0 },
  footprint: { type: 'box', width: 2.3, depth: 0.8, height: 3.0 },
  rotation: 0,
  door: null,
  doorCorridor: null,
  interactionRadius: 2.8,
  signText: 'DUNGEON BOARD',
  signOffset: { x: 0, y: 3.4, z: 0 }
}
```

---

## Building Brief: `landmarksWork.js` (5 buildings)

1. **Synthesis Chamber (~26,000 triangles)**:
   - Round domed building (use layout radius and height) in pale stone with 10 columns around it.
   - Ribbed dome with a lantern on top, decorative cornice.
   - Double arched cream doors with gold trim and panels.
   - 4 front steps facing outward along the door direction.
   - Scorch marks and a faint crimson glow from the door gap (always on, slightly brighter at night).
   - Engraved ritual lines on the front floor terrace.
   - Moss and ivy on the ledges.
   - Anchors: `door`, `sign_synthesis_chamber`, `synthesisDoor`.

2. **Armory (~14,000 triangles)**:
   - Small dark timber-and-stone building with barred windows and a heavy iron-banded door.
   - Lean-to forge shed on one side with an orange emissive forge fire (`PALETTE.forgeOrange`), chimney, anvil, quench barrel.
   - Weapon racks with weapon silhouettes (swords, spears, shields as simple flat shapes), crates.
   - The forge is the only orange light source in the district (always on, brighter at night); includes an entry in `lights` (`{ position, color: 0xff8a3a, intensity: 5.5, distance: 9.0 }`).
   - Anchors: `door`, `sign_armory`, `anvil`, `forge`.

3. **Training Grounds (~10,000 triangles)**:
   - Packed-dirt yard (dirt color with cracks and worn marks, irregular edges) using layout dummy positions.
   - 12 cross-post dummies made of a post, 2 crossbars, and a straw bundle with rope wraps.
   - Spiked wooden barricade of angled stakes, 3 barrels, a weapon rack.
   - Low stone fence on two sides with a hedge, a few training swords stuck in the ground.
   - The dummies MUST be separate children named `dummy_0` through `dummy_11` and `anchors['dummy_<i>']` holds their hit points/positions.
   - Anchors: `door`, `sign_training_grounds`, `dummy_0` .. `dummy_11`.

4. **Mess Hall row (~6,000 triangles)**:
   - Long low row of 6 connected houses along the south wall.
   - Shuttered windows, a locked main door with heavy chain.
   - Anchors: `door`, `sign_mess_hall_row`.

5. **Dungeon Board (~3,000 triangles)**:
   - Wooden notice board with a small shingle roof, stone base.
   - Pinned quest papers (thin flat quads in slightly different off-white/tan tones).
   - Lantern hook.
   - Anchors: `sign_dungeon_board`.

6. **Signs**:
   - Plate geometry placed at the sign anchors for all 5 zones.

---

## Instructions for Argon
Reply with ONE complete file in a single code block (at most 1500 lines, no TODO placeholders, only the allowed imports). After the code write WIRING NOTES in at most 6 lines (real triangle and draw call estimates per quality, anything the engineer must know). Do not repeat the contract.
