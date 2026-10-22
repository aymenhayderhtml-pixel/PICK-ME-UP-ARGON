# Next Tasks: Backlog & Manhua Conflicts (Chapter 4)

This document tracks features deferred from the Floor 3 alignment task (derived from Chapter 4 of the manhua) and documents conflicts between the manhua canonical lore and the current game engine.

---

## 1. Deferred Tasks Backlog

### Task 1: Repeat-Clear Floor Rewards System (1,000G Flat Clear)
- **Size**: Small
- **Files Likely Involved**:
  - `src/data/rewards.js`
  - `src/ui/RewardWindow.js`
  - `src/core/GameState.js`
- **Description**:
  In Chapter 4 (panel 10 & 11), replaying previously cleared floors (e.g., Floor 1 or Floor 3) awards a flat reward of `1,000G` with no additional material drops, gems, or summon tickets. The game currently grants full material formula payouts on every replay. Add repeat-clear detection (`isFirstClear = false`) that pays out the canonical flat 1,000G.

---

### Task 2: Synthesis Chamber Hero Sacrifice System
- **Size**: Large
- **Files Likely Involved**:
  - `src/hub/SynthesisChamber.js` (or new UI `src/ui/SynthesisWindow.js`)
  - `src/core/GameState.js`
  - `src/ui/RosterWindow.js`
  - `src/art/town/landmarksWork.js`
- **Description**:
  In Chapter 4 (panel 12), the Master enters the Synthesis Chamber with the prompt: `DRAG AND DROP THE HEROES YOU WANT TO SACRIFICE TO BE SYNTHESIZED!`. Despairing or useless 1-star heroes are permanently sacrificed to enhance base stats or transfer traits/skills to prime heroes (e.g., Han inheriting Composure from Toby). Build the UI modal and sacrifice consumption logic.

---

### Task 3: Core Stat Alignment (Stamina & Dexterity)
- **Size**: Medium
- **Files Likely Involved**:
  - `src/core/Stats.js`
  - `src/data/heroes.js`
  - `src/ui/RosterWindow.js`
  - `src/combat/DamageResolver.js`
- **Description**:
  In Chapter 4 (panel 5 status window), heroes have 4 universal primary attributes:
  `STRENGTH`, `INTELLIGENCE`, `STAMINA`, `DEXTERITY`.
  The codebase currently has historical divergences (`hpMax`/`staminaPool` vs `STA`, `agility`/`crit` vs `DEX`). Standardize hero data definitions, level-up stat gains, and UI status cards to match the canonical 4-stat schema.

---

### Task 4: 3x Time Flow & Master Offline Routine
- **Size**: Medium
- **Files Likely Involved**:
  - `src/core/LoginSimulation.js`
  - `src/core/DailyDecisionEngine.js`
  - `src/core/GameState.js`
- **Description**:
  In Chapter 4 (panel 4), time inside Mobius and the Waiting Room flows 3 times faster than in the real world: `IF TIME FLOWS THREE TIMES FASTER IN HERE AND THE LOBBY, THE NEXT TIME I CAN LOG IN WILL BE IN THREE DAYS.` (1 Master real day = 3 Mobius days). Align the offline login simulation so that real-world absence converts to 3x simulated game days of hero training and facility activity.

---

### Task 5: Dynamic Skill Awakening & Combining (Han Sword-Shield Techniques)
- **Size**: Medium
- **Files Likely Involved**:
  - `src/core/TrainingEngine.js`
  - `src/data/skills.js`
  - `src/ui/Notices.js`
  - `src/combat/CombatData.js`
- **Description**:
  In Chapter 4 (panel 8), rigorous training triggers a skill awakening event:
  `SKILL AWAKENED! HERO HAN (★)'S ‘BASIC SWORDSMANSHIP’ AND ‘BASIC SHIELD TECHNIQUES’ ARE COMBINING TO CREATE A NEW SKILL.`
  `HAN (★)'S ‘BASIC SWORD-SHIELD TECHNIQUES (LV 3)’ HAVE BEEN ACQUIRED!`
  Implement skill combination rules where mastering parent techniques synthesizes an upgraded unified technique with custom animation sets.

---

## 2. Conflicts with the Game Engine

1. **Floor 3 Geometry & Clearing Layout vs Wave Density**:
   - *Manhua*: Floor 3 is an open bright forest clearing where the party encounters a single tight squad of 4 Armored Goblins.
   - *Current Game*: `src/world/floorLayouts.js` generates a 4-clearing linear trail spanning 130 meters designed for 30+ enemies. Placing only 4 goblins in clearing 1 leaves clearings 2, 3, and 4 completely empty unless the floor layout is customized for Floor 3.

2. **Jenna MVP vs Real-Time Dynamic Scoring**:
   - *Manhua*: Jenna Cirai earns MVP on Floor 3 first clear through lethal archery support while Han tanks.
   - *Current Game*: MVP in `TowerScene.js` is dynamically calculated based on raw damage dealt and kills (`player.damageDealt + player.kills * 20`). Because the human player directly controls Han, Han almost always outscores AI Jenna unless scoring weights or script bonuses are introduced.

3. **Repeat Run Spawning Mechanism**:
   - *Manhua*: Repeat runs explicitly spawn `GOBLIN LV4 x2` and award `1,000G`.
   - *Current Game*: The game currently spawns the exact same enemy count and rolls standard procedural loot every time a floor is entered, regardless of whether it was previously cleared.

4. **1-Star Party Morale & Disobedience in Battle**:
   - *Manhua*: On Floor 3, three newly summoned 1-star heroes refuse to engage the enemy, panicking and remaining at the entry boundary.
   - *Current Game*: All heroes assigned to the active party obediently follow SquadAI attack commands and charge into battle, regardless of star rating or fear levels.

5. **Lobby Time Dilation vs Real-Time Progression**:
   - *Manhua*: Time dilation is continuous (3:1 ratio).
   - *Current Game*: Time advances only in discrete daily ticks triggered by sleeping or upon launching the game via `LoginSimulation.js`.
