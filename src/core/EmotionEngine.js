// src/core/EmotionEngine.js
// Pure, headless emotion mutation functions.
//
// Nothing in this file touches Three.js, the DOM or localStorage directly, so
// the exact same code runs during live play and during the offline login
// simulation.

import { EMOTION_CONFIG } from '../data/emotions.config.js';
import { addHeroAnger, addHeroHunger } from '../data/heroes.js';

function clamp100(value) {
  return Math.max(0, Math.min(100, Math.round(value || 0)));
}

/**
 * True when the hero carries one of the given personality traits.
 * `traits` may be a single trait id or a list of them.
 */
export function hasTrait(hero, traits) {
  const list = Array.isArray(traits) ? traits : [traits];
  if (list.length === 0) return false;
  const own = (hero && hero.traits) || [];
  return list.some((t) => own.includes(t));
}

/**
 * The product of the per-trait multipliers of a config table, e.g. the
 * hunger gain. Traits that are not listed in the table contribute 1.
 */
function getTraitTableMult(hero, table) {
  let mult = 1;
  for (const t of (hero && hero.traits) || []) {
    const m = table[t];
    if (m) mult *= m;
  }
  return mult;
}

/**
 * Collects the personality trait modifiers of a hero.
 * Multipliers multiply, bonuses add.
 */
export function getTraitModifiers(hero) {
  const mult = {
    fearGainMult: 1,
    angerGainMult: 1,
    trainWeight: 1,
    idleWeight: 1,
    sparWeight: 1,
    restWeight: 1,
  };
  let refuseOrderBonus = 0;
  for (const t of (hero && hero.traits) || []) {
    const m = EMOTION_CONFIG.TRAIT_MODIFIERS[t];
    if (!m) continue;
    if (m.fearGainMult) mult.fearGainMult *= m.fearGainMult;
    if (m.angerGainMult) mult.angerGainMult *= m.angerGainMult;
    if (m.trainWeight) mult.trainWeight *= m.trainWeight;
    if (m.idleWeight) mult.idleWeight *= m.idleWeight;
    if (m.sparWeight) mult.sparWeight *= m.sparWeight;
    if (m.restWeight) mult.restWeight *= m.restWeight;
    if (m.refuseOrderBonus) refuseOrderBonus += m.refuseOrderBonus;
  }
  mult.refuseOrderBonus = refuseOrderBonus;
  return mult;
}

/**
 * A hero panics when their Mentality collapses while Fear is high.
 * While panicking the hero refuses risky training and refuses to spar.
 */
function hasSkill(hero, skillId) {
  const key = String(skillId || '').toLowerCase().replace(/\s+/g, '_');
  return (hero && Array.isArray(hero.skills))
    ? hero.skills.some((s) => String(typeof s === 'string' ? s : (s.id || s.name || '')).toLowerCase().replace(/\s+/g, '_') === key)
    : false;
}

function composureSkillLevel(hero) {
  if (!hero || !Array.isArray(hero.skills)) return 0;
  const s = hero.skills.find((sk) => String(typeof sk === 'string' ? sk : (sk.id || sk.name || '')).toLowerCase().replace(/\s+/g, '_') === 'composure');
  return s ? (typeof s === 'object' ? (s.level || 1) : 1) : 0;
}

export function isHeroPanicking(hero) {
  if (!hero) return false;
  const mentality = hero.mentality ?? 0;
  const fear = hero.fear ?? 0;
  let panicFearThreshold = EMOTION_CONFIG.PANIC_FEAR_THRESHOLD;
  let panicMentalityThreshold = EMOTION_CONFIG.PANIC_MENTALITY_THRESHOLD;
  const lvl = composureSkillLevel(hero);
  if (lvl > 0) {
    panicFearThreshold += lvl * 4;
    panicMentalityThreshold = Math.max(0, panicMentalityThreshold - lvl * 2);
  }
  return (
    mentality < panicMentalityThreshold &&
    fear > panicFearThreshold
  );
}

/**
 * Applies raw fear gain, scaled by (1 - Mentality/100) and the hero's traits.
 * Returns the actual delta applied.
 */
