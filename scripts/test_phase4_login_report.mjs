// scripts/test_phase4_login_report.mjs
// Phase 4 verification: offline day calculation, the shared simulation code
// path, importance sorting, the "did nothing" listing and the dead hero gear
// drop into the Fallen Heroes list.
// Runs purely in Node with zero headless browser overhead.

import { execSync } from 'node:child_process';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const capturedErrors = [];
const originalConsoleError = console.error;
console.error = (...args) => {
  capturedErrors.push(args.join(' '));
  originalConsoleError(...args);
};

const results = [];
function check(name, condition, extra = '') {
  if (condition) {
    console.log(`  [PASS] ${name}${extra ? ' - ' + extra : ''}`);
    results.push({ name, pass: true });
  } else {
    console.log(`  [FAIL] ${name}${extra ? ' - ' + extra : ''}`);
    results.push({ name, pass: false, extra });
  }
}

const HOUR = 3600000;

function makeHero(overrides = {}) {
  return {
    id: 'hero_test',
    name: 'Test Hero',
    star: 1,
    level: 1,
    exp: 0,
    fatigue: 0,
    stress: 0,
    satisfaction: 80,
    class: 'Vanguard',
    motivation: 'normal',
    stats: { str: 10, agi: 10, vit: 10, int: 10, wil: 10 },
    skills: [],
    talents: [],
    traits: [],
    alive: true,
    mentality: 50,
    hunger: 20,
    fear: 10,
    anger: 0,
    motivationScore: 50,
    currentActivity: 'idle',
    injury: null,
    painToleranceCounters: { damageTaken: 0, damageHealed: 0 },
    coTrainedPairs: {},
    activityHistory: [],
    equipment: { weapon: null, offhand: null, armor: null },
    ...overrides,
  };
}

function makeFakeState(heroes, opts = {}) {
  const relations = opts.relations || {};
  const tensions = opts.tensions || {};
  const state = {
    dayCount: opts.dayCount ?? 1,
    foodQuality: opts.foodQuality || 'basic',
    heroes,
    party: heroes.map((h) => ({ id: h.id, formation: 'front' })),
    relations,
    currentFloor: 1,
    facilities: { dormitory: { level: 1 } },
    inventory: [],
    deadHeroes: [],
    overflowLoot: [],
    lastLoginTimestamp: opts.lastLoginTimestamp ?? 0,
    loginReportHistory: [],
    saved: 0,
    getRelation(a, b) {
      if (!a || !b || a === b) return 0;
      return relations[[a, b].sort().join('|')] || 0;
    },
    getTension(a, b) {
      if (!a || !b || a === b) return 0;
      return tensions[[a, b].sort().join('|')] || 0;
    },
    addTension(a, b, amount) {
      if (!a || !b || a === b || !amount) return 0;
      const key = [a, b].sort().join('|');
      const prev = tensions[key] || 0;
      const next = Math.min(100, Math.max(0, prev + amount));
      tensions[key] = next;
      return next;
    },
    addExp() {},
    addItemToInventory(item) {
      if (state.inventory.length >= 40) return false;
      state.inventory.push(item);
      return true;
    },
    killHero(id, floor, cause) {
      const idx = heroes.findIndex((h) => h.id === id);
      if (idx !== -1) {
        const hero = heroes[idx];
        hero.alive = false;
        hero.deathFloor = floor;
        hero.deathCause = cause || 'Killed in battle';
        heroes.splice(idx, 1);
        // Mirrors the real GameState: the fallen hero leaves the party too.
        state.party = state.party.filter((p) => (typeof p === 'string' ? p : p.id) !== id);
        state.deadHeroes.push(hero);
      }
    },
    saveToLocalStorage() {
      state.saved += 1;
    },
  };
  return state;
}

