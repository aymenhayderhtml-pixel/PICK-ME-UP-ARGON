# Agent Rules & Instructions

You are working on **Pick Me Up: Infinite Gacha** (Three.js 0.160 + Vite + Vanilla JS).
Read this file first, then consult `docs/CODEMAP.md`. Keep token consumption minimal and changes precise.

## 1. Start of Every Task
- Read `AGENTS.md`, then consult `docs/CODEMAP.md`.
- Use the **Where Do I Look For...** lookup table in `docs/CODEMAP.md` to pinpoint target files.
- Open **ONLY** the specific files and line ranges required for your task.
- Do **NOT** scan the whole project or re-audit architecture already documented in the map.
- If `docs/CODEMAP.md` is inaccurate or missing a detail, fix it as part of the task.

## 2. Testing Rule (Zero Headless Overhead)
- **Do NOT run the browser, Playwright, dev servers, screenshots, or QA scripts** unless explicitly requested by the user.
- Do NOT write QA docs, scorecards, or audit logs unless specifically instructed. The user tests by hand.
- Allowed verification commands by default:
  - `node --check <file>` on modified/new JS files.
  - `node scripts/check_codemap.mjs` to ensure codemap integrity.

## 3. Scope Rule
- Modify **only** what the task explicitly names.
- **Never touch protected areas** without explicit user permission: `src/world/*`, `src/gacha/*`, `src/hub/*`, `src/ui/*`, `src/player/Player.js`, `src/combat/Ally.js`, `src/combat/Enemy.js`.
- Architecture: One system per file under appropriate `src/` modules. Primitives only (no external 3D models/textures).
- Refactor status: procedural art modules under `src/art/` are split into focused files of strictly <800 lines; use `docs/CODEMAP.md` for the module index.

## 4. Code & Combat Rules
- **Zero allocations in per-frame code**: No `new THREE.Vector3()`, `new THREE.Mesh()`, or closures in `update()` loops. Use preallocated scratch objects (`_v0`, `_q0`) or object pools.
- **Data-driven tuning**: All balancing numbers belong in `src/data/*` or `src/combat/CombatData.js`, never hardcoded in logic loops.
- **Combat conventions**: One hit per target per swing, friendly fire disabled, strongly typed payload objects `{ attacker, target, rawDamage, poiseDamage, hitPos, hitNormal }` instead of positional arguments.

## 5. MAP UPDATE RULE (Mandatory)
- At the end of every task that adds, removes, renames, or moves a file, export, or mapped function:
  1. Update `docs/CODEMAP.md` in the same task (file index line, lookup table row, gotchas, or conventions).
  2. Run `node scripts/check_codemap.mjs` and resolve any warnings/errors.
  3. A task is **not complete** until `node scripts/check_codemap.mjs` outputs `CODEMAP OK`.

## 6. How to Ask the User
- If a task requirement is underspecified or ambiguous, ask **ONE** short, focused question.
- Otherwise, make a sensible senior-dev choice, state what you chose, and proceed.

## 7. Final Report Format (Max 15 Lines)
End every task response with this compact summary:
1. Files changed (one line per file).
2. 3 short manual test steps for the user.
3. Anything risky, skipped, or unfinished.
4. `CODEMAP updated: yes/no (<reason>)`
