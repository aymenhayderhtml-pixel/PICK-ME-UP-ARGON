We are building a browser game with Three.js r160 based on the manhwa Pick Me Up: Infinite Gacha; the characters are summoned ordinary people in plain clothes; I attach reference images.

## NEW CONTRACT

FILE: src/art/hero.js. ES module. Only import: import * as THREE from ‘three’ (Three.js r160). No other imports, no external files or textures; canvas textures up to 256x256 are allowed.
EXPORTS: createHeroModel(opts) -> HeroModel; disposeHeroCaches(); HERO_POSES (array of pose names).
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

## CURRENT STATE

1. Model height: 1.67 units from feet (y = 0.00) to top of hair (y = 1.67).
2. Facing convention: The model faces along the +Z axis when rotation.y = 0.
3. Pivot names: Existing models use torsoGroup, leftArmPivot, rightArmPivot, leftLegPivot, and rightLegPivot.
4. Animation: Locomotion swings arm/leg pivots on rotation.x, attacks swing rightArmPivot on x and y, and idle bobs torsoGroup on y.
5. Weapon and shield attachment: Weapons attach to rightArmPivot (right hand) and shields attach to leftArmPivot (left hand).
6. Camera fade & material changes: Meshes undergo runtime opacity fades without setting depthWrite false on body geometry.

## ART BRIEF

Make the best-looking, performance-friendly character module you can. Use clean procedural geometry: smooth lathe or capsule limbs with tapered shapes, a shaped torso, hands with simple fingers or mitten shapes, a neck, a real head shape (not a sphere): jaw, nose bridge, ears. Hair is built from several shaped pieces (spiky = layered cones and wedges; braid = a chain of small tapered capsules; bowl = a cap shape with a fringe). Clothes are separate shells slightly larger than the body (shirt with collar and rolled sleeves, vest, trousers, boots with cuffs), with small details such as shirt buttons and a belt. Animation poses should feel weighted: counter-rotating hips and shoulders in walk and run, knees bending, a slight torso lean, a breathing idle, and clear anticipation in the attack poses (a wind-up, a snap, a recovery). Expressions use the canvas face texture. Default look when opts are missing: pick from the seed. Character reference: Han Islat is lean with messy spiky black hair, sharp dark eyes, a white collared short-sleeve shirt, black trousers and boots; Jenna has a red-orange braid over her shoulder, freckles, a light scout tunic and rolled sleeves; Aaron is tall and bulky with short brown hair and stubble; novices are ordinary adults in linen shirts and vests (an older gray-haired bearded man, a young man with a bowl cut, a blond man in a dark vest, a bald dark-skinned man in a gray-tan tunic with a sash). Match the attached manhwa panels for faces, hair and clothes.

## DELIVERABLE

Reply with ONE complete file src/art/hero.js in a single code block (at most 1000 lines, no TODO placeholders, no imports except three). After the code block write ‘WIRING NOTES’ with at most 8 lines for the engineer who will connect it to the game (anything non-obvious about the poses, intensity values, or the opacity handling). Do not repeat the contract. If you must choose between more detail and the performance budget, keep the performance budget.
