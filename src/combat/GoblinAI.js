import * as THREE from 'three';

// State Machine functions for Goblin enemies

export function handleIdle(goblin, delta, player, distToPlayer, aggroRange) {
  if (goblin.isAggroed || distToPlayer <= aggroRange) {
    goblin.isAggroed = true;
    goblin.state = 'chase';
  }
}

export function handleAmbushWait(goblin, delta, player, distToPlayer, context) {
  const detectRange = context.hasKeenSight ? 10.0 : 6.0;

  // If detected by Keen Sight, reveal faint red outline before jumping
  if (context.hasKeenSight && distToPlayer <= detectRange) {
    goblin.showAmbushGlow(true);
  } else {
    goblin.showAmbushGlow(false);
  }

  // Trigger check: within range OR player has passed the ambush point along path direction
  let passedPlayer = false;
  if (goblin.pathDirection) {
    const toPlayer = new THREE.Vector3().subVectors(player.mesh.position, goblin.mesh.position);
    if (toPlayer.dot(goblin.pathDirection) > 0 && distToPlayer < 12.0) {
      passedPlayer = true;
    }
  }

  if (distToPlayer <= detectRange || passedPlayer || goblin.isAggroed) {
    goblin.triggerAmbushJump();
  }
}

export function handleChase(goblin, delta, player, distToPlayer, allies, dungeon, context) {
  const pPos = player.mesh.position;
  const gPos = goblin.mesh.position;
  const dx = pPos.x - gPos.x;
  const dz = pPos.z - gPos.z;

  // 1. Archer Behavior
  if (goblin.typeKey === 'ARCHER') {
    // Flee if player gets closer than 5 units
    if (distToPlayer < 5.0) {
      goblin.state = 'flee';
      goblin.stateTimer = 2.5;
      return;
    }

    // Keep 10 to 14 units distance
    if (distToPlayer > 14.0) {
      // Advance toward player
      goblin.moveToward(pPos.x, pPos.z, delta, dungeon);
    } else if (distToPlayer < 10.0) {
      // Back away from player
      const dirX = -(dx / distToPlayer);
      const dirZ = -(dz / distToPlayer);
      goblin.moveInDirection(dirX, dirZ, delta, dungeon);
    } else {
      // In sweet spot (10 to 14 units): aim and shoot if reloaded
      goblin.faceToward(pPos.x, pPos.z);
      if (goblin.attackCooldown <= 0) {
        goblin.state = 'windup';
        goblin.stateTimer = 0.6; // 0.6s telegraph
        goblin.showTelegraph(player, 0.4);
      }
    }
    return;
  }

  // 2. Shaman Behavior
  if (goblin.typeKey === 'SHAMAN') {
    // Check morale < 40 flee
    if (goblin.morale < 40) {
      goblin.state = 'hesitate';
      goblin.stateTimer = 1.5;
      return;
    }

    // Check heal pulse cooldown (every 6 seconds on most wounded ally within 12 units)
    if (goblin.healCooldown <= 0) {
      const woundedAlly = findMostWoundedAlly(goblin, allies, 12.0);
      if (woundedAlly && woundedAlly.hp < woundedAlly.maxHp) {
        goblin.castHealPulse(woundedAlly);
        goblin.healCooldown = 6.0;
        return;
      }
    }

    // Green fireball attack when player is 8 to 12 away
    if (distToPlayer >= 8.0 && distToPlayer <= 12.0 && goblin.attackCooldown <= 0) {
      goblin.state = 'windup';
      goblin.stateTimer = 0.5;
      goblin.faceToward(pPos.x, pPos.z);
      return;
    }

    // Keep at least 8 to 12 units distance and stay behind grunts
    if (distToPlayer < 8.0) {
      const dirX = -(dx / distToPlayer);
      const dirZ = -(dz / distToPlayer);
      goblin.moveInDirection(dirX, dirZ, delta, dungeon);
    } else if (distToPlayer > 12.0) {
      goblin.moveToward(pPos.x, pPos.z, delta, dungeon);
    } else {
      goblin.faceToward(pPos.x, pPos.z);
    }
    return;
  }

  // 3. Grunt & Leader Swarm Tactics
  // If player stands in a choke point (dist < 2.5), don't queue up
  if (context.isPlayerInChokePoint) {
    if (!goblin.hasAttackToken && context.activeAttackingCount >= 1) {
      // Hold back out of range (radius 5.5)
      if (distToPlayer < 5.5) {
        const dirX = -(dx / distToPlayer);
        const dirZ = -(dz / distToPlayer);
        goblin.moveInDirection(dirX, dirZ, delta, dungeon);
      }
      return;
    }
  }

  // Token check for melee grunts
  if (goblin.typeKey === 'GRUNT' && context.totalTargetingGrunts >= 3) {
    if (!goblin.hasAttackToken) {
      goblin.state = 'flank';
      return;
    }
  }

  // Close in for melee attack
  if (distToPlayer <= goblin.attackRange) {
    if (goblin.attackCooldown <= 0) {
      goblin.state = 'windup';
      goblin.stateTimer = goblin.typeKey === 'LEADER' ? 0.5 : 0.35;
    }
  } else {
    // Surround angle movement
    const surroundAngle = context.surroundAngle != null
      ? context.surroundAngle
      : Math.atan2(dx, dz);
    const targetX = pPos.x + Math.sin(surroundAngle) * 1.8;
    const targetZ = pPos.z + Math.cos(surroundAngle) * 1.8;
    goblin.moveToward(targetX, targetZ, delta, dungeon);
  }
}

