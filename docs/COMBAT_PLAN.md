# Universal Combat Engine Architectural Plan (10x Combat Overhaul)

**Document:** `docs/COMBAT_PLAN.md`  
**Target:** Pick Me Up: Infinite Gacha (Three.js 0.160 + Vanilla JS + Vite)  
**Status:** Architecture & Engineering Blueprint (Planning Phase)  
**Constraint Check:** Plan only. No game runtime files modified. No external assets/libraries.

---

## 1. Executive Summary & North Star

The combat in *Pick Me Up: Infinite Gacha* currently suffers from architectural fragmentation: the player, squad AI companions, and enemies each execute combat through completely disconnected systems. Player melee hits occur instantly on frame zero through geometric distance cones; squad companions run simplistic hardcoded timer scripts; enemies deal damage before their weapon swing animations even begin; and ranged combat is split between a legacy straight-line manager (`Projectiles.js`) and a newly built ballistic arrow pool (`ArrowPool.js`).

### The North Star: One Universal Combatant Engine
To achieve a "10x upgrade" in combat quality, fluidity, and tactical depth matching the high-stakes permadeath fantasy of the manhua, the entire codebase must converge on **one unified combat engine**. 

```
                                  +-----------------------------+
                                  |     COMBAT DATA TABLES      |
                                  |  (Weapons, Spells, Skills)  |
                                  +--------------+--------------+
                                                 |
                                                 v
                                  +-----------------------------+
                                  |     UNIFIED COMBATANT       |
                                  |   (Shared State Machine)    |
                                  |  State: Windup/Active/Recov |
                                  |  Poise/Stagger, Mana, Stam  |
                                  +--------------+--------------+
                                                 |
            +------------------------------------+------------------------------------+
            |                                    |                                    |
            v                                    v                                    v
+-----------------------+            +-----------------------+            +-----------------------+
|     PLAYER ENTITY     |            |    SQUAD COMPANION    |            |     ENEMY ENTITY      |
|  (Han / User Input)   |            |  (Jenna, Eolka, etc)  |            |  (Goblins, Bosses)    |
|  OTS Camera / Combos  |            |  Tactical AI Driver   |            |  Behavior Tree Driver |
+-----------+-----------+            +-----------+-----------+            +-----------+-----------+
            |                                    |                                    |
            +------------------------------------+------------------------------------+
                                                 |
                                                 v
                                  +-----------------------------+
                                  |   SHARED RESOLUTION CORE    |
                                  | - Swept Capsule Hitboxes    |
                                  | - Ballistic Arrow/Spell Pool|
                                  | - Poise & Stagger Matrix    |
                                  | - Precision Block / Parry   |
                                  | - Universal Telegraph Decals|
                                  +-----------------------------+
```

Every character—Han Islat, Jenna, Aaron, Velkist, Eolka, Goblin Grunts, Shamans, and the Hobgoblin Chief—must instantiate the same core `Combatant` component. Combat must feel visceral, reactive, weighted, and fair:
1. **Attacks have real phases**: Windup $\rightarrow$ Active Strike Frames $\rightarrow$ Recovery.
2. **Hits follow geometry**: Blades deal damage when their mesh passes through a target's capsule, not because a button was clicked.
3. **Hits elicit physical reactions**: Every strike causes flinch, stagger, directional knockback, or hit-stop.
4. **Defense is skill-expressive**: Tight parry windows, stamina-managed guard, and true invulnerability-frame dodge rolls.

---

## 2. STEP 1: Forensic Code Audit of Current Combat

### 2.1 Inventory of Combat-Related Files
The following 31 files contain combat logic, damage calculations, hit detection, or combat visual feedback:

