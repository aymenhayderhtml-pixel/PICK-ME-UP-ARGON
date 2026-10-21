import * as THREE from 'three';
import { LAYOUT } from '../art/town/layout.js';
import { getGroundY } from '../art/town/ground.js';
import { buildTown } from '../art/town/TownAssembler.js';
import { Iselle } from '../hub/Iselle.js';
import { HubHeroesManager, HubHeroNPC } from '../hub/HubHeroes.js';
import { Player } from '../player/Player.js';
import { ThirdPersonCamera } from '../player/ThirdPersonCamera.js';
import { gameState } from '../core/GameState.js';
import { HubHud } from '../ui/HubHud.js';
import { showSystemMessage, clearSystemMessages, isAnySystemWindowOpen } from '../ui/Hud.js';
import { queueHeroWalkoutNotice, showEquipmentNotice } from '../ui/Notices.js';
import { SummonWindow } from '../ui/SummonWindow.js';
import { SummonEffect } from '../gacha/SummonEffect.js';
import { RosterWindow } from '../ui/RosterWindow.js';
import { DeployWindow } from '../ui/DeployWindow.js';
import { SynthesisWindow } from '../ui/SynthesisWindow.js';
import { SynthesisEffect } from '../hub/SynthesisEffect.js';
import { TrainingWindow } from '../ui/TrainingWindow.js';
import { DormitoryWindow } from '../ui/DormitoryWindow.js';
import { BlacksmithWindow } from '../ui/BlacksmithWindow.js';
import { EquipmentWindow } from '../ui/EquipmentWindow.js';
import { DungeonBoardWindow } from '../ui/DungeonBoardWindow.js';
import { OptionsWindow } from '../ui/OptionsWindow.js';
import { IselleReportWindow } from '../ui/IselleReportWindow.js';
import { runOfflineLoginSimulation } from '../core/LoginSimulation.js';
import { TownSparringController } from '../hub/TownSparringController.js';
import { applyEatOutcome } from '../core/EmotionEngine.js';
import { TrainingManager } from '../hub/TrainingManager.js';
import { pickLine } from '../data/iselle.js';
import { updateHumanoidCameraFade } from '../core/CameraFade.js';
import { getBestSmith } from '../core/Inventory.js';
import { spawnSparks } from '../combat/Combat.js';
import { createWeaponModel, createShieldModel } from '../art/weapons.js';
import { mapItemToModel } from '../art/itemModels.js';
import { spawnHitSparks } from '../fx/WeaponFX.js';
import { AccountCreationScreen } from '../ui/AccountCreationScreen.js';
import { IselleTutorial } from '../ui/IselleTutorial.js';
import { createHeroFromTemplate } from '../data/heroes.js';
import { createLabelSprite, updateLabels } from '../ui/Label.js';
import { NavGrid } from '../hub/NavGrid.js';
import { buildWalkHeightMap, updateUndergroundGuard } from '../art/town/WalkHeight.js';
import { GroundDebug } from '../debug/GroundDebug.js';

export class HubScene {
  constructor(renderer, input) {
    this.renderer = renderer;
    this.input = input;
    this.getGroundY = getGroundY;
    this.walkHeightMap = null;
    this.getWalkY = (x, z) => (this.walkHeightMap ? this.walkHeightMap.getWalkY(x, z) : this.getGroundY(x, z));

    // Walk height map debug toggle (F12)
    this.showWalkHeightDebug = false;
    this.walkHeightDebugPoints = null;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f2a33);
    this.scene.fog = new THREE.Fog(0x1d4a55, 50, 170);

    // Dynamic base lighting driven by shell.getLighting()
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.sunLight.castShadow = false;
    this.scene.add(this.sunLight);

    // Dynamic 5-PointLight Pool (Engine Light Budget)
    this.pointLightPool = [];
    for (let i = 0; i < 5; i++) {
      const pl = new THREE.PointLight(0xffffff, 0, 16);
      pl.visible = false;
      this.scene.add(pl);
      this.pointLightPool.push(pl);
    }
    this._activeLightSet = new Set();
    this.pointLightTimer = 0;

