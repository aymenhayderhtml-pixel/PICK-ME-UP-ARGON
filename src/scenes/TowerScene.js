import * as THREE from 'three';
import { Player } from '../player/Player.js';
import { ThirdPersonCamera } from '../player/ThirdPersonCamera.js';
import { DropsManager } from '../combat/Drops.js';
import { EnemyManager } from '../combat/EnemyManager.js';
import { Telegraph } from '../combat/Telegraph.js';
import { BossBar } from '../ui/BossBar.js';
import { ProjectilesManager } from '../combat/Projectiles.js';
import { ItemsManager, ITEM_TEMPLATES } from '../combat/Items.js';
import { Hud, showSystemMessage, clearSystemMessages, isAnySystemWindowOpen } from '../ui/Hud.js';
import { gameState } from '../core/GameState.js';
import { onEquipmentChanged } from '../core/equipmentEvents.js';
import { SquadAI } from '../combat/SquadAI.js';
import { getCommandByKey } from '../combat/Commands.js';
import { CommandWheel } from '../ui/CommandWheel.js';
import { PartyPanel } from '../ui/PartyPanel.js';
import { RewardWindow } from '../ui/RewardWindow.js';
import { ArrivalDome } from '../fx/ArrivalDome.js';
import { SpellVFXPool } from '../combat/SpellVFXPool.js';
import { SpellSystem } from '../combat/SpellSystem.js';
import { FloorLoaderMixin } from './tower/FloorLoaderMixin.js';
import { CombatMixin } from './tower/CombatMixin.js';
import { UpdateLoopMixin } from './tower/UpdateLoopMixin.js';

// Floor lighting presets, applied exactly like the hub does it (background,
// fog, ACES tone mapping, one ambient, one hemisphere, one directional, no
// shadows). Point lights come from the floor art module's `lights` descriptors.
export const FARM_FLOOR_LIGHTING = {
  background: 0xf3dba6,
  fog: { color: 0xf3dba6, near: 40, far: 140 },
  exposure: 1.0,
  ambient: { color: 0xffe6c0, intensity: 0.55 },
  hemi: { sky: 0xffe2a8, ground: 0x8a7a3a, intensity: 0.5 },
  sun: { color: 0xffd08a, intensity: 1.15, direction: { x: 40, y: 14, z: -30 } },
};

export const PRAIRIE_FLOOR_LIGHTING = {
  background: 0x9fc3c0,
  fog: { color: 0xa9c9c4, near: 40, far: 170 },
  exposure: 1.15,
  ambient: { color: 0xdaf0ec, intensity: 0.9 },
  hemi: { sky: 0xcfe9e6, ground: 0x5f7a4a, intensity: 0.8 },
  sun: { color: 0xeaf6ff, intensity: 0.9, direction: { x: -40, y: 35, z: 30 } },
};

export const FOREST_FLOOR_LIGHTING = {
  background: 0x0b110d,
  fog: { color: 0x0b110d, near: 12, far: 55 },
  exposure: 0.95,
  ambient: { color: 0xffffff, intensity: 0.3 },
  hemi: { sky: 0xffffff, ground: 0x333333, intensity: 0.0 },
  sun: { color: 0x88aacc, intensity: 0.45, direction: { x: 20, y: 30, z: -20 } },
};

export const BRIGHT_FOREST_LIGHTING = {
  background: 0xb9dcce,
  fog: { color: 0xa8cebc, near: 28, far: 72 },
  exposure: 1.12,
  ambient: { color: 0x5c7c68, intensity: 0.45 },
  hemi: { sky: 0xd9f5e3, ground: 0x2c3f25, intensity: 0.70 },
  sun: { color: 0xfff4d4, intensity: 1.65, direction: { x: 22, y: 42, z: 14 } },
};

export class TowerScene extends CombatMixin(FloorLoaderMixin(UpdateLoopMixin(Object))) {
  constructor(renderer, input) {
    super();
    this.renderer = renderer;
    this.input = input;

    // 1. Scene & Atmosphere Setup
    this.scene = new THREE.Scene();
    const forestBg = new THREE.Color(0x0b110d);
    this.scene.background = forestBg;
    this.scene.fog = new THREE.Fog(forestBg, 12, 55);

    // 2. Camera Setup
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // 3. Lighting (Total scene lights <= 8)
    // - AmbientLight
    this.ambLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambLight);

