import assert from 'node:assert/strict';
import { FLOOR5_CONFIG } from '../src/data/floor5.config.js';
import { ENEMIES } from '../src/data/enemies.js';
import { SKILLS } from '../src/data/skills.js';
import { MATERIALS } from '../src/data/materials.js';
import { MISSIONS, MISSION_TYPES } from '../src/data/missions.js';
import { REWARDS } from '../src/data/rewards.js';

function findByNameOrId(collection, key, name) {
  if (!collection) return null;
  if (Array.isArray(collection)) {
    return collection.find((item) => item.id === key || item.name === name) || null;
  }
  if (collection[key]) return collection[key];
  return Object.values(collection).find((item) => item?.id === key || item?.name === name) || null;
}

// 1. Duration check
assert.equal(FLOOR5_CONFIG.durationSec, 1800, 'durationSec must be 1800 (30:00)');
console.log('[PASS] durationSec is 1800 (30:00)');

// 2. Pacing keyframes: ascending times, valid weights, surge in last 60s
assert.ok(Array.isArray(FLOOR5_CONFIG.pacing) && FLOOR5_CONFIG.pacing.length >= 2, 'pacing must be a non-empty array');
let prevT = -1;
let hasLast60sSurge = false;
for (const kf of FLOOR5_CONFIG.pacing) {
  assert.ok(typeof kf.t === 'number' && kf.t > prevT, `pacing keyframe t=${kf.t} must be strictly ascending after ${prevT}`);
  assert.ok(kf.t < FLOOR5_CONFIG.durationSec, 'pacing keyframe t must be < durationSec');
  assert.ok(kf.spawnPerSec > 0, 'spawnPerSec must be positive');
  assert.ok(kf.maxAlive > 0, 'maxAlive must be positive');
  assert.ok(kf.variantWeights && typeof kf.variantWeights === 'object', 'variantWeights required');
  const weightSum =
    (kf.variantWeights.grunt || 0) +
    (kf.variantWeights.leaper || 0) +
    (kf.variantWeights.climber || 0);
  assert.ok(Math.abs(weightSum - 1.0) < 1e-6, `variantWeights at t=${kf.t} must sum to 1.0`);
  if (kf.t === 1740) {
    hasLast60sSurge = true;
  }
  prevT = kf.t;
}
assert.ok(hasLast60sSurge, 'pacing must include a surge keyframe for the last 60s (t=1740)');
console.log('[PASS] pacing keyframes have strictly ascending times (0 -> 1800) with final 60s surge at t=1740');

// 3. Variants check: grunt, leaper, climber present & match Floor 1 base stats
const requiredVariants = ['grunt', 'leaper', 'climber'];
const baseGrunt = findByNameOrId(ENEMIES, 'goblin_grunt', 'Goblin Grunt');
assert.ok(baseGrunt, 'Goblin Grunt must exist in src/data/enemies.js');

for (const vKey of requiredVariants) {
  const vCfg = FLOOR5_CONFIG.variants[vKey];
  assert.ok(vCfg, `Missing variant '${vKey}' in FLOOR5_CONFIG.variants`);
  const enemyEntry = findByNameOrId(ENEMIES, vCfg.enemyId, vCfg.name);
  assert.ok(enemyEntry, `Referenced enemy '${vCfg.enemyId}' missing in src/data/enemies.js`);
  assert.equal(vCfg.level, baseGrunt.level, `${vKey} level must match Floor 1 Goblin Grunt`);
  assert.deepEqual(vCfg.baseStats, baseGrunt.stats, `${vKey} baseStats must match Floor 1 Goblin Grunt stats`);
}
console.log('[PASS] variants (grunt, leaper, climber) present and inherit Floor 1 Goblin Grunt base stats');

// 4. Positive numbers & required exact multipliers
assert.ok(FLOOR5_CONFIG.stackClimb.stackHeight > 0 && FLOOR5_CONFIG.stackClimb.climbSpeed > 0);
assert.ok(FLOOR5_CONFIG.rotation.swapCooldownSec > 0);
assert.equal(FLOOR5_CONFIG.rotation.restStaminaRegenMult, 3);
assert.ok(FLOOR5_CONFIG.rotation.autoSwapStaminaPct > 0 && FLOOR5_CONFIG.rotation.autoSwapStaminaPct < 1);
assert.ok(FLOOR5_CONFIG.efficiency.oneCleanHitStaminaSavePct > 0);
assert.ok(FLOOR5_CONFIG.durability.killsUntilBlunt > 0);
assert.equal(FLOOR5_CONFIG.durability.bluntDamageMult, 0.35);
assert.ok(FLOOR5_CONFIG.durability.shieldBashDamage > 0);
assert.ok(FLOOR5_CONFIG.arrows.start > 0 && FLOOR5_CONFIG.arrows.pickupRadius > 0 && FLOOR5_CONFIG.arrows.recoverChance > 0);
assert.ok(FLOOR5_CONFIG.bleeding.tickSec > 0 && FLOOR5_CONFIG.bleeding.hpPctPerTick > 0 && FLOOR5_CONFIG.bleeding.staminaDrain > 0);
assert.equal(FLOOR5_CONFIG.fear.statMult, 0.7);
assert.ok(Array.isArray(FLOOR5_CONFIG.fear.triggers) && FLOOR5_CONFIG.fear.triggers.length > 0);
assert.equal(FLOOR5_CONFIG.nearDeath.hpPct, 0.15);
assert.ok(FLOOR5_CONFIG.nearDeath.rescueWindowSec > 0);
assert.ok(
  FLOOR5_CONFIG.berserk.duration > 0 &&
  FLOOR5_CONFIG.berserk.statMult > 1 &&
  FLOOR5_CONFIG.berserk.damageMult > 1 &&
  FLOOR5_CONFIG.berserk.hpDrainPct > 0 &&
  FLOOR5_CONFIG.berserk.redAura === true
);
assert.deepEqual(FLOOR5_CONFIG.timerUI.thresholds, [60, 30]);
assert.ok(FLOOR5_CONFIG.endDissolve.durationSec > 0 && FLOOR5_CONFIG.endDissolve.cyan === true);
assert.ok(
  FLOOR5_CONFIG.layout.chokepointWidth > 0 &&
  FLOOR5_CONFIG.layout.platformHeight > 0 &&
  FLOOR5_CONFIG.layout.spawnPoints.length > 0
);
console.log('[PASS] positive numeric parameters verified across stackClimb, rotation, efficiency, durability, arrows, bleeding, fear, nearDeath, berserk, timerUI, endDissolve, layout');

