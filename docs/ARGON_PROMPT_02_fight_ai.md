# ARGON PROMPT 02 — FIGHT AI & EMOTION-DRIVEN FIGHTS

> Copy everything inside the single fenced block below and send it to Argon as one message.
> Argon cannot see the repository. Everything it needs is in this prompt.

````
# ARGON — PHASE 2 DESIGN: FIGHT AI, EMOTION-DRIVEN FIGHTS, FAIRY INTERVENTION

## PART 1 — WHO YOU ARE AND HOW YOU MUST WORK

You are **Argon**, a senior gameplay engineer designing Phase 2 of the emotion and
training system for a browser 3D RPG. You have written detailed phased implementation
plans for this project before (Phase 1: the emotion data model, the daily decision
engine, the training engine, the login report, the training place, and the roster UI).
Phase 1 is implemented, tested and merged. You are now designing **Phase 2**.

**You cannot see the code.** Everything you need is in this prompt. Do not ask for
files, do not guess at APIs, do not write "as appropriate" or "similar to above".

### Hard rules for this plan

1. **Every number lives in a config table.** No magic numbers in logic files. If a
   value can be tuned, it goes in `src/data/emotions.config.js` (emotion/fight
   behaviour) or `src/data/training.config.js` (training/spar tuning). Name the
   exact key you are adding and give its exact default value.
2. **One code path for live play and offline simulation.** The offline login
   simulation must call the *same functions* as live play. Never write a second
   implementation "for the offline case". A hero must behave identically whether
   the player is watching or away.
3. **Pure, headless core.** Anything that decides *what a hero does* must live in
   `src/core/` and must not import Three.js, the DOM, or `localStorage`. It takes
   plain data in and returns plain data out, so it can be unit tested in Node with
   no browser. The Three.js layer only *executes* the decision.
4. **Zero allocations in per-frame code.** No `new THREE.Vector3()`, no `new
   THREE.Mesh()`, no closures created per frame inside `update()` loops. Use
   preallocated module-scope scratch objects (`_v0`, `_v1`, `_q0`) or object pools.
5. **Reuse the real combat code.** Never invent a second damage formula. Real
   fights go through `DamageResolver.resolve()` and the real `Combatant` +
   `StateMachine`. The Fight AI only *chooses actions*; the combat engine still
   resolves damage, blocking, parries, hit zones, poise and death.
6. **Do not break Phase 1.** The emotion fields, the daily decision engine, the
   training engine, the training place, the login report, the roster panels, the
   save migration and the existing combat code must all keep working. Old saves
   must still load. You may not remove or rename a public export that Phase 1
   introduced.
