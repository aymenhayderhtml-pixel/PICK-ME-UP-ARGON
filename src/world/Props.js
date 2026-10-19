import * as THREE from 'three';

export class PropsManager {
  constructor() {
    this.propsGroup = new THREE.Group();
    this.torchesWithLight = [];
    this.geometries = [];
    this.materials = [];
  }

  spawn(scene, dungeon) {
    this.clear(scene);

    if (!dungeon || !dungeon.rooms || dungeon.rooms.length === 0) return;

    // Shared geometries and materials
    const barrelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.85, 10);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x7c4f24,
      roughness: 0.85,
    });
    this.geometries.push(barrelGeo);
    this.materials.push(barrelMat);

    const crateGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x9b6b38,
      roughness: 0.8,
    });
    this.geometries.push(crateGeo);
    this.materials.push(crateMat);

    const torchPostGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.4, 8);
    const torchPostMat = new THREE.MeshStandardMaterial({
      color: 0x4a2e18,
      roughness: 0.9,
    });
    this.geometries.push(torchPostGeo);
    this.materials.push(torchPostMat);

    const flameGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff7722,
      emissiveIntensity: 1.8,
    });
    this.geometries.push(flameGeo);
    this.materials.push(flameMat);

    // Sort rooms by distance from spawn
    const spawnX = dungeon.spawn.x;
    const spawnY = dungeon.spawn.y;
    const sortedRooms = [...dungeon.rooms].sort((a, b) => {
      const distA = Math.hypot(a.cx - spawnX, a.cy - spawnY);
      const distB = Math.hypot(b.cx - spawnX, b.cy - spawnY);
      return distA - distB;
    });

    // Closest 8 rooms will receive 1 torch point light
    const lightRoomSet = new Set(sortedRooms.slice(0, 8));

    let torchId = 0;

    for (const room of dungeon.rooms) {
      // 1. Barrels (2 to 4 per room)
      const barrelCount = Math.floor(Math.random() * 3) + 2;
      for (let b = 0; b < barrelCount; b++) {
        const bx = (room.x + 1 + Math.random() * Math.max(1, room.w - 2)) * dungeon.cellSize;
        const bz = (room.y + 1 + Math.random() * Math.max(1, room.h - 2)) * dungeon.cellSize;

        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.position.set(bx, 0.425, bz);
        this.propsGroup.add(barrel);
        dungeon.addBlocker(bx, bz, 0.5);
      }

      // 2. Crates (1 to 2 per room)
      const crateCount = Math.floor(Math.random() * 2) + 1;
      for (let c = 0; c < crateCount; c++) {
        const cx = (room.x + 1 + Math.random() * Math.max(1, room.w - 2)) * dungeon.cellSize;
        const cz = (room.y + 1 + Math.random() * Math.max(1, room.h - 2)) * dungeon.cellSize;

        const crate = new THREE.Mesh(crateGeo, crateMat);
        crate.position.set(cx, 0.4, cz);
        crate.rotation.y = Math.random() * Math.PI;
        this.propsGroup.add(crate);
        dungeon.addBlocker(cx, cz, 0.55);
      }

      // 3. Torch per room corner (4 corners)
      const corners = [
        { x: room.x + 0.6, y: room.y + 0.6 },
        { x: room.x + room.w - 0.6, y: room.y + 0.6 },
        { x: room.x + 0.6, y: room.y + room.h - 0.6 },
        { x: room.x + room.w - 0.6, y: room.y + room.h - 0.6 },
      ];

      const roomGetsLight = lightRoomSet.has(room);

      corners.forEach((corner, idx) => {
        const tx = corner.x * dungeon.cellSize;
        const tz = corner.y * dungeon.cellSize;

        const torchPost = new THREE.Mesh(torchPostGeo, torchPostMat);
        torchPost.position.set(tx, 0.7, tz);
        this.propsGroup.add(torchPost);

        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(tx, 1.45, tz);
        this.propsGroup.add(flame);

        // Limit to 8 torch lights total (pick 1 light for selected closest rooms)
        if (roomGetsLight && idx === 0 && this.torchesWithLight.length < 8) {
          const torchLight = new THREE.PointLight(0xff9944, 8, 12, 1.5);
          torchLight.position.set(tx, 1.6, tz);
          this.propsGroup.add(torchLight);

          this.torchesWithLight.push({
            light: torchLight,
            id: torchId++,
          });
        }
      });
    }

    scene.add(this.propsGroup);
  }

  update(time) {
    // Torch lights flicker
    for (const item of this.torchesWithLight) {
      item.light.intensity =
        8 + Math.sin(time * 9 + item.id) * 1.2 + (Math.random() - 0.5) * 0.5;
    }
  }

  clear(scene) {
    if (scene) scene.remove(this.propsGroup);
    this.propsGroup.clear();
    for (const geo of this.geometries) geo.dispose();
    for (const mat of this.materials) mat.dispose();
    this.geometries = [];
    this.materials = [];
    this.torchesWithLight = [];
  }
}
