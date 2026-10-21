import * as THREE from 'three';

const GRID_MIN = -52;
const GRID_MAX = 52;
const CELL_SIZE = 1.0;
const GRID_SIZE = Math.round((GRID_MAX - GRID_MIN) / CELL_SIZE) + 1; // 105

// Main road segments for wander zone checking
const ROAD_SEGMENTS = [
  { x1: 14, z1: -8, x2: 20, z2: 26, w: 5.5 },  // Town Square -> Landing Area
  { x1: 14, z1: -8, x2: 26, z2: 4, w: 5.0 },   // Town Square -> Summoning Room
  { x1: 14, z1: -8, x2: 30.6, z2: -30.6, w: 5.5 }, // Town Square -> Space-Time Rift
  { x1: 14, z1: -8, x2: 0, z2: -32, w: 5.0 },  // Town Square -> Synthesis Chamber
  { x1: 14, z1: -8, x2: -6, z2: -20, w: 5.0 }, // Town Square -> Armory
  { x1: 14, z1: -8, x2: -26, z2: -4, w: 5.5 }, // Town Square -> Residences
  { x1: 14, z1: -8, x2: -24, z2: 20, w: 5.0 }, // Town Square -> Training Grounds
  { x1: 20, z1: 26, x2: 8, z2: 38, w: 4.5 },   // Landing Area -> Mess Hall
  { x1: -28, z1: -12, x2: -18, z2: 6, w: 4.5 } // Residences inner road
];

function distToSegment(px, pz, x1, z1, x2, z2) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.hypot(px - x1, pz - z1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / lenSq));
  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;
  return Math.hypot(px - projX, pz - projZ);
}

export class NavGrid {
  constructor(getGroundY = null) {
    this.getGroundY = getGroundY || (() => 0);
    this.grid = new Uint8Array(GRID_SIZE * GRID_SIZE); // 0 = walkable, 1 = blocked
    this.debugMesh = null;
    this.buildGrid();
  }

  toGridCoord(worldVal) {
    return Math.round((worldVal - GRID_MIN) / CELL_SIZE);
  }

  toWorldCoord(gridVal) {
    return GRID_MIN + gridVal * CELL_SIZE;
  }

  getIndex(gx, gz) {
    if (gx < 0 || gx >= GRID_SIZE || gz < 0 || gz >= GRID_SIZE) return -1;
    return gz * GRID_SIZE + gx;
  }

  setBlocked(gx, gz, blocked = true) {
    const idx = this.getIndex(gx, gz);
    if (idx !== -1) {
      this.grid[idx] = blocked ? 1 : 0;
    }
  }

  isCellBlocked(gx, gz) {
    const idx = this.getIndex(gx, gz);
    if (idx === -1) return true;
    return this.grid[idx] === 1;
  }

  isWalkable(worldX, worldZ) {
    const gx = this.toGridCoord(worldX);
    const gz = this.toGridCoord(worldZ);
    return !this.isCellBlocked(gx, gz);
  }

  buildGrid() {
    const apothem = 46.0;
    const wallInnerApothem = 44.5; // Apothem minus wall thickness and margin
    const sectorAngle = Math.PI / 6; // 30 degrees per sector for 12-gon

    // 1. Base perimeter: 12-sided dodecagon with apothem 46
    for (let gz = 0; gz < GRID_SIZE; gz++) {
      const wz = this.toWorldCoord(gz);
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        const wx = this.toWorldCoord(gx);
        const dist = Math.hypot(wx, wz);

        if (dist === 0) continue;

        // Calculate distance to nearest 12-gon side: r * cos(angle in sector)
        let angle = Math.atan2(wz, wx);
        if (angle < 0) angle += Math.PI * 2;
        const normAngle = ((angle + Math.PI / 12) % sectorAngle) - Math.PI / 12;
        const distToSide = dist * Math.cos(normAngle);

        // Outside or on inner face of wall
        if (distToSide >= wallInnerApothem) {
          // Space-Time Rift corridor exemption at (31, -31)
          const isRiftCorridor = Math.hypot(wx - 31, wz - (-31)) <= 3.5;
          if (!isRiftCorridor) {
            this.setBlocked(gx, gz, true);
            continue;
          }
        }

        // Terrain slope: block steep slopes (> 35 degrees)
        const dX = this.getGroundY(wx + 0.5, wz) - this.getGroundY(wx - 0.5, wz);
        const dZ = this.getGroundY(wx, wz + 0.5) - this.getGroundY(wx, wz - 0.5);
        const slopeDeg = Math.atan(Math.hypot(dX, dZ)) * (180 / Math.PI);
        if (slopeDeg > 35) {
          this.setBlocked(gx, gz, true);
          continue;
        }
      }
    }

