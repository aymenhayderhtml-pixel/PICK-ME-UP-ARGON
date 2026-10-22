# Prompt for a 3D-Capable Browser AI — Floor 3 Overhaul Design Spec

> Copy everything below the `---PROMPT START---` line and paste it into a browser AI that is strong at 3D (e.g. a model that can reason about Three.js scenes, lighting, layout and procedural geometry). When it returns an answer, paste the answer back to me and I will implement it in the codebase.

---PROMPT START---

You are a senior 3D scene designer and Three.js engineer. I need a complete, implementable design specification for the **Floor 3 overhaul** of my game, "Pick Me Up: Infinite Gacha" (Three.js 0.160, Vite, Vanilla JS, ES modules). The game builds ALL 3D with procedural primitives only — no external models, no textures, no asset files. Every mesh is built from BoxGeometry/CylinderGeometry/SphereGeometry/etc. with MeshStandardMaterial/MeshBasicMaterial.

## Project constraints you must respect
- Three.js r0.160 API.
- Primitives only (Box/Cylinder/Sphere/Cone/Plane/Ring/Torus). No GLTF/GLB, no image textures, no normal maps.
- Zero per-frame allocations: no `new THREE.Vector3()` / `new THREE.Mesh()` / closures inside `update()` loops. Preallocate scratch objects (`_v0`, `_q0`) or pools.
- Data-driven tuning: all balancing numbers, colors, positions, lighting values belong in `src/data/*` or scene constants, never hardcoded in logic loops.
- Lighting budget: at most ~8 lights total per scene (1 ambient, 1 hemisphere, 1 directional, up to 4 point lights). No shadows (`castShadow = false` everywhere).
- Tone mapping: ACESFilmicToneMapping. Keep near/far sane.
- File ownership: you may only propose changes to these files for the 3D/environment side: `src/scenes/TowerScene.js`, `src/art/floors/forest.js`, `src/art/floors/FloorAssembler.js`, `src/data/missions.js`, `src/data/rewards.js`, `docs/CODEMAP.md`. Do NOT touch `src/world/*`, `src/player/Player.js`, `src/combat/Ally.js`, `src/combat/Enemy.js`, `src/ui/Hud.js`, `src/ui/SystemWindow.js`, `src/gacha/*`, `src/hub/*`.

## What Floor 3 is (canon, already implemented in data)
- Mission banner (top-center `.mm-panel`):
  - Line 1: `FLOOR 3`
  - Line 2: `MISSION CATEGORY - SUBJUGATION`
  - Line 3: `GOAL - ANNIHILATE ALL THE ENEMIES!`
- Enemies: exactly 4 Armored Goblins (Lv. 4) on first run; 2 on repeat run. Spawn positions (world space, z negative = forward into the floor):
  - First run: (-3,-32), (3,-32), (-1,-36), (2,-36)
  - Repeat run: (-2,-34), (2,-34)
- Rewards (first clear): 7,000G, IRON ORE (C) x2, LEATHER (C) x1, 0 gems, 0 tickets.
- Transition: on entering Floor 3, two sequential system notices:
  - `CONGRATULATIONS ON COMPLETING THE 2ND FLOOR!`
  - `YOU WILL PROCEED TO THE 3RD FLOOR.`
- Lighting already defined as `BRIGHT_FOREST_LIGHTING` (bright daytime forest clearing). Keep it or refine it.

## Visual target (from my reference screenshots — describe, since you cannot see them)
1. CURRENT GAME SCREENSHOT (low-poly, third-person camera, slight downward angle):
   - Dark green ground plane, flat pale-green sky/background.
   - Four small brown quadruped enemies standing on a **lighter circular patch** of ground in the mid-distance (this reads as a single forest clearing arena).
   - Party HUD (top-left stat bars HP/STA/MP, party order list with "Han Islat" selected in yellow, Sylvia/Darian/Titus/Boran), top-center `Floor 3 | Enemies: 4` banner, bottom hotbar with "Ember" (Lv1 fire) selected and locked higher fire spells, bottom-right `Lvl 3 / FPS 60`.
   - Player characters: blonde archer with bow (left foreground), staff user (right foreground, partially cut), three more party members facing away mid-ground (blue sword, spear/staff, small blade).
   - Overall: sparse, open field, no buildings, single clearing patch.

2. COMIC PANEL — STAGE CLEAR / REWARDS (target aesthetic for the clear screen):
   - Dark purple/black notification boxes with ornate silver filigree corner borders.
   - Box 1: `STAGE CLEAR!` / `JENNA (★) HAS LEVELED UP!` / `MVP - JENNA (★)`.
   - Box 2 (REWARD): three icons in a row — gold coins `7,000G`, black/dark grey angular ore chunks `IRON ORE (C) x2`, brown/reddish leather hide `LEATHER (C) x1`.
   - Battlefield below: pale green grassy field, defeated dark greenish-grey insect/monster enemies scattered (legs up), a red/orange-haired archer woman (Jenna) in a beige tunic with quiver, thoughtful pose, speech bubble `THIS SEEMS QUITE DOABLE.`

