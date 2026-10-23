import * as THREE from 'three';
import { LAYOUT, PLAYER_COLLISION, SHOW_COLLIDERS, getSignLayout } from '../../art/town/layout.js';
import { getGroundY } from '../../art/town/ground.js';
import { buildTown } from '../../art/town/TownAssembler.js';
import { HubHeroNPC } from '../../hub/HubHeroes.js';
import { Player } from '../../player/Player.js';
import { gameState } from '../../core/GameState.js';
import { showSystemMessage, isAnySystemWindowOpen } from '../../ui/Hud.js';
import { showEquipmentNotice } from '../../ui/Notices.js';
import { getAudioContext, getMasterVolume, isAudioMuted } from '../../core/AudioManager.js';
import { AccountCreationScreen } from '../../ui/AccountCreationScreen.js';
import { createSignLabelMesh, disposeSignLabelMesh } from '../../ui/Label.js';
import { NavGrid } from '../../hub/NavGrid.js';
import { buildWalkHeightMap } from '../../art/town/WalkHeight.js';

export const TownInitMixin = (Base) => class extends Base {
  playAnvilClang() {
    try {
      if (isAudioMuted()) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(840, t);
      osc1.frequency.exponentialRampToValueAtTime(320, t + 0.35);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1680, t);
      osc2.frequency.exponentialRampToValueAtTime(540, t + 0.25);

      const masterVol = getMasterVolume();
      gain.gain.setValueAtTime(0.25 * masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.5);
      osc2.stop(t + 0.5);
    } catch (e) {}
  }

  playAwakeningEffect(heroId) {
    const hero = gameState.heroes.find((h) => h.id === heroId);
    if (!hero) return;

    this.isAwakeningActive = true;
    this.awakeningTimer = 0;
    this.awakeningHeroId = heroId;

    const group = new THREE.Group();
    const torsoMat = new THREE.MeshStandardMaterial({ color: hero.armor || 0x334455, roughness: 0.8 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.35), torsoMat);
    torso.position.y = 1.0;
    group.add(torso);

    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcd94 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), headMat);
    head.position.y = 1.65;
    group.add(head);

    const hairMat = new THREE.MeshStandardMaterial({ color: hero.hair || 0x111111 });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
    hair.position.y = 1.66;
    group.add(hair);

    group.position.set(0, 0.6, 0);
    this.scene.add(group);
    this.awakeningHeroMesh = group;

    const beamGeo = new THREE.CylinderGeometry(1.6, 1.6, 20, 24, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    this.rainbowBeam = new THREE.Mesh(beamGeo, beamMat);
    this.rainbowBeam.position.set(0, 10, 0);
    this.scene.add(this.rainbowBeam);
  }

  checkWalkable(x, z) {
    if (this.navGrid) {
      return this.navGrid.isWalkable(x, z);
    }
    return Math.hypot(x, z) < 44.5;
  }

  getCottagePosition(houseIndex) {
    const idx = Math.max(0, Math.min(9, (houseIndex || 1) - 1));
    const c = LAYOUT.residences?.cottages?.[idx];
    if (c) {
      return { x: c.x, z: c.z, doorPos: c.door.position };
    }
    return { x: -26, z: -4 };
  }

  getNearestBuilding(px, pz) {
    // 1. Check cottage doors (within 3.5m)
    if (LAYOUT.residences?.cottages) {
      for (const c of LAYOUT.residences.cottages) {
        const dx = px - c.door.position.x;
        const dz = pz - c.door.position.z;
        if (Math.hypot(dx, dz) <= 3.5) {
          return {
            id: 'residences',
            name: `Dormitory (${c.id.replace('_', ' ').toUpperCase()})`,
            cottageId: c.id,
            x: c.door.position.x,
            z: c.door.position.z,
            isGate: false,
          };
        }
      }
    }

    // 2. Check landmark zones prioritizing module door anchors
    for (const [id, z] of Object.entries(LAYOUT.zones)) {
      const isGate = id === 'space_time_rift';
      const doorAnchor = this.town?.anchors?.[`door_${id}`] || this.town?.anchors?.[`door_${id.replace('_row', '')}`];
      const doorX = doorAnchor ? doorAnchor.x : z.door?.position?.x;
      const doorZ = doorAnchor ? doorAnchor.z : z.door?.position?.z;

      if (doorX !== undefined && doorZ !== undefined) {
        const dDist = Math.hypot(px - doorX, pz - doorZ);
        if (dDist <= 4.0) {
          return { id, name: z.name, x: doorX, z: doorZ, isGate };
        }
      }

      // Non-door zones (dungeon_board, town_square) or center proximity fallback
      const boardAnchor = id === 'dungeon_board' ? this.town?.anchors?.['sign_dungeon_board'] : null;
      const targetX = boardAnchor ? boardAnchor.x : z.center.x;
      const targetZ = boardAnchor ? boardAnchor.z : z.center.z;
      const cDist = Math.hypot(px - targetX, pz - targetZ);
      const maxRadius = id === 'town_square' ? 5.5 : Math.max(3.5, (z.radius || 3) * 0.45 + 1.5);
      if (cDist <= maxRadius) {
        return { id, name: z.name, x: targetX, z: targetZ, isGate };
      }
    }
    return null;
  }

  playRiftFlash(onComplete) {
    if (this.whiteFlashEl) {
      this.whiteFlashEl.style.transition = 'opacity 0.6s ease-in';
      this.whiteFlashEl.style.opacity = '1.0';
      setTimeout(() => {
        if (onComplete) onComplete();
        this.whiteFlashEl.style.transition = 'opacity 0.6s ease-out';
        this.whiteFlashEl.style.opacity = '0';
      }, 600);
    } else {
      if (onComplete) onComplete();
    }
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F1') {
        e.preventDefault();
        localStorage.removeItem('pickmeup_save_v1');
        location.reload();
        return;
      }

      if (e.code === 'F3') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug') !== '1') return;
        e.preventDefault();
        const active = this.hud.toggleF3();
        if (active) this.updateF3DebugStats();
        return;
      }

      if (e.code === 'F6') {
        e.preventDefault();
        const active = this.navGrid ? this.navGrid.toggleDebugMesh(this.scene, this.townColliders) : false;
        const stuckCount = HubHeroNPC.stuckCount || 0;
        console.log(`[NavGrid Debug (F6)] Debug mesh active: ${active} | Total stuck heroes count: ${stuckCount}`);
        showSystemMessage(`[NavGrid F6: Debug overlay ${active ? 'ENABLED' : 'DISABLED'} | Stuck incidents: ${stuckCount}]`);
        return;
      }

      if (e.code === 'F7') {
        e.preventDefault();
        console.group('=== [F7] HEROES AUDIT ===');
        const heroes = this.heroesManager.spawnedHeroes;
        console.log(`Inspecting ${heroes.length} active hero NPCs in scene:`);
        let anomalies = 0;
        heroes.forEach((npc) => {
          const name = npc.heroData.name;
          const px = npc.mesh.position.x;
          const py = npc.mesh.position.y;
          const pz = npc.mesh.position.z;
          const walkY = this.getWalkY(px, pz);
          const diff = py - walkY;
          let partCount = 0;
          let anyInvisible = false;
          let anyLowOpacity = false;

          npc.mesh.traverse((c) => {
            if (c.isMesh) {
              partCount++;
              if (!c.visible) anyInvisible = true;
              if (c.material && c.material.opacity !== undefined && c.material.opacity < 0.99) {
                anyLowOpacity = true;
              }
            }
          });

          const rig = npc.rig || npc.mesh._heroRig || npc.mesh.userData?.heroRig;
          const rigExists = !!rig;
          const currentPose = rig ? rig.currentPose : 'none';
          const opacity = rig ? (rig.group?.children[0]?.material?.opacity ?? 1.0) : 1.0;
          const feetWorldY = npc.mesh.position.y;

          console.log(`[Hero] ${name} (${npc.heroData.star}★ ${npc.heroData.class}) | rig: ${rigExists} | groupVisible: ${npc.mesh.visible} | parts: ${partCount} | feetWorldY: ${feetWorldY.toFixed(2)} | pose: ${currentPose} | opacity: ${opacity} | State: ${npc.state} | Pos: (${px.toFixed(2)}, ${py.toFixed(2)}, ${pz.toFixed(2)}) | WalkY: ${walkY.toFixed(2)} | Diff: ${diff.toFixed(2)}`);

          if (Math.abs(diff) > 0.1) {
            console.warn(`[AUDIT ANOMALY] ${name} feet y is outside tolerance (|py - walkY| > 0.1)! (${py.toFixed(2)} vs walkY ${walkY.toFixed(2)}, diff: ${diff.toFixed(2)})`);
            anomalies++;
          }
          if (npc.mesh.visible && !rigExists) {
            console.warn(`[AUDIT ANOMALY] ${name} missing HeroRig!`);
            anomalies++;
          }
        });
        console.groupEnd();
        showSystemMessage(`[Hero Audit (F7): Inspected ${heroes.length} heroes. Anomalies: ${anomalies}. See console.]`);
        return;
      }

      if (e.code === 'F12') {
        e.preventDefault();
        this.toggleWalkHeightDebug();
        return;
      }

      if (!this.isActive) return;

      // Options Window Toggle (Key O)
      if (e.code === 'KeyO') {
        if (this.optionsWindow.isOpen()) {
          this.optionsWindow.close();
        } else {
          this.optionsWindow.open();
        }
        return;
      }

      // Time of Day controls
      if (e.code === 'BracketLeft') {
        if (e.shiftKey) {
          gameState.dayPaused = !gameState.dayPaused;
          showSystemMessage(gameState.dayPaused ? '[DAY CYCLE PAUSED]' : '[DAY CYCLE RESUMED]');
        } else {
          gameState.setDayPhase(gameState.dayPhase - 0.05);
          if (this.town) this.town.setTimeOfDay(gameState.dayPhase);
          this.applyLighting(true);
          showSystemMessage(`[TIME: ${gameState.dayPhase.toFixed(2)}]`);
        }
        return;
      }

      if (e.code === 'BracketRight') {
        if (e.shiftKey) {
          // Jump to next keyframe
          const keyframes = [0.00, 0.30, 0.62, 0.78, 0.95];
          const cur = gameState.dayPhase;
          let nextKf = keyframes.find((kf) => kf > cur + 0.005);
          if (nextKf === undefined) nextKf = keyframes[0];
          gameState.setDayPhase(nextKf);
          if (this.town) this.town.setTimeOfDay(gameState.dayPhase);
          this.applyLighting(true);
          showSystemMessage(`[JUMPED TO KEYFRAME: ${nextKf.toFixed(2)}]`);
        } else {
          gameState.setDayPhase(gameState.dayPhase + 0.05);
          if (this.town) this.town.setTimeOfDay(gameState.dayPhase);
          this.applyLighting(true);
          showSystemMessage(`[TIME: ${gameState.dayPhase.toFixed(2)}]`);
        }
        return;
      }

      if (e.code === 'F9') {
        gameState.gems += 1000;
        this.hud.updateCurrency(gameState.gold, gameState.gems, gameState.freeTickets);
        showSystemMessage('[DEBUG: +1,000 Gems Added!]');
        return;
      }

      if (e.code === 'F10') {
        gameState.gold += 50000;
        this.hud.updateCurrency(gameState.gold, gameState.gems, gameState.freeTickets);
        showSystemMessage('[DEBUG: +50,000 Gold Added!]');
        return;
      }

      if (e.code === 'F11') {
        gameState.addMaterial('awakening_stone', 1);
        this.hud.updateCurrency(gameState.gold, gameState.gems, gameState.freeTickets);
        showSystemMessage('[DEBUG: +1 Awakening Stone Added!]');
        return;
      }

      if (e.code === 'F12') {
        gameState.addMaterial('goblin_hide', 20);
        gameState.addMaterial('crude_iron', 20);
        gameState.addMaterial('goblin_tooth', 20);
        gameState.addMaterial('iron_ingot', 20);
        gameState.addMaterial('orc_tusk', 20);
        this.hud.updateCurrency(gameState.gold, gameState.gems, gameState.freeTickets);
        showSystemMessage('[DEBUG: +20 to all basic materials added!]');
        return;
      }

      if (isAnySystemWindowOpen()) return;

      if (e.code === 'KeyR') {
        this.rosterWindow.open();
        return;
      }

      if (e.code === 'Space' && this.isIntroFlyover) {
        e.preventDefault();
        this.isIntroFlyover = false;
        this.thirdPersonCamera.update(1.0);
        return;
      }

      if (e.code === 'KeyE') {
        const pPos = this.player.mesh.position;
        const b = this.getNearestBuilding(pPos.x, pPos.z);
        if (b) {
          if (b.id === 'summoning_room' || b.name === 'Summoning Room' || b.name === 'Summoning House' || b.name === 'Summoning Altar') {
            this.summonWindow.open();
          } else if (b.id === 'residences' || b.name.startsWith('Dormitory') || b.name === 'Residences') {
            this.dormitoryWindow.open();
          } else if (b.id === 'training_grounds' || b.name === 'Training Grounds') {
            this.trainingWindow.open();
          } else if (b.id === 'synthesis_chamber' || b.name === 'Synthesis Chamber' || b.name === 'Synthesis Room') {
            this.synthesisWindow.open();
          } else if (b.id === 'armory' || b.name === 'Armory' || b.name === 'Blacksmith') {
            if (gameState.isFacilityUnlocked('blacksmith')) {
              this.blacksmithWindow.open();
            } else {
              showSystemMessage('[The Armory is locked. Clear Floor 5 to unlock.]');
            }
          } else if (b.id === 'space_time_rift' || b.isGate || b.name === 'Space-Time Rift' || b.name === 'Tower Gate') {
            this.requestTowerDeploy();
          } else if (b.id === 'dungeon_board' || b.name === 'Dungeon Board') {
            this.dungeonBoardWindow.open();
          } else if (b.id === 'mess_hall_row' || b.name === 'Mess Hall') {
            this.feedSquadAtMessHall();
          } else if (b.id === 'landing_area') {
            showSystemMessage('[Landing Area: Gate to the floating city Niflheimr.]');
          } else if (b.id === 'town_square') {
            showSystemMessage('[Town Square: The central plaza of Niflheimr.]');
          } else {
            showSystemMessage(`[${b.name} is not accessible yet]`);
          }
        }
      } else if (e.code === 'KeyT') {
        this.requestTowerDeploy();
      } else if (e.code === 'F2') {
        const inputVal = window.prompt(
          '[DEBUG] Enter floor number to set currentFloor (1-100):',
          gameState.currentFloor || 1
        );
        if (inputVal !== null) {
          const parsed = parseInt(inputVal, 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
            gameState.currentFloor = parsed;
            gameState.unlockedFloor = Math.max(gameState.unlockedFloor || 1, parsed);
            if (!gameState.flags) gameState.flags = {};
            gameState.flags.tutorialDone = true;
            gameState.saveToLocalStorage();
            showSystemMessage(`[DEBUG: Current floor set to Floor ${parsed}]`);
          }
        }
      }
    });
  }

  /**
   * Opens the deploy window. When the heroes are unarmed the player is asked:
   * summon equipment, or walk in bare-handed.
   */
  requestTowerDeploy() {
    if (!this.isTowerGateLocked()) {
      this.playRiftFlash(() => this.deployWindow.open());
      return;
    }
    showEquipmentNotice({
      onSummon: () => {
        this.summonWindow.open('equipment');
      },
      onEnterAnyway: () => {
        this.allowUnarmedDeploy = true;
        // The player already answered: do not ask again at ENTER FLOOR.
        if (this.deployWindow) this.deployWindow.equipNoticeDismissed = true;
        this.playRiftFlash(() => this.deployWindow.open());
      },
    });
  }

  isTowerGateLocked() {
    if (this.allowUnarmedDeploy) {
      return false;
    }
    if (gameState.flags?.tutorialDone) {
      return false;
    }

    const initialThree = ['hero_han', 'hero_jenna', 'hero_aaron'];
    for (const heroId of initialThree) {
      const hero = gameState.heroes.find((h) => h.id === heroId);
      if (!hero) continue;
      if (!hero.equipment || !hero.equipment.weapon) {
        return true;
      }
    }

    return false;
  }

  // Landmark sign labels. Each one is a flat plane glued to the front face of
  // its signpost board (0.03m proud of the board), so the text is centred on
  // the board, never mirrored, never clipped and never hidden behind it.
  createSignLabels() {
    for (const m of this.signLabels) {
      this.scene.remove(m);
      disposeSignLabelMesh(m);
    }
    this.signLabels = [];

    for (const id of Object.keys(LAYOUT.zones)) {
      const plan = getSignLayout(LAYOUT, id);
      if (!plan) continue;
      const mesh = createSignLabelMesh({
        text: plan.text,
        width: plan.label.width,
        height: plan.label.height
      });
      mesh.position.set(plan.labelX, plan.boardY, plan.labelZ);
      mesh.rotation.y = plan.rotY;
      this.scene.add(mesh);
      this.signLabels.push(mesh);
    }
  }

  enter(params = {}) {
    this.isActive = true;

    // 1. Build assembled town
    const quality = gameState.settings?.quality || 'medium';
    this.town = buildTown(LAYOUT, this.getGroundY, quality);
    this.scene.add(this.town.group);
    this.townColliders = this.town.colliders || [];
    this.townBlockers = this.town.blockers || [];

    // Player obstacle collision: the walk-height map only decides where the
    // hero stands, these shapes are what stop him.
    this.player.setTownBlockers(this.townBlockers, PLAYER_COLLISION);

    // Build WalkHeight map from town geometry
    if (this.walkHeightMap) this.walkHeightMap.dispose();
    this.walkHeightMap = buildWalkHeightMap(this.town.group, this.getGroundY, { minX: -50, maxX: 50, minZ: -50, maxZ: 50 }, 0.5);

    // Debug wireframe of the player collision shapes (SHOW_COLLIDERS)
    if (SHOW_COLLIDERS) this.buildColliderDebug();

    // Camera segment colliders
    this.thirdPersonCamera.setColliders(this.townColliders);

    // Rebuild NavGrid from colliders and door corridors
    const corridors = Object.values(LAYOUT.zones)
      .map((z) => z.doorCorridor)
      .filter(Boolean);
    for (const [id, z] of Object.entries(LAYOUT.zones)) {
      const doorAnchor = this.town?.anchors?.[`door_${id}`] || this.town?.anchors?.[`door_${id.replace('_row', '')}`];
      if (doorAnchor) {
        corridors.push({
          minX: doorAnchor.x - 1.5,
          maxX: doorAnchor.x + 1.5,
          minZ: doorAnchor.z - 1.5,
          maxZ: doorAnchor.z + 1.5,
        });
      }
    }
    if (LAYOUT.residences?.cottages) {
      LAYOUT.residences.cottages.forEach((c) => {
        if (c.doorCorridor) corridors.push(c.doorCorridor);
      });
    }
    this.navGrid.rebuildFromTown(this.townColliders, corridors, LAYOUT.zones);

    // Provide dummy anchors to training manager
    this.trainingManager.setAnchors(this.town.anchors);
    this.sparringController.setAnchors(
      this.town.anchors,
      LAYOUT.zones.training_grounds?.trainingZones?.sparring_ring?.radius || 2.2
    );

    // Create landmark sign labels
    this.createSignLabels();

    // Initial resolution & time of day lighting
    const resScale = gameState.settings?.resolutionScale ?? 1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * resScale);
    this.town.setTimeOfDay(gameState.dayPhase);
    this.applyLighting(true);
    this.updatePointLightPool();

    // Spawn player at Landing Area (20, 26) using getWalkY
    const spawnY = this.getWalkY(20, 26);
    this.player.mesh.position.set(20, spawnY, 26);
    this.player.velocityY = 0;
    this.player.isGrounded = true;
    this.thirdPersonCamera.update(1.0);

    // HUD and Training sync
    this.hud.show();
    this.hud.updateCurrency(gameState.gold, gameState.gems, gameState.freeTickets, gameState.dayCount);
    this.trainingManager.syncWithGameState(this.getWalkY);

    if (!this.flyoverHasPlayed) {
      this.isIntroFlyover = true;
      this.introFlyoverTimer = 0;
      this.flyoverHasPlayed = true;
      this.camera.position.set(0, 70, 70);
      this.camera.lookAt(0, 0, 0);
    }

    if (params?.floorCleared || params?.clearedFloor) {
      if (this.iselle) {
        this.iselle.group.position.set(22, spawnY + 2.4, 24);
        this.iselle.say('floorClear', { force: true });
      }
    } else if (params?.heroesDied || params?.anyDead) {
      if (this.iselle) {
        this.iselle.say('heroDied', { force: true });
      }
    } else {
      showSystemMessage('[Welcome to Niflheimr]');
    }

    // Account Creation (if no masterName set)
    if (!gameState.masterName) {
      if (!this.accountCreationScreen) {
        this.accountCreationScreen = new AccountCreationScreen(() => {
          showSystemMessage('[Welcome to the world of Pick Me Up!]');
          this.checkOfflineLoginReport();
        });
      }
      this.accountCreationScreen.open();
      return;
    }

    this.checkOfflineLoginReport();
  }
};
