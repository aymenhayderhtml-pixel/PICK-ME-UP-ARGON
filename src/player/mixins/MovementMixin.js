import * as THREE from 'three';
import { gameState } from '../../core/GameState.js';
import { showSystemMessage } from '../../ui/Hud.js';
import { playParrySound } from '../../combat/Combat.js';
import { spawnHitSparks } from '../../fx/WeaponFX.js';
import { GRADE_ARROW_STATS } from '../../combat/ArrowPool.js';
import { MANA_CONFIG } from '../../combat/spells.config.js';

function canMoveTo(dungeon, x, z, r = 0.4) {
  if (!dungeon) return true;
  return (
    dungeon.isWalkable(x - r, z - r) &&
    dungeon.isWalkable(x + r, z - r) &&
    dungeon.isWalkable(x - r, z + r) &&
    dungeon.isWalkable(x + r, z + r)
  );
}

export const MovementMixin = (Base) => class extends Base {
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

  /**
   * Installs the town obstacle shapes (hub only). The list never changes
   * while the hub is loaded, so the broadphase grid is built once here.
   *
   * @param {Array} blockers Data-only shapes: { type:'circle', x, z, r } or
   *        { type:'box', x, z, hx, hz, rot } (rot is a Three.js Y rotation).
   * @param {Object} config { radius, skin, cellSize, passes }
   */
  setTownBlockers(blockers, config) {
    this.townBlockers = Array.isArray(blockers) ? blockers : [];
    const cfg = config || {};
    this.blockerRadius = cfg.radius ?? 0.4;
    this.blockerSkin = cfg.skin ?? 0.02;
    this.blockerCellSize = cfg.cellSize ?? 4.0;
    this.blockerPasses = cfg.passes ?? 2;
    this.buildBlockerGrid();
  }

  /** Uniform grid broadphase: every shape is filed under the cells it covers. */
  buildBlockerGrid() {
    this.blockerGrid = null;
    this.blockerGridW = 0;
    this.blockerGridH = 0;

    const list = this.townBlockers;
    if (!list || list.length === 0) return;

    const cs = this.blockerCellSize;
    const pad = this.blockerRadius + this.blockerSkin;
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;

    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      let ex = 0;
      let ez = 0;
      if (c.type === 'box') {
        const rot = c.rot || 0;
        const ac = Math.abs(Math.cos(rot));
        const as = Math.abs(Math.sin(rot));
        ex = c.hx * ac + c.hz * as;
        ez = c.hx * as + c.hz * ac;
      }
      ex += pad;
      ez += pad;
      if (c.x - ex < minX) minX = c.x - ex;
      if (c.x + ex > maxX) maxX = c.x + ex;
      if (c.z - ez < minZ) minZ = c.z - ez;
      if (c.z + ez > maxZ) maxZ = c.z + ez;
    }

    this.blockerGridMinX = minX - cs;
    this.blockerGridMinZ = minZ - cs;
    const w = Math.max(1, Math.ceil((maxX - minX) / cs) + 2);
    const h = Math.max(1, Math.ceil((maxZ - minZ) / cs) + 2);
    this.blockerGridW = w;
    this.blockerGridH = h;

    const grid = new Array(w * h);
    for (let i = 0; i < grid.length; i++) grid[i] = [];
    this.blockerGrid = grid;

    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      let ex = 0;
      let ez = 0;
      if (c.type === 'box') {
        const rot = c.rot || 0;
        const ac = Math.abs(Math.cos(rot));
        const as = Math.abs(Math.sin(rot));
        ex = c.hx * ac + c.hz * as;
        ez = c.hx * as + c.hz * ac;
      }
      ex += pad;
      ez += pad;

      const gx0 = Math.max(0, Math.floor((c.x - ex - this.blockerGridMinX) / cs));
      const gx1 = Math.min(w - 1, Math.floor((c.x + ex - this.blockerGridMinX) / cs));
      const gz0 = Math.max(0, Math.floor((c.z - ez - this.blockerGridMinZ) / cs));
      const gz1 = Math.min(h - 1, Math.floor((c.z + ez - this.blockerGridMinZ) / cs));

      for (let gz = gz0; gz <= gz1; gz++) {
        for (let gx = gx0; gx <= gx1; gx++) {
          grid[gz * w + gx].push(c);
        }
      }
    }
  }

  /**
   * Pushes the hero out of every town obstacle he overlaps and re-tests once
   * more, so he slides along a fence or a tree instead of sticking to it.
   * Zero allocation: every value below is a local number.
   */
  resolveBlockerCollision() {
    if (!this.townBlockers || this.townBlockers.length === 0) return;
    const grid = this.blockerGrid;
    if (!grid) return;

    const pos = this.mesh.position;
    let px = pos.x;
    let pz = pos.z;
    const rr = this.blockerRadius + this.blockerSkin;

    for (let pass = 0; pass < this.blockerPasses; pass++) {
      const gx = Math.floor((px - this.blockerGridMinX) / this.blockerCellSize);
      const gz = Math.floor((pz - this.blockerGridMinZ) / this.blockerCellSize);
      if (gx < 0 || gz < 0 || gx >= this.blockerGridW || gz >= this.blockerGridH) return;
      const cell = grid[gz * this.blockerGridW + gx];
      let hit = false;

      for (let i = 0; i < cell.length; i++) {
        const c = cell[i];

        if (c.type === 'circle') {
          const dx = px - c.x;
          const dz = pz - c.z;
          const d2 = dx * dx + dz * dz;
          const cr = c.r + rr;
          if (d2 >= cr * cr) continue;
          const d = Math.sqrt(d2);
          if (d > 1e-5) {
            const s = cr / d;
            px = c.x + dx * s;
            pz = c.z + dz * s;
          } else {
            px = c.x + cr;
            pz = c.z;
          }
          hit = true;
          continue;
        }

        // Oriented box: world -> box local, push out, local -> world.
        const rot = c.rot || 0;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        const dx = px - c.x;
        const dz = pz - c.z;
        const lx = dx * cos - dz * sin;
        const lz = dx * sin + dz * cos;
        const hx = c.hx;
        const hz = c.hz;
        const qx = lx < -hx ? -hx : (lx > hx ? hx : lx);
        const qz = lz < -hz ? -hz : (lz > hz ? hz : lz);
        let ox = lx - qx;
        let oz = lz - qz;
        const d2 = ox * ox + oz * oz;
        if (d2 >= rr * rr) continue;

        if (d2 > 1e-9) {
          const d = Math.sqrt(d2);
          const push = (rr - d) / d;
          ox *= push;
          oz *= push;
        } else {
          // The centre is inside the box: leave through the nearest face.
          const faceX = hx - Math.abs(lx);
          const faceZ = hz - Math.abs(lz);
          if (faceX < faceZ) {
            ox = (lx >= 0 ? 1 : -1) * (faceX + rr);
            oz = 0;
          } else {
            ox = 0;
            oz = (lz >= 0 ? 1 : -1) * (faceZ + rr);
          }
        }

        px += ox * cos + oz * sin;
        pz += -ox * sin + oz * cos;
        hit = true;
      }

      if (!hit) break;
    }

    pos.x = px;
    pos.z = pz;
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

  update(delta, input, cameraYaw, dungeon, camera, enemies = null, onDamageNumber = null) {
    this.animTime += delta;
    if (enemies) this.lastEnemies = enemies;
    if (onDamageNumber) this.onDamageNumber = onDamageNumber;

    // The player may switch which hero they control: rebuild the model, the
    // controls and the HUD for the new hero immediately.
    if (gameState.controlledHeroId && gameState.controlledHeroId !== this.heroId) {
      this.setControlledHero(gameState.controlledHeroId);
    }

    // 1. Guard Break Stun
    if (this.guardBreakTimer > 0) {
      this.guardBreakTimer -= delta;
      this.rig.update(delta, { action: 'hit', actionTime: 0.2, mood: 'pain' });
      return;
    }

    // Bleeding drain
    if (this.bleedingTimer > 0) {
      this.bleedingTimer = Math.max(0, this.bleedingTimer - delta);
      this.hp = Math.max(1, this.hp - delta * (this.maxHp * 0.02));
      // Staunch if near a non-bleeding ally? simplified: auto-staunch after timer
    }

    // Archery State Machine (Ranged Combat & Over-the-Shoulder Aiming)
    const isBow = this.loadout?.attackMode === 'bow';
    const isAimKeyDown = input ? (input.isDown('KeyV') || input.isDown('KeyC')) : false;
    const isRmbDown = input && typeof input.isRmbDown === 'function' ? input.isRmbDown() : false;
    const wantsAim = isBow && !this.dead && this.guardBreakTimer <= 0 && (isAimKeyDown || isRmbDown);

    if (wantsAim) {
      if (!this.isAiming) {
        this.isAiming = true;
        this.drawTimer = 0;
        this.drawAmount = 0;
        this.isTremor = false;
        this.releaseTimer = 0;
        if (camera && typeof camera.setAimMode === 'function') {
          camera.setAimMode(true);
        }
      }

      // Draw progress scaled by bow grade
      const grade = this.weapon?.grade || 'C';
      const gradeStats = GRADE_ARROW_STATS[grade] || GRADE_ARROW_STATS.C;
      const drawDuration = gradeStats.drawTime || 0.58;
      this.drawTimer += delta;
      this.drawAmount = Math.min(1.0, this.drawTimer / drawDuration);

      if (this.drawTimer > drawDuration + 3.0) {
        this.isTremor = true;
        this.stamina = Math.max(0, this.stamina - 5.0 * delta);
      } else {
        this.isTremor = false;
      }

      // Tap LMB while aiming looses the arrow
      const isLmb = input && typeof input.isLmbDown === 'function' ? input.isLmbDown() : false;
      if (isLmb && !this.prevLmbDown) {
        if (this.drawAmount >= 0.15) {
          this.releaseAimedArrow(this.lastEnemies, camera, this.onDamageNumber);
          this.drawTimer = 0;
          this.drawAmount = 0;
        }
      }
    } else if (this.isAiming && !wantsAim) {
      // Released aim button
      if (this.drawAmount >= 0.15) {
        this.releaseAimedArrow(this.lastEnemies, camera, this.onDamageNumber);
      } else {
        this.drawTimer = 0;
        this.drawAmount = 0;
        this.isTremor = false;
      }
      this.isAiming = false;
      if (camera && typeof camera.setAimMode === 'function') {
        camera.setAimMode(false);
      }
    }

    // Release animation timer
    if (this.releaseTimer > 0) {
      this.releaseTimer -= delta;
    }

    // Hipfire snapshot timers
    if (this.snapshotTimer > 0) {
      this.snapshotTimer -= delta;
    }
    if (this.pendingSnapshotShot) {
      this.snapshotShotDelay -= delta;
      if (this.snapshotShotDelay <= 0) {
        this.pendingSnapshotShot = false;
        this.fireSoftAutoAimArrow(this.lastEnemies, this.onDamageNumber);
      }
    }

    this.prevLmbDown = input && typeof input.isLmbDown === 'function' ? input.isLmbDown() : false;

    // Cooldown timers
    if (this.comboTimer > 0) this.comboTimer -= delta;
    if (this.rollCooldown > 0) this.rollCooldown -= delta;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= delta;
    if (this.bashCooldown > 0) this.bashCooldown -= delta;
    if (this.bashAnimTimer > 0) this.bashAnimTimer -= delta;
    if (this.footworkCooldown > 0) this.footworkCooldown -= delta;
    if (this.hitTimer > 0) this.hitTimer -= delta;
    if (this.attackTimer > 0) this.attackTimer -= delta;
    if (this.swingAnimTimer > 0) this.swingAnimTimer -= delta;

    // Mana & Spell timers
    if (this.manaPotionCooldown > 0) {
      this.manaPotionCooldown = Math.max(0, this.manaPotionCooldown - delta);
    }
    if (this.overheatTimer > 0) {
      this.overheatTimer = Math.max(0, this.overheatTimer - delta);
      if (this.overheatTimer === 0) this.isOverheated = false;
    }
    if (this.manaFizzleTimer > 0) {
      this.manaFizzleTimer = Math.max(0, this.manaFizzleTimer - delta);
    }
    if (this.manaRegenTimer > 0) {
      this.manaRegenTimer = Math.max(0, this.manaRegenTimer - delta);
    } else if (!this.isOverheated && this.mana < this.maxMana) {
      this.mana = Math.min(this.maxMana, this.mana + MANA_CONFIG.baseManaRegenRate * delta);
    }

    // Tick spell cooldowns
    for (const sId in this.spellCooldowns) {
      if (this.spellCooldowns[sId] > 0) {
        this.spellCooldowns[sId] = Math.max(0, this.spellCooldowns[sId] - delta);
      }
    }

    // Casting update
    if (this.isCasting && this.currentSpell) {
      this.castProgress += delta;
      if (!this.hasCastReleased && this.castProgress >= this.castPoint) {
        this.hasCastReleased = true;
        if (this.spellSystem && !this.currentSpell.isChanneled) {
          this.spellSystem.releaseSpell(this, this.currentSpell, this.castTargetPos);
        }
      }
      if (this.castProgress >= this.castDuration) {
        this.spellCooldowns[this.currentSpell.id] = this.currentSpell.cooldown;
        this.isCasting = false;
        this.isCastingUltimate = false;
        this.currentSpell = null;
      }
    }

    // Channeling update (Inferno Beam)
    if (this.channeledSpell) {
      this.channelTimer += delta;
      this.channelTickTimer += delta;
      const interval = this.channeledSpell.tickInterval || 0.2;
      if (this.channelTickTimer >= interval) {
        this.channelTickTimer = 0;
        const manaCost = (this.channeledSpell.manaCostPerSecond || 8.0) * interval;
        if (this.mana >= manaCost) {
          this.spendMana(manaCost);
          if (this.spellSystem) {
            this.spellSystem.tickChanneledSpell(this, this.channeledSpell, this.castTargetPos);
          }
        } else {
          this.stopChannel();
          this.triggerManaFizzle();
        }
      }
      if (this.channelTimer >= (this.channeledSpell.maxChannelDuration || 3.0)) {
        this.stopChannel();
      }
    }

    // Tints: Damage flash > Poison > Severe Stress > default
    const hero = this.getHero();
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= delta;
      this.rig.setTint(0xffffff, 0.8);
    } else if (this.isPoisoned) {
      this.rig.setTint(0x4fbf3a, 0.3);
    } else if (hero && hero.stress >= 80) {
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
      this.resolveBlockerCollision();
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
      this.resolveBlockerCollision();

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

    // 5. Shield Block State (Hold block action)
    // Only a hero that actually carries a shield can raise it: a staff or bow
    // hero never blocks, so RMB is free for aiming/casting.
    const hasShield = Boolean(this.loadout?.canBlock) && this.shield && this.shield.durability > 0;
    const blockDown = input
      ? (typeof input.isActionDown === 'function'
          ? input.isActionDown('block')
          : (typeof input.isLmbDown === 'function' ? input.isLmbDown() : false))
      : false;

    if (blockDown && hasShield) {
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

    if (this.isAiming) {
      isSprinting = false;
    }

    if (isMoving) {
      moveX /= moveLength;
      moveZ /= moveLength;

      let speed = isSprinting ? this.sprintSpeed : this.walkSpeed;
      if (this.isAiming) {
        speed = 2.2; // Aiming movement speed capped at 2.2 m/s
      } else if (this.isBlocking) {
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

      // Town obstacles (fences, tree trunks, boulders, building walls): the
      // hero is pushed out of them so he slides along instead of walking
      // through.
      this.resolveBlockerCollision();

      if (this.isAiming) {
        this.mesh.rotation.y = cameraYaw + Math.PI;
      } else if (!this.isBlocking) {
        // A/D on their own is a strafe: the body keeps facing the camera
        // forward so the slide stays on one axis instead of the character
        // turning sideways (and the view swinging with it).
        const isPureStrafe = (left || right) && !forward && !backward;
        const targetRotation = isPureStrafe
          ? cameraYaw + Math.PI
          : Math.atan2(moveX, moveZ);
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
    } else if (this.isAiming) {
      // Stand-still aim lock to crosshair ray
      this.mesh.rotation.y = cameraYaw + Math.PI;
    } else {
      // Idle: the body holds the camera forward, so turning the camera does
      // not make the character spin on the spot.
      const targetRotation = cameraYaw + Math.PI;
      let diff = targetRotation - this.mesh.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.mesh.rotation.y += diff * Math.min(1, 14 * delta);
    }

    // Determine animation pose and mood
    let action = 'none';
    let actionTime = 0;
    let mood = (this.enemyNearby <= 10) ? 'angry' : 'neutral';

    if (this.isCastingUltimate) {
      action = 'ultimateChannel';
      actionTime = this.castProgress;
      mood = 'angry';
    } else if (this.isCasting || this.channeledSpell) {
      action = 'cast';
      actionTime = this.castProgress || this.channelTimer;
      mood = 'angry';
    } else if (this.isAiming) {
      action = 'aim';
      actionTime = this.drawTimer;
      mood = 'angry';
    } else if (this.releaseTimer > 0) {
      action = 'release';
      actionTime = 0.35 - this.releaseTimer;
      mood = 'angry';
    } else if (this.snapshotTimer > 0) {
      action = 'attack1';
      actionTime = this.snapshotDuration - this.snapshotTimer;
      mood = 'angry';
    } else if (this.attackTimer > 0) {
      const aPose = this.comboStep === 2 ? 'attack3' : (this.comboStep === 1 ? 'attack2' : 'attack1');
      action = aPose;
      actionTime = (this.attackDuration || 0.48) - Math.max(0, this.attackTimer);
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

    const currentSpeed = isMoving ? (this.isAiming ? 2.2 : (isSprinting ? this.sprintSpeed : this.walkSpeed)) : 0;
    this.rig.update(delta, {
      moving: isMoving,
      speed: currentSpeed,
      sprinting: isSprinting,
      action,
      actionTime,
      mood,
      bowDraw: this.drawAmount,
      arrowVisible: (this.isAiming && this.drawAmount > 0.02) || (this.snapshotTimer > 0 && this.snapshotTimer > 0.18),
      isTremor: this.isTremor,
      isCasting: this.isCasting || Boolean(this.channeledSpell),
      manaRatio: this.maxMana > 0 ? (this.mana / this.maxMana) : 1.0,
      activeSpell: this.currentSpell || this.channeledSpell,
    });

    if (this.rig?.updateMagicEmpower) {
      this.rig.updateMagicEmpower(action, {
        isCasting: this.isCasting || Boolean(this.channeledSpell),
        manaRatio: this.maxMana > 0 ? (this.mana / this.maxMana) : 1.0,
        activeSpell: this.currentSpell || this.channeledSpell,
      });
    }

    // Dodge Roll on Space key
    if (input && input.isDown('Space')) {
      this.startRoll(input, cameraYaw);
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

    // Ballistic arrow pool update
    if (this.arrowPool) {
      const ens = this.lastEnemies || enemies || [];
      this.arrowPool.update(delta, {
        enemies: ens,
        dungeon,
        onHit: (enemy, hitPos, isHeadshot, dmg) => {
          const wGrade = this.weapon?.grade || 'C';
          spawnHitSparks(this.scene, hitPos, isHeadshot ? 'S' : wGrade);
          if (this.drawAmount >= 0.85) {
            this.hitStop = 0.04;
            if (this.rig && this.rig.triggerHitStop) {
              this.rig.triggerHitStop(0.04);
            }
          }
          if (this.onDamageNumber) {
            this.onDamageNumber(dmg, hitPos, isHeadshot ? 'headshot' : false);
          }
          this.damageDealt = (this.damageDealt || 0) + dmg;
          if (enemy.dead || enemy.hp <= 0) this.kills = (this.kills || 0) + 1;
        },
        onHeadshot: (enemy, hitPos, dmg) => {
          spawnHitSparks(this.scene, hitPos, 'S+');
          playParrySound();
          showSystemMessage('[CRITICAL HEADSHOT! 2.0x]');
          if (this.onDamageNumber) {
            this.onDamageNumber(dmg, hitPos, 'headshot');
          }
          this.damageDealt = (this.damageDealt || 0) + dmg;
          if (enemy.dead || enemy.hp <= 0) this.kills = (this.kills || 0) + 1;
        }
      });
    }
  }
};