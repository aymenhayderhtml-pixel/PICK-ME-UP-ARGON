# Codebase Audit: Tasks T006 to T013

## Done and working
- Floating 3D hub plaza in void with 6 functional building areas (src/hub/HubEnvironment.js, src/hub/HubBuildings.js, src/scenes/HubScene.js)
- Fairy Iselle NPC wander animation, camera tracking, and contextual speech bubbles (src/hub/Iselle.js, src/data/iselle.js)
- Currency HUD with Gold, Gems, and Free Tickets display and real-time updates (src/ui/HubHud.js, src/core/GameState.js)
- Hub minimap rendering hero and facility positions on canvas (src/ui/HubHud.js)
- Lore data pass with complete rules, formulas, rarities, 15 skills, and 12 talents (src/data/rules.js, src/data/skills.js, src/data/talents.js)
- Hero roster data definitions with starting party and template statistics (src/data/heroes.js)
- Gacha summoning altar with single/multi summons and 3D ritual magic circle (src/ui/SummonWindow.js, src/hub/SummonEffect.js)
- Scene HUD separation preventing DOM overlap between Tower and Hub (src/ui/Hud.js, src/ui/HubHud.js, src/scenes/TowerScene.js)
- Hero roster window with active/fallen tabs, sorting, level/skill XP bars, and stat inspect (src/ui/RosterWindow.js)
- Party deploy window with 5 slots, Han locked to slot 1, combat power, and floor selector (src/ui/DeployWindow.js)
- Training grounds unlockable for 200 gold with 3 real-time training dummy slots and attack animations (src/ui/TrainingWindow.js, src/hub/TrainingManager.js)
- Synthesis room with hero absorption, XP calculation, skill inheritance, and 3D absorption visual (src/ui/SynthesisWindow.js, src/hub/SynthesisEffect.js)
- Hero star promotion system with stat scaling, level cap increase, and golden flash (src/ui/RosterWindow.js, src/core/GameState.js)
- Dormitory resting system recovering 2 fatigue per second for resting heroes (src/ui/DormitoryWindow.js)
- Procedural seeded forest levels with winding paths, 4 clearings, choke points, and boss arena (src/world/ForestFloor.js, src/world/ForestProps.js)
- Goblin enemies (Grunt, Archer, Shaman, Leader) with models, animations, and soundless visual feedback (src/combat/Enemy.js, src/data/enemies.js)
- Goblin AI with morale system (hesitation, flee, leader rally, leader death shock) and lead prediction (src/combat/GoblinAI.js, src/combat/Projectiles.js)
- Hobgoblin Chief boss fight with 3 phases, enrage roar, cleave, slam, charge, and pillar destruction stun (src/combat/HobgoblinChief.js, src/combat/Telegraph.js, src/ui/BossBar.js)
- Shield block angled deflection cone, Q dodge roll, parry timing, and guard break stun (src/player/Player.js, src/combat/Combat.js)
- Durability degradation for weapons/shields and scavenged battlefield item drops (src/player/Player.js, src/combat/Items.js)
- Squad AI with weapon roles: Spear boss weapon pin, Scout bow/dagger, Berserker rush, Mage fireball (src/combat/Ally.js, src/combat/SquadAI.js)
- Tactical pause CommandWheel (hold C, 0.2x speed) and hotkeys 1-6 with Han shout banners (src/ui/CommandWheel.js, src/combat/Commands.js)
- PartyPanel HUD tracking ally health, composure emoji, and active orders (src/ui/PartyPanel.js)
- Composure system, Han Leadership aura, and panic freezing/fleeing on trauma (src/combat/Ally.js, src/combat/SquadAI.js)
- Permadeath tracking with deadHeroes storage, skull badges, and Han revival fail-safe (src/core/GameState.js, src/scenes/TowerScene.js)
- Scripted Floor 1 novice tutorial ambush (Keith, Kyle, Ray, Finn) with Keith shield drop (src/scenes/TowerScene.js)
- Post-battle RewardWindow with MVP calculation, spoils distribution, and equipment inventory transfer (src/ui/RewardWindow.js)
- Camera collision prevention with raycast against tree trunks, walls, and pillars (src/player/ThirdPersonCamera.js, src/world/ForestFloor.js)
- Camera proximity fading to 0.15 opacity for humanoids within 2.5 units in tower and hub (src/core/CameraFade.js, src/scenes/TowerScene.js, src/scenes/HubScene.js)
- Camera line clearance keeping Back heroes offset sideways >=2 units and clear of 3 units behind Han (src/combat/SquadAI.js)
- HUD cleanup removing old 'Enemies left' text, adding Floor & 'Enemies: N' top-center, and 90px top-stacked system messages (src/ui/Hud.js)
- Goblin corpse 6-second retention followed by smooth 0.8s fade out and geometry disposal (src/combat/Enemy.js, src/combat/EnemyManager.js)
- Blacksmith equipment enhancement (+0 to +5), 7 forge recipes with queue, and durability repair window with artisan discounts (src/ui/BlacksmithWindow.js, src/core/Inventory.js, src/data/items.js, src/data/materials.js)
- 7-Star Awakening ritual at the Altar (Lv 60 6★ + Awakening Stone + 2000 Gems), 3D rainbow beam effect, stat transcendence bonus, and rainbow styling (src/ui/RosterWindow.js, src/scenes/HubScene.js, src/core/GameState.js)

## Partly done
None

## Missing
None
