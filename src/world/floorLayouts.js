// src/world/floorLayouts.js
// Pure floor layout generator: the single source of truth for the battlefields.
// No THREE imports, no meshes: every position is a plain { x, z } object.
// The gameplay (FarmFloor.js / ForestFloor.js) and the floor art modules read
// their data from generateFloorLayout so the layout and the visuals can never
// diverge.
//
// Fidelity rule: the numbers produced here are the exact numbers the original
// generators (src/world/FarmFloor.js and src/world/ForestFloor.js) computed,
// including the seeded RNG call order for the layout-relevant values. The
// equality is enforced by test-floor-layouts.mjs.

// Seeded PRNG (Mulberry32), same one used by the floors and by the layout test.
export function createRng(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t >>> 0) / 4294967296;
  };
}

function hypot(x, z) {
  return Math.sqrt(x * x + z * z);
}

// Distance from point (px, pz) to line segment (p1, p2)
function distanceToSegment(px, pz, p1, p2) {
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  const l2 = dx * dx + dz * dz;
  if (l2 === 0) return hypot(px - p1.x, pz - p1.z);
  let t = ((px - p1.x) * dx + (pz - p1.z) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = p1.x + t * dx;
  const projZ = p1.z + t * dz;
  return hypot(px - projX, pz - projZ);
}

function deriveBounds(clearings, polyline, margin) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const cl of clearings) {
    minX = Math.min(minX, cl.center.x - cl.radius);
    maxX = Math.max(maxX, cl.center.x + cl.radius);
    minZ = Math.min(minZ, cl.center.z - cl.radius);
    maxZ = Math.max(maxZ, cl.center.z + cl.radius);
  }
  for (const p of polyline) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  return {
    minX: Math.round(minX - margin),
    maxX: Math.round(maxX + margin),
    minZ: Math.round(minZ - margin),
    maxZ: Math.round(maxZ + margin),
  };
}

// ---------------------------------------------------------------------------
// Floor 1: the Greek countryside farm (FarmFloor.js)
// The layout is completely fixed: the seed only randomizes decoration.
// ---------------------------------------------------------------------------

