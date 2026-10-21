# Universal Combat Engine Phase 2 — Staff & Spell Casting Audit

**Target:** Magic & Spellcasting Core Architecture (`src/combat/*`)  
**Scope:** Read-Only Audit of Existing Systems & Integration Blueprint for Phase 2  
**Date:** 2026-10-20  
**Constraints:** Zero changes to game files (`Player.js`, `Ally.js`, `Enemy.js`, dungeon, hub, gacha, UI remain untouched). Test harness isolated to `combat-test.html`.

---

## 1. Executive Summary & Audit Scope

Phase 1 successfully delivered the core Combatant state machine, 120° defense cone, parry slow-motion, dodge i-frames, and swept-capsule melee collisions running at 60 FPS ($1.295\text{ms}$ CPU tick across 31 active combatants).

Phase 2 introduces **Staff Combat and Magic Spellcasting** to this engine. This audit examines:
1. Current handling of `CAST` and `SPELLS_TABLE` across `Combatant`, `StateMachine`, `HitPipeline`, and `DamageResolver`.
2. Staff animation data, keyframes, and cast point anchors in `weaponAnimations.js` and `HeroRig.js`.
3. Existing VFX implementations (`WeaponFX.js`, `SlashTrail.js`, `ArrivalDome.js`) and their runtime overhead.
4. Existing projectile architectures (`ArrowPool.js` vs `Projectiles.js`).
5. Mathematical formulas for non-capsule geometric collision testing (spheres, cylinders/rings, cones, and ray chains).
6. Performance metrics and CPU/memory budgets for 30+ combatants.

---

## 2. Current Handling of CAST & Spells in Phase 1 Engine

| Subsystem | Current Phase 1 Implementation | Identified Gaps for Phase 2 |
| :--- | :--- | :--- |
| **`Combatant.js`** | • `classTags = new Set(...)`<br>• `castSpell(spellId)` checks tag and spends **stamina** (`this.spendStamina(spell.staminaCost)`)<br>• `statusEffects` Map stores `burn`, `freeze_slow`, `stun`, `poison`<br>• `SquadControllerStub` tracks 4 dummy skills | • No dedicated `mana` or `maxMana` resource (spends physical stamina)<br>• No mana regen timer or delay<br>• No active spell registry, cooldown tracker, or active barrier/ward buffer<br>• Status effects tick DOT damage but do not damp velocity (`slow`) or disable input/actions (`stun`) |
| **`StateMachine.js`** | • `COMBAT_STATES.CAST` (priority 65)<br>• Enters `this.currentAction = 'attack1'`, sets duration = `spell.castTime`<br>• On `stateTime >= duration`, transitions directly to `IDLE` | • No phase division (Startup $\rightarrow$ Cast Point $\rightarrow$ Recovery)<br>• No cast interrupt evaluation (any hit or flinch should interrupt unless protected by super-armor)<br>• No cast point release trigger (spell launches instantly or at expiration without precise anchor sync)<br>• No movement slowdown during casting (currently freezes or allows full walk) |
| **`HitPipeline.js`** | • Continuous segment-to-segment swept capsule collision between weapon anchors (`edgeBase` $\leftrightarrow$ `tip`) and target body capsules ($r=0.45\text{m}, h=1.80\text{m}$)<br>• Broadphase zero-allocation spatial hash grid (512 buckets) | • Completely ignores spells, projectiles, and AoE circles<br>• Cannot evaluate point-to-capsule, sphere-to-capsule, or ground ring intersection<br>• Filters out same-team combatants unconditionally; cannot route friendly spells (e.g. heals, wards) |
| **`DamageResolver.js`** | • Frontal 120° block/parry and dodge i-frame check<br>• Physical defense reduction: $\text{dmg} \times (1 - \text{defense})$<br>• Poise deduction & grunt flinch / elite break evaluation | • No concept of magic damage vs physical damage (elemental resistance or shield penetration)<br>• Does not process incoming status effects (burn DOT, freeze slow, stun)<br>• No damage absorption hook for magical wards / shield bubbles<br>• No healing resolution pipeline |
| **`CombatData.js`** | • `SPELLS_TABLE` stub contains only 2 entries (`fireball`, `arcaneNova`) configured with `staminaCost` | • Lacks mana costs, projectile speeds, explosion radii, cast animations, status durations, and cooldown definitions |

---

## 3. Staff Poses & CastPoint Anchors (`weaponAnimations.js` & `HeroRig.js`)

