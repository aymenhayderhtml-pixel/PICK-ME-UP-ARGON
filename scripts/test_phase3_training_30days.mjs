// scripts/test_phase3_training_30days.mjs
// Phase 3 verification: training sessions, skill combining, Pain Tolerance,
// hit zones, sparring and the required 30-day 1-star vs 3-star benchmark.
// Runs purely in Node with zero headless browser overhead.

import * as THREE from 'three';

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

/**
 * A minimal stand-in for GameState that reproduces the real progression math
 * (XP curve, level cap, class weighted stat growth) without touching the DOM.
 */
function makeFakeState(heroes, opts = {}) {
  const { getXpForLevel, LEVEL_CAP_PER_STAR } = opts;
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
    addExp(heroId, amount) {
      const hero = heroes.find((h) => h.id === heroId);
      if (!hero) return;
      const maxLevel = hero.star * LEVEL_CAP_PER_STAR;
      let remaining = amount;
      while (remaining > 0 && hero.level < maxLevel) {
        const needed = getXpForLevel(hero.level) - hero.exp;
        if (remaining >= needed) {
          remaining -= needed;
          hero.level += 1;
          hero.exp = 0;
          const pool = opts.weightedStats(hero.class);
          const s1 = pool[Math.floor(Math.random() * pool.length)];
          const s2 = pool[Math.floor(Math.random() * pool.length)];
          hero.stats[s1] = (hero.stats[s1] || 0) + 1;
          hero.stats[s2] = (hero.stats[s2] || 0) + 1;
        } else {
          hero.exp += remaining;
          remaining = 0;
        }
      }
      if (hero.level >= maxLevel) hero.exp = 0;
    },
    addItemToInventory(item) {
      state.inventory.push(item);
      return true;
    },
    killHero(id) {
      const idx = heroes.findIndex((h) => h.id === id);
      if (idx !== -1) {
        const hero = heroes[idx];
        hero.alive = false;
        heroes.splice(idx, 1);
        state.deadHeroes.push(hero);
      }
    },
  };
  return state;
}

function combatPower(hero) {
  const maxHp = 50 + hero.stats.vit * 8 + hero.level * 5;
  const damage = (6 + hero.stats.str * 1.2 + hero.level) * getStarMult(hero.star);
  const defense = (hero.stats.vit * 0.5 + hero.stats.str * 0.2) * getStarMult(hero.star);
  return { maxHp, damage, defense, power: maxHp + damage * 5 + defense * 4 };
}

let getStarMult = (star) => 1 + (star - 1) * 0.05;

