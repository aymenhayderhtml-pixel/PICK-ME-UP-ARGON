// src/art/EnemyRig.js
import * as THREE from 'three';
import { createEnemyModel, POSE_INFO } from './enemies.js';

function mapEnemyType(typeKey) {
  const key = (typeKey || '').toUpperCase();
  switch (key) {
    case 'GRUNT':
    case 'GOBLIN_GRUNT':
      return 'goblin_grunt';
    case 'ARCHER':
    case 'GOBLIN_ARCHER':
      return 'goblin_archer';
    case 'SHAMAN':
    case 'GOBLIN_SHAMAN':
      return 'goblin_shaman';
    case 'LEADER':
    case 'GOBLIN_LEADER':
      return 'goblin_leader';
    case 'HOBGOBLIN_CHIEF':
    case 'CHIEF':
    case 'BOSS':
      return 'hobgoblin_chief';
    case 'CRYSTAL_SLIME':
    case 'MINI_SLIME':
      return 'crystal_slime';
    case 'PRAIRIE_WOLF':
    case 'WOLF':
      return 'prairie_wolf';
    case 'ORC_WARRIOR':
      return 'orc_warrior';
    case 'ORC_ARCHER':
      return 'orc_archer';
    case 'ORC_BERSERKER':
      return 'orc_berserker';
    case 'ORC_LORD':
      return 'orc_lord';
    default:
      return typeKey || 'goblin_grunt';
  }
}

function mapWeaponVariant(weaponType) {
  if (!weaponType) return undefined;
  switch (weaponType) {
    case 'dual_daggers':
    case 'dualKnives':
      return 'dualKnives';
    case 'knife_shield':
    case 'knifeShield':
      return 'knifeShield';
    case 'club':
      return 'club';
    default:
      return weaponType;
  }
}

export class EnemyRig {
  constructor(typeKey = 'goblin_grunt', options = {}) {
    this.rawType = typeKey;
    this.modelType = mapEnemyType(typeKey);

    const modelOpts = {
      seed: options.seed ?? Math.floor(Math.random() * 100000),
      weapon: mapWeaponVariant(options.weapon),
      level: options.level ?? 1,
      outline: options.outline !== undefined ? options.outline : true
    };

    this.model = createEnemyModel(this.modelType, modelOpts);
    this.group = this.model.group;

    // Attach reference so systems can look up the rig from mesh
    this.group._enemyRig = this;
    this.group.userData.enemyRig = this;

    // Backward-compatibility pivots so legacy code reading rotations doesn't crash
    const dummy = new THREE.Object3D();
    this.leftArmPivot = this.model.parts.shoulderL || dummy;
    this.rightArmPivot = this.model.parts.shoulderR || dummy;
    this.leftLegPivot = this.model.parts.hipL || dummy;
    this.rightLegPivot = this.model.parts.hipR || dummy;
    this.torsoGroup = this.model.parts.torso || dummy;

    this.clock = 0;
    this.currentPose = 'idle';
    this.currentExpression = 'neutral';
    this.currentEyeGlow = 1.0;
    this.currentEnrage = 0.0;
    this.currentOpacity = 1.0;
  }