| File Path | Description |
| :--- | :--- |
| `src/player/Player.js` | 1,195-line monolith containing player melee combo state, cone hit-checks, stamina, guard, parry, bash, roll, and bow aiming/firing. |
| `src/combat/Ally.js` | Squad hero entity logic; hardcodes role-specific attack cooldowns, instant damage deals, and fallback/panic triggers. |
| `src/combat/SquadAI.js` | Squad formation positioning, tactical command dispatch (`ATTACK_TARGET`, `HOLD`, `FOLLOW`), and composure/panic checks. |
| `src/combat/Enemy.js` | Base enemy entity; manages health, tint flashes, morale drop thresholds, alert icons, and mesh-attached telegraph lines. |
| `src/combat/EnemyManager.js` | Spawns hunting ground mobs, clearing waves, and cave enemies; tracks alive enemy arrays and wave clearances. |
| `src/combat/GoblinAI.js` | AI state machine for Goblin Grunts, Archers, and Shamans; handles chase, windup, attack, circle, and hesitate states. |
| `src/combat/WolfAI.js` | AI state machine for Forest Wolves; coordinates pack circling, windup, pounce lunges, and flank attacks. |
| `src/combat/HobgoblinChief.js` | Boss AI logic; manages charge attacks, circular cleaves, ground slams, rage phases, and pillar stun collisions. |
| `src/combat/Boss.js` | Generic base class for boss units; defines positional damage multipliers (pinned $\times 2.0$, rear backstab $\times 1.5$, stunned $\times 1.5$). |
| `src/combat/Combat.js` | Utility script providing WebAudio oscillator parry pings, impact spark particles, and item breakage splinters. |
| `src/combat/Projectiles.js` | Legacy projectile manager simulating straight-line rays with bounding radius checks and poison damage over time. |
| `src/combat/ArrowPool.js` | Modern pooled ballistic arrow system with gravity, swept-segment continuous collision, headshots, and mesh embedding. |
| `src/combat/Telegraph.js` | Generates procedural 3D ground telegraph meshes (sectors, rings, rectangles) with dynamic opacity for boss attacks. |
| `src/combat/Commands.js` | Command wheel data structures (`ATTACK_TARGET`, `FOCUS_FIRE`, `DEFEND_ME`, `RETREAT`, `HOLD`, `SPREAD`, `FORM_UP`). |
| `src/combat/Drops.js` | Spawns physical loot drops (gold crystals, equipment, potions) upon enemy death. |
| `src/combat/Items.js` | In-dungeon consumable mechanics (health potions, stamina draughts, bandages). |
| `src/core/Stats.js` | Computes composite combat stats (`maxHp`, `damage`, `defense`, `critChance`, `reach`, `blockWindow`, `rollInvuln`) from stats and skills. |
| `src/data/rules.js` | Core RPG formulas, star promotion curves, level caps, and attribute scaling factors. |
| `src/data/skills.js` | Skill definitions, max levels, and passive combat stat modifier coefficients. |
| `src/data/enemies.js` | Base enemy stat configurations (HP, speed, base damage, detection ranges, reload timers). |
| `src/data/heroes.js` | Hero archetype templates, base attribute allocations (`str`, `agi`, `vit`, `int`, `wil`), and starter gear. |
| `src/art/weaponAnimations.js` | 3,103-line library of procedural bone rotations across 9 weapon classes, attack durations, hit-stops, and IK solvers. |
| `src/art/HeroRig.js` | Humanoid skeletal rig; binds weapons and shields to socket joints, controls material tints, hit-stop, and limb poses. |
| `src/art/EnemyRig.js` | Skeletal rigs and mesh hierarchies for goblins, wolves, slimes, and the hobgoblin boss. |
| `src/art/weapons.js` | Procedural 3D primitive geometry builders for swords, shields, bows, staves, spears, daggers, and maces. |
| `src/art/enemies.js` | Procedural 3D geometry builders for monster bodies, weapons, shields, and facial features. |
| `src/fx/SlashTrail.js` | Dynamic quad-strip ribbon meshes tracing weapon vertices during swings (currently purely cosmetic). |
| `src/fx/WeaponFX.js` | Elemental burst effects, shield impact flashes, and parry particles. |
| `src/ui/Hud.js` | 2D HUD managing player HP/stamina bars, reticles, floating damage numbers, and active buff icons. |
| `src/ui/PartyPanel.js` | Displays party health bars, panic alerts, and real-time stress indicators. |
| `src/scenes/TowerScene.js` | Main combat runtime orchestrator; updates player, enemies, allies, projectiles, camera, and collision each tick. |

---

### 2.2 Hit Detection & Damage Calculation Audit

#### Hit Detection:
1. **Player Melee (`Player.js:697-735`)**:
   - Uses an instantaneous flat geometric cone test: `dist <= maxRange` ($2.6\text{m}$ for mobs, $4.2\text{m}$ for boss) and `dot >= cos(55 deg)` ($110^\circ$ forward cone).
   - **Critical Defect**: Hit detection occurs on **frame 0** when the mouse button is pressed. The damage is calculated, applied, and floating text spawned *before the character's arm even starts swinging*.
2. **Player Bow (`Player.js:153`, `ArrowPool.js:250-307`)**:
   - Uses swept continuous segment intersection (`prevPosition` $\rightarrow$ `position`) against enemy vertical cylinders.
   - Detects headshots if contact occurs at $\ge 78\%$ of target height ($2.0\times$ damage).
   - **Critical Defect**: Only checks collisions against `enemies`. Arrows cannot hit squad allies or player, and cannot be used by enemies.
3. **Squad Melee (`Ally.js:530-583`)**:
   - Checks purely planar distance: `distToEnemy <= range`. If true and cooldown $\le 0$, it calls `enemy.takeDamage()` immediately on frame 0. No cone, no arc, no trajectory.
4. **Enemy Melee (`GoblinAI.js:233-245`)**:
   - Upon completing windup, immediately triggers `player.takeDamage()` or `ally.takeDamage()` if `dist <= attackRange + 0.5`. Damage is dealt on the exact frame the `attack` state begins; the visual swing animation plays *afterwards* in `handleAttack()`.
5. **Boss Attacks (`HobgoblinChief.js:356-369`, `540`, `592`)**:
   - Charge attack uses distance check during movement ($dist < 2.2\text{m}$). Cleave and slam use instantaneous radial/sector distance checks upon timer expiration.

#### Damage Calculation:
1. **Player Melee Damage Formula**:
   $$\text{Base} = (6 + 1.2 \cdot \text{str} + \text{level}) \cdot \text{starMult} \cdot \text{weaponMult}$$
   $$\text{Damage} = \text{isFinisher} ? \text{round}(\text{Base} \cdot 1.8) : \text{round}(\text{Base})$$
   - **Glaring Omission**: Enemy defense is **completely non-existent**. Enemies have HP, speed, and damage, but zero defense or armor rating. Damage is dealt directly to enemy HP without resistance mitigation.
2. **Squad Melee Damage Formula**:
   $$\text{Damage} = \text{round}(\text{baseDamage} \cdot \text{mult} \cdot (\text{isAfraid} ? 0.7 : 1.0))$$
   - Ignores weapon enhancements, reach calculations, enemy armor, and positional angles.
3. **Enemy Damage to Characters**:
   - Flat damage values from `data/enemies.js` (e.g., Grunt: 6, Archer: 5, Wolf: 9, Boss: 25-30). Player armor defense mitigates damage only through stat calculation, but allies lack active defense entirely.

---

### 2.3 Blocking & Defending Audit

1. **Player Defense (`Player.js:480-590`)**:
   - **Parry Window**: Evaluated if `blockTimer <= 0.18s` and attack angle $\le 60^\circ$. Negates $100\%$ damage, triggers metallic ping, hit-stop ($0.08\text{s}$), and sets attacker `staggerTimer = 0.8s`. Boss heavy attacks (`boss_cleave`, `boss_slam`) are hardcoded as unparriable.
   - **Angled Block**: Angle $\le 60^\circ$ reduces damage by $70\%$; $60^\circ - 90^\circ$ reduces damage by $40\%$; $> 90^\circ$ bypasses shield.
   - **Shield Durability**: Loses 2 durability per block. Breaks into wooden splinters when durability $\le 0$.
   - **Stamina Depletion & Guard Break**: Stamina cost = $\text{amount} \cdot \text{blockStaminaMult}$. If stamina $< \text{cost}$, player suffers Guard Break ($1.2\text{s}$ stun, takes unmitigated full damage).
