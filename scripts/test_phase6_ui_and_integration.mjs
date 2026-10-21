// scripts/test_phase6_ui_and_integration.mjs
// Phase 6 verification: the roster display model, the save/reload roundtrip of
// every new field, and the full 6 phase integration.
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

async function run() {
  const { getHeroEmotionDisplayModel } = await import('../src/ui/RosterEmotionPanel.js');
  const { TRAINING_CONFIG } = await import('../src/data/training.config.js');
  const { EMOTION_CONFIG } = await import('../src/data/emotions.config.js');
  const { gameState } = await import('../src/core/GameState.js');

  console.log('\n--- 1. ROSTER DISPLAY MODEL ---');
  const model = getHeroEmotionDisplayModel(makeHero());
  const barKeys = model.bars.map((b) => b.key);
  check('getHeroEmotionDisplayModel returns all 6 bars (hunger, fear, anger, motivation, fatigue, mentality) clamped 0..100',
    barKeys.length === 6 &&
      ['hunger', 'fear', 'anger', 'motivation', 'fatigue', 'mentality'].every((k) => barKeys.includes(k)) &&
      model.bars.every((b) => b.value >= 0 && b.value <= 100),
    barKeys.join(','));
  check('Bars out of range are clamped',
    getHeroEmotionDisplayModel(makeHero({ hunger: 500, fear: -50 })).bars
      .filter((b) => b.key === 'hunger' || b.key === 'fear')
      .every((b) => b.value >= 0 && b.value <= 100));
  check('The current activity is shown',
    model.activityLabel === 'IDLE' &&
      getHeroEmotionDisplayModel(makeHero({ currentActivity: 'spar' })).activityLabel === 'SPARRING',
    model.activityLabel);
  check('A panicking hero is flagged',
    getHeroEmotionDisplayModel(makeHero({ mentality: 20, fear: 80 })).isPanicking === true);
  check('The squad leader is flagged',
    getHeroEmotionDisplayModel(makeHero({ isSquadLeader: true })).isSquadLeader === true);
  check('An injury is described',
    getHeroEmotionDisplayModel(
      makeHero({ injury: { zone: 'head', severity: 'serious', daysRemaining: 2, healRateMult: 0.15 } })
    ).injuryText === 'SERIOUS HEAD INJURY (2d left)',
    getHeroEmotionDisplayModel(
      makeHero({ injury: { zone: 'head', severity: 'serious', daysRemaining: 2, healRateMult: 0.15 } })
    ).injuryText);

  console.log('\n--- 2. MERGED SKILLS AND PAIN TOLERANCE ---');
  const mergedHero = makeHero({
    skills: [
      { id: 'basic_swordsmanship', name: 'Basic Swordsmanship', level: 2, exp: 0, merged: true, mergedInto: 'basic_sword_shield' },
      { id: 'basic_shield_technique', name: 'Basic Shield Technique', level: 1, exp: 0, merged: true, mergedInto: 'basic_sword_shield' },
      { id: 'basic_sword_shield', name: 'Basic Sword-Shield', level: 3, exp: 0 },
      { id: 'pain_tolerance', name: 'Pain Tolerance', level: 4, exp: 0 },
    ],
    painToleranceCounters: { damageTaken: 250, damageHealed: 180 },
  });
  const mergedModel = getHeroEmotionDisplayModel(mergedHero);
  const byId = Object.fromEntries(mergedModel.skills.map((s) => [s.id, s]));
  check('getHeroEmotionDisplayModel marks merged parent skills and combined recipe skills accurately',
    byId.basic_swordsmanship.isMerged === true &&
      byId.basic_swordsmanship.mergedIntoName === 'BASIC SWORD SHIELD' &&
      byId.basic_shield_technique.isMerged === true &&
      byId.basic_sword_shield.isCombined === true &&
      byId.basic_sword_shield.isMerged === false,
    `swordShield.isCombined=${byId.basic_sword_shield.isCombined}`);
  check('getHeroEmotionDisplayModel formats Pain Tolerance level, DR%, and counter thresholds',
    mergedModel.painTolerance.unlocked === true &&
      mergedModel.painTolerance.level === 4 &&
      mergedModel.painTolerance.damageReductionPct === '6.0%' &&
      mergedModel.painTolerance.damageTaken === 250 &&
      mergedModel.painTolerance.nextThreshold === TRAINING_CONFIG.PAIN_TOLERANCE_THRESHOLD_PER_LEVEL * 5,
    `lv${mergedModel.painTolerance.level} dr=${mergedModel.painTolerance.damageReductionPct} next=${mergedModel.painTolerance.nextThreshold}`);
  check('A hero with no skills and no history does not throw',
    (() => {
      const m = getHeroEmotionDisplayModel(makeHero());
      return m.skills.length === 0 && m.recentHistory.length === 0;
    })());
  check('The activity history keeps the last 5 entries, newest first',
    (() => {
      const h = makeHero({
        activityHistory: Array.from({ length: 8 }, (_, i) => ({ day: i + 1, text: `act ${i + 1}`, type: 'trained' })),
      });
      const hist = getHeroEmotionDisplayModel(h).recentHistory;
      return hist.length === 5 && hist[0].day === 8;
    })());

  console.log('\n--- 3. SAVE / RELOAD ROUNDTRIP ---');
  const han = gameState.heroes.find((h) => h.id === 'hero_han');
  han.mentality = 63;
  han.hunger = 41;
  han.fear = 27;
  han.anger = 12;
  han.motivationScore = 70;
  han.traits = ['diligent', 'picky'];
  han.isSquadLeader = true;
  han.currentActivity = 'train_dummy';
  han.painToleranceCounters = { damageTaken: 300, damageHealed: 220 };
  han.coTrainedPairs = { 'basic_shield_technique|basic_swordsmanship': 4 };
  han.activityHistory = [{ day: 3, text: 'trained at the dummies', type: 'trained' }];
  han.skills = [
    { id: 'basic_swordsmanship', name: 'Basic Swordsmanship', level: 2, exp: 0, merged: true, mergedInto: 'basic_sword_shield' },
    { id: 'basic_shield_technique', name: 'Basic Shield Technique', level: 1, exp: 0, merged: true, mergedInto: 'basic_sword_shield' },
    { id: 'basic_sword_shield', name: 'Basic Sword-Shield', level: 3, exp: 0 },
  ];
  gameState.tensions = { 'hero_han|hero_jenna': 44 };
  gameState.lastLoginTimestamp = 1700000000000;
  gameState.loginReportHistory = [{ summaryLine: 'While you were away: 1 training session.', gameDaysSimulated: 1 }];
  gameState.saveToLocalStorage();

  const reloaded = (await import('../src/core/GameState.js?reload=1')).gameState;
  const han2 = reloaded.heroes.find((h) => h.id === 'hero_han');
  check('Save -> Reload roundtrip preserves emotions, mentality, merged skills, Pain Tolerance, tensions, and report history',
    han2.mentality === 63 &&
      han2.hunger === 41 &&
      han2.fear === 27 &&
      han2.anger === 12 &&
      han2.motivationScore === 70 &&
      han2.isSquadLeader === true &&
      han2.currentActivity === 'train_dummy' &&
      han2.painToleranceCounters.damageTaken === 300 &&
      han2.coTrainedPairs['basic_shield_technique|basic_swordsmanship'] === 4 &&
      han2.activityHistory.length === 1 &&
      han2.skills.find((s) => s.id === 'basic_swordsmanship').merged === true &&
      han2.skills.find((s) => s.id === 'basic_swordsmanship').mergedInto === 'basic_sword_shield' &&
      han2.skills.find((s) => s.id === 'basic_sword_shield').level === 3 &&
      reloaded.tensions['hero_han|hero_jenna'] === 44 &&
      reloaded.loginReportHistory.length === 1 &&
      reloaded.lastLoginTimestamp === 1700000000000,
    `mentality=${han2.mentality} hunger=${han2.hunger} skills=${han2.skills.length}`);

  console.log('\n--- 4. FULL 6 PHASE INTEGRATION ---');
  const { simulateMultipleDays } = await import('../src/core/DailyDecisionEngine.js');
  const { resolveTrainingSession } = await import('../src/core/TrainingEngine.js');
  const { runOfflineLoginSimulation } = await import('../src/core/LoginSimulation.js');

  const integrationHero = makeHero({
    id: 'integration',
    name: 'Integration Hero',
    skills: [{ id: 'basic_swordsmanship', level: 1, exp: 0 }],
  });
  const state = {
    dayCount: 1,
    foodQuality: 'basic',
    heroes: [integrationHero],
    party: [{ id: 'integration', formation: 'front' }],
    relations: {},
    currentFloor: 1,
    facilities: { dormitory: { level: 1 } },
    inventory: [],
    deadHeroes: [],
    overflowLoot: [],
    lastLoginTimestamp: 1700000000000 - 24 * 3600000,
    loginReportHistory: [],
    getRelation: () => 0,
    getTension: () => 0,
    addTension: () => 0,
    addExp: () => {},
    addItemToInventory: (i) => { state.inventory.push(i); return true; },
    killHero: () => {},
    saveToLocalStorage: () => {},
  };

  const multi = simulateMultipleDays(state, 5, { seed: 4242 });
  const report = runOfflineLoginSimulation(state, 1700000000000);
  check('All six phases work together: simulate -> train -> offline report',
    multi.events.length > 0 && report && report.gameDaysSimulated === 3 &&
      typeof report.summaryLine === 'string' && report.summaryLine.length > 0,
    `sim=${multi.events.length} events, report=${report ? report.gameDaysSimulated : 0} days`);
  check('The training engine and the decision engine agree on the activity names',
    (() => {
      const names = new Set();
      for (const d of multi.dayReports) {
        for (const a of d.activities) names.add(a.activity);
      }
      for (const name of names) {
        if (!['train_dummy', 'train_archery', 'train_magic', 'spar', 'eat', 'rest', 'idle'].includes(name)) {
          return false;
        }
      }
      return names.size > 0;
    })(),
    [...new Set(multi.dayReports.flatMap((d) => d.activities.map((a) => a.activity)))].join(','));

  const session = resolveTrainingSession(integrationHero, 'train_dummy', state, { rng: () => 0.4 });
  check('A training session awards skill XP and reports the outcome',
    session && session.skillXp > 0 && !!session.outcome,
    `xp=${session ? session.skillXp : 0} outcome=${session ? session.outcome : 'none'}`);

  console.log('\n--- 5. CODEMAP ---');
  let codemapOk = false;
  let codemapOut = '';
  try {
    codemapOut = execSync('node scripts/check_codemap.mjs', { encoding: 'utf8' });
    codemapOk = codemapOut.includes('CODEMAP OK');
  } catch (e) {
    codemapOut = (e.stdout || '') + (e.stderr || '');
  }
  check('check_codemap.mjs prints CODEMAP OK', codemapOk, codemapOut.trim().split('\n').slice(-2).join(' '));

  console.log('\n--- 6. CONSOLE INTEGRITY ---');
  check('Zero Console Errors', capturedErrors.length === 0, `Errors: ${capturedErrors.length}`);

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log('\n========================================================');
  console.log(`📋 PHASE 6 ROSTER UI & FULL INTEGRATION RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('========================================================\n');

  if (passed === total) {
    console.log('🎉 ALL PHASE 6 TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME PHASE 6 TESTS FAILED!');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unhandled Test Runner Exception:', err);
  process.exit(1);
});
