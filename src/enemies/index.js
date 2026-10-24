// src/enemies/index.js
// Central entry point and re-exports for the enemy subsystem.

export const ENEMY_TYPES = [
  'goblin_grunt',
  'goblin_archer',
  'goblin_shaman',
  'goblin_leader',
  'goblin_armored',
  'goblin_scout',
  'harpy',
  'hobgoblin_chief',
  'queen_of_the_forest',
  'lightning_wolf',
  'prairie_wolf',
  'goblin_hound',
  'black_wolf',
  'orc_warrior',
  'orc_archer',
  'orc_berserker',
  'orc_lord',
  'crystal_slime',
  'rock_crawler'
];

export { POSE_INFO, ENEMY_POSES } from './poses/poseInfo.js';
export { createGnollWarriorModel } from './models/ArmoredGoblin.js';
export { createEnemyModel } from './models/EnemyFactory.js';
