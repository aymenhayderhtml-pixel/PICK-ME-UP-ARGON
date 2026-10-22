// src/core/DailyDecisionEngine.js
// The ONE daily decision code path.
//
// `simulateGameDay` is called by BOTH:
//   - GameState.startNewDay()   (live play in the town)
//   - simulateMultipleDays()    (offline simulation on login)
// so a hero behaves identically whether the player is watching or away.

import { EMOTION_CONFIG } from '../data/emotions.config.js';
import { createRng } from './Rng.js';
import {
  applyDailyEmotionTick,
  applyEatOutcome,
  applyRestOutcome,
  evaluateSquadLeaderOrder,
  getTraitModifiers,
  hasTrait,
  isHeroPanicking,
  pickTrainingTypeForHero,
} from './EmotionEngine.js';
import {
  resolveTrainingSession,
  resolveSparringSession,
  resolveEmotionFight,
  pairDailyFights,
} from './TrainingEngine.js';

const TRAINING_ACTIVITIES = ['train_dummy', 'train_archery', 'train_magic'];

/**
 * Computes the weighted activity options for a hero for the coming day.
 * Returns a map of activity id -> weight (all weights are >= 0).
 */
export function computeActivityWeights(hero, gameState) {
  const base = EMOTION_CONFIG.BASE_DECISION_WEIGHTS;
  const mods = getTraitModifiers(hero);
  const affinity =
    EMOTION_CONFIG.CLASS_TRAIN_AFFINITY[hero.class] || EMOTION_CONFIG.CLASS_TRAIN_AFFINITY.Novice;

  const hunger = hero.hunger ?? 0;
  const fear = hero.fear ?? 0;
  const anger = hero.anger ?? 0;
  const fatigue = hero.fatigue ?? 0;
  const motivation = hero.motivationScore ?? 50;
  const panicking = isHeroPanicking(hero);

  // Motivation scales the training weights: 0 motivation halves them,
  // 100 motivation multiplies them by 1.5.
  const motivationMult =
    EMOTION_CONFIG.MOTIVATION_TRAIN_MULT_MIN + (motivation / 100) * 1.0;

  let trainDummy = base.train_dummy * affinity.train_dummy * mods.trainWeight * motivationMult;
  let trainArchery = base.train_archery * affinity.train_archery * mods.trainWeight * motivationMult;
  let trainMagic = base.train_magic * affinity.train_magic * mods.trainWeight * motivationMult;
  let spar = base.spar * mods.sparWeight;
  let eat = base.eat;
  let rest = base.rest * mods.restWeight;
  let idle = base.idle * mods.idleWeight;

  // Hunger drives the hero to the Cafeteria.
  if (hunger >= EMOTION_CONFIG.HIGH_HUNGER_THRESHOLD) {
    eat *= EMOTION_CONFIG.HUNGER_EAT_WEIGHT_MULT;
  }

  // Fear suppresses sparring.
  if (fear >= EMOTION_CONFIG.HIGH_FEAR_THRESHOLD) {
    spar *= EMOTION_CONFIG.FEAR_SPAR_WEIGHT_MULT;
  }

  // Anger makes a hero more likely to pick a fight.
  if (anger >= EMOTION_CONFIG.FIGHT_ANGER_THRESHOLD) {
    spar *= EMOTION_CONFIG.ANGER_SPAR_WEIGHT_MULT;
  }

  // Fatigue makes the hero rest instead of train.
  if (fatigue >= EMOTION_CONFIG.HIGH_FATIGUE_REST_THRESHOLD) {
    trainDummy *= EMOTION_CONFIG.HIGH_FATIGUE_TRAIN_MULT;
    trainArchery *= EMOTION_CONFIG.HIGH_FATIGUE_TRAIN_MULT;
    trainMagic *= EMOTION_CONFIG.HIGH_FATIGUE_TRAIN_MULT;
    rest *= 2;
  }

  // Panic: the hero refuses risky training and refuses to spar.
  if (panicking) {
    spar = 0;
    trainMagic = 0;
    trainDummy *= EMOTION_CONFIG.PANIC_SAFE_TRAIN_MULT;
    trainArchery *= EMOTION_CONFIG.PANIC_SAFE_TRAIN_MULT;
    rest *= 1.5;
  }

  // A coward refuses to fight: the sparring ring is off limits.
  if (hasTrait(hero, EMOTION_CONFIG.TRAITS_REFUSING_SPAR)) {
    spar = 0;
  }

  // A serious injury rules out sparring entirely.
  if (hero.injury && hero.injury.severity === 'serious') {
    spar = 0;
  }

  // Not enough heroes alive to spar with.
  const aliveCount = (gameState && gameState.heroes ? gameState.heroes : []).filter(
    (h) => h.alive
  ).length;
  if (aliveCount < 2) {
    spar = 0;
  }

  return {
    train_dummy: Math.max(0, trainDummy),
    train_archery: Math.max(0, trainArchery),
    train_magic: Math.max(0, trainMagic),
    spar: Math.max(0, spar),
    eat: Math.max(0, eat),
    rest: Math.max(0, rest),
    idle: Math.max(0, idle),
  };
}