    // - DirectionalLight (shadows OFF)
    this.dirLight = new THREE.DirectionalLight(0x88aacc, 0.45);
    this.dirLight.position.set(20, 30, -20);
    this.dirLight.castShadow = false;
    this.scene.add(this.dirLight);

    // - HemisphereLight (for warm golden hour mood)
    this.hemiLight = new THREE.HemisphereLight(0xffe2a8, 0x8a7a3a, 0);
    this.scene.add(this.hemiLight);

    // 4. Player
    this.player = new Player(this.scene);
    this.scene.add(this.player.mesh);

    this.thirdPersonCamera = new ThirdPersonCamera(this.camera, this.player.mesh);

    // Floor art point-light pool: at most 4 warm lights active at once.
    this.floorPointLights = [];
    for (let i = 0; i < 4; i++) {
      const pl = new THREE.PointLight(0xffddaa, 0, 12, 2);
      pl.visible = false;
      this.scene.add(pl);
      this.floorPointLights.push(pl);
    }
    this.activeFloorLights = new Set();
    this.floorLightTimer = 0;
    this.floorQuality = 'medium';
    this.adaptiveQualityLowered = false;
    this.fps5sTimer = 0;
    this.fps5sFrames = 0;
    this.debugOverlayOpen = false;
    this.debugOverlayEl = null;
    this.scaleCheckLogged = false;

    // 5. Systems
    this.dropsManager = new DropsManager();
    this.itemsManager = new ItemsManager();
    this.projectilesManager = new ProjectilesManager(this.scene);
    this.enemyManager = new EnemyManager(this.dropsManager, this.itemsManager);
    this.arrivalDome = new ArrivalDome(this.scene);
    this.hud = new Hud();
    this.telegraph = new Telegraph(this.scene);
    this.bossBar = new BossBar();

    this.squadAI = new SquadAI(this.scene);
    this.partyPanel = new PartyPanel(this.hud.container);

    // Squad members show their own equipped weapon: rebuild their models as
    // soon as gear changes in the Equipment screen.
    this._unsubscribeEquipment = onEquipmentChanged((hero) => {
      for (const ally of (this.squadAI?.allies || [])) {
        if (!hero || ally.hero?.id === hero.id) {
          ally.applyLoadout();
        }
      }
    });
    this.commandWheel = new CommandWheel((cmd) => {
      this.handleCommandSelect(cmd);
    });
    this.rewardWindow = new RewardWindow({
      onNextFloor: (fl) => {
        // Re-entering the SAME floor: the state's floor pointer follows, so
        // the reward window's floor advancement and the hub deploy window
        // stay coherent with the floor the party is actually running.
        const floor = fl || gameState.currentFloor || 1;
        gameState.currentFloor = floor;
        this.initFloor(floor);
        this.playOpeningTransition(floor);
      },
      onReturnToHub: () => {
        if (this.sceneManager) {
          this.sceneManager.switchTo('hub');
        }
      },
    });

    this.squadAI.shoutCallback = (shout) => this.showHanShout(shout);
    this.hanShoutEl = null;
    this.hanShoutTimer = 0;
    this.hanDeathHandled = false;
    this.isTutorial = false;
    this.tutorialAmbushTriggered = false;
    this.tutorialNoviceDeathTimers = [];
    this.rewardWindowShown = false;
    this.expeditionMaterials = {};
    this.isAutoMode = false;
    this.initialEnemiesSpawned = false;
    this.initialEnemyCount = 0;
    this.autoCmdTimer = 0;

    this.hud.onToggleAuto = () => this.toggleAutoMode();

    this.player.onParryText = (text, pos) => this.hud.showParryText(pos);

