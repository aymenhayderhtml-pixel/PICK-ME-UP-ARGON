# FLOOR LAYOUT

`src/world/floorLayouts.js` is the single source of truth for the walkable geometry of
tower floors. `src/world/TowerFloor.js` builds the scene geometry, colliders, spawn data and
walkability of every floor from the layout returned by
`generateFloorLayout(floorNumber, seed)` instead of hardcoding positions; the biome
art modules in `src/art/floors/` build the dressing on top of the same layout. The module is
pure JavaScript (no THREE import); positions are plain `{ x, z }` objects, so the layout
can be dumped, tested and consumed by art modules without touching the renderer.

```js
import { generateFloorLayout } from '../world/floorLayouts.js';

const floor = generateFloorLayout(floorNumber, seed);
```

## API

| Export | Description |
| --- | --- |
| `generateFloorLayout(floorNumber, seed)` | Returns the full layout object described below. Floor 1 is a fixed layout (seed ignored); floors 2-5 are seeded entirely by `seed`. |
| `createRng(seed)` | Mulberry32 PRNG used by the seeded floors, exported for tests and tools. |

The game calls `generateFloorLayout(floorNumber, floorNumber * 7919 + 13)`, so the shipped
floors are floor 1 seed 7932, floor 2 seed 15851, floor 5 seed 39608. Any seed works and
is deterministic.

### Return shape

| Field | Type | Meaning | Main consumers |
| --- | --- | --- | --- |
| `floorNumber` | number | Echo of the argument. | Debug, art modules |
| `seed` | number | Echo of the argument. | Debug, art modules |
| `bounds` | `{ minX, maxX, minZ, maxZ }` | Ground plane extents and outer walkable bounds. | Ground builder, `isWalkable` |
| `pathPolyline` | `{ x, z }[]` | Centre line of the main road, from the entrance clearing to the exit. | Road/ground art, terrain flattening |
| `pathWidth` | number | Full width of the road around the polyline (meters). | Road art, walkability |
| `clearings` | `{ id, center, radius, triggerRadius, spawnPoints }[]` | Combat arenas / spawn rooms in path order. `triggerRadius > radius` triggers enemy activation slightly before entry. | Combat triggers, enemy spawns, art |
| `chokePoints` | `{ position, direction, width }` | Narrow gaps between clearings (fences, tree trunks). `direction` is the unit vector along the corridor. | Gate/fence art, ambush logic |
| `ambushSpots` | `{ x, z }[]` | Spots where enemies can hide for ambushes (flanks of clearings and chokes). | Enemy AI, art markers |
| `startPosition` | `{ x, z }` | Player spawn. | TowerScene, party slots |
| `exitPosition` | `{ x, z }` | Floor exit / stairs. | Exit gate, TowerScene |
| `exitGate` | `{ position, rotationY, width }` | Exit barrier gate. Opens when the floor is cleared. | TowerFloor gate mesh |
| `entranceBarrier` | `{ position, rotationY, width }` | Barrier behind the entrance that seals once the player commits. | Entrance gate mesh |
| `bossArena` | `null` or `{ center, radius, pillars, wallSegments, entrance }` | Floor 5 only. `pillars` are `{ id, x, z, radius, height }`, `wallSegments` are `{ x, z, length, rotationY }` (ruined walls with two outer gaps), `entrance` is `{ position, rotationY, width }` for the arena gap. | Pillar destruction, arena art |
| `campSpots` | `{ x, z, radius, type }[]` | Decorative/progression spots. `type` is `'camp'` (goblin camp), `'ruin'` (broken walls), `'farm'` (farmhouse area), `'well'` or `'temple'` (floor 1 landmarks). | Props (tower props, farm props) |
| `obstacles` | `{ x, z, radius }[]` | Static circular colliders that block movement (fence posts, tree trunks, columns, farmhouse, well, hay bales, choke trees). Included so `walkable` can be reconstructed exactly. | Colliders, prop placement, walkability |
| `walkable(x, z)` | `(number, number) => boolean` | Static walkability of the generated layout. | Floor `isWalkable` wrappers |
| `getGroundY(x, z)` | `(number, number) => number` | Ground height. Currently returns 0 for every floor (all floors are flat), kept for future heightmaps. | Ground, movement |

