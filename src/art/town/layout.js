// src/art/town/layout.js
// Single source of truth for Niflheimr town coordinates, dimensions, doors, waypoints, roads, and colors.

import { BUILDING_PADS, getGroundY } from './ground.js';

// Player collision tuning for the town hub. The walk-height map decides where
// the hero STANDS; these numbers decide what stops him (see WalkHeight.js:
// LAND_ONLY drops every prop from the height map).
export const PLAYER_COLLISION = {
  radius: 0.4,      // hero body radius used against every town collider
  skin: 0.02,       // separation so the hero never sticks to a surface
  cellSize: 4.0,    // broadphase grid cell size in world units
  passes: 2         // push-out passes per frame (the second pass slides)
};

// Solid town props, as multipliers of their mesh scale.
export const PROP_COLLIDERS = {
  treeTrunk: 0.38,        // trunk only, never the leaves
  boulder: 0.85,
  barrel: 0.36,
  crate: 0.40,
  fenceHalfLength: 0.9,   // half of the 1.8 m fence segment
  fenceHalfThickness: 0.15
};

// Building wall bands and the half width of every door opening.
export const WALL_COLLIDERS = {
  thickness: 0.4,
  cottageDoorHalf: 1.0,
  buildingDoorHalf: 1.4,
  synthesisDoorHalf: 1.7
};

// Draw the town collision shapes as wireframes (debug aid, built once).
export const SHOW_COLLIDERS = false;

