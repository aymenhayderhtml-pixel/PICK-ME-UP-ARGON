# Art Contract: Characters

## CURRENT STATE

- `src/art/HeroRig.js`: `HeroRig` is the single 15-joint humanoid rig with weapon sockets and procedural poses. **Every humanoid character in the game is built from it** — `src/player/Player.js:45`, `src/combat/Ally.js:101`, `src/hub/HubHeroes.js:238`, `src/hub/TrainingManager.js:96` all construct `new HeroRig(look)`.
- `src/art/hero.js`: `createHeroModel(opts)` returns the rig's mesh tree and joint sockets; `HERO_POSES` lists the pose names.
- `src/art/HeroRig.js:169-183`: `HeroRig.equip()` attaches the weapon mesh to `hero.sockets.handR`, the shield mesh to `hero.sockets.handL`, and staves to `hero.sockets.staffHand`.
- `src/player/Player.js:625-631`: `rebuildWeaponMesh()` and `rebuildShieldMesh()` are thin wrappers over `this.rig.equip(...)` — they no longer build geometry themselves.
- `src/combat/Ally.js:99-101`: `Ally.buildMesh(hero)` generates a look and creates a `HeroRig`.
- `src/art/weaponAnimations.js` owns **all** weapon transforms, timings and grip offsets. `WEAPON_ANIMATIONS` holds the hold poses and attack specs; `solveTwoHandGripIK` solves the two-bone IK. Never hardcode an animation transform in a rig or combat file.
- `src/art/EnemyRig.js`: `EnemyRig` is the enemy rig controller (joint transforms and death collapse).
- `src/art/enemies.js`: `createEnemyModel(type, opts)` returns the enemy mesh tree; `ENEMY_TYPES`, `ENEMY_POSES` and `POSE_INFO` describe the poses the engine and the test viewer replay.
- `src/art/weapons.js`: `createWeaponModel(kind, opts)`, `createShieldModel(kind, opts)` and `createPickupModel(kind, opts)` build every weapon, shield and pickup from primitives.
- `src/core/CameraFade.js:28-48`: In `updateHumanoidCameraFade`, all mesh children of humanoids within 2.5 units of camera have materials updated with `depthWrite = true`, `transparent = true`, and `opacity = op`, restoring `transparent = false` and `opacity = 1.0` when far.
- `src/ui/Label.js:45-52, 91, 93, 161, 163`: Billboard sprites read `userData.aspectRatio` and `userData.baseOpacity`, while humanoid mesh groups have no custom `userData` fields read by existing gameplay systems.

## NEW CONTRACT

FILE: src/art/hero.js. ES module. Only import: import * as THREE from ‘three’ (Three.js r160). No other imports, no external files or textures; canvas textures up to 256x256 are allowed.
EXPORTS: createHeroModel(opts) -> HeroModel; HERO_POSES (array of pose names).
UNITS: 1 unit = 1 meter. Origin = center of the feet on the ground. The model faces +Z. Height at heightScale 1 is 1.67 units.
opts (every field optional, with defaults): {
seed: integer (same seed and no other fields = same random look),
heightScale: 0.88 to 1.15,
build: ‘slim’ | ‘average’ | ‘stocky’ | ‘muscular’,
skinTone: hex number,
faceStyle: ‘neutral’ | ‘stern’ | ‘young’ | ‘old’ | ‘fierce’,
hair: { style: ‘spiky’ | ‘short’ | ‘long’ | ‘braid’ | ‘ponytail’ | ‘bowl’ | ‘bald’ | ‘messy’, color: hex },
facialHair: ‘none’ | ‘stubble’ | ‘beard’ | ‘mustache’,
outfit: { top: ‘shirt’ | ‘shirtRolled’ | ‘tunic’ | ‘vest’ | ‘robe’, topColor, vestColor, bottom: ‘trousers’ | ‘shorts’, bottomColor, bootsColor, accentColor },
outline: true | false (default true)
}
HeroModel = {
group: THREE.Group,
parts: { root, hips, torso, chest, neck, head, shoulderL, shoulderR, elbowL, elbowR, handL, handR, hipL, hipR, kneeL, kneeR, footL, footR } // THREE.Object3D pivots located AT the joints, so rotating them bends the limb.
sockets: { handR, handL, back, hip, head } // Object3D attach points for items (weapons, shields) that other code adds as children.
setPose(name, t, intensity = 1) // PURE function of time t in seconds; sets rotations and positions of the parts for that instant; callable every frame; no internal timers.
setExpression(name) // ‘neutral’ | ‘angry’ | ‘afraid’ | ‘pain’ | ‘dead’ | ‘happy’
setArmor(spec | null) // spec = { type: ‘leather’ | ‘chain’ | ‘plate’, color } adds visible armor pieces (chest plate, shoulder pads, bracers, greaves) to the same model; null removes them.
setTint(hex | null, amount 0..1) // color mix for damage flash and fear tint.
setOpacity(a) // 0..1 for the whole model including outline and armor; must set transparent and depthWrite correctly and restore to opaque at 1.
setOutlineVisible(bool)
getBounds() -> THREE.Box3 (local space)
dispose()
}
POSES: idle, walk (intensity = speed factor), run, attack1, attack2, attack3 (swing for t 0 to 0.3 then recovery to 0.5), block (hold), roll (t 0 to 0.4), hit (t 0 to 0.25), panic (loop), afraid (loop, trembling), death (t 0 to 1.6, clamped at the end pose lying on the ground), trainSword, trainSpear, trainBow, trainDagger, trainMagic (each a loop of 1.2 seconds), mine (pickaxe swing loop of 1.0 second), talk (small head nod and hand gesture loop), cheer (loop).
PERFORMANCE BUDGET: at most 28 meshes and 4000 triangles per hero including outline and armor. Share geometries and materials between instances through internal caches keyed by their parameters; per-instance clones only for the few materials that need tint or opacity. 30 heroes on screen must run above 30 FPS on an integrated GPU.
LOOK: stylized semi-realistic manhwa characters, 7 to 7.5 heads tall, NOT blocky. MeshToonMaterial with a 4-step gradientMap (DataTexture), thin dark outlines by the inverted hull method (BackSide mesh scaled 1.03, color 0x14101c). Muted, slightly desaturated linen colors. Face made from a small cached canvas texture (large dark eyes with a highlight, eyebrows, small mouth; one texture per expression and faceStyle). Heroes wear plain clothes by default and show armor only through setArmor.