export function applyFearGain(hero, rawFearAmount) {
  if (!hero || !rawFearAmount) return 0;
  const lvl = composureSkillLevel(hero);
  if (lvl >= 5) return 0; // immunity at higher composure levels
  let amount = rawFearAmount;
  if (lvl > 0) amount *= 0.5; // significantly reduce fear gain
  const mentality = hero.mentality ?? 50;
  const mods = getTraitModifiers(hero);
  const effective = amount * (1 - mentality / 100) * mods.fearGainMult;
  const prev = hero.fear ?? 0;
  hero.fear = clamp100(prev + effective);
  return hero.fear - prev;
}

/**
 * The daily passive emotion tick: hunger rises, a hungry hero loses motivation
 * and gains anger, and injuries tick down.
 */
export function applyDailyEmotionTick(hero, foodQuality = 'basic') {
  if (!hero) return null;
  const mods = getTraitModifiers(hero);
  const result = { hungerGain: 0, motivationDelta: 0, angerGain: 0, injuryTicked: false };

  // A `food_complainer` gets hungry faster (the manhua's potato grumble).
  const hungerGainMult = getTraitTableMult(hero, EMOTION_CONFIG.TRAIT_HUNGER_GAIN_MULT);
  result.hungerGain = addHeroHunger(hero, EMOTION_CONFIG.DAILY_HUNGER_GAIN * hungerGainMult);

  if ((hero.hunger ?? 0) >= EMOTION_CONFIG.HIGH_HUNGER_THRESHOLD) {
    const before = hero.motivationScore ?? 0;
    hero.motivationScore = clamp100(before - EMOTION_CONFIG.HIGH_HUNGER_MOTIVATION_PENALTY);
    result.motivationDelta = hero.motivationScore - before;
    result.angerGain = addHeroAnger(
      hero,
      EMOTION_CONFIG.HIGH_HUNGER_ANGER_GAIN * mods.angerGainMult
    );
  }

  if (hero.injury && hero.injury.daysRemaining > 0) {
    hero.injury.daysRemaining -= 1;
    result.injuryTicked = true;
    if (hero.injury.daysRemaining <= 0) {
      hero.injury = null;
    }
  }

  return result;
}

/**
 * A hero eats at the Cafeteria: hunger drops, fear drops, motivation rises.
 */
export function applyEatOutcome(hero, foodQuality = 'basic') {
  if (!hero) return null;
  const baseReduction =
    EMOTION_CONFIG.EAT_HUNGER_REDUCTION[foodQuality] ?? EMOTION_CONFIG.EAT_HUNGER_REDUCTION.basic;

  // A `food_complainer` barely touches the meal, so it satisfies them less.
  const eatMult = getTraitTableMult(hero, EMOTION_CONFIG.TRAIT_EAT_REDUCTION_MULT);
  const reduction = baseReduction * eatMult;

  const hungerBefore = hero.hunger ?? 0;
  addHeroHunger(hero, -reduction);
  const hungerReduced = hungerBefore - (hero.hunger ?? 0);

  const fearBefore = hero.fear ?? 0;
  hero.fear = clamp100(fearBefore - EMOTION_CONFIG.EAT_FEAR_REDUCTION);
  const fearReduced = fearBefore - (hero.fear ?? 0);

  const motivationBefore = hero.motivationScore ?? 0;
  hero.motivationScore = clamp100(motivationBefore + EMOTION_CONFIG.EAT_MOTIVATION_GAIN);
  const motivationGained = (hero.motivationScore ?? 0) - motivationBefore;

  // The complaint itself: a `food_complainer` grumbles about the potatoes and
  // gets a little angrier about it.
  const complained = hasTrait(hero, EMOTION_CONFIG.FOOD_COMPLAINT_TRAITS);
  if (complained) {
    addHeroAnger(hero, EMOTION_CONFIG.FOOD_COMPLAINT_ANGER_GAIN);
  }

  return { hungerReduced, fearReduced, motivationGained, foodQuality, complained };
}

/**
 * A hero rests in the Dormitory: fatigue drops, fear drops, anger drops.
 */
