// src/data/training.config.js
// All tunable numbers for the TRAINING SYSTEM: training zones, session
// outcomes, XP, stat gains, hit zones, injuries, Pain Tolerance and the
// offline simulation time ratios.
//
// Every magic number in the training / sparring code paths MUST come from this
// file. See docs/CODEMAP.md.

export const TRAINING_CONFIG = Object.freeze({
  // --- Offline time --------------------------------------------------------
  // 1 real day = 3 game days, so one game day is 8 real hours.
  REAL_HOURS_PER_GAME_DAY: 8,
  MAX_OFFLINE_GAME_DAYS: 9,

  // --- Training session outcomes -------------------------------------------
  SESSION_OUTCOME_WEIGHTS: Object.freeze({
    strong_gain: 20,
    normal_gain: 52,
    small_gain: 20,
    accident: 8,
  }),
  OUTCOME_MULTIPLIERS: Object.freeze({
    strong_gain: 1.5,
    normal_gain: 1.0,
    small_gain: 0.5,
    accident: 0.25,
  }),

  // --- XP per session ------------------------------------------------------
  BASE_SESSION_SKILL_XP: Object.freeze({
    train_dummy: 45,
    train_archery: 45,
    train_magic: 48,
    spar: 70,
  }),
  SECONDARY_SKILL_XP_RATIO: 0.65,
  BASE_SESSION_HERO_EXP: Object.freeze({
    train_dummy: 22,
    train_archery: 22,
    train_magic: 24,
    spar: 35,
  }),

  // --- Direct stat growth --------------------------------------------------
  STAT_GAIN_CHANCE_BY_OUTCOME: Object.freeze({
    strong_gain: 1.0,
    normal_gain: 0.65,
    small_gain: 0.25,
    accident: 0.0,
  }),
  STRONG_GAIN_BONUS_STAT_POINTS: 2,
  NORMAL_GAIN_BONUS_STAT_POINTS: 1,

  // --- Costs ----------------------------------------------------------------
  TRAINING_FATIGUE_COST: Object.freeze({
    train_dummy: 18,
    train_archery: 16,
    train_magic: 20,
    spar: 24,
  }),

  // --- Sparring ------------------------------------------------------------
  SPAR_LOW_HP_THRESHOLD: 0.2,
  SPAR_LOW_HP_XP_BONUS_MULT: 1.5,
  SPAR_LOW_HP_PAIN_COUNTER_BONUS: 35,
  SPAR_EXCHANGES: 6,
  SPAR_DAMAGE_PER_EXCHANGE_MULT: 1.0,
  SPAR_FEAR_ON_LOSS: 12,
  SPAR_ANGER_ON_LOSS: 14,

  // --- Death / injury ------------------------------------------------------
  // Risky training (magic / spar) can kill a hero. Iselle's supervision greatly
  // reduces the risk but does not remove it, so a small chance stays when she
  // is present. RISKY_DEATH_CHANCE_BASE is the unsupervised (Iselle away) rate.
  RISKY_DEATH_CHANCE_BASE: 0.005,
  DEATH_CHANCE_WITH_ISELLE: 0.002,
  RISKY_TRAINING_TYPES: Object.freeze(['train_magic', 'spar']),

  // --- Hit zones -----------------------------------------------------------
  HIT_ZONE_WEIGHTS: Object.freeze({
    melee: Object.freeze({ limbs: 45, torso: 43, head: 8, heart: 4 }),
    arrow: Object.freeze({ limbs: 35, torso: 45, head: 13, heart: 7 }),
    spell: Object.freeze({ limbs: 38, torso: 48, head: 8, heart: 6 }),
  }),
  HIT_ZONE_DAMAGE_MULT: Object.freeze({
    limbs: 0.85,
    torso: 1.0,
    head: 1.75,
    heart: 2.0,
  }),
  CRITICAL_ZONES: Object.freeze(['head', 'heart']),

  // --- Healing at the training ground -------------------------------------
  TRAINING_FAST_HEAL_PER_SEC: 12.0,
  CRITICAL_INJURY_HEAL_MULT: 0.15,
  CRITICAL_INJURY_DURATION_DAYS: 2,

  // --- Pain Tolerance ------------------------------------------------------
  PAIN_TOLERANCE_THRESHOLD_PER_LEVEL: 120,
  PAIN_TOLERANCE_DR_PER_LEVEL: 0.015,
  PAIN_TOLERANCE_MAX_LEVEL: 10,

  // --- Live (3D town) action XP -------------------------------------------
  LIVE_ACTION_XP_PER_HIT: Object.freeze({
    dummy: 6,
    archery: 6,
    magic: 7,
    spar: 10,
  }),

  // --- Which skills each training zone teaches ----------------------------
  PRIMARY_SKILL_BY_TRAINING: Object.freeze({
    train_dummy: 'basic_swordsmanship',
    train_archery: 'basic_archery',
    train_magic: 'basic_fire_magic',
  }),
  SECONDARY_SKILL_BY_TRAINING: Object.freeze({
    train_dummy: 'basic_shield_technique',
    train_archery: 'quiver_handling',
    train_magic: 'mana_control',
  }),
  // A hero who already knows an alias skill also qualifies for the new one.
  SKILL_ALIASES: Object.freeze({
    basic_fire_magic: Object.freeze(['fireball']),
  }),
  // Skills a hero may combine with a weapon they do not carry.
  COMBINABLE_SECONDARY: Object.freeze({
    basic_shield_technique: 'shield',
    quiver_handling: 'bow',
    mana_control: 'staff',
  }),

  // =========================================================================
  // PHASE 2 - FIGHT ENGINE AND UNIFIED TRAINING XP
  // =========================================================================

  // --- Combat multipliers used by the shared fight engine ------------------
  SPAR_SKILL_XP_PER_EXCHANGE: 16,
  UNSANCTIONED_FIGHT_XP_PER_EXCHANGE: 8,
  SPAR_HERO_EXP_PER_EXCHANGE: 6,
  UNSANCTIONED_FIGHT_HERO_EXP_PER_EXCHANGE: 3,
  FIGHT_FLEE_XP_MULT: 0.25,
  FIGHT_AIM_DAMAGE_MULT: 1.25,
  FIGHT_CAST_DAMAGE_MULT: 1.35,
  FIGHT_DEFEND_BLOCK_EFFICIENCY: 0.65,
  FIGHT_RETREAT_STEP_DIST: 1.2,
  FIGHT_ADVANCE_STEP_DIST: 1.1,
  // How long the training yard keeps healing a fighter's wounds after a fight.
  // A critical (head or heart) wound heals far slower.
  FIGHT_RECOVERY_SEC: 3.0,

  // --- Injuries ------------------------------------------------------------
  // A critical zone struck in a real fight keeps a hero out for longer than a
  // training accident.
  FIGHT_CRITICAL_INJURY_DAYS: 3,
  MINOR_INJURY_DAYS: 1,
  MINOR_INJURY_HEAL_MULT: 0.5,

  // --- Unified live training XP (one path for every training source) -------
  LIVE_TRAINING_TICK_INTERVAL_SEC: 5.0,
  LIVE_TRAINING_HITS_PER_TICK: 5,
  LIVE_TRAINING_FATIGUE_PER_TICK: 3,
  FACILITY_XP_BONUS_PER_LEVEL: 0.10,
  DILIGENT_XP_MULT: 1.5,
});