## ENEMY CURRENT STATE

- `src/combat/Enemy.js:173-646`: `Enemy.buildModel()` constructs Grunt, Archer, Shaman, Leader, Crystal Slime, and Rock Crawler models.
- `src/combat/Enemy.js:36-108`: Helper functions `buildCurvedDagger()`, `buildSpikedShield()`, and `buildWoodenClub()` construct goblin weapons.
- `src/combat/HobgoblinChief.js:42-195`: `HobgoblinChief.buildModel()` constructs the floor 5 boss with torso, head, tusks, shoulder pads, limb pivots, and giant cleaver.
- Enemy heights (bounding boxes): Grunt 1.16 units (min y: -0.02, max y: 1.14); Archer 1.17 units (min y: -0.02, max y: 1.15; excludes 14m forward aiming line); Shaman 1.43 units (min y: -0.08, max y: 1.35); Leader body ~1.7 units, 3.06 units with back banner pole (min y: -0.26, max y: 2.80); Hobgoblin Chief body ~2.7 units at scale 1, 5.43 units at scale 2.4 with cleaver (min y: -1.40, max y: 4.03; excludes 7.68m phase-2 aura sphere).
- Facing convention: The model faces +Z when `rotation.y = 0` (`src/combat/Enemy.js:728, 759` sets `rotation.y = Math.atan2(dx, dz)`; `src/combat/Boss.js:44-46` computes forward vector as `facingX = sin(rotY)`, `facingZ = cos(rotY)`).
- `src/combat/Enemy.js:733-752`: Locomotion swings `leftLegPivot.rotation.x = -swing`, `rightLegPivot.rotation.x = swing`, `leftArmPivot.rotation.x = swing`, and `rightArmPivot.rotation.x = -swing`.
- `src/combat/Enemy.js:701-703`: Morale panic and fleeing raises both arms: `leftArmPivot.rotation.x = -Math.PI * 0.85`, `rightArmPivot.rotation.x = -Math.PI * 0.85`.
- `src/combat/Enemy.js:738, 965`: Torso idle breathing and hunched running bobbing animates `torsoGroup.rotation.x = 0.4 + sin(...)`.
- `src/combat/GoblinAI.js:172-189, 254-277`: Attack windup poses `rightArmPivot.rotation.set(-Math.PI * 0.5, 0.4, -0.3)` and attack strike sets `rightArmPivot.rotation.set(0.45, -0.6, -0.35)`.
- `src/combat/HobgoblinChief.js:367-368, 474-477, 554-555, 623, 636-637`: Boss animations directly set `leftArmPivot.rotation.x`, `rightArmPivot.rotation.x`, `leftLegPivot.rotation.x`, and `rightLegPivot.rotation.x` for chase, windup, cleaver sweep, slam, and charge.
- `src/combat/HobgoblinChief.js:393`: Pinned weapon animation drags right arm down: `rightArmPivot.rotation.x = 0.8`.
- `src/combat/Enemy.js:513, 518, 525, 530, 537, 553, 591, 630`: Weapons (daggers, shield, club, bow, staff, axe) are added as direct children of `rightArmPivot` or `leftArmPivot`; quivers and banners are added to `torsoGroup`.
- `src/combat/HobgoblinChief.js:145`: Giant cleaver mesh is added as a child of `rightArmPivot`.
- `src/combat/Enemy.js:766, 862`: Hit damage flash mutates `this.mainMat.color.setHex(0xffffff)` and restores `this.originalColor` after 0.1s.
- `src/combat/HobgoblinChief.js:199-202`: Boss hit damage flash mutates `this.mainMat.color.setHex(0xffffff)` and restores `this.originalColor` after 100ms.
- `src/combat/Enemy.js:874-886`: Corpse decay traverses all meshes in `this.mesh` and sets `material.transparent = true`, `material.opacity = alpha` over 0.8s after 6s.
- `src/combat/HobgoblinChief.js:167, 222, 330`: Enrage aura toggles `this.auraMesh.material.opacity = 0.35` (0.0 when calm or dead).
- `src/ui/EnemyTags.js:121-126`: Floating enemy name/level HUD tag calculates world position from `enemy.mesh.position.y + (enemy.isBoss ? 2.3 : (enemy.tagHeight || 1.25))`.
- UserData: No gameplay systems read custom `userData` fields on enemy meshes.

