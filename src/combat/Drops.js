import * as THREE from 'three';
import { DROP_TYPES } from '../data/drops.js';
import { getMaterial } from '../data/materials.js';
import { gameState } from '../core/GameState.js';

export class DropsManager {
  constructor() {
    this.drops = [];
    this.cubeGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  }

  spawnDrop(scene, x, z, typeKey) {
    const dropData = DROP_TYPES[typeKey];
    if (!dropData) return;

    const mat = new THREE.MeshStandardMaterial({
      color: dropData.color,
      emissive: dropData.color,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    });

    const mesh = new THREE.Mesh(this.cubeGeo, mat);
    mesh.position.set(x, 0.4, z);
    scene.add(mesh);

    this.drops.push({
      mesh,
      mat,
      typeData: dropData,
      spawnY: 0.4,
      timeOffset: Math.random() * 10,
    });
  }

  spawnMaterialDrop(scene, x, z, matId, count = 1) {
    const matData = getMaterial(matId);
    if (!matData) return;

    const mat = new THREE.MeshStandardMaterial({
      color: matData.color,
      emissive: matData.color,
      emissiveIntensity: 0.9,
      roughness: 0.25,
    });

    const mesh = new THREE.Mesh(this.cubeGeo, mat);
    mesh.position.set(x, 0.4, z);
    if (scene) scene.add(mesh);

    this.drops.push({
      mesh,
      mat,
      isMaterial: true,
      materialId: matId,
      materialCount: count,
      typeData: {
        id: matId,
        name: matData.name + (count > 1 ? ` x${count}` : ''),
        effect: () => {
          gameState.addMaterial(matId, count);
        },
      },
      spawnY: 0.4,
      timeOffset: Math.random() * 10,
    });
  }

  update(delta, time, player, scene, onPickupMessage) {
    if (!player) return;

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];

      // Floating bob and rotation
      drop.mesh.rotation.y += delta * 2;
      drop.mesh.rotation.x += delta * 1.2;
      drop.mesh.position.y = drop.spawnY + Math.sin(time * 3 + drop.timeOffset) * 0.12;

      // Distance to player
      const dx = player.mesh.position.x - drop.mesh.position.x;
      const dz = player.mesh.position.z - drop.mesh.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= 1.2) {
        drop.typeData.effect(player);
        if (onPickupMessage) {
          onPickupMessage(drop.typeData.name, drop.mesh.position, drop);
        }

        if (scene) scene.remove(drop.mesh);
        drop.mat.dispose();
        this.drops.splice(i, 1);
      }
    }
  }

  clear(scene) {
    for (const drop of this.drops) {
      if (scene) scene.remove(drop.mesh);
      drop.mat.dispose();
    }
    this.drops = [];
  }
}