function generateFarmLayout(floorNumber, seed) {
  const startPosition = { x: 0, z: 4 };
  const exitPosition = { x: 0, z: -125 };

  const clearings = [
    {
      id: 'clearing_0',
      center: { x: 0, z: 0 },
      radius: 13,
      spawnPoints: [],
      triggerRadius: 15,
    },
    {
      id: 'clearing_1',
      center: { x: 0, z: -35 },
      radius: 15,
      // First tutorial goblin group (EnemyManager.spawn, floor 1 table)
      spawnPoints: [
        { x: 0, z: -32 },
        { x: -8, z: -30 },
        { x: 7, z: -34 },
      ],
      triggerRadius: 17,
    },
    {
      id: 'clearing_2',
      center: { x: 0, z: -75 },
      radius: 16,
      // Second tutorial goblin group (EnemyManager.spawn, floor 1 table)
      spawnPoints: [
        { x: -2, z: -70 },
        { x: -11, z: -74 },
        { x: 10, z: -72 },
      ],
      triggerRadius: 18,
    },
    {
      id: 'clearing_3',
      center: { x: 0, z: -112 },
      radius: 15,
      // Third tutorial goblin group (EnemyManager.spawn, floor 1 table)
      spawnPoints: [
        { x: -6, z: -112 },
        { x: 0, z: -110 },
        { x: 6, z: -112 },
        { x: 3, z: -115 },
      ],
      triggerRadius: 17,
    },
  ];

  const chokePoints = [
    { position: { x: 0, z: -20 }, direction: { x: 0, z: -1 }, width: 3.2 },
    { position: { x: 0, z: -55 }, direction: { x: 0, z: -1 }, width: 3.2 },
    { position: { x: 0, z: -94 }, direction: { x: 0, z: -1 }, width: 3.2 },
  ];

  // Road waypoints of the dirt road drawn along the road mesh segments.
  const pathPolyline = [
    { x: 0, z: 6 },
    { x: 0, z: -20 },
    { x: 2, z: -55 },
    { x: -2, z: -94 },
    { x: 0, z: -125 },
  ];
  const pathWidth = 4.7;

  const ambushSpots = [
    { x: -8, z: -18 },
    { x: 8, z: -18 },
    { x: -10, z: -28 },
    { x: 10, z: -28 },
    { x: -12, z: -50 },
    { x: 12, z: -50 },
    { x: -10, z: -90 },
    { x: 10, z: -90 },
  ];

  const fenceZLocations = [-20, -55, -94];

  // Walk-blocking circles (choke flankers, olive trunks, temple columns, the
  // farmhouse, the well and the hay bales), in build order.
  const obstacles = [];
  for (const fz of fenceZLocations) {
    obstacles.push({ x: -2.0, z: fz, radius: 0.8 }, { x: 2.0, z: fz, radius: 0.8 });
  }
  const treeLocations = [
    { x: -14, z: -4 }, { x: 14, z: -4 }, { x: -22, z: 2 }, { x: 22, z: 2 },
    { x: -18, z: -32 }, { x: 18, z: -32 }, { x: -25, z: -48 }, { x: 25, z: -48 },
    { x: 8, z: -70 }, { x: 22, z: -72 }, { x: 10, z: -84 }, { x: 24, z: -84 },
    { x: 16, z: -64 }, { x: 26, z: -68 },
    { x: -16, z: -102 }, { x: -25, z: -115 }, { x: -18, z: -122 },
    { x: 15, z: -105 }, { x: 20, z: -118 }, { x: 14, z: -124 },
  ];
  for (const t of treeLocations) obstacles.push({ x: t.x, z: t.z, radius: 0.6 });

  const colPositions = [
    { x: 10, z: -81 }, { x: 14, z: -81 }, { x: 18, z: -81 }, { x: 22, z: -81 },
    { x: 10, z: -69 }, { x: 14, z: -69 }, { x: 18, z: -69 }, { x: 22, z: -69 },
  ];
  for (const c of colPositions) obstacles.push({ x: c.x, z: c.z, radius: 0.8 });

  obstacles.push({ x: -14, z: -112, radius: 4.0 }); // farmhouse
  obstacles.push({ x: -8, z: -105, radius: 1.2 }); // well
  const hayLocations = [
    { x: -5, z: -16 }, { x: -6.5, z: -17 }, { x: 6, z: -22 },
    { x: -12, z: -62 }, { x: -14, z: -63 }, { x: -13, z: -61 },
    { x: -6, z: -108 }, { x: -5, z: -110 }, { x: -7, z: -112 },
    { x: 6, z: -116 }, { x: 7.5, z: -117 },
  ];
  for (const h of hayLocations) obstacles.push({ x: h.x, z: h.z, radius: 0.8 });

  function walkable(x, z) {
    if (x < -46 || x > 46 || z > 7 || z < -130) return false;
    for (const fz of fenceZLocations) {
      if (Math.abs(z - fz) < 0.6 && Math.abs(x) > 1.6) return false;
    }
    for (const o of obstacles) {
      if (hypot(x - o.x, z - o.z) < o.radius) return false;
    }
    return true;
  }

  return {
    floorNumber,
    seed,
    bounds: { minX: -46, maxX: 46, minZ: -130, maxZ: 7 },
    // The current floors are completely flat (a single ground plane at y = 0),
    // so the terrain height function returns 0 everywhere. If relief is ever
    // added it must stay at amplitude <= 0.8 and flat on the path and in the
    // clearings.
    getGroundY() {
      return 0;
    },
    pathPolyline,
    pathWidth,
    clearings,
    chokePoints,
    ambushSpots,
    startPosition,
    exitPosition,
    exitGate: { position: { x: 0, z: -125 }, rotationY: 0, width: 3.6 },
    entranceBarrier: { position: { x: 0, z: 6.5 }, rotationY: 0, width: 14 },
    bossArena: null,
    campSpots: [
      { x: 16, z: -75, radius: 9.0, type: 'temple' }, // ruined Greek temple
      { x: -14, z: -112, radius: 5.5, type: 'farm' }, // ruined farmhouse
      { x: -8, z: -105, radius: 3.0, type: 'well' }, // stone well
    ],
    obstacles,
    walkable,
  };
}

