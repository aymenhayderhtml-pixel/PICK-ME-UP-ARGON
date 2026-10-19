import * as THREE from 'three';
import { generateDungeon } from './DungeonGenerator.js';
import { showSystemMessage } from '../ui/Hud.js';

export function buildCaveFloor(difficulty = 1, seed = 54321) {
  const group = new THREE.Group();
  const dungeonData = generateDungeon(seed);
  const { grid, rooms, width, height, spawn } = dungeonData;
  const cellSize = 2;

  const colliders = [];
  const oreNodes = [];
  const pointLights = [];

  // 1. Gather floor and wall coordinates
  let floorCount = 0;
  const wallCoords = [];

  function touchesFloor(x, y) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          if (grid[ny][nx] === 0) return true;
        }
      }
    }
    return false;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === 0) {
        floorCount++;
      } else if (grid[y][x] === 1 && touchesFloor(x, y)) {
        wallCoords.push({ x, y });
      }
    }
  }

  // 2. Build Floor InstancedMesh (dark brown-gray cave rock)
  const dummy = new THREE.Object3D();
  const tempColor = new THREE.Color();

  const floorGeo = new THREE.PlaneGeometry(cellSize, cellSize);
  floorGeo.rotateX(-Math.PI / 2);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x332a24,
    roughness: 0.95,
    metalness: 0.05,
  });
  const floorMesh = new THREE.InstancedMesh(floorGeo, floorMat, floorCount);

  let floorIdx = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === 0) {
        dummy.position.set(x * cellSize, 0, y * cellSize);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        floorMesh.setMatrixAt(floorIdx, dummy.matrix);

        const brightness = 0.85 + Math.random() * 0.3;
        tempColor.setHex(0x332a24).multiplyScalar(brightness);
        floorMesh.setColorAt(floorIdx, tempColor);
        floorIdx++;
      }
    }
  }
  floorMesh.instanceMatrix.needsUpdate = true;
  if (floorMesh.instanceColor) floorMesh.instanceColor.needsUpdate = true;
  group.add(floorMesh);

  // 3. Build Walls InstancedMesh (brown-gray rock walls)
  const wallGeo = new THREE.BoxGeometry(cellSize, 4.2, cellSize);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x4a423a,
    roughness: 0.9,
    metalness: 0.1,
  });
  const wallMesh = new THREE.InstancedMesh(wallGeo, wallMat, wallCoords.length);

  for (let i = 0; i < wallCoords.length; i++) {
    const { x, y } = wallCoords[i];
    dummy.position.set(x * cellSize, 2.1, y * cellSize);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    wallMesh.setMatrixAt(i, dummy.matrix);

    const brightness = 0.8 + Math.random() * 0.4;
    tempColor.setHex(0x4a423a).multiplyScalar(brightness);
    wallMesh.setColorAt(i, tempColor);
  }
  wallMesh.instanceMatrix.needsUpdate = true;
  if (wallMesh.instanceColor) wallMesh.instanceColor.needsUpdate = true;
  group.add(wallMesh);
  colliders.push(wallMesh);

  // 4. Start & Exit Positions
  const startRoom = rooms[0] || { cx: spawn.x, cy: spawn.y };
  const exitRoom = rooms[rooms.length - 1] || startRoom;
  const startPosition = new THREE.Vector3(startRoom.cx * cellSize, 0, startRoom.cy * cellSize);
  const exitPosition = new THREE.Vector3(exitRoom.cx * cellSize, 0, exitRoom.cy * cellSize);

  // 5. Exit Stone Arch at exitPosition
  const exitArchGroup = new THREE.Group();
  exitArchGroup.position.copy(exitPosition);
  const archMat = new THREE.MeshStandardMaterial({ color: 0x3d3830, roughness: 0.85 });
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 4.0, 1.0), archMat);
  p1.position.set(-2.0, 2.0, 0);
  const p2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 4.0, 1.0), archMat);
  p2.position.set(2.0, 2.0, 0);
  const top = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.8, 1.2), archMat);
  top.position.set(0, 4.0, 0);
  exitArchGroup.add(p1, p2, top);

  // Exit glowing portal
  const exitPortalMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });
  const exitPortal = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.8), exitPortalMat);
  exitPortal.position.set(0, 1.9, 0);
  exitArchGroup.add(exitPortal);
  group.add(exitArchGroup);

  // 6. Crystal clusters & Max 6 PointLights
  // 2 Torchlights (warm orange)
  const torch1 = new THREE.PointLight(0xff7722, 2.2, 16);
  torch1.position.set(startPosition.x, 2.5, startPosition.z);
  group.add(torch1);
  pointLights.push(torch1);

  const midRoom = rooms[Math.floor(rooms.length / 2)] || startRoom;
  const torch2 = new THREE.PointLight(0xff7722, 2.2, 16);
  torch2.position.set(midRoom.cx * cellSize, 2.5, midRoom.cy * cellSize);
  group.add(torch2);
  pointLights.push(torch2);

  // 4 Crystal PointLights with crystal cluster primitives
  const crystalColors = [0x00e5ff, 0xbb55ff, 0x38bdf8, 0xc084fc];
  const crystalRooms = rooms.slice(1, 5);

  for (let c = 0; c < Math.min(4, crystalRooms.length); c++) {
    const cRoom = crystalRooms[c];
    const col = crystalColors[c % crystalColors.length];
    const light = new THREE.PointLight(col, 2.8, 18);
    const cx = cRoom.cx * cellSize;
    const cz = cRoom.cy * cellSize;
    light.position.set(cx, 2.2, cz);
    group.add(light);
    pointLights.push(light);

    // Crystal cluster prop
    const cGroup = new THREE.Group();
    cGroup.position.set(cx + 1.2, 0, cz + 1.2);
    const cMat = new THREE.MeshStandardMaterial({
      color: col,
      emissive: col,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.3,
    });
    for (let s = 0; s < 4; s++) {
      const h = 0.8 + Math.random() * 0.7;
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.15, h, 5), cMat);
      shard.position.set((s - 1.5) * 0.25, h / 2, (Math.random() - 0.5) * 0.3);
      shard.rotation.set((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3);
      cGroup.add(shard);
    }
    group.add(cGroup);
  }

  // 7. 10-14 Ore Nodes in rooms
  const targetNodeCount = Math.floor(Math.random() * 5) + 10; // 10 to 14
  const eligibleRooms = rooms.slice(1); // Exclude spawn room

  for (let n = 0; n < targetNodeCount; n++) {
    const room = eligibleRooms[n % eligibleRooms.length];
    const nx = (room.x + 1.2 + Math.random() * (room.w - 2.4)) * cellSize;
    const nz = (room.y + 1.2 + Math.random() * (room.h - 2.4)) * cellSize;

    const nodeGroup = new THREE.Group();
    nodeGroup.position.set(nx, 0, nz);

    const oreMat = new THREE.MeshStandardMaterial({
      color: n % 2 === 0 ? 0xb87333 : 0x777788, // Copper / Iron tint
      roughness: 0.7,
      metalness: 0.4,
    });

    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), oreMat);
    boulder.position.y = 0.45;
    boulder.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    nodeGroup.add(boulder);

    // Metallic specks on node
    const speckMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    for (let sp = 0; sp < 3; sp++) {
      const speck = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), speckMat);
      speck.position.set((Math.random() - 0.5) * 0.6, 0.45 + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.6);
      nodeGroup.add(speck);
    }

    group.add(nodeGroup);

    oreNodes.push({
      mesh: nodeGroup,
      boulderMesh: boulder,
      mat: oreMat,
      x: nx,
      z: nz,
      radius: 0.8,
      mined: false,
      difficulty,
      mine() {
        if (this.mined) return;
        this.mined = true;
        this.mat.color.setHex(0x1a1a1a);
        this.mat.roughness = 1.0;
        this.mat.metalness = 0.0;
        nodeGroup.scale.set(0.9, 0.7, 0.9);
      },
    });
  }

  // 8. Walkability
  function isWalkable(x, z) {
    const gx = Math.round(x / cellSize);
    const gy = Math.round(z / cellSize);
    if (gx < 0 || gx >= width || gy < 0 || gy >= height) {
      return false;
    }
    if (grid[gy][gx] === 1) {
      return false;
    }
    // Ore node collision
    for (const node of oreNodes) {
      if (!node.mined && Math.hypot(x - node.x, z - node.z) < 0.65) {
        return false;
      }
    }
    return true;
  }

  function findNearestWalkable(x, z) {
    if (isWalkable(x, z)) return { x, z };
    for (let r = 0.5; r <= 6.0; r += 0.5) {
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        const tx = x + Math.cos(ang) * r;
        const tz = z + Math.sin(ang) * r;
        if (isWalkable(tx, tz)) {
          return { x: tx, z: tz };
        }
      }
    }
    return { x: startPosition.x, z: startPosition.z };
  }

  const partySlotPositions = [
    new THREE.Vector3(startPosition.x - 1.5, 0, startPosition.z + 2.0),
    new THREE.Vector3(startPosition.x + 1.5, 0, startPosition.z + 2.0),
  ];

  return {
    group,
    isWalkable,
    findNearestWalkable,
    colliders,
    rooms,
    startPosition,
    exitPosition,
    partySlotPositions,
    oreNodes,
    cellSize,
    update(delta, time, playerPos) {
      // Light flicker
      if (pointLights[0]) {
        pointLights[0].intensity = 2.0 + Math.sin(time * 8) * 0.3;
      }
    },
    dispose() {
      floorGeo.dispose();
      floorMat.dispose();
      wallGeo.dispose();
      wallMat.dispose();
      archMat.dispose();
      exitPortalMat.dispose();
    },
  };
}
