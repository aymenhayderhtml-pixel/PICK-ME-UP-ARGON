# Pick Me Up: Infinite Gacha — Code Map

- **Project**: Pick Me Up: Infinite Gacha (3D Roguelike Action RPG)
- **Stack**: Three.js 0.160, Vite, Vanilla JavaScript (ES modules)
- **Entry Pages**: index.html (live game), dev.html (Dev Lab harness), combat-test.html (combat sandbox), art-weapon-test.html, art-enemy-test.html, art-floor-test.html, art-iselle-test.html, art-test.html, art-town-test.html
- **Last Updated**: 2026-10-21

## 1. Folder Tree

- `src/`: Game source root (runtime entry point, global stylesheet, counter)
- `src/art/`: 3D procedural meshes, humanoid/enemy rigs, weapon animations, visual presets
- `src/art/floors/`: Procedural dungeon floor biome mesh builders (prairie, farm, forest)
- `src/art/town/`: 3D hub town visual architecture, landmarks, terrain, and walkability heightmap
- `src/combat/`: Modular combat engine (Combatant, StateMachine, HitPipeline, DamageResolver, AI, VFX)
- `src/core/`: Engine lifecycle, input handlers, scene manager, inventory, stats, camera fade
- `src/data/`: Static balance tables (items, heroes, enemies, skills, recipes, rewards, progression rules)
- `src/debug/`: Ground collision and raycast visual debug tools
- `src/dev/`: Dev Lab testing harness subsystems (arena, cheats, storage, stats, weapon/spell tabs)
- `src/fx/`: Visual particle effects (weapon sparks, slash trails, block ripples, arrival dome)
- `src/gacha/`: Hero and equipment summon logic, banner odds, and 3D portal summon animations
- `src/hub/`: Hub town world logic (wandering heroes, training grounds, synthesis, punishment, nav grid)
- `src/player/`: Legacy player controller, input mapping, and third-person follow camera
- `src/scenes/`: Top-level Three.js scene controllers (HubScene, TowerScene)
- `src/ui/`: DOM UI layer (windows, HUD, notifications, hero cards, equipment modals, tooltips)
- `src/world/`: Dungeon generation, room graphs, floor layouts, and environment props
- `scripts/`: Node diagnostic tools, automated headless QA suites, and codemap integrity checker
- `docs/`: GDD, lore, architecture specs, animation audits, combat plans, and QA reports
- `docs/images/`: Reference design imagery and UI layout diagrams

## 2. File Index

### Root Pages
art-enemy-test.html | Visual testing harness for enemy models, rigs, and poses | (none) | (none) | dev only
art-floor-test.html | Visual testing harness for procedural floor biomes and props | (none) | (none) | dev only
art-iselle-test.html | Visual testing harness for Iselle model and facial expressions | (none) | (none) | dev only
art-test.html | Visual testing harness for hero customization, rigs, and armor | (none) | (none) | dev only
art-town-test.html | Visual testing harness for 3D town hub landmarks and terrain | (none) | (none) | dev only
art-weapon-test.html | Visual testing harness for weapon models and attack animations | (none) | (none) | dev only
combat-test.html | Isolated test harness for Phase 1 combat engine verification | (none) | (none) | dev only
dev.html | Dev Lab visual arena for combat balancing, weapons, spells, and stats | (none) | (none) | dev only
index.html | Main game entry page hosting HubScene, TowerScene, and UI | (none) | (none) | live game

### scripts/
scripts/capture_combat_p2_5_look_first.mjs | Automated script to capture initial camera frame in combat | (none) | module | dev only
scripts/check_codemap.mjs | Integrity validator verifying docs/CODEMAP.md matches disk files and exports | (none) | node:fs, node:path | dev only
scripts/diagnose_all_combatants.mjs | Headless diagnostic script checking all combatant configurations | (none) | module | dev only
scripts/diagnose_shot.mjs | Diagnostic script for archer arrow shot trajectories and velocity | (none) | module | dev only
scripts/diagnose_weapons.mjs | Diagnostic script verifying all weapon meshes and grade colors | (none) | module | dev only
scripts/test_aim_and_clear.mjs | Test script for OTS aim camera activation and reticle clearing | (none) | module, fs | dev only
scripts/test_bow_fixes.mjs | Validation script verifying bow string draw and projectile fixes | (none) | module, fs | dev only
scripts/test_bow_qa.mjs | Automated QA test suite for bow aim, draw, and loose mechanics | (none) | module | dev only
scripts/test_combat_p1_qa.mjs | Automated QA test suite for Phase 1 combat engine mechanics | (none) | module | dev only
scripts/test_combat_p2_5_qa.mjs | Automated QA test suite for Phase 2.5 combat engine integrations | (none) | module | dev only
scripts/test_combat_p2_qa.mjs | Automated QA test suite for Phase 2 combat engine features | (none) | module | dev only
scripts/test_devlab_fixes.mjs | Validation script for Dev Lab UI bugfixes and controls | (none) | module, fs | dev only
scripts/test_devlab_qa.mjs | Automated QA test suite verifying all Dev Lab panels and tabs | (none) | module | dev only
scripts/test_integration.mjs | Automated headless verification for Mage & Archer main game integration | (none) | three, GameState, Player, Enemy, Boss, spells.config, SpellSystem, SpellVFXPool | dev only
scripts/test_loadout.mjs | Automated headless verification that model, controls and HUD follow hero class and equipped weapon | (none) | three, GameState, loadout, Inventory, items, itemModels, HeroRig, Player, presets | dev only
scripts/test_phase1_migration.mjs | Headless verification of the emotion data model, star multiplier, squad leader, and old-save migration | (none) | module, fs, child_process | dev only
scripts/test_phase2_emotions.mjs | Headless verification of emotion mutations, panic, decision weights, leader orders, lobby laws, and the shared live/offline path | (none) | module | dev only
scripts/test_phase3_training_30days.mjs | Headless verification of training sessions, skill combining, Pain Tolerance, hit zones, sparring, and the 30-day 1-star vs 3-star benchmark | (none) | three, module, TrainingEngine, DailyDecisionEngine, Stats, Combatant, DamageResolver | dev only
scripts/test_phase4_login_report.mjs | Headless verification of offline day calculation, report sorting, idle listing, and dead hero gear drop | (none) | module, fs, child_process, LoginSimulation, DailyDecisionEngine, TrainingEngine | dev only
scripts/test_phase5_town_training.mjs | Headless verification of the training sub-zones, live sparring, lobby laws, leader intervention, and fast healing | (none) | three, module, fs, layout, TownSparringController | dev only
scripts/test_phase6_ui_and_integration.mjs | End-to-end headless verification of the roster display model, save/reload roundtrip and the full 6 phase integration | (none) | module, fs, child_process, RosterEmotionPanel, GameState, DailyDecisionEngine, TrainingEngine, LoginSimulation | dev only
scripts/test_spells.mjs | Automated headless verification for Fire Mage spells, mana costs, and potions | (none) | three, Combatant, SpellSystem, SpellVFXPool, DamageResolver, spells.config | dev only

