// src/dev/devLab.js
// Master controller for Dev Lab (dev.html)

import * as THREE from 'three';
import { DevArena } from './devArena.js';
import {
  createDamageTextPool,
  createTeamDecals,
  createOverheadBadges,
  createWireframeVisualizer,
  createArrowPickup,
} from './devShared.js';
import {
  createHeroCombatant,
  createEnemyCombatant,
  createArcherAI,
  calculateSpawnPositions,
  disposeCombatant,
} from './devCombatants.js';
import { DevStatsTracker } from './devStats.js';
import { DevWeaponsController } from './devWeapons.js';
import { DevSpellsController } from './devSpells.js';
import { DevCheats } from './devCheats.js';
import { DevStorage } from './devStorage.js';

import { HitPipeline } from '../combat/HitPipeline.js';
import { DamageResolver } from '../combat/DamageResolver.js';
import { SpellVFXPool } from '../combat/SpellVFXPool.js';
import { SpellSystem } from '../combat/SpellSystem.js';
import { SquadController } from '../combat/SquadController.js';
import { timeScale } from '../combat/TimeScale.js';
import { combatEvents } from '../combat/CombatEvents.js';
import { ATTACK_PHASES } from '../combat/StateMachine.js';
import { MageAI } from '../combat/MageAI.js';
import { playSpellSound, playPotionSound, playFizzleSound } from '../combat/SpellAudio.js';
import { FIRE_SPELLS } from '../combat/spells.config.js';

const _castBarVec = new THREE.Vector3();
const _aimOrbVec = new THREE.Vector3();
const _aimTargetVec = new THREE.Vector3();

