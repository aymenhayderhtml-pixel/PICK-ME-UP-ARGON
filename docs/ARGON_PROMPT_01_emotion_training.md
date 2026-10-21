# ARGON PROMPT — Emotion System + Training System (Vertical Slice)

Copy the **single code block** below into Argon. Argon cannot see the code, so the prompt is
fully self-contained. Argon replies with a phased implementation plan; paste that reply back
to the coding agent for implementation.

---

````text
# PART 1 — ROLE AND RULES FOR ARGON

You are a game systems designer and senior engineer. You cannot see the code, so use only the
code facts below. Do not write full code. Write a phased implementation plan for another coding
agent (Gemini) that is weak at vague instructions, so be extremely specific: exact file paths
(new and existing), exact function names and signatures, exact data structures with field names
and defaults, exact config values, edge cases, and tests with expected results. If a code fact
is missing, say what you assume and list it at the end as an open question.

Additional hard rules you must obey while planning:

1. The project is Vanilla JavaScript (ES modules). NO TypeScript, NO React, NO new runtime
   dependencies, NO test framework. Tests are hand-written Node `.mjs` scripts using a
   `check(name, condition, extra)` helper that print `[PASS]`/`[FAIL]` and exit 0/1.
2. Zero allocations in per-frame code. No `new THREE.Vector3()`, `new THREE.Mesh()`, or closures
   inside `update()` ticks. Use preallocated scratch objects (`_v0`, `_q0`) and object pools.
3. All balancing numbers live in `src/data/*` config files. Never hardcode a tunable number in a
   logic loop. Every config value you propose must appear in a config table in your plan.
4. ONE code path for live play and offline simulation. The daily decision + simulation engine
   must be a pure, headless module that both the live town and the offline login simulation
   call. Do not write two copies.
5. Do not break the existing fighting system, the staff/bow/sword code, or old saves. Old saves
   must keep loading (the save has NO schema version — migration is done with per-field `??`
   defaults plus one-time boolean flags in `gameState.flags`).
6. `docs/CODEMAP.md` must be updated in the same phase as any file added/removed/renamed/moved,
   and `node scripts/check_codemap.mjs` must print `CODEMAP OK` before a phase is called done.
7. Project rule (from AGENTS.md) — these paths are PROTECTED and need explicit user permission
   before editing. The design below requires touching `src/hub/*` and `src/ui/*`. In your plan,
   call out explicitly, per file, that it is a protected area and needs sign-off, and keep the
   protected-area edits as small and additive as possible (prefer new files over editing
   existing ones). Protected list: `src/world/*`, `src/gacha/*`, `src/hub/*`, `src/ui/*`,
   `src/player/Player.js`, `src/combat/Ally.js`, `src/combat/Enemy.js`.
8. Do not plan a redesign of the combat AI. Sparring must reuse the existing combat code and
   the existing combat AI. The "Fight AI" is a later system.
9. Do NOT plan these (they are explicitly future): Synthesis Chamber expansion, Promotion
   Chamber, support classes (Cook, Blacksmith), gifting, real-combat panic, Daily Dungeons,
   Fight AI redesign. Mark them "future — do not implement".
10. Every phase must be small enough to finish and test on its own. Each phase must end with a
    runnable `npm` test script whose expected output you state exactly.

# PART 2 — CODE FACTS

Everything below is the real code. File paths, symbol names, field names and types are exact.
Excerpts are verbatim and capped at 25 lines each.

## 2.0 PROJECT STACK AND FOLDER STRUCTURE

Stack: Vite 8.3.0 (`devDependency`), Three.js 0.160.0 (`dependency`), Vanilla JavaScript ES
modules, `"type": "module"`. No TypeScript, no bundler config beyond `vite.config.js`, no test
framework, no state library, no CSS framework (plain CSS + inline styles).