/**
 * Picks an activity for a hero by weighted random.
 */
export function chooseDailyActivity(hero, gameState, rng = Math.random) {
  const weights = computeActivityWeights(hero, gameState);
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  const panicked = isHeroPanicking(hero);

  if (total <= 0) {
    return { activity: 'idle', weights, panicked, total: 0 };
  }

  let roll = rng() * total;
  let activity = 'idle';
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) {
      activity = key;
      break;
    }
  }
  return { activity, weights, panicked, total };
}

/**
 * Runs ONE full game day for every alive hero.
 *
 * Returns a DaySimulationReport:
 * {
 *   day: number,
 *   mode: 'live' | 'offline',
 *   events: ReportEvent[],
 *   activities: Array<{ heroId, heroName, activity }>,
 *   idleHeroIds: string[],
 *   leaderOrder: object | null,
 *   fights: object[]
 * }
 */
export function simulateGameDay(gameState, options = {}) {
  const { mode = 'live', rng = Math.random, isellePresent = true } = options;
  if (!gameState) {
    return { day: 0, mode, events: [], activities: [], idleHeroIds: [], leaderOrder: null, fights: [] };
  }

  const day = gameState.dayCount || 1;
  const report = {
    day,
    mode,
    events: [],
    activities: [],
    idleHeroIds: [],
    leaderOrder: null,
    fights: [],
  };

  const alive = (gameState.heroes || []).filter((h) => h.alive);
  const dormitoryLevel = (gameState.facilities && gameState.facilities.dormitory
    ? gameState.facilities.dormitory.level
    : 1) || 1;

  const push = (event) => {
    report.events.push(event);
    return event;
  };

  // A training session may have raised the hero's level or taught a new skill;
  // announce both so Iselle's Report can count them.
  const pushTrainingProgression = (heroId, heroName, session) => {
    if (session.leveledUp) {
      push({
        day,
        heroId,
        heroName,
        type: 'level_up',
        importance: EMOTION_CONFIG.REPORT_IMPORTANCE.level_up,
        text: `${heroName} reached level ${session.newLevel}.`,
        details: { level: session.newLevel },
      });
    }
    for (const skill of session.newSkills || []) {
      push({
        day,
        heroId,
        heroName,
        type: 'new_skill',
        importance: EMOTION_CONFIG.REPORT_IMPORTANCE.new_skill,
        text: `${heroName} learned ${skill.name}.`,
        details: { skillId: skill.id },
      });
    }
  };

  // 1. Daily passive emotion tick for every hero.
  for (const hero of alive) {
    applyDailyEmotionTick(hero, gameState.foodQuality);
  }

  // 1b. Who turns on whom TODAY. The decision is made on the state after the
  //     daily tick, BEFORE the routine changes anything: a hero who is angry
  //     enough to brawl does not get to calm down with a bowl of soup first.
  const fightPairs = pairDailyFights(gameState, alive);
  report.fightPairs = fightPairs;

  // The Squad Leader is resolved before the choices so a spar can be broken
  // up by the leader.
  const leader = alive.find((h) => h.isSquadLeader) || null;

  // 2. Every hero chooses what to do today.
  const idleHeroes = [];
  // A hero may spar at most ONCE per simulated day. This Set records every hero
  // already committed to a spar so a partner is never picked twice.
  const sparredHeroIds = new Set();
  for (const hero of alive) {
    // A hero who is going to brawl spends the day fighting instead.
    const inFight = fightPairs.some(
      (p) => p.heroA.id === hero.id || p.heroB.id === hero.id
    );
    if (inFight) {
      hero.currentActivity = 'fighting';
      report.activities.push({
        heroId: hero.id,
        heroName: hero.name,
        activity: 'fighting',
      });
      continue;
    }

    const choice = chooseDailyActivity(hero, gameState, rng);
    const activity = choice.activity;
    hero.currentActivity = activity;
    report.activities.push({ heroId: hero.id, heroName: hero.name, activity });

    if (activity === 'eat') {
      const eatOutcome = applyEatOutcome(hero, gameState.foodQuality);
      push({
        day,
        heroId: hero.id,
        heroName: hero.name,
        type: 'ate',
        importance: EMOTION_CONFIG.REPORT_IMPORTANCE.ate,
        text:
          eatOutcome && eatOutcome.complained
            ? `${hero.name} ate at the Cafeteria and complained about the potatoes.`
            : `${hero.name} ate at the Cafeteria.`,
        details: { foodQuality: gameState.foodQuality },
      });
    } else if (activity === 'rest') {
      applyRestOutcome(hero, dormitoryLevel);
      push({
        day,
        heroId: hero.id,
        heroName: hero.name,
        type: 'rested',
        importance: EMOTION_CONFIG.REPORT_IMPORTANCE.rested,
        text: `${hero.name} rested in the Dormitory.`,
        details: {},
      });
    } else if (activity === 'idle') {
      idleHeroes.push(hero);
      report.idleHeroIds.push(hero.id);
      push({
        day,
        heroId: hero.id,
        heroName: hero.name,
        type: 'did_nothing',
        importance: EMOTION_CONFIG.REPORT_IMPORTANCE.did_nothing,
        text: `${hero.name} did nothing today.`,
        details: {},
      });
    } else if (activity === 'spar') {
      // Sparring needs a partner who is willing, able, and not already sparred
      // today. The current hero is also skipped if they already sparred today.
      const partner = sparredHeroIds.has(hero.id)
        ? null
        : alive.find(
            (o) =>
              o.id !== hero.id &&
              o.alive &&
              !isHeroPanicking(o) &&
              !(o.injury && o.injury.severity === 'serious') &&
              !sparredHeroIds.has(o.id)
          );
      if (!partner) {
        // Nobody to spar with: the hero does nothing instead.
        idleHeroes.push(hero);
        report.idleHeroIds.push(hero.id);
        push({
          day,
          heroId: hero.id,
          heroName: hero.name,
          type: 'did_nothing',
          importance: EMOTION_CONFIG.REPORT_IMPORTANCE.did_nothing,
          text: `${hero.name} found nobody to spar with and did nothing today.`,
          details: { reason: sparredHeroIds.has(hero.id) ? 'already_sparred' : 'no_partner' },
        });
      } else {
        const spar = resolveSparringSession(hero, partner, gameState, {
          rng,
          isellePresent,
          leader,
        });
        if (spar) {
          // Neither hero may spar again this day.
          sparredHeroIds.add(hero.id);
          sparredHeroIds.add(partner.id);
          report.spars = report.spars || [];
          report.spars.push(spar);
          // The fight engine already produced the fight report events.
          for (const event of spar.reportEvents || []) push(event);
          push({
            day,
            heroId: hero.id,
            heroName: hero.name,
            type: 'trained',
            importance: EMOTION_CONFIG.REPORT_IMPORTANCE.trained,
            text: `${hero.name} sparred with ${partner.name}.`,
            details: { trainingType: 'spar', opponentId: partner.id, stoppedBy: spar.stoppedBy },
          });
          for (const inj of spar.injuries || []) {
            const victim = alive.find((h) => h.id === inj.heroId);
            push({
              day,
              heroId: inj.heroId,
              heroName: victim ? victim.name : 'Unknown',
              type: 'injured',
              importance: EMOTION_CONFIG.REPORT_IMPORTANCE.injured,
              text: `${victim ? victim.name : 'A hero'} took a serious ${inj.zone} wound.`,
              details: { zone: inj.zone, severity: inj.severity },
            });
          }
        }
      }
    } else if (TRAINING_ACTIVITIES.includes(activity)) {
      const session = resolveTrainingSession(hero, activity, gameState, { rng, isellePresent });
      if (session) {
        report.sessions = report.sessions || [];
        report.sessions.push(session);
        push({
          day,
          heroId: hero.id,
          heroName: hero.name,
          type: 'trained',
          importance: EMOTION_CONFIG.REPORT_IMPORTANCE.trained,
          text: `${hero.name} trained (${activity}) - ${session.outcome.replace('_', ' ')}.`,
          details: { trainingType: activity, outcome: session.outcome, skillXp: session.skillXp },
        });
        if (session.combined && session.combined.length > 0) {
          for (const combo of session.combined) {
            push({
              day,
              heroId: hero.id,
              heroName: hero.name,
              type: 'skill_combined',
              importance: EMOTION_CONFIG.REPORT_IMPORTANCE.skill_combined,
              text: `${hero.name} combined ${combo.parentA} and ${combo.parentB} into ${combo.resultName} (Lv ${combo.newLevel}).`,
              details: { ...combo },
            });
          }
        }
        if (session.injury) {
          push({
            day,
            heroId: hero.id,
            heroName: hero.name,
            type: 'injured',
            importance: EMOTION_CONFIG.REPORT_IMPORTANCE.injured,
            text: `${hero.name} was injured during training (${session.injury.zone}).`,
            details: { ...session.injury },
          });
        }
        if (session.died) {
          push({
            day,
            heroId: hero.id,
            heroName: hero.name,
            type: 'died',
            importance: EMOTION_CONFIG.REPORT_IMPORTANCE.died,
            text: `${hero.name} died in a training accident.`,
            details: { cause: session.deathCause },
          });
        }
        pushTrainingProgression(hero.id, hero.name, session);
      }
    }

    // A panicking hero logs that fear stopped them.
    if (choice.panicked) {
      push({
        day,
        heroId: hero.id,
        heroName: hero.name,
        type: 'got_scared',
        importance: EMOTION_CONFIG.REPORT_IMPORTANCE.got_scared,
        text: `${hero.name} was too frightened to train properly.`,
        details: { activity },
      });
    }
  }

  // 3. The Squad Leader may order ONE idle hero to train.
  if (leader && idleHeroes.length > 0) {
    const order = evaluateSquadLeaderOrder(gameState, leader, idleHeroes, rng);
    report.leaderOrder = order;
    if (order.ordered) {
      if (order.reportEvent) push(order.reportEvent);
      if (order.accepted) {
        const target = idleHeroes.find((h) => h.id === order.targetId);
        if (target) {
          target.currentActivity = order.trainingType;
          const session = resolveTrainingSession(target, order.trainingType, gameState, {
            rng,
            isellePresent,
          });
          if (session) {
            report.sessions = report.sessions || [];
            report.sessions.push(session);
            push({
              day,
              heroId: target.id,
              heroName: target.name,
              type: 'trained',
              importance: EMOTION_CONFIG.REPORT_IMPORTANCE.trained,
              text: `${target.name} trained (${order.trainingType}) on the leader's order.`,
              details: { trainingType: order.trainingType, outcome: session.outcome, ordered: true },
            });
            if (session.combined && session.combined.length > 0) {
              for (const combo of session.combined) {
                push({
                  day,
                  heroId: target.id,
                  heroName: target.name,
                  type: 'skill_combined',
                  importance: EMOTION_CONFIG.REPORT_IMPORTANCE.skill_combined,
                  text: `${target.name} combined ${combo.parentA} and ${combo.parentB} into ${combo.resultName} (Lv ${combo.newLevel}).`,
                  details: { ...combo },
                });
              }
            }
            pushTrainingProgression(target.id, target.name, session);
          }
        }
      }
    }
  }

  // 4. The fights of the day are resolved.
  //
  //    In the LIVE town the fight is played out in 3D by the sparring
  //    controller, so the pairs are only recorded here. In the OFFLINE
  //    simulation there is nobody watching, so the fights are resolved
  //    numerically with the very same fight engine.
  if (options.resolveFights === false) {
    report.pendingFights = fightPairs;
  } else {
    for (const pair of fightPairs) {
      const fight = resolveEmotionFight(pair.heroA, pair.heroB, gameState, {
        rng,
        triggerReason: pair.triggerReason,
        leaderDistance: 999,
      });
      if (fight && fight.occurred) {
        report.fights.push(fight);
        for (const event of fight.reportEvents || []) push(event);
      }
    }
  }

  return report;
}

/**
 * Runs N game days with a deterministic seeded generator and aggregates the
 * result into a single object. Used for the offline login simulation.
 */
export function simulateMultipleDays(gameState, daysCount, options = {}) {
  const { seed = 1377, isellePresent = true, mode = 'offline' } = options;
  const rng = createRng(seed);
  const events = [];
  const dayReports = [];
  const activitiesByHero = {};

  const total = Math.max(0, Math.floor(daysCount || 0));
  for (let i = 0; i < total; i++) {
    gameState.dayCount = (gameState.dayCount || 1) + 1;
    const report = simulateGameDay(gameState, { mode, rng, isellePresent });
    dayReports.push(report);
    for (const event of report.events) {
      events.push(event);
    }
    for (const activity of report.activities) {
      if (!activitiesByHero[activity.heroId]) activitiesByHero[activity.heroId] = [];
      activitiesByHero[activity.heroId].push(activity.activity);
    }
  }

  return { days: total, seed, events, dayReports, activitiesByHero };
}
