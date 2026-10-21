// src/art/HeroRig.js
import * as THREE from 'three';
import { createHeroModel } from './hero.js';
import { createWeaponModel, createShieldModel } from './weapons.js';
import { mapItemToModel } from './itemModels.js';
import { SlashTrail } from '../fx/SlashTrail.js';
import { getAttackSpec } from './weaponAnimations.js';

let _hasReportedHeroOrigin = false;

export class HeroRig {
  constructor(look = {}, options = {}) {
    this.look = look || {};
    this.options = options || {};
    this.model = createHeroModel(this.look);
    this.group = this.model.group;

    // Attach reference to group so systems like CameraFade can access this rig
    this.group._heroRig = this;
    this.group.userData.heroRig = this;

    this.weaponKind = null;
    this.shieldKind = null;
    this.hitStopTimer = 0;
    if (this.model.userData) {
      this.model.userData.equippedWeaponKind = this.weaponKind;
      this.model.userData.equippedShieldKind = this.shieldKind;
    }

    // Report and correct idle bounding box min y once
    if (!_hasReportedHeroOrigin && typeof this.model.getBounds === 'function') {
      _hasReportedHeroOrigin = true;
      const bounds = this.model.getBounds();
      const minY = bounds.min.y;
      console.log(`[HeroRig] Model idle bounding box min y: ${minY.toFixed(4)}`);
      if (Math.abs(minY) > 0.02) {
        this.model.group.position.y = -minY;
      }
    }

    this.clock = 0;
    this.walkClock = 0;
    this.smoothedSpeed = 0;
    this.lastPos = null;
    this.currentMood = 'neutral';
    this.currentPose = 'idle';
    this.currentOpacity = 1.0;
    this.currentTint = null;
    this.currentTintAmount = 0;

    // Locomotion crossfade
    this.crossfadeTimer = 0;
    this.crossfadeDuration = 0.12;
    this.crossfadeSnapshot = null;

    // Ground clamp for lowest foot
    this.footCorrection = 0;
    this.footBoxL = new THREE.Box3();
    this.footBoxR = new THREE.Box3();
    this._lastPassedState = {};

    this.weaponModel = null;
    this.shieldModel = null;
    this.weaponMapped = null;
    this.shieldMapped = null;

    this.tempWeaponModel = null;
    this.tempWeaponType = null;

    this.hitGlowTimer = 0;
    this.castEmpowerTimer = 0;

    // Slash trail
    this.slashTrail = null;
    if (this.options.scene) {
      this.slashTrail = new SlashTrail(this.options.scene, null);
    }

    if (this.options.items) {
      this.equip(this.options.items);
    }
  }

  _snapshotParts() {
    if (!this.model || !this.model.parts) return null;
    const snap = {};
    for (const key in this.model.parts) {
      const part = this.model.parts[key];
      snap[key] = {
        pos: part.position.clone(),
        rot: part.rotation.clone(),
      };
    }
    return snap;
  }

  setScene(scene) {
    if (!this.slashTrail && scene) {
      this.slashTrail = new SlashTrail(scene, this.weaponModel);
      if (this.weaponMapped) {
        this.slashTrail.setWeaponModel(this.weaponModel, this.weaponMapped.grade);
      }
    }
  }

  triggerHitStop(duration = 0.05) {
    this.hitStopTimer = Math.max(this.hitStopTimer, duration);
  }

  /**
   * Updates animations, poses, weapon states, and slash trails.
   * @param {number} dt Delta time in seconds
   * @param {object} state { moving, speed, sprinting, action, actionTime, mood, camera, isCasting }
   */
  update(dt, state = {}) {
    let delta = dt || 0;
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= delta;
      delta = 0;
      if (this.model.parts && this.model.parts.root) {
        this.model.parts.root.position.x = (Math.random() - 0.5) * 0.02;
      }
    } else if (this.model.parts && this.model.parts.root && this.model.parts.root.position.x !== 0) {
      this.model.parts.root.position.x = 0;
    }

    this.clock += delta;
    this._lastPassedState = state;