`package.json` scripts (exact):
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test:spells": "node scripts/test_spells.mjs",
  "test:integration": "node scripts/test_integration.mjs",
  "test:loadout": "node scripts/test_loadout.mjs"
}
```

Folder structure (15 lines):
```
pick-me-up/
├── index.html              live game entry (HubScene + TowerScene + UI)
├── dev.html                Dev Lab harness          combat-test.html   combat sandbox
├── art-*-test.html         art harnesses (enemy/floor/iselle/test/town/weapon)
├── package.json            vite + three, npm test scripts
├── vite.config.js          AGENTS.md                README.md          TASKS.md
├── src/
│   ├── main.js  style.css  counter.js       bootstrap: renderer, SceneManager, scenes
│   ├── core/     GameState, Inventory, loadout, Stats, Input, SceneManager, equipmentEvents
│   ├── data/     heroes, items, enemies, skills, rules, materials, missions, rewards, drops, iselle
│   ├── combat/   Combatant, StateMachine, HitPipeline, DamageResolver, CombatData, spells.config, AI
│   ├── art/      hero/enemy/iselle/weapon meshes, HeroRig, IselleRig, weaponAnimations, town/
│   ├── hub/      HubHeroes, NavGrid, TrainingManager, Iselle, PunishmentEffect, SynthesisEffect
│   ├── scenes/   HubScene, TowerScene      ├── player/  Player, ThirdPersonCamera
│   ├── ui/       RosterWindow, SystemWindow, Hud, HubHud, HeroCard, HeroReport, windows
│   └── world/ gacha/ fx/ debug/ dev/ assets/
├── scripts/      headless QA *.mjs + check_codemap.mjs
└── docs/         GDD.md, CODEMAP.md, audits, QA reports
```

## 2.1 HERO DATA MODEL

### Files
- `src/data/heroes.js` — hero templates + generators (369 lines)
- `src/core/GameState.js` — runtime roster, save/load (1171 lines)
- `src/data/rules.js` — XP curves, star caps, stat keys (64 lines)
- `src/data/skills.js` — skill definitions + XP (285 lines)
- `src/core/Stats.js` — derived combat/display stats (282 lines)

### `src/data/heroes.js` exports
```js
export const HERO_TEMPLATES = { HAN, JENNA, AARON, VELKIST, EOLKA, SIRRIS, CATIO, SHAY };
export const PAST_JOBS = ['mercenary','shopkeeper','farmer','thief','student','sailor','hunter','merchant','bard','bandit','noble','cook'];
export const JOB_SKILL_MAP = { mercenary: {skillId:'basic_swordsmanship', weapon:'sword+shield'}, ... };
export function generateNoviceHero({ job = null, forceUncooperative = false, rng = Math.random, existingHeroes = [] } = {})
export function generateRandomHero(star = 1, rng = Math.random, existingHeroes = [])
export function rollMotivation(heroName, cooperation = null)   // -> 'diligent' | 'normal' | 'lazy'
export function createHeroFromTemplate(templateKey)
```

Template shape (`HERO_TEMPLATES.HAN`, verbatim):
```js
HAN: {
  id: 'hero_han',
  name: 'Han Islat',
  star: 1,
  class: 'Vanguard',
  hair: 0x111111,          // Black
  armor: 0x2a303c,         // Dark steel
  weapon: 'sword+shield',
  personality: 'Analytical & Cold',
  baseStats: { str: 7, agi: 7, vit: 8, int: 5, wil: 12 },
  skills: [
    { id: 'basic_swordsmanship', level: 1 },
    { id: 'basic_shield_technique', level: 1 },
  ],
  talents: [],
  hiddenTalent: 'composure', // Unlockable at 2 star
},
```
Other templates: JENNA (1★ Scout, dagger+bow), AARON (1★ Vanguard Tank, spear), VELKIST (1★
Berserker, greatsword), EOLKA (4★ Fire Mage, staff), SIRRIS (4★ Valkyrie, dual swords), CATIO
(3★ Artisan, hammer, `isDwarf: true`, `scale: 0.85`), SHAY (4★ Knight, sword+shield).

### Novice hero object shape — `generateNoviceHero(...)` return value (verbatim, trimmed)
```js
return {
  id: 'hero_novice_' + Date.now() + '_' + Math.floor(rng() * 100000),
  name, star: 1, level: 1, exp: 0, fatigue: 0,
  class: 'Novice', pastJob: chosenJob,
  cooperation: isUncooperative ? 'uncooperative' : 'cooperative',
  motivation: isUncooperative ? 'lazy' : rollMotivation(name),
  hair, armor: 0x445566, weapon: jobInfo.weapon,
  personality: isUncooperative ? 'Rebellious & Bitter' : 'Humble & Eager',
  stats,                                  // {str,agi,vit,int,wil}, each 8..14
  composure: Math.floor(rng() * 40) + 20, // 20 to 59
  skills: [ { id: jobInfo.skillId, level: 1, exp: 0 } ],
  talents: [],
  alive: true,
};
```

### The RUNTIME hero object (the authoritative shape)
Built in `GameState.initNewGame()` (Han) and normalized on load. Canonical field list:

| Field | Type | Meaning / default |
|---|---|---|
| `id` | string | `'hero_han'`, `'hero_jenna'`, `'hero_novice_<ts>_<n>'`, ... |
| `name` | string | display name |
| `star` | number | 1..7 (`MAX_STAR = 7`) |
| `level` | number | default 1, cap `star * LEVEL_CAP_PER_STAR` (=10) |
| `exp` | number | default 0, XP toward next level |
| `fatigue` | number | 0..100, default 0 |
| `stress` | number | 0..100, default 0 (the closest existing analogue to "Anger") |
| `satisfaction` | number | 0..100, default 50 (food satisfaction) |
| `traits` | string[] | default `[]`, currently only ever `['picky']` |
| `potentials` | `{str,agi,vit,int,wil}` | float growth multipliers 0.75..1.4 |
| `hiddenTalents` | string[] | talent ids not yet revealed |
| `talentsRevealed` | boolean | default `star >= 3` |
| `class` | string | 'Vanguard' | 'Scout' | 'Mage' | 'Berserker' | 'Healer' | 'Artisan' | 'Vanguard Tank' | 'Fire Mage' | 'Valkyrie' | 'Knight' | 'Novice' |
| `motivation` | string | 'diligent' | 'normal' | 'lazy' |
| `hair`, `armor` | number | hex colors |
| `weapon` | string | display weapon string, e.g. 'sword+shield' |
| `personality` | string | free text |
| `stats` | `{str,agi,vit,int,wil}` | STRENGTH / AGILITY / VITALITY / INTELLIGENCE / WILLPOWER |
| `composure` | number | 20..59 for novices, 50 default |
| `skills` | `{id, name?, level, exp}[]` | see 2.5 |
| `talents` | string[] | revealed talent ids |
| `hiddenTalent` | string? | e.g. 'composure' |
| `equipment` | `{weapon, offhand, armor}` | item instance objects or `null` |
| `alive` | boolean | default true |
| `look` | object | `generateLook(hero)` output (appearance) |
| `houseIndex` | number | 1..10, assigned by `assignHouses()` (2 heroes per house) |
| `isAwakened` | boolean? | set when promoted to 7★ |
| `deathFloor` | number? | set by `killHero` |
| `deathCause` | string? | set by `killHero` |
| `lastComfortTime` | number? | `Date.now()` timestamp, set by `src/ui/DormitoryWindow.js:306` |
| `severeStressWarned` | boolean? | internal flag |
| `offenses` | number | EXISTING rule-break strike counter (0 / 1 / 2+). See section 2.6. Not in the load migration (no `?? 0` default) |
| `noviceIndex` | number? | 1..4 for novices |
| `cooperation` | string? | 'cooperative' | 'uncooperative' |

### Stat keys
`src/data/rules.js`: `export const STAT_KEYS = ['str', 'agi', 'vit', 'int', 'wil'];`
STRENGTH=`str`, AGILITY=`agi`, VITALITY=`vit`, INTELLIGENCE=`int`, WILLPOWER=`wil`.
There is no HP stat on the hero; max HP is derived (see 2.4).

### Does a MENTALITY stat exist? — **PARTIALLY. It must be added.**
- There is **NO** `mental` key in `hero.stats` and **NO** `Mentality` stat.
- What DOES exist:
  - `hero.composure` (number, roughly 0..100, not standardised: novices 20..59, default 50).
    Used only in `src/core/Stats.js` `getHeroThreeGroups()`.
  - `getHeroThreeGroups(hero)` in `src/core/Stats.js` returns a DERIVED **display** score (not a
    stored stat):
    ```js
    const wil = hero.stats?.wil || 5;
    const composure = hero.composure !== undefined ? hero.composure : 50;
    let mentScore = composure * 0.6 + wil * 2.5;
    const tList = (hero.talents || []).map((t) => (t || '').toLowerCase());
    if (tList.includes('composure')) mentScore += 12;
    if (tList.includes('natural_leader')) mentScore += 10;
    if (tList.includes('pain_tolerance')) mentScore += 8;
    if (hero.id === 'hero_han') mentScore += 15;
    const toGrade = (sc) => (sc >= 85 ? 'S' : sc >= 70 ? 'A' : sc >= 55 ? 'B' : sc >= 40 ? 'C' : sc >= 25 ? 'D' : 'E'));
    ```
    Returns `{ mentality: {score, grade}, skills: {score, grade}, physical: {score, grade} }`.
  - A `pain_tolerance` **TALENT** exists in `src/data/skills.js`:
    ```js
    pain_tolerance: {
      id: 'pain_tolerance', name: 'Pain Tolerance', type: 'talent', maxLevel: 1,
      description: 'Enables continuous fighting and posture retention even when critical wounds are sustained.',
      effects: { hpThresholdKeepFighting: 1 },
    },
    ```
    It is a **1-level talent**, NOT a levelled skill. It appears in `TALENT_POOL` in
    `src/data/heroes.js` and `TALENT_ROLL_POOL` in `src/core/GameState.js`.
  - `hero.traits` (string[]) exists but only ever contains `'picky'`.
- **Conclusion for the planner:** add a real `Mentality` stat (0..100, default by class and
  star) and decide how it relates to the existing `composure` field. You MUST state your
  assumption.

### How heroes are created
1. `GameState.initNewGame()` — creates Han + 4 novices via `generateNoviceHero()`, assigns
   potentials (`rollHeroPotentials`), hidden talents (`rollHiddenTalents`), `satisfaction: 50`,
   `traits: Math.random() < 0.20 ? ['picky'] : []`, `look: generateLook(hero)`.
2. `GameState.addHero(hero)` — fills defaults for any hero entering the roster (fatigue 0,
   stress 0, exp 0, level 1, satisfaction 50, traits, potentials, hiddenTalents, motivation,
   look) then `this.heroes.push(hero); this.assignHouses();` and auto-joins the party if
   `this.party.length < 5`.
3. `GachaSystem.prototype.rollSummon` (`src/gacha/GachaSystem.js`) → `generateRandomHero`.
4. `createHeroFromTemplate(templateKey)` → used by the synthesis/awakening flow.

## 2.2 DAY COUNTER, TIME SYSTEM, LAST-LOGIN TIMESTAMP

### `src/core/GameState.js`
```js
this.dayCount = 1;                     // number, game days elapsed (starts at 1)
this.dayTimer = 0.08 * 480;           // float, 0..480 "game seconds" inside the current day
this.dayPaused = false;
this.foodQuality = 'basic';           // 'basic' | 'good' | 'feast'
```
```js
get dayPhase() {
  const cycle = 480;
  const t = ((this.dayTimer % cycle) + cycle) % cycle;
  return t / cycle;
}
setDayPhase(phase) {
  const cycle = 480;
  const p = ((phase % 1) + 1) % 1;
  this.dayTimer = p * cycle;
}
tickDay(delta) {
  if (this.dayPaused) return;
  const cycle = 480;
  const prevPhase = this.dayPhase;
  this.dayTimer = (this.dayTimer || 0) + delta;
  const newPhase = this.dayPhase;
  if (prevPhase < 0.97 && newPhase >= 0.97) { this.startNewDay(); }
  if (this.dayTimer >= cycle) { this.dayTimer %= cycle; }
}
```
`startNewDay()` (verbatim, trimmed) — this is the ONLY existing per-day hook:
```js
startNewDay() {
  this.dayCount = (this.dayCount || 1) + 1;
  let costPerHero = this.foodQuality === 'feast' ? 40 : this.foodQuality === 'good' ? 15 : 0;
  const aliveCount = this.heroes.filter((h) => h.alive).length;
  let totalCost = costPerHero * aliveCount;
  if (this.gold < totalCost) { this.foodQuality = 'basic'; costPerHero = 0; totalCost = 0; ... }
  else if (totalCost > 0) { this.gold -= totalCost; }
  const targetMap = { basic: 40, good: 65, feast: 85 };
  const baseTarget = targetMap[this.foodQuality] || 40;
  for (const hero of this.heroes) {
    if (!hero.alive) continue;
    let target = baseTarget;
    if (hero.traits?.includes('picky')) target -= 20;
    const fx = getSkillEffects(hero);
    if (fx.foodTolerance) target += fx.foodTolerance;
    target = Math.min(100, Math.max(0, target));
    hero.satisfaction = target;
    if (hero.satisfaction < 35) { this.addStress(hero, 5); showHeroReport(...); }
    else if (hero.satisfaction > 85 && Math.random() < 0.10) { this.addStress(hero, -5); ... }
  }
  for (let house = 1; house <= 10; house++) {
    const roommates = this.heroes.filter((h) => h.houseIndex === house && h.alive);
    if (roommates.length === 2) { this.addIntimacy(roommates[0].id, roommates[1].id, 1); }
  }
  showSystemMessage('DAILY NECESSITIES AND FOOD HAVE BEEN REFILLED.');
  this.saveToLocalStorage();
}
```
`tickDay(delta)` is called from `src/scenes/HubScene.js:1305` → `gameState.tickDay(delta);`
The day counter is displayed by `this.hud.updateCurrency(gameState.gold, gameState.gems, gameState.freeTickets, gameState.dayCount);`
(`src/scenes/HubScene.js:784` and `:1536`).

### Is a last-login timestamp saved? — **NOT FOUND.**
- No `lastLogin`, `lastLoginTime`, `lastSeen`, or similar field exists anywhere in the save.
- `Date.now()` in the codebase is used only for id generation, forge-job timers
  (`GameState.startForge` → `job.startTime`), `hero.lastComfortTime` (DormitoryWindow comfort
  cooldown) and `job.startTime` in `src/ui/RosterWindow.js:185`.
- `hero.lastComfortTime` IS persisted (the whole hero object is serialized), so it is the only
  precedent for a per-hero wall-clock timestamp.

## 2.3 SAVE, LOAD, AND THE MIGRATION SYSTEM

### Storage
`src/core/GameState.js`:
```js
const SAVE_KEY = 'pickmeup_save_v1';
```
Single `localStorage` key. `saveToLocalStorage()` builds an explicit plain object (no `JSON.stringify`
of the whole instance) and writes it. `loadFromLocalStorage()` reads it, `JSON.parse`s it, and
assigns field by field.

### `saveToLocalStorage()` (verbatim, trimmed — this is the exact key list)
```js
saveToLocalStorage() {
  try {
    const data = {
      masterName, gold, gems, freeTickets, premiumSummons,
      heroes: this.heroes,
      party: this.party,
      currentFloor, clearedFloors, deadHeroes, dissolvedHeroes,
      trainingSlots, facilities, inventory, materials, forgeQueue, flags,
      dayCount: this.dayCount,
      dayTimer: this.dayTimer,
      foodQuality, relations, bondsAnnounced, settings,
      playerClass: this.playerClass || 'Vanguard',
      controlledHeroId: this.controlledHeroId || 'hero_han',
      manaPotions: this.manaPotions ?? 3,
      arrows: this.arrows ?? 20,
      spellMastery: this.spellMastery || {},
    };
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { console.warn('Could not save to localStorage:', e); }
}
```

### The migration system — **THERE IS NO SCHEMA VERSION NUMBER**
Migration is done in three ways:
1. **Per-field `??` defaults** in `loadFromLocalStorage()`:
   ```js
   this.dayCount = data.dayCount ?? 1;
   this.dayTimer = data.dayTimer ?? 0;
   this.foodQuality = data.foodQuality ?? 'basic';
   this.relations = { 'hero_han|hero_jenna': 25, 'hero_aaron|hero_han': 25, 'hero_aaron|hero_jenna': 25, ...(data.relations || {}) };
   ```
2. **A per-hero normalization `.map()`** in `loadFromLocalStorage()`:
   ```js
   this.heroes = (data.heroes || []).map((h) => {
     const lvl = h.level ?? 1;
     const maxExp = getXpForLevel(lvl);
     const potentials = h.potentials || rollHeroPotentials(h);
     let hiddenTalents = h.hiddenTalents;
     let talentsRevealed = h.talentsRevealed;
     if (hiddenTalents === undefined) { const ht = rollHiddenTalents(h); hiddenTalents = ht.hiddenTalents; talentsRevealed = ht.talentsRevealed; }
     return {
       ...h,
       stress: h.stress ?? 0,
       fatigue: h.fatigue ?? 0,
       satisfaction: h.satisfaction ?? 50,
       traits: h.traits || (Math.random() < 0.20 ? ['picky'] : []),
       potentials, hiddenTalents,
       talentsRevealed: talentsRevealed ?? (h.star >= 3),
       exp: Math.min(h.exp ?? 0, maxExp),
       level: lvl,
       skills: (h.skills || []).map((s) => typeof s === 'string' ? { id: s, name: s, level: 1, exp: 0 } : { ...s, exp: s.exp ?? 0 }),
       motivation: h.id === 'hero_han' ? 'diligent' : (h.motivation || rollMotivation(h.name, h.cooperation)),
       talents: h.talents || [],
       equipment: h.equipment || { weapon: null, offhand: null, armor: null },
       look: h.look || generateLook(h),
     };
   });
   this.assignHouses();
   ```
3. **One-time boolean flags in `this.flags`**:
   ```js
   this.flags = { tutorialDone: false, tutorialSeen: false, heroDiedReactionPlayed: false, ...(data.flags || {}) };
   ...
   if (!this.flags.loadoutMigrationV1) {
     const fixed = this.runLoadoutMigration();
     this.flags.loadoutMigrationV1 = true;
     if (fixed > 0) console.log(`[GameState] Loadout migration repaired ${fixed} hero(s).`);
   }
   ```
   `runLoadoutMigration()` calls `reconcileHeroLoadout(hero, this.inventory)` from
   `src/core/loadout.js` for every hero.

Other notable load-time repairs: `han.class` is never overwritten; the player's class is
restored from `playerClass`; Han gets a starter weapon/shield if missing; Jenna and Aaron get
starter gear if missing; duplicate hero names get roman numerals; the controlled hero must
exist in the roster (`this.controlledHeroId = 'hero_han'` otherwise); party entries are coerced
from `string` to `{id, formation}`.

### Death / fallen heroes — `GameState.killHero()` (verbatim)
```js
killHero(id, floor = 1, deathCause = null) {
  if (id === 'hero_han') return; // Han can never be deleted from the save
  const idx = this.heroes.findIndex((h) => h.id === id);
  if (idx !== -1) {
    const hero = this.heroes[idx];
    hero.alive = false;
    hero.deathFloor = floor;
    hero.deathCause = deathCause || hero.deathCause || 'Killed in battle';
    this.heroes.splice(idx, 1);
    this.party = this.party.filter((p) => (typeof p === 'string' ? p : p.id) !== id);
    this.deadHeroes.push(hero);
    this.saveToLocalStorage();
  }
}
```
`this.deadHeroes = []` is the fallen-hero store (persisted at `saveToLocalStorage`, restored as
`this.deadHeroes = data.deadHeroes ?? []`).

### Relationships / intimacy (the EXISTING pairwise relation store)
```js
this.relations = { 'hero_han|hero_jenna': 25, 'hero_aaron|hero_han': 25, 'hero_aaron|hero_jenna': 25 };
this.bondsAnnounced = {};
getRelation(idA, idB) {
  if (!idA || !idB || idA === idB) return 0;
  const key = [idA, idB].sort().join('|');
  return this.relations[key] || 0;
}
addIntimacy(idA, idB, amount) {
  if (!idA || !idB || idA === idB || amount === 0) return 0;
  const key = [idA, idB].sort().join('|');
  const prev = this.relations[key] || 0;
  const next = Math.min(100, Math.max(0, prev + amount));
  this.relations[key] = next;
  if (next >= 25 && !this.bondsAnnounced[key]) { this.bondsAnnounced[key] = true; ... }
  this.saveToLocalStorage();
  return next;
}
```
Key format: **sorted ids joined with `|`**. Range 0..100. Consumed by
`getCombatStats(hero, party, relations)` in `src/core/Stats.js` (+3%/+6%/+10% bond bonus,
capped at +20%).

### Inventory (for dropping a dead hero's gear)
`src/core/Inventory.js`: `export const MAX_INVENTORY_CAPACITY = 40;`
`src/core/GameState.js`:
```js
addItemToInventory(item) {
  if (!this.inventory) this.inventory = [];
  if (this.inventory.length >= MAX_INVENTORY_CAPACITY) { return false; }
  this.inventory.push(item);
  this.saveToLocalStorage();
  return true;
}
removeItemFromInventory(itemId) { ... returns the removed item or null ... }
```
Item instance shape — `createItemInstance(templateId, overrides = {})` in `src/data/items.js`
(verbatim return):
```js
return {
  id: uniqueId,            // `item_<ts>_<n>_<r>`
  templateId: tpl.templateId,
  name: overrides.name ?? tpl.name,
  slot: tpl.slot,          // 'weapon' | 'offhand' | 'armor'
  weaponType: tpl.weaponType,   // 'sword' | 'shield' | 'bow' | 'staff' | 'mace' | ...
  grade,                   // 'E'|'D'|'C'|'B'|'A'|'S'|'S+'
  tier,
  damageMult: overrides.damageMult ?? tpl.damageMult,
  blockMult: overrides.blockMult ?? tpl.blockMult,
  defense: overrides.defense ?? tpl.defense,
  maxDurability, durability,
  enhance: overrides.enhance ?? 0,
  source: overrides.source ?? 'forge',
  quality: overrides.quality ?? 'Standard',
};
```

## 2.4 COMBAT: DAMAGE, HEALING, DEATH, HIT ZONES, WEAPON APPLICATION

### Damage resolution — `src/combat/DamageResolver.js`
```js
export class DamageResolver {
  static resolve(defender, hitPayload) { ... }
  static resolveHeal(target, amount, source = null) {
    if (!target || target.isDead) return 0;
    return target.receiveHeal(amount, source);
  }
}
Combatant.damageResolver = DamageResolver;
```
Hit payload shape actually read by the resolver:
`{ attacker, attackerPosition, attackerName, target, rawDamage, damage, poiseDamage, weaponMult,
weaponGrade, attackMoveMult, knockbackSpeed, statusEffect, spellId, attackKind, hitPos, hitNormal }`
(Note: `hitPos` and `hitNormal` are present on the payload but are **not used** for zone logic.)

Resolution order in `resolve()`:
1. Dodge i-frames (`defender.iFrameTimer > 0`); perfect dodge if `defender.stateMachine.stateTime <= 0.13`.
2. 120-degree frontal defense cone: `isFrontal = _defenderForward.dot(_toAttacker) >= 0.5`.
3. Parry: frontal + `defender.parryWindowTimer > 0` → 0 damage, slow-mo, attacker forced to STAGGER.
4. Block: frontal + `defender.stateMachine.state === 'BLOCK'` → 20% chip damage, stamina cost
   `Math.max(15, Math.min(35, Math.round(rawPoise * blockEff)))`, guard break if stamina hits 0.
5. Unblocked hit.

Unblocked damage formula (verbatim):
```js
const weaponMult = hitPayload.weaponMult || 1.0;
const gradeMult = GRADE_MULTS[hitPayload.weaponGrade || 'D'] || 1.0;
const moveMult = hitPayload.attackMoveMult || 1.0;
const counterMult = attacker && attacker.counterWindowTimer > 0 ? 1.40 : 1.00;
const baseDmg = hitPayload.rawDamage ?? hitPayload.damage ?? 15;
const rawDmg = baseDmg * weaponMult * gradeMult * moveMult * counterMult;
const defReduction = Math.max(0.0, Math.min(0.75, defender.defense || 0.10));
let finalDamage = Math.max(1, Math.round(rawDmg * (1 - defReduction)));
// ward_barrier absorbs, then:
defender.hp = Math.max(0, defender.hp - finalDamage);
```
Afterwards: status effect applied, poise damage, hit-stop, knockback
(`defender.knockbackVelocity.copy(_toAttacker).multiplyScalar(knockbackForce)`), stagger/poise-break,
`combatEvents.emit('onHit', {...})`, and `if (defender.hp <= 0) { defender.die(); }`.

### Healing — `src/combat/Combatant.js`
```js
receiveHeal(amount, source = null) {
  if (this.isDead) return 0;
  const oldHp = this.hp;
  this.hp = Math.min(this.maxHp, this.hp + amount);
  const healed = Math.round(this.hp - oldHp);
  if (healed > 0) {
    this.damageFlashTimer = 0.15;
    if (this.rig && this.rig.setTint) { this.rig.setTint(0x22c55e, 0.6); }
    combatEvents.emit('onHeal', { targetName: this.name, amount: healed, currentHp: Math.round(this.hp), maxHp: this.maxHp, sourceName: source?.name || 'Healing' });
  }
  return healed;
}
```
Also `applyWard(barrierHp = 60, duration = 6.0)` and `applyStatusEffect(type, conf = {})`.

### Death — `src/combat/Combatant.js`
```js
die() {
  if (this.isDead) return;
  this.isDead = true;
  this.deathTimer = 0;
  this.stateMachine.transitionTo('DEAD');
  combatEvents.emit('onDeath', { name: this.name, team: this.team, id: this.id });
}
```
Combatant health fields (constructor, verbatim):
```js
this.maxHp = config.maxHp ?? 100;
this.hp = config.hp ?? this.maxHp;
this.isDead = false;
this.deathTimer = 0.0;
```

### HIT ZONES — **NOT FOUND in the new combat engine.**
- `src/combat/CombatData.js` has `ARCHERY_CONFIG`:
  ```js
  export const ARCHERY_CONFIG = Object.freeze({
    HEADSHOT_DAMAGE_MULT: 3.0,
    HEADSHOT_POISE_DAMAGE: 65,
    BODY_POISE_DAMAGE: 25,
    HEADSHOT_HEIGHT_THRESHOLD: 0.74,
  });
  ```
  It is used ONLY by the **legacy** arrow path `src/combat/ArrowPool.js` (lines 312-336):
  ```js
  const isHeadshot = relY >= eHeight * ARCHERY_CONFIG.HEADSHOT_HEIGHT_THRESHOLD;
  const finalDamage = isHeadshot ? a.damage * ARCHERY_CONFIG.HEADSHOT_DAMAGE_MULT : a.damage;
  ...
  poiseDamage: isHeadshot ? ARCHERY_CONFIG.HEADSHOT_POISE_DAMAGE : ARCHERY_CONFIG.BODY_POISE_DAMAGE,
  ...
  target.takeDamage(finalDamage, isHeadshot, hitPoint);
  ```
  That path calls the legacy `takeDamage(dmg, isHeadshot, hitPoint)` API, **not** `DamageResolver`.
- The new engine (`Combatant` + `DamageResolver` + `HitPipeline` + `StateMachine`) has **no**
  head / torso / heart / limb concept. `DamageResolver.resolve` receives `hitPos` but never
  uses it to pick a zone.
- `src/player/Player.js` (legacy) has an `onHeadshot` callback and a
  `'[CRITICAL HEADSHOT! 2.0x]'` message.
- **There is NO 'heart' zone anywhere in the codebase. NOT FOUND.**
- **There are NO 'torso' or 'limb' zones either. NOT FOUND.**

### How sword / shield / bow / staff apply damage
- **Melee (sword, greatsword, spear, dagger, mace, staff melee):**
  `src/combat/HitPipeline.js` registers swept capsules/cylinders in a `SpatialHashGrid` and
  reports a `hitPayload` to `DamageResolver.resolve`.
  `src/combat/CombatData.js`:
  ```js
  export const MELEE_HIT_SECTORS = Object.freeze({
    dagger:     { radius: 1.7, angleDeg: 200, step: 0.35 },
    sword:      { radius: 2.0, angleDeg: 150, step: 0.30 },
    greatsword: { radius: 2.6, angleDeg: 190, step: 0.20 },
    spear:      { radius: 3.0, angleDeg:  50, step: 0.20 },
    mace:       { radius: 1.9, angleDeg: 130, step: 0.20 },
    club:       { radius: 1.9, angleDeg: 150, step: 0.20 },
    pickaxe:    { radius: 1.8, angleDeg:  90, step: 0.20 },
    staff:      { radius: 2.2, angleDeg: 120, step: 0.20 },
  });
  ```
  `src/combat/CombatData.js` `ATTACK_FRAME_DATA` gives per-move `{duration, hitWindow:[s,e],
  hitStop, moveMult, poiseDamage, cameraShake}` for `sword.attack1..3`, `sword.heavy1`,
  `greatsword.attack1`, `spear.attack1`, `dagger.attack1`, `staff.attack1`.
  `getMoveFrameData(weaponKind, moveName)` falls back to `sword.attack1`.
  `GRADE_MULTS = { E:0.8, D:1.0, C:1.2, B:1.45, A:1.75, S:2.1, 'S+':2.6 }`.
- **Shield:** blocks via the BLOCK state in `DamageResolver` (20% chip + stamina cost); shield
  stats come from `ITEM_TEMPLATES` (`blockMult`, `defense`) and `basic_shield_technique`
  (`blockStaminaMult: -0.03`, `blockWindow: 0.01` per level).
- **Bow:** `src/combat/ArrowPool.js` (pooled arrows, ballistic flight, stick-in-ground).
  `src/combat/ArrowPool.js` exports `GRADE_ARROW_STATS` and `ArrowPool`.
- **Staff / magic:** `src/combat/SpellSystem.js` `castSpell` (mana cost, cooldown, cast bar),
  spell catalog in `src/combat/CombatData.js` `SPELLS_TABLE` and `src/combat/spells.config.js`
  (`FIRE_SPELLS`, `MANA_CONFIG`, `calculateMaxMana`, `COMBO_CONFIG`, `OVERHEAT_CONFIG`,
  `MASTERY_CONFIG`).
- **Weapon source of truth:** `src/core/loadout.js` `getHeroLoadout(hero)` returns
  `{weaponType, offhandType, poseSet, attackMode, hudMode, ...}`. Every model/HUD/control reads
  it. `CLASS_PROFILES` (mage/healer/archer/knight/vanguard/tank/berserker/valkyrie/artisan)
  lists `allowedWeapons`, `defaultWeaponType`, `defaultWeapon`, `defaultOffhandType`,
  `defaultOffhand`.

### Derived hero combat stats — `src/core/Stats.js` `getCombatStats(hero, party, relations)`
```js
let maxHp = 50 + vit * 8 + level * 5;
let maxStamina = 60 + vit * 3 + wil * 2;
let damage = 6 + str * 1.2 + level;
let defense = vit * 0.5 + str * 0.2;
let moveSpeed = 5 + agi * 0.08;
let critChance = 0.05 + agi * 0.005;
// Star scaling: +5% per star rank above 1
const starMult = 1 + (star - 1) * 0.05;
maxHp *= starMult;
damage *= starMult;
```
then equipment (`damageMult`, `enhance`, `blockMult`, `defense`), skill effects, the bond bonus
(+3% at rel>=25, +6% at >=60, +10% at >=90, cap +20%), Transcendence x1.1, and an exhaustion
penalty x0.8 when `hero.fatigue > 80`.
**Current star multiplier: `1 + (star-1)*0.05` → 1.00 at 1★, 1.30 at 7★.**
`getDisplayStats(hero)` returns `{str:{current,base}, agi:{...}, vit:{...}, int:{...}, wil:{...}}`.

## 2.5 EXISTING SKILL, XP, AND LEVEL SYSTEMS

### Skills — `src/data/skills.js`
```js
export const SKILLS = { /* 25 entries */ };
export function getSkill(id)                 // normalizes id: lowercase + spaces -> underscores
export function getSkillEffects(hero)        // sums effects over skills*level + talents*1
export function addSkillExp(hero, skillId, expAmount)
export function rollStatFromSkill(skillId)   // -> 'str'|'agi'|'vit'|'int'|'wil'
```
Skill definition shape:
```js
basic_swordsmanship: {
  id: 'basic_swordsmanship',
  name: 'Basic Swordsmanship',
  type: 'skill',            // 'skill' | 'talent'
  maxLevel: 10,
  description: 'Fundamental sword technique increasing melee damage output.',
  effects: { damageMult: 0.04 },
},
```
Existing skill ids: `basic_swordsmanship`, `basic_shield_technique`, `basic_spearmanship`,
`basic_dagger_technique`, `basic_archery`, `stealth`, `composure`(talent), `keen_sight`(talent),
`leadership`, `berserk`, `heavy_armor_mastery`, `fireball`, `mana_amplification`,
`pain_tolerance`(talent), `evasion`, `smithing`, `transcendence`(talent), `combat_logic`,
`intermediate_swordsmanship`, `knights_determination`, `superhuman_strength`(talent),
`quick_learner`(talent), `natural_leader`(talent), `iron_stomach`(talent).
**`quiver_handling` — NOT FOUND. `mana_control` — NOT FOUND (closest is `mana_amplification`).**
**There is NO skill-combining / recipe table anywhere. NOT FOUND.**

`addSkillExp` core (verbatim):
```js
export function addSkillExp(hero, skillId, expAmount) {
  if (!hero || !skillId || expAmount <= 0) return;
  const fx = getSkillEffects(hero);
  const effectiveExp = fx.skillXpMult ? Math.round(expAmount * fx.skillXpMult) : expAmount;
  const sKey = skillId.toLowerCase().replace(/\s+/g, '_');
  let skill = (hero.skills || []).find((s) => (s.id || s.name || '').toLowerCase().replace(/\s+/g, '_') === sKey);
  const def = getSkill(sKey);
  if (!skill) {
    if (!def) return;
    hero.skills = hero.skills || [];
    skill = { id: def.id, name: def.name, level: 1, exp: 0 };
    hero.skills.push(skill);
  }
  const skillName = def ? def.name : (skill.name || skill.id);
  skill.exp = (skill.exp || 0) + effectiveExp;
  const maxLevel = def ? def.maxLevel || 10 : 10;
  let neededXp = 100 * skill.level;
  while (skill.exp >= neededXp && skill.level < maxLevel) {
    skill.exp -= neededXp;
    skill.level += 1;
    showSystemMessage(`SKILL ${skillName.toUpperCase()} HAS REACHED LEVEL ${skill.level}.`);
    neededXp = 100 * skill.level;
  }
}
```
**Skill object on a hero: `{ id, name, level, exp }`. Level threshold = `100 * level`. Max level 10.**

### XP / level — `src/data/rules.js` (entire file is 64 lines; key exports)
```js
export const LEVEL_CAP_PER_STAR = 10;
export const MAX_STAR = 7;
export const NATURAL_MAX_STAR = 6;
export const PARTY_SIZE = 5;
export const STAT_KEYS = ['str', 'agi', 'vit', 'int', 'wil'];
export function getXpForLevel(level) { return Math.round(10 * Math.pow(level, 1.5)); }
export function getPromotionCost(star) { return 50 * Math.pow(star, 2); }
export function getSynthesisXp(star, level = 1) { return 15 * star * level; }
export function getSkillInheritChance(materialStar) { return Math.min(0.6, 0.1 * materialStar); }
export function getSkillXpNeeded(skillLevel) { return 100 * skillLevel; }
export const TRAINING_TICK_SECONDS = 5;
export const TRAINING_SKILL_XP_PER_TICK = 8;
export const RARITY_COLORS = { 1:0x9a9a9a, 2:0xcd7f32, 3:0x3a7bff, 4:0xa84bff, 5:0xffc83a, 6:0xdc143c, 7:0xffffff };
export const RARITY_HEX_STRINGS = { 1:'#9a9a9a', 2:'#cd7f32', 3:'#3a7bff', 4:'#a84bff', 5:'#ffc83a', 6:'#dc143c', 7:'#ffffff' };
export function getRarityColor(star)
export function getRarityHexString(star)
```
`GameState.addExp(heroId, amount)` (verbatim core):
```js
const maxLevel = hero.star * LEVEL_CAP_PER_STAR;
if (hero.level >= maxLevel) { hero.exp = 0; this.saveToLocalStorage(); return; }
let remainingXp = amount;
while (remainingXp > 0 && hero.level < maxLevel) {
  const neededForNext = getXpForLevel(hero.level);
  const toLevelUp = neededForNext - hero.exp;
  if (remainingXp >= toLevelUp) {
    remainingXp -= toLevelUp;
    hero.level += 1;
    hero.exp = 0;
    // Stat growth: +1 to two random stats, weighted toward class, scaled by potential
    const pool = getWeightedStatsForClass(hero.class);
    const stat1 = pool[Math.floor(Math.random() * pool.length)];
    const stat2 = pool[Math.floor(Math.random() * pool.length)];
    const pot1 = (hero.potentials && hero.potentials[stat1]) || 1.0;
    const pot2 = (hero.potentials && hero.potentials[stat2]) || 1.0;
    const gain1 = Math.floor(pot1) + (Math.random() < (pot1 % 1) ? 1 : 0);
    const gain2 = Math.floor(pot2) + (Math.random() < (pot2 % 1) ? 1 : 0);
    hero.stats[stat1] = (hero.stats[stat1] || 0) + gain1;
    hero.stats[stat2] = (hero.stats[stat2] || 0) + gain2;
    this.checkTalentReveal(hero);
    showSystemMessage(`[${hero.name} reached level ${hero.level}!]`);
  } else { hero.exp += remainingXp; remainingXp = 0; }
}
```
`getWeightedStatsForClass(heroClass)` pools:
tank/vanguard → `['str','str','vit','vit','vit','wil','agi']`;
scout/ranger/archer/rogue → `['agi','agi','agi','str','wil','vit']`;
mage/wizard → `['int','int','int','wil','wil','vit']`;
cleric/priest/healer → `['wil','wil','int','int','vit','str']`;
default → `['str','agi','vit','int','wil']`.

**Level stat growth is only +1 or +2 per level (two random stats). A 1★ hero cannot out-grow a
3★ hero through levels alone at the current star multiplier (1.00 vs 1.10).** This is the
problem the training system must solve.

### Existing training XP (two parallel systems — both must be reconciled by your plan)
`src/hub/TrainingManager.js`:
- `this.trainingSlots` on GameState = `[null, null, null]` — 3 slots of
  `{ heroId, skillId, tickTimer, animTimer }`.
- `TrainingHeroAvatar.onTick()` every 5 s:
  ```js
  const facLevel = (gameState.facilities.training && gameState.facilities.training.level) || 1;
  const xpGain = Math.round(8 * (1 + facLevel * 0.25));
  this.heroData.fatigue = Math.min(100, (this.heroData.fatigue || 0) + 3);
  // skill.exp += xpGain; level-up when skill.exp >= 100 * skill.level; max level 10
  // collapse when heroData.fatigue >= 100  → gameState.trainingSlots[this.slotIndex] = null
  ```
- The NPC autonomous path in `src/hub/HubHeroes.js` awards
  `Math.round(24 * (1 + (tgLevel - 1) * 0.10) * (isDiligent ? 1.5 : 1.0))` every 5 s via
  `addSkillExp`, `fatigue += 3`, and a 35% chance every 45 s of a core-stat gain via
  `rollStatFromSkill`. It stops when `fatigue >= 70 || stress > 70 || trainingDuration >= 120`.

## 2.6 HOW HEROES MOVE IN TOWN, AND HOW THE 4 NON-CONTROLLED SQUAD HEROES ARE UPDATED

### Navigation — `src/hub/NavGrid.js`
There is **no waypoint graph**. It is a uniform 2D occupancy grid + A*.
```js
const GRID_MIN = -52;
const GRID_MAX = 52;
const CELL_SIZE = 1.0;
const GRID_SIZE = Math.round((GRID_MAX - GRID_MIN) / CELL_SIZE) + 1; // 105
export class NavGrid {
  constructor(getGroundY = null) { this.grid = new Uint8Array(GRID_SIZE * GRID_SIZE); this.buildGrid(); }
  buildGrid()
  rebuildFromTown(colliders = [], doorCorridors = [], zones = {})
  clearCorridorSegment(p1, p2, width = 2.6)
  blockBox(minX, maxX, minZ, maxZ) / clearBox(...) / blockCircle(...) / clearCircle(...)
  isWalkable(worldX, worldZ)
  isAllowedWanderZone(worldX, worldZ)
  findNearestWalkableCell(worldX, worldZ, maxRadius = 15)
  findRandomReachableCell(fromX, fromZ, minRadius = 4, maxRadius = 18)
  findPath(startX, startZ, endX, endZ)      // A*, 8 directions, returns THREE.Vector3[]
  reconstructPath(cameFrom, currentKey, finalWorldX, finalWorldZ)
  smoothPath(waypoints)
  hasLineOfSight(p1, p2)
  getDoorCorridor(type)                   // named waypoint lists
  toggleDebugMesh(scene, colliders = null)
}
```
Grid storage: `this.grid = new Uint8Array(GRID_SIZE * GRID_SIZE)` (0 = walkable, 1 = blocked).
A* internals use `Set`/`Map` with string keys `"gx,gz"`, 8 directions with diagonal cost 1.414,
and corner-cutting prevention, then `reconstructPath` → `smoothPath` → `hasLineOfSight`.
`getDoorCorridor(type)` supports: `'summon'`, `'dormitory'`/`'residences'`, `'synthesis'`,
`'blacksmith'`/`'armory'`, `'training'`, `'rift'`/`'tower_gate'`. Only `'residences'` is used today.
Example (`'training'`): `(-20,16) → (-23,16.8) → (-24,17.5)`.

### Hero NPC — `src/hub/HubHeroes.js`
```js
export class HubHeroNPC {
  static stuckCount = 0;
  constructor(heroData, scene, onRuleBreak = null, getGroundY = null, navGrid = null, isNewSummon = false)
  buildModel() / startArrivalBehavior() / pickWallTarget()
  showSpeechBubble(text, duration = 3.5) / showAngryBubble(duration = 2.0)
  setDestination(x, z, onArrival = null)
  pickNewTarget() / goToDormitory() / emergeFromDormitory() / goToCottage(cottagePos) / wakeUpFromCottage()
  chooseTrainingSkill() / startAutonomousTraining(slotIdx) / stopTrainingAndRest()
  makeAutonomousDecision(hanPos = null)
  triggerStressSuicide()
  updateRigPose(delta, state, camera = null, hanPos = null)
  update(delta, getGroundY = null, hanPos = null, camera = null)
  destroy()
}
export class HubHeroesManager {
  constructor(scene, iselle = null, navGrid = null)
  get spawnedHeroes()
  setIselle(iselle) / setNavGrid(navGrid)
  spawnHeroes(heroesList, getGroundY = null, navGrid = null)
  spawnNewSummonHero(heroData, getGroundY = null)
  handleRuleBreak(npc)
  triggerPunishmentOnNpc(npc, onComplete = null)
  executeHero(npc, onComplete = null)
  restAll()
  getLabelSprites()
  update(delta, getGroundY = null, hanPos = null, isNight = false, hubBuildings = null, camera = null)
  clear()
}
```
NPC state fields (constructor, verbatim block):
```js
// AI & Navigation state
this.targetPos = this.mesh.position.clone();
this.currentPath = [];
this.waypointIndex = 0;
this.corridorQueue = null;
this.corridorIndex = 0;
this.onArrival = null;
this.onCorridorFinish = null;

this.state = 'idle'; // 'idle' | 'walk' | 'walk_corridor' | 'training' | 'inside_dorm' | 'search_wall'
this.timer = 2 + Math.random() * 3;
this.speed = 2.2;
this.animTime = 0;
this.isResting = false;
this.isDyingFromStress = false;
this.stressCollapseTimer = 0;
this.idleFatigueTimer = 0;
this.searchWallTimer = 0;

// Autonomous training parameters
this.decisionTimer = 5 + Math.random() * 15;
this.trainingSlot = null;
this.trainingSkill = null;
this.trainingDuration = 0;
this.trainingExpTimer = 0;
this.trainingStatTimer = 0;
```
Actual state values used in code: `'idle'`, `'walk'`, `'walk_dorm'`, `'walk_cottage'`,
`'sleeping_cottage'`, `'walk_corridor'`, `'training'`, `'inside_dorm'`, `'search_wall'`.
**There is NO `activity` field. There is NO 'spar', 'eat', or 'rest' state.**

Movement (straight-line steering along the smoothed A* path; verbatim):
```js
if (this.currentPath.length > 0 && this.waypointIndex < this.currentPath.length) {
  const wp = this.currentPath[this.waypointIndex];
  const dx = wp.x - this.mesh.position.x;
  const dz = wp.z - this.mesh.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist > 0.35) {
    const dirX = dx / dist;
    const dirZ = dz / dist;
    this.mesh.position.x += dirX * this.speed * delta;
    this.mesh.position.z += dirZ * this.speed * delta;
    this.mesh.rotation.y = Math.atan2(dirX, dirZ);
    this.updateRigPose(delta, {
      moving: true, speed: this.speed, sprinting: this.speed >= 3.0,
      action: 'none', mood: curStress >= 80 ? 'afraid' : 'neutral',
    }, camera, hanPos);
  }
}
```
`setDestination` (verbatim):
```js
setDestination(x, z, onArrival = null) {
  this.onArrival = onArrival;
  this.targetPos.set(x, this.getGroundY ? this.getGroundY(x, z) : 0, z);
  if (this.navGrid) {
    this.currentPath = this.navGrid.findPath(this.mesh.position.x, this.mesh.position.z, x, z);
    this.waypointIndex = 0;
  } else {
    this.currentPath = [new THREE.Vector3(x, this.getGroundY ? this.getGroundY(x, z) : 0, z)];
    this.waypointIndex = 0;
  }
  this.state = 'walk';
  this.timer = 20;
}
```
Animation action is derived inline from the skill id: `trainSword` / `trainSpear` / `trainBow` /
`trainDagger` / `trainMagic`; idle sets `action='panic'` when punished and `action='talk'` when a
speech bubble is visible.

### The 4 non-controlled squad heroes, per frame
- The party is 5 entries; `gameState.controlledHeroId = 'hero_han'`.
- `HubHeroesManager.spawnHeroes` skips Han: `if (h.alive && h.id !== 'hero_han') { ... }`.
- `HubScene.update` → `src/scenes/HubScene.js:1515`:
  ```js
  this.iselle.update(delta, time, this.player.mesh.position, this.getWalkY, this.camera);
  this.heroesManager.update(delta, this.getWalkY, this.player.mesh.position, isNight, this, this.camera);
  this.trainingManager.update(delta, this.getWalkY);
  ```
- Inside `HubHeroesManager.update` → `src/hub/HubHeroes.js:1113`:
  ```js
  for (const npc of this.npcs) {
    npc.update(delta, getGroundY, hanPos, camera);
  }
  ```
  Before that loop the manager also does: Han fatigue recovery (-2/s), pairwise push avoidance
  between NPCs closer than 0.9 units, co-training intimacy accumulation (+3 every 30 s when two
  NPCs train within 6 units), and the night cottage sleep/wake cycle.

### Existing autonomous decision (the code your new daily decision must replace or wrap)
```js
makeAutonomousDecision(hanPos = null) {
  if (this.state === 'inside_dorm' || this.isBeingPunished || this.isDyingFromStress || this.isSmithingActive) return;
  // Fatigue > 70: must rest
  if ((this.heroData.fatigue || 0) > 70) { this.goToDormitory(); return; }
  // Base train chance by motivation
  const mot = this.heroData.motivation || 'normal';
  let trainChance = mot === 'diligent' ? 0.60 : mot === 'lazy' ? 0.08 : 0.30;
  // -30% when stress > 60
  if ((this.heroData.stress || 0) > 60) { trainChance -= 0.30; }
  // +20% if Training Ground built and Han is training or nearby
  // +10% per Training Ground facility level
  if (tgBuilt && Math.random() < trainChance) {
    gameState.trainingSlots = gameState.trainingSlots || [null, null, null];
    const freeDummyIdx = [0, 1, 2].find((i) => !gameState.trainingSlots[i]);
    if (freeDummyIdx !== undefined) { this.startAutonomousTraining(freeDummyIdx); return; }
  }
  if (((this.heroData.fatigue || 0) > 40 || (this.heroData.stress || 0) > 40) && Math.random() < 0.4) {
    this.goToDormitory(); return;
  }
  this.pickNewTarget();
}
```

### Existing town hero-to-hero interactions
- Speech bubbles: `createSpeechBubbleSprite(text, isAngry = false)` exported from
  `src/hub/HubHeroes.js`; `HubHeroNPC.showSpeechBubble(text, duration = 3.5)` and
  `showAngryBubble(duration = 2.0)`.
- Rule break: `HubHeroesManager.handleRuleBreak(npc)` → actions `['attack','wander','refuse']`.
- Punishment: `HubHeroesManager.executeHero(npc, onComplete)` → `new PunishmentEffect(this.scene)`
  → `gameState.killHero(...)`.

### EXISTING RULE-BREAK / OFFENCE COUNTER — REUSE THIS FOR THE THREE LOBBY LAWS
`src/hub/HubHeroes.js:970-1024` (verbatim):
```js
handleRuleBreak(npc) {
  if (npc.isBeingPunished) return;
  npc.showAngryBubble(2.5);
  // Disruptive actions: attack another hero, wander outside, refuse
  const actions = ['attack', 'wander', 'refuse'];
  const act = actions[Math.floor(Math.random() * actions.length)];
  if (act === 'attack') {
    const other = this.npcs.find((n) => n !== npc && !n.isBeingPunished);
    if (other) { npc.targetPos.copy(other.mesh.position); npc.state = 'walk'; npc.speed = 3.5; npc.timer = 5; }
  } else if (act === 'wander') {
    const angle = Math.random() * Math.PI * 2;
    npc.targetPos.set(Math.cos(angle) * 35, 0, Math.sin(angle) * 35);
    npc.state = 'walk'; npc.speed = 2.8; npc.timer = 8;
  } else { npc.state = 'idle'; npc.timer = 10; }

  if (!gameState.flags?.tutorialDone) { return; }   // In tutorial: execution is scripted

  // Post-tutorial: 1st offense = warning, 2nd offense = execution
  if (!npc.heroData.offenses || npc.heroData.offenses === 0) {
    npc.heroData.offenses = 1;
    gameState.saveToLocalStorage();
    showSystemMessage(`[WARNING: ${npc.heroData.name} broke the rules! Further violations will be punished by execution.]`);
  } else {
    this.executeHero(npc);
  }
}
```
And the tutorial-only warning variant (does NOT increment the counter):
```js
triggerPunishmentOnNpc(npc, onComplete = null) {
  if (npc && !npc.isBeingPunished) {
    npc.showAngryBubble(2.5);
    showSystemMessage(`[WARNING: ${npc.heroData.name} broke the rules! Further violations will be punished by execution.]`);
  }
  // The callback always runs so a scripted tutorial step can never stall.
  if (onComplete) onComplete();
}
```
**`hero.offenses` (number, 0/1/2+) is an EXISTING per-hero field** — it is not in the canonical
hero field table above, is not persisted explicitly (it rides along inside the serialized hero
object), and has no `?? 0` default in the load migration. Reuse it as the lobby-law strike
counter, or state your assumption that the new laws use a separate counter.
- Intimacy: `gameState.addIntimacy(...)` (see 2.3) and `gameState.relations`.
- **There is NO sparring mechanic in town and NO hero-vs-hero combat in town. NOT FOUND.**

## 2.7 THE TOWN SCENE — WHERE A TRAINING PLACE, CAFETERIA AND DORMITORY GO

### `src/art/town/layout.js` — `export const LAYOUT = { ... }` (417 lines)
Top-level keys: `wall`, `terrain`, `zones` (10 zones), `cottages` (10), `roads` (9),
`lampPosts` (4), `trees` (18), `minimap`.
Zone shape:
```js
{
  id: string,
  name: string,
  aliases?: string[],
  center: { x: number, z: number },
  footprint: { type: 'circle', radius, height?, wallRadius?, terraceRadius? }
            | { type: 'box', width, height, depth, mainWidth?, mainDepth?, forgeWidth?, forgeDepth? },
  rotation: number,
  door: null | { id: string, position: {x,y,z}, outward: {x,y,z} },
  doorCorridor: null | { x: number, z: number }[],
  interactionRadius: number,
  signText: string,
  signOffset: { x, y, z },
  dummyPositions?: { id, stand:{x,y,z}, dummy:{x,y,z} }[],
}
```

EXACT zone coordinates:
| id | center (x,z) | footprint | door (x,y,z) | outward | interactionRadius | sign |
|---|---|---|---|---|---|---|
| `landing_area` | (20, 26) | circle r8.0, terrace r14.0 | (20,0,16) | (0,0,-1) | 8.0 | y 6.0 |
| `summoning_room` | (30, 4) | circle r10.0 h11.0 wallR10.2 | (23.5,1.8,11.5) | (-0.4138,0,0.9104) | 8.5 | y 13.0 |
| `town_square` | (14, -8) | circle r11.0 | null | – | 8.0 | y 4.0 |
| `space_time_rift` | (32.53,-32.53) | box 6.5×10.0×2.5 | (31.11,0,-31.11) | (-0.7071,0,0.7071) | 4.5 | y 12.0 |
| `synthesis_chamber` | (0, -32) | circle r8.2 h9.0 | (0,0,-23.8) | (0,0,1) | 7.5 | y 15.0 |
| `armory` | (-6, -20) | box 10.5×4.5×5.0 | (-6,0,-17.4) | (0,0,1) | 4.5 | y 5.6 |
| **`training_grounds`** | **(-24, 20)** | **box 16.0×16.0 h2.5** | **(-18,0,18)** | **(1,0,0)** | **8.5** | **y 4.0** |
| **`residences`** (alias 'Dormitory') | **(-26, -4)** | **circle r15.0** | **(-18,0,-4)** | **(1,0,0)** | **12.0** | **offset (8,4.2,0)** |
| **`mess_hall_row`** (cafeteria) | **(8, 38)** | **box 22.8×4.4 h4.4** | **(8,0,35.8)** | **(0,0,-1)** | **9.0** | **y 5.2, text 'MESS HALL (LOCKED)'** |
| `dungeon_board` | (6, -2) | box 2.3×3.0×0.8 | null | – | 2.8 | y 3.4 |

`training_grounds` zone verbatim:
```js
training_grounds: {
  id: 'training_grounds',
  name: 'Training Grounds',
  center: { x: -24.0, z: 20.0 },
  footprint: { type: 'box', width: 16.0, depth: 16.0, height: 2.5 },
  rotation: 0,
  door: { id: 'door_training_grounds', position: { x: -18.0, y: 0.0, z: 18.0 }, outward: { x: 1.0, y: 0.0, z: 0.0 } },
  doorCorridor: [ { x: -24.0, z: 20.0 }, { x: -18.0, z: 18.0 }, { x: -15.0, z: 18.0 } ],
  interactionRadius: 8.5,
  signText: 'TRAINING GROUNDS',
  signOffset: { x: 0, y: 4.0, z: 0 },
  dummyPositions: [
    { id: 'dummy_1', stand: { x: -26.4, y: 0, z: 16.8 }, dummy: { x: -26.4, y: 0, z: 18.0 } },
    { id: 'dummy_2', stand: { x: -24.0, y: 0, z: 16.8 }, dummy: { x: -24.0, y: 0, z: 18.0 } },
    { id: 'dummy_3', stand: { x: -21.6, y: 0, z: 16.8 }, dummy: { x: -21.6, y: 0, z: 18.0 } }
  ]
},
```
**Training place status:** the yard ALREADY EXISTS as `training_grounds` at (-24, 20), 16×16 m,
built by `src/art/town/landmarksWork.js` section 3 (lines 744-908) with **12 training dummies**
(3 from `dummyPositions` + 9 extra at z = 21, 24, and x = -28.8) and anchors
`dummy_0..dummy_11` (hit point at y+1.25) plus `dummy_1_layout`, `dummy_2_layout`,
`dummy_3_layout` for i<3.
**There is NO archery target, NO fire target, and NO sparring ring anywhere. NOT FOUND.**
`src/hub/TrainingManager.js` uses `this.anchors['dummy_' + i] || this.anchors['dummy_' + i + '_layout']`.

**Cafeteria status:** `mess_hall_row` exists at (8, 38) — a row of 6 connected houses — but it is
**LOCKED**: `signText: 'MESS HALL (LOCKED)'`, and `src/scenes/HubScene.js` shows
`'[The Mess Hall is locked. Clear Floor 10 to unlock.]'`. `gameState.facilities.cafeteria` exists
with `{ level: 1, unlocked: false, unlockedByFloor: 10 }`.

**Dormitory status:** `residences` exists at (-26, -4) r15, alias 'Dormitory', containing 10
cottages built by `src/art/town/village.js` (`COTTAGE_SPECS`, lines 5-16; each
`{id, row, center:{x,z}, rotation, size:{width:4.2,depth:3.6,height:5.0}, door:{...}, doorCorridor:[...]}`).
**The cottage array lives at the TOP-LEVEL key `LAYOUT.cottages` (`layout.js:266`), NOT at
`LAYOUT.residences.cottages`** — see the gotcha in section 2.11.
`gameState.facilities.dormitory` = `{ level: 1, unlocked: true }`.
`HubScene` already opens `DormitoryWindow` at the residences; `HubHeroNPC.goToDormitory()` exists.
`src/ui/DormitoryWindow.js` exists (321 lines) and sets `hero.lastComfortTime = Date.now()`.

### Building interaction pattern (the thing to replicate for new zones)
`src/scenes/HubScene.js`:
```js
getNearestBuilding(px, pz) {
  // 1. cottage doors (within 3.5m) → { id:'residences', name:`Dormitory (${c.id...})`, cottageId, x, z, isGate:false }
  // 2. for (const [id, z] of Object.entries(LAYOUT.zones)) {
  //      const doorAnchor = this.town?.anchors?.[`door_${id}`] || this.town?.anchors?.[`door_${id.replace('_row','')}`];
  //      ... if (dDist <= 4.0) return { id, name: z.name, x: doorX, z: doorZ, isGate };
  //      ... center fallback with maxRadius = id==='town_square' ? 5.5 : Math.max(3.5, (z.radius||3)*0.45+1.5);
  //    }
  return null;
}
```
`KeyE` handler chain (verbatim, trimmed):
```js
if (e.code === 'KeyE') {
  const pPos = this.player.mesh.position;
  const b = this.getNearestBuilding(pPos.x, pPos.z);
  if (b) {
    if (b.id === 'summoning_room' || ...) { this.summonWindow.open(); }
    else if (b.id === 'residences' || b.name.startsWith('Dormitory') || b.name === 'Residences') { this.dormitoryWindow.open(); }
    else if (b.id === 'training_grounds' || b.name === 'Training Grounds') { this.trainingWindow.open(); }
    else if (b.id === 'synthesis_chamber' || ...) { this.synthesisWindow.open(); }
    else if (b.id === 'armory' || ...) { if (gameState.isFacilityUnlocked('blacksmith')) { this.blacksmithWindow.open(); } else { showSystemMessage('[The Armory is locked. Clear Floor 5 to unlock.]'); } }
    else if (b.id === 'space_time_rift' || b.isGate || ...) { ... this.playRiftFlash(() => this.deployWindow.open()); }
    else if (b.id === 'dungeon_board' || ...) { this.dungeonBoardWindow.open(); }
    else if (b.id === 'mess_hall_row' || b.name === 'Mess Hall') { showSystemMessage('[The Mess Hall is locked. Clear Floor 10 to unlock.]'); }
    else if (b.id === 'landing_area') { showSystemMessage('[Landing Area: Gate to the floating city Niflheimr.]'); }
    else if (b.id === 'town_square') { showSystemMessage('[Town Square: The central plaza of Niflheimr.]'); }
    else { showSystemMessage(`[${b.name} is not accessible yet]`); }
  }
}
```
HUD prompt (verbatim):
```js
const nearBuilding = this.getNearestBuilding(pPos.x, pPos.z);
if (nearBuilding && !windowOpen) { this.hud.setPrompt(`Press E: ${nearBuilding.name}`); }
else { this.hud.setPrompt(null); }
```
Adding a NEW zone requires touching: `LAYOUT.zones` (layout.js), `BUILDING_PADS` in
`src/art/town/ground.js`, `NavGrid.buildGrid()` block/clear rectangles in `src/hub/NavGrid.js`
(AND/OR the collider/door pipeline via `rebuildFromTown`), `LANDMARK_EXCLUSIONS` in
`src/art/town/village.js` (lines 48-58) so props do not spawn on top, the mesh builder in
`src/art/town/landmarksWork.js` or `landmarksMain.js` (must register `door_<id>` and `sign_<id>`
anchors), and the `KeyE` chain in `src/scenes/HubScene.js`. `getNearestBuilding` is generic over
`LAYOUT.zones`, so a new zone is auto-detected once it has a `door_<id>` anchor.

Existing facility flags (GameState):
```js
this.facilities = {
  altar:       { level: 1, unlocked: true },
  synthesis:   { level: 1, unlocked: true },
  dormitory:   { level: 1, unlocked: true },
  training:    { level: 1, unlocked: false, unlockCost: 200 },
  blacksmith:  { level: 1, unlocked: false, unlockedByFloor: 5 },
  cafeteria:   { level: 1, unlocked: false, unlockedByFloor: 10 },
  infirmary:   { level: 1, unlocked: false, unlockedByFloor: 10 },
};
```

### Town palette — `src/art/town/palette.js` `export const PALETTE = { ... }`
```js
PALETTE = {
  wallLit: 0xc4cbcf, wallShade: 0x8e9da3, groundBase: 0xa9b6ba, groundDark: 0x68767c,
  moss: 0x5f8a4a, mossDark: 0x436836, ivy: 0x436836,
  skyHorizon: { morning:0xdcefee, midday:0xbfe3ea, dusk:0xe0a8b8, night:0x1d4a55, deepNight:0x173e48 },
  skyTop:     { morning:0x8fc4cf, midday:0x6fb2c8, dusk:0x23305a, night:0x07161c, deepNight:0x051218 },
  skyHorizonNight: 0x1d4a55, skyTopNight: 0x07161c,
  plaster: 0xdfe3df, timber: 0x2b2623, slate: 0x4a5560, warmWindow: 0xffc27a, teal: 0x6fe0f0,
  portalBlue: 0x5ab4ff, forgeOrange: 0xff8a3a, sphereCyan: 0xa8f4ff, crimsonGlow: 0xff3a4a,
  gold: 0xd8b45a, dirt: 0xa89f8a, wood: 0x6a4a2e,
  stoneLit: 0xc4cbcf, stoneMid: 0xaab4ba, stoneShade: 0x8e9da3, stoneCrevice: 0x5c6b73,
  groundLight: 0xc2cdd0, groundWarm: 0xb8b9b4, groundCrack: 0x68767c,
  mossMid: 0x5f8a4a, mossLight: 0x7aa860, mud: 0x7c857d,
  strataLight: 0x939a9e, strataBrown: 0x767068, strataDarkBrown: 0x54504a,
  strataTeal: 0x455e66, strataDeep: 0x23353d, iron: 0x2c3236,
  plaqueBronze: 0x5a6b64, plaqueFrame: 0x98a2a8,
  tealGlow: 0x6fe0f0, tealBright: 0xb8f8ff, warmGlow: 0xffc27a,
}
```

## 2.8 THE HERO ROSTER UI, AND THE GAME START / LOGIN FLOW

### `src/ui/RosterWindow.js` (1109 lines)
```js
export class RosterWindow extends SystemWindow {
  constructor(onOpenSynthesis, onNewGameReset, onAwakenCallback = null) {
    super('HERO ROSTER & STATUS');
    ...
    this.container.style.width = '880px';
    this.container.style.maxWidth = '95vw';
    this.currentTab = 'active';   // 'active' | 'equipment' | 'fallen'
    this.sortBy = 'star';
    this.sortAsc = false;
    this.selectedHeroId = null;
    this.equipmentSubWindow = new EquipmentWindow(() => { this.render(); });
  }
  buildUI()            // creates topBar, tabsContainer, mainSplit, bottomBar, summaryText
  createTabButton(label, tabKey)
  createHoldButton(label, holdMs, color, onConfirmed)
  playGoldenFlash()
  open(heroId = null, defaultTab = null)   // override; sets currentTab/selectedHeroId then render() then super.open()
  render()              // dispatcher
  renderActiveTab() / renderEquipmentTab() / renderFallenTab()
}
```
Tabs are **hard-coded buttons — there is NO tab data structure**:
```js
this.tabsContainer = document.createElement('div');
this.tabsContainer.style.display = 'flex';
this.tabsContainer.style.gap = '8px';
this.topBar.appendChild(this.tabsContainer);

