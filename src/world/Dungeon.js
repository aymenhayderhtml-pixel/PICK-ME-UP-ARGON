import * as THREE from 'three';

export class Dungeon {
  constructor(dungeonData) {
    this.grid = dungeonData.grid;
    this.rooms = dungeonData.rooms;
    this.width = dungeonData.width;
    this.height = dungeonData.height;
    this.spawn = dungeonData.spawn;
    this.cellSize = 2; // Each cell is 2 world units

    this.blockers = []; // Registered prop blockers: { x, z, radius }
    this.meshGroup = new THREE.Group();
    this.buildMeshes();
  }

  addBlocker(x, z, radius = 0.5) {
    this.blockers.push({ x, z, radius });
  }

  buildMeshes() {
    const dummy = new THREE.Object3D();
    const tempColor = new THREE.Color();

    // 1. Gather floor cells, wall cells touching floor, and room ceiling cells
    let floorCount = 0;
    const wallCoordinates = [];
    const roomCeilingCoords = [];

    // Fast room cell lookup for ceiling (rooms only, not corridors)
    const isRoomCell = Array.from({ length: this.height }, () =>
      new Array(this.width).fill(false)
    );
    for (const r of this.rooms) {
      for (let ry = r.y; ry < r.y + r.h; ry++) {
        for (let rx = r.x; rx < r.x + r.w; rx++) {
          if (rx >= 0 && rx < this.width && ry >= 0 && ry < this.height) {
            isRoomCell[ry][rx] = true;
          }
        }
      }
    }

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] === 0) {
          floorCount++;
          if (isRoomCell[y][x]) {
            roomCeilingCoords.push({ x, y });
          }
        } else if (this.grid[y][x] === 1 && this.touchesFloor(x, y)) {
          wallCoordinates.push({ x, y });
        }
      }
    }

    // 2. Build Floor InstancedMesh with per-tile color variation
    if (floorCount > 0) {
      this.floorGeometry = new THREE.PlaneGeometry(this.cellSize, this.cellSize);
      this.floorGeometry.rotateX(-Math.PI / 2);
      this.floorMaterial = new THREE.MeshStandardMaterial({
        roughness: 0.9,
      });
      this.floorMesh = new THREE.InstancedMesh(
        this.floorGeometry,
        this.floorMaterial,
        floorCount
      );

      const baseFloor = new THREE.Color(0x666666);
      let floorIdx = 0;
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (this.grid[y][x] === 0) {
            dummy.position.set(x * this.cellSize, 0, y * this.cellSize);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            this.floorMesh.setMatrixAt(floorIdx, dummy.matrix);

            // Brightness variation: 0.85 to 1.15
            const brightness = 0.85 + Math.random() * 0.3;
            tempColor.copy(baseFloor).multiplyScalar(brightness);
            this.floorMesh.setColorAt(floorIdx, tempColor);
            floorIdx++;
          }
        }
      }
      this.floorMesh.instanceMatrix.needsUpdate = true;
      if (this.floorMesh.instanceColor) {
        this.floorMesh.instanceColor.needsUpdate = true;
      }
      this.meshGroup.add(this.floorMesh);
    }

    // 3. Build Walls InstancedMesh with color variation & trim strips
    if (wallCoordinates.length > 0) {
      this.wallGeometry = new THREE.BoxGeometry(this.cellSize, 4, this.cellSize);
      this.wallMaterial = new THREE.MeshStandardMaterial({
        roughness: 0.9,
      });
      this.wallMesh = new THREE.InstancedMesh(
        this.wallGeometry,
        this.wallMaterial,
        wallCoordinates.length
      );

      // Darker trim strip at wall base (2 x 0.3 x 2)
      this.trimGeometry = new THREE.BoxGeometry(this.cellSize, 0.3, this.cellSize);
      this.trimMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a3a40,
        roughness: 0.9,
      });
      this.trimMesh = new THREE.InstancedMesh(
        this.trimGeometry,
        this.trimMaterial,
        wallCoordinates.length
      );

      const baseWall = new THREE.Color(0x8a8a95);
      for (let i = 0; i < wallCoordinates.length; i++) {
        const { x, y } = wallCoordinates[i];
        // Wall instance
        dummy.position.set(x * this.cellSize, 2, y * this.cellSize);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.wallMesh.setMatrixAt(i, dummy.matrix);

        // Wall brightness variation: 0.85 to 1.15
        const brightness = 0.85 + Math.random() * 0.3;
        tempColor.copy(baseWall).multiplyScalar(brightness);
        this.wallMesh.setColorAt(i, tempColor);

        // Trim instance at y = 0.15
        dummy.position.set(x * this.cellSize, 0.15, y * this.cellSize);
        dummy.updateMatrix();
        this.trimMesh.setMatrixAt(i, dummy.matrix);
      }
      this.wallMesh.instanceMatrix.needsUpdate = true;
      if (this.wallMesh.instanceColor) {
        this.wallMesh.instanceColor.needsUpdate = true;
      }
      this.trimMesh.instanceMatrix.needsUpdate = true;

      this.meshGroup.add(this.wallMesh);
      this.meshGroup.add(this.trimMesh);
    }

    // 4. Ceiling plane only in rooms, NOT in corridors (color 0x2a2a30, y = 4)
    if (roomCeilingCoords.length > 0) {
      this.ceilingGeometry = new THREE.PlaneGeometry(this.cellSize, this.cellSize);
      this.ceilingGeometry.rotateX(Math.PI / 2); // Faces downwards into the room
      this.ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a30,
        roughness: 0.95,
      });
      this.ceilingMesh = new THREE.InstancedMesh(
        this.ceilingGeometry,
        this.ceilingMaterial,
        roomCeilingCoords.length
      );

      for (let i = 0; i < roomCeilingCoords.length; i++) {
        const { x, y } = roomCeilingCoords[i];
        dummy.position.set(x * this.cellSize, 4, y * this.cellSize);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.ceilingMesh.setMatrixAt(i, dummy.matrix);
      }
      this.ceilingMesh.instanceMatrix.needsUpdate = true;
      this.meshGroup.add(this.ceilingMesh);
    }
  }

  touchesFloor(x, y) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          if (this.grid[ny][nx] === 0) return true;
        }
      }
    }
    return false;
  }

  isWalkable(worldX, worldZ) {
    const gx = Math.floor((worldX + this.cellSize / 2) / this.cellSize);
    const gz = Math.floor((worldZ + this.cellSize / 2) / this.cellSize);

    if (gx < 0 || gx >= this.width || gz < 0 || gz >= this.height) {
      return false;
    }
    if (this.grid[gz][gx] !== 0) return false;

    // Check prop blockers (barrels, crates)
    for (let i = 0; i < this.blockers.length; i++) {
      const b = this.blockers[i];
      const dx = worldX - b.x;
      const dz = worldZ - b.z;
      if (dx * dx + dz * dz < b.radius * b.radius) {
        return false;
      }
    }

    return true;
  }

  getSpawnPosition() {
    return new THREE.Vector3(
      this.spawn.x * this.cellSize,
      0,
      this.spawn.y * this.cellSize
    );
  }

  dispose() {
    if (this.floorGeometry) this.floorGeometry.dispose();
    if (this.floorMaterial) this.floorMaterial.dispose();
    if (this.wallGeometry) this.wallGeometry.dispose();
    if (this.wallMaterial) this.wallMaterial.dispose();
    if (this.trimGeometry) this.trimGeometry.dispose();
    if (this.trimMaterial) this.trimMaterial.dispose();
    if (this.ceilingGeometry) this.ceilingGeometry.dispose();
    if (this.ceilingMaterial) this.ceilingMaterial.dispose();
    this.blockers = [];
    this.meshGroup.clear();
  }
}