### src/
src/counter.js | Example counter utility component | setupCounter | (none) | legacy
src/main.js | Main game bootstrap initializing Three.js renderer and scene loop | (none) | theme.css, three, Input, SceneManager, HubScene, TowerScene, SystemWindow, FpsCounter | live game
src/style.css | Global CSS styling for main game and Dev Lab canvas container | (none) | (none) | live game

### src/art/
src/art/EnemyRig.js | Rig controller managing enemy joint transforms and death collapses | EnemyRig | three, enemies | live game
src/art/GroundSampler.js | Raycast utility sampling ground Y position for actors | getEntityGroundY | (none) | live game
src/art/HeroRig.js | 15-joint humanoid rig with weapon sockets and procedural poses | HeroRig | three, hero, weapons, itemModels, SlashTrail, weaponAnimations | live game
src/art/IselleRig.js | Rig controller managing guide NPC Iselle floating animations | IselleRig | three, iselle | live game
src/art/artEnemyTest.js | Test runner logic for enemy model preview harness | (none) | three, enemies, presets, enemyPresets, EnemyRig | dev only
src/art/artFloorTest.js | Test runner logic for floor biome visual inspection harness | (none) | three, FloorAssembler | dev only
src/art/artIselleTest.js | Test runner logic for Iselle expression inspection harness | (none) | three, iselle, IselleRig | dev only
src/art/artTest.js | Test runner logic for hero rig and customization harness | (none) | three, hero, HeroRig, presets, itemModels, weapons | dev only
src/art/artTownTest.js | Test runner logic for 3D town hub visual inspection harness | (none) | three, TownAssembler, WalkHeight | dev only
src/art/artWeaponTest.js | Test runner logic for weapon animation and swing visual harness | (none) | three, weapons, weaponAnimations, HeroRig | dev only
src/art/enemies.js | Procedural primitive 3D mesh generators and poses for enemies | ENEMY_TYPES, POSE_INFO, ENEMY_POSES, disposeEnemyCaches, createEnemyModel | three | live game
src/art/enemyPresets.js | Preconfigured visual appearance presets for enemy types | ENEMY_PRESETS | (none) | dev only
src/art/hero.js | Procedural primitive 3D mesh generator and joint sockets for heroes | HERO_POSES, createHeroModel, disposeHeroCaches | three, looks, weaponAnimations | live game
src/art/iselle.js | Procedural primitive 3D mesh generator and 2D canvas face for Iselle | ISELLE_POSES, ISELLE_EXPRESSIONS, POSE_INFO, drawIselleFace, drawIsellePortrait, disposeIselleCaches, createIselleModel | three | live game
src/art/itemModels.js | Maps inventory item templates to corresponding 3D weapon meshes | mapItemToModel | (none) | live game
src/art/looks.js | Randomizer and generator for hero body types, hair, and colors | generateLook | (none) | live game
src/art/presets.js | Predefined hero visual appearance profiles | PRESETS | (none) | dev only
src/art/weaponAnimations.js | Math curves, attack frame specs, hold poses, and 2-hand IK | clamp, lerp, lerpAngle, smoothstep, easeInOutSine, easeOutCubic, easeOutBack, easeInQuad, easeInOutQuad, interpolatePoseMap, SHIELD_OFFHAND_PROFILES, WEAPON_ANIMATIONS, solveTwoHandGripIK, getAttackSpec, getPoseCycleDuration, applyPoseDict, evaluateWeaponPose | three | live game
src/art/weapons.js | Procedural 3D primitive mesh builders for weapons and shields | WEAPON_KINDS, SHIELD_KINDS, GRADE_UI_COLORS, disposeWeaponCaches, buildArrowGeometry, createWeaponModel, createShieldModel, createPickupModel | three | live game

### src/art/floors/
src/art/floors/FloorAssembler.js | Assembles floor terrain chunks, props, and lighting budgets | FLOOR_ART_BUDGETS, floorArtModuleName, assembleFloor | prairie, farm, forest | live game
src/art/floors/farm.js | Procedural farm floor terrain builder with fences and haystacks | buildFarmFloorArt, default | three | live game
src/art/floors/forest.js | Procedural forest floor terrain builder with moss rocks and foliage | buildForestFloorArt | three | live game
src/art/floors/prairie.js | Procedural prairie floor terrain builder with rolling hills | buildPrairieFloorArt | three | live game

### src/art/town/
src/art/town/TownAssembler.js | Master assembler combining ground, shell, landmarks, and village | buildTown | ground, shell, landmarks, village, palette, layout | live game
src/art/town/WalkHeight.js | Heightmap grid and raycast validation ensuring walkability | WALK_RAY_TOP, MAX_WALK_HEIGHT, HEAD_CLEARANCE, buildWalkHeightMap, updateUndergroundGuard | three | live game
src/art/town/ground.js | Procedural town terrain surface with building foundation pads | HUB_TERRAIN_AMPLITUDE, BUILDING_PADS, getGroundY | three, palette, layout | live game
src/art/town/landmarks.js | Builds central portal and workplace landmarks in hub town | buildTownLandmarks | landmarksMain, landmarksWork | live game
src/art/town/landmarksMain.js | Builds central spire portal and summon altar landmarks | createPortalSwirlTexture, buildLandmarksMain | three, palette, layout | live game
src/art/town/landmarksWork.js | Builds blacksmith forge, training yard, and tavern landmarks | buildLandmarksWork | three, palette, layout | live game
src/art/town/layout.js | Spatial coordinates and bounding dimensions for town buildings | LAYOUT | (none) | live game
src/art/town/palette.js | Shared material colors and surface palettes for town meshes | PALETTE | (none) | live game
src/art/town/shell.js | Surrounding perimeter mountains and horizon sky backdrop | buildTownShell | three, palette | live game
src/art/town/village.js | Residential houses, pathways, fences, and street decorations | buildTownVillage | three, palette, layout | live game

