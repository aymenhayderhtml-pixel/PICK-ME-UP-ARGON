// src/art/IselleRig.js
import * as THREE from 'three';
import { createIselleModel, ISELLE_POSES, ISELLE_EXPRESSIONS, POSE_INFO } from './iselle.js';
import { pickLine } from '../data/iselle.js';
import { showIselleBubble, updateIselleBubbles, clearIselleBubbles } from '../ui/IselleBubble.js';

const POSE_FALLBACKS = {
  idle: 'idle',
  float: 'float',
  walk: 'walk',
  fly: 'fly',
  cast: 'cast',
  hit: 'hit',
  ko: 'ko',
  victory: 'victory',
  cheerful: 'victory',
  announce: 'victory',
  smug: 'idle',
  giggle: 'idle',
  scold: 'walk',
  bow: 'idle',
  punish: 'cast',
  summon: 'cast',
  explain: 'float',
  sad: 'hit',
  surprised: 'hit',
};

const EXPR_FALLBACKS = {
  neutral: 'neutral',
  smile: 'smile',
  surprised: 'surprised',
  angry: 'angry',
  sad: 'sad',
  blink: 'blink',
  wink: 'wink',
  sweet_cruel: 'smile',
  cheerful: 'smile',
  smug: 'wink',
  stern: 'angry',
  bored: 'neutral',
};

const CATEGORY_MAP = {
  greetings:     { pose: 'cheerful', expr: 'cheerful' },
  summonGood:    { pose: 'announce', expr: 'sweet_cruel' },
  summonBad:     { pose: 'smug',     expr: 'smug' },
  synthesisStart:{ pose: 'announce', expr: 'sweet_cruel' },
  promotionDone: { pose: 'cheerful', expr: 'cheerful' },
  floorClear:    { pose: 'announce', expr: 'cheerful' },
  heroDied:      { pose: 'sad',      expr: 'sweet_cruel' },
  mandatoryQuest:{ pose: 'scold',    expr: 'stern' },
  idleTeasing:   { pose: 'giggle',   expr: 'sweet_cruel' },
  punish:        { pose: 'scold',    expr: 'stern' },
};

export class IselleRig {
  constructor(scene) {
    this.scene = scene;
    this.model = createIselleModel({ scale: 1.0, outline: true });
    this.group = this.model.group || this.model.root;
    this.mesh = this.group; // Backwards compatibility alias
    this.group.name = 'IselleNPC';

    // Rig hook for camera fading
    this.group.userData.heroRig = this;
    this.group._heroRig = this;

    // Base state
    this.baseLoopPose = 'float';
    this.currentPose = 'float';
    this.currentExpression = 'smile';
    this.oneShotPose = null;
    this.oneShotTimer = 0;
    this.oneShotDuration = 0;
    this.oneShotChain = null;

    // Movement & Idle state
    this.overrideTarget = null;
    this.targetPosition = null;
    this.moveSpeed = 1.2;
    this.followTarget = null;
    this.followOffset = new THREE.Vector3(0, 2.4, 0);

    // Idle loop orbit state (radius 8, speed 1.2)
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.orbitRadius = 8.0;
    this.orbitCenter = new THREE.Vector3(0, 0, 4); // Between Altar (0,0) and Town Square (0,10)
    this.lastPlayerTease = -999;
    this.playerHoverTimer = 0;
    this.isHoveringNearPlayer = false;
    this.lastReactionTime = -999;

    // Initial position
    this.group.position.set(0, 2.4, 4);
    this.scene.add(this.group);

    // Ground shadow blob
    this.setupShadowBlob();

    // Cache mesh count for debug HUD
    this.meshCount = 0;
    this.group.traverse((c) => {
      if (c.isMesh) this.meshCount++;
    });

    window.__iselleRig = this;
  }

  setupShadowBlob() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(10, 6, 16, 0.85)');
    grad.addColorStop(0.55, 'rgba(10, 6, 16, 0.45)');
    grad.addColorStop(1, 'rgba(10, 6, 16, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(1.3, 1.3);
    geo.rotateX(-Math.PI * 0.5);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    this.shadow = new THREE.Mesh(geo, mat);
    this.shadow.name = 'IselleShadowBlob';
    this.scene.add(this.shadow);
  }

  mapPose(poseName) {
    if (ISELLE_POSES.includes(poseName)) return poseName;
    return POSE_FALLBACKS[poseName] || 'float';
  }

  mapExpression(exprName) {
    if (ISELLE_EXPRESSIONS.includes(exprName)) return exprName;
    return EXPR_FALLBACKS[exprName] || 'smile';
  }

