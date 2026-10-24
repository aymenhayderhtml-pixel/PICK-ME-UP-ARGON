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

