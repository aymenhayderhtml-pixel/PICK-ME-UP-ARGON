import * as THREE from 'three';
import { HERO_TEMPLATES } from '../data/heroes.js';
import { createLabelSprite } from '../ui/Label.js';
import { gameState } from '../core/GameState.js';

function createTextSprite(text, isSign = false) {
  return createLabelSprite({ text, isSign });
}
import { showSystemMessage } from '../ui/Hud.js';
import { showHeroDeathNotice, showSystemNotice } from '../ui/Notices.js';
import { spawnSparks } from '../combat/Combat.js';
import { rollStatFromSkill } from '../data/skills.js';
import { HeroRig } from '../art/HeroRig.js';
import { generateLook } from '../art/looks.js';
import { LAYOUT } from '../art/town/layout.js';
import { getHeroLoadout } from '../core/loadout.js';
import { onEquipmentChanged } from '../core/equipmentEvents.js';
import { PunishmentEffect } from './PunishmentEffect.js';
import { awardLiveTrainingTickXp } from '../core/TrainingEngine.js';


const DORM_DOOR = new THREE.Vector3(-18, 0, -4);
const DUMMY_STANDS = [
  { x: -26.4, z: 16.8 },
  { x: -24.0, z: 16.8 },
  { x: -21.6, z: 16.8 },
];

function getPastJobShirtColor(pastJob) {
  switch ((pastJob || '').toLowerCase()) {
    case 'mercenary':
    case 'bandit':
      return 0x8a8a8a; // Faded gray
    case 'shopkeeper':
    case 'merchant':
    case 'noble':
      return 0xc9b28a; // Beige/tan
    case 'farmer':
    case 'hunter':
    case 'cook':
      return 0x5a4630; // Brown workwear
    case 'student':
    case 'bard':
    case 'sailor':
    default:
      return 0xe8e4da; // Off-white linen
  }
}

