# Universal Combat Engine Phase 2.5 — Visual Audit & Issues Log

**Audit Scope:** Visual inspection of `combat-test.html` via 22 high-resolution screenshots at 1280x720.  
**Date:** 2026-10-20  

---

## 1. Visual Defect Log

| # | Screenshot | Severity | Issue Description |
|---|---|:---:|---|
| 1 | `01_start_view.png` | **CRITICAL** | **Floating & Detached Weapons:** Han's sword and offhand shield, Eolka's sword, and dummy weapons float up to 0.4m away from hands due to forearm mesh/hand bone mismatch and missing `item.kind` recognition in `mapItemToModel`. |
| 2 | `01_start_view.png` | **HIGH** | **Unidentifiable Combatant Teams:** All characters use identical plain white shirt meshes and grey trousers with no team decals or floating name/HP tags; player, ally, and enemies cannot be distinguished visually. |
| 3 | `01_start_view.png` | **HIGH** | **Arena Cropping & Panel Occlusion:** The arena circle and outer rings are severely cut off at bottom/right; the giant fixed right debug panel occludes the right third of the arena and hides the cluster dummies. |
| 4 | `01_start_view.png` | **MEDIUM** | **Hotkey Conflict:** Direct spells occupy keys 1–6 while squad skills are relegated to F1–F4/Z–V, violating the master design plan (squad skills must be 1–4, spells Q/E/R/F/T/G). |
| 5 | `01_start_view.png` | **MEDIUM** | **Missing Reset & Respawn Flow:** No in-engine Reset button or 'R' key exists to restore health/mana/poise/cooldowns or revive dead combatants; no auto-respawn toggle is present. |
| 6 | `02_hero_mid_attack.png` | **HIGH** | **Empty / Garbled Event Feed:** The Combat Event Bus Feed displays empty space or corrupted dot/dash artifacts with no timestamps or event details. |
| 7 | `03_ally_and_enemy_up_close.png` | **HIGH** | **Wrong Equipped Weapon on Mages & Dummies:** Eolka and Shaman hold generic swords instead of staves; Elite Knight holds a normal sword instead of greatsword; Cluster Grunts hold swords instead of daggers. |
| 8 | `04_wireframes_on.png` | **CRITICAL** | **Oversized Hitbox Capsules:** Wireframe capsules use an arbitrary 1.80m height and 0.45m radius, hovering 25cm above the 1.55m character head and exceeding body width by over 30%. |
| 9 | `05_spell_fireball_cast.png` | **HIGH** | **Missing Cast Charge VFX:** No glowing charge orb or elemental light appears at the staff tip during spell startup/charge. |
| 10 | `06_spell_fireball_flight.png` | **MEDIUM** | **Camera Tracking Distance:** Fireball projectile travels away from camera without distinct trailing particles, making flight path hard to track against the dark floor. |
| 11 | `07_spell_fireball_impact.png` | **MEDIUM** | **Flat Impact Burst:** Fireball impact burst lacks vertical volume and bright lighting flash on nearby dummy meshes. |
| 12 | `08_spell_icespike_cast.png` | **MEDIUM** | **No Frost Casting Tell:** Ice Spike startup has no frost particle aura or crystalline charge tell at the caster's hand. |
| 13 | `09_spell_icespike_flight.png` | **MEDIUM** | **Ice Spike Visibility:** Ice spike projectile mesh is too small (radius 0.18m) to easily read from the isometric camera angle. |
| 14 | `10_spell_icespike_impact.png` | **HIGH** | **Missing Freeze Status Indicator:** Freeze slow reduces movement speed in numbers, but no visual ice frost decal or blue status ring indicates the enemy is slowed. |
| 15 | `11_spell_lightning_cast.png` | **MEDIUM** | **Missing Spark Startup:** Lightning Chain cast point has no electric sparks or arcing prelude. |
| 16 | `12_spell_lightning_flight.png` | **HIGH** | **Thin Lightning Arcs:** Lightning segment lines use 1px basic lines that vanish against the dark arena background and render underneath entity meshes. |
| 17 | `13_spell_lightning_impact.png` | **HIGH** | **Missing Stun Visual Tell:** Stunned dummy lacks an overhead stun star/ring icon or electrical shock VFX. |
| 18 | `14_spell_heal_cast.png` | **MEDIUM** | **No Holy Staff Glow:** Restorative Surge startup lacks emerald/gold aura on caster. |
| 19 | `15_spell_heal_flight.png` | **MEDIUM** | **Heal Beam Trajectory:** Heal effect lacks a connecting tether or projectile arc between healer and wounded ally. |
| 20 | `16_spell_heal_impact.png` | **HIGH** | **Missing Heal Pillar / Aura:** Heal impact only spawns floating green text with no rising column or ring of restoration on the target ally. |
| 21 | `17_spell_ward_cast.png` | **MEDIUM** | **Ward Startup Tell:** Arcane Ward lacks expanding protective aura during startup. |
| 22 | `19_spell_ward_impact.png` | **MEDIUM** | **Ward Bubble Visuals:** Cyan icosahedron wireframe lacks an inner translucent membrane and pulses weakly. |
| 23 | `20_spell_meteor_cast.png` | **HIGH** | **Occluded Ground Telegraph:** Meteor telegraph ring is cut off by the right debug panel and rendered with low opacity against dark stone. |
| 24 | `21_spell_meteor_flight.png` | **HIGH** | **Missing Descending Meteor Rock:** The falling boulder mesh is not visible during its descent phase before detonation. |
| 25 | `22_spell_meteor_impact.png` | **HIGH** | **Premature Timing in Slow-Mo:** At 0.20x time scale, 0.60s cast time and 1.10s delay took over 8.5 real seconds to detonate, cutting off the capture before explosion. |
