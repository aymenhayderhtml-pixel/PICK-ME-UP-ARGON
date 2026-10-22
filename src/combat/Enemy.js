import * as THREE from 'three';
import { ENEMY_TYPES, getEnemyStats } from '../data/enemies.js';
import * as GoblinAI from './GoblinAI.js';
import * as WolfAI from './WolfAI.js';
import { showSystemMessage } from '../ui/Hud.js';
import { EnemyRig } from '../art/EnemyRig.js';

function canWalkAt(dungeon, x, z, r = 0.4) {
  if (!dungeon) return true;
  return (
    dungeon.isWalkable(x - r, z - r) &&
    dungeon.isWalkable(x + r, z - r) &&
    dungeon.isWalkable(x - r, z + r) &&
    dungeon.isWalkable(x + r, z + r)
  );
}

function createAlertSprite() {
  if (typeof document === 'undefined') {
    return new THREE.Group();
  }
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffea00';
  ctx.font = 'bold 50px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('!', 32, 50);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.8, 0.8, 1);
  return sprite;
}

function buildCurvedDagger() {
  const daggerGroup = new THREE.Group();
  const silverMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.85, roughness: 0.25 });
  const hiltMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.8 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.14, 6), hiltMat);
  handle.position.y = -0.05;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 0.04), silverMat);
  guard.position.y = 0.02;

  // 3 segments for curved blade
  const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.11, 0.018), silverMat);
  s1.position.set(0, 0.08, 0);
  const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.11, 0.018), silverMat);
  s2.position.set(0.022, 0.17, 0);
  s2.rotation.z = -0.24;
  const s3 = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.10, 4), silverMat);
  s3.position.set(0.06, 0.25, 0);
  s3.rotation.z = -0.48;
  daggerGroup.add(handle, guard, s1, s2, s3);
  return daggerGroup;
}

function buildSpikedShield() {
  const shield = new THREE.Group();
  const wood1 = new THREE.MeshStandardMaterial({ color: 0x5a3e26, roughness: 0.9 });
  const wood2 = new THREE.MeshStandardMaterial({ color: 0x48301c, roughness: 0.9 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8, roughness: 0.35 });

  // 4 vertical planks
  for (let i = 0; i < 4; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.46, 0.03), i % 2 === 0 ? wood1 : wood2);
    plank.position.set((i - 1.5) * 0.088, 0, 0);
    shield.add(plank);
  }
  // Iron bands (top and bottom)
  const bandTop = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.045, 0.04), iron);
  bandTop.position.y = 0.13;
  const bandBot = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.045, 0.04), iron);
  bandBot.position.y = -0.13;
  shield.add(bandTop, bandBot);

  // 4 metal spikes
  const spikeGeo = new THREE.ConeGeometry(0.028, 0.11, 5);
  const coords = [
    [-0.11, 0.13],
    [0.11, 0.13],
    [-0.11, -0.13],
    [0.11, -0.13],
  ];
  for (const [sx, sy] of coords) {
    const sp = new THREE.Mesh(spikeGeo, iron);
    sp.position.set(sx, sy, 0.06);
    sp.rotation.x = Math.PI / 2;
    shield.add(sp);
  }
  return shield;
}

function buildWoodenClub() {
  const club = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x54361c, roughness: 0.95 });
  const knotMat = new THREE.MeshStandardMaterial({ color: 0x3d2510, roughness: 0.95 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.32, 6), woodMat);
  handle.position.y = -0.14;
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.045, 0.38, 6), woodMat);
  head.position.y = 0.14;
  const k1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.04, 0), knotMat);
  k1.position.set(0.065, 0.18, 0.03);
  const k2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.04, 0), knotMat);
  k2.position.set(-0.06, 0.24, -0.04);
  club.add(handle, head, k1, k2);
  return club;
}

