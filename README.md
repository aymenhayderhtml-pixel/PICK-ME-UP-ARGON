# Pick Me Up

A 3D browser gacha-and-action-RPG built with Three.js, based on the manhua
**Pick Me Up: Infinite Gacha**.

> **Status: in active development.** The hub and floors 1–2 are built out, and the
> floor 5 boss fight works. Floors 3+ reuse a placeholder art generator, and two
> of the four test scripts currently fail. Read
> [Known limitations](#known-limitations) before describing or demoing this build.

![Niflheimr, the hub town](docs/images/hub.png)

*Niflheimr — the hub town, a 12-sided walled island. Summon heroes, train and
forge them, then send a party of up to 5 into the Tower.*

---

## The two modes

**Hub — Niflheimr.** You are the Master. Summon heroes with Gems and Summon
Tickets, level them up at the Training Grounds, promote and synthesise them,
forge their gear at the Blacksmith, and pick a party. Iselle, the winged fairy
administrator, complains about all of it.

**Tower.** You play as Han Islat in third person, fighting alongside a squad of
AI companions you command in real time.

**Permadeath is real.** A hero that reaches 0 HP is deleted from the save. There
is no revival, and no undo.

Full design notes: [`docs/GDD.md`](docs/GDD.md) and [`docs/LORE.md`](docs/LORE.md).

---

## Quick start

```bash
npm install
npm run dev
```

Then open **http://localhost:5173**.

Requires **Node 20.19+ or 22.12+** — that comes from Vite 8, and is not yet
declared in `package.json` (see [Known debt](#known-debt)). Verified working on
Node 22.14.0.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload, port 5173 |
| `npm run build` | Production bundle into `dist/` (relative `base`, so it is portable) |
| `npm run preview` | Serve the built `dist/` locally |

**There is no `npm test`.** Testing is done with standalone Node scripts — see
[Testing](#testing).

---

## Controls

### Gameplay

| Key | Action |
|---|---|
| `W` `A` `S` `D` | Move |
| **Right click** | Attack — 3-hit combo |
| **Left click** (hold) | Block / guard |
| `F` | Shield bash while blocking, otherwise attack |
| `Q` | Roll / evade |
| `E` | Interact |
| `C` (hold) | Open the squad command wheel, then `1`–`6` to pick an order |
| `X` | Toggle auto-combat |
| `Shift` | Sprint |

Attack is **Right click** and block **Left click** by default; this is
swappable in Options. Mouse buttons do **not** attack in the Hub.

Squad orders on the command wheel, from `src/combat/Commands.js`:

| Key | Order |
|---|---|
| `1` | Follow |
| `2` | Hold Position |
| `3` | Attack Target |
| `4` | Fall Back |
| `5` | Focus Boss |
| `6` | Loose Arrows |

### Camera

| Key | Action |
|---|---|
| Arrow keys | Orbit and pitch (manual) |
| Mouse wheel | Zoom |

Options exposes follow speed (Tight / Normal / Loose), camera distance
(Near / Normal / Far), and an auto-turn-behind toggle.

### Interface

| Key | Action |
|---|---|
| `R` | Hero Roster |
| `T` | Deploy / enter the Tower |
| `O` | Options window |
| `Esc` | Close the open system window |
| `M` | Mute audio |
| `` ` `` | Toggle the FPS counter |
| `?` | Toggle the control hints |

---

## Architecture

Vanilla ES modules — no framework, no build-time codegen, one system per file.

| Directory | Purpose |
|---|---|
| `src/main.js` | Entry point: renderer, scene registration, RAF loop |
| `src/core/` | Engine services — input, scene switching, global game state, inventory, stats |
| `src/player/` | Third-person avatar and camera rig |
| `src/scenes/` | `HubScene.js` (Niflheimr) and `TowerScene.js` (raid combat) |
| `src/world/` | Floor geometry, procedural generators, props, seeded floor layouts |
| `src/art/` | Procedural model factory — heroes, weapons, enemies, Iselle, town, floor art |
| `src/combat/` | Hit resolution, enemies, AI brains, boss, telegraph, projectiles, command definitions |
| `src/ui/` | DOM HUD and every system window (Summon, Roster, Deploy, Synthesis, Blacksmith, …) |
| `src/gacha/` | Summon rates, draws, cinematic summon effect |
| `src/hub/` | Hub-specific logic — Iselle NPC, town NavGrid, hero NPCs, training, synthesis effect |
| `src/data/` | Pure data and formulas — heroes, enemies, items, skills, missions, `rules.js` |
| `src/fx/` | Slash trails, weapon FX, arrival dome |
| `src/debug/` | Ground & rig diagnostic overlay |

Progress is saved to `localStorage` under `pickmeup_save_v1`.

---

## The procedural art system

This is the defining constraint of the project, and it is strict:

- **Primitives only.** No external 3D models and no external textures — not
  `.gltf`, not `.png`. Every mesh is built from `THREE.*` geometry at runtime.
- **Textures are generated in code** on a `<canvas>` and wrapped in a
  `CanvasTexture`.
- **Determinism comes from a seeded PRNG** (Mulberry32), so a given floor seed
  always regenerates the same layout. `src/world/floorLayouts.js` is the single
  source of truth for floor layouts.
- **Draw-call budgets** are declared per quality tier in
  `src/art/floors/FloorAssembler.js`:

  | Quality | Triangle budget | Draw-call budget |
  |---|---|---|
  | High | 240,000 | 48 |
  | Medium | 156,000 | 40 |
  | Low | 96,000 | 34 |

- **Floor art dispatch:** floor 1 → `farm.js`, floor 2 → `prairie.js`, floors 3+
  → `forest.js`.

The town and floor art modules are written against a contract rather than being
hand-modelled. See [`docs/ART_CONTRACT.md`](docs/ART_CONTRACT.md).

---

## Testing

There is no test runner, no linter, and no formatter configured. Verification is
four standalone Node scripts run directly. `npm install` must have run first.

```bash
node test-floor-layouts.mjs
node test-rig-locomotion.mjs
node test-walkheight.mjs
node test-walk-buildings.mjs
```

| Script | What it checks | Status |
|---|---|---|
| `test-floor-layouts.mjs` | Regression equality test — reproduces the original farm/forest layout math and asserts `generateFloorLayout()` still matches across 8 cases, plus walkability sampling | **FAILING** |
| `test-rig-locomotion.mjs` | Hero rig idle/walk/run: hip amplitude, step frequency, minimum foot sole height, foot correction clamp | Passing |
| `test-walkheight.mjs` | The cached `WalkHeightMap` against direct raycasts at 15 named town landmarks, 0.08 m tolerance | **FAILING** |
| `test-walk-buildings.mjs` | Door-to-interior walk height for all 8 buildings, step-jump limits, and the `UndergroundGuard` snap-back | Passing |

The two walk-height scripts stub a 2D canvas context, so **all four run headless
with no display and no GPU.**

### Current failures

Both failures are pre-existing on the working tree, not caused by recent
changes:

- **`test-floor-layouts.mjs`** — aborts at floor 2 (seed 15851) with
  `exitPosition.x: 0 !== 5.110209415666759`. The test's inline reference
  implementation predates the floor 2 prairie layout, so its expected value is
  stale.
- **`test-walkheight.mjs`** — 8 of 15 landmarks pass. Worst deviation is
  **1.26 m** at the Dormitory entrance against a 0.08 m tolerance, with the
  Summoning stairs, Town Square, Space-Time Rift, Cottage 1 and the wall base
  also out of tolerance. Note that `test-walk-buildings.mjs`, which covers the
  same ground, currently passes — so the cached map and the direct raycasts have
  genuinely diverged in these spots.

Fixing these is the obvious next task; neither has been diagnosed yet.

---

## Art viewer harness

Six standalone pages for iterating on art modules in isolation. They are served
by the dev server only — start `npm run dev`, then visit:

| Page | Module |
|---|---|
| `http://localhost:5173/art-test.html` | Hero / Argon — presets, poses, armor |
| `http://localhost:5173/art-enemy-test.html` | Enemies |
| `http://localhost:5173/art-weapon-test.html` | Weapons |
| `http://localhost:5173/art-iselle-test.html` | Iselle |
| `http://localhost:5173/art-town-test.html` | Niflheimr town |
| `http://localhost:5173/art-floor-test.html` | Floor art |

---

## Developer shortcuts

All of these are bound in the scene and UI files, **not** in `src/core/Input.js`.

> ⚠️ **Eight documented cheats are dead code** — see
> [Known limitations](#known-limitations). The list below only contains bindings
> that actually work.

### Progress

| Key | Where | Action |
|---|---|---|
| `F1` | Hub | **Hard reset** — wipes `pickmeup_save_v1` from `localStorage` and reloads. Destroys all progress. |
| `F2` | Hub / Tower | Prompt for a floor number (1–100), jumps there and marks the tutorial done |
| `[` / `]` | Tower | Previous / next floor (1–5) |
| `H` | Tower | Return to the Hub |
| `Shift+G` | Tower | Force the exit gate open |

### Resources

| Key | Where | Action |
|---|---|---|
| `P` | Tower | Pin the boss weapon for 1.8 s (must be within 6 m) |

### Debug

| Key | Where | Action |
|---|---|---|
| `F3` | Both | Diagnostics panel — draw calls, triangles, FPS, light pool, per-module mesh counts. In the Hub it also shows a minimap. |
| `F6` | Hub | Toggle the NavGrid collision debug mesh and collider wireframes; logs the stuck-hero count |
| `F7` | Hub | Hero audit — per-NPC rig, foot height vs. walk height, pose, opacity; flags anomalies in the console |
| `F12` | Hub | Toggle the WalkHeight debug point cloud (8 m radius around the player at 0.5 m spacing) |
| `\` | Both | Ground & rig diagnostic overlay in the Hub, tower debug overlay in the Tower |
| `Shift+\` | Hub | Record 5 s of telemetry into a markdown table and copy it to the clipboard |
| `Shift+F` | Tower | Hide/show the floor art group |
| `[` / `]` | Hub | Step time of day back/forward by 0.05 |
| `Shift+[` / `Shift+]` | Hub | Pause/resume the day cycle; jump to the next keyframe |
| `Insert` / `Shift+Insert` | Hub | Cycle Iselle's pose / expression (only while `F3` is open) |

---

## Documentation

### Required reading

| File | Contents |
|---|---|
| [`docs/GDD.md`](docs/GDD.md) | Game design document — concept, rules and formulas, controls, camera system |
| [`docs/LORE.md`](docs/LORE.md) | Premise, world, core cast, Tower rules |

### Engineering reference

| File | Contents |
|---|---|
| [`docs/FLOOR_LAYOUT.md`](docs/FLOOR_LAYOUT.md) | Dumped reference for `src/world/floorLayouts.js` |
| [`docs/TOWN_LAYOUT.md`](docs/TOWN_LAYOUT.md) | Dumped reference for `src/art/town/layout.js` |
| [`docs/ART_CONTRACT.md`](docs/ART_CONTRACT.md) | The contract every art module is written against |
| [`docs/ART_ISSUES.md`](docs/ART_ISSUES.md) | Open art issues and verified-working items |
| [`docs/GROUND_DEBUG.md`](docs/GROUND_DEBUG.md) | Ground and locomotion debugging write-ups |
| [`docs/AUDIT.md`](docs/AUDIT.md) | System-by-system audit — partly superseded by later tasks |
| [`docs/TOWN_PLACEMENT_REPORT.md`](docs/TOWN_PLACEMENT_REPORT.md) | Town building placement report |

### Art pipeline

`docs/ARGON_PROMPT_*.md` are briefs handed to an AI art agent to generate new
art modules; `docs/ARGON_OUTPUT_06a_farm.md` is the generated source pasted
back. This is how most of the art in the project was produced.

### Work ledger

[`TASKS.md`](TASKS.md) tracks everything. Gameplay tasks are `T###`, art plan
tasks are `A##`. All gameplay tasks are complete; the open items are `A02`
(enemy batch 2), `A06b` (forest floor art) and `A06d` (floor iteration).

---

## Contributing

The house rules live in [`GEMINI.md`](GEMINI.md):

- **Stack:** Vite + vanilla JS + Three.js only. No other libraries unless asked.
- **Assets:** primitives only — no external 3D models or textures.
- **Architecture:** one system per file, organised under `src/`.
- **Workflow:** after every task, update `TASKS.md` and write a report of 5
  lines maximum.
- **Scope discipline:** never rewrite files you were not asked to touch.
- **Required reading:** `docs/LORE.md` and `docs/GDD.md` before adding features.

---

## Known limitations

Features that are described in the design docs but **are not implemented**. They
are listed here so they do not get described as features.

- **Tarot cards.** `TASKS.md` T025 lists them in the manhua systems pass. There
  are zero references to tarot anywhere in `src/`.
- **Orcs, crystal slime, rock crawler.** Listed in `docs/ART_CONTRACT.md` as
  LATER enemy types and in `TASKS.md` A02 (still unchecked). Only goblins and
  the prairie wolf exist.
- **Milestone bosses.** `src/data/missions.js` returns `BOSS_BATTLE` for every
  floor where `floorNumber % 5 === 0`, but only **floor 5** actually spawns a
  boss. Floors 10, 15, 20 and so on advertise "DEFEAT THE BOSS!" and spawn
  nothing.
- **The floor 100 win condition.** The GDD states *"Win: clear 100 floors."* There
  is no victory sequence — it exists only as a UI string on the Dungeon Board.
- **Floors 3+ art.** `src/art/floors/forest.js` is a ~169-line stub: a ground
  plane, a road ribbon, clearing discs, two gates and pillar cylinders. Floors 6+
  reuse the same seeded forest generator with scaled grunts and no unique
  content.
- **Eight dead debug cheats.** These handlers compare against `'KeyF9'` … `'KeyF12'`
  and `'KeyF5'` … `'KeyF8'`, but `KeyboardEvent.code` for the function row is
  `F1`–`F12`; the `Key*` prefix only applies to the letter block. **These can
  never fire.** Affected: `src/scenes/HubScene.js:575,582,589,596` (+1000 Gems,
  +50,000 Gold, +1 Awakening Stone, +20 materials) and
  `src/scenes/TowerScene.js:845,849,854,856` (kill all enemies, spawn a leader,
  teleport to the boss arena, boss HP to 55%).
- **Two failing test scripts** — see [Testing](#testing).

## Known debt

- `package.json` has `name: "pick-me-up--2-"`, and `index.html` has
  `<title>pick-me-up--2-</title>`.
- No `description`, `license`, or `engines` field in `package.json`, and
  `private: true`. **There is no LICENSE file and this project currently has no
  license** — add one before distributing.
- No `.nvmrc` or `.node-version`, despite Vite 8 having a hard Node floor.
- Dead Vite starter files that nothing imports: `src/counter.js`,
  `src/style.css`, `src/assets/`.
- `docs/ART_ISSUES.md:37` cites `/tmp/opencode/run-towerfloor.mjs` as evidence
  for floor smoke-testing. That harness lived outside the repo and no longer
  exists.
- `screenshot_hub.png` at the repo root is rewritten on every `npm run dev` by
  the `/screenshot` middleware in `vite.config.js`, so it churns constantly. The
  copy under `docs/images/` is the frozen one.
- `docs/GDD.md` states the hero level XP formula as
  `Math.round(20 * level^1.5)`, but `src/data/rules.js` implements
  `Math.round(10 * Math.pow(level, 1.5))`.
- The working tree carries a large volume of uncommitted changes across ~24 files,
  including seven deleted `test-*.mjs` scripts. Only one commit exists so far.

---

## Acknowledgements

Based on the manhua **Pick Me Up: Infinite Gacha**. All art in this project is
generated procedurally at runtime from Three.js primitives — there are no
external assets.