async function run() {
  const { getStarMultiplier, getXpForLevel } = await import('../src/data/rules.js');
  getStarMult = getStarMultiplier;

  const { TRAINING_CONFIG } = await import('../src/data/training.config.js');
  const { EMOTION_CONFIG } = await import('../src/data/emotions.config.js');
  const { SKILL_RECIPES } = await import('../src/data/skillRecipes.config.js');
  const { getWeightedStatsForClass } = await import('../src/data/heroes.js');
  const {
    rollHitZone,
    resolveTrainingSession,
    resolveSparringSession,
    checkAndCombineSkills,
    checkAndUnlockPainTolerance,
    recordTrainingDamageAndHeal,
    recordCoTraining,
  } = await import('../src/core/TrainingEngine.js');
  const { simulateMultipleDays } = await import('../src/core/DailyDecisionEngine.js');
  const { getCombatStats } = await import('../src/core/Stats.js');
  const { Combatant } = await import('../src/combat/Combatant.js');
  const { DamageResolver } = await import('../src/combat/DamageResolver.js');

  const stateOpts = { getXpForLevel, LEVEL_CAP_PER_STAR: 10, weightedStats: getWeightedStatsForClass };

  console.log('\n--- 1. TRAINING SESSION SKILL XP ---');
  const dummyHero = makeHero({
    id: 'dummy_hero',
    skills: [{ id: 'basic_swordsmanship', level: 1, exp: 0 }],
  });
  const dummyState = makeFakeState([dummyHero], stateOpts);
  const dummySession = resolveTrainingSession(dummyHero, 'train_dummy', dummyState, { rng: () => 0.4 });
  check('Dummy session grants Sword + Shield XP and increments coTrainedPairs',
    dummyHero.skills.some((s) => s.id === 'basic_swordsmanship' && s.exp > 0) &&
      dummyHero.skills.some((s) => s.id === 'basic_shield_technique') &&
      dummyHero.coTrainedPairs['basic_shield_technique|basic_swordsmanship'] === 1,
    `xp=${dummySession.skillXp} outcome=${dummySession.outcome}`);

  const archeryHero = makeHero({ id: 'arch', skills: [{ id: 'basic_archery', level: 1, exp: 0 }] });
  const archeryState = makeFakeState([archeryHero], stateOpts);
  resolveTrainingSession(archeryHero, 'train_archery', archeryState, { rng: () => 0.4 });
  check('Archery session grants Bow + Quiver Handling XP',
    archeryHero.skills.some((s) => s.id === 'basic_archery' && s.exp > 0) &&
      archeryHero.skills.some((s) => s.id === 'quiver_handling') &&
      archeryHero.coTrainedPairs['basic_archery|quiver_handling'] === 1);

  const mageHero = makeHero({ id: 'mage', class: 'Mage', skills: [{ id: 'fireball', level: 3, exp: 0 }] });
  const mageState = makeFakeState([mageHero], stateOpts);
  resolveTrainingSession(mageHero, 'train_magic', mageState, { rng: () => 0.4 });
  check('Magic session grants Basic Fire Magic + Mana Control XP',
    mageHero.skills.some((s) => s.id === 'basic_fire_magic' && s.exp > 0) &&
      mageHero.skills.some((s) => s.id === 'mana_control') &&
      mageHero.coTrainedPairs['basic_fire_magic|mana_control'] === 1,
    mageHero.skills.map((s) => s.id).join(','));

  console.log('\n--- 2. SKILL COMBINING ---');
  const combiner = makeHero({
    id: 'combiner',
    skills: [
      { id: 'basic_swordsmanship', level: 2, exp: 0 },
      { id: 'basic_shield_technique', level: 1, exp: 0 },
    ],
    coTrainedPairs: { 'basic_shield_technique|basic_swordsmanship': 3 },
  });
  const combined = checkAndCombineSkills(combiner);
  const swordSkill = combiner.skills.find((s) => s.id === 'basic_swordsmanship');
  const shieldSkill = combiner.skills.find((s) => s.id === 'basic_shield_technique');
  const swordShield = combiner.skills.find((s) => s.id === 'basic_sword_shield');
  check('Skill combining merges Sword Lv2 + Shield Lv1 into Basic Sword-Shield Lv3 and marks parents merged',
    combined.length === 1 &&
      swordShield && swordShield.level === 3 &&
      swordSkill.merged === true && swordSkill.mergedInto === 'basic_sword_shield' &&
      shieldSkill.merged === true,
    swordShield ? `Basic Sword-Shield Lv${swordShield.level}` : 'missing');
  check('Parent skills are not deleted, only merged',
    !!swordSkill && !!shieldSkill && swordSkill.level === 2 && shieldSkill.level === 1);
  check('Already merged parent skills do not re-trigger combination',
    checkAndCombineSkills(combiner).length === 0);

  const allRecipes = makeHero({
    id: 'all_recipes',
    skills: [
      { id: 'basic_swordsmanship', level: 2, exp: 0 },
      { id: 'basic_shield_technique', level: 1, exp: 0 },
      { id: 'basic_archery', level: 2, exp: 0 },
      { id: 'quiver_handling', level: 1, exp: 0 },
      { id: 'basic_fire_magic', level: 2, exp: 0 },
      { id: 'mana_control', level: 1, exp: 0 },
      { id: 'basic_spearmanship', level: 2, exp: 0 },
      { id: 'evasion', level: 1, exp: 0 },
      { id: 'basic_dagger_technique', level: 2, exp: 0 },
      { id: 'stealth', level: 1, exp: 0 },
    ],
    coTrainedPairs: {
      'basic_shield_technique|basic_swordsmanship': 3,
      'basic_archery|quiver_handling': 3,
      'basic_fire_magic|mana_control': 3,
      'basic_spearmanship|evasion': 3,
      'basic_dagger_technique|stealth': 3,
    },
  });
  const allCombined = checkAndCombineSkills(allRecipes);
  check('All 5 skill recipes combine properly when requirements are met',
    allCombined.length === 5 && allCombined.every((c) => c.newLevel === 3),
    `${allCombined.length}/5 combined`);

  console.log('\n--- 3. PAIN TOLERANCE ---');
  const ptHero = makeHero({ id: 'pt', skills: [] });
  const pt = recordTrainingDamageAndHeal(ptHero, 120, 120);
  check('Pain Tolerance unlocks at 120 dmg taken/healed',
    pt.unlocked === true && pt.newLevel === 1,
    `level=${pt.newLevel}`);
  const ptLevel2 = recordTrainingDamageAndHeal(ptHero, 120, 120);
  check('Pain Tolerance levels up at the next threshold',
    ptLevel2.leveledUp === true && ptLevel2.newLevel === 2,
    `level=${ptLevel2.newLevel}`);
  check('Pain Tolerance caps at level 10',
    (() => {
      const capped = makeHero({ id: 'pt_cap', skills: [{ id: 'pain_tolerance', level: 10, exp: 0 }] });
      const r = checkAndUnlockPainTolerance(capped);
      return r.newLevel === 10 && r.leveledUp === false;
    })());

  const statsPt = getCombatStats(ptHero);
  check('Pain Tolerance reduces incoming damage in the stat sheet',
    statsPt.incomingDamageReduction > 0 && statsPt.painToleranceLevel === 2,
    `dr=${statsPt.incomingDamageReduction}`);

  // Real DamageResolver check.
  const fighter = new Combatant({
    id: 'f1', name: 'Fighter', team: 'player', maxHp: 500, hp: 500, defense: 0.1,
    weapon: { kind: 'sword', grade: 'D', damageMult: 1.0 },
  });
  const attacker = new Combatant({
    id: 'a1', name: 'Attacker', team: 'enemy', maxHp: 500, hp: 500,
  });
  const beforeHp = fighter.hp;
  DamageResolver.resolve(fighter, {
    attacker,
    attackerPosition: new THREE.Vector3(0, 0, -5),
    attackerName: 'Attacker',
    rawDamage: 100,
    poiseDamage: 20,
    hitZone: 'torso',
  });
  const plainDamage = beforeHp - fighter.hp;
  fighter.hp = 500;
  fighter.incomingDamageReduction = 0.15;
  DamageResolver.resolve(fighter, {
    attacker,
    attackerPosition: new THREE.Vector3(0, 0, -5),
    attackerName: 'Attacker',
    rawDamage: 100,
    poiseDamage: 20,
    hitZone: 'torso',
  });
  const reducedDamage = 500 - fighter.hp;
  check('Pain Tolerance reduces incoming damage in DamageResolver',
    reducedDamage < plainDamage && reducedDamage > 0,
    `plain=${plainDamage} reduced=${reducedDamage}`);

  console.log('\n--- 4. HIT ZONES ---');
  const zoneSamples = { melee: {}, arrow: {}, spell: {} };
  for (const kind of ['melee', 'arrow', 'spell']) {
    for (let i = 0; i < 4000; i++) {
      const z = rollHitZone(kind, Math.random);
      zoneSamples[kind][z] = (zoneSamples[kind][z] || 0) + 1;
    }
  }
  check('Hit zones cover limbs, torso, head and heart',
    Object.keys(zoneSamples.melee).length === 4 &&
      zoneSamples.melee.limbs > 0 && zoneSamples.melee.torso > 0 &&
      zoneSamples.melee.head > 0 && zoneSamples.melee.heart > 0,
    JSON.stringify(zoneSamples.melee));
  check('Head and heart are the rarest zones',
    zoneSamples.melee.head < zoneSamples.melee.torso &&
      zoneSamples.melee.heart < zoneSamples.melee.torso,
    `head=${zoneSamples.melee.head} heart=${zoneSamples.melee.heart} torso=${zoneSamples.melee.torso}`);

  console.log('\n--- 5. SPARRING ---');
  // A scripted rng: the Fight AI consumes the first value (0.1 -> 'attack')
  // and the hit zone roll consumes the second (0.95 -> 'heart').
  const scriptedRng = (() => {
    const seq = [0.1, 0.95];
    let i = 0;
    return () => seq[i++ % seq.length];
  })();

  const strong = makeHero({ id: 'strong', name: 'Strong', stats: { str: 20, agi: 10, vit: 10, int: 10, wil: 10 } });
  const weak = makeHero({ id: 'weak', name: 'Weak', stats: { str: 1, agi: 1, vit: 1, int: 1, wil: 1 } });
  const sparState = makeFakeState([strong, weak], stateOpts);
  // 0.1 makes the Fight AI attack, so the damage actually accumulates.
  const spar = resolveSparringSession(strong, weak, sparState, { rng: () => 0.1 });
  check('Sparring below 20% HP awards low-HP survival bonus XP and Pain Tolerance counters',
    spar.lowHpBonusB === 1 && spar.skillXpB > TRAINING_CONFIG.BASE_SESSION_SKILL_XP.spar &&
      weak.painToleranceCounters.damageTaken > 0,
    `lowHpB=${spar.lowHpBonusB} hpB=${spar.hpB}/${spar.maxHpB}`);

  const critA = makeHero({ id: 'crit_a', stats: { str: 20, agi: 10, vit: 10, int: 10, wil: 10 } });
  const critB = makeHero({ id: 'crit_b', stats: { str: 1, agi: 1, vit: 1, int: 1, wil: 1 } });
  const critState = makeFakeState([critA, critB], stateOpts);
  // The scripted rng makes the AI attack and the hit zone land on the heart.
  const critSpar = resolveSparringSession(critA, critB, critState, { rng: scriptedRng });
  check('Head/Heart hit in sparring triggers Iselle intervention and serious injury (no fast heal)',
    critSpar.stoppedBy === 'iselle' &&
      critSpar.stopReason === 'critical_hit' &&
      critSpar.injuries.length === 1 &&
      critB.injury &&
      critB.injury.severity === 'serious' &&
      critB.injury.healRateMult === TRAINING_CONFIG.CRITICAL_INJURY_HEAL_MULT,
    `zone=${critSpar.hitZone} stoppedBy=${critSpar.stoppedBy} reason=${critSpar.stopReason}`);
  check('A broken law is recorded on the spar',
    critSpar.lawBroken === EMOTION_CONFIG.LOBBY_LAWS.NO_LETHAL_SPAR_BLOWS,
    critSpar.lawBroken);

  console.log('\n--- 6. 30-DAY SIMULATION BENCHMARK ---');
  // A 1-star hero who trains, simulated by the real engine for 30 game days.
  const trainer = makeHero({
    id: 'trainer',
    name: 'Han Islat',
    star: 1,
    class: 'Vanguard',
    motivation: 'diligent',
    motivationScore: 75,
    traits: ['diligent'],
    stats: { str: 7, agi: 7, vit: 8, int: 5, wil: 12 },
    skills: [
      { id: 'basic_swordsmanship', level: 1, exp: 0 },
      { id: 'basic_shield_technique', level: 1, exp: 0 },
    ],
  });
  const trainerState = makeFakeState([trainer], stateOpts);
  const bench = simulateMultipleDays(trainerState, 30, { seed: 1377 });
  const trainedDays = bench.activitiesByHero.trainer
    ? bench.activitiesByHero.trainer.filter((a) => a.startsWith('train')).length
    : 0;

  // A 3-star hero who never trains.
  const idler = makeHero({
    id: 'idler',
    name: 'Idle Lord',
    star: 3,
    class: 'Vanguard',
    stats: { str: 10, agi: 10, vit: 10, int: 10, wil: 10 },
    skills: [{ id: 'basic_swordsmanship', level: 1, exp: 0 }],
  });

  const cpTrainer = combatPower(trainer);
  const cpIdler = combatPower(idler);
  const statSumTrainer = Object.values(trainer.stats).reduce((a, b) => a + b, 0);
  const statSumIdler = Object.values(idler.stats).reduce((a, b) => a + b, 0);
  const combinedSkill = trainer.skills.find((s) => s.id === 'basic_sword_shield');
  const ptSkill = trainer.skills.find((s) => s.id === 'pain_tolerance');

  console.log('\n--- 30-DAY SIMULATION BENCHMARK (Seed: 1377) ---');
  console.log(`  1-Star Trainer (${trainer.name}, 1 star ${trainer.class}, Diligent):`);
  console.log(`    Days Trained: ${trainedDays} / 30`);
  console.log(`    Level: 1 -> ${trainer.level} | Star Mult: ${getStarMultiplier(trainer.star).toFixed(2)}x`);
  console.log(`    Stats: STR ${trainer.stats.str} AGI ${trainer.stats.agi} VIT ${trainer.stats.vit} INT ${trainer.stats.int} WIL ${trainer.stats.wil} (Total ${statSumTrainer})`);
  console.log(`    Combined Skills: ${combinedSkill ? `${combinedSkill.name} Lv${combinedSkill.level}` : 'None'} | Pain Tolerance: ${ptSkill ? `Lv${ptSkill.level}` : 'None'}`);
  console.log(`    Combat Power (MaxHP + Damage*5 + Defense*4): ${cpTrainer.power.toFixed(1)}`);
  console.log(`  3-Star Non-Trainer (${idler.name}, 3 star ${idler.class}, Idle):`);
  console.log(`    Days Trained: 0 / 30`);
  console.log(`    Level: 1 -> ${idler.level} | Star Mult: ${getStarMultiplier(idler.star).toFixed(2)}x`);
  console.log(`    Stats: STR ${idler.stats.str} AGI ${idler.stats.agi} VIT ${idler.stats.vit} INT ${idler.stats.int} WIL ${idler.stats.wil} (Total ${statSumIdler})`);
  console.log(`    Combined Skills: None | Pain Tolerance: None`);
  console.log(`    Combat Power (MaxHP + Damage*5 + Defense*4): ${cpIdler.power.toFixed(1)}`);
  console.log(`  Result: 1-Star Trainer (${cpTrainer.power.toFixed(1)}) vs 3-Star Non-Trainer (${cpIdler.power.toFixed(1)}) ` +
    `[${(((cpTrainer.power - cpIdler.power) / cpIdler.power) * 100).toFixed(1)}%]`);
  console.log('  ------------------------------------------------');

  check('30-Day Simulation: 1-Star Diligent Trainer surpasses 3-Star Non-Trainer in stats and Combat Power',
    cpTrainer.power > cpIdler.power && statSumTrainer > statSumIdler,
    `power ${cpTrainer.power.toFixed(1)} vs ${cpIdler.power.toFixed(1)}`);
  check('The trainer actually trained during the 30 days', trainedDays > 0, `${trainedDays} days`);
  check('The simulation produced a full event log', bench.events.length > 0, `${bench.events.length} events`);

  console.log('\n--- 7. CONSOLE INTEGRITY ---');
  check('Zero Console Errors', capturedErrors.length === 0, `Errors: ${capturedErrors.length}`);

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log('\n========================================================');
  console.log(`📋 PHASE 3 TRAINING & 30-DAY SIM RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('========================================================\n');

  if (passed === total) {
    console.log('🎉 ALL PHASE 3 TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME PHASE 3 TESTS FAILED!');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unhandled Test Runner Exception:', err);
  process.exit(1);
});
