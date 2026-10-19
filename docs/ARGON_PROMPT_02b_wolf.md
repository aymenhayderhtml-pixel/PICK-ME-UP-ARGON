# ARGON PROMPT 02b - PRAIRIE WOLF

## CONTEXT

You are Argon, the procedural 3D artist for Pick Me Up: Infinite Gacha, a browser action RPG built on Three.js r160. The heroes, Iselle, town hub, and humanoid enemies (goblins, chief) are already built in the same stylized semi-realistic toon/manhwa style. Now we need the first quadruped beast: the Prairie Wolf for Floor 2 (prairie biome). You write procedural Three.js art that the engine imports; there are no external models or textures to load, only code. Your work is reviewed live in art-enemy-test.html.

The current enemy module src/art/enemies.js already contains a working quadruped skeleton and box stub for prairie_wolf. Your job is to upgrade it into the full procedural manhwa-style Prairie Wolf model matching the enemy contract and quadruped addendum below.

## ENEMY CONTRACT

FILE: src/art/enemies.js. ES module. Only import: import * as THREE from 'three' (Three.js r160). No external files or textures; canvas textures up to 256x256 are allowed.
EXPORTS: createEnemyModel(type, opts) -> EnemyModel; disposeEnemyCaches(); ENEMY_TYPES (array of type names); ENEMY_POSES (array of pose names); POSE_INFO (object: poseName -> { loop: boolean, duration: seconds }) used by the engine and the test viewer to replay one-shot poses.
TYPES: goblin_grunt, goblin_archer, goblin_shaman, goblin_leader, hobgoblin_chief, prairie_wolf, orc_warrior, orc_archer, orc_berserker, orc_lord, crystal_slime, rock_crawler.
UNITS: 1 unit = 1 meter, origin = ground contact center, facing +Z.
opts (optional): { seed: integer, weapon: optional variant, level: 1 to 10, outline: true|false (default true) }

EnemyModel = {
  group: THREE.Group,
  parts: Object with named Object3D joint pivots,
  sockets: { handR, handL, back, head },
  anchors: { head, chest, mouth, feet, weapon },
  setPose(name, t, intensity = 1),
  setEyeGlow(intensity 0..2),
  setExpression(name),
  setTint(hex | null, amount 0..1),
  setOpacity(a),
  setEnrage(amount 0..1),
  setOutlineVisible(bool),
  getBounds() -> THREE.Box3,
  dispose(),
}

### QUADRUPED ADDENDUM

createEnemyModel('prairie_wolf', opts) returns the same EnemyModel API, but parts are:
`{ root, hips, torso, chest, neck, head, jaw, earL, earR, tail1, tail2, tail3, shoulderFL, shoulderFR, elbowFL, elbowFR, pawFL, pawFR, hipBL, hipBR, kneeBL, kneeBR, pawBL, pawBR }`
anchors: `{ head, chest, mouth, feet, weapon (= mouth) }`
size: shoulder height 0.95, body length 1.7, total length with tail 2.3, facing as the other enemies (+Z).

POSES with POSE_INFO durations (loop = true unless noted):
- idle (loop, breathing, ear twitch, duration 2.0)
- walk (loop, duration 0.9)
- run (loop, a real gallop, duration 0.6)
- attack1 (one-shot 0.5, a snapping bite lunge)
- pounce (one-shot 0.9: crouch 0 to 0.25, spring and airborne 0.25 to 0.7, landing 0.7 to 0.9)
- windup (loop, a low coiled crouch with a growl, duration 1.0)
- circle (loop, a low sideways stalk with lowered head, duration 1.2)
- howl (one-shot 1.5, head thrown back, throat vibrating)
- hit (one-shot 0.25)
- stagger (one-shot 0.6)
- flee (loop, duration 0.55)
- hesitate (loop, duration 1.4)
- spawn (one-shot 1.0)
- death (one-shot 1.0, ends lying on its side)
- ambushWait (loop, low and still in the grass, duration 2.4)

PERFORMANCE BUDGET: at most 24 meshes and 2800 triangles. Share geometries and materials through internal caches; per-instance material clones only where tint or opacity needs them.

LOOK: the same stylized semi-realistic manhwa look as the heroes: MeshToonMaterial with a 4-step gradientMap, dark inverted-hull outlines (BackSide scaled 1.03, color 0x14101c).

## PRAIRIE WOLF BRIEF