  /**
   * Updates animations, poses, and facial expressions.
   * @param {number} dt Delta time in seconds
   * @param {object} state { moving, speed, state, actionTime, attackType, enraged, mood, eyeGlow }
   */
  update(dt, state = {}) {
    const delta = dt || 0;
    this.clock += delta;

    let pose = 'idle';
    let t = this.clock;
    let intensity = 1.0;

    const st = state.state || (state.moving ? 'chase' : 'idle');
    const actionTime = state.actionTime !== undefined ? state.actionTime : 0;

    if (st === 'death' || st === 'dead' || st === 'dying') {
      pose = 'death';
      t = actionTime;
      this.setExpression('dead');
    } else if (st === 'hit') {
      pose = 'hit';
      t = actionTime;
      this.setExpression('pain');
    } else if (st === 'stagger') {
      pose = 'stagger';
      t = actionTime;
      this.setExpression('pain');
    } else if (st === 'hesitate') {
      pose = 'hesitate';
      t = this.clock;
      this.setExpression('afraid');
    } else if (st === 'flee') {
      pose = 'flee';
      t = this.clock;
      intensity = 1.2;
      this.setExpression('afraid');
    } else if (st === 'ambushWait') {
      pose = 'ambushWait';
      t = this.clock;
      this.setExpression('snarl');
    } else if (st === 'windup') {
      pose = 'windup';
      t = this.clock;
      this.setExpression('snarl');
    } else if (st === 'attack') {
      const atkType = state.attackType;
      if (this.modelType === 'goblin_archer' || this.modelType === 'orc_archer') {
        pose = 'shoot';
      } else if (this.modelType === 'goblin_shaman') {
        pose = atkType === 'heal' ? 'heal' : 'cast';
      } else if (this.modelType === 'hobgoblin_chief') {
        if (atkType === 'slam') pose = 'slam';
        else if (atkType === 'charge') pose = 'charge';
        else if (atkType === 'throw') pose = 'throw';
        else if (atkType === 'roar') pose = 'roar';
        else pose = 'attack1';
      } else {
        pose = atkType === 'attack2' ? 'attack2' : 'attack1';
      }
      t = actionTime;
      this.setExpression('snarl');
    } else if (st === 'charge') {
      pose = 'charge';
      t = this.clock;
      this.setExpression('snarl');
    } else if (st === 'pounce') {
      pose = 'pounce';
      t = actionTime;
      this.setExpression('snarl');
    } else if (st === 'circle') {
      pose = 'circle';
      t = this.clock;
      this.setExpression('snarl');
    } else if (st === 'howl') {
      pose = 'howl';
      t = actionTime;
      this.setExpression('snarl');
    } else if (st === 'roar') {
      pose = 'roar';
      t = actionTime;
      this.setExpression('snarl');
    } else if (state.moving) {
      const spd = state.speed !== undefined ? state.speed : 1.0;
      if (spd > 0.65) {
        pose = 'run';
        intensity = Math.min(1.4, Math.max(0.6, spd * 1.1));
      } else {
        pose = 'walk';
        intensity = Math.min(1.2, Math.max(0.4, spd));
      }
      t = this.clock;
      this.setExpression(state.mood || 'snarl');
    } else {
      pose = 'idle';
      t = this.clock;
      this.setExpression(state.mood || 'neutral');
    }

    this.model.setPose(pose, t, intensity);
    this.currentPose = pose;

    // Eye glow & enrage
    if (state.enraged !== undefined) {
      const enr = state.enraged ? 1.0 : 0.0;
      if (enr !== this.currentEnrage) {
        this.currentEnrage = enr;
        this.model.setEnrage(enr);
      }
    }
    const glow = state.eyeGlow !== undefined ? state.eyeGlow : (this.currentEnrage > 0 ? 2.0 : 1.0);
    if (glow !== this.currentEyeGlow) {
      this.currentEyeGlow = glow;
      this.model.setEyeGlow(glow);
    }
  }

  setExpression(name = 'neutral') {
    if (name !== this.currentExpression) {
      this.currentExpression = name;
      this.model.setExpression(name);
    }
  }

  setTint(hex, amount = 0) {
    this.model.setTint(hex, amount);
  }

  setOpacity(a) {
    this.currentOpacity = Math.max(0, Math.min(1, a));
    this.model.setOpacity(this.currentOpacity);
  }

  setEnrage(amount = 0) {
    this.currentEnrage = Math.max(0, Math.min(1, amount));
    this.model.setEnrage(this.currentEnrage);
  }

  setOutlineVisible(bool) {
    this.model.setOutlineVisible(Boolean(bool));
  }

  getHeadHeight() {
    if (this.model.anchors && this.model.anchors.head) {
      return this.model.anchors.head.position.y || 1.15;
    }
    return 1.15;
  }

  getHeadWorldPosition(target = new THREE.Vector3()) {
    this.group.updateMatrixWorld(true);
    if (this.model.anchors && this.model.anchors.head) {
      return this.model.anchors.head.getWorldPosition(target);
    }
    return this.group.getWorldPosition(target).add(new THREE.Vector3(0, 1.15, 0));
  }

  getBounds() {
    return this.model.getBounds();
  }

  dispose() {
    this.model.dispose();
  }
}
