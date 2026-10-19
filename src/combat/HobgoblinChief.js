import { EnemyRig } from '../art/EnemyRig.js';
import * as THREE from 'three';
import { Boss } from './Boss.js';
import { showSystemMessage } from '../ui/Hud.js';

export class HobgoblinChief extends Boss {
  constructor(x, z, telegraph, camera) {
    super('Hobgoblin Chief', 600, 2.4, 25);
    this.telegraph = telegraph;
    this.thirdPersonCamera = camera;

    // Boss state: 'idle' | 'chase' | 'windup' | 'attack' | 'recovery' | 'charge' | 'stunned' | 'pinned' | 'enrage_roar' | 'dead'
    this.state = 'idle';
    this.stateTimer = 0;
    this.attackCooldown = 1.2;
    this.lastAttacks = []; // Keep track to prevent 3 of the same in a row

    this.chargeDir = new THREE.Vector3();
    this.chargeDistanceLeft = 0;
    this.chargeSpeed = 14.0;
    this.windupMultiplier = 1.0;

    // Phase tracking
    this.phase2Triggered = false;
    this.shamans = []; // 2 healing shamans
    this.shamanHealTimer = 8.0;
    this.tetherLines = [];

    // Footstep stomp shake
    this.stepTimer = 0;

    // Build the visual model
    this.buildModel();
    this.mesh.scale.set(1.0, 1.0, 1.0);
    this.mesh.position.set(x, 0, z);

    // Reference to scene/dungeon/player
    this.scene = null;
    this.dungeon = null;
    this.player = null;
  }

