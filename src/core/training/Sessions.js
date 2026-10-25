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
import { rollSessionOutcome, recordCoTraining, recordTrainingDamageAndHeal, captureProgression, diffProgression, checkAndUnlockPainTolerance, findHeroSkill, rollHitZone } from './Shared.js';
import { captureSkillLevels } from './Progression.js';

const normalizeId = (v) => String(v || '').toLowerCase().replace(/\s+/g, '_');

/** Fills `{token}` placeholders in a report text template. */

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

export function executeSingleFighterTurn(session, side, rng) {
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

