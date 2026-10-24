import * as THREE from 'three';
import { LAYOUT, PLAYER_COLLISION, SHOW_COLLIDERS } from '../../art/town/layout.js';
import { getGroundY } from '../../art/town/ground.js';
import { Player } from '../../player/Player.js';
import { gameState } from '../../core/GameState.js';
import { showSystemMessage, clearSystemMessages, isAnySystemWindowOpen } from '../../ui/Hud.js';
import { updateHumanoidCameraFade } from '../../core/CameraFade.js';
import { getBestSmith } from '../../core/Inventory.js';
import { spawnSparks } from '../../combat/Combat.js';
import { createWeaponModel, createShieldModel } from '../../art/weapons.js';
import { mapItemToModel } from '../../art/itemModels.js';
import { spawnHitSparks } from '../../fx/WeaponFX.js';
import { disposeSignLabelMesh, updateLabels } from '../../ui/Label.js';
import { updateUndergroundGuard } from '../../art/town/WalkHeight.js';

export const HubUpdateMixin = (Base) => class extends Base {

  /**
   * Draws the player collision shapes as wireframes. Enabled with
   * SHOW_COLLIDERS in src/art/town/layout.js. Built once when the hub loads.
   */
  buildColliderDebug() {
    this.clearColliderDebug();

    const group = new THREE.Group();
    group.name = 'TownColliderDebug';

    const circleMat = new THREE.MeshBasicMaterial({
      color: 0xff5533,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const boxMat = new THREE.MeshBasicMaterial({
      color: 0x33aaff,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    for (const c of this.townBlockers) {
      const y = this.getGroundY(c.x, c.z);
      if (c.type === 'circle') {
        const geo = new THREE.RingGeometry(Math.max(0.03, c.r - 0.07), c.r + 0.07, 32);
        geo.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geo, circleMat);
        mesh.position.set(c.x, y + 0.06, c.z);
        group.add(mesh);
      } else {
        const geo = new THREE.BoxGeometry(c.hx * 2, 0.5, c.hz * 2);
        const mesh = new THREE.Mesh(geo, boxMat);
        mesh.position.set(c.x, y + 0.25, c.z);
        mesh.rotation.y = c.rot || 0;
        group.add(mesh);
      }
    }

    this.scene.add(group);
    this.colliderDebugGroup = group;
  }

  clearColliderDebug() {
    if (!this.colliderDebugGroup) return;
    this.scene.remove(this.colliderDebugGroup);
    this.colliderDebugGroup.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    this.colliderDebugGroup = null;
  }

  toggleWalkHeightDebug() {
    this.showWalkHeightDebug = !this.showWalkHeightDebug;
    if (!this.showWalkHeightDebug) {
      if (this.walkHeightDebugPoints) {
        this.scene.remove(this.walkHeightDebugPoints);
        this.walkHeightDebugPoints.geometry.dispose();
        this.walkHeightDebugPoints.material.dispose();
        this.walkHeightDebugPoints = null;
      }
      showSystemMessage('[Walk Height Debug (F12): DISABLED]');
    } else {
      showSystemMessage('[Walk Height Debug (F12): ENABLED (Radius 8)]');
      this.updateWalkHeightDebug();
    }
  }

  updateWalkHeightDebug() {
    if (!this.showWalkHeightDebug || !this.player?.mesh) return;
    const px = this.player.mesh.position.x;
    const pz = this.player.mesh.position.z;
    const radius = 8;
    const spacing = 0.5;

    const positions = [];
    for (let dx = -radius; dx <= radius; dx += spacing) {
      for (let dz = -radius; dz <= radius; dz += spacing) {
        if (Math.hypot(dx, dz) <= radius) {
          const wx = px + dx;
          const wz = pz + dz;
          const wy = this.getWalkY(wx, wz) + 0.04;
          positions.push(wx, wy, wz);
        }
      }
    }

    if (!this.walkHeightDebugPoints) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0x22c55e,
        size: 5,
        sizeAttenuation: false,
        depthTest: false,
      });
      this.walkHeightDebugPoints = new THREE.Points(geo, mat);
      this.walkHeightDebugPoints.renderOrder = 999;
      this.scene.add(this.walkHeightDebugPoints);
    } else {
      const geo = this.walkHeightDebugPoints.geometry;
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.attributes.position.needsUpdate = true;
    }
  }

  exit() {
    this.isActive = false;
    this.hud.hide();
    this.heroesManager.clear();
    this.trainingManager.clear();
    if (this.sparringController) this.sparringController.clearQueue();

    if (this.groundDebug) {
      this.groundDebug.dispose();
      this.groundDebug = null;
    }

    if (this.walkHeightMap) {
      this.walkHeightMap.dispose();
      this.walkHeightMap = null;
    }
    if (this.walkHeightDebugPoints) {
      this.scene.remove(this.walkHeightDebugPoints);
      this.walkHeightDebugPoints.geometry.dispose();
      this.walkHeightDebugPoints.material.dispose();
      this.walkHeightDebugPoints = null;
      this.showWalkHeightDebug = false;
    }

    if (this.town) {
      this.scene.remove(this.town.group);
      this.town.dispose();
      this.town = null;
    }

    // The town obstacles are gone with the town.
    this.player.setTownBlockers([], PLAYER_COLLISION);
    this.townBlockers = [];
    this.clearColliderDebug();

    for (const m of this.signLabels) {
      this.scene.remove(m);
      disposeSignLabelMesh(m);
    }
    this.signLabels = [];

    for (const pl of this.pointLightPool) {
      pl.visible = false;
    }
    this._activeLightSet.clear();

    if (this.forgeShowcase) {
      this.scene.remove(this.forgeShowcase.model.group);
      this.forgeShowcase.model.dispose();
      this.forgeShowcase = null;
    }
    if (this.accountCreationScreen) this.accountCreationScreen.close();
    if (this.iselleTutorial) this.iselleTutorial.close();
    if (this.summonWindow) this.summonWindow.close();
    if (this.summonEffect) this.summonEffect.endEffect();
    if (this.rosterWindow) this.rosterWindow.close();
    if (this.deployWindow) this.deployWindow.close();
    if (this.synthesisWindow) this.synthesisWindow.close();
    if (this.synthesisEffect) this.synthesisEffect.endEffect();
    if (this.trainingWindow) this.trainingWindow.close();
    if (this.dormitoryWindow) this.dormitoryWindow.close();
    if (this.iselleReportWindow) this.iselleReportWindow.close();
    if (this.blacksmithWindow) this.blacksmithWindow.close();
    if (this.equipmentWindow) this.equipmentWindow.close();
    if (this.optionsWindow) this.optionsWindow.close();
    if (this.dungeonBoardWindow) this.dungeonBoardWindow.close();
    if (this.iselle) this.iselle.dispose();

    gameState.saveToLocalStorage();
    clearSystemMessages();
  }

  triggerForgeShowcase(item) {
    if (this.forgeShowcase) {
      this.scene.remove(this.forgeShowcase.model.group);
      this.forgeShowcase.model.dispose();
      this.forgeShowcase = null;
    }
    const modelData = mapItemToModel(item);
    if (!modelData.kind) return;
    const isShield = modelData.category === 'shield';
    const model = isShield
      ? createShieldModel(modelData.kind, modelData)
      : createWeaponModel(modelData.kind, modelData);

    const pos = this.town?.anchors?.anvil
      ? this.town.anchors.anvil.clone().add(new THREE.Vector3(0, 0.45, 0))
      : new THREE.Vector3(-16, 1.1, 12);
    model.group.position.copy(pos);
    if (isShield) {
      model.group.rotation.set(0, 0, Math.PI * 0.5);
    } else {
      model.group.rotation.set(0, 0, Math.PI * 0.45);
    }
    if (model.setGlow) model.setGlow(1.0);
    this.scene.add(model.group);

    spawnHitSparks(this.scene, pos, modelData.grade || 'E');

    this.forgeShowcase = {
      model,
      timer: 3.0,
      pos,
    };
  }

  applyLighting(force = false) {
    if (!this.town || !this.town.getLighting) return;
    const lighting = this.town.getLighting();
    if (!lighting) return;

    if (!this.scene.background) this.scene.background = new THREE.Color();
    this.scene.background.setHex(lighting.background);

    if (!this.scene.fog) {
      this.scene.fog = new THREE.Fog(lighting.fog.color, lighting.fog.near, lighting.fog.far);
    } else {
      this.scene.fog.color.setHex(lighting.fog.color);
      this.scene.fog.near = lighting.fog.near;
      this.scene.fog.far = lighting.fog.far;
    }

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = lighting.exposure;

    this.ambientLight.color.setHex(lighting.ambient.color);
    this.ambientLight.intensity = lighting.ambient.intensity;

    this.hemiLight.color.setHex(lighting.hemi.sky);
    this.hemiLight.groundColor.setHex(lighting.hemi.ground);
    this.hemiLight.intensity = lighting.hemi.intensity;

    this.sunLight.color.setHex(lighting.sun.color);
    this.sunLight.intensity = lighting.sun.intensity;
    this.sunLight.position.copy(lighting.sun.direction).multiplyScalar(80);
    this.sunLight.castShadow = false;
  }

  updatePointLightPool() {
    if (!this.town || !this.town.lights) return;
    const pPos = this.player.mesh.position;
    const lighting = this.town.getLighting ? this.town.getLighting() : null;
    const lampGlow = lighting?.lampGlow ?? 1.0;
    const windowGlow = lighting?.windowGlow ?? 1.0;

    const currentActive = this._activeLightSet || new Set();

    const candidates = this.town.lights.map((l, index) => {
      let d = pPos.distanceTo(l.position);
      if (currentActive.has(index)) {
        d -= 3.0; // Hysteresis advantage
      }
      return { light: l, index, dist: d };
    });

    candidates.sort((a, b) => a.dist - b.dist);
    const nextActive = new Set();

    for (let i = 0; i < 5; i++) {
      const pl = this.pointLightPool[i];
      if (i < candidates.length) {
        const item = candidates[i];
        const l = item.light;
        nextActive.add(item.index);

        const isWindow = (l.id && String(l.id).toLowerCase().includes('window')) || (l.type === 'window');
        const glow = isWindow ? windowGlow : lampGlow;

        pl.position.copy(l.position);
        pl.color.setHex(l.color);
        pl.intensity = (l.intensity || 1.0) * glow;
        pl.distance = l.distance || 16.0;
        pl.visible = pl.intensity > 0.01;
      } else {
        pl.visible = false;
      }
    }
    this._activeLightSet = nextActive;
  }

  checkAdaptiveQuality(delta) {
    if (this.adaptiveQualityLowered) return;
    this.fps6sTimer += delta;
    this.fps6sFrames++;

    if (this.fps6sTimer >= 6.0) {
      const avgFps = this.fps6sFrames / this.fps6sTimer;
      this.fps6sTimer = 0;
      this.fps6sFrames = 0;

      if (avgFps < 28) {
        const curQ = gameState.settings?.quality || 'medium';
        const nextQ = curQ === 'high' ? 'medium' : (curQ === 'medium' ? 'low' : null);
        if (nextQ) {
          gameState.settings.quality = nextQ;
          gameState.saveToLocalStorage();
          if (this.town) this.town.setQuality(nextQ);
          if (this.optionsWindow) this.optionsWindow.updateQualityBtnStyles();
          showSystemMessage('QUALITY LOWERED FOR SMOOTHER PLAY');
          this.adaptiveQualityLowered = true;
        }
      }
    }
  }

  updateF3DebugStats() {
    if (!this.hud || !this.hud.showF3) return;
    const phase = gameState.dayPhase;
    const isPaused = gameState.dayPaused ? ' [PAUSED]' : '';
    const q = gameState.settings?.quality || 'medium';
    const res = (gameState.settings?.resolutionScale ?? 1) * 100;
    const stats = this.town ? this.town.getStats() : null;
    const info = this.renderer.info.render;
    const activeLightsCount = this._activeLightSet ? this._activeLightSet.size : 0;

    let text = `TIME: ${phase.toFixed(3)}${isPaused} | QUALITY: ${q.toUpperCase()} | RES: ${res.toFixed(0)}%\n`;
    text += `LIGHTS: ${activeLightsCount} / 5 active point lights\n`;
    text += `TOTAL RENDER: ${info.triangles.toLocaleString()} tris | ${info.calls} calls\n`;
    if (stats) {
      text += `--- TOWN MODULES ---\n`;
      text += `Shell: ${stats.shell.triangles.toLocaleString()} tris | ${stats.shell.drawCallsEstimate} calls\n`;
      text += `Landmarks: ${stats.landmarks.triangles.toLocaleString()} tris | ${stats.landmarks.drawCallsEstimate} calls\n`;
      text += `  • Main: ${stats.landmarksMain.triangles.toLocaleString()} tris | ${stats.landmarksMain.drawCallsEstimate} calls\n`;
      text += `  • Work: ${stats.landmarksWork.triangles.toLocaleString()} tris | ${stats.landmarksWork.drawCallsEstimate} calls\n`;
      text += `Village: ${stats.village.triangles.toLocaleString()} tris | ${stats.village.drawCallsEstimate} calls\n`;
    }
    this.hud.updateF3(text);
  }

  update(delta) {
    if (!this.isActive) return;

    const time = performance.now() * 0.001;
    const windowOpen = isAnySystemWindowOpen();

    // The mouse steers the camera, so the pointer is hidden while playing
    // and restored for the UI windows and the tutorial dialogue.
    this.input.updateCursor(windowOpen);

    // 1. Tick Day Cycle & Phase
    gameState.tickDay(delta);
    const dayPhase = gameState.dayPhase;
    const isNight = dayPhase >= 0.78 && dayPhase < 0.97;

    if (this.town) {
      this.town.setTimeOfDay(dayPhase);
      this.town.update(delta, this.camera);
    }

    // 2. Throttle lighting & lights pool
    this.lightThrottleTimer += delta;
    if (this.lightThrottleTimer >= 0.08) {
      this.lightThrottleTimer = 0;
      this.applyLighting();
    }

    this.pointLightTimer += delta;
    if (this.pointLightTimer >= 0.25) {
      this.pointLightTimer = 0;
      this.updatePointLightPool();
    }

    // 3. Adaptive quality
    this.checkAdaptiveQuality(delta);
    if (this.hud.showF3) {
      this.updateF3DebugStats();
    }

    // 4. Night boost on HeroRig
    const nightBoost = isNight ? 0.12 : 0.0;
    if (this.player?.rig?.setAmbientBoost) {
      this.player.rig.setAmbientBoost(nightBoost);
    }
    if (this.heroesManager?.npcs) {
      for (const npc of this.heroesManager.npcs) {
        if (npc.rig?.setAmbientBoost) npc.rig.setAmbientBoost(nightBoost);
      }
    }

    // 5. Tick active Forge jobs
    const completedForgeJobs = gameState.updateForge(delta);
    if (completedForgeJobs && completedForgeJobs.length > 0) {
      for (const job of completedForgeJobs) {
        if (job.resultItem && !job.resultItem.isMaterial) {
          this.triggerForgeShowcase(job.resultItem);
        }
      }
    }
    if (this.blacksmithWindow && this.blacksmithWindow.isOpen()) {
      if ((gameState.forgeQueue || []).length > 0) {
        this.blacksmithWindow.render();
      }
    }

    // 6. Anvil rotating 3D forge showcase
    if (this.forgeShowcase) {
      this.forgeShowcase.timer -= delta;
      this.forgeShowcase.model.group.rotation.y += delta * 1.5;
      this.forgeShowcase.model.update(delta);
      if (this.forgeShowcase.timer <= 0) {
        this.scene.remove(this.forgeShowcase.model.group);
        this.forgeShowcase.model.dispose();
        this.forgeShowcase = null;
      }
    }

    // 7. Anvil hammer animation & sound if forge is active
    const isForging = (gameState.forgeQueue || []).length > 0;
    const bestSmith = getBestSmith(gameState.heroes);
    if (this.heroesManager && this.heroesManager.spawnedHeroes) {
      for (const npc of this.heroesManager.spawnedHeroes) {
        npc.isSmithingActive = isForging && bestSmith && (npc.heroData.id === bestSmith.hero.id);
      }
    }
    if (isForging) {
      this.anvilClangTimer = (this.anvilClangTimer || 0) + delta;
      if (this.anvilClangTimer >= 1.25) {
        this.anvilClangTimer = 0;
        this.playAnvilClang();
        const sparkPos = this.town?.anchors?.anvil || new THREE.Vector3(-16, 0.8, 12);
        spawnSparks(this.scene, sparkPos, 0xff7700, 15);
      }
    }

    // 8. 7-Star Awakening 3D Ritual
    if (this.isAwakeningActive) {
      this.awakeningTimer += delta;
      if (this.awakeningHeroMesh) {
        this.awakeningHeroMesh.position.y = Math.min(4.2, 0.6 + (this.awakeningTimer / 2.4) * 3.6);
        this.awakeningHeroMesh.rotation.y += delta * 1.5;
      }
      if (this.rainbowBeam) {
        this.rainbowBeam.rotation.y += delta * 2.5;
        const hue = (time * 0.6) % 1.0;
        this.rainbowBeam.material.color.setHSL(hue, 1.0, 0.65);
      }
      if (this.awakeningTimer >= 2.5 && this.whiteFlashEl.style.opacity === '0') {
        this.whiteFlashEl.style.opacity = '1.0';
        setTimeout(() => {
          this.whiteFlashEl.style.opacity = '0';
        }, 400);
      }
      if (this.awakeningTimer >= 3.4) {
        this.isAwakeningActive = false;
        if (this.awakeningHeroMesh) {
          this.scene.remove(this.awakeningHeroMesh);
          this.awakeningHeroMesh.traverse((c) => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
          });
          this.awakeningHeroMesh = null;
        }
        if (this.rainbowBeam) {
          this.scene.remove(this.rainbowBeam);
          this.rainbowBeam.geometry.dispose();
          this.rainbowBeam.material.dispose();
          this.rainbowBeam = null;
        }
        this.heroesManager.spawnHeroes(gameState.heroes, this.getWalkY);
        this.hud.updateCurrency(gameState.gold, gameState.gems, gameState.freeTickets);
      }
    }

    // 9. Camera overrides during Synthesis or Summoning
    if (this.synthesisEffect && this.synthesisEffect.active) {
      this.synthesisEffect.update(delta);
      this.thirdPersonCamera.update(1.0);
      this.iselle.update(delta, time, this.player.mesh.position, this.getWalkY, this.camera);
      this.heroesManager.update(delta, this.getWalkY, this.player.mesh.position, isNight, this, this.camera);
      this.trainingManager.update(delta, this.getWalkY);
      updateLabels(this.camera, this.heroesManager.getLabelSprites());
      return;
    }

    if (this.summonEffect && this.summonEffect.active) {
      this.summonEffect.update(delta);
      this.thirdPersonCamera.update(1.0);
      this.iselle.update(delta, time, this.player.mesh.position, this.getWalkY, this.camera);
      this.heroesManager.update(delta, this.getWalkY, this.player.mesh.position, isNight, this, this.camera);
      this.trainingManager.update(delta, this.getWalkY);
      updateLabels(this.camera, this.heroesManager.getLabelSprites());
      return;
    }

    // 10. Intro Flyover or Normal Player movement
    if (this.isIntroFlyover) {
      this.introFlyoverTimer += delta;
      const t = Math.min(1.0, this.introFlyoverTimer / this.introFlyoverDuration);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      const pX = this.player.mesh.position.x;
      const pY = this.player.mesh.position.y;
      const pZ = this.player.mesh.position.z;

      const camX = (1 - ease) * (Math.sin(ease * Math.PI * 0.6) * 40) + ease * (pX - 1.2);
      const camY = (1 - ease) * 70 + ease * (pY + 3.2);
      const camZ = (1 - ease) * (70 - ease * 25) + ease * (pZ + 5.5);

      const lookX = (1 - ease) * (20 * ease) + ease * pX;
      const lookY = (1 - ease) * (10 * (1 - ease)) + ease * (pY + 1.2);
      const lookZ = (1 - ease) * (26 * ease) + ease * pZ;

      this.camera.position.set(camX, camY, camZ);
      this.camera.lookAt(lookX, lookY, lookZ);

      if (t >= 1.0) {
        this.isIntroFlyover = false;
        this.thirdPersonCamera.update(1.0);
      }
    } else {
      const cameraYaw = this.thirdPersonCamera.getYaw();
      const effectiveInput = windowOpen
        ? {
            isDown: () => false,
            isActionDown: () => false,
            isLmbDown: () => false,
            isRmbDown: () => false,
            // Drain the real delta so the camera does not jump when the
            // window closes, but report no movement while it is open.
            consumeMouseDelta: () => {
              this.input.consumeMouseDelta();
              return { x: 0, y: 0 };
            },
          }
        : this.input;
      this.player.update(delta, effectiveInput, cameraYaw, this.collisionDungeon, this.thirdPersonCamera);

      const targetY = this.getWalkY(this.player.mesh.position.x, this.player.mesh.position.z);
      this.player.mesh.position.y += (targetY - this.player.mesh.position.y) * Math.min(1.0, 18 * delta);
      this.player.velocityY = 0;
      this.player.isGrounded = true;

      this.thirdPersonCamera.update(delta, effectiveInput);
    }

    // Runtime underground guard: snap entities up if feet stay > 0.4 below getWalkY for > 0.3s
    if (this.player?.mesh) {
      updateUndergroundGuard(this.player.mesh, delta, this.getWalkY);
    }
    if (this.heroesManager?.npcs) {
      for (const npc of this.heroesManager.npcs) {
        if (npc?.mesh) updateUndergroundGuard(npc.mesh, delta, this.getWalkY);
      }
    }

    // 11. Systems & Entities update
    this.iselle.update(delta, time, this.player.mesh.position, this.getWalkY, this.camera);
    this.heroesManager.update(delta, this.getWalkY, this.player.mesh.position, isNight, this, this.camera);
    this.trainingManager.update(delta, this.getWalkY);

    // A new game day means the daily decision has run: send every hero to the
    // activity that was chosen for them.
    if (gameState.dayCount !== this._lastActivityDay) {
      this._lastActivityDay = gameState.dayCount;
      // Drop any fights queued from the previous day before scheduling today's.
      this.sparringController.clearQueue();
      this.heroesManager.assignDailyActivities(
        LAYOUT.zones.training_grounds?.trainingZones,
        this.town?.anchors,
        this.sparringController
      );
      // The heroes who turned on each other fight it out in the open, in
      // full view, with the same fight engine the offline simulation uses.
      const pending = gameState.lastDayReport && gameState.lastDayReport.pendingFights;
      if (pending && pending.length > 0) {
        this.startPendingTownFights(pending);
      }
    }

    // Live sparring inside the training yard.
    this.sparringController.update(delta);

    if (this.showWalkHeightDebug) {
      this.updateWalkHeightDebug();
    }

    if (this.groundDebug) {
      this.groundDebug.update(delta);
    }

    // Semi-transparent hero / NPC fade when camera is closer than 1.6m
    if (this.camera) {
      updateHumanoidCameraFade(this.camera, [
        this.player.mesh,
        ...this.heroesManager.npcs.map((n) => n.mesh),
      ]);
      updateLabels(this.camera, this.heroesManager.getLabelSprites());
    }

    // 12. UI Updates
    this.hud.updateCurrency(gameState.gold, gameState.gems, gameState.freeTickets, gameState.dayCount);

    // Interaction prompt check
    const pPos = this.player.mesh.position;
    const nearBuilding = this.getNearestBuilding(pPos.x, pPos.z);
    if (nearBuilding && !windowOpen) {
      if (nearBuilding.id === 'space_time_rift' || nearBuilding.isGate) {
        if (this.isTowerGateLocked()) {
          this.hud.setPrompt('Press E: Space-Time Rift (HEROES UNARMED)');
        } else {
          this.hud.setPrompt('Press E: Space-Time Rift');
        }
      } else {
        this.hud.setPrompt(`Press E: ${nearBuilding.name}`);
      }
    } else {
      this.hud.setPrompt(null);
    }

    // 13. Render Minimap
    const minimapLandmarks = Object.entries(LAYOUT.zones).map(([id, z]) => {
      const doorAnchor = this.town?.anchors?.[`door_${id}`] || this.town?.anchors?.[`door_${id.replace('_row', '')}`];
      const markerX = doorAnchor ? doorAnchor.x : (z.door?.position?.x ?? z.center.x);
      const markerZ = doorAnchor ? doorAnchor.z : (z.door?.position?.z ?? z.center.z);
      return {
        name: z.name,
        x: markerX,
        z: markerZ,
        isGate: id === 'space_time_rift',
      };
    });
    this.hud.renderMinimap(
      pPos.x,
      pPos.z,
      this.player.mesh.rotation.y,
      minimapLandmarks
    );
  }
};