  buildModel() {
    this.rig = new EnemyRig('hobgoblin_chief', { seed: 9999, level: 5 });
    this.mesh.add(this.rig.group);

    // Dummy pivots for backward compatibility
    this.leftArmPivot = new THREE.Group();
    this.rightArmPivot = new THREE.Group();
    this.leftLegPivot = new THREE.Group();
    this.rightLegPivot = new THREE.Group();
    this.torsoGroup = new THREE.Group();

    this.mainMat = {
      color: new THREE.Color(0x6a7a3a),
      setHex: (hex) => {
        if (this.rig) this.rig.setTint(hex, 0.85);
      },
      copy: () => {
        if (this.rig) this.rig.setTint(null, 0);
      }
    };
    this.originalColor = new THREE.Color(0x6a7a3a);
    this.tagHeight = 2.85;

    this.auraMesh = { material: { opacity: 0 } };

    // Dizzy Stars Indicator
    this.dizzyGroup = new THREE.Group();
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    const starGeo = new THREE.SphereGeometry(0.1, 6, 6);
    for (let i = 0; i < 4; i++) {
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(Math.cos((i / 4) * Math.PI * 2) * 0.6, 2.85, Math.sin((i / 4) * Math.PI * 2) * 0.6);
      this.dizzyGroup.add(star);
    }
    this.dizzyGroup.visible = false;
    this.mesh.add(this.dizzyGroup);

    // Pinned Spear Visual
    this.pinnedSpear = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.8 })
    );
    this.pinnedSpear.rotation.z = Math.PI / 4;
    this.pinnedSpear.position.set(0.6, 0.8, 0.8);
    this.pinnedSpear.visible = false;
    this.mesh.add(this.pinnedSpear);
  }

  onDamaged(finalDamage) {
    // Damage flash
    if (this.rig) this.rig.setTint(0xffffff, 0.85);
    setTimeout(() => {
      if (this.rig) this.rig.setTint(null, 0);
    }, 100);

    // Phase 2 transition check at 50% HP (300 HP)
    if (!this.phase2Triggered && this.hp <= this.maxHp * 0.5 && this.hp > 0) {
      this.triggerPhase2();
    }
  }

  triggerPhase2() {
    this.phase2Triggered = true;
    this.currentPhase = 2;
    this.state = 'enrage_roar';
    this.stateTimer = 1.5;
    this.isInvulnerable = true;

    // +30% speed, windups 25% shorter
    this.speed = 2.4 * 1.3;
    this.windupMultiplier = 0.75;

    // Red aura and enrage visual
    if (this.rig) this.rig.setEnrage(1.0);

    // Camera shake on roar
    if (this.thirdPersonCamera) {
      this.thirdPersonCamera.shake(0.12, 1.2);
    }

    // Push player back 5 units
    if (this.player) {
      const pPos = this.player.mesh.position;
      const bPos = this.mesh.position;
      const dx = pPos.x - bPos.x;
      const dz = pPos.z - bPos.z;
      const dist = Math.hypot(dx, dz) || 1;
      this.player.mesh.position.x += (dx / dist) * 5.0;
      this.player.mesh.position.z += (dz / dist) * 5.0;
    }

    // Red screen vignette flash
    this.flashRedVignette();

    showSystemMessage('[The Hobgoblin Chief enrages!]');

    if (this.squadAI) {
      this.squadAI.triggerBossRoarPanic();
    }

    // Summon 4 Goblin Grunts from arena edges
    if (this.onSummonAdds) {
      this.onSummonAdds();
    }
  }

  flashRedVignette() {
    if (typeof document === 'undefined') return;
    const v = document.createElement('div');
    v.style.position = 'fixed';
    v.style.top = '0';
    v.style.left = '0';
    v.style.width = '100vw';
    v.style.height = '100vh';
    v.style.boxShadow = 'inset 0 0 100px rgba(255, 0, 0, 0.8)';
    v.style.pointerEvents = 'none';
    v.style.zIndex = '10006';
    v.style.transition = 'opacity 1.2s ease-out';
    document.body.appendChild(v);
    setTimeout(() => {
      v.style.opacity = '0';
      setTimeout(() => {
        if (v.parentNode) v.parentNode.removeChild(v);
      }, 1200);
    }, 300);
  }

  pinWeapon(duration = 1.8, byHero = 'Aaron') {
    if (this.dead || this.isDying) return false;

    // Pinning works during windup or attack
    if (this.state === 'windup' || this.state === 'attack' || this.state === 'recovery') {
      this.state = 'pinned';
      this.isPinned = true;
      if (this.telegraph) {
        this.telegraph.clear();
      }

      // Diminishing returns on duration: 1.8s, 1.4s, 1.0s
      this.pinCount++;
      const actualDuration = this.pinCount === 1 ? 1.8 : this.pinCount === 2 ? 1.4 : 1.0;
      this.stateTimer = actualDuration;

      // Visual spear & spark
      this.pinnedSpear.visible = true;

      // Spark particles
      if (this.scene) {
        const sparkGeo = new THREE.BufferGeometry();
        const pCount = 12;
        const pPos = new Float32Array(pCount * 3);
        for (let i = 0; i < pCount; i++) {
          pPos[i * 3 + 0] = this.mesh.position.x + 0.6 + (Math.random() - 0.5) * 0.4;
          pPos[i * 3 + 1] = 0.2 + Math.random() * 0.6;
          pPos[i * 3 + 2] = this.mesh.position.z + 0.6 + (Math.random() - 0.5) * 0.4;
        }
        sparkGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const sparkMat = new THREE.PointsMaterial({ color: 0xffdd44, size: 0.18, transparent: true, opacity: 1 });
        const sparks = new THREE.Points(sparkGeo, sparkMat);
        this.scene.add(sparks);
        setTimeout(() => {
          if (this.scene) this.scene.remove(sparks);
          sparkGeo.dispose();
          sparkMat.dispose();
        }, 350);
      }

      showSystemMessage(`[${byHero} has pinned the Hobgoblin's weapon!]`);
      return true;
    }
    return false;
  }

  update(delta, player, dungeon, camera, projectilesManager) {
    this.player = player;
    this.dungeon = dungeon;

    // Death collapse and dissolve
    if (this.dead) {
      this.deathElapsed = (this.deathElapsed || 0) + delta;
      if (this.rig) {
        this.rig.update(delta, { state: 'death', actionTime: this.deathElapsed });
        this.rig.setOpacity(Math.max(0, this.stateTimer / 2.0));
      }
      this.stateTimer -= delta;
      return;
    }

    // Dizzy stars rotation
    if (this.isStunned) {
      this.dizzyGroup.visible = true;
      this.dizzyGroup.rotation.y += delta * 6.0;
    } else {
      this.dizzyGroup.visible = false;
    }

    // Heavy footstep stomp camera shake
    if (this.state === 'chase' || this.state === 'charge') {
      this.stepTimer += delta;
      if (this.stepTimer >= 0.5) {
        this.stepTimer = 0;
        if (this.thirdPersonCamera) {
          this.thirdPersonCamera.shake(0.02, 0.15);
        }
      }
    }

    // Rig animation update
    let actionTime = 0;
    if (this.state === 'attack') {
      actionTime = Math.max(0, 0.3 - this.stateTimer);
    } else if (this.state === 'windup') {
      actionTime = Math.max(0, 0.9 - this.stateTimer);
    } else if (this.state === 'enrage_roar') {
      actionTime = Math.max(0, 1.5 - this.stateTimer);
    }

    if (this.rig) {
      this.rig.update(delta, {
        moving: this.isMoving,
        speed: this.speed / 2.4,
        state: this.state === 'enrage_roar' ? 'roar' : this.state,
        attackType: this.currentAttackType,
        actionTime,
        enraged: this.phase2Triggered
      });
    }
    this.isMoving = false;

    const pPos = player.mesh.position;
    const dx = pPos.x - this.mesh.position.x;
    const dz = pPos.z - this.mesh.position.z;
    const distToPlayer = Math.hypot(dx, dz);

    // 1. Enrage Roar state (Phase 2 start)
    if (this.state === 'enrage_roar') {
      this.stateTimer -= delta;
      this.leftArmPivot.rotation.x = -Math.PI * 0.8;
      this.rightArmPivot.rotation.x = -Math.PI * 0.8;
      if (this.stateTimer <= 0) {
        this.isInvulnerable = false;
        this.state = 'chase';
        this.attackCooldown = 0.5;
      }
      return;
    }

    // 2. Stunned state (after hitting pillar/wall)
    if (this.state === 'stunned') {
      this.stateTimer -= delta;
      this.leftArmPivot.rotation.x = 0;
      this.rightArmPivot.rotation.x = 0;
      if (this.stateTimer <= 0) {
        this.isStunned = false;
        this.state = 'chase';
        this.attackCooldown = 1.0;
      }
      return;
    }

    // 3. Pinned state (weapon pinned to ground)
    if (this.state === 'pinned') {
      this.stateTimer -= delta;
      this.rightArmPivot.rotation.x = 0.8; // arm dragged down to pinned weapon
      if (this.stateTimer <= 0) {
        this.isPinned = false;
        this.pinnedSpear.visible = false;
        this.state = 'chase';
        this.attackCooldown = 1.0;
      }
      return;
    }

    // 4. Vulnerable Recovery state (after Heavy Cleave)
    if (this.state === 'recovery') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        this.isVulnerable = false;
        this.state = 'chase';
        this.attackCooldown = 1.2;
      }
      return;
    }

    // 5. Charge state
    if (this.state === 'charge') {
      this.isMoving = true;
      const step = this.chargeSpeed * delta;
      const nextX = this.mesh.position.x + this.chargeDir.x * step;
      const nextZ = this.mesh.position.z + this.chargeDir.z * step;

      // Check collision with pillars or walls
      let hitObstacle = false;
      if (dungeon && dungeon.destroyPillarAt) {
        hitObstacle = dungeon.destroyPillarAt(nextX, nextZ, 2.2);
      }
      if (!hitObstacle && dungeon && !dungeon.isWalkable(nextX, nextZ)) {
        hitObstacle = true;
      }

      if (hitObstacle) {
        // Hit pillar / wall: Stunned for 1.5s, takes 40 damage!
        this.isStunned = true;
        this.state = 'stunned';
        this.stateTimer = 1.5;
        this.hp = Math.max(0, this.hp - 40);
        showSystemMessage('[The Hobgoblin crashes and is STUNNED!]');
        if (this.thirdPersonCamera) {
          this.thirdPersonCamera.shake(0.12, 0.4);
        }
        return;
      }

      // Check player contact damage during charge
      if (distToPlayer < 2.2 && !player.isRolling) {
        player.takeDamage(25, camera, this.mesh.position, 'melee', this);
        if (player.applyKnockback) {
          player.applyKnockback(this.chargeDir.x, this.chargeDir.z, 8);
        }
      }
      if (this.squadAI && this.squadAI.allies) {
        for (const ally of this.squadAI.allies) {
          if (!ally.dead && this.mesh.position.distanceTo(ally.mesh.position) < 2.2) {
            ally.takeDamage(25);
          }
        }
      }

      this.mesh.position.x = nextX;
      this.mesh.position.z = nextZ;
      this.chargeDistanceLeft -= step;

      if (this.chargeDistanceLeft <= 0) {
        this.state = 'chase';
        this.attackCooldown = 1.2;
      }
      return;
    }

    // 6. Windup state
    if (this.state === 'windup') {
      this.stateTimer -= delta;

      // Raise weapon during windup
      if (this.currentAttackType === 'cleave') {
        this.rightArmPivot.rotation.x = -Math.PI * 0.75;
      } else if (this.currentAttackType === 'slam') {
        this.leftArmPivot.rotation.x = -Math.PI * 0.7;
        this.rightArmPivot.rotation.x = -Math.PI * 0.7;
      }

      if (this.stateTimer <= 0) {
        this.executeAttack(player, camera, projectilesManager);
      }
      return;
    }

    // 7. Attack state
    if (this.state === 'attack') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        if (this.currentAttackType === 'cleave') {
          // Enter 0.8s vulnerable recovery
          this.state = 'recovery';
          this.stateTimer = 0.8;
          this.isVulnerable = true;
        } else {
          this.state = 'chase';
          this.attackCooldown = 1.2;
        }
      }
      return;
    }

    // 8. Chase / Idle AI
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }

    // Shaman Healing Tether Loop in Phase 2
    if (this.phase2Triggered) {
      this.shamanHealTimer -= delta;
      if (this.shamanHealTimer <= 0) {
        this.shamanHealTimer = 8.0;
        this.applyShamanHeals();
      }

      // Update visible green tether lines
      if (this.scene) {
        if (!this.tetherGroup) {
          this.tetherGroup = new THREE.Group();
          this.scene.add(this.tetherGroup);
        }
        while (this.tetherLines.length < this.shamans.length) {
          const lGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
          const lMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.85 });
          const lMesh = new THREE.Line(lGeo, lMat);
          this.tetherGroup.add(lMesh);
          this.tetherLines.push(lMesh);
        }
        for (let i = 0; i < this.shamans.length; i++) {
          const sh = this.shamans[i];
          const line = this.tetherLines[i];
          if (sh && !sh.dead && !this.dead) {
            line.visible = true;
            const p1 = sh.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
            const p2 = this.mesh.position.clone().add(new THREE.Vector3(0, 1.8, 0));
            line.geometry.setFromPoints([p1, p2]);
          } else if (line) {
            line.visible = false;
          }
        }
      }
    }

    if (distToPlayer > 3.0) {
      // Walk toward player
      const dirX = dx / distToPlayer;
      const dirZ = dz / distToPlayer;
      this.mesh.position.x += dirX * this.speed * delta;
      this.mesh.position.z += dirZ * this.speed * delta;
      this.mesh.rotation.y = Math.atan2(dirX, dirZ);
      this.isMoving = true;

      // Limb swing
      const swing = Math.sin(performance.now() * 0.008 * this.speed) * 0.55;
      this.leftLegPivot.rotation.x = -swing;
      this.rightLegPivot.rotation.x = swing;
    } else {
      this.mesh.rotation.y = Math.atan2(dx, dz);
    }

    // Attack selection
    if (this.attackCooldown <= 0 && this.state === 'chase') {
      this.selectNextAttack(distToPlayer);
    }
  }

  selectNextAttack(distToPlayer) {
    const available = ['cleave', 'slam', 'charge'];
    if (this.currentPhase === 2) {
      available.push('throw');
    }

    // Filter out if repeated 2 times already
    const len = this.lastAttacks.length;
    let candidates = available;
    if (len >= 2 && this.lastAttacks[len - 1] === this.lastAttacks[len - 2]) {
      candidates = available.filter((a) => a !== this.lastAttacks[len - 1]);
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    this.lastAttacks.push(chosen);
    if (this.lastAttacks.length > 5) this.lastAttacks.shift();

    this.startAttack(chosen, distToPlayer);
  }

  startAttack(type, distToPlayer) {
    this.currentAttackType = type;
    const facingYaw = this.mesh.rotation.y;

    if (type === 'cleave') {
      const dur = 1.0 * this.windupMultiplier;
      this.state = 'windup';
      this.stateTimer = dur;
      this.telegraph.showSector(this.mesh.position, facingYaw, 4.5, (100 * Math.PI) / 180, dur);
    } else if (type === 'slam') {
      const dur = 0.9 * this.windupMultiplier;
      this.state = 'windup';
      this.stateTimer = dur;
      this.telegraph.showCircle(this.mesh.position, 1.0, 6.0, dur);
    } else if (type === 'charge') {
      const dur = 0.6 * this.windupMultiplier;
      this.state = 'windup';
      this.stateTimer = dur;
      this.chargeDir.set(Math.sin(facingYaw), 0, Math.cos(facingYaw)).normalize();
      this.telegraph.showLine(this.mesh.position, facingYaw, 14.0, 2.4, dur);
    } else if (type === 'throw') {
      const dur = 0.7 * this.windupMultiplier;
      this.state = 'windup';
      this.stateTimer = dur;
      this.telegraph.showLine(this.mesh.position, facingYaw, 16.0, 1.8, dur);
    }
  }

  executeAttack(player, camera, projectilesManager) {
    this.state = 'attack';
    this.stateTimer = 0.3;

    const pPos = player.mesh.position;
    const distToPlayer = this.mesh.position.distanceTo(pPos);

    if (this.currentAttackType === 'cleave') {
      // Swing cleaver down
      this.rightArmPivot.rotation.x = 0.6;
      if (distToPlayer <= 4.5 && !player.isRolling) {
        player.takeDamage(30, camera, this.mesh.position, 'boss_cleave', this);
      }
      if (this.squadAI && this.squadAI.allies) {
        for (const ally of this.squadAI.allies) {
          if (!ally.dead && this.mesh.position.distanceTo(ally.mesh.position) <= 4.5) {
            ally.takeDamage(30);
          }
        }
      }
    } else if (this.currentAttackType === 'slam') {
      // Ground slam impact
      this.leftArmPivot.rotation.x = 0.5;
      this.rightArmPivot.rotation.x = 0.5;
      if (this.thirdPersonCamera) {
        this.thirdPersonCamera.shake(0.08, 0.35);
      }

      // Dust shockwave ring
      if (this.scene) {
        const shockGeo = new THREE.RingGeometry(0.5, 1.2, 24);
        const shockMat = new THREE.MeshBasicMaterial({
          color: 0xc8b299,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const shockMesh = new THREE.Mesh(shockGeo, shockMat);
        shockMesh.rotation.x = -Math.PI / 2;
        shockMesh.position.set(this.mesh.position.x, 0.06, this.mesh.position.z);
        this.scene.add(shockMesh);

        let elapsed = 0;
        const dur = 0.45;
        const animShock = () => {
          elapsed += 0.016;
          const p = Math.min(1.0, elapsed / dur);
          const r = 1.0 + p * 5.0; // expands to radius 6
          shockMesh.scale.set(r, r, 1);
          shockMat.opacity = 0.8 * (1.0 - p);
          if (p < 1.0) {
            requestAnimationFrame(animShock);
          } else {
            if (this.scene) this.scene.remove(shockMesh);
            shockGeo.dispose();
            shockMat.dispose();
          }
        };
        requestAnimationFrame(animShock);
      }

      if (distToPlayer <= 6.0 && !player.isRolling) {
        player.takeDamage(20, camera, this.mesh.position, 'boss_slam', this);
      }
      if (this.squadAI && this.squadAI.allies) {
        for (const ally of this.squadAI.allies) {
          if (!ally.dead && this.mesh.position.distanceTo(ally.mesh.position) <= 6.0) {
            ally.takeDamage(20);
          }
        }
      }
    } else if (this.currentAttackType === 'charge') {
      this.state = 'charge';
      this.chargeDistanceLeft = 14.0;
    } else if (this.currentAttackType === 'throw') {
      // Spinning Cleaver Projectile boomerang
      if (projectilesManager) {
        const fromPos = this.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
        const facingYaw = this.mesh.rotation.y;
        const dir = new THREE.Vector3(Math.sin(facingYaw), 0, Math.cos(facingYaw)).normalize();
        projectilesManager.spawn({
          type: 'fireball', // or cleaver mesh
          from: fromPos,
          direction: dir,
          speed: 12.0,
          damage: 20,
          owner: 'enemy',
        });
      }
    }
  }

  applyShamanHeals() {
    let livingShamans = 0;
    for (const sh of this.shamans) {
      if (sh && !sh.dead) {
        livingShamans++;
        this.hp = Math.min(this.maxHp, this.hp + 10);
      }
    }
    if (livingShamans > 0) {
      showSystemMessage(`[Shamans channel dark vigor! +${livingShamans * 10} HP]`);
    }
  }

  die() {
    super.die();
    this.state = 'dead';
    this.stateTimer = 2.0; // Dissolves in 2 seconds

    if (this.tetherGroup && this.scene) {
      this.scene.remove(this.tetherGroup);
    }

    // Slow motion for 1.5s
    if (this.onBossDefeat) {
      this.onBossDefeat();
    }
  }

  dispose() {
    if (this.rig) {
      this.rig.dispose();
    }
    if (this.dizzyGroup) {
      this.dizzyGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }
    if (this.pinnedSpear) {
      if (this.pinnedSpear.geometry) this.pinnedSpear.geometry.dispose();
      if (this.pinnedSpear.material) this.pinnedSpear.material.dispose();
    }
    if (this.tetherGroup && this.scene) {
      this.scene.remove(this.tetherGroup);
    }
    for (const line of this.tetherLines) {
      if (line.geometry) line.geometry.dispose();
      if (line.material) line.material.dispose();
    }
    this.tetherLines = [];
  }
}