    // 2. Camera setup
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Cinematic Intro Flyover State
    this.isIntroFlyover = false;
    this.introFlyoverTimer = 0;
    this.introFlyoverDuration = 6.0;
    this.flyoverHasPlayed = false;

    // 3. Town container & navigation grid
    this.town = null;
    this.townColliders = [];
    this.signSprites = [];
    this.navGrid = new NavGrid(this.getGroundY);

    // 4. Player (spawned at Landing Area (20, 26))
    this.player = new Player(this.scene);
    this.scene.add(this.player.mesh);
    this.player.mesh.position.set(20, this.getWalkY(20, 26), 26);

    this.thirdPersonCamera = new ThirdPersonCamera(this.camera, this.player.mesh);
    this.thirdPersonCamera.getGroundY = (x, z) => this.getWalkY(x, z);

    // 5. Iselle & Hub Heroes NPC Manager
    this.iselle = new Iselle(this.scene);
    this.heroesManager = new HubHeroesManager(this.scene, this.iselle, this.navGrid);
    this.accountCreationScreen = null;
    this.iselleTutorial = null;

    // 5b. Live sparring inside the training yard
    this.sparringController = new TownSparringController(
      this.scene,
      this.heroesManager,
      this.iselle,
      this.navGrid
    );
    this._lastActivityDay = 0;

    // 6. Collision adapter for Player.update()
    this.collisionDungeon = {
      isWalkable: (x, z) => this.checkWalkable(x, z),
      getGroundY: (x, z) => this.getWalkY(x, z),
    };

    // 7. Gacha Summon Window and Effect
    this.summonEffect = new SummonEffect(this);
    this.summonWindow = new SummonWindow(
      (pulled) => {
        this.summonEffect.play(pulled);
      },
      (count, pulledItems) => {
        this.hud.updateCurrency(gameState.gold, gameState.gems, gameState.freeTickets);
        if (count === 10) {
          this.summonWindow.close();
          this.equipmentWindow.open(null, true);
        }
        showSystemMessage('[Iselle]: "A gift for finishing the tutorial: one premium summon."');
      }
    );

    // 8. Synthesis 3D Effect and Window
    this.synthesisEffect = new SynthesisEffect(this);
    this.synthesisWindow = new SynthesisWindow((baseId, matIds) => {
      const baseHero = gameState.heroes.find((h) => h.id === baseId);
      const matHeroes = matIds
        .map((id) => gameState.heroes.find((h) => h.id === id))
        .filter(Boolean);
      if (!baseHero || matHeroes.length === 0) return;

      if (this.iselle) {
        this.iselle.overrideTarget = new THREE.Vector3(-18, 3.2, 10);
        this.iselle.say('synthesisStart', { force: true });
      }

      this.synthesisEffect.play(baseHero, matHeroes, () => {
        if (this.iselle) this.iselle.overrideTarget = null;
        const res = gameState.synthesizeHeroes(baseId, matIds);
        this.heroesManager.spawnHeroes(gameState.heroes, this.getWalkY);
        this.hud.updateCurrency(gameState.gold, gameState.gems, gameState.freeTickets);
        const matNames = matHeroes.map((m) => m.name).join(', ');
        const gainDesc = res.inheritedSkills && res.inheritedSkills.length > 0
          ? res.inheritedSkills.map((sk) => `${sk.name} (Lv ${sk.level})`).join(', ')
          : `${res.expGained || 0} EXP`;
        showSystemMessage(`[Synthesis complete. ${matNames} was absorbed. ${baseHero.name} gained ${gainDesc}.]`);
        if (res.inheritedSkills && res.inheritedSkills.length > 0) {
          res.inheritedSkills.forEach((sk) => {
            showSystemMessage(`[Skill Inherited: ${sk.name} (Lv ${sk.level})]`);
          });
        }
      });
    });

    // 9. Deploy Window
    this.deployWindow = new DeployWindow(
      (floor) => {
        if (this.sceneManager) {
          this.sceneManager.switchTo('tower', { floor });
        }
      },
      () => {
        this.summonWindow.open('equipment');
      }
    );