## ENEMY CONTRACT

FILE: src/art/enemies.js. ES module. Only import: import * as THREE from ‘three’ (Three.js r160). No external files or textures; canvas textures up to 256x256 are allowed.
EXPORTS: createEnemyModel(type, opts) -> EnemyModel; ENEMY_TYPES (array of type names); ENEMY_POSES (array of pose names); POSE_INFO (object: poseName -> { loop: boolean, duration: seconds }) used by the engine and the test viewer to replay one-shot poses.
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
LOOK: the same stylized semi-realistic manhwa look as the heroes: MeshToonMaterial with a 4-step gradientMap, dark inverted-hull outlines (BackSide scaled 1.03, color 0x14101c). Enemies must read as dangerous at a distance by silhouette.

### QUADRUPED ADDENDUM

createEnemyModel('prairie_wolf', opts) returns the same EnemyModel API, but parts are:
`{ root, hips, torso, chest, neck, head, jaw, earL, earR, tail1, tail2, tail3, shoulderFL, shoulderFR, elbowFL, elbowFR, pawFL, pawFR, hipBL, hipBR, kneeBL, kneeBR, pawBL, pawBR }`
anchors: `{ head, chest, mouth, feet, weapon (= mouth) }`
size: shoulder height 0.95, body length 1.7, total length with tail 2.3, facing as the other enemies (+Z).
poses (POSE_INFO):
- idle (loop, breathing, ear twitch)
- walk (loop)
- run (loop, a real gallop)
- attack1 (one-shot 0.5, a snapping bite lunge)
- pounce (one-shot 0.9: crouch 0 to 0.25, spring and airborne 0.25 to 0.7, landing 0.7 to 0.9)
- windup (loop, a low coiled crouch with a growl)
- circle (loop, a low sideways stalk with lowered head)
- howl (one-shot 1.5)
- hit (one-shot 0.25)
- stagger (one-shot 0.6)
- flee (loop)
- hesitate (loop)
- spawn (one-shot 1.0)
- death (one-shot 1.0, ends lying on its side)
- ambushWait (loop, low and still in the grass)
Budget: at most 24 meshes and 2800 triangles.
Look: dark slate-gray fur (about 0x4a4d55) with lighter gray muzzle and chest patches, matted fur ridges along the spine and neck made of layered wedges, glowing yellow eyes (emissive 0xffd23a, setEyeGlow), two thin glowing golden streak markings above the eyes, long curved ivory fangs visible, a scarred face, torn ear, bushy tail.

## WEAPON CURRENT STATE

