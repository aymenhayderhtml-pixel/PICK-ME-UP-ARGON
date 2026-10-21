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
    Berserker: 50,
    Valkyrie: 60,
    Scout: 48,
    Mage: 52,
    'Fire Mage': 52,
    Healer: 54,
    Artisan: 55,
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
  PERSONALITY_TRAITS: Object.freeze(['diligent', 'lazy', 'brave', 'cautious', 'hot_headed']),
  TRAIT_MODIFIERS: Object.freeze({
    diligent: Object.freeze({ trainWeight: 1.5, idleWeight: 0.4 }),
    lazy: Object.freeze({ trainWeight: 0.45, idleWeight: 1.8 }),
    brave: Object.freeze({ sparWeight: 1.4, fearGainMult: 0.7 }),
    cautious: Object.freeze({ sparWeight: 0.6, restWeight: 1.3, fearGainMult: 1.25 }),
    hot_headed: Object.freeze({ sparWeight: 1.35, angerGainMult: 1.3, refuseOrderBonus: 0.35 }),
  }),

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
    Berserker: Object.freeze({ train_dummy: 1.0, train_archery: 0.2, train_magic: 0.1 }),
    Valkyrie: Object.freeze({ train_dummy: 1.0, train_archery: 0.2, train_magic: 0.1 }),
    Scout: Object.freeze({ train_dummy: 0.4, train_archery: 1.0, train_magic: 0.3 }),
    Mage: Object.freeze({ train_dummy: 0.2, train_archery: 0.2, train_magic: 1.0 }),
    'Fire Mage': Object.freeze({ train_dummy: 0.2, train_archery: 0.2, train_magic: 1.0 }),
    Healer: Object.freeze({ train_dummy: 0.3, train_archery: 0.3, train_magic: 1.0 }),
    Artisan: Object.freeze({ train_dummy: 0.8, train_archery: 0.3, train_magic: 0.2 }),
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
    injured: 80,
    skill_combined: 75,
    new_skill: 70,
    level_up: 65,
    leader_ordered: 55,
    got_scared: 45,
    trained: 40,
    ate: 25,
    rested: 20,
    did_nothing: 10,
  }),
  REPORT_HISTORY_MAX: 5,
  ACTIVITY_HISTORY_MAX: 10,
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
