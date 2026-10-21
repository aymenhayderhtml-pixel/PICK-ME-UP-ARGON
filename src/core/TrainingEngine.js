// src/core/TrainingEngine.js
// Pure, headless training session resolver.
//
// Handles: skill XP from real actions, session outcomes, skill combining,
// Pain Tolerance, hit zones and sparring resolution.

import { TRAINING_CONFIG } from '../data/training.config.js';
import { EMOTION_CONFIG } from '../data/emotions.config.js';
import { SKILL_RECIPES } from '../data/skillRecipes.config.js';
import { getSkill, addSkillExp } from '../data/skills.js';
import { getWeightedStatsForClass, addHeroAnger } from '../data/heroes.js';
import { getCombatStats } from './Stats.js';
import { applyFearGain } from './EmotionEngine.js';

const normalizeId = (v) => String(v || '').toLowerCase().replace(/\s+/g, '_');

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

/** True when the hero already knows a skill (or one of its aliases). */
export function heroKnowsSkill(hero, skillId) {
  if (findHeroSkill(hero, skillId)) return true;
  const aliases = TRAINING_CONFIG.SKILL_ALIASES[skillId] || [];
  for (const alias of aliases) {
    if (findHeroSkill(hero, alias)) return true;
  }
  return false;
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
  addSkillExp(hero, primary, skillXp);
  if (secondary) {
    addSkillExp(hero, secondary, Math.round(skillXp * cfg.SECONDARY_SKILL_XP_RATIO));
  }

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
 * Simulates a live spar between two heroes.
 *
 * Returns a SparringSessionResult:
 * {
 *   heroAId, heroBId, exchanges, elapsedSec, totalDamage, hitZone,
 *   stoppedBy: 'leader' | 'iselle' | null, stopReason, lawBroken,
 *   skillXpA, skillXpB, heroExpA, heroExpB, lowHpBonusA, lowHpBonusB,
 *   painToleranceA, painToleranceB, injuries: []
 * }
 */
export function resolveSparringSession(heroA, heroB, gameState, options = {}) {
  const { rng = Math.random, isellePresent = true, leader = null } = options;
  if (!heroA || !heroB) return null;

  const cfg = TRAINING_CONFIG;
  const statsA = getCombatStats(heroA, gameState ? gameState.party : null, gameState ? gameState.relations : null);
  const statsB = getCombatStats(heroB, gameState ? gameState.party : null, gameState ? gameState.relations : null);

  let hpA = statsA.maxHp;
  let hpB = statsB.maxHp;
  let totalDamage = 0;
  let elapsed = 0;
  let hitZone = 'torso';
  let stoppedBy = null;
  let stopReason = null;
  let lawBroken = null;
  const injuries = [];

  const powerA = statsA.maxHp + statsA.damage * 5 + statsA.defense * 4;
  const powerB = statsB.maxHp + statsB.damage * 5 + statsB.defense * 4;

  const exchanges = cfg.SPAR_EXCHANGES;
  for (let i = 0; i < exchanges && !stoppedBy; i++) {
    elapsed += 3;

    // Hero A strikes Hero B.
    {
      const zone = rollHitZone('melee', rng);
      hitZone = zone;
      const raw = statsA.damage * cfg.HIT_ZONE_DAMAGE_MULT[zone] * cfg.SPAR_DAMAGE_PER_EXCHANGE_MULT;
      const dealt = Math.max(1, Math.round(raw * (1 - statsB.defense)));
      hpB -= dealt;
      totalDamage += dealt;

      if (hpB <= 0) { stoppedBy = 'iselle'; stopReason = 'lethal_blow'; lawBroken = EMOTION_CONFIG.LOBBY_LAWS.NO_LETHAL_SPAR_BLOWS; break; }
      if (cfg.CRITICAL_ZONES.includes(zone)) {
        stoppedBy = 'iselle';
        stopReason = 'critical_zone';
        lawBroken = EMOTION_CONFIG.LOBBY_LAWS.NO_LETHAL_SPAR_BLOWS;
        injuries.push({ heroId: heroB.id, zone, severity: 'serious' });
        break;
      }
      if (hpB / statsB.maxHp < EMOTION_CONFIG.ISELLE_INTERVENE_HP_RATIO) {
        stoppedBy = 'iselle';
        stopReason = 'low_hp';
        lawBroken = EMOTION_CONFIG.LOBBY_LAWS.NO_ATTACK_LOW_HP;
        break;
      }
    }

    // Hero B strikes Hero A.
    {
      const zone = rollHitZone('melee', rng);
      hitZone = zone;
      const raw = statsB.damage * cfg.HIT_ZONE_DAMAGE_MULT[zone] * cfg.SPAR_DAMAGE_PER_EXCHANGE_MULT;
      const dealt = Math.max(1, Math.round(raw * (1 - statsA.defense)));
      hpA -= dealt;
      totalDamage += dealt;

      if (hpA <= 0) { stoppedBy = 'iselle'; stopReason = 'lethal_blow'; lawBroken = EMOTION_CONFIG.LOBBY_LAWS.NO_LETHAL_SPAR_BLOWS; break; }
      if (cfg.CRITICAL_ZONES.includes(zone)) {
        stoppedBy = 'iselle';
        stopReason = 'critical_zone';
        lawBroken = EMOTION_CONFIG.LOBBY_LAWS.NO_LETHAL_SPAR_BLOWS;
        injuries.push({ heroId: heroA.id, zone, severity: 'serious' });
        break;
      }
      if (hpA / statsA.maxHp < EMOTION_CONFIG.ISELLE_INTERVENE_HP_RATIO) {
        stoppedBy = 'iselle';
        stopReason = 'low_hp';
        lawBroken = EMOTION_CONFIG.LOBBY_LAWS.NO_ATTACK_LOW_HP;
        break;
      }
    }

    // The Squad Leader breaks it up before Iselle when he is nearby and
    // stronger than both fighters.
    if (!stoppedBy && leader && leader.alive !== false) {
      const leaderStats = getCombatStats(leader, gameState ? gameState.party : null, gameState ? gameState.relations : null);
      const leaderPower = leaderStats.maxHp + leaderStats.damage * 5 + leaderStats.defense * 4;
      if (leaderPower > Math.max(powerA, powerB) * EMOTION_CONFIG.LEADER_INTERVENE_POWER_RATIO) {
        stoppedBy = 'leader';
        stopReason = 'squad_leader';
      }
    }

    if (!stoppedBy && elapsed > EMOTION_CONFIG.ISELLE_MAX_FIGHT_DURATION_SEC) {
      stoppedBy = 'iselle';
      stopReason = 'duration';
    }
    if (!stoppedBy && totalDamage > EMOTION_CONFIG.ISELLE_MAX_FIGHT_TOTAL_DAMAGE) {
      stoppedBy = 'iselle';
      stopReason = 'total_damage';
    }
  }

  const hpRatioA = Math.max(0, hpA) / Math.max(1, statsA.maxHp);
  const hpRatioB = Math.max(0, hpB) / Math.max(1, statsB.maxHp);
  const lowHpBonusA = hpRatioA < cfg.SPAR_LOW_HP_THRESHOLD ? 1 : 0;
  const lowHpBonusB = hpRatioB < cfg.SPAR_LOW_HP_THRESHOLD ? 1 : 0;

  // Sparring gives the most XP.
  const baseXp = cfg.BASE_SESSION_SKILL_XP.spar;
  const baseExp = cfg.BASE_SESSION_HERO_EXP.spar;
  const lowHpMult = cfg.SPAR_LOW_HP_XP_BONUS_MULT;

  const skillXpA = Math.round(baseXp * (lowHpBonusA ? lowHpMult : 1));
  const skillXpB = Math.round(baseXp * (lowHpBonusB ? lowHpMult : 1));
  const heroExpA = Math.round(baseExp * (lowHpBonusA ? lowHpMult : 1));
  const heroExpB = Math.round(baseExp * (lowHpBonusB ? lowHpMult : 1));

  // The winner gains the most, the loser fears and angers.
  const aWon = hpA >= hpB;
  const loser = aWon ? heroB : heroA;
  applyFearGain(loser, EMOTION_CONFIG.FEAR_GAIN_LOSS);
  addHeroAnger(loser, EMOTION_CONFIG.ANGER_GAIN_LOSS);

  // Pain Tolerance counters: damage taken and damage healed at the ground.
  const dmgTakenA = Math.max(0, statsA.maxHp - Math.max(0, hpA));
  const dmgTakenB = Math.max(0, statsB.maxHp - Math.max(0, hpB));
  const painToleranceA = recordTrainingDamageAndHeal(heroA, dmgTakenA, dmgTakenA) || null;
  const painToleranceB = recordTrainingDamageAndHeal(heroB, dmgTakenB, dmgTakenB) || null;

  // Iselle separates them: heals, calms, and reprimands a broken law.
  if (stoppedBy === 'iselle' && isellePresent) {
    const safeHpA = Math.round(statsA.maxHp * EMOTION_CONFIG.ISELLE_SAFE_HEAL_HP_RATIO);
    const safeHpB = Math.round(statsB.maxHp * EMOTION_CONFIG.ISELLE_SAFE_HEAL_HP_RATIO);
    hpA = Math.max(hpA, safeHpA);
    hpB = Math.max(hpB, safeHpB);
    addHeroAnger(heroA, -EMOTION_CONFIG.ISELLE_ANGER_REDUCTION);
    addHeroAnger(heroB, -EMOTION_CONFIG.ISELLE_ANGER_REDUCTION);
    applyFearGain(heroA, EMOTION_CONFIG.ISELLE_FEAR_GAIN);
    applyFearGain(heroB, EMOTION_CONFIG.ISELLE_FEAR_GAIN);
    if (lawBroken) {
      const offender = stopReason === 'low_hp' ? loser : heroA;
      offender.motivationScore = Math.max(
        0,
        Math.min(100, (offender.motivationScore ?? 50) - EMOTION_CONFIG.LAW_BREAK_MOTIVATION_PENALTY)
      );
    }
  }

  // Serious injuries do not fast-heal.
  for (const inj of injuries) {
    const target = inj.heroId === heroA.id ? heroA : heroB;
    target.injury = {
      zone: inj.zone,
      severity: 'serious',
      daysRemaining: cfg.CRITICAL_INJURY_DURATION_DAYS,
      healRateMult: cfg.CRITICAL_INJURY_HEAL_MULT,
    };
  }

  // Award the spar XP to the weapon skill each fighter actually uses.
  // NOTE: sparring does NOT grant co-training sessions. Co-training only comes
  // from practising two skills together at the same training zone.
  const skillA = pickPrimarySkillForHero(heroA);
  const skillB = pickPrimarySkillForHero(heroB);
  addSkillExp(heroA, skillA, skillXpA);
  addSkillExp(heroB, skillB, skillXpB);
  if (gameState && typeof gameState.addExp === 'function') {
    if (heroA.id) gameState.addExp(heroA.id, heroExpA);
    if (heroB.id) gameState.addExp(heroB.id, heroExpB);
  }

  return {
    heroAId: heroA.id,
    heroBId: heroB.id,
    exchanges,
    elapsedSec: elapsed,
    totalDamage,
    hitZone,
    stoppedBy,
    stopReason,
    lawBroken,
    skillXpA,
    skillXpB,
    heroExpA,
    heroExpB,
    skillA,
    skillB,
    lowHpBonusA,
    lowHpBonusB,
    painToleranceA,
    painToleranceB,
    injuries,
    hpA: Math.max(0, Math.round(hpA)),
    hpB: Math.max(0, Math.round(hpB)),
    maxHpA: statsA.maxHp,
    maxHpB: statsB.maxHp,
  };
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