7. **Data-driven, not hardcoded.** All content (fight triggers, AI behaviour
   weights, report text) comes from tables. The report text belongs in
   `src/data/iselle.js` (Iselle's dialogue) or in the config tables, not inline
   in logic.
8. **Every system you design must ship with tests.** For each system, list the
   exact test file name, the exact test case names, and the expected result of
   each case. A test without a stated expected result does not count.
9. **Update `docs/CODEMAP.md`.** Every new file, every new export, every changed
   import must be reflected. The repo has a `node scripts/check_codemap.mjs`
   check that must print `CODEMAP OK`.
10. **Be exact.** A plan another coding agent can execute without asking a
    question. Exact file paths. Exact function names and signatures. Exact data
    structures with field names and types. Exact config keys and values. Exact
    edge-case behaviour. Exact test names and expected results.

### What this plan is for

The plan you write will be executed by a coding agent that is **weak at vague
instructions** (a Gemini-class model). If a detail is ambiguous, that agent will
invent it and you will get a broken implementation. Assume the reader knows
JavaScript, Three.js and this codebase's conventions, but knows **nothing** about
your plan except what you write down.

---

## PART 2 — CODE FACTS (verified current state)

Stack: **Three.js 0.160 + Vite + Vanilla JS**. No TypeScript, no build step beyond
Vite. ES modules with explicit `.js` extensions in import paths.

Folder layout: `src/core/` (pure logic + singletons), `src/data/` (tables and
config), `src/combat/` (combat engine), `src/hub/` (town scene NPCs), `src/ui/`
(DOM windows), `src/scenes/` (Three.js scenes), `src/art/` (procedural meshes),
`scripts/` (headless test scripts run by `node`).

### 2.1 `src/data/emotions.config.js`

A single frozen `EMOTION_CONFIG` object plus two exported helpers
`getDefaultMentality(heroClass, star)` and `getDefaultMotivationScore(motivationString)`.

Values that matter for Phase 2 (current values, verbatim):

```js
  // --- Unsanctioned fights ------------------------------------------------
  FIGHT_ANGER_THRESHOLD: 70,
  FIGHT_TENSION_THRESHOLD: 35,
  FIGHT_LOW_RELATION_THRESHOLD: 20,

  // --- Squad leader -------------------------------------------------------
  LEADER_INTERVENE_MAX_DIST: 7.0,
  LEADER_INTERVENE_POWER_RATIO: 1.0,

  // --- Iselle intervention ------------------------------------------------
  ISELLE_INTERVENE_HP_RATIO: 0.25,
  ISELLE_INTERVENE_CRITICAL_ZONES: Object.freeze(['head', 'heart']),
  ISELLE_MAX_FIGHT_DURATION_SEC: 25.0,
  ISELLE_MAX_FIGHT_TOTAL_DAMAGE: 120,
  ISELLE_SAFE_HEAL_HP_RATIO: 0.5,
  ISELLE_ANGER_REDUCTION: 25,
  ISELLE_FEAR_GAIN: 10,
  ISELLE_LAW_REPRIMAND_DELAY: 1.5,

  // --- Lobby laws ---------------------------------------------------------
  LOBBY_LAWS: Object.freeze({
    NO_OUTSIDE_FIGHTING: 'No fighting outside the sparring ring',
    NO_LETHAL_SPAR_BLOWS: 'No lethal blows to the head or heart in sparring',
    NO_ATTACK_LOW_HP: 'No attacking a hero below the safe HP threshold',
  }),
  LAW_BREAK_MOTIVATION_PENALTY: 15,

  // --- Report importance (Iselle's Report sorting) ------------------------
  REPORT_IMPORTANCE: Object.freeze({
    died: 100,
    iselle_intervened: 90,
    law_broken: 88,
    fought_hero: 85,
    injured: 80,
    skill_combined: 75,
    new_skill: 70,
    level_up: 65,
    leader_ordered: 55,
    got_scared: 45,
    trained: 40,
    ate: 25,
    rested: 20,
    did_nothing: 10,
  }),
  REPORT_HISTORY_MAX: 5,
  ACTIVITY_HISTORY_MAX: 10,
```

Also relevant, already present: `PANIC_MENTALITY_THRESHOLD: 30`,
`PANIC_FEAR_THRESHOLD: 60`, `HIGH_FATIGUE_REST_THRESHOLD: 70`,
`HIGH_FEAR_THRESHOLD: 50`, `HIGH_HUNGER_THRESHOLD: 65`,
`DAILY_HUNGER_GAIN: 18`, `HIGH_HUNGER_MOTIVATION_PENALTY: 8`,
`HIGH_HUNGER_ANGER_GAIN: 10`, `FEAR_GAIN_BIG_DAMAGE: 14`,
`FEAR_GAIN_LOSS: 12`, `ANGER_GAIN_LOSS: 14`, `ANGER_GAIN_RIVALRY: 8`,
`TRAIT_MODIFIERS` (keys `diligent`, `lazy`, `brave`, `cautious`, `hot_headed`; each
may carry `fearGainMult`, `angerGainMult`, `trainWeight`, `idleWeight`,
`sparWeight`, `restWeight`, `refuseOrderBonus`).

### 2.2 `src/data/training.config.js`

A single frozen `TRAINING_CONFIG` object. Values that matter for Phase 2:

```js
  SPAR_EXCHANGES: 6,
  SPAR_DAMAGE_PER_EXCHANGE_MULT: 1.0,
  SPAR_LOW_HP_THRESHOLD: 0.2,
  SPAR_LOW_HP_XP_BONUS_MULT: 1.5,
  SPAR_FEAR_ON_LOSS: 12,
  SPAR_ANGER_ON_LOSS: 14,
  HIT_ZONE_WEIGHTS: Object.freeze({ melee: {...}, arrow: {...}, spell: {...} }),
  HIT_ZONE_DAMAGE_MULT: Object.freeze({ limbs: 0.85, torso: 1.0, head: 1.75, heart: 2.0 }),
  CRITICAL_ZONES: Object.freeze(['head', 'heart']),
  TRAINING_FAST_HEAL_PER_SEC: 12.0,
  CRITICAL_INJURY_HEAL_MULT: 0.15,
```

### 2.3 `src/core/EmotionEngine.js` (322 lines, pure, headless)

Exports: `getTraitModifiers(hero)`, `isHeroPanicking(hero)`,
`applyFearGain(hero, rawFearAmount)`, `applyDailyEmotionTick(hero, foodQuality)`,
`applyEatOutcome(hero, foodQuality)`, `applyRestOutcome(hero, facilityLevel)`,
`evaluateSquadLeaderOrder(gameState, leader, idleHeroes, rng)`,
`pickTrainingTypeForHero(hero, rng)`, `evaluateTensionFight(gameState, hero, rng)`.

**Critical fact for Phase 2: the fight trigger already exists, but it resolves a
fight INSTANTLY and WITHOUT any real combat.** There is no fight AI and no
simulation of blows — the fight is a narrative event only. This is the main thing
Phase 2 replaces.

```js
export function evaluateTensionFight(gameState, hero, rng = Math.random) {
  const none = { occurred: false, opponentId: null, stoppedBy: null, lawBroken: null, reportEvents: [] };
  if (!gameState || !hero || hero.alive === false) return none;
  if ((hero.anger ?? 0) < EMOTION_CONFIG.FIGHT_ANGER_THRESHOLD) return none;

  const others = (gameState.heroes || []).filter((h) => h.alive && h.id !== hero.id);
  const rival = others.find((o) => {
    const tension = gameState.getTension(hero.id, o.id);
    const relation = gameState.getRelation(hero.id, o.id);
    return (
      tension >= EMOTION_CONFIG.FIGHT_TENSION_THRESHOLD ||
      relation < EMOTION_CONFIG.FIGHT_LOW_RELATION_THRESHOLD
    );
  });
  if (!rival) return none;

  const reportEvents = [];
  const day = gameState.dayCount;

  applyFearGain(hero, EMOTION_CONFIG.FEAR_GAIN_LOSS);
  applyFearGain(rival, EMOTION_CONFIG.FEAR_GAIN_LOSS);
  addHeroAnger(hero, EMOTION_CONFIG.ANGER_GAIN_RIVALRY);
  addHeroAnger(rival, EMOTION_CONFIG.ANGER_GAIN_RIVALRY);

  reportEvents.push({
    day, heroId: hero.id, heroName: hero.name,
    type: 'fought_hero',
    importance: EMOTION_CONFIG.REPORT_IMPORTANCE.fought_hero,
    text: `${hero.name} and ${rival.name} came to blows in the town.`,
    details: { opponentId: rival.id, opponentName: rival.name },
  });

  const lawBroken = EMOTION_CONFIG.LOBBY_LAWS.NO_OUTSIDE_FIGHTING;

  const motivationBefore = hero.motivationScore ?? 0;
  hero.motivationScore = clamp100(motivationBefore - EMOTION_CONFIG.LAW_BREAK_MOTIVATION_PENALTY);
  addHeroAnger(hero, -EMOTION_CONFIG.ISELLE_ANGER_REDUCTION);
  addHeroAnger(rival, -EMOTION_CONFIG.ISELLE_ANGER_REDUCTION);
  applyFearGain(hero, EMOTION_CONFIG.ISELLE_FEAR_GAIN);
  applyFearGain(rival, EMOTION_CONFIG.ISELLE_FEAR_GAIN);

  reportEvents.push({
    day, heroId: hero.id, heroName: hero.name,
    type: 'law_broken',
    importance: EMOTION_CONFIG.REPORT_IMPORTANCE.law_broken,
    text: `${hero.name} broke a lobby law: ${lawBroken}.`,
    details: { law: lawBroken, motivationPenalty: EMOTION_CONFIG.LAW_BREAK_MOTIVATION_PENALTY },
  });

  reportEvents.push({
    day, heroId: hero.id, heroName: hero.name,
    type: 'iselle_intervened',
    importance: EMOTION_CONFIG.REPORT_IMPORTANCE.iselle_intervened,
    text: `Iselle separated ${hero.name} and ${rival.name}.`,
    details: { opponentId: rival.id, opponentName: rival.name, reason: 'unsanctioned_fight' },
  });

  return { occurred: true, opponentId: rival.id, stoppedBy: 'iselle', lawBroken, reportEvents };
}
```

### 2.4 `src/core/DailyDecisionEngine.js` (456 lines, pure, headless)

Exports: `computeActivityWeights(hero, gameState)`,
`chooseDailyActivity(hero, gameState, rng)`, `simulateGameDay(gameState, options)`,
`simulateMultipleDays(gameState, daysCount, options)`.

`simulateGameDay` is THE daily code path, called by both `GameState.startNewDay()`
(live) and `simulateMultipleDays` (offline). Its four steps are:

1. `applyDailyEmotionTick(hero, gameState.foodQuality)` for every alive hero.
2. Every alive hero picks an activity via `chooseDailyActivity` and the matching
   outcome is applied (`eat` → `applyEatOutcome`, `rest` → `applyRestOutcome`,
   `spar` → `resolveSparringSession`, `train_*` → `resolveTrainingSession`,
   `idle` → recorded).
3. The Squad Leader may order ONE idle hero to train
   (`evaluateSquadLeaderOrder`).
4. **Every alive hero is checked for an unsanctioned fight**
   (`evaluateTensionFight`).

Step 4 is the current hook point for emotion-driven fights. It is a plain
`for (const hero of alive)` loop, so a pair of heroes can currently pick each
other simultaneously and two fights can start in the same day.

```js
  // 4. Heroes with enough anger and tension start unsanctioned fights.
  for (const hero of alive) {
    const fight = evaluateTensionFight(gameState, hero, rng);
    if (fight.occurred) {
      report.fights.push(fight);
      for (const event of fight.reportEvents) push(event);
    }
  }

  return report;
}
```

`simulateMultipleDays` returns:

```js
{ days: number, seed: number, events: ReportEvent[], dayReports: DaySimulationReport[], activitiesByHero: Record<heroId, string[]> }
```

where `ReportEvent` is:

```js
{ day: number, heroId: string, heroName: string, type: string,
  importance: number, text: string, details: object }
```

and `DaySimulationReport` is:

```js
{ day: number, mode: 'live'|'offline', events: ReportEvent[],
  activities: Array<{heroId, heroName, activity}>, idleHeroIds: string[],
  leaderOrder: object|null, fights: object[], spars?: object[], sessions?: object[] }
```

### 2.5 `src/core/TrainingEngine.js` (636 lines, pure, headless)

Exports: `findHeroSkill(hero, skillId)`, `heroKnowsSkill(hero, skillId)`,
`rollHitZone(attackKind, rng)`, `rollSessionOutcome(rng)`,
`recordTrainingDamageAndHeal(hero, damageTaken, damageHealed)`,
`checkAndUnlockPainTolerance(hero)`, `recordCoTraining(hero, skillIdA, skillIdB)`,
`checkAndCombineSkills(hero)`, `pickPrimarySkillForHero(hero)`,
`resolveTrainingSession(hero, trainingType, gameState, options)`,
`handleHeroDeathAndDropGear(gameState, hero, floor, deathCause)`,
`resolveSparringSession(heroA, heroB, gameState, options)`.

`resolveSparringSession(heroA, heroB, gameState, options)` is the HEADLESS spar.
It runs `SPAR_EXCHANGES` (6) exchanges of 3 seconds each. Each exchange: roll a
hit zone, compute `raw = stats.damage * HIT_ZONE_DAMAGE_MULT[zone]`, deal
`raw * (1 - defender.defense)`. It stops when the zone is critical, when a
fighter drops below `ISELLE_INTERVENE_HP_RATIO` (0.25) HP, when the Squad Leader
is stronger than both, when `elapsed > ISELLE_MAX_FIGHT_DURATION_SEC` (25), or
when `totalDamage > ISELLE_MAX_FIGHT_TOTAL_DAMAGE` (120).

It returns:

```js
{ heroAId, heroBId, exchanges, elapsedSec, totalDamage, hitZone,
  stoppedBy: 'leader'|'iselle'|null, stopReason: string|null, lawBroken: string|null,
  skillXpA, skillXpB, heroExpA, heroExpB, skillA, skillB,
  lowHpBonusA, lowHpBonusB, painToleranceA, painToleranceB, injuries: [],
  hpA, hpB, maxHpA, maxHpB }
```

This function is a **closed system with no per-blow decision making** — the two
fighters always trade blows. Phase 2 must decide whether the Fight AI replaces
this, wraps it, or lives beside it, and must say so explicitly.

### 2.6 `src/hub/TownSparringController.js` (427 lines, Three.js layer)

Exports the class `TownSparringController`. Constructor:
`constructor(scene, heroesManager, iselle, navGrid)`.

Methods: `setAnchors(anchors, ringRadius = 2.2)`, `createFighter(npc)`,
`startSpar(npcA, npcB, isSanctionedInRing = true)`, `isInsideRing(x, z)`,
`getRingRadius()`, `interveneWithLeader(session, leaderHero)`,
`interveneWithIselle(session, reason, lawBroken = null)`,
`separateFighters(session)`,
`resolveBlow(attackerFighter, defenderFighter, attackerNpc, defenderNpc)`,
`findLeaderNpc()`, `update(delta, leaderPos = null)`, `powerOf(npc)`,
`finishSpar(session)`, `isSparring()`.

Module constants: `EXCHANGE_INTERVAL = 0.9` seconds between blows,
`SPAR_SPEED = 3.2`. Module-scope scratch vectors: `_vMid`, `_vToA`, `_vToB`.

`createFighter(npc)` builds a **real `Combatant`** from the NPC's hero data:

```js
  createFighter(npc) {
    const hero = npc.heroData;
    const stats = getCombatStats(hero);
    const weapon = hero.equipment && hero.equipment.weapon;
    const offhand = hero.equipment && hero.equipment.offhand;

    const fighter = new Combatant({
      id: `spar_${hero.id}`, name: hero.name, team: 'neutral', roleTag: 'grunt',
      maxHp: stats.maxHp, hp: stats.maxHp,
      maxStamina: stats.maxStamina, stamina: stats.maxStamina,
      defense: stats.defense, baseAttack: stats.damage, moveSpeed: stats.moveSpeed,
      position: npc.mesh.position,
      weapon: { kind: (weapon && weapon.weaponType) || 'sword',
                grade: (weapon && weapon.grade) || 'D',
                damageMult: (weapon && weapon.damageMult) || 1.0 },
      shield: offhand && offhand.weaponType === 'shield'
        ? { kind: 'shield', grade: offhand.grade || 'D', blockEfficiency: 0.65 } : null,
    });
    fighter.incomingDamageReduction = stats.incomingDamageReduction || 0;
    return fighter;
  }
```

`update(delta)` order of operations (this is the live fight loop; Phase 2 changes it):

```js
  update(delta, leaderPos = null) {
    const session = this.activeSpar;
    if (!session) return;
    session.elapsed += delta;
    session.exchangeTimer += delta;

    // 1. The Squad Leader can break the fight up first
    const leaderNpc = this.findLeaderNpc();
    if (leaderNpc && leaderNpc !== session.npcA && leaderNpc !== session.npcB) {
      const dist = Math.hypot(leaderNpc.mesh.position.x - session.ringCenter.x,
                              leaderNpc.mesh.position.z - session.ringCenter.z);
      if (dist <= EMOTION_CONFIG.LEADER_INTERVENE_MAX_DIST) {
        const leaderPower = this.powerOf(leaderNpc);
        if (leaderPower > Math.max(this.powerOf(session.npcA), this.powerOf(session.npcB)) *
            EMOTION_CONFIG.LEADER_INTERVENE_POWER_RATIO) {
          this.interveneWithLeader(session, leaderNpc.heroData);
          this.finishSpar(session);
          return;
        }
      }
    }

    // 2. Exchange blows (only when exchangeTimer >= EXCHANGE_INTERVAL)
    //    ... resolveBlow(A,B) then resolveBlow(B,A) ...
    //    ... then the intervention checks ...

    // 3. Fast heal both fighters (runs AFTER the exchange on purpose)
    //    heal = TRAINING_CONFIG.TRAINING_FAST_HEAL_PER_SEC * delta * healRateMult
  }
```

The intervention check order inside step 2 is:
`!session.inRing` (NO_OUTSIDE_FIGHTING) → `blowA.critical || blowB.critical`
(NO_LETHAL_SPAR_BLOWS) → `ratioA < 0.25 || ratioB < 0.25` (NO_ATTACK_LOW_HP) →
`elapsed > 25` → `totalDamage > 120`.

`interveneWithIselle(session, reason, lawBroken)` already: sets `stoppedBy`,
`stopReason`, `lawBroken`; heals both fighters to `ISELLE_SAFE_HEAL_HP_RATIO` (0.5)
of max HP; applies `addHeroAnger(hero, -25)` and `applyFearGain(hero, 10)` to
both; applies `motivationScore -= 15` to the offender when a law was broken;
calls `separateFighters(session)`; and calls `this.iselle.say('lawReprimand',
{ force: true, text: line })`.

`finishSpar(session)` applies: the loser gets `applyFearGain(FEAR_GAIN_LOSS)` and
`addHeroAnger(ANGER_GAIN_LOSS)`; both get `fatigue += 20` and
`currentActivity = 'rest'`.

### 2.7 `src/combat/DamageResolver.js` (315 lines) — the real damage path

`DamageResolver.resolve(defender, hitPayload)` → result object.

`hitPayload` fields consumed: `attacker` (Combatant), `attackerPosition`
(THREE.Vector3), `attackerName` (string), `target`, `rawDamage` (number),
`poiseDamage` (number), `weaponMult` (number), `weaponGrade` (string 'D'..'S'),
`attackMoveMult` (number), `hitZone` (string), `attackKind`
('melee'|'arrow'|'spell'), `spellId` (string).

Resolution order: **(0)** roll the hit zone if `hitPayload.hitZone` is absent
(`rollHitZone(attackKind)`) and read `zoneMult` from
`TRAINING_CONFIG.HIT_ZONE_DAMAGE_MULT`; **(1)** i-frame dodge; **(2)** frontal
120-degree cone; **(3)** parry; **(4)** block (with guard break); **(5)** unblocked
hit. Step (5) is the interesting one:

```js
    const weaponMult = hitPayload.weaponMult || 1.0;
    const gradeMult = GRADE_MULTS[hitPayload.weaponGrade || 'D'] || 1.0;
    const moveMult = hitPayload.attackMoveMult || 1.0;
    const counterMult = attacker && attacker.counterWindowTimer > 0 ? 1.40 : 1.00;

    const baseDmg = hitPayload.rawDamage ?? hitPayload.damage ?? 15;
    const rawDmg = baseDmg * weaponMult * gradeMult * moveMult * counterMult * zoneMult;
    const defReduction = Math.max(0.0, Math.min(0.75, defender.defense || 0.10));
    let finalDamage = Math.max(1, Math.round(rawDmg * (1 - defReduction)));

    // Pain Tolerance shaves a slice off every incoming blow.
    const painReduction = defender.incomingDamageReduction || 0;
    if (painReduction > 0) {
      finalDamage = Math.max(1, Math.round(finalDamage * (1 - painReduction)));
    }
```

The `onHit` combat event carries: `attackerName`, `targetName`, `damage`,
`poiseDamage`, `isCritical`, `isPoiseBreak`, `spellId`, `hitZone`.

**`Combatant` and `StateMachine` are the only actor model.** `COMBAT_STATES` is
`{IDLE, MOVE, ATTACK, BLOCK, PARRY, DODGE, STAGGER, CAST, AIM, DEAD}`. A
`Combatant` exposes: `hp`, `maxHp`, `stamina`, `maxStamina`, `mana`,
`defense`, `position` (Vector3), `facingYaw`, `velocity`, `knockbackVelocity`,
`shield`, `weapon`, `statusEffects` (Map), `stateMachine`, `iFrameTimer`,
`parryWindowTimer`, `counterWindowTimer`, `poise`, `maxPoise`, `isPoiseBroken`,
`damageFlashTimer`, `rig`, `hitTargetsThisSwing` (Set), `incomingDamageReduction`,
`spendStamina(amount)`, `applyStatusEffect(type, potency, duration)`,
`die()`, `receiveHeal(amount)`.

`StateMachine.transitionTo(newState, payload)` is the only way to change state.
`Combatant.update(rawDt, worldDt)` and `StateMachine.update(worldDt, rawDt)` are
driven by the scene loop.

**Important:** `Combatant` and `DamageResolver` are currently used ONLY by the Dev
Lab (`src/dev/`), the combat sandbox (`src/combat/testSandbox.js`) and the town
sparring. The live dungeon combat uses the legacy `src/player/Player.js` path and
is NOT affected by changes to `DamageResolver`.

### 2.8 `src/hub/HubHeroes.js` (1290 lines, Three.js layer, PROTECTED AREA)

`src/hub/*` is a **protected area**: `AGENTS.md` forbids modifying it without
explicit user permission. Any change to `src/hub/*` or `src/ui/*` must be
flagged in the plan as requiring sign-off, and must be the smallest possible
change.

Exports: `createSpeechBubbleSprite`, `HubHeroNPC`, `HubHeroesManager`.

`HubHeroNPC` constructor:
`constructor(heroData, scene, onRuleBreak = null, getGroundY = null, navGrid = null, isNewSummon = false)`.

NPC states (string): `'idle' | 'walk' | 'walk_corridor' | 'training' |
'inside_dorm' | 'search_wall' | 'walk_dorm' | 'sleeping_cottage' |
'walk_cottage'`.

Relevant fields: `heroData` (the GameState hero object), `mesh` (THREE.Group),
`state`, `targetPos` (Vector3), `speed`, `timer`, `trainingSlot`,
`trainingSkill` (`{id, name, level, exp}`), `trainingZone`
(`'dummy'|'archery'|'magic'|'spar'`), `trainingTargetPos` (Vector3),
`trainingDuration`, `trainingExpTimer`, `trainingStatTimer`,
`dailyActivity` (string), `isBeingPunished`, `isDyingFromStress`, `offenses`.

Relevant methods: `setDestination(x, z, onArrival = null)`, `pickNewTarget()`,
`goToDormitory()`, `showSpeechBubble(text, duration)`, `showAngryBubble(duration)`,
`updateRigPose(delta, state, camera, hanPos)`,
`executeDailyActivity(activity, trainingZones, anchors, sparringController = null, usedSlots = null)`,
`update(delta, getGroundY, hanPos, camera)`.

`updateRigPose` is how an NPC animates. It takes
`{ action, actionTime, mood }`. Known action names used in this file:
`'trainSword'`, `'trainSpear'`, `'trainBow'`, `'trainDagger'`, `'trainMagic'`,
plus `'idle'`, `'walk'`, `'death'`.

`HubHeroesManager` constructor: `constructor(scene, iselle = null, navGrid = null)`.
Methods: `spawnHeroes(heroesList, getGroundY, navGrid)`,
`spawnNewSummonHero(heroData, getGroundY)`,
`assignDailyActivities(trainingZones, anchors, sparringController = null)`,
`handleRuleBreak(npc)`, `triggerPunishmentOnNpc(npc, onComplete = null)`,
`executeHero(npc, onComplete = null)`, `restAll()`, `update(...)`.

`handleRuleBreak(npc)` shows an angry bubble and picks one of three disruptive
actions (`'attack'`, `'wander'`, `'refuse'`). The `'attack'` action walks the NPC
towards another NPC and sets `npc.timer = 5` — **it is a walk, not a fight.**

`triggerPunishmentOnNpc(npc, onComplete)` shows the warning message and calls the
callback. It deliberately does NOT touch `npc.heroData.offenses`.

`executeHero(npc, onComplete)` plays `PunishmentEffect` then calls
`gameState.killHero(npc.heroData.id, 1, 'Punished for breaking the rules')`.

### 2.9 `src/hub/Iselle.js` → `src/art/IselleRig.js` (the fairy)

`src/hub/Iselle.js` is a 4-line re-export: `export { IselleRig, IselleRig as Iselle }`.

`IselleRig` constructor: `constructor(scene)`.

Public methods relevant to Phase 2:
- `say(category, opts = {})` — `opts.text` overrides the category line, `opts.force`
  bypasses the 8-second reaction cooldown, `opts.duration` sets bubble duration.
  Categories are looked up in `src/data/iselle.js` `ISELLE_LINES`.
- `moveTo(position, speed = 1.2)` — sets `targetPosition` and `moveSpeed`; the rig
  walks there in its own `update(delta, time, playerPos, getGroundY, camera)`.
- `follow(target, offset)` — follows a moving target.
- `setVisible(bool)`, `setOpacity(a)`, `playOnce(pose, expression)`.
- `getHeadWorldPosition()`, `getMouthWorldPosition()` — world-space anchors for VFX.

`IselleRig.update(delta, time, playerPos, getGroundY, camera)` is called every
frame by `HubScene`. **If Iselle is given a `moveTo` target she will walk there on
her own** — you do not need to animate her position manually.

Existing dialogue categories in `src/data/iselle.js`: `greetings`, `summonGood`,
`summonBad`, `synthesisStart`, `promotionDone`, `floorClear`, `heroDied`,
`mandatoryQuest`, `idleTeasing`, `punish`, `reportIntro`, `reportPeaceful`,
`reportIncident`, `lawReprimand`.

### 2.10 `src/hub/PunishmentEffect.js` (the existing VFX pattern to copy)

`constructor(scene)`, `play(npc, iselle, camera, onComplete = null)`,
`update(delta, time)`, `endEffect()`. It builds a **beam mesh** (a stretched
cylinder aimed from Iselle's hand at the target), a **light column mesh** over the
target, a **40-particle `THREE.Points` dissolve** and an optional full-screen
flash overlay div. It reads `iselle.getHandWorldPosition()` / equivalent anchors
and `camera` for shake. It runs a timed sequence via `update(delta, time)` and
invokes `onComplete` at the end. **Copy this structure** for any new fairy VFX;
do not invent a new VFX framework.

`src/combat/Combat.js` exports `spawnSparks(scene, position, color, count)` for a
cheap particle burst.

### 2.11 `src/core/GameState.js` — the singleton

`import { gameState } from '../core/GameState.js'`.

Relevant members: `heroes` (array), `party` (array of `{id, formation}`),
`gold`, `dayCount`, `dayTimer`, `foodQuality`, `relations` (Record of
`'idA|idB'` → intimacy 0..100), `tensions` (Record of `'idA|idB'` → tension 0..100),
`lastLoginTimestamp`, `loginReportHistory` (array of report models),
`overflowLoot`, `flags` (object), `facilities` (object with `training`,
`cafeteria`, `dormitory`, ... each `{level, unlocked, ...}`), `trainingSlots`
(array of 3, each `{heroId, skillId, expGained, startTime}` or `null`).

Relevant methods: `getRelation(idA, idB)`, `addIntimacy(idA, idB, amount)`,
`getTension(idA, idB)`, `addTension(idA, idB, amount)`,
`getPairRelationship(idA, idB)` (returns `{intimacy, tension, isRival}`),
`ensureSquadLeader()`, `addExp(heroId, amount)`, `addStress(heroOrId, amount)`,
`killHero(id, floor, deathCause)`, `saveToLocalStorage()`, `startNewDay()`,
`normalizeHeroEmotionFields(hero, rawHero)`.

**`addIntimacy` and `addTension` both call `saveToLocalStorage()` internally.**

### 2.12 `src/ui/IselleReportWindow.js` — the login report UI

A `SystemWindow` subclass: `constructor(onDismissCallback = null)`, methods
`openReport(reportModel)`, `renderReport(reportModel)`, `close()`.

It renders, in order: the Iselle quote, the summary banner, a meta line, one
card per hero (with that hero's events, coloured by `event.type`), a "DID
NOTHING" box, and a "FALLEN" box.

`EVENT_COLORS` is a local map from report event type → hex colour. **If you add
new report event types you must add a colour for each, or the event renders in
the default grey.**

The report model built by `src/core/LoginSimulation.js` `buildIselleReportModel()`
has this shape:

```js
{ gameDaysSimulated, realHoursAway, startDay, endDay, summaryLine,
  iselleQuote, sortedEvents: ReportEvent[], perHeroSummaries: [...],
  idleHeroNames: string[], fallenHeroes: [...] }
```

### 2.13 THE OLD 3-SLOT TRAINING XP — read this carefully, it is System 5

There are currently **THREE** independent sources of training XP for a hero:

| # | Source | File | Rate | Level-up rule |
|---|--------|------|------|---------------|
| A | Manual Training Window | `src/hub/TrainingManager.js` → `TrainingHeroAvatar.onTick()` | every 5 s: `round(8 * (1 + facilityLevel * 0.25))` XP, `+3` fatigue | own logic: threshold `100 * skill.level`, max level 10 |
| B | Old autonomous NPC training | `src/hub/HubHeroes.js` → `HubHeroNPC.startAutonomousTraining()` + the `state === 'training'` branch of `update()` | every 5 s: `perHit * 5 * (1 + (tgLevel-1)*0.10) * (diligent ? 1.5 : 1.0)` XP where `perHit` is `TRAINING_CONFIG.LIVE_ACTION_XP_PER_HIT[zone]` (dummy 6, archery 6, magic 7, spar 10), `+3` fatigue | shared `addSkillExp()` from `src/data/skills.js` |
| C | New daily-activity NPC training | `src/hub/HubHeroes.js` → `HubHeroNPC.executeDailyActivity()` → the SAME `state === 'training'` branch as B | identical to B (it is the same code) | shared `addSkillExp()` |

**Paths A and B/C are mutually exclusive today only by accident**: path A claims a
`gameState.trainingSlots[i]` entry and path B also claims a `gameState.trainingSlots[i]`
entry, and both use the same `HubHeroNPC.state === 'training'` branch. Path C does
NOT claim a slot at all, so a hero doing a daily activity and a hero using the
manual window can both be in `state === 'training'` and **both tick the same XP
branch** — the XP is awarded twice.

Path A also has its own level-up implementation that duplicates `addSkillExp()`, and
its own `gameState.saveToLocalStorage()` every 5 seconds per avatar.

`gameState.trainingSlots` is saved, migrated and read by `src/ui/TrainingWindow.js`,
`src/hub/TrainingManager.js` and `src/hub/HubHeroes.js`.

### 2.14 `src/data/skills.js` and `src/core/Stats.js`

`src/data/skills.js` exports `SKILLS` (a frozen table of skill definitions:
`{id, name, type, maxLevel, description, effects}`), `getSkill(id)`,
`getSkillEffects(hero)`, `addSkillExp(hero, skillId, amount)`, `rollStatFromSkill(skillId)`.

`addSkillExp(hero, skillId, amount)` is the ONE canonical way to award skill XP.
It handles the level-up curve and calls `showSystemMessage` (DOM safe: it no-ops
when `document` is undefined).

`src/core/Stats.js` exports `getCombatStats(hero, party = null, relations = null)`,
`getDisplayStats(hero)`, `formatStatDisplay(hero)`, `getGrowthRate(hero)`,
`getHeroThreeGroups(hero)`, `getPainToleranceLevel(hero)`.

`getCombatStats(hero)` returns:

```js
{ maxHp, maxStamina, damage, defense, moveSpeed, critChance, rollInvuln,
  blockWindow, parryWindow, blockStaminaMult, damageMult, blockMult,
  staminaDrainMult, reach, attackSpeed, painToleranceLevel,
  incomingDamageReduction, isExhausted }
```

`damage` is the raw attack value, `defense` is a 0..0.75 damage reduction fraction,
`maxHp` is the hit pool.

---

## PART 3 — THE GAME

**Pick Me Up: Infinite Gacha** is a browser 3D RPG inspired by the manhwa of the
same name. The player is the **Master** of a squad of up to 5 heroes living in the
town of **Niflheimr** (Town 1377). The player summons heroes from a gacha altar,
sends them into a tower dungeon to fight monsters, and can synthesise, promote,
feed and equip them.

Phase 1 added the **emotion and training system**:
- Heroes have Hunger, Fear, Anger, Motivation, Fatigue, Mentality and personality
  traits, plus pairwise relationships (intimacy) and tension.
- Every game day each hero autonomously picks an activity: train at the wooden
  dummies / archery targets / fire targets, spar, eat at the Cafeteria, rest in
  the Dormitory, or do nothing. The decision is a weighted random driven by
  class, personality traits, emotion levels and the current day.
- The player is offline for 8 real hours = 1 game day (capped at 9 game days).
  On login the offline simulation runs the **same** day code path and Iselle
  delivers "Iselle's Report" summarising what happened.
- The training yard has four zones: wooden dummies (sword + shield), archery
  targets (bow + quiver handling), fire targets (staff + mana control) and a
  rope **sparring ring**.
- Sparring (inside the ring, sanctioned) is legal. Any other fight in town is a
  **broken lobby law**.
- Three lobby laws: `NO_OUTSIDE_FIGHTING`, `NO_LETHAL_SPAR_BLOWS` (head or heart
  in a spar), `NO_ATTACK_LOW_HP` (attacking a hero below the safe HP threshold).
- The fairy **Iselle** is the town's guide and enforcer. She breaks up fights,
  heals heroes, calms them and reprimands offenders.
- The **Squad Leader** (default: Han Islat) can order one idle hero to train per
  day, and can break up a fight before Iselle does if he is nearby and stronger
  than both fighters.
- Stars are only a starting point: the growth multiplier runs 1.00 (1 star) to
  1.50 (7 stars) so a 1-star hero who trains beats a 3-star hero who never
  trains. This was verified by a 30-game-day simulation test.

**Phase 2 turns the emotion system into conflict.** Right now a fight is a
narrative event with no real combat. Phase 2 must make fights REAL: two heroes
must actually fight, the fight must be driven by how the two heroes *feel* and
what they *are*, the fight must be interruptible by the Squad Leader and by
Iselle, and the fight must leave emotional and relational scars that show up in
the next login report.

---

## PART 4 — WHAT TO DESIGN

Produce a phased implementation plan with **6 phases**, in this order. Each phase
must be independently finishable and independently testable, and must not break
the phases before it.

### PHASE 1 — Fight AI (the decision maker)

Design a **pure, headless** fight AI that decides what a hero does next.

**File:** `src/core/FightAI.js` (new). Pure: no Three.js, no DOM, no
`localStorage`, no `gameState` import.

**Required exports** (name them exactly like this, or justify a different name
explicitly in the plan):

- `chooseFightAction(context)` → one of the action strings below.
- `computeActionWeights(context)` → `Record<string, number>` of the weights.
- `getFightStyleForHero(hero)` → the style object for the hero's class/weapon.

**Actions** (exact strings): `'attack'`, `'defend'`, `'retreat'`, `'cast'`,
`'aim'`, `'switch_target'`, `'flee'`.

**The `context` object** must contain at least:
`self` (the hero data), `selfStats` (the result of `getCombatStats(self)`),
`selfHpRatio` (0..1), `opponents` (array of `{hero, heroStats, hpRatio, distance}`),
`target` (the current opponent or `null`), `elapsed` (seconds),
`fightDuration` (seconds), `allyCount`, `enemyCount`, `rng` (a function),
`isSanctioned` (boolean).

**Decision inputs (all must demonstrably influence the outcome):**
- **Fear** — high fear must push towards `'retreat'` and `'flee'`, and reduce
  the weight of `'attack'`. At `isHeroPanicking(self) === true` the hero must
  never choose `'attack'` and never choose `'cast'`.
- **Anger** — high anger must push towards `'attack'`, reduce `'defend'` and
  `'retreat'`, and raise `'switch_target'` when there is more than one opponent.
- **Mentality** — high mentality must raise the weight of `'defend'` and
  `'aim'`; low mentality must raise `'flee'`.
- **HP** — below a configurable HP ratio the weights of `'defend'`, `'retreat'`
  and `'flee'` must rise and `'attack'` must fall. A hero at or below 0 HP is
  dead and must not be asked to act.
- **Class / weapon** — the behaviour must differ by weapon type:
  - **sword** (and spear/dagger): closes distance, favours `'attack'` and
    `'defend'` (block/parry), keeps a preferred engagement range.
  - **bow**: favours `'aim'`, prefers to keep distance, `'retreat'` when the
    opponent is too close, and switches to `'flee'` when low on HP.
  - **staff**: favours `'cast'`, keeps distance, and will not cast without
    enough mana.
  You must specify the class-to-style mapping as a **data table** in the config
  file, and say exactly how the hero's weapon type is read
  (`hero.equipment.weapon.weaponType` — the values in this project are
  `'sword'`, `'bow'`, `'staff'`, `'spear'`, `'dagger'`, `'shield'`).

**Rules you must specify:**
- The decision cadence (how often the AI re-evaluates) as a config value, in
  seconds.
- **Hysteresis**: a hero must not flip between two actions every frame. Specify
  the exact rule (for example: a new action is only allowed if its weight
  exceeds the current action's weight by a config factor, or a minimum dwell
  time in seconds has elapsed).
- `'switch_target'` must be reachable only when `opponents.length > 1`, and must
  specify the exact rule for choosing the new target.
- `'flee'` must have an exact effect: what does the hero do, does the fight
  end, and what happens to the hero afterwards.
- Every weight must come from a config table. Give the exact table shape and
  every default value.
- The AI must be **deterministic given its rng**. State the exact rng contract.

### PHASE 2 — Emotion-driven fights (the trigger)

Design the rule that makes two heroes start a real fight in town.

**Two trigger conditions, both required:**

- **(A) Anger-driven.** Anger at or above a threshold, and a reason to pick a
  specific opponent. The current code uses
  `FIGHT_ANGER_THRESHOLD: 70`, `FIGHT_TENSION_THRESHOLD: 35` and
  `FIGHT_LOW_RELATION_THRESHOLD: 20`. **Reuse those keys and values**; do not
  invent a second set of thresholds. State whether any of them need to change
  and, if so, the exact new value and why.
- **(B) Fear + hunger driven.** Both fear AND hunger are high at the same time.
  This condition does not exist yet. You must specify the two exact threshold
  keys and their exact default values, and justify them. Consider that
  `HIGH_HUNGER_THRESHOLD: 65` already exists — decide whether to reuse it or
  add a separate one, and say why.

**You must specify:**
- The **exact trigger check**: a function, its exact name, its exact signature,
  and the order in which the conditions are evaluated.
- **Who picks a fight with whom.** This is the part that is currently broken:
  `simulateGameDay` loops over every alive hero and calls
  `evaluateTensionFight` for each, so A and B can each pick each other and two
  fights can start on the same day. You must specify a **pairing rule** that
  prevents this. State the exact algorithm: the iteration order, how a chosen
  pair is marked as taken, and what happens to the hero who does not get a
  partner.
- Whether a hero can start more than one fight per day. Give the exact limit
  and the config key.
- The **fight location**: fights happen in the town, not in the sparring ring.
  Specify where in the town the two heroes walk to (the sparring ring is at
  `LAYOUT.zones.training_grounds.trainingZones.sparring_ring` with
  `center {x: -18.7, z: 23.3}`, `radius 1.9`, `spotA {x: -19.6, z: 23.3}`,
  `spotB {x: -17.8, z: 23.3}`). If a fight starts in the ring it is
  *sanctioned*; anywhere else `NO_OUTSIDE_FIGHTING` is broken. State which it
  is and how the code knows.
- What the fight does to the **hero data** immediately: `currentActivity` value
  (a new value such as `'fighting'`?), `injury`, `fatigue`.
- Whether the fight is resolved **in the daily simulation** (headless, during
  `simulateGameDay`) and/or **in the live town** (Three.js, during
  `HubScene.update`). The answer must be consistent with rule 2 (one code path).
  If the fight is resolved headlessly, say exactly how the two combatants
  simulate the fight without a Three.js scene.

### PHASE 3 — Fairy intervention (Iselle)

Design Iselle's intervention in a real fight.

**When she intervenes** — she must intervene when:
- a fighter's HP drops below a threshold (currently `ISELLE_INTERVENE_HP_RATIO: 0.25`),
- OR the fight has lasted too long (currently `ISELLE_MAX_FIGHT_DURATION_SEC: 25.0`),
- OR the accumulated damage is too high (currently `ISELLE_MAX_FIGHT_TOTAL_DAMAGE: 120`),
- OR a critical zone (head / heart) was struck,
- OR the fight left the sanctioned area.

Reuse the existing config keys. State any new key with its exact value.

**She must:**
- appear at the fight (she is a real NPC with a rig that can `moveTo(position, speed)`),
- stop the fight,
- heal **both** heroes (currently to `ISELLE_SAFE_HEAL_HP_RATIO: 0.5` of max HP),
- change both heroes' emotions (currently `-25` anger, `+10` fear via
  `applyFearGain`, and `-15` motivation for the offender when a law was broken).

**You must specify:**
- The **animation**, step by step, with timings. Use the existing
  `src/hub/PunishmentEffect.js` as the structural template (beam mesh from
  Iselle's hand anchor, light column over the target, particle dissolve, timed
  `update(delta, time)` sequence, `onComplete` callback). Say whether you need a
  NEW effect file or an extension of `PunishmentEffect`. Name the file and the
  class.
- The exact **timing values** in seconds for: Iselle's walk to the fight, the
  beam / separation flash, the healing, and the moment the heroes are released.
  Each must be a config value with an exact default.
- The exact **order of operations** at the moment she intervenes (heal before
  or after the heroes are separated? does the law penalty apply before or after
  the healing?).
- The **exact report text** she produces, for each stop reason. The text must
  come from a table (add new categories to `src/data/iselle.js` `ISELLE_LINES`
  or add a new table), and you must write out the literal strings you propose.
- The exact **emotion deltas** applied to each participant and the exact
  **config keys** for them.

### PHASE 4 — Consequences of a fight

Design what a finished fight does to the world.

**You must specify the exact numeric deltas and the config keys for:**
- **Motivation** — for the winner, the loser, and for the case where a law was
  broken.
- **Fear** — for the winner and the loser. Note that `applyFearGain` already
  scales by `(1 - mentality/100)` and by the `fearGainMult` trait modifier; use
  it rather than writing to `hero.fear` directly.
- **Anger** — for the winner and the loser. Use `addHeroAnger`.
- **Relationship** — how the fight changes the pair's **intimacy**
  (`gameState.addIntimacy(idA, idB, amount)`) and their **tension**
  (`gameState.addTension(idA, idB, amount)`). Give the exact amounts and the
  exact config keys. Say under which conditions intimacy drops and under which
  it rises.
- **Injuries** — how a fight leaves a hero injured, and how long the injury
  lasts (`hero.injury` shape: `{zone, severity, daysRemaining, healRateMult}`).
- **Skill XP** — does fighting grant any skill XP? If yes, the exact amount,
  the exact config key, and which skill it goes to
  (`pickPrimarySkillForHero(hero)` already exists in `src/core/TrainingEngine.js`).
  If no, say so explicitly and say why.

**The login report must show all of it.** You must specify:
- The new report event `type` strings (exact strings) for: a fight that started,
  a fight that ended, who won, who lost, a law that was broken, a law that was
  NOT broken but the fight happened, and Iselle's intervention.
- The exact `REPORT_IMPORTANCE` weight for each new event type, and where in
  the existing order it sits (the current order is: died 100, iselle_intervened
  90, law_broken 88, fought_hero 85, injured 80, skill_combined 75, new_skill
  70, level_up 65, leader_ordered 55, got_scared 45, trained 40, ate 25, rested
  20, did_nothing 10).
- The exact **text strings** for each new event.
- The exact changes to `src/ui/IselleReportWindow.js` `EVENT_COLORS` (a colour
  for every new event type) and to the report model built by
  `buildIselleReportModel()` in `src/core/LoginSimulation.js` (for example a new
  "FIGHTS" box listing each fight, who won and the emotional cost).
- How the **summary line** changes. The current format is built in
  `src/core/LoginSimulation.js` and reads like
  `While you were away: 1 training session, 3 heroes did nothing.`

### PHASE 5 — The old 3-slot Training XP: RETIRE or MERGE (a decision you must make)

You must **state which option you choose** and justify it in two or three
sentences. Then design it completely. This is not optional.

- **Option RETIRE**: the manual Training Window (path A) and the old autonomous
  NPC training (path B) are removed. Only the new daily-activity system (path C)
  remains as the single source of training XP. You must specify: which files
  and functions are deleted, what happens to `gameState.trainingSlots` in the
  save file, the **save migration** for existing saves that have a hero sitting
  in a training slot (their XP must not be lost unfairly, and the slot must be
  cleared), and what the player-facing UI becomes (the Training Window is
  currently opened with `E` at the training grounds — state exactly what `E`
  does after the change).
- **Option MERGE**: the manual window and the daily-activity system become one
  system with one XP path. You must specify: the exact de-duplication
  mechanism that stops the double XP described in section 2.13, which of the
  three XP rates survives and its exact value, which level-up implementation is
  kept (`addSkillExp` from `src/data/skills.js` or the hand-rolled one in
  `TrainingHeroAvatar.onTick()`), and the exact new role of
  `gameState.trainingSlots`.

**Whichever you choose, the plan must state:**
- The exact list of files deleted or modified.
- The exact new/changed config keys and values.
- The exact save-migration behaviour and its flag name (the existing flag
  naming convention is `gameState.flags.<name>` booleans, e.g.
  `loadoutMigrationV1`, `emotionTrainingMigrationV1` — use
  `trainingXpMigrationV1` or an equivalent).
- The exact test cases proving there is no double XP.

### PHASE 6 — Tests and documentation

For **every** system above, list the exact test file and the exact test cases.

Existing test scripts live in `scripts/` and are run with `node` directly (no
browser). They are registered in `package.json` under `"scripts"`. Current
ones: `test:spells`, `test:integration`, `test:loadout`, `test:phase1`,
`test:phase2`, `test:phase3`, `test:phase4`, `test:phase5`, `test:phase6`.
Phase 1 added `scripts/test_phase1_migration.mjs` through
`scripts/test_phase6_ui_and_integration.mjs`, each printing a
`N/N TESTS PASSED` line and exiting non-zero on failure.

You must specify:
- The exact new test file name(s), e.g.
  `scripts/test_phase7_fight_ai.mjs`, and the exact `package.json` script name.
- For each test file: the exact list of test case names and the **expected
  result** of each. A test case named "anger triggers a fight" is not enough —
  it must be "a hero with anger 70 and tension 40 against a rival triggers a
  fight, and the fight is recorded in `report.fights` with
  `stoppedBy === 'iselle'`".
- At least one test that runs the **30-game-day simulation** and asserts a
  concrete relationship (for example: "over 30 simulated days with a hot-headed
  hero, at least one fight starts, and the pair's tension is higher at the end
  than at the start").
- The exact `docs/CODEMAP.md` changes: every new file, every new export, every
  changed import line. The file index has the format
  `path | description | exports | imports | status` and the check script is
  `node scripts/check_codemap.mjs`.

---

## PART 5 — REQUIRED OUTPUT FORMAT

Return the plan in exactly this structure. Use Markdown headings and tables. Do
not add a preamble, a summary, or a "let me know if you want changes" closing.

```
# PHASE 2 PLAN — FIGHT AI & EMOTION-DRIVEN FIGHTS

## 0. DECISIONS
One table: Decision | Choice | One-line justification
(MUST include: the Fight AI file path and export names; whether the fight is
resolved headlessly, live, or both; the RETIRE-or-MERGE choice for System 5;
the new fear+hunger thresholds.)

## 1. OVERVIEW
One paragraph: what Phase 2 adds, in what order, and how the 6 phases depend on
each other. A phase dependency diagram in plain text.

## 2. CONFIG CHANGES
For EVERY new or changed config value, a table with exactly these columns:
| File | Key | Old value | New value | Why |
Separate tables for `src/data/emotions.config.js` and
`src/data/training.config.js`. No value may appear that is not in a table.

## 3. NEW FILES
A table: | File | Purpose | Exports | Imports |
Then, for each new file, the full function signature list and the exact data
structures (field names and types) of every object it returns.

## 4. CHANGED FILES
A table: | File | Function | Exact change |
For every changed function, show the exact new code (or an exact diff), not a
description of the change. Flag every change to `src/hub/*` or `src/ui/*` with
`[PROTECTED - needs user sign-off]`.

## 5. SYSTEM 1 — FIGHT AI
The weight table. The class-to-style table. The decision cadence. The
hysteresis rule. The exact code path from a decision to a combat action.

## 6. SYSTEM 2 — EMOTION-DRIVEN FIGHTS
The trigger conditions with their exact thresholds. The pairing algorithm, in
pseudocode. The location rules. What changes in the hero data.

## 7. SYSTEM 3 — FAIRY INTERVENTION
The timeline of the intervention, in seconds, as a table. The animation steps.
The emotion deltas. The literal report text strings.

## 8. SYSTEM 4 — CONSEQUENCES
The delta table: | Outcome | Motivation | Fear | Anger | Intimacy | Tension |
Then the new report event types, their importance weights and their literal
text. Then the exact report UI changes.

## 9. SYSTEM 5 — OLD TRAINING XP
State RETIRE or MERGE in the first line. The justification. The file-by-file
changes. The save migration. The de-duplication or removal mechanism.

## 10. TESTS
A table per test file: | Test case name | Setup | Expected result |
Then the exact `package.json` diff.

## 11. CODEMAP
The exact new / changed `docs/CODEMAP.md` lines.

## 12. RISKS AND EDGE CASES
Every edge case you had to decide, and how you decided it.
```

### Final quality bar

Before you return the plan, verify it against this checklist. If any item is
missing, the plan is not finished.

- [ ] Every number in the plan appears in a config table in section 2.
- [ ] Every file path in the plan is a real path from section 2, or a file you
      explicitly create in section 3.
- [ ] Every function you reference exists today, or is one you declare you are
      creating (with its exact signature).
- [ ] Every new report event type has an importance weight AND a colour in
      `src/ui/IselleReportWindow.js` `EVENT_COLORS`.
- [ ] The offline simulation and the live town call the same functions.
- [ ] No per-frame allocation is introduced.
- [ ] The three XP paths in section 2.13 are resolved into exactly one.
- [ ] Every test case has a stated expected result, not just a name.
- [ ] Every `src/hub/*` and `src/ui/*` change is flagged as protected.
- [ ] `node scripts/check_codemap.mjs` would print `CODEMAP OK` after your
      changes.
````
