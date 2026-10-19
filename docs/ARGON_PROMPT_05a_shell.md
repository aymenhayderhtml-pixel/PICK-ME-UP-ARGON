# Argon Prompt: Niflheimr Town Shell (src/art/town/shell.js)

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

## RELEVANT LAYOUT SLICE (Wall, Terrain, Atmosphere)

| Component | Specification | Coordinate / Dimension |
| :--- | :--- | :--- |
| **Wall** | 12 sides (dodecagon) | Apothem: 46.0 m; Vertex Radius: 47.62 m; Height: 10.0 m; Thickness: 2.5 m |
| **Corner Pillars** | 12 pillars at outer corners | 3.0 × 13.0 × 3.0 m with pyramid cap (radius 2.3 m, height 1.5 m) |
| **Pilasters** | Vertical buttresses along panels | 6.0 m spacing; 2.85 × 10.5 × 0.7 m |
| **Space-Time Rift Wall Opening**| Wall opening at (27.0, -27.0) | Opening width: 6.5 m, height: 10.0 m, stone frame |
| **Cliff Edge Ring** | Outer rocky mossy ledge | Inner radius: 45.5 m; Outer radius: 53.5 m |
| **Inverted Rock Cone** | Island underside | Top radius: 54.0 m; Depth: 60.0 m (down to y = -60.0 m) |
| **Terrain Plane** | Centered at (0, 0) | Size: 94.0 × 94.0 m; Subdivisions: ~120 × 120; Height from `getGroundY(x, z)` |
| **Building Darkening Pads** | Baked vertex color AO | Summoning Room (30, 4, R=12), Synthesis Chamber (0, -32, R=10), Landing Area (20, 26, R=14), Town Square (14, -8, R=12), Rift (27, -27, R=8), Armory (-6, -20, R=8), Residences (-26, -4, R=15), Training (-24, 20, R=13), Mess Hall (8, 38, R=10) |

---

## MODULE BRIEF: BRIEF 05a (shell.js)

The 12-sided wall: tall flat panels with vertical pilasters, a stepped top ledge with a walkway edge, mossy ivy hanging down in strips (merged quads with vertex colors, alpha tested), corner pillars with caps, cracked and chipped details by vertex color, subtle repeating stone texture (canvas), arched alcoves and old iron brackets on some panels; the gate arch frames for the Space-Time Rift position (just the wall opening and the stone frame; the portal itself is in landmarks.js); the ground: one terrain mesh (a subdivided plane displaced with getGroundY, about 120 by 120 segments) with vertex colors for pale flagstone, darker mud near the walls and moss patches, plus baked darkening near building footprints from layout; the outside: a rocky mossy cliff lip, the inverted floating-island rock cone below with moss and hanging roots, a dark sea of fog clouds (several large soft transparent layers with a drifting texture) with tree-top silhouettes poking through, far distant faint floating rocks; the sky dome with a gradient from deep teal 0x0f2a33 up to 0x051218, a faint moon disc with a glow, a few stars, thin streaks of cloud; floating curved teal leaves (instanced, 120 on high) drifting with sway and slow spin, 200 tiny glints (points); a lighting preset exported in the module (anchors.lighting = { ambient, hemisphere, moon direction and color, fog color near far }) that the engine applies. The ground texture must not stretch on slopes.

---

## DELIVERABLE RULES

Reply with ONE complete file in a single code block (at most 1500 lines, no TODO placeholders, only the allowed imports). After the code write WIRING NOTES in at most 8 lines (the real triangle and draw call estimates per quality, anything the engineer must know). Do not repeat the contract. If you must choose between detail and the budget, keep the budget.
