// src/enemies/poses/wolfPoses.js
// Quadruped skeletal animation poses for wolf enemies.
import * as THREE from 'three';
import { POSE_INFO } from './poseInfo.js';

export function applyPrairieWolfPose(parts, poseName, t, intensity = 1, modelState = null) {
  const info = POSE_INFO[poseName] || POSE_INFO.idle;
  const dur = info.duration || 1.0;
  const rawPhase = t / dur;
  const u = info.loop ? ((rawPhase % 1) + 1) % 1 : Math.max(0, Math.min(1, rawPhase));
  const tau = u * Math.PI * 2;
  const k = Math.max(0, Math.min(1.5, intensity));

  const shoulderH = (modelState && modelState.shoulderH) || 0.95;
  const bodyL = (modelState && modelState.bodyL) || 1.7;
  const hipH = shoulderH * 0.92;
  const baseHipsY = hipH;
  const baseHipsZ = -bodyL * 0.35;

  const jointNames = [
    'hips', 'torso', 'chest', 'neck', 'head', 'jaw',
    'earL', 'earR', 'tail1', 'tail2', 'tail3',
    'shoulderFL', 'shoulderFR', 'elbowFL', 'elbowFR', 'pawFL', 'pawFR',
    'hipBL', 'hipBR', 'kneeBL', 'kneeBR', 'pawBL', 'pawBR',
  ];
  for (let i = 0; i < jointNames.length; i++) {
    const j = parts[jointNames[i]];
    if (j) {
      j.rotation.set(0, 0, 0);
    }
  }

  parts.hips.position.set(0, baseHipsY, baseHipsZ);
  parts.torso.position.set(0, 0, bodyL * 0.35);
  parts.chest.position.set(0, shoulderH * 0.08, bodyL * 0.35);
  parts.neck.position.set(0, shoulderH * 0.15, 0.22);
  parts.head.position.set(0, 0.12, 0.25);

  parts.jaw.rotation.x = 0.08;
  parts.earL.rotation.set(0.08, 0, -0.15);
  parts.earR.rotation.set(0.08, 0, 0.15);
  parts.tail1.rotation.x = -0.18;
  parts.tail2.rotation.x = 0.12;
  parts.tail3.rotation.x = 0.16;

  function stepLegF(shoulder, elbow, paw, phase) {
    const a = phase * Math.PI * 2;
    const swing = Math.sin(a);
    const lift = Math.max(0, Math.cos(a));
    shoulder.rotation.x = -swing * 0.44 * k;
    elbow.rotation.x = (lift * 0.65 + 0.08) * k;
    paw.rotation.x = (-lift * 0.35 + swing * 0.15) * k;
  }

  function stepLegB(hip, knee, paw, phase) {
    const a = phase * Math.PI * 2;
    const swing = Math.sin(a);
    const lift = Math.max(0, Math.cos(a));
    hip.rotation.x = -swing * 0.48 * k;
    knee.rotation.x = (-lift * 0.58 - 0.06) * k;
    paw.rotation.x = (lift * 0.38 + swing * 0.14) * k;
  }

  switch (poseName) {
    case 'idle': {
      const breath = Math.sin(tau);
      parts.hips.position.y = baseHipsY + breath * 0.012 * k;
      parts.torso.rotation.x = breath * 0.025 * k;
      parts.chest.rotation.x = -breath * 0.03 * k;
      parts.neck.rotation.x = 0.06 + breath * 0.03 * k;
      parts.head.rotation.x = -0.04 - breath * 0.02 * k;
      parts.head.rotation.y = Math.sin(tau * 0.5) * 0.06 * k;
      parts.jaw.rotation.x = (0.09 + (breath * 0.5 + 0.5) * 0.05) * k;

      const twitch = Math.pow(Math.max(0, Math.sin(tau * 2.0 + 0.8)), 8);
      parts.earL.rotation.z = -0.15 - twitch * 0.32 * k;
      parts.earR.rotation.z = 0.15 + Math.pow(Math.max(0, Math.sin(tau * 1.0 - 0.5)), 10) * 0.25 * k;

      const swish = Math.sin(tau);
      parts.tail1.rotation.y = swish * 0.16 * k;
      parts.tail2.rotation.y = Math.sin(tau - 0.6) * 0.22 * k;
      parts.tail3.rotation.y = Math.sin(tau - 1.2) * 0.26 * k;
      break;
    }

    case 'walk': {
      stepLegF(parts.shoulderFL, parts.elbowFL, parts.pawFL, u);
      stepLegB(parts.hipBR, parts.kneeBR, parts.pawBR, (u + 0.25) % 1);
      stepLegF(parts.shoulderFR, parts.elbowFR, parts.pawFR, (u + 0.5) % 1);
      stepLegB(parts.hipBL, parts.kneeBL, parts.pawBL, (u + 0.75) % 1);

      const bob = Math.sin(tau * 2);
      parts.hips.position.y = baseHipsY + Math.abs(bob) * 0.028 * k;
      parts.hips.rotation.y = Math.sin(tau) * 0.05 * k;
      parts.torso.rotation.y = -Math.sin(tau) * 0.06 * k;
      parts.chest.rotation.x = bob * 0.03 * k;
      parts.neck.rotation.x = 0.12 - bob * 0.04 * k;
      parts.head.rotation.x = -0.08 + bob * 0.03 * k;
      parts.jaw.rotation.x = 0.12 * k;

      parts.tail1.rotation.x = -0.12 + bob * 0.06 * k;
      parts.tail1.rotation.y = Math.sin(tau) * 0.18 * k;
      parts.tail2.rotation.y = Math.sin(tau - 0.5) * 0.22 * k;
      parts.tail3.rotation.y = Math.sin(tau - 1.0) * 0.25 * k;
      break;
    }

    case 'run': {
      const spineWave = Math.sin(tau);
      const liftWave = Math.cos(tau);

      parts.hips.position.y = baseHipsY + (0.04 + liftWave * 0.09) * k;
      parts.hips.rotation.x = spineWave * 0.22 * k;
      parts.torso.rotation.x = -spineWave * 0.26 * k;
      parts.chest.rotation.x = -spineWave * 0.18 * k;
      parts.neck.rotation.x = (0.28 + spineWave * 0.14) * k;
      parts.head.rotation.x = (-0.22 - spineWave * 0.10) * k;
      parts.jaw.rotation.x = (0.24 + Math.max(0, spineWave) * 0.12) * k;

      parts.earL.rotation.x = -0.45 * k;
      parts.earR.rotation.x = -0.45 * k;

      const fL = tau;
      const fR = tau + 0.42;
      const bL = tau + Math.PI + 0.15;
      const bR = tau + Math.PI + 0.55;

      parts.shoulderFL.rotation.x = -Math.sin(fL) * 0.78 * k;
      parts.elbowFL.rotation.x = (Math.max(0, Math.cos(fL)) * 0.95 + 0.12) * k;
      parts.pawFL.rotation.x = -Math.cos(fL) * 0.45 * k;

      parts.shoulderFR.rotation.x = -Math.sin(fR) * 0.78 * k;
      parts.elbowFR.rotation.x = (Math.max(0, Math.cos(fR)) * 0.95 + 0.12) * k;
      parts.pawFR.rotation.x = -Math.cos(fR) * 0.45 * k;

      parts.hipBL.rotation.x = -Math.sin(bL) * 0.82 * k;
      parts.kneeBL.rotation.x = (-Math.max(0, Math.cos(bL)) * 0.88 - 0.1) * k;
      parts.pawBL.rotation.x = Math.cos(bL) * 0.48 * k;

      parts.hipBR.rotation.x = -Math.sin(bR) * 0.82 * k;
      parts.kneeBR.rotation.x = (-Math.max(0, Math.cos(bR)) * 0.88 - 0.1) * k;
      parts.pawBR.rotation.x = Math.cos(bR) * 0.48 * k;

      parts.tail1.rotation.x = (0.32 - spineWave * 0.18) * k;
      parts.tail2.rotation.x = (0.18 - liftWave * 0.16) * k;
      parts.tail3.rotation.x = (0.12 - spineWave * 0.14) * k;
      break;
    }

    case 'attack1':
    case 'attack2':
    case 'heavy': {
      if (u < 0.28) {
        const p = u / 0.28;
        parts.hips.position.z = baseHipsZ - p * 0.16 * k;
        parts.hips.position.y = baseHipsY - p * 0.10 * k;
        parts.torso.rotation.x = p * 0.14 * k;
        parts.neck.rotation.x = -p * 0.18 * k;
        parts.head.rotation.z = p * 0.24 * k;
        parts.jaw.rotation.x = (0.15 + p * 0.58) * k;
        parts.shoulderFL.rotation.x = p * 0.35 * k;
        parts.elbowFL.rotation.x = p * 0.45 * k;
        parts.shoulderFR.rotation.x = p * 0.35 * k;
        parts.elbowFR.rotation.x = p * 0.45 * k;
      } else if (u < 0.62) {
        const p = (u - 0.28) / 0.34;
        const snap = Math.sin(p * Math.PI);
        parts.hips.position.z = baseHipsZ + (-0.16 + p * 0.54) * k;
        parts.hips.position.y = baseHipsY + snap * 0.08 * k;
        parts.torso.rotation.x = -0.16 * snap * k;
        parts.chest.rotation.x = 0.18 * snap * k;
        parts.neck.rotation.x = 0.32 * snap * k;
        parts.head.rotation.x = -0.18 * snap * k;
        parts.head.rotation.z = (1 - p * 2) * 0.22 * k;
        parts.jaw.rotation.x = Math.max(0.02, (1 - Math.pow(p, 0.45)) * 0.72) * k;

        parts.shoulderFL.rotation.x = -0.52 * snap * k;
        parts.shoulderFR.rotation.x = -0.38 * snap * k;
        parts.hipBL.rotation.x = 0.48 * snap * k;
        parts.hipBR.rotation.x = 0.48 * snap * k;
      } else {
        const p = 1 - (u - 0.62) / 0.38;
        parts.hips.position.z = baseHipsZ + p * 0.38 * k;
        parts.jaw.rotation.x = (0.08 + p * 0.12) * k;
      }
      parts.earL.rotation.x = -0.55 * k;
      parts.earR.rotation.x = -0.55 * k;
      parts.tail1.rotation.x = 0.28 * k;
      break;
    }

    case 'pounce': {
      const cEnd = 0.25 / 0.9;
      const aEnd = 0.70 / 0.9;

      if (u < cEnd) {
        const p = u / cEnd;
        const ease = p * p * (3 - 2 * p);
        parts.hips.position.y = baseHipsY - ease * 0.28 * k;
        parts.hips.position.z = baseHipsZ - ease * 0.20 * k;
        parts.hips.rotation.x = ease * 0.18 * k;
        parts.torso.rotation.x = ease * 0.14 * k;
        parts.chest.rotation.x = ease * 0.12 * k;
        parts.neck.rotation.x = -ease * 0.28 * k;
        parts.head.rotation.x = -ease * 0.16 * k;
        parts.jaw.rotation.x = (0.12 + ease * 0.36) * k;

        parts.shoulderFL.rotation.x = ease * 0.58 * k;
        parts.elbowFL.rotation.x = ease * 0.92 * k;
        parts.pawFL.rotation.x = -ease * 0.65 * k;
        parts.shoulderFR.rotation.x = ease * 0.58 * k;
        parts.elbowFR.rotation.x = ease * 0.92 * k;
        parts.pawFR.rotation.x = -ease * 0.65 * k;

        parts.hipBL.rotation.x = -ease * 0.52 * k;
        parts.kneeBL.rotation.x = -ease * 0.85 * k;
        parts.pawBL.rotation.x = ease * 0.72 * k;
        parts.hipBR.rotation.x = -ease * 0.52 * k;
        parts.kneeBR.rotation.x = -ease * 0.85 * k;
        parts.pawBR.rotation.x = ease * 0.72 * k;

        parts.earL.rotation.x = -0.65 * k;
        parts.earR.rotation.x = -0.65 * k;
      } else if (u < aEnd) {
        const p = (u - cEnd) / (aEnd - cEnd);
        const arc = Math.sin(p * Math.PI);
        parts.hips.position.y = baseHipsY + (-0.28 * (1 - p) + arc * 0.56) * k;
        parts.hips.position.z = baseHipsZ + (-0.20 + p * 0.72) * k;
        parts.hips.rotation.x = (-0.32 + p * 0.64) * k;
        parts.torso.rotation.x = (-0.22 + p * 0.38) * k;
        parts.chest.rotation.x = -0.14 * arc * k;
        parts.neck.rotation.x = 0.24 * arc * k;
        parts.head.rotation.x = -0.18 * arc * k;
        parts.jaw.rotation.x = (0.35 + arc * 0.42) * k;

        parts.shoulderFL.rotation.x = (-0.92 + p * 0.25) * k;
        parts.elbowFL.rotation.x = 0.22 * k;
        parts.pawFL.rotation.x = 0.32 * k;
        parts.shoulderFR.rotation.x = (-0.86 + p * 0.25) * k;
        parts.elbowFR.rotation.x = 0.22 * k;
        parts.pawFR.rotation.x = 0.32 * k;

        parts.hipBL.rotation.x = (0.78 * arc) * k;
        parts.kneeBL.rotation.x = (-0.25 * arc) * k;
        parts.pawBL.rotation.x = (-0.55 * arc) * k;
        parts.hipBR.rotation.x = (0.78 * arc) * k;
        parts.kneeBR.rotation.x = (-0.25 * arc) * k;
        parts.pawBR.rotation.x = (-0.55 * arc) * k;

        parts.tail1.rotation.x = 0.38 * k;
        parts.tail2.rotation.x = 0.18 * k;
      } else {
        const p = (u - aEnd) / (1.0 - aEnd);
        const dip = Math.sin(p * Math.PI);
        parts.hips.position.y = baseHipsY - dip * 0.16 * k;
        parts.hips.position.z = baseHipsZ + (1 - p) * 0.52 * k;
        parts.hips.rotation.x = (1 - p) * 0.16 * k;
        parts.torso.rotation.x = dip * 0.18 * k;
        parts.jaw.rotation.x = (0.1 + (1 - p) * 0.25) * k;

        parts.shoulderFL.rotation.x = dip * 0.42 * k;
        parts.elbowFL.rotation.x = dip * 0.68 * k;
        parts.shoulderFR.rotation.x = dip * 0.42 * k;
        parts.elbowFR.rotation.x = dip * 0.68 * k;
      }
      break;
    }

    case 'windup': {
      const tremor = Math.sin(tau * 6) * 0.012;
      const pulse = Math.sin(tau);
      parts.hips.position.y = baseHipsY - (0.22 + pulse * 0.02) * k;
      parts.hips.position.z = baseHipsZ - 0.16 * k;
      parts.hips.position.x = tremor * k;
      parts.hips.rotation.x = 0.12 * k;
      parts.torso.rotation.x = 0.16 * k;
      parts.chest.rotation.x = 0.12 * k;
      parts.neck.rotation.x = -0.26 * k;
      parts.head.rotation.x = -0.14 * k;
      parts.jaw.rotation.x = (0.36 + Math.sin(tau * 3) * 0.08) * k;

      parts.earL.rotation.x = -0.68 * k;
      parts.earR.rotation.x = -0.68 * k;

      parts.shoulderFL.rotation.x = 0.48 * k;
      parts.elbowFL.rotation.x = 0.82 * k;
      parts.pawFL.rotation.x = -0.52 * k;
      parts.shoulderFR.rotation.x = 0.48 * k;
      parts.elbowFR.rotation.x = 0.82 * k;
      parts.pawFR.rotation.x = -0.52 * k;

      parts.hipBL.rotation.x = -0.44 * k;
      parts.kneeBL.rotation.x = -0.74 * k;
      parts.pawBL.rotation.x = 0.58 * k;
      parts.hipBR.rotation.x = -0.44 * k;
      parts.kneeBR.rotation.x = -0.74 * k;
      parts.pawBR.rotation.x = 0.58 * k;

      parts.tail1.rotation.x = 0.25 * k;
      parts.tail2.rotation.y = Math.sin(tau * 2) * 0.24 * k;
      break;
    }

    case 'circle': {
      parts.hips.position.y = baseHipsY - 0.11 * k;
      parts.hips.position.x = Math.sin(tau) * 0.06 * k;
      parts.hips.rotation.y = 0.22 * k;
      parts.torso.rotation.x = 0.10 * k;
      parts.chest.rotation.x = 0.08 * k;
      parts.neck.rotation.x = 0.22 * k;
      parts.neck.rotation.y = -0.12 * k;
      parts.head.rotation.x = -0.34 * k;
      parts.head.rotation.y = -0.10 * k;
      parts.jaw.rotation.x = 0.22 * k;

      stepLegF(parts.shoulderFL, parts.elbowFL, parts.pawFL, u);
      stepLegB(parts.hipBR, parts.kneeBR, parts.pawBR, (u + 0.25) % 1);
      stepLegF(parts.shoulderFR, parts.elbowFR, parts.pawFR, (u + 0.5) % 1);
      stepLegB(parts.hipBL, parts.kneeBL, parts.pawBL, (u + 0.75) % 1);

      parts.shoulderFL.rotation.z = Math.sin(tau) * 0.18 * k;
      parts.shoulderFR.rotation.z = Math.cos(tau) * 0.18 * k;
      parts.hipBL.rotation.z = -Math.sin(tau) * 0.16 * k;
      parts.hipBR.rotation.z = -Math.cos(tau) * 0.16 * k;

      parts.earL.rotation.x = -0.38 * k;
      parts.earR.rotation.x = -0.38 * k;
      parts.tail1.rotation.x = -0.25 * k;
      parts.tail2.rotation.y = Math.sin(tau) * 0.16 * k;
      break;
    }

    case 'howl':
    case 'roar':
    case 'cast': {
      const env = u < 0.18
        ? u / 0.18
        : u < 0.80
          ? 1.0
          : 1.0 - (u - 0.80) / 0.20;
      const vib = u >= 0.18 && u <= 0.80 ? Math.sin(u * 62) * 0.035 : 0;

      parts.hips.position.y = baseHipsY - env * 0.09 * k;
      parts.hips.rotation.x = -env * 0.24 * k;
      parts.torso.rotation.x = -env * 0.18 * k;
      parts.chest.rotation.x = (-env * 0.22 + vib) * k;
      parts.neck.rotation.x = (-env * 0.52 + vib) * k;
      parts.head.rotation.x = (-env * 0.65) * k;
      parts.jaw.rotation.x = (0.1 + env * 0.56 + Math.abs(vib) * 2.0) * k;

      parts.earL.rotation.x = -env * 0.52 * k;
      parts.earR.rotation.x = -env * 0.52 * k;

      parts.shoulderFL.rotation.x = env * 0.22 * k;
      parts.elbowFL.rotation.x = -env * 0.12 * k;
      parts.shoulderFR.rotation.x = env * 0.22 * k;
      parts.elbowFR.rotation.x = -env * 0.12 * k;

      parts.hipBL.rotation.x = env * 0.18 * k;
      parts.kneeBL.rotation.x = -env * 0.35 * k;
      parts.hipBR.rotation.x = env * 0.18 * k;
      parts.kneeBR.rotation.x = -env * 0.35 * k;

      parts.tail1.rotation.x = -0.35 * env * k;
      break;
    }

    case 'hit': {
      const env = Math.sin(u * Math.PI);
      parts.hips.position.z = baseHipsZ - env * 0.16 * k;
      parts.hips.position.y = baseHipsY - env * 0.08 * k;
      parts.torso.rotation.x = env * 0.22 * k;
      parts.neck.rotation.x = -env * 0.38 * k;
      parts.head.rotation.x = -env * 0.28 * k;
      parts.head.rotation.z = env * 0.28 * k;
      parts.jaw.rotation.x = (0.1 + env * 0.48) * k;
      parts.shoulderFL.rotation.x = env * 0.35 * k;
      parts.shoulderFR.rotation.x = env * 0.35 * k;
      break;
    }

    case 'stagger': {
      const env = Math.sin(u * Math.PI);
      const wobble = Math.sin(u * Math.PI * 3);
      parts.hips.position.z = baseHipsZ - env * 0.22 * k;
      parts.hips.position.x = wobble * 0.12 * env * k;
      parts.hips.position.y = baseHipsY - env * 0.14 * k;
      parts.hips.rotation.z = wobble * 0.18 * env * k;
      parts.neck.rotation.z = -wobble * 0.28 * env * k;
      parts.head.rotation.x = env * 0.26 * k;
      parts.jaw.rotation.x = (0.14 + env * 0.35) * k;

      parts.shoulderFL.rotation.x = env * 0.38 * k;
      parts.elbowFL.rotation.x = env * 0.55 * k;
      parts.shoulderFR.rotation.x = env * 0.25 * k;
      parts.elbowFR.rotation.x = env * 0.45 * k;
      break;
    }

    case 'flee': {
      const wave = Math.sin(tau);
      parts.hips.position.y = baseHipsY + Math.cos(tau) * 0.08 * k;
      parts.hips.rotation.x = wave * 0.24 * k;
      parts.torso.rotation.x = -wave * 0.25 * k;
      parts.neck.rotation.x = 0.22 * k;
      parts.head.rotation.y = Math.sin(tau * 0.5) * 0.32 * k;
      parts.earL.rotation.x = -0.72 * k;
      parts.earR.rotation.x = -0.72 * k;

      parts.tail1.rotation.x = -0.95 * k;
      parts.tail2.rotation.x = -0.75 * k;
      parts.tail3.rotation.x = -0.45 * k;

      stepLegF(parts.shoulderFL, parts.elbowFL, parts.pawFL, u);
      stepLegF(parts.shoulderFR, parts.elbowFR, parts.pawFR, (u + 0.15) % 1);
      stepLegB(parts.hipBL, parts.kneeBL, parts.pawBL, (u + 0.5) % 1);
      stepLegB(parts.hipBR, parts.kneeBR, parts.pawBR, (u + 0.65) % 1);
      break;
    }

    case 'hesitate': {
      const sway = Math.sin(tau);
      parts.hips.position.z = baseHipsZ - (0.06 + sway * 0.06) * k;
      parts.hips.position.y = baseHipsY - 0.05 * k;
      parts.head.rotation.z = sway * 0.16 * k;
      parts.head.rotation.y = Math.cos(tau) * 0.18 * k;
      parts.neck.rotation.x = 0.15 * k;
      parts.jaw.rotation.x = 0.18 * k;

      const lift = Math.max(0, sway);
      parts.shoulderFL.rotation.x = -lift * 0.35 * k;
      parts.elbowFL.rotation.x = lift * 0.78 * k;
      parts.pawFL.rotation.x = -lift * 0.45 * k;

      parts.tail1.rotation.x = -0.45 * k;
      parts.tail2.rotation.y = sway * 0.14 * k;
      break;
    }

    case 'spawn': {
      if (u < 0.55) {
        const p = u / 0.55;
        const inv = 1 - p;
        const arc = Math.sin(p * Math.PI);
        parts.hips.position.y = baseHipsY - inv * 0.42 + arc * 0.22;
        parts.hips.position.z = baseHipsZ - inv * 0.45;
        parts.torso.rotation.x = -arc * 0.24;
        parts.shoulderFL.rotation.x = -arc * 0.55;
        parts.shoulderFR.rotation.x = -arc * 0.55;
      } else {
        const p = (u - 0.55) / 0.45;
        const snarl = Math.sin(p * Math.PI);
        parts.neck.rotation.x = -snarl * 0.22;
        parts.head.rotation.z = snarl * 0.18;
        parts.jaw.rotation.x = 0.1 + snarl * 0.52;
      }
      break;
    }

    case 'death': {
      const p1 = Math.min(1, u / 0.40);
      const p2 = u > 0.30 ? Math.min(1, (u - 0.30) / 0.55) : 0;
      const ease2 = p2 * p2 * (3 - 2 * p2);

      parts.hips.position.y = baseHipsY * (1 - p1 * 0.45) * (1 - ease2 * 0.68) + 0.18 * ease2;
      parts.hips.position.x = ease2 * 0.18 * k;
      parts.hips.rotation.z = ease2 * (Math.PI * 0.47) * k;
      parts.torso.rotation.z = ease2 * 0.08 * k;
      parts.neck.rotation.x = (-p1 * 0.32 + ease2 * 0.48) * k;
      parts.head.rotation.z = ease2 * 0.22 * k;
      parts.jaw.rotation.x = (0.12 + ease2 * 0.26) * k;

      parts.earL.rotation.x = -ease2 * 0.5 * k;
      parts.earR.rotation.x = -ease2 * 0.5 * k;

      parts.shoulderFL.rotation.x = (p1 * 0.45 - ease2 * 0.25) * k;
      parts.elbowFL.rotation.x = (p1 * 0.75 - ease2 * 0.35) * k;
      parts.shoulderFR.rotation.x = (p1 * 0.45 - ease2 * 0.15) * k;
      parts.elbowFR.rotation.x = (p1 * 0.75 - ease2 * 0.42) * k;

      parts.hipBL.rotation.x = (-p1 * 0.38 + ease2 * 0.28) * k;
      parts.kneeBL.rotation.x = (-p1 * 0.65 + ease2 * 0.32) * k;
      parts.hipBR.rotation.x = (-p1 * 0.38 + ease2 * 0.18) * k;
      parts.kneeBR.rotation.x = (-p1 * 0.65 + ease2 * 0.38) * k;

      parts.tail1.rotation.x = -ease2 * 0.45 * k;
      parts.tail2.rotation.z = -ease2 * 0.35 * k;
      break;
    }

    case 'ambushWait': {
      const breath = Math.sin(tau) * 0.008;
      parts.hips.position.y = 0.35 + breath;
      parts.hips.position.z = baseHipsZ - 0.08;
      parts.hips.rotation.x = 0.06;
      parts.torso.rotation.x = 0.05;
      parts.chest.rotation.x = 0.06;
      parts.neck.rotation.x = -0.18;
      parts.head.rotation.x = -0.02;
      parts.jaw.rotation.x = 0.14;

      parts.earL.rotation.set(-0.74, 0, -0.25);
      parts.earR.rotation.set(-0.74, 0, 0.25);

      parts.shoulderFL.rotation.x = 0.78;
      parts.elbowFL.rotation.x = 1.42;
      parts.pawFL.rotation.x = -0.68;
      parts.shoulderFR.rotation.x = 0.78;
      parts.elbowFR.rotation.x = 1.42;
      parts.pawFR.rotation.x = -0.68;

      parts.hipBL.rotation.x = -0.74;
      parts.kneeBL.rotation.x = -1.32;
      parts.pawBL.rotation.x = 0.64;
      parts.hipBR.rotation.x = -0.74;
      parts.kneeBR.rotation.x = -1.32;
      parts.pawBR.rotation.x = 0.64;

      parts.tail1.rotation.x = 0.18;
      parts.tail2.rotation.x = 0.12;
      parts.tail3.rotation.y = Math.sin(tau) * 0.05;
      break;
    }

    default:
      break;
  }

  if (modelState && modelState.expression) {
    if (modelState.expression === 'snarl' || modelState.expression === 'angry') {
      parts.jaw.rotation.x = Math.max(parts.jaw.rotation.x, 0.38);
      parts.earL.rotation.x -= 0.25;
      parts.earR.rotation.x -= 0.25;
    } else if (modelState.expression === 'howl') {
      parts.jaw.rotation.x = Math.max(parts.jaw.rotation.x, 0.58);
    }
  }
}
