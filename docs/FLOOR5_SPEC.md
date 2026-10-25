# Floor 5: Survival — Design & Technical Specification

## 1. Overview
- **Floor**: 5
- **Mission Type**: `SURVIVAL`
- **Objective**: `SURVIVE UNTIL THE TIMER ENDS!`
- **Duration**: `1800` seconds (`30:00`)
- **Core Philosophy**:
  - **Unscripted Simulation**: Nothing is scripted to force a death or guaranteed awakening. No hero is ever killed by script. A hero only reaches near-death (`<= 15% HP`) or dies if the real combat simulation takes them there under the game's existing permadeath rules.
  - **Party-Agnostic**: The party consists of whatever heroes the player brought into Floor 5. No hero names, classes, or slots are hardcoded.
  - **Same-Tier Enemy Scaling**: Enemies use the exact Floor 1 Goblin Grunt level and base stats from `src/data/enemies.js`. Threat comes from attrition (stamina drain, weapon blunting, arrow scarcity, bleeding, fear) and spatial pressure (leapers bypassing the frontline, climbers stacking onto the wall platform).

## 2. The 30:00 Event Timeline

| Elapsed (`t`) | Countdown | Phase | Pacing & Systemic Behaviour |
| :--- | :--- | :--- | :--- |
| `00:00` (`0s`) | `30:00` | **Arrival** | The party materializes inside a transient cyan deployment dome at the chokepoint entrance. As the dome fades, the 30:00 countdown begins. |
| `00:00–10:00` (`0–600s`) | `30:00–20:00` | **Chokepoint Attrition & Frontline Rotation** | Goblin Grunts arrive in small groups down the narrow cobblestone street. Frontline fighters hold the chokepoint and rotate out when stamina drops (`autoSwapStaminaPct: 0.25`), resting in the rear at `3x` stamina regen (`restStaminaRegenMult: 3`). |
| `10:00–25:00` (`600–1500s`) | `20:00–05:00` | **Blunt Blades, Low Arrows, Leapers & Trauma** | Cumulative kills blunt frontline swords (`bluntDamageMult: 0.35`), forcing fighters to use Shield Bash (`shieldBashDamage`). Ranged heroes run low on arrows and must recover spent shafts within `pickupRadius`. **Goblin Leapers** vault over the frontline (`leapRange`), requiring backline/archer interception. **Bleeding** (HP + stamina drain) and **Fear** (`0.7x` stat multiplier) appear under sustained pressure. |
| `25:00–29:00` (`1500–1740s`) | `05:00–01:00` | **Wall Platform Retreat & Goblin Stacking** | High crowd density pushes the party up the ramp onto the raised wooden walkway / wall platform (`platformHeight: 3.5m`). **Goblin Climbers** form multi-goblin towers (`stackHeight: 3`) at the wall base to scale onto the platform. |
| `29:00–30:00` (`1740–1800s`) | `01:00–00:00` | **Final 60s Surge & Final Stand** | Spawn rate and `maxAlive` peak. Timer UI shifts to warning at `60s` and critical pulse at `30s`. Heroes pushed to the brink may trigger Stress Awakenings or `Berserk` if simulation conditions are met. |
| `30:00` (`1800s`) | `00:00` | **Cyan Ghost Dissolve & Stage Clear** | At `00:00`, all surviving goblins freeze, turn into translucent cyan ghosts (`#00ffff`), and dissolve upward into particles over `3.5s`, followed by the `STAGE CLEAR` banner and reward payout. |

## 3. Mechanics

### 3.1 Frontline Rotation & Combat Efficiency
- **Swap Cooldown**: `swapCooldownSec: 8`.
- **Auto-Swap Threshold**: Frontline ally requests rotation when stamina falls below `autoSwapStaminaPct: 0.25` (25%).
- **Rear Rest Bonus**: Resting off-frontline multiplies stamina regeneration by `restStaminaRegenMult: 3`.
- **Clean-Hit Efficiency**: Killing or staggering a goblin with a single clean hit saves `oneCleanHitStaminaSavePct: 0.30` (30%) of the attack's stamina cost.