- `src/art/hero.js:750`: `handR` socket is positioned at `(0, -0.03, 0.015)` under `elbowR` with rotation `(0, 0, 0)`; local -Y points along the fingers away from pommel at +Y, local +Z points out of the palm in the direction of the swing, local +/-X points across the crossguard; grip origin is at center of palm.
- `src/art/hero.js:752`: `handL` socket is positioned at `(0, -0.03, 0.015)` under `elbowL` with rotation `(0, 0, 0)`; local -Y points along the fingers, local +Z points out of the palm (used for shield strap center, face normal pointing outward in -X/+Z stance).
- `src/art/hero.js:754`: `back` socket is positioned at `(0, 0.12, -0.11 * build.sz)` under `chest` with rotation `(0, 0, 0)`; local -Z points outward from spine and +Y points upwards along the back.
- `src/art/hero.js:756`: `hip` socket is positioned at `(-0.13 * build.sx, -0.02, 0)` under `hips` with rotation `(0, 0, 0)`; local -X points outward from left hip and +Z points forward.
- `src/art/hero.js:758`: `head` socket is positioned at `(0, 0.21, 0)` on `head` with rotation `(0, 0, 0)`; local +Y points upwards from crown of head.
- `src/art/weapons.js:351-366`: the `sword` builder makes a 1.0 m blade: pommel at y = +0.16, grip [-0.09..+0.13], guard at y = -0.09, blade from -0.08 to -0.84.
- `src/art/weapons.js:668-684`: the `woodenRound` shield builder makes a disc of radius 0.255–0.265 (diameter 0.51–0.53) and thickness 0.028, centred at z = 0.058, with a 12-segment iron rim and a centre boss of radius 0.068.
- `src/player/Player.js:625-627`: `rebuildWeaponMesh()` is a thin wrapper over `this.rig.equip({ weapon, offhand, armor })` — the geometry itself is built by `src/art/weapons.js` and attached by `HeroRig.equip()`.
- `src/player/Player.js:629-631`: `rebuildShieldMesh()` is the same wrapper for the offhand; it no longer builds shield geometry itself.
- `src/combat/Ally.js:122`: the ally equips its weapon and shield through `HeroRig.equip()` exactly like the player — the `handR` / `handL` sockets, not raw pivot groups.
- `src/art/HeroRig.js:169-183`: `HeroRig.equip()` attaches weapon mesh to `hero.sockets.handR` and shield mesh to `hero.sockets.handL`.
- `src/combat/Enemy.js:828-835`: Scavenged weapon drops create dropped weapon objects with `type: weaponType || 'club'` and `durability: 20`.
- `src/combat/Items.js:5-63, 70-118`: Items manager defines starter combat equipment (RUSTY_SWORD, WOODEN_SHIELD, CLUB, RUSTY_DAGGER, CRUDE_SHIELD, NOVICE_IRON_SHIELD) and `createItemMesh()` creates ground pickups with a glowing ground ring `RingGeometry(0.3, 0.42)`.
- `src/data/items.js:1-240`: Weapon types and names in item catalog: sword (`rusty_sword` Grade E, `iron_sword` Grade D, `steel_sword` Grade B), shield (`wooden_shield` Grade E, `iron_shield` Grade D), mace (`morning_star` Grade D), bow (`hunting_bow` Grade E), spear (`iron_spear` Grade D), dagger (`short_dagger` Grade E), greatsword (`greatsword` Grade C), staff (`mage_staff` Grade D).

## WEAPON CONTRACT

FILE: src/art/weapons.js. ES module. Only import: import * as THREE from ‘three’ (Three.js r160). Allowed extra import: mergeGeometries from ‘three/examples/jsm/utils/BufferGeometryUtils.js’. No external files; canvas textures up to 256x256 are allowed.
EXPORTS: createWeaponModel(kind, opts) -> WeaponModel; createShieldModel(kind, opts) -> WeaponModel; createPickupModel(kind, opts) -> PickupModel; WEAPON_KINDS (array); SHIELD_KINDS (array).
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

### BOW AND TWO-HANDED ATTACHMENT CONVENTIONS
- Bows attach to `sockets.handL`: in `trainBow` and combat shooting poses, the left arm extends forward to aim the bow frame while the right arm pulls the string. Offhand shields are hidden while a bow is equipped.
- Two-handed melee weapons (`greatsword`, `spear`, `staff`) attach to `sockets.handR`. Offhand shields are hidden while a two-handed weapon is equipped.