### src/combat/
src/combat/Ally.js | Companion entity that shows the hero's own equipped weapon | Ally | three, HeroRig, Combat, Items, Drops, Skills, heroes, loadout | live game
src/combat/ArrowPool.js | Pooled arrow projectiles with ballistic flight and stick-in-ground | GRADE_ARROW_STATS, ArrowPool | three, weapons | live game
src/combat/Boss.js | Boss entity controller with phase transitions and telegraphs | Boss | three, EnemyRig, Telegraph, Combat | live game
src/combat/Combat.js | Audio synthesize stubs, hit angles, and spark emitters | playParrySound, calculateAttackAngle, spawnSparks, spawnSplinters | three | live game
src/combat/CombatData.js | Combat tuning constants: grade mults, stamina, poise, frame data | GRADE_MULTS, STAMINA_COSTS, POISE_TIERS, ARCHERY_CONFIG, ATTACK_FRAME_DATA, SPELLS_TABLE, MELEE_HIT_SECTORS, SQUAD_SKILLS_TABLE, getSpellData, getMoveFrameData, FIRE_SPELLS, MANA_CONFIG, calculateMaxMana | (none) | live game
src/combat/CombatEvents.js | Decoupled event emitter for damage, parry, dodge, and state events | CombatEventBus, combatEvents | (none) | live game
src/combat/Combatant.js | Unified actor wrapper integrating rig, state machine, stamina, and HP | Combatant, SquadControllerStub, createPlayerAdapter, createAllyAdapter, createEnemyAdapter | three, StateMachine, CombatData, CombatEvents | live game
src/combat/Commands.js | Squad tactical command constants and keyboard mappings | COMMANDS, COMMAND_LIST, getCommandByKey | (none) | live game
src/combat/DamageResolver.js | Resolves hit payloads: frontal 120-deg parry/block, i-frames, hit zones, damage | DamageResolver | CombatData, CombatEvents, WeaponFX, Combat, TrainingEngine, training.config | live game
src/combat/Drops.js | Item and gold pickup drop manager in combat encounters | DropsManager | three, weapons | live game
src/combat/Enemy.js | Legacy enemy entity base class (unmigrated) | Enemy | three, EnemyRig, Combat, Drops, enemies | legacy
src/combat/EnemyManager.js | Spawns and manages wave pools for legacy dungeon combat | EnemyManager | three, Enemy, GoblinAI, WolfAI, MageAI, HobgoblinChief | live game
src/combat/GoblinAI.js | Behavior state functions for goblin grunts and flankers | handleIdle, handleAmbushWait, handleChase, handleFlank, handleWindup, handleAttack, handleStagger, handleHesitate, handleFlee | three | live game
src/combat/HitPipeline.js | Swept-capsule / cylinder collision queries against SpatialHashGrid | segmentToSegmentDistanceSq, SpatialHashGrid, HitPipeline, testSphereVsCapsule, testCylinderVsCapsule, testRayChain, queryHostilesInRadius, queryAlliesInRadius | three | live game
src/combat/HobgoblinChief.js | Elite boss enemy behavior combining heavy swings and shockwaves | HobgoblinChief | three, Boss, Telegraph | live game
src/combat/Items.js | Combat consumables manager (potions, scrolls, stamina draughts) | ITEM_TEMPLATES, ItemsManager | (none) | live game
src/combat/MageAI.js | Ranged mage enemy behavior managing distance and spell windups | MageAI | three | live game
src/combat/Projectiles.js | Legacy projectile manager for magic orbs and enemy arrows | ProjectilesManager | three | live game
src/combat/SpellAudio.js | WebAudio procedural sound synthesizer for fire spells, potions, and fizzles | playSpellSound, playPotionSound, playFizzleSound | (none) | live game
src/combat/SpellSystem.js | Validates mana/cooldowns, ticks cast bars, and executes spell effects | SpellSystem | CombatData, CombatEvents, SpellVFXPool | live game
src/combat/SpellVFXPool.js | Preallocated particle and mesh pools for spell visual effects | SpellVFXPool | three | live game
src/combat/SquadAI.js | Tactical AI driving companion positioning, targets, and formations | SquadAI | three, Commands | live game
src/combat/SquadController.js | Player command interface and hotkey triggers for squad skill casts | SquadController | Commands, CombatEvents | live game
src/combat/StateMachine.js | Priority-based hierarchical state machine governing actor actions | COMBAT_STATES, STATE_PRIORITY, ATTACK_PHASES, CAST_PHASES, StateMachine | (none) | live game
src/combat/Telegraph.js | Ground danger decal indicators (circles, cones, lines) for attacks | Telegraph | three | live game
src/combat/TimeScale.js | Global slow-motion and per-actor hit-stop time scale manager | TimeScaleManager, timeScale | (none) | live game
src/combat/WolfAI.js | Pack predator AI coordinating circle flanking and pounce attacks | resetWolfPackState, selectWolfTarget, updateWolf | three | live game
src/combat/placeholder.js | Empty module placeholder | (none) | (none) | legacy
src/combat/spells.config.js | Configuration file for Fire Mage spells, mana formulas, and potion tuning | MANA_CONFIG, FIRE_SPELLS, calculateMaxMana, COMBO_CONFIG, OVERHEAT_CONFIG, MASTERY_CONFIG | (none) | live game
src/combat/testSandbox.js | Phase 1 combat testbed initializing arena, dummy, and heroes | initCombatSandbox | three, Combatant, HitPipeline, DamageResolver, TimeScale | dev only

