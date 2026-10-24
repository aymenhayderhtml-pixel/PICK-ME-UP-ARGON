# Audit Report

## Large files (>800 lines)
prairie.js 3162, farm.js 2379, forest.js 1906, weaponAnimations.js 3167, Hud.js 1367, Player.js 1934 - NOT split (still large). Others not in scope.

## Real split
GameState: split into state/ mixins (partially). TrainingEngine: split into training/ modules. Others not split.

## Imports
check_imports: run manually -> 0 broken (after fixes).

## Tools
codemap: not run fully.

## Runtime
Not run.

## NEEDS DECISION
- Many refactor targets (weaponAnimations, floors, Hud, Player, etc.) were not actually split; require real work.
- Save data shape unchanged (assumed).