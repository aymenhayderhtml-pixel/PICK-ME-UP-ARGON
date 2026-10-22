// src/data/emotions.config.js
// All tunable numbers for the EMOTION SYSTEM: emotion values, needs, mentality,
// star scaling, daily decision weights, squad leader orders, Iselle intervention
// and the three lobby laws.
//
// Every magic number in the emotion / decision / Iselle code paths MUST come
// from this file. See docs/CODEMAP.md.

export const EMOTION_CONFIG = Object.freeze({
  // --- Star growth multiplier ---------------------------------------------
  // Stars are only a starting point. The gap stays small so a 1-star hero who
  // trains can overtake a 3-star hero who never trains.
  STAR_MULTIPLIERS: Object.freeze({
    1: 1.0,
    2: 1.083,
    3: 1.167,
    4: 1.25,
    5: 1.333,
    6: 1.417,
    7: 1.5,
  }),

  // --- Mentality ----------------------------------------------------------
  MENTALITY_BASE_BY_CLASS: Object.freeze({
    Vanguard: 55,
    'Vanguard Tank': 60,
    Knight: 60,
    Mercenary: 50,
    Berserker: 50,
    Valkyrie: 60,
    Scout: 48,
    Mage: 52,
    'Fire Mage': 52,
    Healer: 54,
    Artisan: 55,
    Commoner: 40,
    Novice: 42,
  }),
  MENTALITY_BONUS_PER_STAR: 3,
  PANIC_MENTALITY_THRESHOLD: 30,
  PANIC_FEAR_THRESHOLD: 60,
  PANIC_SAFE_TRAIN_MULT: 0.25,

  // --- Emotion defaults ---------------------------------------------------
  DEFAULT_HUNGER: 20,
  DEFAULT_FEAR: 10,
  DEFAULT_ANGER: 0,
  MOTIVATION_SCORE_MAP: Object.freeze({ diligent: 75, normal: 50, lazy: 25 }),

  // --- Hunger -------------------------------------------------------------
  DAILY_HUNGER_GAIN: 18,
  HIGH_HUNGER_THRESHOLD: 65,
  HIGH_HUNGER_MOTIVATION_PENALTY: 8,
  HIGH_HUNGER_ANGER_GAIN: 10,
  HIGH_HUNGER_TRAINING_MULT: 0.65,

  // Trait driven hunger. A hero carrying one of these traits gets hungry
  // faster, and a meal barely satisfies them (the manhua's potato grumble).
  // The multipliers are applied inside the normal emotion pipeline
  // (applyDailyEmotionTick / applyEatOutcome), never in a parallel system.
  TRAIT_HUNGER_GAIN_MULT: Object.freeze({ food_complainer: 1.5 }),
  TRAIT_EAT_REDUCTION_MULT: Object.freeze({ food_complainer: 0.6 }),

  // --- Food complaints ----------------------------------------------------
  // The manhua's "unnamed men" complain that the Cafeteria serves nothing
  // but potatoes. Heroes carrying one of these traits say so out loud.
  FOOD_COMPLAINT_TRAITS: Object.freeze(['food_complainer']),
  FOOD_COMPLAINT_ANGER_GAIN: 6,
  FOOD_COMPLAINT_TEXT: 'complains that the Cafeteria served nothing but potatoes again!',

  // --- Eating (Cafeteria) -------------------------------------------------
  EAT_HUNGER_REDUCTION: Object.freeze({ basic: 35, good: 55, feast: 80 }),
  EAT_FEAR_REDUCTION: 6,
  EAT_MOTIVATION_GAIN: 5,

  // --- Resting (Dormitory) ------------------------------------------------
  REST_FATIGUE_REDUCTION: 40,
  REST_FEAR_REDUCTION: 12,
  REST_ANGER_REDUCTION: 10,
  REST_FACILITY_LEVEL_BONUS: 0.15,

  // --- Fear ---------------------------------------------------------------
  FEAR_GAIN_NEAR_DEATH: 28,
  FEAR_GAIN_BIG_DAMAGE: 14,
  FEAR_GAIN_LOSS: 12,
  FEAR_GAIN_ALLY_FELL: 35,
  FEAR_REDUCTION_TRAIN_SUCCESS: 5,
  FEAR_BIG_DAMAGE_RATIO: 0.3,

  // --- Anger --------------------------------------------------------------
  ANGER_GAIN_LOSS: 14,
  ANGER_GAIN_RIVALRY: 8,

  // --- Unsanctioned fights ------------------------------------------------
  FIGHT_ANGER_THRESHOLD: 70,
  FIGHT_TENSION_THRESHOLD: 35,
  FIGHT_LOW_RELATION_THRESHOLD: 20,

  // --- Personality traits -------------------------------------------------
  PERSONALITY_TRAITS: Object.freeze([
    'diligent', 'lazy', 'brave', 'cautious', 'hot_headed',
    // The manhua's three "unnamed men".
    'coward', 'exit_seeker', 'food_complainer',
    // Cowardly: higher fear gain, lower panic threshold, prioritizes rest/eating.
    'cowardly',
  ]),
  TRAIT_MODIFIERS: Object.freeze({
    diligent: Object.freeze({ trainWeight: 1.5, idleWeight: 0.4 }),
    lazy: Object.freeze({ trainWeight: 0.45, idleWeight: 1.8 }),
    brave: Object.freeze({ sparWeight: 1.4, fearGainMult: 0.7 }),
    cautious: Object.freeze({ sparWeight: 0.6, restWeight: 1.3, fearGainMult: 1.25 }),
    hot_headed: Object.freeze({ sparWeight: 1.35, angerGainMult: 1.3, refuseOrderBonus: 0.35 }),
    // coward: refuses to fight and avoids risky activity.
    coward: Object.freeze({
      sparWeight: 0.2, trainWeight: 0.7, idleWeight: 1.15, fearGainMult: 1.4, refuseOrderBonus: 0.3,
    }),
    // cowardly: higher fear gain, lower panic threshold, prioritizes rest/eating over risky training.
    cowardly: Object.freeze({
      sparWeight: 0.15, trainWeight: 0.6, idleWeight: 1.2, restWeight: 1.5, fearGainMult: 1.6, refuseOrderBonus: 0.4,
    }),
    // exit_seeker: always looking for the way out, disengages early.
    exit_seeker: Object.freeze({
      sparWeight: 0.3, trainWeight: 0.85, idleWeight: 1.5, restWeight: 1.2,
      fearGainMult: 1.25, refuseOrderBonus: 0.25,
    }),
    // food_complainer: hungry faster, angrier about it, slacker about work.
    food_complainer: Object.freeze({ angerGainMult: 1.25, idleWeight: 1.2 }),
  }),

  // --- Trait behaviour switches -------------------------------------------
  // Heroes carrying one of these traits refuse to enter the sparring ring.
  TRAITS_REFUSING_SPAR: Object.freeze(['coward', 'cowardly']),
  // How much an uncooperative hero leans into the uncooperative traits.
  UNCOOPERATIVE_TRAIT_WEIGHT_MULT: 2,

  // --- Daily decision weights --------------------------------------------
  BASE_DECISION_WEIGHTS: Object.freeze({
    train_dummy: 25,
    train_archery: 25,
    train_magic: 25,
    spar: 18,
    eat: 20,
    rest: 18,
    idle: 15,
  }),
  // Class affinity scales the three training weights. A class that cannot use
  // a weapon type has that weight zeroed.
  CLASS_TRAIN_AFFINITY: Object.freeze({
    Vanguard: Object.freeze({ train_dummy: 1.0, train_archery: 0.3, train_magic: 0.2 }),
    'Vanguard Tank': Object.freeze({ train_dummy: 1.0, train_archery: 0.2, train_magic: 0.1 }),
    Knight: Object.freeze({ train_dummy: 1.0, train_archery: 0.2, train_magic: 0.1 }),
    Mercenary: Object.freeze({ train_dummy: 1.0, train_archery: 0.25, train_magic: 0.15 }),
    Berserker: Object.freeze({ train_dummy: 1.0, train_archery: 0.2, train_magic: 0.1 }),
    Valkyrie: Object.freeze({ train_dummy: 1.0, train_archery: 0.2, train_magic: 0.1 }),
    Scout: Object.freeze({ train_dummy: 0.4, train_archery: 1.0, train_magic: 0.3 }),
    Mage: Object.freeze({ train_dummy: 0.2, train_archery: 0.2, train_magic: 1.0 }),
    'Fire Mage': Object.freeze({ train_dummy: 0.2, train_archery: 0.2, train_magic: 1.0 }),
    Healer: Object.freeze({ train_dummy: 0.3, train_archery: 0.3, train_magic: 1.0 }),
    Artisan: Object.freeze({ train_dummy: 0.8, train_archery: 0.3, train_magic: 0.2 }),
    Commoner: Object.freeze({ train_dummy: 0.8, train_archery: 0.5, train_magic: 0.3 }),
    Novice: Object.freeze({ train_dummy: 0.7, train_archery: 0.7, train_magic: 0.7 }),
  }),
  HIGH_FATIGUE_REST_THRESHOLD: 70,
  HIGH_FATIGUE_TRAIN_MULT: 0.25,
  HIGH_FEAR_THRESHOLD: 50,
  HUNGER_EAT_WEIGHT_MULT: 2.0,
  FEAR_SPAR_WEIGHT_MULT: 0.2,
  ANGER_SPAR_WEIGHT_MULT: 1.4,
  MOTIVATION_TRAIN_MULT_MIN: 0.5,

  // --- Squad leader -------------------------------------------------------
  LEADER_ORDER_BASE_SUCCESS: 0.65,
  LEADER_ORDER_RELATION_SCALE: 0.004,
  LEADER_ORDER_ANGER_PENALTY: 0.005,
  LEADER_ORDER_MAX_TARGETS: 1,
  LEADER_ORDER_REFUSE_ANGER_GAIN: 10,
  LEADER_ORDER_REFUSE_TENSION_GAIN: 12,
  // Above this anger the squad leader's order is likely to be refused.
  LEADER_ORDER_REFUSE_ANGER_THRESHOLD: 50,
  // Heroes carrying one of these traits refuse the order even when calm:
  // the manhua's cowards and exit seekers do not want to be told what to do.
  LEADER_ORDER_REFUSING_TRAITS: Object.freeze(['coward', 'cowardly', 'exit_seeker']),
  LEADER_INTERVENE_MAX_DIST: 7.0,
  LEADER_INTERVENE_POWER_RATIO: 1.0,

  // --- Iselle intervention ------------------------------------------------
  ISELLE_INTERVENE_HP_RATIO: 0.25,
  ISELLE_INTERVENE_CRITICAL_ZONES: Object.freeze(['head', 'heart']),
  ISELLE_MAX_FIGHT_DURATION_SEC: 25.0,
  ISELLE_MAX_FIGHT_TOTAL_DAMAGE: 120,
  ISELLE_SAFE_HEAL_HP_RATIO: 0.5,
  ISELLE_ANGER_REDUCTION: 25,
  ISELLE_FEAR_GAIN: 10,
  ISELLE_LAW_REPRIMAND_DELAY: 1.5,

  // --- Lobby laws ---------------------------------------------------------
  LOBBY_LAWS: Object.freeze({
    NO_OUTSIDE_FIGHTING: 'No fighting outside the sparring ring',
    NO_LETHAL_SPAR_BLOWS: 'No lethal blows to the head or heart in sparring',
    NO_ATTACK_LOW_HP: 'No attacking a hero below the safe HP threshold',
  }),
  LAW_BREAK_MOTIVATION_PENALTY: 15,

  // --- Report importance (Iselle's Report sorting) ------------------------
  REPORT_IMPORTANCE: Object.freeze({
    died: 100,
    iselle_intervened: 90,
    law_broken: 88,
    fought_hero: 85,
    fight_ended: 84,
    fight_won: 83,
    fight_lost: 82,
    injured: 80,
    skill_combined: 75,
    new_skill: 70,
    level_up: 65,
    leader_ordered: 55,
    got_scared: 45,
    sanctioned_bout: 42,
    trained: 40,
    ate: 25,
    rested: 20,
    did_nothing: 10,
  }),
  REPORT_HISTORY_MAX: 5,
  ACTIVITY_HISTORY_MAX: 10,

  // =========================================================================
  // PHASE 2 - FIGHT AI AND EMOTION-DRIVEN FIGHTS
  // =========================================================================

  // --- Fight trigger -------------------------------------------------------
  // Condition A: anger at or above this, against a high tension or low
  // intimacy rival. Condition B: fear AND hunger both high.
  FIGHT_FEAR_THRESHOLD: 55,
  FIGHT_HUNGER_THRESHOLD: 65,
  MAX_FIGHTS_PER_HERO_PER_DAY: 1,
  MAX_TOWN_FIGHTS_PER_DAY: 2,
  FIGHT_NO_PARTNER_ANGER_GAIN: 5,

  // Town plaza positions for an unsanctioned fight. They are deliberately
  // outside the sparring ring (centre -18.7, 23.3) so a fight there always
  // breaks NO_OUTSIDE_FIGHTING.
  UNSANCTIONED_FIGHT_SPOT_A: Object.freeze({ x: -8.5, z: 14.0 }),
  UNSANCTIONED_FIGHT_SPOT_B: Object.freeze({ x: -6.7, z: 14.0 }),

  // --- Fight AI ------------------------------------------------------------
  FIGHT_AI_DECISION_INTERVAL_SEC: 0.9,
  FIGHT_AI_MIN_DWELL_SEC: 1.8,
  FIGHT_AI_HYSTERESIS_RATIO: 1.35,
  FIGHT_AI_CURRENT_ACTION_STICKINESS_MULT: 1.25,

  FIGHT_DEFAULT_MANA: 100,
  FIGHT_CAST_MIN_MANA: 20,
  FIGHT_CAST_MANA_COST: 20,

  // Fallback weapon per hero class, used when the hero carries no weapon.
  FIGHT_CLASS_DEFAULT_WEAPON: Object.freeze({
    vanguard: 'sword',
    'vanguard tank': 'sword',
    knight: 'sword',
    mercenary: 'sword',
    berserker: 'sword',
    valkyrie: 'spear',
    scout: 'bow',
    mage: 'staff',
    'fire mage': 'staff',
    healer: 'staff',
    artisan: 'sword',
    commoner: 'sword',
    novice: 'sword',
  }),

  // Base action weights, engagement range and low HP flee scaling per weapon.
  FIGHT_WEAPON_STYLES: Object.freeze({
    sword: Object.freeze({
      id: 'sword', preferredRange: 1.8, tooCloseRange: 0.8, lowHpFleeMult: 1.0,
      baseWeights: Object.freeze({ attack: 48, defend: 28, retreat: 8, cast: 0, aim: 0, switch_target: 0, flee: 4 }),
    }),
    spear: Object.freeze({
      id: 'spear', preferredRange: 2.4, tooCloseRange: 1.0, lowHpFleeMult: 1.0,
      baseWeights: Object.freeze({ attack: 50, defend: 26, retreat: 10, cast: 0, aim: 0, switch_target: 0, flee: 4 }),
    }),
    dagger: Object.freeze({
      id: 'dagger', preferredRange: 1.4, tooCloseRange: 0.6, lowHpFleeMult: 1.15,
      baseWeights: Object.freeze({ attack: 54, defend: 20, retreat: 12, cast: 0, aim: 0, switch_target: 0, flee: 6 }),
    }),
    shield: Object.freeze({
      id: 'shield', preferredRange: 1.6, tooCloseRange: 0.7, lowHpFleeMult: 0.8,
      baseWeights: Object.freeze({ attack: 34, defend: 44, retreat: 8, cast: 0, aim: 0, switch_target: 0, flee: 3 }),
    }),
    bow: Object.freeze({
      id: 'bow', preferredRange: 6.5, tooCloseRange: 2.8, lowHpFleeMult: 1.65,
      baseWeights: Object.freeze({ attack: 10, defend: 10, retreat: 18, cast: 0, aim: 52, switch_target: 0, flee: 8 }),
    }),
    staff: Object.freeze({
      id: 'staff', preferredRange: 6.0, tooCloseRange: 2.5, lowHpFleeMult: 1.35,
      baseWeights: Object.freeze({ attack: 8, defend: 14, retreat: 18, cast: 54, aim: 0, switch_target: 0, flee: 6 }),
    }),
  }),

  // --- Fight AI weight modifiers -------------------------------------------
  FIGHT_LOW_HP_RATIO: 0.35,
  FIGHT_LOW_HP_DEFEND_BONUS: 30,
  FIGHT_LOW_HP_RETREAT_BONUS: 35,
  FIGHT_LOW_HP_FLEE_BONUS: 45,
  FIGHT_LOW_HP_ATTACK_PENALTY: 0.6,
  FIGHT_LOW_HP_ATTACK_MIN_MULT: 0.25,

  FIGHT_FEAR_RETREAT_BONUS: 35,
  FIGHT_FEAR_FLEE_BONUS: 40,
  FIGHT_HIGH_FEAR_FLEE_SURGE: 20,
  FIGHT_FEAR_ATTACK_PENALTY: 0.65,
  FIGHT_FEAR_ATTACK_MIN_MULT: 0.2,

  FIGHT_PANIC_FLEE_BONUS: 60,
  FIGHT_PANIC_RETREAT_BONUS: 30,

  FIGHT_ANGER_ATTACK_BONUS_MULT: 0.85,
  FIGHT_ANGER_DEFEND_PENALTY: 0.55,
  FIGHT_ANGER_DEFEND_MIN_MULT: 0.3,
  FIGHT_ANGER_RETREAT_PENALTY: 0.65,
  FIGHT_ANGER_RETREAT_MIN_MULT: 0.2,

  FIGHT_SWITCH_TARGET_BASE_WEIGHT: 8,
  FIGHT_ANGER_SWITCH_TARGET_BONUS: 28,

  FIGHT_MENTALITY_DEFEND_BONUS: 25,
  FIGHT_MENTALITY_AIM_BONUS: 25,
  FIGHT_LOW_MENTALITY_FLEE_BONUS: 30,

  FIGHT_RANGE_CLOSE_RETALIATE_BONUS: 30,
  FIGHT_OUT_OF_RANGE_ATTACK_BONUS: 18,
  FIGHT_SANCTIONED_FLEE_MULT: 0.5,

  FIGHT_TARGET_LOW_HP_WEIGHT: 60,
  FIGHT_TARGET_CLOSE_DIST_WEIGHT: 40,

  FIGHT_FLEE_SPEED_MULT: 1.25,
  FIGHT_FLEE_FATIGUE_GAIN: 10,
  FIGHT_FLEE_FEAR_GAIN: 8,
  FIGHT_FATIGUE_GAIN: 20,

  // --- Iselle fight intervention (Phase 2) ---------------------------------
  ISELLE_UNSANCTIONED_MIN_DETECT_SEC: 4.5,
  ISELLE_INTERVENE_MOVE_SPEED: 4.5,
  ISELLE_SEPARATION_DISTANCE: 2.4,
  ISELLE_INTERVENE_WALK_DURATION_SEC: 0.8,
  ISELLE_INTERVENE_BEAM_DURATION_SEC: 0.6,
  ISELLE_INTERVENE_HEAL_DURATION_SEC: 0.8,
  ISELLE_INTERVENE_RELEASE_DELAY_SEC: 0.3,
  ISELLE_INTERVENE_TOTAL_DURATION_SEC: 2.5,

  // --- Fight consequences ---------------------------------------------------
  FIGHT_WIN_MOTIVATION_GAIN: 6,
  FIGHT_LOSS_MOTIVATION_DELTA: -8,
  FIGHT_DRAW_MOTIVATION_DELTA: -2,
  FIGHT_WIN_FEAR_GAIN: 0,
  FIGHT_DRAW_FEAR_GAIN: 6,
  FIGHT_WIN_ANGER_DELTA: -10,
  FIGHT_UNSANCTIONED_INTIMACY_DELTA: -8,
  FIGHT_UNSANCTIONED_TENSION_GAIN: 12,
  FIGHT_CLEAN_SPAR_INTIMACY_GAIN: 5,
  FIGHT_CLEAN_SPAR_TENSION_DELTA: -6,
  FIGHT_INTENSE_SPAR_INTIMACY_GAIN: 2,
  FIGHT_INTENSE_SPAR_TENSION_GAIN: 4,
});

/**
 * Default Mentality (0..100) for a hero of the given class and star.
 * Falls back to the Novice base for unknown classes.
 */
export function getDefaultMentality(heroClass, star = 1) {
  const key = String(heroClass || 'Novice');
  const base =
    EMOTION_CONFIG.MENTALITY_BASE_BY_CLASS[key] ??
    EMOTION_CONFIG.MENTALITY_BASE_BY_CLASS.Novice;
  const bonus = EMOTION_CONFIG.MENTALITY_BONUS_PER_STAR * (Math.max(1, star || 1) - 1);
  return Math.max(0, Math.min(100, Math.round(base + bonus)));
}

/**
 * Converts the legacy string motivation ('diligent' | 'normal' | 'lazy')
 * into the numeric 0..100 motivation score.
 */
export function getDefaultMotivationScore(motivationString) {
  const map = EMOTION_CONFIG.MOTIVATION_SCORE_MAP;
  const value = map[String(motivationString || 'normal')];
  return value !== undefined ? value : map.normal;
}