export const LAYOUT = {
  // 12-sided dodecagonal perimeter wall
  wall: {
    sides: 12,
    apothem: 46.0,
    radius: 46.0 / Math.cos(Math.PI / 12), // ~47.6187
    height: 10.0,
    thickness: 2.5,
    innerApothem: 44.5,
    cornerPillar: {
      width: 3.0,
      height: 13.0,
      depth: 3.0,
      capRadius: 2.3,
      capHeight: 1.5,
      capSides: 4
    },
    pilaster: {
      width: 2.85,
      height: 10.5,
      depth: 0.7,
      interval: 6.0
    },
    cliffEdge: {
      innerRadius: 45.5,
      outerRadius: 53.5
    },
    islandUnderside: {
      topRadius: 54.0,
      depth: 60.0,
      segments: 18
    }
  },

  // Terrain height specs (note: ground flat at y = 0; deliberate steps only at building entrances)
  terrain: {
    flat: true,
    groundY: 0.0,
    size: 94.0,
    subdivisions: 120,
    pads: BUILDING_PADS
  },

  // Shared look of every zone signpost. The board is 2.2m x 0.7m with its
  // bottom 2m above the ground, the post runs from the ground up to the board
  // and the label plane floats 0.03m in front of the board face so the text
  // never z-fights with the board it is painted on.
  signStyle: {
    board: { width: 2.2, height: 0.7, depth: 0.14 },
    post: { width: 0.18, height: 2.0 },
    label: { width: 2.0, height: 0.5, offset: 0.03 }
  },

  // Buildings and major zones
  zones: {
    landing_area: {
      id: 'landing_area',
      name: 'Landing Area',
      center: { x: 20.0, z: 26.0 },
      footprint: { type: 'circle', radius: 8.0, terraceRadius: 14.0 },
      rotation: 0,
      door: {
        id: 'door_landing_area',
        position: { x: 20.0, y: 0.0, z: 16.0 },
        outward: { x: 0.0, y: 0.0, z: -1.0 }
      },
      doorCorridor: [
        { x: 20.0, z: 26.0 },
        { x: 20.0, z: 16.0 },
        { x: 20.0, z: 13.0 }
      ],
      interactionRadius: 8.0,
      sign: {
        text: 'LANDING AREA',
        offset: { x: -6.5, z: -2.5 },
        rotY: 1.204
      }
    },

    summoning_room: {
      id: 'summoning_room',
      name: 'Summoning Room',
      aliases: ['Summoning House', 'Summoning Altar'],
      center: { x: 30.0, z: 4.0 },
      footprint: { type: 'circle', radius: 10.0, height: 11.0, wallRadius: 10.2 },
      rotation: 0,
      door: {
        id: 'door_summoning_room',
        position: { x: 23.5, y: 1.8, z: 11.5 },
        outward: { x: -0.4138, y: 0.0, z: 0.9104 }
      },
      // The route out of the Summoning Room follows the ramp (the stairs) and
      // then the Landing Area steps. A straight line from the door to the town
      // cuts across the ramp railing and the terrace steps instead.
      doorCorridor: [
        { x: 30.0, z: 4.0 },
        { x: 23.5, z: 11.5 },
        { x: 20.9, z: 14.5 },
        { x: 20.0, z: 16.5 },
        { x: 20.0, z: 18.0 }
      ],
      interactionRadius: 8.5,
      sign: {
        text: 'SUMMONING ROOM',
        offset: { x: -4.2, z: 10.4 },
        rotY: -0.464
      }
    },

    town_square: {
      id: 'town_square',
      name: 'Town Square',
      center: { x: 14.0, z: -8.0 },
      footprint: { type: 'circle', radius: 11.0 },
      rotation: 0,
      door: null,
      doorCorridor: null,
      interactionRadius: 8.0,
      sign: {
        text: 'TOWN SQUARE',
        offset: { x: 9.0, z: 0.0 },
        rotY: 0.175
      }
    },

    space_time_rift: {
      id: 'space_time_rift',
      name: 'Space-Time Rift',
      aliases: ['Tower Gate'],
      center: { x: 32.53, z: -32.53 },
      footprint: { type: 'box', width: 6.5, height: 10.0, depth: 2.5 },
      rotation: 0,
      door: {
        id: 'door_space_time_rift',
        position: { x: 31.11, y: 0.0, z: -31.11 },
        outward: { x: -0.7071, y: 0.0, z: 0.7071 }
      },
      doorCorridor: [
        { x: 32.53, z: -32.53 },
        { x: 31.11, z: -31.11 },
        { x: 28.5, z: -28.5 }
      ],
      interactionRadius: 4.5,
      sign: {
        text: 'SPACE-TIME RIFT',
        offset: { x: -0.43, z: 5.93 },
        rotY: -0.772
      }
    },

    synthesis_chamber: {
      id: 'synthesis_chamber',
      name: 'Synthesis Chamber',
      aliases: ['Synthesis Room'],
      center: { x: 0.0, z: -32.0 },
      footprint: { type: 'circle', radius: 8.2, height: 9.0 },
      rotation: 0,
      door: {
        id: 'door_synthesis_chamber',
        position: { x: 0.0, y: 0.0, z: -23.8 },
        outward: { x: 0.0, y: 0.0, z: 1.0 }
      },
      doorCorridor: [
        { x: 0.0, z: -32.0 },
        { x: 0.0, z: -23.8 },
        { x: 0.0, z: -20.0 }
      ],
      interactionRadius: 7.5,
      sign: {
        text: 'SYNTHESIS CHAMBER',
        offset: { x: 3.8, z: 10.2 },
        rotY: 0.637
      }
    },

    armory: {
      id: 'armory',
      name: 'Armory',
      aliases: ['Blacksmith'],
      center: { x: -6.0, z: -20.0 },
      footprint: {
        type: 'box',
        width: 10.5,
        height: 4.5,
        depth: 5.0,
        mainWidth: 7.0,
        mainDepth: 5.0,
        forgeWidth: 3.5,
        forgeDepth: 3.8
      },
      // The wall band used by the player collision: the main hall only, the
      // lean-to forge shed on the +X side stays open.
      wallBox: { x: -7.25, z: -20.0, width: 7.0, depth: 5.0 },
      rotation: 0,
      door: {
        id: 'door_armory',
        position: { x: -6.0, y: 0.0, z: -17.4 },
        outward: { x: 0.0, y: 0.0, z: 1.0 }
      },
      doorCorridor: [
        { x: -6.0, z: -20.0 },
        { x: -6.0, z: -17.4 },
        { x: -6.0, z: -14.0 }
      ],
      interactionRadius: 4.5,
      sign: {
        text: 'ARMORY',
        offset: { x: -5.8, z: 4.0 },
        rotY: 1.269
      }
    },

    training_grounds: {
      id: 'training_grounds',
      name: 'Training Grounds',
      center: { x: -24.0, z: 20.0 },
      footprint: { type: 'box', width: 16.0, depth: 16.0, height: 2.5 },
      rotation: 0,
      door: {
        id: 'door_training_grounds',
        position: { x: -18.0, y: 0.0, z: 18.0 },
        outward: { x: 1.0, y: 0.0, z: 0.0 }
      },
      doorCorridor: [
        { x: -24.0, z: 20.0 },
        { x: -18.0, z: 18.0 },
        { x: -15.0, z: 18.0 }
      ],
      interactionRadius: 8.5,
      sign: {
        text: 'TRAINING GROUNDS',
        offset: { x: 9.8, z: 0.8 },
        rotY: 2.374
      },
      dummyPositions: [
        { id: 'dummy_1', stand: { x: -26.4, y: 0, z: 16.8 }, dummy: { x: -26.4, y: 0, z: 18.0 } },
        { id: 'dummy_2', stand: { x: -24.0, y: 0, z: 16.8 }, dummy: { x: -24.0, y: 0, z: 18.0 } },
        { id: 'dummy_3', stand: { x: -21.6, y: 0, z: 16.8 }, dummy: { x: -21.6, y: 0, z: 18.0 } }
      ],
      // Four sub-zones of the training place. The wooden dummies teach sword
      // and shield, the archery targets teach the bow, the fire targets teach
      // the staff, and the sparring ring is where heroes fight each other.
      trainingZones: {
        wooden_dummies: {
          id: 'wooden_dummies',
          slots: [
            { stand: { x: -26.4, y: 0, z: 16.8 }, target: { x: -26.4, y: 1.25, z: 18.0 }, anchorId: 'dummy_0' },
            { stand: { x: -24.0, y: 0, z: 16.8 }, target: { x: -24.0, y: 1.25, z: 18.0 }, anchorId: 'dummy_1' },
            { stand: { x: -21.6, y: 0, z: 16.8 }, target: { x: -21.6, y: 1.25, z: 18.0 }, anchorId: 'dummy_2' }
          ]
        },
        archery_targets: {
          id: 'archery_targets',
          slots: [
            { stand: { x: -19.8, y: 0, z: 20.0 }, target: { x: -19.8, y: 1.35, z: 26.5 }, anchorId: 'archery_target_0' },
            { stand: { x: -17.6, y: 0, z: 20.0 }, target: { x: -17.6, y: 1.35, z: 26.5 }, anchorId: 'archery_target_1' }
          ]
        },
        fire_targets: {
          id: 'fire_targets',
          slots: [
            { stand: { x: -29.6, y: 0, z: 14.2 }, target: { x: -29.6, y: 1.4, z: 15.6 }, anchorId: 'fire_target_0' },
            { stand: { x: -27.8, y: 0, z: 14.2 }, target: { x: -27.8, y: 1.4, z: 15.6 }, anchorId: 'fire_target_1' }
          ]
        },
        sparring_ring: {
          id: 'sparring_ring',
          center: { x: -18.7, y: 0, z: 23.3 },
          radius: 1.9,
          spotA: { x: -19.6, y: 0, z: 23.3 },
          spotB: { x: -17.8, y: 0, z: 23.3 }
        }
      }
    },

    residences: {
      id: 'residences',
      name: 'Residences',
      aliases: ['Dormitory'],
      center: { x: -26.0, z: -4.0 },
      footprint: { type: 'circle', radius: 15.0 },
      rotation: 0,
      door: {
        id: 'door_residences_cluster',
        position: { x: -18.0, y: 0.0, z: -4.0 },
        outward: { x: 1.0, y: 0.0, z: 0.0 }
      },
      doorCorridor: [
        { x: -26.0, z: -4.0 },
        { x: -18.0, z: -4.0 },
        { x: -14.0, z: -4.0 }
      ],
      interactionRadius: 12.0,
      sign: {
        text: 'RESIDENCES',
        offset: { x: 10.8, z: -2.6 },
        rotY: 1.619
      }
    },

    mess_hall_row: {
      id: 'mess_hall_row',
      name: 'Mess Hall',
      center: { x: 8.0, z: 38.0 },
      footprint: { type: 'box', width: 22.8, depth: 4.4, height: 4.4 },
      rotation: 0,
      door: {
        id: 'door_mess_hall',
        position: { x: 8.0, y: 0.0, z: 35.8 },
        outward: { x: 0.0, y: 0.0, z: -1.0 }
      },
      doorCorridor: [
        { x: 8.0, z: 38.0 },
        { x: 8.0, z: 35.8 },
        { x: 8.0, z: 33.0 }
      ],
      interactionRadius: 9.0,
      sign: {
        text: 'MESS HALL',
        offset: { x: -1.0, z: -5.8 },
        rotY: 2.015
      }
    },

    dungeon_board: {
      id: 'dungeon_board',
      name: 'Dungeon Board',
      center: { x: 6.0, z: -2.0 },
      footprint: { type: 'box', width: 2.3, depth: 0.8, height: 3.0 },
      rotation: 0,
      door: null,
      doorCorridor: null,
      interactionRadius: 2.8,
      sign: {
        text: 'DUNGEON BOARD',
        offset: { x: 2.6, z: 0.6 },
        rotY: 2.456
      }
    }
  },

  // 10 cottages in the Residences cluster
  cottages: [
    // Outer Row (Row 1)
    {
      id: 'cottage_1',
      row: 1,
      center: { x: -33.0, z: -14.0 },
      rotation: 0,
      size: { width: 4.2, depth: 3.6, height: 5.0 },
      door: { id: 'door_cottage_1', position: { x: -33.8, y: 0, z: -12.19 }, outward: { x: 0, y: 0, z: 1 } },
      doorCorridor: [{ x: -33.0, z: -14.0 }, { x: -33.8, z: -12.19 }, { x: -33.8, z: -10.8 }]
    },
    {
      id: 'cottage_2',
      row: 1,
      center: { x: -31.0, z: -8.0 },
      rotation: 0,
      size: { width: 4.2, depth: 3.6, height: 5.0 },
      door: { id: 'door_cottage_2', position: { x: -31.8, y: 0, z: -6.19 }, outward: { x: 0, y: 0, z: 1 } },
      doorCorridor: [{ x: -31.0, z: -8.0 }, { x: -31.8, z: -6.19 }, { x: -31.8, z: -4.8 }]
    },
    {
      id: 'cottage_3',
      row: 1,
      center: { x: -29.0, z: -2.0 },
      rotation: 0,
      size: { width: 4.2, depth: 3.6, height: 5.0 },
      door: { id: 'door_cottage_3', position: { x: -29.8, y: 0, z: -0.19 }, outward: { x: 0, y: 0, z: 1 } },
      doorCorridor: [{ x: -29.0, z: -2.0 }, { x: -29.8, z: -0.19 }, { x: -29.8, z: 1.2 }]
    },
    {
      id: 'cottage_4',
      row: 1,
      center: { x: -27.0, z: 4.0 },
      rotation: 0,
      size: { width: 4.2, depth: 3.6, height: 5.0 },
      door: { id: 'door_cottage_4', position: { x: -27.8, y: 0, z: 5.81 }, outward: { x: 0, y: 0, z: 1 } },
      doorCorridor: [{ x: -27.0, z: 4.0 }, { x: -27.8, z: 5.81 }, { x: -27.8, z: 7.2 }]
    },
    {
      id: 'cottage_5',
      row: 1,
      center: { x: -25.0, z: 10.0 },
      rotation: 0,
      size: { width: 4.2, depth: 3.6, height: 5.0 },
      door: { id: 'door_cottage_5', position: { x: -25.8, y: 0, z: 11.81 }, outward: { x: 0, y: 0, z: 1 } },
      doorCorridor: [{ x: -25.0, z: 10.0 }, { x: -25.8, z: 11.81 }, { x: -25.8, z: 13.2 }]
    },
    // Inner Row (Row 2)
    {
      id: 'cottage_6',
      row: 2,
      center: { x: -23.0, z: -16.0 },
      rotation: 0,
      size: { width: 4.2, depth: 3.6, height: 5.0 },
      door: { id: 'door_cottage_6', position: { x: -23.8, y: 0, z: -14.19 }, outward: { x: 0, y: 0, z: 1 } },
      doorCorridor: [{ x: -23.0, z: -16.0 }, { x: -23.8, z: -14.19 }, { x: -23.8, z: -12.8 }]
    },
    {
      id: 'cottage_7',
      row: 2,
      center: { x: -21.0, z: -10.0 },
      rotation: 0,
      size: { width: 4.2, depth: 3.6, height: 5.0 },
      door: { id: 'door_cottage_7', position: { x: -21.8, y: 0, z: -8.19 }, outward: { x: 0, y: 0, z: 1 } },
      doorCorridor: [{ x: -21.0, z: -10.0 }, { x: -21.8, z: -8.19 }, { x: -21.8, z: -6.8 }]
    },
    {
      id: 'cottage_8',
      row: 2,
      center: { x: -19.0, z: -4.0 },
      rotation: 0,
      size: { width: 4.2, depth: 3.6, height: 5.0 },
      door: { id: 'door_cottage_8', position: { x: -19.8, y: 0, z: -2.19 }, outward: { x: 0, y: 0, z: 1 } },
      doorCorridor: [{ x: -19.0, z: -4.0 }, { x: -19.8, z: -2.19 }, { x: -19.8, z: -0.8 }]
    },
    {
      id: 'cottage_9',
      row: 2,
      center: { x: -17.0, z: 2.0 },
      rotation: 0,
      size: { width: 4.2, depth: 3.6, height: 5.0 },
      door: { id: 'door_cottage_9', position: { x: -17.8, y: 0, z: 3.81 }, outward: { x: 0, y: 0, z: 1 } },
      doorCorridor: [{ x: -17.0, z: 2.0 }, { x: -17.8, z: 3.81 }, { x: -17.8, z: 5.2 }]
    },
    {
      id: 'cottage_10',
      row: 2,
      center: { x: -15.0, z: 8.0 },
      rotation: 0,
      size: { width: 4.2, depth: 3.6, height: 5.0 },
      door: { id: 'door_cottage_10', position: { x: -15.8, y: 0, z: 9.81 }, outward: { x: 0, y: 0, z: 1 } },
      doorCorridor: [{ x: -15.0, z: 8.0 }, { x: -15.8, z: 9.81 }, { x: -15.8, z: 11.2 }]
    }
  ],

  // Paved roads connecting zones
  roads: [
    { id: 'road_square_landing', from: { x: 14.0, z: -8.0 }, to: { x: 20.0, z: 26.0 }, width: 4.8 },
    { id: 'road_square_summoning', from: { x: 14.0, z: -8.0 }, to: { x: 26.0, z: 4.0 }, width: 4.5 },
    { id: 'road_square_rift', from: { x: 14.0, z: -8.0 }, to: { x: 29.5, z: -29.5 }, width: 5.0 },
    { id: 'road_square_synthesis', from: { x: 14.0, z: -8.0 }, to: { x: 0.0, z: -32.0 }, width: 4.5 },
    { id: 'road_square_armory', from: { x: 14.0, z: -8.0 }, to: { x: -6.0, z: -20.0 }, width: 4.2 },
    { id: 'road_square_residences', from: { x: 14.0, z: -8.0 }, to: { x: -26.0, z: -4.0 }, width: 5.0 },
    { id: 'road_square_training', from: { x: 14.0, z: -8.0 }, to: { x: -24.0, z: 20.0 }, width: 4.5 },
    { id: 'road_residences_inner', from: { x: -32.0, z: -14.0 }, to: { x: -20.0, z: 10.0 }, width: 4.0 },
    { id: 'road_landing_mess', from: { x: 20.0, z: 26.0 }, to: { x: 8.0, z: 38.0 }, width: 4.0 }
  ],

  // Lamp posts
  lampPosts: [
    { id: 'lamp_1', x: 14.0, z: -8.0, lightIntensity: 7.0, distance: 14 },
    { id: 'lamp_2', x: 20.0, z: 22.0, lightIntensity: 7.0, distance: 14 },
    { id: 'lamp_3', x: -16.0, z: -4.0, lightIntensity: 7.0, distance: 14 },
    { id: 'lamp_4', x: -18.0, z: 18.0, lightIntensity: 7.0, distance: 14 }
  ],

  // Garden and perimeter trees
  trees: [
    // Cottage gardens (2 trees per cottage)
    ...[
      { x: -33, z: -14 }, { x: -31, z: -8 }, { x: -29, z: -2 }, { x: -27, z: 4 }, { x: -25, z: 10 },
      { x: -23, z: -16 }, { x: -21, z: -10 }, { x: -19, z: -4 }, { x: -17, z: 2 }, { x: -15, z: 8 }
    ].flatMap((cp, i) => [
      { id: `tree_cot_${i + 1}_a`, x: cp.x + 1.5, z: cp.z + 3.0, radius: 0.75 },
      { id: `tree_cot_${i + 1}_b`, x: cp.x - 1.6, z: cp.z + 3.1, radius: 0.75 }
    ]),
    // Open town trees
    { id: 'tree_plaza_1', x: 8.0, z: -14.0, radius: 1.2 },
    { id: 'tree_plaza_2', x: 22.0, z: -16.0, radius: 1.2 },
    { id: 'tree_path_1', x: 10.0, z: 12.0, radius: 1.1 },
    { id: 'tree_path_2', x: -8.0, z: 6.0, radius: 1.1 }
  ],

  // Minimap color palette matching HubHud.js
  minimap: {
    islandBg: 'rgba(15, 42, 51, 0.85)',
    wallBorder: '#7d8f94',
    roadColor: 'rgba(184, 196, 200, 0.25)',
    zones: {
      residences: { fill: 'rgba(140, 30, 35, 0.55)', border: '#aa2a30' },
      townSquare: { fill: 'rgba(225, 155, 30, 0.55)', border: '#e5a525' },
      synthesisChamber: { fill: 'rgba(38, 155, 75, 0.55)', border: '#35b558' },
      trainingGrounds: { fill: 'rgba(125, 50, 165, 0.55)', border: '#8c42b5' },
      landingArea: { fill: 'rgba(195, 40, 45, 0.55)', border: '#d5353c' },
      summoningRoom: { fill: 'rgba(35, 115, 215, 0.55)', border: '#3085e5' }
    },
    markers: {
      spaceTimeRift: '#33b4ff',
      armory: '#ff8822'
    }
  }
};