    // 2. Building blockages & door corridors
    // Summoning Room: center (30, 4), radius 10, pedestal at center
    this.blockCircle(30, 4, 9.8);
    // Clear Summoning Room pedestal center and stair corridor descending SW to Landing Area (20, 26)
    this.clearCircle(30, 4, 4.0); // Inside room courtyard
    this.clearBox(18, 25, 10, 26); // Stairway down to Landing Area

    // Synthesis Chamber: center (0, -32), radius 8
    this.blockCircle(0, -32, 8.2);
    // Door corridor facing south (0, -24)
    this.clearBox(-2.0, 2.0, -26.0, -22.5);

    // Armory: (-6, -20), size 7x5 plus forge shed
    this.blockBox(-10.0, -0.5, -23.0, -17.0);
    // Door corridor facing south
    this.clearBox(-7.5, -4.5, -17.5, -14.0);

    // Residences: centered (-26, -4). Block cottages & private gardens
    // Cottage diagonal row 1 (outer)
    this.blockBox(-35.5, -23.0, -16.0, 12.0);
    // Cottage diagonal row 2 (inner)
    this.blockBox(-24.5, -13.0, -18.0, 10.0);
    // Clear paved road through cottages and cluster entrance corridor at (-18, -4)
    this.clearBox(-23.5, -18.0, -8.0, 2.0);
    this.clearBox(-29.0, -19.0, -12.0, 6.0);

    // Training Grounds: (-24, 20). Spiked barricade, low stone fence, and dummy rows
    this.blockBox(-33.0, -15.5, 27.5, 29.0); // South fence
    this.blockBox(-33.0, -31.5, 12.0, 28.0); // West fence
    this.blockBox(-31.5, -16.5, 11.5, 13.0); // North barricade
    // Dummy back row at z = 23.5
    this.blockBox(-30.5, -17.5, 22.5, 24.5);
    // Dummy front row at z = 18.0
    this.blockBox(-30.5, -17.5, 17.5, 18.8);
    // Clear training stands and practice area in front of dummies
    this.clearBox(-30.0, -17.0, 13.5, 17.2);
    this.clearBox(-30.0, -17.0, 19.2, 22.2);
    // Clear the sparring ring: the empty eastern strip of the training yard
    // (around -18.7, 23.3) so heroes can walk into the ring and spar.
    this.clearBox(-21.0, -16.0, 21.0, 25.5);

    // Mess Hall row: (8, 38), 6 connected houses
    this.blockBox(-4.0, 20.0, 35.5, 41.0);

