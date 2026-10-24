# REFACTOR AUDIT — Pick Me Up: Infinite Gacha

## FILE LIST (src/, sorted by lines, BIG = >800)

- 3981 src/art/enemies.js BIG
- 3167 src/art/weaponAnimations.js BIG
- 3162 src/art/floors/prairie.js BIG
- 2635 src/art/town/shell.js BIG
- 2379 src/art/floors/farm.js BIG
- 2045 src/scenes/TowerScene.js BIG
- 1934 src/player/Player.js BIG
- 1906 src/art/floors/forest.js BIG
- 1856 src/art/town/village.js BIG
- 1813 src/scenes/HubScene.js BIG
- 1673 src/core/TrainingEngine.js BIG
- 1425 src/art/town/landmarksWork.js BIG
- 1399 src/core/GameState.js BIG
- 1367 src/ui/Hud.js BIG
- 1364 src/art/iselle.js BIG
- 1338 src/hub/HubHeroes.js BIG
- 1307 src/art/weapons.js BIG
- 1257 src/art/town/landmarksMain.js BIG
- 1227 src/ui/RosterWindow.js BIG
- 1212 src/art/hero.js BIG
- 1126 src/dev/devLab.js BIG
- 1091 src/combat/SpellVFXPool.js BIG
- 1049 src/combat/testSandbox.js BIG
- 915 src/ui/BlacksmithWindow.js BIG
- 846 src/combat/Ally.js BIG
- 846 src/art/artFloorTest.js BIG
- 823 src/data/heroes.js BIG
- 818 src/art/artWeaponTest.js BIG
- 787 src/art/HeroRig.js
- 785 src/ui/DeployWindow.js
- 781 src/combat/SpellSystem.js
- 776 src/art/artTownTest.js
- 770 src/combat/EnemyManager.js
- 745 src/combat/Enemy.js
- 693 src/world/floorLayouts.js
- 682 src/hub/NavGrid.js
- 674 src/combat/HobgoblinChief.js
- 632 src/ui/SynthesisWindow.js
- 631 src/art/town/layout.js
- 619 src/combat/Combatant.js
- 597 src/ui/EquipmentWindow.js
- 573 src/dev/devShared.js
- 531 src/ui/RewardIcons.js
- 529 src/combat/StateMachine.js
- 518 src/core/DailyDecisionEngine.js
- 501 src/art/artTest.js
- 498 src/data/items.js
- 497 src/combat/HitPipeline.js
- 489 src/ui/Notices.js
- 483 src/ui/OptionsWindow.js
- 481 src/art/town/WalkHeight.js
- 464 src/dev/devCombatants.js
- 461 src/ui/DormitoryWindow.js
- 451 src/art/artEnemyTest.js
- 439 src/art/artIselleTest.js
- 436 src/data/skills.js
- 432 src/ui/RewardWindow.js
- 429 src/hub/TrainingManager.js
- 424 src/dev/devWeapons.js
- 414 src/art/IselleRig.js
- 412 src/ui/ItemIcon.js
- 408 src/combat/ArrowPool.js
- 390 src/data/emotions.config.js
- 387 src/player/ThirdPersonCamera.js
- 376 src/combat/GoblinAI.js
- 375 src/ui/RosterEmotionPanel.js
- 362 src/fx/WeaponFX.js
- 357 src/ui/SummonWindow.js
- 352 src/debug/GroundDebug.js
- 348 src/core/Stats.js
- 346 src/hub/TownSparringController.js
- 346 src/combat/CombatData.js
- 339 src/hub/FairyInterventionEffect.js
- 334 src/ui/DungeonBoardWindow.js
- 328 src/art/looks.js
- 322 src/dev/devArena.js
- 319 src/ui/HubHud.js
- 314 src/combat/DamageResolver.js
- 309 src/combat/WolfAI.js
- 304 src/core/EmotionEngine.js
- 304 src/combat/SquadAI.js
- 298 src/world/CaveFloor.js
- 297 src/hub/PunishmentEffect.js
- 297 src/data/enemies.js
- 292 src/gacha/SummonEffect.js
- 292 src/art/EnemyRig.js
- 289 src/world/TowerFloor.js
- 288 src/ui/TrainingWindow.js
- 286 src/core/Input.js
- 285 src/core/loadout.js
- 281 src/ui/IselleReportWindow.js
- 265 src/ui/theme.css
- 265 src/core/Inventory.js
- 263 src/ui/hud-floor3.css
- 262 src/fx/ArrivalDome.js
- 260 src/ui/ConfirmPrompt.js
- 257 src/core/FightAI.js
- 255 src/dev/devStats.js
- 251 src/combat/Items.js
- 250 src/dev/devPresets.js
- 236 src/combat/spells.config.js
- 230 src/ui/IselleBubble.js
- 226 src/art/town/collision.js
- 224 src/gacha/GachaSystem.js
- 209 src/core/LoginSimulation.js
- 206 src/ui/Label.js
- 206 src/ui/EnemyTags.js
- 198 src/combat/Projectiles.js
- 196 src/fx/SlashTrail.js
- 193 src/ui/AccountCreationScreen.js
- 190 src/combat/SpellAudio.js
- 190 src/combat/MageAI.js
- 187 src/ui/CommandWheel.js
- 177 src/combat/Boss.js
- 174 src/data/iselle.js
- 171 src/data/materials.js
- 165 src/data/training.config.js
- 163 src/ui/BossBar.js
- 155 src/ui/IselleTutorial.js

