# Technical Audit: Bow Ranged Combat & Archery Animation System

**Audit Date:** 2026-10-20  
**Target Codebase:** Pick Me Up: Infinite Gacha (Three.js 0.160 + Vanilla JS + Vite)  
**Inspection Tools:** Playwright Headless WebGL (Chromium 155, SwiftShader, 60 FPS, 1280x720)  
**Audit Visual Evidence Directory:** `docs/screenshots_bow_audit/`  
**Inspected Files:**
- `src/art/weapons.js` (Bow geometry, materials, string, arrow, anchors)
- `src/art/HeroRig.js` (Socket attachments, weapon model lifecycle, draw updates)
- `src/art/hero.js` (Hero rig hierarchy, joints, limits, sockets)
- `src/art/weaponAnimations.js` (Data-driven poses, IK solver, draw evaluator)
- `src/player/Player.js` (Combat attack logic, hitboxes, durability)
- `src/player/ThirdPersonCamera.js` (Camera angles, mouse input, tracking)
- `src/ui/Hud.js` (2D overlay, reticles, combat indicators)
- `src/art/artWeaponTest.js` & `art-weapon-test.html` (Art test viewer)

---

## 1. Visual Inspection & Baseline Evidence

A dedicated visual QA pass was performed in the browser test viewer (`art-weapon-test.html`). Screenshots were captured across multiple angles (front, side profile, rear) with and without shield attachments:

1. `01_bow_mesh_single_anchors.png` — Isolated bow mesh with anchor spheres.
2. `bow_no_shield_side_idle.png` — Side profile of hero holding bow in rest stance.
3. `bow_no_shield_side_attack1_windup.png` — Attack 1 windup pose viewed from the side.
4. `bow_no_shield_side_attack1_strike.png` — Attack 1 release phase viewed from the side.
5. `bow_no_shield_front_trainBow.png` — Front view of training form drill.
6. `bow_with_shield_side_idle.png` — Bow equipped simultaneously with a wooden round shield.
7. `bow_with_shield_front_block.png` — Block pose with bow and shield equipped.

### Key Visual Findings from Browser Inspection:
- **String Does Not Flex:** During all attack keyframes, the bow string remains completely rigid and straight between the limb tips. The draw hand pulls backward in mid-air without touching or displacing the string.
- **No Visible Arrow:** In all attack animations and test previews, no arrow exists on the bow or in the character's hands. The hero draws and releases invisible empty air.
- **Horizontal "Crossbow / Gangster" Hold:** Attack poses tilt the bow horizontally flat (`handL` rotation) across the chest rather than upright, resembling a pistol or crossbow rather than traditional or recurve archery.
- **Severe Shield Collision:** When a shield is equipped, both the shield and bow attach to `sockets.handL`, causing the wooden shield disc to intersect and bifurcate the bow grip and bowstring.
- **Awkward Training Drill:** `trainBow` forces both elbows inwards at the groin/pelvis level, pointing the bow downward into the floor.

---

## 2. Step 1: Deep Codebase & Rig Audit

### 2.1 Bow Mesh Construction & Parts (`src/art/weapons.js`)
- **Dimensions & Geometry (`src/art/weapons.js:447-479`):**
  - Total vertical span: 1.20m along Y (`[-0.60 .. +0.60]`).
  - Grip: Cylinder of radius `0.021m`, height `0.22m` centered at `[0, 0, 0.018]`.
  - Risers / Limb Collars: Two boxes of dimensions `[0.034, 0.045, 0.046]` at `y = ±0.10, z = 0.016`.
  - Limbs: Constructed using 3 segmented cylinders per limb (`sign = ±1`):
    - Segment 1: `y` from `0.09` to `0.29`, radius `0.020` to `0.017`, `z` curves forward from `0.016` to `0.040`.
    - Segment 2: `y` from `0.27` to `0.47`, radius `0.017` to `0.014`, `z` curves backward to `-0.020`.
    - Segment 3: `y` from `0.45` to `0.60`, radius `0.014` to `0.010`, `z` curves back to `-0.130`.
  - Limb Tips: Octahedrons of radius `0.020m` placed at `y = ±0.595, z = -0.128`.
