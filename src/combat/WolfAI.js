// src/combat/WolfAI.js
import * as THREE from 'three';

let packHowledTriggered = false;
let packFledTriggered = false;

export function resetWolfPackState() {
  packHowledTriggered = false;
  packFledTriggered = false;
}

function isShieldBearer(target) {
  if (!target) return false;
  if (target.shield && target.shield.durability > 0) return true;
  if (target.hero && (target.hero.role === 'tank' || target.hero.role === 'guardian')) return true;
  if (target.hasShield) return true;
  return false;
}

function isArcher(target) {
  if (!target) return false;
  if (target.hero && (target.hero.role === 'archer' || target.hero.classId === 'archer')) return true;
  if (target.weapon && (target.weapon.type === 'bow' || target.weapon.kind === 'bow')) return true;
  return false;
}

export function selectWolfTarget(wolf, player, partyAllies = []) {
  const candidates = [player, ...partyAllies].filter(
    (t) => t && !t.dead && !t.isDying && t.hp > 0 && t.mesh
  );
  if (candidates.length === 0) return player;

  const wolfPos = wolf.mesh.position;

  // Rule: ignore shield bearer if another target is within 8 units
  const nonShieldInRange = candidates.filter(
    (t) => !isShieldBearer(t) && wolfPos.distanceTo(t.mesh.position) <= 8.0
  );

  const pool = nonShieldInRange.length > 0
    ? candidates.filter((t) => !isShieldBearer(t))
    : candidates;

  if (pool.length === 0) return player;

  // Rule: prefer weakest target (lowest composure hero or archers)
  let bestTarget = pool[0];
  let lowestScore = Infinity;

  for (const c of pool) {
    const composure = c.hero?.composure ?? c.composure ?? 50;
    let score = composure;
    if (isArcher(c)) {
      score -= 30; // Highly prioritize archers
    }
    const dist = wolfPos.distanceTo(c.mesh.position);
    score += dist * 0.5; // Slight proximity bias among equals

    if (score < lowestScore) {
      lowestScore = score;
      bestTarget = c;
    }
  }

  return bestTarget;
}