## BIG FILE SECTIONS (approx)

- src/art/enemies.js (3981): lines 1-80 imports/consts; 81-1500 mesh builders per enemy; 1501-3981 poses/exports.
- src/art/weaponAnimations.js (3167): lines 1-200 helpers; 201-2500 pose maps; 2501-3167 attack specs.
- src/art/floors/prairie.js (3162): lines 1-100 consts; 101-3162 terrain/props.
- src/art/town/shell.js (2635): lines 1-100 consts; 101-2635 terrain/mountains/sky.
- src/art/floors/farm.js (2379): lines 1-100 consts; 101-2379 terrain/props.
- src/art/floors/forest.js (1906): lines 1-200 lighting/consts; 201-1906 forest art + Floor3 clearing + debris.
- src/scenes/TowerScene.js (2045): lines 1-200 imports/setup; 201-900 floor load/assembly; 901-1600 combat/mob handling; 1601-2045 update loop.
- src/player/Player.js (1934): lines 1-200 imports/state; 201-900 movement/collision; 901-1500 combat/combos; 1501-1934 bow/spell modes.
- src/art/town/village.js (1856): lines 1-100 consts; 101-1856 houses/fences/props/blockers.
- src/scenes/HubScene.js (1813): lines 1-200 imports/setup; 201-900 town init; 901-1400 NPCs/dialogue; 1401-1813 update loop.
- src/core/TrainingEngine.js (1673): lines 1-200 imports/consts; 201-700 training sessions; 701-1200 fight engine; 1201-1673 XP/consequences.
- src/core/GameState.js (1399): lines 1-200 imports; 201-700 roster/party; 701-1000 save/load/migration; 1001-1399 settings.
- src/ui/Hud.js (1367): lines 1-200 imports; 201-700 HUD bars; 701-1000 minimap; 1001-1367 squad status.
- src/art/iselle.js (1364): lines 1-200 consts; 201-1364 mesh/face drawing.
- src/hub/HubHeroes.js (1338): lines 1-200 imports; 201-700 avatars; 701-1000 daily routine; 1001-1338 speech bubbles.
- src/art/weapons.js (1307): lines 1-200 consts; 201-1307 mesh builders.
- src/ui/RosterWindow.js (1227): lines 1-200 imports; 201-600 list; 601-900 detail; 901-1227 emotion sections.
- src/art/hero.js (1212): lines 1-200 consts; 201-1212 mesh builders.
- src/dev/devLab.js (1126): lines 1-200 imports; 201-600 tabs; 601-900 input; 901-1126 loop.
- src/combat/SpellVFXPool.js (1091): lines 1-200 consts; 201-1091 particle pools.