export function createSpeechBubbleSprite(text, isAngry = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');

  if (isAngry) {
    ctx.fillStyle = 'rgba(210, 30, 30, 0.95)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(8, 8, 368, 80, 8);
    else ctx.rect(8, 8, 368, 80);
    ctx.fill();
    ctx.strokeStyle = '#ff5a6e';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 192, 48);
  } else {
    // Manhua .mm-panel look: dark violet, 2px outer frame, 1px inner frame inset
    ctx.fillStyle = 'rgba(11, 8, 16, 0.95)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(6, 6, 372, 84, 6);
    else ctx.rect(6, 6, 372, 84);
    ctx.fill();

    // Outer frame
    ctx.strokeStyle = '#d9ccff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Inner frame inset 5px
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(11, 11, 362, 74, 4);
    else ctx.rect(11, 11, 362, 74);
    ctx.strokeStyle = '#5b4a8a';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 16px "Oswald", "Bebas Neue", "Arial Narrow", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Max 3 lines wrapping
    const words = String(text).toUpperCase().split(' ');
    const lines = [];
    let curLine = '';
    for (const w of words) {
      const testLine = curLine ? `${curLine} ${w}` : w;
      if (ctx.measureText(testLine).width > 340 && curLine) {
        lines.push(curLine);
        curLine = w;
        if (lines.length >= 3) break;
      } else {
        curLine = testLine;
      }
    }
    if (curLine && lines.length < 3) lines.push(curLine);

    const startY = 48 - ((lines.length - 1) * 18) / 2;
    lines.forEach((line, idx) => {
      ctx.fillText(line, 192, startY + idx * 18);
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: true, depthWrite: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(4.2, 1.05, 1);
  return sprite;
}

export class HubHeroNPC {
  static stuckCount = 0;

  constructor(heroData, scene, onRuleBreak = null, getGroundY = null, navGrid = null, isNewSummon = false) {
    this.heroData = heroData;
    this.scene = scene;
    this.onRuleBreak = onRuleBreak;
    this.getGroundY = getGroundY;
    this.navGrid = navGrid;
    this.mesh = new THREE.Group();

    // Speech bubble state
    this.speechBubble = null;
    this.speechBubbleTimer = 0;
    this.isBeingPunished = false;
    this.ruleBreakTimer = 40 + Math.random() * 50;

    // Find template colors by matching name or class
    let tpl = HERO_TEMPLATES.JENNA;
    for (const key of Object.keys(HERO_TEMPLATES)) {
      if (HERO_TEMPLATES[key].name === heroData.name) {
        tpl = HERO_TEMPLATES[key];
        break;
      }
    }

    this.armorColor = tpl.armorColor || 0x336699;
    this.hairColor = tpl.hairColor || 0x4a2a14;

    this.buildModel();

    // Floating name label (sits 0.4 units above head: top of head 1.55 + 0.4 = 1.95)
    this.labelSprite = createLabelSprite({
      text: `${heroData.name} ★${heroData.star}`,
      isSign: false,
    });
    this.labelSprite.position.set(0, 1.95, 0);
    this.mesh.add(this.labelSprite);

    this.samplePos = this.mesh.position.clone();
    this.stuckCheckTimer = 0;
    this.stuckFailCount = 0;

    // AI & Navigation state
    this.targetPos = this.mesh.position.clone();
    this.currentPath = [];
    this.waypointIndex = 0;
    this.corridorQueue = null;
    this.corridorIndex = 0;
    this.onArrival = null;
    this.onCorridorFinish = null;

    this.state = 'idle'; // 'idle' | 'walk' | 'walk_corridor' | 'training' | 'inside_dorm' | 'search_wall'
    this.timer = 2 + Math.random() * 3;
    this.speed = 2.2;
    this.animTime = 0;
    this.isResting = false;
    this.isDyingFromStress = false;
    this.stressCollapseTimer = 0;
    this.idleFatigueTimer = 0;
    this.searchWallTimer = 0;

    // Autonomous training parameters
    this.decisionTimer = 5 + Math.random() * 15;
    this.trainingSlot = null;
    this.trainingSkill = null;
    this.trainingDuration = 0;
    this.trainingExpTimer = 0;
    this.trainingStatTimer = 0;

    // Daily activity system (emotion / training slice)
    this.dailyActivity = 'idle';
    this.trainingZone = null;      // 'dummy' | 'archery' | 'magic' | 'spar'
    this.trainingTargetPos = null; // THREE.Vector3 of the dummy / target being hit

    // Pulsating severe stress aura (stress >= 80)
    const auraGeo = new THREE.SphereGeometry(0.85, 12, 12);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x8b00ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    this.stressAura = new THREE.Mesh(auraGeo, auraMat);
    this.stressAura.position.y = 1.0;
    this.stressAura.visible = false;
    this.mesh.add(this.stressAura);

    if (isNewSummon) {
      this.startArrivalBehavior();
    } else {
      const spawnTarget = this.navGrid
        ? this.navGrid.findRandomReachableCell(14, -8, 2, 12)
        : new THREE.Vector3(14, 0, -8);
      const spawnY = getGroundY ? getGroundY(spawnTarget.x, spawnTarget.z) : 0;
      this.mesh.position.set(spawnTarget.x, spawnY, spawnTarget.z);
      this.samplePos.copy(this.mesh.position);
    }

    scene.add(this.mesh);
  }

  buildModel() {
    // Rebuilding must not leave the previous rig behind in the scene graph.
    if (this.rig) {
      this.mesh.remove(this.rig.group);
      this.rig.dispose();
      this.rig = null;
    }

    const look = this.heroData.look || generateLook(this.heroData);
    this.rig = new HeroRig(look);
    this.mesh.add(this.rig.group);
    this.mesh._heroRig = this.rig;
    this.mesh.userData.heroRig = this.rig;

    // Only what the hero actually carries: no sword by default, and a shield
    // only when a shield item sits in the offhand slot.
    const loadout = getHeroLoadout(this.heroData);
    this.loadout = loadout;
    this.rig.equip({
      weapon: loadout.weaponType === 'none' ? null : loadout.weapon,
      offhand: loadout.offhandType === 'none' ? null : loadout.offhand,
      armor: loadout.armor,
    });
  }

  startArrivalBehavior() {
    // Walk out of the Summoning Room the way a person would: down the ramp
    // (the stairs) and over the Landing Area steps. The route comes from the
    // town layout, so the gacha walkout, the tutorial walkout and the nav grid
    // all use the same stair path instead of a straight line across the
    // ramp railing.
    const route = (LAYOUT.zones.summoning_room?.doorCorridor || []).slice(1);
    const landing = { x: 20.0, z: 26.0 };
    const startX = route.length ? route[0].x : 23.5;
    const startZ = route.length ? route[0].z : 11.5;
    const groundAt = (x, z) => (this.getGroundY ? this.getGroundY(x, z) : 0);
    const sy = groundAt(startX, startZ);
    this.mesh.position.set(startX, sy, startZ);

    this.corridorQueue = [
      ...route.map((p) => new THREE.Vector3(p.x, groundAt(p.x, p.z), p.z)),
      new THREE.Vector3(landing.x, groundAt(landing.x, landing.z), landing.z),
    ];
    this.corridorIndex = 0;
    this.state = 'walk_corridor';
    this.speed = 2.4;

    this.onCorridorFinish = () => {
      let line = 'WHAT IS THIS PLACE?';
      if (this.heroData.pastJob) {
        const opts = ['IS IT A DREAM?', 'WHAT IS THIS PLACE?', `I WAS JUST A ${this.heroData.pastJob.toUpperCase()}...!`];
        line = opts[Math.floor(Math.random() * opts.length)];
      } else if (Math.random() < 0.5) {
        line = 'IS IT A DREAM?';
      }
      this.showSpeechBubble(line, 4.0);

      this.state = 'search_wall';
      this.searchWallTimer = 20.0;
      this.pickWallTarget();
    };
  }

  pickWallTarget() {
    const angle = Math.random() * Math.PI * 2;
    const wx = Math.cos(angle) * 41.5;
    const wz = Math.sin(angle) * 41.5;
    this.setDestination(wx, wz, () => {
      if (this.state === 'search_wall' && this.searchWallTimer > 0) {
        this.pickWallTarget();
      }
    });
  }

  /**
   * Removes the current speech bubble from its parent and disposes its canvas
   * texture and material so repeated bubbles do not leak GPU memory.
   */
  disposeSpeechBubble() {
    if (!this.speechBubble) return;
    const bubble = this.speechBubble;
    this.speechBubble = null;
    if (bubble.parent) bubble.parent.remove(bubble);
    if (bubble.material) {
      if (bubble.material.map) bubble.material.map.dispose();
      bubble.material.dispose();
    }
  }

  showSpeechBubble(text, duration = 3.5) {
    this.disposeSpeechBubble();
    this.speechBubble = createSpeechBubbleSprite(text, false);
    this.speechBubble.position.set(0, 3.1, 0);
    this.mesh.add(this.speechBubble);
    this.speechBubbleTimer = duration;
  }

  showAngryBubble(duration = 2.0) {
    this.disposeSpeechBubble();
    this.speechBubble = createSpeechBubbleSprite('!', true);
    this.speechBubble.position.set(0, 3.1, 0);
    this.mesh.add(this.speechBubble);
    this.speechBubbleTimer = duration;
  }

  setDestination(x, z, onArrival = null) {
    this.onArrival = onArrival;
    this.targetPos.set(x, this.getGroundY ? this.getGroundY(x, z) : 0, z);
    if (this.navGrid) {
      this.currentPath = this.navGrid.findPath(this.mesh.position.x, this.mesh.position.z, x, z);
      this.waypointIndex = 0;
    } else {
      this.currentPath = [new THREE.Vector3(x, this.getGroundY ? this.getGroundY(x, z) : 0, z)];
      this.waypointIndex = 0;
    }
    this.state = 'walk';
    this.timer = 20;
    this.samplePos.copy(this.mesh.position);
    this.stuckCheckTimer = 0;
    this.stuckFailCount = 0;
  }

  pickNewTarget() {
    if (this.navGrid) {
      const target = this.navGrid.findRandomReachableCell(this.mesh.position.x, this.mesh.position.z, 5, 20);
      this.setDestination(target.x, target.z);
    } else {
      for (let attempts = 0; attempts < 15; attempts++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 18;
        const tx = Math.cos(angle) * radius;
        const tz = Math.sin(angle) * radius;
        this.setDestination(tx, tz);
        return;
      }
      this.state = 'idle';
      this.timer = 2 + Math.random() * 3;
    }
  }

  goToDormitory() {
    if (this.state === 'inside_dorm') return;
    const corridor = this.navGrid ? this.navGrid.getDoorCorridor('residences') : [
      new THREE.Vector3(-15, 0, -4),
      new THREE.Vector3(-18, 0, -4),
      new THREE.Vector3(-21, 0, -4)
    ];

    this.setDestination(corridor[0].x, corridor[0].z, () => {
      this.corridorQueue = corridor.slice(1);
      this.corridorIndex = 0;
      this.state = 'walk_corridor';
      this.onCorridorFinish = () => {
        this.state = 'inside_dorm';
        this.mesh.visible = false;
      };
    });
    this.state = 'walk_dorm';
  }

  emergeFromDormitory() {
    this.mesh.visible = true;
    const dormY = this.getGroundY ? this.getGroundY(-18, -4) : 0;
    this.mesh.position.set(-18, dormY, -4);
    const corridor = [
      new THREE.Vector3(-18, this.getGroundY ? this.getGroundY(-18, -4) : 0, -4),
      new THREE.Vector3(-15, this.getGroundY ? this.getGroundY(-15, -4) : 0, -4),
    ];
    this.corridorQueue = corridor;
    this.corridorIndex = 0;
    this.state = 'walk_corridor';
    this.onCorridorFinish = () => {
      this.state = 'idle';
      this.timer = 2 + Math.random() * 3;
      this.pickNewTarget();
    };
  }

  goToCottage(cottagePos) {
    if (this.state === 'sleeping_cottage') return;
    this.stopTrainingAndRest();
    const doorX = cottagePos.x - 0.8;
    const doorZ = cottagePos.z + 1.81;
    this.setDestination(doorX, doorZ, () => {
      this.state = 'sleeping_cottage';
      this.mesh.visible = false;
    });
    this.state = 'walk_cottage';
  }

  wakeUpFromCottage() {
    if (this.state === 'sleeping_cottage' || this.state === 'walk_cottage') {
      this.mesh.visible = true;
      this.state = 'idle';
      this.timer = 1.0 + Math.random() * 2.0;
      this.pickNewTarget();
    }
  }

  chooseTrainingSkill() {
    const w = this.heroData.equipment?.weapon;
    const wType = (w?.weaponType || '').toLowerCase();
    const skills = this.heroData.skills || [];

    // Match equipped weapon
    if (wType) {
      const match = skills.find((s) => (s.id || '').toLowerCase().includes(wType));
      if (match) return match;
    }

    // Lowest level/exp skill
    if (skills.length > 0) {
      return [...skills].sort((a, b) => ((a.level || 1) * 1000 + (a.exp || 0)) - ((b.level || 1) * 1000 + (b.exp || 0)))[0];
    }

    // Default class fallback
    const cls = this.heroData.class || 'Warrior';
    const defSkill = cls === 'Hunter' ? 'archery'
      : cls === 'Mage' ? 'fireball'
      : cls === 'Spearman' ? 'spear_thrust'
      : cls === 'Rogue' ? 'dagger_mastery'
      : 'basic_swordsmanship';
    return { id: defSkill, name: defSkill, level: 1, exp: 0 };
  }

  startAutonomousTraining(slotIdx) {
    const stand = DUMMY_STANDS[slotIdx];
    this.trainingSlot = slotIdx;
    const chosenSkill = this.chooseTrainingSkill();
    this.trainingSkill = chosenSkill;

    gameState.trainingSlots = gameState.trainingSlots || [null, null, null];
    gameState.trainingSlots[slotIdx] = {
      heroId: this.heroData.id,
      skillId: chosenSkill.id,
      expGained: 0,
      startTime: Date.now(),
    };
    gameState.saveToLocalStorage();

    this.setDestination(stand.x, stand.z, () => {
      this.state = 'training';
      this.mesh.rotation.y = Math.PI; // Face dummy toward -Z
      this.trainingDuration = 0;
      this.trainingExpTimer = 0;
      this.trainingStatTimer = 0;
    });
  }

  stopTrainingAndRest() {
    if (this.trainingSlot !== null && gameState.trainingSlots) {
      gameState.trainingSlots[this.trainingSlot] = null;
      this.trainingSlot = null;
    }
    gameState.addStress(this.heroData, -5); // -5 stress on training finished
    gameState.saveToLocalStorage();
    this.goToDormitory();
  }

  makeAutonomousDecision(hanPos = null) {
    if (this.state === 'inside_dorm' || this.isBeingPunished || this.isDyingFromStress || this.isSmithingActive) return;

    // Fatigue > 70: must rest
    if ((this.heroData.fatigue || 0) > 70) {
      this.goToDormitory();
      return;
    }

    // Base train chance by motivation
    const mot = this.heroData.motivation || 'normal';
    let trainChance = mot === 'diligent' ? 0.60 : mot === 'lazy' ? 0.08 : 0.30;

    // -30% when stress > 60
    if ((this.heroData.stress || 0) > 60) {
      trainChance -= 0.30;
    }

    // +20% if Training Ground built and Han is training or nearby
    const tg = gameState.facilities?.training;
    const tgBuilt = tg && tg.unlocked !== false;
    let hanNearby = false;
    if (hanPos) {
      const distHan = Math.hypot(hanPos.x - 15.0, hanPos.z - (-16.0));
      if (distHan <= 14.0) hanNearby = true;
    }
    const hanTraining = (gameState.trainingSlots || []).some((s) => s && s.heroId === 'hero_han');
    if (tgBuilt && (hanNearby || hanTraining)) {
      trainChance += 0.20;
    }

    // +10% per Training Ground facility level
    const tgLevel = tg?.level || 1;
    trainChance += tgLevel * 0.10;

    // Roll to train
    if (tgBuilt && Math.random() < trainChance) {
      gameState.trainingSlots = gameState.trainingSlots || [null, null, null];
      const freeDummyIdx = [0, 1, 2].find((i) => !gameState.trainingSlots[i]);
      if (freeDummyIdx !== undefined) {
        this.startAutonomousTraining(freeDummyIdx);
        return;
      }
    }

    // Roll to rest if tired / stressed
    if (((this.heroData.fatigue || 0) > 40 || (this.heroData.stress || 0) > 40) && Math.random() < 0.4) {
      this.goToDormitory();
      return;
    }

    // Otherwise wander
    this.pickNewTarget();
  }

  /**
   * Executes the activity the daily decision engine chose for this hero.
   *
   * The hero walks to the matching training zone and plays the existing
   * training pose. `usedSlots` is a shared Set of occupied slot keys so two
   * heroes never share the same dummy.
   */
  executeDailyActivity(activity, trainingZones, anchors, sparringController = null, usedSlots = null) {
    this.dailyActivity = activity || 'idle';
    const zones = trainingZones || {};

    switch (this.dailyActivity) {
      case 'train_dummy':
      case 'train_archery':
      case 'train_magic': {
        const zoneKey =
          this.dailyActivity === 'train_dummy'
            ? 'wooden_dummies'
            : this.dailyActivity === 'train_archery'
              ? 'archery_targets'
              : 'fire_targets';
        const zone = zones[zoneKey];
        if (!zone || !zone.slots || zone.slots.length === 0) return false;

        // Find a free slot in this zone.
        let slot = null;
        for (const candidate of zone.slots) {
          const key = `${zoneKey}:${candidate.stand.x},${candidate.stand.z}`;
          if (!usedSlots || !usedSlots.has(key)) {
            slot = candidate;
            if (usedSlots) usedSlots.add(key);
            break;
          }
        }
        if (!slot) return false;

        this.trainingZone =
          this.dailyActivity === 'train_dummy'
            ? 'dummy'
            : this.dailyActivity === 'train_archery'
              ? 'archery'
              : 'magic';
        // A manual Training Window slot pins the skill that is trained.
        const pinnedSlot = (gameState.trainingSlots || []).find(
          (s) => s && s.heroId === this.heroData.id
        );
        const defaultSkillId =
          this.dailyActivity === 'train_dummy'
            ? 'basic_swordsmanship'
            : this.dailyActivity === 'train_archery'
              ? 'basic_archery'
              : 'basic_fire_magic';
        const trainedSkillId = (pinnedSlot && pinnedSlot.skillId) || defaultSkillId;
        this.trainingSkill = {
          id: trainedSkillId,
          name: 'Training',
          level: 1,
          exp: 0,
        };
        this.trainingDuration = 0;
        this.trainingExpTimer = 0;
        this.trainingStatTimer = 0;
        this.trainingTargetPos = new THREE.Vector3(slot.target.x, slot.target.y, slot.target.z);

        this.setDestination(slot.stand.x, slot.stand.z, () => {
          this.state = 'training';
          this.mesh.rotation.y = Math.atan2(
            slot.target.x - this.mesh.position.x,
            slot.target.z - this.mesh.position.z
          );
        });
        return true;
      }

      case 'fighting': {
        // The sparring controller drives the brawl. The NPC only has to hold
        // its ground until the fight starts.
        return true;
      }

      case 'spar': {
        if (!sparringController) return false;
        // Find a partner who is not already sparring.
        const others = (this.heroesManager && this.heroesManager.npcs) || [];
        const partner = others.find(
          (o) => o !== this && o.state !== 'training' && o.heroData && o.heroData.alive
        );
        if (!partner) return false;
        sparringController.startSpar(this, partner, true);
        this.trainingZone = 'spar';
        return true;
      }

      case 'eat': {
        // Walk to the Cafeteria door and wait there.
        const door = anchors && anchors.door_mess_hall;
        const target = door ? { x: door.x, z: door.z + 1.5 } : { x: 8, z: 34.5 };
        this.setDestination(target.x, target.z, () => {
          this.state = 'idle';
          this.timer = 6;
        });
        return true;
      }

      case 'rest': {
        this.goToDormitory();
        return true;
      }

      default: {
        // Do nothing: wander a little.
        this.pickNewTarget();
        return true;
      }
    }
  }

  triggerStressSuicide() {
    if (this.isDyingFromStress) return;
    this.isDyingFromStress = true;
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.2;

    const heroId = this.heroData.id;

    let fadeElapsed = 0;
    const fadeInterval = setInterval(() => {
      fadeElapsed += 0.05;
      const alpha = Math.max(0, 1 - fadeElapsed / 2.0);
      if (this.rig) {
        this.rig.setOpacity(alpha);
      }
      if (fadeElapsed >= 2.0) {
        clearInterval(fadeInterval);
        showHeroDeathNotice(this.heroData, 'Suicide due to stress');
        this.destroy();
        // Remove the dead avatar from the manager so it is no longer ticked as
        // a zombie, and free its remaining meshes.
        if (this.heroesManager) {
          this.heroesManager.npcs = this.heroesManager.npcs.filter((n) => n !== this);
        }
        this.disposeMeshes();
        gameState.killHero(heroId, gameState.currentFloor || 1, 'Suicide due to stress');
        gameState.saveToLocalStorage();
      }
    }, 50);
  }

  updateRigPose(delta, state, camera = null, hanPos = null) {
    if (!this.rig) return;
    if (!this.mesh.visible) {
      this.rig.setVisible(false);
      return;
    }

    const distToCam = camera
      ? this.mesh.position.distanceTo(camera.position)
      : (hanPos ? this.mesh.position.distanceTo(hanPos) : 0);

    if (distToCam > 90) {
      this.rig.setVisible(false);
      return;
    }

    this.rig.setVisible(true);

    if (distToCam > 45) {
      this.rig.setOutlineVisible(false);
      this.lodFrameCount = (this.lodFrameCount || 0) + 1;
      if (this.lodFrameCount % 3 !== 0) {
        return;
      }
      this.rig.update(delta * 3, state);
    } else {
      this.rig.setOutlineVisible(true);
      this.rig.update(delta, state);
    }
  }

  update(delta, getGroundY = null, hanPos = null, camera = null) {
    if (this.isDyingFromStress) return;

    // Helper to keep feet on the ground every frame and warn if below ground
    const enforceGround = () => {
      if (getGroundY && this.mesh.visible) {
        const gy = getGroundY(this.mesh.position.x, this.mesh.position.z);
        // Smooth entity height with a short lerp (factor 18 * dt) so stair steps do not jitter
        this.mesh.position.y += (gy - this.mesh.position.y) * Math.min(1.0, 18 * delta);

        // The walk height map has sharp stair edges, so a hero crossing a step
        // dips under the ground for a few frames. Only report a hero that
        // stays under the ground, and only once per excursion.
        if (this.mesh.position.y < gy - 0.1) {
          this._belowGroundTimer = (this._belowGroundTimer || 0) + delta;
          if (this._belowGroundTimer >= 0.25 && !this._belowGroundWarned) {
            this._belowGroundWarned = true;
            console.warn(`[HubHero] ${this.heroData.name} y (${this.mesh.position.y.toFixed(2)}) is below getGroundY - 0.1 (${(gy - 0.1).toFixed(2)}) for ${this._belowGroundTimer.toFixed(2)}s`);
          }
        } else {
          this._belowGroundTimer = 0;
          this._belowGroundWarned = false;
        }
      }
    };

    // Tick speech bubble timer
    if (this.speechBubbleTimer > 0) {
      this.speechBubbleTimer -= delta;
      if (this.speechBubbleTimer <= 0 && this.speechBubble) {
        this.disposeSpeechBubble();
      }
    }

    // Tick uncooperative rule-break timer
    if (this.heroData.cooperation === 'uncooperative' && !this.isBeingPunished) {
      this.ruleBreakTimer -= delta;
      if (this.ruleBreakTimer <= 0) {
        this.ruleBreakTimer = 40 + Math.random() * 50;
        if (this.onRuleBreak) this.onRuleBreak(this);
      }
    }

    // If forging at blacksmith anvil, perform hammer animation
    if (this.isSmithingActive) {
      this.mesh.visible = true;
      this.mesh.position.set(-16, getGroundY ? getGroundY(-16, 11.2) : 0, 11.2);
      this.mesh.rotation.y = 0;
      this.animTime += delta;
      this.updateRigPose(delta, { action: 'trainSword', actionTime: this.animTime, mood: 'neutral' }, camera, hanPos);
      enforceGround();
      return;
    }

    // Fatigue recovery in hub: 2 fatigue / sec
    if (this.heroData.fatigue > 0 && this.state !== 'training') {
      this.heroData.fatigue = Math.max(0, this.heroData.fatigue - 2 * delta);
    }

    // Stress rise: +10 when idle with fatigue > 90 (tick every 60s)
    if ((this.heroData.fatigue || 0) > 90 && this.state !== 'inside_dorm' && this.state !== 'training') {
      this.idleFatigueTimer += delta;
      if (this.idleFatigueTimer >= 60) {
        this.idleFatigueTimer = 0;
        gameState.addStress(this.heroData, 10);
      }
    } else {
      this.idleFatigueTimer = 0;
    }

    // Severe stress aura (stress >= 80)
    const curStress = this.heroData.stress || 0;
    if (curStress >= 80 && this.mesh.visible && !this.isBeingPunished) {
      this.stressAura.visible = true;
      const pulse = Math.sin(this.animTime * 4);
      this.stressAura.material.opacity = 0.3 + pulse * 0.15;
      this.stressAura.scale.setScalar(1 + pulse * 0.08);
    } else {
      this.stressAura.visible = false;
    }

    // Stress collapse at 100: collapses after 30s if not resting -> soft fade out, suicide
    if (curStress >= 100 && this.state !== 'inside_dorm' && !this.isResting && !this.isDyingFromStress) {
      this.stressCollapseTimer += delta;
      if (this.stressCollapseTimer >= 30) {
        this.triggerStressSuicide();
      }
    } else if (curStress < 100 || this.state === 'inside_dorm' || this.isResting) {
      this.stressCollapseTimer = 0;
    }

    this.animTime += delta;
    this.timer -= delta;

    // Sleeping inside assigned cottage
    if (this.state === 'sleeping_cottage') {
      this.mesh.visible = false;
      if (this.rig) this.rig.setVisible(false);
      // Sleeping recovery: fatigue recovery +3/sec, stress falls -2/sec
      if ((this.heroData.fatigue || 0) > 0) {
        this.heroData.fatigue = Math.max(0, (this.heroData.fatigue || 0) - 3 * delta);
      }
      if ((this.heroData.stress || 0) > 0) {
        this.heroData.stress = Math.max(0, (this.heroData.stress || 0) - 2 * delta);
      }
      return;
    }

    // Inside Dormitory resting
    if (this.state === 'inside_dorm') {
      this.mesh.visible = false;
      if (this.rig) this.rig.setVisible(false);
      // Stress decreases at -1/s while resting in dormitory
      if ((this.heroData.stress || 0) > 0) {
        this.heroData.stress = Math.max(0, (this.heroData.stress || 0) - 1 * delta);
      }
      // Fatigue recovers faster in dormitory: -4/s
      if ((this.heroData.fatigue || 0) > 0) {
        this.heroData.fatigue = Math.max(0, (this.heroData.fatigue || 0) - 4 * delta);
      }

      if ((this.heroData.fatigue || 0) <= 5 && (this.heroData.stress || 0) <= 30) {
        this.isResting = false;
        this.emergeFromDormitory();
      }
      return;
    }

    // Training State at dummy
    if (this.state === 'training') {
      this.mesh.visible = true;
      this.trainingDuration += delta;
      this.trainingExpTimer += delta;
      this.trainingStatTimer += delta;

      const sId = (this.trainingSkill?.id || '').toLowerCase();
      let trainPose = 'trainSword';
      if (sId.includes('spear')) trainPose = 'trainSpear';
      else if (sId.includes('bow') || sId.includes('archery')) trainPose = 'trainBow';
      else if (sId.includes('dagger') || sId.includes('stealth')) trainPose = 'trainDagger';
      else if (sId.includes('fire') || sId.includes('mana') || sId.includes('magic')) trainPose = 'trainMagic';

      this.updateRigPose(delta, { action: trainPose, actionTime: this.animTime, mood: 'neutral' }, camera, hanPos);

      // Every 5s: ONE training XP tick through the shared engine. The engine
      // applies the 5 second cooldown, so the manual Training Window and this
      // autonomous path can never award the same tick twice.
      if (this.trainingExpTimer >= 5.0) {
        this.trainingExpTimer -= 5.0;
        const result = awardLiveTrainingTickXp(
          this.heroData,
          this.trainingZone,
          this.trainingSkill ? this.trainingSkill.id : null,
          gameState,
          Date.now()
        );

        if (result.awarded) {
          gameState.checkTalentReveal(this.heroData);
        }

        // Sparks fly off whatever the hero is hitting.
        if (result.awarded) {
          if (this.trainingTargetPos) {
            spawnSparks(this.scene, this.trainingTargetPos, 0xffaa44, 4);
          } else {
            const dummyZ = 18.0;
            const dummyX = [-26.4, -24.0, -21.6][this.trainingSlot] || this.mesh.position.x;
            const dummyY = (getGroundY ? getGroundY(dummyX, dummyZ) : 0) + 1.0;
            spawnSparks(this.scene, new THREE.Vector3(dummyX, dummyY, dummyZ), 0xffaa44, 4);
          }
        }
      }

      // Every 45s: 35% chance to gain core stat multiplied by potential
      if (this.trainingStatTimer >= 45.0) {
        this.trainingStatTimer -= 45.0;
        if (Math.random() < 0.35 && this.trainingSkill) {
          const statKey = rollStatFromSkill(this.trainingSkill.id);
          const pot = (this.heroData.potentials && this.heroData.potentials[statKey]) || 1.0;
          const gain = Math.floor(pot) + (Math.random() < (pot % 1) ? 1 : 0);
          this.heroData.stats = this.heroData.stats || {};
          this.heroData.stats[statKey] = (this.heroData.stats[statKey] || 10) + gain;
          gameState.checkTalentReveal(this.heroData);
          showSystemNotice(this.heroData.name, `GAINED +${gain} ${statKey.toUpperCase()} THROUGH TRAINING!`);
        }
      }

      // Stop condition: fatigue >= 70, stress > 70, or after 2 mins (120s)
      if ((this.heroData.fatigue || 0) >= 70 || (this.heroData.stress || 0) > 70 || this.trainingDuration >= 120) {
        this.stopTrainingAndRest();
      }
      enforceGround();
      return;
    }

    // Walking along path or corridor
    this.mesh.visible = true;

    if (this.state === 'search_wall') {
      this.searchWallTimer -= delta;
      if (this.searchWallTimer <= 0) {
        this.showSpeechBubble('...THERE IS NO WAY OUT.', 3.5);
        this.state = 'idle';
        this.timer = 2 + Math.random() * 3;
        this.currentPath = [];
      }
    }

    if (this.state === 'walk' || this.state === 'walk_dorm' || this.state === 'walk_cottage' || this.state === 'search_wall') {
      // Stuck detector: if moved < 0.4 units in 2 seconds while walking, re-path; fails twice -> teleport to safe town center
      this.stuckCheckTimer += delta;
      if (this.stuckCheckTimer >= 2.0) {
        this.stuckCheckTimer = 0;
        const moved = Math.hypot(this.mesh.position.x - this.samplePos.x, this.mesh.position.z - this.samplePos.z);
        if (moved < 0.4) {
          this.stuckFailCount++;
          if (this.stuckFailCount >= 2) {
            const plazaCell = this.navGrid ? this.navGrid.findNearestWalkableCell(14, -8) : new THREE.Vector3(14, 0, -8);
            const py = getGroundY ? getGroundY(plazaCell.x, plazaCell.z) : plazaCell.y;
            this.mesh.position.set(plazaCell.x, py, plazaCell.z);
            this.currentPath = [];
            this.corridorQueue = null;
            this.state = 'idle';
            this.timer = 2 + Math.random() * 3;
            this.stuckFailCount = 0;
            HubHeroNPC.stuckCount = (HubHeroNPC.stuckCount || 0) + 1;
            console.warn(`[HubHero] ${this.heroData.name} was stuck. Teleported to plaza center.`);
          } else {
            // Re-path
            if (this.currentPath && this.currentPath.length > 0) {
              const dest = this.currentPath[this.currentPath.length - 1];
              this.setDestination(dest.x, dest.z, this.onArrival);
            } else {
              this.pickNewTarget();
            }
          }
        } else {
          this.stuckFailCount = 0;
        }
        this.samplePos.copy(this.mesh.position);
      }

      if (this.currentPath.length > 0 && this.waypointIndex < this.currentPath.length) {
        const wp = this.currentPath[this.waypointIndex];
        const dx = wp.x - this.mesh.position.x;
        const dz = wp.z - this.mesh.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 0.35) {
          const dirX = dx / dist;
          const dirZ = dz / dist;
          this.mesh.position.x += dirX * this.speed * delta;
          this.mesh.position.z += dirZ * this.speed * delta;
          this.mesh.rotation.y = Math.atan2(dirX, dirZ);

          this.updateRigPose(delta, {
            moving: true,
            speed: this.speed,
            sprinting: this.speed >= 3.0,
            action: 'none',
            mood: curStress >= 80 ? 'afraid' : 'neutral',
          }, camera, hanPos);
        } else {
          this.waypointIndex++;
          if (this.waypointIndex >= this.currentPath.length) {
            this.currentPath = [];
            if (this.onArrival) {
              const cb = this.onArrival;
              this.onArrival = null;
              cb();
            } else {
              this.state = 'idle';
              this.timer = 2 + Math.random() * 4;
            }
          }
        }
      } else {
        this.state = 'idle';
        this.timer = 2 + Math.random() * 4;
      }
    } else if (this.state === 'walk_corridor') {
      if (this.corridorQueue && this.corridorIndex < this.corridorQueue.length) {
        const wp = this.corridorQueue[this.corridorIndex];
        const dx = wp.x - this.mesh.position.x;
        const dz = wp.z - this.mesh.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 0.35) {
          const dirX = dx / dist;
          const dirZ = dz / dist;
          this.mesh.position.x += dirX * this.speed * delta;
          this.mesh.position.z += dirZ * this.speed * delta;
          this.mesh.rotation.y = Math.atan2(dirX, dirZ);

          this.updateRigPose(delta, {
            moving: true,
            speed: this.speed,
            sprinting: this.speed >= 3.0,
            action: 'none',
            mood: curStress >= 80 ? 'afraid' : 'neutral',
          }, camera, hanPos);
        } else {
          this.corridorIndex++;
          if (this.corridorIndex >= this.corridorQueue.length) {
            this.corridorQueue = null;
            if (this.onCorridorFinish) {
              const cb = this.onCorridorFinish;
              this.onCorridorFinish = null;
              cb();
            } else {
              this.state = 'idle';
              this.timer = 2;
            }
          }
        }
      }
    } else {
      // Idle
      let action = 'none';
      let mood = curStress >= 80 ? 'afraid' : 'neutral';
      if (this.isBeingPunished) {
        action = 'panic';
        mood = 'afraid';
      } else if (this.speechBubble) {
        action = 'talk';
        mood = (this.speechBubbleTimer > 0 && this.heroData.cooperation === 'uncooperative') ? 'angry' : 'happy';
      }
      this.updateRigPose(delta, { moving: false, action, actionTime: this.animTime, mood }, camera, hanPos);

      // Autonomous decision loop every 20-40 seconds
      this.decisionTimer -= delta;
      if (this.decisionTimer <= 0) {
        this.decisionTimer = 20 + Math.random() * 20;
        this.makeAutonomousDecision(hanPos);
      } else if (this.timer <= 0) {
        this.pickNewTarget();
      }
    }

    enforceGround();
  }

  /** Disposes the label sprite and every geometry/material under the mesh. */
  disposeMeshes() {
    if (this.labelSprite) {
      if (this.labelSprite.material) {
        if (this.labelSprite.material.map) this.labelSprite.material.map.dispose();
        this.labelSprite.material.dispose();
      }
      this.labelSprite = null;
    }
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      });
    }
  }

  destroy() {
    if (this.trainingSlot !== null && gameState.trainingSlots) {
      gameState.trainingSlots[this.trainingSlot] = null;
      this.trainingSlot = null;
    }
    this.disposeSpeechBubble();
    if (this.rig) {
      this.rig.dispose();
    }
    this.scene.remove(this.mesh);
  }
}

