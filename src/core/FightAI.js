// src/core/FightAI.js
// Pure, headless combat decision engine.
//
// Decides WHAT a hero does next in a fight. It never touches Three.js, the
// DOM or localStorage, and it never computes damage: the combat engine does
// that. The AI only picks an action, the fight engine executes it.
//
// Every weight comes from src/data/emotions.config.js.

import { EMOTION_CONFIG } from '../data/emotions.config.js';
import { isHeroPanicking } from './EmotionEngine.js';

// The canonical action order. The random roll walks this list in order.
export const FIGHT_ACTIONS = Object.freeze([
  'attack',
  'defend',
  'retreat',
  'cast',
  'aim',
  'switch_target',
  'flee',
]);

const RANGED_STYLES = Object.freeze(['bow', 'staff']);

/**
 * The combat style of a hero, derived from the weapon they carry and their
 * class.
 *
 * Returns a FightStyle:
 * {
 *   id: 'sword' | 'spear' | 'dagger' | 'shield' | 'bow' | 'staff',
 *   preferredRange: number,
 *   tooCloseRange: number,
 *   lowHpFleeMult: number,
 *   baseWeights: { attack, defend, retreat, cast, aim, switch_target, flee }
 * }
 */
export function getFightStyleForHero(hero) {
  const weaponType = String(
    (hero && hero.equipment && hero.equipment.weapon && hero.equipment.weapon.weaponType) || ''
  ).toLowerCase();
  const heroClass = String((hero && hero.class) || 'novice').toLowerCase();
  const fallback = EMOTION_CONFIG.FIGHT_CLASS_DEFAULT_WEAPON[heroClass] || 'sword';
  const key = EMOTION_CONFIG.FIGHT_WEAPON_STYLES[weaponType] ? weaponType : fallback;
  return EMOTION_CONFIG.FIGHT_WEAPON_STYLES[key];
}

/**
 * Computes the action weights for a hero in a fight.
 *
 * context (FightAIContext):
 * {
 *   self, selfStats, selfHpRatio,
 *   opponents: Array<{hero, heroStats, hpRatio, distance}>,
 *   target, elapsed, fightDuration, allyCount, enemyCount,
 *   rng, isSanctioned, currentAction, lastDecisionElapsed, selfMana
 * }
 *
 * Returns an ActionWeightMap with one numeric weight per FIGHT_ACTIONS entry.
 */
export function computeActionWeights(context) {
  const zero = {
    attack: 0, defend: 0, retreat: 0, cast: 0, aim: 0, switch_target: 0, flee: 0,
  };
  if (!context || !context.self) return { ...zero };
  if (context.self.alive === false) return { ...zero };

  const selfHpRatio = context.selfHpRatio ?? 0;
  if (selfHpRatio <= 0) return { ...zero };

  const style = getFightStyleForHero(context.self);
  const weights = { ...style.baseWeights };
  const target = context.target || null;
  const distance = target ? (target.distance ?? 0) : 0;

  // --- 3. Range -----------------------------------------------------------
  if (target) {
    if (distance < style.tooCloseRange && RANGED_STYLES.includes(style.id)) {
      weights.retreat += EMOTION_CONFIG.FIGHT_RANGE_CLOSE_RETALIATE_BONUS;
    }
    if (distance > style.preferredRange && !RANGED_STYLES.includes(style.id)) {
      weights.attack += EMOTION_CONFIG.FIGHT_OUT_OF_RANGE_ATTACK_BONUS;
    }
  }

  // --- 4. Mana ------------------------------------------------------------
  const mana = context.selfMana ?? EMOTION_CONFIG.FIGHT_DEFAULT_MANA;
  if (mana < EMOTION_CONFIG.FIGHT_CAST_MIN_MANA) {
    weights.cast = 0;
  }

  // --- 5. Mentality -------------------------------------------------------
  const mentalityNorm = (context.self.mentality ?? 50) / 100;
  weights.defend += mentalityNorm * EMOTION_CONFIG.FIGHT_MENTALITY_DEFEND_BONUS;
  if (style.baseWeights.aim > 0) {
    weights.aim += mentalityNorm * EMOTION_CONFIG.FIGHT_MENTALITY_AIM_BONUS;
  }
  weights.flee += (1 - mentalityNorm) * EMOTION_CONFIG.FIGHT_LOW_MENTALITY_FLEE_BONUS;

  // --- 6. Low HP ----------------------------------------------------------
  if (selfHpRatio < EMOTION_CONFIG.FIGHT_LOW_HP_RATIO) {
    const severity =
      (EMOTION_CONFIG.FIGHT_LOW_HP_RATIO - selfHpRatio) / EMOTION_CONFIG.FIGHT_LOW_HP_RATIO;
    weights.defend += severity * EMOTION_CONFIG.FIGHT_LOW_HP_DEFEND_BONUS;
    weights.retreat += severity * EMOTION_CONFIG.FIGHT_LOW_HP_RETREAT_BONUS;
    weights.flee +=
      severity * EMOTION_CONFIG.FIGHT_LOW_HP_FLEE_BONUS * style.lowHpFleeMult;
    weights.attack *= Math.max(
      EMOTION_CONFIG.FIGHT_LOW_HP_ATTACK_MIN_MULT,
      1 - severity * EMOTION_CONFIG.FIGHT_LOW_HP_ATTACK_PENALTY
    );
  }

  // --- 7. Anger -----------------------------------------------------------
  const angerNorm = (context.self.anger ?? 0) / 100;
  weights.attack *= 1 + angerNorm * EMOTION_CONFIG.FIGHT_ANGER_ATTACK_BONUS_MULT;
  weights.defend *= Math.max(
    EMOTION_CONFIG.FIGHT_ANGER_DEFEND_MIN_MULT,
    1 - angerNorm * EMOTION_CONFIG.FIGHT_ANGER_DEFEND_PENALTY
  );
  weights.retreat *= Math.max(
    EMOTION_CONFIG.FIGHT_ANGER_RETREAT_MIN_MULT,
    1 - angerNorm * EMOTION_CONFIG.FIGHT_ANGER_RETREAT_PENALTY
  );
  if ((context.opponents || []).length > 1) {
    weights.switch_target =
      EMOTION_CONFIG.FIGHT_SWITCH_TARGET_BASE_WEIGHT +
      angerNorm * EMOTION_CONFIG.FIGHT_ANGER_SWITCH_TARGET_BONUS;
  } else {
    weights.switch_target = 0;
  }

  // --- 8. Fear and panic --------------------------------------------------
  const fearNorm = (context.self.fear ?? 0) / 100;
  const panicking = isHeroPanicking(context.self);
  weights.retreat += fearNorm * EMOTION_CONFIG.FIGHT_FEAR_RETREAT_BONUS;
  weights.flee += fearNorm * EMOTION_CONFIG.FIGHT_FEAR_FLEE_BONUS;
  if ((context.self.fear ?? 0) >= EMOTION_CONFIG.HIGH_FEAR_THRESHOLD) {
    weights.flee += EMOTION_CONFIG.FIGHT_HIGH_FEAR_FLEE_SURGE;
  }
  weights.attack *= Math.max(
    EMOTION_CONFIG.FIGHT_FEAR_ATTACK_MIN_MULT,
    1 - fearNorm * EMOTION_CONFIG.FIGHT_FEAR_ATTACK_PENALTY
  );
  if (context.isSanctioned && !panicking) {
    weights.flee *= EMOTION_CONFIG.FIGHT_SANCTIONED_FLEE_MULT;
  }
  if (panicking) {
    weights.attack = 0;
    weights.cast = 0;
    weights.aim = 0;
    weights.flee += EMOTION_CONFIG.FIGHT_PANIC_FLEE_BONUS;
    weights.retreat += EMOTION_CONFIG.FIGHT_PANIC_RETREAT_BONUS;
  }

  for (const action of FIGHT_ACTIONS) {
    weights[action] = Math.max(0, weights[action] || 0);
  }
  return weights;
}

