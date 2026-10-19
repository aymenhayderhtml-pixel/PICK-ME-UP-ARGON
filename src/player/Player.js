import * as THREE from 'three';
import { getCombatStats } from '../core/Stats.js';
import { gameState } from '../core/GameState.js';
import { showSystemMessage } from '../ui/Hud.js';
import { addSkillExp } from '../data/skills.js';
import { playParrySound, calculateAttackAngle, spawnSparks } from '../combat/Combat.js';
import { spawnHitSparks, triggerShieldBlock, triggerParryFlash, spawnItemBreakShards, spawnBlockHitEffect } from '../fx/WeaponFX.js';
import { ITEM_TEMPLATES } from '../combat/Items.js';

import { HeroRig } from '../art/HeroRig.js';
import { PRESETS } from '../art/presets.js';

function canMoveTo(dungeon, x, z, r = 0.4) {
  if (!dungeon) return true;
  return (
    dungeon.isWalkable(x - r, z - r) &&
    dungeon.isWalkable(x + r, z - r) &&
    dungeon.isWalkable(x - r, z + r) &&
    dungeon.isWalkable(x + r, z + r)
  );
}

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();

    const hanHero = gameState?.heroes?.find((h) => h.id === 'hero_han');
    this.look = hanHero?.look || PRESETS.han;
    this.rig = new HeroRig(this.look);
    this.mesh.add(this.rig.group);
    this.mesh._heroRig = this.rig;

    // Soft circular blob shadow
    const shadowGeo = new THREE.CircleGeometry(0.45, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.y = 0.02;
    this.mesh.add(shadow);

    // 5. Footstep Dust Pool (20 reused meshes)
    this.dustPool = [];
    const dustGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    for (let i = 0; i < 20; i++) {
      const dustMat = new THREE.MeshBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.5,
      });
      const dustMesh = new THREE.Mesh(dustGeo, dustMat);
      dustMesh.visible = false;
      if (this.scene) this.scene.add(dustMesh);
      this.dustPool.push({
        mesh: dustMesh,
        life: 0,
        maxLife: 0.5,
        vy: 0.8,
      });
    }
    this.dustStepTimer = 0;

    // Movement & Physics
    this.mesh.position.set(0, 0, 0);
    this.velocityY = 0;
    this.isGrounded = true;
    this.walkSpeed = 5;
    this.sprintSpeed = 9;
    this.jumpVelocity = 7;
    this.gravity = 20;
    this.animTime = 0;

    // Combat Stats & Resources
    this.hp = 100;
    this.maxHp = 100;
    this.stamina = 100;
    this.maxStamina = 100;
    this.baseDamage = 14;
    this.staminaRegenDelay = 0;
    this.dead = false;
    this.damageDealt = 0;
    this.kills = 0;

    // Economy
    this.gold = 0;
    this.tickets = 0;

    // Equipment: initialized from Han's equipment in gameState if available
    const hanInitial = gameState?.heroes?.find((h) => h.id === 'hero_han');
    this.weapon = hanInitial?.equipment?.weapon || null;
    this.shield = hanInitial?.equipment?.offhand || null;
    this.armor = hanInitial?.equipment?.armor || null;
    this.rebuildWeaponMesh();

    // Combat Mechanics
    this.comboStep = 0;
    this.comboTimer = 0;
    this.swingAnimTimer = 0;
    this.attackTimer = 0;
    this.hitStop = 0;
    this.hitTimer = 0;
    this.deathTimer = 0;
    this.isMining = false;
    this.miningTimer = 0;
    this.isCheering = false;
    this.cheerTimer = 0;
    this.enemyNearby = 999;

    // Blocking & Parry
    this.isBlocking = false;
    this.blockTimer = 0;
    this.guardBreakTimer = 0;
    this.bashCooldown = 0;
    this.bashAnimTimer = 0;

    // Footwork Step (Double-tap movement key)
    this.footworkTimer = 0;
    this.footworkCooldown = 0;
    this.footworkDir = new THREE.Vector3();
    this.lastTapTimes = { KeyW: 0, KeyA: 0, KeyS: 0, KeyD: 0 };
    this.prevKeysDown = new Set();

    // Dodge Roll (Key Q only)
    this.isRolling = false;
    this.rollTimer = 0;
    this.rollCooldown = 0;
    this.rollDir = new THREE.Vector3(0, 0, 1);

    // Feedback
    this.invulnerableTimer = 0;
    this.flashRedTimer = 0;
    this.damageFlashTimer = 0;
    this.onParryText = null;

    this.refreshStats();
  }

  rebuildWeaponMesh() {
    this.rig.equip({ weapon: this.weapon, offhand: this.shield, armor: this.armor });
  }

  rebuildShieldMesh() {
    this.rig.equip({ weapon: this.weapon, offhand: this.shield, armor: this.armor });
  }

  equipWeapon(item) {
    this.weapon = item;
    this.rebuildWeaponMesh();
  }

  equipShield(item) {
    this.shield = item;
    this.rebuildShieldMesh();
  }

  refreshStats() {
    const han = gameState.heroes.find((h) => h.id === 'hero_han');
    const stats = getCombatStats(han, gameState.party, gameState.relations);
    this.maxHp = stats.maxHp;
    this.maxStamina = stats.maxStamina;
    this.baseDamage = stats.damage;
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;

    // Equip / visual updates
    if (han) {
      this.weapon = han.equipment?.weapon || null;
      this.shield = han.equipment?.offhand || null;
      this.armor = han.equipment?.armor || null;
      this.rebuildWeaponMesh();
      this.rebuildShieldMesh();
    }
  }

  performShieldBash(enemies, camera, onDamageNumber) {
    if (this.dead || this.guardBreakTimer > 0 || this.bashCooldown > 0 || this.stamina < 15 || !this.isBlocking) {
      return false;
    }

    const hasShield = this.shield && this.shield.durability > 0;
    if (!hasShield) return false;

    this.stamina -= 15;
    this.staminaRegenDelay = 1.0;
    this.bashCooldown = 1.0;
    this.bashAnimTimer = 0.2;

    // Short forward push (1.5 units)
    const fwdX = Math.sin(this.mesh.rotation.y);
    const fwdZ = Math.cos(this.mesh.rotation.y);
    const pushDist = 1.5;
    this.mesh.position.x += fwdX * pushDist;
    this.mesh.position.z += fwdZ * pushDist;

    if (camera) camera.shake(0.06, 0.15);
    spawnSparks(this.scene, this.mesh.position.clone().add(new THREE.Vector3(fwdX * 0.8, 1.0, fwdZ * 0.8)), 0x00bfff, 12);

    // Stagger enemies in front cone (110 deg, range 2.5) for 0.5s with 5 damage
    const minCos = Math.cos((55 * Math.PI) / 180);
    if (enemies) {
      for (const enemy of enemies) {
        if (enemy.dead || enemy.isDying) continue;
        const dx = enemy.mesh.position.x - this.mesh.position.x;
        const dz = enemy.mesh.position.z - this.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        const maxRange = enemy.isBoss ? 3.8 : 2.5;

        if (dist <= maxRange) {
          const dot = dist > 0.001 ? (fwdX * dx + fwdZ * dz) / dist : 1;
          if (dot >= minCos) {
            enemy.takeDamage(5);
            if (enemy.enterHesitate) {
              enemy.enterHesitate(0.5);
            }
            if (enemy.applyKnockback) {
              enemy.applyKnockback(fwdX, fwdZ, 8);
            }
            if (onDamageNumber) {
              onDamageNumber(5, enemy.mesh.position, false);
            }
          }
        }
      }
    }
    return true;
  }

  triggerFootwork(key, cameraYaw) {
    if (this.dead || this.isRolling || this.guardBreakTimer > 0 || this.footworkCooldown > 0 || this.stamina < 12) {
      return false;
    }

    this.stamina -= 12;
    this.staminaRegenDelay = 0.8;
    this.footworkCooldown = 0.5;
    this.footworkTimer = 0.15; // 0.15s duration

    const sinYaw = Math.sin(cameraYaw);
    const cosYaw = Math.cos(cameraYaw);

    let fx = 0;
    let fz = 0;
    if (key === 'KeyW' || key === 'ArrowUp') {
      fx = -sinYaw;
      fz = -cosYaw;
    } else if (key === 'KeyS' || key === 'ArrowDown') {
      fx = sinYaw;
      fz = cosYaw;
    } else if (key === 'KeyA' || key === 'ArrowLeft') {
      fx = -cosYaw;
      fz = sinYaw;
    } else if (key === 'KeyD' || key === 'ArrowRight') {
      fx = cosYaw;
      fz = -sinYaw;
    }

    const len = Math.hypot(fx, fz) || 1;
    this.footworkDir.set(fx / len, 0, fz / len);
    this.spawnFootstepDust();
    return true;
  }

  takeDamage(amount, camera, attackerPos = null, attackType = 'melee', attacker = null) {
    if (this.dead || this.isRolling) return { dodged: true };

    const han = gameState.heroes.find((h) => h.id === 'hero_han');
    const stats = getCombatStats(han, gameState.party, gameState.relations);

    // 1. Guard Break check: takes full damage while stunned
    if (this.guardBreakTimer > 0) {
      this.hp = Math.max(0, this.hp - amount);
      this.damageFlashTimer = 0.1;
      this.hitTimer = 0.25;
      this.rig.setTint(0xffffff, 0.8);
      if (camera) camera.shake(0.15, 0.2);
      if (this.hp <= 0) {
        this.dead = true;
        this.deathTimer = 0;
      }
      return { guardBroken: true, damage: amount };
    }

    // 2. Shield Block / Parry logic
    const hasShield = this.shield && this.shield.durability > 0;
    if (this.isBlocking && hasShield && attackerPos) {
      const angle = calculateAttackAngle(this.mesh.rotation.y, this.mesh.position, attackerPos);

      // A. Perfect Parry: raised in parryWindow (0.18s + skill bonus), angle <= 60 deg, not boss cleave/slam
      const parryWindow = stats.parryWindow || 0.18;
      const canParry = attackType !== 'boss_cleave' && attackType !== 'boss_slam';

      if (this.blockTimer <= parryWindow && angle <= 60) {
        if (canParry) {
          playParrySound();
          if (this.rig?.shieldModel) {
            triggerParryFlash(this.scene, this.rig.shieldModel);
          }
          spawnBlockHitEffect(this.scene, this.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)), camera);
          this.hitStop = 0.08;

          if (attacker && !attacker.dead) {
            if (attacker.enterHesitate) {
              attacker.enterHesitate(0.8);
            }
            attacker.staggerTimer = 0.8;
            attacker.isVulnerable = true;
          }

          if (this.onParryText) {
            this.onParryText('PARRY', attackerPos);
          }

          addSkillExp(han, 'basic_shield_technique', 5);
          showSystemMessage('[PERFECT PARRY!]');
          return { parried: true, damage: 0 };
        } else {
          showSystemMessage('[Unparriable!]');
          if (this.onParryText) {
            this.onParryText('UNPARRIABLE', attackerPos);
          }
        }
      }

      // B. Angled Deflection Block
      if (angle <= 90) {
        let reduction = 0.7; // < 60 deg: 70% reduced
        if (angle > 60) {
          reduction = 0.4; // 60 to 90 deg: 40% reduced
        }

        let reducedDmg = Math.round(amount * (1 - reduction));
        let staminaCost;

        if (attackType === 'boss_cleave') {
          staminaCost = 40;
          reducedDmg = Math.round(amount * 0.5);
        } else if (attackType === 'boss_slam') {
          staminaCost = amount * 1.0;
        } else {
          const mult = 1 + (stats.blockStaminaMult || 0);
          staminaCost = Math.round(amount * Math.max(0.2, mult));
        }

        // Shield loses 2 durability
        this.shield.durability -= 2;
        if (this.shield.durability <= 0) {
          const sGrade = this.shield.grade || 'E';
          spawnItemBreakShards(this.scene, this.mesh.position, sGrade);
          showSystemMessage(`[${this.shield.name} has broken!]`);
          this.shield = null;
          this.rebuildShieldMesh();
        }

        // Stamina check -> Guard Break
        if (this.stamina < staminaCost) {
          this.stamina = 0;
          this.guardBreakTimer = 1.2;
          showSystemMessage('[GUARD BROKEN!]');
          this.hp = Math.max(0, this.hp - amount);
          this.damageFlashTimer = 0.1;
          this.hitTimer = 0.25;
          this.rig.setTint(0xffffff, 0.8);
          if (camera) camera.shake(0.2, 0.3);
          if (this.hp <= 0) {
            this.dead = true;
            this.deathTimer = 0;
          }
          return { guardBroken: true, damage: amount };
        }

        // Successful block
        this.stamina -= staminaCost;
        this.staminaRegenDelay = 1.2;
        this.hp = Math.max(0, this.hp - reducedDmg);
        this.damageFlashTimer = 0.1;
        this.rig.setTint(0xffffff, 0.8);
        if (this.rig?.shieldModel) {
          triggerShieldBlock(this.rig.shieldModel, this.scene, this.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0)), camera);
        } else {
          spawnBlockHitEffect(this.scene, this.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)), camera);
        }
        if (camera) camera.shake(0.06, 0.15);

        addSkillExp(han, 'basic_shield_technique', 1);

        if (this.hp <= 0) {
          this.dead = true;
          this.deathTimer = 0;
        }
        return { blocked: true, damage: reducedDmg };
      }
    }

    // 3. Normal Damage
    if (this.invulnerableTimer > 0) return { invulnerable: true };
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableTimer = 0.5;
    this.damageFlashTimer = 0.1;
    this.hitTimer = 0.25;
    this.rig.setTint(0xffffff, 0.8);
    if (camera) camera.shake(0.15, 0.2);
    if (this.hp <= 0) {
      this.dead = true;
      this.deathTimer = 0;
    }
    return { damage: amount };
  }

  applyKnockback(dirX, dirZ, force = 6) {
    if (this.dead) return;
    this.mesh.position.x += dirX * (force * 0.15);
    this.mesh.position.z += dirZ * (force * 0.15);
  }

  startRoll(input, cameraYaw) {
    if (this.dead || this.isRolling || this.rollCooldown > 0 || this.stamina < 25 || this.guardBreakTimer > 0) {
      return false;
    }

    this.stamina -= 25;
    this.staminaRegenDelay = 0.8;
    this.isRolling = true;
    this.rollTimer = 0.35;
    this.rollCooldown = 0.8;

    // Direction from input or facing direction
    const forward = input ? input.isDown('KeyW') || input.isDown('ArrowUp') : false;
    const backward = input ? input.isDown('KeyS') || input.isDown('ArrowDown') : false;
    const left = input ? input.isDown('KeyA') || input.isDown('ArrowLeft') : false;
    const right = input ? input.isDown('KeyD') || input.isDown('ArrowRight') : false;

    const sinYaw = Math.sin(cameraYaw);
    const cosYaw = Math.cos(cameraYaw);
    let rx = 0;
    let rz = 0;

    if (forward) { rx -= sinYaw; rz -= cosYaw; }
    if (backward) { rx += sinYaw; rz += cosYaw; }
    if (left) { rx -= cosYaw; rz += sinYaw; }
    if (right) { rx += cosYaw; rz -= sinYaw; }

    if (Math.hypot(rx, rz) > 0.1) {
      this.rollDir.set(rx, 0, rz).normalize();
    } else {
      this.rollDir.set(sinYaw, 0, cosYaw).normalize();
    }

    return true;
  }

  attack(enemies, camera, onDamageNumber) {
    if (this.dead || this.isRolling || this.swingAnimTimer > 0 || this.stamina < 10 || this.guardBreakTimer > 0) {
      return;
    }

    // Shield Bash if blocking
    if (this.isBlocking) {
      this.performShieldBash(enemies, camera, onDamageNumber);
      return;
    }

    this.stamina -= 10;
    this.staminaRegenDelay = 0.8;

    // Advance combo step or reset
    if (this.comboTimer > 0) {
      this.comboStep = (this.comboStep + 1) % 3;
    } else {
      this.comboStep = 0;
    }
    this.comboTimer = 0.6;
    this.swingAnimTimer = 0.25;

    const han = gameState.heroes.find((h) => h.id === 'hero_han');
    const stats = getCombatStats(han, gameState.party, gameState.relations);
    const weaponMult = this.weapon && this.weapon.durability > 0 ? (this.weapon.damageMult || 1.0) : 0.4;
    const baseDmg = stats.damage * weaponMult;

    const isFinisher = this.comboStep === 2;
    const damage = isFinisher ? Math.round(baseDmg * 1.8) : Math.round(baseDmg);
    const knockbackForce = isFinisher ? 12 : 6;

    // Hitbox cone 110 degrees, range 2.6 units
    const facingYaw = this.mesh.rotation.y;
    const forwardX = Math.sin(facingYaw);
    const forwardZ = Math.cos(facingYaw);
    const minCos = Math.cos((55 * Math.PI) / 180);

    let hitAny = false;

    if (enemies) {
      for (const enemy of enemies) {
        if (enemy.dead || enemy.isDying) continue;

        const toEnemyX = enemy.mesh.position.x - this.mesh.position.x;
        const toEnemyZ = enemy.mesh.position.z - this.mesh.position.z;
        const dist = Math.hypot(toEnemyX, toEnemyZ);

        const maxRange = enemy.isBoss ? 4.2 : 2.6;
        if (dist <= maxRange) {
          const dot = dist > 0.001 ? (forwardX * toEnemyX + forwardZ * toEnemyZ) / dist : 1;
          if (dot >= minCos) {
            const actualDmg = enemy.takeDamage(damage, isFinisher, this.mesh.position) || damage;
            this.damageDealt = (this.damageDealt || 0) + actualDmg;
            if (enemy.dead || enemy.hp <= 0) this.kills = (this.kills || 0) + 1;
            if (enemy.applyKnockback) {
              const kx = dist > 0.001 ? toEnemyX / dist : forwardX;
              const kz = dist > 0.001 ? toEnemyZ / dist : forwardZ;
              enemy.applyKnockback(kx, kz, knockbackForce);
            }
            if (onDamageNumber) {
              onDamageNumber(actualDmg, enemy.mesh.position, isFinisher);
            }
            const wepGrade = (this.weapon && this.weapon.grade) || 'E';
            spawnHitSparks(this.scene, enemy.mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)), wepGrade);
            hitAny = true;
          }
        }
      }
    }

    if (hitAny) {
      this.hitStop = 0.05;
      if (this.rig && this.rig.onWeaponHit) {
        this.rig.onWeaponHit();
      }
      if (camera) {
        camera.shake(0.08, 0.12);
      }

      // Weapon durability cost: 1 per hit
      if (this.weapon && this.weapon.durability > 0) {
        this.weapon.durability -= 1;
        if (this.weapon.durability <= 0) {
          const wepGrade = this.weapon.grade || 'E';
          spawnItemBreakShards(this.scene, this.mesh.position, wepGrade);
          showSystemMessage(`[${this.weapon.name} has broken!]`);
          this.weapon = { id: 'bare_fists', name: 'Bare Fists', durability: 0, maxDurability: 0, damageMult: 0.4 };
          this.rebuildWeaponMesh();
        }
      }

      // Skill XP: Basic Swordsmanship
      if (this.weapon && this.weapon.type === 'sword') {
        addSkillExp(han, 'basic_swordsmanship', 1);
      }
    }
  }

  breakWeapon() {
    if (!this.weapon || this.weapon.id === 'bare_fists') return;
    const wepGrade = this.weapon.grade || 'E';
    spawnItemBreakShards(this.scene, this.mesh.position, wepGrade);
    showSystemMessage(`[${this.weapon.name} has broken!]`);
    this.weapon = { id: 'bare_fists', name: 'Bare Fists', durability: 0, maxDurability: 0, damageMult: 0.4 };
    this.rebuildWeaponMesh();
  }

  spawnFootstepDust() {
    for (const d of this.dustPool) {
      if (!d.mesh.visible) {
        d.mesh.visible = true;
        d.mesh.position.copy(this.mesh.position);
        d.mesh.position.y = 0.08;
        d.mesh.scale.set(1, 1, 1);
        d.life = d.maxLife;
        break;
      }
    }
  }

  update(delta, input, cameraYaw, dungeon, camera) {
    this.animTime += delta;

    // 1. Guard Break Stun
    if (this.guardBreakTimer > 0) {
      this.guardBreakTimer -= delta;
      this.rig.update(delta, { action: 'hit', actionTime: 0.2, mood: 'pain' });
      return;
    }

    // Cooldown timers
    if (this.comboTimer > 0) this.comboTimer -= delta;
    if (this.rollCooldown > 0) this.rollCooldown -= delta;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= delta;
    if (this.bashCooldown > 0) this.bashCooldown -= delta;
    if (this.bashAnimTimer > 0) this.bashAnimTimer -= delta;
    if (this.footworkCooldown > 0) this.footworkCooldown -= delta;
    if (this.hitTimer > 0) this.hitTimer -= delta;
    if (this.attackTimer > 0) this.attackTimer -= delta;

    // Tints: Damage flash > Poison > Severe Stress > default
    const han = gameState.heroes.find((h) => h.id === 'hero_han');
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= delta;
      this.rig.setTint(0xffffff, 0.8);
    } else if (this.isPoisoned) {
      this.rig.setTint(0x4fbf3a, 0.3);
    } else if (han && han.stress >= 80) {
      this.rig.setTint(0x2a1a3a, 0.25);
    } else {
      this.rig.setTint(null, 0);
    }

    // Footstep dust updates
    for (const d of this.dustPool) {
      if (d.mesh.visible) {
        d.life -= delta;
        d.mesh.position.y += d.vy * delta;
        const progress = Math.max(0, d.life / d.maxLife);
        d.mesh.scale.set(progress, progress, progress);
        if (d.life <= 0) {
          d.mesh.visible = false;
        }
      }
    }

    // Dead player skips movement
    if (this.dead) {
      this.deathTimer = (this.deathTimer || 0) + delta;
      this.rig.update(delta, { action: 'death', actionTime: Math.min(1.6, this.deathTimer), mood: 'dead' });
      return;
    }

    // 2. Footwork Step Movement (Double-tap movement key: 3 units in 0.15s)
    if (this.footworkTimer > 0) {
      this.footworkTimer -= delta;
      const stepSpeed = 20.0;
      const nextX = this.mesh.position.x + this.footworkDir.x * stepSpeed * delta;
      const nextZ = this.mesh.position.z + this.footworkDir.z * stepSpeed * delta;

      if (canMoveTo(dungeon, nextX, this.mesh.position.z, 0.4)) {
        this.mesh.position.x = nextX;
      }
      if (canMoveTo(dungeon, this.mesh.position.x, nextZ, 0.4)) {
        this.mesh.position.z = nextZ;
      }
      return;
    }

    // 3. Dodge Roll Movement
    if (this.isRolling) {
      this.rollTimer -= delta;
      this.rollTimeElapsed = (this.rollTimeElapsed || 0) + delta;
      const rollSpeed = 12;
      const nextX = this.mesh.position.x + this.rollDir.x * rollSpeed * delta;
      const nextZ = this.mesh.position.z + this.rollDir.z * rollSpeed * delta;

      if (canMoveTo(dungeon, nextX, this.mesh.position.z, 0.4)) {
        this.mesh.position.x = nextX;
      }
      if (canMoveTo(dungeon, this.mesh.position.x, nextZ, 0.4)) {
        this.mesh.position.z = nextZ;
      }

      this.mesh.rotation.y = Math.atan2(this.rollDir.x, this.rollDir.z);
      this.rig.update(delta, { action: 'roll', actionTime: Math.min(0.4, this.rollTimeElapsed) });

      if (this.rollTimer <= 0) {
        this.isRolling = false;
        this.rollTimeElapsed = 0;
      }
      return;
    }

    // 4. Double-tap detection on movement keys
    if (input) {
      const moveKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
      for (const k of moveKeys) {
        const isDown = input.isDown(k);
        const wasDown = this.prevKeysDown.has(k);
        if (isDown && !wasDown) {
          const now = performance.now() * 0.001;
          if (now - (this.lastTapTimes[k] || 0) < 0.28) {
            this.triggerFootwork(k, cameraYaw);
          }
          this.lastTapTimes[k] = now;
        }
        if (isDown) this.prevKeysDown.add(k);
        else this.prevKeysDown.delete(k);
      }
    }

    // 5. Shield Block State (Hold RMB)
    const hasShield = this.shield && this.shield.durability > 0;
    const rmbDown = input && input.isRmbDown ? input.isRmbDown() : false;

    if (rmbDown && hasShield) {
      if (!this.isBlocking) {
        this.isBlocking = true;
        this.blockTimer = 0;
      }
      this.blockTimer += delta;

      // Face camera look direction while blocking
      this.mesh.rotation.y = cameraYaw + Math.PI;
    } else {
      this.isBlocking = false;
      this.blockTimer = 0;
    }

    // 6. Normal Movement Handling (WASD only)
    const forward = input ? input.isDown('KeyW') : false;
    const backward = input ? input.isDown('KeyS') : false;
    const left = input ? input.isDown('KeyA') : false;
    const right = input ? input.isDown('KeyD') : false;
    let isSprinting = input ? input.isDown('ShiftLeft') || input.isDown('ShiftRight') : false;

    const sinYaw = Math.sin(cameraYaw);
    const cosYaw = Math.cos(cameraYaw);
    let moveX = 0;
    let moveZ = 0;

    if (forward) { moveX -= sinYaw; moveZ -= cosYaw; }
    if (backward) { moveX += sinYaw; moveZ += cosYaw; }
    if (left) { moveX -= cosYaw; moveZ += sinYaw; }
    if (right) { moveX += cosYaw; moveZ -= sinYaw; }

    const moveLength = Math.hypot(moveX, moveZ);
    const isMoving = moveLength > 0.05;

    // Sprinting stamina drain (8 stamina per second)
    if (isSprinting && isMoving && !this.isBlocking && this.stamina > 0) {
      this.stamina = Math.max(0, this.stamina - 8 * delta);
      if (this.stamina === 0) isSprinting = false;
    } else if (this.stamina <= 0) {
      isSprinting = false;
    }

    // Stamina regeneration
    if (this.isBlocking || isSprinting) {
      this.staminaRegenDelay = 0.5;
    } else if (this.staminaRegenDelay > 0) {
      this.staminaRegenDelay -= delta;
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + 25 * delta);
    }

    if (isMoving) {
      moveX /= moveLength;
      moveZ /= moveLength;

      let speed = isSprinting ? this.sprintSpeed : this.walkSpeed;
      if (this.isBlocking) {
        speed = this.walkSpeed * 0.5; // Blocking movement speed x0.5
      }

      const nextX = this.mesh.position.x + moveX * speed * delta;
      const nextZ = this.mesh.position.z + moveZ * speed * delta;

      if (canMoveTo(dungeon, nextX, this.mesh.position.z, 0.4)) {
        this.mesh.position.x = nextX;
      }
      if (canMoveTo(dungeon, this.mesh.position.x, nextZ, 0.4)) {
        this.mesh.position.z = nextZ;
      }

      if (!this.isBlocking) {
        const targetRotation = Math.atan2(moveX, moveZ);
        let diff = targetRotation - this.mesh.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.mesh.rotation.y += diff * Math.min(1, 14 * delta);
      }

      this.dustStepTimer += delta;
      if (this.dustStepTimer >= 0.25) {
        this.dustStepTimer = 0;
        this.spawnFootstepDust();
      }
    }

    // Determine animation pose and mood
    let action = 'none';
    let actionTime = 0;
    let mood = (this.enemyNearby <= 10) ? 'angry' : 'neutral';

    if (this.attackTimer > 0) {
      const aPose = this.comboStep === 2 ? 'attack3' : (this.comboStep === 1 ? 'attack2' : 'attack1');
      action = aPose;
      actionTime = 0.5 - Math.max(0, this.attackTimer);
      mood = 'angry';
    } else if (this.isBlocking) {
      action = 'block';
      actionTime = this.blockTimer;
    } else if (this.hitTimer > 0) {
      action = 'hit';
      actionTime = 0.25 - Math.max(0, this.hitTimer);
      mood = 'pain';
    } else if (this.isMining) {
      action = 'mine';
      actionTime = this.miningTimer || 0;
    } else if (this.isCheering) {
      this.cheerTimer = (this.cheerTimer || 0) + delta;
      action = 'cheer';
      actionTime = this.cheerTimer;
      mood = 'happy';
    }

    const currentSpeed = isMoving ? (isSprinting ? this.sprintSpeed : this.walkSpeed) : 0;
    this.rig.update(delta, {
      moving: isMoving,
      speed: currentSpeed,
      sprinting: isSprinting,
      action,
      actionTime,
      mood,
    });

    // Jump
    if (this.isGrounded && input && input.isDown('Space')) {
      this.velocityY = this.jumpVelocity;
      this.isGrounded = false;
    }

    // Gravity
    const groundY = (dungeon && typeof dungeon.getGroundY === 'function')
      ? dungeon.getGroundY(this.mesh.position.x, this.mesh.position.z)
      : 0;

    if (!this.isGrounded || this.mesh.position.y > groundY) {
      this.velocityY -= this.gravity * delta;
      this.mesh.position.y += this.velocityY * delta;

      if (this.mesh.position.y <= groundY) {
        this.mesh.position.y = groundY;
        this.velocityY = 0;
        this.isGrounded = true;
      }
    } else {
      this.mesh.position.y = groundY;
    }
  }
}
