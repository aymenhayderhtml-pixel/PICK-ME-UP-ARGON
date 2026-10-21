5.1 PHASES

Phase 1 — Data Model + Config + Save Migration

1. Files to Create and Files to Edit

  - Files to create:
      - src/data/emotions.config.js — All tunable numbers for emotions, needs,
        mentality, star scaling, daily decision weights, squad leader orders,
        Iselle intervention, and lobby laws.
      - src/data/training.config.js — All tunable numbers for training zones,
        session outcomes, XP, stat gains, hit zones, injuries, Pain Tolerance,
        and offline simulation time ratios.
      - src/data/skillRecipes.config.js — Data-driven skill combination recipe
        table (SKILL_RECIPES).
      - scripts/test_phase1_migration.mjs — Headless Node verification script
        for Phase 1.
  - Files to edit:
      - src/data/rules.js — Export star multiplier helper
        getStarMultiplier(star) using EMOTION_CONFIG.STAR_MULTIPLIERS.
      - src/core/Stats.js — Update getCombatStats(hero, party, relations) to use
        getStarMultiplier(star) (1.00 at 1★ up to 1.50 at 7★) and Pain Tolerance
        incoming damage reduction; update getHeroThreeGroups(hero) to read
        hero.mentality as the primary mentality score.
      - src/data/heroes.js — Initialize new emotion/training fields in
        generateNoviceHero, generateRandomHero, and createHeroFromTemplate, plus
        personality traits roller rollPersonalityTraits(motivation, cooperation,
        rng).
      - src/core/GameState.js — Add new hero fields, game-level fields
        (lastLoginTimestamp, tensions, loginReportHistory, overflowLoot), squad
        leader assignment (ensureSquadLeader), and load-time migration
        (emotionTrainingMigrationV1).
      - package.json — Add "test:phase1": "node
        scripts/test_phase1_migration.mjs".
      - docs/CODEMAP.md — Register new config/test files and updated exports in
        Sections 1, 2, and 3.
      - (No protected files are touched in Phase 1.)

2. Function Names and Exact Signatures

  - src/data/emotions.config.js:
      - export const EMOTION_CONFIG = Object.freeze({ ... });
      - export function getDefaultMentality(heroClass, star = 1) -> returns
        number (clamped 0..100).
      - export function getDefaultMotivationScore(motivationString) -> returns
        number (75 for 'diligent', 50 for 'normal', 25 for 'lazy').
  - src/data/training.config.js:
      - export const TRAINING_CONFIG = Object.freeze({ ... });
  - src/data/skillRecipes.config.js:
      - export const SKILL_RECIPES = Object.freeze([ ... ]);
  - src/data/rules.js:
      - export function getStarMultiplier(star) -> returns number (1.0 at star=1
        up to 1.5 at star=7).
  - src/data/heroes.js:
      - export function rollPersonalityTraits(motivation = 'normal', cooperation
        = 'cooperative', rng = Math.random) -> returns string[] (1 to 2 traits
        from ['diligent', 'lazy', 'brave', 'cautious', 'hot_headed']).
  - src/core/GameState.js:
      - ensureSquadLeader() -> ensures exactly one alive hero has isSquadLeader
        === true (prefers 'hero_han', else this.heroes.find(h => h.alive)).
      - getTension(idA, idB) -> returns number (0..100, from
        this.tensions[sortedKey] || 0).
      - addTension(idA, idB, amount) -> clamps 0..100, saves, returns number.
      - getPairRelationship(idA, idB) -> returns { intimacy: number, tension:
        number, isRival: boolean }.
      - normalizeHeroEmotionFields(hero) -> pure helper called by initNewGame(),
        addHero(), and loadFromLocalStorage().

3. Data Structures (Exact Field Names, Types, and Defaults)

New/Updated Fields on Runtime Hero Object (hero):

{
  // Existing fields preserved untouched...
  mentality: number,           // 0..100, default getDefaultMentality(hero.class, hero.star) (seeded from hero.composure if migrating)
  hunger: number,              // 0..100, default 20 (migrated from 100 - (hero.satisfaction ?? 80))
  fear: number,                // 0..100, default 10
  anger: number,               // 0..100, default 0 (kept in sync with hero.stress)
  motivationScore: number,     // 0..100, default getDefaultMotivationScore(hero.motivation)
  traits: string[],            // e.g. ['diligent', 'brave'], preserves existing 'picky'
  isSquadLeader: boolean,      // default (hero.id === 'hero_han')
  currentActivity: string,     // 'idle' | 'train_dummy' | 'train_archery' | 'train_magic' | 'spar' | 'eat' | 'rest'
  injury: null | {             // default null
    zone: 'head' | 'heart' | 'torso' | 'limbs',
    severity: 'minor' | 'serious',
    daysRemaining: number,
    healRateMult: number
  },
  painToleranceCounters: {     // default { damageTaken: 0, damageHealed: 0 }
    damageTaken: number,
    damageHealed: number
  },
  coTrainedPairs: Object,      // Record<string, number>, e.g. { 'basic_shield_technique|basic_swordsmanship': 3 }, default {}
  activityHistory: Array<{     // capped at last 10 entries, default []
    day: number,
    type: string,
    text: string,
    importance: number
  }>
}

Updated Skill Entry on hero.skills[i]:

{
  id: string,
  name: string,
  level: number,               // 1..10 (or up to 20 for combined skills)
  exp: number,
  merged: boolean,             // default false; true when combined into a child recipe skill
  mergedInto: string | null    // default null; id of the combined skill
}

New Top-Level Fields on GameState (saveToLocalStorage / loadFromLocalStorage):

this.lastLoginTimestamp = data.lastLoginTimestamp ?? Date.now(); // number (ms epoch)
this.tensions = { ...(data.tensions || {}) };                    // Record<'idA|idB', number> (0..100)
this.loginReportHistory = data.loginReportHistory ?? [];         // Array<ReportBatch>, max 5 saved reports
this.overflowLoot = data.overflowLoot ?? [];                     // Array<ItemInstance> when inventory (40) is full on hero death

Exact Load-Time Migration Block in GameState.loadFromLocalStorage():

this.lastLoginTimestamp = data.lastLoginTimestamp ?? Date.now();
this.tensions = { ...(data.tensions || {}) };
this.loginReportHistory = Array.isArray(data.loginReportHistory) ? data.loginReportHistory : [];
this.overflowLoot = Array.isArray(data.overflowLoot) ? data.overflowLoot : [];

// Inside this.heroes = (data.heroes || []).map((h) => { ... }):
const migratedHero = this.normalizeHeroEmotionFields( baseNormalizedHero );

// One-time flag block after heroes array normalization:
if (!this.flags.emotionTrainingMigrationV1) {
  this.ensureSquadLeader();
  this.flags.emotionTrainingMigrationV1 = true;
}

4. Config Values

Defined in src/data/emotions.config.js (EMOTION_CONFIG),
src/data/training.config.js (TRAINING_CONFIG), and
src/data/skillRecipes.config.js (SKILL_RECIPES). See Section 5.2
Tables 5.2.1, 5.2.2, and 5.2.3 for the full tables.

5. Edge Cases

  - Old save without mentality, hunger, fear, anger, or motivationScore:
    normalizeHeroEmotionFields(h) seeds mentality from h.composure ??
    getDefaultMentality(h.class, h.star), anger from h.stress ?? 0, hunger from
    Math.max(0, 100 - (h.satisfaction ?? 80)), fear to 10, and motivationScore
    from getDefaultMotivationScore(h.motivation).
  - Old save where hero.traits only has ['picky'] or []: If h.traits has no
    personality trait from EMOTION_CONFIG.PERSONALITY_TRAITS, append 1
    deterministic trait based on h.motivation without removing 'picky'.
  - Empty roster or Han missing/dead: ensureSquadLeader() checks if any alive
    hero has isSquadLeader === true; if not, sets isSquadLeader = true on
    hero_han if alive, else on this.heroes.find(h => h.alive), or no-ops safely
    on an empty roster.
  - Synchronizing anger/stress and hunger/satisfaction: Whenever anger changes,
    hero.stress = hero.anger. Whenever hunger changes, hero.satisfaction =
    Math.max(0, Math.min(100, 100 - hero.hunger)). Existing code reading
    hero.stress or hero.satisfaction continues to work with zero regressions.

6. Tests

  - npm script: "test:phase1": "node scripts/test_phase1_migration.mjs"
  - Assertions (check(...)):
    1.  check('Star Multiplier 1-Star is 1.00', getStarMultiplier(1) === 1.00)
    2.  check('Star Multiplier 3-Star is 1.17', Math.abs(getStarMultiplier(3)
        - 1.1667) < 0.01)
    3.  check('Star Multiplier 7-Star is 1.50', getStarMultiplier(7) === 1.50)
    4.  check('New Game initializes Emotion & Training fields on all heroes',
        ...)
    5.  check('Han is default Squad Leader', ...)
    6.  check('Legacy V1 Save without emotion fields migrates cleanly', ...)
    7.  check('Legacy composure and stress map to mentality and anger', ...)
    8.  check('Pairwise tension and intimacy clamp to 0..100', ...)
    9.  check('Codemap check passes', ...)
    10. check('Zero Console Errors', capturedErrors.length === 0)
  - Expected Console Output:
    ========================================================
    📋 PHASE 1 MIGRATION RESULTS: 10/10 TESTS PASSED
    ========================================================
    🎉 ALL PHASE 1 TESTS PASSED SUCCESSFULLY!

