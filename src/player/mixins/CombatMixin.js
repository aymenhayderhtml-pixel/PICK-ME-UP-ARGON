import * as THREE from 'three';
import { getCombatStats } from '../../core/Stats.js';
import { gameState } from '../../core/GameState.js';
import { showSystemMessage } from '../../ui/Hud.js';
import { addSkillExp } from '../../data/skills.js';
import { playParrySound, calculateAttackAngle, spawnSparks } from '../../combat/Combat.js';
import { spawnHitSparks, triggerShieldBlock, triggerParryFlash, spawnItemBreakShards, spawnBlockHitEffect } from '../../fx/WeaponFX.js';
import { combatEvents } from '../../combat/CombatEvents.js';

export const CombatMixin = (Base) => class extends Base {
  receiveAttack(hitPayload) {
    if (this.dead || this.isRolling) return { dodged: true };
    const dmg = hitPayload?.damage ?? hitPayload?.rawDamage ?? 0;
    const wasCastingUltimate = this.isCastingUltimate;

    const res = this.takeDamage(dmg, null, hitPayload?.attackerPosition);

    if (wasCastingUltimate && res && res.damage > 0) {
      const damageTaken = (this.ultimateHpAtStart || this.hp) - this.hp;
      if (damageTaken > (0.15 * this.maxHp)) {
        this.isCastingUltimate = false;
        this.isCasting = false;
        this.currentSpell = null;
        const manaLost = Math.round(this.maxMana * 0.50);
        this.mana = Math.max(0, this.mana - manaLost);
        this.guardBreakTimer = 1.2;
        combatEvents.emit('onCastInterrupted', {
          combatant: this,
          manaLost,
          reason: 'Damage exceeded 15% max HP during cast',
        });
        showSystemMessage('[Solar Cataclysm INTERRUPTED! Lost 50% Mana!]');
      }
    }
    return res;
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

  takeDamage(amount, camera, attackerPos = null, attackType = 'melee', attacker = null) {
    if (this.dead || this.isRolling) return { dodged: true };

    const hero = this.getHero();
    const stats = getCombatStats(hero, gameState.party, gameState.relations);

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
    const hasShield = Boolean(this.loadout?.canBlock) && this.shield && this.shield.durability > 0;
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

          addSkillExp(hero, 'basic_shield_technique', 5);
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

        addSkillExp(hero, 'basic_shield_technique', 1);

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

    // Bleeding chance
    if (amount >= this.maxHp * 0.1 && Math.random() < 0.3) {
      this.bleedingTimer = 8;
      const hero = this.getHero();
      showSystemMessage(`${(hero?.name || 'HAN').toUpperCase()} (★) HAS BEEN INFLICTED WITH BLEEDING. HIS HP WILL BE REDUCED FOR A PERIOD OF TIME.`);
    }
    // Brink of Death
    if (this.hp > 0 && this.hp < this.maxHp * 0.2 && !this.brinkNotified) {
      this.brinkNotified = true;
      const hero = this.getHero();
      showSystemMessage(`${(hero?.name || 'HAN').toUpperCase()} (★) IS ON THE BRINK OF DEATH. HIS LIFE IS IN DANGER!`);
    }
    // Crisis Soul Awakening
    if (this.hp > 0 && this.hp < this.maxHp * 0.25 && !this.crisisAwakened) {
      this.crisisAwakened = true;
      showSystemMessage("THE HEROES' SOULS ARE BEING AWAKENED IN THE SITUATION THAT TESTS THE HEROES' LIMITS!");
      const hero = this.getHero();
      if (hero) {
        hero.skills = hero.skills || [];
        const findSk = (id) => hero.skills.find((s) => String(typeof s === 'string' ? s : (s.id || s.name || '')).toLowerCase().replace(/\s+/g, '_') === id);
        for (const id of ['basic_sword', 'pain_tolerance', 'composure']) {
          const sk = findSk(id);
          if (sk) sk.exp = (sk.exp || 0) + 50;
        }
        const bs = findSk('basic_sword') || findSk('basic_swordsmanship');
        if (bs && (bs.level || 1) >= 3 && !findSk('quick_movements')) {
          hero.skills.push({ id: 'quick_movements', name: 'Quick Movements', level: 1, exp: 0 });
          showSystemMessage("SKILL AWAKENED! 'BASIC SWORDSMANSHIP' HAS LEVELLED UP TO LV.3! YOU'VE LEARNED 'QUICK MOVEMENTS'!");
        }
        if (hero.id === 'hero_han' && !findSk('berserk')) {
          hero.skills.push({ id: 'berserk', name: 'Berserk', level: 1, exp: 0 });
          showSystemMessage("SKILL AWAKENED! HAN (★) HAS OBTAINED THE SKILL, 'BERSERK'!");
          this.berserkActive = true;
        }
      }
    }

    if (this.hp <= 0) {
      this.dead = true;
      this.deathTimer = 0;
    }
    return { damage: amount };
  }

  // Shield Bash fallback
  shieldBash(enemy) {
    if (!this.shield) return;
    showSystemMessage("IF SWORDS DON'T WORK, THEN USE THE SHIELD!");
    if (enemy && typeof enemy.takeDamage === 'function') {
      enemy.takeDamage(this.baseDamage * 0.8, false, this.mesh.position);
    }
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

    // Bow attacks: bypass melee cone
    if (this.loadout?.attackMode === 'bow') {
      if (this.isAiming) {
        if (this.drawAmount >= 0.15) {
          this.releaseAimedArrow(enemies, camera, onDamageNumber);
        }
      } else {
        this.triggerHipfireSnapshot(enemies, camera, onDamageNumber);
      }
      return;
    }

    // Staff attacks: quick cast Ember Bolt
    if (this.loadout?.attackMode === 'spell') {
      if (!this.isCasting && !this.channeledSpell) {
        this.castSpell('emberBolt');
      }
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
    const aPose = this.comboStep === 2 ? 'attack3' : (this.comboStep === 1 ? 'attack2' : 'attack1');
    const atkSpec = this.rig?.getActiveAttackSpec ? this.rig.getActiveAttackSpec(aPose) : null;
    const duration = atkSpec?.duration || 0.48;
    this.attackDuration = duration;
    this.attackTimer = duration;
    this.comboTimer = duration + 0.18;
    this.swingAnimTimer = duration;

    const hero = this.getHero();
    const stats = getCombatStats(hero, gameState.party, gameState.relations);
    const weaponMult = this.weapon && this.weapon.durability > 0 ? (this.weapon.damageMult || 1.0) : 0.4;
    const baseDmg = stats.damage * weaponMult * (this.berserkActive ? 1.5 : 1);

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
      const hitStopDur = atkSpec?.hitStop || 0.05;
      this.hitStop = hitStopDur;
      if (this.rig && this.rig.triggerHitStop) {
        this.rig.triggerHitStop(hitStopDur);
      }
      if (this.rig && this.rig.onWeaponHit) {
        this.rig.onWeaponHit();
      }
      const shakeAmt = atkSpec?.cameraShake || 0.08;
      if (camera && camera.shake) {
        camera.shake(shakeAmt, 0.12);
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
        addSkillExp(hero, 'basic_swordsmanship', 1);
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
};