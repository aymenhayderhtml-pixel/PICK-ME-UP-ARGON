// src/core/TrainingEngine.js
// Pure, headless training and fight resolution engine.
//
// Handles: skill XP from real actions, session outcomes, skill combining,
// Pain Tolerance, hit zones, sparring and emotion-driven fights.
//
// The fight engine here is the SINGLE code path used by both the live 3D town
// and the offline login simulation. It drives real Combatants and resolves
// every blow through the real DamageResolver.

import * as THREE from 'three';
import { TRAINING_CONFIG } from '../data/training.config.js';
import { EMOTION_CONFIG } from '../data/emotions.config.js';
import { SKILL_RECIPES } from '../data/skillRecipes.config.js';
import { getSkill, addSkillExp } from '../data/skills.js';
import { getWeightedStatsForClass, addHeroAnger } from '../data/heroes.js';
import { ISELLE_FIGHT_EVENT_TEXT, ISELLE_INTERVENTION_REPORT_TEXT } from '../data/iselle.js';
import { getCombatStats } from './Stats.js';
import { applyFearGain } from './EmotionEngine.js';
import { chooseFightAction, chooseSwitchTarget, getFightStyleForHero } from './FightAI.js';
import { Combatant } from '../combat/Combatant.js';
import { COMBAT_STATES } from '../combat/StateMachine.js';
import { DamageResolver } from '../combat/DamageResolver.js';
import { showSystemMessage } from '../ui/Notices.js';

const normalizeId = (v) => String(v || '').toLowerCase().replace(/\s+/g, '_');

/** Fills `{token}` placeholders in a report text template. */
function formatTemplate(template, vars) {
  return String(template || '').replace(
    /\{(\w+)\}/g,
    (_, key) => (vars[key] !== undefined ? String(vars[key]) : '')
  );
}

/** Snapshots a hero's level and skill ids before a progression step. */
function captureProgression(hero) {
  const skillIds = new Set();
  for (const s of (hero && hero.skills) || []) {
    skillIds.add(normalizeId(typeof s === 'string' ? s : (s.id || s.name)));
  }
  return { level: hero && hero.level ? hero.level : 1, skillIds };
}

/**
 * Compares a hero's current level and skills to a snapshot taken by
 * captureProgression. Returns the level-up flag, the new level and every skill
 * the hero learned in between (with a resolved display name).
 */
function diffProgression(hero, snapshot) {
  const newLevel = hero && hero.level ? hero.level : 1;
  const leveledUp = newLevel > snapshot.level;
  const newSkills = [];
  for (const s of (hero && hero.skills) || []) {
    const entry = typeof s === 'object' ? s : { id: s, name: s };
    const id = normalizeId(entry.id || entry.name);
    if (!snapshot.skillIds.has(id)) {
      const def = getSkill(id);
      newSkills.push({ id, name: def ? def.name : entry.name });
    }
  }
  return { leveledUp, newLevel, newSkills };
}

/** Finds a skill entry on a hero. Returns the object or null. */
export function findHeroSkill(hero, skillId) {
  if (!hero || !skillId) return null;
  const key = normalizeId(skillId);
  for (const s of hero.skills || []) {
    const id = normalizeId(typeof s === 'string' ? s : (s.id || s.name));
    if (id === key) return typeof s === 'string' ? { id: key, name: key, level: 1, exp: 0 } : s;
  }
  return null;
}

/**
 * Rolls a weighted hit zone for an attack.
 * Returns 'limbs' | 'torso' | 'head' | 'heart'.
 */