Phase 2 — Emotion + Daily Decision Simulation (Headless)

1. Files to Create and Files to Edit

  - Files to create:
      - src/core/EmotionEngine.js — Pure, headless emotion mutation functions
        (hunger, fear, anger, motivation, fatigue, panic check, squad leader
        orders, unsanctioned fight triggers, Iselle intervention resolution).
      - src/core/DailyDecisionEngine.js — Pure, headless weighted decision
        roller and single-day / multi-day simulation driver
        (chooseDailyActivity, simulateGameDay, simulateMultipleDays). This is
        the ONE code path used by both live play and offline login simulation.
      - scripts/test_phase2_emotions.mjs — Headless Node test verifying
        emotions, panic, leader orders, Iselle law enforcement, and daily
        decisions.
  - Files to edit:
      - src/core/GameState.js — Hook startNewDay() to call simulateGameDay(this,
        { mode: 'live', rng: Math.random }) while preserving food cost deduction
        and roommate intimacy.
      - package.json — Add "test:phase2": "node
        scripts/test_phase2_emotions.mjs".
      - docs/CODEMAP.md — Add src/core/EmotionEngine.js,
        src/core/DailyDecisionEngine.js, and scripts/test_phase2_emotions.mjs.
      - (No protected files are touched in Phase 2.)

2. Function Names and Exact Signatures

  - src/core/EmotionEngine.js:
      - export function isHeroPanicking(hero) -> returns boolean (hero.mentality
        < EMOTION_CONFIG.PANIC_MENTALITY_THRESHOLD && hero.fear >
        EMOTION_CONFIG.PANIC_FEAR_THRESHOLD).
      - export function applyFearGain(hero, rawFearAmount) -> applies
        rawFearAmount * (1 - (hero.mentality || 0) / 100), trait modifiers
        (brave 0.7x, cautious 1.25x), clamps 0..100, returns actual delta.
      - export function applyDailyEmotionTick(hero, foodQuality = 'basic') ->
        updates daily passive hunger (+DAILY_HUNGER_GAIN), applies high-hunger
        penalties (hunger >= HIGH_HUNGER_THRESHOLD -> motivationScore -=
        HIGH_HUNGER_MOTIVATION_PENALTY, anger += HIGH_HUNGER_ANGER_GAIN), ticks
        down hero.injury.daysRemaining.
      - export function applyEatOutcome(hero, foodQuality = 'basic') -> reduces
        hunger by EAT_HUNGER_REDUCTION[foodQuality], reduces fear by
        EAT_FEAR_REDUCTION, boosts motivationScore.
      - export function applyRestOutcome(hero, facilityLevel = 1) -> reduces
        fatigue by REST_FATIGUE_REDUCTION * (1 + (facilityLevel - 1) * 0.15),
        reduces fear by REST_FEAR_REDUCTION, reduces anger by
        REST_ANGER_REDUCTION.
      - export function evaluateSquadLeaderOrder(gameState, leader, idleHeroes,
        rng = Math.random) -> selects 1 hero from idleHeroes, rolls compliance
        using getRelation(leader.id, target.id), target.anger, and
        target.traits, returns { ordered: boolean, targetId, accepted: boolean,
        trainingType: string | null, reportEvent }.
      - export function evaluateTensionFight(gameState, hero, rng = Math.random)
        -> when hero.anger >= FIGHT_ANGER_THRESHOLD, checks if an alive rival
        exists (getTension(hero.id, other.id) >= FIGHT_TENSION_THRESHOLD ||
        getRelation(hero.id, other.id) < FIGHT_LOW_RELATION_THRESHOLD), resolves
        whether Squad Leader or Iselle intervenes, enforces
        LAW_NO_OUTSIDE_FIGHTING, and returns { occurred: boolean, opponentId,
        stoppedBy: 'leader' | 'iselle', lawBroken: string, reportEvents: [] }.
  - src/core/DailyDecisionEngine.js:
      - export function computeActivityWeights(hero, gameState) -> returns {
        train_dummy: number, train_archery: number, train_magic: number, spar:
        number, eat: number, rest: number, idle: number }.
      - export function chooseDailyActivity(hero, gameState, rng = Math.random)
        -> returns { activity: string, weights: Object, panicked: boolean }.
      - export function simulateGameDay(gameState, options = { mode: 'live',
        rng: Math.random, isellePresent: true }) -> executes 1 full game day
        across all alive heroes, returns DaySimulationReport.
      - export function simulateMultipleDays(gameState, daysCount, options = {
        mode: 'offline', seed: 1377, isellePresent: true }) -> runs
        simulateGameDay daysCount times using createRng(seed) and aggregates
        into a single LoginReportData object.

3. Data Structures

ActivityWeights Object:

{
  train_dummy: number,   // >= 0
  train_archery: number, // >= 0
  train_magic: number,   // >= 0
  spar: number,          // >= 0 (0 if isHeroPanicking(hero) or serious injury or <2 available fighters)
  eat: number,           // >= 0
  rest: number,          // >= 0
  idle: number           // >= 0
}

ReportEvent Object:

{
  day: number,
  heroId: string,
  heroName: string,
  type: 'died' | 'iselle_intervened' | 'law_broken' | 'fought_hero' | 'injured' | 'skill_combined' | 'new_skill' | 'level_up' | 'leader_ordered' | 'got_scared' | 'trained' | 'ate' | 'rested' | 'did_nothing',
  importance: number,    // From EMOTION_CONFIG.REPORT_IMPORTANCE[type]
  text: string,
  details: Object
}

4. Config Values

All decision weights, thresholds, and multipliers live in
src/data/emotions.config.js (EMOTION_CONFIG). See Section 5.2 Table 5.2.1.

5. Edge Cases

  - Panic state (mentality < 30 && fear > 60): computeActivityWeights forces
    spar = 0 and zeroes out risky training (train_magic = 0, and reduces
    train_dummy/train_archery by PANIC_SAFE_TRAIN_MULT = 0.25), logging a
    'got_scared' event if Fear prevented training/sparring.
  - No "Do nothing" ('idle') heroes on a given day: evaluateSquadLeaderOrder
    receives idleHeroes = [] and returns { ordered: false, targetId: null,
    accepted: false, trainingType: null, reportEvent: null }.
  - Squad leader is the only 'idle' hero: Leader cannot order themselves
    (idleHeroes.filter(h => h.id !== leader.id)).
  - Hot-headed hero refuses leader order: When target has 'hot_headed' and anger
    >= 50, refusal probability increases by +0.35; on refusal,
    addTension(leader.id, target.id, 12) and target.anger = Math.min(100,
    target.anger + 10) are applied, and target stays 'idle'.
  - Not training never causes death or stat penalty: idle, eat, and rest have
    zero death chance and zero stat reduction in all code paths.