  setPose(name) {
    const isLoop = ['idle', 'float', 'walk', 'fly', 'cheerful', 'giggle', 'smug', 'scold', 'dismissive', 'summon', 'sad'].includes(name);
    if (isLoop) {
      this.baseLoopPose = name;
      this.oneShotPose = null;
      this.currentPose = name;
      this.model.setPose(this.mapPose(name));
    } else {
      this.oneShotPose = name;
      this.currentPose = name;
      this.oneShotTimer = 0;
      this.oneShotDuration = POSE_INFO[this.mapPose(name)]?.duration || 1.2;
      this.model.setPose(this.mapPose(name), 0);
    }
  }

  setExpression(name) {
    this.currentExpression = name;
    this.model.setExpression(this.mapExpression(name));
  }

  playOnce(pose, expression = null) {
    if (expression) this.setExpression(expression);
    this.setPose(pose);
  }

  say(category, opts = {}) {
    const now = performance.now() * 0.001;
    // 8-second reaction cooldown unless forced or punishment/tutorial
    if (!opts.force && category !== 'punish' && (now - this.lastReactionTime < 8.0)) {
      return;
    }
    this.lastReactionTime = now;

    const line = opts.text || pickLine(category);
    let map = CATEGORY_MAP[category] || { pose: 'explain', expr: 'sweet_cruel' };
    if (category === 'idleTeasing') {
      const p = Math.random() < 0.5 ? 'giggle' : 'smug';
      map = { pose: p, expr: 'sweet_cruel' };
    }

    if (category === 'heroDied') {
      this.setExpression('sweet_cruel');
      this.playOnce('sad');
      this.oneShotChain = { pose: 'bow', expr: 'sweet_cruel', duration: 1.0 };
    } else {
      this.setExpression(map.expr);
      this.playOnce(map.pose);
    }

    showIselleBubble(this, line, this.currentExpression, opts.duration);
  }

  moveTo(position, speed = 1.2) {
    this.targetPosition = position.clone();
    this.moveSpeed = speed;
  }

  follow(target, offset = new THREE.Vector3(0, 2.4, 0)) {
    this.followTarget = target;
    this.followOffset = offset.clone();
  }

  getMouthWorldPosition() {
    const v = new THREE.Vector3();
    const anchor = this.model.anchors?.mouth || this.model.anchors?.head;
    if (anchor) anchor.getWorldPosition(v);
    else v.copy(this.group.position).add(new THREE.Vector3(0, 0.25, 0));
    return v;
  }

  getHeadWorldPosition() {
    const v = new THREE.Vector3();
    const anchor = this.model.anchors?.head;
    if (anchor) anchor.getWorldPosition(v);
    else v.copy(this.group.position).add(new THREE.Vector3(0, 0.35, 0));
    return v;
  }

  setVisible(bool) {
    this.group.visible = bool;
    if (this.shadow) this.shadow.visible = bool;
  }

  setOpacity(a) {
    this.model.setOpacity(a);
    if (this.shadow) {
      this.shadow.material.opacity = 0.18 * Math.max(0, Math.min(1, a));
    }
  }

