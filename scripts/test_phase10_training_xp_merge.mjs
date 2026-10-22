// scripts/test_phase10_training_xp_merge.mjs
// Phase 2 test suite 4: the merged training XP path and its save migration.
// Runs purely in Node with zero headless browser overhead.

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

const SAVE_KEY = 'pickmeup_save_v1';

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
    equipment: { weapon: null, offhand: null, armor: null },
    ...overrides,
  };
}

async function run() {
  const { TRAINING_CONFIG } = await import('../src/data/training.config.js');
  const { awardLiveTrainingTickXp } = await import('../src/core/TrainingEngine.js');

  const fakeGameState = {
    trainingSlots: [null, null, null],
    facilities: { training: { level: 1 } },
  };

  console.log('\n--- 1. DOUBLE XP IS BLOCKED ---');
  {
    const hero = makeHero();
    const first = awardLiveTrainingTickXp(hero, 'dummy', 'basic_swordsmanship', fakeGameState, 1000);
    const second = awardLiveTrainingTickXp(hero, 'dummy', 'basic_swordsmanship', fakeGameState, 2500);
    const expected = TRAINING_CONFIG.LIVE_ACTION_XP_PER_HIT.dummy * TRAINING_CONFIG.LIVE_TRAINING_HITS_PER_TICK;
    check('awardLiveTrainingTickXp blocks double XP within 5-second window',
      first.awarded === true && first.xpGained === expected &&
        second.awarded === false && second.reason === 'cooldown' && second.xpGained === 0,
      `first=${first.xpGained} second=${second.xpGained} reason=${second.reason}`);
    check('the hero only gained the XP once',
      hero.skills.find((s) => s.id === 'basic_swordsmanship').exp === expected,
      `exp=${hero.skills.find((s) => s.id === 'basic_swordsmanship').exp}`);
  }

  console.log('\n--- 2. XP AWARDS AGAIN AFTER THE INTERVAL ---');
  {
    const hero = makeHero();
    const first = awardLiveTrainingTickXp(hero, 'dummy', 'basic_swordsmanship', fakeGameState, 1000);
    const second = awardLiveTrainingTickXp(hero, 'dummy', 'basic_swordsmanship', fakeGameState, 6100);
    const expected = TRAINING_CONFIG.LIVE_ACTION_XP_PER_HIT.dummy * TRAINING_CONFIG.LIVE_TRAINING_HITS_PER_TICK;
    check('awardLiveTrainingTickXp awards again after 5-second interval',
      first.awarded === true && second.awarded === true &&
        hero.skills.find((s) => s.id === 'basic_swordsmanship').exp === expected * 2,
      `xp=${hero.skills.find((s) => s.id === 'basic_swordsmanship').exp}`);
    check('fatigue is added once per awarded tick',
      hero.fatigue === TRAINING_CONFIG.LIVE_TRAINING_FATIGUE_PER_TICK * 2,
      `fatigue=${hero.fatigue}`);
  }

  console.log('\n--- 3. THE MANUAL SLOT PINS THE SKILL ---');
  {
    const hero = makeHero();
    const state = {
      trainingSlots: [{ heroId: hero.id, skillId: 'basic_shield_technique', expGained: 0 }],
      facilities: { training: { level: 1 } },
    };
    const result = awardLiveTrainingTickXp(hero, 'dummy', 'basic_swordsmanship', state, 1000);
    check('a manual training slot pins the skill that is trained',
      result.awarded === true && result.skillId === 'basic_shield_technique' &&
        state.trainingSlots[0].expGained === result.xpGained,
      `skillId=${result.skillId} slotExp=${state.trainingSlots[0].expGained}`);
  }

  console.log('\n--- 4. THE SAVE MIGRATION ---');
  {
    const legacySave = {
      masterName: 'Tester',
      gold: 500,
      gems: 0,
      heroes: [
        {
          id: 'hero_han',
          name: 'Han Islat',
          star: 1,
          level: 1,
          exp: 0,
          fatigue: 0,
          stress: 0,
          class: 'Vanguard',
          motivation: 'diligent',
          stats: { str: 7, agi: 7, vit: 8, int: 5, wil: 12 },
          skills: [{ id: 'basic_swordsmanship', level: 1, exp: 0 }],
          talents: [],
          traits: [],
          alive: true,
          equipment: { weapon: null, offhand: null, armor: null },
        },
      ],
      party: [{ id: 'hero_han', formation: 'front' }],
      // Slot 0 is valid, slot 1 points at a hero that no longer exists.
      trainingSlots: [
        { heroId: 'hero_han', skillId: 'basic_swordsmanship', expGained: 12 },
        { heroId: 'hero_deleted', skillId: 'basic_archery', expGained: 30 },
      ],
      dayCount: 3,
      dayTimer: 0,
      foodQuality: 'basic',
      relations: {},
      flags: {},
    };
    store.set(SAVE_KEY, JSON.stringify(legacySave));

    const reloaded = (await import('../src/core/GameState.js?reload=1')).gameState;
    check('trainingXpMigrationV1 cleans stale slots and sets flag',
      reloaded.flags.trainingXpMigrationV1 === true &&
        reloaded.trainingSlots[0] &&
        reloaded.trainingSlots[0].heroId === 'hero_han' &&
        reloaded.trainingSlots[1] === null,
      `slot0=${reloaded.trainingSlots[0] ? reloaded.trainingSlots[0].heroId : 'null'} slot1=${reloaded.trainingSlots[1]}`);
  }

  console.log('\n--- 5. CONSOLE INTEGRITY ---');
  check('Zero Console Errors', capturedErrors.length === 0, `Errors: ${capturedErrors.length}`);

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log('\n========================================================');
  console.log(`📋 PHASE 10 TRAINING XP MERGE RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('========================================================\n');

  if (passed === total) {
    console.log('🎉 ALL PHASE 10 TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME PHASE 10 TESTS FAILED!');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unhandled Test Runner Exception:', err);
  process.exit(1);
});
