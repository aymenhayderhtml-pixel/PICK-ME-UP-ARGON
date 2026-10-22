import * as THREE from 'three';
import { HERO_TEMPLATES } from '../data/heroes.js';
import { createLabelSprite } from '../ui/Label.js';
import { gameState } from '../core/GameState.js';
import { showSystemMessage } from '../ui/Hud.js';
import { HeroRig } from '../art/HeroRig.js';
import { generateLook } from '../art/looks.js';
import { awardLiveTrainingTickXp } from '../core/TrainingEngine.js';

function createTextSprite(text) {
  return createLabelSprite({ text, isSign: false });
}

const DUMMY_POSITIONS = [
  new THREE.Vector3(-26.4, 0, 18.0),
  new THREE.Vector3(-24.0, 0, 18.0),
  new THREE.Vector3(-21.6, 0, 18.0),
];

const STAND_POSITIONS = [
  new THREE.Vector3(-26.4, 0, 16.6),
  new THREE.Vector3(-24.0, 0, 16.6),
  new THREE.Vector3(-21.6, 0, 16.6),
];

function createXpTextSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#00ffcc';
  ctx.strokeStyle = '#002b20';
  ctx.lineWidth = 5;
  ctx.textAlign = 'center';
  ctx.strokeText(text, 128, 46);
  ctx.fillText(text, 128, 46);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.6, 0.4, 1);
  return sprite;
}

export class TrainingHeroAvatar {
  constructor(slotIndex, heroData, skillId, scene, getGroundY = null, dummyAnchor = null) {
    this.slotIndex = slotIndex;
    this.heroData = heroData;
    this.skillId = skillId;
    this.scene = scene;

    this.mesh = new THREE.Group();
    if (dummyAnchor) {
      this.dummyPos = dummyAnchor.clone();
      this.targetStandPos = new THREE.Vector3(this.dummyPos.x, this.dummyPos.y, this.dummyPos.z - 1.4);
    } else {
      this.targetStandPos = STAND_POSITIONS[slotIndex] ? STAND_POSITIONS[slotIndex].clone() : new THREE.Vector3(-24, 0, 16.6);
      this.dummyPos = DUMMY_POSITIONS[slotIndex] ? DUMMY_POSITIONS[slotIndex].clone() : new THREE.Vector3(-24, 0, 18.0);
    }
    if (getGroundY) {
      this.targetStandPos.y = getGroundY(this.targetStandPos.x, this.targetStandPos.z);
      this.dummyPos.y = getGroundY(this.dummyPos.x, this.dummyPos.z);
    }
    this.mesh.position.copy(this.targetStandPos);

    this.animTimer = 0;
    this.tickTimer = 0;
    this.isCollapsed = (heroData.fatigue || 0) >= 100;
    this.collapseTimer = 0;

    this.buildModel();
    this.buildWeapon();

    // Start at stand position, facing dummy
    this.mesh.position.copy(this.targetStandPos);
    const dz = this.dummyPos.z - this.targetStandPos.z;
    this.mesh.rotation.y = dz >= 0 ? 0 : Math.PI;

    // Floating name label
    const labelSprite = createTextSprite(`${heroData.name} (Training)`);
    labelSprite.scale.set(3.2, 0.8, 1);
    labelSprite.position.set(0, 2.2, 0);
    this.mesh.add(labelSprite);

    this.scene.add(this.mesh);

    // Active visual effects (floating numbers, sparkles, projectile arrows/fireballs)
    this.floatingTexts = [];
    this.particles = [];
    this.projectiles = [];
  }

  buildModel() {
    const look = this.heroData.look || generateLook(this.heroData);
    this.rig = new HeroRig(look);
    this.mesh.add(this.rig.group);
    this.mesh._heroRig = this.rig;
    this.mesh.userData.heroRig = this.rig;
  }

  buildWeapon() {
    const sId = (this.skillId || '').toLowerCase();
    this.weaponType = 'sword';
    this.trainingAction = 'trainSword';

    if (sId.includes('spear')) {
      this.weaponType = 'spear';
      this.trainingAction = 'trainSpear';
    } else if (sId.includes('archery') || sId.includes('bow')) {
      this.weaponType = 'bow';
      this.trainingAction = 'trainBow';
    } else if (sId.includes('dagger') || sId.includes('stealth')) {
      this.weaponType = 'dagger';
      this.trainingAction = 'trainDagger';
    } else if (sId.includes('fire') || sId.includes('mana') || sId.includes('magic')) {
      this.weaponType = 'fireball';
      this.trainingAction = 'trainMagic';
    } else {
      this.weaponType = 'sword';
      this.trainingAction = 'trainSword';
    }

    const offhand = sId.includes('shield') ? { weaponType: 'shield', grade: 'D' } : null;
    const wType = this.weaponType === 'fireball' ? 'staff' : this.weaponType;
    this.rig.equip({
      weapon: { weaponType: wType, grade: 'D' },
      offhand,
      armor: this.heroData.equipment?.armor,
    });
  }