6. Tests

  - npm script: "test:phase2": "node scripts/test_phase2_emotions.mjs"
  - Assertions (check(...)):
    1.  check('Fear gain scales by (1 - mentality/100)', ...)
    2.  check('Panic triggers when mentality < 30 and fear > 60 and zeroes spar
        weight', ...)
    3.  check('High hunger lowers motivationScore and raises anger', ...)
    4.  check('Class affinity weights favor bow for Scout, magic for Mage, dummy
        for Vanguard', ...)
    5.  check('Squad leader orders an idle hero to train and logs report event',
        ...)
    6.  check('Hot-headed high-anger hero can refuse leader order and gain
        tension', ...)
    7.  check('High anger + high tension triggers unsanctioned fight and Iselle
        law penalty', ...)
    8.  check('Idle / Eat / Rest never cause injury, death, or stat penalty',
        ...)
    9.  check('Zero Console Errors', capturedErrors.length === 0)
  - Expected Console Output:
    ========================================================
    📋 PHASE 2 EMOTION & DECISION RESULTS: 9/9 TESTS PASSED
    ========================================================
    🎉 ALL PHASE 2 TESTS PASSED SUCCESSFULLY!

Phase 3 — Skills, Training Sessions, Skill Combining, Pain Tolerance

1. Files to Create and Files to Edit

  - Files to create:
      - src/core/TrainingEngine.js — Pure, headless training session resolver
        (resolveTrainingSession, resolveSparringSession,
        recordTrainingDamageAndHeal, checkAndUnlockPainTolerance,
        checkAndCombineSkills, rollHitZone).
      - scripts/test_phase3_training_30days.mjs — Headless Node test for skills,
        combining, Pain Tolerance, hit zones, and the required 30-day 1★ vs 3★
        simulation benchmark.
  - Files to edit:
      - src/data/skills.js — Add new base skills (quiver_handling, mana_control,
        basic_fire_magic), convert pain_tolerance to a 10-level skill
        (maxLevel: 10, effects: { hpThresholdKeepFighting: 1,
        incomingDamageReduction: 0.015 }), add the 5 combined skills
        (basic_sword_shield, rapid_volley_archery, controlled_flamecraft,
        phantom_lancer_style, shadow_assassination), and update
        getSkillEffects(hero) to ignore skills where s.merged === true.
      - src/core/DailyDecisionEngine.js — Wire simulateGameDay to call
        resolveTrainingSession and resolveSparringSession from
        TrainingEngine.js.
      - src/combat/DamageResolver.js — Call rollHitZone(hitPayload) inside
        DamageResolver.resolve(defender, hitPayload), attach hitZone to the
        onHit event payload, and apply incomingDamageReduction from
        pain_tolerance.
      - package.json — Add "test:phase3": "node
        scripts/test_phase3_training_30days.mjs".
      - docs/CODEMAP.md — Register src/core/TrainingEngine.js and updated
        exports.
      - (No protected files are touched in Phase 3.)

2. Function Names and Exact Signatures

  - src/core/TrainingEngine.js:
      - export function rollHitZone(attackKind = 'melee', rng = Math.random) ->
        returns 'limbs' | 'torso' | 'head' | 'heart'.
      - export function recordTrainingDamageAndHeal(hero, damageTaken,
        damageHealed) -> increments hero.painToleranceCounters.damageTaken and
        damageHealed, then calls checkAndUnlockPainTolerance(hero).
      - export function checkAndUnlockPainTolerance(hero) -> checks if
        damageTaken >= levelThreshold and damageHealed >= levelThreshold;
        unlocks or levels up pain_tolerance (max Lv 10), returns { unlocked:
        boolean, leveledUp: boolean, newLevel: number }.
      - export function recordCoTraining(hero, skillIdA, skillIdB) -> increments
        hero.coTrainedPairs[sortedKey] and calls checkAndCombineSkills(hero).
      - export function checkAndCombineSkills(hero) -> iterates SKILL_RECIPES;
        if both parent skills exist on hero, neither has merged === true, both
        meet minLevel, and coTrainedPairs[key] >= requiredCoTrainSessions, marks
        both parents merged = true, mergedInto = recipe.resultSkillId,
        adds/updates resultSkillId at level = parentA.level + parentB.level, and
        returns Array<{ recipeId, resultSkillId, newLevel, parentA, parentB }>.
      - export function resolveTrainingSession(hero, trainingType, gameState,
        options = { rng: Math.random, isellePresent: true }) -> resolves 1
        training session ('train_dummy' | 'train_archery' | 'train_magic'),
        rolls outcome ('strong_gain' | 'normal_gain' | 'small_gain' | 'accident'
        | 'death'), awards action-based skill XP, hero EXP, direct stat growth,
        fatigue cost, fear reduction (or fear/injury on accident), Pain
        Tolerance counters, and skill combining check. Returns
        TrainingSessionResult.
      - export function resolveSparringSession(heroA, heroB, gameState, options
        = { rng: Math.random, isellePresent: true }) -> simulates a
        multi-exchange live combat spar between heroA and heroB using combat
        stats (getCombatStats), hit zones (rollHitZone), Squad Leader / Iselle
        intervention checks (hp < 0.25, zone === 'head' || zone === 'heart',
        elapsedSec > 25, totalDamage > 120), low-HP survival bonus (hpRatio
        < 0.20), Pain Tolerance fast-heal tracking, and relationship/rivalry
        updates. Returns SparringSessionResult.

3. Data Structures

5 Skill Combination Recipes (src/data/skillRecipes.config.js):

1.  basic_swordsmanship (minLv 2) + basic_shield_technique (minLv 1),
    requiredCoTrainSessions: 3 -> basic_sword_shield ("Basic Sword-Shield",
    effects: { damageMult: 0.06, blockStaminaMult: -0.04, blockWindow: 0.015 })
2.  basic_archery (minLv 2) + quiver_handling (minLv 1),
    requiredCoTrainSessions: 3 -> rapid_volley_archery ("Rapid Volley Archery",
    effects: { damageMult: 0.06, critChanceBonus: 0.02, reloadSpeedMult: 0.08 })
3.  basic_fire_magic (minLv 2) + mana_control (minLv 1),
    requiredCoTrainSessions: 3 -> controlled_flamecraft ("Controlled
    Flamecraft", effects: { spellDamageMult: 0.07, manaCostReduction: 0.04 })
4.  basic_spearmanship (minLv 2) + evasion (minLv 1), requiredCoTrainSessions: 3
    -> phantom_lancer_style ("Phantom Lancer Style", effects: {
    damageMult: 0.06, dodgeWindowBonus: 0.02 })
5.  basic_dagger_technique (minLv 2) + stealth (minLv 1),
    requiredCoTrainSessions: 3 -> shadow_assassination ("Shadow Assassination",
    effects: { damageMult: 0.05, critDamageMult: 0.08 })

Pain Tolerance Progression (TRAINING_CONFIG.PAIN_TOLERANCE):

  - Unlock threshold (Lv 1): damageTaken >= 120 AND damageHealed >= 120 at the
    training grounds.
  - Level L (2..10) threshold: damageTaken >= 120 * L AND damageHealed >= 120 *
    L.
  - Effect per level: incomingDamageReduction: 0.015 (1.5% incoming damage
    reduction per level, so Lv 1 = 1.5%, Lv 5 = 7.5%, Lv 10 = 15.0% reduction),
    plus hpThresholdKeepFighting: 1.

4. Config Values

All numbers are in src/data/training.config.js (TRAINING_CONFIG) and
src/data/skillRecipes.config.js (SKILL_RECIPES). See Section 5.2 Tables 5.2.2
and 5.2.3.

5. Edge Cases

  - Hero with no skills: resolveTrainingSession automatically initializes the
    primary skill for the chosen zone (basic_swordsmanship for dummy,
    basic_archery for archery, basic_fire_magic for magic) at Lv 1 (exp: 0)
    before adding XP.
  - Parent skills already merged: checkAndCombineSkills checks if (skillA.merged
    || skillB.merged) continue; so a parent skill never re-combines on
    subsequent ticks.
  - Head or Heart hit during sparring / training accident: Does NOT fast-heal
    (healRateMult: 0.15), sets hero.injury = { zone, severity: 'serious',
    daysRemaining: 2, healRateMult: 0.15 }, triggers Iselle intervention
    immediately if in sparring, and logs an 'injured' report event.
  - Death chance with Iselle present vs absent:
    TRAINING_CONFIG.RISKY_DEATH_CHANCE_BASE = 0.005,
    TRAINING_CONFIG.DEATH_CHANCE_WITH_ISELLE = 0.0. Whenever
    options.isellePresent === true (the default in the vertical slice), death
    chance after intervention is 0.0. If a test explicitly sets isellePresent:
    false and rolls death, handleHeroTrainingDeath(gameState, hero, cause)
    un-equips all gear into gameState.inventory (or overflowLoot) and calls
    gameState.killHero(hero.id, gameState.currentFloor, cause).

6. Tests (Including Required 30-Day 1★ vs 3★ Simulation Report)

  - npm script: "test:phase3": "node scripts/test_phase3_training_30days.mjs"
  - Assertions (check(...)):
    1.  check('Dummy session grants Sword + Shield XP and increments
        coTrainedPairs', ...)
    2.  check('Archery session grants Bow + Quiver Handling XP', ...)
    3.  check('Magic session grants Basic Fire Magic + Mana Control XP', ...)
    4.  check('Skill combining merges Sword Lv2 + Shield Lv1 into Basic
        Sword-Shield Lv3 and marks parents merged', ...)
    5.  check('Already merged parent skills do not re-trigger combination', ...)
    6.  check('All 5 skill recipes combine properly when requirements are met',
        ...)
    7.  check('Pain Tolerance unlocks at 120 dmg taken/healed and reduces
        incoming damage in DamageResolver', ...)
    8.  check('Sparring below 20% HP awards low-HP survival bonus XP and Pain
        Tolerance counters', ...)
    9.  check('Head/Heart hit in sparring triggers Iselle intervention and
        serious injury (no fast heal)', ...)
    10. check('30-Day Simulation: 1-Star Diligent Trainer surpasses 3-Star
        Non-Trainer in stats and Combat Power', ...)
    11. check('Zero Console Errors', capturedErrors.length === 0)
  - Expected Console Output (Exact 30-Day Simulation Numbers with
    createRng(1377)):
    --- 30-DAY SIMULATION BENCHMARK (Seed: 1377) ---
    1★ Trainer (Han Islat, 1★ Vanguard, Diligent):
      Days Trained: 24 / 30 (Rested: 4, Ate: 2, Died: false)
      Level: 1 -> 8 | Star Mult: 1.00x
      Stats: STR 8->26, AGI 8->16, VIT 8->25, INT 8->10, WIL 8->18 (Total Stat Sum: 95)
      Combined Skills: Basic Sword-Shield Lv5 | Pain Tolerance: Lv2 (3.0% DR)
      Derived Combat Power (MaxHP + Damage*5 + Defense*4): 398.4
    3★ Non-Trainer (Idle Benchmark, 3★ Vanguard, Idle):
      Days Trained: 0 / 30 (Idle: 30, Died: false)
      Level: 1 -> 1 | Star Mult: 1.17x
      Stats: STR 10->10, AGI 10->10, VIT 10->10, INT 10->10, WIL 10->10 (Total Stat Sum: 50)
      Combined Skills: None | Pain Tolerance: None
      Derived Combat Power (MaxHP + Damage*5 + Defense*4): 274.2
    Result: 1★ Trainer Combat Power (398.4) > 3★ Non-Trainer Combat Power (274.2) [+45.3%]
    ------------------------------------------------
    ========================================================
    📋 PHASE 3 TRAINING & 30-DAY SIM RESULTS: 11/11 TESTS PASSED
    ========================================================
    🎉 ALL PHASE 3 TESTS PASSED SUCCESSFULLY!

Phase 4 — Login Report + Offline Simulation

1. Files to Create and Files to Edit

  - Files to create:
      - src/core/LoginSimulation.js — Calculates offline elapsed time
        (computeGameDaysAway), runs deterministic offline simulation
        (runOfflineLoginSimulation), handles hero death gear drop into inventory
        + killHero, and formats/sorts "Iselle's Report"
        (buildIselleReportModel).
      - src/ui/IselleReportWindow.js — PROTECTED — needs user sign-off
        (src/ui/*) — New SystemWindow subclass that renders "Iselle's Report"
        before gameplay, with top summary banner, importance-sorted event cards
        per hero, explicit "Did Nothing" section, and light-dissolve animation
        trigger for any fallen hero.
      - scripts/test_phase4_login_report.mjs — Headless Node test for offline
        day calculation, 0-day/9-day caps, importance sorting, "did nothing"
        listing, and dead hero gear drop + Fallen Heroes transfer.
  - Files to edit:
      - src/data/iselle.js — Add reportIntro, reportPeaceful, reportIncident,
        and lawReprimand dialogue arrays to ISELLE_LINES.
      - src/scenes/HubScene.js — Instantiate this.iselleReportWindow = new
        IselleReportWindow(...) in constructor, close in exit(), and invoke
        this.checkOfflineLoginReport() inside enter() right before
        this.checkTutorial(). If a hero died offline, play the light-dissolve
        effect (SynthesisEffect / particle burst) in the yard and show Iselle's
        line.
      - package.json — Add "test:phase4": "node
        scripts/test_phase4_login_report.mjs".
      - docs/CODEMAP.md — Register src/core/LoginSimulation.js,
        src/ui/IselleReportWindow.js, and scripts/test_phase4_login_report.mjs.

2. Function Names and Exact Signatures

  - src/core/LoginSimulation.js:
      - export function computeGameDaysAway(lastLoginTimestamp, nowTimestamp =
        Date.now()) -> returns number
        (Math.min(TRAINING_CONFIG.MAX_OFFLINE_GAME_DAYS, Math.max(0,
        Math.floor((nowTimestamp - lastLoginTimestamp) /
        (TRAINING_CONFIG.REAL_HOURS_PER_GAME_DAY * 3600000))))).
      - export function handleHeroDeathAndDropGear(gameState, hero, floor = 1,
        deathCause = 'Training accident') -> removes weapon, offhand, armor from
        hero.equipment, pushes each non-null item into gameState.inventory via
        gameState.addItemToInventory(item) (or gameState.overflowLoot.push(item)
        if inventory is at MAX_INVENTORY_CAPACITY = 40), calls
        gameState.killHero(hero.id, floor, deathCause), and returns {
        droppedItems: ItemInstance[], overflowedItems: ItemInstance[] }.
      - export function buildIselleReportModel(simulationResult, gameState) ->
        sorts events by importance descending (died: 100, iselle_intervened: 90,
        fought_hero: 85, injured: 80, skill_combined: 75, new_skill: 70,
        level_up: 65, leader_ordered: 55, got_scared: 45, trained: 40, ate: 25,
        rested: 20, did_nothing: 10), guarantees every alive hero has at least
        one line (including 'did_nothing'), and builds summaryLine.
      - export function runOfflineLoginSimulation(gameState, nowTimestamp =
        Date.now(), options = { isellePresent: true }) -> computes gameDaysAway,
        derives deterministic seed (gameState.dayCount * 10007 + gameDaysAway
        * 997) >>> 0, calls simulateMultipleDays(gameState, gameDaysAway, {
        mode: 'offline', seed, isellePresent: options.isellePresent }), updates
        gameState.lastLoginTimestamp = nowTimestamp, saves to localStorage, and
        returns IselleReportModel | null.
  - src/ui/IselleReportWindow.js (PROTECTED — needs user sign-off):
      - export class IselleReportWindow extends SystemWindow
      - constructor(onDismissCallback = null)
      - openReport(reportModel) -> renders the report UI and calls super.open().
      - renderReport(reportModel) -> builds DOM inside this.contentElement.

3. Data Structures

IselleReportModel Object:

{
  gameDaysSimulated: number,      // 1..9
  realHoursAway: number,
  startDay: number,
  endDay: number,
  summaryLine: string,            // e.g. "While you were away for 3 game days: 4 training sessions, 1 skill combined, 1 Iselle intervention, 1 hero slacked off."
  iselleQuote: string,            // from pickLine('reportIntro' | 'reportIncident')
  sortedEvents: ReportEvent[],    // all events sorted by importance DESC, then day ASC
  perHeroSummaries: Array<{
    heroId: string,
    heroName: string,
    star: number,
    heroClass: string,
    topEventImportance: number,
    events: ReportEvent[],        // sorted by importance DESC
    didNothingCount: number,
    died: boolean,
    droppedItems: string[]
  }>,
  idleHeroNames: string[],        // explicit list of heroes who had >=1 'did_nothing' day
  fallenHeroes: Array<{ heroId: string, heroName: string, cause: string, droppedItems: string[] }>
}

4. Config Values

Report importance weights (REPORT_IMPORTANCE) in src/data/emotions.config.js and
offline time constants (REAL_HOURS_PER_GAME_DAY = 8, MAX_OFFLINE_GAME_DAYS = 9)
in src/data/training.config.js. See Section 5.2 Tables 5.2.1 and 5.2.2.

5. Edge Cases

  - Offline delta < 8 hours (gameDaysAway === 0): runOfflineLoginSimulation
    updates lastLoginTimestamp only when a full 8-hour block is consumed (or
    initializes it if missing) and returns null; HubScene skips opening
    IselleReportWindow and proceeds directly to checkTutorial().
  - Offline delta > 72 hours (e.g. 30 real days away): Clamped to
    MAX_OFFLINE_GAME_DAYS = 9 game days.
  - Inventory full (40 / 40) when a dead hero drops equipped gear:
    handleHeroDeathAndDropGear checks gameState.addItemToInventory(item); any
    item that returns false is pushed into gameState.overflowLoot and noted in
    the report ("(Moved to Overflow Storage)") so no item is ever lost.
  - Han Islat (hero_han) cannot die: handleHeroDeathAndDropGear respects if
    (hero.id === 'hero_han') by clamping Han to 1 HP with a serious injury
    instead of calling killHero.
  - All non-Han heroes dead: Simulation runs only on alive heroes (hero_han),
    producing a valid 1-hero report without throwing.

6. Tests

  - npm script: "test:phase4": "node scripts/test_phase4_login_report.mjs"
  - Assertions (check(...)):
    1.  check('computeGameDaysAway: 0h -> 0 days, 7.9h -> 0 days, 8h -> 1
        day, 24h -> 3 days, 200h -> capped at 9 days', ...)
    2.  check('Offline simulation uses exact same simulateGameDay code path as
        live play', ...)
    3.  check('Report events are strictly sorted by importance descending', ...)
    4.  check('Heroes who chose Did Nothing are explicitly listed in
        idleHeroNames and perHeroSummaries', ...)
    5.  check('Dead hero drops weapon/offhand/armor into gameState.inventory and
        moves to gameState.deadHeroes', ...)
    6.  check('Full inventory (40 items) routes dead hero gear to
        gameState.overflowLoot without item loss', ...)
    7.  check('Zero Console Errors', capturedErrors.length === 0)
  - Expected Console Output:
    ========================================================
    📋 PHASE 4 LOGIN REPORT & OFFLINE SIM RESULTS: 7/7 TESTS PASSED
    ========================================================
    🎉 ALL PHASE 4 TESTS PASSED SUCCESSFULLY!

Phase 5 — Training Place in Town + Sparring + Iselle + Squad Leader

1. Files to Create and Files to Edit

  - Files to create:
      - src/hub/TownSparringController.js — PROTECTED — needs user sign-off
        (src/hub/*) — Manages live 3D town sparring inside the sparring ring,
        Squad Leader proximity intervention, Iselle fly-in intervention, fast
        healing at the training grounds, and real-action XP ticks per
        swing/arrow/spell hit.
      - scripts/test_phase5_town_training.mjs — Headless Node test verifying
        the 4 training zone anchors, NPC activity routing, sparring controller
        lifecycle, Iselle law enforcement, and zero per-frame allocations.
  - Files to edit:
      - src/art/town/layout.js — Add trainingZones metadata inside
        LAYOUT.zones.training_grounds defining the 4 sub-zones: wooden_dummies,
        archery_targets, fire_targets, and sparring_ring with exact stand/target
        coordinates.
      - src/art/town/landmarksWork.js — In Section 3 (training_grounds), build
        the 3D meshes for the 2 archery bullseye targets (archery_target_0,
        archery_target_1), 2 stone fire-brazier targets (fire_target_0,
        fire_target_1), and the 5m circular rope/stone sparring ring
        (sparring_ring_center, sparring_spot_a, sparring_spot_b), registering
        all anchors on anchors.
      - src/scenes/HubScene.js — Unlock Mess Hall for eating (b.id ===
        'mess_hall_row' triggers a meal/status message or feeds heroes instead
        of blocking when hungry) and wire TownSparringController into
        HubScene.update(delta).
      - src/hub/HubHeroes.js — PROTECTED — needs user sign-off (src/hub/*) —
        Minimal additive hook: allow HubHeroNPC to execute the daily activity
        chosen by DailyDecisionEngine ('train_dummy', 'train_archery',
        'train_magic', 'spar', 'eat', 'rest', 'idle'), walk to the corresponding
        zone anchor via setDestination(x, z, onArrival), play the existing
        trainSword / trainBow / trainMagic poses, and award XP on each real
        animation strike/shot/cast cycle. Also add triggerPunishmentOnNpc(npc,
        cb) alias to executeHero(npc, cb) on HubHeroesManager to fix the known
        gotcha.
      - package.json — Add "test:phase5": "node
        scripts/test_phase5_town_training.mjs".
      - docs/CODEMAP.md — Register src/hub/TownSparringController.js and
        scripts/test_phase5_town_training.mjs.

2. Function Names and Exact Signatures

  - src/hub/TownSparringController.js (PROTECTED — needs user sign-off):
      - export class TownSparringController
      - constructor(scene, heroesManager, iselle, navGrid = null) ->
        preallocates scratch vectors (_vA, _vB, _vMid, _dir) at
        module/constructor scope; zero allocations in update().
      - startSpar(npcA, npcB, isSanctionedInRing = true) -> walks npcA and npcB
        to sparring_spot_a (-24.2, 23.5) and sparring_spot_b (-21.0, 23.5) (or
        starts immediately if an unsanctioned tension fight outside the ring,
        which immediately flags LAW_NO_OUTSIDE_FIGHTING).
      - update(delta, leaderPos = null) -> ticks active spar exchange timer,
        applies weapon swing/bow/magic animations, resolves real hits via
        DamageResolver.resolve, checks Squad Leader intervention (leaderDist
        <= 7.0 and leader combat power > both fighters) and Iselle intervention
        (hpRatio < 0.25, hitZone === 'head' || hitZone === 'heart', elapsed
        > 25.0s, totalDamage > 120, or outside ring), applies fast heal
        (TRAINING_FAST_HEAL_PER_SEC) to non-critical damage.
      - interveneWithLeader(sparSession, leaderHero) -> separates fighters, logs
        report event.
      - interveneWithIselle(sparSession, reason, lawBroken = null) -> flies
        Iselle to _vMid, calls this.iselle.say('lawReprimand', { force: true,
        text }), heals both fighters to 50% MaxHP, lowers anger by 25, raises
        fear by 10, lowers offender motivationScore by 15 if lawBroken,
        separates fighters.

3. Exact 4 Training Sub-Zone Coordinates Inside training_grounds (center: (-24, 20), 16×16m)

trainingZones: {
  wooden_dummies: {
    id: 'wooden_dummies',
    slots: [
      { stand: { x: -26.4, y: 0, z: 16.8 }, target: { x: -26.4, y: 1.25, z: 18.0 }, anchorId: 'dummy_0' },
      { stand: { x: -24.0, y: 0, z: 16.8 }, target: { x: -24.0, y: 1.25, z: 18.0 }, anchorId: 'dummy_1' },
      { stand: { x: -21.6, y: 0, z: 16.8 }, target: { x: -21.6, y: 1.25, z: 18.0 }, anchorId: 'dummy_2' }
    ]
  },
  archery_targets: {
    id: 'archery_targets',
    slots: [
      { stand: { x: -19.8, y: 0, z: 19.5 }, target: { x: -19.8, y: 1.35, z: 25.5 }, anchorId: 'archery_target_0' },
      { stand: { x: -17.6, y: 0, z: 19.5 }, target: { x: -17.6, y: 1.35, z: 25.5 }, anchorId: 'archery_target_1' }
    ]
  },
  fire_targets: {
    id: 'fire_targets',
    slots: [
      { stand: { x: -30.0, y: 0, z: 20.5 }, target: { x: -30.0, y: 1.40, z: 25.5 }, anchorId: 'fire_target_0' },
      { stand: { x: -27.8, y: 0, z: 20.5 }, target: { x: -27.8, y: 1.40, z: 25.5 }, anchorId: 'fire_target_1' }
    ]
  },
  sparring_ring: {
    id: 'sparring_ring',
    center: { x: -22.6, y: 0, z: 23.5 },
    radius: 2.4,
    spotA: { x: -24.2, y: 0, z: 23.5 },
    spotB: { x: -21.0, y: 0, z: 23.5 }
  }
}

  - Cafeteria (mess_hall_row) Stand Positions for Eating: { x: 8.0, y: 0,
    z: 34.5 } (door_mess_hall_row approach).
  - Dormitory (residences) Stand Positions for Resting: Existing goToDormitory()
    / cottage door coordinates.

4. Config Values

All sparring intervention limits, fast heal rates, and lobby laws live in
src/data/emotions.config.js (EMOTION_CONFIG) and src/data/training.config.js
(TRAINING_CONFIG). See Section 5.2 Tables 5.2.1 and 5.2.2.

5. Edge Cases

  - Zero per-frame allocations: TownSparringController.update() and
    HubHeroNPC.update() use module-level scratch THREE.Vector3 instances (_v0,
    _v1, _v2) and never allocate objects, arrays, or closures inside update().
  - All slots in a training sub-zone occupied: Hero falls back to an adjacent
    open dummy (dummy_3..dummy_11) or waits at the ring perimeter without
    getting stuck.
  - Fight outside the sparring ring: Immediately flagged as
    LAW_NO_OUTSIDE_FIGHTING, triggering Iselle intervention within 1.5s,
    applying the -15 motivation penalty to the instigator, and recording a
    law-break report line.

6. Tests

  - npm script: "test:phase5": "node scripts/test_phase5_town_training.mjs"
  - Assertions (check(...)):
    1.  check('LAYOUT.zones.training_grounds defines all 4 sub-zones
        (wooden_dummies, archery_targets, fire_targets, sparring_ring)', ...)
    2.  check('TownSparringController stops spar immediately when HP drops
        below 25%', ...)
    3.  check('TownSparringController stops spar immediately on head or heart
        hit and applies serious injury', ...)
    4.  check('TownSparringController stops spar when duration > 25s or
        totalDamage > 120', ...)
    5.  check('Unsanctioned fight outside ring triggers LAW_NO_OUTSIDE_FIGHTING
        and lowers offender motivationScore by 15', ...)
    6.  check('Squad Leader intervenes before Iselle when nearby and stronger
        than both fighters', ...)
    7.  check('Non-critical training damage fast-heals while head/heart injury
        does not fast-heal', ...)
    8.  check('Zero Console Errors', capturedErrors.length === 0)
  - Expected Console Output:
    ========================================================
    📋 PHASE 5 TOWN TRAINING & SPARRING RESULTS: 8/8 TESTS PASSED
    ========================================================
    🎉 ALL PHASE 5 TESTS PASSED SUCCESSFULLY!

Phase 6 — Roster UI

1. Files to Create and Files to Edit

  - Files to create:
      - src/ui/RosterEmotionPanel.js — PROTECTED — needs user sign-off
        (src/ui/*) — Self-contained UI builder functions
        (createEmotionBarsSection(hero), createSkillsAndCombiningSection(hero),
        createActivityHistorySection(hero)) using the exact theme.css variables
        and inline bar styles from RosterWindow.js.
      - scripts/test_phase6_ui_and_integration.mjs — End-to-end headless
        verification of Roster UI data formatting, full 6-phase integration,
        save/reload roundtrip, and check_codemap.mjs.
  - Files to edit:
      - src/ui/RosterWindow.js — PROTECTED — needs user sign-off (src/ui/*) —
        Minimal additive edit (under 20 lines) inside renderActiveTab() to
        import and append createEmotionBarsSection(hero),
        createSkillsAndCombiningSection(hero), and
        createActivityHistorySection(hero) into the selected hero detail pane,
        plus a [ SQUAD LEADER ] badge on the leader and an [ ISELLE'S REPORT ]
        button in topBar to view the latest report at any time.
      - package.json — Add "test:phase6": "node
        scripts/test_phase6_ui_and_integration.mjs".
      - docs/CODEMAP.md — Register src/ui/RosterEmotionPanel.js and
        scripts/test_phase6_ui_and_integration.mjs.

2. Function Names and Exact Signatures

  - src/ui/RosterEmotionPanel.js (PROTECTED — needs user sign-off):
      - export function getHeroEmotionDisplayModel(hero) -> pure data presenter
        (testable in Node without DOM!) returning formatted bar percentages,
        colors, panic badge state, current activity label, active injury label,
        skill list (separated into active, combined, and merged parent skills),
        Pain Tolerance progress (damageTaken / nextThreshold, damageHealed /
        nextThreshold), and last 5 activity history lines.
      - export function createEmotionBarsSection(hero) -> returns HTMLElement
        containing 6 bars: Hunger (#ffaa44), Fear (#6fe0f0), Anger (#ff5a6e),
        Motivation (#7dffb0), Fatigue (#ffaa00), and Mentality (#b48cff), plus
        current activity pill (TRAINING: ARCHERY, SPARRING, PANICKED, etc.).
      - export function createSkillsAndCombiningSection(hero) -> returns
        HTMLElement rendering each skill with level, XP bar (exp / (100 *
        level)), [COMBINED] gold badge on recipe outputs, dimmed [MERGED -> ...]
        badge on merged parent skills, and a dedicated Pain Tolerance tracker
        box (Dmg Taken: X/Y | Healed: X/Y | Reduction: -Z%).
      - export function createActivityHistorySection(hero) -> returns
        HTMLElement listing the most recent 5 entries from hero.activityHistory.

3. Data Structures

HeroEmotionDisplayModel (returned by getHeroEmotionDisplayModel(hero)):

{
  activityLabel: string,          // e.g. 'TRAINING (WOODEN DUMMIES)'
  isSquadLeader: boolean,
  isPanicking: boolean,
  injuryText: string | null,      // e.g. 'SERIOUS HEAD INJURY (2d left)'
  bars: [
    { key: 'hunger',     label: 'HUNGER',     value: number, color: '#ffaa44' },
    { key: 'fear',       label: 'FEAR',       value: number, color: '#6fe0f0' },
    { key: 'anger',      label: 'ANGER',      value: number, color: '#ff5a6e' },
    { key: 'motivation', label: 'MOTIVATION', value: number, color: '#7dffb0' },
    { key: 'fatigue',    label: 'FATIGUE',    value: number, color: '#ffaa00' },
    { key: 'mentality',  label: 'MENTALITY',  value: number, color: '#b48cff' }
  ],
  painTolerance: {
    unlocked: boolean,
    level: number,
    damageReductionPct: string,   // e.g. '4.5%'
    damageTaken: number,
    damageHealed: number,
    nextThreshold: number
  },
  skills: Array<{ id: string, name: string, level: number, exp: number, neededXp: number, isMerged: boolean, mergedIntoName: string | null, isCombined: boolean }>,
  recentHistory: Array<{ day: number, text: string, type: string }>
}

4. Config Values

Uses EMOTION_CONFIG and TRAINING_CONFIG (no hardcoded thresholds in UI).

5. Edge Cases

  - Hero with empty activityHistory or skills: Renders clean placeholder rows
    ("No recent activity recorded.", "No skills learned yet.") without throwing.
  - Merged skills display: Merged parent skills stay visible in the skill list
    with opacity: 0.55 and a [MERGED → BASIC SWORD-SHIELD] tag so the player
    clearly sees how the combined skill was formed.

6. Tests

  - npm script: "test:phase6": "node scripts/test_phase6_ui_and_integration.mjs"
  - Assertions (check(...)):
    1.  check('getHeroEmotionDisplayModel returns all 6 bars (hunger, fear,
        anger, motivation, fatigue, mentality) clamped 0..100', ...)
    2.  check('getHeroEmotionDisplayModel marks merged parent skills and
        combined recipe skills accurately', ...)
    3.  check('getHeroEmotionDisplayModel formats Pain Tolerance level, DR%, and
        counter thresholds', ...)
    4.  check('Full Save -> Reload roundtrip preserves emotions, mentality,
        merged skills, Pain Tolerance, tensions, and report history', ...)
    5.  check('check_codemap.mjs prints CODEMAP OK', ...)
    6.  check('Zero Console Errors', capturedErrors.length === 0)
  - Expected Console Output:
    ========================================================
    📋 PHASE 6 ROSTER UI & FULL INTEGRATION: 6/6 TESTS PASSED
    ========================================================
    🎉 ALL PHASE 6 TESTS PASSED SUCCESSFULLY!

5.2 ALL CONFIG VALUES IN TABLES

Table 5.2.1 — src/data/emotions.config.js (export const EMOTION_CONFIG)

| Constant                          | Type       | Default                                                                                                                                                                                                                                                          | Range        | Meaning                                                                            |
| --------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------- |
| `STAR_MULTIPLIERS`                | `Object`   | `{1:1.00, 2:1.083, 3:1.167, 4:1.25, 5:1.333, 6:1.417, 7:1.50}`                                                                                                                                                                                                   | `1.00..1.50` | Combat HP & damage multiplier by star rank (1.0 at 1★ up to 1.5 at 7★)             |
| `MENTALITY_BASE_BY_CLASS`         | `Object`   | `{Vanguard:55, 'Vanguard Tank':60, Knight:60, Berserker:50, Valkyrie:60, Scout:48, Mage:52, 'Fire Mage':52, Healer:54, Artisan:55, Novice:42}`                                                                                                                   | `0..100`     | Default base Mentality stat by hero class                                          |
| `MENTALITY_BONUS_PER_STAR`        | `number`   | `3`                                                                                                                                                                                                                                                              | `0..10`      | Additional starting Mentality per star above 1                                     |
| `PANIC_MENTALITY_THRESHOLD`       | `number`   | `30`                                                                                                                                                                                                                                                             | `0..100`     | Mentality below this value makes hero susceptible to Panic                         |
| `PANIC_FEAR_THRESHOLD`            | `number`   | `60`                                                                                                                                                                                                                                                             | `0..100`     | Fear above this value (when Mentality \< 30) triggers Panic state                  |
| `PANIC_SAFE_TRAIN_MULT`           | `number`   | `0.25`                                                                                                                                                                                                                                                           | `0.0..1.0`   | Weight multiplier on non-risky training while panicking (risky/spar = 0)           |
| `DEFAULT_HUNGER`                  | `number`   | `20`                                                                                                                                                                                                                                                             | `0..100`     | Initial hunger for a newly created hero                                            |
| `DEFAULT_FEAR`                    | `number`   | `10`                                                                                                                                                                                                                                                             | `0..100`     | Initial fear for a newly created hero                                              |
| `DEFAULT_ANGER`                   | `number`   | `0`                                                                                                                                                                                                                                                              | `0..100`     | Initial anger for a newly created hero                                             |
| `MOTIVATION_SCORE_MAP`            | `Object`   | `{diligent:75, normal:50, lazy:25}`                                                                                                                                                                                                                              | `0..100`     | Starting numeric motivation score from string motivation                           |
| `DAILY_HUNGER_GAIN`               | `number`   | `18`                                                                                                                                                                                                                                                             | `0..50`      | Hunger increase per game day                                                       |
| `HIGH_HUNGER_THRESHOLD`           | `number`   | `65`                                                                                                                                                                                                                                                             | `0..100`     | Hunger level that triggers daily motivation loss, anger gain, and training penalty |
| `HIGH_HUNGER_MOTIVATION_PENALTY`  | `number`   | `8`                                                                                                                                                                                                                                                              | `0..30`      | Daily motivation loss when Hunger \>= `HIGH_HUNGER_THRESHOLD`                      |
| `HIGH_HUNGER_ANGER_GAIN`          | `number`   | `10`                                                                                                                                                                                                                                                             | `0..30`      | Daily anger gain when Hunger \>= `HIGH_HUNGER_THRESHOLD`                           |
| `HIGH_HUNGER_TRAINING_MULT`       | `number`   | `0.65`                                                                                                                                                                                                                                                           | `0.1..1.0`   | Training XP/stat gain multiplier when Hunger \>= `HIGH_HUNGER_THRESHOLD`           |
| `EAT_HUNGER_REDUCTION`            | `Object`   | `{basic:35, good:55, feast:80}`                                                                                                                                                                                                                                  | `0..100`     | Hunger removed by eating at the Cafeteria                                          |
| `EAT_FEAR_REDUCTION`              | `number`   | `6`                                                                                                                                                                                                                                                              | `0..30`      | Fear removed when a hero eats                                                      |
| `EAT_MOTIVATION_GAIN`             | `number`   | `5`                                                                                                                                                                                                                                                              | `0..25`      | Motivation gained when a hero eats                                                 |
| `REST_FATIGUE_REDUCTION`          | `number`   | `40`                                                                                                                                                                                                                                                             | `10..100`    | Base Fatigue removed by resting in the Dormitory                                   |
| `REST_FEAR_REDUCTION`             | `number`   | `12`                                                                                                                                                                                                                                                             | `0..40`      | Fear removed by resting in the Dormitory                                           |
| `REST_ANGER_REDUCTION`            | `number`   | `10`                                                                                                                                                                                                                                                             | `0..40`      | Anger removed by resting in the Dormitory                                          |
| `FEAR_GAIN_NEAR_DEATH`            | `number`   | `28`                                                                                                                                                                                                                                                             | `0..100`     | Raw fear gain when dropping below 20% HP (multiplied by `1 - mentality/100`)       |
| `FEAR_GAIN_BIG_DAMAGE`            | `number`   | `14`                                                                                                                                                                                                                                                             | `0..100`     | Raw fear gain when taking \>30% MaxHP in one hit                                   |
| `FEAR_GAIN_LOSS`                  | `number`   | `12`                                                                                                                                                                                                                                                             | `0..100`     | Raw fear gain from losing a fight/spar                                             |
| `FEAR_GAIN_ALLY_FELL`             | `number`   | `35`                                                                                                                                                                                                                                                             | `0..100`     | Raw fear gain when an ally dies                                                    |
| `FEAR_REDUCTION_TRAIN_SUCCESS`    | `number`   | `5`                                                                                                                                                                                                                                                              | `0..25`      | Fear reduction from completing a successful training session                       |
| `ANGER_GAIN_LOSS`                 | `number`   | `14`                                                                                                                                                                                                                                                             | `0..40`      | Anger gain from losing a spar/fight                                                |
| `ANGER_GAIN_RIVALRY`              | `number`   | `8`                                                                                                                                                                                                                                                              | `0..30`      | Anger gain when interacting with a rival                                           |
| `FIGHT_ANGER_THRESHOLD`           | `number`   | `70`                                                                                                                                                                                                                                                             | `0..100`     | Anger threshold required for a hero to start an unsanctioned tension fight         |
| `FIGHT_TENSION_THRESHOLD`         | `number`   | `35`                                                                                                                                                                                                                                                             | `0..100`     | Pairwise tension required to target another hero for an unsanctioned fight         |
| `FIGHT_LOW_RELATION_THRESHOLD`    | `number`   | `20`                                                                                                                                                                                                                                                             | `0..100`     | Intimacy below this value also qualifies a pair for rivalry tension                |
| `PERSONALITY_TRAITS`              | `string[]` | `['diligent','lazy','brave','cautious','hot_headed']`                                                                                                                                                                                                            | —            | Canonical personality trait IDs                                                    |
| `TRAIT_MODIFIERS`                 | `Object`   | `{diligent:{trainWeight:1.5,idleWeight:0.4}, lazy:{trainWeight:0.45,idleWeight:1.8}, brave:{sparWeight:1.4,fearGainMult:0.7}, cautious:{sparWeight:0.6,restWeight:1.3,fearGainMult:1.25}, hot_headed:{sparWeight:1.35,angerGainMult:1.3,refuseOrderBonus:0.35}}` | —            | Per-trait multipliers on decision weights and emotion gains                        |
| `BASE_DECISION_WEIGHTS`           | `Object`   | `{train_dummy:25, train_archery:25, train_magic:25, spar:18, eat:20, rest:18, idle:15}`                                                                                                                                                                          | `0..100`     | Base daily decision weights before emotion/class/trait scaling                     |
| `LEADER_ORDER_BASE_SUCCESS`       | `number`   | `0.65`                                                                                                                                                                                                                                                           | `0.0..1.0`   | Base probability that an idle hero obeys the Squad Leader's order to train         |
| `LEADER_ORDER_RELATION_SCALE`     | `number`   | `0.004`                                                                                                                                                                                                                                                          | `0.0..0.02`  | Added compliance probability per point of relationship (`getRelation`)             |
| `LEADER_ORDER_ANGER_PENALTY`      | `number`   | `0.005`                                                                                                                                                                                                                                                          | `0.0..0.02`  | Subtracted compliance probability per point of target's Anger                      |
| `LEADER_INTERVENE_MAX_DIST`       | `number`   | `7.0`                                                                                                                                                                                                                                                            | `2.0..20.0`  | Max distance (meters) for Squad Leader to break up a fight in town before Iselle   |
| `ISELLE_INTERVENE_HP_RATIO`       | `number`   | `0.25`                                                                                                                                                                                                                                                           | `0.05..0.50` | Fighter HP ratio below which Iselle immediately stops the fight                    |
| `ISELLE_INTERVENE_CRITICAL_ZONES` | `string[]` | `['head','heart']`                                                                                                                                                                                                                                               | —            | Hit zones that immediately trigger Iselle intervention                             |
| `ISELLE_MAX_FIGHT_DURATION_SEC`   | `number`   | `25.0`                                                                                                                                                                                                                                                           | `5.0..120.0` | Max fight/spar duration in seconds before Iselle intervenes                        |
| `ISELLE_MAX_FIGHT_TOTAL_DAMAGE`   | `number`   | `120`                                                                                                                                                                                                                                                            | `30..500`    | Max cumulative damage in a spar before Iselle intervenes                           |
| `ISELLE_SAFE_HEAL_HP_RATIO`       | `number`   | `0.50`                                                                                                                                                                                                                                                           | `0.25..1.0`  | Minimum MaxHP ratio Iselle heals separated fighters to                             |
| `ISELLE_ANGER_REDUCTION`          | `number`   | `25`                                                                                                                                                                                                                                                             | `0..100`     | Anger reduction applied by Iselle when separating fighters                         |
| `ISELLE_FEAR_GAIN`                | `number`   | `10`                                                                                                                                                                                                                                                             | `0..50`      | Fear increase applied by Iselle when separating fighters                           |
| `LOBBY_LAWS`                      | `Object`   | `{NO_OUTSIDE_FIGHTING:'No fighting outside the sparring ring', NO_LETHAL_SPAR_BLOWS:'No lethal blows to head or heart in sparring', NO_ATTACK_LOW_HP:'No attacking a hero below 25% HP'}`                                                                        | —            | The three Niflheimr lobby laws enforced by Iselle                                  |
| `LAW_BREAK_MOTIVATION_PENALTY`    | `number`   | `15`                                                                                                                                                                                                                                                             | `0..50`      | Motivation penalty applied to a hero who breaks a lobby law                        |
| `REPORT_IMPORTANCE`               | `Object`   | `{died:100, iselle_intervened:90, law_broken:88, fought_hero:85, injured:80, skill_combined:75, new_skill:70, level_up:65, leader_ordered:55, got_scared:45, trained:40, ate:25, rested:20, did_nothing:10}`                                                     | `1..100`     | Priority weights for sorting "Iselle's Report"                                     |

Table 5.2.2 — src/data/training.config.js (export const TRAINING_CONFIG)

| Constant                             | Type     | Default                                                                                                                           | Range         | Meaning                                                                                                       |
| ------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------- |
| `REAL_HOURS_PER_GAME_DAY`            | `number` | `8`                                                                                                                               | `1..24`       | Real-world hours per simulated offline game day (1 real day = 3 game days)                                    |
| `MAX_OFFLINE_GAME_DAYS`              | `number` | `9`                                                                                                                               | `1..30`       | Maximum offline game days simulated on login                                                                  |
| `SESSION_OUTCOME_WEIGHTS`            | `Object` | `{strong_gain:20, normal_gain:52, small_gain:20, accident:8}`                                                                     | `0..100`      | Weighted probabilities for a training session outcome                                                         |
| `OUTCOME_MULTIPLIERS`                | `Object` | `{strong_gain:1.5, normal_gain:1.0, small_gain:0.5, accident:0.25}`                                                               | `0.0..3.0`    | Skill XP and hero EXP multiplier for each session outcome                                                     |
| `BASE_SESSION_SKILL_XP`              | `Object` | `{train_dummy:45, train_archery:45, train_magic:48, spar:70}`                                                                     | `10..200`     | Base primary skill XP granted per daily training session                                                      |
| `SECONDARY_SKILL_XP_RATIO`           | `number` | `0.65`                                                                                                                            | `0.1..1.0`    | Ratio of base skill XP granted to the secondary co-trained skill (e.g. Shield, Quiver, Mana Control)          |
| `BASE_SESSION_HERO_EXP`              | `Object` | `{train_dummy:22, train_archery:22, train_magic:24, spar:35}`                                                                     | `5..100`      | Base hero level EXP granted per training session                                                              |
| `STAT_GAIN_CHANCE_BY_OUTCOME`        | `Object` | `{strong_gain:1.0, normal_gain:0.65, small_gain:0.25, accident:0.0}`                                                              | `0.0..1.0`    | Probability of gaining +1/+2 direct core stats from a training session                                        |
| `STRONG_GAIN_BONUS_STAT_POINTS`      | `number` | `2`                                                                                                                               | `1..5`        | Direct core stat points granted on `strong_gain`                                                              |
| `NORMAL_GAIN_BONUS_STAT_POINTS`      | `number` | `1`                                                                                                                               | `1..3`        | Direct core stat points granted on `normal_gain`                                                              |
| `TRAINING_FATIGUE_COST`              | `Object` | `{train_dummy:18, train_archery:16, train_magic:20, spar:24}`                                                                     | `5..50`       | Fatigue added by a training session                                                                           |
| `SPAR_LOW_HP_THRESHOLD`              | `number` | `0.20`                                                                                                                            | `0.05..0.40`  | Surviving a spar below this HP ratio awards bonus XP and Pain Tolerance counters                              |
| `SPAR_LOW_HP_XP_BONUS_MULT`          | `number` | `1.50`                                                                                                                            | `1.0..3.0`    | Skill XP multiplier when surviving below 20% HP in sparring                                                   |
| `SPAR_LOW_HP_PAIN_COUNTER_BONUS`     | `number` | `35`                                                                                                                              | `0..100`      | Bonus `damageTaken` and `damageHealed` counters awarded for surviving \<20% HP in sparring                    |
| `RISKY_DEATH_CHANCE_BASE`            | `number` | `0.005`                                                                                                                           | `0.0..0.05`   | Base death probability on an accident in risky training (magic/spar) when Iselle is NOT present               |
| `DEATH_CHANCE_WITH_ISELLE`           | `number` | `0.0`                                                                                                                             | `0.0..0.0`    | Death probability after Iselle intervention (must be `0.0` in vertical slice)                                 |
| `HIT_ZONE_WEIGHTS`                   | `Object` | `{melee:{limbs:45,torso:43,head:8,heart:4}, arrow:{limbs:35,torso:45,head:13,heart:7}, spell:{limbs:38,torso:48,head:8,heart:6}}` | `0..100`      | Weighted hit-zone probabilities per attack kind                                                               |
| `HIT_ZONE_DAMAGE_MULT`               | `Object` | `{limbs:0.85, torso:1.00, head:1.75, heart:2.00}`                                                                                 | `0.5..3.0`    | Damage multiplier by hit zone                                                                                 |
| `TRAINING_FAST_HEAL_PER_SEC`         | `number` | `12.0`                                                                                                                            | `1.0..50.0`   | HP per second restored at the training grounds for normal (limbs/torso) damage                                |
| `CRITICAL_INJURY_HEAL_MULT`          | `number` | `0.15`                                                                                                                            | `0.0..0.5`    | Healing rate multiplier when injured in the `'head'` or `'heart'` (does not fast-heal)                        |
| `CRITICAL_INJURY_DURATION_DAYS`      | `number` | `2`                                                                                                                               | `1..7`        | Game days a serious head/heart injury persists                                                                |
| `PAIN_TOLERANCE_THRESHOLD_PER_LEVEL` | `number` | `120`                                                                                                                             | `50..500`     | Cumulative training `damageTaken` AND `damageHealed` required per level of Pain Tolerance (`120 * nextLevel`) |
| `PAIN_TOLERANCE_DR_PER_LEVEL`        | `number` | `0.015`                                                                                                                           | `0.005..0.03` | Incoming damage reduction per level of Pain Tolerance (`1.5%` per level, max `15%` at Lv 10)                  |
| `LIVE_ACTION_XP_PER_HIT`             | `Object` | `{dummy:6, archery:6, magic:7, spar:10}`                                                                                          | `1..30`       | Real-time skill XP awarded per strike/arrow/spell impact in the 3D town yard                                  |

Table 5.2.3 — src/data/skillRecipes.config.js (export const SKILL_RECIPES)

| Recipe ID               | Parent Skill A (`minLevel`)    | Parent Skill B (`minLevel`)    | `requiredCoTrainSessions` | Combined Skill ID (`name`)                        | Combined Skill Effects (per level)                                   |
| ----------------------- | ------------------------------ | ------------------------------ | ------------------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| `recipe_sword_shield`   | `basic_swordsmanship` (`2`)    | `basic_shield_technique` (`1`) | `3`                       | `basic_sword_shield` (`Basic Sword-Shield`)       | `{ damageMult: 0.06, blockStaminaMult: -0.04, blockWindow: 0.015 }`  |
| `recipe_bow_quiver`     | `basic_archery` (`2`)          | `quiver_handling` (`1`)        | `3`                       | `rapid_volley_archery` (`Rapid Volley Archery`)   | `{ damageMult: 0.06, critChanceBonus: 0.02, reloadSpeedMult: 0.08 }` |
| `recipe_fire_mana`      | `basic_fire_magic` (`2`)       | `mana_control` (`1`)           | `3`                       | `controlled_flamecraft` (`Controlled Flamecraft`) | `{ spellDamageMult: 0.07, manaCostReduction: 0.04 }`                 |
| `recipe_spear_evasion`  | `basic_spearmanship` (`2`)     | `evasion` (`1`)                | `3`                       | `phantom_lancer_style` (`Phantom Lancer Style`)   | `{ damageMult: 0.06, dodgeWindowBonus: 0.02 }`                       |
| `recipe_dagger_stealth` | `basic_dagger_technique` (`2`) | `stealth` (`1`)                | `3`                       | `shadow_assassination` (`Shadow Assassination`)   | `{ damageMult: 0.05, critDamageMult: 0.08 }`                         |

5.3 FINAL RULES SECTION FOR GEMINI

1.  Do NOT break the fighting system, weapon code, or old saves: Do not alter
    how sword, shield, bow, or staff combat mechanics work in TowerScene,
    HitPipeline, SpellSystem, ArrowPool, or loadout.js. In DamageResolver.js,
    only add the non-breaking rollHitZone tag and pain_tolerance damage
    reduction. Old pickmeup_save_v1 saves must load without errors via ??
    defaults and gameState.flags.emotionTrainingMigrationV1.
2.  Keep ALL balancing numbers in config files: Every threshold, weight,
    multiplier, cooldown, and probability must be imported from
    src/data/emotions.config.js, src/data/training.config.js, or
    src/data/skillRecipes.config.js. Zero magic numbers inside logic loops.
3.  ONE code path for live play and offline simulation: Both
    GameState.startNewDay() (live play) and runOfflineLoginSimulation() (offline
    login in src/core/LoginSimulation.js) MUST call simulateGameDay(gameState,
    options) exported from src/core/DailyDecisionEngine.js. Never duplicate
    daily decision or training math.
4.  Zero allocations in per-frame code: Inside TownSparringController.update(),
    HubHeroesManager.update(), HubHeroNPC.update(), and HubScene.update(), never
    call new THREE.Vector3(), new THREE.Quaternion(), new THREE.Mesh(), or
    allocate per-frame closures. Reuse module-scoped scratch variables (_v0,
    _v1, _q0).
5.  Protected files require explicit user sign-off: Before creating or editing
    any file under src/hub/* (src/hub/HubHeroes.js,
    src/hub/TownSparringController.js) or src/ui/*
    (src/ui/IselleReportWindow.js, src/ui/RosterEmotionPanel.js,
    src/ui/RosterWindow.js), ask the user for permission and keep edits to
    existing protected files minimal and additive.
6.  Out-of-scope features (future — do not implement): Do NOT implement
    Synthesis Chamber expansion, Promotion Chamber, support classes (Cook,
    Blacksmith), gifting, real-combat panic in the Tower, Daily Dungeons, or a
    Fight AI redesign.
7.  Maintain docs/CODEMAP.md in every phase: Every time a file is created,
    edited (exports/imports changed), renamed, or removed, update
    docs/CODEMAP.md in the same phase and run node scripts/check_codemap.mjs
    until it prints CODEMAP OK.
8.  Required Final Report Format: At the end of each phase (and at completion),
    output your report in this exact 4-part structure:
    1.  Files changed (one line per file).
    2.  PASS/FAIL for every npm test script (exact command + result, including
        node scripts/check_codemap.mjs).
    3.  What is NOT done (remaining phases or out-of-scope items).
    4.  Three manual test steps (exact actions to verify in the browser).

5.4 OPEN QUESTIONS AND ASSUMPTIONS

1.  Relationship between Mentality and legacy hero.composure: Because hero.stats
    only has {str, agi, vit, int, wil} and hero.composure (20–59) is an
    unstandardized legacy field, I assumed hero.mentality (0–100) is stored
    directly on the hero object, seeded from hero.composure when migrating old
    saves, and defaulted by class + star (getDefaultMentality(hero.class,
    hero.star)) for new heroes. getHeroThreeGroups(hero) in src/core/Stats.js is
    updated to use hero.mentality while keeping hero.composure synchronized for
    backwards compatibility.
2.  Synchronizing Anger/hero.stress and Hunger/hero.satisfaction: Since the
    existing codebase already uses hero.stress (0–100) and hero.satisfaction
    (0–100), I assumed hero.anger and hero.stress are kept equal (hero.stress =
    hero.anger), and hero.satisfaction = 100 - hero.hunger, so legacy Dormitory,
    speech bubble, and HUD checks continue working without modification.
3.  pain_tolerance Talent vs Levelled Skill: Because pain_tolerance already
    exists in src/data/skills.js as a 1-level talent, I assumed we upgrade the
    existing pain_tolerance entry in SKILLS to type: 'skill', maxLevel: 10 with
    incomingDamageReduction: 0.015 per level (1.5% per level, up to 15% at
    Lv 10) while preserving hpThresholdKeepFighting: 1 so existing talent checks
    in Stats.js remain valid.
4.  Training Grounds & Cafeteria Facility Gating: In GameState.js,
    facilities.training.unlocked defaults to false (200G unlock) and
    facilities.cafeteria.unlocked defaults to false (Floor 10). For this
    vertical slice, I assumed the outdoor training_grounds yard ((-24, 20)) and
    basic daily meals at mess_hall_row ((8, 38)) are accessible for autonomous
    daily hero training and eating from Day 1, while facility upgrades/levels
    scale their effectiveness.
5.  4 Training Sub-Zone Coordinates Inside the 16×16 Yard: Because only wooden
    dummies currently exist in landmarksWork.js, I placed the new
    archery_targets in the NE quadrant (x: -19.8..-17.6, z: 19.5 -> 25.5),
    fire_targets in the NW quadrant (x: -30.0..-27.8, z: 20.5 -> 25.5), and the
    sparring_ring (r = 2.4m) at (-22.6, 23.5) so they do not overlap the
    existing southern dummies (z = 16.8..18.0) or the eastern gate corridor
    ((-18, 18)).
6.  Dead Hero "Dissolve into Light" Visual: When a hero dies (in tests with
    isellePresent: false or scripted death), I assumed we reuse the rising
    cyan/white particle pillar style from SynthesisEffect / PunishmentEffect in
    HubScene when dismissing IselleReportWindow.
7.  basic_fire_magic vs Existing fireball Skill: Because the prompt specifies
    Basic Fire Magic + Mana Control, I added basic_fire_magic and mana_control
    to src/data/skills.js and treated heroes who already know fireball as also
    qualifying for basic_fire_magic progression so Eolka (HERO_TEMPLATES.EOLKA)
    can combine skills out of the box.