3. COMIC PANEL — FLOOR 3 MISSION BANNER (target aesthetic for the floor intro + environment):
   - Top banner: dark navy/near-black rounded panel with jagged white/light-purple glowing gothic filigree border; text `FLOOR 3` (largest) / `MISSION CATEGORY - SUBJUGATION` / `GOAL - ANNIHILATE ALL THE ENEMIES!`. Thin dark horizontal rules extend from both sides.
   - Environment: outdoor grassy plain/forest clearing. Green grass foreground, layered green trees/foliage mid-ground, light hazy sky. Small tan/brown leaf/feather shapes drifting (motion debris) on left and right.
   - Enemies: four orc/wolf-beast soldiers — brown/grey fur, glowing red eyes, fanged mouths, pointed ears, plate armor with spiked silver shoulder pauldrons, dark armor with rivets/gems. They roar. (NOTE: my codebase currently uses Armored Goblins (green skin, iron pot/conical helmet with nasal guard, dark iron breastplate, dual iron shoulder pauldrons, crude short sword/shield). Decide whether to keep Armored Goblins or switch to orc/wolf beasts, and justify. If switching, give me the new enemy archetype stats + mesh builder spec consistent with the existing `createEnemyModel`/`ENEMY_TYPES` pattern.)

## What I want from you
Produce a single, structured design specification that I can implement directly. Sections:

### A. Scene Layout & Coordinates
- Overall clearing dimensions, shape (circular arena patch), and how it sits in world space (player spawns near z=0/-5, enemies at z=-32..-36, camera follow).
- How to handle the existing 4-clearing linear layout (`floorLayouts.js` generates 4 clearings spanning ~130m). Recommend: either reuse clearing 1 only for Floor 3, or add a Floor-3-specific single-clearing layout. Give concrete coordinate plan and any new data needed (without editing `src/world/*` — propose the minimal data change in `TowerScene.js` or a new floor-3 layout constant).
- Prop placement: trees, rocks, grass patches, clearing edge, drifting leaf particles. Positions, counts, sizes. Keep triangle/mesh budget reasonable (target < 200 meshes for the floor art).

### B. Lighting & Atmosphere
- Refine or keep `BRIGHT_FOREST_LIGHTING`. Give exact values (background, fog near/far, exposure, ambient/hemi/sun color+intensity+direction). Justify against the comic's "vibrant daytime sunlight filtering through green foliage".
- Any additional point lights (campfire glow, dappled sun shafts)? Respect the 4-point-light pool.

### C. Terrain & Ground
- Ground plane(s): circular lighter patch (the arena) vs surrounding darker grass. Colors, sizes, heights (avoid z-fighting: keep decals 0.02–0.08 proud).
- Grass/foliage: procedural approach (instanced? plain meshes?). Given no textures, suggest color-blocked foliage clusters.

### D. Enemy Visuals
- Keep Armored Goblin OR switch to orc/wolf beast. Recommend one, with reasoning.
- If keeping Armored Goblin: refine the existing mesh (helmet nasal guard, breastplate, pauldrons, sword/shield) — give tweaks (colors, proportions, extra detail primitives).
- If switching: full new archetype spec (stats in `ENEMY_TYPES`, `ARCHETYPES` entry, `getTypeGeometries` additions) consistent with existing patterns, plus AI behavior note (they already use GRUNT AI; armored goblin uses GRUNT AI).

### E. VFX & Motion
- Drifting leaf/feather particles (motion debris): count, size, color, drift direction/speed, pooling approach (preallocated array, update in place, no per-frame `new`).
- Arrival: keep the cyan `ArrivalDome`? Recommend.
- Stage clear: keep existing reward panel but adjust grammar (`JENNA (★) HAS LEVELED UP!`) and styling to match comic (purple-black boxes, silver filigree corners, icon row). Note: `ornaments.js` already provides filigree corners — reuse.

### F. Camera & Framing
- Third-person camera distance/height/FOV for this clearing. Any framing tweaks for the intro (mission banner) and combat.

### G. UI Overlays (manhua fidelity)
- Mission banner styling tweaks to match comic (dark navy panel, jagged glowing gothic border, horizontal rules). Note existing `.mm-panel` / `showMissionBox`.
- Stage-clear panel: exact text lines, icon row (7000G, IRON ORE (C) x2, LEATHER (C) x1), MVP line, level-up line grammar.
- Transition notices text (already implemented) — confirm.

### H. Performance & Budget
- Mesh count target, light count, texture (none) policy, LOD suggestion if any.
- Per-frame allocation audit checklist for the new code.

### I. Implementation Plan (file-by-file)
- For each file I'll touch, list: (file) → (change summary) → (key functions/constants). Keep to the permitted file list. If a change requires a protected file, flag it and propose the smallest safe alternative.
- Include the exact code snippets (constants, materials, geometry calls) where helpful, in Three.js r0.160 syntax.

### J. Verification
- `node --check` list for changed files.
- Manual test steps (3) the user can run in the browser.
- `node scripts/check_codemap.mjs` must print `CODEMAP OK`; list CODEMAP rows to add/update.

## Output format
Return the spec as structured markdown with the sections A–J. Be concrete: numbers, hex colors, coordinates, mesh counts. Prefer the smallest change that achieves the visual target. Do not propose new dependencies. Do not propose external assets. Flag any genuine ambiguity as an "Open Question" with a recommended default. Keep total response focused; avoid vague praise.

---PROMPT END---