  spawnFloatingXp(amount) {
    const sprite = createXpTextSprite(`+${amount} EXP`);
    sprite.position.set(
      this.mesh.position.x + (Math.random() - 0.5) * 0.3,
      this.mesh.position.y + 2.2,
      this.mesh.position.z
    );
    this.scene.add(sprite);
    this.floatingTexts.push({ sprite, life: 1.3, maxLife: 1.3 });
  }

  spawnLevelUpSparkles() {
    const pGroup = new THREE.Group();
    const count = 16;
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const pGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const particleList = [];

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(0, 1.0, 0);
      pGroup.add(p);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2.2,
        1.5 + Math.random() * 2.5,
        (Math.random() - 0.5) * 2.2
      );
      particleList.push({ mesh: p, vel });
    }
    pGroup.position.copy(this.mesh.position);
    this.scene.add(pGroup);
    this.particles.push({ group: pGroup, particles: particleList, life: 1.2 });
  }

  spawnArrowProjectile() {
    const arrowMat = new THREE.MeshStandardMaterial({ color: 0x886644 });
    const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), arrowMat);
    arrow.rotation.x = Math.PI / 2;
    const dirZ = Math.sign(this.dummyPos.z - this.mesh.position.z) || 1;
    arrow.position.set(this.mesh.position.x, 1.2, this.mesh.position.z + dirZ * 0.4);
    this.scene.add(arrow);
    this.projectiles.push({ mesh: arrow, speed: 7.0 * dirZ, targetZ: this.dummyPos.z, dirZ });
  }

  spawnFireballProjectile() {
    const fMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
    const fireball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), fMat);
    const dirZ = Math.sign(this.dummyPos.z - this.mesh.position.z) || 1;
    fireball.position.set(this.mesh.position.x, 1.2, this.mesh.position.z + dirZ * 0.4);
    this.scene.add(fireball);
    this.projectiles.push({ mesh: fireball, speed: 5.5 * dirZ, targetZ: this.dummyPos.z, dirZ, isFire: true });
  }

  update(delta, getGroundY = null) {
    if (getGroundY && this.mesh.visible) {
      const gy = getGroundY(this.mesh.position.x, this.mesh.position.z);
      if (this.mesh.position.y < gy - 0.1) {
        console.warn(`[TrainingAvatar] ${this.heroData.name} y (${this.mesh.position.y.toFixed(2)}) is below getGroundY - 0.1 (${(gy - 0.1).toFixed(2)})`);
      }
      this.mesh.position.y = this.isCollapsed ? gy + 0.2 : gy;
    }

    // 1. If collapsed, lie down on the ground
    if (this.isCollapsed) {
      this.collapseTimer += delta;
      this.rig.update(delta, { action: 'death', actionTime: Math.min(1.6, this.collapseTimer), mood: 'dead' });
      this.updateEffects(delta);
      return;
    }

    // 2. Skill Animation Loop
    this.animTimer += delta;
    this.rig.update(delta, { action: this.trainingAction, actionTime: this.animTimer, mood: 'neutral' });

    const cycle = (this.animTimer % 1.2) / 1.2;
    if (this.weaponType === 'bow') {
      if (cycle >= 0.5 && (cycle - delta / 1.2) < 0.5) {
        this.spawnArrowProjectile();
      }
    } else if (this.weaponType === 'fireball') {
      if (cycle >= 0.5 && (cycle - delta / 1.2) < 0.5) {
        this.spawnFireballProjectile();
      }
    }

    // 3. 5-Second XP & Fatigue Tick
    this.tickTimer += delta;
    if (this.tickTimer >= 5.0) {
      this.tickTimer -= 5.0;
      this.onTick();
    }

    // 4. Update Visual Effects & Projectiles
    this.updateEffects(delta);
  }

  onTick() {
    // ONE training XP path for every source: the shared engine. It applies
    // the 5 second cooldown, so a hero who is also training through the
    // autonomous NPC path can never earn the same tick twice.
    const skillBefore = (this.heroData.skills || []).find((s) => s.id === this.skillId);
    const levelBefore = skillBefore ? skillBefore.level || 1 : 1;

    const result = awardLiveTrainingTickXp(
      this.heroData,
      'dummy',
      this.skillId,
      gameState,
      Date.now()
    );

    if (result.awarded) {
      this.spawnFloatingXp(result.xpGained);
      const skillAfter = (this.heroData.skills || []).find((s) => s.id === this.skillId);
      if (skillAfter && (skillAfter.level || 1) > levelBefore) {
        this.spawnLevelUpSparkles();
      }
    }

    // Check collapse at 100 fatigue
    if (this.heroData.fatigue >= 100) {
      this.isCollapsed = true;
      showSystemMessage(`[${this.heroData.name} collapsed from exhaustion!]`);
      gameState.trainingSlots[this.slotIndex] = null;
    }

    gameState.saveToLocalStorage();
  }

  updateEffects(delta) {
    // Floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= delta;
      ft.sprite.position.y += delta * 1.1;
      const alpha = Math.max(0, ft.life / ft.maxLife);
      ft.sprite.material.opacity = alpha;
      if (ft.life <= 0) {
        this.scene.remove(ft.sprite);
        this.floatingTexts.splice(i, 1);
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= delta;
      for (const p of pt.particles) {
        p.mesh.position.addScaledVector(p.vel, delta);
        p.vel.y -= 3.5 * delta; // Gravity
      }
      if (pt.life <= 0) {
        this.scene.remove(pt.group);
        this.particles.splice(i, 1);
      }
    }

    // Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.mesh.position.z += pr.speed * delta;
      const reached = pr.dirZ > 0 ? (pr.mesh.position.z >= pr.targetZ) : (pr.mesh.position.z <= pr.targetZ);
      if (reached) {
        // Hit dummy
        if (pr.isFire) {
          // Burst
          this.spawnBurstAt(pr.mesh.position);
        }
        this.scene.remove(pr.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  spawnBurstAt(pos) {
    const burstMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    const bMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), burstMat);
    bMesh.position.copy(pos);
    this.scene.add(bMesh);

    const burstGroup = new THREE.Group();
    burstGroup.add(bMesh);
    this.particles.push({
      group: burstGroup,
      particles: [],
      life: 0.25,
    });
  }

  destroy() {
    if (this.rig) {
      this.rig.dispose();
    }
    for (const ft of this.floatingTexts) {
      this.scene.remove(ft.sprite);
    }
    for (const pt of this.particles) {
      this.scene.remove(pt.group);
    }
    for (const pr of this.projectiles) {
      this.scene.remove(pr.mesh);
    }
    this.floatingTexts = [];
    this.particles = [];
    this.projectiles = [];
    this.scene.remove(this.mesh);
  }
}

