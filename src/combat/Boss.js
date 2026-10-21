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

    this.capsuleRadius = 0.8;
    this.capsuleHeight = 2.8;
    this.team = 'enemy';
    this.id = 'boss_enemy';
    this.statusEffects = new Map([
      ['burn', { active: false, duration: 0, tickInterval: 0.5, tickTimer: 0, potency: 6, tickDamage: 3 }],
    ]);
  }

  get position() {
    return this.mesh ? this.mesh.position : (this._pos || (this._pos = new THREE.Vector3()));
  }

  get isDead() {
    return this.dead || this.isDying || this.hp <= 0;
  }

  applyStatusEffect(type, conf = {}) {
    let eff = this.statusEffects.get(type);
    if (!eff) {
      eff = { active: false, duration: 0, tickInterval: 0.5, tickTimer: 0, tickDamage: 3, potency: 1.0 };
      this.statusEffects.set(type, eff);
    }
    eff.active = true;
    eff.duration = typeof conf === 'number' ? conf : (conf.duration ?? 3.0);
    if (typeof conf === 'object') {
      if (conf.potency !== undefined) eff.potency = conf.potency;
      if (conf.tickDamage !== undefined) eff.tickDamage = conf.tickDamage;
      if (conf.tickInterval !== undefined) eff.tickInterval = conf.tickInterval;
    }
    eff.tickTimer = 0;
    if (this.rig && this.rig.setTint && type === 'burn') {
      this.rig.setTint(0xff6600, 0.7);
    }
  }

  receiveAttack(hitPayload) {
    if (this.dead || this.isInvulnerable) return null;
    const dmg = hitPayload?.damage ?? hitPayload?.rawDamage ?? 0;
    const actualDmg = this.takeDamage(dmg, hitPayload?.isFinisher, hitPayload?.attackerPosition);

    if (hitPayload?.statusEffect) {
      this.applyStatusEffect(hitPayload.statusEffect.type, hitPayload.statusEffect);
    }

    return { damage: actualDmg, killed: this.dead };
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

  updateStatusEffects(delta, context = null) {
    const burn = this.statusEffects?.get('burn');
    if (burn && burn.active && !this.dead) {
      burn.duration -= delta;
      burn.tickTimer += delta;
      if (burn.tickTimer >= (burn.tickInterval || 0.5)) {
        burn.tickTimer = 0;
        const bDmg = burn.tickDamage || 3;
        this.hp = Math.max(0, this.hp - bDmg);
        if (this.rig && this.rig.setTint) {
          this.rig.setTint(0xff6600, 0.8);
          setTimeout(() => {
            if (this.rig && !this.dead) this.rig.setTint(null, 0);
          }, 100);
        }
        const onDmg = context?.onDamageNumber;
        if (onDmg) onDmg(bDmg, this.position, 'burn');
        if (this.hp <= 0) {
          this.hp = 0;
          this.die();
        }
      }
      if (burn.duration <= 0) {
        burn.active = false;
        if (this.rig && this.rig.setTint) this.rig.setTint(null, 0);
      }
    }
  }

  update(delta, ...args) {
    this.updateStatusEffects(delta);
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
