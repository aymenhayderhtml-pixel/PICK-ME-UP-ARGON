// src/enemies/poses/bipedPoses.js
// Biped skeletal animation pose evaluator for humanoid and non-humanoid enemies.
import * as THREE from 'three';
import { POSE_INFO } from '../index.js';

  export function applyBipedPose(name, t, intensity, parts, arch, bannerMesh, eyesMesh, resetRigToRest) {
    const info = POSE_INFO[name] || POSE_INFO.idle;
    const time = info.loop ? t : Math.max(0, Math.min(info.duration, t));
    const u = info.duration > 0 ? time / info.duration : 0;
    const k = Math.max(0, Math.min(1.5, intensity));

    resetRigToRest();

    if (bannerMesh) {
      const pos = bannerMesh.geometry.attributes.position;
      const base = bannerMesh.userData.baseZ;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const wave = Math.sin(t * 7.5 + y * 9.0) * (-y * 0.15);
        pos.setZ(i, base[i * 3 + 2] + wave);
      }
      pos.needsUpdate = true;
    }

    if (arch.isNonHumanoid) {
      const bounce = Math.sin(t * 5) * 0.08 * k;
      parts.hips.position.y += bounce;
      if (name === 'attack1' || name === 'slam') {
        parts.torso.position.z = Math.sin(u * Math.PI) * 0.45 * k;
      } else if (name === 'death') {
        parts.torso.scale.set(1 + u * 0.35, Math.max(0.15, 1 - u * 0.75), 1 + u * 0.35);
      }
      return;
    }

    if (arch.isQuadruped) {
      const p = parts;
      if (name === 'death') {
        const fall = Math.min(1, u * 1.35);
        const ease = fall * fall * (3 - 2 * fall);
        p.hips.position.y = THREE.MathUtils.lerp(p.hips.userData.restPos.y, 0.22, ease);
        p.chest.position.y = THREE.MathUtils.lerp(p.chest.userData.restPos.y, 0.22, ease);
        p.root.rotation.z = ease * 1.52;
        p.head.rotation.x = ease * 0.2;
      } else if (name === 'walk' || name === 'run' || name === 'flee' || name === 'charge' || name === 'pounce' || name === 'attack1') {
        const isFast = name === 'run' || name === 'charge' || name === 'pounce';
        const freq = isFast ? 12 : 7;
        const ph = t * freq;
        const stride = (isFast ? 0.75 : 0.45) * k;
        p.shoulderFL.rotation.x = Math.sin(ph) * stride;
        p.shoulderFR.rotation.x = -Math.sin(ph) * stride;
        p.hipBL.rotation.x = -Math.sin(ph) * stride;
        p.hipBR.rotation.x = Math.sin(ph) * stride;
        p.torso.rotation.x = Math.sin(ph * 2) * 0.08 * k;
        p.tail1.rotation.y = Math.sin(ph) * 0.25;
        p.tail1.rotation.x = -0.3;
        p.hips.position.y = p.hips.userData.restPos.y + Math.abs(Math.sin(ph)) * 0.06 * k;
      } else {
        const w = t * 3.0;
        p.chest.position.y = p.chest.userData.restPos.y + Math.sin(w) * 0.02 * k;
        p.head.rotation.x = Math.sin(w) * 0.04 * k;
        p.tail1.rotation.y = Math.sin(t * 4.0) * 0.3 * k;
        p.tail1.rotation.x = -0.3 + Math.sin(w) * 0.05;
        p.earL.rotation.z = Math.sin(t * 5.0) * 0.1 * k;
        p.earR.rotation.z = -Math.sin(t * 5.0 + 1) * 0.1 * k;
      }
      return;
    }

    const p = parts;
    const isHeavy = arch.isBoss;

    switch (name) {
      case 'idle': {
        const w = t * (isHeavy ? 2.4 : 3.6);
        p.hips.position.y += Math.sin(w) * 0.025 * k;
        p.torso.rotation.x += Math.sin(w) * 0.045 * k;
        p.jaw.rotation.x += (0.12 + Math.sin(w * 0.8) * 0.08) * k;
        p.shoulderL.rotation.x += Math.sin(w + 1) * 0.08 * k;
        p.shoulderR.rotation.x -= Math.sin(w + 1) * 0.08 * k;
        break;
      }
      case 'walk':
      case 'run': {
        const isRun = name === 'run';
        const freq = (isRun ? 10.5 : 6.8) * (isHeavy ? 0.72 : 1.0);
        const ph = t * freq;
        const stride = (isRun ? 0.95 : 0.55) * k;

        p.hipL.rotation.x += Math.sin(ph) * stride;
        p.hipR.rotation.x -= Math.sin(ph) * stride;
        p.kneeL.rotation.x += Math.max(0, -Math.cos(ph) * stride * 0.75);
        p.kneeR.rotation.x += Math.max(0, Math.cos(ph) * stride * 0.75);

        const bounce = isHeavy
          ? -Math.pow(Math.abs(Math.sin(ph)), 3) * 0.09
          : Math.abs(Math.sin(ph)) * (isRun ? 0.08 : 0.035);
        p.hips.position.y += bounce * k;

        // Deep forward sprint hunch with long arm swings
        p.torso.rotation.x += (isRun ? 0.28 : 0.06) * k;
        p.head.rotation.x -= (isRun ? 0.26 : 0.05) * k;
        p.jaw.rotation.x += (isRun ? 0.35 : 0.15) * k;
        p.shoulderL.rotation.x += -Math.sin(ph) * stride * (isRun ? 1.25 : 0.85);
        p.shoulderR.rotation.x += Math.sin(ph) * stride * (isRun ? 1.25 : 0.85);
        break;
      }
      case 'attack1': {
        // Wild overhand slash (goblin) or heavy horizontal sweep (chief)
        const swing = u < 0.32 ? -u / 0.32 : (u - 0.32) / 0.68;
        const arc = Math.sin(Math.min(1, Math.max(0, (u - 0.2) / 0.5)) * Math.PI);
        if (isHeavy) {
          p.torso.rotation.y = THREE.MathUtils.lerp(-0.75, 0.95, Math.min(1, u * 1.5)) * k;
          p.shoulderR.rotation.z = -0.85 * k;
          p.shoulderR.rotation.y = THREE.MathUtils.lerp(-0.9, 1.2, Math.min(1, u * 1.4)) * k;
        } else {
          p.shoulderR.rotation.x += (swing < 0 ? swing * 2.4 : -2.4 + swing * 3.9) * k;
          p.elbowR.rotation.x += swing < 0 ? -0.4 : 0.3;
          p.torso.rotation.x += arc * 0.42 * k;
          p.torso.rotation.y = -arc * 0.45 * k;
          p.hips.position.z = arc * 0.14 * k;
        }
        p.jaw.rotation.x += arc * 0.65 * k;
        break;
      }
      case 'attack2': {
        // Aggressive cross slash
        const arc = Math.sin(u * Math.PI);
        p.torso.rotation.y = Math.sin(u * Math.PI * 2) * 0.68 * k;
        p.shoulderL.rotation.x += (-1.7 + u * 3.1) * k;
        p.shoulderL.rotation.z = (0.7 - u * 1.5) * k;
        p.shoulderR.rotation.x += (-1.2 + arc * 1.9) * k;
        p.shoulderR.rotation.z = (-0.6 + u * 1.2) * k;
        p.jaw.rotation.x += arc * 0.55 * k;
        break;
      }
      case 'windup': {
        const pulse = 0.85 + Math.sin(t * 9) * 0.15;
        p.torso.rotation.x -= 0.28 * k;
        p.shoulderR.rotation.x -= 2.25 * pulse * k;
        p.jaw.rotation.x += 0.45 * k;
        break;
      }
      case 'slam': {
        let armX = 0;
        let torsoX = 0;
        if (u < 0.55) {
          const r = Math.min(1, u / 0.4);
          armX = -2.5 * r;
          torsoX = -0.38 * r;
        } else if (u < 0.78) {
          const s = (u - 0.55) / 0.23;
          armX = THREE.MathUtils.lerp(-2.5, 1.25, s);
          torsoX = THREE.MathUtils.lerp(-0.38, 0.58, s);
          p.hips.position.y -= s * 0.22 * k;
        } else {
          const rec = (u - 0.78) / 0.22;
          armX = THREE.MathUtils.lerp(1.25, 0, rec);
          torsoX = THREE.MathUtils.lerp(0.58, 0, rec);
        }
        p.shoulderR.rotation.x += armX * k;
        p.shoulderL.rotation.x += armX * 0.8 * k;
        p.torso.rotation.x += torsoX * k;
        p.jaw.rotation.x += 0.55 * k;
        break;
      }
      case 'charge': {
        const ph = t * 11.5;
        p.torso.rotation.x += 0.35 * k;
        p.head.rotation.x -= 0.30 * k;
        p.shoulderL.rotation.x += 0.85 * k;
        p.shoulderR.rotation.x += 0.85 * k;
        p.hipL.rotation.x += Math.sin(ph) * 0.9 * k;
        p.hipR.rotation.x -= Math.sin(ph) * 0.9 * k;
        p.hips.position.y += Math.abs(Math.sin(ph)) * 0.08 * k;
        break;
      }
      case 'shoot': {
        const draw = u < 0.7 ? u / 0.7 : Math.max(0, 1 - (u - 0.7) / 0.12);
        p.torso.rotation.y = -0.55 * k;
        p.head.rotation.y = 0.5 * k;
        p.shoulderL.rotation.x = -1.25 * k;
        p.shoulderL.rotation.y = 0.45 * k;
        p.shoulderR.rotation.x = -1.25 * k;
        p.elbowR.rotation.y = -draw * 1.15 * k;
        if (bowStringMesh) bowStringMesh.position.z = -0.05 - draw * 0.14;
        break;
      }
      case 'cast': {
        const flare = Math.sin(u * Math.PI);
        p.shoulderR.rotation.x -= 2.1 * flare * k;
        p.shoulderL.rotation.x -= 1.2 * flare * k;
        p.torso.rotation.x -= 0.22 * flare * k;
        if (orbMat) orbMat.emissiveIntensity = 1.6 + flare * 3.5;
        break;
      }
      case 'heal': {
        const flare = Math.sin(u * Math.PI);
        p.shoulderL.rotation.z += 1.25 * flare * k;
        p.shoulderR.rotation.z -= 1.25 * flare * k;
        if (healRingMesh) {
          healRingMesh.visible = true;
          const sc = 0.2 + u * 3.2;
          healRingMesh.scale.set(sc, 1, sc);
        }
        break;
      }
      case 'roar': {
        const open = Math.sin(u * Math.PI);
        p.torso.rotation.x -= 0.48 * open * k;
        p.head.rotation.x -= 0.42 * open * k;
        p.jaw.rotation.x += 0.85 * open * k;
        p.shoulderL.rotation.z += 1.05 * open * k;
        p.shoulderR.rotation.z -= 1.05 * open * k;
        p.shoulderL.rotation.x -= 0.45 * open * k;
        p.shoulderR.rotation.x -= 0.45 * open * k;
        break;
      }
      case 'throw': {
        const spin = u < 0.45 ? -u * 3.2 : -1.44 + (u - 0.45) * 5.2;
        p.torso.rotation.y = spin * 0.65 * k;
        p.shoulderR.rotation.x += (-1.8 + u * 3.1) * k;
        break;
      }
      case 'hit': {
        const snap = Math.sin(u * Math.PI);
        p.torso.rotation.x -= 0.45 * snap * k;
        p.head.rotation.x -= 0.5 * snap * k;
        p.jaw.rotation.x += 0.45 * snap * k;
        break;
      }
      case 'stagger': {
        const w = Math.sin(u * Math.PI * 2);
        p.hips.position.z = -Math.sin(u * Math.PI) * 0.20 * k;
        p.torso.rotation.z = w * 0.30 * k;
        p.torso.rotation.x -= Math.sin(u * Math.PI) * 0.28 * k;
        break;
      }
      case 'flee': {
        // Panicked sprint looking back over shoulder with flailing raised arms
        const ph = t * 11.5;
        p.hipL.rotation.x += Math.sin(ph) * 0.9 * k;
        p.hipR.rotation.x -= Math.sin(ph) * 0.9 * k;
        p.shoulderL.rotation.x = -2.2 + Math.sin(ph) * 0.45;
        p.shoulderR.rotation.x = -2.2 - Math.sin(ph) * 0.45;
        p.torso.rotation.y = 0.38 * k;
        p.head.rotation.y = ( 1.15 + Math.sin(t * 6.0) * 0.25 ) * k;
        p.jaw.rotation.x += 0.55;
        break;
      }
      case 'hesitate': {
        const w = Math.sin(t * 4.5);
        p.hips.position.z = -0.10 * k;
        p.torso.rotation.x += 0.15 * k;
        p.head.rotation.y = w * 0.28 * k;
        p.shoulderR.rotation.x += 0.35 * k;
        break;
      }
      case 'spawn': {
        const rise = 1 - Math.pow(1 - u, 2);
        p.hips.position.y *= rise;
        p.torso.rotation.x += (1 - rise) * 0.85;
        break;
      }
      case 'death': {
        // Collapse onto side and end lying flat on ground
        const fall = Math.min(1, u * 1.35);
        const ease = fall * fall * (3 - 2 * fall);
        p.hips.position.y = THREE.MathUtils.lerp(p.hips.userData.restPos.y, arch.torsoWTop * 0.62, ease);
        p.hips.position.x = ease * arch.height * 0.18;
        p.hips.rotation.z = ease * 1.52;
        p.torso.rotation.x = THREE.MathUtils.lerp(p.torso.userData.restRot.x, 0.12, ease);
        p.hipL.rotation.x = THREE.MathUtils.lerp(p.hipL.userData.restRot.x, -0.15, ease);
        p.hipR.rotation.x = THREE.MathUtils.lerp(p.hipR.userData.restRot.x, 0.25, ease);
        p.kneeL.rotation.x = THREE.MathUtils.lerp(p.kneeL.userData.restRot.x, 0.35, ease);
        p.kneeR.rotation.x = THREE.MathUtils.lerp(p.kneeR.userData.restRot.x, 0.55, ease);
        p.shoulderL.rotation.z = ease * 0.85;
        p.shoulderR.rotation.z = -ease * 0.55;
        p.jaw.rotation.x += ease * 0.5;
        break;
      }
      case 'ambushWait': {
        // Crouched very low & still with tongue hanging out
        const w = Math.sin(t * 2.4);
        p.hips.position.y *= 0.48;
        p.hipL.rotation.x = -0.95;
        p.hipR.rotation.x = -0.95;
        p.kneeL.rotation.x = 1.65;
        p.kneeR.rotation.x = 1.65;
        p.torso.rotation.x += 0.32;
        p.head.rotation.x -= 0.48;
        p.head.rotation.y = w * 0.22;
        p.jaw.rotation.x += 0.48;
        if (tongueMesh) {
          tongueMesh.scale.set(1.15, 1.45, 1.15);
          tongueMesh.rotation.z = Math.sin(t * 4.5) * 0.28;
        }
        break;
      }
    }

    applyExpressionOffsets(t);
  }