// Resolves the world placement of a zone signpost from its layout data.
// Every sign stands on the terrain (getGroundY), never floats, and the label
// plane is placed on the front face of the board so the text is centred on it.
// rotY is the facing angle: the board's front normal points along
// (sin rotY, cos rotY), so rotY = 0 means the board faces +Z.
export function getSignLayout(layout, zoneId) {
  const zone = layout && layout.zones ? layout.zones[zoneId] : null;
  const sign = zone && zone.sign;
  if (!sign) return null;

  const style = (layout && layout.signStyle) || {};
  const board = { ...(style.board || {}), ...(sign.board || {}) };
  const post = { ...(style.post || {}), ...(sign.post || {}) };
  const label = { ...(style.label || {}), ...(sign.label || {}) };

  const x = zone.center.x + ((sign.offset && sign.offset.x) || 0);
  const z = zone.center.z + ((sign.offset && sign.offset.z) || 0);
  const groundY = getGroundY(x, z);
  const boardY = groundY + post.height + board.height * 0.5;
  const rotY = sign.rotY || 0;
  const front = board.depth * 0.5 + (label.offset !== undefined ? label.offset : 0.03);

  return {
    id: zoneId,
    text: sign.text || zone.name || '',
    x,
    z,
    groundY,
    boardY,
    rotY,
    board,
    post,
    label,
    labelX: x + Math.sin(rotY) * front,
    labelZ: z + Math.cos(rotY) * front
  };
}

