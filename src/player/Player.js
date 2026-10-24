import * as THREE from 'three';
import { getCombatStats } from '../core/Stats.js';
import { gameState } from '../core/GameState.js';
import { HeroRig } from '../art/HeroRig.js';
import { PRESETS } from '../art/presets.js';
import { ArrowPool } from '../combat/ArrowPool.js';
import { MANA_CONFIG, calculateMaxMana } from '../combat/spells.config.js';
import { getHeroLoadout } from '../core/loadout.js';
import { onEquipmentChanged } from '../core/equipmentEvents.js';
import { MovementMixin } from './mixins/MovementMixin.js';
import { CombatMixin } from './mixins/CombatMixin.js';
import { BowSpellMixin } from './mixins/BowSpellMixin.js';

export class Player extends MovementMixin(CombatMixin(BowSpellMixin(class {}))) {
  constructor(scene) {
    super();
    this.scene = scene;
    this.mesh = new THREE.Group();

    const controlledHero = typeof gameState?.getControlledHero === 'function'
      ? gameState.getControlledHero()
      : (gameState?.heroes?.find((h) => h.id === 'hero_han') || null);
    this.hero = controlledHero;
    this.heroId = controlledHero?.id || 'hero_han';
    this.look = controlledHero?.look || PRESETS.han;
    this.rig = new HeroRig(this.look);
    this.mesh.add(this.rig.group);
    this.mesh._heroRig = this.rig;

    // Soft circular blob shadow
    const shadowGeo = new THREE.CircleGeometry(0.45, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.y = 0.02;
    this.mesh.add(shadow);

    // 5. Footstep Dust Pool (20 reused meshes)
    this.dustPool = [];
    const dustGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    for (let i = 0; i < 20; i++) {
      const dustMat = new THREE.MeshBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.5,
      });
      const dustMesh = new THREE.Mesh(dustGeo, dustMat);
      dustMesh.visible = false;
      if (this.scene) this.scene.add(dustMesh);
      this.dustPool.push({
        mesh: dustMesh,
        life: 0,
        maxLife: 0.5,
        vy: 0.8,
      });
    }
    this.dustStepTimer = 0;

    // Movement & Physics
    this.mesh.position.set(0, 0, 0);
    this.velocityY = 0;
    this.isGrounded = true;
    this.walkSpeed = 5;
    this.sprintSpeed = 9;
    this.jumpVelocity = 7;
    this.gravity = 20;
    this.animTime = 0;

    // Town obstacle collision (hub only). The walk-height map decides where
    // the hero STANDS; LAND_ONLY drops every prop from it, so these shapes
    // are what actually stop him (fences, tree trunks, boulders, walls).
    this.townBlockers = [];
    this.blockerRadius = 0.4;
    this.blockerSkin = 0.02;
    this.blockerCellSize = 4.0;
    this.blockerPasses = 2;
    this.blockerGrid = null;
    this.blockerGridW = 0;
    this.blockerGridH = 0;
    this.blockerGridMinX = 0;
    this.blockerGridMinZ = 0;

    // Combat Stats & Resources
    this.hp = 100;
    this.maxHp = 100;
    this.bleedingTimer = 0;
    this.brinkNotified = false;
    this.crisisAwakened = false;
    this.berserkActive = false;
    this.berserkAuraLight = null;
    this.berserkAuraMesh = null;
    this.stamina = 100;
    this.maxStamina = 100;
    this.baseDamage = 14;
    this.staminaRegenDelay = 0;
    this.dead = false;
    this.damageDealt = 0;
    this.kills = 0;

    // Economy
    this.gold = 0;
    this.tickets = 0;

    // Equipment: taken from the controlled hero's loadout
    this.weapon = this.hero?.equipment?.weapon || null;
    this.shield = this.hero?.equipment?.offhand || null;
    this.armor = this.hero?.equipment?.armor || null;
    this.loadout = getHeroLoadout(this.hero);
    this.rebuildWeaponMesh();

    // Combat Mechanics
    this.comboStep = 0;
    this.comboTimer = 0;
    this.swingAnimTimer = 0;
    this.attackTimer = 0;
    this.attackDuration = 0.48;
    this.hitStop = 0;
    this.hitTimer = 0;
    this.deathTimer = 0;
    this.isMining = false;
    this.miningTimer = 0;
    this.isCheering = false;
    this.cheerTimer = 0;
    this.enemyNearby = 999;

    // Blocking & Parry
    this.isBlocking = false;
    this.blockTimer = 0;
    this.guardBreakTimer = 0;
    this.bashCooldown = 0;
    this.bashAnimTimer = 0;

    // Footwork Step (Double-tap movement key)
    this.footworkTimer = 0;
    this.footworkCooldown = 0;
    this.footworkDir = new THREE.Vector3();
    this.lastTapTimes = { KeyW: 0, KeyA: 0, KeyS: 0, KeyD: 0 };
    this.prevKeysDown = new Set();

    // Dodge Roll (Key Q only)
    this.isRolling = false;
    this.rollTimer = 0;
    this.rollCooldown = 0;
    this.rollDir = new THREE.Vector3(0, 0, 1);

    // Feedback
    this.invulnerableTimer = 0;
    this.flashRedTimer = 0;
    this.damageFlashTimer = 0;
    this.onParryText = null;

