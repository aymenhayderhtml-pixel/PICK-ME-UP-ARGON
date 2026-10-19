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
import { addSkillExp, rollStatFromSkill } from '../data/skills.js';
import { HeroRig } from '../art/HeroRig.js';
import { generateLook } from '../art/looks.js';
import { PunishmentEffect } from './PunishmentEffect.js';

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
    const look = this.heroData.look || generateLook(this.heroData);
    this.rig = new HeroRig(look);
    this.mesh.add(this.rig.group);
    this.mesh._heroRig = this.rig;
    this.mesh.userData.heroRig = this.rig;

    const eq = this.heroData.equipment || {};
    this.rig.equip({
      weapon: eq.weapon,
      offhand: eq.offhand,
      armor: eq.armor,
    });
  }

  startArrivalBehavior() {
    const sy = this.getGroundY ? this.getGroundY(23.5, 11.5) : 3.4;
    this.mesh.position.set(23.5, sy, 11.5);

    this.corridorQueue = [
      new THREE.Vector3(23.5, this.getGroundY ? this.getGroundY(23.5, 11.5) : 3.4, 11.5),
      new THREE.Vector3(21.5, this.getGroundY ? this.getGroundY(21.5, 14.0) : 1.5, 14.0),
      new THREE.Vector3(20.0, this.getGroundY ? this.getGroundY(20.0, 18.0) : 0.0, 18.0),
      new THREE.Vector3(20.0, this.getGroundY ? this.getGroundY(20.0, 26.0) : 0.0, 26.0),
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

  showSpeechBubble(text, duration = 3.5) {
    if (this.speechBubble) {
      this.mesh.remove(this.speechBubble);
      this.speechBubble = null;
    }
    this.speechBubble = createSpeechBubbleSprite(text, false);
    this.speechBubble.position.set(0, 3.1, 0);
    this.mesh.add(this.speechBubble);
    this.speechBubbleTimer = duration;
  }

  showAngryBubble(duration = 2.0) {
    if (this.speechBubble) {
      this.mesh.remove(this.speechBubble);
      this.speechBubble = null;
    }
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
        if (this.mesh.position.y < gy - 0.1) {
          console.warn(`[HubHero] ${this.heroData.name} y (${this.mesh.position.y.toFixed(2)}) is below getGroundY - 0.1 (${(gy - 0.1).toFixed(2)})`);
        }
        // Smooth entity height with a short lerp (factor 18 * dt) so stair steps do not jitter
        this.mesh.position.y += (gy - this.mesh.position.y) * Math.min(1.0, 18 * delta);
      }
    };

    // Tick speech bubble timer
    if (this.speechBubbleTimer > 0) {
      this.speechBubbleTimer -= delta;
      if (this.speechBubbleTimer <= 0 && this.speechBubble) {
        this.mesh.remove(this.speechBubble);
        this.speechBubble = null;
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

      // Every 5s: +24 skill EXP (x1.5 for diligent) & +3 fatigue
      if (this.trainingExpTimer >= 5.0) {
        this.trainingExpTimer -= 5.0;
        const tgLevel = (gameState.facilities?.training?.level) || 1;
        const isDiligent = this.heroData.motivation === 'diligent';
        const expGain = Math.round(24 * (1 + (tgLevel - 1) * 0.10) * (isDiligent ? 1.5 : 1.0));
        this.heroData.fatigue = Math.min(100, (this.heroData.fatigue || 0) + 3);

        if (this.trainingSkill) {
          addSkillExp(this.heroData, this.trainingSkill.id, expGain);
          gameState.checkTalentReveal(this.heroData);
        }

        if (gameState.trainingSlots && gameState.trainingSlots[this.trainingSlot]) {
          gameState.trainingSlots[this.trainingSlot].expGained = (gameState.trainingSlots[this.trainingSlot].expGained || 0) + expGain;
        }

        const dummyZ = 18.0;
        const dummyX = [-26.4, -24.0, -21.6][this.trainingSlot] || this.mesh.position.x;
        const dummyY = (getGroundY ? getGroundY(dummyX, dummyZ) : 0) + 1.0;
        spawnSparks(this.scene, new THREE.Vector3(dummyX, dummyY, dummyZ), 0xffaa44, 4);
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

  destroy() {
    if (this.trainingSlot !== null && gameState.trainingSlots) {
      gameState.trainingSlots[this.trainingSlot] = null;
      this.trainingSlot = null;
    }
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
        this.npcs.push(npc);
      }
    }
  }

  spawnNewSummonHero(heroData, getGroundY = null) {
    const npc = new HubHeroNPC(heroData, this.scene, (npcObj) => this.handleRuleBreak(npcObj), getGroundY, this.navGrid, true);
    this.npcs.push(npc);
    return npc;
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