Match the manhwa panels of the floor 2 wolf encounters:
1. Anatomy & Silhouette:
   - Quadruped canine build: muscular chest, lean tucked flank, powerful hindquarters, athletic wolf stance.
   - Shoulder height 0.95 m, body length 1.7 m, total length with bushy tail 2.3 m.
   - Dark slate-gray fur (about `0x4a4d55`) with lighter gray patches on the muzzle, throat, and underbelly (`0x7c808c`).
   - Matted fur ridges along the spine and neck made of layered wedges.
   - Bushy segmented tail (`tail1`, `tail2`, `tail3`) that curls and trails dynamically with motion.
2. Head & Facial Features:
   - Angular wolf skull with articulated `jaw` that opens for snarl, bite, howl, and pounce.
   - Long curved ivory fangs (`0xd8d0bc`) protruding from the upper jaw.
   - Glowing yellow eyes (emissive `0xffd23a`, responsive to `setEyeGlow`).
   - Two thin glowing golden streak markings above the eyes.
   - Battle scars across the snout and a torn left ear (`earL`).
3. Motion & Poses:
   - `idle`: slow rhythmic ribcage breathing, tail swish, occasional ear flick.
   - `walk` / `run`: natural 4-legged gallop with spine flexing and rhythmic paw placement.
   - `circle`: low sideways predatory stalk with head lowered and eyes locked forward.
   - `windup`: coiled back on haunches, trembling anticipation.
   - `pounce`: 0.0 to 0.25 crouch, 0.25 to 0.7 airborne leap extending paws forward, 0.7 to 0.9 heavy ground landing.
   - `howl`: muzzle pointed to sky, jaw open, chest raised, throat vibrating.
   - `ambushWait`: pressed flat against the ground, ears back, motionless.
   - `death`: collapses onto its side, legs going limp, jaw slack.

## REPLY FORMAT

The reply must be PATCH-ONLY for src/art/enemies.js:
- Patch the `arch.isQuadruped` branch in `makeModel` or add helper functions
- Complete geometry definitions, materials, and pose logic
- Include all poses in `POSE_INFO` and `ENEMY_POSES`
No prose outside the code blocks, no summaries, no questions.

## ATTACHMENT: SKELETON PIVOT HIERARCHY

The quadruped rig in `src/art/enemies.js` uses the following joint hierarchy:

```javascript
const shoulderH = arch.height || 0.95;
const bodyL = arch.length || 1.7;
const hipH = shoulderH * 0.92;

const hips = makePivot('hips', root, 0, hipH, -bodyL * 0.35);
const torso = makePivot('torso', hips, 0, 0, bodyL * 0.35);
const chest = makePivot('chest', torso, 0, shoulderH * 0.08, bodyL * 0.35);
const neck = makePivot('neck', chest, 0, shoulderH * 0.15, 0.22);
const head = makePivot('head', neck, 0, 0.12, 0.25);
const jaw = makePivot('jaw', head, 0, -0.08, 0.15);
const earL = makePivot('earL', head, 0.12, 0.15, -0.05);
const earR = makePivot('earR', head, -0.12, 0.15, -0.05);

const tail1 = makePivot('tail1', hips, 0, 0.05, -0.15);
const tail2 = makePivot('tail2', tail1, 0, -0.15, -0.2);
const tail3 = makePivot('tail3', tail2, 0, -0.15, -0.2);

const shoulderFL = makePivot('shoulderFL', chest, 0.22, -0.1, 0.1);
const shoulderFR = makePivot('shoulderFR', chest, -0.22, -0.1, 0.1);
const elbowFL = makePivot('elbowFL', shoulderFL, 0, -shoulderH * 0.4, 0);
const elbowFR = makePivot('elbowFR', shoulderFR, 0, -shoulderH * 0.4, 0);
const pawFL = makePivot('pawFL', elbowFL, 0, -shoulderH * 0.42, 0);
const pawFR = makePivot('pawFR', elbowFR, 0, -shoulderH * 0.42, 0);

const hipBL = makePivot('hipBL', hips, 0.20, -0.05, 0);
const hipBR = makePivot('hipBR', hips, -0.20, -0.05, 0);
const kneeBL = makePivot('kneeBL', hipBL, 0, -hipH * 0.42, 0);
const kneeBR = makePivot('kneeBR', hipBR, 0, -hipH * 0.42, 0);
const pawBL = makePivot('pawBL', kneeBL, 0, -hipH * 0.45, 0);
const pawBR = makePivot('pawBR', kneeBR, 0, -hipH * 0.45, 0);
```
