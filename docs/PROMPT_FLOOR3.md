# Task Prompt: Floor 3 Manhua Fidelity Alignment (Chapter 4)

Read `AGENTS.md`, then `docs/CODEMAP.md`.
You are working on **Pick Me Up: Infinite Gacha** (Three.js 0.160 + Vite + Vanilla JS).
Keep token consumption minimal and changes precise.

---

## 1. Goal & Context

Make **Floor 3** of the game faithfully match **Chapter 4** of the canonical manhua source material.

In Chapter 4:
- When advancing from Floor 2 to Floor 3, sequential system notifications announce:
  `CONGRATULATIONS ON COMPLETING THE 2ND FLOOR!`
  `YOU WILL PROCEED TO THE 3RD FLOOR.`
- Floor 3 intro banner displays:
  `FLOOR 3`
  `MISSION CATEGORY - SUBJUGATION`
  `GOAL - ANNIHILATE ALL THE ENEMIES!`
- The environment is a **bright forest clearing** with vibrant daytime sunlight filtering through green foliage (not a pitch-black night forest).
- The first run encounter consists of **4 Armored Goblins** (Lv. 4) in the clearing. (Repeat runs feature `GOBLIN LV4 x2`).
- The stage clear panel displays:
  `STAGE CLEAR!`
  `JENNA (★) HAS LEVELED UP!`
  `MVP - JENNA (★)`
- The reward payout panel displays:
  `REWARD`
  `7,000G`
  `IRON ORE (C) x2`
  `LEATHER (C) x1`
  (0 gems, 0 summon tickets).

---

## 2. Manhua vs Game Comparison Table

| Feature | Manhua Specification (Chapter 4) | Current Game Implementation | Status |
| :--- | :--- | :--- | :--- |
| **Floor 2 to 3 Transition Messages** | Two sequential system notifications: `CONGRATULATIONS ON COMPLETING THE 2ND FLOOR!` followed by `YOU WILL PROCEED TO THE 3RD FLOOR.` | Simple black fade overlay showing generic `[Tower of Trials] Floor 3`. No congratulatory or proceed messages. | **MISSING** |
| **Mission Banner Text** | Line 1: `MISSION CATEGORY - SUBJUGATION`<br>Line 2: `GOAL - ANNIHILATE ALL THE ENEMIES!` | Line 1: `DUTY TYPE: CONQUEST`<br>Line 2: `GOAL: KILL ALL THE ENEMIES!` | **DIFFERENT** |
| **Biome & Lighting** | Bright daytime forest clearing with sunlit clearing ground, warm sunlight, and soft tree shadows. | Dark night forest (`FOREST_FLOOR_LIGHTING` with `background: 0x0b110d`, ambient 0.3, directional 0.45). | **DIFFERENT** |
| **Enemy Types** | Armored Goblins (iron helmet, torso breastplate, dual shoulder pauldrons). | Generic Goblin Grunt, Goblin Archer, Goblin Shaman, Goblin Leader. | **DIFFERENT** |
| **Enemy Levels** | Level 4 (`GOBLIN LV4`). | Unspecified / defaults to 1 (scaled by generic formula). | **DIFFERENT** |
| **Enemy Counts** | Exactly 4 Armored Goblins in the clearing on first run (2 on repeat run). | 34 enemies distributed across 4 separate clearings (24 Grunts, 6 Archers, 2 Shamans, 2 Leaders). | **DIFFERENT** |
| **'Armored Goblin' Visual Model** | Green skin, crude iron pot/conical helmet with nasal guard, dark iron breastplate strapped to torso, dual iron shoulder pauldrons, crude short sword/shield. | No armored goblin model exists. Grunts have rags/club, archers have hoods, shamans have robes, leaders have horns/banners. | **MISSING** |
| **Arrival Effect** | Instantaneous arrival into clearing from Waiting Room dialog (no visual dome described). | Glowing Cyan Arrival Dome effect (`this.arrivalDome.play(...)`) lasting 2.0s with control lock. | **DIFFERENT** |
| **Clear Panel Text** | Top: `STAGE CLEAR!`<br>Sub: `JENNA (★) HAS LEVELED UP!` (singular "HAS")<br>MVP: `MVP - JENNA (★)`. | Top: `STAGE CLEAR!`<br>Sub: `<NAME> (★) LEVELED UP!` (lacks "HAS")<br>MVP: `MVP - <NAME> (★)` (dynamic combat score). | **DIFFERENT** |
| **Clear Rewards (First Clear)** | Gold: `7,000G`<br>Materials: `IRON ORE (C) x2`, `LEATHER (C) x1`<br>Gems: `0`, Tickets: `0`. | Fallback formula: `10,000G`, randomized materials (`STEEL (C) x2`, `COPPER (C) x2`, `LEATHER (C) x2`, `IRON ORE (C) x1`), `15 GEMS`, ticket chance. | **DIFFERENT** |

