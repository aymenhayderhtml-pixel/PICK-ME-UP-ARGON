// scripts/test_phase1_migration.mjs
// Phase 1 verification: emotion / training data model, star multiplier,
// squad leader assignment and the old-save migration path.
// Runs purely in Node with zero headless browser overhead.

import { execSync } from 'node:child_process';

// A minimal localStorage so GameState can save/load inside Node.
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

async function run() {
  const { getStarMultiplier } = await import('../src/data/rules.js');
  const { EMOTION_CONFIG, getDefaultMentality, getDefaultMotivationScore } =
    await import('../src/data/emotions.config.js');
  const { gameState } = await import('../src/core/GameState.js');

  console.log('\n--- 1. STAR MULTIPLIER ---');
  check('Star Multiplier 1-Star is 1.00', getStarMultiplier(1) === 1.0, `${getStarMultiplier(1)}`);
  check(
    'Star Multiplier 3-Star is 1.167',
    Math.abs(getStarMultiplier(3) - 1.1667) < 0.01,
    `${getStarMultiplier(3)}`
  );
  check('Star Multiplier 7-Star is 1.50', getStarMultiplier(7) === 1.5, `${getStarMultiplier(7)}`);
  check(
    'Star Multiplier is monotonic and bounded 1.00..1.50',
    getStarMultiplier(7) > getStarMultiplier(3) &&
      getStarMultiplier(3) > getStarMultiplier(1) &&
      getStarMultiplier(1) >= 1.0 &&
      getStarMultiplier(7) <= 1.5
  );

  console.log('\n--- 2. NEW GAME EMOTION FIELDS ---');
  const inRange = (v) => typeof v === 'number' && v >= 0 && v <= 100;
  const allFieldsPresent = gameState.heroes.every(
    (h) =>
      inRange(h.mentality) &&
      inRange(h.hunger) &&
      inRange(h.fear) &&
      inRange(h.anger) &&
      inRange(h.motivationScore) &&
      h.currentActivity === 'idle' &&
      h.injury === null &&
      h.painToleranceCounters &&
      h.painToleranceCounters.damageTaken === 0 &&
      h.painToleranceCounters.damageHealed === 0 &&
      h.coTrainedPairs &&
      typeof h.coTrainedPairs === 'object' &&
      Array.isArray(h.activityHistory) &&
      Array.isArray(h.traits)
  );
  check(
    'New Game initializes Emotion & Training fields on all heroes',
    allFieldsPresent,
    `${gameState.heroes.length} heroes`
  );

  const traitOk = gameState.heroes.every((h) =>
    h.traits.some((t) => EMOTION_CONFIG.PERSONALITY_TRAITS.includes(t))
  );
  check('Every hero rolled at least one personality trait', traitOk);

  const mirrorOk = gameState.heroes.every(
    (h) => h.stress === h.anger && h.satisfaction === Math.max(0, Math.min(100, 100 - h.hunger))
  );
  check('Legacy stress/satisfaction mirror anger/hunger', mirrorOk);

  check(
    'Mentality default follows class and star',
    getDefaultMentality('Vanguard', 1) === 55 &&
      getDefaultMentality('Vanguard', 3) === 61 &&
      getDefaultMentality('Novice', 1) === 42
  );
  check(
    'Motivation score maps the legacy string motivation',
    getDefaultMotivationScore('diligent') === 75 &&
      getDefaultMotivationScore('normal') === 50 &&
      getDefaultMotivationScore('lazy') === 25
  );

  console.log('\n--- 3. SQUAD LEADER ---');
  const leaders = gameState.heroes.filter((h) => h.isSquadLeader);
  check('Han is default Squad Leader', leaders.length === 1 && leaders[0].id === 'hero_han',
    leaders.map((l) => l.name).join(',') || 'none');
  check('ensureSquadLeader is idempotent', (() => {
    gameState.ensureSquadLeader();
    const again = gameState.heroes.filter((h) => h.isSquadLeader);
    return again.length === 1 && again[0].id === 'hero_han';
  })());

  console.log('\n--- 4. TENSION / RELATIONSHIP CLAMPING ---');
  const a = gameState.heroes[0].id;
  const b = gameState.heroes[1].id;
  gameState.addTension(a, b, 40);
  check('Tension is stored under the sorted id key', gameState.getTension(a, b) === 40,
    `${gameState.getTension(a, b)}`);
  check('Tension lookup is symmetric', gameState.getTension(b, a) === 40);
  gameState.addTension(a, b, 500);
  check('Tension clamps to 100', gameState.getTension(a, b) === 100, `${gameState.getTension(a, b)}`);
  gameState.addTension(a, b, -500);
  check('Tension clamps to 0', gameState.getTension(a, b) === 0, `${gameState.getTension(a, b)}`);
  const pair = gameState.getPairRelationship(a, b);
  check(
    'getPairRelationship returns intimacy, tension and isRival',
    typeof pair.intimacy === 'number' &&
      typeof pair.tension === 'number' &&
      typeof pair.isRival === 'boolean'
  );

  console.log('\n--- 5. LEGACY V1 SAVE MIGRATION ---');
  // A save written before the emotion system existed: no mentality, hunger,
  // fear, anger, motivationScore, tensions, isSquadLeader or activityHistory.
  const legacySave = {
    masterName: 'Tester',
    gold: 1234,
    gems: 7,
    heroes: [
      {
        id: 'hero_han',
        name: 'Han Islat',
        star: 1,
        level: 3,
        exp: 0,
        fatigue: 12,
        stress: 40,
        satisfaction: 60,
        class: 'Vanguard',
        motivation: 'diligent',
        stats: { str: 7, agi: 7, vit: 8, int: 5, wil: 12 },
        composure: 55,
        skills: [{ id: 'basic_swordsmanship', level: 1, exp: 0 }],
        talents: [],
        traits: ['picky'],
        equipment: { weapon: null, offhand: null, armor: null },
        alive: true,
      },
      {
        id: 'hero_legacy_two',
        name: 'Old Timer',
        star: 1,
        level: 1,
        exp: 0,
        fatigue: 0,
        stress: 0,
        satisfaction: 50,
        class: 'Novice',
        motivation: 'normal',
        stats: { str: 10, agi: 10, vit: 10, int: 10, wil: 10 },
        skills: [],
        talents: [],
        alive: true,
      },
    ],
    party: [{ id: 'hero_han', formation: 'front' }],
    dayCount: 5,
    dayTimer: 100,
    foodQuality: 'basic',
    relations: {},
    flags: {},
  };
  store.set(SAVE_KEY, JSON.stringify(legacySave));
  const reloaded = (await import('../src/core/GameState.js?reload=1')).gameState;

  check('Legacy V1 Save without emotion fields migrates cleanly', reloaded.heroes.length === 2,
    `${reloaded.heroes.length} heroes`);
  check('Legacy composure and stress map to mentality and anger',
    reloaded.heroes[0].mentality === 55 && reloaded.heroes[0].anger === 40,
    `mentality=${reloaded.heroes[0].mentality} anger=${reloaded.heroes[0].anger}`);
  check('Legacy satisfaction maps to hunger (100 - satisfaction)',
    reloaded.heroes[0].hunger === 40 && reloaded.heroes[0].satisfaction === 60,
    `hunger=${reloaded.heroes[0].hunger}`);
  check('Fear defaults to 10 on migration', reloaded.heroes[0].fear === 10,
    `${reloaded.heroes[0].fear}`);
  check('Motivation score is seeded from the legacy motivation string',
    reloaded.heroes[0].motivationScore === 75, `${reloaded.heroes[0].motivationScore}`);
  check('Legacy traits keep "picky" and gain a personality trait',
    reloaded.heroes[0].traits.includes('picky') &&
      reloaded.heroes[0].traits.some((t) => EMOTION_CONFIG.PERSONALITY_TRAITS.includes(t)),
    reloaded.heroes[0].traits.join(','));
  check('Squad leader is assigned on migration',
    reloaded.heroes.filter((h) => h.isSquadLeader).length === 1 &&
      reloaded.heroes.find((h) => h.isSquadLeader).id === 'hero_han');
  check('New game-level fields default safely',
    typeof reloaded.lastLoginTimestamp === 'number' &&
      reloaded.lastLoginTimestamp > 0 &&
      reloaded.tensions &&
      typeof reloaded.tensions === 'object' &&
      Array.isArray(reloaded.loginReportHistory) &&
      Array.isArray(reloaded.overflowLoot));
  check('The one-time migration flag is set',
    reloaded.flags.emotionTrainingMigrationV1 === true);
  check('Cafeteria is unlocked for the vertical slice',
    reloaded.isFacilityUnlocked('cafeteria') === true);
  check('Legacy save keeps its progress (gold, day count, party)',
    reloaded.gold === 1234 && reloaded.dayCount === 5 && reloaded.party.length === 1);

  console.log('\n--- 6. SAVE ROUNDTRIP ---');
  reloaded.saveToLocalStorage();
  const saved = JSON.parse(store.get(SAVE_KEY));
  check('Save contains the new fields',
    saved.lastLoginTimestamp !== undefined &&
      saved.tensions !== undefined &&
      saved.loginReportHistory !== undefined &&
      saved.overflowLoot !== undefined);
  check('Saved hero carries the emotion fields',
    saved.heroes[0].mentality === 55 &&
      saved.heroes[0].hunger === 40 &&
      saved.heroes[0].anger === 40 &&
      saved.heroes[0].isSquadLeader === true);

  console.log('\n--- 7. CODEMAP ---');
  let codemapOk = false;
  let codemapOut = '';
  try {
    codemapOut = execSync('node scripts/check_codemap.mjs', { encoding: 'utf8' });
    codemapOk = codemapOut.includes('CODEMAP OK');
  } catch (e) {
    codemapOut = (e.stdout || '') + (e.stderr || '');
  }
  check('Codemap check passes', codemapOk, codemapOut.trim().split('\n').slice(-2).join(' '));

  console.log('\n--- 8. CONSOLE INTEGRITY ---');
  check('Zero Console Errors', capturedErrors.length === 0, `Errors: ${capturedErrors.length}`);

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log('\n========================================================');
  console.log(`📋 PHASE 1 MIGRATION RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('========================================================\n');

  if (passed === total) {
    console.log('🎉 ALL PHASE 1 TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME PHASE 1 TESTS FAILED!');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unhandled Test Runner Exception:', err);
  process.exit(1);
});