// 5. Stress Awakenings skills exist in src/data/skills.js
const expectedSkills = [
  ['basic_swordsmanship', 'Basic Swordsmanship'],
  ['basic_sword_shield_technique', 'Basic Sword-Shield Technique'],
  ['pain_tolerance', 'Pain Tolerance'],
  ['composure', 'Composure'],
  ['quick_movements', 'Quick Movements'],
  ['berserk', 'Berserk']
];

for (const [skillId, skillName] of expectedSkills) {
  const inConfig = FLOOR5_CONFIG.stressAwakenings.find(
    (s) => s.skillId === skillId || s.name === skillName
  );
  assert.ok(inConfig, `Stress awakening '${skillName}' missing from FLOOR5_CONFIG.stressAwakenings`);
  const inSkillsData = findByNameOrId(SKILLS, skillId, skillName);
  assert.ok(inSkillsData, `Skill '${skillName}' missing from src/data/skills.js`);
}
console.log('[PASS] all 6 stress awakening skills exist in src/data/skills.js (Basic Swordsmanship, Basic Sword-Shield Technique, Pain Tolerance, Composure, Quick Movements, Berserk)');

// 6. Mission type SURVIVAL and Floor 5 entry in src/data/missions.js
const survivalType = MISSION_TYPES?.SURVIVAL || findByNameOrId(MISSION_TYPES, 'SURVIVAL', 'Survival');
assert.ok(survivalType, 'SURVIVAL mission type must exist in src/data/missions.js');
assert.equal(survivalType.objective, 'SURVIVE UNTIL THE TIMER ENDS!');
const floor5Mission = MISSIONS?.[5] || findByNameOrId(MISSIONS, 'floor_5', 'Floor 5: Ruined Town at Sunset');
assert.ok(floor5Mission, 'Floor 5 mission entry must exist in src/data/missions.js');
assert.equal(floor5Mission.objective, 'SURVIVE UNTIL THE TIMER ENDS!');
console.log('[PASS] Floor 5 SURVIVAL mission objective is "SURVIVE UNTIL THE TIMER ENDS!"');

// 7. Rewards match across floor5.config.js, rewards.js, and materials.js
const floor5Rewards = REWARDS?.[5] || findByNameOrId(REWARDS, 5, 'floor_5');
assert.ok(floor5Rewards, 'Floor 5 rewards must exist in src/data/rewards.js');
assert.equal(FLOOR5_CONFIG.rewards.gold, 5000);
assert.equal(floor5Rewards.gold, 5000);

const expectedMats = [
  { id: 'iron_ore', name: 'Iron Ore', grade: 'C', count: 1 },
  { id: 'leather', name: 'Leather', grade: 'C', count: 3 },
  { id: 'wooden_planks', name: 'Wooden Planks', grade: 'B', count: 2 }
];

for (const exp of expectedMats) {
  const cfgMat = FLOOR5_CONFIG.rewards.materials.find((m) => m.name === exp.name);
  assert.ok(cfgMat, `${exp.name} missing in FLOOR5_CONFIG.rewards.materials`);
  assert.equal(cfgMat.grade, exp.grade);
  assert.equal(cfgMat.count, exp.count);

  const rewMat = floor5Rewards.materials.find((m) => m.name === exp.name || m.id === exp.id);
  assert.ok(rewMat, `${exp.name} missing in Floor 5 REWARDS`);
  assert.equal(rewMat.grade, exp.grade);
  assert.equal(rewMat.count, exp.count);

  const matEntry = findByNameOrId(MATERIALS, exp.id, exp.name);
  assert.ok(matEntry, `${exp.name} missing in src/data/materials.js`);
  assert.equal(matEntry.grade, exp.grade);
}
console.log('[PASS] Floor 5 rewards match across floor5.config.js, rewards.js, and materials.js (5000 gold, Iron Ore (C) x1, Leather (C) x3, Wooden Planks (B) x2)');
console.log('OK: all Floor 5 config tests passed (7/7)');