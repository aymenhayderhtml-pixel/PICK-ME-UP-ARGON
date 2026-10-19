# Argon Brief 04: Iselle (Guide Fairy)

We are building a browser game with Three.js r160 based on the manhwa Pick Me Up: Infinite Gacha. Heroes, enemies and weapons already exist in a stylized semi-realistic toon style. Now I need Iselle, the guide fairy of the game: she cheerfully announces grim system events, teases the heroes about their low survival odds, and executes rule breakers. I attach reference panels.

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

## ISELLE CURRENT STATE
1. `src/hub/Iselle.js:3-42` defines class `Iselle` with placeholder sphere body (0.4m diameter) and two wing planes (0.35x0.22m) with PointLight.
2. She flies at height ~1.8-2.2 in a figure-eight around the altar or hovers near the player with wing flapping (`Iselle.js:44-88`).
3. Her group is added directly to `scene`; other systems read `mesh.position` or assign `overrideTarget` (`HubHeroes.js:985`, `SummonEffect.js:257`).
4. Scripted execution: she flies over insubordinate heroes and triggers a divine lightning strike (`HubHeroes.js:985-1031`).
5. UI & Dialogues: `IselleTutorial.js:84` uses emoji 🧚‍♀️ in the dialogue header; `src/data/iselle.js` provides `ISELLE_LINES` for cheeky quips.

## BRIEF
Iselle looks like the attached panels: a young girl with dark brown, almost black hair in two long braided twin tails tied with dark ribbons, small dark horn-like hair buns or ribbons on top of her head, sharp red eyes with a calm, slightly cruel look, pale skin, a black and deep-purple gothic dress with white lace ruffles on the shoulders and the hem, a black choker with a small silver emblem, long black sleeves with lace cuffs, dark stockings, tiny black shoes. She is a FAIRY: add two large translucent wings with a dark violet membrane and a glowing lilac edge (4 wing segments each, slightly pointed), that flutter when she floats. Her aura is a faint pulsing purple-white glow around her, an additive shell with low opacity. The contrast is the point: she smiles sweetly while her eyes stay cold. Proportions: a big head with a chibi-leaning but elegant ratio (about 4 heads tall), small hands, a flared skirt that sways with the hover bob (animate the skirt in setPose with a few ring segments). The braids are chains of 6 tapered capsules that sway with a spring-like lag driven by t and update(dt). The face is a canvas texture with large red eyes with a dark ring, a white highlight, long lashes, eyebrows, a small mouth, and a faint blush, one texture per expression (cached). Poses must have character: float is a slow elegant bob; explain wags a finger; scold leans forward; punish raises her hand with a slow menacing grace, then a sudden downward snap; summon spins with open arms; sad droops. drawIsellePortrait draws a 2D version of her bust (head, braids, ribbons, collar, a bit of the shoulders) with all expressions, in the same colors, clean flat shapes with a thin outline, suitable for a 128 px dialogue portrait.

## DELIVERABLE
Reply with ONE complete file src/art/iselle.js in a single code block (at most 1000 lines, no TODO placeholders, only the allowed import). After the code block write ‘WIRING NOTES’ with at most 8 lines (the poses worth knowing, how the skirt and braids are animated, how setOpacity works, final mesh and triangle counts). Do not repeat the contract. If you must choose between detail and the performance budget, keep the performance budget.