this.activeTabBtn = this.createTabButton('Active Heroes', 'active');
this.equipmentTabBtn = this.createTabButton('Equipment', 'equipment');
this.fallenTabBtn = this.createTabButton('Fallen Heroes', 'fallen');
this.tabsContainer.appendChild(this.activeTabBtn);
this.tabsContainer.appendChild(this.equipmentTabBtn);
this.tabsContainer.appendChild(this.fallenTabBtn);
```
**Yes — 'Active Heroes', 'Equipment' and 'Fallen Heroes' tabs already exist. A 4th tab does NOT.**

`render()` dispatcher (verbatim, trimmed):
```js
render() {
  this.activeTabBtn.style.backgroundColor = this.currentTab === 'active' ? 'rgba(180, 140, 255, 0.25)' : 'transparent';
  this.activeTabBtn.style.color = this.currentTab === 'active' ? 'var(--accent)' : '#888888';
  this.equipmentTabBtn.style.backgroundColor = this.currentTab === 'equipment' ? 'rgba(180, 140, 255, 0.25)' : 'transparent';
  this.equipmentTabBtn.style.color = this.currentTab === 'equipment' ? 'var(--accent)' : '#888888';
  this.fallenTabBtn.style.backgroundColor = this.currentTab === 'fallen' ? 'rgba(255, 68, 68, 0.3)' : 'transparent';
  this.fallenTabBtn.style.color = this.currentTab === 'fallen' ? '#ff6666' : '#888888';

  this.mainSplit.innerHTML = '';

  if (this.currentTab === 'fallen') { this.renderFallenTab(); }
  else if (this.currentTab === 'equipment') { this.renderEquipmentTab(); }
  else { this.renderActiveTab(); }

  this.summaryText.textContent = `Active: ${gameState.heroes.length} | Fallen: ${gameState.deadHeroes.length} | Dissolved: ${gameState.dissolvedHeroes || 0} | Gems: ${gameState.gems}`;
}
```
Fallen heroes render from `gameState.deadHeroes` (NOT from `hero.alive`):
```js
gameState.deadHeroes.forEach((h) => {
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.justifyContent = 'space-between';
  row.style.alignItems = 'center';
  row.style.padding = '10px 16px';
  row.style.backgroundColor = 'rgba(20, 20, 25, 0.7)';
  row.style.border = '1px solid #444450';
  row.style.borderRadius = '6px';
  row.style.color = '#888888';
  const left = document.createElement('div');
  left.innerHTML = `<span style="color:#aaaaaa; font-weight:bold;">${h.name}</span> <span style="color:#888;">${'★'.repeat(h.star)}</span> (${h.class || 'Unknown'})`;
  const right = document.createElement('div');
  right.style.color = '#ff5555';
  right.textContent = h.deathCause ? `Cause: ${h.deathCause}` : `Perished on Floor ${h.deathFloor || 1}`;
  row.appendChild(left); row.appendChild(right);
  listWrap.appendChild(row);
});
```
Hero stats in the roster come from `getDisplayStats(hero)` (`src/core/Stats.js`), which returns
`{str:{current,base}, agi:{...}, vit:{...}, int:{...}, wil:{...}}`, displayed via
`formatStatDisplay(statObj)`.
**There is NO login-report panel anywhere. NOT FOUND.**

### `src/ui/SystemWindow.js` (102 lines) — the base modal API
```js
export class SystemWindow {
  constructor(title = 'SYSTEM') {
    this.container = document.createElement('div');
    this.container.classList.add('mm-panel');
    this.container.style.position = 'fixed';
    this.container.style.top = '50%';
    this.container.style.left = '50%';
    this.container.style.transform = 'translate(-50%, -50%)';
    this.container.style.minWidth = '340px';
    this.container.style.maxWidth = '90vw';
    this.container.style.zIndex = '10000';
    this.container.style.display = 'none';
    ...
    attachOrnateCorners(this.container);
    this.titleBar = ...; this.titleLabel = ...; this.closeBtn = ...;   // closeBtn -> this.close()
    this.contentElement = document.createElement('div');
    this.contentElement.style.padding = '16px';
    this.container.appendChild(this.contentElement);
    document.body.appendChild(this.container);
  }
  setTitle(title)   // titleLabel.textContent = title.toUpperCase()
  setContent(content)  // string -> innerHTML, or HTMLElement -> appended
  open()  { this.container.style.display = 'flex'; }
  close() { this.container.style.display = 'none'; }
  isOpen() { return this.container.style.display === 'flex'; }
}
```
Existing subclasses: `BlacksmithWindow`, `RewardWindow`, `TrainingWindow`, `SynthesisWindow`,
`DungeonBoardWindow`, `DormitoryWindow`, `OptionsWindow`, `SummonWindow`, `RosterWindow`,
`EquipmentWindow`, `DeployWindow`. **All are constructed eagerly in the `HubScene` constructor
and closed in `HubScene.exit()`.**
`isAnySystemWindowOpen()` (in `src/ui/Hud.js`) scans `document.querySelectorAll('body > div')` for
`zIndex >= 10000 && display !== 'none'` — so a `SystemWindow` blocks all hotkeys. `HubScene`
guards hotkeys with `if (isAnySystemWindowOpen()) return;`.
`src/ui/AccountCreationScreen.js` uses z-index 10050; `src/ui/IselleTutorial.js` uses z-index 10040.

### UI visual conventions
`src/ui/theme.css` CSS variables:
```css
:root {
  --panel-bg-1: #0b0810;  --panel-bg-2: #1a1326;
  --frame: #d9ccff;       --frame-inner: #5b4a8a;
  --glow: rgba(170, 130, 255, 0.65);
  --text: #ffffff;        --accent: #b48cff;
  --gold: #ffd36b;        --danger: #ff5a6e;   --ok: #7dffb0;
}
```
Classes: `.mm-panel`, `.mm-btn`, `.mm-btn-accent`, `.mm-btn-gold`, `.mm-btn-danger`, `.mm-btn-ok`,
`.ornate-corner` (+ `-tl/-tr/-bl/-br`). Everything else uses inline `style.*`.
Existing bar patterns to copy (all in `src/ui/RosterWindow.js`):
- 4 px fatigue bar: bg `rgba(0,0,0,0.5)`, fill `%` width, color `#ff3333` (>80) / `#ffaa00` (>50) / `#44bb44`.
- 6 px EXP bar: bg `rgba(255,255,255,0.06)`, fill `var(--accent)`, with a label row above.
- 6 px STRESS bar: bg `#1f132b`, fill `#e879f9` (>=80) or `#a84bff`.
- 5 px M/S/P group bars: bg `rgba(0,0,0,0.5)`, fill `#b48cff` (MENTALITY), `#7dffb0` (SKILLS), `#ffd36b` (PHYSICAL).
- Stat box colors: STR `#ff6666`, INT `#44aaff`, HP `#ffaa44`, AGI `#66ff88`, WIL `#cc66ff`.
- HUD gauge style (`src/ui/Hud.js`): 200×20 px, bg `rgba(0,0,0,0.7)`, border `2px solid #662222`, radius 4, a centered white label with `text-shadow: 0 1px 2px #000`.
Fonts: `monospace, sans-serif` for buttons; `.mm-panel` uses
`'Oswald','Bebas Neue','Arial Narrow','Roboto Condensed', Impact, sans-serif` with
`text-transform: uppercase`.
`src/ui/HeroCard.js` exports `createHeroCard(hero, delay = 0)` — a 220×320 px card with a
canvas magic circle and an M/S/P grade row. **Currently UNUSED anywhere in `src/`.**

