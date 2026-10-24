import * as THREE from 'three';
import {
  createHeroCombatant,
  createEnemyCombatant,
  createArcherAI,
  calculateSpawnPositions,
  disposeCombatant,
} from './devCombatants.js';
import { MageAI } from '../combat/MageAI.js';
import { combatEvents } from '../combat/CombatEvents.js';
import { FIRE_SPELLS } from '../combat/spells.config.js';

export const devLabScenarioMethods = {
  setupDefaultScenario() {
    this.clearScenario();
    if (this.arrowPickup) {
      this.arrowPickup.setVisible(true);
    }

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

    const eolka = createHeroCombatant({
      heroKey: 'eolka',
      team: 'player',
      position: new THREE.Vector3(-2.2, 0, 3.5),
      facingYaw: 0,
      scene: this.arena.scene,
      spellSystem: this.spellSystem,
    });
    this.combatants.push(eolka);

    this.squadController.registerHero(1, this.activeHero);
    this.squadController.registerHero(3, eolka);

    const eolkaAI = new MageAI(eolka, this.combatants);
    this.aiUpdaters.push((dt) => {
      if (this.activeHero !== eolka && !eolka.isDead) {
        eolkaAI.update(dt);
      }
    });

    const dummy = createEnemyCombatant({
      typeKey: 'dummy',
      position: new THREE.Vector3(-3.5, 0, -3.0),
      scene: this.arena.scene,
      spellSystem: this.spellSystem,
    });
    this.combatants.push(dummy);

    const timed = createEnemyCombatant({
      typeKey: 'timed',
      position: new THREE.Vector3(0, 0, -3.5),
      scene: this.arena.scene,
      spellSystem: this.spellSystem,
    });
    this.combatants.push(timed);

    const elite = createEnemyCombatant({
      typeKey: 'elite',
      position: new THREE.Vector3(4.5, 0, 0.5),
      facingYaw: -Math.PI / 2,
      scene: this.arena.scene,
      spellSystem: this.spellSystem,
    });
    this.combatants.push(elite);

    const shaman = createEnemyCombatant({
      typeKey: 'shaman',
      position: new THREE.Vector3(0.0, 0, -6.5),
      scene: this.arena.scene,
      spellSystem: this.spellSystem,
    });
    this.combatants.push(shaman);

    this.snapshotInitialStates();
  },

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
  },

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
  },

  runSpellShowcase() {
    this.clearScenario();

    this.setPlayerHero('eolka', 'staff', null, 'S', 150, 100, 300, 100);
    if (this.activeHero) {
      this.activeHero.setMageLevel(12);
      this.activeHero.mana = this.activeHero.maxMana;
      this.activeHero.position.set(0, 0, -2.5);
      this.activeHero.facingYaw = 0;
    }

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
  },

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
  },

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
  },

  clearEnemies() {
    const toRemove = this.combatants.filter(c => c !== this.activeHero);
    for (const c of toRemove) {
      disposeCombatant(c, this.arena.scene);
      const idx = this.combatants.indexOf(c);
      if (idx !== -1) this.combatants.splice(idx, 1);
    }
    this.aiUpdaters.length = 0;
  },

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
  },

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
  },
};