// ---------------------------------------------------------------------------
// Floors 2 to 5: the tower forest (ForestFloor.js)
// ---------------------------------------------------------------------------

function generateForestLayout(floorNumber, seed) {
  const rng = createRng(seed);
  const isFloor5 = floorNumber === 5;

  const clearings = [];
  const chokePoints = [];
  const chokeObstacles = [];
  const ambushSpots = [];
  const pathSegments = [];
  let startPosition;
  let exitPosition;
  let bossArena = null;

  if (!isFloor5) {
    // Floors 2 to 4: 4 clearings, path length ~130 units.
    const c0Radius = 13 + rng() * 2;
    const c1Radius = 13 + rng() * 2;
    const c2Radius = 14 + rng() * 2;
    const c3Radius = 15 + rng() * 2;

    const c0 = {
      id: 'clearing_0',
      center: { x: 0, z: 0 },
      radius: c0Radius,
      spawnPoints: [],
      triggerRadius: c0Radius + 2,
    };
    const c1 = {
      id: 'clearing_1',
      center: { x: (rng() - 0.5) * 14, z: -38 - rng() * 6 },
      radius: c1Radius,
      spawnPoints: [],
      triggerRadius: c1Radius + 2,
    };
    const c2 = {
      id: 'clearing_2',
      center: { x: (rng() - 0.5) * 16, z: -78 - rng() * 6 },
      radius: c2Radius,
      spawnPoints: [],
      triggerRadius: c2Radius + 2,
    };
    const c3 = {
      id: 'clearing_3',
      center: { x: (rng() - 0.5) * 12, z: -122 - rng() * 6 },
      radius: c3Radius,
      spawnPoints: [],
      triggerRadius: c3Radius + 2,
    };
    clearings.push(c0, c1, c2, c3);

    startPosition = { x: 0, z: 4 };
    exitPosition = { x: c3.center.x, z: c3.center.z - c3.radius + 1.8 };

    const polyline = [
      { x: c0.center.x, z: c0.center.z },
      {
        x: (c0.center.x + c1.center.x) / 2 + (rng() - 0.5) * 6,
        z: (c0.center.z + c1.center.z) / 2,
      },
      { x: c1.center.x, z: c1.center.z },
      {
        x: (c1.center.x + c2.center.x) / 2 + (rng() - 0.5) * 6,
        z: (c1.center.z + c2.center.z) / 2,
      },
      { x: c2.center.x, z: c2.center.z },
      {
        x: (c2.center.x + c3.center.x) / 2 + (rng() - 0.5) * 6,
        z: (c2.center.z + c3.center.z) / 2,
      },
      { x: c3.center.x, z: c3.center.z },
      { x: exitPosition.x, z: exitPosition.z },
    ];

    for (let i = 0; i < polyline.length - 1; i++) {
      pathSegments.push({ p1: polyline[i], p2: polyline[i + 1], chokePoints: [] });
    }

    // 2 choke points per inter-clearing corridor: (C0 -> C1), (C1 -> C2), (C2 -> C3)
    const corridorPairs = [
      { from: c0.center, to: c1.center, segIdx: 0 },
      { from: c1.center, to: c2.center, segIdx: 2 },
      { from: c2.center, to: c3.center, segIdx: 4 },
    ];
    for (const cpPair of corridorPairs) {
      for (const t of [0.35, 0.68]) {
        const pos = {
          x: cpPair.from.x + (cpPair.to.x - cpPair.from.x) * t,
          z: cpPair.from.z + (cpPair.to.z - cpPair.from.z) * t,
        };
        const dx = cpPair.to.x - cpPair.from.x;
        const dz = cpPair.to.z - cpPair.from.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        const dir = { x: dx / len, z: dz / len };
        const chokeObj = { position: pos, direction: dir, width: 3.0 };
        chokePoints.push(chokeObj);
        pathSegments[cpPair.segIdx].chokePoints.push(chokeObj);

        const perpX = -dir.z;
        const perpZ = dir.x;
        chokeObstacles.push(
          { x: pos.x + perpX * 2.7, z: pos.z + perpZ * 2.7, radius: 1.2 },
          { x: pos.x - perpX * 2.7, z: pos.z - perpZ * 2.7, radius: 1.2 }
        );
      }
    }
  } else {
    // Floor 5: short path, then one circular boss arena (radius 24).
    const c0 = {
      id: 'clearing_0',
      center: { x: 0, z: 0 },
      radius: 10,
      spawnPoints: [],
      triggerRadius: 12,
    };
    const arena = {
      id: 'clearing_1',
      center: { x: 0, z: -48 },
      radius: 24,
      spawnPoints: [],
      triggerRadius: 26,
    };
    clearings.push(c0, arena);

    startPosition = { x: 0, z: 3 };
    exitPosition = { x: 0, z: -70 };

    const polyline = [
      { x: 0, z: 0 },
      { x: 0, z: -14 },
      { x: 0, z: -28 },
      { x: 0, z: -48 },
      { x: 0, z: -70 },
    ];
    for (let i = 0; i < polyline.length - 1; i++) {
      pathSegments.push({ p1: polyline[i], p2: polyline[i + 1], chokePoints: [] });
    }

    // 1 choke point leading into the boss arena.
    const cpPos = { x: 0, z: -20 };
    const cpDir = { x: 0, z: -1 };
    const chokeObj = { position: cpPos, direction: cpDir, width: 3.0 };
    chokePoints.push(chokeObj);
    pathSegments[1].chokePoints.push(chokeObj);
    chokeObstacles.push(
      { x: cpPos.x + 2.7, z: cpPos.z, radius: 1.2 },
      { x: cpPos.x - 2.7, z: cpPos.z, radius: 1.2 }
    );

    // 6 broken stone pillars in the arena (destructible blockers, radius 1.2).
    // The visual height is fixed here (the old props rolled 3.6 + Math.random()
    // * 1.2 per pillar; only the radius matters for gameplay).
    const pillars = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      pillars.push({
        id: 'pillar_' + i,
        x: arena.center.x + Math.cos(angle) * 14,
        z: arena.center.z + Math.sin(angle) * 14,
        radius: 1.2,
        height: 4.0,
      });
    }

    // Ruined wall segments around the arena edge; the entrance (angle PI/2,
    // toward the start) and the exit (angle 3*PI/2) stay open.
    const wallSegments = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      if (Math.abs(angle - Math.PI / 2) < 0.35 || Math.abs(angle - (3 * Math.PI) / 2) < 0.35) continue;
      wallSegments.push({
        x: arena.center.x + Math.cos(angle) * 23.5,
        z: arena.center.z + Math.sin(angle) * 23.5,
        length: 3.5,
        rotationY: angle + Math.PI / 2,
      });
    }

    bossArena = {
      center: { x: arena.center.x, z: arena.center.z },
      radius: arena.radius,
      pillars,
      wallSegments,
      entrance: { position: { x: 0, z: -23.5 }, rotationY: 0, width: 10 },
    };
  }

  // Spawn points in the clearings (never in clearing 0: that is the arrival).
  for (let c = 1; c < clearings.length; c++) {
    const cl = clearings[c];
    const isBossRoom = c === clearings.length - 1;
    const count = isBossRoom && isFloor5 ? 1 : 4;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rng();
      const dist = cl.radius * 0.45 + rng() * (cl.radius * 0.25);
      cl.spawnPoints.push({
        x: cl.center.x + Math.cos(angle) * dist,
        z: cl.center.z + Math.sin(angle) * dist,
      });
    }
  }

  // Ambush spots: 2 per clearing plus 1 beside every choke point.
  for (let c = 0; c < clearings.length; c++) {
    const cl = clearings[c];
    for (let i = 0; i < 2; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = cl.radius * 0.85;
      ambushSpots.push({
        x: cl.center.x + Math.cos(angle) * dist,
        z: cl.center.z + Math.sin(angle) * dist,
      });
    }
  }
  for (const cp of chokePoints) {
    const perpX = -cp.direction.z;
    const perpZ = cp.direction.x;
    ambushSpots.push({
      x: cp.position.x + perpX * 3.8,
      z: cp.position.z + perpZ * 3.8,
    });
  }

  // Goblin camps and ruins.
  const campSpots = [];
  if (!isFloor5) {
    for (let c = 1; c < clearings.length; c++) {
      const cl = clearings[c];
      campSpots.push({ x: cl.center.x + 3.5, z: cl.center.z - 2.5, radius: 4.0, type: 'camp' });
      if (floorNumber >= 3 && c >= 2) {
        campSpots.push({ x: cl.center.x - 4.5, z: cl.center.z + 3.0, radius: 3.5, type: 'ruin' });
      }
    }
  } else {
    campSpots.push({ x: 0, z: -65, radius: 5.0, type: 'camp' });
    campSpots.push({ x: -12, z: -56, radius: 3.5, type: 'ruin' });
    campSpots.push({ x: 12, z: -56, radius: 3.5, type: 'ruin' });
  }

  const pathPolyline = [];
  if (pathSegments.length > 0) {
    pathPolyline.push({ x: pathSegments[0].p1.x, z: pathSegments[0].p1.z });
    for (const seg of pathSegments) pathPolyline.push({ x: seg.p2.x, z: seg.p2.z });
  }

  function walkable(x, z) {
    if (bossArena) {
      for (const p of bossArena.pillars) {
        if (hypot(x - p.x, z - p.z) < p.radius + 0.35) return false;
      }
    }
    for (const o of chokeObstacles) {
      if (hypot(x - o.x, z - o.z) < o.radius) return false;
    }
    for (const cl of clearings) {
      if (hypot(x - cl.center.x, z - cl.center.z) <= cl.radius - 0.5) return true;
    }
    for (const seg of pathSegments) {
      const dist = distanceToSegment(x, z, seg.p1, seg.p2);
      let maxDist = 4.5; // default corridor: 9 wide
      for (const cp of seg.chokePoints) {
        if (hypot(x - cp.position.x, z - cp.position.z) < 3.2) {
          maxDist = 1.5; // choke: 3 wide
          break;
        }
      }
      if (dist <= maxDist) return true;
    }
    return false;
  }

  return {
    floorNumber,
    seed,
    bounds: deriveBounds(clearings, pathPolyline, 2),
    // The current floors are completely flat (a single ground plane at y = 0),
    // so the terrain height function returns 0 everywhere. If relief is ever
    // added it must stay at amplitude <= 0.8 and flat on the path and in the
    // clearings.
    getGroundY() {
      return 0;
    },
    pathPolyline,
    pathWidth: 9,
    clearings,
    chokePoints,
    ambushSpots,
    startPosition,
    exitPosition,
    exitGate: { position: { ...exitPosition }, rotationY: 0, width: 3.6 },
    entranceBarrier: { position: { x: 0, z: 6.5 }, rotationY: 0, width: 10 },
    bossArena,
    campSpots,
    obstacles: chokeObstacles,
    walkable,
  };
}