export class HubHeroesManager {
  constructor(scene, iselle = null, navGrid = null) {
    this.scene = scene;
    this.iselle = iselle;
    this.navGrid = navGrid;
    this.npcs = [];
    this.coTrainingTimers = {};

    // Town avatars show the hero's own gear: rebuild them when it changes.
    this._unsubscribeEquipment = onEquipmentChanged((hero) => {
      for (const npc of this.npcs) {
        if (!hero || npc.heroData?.id === hero.id) {
          npc.buildModel();
        }
      }
    });
  }

  get spawnedHeroes() {
    return this.npcs;
  }

  setIselle(iselle) {
    this.iselle = iselle;
  }

  setNavGrid(navGrid) {
    this.navGrid = navGrid;
  }

  spawnHeroes(heroesList, getGroundY = null, navGrid = null) {
    this.clear();
    const grid = navGrid || this.navGrid;
    for (const h of heroesList) {
      if (h.alive && h.id !== 'hero_han') {
        const npc = new HubHeroNPC(h, this.scene, (npcObj) => this.handleRuleBreak(npcObj), getGroundY, grid);
        npc.heroesManager = this;
        this.npcs.push(npc);
      }
    }
  }

  spawnNewSummonHero(heroData, getGroundY = null) {
    const npc = new HubHeroNPC(heroData, this.scene, (npcObj) => this.handleRuleBreak(npcObj), getGroundY, this.navGrid, true);
    npc.heroesManager = this;
    this.npcs.push(npc);
    return npc;
  }