export function rollHitZone(attackKind = 'melee', rng = Math.random) {
  const weights =
    TRAINING_CONFIG.HIT_ZONE_WEIGHTS[attackKind] || TRAINING_CONFIG.HIT_ZONE_WEIGHTS.melee;
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return 'torso';
  let roll = rng() * total;
  for (const [zone, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return zone;
  }
  return 'torso';
}

/** Rolls a weighted training session outcome. */
export function rollSessionOutcome(rng = Math.random) {
  const weights = TRAINING_CONFIG.SESSION_OUTCOME_WEIGHTS;
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [outcome, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return outcome;
  }
  return 'normal_gain';
}

/**
 * Records damage taken and damage healed at the training ground and unlocks or
 * levels up Pain Tolerance when both thresholds are passed.
 */
export function recordTrainingDamageAndHeal(hero, damageTaken, damageHealed) {
  if (!hero) return null;
  if (!hero.painToleranceCounters) {
    hero.painToleranceCounters = { damageTaken: 0, damageHealed: 0 };
  }
  hero.painToleranceCounters.damageTaken += Math.max(0, damageTaken || 0);
  hero.painToleranceCounters.damageHealed += Math.max(0, damageHealed || 0);
  const result = checkAndUnlockPainTolerance(hero);
  return { ...result, counters: { ...hero.painToleranceCounters } };
}

/**
 * Unlocks or levels up the Pain Tolerance skill.
 * Level L requires damageTaken >= 120 * L AND damageHealed >= 120 * L.
 */
export function checkAndUnlockPainTolerance(hero) {
  if (!hero) return { unlocked: false, leveledUp: false, newLevel: 0 };
  const counters = hero.painToleranceCounters || { damageTaken: 0, damageHealed: 0 };
  let skill = findHeroSkill(hero, 'pain_tolerance');
  let level = skill ? (skill.level || 1) : 0;

  if (level >= TRAINING_CONFIG.PAIN_TOLERANCE_MAX_LEVEL) {
    return { unlocked: level > 0, leveledUp: false, newLevel: level };
  }

  let leveledUp = false;
  while (level < TRAINING_CONFIG.PAIN_TOLERANCE_MAX_LEVEL) {
    const nextLevel = level + 1;
    const threshold = TRAINING_CONFIG.PAIN_TOLERANCE_THRESHOLD_PER_LEVEL * nextLevel;
    if (counters.damageTaken < threshold || counters.damageHealed < threshold) break;
    if (!skill) {
      hero.skills = hero.skills || [];
      skill = { id: 'pain_tolerance', name: 'Pain Tolerance', level: nextLevel, exp: 0 };
      hero.skills.push(skill);
    } else {
      skill.level = nextLevel;
    }
    level = nextLevel;
    leveledUp = true;
  }

  return { unlocked: level > 0, leveledUp, newLevel: level };
}

/**
 * Records that a hero trained two skills together and checks the recipe table.
 */
export function recordCoTraining(hero, skillIdA, skillIdB) {
  if (!hero || !skillIdA || !skillIdB) return null;
  if (!hero.coTrainedPairs) hero.coTrainedPairs = {};
  const key = [normalizeId(skillIdA), normalizeId(skillIdB)].sort().join('|');
  hero.coTrainedPairs[key] = (hero.coTrainedPairs[key] || 0) + 1;
  const combined = checkAndCombineSkills(hero);
  return { key, sessions: hero.coTrainedPairs[key], combined };
}

/**
 * Checks every recipe and combines the skills whose requirements are met.
 * The combined level is the sum of the two parent levels. The parents are not
 * deleted: they are flagged `merged` and `mergedInto`.
 */
export function checkAndCombineSkills(hero) {
  if (!hero) return [];
  const results = [];

  for (const recipe of SKILL_RECIPES) {
    const a = findHeroSkill(hero, recipe.parentA);
    const b = findHeroSkill(hero, recipe.parentB);
    if (!a || !b) continue;
    if (a.merged === true || b.merged === true) continue;
    if ((a.level || 1) < recipe.parentAMinLevel) continue;
    if ((b.level || 1) < recipe.parentBMinLevel) continue;

    const key = [normalizeId(recipe.parentA), normalizeId(recipe.parentB)].sort().join('|');
    const sessions = (hero.coTrainedPairs || {})[key] || 0;
    if (sessions < recipe.requiredCoTrainSessions) continue;

    const combinedLevel = (a.level || 1) + (b.level || 1);
    a.merged = true;
    a.mergedInto = recipe.resultSkillId;
    b.merged = true;
    b.mergedInto = recipe.resultSkillId;

    let result = findHeroSkill(hero, recipe.resultSkillId);
    if (!result) {
      result = {
        id: recipe.resultSkillId,
        name: recipe.resultName,
        level: combinedLevel,
        exp: 0,
      };
      hero.skills = hero.skills || [];
      hero.skills.push(result);
    } else {
      result.level = Math.min(20, (result.level || 1) + combinedLevel);
    }

    const skillAName = (a && (a.name || getSkill(recipe.parentA)?.name || recipe.parentA)) || recipe.parentA;
    const skillBName = (b && (b.name || getSkill(recipe.parentB)?.name || recipe.parentB)) || recipe.parentB;
    const newSkillName = recipe.resultName || result.name || recipe.resultSkillId;
    showSystemMessage(
      `SKILL AWAKENED! '${skillAName.toUpperCase()}' AND '${skillBName.toUpperCase()}' ARE COMBINING TO CREATE A NEW SKILL.\n'${(hero.name || 'HERO').toUpperCase()}' HAS OBTAINED THE '${newSkillName.toUpperCase()}' SKILL!`
    );

    results.push({
      recipeId: recipe.id,
      resultSkillId: recipe.resultSkillId,
      resultName: recipe.resultName,
      newLevel: result.level,
      parentA: recipe.parentA,
      parentB: recipe.parentB,
    });
  }

  return results;
}

/**
 * Gives a hero direct core stat points, weighted by their class.
 */
function applyDirectStatGain(hero, points, rng) {
  if (!hero || !points) return [];
  const pool = getWeightedStatsForClass(hero.class);
  const gained = [];
  for (let i = 0; i < points; i++) {
    const key = pool[Math.floor(rng() * pool.length)];
    hero.stats[key] = (hero.stats[key] || 0) + 1;
    gained.push(key);
  }
  return gained;
}

/**
 * Ensures the hero knows the primary and secondary skill for a training zone,
 * granting the alias skill when needed (a mage who knows fireball also
 * qualifies for basic_fire_magic).
 */
function ensureTrainingSkills(hero, trainingType) {
  const primary = TRAINING_CONFIG.PRIMARY_SKILL_BY_TRAINING[trainingType];
  const secondary = TRAINING_CONFIG.SECONDARY_SKILL_BY_TRAINING[trainingType];
  if (!primary) return { primary: null, secondary: null };

  if (!findHeroSkill(hero, primary)) {
    for (const alias of TRAINING_CONFIG.SKILL_ALIASES[primary] || []) {
      if (findHeroSkill(hero, alias)) {
        const def = getSkill(primary);
        hero.skills = hero.skills || [];
        hero.skills.push({ id: primary, name: def ? def.name : primary, level: 1, exp: 0 });
        break;
      }
    }
    if (!findHeroSkill(hero, primary)) {
      const def = getSkill(primary);
      hero.skills = hero.skills || [];
      hero.skills.push({ id: primary, name: def ? def.name : primary, level: 1, exp: 0 });
    }
  }
  if (secondary && !findHeroSkill(hero, secondary)) {
    const def = getSkill(secondary);
    hero.skills = hero.skills || [];
    hero.skills.push({ id: secondary, name: def ? def.name : secondary, level: 1, exp: 0 });
  }

  return { primary, secondary };
}

/**
 * Resolves ONE training session.
 *
 * Returns a TrainingSessionResult:
 * {
 *   heroId, trainingType, outcome, skillXp, heroExp, statGains: string[],
 *   fatigueCost, fearDelta, injury: object | null, combined: object[],
 *   painTolerance: object, died: boolean, deathCause: string | null
 * }
 */
export function resolveTrainingSession(hero, trainingType, gameState, options = {}) {
  const { rng = Math.random, isellePresent = true } = options;
  if (!hero) return null;

  // Snapshot the hero's level and skills before any XP is awarded so the daily
  // report can announce level-ups and newly learned skills.
  const progressionBefore = captureProgression(hero);

  const cfg = TRAINING_CONFIG;
  const outcome = rollSessionOutcome(rng);
  const outcomeMult = cfg.OUTCOME_MULTIPLIERS[outcome] ?? 1;
  const hungerMult =
    (hero.hunger ?? 0) >= EMOTION_CONFIG.HIGH_HUNGER_THRESHOLD
      ? EMOTION_CONFIG.HIGH_HUNGER_TRAINING_MULT
      : 1;

  const { primary, secondary } = ensureTrainingSkills(hero, trainingType);

  const baseSkillXp = cfg.BASE_SESSION_SKILL_XP[trainingType] ?? 45;
  const skillXp = Math.max(1, Math.round(baseSkillXp * outcomeMult * hungerMult));
  const baseHeroExp = cfg.BASE_SESSION_HERO_EXP[trainingType] ?? 22;
  const heroExp = Math.max(1, Math.round(baseHeroExp * outcomeMult * hungerMult));

  const levelsBefore = captureSkillLevels(hero);
  addSkillExp(hero, primary, skillXp, { notify: false });
  if (secondary) {
    addSkillExp(hero, secondary, Math.round(skillXp * cfg.SECONDARY_SKILL_XP_RATIO), { notify: false });
  }

  const levelsAfter = captureSkillLevels(hero);
  for (const [id, beforeLevel] of Object.entries(levelsBefore)) {
    const afterLevel = levelsAfter[id];
    if (afterLevel && afterLevel > beforeLevel) {
      const skill = (hero.skills || []).find((s) => normalizeId(typeof s === 'string' ? s : (s.id || s.name)) === id);
      const skillName = skill && typeof skill === 'object'
        ? (skill.name || getSkill(id)?.name || id)
        : (getSkill(id)?.name || id);
      showSystemMessage(`'${String(skillName).toUpperCase()}' HAS LEVELED UP TO LV${afterLevel}!`);
    }
  }
  // newly added skills that somehow leveled beyond 1 are handled above; new skills at level 1 do not notify.

  // Direct core stat growth.
  const statChance = cfg.STAT_GAIN_CHANCE_BY_OUTCOME[outcome] ?? 0;
  let statGains = [];
  if (rng() < statChance) {
    const points =
      outcome === 'strong_gain'
        ? cfg.STRONG_GAIN_BONUS_STAT_POINTS
        : outcome === 'normal_gain'
          ? cfg.NORMAL_GAIN_BONUS_STAT_POINTS
          : 1;
    statGains = applyDirectStatGain(hero, points, rng);
  }

  // Hero level EXP.
  if (gameState && typeof gameState.addExp === 'function' && hero.id) {
    gameState.addExp(hero.id, heroExp);
  }

  // Fatigue cost.
  const fatigueCost = cfg.TRAINING_FATIGUE_COST[trainingType] ?? 18;
  hero.fatigue = Math.min(100, (hero.fatigue || 0) + fatigueCost);

  // Fear falls after a successful session.
  const fearBefore = hero.fear ?? 0;
  if (outcome !== 'accident') {
    hero.fear = Math.max(0, fearBefore - EMOTION_CONFIG.FEAR_REDUCTION_TRAIN_SUCCESS);
  }

  // An accident injures the hero.
  let injury = null;
  if (outcome === 'accident') {
    const zone = rollHitZone(trainingType === 'train_archery' ? 'arrow' : 'melee', rng);
    const serious = cfg.CRITICAL_ZONES.includes(zone);
    injury = {
      zone,
      severity: serious ? 'serious' : 'minor',
      daysRemaining: serious ? cfg.CRITICAL_INJURY_DURATION_DAYS : 1,
      healRateMult: serious ? cfg.CRITICAL_INJURY_HEAL_MULT : 1,
    };
    hero.injury = injury;
    applyFearGain(hero, EMOTION_CONFIG.FEAR_GAIN_BIG_DAMAGE);
  }

  // Co-training: the two skills practised together.
  let combined = [];
  if (primary && secondary) {
    const co = recordCoTraining(hero, primary, secondary);
    if (co && co.combined.length > 0) combined = co.combined;
  }

  // Pain Tolerance counters: training bruises count as damage taken and, at the
  // training ground, as damage healed.
  let painTolerance = { unlocked: false, leveledUp: false, newLevel: 0 };
  if (outcome === 'accident' && injury) {
    const dmg = Math.round(10 + skillXp * 0.2);
    painTolerance = recordTrainingDamageAndHeal(hero, dmg, dmg) || painTolerance;
    if (painTolerance && painTolerance.leveledUp) {
      showSystemMessage(`'PAIN TOLERANCE' HAS LEVELED UP TO LV${painTolerance.newLevel}!`);
    }
  }

  // Death: only risky training, and never while Iselle is present.
  let died = false;
  let deathCause = null;
  const risky = cfg.RISKY_TRAINING_TYPES.includes(trainingType);
  if (risky) {
    const deathChance = isellePresent
      ? cfg.DEATH_CHANCE_WITH_ISELLE
      : cfg.RISKY_DEATH_CHANCE_BASE;
    if (deathChance > 0 && rng() < deathChance) {
      died = true;
      deathCause = 'Killed in a training accident';
    }
  }

  if (died && gameState) {
    handleHeroDeathAndDropGear(gameState, hero, gameState.currentFloor || 1, deathCause);
  }

  const progression = diffProgression(hero, progressionBefore);

  return {
    heroId: hero.id,
    trainingType,
    outcome,
    skillXp,
    heroExp,
    statGains,
    levelsBefore,
    fatigueCost,
    fearDelta: (hero.fear ?? 0) - fearBefore,
    injury,
    combined,
    painTolerance,
    died,
    deathCause,
    leveledUp: progression.leveledUp,
    newLevel: progression.newLevel,
    newSkills: progression.newSkills,
  };
}

/**
 * Picks the skill a hero should gain XP from, based on the weapon they carry.
 */
export function pickPrimarySkillForHero(hero) {
  const skills = (hero && hero.skills) || [];
  const wType = String((hero && hero.equipment && hero.equipment.weapon
    ? hero.equipment.weapon.weaponType
    : '') || '').toLowerCase();
  if (wType) {
    const match = skills.find((s) => {
      const id = normalizeId(typeof s === 'string' ? s : (s.id || s.name));
      if (id.includes(wType)) return true;
      if (wType === 'staff' && (id.includes('fire') || id.includes('mana'))) return true;
      if (wType === 'bow' && id.includes('archery')) return true;
      return false;
    });
    if (match) return normalizeId(typeof match === 'string' ? match : (match.id || match.name));
  }
  if (skills.length > 0) {
    const sorted = [...skills].sort(
      (a, b) =>
        ((a.level || 1) * 1000 + (a.exp || 0)) - ((b.level || 1) * 1000 + (b.exp || 0))
    );
    const s = sorted[0];
    return normalizeId(typeof s === 'string' ? s : (s.id || s.name));
  }
  return 'basic_swordsmanship';
}

/**
 * Removes a dead hero's gear into the inventory (or the overflow pile) and
 * moves the hero to the Fallen Heroes list.
 */
export function handleHeroDeathAndDropGear(gameState, hero, floor = 1, deathCause = 'Training accident') {
  if (!gameState || !hero) return { droppedItems: [], overflowedItems: [] };
  if (hero.id === 'hero_han') return { droppedItems: [], overflowedItems: [] };

  const droppedItems = [];
  const overflowedItems = [];
  const equipment = hero.equipment || {};
  for (const slot of ['weapon', 'offhand', 'armor']) {
    const item = equipment[slot];
    if (!item) continue;
    equipment[slot] = null;
    const added = gameState.addItemToInventory(item);
    if (added) {
      droppedItems.push(item);
    } else {
      gameState.overflowLoot = gameState.overflowLoot || [];
      gameState.overflowLoot.push(item);
      overflowedItems.push(item);
    }
  }
  hero.equipment = equipment;

  if (typeof gameState.killHero === 'function') {
    gameState.killHero(hero.id, floor, deathCause);
  }

  return { droppedItems, overflowedItems };
}

/**
 * Creates a real Combatant for a hero so every blow goes through the real
 * DamageResolver (hit zones, block, parry, poise, Pain Tolerance).
 */
export function createFighterFromHero(hero, positionVec3 = null) {
  const stats = getCombatStats(hero);
  const weapon = hero.equipment && hero.equipment.weapon;
  const offhand = hero.equipment && hero.equipment.offhand;
  const pos = positionVec3 ? positionVec3.clone() : new THREE.Vector3(0, 0, 0);

  const weaponKind =
    (weapon && weapon.weaponType) ||
    EMOTION_CONFIG.FIGHT_CLASS_DEFAULT_WEAPON[String(hero.class || 'novice').toLowerCase()] ||
    'sword';

  const fighter = new Combatant({
    id: `fight_${hero.id}`,
    name: hero.name,
    team: 'neutral',
    roleTag: 'grunt',
    maxHp: stats.maxHp,
    hp: stats.maxHp,
    maxStamina: stats.maxStamina,
    stamina: stats.maxStamina,
    maxMana: EMOTION_CONFIG.FIGHT_DEFAULT_MANA,
    mana: EMOTION_CONFIG.FIGHT_DEFAULT_MANA,
    defense: stats.defense,
    baseAttack: stats.damage,
    moveSpeed: stats.moveSpeed,
    position: pos,
    weapon: {
      kind: weaponKind,
      grade: (weapon && weapon.grade) || 'D',
      damageMult: (weapon && weapon.damageMult) || 1.0,
    },
    // Every fighter can guard, so 'defend' always means something.
    shield: offhand && offhand.weaponType === 'shield'
      ? {
          kind: 'shield',
          grade: offhand.grade || 'D',
          blockEfficiency: TRAINING_CONFIG.FIGHT_DEFEND_BLOCK_EFFICIENCY,
        }
      : {
          kind: 'guard',
          grade: 'D',
          blockEfficiency: TRAINING_CONFIG.FIGHT_DEFEND_BLOCK_EFFICIENCY,
        },
  });

  fighter.incomingDamageReduction = stats.incomingDamageReduction || 0;
  fighter.currentAiAction = null;
  fighter.lastAiDecisionElapsed = -Infinity;
  return fighter;
}

/**
 * Creates a fight session. A sanctioned fight starts inside the sparring
 * ring, an unsanctioned one starts in the town plaza.
 */
export function createFightSession(heroA, heroB, options = {}) {
  const isSanctioned = options.isSanctioned !== undefined ? Boolean(options.isSanctioned) : true;
  const spotA =
    options.spotA ||
    (isSanctioned
      ? { x: -19.6, z: 23.3 }
      : { ...EMOTION_CONFIG.UNSANCTIONED_FIGHT_SPOT_A });
  const spotB =
    options.spotB ||
    (isSanctioned
      ? { x: -17.8, z: 23.3 }
      : { ...EMOTION_CONFIG.UNSANCTIONED_FIGHT_SPOT_B });
  const ringCenter = options.ringCenter || { x: -18.7, z: 23.3 };
  const ringRadius = options.ringRadius ?? 2.2;

  const fighterA = createFighterFromHero(heroA, new THREE.Vector3(spotA.x, 0, spotA.z));
  const fighterB = createFighterFromHero(heroB, new THREE.Vector3(spotB.x, 0, spotB.z));
  fighterA.facingYaw = Math.atan2(spotB.x - spotA.x, spotB.z - spotA.z);
  fighterB.facingYaw = Math.atan2(spotA.x - spotB.x, spotA.z - spotB.z);

  return {
    heroA,
    heroB,
    fighterA,
    fighterB,
    statsA: getCombatStats(heroA),
    statsB: getCombatStats(heroB),
    isSanctioned,
    fightersInRing: false,
    triggerReason: options.triggerReason || (isSanctioned ? 'spar' : 'anger_rival'),
    ringCenter,
    ringRadius,
    spotA: { ...spotA },
    spotB: { ...spotB },
    elapsed: 0,
    exchanges: 0,
    totalDamage: 0,
    damageDealtA: 0,
    damageDealtB: 0,
    lastHitZone: 'torso',
    criticalZoneHit: null,
    criticalOffenderHero: null,
    criticalTargetHero: null,
    lowHpOffenderHero: null,
    lowHpTargetHero: null,
    fledHeroId: null,
    stoppedBy: null,
    stopReason: null,
    lawBroken: isSanctioned ? null : EMOTION_CONFIG.LOBBY_LAWS.NO_OUTSIDE_FIGHTING,
    offenderHero: isSanctioned ? null : heroA,
    actionHistoryA: [],
    actionHistoryB: [],
    consequencesApplied: false,
    consequenceSummary: null,
  };
}

/**
 * Runs one fighter's turn: the Fight AI picks an action, the action is
 * executed, and any damage goes through the real DamageResolver.
 */
function executeSingleFighterTurn(session, side, rng) {
  const isA = side === 'A';
  const selfHero = isA ? session.heroA : session.heroB;
  const oppHero = isA ? session.heroB : session.heroA;
  const selfFighter = isA ? session.fighterA : session.fighterB;
  const oppFighter = isA ? session.fighterB : session.fighterA;
  const selfStats = isA ? session.statsA : session.statsB;
  const oppStats = isA ? session.statsB : session.statsA;

  const idle = { action: null, damage: 0, hitZone: null, critical: false };
  if (selfFighter.isDead || oppFighter.isDead) return idle;
  if (selfFighter.hp <= 0 || oppFighter.hp <= 0) return idle;

  const dist = selfFighter.position.distanceTo(oppFighter.position);
  const oppEntry = {
    hero: oppHero,
    heroStats: oppStats,
    hpRatio: Math.max(0, oppFighter.hp / Math.max(1, oppFighter.maxHp)),
    distance: dist,
  };

  const context = {
    self: selfHero,
    selfStats,
    selfHpRatio: Math.max(0, selfFighter.hp / Math.max(1, selfFighter.maxHp)),
    opponents: [oppEntry],
    target: oppEntry,
    elapsed: session.elapsed,
    fightDuration: EMOTION_CONFIG.ISELLE_MAX_FIGHT_DURATION_SEC,
    allyCount: 0,
    enemyCount: 1,
    rng,
    isSanctioned: session.isSanctioned,
    currentAction: selfFighter.currentAiAction,
    lastDecisionElapsed: selfFighter.lastAiDecisionElapsed,
    selfMana: selfFighter.mana,
  };

  const action = chooseFightAction(context);
  if (action !== selfFighter.currentAiAction) {
    selfFighter.currentAiAction = action;
    selfFighter.lastAiDecisionElapsed = session.elapsed;
  }
  if (isA) session.actionHistoryA.push(action);
  else session.actionHistoryB.push(action);

  selfFighter.facingYaw = Math.atan2(
    oppFighter.position.x - selfFighter.position.x,
    oppFighter.position.z - selfFighter.position.z
  );

  if (action === 'flee') {
    selfFighter.stateMachine.transitionTo(COMBAT_STATES.MOVE);
    session.fledHeroId = selfHero.id;
    return { action, damage: 0, hitZone: null, critical: false };
  }

  if (action === 'defend') {
    selfFighter.stateMachine.transitionTo(COMBAT_STATES.BLOCK);
    return { action, damage: 0, hitZone: null, critical: false };
  }

  if (action === 'retreat') {
    selfFighter.stateMachine.transitionTo(COMBAT_STATES.MOVE);
    const dx = selfFighter.position.x - oppFighter.position.x;
    const dz = selfFighter.position.z - oppFighter.position.z;
    const len = Math.hypot(dx, dz) || 1;
    selfFighter.position.x += (dx / len) * TRAINING_CONFIG.FIGHT_RETREAT_STEP_DIST;
    selfFighter.position.z += (dz / len) * TRAINING_CONFIG.FIGHT_RETREAT_STEP_DIST;
    return { action, damage: 0, hitZone: null, critical: false };
  }

  if (action === 'switch_target') {
    chooseSwitchTarget(context);
    selfFighter.stateMachine.transitionTo(COMBAT_STATES.MOVE);
    return { action, damage: 0, hitZone: null, critical: false };
  }

  // Offensive actions: 'attack', 'aim', 'cast'.
  const style = getFightStyleForHero(selfHero);
  if (action === 'attack' && dist > style.preferredRange) {
    const dx = oppFighter.position.x - selfFighter.position.x;
    const dz = oppFighter.position.z - selfFighter.position.z;
    const len = Math.hypot(dx, dz) || 1;
    const step = Math.min(
      TRAINING_CONFIG.FIGHT_ADVANCE_STEP_DIST,
      Math.max(0, dist - style.preferredRange)
    );
    selfFighter.position.x += (dx / len) * step;
    selfFighter.position.z += (dz / len) * step;
  }

  let attackKind = 'melee';
  let attackMoveMult = 1.0;
  if (action === 'aim') {
    selfFighter.stateMachine.transitionTo(COMBAT_STATES.AIM);
    attackKind = 'arrow';
    attackMoveMult = TRAINING_CONFIG.FIGHT_AIM_DAMAGE_MULT;
  } else if (action === 'cast') {
    selfFighter.stateMachine.transitionTo(COMBAT_STATES.CAST);
    selfFighter.mana = Math.max(
      0,
      (selfFighter.mana ?? 0) - EMOTION_CONFIG.FIGHT_CAST_MANA_COST
    );
    attackKind = 'spell';
    attackMoveMult = TRAINING_CONFIG.FIGHT_CAST_DAMAGE_MULT;
  } else {
    selfFighter.stateMachine.transitionTo(COMBAT_STATES.ATTACK);
  }

  const oppHpRatioBefore = oppFighter.hp / Math.max(1, oppFighter.maxHp);
  // The hit zone is always rolled here so the fight stays deterministic even
  // though the DamageResolver can roll its own.
  const hitZone = rollHitZone(attackKind, rng);
  oppFighter.facingYaw = Math.atan2(
    selfFighter.position.x - oppFighter.position.x,
    selfFighter.position.z - oppFighter.position.z
  );

  const result = DamageResolver.resolve(oppFighter, {
    attacker: selfFighter,
    attackerPosition: selfFighter.position,
    attackerName: selfHero.name,
    target: oppFighter,
    rawDamage: selfFighter.baseAttack * TRAINING_CONFIG.SPAR_DAMAGE_PER_EXCHANGE_MULT,
    poiseDamage: 18,
    weaponMult: (selfFighter.weapon && selfFighter.weapon.damageMult) || 1.0,
    weaponGrade: (selfFighter.weapon && selfFighter.weapon.grade) || 'D',
    attackMoveMult,
    hitZone,
    attackKind,
  });

  const damage = Math.max(0, Number(result && result.damage !== undefined ? result.damage : 0));
  const critical = EMOTION_CONFIG.ISELLE_INTERVENE_CRITICAL_ZONES.includes(hitZone);
  session.totalDamage += damage;
  if (isA) session.damageDealtA += damage;
  else session.damageDealtB += damage;
  session.lastHitZone = hitZone;
  recordTrainingDamageAndHeal(oppHero, damage, 0);

  if (critical && !session.criticalZoneHit) {
    session.criticalZoneHit = hitZone;
    session.criticalOffenderHero = selfHero;
    session.criticalTargetHero = oppHero;
  }

  const oppHpRatioAfter = oppFighter.hp / Math.max(1, oppFighter.maxHp);
  if (
    !session.lowHpOffenderHero &&
    (oppHpRatioBefore < EMOTION_CONFIG.ISELLE_INTERVENE_HP_RATIO ||
      oppHpRatioAfter < EMOTION_CONFIG.ISELLE_INTERVENE_HP_RATIO)
  ) {
    session.lowHpOffenderHero = selfHero;
    session.lowHpTargetHero = oppHero;
  }

  return { action, damage, hitZone, critical };
}

/**
 * Runs one exchange: both fighters act once, then the training yard
 * regenerates their wounds.
 *
 * The caller owns `session.elapsed` so the live 3D controller and the
 * headless simulation both measure time the same way.
 */
export function stepFightExchange(session, rng = Math.random) {
  if (!session) return null;
  session.exchanges += 1;

  const turnA = executeSingleFighterTurn(session, 'A', rng);
  let turnB = { action: null, damage: 0, hitZone: null, critical: false };
  if (!session.fledHeroId && !session.fighterB.isDead) {
    turnB = executeSingleFighterTurn(session, 'B', rng);
  }

  // NOTE: there is deliberately NO fast heal inside a fight. A fight is a real
  // exchange: the damage has to accumulate, otherwise the low HP rule could
  // never fire and Iselle would never have to step in. The training yard
  // heals the wounds AFTER the fight (see applyTrainingYardRecovery).
  return { turnA, turnB };
}

/**
 * The training yard heals a fighter's wounds after a fight.
 * A critical (head or heart) wound does not heal fast.
 * Returns the amount healed.
 */
export function applyTrainingYardRecovery(fighter, hero, seconds) {
  if (!fighter || !hero) return 0;
  const wound = fighter.maxHp - fighter.hp;
  if (wound <= 0) return 0;
  const mult =
    hero.injury && hero.injury.severity === 'serious'
      ? TRAINING_CONFIG.CRITICAL_INJURY_HEAL_MULT
      : 1.0;
  const healed = Math.min(
    wound,
    TRAINING_CONFIG.TRAINING_FAST_HEAL_PER_SEC * (seconds || 0) * mult
  );
  fighter.hp += healed;
  recordTrainingDamageAndHeal(hero, 0, healed);
  return healed;
}

/**
 * Checks whether the fight must stop, and why.
 *
 * Order: Squad Leader, flee, critical zone, low HP, ring boundary, unsanctioned
 * detection window, max duration, max total damage.
 */
export function evaluateFightIntervention(session, gameState, options = {}) {
  if (!session) {
    return { shouldStop: false, stoppedBy: null, stopReason: null, lawBroken: null };
  }

  // 1. The Squad Leader breaks it up first, when he is nearby and stronger.
  const leader =
    options.leader ||
    ((gameState && gameState.heroes ? gameState.heroes : []).find(
      (h) =>
        h.alive &&
        h.isSquadLeader &&
        h.id !== session.heroA.id &&
        h.id !== session.heroB.id
    ) ||
      null);
  if (leader) {
    const leaderDistance = options.leaderDistance ?? 0;
    if (leaderDistance <= EMOTION_CONFIG.LEADER_INTERVENE_MAX_DIST) {
      const leaderStats = getCombatStats(leader);
      const power = (s) => s.damage * (1 + s.defense) + s.maxHp * 0.2;
      if (
        power(leaderStats) >
        Math.max(power(session.statsA), power(session.statsB)) *
          EMOTION_CONFIG.LEADER_INTERVENE_POWER_RATIO
      ) {
        session.stoppedBy = 'leader';
        session.stopReason = 'leader_stopped';
        return {
          shouldStop: true,
          stoppedBy: 'leader',
          stopReason: 'leader_stopped',
          lawBroken: session.lawBroken,
        };
      }
    }
  }

  // 2. A fighter that fled ends the fight.
  if (session.fledHeroId) {
    if (!session.isSanctioned) {
      session.stoppedBy = 'iselle';
      session.stopReason = 'unsanctioned_fight';
      session.lawBroken = EMOTION_CONFIG.LOBBY_LAWS.NO_OUTSIDE_FIGHTING;
      session.offenderHero = session.heroA;
    } else {
      session.stoppedBy = 'flee';
      session.stopReason = 'fled';
    }
    return {
      shouldStop: true,
      stoppedBy: session.stoppedBy,
      stopReason: session.stopReason,
      lawBroken: session.lawBroken,
    };
  }

  // 3. A critical zone (head or heart) stops the fight immediately.
  if (session.criticalZoneHit) {
    session.stoppedBy = 'iselle';
    session.stopReason = session.isSanctioned ? 'critical_hit' : 'unsanctioned_fight';
    session.lawBroken = session.isSanctioned
      ? EMOTION_CONFIG.LOBBY_LAWS.NO_LETHAL_SPAR_BLOWS
      : EMOTION_CONFIG.LOBBY_LAWS.NO_OUTSIDE_FIGHTING;
    session.offenderHero = session.criticalOffenderHero || session.heroA;
    return {
      shouldStop: true,
      stoppedBy: 'iselle',
      stopReason: session.stopReason,
      lawBroken: session.lawBroken,
    };
  }

  // 4. A fighter below the safe HP threshold.
  const ratioA = session.fighterA.hp / Math.max(1, session.fighterA.maxHp);
  const ratioB = session.fighterB.hp / Math.max(1, session.fighterB.maxHp);
  if (
    ratioA < EMOTION_CONFIG.ISELLE_INTERVENE_HP_RATIO ||
    ratioB < EMOTION_CONFIG.ISELLE_INTERVENE_HP_RATIO ||
    session.lowHpOffenderHero
  ) {
    session.stoppedBy = 'iselle';
    session.stopReason = session.isSanctioned ? 'low_hp' : 'unsanctioned_fight';
    session.lawBroken = session.isSanctioned
      ? EMOTION_CONFIG.LOBBY_LAWS.NO_ATTACK_LOW_HP
      : EMOTION_CONFIG.LOBBY_LAWS.NO_OUTSIDE_FIGHTING;
    session.offenderHero = session.lowHpOffenderHero || session.heroA;
    return {
      shouldStop: true,
      stoppedBy: 'iselle',
      stopReason: session.stopReason,
      lawBroken: session.lawBroken,
    };
  }

  // 5. The fighters left the sanctioned area.
  const distA = Math.hypot(
    session.fighterA.position.x - session.ringCenter.x,
    session.fighterA.position.z - session.ringCenter.z
  );
  const distB = Math.hypot(
    session.fighterB.position.x - session.ringCenter.x,
    session.fighterB.position.z - session.ringCenter.z
  );
  const insideRing = distA <= session.ringRadius && distB <= session.ringRadius;
  if (insideRing) {
    session.fightersInRing = true;
  } else if (session.isSanctioned && session.fightersInRing) {
    session.stoppedBy = 'iselle';
    session.stopReason = 'left_ring';
    session.lawBroken = EMOTION_CONFIG.LOBBY_LAWS.NO_OUTSIDE_FIGHTING;
    session.offenderHero = distA > distB ? session.heroA : session.heroB;
    return {
      shouldStop: true,
      stoppedBy: 'iselle',
      stopReason: 'left_ring',
      lawBroken: session.lawBroken,
    };
  }

  // 6. Iselle spots an unsanctioned brawl and flies over.
  if (
    !session.isSanctioned &&
    session.elapsed >= EMOTION_CONFIG.ISELLE_UNSANCTIONED_MIN_DETECT_SEC
  ) {
    session.stoppedBy = 'iselle';
    session.stopReason = 'unsanctioned_fight';
    session.lawBroken = EMOTION_CONFIG.LOBBY_LAWS.NO_OUTSIDE_FIGHTING;
    session.offenderHero = session.heroA;
    return {
      shouldStop: true,
      stoppedBy: 'iselle',
      stopReason: 'unsanctioned_fight',
      lawBroken: session.lawBroken,
    };
  }

  // 7. The fight went on too long or did too much damage.
  if (session.elapsed > EMOTION_CONFIG.ISELLE_MAX_FIGHT_DURATION_SEC) {
    session.stoppedBy = 'iselle';
    session.stopReason = 'max_duration';
    return {
      shouldStop: true,
      stoppedBy: 'iselle',
      stopReason: 'max_duration',
      lawBroken: session.lawBroken,
    };
  }
  if (session.totalDamage > EMOTION_CONFIG.ISELLE_MAX_FIGHT_TOTAL_DAMAGE) {
    session.stoppedBy = 'iselle';
    session.stopReason = 'max_damage';
    return {
      shouldStop: true,
      stoppedBy: 'iselle',
      stopReason: 'max_damage',
      lawBroken: session.lawBroken,
    };
  }

  return {
    shouldStop: false,
    stoppedBy: null,
    stopReason: null,
    lawBroken: session.lawBroken,
  };
}

/**
 * Applies everything a finished fight leaves behind: injuries, emotions, the
 * relationship between the two fighters, skill XP and the report events.
 *
 * Idempotent: the live 3D path and the daily simulation may both call it.
 */
export function applyFightConsequences(session, gameState) {
  if (!session) return null;
  if (session.consequencesApplied) return session.consequenceSummary;
  session.consequencesApplied = true;

  const { heroA, heroB, fighterA, fighterB } = session;
  const day = gameState && gameState.dayCount ? gameState.dayCount : 1;
  const reportEvents = [];
  const injuries = [];
  const clamp100 = (v) => Math.max(0, Math.min(100, Math.round(v || 0)));
  // Snapshot both fighters before any XP so the report can announce the
  // level-ups and newly learned skills this bout granted.
  const progressionBeforeA = captureProgression(heroA);
  const progressionBeforeB = captureProgression(heroB);

  const ratioA = fighterA.hp / Math.max(1, fighterA.maxHp);
  const ratioB = fighterB.hp / Math.max(1, fighterB.maxHp);

  let winnerHero = null;
  let loserHero = null;
  if (session.fledHeroId) {
    loserHero = session.fledHeroId === heroA.id ? heroA : heroB;
    winnerHero = loserHero === heroA ? heroB : heroA;
  } else if (session.damageDealtA !== session.damageDealtB) {
    // The fighter who dealt the most damage wins. The training yard heals the
    // wounds afterwards, so the final HP is not a fair measure of a bout.
    winnerHero = session.damageDealtA > session.damageDealtB ? heroA : heroB;
    loserHero = winnerHero === heroA ? heroB : heroA;
  } else if (Math.abs(ratioA - ratioB) > 0.01) {
    winnerHero = ratioA > ratioB ? heroA : heroB;
    loserHero = winnerHero === heroA ? heroB : heroA;
  }

  // 1. Injuries
  if (session.criticalZoneHit && session.criticalTargetHero) {
    const injured = session.criticalTargetHero;
    injured.injury = {
      zone: session.criticalZoneHit,
      severity: 'serious',
      daysRemaining: TRAINING_CONFIG.FIGHT_CRITICAL_INJURY_DAYS,
      healRateMult: TRAINING_CONFIG.CRITICAL_INJURY_HEAL_MULT,
    };
    injuries.push({ heroId: injured.id, ...injured.injury });
  } else if (
    !session.isSanctioned &&
    (ratioA < EMOTION_CONFIG.ISELLE_INTERVENE_HP_RATIO ||
      ratioB < EMOTION_CONFIG.ISELLE_INTERVENE_HP_RATIO)
  ) {
    const injured = ratioA <= ratioB ? heroA : heroB;
    injured.injury = {
      zone: session.lastHitZone || 'torso',
      severity: 'minor',
      daysRemaining: TRAINING_CONFIG.MINOR_INJURY_DAYS,
      healRateMult: TRAINING_CONFIG.MINOR_INJURY_HEAL_MULT,
    };
    injuries.push({ heroId: injured.id, ...injured.injury });
  }

  // 2. Winner / loser / draw emotion deltas
  if (winnerHero && loserHero) {
    winnerHero.motivationScore = clamp100(
      (winnerHero.motivationScore ?? 50) + EMOTION_CONFIG.FIGHT_WIN_MOTIVATION_GAIN
    );
    loserHero.motivationScore = clamp100(
      (loserHero.motivationScore ?? 50) + EMOTION_CONFIG.FIGHT_LOSS_MOTIVATION_DELTA
    );
    applyFearGain(winnerHero, EMOTION_CONFIG.FIGHT_WIN_FEAR_GAIN);
    applyFearGain(loserHero, EMOTION_CONFIG.FEAR_GAIN_LOSS);
    winnerHero.anger = clamp100(
      (winnerHero.anger ?? 0) + EMOTION_CONFIG.FIGHT_WIN_ANGER_DELTA
    );
    loserHero.anger = clamp100((loserHero.anger ?? 0) + EMOTION_CONFIG.ANGER_GAIN_LOSS);
  } else {
    heroA.motivationScore = clamp100(
      (heroA.motivationScore ?? 50) + EMOTION_CONFIG.FIGHT_DRAW_MOTIVATION_DELTA
    );
    heroB.motivationScore = clamp100(
      (heroB.motivationScore ?? 50) + EMOTION_CONFIG.FIGHT_DRAW_MOTIVATION_DELTA
    );
    applyFearGain(heroA, EMOTION_CONFIG.FIGHT_DRAW_FEAR_GAIN);
    applyFearGain(heroB, EMOTION_CONFIG.FIGHT_DRAW_FEAR_GAIN);
    heroA.anger = clamp100((heroA.anger ?? 0) + EMOTION_CONFIG.ANGER_GAIN_RIVALRY);
    heroB.anger = clamp100((heroB.anger ?? 0) + EMOTION_CONFIG.ANGER_GAIN_RIVALRY);
  }

  if (session.fledHeroId) {
    const fledHero = session.fledHeroId === heroA.id ? heroA : heroB;
    applyFearGain(fledHero, EMOTION_CONFIG.FIGHT_FLEE_FEAR_GAIN);
    fledHero.fatigue = clamp100(
      (fledHero.fatigue ?? 0) + EMOTION_CONFIG.FIGHT_FLEE_FATIGUE_GAIN
    );
  }

  // 3. The training yard heals the fight wounds first. Iselle's intervention
  //    then raises the fighters to a safe level on top of that.
  applyTrainingYardRecovery(fighterA, heroA, TRAINING_CONFIG.FIGHT_RECOVERY_SEC);
  applyTrainingYardRecovery(fighterB, heroB, TRAINING_CONFIG.FIGHT_RECOVERY_SEC);

  // 4. Iselle separates them: heal, calm, then punish the offender.
  if (session.stoppedBy === 'iselle') {
    fighterA.hp = Math.max(
      fighterA.hp,
      Math.round(fighterA.maxHp * EMOTION_CONFIG.ISELLE_SAFE_HEAL_HP_RATIO)
    );
    fighterB.hp = Math.max(
      fighterB.hp,
      Math.round(fighterB.maxHp * EMOTION_CONFIG.ISELLE_SAFE_HEAL_HP_RATIO)
    );
    heroA.anger = clamp100((heroA.anger ?? 0) - EMOTION_CONFIG.ISELLE_ANGER_REDUCTION);
    heroB.anger = clamp100((heroB.anger ?? 0) - EMOTION_CONFIG.ISELLE_ANGER_REDUCTION);
    applyFearGain(heroA, EMOTION_CONFIG.ISELLE_FEAR_GAIN);
    applyFearGain(heroB, EMOTION_CONFIG.ISELLE_FEAR_GAIN);

    if (session.lawBroken) {
      const offender = session.offenderHero || heroA;
      offender.motivationScore = clamp100(
        (offender.motivationScore ?? 50) - EMOTION_CONFIG.LAW_BREAK_MOTIVATION_PENALTY
      );
    }
  }

  // 5. The relationship between the two fighters.
  let intimacyDelta = 0;
  let tensionDelta = 0;
  if (!session.isSanctioned || session.lawBroken) {
    intimacyDelta = EMOTION_CONFIG.FIGHT_UNSANCTIONED_INTIMACY_DELTA;
    tensionDelta = EMOTION_CONFIG.FIGHT_UNSANCTIONED_TENSION_GAIN;
  } else if (session.stoppedBy === 'iselle') {
    intimacyDelta = EMOTION_CONFIG.FIGHT_INTENSE_SPAR_INTIMACY_GAIN;
    tensionDelta = EMOTION_CONFIG.FIGHT_INTENSE_SPAR_TENSION_GAIN;
  } else {
    intimacyDelta = EMOTION_CONFIG.FIGHT_CLEAN_SPAR_INTIMACY_GAIN;
    tensionDelta = EMOTION_CONFIG.FIGHT_CLEAN_SPAR_TENSION_DELTA;
  }
  if (gameState && typeof gameState.addIntimacy === 'function') {
    gameState.addIntimacy(heroA.id, heroB.id, intimacyDelta);
  }
  if (gameState && typeof gameState.addTension === 'function') {
    gameState.addTension(heroA.id, heroB.id, tensionDelta);
  }

  // 6. Skill XP, hero EXP and Pain Tolerance.
  const baseXpPerExchange = session.isSanctioned
    ? TRAINING_CONFIG.SPAR_SKILL_XP_PER_EXCHANGE
    : TRAINING_CONFIG.UNSANCTIONED_FIGHT_XP_PER_EXCHANGE;
  const baseExpPerExchange = session.isSanctioned
    ? TRAINING_CONFIG.SPAR_HERO_EXP_PER_EXCHANGE
    : TRAINING_CONFIG.UNSANCTIONED_FIGHT_HERO_EXP_PER_EXCHANGE;
  const lowHpBonusA =
    ratioA <= TRAINING_CONFIG.SPAR_LOW_HP_THRESHOLD || session.lowHpTargetHero === heroA ? 1 : 0;
  const lowHpBonusB =
    ratioB <= TRAINING_CONFIG.SPAR_LOW_HP_THRESHOLD || session.lowHpTargetHero === heroB ? 1 : 0;

  const multA =
    (session.fledHeroId === heroA.id ? TRAINING_CONFIG.FIGHT_FLEE_XP_MULT : 1.0) *
    (lowHpBonusA ? TRAINING_CONFIG.SPAR_LOW_HP_XP_BONUS_MULT : 1.0);
  const multB =
    (session.fledHeroId === heroB.id ? TRAINING_CONFIG.FIGHT_FLEE_XP_MULT : 1.0) *
    (lowHpBonusB ? TRAINING_CONFIG.SPAR_LOW_HP_XP_BONUS_MULT : 1.0);

  const skillXpA = Math.max(1, Math.round(session.exchanges * baseXpPerExchange * multA));
  const skillXpB = Math.max(1, Math.round(session.exchanges * baseXpPerExchange * multB));
  const heroExpA = Math.max(1, Math.round(session.exchanges * baseExpPerExchange * multA));
  const heroExpB = Math.max(1, Math.round(session.exchanges * baseExpPerExchange * multB));

  // pickPrimarySkillForHero returns a skill ID string.
  const skillA = pickPrimarySkillForHero(heroA);
  const skillB = pickPrimarySkillForHero(heroB);
  if (skillA) addSkillExp(heroA, skillA, skillXpA);
  if (skillB) addSkillExp(heroB, skillB, skillXpB);
  if (gameState && typeof gameState.addExp === 'function') {
    if (heroA.id) gameState.addExp(heroA.id, heroExpA);
    if (heroB.id) gameState.addExp(heroB.id, heroExpB);
  }

  // Report the level-ups and newly learned skills this bout granted.
  const pushProgression = (hero, prog) => {
    if (prog.leveledUp) {
      reportEvents.push({
        day,
        heroId: hero.id,
        heroName: hero.name,
        type: 'level_up',
        importance: EMOTION_CONFIG.REPORT_IMPORTANCE.level_up,
        text: `${hero.name} reached level ${prog.newLevel}.`,
        details: { level: prog.newLevel },
      });
    }
    for (const skill of prog.newSkills) {
      reportEvents.push({
        day,
        heroId: hero.id,
        heroName: hero.name,
        type: 'new_skill',
        importance: EMOTION_CONFIG.REPORT_IMPORTANCE.new_skill,
        text: `${hero.name} learned ${skill.name}.`,
        details: { skillId: skill.id },
      });
    }
  };
  pushProgression(heroA, diffProgression(heroA, progressionBeforeA));
  pushProgression(heroB, diffProgression(heroB, progressionBeforeB));

  const painToleranceA = checkAndUnlockPainTolerance(heroA);
  const painToleranceB = checkAndUnlockPainTolerance(heroB);

  heroA.fatigue = clamp100((heroA.fatigue ?? 0) + EMOTION_CONFIG.FIGHT_FATIGUE_GAIN);
  heroB.fatigue = clamp100((heroB.fatigue ?? 0) + EMOTION_CONFIG.FIGHT_FATIGUE_GAIN);
  heroA.currentActivity = 'rest';
  heroB.currentActivity = 'rest';

  // 7. Report events
  if (!session.isSanctioned) {
    const startTemplate =
      session.triggerReason === 'fear_hunger'
        ? ISELLE_FIGHT_EVENT_TEXT.fought_hero_fear_hunger
        : ISELLE_FIGHT_EVENT_TEXT.fought_hero_anger;
    reportEvents.push({
      day,
      heroId: heroA.id,
      heroName: heroA.name,
      type: 'fought_hero',
      importance: EMOTION_CONFIG.REPORT_IMPORTANCE.fought_hero,
      text: formatTemplate(startTemplate, { heroA: heroA.name, heroB: heroB.name }),
      details: {
        opponentId: heroB.id,
        opponentName: heroB.name,
        triggerReason: session.triggerReason,
      },
    });
  }

  reportEvents.push({
    day,
    heroId: heroA.id,
    heroName: heroA.name,
    type: 'fight_ended',
    importance: EMOTION_CONFIG.REPORT_IMPORTANCE.fight_ended,
    text: formatTemplate(ISELLE_FIGHT_EVENT_TEXT.fight_ended, {
      heroA: heroA.name,
      heroB: heroB.name,
      exchanges: session.exchanges,
      reason: session.stopReason || 'completed',
    }),
    details: {
      opponentId: heroB.id,
      opponentName: heroB.name,
      exchanges: session.exchanges,
      totalDamage: session.totalDamage,
      stoppedBy: session.stoppedBy,
      stopReason: session.stopReason,
    },
  });

  if (winnerHero && loserHero) {
    reportEvents.push({
      day,
      heroId: winnerHero.id,
      heroName: winnerHero.name,
      type: 'fight_won',
      importance: EMOTION_CONFIG.REPORT_IMPORTANCE.fight_won,
      text: formatTemplate(ISELLE_FIGHT_EVENT_TEXT.fight_won, {
        winner: winnerHero.name,
        loser: loserHero.name,
      }),
      details: { opponentId: loserHero.id, opponentName: loserHero.name },
    });
    reportEvents.push({
      day,
      heroId: loserHero.id,
      heroName: loserHero.name,
      type: 'fight_lost',
      importance: EMOTION_CONFIG.REPORT_IMPORTANCE.fight_lost,
      text: formatTemplate(ISELLE_FIGHT_EVENT_TEXT.fight_lost, {
        winner: winnerHero.name,
        loser: loserHero.name,
      }),
      details: { opponentId: winnerHero.id, opponentName: winnerHero.name },
    });
  }

  if (session.lawBroken) {
    const offender = session.offenderHero || heroA;
    reportEvents.push({
      day,
      heroId: offender.id,
      heroName: offender.name,
      type: 'law_broken',
      importance: EMOTION_CONFIG.REPORT_IMPORTANCE.law_broken,
      text: formatTemplate(ISELLE_FIGHT_EVENT_TEXT.law_broken, {
        offender: offender.name,
        law: session.lawBroken,
      }),
      details: {
        law: session.lawBroken,
        motivationPenalty: EMOTION_CONFIG.LAW_BREAK_MOTIVATION_PENALTY,
      },
    });
  } else {
    reportEvents.push({
      day,
      heroId: heroA.id,
      heroName: heroA.name,
      type: 'sanctioned_bout',
      importance: EMOTION_CONFIG.REPORT_IMPORTANCE.sanctioned_bout,
      text: formatTemplate(ISELLE_FIGHT_EVENT_TEXT.sanctioned_bout, {
        heroA: heroA.name,
        heroB: heroB.name,
      }),
      details: { opponentId: heroB.id, opponentName: heroB.name },
    });
  }

  if (session.stoppedBy === 'iselle') {
    const reasonKey = session.stopReason || 'unsanctioned_fight';
    const template =
      ISELLE_INTERVENTION_REPORT_TEXT[reasonKey] ||
      ISELLE_INTERVENTION_REPORT_TEXT.unsanctioned_fight;
    const offender = session.offenderHero || heroA;
    const target = offender === heroA ? heroB : heroA;
    reportEvents.push({
      day,
      heroId: heroA.id,
      heroName: heroA.name,
      type: 'iselle_intervened',
      importance: EMOTION_CONFIG.REPORT_IMPORTANCE.iselle_intervened,
      text: formatTemplate(template, {
        heroA: heroA.name,
        heroB: heroB.name,
        offender: offender.name,
        target: target.name,
        zone: session.criticalZoneHit || session.lastHitZone || 'torso',
      }),
      details: { opponentId: heroB.id, opponentName: heroB.name, reason: reasonKey },
    });
  }

  session.consequenceSummary = {
    occurred: true,
    heroAId: heroA.id,
    heroBId: heroB.id,
    opponentId: heroB.id,
    winnerId: winnerHero ? winnerHero.id : null,
    loserId: loserHero ? loserHero.id : null,
    fledHeroId: session.fledHeroId,
    exchanges: session.exchanges,
    elapsedSec: session.elapsed,
    totalDamage: session.totalDamage,
    hitZone: session.criticalZoneHit || session.lastHitZone,
    stoppedBy: session.stoppedBy,
    stopReason: session.stopReason,
    lawBroken: session.lawBroken,
    triggerReason: session.triggerReason,
    intimacyDelta,
    tensionDelta,
    skillXpA,
    skillXpB,
    heroExpA,
    heroExpB,
    skillA: skillA || null,
    skillB: skillB || null,
    lowHpBonusA,
    lowHpBonusB,
    painToleranceA,
    painToleranceB,
    injuries,
    hpA: fighterA.hp,
    hpB: fighterB.hp,
    maxHpA: fighterA.maxHp,
    maxHpB: fighterB.maxHp,
    actionHistoryA: session.actionHistoryA,
    actionHistoryB: session.actionHistoryB,
    reportEvents,
  };
  return session.consequenceSummary;
}

/**
 * Resolves an emotion-driven fight in the town (never in the ring).
 */
export function resolveEmotionFight(heroA, heroB, gameState, options = {}) {
  const rng = options.rng || Math.random;
  if (!heroA || !heroB) return null;

  heroA.currentActivity = 'fighting';
  heroB.currentActivity = 'fighting';

  const session = createFightSession(heroA, heroB, {
    isSanctioned: false,
    triggerReason: options.triggerReason || 'anger_rival',
  });

  const maxExchanges =
    Math.ceil(
      EMOTION_CONFIG.ISELLE_MAX_FIGHT_DURATION_SEC /
        EMOTION_CONFIG.FIGHT_AI_DECISION_INTERVAL_SEC
    ) + 2;

  for (let i = 0; i < maxExchanges; i++) {
    session.elapsed = Number(
      (session.elapsed + EMOTION_CONFIG.FIGHT_AI_DECISION_INTERVAL_SEC).toFixed(3)
    );
    stepFightExchange(session, rng);
    const check = evaluateFightIntervention(session, gameState, {
      leader: options.leader || null,
      leaderDistance: options.leaderDistance ?? 999,
    });
    if (check.shouldStop) break;
  }

  return applyFightConsequences(session, gameState);
}

/**
 * Resolves a sanctioned spar inside the ring.
 */
export function resolveSparringSession(heroA, heroB, gameState, options = {}) {
  const rng = options.rng || Math.random;
  if (!heroA || !heroB) return null;

  const session = createFightSession(heroA, heroB, {
    isSanctioned: true,
    triggerReason: 'spar',
  });

  for (let i = 0; i < TRAINING_CONFIG.SPAR_EXCHANGES; i++) {
    session.elapsed = Number(
      (session.elapsed + EMOTION_CONFIG.FIGHT_AI_DECISION_INTERVAL_SEC).toFixed(3)
    );
    stepFightExchange(session, rng);
    const check = evaluateFightIntervention(session, gameState, {
      leader: options.leader || null,
      leaderDistance: options.leaderDistance ?? 0,
    });
    if (check.shouldStop) break;
  }

  return applyFightConsequences(session, gameState);
}

/**
 * Checks whether a hero is driven to start a fight, and against whom.
 *
 * Condition A: anger at or above FIGHT_ANGER_THRESHOLD against a rival with
 * high tension or low intimacy.
 * Condition B: fear AND hunger both high.
 *
 * Returns {triggered, reason, opponent}.
 */
export function checkHeroFightTrigger(gameState, hero, excludedHeroIds = new Set()) {
  if (!gameState || !hero || hero.alive === false || excludedHeroIds.has(hero.id)) {
    return { triggered: false, reason: null, opponent: null };
  }

  const available = (gameState.heroes || []).filter(
    (h) => h && h.alive !== false && h.id !== hero.id && !excludedHeroIds.has(h.id)
  );
  if (available.length === 0) {
    return { triggered: false, reason: null, opponent: null };
  }

  // Condition A: anger against a rival.
  if ((hero.anger ?? 0) >= EMOTION_CONFIG.FIGHT_ANGER_THRESHOLD) {
    const rivals = available.filter((o) => {
      const tension = gameState.getTension(hero.id, o.id);
      const relation = gameState.getRelation(hero.id, o.id);
      return (
        tension >= EMOTION_CONFIG.FIGHT_TENSION_THRESHOLD ||
        relation < EMOTION_CONFIG.FIGHT_LOW_RELATION_THRESHOLD
      );
    });
    if (rivals.length > 0) {
      rivals.sort((a, b) => {
        const scoreA =
          gameState.getTension(hero.id, a.id) * 2 - gameState.getRelation(hero.id, a.id);
        const scoreB =
          gameState.getTension(hero.id, b.id) * 2 - gameState.getRelation(hero.id, b.id);
        return scoreB - scoreA || String(a.id).localeCompare(String(b.id));
      });
      return { triggered: true, reason: 'anger_rival', opponent: rivals[0] };
    }
  }

  // Condition B: fear AND hunger.
  if (
    (hero.fear ?? 0) >= EMOTION_CONFIG.FIGHT_FEAR_THRESHOLD &&
    (hero.hunger ?? 0) >= EMOTION_CONFIG.FIGHT_HUNGER_THRESHOLD
  ) {
    const targets = [...available].sort((a, b) => {
      const scoreA = gameState.getTension(hero.id, a.id) - gameState.getRelation(hero.id, a.id);
      const scoreB = gameState.getTension(hero.id, b.id) - gameState.getRelation(hero.id, b.id);
      return scoreB - scoreA || String(a.id).localeCompare(String(b.id));
    });
    return { triggered: true, reason: 'fear_hunger', opponent: targets[0] };
  }

  return { triggered: false, reason: null, opponent: null };
}

/**
 * Pairs the heroes that want to fight.
 *
 * A hero can only fight once per day, two heroes can never pick each other
 * simultaneously, and the number of town fights per day is capped.
 *
 * Returns the pairs WITHOUT resolving them, so the live 3D town can play the
 * fight out and the offline simulation can resolve it numerically.
 */
export function pairDailyFights(gameState, aliveHeroes) {
  const pairs = [];
  const foughtHeroIdsToday = new Set();

  const candidates = [...(aliveHeroes || [])]
    .filter((h) => h && h.alive !== false)
    .sort((a, b) => {
      const scoreA = (a.anger ?? 0) + (a.fear ?? 0) * 0.5 + (a.hunger ?? 0) * 0.5;
      const scoreB = (b.anger ?? 0) + (b.fear ?? 0) * 0.5 + (b.hunger ?? 0) * 0.5;
      return scoreB - scoreA || String(a.id).localeCompare(String(b.id));
    });

  for (const hero of candidates) {
    if (pairs.length >= EMOTION_CONFIG.MAX_TOWN_FIGHTS_PER_DAY) break;
    if (foughtHeroIdsToday.has(hero.id)) continue;

    // Does this hero want to fight at all?
    const rawCheck = checkHeroFightTrigger(gameState, hero, new Set());
    if (!rawCheck.triggered) continue;

    // Is there still a partner left for them?
    const trigger = checkHeroFightTrigger(gameState, hero, foughtHeroIdsToday);
    if (!trigger.triggered || !trigger.opponent) {
      hero.anger = Math.min(
        100,
        Math.round((hero.anger ?? 0) + EMOTION_CONFIG.FIGHT_NO_PARTNER_ANGER_GAIN)
      );
      continue;
    }

    foughtHeroIdsToday.add(hero.id);
    foughtHeroIdsToday.add(trigger.opponent.id);
    pairs.push({ heroA: hero, heroB: trigger.opponent, triggerReason: trigger.reason });
  }

  return pairs;
}

/**
 * Pairs the heroes that want to fight and resolves those fights headlessly.
 * Used by the offline login simulation.
 */
export function pairAndResolveDailyFights(gameState, aliveHeroes, rng = Math.random) {
  const fights = [];
  for (const pair of pairDailyFights(gameState, aliveHeroes)) {
    const fightResult = resolveEmotionFight(pair.heroA, pair.heroB, gameState, {
      rng,
      triggerReason: pair.triggerReason,
      leaderDistance: 999,
    });
    if (fightResult && fightResult.occurred) {
      fights.push(fightResult);
    }
  }
  return fights;
}

/**
 * Resolves a single emotion-driven fight for one hero.
 * Kept for callers that want one fight without the daily pairing pass.
 */
export function evaluateTensionFight(gameState, hero, rng = Math.random, excludedHeroIds = new Set()) {
  const none = {
    occurred: false,
    opponentId: null,
    stoppedBy: null,
    lawBroken: null,
    reportEvents: [],
  };
  const trigger = checkHeroFightTrigger(gameState, hero, excludedHeroIds);
  if (!trigger.triggered || !trigger.opponent) return none;
  return resolveEmotionFight(hero, trigger.opponent, gameState, {
    rng,
    triggerReason: trigger.reason,
    leaderDistance: 999,
  });
}

/**
 * The ONE live training XP path.
 *
 * Both the manual Training Window avatar and the autonomous NPC training
 * branch call this, so a hero can never earn the same tick twice. A manual
 * training slot pins the skill that is trained.
 */
const _lastTrainingXpTick = new WeakMap();

export function awardLiveTrainingTickXp(hero, zone, skillId, gameState, nowMs = Date.now()) {
  if (!hero || hero.alive === false) {
    return { awarded: false, reason: 'invalid_hero', xpGained: 0, skillId: null };
  }

  const cooldownMs = TRAINING_CONFIG.LIVE_TRAINING_TICK_INTERVAL_SEC * 1000;
  const last = _lastTrainingXpTick.get(hero);
  if (typeof last === 'number' && nowMs - last < cooldownMs) {
    return { awarded: false, reason: 'cooldown', xpGained: 0, skillId: skillId || null };
  }
  _lastTrainingXpTick.set(hero, nowMs);

  // A manual training slot pins the skill being trained.
  const pinnedSlot = (gameState && gameState.trainingSlots
    ? gameState.trainingSlots.find((s) => s && s.heroId === hero.id)
    : null);
  const resolvedSkillId = (pinnedSlot && pinnedSlot.skillId) || skillId || pickPrimarySkillForHero(hero);
  if (!resolvedSkillId) {
    return { awarded: false, reason: 'no_skill', xpGained: 0, skillId: null };
  }

  const perHitTable = TRAINING_CONFIG.LIVE_ACTION_XP_PER_HIT || {};
  const perHit = perHitTable[zone] !== undefined ? perHitTable[zone] : perHitTable.dummy || 6;
  const tgLevel = Math.max(
    1,
    gameState && gameState.facilities && gameState.facilities.training
      ? gameState.facilities.training.level || 1
      : 1
  );
  const facilityMult =
    1 + (tgLevel - 1) * TRAINING_CONFIG.FACILITY_XP_BONUS_PER_LEVEL;
  const traits = Array.isArray(hero.traits) ? hero.traits : [];
  const diligentMult = traits.includes('diligent') ? TRAINING_CONFIG.DILIGENT_XP_MULT : 1.0;

  const xpGained = Math.max(
    1,
    Math.round(
      perHit *
        TRAINING_CONFIG.LIVE_TRAINING_HITS_PER_TICK *
        facilityMult *
        diligentMult
    )
  );

  const beforeLevels = captureSkillLevels(hero);
  addSkillExp(hero, resolvedSkillId, xpGained, { notify: false });
  const afterLevels = captureSkillLevels(hero);
  const sid = normalizeId(resolvedSkillId);
  const before = beforeLevels[sid] || 0;
  const after = afterLevels[sid] || 0;
  if (after > before) {
    const skill = (hero.skills || []).find((s) => normalizeId(typeof s === 'string' ? s : (s.id || s.name)) === sid);
    const skillName = skill && typeof skill === 'object'
      ? (skill.name || getSkill(sid)?.name || resolvedSkillId)
      : (getSkill(sid)?.name || resolvedSkillId);
    showSystemMessage(`'${String(skillName).toUpperCase()}' HAS LEVELED UP TO LV${after}!`);
  }
  if (pinnedSlot) {
    pinnedSlot.expGained = (pinnedSlot.expGained || 0) + xpGained;
  }
  hero.fatigue = Math.max(
    0,
    Math.min(
      100,
      Math.round((hero.fatigue || 0) + TRAINING_CONFIG.LIVE_TRAINING_FATIGUE_PER_TICK)
    )
  );

  return { awarded: true, reason: 'ok', xpGained, skillId: resolvedSkillId };
}


/** Captures a snapshot of the hero's skill levels. */
function captureSkillLevels(hero) {
  const snapshot = {};
  for (const s of (hero && hero.skills) || []) {
    const id = normalizeId(typeof s === 'string' ? s : (s.id || s.name));
    snapshot[id] = typeof s === 'object' ? (s.level || 1) : 1;
  }
  return snapshot;
}
