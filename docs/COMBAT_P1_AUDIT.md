# Combat Engine Phase 1 Audit & Technical Specification

**Document:** `docs/COMBAT_P1_AUDIT.md`  
**Purpose:** Forensic codebase audit and technical inputs for Phase 1 of the Universal Combat Engine.  
**Constraint:** Read-only analysis. No game files modified. Only `combat-test.html` and isolated combat modules will be built in Phase 1.

---

## 1. Combatant Field Inventory: Comparison Across Entities

Currently, combatant state is fragmented across three distinct entity implementations (`Player.js`, `Ally.js`, and `Enemy.js`). The table below maps every combat-relevant field to unify into the new `Combatant` class:

| Conceptual Field | `Player.js` Property | `Ally.js` Property | `Enemy.js` Property | Unified `Combatant` Target Property |
| :--- | :--- | :--- | :--- | :--- |
| **Current Health** | `this.hp` | `this.hp` | `this.hp` | `this.hp` |
| **Max Health** | `this.maxHp` | `this.maxHp` | `this.maxHp` | `this.maxHp` |
| **Stamina (Current/Max)** | `this.stamina`, `this.maxStamina` | *Missing* (cooldown only) | *Missing* | `this.stamina`, `this.maxStamina` |
| **Stamina Regen Timers** | `this.staminaRegenDelay` | *Missing* | *Missing* | `this.staminaRegenDelay`, `this.staminaRegenRate` |
| **Poise / Posture** | `this.guardBreakTimer` (binary) | *Missing* | `this.morale`, `this.staggerTimer` | `this.poise`, `this.maxPoise`, `this.poiseRegenDelay` |
| **Armor / Defense** | Derived via `Stats.js` | Derived via `Stats.js` | *Missing* (flat 0) | `this.armorDefense`, `this.damageReduction` |
| **World Position** | `this.mesh.position` | `this.mesh.position` | `this.mesh.position` | `this.position` (Vector3 proxy to group) |
| **Facing Yaw** | `this.mesh.rotation.y` | `this.mesh.rotation.y` | `this.mesh.rotation.y` | `this.facingYaw` (synced to group) |
| **Team / Faction** | Implicitly player | `owner: 'player'` | `owner: 'enemy'` | `this.team` (`'player'` \| `'enemy'` \| `'neutral'`) |
| **Entity Archetype** | Vanguard (Han) | Novice, Scout, Berserker, Mage | Grunt, Archer, Shaman, Wolf, Boss | `this.roleTag`, `this.isBoss`, `this.isElite` |
| **Equipped Weapon** | `this.weapon` (`weaponType`, `damageMult`) | `this.hero.equipment.weapon` | `this.weaponType` (string) | `this.weapon` (Item/Weapon object with spec) |
| **Equipped Shield** | `this.shield` (`blockMult`, `durability`) | `this.hero.equipment.offhand` | *Missing* (mesh only) | `this.shield` (Item/Shield object with spec) |
| **Skeletal Rig Link** | `this.rig` (`HeroRig`) | `this.rig` (`HeroRig`) | `this.rig` (`EnemyRig`) | `this.rig` (`HeroRig` \| `EnemyRig`) |
| **State Machine State** | Ad-hoc booleans (`isBlocking`, `isRolling`) | Ad-hoc timers (`attackCooldown`, `flinchTimer`) | `this.state` ('chase', 'windup', 'attack') | `this.state` (instance of `StateMachine`) |
| **Active Action Spec** | `this.comboStep`, `this.attackTimer` | `this.attackAnimTimer` | `this.stateTimer` | `this.activeAction` (`spec`, `phase`, `t`, `duration`) |
| **Invulnerability Window**| `this.invulnerableTimer`, `this.isRolling` | *Missing* | `this.isInvulnerable` (Boss only) | `this.iFrameTimer`, `this.isInvulnerable` |
| **Hit-Stop Timer** | `this.hitStop` | *Missing* | In `HeroRig` only | `this.hitStopTimer` |
| **Damage Flash / Tint** | `this.damageFlashTimer`, `this.hitTimer` | `this.damageFlashTimer`, `this.flinchTimer` | `this.flashTimer` | `this.damageFlashTimer` |
| **Knockback Vector** | Direct translation in `attack()` | *Missing* | `this.knockbackX`, `this.knockbackZ`, `dur` | `this.knockbackVelocity` (Vector3 with decay) |
| **Status Effects** | Handled in `Projectiles.js` ticks | Handled in `Projectiles.js` ticks | `this.poison` (attacker property) | `this.statusEffects` (`Map<string, StatusEffect>`) |
| **Death State** | `this.dead`, `this.deathTimer` | `this.dead`, `this.isDying`, `this.deathTimer` | `this.dead`, `this.isDying`, `this.deathElapsed` | `this.isDead`, `this.deathTimer` |
| **Target Reference** | `this.targetEnemy` (auto mode) | `this.targetEnemy`, `this.targetPos` | `this.target` | `this.currentTarget` |