export class Enemy {
  constructor(x, z, typeKey = 'GRUNT', isBoss = false, floorNumber = 1, level = null) {
    this.typeKey = typeKey.toUpperCase();
    this.stats = getEnemyStats(this.typeKey, floorNumber);
    this.isBoss = isBoss || this.typeKey === 'LEADER';
    this.floorNumber = floorNumber;
    this.level = level !== null ? level : (this.stats.level || (floorNumber <= 2 ? 3 : Math.max(1, floorNumber * 2 - 1)));
    this.name = this.typeKey === 'PRAIRIE_WOLF' ? 'Prairie Wolf'
      : this.typeKey === 'GOBLIN_HOUND' ? 'Goblin Hound'
      : this.typeKey === 'BLACK_WOLF' ? 'Black Wolf'
      : this.typeKey === 'HARPY' ? 'Harpy'
      : (this.stats.name || (this.isBoss ? 'Hobgoblin Chief' : 'Goblin'));

    this.mesh = new THREE.Group();
    this.materials = [];
    this.geometries = [];

    // Core Stats (scale hp and damage * (1 + 0.1 * (level - 1)))
    const levelMult = 1 + 0.1 * (this.level - 1);
    this.maxHp = Math.round(this.stats.maxHp * levelMult);
    this.hp = this.maxHp;
    this.speed = this.stats.speed;
    this.damage = Math.round(this.stats.damage * levelMult * 10) / 10;
    this.detectionRange = this.stats.detectionRange;
    this.attackRange = this.stats.attackRange || 1.4;
    this.poison = this.stats.poison || null;

    // Morale system (0 to 100, starts at 70)
    this.morale = 70;
    this.isLowHpMoraleApplied = false;

    // State Machine
    this.state = 'idle';
    this.stateTimer = 0;

    // Goblin Scout horn windup
    this.hornStarted = false;
    this.hornFinished = false;
    this.hornCancelled = false;
    this.hornMessageShown = false;
    this.hornWindupTimer = 0;
    this.attackCooldown = 0;
    this.healCooldown = 0;
    this.rallyCooldown = 3.0;
    this.animTime = Math.random() * 10;

    // Swarm tactics tokens
    this.hasAttackToken = false;
    this.isAggroed = false;

    // Knockback & hit flinch
    this.knockbackX = 0;
    this.knockbackZ = 0;
    this.knockbackDuration = 0;
    this.flashTimer = 0;

    // Death & Corpse
    this.dead = false;
    this.isDying = false;
    this.deathTimer = (this.typeKey === 'PRAIRIE_WOLF' || this.typeKey === 'GOBLIN_HOUND' || this.typeKey === 'BLACK_WOLF' || this.typeKey === 'LIGHTNING_WOLF' || this.typeKey === 'QUEEN_OF_THE_FOREST') ? 1.0 : 0.8;
    this.corpseTimer = 6.0; // Corpse stays for 6 seconds
    this.corpseFadeTimer = 0.8; // Fades out over 0.8s after 6 seconds
    this.isCorpseCleaned = false;

    // Visual indicators
    this.buildModel();

    if (this.stats.size && this.stats.size !== 1.0) {
      this.mesh.scale.set(this.stats.size, this.stats.size, this.stats.size);
    }

    this.mesh.position.set(x, 0, z);

    this.capsuleRadius = this.stats.size ? (0.35 * this.stats.size) : 0.35;
    this.capsuleHeight = this.stats.size ? (1.55 * this.stats.size) : 1.55;
    this.team = 'enemy';
    this.id = `enemy_${Math.random().toString(36).substring(2, 9)}`;
    this.statusEffects = new Map([
      ['burn', { active: false, duration: 0, tickInterval: 0.5, tickTimer: 0, potency: 6, tickDamage: 3 }],
    ]);
  }

  get position() {
    return this.mesh ? this.mesh.position : (this._pos || (this._pos = new THREE.Vector3()));
  }

  get isDead() {
    return this.dead || this.isDying || this.hp <= 0;
  }