    // Dungeon Board: (6, -2)
    this.blockBox(4.5, 7.5, -3.2, -0.8);
  }

  rebuildFromTown(colliders = [], doorCorridors = [], zones = {}) {
    this.colliders = colliders;
    this.grid.fill(0);
    const wallInnerApothem = 44.5;
    const sectorAngle = Math.PI / 6;

    // 1. Perimeter dodecagon & slope
    for (let gz = 0; gz < GRID_SIZE; gz++) {
      const wz = this.toWorldCoord(gz);
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        const wx = this.toWorldCoord(gx);
        const dist = Math.hypot(wx, wz);
        if (dist === 0) continue;

        let angle = Math.atan2(wz, wx);
        if (angle < 0) angle += Math.PI * 2;
        const normAngle = ((angle + Math.PI / 12) % sectorAngle) - Math.PI / 12;
        const distToSide = dist * Math.cos(normAngle);

        if (distToSide >= wallInnerApothem) {
          const isRiftCorridor = Math.hypot(wx - 31, wz - (-31)) <= 3.5;
          if (!isRiftCorridor) {
            this.setBlocked(gx, gz, true);
            continue;
          }
        }

        const dX = this.getGroundY(wx + 0.5, wz) - this.getGroundY(wx - 0.5, wz);
        const dZ = this.getGroundY(wx, wz + 0.5) - this.getGroundY(wx, wz - 0.5);
        const slopeDeg = Math.atan(Math.hypot(dX, dZ)) * (180 / Math.PI);
        if (slopeDeg > 35) {
          this.setBlocked(gx, gz, true);
        }
      }
    }

    // 2. Block from colliders
    for (const c of colliders) {
      if (c.type === 'circle') {
        this.blockCircle(c.x, c.z, c.r);
      } else if (c.type === 'box') {
        if (c.rotY && Math.abs(c.rotY) > 0.01) {
          const cosR = Math.cos(-c.rotY);
          const sinR = Math.sin(-c.rotY);
          const hw = c.w * 0.5;
          const hd = c.d * 0.5;
          const rBound = Math.hypot(hw, hd);
          const minGx = Math.max(0, this.toGridCoord(c.x - rBound));
          const maxGx = Math.min(GRID_SIZE - 1, this.toGridCoord(c.x + rBound));
          const minGz = Math.max(0, this.toGridCoord(c.z - rBound));
          const maxGz = Math.min(GRID_SIZE - 1, this.toGridCoord(c.z + rBound));
          for (let gz = minGz; gz <= maxGz; gz++) {
            const wz = this.toWorldCoord(gz);
            for (let gx = minGx; gx <= maxGx; gx++) {
              const wx = this.toWorldCoord(gx);
              const dx = wx - c.x;
              const dz = wz - c.z;
              const rx = dx * cosR - dz * sinR;
              const rz = dx * sinR + dz * cosR;
              if (Math.abs(rx) <= hw && Math.abs(rz) <= hd) {
                this.setBlocked(gx, gz, true);
              }
            }
          }
        } else {
          this.blockBox(c.x - c.w * 0.5, c.x + c.w * 0.5, c.z - c.d * 0.5, c.z + c.d * 0.5);
        }
      }
    }

    // 3. Clear door corridors
    for (const corridor of doorCorridors) {
      if (!corridor || !Array.isArray(corridor)) continue;
      for (let i = 0; i < corridor.length; i++) {
        const pt = corridor[i];
        this.clearCircle(pt.x, pt.z, 1.4);
        if (i < corridor.length - 1) {
          const next = corridor[i + 1];
          this.clearCorridorSegment(pt, next, 2.6);
        }
      }
    }
  }

  clearCorridorSegment(p1, p2, width = 2.6) {
    const halfW = width * 0.5;
    const minX = Math.min(p1.x, p2.x) - halfW;
    const maxX = Math.max(p1.x, p2.x) + halfW;
    const minZ = Math.min(p1.z, p2.z) - halfW;
    const maxZ = Math.max(p1.z, p2.z) + halfW;
    const minGx = Math.max(0, this.toGridCoord(minX));
    const maxGx = Math.min(GRID_SIZE - 1, this.toGridCoord(maxX));
    const minGz = Math.max(0, this.toGridCoord(minZ));
    const maxGz = Math.min(GRID_SIZE - 1, this.toGridCoord(maxZ));

    for (let gz = minGz; gz <= maxGz; gz++) {
      const wz = this.toWorldCoord(gz);
      for (let gx = minGx; gx <= maxGx; gx++) {
        const wx = this.toWorldCoord(gx);
        if (distToSegment(wx, wz, p1.x, p1.z, p2.x, p2.z) <= halfW) {
          this.setBlocked(gx, gz, false);
        }
      }
    }
  }

  blockBox(minX, maxX, minZ, maxZ) {
    const minGx = Math.max(0, this.toGridCoord(minX));
    const maxGx = Math.min(GRID_SIZE - 1, this.toGridCoord(maxX));
    const minGz = Math.max(0, this.toGridCoord(minZ));
    const maxGz = Math.min(GRID_SIZE - 1, this.toGridCoord(maxZ));

    for (let gz = minGz; gz <= maxGz; gz++) {
      for (let gx = minGx; gx <= maxGx; gx++) {
        this.setBlocked(gx, gz, true);
      }
    }
  }

  clearBox(minX, maxX, minZ, maxZ) {
    const minGx = Math.max(0, this.toGridCoord(minX));
    const maxGx = Math.min(GRID_SIZE - 1, this.toGridCoord(maxX));
    const minGz = Math.max(0, this.toGridCoord(minZ));
    const maxGz = Math.min(GRID_SIZE - 1, this.toGridCoord(maxZ));

    for (let gz = minGz; gz <= maxGz; gz++) {
      for (let gx = minGx; gx <= maxGx; gx++) {
        this.setBlocked(gx, gz, false);
      }
    }
  }

  blockCircle(cx, cz, radius) {
    const minGx = Math.max(0, this.toGridCoord(cx - radius));
    const maxGx = Math.min(GRID_SIZE - 1, this.toGridCoord(cx + radius));
    const minGz = Math.max(0, this.toGridCoord(cz - radius));
    const maxGz = Math.min(GRID_SIZE - 1, this.toGridCoord(cz + radius));

    for (let gz = minGz; gz <= maxGz; gz++) {
      const wz = this.toWorldCoord(gz);
      for (let gx = minGx; gx <= maxGx; gx++) {
        const wx = this.toWorldCoord(gx);
        if (Math.hypot(wx - cx, wz - cz) <= radius) {
          this.setBlocked(gx, gz, true);
        }
      }
    }
  }

  clearCircle(cx, cz, radius) {
    const minGx = Math.max(0, this.toGridCoord(cx - radius));
    const maxGx = Math.min(GRID_SIZE - 1, this.toGridCoord(cx + radius));
    const minGz = Math.max(0, this.toGridCoord(cz - radius));
    const maxGz = Math.min(GRID_SIZE - 1, this.toGridCoord(cz + radius));

    for (let gz = minGz; gz <= maxGz; gz++) {
      const wz = this.toWorldCoord(gz);
      for (let gx = minGx; gx <= maxGx; gx++) {
        const wx = this.toWorldCoord(gx);
        if (Math.hypot(wx - cx, wz - cz) <= radius) {
          this.setBlocked(gx, gz, false);
        }
      }
    }
  }

  // Wandering zone restriction: only Town Square, roads, Landing Area, and Training Grounds
  isAllowedWanderZone(worldX, worldZ) {
    // 1. Town Square (14, -8)
    if (Math.hypot(worldX - 14, worldZ - (-8)) <= 11.5) return true;

    // 2. Landing Area (20, 26)
    if (Math.hypot(worldX - 20, worldZ - 26) <= 12.0) return true;

    // 3. Training Grounds practice area
    if (worldX >= -29.5 && worldX <= -17.5 && worldZ >= 13.5 && worldZ <= 25.5) return true;

    // 4. Summoning Room courtyard
    if (Math.hypot(worldX - 30, worldZ - 4) <= 4.0) return true;

    // 5. Main paved roads
    for (const rd of ROAD_SEGMENTS) {
      if (distToSegment(worldX, worldZ, rd.x1, rd.z1, rd.x2, rd.z2) <= rd.w * 0.5) {
        return true;
      }
    }

    return false;
  }

  findNearestWalkableCell(worldX, worldZ, maxRadius = 15) {
    const startGx = this.toGridCoord(worldX);
    const startGz = this.toGridCoord(worldZ);

    if (!this.isCellBlocked(startGx, startGz)) {
      return new THREE.Vector3(
        this.toWorldCoord(startGx),
        this.getGroundY(this.toWorldCoord(startGx), this.toWorldCoord(startGz)),
        this.toWorldCoord(startGz)
      );
    }

    for (let r = 1; r <= maxRadius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          const gx = startGx + dx;
          const gz = startGz + dz;
          if (!this.isCellBlocked(gx, gz)) {
            const wx = this.toWorldCoord(gx);
            const wz = this.toWorldCoord(gz);
            return new THREE.Vector3(wx, this.getGroundY(wx, wz), wz);
          }
        }
      }
    }
    // Fallback to safe Landing Area or Town Square
    return new THREE.Vector3(20, this.getGroundY(20, 26), 26);
  }

  findRandomReachableCell(fromX, fromZ, minRadius = 4, maxRadius = 18) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = minRadius + Math.random() * (maxRadius - minRadius);
      const wx = fromX + Math.cos(angle) * dist;
      const wz = fromZ + Math.sin(angle) * dist;

      if (this.isWalkable(wx, wz) && this.isAllowedWanderZone(wx, wz)) {
        return new THREE.Vector3(wx, this.getGroundY(wx, wz), wz);
      }
    }

    // Fallback wander destination within Town Square
    const sqAngle = Math.random() * Math.PI * 2;
    const sqDist = Math.random() * 7.5;
    const sqX = 14 + Math.cos(sqAngle) * sqDist;
    const sqZ = -8 + Math.sin(sqAngle) * sqDist;
    return new THREE.Vector3(sqX, this.getGroundY(sqX, sqZ), sqZ);
  }

  // A* Pathfinding with 8-directional movement
  findPath(startX, startZ, endX, endZ) {
    const sGx = this.toGridCoord(startX);
    const sGz = this.toGridCoord(startZ);
    let eGx = this.toGridCoord(endX);
    let eGz = this.toGridCoord(endZ);

    if (this.isCellBlocked(eGx, eGz)) {
      const nearest = this.findNearestWalkableCell(endX, endZ);
      eGx = this.toGridCoord(nearest.x);
      eGz = this.toGridCoord(nearest.z);
    }

    if (sGx === eGx && sGz === eGz) {
      return [new THREE.Vector3(endX, this.getGroundY(endX, endZ), endZ)];
    }

    const openSet = new Set();
    const closedSet = new Set();
    const gScore = new Map();
    const fScore = new Map();
    const cameFrom = new Map();

    const startKey = `${sGx},${sGz}`;
    openSet.add(startKey);
    gScore.set(startKey, 0);
    fScore.set(startKey, Math.hypot(eGx - sGx, eGz - sGz));

    const DIRS = [
      { dx: 1, dz: 0, cost: 1.0 },
      { dx: -1, dz: 0, cost: 1.0 },
      { dx: 0, dz: 1, cost: 1.0 },
      { dx: 0, dz: -1, cost: 1.0 },
      { dx: 1, dz: 1, cost: 1.414 },
      { dx: -1, dz: 1, cost: 1.414 },
      { dx: 1, dz: -1, cost: 1.414 },
      { dx: -1, dz: -1, cost: 1.414 },
    ];

    let iterations = 0;
    const MAX_ITERATIONS = 1500;

    while (openSet.size > 0 && iterations++ < MAX_ITERATIONS) {
      let currentKey = null;
      let lowestF = Infinity;
      for (const key of openSet) {
        const score = fScore.get(key) ?? Infinity;
        if (score < lowestF) {
          lowestF = score;
          currentKey = key;
        }
      }

      if (!currentKey) break;

      const [curXStr, curZStr] = currentKey.split(',');
      const curGx = parseInt(curXStr, 10);
      const curGz = parseInt(curZStr, 10);

      if (curGx === eGx && curGz === eGz) {
        return this.reconstructPath(cameFrom, currentKey, endX, endZ);
      }

      openSet.delete(currentKey);
      closedSet.add(currentKey);

      const currentG = gScore.get(currentKey) ?? Infinity;

      for (const dir of DIRS) {
        const neighborGx = curGx + dir.dx;
        const neighborGz = curGz + dir.dz;
        const neighborKey = `${neighborGx},${neighborGz}`;

        if (closedSet.has(neighborKey)) continue;
        if (this.isCellBlocked(neighborGx, neighborGz)) continue;

        // Prevent corner cutting on diagonals
        if (dir.dx !== 0 && dir.dz !== 0) {
          if (this.isCellBlocked(curGx + dir.dx, curGz) || this.isCellBlocked(curGx, curGz + dir.dz)) {
            continue;
          }
        }

        const tentativeG = currentG + dir.cost;
        const neighborG = gScore.get(neighborKey) ?? Infinity;

        if (tentativeG < neighborG) {
          cameFrom.set(neighborKey, currentKey);
          gScore.set(neighborKey, tentativeG);
          const h = Math.hypot(eGx - neighborGx, eGz - neighborGz);
          fScore.set(neighborKey, tentativeG + h);
          openSet.add(neighborKey);
        }
      }
    }

    return [new THREE.Vector3(endX, this.getGroundY(endX, endZ), endZ)];
  }

  reconstructPath(cameFrom, currentKey, finalWorldX, finalWorldZ) {
    const rawWaypoints = [];
    let curr = currentKey;

    while (curr) {
      const [gxStr, gzStr] = curr.split(',');
      const gx = parseInt(gxStr, 10);
      const gz = parseInt(gzStr, 10);
      const wx = this.toWorldCoord(gx);
      const wz = this.toWorldCoord(gz);
      rawWaypoints.unshift(new THREE.Vector3(wx, this.getGroundY(wx, wz), wz));
      curr = cameFrom.get(curr);
    }

    if (rawWaypoints.length > 0) {
      rawWaypoints[rawWaypoints.length - 1].set(finalWorldX, this.getGroundY(finalWorldX, finalWorldZ), finalWorldZ);
    }

    return this.smoothPath(rawWaypoints);
  }

  smoothPath(waypoints) {
    if (waypoints.length <= 2) return waypoints;

    const smoothed = [waypoints[0]];
    let currentIdx = 0;

    while (currentIdx < waypoints.length - 1) {
      let furthestIdx = currentIdx + 1;
      for (let testIdx = waypoints.length - 1; testIdx > currentIdx + 1; testIdx--) {
        if (this.hasLineOfSight(waypoints[currentIdx], waypoints[testIdx])) {
          furthestIdx = testIdx;
          break;
        }
      }
      smoothed.push(waypoints[furthestIdx]);
      currentIdx = furthestIdx;
    }

    return smoothed;
  }

  hasLineOfSight(p1, p2) {
    const dist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
    const steps = Math.ceil(dist * 2.0);
    if (steps <= 1) return true;

    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const sx = p1.x + (p2.x - p1.x) * t;
      const sz = p1.z + (p2.z - p1.z) * t;
      if (!this.isWalkable(sx, sz)) {
        return false;
      }
    }
    return true;
  }

  getDoorCorridor(type) {
    switch (type) {
      case 'summon':
        return [
          new THREE.Vector3(30, this.getGroundY(30, 4), 4),
          new THREE.Vector3(24, this.getGroundY(24, 11), 11),
          new THREE.Vector3(20, this.getGroundY(20, 26), 26),
        ];
      case 'dormitory':
      case 'residences':
        return [
          new THREE.Vector3(-15, this.getGroundY(-15, -4), -4),
          new THREE.Vector3(-18, this.getGroundY(-18, -4), -4),
          new THREE.Vector3(-21, this.getGroundY(-21, -4), -4),
        ];
      case 'synthesis':
        return [
          new THREE.Vector3(0, this.getGroundY(0, -22), -22),
          new THREE.Vector3(0, this.getGroundY(0, -25), -25),
          new THREE.Vector3(0, this.getGroundY(0, -28), -28),
        ];
      case 'blacksmith':
      case 'armory':
        return [
          new THREE.Vector3(-6, this.getGroundY(-6, -14), -14),
          new THREE.Vector3(-6, this.getGroundY(-6, -17), -17),
          new THREE.Vector3(-6, this.getGroundY(-6, -19.5), -19.5),
        ];
      case 'training':
        return [
          new THREE.Vector3(-20, this.getGroundY(-20, 16), 16),
          new THREE.Vector3(-23, this.getGroundY(-23, 16.8), 16.8),
          new THREE.Vector3(-24, this.getGroundY(-24, 17.5), 17.5),
        ];
      case 'rift':
      case 'tower_gate':
        return [
          new THREE.Vector3(24, this.getGroundY(24, -24), -24),
          new THREE.Vector3(28, this.getGroundY(28, -28), -28),
          new THREE.Vector3(30.6, this.getGroundY(30.6, -30.6), -30.6),
        ];
      default:
        return [];
    }
  }

  // Debug rendering (F6)
  toggleDebugMesh(scene, colliders = null) {
    if (this.debugMesh) {
      scene.remove(this.debugMesh);
      this.debugMesh.geometry.dispose();
      this.debugMesh.material.dispose();
      this.debugMesh = null;
      if (this.debugWireframeGroup) {
        scene.remove(this.debugWireframeGroup);
        this.debugWireframeGroup.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
        this.debugWireframeGroup = null;
      }
      return false;
    }

    const instances = [];
    for (let gz = 0; gz < GRID_SIZE; gz++) {
      const wz = this.toWorldCoord(gz);
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        if (this.isCellBlocked(gx, gz)) {
          const wx = this.toWorldCoord(gx);
          const wy = this.getGroundY(wx, wz) + 0.08;
          instances.push(new THREE.Vector3(wx, wy, wz));
        }
      }
    }

    const boxGeo = new THREE.PlaneGeometry(0.85, 0.85);
    boxGeo.rotateX(-Math.PI / 2);
    const boxMat = new THREE.MeshBasicMaterial({
      color: 0xff2233,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    const instMesh = new THREE.InstancedMesh(boxGeo, boxMat, instances.length);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < instances.length; i++) {
      dummy.position.copy(instances[i]);
      dummy.updateMatrix();
      instMesh.setMatrixAt(i, dummy.matrix);
    }
    instMesh.instanceMatrix.needsUpdate = true;

    this.debugMesh = instMesh;
    scene.add(this.debugMesh);

    // Red wireframe town colliders
    const activeColliders = colliders || this.colliders || [];
    if (activeColliders.length > 0) {
      this.debugWireframeGroup = new THREE.Group();
      for (const c of activeColliders) {
        if (c.type === 'circle') {
          const ringGeo = new THREE.RingGeometry(Math.max(0.01, c.r - 0.06), c.r + 0.06, 24);
          ringGeo.rotateX(-Math.PI / 2);
          const ringMat = new THREE.MeshBasicMaterial({ color: 0xff2233, side: THREE.DoubleSide });
          const m = new THREE.Mesh(ringGeo, ringMat);
          m.position.set(c.x, this.getGroundY(c.x, c.z) + 0.12, c.z);
          this.debugWireframeGroup.add(m);
        } else if (c.type === 'box') {
          const bGeo = new THREE.BoxGeometry(c.w, 1.8, c.d);
          const bMat = new THREE.MeshBasicMaterial({ color: 0xff2233, wireframe: true });
          const m = new THREE.Mesh(bGeo, bMat);
          m.position.set(c.x, this.getGroundY(c.x, c.z) + 0.9, c.z);
          if (c.rotY) m.rotation.y = c.rotY;
          this.debugWireframeGroup.add(m);
        }
      }
      scene.add(this.debugWireframeGroup);
    }

    return true;
  }
}