### src/core/
src/core/CameraFade.js | Dithers or fades humanoid mesh opacity when occluding camera | updateHumanoidCameraFade | three | live game
src/core/equipmentEvents.js | Pub/sub telling the live scenes that a hero's gear changed | onEquipmentChanged, emitEquipmentChanged | (none) | live game
src/core/GameState.js | Central singleton storing player roster, party, gold, and progression | rollHeroPotentials, rollHiddenTalents, GameState, gameState | heroes, items, materials, loadout, equipmentEvents | live game
src/core/Input.js | Global keyboard and mouse input event listener and state cache | Input | (none) | live game
src/core/Inventory.js | Inventory slots, auto-equip logic, repair costs, and enhance rates | MAX_INVENTORY_CAPACITY, ENHANCE_RATES, canHeroEquipItem, getAllowedWeaponTypes, getItemScore, autoEquipHero, autoEquipRoster, autoEquipParty, equipItem, unequipItem, getBestSmith, calculateRepairCost, getEnhanceCost | items, rules, loadout, equipmentEvents | live game
src/core/loadout.js | Single source of truth for a hero's weapon, offhand, pose set, attack mode and HUD mode | ATTACK_MODES, HUD_MODES, POSE_SETS, CLASS_PROFILES, getHeroClassKey, getHeroClassProfile, getAllowedWeaponTypes, getHeroLoadout, reconcileHeroLoadout | itemModels, items | live game
src/core/SceneManager.js | Manages active scene lifecycle, transitions, and main animation loop | SceneManager | three | live game
src/core/EmotionEngine.js | Pure headless emotion mutations: fear, hunger, anger, motivation, panic, squad leader orders, unsanctioned fights | getTraitModifiers, isHeroPanicking, applyFearGain, applyDailyEmotionTick, applyEatOutcome, applyRestOutcome, evaluateSquadLeaderOrder, pickTrainingTypeForHero, evaluateTensionFight | emotions.config, heroes | live game
src/core/TrainingEngine.js | Pure headless training session resolver: session outcomes, skill XP, skill combining, Pain Tolerance, hit zones, sparring, gear drop on death | findHeroSkill, heroKnowsSkill, rollHitZone, rollSessionOutcome, recordTrainingDamageAndHeal, checkAndUnlockPainTolerance, recordCoTraining, checkAndCombineSkills, pickPrimarySkillForHero, resolveTrainingSession, handleHeroDeathAndDropGear, resolveSparringSession | training.config, emotions.config, skillRecipes.config, skills, heroes, Stats, EmotionEngine | live game
src/core/DailyDecisionEngine.js | The ONE daily decision path shared by live play and the offline login simulation | computeActivityWeights, chooseDailyActivity, simulateGameDay, simulateMultipleDays | emotions.config, Rng, EmotionEngine | live game
src/core/Rng.js | Small deterministic seeded random generator (mulberry32) | createRng | (none) | live game
src/core/LoginSimulation.js | Offline day calculation, offline simulation and the "Iselle's Report" data model | computeGameDaysAway, buildIselleReportModel, runOfflineLoginSimulation, handleHeroDeathAndDropGear | emotions.config, training.config, DailyDecisionEngine, TrainingEngine | live game
src/core/Stats.js | Calculates total combat stats from base, levels, gear, and growth | getCombatStats, getDisplayStats, formatStatDisplay, getGrowthRate, getHeroThreeGroups, getPainToleranceLevel | rules, skills, training.config | live game
src/core/placeholder.js | Empty module placeholder | (none) | (none) | legacy

### src/data/
src/data/drops.js | Item and material drop tables for defeated enemy tiers | DROP_TYPES | items, materials | live game
src/data/enemies.js | Enemy archetype definitions, base stats, and stat calculators | ENEMY_TYPES, getEnemyStats | (none) | live game
src/data/heroes.js | Hero base templates, past jobs, motivations, novice generators, personality traits, and emotion field helpers | HERO_TEMPLATES, PAST_JOBS, JOB_SKILL_MAP, generateNoviceHero, generateRandomHero, rollMotivation, createHeroFromTemplate, rollPersonalityTraits, normalizeHeroEmotionFields, setHeroAnger, addHeroAnger, setHeroHunger, addHeroHunger, getWeightedStatsForClass | skills, emotions.config | live game
src/data/iselle.js | Dialogue strings and flavor text for guide NPC Iselle | ISELLE_LINES, pickLine | (none) | live game
src/data/items.js | Item database, equipment recipes, gacha pools, and item instances | ITEM_GRADES, ITEM_TEMPLATES, FORGE_RECIPES, createItemInstance, GACHA_BASE_TYPES, rollEquipmentGacha | (none) | live game
src/data/materials.js | Crafting and upgrade material types and inventory helpers | MATERIALS, getMaterial, createInitialMaterials | (none) | live game
src/data/missions.js | Mission types and floor objectives for dungeon expedition stages | MISSION_TYPES, getMissionInfo | (none) | live game
src/data/placeholder.js | Empty module placeholder | (none) | (none) | legacy
src/data/rewards.js | Stage clear reward payout schedules per dungeon floor | STAGE_REWARDS, getFloorClearReward | (none) | live game
src/data/rules.js | Core progression balance formulas: XP curves, level caps, star limits | LEVEL_CAP_PER_STAR, MAX_STAR, NATURAL_MAX_STAR, PARTY_SIZE, STAT_KEYS, getStarMultiplier, getXpForLevel, getPromotionCost, getSynthesisXp, getSkillInheritChance, getSkillXpNeeded, TRAINING_TICK_SECONDS, TRAINING_SKILL_XP_PER_TICK, RARITY_COLORS, RARITY_HEX_STRINGS, getRarityColor, getRarityHexString | emotions.config | live game
src/data/skills.js | Hero passive and active combat skill definitions and level-up curves | SKILLS, getSkill, getSkillEffects, addSkillExp, rollStatFromSkill | (none) | live game
src/data/emotions.config.js | All tunable numbers for emotions, needs, mentality, star scaling, decision weights, squad leader orders, Iselle intervention, and lobby laws | EMOTION_CONFIG, getDefaultMentality, getDefaultMotivationScore | (none) | live game
src/data/training.config.js | All tunable numbers for training zones, session outcomes, XP, stat gains, hit zones, injuries, Pain Tolerance, and offline time ratios | TRAINING_CONFIG | (none) | live game
src/data/skillRecipes.config.js | Data-driven skill combination recipe table (SKILL_RECIPES) | SKILL_RECIPES | (none) | live game

### src/debug/
src/debug/GroundDebug.js | Visual wireframe overlay for ground collision rays and normal arrows | GroundDebug | three | dev only

### src/dev/
src/dev/devArena.js | Dev Lab 3D scene setup, ground arena, lighting, and camera modes | DevArena | three, devShared | dev only
src/dev/devCheats.js | Cheats manager (godmode, infinite resources, kill all, instant heal) | DevCheats | (none) | dev only
src/dev/devCombatants.js | Factory creating hero and enemy combatants with adapters for Dev Lab | createHeroCombatant, createEnemyCombatant, createArcherAI, calculateSpawnPositions, disposeCombatant | Combatant, HeroRig, EnemyRig, devPresets | dev only
src/dev/devLab.js | Main orchestrator for Dev Lab tabs, input handling, and simulation loop | DevLab | devArena, devCombatants, devWeapons, devSpells, devStats, devCheats, devStorage | dev only
src/dev/devPresets.js | Hero loadouts and enemy presets selectable in Dev Lab dropdowns | HERO_OPTIONS, ENEMY_TYPES | (none) | dev only
src/dev/devShared.js | Shared Dev Lab visual assets: decals, damage texts, badges, wireframes | createDamageTextPool, createTeamDecals, createOverheadBadges, createArrowPickup, createWireframeVisualizer, createArenaFloor | three | dev only
src/dev/devSpells.js | Spell testing UI controller managing spell hotkeys and target casts | DevSpellsController | CombatData, SpellSystem | dev only
src/dev/devStats.js | Performance and combat telemetry tab rendering graphs and DPS meters | DevStatsTracker | (none) | dev only
src/dev/devStorage.js | LocalStorage manager for saving and loading custom arena combat setups | DevStorage | (none) | dev only
src/dev/devWeapons.js | Weapon testing UI controller allowing live gear and grade switches | DevWeaponsController | weapons, CombatData | dev only

