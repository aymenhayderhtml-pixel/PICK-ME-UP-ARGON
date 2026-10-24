// UpdateLoopMixin.js — Per-frame update loop, adaptive quality, scene totals, and debug stats
// Extracted from src/scenes/TowerScene.js
import * as THREE from 'three';
import { Player } from '../../player/Player.js';
import { updateFloor3Debris } from '../../art/floors/forest.js';
import { spawnSparks } from '../../combat/Combat.js';
import { Telegraph } from '../../combat/Telegraph.js';
import { ITEM_TEMPLATES } from '../../combat/Items.js';
import { showSystemMessage, showNotices, isAnySystemWindowOpen } from '../../ui/Hud.js';
import { gameState } from '../../core/GameState.js';
import { COMMANDS } from '../../combat/Commands.js';
import { updateHumanoidCameraFade } from '../../core/CameraFade.js';

export const UpdateLoopMixin = (Base) => class extends Base {
  // 5s FPS window; drops to low quality once if we stay under 30 fps.
  updateAdaptiveQuality(delta) {
    if (this.mode === 'mine') return;
    this.fps5sTimer += delta;
    this.fps5sFrames++;
    if (this.fps5sTimer < 5) return;
    const fps = this.fps5sFrames / this.fps5sTimer;
    this.fps5sTimer = 0;
    this.fps5sFrames = 0;
    if (fps < 30 && !this.adaptiveQualityLowered && this.floorQuality !== 'low') {
      this.adaptiveQualityLowered = true;
      this.applyFloorQuality('low');
      console.log(`[A06c] adaptive quality lowered to low (fps ${fps.toFixed(1)})`);
    }
  }
  updateF3FloorStats() {
    if (!this.hud || !this.hud.showDebug || !this.hud.debugBox) return;
    const art = this.forestFloor && this.forestFloor.art;
    if (!art || !art.getStats) return;
    const stats = art.getStats();
    const sceneTotals = this.getSceneTotals();
    const pls = this.floorPointLights.filter((p) => p.visible).length;
    const lightCount = (this.forestFloor.lights || []).length;
    this.hud.debugBox.textContent += ` | Module(${art.moduleName || '?'}) Tris:${stats.triangles} Calls:${stats.drawCallsEstimate} Lights:${pls}/${lightCount} | Scene Meshes:${sceneTotals.meshes} Tris:${sceneTotals.triangles}`;
  }
  getSceneTotals() {
    let meshes = 0;
    let triangles = 0;
    this.scene.traverse((o) => {
      if (!o.isMesh) return;
      meshes++;
      const g = o.geometry;
      if (!g) return;
      if (g.index) triangles += g.index.count / 3;
      else if (g.attributes && g.attributes.position) triangles += g.attributes.position.count / 3;
    });
    return { meshes, triangles: Math.round(triangles) };
  }
  toggleDebugOverlay() {
    this.ensureDebugOverlay();
    this.debugOverlayOpen = !this.debugOverlayOpen;
    this.debugOverlayEl.style.display = this.debugOverlayOpen ? 'block' : 'none';
  }
  updateDebugOverlay() {
    if (!this.debugOverlayOpen || !this.debugOverlayEl) return;
    const art = this.forestFloor && this.forestFloor.art;
    const stats = art && art.getStats ? art.getStats() : null;
    const totals = this.getSceneTotals();
    const pls = this.floorPointLights.filter((p) => p.visible).length;
    const label = this.mode === 'tower'
      ? `Tower Floor ${this.currentFloorNumber}`
      : `Mode ${this.mode}`;
    const lines = [
      label,
      `Module: ${art ? (art.moduleName || '?') : 'none'}  Quality: ${this.floorQuality}`,
      stats ? `Meshes: ${stats.meshes}  Tris: ${stats.triangles}  Calls: ${stats.drawCallsEstimate}` : 'Module stats: n/a',
      `Art lights: ${pls}/${(this.forestFloor && this.forestFloor.lights ? this.forestFloor.lights.length : 0)}`,
      `Scene meshes: ${totals.meshes}  Tris: ${totals.triangles}`,
      `Art visible: ${this.forestFloor && this.forestFloor.group.visible ? 'yes' : 'no'}`,
    ];
    this.debugOverlayEl.textContent = lines.join('\n');
  }
  update(delta) {
    if (!this.isActive || !this.forestFloor) return;

    // The mouse steers the camera, so the pointer is captured while playing
    // and released for the UI windows and the command wheel.
    this.input.updateCursor(
      isAnySystemWindowOpen() || Boolean(this.commandWheel && this.commandWheel.isOpen)
    );

    if (this.arrivalDome) {
      this.arrivalDome.update(delta);
    }

    // Slow-motion logic: Command Wheel tactical pause (0.2x speed) or general slow-mo
    let effectiveDelta = delta;
    if (this.commandWheel && this.commandWheel.isOpen) {
      effectiveDelta = delta * 0.2;
    } else if (this.slowMotionTimer > 0) {
      this.slowMotionTimer -= delta;
      effectiveDelta = delta * 0.3;
    }

    // Floor 3 drifting leaf debris
    if (this.currentFloorNumber === 3) {
      updateFloor3Debris(effectiveDelta);
    }

    // Han Death Check
    if (this.player && this.player.dead) {
      this.handleHanDeath();
    }

    // Floor 5 Boss Arena Entrance Trigger
    if (this.currentFloorNumber === 5 && this.boss && !this.boss.dead && !this.bossIntroPlayed) {
      if (this.player.mesh.position.z <= -24) {
        this.bossIntroPlayed = true;
        this.isIntroPlaying = true;
        this.introTimer = 3.0;

        // Stress rises +5 per floor for 1-star novices entering boss fight
        for (const h of gameState.heroes) {
          if (gameState.isInParty(h.id) && (h.star || 1) === 1) {
            gameState.addStress(h, 5 * (this.currentFloorNumber || 5));
          }
        }

        // Seal entrance
        this.arenaSealed = true;
        if (this.forestFloor) this.forestFloor.isArenaSealed = true;
        if (this.arenaBarrierMesh) {
          this.arenaBarrierMesh.visible = true;
          this.arenaBarrierMesh.material.opacity = 0.65;
        }
        showSystemMessage('[The arena entrance has sealed!]');

        if (this.thirdPersonCamera) {
          this.thirdPersonCamera.shake(0.08, 2.5);
        }

        this.showBossTitleOverlay('HOBGOBLIN CHIEF', 'Chief of the Gloomwood');
      }
    }

    // Intro cutscene (3 seconds with 6-second failsafe)
    if (this.isIntroPlaying) {
      this.introTimer -= effectiveDelta;
      this.introElapsed = (this.introElapsed || 0) + delta;

      // Position camera looking directly at the boss
      this.camera.position.set(0, 3.2, -41);
      this.camera.lookAt(0, 2.0, -52);

      if (this.boss) {
        this.boss.leftArmPivot.rotation.x = -Math.PI * 0.75;
        this.boss.rightArmPivot.rotation.x = -Math.PI * 0.75;
      }

      if (this.introTimer <= 0 || this.introElapsed >= 6.0) {
        this.isIntroPlaying = false;
        this.introElapsed = 0;
        this.thirdPersonCamera.distance = 9;
        this.bossBar.show('HOBGOBLIN CHIEF', 600);
        if (this.boss) this.boss.state = 'chase';
        for (const sh of (this.boss?.shamans || [])) {
          if (sh) {
            sh.state = 'chase';
            sh.isAggroed = true;
          }
        }
      }
      return;
    }

    const windowOpen = isAnySystemWindowOpen() || (this.commandWheel && this.commandWheel.isOpen);

    // Floor 5 survival countdown
    if (this.currentFloorNumber === 5 && this.survivalTimer > 0) {
      this.survivalTimer -= delta * 15;
      if (this.survivalTimer < 0) this.survivalTimer = 0;
      if (this.survivalTimerEl) {
        const t = Math.ceil(this.survivalTimer);
        const mm = String(Math.floor(t / 60)).padStart(2, '0');
        const ss = String(t % 60).padStart(2, '0');
        this.survivalTimerEl.textContent = `[${mm}:${ss}]`;
        if (this.survivalTimer <= 180) {
          this.survivalTimerEl.style.color = '#ff3333';
          this.survivalTimerEl.style.textShadow = '0 0 12px #ff3333';
        } else {
          this.survivalTimerEl.style.color = '#00e5ff';
          this.survivalTimerEl.style.textShadow = '0 0 12px #00e5ff';
        }
      }
      if (this.survivalTimer <= 0 && !this.floor5Dissolving) {
        this.floor5Dissolving = true;
        this.dissolveTimer = 1.5;
        if (this.survivalTimerEl) {
          this.survivalTimerEl.textContent = '[00:00]';
          this.survivalTimerEl.style.color = '#00e5ff';
          this.survivalTimerEl.style.textShadow = '0 0 12px #00e5ff';
        }
        // Freeze & tint remaining enemies cyan/blue
        for (const en of (this.enemyManager.enemies || [])) {
          if (!en.dead && en.mesh) {
            en.state = 'idle';
            en.mesh.traverse((o) => {
              if (o.isMesh && o.material) {
                o.material.transparent = true;
                o.material.opacity = 1.0;
                if (o.material.emissive) o.material.emissive.setHex(0x00e5ff);
                if (o.material.color) o.material.color.setHex(0x00e5ff);
              }
            });
          }
        }
      }

    // Animate dissolution
    if (this.floor5Dissolving) {
      this.dissolveTimer -= delta;
      const progress = Math.max(0, Math.min(1, 1 - (this.dissolveTimer / 1.5)));
      for (const en of (this.enemyManager.enemies || [])) {
        if (!en.dead && en.mesh) {
          en.mesh.position.y += delta * 1.2;
          en.mesh.traverse((o) => {
            if (o.isMesh && o.material) {
              o.material.opacity = Math.max(0, 1 - progress);
            }
          });
        }
      }
      if (this.dissolveTimer <= 0) {
        this.floor5Dissolving = false;
        if (this.enemyManager && typeof this.enemyManager.dissolveAllEnemies === 'function') {
          this.enemyManager.dissolveAllEnemies(this.scene);
        }
        gameState.dailyDungeonUnlocked = true;
        gameState.saveToLocalStorage();
        showSystemMessage('CONGRATULATIONS, MASTER! YOU HAVE CLEARED THE 5TH FLOOR. THE DAILY DUNGEON WILL BE MADE AVAILABLE.\\nGATHER MATERIALS AND STRENGTHEN YOUR HEROES IN THE WAITING ROOM.');
      }
    }
    }

    // Daily Dungeon material node collection
    if (this.dailyDungeonType && this.materialNodes && this.materialNodes.length) {
      const pPos = this.player.mesh.position;
      for (const node of this.materialNodes) {
        if (node.collected) continue;
        const d = Math.hypot(pPos.x - node.mesh.position.x, pPos.z - node.mesh.position.z);
        if (d < 2.0) {
          node.collected = true;
          this.scene.remove(node.mesh);
          if (!gameState.materials) gameState.materials = {};
          const type = node.type;
          if (type === 'branch') {
            gameState.materials.branch = (gameState.materials.branch || 0) + 1;
            showSystemMessage("HAN (★) HAS GATHERED A 'BRANCH'.");
            showSystemMessage("TIPS: IF YOU COLLECT 100 'BRANCHES', YOU CAN TURN IT INTO LUMBER. HOWEVER, YOU'LL NEED A CARPENTER'S SHOP.");
          } else if (type === 'trash_f') {
            gameState.materials.trash_f = (gameState.materials.trash_f || 0) + 1;
            showSystemMessage("HAN (★) HAS GATHERED 'TRASH (F)'. TIPS: TRASH IS NOT NEEDED. PLEASE THROW IT AWAY.");
          } else if (type === 'plant_of_life') {
            gameState.materials.plant_of_life = (gameState.materials.plant_of_life || 0) + 1;
            showSystemMessage("HAN (★) HAS GATHERED 'PLANT OF LIFE'.");
          }
          gameState.saveToLocalStorage();
        }
      }
    }

    // Hit-Stop logic
    if (this.player.hitStop > 0) {
      this.player.hitStop -= effectiveDelta;
      effectiveDelta = 0.001;
    }

    const time = performance.now() * 0.001;

    // Floor 1 Scripted Tutorial Ambush Sequence
    if (this.isTutorial) {
      const pz = this.player.mesh.position.z;
      // When reaching first stone fence choke point (z <= -18.0)
      if (!this.tutorialAmbushTriggered && pz <= -18.0) {
        this.tutorialAmbushTriggered = true;
        showSystemMessage('[Ambush! Goblins attack at the stone fence choke point!]');

        // All novices panic immediately
        for (const ally of this.squadAI.allies) {
          ally.triggerPanic();
        }

        // Aggro group 1 grunts
        for (const en of this.enemyManager.enemies) {
          if (en.mesh && en.mesh.position.z >= -45) {
            en.state = 'chase';
            en.isAggroed = true;
          }
        }
      }

      // Scripted sequential deaths of novices over 10 seconds
      if (this.tutorialAmbushTriggered) {
        for (let i = 0; i < this.tutorialNoviceDeathTimers.length; i++) {
          if (this.tutorialNoviceDeathTimers[i] > 0) {
            this.tutorialNoviceDeathTimers[i] -= effectiveDelta;
            if (this.tutorialNoviceDeathTimers[i] <= 0) {
              const novice = this.squadAI.allies[i];
              if (novice && !novice.dead) {
                novice.die('Fell at the stone fence choke point');
                // Novice Keith (slot 0) drops the Iron Shield on death
                if (i === 0 && this.itemsManager) {
                  this.itemsManager.spawnItem(
                    this.scene,
                    novice.mesh.position.x,
                    novice.mesh.position.z,
                    ITEM_TEMPLATES.NOVICE_IRON_SHIELD,
                    novice.mesh.position
                  );
                }
              }
            }
          }
        }
      }
    }

    // Update Drops
    this.dropsManager.update(effectiveDelta, time, this.player, this.scene, (name, pos, drop) => {
      this.hud.showNotification(name, pos);
      if (drop && drop.isMaterial && drop.materialId) {
        this.expeditionMaterials[drop.materialId] =
          (this.expeditionMaterials[drop.materialId] || 0) + (drop.materialCount || 1);
      }
    });

    // Update Ground Scavenge Items
    if (this.itemsManager) {
      this.itemsManager.update(effectiveDelta, this.player.mesh.position);
    }

    // Update Projectiles
    this.projectilesManager.update(
      effectiveDelta,
      this.player,
      this.enemyManager.enemies,
      this.forestFloor,
      this.squadAI ? this.squadAI.allies : []
    );

    // AUTO Mode Logic
    let autoBlock = false;
    if (this.isAutoMode && !windowOpen && !this.player.dead) {
      const pPos = this.player.mesh.position;

      // 1. Auto-roll from red telegraphs
      if (this.telegraph && this.telegraph.indicators && this.telegraph.indicators.length > 0) {
        for (const ind of this.telegraph.indicators) {
          const indPos = ind.position || ind.mesh.position;
          if (indPos && pPos.distanceTo(indPos) < 10) {
            if (!this.player.isRolling && this.player.rollCooldown <= 0 && this.player.stamina >= 25) {
              this.player.startRoll(null, this.thirdPersonCamera.getYaw());
              break;
            }
          }
        }
      }

      // 2. Auto-block on enemy windup (< 4m facing him)
      const nearbyEnemies = (this.enemyManager.enemies || []).filter((e) => !e.dead && !e.isDying);
      let threatEnemy = null;
      for (const en of nearbyEnemies) {
        if (!en.mesh) continue;
        const dist = pPos.distanceTo(en.mesh.position);
        if (dist <= 4.0) {
          const isWindup =
            en.state === 'windup' ||
            en.state === 'attack' ||
            en.isWindup ||
            (en.state && en.state.includes('windup'));
          if (isWindup) {
            threatEnemy = en;
            autoBlock = true;
            break;
          }
        }
      }

      if (threatEnemy && !this.player.isRolling) {
        const dx = threatEnemy.mesh.position.x - pPos.x;
        const dz = threatEnemy.mesh.position.z - pPos.z;
        this.player.mesh.rotation.y = Math.atan2(dx, dz);
      }

      // 3. Auto-attack enemies (< 3m)
      if (!autoBlock && !this.player.isRolling && this.player.swingAnimTimer <= 0 && this.player.stamina >= 10) {
        let closestDist = Infinity;
        let closestEn = null;
        for (const en of nearbyEnemies) {
          if (!en.mesh) continue;
          const dist = pPos.distanceTo(en.mesh.position);
          if (dist < closestDist && dist <= 3.0) {
            closestDist = dist;
            closestEn = en;
          }
        }
        if (closestEn) {
          const dx = closestEn.mesh.position.x - pPos.x;
          const dz = closestEn.mesh.position.z - pPos.z;
          this.player.mesh.rotation.y = Math.atan2(dx, dz);
          this.player.attack(this.enemyManager.enemies, this.thirdPersonCamera, (dmg, pos, isFinisher) => {
            this.hud.showDamageNumber(dmg, pos, isFinisher);
          });
        }
      }

      // 4. Squad Commander Auto Commands (every 1s)
      this.autoCmdTimer = (this.autoCmdTimer || 0) + effectiveDelta;
      if (this.autoCmdTimer >= 1.0 && this.squadAI) {
        this.autoCmdTimer = 0;
        let targetCmd = null;
        let targetEnemy = null;

        const hanHpRatio = (this.player.hp || 1) / (this.player.maxHp || 100);
        if (hanHpRatio < 0.35) {
          targetCmd = COMMANDS.FALL_BACK;
        } else if (this.boss && !this.boss.dead && this.bossIntroPlayed) {
          targetCmd = COMMANDS.FOCUS_BOSS;
          targetEnemy = this.boss;
        } else {
          const hasReadyArcher = this.squadAI.allies.some((a) => {
            if (a.dead || (a.weaponType !== 'bow' && a.weaponType !== 'dagger+bow')) return false;
            return a.attackCooldown <= 0;
          });
          const enemiesWithin15 = nearbyEnemies.filter((e) => e.mesh && pPos.distanceTo(e.mesh.position) < 15);

          if (hasReadyArcher && enemiesWithin15.length > 0) {
            targetCmd = COMMANDS.LOOSE_ARROWS;
          } else if (enemiesWithin15.length > 0) {
            targetCmd = COMMANDS.ATTACK_TARGET;
            targetEnemy = enemiesWithin15[0];
          } else {
            targetCmd = COMMANDS.FOLLOW;
          }
        }

        if (targetCmd && (!this.squadAI.currentCommand || this.squadAI.currentCommand.id !== targetCmd.id)) {
          this.squadAI.setCommand(targetCmd, targetEnemy);
          showSystemMessage(`[AUTO Squad: ${targetCmd.label}]`);
        }
      }
    }

    // Update Player & Collision through ForestFloor isWalkable
    const cameraYaw = this.thirdPersonCamera.getYaw();
    const effectiveInput = {
      isDown: (k) => (!windowOpen && typeof this.input.isDown === 'function' ? this.input.isDown(k) : false),
      isActionDown: (action) => {
        if (action === 'block' && autoBlock) return true;
        return !windowOpen && typeof this.input.isActionDown === 'function' && this.input.isActionDown(action);
      },
      isRmbDown: () => (!windowOpen && typeof this.input.isRmbDown === 'function' && this.input.isRmbDown()),
      isLmbDown: () => (!windowOpen && typeof this.input.isLmbDown === 'function' && this.input.isLmbDown()) || (autoBlock && this.input.getActionButton?.('block') === 0),
      // While a window is open, drain the real delta so the camera does not
      // jump when the window closes, but report no movement.
      consumeMouseDelta: () => {
        const delta =
          typeof this.input.consumeMouseDelta === 'function'
            ? this.input.consumeMouseDelta()
            : { x: 0, y: 0 };
        return windowOpen ? { x: 0, y: 0 } : delta;
      },
    };
    this.player.update(
      effectiveDelta,
      effectiveInput,
      cameraYaw,
      this.forestFloor,
      this.thirdPersonCamera,
      this.enemyManager.enemies,
      (dmg, pos, isFinisher) => this.hud.showDamageNumber(dmg, pos, isFinisher)
    );

    // Update Squad AI
    if (this.squadAI) {
      this.squadAI.update(
        effectiveDelta,
        this.player,
        this.enemyManager.enemies,
        this.forestFloor,
        this.camera,
        this.projectilesManager
      );
    }

    // Update Party Panel HUD
    if (this.partyPanel) {
      this.partyPanel.update(this.player, this.squadAI.allies, this.squadAI.currentCommand);
    }

    // Update Han Shout speech bubble
    this.updateHanShout(effectiveDelta);

    // Floor 3 intro camera hold
    if (this.f3IntroActive) {
      this.f3IntroTimer -= delta;
      this.camera.position.set(0, 10, 14);
      this.camera.lookAt(0, 1, -34);
      if (this.f3IntroTimer <= 0) {
        this.f3IntroActive = false;
      }
    }

    // Camera zoom out to 9 during boss fight, 6 otherwise
    if (this.boss && !this.boss.dead && this.bossIntroPlayed) {
      this.thirdPersonCamera.distance = 9;
    }
    if (!this.f3IntroActive) {
      this.thirdPersonCamera.update(effectiveDelta, effectiveInput);
    }

    // Update Enemies with projectilesManager and squad allies passed
    this.enemyManager.update(
      effectiveDelta,
      this.player,
      this.forestFloor,
      this.scene,
      this.thirdPersonCamera,
      this.projectilesManager,
      this.squadAI ? this.squadAI.allies : []
    );

    // Update Boss Bar & Telegraph
    if (this.boss && this.bossBar) {
      this.bossBar.update(this.boss.hp, effectiveDelta);
    }
    if (this.telegraph) {
      this.telegraph.update(effectiveDelta);
    }

    // Update Forest Floor (flicker, fireflies, low ground fog, entrance gate trigger)
    this.forestFloor.update(effectiveDelta, time, this.player.mesh.position, this.camera);
    this.updateFloorLights(effectiveDelta, this.player.mesh.position);
    this.updateAdaptiveQuality(delta);

    // Mining interaction (Mine sub-dungeon)
    if (this.mode === 'mine' && this.forestFloor && this.forestFloor.oreNodes) {
      let nearestNode = null;
      let minDist = 2.5;
      for (const node of this.forestFloor.oreNodes) {
        if (node.mined) continue;
        const d = Math.hypot(this.player.mesh.position.x - node.x, this.player.mesh.position.z - node.z);
        if (d < minDist) {
          minDist = d;
          nearestNode = node;
        }
      }

      if (nearestNode) {
        if (this.input.isDown('KeyE')) {
          this.miningTimer = (this.miningTimer || 0) + effectiveDelta;
          this.hud.showMiningPrompt(true, this.miningTimer / 2.5);
          if (this.player) {
            this.player.isMining = true;
            this.player.miningTimer = this.miningTimer;
          }
          if (this.miningTimer >= 2.5) {
            this.miningTimer = 0;
            if (this.player) this.player.isMining = false;
            nearestNode.mine();
            spawnSparks(this.scene, new THREE.Vector3(nearestNode.x, 0.5, nearestNode.z), 0xffd700, 20);

            const copper = Math.floor(Math.random() * 3) + 1; // 1-3
            const iron = Math.floor(Math.random() * 3) + 1; // 1-3
            const steel = (this.difficulty >= 2) ? (Math.floor(Math.random() * 2) + 1) : 0; // 1-2 if D >= 2

            if (!this.gatheredMaterials) this.gatheredMaterials = {};
            this.gatheredMaterials.copper = (this.gatheredMaterials.copper || 0) + copper;
            this.gatheredMaterials.crude_iron = (this.gatheredMaterials.crude_iron || 0) + iron;
            if (steel > 0) this.gatheredMaterials.steel = (this.gatheredMaterials.steel || 0) + steel;

            if (!gameState.materials) gameState.materials = {};
            gameState.materials.copper = (gameState.materials.copper || 0) + copper;
            gameState.materials.crude_iron = (gameState.materials.crude_iron || 0) + iron;
            if (steel > 0) gameState.materials.steel = (gameState.materials.steel || 0) + steel;
            gameState.saveToLocalStorage();

            const steelStr = steel > 0 ? `, +${steel} Steel` : '';
            showSystemMessage(`[Mined: +${copper} Copper, +${iron} Crude Iron${steelStr}!]`);
            this.hud.showMiningPrompt(false);
          }
        } else {
          this.miningTimer = 0;
          if (this.player) this.player.isMining = false;
          this.hud.showMiningPrompt(true, 0);
        }
      } else {
        if (this.miningTimer > 0) this.miningTimer = 0;
        if (this.player) this.player.isMining = false;
        this.hud.showMiningPrompt(false);
      }
    }

    // Gate & Clear Rule Evaluation
    const activeEnemies = (this.enemyManager.enemies || []).filter((e) => !e.dead && !e.isDying);

    if (this.mode === 'hunt') {
      const isHuntCleared = this.initialEnemiesSpawned && (this.enemyManager.enemies || []).length > 0 && activeEnemies.length === 0;
      if (isHuntCleared && !this.rewardWindowShown) {
        showSystemMessage('[Hunt Complete!]');
        setTimeout(() => {
          this.openRewardWindow();
        }, 1200);
      }
    } else if (this.mode === 'mine') {
      // Ends at exit stone arch
      const distToExit = this.player.mesh.position.distanceTo(this.forestFloor.exitPosition);
      if (distToExit < 2.8 && !this.rewardWindowShown) {
        showSystemMessage('[Mine Complete!]');
        this.openRewardWindow();
      }
    } else {
      let isFloorCleared = false;
      if (this.currentFloorNumber === 5) {
        // Survival: prevent completion until countdown reaches 0.
        if (this.survivalTimer > 0) {
          isFloorCleared = false;
        } else {
          isFloorCleared = this.initialEnemiesSpawned && !!(this.boss && this.boss.dead && this.enemyManager.bossDefeated);
        }
      } else if (this.isTutorial) {
        isFloorCleared = this.initialEnemiesSpawned && this.tutorialAmbushTriggered && activeEnemies.length === 0;
      } else {
        isFloorCleared = this.initialEnemiesSpawned && this.initialEnemyCount > 0 && activeEnemies.length === 0;
      }

      if (isFloorCleared && this.forestFloor.exitGate && !this.forestFloor.exitGate.isOpen) {
        this.forestFloor.exitGate.open();
      }

      if (isFloorCleared && !this.rewardWindowShown) {
        if (this.isTutorial) {
          if (!gameState.flags) gameState.flags = {};
          gameState.flags.tutorialDone = true;
          showSystemMessage('[Hero Han Islat has demonstrated extraordinary bravery!]');
        }
        showNotices([`Floor ${this.currentFloorNumber} Clear! Calculating rewards...`], 3000, { iselleSpeaker: true, expression: 'sweet_cruel' });
        setTimeout(() => {
          this.openRewardWindow();
        }, 1500);
      }

      // Exit check: player reaches open exit gate
      if (
        this.forestFloor.exitGate &&
        this.forestFloor.exitGate.isOpen &&
        this.player.mesh.position.distanceTo(this.forestFloor.exitPosition) < 2.5
      ) {
        if (!this.rewardWindowShown) {
          this.openRewardWindow();
        }
      }
    }

    // Camera fade for close humanoids (< 2.5 units to camera)
    if (this.camera) {
      if (this.player && this.player.mesh) {
        updateHumanoidCameraFade(this.player.mesh, this.camera.position, effectiveDelta);
      }
      if (this.squadAI && this.squadAI.allies) {
        for (const ally of this.squadAI.allies) {
          if (ally.mesh) updateHumanoidCameraFade(ally.mesh, this.camera.position, effectiveDelta);
        }
      }
      if (this.enemyManager && this.enemyManager.enemies) {
        for (const enemy of this.enemyManager.enemies) {
          if (enemy.mesh) updateHumanoidCameraFade(enemy.mesh, this.camera.position, effectiveDelta);
        }
      }
    }

    // Update Spell System & VFX Pool
    if (this.spellSystem) {
      const activeCombatants = [this.player, ...this.enemyManager.enemies];
      if (this.boss && !this.boss.dead) activeCombatants.push(this.boss);
      this.spellSystem.combatants = activeCombatants;
      this.spellSystem.update(effectiveDelta, effectiveDelta);
    }
    if (this.vfxPool) {
      this.vfxPool.update(effectiveDelta, this.camera);
    }

    // Update HUD
    this.hud.update(
      effectiveDelta,
      this.player,
      this.enemyManager.enemies,
      this.camera,
      this.renderer,
      this.enemyManager.bossDefeated,
      this.currentFloorNumber
    );

    // F3 module stats + Backslash debug overlay
    this.updateF3FloorStats();
    this.updateDebugOverlay();
  }
};