2. **Squad Ally Defense**:
   - **Zero Active Defense**: Allies **cannot block, parry, or dodge**. They possess no shield raising logic, no stamina pool, and no evasion states. They stand in place taking full damage until reaching $30\%$ HP, where they freeze in panic.
   - *Lethal Save Hack*: A hardcoded passive check in `Ally.js:161` intercepts lethal damage if a nearby companion has *Knight's Determination*.
3. **Enemy Defense**:
   - Enemies possess **zero defensive states**. Enemies cannot block, parry, or dodge player attacks. They cannot raise shields, even though the Goblin Grunt model visually equips a wooden buckler.

---

### 2.4 Enemy Attacks & Hit Reactions Audit

1. **Enemy Attack Sequence**:
   $$\text{Chase} \xrightarrow{\text{dist} \le \text{range}} \text{Windup (telegraph pose)} \xrightarrow{\text{timer} \le 0} \text{Damage Dealt (Frame 0)} \xrightarrow{} \text{Visual Swing} \xrightarrow{} \text{Cooldown}$$
   - Because damage applies before the swing finishes, dodging during the swing is completely ineffective—the player was already hit at the start of the swing.
2. **Hit Reactions**:
   - Calling `Enemy.takeDamage()` executes only:
     ```javascript
     this.hp -= dmg;
     this.flashTimer = 0.1;
     if (this.rig) this.rig.setTint(0xffffff, 0.85);
     ```
   - **There is no hit animation or flinch on normal attacks**. Goblins do not stop, flinch, or interrupt their attack windup when struck by Attack 1 or Attack 2. They attack straight through the player's attacks.
   - **Stagger** only triggers if `applyKnockback()` is explicitly called (only executed by the player's 3rd combo finisher or shield bash).

---

### 2.5 Architectural Duplications, Inconsistencies & Hidden Bugs

1. **Two Competing Projectile Engines**:
   - `ArrowPool.js`: Modern ballistic simulation with gravity, continuous swept-segment collision, headshots, and mesh embedding (player-only).
   - `Projectiles.js`: Outdated straight-line raycaster with sphere-overlap checks (used by Jenna, Goblin Archers, Goblin Shamans, and Eolka).
2. **Two Competing Telegraph Systems**:
   - `Telegraph.js`: Scene-level system generating procedural red sectors, rings, and lines with dynamic alpha (used only by Hobgoblin Chief).
   - `Enemy.js:205`: Per-goblin `THREE.Line` attached to the mesh, toggled via JavaScript `setTimeout()` (which goes out of sync during pauses, lag, or hit-stop).
3. **Critical Parameter Mismatch Bug in `WolfAI.js:235`**:
   - In `WolfAI.js`:
     ```javascript
     target.takeDamage(dmg, false, 'pounce', wolf, camera, wolf.mesh.position)
     ```
   - In `Player.js:460`:
     ```javascript
     takeDamage(amount, camera, attackerPos = null, attackType = 'melee', attacker = null)
     ```
   - **The Bug**: `WolfAI` passes `false` into `camera`, `'pounce'` into `attackerPos`, `wolf` into `attackType`, and `camera` into `attacker`!
   - **Consequence**: `attackerPos` receives the string `'pounce'` instead of a Vector3. When `Player.js` attempts to calculate deflection angle with `calculateAttackAngle(..., attackerPos)`, vector math fails, producing `NaN`. **The player can never successfully block or parry a Wolf pounce!**
4. **Three Disconnected Attack Codebases**:
   - `Player.js` handles combos, stamina, durability, and camera shake.
   - `Ally.js` handles role cooldowns and hardcoded instant damage without animation sync.
   - `GoblinAI.js` / `WolfAI.js` / `HobgoblinChief.js` each contain bespoke attack and windup state machines.

---

### 2.6 Game Feel Post-Mortem: Why Current Combat Feels Subpar

1. **Lack of Physical Weight**: Instant damage on click means hits do not sync with visual blade contact.
2. **Hyper-Armor Enemies**: Enemies act like rigid stone statues until they die; normal hits produce no flinch or physical feedback.
3. **Binary Dodge Roll**: The roll provides $100\%$ invulnerability across its entire $0.35\text{s}$ duration with zero startup or recovery vulnerability, making it an unpunishable escape button.
4. **Missing Camera Focus**: Without a lock-on system, third-person melee attacks frequently swing into empty air if the camera rotates.
5. **No Visual Threat Clarity**: Normal enemy attacks provide no ground decals or distinct weapon gleams, making parry timing rely on memorizing unpolished bone rotations.

---

## 3. STEP 2: Subsystem Architectural Blueprints

---

### Part A: Bow & Archery Subsystem (Unifying Player, Squad & Enemies)

#### A.1 Current Bow Status & Remaining Deficiencies
The recent archery overhaul implemented upright bow geometry, parametric limb deflection ($\pm 0.16 \cdot d$), harmonic string vibration, over-the-shoulder (OTS) camera, and swept-segment headshots in `ArrowPool.js`. However, it remains an isolated player-only feature:
- Squad archers (Jenna) and enemy archers (Goblin Archer) still use straight-line rays from `Projectiles.js`.
- Arrows do not interact with shields; blocking an arrow triggers standard melee deflection rather than an arrow clattering or sticking into the wood.
- Enemies do not anticipate arrow trajectories or attempt evasive rolls.
- Bow melee attacks (bow slap/kick when rushed) are absent.

#### A.2 Universal Archery State Flow
All bow-wielding combatants (Player, Jenna, Goblin Archer) will operate under the shared state flow:

```
[NEUTRAL / IDLE]
       |
       v  (Aim Input or AI Acquire Target)
[NOCKING & AIM STATE]
  - Left arm raises bow to vertical high-ready.
  - Right hand retrieves arrow from quiver, seats nock on string anchor.
  - Movement speed throttled to 2.2 m/s (strafing mode).
  - Player: OTS camera zooms in, reticle contracts (48px -> 10px).
  - AI: Predicts target velocity vector over time-to-target.
       |
       v  (Hold Draw / Full Tension)
[DRAWING & CHARGE STATE]
  - Limbs flex parametrically; string vertex tracks right hand socket.
  - Stamina drains at 6/sec (Player) or draw timer charges (AI).
  - At full draw (> 0.55s), shot achieves maximum velocity (34 m/s) and flat trajectory.
  - Over-holding (> 3.5s) induces micro-tremor shake and accuracy penalty.
       |
       v  (Release Trigger)
[SHOOTING & RELEASE STATE]
  - Arrow unparents from rig and enters ballistic `ArrowPool`.
  - String executes damped harmonic vibration: $e^{-12t}\cos(45t)$.
  - Sound: Crisp string snap and whoosh.
       |
       v
[FOLLOW-THROUGH / RECOVERY]
  - 0.28s recovery before next nock cycle.
  - Can be canceled into Dodge Roll after 0.12s.
```

#### A.3 AI Archery Implementation (Jenna & Goblin Archers)
- **Unified Ballistics**: Both Jenna and Goblin Archers will fire real physical arrows from `ArrowPool.js` influenced by gravity ($g = -9.81\text{ m/s}^2$).
- **Predictive Leading**:
  $$\vec{P}_{\text{aim}} = \vec{P}_{\text{target}} + \vec{V}_{\text{target}} \cdot t_{\text{flight}}$$
  $$t_{\text{flight}} \approx \frac{\|\vec{P}_{\text{target}} - \vec{P}_{\text{shooter}}\|}{v_{\text{arrow}}}$$
  Jenna's *Keen Sight* talent increases lead accuracy to $95\%$, whereas Goblin Archers possess a $\pm 8^\circ$ dispersion cone that narrows the longer they remain stationary.
- **Dynamic Kiting AI**: If an enemy approaches within $4.5\text{m}$, archers enter `Evade` state—firing a quick hipfire snapshot ($60\%$ damage, high stagger) and back-rolling to re-establish $10\text{m}-14\text{m}$ stand-off distance.

---

### Part B: Staff & Magic Subsystem (Comprehensive Spellcasting Engine)

#### B.1 Magic Philosophy in *Pick Me Up* Lore
In Niflheimr and the Tower of Mobius, magic is rare, tactical, and devastating. Eolka (4-star Fire Mage) and Goblin Shamans should not feel like basic archers with glowing bullets. Spells require **channeling poses, mana management, strategic positioning, and physical elemental impact**.

#### B.2 Core Spell Types & Mechanics
All spells are data-driven entries in `SPELLS_TABLE`:

```javascript
export const SPELLS_TABLE = {
  fireball: {
    id: 'fireball',
    name: 'Concentrated Fireball',
    element: 'fire',
    castTime: 0.8,
    channeling: false,
    manaCost: 20,
    cooldown: 3.5,
    projectileSpeed: 16.0,
    radius: 2.4,
    baseDamage: 28,
    statusEffect: { type: 'burn', dps: 4, duration: 4.0 },
    knockback: 7.0,
    cameraShake: 0.12,
  },
  ice_spike: {
    id: 'ice_spike',
    name: 'Glacial Spike',
    element: 'ice',
    castTime: 0.5,
    manaCost: 15,
    cooldown: 2.0,
    projectileSpeed: 24.0,
    radius: 0.8,
    baseDamage: 18,
    statusEffect: { type: 'freeze', slowPercent: 0.5, duration: 3.0 },
    knockback: 3.0,
    pierce: 1,
  },
  chain_lightning: {
    id: 'chain_lightning',
    name: 'Arcing Lightning',
    element: 'lightning',
    castTime: 0.4,
    manaCost: 25,
    cooldown: 5.0,
    instantRay: true,
    range: 14.0,
    chainJumps: 3,
    baseDamage: 22,
    statusEffect: { type: 'stun', duration: 0.75 },
  },
  sanctuary_heal: {
    id: 'sanctuary_heal',
    name: 'Sanctuary Pulse',
    element: 'holy',
    castTime: 1.2,
    manaCost: 35,
    cooldown: 8.0,
    isAreaAura: true,
    radius: 5.0,
    healAmount: 30,
    cleanseDebuffs: true,
  },
  arcane_barrier: {
    id: 'arcane_barrier',
    name: 'Prismatic Ward',
    element: 'arcane',
    castTime: 0.3,
    manaCost: 20,
    cooldown: 12.0,
    shieldHp: 40,
    duration: 6.0,
  },
  meteor_strike: {
    id: 'meteor_strike',
    name: 'Cataclysmic Flare',
    element: 'fire',
    castTime: 2.0,
    manaCost: 60,
    cooldown: 15.0,
    groundTargeted: true,
    telegraphRadius: 4.5,
    delayBeforeImpact: 1.2,
    baseDamage: 65,
    statusEffect: { type: 'burn', dps: 8, duration: 5.0 },
    knockback: 14.0,
  }
};
```

#### B.3 Staff & Casting Poses
Using `src/art/weaponAnimations.js` joint conventions:
1. **Cast Windup (Channeling)**:
   - Two-handed staff planted or hoisted horizontally: right hand grips middle shaft, left hand extends forward open-palmed.
   - Staff head gem or focus points towards target, pulsing with elemental light.
   - Spine pitches forward slightly, feet plant in a grounded wide stance.
2. **Spell Release**:
   - Spine thrusts forward; right arm punches staff forward along $+Z$.
   - Left arm pulls back to counterbalance.
   - Staff head recoils with particle discharge.
3. **Recovery / Channel Interruption**:
   - Getting hit during cast windup interrupts the spell if incoming poise damage exceeds caster's stability, triggering a spell-fizzle puff of gray smoke.

#### B.4 Visual Effects Using Primitives & Particles Only (No External Textures)
All visual effects adhere strictly to project guidelines (primitives, mathematical blending, procedural meshes):
- **Fireball**: Rotating cluster of 8 golden/crimson `IcosahedronGeometry` meshes with additive blending and a trail of shrinking embers. Ground impact spawns an expanding planar ring (`RingGeometry`) that scorches the ground.
- **Glacial Spike**: Elongated faceted diamond (`CylinderGeometry(0.02, 0.25, 1.4, 4)`) colored light cyan (`0x88eeff`), emitting crystalline frost cubes that tumble and fade.
- **Chain Lightning**: Dynamic multi-segment jagged line (`BufferGeometry`) regenerating random perpendicular offsets every frame, connecting caster $\rightarrow$ target $\rightarrow$ adjacent enemies.
- **Sanctuary Heal**: Double rotating interlocking rings (`RingGeometry`) ascending from the floor accompanied by rising golden cross or diamond particles.
- **Arcane Barrier**: A glowing hexagonal geodesic dome (`IcosahedronGeometry`, detail 2, wireframe/semi-transparent) centered on the target hero.

#### B.5 Squad Mage AI (Eolka & Shamans)
- **Positioning**: Mages maintain a strict $8\text{m}-12\text{m}$ perimeter. If an enemy breaches within $5\text{m}$, the mage casts *Arcane Barrier* or executes a retreating dash.
- **Priority Tree**:
  1. *Lethal Threat to Ally*: Cast *Sanctuary Heal* or *Barrier* if an ally HP falls below $35\%$.
  2. *Crowd Control*: Cast *Glacial Spike* or *Chain Lightning* if $> 2$ enemies rush the vanguard.
  3. *High-Density Cluster*: Cast *Fireball* or ground-targeted *Meteor Strike* into enemy clusters of 3 or more.
  4. *Mana Conservation*: If mana $< 20\%$, switch to light staff kinetic energy bolts.

---

### Part C: Fighters, Melee & Defense Subsystem (Souls-like Weight & Manhua Impact)

#### C.1 Active Swing Hitboxes vs Instant Geometric Cones
The current instant cone check on click must be completely eliminated. Instead, melee attacks will use **Swept Capsule Hitboxes tied to Weapon Sockets**:
- Each weapon mesh defines two anchor points: `baseAnchor` (guard/hilt) and `tipAnchor` (blade tip).
- During active attack frames, the engine samples `tipAnchor` and `baseAnchor` world positions between `frame[N-1]` and `frame[N]`.
- This creates a continuous swept capsule volume. Any enemy capsule intersecting this sweep takes damage **at the exact visual moment of blade contact**.
- Multiple enemies in the sweep path are hit sequentially as the blade moves through them.

```
       Frame N-1 Tip                  Frame N Tip
             o----------------------------o
             |     SWEPT HITBOX VOLUME    |  <-- Tested against enemy capsules
             o----------------------------o
       Frame N-1 Base                 Frame N Base
```

#### C.2 Attack Flow & Combos
Combos will feature distinct input windows and branching paths:
1. **Light Attack Combo (LMB)**:
   - **Attack 1 (Horizontal Slash)**: Fast startup ($0.18\text{s}$), low recovery, $1.0\times$ damage, low knockback.
   - **Attack 2 (Diagonal Cleave)**: Follow-up ($0.22\text{s}$), $1.2\times$ damage, mid knockback.
   - **Attack 3 (Thrust / Overhead Finisher)**: Heavy commitment ($0.35\text{s}$), $1.8\times$ damage, guarantees enemy stagger and knockback.
2. **Heavy Charged Attack (Hold LMB / Shift+LMB)**:
   - Player charges weapon behind shoulder; weapon glows with tension sparks.
   - Fully charged release ($1.2\text{s}$ hold): Deals $2.5\times$ damage, deals high posture damage, and breaks enemy guard.
3. **Combo Buffering & Cancel Rules**:
   - Next combo input is buffered during the last $0.15\text{s}$ of the active strike window.
   - Attacks can be **Dodge-Canceled** during the startup/windup phase, but **cannot be canceled** once active swing frames commence (commitment).

#### C.3 Stamina & Posture System (Player, Squad & Enemies)
To prevent infinite spamming and reward tactical play, every combatant possesses a **Posture/Poise Bar** in addition to HP:
- **Player Stamina**:
  - Max stamina scaled by `vit` and `wil`. Light attacks cost 12; Heavy attacks cost 25; Dodge roll costs 20; Sprinting drains 8/s.
  - Zero stamina inflicts "Exhausted" state ($25\%$ slower movement, attacks deal half damage).
- **Poise / Posture Meter**:
  - Every combatant has a maximum posture (e.g., Goblin Grunt: 30, Goblin Leader: 120, Han: 100).
  - Light attacks deal 10 poise damage; Heavy attacks deal 35; Shield Bash deals 40.
  - When posture reaches 0, the combatant enters **Stagger / Posture Break** ($1.2\text{s}$ vulnerability, taking $1.5\times$ critical damage from all strikes).

#### C.4 Precision Defense: Parry, Guard & Dodge
1. **Parry (Active Frame Window)**:
   - Measured strictly from the moment block is pressed.
   - Active parry frames: $0.05\text{s} - 0.20\text{s}$ ($150\text{ms}$ sweet spot).
   - **Successful Parry**:
     - 0 damage taken, 0 stamina consumed.
     - WebAudio crisp high-pitched metallic ping + golden additive particle burst.
     - Hit-stop freeze on both attacker and defender for $0.10\text{s}$.
     - Instantly knocks attacker into a Vulnerable Stagger state ($1.0\text{s}$).
     - Han can immediately trigger an instant **Counter-Slash** ($2.2\times$ damage).
2. **Normal Block**:
   - Holding block after the parry window ($> 0.20\text{s}$).
   - Frontal arc coverage: $120^\circ$.
   - Absorbs $80\%$ of physical damage; remaining $20\%$ leaks through as **chip damage**.
   - Drains stamina proportional to attack poise damage.
   - If stamina drops to zero during block: **Guard Break** (shield flung open, $1.5\text{s}$ helpless stun).
3. **Dodge Roll with Real I-Frames**:
   - Total roll duration: $0.45\text{s}$.
   - **Startup (Vulnerable)**: Frames 0 to 2 ($0.00\text{s} - 0.05\text{s}$).
   - **Active Invulnerability (I-Frames)**: Frames 3 to 14 ($0.05\text{s} - 0.28\text{s}$). Attacks pass through without damage.
   - **Recovery (Vulnerable)**: Frames 15 to 22 ($0.28\text{s} - 0.45\text{s}$). Cannot attack or block; vulnerable to punishment.

#### C.5 Hit-Stop, Weight & Impact Juicing
- **Hit-Stop (Micro-Freeze)**: When a melee strike lands, the attacker's rig and target's rig pause bone animation evaluation for $0.06\text{s}$ (Light) or $0.12\text{s}$ (Heavy/Finisher). World particles continue to simulate. This produces the tactile sensation of a blade biting through flesh/bone.
- **Directional Knockback**: Targets are pushed along the horizontal projection of the swing vector, smoothly decaying via damping ($v = v \cdot e^{-8t}$).
- **Impact Sparks**: Additive particle bursts matched to weapon tier (E-tier: dull iron sparks; A-tier/Gold: luminous azure and amber flairs).

#### C.6 Lock-On Targeting System
- Pressing `Middle Mouse Click` or `Tab` engages Lock-On on the nearest visible enemy within $18\text{m}$.
- A sleek diamond reticle brackets the target.
- The camera orbits smoothly to keep Han and the locked enemy centered.
- Han automatically faces the locked target when moving forward/backward or strafing.
- Moving the mouse left/right during lock-on flicks the target lock to adjacent enemies.

#### C.7 Universal Enemy Telegraphs
Every dangerous enemy attack must communicate its danger clearly:
1. **Ground Decal Indicators**: Pre-cast areas render via pooled transparent decal meshes (`Telegraph.js`):
   - Red Sector ($90^\circ-180^\circ$) for cleaves.
   - Red Rectangle for charges and thrusts.
   - Expanding Red Circle for ground slams and explosive runes.
2. **Silhouette / Weapon Gleam**: $0.3\text{s}$ before an unparriable attack, a crimson gleam particle flashes on the enemy's weapon; for parriable heavy attacks, a bright white/yellow gleam flashes.

---

## 4. STEP 3: Core Engine Architecture & Roadmap

---

### 3.1 The Unified `Combatant` Engine Architecture

Rather than maintaining separate attack and damage logic across `Player.js`, `Ally.js`, and `Enemy.js`, all fighting entities will encapsulate an instance of `Combatant`.

```
+---------------------------------------------------------------------------------+
|                               CLASS: Combatant                                  |
+---------------------------------------------------------------------------------+
| Properties:                                                                     |
|  - entityType: 'player' | 'ally' | 'enemy' | 'boss'                             |
|  - rig: HeroRig | EnemyRig                                                      |
|  - stats: { hp, maxHp, poise, maxPoise, stamina, maxStamina, mana, maxMana }    |
|  - state: 'idle'|'move'|'attack'|'cast'|'aim'|'block'|'parry'|'dodge'|'stagger'  |
|  - activeAction: { spec, phase: 'windup'|'active'|'recovery', elapsed, duration }|
|  - statusEffects: Map<string, StatusEffectInstance>                             |
|  - weaponLoadout: { primary, secondary, offhand }                               |
+---------------------------------------------------------------------------------+
| Core Methods:                                                                   |
|  + update(delta, context)                                                       |
|  + executeAttack(attackId, comboIndex)                                          |
|  + executeCast(spellId, targetPosition)                                         |
|  + startAim() / releaseAim()                                                    |
|  + startBlock() / releaseBlock()                                                |
|  + triggerDodge(directionVector)                                                |
|  + receiveAttack(hitPayload): HitResult                                         |
|  + applyPoiseDamage(amount)                                                     |
|  + interrupt()                                                                  |
+---------------------------------------------------------------------------------+
```

#### Universal State Transition Matrix:

| Current State | Can Transition To | Transition Trigger / Condition |
| :--- | :--- | :--- |
| **IDLE / MOVE** | `ATTACK`, `CAST`, `AIM`, `BLOCK`, `DODGE` | Player input or AI behavior trigger. |
| **ATTACK (Windup)**| `DODGE` (Feint cancel), `STAGGER` | Roll input before active frames, or took heavy hit. |
| **ATTACK (Active)**| `STAGGER` | Cannot cancel; only interrupted by posture break. |
| **ATTACK (Recov)** | `ATTACK` (Combo buffer), `DODGE`, `IDLE` | Buffered input or roll cancel window. |
| **BLOCK** | `PARRY` (on enter), `IDLE` (on release), `GUARD_BREAK` | Initial $0.15\text{s}$ is parry; stamina depletion $\rightarrow$ Guard Break. |
| **DODGE** | `IDLE`, `ATTACK` (Dodge attack) | Roll timer expires or buffered roll-attack. |
| **STAGGER** | `IDLE`, `DEAD` | Stagger timer ($0.8\text{s}-1.5\text{s}$) expires, or HP $\le 0$. |
| **CAST** | `DODGE` (Cancel), `STAGGER` (Interrupted), `RECOVERY` | Spell releases, or poise broken during channeling. |

---

### 3.2 System Roadmap & Implementation Order

```
[Phase 1: Foundations]
   |--> System 1: Universal Combatant & State Machine (Large, High Risk)
   |--> System 2: Swept Capsule Hitbox & Collision Engine (Medium, High Risk)
   |
[Phase 2: Core Defense & Feel]
   |--> System 3: Poise, Stagger, Hit-Stop & Impact Juicing (Medium, Med Risk)
   |--> System 4: Precision Defense (Parry, Block, I-Frame Roll) (Medium, Med Risk)
   |
[Phase 3: Ranged & Magic Unification]
   |--> System 5: Unified Ballistic Projectile & Arrow Pool (Medium, Low Risk)
   |--> System 6: Spellcasting & Elemental Status Engine (Large, Med Risk)
   |
[Phase 4: Combat AI & Polish]
   |--> System 7: Squad AI Combat Behavior Tree (Medium, Med Risk)
   |--> System 8: Enemy Melee/Archer AI Modernization (Medium, Low Risk)
   |--> System 9: Lock-On Targeting & Camera Tracking (Small, Low Risk)
   |--> System 10: Universal Decal Telegraph System (Small, Low Risk)
```

#### Detailed Breakdown Table:

| System Name | Size | Risk Level | Core Dependencies | Primary Technical Challenge |
| :--- | :---: | :---: | :--- | :--- |
| **1. Universal Combatant Core** | **Large** | **High** | `HeroRig`, `EnemyRig`, `Stats` | Decoupling player/enemy entities without breaking dungeon lifecycle. |
| **2. Swept Capsule Hitboxes** | **Medium** | **High** | System 1, `weaponAnimations` | Fast mathematical swept capsule vs capsule math without frame drops. |
| **3. Poise & Impact Juicing** | **Medium** | **Medium** | Systems 1 & 2 | Tuning hit-stop, camera shake, and stagger timers to feel snappy, not sluggish. |
| **4. Precision Defense & Rolls** | **Medium** | **Medium** | Systems 1 & 3 | Strict frame-accurate i-frame windows and parry angle calculations. |
| **5. Unified Projectile Pool** | **Medium** | **Low** | System 1, `ArrowPool` | Generalizing `ArrowPool` to support Jenna, Goblin Archers, and allies. |
| **6. Spellcasting & Statuses** | **Large** | **Medium** | Systems 1 & 5 | Status effect ticking, primitive VFX shaders, and spell table dispatch. |
| **7. Squad AI Modernization** | **Medium** | **Medium** | Systems 1, 5, 6 | Coordinating ally roles (vanguard/tank/archer/mage) with smart threat targeting. |
| **8. Enemy AI Modernization** | **Medium** | **Low** | Systems 1 & 7 | Replacing `setTimeout` with simulation delta timers and true attack phases. |
| **9. Lock-On System** | **Small** | **Low** | `ThirdPersonCamera` | Smooth target orientation without restricting manual mouse override. |
| **10. Universal Telegraphs** | **Small** | **Low** | Three.js scene | Pooling plane/ring geometries to prevent GC heap allocation spikes. |

---

### 3.3 Combat Test Room (`combat-test.html` & Sandbox)

To build and tune combat without loading the entire Tower dungeon, Hub, gacha, and inventory, we will create a dedicated **Combat Sandbox Page**:
- **Entry File**: `combat-test.html` backed by `src/combat/artCombatTest.js`.
- **Environment**: A clean stone circular arena with distance markers ($2\text{m}, 5\text{m}, 10\text{m}, 15\text{m}$).
- **Target Dummies**:
  1. *Passive Training Dummy*: Infinite HP, displays received damage, hit-stop, and poise reduction.
  2. *Active Attacking Dummy*: Cycles through light strikes, heavy unparriables, and archer shots to test parry, block, and dodge timing.
  3. *Group Spawner*: Spawns 3 Goblin Grunts + 1 Shaman to test squad coordination and crowd control.
- **On-Screen Debug Panel (GUI)**:
  - Toggle weapon loadouts instantly (Sword & Shield, Greatsword, Spear, Bow, Staff).
  - Live readout of Player/Target state: `State`, `ActiveFrame`, `Poise`, `Stamina`, `I-Frame Status`.
  - Sliders for Parry Window ($0.10\text{s}-0.30\text{s}$), Hit-Stop ($0.0\text{s}-0.20\text{s}$), and Roll I-Frames ($0.1\text{s}-0.4\text{s}$).
  - Slow-motion slider ($1.0\times, 0.5\times, 0.1\times$) to inspect frame-by-frame hitbox sweeps.

---

### 3.4 Performance Risks & Mitigation Strategies

1. **Garbage Collection (GC) Stutters from Dynamic Objects**:
   - *Risk*: Creating `new THREE.Vector3()`, `new THREE.Mesh()`, or projectile objects inside the 60 FPS combat loop causes minor GC pauses (5-15ms frame drops), which ruins parry timing.
   - *Mitigation*: Strictly enforce **Zero Runtime Allocations**. Pre-allocate temporary vectors (`_v1`, `_v2`, `_box`, `_capsule`) at module scope. Pool all projectiles, telegraph meshes, particle points, and damage text DOM nodes.
2. **Three.js Draw Call Overhead from Particles & Telegraphs**:
   - *Risk*: Spawning individual `THREE.Mesh` objects for each spark or telegraph decal spikes draw calls $> 300$, crippling mobile/low-end laptops.
   - *Mitigation*: Use single-geometry `InstancedMesh` or point clouds (`THREE.Points`) for particles. Telegraph indicators share static pooled geometries with uniform scaling.
3. **Capsule Sweep Collision Complexity**:
   - *Risk*: Sweeping 5 heroes and 20 enemies against each other every frame ($25 \times 24 / 2 = 300$ continuous capsule-capsule checks) can consume $> 6\text{ms}$ per tick.
   - *Mitigation*: Two-tier broadphase filtering:
     1. Cheap 2D AABB / radius check ($Math.hypot(dx, dz) < reach + radius$).
     2. Only perform detailed capsule swept math if the broadphase overlaps.

---

### 3.5 What NOT to Do (Anti-Patterns & Bad Ideas for this Game)

1. **DO NOT introduce Physics Engines (Cannon.js, Rapier, Ammo.js)**:
   - *Why*: The game runs on Three.js 0.160 primitives in browser. Physics engines add 200KB+ bundle weight, introduce simulation tunneling bugs, and complicate tight arcadey combat control. Simple kinematic swept capsules and analytical ballistics are lighter, 100% deterministic, and feel far crisper.
2. **DO NOT implement overly complex 10-hit fighting game inputs**:
   - *Why*: *Pick Me Up* is an action RPG with squad tactical commands, not *Street Fighter*. Complex quarter-circle or multi-key button combinations overwhelm players who are also directing 4 squad companions. Stick to clean, readable Souls/Zelda inputs: Light combo, Charged Heavy, Block/Parry, Roll, and 2-3 Spell slots.
3. **DO NOT use external GLTF models or photorealistic textures**:
   - *Why*: Violates project rules. Procedural Three.js primitives give the game its distinct low-poly manhua aesthetic, keep bundle sizes negligible, and ensure instantaneous web loading.
4. **DO NOT keep using JavaScript `setTimeout` for combat timers**:
   - *Why*: `setTimeout` ignores delta time, breaks during tab blur, fails under frame drops, and prevents hit-stop or slow-motion mechanics from working properly. All timers must advance strictly via `delta * timeScale`.

---

### 3.6 Evaluation of Three Architectural Options

#### Option A: Safe Step-by-Step Upgrade (In-Place Patching)
- **Concept**: Retain existing file boundaries. Patch `Player.js` to add swept hitboxes; patch `Ally.js` to add bow/spell calls; patch `Enemy.js` to add flinch animations; fix bugs in `WolfAI.js`.
- **Pros**:
  - Lowest initial disruption; preserves existing scene wiring in `TowerScene.js`.
  - Can be landed in small incremental pull requests.
- **Cons**:
  - Does not solve architectural schizophrenia. `Player.js` remains a 1,500+ line monolith.
  - Duplication between player and ally logic persists.
  - High probability of regression whenever a shared combat formula changes.
- **Verdict**: **Rejected**. This perpetuates technical debt and will never achieve the cohesive "10x upgrade" feel.

#### Option B: Full Clean-Slate Rewrite of Combat Engine
- **Concept**: Delete existing combat code and build a brand-new combat module from scratch in an isolated directory, then rewire the entire game at once.
- **Pros**:
  - Perfect architectural purity. Cleanest possible code structure.
- **Cons**:
  - Massive blast radius. Breaks Tower gameplay, boss fights, floor progression, and UI until the entire rewrite is complete.
  - Extremely high risk of subtle regressions in permadeath, gacha stat scaling, and floor clear conditions.
- **Verdict**: **Rejected**. Too risky for a live, multi-feature codebase.

#### Option C: The Modular Hybrid Strategy (Recommended)
- **Concept**:
  1. Build the new engine core (`src/combat/engine/Combatant.js`, `HitboxSystem.js`, `SpellSystem.js`) alongside existing code.
  2. Verify and balance all weapon swings, parries, rolls, and spells in the dedicated `combat-test.html` sandbox page.
  3. Swap `Player.js`, `Ally.js`, and `Enemy.js` to inherit from or wrap `Combatant` one by one, keeping public interfaces (`takeDamage`, `update`) intact.
  4. Deprecate and remove redundant files (`Projectiles.js`, legacy hit detection) once parity is proven.
- **Pros**:
  - Achieves full engine unification with zero downtime or broken builds.
  - Combat feel is perfected and battle-tested in the sandbox before touching the main dungeon.
  - Preserves exact compatibility with `GameState`, `Stats.js`, `Hud.js`, and dungeon layouts.
- **Cons**:
  - Requires maintaining temporary adapter wrappers during the transition phase.
- **Verdict**: **STRONGLY RECOMMENDED**. This is the professional senior engineering path.

---

## 5. Summary & Key Decisions

### Top Recommendation
Adopt **Option C (Modular Hybrid Strategy)**. Build the unified `Combatant` engine and swept-hitbox architecture inside a dedicated test sandbox (`combat-test.html`), tune all 9 weapon classes, spells, parries, and i-frame rolls to perfection with dummy targets, and then integrate the unified engine into `Player.js`, `Ally.js`, and `Enemy.js` without ever breaking Tower dungeon gameplay.

---

### The 5 Biggest Decisions Needed from You:

1. **Combat Tempo & Input Style**:
   - *Souls-style commitment* (attacks cannot be canceled once swinging, tight stamina management, high punish) vs *Action-Hack-and-Slash* (generous dodge cancels, high mobility, fast multi-hit cancel combos)?
2. **Squad Micro-Control Depth**:
   - Should squad heroes auto-cast their spells and defenses based on their roles, or do you want direct active skill buttons (e.g., Press `1-4` to trigger Jenna's Snipe or Eolka's Meteor)?
3. **Friendly Fire & Piercing**:
   - Should wide melee sweeps or explosive spells (Fireball, Meteor) damage or stagger squad allies if they stand in the blast radius (hardcore manhua realism), or strictly target hostiles?
4. **Enemy Stagger Thresholds**:
   - Should regular goblin mobs flinch on *every single* hit (making Han feel like an unstoppable blademaster), or should they require a 2-to-3 hit combo build-up to break their poise?
5. **Magic System Access for Han**:
   - Is spellcasting exclusive to mage heroes like Eolka and enemy Shamans, or will Han Islat be able to equip staves, scrolls, or elemental weapon infusions as in later novel chapters?

---
*End of Combat Architecture Plan (`docs/COMBAT_PLAN.md`). No runtime files were modified.*