/**
 * Picks the next action for a hero.
 *
 * Hysteresis: inside the dwell window the current action is kept unless a
 * rival action is decisively heavier. Once the dwell time has passed the
 * current action gets a stickiness bonus before a single weighted roll.
 *
 * Returns an action string, or null when the hero cannot act.
 */
export function chooseFightAction(context) {
  if (!context || !context.self) return null;
  if (context.self.alive === false) return null;
  if ((context.selfHpRatio ?? 0) <= 0) return null;

  const weights = computeActionWeights(context);
  const available = FIGHT_ACTIONS.filter((action) => (weights[action] || 0) > 0);
  if (available.length === 0) return null;

  const current = context.currentAction || null;
  const elapsed = context.elapsed ?? 0;
  const lastDecisionElapsed = context.lastDecisionElapsed ?? -Infinity;
  const dwellRemaining = elapsed - lastDecisionElapsed;

  if (current && (weights[current] || 0) > 0 && dwellRemaining < EMOTION_CONFIG.FIGHT_AI_MIN_DWELL_SEC) {
    // Still inside the dwell window: only a decisive weight flips the action.
    const currentWeight = weights[current];
    let best = null;
    let bestWeight = 0;
    for (const action of available) {
      if (action === current) continue;
      if (weights[action] > bestWeight) {
        bestWeight = weights[action];
        best = action;
      }
    }
    if (best && bestWeight >= currentWeight * EMOTION_CONFIG.FIGHT_AI_HYSTERESIS_RATIO) {
      return best;
    }
    return current;
  }

  // Dwell time elapsed: bias toward the current action, then roll once.
  const rollWeights = { ...weights };
  if (current && (rollWeights[current] || 0) > 0) {
    rollWeights[current] *= EMOTION_CONFIG.FIGHT_AI_CURRENT_ACTION_STICKINESS_MULT;
  }

  const total = FIGHT_ACTIONS.reduce((sum, action) => sum + (rollWeights[action] || 0), 0);
  if (total <= 0) return null;

  const rng = context.rng || Math.random;
  let roll = rng() * total;
  for (const action of FIGHT_ACTIONS) {
    const weight = rollWeights[action] || 0;
    if (weight <= 0) continue;
    roll -= weight;
    if (roll <= 0) return action;
  }

  // Numerical fallback: the heaviest action.
  let fallback = available[0];
  for (const action of available) {
    if (rollWeights[action] > rollWeights[fallback]) fallback = action;
  }
  return fallback;
}

/**
 * Picks a new opponent to focus on.
 *
 * Scores the alternatives by how hurt they are and how close they are.
 * Returns the best opponent entry, or null when there is no alternative.
 */
export function chooseSwitchTarget(context) {
  if (!context) return null;
  const opponents = context.opponents || [];
  if (opponents.length <= 1) return null;

  const currentId = context.target && context.target.hero ? context.target.hero.id : null;
  let best = null;
  let bestScore = -Infinity;

  for (const opponent of opponents) {
    if (!opponent || !opponent.hero) continue;
    if (currentId && opponent.hero.id === currentId) continue;
    const score =
      (1 - (opponent.hpRatio ?? 1)) * EMOTION_CONFIG.FIGHT_TARGET_LOW_HP_WEIGHT +
      (1 / Math.max(1, opponent.distance ?? 1)) * EMOTION_CONFIG.FIGHT_TARGET_CLOSE_DIST_WEIGHT;
    if (score > bestScore) {
      bestScore = score;
      best = opponent;
    }
  }
  return best;
}