    // Archery State Machine (Realistic Archery Engine)
    this.isAiming = false;
    this.drawAmount = 0.0;
    this.drawTimer = 0.0;
    this.isTremor = false;
    this.releaseTimer = 0.0;
    this.snapshotTimer = 0.0;
    this.snapshotDuration = 0.30;
    this.pendingSnapshotShot = false;
    this.snapshotShotDelay = 0;
    this.prevLmbDown = false;
    this.arrowPool = this.scene ? new ArrowPool(this.scene) : null;
    this.lastEnemies = [];
    this.arrows = gameState?.arrows ?? 20;
    this.maxArrows = 20;

    // Fire Mage Spell & Mana System
    this.playerClass = gameState?.playerClass || 'Vanguard';
    this.mageLevel = 1;
    this.intelligence = 16;
    this.maxMana = calculateMaxMana(this.intelligence, this.mageLevel);
    this.mana = this.maxMana;
    this.manaRegenTimer = 0;
    this.manaRegenDelay = MANA_CONFIG.regenPauseAfterCast;
    this.manaPotions = gameState?.manaPotions ?? MANA_CONFIG.potion.initialCount;
    this.manaPotionCooldown = 0;
    this.maxManaPotionCooldown = MANA_CONFIG.potion.cooldown;
    this.spellCooldowns = {};
    this.spellMastery = gameState?.spellMastery || {};
    this.recentSpellCastTimes = [];
    this.isOverheated = false;
    this.overheatTimer = 0;
    this.manaFizzleTimer = 0;
    this.isCasting = false;
    this.isCastingUltimate = false;
    this.castProgress = 0;
    this.castDuration = 0;
    this.castPoint = 0;
    this.hasCastReleased = false;
    this.currentSpell = null;
    this.castTargetPos = new THREE.Vector3();
    this.channeledSpell = null;
    this.channelTimer = 0;
    this.channelTickTimer = 0;
    this.spellSystem = null;
    this.team = 'player';
    this.id = 'hero_player';

    this.refreshStats();

    // Rebuild the weapon/offhand models as soon as the Equipment screen
    // changes the controlled hero's gear.
    this._unsubscribeEquipment = onEquipmentChanged((hero) => {
      if (!hero || hero.id === this.heroId) {
        this.syncLoadout();
      }
    });
  }

  get position() {
    return this.mesh.position;
  }

  /** Facing yaw used by the spell system (matches the Combatant convention). */
  get facingYaw() {
    return this.mesh.rotation.y;
  }

  get isDead() {
    return this.dead;
  }

  get baseAttack() {
    return this.baseDamage || 20;
  }

  rebuildWeaponMesh() {
    this.rig.equip({ weapon: this.weapon, offhand: this.shield, armor: this.armor });
  }

  rebuildShieldMesh() {
    this.rig.equip({ weapon: this.weapon, offhand: this.shield, armor: this.armor });
  }

  equipWeapon(item) {
    const hero = this.getHero();
    if (hero) {
      hero.equipment = hero.equipment || { weapon: null, offhand: null, armor: null };
      hero.equipment.weapon = item;
    }
    this.weapon = item;
    this.syncLoadout();
  }

  equipShield(item) {
    const hero = this.getHero();
    if (hero) {
      hero.equipment = hero.equipment || { weapon: null, offhand: null, armor: null };
      hero.equipment.offhand = item;
    }
    this.shield = item;
    this.syncLoadout();
  }

  /**
   * The hero the player currently controls.
   */
  getHero() {
    if (this.hero) return this.hero;
    if (typeof gameState?.getControlledHero === 'function') {
      this.hero = gameState.getControlledHero();
    }
    return this.hero;
  }

  /**
   * Re-reads the controlled hero's gear and rebuilds the weapon/offhand models.
   * Keeps HP and stamina untouched.
   */
  syncLoadout() {
    const hero = this.getHero();
    this.heroId = hero?.id || this.heroId;
    this.playerClass = hero?.class || this.playerClass;
    this.weapon = hero?.equipment?.weapon || null;
    this.shield = hero?.equipment?.offhand || null;
    this.armor = hero?.equipment?.armor || null;
    this.loadout = getHeroLoadout(hero);
    this.rebuildWeaponMesh();
    return this.loadout;
  }

  /**
   * Switches the controlled hero: rebuilds the rig so the new hero's body and
   * equipped gear are shown, then refreshes stats, controls and HUD.
   */
  setControlledHero(heroId) {
    const hero = gameState.heroes?.find((h) => h.id === heroId);
    if (!hero || hero.id === this.heroId) return false;

    this.hero = hero;
    this.heroId = hero.id;
    this.look = hero.look || PRESETS.han;

    if (this.rig) {
      this.mesh.remove(this.rig.group);
      this.rig.dispose();
    }
    this.rig = new HeroRig(this.look);
    this.mesh.add(this.rig.group);
    this.mesh._heroRig = this.rig;

    this.syncLoadout();
    this.refreshStats();
    return true;
  }

  refreshStats() {
    const hero = this.getHero();
    const stats = getCombatStats(hero, gameState.party, gameState.relations);
    this.maxHp = stats.maxHp;
    this.maxStamina = stats.maxStamina;
    this.baseDamage = stats.damage;
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;

    // Equip / visual updates
    this.syncLoadout();
  }
}