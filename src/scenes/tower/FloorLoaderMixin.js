// FloorLoaderMixin.js — Floor building, lighting presets, quality tiers, and opening transitions
// Extracted from src/scenes/TowerScene.js
import * as THREE from 'three';
import { buildTowerFloor } from '../../world/TowerFloor.js';
import { buildCaveFloor } from '../../world/CaveFloor.js';
import { buildFloor5Town } from '../../world/Floor5TownBuilder.js';
import { getMissionInfo } from '../../data/missions.js';
import { FLOOR5_CONFIG } from '../../data/floor5.config.js';
import { Floor5SurvivalRuntime } from './Floor5SurvivalRuntime.js';
import { Enemy } from '../../combat/Enemy.js';
import { HobgoblinChief } from '../../combat/HobgoblinChief.js';
import { ITEM_TEMPLATES } from '../../combat/Items.js';
import { showSystemMessage, showNotices } from '../../ui/Hud.js';
import { gameState } from '../../core/GameState.js';
import { Ally } from '../../combat/Ally.js';
import { FARM_FLOOR_LIGHTING, PRAIRIE_FLOOR_LIGHTING, FOREST_FLOOR_LIGHTING, BRIGHT_FOREST_LIGHTING } from '../TowerScene.js';

export const FloorLoaderMixin = (Base) => class extends Base {
  initFloor(floorNumber = 1, mode = 'tower', difficulty = 1) {
    this.currentFloorNumber = floorNumber;
    this.f3IntroActive = false;
    this.f3IntroTimer = 0;
    this.mode = mode;
    this.difficulty = difficulty;
    this.gatheredMaterials = {};
    this.miningTimer = 0;
    this.materialNodes = [];
    this.dailyDungeonType = gameState.activeDungeonType || null;
    if (mode === 'tower' && floorNumber === 5) {
      this.survivalTimer = FLOOR5_CONFIG.durationSec;
      if (!this.survivalTimerEl) {
        const el = document.createElement('div');
        el.style.position = 'fixed';
        el.style.top = '58px';
        el.style.left = '50%';
        el.style.transform = 'translateX(-50%)';
        el.style.zIndex = '10003';
        el.style.pointerEvents = 'none';
        el.style.padding = '8px 16px';
        el.style.background = 'rgba(11,8,16,0.85)';
        el.style.border = '1px solid #00e5ff';
        el.style.borderRadius = '6px';
        el.style.color = '#00e5ff';
        el.style.fontFamily = 'monospace';
        el.style.fontSize = '20px';
        el.style.fontWeight = 'bold';
        document.body.appendChild(el);
        this.survivalTimerEl = el;
      }
      this.survivalTimerEl.style.display = 'block';
    } else {
      this.survivalTimer = 0;
      if (this.survivalTimerEl) this.survivalTimerEl.style.display = 'none';
    }

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
    if (floorNumber === 3) {
      this.thirdPersonCamera.distance = 16;
      this.thirdPersonCamera.pitch = 0.5;
      this.camera.fov = 50;
      this.camera.updateProjectionMatrix();
    } else {
      this.camera.fov = 60;
      this.camera.updateProjectionMatrix();
    }

    // Unconditionally clear managers
    this.dropsManager.clear(this.scene);
    this.enemyManager.clear(this.scene);
    if (this.itemsManager) this.itemsManager.clear(this.scene);
    this.hud.clearFloating();
    if (this.spellSystem) {
      this.spellSystem.clear();
      this.spellSystem.combatants = [this.player, ...this.enemyManager.enemies];
    }

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
    } else if (this.dailyDungeonType) {
      const dt = this.dailyDungeonType;
      if (dt === 'isralta_mine' || dt === 'daily_mine') {
        this.scene.background = new THREE.Color(0x151210);
        this.scene.fog = new THREE.Fog(0x151210, 8, 45);
        if (this.ambLight) { this.ambLight.color.setHex(0xffffff); this.ambLight.intensity = 0.25; }
        if (this.dirLight) { this.dirLight.color.setHex(0x665544); this.dirLight.intensity = 0.25; this.dirLight.position.set(10, 20, 10); }
        if (this.hemiLight) this.hemiLight.intensity = 0;
        this.forestFloor = buildCaveFloor(1, floorNumber * 9973 + 23);
      } else if (dt === 'kendert_forest' || dt === 'daily_forest') {
        this.applyFloorLighting(3);
        const seed = floorNumber * 7919 + 13;
        this.forestFloor = buildTowerFloor({ floorNumber: 3, seed, quality, scene: this.scene });
      } else {
        this.applyFloorLighting(1);
        const seed = floorNumber * 7919 + 13;
        this.forestFloor = buildTowerFloor({ floorNumber: 1, seed, quality, scene: this.scene });
      }
      this.hud.setFloorLabel(null);
    } else if (floorNumber === 5) {
      this.hud.setFloorLabel(null);
      const seed = floorNumber * 7919 + 13;
      this.applyFloorLighting(floorNumber);
      this.forestFloor = buildFloor5Town({ floorNumber, seed, quality, scene: this.scene });
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

    // Floor 5 Survival runtime (party-agnostic, no source mutation)
    if (mode === 'tower' && floorNumber === 5) {
      // DOM focus / input lock cleanup
      if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
        try { document.activeElement.blur(); } catch (e) {}
      }
      if (typeof window !== 'undefined' && typeof window.focus === 'function') {
        try { window.focus(); } catch (e) {}
      }
      this.isDialogueOpen = false;
      this.isModalOpen = false;
      this.inputLocked = false;
      this.controlsDisabled = false;

      this.floor5Runtime = new Floor5SurvivalRuntime(this.scene);
      this.floor5Runtime.activate(this.scene);
      const allies = (this.squadAI && this.squadAI.allies) || [];
      this.floor5Runtime.attachAll(this.player, allies);

      // Clear any leftover forest/town colliders near spawn
      console.log('[Floor5] Loaded. Colliders near (0,0,0):', (this.forestFloor && this.forestFloor.colliders ? this.forestFloor.colliders.filter(c => Math.hypot(c.x, c.z) < 6).length : 0));
    }

    // 5. Floor 5 Boss Arena Encounter Setup (Tower mode only)
    if (this.mode === 'tower' && floorNumber === 5 && false) {
      // Disabled for Floor 5 survival mode (boss arena replaced by survival)
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

    // Daily Dungeon material gathering nodes
    if (this.dailyDungeonType) {
      const nodeDefs = [
        { type: 'branch', color: 0x8b5a2b, count: 5 },
        { type: 'plant_of_life', color: 0xff3366, count: 3 },
        { type: 'trash_f', color: 0x666666, count: 2 },
      ];
      for (const def of nodeDefs) {
        for (let i = 0; i < def.count; i++) {
          const x = (Math.random() - 0.5) * 30;
          const z = -10 - Math.random() * 40;
          const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 8, 6),
            new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.6 })
          );
          mesh.position.set(x, 0.4, z);
          this.scene.add(mesh);
          this.materialNodes.push({ type: def.type, mesh, collected: false });
        }
      }
    }

    // 6. Mission Announcement Panel (5 seconds duration, manhua .mm-panel)
    this.hud.showMissionBox(getMissionInfo({ mode, floorNumber, difficulty }));

    // 7. Glowing Cyan Arrival Dome effect (party appearance, lasts 2.0s, locks controls for 1.2s)
    this.arrivalDome.play(this.player.mesh.position, this.thirdPersonCamera, this.input);
  }
  // Applies the hub-style lighting setup (background, fog, ACES tone mapping,
  // one ambient, one hemisphere, one non-shadow directional) for a floor.
  applyFloorLighting(floor) {
    if (floor === 5) {
      // Sunset preset from FLOOR5_CONFIG
      const L5 = FLOOR5_CONFIG.lighting;
      if (this.renderer) {
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
      }
      this.scene.background = new THREE.Color(L5.fogColor);
      this.scene.fog = new THREE.Fog(L5.fogColor, 25, 90);
      if (this.ambLight) {
        this.ambLight.color.setHex(parseInt(L5.ambientColor.replace('#', ''), 16));
        this.ambLight.intensity = Math.max(L5.ambientIntensity, 1.2);
      }
      if (this.hemiLight) {
        this.hemiLight.intensity = 0.9;
        this.hemiLight.color.setHex(parseInt(L5.ambientColor.replace('#', ''), 16));
      }
      if (this.dirLight) {
        this.dirLight.color.setHex(parseInt(L5.sunColor.replace('#', ''), 16));
        this.dirLight.intensity = Math.max(L5.sunIntensity, 2.6);
        this.dirLight.position.set(20, 30, 10);
      }
      return;
    }
    let L = FOREST_FLOOR_LIGHTING;
    if (floor === 1 || floor === true) {
      L = FARM_FLOOR_LIGHTING;
    } else if (floor === 2) {
      L = PRAIRIE_FLOOR_LIGHTING;
    } else if (floor === 3) {
      L = BRIGHT_FOREST_LIGHTING;
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
      if (floor === 3) {
        if (!this.dirLight.target.parent) this.scene.add(this.dirLight.target);
        this.dirLight.target.position.set(0, 0, -34);
      }
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
    const rawLights = (this.forestFloor && this.forestFloor.lights);
    const lights = Array.isArray(rawLights) ? rawLights : [];
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
  playOpeningTransition(floorNumber) {
    if (floorNumber === 3) {
      this.f3IntroActive = true;
      this.f3IntroTimer = 1.2;
      this.camera.position.set(0, 10, 14);
      this.camera.lookAt(0, 1, -34);
      const cleared = floorNumber - 1;
      const ordinal = (n) => {
        const v = n % 100;
        let suffix = 'TH';
        if (v < 11 || v > 13) {
          switch (n % 10) {
            case 1: suffix = 'ST'; break;
            case 2: suffix = 'ND'; break;
            case 3: suffix = 'RD'; break;
            default: suffix = 'TH'; break;
          }
        }
        return `${n}${suffix}`;
      };
      showNotices([
        `CONGRATULATIONS ON COMPLETING THE ${ordinal(cleared)} FLOOR!`,
        `YOU WILL PROCEED TO THE ${ordinal(floorNumber)} FLOOR.`,
      ]);
    }

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
};