### 3.2 Weapon Durability & Shield Bash
- **Kills Until Blunt**: After `killsUntilBlunt: 35` hits/kills, a bladed weapon becomes blunt.
- **Blunt Penalty**: Slash attacks deal `bluntDamageMult: 0.35` (35% of normal damage).
- **Shield Bash Fallback**: Heroes equipped with a shield switch to blunt shield strikes dealing `shieldBashDamage: 18` base physical damage + knockback, bypassing the blunt blade penalty.

### 3.3 Arrow Scarcity & Recovery
- **Starting Quiver**: Ranged allies start with `start: 40` arrows.
- **Field Recovery**: Spent arrows embedded in corpses or cobblestones within `pickupRadius: 2.5` meters have a `recoverChance: 0.65` (65%) chance to be retrieved intact during lulls or micro-repositioning.

### 3.4 Status Effects: Bleeding, Fear & Near-Death
- **Bleeding**: Triggered by sustained lacerations. Ticks every `tickSec: 2.0` seconds for `hpPctPerTick: 0.015` (1.5% Max HP) and drains `staminaDrainPerSec: 2.5` stamina/sec.
- **Fear**: Applies a `statMult: 0.7` multiplier to Attack, Defense, and Attack Speed when triggered by `triggers: ['ally_near_death', 'surrounded_4_plus', 'ally_permadeath']`.
- **Near-Death & Rescue Window**: At `hpPct: 0.15` (15% HP), a hero enters Near-Death (staggered/kneeling). Allies have `rescueWindowSec: 6.0` seconds to intercept attackers or stabilize them before lethal follow-up hits land.

### 3.5 Stress Awakenings & Berserk
- Evaluated dynamically when a hero fights under extreme stress (low HP, low stamina, Fear, or Near-Death rescue):
  - `Basic Swordsmanship`
  - `Basic Sword-Shield Technique`
  - `Pain Tolerance`
  - `Composure`
  - `Quick Movements`
  - `Berserk`
- **Berserk State**: Lasts `durationSec: 20`, grants `statMult: 1.5` and `damageMult: 1.8`, drains `hpDrainPct: 0.02` Max HP/sec, and wraps the hero in a crimson particle aura (`#ff1a1a`).

### 3.6 Goblin Stack-Climbing
- When heroes occupy the raised wall platform (`platformHeight: 3.5`), `goblin_climber` units gather at the wall base and stack up to `stackHeight: 3` high, ascending at `climbSpeed: 1.4` m/s. Heavy strikes or shield bashes at the top goblin can topple the stack.

## 4. Layout & Environment
- **Setting**: Ruined medieval town at sunset.
- **Geometry**:
  - **Cobblestone Alleys**: Three converging approach lanes where goblins spawn (`spawnPoints`).
  - **Timber Houses**: Half-timbered medieval facades framing a narrow canyon-like street.
  - **Chokepoint Street**: `chokepointWidth: 3.2` meters wide—narrow enough for 1–2 frontline fighters to block.
  - **Raised Wall Platform / Wooden Walkway**: `platformHeight: 3.5` meters high, accessible via a side stair/ramp, overlooking the chokepoint street.
- **Atmosphere**: Warm orange sunset directional lighting (`#ff7b39`), deep twilight shadows (`#2a1b2e`), and upward-drifting ember particles (`emberCount: 120`).

## 5. Enemies
All Floor 5 goblins use the **exact Floor 1 Goblin Grunt base level and stats** from `src/data/enemies.js`:
1. **Goblin Grunt (`goblin_grunt`)**: Standard melee rusher; pressures the chokepoint.
2. **Goblin Leaper (`goblin_leaper`)**: Same Floor 1 base stats; uses a running vault (`leapDistance: 4.5`, `leapHeight: 2.2`, `cooldownSec: 7`) to jump over the frontline into the backline.
3. **Goblin Climber (`goblin_climber`)**: Same Floor 1 base stats; prioritizes forming 3-high goblin ladders (`stackHeight: 3`) against the raised wooden walkway/wall platform.