export function handleFlank(goblin, delta, player, distToPlayer, allies, dungeon, context) {
  // If granted an attack token, resume chase immediately
  if (goblin.hasAttackToken || context.activeAttackingCount < 2) {
    goblin.state = 'chase';
    return;
  }

  const pPos = player.mesh.position;
  // Circling / flanking position at radius 3.2
  const angle = context.surroundAngle || (performance.now() * 0.001);
  const targetX = pPos.x + Math.sin(angle) * 3.2;
  const targetZ = pPos.z + Math.cos(angle) * 3.2;

  goblin.moveToward(targetX, targetZ, delta * 0.85, dungeon);
  goblin.faceToward(pPos.x, pPos.z);
}

export function handleWindup(goblin, delta, player, distToPlayer, camera, projectilesManager, context = {}) {
  goblin.stateTimer -= delta;

  // Visual windup (raise weapon)
  if (goblin.weaponType === 'dual_daggers') {
    if (goblin.rightArmPivot) {
      goblin.rightArmPivot.rotation.set(-Math.PI * 0.5, 0.4, -0.3);
    }
    if (goblin.leftArmPivot) {
      goblin.leftArmPivot.rotation.set(-Math.PI * 0.5, -0.4, 0.3);
    }
  } else if (goblin.weaponType === 'knife_shield') {
    if (goblin.rightArmPivot) {
      goblin.rightArmPivot.rotation.x = -Math.PI * 0.65;
    }
    if (goblin.leftArmPivot) {
      goblin.leftArmPivot.rotation.set(-0.4, 0.35, 0);
    }
  } else {
    if (goblin.rightArmPivot) {
      goblin.rightArmPivot.rotation.x = -Math.PI * 0.65;
    }
  }

  const pPos = player.mesh.position;
  goblin.faceToward(pPos.x, pPos.z);

  if (goblin.stateTimer <= 0) {
    goblin.state = 'attack';
    goblin.stateTimer = 0.25;

    // Execute attack logic
    if (goblin.typeKey === 'ARCHER') {
      goblin.hideTelegraph();
      // Shoot arrow with lead prediction
      if (projectilesManager) {
        const arrowDir = calculateLeadDirection(goblin.mesh.position, player, 18.0);
        const fromPos = goblin.mesh.position.clone().add(new THREE.Vector3(0, 0.9, 0));
        projectilesManager.spawn({
          type: 'arrow',
          from: fromPos,
          direction: arrowDir,
          speed: 18.0,
          damage: goblin.damage,
          owner: 'enemy',
          poison: goblin.poison,
        });
      }
      goblin.attackCooldown = 1.6; // Reload time
    } else if (goblin.typeKey === 'SHAMAN') {
      // Cast green fireball
      if (projectilesManager) {
        const fromPos = goblin.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0));
        const dir = new THREE.Vector3().subVectors(pPos, fromPos).normalize();
        projectilesManager.spawn({
          type: 'fireball',
          from: fromPos,
          direction: dir,
          speed: 10.0,
          damage: 8,
          owner: 'enemy',
        });
      }
      goblin.attackCooldown = 2.0;
    } else {
      // Melee attack: hit player if in range, or nearest ally in range
      if (distToPlayer <= goblin.attackRange + 0.5) {
        player.takeDamage(goblin.damage, camera, goblin.mesh.position, 'melee', goblin);
      } else if (context && context.partyAllies) {
        for (const ally of context.partyAllies) {
          if (!ally.dead && !ally.isDying && goblin.mesh.position.distanceTo(ally.mesh.position) <= goblin.attackRange + 0.5) {
            ally.takeDamage(goblin.damage, goblin);
            break;
          }
        }
      }
      goblin.attackCooldown = 1.0;
    }
  }
}

