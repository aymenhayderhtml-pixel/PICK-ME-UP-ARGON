// src/combat/Items.js
import * as THREE from 'three';
import { createPickupModel } from '../art/weapons.js';
import { mapItemToModel } from '../art/itemModels.js';
import { showSystemMessage } from '../ui/Notices.js';

export const ITEM_TEMPLATES = {
  RUSTY_SWORD: {
    id: 'rusty_sword',
    name: 'Rusty Sword',
    slot: 'weapon',
    weaponType: 'sword',
    grade: 'E',
    durability: 40,
    maxDurability: 40,
    damageMult: 1.0,
    blockMult: 0,
    attackSpeedMult: 1.0,
  },
  WOODEN_SHIELD: {
    id: 'wooden_shield',
    name: 'Wooden Shield',
    slot: 'shield',
    weaponType: 'shield',
    grade: 'E',
    durability: 50,
    maxDurability: 50,
    damageMult: 0,
    blockMult: 1.0,
    attackSpeedMult: 1.0,
  },
  CLUB: {
    id: 'goblin_club',
    name: 'Goblin Club',
    slot: 'weapon',
    weaponType: 'club',
    grade: 'E',
    durability: 20,
    maxDurability: 20,
    damageMult: 0.8,
    blockMult: 0,
    attackSpeedMult: 0.85,
  },
  RUSTY_DAGGER: {
    id: 'rusty_dagger',
    name: 'Rusty Dagger',
    slot: 'weapon',
    weaponType: 'dagger',
    grade: 'E',
    durability: 30,
    maxDurability: 30,
    damageMult: 0.65,
    blockMult: 0,
    attackSpeedMult: 1.4,
  },
  CRUDE_SHIELD: {
    id: 'crude_shield',
    name: 'Crude Shield',
    slot: 'shield',
    weaponType: 'shield',
    grade: 'E',
    durability: 35,
    maxDurability: 35,
    damageMult: 0,
    blockMult: 0.8,
    attackSpeedMult: 1.0,
  },
  NOVICE_IRON_SHIELD: {
    id: 'novice_iron_shield',
    name: "Dead Novice's Iron Shield",
    slot: 'shield',
    weaponType: 'shield',
    grade: 'D',
    durability: 70,
    maxDurability: 70,
    damageMult: 0,
    blockMult: 1.25,
    attackSpeedMult: 1.0,
  },
};

export class ItemsManager {
  constructor() {
    this.groundItems = []; // { group, pickup, item, toss }
  }

  spawnItem(scene, x, z, itemTemplate, options = {}) {
    if (!scene || !itemTemplate) return null;

    const itemData = {
      id: itemTemplate.id || itemTemplate.templateId,
      templateId: itemTemplate.templateId || itemTemplate.id,
      slot: itemTemplate.slot || (itemTemplate.weaponType === 'shield' ? 'shield' : 'weapon'),
      type: itemTemplate.type || itemTemplate.weaponType || 'sword',
      weaponType: itemTemplate.weaponType || itemTemplate.type || 'sword',
      name: itemTemplate.name || 'Equipment',
      grade: itemTemplate.grade || 'E',
      enhance: itemTemplate.enhance || 0,
      durability: itemTemplate.durability !== undefined ? itemTemplate.durability : (itemTemplate.maxDurability || 50),
      maxDurability: itemTemplate.maxDurability || 50,
      damageMult: itemTemplate.damageMult || 1.0,
      blockMult: itemTemplate.blockMult || 0,
      attackSpeedMult: itemTemplate.attackSpeedMult || 1.0,
    };

    const mapped = mapItemToModel(itemData) || { kind: 'sword', grade: 'E', wear: 0 };
    const pickup = createPickupModel(mapped.kind, {
      grade: mapped.grade,
      enhance: mapped.enhance,
      wear: mapped.wear,
      seed: Math.floor(Math.random() * 99999)
    });

    const group = pickup.group;
    const groundY = options.groundY !== undefined ? options.groundY : 0.0;

    let toss = null;
    if (options.fromPos) {
      group.position.copy(options.fromPos);
      toss = {
        elapsed: 0,
        duration: 0.4,
        startPos: options.fromPos.clone(),
        targetPos: new THREE.Vector3(x, groundY, z)
      };
    } else {
      group.position.set(x, groundY, z);
    }

    scene.add(group);

    const entry = {
      group,
      pickup,
      item: itemData,
      toss
    };
    this.groundItems.push(entry);
    return entry;
  }

