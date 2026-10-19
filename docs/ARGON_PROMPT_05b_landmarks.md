# Argon Prompt: Niflheimr Town Landmarks (src/art/town/landmarks.js)

Attach these panels: (a) the aerial view of the 12-sided island with the wall and the buildings, (b) the labeled top-down map with Residences, Training Grounds, Town Square, Landing Area, Alchemy Facility and Battle Facility, (c) the three buildings panel with the Synthesis Chamber, the Armory and the Space-Time Rift, (d) the training grounds with the cross-post dummies, (e) the Summoning Room with the three men, (f) the night plaza with the colonnade, (g) a screenshot of the current game town.

We are building a browser game with Three.js r160 based on the manhwa Pick Me Up: Infinite Gacha. Heroes, enemies, weapons and the guide fairy already exist. Now I need the main hub town (the Waiting Room, called Niflheimr), the most important place of the game, so make it as beautiful and detailed as the budget allows. I attach reference panels. Players spend most of their time here.

---

## TOWN CONTRACT

The town is split into 3 art modules, each a separate file in src/art/town/ that Argon writes. All are ES modules; only import: import * as THREE from ‘three’ (Three.js r160) and, allowed, mergeGeometries from ‘three/examples/jsm/utils/BufferGeometryUtils.js’. No external files and no network; canvas textures up to 512x512 are allowed. Everything is procedural.
MODULES:
(1) src/art/town/shell.js exports buildTownShell(ctx): the 12-sided wall, the terrain mesh, the island underside, the cliff edge, the moss and ivy, the sky dome and the sea of clouds, the lighting preset, the floating leaves and sparkles, the fog settings.
(2) src/art/town/landmarks.js exports buildTownLandmarks(ctx): the Summoning Room, Town Square floor emblem, Landing Area, Space-Time Rift gate, Synthesis Chamber, Armory, Training Grounds, Mess Hall row, Dungeon Board.
(3) src/art/town/village.js exports buildTownVillage(ctx): the residences (cottages with gardens), hedges, trees, lamp posts, fences, benches, barrels, crates, paving stones, road decoration, small props, ground details (flowers, grass tufts, pebbles).
ctx = { layout: LAYOUT (read from src/art/town/layout.js: positions and sizes are FIXED by it and must not be changed), getGroundY: (x,z) => y, quality: ‘low’ | ‘medium’ | ‘high’, seed: integer, time: ‘night’ | ‘dusk’ }.
Every build function returns TownModule = {
group: THREE.Group,
colliders: array of { type: ‘circle’, x, z, r } or { type: ‘box’, x, z, w, d, rotY } // ground-plane footprints that block walking (walls, buildings, big trees, fences, props)
doors: array of { id, position: Vector3, outward: Vector3 (unit, ground plane) } // must match the layout door ids
anchors: object of named Object3D or Vector3 (signs positions: anchors[‘sign_<id>‘], lights, the portal center, the sphere pedestal, the anvil, etc.),
lights: array of { position: Vector3, color: hex, intensity: number, distance: number } // desired point lights; the engine decides how many to activate (max 8). Do NOT add THREE.PointLight or SpotLight yourself; use emissive materials for glow.
update(dt, camera) // optional animation (flicker, portal pulse, leaves, drifting mist); cheap; safe every frame
setQuality(q) // rebuilds or toggles detail without leaking
getStats() -> { meshes, triangles, drawCallsEstimate }
dispose()
}
BUDGET (quality ‘high’ on an Intel UHD integrated GPU, the visible whole town must stay above 30 FPS): shell at most 70,000 triangles and 20 draw calls; landmarks at most 120,000 triangles and 50 draw calls; village at most 150,000 triangles and 60 draw calls. ‘medium’ is about 60 percent of those numbers and ‘low’ about 30 percent. The 3 modules together at most 340,000 triangles and 130 draw calls on ‘high’. METHOD: merge all static geometry that shares a material into one BufferGeometry (vertex colors for variation); use InstancedMesh for repeated elements (cottages, trees, hedges, paving stones, columns, fence posts, lamp posts, leaves); give every module at most 12 distinct materials; share and cache geometry; no per-frame allocation; no real-time shadows (shadows are faked with baked vertex-color ambient occlusion and a few dark decal quads); use at most 2 canvas textures per module (stone, plaster, moss) with mipmaps and repeat wrapping; LOD: for ‘high’ provide simple distant versions for the cottages and trees (swap by distance in update(dt, camera) using InstancedMesh counts or visibility, not new allocations). Frustum culling stays enabled; split big merged meshes into 4 spatial chunks so culling works.
LOOK (the manhwa’s Waiting Room): a cold teal moonlit night. Pale ivory-gray stone covered in moss and ivy, slightly ruined but orderly: weathered walls, small cracks, worn steps, mossy edges. White plaster half-timbered cottages with dark timber beams, gray slate gable roofs, small windows with a warm 0xffc27a glow. Floating blue-teal curved leaves and glints drifting in the air. A sea of fog clouds below the floating island, with dark forest tops showing through. Colors: stone 0xb9c0c6 to 0x7d8f94, moss 0x3f5a3a to 0x5f8a4a, timber 0x2b2623, plaster 0xdfe3df, slate 0x4a5560, teal accents 0x6fe0f0, background 0x0f2a33, fog 0x1d4a55. The only warm light sources are the windows, the Armory forge and a few lamp posts. Style: stylized semi-realistic toon like the characters (MeshToonMaterial with a 4-step gradientMap; thin outlines ONLY on the big silhouettes if cheap, e.g. the landmark buildings; none on instanced small props).
SCALE: heroes are 1.75 units tall. Doors are 2.2 units tall and 1.4 wide. Cottage 6 x 5 x 5 (with the roof). Steps 0.2 high. The town island has an apothem of the LAYOUT wall.