## ISELLE CURRENT STATE
- Builder & file: `src/hub/Iselle.js:3-42` defines class `Iselle`, creating a placeholder body with `SphereGeometry(0.2, 14, 14)` (radius 0.2, diameter 0.4 units) and two wing planes `PlaneGeometry(0.35, 0.22)` at `(±0.2, 0.05, -0.1)`. Uses a `PointLight(0xffaaff, 2.5, 7)`.
- Dimensions: Bounding box size is width 0.75m, height 0.40m, depth 0.30m (excluding light radius). Origin is at the body center.
- Movement & Flight (`src/hub/Iselle.js:44-88`): Updates flapping wings (`rotation.y = ±Math.sin(time * 28) * 0.55`); performs figure-eight flight around altar at height ~1.8 + bob when player distance >= 5m (`targetX = sin(t * 0.6) * 5.2, targetZ = sin(t * 1.2) * 3.6`); hover orbits around player when distance < 5m (`targetX = player.x + sin(t * 1.5) * 1.6, targetZ = player.z + cos(t * 1.5) * 1.6, targetY = player.y + 1.7 + sin(t * 3) * 0.25`); smoothly lerps position with `delta * 3.5`.
- Scripted flight & punishment: `src/hub/HubHeroes.js:985-987` sets `iselle.overrideTarget = Vector3(targetPos.x, 3.2, targetPos.z + 1.2)` to fly above an insubordinate hero, plays divine lightning strike, then resets `overrideTarget = null` (`HubHeroes.js:1031`). Also used in `src/gacha/SummonEffect.js:257-262`.
- UI & Dialogues: `src/ui/IselleTutorial.js:84` displays an emoji `🧚‍♀️` in the tutorial modal header; `src/data/iselle.js` provides `ISELLE_LINES` and `pickLine(category)` for dialogue lines in `HubScene.js`, `RewardWindow.js`, `RosterWindow.js`, and `SummonEffect.js`.

## ISELLE CONTRACT
FILE: src/art/iselle.js. ES module. Only import: import * as THREE from 'three' (Three.js r160). No external files; canvas textures up to 256x256 are allowed.
EXPORTS: createIselleModel(opts) -> IselleModel; drawIsellePortrait(ctx, expression, size) -> void (a 2D canvas drawing of her bust for dialogue boxes, transparent background, fits a size x size square); disposeIselleCaches(); ISELLE_POSES (array); ISELLE_EXPRESSIONS (array); POSE_INFO (poseName -> { loop: boolean, duration: seconds }).
opts: { scale: number (default 1; at scale 1 she is about 0.55 units tall including the hair, a small flying fairy), outline: true|false (default true) }
IselleModel = {
group: THREE.Group, // origin = the center of her body (she floats, there is no ground contact); faces +Z
parts: { root, body, torso, head, jaw, hairBraidL, hairBraidR, armL, armR, handL, handR, skirt, wingL, wingR, legL, legR }, // Object3D pivots at the joints
anchors: { head, mouth, handL, handR, wingTipL, wingTipR, aura, feet } // used for speech bubbles, the punishment strike, sparkles
setPose(name, t, intensity = 1) // PURE function of time t; loop poses use t freely; one-shot poses use t clamped to POSE_INFO duration
setExpression(name) // from ISELLE_EXPRESSIONS
setGlow(intensity 0..2) // eyes, wing edges and the aura glow
setOpacity(a) // 0..1 for everything; restores to opaque at 1
setTint(hex | null, amount 0..1)
update(dt) // optional per-frame animation for wing flutter, braid sway, aura shimmer, safe to call every frame
getBounds() -> THREE.Box3
dispose()
}
ISELLE_POSES: float (loop, a gentle hovering bob with fluttering wings, hands clasped behind her back), fly (loop, leaning forward, faster wing beats, braids trailing back), explain (loop, one hand raised with a finger up, head tilted, talking nods), cheerful (loop, hands clasped near the cheek, swaying), giggle (loop, hand over mouth, shoulders shaking), smug (loop, arms crossed, chin up, one eyebrow raised), scold (loop, hands on hips, leaning toward the viewer, stern), dismissive (loop, a flicking hand wave, looking away), announce (one-shot 0.8, one hand opens outward, the other touches the chest), punish (one-shot 1.2, the arm rises, the hand opens, a pause, a downward snap point; the engine plays the light strike from anchors.handR at t = 0.7), summon (loop, spins slowly with both arms open and the aura strong), surprised (one-shot 0.5, a jerk back, arms up), bow (one-shot 1.0, a polite curtsy), sad (loop, drooping wings, head down).
ISELLE_EXPRESSIONS: cheerful (a bright wide smile, eyes arched), smug (a half smile with one raised brow), stern (a flat mouth, narrowed eyes), bored (half-closed eyes), surprised (wide eyes, a small round mouth), angry (a snarl with sharp eyes), sweet_cruel (a sweet smile with cold red eyes, her default and most important look).
PERFORMANCE BUDGET: at most 24 meshes and 3000 triangles. Share geometries and materials through caches. Use no point lights (emissive materials only).
LOOK: the same stylized semi-realistic manhwa look as the heroes: MeshToonMaterial with the same 4-step gradientMap, thin dark outlines (inverted hull 0x14101c, scale 1.03).