// Floor decal layers. Two flat decals that overlap in plan must never share
// a plane, or they z-fight: the depth test flips between them as the camera
// moves and the edges crawl in hatched stripes. Every floor decal (paving
// inlays, moss joints, glowing lines, stone rings) therefore sits on its own
// layer, a step above the floor it is inlaid in.
//
// `top` is the height of the decal's visible TOP face above that floor; a
// decal thick enough to reach it is embedded in the floor, so the inlay
// relief does not change. `lift` is used instead for a decal too thin to
// reach `top` without floating: it is raised off the floor by `lift` and
// stays flush with the surface.
//
// The depth bias (polygonOffset) grows with the layer so that a decal always
// wins the depth test against the floor and against the layer below it, and
// `renderOrder` fixes the draw order: ground first, then the layers from the
// bottom up.
//
// Keep the whole stack under 0.08: the hero walks on the floor, and a taller
// stack makes him look like he hovers above the ground.
export const FLOOR_DECAL_LAYERS = {
  // Dark paving inlays (the Town Square spokes and flagstone patches).
  patch: {
    top: 0.02,
    lift: 0.004,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    renderOrder: 2
  },
  // Mossy joints between the paving stones.
  moss: {
    top: 0.035,
    lift: 0.004,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    renderOrder: 3
  },
  // Glowing lines inlaid almost flush in the floor (a thin bright sliver).
  inlay: {
    top: 0.012,
    lift: 0.004,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
    renderOrder: 4
  },
  // Stone rings and glowing lines that stand slightly proud of the floor.
  line: {
    top: 0.05,
    lift: 0.006,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
    renderOrder: 4
  },
  // The topmost line layer, for the elements that cross the other lines.
  lineTop: {
    top: 0.08,
    lift: 0.006,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    renderOrder: 5
  }
};