- **Bowstring (`src/art/weapons.js:841-851, 915-937`):**
  - Consists of two dynamic cylinder meshes: `stringTop` and `stringBot` (radius `0.003m`, length `1.0m`, unit geometry).
  - Controlled by internal helper `updateBowString(d)`:
    - Calculates `nockZ = -0.13 - currentDraw * 0.38`.
    - Orients `stringTop` from `[0, 0.59, -0.13]` to `nockPos = [0, 0, nockZ]`.
    - Orients `stringBot` from `[0, -0.59, -0.13]` to `nockPos`.
    - When `currentDraw > 0.01`, toggles `arrowMesh.visible = true`.
- **Arrow Mesh (`src/art/weapons.js:756-772, 853-856`):**
  - Built by `buildArrowGeometry(grade)`:
    - Shaft: Cylinder radius `0.005m`, length `0.62m` along Z (`[-0.31 .. +0.31]`).
    - Broadhead: 4-sided Cone radius `0.016m`, length `0.07m` at `z = 0.65`.
    - Fletching: Two intersecting thin boxes (`0.004 x 0.036 x 0.09` and `0.036 x 0.004 x 0.09`) at `z = 0.055`.
  - Embedded inside the bow model as `arrowMesh`, but **hardcoded to `arrowMesh.visible = false`** unless `setDraw(d)` is invoked with `d > 0.01`.
  - **No independent projectile mesh or scene entity exists.** There is no arrow pooling, collision, or ballistics.
- **Anchors (`src/art/weapons.js:476-479`):**
  - Defined anchors: `grip: [0,0,0]`, `pommel: [0, 0.60, -0.13]`, `tip: [0, -0.60, -0.13]`, `edgeBase: [0, 0.58, 0.03]`, `edgeTip: [0, -0.58, 0.03]`, `hit: [0, 0, 0.05]`.
  - **Missing Anchor:** No explicit `nock` anchor exists; string calculation hardcodes `-0.13` as resting string Z.

### 2.2 Rig Attachment & Off-Hand Coordination (`src/art/HeroRig.js`, `src/art/hero.js`)
- **Attachment Socket:**
  - Bow is attached to `sockets.handL` (`HeroRig.js:498`).
  - Position: `[0, 0, 0]` in `socket_handL` local space.
  - Default orientation in hand: Rest limb hangs along `-Y`. The bow riser sits in the left palm, curving backward toward `-Z`.
- **Right Hand (Draw Hand):**
  - Unattached. HandR floats free with no constraint linking it to the bowstring or nock point during standard game playback.
- **Shield Conflict (`HeroRig.js:513-550`):**
  - `HeroRig.equip()` does not check if the equipped weapon is a bow. If the character's inventory contains an offhand shield (`items.offhand`), `HeroRig` adds `shieldModel.group` directly to `this.model.sockets.handL`.
  - As a result, both the bow model and the shield model occupy the exact same socket, producing severe geometry overlap.

### 2.3 Current Bow Animations (`src/art/weaponAnimations.js`)
- **`idle` (`lines 1159-1180`):**
  - Puts Han in a slight 15-degree torso turn (`torso: [0.04, -0.15, 0]`). Left hand holds bow low at hip (`handL: [-0.45, 0.45, 0.12]`), right arm hangs relaxed. Looks like carrying a stick at the waist; no ready stance.
- **`attack1` (`Quick Archer Snapshot`, `lines 1182-1246`):**
  - Sideways stance (`rot.y = -1.15`), left arm raises horizontal (`shoulderL: [-1.48, 0.05, 0]`).
  - Right arm draws to cheek (`elbowR: [-1.45, 0, 0]`).
  - **Why it looks wrong:** The bow is rotated flat like a crossbow. The string does not bend. No arrow is spawned or released. The damage applies immediately on frame 0 in a melee cone.