## TOWN CONTRACT

The town is split into 3 art modules, each a separate file in src/art/town/ that Argon writes. All are ES modules; only import: import * as THREE from ‘three’ (Three.js r160) and, allowed, mergeGeometries from ‘three/examples/jsm/utils/BufferGeometryUtils.js’. No external files and no network; canvas textures up to 512x512 are allowed. Everything is procedural.
MODULES:
(1) src/art/town/shell.js exports buildTownShell(ctx): the 12-sided wall, the terrain mesh, the island underside, the cliff edge, the moss and ivy, the sky dome and the sea of clouds, the lighting preset, the floating leaves and sparkles, the fog settings.
(2) src/art/town/landmarks.js exports buildTownLandmarks(ctx): the Summoning Room, Town Square floor emblem, Landing Area, Space-Time Rift gate, Synthesis Chamber, Armory, Training Grounds, Mess Hall row, Dungeon Board.
(3) src/art/town/village.js exports buildTownVillage(ctx): the residences (cottages with gardens), hedges, trees, lamp posts, fences, benches, barrels, crates, paving stones, road decoration, small props, ground details (flowers, grass tufts, pebbles).
ctx = { layout: LAYOUT (read from src/art/town/layout.js: positions and sizes are FIXED by it and must not be changed), getGroundY: (x,z) => y, quality: ‘low’ | ‘medium’ | ‘high’, seed: integer, time: ‘night’ | ‘dusk’ }.
Every build function returns TownModule = {
group: THREE.Group,
colliders: array of { type: ‘circle’, x, z, r } or { type: ‘box’, x, z, w, d, rotY } // ground-plane footprints that block walking (walls, buildings, big trees, fences, props)
doors: array of { id, position: Vector3, outward: Vector3 (unit, ground plane) } // must match the layout door ids
anchors: object of named Object3D or Vector3 (signs positions: anchors[‘sign_<id>‘], lights, the portal center, the sphere pedestal, the anvil, etc.),
lights: array of { position: Vector3, color: hex, intensity: number, distance: number } // desired point lights; the engine decides how many to activate (max 8). Do NOT add THREE.PointLight or SpotLight yourself; use emissive materials for glow.
update(dt, camera) // optional animation (flicker, portal pulse, leaves, drifting mist); cheap; safe every frame
setQuality(q) // rebuilds or toggles detail without leaking
getStats() -> { meshes, triangles, drawCallsEstimate }
dispose()
}
BUDGET (quality ‘high’ on an Intel UHD integrated GPU, the visible whole town must stay above 30 FPS): shell at most 70,000 triangles and 20 draw calls; landmarks at most 120,000 triangles and 50 draw calls; village at most 150,000 triangles and 60 draw calls. ‘medium’ is about 60 percent of those numbers and ‘low’ about 30 percent. The 3 modules together at most 340,000 triangles and 130 draw calls on ‘high’. METHOD: merge all static geometry that shares a material into one BufferGeometry (vertex colors for variation); use InstancedMesh for repeated elements (cottages, trees, hedges, paving stones, columns, fence posts, lamp posts, leaves); give every module at most 12 distinct materials; share and cache geometry; no per-frame allocation; no real-time shadows (shadows are faked with baked vertex-color ambient occlusion and a few dark decal quads); use at most 2 canvas textures per module (stone, plaster, moss) with mipmaps and repeat wrapping; LOD: for ‘high’ provide simple distant versions for the cottages and trees (swap by distance in update(dt, camera) using InstancedMesh counts or visibility, not new allocations). Frustum culling stays enabled; split big merged meshes into 4 spatial chunks so culling works.
LOOK (the manhwa’s Waiting Room): a cold teal moonlit night. Pale ivory-gray stone covered in moss and ivy, slightly ruined but orderly: weathered walls, small cracks, worn steps, mossy edges. White plaster half-timbered cottages with dark timber beams, gray slate gable roofs, small windows with a warm 0xffc27a glow. Floating blue-teal curved leaves and glints drifting in the air. A sea of fog clouds below the floating island, with dark forest tops showing through. Colors: stone 0xb9c0c6 to 0x7d8f94, moss 0x3f5a3a to 0x5f8a4a, timber 0x2b2623, plaster 0xdfe3df, slate 0x4a5560, teal accents 0x6fe0f0, background 0x0f2a33, fog 0x1d4a55. The only warm light sources are the windows, the Armory forge and a few lamp posts. Style: stylized semi-realistic toon like the characters (MeshToonMaterial with a 4-step gradientMap; thin outlines ONLY on the big silhouettes if cheap, e.g. the landmark buildings; none on instanced small props).
SCALE: heroes are 1.75 units tall. Doors are 2.2 units tall and 1.4 wide. Cottage 6 x 5 x 5 (with the roof). Steps 0.2 high. The town island has an apothem of the LAYOUT wall.