### Walkable semantics

`walkable` is purely static: it includes `bounds`, fences, all `obstacles`, all clearings
(radius minus a 0.5 m margin) and the path corridor union. On floor 5 it also includes the
six arena pillars (they block while alive).

It does **not** know about dynamic state. The floor modules add, on top of
`layout.walkable`:

- the entrance barrier (`z > 6.0` while closed),
- the floor 5 arena seal band (`-24.5 < z < -23.0`, `|x| < 5` while sealed),
- the exit gate (`z < exitPosition.z - 0.5` while closed),
- destroyed pillars on floor 5 (a destroyed pillar's circle becomes walkable).

The equality test `test-floor-layouts.mjs` (repo root, run with `node test-floor-layouts.mjs`)
compares every value above against the original hardcoded formulas for floors 1, 2, 3, 4
and 5 at the shipped seeds plus extra seeds, and compares `walkable` on a 1 m grid over
each floor's bounds.

Note: `obstacles` is an addition to the originally agreed field list. It exists because
`walkable` must reproduce the old collision exactly, and every floating radius would
otherwise live in two places.

## Floor 1 (farm) - seed 7932

Fixed layout, seed respected only for `seed` echo. Straight north-south road, four
clearings, three fence chokepoints, a farm at the south-west, a well near the exit and a
temple ruin east of clearing 3. `spawnPoints` mirror the hardcoded floor 1 goblin groups
in `EnemyManager` (group centres in clearings 1 to 3; the arena clearing 3 has a fourth
spawn point for the final group).

```json
{
  "floorNumber": 1,
  "seed": 7932,
  "bounds": {
    "minX": -46,
    "maxX": 46,
    "minZ": -130,
    "maxZ": 7
  },
  "pathPolyline": [
    {
      "x": 0,
      "z": 6
    },
    {
      "x": 0,
      "z": -20
    },
    {
      "x": 2,
      "z": -55
    },
    {
      "x": -2,
      "z": -94
    },
    {
      "x": 0,
      "z": -125
    }
  ],
  "pathWidth": 4.7,
  "clearings": [
    {
      "id": "clearing_0",
      "center": {
        "x": 0,
        "z": 0
      },
      "radius": 13,
      "spawnPoints": [],
      "triggerRadius": 15
    },
    {
      "id": "clearing_1",
      "center": {
        "x": 0,
        "z": -35
      },
      "radius": 15,
      "spawnPoints": [
        {
          "x": 0,
          "z": -32
        },
        {
          "x": -8,
          "z": -30
        },
        {
          "x": 7,
          "z": -34
        }
      ],
      "triggerRadius": 17
    },
    {
      "id": "clearing_2",
      "center": {
        "x": 0,
        "z": -75
      },
      "radius": 16,
      "spawnPoints": [
        {
          "x": -2,
          "z": -70
        },
        {
          "x": -11,
          "z": -74
        },
        {
          "x": 10,
          "z": -72
        }
      ],
      "triggerRadius": 18
    },
    {
      "id": "clearing_3",
      "center": {
        "x": 0,
        "z": -112
      },
      "radius": 15,
      "spawnPoints": [
        {
          "x": -6,
          "z": -112
        },
        {
          "x": 0,
          "z": -110
        },
        {
          "x": 6,
          "z": -112
        },
        {
          "x": 3,
          "z": -115
        }
      ],
      "triggerRadius": 17
    }
  ],
  "chokePoints": [
    {
      "position": {
        "x": 0,
        "z": -20
      },
      "direction": {
        "x": 0,
        "z": -1
      },
      "width": 3.2
    },
    {
      "position": {
        "x": 0,
        "z": -55
      },
      "direction": {
        "x": 0,
        "z": -1
      },
      "width": 3.2
    },
    {
      "position": {
        "x": 0,
        "z": -94
      },
      "direction": {
        "x": 0,
        "z": -1
      },
      "width": 3.2
    }
  ],
  "ambushSpots": [
    {
      "x": -8,
      "z": -18
    },
    {
      "x": 8,
      "z": -18
    },
    {
      "x": -10,
      "z": -28
    },
    {
      "x": 10,
      "z": -28
    },
    {
      "x": -12,
      "z": -50
    },
    {
      "x": 12,
      "z": -50
    },
    {
      "x": -10,
      "z": -90
    },
    {
      "x": 10,
      "z": -90
    }
  ],
  "startPosition": {
    "x": 0,
    "z": 4
  },
  "exitPosition": {
    "x": 0,
    "z": -125
  },
  "exitGate": {
    "position": {
      "x": 0,
      "z": -125
    },
    "rotationY": 0,
    "width": 3.6
  },
  "entranceBarrier": {
    "position": {
      "x": 0,
      "z": 6.5
    },
    "rotationY": 0,
    "width": 14
  },
  "bossArena": null,
  "campSpots": [
    {
      "x": 16,
      "z": -75,
      "radius": 9,
      "type": "temple"
    },
    {
      "x": -14,
      "z": -112,
      "radius": 5.5,
      "type": "farm"
    },
    {
      "x": -8,
      "z": -105,
      "radius": 3,
      "type": "well"
    }
  ],
  "obstacles": [
    {
      "x": -2,
      "z": -20,
      "radius": 0.8
    },
    {
      "x": 2,
      "z": -20,
      "radius": 0.8
    },
    {
      "x": -2,
      "z": -55,
      "radius": 0.8
    },
    {
      "x": 2,
      "z": -55,
      "radius": 0.8
    },
    {
      "x": -2,
      "z": -94,
      "radius": 0.8
    },
    {
      "x": 2,
      "z": -94,
      "radius": 0.8
    },
    {
      "x": -14,
      "z": -4,
      "radius": 0.6
    },
    {
      "x": 14,
      "z": -4,
      "radius": 0.6
    },
    {
      "x": -22,
      "z": 2,
      "radius": 0.6
    },
    {
      "x": 22,
      "z": 2,
      "radius": 0.6
    },
    {
      "x": -18,
      "z": -32,
      "radius": 0.6
    },
    {
      "x": 18,
      "z": -32,
      "radius": 0.6
    },
    {
      "x": -25,
      "z": -48,
      "radius": 0.6
    },
    {
      "x": 25,
      "z": -48,
      "radius": 0.6
    },
    {
      "x": 8,
      "z": -70,
      "radius": 0.6
    },
    {
      "x": 22,
      "z": -72,
      "radius": 0.6
    },
    {
      "x": 10,
      "z": -84,
      "radius": 0.6
    },
    {
      "x": 24,
      "z": -84,
      "radius": 0.6
    },
    {
      "x": 16,
      "z": -64,
      "radius": 0.6
    },
    {
      "x": 26,
      "z": -68,
      "radius": 0.6
    },
    {
      "x": -16,
      "z": -102,
      "radius": 0.6
    },
    {
      "x": -25,
      "z": -115,
      "radius": 0.6
    },
    {
      "x": -18,
      "z": -122,
      "radius": 0.6
    },
    {
      "x": 15,
      "z": -105,
      "radius": 0.6
    },
    {
      "x": 20,
      "z": -118,
      "radius": 0.6
    },
    {
      "x": 14,
      "z": -124,
      "radius": 0.6
    },
    {
      "x": 10,
      "z": -81,
      "radius": 0.8
    },
    {
      "x": 14,
      "z": -81,
      "radius": 0.8
    },
    {
      "x": 18,
      "z": -81,
      "radius": 0.8
    },
    {
      "x": 22,
      "z": -81,
      "radius": 0.8
    },
    {
      "x": 10,
      "z": -69,
      "radius": 0.8
    },
    {
      "x": 14,
      "z": -69,
      "radius": 0.8
    },
    {
      "x": 18,
      "z": -69,
      "radius": 0.8
    },
    {
      "x": 22,
      "z": -69,
      "radius": 0.8
    },
    {
      "x": -14,
      "z": -112,
      "radius": 4
    },
    {
      "x": -8,
      "z": -105,
      "radius": 1.2
    },
    {
      "x": -5,
      "z": -16,
      "radius": 0.8
    },
    {
      "x": -6.5,
      "z": -17,
      "radius": 0.8
    },
    {
      "x": 6,
      "z": -22,
      "radius": 0.8
    },
    {
      "x": -12,
      "z": -62,
      "radius": 0.8
    },
    {
      "x": -14,
      "z": -63,
      "radius": 0.8
    },
    {
      "x": -13,
      "z": -61,
      "radius": 0.8
    },
    {
      "x": -6,
      "z": -108,
      "radius": 0.8
    },
    {
      "x": -5,
      "z": -110,
      "radius": 0.8
    },
    {
      "x": -7,
      "z": -112,
      "radius": 0.8
    },
    {
      "x": 6,
      "z": -116,
      "radius": 0.8
    },
    {
      "x": 7.5,
      "z": -117,
      "radius": 0.8
    }
  ]
}
```

## Floor 2 (prairie) - seed 15851

Floor 2 uses the open-field prairie biome built with the same generator family as floor 1:
a wide trampled path (width 5.8 m), 3 open clearings as meadows (plus arrival clearing 0),
ambush spots in tall grass and behind boulders, and no dense forest walls. The visual
enclosure consists of gentle ridges, low hills, hedgerows and rock lines.

```json
{
  "floorNumber": 2,
  "seed": 15851,
  "bounds": {
    "minX": -48,
    "maxX": 48,
    "minZ": -132,
    "maxZ": 7
  },
  "pathPolyline": [
    {
      "x": 0,
      "z": 6
    },
    {
      "x": 0,
      "z": -20
    },
    {
      "x": 2,
      "z": -55
    },
    {
      "x": -1,
      "z": -94
    },
    {
      "x": 0,
      "z": -125
    }
  ],
  "pathWidth": 5.8,
  "clearings": [
    {
      "id": "clearing_0",
      "center": {
        "x": 0,
        "z": 0
      },
      "radius": 14,
      "spawnPoints": [],
      "triggerRadius": 16
    },
    {
      "id": "clearing_1",
      "center": {
        "x": 0,
        "z": -35
      },
      "radius": 16,
      "spawnPoints": [
        {
          "x": -3,
          "z": -32
        },
        {
          "x": 3,
          "z": -32
        },
        {
          "x": -7,
          "z": -36
        },
        {
          "x": 0,
          "z": -37
        },
        {
          "x": 7,
          "z": -36
        }
      ],
      "triggerRadius": 18
    },
    {
      "id": "clearing_2",
      "center": {
        "x": 2,
        "z": -75
      },
      "radius": 17,
      "spawnPoints": [
        {
          "x": -4,
          "z": -72
        },
        {
          "x": 0,
          "z": -70
        },
        {
          "x": 5,
          "z": -72
        },
        {
          "x": -7,
          "z": -76
        },
        {
          "x": 6,
          "z": -77
        },
        {
          "x": 0,
          "z": -80
        },
        {
          "x": 2,
          "z": -83
        }
      ],
      "triggerRadius": 19
    },
    {
      "id": "clearing_3",
      "center": {
        "x": -1,
        "z": -112
      },
      "radius": 16,
      "spawnPoints": [
        {
          "x": -5,
          "z": -110
        },
        {
          "x": 0,
          "z": -108
        },
        {
          "x": 5,
          "z": -110
        },
        {
          "x": -7,
          "z": -114
        },
        {
          "x": 7,
          "z": -114
        },
        {
          "x": -2,
          "z": -116
        },
        {
          "x": 3,
          "z": -116
        },
        {
          "x": 0,
          "z": -119
        }
      ],
      "triggerRadius": 18
    }
  ],
  "chokePoints": [
    {
      "position": {
        "x": 0,
        "z": -20
      },
      "direction": {
        "x": 0,
        "z": -1
      },
      "width": 4.2
    },
    {
      "position": {
        "x": 1,
        "z": -55
      },
      "direction": {
        "x": 0,
        "z": -1
      },
      "width": 4.2
    },
    {
      "position": {
        "x": -1,
        "z": -94
      },
      "direction": {
        "x": 0,
        "z": -1
      },
      "width": 4.2
    }
  ],
  "ambushSpots": [
    {
      "x": -9,
      "z": -18
    },
    {
      "x": 9,
      "z": -18
    },
    {
      "x": -12,
      "z": -28
    },
    {
      "x": 11,
      "z": -28
    },
    {
      "x": -13,
      "z": -50
    },
    {
      "x": 13,
      "z": -50
    },
    {
      "x": -12,
      "z": -70
    },
    {
      "x": 14,
      "z": -72
    },
    {
      "x": -11,
      "z": -90
    },
    {
      "x": 11,
      "z": -90
    },
    {
      "x": -9,
      "z": -106
    },
    {
      "x": 10,
      "z": -106
    }
  ],
  "startPosition": {
    "x": 0,
    "z": 4
  },
  "exitPosition": {
    "x": 0,
    "z": -125
  },
  "exitGate": {
    "position": {
      "x": 0,
      "z": -125
    },
    "rotationY": 0,
    "width": 4
  },
  "entranceBarrier": {
    "position": {
      "x": 0,
      "z": 6.5
    },
    "rotationY": 0,
    "width": 14
  },
  "bossArena": null,
  "campSpots": [
    {
      "x": 18,
      "z": -75,
      "radius": 7.5,
      "type": "ruin"
    },
    {
      "x": -14,
      "z": -114,
      "radius": 5.5,
      "type": "camp"
    }
  ],
  "obstacles": [
    {
      "x": -2.8,
      "z": -20,
      "radius": 1.1
    },
    {
      "x": 2.8,
      "z": -20,
      "radius": 1.1
    },
    {
      "x": -2,
      "z": -55,
      "radius": 1.2
    },
    {
      "x": 3.8,
      "z": -55,
      "radius": 1.2
    },
    {
      "x": -3.6,
      "z": -94,
      "radius": 1.1
    },
    {
      "x": 2.2,
      "z": -94,
      "radius": 1.1
    },
    {
      "x": -16,
      "z": -6,
      "radius": 1.4
    },
    {
      "x": 15,
      "z": -4,
      "radius": 1.3
    },
    {
      "x": -19,
      "z": -34,
      "radius": 1.6
    },
    {
      "x": 18,
      "z": -36,
      "radius": 1.5
    },
    {
      "x": -22,
      "z": -76,
      "radius": 1.8
    },
    {
      "x": 18,
      "z": -75,
      "radius": 3.2
    },
    {
      "x": -18,
      "z": -114,
      "radius": 1.5
    },
    {
      "x": 16,
      "z": -116,
      "radius": 1.6
    },
    {
      "x": -8,
      "z": -122,
      "radius": 1.2
    },
    {
      "x": 10,
      "z": -124,
      "radius": 1.3
    }
  ]
}
```

## Floor 5 (boss arena) - seed 39608

Seeded layout only in the RNG-ordered decorations; the arena itself is structurally fixed:
entrance clearing (radius 10) at the origin, then a long approach road to a 24 m radius
arena centred at `(0, -48)`. Six pillars at 14 m around the arena centre are destructible
(destruction removes the walkability blocker); ten wall segments at 23.5 m leave the two
outer gaps. `campSpots` holds the boss camp at `(0, -65)` and two ruins at `(±12, -56)`.

```json
{
  "floorNumber": 5,
  "seed": 39608,
  "bounds": {
    "minX": -26,
    "maxX": 26,
    "minZ": -74,
    "maxZ": 12
  },
  "pathPolyline": [
    {
      "x": 0,
      "z": 0
    },
    {
      "x": 0,
      "z": -14
    },
    {
      "x": 0,
      "z": -28
    },
    {
      "x": 0,
      "z": -48
    },
    {
      "x": 0,
      "z": -70
    }
  ],
  "pathWidth": 9,
  "clearings": [
    {
      "id": "clearing_0",
      "center": {
        "x": 0,
        "z": 0
      },
      "radius": 10,
      "spawnPoints": [],
      "triggerRadius": 12
    },
    {
      "id": "clearing_1",
      "center": {
        "x": 0,
        "z": -48
      },
      "radius": 24,
      "spawnPoints": [
        {
          "x": 11.5776,
          "z": -44.2105
        }
      ],
      "triggerRadius": 26
    }
  ],
  "chokePoints": [
    {
      "position": {
        "x": 0,
        "z": -20
      },
      "direction": {
        "x": 0,
        "z": -1
      },
      "width": 3
    }
  ],
  "ambushSpots": [
    {
      "x": -2.0063,
      "z": -8.2598
    },
    {
      "x": -0.0169,
      "z": 8.5
    },
    {
      "x": 18.7021,
      "z": -56.1482
    },
    {
      "x": 20.3469,
      "z": -46.5287
    },
    {
      "x": 3.8,
      "z": -20
    }
  ],
  "startPosition": {
    "x": 0,
    "z": 3
  },
  "exitPosition": {
    "x": 0,
    "z": -70
  },
  "exitGate": {
    "position": {
      "x": 0,
      "z": -70
    },
    "rotationY": 0,
    "width": 3.6
  },
  "entranceBarrier": {
    "position": {
      "x": 0,
      "z": 6.5
    },
    "rotationY": 0,
    "width": 10
  },
  "bossArena": {
    "center": {
      "x": 0,
      "z": -48
    },
    "radius": 24,
    "pillars": [
      {
        "id": "pillar_0",
        "x": 14,
        "z": -48,
        "radius": 1.2,
        "height": 4
      },
      {
        "id": "pillar_1",
        "x": 7,
        "z": -35.8756,
        "radius": 1.2,
        "height": 4
      },
      {
        "id": "pillar_2",
        "x": -7,
        "z": -35.8756,
        "radius": 1.2,
        "height": 4
      },
      {
        "id": "pillar_3",
        "x": -14,
        "z": -48,
        "radius": 1.2,
        "height": 4
      },
      {
        "id": "pillar_4",
        "x": -7,
        "z": -60.1244,
        "radius": 1.2,
        "height": 4
      },
      {
        "id": "pillar_5",
        "x": 7,
        "z": -60.1244,
        "radius": 1.2,
        "height": 4
      }
    ],
    "wallSegments": [
      {
        "x": 23.5,
        "z": -48,
        "length": 3.5,
        "rotationY": 1.5708
      },
      {
        "x": 20.3516,
        "z": -36.25,
        "length": 3.5,
        "rotationY": 2.0944
      },
      {
        "x": 11.75,
        "z": -27.6484,
        "length": 3.5,
        "rotationY": 2.618
      },
      {
        "x": -11.75,
        "z": -27.6484,
        "length": 3.5,
        "rotationY": 3.6652
      },
      {
        "x": -20.3516,
        "z": -36.25,
        "length": 3.5,
        "rotationY": 4.1888
      },
      {
        "x": -23.5,
        "z": -48,
        "length": 3.5,
        "rotationY": 4.7124
      },
      {
        "x": -20.3516,
        "z": -59.75,
        "length": 3.5,
        "rotationY": 5.236
      },
      {
        "x": -11.75,
        "z": -68.3516,
        "length": 3.5,
        "rotationY": 5.7596
      },
      {
        "x": 11.75,
        "z": -68.3516,
        "length": 3.5,
        "rotationY": 6.8068
      },
      {
        "x": 20.3516,
        "z": -59.75,
        "length": 3.5,
        "rotationY": 7.3304
      }
    ],
    "entrance": {
      "position": {
        "x": 0,
        "z": -23.5
      },
      "rotationY": 0,
      "width": 10
    }
  },
  "campSpots": [
    {
      "x": 0,
      "z": -65,
      "radius": 5,
      "type": "camp"
    },
    {
      "x": -12,
      "z": -56,
      "radius": 3.5,
      "type": "ruin"
    },
    {
      "x": 12,
      "z": -56,
      "radius": 3.5,
      "type": "ruin"
    }
  ],
  "obstacles": [
    {
      "x": 2.7,
      "z": -20,
      "radius": 1.2
    },
    {
      "x": -2.7,
      "z": -20,
      "radius": 1.2
    }
  ]
}
```

## RNG order (important for changing the layout)

For floors 2-5 the layout consumes the seeded RNG in a fixed order: clearing radii first,
then clearing centres, then midpoints, then spawn points (per clearing, per spawn), then
ambush spots, then the choke flankers. Changing the number or order of `rng()` calls
shifts every downstream value and therefore the whole floor - treat the order as part of
the layout contract. The scene-level decoration streams (trees, mud patches, fireflies in
`src/world/TowerFloor.js`) continue after the layout consumes its share, so those visuals depend
on this order implicitly (that is accepted; gameplay does not).