### Open Questions (Unsure in Source Material)
1. *Arrival Dome*: Chapter 4 transitions directly from Waiting Room dialog to the clearing without depicting a dome. Keep the game's cyan arrival dome as standard engine transition, or suppress it specifically for Floor 3? (Recommendation: Keep arrival dome active for engine consistency).
2. *Party Behavior*: In Chapter 4, the three summoned 1-star heroes refuse to fight and cower at the entrance, leaving Han and Jenna to fight alone. Should the game forcibly suppress AI for other party members on Floor 3, or allow normal combat AI? (Recommendation: Allow normal combat AI unless scripted).
3. *MVP Assignment*: In Chapter 4, Jenna levels up and takes MVP. Should Floor 3 first clear force Jenna as MVP, or retain dynamic combat performance scoring? (Recommendation: Retain dynamic calculation, but ensure singular level-up formatting displays `HAS LEVELED UP!`).

---

## 3. Scope & Permissions

### PERMISSION Line
You have explicit permission to edit ONLY these files:
- `src/data/missions.js`
- `src/data/rewards.js`
- `src/data/enemies.js`
- `src/art/enemies.js`
- `src/combat/EnemyManager.js`
- `src/scenes/TowerScene.js`
- `src/ui/RewardWindow.js`
- `src/ui/Notices.js`
- `docs/CODEMAP.md`

### Protected Files (DO NOT TOUCH)
Do NOT edit any files in:
- `src/world/*`
- `src/gacha/*`
- `src/hub/*`
- `src/player/Player.js`
- `src/combat/Ally.js`
- `src/combat/Enemy.js`
- `src/ui/Hud.js`
- `src/ui/RosterWindow.js`
- `src/ui/DeployWindow.js`
- `src/ui/SystemWindow.js`

---

## 4. Strict Constraints (DO NOT List)
- **Do NOT run the browser, Playwright, dev server, or headless screenshots.** The user tests manually.
- **Do NOT write QA docs, scorecards, or audit logs.**
- **Do NOT make per-frame allocations**: No `new THREE.Vector3()`, `new THREE.Mesh()`, or temporary closures in `update()` loops.
- **Data-driven tuning**: All balancing numbers, mission strings, and rewards belong in `src/data/*`, never hardcoded in logic loops.

---

## 5. Exact Implementation Changes

### 1) Data-Driven Mission Announcement (`src/data/missions.js`)
In `getMissionInfo({ mode, floorNumber, difficulty })`:
Add explicit data branch for `floorNumber === 3` in tower mode:
```javascript
if (floorNumber === 3) {
  return {
    title: 'FLOOR 3',
    missionType: 'SUBJUGATION',
    objective: 'ANNIHILATE ALL THE ENEMIES!',
    line1: 'MISSION CATEGORY - SUBJUGATION',
    line2: 'GOAL - ANNIHILATE ALL THE ENEMIES!',
  };
}
```
*Source: Chapter 4, Panel 9.*

### 2) Data-Driven Stage Rewards (`src/data/rewards.js`)
In `STAGE_REWARDS`:
Add Floor 3 entry with exact values from the manhua:
```javascript
3: {
  gold: 7000,
  materials: [
    { id: 'crude_iron', name: 'IRON ORE (C)', count: 2 },
    { id: 'leather', name: 'LEATHER (C)', count: 1 },
  ],
  gems: 0,
  tickets: 0,
},
```
In `getFloorClearReward(floorNumber, isFirstClear)`:
Ensure Floor 3 uses `STAGE_REWARDS[3]` directly so it does NOT fall through to the procedural math formula, and returns `gems: 0, tickets: 0`.
*Source: Chapter 4, Panel 10.*

### 3) Armored Goblin Stats (`src/data/enemies.js`)
In `ENEMY_TYPES`, add `ARMORED_GOBLIN` and `goblin_armored`:
```javascript
ARMORED_GOBLIN: {
  id: 'goblin_armored',
  name: 'Armored Goblin',
  level: 4,
  hp: 55,
  speed: 2.8,
  damage: 8,
  detectionRange: 16,
  attackRange: 1.5,
  size: 1.05,
  color: 0x5a8f3a,
},
goblin_armored: {
  id: 'goblin_armored',
  name: 'Armored Goblin',
  level: 4,
  hp: 55,
  speed: 2.8,
  damage: 8,
  detectionRange: 16,
  attackRange: 1.5,
  size: 1.05,
  color: 0x5a8f3a,
},
```
*Source: Chapter 4, Panels 9 & 11 (`GOBLIN LV4`).*