---

## 2. Damage Call Sites & Damage Taking Audit

Below is the complete registry of every line of code in the project where damage is applied:

| File Path | Function / Context | Line Number | Target Called | Signature / Parameters Passed | Critical Issues |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/player/Player.js` | `performShieldBash` | Line 408 | `enemy.takeDamage(5)` | `(amount)` | Ignores enemy armor; instantaneous 110° cone. |
| `src/player/Player.js` | `attack` | Line 717 | `enemy.takeDamage(...)` | `(damage, isFinisher, this.mesh.position)` | Instant hit on frame 0 of click before swing animation plays. |
| `src/combat/ArrowPool.js` | `update` | Line 287 | `enemy.takeDamage(...)` | `(finalDamage, isHeadshot, closestSegPt)` | Only damages enemies; cannot hit player or allies. |
| `src/combat/Projectiles.js` | `update` (player arrow/fire) | Line 89 | `enemy.takeDamage(...)` | `(damage, false, p.mesh.position)` | Straight-line ray; crude AABB cylinder check. |
| `src/combat/Projectiles.js` | `update` (enemy projectile) | Line 106 | `player.takeDamage(...)` | `(p.damage, null, p.mesh.position, 'projectile')` | Bypasses camera shake correctly, checks shield. |
| `src/combat/Projectiles.js` | `update` (enemy projectile) | Line 128 | `ally.takeDamage(...)` | `(p.damage)` | Ally has no defense, takes 100% raw damage. |
| `src/combat/Projectiles.js` | `update` (poison DoT) | Line 153 | `target.takeDamage(...)` | `(eff.dps)` | Ticks flat damage every frame without resistance. |
| `src/combat/Ally.js` | `performMeleeAttack` | Line 580 | `enemy.takeDamage(...)` | `(dmg, false, this.mesh.position)` | Instant hit on cooldown completion without swing synchronization. |
| `src/combat/GoblinAI.js` | `handleWindup` | Line 235 | `player.takeDamage(...)` | `(damage, camera, goblin.mesh.position, 'melee', goblin)` | Damage applied on frame 0 of transition to `attack` before swing anim plays. |
| `src/combat/GoblinAI.js` | `handleWindup` | Line 239 | `ally.takeDamage(...)` | `(damage, goblin)` | Ally receives raw damage, no guard or dodge check. |
| `src/combat/WolfAI.js` | `updateWolfPack` (Pounce) | Line 235 | `target.takeDamage(...)` | `(dmg, false, 'pounce', wolf, camera, wolf.mesh.position)` | **CRITICAL BUG**: Arguments swapped! String `'pounce'` passed into `attackerPos`, causing `NaN` in parry angle calculation! |
| `src/combat/WolfAI.js` | `updateWolfPack` (Pounce) | Line 236 | `target.takeDamage(...)` | `(dmg, wolf)` | Ally takeDamage signature. |
| `src/combat/HobgoblinChief.js`| `update` (Boss Charge) | Line 358 | `player.takeDamage(...)` | `(25, camera, this.mesh.position, 'melee', this)` | Distance check (< 2.2m) during continuous charge. |
| `src/combat/HobgoblinChief.js`| `update` (Boss Charge) | Line 366 | `ally.takeDamage(...)` | `(25)` | Hits allies during charge path. |
| `src/combat/HobgoblinChief.js`| `update` (Boss Cleave) | Line 540 | `player.takeDamage(...)` | `(30, camera, this.mesh.position, 'boss_cleave', this)` | Unparriable by hardcoded type string check. |
| `src/combat/HobgoblinChief.js`| `update` (Boss Cleave) | Line 545 | `ally.takeDamage(...)` | `(30)` | Allies take 30 unmitigated damage. |
| `src/combat/HobgoblinChief.js`| `update` (Boss Slam) | Line 592 | `player.takeDamage(...)` | `(20, camera, this.mesh.position, 'boss_slam', this)` | Drains 100% of damage in stamina if blocked. |
| `src/combat/HobgoblinChief.js`| `update` (Boss Slam) | Line 597 | `ally.takeDamage(...)` | `(20)` | Allies take 20 unmitigated damage. |
| `src/combat/EnemyManager.js` | `clear` | Line 546 | `enemy.takeDamage(...)` | `(9999)` | Debug wipe on dungeon floor reset. |

---

## 3. Weapon Animation Timing & Data Exposure (`weaponAnimations.js`)

In `src/art/weaponAnimations.js`, weapon attacks are already structured with frame-accurate timing parameters accessible via `getAttackSpec(weaponKind, actionName)`.

### Empirical Timings for Core Weapon Classes:
```javascript
// Data extracted directly from WEAPON_ANIMATIONS table:
sword: {
  attack1: { duration: 0.46, hitWindow: [0.16, 0.26], trailWindow: [0.15, 0.28], hitStop: 0.05, cameraShake: 0.16 },
  attack2: { duration: 0.44, hitWindow: [0.14, 0.24], trailWindow: [0.13, 0.25], hitStop: 0.05, cameraShake: 0.16 },
  attack3: { duration: 0.54, hitWindow: [0.20, 0.32], trailWindow: [0.19, 0.34], hitStop: 0.08, cameraShake: 0.24 }
}
greatsword: {
  attack1: { duration: 0.68, hitWindow: [0.25, 0.40], trailWindow: [0.23, 0.43], hitStop: 0.085, cameraShake: 0.26 },
  attack2: { duration: 0.64, hitWindow: [0.22, 0.38], trailWindow: [0.20, 0.40], hitStop: 0.085, cameraShake: 0.26 },
  attack3: { duration: 0.76, hitWindow: [0.30, 0.48], trailWindow: [0.28, 0.50], hitStop: 0.12,  cameraShake: 0.35 }
}
spear: {
  attack1: { duration: 0.44, hitWindow: [0.14, 0.24], trailWindow: [0.13, 0.25], hitStop: 0.05, cameraShake: 0.16 },
  attack2: { duration: 0.42, hitWindow: [0.12, 0.22], trailWindow: [0.11, 0.23], hitStop: 0.05, cameraShake: 0.16 },
  attack3: { duration: 0.52, hitWindow: [0.18, 0.30], trailWindow: [0.17, 0.32], hitStop: 0.08, cameraShake: 0.22 }
}
dagger: {
  attack1: { duration: 0.36, hitWindow: [0.12, 0.21], trailWindow: [0.11, 0.23], hitStop: 0.035, cameraShake: 0.12 },
  attack2: { duration: 0.34, hitWindow: [0.10, 0.19], trailWindow: [0.09, 0.21], hitStop: 0.035, cameraShake: 0.12 },
  attack3: { duration: 0.42, hitWindow: [0.15, 0.25], trailWindow: [0.14, 0.27], hitStop: 0.06,  cameraShake: 0.18 }
}
staff: {
  attack1: { duration: 0.52, hitWindow: [0.18, 0.30], trailWindow: [0.17, 0.31], hitStop: 0.05, cameraShake: 0.22 },
  attack2: { duration: 0.48, hitWindow: [0.16, 0.28], trailWindow: [0.15, 0.29], hitStop: 0.05, cameraShake: 0.22 },
  attack3: { duration: 0.60, hitWindow: [0.24, 0.38], trailWindow: [0.22, 0.40], hitStop: 0.09, cameraShake: 0.28 }
}
```

### Integration into the New State Machine:
1. **Startup Phase (Windup)**: From $t = 0$ to $t = \text{hitWindow}[0]$. Character commits to attack. Can only feint/cancel into dodge roll during first $0.08\text{s}$.
2. **Active Phase (Strike Sweeps)**: From $t = \text{hitWindow}[0]$ to $t = \text{hitWindow}[1]$. The swept capsule hitbox is active. Any target intersecting the blade sweep takes damage and poise damage.
3. **Recovery Phase**: From $t = \text{hitWindow}[1]$ to $t = \text{duration}$.
   - **Hit-Cancel Window**: The moment a hit connects during the active phase, the recovery phase becomes immediately cancelable into a dodge roll or next buffered combo strike.

---

## 4. Driving `HeroRig.js` from the Combatant

`HeroRig.js` updates bone rotations and socket transforms via `rig.update(dt, state)`:
```javascript
rig.update(dt, {
  action: 'attack1',         // Poses: 'idle', 'walk', 'run', 'attack1'..'attack3', 'block', 'roll', 'death'
  actionTime: 0.18,          // Elapsed action time in seconds (advances animation keyframes)
  moving: false,             // Locomotion flag
  speed: 0.0,                // Real horizontal speed (drives walk vs run blend)
  sprinting: false,          // Sprint modifier
  mood: 'neutral',           // Facial expression
  camera: cameraInstance,    // For slash trail camera alignment
  bowDrawDist: 0.0           // Parametric bow string and limb draw distance (0.0 to 0.45m)
});
```

### Existing Socket Position Query Methods:
The new swept hitbox pipeline does not need to guess joint coordinates; `HeroRig` already exposes world position query helpers:
- `rig.getWeaponEdgeBaseWorldPosition(vec3)`: Returns the world coordinate of the sword guard / staff grip (`anchors.edgeBase`).
- `rig.getWeaponTipWorldPosition(vec3)`: Returns the world coordinate of the blade / spear / staff tip (`anchors.tip`).
- `rig.getWeaponHitWorldPosition(vec3)`: Returns the center of mass hit impact anchor.
- `rig.getShieldHitWorldPosition(vec3)`: Returns the shield center surface anchor for sparks and parry flashes.

---

## 5. Weapon Data, Reach, Durability & Grade Scaling

### Data Locations:
1. **Grade Multipliers (`src/data/items.js:1-9`)**:
   - `E`: Multiplier `0.8` (Gray `#9e9e9e`)
   - `D`: Multiplier `1.0` (Green `#4caf50`)
   - `C`: Multiplier `1.2` (Blue `#2196f3`)
   - `B`: Multiplier `1.45` (Purple `#9c27b0`)
   - `A`: Multiplier `1.75` (Orange `#ff9800`)
   - `S`: Multiplier `2.1` (Crimson `#e91e63`)
   - `S+`: Multiplier `2.6` (Gold `#ffd700`)