    // Fire Mage Spell VFX and System
    this.vfxPool = new SpellVFXPool(this.scene);
    this.spellSystem = new SpellSystem(this.scene, this.vfxPool, this.enemyManager.enemies);
    this.player.spellSystem = this.spellSystem;
    this.spellSystem.onScreenShake = (strength) => {
      if (this.thirdPersonCamera && typeof this.thirdPersonCamera.shake === 'function') {
        this.thirdPersonCamera.shake(strength, 0.18);
      }
    };
    this.hud.onCastSpell = (spellId) => {
      const aimPos = this.getAimGroundPosition();
      this.player.castSpell(spellId, aimPos);
    };

    this.boss = null;
    this.bossIntroPlayed = false;
    this.isIntroPlaying = false;
    this.introTimer = 0;
    this.introElapsed = 0;
    this.arenaBarrierMesh = null;
    this.arenaSealed = false;
    this.slowMotionTimer = 0;
    this.bossTitleOverlay = null;

    this.forestFloor = null;
    this.currentFloorNumber = 1;
    this.f3IntroActive = false;
    this.f3IntroTimer = 0;
    this.partySlotPositions = [];
    this.isActive = false;
    this.dailyDungeonType = null;
    this.survivalTimer = 0;
    this.survivalTimerEl = null;
    this.materialNodes = [];
    this.floor5Dissolving = false;
    this.dissolveTimer = 0;
    this.dissolveParticles = [];
    this.dissolveAllEnemies = null;