    // 1. Resolve real horizontal speed (favor caller's explicit speed in world units/sec)
    let explicitSpeed = state.speed;
    const trackedObj = this.group.parent || this.group;

    if (explicitSpeed === undefined) {
      if (this.lastPos) {
        const dist = Math.hypot(trackedObj.position.x - this.lastPos.x, trackedObj.position.z - this.lastPos.z);
        explicitSpeed = delta > 0.0001 ? dist / delta : 0;
      } else {
        this.lastPos = new THREE.Vector3(trackedObj.position.x, trackedObj.position.y, trackedObj.position.z);
        explicitSpeed = state.moving ? (state.sprinting ? 9.0 : 5.0) : 0;
      }
      this.lastPos.set(trackedObj.position.x, trackedObj.position.y, trackedObj.position.z);
    } else if (state.moving && explicitSpeed <= 0) {
      explicitSpeed = state.sprinting ? 9.0 : 5.0;
    }

    // Smooth speed over 0.1 s
    const alpha = delta > 0 ? Math.min(1.0, delta / 0.1) : 1.0;
    this.smoothedSpeed += (explicitSpeed - this.smoothedSpeed) * alpha;
    const speed = this.smoothedSpeed;

    // 2. Pose selection driven by REAL horizontal speed
    const walkMax = 5.0;
    const walkRef = 5.0;
    const runRef = 8.5;
    const moving = (state.moving !== undefined ? state.moving : speed > 0.25) && speed > 0.25;

    let pose = 'idle';
    let t = this.clock;
    let intensity = 1.0;

    const action = state.action;
    if (action && action !== 'none') {
      pose = action;
      t = state.actionTime !== undefined ? state.actionTime : this.clock;
    } else if (moving) {
      const isSprinting = state.sprinting || speed > walkMax * 1.15;
      if (isSprinting) {
        pose = 'run';
        // Clamp cycle frequency so sprint stays in [1.3, 2.2] Hz
        const runRate = Math.min(1.15, Math.max(0.6, speed / runRef));
        this.walkClock += delta * runRate;
        t = this.walkClock;
        intensity = Math.min(1.3, Math.max(0.6, speed / runRef));
      } else {
        pose = 'walk';
        const walkRate = Math.min(1.2, Math.max(0.6, speed / walkRef));
        this.walkClock += delta * walkRate;
        t = this.walkClock;
        intensity = Math.min(1.2, Math.max(0.6, speed / walkRef));
      }
    } else {
      pose = 'idle';
      t = this.clock;
    }

    // 3. Snapshot for 0.12s crossfade between idle, walk and run (within 25m of camera)
    const isLocomotion = (p) => p === 'idle' || p === 'walk' || p === 'run';
    if (pose !== this.currentPose && isLocomotion(pose) && isLocomotion(this.currentPose)) {
      let distToCam = 0;
      const cam = state.camera || this.options.camera || HeroRig.activeCamera;
      if (cam && cam.position) {
        distToCam = trackedObj.position.distanceTo(cam.position);
      }
      if (distToCam <= 25) {
        this.crossfadeSnapshot = this._snapshotParts();
        this.crossfadeTimer = this.crossfadeDuration;
      }
    }

    this.model.setPose(pose, t, intensity, {
      weaponKind: this.weaponKind,
      shieldKind: this.shieldKind,
      dt: delta,
      moving: state.moving,
      bowDraw: state.bowDraw,
      arrowVisible: state.arrowVisible,
      isTremor: state.isTremor,
      ...(state.poseOptions || {})
    });
    this.currentPose = pose;

