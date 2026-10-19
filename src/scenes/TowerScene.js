import * as THREE from 'three';
import { Player } from '../player/Player.js';
import { ThirdPersonCamera } from '../player/ThirdPersonCamera.js';
import { buildTowerFloor } from '../world/TowerFloor.js';
import { buildCaveFloor } from '../world/CaveFloor.js';
import { getMissionInfo } from '../data/missions.js';
import { spawnSparks } from '../combat/Combat.js';
import { DropsManager } from '../combat/Drops.js';
import { EnemyManager } from '../combat/EnemyManager.js';
import { Enemy } from '../combat/Enemy.js';
import { HobgoblinChief } from '../combat/HobgoblinChief.js';
import { Telegraph } from '../combat/Telegraph.js';
import { BossBar } from '../ui/BossBar.js';
import { ProjectilesManager } from '../combat/Projectiles.js';
import { ItemsManager, ITEM_TEMPLATES } from '../combat/Items.js';
import { Hud, showSystemMessage, showNotices, clearSystemMessages, isAnySystemWindowOpen } from '../ui/Hud.js';
import { gameState } from '../core/GameState.js';
import { Ally } from '../combat/Ally.js';
import { SquadAI } from '../combat/SquadAI.js';
import { COMMANDS, getCommandByKey } from '../combat/Commands.js';
import { CommandWheel } from '../ui/CommandWheel.js';
import { PartyPanel } from '../ui/PartyPanel.js';
import { RewardWindow } from '../ui/RewardWindow.js';
import { HERO_TEMPLATES } from '../data/heroes.js';
import { updateHumanoidCameraFade } from '../core/CameraFade.js';
import { ArrivalDome } from '../fx/ArrivalDome.js';

// Floor lighting presets, applied exactly like the hub does it (background,
// fog, ACES tone mapping, one ambient, one hemisphere, one directional, no
// shadows). Point lights come from the floor art module's `lights` descriptors.
const FARM_FLOOR_LIGHTING = {
  background: 0xf3dba6,
  fog: { color: 0xf3dba6, near: 40, far: 140 },
  exposure: 1.0,
  ambient: { color: 0xffe6c0, intensity: 0.55 },
  hemi: { sky: 0xffe2a8, ground: 0x8a7a3a, intensity: 0.5 },
  sun: { color: 0xffd08a, intensity: 1.15, direction: { x: 40, y: 14, z: -30 } },
};

const PRAIRIE_FLOOR_LIGHTING = {
  background: 0x9fc3c0,
  fog: { color: 0xa9c9c4, near: 40, far: 170 },
  exposure: 1.15,
  ambient: { color: 0xdaf0ec, intensity: 0.9 },
  hemi: { sky: 0xcfe9e6, ground: 0x5f7a4a, intensity: 0.8 },
  sun: { color: 0xeaf6ff, intensity: 0.9, direction: { x: -40, y: 35, z: 30 } },
};

const FOREST_FLOOR_LIGHTING = {
  background: 0x0b110d,
  fog: { color: 0x0b110d, near: 12, far: 55 },
  exposure: 0.95,
  ambient: { color: 0xffffff, intensity: 0.3 },
  hemi: { sky: 0xffffff, ground: 0x333333, intensity: 0.0 },
  sun: { color: 0x88aacc, intensity: 0.45, direction: { x: 20, y: 30, z: -20 } },
};