- **`attack2` (`Power Piercing Shot`, `lines 1247-1308`):**
  - Longer windup (0.24s). Left arm stays horizontal.
  - **Why it looks wrong:** Identical posture to Attack 1 with slight timing variation. Still horizontal, still no arrow, still no string deformation.
- **`attack3` (`Triple Arrow Spread Shot`, `lines 1309-1370`):**
  - Intended as a spread shot.
  - **Why it looks wrong:** No multi-arrow mesh exists. Looks identical to single attack.
- **`block` (`lines 1372-1389`):**
  - Han brings left and right hands together across his chest holding the bow horizontally (`shoulderL: [-0.75, 0.25, 0.22]`, `elbowL: [-0.95, 0, 0]`).
  - **Why it looks wrong:** Uses the fragile wooden bow stave to parry swords and maces. In real combat, bows are never used as physical shields; archers dodge or parry with a buckler/bracer.
- **`trainBow` (`lines 1390-1401`):**
  - Cyclic 5-keyframe drill over 1.40s.
  - **Why it looks wrong:** Left hand points diagonally down across the groin; Han looks down at the floor rather than aiming at a forward archery target.

### 2.4 The Analytical 2-Bone IK Solver (`src/art/weaponAnimations.js:2370-2482`)
- **Function Name:** `solveTwoHandGripIK(parts, sockets, weaponSpec, twoHandWeight, bowDrawDist = 0)`
- **Math & Operation:**
  - Analytical trigonometry (Law of Cosines) solving shoulder angle ($\beta$) and elbow angle ($\alpha$).
  - For melee two-handed weapons: solves `shoulderL` and `elbowL` to reach `offHandGripLocal` on `sockets.handR`.
  - For `bow`: reverses the chain! Primary socket is `sockets.handL`. Target is the string nock position in bow local space: `_vTargetInChest.set(0, 0, -0.13 - nockDist * 0.38).applyMatrix4(_mChain)`. Solves `shoulderR` and `elbowR` so the draw hand reaches the nock point.
- **Current Limitations:**
  - `solveTwoHandGripIK` computes the joint angles for Han's arms, BUT it **never calls `weaponModel.setDraw(d)`**.
  - `evaluateWeaponPose` does not receive or hold a reference to `weaponModel`. Thus, while the arm reaches for the nock point, the string itself never flexes!
  - Upper limit on elbow angle is clamped to `[-1.55, -0.05]`. The wrist rotation (`handR`) is not dynamically aligned along the arrow shaft vector, causing the draw hand palm to point at unnatural angles.

### 2.5 Combat Trigger & Hit Logic (`src/player/Player.js:457-550`)
- **Instant Melee Cone (`Player.js:494-531`):**
  ```javascript
  // Hitbox cone 110 degrees, range 2.6 units
  const facingYaw = this.mesh.rotation.y;
  const forwardX = Math.sin(facingYaw);
  const forwardZ = Math.cos(facingYaw);
  const minCos = Math.cos((55 * Math.PI) / 180);
  // Iterates enemies: dist <= 2.6 (or 4.2 for boss)
  ```
  - **Instantaneous Hit:** Damage is calculated and applied on the exact frame the user clicks attack.
  - **Melee Only:** Range is hard-capped at 2.6 world units. Enemies at 5 or 10 meters distance cannot be hit.
  - **Zero Ballistics:** No projectile mesh, no velocity vector, no drop/gravity, no travel time.
  - **Durability Bug (`Player.js:549`):** Bow loses durability on physical contact with the melee cone instead of on arrow release.