### SHELL TIME OF DAY & LIGHTING CONTRACT
The shell also exports on its TownModule: setTimeOfDay(t) with t in [0,1) wrapping, where 0.00 = early morning mist, 0.30 = bright midday, 0.62 = dusk, 0.78 = night, 0.95 = deep night, and the cycle returns to morning at 1.0, with SMOOTH interpolation between keyframes; and getLighting() -> { background: hex, exposure: number, ambient: { color, intensity }, hemi: { sky, ground, intensity }, sun: { color, intensity, direction: Vector3 (the direction the light comes FROM, normalized) }, fog: { color, near, far }, windowGlow: 0..1, lampGlow: 0..1, skyTop: hex, skyHorizon: hex }. setTimeOfDay updates the sky dome, the sun or moon disc, the stars, the cloud tint and the leaf glow inside the shell; the engine applies getLighting() to its own lights and fog every time it changes. The shell must NOT create real lights. The whole town must be clearly readable at every time of day.

## TOWN CONTRACT ADDENDUM

(a) Landmarks are two modules:
- `src/art/town/landmarksMain.js` exports `buildLandmarksMain(ctx)` for `summoning_room`, `landing_area`, `town_square`, and `space_time_rift`.
- `src/art/town/landmarksWork.js` exports `buildLandmarksWork(ctx)` for `synthesis_chamber`, `armory`, `training_grounds`, `mess_hall_row`, and `dungeon_board`.
Each returns a `TownModule` exactly as in the TOWN CONTRACT. `src/art/town/landmarks.js` stays as a thin wrapper that calls both and merges `group`, `colliders`, `doors`, `anchors`, `lights`, `update`, `setQuality`, `getStats`, and `dispose`.

(b) Every town module also exports `setLighting(lighting)` where `lighting` is the object from `shell.getLighting()`; it only changes material emissive intensities and sign or light intensities: windows scale with `lighting.windowGlow`, lamps and torches with `lighting.lampGlow`, while the portal, the Summoning Room sphere, the Armory forge, and the Synthesis door glow stay always on (their glow may increase a little at night). It must be cheap and allocation-free.

(c) `ctx` also contains `PALETTE` (imported from `src/art/town/palette.js`, modules may import it as a relative path `import { PALETTE } from './palette.js'`).

(d) Readability rule: every building must be clearly readable at every time of day; no black voids (windows and alcoves are recessed with a lighter back wall), every sub-part must touch its neighbor (no floating or loose parts), no concentric ring patterns on any surface, strong silhouettes, pale stone with dark crevices and baked ambient occlusion, moss in joints and on upward-facing edges.

(e) Budgets (quality 'high'):
- `landmarksMain`: at most 62,000 triangles and 25 draw calls.
- `landmarksWork`: at most 60,000 triangles and 25 draw calls.

(f) Argon reply format for this module: the FIRST reply is the complete file; every later round must be a patch of changed functions or constants only (`REPLACE function`, `ADD function`, `REPLACE constant`, `ADD constant`, `DELETE`) with complete function bodies, as used for the shell.

## FLOOR ART CONTRACT

Applies to the tower floor art modules (A06a farm, A06b forest). Read the whole section before writing code.

<FLOORCONTRACT>
FLOOR ART CONTRACT

FILES
- src/art/floors/farm.js exports buildFarmFloorArt(ctx). It builds floor 1 (the Greek countryside farm).
- src/art/floors/prairie.js exports buildPrairieFloorArt(ctx) for floor 2 (biome prairie).
- src/art/floors/forest.js exports buildForestFloorArt(ctx). It builds floors 3 to 5 (the tower forest; floors 3-4 share the module, floor 5 is the same module in boss-arena mode, driven by ctx.layout).
- All return a FloorArtModule. src/art/floors/FloorAssembler.js (engine-side, already written) is the only code that knows floor numbers: floor 1 -> farm, floor 2 -> prairie, floors 3-5 -> forest.
- Allowed imports: import * as THREE from 'three' and, optionally, mergeGeometries from 'three/addons/utils/BufferGeometryUtils.js'. Nothing else. No external files, no textures from disk, no network, no project imports (the palette arrives in ctx).

CTX
ctx = {
  layout,    // READ-ONLY layout object from src/world/floorLayouts.js (dump included below)
  quality,   // 'low' | 'medium' | 'high'
  seed,      // integer, the only source of decoration randomness
  palette,   // the PALETTE object copied into this prompt
}

