// scripts/test_phase9_consequences_and_report.mjs
// Phase 2 test suite 3: the consequences of a fight and their appearance in
// the login report.
// Runs purely in Node with zero headless browser overhead.

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

function makeHero(overrides = {}) {
  return {
    id: 'hero_test',
    name: 'Test Hero',
    star: 1,
    level: 1,
    exp: 0,
    fatigue: 0,
    stress: 0,
    class: 'Vanguard',
    motivation: 'normal',
    stats: { str: 10, agi: 10, vit: 10, int: 10, wil: 10 },
    skills: [{ id: 'basic_swordsmanship', level: 1, exp: 0 }],
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
    equipment: { weapon: { weaponType: 'sword', grade: 'D' }, offhand: null, armor: null },
    ...overrides,
  };
}

function makeFakeState(heroes, opts = {}) {
  const relations = opts.relations || {};
  const tensions = opts.tensions || {};
  return {
    dayCount: opts.dayCount ?? 1,
    foodQuality: 'basic',
    heroes,
    party: heroes.map((h) => ({ id: h.id, formation: 'front' })),
    relations,
    currentFloor: 1,
    facilities: { dormitory: { level: 1 }, training: { level: 1 } },
    inventory: [],
    deadHeroes: [],
    overflowLoot: [],
    trainingSlots: [null, null, null],
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
    addIntimacy(a, b, amount) {
      if (!a || !b || a === b || !amount) return 0;
      const key = [a, b].sort().join('|');
      const prev = relations[key] || 0;
      const next = Math.min(100, Math.max(0, prev + amount));
      relations[key] = next;
      return next;
    },
    addExp() {},
    addItemToInventory() {
      return true;
    },
    killHero() {},
    saveToLocalStorage() {},
  };
}