    // 4. Blend transforms during crossfade using Euler rotations to avoid Quaternion desync
    if (this.crossfadeTimer > 0 && this.crossfadeSnapshot && this.model.parts) {
      this.crossfadeTimer -= delta;
      const progress = 1.0 - Math.max(0, this.crossfadeTimer / this.crossfadeDuration);
      for (const key in this.crossfadeSnapshot) {
        const part = this.model.parts[key];
        const snap = this.crossfadeSnapshot[key];
        if (part && snap) {
          part.position.lerpVectors(snap.pos, part.position, progress);
          part.rotation.x = THREE.MathUtils.lerp(snap.rot.x, part.rotation.x, progress);
          part.rotation.y = THREE.MathUtils.lerp(snap.rot.y, part.rotation.y, progress);
          part.rotation.z = THREE.MathUtils.lerp(snap.rot.z, part.rotation.z, progress);
        }
      }
      if (this.crossfadeTimer <= 0) {
        this.crossfadeSnapshot = null;
      }
    }

    // 5. Ground-clamp lowest foot so feet cannot sink into ground
    if (this.model.parts && this.model.parts.footL && this.model.parts.footR) {
      this.model.group.position.y = 0;
      this.model.group.updateMatrixWorld(true);

      this.footBoxL.setFromObject(this.model.parts.footL);
      this.footBoxR.setFromObject(this.model.parts.footR);
      const minFootWorldY = Math.min(this.footBoxL.min.y, this.footBoxR.min.y);
      const relativeFootY = minFootWorldY - this.group.position.y;

      // Desired vertical correction to lift model so lowest foot sole >= 0 relative to character origin
      const targetCorrection = Math.min(0.35, Math.max(0, -relativeFootY));
      this.footCorrection += (targetCorrection - this.footCorrection) * Math.min(1.0, 32 * delta);
      this.model.group.position.y = this.footCorrection;
      this.model.group.updateMatrixWorld(true);
    }

    // Mood / Expression update only on change
    const mood = state.mood || 'neutral';
    if (mood !== this.currentMood) {
      this.currentMood = mood;
      this.model.setExpression(mood);
    }

    // 1. Manage Temporary Practice / Tool weapons (mine, trainSword, trainSpear, trainBow, trainDagger, trainMagic)
    this.updateTempWeapons(pose, t);

    // 2. Drive Bow Draw & Shield Mutual Exclusion
    this.updateBowDraw(pose, t, state);
    if (this.shieldModel && this.weaponMapped?.kind === 'bow') {
      this.shieldModel.group.visible = false;
    }

    // 3. Drive Staff / Magic Empower
    this.updateMagicEmpower(pose, state);

    // 4. Drive S/S+ hit glow decay
    if (this.hitGlowTimer > 0) {
      this.hitGlowTimer -= delta;
      if (this.weaponModel && (this.weaponMapped?.grade === 'S' || this.weaponMapped?.grade === 'S+')) {
        this.weaponModel.setGlow(this.hitGlowTimer > 0 ? 2.0 : 1.0);
      }
    }

    // 5. Update weapon & shield models (only when rig is visible)
    if (this.group.visible) {
      if (this.weaponModel && this.weaponModel.group.visible) {
        this.weaponModel.update(delta);
      }
      if (this.shieldModel && this.shieldModel.group.visible) {
        this.shieldModel.update(delta);
      }
      if (this.tempWeaponModel && this.tempWeaponModel.group.visible) {
        this.tempWeaponModel.update(delta);
      }
    }

