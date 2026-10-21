// src/dev/devWeapons.js
// Weapons tab controller: inspection, poses, combo loop, and bow aim ballistic test

import * as THREE from 'three';
import { ArrowPool, GRADE_ARROW_STATS } from '../combat/ArrowPool.js';
import { GRADE_MULTS } from '../combat/CombatData.js';

export class DevWeaponsController {
  constructor(scene) {
    this.scene = scene;
    this.arrowPool = new ArrowPool(scene);

    // Trajectory arc visualizer for bow aim test
    this.trajPointsCount = 35;
    this.trajPositions = new Float32Array(this.trajPointsCount * 3);
    this.trajGeom = new THREE.BufferGeometry();
    this.trajGeom.setAttribute('position', new THREE.BufferAttribute(this.trajPositions, 3));
    this.trajMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.12,
      gapSize: 0.06,
      transparent: true,
      opacity: 0.85,
    });
    this.trajLine = new THREE.Line(this.trajGeom, this.trajMat);
    this.trajLine.visible = false;
    this.scene.add(this.trajLine);

    this.activeHero = null;
    this.currentWeapon = 'sword';
    this.currentShield = 'ironRound';
    this.currentGrade = 'D';

    // Animation / pose playback state
    this.currentPose = 'idle';
    this.poseTime = 0.0;
    this.poseSpeed = 1.0;
    this.isComboLoop = false;
    this.isBowAiming = false;
    this.bowDrawTimer = 0.0;
    this.bowDrawRatio = 0.0;

    // Pre-allocated scratch vectors to prevent GC and CPU spikes
    this._trajStart = new THREE.Vector3();
    this._trajValidTarget = new THREE.Vector3();
    this._trajDisp = new THREE.Vector3();
    this._trajVel = new THREE.Vector3();
    this._trajG = new THREE.Vector3(0, -9.81, 0);
    this._trajPos = new THREE.Vector3();
  }

  setActiveHero(hero) {
    this.cancelAim();
    this.activeHero = hero;
    if (hero?.weapon?.kind) this.currentWeapon = hero.weapon.kind;
    if (hero?.shield?.kind) this.currentShield = hero.shield.kind;
    if (hero?.weapon?.grade) this.currentGrade = hero.weapon.grade;
    if (this.currentWeapon === 'bow') {
      this.currentShield = null;
      if (hero) hero.shield = null;
    }
  }

  setWeapon(kind) {
    this.currentWeapon = kind;
    if (kind === 'bow') {
      this.currentShield = null;
    }
    this.applyEquipment();
  }

  setShield(kind) {
    if (this.currentWeapon === 'bow') {
      this.currentShield = null;
      return;
    }
    this.currentShield = (kind === 'none' || !kind) ? null : kind;
    this.applyEquipment();
  }

  setGrade(grade) {
    this.currentGrade = grade;
    this.applyEquipment();
  }

  applyEquipment() {
    if (!this.activeHero) return;
    const mult = GRADE_MULTS[this.currentGrade] || 1.0;

    // If active hero had a slung bow on back and is no longer using dagger, clean it up
    if (this.currentWeapon !== 'dagger' && this.activeHero._backBowMesh) {
      if (this.activeHero._backBowMesh.parent) {
        this.activeHero._backBowMesh.parent.remove(this.activeHero._backBowMesh);
      }
      this.activeHero._backBowMesh.geometry?.dispose();
      this.activeHero._backBowMesh.material?.dispose();
      this.activeHero._backBowMesh = null;
    }

    if (this.currentWeapon === 'bow') {
      this.currentShield = null;
      this.activeHero.shield = null;
    }

    // Equip on HeroRig
    if (this.activeHero.rig?.equip) {
      this.activeHero.rig.equip({
        weapon: { kind: this.currentWeapon, grade: this.currentGrade, durability: 100 },
        offhand: this.currentShield ? { kind: this.currentShield, grade: this.currentGrade, durability: 100 } : null,
      });
    }

    // Update Combatant combat stats
    this.activeHero.weapon = {
      kind: this.currentWeapon,
      grade: this.currentGrade,
      damageMult: mult,
      reach: this.currentWeapon === 'greatsword' || this.currentWeapon === 'spear' || this.currentWeapon === 'staff' ? 1.15 : 0.85,
      radius: 0.14,
      durability: 100,
    };

    this.activeHero.shield = this.currentShield ? {
      kind: this.currentShield,
      grade: this.currentGrade,
      blockEfficiency: 0.65,
      durability: 100,
    } : null;
  }

  playPose(poseName) {
    if (!this.activeHero) return;
    this.currentPose = poseName;
    this.poseTime = 0.0;
    this.isComboLoop = (poseName === 'comboLoop');

    if (poseName === 'aim') {
      this.isBowAiming = true;
      this.trajLine.visible = true;
    } else {
      this.isBowAiming = false;
      this.trajLine.visible = false;
    }

    if (this.activeHero.stateMachine) {
      if (poseName === 'attack1' || poseName === 'attack2' || poseName === 'attack3') {
        this.activeHero.stateMachine.transitionTo('ATTACK', { heavy: poseName === 'attack3' });
      } else if (poseName === 'block') {
        this.activeHero.stateMachine.transitionTo('BLOCK');
      } else if (poseName === 'roll') {
        this.activeHero.stateMachine.transitionTo('DODGE');
      } else if (poseName === 'idle') {
        this.activeHero.stateMachine.transitionTo('IDLE');
      }
    }
  }

  setSpeed(speed) {
    this.poseSpeed = Math.max(0.05, Math.min(3.0, speed));
  }

  setArena(arena) {
    this.arena = arena;
  }

  update(worldDt, aimPoint = new THREE.Vector3(0, 0, -5.0), combatants = [], callbacks = {}) {
    this.arrowPool.update(worldDt, {
      combatants,
      shooter: this.activeHero,
      ...callbacks
    });

    if (!this.activeHero) return;

    if (this.isComboLoop) {
      this.poseTime += worldDt * this.poseSpeed;
      if (this.activeHero.stateMachine && this.activeHero.stateMachine.state === 'IDLE') {
        this.activeHero.stateMachine.transitionTo('ATTACK', { heavy: Math.random() > 0.6 });
      }
    }

    // Update bow aiming & draw strength
    if (this.isBowAiming) {
      const stats = GRADE_ARROW_STATS[this.currentGrade] || GRADE_ARROW_STATS.C;
      // Draw time: 0.35s for grade E, down to ~0.20s for S+
      const baseDrawTime = Math.min(0.35, stats.drawTime || 0.35);

      if (this.isRapidFollowUp) {
        // Rapid follow-up re-draw cycle over 0.25s with ease-out
        this.rapidDrawTimer = (this.rapidDrawTimer || 0) + worldDt;
        const rawRapid = Math.min(1.0, this.rapidDrawTimer / 0.25);
        this.bowDrawRatio = 1.0 - Math.pow(1.0 - rawRapid, 2);
        if (this.rapidDrawTimer >= 0.25) {
          this.isRapidFollowUp = false;
        }
      } else {
        this.bowDrawTimer += worldDt;
        const rawProgress = Math.min(1.0, this.bowDrawTimer / baseDrawTime);
        this.bowDrawRatio = 1.0 - Math.pow(1.0 - rawProgress, 2);
      }

      this.activeHero.bowDrawRatio = this.bowDrawRatio;

      if (this.activeHero && this.activeHero.stateMachine.state !== 'DODGE') {
        this.activeHero.stateMachine.state = 'AIM';
        this.activeHero.stateMachine.currentAction = 'aim';
      }

      // Dynamic reticle scale (contracts as draw builds)
      const reticle = document.getElementById('aim-reticle');
      if (reticle) {
        const scale = 1.35 - 0.45 * this.bowDrawRatio;
        reticle.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      }

      // Update thin draw bar fill under crosshair (Fix 1)
      const drawFill = document.getElementById('bow-draw-bar-fill');
      if (drawFill) {
        drawFill.style.width = `${Math.round(this.bowDrawRatio * 100)}%`;
      }

      this.updateTrajectoryPreview(aimPoint);
    } else {
      this.trajLine.visible = false;
      const drawFill = document.getElementById('bow-draw-bar-fill');
      if (drawFill) drawFill.style.width = '0%';
    }
  }

  startAim() {
    if (this.currentWeapon !== 'bow') return;
    this.isBowAiming = true;
    this.isRapidFollowUp = false;
    this.bowDrawTimer = 0.0;
    this.bowDrawRatio = 0.0;
    const drawFill = document.getElementById('bow-draw-bar-fill');
    if (drawFill) drawFill.style.width = '0%';
  }

  cancelAim() {
    this.isBowAiming = false;
    this.isRapidFollowUp = false;
    this.bowDrawTimer = 0.0;
    this.bowDrawRatio = 0.0;
    this.trajLine.visible = false;
    const drawFill = document.getElementById('bow-draw-bar-fill');
    if (drawFill) drawFill.style.width = '0%';
    if (this.activeHero) {
      this.activeHero.bowDrawRatio = 0.0;
      this.activeHero.bowDraw = 0.0;
      if (this.activeHero.stateMachine?.state === 'AIM') {
        this.activeHero.stateMachine.transitionTo('IDLE');
      }
    }
  }

  getBowAimOrigin(target = new THREE.Vector3()) {
    if (!this.activeHero) {
      return target.set(0, 1.2, 0);
    }
    const rig = this.activeHero.rig;
    if (rig) {
      rig.group.updateMatrixWorld(true);
      const active = rig.tempWeaponModel || rig.weaponModel;
      if (active?.anchors?.arrowShelf) {
        return active.anchors.arrowShelf.getWorldPosition(target);
      }
      if (active?.anchors?.grip) {
        return active.anchors.grip.getWorldPosition(target);
      }
      if (rig.getWeaponTipWorldPosition) {
        return rig.getWeaponTipWorldPosition(target);
      }
      if (rig.model?.sockets?.handR) {
        return rig.model.sockets.handR.getWorldPosition(target);
      }
    }
    return target.copy(this.activeHero.position).add({ x: 0, y: 1.2, z: 0 });
  }

  updateTrajectoryPreview(targetPoint) {
    if (!this.activeHero?.rig) return;
    const startPos = this._trajStart;
    this.getBowAimOrigin(startPos);

    const validTarget = (targetPoint && Number.isFinite(targetPoint.x) && Number.isFinite(targetPoint.y) && Number.isFinite(targetPoint.z))
      ? targetPoint
      : this._trajValidTarget.set(0, 1.2, -10.0);

    const disp = this._trajDisp.subVectors(validTarget, startPos);
    const dist = Math.max(0.5, disp.length());
    const stats = GRADE_ARROW_STATS[this.currentGrade] || GRADE_ARROW_STATS.D;
    const drawRatio = Math.max(0.15, this.bowDrawRatio);
    const speed = Math.max(5.0, stats.speed * (0.65 + 0.35 * drawRatio));
    const tFlight = Math.max(0.05, dist / speed);

    const velocity = this._trajVel.set(
      disp.x / tFlight,
      disp.y / tFlight + 0.5 * 9.81 * tFlight,
      disp.z / tFlight
    );

    const g = this._trajG;
    const pos = this._trajPos;

    for (let i = 0; i < this.trajPointsCount; i++) {
      const t = (i / (this.trajPointsCount - 1)) * tFlight * 1.05;
      pos.copy(startPos).addScaledVector(velocity, t).addScaledVector(g, 0.5 * t * t);
      if (Number.isFinite(pos.x) && Number.isFinite(pos.y) && Number.isFinite(pos.z)) {
        this.trajPositions[i * 3 + 0] = pos.x;
        this.trajPositions[i * 3 + 1] = Math.max(0, pos.y);
        this.trajPositions[i * 3 + 2] = pos.z;
      }
    }

    this.trajLine.geometry.attributes.position.needsUpdate = true;
    if (!this.trajLine.visible) {
      try { this.trajLine.computeLineDistances(); } catch (_) {}
    }
    this.trajLine.visible = true;
  }

  fireBowAimed(targetPoint, keepAiming = true) {
    if (!this.activeHero || this.activeHero.arrows <= 0) return false;
    const startPos = new THREE.Vector3();
    this.getBowAimOrigin(startPos);

    const validTarget = (targetPoint && Number.isFinite(targetPoint.x) && Number.isFinite(targetPoint.y) && Number.isFinite(targetPoint.z))
      ? targetPoint
      : new THREE.Vector3(0, 1.2, -10.0);

    const disp = new THREE.Vector3().subVectors(validTarget, startPos);
    const dist = Math.max(0.5, disp.length());
    const stats = GRADE_ARROW_STATS[this.currentGrade] || GRADE_ARROW_STATS.D;
    const drawRatio = Math.max(0.15, this.bowDrawRatio);
    const baseSpeed = Math.max(5.0, stats.speed * (0.65 + 0.35 * drawRatio));

    // Ballistic Parallax & Gravity Elevation Compensation:
    const tFlight = Math.max(0.05, dist / baseSpeed);
    const launchVelocity = new THREE.Vector3(
      disp.x / tFlight,
      disp.y / tFlight + 0.5 * 9.81 * tFlight,
      disp.z / tFlight
    );

    // Spread: at full draw (>= 0.95), spread is 0.0 (pinpoint accuracy).
    const spreadAngle = drawRatio >= 0.95 ? 0.0 : (1.0 - drawRatio) * 0.05;

    this.activeHero.arrows = Math.max(0, this.activeHero.arrows - 1);

    this.arrowPool.spawnArrow({
      position: startPos,
      velocity: launchVelocity,
      drawAmount: drawRatio,
      grade: this.currentGrade,
      damage: this.activeHero.baseAttack * (stats.dmgMult || 1.0) * (0.45 + 0.55 * drawRatio),
      owner: 'player',
      shooter: this.activeHero,
      spread: spreadAngle,
    });

    // Juice: Light camera recoil kick & string release
    if (this.arena?.triggerRecoilKick) {
      this.arena.triggerRecoilKick();
    }

    // Follow-up behavior: Stay aimed with rapid re-draw if keepAiming is true
    if (keepAiming && this.isBowAiming) {
      this.isRapidFollowUp = true;
      this.rapidDrawTimer = 0.0;
      this.bowDrawRatio = 0.0;
    } else {
      this.cancelAim();
      this.activeHero.stateMachine?.transitionTo('IDLE');
    }

    return true;
  }

  fireBowSnapshot(targetPoint) {
    if (!this.activeHero || this.activeHero.arrows <= 0) return false;
    const startPos = new THREE.Vector3();
    this.getBowAimOrigin(startPos);

    const disp = new THREE.Vector3().subVectors(targetPoint, startPos);
    const dist = Math.max(0.5, disp.length());
    const stats = GRADE_ARROW_STATS[this.currentGrade] || GRADE_ARROW_STATS.D;
    const baseSpeed = stats.speed * 0.65;
    const tFlight = dist / baseSpeed;

    const launchVelocity = new THREE.Vector3(
      disp.x / tFlight,
      disp.y / tFlight + 0.5 * 9.81 * tFlight,
      disp.z / tFlight
    );

    // Wide snap shot spread
    const spreadAngle = 0.18;

    this.activeHero.arrows = Math.max(0, this.activeHero.arrows - 1);

    this.arrowPool.spawnArrow({
      position: startPos,
      velocity: launchVelocity,
      drawAmount: 0.35,
      grade: this.currentGrade,
      damage: this.activeHero.baseAttack * (stats.dmgMult || 1.0) * 0.45,
      owner: 'player',
      shooter: this.activeHero,
      spread: spreadAngle,
    });

    if (this.arena?.triggerRecoilKick) {
      this.arena.triggerRecoilKick();
    }

    this.activeHero.stateMachine?.transitionTo('ATTACK', { heavy: false });
    return true;
  }

  fireBowTest(targetPoint) {
    return this.fireBowAimed(targetPoint, false);
  }
}