### 3.1 Staff Weapon Definition & Anchors (`src/art/weapons.js:530-563`)
The procedural staff model is a 1.70m dual-grip focus weapon with a floating octahedron gem orb:
- `anchors.grip`: `[0, 0, 0]` (central lower hold)
- `anchors.pommel`: `[0, 0.60, 0]` (weighted bottom cap)
- `anchors.edgeBase`: `[0, -0.82, 0.06]` (crown collar where prongs branch)
- `anchors.hit`: `[0, -0.97, 0]` (exact center of the floating crystal gem / orb)
- `anchors.tip`: `[0, -1.10, 0]` (top tip of the crown prongs)

### 3.2 HeroRig Integration (`src/art/HeroRig.js:713-720`)
- `HeroRig.getWeaponTipWorldPosition(target)` automatically queries `active.anchors.tip.getWorldPosition(target)` for equipped weapons.
- When `staff` is equipped, this returns the exact 3D world coordinate of the staff's emitting crown ($y \approx 1.7\text{m}$ to $2.1\text{m}$ depending on character pose).
- `HeroRig.setEmpowered(true)` already triggers the staff's gem mesh emissive boost, providing a built-in visual hook for cast charging.

### 3.3 Available Staff Attack Animations (`src/art/weaponAnimations.js:1570-1700`)
The animation table defines 3 distinct, high-quality two-handed staff movements ready to be mapped to spells:

1. **`attack1` — "Arcane Ground Slam"** (Duration: $0.52\text{s}$):
   - **Windup:** $[0.00\text{s}, 0.16\text{s}]$ (staff raised overhead with both hands, hips back).
   - **Strike / Impact:** $[0.16\text{s}, 0.32\text{s}]$, impact frame at $t = 0.23\text{s}$ (staff slams downward into ground, hips drop).
   - **Recovery:** $[0.32\text{s}, 0.52\text{s}]$ (settling back to guard).
   - *Ideal for:* Area-of-effect spells (Meteor, Arcane Nova, Ward deployment).

2. **`attack2` — "Quarterstaff Martial Sweep"** (Duration: $0.48\text{s}$):
   - **Windup:** $[0.00\text{s}, 0.14\text{s}]$ (torso twists clockwise, staff pulled back).
   - **Strike / Impact:** $[0.14\text{s}, 0.28\text{s}]$, impact frame at $t = 0.21\text{s}$ (wide horizontal arc sweep).
   - **Recovery:** $[0.28\text{s}, 0.48\text{s}]$ (weight resets).
   - *Ideal for:* Conical spells, wave cleaves, or defensive ward sweeps.

3. **`attack3` — "Charged Comet Thrust"** (Duration: $0.52\text{s}$):
   - **Windup:** $[0.00\text{s}, 0.15\text{s}]$ (staff drawn back along right flank, tip pointing forward).
   - **Strike / Impact:** $[0.15\text{s}, 0.30\text{s}]$, impact frame at $t = 0.22\text{s}$ (explosive forward spear-like thrust).
   - **Recovery:** $[0.30\text{s}, 0.52\text{s}]$ (recoil and return).
   - *Ideal for:* Linear projectiles and focused beams (Fireball, Ice Spike, Lightning Chain).

---

## 4. Existing Particle & VFX Code & Runtime Cost

1. **`src/fx/WeaponFX.js` (Sparks, Clash Stars, Dust):**
   - **Problem:** `spawnHitSparks()` dynamically instantiates new `THREE.MeshBasicMaterial`, new `THREE.Mesh` objects, adds them to `scene`, and runs standalone `requestAnimationFrame` closures that call `scene.remove()` and `mat.dispose()`.
   - **Cost:** Triggers severe garbage collector spikes (50–120 objects allocated per hit) and out-of-sync animation frames.
2. **`src/fx/SlashTrail.js` (Weapon Ribbon Trails):**
   - High quality quad ribbon mesh sampling anchor positions per frame. Fixed memory footprint once allocated.
3. **`src/fx/ArrivalDome.js` (Hexagonal Teleport Dome):**
   - Clean procedural geometry with wireframe overlay, but allocates temporary meshes on activation.
4. **Phase 2 VFX Requirement:**
   - Spells must **not** use the `WeaponFX.js` dynamic allocation pattern.
   - All spell visuals (charge glow at staff tip, projectile spheres, impact bursts, ground telegraph rings, and ward bubbles) must use a **pre-allocated pool of meshes/sprites** created at startup and hidden (`visible = false`) when inactive.

---

## 5. Projectile Pooling Mechanics: `ArrowPool` vs `Projectiles`