export function handleAttack(goblin, delta) {
  goblin.stateTimer -= delta;

  // Attack swing / cross-slash animation
  if (goblin.weaponType === 'dual_daggers') {
    // Cross slash: both arms swing diagonally across chest
    if (goblin.rightArmPivot) {
      goblin.rightArmPivot.rotation.set(0.45, -0.6, -0.35);
    }
    if (goblin.leftArmPivot) {
      goblin.leftArmPivot.rotation.set(0.45, 0.6, 0.35);
    }
  } else if (goblin.weaponType === 'knife_shield') {
    if (goblin.rightArmPivot) {
      goblin.rightArmPivot.rotation.x = 0.45;
    }
    if (goblin.leftArmPivot) {
      goblin.leftArmPivot.rotation.set(-0.35, 0.25, 0);
    }
  } else {
    if (goblin.rightArmPivot) {
      goblin.rightArmPivot.rotation.x = 0.4;
    }
  }

  if (goblin.stateTimer <= 0) {
    if (goblin.rightArmPivot) goblin.rightArmPivot.rotation.set(0, 0, 0);
    if (goblin.leftArmPivot) goblin.leftArmPivot.rotation.set(0, 0, 0);
    goblin.state = 'chase';
  }
}

export function handleStagger(goblin, delta) {
  goblin.stateTimer -= delta;
  if (goblin.stateTimer <= 0) {
    goblin.state = 'chase';
  }
}

export function handleHesitate(goblin, delta, player, dungeon) {
  goblin.stateTimer -= delta;

  // Back away slowly and shake
  const pPos = player.mesh.position;
  const gPos = goblin.mesh.position;
  const dx = gPos.x - pPos.x;
  const dz = gPos.z - pPos.z;
  const dist = Math.hypot(dx, dz);
  if (dist > 0.01) {
    goblin.moveInDirection(dx / dist, dz / dist, delta * 0.4, dungeon);
  }
  goblin.playPanicAnim(delta);

  if (goblin.stateTimer <= 0) {
    // If morale < 30, flee for 4 seconds!
    if (goblin.morale < 30) {
      goblin.state = 'flee';
      goblin.stateTimer = 4.0;
    } else {
      goblin.state = 'chase';
    }
  }
}

export function handleFlee(goblin, delta, player, dungeon) {
  goblin.stateTimer -= delta;

  // Run away from player
  const pPos = player.mesh.position;
  const gPos = goblin.mesh.position;
  const dx = gPos.x - pPos.x;
  const dz = gPos.z - pPos.z;
  const dist = Math.hypot(dx, dz);

  if (dist > 0.01) {
    goblin.moveInDirection(dx / dist, dz / dist, delta * 1.1, dungeon);
  }
  goblin.playPanicAnim(delta);

  if (goblin.stateTimer <= 0) {
    // Return to combat if morale > 40
    if (goblin.morale > 40) {
      goblin.state = 'chase';
    } else {
      // Re-evaluate hesitation
      goblin.state = 'hesitate';
      goblin.stateTimer = 1.5;
    }
  }
}

function findMostWoundedAlly(goblin, allies, maxRange) {
  let mostWounded = null;
  let lowestHpRatio = 1.0;

  for (const ally of allies) {
    if (ally === goblin || ally.dead || ally.isDying) continue;
    const dist = goblin.mesh.position.distanceTo(ally.mesh.position);
    if (dist <= maxRange) {
      const ratio = ally.hp / ally.maxHp;
      if (ratio < lowestHpRatio) {
        lowestHpRatio = ratio;
        mostWounded = ally;
      }
    }
  }
  return mostWounded;
}

function calculateLeadDirection(fromPos, player, projectileSpeed) {
  const pPos = player.mesh.position;
  const dist = fromPos.distanceTo(pPos);
  const timeToTarget = dist / projectileSpeed;

  // Lead target using player's movement
  const targetX = pPos.x + (player.velocityX || 0) * timeToTarget;
  const targetZ = pPos.z + (player.velocityZ || 0) * timeToTarget;

  return new THREE.Vector3(targetX - fromPos.x, 0.4, targetZ - fromPos.z).normalize();
}