  getNearbyItem(playerPos, radius = 1.5) {
    if (!playerPos) return null;
    let closest = null;
    let minDist = radius;

    for (const entry of this.groundItems) {
      const dx = playerPos.x - entry.group.position.x;
      const dz = playerPos.z - entry.group.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= minDist) {
        minDist = dist;
        closest = entry;
      }
    }
    return closest;
  }

  pickupItem(entry, player, scene) {
    if (!entry || !player) return false;

    const newItem = entry.item;
    let oldItem = null;

    if (newItem.slot === 'weapon' || newItem.type !== 'shield') {
      oldItem = player.weapon;
      player.equipWeapon(newItem);
    } else {
      oldItem = player.shield;
      player.equipShield(newItem);
    }

    // Dispose and remove picked up item from ground
    if (entry.pickup) entry.pickup.dispose();
    if (scene) scene.remove(entry.group);
    const idx = this.groundItems.indexOf(entry);
    if (idx !== -1) this.groundItems.splice(idx, 1);

    // If player had an item equipped with remaining durability, drop it with toss animation
    if (oldItem && oldItem.durability > 0 && oldItem.id !== 'bare_fists') {
      const dropPos = player.mesh.position.clone();
      const dropTargetX = dropPos.x + (Math.random() - 0.5) * 1.2;
      const dropTargetZ = dropPos.z + (Math.random() - 0.5) * 1.2;
      this.spawnItem(scene, dropTargetX, dropTargetZ, oldItem, {
        fromPos: new THREE.Vector3(dropPos.x, dropPos.y + 1.0, dropPos.z),
        groundY: dropPos.y
      });
    }

    showSystemMessage(`[Equipped ${newItem.name} (${newItem.durability}/${newItem.maxDurability})]`);
    return true;
  }

  update(delta, time, playerPos = null) {
    for (let i = this.groundItems.length - 1; i >= 0; i--) {
      const entry = this.groundItems[i];

      // Handle toss arc
      if (entry.toss) {
        entry.toss.elapsed += delta;
        const p = Math.min(1.0, entry.toss.elapsed / entry.toss.duration);

        // Linear horizontal motion
        const curX = THREE.MathUtils.lerp(entry.toss.startPos.x, entry.toss.targetPos.x, p);
        const curZ = THREE.MathUtils.lerp(entry.toss.startPos.z, entry.toss.targetPos.z, p);

        // Parabolic vertical arc with peak +1.2m
        const arcY = Math.sin(p * Math.PI) * 1.2;
        const curY = THREE.MathUtils.lerp(entry.toss.startPos.y, entry.toss.targetPos.y, p) + arcY;

        entry.group.position.set(curX, curY, curZ);

        if (p >= 1.0) {
          entry.group.position.copy(entry.toss.targetPos);
          entry.toss = null;
        }
      }

      // Proximity highlight (within 4 units)
      if (playerPos) {
        const dx = playerPos.x - entry.group.position.x;
        const dz = playerPos.z - entry.group.position.z;
        const dist = Math.hypot(dx, dz);
        entry.pickup.setHighlight(dist <= 4.0);
      }

      entry.pickup.update(delta);
    }
  }

  clear(scene) {
    for (const entry of this.groundItems) {
      if (entry.pickup) entry.pickup.dispose();
      if (scene) scene.remove(entry.group);
    }
    this.groundItems = [];
  }
}