## CLASSES/SYSTEMS

- Enemy (legacy): src/combat/Enemy.js — HP, AI, drops; owns mesh/enemy state.
- EnemyManager: src/combat/EnemyManager.js — spawns wave pools; owns enemies array.
- Combatant: src/combat/Combatant.js — actor wrapper; owns rig, stamina, HP, state.
- StateMachine: src/combat/StateMachine.js — action states.
- HitPipeline/SpatialHashGrid: src/combat/HitPipeline.js — collision queries.
- DamageResolver: src/combat/DamageResolver.js — hit resolution.
- Boss/HobgoblinChief: src/combat/Boss.js, HobgoblinChief.js — boss phases.
- SquadAI/SquadController: src/combat/SquadAI.js, SquadController.js — companion AI/commands.
- GoblinAI/MageAI/WolfAI: AI handlers.
- Player: src/player/Player.js — movement/combat controller.
- ThirdPersonCamera: src/player/ThirdPersonCamera.js — camera.
- GameState: src/core/GameState.js — roster, party, gold, save/load.
- Inventory: src/core/Inventory.js — slots, equip, repair.
- loadout: src/core/loadout.js — weapon/offhand/pose source of truth.
- Stats: src/core/Stats.js — combat stat calc.
- EmotionEngine: src/core/EmotionEngine.js — emotion mutations.
- TrainingEngine: src/core/TrainingEngine.js — training + fight engine.
- DailyDecisionEngine: src/core/DailyDecisionEngine.js — daily activity.
- LoginSimulation: src/core/LoginSimulation.js — offline sim.
- TowerScene/HubScene: scene controllers.
- FloorAssembler: src/art/floors/FloorAssembler.js — biome assembly.
- EnemyRig/HeroRig/IselleRig: rigs.
- HubHeroesManager/Iselle/TrainingManager: hub systems.
- TownSparringController: live sparring.
- GachaSystem: gacha.
- SummonEffect: portal VFX.
- DropsManager: drops.
- ItemsManager/SpellSystem/SpellVFXPool/ArrowPool: combat subsystems.
- UI: Hud, RosterWindow, BlacksmithWindow, etc.

## GLOBAL STATE

- gameState singleton: src/core/GameState.js (exported `gameState`); read/written by most src files.
- scene/renderer/camera: owned by SceneManager and scenes; read widely.
- enemies array: EnemyManager.enemies; read by TowerScene, AI.
- towers: (none explicit tower system in combat; no tower entities beyond TowerScene).
- Input singleton: src/core/Input.js.
- combatEvents: src/combat/CombatEvents.js.
- timeScale: src/combat/TimeScale.js.
- audio context: AudioManager.getAudioContext().

## DEPENDENCIES (BIG files)