  applyStatusEffect(type, conf = {}) {
    let eff = this.statusEffects.get(type);
    if (!eff) {
      eff = { active: false, duration: 0, tickInterval: 0.5, tickTimer: 0, tickDamage: 3, potency: 1.0 };
      this.statusEffects.set(type, eff);
    }
    eff.active = true;
    eff.duration = typeof conf === 'number' ? conf : (conf.duration ?? 3.0);
    if (typeof conf === 'object') {
      if (conf.potency !== undefined) eff.potency = conf.potency;
      if (conf.tickDamage !== undefined) eff.tickDamage = conf.tickDamage;
      if (conf.tickInterval !== undefined) eff.tickInterval = conf.tickInterval;
    }
    eff.tickTimer = 0;
    if (this.rig && this.rig.setTint && type === 'burn') {
      this.rig.setTint(0xff6600, 0.7);
    }
  }

  receiveAttack(hitPayload) {
    if (this.dead || this.isDying) return null;
    const dmg = hitPayload?.damage ?? hitPayload?.rawDamage ?? 0;
    this.takeDamage(dmg, hitPayload?.isFinisher);

    if (hitPayload?.statusEffect) {
      this.applyStatusEffect(hitPayload.statusEffect.type, hitPayload.statusEffect);
    }

    if (hitPayload?.knockbackSpeed && !this.isBoss) {
      const fromPos = hitPayload.attackerPosition || (hitPayload.attacker ? hitPayload.attacker.position : null);
      let kx = 0;
      let kz = 1;
      if (fromPos) {
        kx = this.position.x - fromPos.x;
        kz = this.position.z - fromPos.z;
        const len = Math.hypot(kx, kz) || 1;
        kx /= len;
        kz /= len;
      }
      this.applyKnockback(kx, kz, hitPayload.knockbackSpeed);
    }

    return { damage: dmg, killed: this.dead };
  }