  /**
   * Sends every hero to the activity the daily decision engine chose for them.
   * Called once per game day by HubScene.
   */
  assignDailyActivities(trainingZones, anchors, sparringController = null) {
    const usedSlots = new Set();
    for (const npc of this.npcs) {
      const activity = (npc.heroData && npc.heroData.currentActivity) || 'idle';
      npc.executeDailyActivity(activity, trainingZones, anchors, sparringController, usedSlots);
    }
  }

  handleRuleBreak(npc) {
    if (npc.isBeingPunished) return;

    npc.showAngryBubble(2.5);

    // Disruptive actions: attack another hero, wander outside, refuse
    const actions = ['attack', 'wander', 'refuse'];
    const act = actions[Math.floor(Math.random() * actions.length)];
    if (act === 'attack') {
      const other = this.npcs.find((n) => n !== npc && !n.isBeingPunished);
      if (other) {
        npc.targetPos.copy(other.mesh.position);
        npc.state = 'walk';
        npc.speed = 3.5;
        npc.timer = 5;
      }
    } else if (act === 'wander') {
      const angle = Math.random() * Math.PI * 2;
      npc.targetPos.set(Math.cos(angle) * 35, 0, Math.sin(angle) * 35);
      npc.state = 'walk';
      npc.speed = 2.8;
      npc.timer = 8;
    } else {
      npc.state = 'idle';
      npc.timer = 10;
    }

    if (!gameState.flags?.tutorialDone) {
      // In tutorial: execution occurs via scripted event
      return;
    }

    // Post-tutorial: 1st offense = warning, 2nd offense = execution
    if (!npc.heroData.offenses || npc.heroData.offenses === 0) {
      npc.heroData.offenses = 1;
      gameState.saveToLocalStorage();
      showSystemMessage(`[WARNING: ${npc.heroData.name} broke the rules! Further violations will be punished by execution.]`);
    } else {
      this.executeHero(npc);
    }
  }

