import * as THREE from 'three';
import { COMMANDS } from './Commands.js';
import { gameState } from '../core/GameState.js';

export class SquadAI {
  constructor(scene) {
    this.scene = scene;
    this.allies = [];
    this.currentCommand = COMMANDS.FOLLOW;
    this.focusedTarget = null;
    this.shoutCallback = null;
  }

  setAllies(allies) {
    this.allies = allies;
    for (const ally of allies) {
      ally.squadAI = this;
    }
  }

  setCommand(command, targetEnemy = null) {
    this.currentCommand = command;
    this.focusedTarget = targetEnemy;

    if (command === COMMANDS.HOLD) {
      for (const ally of this.allies) {
        if (!ally.dead) {
          ally.targetPos.copy(ally.mesh.position);
        }
      }
    }

    if (this.shoutCallback && command.shout) {
      this.shoutCallback(command.shout);
    }
  }

  triggerBossRoarPanic() {
    for (const ally of this.allies) {
      if (!ally.dead && ally.effectiveComposure < 45) {
        ally.triggerPanic();
      }
    }
  }

  update(delta, player, enemies, dungeon, camera, projectilesManager) {
    if (!player) return;

    const pPos = player.mesh.position;
    const pFacing = player.mesh.rotation.y;
    const forwardX = Math.sin(pFacing);
    const forwardZ = Math.cos(pFacing);
    const rightX = Math.cos(pFacing);
    const rightZ = -Math.sin(pFacing);

    // 1. Han Leadership Aura calculation (+3 composure per skill level within 12m) + Natural Leader talent (+6 composure aura)
    const han = gameState.heroes.find((h) => h.id === 'hero_han');
    const leadershipSkill = han ? (han.skills || []).find((s) => s.id === 'leadership') : null;
    let leadershipBonus = leadershipSkill ? leadershipSkill.level * 3 : 0;
    const hasNaturalLeader = (h) => h && (
      (h.talents || []).some((t) => (t.id || t) === 'natural_leader') ||
      (h.hiddenTalents || []).some((t) => t.revealed && (t.id || t) === 'natural_leader')
    );
    if (hasNaturalLeader(han) || this.allies.some((a) => !a.dead && hasNaturalLeader(a.hero))) {
      leadershipBonus += 6;
    }

    // 2. Count active dead allies in squad
    const deadCount = this.allies.filter((a) => a.dead).length;

    // Camera direction relative to Han
    let camBehindX = -forwardX;
    let camBehindZ = -forwardZ;
    let camSideX = rightX;
    let camSideZ = rightZ;

    if (camera) {
      const cdx = camera.position.x - pPos.x;
      const cdz = camera.position.z - pPos.z;
      const cdist = Math.hypot(cdx, cdz);
      if (cdist > 0.1) {
        camBehindX = cdx / cdist; // Han towards Camera
        camBehindZ = cdz / cdist;
        camSideX = -camBehindZ; // sideways
        camSideZ = camBehindX;
      }
    }

    // 3. Update composure & formation targets
    let frontIdx = 0;
    let backIdx = 0;

    for (let i = 0; i < this.allies.length; i++) {
      const ally = this.allies[i];
      if (ally.dead) continue;

      // Distance to Han
      const distToHan = ally.mesh.position.distanceTo(pPos);
      const inAura = distToHan <= 12.0;
      ally.effectiveComposure = ally.baseComposure + (inAura ? leadershipBonus : 0);

      // Determine front vs back slot
      const isBackLine = ally.role === 'scout' || ally.role === 'mage' ||
        (gameState.getPartyFormation && gameState.getPartyFormation(ally.hero.id) === 'back');

      let targetX = pPos.x;
      let targetZ = pPos.z;

      if (this.currentCommand === COMMANDS.FOLLOW) {
        if (!isBackLine) {
          // Front: 2.5m forward, spread sideways by 1.8m
          const sideOffset = (frontIdx % 2 === 0 ? 1 : -1) * (1.8 * (Math.floor(frontIdx / 2) + 0.5));
          targetX = pPos.x + forwardX * 2.5 + rightX * sideOffset;
          targetZ = pPos.z + forwardZ * 2.5 + rightZ * sideOffset;
          frontIdx++;
        } else {
          // Back: at least 3.2m behind Han, and at least 2 units sideways from the camera direction
          const sideSign = (backIdx % 2 === 0 ? 1 : -1);
          const sideDist = 2.2 + Math.floor(backIdx / 2) * 1.0;
          const backDist = 3.2 + Math.floor(backIdx / 2) * 0.8;
          targetX = pPos.x + camBehindX * backDist + camSideX * (sideSign * sideDist);
          targetZ = pPos.z + camBehindZ * backDist + camSideZ * (sideSign * sideDist);
          backIdx++;
        }

        // Keep all allies from standing within 3 units directly behind Han on camera line
        const toTargetX = targetX - pPos.x;
        const toTargetZ = targetZ - pPos.z;
        const distToTarget = Math.hypot(toTargetX, toTargetZ);
        const dotCam = toTargetX * camBehindX + toTargetZ * camBehindZ;
        if (dotCam > 0 && distToTarget < 3.0) {
          const sideProj = toTargetX * camSideX + toTargetZ * camSideZ;
          const sign = sideProj >= 0 ? 1 : -1;
          targetX += camSideX * (sign * 2.2);
          targetZ += camSideZ * (sign * 2.2);
        }

        // Check floor walkability for formation target
        if (dungeon && !dungeon.isWalkable(targetX, targetZ)) {
          if (dungeon.findNearestWalkable) {
            const pt = dungeon.findNearestWalkable(targetX, targetZ);
            targetX = pt.x;
            targetZ = pt.z;
          } else {
            targetX = pPos.x;
            targetZ = pPos.z;
          }
        }

        ally.targetPos.set(targetX, 0, targetZ);
      } else if (this.currentCommand === COMMANDS.FALL_BACK) {
        // Fall back behind Han with camera line clearance
        const sideOffset = (i % 2 === 0 ? 1 : -1) * (2.2 + Math.floor(i / 2) * 1.0);
        targetX = pPos.x + camBehindX * 4.5 + camSideX * sideOffset;
        targetZ = pPos.z + camBehindZ * 4.5 + camSideZ * sideOffset;
        if (dungeon && !dungeon.isWalkable(targetX, targetZ)) {
          if (dungeon.findNearestWalkable) {
            const pt = dungeon.findNearestWalkable(targetX, targetZ);
            targetX = pt.x;
            targetZ = pt.z;
          } else {
            targetX = pPos.x;
            targetZ = pPos.z;
          }
        }
        ally.targetPos.set(targetX, 0, targetZ);
      } else if (this.currentCommand === COMMANDS.ATTACK_TARGET) {
        if (this.focusedTarget && !this.focusedTarget.dead) {
          ally.targetPos.copy(this.focusedTarget.mesh.position);
        }
      }

      // Soft push away if current position is within 3 units directly behind Han on camera line
      const toAx = ally.mesh.position.x - pPos.x;
      const toAz = ally.mesh.position.z - pPos.z;
      const dAlly = Math.hypot(toAx, toAz);
      const dotA = toAx * camBehindX + toAz * camBehindZ;
      if (dotA > 0.5 && dAlly < 3.0) {
        const sideA = toAx * camSideX + toAz * camSideZ;
        if (Math.abs(sideA) < 2.0) {
          const s = sideA >= 0 ? 1 : -1;
          ally.mesh.position.x += camSideX * s * (2.2 - Math.abs(sideA)) * 0.15;
          ally.mesh.position.z += camSideZ * s * (2.2 - Math.abs(sideA)) * 0.15;
        }
      }

      // Update individual Ally AI
      ally.update(delta, player, enemies, dungeon, camera, projectilesManager, this.currentCommand, deadCount);
    }

    // 4. Overlap resolution between allies
    for (let i = 0; i < this.allies.length; i++) {
      const a1 = this.allies[i];
      if (a1.dead) continue;
      for (let j = i + 1; j < this.allies.length; j++) {
        const a2 = this.allies[j];
        if (a2.dead) continue;

        const dx = a2.mesh.position.x - a1.mesh.position.x;
        const dz = a2.mesh.position.z - a1.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        const minDist = 0.85;

        if (dist < minDist && dist > 0.001) {
          const push = (minDist - dist) * 0.5;
          const pushX = (dx / dist) * push;
          const pushZ = (dz / dist) * push;

          a1.mesh.position.x -= pushX;
          a1.mesh.position.z -= pushZ;
          a2.mesh.position.x += pushX;
          a2.mesh.position.z += pushZ;
        }
      }
    }
  }

  clear() {
    for (const ally of this.allies) {
      ally.dispose();
    }
    this.allies = [];
    this.focusedTarget = null;
  }
}