### src/fx/
src/fx/ArrivalDome.js | Animated energy dome visual effect when entering dungeon floors | ArrivalDome | three | live game
src/fx/SlashTrail.js | Dynamic polygonal weapon swing trail renderer | SlashTrail, getActiveTrailsCount | three | live game
src/fx/WeaponFX.js | Procedural particle sparks, shield block ripples, and parry flashes | spawnHitSparks, spawnBlockHitEffect, triggerShieldBlock, triggerParryFlash, spawnItemBreakShards | three | live game

### src/gacha/
src/gacha/GachaSystem.js | Core gacha summon logic rolling hero templates and rarity odds | GachaSystem, gachaSystem | heroes, rules, items | live game
src/gacha/SummonEffect.js | 3D summoning portal visual animation with particle pillars | SummonEffect | three | live game
src/gacha/placeholder.js | Empty module placeholder | (none) | (none) | legacy

### src/hub/
src/hub/HubHeroes.js | Manages wandering hero avatars and speech bubbles in town hub | createSpeechBubbleSprite, HubHeroNPC, HubHeroesManager | three, HeroRig, NavGrid, loadout, equipmentEvents, training.config | live game
src/hub/Iselle.js | Guide NPC avatar managing dialogue bubble prompts and walking in town | IselleRig, Iselle | three, IselleRig, NavGrid | live game
src/hub/NavGrid.js | 2D navigation waypoint graph for pathfinding in hub town | NavGrid | (none) | live game
src/hub/PunishmentEffect.js | Visual VFX for hero discipline / punishment interactions | PunishmentEffect | three | live game
src/hub/SynthesisEffect.js | Visual VFX when merging heroes in the synthesis chamber | SynthesisEffect | three | live game
src/hub/TrainingManager.js | Handles hero passive training progress and combat XP accumulation | TrainingHeroAvatar, TrainingManager | rules, skills | live game
src/hub/TownSparringController.js | Live 3D sparring in the training yard using real Combatants and the real DamageResolver; Iselle and Squad Leader intervention | TownSparringController | three, CombatData, training.config, emotions.config, Combatant, DamageResolver, TrainingEngine, Stats, heroes, EmotionEngine | live game

### src/player/
src/player/Player.js | Player character controller: combo attacks, guard, bow and spell modes driven by the hero loadout | Player | three, HeroRig, Input, Combat, SlashTrail, loadout, equipmentEvents | live game
src/player/ThirdPersonCamera.js | Third-person follow camera with distance collision and mouse orbit | ThirdPersonCamera | three | live game
src/player/placeholder.js | Empty module placeholder | (none) | (none) | legacy

### src/scenes/
src/scenes/HubScene.js | Town hub Three.js scene managing buildings, NPCs, and town interaction | HubScene | three, TownAssembler, HubHeroes, Iselle, TownSparringController, IselleReportWindow, LoginSimulation, EmotionEngine, GroundSampler | live game
src/scenes/TowerScene.js | Tower dungeon Three.js scene managing dungeon floors, mobs, and player | TowerScene | three, DungeonGenerator, FloorAssembler, Player, EnemyManager, equipmentEvents | live game

### src/ui/
src/ui/AccountCreationScreen.js | Initial new game account creation and tutorial intro screen | AccountCreationScreen | (none) | live game
src/ui/BlacksmithWindow.js | Blacksmith UI for forging, upgrading, and repairing hero equipment | BlacksmithWindow | SystemWindow, Inventory, items, rules | live game
src/ui/BossBar.js | Boss HP bar overlay displaying name and shield phases | BossBar | (none) | live game
src/ui/CommandWheel.js | Radial squad command wheel overlay for tactical orders | CommandWheel | Commands | live game
src/ui/DeployWindow.js | Dungeon expedition stage select and party dispatch modal | DeployWindow | SystemWindow, missions, rules | live game
src/ui/DormitoryWindow.js | Hero living quarters UI for resting and relationship checks | DormitoryWindow | SystemWindow, rules | live game
src/ui/DungeonBoardWindow.js | Dungeon floor selection bulletin board UI | DungeonBoardWindow | SystemWindow, missions | live game
src/ui/EnemyTags.js | Overhead floating health bars and target reticle overlays for enemies | EnemyTagsOverlay | three | live game
src/ui/EquipmentWindow.js | Hero equipment management modal for inspecting and equipping gear | EquipmentWindow | SystemWindow, Inventory, ItemIcon, loadout | live game
src/ui/FpsCounter.js | Lightweight DOM FPS and frame-time display counter | fpsCounter | (none) | dev only
src/ui/HeroCard.js | Roster entry card displaying hero star rating, stats, and portraits | createHeroCard | rules, ItemIcon | live game
src/ui/HeroReport.js | End-of-stage hero battle performance and XP summary report modal | showHeroReport | rules | live game
src/ui/HubHud.js | Top-level hub navigation bar, resources (gold/gems), and menu buttons | HubHud | GameState | live game
src/ui/Hud.js | Combat HUD showing player HP, stamina bar, minimap, and squad status | Hud, isAnySystemWindowOpen, showSystemMessage, showNotices, showStatusNotice, showHeroDeathNotice, showEquipmentNotice, clearSystemMessages | Notices | live game
src/ui/IselleBubble.js | Floating tutorial and guide dialogue speech bubbles from Iselle | showIselleBubble, updateIselleBubbles, clearIselleBubbles | three | live game
src/ui/IselleTutorial.js | First-time player guided walkthrough overlays | IselleTutorial | IselleBubble | live game
src/ui/IselleReportWindow.js | "Iselle's Report" login report panel shown before gameplay | IselleReportWindow | SystemWindow, iselle | live game
src/ui/ItemIcon.js | Generates 2D canvas preview icons for weapons, armor, and items | getItemIconKey, getItemIcon, getItemIconDataUrl, ItemPreviewViewer | three, weapons | live game
src/ui/Label.js | World-space text sprites for building names and interact prompts | createLabelSprite, updateLabels | three | live game
src/ui/Notices.js | Slide-in notification messages for loot, achievements, and death warnings | clearSystemMessages, createNoticeBox, showSystemMessage, showSystemNotice, showNotices, showStatusNotice, showHeroDeathNotice, queueHeroWalkoutNotice, showEquipmentNotice | (none) | live game
src/ui/OptionsWindow.js | Game settings modal for graphics, volume, and control bindings | OptionsWindow | SystemWindow | live game
src/ui/PartyPanel.js | Combat party overlay showing portrait avatars, HP, and ultimate readiness | PartyPanel | (none) | live game
src/ui/RewardIcons.js | Canvas drawing utilities for loot reward icons and badges | drawRewardIcon | (none) | live game
src/ui/RewardWindow.js | Stage victory reward distribution and loot breakdown modal | RewardWindow | SystemWindow, RewardIcons | live game
src/ui/RosterWindow.js | Hero barracks management modal for viewing, filtering, and sorting heroes | RosterWindow | SystemWindow, HeroCard, Inventory, RosterEmotionPanel | live game
src/ui/RosterEmotionPanel.js | Roster panels for the emotion bars, skill combining and the activity history | getHeroEmotionDisplayModel, createEmotionBarsSection, createSkillsAndCombiningSection, createActivityHistorySection | emotions.config, training.config, EmotionEngine, Stats | live game
src/ui/SummonWindow.js | Gacha banner summon interface with pull animations and results | SummonWindow | SystemWindow, GachaSystem, HeroCard | live game
src/ui/SynthesisWindow.js | Hero fusion and star promotion modal UI | SynthesisWindow | SystemWindow, HeroCard, rules | live game
src/ui/SystemWindow.js | Base modal window component with draggable headers and ornate borders | SystemWindow, showSystemMessage, showNotices, showStatusNotice, showHeroDeathNotice, showEquipmentNotice, clearSystemMessages | ornaments, Notices | live game
src/ui/TrainingWindow.js | Training grounds modal for assigning heroes to skill training slots | TrainingWindow | SystemWindow, rules | live game
src/ui/ornaments.js | Decorative SVG corner accents and gold filigree borders for UI windows | cornerSvg, attachOrnateCorners | (none) | live game
src/ui/placeholder.js | Empty module placeholder | (none) | (none) | legacy
src/ui/theme.css | Comprehensive fantasy dark-mode styling and layout rules for game UI | (none) | (none) | live game

