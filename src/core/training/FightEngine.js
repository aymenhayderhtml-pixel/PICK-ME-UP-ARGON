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
import { captureProgression, diffProgression, checkAndUnlockPainTolerance, recordTrainingDamageAndHeal, formatTemplate } from './Shared.js';
import { executeSingleFighterTurn, pickPrimarySkillForHero } from './Sessions.js';

const normalizeId = (v) => String(v || '').toLowerCase().replace(/\s+/g, '_');

/** Fills `{token}` placeholders in a report text template. */

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