    // 6. Slash Trails during active attack frames
    this.updateSlashTrail(pose, t, delta, state);
  }

  updateTempWeapons(pose, t) {
    if (pose === 'mine') {
      if (!this.tempWeaponModel || this.tempWeaponType !== 'mine') {
        this.clearTempWeapon();
        if (this.weaponModel) this.weaponModel.group.visible = false;
        if (this.shieldModel) this.shieldModel.group.visible = false;

        this.tempWeaponModel = createWeaponModel('pickaxe', { grade: 'D' });
        this.tempWeaponType = 'mine';
        this.model.sockets.handR.add(this.tempWeaponModel.group);
        this.tempWeaponModel.setOpacity(this.currentOpacity);
        if (this.currentTint) this.tempWeaponModel.setTint(this.currentTint, this.currentTintAmount);
      }
      return;
    }

    // Training poses
    const trainMap = {
      trainWeapon: { kind: this.weaponKind || 'sword', grade: 'E', socket: this.weaponKind === 'bow' ? 'handL' : 'handR' },
      trainSword: { kind: 'sword', grade: 'E', socket: 'handR' },
      trainGreatsword: { kind: 'greatsword', grade: 'E', socket: 'handR' },
      trainSpear: { kind: 'spear', grade: 'E', socket: 'handR' },
      trainBow: { kind: 'bow', grade: 'E', socket: 'handL' },
      trainDagger: { kind: 'dagger', grade: 'E', socket: 'handR' },
      trainStaff: { kind: 'staff', grade: 'E', socket: 'staffHand' },
      trainMace: { kind: 'mace', grade: 'E', socket: 'handR' },
      trainClub: { kind: 'club', grade: 'E', socket: 'handR' },
      trainPickaxe: { kind: 'pickaxe', grade: 'E', socket: 'handR' },
      trainMagic: { kind: 'staff', grade: 'E', socket: 'staffHand' }
    };

    if (trainMap[pose]) {
      const needed = trainMap[pose];
      const hasMatchingEquipped = this.weaponMapped && this.weaponMapped.kind === needed.kind;

      if (!hasMatchingEquipped) {
        if (!this.tempWeaponModel || this.tempWeaponType !== pose) {
          this.clearTempWeapon();
          if (this.weaponModel) this.weaponModel.group.visible = false;
          if (this.shieldModel) this.shieldModel.group.visible = false;

          this.tempWeaponModel = createWeaponModel(needed.kind, { grade: needed.grade });
          this.tempWeaponType = pose;
          const targetSocket = needed.socket === 'staffHand'
            ? (this.model.sockets.staffHand || this.model.sockets.handR)
            : (needed.socket === 'handL' ? this.model.sockets.handL : this.model.sockets.handR);
          targetSocket.add(this.tempWeaponModel.group);
          this.tempWeaponModel.setOpacity(this.currentOpacity);
          if (this.currentTint) this.tempWeaponModel.setTint(this.currentTint, this.currentTintAmount);
        }
        return;
      }
    }

    // Restore equipped weapons if training/mining finished
    if (this.tempWeaponModel) {
      this.clearTempWeapon();
      if (this.weaponModel) this.weaponModel.group.visible = true;
      const is2H = this.weaponMapped && ['greatsword', 'spear', 'staff', 'bow'].includes(this.weaponMapped.kind);
      if (this.shieldModel) this.shieldModel.group.visible = !is2H;
    }
  }

  clearTempWeapon() {
    if (this.tempWeaponModel) {
      if (this.tempWeaponModel.group.parent) {
        this.tempWeaponModel.group.parent.remove(this.tempWeaponModel.group);
      }
      this.tempWeaponModel.dispose();
      this.tempWeaponModel = null;
      this.tempWeaponType = null;
    }
  }

  updateBowDraw(pose, t, state = {}) {
    const isBowEquipped = this.weaponMapped && this.weaponMapped.kind === 'bow';
    const isBowTemp = this.tempWeaponType === 'trainBow';
    const bowModel = isBowTemp ? this.tempWeaponModel : (isBowEquipped ? this.weaponModel : null);

    if (!bowModel) return;

    // Read bowState written by evaluateWeaponPose or state
    const bState = this.model?.group?.userData?.bowState ||
                   this.model?.parts?.root?.userData?.bowState ||
                   this.model?.userData?.bowState ||
                   state?.bowState;
    if (bState) {
      bowModel.setDraw(bState.drawAmount, bState.arrowVisible, bState.vibTime);
      return;
    }

    if (state.bowDraw !== undefined) {
      const isArrowVis = state.arrowVisible !== undefined ? Boolean(state.arrowVisible) : (state.bowDraw > 0.01);
      const vib = state.vibTime !== undefined ? state.vibTime : -1;
      bowModel.setDraw(state.bowDraw, isArrowVis, vib);
      return;
    }

    if (pose === 'trainBow') {
      const u = ((t % 1.60) + 1.60) % 1.60;
      let draw = 0;
      let arrow = true;
      let vib = -1;
      if (u < 0.15) {
        draw = 0;
        arrow = false;
      } else if (u < 0.35) {
        draw = 0;
        arrow = true;
      } else if (u < 0.60) {
        draw = ((u - 0.35) / 0.25) * 0.10;
        arrow = true;
      } else if (u < 1.05) {
        draw = 0.10 + ((u - 0.60) / 0.45) * 0.90;
        arrow = true;
      } else if (u < 1.20) {
        draw = 1.0;
        arrow = true;
      } else if (u < 1.45) {
        draw = 0;
        arrow = false;
        vib = u - 1.20;
      } else {
        draw = 0;
        arrow = false;
      }
      bowModel.setDraw(draw, arrow, vib);
    } else if (pose === 'shoot') {
      let draw = 0;
      let arrow = true;
      let vib = -1;
      if (t < 0.35) {
        draw = t / 0.35;
        arrow = true;
      } else if (t < 0.40) {
        draw = 1.0;
        arrow = true;
      } else if (t < 0.60) {
        draw = 0;
        arrow = false;
        vib = t - 0.40;
      } else {
        draw = 0;
        arrow = false;
      }
      bowModel.setDraw(draw, arrow, vib);
    } else {
      bowModel.setDraw(0, false, -1);
    }
  }

  updateMagicEmpower(pose, state = {}) {
    const isStaffEquipped = this.weaponMapped && this.weaponMapped.kind === 'staff';
    const isStaffTemp = this.tempWeaponType === 'trainMagic' || this.tempWeaponType === 'trainStaff';
    const staffModel = isStaffTemp ? this.tempWeaponModel : (isStaffEquipped ? this.weaponModel : null);

    if (!staffModel) return;

    const isEmpowered = pose === 'trainMagic' || pose === 'cast' || pose === 'ultimateChannel' || state.isCasting || this.castEmpowerTimer > 0;
    staffModel.setEmpowered(isEmpowered);

    if (typeof staffModel.setOrbGlow === 'function') {
      const spellColor = state.spellColor !== undefined ? state.spellColor : (state.activeSpell?.colorPrimary ?? 0xff5511);
      const manaRatio = state.manaRatio !== undefined ? Math.max(0.15, Math.min(1.0, state.manaRatio)) : 1.0;
      const intensity = (isEmpowered ? 1.6 : 0.8) * manaRatio;
      staffModel.setOrbGlow(spellColor, intensity);
    }
  }

  triggerSpellCast() {
    this.castEmpowerTimer = 0.8; // Empowered during cast + 0.3s after release
    const staff = this.weaponMapped?.kind === 'staff' ? this.weaponModel : null;
    if (staff) staff.setEmpowered(true);
  }

  onWeaponHit() {
    if (this.weaponMapped && (this.weaponMapped.grade === 'S' || this.weaponMapped.grade === 'S+')) {
      this.hitGlowTimer = 0.15;
      if (this.weaponModel) this.weaponModel.setGlow(2.0);
    }
  }

  updateSlashTrail(pose, t, dt, state) {
    if (!this.slashTrail) {
      if (state.scene) this.setScene(state.scene);
      else return;
    }

    const isAttacking = pose === 'attack1' || pose === 'attack2' || pose === 'attack3' || pose === 'comboLoop';
    let inActiveWindow = false;

    if (pose === 'attack1' || pose === 'attack2' || pose === 'attack3') {
      inActiveWindow = this.isInTrailWindow(pose, t);
    } else if (pose === 'comboLoop') {
      const a1 = getAttackSpec(this.weaponKind, 'attack1');
      const a2 = getAttackSpec(this.weaponKind, 'attack2');
      const a3 = getAttackSpec(this.weaponKind, 'attack3');
      if (a1 && a2 && a3) {
        const total = a1.duration + a2.duration + a3.duration + 0.35;
        const modT = ((t % total) + total) % total;
        if (modT < a1.duration) {
          inActiveWindow = modT >= a1.trailWindow[0] && modT <= a1.trailWindow[1];
        } else if (modT < a1.duration + a2.duration) {
          const subT = modT - a1.duration;
          inActiveWindow = subT >= a2.trailWindow[0] && subT <= a2.trailWindow[1];
        } else if (modT < a1.duration + a2.duration + a3.duration) {
          const subT = modT - a1.duration - a2.duration;
          inActiveWindow = subT >= a3.trailWindow[0] && subT <= a3.trailWindow[1];
        }
      }
    }

    if (isAttacking && inActiveWindow && this.weaponModel && this.weaponModel.group.visible) {
      this.slashTrail.start();
    } else {
      this.slashTrail.stop();
    }

    this.slashTrail.update(dt, state.camera, this.group.position);
  }

  /**
   * Equips weapon, offhand shield, and visible armor pieces.
   * @param {object} items { weapon, offhand, armor }
   */
  equip(items = {}) {
    // 1. Weapon
    const rawWeapon = items.weapon;
    const mappedWeapon = mapItemToModel(rawWeapon);

    if (!mappedWeapon || mappedWeapon.category !== 'weapon' || !mappedWeapon.kind ||
        (rawWeapon && rawWeapon.durability !== undefined && rawWeapon.durability <= 0)) {
      if (this.weaponModel) {
        if (this.weaponModel.group.parent) this.weaponModel.group.parent.remove(this.weaponModel.group);
        this.weaponModel.dispose();
        this.weaponModel = null;
        this.weaponMapped = null;
      }
      this.weaponKind = null;
      if (this.model.userData) this.model.userData.equippedWeaponKind = null;
      if (this.slashTrail) this.slashTrail.setWeaponModel(null);
    } else {
      this.weaponKind = mappedWeapon.kind;
      if (this.model.userData) this.model.userData.equippedWeaponKind = mappedWeapon.kind;
      const isSame = this.weaponModel && this.weaponMapped &&
        this.weaponMapped.kind === mappedWeapon.kind &&
        this.weaponMapped.grade === mappedWeapon.grade;

      if (isSame) {
        this.weaponMapped = mappedWeapon;
        this.weaponModel.setWear(mappedWeapon.wear);
        this.weaponModel.setEnhance(mappedWeapon.enhance);
      } else {
        if (this.weaponModel) {
          if (this.weaponModel.group.parent) this.weaponModel.group.parent.remove(this.weaponModel.group);
          this.weaponModel.dispose();
        }
        this.weaponMapped = mappedWeapon;
        this.weaponModel = createWeaponModel(mappedWeapon.kind, {
          grade: mappedWeapon.grade,
          enhance: mappedWeapon.enhance,
          wear: mappedWeapon.wear
        });

        // Staff attaches to sockets.staffHand (at palm anchor); Bow to handL; others to handR
        const socket = mappedWeapon.kind === 'staff'
          ? (this.model.sockets.staffHand || this.model.sockets.handR)
          : (mappedWeapon.kind === 'bow' ? this.model.sockets.handL : this.model.sockets.handR);
        socket.add(this.weaponModel.group);

        if (typeof this.weaponModel.setOpacity === 'function') this.weaponModel.setOpacity(this.currentOpacity);
        if (this.currentTint && typeof this.weaponModel.setTint === 'function') this.weaponModel.setTint(this.currentTint, this.currentTintAmount);
        if ((mappedWeapon.grade === 'S' || mappedWeapon.grade === 'S+') && typeof this.weaponModel.setGlow === 'function') {
          this.weaponModel.setGlow(1.0);
        }

        if (this.slashTrail) {
          this.slashTrail.setWeaponModel(this.weaponModel, mappedWeapon.grade);
        }
      }
    }

    // 2. Offhand / Shield
    const rawOffhand = items.offhand;
    const mappedShield = mapItemToModel(rawOffhand);

    if (!mappedShield || mappedShield.category !== 'shield' || !mappedShield.kind ||
        (rawOffhand && rawOffhand.durability !== undefined && rawOffhand.durability <= 0)) {
      if (this.shieldModel) {
        if (this.shieldModel.group.parent) this.shieldModel.group.parent.remove(this.shieldModel.group);
        this.shieldModel.dispose();
        this.shieldModel = null;
        this.shieldMapped = null;
      }
      this.shieldKind = null;
      if (this.model.userData) this.model.userData.equippedShieldKind = null;
    } else {
      this.shieldKind = mappedShield.kind;
      if (this.model.userData) this.model.userData.equippedShieldKind = mappedShield.kind;
      const isSame = this.shieldModel && this.shieldMapped &&
        this.shieldMapped.kind === mappedShield.kind &&
        this.shieldMapped.grade === mappedShield.grade;

      if (isSame) {
        this.shieldMapped = mappedShield;
        this.shieldModel.setWear(mappedShield.wear);
        this.shieldModel.setEnhance(mappedShield.enhance);
      } else {
        if (this.shieldModel) {
          if (this.shieldModel.group.parent) this.shieldModel.group.parent.remove(this.shieldModel.group);
          this.shieldModel.dispose();
        }
        this.shieldMapped = mappedShield;
        this.shieldModel = createShieldModel(mappedShield.kind, {
          grade: mappedShield.grade,
          enhance: mappedShield.enhance,
          wear: mappedShield.wear
        });

        this.model.sockets.handL.add(this.shieldModel.group);
        this.shieldModel.setOpacity(this.currentOpacity);
        if (this.currentTint) this.shieldModel.setTint(this.currentTint, this.currentTintAmount);
      }
    }

    // 3. Shield Visibility with 2-Handed weapons (greatsword, spear, staff) or bows
    const is2H = this.weaponMapped && ['greatsword', 'spear', 'staff', 'bow'].includes(this.weaponMapped.kind);
    if (this.shieldModel) {
      this.shieldModel.group.visible = !is2H;
    }

    // 4. Armor -> model.setArmor({ type, color })
    const armor = items.armor;
    if (armor) {
      let aType = 'leather';
      const aName = (typeof armor === 'object' ? (armor.name || armor.templateId || armor.id || '') : String(armor)).toLowerCase();
      const aGrade = (typeof armor === 'object' ? (armor.grade || '') : '').toUpperCase();

      if (aName.includes('plate') || aGrade === 'A' || aGrade === 'S' || aGrade === 'S+') {
        aType = 'plate';
      } else if (aName.includes('chain') || aGrade === 'C' || aGrade === 'B') {
        aType = 'chain';
      } else {
        aType = 'leather';
      }

      const aCol = typeof armor === 'object' ? armor.color : null;
      this.model.setArmor({ type: aType, color: aCol });
    } else {
      this.model.setArmor(null);
    }
  }

  setTint(color, amount = 0) {
    this.currentTint = color;
    this.currentTintAmount = amount;
    this.model.setTint(color, amount);
    if (this.weaponModel) this.weaponModel.setTint(color, amount);
    if (this.shieldModel) this.shieldModel.setTint(color, amount);
    if (this.tempWeaponModel) this.tempWeaponModel.setTint(color, amount);
  }

  setOpacity(a) {
    this.currentOpacity = Math.max(0, Math.min(1, a));
    this.model.setOpacity(this.currentOpacity);
    if (this.weaponModel) this.weaponModel.setOpacity(this.currentOpacity);
    if (this.shieldModel) this.shieldModel.setOpacity(this.currentOpacity);
    if (this.tempWeaponModel) this.tempWeaponModel.setOpacity(this.currentOpacity);
  }

  setVisible(bool) {
    this.group.visible = Boolean(bool);
  }

  setOutlineVisible(bool) {
    this.model.setOutlineVisible(Boolean(bool));
  }

  setAmbientBoost(v) {
    this.ambientBoost = Math.max(0, Math.min(1, v));
    this.group.traverse((child) => {
      if (child.isMesh && child.material && child.material.isMeshToonMaterial) {
        if (!child.userData._hasClonedForBoost) {
          child.material = child.material.clone();
          child.userData._hasClonedForBoost = true;
          child.userData._origEmissive = child.material.emissive.clone();
        }
        if (this.ambientBoost > 0) {
          child.material.emissive.copy(child.material.color).multiplyScalar(this.ambientBoost);
        } else if (child.userData._origEmissive) {
          child.material.emissive.copy(child.userData._origEmissive);
        }
      }
    });
  }

  getHeadWorldPosition(target = new THREE.Vector3()) {
    this.group.updateMatrixWorld(true);
    if (this.model.parts && this.model.parts.head) {
      return this.model.parts.head.getWorldPosition(target);
    }
    return this.group.getWorldPosition(target).add(new THREE.Vector3(0, 1.55, 0));
  }

  getActiveAttackSpec(pose = this.currentPose) {
    if (!pose || !pose.startsWith('attack')) return null;
    return getAttackSpec(this.weaponKind, pose);
  }

  isInHitWindow(pose = this.currentPose, t = 0) {
    const spec = this.getActiveAttackSpec(pose);
    if (!spec || !spec.hitWindow) return false;
    const [start, end] = spec.hitWindow;
    const modT = ((t % spec.duration) + spec.duration) % spec.duration;
    return modT >= start && modT <= end;
  }

  isInTrailWindow(pose = this.currentPose, t = 0) {
    const spec = this.getActiveAttackSpec(pose);
    if (!spec || !spec.trailWindow) return false;
    const [start, end] = spec.trailWindow;
    const modT = ((t % spec.duration) + spec.duration) % spec.duration;
    return modT >= start && modT <= end;
  }

  getWeaponEdgeBaseWorldPosition(target = new THREE.Vector3()) {
    this.group.updateMatrixWorld(true);
    const active = this.tempWeaponModel || this.weaponModel;
    if (active && active.anchors && active.anchors.edgeBase) {
      return active.anchors.edgeBase.getWorldPosition(target);
    }
    if (active && active.anchors && active.anchors.grip) {
      return active.anchors.grip.getWorldPosition(target);
    }
    const socket = this.weaponKind === 'bow' ? this.model.sockets.handL : this.model.sockets.handR;
    return socket.getWorldPosition(target);
  }

  getWeaponTipWorldPosition(target = new THREE.Vector3()) {
    this.group.updateMatrixWorld(true);
    const active = this.tempWeaponModel || this.weaponModel;
    if (active && active.anchors) {
      if (active.anchors.arrowShelf) {
        return active.anchors.arrowShelf.getWorldPosition(target);
      }
      if (active.anchors.tip) {
        return active.anchors.tip.getWorldPosition(target);
      }
    }
    return this.model.sockets.handR.getWorldPosition(target);
  }

  getWeaponHitWorldPosition(target = new THREE.Vector3()) {
    this.group.updateMatrixWorld(true);
    const active = this.tempWeaponModel || this.weaponModel;
    if (active && active.anchors && active.anchors.hit) {
      return active.anchors.hit.getWorldPosition(target);
    }
    return this.model.sockets.handR.getWorldPosition(target);
  }

  getShieldHitWorldPosition(target = new THREE.Vector3()) {
    this.group.updateMatrixWorld(true);
    if (this.shieldModel && this.shieldModel.anchors && this.shieldModel.anchors.hit) {
      return this.shieldModel.anchors.hit.getWorldPosition(target);
    }
    return this.model.sockets.handL.getWorldPosition(target);
  }

  dispose() {
    this.clearTempWeapon();
    if (this.slashTrail) {
      this.slashTrail.dispose();
      this.slashTrail = null;
    }
    if (this.weaponModel) {
      if (this.weaponModel.group.parent) this.weaponModel.group.parent.remove(this.weaponModel.group);
      this.weaponModel.dispose();
      this.weaponModel = null;
      this.weaponMapped = null;
    }
    if (this.shieldModel) {
      if (this.shieldModel.group.parent) this.shieldModel.group.parent.remove(this.shieldModel.group);
      this.shieldModel.dispose();
      this.shieldModel = null;
      this.shieldMapped = null;
    }
    this.group.traverse((child) => {
      if (child.isMesh && child.userData && child.userData._hasClonedForBoost && child.material) {
        child.material.dispose();
      }
    });
    this.model.dispose();
  }
}