### src/world/
src/world/CaveFloor.js | Procedural cave biome floor builder with stalagmites and rock pillars | buildCaveFloor | three | live game
src/world/Dungeon.js | Dungeon world container managing floor meshes, lighting, and room bounds | Dungeon | three, DungeonGenerator, Props | live game
src/world/DungeonGenerator.js | Generates procedural room graphs, corridors, and boss arenas | generateDungeon | floorLayouts | live game
src/world/FarmFloor.js | Procedural farm biome floor builder with crop rows and barn fencing | buildFarmFloor | three | live game
src/world/ForestFloor.js | Procedural forest biome floor builder with canopy trees and streams | buildForestFloor | three, ForestProps | live game
src/world/ForestProps.js | Prop generator for trees, stumps, fallen logs, and boulders | ForestProps | three | live game
src/world/Props.js | Generic dungeon prop generator (chests, barrels, torches, crates) | PropsManager | three | live game
src/world/TowerFloor.js | Procedural stone tower biome builder with flagstone tiles and pillars | buildTowerFloor | three | live game
src/world/floorLayouts.js | Seeded random room placement and grid layout generator | createRng, generateFloorLayout | (none) | live game
src/world/placeholder.js | Empty module placeholder | (none) | (none) | legacy

## 3. Where Do I Look For... (Lookup Table)