### Game start / login flow (exact order)
1. `index.html:19` → `<script type="module" src="./src/main.js"></script>`
2. `src/main.js` module scope: imports `./ui/theme.css`, creates
   `new THREE.WebGLRenderer({antialias:false, preserveDrawingBuffer:true})`, appends the canvas,
   `new Input(renderer.domElement)`, `new SceneManager(renderer)`.
3. `src/main.js:36-37` → `const hubScene = new HubScene(renderer, input); const towerScene = new TowerScene(renderer, input);`
   **The `HubScene` constructor builds every window** (`this.rosterWindow = new RosterWindow(...)`,
   `this.trainingWindow`, `this.dormitoryWindow`, `this.iselle = new Iselle(this.scene)`, ...).
4. `src/main.js:39-40` → `sceneManager.register('hub', hubScene); sceneManager.register('tower', towerScene);`
5. `src/main.js:63-67` → `sceneManager.switchTo('hub')` → `src/core/SceneManager.js` `switchTo(name, params)`
   calls `currentScene.exit()` then `currentScene.enter(params)`.
6. `src/scenes/HubScene.js:724` `enter(params = {})` → builds the town, walk-height map, nav grid,
   spawns the player, `this.hud.show()`, `this.hud.updateCurrency(...)`, intro flyover, then
   `this.trainingManager.syncWithGameState(this.getWalkY)`.