    // Dungeon Board Window
    this.dungeonBoardWindow = new DungeonBoardWindow(
      () => {
        this.deployWindow.open();
      },
      (difficulty) => {
        if (this.sceneManager) {
          this.sceneManager.switchTo('tower', { mode: 'hunt', difficulty });
        }
      },
      (difficulty) => {
        if (this.sceneManager) {
          this.sceneManager.switchTo('tower', { mode: 'mine', difficulty });
        }
      }
    );

    // 10. Roster Window
    this.rosterWindow = new RosterWindow(
      (baseHeroId) => {
        this.synthesisWindow.open(baseHeroId);
      },
      () => {
        this.heroesManager.spawnHeroes(gameState.heroes, this.getWalkY);
        this.hud.updateCurrency(gameState.gold, gameState.gems, gameState.freeTickets);
      },
      (heroId) => {
        this.playAwakeningEffect(heroId);
      },
      () => {
        this.showLatestIselleReport();
      }
    );

    // 11. Training Grounds Manager & Window
    this.trainingManager = new TrainingManager(this.scene);
    this.trainingWindow = new TrainingWindow(
      (slot, heroId, skillId) => this.trainingManager.startTraining(slot, heroId, skillId),
      (slot) => this.trainingManager.stopTraining(slot)
    );

    // 12. Dormitory Window
    this.dormitoryWindow = new DormitoryWindow(() => {
      this.heroesManager.restAll();
    });

    // 12b. Iselle's Report (login report)
    this.iselleReportWindow = new IselleReportWindow(() => {
      // The report is dismissed: respawn the roster so the fallen heroes are gone.
      this.heroesManager.spawnHeroes(gameState.heroes, this.getWalkY);
      this.hud.updateCurrency(gameState.gold, gameState.gems, gameState.freeTickets);
    });

    // 13. Blacksmith Window
    this.blacksmithWindow = new BlacksmithWindow(
      () => {},
      () => this.hud.updateCurrency(gameState.gold, gameState.gems, gameState.freeTickets)
    );

    // 14. Equipment Window
    this.equipmentWindow = new EquipmentWindow(() => {
      this.hud.updateCurrency(gameState.gold, gameState.gems, gameState.freeTickets);
    });