export class TowerScene {
  constructor(renderer, input) {
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
    this.commandWheel = new CommandWheel((cmd) => {
      this.handleCommandSelect(cmd);
    });
    this.rewardWindow = new RewardWindow({
      onNextFloor: (fl) => {
        this.initFloor(fl);
        this.playOpeningTransition(fl);
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
    this.partySlotPositions = [];
    this.isActive = false;

    this.setupInputs();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  toggleAutoMode() {
    this.isAutoMode = !this.isAutoMode;
    if (this.hud) {
      this.hud.setAuto(this.isAutoMode);
    }
    showSystemMessage(this.isAutoMode ? '[AUTO Mode: ON]' : '[AUTO Mode: OFF]');
  }

  initFloor(floorNumber = 1, mode = 'tower', difficulty = 1) {
    this.currentFloorNumber = floorNumber;
    this.mode = mode;
    this.difficulty = difficulty;
    this.gatheredMaterials = {};
    this.miningTimer = 0;

    // 1. Clean up existing floor & boss systems
    if (this.telegraph) this.telegraph.clear();
    if (this.bossBar) this.bossBar.hide();
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
    this.bossIntroPlayed = false;
    this.isIntroPlaying = false;
    this.introTimer = 0;
    this.introElapsed = 0;
    this.arenaSealed = false;
    this.slowMotionTimer = 0;
    this.enemyManager.bossDefeated = false;
    this.thirdPersonCamera.distance = 6;
    this.thirdPersonCamera.pitch = 0.3;
    this.thirdPersonCamera.yaw = Math.PI;

    // Unconditionally clear managers
    this.dropsManager.clear(this.scene);
    this.enemyManager.clear(this.scene);
    if (this.itemsManager) this.itemsManager.clear(this.scene);
    this.hud.clearFloating();

    if (this.forestFloor) {
      this.scene.remove(this.forestFloor.group);
      this.forestFloor.dispose();
      this.forestFloor = null;
    }
    if (this.activeFloorLights) this.activeFloorLights.clear();
    for (const pl of this.floorPointLights || []) {
      pl.visible = false;
      pl.intensity = 0;
    }
    this.adaptiveQualityLowered = false;
    this.fps5sTimer = 0;
    this.fps5sFrames = 0;
    this.scaleCheckLogged = false;

    if (this.squadAI) {
      this.squadAI.clear();
    }
    this.rewardWindowShown = false;
    this.hanDeathHandled = false;
    this.initialEnemiesSpawned = false;
    this.initialEnemyCount = 0;
    this.player.damageDealt = 0;
    this.player.kills = 0;
    this.expeditionMaterials = {};

    // 2. Build level (Hunt vs Mine vs Tower)
    const quality = (gameState.settings && gameState.settings.quality) || 'medium';
    this.floorQuality = quality;
    if (mode === 'hunt') {
      const seed = difficulty * 7919 + 17;
      const layoutFloor = (seed % 2 !== 0) ? 1 : 2;
      this.applyFloorLighting(layoutFloor);
      this.forestFloor = buildTowerFloor({ floorNumber: layoutFloor, seed, quality, scene: this.scene });
      this.hud.setFloorLabel(`Hunting Ground D${difficulty}`);
      this.hud.showMissionBox(getMissionInfo({ mode: 'hunt', difficulty }));
    } else if (mode === 'mine') {
      const seed = difficulty * 9973 + 23;
      this.scene.background = new THREE.Color(0x151210);
      this.scene.fog = new THREE.Fog(0x151210, 8, 45);
      if (this.ambLight) {
        this.ambLight.color.setHex(0xffffff);
        this.ambLight.intensity = 0.25;
      }
      if (this.dirLight) {
        this.dirLight.color.setHex(0x665544);
        this.dirLight.intensity = 0.25;
        this.dirLight.position.set(10, 20, 10);
      }
      if (this.hemiLight) this.hemiLight.intensity = 0;
      this.forestFloor = buildCaveFloor(difficulty, seed);
      this.hud.setFloorLabel(`Mine D${difficulty}`);
      this.hud.showMissionBox(getMissionInfo({ mode: 'mine', difficulty }));
    } else {
      this.hud.setFloorLabel(null);
      const seed = floorNumber * 7919 + 13;
      this.applyFloorLighting(floorNumber);
      this.forestFloor = buildTowerFloor({ floorNumber, seed, quality, scene: this.scene });
    }
    this.scene.add(this.forestFloor.group);
    if (this.thirdPersonCamera) {
      this.thirdPersonCamera.setColliders(this.forestFloor.colliders || []);
    }
    if (this.forestFloor.art && this.forestFloor.art.setQuality) {
      this.forestFloor.art.setQuality(quality);
    }

    // 3. Position player and party slots
    this.player.hp = this.player.maxHp || 100;
    this.player.stamina = this.player.maxStamina || 100;
    this.player.dead = false;
    this.player.isRolling = false;
    this.player.comboStep = 0;
    this.player.comboTimer = 0;

    this.player.mesh.position.copy(this.forestFloor.startPosition);
    this.player.mesh.position.y = this.forestFloor.getGroundY(
      this.forestFloor.startPosition.x,
      this.forestFloor.startPosition.z
    );
    this.player.mesh.rotation.y = Math.PI; // Face towards north (-Z)
    this.player.velocityY = 0;
    this.player.isGrounded = true;

    this.partySlotPositions = this.forestFloor.partySlotPositions;
    this.logScaleCheck();
    this.thirdPersonCamera.update(1.0);

    // 4. Enemy Spawning & Tutorial Check
    const isTutorialFirstPlay = mode === 'tower' && floorNumber === 1 && !gameState.flags?.tutorialDone;
    this.isTutorial = isTutorialFirstPlay;
    this.tutorialAmbushTriggered = false;

    this.projectilesManager.clear();
    if (mode === 'hunt') {
      this.enemyManager.spawnHuntingGround(this.scene, this.forestFloor, difficulty);
    } else if (mode === 'mine') {
      this.enemyManager.spawnMine(this.scene, this.forestFloor, difficulty);
    } else {
      this.enemyManager.spawn(this.scene, this.forestFloor, floorNumber);
    }
    this.initialEnemyCount = (this.enemyManager.enemies || []).length;
    this.initialEnemiesSpawned = this.initialEnemyCount > 0;

    if (this.isTutorial) {
      const livingNovices = (gameState.party || [])
        .map((p) => {
          const id = typeof p === 'string' ? p : p.id;
          return gameState.heroes.find((h) => h.id === id);
        })
        .filter((h) => h && h.id !== 'hero_han' && h.alive);

      const noviceData = livingNovices.length > 0 ? livingNovices : [
        { id: 'novice_keith', name: 'Novice Keith', class: 'Vanguard', weapon: 'sword+shield', star: 1, level: 1, stats: { str: 6, agi: 5, vit: 6, int: 4, wil: 4 }, skills: [{ id: 'basic_swordsmanship', level: 1 }] },
        { id: 'novice_kyle', name: 'Novice Kyle', class: 'Vanguard Tank', weapon: 'spear', star: 1, level: 1, stats: { str: 6, agi: 4, vit: 7, int: 3, wil: 4 }, skills: [{ id: 'basic_spearmanship', level: 1 }] },
        { id: 'novice_ray', name: 'Novice Ray', class: 'Scout', weapon: 'dagger+bow', star: 1, level: 1, stats: { str: 4, agi: 7, vit: 5, int: 5, wil: 4 }, skills: [{ id: 'basic_archery', level: 1 }] },
        { id: 'novice_finn', name: 'Novice Finn', class: 'Vanguard', weapon: 'sword+shield', star: 1, level: 1, stats: { str: 6, agi: 5, vit: 6, int: 4, wil: 4 }, skills: [{ id: 'basic_swordsmanship', level: 1 }] },
      ];
      this.tutorialNoviceDeathTimers = noviceData.map((_, idx) => 2.5 + idx * 2.5);

      const novices = noviceData.map((d, idx) => {
        const ally = new Ally(this.scene, d, true, idx);
        ally.mesh.position.set(
          this.forestFloor.startPosition.x + (idx % 2 === 0 ? 1.5 : -1.5),
          0,
          this.forestFloor.startPosition.z + Math.floor(idx / 2) * 1.5 + 1.5
        );
        return ally;
      });
      this.squadAI.setAllies(novices);
      this.partyPanel.setupParty([
        { id: 'hero_han', name: 'Han Islat', isLeader: true },
        ...noviceData.map((d) => ({ id: d.id, name: d.name, isLeader: false })),
      ]);
      showSystemMessage('[Warning! If a hero dies inside the Tower, they cannot be revived.]');
    } else {
      const partyHeroes = (gameState.party || [])
        .map((p) => {
          const id = typeof p === 'string' ? p : p.id;
          return gameState.heroes.find((h) => h.id === id);
        })
        .filter((h) => h && h.id !== 'hero_han' && h.alive);

      const allies = partyHeroes.map((h, idx) => {
        const ally = new Ally(this.scene, h, false, idx);
        ally.mesh.position.set(
          this.forestFloor.startPosition.x + (idx % 2 === 0 ? 1.5 : -1.5),
          0,
          this.forestFloor.startPosition.z + Math.floor(idx / 2) * 1.5 + 1.5
        );
        return ally;
      });
      this.squadAI.setAllies(allies);
      this.partyPanel.setupParty([
        { id: 'hero_han', name: 'Han Islat', isLeader: true },
        ...partyHeroes.map((h) => ({ id: h.id, name: h.name, isLeader: false })),
      ]);

      if (floorNumber === 1 && this.itemsManager) {
        this.itemsManager.spawnItem(this.scene, 2.0, -12.0, {
          ...ITEM_TEMPLATES.NOVICE_IRON_SHIELD,
          durability: 70,
          maxDurability: 70,
        });
      }
    }

    // 5. Floor 5 Boss Arena Encounter Setup (Tower mode only)
    if (this.mode === 'tower' && floorNumber === 5) {
      // Invisible arena barrier mesh across entrance (z = -23.5)
      const barrierGeo = new THREE.BoxGeometry(10, 4.5, 0.5);
      const barrierMat = new THREE.MeshStandardMaterial({
        color: 0xaa1122,
        emissive: 0xaa0022,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      });
      this.arenaBarrierMesh = new THREE.Mesh(barrierGeo, barrierMat);
      this.arenaBarrierMesh.position.set(0, 2.25, -23.5);
      this.arenaBarrierMesh.visible = false;
      this.scene.add(this.arenaBarrierMesh);
      if (this.forestFloor) this.forestFloor.isArenaSealed = true;

      // Spawn Hobgoblin Chief
      this.boss = new HobgoblinChief(0, -52, this.telegraph, this.thirdPersonCamera);
      this.boss.scene = this.scene;
      this.boss.squadAI = this.squadAI;
      this.scene.add(this.boss.mesh);
      this.enemyManager.enemies.push(this.boss);

      // Spawn 2 Shamans behind boss
      const sh1 = new Enemy(-3.5, -58, 'SHAMAN', false, 5);
      const sh2 = new Enemy(3.5, -58, 'SHAMAN', false, 5);
      sh1.state = 'idle';
      sh2.state = 'idle';
      this.enemyManager.enemies.push(sh1, sh2);
      this.scene.add(sh1.mesh, sh2.mesh);
      this.boss.shamans = [sh1, sh2];

      this.initialEnemyCount = (this.enemyManager.enemies || []).length;
      this.initialEnemiesSpawned = true;

      // Boss Callbacks
      this.boss.onSummonAdds = () => {
        for (let i = 0; i < 4; i++) {
          const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
          const gx = Math.cos(ang) * 16;
          const gz = -48 + Math.sin(ang) * 16;
          const grunt = new Enemy(gx, gz, 'GRUNT', false, 5);
          grunt.state = 'chase';
          grunt.isAggroed = true;
          this.enemyManager.enemies.push(grunt);
          this.scene.add(grunt.mesh);
        }
      };

      this.boss.onBossDefeat = () => {
        this.slowMotionTimer = 1.5;
        this.enemyManager.bossDefeated = true;
        if (this.thirdPersonCamera) {
          this.thirdPersonCamera.shake(0.15, 1.5);
        }
        showSystemMessage('[The goblins break ranks!]');
        for (const en of this.enemyManager.enemies) {
          if (en !== this.boss && !en.dead && en.enterFlee) {
            en.enterFlee();
          }
        }
        showSystemMessage('[Floor 5 Clear! Calculating rewards...]');

        if (this.forestFloor && this.forestFloor.exitGate) {
          this.forestFloor.exitGate.open();
        }

        const bPos = this.boss.mesh.position;
        this.dropsManager.spawnDrop(this.scene, bPos.x, bPos.z, 'TICKET');
        // Hobgoblin boss guaranteed material drops
        this.dropsManager.spawnMaterialDrop(this.scene, bPos.x, bPos.z, 'hobgoblin_core', 1);
        this.dropsManager.spawnMaterialDrop(this.scene, bPos.x + 1.0, bPos.z + 1.0, 'crude_iron', 3);

        setTimeout(() => {
          this.bossBar.hide();
          this.thirdPersonCamera.distance = 6;
        }, 2000);
      };
    }

    // 6. Mission Announcement Panel (5 seconds duration, manhua .mm-panel)
    this.hud.showMissionBox(getMissionInfo({ mode, floorNumber, difficulty }));

    // 7. Glowing Cyan Arrival Dome effect (party appearance, lasts 2.0s, locks controls for 1.2s)
    this.arrivalDome.play(this.player.mesh.position, this.thirdPersonCamera, this.input);
  }

  // Applies the hub-style lighting setup (background, fog, ACES tone mapping,
  // one ambient, one hemisphere, one non-shadow directional) for a floor.
  applyFloorLighting(floor) {
    let L = FOREST_FLOOR_LIGHTING;
    if (floor === 1 || floor === true) {
      L = FARM_FLOOR_LIGHTING;
    } else if (floor === 2) {
      L = PRAIRIE_FLOOR_LIGHTING;
    }
    if (this.renderer) {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = L.exposure;
    }
    this.scene.background = new THREE.Color(L.background);
    this.scene.fog = new THREE.Fog(L.fog.color, L.fog.near, L.fog.far);
    if (this.ambLight) {
      this.ambLight.color.setHex(L.ambient.color);
      this.ambLight.intensity = L.ambient.intensity;
    }
    if (this.hemiLight) {
      this.hemiLight.color.setHex(L.hemi.sky);
      this.hemiLight.groundColor.setHex(L.hemi.ground);
      this.hemiLight.intensity = L.hemi.intensity;
    }
    if (this.dirLight) {
      this.dirLight.color.setHex(L.sun.color);
      this.dirLight.intensity = L.sun.intensity;
      this.dirLight.position.set(L.sun.direction.x, L.sun.direction.y, L.sun.direction.z);
      this.dirLight.castShadow = false;
    }
  }

  setupFloorLights() {
    this.activeFloorLights.clear();
    for (const pl of this.floorPointLights) {
      pl.visible = false;
      pl.intensity = 0;
    }
    this.floorLightTimer = 0;
  }

  // Wiggle-room light: activates the up-to-4 nearest art lights from the floor
  // module, re-evaluated every 0.25s so it never thrashes.
  updateFloorLights(delta, playerPos) {
    const lights = (this.forestFloor && this.forestFloor.lights) || [];
    this.floorLightTimer -= delta;
    if (this.floorLightTimer > 0) return;
    this.floorLightTimer = 0.25;

    if (lights.length === 0 || !playerPos) {
      if (lights.length === 0) {
        for (const pl of this.floorPointLights) {
          pl.visible = false;
          pl.intensity = 0;
        }
        this.activeFloorLights.clear();
      }
      return;
    }

    const ranked = lights
      .map((l, i) => {
        const dx = l.position.x - playerPos.x;
        const dy = (l.position.y || 0) - playerPos.y;
        const dz = l.position.z - playerPos.z;
        return { i, d: Math.sqrt(dx * dx + dy * dy + dz * dz) };
      })
      .sort((a, b) => a.d - b.d);

    const chosen = ranked.slice(0, 4).map((r) => r.i);
    for (let s = 0; s < this.floorPointLights.length; s++) {
      const pl = this.floorPointLights[s];
      const li = chosen[s];
      if (li === undefined) {
        pl.visible = false;
        pl.intensity = 0;
        continue;
      }
      const l = lights[li];
      pl.position.set(l.position.x, l.position.y || 2, l.position.z);
      pl.color.setHex(l.color);
      pl.intensity = l.intensity;
      pl.distance = l.distance || 12;
      pl.visible = true;
    }
    this.activeFloorLights = new Set(chosen);
  }

  applyFloorQuality(quality) {
    this.floorQuality = quality;
    if (this.forestFloor && this.forestFloor.art && this.forestFloor.art.setQuality) {
      this.forestFloor.art.setQuality(quality);
    }
  }

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

  toggleArtVisibility() {
    if (!this.forestFloor) return;
    this.forestFloor.group.visible = !this.forestFloor.group.visible;
    showSystemMessage(`[Floor art ${this.forestFloor.group.visible ? 'visible' : 'hidden'}]`);
  }

  // Debug: force the exit gate open (Shift+G) so the exit can be inspected.
  forceOpenGates() {
    if (!this.forestFloor) return;
    this.forestFloor.exitGate.open();
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

  playOpeningTransition(floorNumber) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = '#ffffff';
    overlay.style.zIndex = '10005';
    overlay.style.pointerEvents = 'none';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.transition = 'background-color 0.6s ease-in-out, opacity 1.4s ease-out';

    const title = document.createElement('div');
    title.textContent = `[Tower of Trials] Floor ${floorNumber}`;
    title.style.color = 'var(--frame)';
    title.style.fontFamily = 'monospace, sans-serif';
    title.style.fontSize = '26px';
    title.style.fontWeight = 'bold';
    title.style.letterSpacing = '3px';
    title.style.textShadow = '0 0 16px var(--glow)';
    title.style.opacity = '0';
    title.style.transition = 'opacity 0.6s ease-in';
    overlay.appendChild(title);

    document.body.appendChild(overlay);

    // Phase 1: Fade from white to black for 0.6s
    requestAnimationFrame(() => {
      overlay.style.backgroundColor = '#0b110d';
    });

    // Phase 2: Fade in text, then fade in forest view for 2 seconds
    setTimeout(() => {
      title.style.opacity = '1';
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 1500);
      }, 1400);
    }, 600);
  }

  setupInputs() {
    window.addEventListener('mousedown', (e) => {
      if (!this.isActive || isAnySystemWindowOpen()) return;
      if (e.target && e.target.closest && e.target.closest('#command-wheel, .system-window, button, #hotkey-hint-bar')) return;
      if (e.button === 0) {
        if (this.player.isBlocking) {
          this.player.performShieldBash(this.enemyManager.enemies, this.thirdPersonCamera, (dmg, pos, isFinisher) => {
            this.hud.showDamageNumber(dmg, pos, isFinisher);
          });
        } else {
          this.player.attack(this.enemyManager.enemies, this.thirdPersonCamera, (dmg, pos, isFinisher) => {
            this.hud.showDamageNumber(dmg, pos, isFinisher);
          });
        }
      }
    });

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
        this.player.startRoll(this.input, this.thirdPersonCamera.getYaw());
      } else if (e.code === 'KeyX') {
        this.toggleAutoMode();
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
      } else if (e.code === 'KeyF7') {
        this.player.mesh.position.set(0, 0, -30);
        this.player.velocityY = 0;
        showSystemMessage('[DEBUG: Teleported to Boss Arena]');
      } else if (e.code === 'KeyF8') {
        if (this.boss && !this.boss.dead) {
          this.boss.hp = Math.round(this.boss.maxHp * 0.55);
          showSystemMessage(`[DEBUG: Boss HP set to 55% (${this.boss.hp}/${this.boss.maxHp})]`);
        }
      } else if (e.code === 'KeyF5') {
        this.enemyManager.killAllEnemies(this.scene);
      } else if (e.code === 'KeyF6') {
        const pPos = this.player.mesh.position;
        const spawnPos = new THREE.Vector3(pPos.x, 0, pPos.z - 5.0);
        this.enemyManager.spawnLeader(this.scene, spawnPos, this.currentFloorNumber);
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

  handleCommandSelect(cmd) {
    if (!cmd) return;
    let target = null;
    if (cmd.id === 'ATTACK_TARGET') {
      target = this.getClosestEnemyToCrosshair();
    }
    this.squadAI.setCommand(cmd, target);
    showSystemMessage(`[Command: ${cmd.label}]`);
  }

  getClosestEnemyToCrosshair() {
    let best = null;
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    for (const en of this.enemyManager.enemies) {
      if (en.dead || en.isDying) continue;
      const toEn = en.mesh.position.clone().sub(this.player.mesh.position).normalize();
      const dot = camDir.dot(toEn);
      if (dot > 0.65 && (!best || dot > best.dot)) {
        best = { enemy: en, dot };
      }
    }
    return best ? best.enemy : null;
  }

  showHanShout(text) {
    if (!this.hanShoutEl) {
      this.hanShoutEl = document.createElement('div');
      this.hanShoutEl.id = 'han-shout-bubble';
      this.hanShoutEl.style.position = 'fixed';
      this.hanShoutEl.style.backgroundColor = 'rgba(0, 229, 255, 0.25)';
      this.hanShoutEl.style.border = '2px solid #00ffff';
      this.hanShoutEl.style.boxShadow = '0 0 16px rgba(0, 255, 255, 0.6)';
      this.hanShoutEl.style.borderRadius = '8px';
      this.hanShoutEl.style.padding = '6px 16px';
      this.hanShoutEl.style.color = '#00ffff';
      this.hanShoutEl.style.fontFamily = 'monospace, sans-serif';
      this.hanShoutEl.style.fontSize = '14px';
      this.hanShoutEl.style.fontWeight = 'bold';
      this.hanShoutEl.style.pointerEvents = 'none';
      this.hanShoutEl.style.zIndex = '10002';
      this.hanShoutEl.style.display = 'none';
      document.body.appendChild(this.hanShoutEl);
    }

    this.hanShoutEl.textContent = `🗣️ Han: "${text}"`;
    this.hanShoutEl.style.display = 'block';
    this.hanShoutTimer = 1.5;
  }

  updateHanShout(delta) {
    if (this.hanShoutTimer > 0) {
      this.hanShoutTimer -= delta;
      if (this.hanShoutEl && this.player && this.camera) {
        const v = this.player.mesh.position.clone().add(new THREE.Vector3(0, 2.2, 0));
        v.project(this.camera);
        if (v.z < 1) {
          const sx = v.x * (window.innerWidth / 2) + (window.innerWidth / 2);
          const sy = -v.y * (window.innerHeight / 2) + (window.innerHeight / 2);
          this.hanShoutEl.style.left = `${sx}px`;
          this.hanShoutEl.style.top = `${sy - 30}px`;
          this.hanShoutEl.style.transform = 'translate(-50%, -50%)';
          this.hanShoutEl.style.opacity = '1';
        } else {
          this.hanShoutEl.style.display = 'none';
        }
      }
      if (this.hanShoutTimer <= 0 && this.hanShoutEl) {
        this.hanShoutEl.style.display = 'none';
      }
    }
  }

  handleHanDeath() {
    if (this.hanDeathHandled) return;
    this.hanDeathHandled = true;

    // Flash screen red
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(180, 0, 0, 0.75)';
    overlay.style.zIndex = '10006';
    overlay.style.pointerEvents = 'none';
    overlay.style.transition = 'opacity 2.5s ease-in';
    document.body.appendChild(overlay);

    showSystemMessage('[Han Islat has fallen.]');

    // Living heroes fatigue +20, stress +20
    for (const h of gameState.heroes) {
      if (gameState.isInParty(h.id)) {
        h.fatigue = Math.min(100, (h.fatigue || 0) + 20);
        gameState.addStress(h, 20);
      }
    }

    // Han is revived in hub at full HP
    this.player.hp = this.player.maxHp;
    this.player.dead = false;
    gameState.saveToLocalStorage();

    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (this.sceneManager) {
        this.sceneManager.switchTo('hub');
      }
    }, 3000);
  }