RETURN: FloorArtModule
{
  group,      // THREE.Group; y = 0 is the ground plane; the viewer adds it to the scene
  anchors,    // named Object3D or Vector3 values, at least entranceGate and exitGate; more welcome (camps, torches, ruin centres)
  lights,     // [{ position: Vector3, color: hex, intensity, distance }] desired warm point lights; the viewer activates the closest 6
  update(dt, time, camera),  // cheap animation (grass sway, fireflies, torch flicker, drifting dust, flags); safe every frame; allocation-free
  setQuality(q),             // switch detail without leaking; may rebuild
  setLighting(lighting),     // optional; lighting = { ambient: {color,intensity}, hemi: {sky,ground,intensity}, sun: {color,intensity,direction}, fog: {color,near,far}, windowGlow, lampGlow }
  setGateState({ entranceOpen, exitOpen, arenaSealed }), // moves or hides the gate meshes only; never touches gameplay state
  destroyPillar(index),      // floor 5 only: hides pillar <index> of ctx.layout.bossArena.pillars (mesh named by its id) and returns true; false elsewhere
  getStats() -> { meshes, triangles, drawCallsEstimate },
  dispose(),
}

HARD RULES
1. The layout is the truth. Every obstacle, tree trunk, fence post, pillar, camp, ruin, clearing edge, path edge and gate must sit exactly where ctx.layout puts it (see the dump). Never add, remove or move a gameplay blocker. The game does not read art colliders.
2. Draw the road from ctx.layout.pathPolyline with the full width ctx.layout.pathWidth; draw clearings at center/radius; draw chokes at position/direction/width. The walkable silhouette must read at a glance from both the player view and the bird's eye view.
3. Determinism: all prop and decoration randomness comes from ctx.seed through a local Mulberry32 (copy the tiny createRng from src/world/floorLayouts.js into your own file); never Math.random, never Date.
4. Budgets for the whole module: at 'high' at most 240,000 triangles and 48 draw calls, at 'medium' at most 156,000 triangles and 40 draw calls, at 'low' at most 96,000 triangles and 34 draw calls. The viewer shows live numbers and turns them red above budget.
5. Materials: at most 12 distinct materials. Use MeshToonMaterial with a 4-step gradientMap for everything lit, caching and sharing materials. At most 2 canvas textures, each at most 512x512 (mipmaps, repeat wrapping); everything else uses vertex colors. No real-time shadows; fake contact darkening with vertex colors or dark decal quads.
6. Merge all static geometry that shares a material into BufferGeometry chunks (4 spatial chunks so frustum culling works). Use InstancedMesh for repeated props (trees, rocks, grass tufts, fence posts, flags). No per-frame allocation. Frustum culling stays on.
7. No THREE lights of any kind (PointLight, SpotLight, DirectionalLight, HemisphereLight, AmbientLight). Use emissive materials and the `lights` descriptors only.
8. Scale: hero 1.75 m, goblin 1.15 m, hobgoblin chief 2.7 m. Tent flaps and doors at least 1.9 m. Gate meshes match ctx.layout.entranceBarrier and ctx.layout.exitGate (their width, about 2.4 m tall). Floor 5 pillars use the layout values (height 4.0, radius 1.2).
9. Floors are flat today; ctx.layout.getGroundY() returns 0 everywhere. Keep every walkable surface at y = 0; ground art may add at most 0.05 m of visual relief that never intersects feet. The art terrain may continue and RISE outside the playable bounds (hills and mountain slopes) to hide the edge, as long as inside the bounds it equals getGroundY exactly.
10. The only warm light sources are campfires, torches and windows; everything else follows the cold farm/forest palette. Readability first: strong silhouettes, no black voids, no floating parts, moss in joints and on upward-facing ledges.
11. The module must work on its own: no reliance on TowerScene, EnemyManager or the viewer, only on ctx.
12. Keep the whole module in ONE file (farm.js, prairie.js or forest.js), self-contained.

LOOK
Stylized semi-realistic toon in the same manhwa style as the heroes and the town: MeshToonMaterial, 4-step gradientMap, thin dark outlines (0x14101c) only on large silhouettes (big trees, ruins, gates) and only if cheap. Farm: Greek countryside in late afternoon; warm ochre dirt road, dry grass, olive trees, whitewashed stone, terracotta roofs. Forest: cold foggy woods, dark teal-green canopy, mossy stone, amber campfire pockets, and a ruined stone boss arena on floor 5. Do not add a sky dome or the main directional light; the viewer owns sky, fog, exposure and the sun.
</FLOORCONTRACT>

