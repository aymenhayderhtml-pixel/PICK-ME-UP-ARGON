# Prompt for Argon: Weapon & Shield Models

We are building a browser game with Three.js r160 based on the manhwa Pick Me Up: Infinite Gacha. Characters (src/art/hero.js) and enemies (src/art/enemies.js) already exist in a stylized semi-realistic toon style; now I need the weapons and shields. I attach reference panels. The weapons held by early heroes are rusty and crude; high grade ones are beautiful.

## WEAPON CONTRACT

FILE: src/art/weapons.js. ES module. Only import: import * as THREE from ‘three’ (Three.js r160). Allowed extra import: mergeGeometries from ‘three/examples/jsm/utils/BufferGeometryUtils.js’. No external files; canvas textures up to 256x256 are allowed.
EXPORTS: createWeaponModel(kind, opts) -> WeaponModel; createShieldModel(kind, opts) -> WeaponModel; createPickupModel(kind, opts) -> PickupModel; disposeWeaponCaches(); WEAPON_KINDS (array); SHIELD_KINDS (array).
WEAPON_KINDS: sword, greatsword, spear, dagger, bow, staff, mace (a morning star: a spiked ball on a haft), club, pickaxe. SHIELD_KINDS: woodenRound, plank (rough spiked planks), ironRound, kite.
opts: { grade: ‘E’ | ‘D’ | ‘C’ | ‘B’ | ‘A’ | ‘S’ | ‘S+’ (default ‘E’), enhance: 0 to 5 (default 0), wear: 0 to 1 (0 new, 1 almost broken, default 0), seed: integer, variant: optional string }.
UNITS AND ORIENTATION: 1 unit = 1 meter. The weapon group’s ORIGIN is the center of the grip, so that attaching the group as a child of a hero socket puts the hand on the handle with no extra offset. Local axes for a weapon held in the right hand socket: -Y points along the fingers away from the pommel at +Y; +Z points out of the palm in the direction of the swing; +/-X points laterally across the crossguard. Direction rule: the blade, spear shaft or haft extends along the same axis as the fingers of a closed hand holding it, pointing AWAY from the pommel; the sharp edge faces the direction the character faces when the arm swings. The shield’s origin is the center of the strap inside the shield with the shield face pointing away from the character (when attached to the handL socket); the shield face normal is documented in WEAPON NOTES.
Lengths at scale 1: dagger 0.4, sword 1.0, greatsword 1.5, spear 2.0, staff 1.7, mace 0.9, club 0.8, pickaxe 0.9, bow 1.2 (height), shields 0.7 to 0.9 wide.
WeaponModel = {
group: THREE.Group,
anchors: { grip: Object3D, tip: Object3D, edgeBase: Object3D, edgeTip: Object3D, hit: Object3D (center of the damaging part), pommel: Object3D } // edgeBase and edgeTip are the two ends of the cutting edge, used by the game to draw slash trails.
setOpacity(a) // 0..1 including outlines; restores to opaque at 1
setTint(hex | null, amount 0..1) // hit flash, poison
setWear(w 0..1) // dulls, rusts, adds chips and cracks by color and small vertex offsets (no new meshes), 1 = almost broken
setEnhance(n 0..5) // adds glowing rune lines, emissive pulse proportional to n
setGlow(intensity 0..2) // grade glow (S, S+) boost used for special moments
setDraw(d 0..1) // bow only: string pull; for other kinds does nothing
setEmpowered(bool) // staff and mace: orb or spikes glow when charging
update(dt) // optional per-frame animation for shimmer, pulse, sway; safe to call every frame
getBounds() -> THREE.Box3
dispose()
}
PickupModel = { group (the item lying on the ground, origin at its ground contact center, rotated flat), ring (a flat glowing ring Object3D under it colored by grade), setHighlight(bool), update(dt) (slow bob and spin of the glow), dispose() }
GRADE LOOK (a clear progression readable at a distance): E gray-brown rusty or crude wood, dull; D clean iron, plain; C polished steel with a fuller line or a leather wrap; B darker blued steel, brass guard and pommel; A bright steel with gold trim and a small blue gem; S black-and-crimson steel with glowing red rune lines; S+ pearl-white ethereal steel with a slow color-shifting rainbow shimmer on the edge and a faint glow. Grade colors for UI: E 0x9a9a9a, D 0x6fbf73, C 0x4aa3ff, B 0xb26bff, A 0xffc83a, S 0xff4d5e, S+ 0xffffff.
PERFORMANCE BUDGET: at most 8 meshes and 600 triangles per weapon, 10 meshes and 800 triangles per shield, 3 meshes for a pickup beyond the weapon itself. Share geometries and materials through caches keyed by kind and grade; only materials that need tint or opacity are cloned per instance.
LOOK: the same stylized semi-realistic manhwa look as the heroes: MeshToonMaterial with the same 4-step gradientMap, a thin dark outline (inverted hull, color 0x14101c, scale 1.04) on the main parts. Silhouettes must be clear: sword with guard, fuller and pommel; spear with leaf blade and a wrapped shaft; bow curved with a string; staff with a crown or orb; mace with spikes; shields with rivets or planks.