2. **Item Templates (`src/data/items.js` & `src/combat/Items.js`)**:
   - `damageMult`: Multiplier applied to hero base attack stat.
   - `maxDurability`: Total weapon durability before breakage (40 for rusty sword, 60 for iron sword, 80 for steel).
   - `reach`: Extended reach in meters (default 2.0m; mace = 2.4m, spear = 2.8m).
   - `blockMult`: Defense absorption factor for shields (wooden shield = 1.0, iron kite shield = 1.4).

---

## 6. Enemy Storage, Management & Encounter Density

- **Manager**: `EnemyManager.js` (`this.enemies = []`).
- **Encounters**:
  - Hunting grounds: 12 mobs (8 grunts, 4 archers).
  - Cave / Mines: 8 to 12 slimes / rock crawlers (slimes split into 2 mini-slimes on death).
  - Tower Clearings: 4 to 8 enemies per wave, with multiple clearing waves active simultaneously.
- **Maximum Active Density**: Between 15 and 25 simultaneous enemies on screen during large ambushes or Floor 5 boss add spawns.
- **Update Loop**: Every tick, `EnemyManager.update()` iterates over `this.enemies`, running AI state machines (`GoblinAI`, `WolfAI`) and updating rigs.

---

## 7. Sandbox Test Environment (`art-weapon-test.html`) Architecture

