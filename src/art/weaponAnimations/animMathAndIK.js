import * as THREE from 'three';


// -----------------------------------------------------------------------------
// 1. Math & Interpolation Helpers
// -----------------------------------------------------------------------------

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function lerpAngle(a, b, t) {
  let diff = (b - a) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function easeInQuad(t) {
  return t * t;
}

/**
 * Interpolates between two pose dictionary objects using shortest-arc lerpAngle.
 */
export function interpolatePoseMap(poseA, poseB, alpha) {
  if (!poseA) return poseB;
  if (!poseB) return poseA;
  const res = {};
  const allKeys = new Set([...Object.keys(poseA), ...Object.keys(poseB)]);

  for (const k of allKeys) {
    const valA = poseA[k];
    const valB = poseB[k];

    if (!valA) {
      res[k] = valB;
      continue;
    }
    if (!valB) {
      res[k] = valA;
      continue;
    }

    if (k === 'hips' && (valA.pos || valB.pos)) {
      const posA = valA.pos || [0, 0, 0];
      const posB = valB.pos || [0, 0, 0];
      const rotA = valA.rot || (Array.isArray(valA) ? valA : [0, 0, 0]);
      const rotB = valB.rot || (Array.isArray(valB) ? valB : [0, 0, 0]);
      res.hips = {
        pos: [
          lerp(posA[0], posB[0], alpha),
          lerp(posA[1], posB[1], alpha),
          lerp(posA[2], posB[2], alpha)
        ],
        rot: [
          lerpAngle(rotA[0], rotB[0], alpha),
          lerpAngle(rotA[1], rotB[1], alpha),
          lerpAngle(rotA[2], rotB[2], alpha)
        ]
      };
    } else if (Array.isArray(valA) && Array.isArray(valB)) {
      res[k] = [
        lerpAngle(valA[0], valB[0], alpha),
        lerpAngle(valA[1], valB[1], alpha),
        lerpAngle(valA[2], valB[2], alpha)
      ];
    } else {
      res[k] = valB;
    }
  }
  return res;
}

// -----------------------------------------------------------------------------
// 2. Shield Off-Hand Profiles (Corrected Outward Angles & Arm Clearance)
// -----------------------------------------------------------------------------

export const SHIELD_OFFHAND_PROFILES = {
  woodenRound: {
    weightBias: 0.05,
    hold: {
      shoulderL: [-0.28, 0.18, 0.14],
      elbowL: [-1.15, 0, 0],
      handL: [0.15, 0.55, -0.22]
    },
    attackCounter: {
      shoulderL: [-0.20, 0.35, 0.28],
      elbowL: [-1.22, 0, 0],
      handL: [0.10, 0.48, -0.18]
    },
    block: {
      shoulderL: [-0.75, 0.35, -0.15],
      elbowL: [-1.35, 0, 0],
      handL: [0.20, 0.70, -0.32],
      torsoPitch: 0.12
    }
  },
  ironRound: {
    weightBias: 0.07,
    hold: {
      shoulderL: [-0.30, 0.20, 0.15],
      elbowL: [-1.18, 0, 0],
      handL: [0.15, 0.58, -0.24]
    },
    attackCounter: {
      shoulderL: [-0.22, 0.38, 0.30],
      elbowL: [-1.25, 0, 0],
      handL: [0.12, 0.52, -0.20]
    },
    block: {
      shoulderL: [-0.78, 0.38, -0.18],
      elbowL: [-1.38, 0, 0],
      handL: [0.22, 0.72, -0.35],
      torsoPitch: 0.14
    }
  },
  plank: {
    weightBias: 0.04,
    hold: {
      shoulderL: [-0.26, 0.16, 0.12],
      elbowL: [-1.12, 0, 0],
      handL: [0.14, 0.52, -0.20]
    },
    attackCounter: {
      shoulderL: [-0.18, 0.32, 0.25],
      elbowL: [-1.20, 0, 0],
      handL: [0.10, 0.45, -0.16]
    },
    block: {
      shoulderL: [-0.72, 0.32, -0.14],
      elbowL: [-1.32, 0, 0],
      handL: [0.18, 0.68, -0.30],
      torsoPitch: 0.10
    }
  },
  kite: {
    weightBias: 0.08,
    hold: {
      shoulderL: [-0.32, 0.22, 0.16],
      elbowL: [-1.20, 0, 0],
      handL: [0.16, 0.60, -0.25]
    },
    attackCounter: {
      shoulderL: [-0.24, 0.40, 0.32],
      elbowL: [-1.28, 0, 0],
      handL: [0.12, 0.54, -0.22]
    },
    block: {
      shoulderL: [-0.82, 0.40, -0.20],
      elbowL: [-1.42, 0, 0],
      handL: [0.24, 0.75, -0.38],
      torsoPitch: 0.16
    }
  }
};


const _mShoulder = new THREE.Matrix4();
const _mElbow = new THREE.Matrix4();
const _mHand = new THREE.Matrix4();
const _mSocket = new THREE.Matrix4();
const _mChain = new THREE.Matrix4();
const _qRot = new THREE.Quaternion();
const _vScale = new THREE.Vector3(1, 1, 1);
const _vTargetInChest = new THREE.Vector3();
const _vArmDir = new THREE.Vector3();
const _vUpper = new THREE.Vector3();
const _vPole = new THREE.Vector3();
const _vNormal = new THREE.Vector3();
const _vBendDir = new THREE.Vector3();
const _vDown = new THREE.Vector3(0, -1, 0);
const _vNockTargetInChest = new THREE.Vector3();
const _vCheekTargetInChest = new THREE.Vector3();
const _eulerScratch = new THREE.Euler(0, 0, 0, 'XYZ');

export function solveTwoHandGripIK(parts, sockets, weaponSpec, twoHandWeight, bowDrawDist = 0) {
  if (!weaponSpec || twoHandWeight <= 0.001) return;

  const isBow = weaponSpec.kind === 'bow';
  const L1 = 0.24;
  const L2 = 0.24;

  if (!isBow) {
    // Melee / Staff / Pickaxe: Primary is handR, secondary is handL
    const primaryShoulder = parts.shoulderR;
    const primaryElbow = parts.elbowR;
    const primaryHand = parts.handR;
    const primarySocket = sockets.handR;
    const offGrip = weaponSpec.offHandGripLocal || [0, 0.12, 0];

    // Compute target position in chest local space
    _mShoulder.compose(primaryShoulder.position, _qRot.setFromEuler(primaryShoulder.rotation), _vScale);
    _mElbow.compose(primaryElbow.position, _qRot.setFromEuler(primaryElbow.rotation), _vScale);
    _mHand.compose(primaryHand.position, _qRot.setFromEuler(primaryHand.rotation), _vScale);
    _mSocket.compose(primarySocket.position, _qRot.setFromEuler(primarySocket.rotation), _vScale);

    _mChain.copy(_mShoulder).multiply(_mElbow).multiply(_mHand).multiply(_mSocket);
    _vTargetInChest.set(offGrip[0], offGrip[1], offGrip[2]).applyMatrix4(_mChain);

    const secShoulder = parts.shoulderL;
    const secElbow = parts.elbowL;
    const secHand = parts.handL;

    _vArmDir.subVectors(_vTargetInChest, secShoulder.position);
    const d = clamp(_vArmDir.length(), 0.08, L1 + L2 - 0.005);
    _vArmDir.normalize();

    // Law of cosines for elbow
    const cosAlpha = clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1);
    const solvedElbowAngle = -clamp(Math.PI - Math.acos(cosAlpha), 0.05, 1.55);

    // Law of cosines for shoulder angle beta
    const cosBeta = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
    const beta = Math.acos(cosBeta);

    // Pole vector for left arm
    _vPole.set(0.35, -0.60, -0.70).normalize();
    _vNormal.crossVectors(_vArmDir, _vPole).normalize();
    if (_vNormal.lengthSq() < 0.001) _vNormal.set(0, 0, 1);
    _vBendDir.crossVectors(_vNormal, _vArmDir).normalize();

    _vUpper.copy(_vArmDir).multiplyScalar(Math.cos(beta)).addScaledVector(_vBendDir, Math.sin(beta)).normalize();

    _qRot.setFromUnitVectors(_vDown, _vUpper);
    _eulerScratch.setFromQuaternion(_qRot, 'XYZ');

    // Blend solved rotations with FK
    secShoulder.rotation.x = lerpAngle(secShoulder.rotation.x, _eulerScratch.x, twoHandWeight);
    secShoulder.rotation.y = lerpAngle(secShoulder.rotation.y, _eulerScratch.y, twoHandWeight);
    secShoulder.rotation.z = lerpAngle(secShoulder.rotation.z, _eulerScratch.z, twoHandWeight);

    secElbow.rotation.x = lerp(secElbow.rotation.x, solvedElbowAngle, twoHandWeight);

    // Orient handL to wrap the shaft
    secHand.rotation.x = lerpAngle(secHand.rotation.x, primaryHand.rotation.x, twoHandWeight);
    secHand.rotation.y = lerpAngle(secHand.rotation.y, primaryHand.rotation.y, twoHandWeight);
    secHand.rotation.z = lerpAngle(secHand.rotation.z, -primaryHand.rotation.z, twoHandWeight);
  } else {
    // Bow: Primary is handL holding bow, secondary is handR pulling string/nock
    const primaryShoulder = parts.shoulderL;
    const primaryElbow = parts.elbowL;
    const primaryHand = parts.handL;
    const primarySocket = sockets.handL;

    _mShoulder.compose(primaryShoulder.position, _qRot.setFromEuler(primaryShoulder.rotation), _vScale);
    _mElbow.compose(primaryElbow.position, _qRot.setFromEuler(primaryElbow.rotation), _vScale);
    _mHand.compose(primaryHand.position, _qRot.setFromEuler(primaryHand.rotation), _vScale);
    _mSocket.compose(primarySocket.position, _qRot.setFromEuler(primarySocket.rotation), _vScale);

    _mChain.copy(_mShoulder).multiply(_mElbow).multiply(_mHand).multiply(_mSocket);

    // Target moves in a straight line from nock point on string to cheek anchor beside jaw
    const nockRest = weaponSpec.nockRestLocal || [0, 0, -0.13];
    _vNockTargetInChest.set(nockRest[0], nockRest[1], nockRest[2]).applyMatrix4(_mChain);

    const cheekAnchor = weaponSpec.cheekAnchorLocal || [-0.08, 0.36, -0.02];
    _vCheekTargetInChest.set(cheekAnchor[0], cheekAnchor[1], cheekAnchor[2]);

    const drawT = clamp(bowDrawDist, 0, 1);
    _vTargetInChest.lerpVectors(_vNockTargetInChest, _vCheekTargetInChest, drawT);

    const secShoulder = parts.shoulderR;
    const secElbow = parts.elbowR;
    const secHand = parts.handR;

    _vArmDir.subVectors(_vTargetInChest, secShoulder.position);
    const d = clamp(_vArmDir.length(), 0.08, L1 + L2 - 0.005);
    _vArmDir.normalize();

    const cosAlpha = clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1);
    const solvedElbowAngle = -clamp(Math.PI - Math.acos(cosAlpha), 0.05, 1.55);

    const cosBeta = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
    const beta = Math.acos(cosBeta);

    const pole = weaponSpec.elbowPole || [-0.60, 0.35, -0.75];
    _vPole.set(pole[0], pole[1], pole[2]).normalize();
    _vNormal.crossVectors(_vArmDir, _vPole).normalize();
    if (_vNormal.lengthSq() < 0.001) _vNormal.set(0, 0, 1);
    _vBendDir.crossVectors(_vNormal, _vArmDir).normalize();

    _vUpper.copy(_vArmDir).multiplyScalar(Math.cos(beta)).addScaledVector(_vBendDir, Math.sin(beta)).normalize();

    _qRot.setFromUnitVectors(_vDown, _vUpper);
    _eulerScratch.setFromQuaternion(_qRot, 'XYZ');

    secShoulder.rotation.x = lerpAngle(secShoulder.rotation.x, _eulerScratch.x, twoHandWeight);
    secShoulder.rotation.y = lerpAngle(secShoulder.rotation.y, _eulerScratch.y, twoHandWeight);
    secShoulder.rotation.z = lerpAngle(secShoulder.rotation.z, _eulerScratch.z, twoHandWeight);

    secElbow.rotation.x = lerp(secElbow.rotation.x, solvedElbowAngle, twoHandWeight);

    // Natural finger hook alignment on bow string
    secHand.rotation.x = lerp(secHand.rotation.x, -0.35, twoHandWeight);
    secHand.rotation.y = lerp(secHand.rotation.y, 0.45, twoHandWeight);
    secHand.rotation.z = lerp(secHand.rotation.z, 0.20, twoHandWeight);
  }
}

// -----------------------------------------------------------------------------
// 5. Evaluator Functions
// -----------------------------------------------------------------------------

