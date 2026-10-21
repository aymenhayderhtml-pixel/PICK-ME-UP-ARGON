// src/core/LoginSimulation.js
// Offline simulation and the "Iselle's Report" data model.
//
// The offline simulation runs through the EXACT same code path as live play:
// src/core/DailyDecisionEngine.js -> simulateGameDay().

import { EMOTION_CONFIG } from '../data/emotions.config.js';
import { TRAINING_CONFIG } from '../data/training.config.js';
import { simulateMultipleDays } from './DailyDecisionEngine.js';
import { handleHeroDeathAndDropGear } from './TrainingEngine.js';

const MS_PER_HOUR = 3600000;

/**
 * How many game days passed while the player was away.
 * 1 real day = 3 game days, so one game day is 8 real hours. Capped.
 */
export function computeGameDaysAway(lastLoginTimestamp, nowTimestamp = Date.now()) {
  if (!lastLoginTimestamp || !Number.isFinite(lastLoginTimestamp)) return 0;
  const elapsed = nowTimestamp - lastLoginTimestamp;
  if (!Number.isFinite(elapsed) || elapsed <= 0) return 0;
  const perDay = TRAINING_CONFIG.REAL_HOURS_PER_GAME_DAY * MS_PER_HOUR;
  return Math.min(
    TRAINING_CONFIG.MAX_OFFLINE_GAME_DAYS,
    Math.max(0, Math.floor(elapsed / perDay))
  );
}

/**
 * Builds the "Iselle's Report" model from a simulation result.
 * Events are sorted by importance (descending), then by day (ascending).
 */
export function buildIselleReportModel(simulationResult, gameState) {
  const events = (simulationResult && simulationResult.events ? simulationResult.events : [])
    .slice()
    .sort((a, b) => {
      const imp = (b.importance || 0) - (a.importance || 0);
      if (imp !== 0) return imp;
      return (a.day || 0) - (b.day || 0);
    });

  const heroes = (gameState && gameState.heroes ? gameState.heroes : []).slice();
  const deadHeroes = (gameState && gameState.deadHeroes ? gameState.deadHeroes : []).slice();

  // Group the events per hero.
  const byHero = new Map();
  for (const event of events) {
    if (!byHero.has(event.heroId)) byHero.set(event.heroId, []);
    byHero.get(event.heroId).push(event);
  }

  const perHeroSummaries = [];
  const idleHeroNames = [];

  for (const hero of heroes) {
    const heroEvents = (byHero.get(hero.id) || []).slice()
      .sort((a, b) => (b.importance || 0) - (a.importance || 0));
    const didNothingCount = heroEvents.filter((e) => e.type === 'did_nothing').length;
    if (didNothingCount > 0) idleHeroNames.push(hero.name);
    perHeroSummaries.push({
      heroId: hero.id,
      heroName: hero.name,
      star: hero.star,
      heroClass: hero.class,
      topEventImportance: heroEvents.length > 0 ? (heroEvents[0].importance || 0) : 0,
      events: heroEvents,
      didNothingCount,
      died: false,
      droppedItems: [],
    });
  }

  // Heroes who died while the player was away.
  const fallenHeroes = [];
  for (const dead of deadHeroes) {
    const deathEvent = events.find((e) => e.heroId === dead.id && e.type === 'died');
    const cause = deathEvent && deathEvent.details ? deathEvent.details.cause : dead.deathCause;
    const dropped = [];
    const equip = dead.equipment || {};
    for (const slot of ['weapon', 'offhand', 'armor']) {
      if (equip[slot]) dropped.push(equip[slot].name || 'gear');
    }
    fallenHeroes.push({
      heroId: dead.id,
      heroName: dead.name,
      cause: cause || 'Unknown',
      droppedItems: dropped,
    });
  }

  // The summary line.
  const countType = (type) => events.filter((e) => e.type === type).length;
  const trainedCount = countType('trained');
  const levelUpCount = countType('level_up');
  const combinedCount = countType('skill_combined');
  const iselleCount = countType('iselle_intervened');
  const lawCount = countType('law_broken');
  const diedCount = countType('died');
  const idleCount = countType('did_nothing');

  const parts = [];
  if (trainedCount > 0) parts.push(`${trainedCount} training session${trainedCount === 1 ? '' : 's'}`);
  if (levelUpCount > 0) parts.push(`${levelUpCount} level up${levelUpCount === 1 ? '' : 's'}`);
  if (combinedCount > 0) parts.push(`${combinedCount} skill combined`);
  if (iselleCount > 0) parts.push(`${iselleCount} Iselle intervention${iselleCount === 1 ? '' : 's'}`);
  if (lawCount > 0) parts.push(`${lawCount} broken law${lawCount === 1 ? '' : 's'}`);
  if (diedCount > 0) parts.push(`${diedCount} death${diedCount === 1 ? '' : 's'}`);
  if (idleCount > 0) parts.push(`${idleCount} ${idleCount === 1 ? 'hero' : 'heroes'} did nothing`);

  const summaryLine =
    parts.length > 0
      ? `While you were away: ${parts.join(', ')}.`
      : 'While you were away: nothing worth reporting. Suspiciously quiet.';

  const days = simulationResult ? simulationResult.days || 0 : 0;

  return {
    gameDaysSimulated: days,
    realHoursAway: days * TRAINING_CONFIG.REAL_HOURS_PER_GAME_DAY,
    startDay: gameState && gameState.dayCount ? gameState.dayCount - days : 0,
    endDay: gameState ? gameState.dayCount || 0 : 0,
    summaryLine,
    iselleQuote: null,
    sortedEvents: events,
    perHeroSummaries,
    idleHeroNames,
    fallenHeroes,
  };
}

/**
 * Runs the offline simulation for the time the player was away and builds the
 * report. Returns null when less than a full game day has passed.
 */
export function runOfflineLoginSimulation(gameState, nowTimestamp = Date.now(), options = {}) {
  const { isellePresent = true } = options;
  if (!gameState) return null;

  const lastLogin = gameState.lastLoginTimestamp || nowTimestamp;
  const gameDaysAway = computeGameDaysAway(lastLogin, nowTimestamp);
  if (gameDaysAway <= 0) {
    // Not even a full game day: keep the timestamp so the leftover hours
    // carry over to the next login.
    return null;
  }

  const seed = ((gameState.dayCount || 1) * 10007 + gameDaysAway * 997) >>> 0;
  const simulationResult = simulateMultipleDays(gameState, gameDaysAway, {
    mode: 'offline',
    seed,
    isellePresent,
  });

  // Consume exactly the simulated time so the remainder carries over.
  gameState.lastLoginTimestamp =
    lastLogin + gameDaysAway * TRAINING_CONFIG.REAL_HOURS_PER_GAME_DAY * MS_PER_HOUR;

  const report = buildIselleReportModel(simulationResult, gameState);
  report.seed = seed;
  report.hasIncident =
    report.sortedEvents.some(
      (e) =>
        e.type === 'law_broken' ||
        e.type === 'iselle_intervened' ||
        e.type === 'died' ||
        e.type === 'injured'
    );

  // Keep the last few reports so the roster can show the latest one.
  gameState.loginReportHistory = gameState.loginReportHistory || [];
  gameState.loginReportHistory.unshift(report);
  while (gameState.loginReportHistory.length > EMOTION_CONFIG.REPORT_HISTORY_MAX) {
    gameState.loginReportHistory.pop();
  }

  if (typeof gameState.saveToLocalStorage === 'function') {
    gameState.saveToLocalStorage();
  }

  return report;
}

export { handleHeroDeathAndDropGear };
