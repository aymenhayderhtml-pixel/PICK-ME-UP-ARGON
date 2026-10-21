// scripts/test_phase2_emotions.mjs
// Phase 2 verification: emotion mutations, panic, daily decision weights,
// squad leader orders, lobby law enforcement and the shared live/offline code
// path. Runs purely in Node with zero headless browser overhead.

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

// --- Test helpers ----------------------------------------------------------

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
    ...overrides,
  };
}

function makeFakeState(heroes, opts = {}) {
  const relations = opts.relations || {};
  const tensions = opts.tensions || {};
  return {
    dayCount: opts.dayCount ?? 1,
    foodQuality: opts.foodQuality || 'basic',
    heroes,
    facilities: { dormitory: { level: 1 } },
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
  };
}

async function run() {
  const { EMOTION_CONFIG } = await import('../src/data/emotions.config.js');
  const {
    isHeroPanicking,
    applyFearGain,
    applyDailyEmotionTick,
    applyEatOutcome,
    applyRestOutcome,
    evaluateSquadLeaderOrder,
    evaluateTensionFight,
  } = await import('../src/core/EmotionEngine.js');
  const { computeActivityWeights, chooseDailyActivity, simulateGameDay, simulateMultipleDays } =
    await import('../src/core/DailyDecisionEngine.js');
  const { gameState } = await import('../src/core/GameState.js');

  console.log('\n--- 1. FEAR SCALES BY MENTALITY ---');
  const fearless = makeHero({ mentality: 0, fear: 0 });
  const balanced = makeHero({ mentality: 50, fear: 0 });
  const steadfast = makeHero({ mentality: 100, fear: 0 });
  applyFearGain(fearless, 20);
  applyFearGain(balanced, 20);
  applyFearGain(steadfast, 20);
  check('Fear gain scales by (1 - mentality/100)',
    fearless.fear === 20 && balanced.fear === 10 && steadfast.fear === 0,
    `ment0=${fearless.fear} ment50=${balanced.fear} ment100=${steadfast.fear}`);

  console.log('\n--- 2. PANIC ---');
  const panicking = makeHero({ mentality: 25, fear: 70 });
  const calm = makeHero({ mentality: 60, fear: 70 });
  check('Panic triggers when mentality < 30 and fear > 60',
    isHeroPanicking(panicking) === true && isHeroPanicking(calm) === false);

  const panicWeights = computeActivityWeights(panicking, makeFakeState([panicking]));
  const calmWeights = computeActivityWeights(calm, makeFakeState([calm]));
  check('Panic zeroes the spar weight',
    panicWeights.spar === 0, `spar=${panicWeights.spar}`);
  check('Panic zeroes risky training (train_magic)',
    panicWeights.train_magic === 0, `train_magic=${panicWeights.train_magic}`);
  check('Panic keeps only a safe fraction of normal training',
    panicWeights.train_dummy < calmWeights.train_dummy &&
      panicWeights.train_dummy > 0,
    `panic=${panicWeights.train_dummy.toFixed(2)} calm=${calmWeights.train_dummy.toFixed(2)}`);

  console.log('\n--- 3. HIGH HUNGER ---');
  const hungry = makeHero({ hunger: 60, motivationScore: 60, anger: 0 });
  const tick = applyDailyEmotionTick(hungry, 'basic');
  check('High hunger lowers motivationScore and raises anger',
    hungry.motivationScore === 60 - EMOTION_CONFIG.HIGH_HUNGER_MOTIVATION_PENALTY &&
      hungry.anger === EMOTION_CONFIG.HIGH_HUNGER_ANGER_GAIN,
    `motivation=${hungry.motivationScore} anger=${hungry.anger}`);
  check('The daily tick raises hunger',
    tick.hungerGain === EMOTION_CONFIG.DAILY_HUNGER_GAIN, `+${tick.hungerGain}`);
  check('Hunger and satisfaction stay mirrored',
    hungry.satisfaction === 100 - hungry.hunger, `hunger=${hungry.hunger} satisfaction=${hungry.satisfaction}`);

  console.log('\n--- 4. CLASS AFFINITY WEIGHTS ---');
  const scout = makeHero({ id: 'scout', class: 'Scout' });
  const mage = makeHero({ id: 'mage', class: 'Mage' });
  const vanguard = makeHero({ id: 'vanguard', class: 'Vanguard' });
  const state = makeFakeState([scout, mage, vanguard]);
  const wScout = computeActivityWeights(scout, state);
  const wMage = computeActivityWeights(mage, state);
  const wVanguard = computeActivityWeights(vanguard, state);
  check('Class affinity weights favor bow for Scout, magic for Mage, dummy for Vanguard',
    wScout.train_archery > wScout.train_magic &&
      wMage.train_magic > wMage.train_dummy &&
      wVanguard.train_dummy > wVanguard.train_archery,
    `scout(arch=${wScout.train_archery.toFixed(1)},mag=${wScout.train_magic.toFixed(1)}) ` +
      `mage(arch=${wMage.train_archery.toFixed(1)},mag=${wMage.train_magic.toFixed(1)}) ` +
      `van(dum=${wVanguard.train_dummy.toFixed(1)},arch=${wVanguard.train_archery.toFixed(1)})`);

  console.log('\n--- 5. SQUAD LEADER ORDER ---');
  const leader = makeHero({ id: 'leader', name: 'Leader', isSquadLeader: true, motivationScore: 75 });
  const target = makeHero({ id: 'target', name: 'Target' });
  const orderState = makeFakeState([leader, target], { relations: { 'leader|target': 60 } });
  const order = evaluateSquadLeaderOrder(orderState, leader, [target], () => 0.5);
  check('Squad leader orders an idle hero to train and logs report event',
    order.ordered === true && order.targetId === 'target' &&
      order.reportEvent && order.reportEvent.type === 'leader_ordered',
    `accepted=${order.accepted}`);
  check('A high relationship makes the hero more likely to accept',
    order.accepted === true, `relation=60 accepted=${order.accepted}`);
  check('The leader cannot order themselves',
    evaluateSquadLeaderOrder(orderState, leader, [leader], () => 0.5).ordered === false);
  check('No idle heroes means no order',
    evaluateSquadLeaderOrder(orderState, leader, [], () => 0.5).ordered === false);

  console.log('\n--- 6. HOT-HEADED REFUSAL ---');
  const hotLeader = makeHero({ id: 'hot_leader', name: 'Hot Leader', isSquadLeader: true });
  const hotTarget = makeHero({
    id: 'hot_target',
    name: 'Hot Target',
    traits: ['hot_headed'],
    anger: 80,
  });
  const hotState = makeFakeState([hotLeader, hotTarget]);
  const hotOrder = evaluateSquadLeaderOrder(hotState, hotLeader, [hotTarget], () => 0.5);
  check('Hot-headed high-anger hero can refuse leader order and gain tension',
    hotOrder.accepted === false &&
      hotState.getTension('hot_leader', 'hot_target') === EMOTION_CONFIG.LEADER_ORDER_REFUSE_TENSION_GAIN &&
      hotTarget.anger === 80 + EMOTION_CONFIG.LEADER_ORDER_REFUSE_ANGER_GAIN,
    `accepted=${hotOrder.accepted} tension=${hotState.getTension('hot_leader', 'hot_target')} anger=${hotTarget.anger}`);

  console.log('\n--- 7. UNSANCTIONED FIGHT + ISELLE ---');
  const fighterA = makeHero({ id: 'a', name: 'Fighter A', anger: 80, motivationScore: 60 });
  const fighterB = makeHero({ id: 'b', name: 'Fighter B', anger: 10 });
  const fightState = makeFakeState([fighterA, fighterB], { tensions: { 'a|b': 40 } });
  const fight = evaluateTensionFight(fightState, fighterA, () => 0.5);
  check('High anger + high tension triggers unsanctioned fight and Iselle law penalty',
    fight.occurred === true &&
      fight.stoppedBy === 'iselle' &&
      fight.lawBroken === EMOTION_CONFIG.LOBBY_LAWS.NO_OUTSIDE_FIGHTING,
    `law=${fight.lawBroken}`);
  check('A broken law lowers the offender motivation',
    fighterA.motivationScore === 60 - EMOTION_CONFIG.LAW_BREAK_MOTIVATION_PENALTY,
    `motivation=${fighterA.motivationScore}`);
  check('The fight logs fought_hero, law_broken and iselle_intervened events',
    fight.reportEvents.map((e) => e.type).join(',') ===
      'fought_hero,law_broken,iselle_intervened',
    fight.reportEvents.map((e) => e.type).join(','));
  check('A calm hero does not start a fight',
    evaluateTensionFight(fightState, fighterB, () => 0.5).occurred === false);

  console.log('\n--- 8. IDLE / EAT / REST ARE SAFE ---');
  const safe = makeHero({ id: 'safe', stats: { str: 10, agi: 10, vit: 10, int: 10, wil: 10 } });
  const statsBefore = JSON.stringify(safe.stats);
  applyEatOutcome(safe, 'basic');
  check('Eating never causes injury, death or a stat penalty',
    safe.injury === null && safe.alive === true && JSON.stringify(safe.stats) === statsBefore);
  applyRestOutcome(safe, 1);
  check('Resting never causes injury, death or a stat penalty',
    safe.injury === null && safe.alive === true && JSON.stringify(safe.stats) === statsBefore);

  const idleState = makeFakeState([makeHero({ id: 'i1' }), makeHero({ id: 'i2' })]);
  const alwaysIdle = () => 0.9999;
  const idleReport = simulateGameDay(idleState, { mode: 'live', rng: alwaysIdle });
  const idleHero = idleState.heroes[0];
  check('Idle / Eat / Rest never cause injury, death or a stat penalty',
    idleState.heroes.every((h) => h.injury === null && h.alive === true) &&
      idleState.heroes.every((h) => h.stats.str === 10),
    `idleHeroes=${idleReport.idleHeroIds.length}`);

  console.log('\n--- 9. ONE CODE PATH (LIVE + OFFLINE) ---');
  const before = gameState.dayCount;
  const liveReport = gameState.startNewDay();
  check('GameState.startNewDay returns a day report and advances the day',
    liveReport && liveReport.mode === 'live' && gameState.dayCount === before + 1,
    `day ${before} -> ${gameState.dayCount}`);
  check('Every alive hero got a current activity from the shared engine',
    gameState.heroes.filter((h) => h.alive).every((h) => !!h.currentActivity),
    gameState.heroes.filter((h) => h.alive).map((h) => `${h.name}=${h.currentActivity}`).join(' '));

  const offState = makeFakeState([
    makeHero({ id: 'o1' }),
    makeHero({ id: 'o2' }),
    makeHero({ id: 'o3' }),
  ]);
  const multi = simulateMultipleDays(offState, 5, { seed: 1377 });
  check('simulateMultipleDays runs the same simulateGameDay for every day',
    multi.dayReports.length === 5 && multi.dayReports.every((d) => d.mode === 'offline') &&
      multi.events.length > 0,
    `${multi.events.length} events over 5 days`);
  check('The seeded simulation is deterministic',
    JSON.stringify(simulateMultipleDays(makeFakeState([
      makeHero({ id: 'o1' }), makeHero({ id: 'o2' }), makeHero({ id: 'o3' }),
    ]), 5, { seed: 1377 }).events) === JSON.stringify(multi.events));

  const chosen = chooseDailyActivity(makeHero({ id: 'c1' }), makeFakeState([makeHero({ id: 'c1' })]), () => 0);
  check('chooseDailyActivity always returns a valid activity',
    ['train_dummy', 'train_archery', 'train_magic', 'spar', 'eat', 'rest', 'idle'].includes(chosen.activity),
    chosen.activity);

  console.log('\n--- 10. CONSOLE INTEGRITY ---');
  check('Zero Console Errors', capturedErrors.length === 0, `Errors: ${capturedErrors.length}`);

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log('\n========================================================');
  console.log(`📋 PHASE 2 EMOTION & DECISION RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('========================================================\n');

  if (passed === total) {
    console.log('🎉 ALL PHASE 2 TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME PHASE 2 TESTS FAILED!');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unhandled Test Runner Exception:', err);
  process.exit(1);
});