  openRewardWindow() {
    if (this.rewardWindowShown) return;
    this.rewardWindowShown = true;

    if (this.player) {
      this.player.isCheering = true;
    }
    for (const ally of (this.squadAI?.allies || [])) {
      if (!ally.dead) {
        ally.isCheering = true;
      }
    }

    // Calculate MVP
    let bestHero = { name: 'Han Islat', id: 'hero_han' };
    let bestScore = (this.player.damageDealt || 0) + (this.player.kills || 0) * 20;

    for (const ally of this.squadAI.allies) {
      const score = (ally.damageDealt || 0) + (ally.kills || 0) * 20;
      if (score > bestScore) {
        bestScore = score;
        bestHero = ally.hero;
      }
    }

    const living = [
      { name: 'Han Islat', id: 'hero_han', level: gameState.heroes.find((h) => h.id === 'hero_han')?.level || 1 },
      ...this.squadAI.allies.filter((a) => !a.dead).map((a) => a.hero),
    ];

    const dead = this.squadAI.allies.filter((a) => a.dead).map((a) => a.hero);

    const scavenged = (this.itemsManager ? this.itemsManager.groundItems : []).map((e) => e.item);

    this.rewardWindow.showRewards({
      mode: this.mode || 'tower',
      difficulty: this.difficulty || 1,
      floorNumber: this.currentFloorNumber,
      mvpHero: bestHero,
      mvpScore: bestScore,
      livingHeroes: living,
      deadHeroes: dead,
      scavengedItems: scavenged,
      materials: this.gatheredMaterials || this.expeditionMaterials || {},
    });
  }

