// scripts/test_phase11_bugfixes.mjs
// Phase 11: regression tests for the five fixed bugs plus the zombie-NPC bonus.
//   1. A hero may spar at most once per simulated day (DailyDecisionEngine).
//   2. Risky training can now kill a hero even while Iselle supervises
//      (training.config.js) and the gear drop + fallen report still work.
//   3. The town sparring controller queues fights instead of dropping all but
//      the first (TownSparringController).
//   4. Iselle's Report now counts level-ups and newly learned skills
//      (TrainingEngine + DailyDecisionEngine).
//   5. Speech bubbles dispose their canvas texture/material (HubHeroes).
//   BONUS. A stress-suicide removes the avatar from the manager and frees it.
// Runs purely in Node with zero headless browser overhead.

// --- Node shims so the browser modules load and construct -------------------
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const ctxProto = {
  fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '', globalAlpha: 1,
  beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {},
  bezierCurveTo() {}, quadraticCurveTo() {}, rect() {}, roundRect() {},
  fill() {}, stroke() {}, fillRect() {}, strokeRect() {}, clearRect() {},
  fillText() {}, strokeText() {}, measureText: () => ({ width: 0 }),
  save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, setTransform() {},
  createLinearGradient: () => ({ addColorStop() {} }),
};
function makeEl(tag) {
  return {
    tagName: tag, style: {}, children: [],
    appendChild() {}, removeChild() {}, remove() {}, setAttribute() {}, addEventListener() {},
    innerHTML: '', textContent: '', classList: { add() {}, remove() {} },
    querySelector: () => null, querySelectorAll: () => [],
    getContext: () => ctxProto, width: 0, height: 0,
  };
}
globalThis.document = { createElement: makeEl, body: makeEl('body'), querySelector: () => null, querySelectorAll: () => [] };

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

// --- Shared helpers ---------------------------------------------------------
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