`art-weapon-test.html` and `src/art/artWeaponTest.js` provide a clean, standalone harness that loads Three.js without bootstrapping game state.
- **Scene Setup**: Simple `THREE.Scene`, `THREE.PerspectiveCamera(45)`, `THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })`, `HemisphereLight`, `DirectionalLight`, and a `GridHelper(24, 24)`.
- **Safe Zero-Side-Effect Imports**:
  - `src/art/hero.js` (`createHeroModel`)
  - `src/art/HeroRig.js` (`HeroRig`)
  - `src/art/weapons.js` (`createWeaponModel`, `createShieldModel`)
  - `src/art/weaponAnimations.js` (`getAttackSpec`, `WEAPON_ANIMATIONS`)
  - `src/art/presets.js` (`PRESETS`)
  - `src/combat/ArrowPool.js` (`ArrowPool`)
  - `src/fx/SlashTrail.js` (`SlashTrail`)
- **Isolation Guarantee**: None of these modules touch `GameState`, `Inventory`, `SceneManager`, or local storage. `combat-test.html` can safely reuse this identical harness.

---

## 8. Root-Cause Analysis of the Wolf Parry Bug

### Location:
`src/combat/WolfAI.js:235` vs `src/player/Player.js:460`.

### The Code:
In `WolfAI.js`:
```javascript
target.takeDamage(dmg, false, 'pounce', wolf, camera, wolf.mesh.position);
```
In `Player.js`:
```javascript
takeDamage(amount, camera, attackerPos = null, attackType = 'melee', attacker = null)
```