7. `src/scenes/HubScene.js:808-821` — **the login gate (verbatim)**:
   ```js
   // Account Creation (if no masterName set)
   if (!gameState.masterName) {
     if (!this.accountCreationScreen) {
       this.accountCreationScreen = new AccountCreationScreen(() => {
         showSystemMessage('[Welcome to the world of Pick Me Up!]');
         this.checkTutorial();
       });
     }
     this.accountCreationScreen.open();
     return;
   }

   this.checkTutorial();
   ```
8. `src/scenes/HubScene.js:820` `this.checkTutorial()` → `src/ui/IselleTutorial.js`
   (`IselleTutorial`, `constructor(onComplete, iselle = null)`, `getSteps()`, `open()`, `close()`,
   `show()`, `renderStep()`, `finish()`) → `playTutorialWalkout()` → `triggerScriptedPunishment()` →
   `showIselleEquipmentPrompt()` → Jenna/Aaron arrival → hero-death reaction.
9. `src/main.js:56-60` `animate()` → `requestAnimationFrame(animate)` → `sceneManager.update(delta)`.

**Where "on login" logic belongs:** after step 6 and before/around step 7 — i.e. inside
`HubScene.enter()` right before `this.checkTutorial()`, so BOTH the fresh-player path (after
`AccountCreationScreen` completes) and the returning-player path hit it. `gameState.masterName`
is `''` for a fresh player and non-empty for a returning player.