  enter(params = {}) {
    this.isActive = true;
    this.hud.show();
    if (this.partyPanel) {
      this.partyPanel.show();
    }

    // Load Han's equipment from GameState so durability persists
    const han = gameState.heroes.find((h) => h.id === 'hero_han');
    if (han && han.equipment) {
      if (han.equipment.weapon) {
        this.player.equipWeapon(han.equipment.weapon);
      }
      if (han.equipment.offhand) {
        this.player.equipShield(han.equipment.offhand);
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

  showBossTitleOverlay(name, subtitle) {
    if (this.bossTitleOverlay && this.bossTitleOverlay.parentNode) {
      this.bossTitleOverlay.parentNode.removeChild(this.bossTitleOverlay);
    }
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '22%';
    overlay.style.left = '50%';
    overlay.style.transform = 'translate(-50%, -50%)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '10005';
    overlay.style.transition = 'opacity 0.8s ease-out';
    overlay.style.fontFamily = 'monospace, sans-serif';

    const h1 = document.createElement('h1');
    h1.textContent = name;
    h1.style.color = '#ff2222';
    h1.style.fontSize = '38px';
    h1.style.margin = '0 0 6px 0';
    h1.style.letterSpacing = '6px';
    h1.style.textShadow = '0 0 24px rgba(255, 34, 34, 0.9)';
    overlay.appendChild(h1);

    const sub = document.createElement('div');
    sub.textContent = subtitle;
    sub.style.color = '#dddddd';
    sub.style.fontSize = '14px';
    sub.style.letterSpacing = '3px';
    sub.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.7)';
    overlay.appendChild(sub);

    document.body.appendChild(overlay);
    this.bossTitleOverlay = overlay;

    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (this.bossTitleOverlay === overlay) this.bossTitleOverlay = null;
      }, 800);
    }, 2200);
  }

  update(delta) {
    if (!this.isActive || !this.forestFloor) return;

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
      isDown: (k) => (!windowOpen ? this.input.isDown(k) : false),
      isRmbDown: () => (!windowOpen && this.input.isRmbDown && this.input.isRmbDown()) || autoBlock,
      consumeMouseDelta: () => ({ x: 0, y: 0 }),
    };
    this.player.update(effectiveDelta, effectiveInput, cameraYaw, this.forestFloor, this.thirdPersonCamera);

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

    // Camera zoom out to 9 during boss fight, 6 otherwise
    if (this.boss && !this.boss.dead && this.bossIntroPlayed) {
      this.thirdPersonCamera.distance = 9;
    }
    this.thirdPersonCamera.update(effectiveDelta, effectiveInput);

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
        isFloorCleared = this.initialEnemiesSpawned && !!(this.boss && this.boss.dead && this.enemyManager.bossDefeated);
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
}