## 6. Animation List
| Actor | Animation Clip Key | Purpose |
| :--- | :--- | :--- |
| Hero (Frontline) | `shield_bash` | Blunt-blade fallback strike with knockback |
| Hero (Frontline) | `rotate_step_back` | Tactical retreat swap behind incoming vanguard |
| Hero (Ranged) | `arrow_scavenge` | Quick crouch to pull intact arrows from ground |
| Hero (Any) | `near_death_kneel` | `<= 15% HP` survival stagger during 6s rescue window |
| Hero (Any) | `awakening_burst` | Brief stance flare on skill awakening / `Berserk` |
| Goblin Leaper | `goblin_leap_vault` | Parabolic jump over frontline |
| Goblin Climber | `goblin_stack_base` | Bracing posture for bottom/middle stack goblin |
| Goblin Climber | `goblin_stack_climb` | Scrambling up allied goblin shoulders onto platform |
| Goblin (All) | `cyan_ghost_dissolve` | `00:00` freeze and upward cyan particle disintegration |

## 7. UI and VFX
- **0:00 Cyan Arrival Dome**: Spherical cyan energy shield (`#00ffff`) that expands and dissipates over `2.0s`.
- **Survival Timer HUD**: Top-center `MM:SS` countdown. Turns amber at `60s` (`warningSec: 60`) and pulsing red with heartbeat audio/vignette at `30s` (`criticalSec: 30`).
- **Weapon & Quiver Indicators**: Compact durability bar (flashes when blunt) and arrow count badge above ranged allies.
- **Status & Awakening Readouts**: Bleeding droplet icon, Fear purple tremor icon, Near-Death rescue ring timer, and floating skill awakening banner.
- **Berserk Red Aura**: Additive red rim-glow and rising crimson embers (`#ff1a1a`) using pre-allocated particle buffers.
- **00:00 Cyan Dissolve**: Material override tinting goblins `#00ffff` with vertical alpha clip and rising cyan motes before `STAGE CLEAR`.

## 8. Integration Points (Mapped to Existing Files)
- `src/world/`: Load sunset lighting preset, ember particle pool, chokepoint colliders (`chokepointWidth: 3.2`), and raised platform navmesh (`platformHeight: 3.5`) from `FLOOR5_CONFIG.layout` and `FLOOR5_CONFIG.lighting`.
- `src/combat/Ally.js`: Read `FLOOR5_CONFIG.rotation`, `efficiency`, `durability`, `arrows`, `bleeding`, `fear`, `nearDeath`, `stressAwakenings`, and `berserk`.
- `src/combat/Enemy.js`: Read `FLOOR5_CONFIG.variants` and `FLOOR5_CONFIG.stackClimb` for `goblin_leaper` vaulting and `goblin_climber` vertical stacking, plus `FLOOR5_CONFIG.endDissolve` at `t = 1800`.
- `src/player/Player.js`: Hook party tactical rotation triggers and survival timer state.
- `src/ui/`: Render `SURVIVE UNTIL THE TIMER ENDS!` objective banner, `60s`/`30s` countdown alerts, and `STAGE CLEAR` reward screen.

## 9. Test Plan
1. **Static Config Validation (`scripts/test_floor5_config.mjs`)**: verify duration, pacing, variants, numbers, skills, mission, rewards.
2. **Survival Systems (`scripts/test_floor5_survival.mjs`)**: pacing lookup, durability/shield bash, arrows, rotation regen, bleeding/fear/near-death, dissolve trigger.
3. **Repository Integrity**: `node scripts/check_codemap.mjs` -> `OK`; `node scripts/check_imports.mjs` -> `OK`.