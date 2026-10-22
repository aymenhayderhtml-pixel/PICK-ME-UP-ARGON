import * as THREE from 'three';
import { getCombatStats } from '../core/Stats.js';
import { gameState } from '../core/GameState.js';
import { showSystemMessage } from '../ui/Hud.js';
import { showHeroDeathNotice } from '../ui/Notices.js';
import { spawnSparks } from './Combat.js';
import { HeroRig } from '../art/HeroRig.js';
import { generateLook } from '../art/looks.js';
import { getHeroLoadout } from '../core/loadout.js';

export class Ally {
  constructor(scene, heroData, isNovice = false, slotIndex = 0) {
    this.scene = scene;
    this.hero = heroData;
    this.isNovice = isNovice;
    this.slotIndex = slotIndex;

    this.mesh = new THREE.Group();
    this.dead = false;
    this.isDying = false;
    this.deathTimer = 0;
    this.damageDealt = 0;
    this.kills = 0;
    this.isMoving = false;
    this.damageFlashTimer = 0;
    this.isCheering = false;
    this.cheerTimer = 0;
    this.berserkAuraLight = null;
    this.berserkAuraMesh = null;

    this.bleedingTimer = 0;
    this.brinkNotified = false;
    this.crisisAwakened = false;
    this.berserkActive = false;

    // Determine weapon & role
    const weaponStr = (heroData.weapon || '').toLowerCase();
    const classStr = (heroData.class || '').toLowerCase();

    if (weaponStr.includes('spear')) {
      this.role = 'spear';
    } else if (weaponStr.includes('bow') || classStr.includes('scout') || classStr.includes('archer')) {
      this.role = 'scout';
    } else if (weaponStr.includes('greatsword') || classStr.includes('berserk')) {
      this.role = 'berserker';
    } else if (weaponStr.includes('staff') || weaponStr.includes('wand') || classStr.includes('mage')) {
      this.role = 'mage';
    } else {
      this.role = 'vanguard';
    }

    // Stats
    const stats = getCombatStats(heroData, gameState.party, gameState.relations);
    this.maxHp = stats.maxHp;
    this.hp = this.maxHp;
    this.baseDamage = stats.damage;
    this.moveSpeed = stats.moveSpeed || 5.0;
    this.attackRange = this.role === 'spear' ? 3.2 : this.role === 'scout' ? 9.0 : this.role === 'mage' ? 9.5 : 2.2;
    this.attackCooldown = 0;

    // Volunteer buff: +15% combat stats for the stage when deployed as a volunteer
    this.volunteerBuffActive = !!heroData.volunteerBuffActive;
    if (this.volunteerBuffActive) {
      this.maxHp = Math.round(this.maxHp * 1.15);
      this.hp = this.maxHp;
      this.baseDamage = Math.round(this.baseDamage * 1.15 * 10) / 10;
      this.moveSpeed = this.moveSpeed * 1.15;
    }

    // Eagle's Eye: ranged damage/crit bonus for bow/ranged allies
    const hasEaglesEye = (heroData.skills || []).some(
      (s) => String(typeof s === 'string' ? s : (s.id || s.name || '')).toLowerCase().replace(/\s+/g, '_') === 'eagles_eye'
    );
    if (hasEaglesEye && (this.role === 'scout' || (heroData.weapon || '').toLowerCase().includes('bow'))) {
      const lvl = (heroData.skills || []).find((s) => String(typeof s === 'string' ? s : (s.id || s.name || '')).toLowerCase().replace(/\s+/g, '_') === 'eagles_eye');
      const level = lvl && typeof lvl === 'object' ? (lvl.level || 1) : 1;
      this.baseDamage = Math.round(this.baseDamage * (1 + 0.1 * level) * 10) / 10;
      this.critBonus = (this.critBonus || 0) + 0.05 * level;
    }
    this.attackAnimTimer = 0;
    this.pinCooldown = 0;

    // Composure & Panic
    this.baseComposure = this.calcBaseComposure(heroData, isNovice);
    this.effectiveComposure = this.baseComposure;
    this.isPanicking = false;
    this.panicFreezeTimer = 0;
    this.panicRunTimer = 0;
    this.shakingTimer = 0;

    // Fear State
    this.isAfraid = false;
    this.fearTimer = 0;
    this.fearThreat = null;
    this.fearCheckTimer = 1.0 + Math.random() * 2.0;
    this.isFleeing = false;

    // Movement & Animation
    this.animTime = Math.random() * 10;
    this.flinchTimer = 0;
    this.targetPos = new THREE.Vector3();
    this.targetEnemy = null;

    // Build 3D Mesh
    this.buildMesh(heroData);
    this.buildHealthBar();
    if (this.scene) this.scene.add(this.mesh);
  }

