# Dev Lab (dev.html) Architecture & Implementation Plan

## 1. Goal
Unify combat sandboxing, weapon art review, spell diagnostics, enemy encounter testing, squad skill tuning, and real-time performance telemetry into a single high-efficiency developer test page: `dev.html` (the "Dev Lab").

## 2. File Layout & Modularity
All shared systems and developer tools reside cleanly under `src/dev/`:

- **`dev.html`**: Entry point page containing the UI shell (top tab bar, collapsible left/right panels, top toolbar, controls help modal, canvas viewport, and telemetry badges).
- **`src/dev/devShared.js`**: Reusable Three.js and DOM visualizer pools shared between `devLab.js` and `src/combat/testSandbox.js` without copy-pasting:
  - Floating damage text pool
  - Ground team decal ring mesh pool
  - Overhead HUD badge pool
  - Swept-capsule / cylinder wireframe mesh pool
  - Swept weapon blade trace line helper
- **`src/dev/devArena.js`**: Full-screen 3D arena setup:
  - Scene, directional & hemisphere lights with soft shadows
  - 36m circular stone arena floor with concentric 4m, 8m, 12m perimeter rings
  - Responsive perspective camera maintaining complete arena visibility across all screen sizes (1280x720, 1920x1080, mobile)
  - Smooth camera tracking and manual orbit controls
- **`src/dev/devPresets.js`**: Character definitions, visual appearance options, and base combat attributes:
  - Heroes: Han Islat, Jenna, Aaron, Velkist, Eolka
  - Enemies: Passive Dummy, Timed Attacker, Elite Poise Dummy, Goblin Grunt, Goblin Shaman, Prairie Wolf
- **`src/dev/devCombatants.js`**: Combatant spawning, state initialization, pattern placement:
  - Spawn patterns: Line, Circle, Cluster
  - Dynamic equipment, grade, and stat overrides
- **`src/dev/devStats.js`**: Live combat telemetry and canvas chart:
  - Real-time combat event listeners: damage dealt/taken, hits, blocks, parries, dodges, poise breaks, kills, deaths
  - 10-second rolling DPS calculator
  - Pre-allocated circular time-series buffer for Hero HP, Stamina, and Poise
  - Canvas 2D chart renderer (zero GC allocations per frame)
  - Report reset and JSON download export
- **`src/dev/devWeapons.js`**: Weapon and shield viewer functionality adapted from `art-weapon-test.html`:
  - 9 weapon kinds, 4 shield kinds, grades E to S+
  - Animation poses & combo loop playback
  - Bow aiming and trajectory test
- **`src/dev/devSpells.js`**: Spell testing & geometric debug visualizers:
  - 6 spells (Fireball, Ice Spike, Lightning Chain, Radiant Mend, Arcane Ward, Meteor)
  - Caster targeting selector, mana & cooldown sliders
  - Debug geometry visualizers (spheres, beams, arcs, splash radius)
- **`src/dev/devCheats.js`**: Developer cheat suite:
  - God mode, infinite stamina, infinite mana, no cooldowns
  - Kill all enemies, heal all combatants, cursor spawner, synchronized attack trigger
- **`src/dev/devStorage.js`**: Scenario preset persistence:
  - LocalStorage save, load, and delete
  - JSON file export and import
- **`src/dev/devLab.js`**: Master controller coordinating UI tabs, toolbar hotkeys, simulation stepping, timescale, cheats, and the 60 FPS update loop.

## 3. Integration with Existing Sandbox
To prevent duplication and avoid breaking `combat-test.html`:
1. Shared pools (damage text, overhead badges, decals, wireframes) are centralized in `src/dev/devShared.js`.
2. `src/combat/testSandbox.js` imports these utilities from `../dev/devShared.js`.
3. `combat-test.html` and `art-weapon-test.html` remain fully functional and untouched in behavior.
4. Core game files (`Player.js`, `Ally.js`, `Enemy.js`, dungeon, hub, gacha, main UI) remain untouched.

## 4. Verification Strategy
- Headless Playwright automation capturing screenshots at 1280x720 and 1920x1080 across every milestone step.
- Full scenario verification: Han vs 3 grunts + 1 elite, parry, dodge, Eolka spell cast, stats report inspection.
- Harsh evaluation report documented in `docs/DEVLAB_QA.md`.