  /**
   * Warns a rule-breaking hero. The tutorial scripts this as the demonstration
   * of the rule, so the hero's own offence counter is left untouched: after
   * the tutorial the first violation still warns and the second executes.
   */
  triggerPunishmentOnNpc(npc, onComplete = null) {
    if (npc && !npc.isBeingPunished) {
      npc.showAngryBubble(2.5);
      showSystemMessage(`[WARNING: ${npc.heroData.name} broke the rules! Further violations will be punished by execution.]`);
    }
    // The callback always runs so a scripted tutorial step can never stall.
    if (onComplete) onComplete();
  }

  executeHero(npc, onComplete = null) {
    if (npc.isBeingPunished) return;
    npc.isBeingPunished = true;
    npc.state = 'idle';
    npc.showAngryBubble(2.0);

    if (!this.punishmentEffect) {
      this.punishmentEffect = new PunishmentEffect(this.scene);
    }

    this.punishmentEffect.play(npc, this.iselle, this.camera, () => {
      npc.destroy();
      this.npcs = this.npcs.filter((n) => n !== npc);
      gameState.killHero(npc.heroData.id, 1, 'Punished for breaking the rules');
      gameState.saveToLocalStorage();
      if (onComplete) onComplete();
    });
  }

  restAll() {
    for (const npc of this.npcs) {
      npc.isResting = true;
    }
  }