    this.setupInputs();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }








  // Startup sanity check: art modules assume world units (hero ~1.75m).
  logScaleCheck() {
    if (this.scaleCheckLogged) return;
    this.scaleCheckLogged = true;
    if (!this.player || !this.player.mesh) return;
    const box = new THREE.Box3().setFromObject(this.player.mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const heroH = size.y;
    if (heroH > 0.01 && Math.abs(heroH - 1.75) / 1.75 > 0.15) {
      console.warn(
        `[A06c] hero height ${heroH.toFixed(2)} differs from 1.75; floor art assumes 1 unit = 1 meter.`
      );
    }
  }





  ensureDebugOverlay() {
    if (this.debugOverlayEl) return;
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.right = '12px';
    el.style.bottom = '12px';
    el.style.background = 'rgba(0, 0, 0, 0.72)';
    el.style.color = '#dff';
    el.style.font = '12px monospace';
    el.style.padding = '8px 10px';
    el.style.zIndex = '10004';
    el.style.whiteSpace = 'pre';
    el.style.pointerEvents = 'none';
    el.style.border = '1px solid var(--frame, #6cf)';
    el.style.display = 'none';
    document.body.appendChild(el);
    this.debugOverlayEl = el;
  }




  setupInputs() {
    if (this.input && typeof this.input.onAction === 'function') {
      this.input.onAction('attack', () => {
        if (!this.isActive || isAnySystemWindowOpen()) return;
        if (this.commandWheel && this.commandWheel.isOpen) return;
        if (this.player.isBlocking) {
          this.player.performShieldBash(this.enemyManager.enemies, this.thirdPersonCamera, (dmg, pos, isFinisher) => {
            this.hud.showDamageNumber(dmg, pos, isFinisher);
          });
        } else {
          this.player.attack(this.enemyManager.enemies, this.thirdPersonCamera, (dmg, pos, isFinisher) => {
            this.hud.showDamageNumber(dmg, pos, isFinisher);
          });
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;
      if (isAnySystemWindowOpen() && e.code !== 'Escape') return;

      // Debug keys (always available, like the hub's Backslash overlay)
      if (e.code === 'Backslash') {
        this.toggleDebugOverlay();
        return;
      }
      if (e.code === 'KeyF' && e.shiftKey) {
        this.toggleArtVisibility();
        return;
      }
      if (e.code === 'KeyG' && e.shiftKey) {
        this.forceOpenGates();
        return;
      }
      if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
        if (this.mode === 'tower') {
          const next = e.code === 'BracketRight'
            ? this.currentFloorNumber + 1
            : this.currentFloorNumber - 1;
          if (next >= 1 && next <= 5) {
            this.rewardWindowShown = false;
            this.hanDeathHandled = false;
            this.initFloor(next);
            this.isActive = true;
            showSystemMessage(`[Floor ${next}]`);
          }
        }
        return;
      }

      if (e.code === 'KeyF') {
        if (this.player.isBlocking) {
          this.player.performShieldBash(this.enemyManager.enemies, this.thirdPersonCamera, (dmg, pos, isFinisher) => {
            this.hud.showDamageNumber(dmg, pos, isFinisher);
          });
        } else {
          this.player.attack(this.enemyManager.enemies, this.thirdPersonCamera, (dmg, pos, isFinisher) => {
            this.hud.showDamageNumber(dmg, pos, isFinisher);
          });
        }
      } else if (e.code === 'KeyC') {
        if (this.commandWheel && !this.commandWheel.isOpen) {
          this.commandWheel.open();
        }
      } else if (e.code === 'KeyE') {
        const nearby = this.itemsManager.getNearbyItem(this.player.mesh.position, 1.5);
        if (nearby) {
          this.itemsManager.pickupItem(nearby, this.player, this.scene);
        }
      } else if (e.code === 'KeyQ') {
        if (this.player.loadout?.attackMode === 'spell') {
          this.player.useManaPotion();
        } else {
          this.player.startRoll(this.input, this.thirdPersonCamera.getYaw());
        }
      } else if (e.code === 'Space') {
        this.player.startRoll(this.input, this.thirdPersonCamera.getYaw());
      } else if (e.code === 'KeyX') {
        this.toggleAutoMode();
      } else if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'KeyR'].includes(e.code) && this.player.loadout?.attackMode === 'spell') {
        const spellMap = {
          Digit1: 'emberBolt',
          Digit2: 'fireDartVolley',
          Digit3: 'fireball',
          Digit4: 'flameWall',
          Digit5: 'infernoBeam',
          Digit6: 'fireNova',
          KeyR: 'solarCataclysm',
        };
        const spellId = spellMap[e.code];
        if (spellId) {
          const aimPos = this.getAimGroundPosition();
          this.player.castSpell(spellId, aimPos);
        }
      } else if (e.code === 'F2') {
        const inputVal = window.prompt(
          '[DEBUG] Enter floor number to set currentFloor (1-100):',
          gameState.currentFloor || this.currentFloorNumber || 1
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
            this.initFloor(parsed);
          }
        }
      } else if (e.code === 'KeyP') {
        if (this.boss && !this.boss.dead) {
          const dist = this.player.mesh.position.distanceTo(this.boss.mesh.position);
          if (dist <= 6.0) {
            this.boss.pinWeapon(1.8, 'Aaron');
          } else {
            showSystemMessage('[Too far to pin weapon! Must be within 6m]');
          }
        }
      } else if (e.code === 'F7') {
        this.player.mesh.position.set(0, 0, -30);
        this.player.velocityY = 0;
        showSystemMessage('[DEBUG: Teleported to Boss Arena]');
      } else if (e.code === 'F8') {
        if (this.boss && !this.boss.dead) {
          this.boss.hp = Math.round(this.boss.maxHp * 0.55);
          showSystemMessage(`[DEBUG: Boss HP set to 55% (${this.boss.hp}/${this.boss.maxHp})]`);
        }
      } else if (e.code === 'F5') {
        this.enemyManager.killAllEnemies(this.scene);
      } else if (e.code === 'F6') {
        const pPos = this.player.mesh.position;
        const spawnPos = new THREE.Vector3(pPos.x, 0, pPos.z - 5.0);
        this.enemyManager.spawnLeader(this.scene, spawnPos, this.currentFloorNumber);
      } else if (e.code === 'KeyB') {
        const hero = this.player.getHero();
        if (hero) {
          hero.equipment = hero.equipment || { weapon: null, offhand: null, armor: null };
          hero.equipment.weapon = {
            ...ITEM_TEMPLATES.HUNTING_BOW,
            id: 'item_debug_bow',
            durability: 60,
            maxDurability: 60,
          };
          hero.equipment.offhand = null;
          this.player.syncLoadout();
        }
        showSystemMessage('[Equipped Hunting Recurve Bow (C-Grade)]');
      } else if (e.code === 'KeyH') {
        if (this.sceneManager) {
          this.sceneManager.switchTo('hub');
        }
      } else {
        // Direct command hotkeys 1 to 6
        const cmd = getCommandByKey(e.code);
        if (cmd) {
          this.handleCommandSelect(cmd);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isActive) return;
      if (e.code === 'KeyC') {
        if (this.commandWheel && this.commandWheel.isOpen) {
          this.commandWheel.close();
        }
      }
    });
  }








  enter(params = {}) {
    this.isActive = true;
    this.hud.show();
    if (this.partyPanel) {
      this.partyPanel.show();
    }

    // Load the controlled hero's equipment from GameState so durability persists
    const controlled = this.player.getHero();
    if (controlled && controlled.equipment) {
      if (controlled.equipment.weapon) {
        this.player.equipWeapon(controlled.equipment.weapon);
      }
      if (controlled.equipment.offhand) {
        this.player.equipShield(controlled.equipment.offhand);
      }
    }
    this.player.refreshStats();

    const mode = params.mode || 'tower';
    const difficulty = params.difficulty || 1;
    const floor = params.floor || gameState.currentFloor || 1;
    this.initFloor(floor, mode, difficulty);
    if (this.thirdPersonCamera) {
      this.thirdPersonCamera.getGroundY = (x, z) =>
        this.forestFloor ? this.forestFloor.getGroundY(x, z) : 0;
      this.thirdPersonCamera.groundClearance = 1.2;
    }
    this.setupFloorLights();
    this.playOpeningTransition(floor);
  }

  exit() {
    this.isActive = false;
    this.camera.fov = 60;
    this.camera.updateProjectionMatrix();
    if (gameState.activeDungeonType) {
      gameState.activeDungeonType = null;
      gameState.saveToLocalStorage();
    }
    if (this.survivalTimerEl && this.survivalTimerEl.parentNode) {
      this.survivalTimerEl.parentNode.removeChild(this.survivalTimerEl);
      this.survivalTimerEl = null;
    }
    if (this.hud) {
      this.hud.hide();
    }
    if (this.partyPanel) {
      this.partyPanel.hide();
    }
    if (this.commandWheel) {
      this.commandWheel.close();
    }
    if (this.rewardWindow) {
      this.rewardWindow.close();
    }
    if (this.hanShoutEl) {
      this.hanShoutEl.style.display = 'none';
      this.hanShoutTimer = 0;
    }
    if (this.bossBar) {
      this.bossBar.hide();
    }
    if (this.telegraph) {
      this.telegraph.clear();
    }
    if (this.bossTitleOverlay && this.bossTitleOverlay.parentNode) {
      this.bossTitleOverlay.parentNode.removeChild(this.bossTitleOverlay);
      this.bossTitleOverlay = null;
    }
    if (this.boss) {
      this.scene.remove(this.boss.mesh);
      this.boss.dispose();
      this.boss = null;
    }
    if (this.arenaBarrierMesh) {
      this.scene.remove(this.arenaBarrierMesh);
      if (this.arenaBarrierMesh.geometry) this.arenaBarrierMesh.geometry.dispose();
      if (this.arenaBarrierMesh.material) this.arenaBarrierMesh.material.dispose();
      this.arenaBarrierMesh = null;
    }
    this.thirdPersonCamera.distance = 6;
    this.projectilesManager.clear();
    if (this.forestFloor) {
      this.dropsManager.clear(this.scene);
      this.enemyManager.clear(this.scene);
      this.scene.remove(this.forestFloor.group);
      this.forestFloor.dispose();
      this.forestFloor = null;
    }
    if (this.itemsManager) {
      this.itemsManager.clear(this.scene);
    }
    for (const pl of this.floorPointLights) {
      pl.visible = false;
      pl.intensity = 0;
    }
    if (this.activeFloorLights) this.activeFloorLights.clear();
    if (this.debugOverlayEl) this.debugOverlayEl.style.display = 'none';
    this.debugOverlayOpen = false;
    if (this.squadAI) {
      this.squadAI.clear();
    }
    if (this.arrivalDome) {
      this.arrivalDome.dispose();
    }
    clearSystemMessages();
  }


}
