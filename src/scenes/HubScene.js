import * as THREE from 'three';
import { getGroundY } from '../art/town/ground.js';
import { Iselle } from '../hub/Iselle.js';
import { HubHeroesManager } from '../hub/HubHeroes.js';
import { Player } from '../player/Player.js';
import { ThirdPersonCamera } from '../player/ThirdPersonCamera.js';
import { gameState } from '../core/GameState.js';
import { HubHud } from '../ui/HubHud.js';
import { showSystemMessage } from '../ui/Hud.js';
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
import { TownSparringController } from '../hub/TownSparringController.js';
import { TrainingManager } from '../hub/TrainingManager.js';
import { NavGrid } from '../hub/NavGrid.js';
import { buildWalkHeightMap } from '../art/town/WalkHeight.js';
import { TownInitMixin } from './hub/TownInitMixin.js';
import { NPCDialogueMixin } from './hub/NPCDialogueMixin.js';
import { HubUpdateMixin } from './hub/HubUpdateMixin.js';

export class HubScene extends TownInitMixin(NPCDialogueMixin(HubUpdateMixin(Object))) {
  constructor(renderer, input) {
    super();
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
    // The near plane is 0.3 (not 0.1): the town floor is covered in flat
    // decals a few millimetres apart, and the depth buffer is far too coarse
    // at 0.1 for them not to z-fight. The camera never comes closer than
    // 1.2 units to the hero, so nothing is clipped. The far plane stays
    // capped at 460 on purpose (see the CODEMAP gotcha on the town z-fight).
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.3,
      460
    );

    // Cinematic Intro Flyover State
    this.isIntroFlyover = false;
    this.introFlyoverTimer = 0;
    this.introFlyoverDuration = 6.0;
    this.flyoverHasPlayed = false;

    // Set when the player chooses to enter a floor with unarmed heroes.
    this.allowUnarmedDeploy = false;

    // 3. Town container & navigation grid
    this.town = null;
    this.townColliders = [];
    // Player-only obstacle shapes (fences, tree trunks, boulders, walls)
    this.townBlockers = [];
    this.colliderDebugGroup = null;
    this.signLabels = [];
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

}