### 2.6 Third-Person Camera & Controls (`src/player/ThirdPersonCamera.js`)
- **Controls & Input:**
  - Pitch & Yaw are controlled exclusively by Arrow keys (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`) or auto-turn (`ThirdPersonCamera.js:168-187, 205-235`).
  - **Mouse Input Disabled:** `handleMouse(mouseDelta)` is an empty function (`ThirdPersonCamera.js:130-132`) with the comment: `// Moving the mouse must NOT rotate the camera.`
  - Distance: Fixed at `6.0m` (or `4.5m` near / `8.5m` far).
  - Zoom: Controlled only by mouse scroll wheel (`lines 107-116`).
- **Aim Mode Support:**
  - No over-the-shoulder offset exists (`lookAheadOffset` only shifts forward during running).
  - No FOV zoom or right-mouse-button aiming mechanic exists.

### 2.7 2D HUD & Aiming Elements (`src/ui/Hud.js`)
- Contains HP bar, Stamina bar, Minimap, Boss bar, Party portraits, and Loot notices.
- **Zero Ranged HUD:** No crosshair, no center reticle, no draw power charge meter, no arrow count indicator.

### 2.8 Performance Budget & Resource Footprint
- **Current Render Cost (Measured via `art-weapon-test.html` WebGL Stats):**
  - Standalone Bow Mesh: 12 draw calls, 1,120 triangles.
  - Hero Character with Bow: 32 draw calls, 4,100 triangles.
  - In-Game Budget Target (Per GDD/Engineering rules):
    - 60 FPS on standard desktop/mobile WebGL.
    - Max 50 draw calls per combat encounter.
    - Primitives only (BufferGeometry), no textures.
    - Any arrow system must use an object pool (max 20-30 arrows in flight/stuck) to avoid GC allocation spikes.

---

## 3. Step 2: Complete Issue Ledger

| # | File | Line Range | What Looks / Works Wrong | Body Part / Component | Suspected Root Cause |
|---|---|---|---|---|---|
| **1** | `src/art/weapons.js` | 841–856, 915–937 | String remains stationary during attack animations; bow limbs do not flex under tension. | Bow Model (`stringTop`, `stringBot`, limbs) | `updateBowString(d)` is only called inside `setDraw()`, which is never invoked during combat or pose evaluation. |
| **2** | `src/art/weapons.js` | 756–772, 853–856 | No arrow is ever seen when firing; hero draws an empty bow. | Arrow Mesh | `arrowMesh.visible = false` is hardcoded; no projectile spawner or flight system exists. |
| **3** | `src/art/weapons.js` | 476–479 | Bow lacks a designated nock anchor point for IK targeting. | Weapon Anchors | Anchor dict defines `pommel`, `tip`, `hit`, and `edgeBase`, but omits `nock`. |
| **4** | `src/art/HeroRig.js` | 357–390 | `updateBowDraw()` explicitly forces `bowModel.setDraw(0)` on all attacks (`attack1`, `attack2`, `attack3`). | HeroRig Bow Controller | Hardcoded `else { bowModel.setDraw(0); }` overwrites any draw progress during attacks. |
| **5** | `src/art/HeroRig.js` | 498, 549 | Equipping both a bow and shield causes complete geometric penetration. | `sockets.handL` / Shield & Bow | `HeroRig.equip()` does not enforce two-handed exclusivity for bows; both attach to `handL`. |
| **6** | `src/art/weaponAnimations.js` | 1159–1180 | Idle stance carries bow horizontally like a stick at the hip. | `handL`, `shoulderL`, `torso` | Pose angles orient weapon along hip plane instead of an upright ready carry. |
| **7** | `src/art/weaponAnimations.js` | 1182–1370 | Attacks hold the bow horizontally flat across the chest like a gangster handgun. | `handL`, `shoulderL` | `handL.rotation` lacks the vertical alignment required for upright archery. |
| **8** | `src/art/weaponAnimations.js` | 1372–1389 | Hero blocks by holding the wooden bow stave across the chest. | Upper body / Bow limbs | Generic two-handed block copied from staff/greatsword; archers cannot block with a bow stave. |
| **9** | `src/art/weaponAnimations.js` | 1390–1401 | Training drill points the bow down at the hero's knees and groin. | `shoulderL`, `elbowL`, `handL` | Negative pitch angles aim at the floor instead of a horizon target. |
| **10** | `src/art/weaponAnimations.js` | 2436–2481 | Draw hand wrist tilts at awkward angles while pulling string. | `handR` (draw hand) | Solver aligns elbow and shoulder but does not orient wrist tangential to the arrow line. |
| **11** | `src/player/Player.js` | 494–531 | Bow attacks hit instantly in a 2.6m melee cone; zero range or projectiles. | Combat Logic / Hitbox | Bow uses the identical melee cone check as swords, daggers, and clubs. |
| **12** | `src/player/Player.js` | 549–550 | Bow loses durability by physically contacting enemies rather than shooting. | Durability System | Durability subtraction is tied to melee hit registration. |
| **13** | `src/player/ThirdPersonCamera.js` | 130–132 | Mouse movement does not rotate camera or aim. | Camera Input | `handleMouse` is deliberately empty; no mouse-look or aim mode exists. |
| **14** | `src/player/ThirdPersonCamera.js` | 80–120 | No shoulder-cam zoom or reticle alignment for aiming. | Camera View | Camera only supports fixed-distance orbiting around character root. |
| **15** | `src/ui/Hud.js` | 1–60 | No crosshair or aiming reticle exists in the UI. | HUD Overlay | No ranged combat UI elements have been created. |
| **16** | `art-weapon-test.html` | 240–243 | Bow Draw slider does not affect the hero model in "Show on Hero" mode. | Test Harness | Slider event listener only calls `activeModels[0].setDraw()`, ignoring `heroInstance`. |

---

## 4. Step 3: Complete Technical Design Prompt for Argon

The following quote block contains the complete, self-contained architecture and implementation specification for Argon. It includes all necessary rig specifications, joint coordinate conventions, mathematical limits, visual mechanics, and step-by-step instructions.

***

> # ARCHITECTURE SPECIFICATION: SYSTEMIC RANGED ARCHERY & AIMING ENGINE
> 
> **To:** Argon, Lead 3D Technical Artist & Combat Systems Architect  
> **Target Engine:** Three.js 0.160 (ESM) + Vanilla JS + Vite  
> **Rendering Constraints:** Low-Poly Primitives only (BufferGeometry, Box, Cylinder, Lathe, Octahedron), Toon materials, zero external assets/textures, 60 FPS target budget (<50 draw calls).  
> **Goal:** Transform the Bow from a static melee swatter into a fully realized, aimable, dynamic ranged weapon system with physical string/limb deformation, arrow projectile ballistics, over-the-shoulder aiming, and grade scaling.
> 
> ---
> 
> ### 1. HERO RIG & COORDINATE SPACE CONVENTIONS
> 
> The hero character is a Three.js hierarchy of `Group` nodes (meters):
> - **Coordinate Axes:** $+X$ = Character Left, $-X$ = Character Right, $+Y$ = Up, $+Z$ = Forward (Facing), $-Z$ = Backward.
> - **Limb Convention:** Limbs hang downward along $-Y$ in rest pose.
>   - Arm rotations: `shoulder.rot.x` negative swings limb forward/upward into $+Z/+Y$.
>   - Elbow flexion: `elbow.rot.x` strictly $[-1.55, 0.0]$ (hinge bending forearm forward/up).
>   - Shoulder abduction: `shoulderL.rot.z` positive abducts left arm outward ($+X$); `shoulderR.rot.z` negative abducts right arm outward ($-X$).
>   - Hand / Wrist: `hand.rot.x` cocks wrist along forearm plane; `hand.rot.y` twists forearm (pronation/supination); `hand.rot.z` cants blade/grip.
>   - Spine / Torso: `torso.rot.y` and `hips.rot.y` twist shoulders relative to feet.
>   - Leg flexion: `hip.rot.x` swings thigh forward ($-$) / back ($+$); `knee.rot.x` bends calf backward strictly $[0.0, +1.75]$.
> - **Hierarchy:**
>   `root` $\rightarrow$ `hips` $\rightarrow$ `torso` $\rightarrow$ `chest` $\rightarrow$ `neck` $\rightarrow$ `head`  
>   `chest` $\rightarrow$ `shoulderL` $\rightarrow$ `elbowL` $\rightarrow$ `handL` $\rightarrow$ `socket_handL`  
>   `chest` $\rightarrow$ `shoulderR` $\rightarrow$ `elbowR` $\rightarrow$ `handR` $\rightarrow$ `socket_handR`  
>   `hips` $\rightarrow$ `hipL` $\rightarrow$ `kneeL` $\rightarrow$ `footL`  
>   `hips` $\rightarrow$ `hipR` $\rightarrow$ `kneeR` $\rightarrow$ `footR`  
> 
> ---
> 
> ### 2. ARCHITECTURAL REQUIREMENTS TO DESIGN
> 
> Design the complete ranged archery system covering modules: `src/art/weapons.js`, `src/art/weaponAnimations.js`, `src/art/HeroRig.js`, `src/player/Player.js`, `src/player/ThirdPersonCamera.js`, `src/combat/ArrowPool.js` (new), `src/ui/Hud.js`, and `src/art/artWeaponTest.js`.
> 
> Cover each of the following sections with exact data tables, math, and code structures:
> 
> #### A. Stance & Hold (Relaxed Idle, Ready Stance, Form Alignments)
> 1. **Relaxed Low Carry (Idle):**
>    - The bow is held in the left hand (`sockets.handL`), hanging naturally at the left side, angled slightly backward along the leg.
>    - Right arm hangs relaxed. Torso facing forward with subtle breathing bob.
> 2. **Archery Ready Stance (Aim / Combat Ready):**
>    - **Authentic Side-On Stance:** Lower body and hips turned $70^\circ$ to $80^\circ$ perpendicular to target line (`hips.rot.y \approx -1.25` rad).
>    - Left foot pointed toward the target; right foot planted perpendicular for stability.
>    - Torso twists back toward target line (`torso.rot.y \approx 0.35` rad); head turned sharply over left shoulder facing target (`head.rot.y \approx 1.35` rad).
>    - Left bow arm extends forward toward target, holding bow upright (vertical axis aligned), elbow soft-locked (not hyperextended, `elbowL.rot.x \approx -0.06`).
>    - Right draw arm raised, hand near hip/quiver preparing to nock.
>    - Provide exact `[x, y, z]` Euler rotations for all 14 joints for both stances.
> 
> #### B. The Draw Cycle (6 Distinct Phases & Timings)
> Structure the archery cycle into a state-driven progression:
> 1. **Reach & Nock (0.00s – 0.20s):** Right hand reaches back to hip/back quiver, grips arrow nock, brings arrow to the bow riser.
> 2. **Raise Bow (0.20s – 0.35s):** Both arms elevate simultaneously; left arm pushes bow toward target; right hand seats nock on string.
> 3. **Draw (0.35s – 0.75s):** Right elbow pulls back in a high horizontal plane (behind the arrow vector); shoulders pinch; string draws back to facial anchor point (corner of mouth / jawline); draw distance $d$ increases from $0.0$ to $1.0$.
> 4. **Full Draw Hold (0.75s – 3.00s max):** Steady aim at full draw. Add subtle procedural breathing sway ($\pm 0.005$ rad). Accuracy/spread tightens to pinpoint. Holding beyond 3.0s causes arm fatigue / stamina drain and increasing tremor.
> 5. **Release / Loose (Instantaneous, 0.00s – 0.04s):** Right fingers snap open; string slips free; limbs spring forward; right hand recoils backward $4\text{cm}$ along jawline.
> 6. **Follow-Through & Settle (0.04s – 0.35s):** Bow tilts slightly forward in left hand from top limb weight; string vibrates with damped harmonic oscillation; arms settle back to ready stance.
> 
> #### C. Parametric Bow & String Deformation
> 1. **Dynamic String Geometry:**
>    - Instead of two static cylinders, model the string as a dynamic line/ribbon or 2-segment connected cylinder updated per frame.
>    - String endpoints anchor to top limb tip (`[0, 0.595, -0.128]`) and bottom limb tip (`[0, -0.595, -0.128]`).
>    - Vertex midpoint (nock point) pulls backward along $-Z$ as a function of `drawAmount` ($0.0$ to $1.0$):
>      $Z_{\text{nock}}(d) = -0.13 - d \times 0.38$.
> 2. **Limb Flexion:**
>    - When drawn, the top and bottom limbs must deflect backward toward $-Z$ and slightly inward toward $Y=0$.
>    - Formulate a parametric deflection formula or matrix deformation scaling limb angles proportionally to draw tension.
> 3. **Post-Release String Vibration:**
>    - On release, the nock point oscillates: $Z_{\text{vib}}(t) = -0.13 + A \cdot e^{-\lambda t} \cdot \cos(\omega t)$ with frequency $\omega \approx 45\text{ rad/s}$ and damping $\lambda \approx 12$, settling in $\sim 0.25\text{s}$.
> 
> #### D. Arrow Mesh & Ballistic Projectile System (`ArrowPool`)
> 1. **Arrow Mesh Definition:**
>    - Shaft: Length $0.72\text{m}$, radius $0.005\text{m}$ (wooden cylinder).
>    - Broadhead: Diamond/triangular razor head ($0.06\text{m}$, steel).
>    - Fletching: 3 radial vanes ($120^\circ$ apart, length $0.09\text{m}$).
>    - Nock: Carved wooden groove at tail.
> 2. **Nocked State:**
>    - While drawing, arrow mesh is parented to bow model, seated on the arrow shelf at `[0.015, 0.02, Z_{\text{nock}}]`, pointing along $+Z$.
> 3. **Projectile Flight (`ArrowPool.js`):**
>    - Pre-allocate a pool of 24 arrow meshes in the scene to avoid garbage collection.
>    - Physics: Launch position = bow arrow shelf world position. Launch velocity $\vec{v}_0 = \text{aimVector} \times V_{\text{launch}}$, where $V_{\text{launch}} = 22\text{ m/s} \times (\text{drawAmount})^{1.2}$.
>    - Trajectory: $\vec{x}(t + \Delta t) = \vec{x}(t) + \vec{v}(t)\Delta t$, $\vec{v}(t + \Delta t) = \vec{v}(t) + \vec{g}\Delta t$ ($g = -9.81\text{ m/s}^2$).
>    - Alignment: Arrow rotation quaternion updates every frame to match $\vec{v}(t)$ direction (tangent to arc) with slight axial spin ($\omega_{\text{spin}} \approx 15\text{ rad/s}$).
> 4. **Impact & Sticking:**
>    - Raycast step each frame: test segment from $\vec{x}(t)$ to $\vec{x}(t + \Delta t)$ against enemy hitboxes and environment colliders.
>    - On hit: embed arrow $10\text{–}15\text{cm}$ into target, parent arrow to hit object (so it moves with enemy), spawn impact particles, play hit sound, and fade out after $5.0\text{s}$.
> 
> #### E. Over-the-Shoulder Aim Mode & Camera
> 1. **Input Transition:**
>    - Holding **Right Mouse Button (RMB)** (or `KeyV` / `KeyC`) enters **Aim Mode**.
>    - Releasing RMB: if bow is drawn, fires arrow; if not drawn, exits aim mode.
>    - Tapping Left Mouse Button (LMB): fast hip-fire snapshot (0.3s quick draw, lower velocity, wider spread).
> 2. **Camera Over-the-Shoulder Zoom (`ThirdPersonCamera.js`):**
>    - Normal camera: distance $6.0\text{m}$, centered above target.
>    - Aim mode camera: smoothly lerps (`alpha = 10 * dt`) to shoulder offset:
>      - Distance: $2.4\text{m}$.
>      - Offset: $+0.55\text{m}$ to character's right, $+0.35\text{m}$ vertical elevation.
>      - Mouse Look Enabled: Mouse delta $X/Y$ directly controls camera yaw and pitch with configurable sensitivity ($0.0025$).
> 3. **Dynamic Reticle & Spread:**
>    - In `Hud.js`: render a minimalist 2D circular crosshair.
>    - Crosshair radius starts wide ($48\text{px}$) at start of draw, and smoothly shrinks to pinpoint ($10\text{px}$) at full draw ($0.45\text{s}$).
>    - Random shot dispersion angle $\theta_{\text{spread}} = \theta_{\text{max}} \times (1.0 - \text{drawAmount})^{1.5}$.
> 
> #### F. Movement While Aiming
> - While aimed: Character speed capped at slow walk ($2.2\text{ m/s}$). Sprint is disabled.
> - Character torso and feet maintain orientation facing the crosshair target vector (strafing movement forward/back/left/right) rather than turning character mesh in movement direction.
> 
> #### G. Hit Feedback & Weak-Point Damage
> - Target Hit Sparks: Golden/white impact sparks at contact point (`WeaponFX.js`).
> - Hit-Stop: $0.04\text{s}$ camera/time freeze on heavy full-draw hit.
> - Headshot Bonus: If arrow hits enemy head collider (top $20\%$ of enemy height), trigger critical hit: $2.0\times$ damage, distinct red damage number, and audible critical ping sound.
> 
> #### H. Soft Auto-Aim Assist (Non-Aim Hipfire)
> - When tapping LMB without RMB aim mode, cast a forward cone ($25^\circ$, up to $18\text{m}$). If an enemy is within cone, gently magnetize launch vector by up to $10^\circ$ toward enemy torso center.
> 
> #### I. Grade Scaling (E to S+)
> - **Visuals:** Grade E is simple recurve wood; Grade C adds iron reinforced belly and horn nocks; Grade A features polished composite laminate and glowing rune lines; Grade S/S+ features ethereal glowing string, crystalline tips, and particle motes.
> - **Stats:**
>   - Grade E: Base velocity $20\text{ m/s}$, Draw duration $0.65\text{s}$, Damage $1.0\times$.
>   - Grade B: Velocity $25\text{ m/s}$, Draw duration $0.55\text{s}$, Damage $1.4\times$.
>   - Grade S+: Velocity $34\text{ m/s}$, Draw duration $0.40\text{s}$, Damage $2.2\times$, Pierces 1 enemy.
> 
> #### J. Art Test Viewer Controls (`art-weapon-test.html`)
> Add archery debug panel:
> - `Draw Amount Slider` ($0.0$ to $1.0$) driving live hero model and string flexion.
> - Phase buttons: `Reach`, `Nock`, `Full Draw`, `Release`, `Vibrate`.
> - `Slow Motion Toggle` ($0.1\times$ speed).
> - `Fire Test Arrow` button spawning arrow into preview room with trajectory visualization line.
> - `Aim Mode Simulation` toggle with shoulder camera.
> 
> ---
> 
> ### 3. REQUIRED GEMINI IMPLEMENTATION PROMPT
> 
> At the end of your technical design, provide a complete, copy-pasteable step-by-step implementation prompt for Gemini. The prompt must enforce these mandatory constraints:
> 1. **Incremental Slices:** Implement in small, verifiable steps (1: Dynamic String & Arrow Mesh; 2: Stance & Draw Cycle Poses; 3: Ballistic ArrowPool & Collision; 4: Aim Camera & Reticle; 5: Combat & Grade Integration).
> 2. **Browser Verification Rule:** After each step, run Playwright automation in `art-weapon-test.html` and capture screenshots. Never claim code is complete without visual browser proof.
> 3. **Verification Scorecard:** Create `docs/BOW_QA.md` grading Stance, Draw, Release, Arrow Flight, and Aim Mode from 1 to 10. Every category must achieve $\ge 8/10$.
> 4. **Scope Discipline:** Never modify dungeon generation, gacha summons, town layout, or unrelated hub/UI modules.
> 5. **Ponytail Rule:** End with skipped items and user risks.

***
