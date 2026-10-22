// scripts/test_phase5_town_training.mjs
// Phase 5 verification: the four training sub-zones, the live sparring
// controller (real Combatant + real DamageResolver), the lobby laws, the
// Squad Leader intervention and the fast heal rule.
// Runs purely in Node with zero headless browser overhead.

import * as THREE from 'three';
import { readFileSync } from 'node:fs';

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
    equipment: { weapon: null, offhand: null, armor: null },
    ...overrides,
  };
}

function makeNpc(hero, x = 0, z = 0) {
  const mesh = new THREE.Group();
  mesh.position.set(x, 0, z);
  return {
    heroData: hero,
    mesh,
    state: 'idle',
    speed: 2.2,
    setDestination(x2, z2, cb) { this.destX = x2; this.destZ = z2; },
    showAngryBubble() {},
    showSpeechBubble() {},
  };
}

function makeManager(npcs) {
  return { npcs, handleRuleBreak() {}, restAll() {} };
}

/** Replaces Math.random with a fixed value for the duration of a call. */
function withRandom(value, fn) {
  const original = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

async function run() {
  const { LAYOUT } = await import('../src/art/town/layout.js');
  const { TRAINING_CONFIG } = await import('../src/data/training.config.js');
  const { EMOTION_CONFIG } = await import('../src/data/emotions.config.js');
  const { TownSparringController } = await import('../src/hub/TownSparringController.js');
  const { applyTrainingYardRecovery } = await import('../src/core/TrainingEngine.js');

  // The sparring controller and the fairy VFX are Three.js objects.
  const scene = new THREE.Scene();

  const RING = { x: -18.7, z: 23.3 };
  const anchors = {
    sparring_ring_center: new THREE.Vector3(RING.x, 0, RING.z),
    sparring_spot_a: new THREE.Vector3(RING.x - 0.9, 0, RING.z),
    sparring_spot_b: new THREE.Vector3(RING.x + 0.9, 0, RING.z),
  };

  console.log('\n--- 1. TRAINING SUB-ZONES ---');
  const zones = LAYOUT.zones.training_grounds.trainingZones;
  check('LAYOUT.zones.training_grounds defines all 4 sub-zones (wooden_dummies, archery_targets, fire_targets, sparring_ring)',
    !!zones &&
      !!zones.wooden_dummies &&
      !!zones.archery_targets &&
      !!zones.fire_targets &&
      !!zones.sparring_ring,
    zones ? Object.keys(zones).join(',') : 'missing');
  check('Every training sub-zone has usable slots',
    zones.wooden_dummies.slots.length === 3 &&
      zones.archery_targets.slots.length === 2 &&
      zones.fire_targets.slots.length === 2 &&
      zones.sparring_ring.radius > 0);
  check('The sparring ring has two fighter spots',
    !!zones.sparring_ring.spotA && !!zones.sparring_ring.spotB);

  // The landmark builder must register the anchors the code looks for.
  const landmarkSrc = readFileSync('src/art/town/landmarksWork.js', 'utf8');
  check('The landmark builder registers the training anchors',
    landmarkSrc.includes("'archery_target_0'") === false && // slots are data driven
    landmarkSrc.includes('slot.anchorId') &&
    landmarkSrc.includes("'sparring_ring_center'") &&
    landmarkSrc.includes("'sparring_spot_a'") &&
    landmarkSrc.includes("'sparring_spot_b'"),
    'anchorId / sparring_* registered');

  console.log('\n--- 2. SPARRING: LOW HP ---');
  {
    const strong = makeNpc(makeHero({ id: 's', name: 'Strong', stats: { str: 20, agi: 10, vit: 10, int: 10, wil: 10 } }), RING.x - 0.9, RING.z);
    const weak = makeNpc(makeHero({ id: 'w', name: 'Weak', stats: { str: 1, agi: 1, vit: 1, int: 1, wil: 1 } }), RING.x + 0.9, RING.z);
    const ctrl = new TownSparringController(scene, makeManager([strong, weak]), null, null);
    ctrl.setAnchors(anchors, 1.9);
    const session = ctrl.startSpar(strong, weak, true);
    // Drop the weak fighter below the safe HP threshold.
    session.fighterB.hp = session.fighterB.maxHp * 0.2;
    // Pin the RNG to a torso hit so the low HP rule is the only trigger.
    withRandom(0.5, () => ctrl.update(1.0));
    check('TownSparringController stops spar immediately when HP drops below 25%',
      session.stoppedBy === 'iselle' && session.stopReason === 'low_hp',
      `stoppedBy=${session.stoppedBy} reason=${session.stopReason}`);
    check('A low HP stop breaks the NO_ATTACK_LOW_HP law',
      session.lawBroken === EMOTION_CONFIG.LOBBY_LAWS.NO_ATTACK_LOW_HP, session.lawBroken);
  }

  console.log('\n--- 3. SPARRING: HEAD OR HEART HIT ---');
  {
    const strong = makeNpc(makeHero({ id: 's2', name: 'Strong', stats: { str: 20, agi: 10, vit: 10, int: 10, wil: 10 } }), RING.x - 0.9, RING.z);
    const weak = makeNpc(makeHero({ id: 'w2', name: 'Weak', stats: { str: 1, agi: 1, vit: 1, int: 1, wil: 1 } }), RING.x + 0.9, RING.z);
    const ctrl = new TownSparringController(scene, makeManager([strong, weak]), null, null);
    ctrl.setAnchors(anchors, 1.9);
    const session = ctrl.startSpar(strong, weak, true);
    // A scripted rng: the Fight AI consumes the first value (0.1 -> 'attack')
    // and the hit zone roll consumes the second (0.95 -> 'heart').
    const seq = [0.1, 0.95];
    let ri = 0;
    const scripted = () => seq[ri++ % seq.length];
    for (let i = 0; i < 3 && !session.stoppedBy; i++) {
      withRandom(0, () => { Math.random = scripted; ctrl.update(1.0); });
    }
    check('TownSparringController stops spar immediately on head or heart hit and applies serious injury',
      session.stoppedBy === 'iselle' &&
        session.stopReason === 'critical_hit' &&
        weak.heroData.injury &&
        weak.heroData.injury.severity === 'serious' &&
        weak.heroData.injury.healRateMult === TRAINING_CONFIG.CRITICAL_INJURY_HEAL_MULT,
      `zone=${session.lastHitZone} injury=${weak.heroData.injury ? weak.heroData.injury.zone : 'none'}`);
    check('A critical hit breaks the NO_LETHAL_SPAR_BLOWS law',
      session.lawBroken === EMOTION_CONFIG.LOBBY_LAWS.NO_LETHAL_SPAR_BLOWS, session.lawBroken);
  }

  console.log('\n--- 4. SPARRING: DURATION AND TOTAL DAMAGE ---');
  {
    const a = makeNpc(makeHero({ id: 'a4', name: 'A' }), RING.x - 0.9, RING.z);
    const b = makeNpc(makeHero({ id: 'b4', name: 'B' }), RING.x + 0.9, RING.z);
    const ctrl = new TownSparringController(scene, makeManager([a, b]), null, null);
    ctrl.setAnchors(anchors, 1.9);
    const session = ctrl.startSpar(a, b, true);
    session.elapsed = EMOTION_CONFIG.ISELLE_MAX_FIGHT_DURATION_SEC + 1;
    withRandom(0.5, () => ctrl.update(1.0));
    check('TownSparringController stops spar when duration > 25s',
      session.stoppedBy === 'iselle' && session.stopReason === 'max_duration',
      `reason=${session.stopReason}`);

    const a2 = makeNpc(makeHero({ id: 'a5', name: 'A2' }), RING.x - 0.9, RING.z);
    const b2 = makeNpc(makeHero({ id: 'b5', name: 'B2' }), RING.x + 0.9, RING.z);
    const ctrl2 = new TownSparringController(scene, makeManager([a2, b2]), null, null);
    ctrl2.setAnchors(anchors, 1.9);
    const session2 = ctrl2.startSpar(a2, b2, true);
    session2.totalDamage = EMOTION_CONFIG.ISELLE_MAX_FIGHT_TOTAL_DAMAGE + 1;
    withRandom(0.5, () => ctrl2.update(1.0));
    check('TownSparringController stops spar when totalDamage > 120',
      session2.stoppedBy === 'iselle' && session2.stopReason === 'max_damage',
      `reason=${session2.stopReason}`);
  }

  console.log('\n--- 5. UNSANCTIONED FIGHT OUTSIDE THE RING ---');
  {
    // The fighters are standing far away from the ring.
    const a = makeNpc(makeHero({ id: 'a6', name: 'A' }), 0, 0);
    const b = makeNpc(makeHero({ id: 'b6', name: 'B' }), 1, 0);
    const ctrl = new TownSparringController(scene, makeManager([a, b]), null, null);
    ctrl.setAnchors(anchors);
    const session = ctrl.startSpar(a, b, false);
    const motivationBefore = a.heroData.motivationScore;
    // Iselle only notices an unsanctioned brawl after the detection window.
    withRandom(0.5, () => {
      for (let i = 0; i < 8 && !session.stoppedBy; i++) ctrl.update(1.0);
    });
    // The two mock fighters are identical, so the fight is a draw: the
    // outcome delta and the law penalty both apply.
    const outcomeDelta = session.consequenceSummary
      ? (session.consequenceSummary.winnerId === a.heroData.id
          ? EMOTION_CONFIG.FIGHT_WIN_MOTIVATION_GAIN
          : session.consequenceSummary.winnerId === b.heroData.id
            ? EMOTION_CONFIG.FIGHT_LOSS_MOTIVATION_DELTA
            : EMOTION_CONFIG.FIGHT_DRAW_MOTIVATION_DELTA)
      : 0;
    check('Unsanctioned fight outside ring triggers LAW_NO_OUTSIDE_FIGHTING and lowers offender motivationScore by 15',
      session.lawBroken === EMOTION_CONFIG.LOBBY_LAWS.NO_OUTSIDE_FIGHTING &&
        session.stoppedBy === 'iselle' &&
        a.heroData.motivationScore ===
          motivationBefore + outcomeDelta - EMOTION_CONFIG.LAW_BREAK_MOTIVATION_PENALTY,
      `law=${session.lawBroken} stoppedBy=${session.stoppedBy} motivation=${a.heroData.motivationScore}`);
  }

  console.log('\n--- 6. SQUAD LEADER INTERVENES BEFORE ISELLE ---');
  {
    // The leader is near the ring and much stronger than both fighters.
    const leader = makeNpc(
      makeHero({ id: 'lead', name: 'Leader', isSquadLeader: true, stats: { str: 60, agi: 10, vit: 60, int: 10, wil: 10 } }),
      RING.x + 1,
      RING.z + 1
    );
    const a = makeNpc(makeHero({ id: 'a7', name: 'A', stats: { str: 2, agi: 1, vit: 2, int: 1, wil: 1 } }), RING.x - 0.9, RING.z);
    const b = makeNpc(makeHero({ id: 'b7', name: 'B', stats: { str: 2, agi: 1, vit: 2, int: 1, wil: 1 } }), RING.x + 0.9, RING.z);
    const ctrl = new TownSparringController(scene, makeManager([leader, a, b]), null, null);
    ctrl.setAnchors(anchors, 1.9);
    const session = ctrl.startSpar(a, b, true);
    ctrl.update(0.5);
    check('Squad Leader intervenes before Iselle when nearby and stronger than both fighters',
      session.stoppedBy === 'leader' && session.stopReason === 'leader_stopped',
      `stoppedBy=${session.stoppedBy}`);
  }

  console.log('\n--- 7. FAST HEAL AT THE TRAINING GROUND ---');
  {
    // The fast heal lives in the shared engine: it runs AFTER a fight, not
    // during one, so the damage has to accumulate for Iselle's rules to fire.
    const a = makeNpc(makeHero({ id: 'a8', name: 'A' }), RING.x - 0.9, RING.z);
    const b = makeNpc(makeHero({ id: 'b8', name: 'B' }), RING.x + 0.9, RING.z);
    const ctrl = new TownSparringController(scene, makeManager([a, b]), null, null);
    ctrl.setAnchors(anchors, 1.9);
    const session = ctrl.startSpar(a, b, true);
    session.fighterB.hp = session.fighterB.maxHp - 50;
    const before = session.fighterB.hp;
    const healed = applyTrainingYardRecovery(
      session.fighterB,
      b.heroData,
      TRAINING_CONFIG.FIGHT_RECOVERY_SEC
    );
    const expected = TRAINING_CONFIG.TRAINING_FAST_HEAL_PER_SEC * TRAINING_CONFIG.FIGHT_RECOVERY_SEC;
    check('Non-critical training damage fast-heals',
      Math.abs(healed - expected) < 0.01 &&
        Math.abs(session.fighterB.hp - (before + expected)) < 0.01,
      `healed=${healed.toFixed(2)} expected=${expected}`);

    // With a serious head or heart injury the heal is heavily reduced.
    const a2 = makeNpc(makeHero({ id: 'a9', name: 'A2' }), RING.x - 0.9, RING.z);
    const b2 = makeNpc(makeHero({ id: 'b9', name: 'B2' }), RING.x + 0.9, RING.z);
    const ctrl2 = new TownSparringController(scene, makeManager([a2, b2]), null, null);
    ctrl2.setAnchors(anchors, 1.9);
    const session2 = ctrl2.startSpar(a2, b2, true);
    session2.fighterB.hp = session2.fighterB.maxHp - 50;
    b2.heroData.injury = {
      zone: 'head',
      severity: 'serious',
      daysRemaining: 2,
      healRateMult: TRAINING_CONFIG.CRITICAL_INJURY_HEAL_MULT,
    };
    const healed2 = applyTrainingYardRecovery(
      session2.fighterB,
      b2.heroData,
      TRAINING_CONFIG.FIGHT_RECOVERY_SEC
    );
    const expected2 = expected * TRAINING_CONFIG.CRITICAL_INJURY_HEAL_MULT;
    check('A head or heart injury does not fast-heal',
      healed2 < healed * 0.5 && Math.abs(healed2 - expected2) < 0.01,
      `healed=${healed2.toFixed(2)} expected=${expected2.toFixed(2)}`);
  }

  console.log('\n--- 8. CONSOLE INTEGRITY ---');
  check('Zero Console Errors', capturedErrors.length === 0, `Errors: ${capturedErrors.length}`);

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log('\n========================================================');
  console.log(`📋 PHASE 5 TOWN TRAINING & SPARRING RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('========================================================\n');

  if (passed === total) {
    console.log('🎉 ALL PHASE 5 TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME PHASE 5 TESTS FAILED!');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unhandled Test Runner Exception:', err);
  process.exit(1);
});