  update(delta, time = 0, playerPos = null, getGroundY = null, camera = null) {
    const now = performance.now() * 0.001;

    // 1. Distance check to camera: hide and pause 3D model if > 60 units, keep bubbles
    if (camera) {
      const distToCam = this.group.position.distanceTo(camera.position);
      if (distToCam > 60.0) {
        this.setVisible(false);
        updateIselleBubbles(camera);
        return;
      }
      this.setVisible(true);
    }

    // 2. Advance pose clock / one-shot poses
    if (this.oneShotPose) {
      this.oneShotTimer += delta;
      const mapped = this.mapPose(this.oneShotPose);
      this.model.setPose(mapped, this.oneShotTimer);

      if (this.oneShotTimer >= this.oneShotDuration) {
        if (this.oneShotChain) {
          const next = this.oneShotChain;
          this.oneShotChain = null;
          this.oneShotPose = next.pose;
          this.oneShotTimer = 0;
          this.oneShotDuration = next.duration || 1.0;
          if (next.expr) this.setExpression(next.expr);
          this.model.setPose(this.mapPose(next.pose), 0);
        } else {
          this.oneShotPose = null;
          this.currentPose = this.baseLoopPose;
          this.model.setPose(this.mapPose(this.baseLoopPose));
        }
      }
    } else {
      this.model.setPose(this.mapPose(this.baseLoopPose));
    }

    this.model.update(delta);

    // 3. Movement logic
    let targetX = this.group.position.x;
    let targetZ = this.group.position.z;
    let targetY = 2.4;
    let isMoving = false;

    if (this.overrideTarget) {
      targetX = this.overrideTarget.x;
      targetY = this.overrideTarget.y;
      targetZ = this.overrideTarget.z;
      isMoving = true;
    } else if (this.targetPosition) {
      targetX = this.targetPosition.x;
      targetZ = this.targetPosition.z;
      const dist = Math.hypot(targetX - this.group.position.x, targetZ - this.group.position.z);
      if (dist > 0.1) {
        isMoving = true;
      } else {
        this.targetPosition = null;
      }
    } else if (this.followTarget) {
      const fp = this.followTarget.position || this.followTarget;
      targetX = fp.x + this.followOffset.x;
      targetZ = fp.z + this.followOffset.z;
      targetY = (fp.y || 0) + this.followOffset.y;
      isMoving = Math.hypot(targetX - this.group.position.x, targetZ - this.group.position.z) > 0.2;
    } else {
      // Idle Loop & Player Interactivity
      const pDist = playerPos ? Math.hypot(playerPos.x - this.group.position.x, playerPos.z - this.group.position.z) : 100;

      if (this.isHoveringNearPlayer) {
        this.playerHoverTimer += delta;
        if (playerPos) {
          // Hover 3 units in front of player
          const pAngle = playerPos.rotation?.y || 0;
          targetX = playerPos.x + Math.sin(pAngle) * 3.0;
          targetZ = playerPos.z + Math.cos(pAngle) * 3.0;
          const gy = getGroundY ? getGroundY(targetX, targetZ) : (playerPos.y || 0);
          targetY = gy + 2.4;
        }
        if (this.playerHoverTimer >= 4.0) {
          this.isHoveringNearPlayer = false;
        }
      } else {
        // Player approaching within 10 units check (at most once every 90 seconds)
        if (pDist < 10.0 && (now - this.lastPlayerTease >= 90.0) && playerPos) {
          this.isHoveringNearPlayer = true;
          this.playerHoverTimer = 0;
          this.lastPlayerTease = now;
          this.say('idleTeasing');
        } else {
          // Drifts slowly around the Summoning Room & Town Square in wide loop (radius 8, speed 1.2)
          this.orbitAngle += (1.2 / this.orbitRadius) * delta;
          targetX = this.orbitCenter.x + Math.cos(this.orbitAngle) * this.orbitRadius;
          targetZ = this.orbitCenter.z + Math.sin(this.orbitAngle) * (this.orbitRadius * 0.7);
          const gy = getGroundY ? getGroundY(targetX, targetZ) : 0;
          targetY = gy + 2.4 + Math.sin(this.orbitAngle * 2.0) * 0.18;
          isMoving = true;
        }
      }
    }

    // Move smoothly
    const prevX = this.group.position.x;
    const prevZ = this.group.position.z;
    const moveRate = Math.min(1.0, 3.2 * delta);
    this.group.position.x += (targetX - this.group.position.x) * moveRate;
    this.group.position.y += (targetY - this.group.position.y) * moveRate;
    this.group.position.z += (targetZ - this.group.position.z) * moveRate;

    // Minimum ground elevation clearance (2.4 units)
    if (getGroundY) {
      const minGy = getGroundY(this.group.position.x, this.group.position.z) + 2.2;
      if (this.group.position.y < minGy) {
        this.group.position.y = minGy;
      }
    }

    // Orient yaw smoothly
    const vx = this.group.position.x - prevX;
    const vz = this.group.position.z - prevZ;
    const actualSpeed = Math.hypot(vx, vz) / Math.max(0.001, delta);

    if (actualSpeed > 0.3) {
      if (!this.oneShotPose) this.setPose('fly');
      const targetYaw = Math.atan2(vx, vz);
      // Shortest angle rotation
      let diff = targetYaw - this.group.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.group.rotation.y += diff * Math.min(1, 7.0 * delta);
    } else {
      if (!this.oneShotPose) this.setPose('float');
      if (this.isHoveringNearPlayer && playerPos) {
        const toPlayerX = playerPos.x - this.group.position.x;
        const toPlayerZ = playerPos.z - this.group.position.z;
        const faceYaw = Math.atan2(toPlayerX, toPlayerZ);
        let diff = faceYaw - this.group.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.group.rotation.y += diff * Math.min(1, 6.0 * delta);
      }
    }

    // 4. Update ground shadow blob
    if (this.shadow) {
      const gy = getGroundY ? getGroundY(this.group.position.x, this.group.position.z) : 0;
      this.shadow.position.set(this.group.position.x, gy + 0.04, this.group.position.z);
      const h = Math.max(0.6, this.group.position.y - gy);
      const s = Math.max(0.5, Math.min(1.4, 2.2 / h));
      this.shadow.scale.set(s, 1, s);
    }

    // 5. Update bubble positioning
    if (camera) {
      updateIselleBubbles(camera);
    }
  }

  dispose() {
    clearIselleBubbles();
    if (this.group && this.group.parentNode) {
      this.group.parentNode.remove(this.group);
    }
    this.scene.remove(this.group);
    if (this.shadow) {
      this.scene.remove(this.shadow);
      this.shadow.geometry.dispose();
      this.shadow.material.dispose();
      if (this.shadow.material.map) this.shadow.material.map.dispose();
    }
    this.model.dispose();
    if (window.__iselleRig === this) {
      window.__iselleRig = null;
    }
  }
}