### The Breakdown:
- Argument 1: `amount = dmg` (9) $\rightarrow$ Correct.
- Argument 2: `camera = false` $\rightarrow$ Destroys camera shake call.
- Argument 3: `attackerPos = 'pounce'` (String!) $\rightarrow$ Expects `THREE.Vector3`.
- Argument 4: `attackType = wolf` (Object!) $\rightarrow$ Expects string ('melee', 'boss_cleave', etc.).
- Argument 5: `attacker = camera` (Camera object!) $\rightarrow$ Expects enemy instance.
- Argument 6: `wolf.mesh.position` $\rightarrow$ Discarded into undefined.

### The Failure Cascade:
When `Player.js` evaluates blocking or parrying:
```javascript
const angle = calculateAttackAngle(this.mesh.rotation.y, this.mesh.position, attackerPos);
```
`calculateAttackAngle` expects `attackerPos.x` and `attackerPos.z`. Because `attackerPos` is the string `'pounce'`, `attackerPos.x` is `undefined`. Vector difference calculation computes `NaN`. The dot product fails, the angle evaluates to `0` or `NaN`, and parry/block logic fails to execute.

---

## 9. Game Loop, Delta Time & Hit-Stop Mechanics

1. **Delta Time**:
   - Computed in `TowerScene.js:1205` via `performance.now() * 0.001`.
   - Clamped to maximum $0.05\text{s}$ to prevent physics tunneling on lag spikes.
2. **Global Time Scale**:
   - Currently rudimentary: `this.slowMotionTimer -= delta; effectiveDelta = delta * 0.3;`.
   - Handled locally in `TowerScene`, not accessible globally to other systems.
3. **Hit-Stop (Micro-Freeze)**:
   - When player hits an enemy or parries:
     ```javascript
     if (this.player.hitStop > 0) {
       this.player.hitStop -= effectiveDelta;
       effectiveDelta = 0.001;
     }
     ```
   - Throttles the entire scene's `effectiveDelta` down to 1ms.
   - Inside `HeroRig.js:117`, `hitStopTimer` freezes bone evaluations and jitters `root.position.x` slightly ($(\text{Math.random()} - 0.5) \cdot 0.02$).
   - Enemies currently do not possess independent hit-stop timers.

---

## 10. Performance Benchmarks & Geometry Profile

Using exact procedural generator profiling:
- **Hero with Sword + Shield**: 33 mesh draw calls, 4,054 triangles.
- **Goblin Grunt Enemy**: 28 mesh draw calls, 2,866 triangles.
- **Encounter Profile (5 Heroes + 20 Grunts)**:
  - Total Mesh Draw Calls: **725 draw calls**.
  - Total Scene Triangles: **77,590 triangles**.
- **Frame Budget Target**:
  - $60\text{ FPS} \rightarrow 16.6\text{ms}$ per frame.
  - Geometry rendering: $\sim 4.5\text{ms} - 6.5\text{ms}$ on typical mobile/integrated GPUs.
  - Combat simulation budget remaining: **$\le 3.5\text{ms}$ per tick**.
  - **Requirement**: Swept capsule broadphase filtering is mandatory. A brute-force pairwise test ($25 \times 24 / 2 = 300$ continuous capsule tests) would consume $4\text{ms}-7\text{ms}$, exceeding the CPU frame budget.

---
*End of Combat Phase 1 Audit (`docs/COMBAT_P1_AUDIT.md`).*