`AccountCreationScreen` (`src/ui/AccountCreationScreen.js`, 193 lines):
```js
export class AccountCreationScreen {
  constructor(onComplete) { ... }
  open() { this.show(); }
  show() { /* builds #account-creation-screen overlay, z-index 10050 */ }
  // handleSubmit(): validates a 2..6 char name with no spaces, then
  //   gameState.masterName = val;
  //   gameState.setPlayerClass(selectedClass);
  //   gameState.saveToLocalStorage();
  //   ... fades out, removes the overlay, calls this.onComplete(val)
}
```

## 2.9 THE FAIRY ISELLE — WHAT ALREADY EXISTS

### `src/art/iselle.js` (1364 lines) — model + 2D face
```js
export const ISELLE_POSES = ['idle', 'float', 'walk', 'fly', 'cast', 'hit', 'ko', 'victory'];
export const ISELLE_EXPRESSIONS = ['neutral', 'smile', 'surprised', 'angry', 'sad', 'blink', 'wink'];
export const POSE_INFO = {
  idle:    { loop: true,  duration: 2.4, label: 'Idle' },
  float:   { loop: true,  duration: 2.0, label: 'Float' },
  walk:    { loop: true,  duration: 1.0, label: 'Walk' },
  fly:     { loop: true,  duration: 0.8, label: 'Fly' },
  cast:    { loop: false, duration: 1.1, label: 'Cast' },
  hit:     { loop: false, duration: 0.45, label: 'Hit' },
  ko:      { loop: false, duration: 1.2, label: 'K.O.' },
  victory: { loop: true,  duration: 1.6, label: 'Victory' },
};
export function drawIselleFace(ctx, expression = 'neutral', size = 256)
export function drawIsellePortrait(ctx, options = {}, sizeArg)   // options may be an expression string
export function disposeIselleCaches()
export function createIselleModel(options = {})   // { scale, pose, expression, glow, outline }
```
`createIselleModel` returns:
```js
return {
  root, group: root,
  parts: { root, body, torso, head, tailL, tailR, armL, armR, legL, legR, wingL, wingR, dress, facePlate },
  anchors,                 // root, head, mouth, chest, leftHand, rightHand, handL, handR, wingTipL, wingTipR, wings, aura, feet
  setPose, setExpression, setGlow, setOpacity, setTint, update, getBounds, dispose,
};
```
### `src/art/IselleRig.js` (414 lines) — the scene rig
```js
export class IselleRig {
  constructor(scene)
  setupShadowBlob()
  mapPose(poseName) / mapExpression(exprName)
  setPose(name) / setExpression(name) / playOnce(pose, expression = null)
  say(category, opts = {})
  moveTo(position, speed = 1.2)
  follow(target, offset = new THREE.Vector3(0, 2.4, 0))
  getMouthWorldPosition() / getHeadWorldPosition()
  setVisible(bool) / setOpacity(a)
  update(delta, time = 0, playerPos = null, getGroundY = null, camera = null)
  dispose()
}
```
`say()` (verbatim):
```js
say(category, opts = {}) {
  const now = performance.now() * 0.001;
  // 8-second reaction cooldown unless forced or punishment/tutorial
  if (!opts.force && category !== 'punish' && (now - this.lastReactionTime < 8.0)) { return; }
  this.lastReactionTime = now;
  const line = opts.text || pickLine(category);
  let map = CATEGORY_MAP[category] || { pose: 'explain', expr: 'sweet_cruel' };
  ...
  showIselleBubble(this, line, this.currentExpression, opts.duration);
}
```
### `src/data/iselle.js` (87 lines) — dialogue
```js
export const ISELLE_LINES = {
  greetings: [...6 lines...], summonGood: [...], summonBad: [...], synthesisStart: [...],
  promotionDone: [...], floorClear: [...], heroDied: [...], mandatoryQuest: [...],
  idleTeasing: [...], punish: [...],
};
export function pickLine(category) {
  const lines = ISELLE_LINES[category] || ISELLE_LINES.idleTeasing;
  return lines[Math.floor(Math.random() * lines.length)];
}
```
Example (verbatim):
```js
greetings: [
  'Welcome back, Master! Did you bring more gems or just more disappointments?',
  'Oh, you are finally awake! Town 1377 was almost peaceful without you.',
  ...
],
```
**There is NO `equipmentPrompt` key** (HubScene calls `this.iselle.say('equipmentPrompt', ...)`,
which falls through to `idleTeasing`). **There is no 'report' category — a new one is needed.**