  getLabelSprites() {
    return this.npcs.map((n) => n.labelSprite).filter(Boolean);
  }

  update(delta, getGroundY = null, hanPos = null, isNight = false, hubBuildings = null, camera = null) {
    // Recover Han's fatigue in hub if Han is not training
    const han = gameState.heroes.find((h) => h.id === 'hero_han');
    const hanTraining = (gameState.trainingSlots || []).some((s) => s && s.heroId === 'hero_han');
    if (han && !hanTraining && han.fatigue > 0) {
      han.fatigue = Math.max(0, han.fatigue - 2 * delta);
    }

    // Local push avoidance between visible heroes
    const len = this.npcs.length;
    for (let i = 0; i < len; i++) {
      const a = this.npcs[i];
      if (!a.mesh.visible || a.state === 'inside_dorm') continue;
      for (let j = i + 1; j < len; j++) {
        const b = this.npcs[j];
        if (!b.mesh.visible || b.state === 'inside_dorm') continue;
        const dx = a.mesh.position.x - b.mesh.position.x;
        const dz = a.mesh.position.z - b.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.9 && dist > 0.01) {
          const push = (0.9 - dist) * 1.2 * delta;
          const nx = dx / dist;
          const nz = dz / dist;
          a.mesh.position.x += nx * push;
          a.mesh.position.z += nz * push;
          b.mesh.position.x -= nx * push;
          b.mesh.position.z -= nz * push;
        }
      }
    }