async function run() {
  const { EMOTION_CONFIG } = await import('../src/data/emotions.config.js');
  const { simulateMultipleDays } = await import('../src/core/DailyDecisionEngine.js');
  const { resolveEmotionFight, resolveSparringSession } =
    await import('../src/core/TrainingEngine.js');
  const { buildIselleReportModel } = await import('../src/core/LoginSimulation.js');

  console.log('\n--- 1. UNSANCTIONED FIGHT CONSEQUENCES ---');
  {
    const a = makeHero({ id: 'a', name: 'A', anger: 80, motivationScore: 60 });
    // B is much weaker, so A must win the bout.
    const b = makeHero({
      id: 'b', name: 'B',
      stats: { str: 1, agi: 1, vit: 1, int: 1, wil: 1 },
    });
    const state = makeFakeState([a, b], { tensions: { 'a|b': 40 }, relations: { 'a|b': 50 } });
    const fight = resolveEmotionFight(a, b, state, { rng: () => 0.1, triggerReason: 'anger_rival' });

    check('unsanctioned fight decreases intimacy, increases tension, and penalizes offender motivation',
      state.getRelation('a', 'b') === 50 + EMOTION_CONFIG.FIGHT_UNSANCTIONED_INTIMACY_DELTA &&
        state.getTension('a', 'b') === 40 + EMOTION_CONFIG.FIGHT_UNSANCTIONED_TENSION_GAIN &&
        fight.lawBroken === EMOTION_CONFIG.LOBBY_LAWS.NO_OUTSIDE_FIGHTING &&
        a.motivationScore <= 60 - EMOTION_CONFIG.LAW_BREAK_MOTIVATION_PENALTY +
          EMOTION_CONFIG.FIGHT_WIN_MOTIVATION_GAIN,
      `intimacy=${state.getRelation('a', 'b')} tension=${state.getTension('a', 'b')} motivation=${a.motivationScore}`);
    check('the fight records the new report event types',
      fight.reportEvents.some((e) => e.type === 'fought_hero') &&
        fight.reportEvents.some((e) => e.type === 'fight_ended') &&
        fight.reportEvents.some((e) => e.type === 'law_broken') &&
        fight.reportEvents.some((e) => e.type === 'iselle_intervened'),
      fight.reportEvents.map((e) => e.type).join(','));
    check('the fight leaves a winner and a loser',
      fight.winnerId === 'a' && fight.loserId === 'b',
      `winner=${fight.winnerId} loser=${fight.loserId}`);
  }

  console.log('\n--- 2. CLEAN SANCTIONED SPAR ---');
  {
    const a = makeHero({ id: 'a', name: 'A' });
    const b = makeHero({ id: 'b', name: 'B' });
    const state = makeFakeState([a, b], { relations: { 'a|b': 50 }, tensions: { 'a|b': 20 } });
    const spar = resolveSparringSession(a, b, state, { rng: () => 0.1 });

    check('clean sanctioned spar increases intimacy and reduces tension',
      state.getRelation('a', 'b') === 50 + EMOTION_CONFIG.FIGHT_CLEAN_SPAR_INTIMACY_GAIN &&
        state.getTension('a', 'b') === 20 + EMOTION_CONFIG.FIGHT_CLEAN_SPAR_TENSION_DELTA,
      `intimacy=${state.getRelation('a', 'b')} tension=${state.getTension('a', 'b')}`);
    check('a clean spar reports a sanctioned bout',
      spar.reportEvents.some((e) => e.type === 'sanctioned_bout') &&
        !spar.reportEvents.some((e) => e.type === 'law_broken'),
      spar.reportEvents.map((e) => e.type).join(','));
  }

  console.log('\n--- 3. LOGIN REPORT MODEL ---');
  {
    const a = makeHero({ id: 'a', name: 'A', anger: 80 });
    const b = makeHero({ id: 'b', name: 'B' });
    const state = makeFakeState([a, b], { tensions: { 'a|b': 40 } });
    const sim = simulateMultipleDays(state, 2, { seed: 4242 });
    const model = buildIselleReportModel(sim, state);

    check('login report model includes fightsSummary and new event types',
      model.fightsSummary.length >= 1 &&
        model.summaryLine.includes('unsanctioned fight') &&
        model.sortedEvents.some((e) => e.type === 'fought_hero') &&
        model.sortedEvents.some((e) => e.type === 'fight_ended') &&
        model.sortedEvents.some((e) => e.type === 'law_broken') &&
        model.sortedEvents.some((e) => e.type === 'iselle_intervened'),
      `fights=${model.fightsSummary.length} summary="${model.summaryLine}"`);
    check('the fights summary carries the emotional cost of the fight',
      model.fightsSummary[0].intimacyDelta === EMOTION_CONFIG.FIGHT_UNSANCTIONED_INTIMACY_DELTA &&
        model.fightsSummary[0].tensionDelta === EMOTION_CONFIG.FIGHT_UNSANCTIONED_TENSION_GAIN &&
        model.fightsSummary[0].stoppedBy === 'iselle',
      JSON.stringify(model.fightsSummary[0]));
  }

  console.log('\n--- 4. 30-DAY HOT HEADED SIMULATION ---');
  {
    const hot = makeHero({
      id: 'hot',
      name: 'Hot Head',
      traits: ['hot_headed'],
      anger: 75,
      motivationScore: 60,
    });
    const other = makeHero({ id: 'other', name: 'Other' });
    const state = makeFakeState([hot, other], { tensions: { 'hot|other': 35 } });
    const tensionBefore = state.getTension('hot', 'other');

    const sim = simulateMultipleDays(state, 30, { seed: 1377 });
    const model = buildIselleReportModel(sim, state);
    const tensionAfter = state.getTension('hot', 'other');

    check('30-day simulation with hot-headed hero triggers fights and escalates rivalry tension',
      model.fightsSummary.length >= 1 && tensionAfter > tensionBefore,
      `fights=${model.fightsSummary.length} tension ${tensionBefore} -> ${tensionAfter}`);
    check('the hot headed hero ends the month less motivated and the rivalry maxed out',
      hot.motivationScore < 60 && tensionAfter === 100,
      `anger=${hot.anger} motivation=${hot.motivationScore} tension=${tensionAfter}`);
  }

  console.log('\n--- 5. CONSOLE INTEGRITY ---');
  check('Zero Console Errors', capturedErrors.length === 0, `Errors: ${capturedErrors.length}`);

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log('\n========================================================');
  console.log(`📋 PHASE 9 CONSEQUENCES & REPORT RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('========================================================\n');

  if (passed === total) {
    console.log('🎉 ALL PHASE 9 TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME PHASE 9 TESTS FAILED!');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unhandled Test Runner Exception:', err);
  process.exit(1);
});