export function updateWolf(wolf, delta, player, dungeon, camera, projectilesManager, enemies = [], context = {}) {
  if (wolf.dead) return;

  // Speed buff timer from howl (+15% speed for 6s)
  if (wolf.speedBuffTimer > 0) {
    wolf.speedBuffTimer -= delta;
    wolf.speed = wolf.stats.speed * 1.15;
    if (wolf.speedBuffTimer <= 0) {
      wolf.speed = wolf.stats.speed;
    }
  } else {
    wolf.speed = wolf.stats.speed;
  }

  const livingWolves = enemies.filter((e) => e.typeKey === 'PRAIRIE_WOLF' && !e.dead && !e.isDying);

  // Initialize pack initial count if first time
  if (wolf.packInitialCount === undefined) {
    wolf.packInitialCount = livingWolves.length;
  }

  // Howl: once per fight when first wolf drops below 50% HP
  if (!packHowledTriggered && wolf.hp < wolf.maxHp * 0.5 && wolf.state !== 'dead') {
    packHowledTriggered = true;
    wolf.state = 'howl';
    wolf.stateTimer = 1.5;

    // All wolves within 15 units gain +15% speed for 6s
    for (const other of livingWolves) {
      if (wolf.mesh.position.distanceTo(other.mesh.position) <= 15.0) {
        other.speedBuffTimer = 6.0;
        other.speed = other.stats.speed * 1.15;
      }
    }
  }

  // Morale: when half of pack is dead, the rest flee for 4 seconds and come back
  if (!packFledTriggered && wolf.packInitialCount >= 2 && livingWolves.length <= Math.floor(wolf.packInitialCount / 2)) {
    packFledTriggered = true;
    for (const w of livingWolves) {
      w.state = 'flee';
      w.stateTimer = 4.0;
    }
  }

  // Target selection
  const partyAllies = context.partyAllies || [];
  const target = selectWolfTarget(wolf, player, partyAllies);
  if (!target || !target.mesh) return;

  const targetPos = target.mesh.position;
  const distToTarget = wolf.mesh.position.distanceTo(targetPos);

  // Count currently attacking wolves (at most 2 attack tokens)
  const attackingWolves = livingWolves.filter(
    (w) => w.state === 'windup' || w.state === 'pounce' || w.state === 'attack'
  );
  const canAttack = attackingWolves.length < 2 || wolf.state === 'windup' || wolf.state === 'pounce';

  // Pack circling setup
  const wolfIndex = livingWolves.indexOf(wolf);
  const packSize = Math.max(1, livingWolves.length);
  const baseAngle = (wolfIndex >= 0 ? wolfIndex : 0) * ((Math.PI * 2) / packSize);
  const circleRadius = 4.5;

  wolf.circleTime = (wolf.circleTime || 0) + delta * 1.2;
  const currentAngle = baseAngle + wolf.circleTime;

  switch (wolf.state) {
    case 'idle': {
      if (distToTarget <= (wolf.detectionRange || 18)) {
        wolf.isAggroed = true;
        if (livingWolves.length >= 2) {
          wolf.state = 'circle';
          wolf.stateTimer = 1.0 + Math.random();
        } else {
          wolf.state = 'chase';
        }
      }
      break;
    }

    case 'ambushWait': {
      // In ambush spot in tall grass
      if (distToTarget <= 14.0 || wolf.hp < wolf.maxHp) {
        wolf.isAggroed = true;
        if (livingWolves.length >= 2) {
          wolf.state = 'circle';
          wolf.stateTimer = 1.0 + Math.random();
        } else {
          wolf.state = 'chase';
        }
      }
      break;
    }

    case 'circle': {
      // Circle target at radius 4 to 5 for 1 to 2 seconds from different angles
      wolf.stateTimer -= delta;

      const circleX = targetPos.x + Math.cos(currentAngle) * circleRadius;
      const circleZ = targetPos.z + Math.sin(currentAngle) * circleRadius;

      wolf.moveToward(circleX, circleZ, delta, dungeon);
      wolf.faceToward(targetPos.x, targetPos.z);

      if (wolf.stateTimer <= 0) {
        if (canAttack && distToTarget <= 7.0) {
          wolf.state = 'windup';
          wolf.stateTimer = 0.25; // 0.25s coiled windup
        } else {
          wolf.stateTimer = 0.8 + Math.random() * 0.6;
        }
      }
      break;
    }

    case 'chase': {
      wolf.moveToward(targetPos.x, targetPos.z, delta, dungeon);
      wolf.faceToward(targetPos.x, targetPos.z);

      if (distToTarget <= 6.0 && canAttack) {
        wolf.state = 'windup';
        wolf.stateTimer = 0.25;
      }
      break;
    }

    case 'windup': {
      // Coiled windup pose before pounce (0.25s)
      wolf.faceToward(targetPos.x, targetPos.z);
      wolf.stateTimer -= delta;

      if (wolf.stateTimer <= 0) {
        wolf.state = 'pounce';
        wolf.stateTimer = 0.45;
        wolf.pounceElapsed = 0;
        wolf.pounceStartX = wolf.mesh.position.x;
        wolf.pounceStartZ = wolf.mesh.position.z;

        // Cover up to 6 units toward target
        const dx = targetPos.x - wolf.pounceStartX;
        const dz = targetPos.z - wolf.pounceStartZ;
        const len = Math.hypot(dx, dz) || 1;
        const pounceDist = Math.min(6.0, len);
        wolf.pounceTargetX = wolf.pounceStartX + (dx / len) * pounceDist;
        wolf.pounceTargetZ = wolf.pounceStartZ + (dz / len) * pounceDist;
        wolf.pounceDirX = dx / len;
        wolf.pounceDirZ = dz / len;
      }
      break;
    }

    case 'pounce': {
      // Covers up to 6 units in 0.45s, damage 9, knockback 3
      wolf.pounceElapsed = (wolf.pounceElapsed || 0) + delta;
      const progress = Math.min(1.0, wolf.pounceElapsed / 0.45);

      wolf.mesh.position.x = THREE.MathUtils.lerp(wolf.pounceStartX, wolf.pounceTargetX, progress);
      wolf.mesh.position.z = THREE.MathUtils.lerp(wolf.pounceStartZ, wolf.pounceTargetZ, progress);
      wolf.faceToward(wolf.pounceTargetX, wolf.pounceTargetZ);

      // Hit resolution when arriving or close
      if (progress >= 1.0 || wolf.mesh.position.distanceTo(targetPos) <= 1.2) {
        if (target.takeDamage) {
          const dmg = wolf.damage || 9;
          const hitRes = target === player
            ? target.takeDamage(dmg, false, 'pounce', wolf, camera, wolf.mesh.position)
            : target.takeDamage(dmg, wolf);

          if (hitRes?.parried) {
            // A pounce at a parried hit staggers the wolf for 1.0 s
            wolf.state = 'stagger';
            wolf.stateTimer = 1.0;
            return;
          } else if (hitRes?.blocked) {
            // 40% chance to stagger a blocking target when shield block is not a parry
            if (Math.random() < 0.40) {
              if (target.guardBreakTimer !== undefined) target.guardBreakTimer = 0.8;
              if (target.staggerTimer !== undefined) target.staggerTimer = 0.8;
            }
          } else {
            // Unblocked hit: apply knockback 3
            if (target.applyKnockback) {
              target.applyKnockback(wolf.pounceDirX, wolf.pounceDirZ, 3);
            }
          }
        }

        // Return to pack tactics
        if (livingWolves.length >= 2) {
          wolf.state = 'circle';
          wolf.stateTimer = 1.0 + Math.random();
        } else {
          wolf.state = 'chase';
        }
      }
      break;
    }

    case 'stagger': {
      wolf.stateTimer -= delta;
      if (wolf.stateTimer <= 0) {
        wolf.state = livingWolves.length >= 2 ? 'circle' : 'chase';
        wolf.stateTimer = 1.0;
      }
      break;
    }

    case 'howl': {
      wolf.stateTimer -= delta;
      if (wolf.stateTimer <= 0) {
        wolf.state = livingWolves.length >= 2 ? 'circle' : 'chase';
        wolf.stateTimer = 1.0;
      }
      break;
    }

    case 'flee': {
      // Flee away from target
      const fx = wolf.mesh.position.x - targetPos.x;
      const fz = wolf.mesh.position.z - targetPos.z;
      const flen = Math.hypot(fx, fz) || 1;
      wolf.moveInDirection(fx / flen, fz / flen, delta, dungeon);

      wolf.stateTimer -= delta;
      if (wolf.stateTimer <= 0) {
        wolf.state = livingWolves.length >= 2 ? 'circle' : 'chase';
        wolf.stateTimer = 1.0;
      }
      break;
    }

    case 'attack': {
      wolf.stateTimer -= delta;
      if (wolf.stateTimer <= 0) {
        wolf.state = livingWolves.length >= 2 ? 'circle' : 'chase';
      }
      break;
    }
  }
}