export class TrainingManager {
  constructor(scene) {
    this.scene = scene;
    this.avatars = [null, null, null];
    this.anchors = null;
  }

  setAnchors(anchors) {
    this.anchors = anchors;
  }

  syncWithGameState(getGroundY = null) {
    this.getGroundY = getGroundY || this.getGroundY;
    const slots = gameState.trainingSlots || [null, null, null];
    for (let i = 0; i < 3; i++) {
      const s = slots[i];
      if (s) {
        const hero = gameState.heroes.find((h) => h.id === s.heroId);
        if (hero && hero.alive) {
          if (!this.avatars[i] || this.avatars[i].heroData.id !== hero.id || this.avatars[i].skillId !== s.skillId) {
            if (this.avatars[i]) {
              this.avatars[i].destroy();
            }
            const dummyAnchor = this.anchors ? (this.anchors[`dummy_${i}`] || this.anchors[`dummy_${i}_layout`]) : null;
            this.avatars[i] = new TrainingHeroAvatar(i, hero, s.skillId, this.scene, this.getGroundY, dummyAnchor);
          }
        } else {
          // Hero dead or missing
          if (this.avatars[i]) {
            this.avatars[i].destroy();
            this.avatars[i] = null;
          }
          gameState.trainingSlots[i] = null;
        }
      } else {
        if (this.avatars[i]) {
          this.avatars[i].destroy();
          this.avatars[i] = null;
        }
      }
    }
  }

  startTraining(slotIndex, heroId, skillId) {
    gameState.trainingSlots[slotIndex] = { heroId, skillId };
    gameState.saveToLocalStorage();
    this.syncWithGameState(this.getGroundY);
    const hero = gameState.heroes.find((h) => h.id === heroId);
    if (hero) {
      showSystemMessage(`[${hero.name} started training at Dummy ${slotIndex + 1}!]`);
    }
  }

  stopTraining(slotIndex) {
    const s = gameState.trainingSlots[slotIndex];
    if (s) {
      const hero = gameState.heroes.find((h) => h.id === s.heroId);
      if (hero) {
        gameState.addStress(hero, -5);
        showSystemMessage(`[${hero.name} finished training (-5 stress)]`);
      }
    }
    gameState.trainingSlots[slotIndex] = null;
    gameState.saveToLocalStorage();
    if (this.avatars[slotIndex]) {
      this.avatars[slotIndex].destroy();
      this.avatars[slotIndex] = null;
    }
  }

  update(delta, getGroundY = null) {
    const gy = getGroundY || this.getGroundY;
    for (let i = 0; i < 3; i++) {
      if (this.avatars[i]) {
        this.avatars[i].update(delta, gy);
      }
    }
  }

  clear() {
    for (let i = 0; i < 3; i++) {
      if (this.avatars[i]) {
        this.avatars[i].destroy();
        this.avatars[i] = null;
      }
    }
  }
}
