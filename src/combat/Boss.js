import * as THREE from 'three';

export class Boss {
  constructor(name, maxHp, speed, baseDamage) {
    this.name = name;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.speed = speed;
    this.baseDamage = baseDamage;
    this.isBoss = true;

    this.mesh = new THREE.Group();
    this.currentPhase = 1;
    this.isEnraged = false;
    this.isVulnerable = false;
    this.isStunned = false;
    this.isPinned = false;
    this.isInvulnerable = false;
    this.dead = false;
    this.isDying = false;

    this.pinCount = 0;
    this.pinTimer = 0;
    this.vulnerableTimer = 0;
    this.stunTimer = 0;
  }

  takeDamage(amount, isFinisher = false, attackerPos = null) {
    if (this.dead || this.isInvulnerable) return 0;

    let multiplier = 1.0;

    // Check angle of attack (weak points & pinned logic)
    if (attackerPos) {
      const toAttackerX = attackerPos.x - this.mesh.position.x;
      const toAttackerZ = attackerPos.z - this.mesh.position.z;
      const dist = Math.hypot(toAttackerX, toAttackerZ);

      if (dist > 0.001) {
        const dirX = toAttackerX / dist;
        const dirZ = toAttackerZ / dist;

        // Boss facing forward vector
        const facingX = Math.sin(this.mesh.rotation.y);
        const facingZ = Math.cos(this.mesh.rotation.y);
        const dot = dirX * facingX + dirZ * facingZ;

        if (this.isPinned) {
          // "During pinned, the boss takes x2 damage from attacks that hit from behind or from the side (dot product with boss facing: less than 0.3)"
          if (dot < 0.3) {
            multiplier *= 2.0;
          }
        } else {
          // "Weak points: attacks from behind deal x1.5 damage always."
          if (dot < -0.3) {
            multiplier *= 1.5;
          }
        }
      }
    }

    if (this.isVulnerable) {
      multiplier *= 1.25;
    }
    if (this.isStunned) {
      multiplier *= 1.5;
    }

    const finalDamage = Math.max(1, Math.round(amount * multiplier));
    this.hp = Math.max(0, this.hp - finalDamage);

    this.onDamaged(finalDamage);

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }

    return finalDamage;
  }

  onDamaged(finalDamage) {
    // Override in subclass
  }

  die() {
    this.dead = true;
    this.isDying = true;
  }

  dispose() {
    this.mesh.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }
}
