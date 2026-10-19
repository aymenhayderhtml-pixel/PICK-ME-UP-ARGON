import * as THREE from 'three';
import { showSystemMessage } from '../ui/Hud.js';

export class ProjectilesManager {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
    this.poisonEffects = [];
  }

  spawn({ type = 'arrow', from, direction, speed = 18, damage = 5, owner = 'enemy', poison = null, onHit = null }) {
    const dirNorm = direction.clone().normalize();
    const mesh = new THREE.Group();

    if (type === 'arrow') {
      const shaftMat = new THREE.MeshStandardMaterial({ color: 0x5a3d24, roughness: 0.9 });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), shaftMat);
      shaft.rotation.x = Math.PI / 2;

      const tipMat = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.8 });
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 6), tipMat);
      tip.rotation.x = -Math.PI / 2;
      tip.position.z = -0.35;

      mesh.add(shaft, tip);
    } else if (type === 'fireball') {
      const fMat = new THREE.MeshBasicMaterial({ color: 0x33ff55 });
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), fMat);
      mesh.add(flame);

      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00ff44,
        transparent: true,
        opacity: 0.45,
      });
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), glowMat);
      mesh.add(glow);
    }

    mesh.position.copy(from);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dirNorm);

    this.scene.add(mesh);

    this.projectiles.push({
      type,
      mesh,
      direction: dirNorm,
      speed,
      damage,
      owner,
      poison,
      onHit,
      life: 3.0,
    });
  }

  update(delta, player, enemies, dungeon, allies = []) {
    // 1. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= delta;

      // Straight movement
      p.mesh.position.addScaledVector(p.direction, p.speed * delta);

      // Check wall collision
      if (dungeon && !dungeon.isWalkable(p.mesh.position.x, p.mesh.position.z)) {
        this.destroyProjectile(i);
        continue;
      }

      // Check lifetime
      if (p.life <= 0) {
        this.destroyProjectile(i);
        continue;
      }

      // Check collision with enemies (if fired by player or ally)
      if (p.owner === 'player') {
        let hitEnemy = false;
        for (const enemy of (enemies || [])) {
          if (enemy.dead || enemy.isDying) continue;
          const dx = p.mesh.position.x - enemy.mesh.position.x;
          const dz = p.mesh.position.z - enemy.mesh.position.z;
          const dist = Math.hypot(dx, dz);
          const hitbox = enemy.isBoss ? 1.8 : 0.75;
          if (dist < hitbox && Math.abs(p.mesh.position.y - (enemy.mesh.position.y + 0.9)) < 1.8) {
            enemy.takeDamage(p.damage, false, p.mesh.position);
            if (p.onHit) p.onHit(enemy);
            this.destroyProjectile(i);
            hitEnemy = true;
            break;
          }
        }
        if (hitEnemy) continue;
      } else {
        // Fired by enemy: check player and allies
        let hitTarget = false;
        if (player && !player.dead) {
          const dx = p.mesh.position.x - player.mesh.position.x;
          const dz = p.mesh.position.z - player.mesh.position.z;
          const dist = Math.hypot(dx, dz);

          if (dist < 0.65 && Math.abs(p.mesh.position.y - (player.mesh.position.y + 0.9)) < 1.2) {
            const result = player.takeDamage(p.damage, null, p.mesh.position, 'projectile');
            if (!result.blocked && !result.parried && !result.dodged) {
              if (p.poison) {
                this.applyPoison(player, p.poison);
              }
              if (p.onHit) {
                p.onHit(player);
              }
            }
            this.destroyProjectile(i);
            hitTarget = true;
          }
        }
        if (hitTarget) continue;

        for (const ally of (allies || [])) {
          if (ally.dead || ally.isDying) continue;
          const dx = p.mesh.position.x - ally.mesh.position.x;
          const dz = p.mesh.position.z - ally.mesh.position.z;
          const dist = Math.hypot(dx, dz);

          if (dist < 0.65 && Math.abs(p.mesh.position.y - (ally.mesh.position.y + 0.9)) < 1.2) {
            ally.takeDamage(p.damage);
            if (p.poison) {
              this.applyPoison(ally, p.poison);
            }
            if (p.onHit) {
              p.onHit(ally);
            }
            this.destroyProjectile(i);
            hitTarget = true;
            break;
          }
        }
        if (hitTarget) continue;
      }
    }

    // 2. Update Active Poison Effects
    for (let i = this.poisonEffects.length - 1; i >= 0; i--) {
      const eff = this.poisonEffects[i];
      eff.duration -= delta;
      eff.tickTimer += delta;

      if (eff.tickTimer >= 1.0) {
        eff.tickTimer -= 1.0;
        if (eff.target && !eff.target.dead) {
          eff.target.takeDamage(eff.dps);
        }
      }

      if (eff.duration <= 0) {
        this.poisonEffects.splice(i, 1);
      }
    }
  }

  applyPoison(target, poisonConfig) {
    showSystemMessage('[Poisoned! Taking poison damage]');
    this.poisonEffects.push({
      target,
      dps: poisonConfig.dps || 1,
      duration: poisonConfig.duration || 3.0,
      tickTimer: 0,
    });
  }

  destroyProjectile(index) {
    const p = this.projectiles[index];
    if (p && p.mesh) {
      this.scene.remove(p.mesh);
      p.mesh.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }
    this.projectiles.splice(index, 1);
  }

  clear() {
    for (const p of this.projectiles) {
      if (p.mesh) {
        this.scene.remove(p.mesh);
        p.mesh.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) obj.material.dispose();
        });
      }
    }
    this.projectiles = [];
    this.poisonEffects = [];
  }
}