// ---------------------------------------------------------------------------
// Floor 2: the prairie (open-field biome)
// Built with the same generator family as floor 1: a wide trampled path,
// 3 open clearings as meadows, ambush spots in tall grass and behind boulders,
// no dense forest walls; enclosure of gentle ridges, low hills, hedgerows
// and rock lines.
// ---------------------------------------------------------------------------

function generatePrairieLayout(floorNumber, seed) {
  const startPosition = { x: 0, z: 4 };
  const exitPosition = { x: 0, z: -125 };

  const clearings = [
    {
      id: 'clearing_0',
      center: { x: 0, z: 0 },
      radius: 14,
      spawnPoints: [],
      triggerRadius: 16,
    },
    {
      id: 'clearing_1',
      center: { x: 0, z: -35 },
      radius: 16,
      spawnPoints: [
        { x: -3, z: -32 },
        { x: 3, z: -32 },
        { x: -7, z: -36 },
        { x: 0, z: -37 },
        { x: 7, z: -36 },
      ],
      triggerRadius: 18,
    },
    {
      id: 'clearing_2',
      center: { x: 2, z: -75 },
      radius: 17,
      spawnPoints: [
        { x: -4, z: -72 },
        { x: 0, z: -70 },
        { x: 5, z: -72 },
        { x: -7, z: -76 },
        { x: 6, z: -77 },
        { x: 0, z: -80 },
        { x: 2, z: -83 },
      ],
      triggerRadius: 19,
    },
    {
      id: 'clearing_3',
      center: { x: -1, z: -112 },
      radius: 16,
      spawnPoints: [
        { x: -5, z: -110 },
        { x: 0, z: -108 },
        { x: 5, z: -110 },
        { x: -7, z: -114 },
        { x: 7, z: -114 },
        { x: -2, z: -116 },
        { x: 3, z: -116 },
        { x: 0, z: -119 },
      ],
      triggerRadius: 18,
    },
  ];

  const chokePoints = [
    { position: { x: 0, z: -20 }, direction: { x: 0, z: -1 }, width: 4.2 },
    { position: { x: 1, z: -55 }, direction: { x: 0, z: -1 }, width: 4.2 },
    { position: { x: -1, z: -94 }, direction: { x: 0, z: -1 }, width: 4.2 },
  ];

  const pathPolyline = [
    { x: 0, z: 6 },
    { x: 0, z: -20 },
    { x: 2, z: -55 },
    { x: -1, z: -94 },
    { x: 0, z: -125 },
  ];
  const pathWidth = 5.8;

  const ambushSpots = [
    { x: -9, z: -18 },
    { x: 9, z: -18 },
    { x: -12, z: -28 },
    { x: 11, z: -28 },
    { x: -13, z: -50 },
    { x: 13, z: -50 },
    { x: -12, z: -70 },
    { x: 14, z: -72 },
    { x: -11, z: -90 },
    { x: 11, z: -90 },
    { x: -9, z: -106 },
    { x: 10, z: -106 },
  ];

  const obstacles = [
    { x: -2.8, z: -20, radius: 1.1 },
    { x: 2.8, z: -20, radius: 1.1 },
    { x: -2.0, z: -55, radius: 1.2 },
    { x: 3.8, z: -55, radius: 1.2 },
    { x: -3.6, z: -94, radius: 1.1 },
    { x: 2.2, z: -94, radius: 1.1 },
    { x: -16, z: -6, radius: 1.4 },
    { x: 15, z: -4, radius: 1.3 },
    { x: -19, z: -34, radius: 1.6 },
    { x: 18, z: -36, radius: 1.5 },
    { x: -22, z: -76, radius: 1.8 },
    { x: 18, z: -75, radius: 3.2 },
    { x: -18, z: -114, radius: 1.5 },
    { x: 16, z: -116, radius: 1.6 },
    { x: -8, z: -122, radius: 1.2 },
    { x: 10, z: -124, radius: 1.3 },
  ];

  function walkable(x, z) {
    if (x < -48 || x > 48 || z > 7 || z < -132) return false;
    for (const o of obstacles) {
      if (hypot(x - o.x, z - o.z) < o.radius) return false;
    }
    for (const cl of clearings) {
      if (hypot(x - cl.center.x, z - cl.center.z) <= cl.radius - 0.5) return true;
    }
    for (let i = 0; i < pathPolyline.length - 1; i++) {
      if (distanceToSegment(x, z, pathPolyline[i], pathPolyline[i + 1]) <= pathWidth * 0.5) return true;
    }
    return false;
  }

  return {
    floorNumber,
    seed,
    bounds: { minX: -48, maxX: 48, minZ: -132, maxZ: 7 },
    getGroundY() {
      return 0;
    },
    pathPolyline,
    pathWidth,
    clearings,
    chokePoints,
    ambushSpots,
    startPosition,
    exitPosition,
    exitGate: { position: { x: 0, z: -125 }, rotationY: 0, width: 4.0 },
    entranceBarrier: { position: { x: 0, z: 6.5 }, rotationY: 0, width: 14 },
    bossArena: null,
    campSpots: [
      { x: 18, z: -75, radius: 7.5, type: 'ruin' },
      { x: -14, z: -114, radius: 5.5, type: 'camp' },
    ],
    obstacles,
    walkable,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// generateFloorLayout(floorNumber, seed) -> FloorLayout
// See docs/FLOOR_LAYOUT.md for the full field reference and real dumps.
export function generateFloorLayout(floorNumber = 1, seed = 1337) {
  const floor = Math.max(1, Math.floor(floorNumber));
  const s = (seed >>> 0) || 1337;
  if (floor === 1) return generateFarmLayout(floor, s);
  if (floor === 2) return generatePrairieLayout(floor, s);
  return generateForestLayout(floor, s);
}