// A fake GameState that behaves like the real one for the daily simulation:
// relations/tension tables, EXP with real level-ups, gear drop on death and a
// fallen-heroes record.
function makeFakeState(heroes, opts = {}) {
  const relations = opts.relations || {};
  const tensions = opts.tensions || {};
  const state = {
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
      const next = Math.min(100, Math.max(0, (tensions[key] || 0) + amount));
      tensions[key] = next;
      return next;
    },
    addIntimacy(a, b, amount) {
      if (!a || !b || a === b || !amount) return 0;
      const key = [a, b].sort().join('|');
      const next = Math.min(100, Math.max(0, (relations[key] || 0) + amount));
      relations[key] = next;
      return next;
    },
    addExp(heroId, amount) {
      const hero = heroes.find((h) => h.id === heroId);
      if (!hero || !amount) return;
      hero.exp = (hero.exp || 0) + amount;
      while (hero.exp >= 100 * (hero.level || 1)) {
        hero.exp -= 100 * (hero.level || 1);
        hero.level = (hero.level || 1) + 1;
      }
    },
    addItemToInventory(item) {
      if (state.inventory.length >= 20) return false;
      state.inventory.push(item);
      return true;
    },
    killHero(heroId, floor = 1, cause = 'Unknown') {
      // Mirror the real GameState.killHero: Han can never be deleted, and the
      // hero object itself (with .id / .deathCause) is moved to deadHeroes.
      if (heroId === 'hero_han') return;
      const idx = heroes.findIndex((h) => h.id === heroId);
      if (idx === -1) return;
      const hero = heroes[idx];
      hero.alive = false;
      hero.deathCause = cause || hero.deathCause || 'Killed in battle';
      heroes.splice(idx, 1);
      state.deadHeroes.push(hero);
    },
    saveToLocalStorage() {},
  };
  return state;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const { EMOTION_CONFIG } = await import('../src/data/emotions.config.js');
  const { TRAINING_CONFIG } = await import('../src/data/training.config.js');
  const { simulateGameDay } = await import('../src/core/DailyDecisionEngine.js');
  const { resolveTrainingSession, resolveSparringSession } = await import('../src/core/TrainingEngine.js');
  const { buildIselleReportModel } = await import('../src/core/LoginSimulation.js');
  const { getSkill } = await import('../src/data/skills.js');

  // =========================================================================
  console.log('\n--- 1. A HERO SPARS AT MOST ONCE PER SIMULATED DAY ---');
  {
    // rng = 0.5 lands every hero on the 'spar' activity slice.
    const a = makeHero({ id: 'a', name: 'A' });
    const b = makeHero({ id: 'b', name: 'B' });
    const state = makeFakeState([a, b]);
    const report = simulateGameDay(state, { rng: () => 0.5 });
    const sparEvents = report.events.filter((e) => e.type === 'trained' && e.details && e.details.trainingType === 'spar');
    const alreadySparred = report.events.some((e) => e.type === 'did_nothing' && e.details && e.details.reason === 'already_sparred');
    const perHeroSparCount = {};
    for (const e of sparEvents) perHeroSparCount[e.heroId] = (perHeroSparCount[e.heroId] || 0) + 1;

    check('exactly one spar happens between the two heroes', sparEvents.length === 1, `sparEvents=${sparEvents.length}`);
    check('the would-be second sparring hero is parked with reason already_sparred', alreadySparred);
    check('no hero appears in more than one spar event', Object.values(perHeroSparCount).every((c) => c <= 1), JSON.stringify(perHeroSparCount));
  }

  {
    // Edge case: an odd third hero must NOT be able to hijack a partner that
    // already sparred today.
    const a = makeHero({ id: 'a', name: 'A' });
    const b = makeHero({ id: 'b', name: 'B' });
    const c = makeHero({ id: 'c', name: 'C' });
    const state = makeFakeState([a, b, c]);
    const report = simulateGameDay(state, { rng: () => 0.5 });
    const sparEvents = report.events.filter((e) => e.type === 'trained' && e.details && e.details.trainingType === 'spar');
    check('with three heroes only one spar runs (odd hero left without a free partner)', sparEvents.length === 1, `sparEvents=${sparEvents.length}`);
  }

  // =========================================================================
  console.log('\n--- 2. RISKY TRAINING CAN KILL A HERO (even with Iselle) ---');
  {
    const hero = makeHero({
      id: 'd1', name: 'Doomed', skills: [{ id: 'basic_swordsmanship', level: 1, exp: 0 }],
      equipment: { weapon: { id: 'iron_sword', name: 'Iron Sword', weaponType: 'sword', grade: 'D' }, offhand: null, armor: null },
    });
    const state = makeFakeState([hero], { relations: {}, tensions: {} });
    // rng = 0 forces every chance roll below the (small) death threshold.
    const session = resolveTrainingSession(hero, 'train_magic', state, { rng: () => 0, isellePresent: true });
    check('the supervised death chance is now non-zero', TRAINING_CONFIG.DEATH_CHANCE_WITH_ISELLE > 0, `chance=${TRAINING_CONFIG.DEATH_CHANCE_WITH_ISELLE}`);
    check('rng=0 on risky training records a death', session.died === true && session.deathCause && session.deathCause.toLowerCase().includes('training'), `died=${session.died} cause=${session.deathCause}`);
    check('the hero is marked dead', hero.alive === false);
    check('the gear was dropped into the inventory', state.inventory.length === 1 && state.deadHeroes.some((d) => d.id === 'd1' && String(d.deathCause || '').toLowerCase().includes('training')), `inv=${state.inventory.length} dead=${state.deadHeroes.length}`);

    // The report's fallen-heroes list must surface the death.
    const model = buildIselleReportModel({ events: [], dayReports: [] }, state);
    check('the login report lists the fallen hero', model.fallenHeroes.some((f) => f.heroId === 'd1' && /training/i.test(f.cause)), JSON.stringify(model.fallenHeroes));
  }

  {
    // Edge cases: non-risky training never dies; unsupervised risky training
    // still uses the higher base chance; Han can never die.
    const safe = makeHero({ id: 'd2', name: 'Safe' });
    const safeState = makeFakeState([safe]);
    const safeSession = resolveTrainingSession(safe, 'train_dummy', safeState, { rng: () => 0, isellePresent: true });
    check('a non-risky training never kills even with rng=0', safeSession.died === false, `died=${safeSession.died}`);

    const baseHero = makeHero({ id: 'd3', name: 'Base' });
    const baseState = makeFakeState([baseHero]);
    const baseSession = resolveTrainingSession(baseHero, 'spar', baseState, { rng: () => 0, isellePresent: false });
    check('unsupervised risky training still kills with rng=0', baseSession.died === true, `died=${baseSession.died}`);

    const han = makeHero({ id: 'hero_han', name: 'Han' });
    const hanState = makeFakeState([han]);
    const hanSession = resolveTrainingSession(han, 'train_magic', hanState, { rng: () => 0, isellePresent: true });
    check('Han is protected from training death (never killed, never dropped)', han.alive === true && !hanState.deadHeroes.some((d) => d.id === 'hero_han'), `alive=${han.alive} dead=${hanState.deadHeroes.length}`);
  }

  // =========================================================================
  console.log('\n--- 3. THE TOWN SPAR CONTROLLER QUEUES FIGHTS ---');
  {
    const THREE = await import('three');
    const { TownSparringController } = await import('../src/hub/TownSparringController.js');
    const scene = new THREE.Scene();
    const RING = { x: -18.7, z: 23.3 };
    const anchors = {
      sparring_ring_center: new THREE.Vector3(RING.x, 0, RING.z),
      sparring_spot_a: new THREE.Vector3(RING.x - 0.9, 0, RING.z),
      sparring_spot_b: new THREE.Vector3(RING.x + 0.9, 0, RING.z),
    };
    const makeNpc = (hero, x = 0, z = 0) => {
      const mesh = new THREE.Group();
      mesh.position.set(x, 0, z);
      return { heroData: hero, mesh, state: 'idle', speed: 2.2, setDestination(x2, z2) { this.destX = x2; this.destZ = z2; }, showAngryBubble() {}, showSpeechBubble() {} };
    };
    const makeManager = (npcs) => ({ npcs });

    const ctrl = new TownSparringController(scene, makeManager([]), null, null);
    ctrl.setAnchors(anchors, 1.9);
    ctrl.nextSparDelayMs = 0;

    const s1 = ctrl.startSpar(makeNpc(makeHero({ id: 'qa', name: 'QA' }), 0, 0), makeNpc(makeHero({ id: 'qb', name: 'QB' }), 1, 0), true);
    const queued = ctrl.startSpar(makeNpc(makeHero({ id: 'qc', name: 'QC' }), 2, 0), makeNpc(makeHero({ id: 'qd', name: 'QD' }), 3, 0), true);
    const invalid = ctrl.startSpar(null, makeNpc(makeHero({ id: 'qe', name: 'QE' }), 4, 0), true);

    check("startSpar returns the session when it starts immediately", !!s1 && !!s1.fighterA);
    check("startSpar returns the 'queued' marker while another fight runs", queued === 'queued');
    check('the second fight is held in the queue', ctrl.sparQueue.length === 1);
    check('an invalid request (missing fighter) still returns null', invalid === null);

    ctrl.finishSpar(s1);
    await wait(25);
    check('when the first fight finishes, the queued fight starts automatically', ctrl.activeSpar && ctrl.activeSpar.npcA && ctrl.activeSpar.npcA.heroData.id === 'qc', `active=${ctrl.activeSpar ? ctrl.activeSpar.npcA.heroData.id : 'none'}`);
    check('the queue is drained', ctrl.sparQueue.length === 0);
  }

  {
    // Edge case: clearQueue drops everything still waiting.
    const THREE = await import('three');
    const { TownSparringController } = await import('../src/hub/TownSparringController.js');
    const scene = new THREE.Scene();
    const anchors = {
      sparring_ring_center: new THREE.Vector3(-18.7, 0, 23.3),
      sparring_spot_a: new THREE.Vector3(-19.6, 0, 23.3),
      sparring_spot_b: new THREE.Vector3(-17.8, 0, 23.3),
    };
    const makeNpc = (hero, x = 0, z = 0) => { const mesh = new THREE.Group(); mesh.position.set(x, 0, z); return { heroData: hero, mesh, state: 'idle', setDestination() {}, showAngryBubble() {}, showSpeechBubble() {} }; };
    const ctrl = new TownSparringController(scene, { npcs: [] }, null, null);
    ctrl.setAnchors(anchors, 1.9);
    ctrl.nextSparDelayMs = 0;
    const s1 = ctrl.startSpar(makeNpc(makeHero({ id: 'x1', name: 'X1' }), 0, 0), makeNpc(makeHero({ id: 'x2', name: 'X2' }), 1, 0), true);
    ctrl.startSpar(makeNpc(makeHero({ id: 'x3', name: 'X3' }), 2, 0), makeNpc(makeHero({ id: 'x4', name: 'X4' }), 3, 0), true);
    ctrl.startSpar(makeNpc(makeHero({ id: 'x5', name: 'X5' }), 4, 0), makeNpc(makeHero({ id: 'x6', name: 'X6' }), 5, 0), true);
    check('two fights are queued', ctrl.sparQueue.length === 2);
    ctrl.clearQueue();
    check('clearQueue empties the queue', ctrl.sparQueue.length === 0);
    ctrl.finishSpar(s1);
    await wait(25);
    check('after clearQueue, no queued fight starts when the active one ends', ctrl.activeSpar === null);
  }

  {
    // Edge case: dispose clears a pending "start next" timeout.
    const THREE = await import('three');
    const { TownSparringController } = await import('../src/hub/TownSparringController.js');
    const scene = new THREE.Scene();
    const anchors = {
      sparring_ring_center: new THREE.Vector3(-18.7, 0, 23.3),
      sparring_spot_a: new THREE.Vector3(-19.6, 0, 23.3),
      sparring_spot_b: new THREE.Vector3(-17.8, 0, 23.3),
    };
    const makeNpc = (hero, x = 0, z = 0) => { const mesh = new THREE.Group(); mesh.position.set(x, 0, z); return { heroData: hero, mesh, state: 'idle', setDestination() {}, showAngryBubble() {}, showSpeechBubble() {} }; };
    const ctrl = new TownSparringController(scene, { npcs: [] }, null, null);
    ctrl.setAnchors(anchors, 1.9);
    ctrl.nextSparDelayMs = 0;
    const s1 = ctrl.startSpar(makeNpc(makeHero({ id: 'y1', name: 'Y1' }), 0, 0), makeNpc(makeHero({ id: 'y2', name: 'Y2' }), 1, 0), true);
    ctrl.startSpar(makeNpc(makeHero({ id: 'y3', name: 'Y3' }), 2, 0), makeNpc(makeHero({ id: 'y4', name: 'Y4' }), 3, 0), true);
    ctrl.finishSpar(s1); // schedules the queued start
    ctrl.dispose(); // must cancel that scheduled start
    await wait(25);
    check('dispose cancels a pending queued-fight timeout', ctrl.activeSpar === null && ctrl.sparQueue.length === 0);
  }

  // =========================================================================
  console.log('\n--- 4. ISSELLE REPORT COUNTS LEVEL-UPS AND NEW SKILLS ---');
  {
    // A strong-gain training session (rng=0.1) lifts the hero a level; the
    // daily report must announce it.
    const hero = makeHero({ id: 'p1', name: 'Promoted', level: 1, exp: 90, motivationScore: 50 });
    const state = makeFakeState([hero]);
    const report = simulateGameDay(state, { rng: () => 0.1 });
    const levelUpEvents = report.events.filter((e) => e.type === 'level_up');
    check('a level-up produces a level_up report event', levelUpEvents.length === 1 && levelUpEvents[0].details.level === 2, `events=${levelUpEvents.length} level=${levelUpEvents[0] ? levelUpEvents[0].details.level : 'n/a'}`);
    check('the hero actually leveled up', hero.level === 2);

    const model = buildIselleReportModel({ events: report.events, dayReports: [] }, state);
    check('the report summary line counts the level up', /1 level up/.test(model.summaryLine), `summary="${model.summaryLine}"`);
  }

  {
    // Two sword heroes who know no skills learn basic_swordsmanship from a
    // spar: one new_skill event each, and never duplicated.
    const a = makeHero({ id: 's1', name: 'S1', skills: [], equipment: { weapon: { weaponType: 'sword', grade: 'D' }, offhand: null, armor: null } });
    const b = makeHero({ id: 's2', name: 'S2', skills: [], equipment: { weapon: { weaponType: 'sword', grade: 'D' }, offhand: null, armor: null } });
    const state = makeFakeState([a, b]);
    const report = simulateGameDay(state, { rng: () => 0.5 });
    const newSkillEvents = report.events.filter((e) => e.type === 'new_skill');
    const learned = getSkill('basic_swordsmanship');
    check('each fighter that learns a skill emits exactly one new_skill event', newSkillEvents.length === 2, `events=${newSkillEvents.length}`);
    check('the new_skill event names the skill that was learned', newSkillEvents.every((e) => e.details && e.details.skillId === 'basic_swordsmanship' && e.text.includes(learned.name)), JSON.stringify(newSkillEvents.map((e) => e.text)));

    // Edge case: a hero who already knows the skill must NOT emit a new_skill.
    const c = makeHero({ id: 's3', name: 'S3', skills: [{ id: 'basic_swordsmanship', level: 3, exp: 0 }], equipment: { weapon: { weaponType: 'sword', grade: 'D' }, offhand: null, armor: null } });
    const d = makeHero({ id: 's4', name: 'S4', skills: [{ id: 'basic_swordsmanship', level: 3, exp: 0 }], equipment: { weapon: { weaponType: 'sword', grade: 'D' }, offhand: null, armor: null } });
    const state2 = makeFakeState([c, d]);
    const report2 = simulateGameDay(state2, { rng: () => 0.5 });
    const newSkillEvents2 = report2.events.filter((e) => e.type === 'new_skill');
    check('heroes who already know the skill emit no new_skill event', newSkillEvents2.length === 0, `events=${newSkillEvents2.length}`);
  }

  // =========================================================================
  console.log('\n--- 5. SPEECH BUBBLES DISPOSE THEIR TEXTURE AND MATERIAL ---');
  {
    const { HubHeroNPC } = await import('../src/hub/HubHeroes.js');
    const THREE = await import('three');
    const proto = HubHeroNPC.prototype;

    // Case 1: a real bubble with a canvas texture is fully released.
    let mapDisposed = 0;
    let matDisposed = 0;
    const parent = { remove() {} };
    const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(new (class {})()) }));
    bubble.parent = parent;
    const map = bubble.material.map;
    map.dispose = () => { mapDisposed += 1; };
    bubble.material.dispose = () => { matDisposed += 1; };
    const thisCtx = { speechBubble: bubble };
    proto.disposeSpeechBubble.call(thisCtx);
    check('disposeSpeechBubble removes the sprite, disposes the map and the material', thisCtx.speechBubble === null && mapDisposed === 1 && matDisposed === 1, `map=${mapDisposed} mat=${matDisposed} bubble=${thisCtx.speechBubble}`);

    // Case 2: a bubble whose material has no map still disposes safely.
    let mat2Disposed = 0;
    const bubble2 = new THREE.Sprite(new THREE.SpriteMaterial({}));
    bubble2.parent = { remove() {} };
    bubble2.material.dispose = () => { mat2Disposed += 1; };
    const thisCtx2 = { speechBubble: bubble2 };
    proto.disposeSpeechBubble.call(thisCtx2);
    check('disposeSpeechBubble tolerates a material without a texture map', thisCtx2.speechBubble === null && mat2Disposed === 1, `mat=${mat2Disposed}`);

    // Case 3 (edge): no bubble is a safe no-op.
    const thisCtx3 = { speechBubble: null };
    let threw3 = false;
    try { proto.disposeSpeechBubble.call(thisCtx3); } catch (e) { threw3 = true; }
    check('disposeSpeechBubble is a safe no-op when there is no bubble', !threw3 && thisCtx3.speechBubble === null);
  }

  // =========================================================================
  console.log('\n--- BONUS. STRESS SUICIDE REMOVES THE ZOMBIE NPC ---');
  {
    const { HubHeroNPC } = await import('../src/hub/HubHeroes.js');
    const { gameState } = await import('../src/core/GameState.js');

    const hero = makeHero({ id: 'z1', name: 'Zombie', equipment: { weapon: { weaponType: 'sword', grade: 'D' }, offhand: null, armor: null } });
    const scene = { add() {}, remove() {} };
    const npc = new HubHeroNPC(hero, scene);
    const manager = { npcs: [npc] };
    npc.heroesManager = manager;
    // The singleton must know the hero so killHero can record the death.
    gameState.heroes = [hero];
    gameState.deadHeroes = [];

    check('the avatar starts in the manager', manager.npcs.includes(npc));
    npc.triggerStressSuicide();
    await wait(2300); // the 2-second stress fade

    check('the dead avatar is removed from manager.npcs (no zombie)', !manager.npcs.includes(npc) && manager.npcs.length === 0, `npcs=${manager.npcs.length}`);
    check('the hero is dead and recorded in the fallen-heroes list', hero.alive === false && gameState.deadHeroes.some((d) => d.id === 'z1' && /stress/i.test(d.deathCause || '')), `alive=${hero.alive} dead=${gameState.deadHeroes.length}`);
    check('disposeMeshes frees the avatar meshes without throwing', npc.labelSprite === null);
  }

  // =========================================================================
  console.log('\n--- CONSOLE INTEGRITY ---');
  check('Zero Console Errors', capturedErrors.length === 0, `Errors: ${capturedErrors.length}`);

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log('\n========================================================');
  console.log(`📋 PHASE 11 BUGFIX RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('========================================================\n');

  if (passed === total) {
    console.log('🎉 ALL PHASE 11 TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME PHASE 11 TESTS FAILED!');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unhandled Test Runner Exception:', err);
  process.exit(1);
});