| Task / Topic | Exact File & Symbol / Function | Notes / Purpose |
| :--- | :--- | :--- |
| weapon stats | `src/data/items.js` -> `ITEM_TEMPLATES` | Weapon base ATK, attack speed, grade scaling |
| grade multipliers | `src/combat/CombatData.js` -> `GRADE_MULTS` | Damage multipliers for item grades F through EX |
| weapon attack timings | `src/combat/CombatData.js` -> `ATTACK_FRAME_DATA` | Windup, active hitbox, recovery, combo windows |
| weapon hold poses | `src/art/weaponAnimations.js` -> `WEAPON_ANIMATIONS` | Grip offsets, 1H/2H poses, run/idle rotations |
| hero joint names and rig | `src/art/HeroRig.js` -> `HeroRig` & `src/art/hero.js` | 15 humanoid skeleton bones and joint hierarchy |
| weapon and shield sockets | `src/art/HeroRig.js` -> `HeroRig.prototype.equip` | `handR`, `handL`, `staffHand`, `back`, `hip` attachment pivots |
| hero loadout (source of truth) | `src/core/loadout.js` -> `getHeroLoadout` | Class + equipped items -> weaponType, offhandType, poseSet, attackMode, hudMode |
| what a hero may equip | `src/core/loadout.js` -> `getAllowedWeaponTypes`, `CLASS_PROFILES` | Specialised classes (mage/archer/knight) override the named-hero archetype table |
| gear change notifications | `src/core/equipmentEvents.js` -> `emitEquipmentChanged` | Rebuilds world models, controls and HUD without a page reload |
| class-driven starter kit | `src/core/GameState.js` -> `setPlayerClass` | Mage -> staff + 3 potions, Archer -> bow + 20 arrows, sword class -> sword + shield |
| save loadout migration | `src/core/loadout.js` -> `reconcileHeroLoadout` | Repairs heroes whose class and equipped weapon do not match |
| bow draw and string | `src/art/weapons.js` -> `setDraw` & `createWeaponModel` | String vertex displacement and arrow nock positioning |
| arrow pool and arrow flight | `src/combat/ArrowPool.js` -> `ArrowPool.prototype.spawnArrow` | Ballistic trajectory velocity and ground embed checks |
| aim camera | `src/dev/devArena.js` -> `setAimMode`, `updateAimCamera` | OTS shoulder offset, mouse pitch/yaw, and zoom |
| melee hit detection | `src/combat/HitPipeline.js` -> `HitPipeline.prototype.update` | Swept cylinder/capsule spatial hash broadphase |
| hit sector | `src/combat/CombatData.js` -> `MELEE_HIT_SECTORS` | Hit arc angles and reach radii per weapon swing |
| damage formula | `src/combat/DamageResolver.js` -> `DamageResolver.resolve` | Defense mitigation, crit calc, poise damage, stagger |
| block and parry | `src/combat/DamageResolver.js` -> `resolve` & `Combatant.js` | 120-deg frontal cone, 120ms parry window, block stamina |
| dodge and i-frames | `src/combat/Combatant.js` -> `startDodge`, `update` | Invulnerability frame timer, directional roll |
| poise and stagger | `src/combat/CombatData.js` -> `POISE_TIERS` & `Combatant.js` | Grunt flinch vs elite poise break thresholds |
| stamina | `src/combat/Combatant.js` -> `consumeStamina`, `updateStamina` | Action costs, sprint drain, passive regen delays |
| mana and spells | `src/combat/SpellSystem.js` -> `SpellSystem.prototype.castSpell` | Resource validation, cast bar timers, spell activation |
| spell table | `src/combat/CombatData.js` -> `SPELLS_TABLE`, `getSpellData` | Catalog of fireball, heal, lightning, blizzard specs |
| status effects | `src/combat/Combatant.js` -> `applyStatusEffect`, `updateStatusEffects` | Burn DOT, freeze slow, stun ticks, duration decay |
| time scale and hit-stop | `src/combat/TimeScale.js` -> `applyHitStop`, `requestSlowMo` | Impact freeze frames and slow-motion on parry |
| combat events | `src/combat/CombatEvents.js` -> `combatEvents`, `CombatEventBus` | Decoupled event pub/sub for hits, parries, deaths |
| input handling in the Dev Lab | `src/dev/devLab.js` -> `handleKeyDown`, `handleKeyUp` | Keyboard/mouse action dispatch to active combatant |
| the Dev Lab tabs and panels | `src/dev/devLab.js` -> `initTabs`, `switchTab` | UI panel switching (combatants, weapons, spells, stats) |
| cheats | `src/dev/devCheats.js` -> `DevCheats` | Godmode, infinite stamina/mana, cooldown bypass, kill all |
| saved scenarios | `src/dev/devStorage.js` -> `saveSetup`, `loadSetup` | LocalStorage export/import for arena setups |
| stats tab | `src/dev/devStats.js` -> `DevStatsTracker`, `renderTab` | DPS meter, damage taken, parry counter, combat graph |
| enemy types | `src/data/enemies.js` -> `ENEMY_TYPES`, `getEnemyStats` | Grunt, archer, wolf, mage, boss base stat templates |
| enemy AI | `src/combat/EnemyManager.js` -> `updateAI` & `GoblinAI.js` | State-driven behavior trees (flank, windup, attack, flee) |
| ally and squad AI | `src/combat/SquadAI.js` -> `SquadAI` & `SquadController.js` | Formation follow, assist player target, defensive guard |
| squad skill hotkeys | `src/combat/SquadController.js` -> `triggerSquadSkill` | Keyboard triggers for ally companion skills |
| the player controller in the live game | `src/player/Player.js` -> `Player.prototype.update` | Legacy hero movement, combo attacks, jump, interact |
| the third-person camera | `src/player/ThirdPersonCamera.js` -> `ThirdPersonCamera` | Follow camera, collision raycasting, orbit smoothing |
| HUD | `src/ui/Hud.js` -> `Hud.prototype.update` & `src/ui/HubHud.js` | Health bars, stamina gauge, minimap, party status |
| items and inventory | `src/core/Inventory.js` -> `equipItem`, `autoEquipHero` | Bag slots, equipment validation, gear scoring |
| gacha | `src/gacha/GachaSystem.js` -> `GachaSystem.prototype.rollSummon` | Star rarity rates, pity counters, hero generation |
| dungeon and tower floor generation | `src/world/DungeonGenerator.js` -> `generateDungeon` | Procedural room layout, corridors, spawn points |
| hub and town | `src/art/town/TownAssembler.js` -> `buildTown` & `HubScene.js` | 3D town meshes, NPC wander paths, building triggers |
| save data | `src/core/GameState.js` -> `GameState.prototype.initNewGame` | Central game progression, roster, resources |
| sounds | `src/combat/Combat.js` -> `playParrySound` | WebAudio synthesized clash tones and audio cues |
| particles and VFX pools | `src/fx/WeaponFX.js` -> `spawnHitSparks`, `triggerShieldBlock` | Pooled spark geometry, parry halos, impact rings |
| spell VFX pools | `src/combat/SpellVFXPool.js` -> `SpellVFXPool` | Fireballs, ice shards, lightning bolts, healing glows |
| weapon trails | `src/fx/SlashTrail.js` -> `SlashTrail` | Dynamic polygonal ribbon geometry tracking weapon swings |
| floor art assembler | `src/art/floors/FloorAssembler.js` -> `assembleFloor` | Biome terrain chunks, grass patches, and foliage |
| enemy 3D models | `src/art/enemies.js` -> `createEnemyModel` | Procedural primitive meshes for goblins, wolves, mages |
| hero 3D models | `src/art/hero.js` -> `createHeroModel` | Procedural modular humanoid character geometry |

## 4. Combat Engine Data Flow

Input (DevLab / Player) -> Combatant (queues actions, sets velocity & targeting intent)
Combatant -> StateMachine (validates transitions, enters ATTACK/BLOCK/DODGE/AIM/CAST)
StateMachine -> Combatant (ticks phase timers, i-frames, stamina drain, and action lock)
Combatant -> HitPipeline (registers active swing capsules in SpatialHashGrid)
HitPipeline -> DamageResolver (delivers hitPayload on capsule/cylinder overlap)
DamageResolver -> Combatant (evaluates 120-deg parry cone & dodge i-frames, applies HP/poise damage)
DamageResolver -> CombatEvents (broadcasts hit, parry, guard_break, and death events)
CombatEvents -> DevStats / UI (updates damage numbers, overhead badges, DPS meter, logs)
CombatEvents -> TimeScale (triggers slow-motion on parry or per-actor hit-stop freeze)
Combatant -> HeroRig / EnemyRig (updates bones via evaluateWeaponPose / pose maps)
HeroRig -> WeaponFX / SlashTrail (spawns spark particles, block ripples, and ribbon trails)

## 5. Dependency Notes