- src/art/enemies.js: imports three; imported by EnemyRig, scenes, dev.
- src/art/weaponAnimations.js: imports three; imported by HeroRig, weapons.
- src/art/floors/*: import prairie/farm/forest; FloorAssembler imports them.
- src/scenes/TowerScene.js: imports DungeonGenerator, FloorAssembler, Player, EnemyManager, equipmentEvents.
- src/player/Player.js: imports HeroRig, Input, Combat, SlashTrail, loadout, equipmentEvents.
- src/scenes/HubScene.js: imports TownAssembler, layout, HubHeroes, Iselle, TownSparringController, etc.
- src/core/TrainingEngine.js: imports training.config, emotions.config, skills, iselle, Stats, EmotionEngine, FightAI, Combatant, StateMachine, DamageResolver.
- src/core/GameState.js: imports heroes, items, materials, loadout, equipmentEvents, DailyDecisionEngine, skills.
- src/ui/Hud.js: imports Notices.
- Circular imports: none documented explicitly; potential cycles: GameState <-> DailyDecisionEngine/TrainingEngine (GameState imports DailyDecisionEngine; DailyDecisionEngine imports TrainingEngine; TrainingEngine imports GameState? check). Actually TrainingEngine does not import GameState directly. HubHeroes imports TrainingEngine. Low risk.

## FLOORS

- Floors 1-3: missions.js DAILY_DUNGEONS; rewards.js STAGE_REWARDS (F1-3 presets).
- Floor art: FloorAssembler.assembleFloor dispatches to prairie/farm/forest builders; forest.js has buildFloor3Clearing for Floor 3 arena.
- Dungeon layout: DungeonGenerator.generateDungeon uses floorLayouts.
- Floor-specific code: TowerScene (floor load/assembly), forest.js (Floor3 clearing + debris), rewards.js, missions.js, enemies.js (enemy types), EnemyManager (waves).
- New floor: add biome builder + register in FloorAssembler + add mission/reward entries + enemy wave config.

## ENEMIES AND TOWERS

- Enemy types: ENEMY_TYPES in src/data/enemies.js (grunt, archer, wolf, mage, boss, leader, armored goblin, hound, black wolf).
- 3D models: src/art/enemies.js createEnemyModel; rigs in EnemyRig.
- AI: GoblinAI, MageAI, WolfAI, HobgoblinChief, Boss.
- Base logic: Enemy (legacy) vs Combatant (new). EnemyManager spawns legacy enemies.
- Copy-pasted: enemy AI handlers share state machine patterns; mesh builders per enemy type in enemies.js.

## DUPLICATED/DEAD CODE

- Legacy combat: Player.js, Ally.js, Enemy.js, EnemyManager.js (unmigrated, not wired to Combatant).
- Projectiles.js legacy.
- art*Test.js dev-only harnesses.
- dev* files dev-only.

## TOOLING

- check_codemap.mjs: validates docs/CODEMAP.md rows match disk files/exports; run `node scripts/check_codemap.mjs`; must print CODEMAP OK.
- Vite entry: index.html -> src/main.js.
- Tests: node scripts/test_*.mjs (headless).

## PROPOSED FOLDER STRUCTURE

- src/enemies/Enemy.js (base), src/enemies/Goblin.js, ArmoredGoblin.js, Wolf.js, Mage.js, Boss.js
- src/towers/Tower.js base + per tower files
- src/floors/Floor.js base + Floor1.js..Floor3.js
- Split enemies.js into src/enemies/models/* and rigs/EnemyRig.js
- Split weaponAnimations.js into src/animation/weapon/* pose files
- Split prairie/farm/forest into src/floors/biomes/*
- Split TowerScene into src/scenes/tower/* (loader, combat, update)
- Split HubScene into src/scenes/hub/*
- Split TrainingEngine into src/core/training/* (sessions, fight, xp)
- Split GameState into src/core/state/* (roster, save, settings)
- Split Hud into src/ui/hud/* (bars, minimap, squad)
- Split RosterWindow into src/ui/roster/*

## RISKS

1. Hidden global state (gameState, Input, combatEvents, timeScale).
2. Import order / circular imports (GameState <-> engines).
3. Codemap enforcement (must update docs/CODEMAP.md).
4. Legacy vs new combat dual systems.
5. Scene update loop coupling.
6. Floor art module registration.
7. Loadout as single source of truth.
8. Audio context singleton.
9. Town blockers/walk height coupling.
10. Zero-allocation frame loop constraints.

## SUGGESTED STEP ORDER

1. Extract pure data files (no logic) into new folders (enemies data, floors config).
2. Split GameState save/load into separate module.
3. Split TrainingEngine fight engine into Combatant-based module.
4. Extract Enemy AI handlers into per-enemy files.
5. Split TowerScene floor loading into FloorLoader.
6. Split HubScene NPC management into HubNPCManager.
7. Split Player combat into PlayerCombat module.
8. Split Hud into sub-components.
9. Migrate legacy Enemy/EnemyManager to Combatant.
10. Update docs/CODEMAP.md and run check_codemap after each step.