  buildModel() {
    this.rig = new EnemyRig(this.typeKey, {
      weapon: this.weaponType,
      seed: this.seed !== undefined ? this.seed : Math.floor(Math.random() * 100000),
      level: this.level || 1
    });

    this.mesh.add(this.rig.group);

    // Dummy pivots for animation backward compatibility
    this.leftArmPivot = new THREE.Group();
    this.rightArmPivot = new THREE.Group();
    this.leftLegPivot = new THREE.Group();
    this.rightLegPivot = new THREE.Group();
    this.torsoGroup = new THREE.Group();

    this.mainMat = {
      color: new THREE.Color(0x6a6a2e),
      setHex: (hex) => {
        if (this.rig) this.rig.setTint(hex, 0.85);
      },
      copy: () => {
        if (this.rig) this.rig.setTint(null, 0);
      }
    };
    this.originalColor = new THREE.Color(0x6a6a2e);

    // Tag height for UI overlay
    this.tagHeight = this.rig.getHeadHeight() + 0.15;

    // Archer telegraph line
    if (this.typeKey === 'ARCHER') {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 14.0),
      ]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.85 });
      this.telegraphLine = new THREE.Line(lineGeo, lineMat);
      this.telegraphLine.position.set(0, 0.9, 0.2);
      this.telegraphLine.visible = false;
      this.mesh.add(this.telegraphLine);
    }

    // Shaman heal ring
    if (this.typeKey === 'SHAMAN') {
      const ringGeo = new THREE.RingGeometry(0.3, 1.6, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
      this.healRing = new THREE.Mesh(ringGeo, ringMat);
      this.healRing.rotation.x = -Math.PI / 2;
      this.healRing.position.set(0, 0.05, 0);
      this.healRing.visible = false;
      this.mesh.add(this.healRing);
    }

    // Alert Sprite ('!')
    this.alertSprite = createAlertSprite();
    this.alertSprite.position.set(0, this.tagHeight + 0.2, 0);
    this.alertSprite.visible = false;
    this.mesh.add(this.alertSprite);
  }

  showTelegraph(player, duration = 0.4) {
    if (this.telegraphLine) {
      this.telegraphLine.visible = true;
      setTimeout(() => {
        this.hideTelegraph();
      }, duration * 1000);
    }
  }

  hideTelegraph() {
    if (this.telegraphLine) {
      this.telegraphLine.visible = false;
    }
  }

  showAmbushGlow(visible) {
    if (visible) {
      this.mainMat.emissive = new THREE.Color(0xff1122);
      this.mainMat.emissiveIntensity = 0.6;
    } else {
      this.mainMat.emissive = new THREE.Color(0x000000);
      this.mainMat.emissiveIntensity = 0.0;
    }
  }

  triggerAmbushJump() {
    this.state = 'hesitate';
    this.stateTimer = 0.5; // 0.5s reaction delay
    this.alertSprite.visible = true;
    this.mesh.position.y = 0.6; // Small jump
    setTimeout(() => {
      this.alertSprite.visible = false;
    }, 900);
  }

  castHealPulse(ally) {
    ally.hp = Math.min(ally.maxHp, ally.hp + 15);
    if (this.healRing) {
      this.healRing.visible = true;
      this.healRing.scale.set(1, 1, 1);
      setTimeout(() => {
        if (this.healRing) this.healRing.visible = false;
      }, 500);
    }
  }

  enterHesitate(duration = 1.5) {
    if (this.dead) return;
    this.state = 'hesitate';
    this.stateTimer = duration;
  }

  playPanicAnim(delta) {
    if (this.leftArmPivot && this.rightArmPivot) {
      this.leftArmPivot.rotation.x = -Math.PI * 0.85;
      this.rightArmPivot.rotation.x = -Math.PI * 0.85;
    }
    this.mesh.rotation.y += Math.sin(performance.now() * 0.03) * 0.25;
  }

  moveToward(targetX, targetZ, delta, dungeon) {
    const dx = targetX - this.mesh.position.x;
    const dz = targetZ - this.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.05) {
      this.moveInDirection(dx / dist, dz / dist, delta, dungeon);
    }
  }

  moveInDirection(dirX, dirZ, delta, dungeon) {
    const mx = dirX * this.speed * delta;
    const mz = dirZ * this.speed * delta;

    if (canWalkAt(dungeon, this.mesh.position.x + mx, this.mesh.position.z, 0.35)) {
      this.mesh.position.x += mx;
    }
    if (canWalkAt(dungeon, this.mesh.position.x, this.mesh.position.z + mz, 0.35)) {
      this.mesh.position.z += mz;
    }

    this.mesh.rotation.y = Math.atan2(dirX, dirZ);
    this.isMoving = true;
  }

  faceToward(targetX, targetZ) {
    const dx = targetX - this.mesh.position.x;
    const dz = targetZ - this.mesh.position.z;
    this.mesh.rotation.y = Math.atan2(dx, dz);
  }

  takeDamage(dmg, isFinisher = false) {
    if (this.dead) return;
    if (this.typeKey === 'GOBLIN_SCOUT' && this.hornStarted && !this.hornFinished && !this.hornCancelled) {
      this.hornCancelled = true;
      this.hornFinished = false;
      this.hornStarted = false;
      this.state = 'stagger';
      this.stateTimer = 0.25;
    }
    this.hp -= dmg;
    this.flashTimer = 0.1;
    if (this.rig) this.rig.setTint(0xffffff, 0.85);

    // Morale hit: combo 3rd hit (isFinisher) drops morale by 10
    if (isFinisher) {
      this.morale = Math.max(0, this.morale - 10);
    }

    // Morale hit: HP < 30% drops morale by 15
    if (!this.isLowHpMoraleApplied && this.hp < this.maxHp * 0.3) {
      this.isLowHpMoraleApplied = true;
      this.morale = Math.max(0, this.morale - 15);
    }

    if (this.morale < 30 && this.state !== 'hesitate' && this.state !== 'flee') {
      this.enterHesitate(1.5);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
  }

  applyKnockback(kx, kz, force) {
    if (this.dead) return;
    this.knockbackX = kx * force;
    this.knockbackZ = kz * force;
    this.knockbackDuration = 0.2;
    this.state = 'stagger';
    this.stateTimer = 0.25;

    // Detect 3rd combo hit from heavy knockback force
    if (force >= 10) {
      this.takeDamage(0, true);
    }
  }

  die() {
    this.dead = true;
    this.isDying = true;
    this.state = 'dead';
    this.deathElapsed = 0;

    // Gem drops for crystal monsters (15% chance to drop 1-3 gems on kill)
    const isCrystalMonster = this.typeKey === 'CRYSTAL_SLIME' || this.typeKey === 'MINI_SLIME' || this.typeKey === 'ROCK_CRAWLER';
    if (isCrystalMonster && !this.gemDropped) {
      this.gemDropped = true;
      if (Math.random() < 0.15) {
        const gems = Math.floor(Math.random() * 3) + 1;
        gameState.gems = (gameState.gems || 0) + gems;
        showSystemMessage(`[Defeated crystal monster: +${gems} Gem${gems > 1 ? 's' : ''}!]`);
      }
    }

    // Slime splitting: Crystal Slime splits into 2 small slimes on death
    if (this.typeKey === 'CRYSTAL_SLIME' && this.onSplit) {
      this.onSplit(this.mesh.position.clone());
    }

    // Queen of the Forest drops + Jenna skill
    if (this.typeKey === 'QUEEN_OF_THE_FOREST') {
      if (!gameState.materials) gameState.materials = {};
      gameState.materials.wind_elemental_stone = (gameState.materials.wind_elemental_stone || 0) + 1;
      gameState.materials.wind_elemental_stone_d = (gameState.materials.wind_elemental_stone_d || 0) + 1;
      gameState.materials.queens_blood = (gameState.materials.queens_blood || 0) + 1;
      gameState.materials.beast_meat = (gameState.materials.beast_meat || 0) + 1;
      const jenna = (gameState.heroes || []).find((h) => h.id === 'hero_jenna' || (h.name || '').toLowerCase() === 'jenna');
      if (jenna) {
        if (!Array.isArray(jenna.skills)) jenna.skills = [];
        if (!jenna.skills.some((s) => String(typeof s === 'string' ? s : (s.id || s.name || '')).toLowerCase().replace(/\s+/g, '_') === 'hunter_of_the_forest')) {
          jenna.skills.push({ id: 'hunter_of_the_forest', name: 'Hunter of the Forest', level: 1, exp: 0 });
        }
        showSystemMessage("DARARANG!! SKILL AWAKENED! JENNA (★) HAS RECEIVED THE SKILL 'HUNTER OF THE FOREST!'");
      }
    }

    // Lightning Wolf drops
    if (this.typeKey === 'LIGHTNING_WOLF') {
      if (!gameState.materials) gameState.materials = {};
      gameState.materials.water_elemental_stone = (gameState.materials.water_elemental_stone || 0) + 1;
      gameState.materials.water_elemental_stone_d = (gameState.materials.water_elemental_stone_d || 0) + 1;
    }

    // Check weapon scavenging drop (35% chance)
    if (Math.random() < 0.35 && !isCrystalMonster) {
      this.droppedWeapon = {
        type: this.weaponType || 'club',
        durability: 20,
      };
      console.log(`[Scavenge dropped: ${this.droppedWeapon.type} (Durability: 20)]`);
    }
  }

  pushApart(otherEnemies, delta) {
    if (this.dead || this.isDying) return;

    const myPos = this.mesh.position;
    for (const other of otherEnemies) {
      if (other === this || other.dead || other.isDying) continue;
      const dx = myPos.x - other.mesh.position.x;
      const dz = myPos.z - other.mesh.position.z;
      const distSq = dx * dx + dz * dz;

      if (distSq < 0.81 && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const push = (0.9 - dist) * 2.0 * delta;
        this.mesh.position.x += (dx / dist) * push;
        this.mesh.position.z += (dz / dist) * push;
      }
    }
  }

  update(delta, player, dungeon, camera, projectilesManager, allies, context = {}) {
    // Damage flash timer
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        if (this.rig) this.rig.setTint(null, 0);
      }
    }

    // Status effects (burn DoT)
    const burn = this.statusEffects?.get('burn');
    if (burn && burn.active && !this.dead) {
      burn.duration -= delta;
      burn.tickTimer += delta;
      if (burn.tickTimer >= (burn.tickInterval || 0.5)) {
        burn.tickTimer = 0;
        const bDmg = burn.tickDamage || 3;
        this.hp -= bDmg;
        this.flashTimer = 0.1;
        if (this.rig) this.rig.setTint(0xff6600, 0.8);
        const onDmg = context?.onDamageNumber || this.onDamageNumber;
        if (onDmg) onDmg(bDmg, this.position, 'burn');
        if (this.hp <= 0) {
          this.hp = 0;
          this.die();
        }
      }
      if (burn.duration <= 0) {
        burn.active = false;
        if (this.rig) this.rig.setTint(null, 0);
      }
    }

    // Corpse decay & removal after 6 seconds
    if (this.dead) {
      this.deathElapsed = (this.deathElapsed || 0) + delta;
      if (this.rig) {
        this.rig.update(delta, { state: 'death', actionTime: this.deathElapsed });
      }
      if (this.corpseTimer > 0) {
        this.corpseTimer -= delta;
      } else {
        // Fade out over 0.8s after 6s
        this.corpseFadeTimer -= delta;
        const alpha = Math.max(0, this.corpseFadeTimer / 0.8);
        if (this.rig) {
          this.rig.setOpacity(alpha);
        }
        if (this.corpseFadeTimer <= 0) {
          this.isCorpseCleaned = true;
        }
      }
      return;
    }

    // Knockback movement
    if (this.knockbackDuration > 0) {
      this.knockbackDuration -= delta;
      const kx = this.knockbackX * delta;
      const kz = this.knockbackZ * delta;
      if (canWalkAt(dungeon, this.mesh.position.x + kx, this.mesh.position.z, 0.35)) {
        this.mesh.position.x += kx;
      }
      if (canWalkAt(dungeon, this.mesh.position.x, this.mesh.position.z + kz, 0.35)) {
        this.mesh.position.z += kz;
      }
      this.knockbackX *= 0.85;
      this.knockbackZ *= 0.85;
    }

    // Check that enemies that fall outside the walkable path never stay stuck inside trees
    if (dungeon && dungeon.isWalkable && !dungeon.isWalkable(this.mesh.position.x, this.mesh.position.z)) {
      if (dungeon.findNearestWalkable) {
        const pt = dungeon.findNearestWalkable(this.mesh.position.x, this.mesh.position.z);
        this.mesh.position.x = pt.x;
        this.mesh.position.z = pt.z;
      }
    }

    // Slime squish animation
    if (this.slimeMesh) {
      this.slimeMesh.scale.y = 0.75 + Math.sin(this.animTime * 8) * 0.15;
    }

    // Rock Crawler roll attack every 8s
    if (this.typeKey === 'ROCK_CRAWLER') {
      this.rollCooldown = (this.rollCooldown !== undefined ? this.rollCooldown : 8.0) - delta;
      if (this.rollCooldown <= 0 && (this.state === 'chase' || this.state === 'attack')) {
        this.rollCooldown = 8.0;
        this.isRollingAttack = true;
        this.rollDuration = 1.2;
      }
      if (this.isRollingAttack) {
        this.rollDuration -= delta;
        if (this.rockShell) this.rockShell.rotation.x += delta * 20;
        this.speed = this.stats.speed * 2.5;
        if (this.rollDuration <= 0) {
          this.isRollingAttack = false;
          this.speed = this.stats.speed;
          if (this.rockShell) this.rockShell.rotation.x = 0;
        }
      }
    }

    // Leader Rally Aura: every 3s increases allies' morale by +15 within 15 units
    if (this.typeKey === 'LEADER') {
      this.rallyCooldown -= delta;
      if (this.rallyCooldown <= 0) {
        this.rallyCooldown = 3.0;
        for (const ally of allies) {
          if (ally !== this && !ally.dead && this.mesh.position.distanceTo(ally.mesh.position) <= 15.0) {
            ally.morale = Math.min(100, ally.morale + 15);
          }
        }
      }
    }


    // Goblin Scout horn windup trigger when aggroed
    if (this.typeKey === 'GOBLIN_SCOUT' && this.state === 'chase' && !this.hornStarted && !this.hornFinished && !this.hornCancelled) {
      this.state = 'hornWindup';
      this.stateTimer = 4.0;
      this.hornStarted = true;
      this.hornWindupTimer = 4.0;
      if (!this.hornMessageShown) {
        this.hornMessageShown = true;
        showSystemMessage("WAIT, THEY HAVE A BLOWING HORN! I WON'T LET YOU CALL FOR REINFORCEMENTS!");
      }
    }

    // Rig animation update
    const moving = this.isMoving;
    this.isMoving = false;

    let actionTime = 0;
    if (this.state === 'attack') {
      actionTime = Math.max(0, 0.25 - this.stateTimer);
    } else if (this.state === 'windup' || this.state === 'hornWindup') {
      actionTime = Math.max(0, 0.4 - this.stateTimer);
    } else if (this.state === 'stagger') {
      actionTime = Math.max(0, 0.25 - this.stateTimer);
    }

    if (this.rig) {
      this.rig.update(delta, {
        moving,
        speed: this.speed / 2.0,
        state: this.state === 'hornWindup' ? 'windup' : this.state,
        actionTime,
        morale: this.morale
      });
    }

    const pPos = player.mesh.position;
    const distToPlayer = Math.hypot(pPos.x - this.mesh.position.x, pPos.z - this.mesh.position.z);

    // Stealth talent reduction on aggro range: 4% per stealth level
    const stealthReduction = 1 - (context?.stealthLevel || 0) * 0.04;
    const effectiveDetectionRange = this.detectionRange * stealthReduction;

    if (this.typeKey === 'PRAIRIE_WOLF' || this.typeKey === 'GOBLIN_HOUND' || this.typeKey === 'BLACK_WOLF' || this.typeKey === 'LIGHTNING_WOLF' || this.typeKey === 'QUEEN_OF_THE_FOREST') {
      WolfAI.updateWolf(this, delta, player, dungeon, camera, projectilesManager, allies, context);
      return;
    }

    // Goblin Scout horn windup: handled below after AI routing guard
    if (this.typeKey === 'GOBLIN_SCOUT' && this.state === 'hornWindup') {
      this.stateTimer -= delta;
      this.hornWindupTimer = this.stateTimer;
      if (this.stateTimer <= 0) {
        this.state = 'idle';
        this.hornFinished = true;
      }
    }

    if (this.typeKey === 'GOBLIN_SCOUT' && this.state === 'hornWindup') {
      // skip normal AI
    } else {
    // State machine updates via GoblinAI
    switch (this.state) {
      case 'idle':
        GoblinAI.handleIdle(this, delta, player, distToPlayer, effectiveDetectionRange);
        break;
      case 'ambushWait':
        GoblinAI.handleAmbushWait(this, delta, player, distToPlayer, context);
        break;
      case 'chase':
        GoblinAI.handleChase(this, delta, player, distToPlayer, allies, dungeon, context);
        break;
      case 'flank':
        GoblinAI.handleFlank(this, delta, player, distToPlayer, allies, dungeon, context);
        break;
      case 'windup':
        GoblinAI.handleWindup(this, delta, player, distToPlayer, camera, projectilesManager, context);
        break;
      case 'attack':
        GoblinAI.handleAttack(this, delta);
        break;
      case 'stagger':
        GoblinAI.handleStagger(this, delta);
        break;
      case 'hesitate':
        GoblinAI.handleHesitate(this, delta, player, dungeon);
        break;
      case 'flee':
        GoblinAI.handleFlee(this, delta, player, dungeon);
        break;
    }
    }
  }

  dispose() {
    if (this.rig) {
      this.rig.dispose();
    }
    if (this.telegraphLine) {
      if (this.telegraphLine.geometry) this.telegraphLine.geometry.dispose();
      if (this.telegraphLine.material) this.telegraphLine.material.dispose();
    }
    if (this.healRing) {
      if (this.healRing.geometry) this.healRing.geometry.dispose();
      if (this.healRing.material) this.healRing.material.dispose();
    }
  }
}