  calcBaseComposure(hero, isNovice) {
    if (isNovice) return 20;
    const wil = hero.stats?.wil || 5;
    const level = hero.level || 1;
    const hasComposure = (hero.talents || []).some((t) => t.toLowerCase() === 'composure');

    let skillSum = 0;
    const skills = hero.skills || [];
    if (skills.length > 0) {
      for (const s of skills) skillSum += s.level || 1;
      skillSum /= skills.length;
    }
    const val = 40 + wil * 3 + level * 2 + (hasComposure ? 30 : 0) + 10 * skillSum;
    return Math.max(0, Math.min(100, Math.round(val)));
  }

  buildMesh(hero) {
    const look = hero.look || generateLook(hero);
    this.rig = new HeroRig(look);
    this.mesh.add(this.rig.group);
    this.mesh._heroRig = this.rig;

    this.applyLoadout();
  }

  /**
   * Equips the hero's own gear. When the hero carries nothing usable the
   * class default loadout is used so the squad member is never empty handed.
   */
  applyLoadout() {
    if (!this.rig) return;
    const loadout = getHeroLoadout(this.hero);
    this.loadout = loadout;

    let weapon = loadout.weapon;
    let offhand = loadout.offhandType === 'none' ? null : loadout.offhand;

    if (loadout.weaponType === 'none') {
      const profile = loadout.profile;
      const weaponType = profile ? profile.defaultWeaponType : 'sword';
      const offhandType = profile ? profile.defaultOffhandType : 'shield';
      weapon = { weaponType, grade: 'D' };
      offhand = offhandType === 'shield' ? { weaponType: 'shield', grade: 'E' } : null;
    }

    this.rig.equip({ weapon, offhand, armor: loadout.armor });
  }