---

## RELEVANT LAYOUT SLICE (Landmarks and Architectural Coordinates)

| Landmark ID | Name | Center (X, Z) | Footprint / Dimensions | Door (X, Y, Z) | Outward Vector |
| :--- | :--- | :---: | :--- | :---: | :---: |
| `summoning_room` | Summoning Room | (30.0, 4.0) | Cylinder R = 10.0m, H = 11.0m, Terrace +1.8m | (23.5, 1.8, 11.5) | (-0.41, 0.0, 0.91) |
| `landing_area` | Landing Area | (20.0, 26.0) | Circle R = 8.0m (plaza R = 14m) | (20.0, 0.0, 16.0) | (0.0, 0.0, -1.0) |
| `town_square` | Town Square | (14.0, -8.0) | Circle R = 11.0m (wheel emblem floor) | Open Plaza | None |
| `space_time_rift` | Space-Time Rift | (27.0, -27.0) | Stone Arch Box 6.5 × 10.0 × 2.5m | (27.0, 0.0, -25.5) | (0.0, 0.0, 1.0) |
| `synthesis_chamber`| Synthesis Chamber | (0.0, -32.0) | Cylinder R = 8.2m, H = 9.0m, Terrace +1.2m | (0.0, 0.0, -23.8) | (0.0, 0.0, 1.0) |
| `armory` | Armory & Forge | (-6.0, -20.0) | Main 7.0 × 4.5 × 5.0m; Forge 3.5 × 3.2 × 3.8m | (-6.0, 0.0, -17.4) | (0.0, 0.0, 1.0) |
| `training_grounds` | Training Grounds | (-24.0, 20.0) | Dirt Area 16.0 × 16.0m; Fences & Dummies | (-18.0, 0.0, 18.0) | (1.0, 0.0, 0.0) |
| `mess_hall_row` | Mess Hall Row | (8.0, 38.0) | 6 connected houses 22.8 × 4.4 × 4.4m | (8.0, 0.0, 35.8) | (0.0, 0.0, -1.0) |
| `dungeon_board` | Dungeon Board | (6.0, -2.0) | Notice board 2.3 × 3.0 × 0.8m | Open Stand | None |

### Training Dummy & Stand Coordinates
- `dummy_1`: Stand (-26.4, 16.8), Target Dummy (-26.4, 18.0)
- `dummy_2`: Stand (-24.0, 16.8), Target Dummy (-24.0, 18.0)
- `dummy_3`: Stand (-21.6, 16.8), Target Dummy (-21.6, 18.0)

---

## MODULE BRIEF: BRIEF 05b (landmarks.js)

build each landmark with real architectural detail (columns with capitals and bases, arches, cornices, stairs, domes with ribbing, doors with panels and trim, windows, carved reliefs by geometry, plinths): Summoning Room (the big round building with a colonnade and a wide stair down to the Landing Area, an open courtyard inside with a large pale-cyan glowing sphere on an ornate pedestal slowly rotating inside a ring of thin floating rings, glowing glyph lines on the floor, light shafts as faint additive planes); Landing Area (the paving with a big circular summoning glyph made of thin emissive lines and inscribed rings, 4 broken pillars, steps); Town Square (circular plaza with a big wheel emblem in the floor: 2 rings, 8 spokes, hub, inlaid lighter stone, a low fountain-less center plinth); Space-Time Rift (a tall dark stone arch with a carved relief of two winged figures facing each other with their wings raised, built from layered extruded shapes, and a glowing blue portal in the opening with a pulsing swirling shader-free animation made of 3 rotating torus-like rings and a transparent plane with a canvas texture); Synthesis Chamber (a round domed building with 10 columns, a ribbed dome with a lantern, double arched cream doors with gold trim, 4 front steps, a faint red glow at the door, scorch marks); Armory (a small dark timber-and-stone building with barred windows and a heavy door, a forge shed on its side with an orange emissive forge and an anvil, weapon racks and a few weapon silhouettes, the only orange light); Training Grounds (packed dirt with cracks, 12 cross-post dummies in two rows made of a post, two crossbars and a straw bundle, a spiked barricade of angled stakes, barrels, a low stone fence, a weapon rack, trampled marks); Mess Hall row (a long low row of 6 connected houses, shuttered, with a locked sign); Dungeon Board (a wooden notice board with a small roof and pinned papers). Signs: wooden or iron sign plates anchored at anchors[‘sign_<id>‘] (just the plate geometry; the text is drawn by the engine). Match the attached reference panels; the Summoning Room and the Synthesis Chamber are the hero buildings, give them the most detail.

---

## DELIVERABLE RULES

Reply with ONE complete file in a single code block (at most 1500 lines, no TODO placeholders, only the allowed imports). After the code write WIRING NOTES in at most 8 lines (the real triangle and draw call estimates per quality, anything the engineer must know). Do not repeat the contract. If you must choose between detail and the budget, keep the budget.
