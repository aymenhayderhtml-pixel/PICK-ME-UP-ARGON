// src/art/town/layout.js
// Single source of truth for Niflheimr town coordinates, dimensions, doors, waypoints, roads, and colors.

import { BUILDING_PADS, getGroundY } from './ground.js';

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
      signText: 'LANDING AREA',
      signOffset: { x: 0, y: 6.0, z: 0 }
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
      doorCorridor: [
        { x: 30.0, z: 4.0 },
        { x: 23.5, z: 11.5 },
        { x: 19.5, z: 20.0 }
      ],
      interactionRadius: 8.5,
      signText: 'SUMMONING ROOM',
      signOffset: { x: 0, y: 13.0, z: 0 }
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
      signText: 'TOWN SQUARE',
      signOffset: { x: 0, y: 4.0, z: 0 }
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
      signText: 'SPACE-TIME RIFT',
      signOffset: { x: 0, y: 12.0, z: 0 }
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
      signText: 'SYNTHESIS CHAMBER',
      signOffset: { x: 0, y: 15.0, z: 0 }
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
      signText: 'ARMORY',
      signOffset: { x: 0, y: 5.6, z: 0 }
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
      signText: 'TRAINING GROUNDS',
      signOffset: { x: 0, y: 4.0, z: 0 },
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
      signText: 'RESIDENCES',
      signOffset: { x: 8.0, y: 4.2, z: 0 }
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
      signText: 'MESS HALL',
      signOffset: { x: 0, y: 5.2, z: 0 }
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
      signText: 'DUNGEON BOARD',
      signOffset: { x: 0, y: 3.4, z: 0 }
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