- **Shared Modules (Live Game & Dev Lab)**:
  - `src/art/*`: `HeroRig.js`, `EnemyRig.js`, `weapons.js`, `weaponAnimations.js`, `hero.js`, `enemies.js`, `GroundSampler.js`, `looks.js`, `presets.js`
  - `src/combat/*`: `CombatData.js`, `CombatEvents.js`, `HitPipeline.js`, `DamageResolver.js`, `StateMachine.js`, `TimeScale.js`, `ArrowPool.js`, `SpellSystem.js`, `SpellVFXPool.js`
  - `src/data/*`: `heroes.js`, `enemies.js`, `items.js`, `skills.js`, `rules.js`, `materials.js`
  - `src/fx/*`: `WeaponFX.js`, `SlashTrail.js`
- **Dev Lab Only**:
  - `dev.html`, `src/dev/*` (`devLab.js`, `devArena.js`, `devCombatants.js`, `devWeapons.js`, `devSpells.js`, `devCheats.js`, `devStats.js`, `devStorage.js`, `devPresets.js`, `devShared.js`)
  - Test pages: `combat-test.html`, `art-*-test.html`, `scripts/*.mjs`
- **Live Game Only**:
  - `index.html`, `src/main.js`, `src/scenes/*`, `src/world/*`, `src/hub/*`, `src/gacha/*`, `src/ui/*`, `src/core/GameState.js`, `src/core/SceneManager.js`, `src/core/Inventory.js`
- **CRITICAL: Unmigrated Legacy Combat Files**:
  - `src/player/Player.js`: Contains legacy monolith player movement, attack combos, and defense. NOT wired to `Combatant` or `StateMachine`.
  - `src/combat/Ally.js`: Contains legacy ally follow AI and damage handling. NOT wired to `Combatant`.
  - `src/combat/Enemy.js` & `src/combat/EnemyManager.js`: Legacy mob spawner and entities using legacy `takeDamage`.

## 6. Known Gotchas & Past Bugs

- `src/combat/WolfAI.js`: Legacy pounce called `takeDamage(dmg, false, 'pounce', wolf, camera, wolf.mesh.position)`. Swapped arguments passed string into `attackerPos`, producing NaN in parry angles.
- `src/combat/TimeScale.js`: Hit-stop freezes individual actors (`hitStopTimer`) without stalling world animation loop. Global slow-motion scales world delta.
- `src/player/Player.js` & `src/art/HeroRig.js`: `setDraw(0, false, -1)` is forced to 0 on state exits (dodge, stagger, death) to prevent stuck pulled bowstrings.
- `src/art/weaponAnimations.js`: All weapon rotation angles, timings, and grip offsets live ONLY here. Never hardcode animation transforms in `HeroRig.js` or `Combatant.js`.
- `src/combat/DamageResolver.js`: Hit payloads must be structured objects (`{ attacker, target, rawDamage, poiseDamage, hitPos, hitNormal }`), never positional argument lists.
- `src/art/HeroRig.js`: Bow models attach exclusively to `model.sockets.handL`; melee weapons and staves attach to `model.sockets.handR`. Staves attach to `model.sockets.staffHand`.
- `src/core/loadout.js`: **Never decide a weapon outside this module.** The 3D model (`HeroRig.equip`), the Equipment screen, the HUD and the combat input all read `getHeroLoadout(hero)`. A hero with no valid weapon shows empty hands (`weaponType === 'none'`); a shield appears only when a shield item sits in the offhand slot.
- `src/core/GameState.js`: The hero class must never be overwritten on load. `loadFromLocalStorage` restores the player's class from `playerClass` and runs the one-time `loadoutMigrationV1` flag repair.

## 7. Conventions & Checklists

- **Naming**: Classes in PascalCase (`Combatant`), methods/functions in camelCase (`resolveHit`), balance tables in UPPER_SNAKE_CASE (`ATTACK_FRAME_DATA`).
- **Zero Allocations in Frame Loops**: Never instantiate `new THREE.Vector3()`, `new THREE.Mesh()`, or closure callbacks inside `update()` ticks. Use scratch variables (`_v0`, `_q0`) and pools.
- **Add a New Weapon**:
  1. Add weapon key to `WEAPON_KINDS` in `src/art/weapons.js`.
  2. Implement primitive mesh builder in `createWeaponModel` in `src/art/weapons.js`.
  3. Define hold poses and attack specs in `WEAPON_ANIMATIONS` in `src/art/weaponAnimations.js`.
  4. Add base weapon item template in `src/data/items.js`.
  5. Add attack frame timings and stamina costs in `src/combat/CombatData.js` (`ATTACK_FRAME_DATA`, `STAMINA_COSTS`).
  6. Add hit sector reach and arc in `MELEE_HIT_SECTORS` in `src/combat/CombatData.js`.
  7. Add gear selection entry in `src/dev/devWeapons.js`.
- **Add a New Spell**:
  1. Add spell definition to `SPELLS_TABLE` in `src/combat/CombatData.js` (manaCost, cooldown, damageMult, radius).
  2. Implement visual projectile or AOE particle mesh in `src/combat/SpellVFXPool.js`.
  3. Implement cast execution logic in `SpellSystem.prototype.castSpell` in `src/combat/SpellSystem.js`.
  4. Register spell button in `src/dev/devSpells.js` and preset loadouts in `src/dev/devPresets.js`.
- **Add a New Enemy Type**:
  1. Add archetype and base stats to `ENEMY_TYPES` in `src/data/enemies.js`.
  2. Add procedural primitive 3D model builder in `src/art/enemies.js` (`createEnemyModel`).
  3. Configure joint rig in `src/art/EnemyRig.js` if humanoid or quadruped.
  4. Implement AI state handler in `src/combat/` (or adapter in `src/dev/devCombatants.js`).
  5. Register enemy dropdown option in `src/dev/devPresets.js`.
- **Add a New Dev Lab Tab**:
  1. Add tab navigation button and panel markup in `dev.html`.
  2. Implement tab controller class in `src/dev/dev<Feature>.js`.
  3. Wire tab initialization and update loop in `src/dev/devLab.js` (`initTabs`, `switchTab`).

## 8. Protected Areas (Ask Before Touching)

The following systems are critical to live game stability and progression. Do NOT modify them unless explicitly instructed:
- `src/world/*`: Dungeon generator, room graph builder, floor layouts.
- `src/gacha/*`: Gacha summon rates, pity calculations, banner configurations.
- `src/hub/*`: Town hub state, hero wandering, training calculations, synthesis logic.
- `src/ui/*`: Main game HUD, system windows, modal lifecycle, and styling.
- `src/player/Player.js`: Legacy player controller. Ask before touching.
- `src/combat/Ally.js`: Legacy ally companion system. Ask before touching.
- `src/combat/Enemy.js`: Legacy enemy base entity. Ask before touching.