### `src/hub/Iselle.js` (4 lines) — a re-export shim
```js
import { IselleRig } from '../art/IselleRig.js';
export { IselleRig, IselleRig as Iselle };
```

### `src/ui/IselleBubble.js` (236 lines)
```js
export function showIselleBubble(iselleRig, text, expression = 'smile', customDuration = null)
export function updateIselleBubbles(camera)
export function clearIselleBubbles()
```
`showIselleBubble` internals: `{ iselleRig, text: String(text).trim(), expression, duration: customDuration || Math.min(7000, 2500 + text.length * 40) }`; one bubble at a time, extras queue in `bubbleQueue`; the bubble is positioned each frame by `updateIselleBubbles(camera)` from `iselleRig.getHeadWorldPosition()` (y += 0.38). The bubble hides while any system window is open.

### Iselle in the scene
`src/scenes/HubScene.js:108-112`:
```js
this.iselle = new Iselle(this.scene);
this.heroesManager = new HubHeroesManager(this.scene, this.iselle, this.navGrid);
```
Per-frame: `this.iselle.update(delta, time, this.player.mesh.position, this.getWalkY, this.camera);`
She does NOT path-find (she flies): she orbits `(0, 4)` with radius 8, or hovers 3 units in front of
the player. `this.overrideTarget` / `this.targetPosition` / `this.followTarget` override her motion.
`PunishmentEffect` (`src/hub/PunishmentEffect.js`) flies her to 4.5 units from a punished hero and
calls `iselle.say('punish', { force: true, text: pickLine('punish') })`.

**There is NO Iselle "report" delivery, NO law enforcement system, and NO fight intervention
system. All three must be built.**

## 2.10 TEST SCRIPTS AND THE docs/CODEMAP.md FORMAT

### npm test scripts
`test:spells`, `test:integration`, `test:loadout` — all `node scripts/<name>.mjs`.
### Existing test script shape (`scripts/test_loadout.mjs`, 318 lines)
```js
// scripts/test_loadout.mjs
// Automated headless verification ...
// Runs purely in Node with zero headless browser overhead.

import * as THREE from 'three';

// A minimal localStorage so GameState can save/load inside Node.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const { gameState } = await import('../src/core/GameState.js');
const { getHeroLoadout } = await import('../src/core/loadout.js');
// ...

const capturedErrors = [];
const originalConsoleError = console.error;
console.error = (...args) => { capturedErrors.push(args.join(' ')); originalConsoleError(...args); };

const results = [];
function check(name, condition, extra = '') {
  if (condition) { console.log(`  [PASS] ${name}${extra ? ' - ' + extra : ''}`); results.push({ name, pass: true }); }
  else { console.log(`  [FAIL] ${name}${extra ? ' - ' + extra : ''}`); results.push({ name, pass: false, extra }); }
}
```
Runner tail (verbatim):
```js
const total = results.length;
const passed = results.filter((r) => r.pass).length;
console.log('\n========================================================');
console.log(`📋 LOADOUT RESULTS: ${passed}/${total} TESTS PASSED`);
console.log('========================================================\n');
if (passed === total) { console.log('🎉 ALL LOADOUT TESTS PASSED SUCCESSFULLY!\n'); process.exit(0); }
else { console.error('❌ SOME LOADOUT TESTS FAILED!'); process.exit(1); }
```
There is also a "Zero Console Errors" check at the end
(`check('Zero Console Errors', capturedErrors.length === 0, ...)`) — the convention is to capture
`console.error` and assert zero.
Reloading a save inside a test uses a cache-busting dynamic import:
`const reloaded = (await import('../src/core/GameState.js?reload=1')).gameState;`

### Seeded RNG precedent — `src/world/floorLayouts.js:14`
```js
export function createRng(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t >>> 0) / 4294967296;
  };
}
```

### `docs/CODEMAP.md` format
Sections: 1 Folder Tree, 2 File Index, 3 "Where Do I Look For..." lookup table,
4 Combat Engine Data Flow, 5 Dependency Notes, 6 Known Gotchas & Past Bugs,
7 Conventions & Checklists, 8 Protected Areas.
File Index rows are pipe-delimited with exactly 5 columns:
```
src/data/heroes.js | Hero base templates, past jobs, motivations, and novice generators | HERO_TEMPLATES, PAST_JOBS, JOB_SKILL_MAP, generateNoviceHero, generateRandomHero, rollMotivation, createHeroFromTemplate | skills | live game
```
i.e. `path | purpose | comma-separated exports | comma-separated imports | status`
where status is `live game`, `dev only` or `legacy`.
`scripts/check_codemap.mjs` verifies that every `.js`/`.mjs`/`.html`/`.css` file under `src/` and
`scripts/` (plus root HTML) appears in the File Index, that every path in the map exists on disk,
and that every named export in a file is listed in that file's exports column. It prints
`CODEMAP OK` and exits 0 on success; on failure it prints `[MISSING FROM MAP]`, `[DEAD IN MAP]`
and/or `[UNLISTED EXPORTS]` and exits 1. It also supports `--fix-list` to print template lines.

## 2.11 KNOWN GOTCHAS (from docs/CODEMAP.md section 6 — respect these)

- `src/combat/WolfAI.js`: legacy pounce passed a string into `attackerPos` -> NaN parry angles.
- `src/combat/TimeScale.js`: hit-stop freezes individual actors, global slow-mo scales world delta.
- `src/player/Player.js` & `src/art/HeroRig.js`: `setDraw(0, false, -1)` is forced to 0 on state
  exits (dodge, stagger, death) to prevent stuck pulled bowstrings.
