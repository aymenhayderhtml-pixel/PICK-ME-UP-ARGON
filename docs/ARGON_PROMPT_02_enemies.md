# Prompt for Argon: Enemy Models (Batch 1)

We are building a browser game with Three.js r160 based on the manhwa Pick Me Up: Infinite Gacha. The heroes already have a module with this style; now I need the enemies. I attach reference panels.

## ENEMY CONTRACT

FILE: src/art/enemies.js. ES module. Only import: import * as THREE from ‘three’ (Three.js r160). No external files or textures; canvas textures up to 256x256 are allowed.
EXPORTS: createEnemyModel(type, opts) -> EnemyModel; disposeEnemyCaches(); ENEMY_TYPES (array of type names); ENEMY_POSES (array of pose names); POSE_INFO (object: poseName -> { loop: boolean, duration: seconds }) used by the engine and the test viewer to replay one-shot poses.
TYPES (all must exist in the file; types marked LATER may be simple placeholders until their batch): goblin_grunt, goblin_archer, goblin_shaman, goblin_leader, hobgoblin_chief (boss), orc_warrior (LATER), orc_archer (LATER), orc_berserker (LATER), orc_lord (LATER boss), crystal_slime (LATER), rock_crawler (LATER).
UNITS: 1 unit = 1 meter, origin = the center of the feet on the ground, the model faces +Z. Heights at scale 1: grunt 1.15, archer 1.15, shaman 1.3, leader 1.7, hobgoblin_chief 2.7, orc types 2.1 to 2.4, orc_lord 4.0, crystal_slime 0.9, rock_crawler 0.6.
opts (optional): { seed: integer (variation of skin shade, hair, small scars, scale 0.94 to 1.06, gear mix), weapon: type-specific variant name (grunt: ‘dualKnives’ | ‘knifeShield’ | ‘club’), level: 1 to 10 (only affects small visual details like more metal at higher levels), outline: true|false (default true) }
EnemyModel = {
group: THREE.Group,
parts: { root, hips, torso, chest, neck, head, jaw, earL, earR, shoulderL, shoulderR, elbowL, elbowR, handL, handR, hipL, hipR, kneeL, kneeR, footL, footR } // Object3D pivots located AT the joints. Non-humanoid types (crystal_slime, rock_crawler) still provide root, torso, head and the same names where they have an equivalent; missing ones are aliases of root.
sockets: { handR, handL, back, head }
anchors: { head: Object3D, chest: Object3D, weapon: Object3D (the tip or center of the main weapon), feet: Object3D } // used for tags, hit effects, telegraphs, damage numbers
setPose(name, t, intensity = 1) // PURE function of time t seconds, callable every frame, no internal timers. Loop poses use t freely; one-shot poses are evaluated at t clamped to [0, duration] from POSE_INFO.
setEyeGlow(intensity 0..2) // red emissive eyes; 1 is normal, 2 is enraged
setExpression(name) // ‘neutral’ | ‘snarl’ | ‘pain’ | ‘afraid’ | ‘dead’
setTint(hex | null, amount 0..1) // damage flash, poison, burning
setOpacity(a) // 0..1 for everything including outline; restores to opaque (transparent false, depthWrite true) at 1
setEnrage(amount 0..1) // for the boss and leader: red aura, redder skin, bigger eye glow, slightly bigger posture (visual only)
setOutlineVisible(bool)
getBounds() -> THREE.Box3
dispose()
}
POSES with POSE_INFO durations (loop = true unless noted): idle (loop), walk (loop), run (loop, aggressive hunched run), attack1 (one-shot 0.5, the main melee swing), attack2 (one-shot 0.5, the second swing or a cross slash), windup (hold pose, loop, a telegraph pose with the weapon raised, used before a heavy attack), slam (one-shot 0.9, boss overhead slam), charge (loop, a lowered-head forward rush), shoot (one-shot 0.6, bow draw and release, archers), cast (one-shot 0.8, staff raise and orb flare, shaman), heal (one-shot 0.8), roar (one-shot 1.2, head back, jaw wide, arms out), throw (one-shot 0.6, boss cleaver throw), hit (one-shot 0.25), stagger (one-shot 0.6, stumbling), flee (loop, panicked run looking back), hesitate (loop, shrinking back with weapon lowered), spawn (one-shot 1.0, rising or leaping out of hiding), death (one-shot 1.2, ends lying on the ground), ambushWait (loop, crouched low and still).
PERFORMANCE BUDGET: grunt, archer, shaman: at most 22 meshes and 2500 triangles. leader: 28 meshes and 3500. hobgoblin_chief and orc_lord: 40 meshes and 7000. Others: 24 meshes and 3000. 25 enemies on screen must run above 30 FPS on an integrated GPU. Share geometries and materials through internal caches; per-instance material clones only where tint or opacity needs them.
LOOK: the same stylized semi-realistic manhwa look as the heroes: MeshToonMaterial with a 4-step gradientMap, dark inverted-hull outlines (BackSide scaled 1.03, color 0x14101c). Enemies must read as dangerous at a distance by silhouette.

## ENEMY CURRENT STATE