    // 15. Options Window
    this.optionsWindow = new OptionsWindow({
      onQualityChange: (q) => {
        if (this.town) {
          this.town.setQuality(q);
          if (this.walkHeightMap) this.walkHeightMap.dispose();
          this.walkHeightMap = buildWalkHeightMap(this.town.group, this.getGroundY, { minX: -50, maxX: 50, minZ: -50, maxZ: 50 }, 0.5);
        }
      },
      onResolutionChange: (resScale) => {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * resScale);
      },
      onFpsToggle: (show) => {
        // Toggled directly via fpsCounter
      },
      onVolumeChange: (vol) => {
        // Handled via window.__audioMaster
      }
    });

    // 16. Hub HUD
    this.hud = new HubHud();

    // Blacksmith & Awakening FX State
    this.anvilClangTimer = 0;
    this.forgeShowcase = null;
    this.isAwakeningActive = false;
    this.awakeningTimer = 0;
    this.awakeningHeroId = null;
    this.awakeningHeroMesh = null;
    this.rainbowBeam = null;

    this.whiteFlashEl = document.createElement('div');
    this.whiteFlashEl.style.position = 'fixed';
    this.whiteFlashEl.style.top = '0';
    this.whiteFlashEl.style.left = '0';
    this.whiteFlashEl.style.width = '100vw';
    this.whiteFlashEl.style.height = '100vh';
    this.whiteFlashEl.style.backgroundColor = '#ffffff';
    this.whiteFlashEl.style.zIndex = '10020';
    this.whiteFlashEl.style.pointerEvents = 'none';
    this.whiteFlashEl.style.opacity = '0';
    this.whiteFlashEl.style.transition = 'opacity 0.6s ease-out';
    document.body.appendChild(this.whiteFlashEl);

    // Performance & Adaptive Quality
    this.fpsTimer = 0;
    this.fpsFrames = 0;
    this.currentFps = 60;
    this.fps6sTimer = 0;
    this.fps6sFrames = 0;
    this.adaptiveQualityLowered = false;

    this.lightThrottleTimer = 0;
    this.isActive = false;
    this.setupInputs();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  playAnvilClang() {
    try {
      if (window.__audioMaster && window.__audioMaster.isMuted) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const t = this.audioCtx.currentTime;

      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(840, t);
      osc1.frequency.exponentialRampToValueAtTime(320, t + 0.35);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1680, t);
      osc2.frequency.exponentialRampToValueAtTime(540, t + 0.25);

      const masterVol = window.__audioMaster ? window.__audioMaster.masterVolume : 0.3;
      gain.gain.setValueAtTime(0.25 * masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

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

      if (e.code === 'KeyF9') {
        gameState.gems += 1000;
        this.hud.updateCurrency(gameState.gold, gameState.gems, gameState.freeTickets);
        showSystemMessage('[DEBUG: +1,000 Gems Added!]');
        return;
      }

      if (e.code === 'KeyF10') {
        gameState.gold += 50000;
        this.hud.updateCurrency(gameState.gold, gameState.gems, gameState.freeTickets);
        showSystemMessage('[DEBUG: +50,000 Gold Added!]');
        return;
      }

      if (e.code === 'KeyF11') {
        gameState.addMaterial('awakening_stone', 1);
        this.hud.updateCurrency(gameState.gold, gameState.gems, gameState.freeTickets);
        showSystemMessage('[DEBUG: +1 Awakening Stone Added!]');
        return;
      }

      if (e.code === 'KeyF12') {
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
            if (this.isTowerGateLocked()) {
              showSystemMessage('[EQUIP YOUR HEROES FIRST]');
              return;
            }
            this.playRiftFlash(() => this.deployWindow.open());
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
        if (this.isTowerGateLocked()) {
          showSystemMessage('[EQUIP YOUR HEROES FIRST]');
          return;
        }
        this.playRiftFlash(() => this.deployWindow.open());
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

  isTowerGateLocked() {
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

  createSignSprites() {
    for (const s of this.signSprites) {
      this.scene.remove(s);
      if (s.material?.map) s.material.map.dispose();
      if (s.material) s.material.dispose();
    }
    this.signSprites = [];

    for (const [id, z] of Object.entries(LAYOUT.zones)) {
      const anchorKey = `sign_${id}`;
      const altKey = `sign_${id.replace('_row', '')}`;
      let pos = this.town?.anchors?.[anchorKey] || this.town?.anchors?.[altKey];
      if (!pos) {
        pos = new THREE.Vector3(z.center.x, this.getWalkY(z.center.x, z.center.z) + 3.0, z.center.z);
      }
      const sprite = createLabelSprite({ text: z.name.toUpperCase(), isSign: true });
      sprite.position.copy(pos);
      this.scene.add(sprite);
      this.signSprites.push(sprite);
    }
  }

  enter(params = {}) {
    this.isActive = true;

    // 1. Build assembled town
    const quality = gameState.settings?.quality || 'medium';
    this.town = buildTown(LAYOUT, this.getGroundY, quality);
    this.scene.add(this.town.group);
    this.townColliders = this.town.colliders || [];

    // Build WalkHeight map from town geometry
    if (this.walkHeightMap) this.walkHeightMap.dispose();
    this.walkHeightMap = buildWalkHeightMap(this.town.group, this.getGroundY, { minX: -50, maxX: 50, minZ: -50, maxZ: 50 }, 0.5);

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

    // Create landmark sign sprites
    this.createSignSprites();

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

  /**
   * Runs the offline simulation for the time the player was away and shows
   * "Iselle's Report" before gameplay. Uses the SAME simulation code path as
   * live play (src/core/DailyDecisionEngine.js).
   */
  checkOfflineLoginReport() {
    const report = runOfflineLoginSimulation(gameState, Date.now(), { isellePresent: true });
    if (report) {
      report.iselleQuote = pickLine(report.hasIncident ? 'reportIncident' : 'reportPeaceful');
      this.iselleReportWindow.openReport(report);
      if (this.iselle) {
        this.iselle.say('reportIntro', { force: true, text: report.iselleQuote });
      }
      if (report.fallenHeroes && report.fallenHeroes.length > 0) {
        // A hero who died while the player was away dissolves into light.
        this.playHeroDissolve(report.fallenHeroes.length);
        if (this.iselle) {
          this.iselle.say('heroDied', { force: true });
        }
      }
      return;
    }
    this.checkTutorial();
  }

  /**
   * The light pillar that marks a hero who died while the player was away.
   */
  playHeroDissolve(count = 1) {
    const cfg = LAYOUT.zones.training_grounds;
    const x = cfg ? cfg.center.x : -24;
    const z = cfg ? cfg.center.z : 20;
    const y = this.getWalkY(x, z);
    for (let i = 0; i < Math.min(count, 5); i++) {
      const offset = (i - (Math.min(count, 5) - 1) / 2) * 0.9;
      spawnSparks(
        this.scene,
        new THREE.Vector3(x + offset, y + 1.1, z),
        0xa8f4ff,
        18
      );
    }
  }

  /** Shows the most recent "Iselle's Report" from the login report history. */
  showLatestIselleReport() {
    const history = gameState.loginReportHistory || [];
    if (history.length === 0) {
      showSystemMessage('[No report yet. Come back after being away for a while.]');
      return;
    }
    const report = history[0];
    if (!report.iselleQuote) {
      report.iselleQuote = pickLine(report.hasIncident ? 'reportIncident' : 'reportPeaceful');
    }
    this.iselleReportWindow.openReport(report);
  }

  /**
   * Feeds the squad at the Mess Hall. Heroes who are hungry eat, which lowers
   * their hunger and raises their motivation.
   */
  feedSquadAtMessHall() {
    const party = (gameState.party || []).map((p) => (typeof p === 'string' ? p : p.id));
    let count = 0;
    for (const id of party) {
      const hero = gameState.heroes.find((h) => h.id === id && h.alive);
      if (!hero) continue;
      applyEatOutcome(hero, gameState.foodQuality);
      count++;
    }
    showSystemMessage(`[The squad eats at the Mess Hall. ${count} fed.]`);
    gameState.saveToLocalStorage();
  }

  checkTutorial() {
    // Iselle Tutorial
    if (!gameState.flags?.tutorialSeen) {
      if (!this.iselleTutorial) {
        this.iselleTutorial = new IselleTutorial(() => {
          if (!gameState.flags) gameState.flags = {};
          gameState.flags.tutorialSeen = true;
          gameState.saveToLocalStorage();
          this.playTutorialWalkout();
        }, this.iselle);
      }
      this.iselleTutorial.open();
      return;
    }

    // Tutorial walkout
    if (!gameState.flags?.tutorialWalkoutDone) {
      this.playTutorialWalkout();
      return;
    }

    // Ground Contact Debug Overlay (Backslash key)
    if (this.groundDebug) this.groundDebug.dispose();
    this.groundDebug = new GroundDebug(this);

    // Normal hero spawning in hub
    this.heroesManager.spawnHeroes(gameState.heroes, this.getWalkY);

    // Scripted punishment
    if (!gameState.flags?.tutorialPunishmentDone) {
      setTimeout(() => {
        if (!this.isActive) return;
        this.triggerScriptedPunishment();
      }, 1500);
      return;
    }

    // Equipment notice
    if (!gameState.equipmentSummoned && !gameState.flags?.equipmentSummoned) {
      this.showIselleEquipmentPrompt();
    }

    // Jenna & Aaron arrival after Floor 1 clear
    if ((gameState.clearedFloors >= 1 || gameState.unlockedFloor > 1) && !gameState.flags?.jennaAaronArrived) {
      if (!gameState.flags) gameState.flags = {};
      gameState.flags.jennaAaronArrived = true;
      if (!gameState.heroes.some((h) => h.name === 'Jenna')) {
        gameState.addHero(createHeroFromTemplate('JENNA'));
      }
      if (!gameState.heroes.some((h) => h.name === 'Aaron')) {
        gameState.addHero(createHeroFromTemplate('AARON'));
      }
      gameState.saveToLocalStorage();
      this.playJennaAaronWalkout();
      return;
    }

    // Hero death reaction
    if (gameState.deadHeroes && gameState.deadHeroes.length > 0 && !gameState.flags?.heroDiedReactionPlayed) {
      if (!gameState.flags) gameState.flags = {};
      gameState.flags.heroDiedReactionPlayed = true;
      gameState.saveToLocalStorage();
      if (this.iselle) {
        this.iselle.say('heroDied', { force: true });
      }
    }
  }

  playTutorialWalkout() {
    this.heroesManager.clear();
    const heroes = gameState.heroes.slice(0, 5);
    const targets = [
      new THREE.Vector3(20, this.getGroundY(20, 26), 26),
      new THREE.Vector3(18, this.getGroundY(18, 24), 24),
      new THREE.Vector3(22, this.getGroundY(22, 24), 24),
      new THREE.Vector3(17, this.getGroundY(17, 28), 28),
      new THREE.Vector3(23, this.getGroundY(23, 28), 28),
    ];

    const corridorWaypoints = (LAYOUT.zones.summoning_room?.doorCorridor || [
      { x: 30, z: 4 },
      { x: 26.5, z: 9.0 },
      { x: 23.5, z: 14.5 },
      { x: 20, z: 26 },
    ]).map((pt) => new THREE.Vector3(pt.x, this.getGroundY(pt.x, pt.z), pt.z));

    heroes.forEach((h, index) => {
      setTimeout(() => {
        if (!this.isActive) return;
        const npc = new HubHeroNPC(h, this.scene, (obj) => this.heroesManager.handleRuleBreak(obj), (x, z) => this.getGroundY(x, z), this.navGrid);
        const spawnY = this.getGroundY(30, 4) + 1.8;
        npc.mesh.position.set(30, spawnY, 4);
        const finalTarget = targets[index] || new THREE.Vector3(20, this.getGroundY(20, 26), 26);
        npc.corridorQueue = [
          ...corridorWaypoints.slice(1, -1),
          finalTarget,
        ];
        npc.corridorIndex = 0;
        npc.state = 'walk_corridor';
        npc.speed = 2.4;
        npc.onCorridorFinish = () => {
          npc.state = 'idle';
          npc.timer = 2 + Math.random() * 3;
        };
        this.heroesManager.npcs.push(npc);

        if (h.id === 'hero_han') {
          npc.showSpeechBubble('...I am Han Islat.', 4.0);
        } else {
          npc.showSpeechBubble(`I am ${h.name}, a former ${h.pastJob || 'peasant'}.`, 4.0);
        }

        if (index === heroes.length - 1) {
          if (!gameState.flags) gameState.flags = {};
          gameState.flags.tutorialWalkoutDone = true;
          gameState.saveToLocalStorage();
          queueHeroWalkoutNotice(heroes);
          setTimeout(() => {
            if (!this.isActive) return;
            this.triggerScriptedPunishment();
          }, 3500);
        }
      }, index * 1200);
    });
  }

  triggerScriptedPunishment() {
    const target = this.heroesManager.npcs.find(
      (n) => n.heroData.cooperation === 'uncooperative' && n.heroData.id !== 'hero_han'
    ) || this.heroesManager.npcs[1];

    if (!target) return;
    this.heroesManager.triggerPunishmentOnNpc(target, () => {
      if (!gameState.flags) gameState.flags = {};
      gameState.flags.tutorialPunishmentDone = true;
      gameState.flags.tutorialStep = 4;
      gameState.saveToLocalStorage();
      showSystemMessage('[TUTORIAL: RULE BREAKERS HAVE BEEN WARNED]');
      setTimeout(() => {
        if (this.isActive) this.showIselleEquipmentPrompt();
      }, 1500);
    });
  }

  showIselleEquipmentPrompt() {
    if (this.iselle) {
      this.iselle.overrideTarget = new THREE.Vector3(20, 3.2, 26);
      this.iselle.say('equipmentPrompt', { force: true });
    }
    showEquipmentNotice(() => {
      this.summonWindow.open('equipment');
    });
  }

  playJennaAaronWalkout() {
    const jenna = gameState.heroes.find((h) => h.name === 'Jenna');
    const aaron = gameState.heroes.find((h) => h.name === 'Aaron');
    const arrivals = [jenna, aaron].filter(Boolean);

    showSystemMessage('[Jenna and Aaron have arrived]');
    queueHeroWalkoutNotice(arrivals);
    setTimeout(() => {
      showSystemMessage('[Iselle]: "Two promising warriors summoned by the goddess have arrived."');
    }, 1200);

    const corridorWaypoints = (LAYOUT.zones.summoning_room?.doorCorridor || [
      { x: 30, z: 4 },
      { x: 26.5, z: 9.0 },
      { x: 23.5, z: 14.5 },
      { x: 20, z: 26 },
    ]).map((pt) => new THREE.Vector3(pt.x, this.getWalkY(pt.x, pt.z), pt.z));

    arrivals.forEach((h, idx) => {
      setTimeout(() => {
        if (!this.isActive) return;
        const targetX = idx === 0 ? 18.0 : 22.0;
        const targetZ = 25.0;
        const targetY = this.getWalkY(targetX, targetZ);
        const spawnY = this.getWalkY(30, 4);
        const npc = new HubHeroNPC(h, this.scene, (obj) => this.heroesManager.handleRuleBreak(obj), (x, z) => this.getWalkY(x, z), this.navGrid);
        npc.mesh.position.set(30, spawnY, 4);
        npc.corridorQueue = [
          ...corridorWaypoints.slice(1, -1),
          new THREE.Vector3(targetX, targetY, targetZ),
        ];
        npc.corridorIndex = 0;
        npc.state = 'walk_corridor';
        npc.speed = 2.4;
        npc.onCorridorFinish = () => {
          npc.state = 'idle';
          npc.timer = 2 + Math.random() * 3;
        };
        this.heroesManager.npcs.push(npc);
        npc.showSpeechBubble(idx === 0 ? 'I am Jenna... where is this?' : 'I am Aaron. I will protect you!', 3.5);
      }, idx * 1800);
    });
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

    for (const s of this.signSprites) {
      this.scene.remove(s);
      if (s.material?.map) s.material.map.dispose();
      if (s.material) s.material.dispose();
    }
    this.signSprites = [];

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

    // 3. FPS tracking & adaptive quality
    this.fpsFrames++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsTimer);
      this.fpsFrames = 0;
      this.fpsTimer = 0;
      this.hud.updateFps(this.currentFps, gameState.settings?.showFps);
    }
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
      updateLabels(this.camera, this.heroesManager.getLabelSprites(), this.signSprites);
      return;
    }

    if (this.summonEffect && this.summonEffect.active) {
      this.summonEffect.update(delta);
      this.thirdPersonCamera.update(1.0);
      this.iselle.update(delta, time, this.player.mesh.position, this.getWalkY, this.camera);
      this.heroesManager.update(delta, this.getWalkY, this.player.mesh.position, isNight, this, this.camera);
      this.trainingManager.update(delta, this.getWalkY);
      updateLabels(this.camera, this.heroesManager.getLabelSprites(), this.signSprites);
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
            consumeMouseDelta: () => ({ x: 0, y: 0 }),
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
      this.heroesManager.assignDailyActivities(
        LAYOUT.zones.training_grounds?.trainingZones,
        this.town?.anchors,
        this.sparringController
      );
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
      updateLabels(this.camera, this.heroesManager.getLabelSprites(), this.signSprites);
    }

    // 12. UI Updates
    this.hud.updateCurrency(gameState.gold, gameState.gems, gameState.freeTickets, gameState.dayCount);

    // Interaction prompt check
    const pPos = this.player.mesh.position;
    const nearBuilding = this.getNearestBuilding(pPos.x, pPos.z);
    if (nearBuilding && !windowOpen) {
      if (nearBuilding.id === 'space_time_rift' || nearBuilding.isGate) {
        if (this.isTowerGateLocked()) {
          this.hud.setPrompt('Press E: Space-Time Rift (EQUIP YOUR HEROES FIRST)');
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
}