export function applyRestOutcome(hero, facilityLevel = 1) {
  if (!hero) return null;
  const level = facilityLevel || 1;
  const fatigueReduction =
    EMOTION_CONFIG.REST_FATIGUE_REDUCTION *
    (1 + (level - 1) * EMOTION_CONFIG.REST_FACILITY_LEVEL_BONUS);

  const fatigueBefore = hero.fatigue ?? 0;
  hero.fatigue = Math.max(0, fatigueBefore - fatigueReduction);

  const fearBefore = hero.fear ?? 0;
  hero.fear = clamp100(fearBefore - EMOTION_CONFIG.REST_FEAR_REDUCTION);

  const angerBefore = hero.anger ?? 0;
  addHeroAnger(hero, -EMOTION_CONFIG.REST_ANGER_REDUCTION);

  return {
    fatigueReduced: fatigueBefore - (hero.fatigue ?? 0),
    fearReduced: fearBefore - (hero.fear ?? 0),
    angerReduced: angerBefore - (hero.anger ?? 0),
  };
}

/**
 * The Squad Leader may order ONE idle hero to train.
 * Success depends on the relationship value, the target's anger and traits.
 */
export function evaluateSquadLeaderOrder(gameState, leader, idleHeroes, rng = Math.random) {
  const empty = {
    ordered: false,
    targetId: null,
    accepted: false,
    trainingType: null,
    reportEvent: null,
  };
  if (!gameState || !leader || !Array.isArray(idleHeroes) || idleHeroes.length === 0) {
    return empty;
  }

  const candidates = idleHeroes.filter((h) => h && h.id !== leader.id && h.alive !== false);
  if (candidates.length === 0) return empty;

  const target = candidates[Math.floor(rng() * candidates.length)];
  if (!target) return empty;

  const mods = getTraitModifiers(target);
  const relation = gameState.getRelation(leader.id, target.id);
  const targetAnger = target.anger ?? 0;

  let success =
    EMOTION_CONFIG.LEADER_ORDER_BASE_SUCCESS +
    relation * EMOTION_CONFIG.LEADER_ORDER_RELATION_SCALE -
    targetAnger * EMOTION_CONFIG.LEADER_ORDER_ANGER_PENALTY;

  // A hot-headed hero with high anger is likely to refuse.
  // A coward or an exit seeker refuses the order even when calm.
  const refusesWhenCalm = hasTrait(target, EMOTION_CONFIG.LEADER_ORDER_REFUSING_TRAITS);
  if (
    mods.refuseOrderBonus > 0 &&
    (targetAnger >= EMOTION_CONFIG.LEADER_ORDER_REFUSE_ANGER_THRESHOLD || refusesWhenCalm)
  ) {
    success -= mods.refuseOrderBonus;
  }
  success = Math.max(0, Math.min(1, success));

  const accepted = rng() < success;
  const trainingType = pickTrainingTypeForHero(target, rng);

  const reportEvent = {
    day: gameState.dayCount,
    heroId: target.id,
    heroName: target.name,
    type: 'leader_ordered',
    importance: EMOTION_CONFIG.REPORT_IMPORTANCE.leader_ordered,
    text: accepted
      ? `${leader.name} ordered ${target.name} to train. He accepted.`
      : `${target.name} refused ${leader.name}'s order to train.`,
    details: {
      leaderId: leader.id,
      leaderName: leader.name,
      accepted,
      trainingType,
      relation,
    },
  };

  if (!accepted) {
    gameState.addTension(leader.id, target.id, EMOTION_CONFIG.LEADER_ORDER_REFUSE_TENSION_GAIN);
    addHeroAnger(target, EMOTION_CONFIG.LEADER_ORDER_REFUSE_ANGER_GAIN);
  }

  return { ordered: true, targetId: target.id, accepted, trainingType, reportEvent };
}

/**
 * Picks which training a hero would perform, weighted by class affinity.
 */
export function pickTrainingTypeForHero(hero, rng = Math.random) {
  const affinity =
    EMOTION_CONFIG.CLASS_TRAIN_AFFINITY[hero.class] || EMOTION_CONFIG.CLASS_TRAIN_AFFINITY.Novice;
  const options = [
    ['train_dummy', affinity.train_dummy],
    ['train_archery', affinity.train_archery],
    ['train_magic', affinity.train_magic],
  ];
  const total = options.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return 'train_dummy';
  let roll = rng() * total;
  for (const [type, weight] of options) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return options[0][0];
}