### 4) Armored Goblin 3D Procedural Mesh (`src/art/enemies.js`)
Extend the existing enemy archetype builder:
1. In `ENEMY_TYPES` export array, add `'goblin_armored'`.
2. In `ARCHETYPES` table, add:
```javascript
goblin_armored: {
  height: 1.20,
  skinHex: 0x6a6a2e,
  legLen: 0.25,
  torsoH: 0.36,
  torsoWTop: 0.18,
  torsoWBot: 0.12,
  armLen: 0.26,
  headScale: 0.25,
  hunch: 0.58,
  kneeBend: 0.34,
  hasHelm: true,
  shoulderL: true,
  shoulderR: true,
  hasChestPlate: true,
},
```
3. In `getTypeGeometries(type, arch, wVariant, armorTier)`:
When `arch.hasChestPlate` is true, add a curved dark iron chestplate mesh to `chestGearParts`:
```javascript
if (arch.hasChestPlate) {
  const plate = new THREE.BoxGeometry(arch.torsoWTop * 0.95, torsoH * 0.70, 0.08);
  chestGearParts.push(placeGeom(plate, darkIron, 0, torsoH * 0.55, arch.torsoWTop * 0.42));
}
```
*Source: Chapter 4, Panel 9 (conical iron helmet with nose guard, dual shoulder pauldrons, iron breastplate over torso).*

### 5) Floor 3 Enemy Spawning (`src/combat/EnemyManager.js`)
In `spawn(scene, dungeon, floorNumber = 1)`:
Add a dedicated handler for `floorNumber === 3`:
- Check if it's a first run vs repeat run (use `(gameState.clearedFloors || 0) >= 3` to detect repeat run):
  - **First Run**: Spawn exactly **4 Armored Goblins** (Lv. 4) in the first clearing around the central area (e.g. `x: -3, z: -32`, `x: 3, z: -32`, `x: -1, z: -36`, `x: 2, z: -36`).
  - **Repeat Run**: Spawn exactly **2 Armored Goblins** (Lv. 4) (`GOBLIN LV4 x2`) in the clearing (e.g. `x: -2, z: -34`, `x: 2, z: -34`).
- Instantiate them via `new Enemy(pos.x, pos.z, 'ARMORED_GOBLIN', false, 3, 4)`.
*Source: Chapter 4, Panels 9 & 11.*

### 6) Bright Forest Clearing Lighting & Floor 2->3 Transition (`src/scenes/TowerScene.js`)
1. **Bright Forest Lighting**:
Define `BRIGHT_FOREST_LIGHTING` at module level:
```javascript
const BRIGHT_FOREST_LIGHTING = {
  background: 0xa8d5ba,
  fog: { color: 0xb8e0c8, near: 35, far: 140 },
  exposure: 1.2,
  ambient: { color: 0xf4f9f4, intensity: 1.0 },
  hemi: { sky: 0xd6f0e0, ground: 0x4a6b38, intensity: 0.85 },
  sun: { color: 0xfffaed, intensity: 1.3, direction: { x: 25, y: 40, z: -15 } },
};
```
In `applyFloorLighting(floor)`:
```javascript
if (floor === 3) {
  L = BRIGHT_FOREST_LIGHTING;
}
```
2. **Floor 2 -> Floor 3 Transition Notices**:
In `playOpeningTransition(floorNumber)`:
When `floorNumber === 3`, before fading into the floor, trigger the two sequential system notices using `showSystemNotice` or `showNotices`:
- Message 1: `'CONGRATULATIONS ON COMPLETING THE 2ND FLOOR!'`
- Message 2: `'YOU WILL PROCEED TO THE 3RD FLOOR.'`
*Source: Chapter 4, Panels 3, 4, 9, 10.*

### 7) Reward Window Singular Level-Up Grammar (`src/ui/RewardWindow.js`)
In `showRewards`:
When formatting `leveledUpHeroes`:
- If `leveledUpHeroes.length === 1`:
  Format line as `${heroName} (${heroStar}) HAS LEVELED UP!`
- If `leveledUpHeroes.length > 1`:
  Format line as `${namesStr} LEVELED UP!`
*Source: Chapter 4, Panel 9 (`JENNA (★) HAS LEVELED UP!`).*

---

## 6. NOT IN THIS TASK (Do Not Implement)
These items are documented in `docs/NEXT_TASKS.md` and must NOT be built in this task:
1. Repeat-clear rewards of flat 1,000G across all floors.
2. Synthesis Chamber hero sacrifice system.
3. Core stat renames (Stamina and Dexterity unification).
4. 3x time flow and Master offline simulation.
5. Han and Jenna skill combining / awakening during town training.

---

## 7. Verification & Map Update Rules
1. Run syntax verification:
   ```bash
   node --check src/data/missions.js
   node --check src/data/rewards.js
   node --check src/data/enemies.js
   node --check src/art/enemies.js
   node --check src/combat/EnemyManager.js
   node --check src/scenes/TowerScene.js
   node --check src/ui/RewardWindow.js
   ```
2. Update `docs/CODEMAP.md` to document the new `goblin_armored` archetype, `ARMORED_GOBLIN` enemy stats, Floor 3 stage reward table entry, and `BRIGHT_FOREST_LIGHTING`.
3. Validate codemap integrity:
   ```bash
   node scripts/check_codemap.mjs
   ```
   Must output `CODEMAP OK`.

---

## 8. Final Report Format (Max 15 Lines)
End your response with this exact compact summary:
1. Files changed (one line per file).
2. 3 short manual test steps for the user.
3. Anything risky, skipped, or unfinished.
4. `CODEMAP updated: yes/no (<reason>)`