- `src/art/weaponAnimations.js`: ALL weapon rotation angles, timings and grip offsets live ONLY
  there. Never hardcode animation transforms in `HeroRig.js` or `Combatant.js`.
- `src/combat/DamageResolver.js`: hit payloads must be structured objects
  (`{ attacker, target, rawDamage, poiseDamage, hitPos, hitNormal }`), never positional argument lists.
- `src/art/HeroRig.js`: bow models attach exclusively to `model.sockets.handL`; melee weapons and
  staves attach to `model.sockets.handR`; staves attach to `model.sockets.staffHand`.
- `src/core/loadout.js`: NEVER decide a weapon outside this module. The 3D model
  (`HeroRig.equip`), the Equipment screen, the HUD and the combat input all read
  `getHeroLoadout(hero)`.
- `src/core/GameState.js`: the hero class must never be overwritten on load.
- `src/hub/HubHeroes.js` `handleRuleBreak` 'attack' branch sets `npc.targetPos` but does NOT
  recompute `currentPath`, so the NPC keeps walking its old path (`targetPos` is not read by the
  walker). Known bug — do not rely on `targetPos` for movement; use `setDestination(x, z, cb)`.
- `src/art/town/layout.js` vs `src/scenes/HubScene.js` — REAL BUG: the 10 cottages live at the
  TOP-LEVEL key `LAYOUT.cottages` (`src/art/town/layout.js:266`, confirmed by
  `src/art/artTownTest.js:327` → `for (const cot of LAYOUT.cottages)`), but `HubScene` reads
  `LAYOUT.residences?.cottages` at THREE places:
  - `src/scenes/HubScene.js:382` — `getCottagePosition(houseIndex)` → always falls back.
  - `src/scenes/HubScene.js:391-392` — the cottage-door branch of `getNearestBuilding` → the loop
    body never executes, so individual cottage doors are NEVER detected as a building.
  - `src/scenes/HubScene.js:755-756` — the cottage `doorCorridor` arrays are NEVER pushed into the
    nav-grid corridors in `enter()`, so those paths are never carved out of the blocked grid.
  Your plan MUST decide whether to fix this path or route around it. It matters because the
  Dormitory (where Rest happens) is the residences zone, and because `goToDormitory()` relies on
  `navGrid.getDoorCorridor('residences')` rather than on the cottage corridors.
- `src/art/town/layout.js`: `LAYOUT.residences.cottages` does not exist — see above.

# PART 3 — THE GAME

A browser 3D RPG inspired by the manhwa "Pick Me Up: Infinite Gacha". The player is the Master
of a squad of 5 heroes living in the town of Niflheimr (in the source story the lobby is
Townia). Heroes are real people with hunger, fear, anger, and ambition. The fighting system
(sword, bow, staff) already exists. We are building the vertical slice of the EMOTION SYSTEM and
the TRAINING SYSTEM. The Fight AI is a later system, so reuse the current combat AI for sparring
and do not redesign it.

# PART 4 — THE DESIGN TO PLAN

## A. CORE IDEA

Heroes decide by themselves whether to train. Training can make them stronger, give nothing,
cause an injury, or in rare cases kill them. Not training never causes death and never causes a
stat penalty. It only means no growth.

Stars (1 to 7) are only a starting point: a growth multiplier and starting skill count. Keep the
multiplier gap small (1.0 at 1 star up to 1.5 at 7 stars). A 1-star who trains must become
stronger than a 3-star who never trains. Required test: simulate 30 game days, report the
numbers.

## B. EMOTIONS AND NEEDS (each hero, each 0-100, all in one config file)

Hunger: rises over time. The hero eats at the Cafeteria. High hunger lowers Motivation, raises
Anger, and lowers training results.

Fear: rises after near-death, big damage, losing a fight, or an ally falling. Fear gain is
multiplied by (1 - Mentality/100). High fear makes the hero avoid dangerous training and
sparring. Fear falls with rest, food, and successful training. Mentality below 30 means panic:
skip risky training and refuse sparring while Fear is above 60. Add the Mentality stat if it does
not exist (0-100, default by class and star).

Anger (tension) and a relationship value between pairs of heroes. Anger rises from hunger,
losses, and rivalry. When Anger passes a threshold, a hero may start a real fight with a hero
they have tension with.

Motivation and Fatigue. Training costs Fatigue. Rest in the Dormitory lowers it.

Personality traits per hero (for example Diligent, Lazy, Brave, Cautious, Hot-headed) that change
decision weights.

## C. DAILY DECISION

Each game day each hero chooses by weighted random: Train (which type), Spar with another hero,
Eat, Rest, or Do nothing. Weights come from Hunger, Fear, Anger, Motivation, Fatigue, class, and
traits.

1 real day = 3 game days. On login: gameDaysAway = floor(realHoursAway / 8), capped at 9.
Simulate with a seeded random generator.

## D. THE FAIRY ISELLE

Iselle is a small winged fairy. She announces rules, reprimands heroes who break lobby laws,
stops fights that get out of hand, and delivers the login report as "Iselle's Report".

She intervenes when any hero is below 25% HP, any hit lands on the head or heart, the fight lasts
longer than a set time, or total damage passes a limit (all config). She separates the fighters,
heals them to a safe level, lowers Anger, raises Fear a little, and adds a report line. A death
after her intervention has a chance of 0 in the slice (a config value).

Three lobby laws (config): no fighting outside the sparring ring, no lethal blows in sparring,
no attacking a hero who is below the safe HP threshold. A broken law triggers Iselle, lowers the
offender's Motivation, and adds a report line.

## E. SQUAD LEADER

A field `isSquadLeader` on the hero (default Han Islat, otherwise the first hero). Each game day
the leader can order one hero who chose "Do nothing" to train. Success depends on the
relationship value, the target's Anger, and the target's traits (a Hot-headed hero with high
Anger may refuse and raise tension). The leader can also break up a fight before Iselle if the
leader is nearby and stronger than both fighters. Add a report line for each order.

## F. TRAINING

Training place in town with 4 zones: wooden dummies (sword and shield), archery targets (bow),
fire target (staff), sparring ring (live sparring). Heroes walk there and play activity
animations using the existing movement and pose code.

Skill XP comes from the real action: dummy hits give sword and shield XP, arrow hits give bow XP,
spell hits give fire magic XP. Sparring gives the most XP. Surviving below 20% HP in sparring
gives bonus skill XP and bonus Pain Tolerance counters.

Each session result is random: strong gain, normal gain, small gain, or an accident (injury).
Very small death chance for risky training (config values, 0 when Iselle is present).

Sparring uses the real combat code. At the training place damage heals fast, EXCEPT hits on the
head or heart, which do not heal fast and cause serious injury. If hit zones do not exist, design
the smallest way to add them (a weighted random zone per hit, based on the attack type).

PAIN TOLERANCE skill: track total damage taken and healed at the training place. When both pass
thresholds, the hero gains Pain Tolerance, which levels up and slightly reduces incoming damage
(give exact numbers).

SKILL COMBINING: data-driven recipe table. Example: Basic Swordsmanship + Basic Shield -> Basic
Sword-Shield. When both skills reach the recipe requirements and the hero has trained them
together, they combine. Combined level = sum of the parent levels (sword Lv2 + shield Lv1 =
Sword-Shield Lv3). Parent skills stay in a "merged" state, not deleted. Recipes: Sword + Shield,
Bow + Quiver Handling, Basic Fire Magic + Mana Control, plus 2 more of your choice.

## G. LOGIN REPORT ("Iselle's Report")

On login, simulate the days away with the same code path as live play (ONE code path), then show
a panel before gameplay. Per hero: level up, new skill, skill combined, trained (which type), did
nothing, injured, ate, got scared, fought another hero, Iselle intervened, was ordered by the
leader, died. Sort by importance, show a summary line at the top, and list heroes who did nothing
too. Dead heroes dissolve into light, drop their equipped gear into the inventory, and go to the
existing Fallen Heroes tab (reuse the existing logic, no revive).

## H. UI

Hero Roster: bars for Hunger, Fear, Anger, Motivation, Fatigue; current activity; skill list with
levels, merged skills, Pain Tolerance; short activity history. Keep the current visual style.

## I. SAVE

New fields with defaults, plus a migration for old saves: last login time, emotion values,
relationships, traits, skills, skill XP, damage counters, report history.

## J. OUT OF SCOPE (mark as "future", do not plan)

Synthesis Chamber, Promotion Chamber, support classes (Cook, Blacksmith), gifting, real-combat
panic, Daily Dungeons, Fight AI redesign.

# PART 5 — WHAT YOU MUST OUTPUT

Output exactly these sections, in this order.

## 5.1 PHASES (in this order, each small enough to finish and test alone)

- **Phase 1** — data model + config + save migration.
- **Phase 2** — emotion + daily decision simulation (headless, with a test script).
- **Phase 3** — skills, training sessions, skill combining, Pain Tolerance.
- **Phase 4** — login report + offline simulation.
- **Phase 5** — training place in town + sparring + Iselle + squad leader.
- **Phase 6** — roster UI.

For EACH phase you must give:
1. **Files to create** (new paths) and **files to edit** (existing paths) — and for each edited
   file in a protected area (`src/hub/*`, `src/ui/*`, `src/world/*`, `src/gacha/*`,
   `src/player/Player.js`, `src/combat/Ally.js`, `src/combat/Enemy.js`) flag it as
   `PROTECTED — needs user sign-off`.
2. **Function names and exact signatures** for every new or changed function.
3. **Data structures** with exact field names, types and defaults (including the exact new hero
   fields and the exact `saveToLocalStorage()` / `loadFromLocalStorage()` key additions and the
   exact per-hero migration lines).
4. **Config values** — every tunable number, in a table. Point to the exact config file you
   create (e.g. `src/data/emotions.config.js`) and name the exported constant for each table.
5. **Edge cases** — empty roster, hero with no skills, dead hero, offline delta of 0 days,
   offline delta of 9 days, all heroes dead, inventory full when dropping gear, a hero that dies
   offline, a hero whose parent skills are already merged, a leader with no "do nothing" hero,
   etc.
6. **Tests** — the exact `npm` script name, the exact `scripts/<file>.mjs` path, the exact
   `check(...)` assertion names, and the **expected console output** (counts of PASS/FAIL and
   the exact printed numbers for the 30-day simulation test).

## 5.2 ALL CONFIG VALUES IN TABLES

One markdown table per config file: `Constant | Type | Default | Range | Meaning`. No tunable
number may appear anywhere outside a config table.

## 5.3 FINAL RULES SECTION FOR GEMINI

Write an explicit, numbered rule list for the implementing agent covering at least:
- Do not break the fighting system, the staff, bow, and sword code, or old saves.
- Keep ALL numbers in config; no magic numbers in logic.
- ONE code path for live play and offline simulation (name the exact module and the exact
  function that both call).
- Zero allocations in per-frame code.
- Update `docs/CODEMAP.md` in the same phase as any file change, and run
  `node scripts/check_codemap.mjs` until it prints `CODEMAP OK`.
- Final report format, exactly:
  1. Files changed (one line per file).
  2. PASS/FAIL for every npm test script (exact command + result).
  3. What is NOT done.
  4. Three manual test steps.

## 5.4 OPEN QUESTIONS AND ASSUMPTIONS

End with a numbered list of every assumption you made and every code fact you could not verify
(for example: how `Mentality` relates to the existing `composure` field; whether the `training`
facility flag gates the training place; how a hero "dissolves into light" visually; whether the
Cafeteria stays locked behind Floor 10; the exact visual anchor points for the archery target,
fire target and sparring ring inside the 16×16 training yard; how the 30-day simulation test
prints its numbers).
````

---

## Facts I could not find in the code (5 lines)

1. **No `Mentality` stat** — `hero.stats` is only `{str, agi, vit, int, wil}`; `hero.composure` (20–59) and `getHeroThreeGroups().mentality` (a derived display score) are the nearest things, and `pain_tolerance` is a 1-level *talent*, not a levelled skill.
2. **No last-login timestamp** — the save has `dayCount`/`dayTimer` only; `Date.now()` appears solely for id generation, forge timers and `hero.lastComfortTime`.
3. **No hit zones in the new combat engine** — `DamageResolver.resolve` ignores `hitPos`; the only headshot logic lives in the legacy `ArrowPool` path, and there is no heart/torso/limb zone anywhere.
4. **No skill-combining or recipe table, no `quiver_handling`/`mana_control` skills, no archery target / fire target / sparring ring, no town sparring, and no Iselle report or law system** — all of these must be created from scratch.
5. **No save schema version** — migration is only per-field `??` defaults plus one-time `gameState.flags.*` booleans; and `src/hub/*` + `src/ui/*` are protected areas per `AGENTS.md`, so every edit there needs explicit sign-off.