## WEAPON CURRENT STATE

1. Sockets & Grip: Hero right hand socket `handR` (origin center palm) has -Y pointing along fingers/blade away from pommel at +Y, +Z facing swing direction out of palm, +/-X across guard (`src/art/hero.js:750`).
2. Shield socket: Left hand socket `handL` holds shield strap at origin with shield face pointing outwards away from character (`src/art/hero.js:752`).
3. Legacy sizes: Sword length 0.91m total with 0.72m blade and 0.24m guard; shields are round discs with diameter 0.56m to 0.64m (`src/art/weaponsLegacy.js:140, 181`, `src/player/Player.js:274, 310`).
4. Attachment points: Weapon meshes attach to `hero.sockets.handR` and shield meshes attach to `hero.sockets.handL` (`src/art/HeroRig.js:169-183`, `src/player/Player.js:98-114`).
5. Catalog types: Item catalog defines sword, greatsword, spear, dagger, bow, staff, mace, club, and shields across grades E through S+ (`src/data/items.js:1-240`).
6. Pickups: Ground item drops use flat items resting on the ground with a glowing colored ground ring (`src/combat/Items.js:70-118`).

## BRIEF

Make the best-looking weapons that fit the budget, with a very clear grade progression. Details per kind: sword: straight single-hand blade with a fuller groove, a crossguard, a leather-wrapped grip and a round pommel; rusty E version has a chipped edge and brown rust patches (use vertex colors or a small canvas texture), higher grades get engraved details and better guards. greatsword: a long two-handed blade with a long grip and a big crossguard; the origin is the center of the lower grip. spear: a leaf-shaped steel head, a ferrule, a wooden shaft with a wrapped hand area, a small tassel optional; the origin at the middle of the hand area, the head extends along the fingers’ axis. dagger: short curved or straight blade with a small guard. bow: a recurve with a wrapped grip in the middle (origin), a string that visibly pulls back with setDraw (the string is two segments meeting at the nock), and an arrow nocked at draw above 0 (a thin shaft with a tiny head and fletching, hidden at draw 0). staff: a mage staff, a wooden shaft with a crown holding a floating gem or orb that glows with setEmpowered, grade changes the crown shape. mace: a morning star, a short haft with a spiked ball, a chain optional: the ball head must have 8 small spikes. club: a thick tapered wooden club with a few iron studs. pickaxe: a miner’s pickaxe with a curved double-sided head. Shields: woodenRound (planks with an iron rim and a center boss), plank (rough planks lashed with rope and a row of metal spikes on the edge), ironRound (a domed iron shield with rivets), kite (a tall pointed shield with a cross design). A shield is held by the left hand socket: the strap is at the origin, the face points away from the character, give the shield a slight bend. Wear: setWear darkens and roughens the surface, adds chips by shifting a few edge vertices, and at wear above 0.8 shows a visible crack line. Enhance: glowing thin rune lines along the blade or shaft, brighter with each level. Pickups: the weapon lying flat on the ground with a subtle ring. Also add a small trail-friendly detail: edgeBase and edgeTip anchors placed exactly at the ends of the cutting edge (for spears and staffs use the head).

## DELIVERABLE

Reply with ONE complete file src/art/weapons.js in a single code block (at most 1100 lines, no TODO placeholders, only the imports allowed in the contract). After the code block write ‘WIRING NOTES’ with at most 8 lines (the grip axis you assumed, shield face normal, anything worth knowing, final mesh and triangle counts for the sword, the bow and a shield). Do not repeat the contract. If you must choose between detail and the performance budget, keep the performance budget.