  buildHealthBar() {
    this.barGroup = new THREE.Group();
    this.barGroup.position.set(0, 1.85, 0);

    // Background bar
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.08), bgMat);
    this.barGroup.add(bgMesh);

    // HP Fill
    this.fillMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    this.fillMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.06), this.fillMat);
    this.fillMesh.position.z = 0.005;
    this.barGroup.add(this.fillMesh);

    // Panic indicator mesh (!?)
    const panicMat = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.0 });
    this.panicMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.02), panicMat);
    this.panicMesh.position.set(0, 0.22, 0);
    this.barGroup.add(this.panicMesh);

    this.mesh.add(this.barGroup);
  }

  triggerPanic() {
    if (this.dead || this.isPanicking) return;
    this.isPanicking = true;
    this.panicFreezeTimer = 1.5;
    this.panicRunTimer = 4.0;
    this.panicMesh.material.opacity = 1.0;
    showSystemMessage(`[${this.hero.name} panicked!]`);
  }

  takeDamage(amount, attacker = null) {
    if (this.dead) return 0;

    // Check lethal damage save: +6 intimacy when one hero's skill saves another from lethal damage
    if (amount >= this.hp && this.squadAI && this.squadAI.allies && !this.__savedFromLethal) {
      const savior = this.squadAI.allies.find(
        (a) => a !== this && !a.dead && a.hp > 25 &&
        a.mesh.position.distanceTo(this.mesh.position) <= 6.0 &&
        (a.hero.skills || []).some((s) => s.id === 'knights_determination' || s.id === 'basic_shield_technique')
      );
      if (savior) {
        this.__savedFromLethal = true;
        savior.hp = Math.max(1, savior.hp - Math.floor(amount * 0.5));
        showSystemMessage(`[${savior.hero.name.toUpperCase()} PROTECTED ${this.hero.name.toUpperCase()} FROM LETHAL DAMAGE!]`);
        gameState.addIntimacy(savior.hero.id, this.hero.id, 6);
        return 0;
      }
    }

    this.hp = Math.max(0, this.hp - amount);
    this.flinchTimer = 0.25;
    this.damageFlashTimer = 0.1;
    this.rig.setTint(0xffffff, 0.8);

    // Bleeding chance on heavy slash/bite
    if (amount >= this.maxHp * 0.1 && Math.random() < 0.3) {
      this.bleedingTimer = 8;
      showSystemMessage(`${(this.hero.name || '').toUpperCase()} (★) HAS BEEN INFLICTED WITH BLEEDING. HIS HP WILL BE REDUCED FOR A PERIOD OF TIME.`);
    }

    // Brink of Death warning
    if (this.hp > 0 && this.hp < this.maxHp * 0.2 && !this.brinkNotified) {
      this.brinkNotified = true;
      showSystemMessage(`${(this.hero.name || '').toUpperCase()} (★) IS ON THE BRINK OF DEATH. HIS LIFE IS IN DANGER!`);
    }

    // Crisis Soul Awakening
    if (this.hp > 0 && this.hp < this.maxHp * 0.25 && !this.crisisAwakened) {
      this.crisisAwakened = true;
      showSystemMessage("THE HEROES' SOULS ARE BEING AWAKENED IN THE SITUATION THAT TESTS THE HEROES' LIMITS!");
      const skills = this.hero.skills || [];
      const findSk = (id) => skills.find((s) => String(typeof s === 'string' ? s : (s.id || s.name || '')).toLowerCase().replace(/\s+/g, '_') === id);
      for (const id of ['basic_sword', 'pain_tolerance', 'composure']) {
        const sk = findSk(id);
        if (sk) sk.exp = (sk.exp || 0) + 50;
      }
      const bs = findSk('basic_sword') || findSk('basic_swordsmanship');
      if (bs && (bs.level || 1) >= 3 && !findSk('quick_movements')) {
        skills.push({ id: 'quick_movements', name: 'Quick Movements', level: 1, exp: 0 });
        showSystemMessage("SKILL AWAKENED! 'BASIC SWORDSMANSHIP' HAS LEVELLED UP TO LV.3! YOU'VE LEARNED 'QUICK MOVEMENTS'!");
      }
      if (this.hero.id === 'hero_han' && !findSk('berserk')) {
        skills.push({ id: 'berserk', name: 'Berserk', level: 1, exp: 0 });
        showSystemMessage("SKILL AWAKENED! HAN (★) HAS OBTAINED THE SKILL, 'BERSERK'!");
        this.berserkActive = true;
      }
    }

    // Panic trigger on low HP (< 30%)
    if (this.hp <= this.maxHp * 0.3 && this.effectiveComposure < 45 && !this.isPanicking) {
      this.triggerPanic();
    }

    if (this.hp <= 0) {
      this.die();
    }
    return amount;
  }

  die(deathCause = null) {
    if (this.dead) return;
    this.dead = true;
    this.isDying = true;
    this.deathTimer = 0;
    this.barGroup.visible = false;
    this.deathCause = deathCause;

    showHeroDeathNotice(this.hero, deathCause || 'Killed in battle');
    spawnSparks(this.scene, this.mesh.position, 0xaaaaaa, 16);

    gameState.killHero(this.hero.id, gameState.currentFloor || 1, deathCause);

    // Record in fallenHeroes for DIED IN BATTLE card
    gameState.fallenHeroes = gameState.fallenHeroes || [];
    if (!gameState.fallenHeroes.some((h) => h.id === this.hero.id)) {
      gameState.fallenHeroes.push(this.hero);
    }

    // Stress rise: +25 to each surviving party hero when an ally dies
    for (const partyEntry of (gameState.party || [])) {
      const pId = typeof partyEntry === 'string' ? partyEntry : partyEntry.id;
      if (pId && pId !== this.hero.id) {
        gameState.addStress(pId, 25);
      }
    }

    // Intimacy loss: -10 if an ally fled while another died
    if (this.squadAI && this.squadAI.allies) {
      for (const a of this.squadAI.allies) {
        if (a !== this && !a.dead && a.isFleeing) {
          gameState.addIntimacy(a.hero.id, this.hero.id, -10);
        }
      }
    }
  }

  update(delta, player, enemies, dungeon, camera, projectilesManager, squadCommand, activeDeadCount) {
    // Bleeding drain
    if (this.bleedingTimer > 0) {
      this.bleedingTimer = Math.max(0, this.bleedingTimer - delta);
      this.hp = Math.max(1, this.hp - delta * (this.maxHp * 0.02));
      // Staunch if player nearby
      if (player && player.mesh && this.mesh.position.distanceTo(player.mesh.position) < 2.5) {
        this.bleedingTimer = 0;
        showSystemMessage(`STOPPED ${this.hero.name.toUpperCase()}'S BLEEDING!`);
      }
    }

    if (this.dead) {
      this.deathTimer += delta;
      this.rig.update(delta, { action: 'death', actionTime: Math.min(1.6, this.deathTimer), mood: 'dead' });
      if (this.deathTimer > 4.0) {
        const fadeAlpha = Math.max(0, 1 - (this.deathTimer - 4.0) / 2.0);
        this.rig.setOpacity(fadeAlpha);
        if (fadeAlpha <= 0) {
          this.mesh.visible = false;
        }
      }
      return;
    }
    this.animTime += delta;

    // Tints: Damage flash > Afraid > Severe Stress > default
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= delta;
      this.rig.setTint(0xffffff, 0.8);
    } else if (this.isAfraid) {
      this.rig.setTint(0x7a4fd0, 0.35);
    } else if (this.hero && (this.hero.stress || 0) >= 80) {
      this.rig.setTint(0x2a1a3a, 0.25);
    } else {
      this.rig.setTint(null, 0);
    }

    // 1. Billboarding HP bar to face camera
    if (camera) {
      this.barGroup.quaternion.copy(camera.quaternion);
    }

    // Update HP bar fill width
    const pct = Math.max(0, this.hp / this.maxHp);
    this.fillMesh.scale.x = pct;
    this.fillMesh.position.x = -(1 - pct) * 0.39;
    this.fillMat.color.setHex(pct > 0.5 ? 0x00e5ff : pct > 0.25 ? 0xffaa00 : 0xff3333);

    // 2. Flinch recovery
    if (this.flinchTimer > 0) {
      this.flinchTimer -= delta;
    }

    // 3. Fear State & Check
    const isHan = this.hero.id === 'hero_han';
    const hasComposureTalent = (this.hero.talents || []).some(
      (t) => String(t).toLowerCase() === 'composure'
    );
    const hasComposureSkill = (this.hero.skills || []).some(
      (s) => String(typeof s === 'string' ? s : (s.id || s.name || '')).toLowerCase().replace(/\s+/g, '_') === 'composure'
    );
    const isImmuneToFear = isHan || hasComposureTalent || hasComposureSkill;

    if (!isImmuneToFear) {
      if (this.isAfraid) {
        // Slap / Snap out of it: player (or interaction) within close range clears fear
        if (player && player.mesh) {
          const distToPlayer = this.mesh.position.distanceTo(player.mesh.position);
          if (distToPlayer <= 3.0) {
            this.isAfraid = false;
            this.isFleeing = false;
            this.fearTimer = 0;
            this.fearThreat = null;
            showSystemMessage(`[${this.hero.name} snapped out of fear!]`);
          }
        }
        if (this.isAfraid) {
          this.fearTimer -= delta;
          this.shakingTimer += delta * 30;
          this.mesh.position.x += Math.sin(this.shakingTimer) * 0.035;

          // Check if fear ends: 20s expired or threat enemy defeated
          const threatDead = this.fearThreat && (this.fearThreat.dead || this.fearThreat.isDying);
          if (this.fearTimer <= 0 || threatDead) {
            this.isAfraid = false;
            this.isFleeing = false;
            this.fearThreat = null;
            showSystemMessage(`[${this.hero.name} has overcome their fear.]`);
          }
        }
      } else {
        this.fearCheckTimer -= delta;
        if (this.fearCheckTimer <= 0) {
          this.fearCheckTimer = 2.5;
          if (this.effectiveComposure < 60) {
            const livingEnemies = (enemies || []).filter((e) => !e.dead && !e.isDying);
            const heroLevel = this.hero.level || 1;
            let nearbyAttackers = 0;
            let detectedThreat = null;

            for (const e of livingEnemies) {
              const dist = this.mesh.position.distanceTo(e.mesh.position);
              if (dist <= 16.0) {
                if (e.isBoss) {
                  detectedThreat = e;
                  break;
                }
                if ((e.level || 1) >= heroLevel + 2) {
                  detectedThreat = e;
                  break;
                }
                if (dist <= 10.0) {
                  nearbyAttackers++;
                }
              }
            }
            if (!detectedThreat && nearbyAttackers >= 4) {
              detectedThreat = livingEnemies[0];
            }

            if (detectedThreat) {
              const roll = Math.random() * 100;
              if (this.effectiveComposure < roll) {
                this.isAfraid = true;
                this.fearTimer = 20.0;
                this.fearThreat = detectedThreat;
                showSystemMessage(`[${this.hero.name} is paralyzed with fear! (-30% stats)]`);
                gameState.addStress(this.hero, 15);

                if ((this.hero.star || 1) === 1 && this.effectiveComposure < 35) {
                  this.isFleeing = true;
                }
              }
            }
          }
        }
      }
    }

    this.isMoving = false;

    // 4. 1-Star Fleeing Behavior
    if (this.isFleeing && !this.dead) {
      const startPos = dungeon?.startPosition || new THREE.Vector3(0, 0, 0);
      const fleeSpeed = this.moveSpeed * 0.7;
      const dx = startPos.x - this.mesh.position.x;
      const dz = startPos.z - this.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.5) {
        this.isMoving = true;
        const step = fleeSpeed * delta;
        const nextX = this.mesh.position.x + (dx / dist) * step;
        const nextZ = this.mesh.position.z + (dz / dist) * step;
        if (!dungeon || dungeon.isWalkable(nextX, nextZ)) {
          this.mesh.position.x = nextX;
          this.mesh.position.z = nextZ;
        }
        this.mesh.rotation.y = Math.atan2(dx, dz);
      }

      // If an enemy reaches them, they die with Cause: Fled from battle
      for (const e of enemies || []) {
        if (e.dead || e.isDying) continue;
        if (this.mesh.position.distanceTo(e.mesh.position) < 1.6) {
          this.die('Fled from battle');
          return;
        }
      }
      this.updateRig(delta);
      return;
    }

    // 5. Panic Check: 2 allies dead triggers panic if composure < 45
    if (activeDeadCount >= 2 && this.effectiveComposure < 45 && !this.isPanicking) {
      this.triggerPanic();
    }

    // 4. Panic Handling
    if (this.isPanicking) {
      this.shakingTimer += delta * 25;
      this.mesh.position.x += Math.sin(this.shakingTimer) * 0.03;
      this.panicMesh.material.opacity = Math.sin(this.animTime * 10) > 0 ? 1.0 : 0.3;

      if (this.panicFreezeTimer > 0) {
        this.panicFreezeTimer -= delta;
        this.isMoving = false;
        this.updateRig(delta);
        return;
      }

      if (this.panicRunTimer > 0) {
        this.panicRunTimer -= delta;
        this.isMoving = true;
        // Run away from closest enemy
        let closest = null;
        let minDist = 999;
        for (const e of enemies || []) {
          if (e.dead || e.isDying) continue;
          const d = this.mesh.position.distanceTo(e.mesh.position);
          if (d < minDist) {
            minDist = d;
            closest = e;
          }
        }

        let runDirX = 0;
        let runDirZ = 1;
        if (closest) {
          runDirX = this.mesh.position.x - closest.mesh.position.x;
          runDirZ = this.mesh.position.z - closest.mesh.position.z;
          const len = Math.hypot(runDirX, runDirZ) || 1;
          runDirX /= len;
          runDirZ /= len;
        }

        const step = this.moveSpeed * 1.15 * delta;
        const nextX = this.mesh.position.x + runDirX * step;
        const nextZ = this.mesh.position.z + runDirZ * step;

        if (!dungeon || dungeon.isWalkable(nextX, nextZ)) {
          this.mesh.position.x = nextX;
          this.mesh.position.z = nextZ;
        }
        this.mesh.rotation.y = Math.atan2(runDirX, runDirZ);
        this.updateRig(delta);
        return;
      }

      // Panic ended
      this.isPanicking = false;
      this.panicMesh.material.opacity = 0.0;
    }

    // 5. Cooldowns
    if (this.attackCooldown > 0) this.attackCooldown -= delta;
    if (this.attackAnimTimer > 0) this.attackAnimTimer -= delta;
    if (this.pinCooldown > 0) this.pinCooldown -= delta;

    // 6. Find & Pick Target based on Role and Command
    this.targetEnemy = this.selectTargetEnemy(enemies, player, squadCommand);

    // 7. Execute AI Behavior according to Role
    this.executeRoleAI(delta, player, dungeon, projectilesManager, squadCommand);

    // 8. Update HeroRig animations
    this.updateRig(delta);
  }

  selectTargetEnemy(enemies, player, squadCommand) {
    if (!enemies || enemies.length === 0) return null;
    const living = enemies.filter((e) => !e.dead && !e.isDying);
    if (living.length === 0) return null;

    // Command: FOCUS_BOSS
    if (squadCommand && squadCommand.id === 'FOCUS_BOSS') {
      const boss = living.find((e) => e.isBoss);
      if (boss) return boss;
    }

    // Greatsword Berserk: nearest enemy
    let closest = null;
    let minDist = 999;
    for (const e of living) {
      const d = this.mesh.position.distanceTo(e.mesh.position);
      if (d < minDist) {
        minDist = d;
        closest = e;
      }
    }
    return closest;
  }

  executeRoleAI(delta, player, dungeon, projectilesManager, squadCommand) {
    const enemy = this.targetEnemy;
    const distToEnemy = enemy ? this.mesh.position.distanceTo(enemy.mesh.position) : 999;
    const pPos = player ? player.mesh.position : new THREE.Vector3();

    // Spear Hero (Aaron): Melee front, attack range 3.2, boss weapon pin
    if (this.role === 'spear') {
      if (enemy && enemy.isBoss && (enemy.state === 'windup' || enemy.state === 'attack')) {
        if (distToEnemy <= 4.0 && this.pinCooldown <= 0) {
          this.pinCooldown = 6.0;
          this.attackAnimTimer = 0.4;
          enemy.pinWeapon(1.8, this.hero.name);
          showSystemMessage(`[${this.hero.name} pinned the boss's weapon!]`);
          return;
        }
      }

      // Attack enemy if in range
      if (enemy && distToEnemy <= 3.2) {
        this.faceToward(enemy.mesh.position.x, enemy.mesh.position.z);
        if (this.attackCooldown <= 0) {
          this.performMeleeAttack(enemy, 3.2);
        }
      } else {
        this.moveToward(this.targetPos.x, this.targetPos.z, delta, dungeon);
      }
      return;
    }

    // Scout / Bow (Jenna): Stays 7-10m back, arrow with lead, switches to dagger if <= 2m
    if (this.role === 'scout') {
      if (enemy && distToEnemy <= 2.0) {
        // Dagger stab
        this.faceToward(enemy.mesh.position.x, enemy.mesh.position.z);
        if (this.attackCooldown <= 0) {
          this.performMeleeAttack(enemy, 2.0, 0.7);
        }
      } else if (enemy && distToEnemy <= 12.0) {
        // Shoot arrow
        this.faceToward(enemy.mesh.position.x, enemy.mesh.position.z);
        if (this.attackCooldown <= 0 && projectilesManager) {
          this.performRangedShot(enemy, projectilesManager);
        }
        // Maintain 7-10m distance
        if (distToEnemy < 6.5) {
          const awayX = this.mesh.position.x - enemy.mesh.position.x;
          const awayZ = this.mesh.position.z - enemy.mesh.position.z;
          const len = Math.hypot(awayX, awayZ) || 1;
          this.moveToward(this.mesh.position.x + (awayX / len) * 2, this.mesh.position.z + (awayZ / len) * 2, delta, dungeon);
        }
      } else {
        this.moveToward(this.targetPos.x, this.targetPos.z, delta, dungeon);
      }
      return;
    }

    // Greatsword Berserker (Velkist): Rushes nearest enemy, ignores hold/fallback if HP > 50%
    if (this.role === 'berserker') {
      const ignoresHold = (this.hp / this.maxHp) > 0.5;
      if (enemy && (ignoresHold || (squadCommand && squadCommand.id !== 'HOLD' && squadCommand.id !== 'FALL_BACK'))) {
        if (distToEnemy <= 2.6) {
          this.faceToward(enemy.mesh.position.x, enemy.mesh.position.z);
          if (this.attackCooldown <= 0) {
            this.performMeleeAttack(enemy, 2.6, 1.4);
          }
        } else {
          this.moveToward(enemy.mesh.position.x, enemy.mesh.position.z, delta, dungeon);
        }
      } else {
        this.moveToward(this.targetPos.x, this.targetPos.z, delta, dungeon);
      }
      return;
    }

    // Mage (Eolka): Stays 9m back, casts fireballs (area splash), never melee
    if (this.role === 'mage') {
      if (enemy && distToEnemy <= 13.0) {
        this.faceToward(enemy.mesh.position.x, enemy.mesh.position.z);
        if (this.attackCooldown <= 0 && projectilesManager) {
          this.performFireball(enemy, projectilesManager);
        }
        // Keep 9m distance
        if (distToEnemy < 7.5) {
          const awayX = this.mesh.position.x - enemy.mesh.position.x;
          const awayZ = this.mesh.position.z - enemy.mesh.position.z;
          const len = Math.hypot(awayX, awayZ) || 1;
          this.moveToward(this.mesh.position.x + (awayX / len) * 2, this.mesh.position.z + (awayZ / len) * 2, delta, dungeon);
        }
      } else {
        this.moveToward(this.targetPos.x, this.targetPos.z, delta, dungeon);
      }
      return;
    }

    // Vanguard / Novice
    if (enemy && distToEnemy <= 2.2) {
      this.faceToward(enemy.mesh.position.x, enemy.mesh.position.z);
      if (this.attackCooldown <= 0) {
        this.performMeleeAttack(enemy, 2.2);
      }
    } else {
      this.moveToward(this.targetPos.x, this.targetPos.z, delta, dungeon);
    }
  }

  performMeleeAttack(enemy, range, mult = 1.0) {
    this.attackCooldown = 1.0;
    this.attackAnimTimer = 0.3;
    const fearMult = this.isAfraid ? 0.7 : 1.0;
    const dmg = Math.round(this.baseDamage * mult * fearMult * (this.berserkActive ? 1.5 : 1));
    enemy.takeDamage(dmg, false, this.mesh.position);
    this.damageDealt += dmg;
    if (enemy.dead || enemy.hp <= 0) this.kills++;
  }

  performRangedShot(enemy, projectilesManager) {
    this.attackCooldown = 1.6;
    this.attackAnimTimer = 0.3;
    const agi = this.hero.stats?.agi || 5;
    const fearMult = this.isAfraid ? 0.7 : 1.0;
    const arrowDmg = Math.round((5 + agi * 0.5) * fearMult);

    const fromPos = this.mesh.position.clone().add(new THREE.Vector3(0, 1.1, 0));
    const toPos = enemy.mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0));
    const dir = new THREE.Vector3().subVectors(toPos, fromPos).normalize();

    projectilesManager.spawn({
      type: 'arrow',
      from: fromPos,
      direction: dir,
      speed: 22,
      damage: arrowDmg,
      owner: 'player',
      onHit: (hitEnemy) => {
        this.damageDealt += arrowDmg;
        if (hitEnemy.dead || hitEnemy.hp <= 0) this.kills++;
      },
    });
  }

  performFireball(enemy, projectilesManager) {
    this.attackCooldown = 2.0;
    this.attackAnimTimer = 0.4;
    const fearMult = this.isAfraid ? 0.7 : 1.0;
    const spellDmg = Math.round(this.baseDamage * 1.25 * fearMult);

    const fromPos = this.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    const toPos = enemy.mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0));
    const dir = new THREE.Vector3().subVectors(toPos, fromPos).normalize();

    projectilesManager.spawn({
      type: 'fireball',
      from: fromPos,
      direction: dir,
      speed: 14,
      damage: spellDmg,
      owner: 'player',
      onHit: (hitEnemy) => {
        this.damageDealt += spellDmg;
        if (hitEnemy.dead || hitEnemy.hp <= 0) this.kills++;
      },
    });
  }

  moveToward(tx, tz, delta, dungeon) {
    const dx = tx - this.mesh.position.x;
    const dz = tz - this.mesh.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.25) {
      this.isMoving = true;
      const curSpeed = this.isAfraid ? this.moveSpeed * 0.7 : this.moveSpeed;
      const step = Math.min(dist, curSpeed * delta);
      const nextX = this.mesh.position.x + (dx / dist) * step;
      const nextZ = this.mesh.position.z + (dz / dist) * step;

      if (!dungeon || dungeon.isWalkable(nextX, nextZ)) {
        this.mesh.position.x = nextX;
        this.mesh.position.z = nextZ;
      }
      this.faceToward(tx, tz);
    }
  }

  faceToward(tx, tz) {
    const dx = tx - this.mesh.position.x;
    const dz = tz - this.mesh.position.z;
    if (Math.hypot(dx, dz) > 0.05) {
      this.mesh.rotation.y = Math.atan2(dx, dz);
    }
  }

  updateRig(delta) {
    if (this.dead || !this.rig) return;

    let action = 'none';
    let mood = (this.hero && (this.hero.stress || 0) >= 80) ? 'afraid' : 'neutral';
    let actionTime = 0;

    if (this.isPanicking || this.isFleeing) {
      action = 'panic';
      mood = 'afraid';
      actionTime = this.animTime;
    } else if (this.isAfraid) {
      action = 'afraid';
      mood = 'afraid';
      actionTime = this.animTime;
    } else if (this.flinchTimer > 0) {
      action = 'hit';
      mood = 'pain';
      actionTime = Math.max(0, 0.25 - this.flinchTimer);
    } else if (this.attackAnimTimer > 0) {
      action = this.role === 'scout' ? 'attack2' : this.role === 'mage' ? 'attack3' : 'attack1';
      mood = 'angry';
      actionTime = Math.max(0, 0.4 - this.attackAnimTimer);
    } else if (this.isCheering) {
      action = 'cheer';
      mood = 'happy';
      this.cheerTimer += delta;
      actionTime = this.cheerTimer;
    }

    this.rig.update(delta, {
      moving: this.isMoving,
      speed: 0.7,
      sprinting: false,
      action,
      actionTime,
      mood,
    });

    // Berserk aura
    if (this.berserkActive) {
      if (!this.berserkAuraLight) {
        this.berserkAuraLight = new THREE.PointLight(0xff1122, 2.5, 6);
        this.mesh.add(this.berserkAuraLight);
        this.berserkAuraLight.position.set(0, 1, 0);
      }
      if (!this.berserkAuraMesh) {
        const auraGeo = new THREE.RingGeometry(0.6, 0.9, 16);
        const auraMat = new THREE.MeshBasicMaterial({ color: 0xff1122, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
        this.berserkAuraMesh = new THREE.Mesh(auraGeo, auraMat);
        this.berserkAuraMesh.rotation.x = -Math.PI / 2;
        this.mesh.add(this.berserkAuraMesh);
        this.berserkAuraMesh.position.set(0, 0.1, 0);
      }
      const pulse = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
      this.berserkAuraMesh.scale.set(pulse, pulse, 1);
      this.berserkAuraLight.intensity = 2.5 * pulse;
    } else {
      if (this.berserkAuraLight) {
        this.mesh.remove(this.berserkAuraLight);
        this.berserkAuraLight.dispose();
        this.berserkAuraLight = null;
      }
      if (this.berserkAuraMesh) {
        this.mesh.remove(this.berserkAuraMesh);
        if (this.berserkAuraMesh.geometry) this.berserkAuraMesh.geometry.dispose();
        if (this.berserkAuraMesh.material) this.berserkAuraMesh.material.dispose();
        this.berserkAuraMesh = null;
      }
    }
  }

  dispose() {
    if (this.rig) {
      this.rig.dispose();
    }
    if (this.scene && this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }
  }
}