    // Intimacy gain from co-training: +3 every 30s spent training within 6 units of each other
    for (let i = 0; i < len; i++) {
      const a = this.npcs[i];
      if (a.state !== 'training') continue;
      for (let j = i + 1; j < len; j++) {
        const b = this.npcs[j];
        if (b.state !== 'training') continue;
        const dx = a.mesh.position.x - b.mesh.position.x;
        const dz = a.mesh.position.z - b.mesh.position.z;
        if (Math.hypot(dx, dz) <= 6.0) {
          const key = [a.heroData.id, b.heroData.id].sort().join('|');
          this.coTrainingTimers[key] = (this.coTrainingTimers[key] || 0) + delta;
          if (this.coTrainingTimers[key] >= 30) {
            this.coTrainingTimers[key] -= 30;
            gameState.addIntimacy(a.heroData.id, b.heroData.id, 3);
          }
        }
      }

      // Check co-training with Han
      if (hanTraining && hanPos) {
        const dx = a.mesh.position.x - hanPos.x;
        const dz = a.mesh.position.z - hanPos.z;
        if (Math.hypot(dx, dz) <= 6.0) {
          const key = ['hero_han', a.heroData.id].sort().join('|');
          this.coTrainingTimers[key] = (this.coTrainingTimers[key] || 0) + delta;
          if (this.coTrainingTimers[key] >= 30) {
            this.coTrainingTimers[key] -= 30;
            gameState.addIntimacy('hero_han', a.heroData.id, 3);
          }
        }
      }
    }

    // Bedtime & wake cycle for assigned cottages
    if (isNight && hubBuildings) {
      for (const npc of this.npcs) {
        if (npc.state !== 'sleeping_cottage' && npc.state !== 'walk_cottage' && npc.state !== 'inside_dorm' && !npc.isBeingPunished) {
          const cottagePos = hubBuildings.getCottagePosition(npc.heroData.houseIndex || 1);
          if (cottagePos) {
            npc.goToCottage(cottagePos);
          }
        }
      }
    } else if (!isNight) {
      for (const npc of this.npcs) {
        if (npc.state === 'sleeping_cottage' || npc.state === 'walk_cottage') {
          npc.wakeUpFromCottage();
        }
      }
    }

    for (const npc of this.npcs) {
      npc.update(delta, getGroundY, hanPos, camera);
    }
  }

  clear() {
    for (const npc of this.npcs) {
      npc.destroy();
    }
    this.npcs = [];
  }
}
