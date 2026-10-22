// scripts/test_phase7_fight_ai.mjs
// Phase 2 test suite 1: the pure, headless Fight AI.
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
    class: 'Vanguard',
    stats: { str: 10, agi: 10, vit: 10, int: 10, wil: 10 },
    equipment: { weapon: { weaponType: 'sword', grade: 'D' }, offhand: null, armor: null },
    mentality: 50,
    hunger: 20,
    fear: 10,
    anger: 0,
    motivationScore: 50,
    fatigue: 0,
    traits: [],
    alive: true,
    ...overrides,
  };
}

function makeContext(overrides = {}) {
  return {
    self: makeHero(),
    selfStats: {},
    selfHpRatio: 1,
    opponents: [{ hero: makeHero({ id: 'foe' }), heroStats: {}, hpRatio: 1, distance: 1.5 }],
    target: { hero: makeHero({ id: 'foe' }), heroStats: {}, hpRatio: 1, distance: 1.5 },
    elapsed: 0,
    fightDuration: 25,
    allyCount: 0,
    enemyCount: 1,
    rng: () => 0.5,
    isSanctioned: true,
    currentAction: null,
    lastDecisionElapsed: -Infinity,
    selfMana: 100,
    ...overrides,
  };
}

async function run() {
  const {
    getFightStyleForHero,
    computeActionWeights,
    chooseFightAction,
    chooseSwitchTarget,
    FIGHT_ACTIONS,
  } = await import('../src/core/FightAI.js');
  const { EMOTION_CONFIG } = await import('../src/data/emotions.config.js');

  console.log('\n--- 1. DEAD HERO ---');
  {
    const weights = computeActionWeights(makeContext({ selfHpRatio: 0 }));
    const allZero = FIGHT_ACTIONS.every((a) => weights[a] === 0);
    check('dead hero returns zero weights and null action',
      allZero && chooseFightAction(makeContext({ selfHpRatio: 0 })) === null,
      JSON.stringify(weights));
  }

  console.log('\n--- 2. PANIC ---');
  {
    const panicking = makeHero({
      class: 'Mage',
      mentality: 20,
      fear: 75,
      equipment: { weapon: { weaponType: 'staff', grade: 'D' }, offhand: null, armor: null },
    });
    const context = makeContext({ self: panicking, selfMana: 100 });
    const weights = computeActionWeights(context);
    const actions = new Set();
    for (let i = 0; i < 200; i++) {
      actions.add(chooseFightAction({ ...context, rng: () => i / 200 }));
    }
    check('panicking hero never chooses attack or cast',
      weights.attack === 0 && weights.cast === 0 && weights.aim === 0 &&
        [...actions].every((a) => ['flee', 'retreat', 'defend'].includes(a)),
      `weights attack=${weights.attack} cast=${weights.cast} aim=${weights.aim} actions=${[...actions].join(',')}`);
  }

  console.log('\n--- 3. ANGER ---');
  {
    const calm = makeContext({
      self: makeHero({ anger: 0 }),
      opponents: [{ hero: makeHero({ id: 'a' }), heroStats: {}, hpRatio: 1, distance: 1.5 },
                  { hero: makeHero({ id: 'b' }), heroStats: {}, hpRatio: 1, distance: 1.5 }],
      target: { hero: makeHero({ id: 'a' }), heroStats: {}, hpRatio: 1, distance: 1.5 },
    });
    const hot = makeContext({
      self: makeHero({ anger: 90 }),
      opponents: calm.opponents,
      target: calm.target,
    });
    const wCalm = computeActionWeights(calm);
    const wHot = computeActionWeights(hot);
    check('high anger boosts attack and switch_target',
      wHot.attack > 1.7 * wCalm.attack && wHot.switch_target > 30,
      `attack ${wCalm.attack.toFixed(1)} -> ${wHot.attack.toFixed(1)}, switch=${wHot.switch_target.toFixed(1)}`);
  }

  console.log('\n--- 4. WEAPON STYLES ---');
  {
    const distance = 5.0;
    const far = { hero: makeHero({ id: 'foe' }), heroStats: {}, hpRatio: 1, distance };

    const swordW = computeActionWeights(makeContext({
      self: makeHero({ equipment: { weapon: { weaponType: 'sword', grade: 'D' }, offhand: null, armor: null } }),
      target: far, opponents: [far],
    }));
    const bowW = computeActionWeights(makeContext({
      self: makeHero({ equipment: { weapon: { weaponType: 'bow', grade: 'D' }, offhand: null, armor: null } }),
      target: far, opponents: [far],
    }));
    const staffW = computeActionWeights(makeContext({
      self: makeHero({ equipment: { weapon: { weaponType: 'staff', grade: 'D' }, offhand: null, armor: null } }),
      target: far, opponents: [far], selfMana: 100,
    }));
    const staffLowMana = computeActionWeights(makeContext({
      self: makeHero({ equipment: { weapon: { weaponType: 'staff', grade: 'D' }, offhand: null, armor: null } }),
      target: far, opponents: [far], selfMana: 10,
    }));

    const top = (w) => FIGHT_ACTIONS.reduce((best, a) => (w[a] > w[best] ? a : best), FIGHT_ACTIONS[0]);
    check('weapon styles differentiate sword, bow, and staff',
      top(swordW) === 'attack' && top(bowW) === 'aim' && top(staffW) === 'cast',
      `sword=${top(swordW)} bow=${top(bowW)} staff=${top(staffW)}`);
    check('a staff with too little mana cannot cast',
      staffLowMana.cast === 0,
      `cast=${staffLowMana.cast}`);
    check('getFightStyleForHero falls back to the class when no weapon is carried',
      getFightStyleForHero(makeHero({ class: 'Scout', equipment: { weapon: null } })).id === 'bow',
      getFightStyleForHero(makeHero({ class: 'Scout', equipment: { weapon: null } })).id);
  }

  console.log('\n--- 5. HYSTERESIS ---');
  {
    const context = makeContext({
      currentAction: 'defend',
      lastDecisionElapsed: 0.5,
      elapsed: 1.0,
    });
    const weights = computeActionWeights(context);
    const defendWeight = weights.defend;
    // A rival action that is not decisively heavier must not flip the choice.
    const action = chooseFightAction(context);
    check('hysteresis prevents action flip before min dwell unless ratio exceeded',
      action === 'defend',
      `action=${action} defendWeight=${defendWeight.toFixed(1)}`);

    // Once the dwell time has passed the action may change.
    const afterDwell = makeContext({
      currentAction: 'defend',
      lastDecisionElapsed: 0,
      elapsed: EMOTION_CONFIG.FIGHT_AI_MIN_DWELL_SEC + 0.1,
    });
    const after = chooseFightAction(afterDwell);
    check('after the minimum dwell time the AI may switch actions',
      after !== undefined && after !== null,
      `action=${after}`);
  }

  console.log('\n--- 6. SWITCH TARGET ---');
  {
    const target = { hero: makeHero({ id: 'current' }), heroStats: {}, hpRatio: 1, distance: 5 };
    const hurt = { hero: makeHero({ id: 'hurt' }), heroStats: {}, hpRatio: 0.1, distance: 3 };
    const context = makeContext({ opponents: [target, hurt], target });
    const picked = chooseSwitchTarget(context);
    check('chooseSwitchTarget picks the hurt, close opponent',
      picked && picked.hero.id === 'hurt',
      picked ? picked.hero.id : 'null');
    check('chooseSwitchTarget returns null with a single opponent',
      chooseSwitchTarget(makeContext({ opponents: [target], target })) === null);
  }

  console.log('\n--- 7. CONSOLE INTEGRITY ---');
  check('Zero Console Errors', capturedErrors.length === 0, `Errors: ${capturedErrors.length}`);

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log('\n========================================================');
  console.log(`📋 PHASE 7 FIGHT AI RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('========================================================\n');

  if (passed === total) {
    console.log('🎉 ALL PHASE 7 TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME PHASE 7 TESTS FAILED!');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unhandled Test Runner Exception:', err);
  process.exit(1);
});
