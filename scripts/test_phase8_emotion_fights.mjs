// scripts/test_phase8_emotion_fights.mjs
// Phase 2 test suite 2: the emotion-driven fight triggers, the pairing
// algorithm and the intervention rules.
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
    addItemToInventory(item) {
      return true;
    },
    killHero() {},
    saveToLocalStorage() {},
  };
}

async function run() {
  const { EMOTION_CONFIG } = await import('../src/data/emotions.config.js');
  const { simulateGameDay } = await import('../src/core/DailyDecisionEngine.js');
  const {
    checkHeroFightTrigger,
    pairAndResolveDailyFights,
    pairDailyFights,
    resolveSparringSession,
  } = await import('../src/core/TrainingEngine.js');

  console.log('\n--- 1. CONDITION A: ANGER + TENSION ---');
  {
    const a = makeHero({ id: 'a', name: 'Angry', anger: 75 });
    const b = makeHero({ id: 'b', name: 'Rival' });
    const state = makeFakeState([a, b], { tensions: { 'a|b': 40 } });
    const report = simulateGameDay(state, { mode: 'live', rng: () => 0.5 });
    const fight = report.fights[0];
    check('Condition A anger + tension triggers real fight stopped by Iselle',
      report.fights.length === 1 &&
        fight.exchanges >= 1 &&
        fight.totalDamage > 0 &&
        fight.stoppedBy === 'iselle' &&
        fight.lawBroken === EMOTION_CONFIG.LOBBY_LAWS.NO_OUTSIDE_FIGHTING,
      `fights=${report.fights.length} exchanges=${fight ? fight.exchanges : 0} stoppedBy=${fight ? fight.stoppedBy : 'none'}`);
  }

  console.log('\n--- 2. CONDITION B: FEAR + HUNGER ---');
  {
    const a = makeHero({ id: 'a', name: 'Frightened', anger: 10, fear: 60, hunger: 70 });
    const b = makeHero({ id: 'b', name: 'Bystander' });
    const state = makeFakeState([a, b]);
    const trigger = checkHeroFightTrigger(state, a);
    check('Condition B fear + hunger triggers desperation fight when anger is low',
      trigger.triggered === true &&
        trigger.reason === 'fear_hunger' &&
        trigger.opponent &&
        trigger.opponent.id === 'b',
      `reason=${trigger.reason} opponent=${trigger.opponent ? trigger.opponent.id : 'none'}`);

    const report = simulateGameDay(state, { mode: 'live', rng: () => 0.5 });
    const fight = report.fights[0];
    check('The fear + hunger fight is recorded with its trigger reason',
      !!fight && fight.triggerReason === 'fear_hunger' &&
        fight.reportEvents.some((e) => e.type === 'fought_hero' && /fear and hunger/.test(e.text)),
      fight ? fight.reportEvents.map((e) => e.text).join(' | ').slice(0, 120) : 'no fight');
  }

  console.log('\n--- 3. PAIRING ---');
  {
    const a = makeHero({ id: 'a', name: 'A', anger: 85 });
    const b = makeHero({ id: 'b', name: 'B', anger: 85 });
    const state = makeFakeState([a, b], { tensions: { 'a|b': 60 } });
    const fights = pairAndResolveDailyFights(state, [a, b], () => 0.5);
    check('pairing algorithm prevents mutual duplicate fights on same day',
      fights.length === 1,
      `fights=${fights.length}`);
  }

  console.log('\n--- 4. NO PARTNER ---');
  {
    const a = makeHero({ id: 'a', name: 'A', anger: 80 });
    const b = makeHero({ id: 'b', name: 'B', anger: 80 });
    const state = makeFakeState([a, b], { tensions: { 'a|b': 60 } });
    // Only one fight is allowed, so the second pairing has no partner.
    const pairs = pairDailyFights(state, [a, b]);
    check('a hero only fights once a day',
      pairs.length === 1,
      `pairs=${pairs.length}`);

    const c = makeHero({ id: 'c', name: 'C', anger: 80 });
    const state2 = makeFakeState([a, b, c], { tensions: { 'a|b': 60, 'a|c': 60, 'b|c': 60 } });
    const angerBefore = c.anger;
    const pairs2 = pairDailyFights(state2, [a, b, c]);
    check('unpaired third angry hero gains frustration anger instead of fighting twice',
      pairs2.length === 1 &&
        pairs2[0].heroA.id !== 'c' &&
        pairs2[0].heroB.id !== 'c' &&
        c.anger === angerBefore + EMOTION_CONFIG.FIGHT_NO_PARTNER_ANGER_GAIN,
      `pairs=${pairs2.length} c.anger=${c.anger} (was ${angerBefore})`);
  }

  console.log('\n--- 5. SQUAD LEADER INTERVENES FIRST ---');
  {
    const leader = makeHero({
      id: 'lead',
      name: 'Leader',
      isSquadLeader: true,
      class: 'Vanguard',
      stats: { str: 60, agi: 10, vit: 60, int: 10, wil: 10 },
    });
    const a = makeHero({ id: 'a', name: 'A', stats: { str: 2, agi: 1, vit: 2, int: 1, wil: 1 } });
    const b = makeHero({ id: 'b', name: 'B', stats: { str: 2, agi: 1, vit: 2, int: 1, wil: 1 } });
    const state = makeFakeState([leader, a, b]);
    const spar = resolveSparringSession(a, b, state, {
      rng: () => 0.1,
      leader,
      leaderDistance: 3.0,
    });
    check('Squad Leader intervenes before Iselle when stronger and nearby',
      spar.stoppedBy === 'leader' && spar.stopReason === 'leader_stopped',
      `stoppedBy=${spar.stoppedBy} reason=${spar.stopReason}`);
  }

  console.log('\n--- 6. CONSOLE INTEGRITY ---');
  check('Zero Console Errors', capturedErrors.length === 0, `Errors: ${capturedErrors.length}`);

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log('\n========================================================');
  console.log(`📋 PHASE 8 EMOTION FIGHTS RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('========================================================\n');

  if (passed === total) {
    console.log('🎉 ALL PHASE 8 TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME PHASE 8 TESTS FAILED!');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unhandled Test Runner Exception:', err);
  process.exit(1);
});