export class DevLab {
  constructor(canvasContainer, uiOverlay) {
    this.container = canvasContainer;
    this.ui = uiOverlay || {};

    // 1. 3D Arena
    this.arena = new DevArena(this.container);

    // Target-lock Aiming Line during spellcast
    const aimLineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const aimLineMat = new THREE.LineBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.85,
    });
    this.spellAimLine = new THREE.Line(aimLineGeom, aimLineMat);
    this.spellAimLine.visible = false;
    this.arena.scene.add(this.spellAimLine);

    // 2. Shared visualizer pools
    this.damageTextPool = createDamageTextPool(document.body);
    this.teamDecals = createTeamDecals(this.arena.scene);
    this.overheadBadges = createOverheadBadges(document.body);
    this.wireframes = createWireframeVisualizer(this.arena.scene);
    this.arrowPickup = createArrowPickup(this.arena.scene, new THREE.Vector3(2.5, 0, 0));

    // 3. Combat systems
    this.combatants = [];
    this.hitPipeline = new HitPipeline();
    this.spellVFXPool = new SpellVFXPool(this.arena.scene);
    this.spellSystem = new SpellSystem(this.arena.scene, this.spellVFXPool, this.combatants);
    this.squadController = new SquadController();

    // 4. Sub-controllers
    const statsCanvas = document.getElementById('stats-chart-canvas');
    this.stats = new DevStatsTracker(statsCanvas);
    this.weapons = new DevWeaponsController(this.arena.scene);
    this.weapons.setArena(this.arena);
    this.spells = new DevSpellsController(this.arena.scene, this.spellSystem);
    this.cheats = new DevCheats(this);

    // 5. State & Playback
    this.isPaused = false;
    this.stepRequested = false;
    this.autoRespawn = true;
    this.activeHero = null;
    this.currentHeroKey = 'han';
    this.cpuTickMs = 0.5;
    this.fps = 60;
    this.fpsFrames = 0;
    this.fpsPrevTime = performance.now();

    // Mouse aiming & Raycaster
    this.mouseScreenPos = new THREE.Vector2();
    this.mouseRaycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.groundAimPoint = new THREE.Vector3();

    // Input state tracking & debug overlay
    this.lastInputEvent = 'NONE';
    this.heavyTriggered = false;
    this.lmbDown = false;
    this.rmbDown = false;
    this.lmbHoldTimer = 0.0;

    // Hitbox & debug text toggles
    this.showHitboxes = false;
    this.showDebugText = true;

    // Autonomous AI instances
    this.aiUpdaters = [];

    // Initialize Default Scenario
    this.setupDefaultScenario();

    // Setup Event Listeners & Inputs
    this.setupInputs();
    this.setupCombatEventListeners();

    // Start Animation Loop
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupDefaultScenario() {
    this.clearScenario();
    if (this.arrowPickup) {
      this.arrowPickup.setVisible(true);
    }

    // 1. Player Hero: Han Islat
    this.activeHero = createHeroCombatant({
      heroKey: 'han',
      team: 'player',
      position: new THREE.Vector3(0, 0, 2.0),
      facingYaw: 0,
      scene: this.arena.scene,
      spellSystem: this.spellSystem,
    });
    this.activeHero.targetsProvider = () => this.combatants;
    this.combatants.push(this.activeHero);
    this.stats.setActiveHero(this.activeHero);
    this.weapons.setActiveHero(this.activeHero);

    // 2. Ally Mage: Eolka
    const eolka = createHeroCombatant({
      heroKey: 'eolka',
      team: 'player',
      position: new THREE.Vector3(-2.2, 0, 3.5),
      facingYaw: 0,
      scene: this.arena.scene,
      spellSystem: this.spellSystem,
    });
    this.combatants.push(eolka);

    // Register Squad Skills: Slot 1 Jenna, Slot 2 Aaron, Slot 3 Velkist, Slot 4 Eolka
    this.squadController.registerHero(1, this.activeHero);
    this.squadController.registerHero(3, eolka);

    // Mage AI for Eolka
    const eolkaAI = new MageAI(eolka, this.combatants);
    this.aiUpdaters.push((dt) => {
      if (this.activeHero !== eolka && !eolka.isDead) {
        eolkaAI.update(dt);
      }
    });

    // 3. Enemies
    // A. Passive Dummy
    const dummy = createEnemyCombatant({
      typeKey: 'dummy',
      position: new THREE.Vector3(-3.5, 0, -3.0),
      scene: this.arena.scene,
      spellSystem: this.spellSystem,
    });
    this.combatants.push(dummy);

    // B. Timed Attacker
    const timed = createEnemyCombatant({
      typeKey: 'timed',
      position: new THREE.Vector3(0, 0, -3.5),
      scene: this.arena.scene,
      spellSystem: this.spellSystem,
    });
    this.combatants.push(timed);

    // C. Elite Knight Dummy
    const elite = createEnemyCombatant({
      typeKey: 'elite',
      position: new THREE.Vector3(4.5, 0, 0.5),
      facingYaw: -Math.PI / 2,
      scene: this.arena.scene,
      spellSystem: this.spellSystem,
    });
    this.combatants.push(elite);

    // D. Shaman Caster
    const shaman = createEnemyCombatant({
      typeKey: 'shaman',
      position: new THREE.Vector3(0.0, 0, -6.5),
      scene: this.arena.scene,
      spellSystem: this.spellSystem,
    });
    this.combatants.push(shaman);

    // Save initial snapshot for reset
    this.snapshotInitialStates();
  }

  snapshotInitialStates() {
    for (const c of this.combatants) {
      c._initial = {
        pos: c.position.clone(),
        yaw: c.facingYaw,
        hp: c.hp,
        maxHp: c.maxHp,
        mana: c.mana || 100,
        maxMana: c.maxMana || 100,
        poise: c.poise,
        maxPoise: c.maxPoise,
        stamina: c.stamina || 100,
        maxStamina: c.maxStamina || 100,
      };
    }
  }

  clearScenario() {
    this.weapons.cancelAim();
    this.arena.setAimMode(false);
    const reticle = document.getElementById('aim-reticle');
    if (reticle) reticle.style.display = 'none';

    for (const c of this.combatants) {
      disposeCombatant(c, this.arena.scene);
    }
    this.combatants.length = 0;
    this.aiUpdaters.length = 0;
    this.activeHero = null;
    this.weapons.setActiveHero(null);
    this.damageTextPool.clear();
    this.overheadBadges.clear();
    if (this.arrowPickup) {
      this.arrowPickup.setVisible(false);
    }
    this.stats.reset();
  }

  runSpellShowcase() {
    this.clearScenario();

    // 1. Equip player hero as Eolka (Mage) with staff at Level 12
    this.setPlayerHero('eolka', 'staff', null, 'S', 150, 100, 300, 100);
    if (this.activeHero) {
      this.activeHero.setMageLevel(12);
      this.activeHero.mana = this.activeHero.maxMana;
      this.activeHero.position.set(0, 0, -2.5);
      this.activeHero.facingYaw = 0;
    }

    // 2. Spawn 5 dummy enemies in an arc in front of the mage
    const dummyOffsets = [
      { x: -3.0, z: 4.0 },
      { x: -1.5, z: 4.5 },
      { x: 0.0, z: 5.0 },
      { x: 1.5, z: 4.5 },
      { x: 3.0, z: 4.0 },
    ];
    for (let i = 0; i < dummyOffsets.length; i++) {
      const off = dummyOffsets[i];
      const dummy = createEnemyCombatant({
        enemyKey: 'goblinGrunt',
        name: `Dummy_${i + 1}`,
        team: 'enemy',
        grade: 'B',
        position: new THREE.Vector3(off.x, 0, off.z),
        facingYaw: Math.PI,
        scene: this.arena.scene,
        hp: 3000,
        maxHp: 3000,
      });
      dummy.isSwarmDummy = true;
      this.combatants.push(dummy);
    }

    // 3. Sequentially cast the 7 spells with 1 second interval between them
    const spellsToCast = [
      'emberBolt',
      'fireDartVolley',
      'fireball',
      'flameWall',
      'infernoBeam',
      'fireNova',
      'solarCataclysm',
    ];

    const centerTarget = new THREE.Vector3(0, 0, 4.5);

    spellsToCast.forEach((spellId, idx) => {
      setTimeout(() => {
        if (!this.activeHero || this.activeHero.isDead) return;
        this.activeHero.mana = this.activeHero.maxMana;
        this.activeHero.spellCooldowns[spellId] = 0;
        const targetPos = spellId === 'fireNova' ? this.activeHero.position : centerTarget;
        this.activeHero.castSpell(spellId, targetPos);
        const sp = FIRE_SPELLS[spellId];
        this.damageTextPool.spawn(`[SHOWCASE] ${sp?.name || spellId}`, this.activeHero.position, '#f97316', true);
      }, idx * 1000);
    });
  }

  setPlayerHero(heroKey, weaponKind, shieldKind, grade, hp, stamina, mana, poise) {
    this.weapons.cancelAim();
    this.arena.setAimMode(false);
    const reticle = document.getElementById('aim-reticle');
    if (reticle) reticle.style.display = 'none';

    this.currentHeroKey = heroKey;
    const oldPos = this.activeHero ? this.activeHero.position.clone() : new THREE.Vector3(0, 0, 2.0);
    const oldYaw = this.activeHero ? this.activeHero.facingYaw : 0;

    if (this.activeHero) {
      const idx = this.combatants.indexOf(this.activeHero);
      if (idx !== -1) this.combatants.splice(idx, 1);
      disposeCombatant(this.activeHero, this.arena.scene);
    }

    this.activeHero = createHeroCombatant({
      heroKey,
      weaponKind,
      shieldKind,
      grade,
      hp,
      stamina,
      mana,
      poise,
      position: oldPos,
      facingYaw: oldYaw,
      scene: this.arena.scene,
      spellSystem: this.spellSystem,
    });
    this.activeHero.targetsProvider = () => this.combatants;
    this.combatants.unshift(this.activeHero);
    this.stats.setActiveHero(this.activeHero);
    this.weapons.setActiveHero(this.activeHero);
    this.weapons.setWeapon(weaponKind);
    this.weapons.setShield(shieldKind || 'none');
    this.weapons.setGrade(grade);
    this.squadController.registerHero(1, this.activeHero);
    if (this.arrowPickup) {
      this.arrowPickup.setVisible(true);
    }
    this.snapshotInitialStates();
  }

  addBatchCombatants(opts = {}) {
    const { typeKey = 'grunt', count = 3, team = 'enemy', pattern = 'line', grade = 'E' } = opts;
    const center = team === 'player' ? new THREE.Vector3(-2.5, 0, 2.0) : new THREE.Vector3(0, 0, -4.5);
    const positions = calculateSpawnPositions(pattern, count, center, 2.2);

    for (let i = 0; i < positions.length; i++) {
      let c;
      if (team === 'player') {
        c = createHeroCombatant({
          heroKey: 'jenna',
          team: 'player',
          grade,
          position: positions[i],
          scene: this.arena.scene,
          spellSystem: this.spellSystem,
        });
      } else {
        c = createEnemyCombatant({
          typeKey,
          team: 'enemy',
          grade,
          position: positions[i],
          scene: this.arena.scene,
          spellSystem: this.spellSystem,
        });
      }
      this.combatants.push(c);
      if (c.weapon?.kind === 'bow' || c.typeKey === 'archer') {
        this.aiUpdaters.push(createArcherAI(c, () => this.combatants, this.weapons.arrowPool));
      }
    }
    this.snapshotInitialStates();
  }

  clearEnemies() {
    const toRemove = this.combatants.filter(c => c !== this.activeHero);
    for (const c of toRemove) {
      disposeCombatant(c, this.arena.scene);
      const idx = this.combatants.indexOf(c);
      if (idx !== -1) this.combatants.splice(idx, 1);
    }
    this.aiUpdaters.length = 0;
  }

  spawnEnemyAt(typeKey = 'grunt', x = 0, z = -8.0) {
    const c = createEnemyCombatant({
      typeKey,
      team: 'enemy',
      grade: 'D',
      position: new THREE.Vector3(x, 0, z),
      scene: this.arena.scene,
      spellSystem: this.spellSystem,
    });
    this.combatants.push(c);
    this.snapshotInitialStates();
    return c;
  }

  resetArena() {
    for (const c of this.combatants) {
      c.isDead = false;
      if (c.mesh) c.mesh.visible = true;
      if (c._initial) {
        c.position.copy(c._initial.pos);
        c.facingYaw = c._initial.yaw;
        c.hp = c._initial.hp;
        c.maxHp = c._initial.maxHp;
        c.mana = c._initial.mana;
        c.maxMana = c._initial.maxMana;
        c.poise = c._initial.poise;
        c.maxPoise = c._initial.maxPoise;
        c.stamina = c._initial.stamina;
        c.maxStamina = c._initial.maxStamina;
      } else {
        c.hp = c.maxHp;
        c.mana = c.maxMana;
        c.poise = c.maxPoise;
        c.stamina = c.maxStamina;
      }
      c.statusEffects?.clear();
      if (c.spellCooldowns) {
        for (const k in c.spellCooldowns) c.spellCooldowns[k] = 0;
      }
      c.stateMachine?.transitionTo('IDLE');
      c.iFrameTimer = 0;
      c.parryWindowTimer = 0;
      c.counterWindowTimer = 0;
      c._respawnTimer = 0;
      if (c.attackTimer !== undefined) c.attackTimer = 0;
      if (c.castTimer !== undefined) c.castTimer = 0;
    }
    this.stats.reset();
    combatEvents.emit('onReset', { message: 'DevLab Arena Reset' });
    this.damageTextPool.spawn('ARENA RESET', this.activeHero.position, '#38bdf8', true);
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  stepFrame() {
    this.stepRequested = true;
  }

  setTimeScale(scale) {
    timeScale.debugScale = scale;
  }

  toggleWireframes() {
    return this.wireframes.toggle();
  }

  toggleHitboxes() {
    this.showHitboxes = !this.showHitboxes;
    return this.showHitboxes;
  }

  toggleDebugText() {
    this.showDebugText = !this.showDebugText;
    const el = document.getElementById('overhead-hud-container');
    if (el) el.style.display = this.showDebugText ? 'block' : 'none';
    return this.showDebugText;
  }

  setupInputs() {
    this.keys = new Set();
    this.lmbDown = false;
    this.lmbHoldTimer = 0.0;
    this.rmbDown = false;

    window.addEventListener('mousemove', (e) => {
      this.mouseScreenPos.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseScreenPos.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.mouseRaycaster.setFromCamera(this.mouseScreenPos, this.arena.camera);
      this.mouseRaycaster.ray.intersectPlane(this.groundPlane, this.groundAimPoint);
    });

    window.addEventListener('keydown', (e) => {
      // Do not trigger hotkeys if typing in an input field!
      if (e.target.matches('input, select, textarea')) return;

      this.keys.add(e.code);

      // F3: Toggle Fire Mage Debug Panel
      if (e.code === 'F3') {
        e.preventDefault();
        const dbg = document.getElementById('mage-debug-panel');
        if (dbg) {
          dbg.style.display = (dbg.style.display === 'none' || !dbg.style.display) ? 'block' : 'none';
        }
        return;
      }

      // Reset shortcut: KeyR (or Shift+R)
      if (e.code === 'KeyR' && (e.shiftKey || this.activeHero?.isDead)) {
        this.resetArena();
        return;
      }

      // Pause: KeyP
      if (e.code === 'KeyP') {
        this.togglePause();
        return;
      }

      // Step frame: KeyN
      if (e.code === 'KeyN') {
        this.stepFrame();
        return;
      }

      // Space: Dodge roll
      if (e.code === 'Space') {
        e.preventDefault();
        // Dodge cancels aim mode if aiming
        if (this.weapons.isBowAiming) {
          this.arena.setAimMode(false);
          this.weapons.cancelAim();
          const reticle = document.getElementById('aim-reticle');
          if (reticle) reticle.style.display = 'none';
        }

        let mx = 0, mz = 0;
        if (this.keys.has('KeyW')) mz -= 1;
        if (this.keys.has('KeyS')) mz += 1;
        if (this.keys.has('KeyA')) mx -= 1;
        if (this.keys.has('KeyD')) mx += 1;

        const dir = new THREE.Vector3(mx, 0, mz);
        if (dir.lengthSq() < 0.001) {
          const yaw = this.activeHero.facingYaw;
          dir.set(Math.sin(yaw), 0, Math.cos(yaw));
        } else {
          dir.normalize();
        }
        if (this.weapons.isBowAiming) {
          this.arena.setAimMode(false, this.activeHero);
          this.weapons.cancelAim();
          const reticle = document.getElementById('aim-reticle');
          if (reticle) reticle.style.display = 'none';
        }
        this.activeHero.stateMachine?.transitionTo('DODGE', { direction: dir });
      }

      // Key X: Toggle weapon between bow and dagger (when arrows > 0)
      if (e.code === 'KeyX' && this.activeHero && !this.activeHero.isDead) {
        if (this.activeHero.weapon.kind === 'dagger' && this.activeHero.arrows > 0) {
          this.activeHero.swapToBow(() => {
            this.weapons.setWeapon('bow');
            this.damageTextPool.spawn('SWAPPED TO BOW', this.activeHero.position, '#38bdf8', false);
          });
        } else if (this.activeHero.weapon.kind === 'bow') {
          this.activeHero.swapToDagger(() => {
            this.weapons.setWeapon('dagger');
            this.damageTextPool.spawn('SWAPPED TO DAGGER', this.activeHero.position, '#facc15', false);
          });
        }
      }

      // Key Q: Mana Potion (Key Q, restores 40% max mana, 3 charges, 8s cd)
      if (e.code === 'KeyQ') {
        if (this.activeHero && !this.activeHero.isDead) {
          const used = this.activeHero.useManaPotion();
          if (used) {
            this.damageTextPool.spawn('+40% MANA (POTION)', this.activeHero.position, '#38bdf8', true);
          } else if (this.activeHero.manaPotions <= 0) {
            this.damageTextPool.spawn('NO POTIONS LEFT', this.activeHero.position, '#ef4444', false);
          } else if (this.activeHero.manaPotionCooldown > 0) {
            this.damageTextPool.spawn(`POTION ON COOLDOWN (${this.activeHero.manaPotionCooldown.toFixed(1)}s)`, this.activeHero.position, '#facc15', false);
          }
        }
        return;
      }

      const isMageWeapon = this.activeHero?.weapon?.kind === 'staff';

      // Hotkeys 1 to 6 (Spells if staff equipped, squad skills otherwise)
      if (e.code === 'Digit1') {
        if (isMageWeapon) this.activeHero.castSpell('emberBolt', this.groundAimPoint);
        else this.squadController.triggerSquadSkill(0, this.groundAimPoint);
      }
      if (e.code === 'Digit2') {
        if (isMageWeapon) this.activeHero.castSpell('fireDartVolley', this.groundAimPoint);
        else this.squadController.triggerSquadSkill(1, this.groundAimPoint);
      }
      if (e.code === 'Digit3') {
        if (isMageWeapon) this.activeHero.castSpell('fireball', this.groundAimPoint);
        else this.squadController.triggerSquadSkill(2, this.groundAimPoint);
      }
      if (e.code === 'Digit4') {
        if (isMageWeapon) this.activeHero.castSpell('flameWall', this.groundAimPoint);
        else this.squadController.triggerSquadSkill(3, this.groundAimPoint);
      }
      if (e.code === 'Digit5') {
        if (isMageWeapon) {
          if (this.activeHero.channeledSpell) this.activeHero.stopChannel();
          else this.activeHero.castSpell('infernoBeam', this.groundAimPoint);
        }
      }
      if (e.code === 'Digit6') {
        if (isMageWeapon) this.activeHero.castSpell('fireNova', this.groundAimPoint);
      }

      // Key R: Solar Cataclysm (Ultimate) for staff, or fallback spell if other weapon
      if (e.code === 'KeyR' && !e.shiftKey && !this.activeHero?.isDead) {
        if (isMageWeapon) {
          this.activeHero.castSpell('solarCataclysm', this.groundAimPoint);
        } else {
          this.spells.castSpell('lightningChain', this.activeHero, this.groundAimPoint);
        }
      }

      // Legacy direct spell keys
      if (e.code === 'KeyE') this.spells.castSpell('iceSpike', this.activeHero, this.groundAimPoint);
      if (e.code === 'KeyF') this.spells.castSpell('heal', this.activeHero, this.groundAimPoint);
      if (e.code === 'KeyT') this.spells.castSpell('ward', this.activeHero, this.groundAimPoint);
      if (e.code === 'KeyG') this.spells.castSpell('meteor', this.activeHero, this.groundAimPoint);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('mousedown', (e) => {
      // Exclude clicks inside UI panels, top navigation bar, and controls
      if (e.target.closest('#left-panel, #right-panel, #top-navbar, .side-panel, button, select, input, label, textarea')) return;

      if (e.button === 0) {
        this.lastInputEvent = 'LMB DOWN';
        if (this.weapons.currentWeapon === 'bow') {
          if (this.weapons.isBowAiming) {
            // LMB while aiming = fire arrow toward screen aim point
            this.lastInputEvent = 'LMB FIRE (AIMED)';
            const aimPoint = this.arena.getScreenAimPoint(undefined, this.combatants, this.activeHero);
            this.weapons.fireBowAimed(aimPoint, true);
            // Do NOT leave aim mode or hide reticle while RMB is held!
            if (this.activeHero.arrows <= 0) {
              this.arena.setAimMode(false, this.activeHero);
              this.weapons.cancelAim();
              const reticle = document.getElementById('aim-reticle');
              if (reticle) reticle.style.display = 'none';
              this.activeHero.swapToDagger(() => this.weapons.setWeapon('dagger'));
            }
          } else {
            // Track for tap snap shot or hold
            this.lmbDown = true;
            this.lmbDownStartTime = performance.now();
            this.lmbHoldTimer = 0.0;
            this.heavyTriggered = false;
          }
        } else {
          this.lmbDown = true;
          this.lmbDownStartTime = performance.now();
          this.lmbHoldTimer = 0.0;
          this.heavyTriggered = false;
        }
      } else if (e.button === 2) {
        e.preventDefault();
        this.lastInputEvent = 'RMB DOWN';
        if (this.weapons.currentWeapon === 'bow') {
          // Archers do not block or parry. Hold RMB = over-the-shoulder aim mode
          this.arena.prevAimX = e.clientX;
          this.arena.prevAimY = e.clientY;
          this.arena.setAimMode(true, this.activeHero);
          this.weapons.startAim();
          const reticle = document.getElementById('aim-reticle');
          if (reticle) reticle.style.display = 'block';
        } else {
          this.rmbDown = true;
          this.activeHero?.stateMachine?.transitionTo('BLOCK');
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.lastInputEvent = 'LMB UP';
        if (this.weapons.currentWeapon === 'bow') {
          if (this.lmbDown && !this.weapons.isBowAiming) {
            // LMB tap without aiming = quick snap shot (weak, wide spread)
            this.lastInputEvent = 'LMB SNAP SHOT';
            this.weapons.fireBowSnapshot(this.groundAimPoint);
            if (this.activeHero.arrows <= 0) {
              this.activeHero.swapToDagger(() => this.weapons.setWeapon('dagger'));
            }
          }
        } else if (this.lmbDown && !this.heavyTriggered) {
          const holdSec = (performance.now() - (this.lmbDownStartTime || 0)) / 1000;
          if (holdSec >= 0.35) {
            this.heavyTriggered = true;
            this.lastInputEvent = 'LMB HOLD (HEAVY)';
            this.triggerHeroAttack(true);
          } else {
            // LMB click/tap = Light attack combo
            this.lastInputEvent = 'LMB TAP (LIGHT)';
            this.triggerHeroAttack(false);
          }
        }
        this.lmbDown = false;
        this.lmbHoldTimer = 0.0;
      } else if (e.button === 2) {
        this.lastInputEvent = 'RMB UP';
        this.rmbDown = false;
        if (this.weapons.currentWeapon === 'bow') {
          // Releasing RMB without shooting lowers the bow, exits aim mode
          this.arena.setAimMode(false, this.activeHero);
          this.weapons.cancelAim();
          const reticle = document.getElementById('aim-reticle');
          if (reticle) reticle.style.display = 'none';
        } else {
          if (this.activeHero?.stateMachine?.state === 'BLOCK') {
            this.activeHero.stateMachine.transitionTo('IDLE');
          }
        }
      }
    });

    window.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('input, textarea')) e.preventDefault();
    });
  }

  triggerHeroAttack(isHeavy = false) {
    if (!this.activeHero?.stateMachine || this.activeHero.isDead) return;

    // Face toward cursor aim point
    const dx = this.groundAimPoint.x - this.activeHero.position.x;
    const dz = this.groundAimPoint.z - this.activeHero.position.z;
    if (Math.hypot(dx, dz) > 0.15) {
      this.activeHero.facingYaw = Math.atan2(dx, dz);
    }

    const st = this.activeHero.stateMachine.state;
    if (st === 'IDLE' || st === 'MOVE' || this.activeHero.stateMachine.attackPhase === ATTACK_PHASES.RECOVERY) {
      this.activeHero.stateMachine.transitionTo('ATTACK', { heavy: isHeavy, targets: this.combatants });
    } else {
      this.activeHero.stateMachine.bufferInput('ATTACK', { heavy: isHeavy, targets: this.combatants });
    }
  }

  showHitMarker(isHeadshot = false) {
    const marker = document.getElementById('hit-marker');
    if (!marker) return;
    const line1 = marker.querySelector('.hm-line1');
    const line2 = marker.querySelector('.hm-line2');
    const color = isHeadshot ? '#ef4444' : '#ffffff';
    const shadow = isHeadshot ? '0 0 6px #ef4444' : '0 0 4px #38bdf8';
    if (line1) { line1.style.background = color; line1.style.boxShadow = shadow; }
    if (line2) { line2.style.background = color; line2.style.boxShadow = shadow; }
    marker.style.opacity = '1';
    if (this._hitMarkerTimeout) clearTimeout(this._hitMarkerTimeout);
    this._hitMarkerTimeout = setTimeout(() => {
      marker.style.opacity = '0';
    }, 150);
  }

  setupCombatEventListeners() {
    combatEvents.on('onHit', (payload) => {
      const defName = payload.targetName || payload.defenderName;
      const target = this.combatants.find((c) => c.name === defName);
      const pos = payload.hitPoint || (target ? target.position : this.groundAimPoint);
      const isCrit = payload.isCritical || payload.isPoiseBreak;
      const isBurn = payload.isBurn || payload.attackerName === 'Burn';
      // Part 3 requirements: white = normal, orange = burn damage, yellow = critical
      const col = isBurn ? '#f97316' : (isCrit ? '#facc15' : '#ffffff');
      this.damageTextPool.spawn(`-${payload.damage}`, pos, col, isCrit);
    });

    combatEvents.on('onCombo', (payload) => {
      if (this.activeHero) {
        this.damageTextPool.spawn(`🔥 ${payload.name} (${payload.bonus})`, this.activeHero.position, '#f97316', true);
      }
    });

    combatEvents.on('onOverheat', (payload) => {
      if (this.activeHero) {
        this.damageTextPool.spawn('⚠️ OVERHEATED', this.activeHero.position, '#ef4444', true);
      }
    });

    combatEvents.on('onBlock', (payload) => {
      const defName = payload.targetName || payload.defenderName;
      const target = this.combatants.find((c) => c.name === defName);
      const pos = target ? target.position : this.groundAimPoint;
      this.damageTextPool.spawn(`BLOCKED (-${payload.chipDamage})`, pos, '#38bdf8', false);
    });

    combatEvents.on('onParry', (payload) => {
      const defName = payload.targetName || payload.defenderName;
      const target = this.combatants.find((c) => c.name === defName);
      const pos = target ? target.position : this.groundAimPoint;
      this.damageTextPool.spawn('PERFECT PARRY!', pos, '#00ffff', true);
    });

    combatEvents.on('onHeal', (payload) => {
      const target = this.combatants.find((c) => c.name === payload.targetName);
      const pos = target ? target.position : this.groundAimPoint;
      this.damageTextPool.spawn(`+${payload.amount} HP`, pos, '#22c55e', true);
    });

    combatEvents.on('onWard', (payload) => {
      const target = this.combatants.find((c) => c.name === payload.targetName);
      const pos = target ? target.position : this.groundAimPoint;
      this.damageTextPool.spawn(`WARD +${payload.barrierHp}`, pos, '#06b6d4', false);
    });

    // Fire Mage Synthesized WebAudio sound hooks
    combatEvents.on('onSpellCast', ({ spellId }) => {
      playSpellSound(spellId);
    });
    combatEvents.on('onPotionUsed', () => {
      playPotionSound();
    });
    combatEvents.on('onManaFizzle', () => {
      playFizzleSound();
    });
    combatEvents.on('onCastInterrupted', () => {
      const barEl = document.getElementById('overhead-cast-bar');
      if (barEl) barEl.style.display = 'none';
      playFizzleSound();
    });
  }

  updateCastBar() {
    const barEl = document.getElementById('overhead-cast-bar');
    const fillEl = document.getElementById('overhead-cast-fill');
    const textEl = document.getElementById('overhead-cast-text');
    if (!barEl || !fillEl || !textEl) return;

    const hero = this.activeHero;
    if (!hero || hero.isDead || hero.stateMachine.state !== 'CAST') {
      if (barEl.style.display !== 'none') barEl.style.display = 'none';
      return;
    }

    const castDuration = hero.stateMachine.castDuration || hero.stateMachine.currentSpell?.castTime || 0;
    if (castDuration <= 0.4) {
      if (barEl.style.display !== 'none') barEl.style.display = 'none';
      return;
    }

    _castBarVec.copy(hero.position);
    _castBarVec.y += 2.15;
    _castBarVec.project(this.arena.camera);

    if (_castBarVec.z > 1.0) {
      if (barEl.style.display !== 'none') barEl.style.display = 'none';
      return;
    }

    const sx = (_castBarVec.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-(_castBarVec.y * 0.5) + 0.5) * window.innerHeight;

    barEl.style.display = 'block';
    barEl.style.left = `${sx}px`;
    barEl.style.top = `${sy}px`;

    const timer = hero.stateMachine.castTimer !== undefined ? hero.stateMachine.castTimer : (hero.stateMachine.stateTime || 0);
    const progress = Math.max(0, Math.min(100, (timer / castDuration) * 100));
    fillEl.style.width = `${progress}%`;
    const spellName = hero.stateMachine.currentSpell?.name || 'Casting...';
    textEl.textContent = `${spellName} ${timer.toFixed(1)}s / ${castDuration.toFixed(1)}s`;
  }

  animate() {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const rawDt = Math.min(0.05, (now - this.lastTime) * 0.001);
    this.lastTime = now;

    // Performance telemetry
    this.fpsFrames++;
    if (now - this.fpsPrevTime >= 500) {
      this.fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsPrevTime));
      this.fpsFrames = 0;
      this.fpsPrevTime = now;
    }

    const tStart = performance.now();

    // Determine simulation delta
    let worldDt = 0;
    if (!this.isPaused || this.stepRequested) {
      worldDt = timeScale.update(rawDt);
      this.stepRequested = false;
    }

    // Apply active cheats
    this.cheats.update();

    if (worldDt > 0) {
      // Squad controller
      this.squadController.update(worldDt);

      // Hero Input & Movement
      if (this.lmbDown && !this.heavyTriggered && this.weapons.currentWeapon !== 'bow') {
        this.lmbHoldTimer += rawDt;
        const holdSec = (now - (this.lmbDownStartTime || now)) / 1000;
        if (this.lmbHoldTimer >= 0.35 || holdSec >= 0.35) {
          this.heavyTriggered = true;
          this.lastInputEvent = 'LMB HOLD (HEAVY)';
          this.triggerHeroAttack(true);
        }
      }

      // If bow aiming: continuously track screen aim point (Issues 1 & 2)
      if (this.weapons.isBowAiming && this.activeHero && !this.activeHero.isDead) {
        this.groundAimPoint.copy(this.arena.getScreenAimPoint(undefined, this.combatants, this.activeHero));
      }

      const hero = this.activeHero;
      if (hero && (hero.stateMachine.state === 'IDLE' || hero.stateMachine.state === 'MOVE' || hero.stateMachine.state === 'CAST' || hero.stateMachine.state === 'AIM')) {
        let mx = 0, mz = 0;
        if (this.keys.has('KeyW')) mz -= 1;
        if (this.keys.has('KeyS')) mz += 1;
        if (this.keys.has('KeyA')) mx -= 1;
        if (this.keys.has('KeyD')) mx += 1;

        if (mx !== 0 || mz !== 0) {
          const len = Math.hypot(mx, mz);
          // Slow strafe: while aimed, hero can still walk with WASD, but at 40% speed and always facing crosshair
          const isAiming = hero.stateMachine.state === 'AIM';
          const speedFactor = isAiming ? 0.40 : 1.0;
          const vx = (mx / len) * hero.effectiveMoveSpeed * speedFactor;
          const vz = (mz / len) * hero.effectiveMoveSpeed * speedFactor;
          hero.position.x += vx * worldDt;
          hero.position.z += vz * worldDt;

          if (isAiming) {
            hero.facingYaw = this.arena.aimYaw;
          } else {
            hero.facingYaw = Math.atan2(vx, vz);
            if (hero.stateMachine.state !== 'CAST') {
              hero.stateMachine.transitionTo('MOVE');
            }
          }
        } else if (hero.stateMachine.state === 'MOVE') {
          hero.stateMachine.transitionTo('IDLE');
        }
      }

      // Arena boundary clamp (18m arena floor radius)
      for (const c of this.combatants) {
        const d = Math.hypot(c.position.x, c.position.z);
        const maxR = this.arena.floor.arenaRadius - c.capsuleRadius;
        if (d > maxR) {
          const ratio = maxR / d;
          c.position.x *= ratio;
          c.position.z *= ratio;
        }
      }

      // Update AI behaviors
      for (const updater of this.aiUpdaters) {
        updater(worldDt);
      }

      // Timed attacker dummies
      for (const c of this.combatants) {
        if (!c.isDead && c.typeKey === 'timed') {
          c.attackTimer += worldDt;
          const cycle = c.attackTimer % (c.attackInterval || 3.0);
          const dx = this.activeHero.position.x - c.position.x;
          const dz = this.activeHero.position.z - c.position.z;
          c.facingYaw = Math.atan2(dx, dz);
          if (cycle >= 2.70 && cycle < 2.75 && c.stateMachine.state !== 'ATTACK') {
            c.stateMachine.transitionTo('ATTACK');
          }
        }

        // Shaman casters
        if (!c.isDead && c.typeKey === 'shaman') {
          c.castTimer += worldDt;
          const dx = this.activeHero.position.x - c.position.x;
          const dz = this.activeHero.position.z - c.position.z;
          c.facingYaw = Math.atan2(dx, dz);
          if (c.castTimer >= (c.castInterval || 4.0)) {
            c.castTimer = 0.0;
            c.spellToggle = !c.spellToggle;
            if (c.spellToggle) {
              c.castSpell('fireball', this.activeHero.position, this.activeHero);
            } else {
              c.castSpell('meteor', this.activeHero.position);
            }
          }
        }
      }

      // Update all combatants
      for (let i = 0; i < this.combatants.length; i++) {
        this.combatants[i].update(rawDt, worldDt);
      }

      // Auto-respawn logic
      if (this.autoRespawn) {
        for (const c of this.combatants) {
          if (c.isDead && c !== this.activeHero) {
            c._respawnTimer = (c._respawnTimer || 0) + worldDt;
            if (c._respawnTimer >= 3.0) {
              c.isDead = false;
              if (c.mesh) c.mesh.visible = true;
              if (c._initial) {
                c.position.copy(c._initial.pos);
                c.facingYaw = c._initial.yaw;
                c.hp = c._initial.hp;
                c.maxHp = c._initial.maxHp;
                c.mana = c._initial.mana;
                c.poise = c._initial.poise;
                c.stamina = c._initial.stamina;
              } else {
                c.hp = c.maxHp;
                c.mana = c.maxMana;
                c.poise = c.maxPoise;
                c.stamina = c.maxStamina;
              }
              c.statusEffects?.clear();
              c.stateMachine?.transitionTo('IDLE');
              c._respawnTimer = 0;
              this.damageTextPool.spawn('RESPAWNED', c.position, '#4ade80', false);
            }
          }
        }
      }

      // Swept-capsule hit pipeline & Spells
      this.hitPipeline.update(this.combatants, worldDt);
      this.spellSystem.update(worldDt);
      this.weapons.update(worldDt, this.groundAimPoint, this.combatants, {
        onHit: (target, pt, isHeadshot, dmg) => {
          this.showHitMarker(isHeadshot);
        },
        onHeadshot: (target, pt, dmg) => {
          this.showHitMarker(true);
        }
      });
      this.spells.update(worldDt);
    }

    // Target-lock aiming line from staff orb to target point during spellcast
    if (this.spellAimLine) {
      if (this.activeHero && this.activeHero.stateMachine && this.activeHero.stateMachine.state === 'CAST') {
        const orbObj = this.activeHero.rig?.weaponModel?.group?.getObjectByName('staff_orb');
        if (orbObj) {
          orbObj.getWorldPosition(_aimOrbVec);
        } else {
          _aimOrbVec.copy(this.activeHero.position);
          _aimOrbVec.y += 1.5;
        }
        _aimTargetVec.copy(this.activeHero.castTargetPos || this.groundAimPoint);

        const posAttr = this.spellAimLine.geometry.attributes.position;
        posAttr.setXYZ(0, _aimOrbVec.x, _aimOrbVec.y, _aimOrbVec.z);
        posAttr.setXYZ(1, _aimTargetVec.x, _aimTargetVec.y, _aimTargetVec.z);
        posAttr.needsUpdate = true;
        this.spellAimLine.visible = true;
      } else if (this.spellAimLine.visible) {
        this.spellAimLine.visible = false;
      }
    }

    // Visual updates
    this.damageTextPool.update(rawDt, this.arena.camera);
    this.updateCastBar();
    this.teamDecals.update(this.combatants, this.activeHero);
    if (this.showDebugText) {
      this.overheadBadges.update(this.combatants, this.activeHero, this.arena.camera);
    }
    this.wireframes.update(this.combatants, this.activeHero);
    this.stats.update(rawDt, this.combatants);

    // Update Arrow Pickup item in arena
    if (this.arrowPickup) {
      this.arrowPickup.update(rawDt, this.activeHero, () => {
        if (this.activeHero && this.activeHero.arrows < this.activeHero.maxArrows) {
          this.activeHero.arrows = this.activeHero.maxArrows;
          this.damageTextPool.spawn(`+${this.activeHero.maxArrows} ARROWS (REFILLED)`, this.activeHero.position, '#38bdf8', true);
        }
      });
    }

    // Camera follow & render
    this.arena.update(this.activeHero, rawDt);
    this.arena.render();

    // High-resolution CPU frame tick time
    const frameCpu = performance.now() - tStart;
    this.cpuTickMs = Math.max(0.08, this.cpuTickMs * 0.85 + frameCpu * 0.15);

    // Update on-screen debug line: Last mouse input & Hero state
    const debugEl = document.getElementById('input-hero-debug');
    if (debugEl) {
      if (this.activeHero) {
        const st = this.activeHero.stateMachine.state;
        const ph = this.activeHero.stateMachine.attackPhase;
        const wep = (this.activeHero.weapon?.kind || 'NONE').toUpperCase();
        const arr = `ARROWS: ${this.activeHero.arrows ?? 0}/${this.activeHero.maxArrows ?? 20}`;
        debugEl.textContent = `LAST INPUT: ${this.lastInputEvent} | HERO STATE: ${st} [${ph}] | WEAPON: ${wep} | ${arr}`;
      } else {
        debugEl.textContent = `LAST INPUT: ${this.lastInputEvent} | HERO STATE: NONE | WEAPON: NONE | ARROWS: 0/0`;
      }
    }

    // UI telemetry update callback
    if (this.ui.update) {
      this.ui.update(this);
    }
  }
}
