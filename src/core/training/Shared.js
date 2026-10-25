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
import { TRAINING_CONFIG } from '../../data/training.config.js';
import { EMOTION_CONFIG } from '../../data/emotions.config.js';
import { SKILL_RECIPES } from '../../data/skillRecipes.config.js';
import { getSkill, addSkillExp } from '../../data/skills.js';
import { getWeightedStatsForClass, addHeroAnger } from '../../data/heroes.js';
import { ISELLE_FIGHT_EVENT_TEXT, ISELLE_INTERVENTION_REPORT_TEXT } from '../../data/iselle.js';
import { getCombatStats } from '../Stats.js';
import { applyFearGain } from '../EmotionEngine.js';
import { chooseFightAction, chooseSwitchTarget, getFightStyleForHero } from '../FightAI.js';
import { Combatant } from '../../combat/Combatant.js';
import { COMBAT_STATES } from '../../combat/StateMachine.js';
import { DamageResolver } from '../../combat/DamageResolver.js';
import { showSystemMessage } from '../../ui/Notices.js';

const normalizeId = (v) => String(v || '').toLowerCase().replace(/\s+/g, '_');

/** Fills `{token}` placeholders in a report text template. */

export function formatTemplate(template, vars) {
  return String(template || '').replace(
    /\{(\w+)\}/g,
    (_, key) => (vars[key] !== undefined ? String(vars[key]) : '')
  );
}

/** Snapshots a hero's level and skill ids before a progression step. */

export function captureProgression(hero) {
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

export function diffProgression(hero, snapshot) {
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