| Feature | `src/combat/ArrowPool.js` | `src/combat/Projectiles.js` | Phase 2 Unified Design |
| :--- | :--- | :--- | :--- |
| **Allocation Strategy** | Pre-allocated pool of 24 arrow objects at initialization. | Dynamically instantiates `new THREE.Group()` and `new THREE.Mesh()` upon `spawn()`. | Pre-allocated pool of **32 `SpellProjectile` objects** created at init. |
| **Memory / GC** | Zero GC allocations during flight. Reuses `Vector3` properties. | High GC churn; calls `scene.add()` and `scene.remove()` repeatedly. | Zero per-frame allocations; pooled meshes permanently reside in a single `Scene` group. |
| **Trajectory** | Ballistic arc with gravity (`-9.81 m/s²`) and wind drag. | Fixed straight-line Euler integration. | Parameterized trajectory: linear high-speed bolt (`fireball`, `iceSpike`) or targeted arc. |
| **Collision Shape** | Swept line segment between previous and current position. | Rough 2D radial distance check (`Math.hypot(dx, dz) < hitbox`). | Continuous line segment vs vertical capsule cylinder, preventing tunneling. |

---

## 6. Collision Shapes for Hit Pipeline Extension

To support all Phase 2 spells without garbage collection, `HitPipeline.js` must be expanded with zero-allocation geometric intersection tests:

### 6.1 Moving Sphere vs Vertical Capsule (Projectiles & Explosions)
Given a projectile moving from $\mathbf{P}_0$ to $\mathbf{P}_1$ with collision radius $R_p$, and a target cylinder capsule with center base $\mathbf{B}$, height $H$, and body radius $R_t$:
$$\text{distSq}(\text{Segment}(\mathbf{P}_0, \mathbf{P}_1), \text{Segment}([B_x, B_y + R_t, B_z], [B_x, B_y + H - R_t, B_z])) \le (R_p + R_t)^2$$
Uses existing `segmentToSegmentDistanceSq()` with zero allocations!

### 6.2 Horizontal Cylinder / Ring vs Vertical Capsule (Ground AoE & Decals)
For an area spell (e.g. Meteor or Arcane Nova) at center $(X_c, Z_c)$ with radius $R_{\text{aoe}}$ and vertical effect slice $[Y_{\min}, Y_{\max}]$:
1. **Horizontal distance check:**
   $$\Delta x^2 + \Delta z^2 \le (R_{\text{aoe}} + R_t)^2$$
2. **Vertical height overlap:**
   $$\max(Y_{\min}, B_y) \le \min(Y_{\max}, B_y + H)$$
Both tests take $< 10$ CPU instructions and zero memory allocations.

### 6.3 Conical Sector vs Vertical Capsule (Cone of Cold / Cleaves)
Given caster position $\mathbf{C}$, forward unit vector $\mathbf{F}$, range $R$, and half-angle $\theta$:
1. Check radial distance: $\|\mathbf{B} - \mathbf{C}\| \le R + R_t$.
2. Check horizontal angle: $\mathbf{F} \cdot \frac{\mathbf{B}_{xz} - \mathbf{C}_{xz}}{\|\mathbf{B}_{xz} - \mathbf{C}_{xz}\|} \ge \cos(\theta)$.

### 6.4 Ray / Chain Line vs Spatial Grid (Lightning Chain)
Ray from source $\mathbf{S}$ to target $\mathbf{T}$: finds nearest valid enemy within $R_{\text{chain}}$, resolves hit, then bounces to the next nearest unhit enemy within jump radius $R_{\text{jump}}$ (up to $N_{\text{jumps}}$ times). Uses spatial hash grid broadphase with pre-allocated array buffer.

### 6.5 Team Filtering & Friendly Fire Rules
- **Harmful Spells (Fireball, Ice Spike, Lightning, Meteor):**
  $$\text{target.team} \neq \text{attacker.team} \quad \land \quad \text{target.team} \neq \text{'neutral'}$$
- **Beneficial Spells (Heal, Ward):**
  $$\text{target.team} == \text{caster.team} \quad \land \quad \neg\text{target.isDead}$$

---

## 7. Current Performance Numbers & Phase 2 Budget

- **Phase 1 Baseline:**
  - Active Combatants: 31 (1 Hero + 3 Dummies + 27 Swarm Dummies).
  - CPU Frame Tick: **$1.295\text{ms}$** average, $1.90\text{ms}$ peak.
  - Frame Rate: Stable 60 FPS in Chromium WebGL.
  - Memory: 0 bytes/frame runtime heap allocation.
- **Phase 2 Performance Budget:**
  - Total CPU Tick: **$\le 2.50\text{ms}$** per frame (comfortably under the $16.6\text{ms}$ 60 FPS frame window).
  - Active Projectiles: 32 maximum pooled instances.
  - Active Decals / Rings: 8 maximum pooled instances.
  - GC Allocations: **Strictly 0 bytes in the simulation loop**.

---
*End of Audit (`docs/COMBAT_P2_AUDIT.md`). Ready for Argon Phase 2 Architecture Specification.*