1. Builders: `Enemy.buildModel()` (`Enemy.js:173`) and `HobgoblinChief.buildModel()` (`HobgoblinChief.js:42`) construct goblin types, slimes, crawlers, and the boss.
2. Heights & Facing: Grunt/Archer 1.15m, Shaman 1.3m, Leader 1.7m, Hobgoblin Chief 2.7m (scaled 2.4 in legacy boss); models face +Z when `rotation.y = 0`.
3. Limbs: Posed via `leftArmPivot`, `rightArmPivot`, `leftLegPivot`, `rightLegPivot`, and `torsoGroup` (`Enemy.js:733-752`, `GoblinAI.js:172-277`, `HobgoblinChief.js:474-637`).
4. Weapons: Daggers, shields, clubs, bows, staves, and cleavers attached directly to arm pivots (`Enemy.js:513-630`, `HobgoblinChief.js:145`).
5. Effects & Shaders: Hit flash mutates `mainMat.color.setHex(0xffffff)` for 0.1s; corpse decay fades opacity over 0.8s (`Enemy.js:766, 874`).
6. External access: `EnemyTagsOverlay` projects tags above head at `y + headOffset` (`EnemyTags.js:121`); enrage toggles aura opacity (`HobgoblinChief.js:222`).

## BATCH 1 BRIEF

This is BATCH 1: write the full detail for goblin_grunt, goblin_archer, goblin_shaman, goblin_leader and hobgoblin_chief. The other types (orcs, crystal_slime, rock_crawler) must exist in ENEMY_TYPES but can be simple low-detail placeholders built from the same helpers; they come in batch 2.
GOBLIN LOOK (match the attached panels exactly): small, hunched, wiry-muscular humanoids with olive-green skin (about 0x6a6a2e with shade variation), large heads with wide faces, big pointed ears (one with a small gold ring earring), spiky black hair in wild layers swept back from the forehead and down the neck, glowing red narrow eyes (emissive), a huge mouth full of sharp white fangs with 2 curved tusks rising from the lower jaw and a long red tongue hanging out, a lean muscular torso with ribs showing, a fur loincloth (tan and white tufts), a leather chest strap, one metal shoulder plate on the left shoulder, wrapped dark bandages on forearms, bare feet with claws. Weapons: dualKnives = two curved sickle-like silver knives (one in each hand, the blades curve upward), knifeShield = one curved knife plus a wooden-plank shield with 4 vertical planks and a row of metal spikes on its edge strapped to the left arm, club = a rough wooden club with a stone head. Poses: very aggressive; run is a deep hunched forward sprint with long arm swings and the head thrust forward; attack1 is a wild overhand slash, attack2 a cross slash with the other hand; ambushWait is crouched with the tongue out; flee looks back in fear; death is a collapse onto the side. The jaw part must open and close (snarl, roar, attack).
ARCHER: same species, lighter, a short crude bow, a quiver of crooked arrows on the back, a ragged hood or head cloth, no shield. Poses: shoot (draw to the cheek and release), a crouching idle.
SHAMAN: taller and thinner, a pointed hood with the face half hidden but the red eyes glowing, a bone staff topped with a glowing green orb (emissive plus a point light is NOT allowed: use an emissive material only), a necklace of small bones and teeth, tattered robes. Poses: cast (the staff raised, the orb flares), heal (arms spread, a green pulse ring expands: do it as a flat ring mesh scaled by t), idle floating sway.
LEADER: 1.5 times larger, a dark iron helmet with two curved horns, a bigger shoulder plate on both shoulders, a torn red banner on his back from a short pole (the banner must flutter by animating its vertices or a few segment rotations in setPose), a heavy axe. A ‘rally’ pose is NOT needed; roar covers it.
HOBGOBLIN CHIEF (the floor 5 boss): 2.7 units tall, human-sized brute-goblin hybrid with thick muscular arms and a hunched back, brown-green skin (about 0x6a7a3a), small head with a heavy jaw and 2 big lower tusks, scarred chest, a spiked iron collar, iron shoulder pads, a belt of small skulls, a huge crude iron cleaver (a slab blade 0.4 x 2.8 x 1.2 with a notch and rust stains by color variation, a wrapped handle). Poses: attack1 is a horizontal heavy sweep; slam is a big overhead raise (0 to 0.5 s), hold, then a crushing strike (0.5 to 0.7 s) and recovery; charge is lowered head and arms back; throw is a spinning cleaver throw; windup raises the cleaver high with a red-tinted pulse; roar is huge. Heavy weighted movement: slower and with a stomp on each step (a small downward body bounce). setEnrage makes the skin redder, adds a red aura (a transparent additive shell) and widens the eyes.
Quality notes: custom shaped geometry is welcome (tapered capsules, lathe shapes, wedge shapes for ears and tusks, small canvas textures for skin detail like scars and veins, face texture for eyes and mouth if useful). Hair is made of layered tapered wedges. Silhouette must stay readable at 20 meters.

## DELIVERABLE

Reply with ONE complete file src/art/enemies.js in a single code block (at most 1200 lines, no TODO placeholders for batch 1 types, no imports except three). After the code block write ‘WIRING NOTES’ with at most 8 lines (poses worth knowing, how intensity is used, how setOpacity is implemented, final mesh and triangle counts per type). Do not repeat the contract. If you must choose between detail and the performance budget, keep the performance budget.