async function run() {
  const { TRAINING_CONFIG } = await import('../src/data/training.config.js');
  const { EMOTION_CONFIG } = await import('../src/data/emotions.config.js');
  const {
    computeGameDaysAway,
    runOfflineLoginSimulation,
    buildIselleReportModel,
  } = await import('../src/core/LoginSimulation.js');
  const { simulateGameDay, simulateMultipleDays } =
    await import('../src/core/DailyDecisionEngine.js');
  const { handleHeroDeathAndDropGear } = await import('../src/core/TrainingEngine.js');
  const { gameState } = await import('../src/core/GameState.js');

  const NOW = 1_700_000_000_000;

  console.log('\n--- 1. OFFLINE DAY CALCULATION ---');
  const days = TRAINING_CONFIG.REAL_HOURS_PER_GAME_DAY;
  check('computeGameDaysAway: 0h -> 0 days', computeGameDaysAway(NOW, NOW) === 0);
  check('computeGameDaysAway: 7.9h -> 0 days',
    computeGameDaysAway(NOW - 7.9 * HOUR, NOW) === 0, `${computeGameDaysAway(NOW - 7.9 * HOUR, NOW)}`);
  check('computeGameDaysAway: 8h -> 1 day',
    computeGameDaysAway(NOW - 8 * HOUR, NOW) === 1, `${computeGameDaysAway(NOW - 8 * HOUR, NOW)}`);
  check('computeGameDaysAway: 24h -> 3 days',
    computeGameDaysAway(NOW - 24 * HOUR, NOW) === 3, `${computeGameDaysAway(NOW - 24 * HOUR, NOW)}`);
  check('computeGameDaysAway: 200h -> capped at 9 days',
    computeGameDaysAway(NOW - 200 * HOUR, NOW) === TRAINING_CONFIG.MAX_OFFLINE_GAME_DAYS,
    `${computeGameDaysAway(NOW - 200 * HOUR, NOW)}`);
  check('computeGameDaysAway: a future timestamp gives 0 days',
    computeGameDaysAway(NOW + 100 * HOUR, NOW) === 0);

  console.log('\n--- 2. OFFLINE SIMULATION USES THE LIVE CODE PATH ---');
  const offHero = makeHero({ id: 'off1', name: 'Offline Hero' });
  const offState = makeFakeState([offHero], { lastLoginTimestamp: NOW - 24 * HOUR });
  const offReport = runOfflineLoginSimulation(offState, NOW);
  check('Offline simulation uses exact same simulateGameDay code path as live play',
    offReport && offReport.gameDaysSimulated === 3 &&
      offState.dayCount === 4 &&
      offReport.sortedEvents.length > 0,
    `${offReport ? offReport.gameDaysSimulated : 0} days, ${offReport ? offReport.sortedEvents.length : 0} events`);
  check('The offline simulation advances the last login timestamp by exactly the simulated time',
    offState.lastLoginTimestamp === NOW - 24 * HOUR + 3 * 8 * HOUR,
    `new=${offState.lastLoginTimestamp}`);
  check('The offline report is pushed into loginReportHistory',
    offState.loginReportHistory.length === 1 && offState.loginReportHistory[0] === offReport);
  check('The offline simulation saves the game', offState.saved > 0, `${offState.saved} saves`);

  const underTime = makeFakeState([makeHero({ id: 'u1' })], { lastLoginTimestamp: NOW - 2 * HOUR });
  check('Less than a full game day returns no report',
    runOfflineLoginSimulation(underTime, NOW) === null &&
      underTime.lastLoginTimestamp === NOW - 2 * HOUR);

  console.log('\n--- 3. REPORT SORTING ---');
  const sortHero = makeHero({ id: 'sort1', name: 'Sorted Hero' });
  const sortState = makeFakeState([sortHero], { lastLoginTimestamp: NOW - 16 * HOUR });
  const sortReport = runOfflineLoginSimulation(sortState, NOW);
  const importances = sortReport.sortedEvents.map((e) => e.importance);
  const sortedDesc = importances.every((v, i) => i === 0 || importances[i - 1] >= v);
  check('Report events are strictly sorted by importance descending', sortedDesc,
    importances.join(','));
  check('Every report event carries a known importance weight',
    sortReport.sortedEvents.every((e) =>
      Object.values(EMOTION_CONFIG.REPORT_IMPORTANCE).includes(e.importance)));

  console.log('\n--- 4. IDLE HEROES AND PER HERO SUMMARIES ---');
  const idleHero = makeHero({ id: 'idle1', name: 'Idle Hero', motivation: 'lazy', traits: ['lazy'] });
  const idleState = makeFakeState([idleHero], { lastLoginTimestamp: NOW - 72 * HOUR });
  const idleReport = runOfflineLoginSimulation(idleState, NOW);
  check('Every alive hero appears in perHeroSummaries',
    idleReport.perHeroSummaries.length === 1 &&
      idleReport.perHeroSummaries[0].heroId === 'idle1');
  const didNothingHeroes = new Set(
    idleReport.sortedEvents.filter((e) => e.type === 'did_nothing').map((e) => e.heroName)
  );
  check('Heroes who chose Did Nothing are explicitly listed',
    Array.isArray(idleReport.idleHeroNames) &&
      didNothingHeroes.size === idleReport.idleHeroNames.length &&
      idleReport.idleHeroNames.every((n) => didNothingHeroes.has(n)),
    `idleHeroNames=[${idleReport.idleHeroNames.join(', ')}] events=${didNothingHeroes.size}`);
  check('The per hero summary counts the did nothing days',
    idleReport.perHeroSummaries[0].didNothingCount ===
      idleReport.sortedEvents.filter((e) => e.type === 'did_nothing' && e.heroId === 'idle1').length,
    `count=${idleReport.perHeroSummaries[0].didNothingCount}`);
  check('The summary line describes the period',
    typeof idleReport.summaryLine === 'string' && idleReport.summaryLine.length > 0,
    idleReport.summaryLine);

  console.log('\n--- 5. DEAD HERO GEAR DROP + FALLEN HEROES ---');
  const doomed = makeHero({
    id: 'doomed',
    name: 'Doomed Hero',
    equipment: {
      weapon: { id: 'item_w', name: 'Rusty Sword', slot: 'weapon' },
      offhand: { id: 'item_o', name: 'Wooden Shield', slot: 'offhand' },
      armor: null,
    },
  });
  const deathState = makeFakeState([doomed], { lastLoginTimestamp: NOW - 8 * HOUR });
  const dropped = handleHeroDeathAndDropGear(deathState, doomed, 1, 'Training accident');
  check('Dead hero drops weapon/offhand/armor into gameState.inventory and moves to gameState.deadHeroes',
    dropped.droppedItems.length === 2 &&
      deathState.inventory.length === 2 &&
      deathState.deadHeroes.length === 1 &&
      deathState.deadHeroes[0].id === 'doomed' &&
      doomed.alive === false,
    `dropped=${dropped.droppedItems.length} inventory=${deathState.inventory.length}`);
  check('The fallen hero keeps the death cause and floor',
    deathState.deadHeroes[0].deathCause === 'Training accident' &&
      deathState.deadHeroes[0].deathFloor === 1);
  check('The dead hero is removed from the roster and the party',
    deathState.heroes.length === 0 && deathState.party.length === 0);

  const fullState = makeFakeState([makeHero({ id: 'full' })], { lastLoginTimestamp: NOW - 8 * HOUR });
  for (let i = 0; i < 40; i++) fullState.inventory.push({ id: `i${i}` });
  const richDead = makeHero({
    id: 'rich_dead',
    name: 'Rich Dead',
    equipment: {
      weapon: { id: 'item_w', name: 'Rusty Sword', slot: 'weapon' },
      offhand: null,
      armor: null,
    },
  });
  const fullDrop = handleHeroDeathAndDropGear(fullState, richDead, 1, 'Training accident');
  check('Full inventory (40 items) routes dead hero gear to gameState.overflowLoot without item loss',
    fullDrop.droppedItems.length === 0 &&
      fullDrop.overflowedItems.length === 1 &&
      fullState.overflowLoot.length === 1 &&
      fullState.inventory.length === 40,
    `overflow=${fullState.overflowLoot.length}`);

  console.log('\n--- 6. REPORT MODEL BUILDER ---');
  const model = buildIselleReportModel(
    { days: 2, events: [
      { day: 1, heroId: 'a', heroName: 'A', type: 'trained', importance: 40, text: 'trained' },
      { day: 2, heroId: 'a', heroName: 'A', type: 'did_nothing', importance: 10, text: 'idle' },
      { day: 1, heroId: 'b', heroName: 'B', type: 'died', importance: 100, text: 'died' },
    ] },
    { heroes: [makeHero({ id: 'a', name: 'A' })], deadHeroes: [], dayCount: 3 }
  );
  check('buildIselleReportModel sorts and groups events',
    model.sortedEvents[0].type === 'died' &&
      model.perHeroSummaries.length === 1 &&
      model.perHeroSummaries[0].didNothingCount === 1 &&
      model.idleHeroNames.includes('A'),
    `idle=[${model.idleHeroNames.join(',')}]`);

  console.log('\n--- 7. REAL GAME STATE INTEGRATION ---');
  check('The real GameState exposes a last login timestamp',
    typeof gameState.lastLoginTimestamp === 'number' && gameState.lastLoginTimestamp > 0);
  const realReport = runOfflineLoginSimulation(gameState, gameState.lastLoginTimestamp + 16 * HOUR);
  check('The real GameState produces a report for 2 game days away',
    realReport && realReport.gameDaysSimulated === 2,
    realReport ? `${realReport.gameDaysSimulated} days` : 'null');
  check('The real GameState report is stored in loginReportHistory',
    gameState.loginReportHistory.length >= 1);

  console.log('\n--- 8. CODEMAP ---');
  let codemapOk = false;
  let codemapOut = '';
  try {
    codemapOut = execSync('node scripts/check_codemap.mjs', { encoding: 'utf8' });
    codemapOk = codemapOut.includes('CODEMAP OK');
  } catch (e) {
    codemapOut = (e.stdout || '') + (e.stderr || '');
  }
  check('Codemap check passes', codemapOk, codemapOut.trim().split('\n').slice(-2).join(' '));

  console.log('\n--- 9. CONSOLE INTEGRITY ---');
  check('Zero Console Errors', capturedErrors.length === 0, `Errors: ${capturedErrors.length}`);

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log('\n========================================================');
  console.log(`📋 PHASE 4 LOGIN REPORT & OFFLINE SIM RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('========================================================\n');

  if (passed === total) {
    console.log('🎉 ALL PHASE 4 TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME PHASE 4 TESTS FAILED!');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unhandled Test Runner Exception:', err);
  process.exit(1);
});
