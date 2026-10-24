// src/art/weaponAnimations.js
// V2 Data-Driven Per-Weapon & Shield Animation System
// Verified Coordinate Space:
// Root/Hips: +X = Character Left, -X = Character Right, +Y = Up, +Z = Forward, -Z = Back
// Limb convention: limbs hang along -Y in rest pose.
// handR/L: weapon tip is along -Y in weapon local space.
// hand.rotation.x = -1.45 to -1.55 rotates -Y into +Z (pointing weapon forward).
// hand.rotation.x = -3.10 rotates -Y into +Y (pointing staff head upward).

import { BLADE_AND_POLEARM_ANIMATIONS } from './weaponAnimations/bladeAndPolearmAnims.js';
import { RANGED_AND_BLUNT_ANIMATIONS } from './weaponAnimations/rangedAndBluntAnims.js';
import {
  clamp,
  lerp,
  lerpAngle,
  smoothstep,
  easeInOutSine,
  easeOutCubic,
  easeOutBack,
  easeInQuad,
  interpolatePoseMap,
  SHIELD_OFFHAND_PROFILES,
  solveTwoHandGripIK
} from './weaponAnimations/animMathAndIK.js';

export {
  clamp,
  lerp,
  lerpAngle,
  smoothstep,
  easeInOutSine,
  easeOutCubic,
  easeOutBack,
  easeInQuad,
  interpolatePoseMap,
  SHIELD_OFFHAND_PROFILES,
  solveTwoHandGripIK
};

// -----------------------------------------------------------------------------
// 3. Complete WEAPON_ANIMATIONS Table for All 9 Weapons (V2)
// -----------------------------------------------------------------------------

export const WEAPON_ANIMATIONS = {
  ...BLADE_AND_POLEARM_ANIMATIONS,
  ...RANGED_AND_BLUNT_ANIMATIONS
};

// -----------------------------------------------------------------------------
// 5. Evaluator Functions
// -----------------------------------------------------------------------------

export function getAttackSpec(weaponKind, actionName) {
  const w = WEAPON_ANIMATIONS[weaponKind] || WEAPON_ANIMATIONS.sword;
  return w.attacks[actionName] || null;
}

export function getPoseCycleDuration(poseName, weaponKind) {
  const w = WEAPON_ANIMATIONS[weaponKind] || WEAPON_ANIMATIONS.sword;

  if (poseName === 'idle') return 2.0;
  if (poseName === 'walk') return 1.0;
  if (poseName === 'run') return 0.8;
  if (poseName === 'block') return 1.0;
  if (poseName === 'aimReady' || poseName === 'reach' || poseName === 'nock' ||
      poseName === 'raise' || poseName === 'fullDraw' || poseName === 'release' ||
      poseName === 'vibrate' || poseName === 'aim') return 1.0;

  if (w.attacks[poseName]) {
    return w.attacks[poseName].duration;
  }

  if (poseName === 'comboLoop') {
    return w.attacks.attack1.duration + w.attacks.attack2.duration + w.attacks.attack3.duration + 0.35;
  }

  if (poseName.startsWith('train') || poseName === 'mine') {
    return w.training ? w.training.cycleDuration : 1.2;
  }

  return 1.0;
}

/**
 * Applies a complete joint rotation/position dictionary to the rig's parts.
 */
export function applyPoseDict(parts, poseDict, intensity = 1.0) {
  if (!poseDict) return;
  const k = Math.max(0, intensity);

  for (const partName in poseDict) {
    const part = parts[partName];
    if (!part) continue;

    const val = poseDict[partName];
    if (partName === 'hips' && val.pos) {
      part.position.x = val.pos[0] * k;
      part.position.y = 0.88 + val.pos[1] * k;
      part.position.z = val.pos[2] * k;
      if (val.rot) {
        part.rotation.x = val.rot[0] * k;
        part.rotation.y = val.rot[1] * k;
        part.rotation.z = val.rot[2] * k;
      }
    } else if (Array.isArray(val)) {
      part.rotation.x = val[0] * k;
      part.rotation.y = val[1] * k;
      part.rotation.z = val[2] * k;
    }
  }
}

/**
 * Evaluates an attack animation curve from its windup, strike, and followThrough keyframes.
 */
function evaluateAttackCurve(atkSpec, holdPose, time) {
  const tTotal = atkSpec.duration;
  const t = clamp(time, 0, tTotal);
  const tWind = atkSpec.phases.windup[1];
  const tStrike = atkSpec.phases.strike[1];
  const tImpact = atkSpec.impactTime || (tWind + (tStrike - tWind) * 0.6);

  const kfWind = Object.assign({}, holdPose, atkSpec.keyframes.windup);
  const kfStrike = Object.assign({}, holdPose, atkSpec.keyframes.strike);
  const kfFollow = Object.assign({}, holdPose, atkSpec.keyframes.followThrough || atkSpec.keyframes.strike);

  if (t <= tWind) {
    // Windup phase: hold -> windup
    const u = t / Math.max(0.001, tWind);
    const alpha = easeInOutSine(u);
    return interpolatePoseMap(holdPose, kfWind, alpha);
  } else if (t <= tImpact) {
    // Acceleration phase: windup -> strike (impact apex)
    const span = Math.max(0.001, tImpact - tWind);
    const u = (t - tWind) / span;
    const alpha = easeInQuad(u);
    return interpolatePoseMap(kfWind, kfStrike, alpha);
  } else if (t <= tStrike) {
    // Follow-through phase: strike -> followThrough
    const span = Math.max(0.001, tStrike - tImpact);
    const u = (t - tImpact) / span;
    const alpha = easeOutBack(clamp(u, 0, 1));
    return interpolatePoseMap(kfStrike, kfFollow, alpha);
  } else {
    // Recovery phase: followThrough -> hold
    const span = Math.max(0.001, tTotal - tStrike);
    const u = clamp((t - tStrike) / span, 0, 1);
    const alpha = easeInOutSine(u);
    return interpolatePoseMap(kfFollow, holdPose, alpha);
  }
}

/**
 * Evaluates a looping training drill from an array of keyframes.
 */
function evaluateTrainingDrill(trainSpec, holdPose, time) {
  const cycle = trainSpec.cycleDuration || 1.2;
  const u = ((time % cycle) + cycle) % cycle;
  const kfs = trainSpec.keyframes;

  if (!kfs || kfs.length === 0) return holdPose;

  let k0 = kfs[0];
  let k1 = kfs[0];

  for (let i = 0; i < kfs.length - 1; i++) {
    if (u >= kfs[i].t && u <= kfs[i + 1].t) {
      k0 = kfs[i];
      k1 = kfs[i + 1];
      break;
    }
  }

  const span = Math.max(0.0001, k1.t - k0.t);
  let progress = clamp((u - k0.t) / span, 0, 1);

  if (k0.ease === 'easeOutBack') progress = easeOutBack(progress);
  else if (k0.ease === 'easeOutCubic') progress = easeOutCubic(progress);
  else if (k0.ease === 'easeInQuad') progress = easeInQuad(progress);
  else progress = easeInOutSine(progress);

  const poseA = Object.assign({}, holdPose, k0.pose);
  const poseB = Object.assign({}, holdPose, k1.pose);
  return interpolatePoseMap(poseA, poseB, progress);
}

/**
 * Core weapon-aware pose evaluator.
 */
export function evaluateWeaponPose(parts, sockets, state = {}) {
  const name = state.name || 'idle';
  const t = state.t !== undefined ? state.t : 0;
  const intensity = state.intensity !== undefined ? state.intensity : 1;
  const weaponKind = state.weaponKind || 'sword';
  const shieldKind = state.shieldKind || null;
  const dt = state.dt || 0.016;

  const weaponSpec = WEAPON_ANIMATIONS[weaponKind] || WEAPON_ANIMATIONS.sword;
  const holdBase = weaponSpec.hold.basePose;

  let targetPoseMap = null;
  let effectiveTwoHandWeight = weaponSpec.hold.twoHandWeight || 0.0;
  let bowDrawDist = 0;

  let bowState = { drawAmount: 0, arrowVisible: false, vibTime: -1 };

  // 1. Resolve Pose based on action name
  if (name === 'idle' || name === 'staffIdle') {
    const bob = Math.sin(t * 2.2);
    const sway = Math.sin(t * 1.1);
    targetPoseMap = JSON.parse(JSON.stringify(holdBase));
    targetPoseMap.hips.pos[1] += bob * (weaponSpec.hold.bobAmp || 0.015);
    targetPoseMap.torso[1] += sway * (weaponSpec.hold.swayAmp || 0.035);
  } else if (name === 'aimReady') {
    targetPoseMap = JSON.parse(JSON.stringify(weaponSpec.aimReady || holdBase));
    targetPoseMap.torso[1] += Math.sin(t * 2.0) * 0.005; // gentle breathing
    effectiveTwoHandWeight = 0.0;
  } else if (name === 'reach') {
    targetPoseMap = JSON.parse(JSON.stringify(weaponSpec.phases?.reach || holdBase));
    effectiveTwoHandWeight = 0.0;
  } else if (name === 'nock') {
    targetPoseMap = JSON.parse(JSON.stringify(weaponSpec.phases?.nock || holdBase));
    effectiveTwoHandWeight = 0.0;
    bowState = { drawAmount: 0, arrowVisible: true, vibTime: -1 };
  } else if (name === 'raise') {
    targetPoseMap = JSON.parse(JSON.stringify(weaponSpec.phases?.raise || holdBase));
    effectiveTwoHandWeight = 0.0;
    bowState = { drawAmount: 0.08, arrowVisible: true, vibTime: -1 };
  } else if (name === 'fullDraw') {
    targetPoseMap = JSON.parse(JSON.stringify(weaponSpec.phases?.fullDraw || holdBase));
    targetPoseMap.torso[1] += Math.sin(t * 2.5) * 0.005;
    targetPoseMap.handL[1] += Math.sin(t * 2.5) * 0.005;
    effectiveTwoHandWeight = 0.0;
    bowState = { drawAmount: 1.0, arrowVisible: true, vibTime: -1 };
  } else if (name === 'release') {
    targetPoseMap = JSON.parse(JSON.stringify(weaponSpec.phases?.release || holdBase));
    effectiveTwoHandWeight = 0.0;
    bowState = { drawAmount: 0, arrowVisible: false, vibTime: 0.02 };
  } else if (name === 'vibrate') {
    targetPoseMap = JSON.parse(JSON.stringify(weaponSpec.phases?.vibrate || holdBase));
    effectiveTwoHandWeight = 0.0;
    bowState = { drawAmount: 0, arrowVisible: false, vibTime: 0.12 };
  } else if (name === 'aim') {
    // Parametric Aim Mode driven by continuous bowDraw [0..1]
    const d = clamp(state.bowDraw !== undefined ? state.bowDraw : 0, 0, 1);
    const readyPose = weaponSpec.aimReady || holdBase;
    const raisePose = weaponSpec.phases?.raise || readyPose;
    const drawPose = weaponSpec.phases?.fullDraw || readyPose;

    if (d < 0.08) {
      const u = d / 0.08;
      targetPoseMap = interpolatePoseMap(readyPose, raisePose, easeInOutSine(u));
    } else {
      const u = (d - 0.08) / 0.92;
      targetPoseMap = interpolatePoseMap(raisePose, drawPose, easeOutCubic(u));
    }

    // Breathing sway
    targetPoseMap.torso[1] += Math.sin(t * 2.5) * 0.005;
    targetPoseMap.handL[1] += Math.sin(t * 2.5) * 0.005;

    // Stamina Tremor if overdraw or requested
    if (state.isTremor || state.overdraw) {
      const tr = Math.sin(t * 18.0) * 0.022;
      targetPoseMap.handL[0] += tr;
      targetPoseMap.handR[0] += tr;
      targetPoseMap.head[0] += tr * 0.5;
    }

    // Damped lower-body strafe walk cycle while keeping upper-body aim rock-steady
    if (state.moving) {
      const walkPhase = t * 7.0;
      const s = Math.sin(walkPhase);
      const c = Math.cos(walkPhase);
      targetPoseMap.hips.pos[1] += -Math.abs(c) * 0.018;
      targetPoseMap.hipL[0] += s * 0.22;
      targetPoseMap.hipR[0] -= s * 0.22;
      targetPoseMap.kneeL[0] += Math.max(0, -c) * 0.35;
      targetPoseMap.kneeR[0] += Math.max(0, c) * 0.35;
    }

    effectiveTwoHandWeight = 1.0;
    bowDrawDist = d;
    bowState = {
      drawAmount: d,
      arrowVisible: d > 0.01 || Boolean(state.arrowVisible),
      vibTime: state.vibTime !== undefined ? state.vibTime : -1
    };
  } else if (name === 'walk' || name === 'staffWalk') {
    const w = t * 6.5;
    const s = Math.sin(w);
    const c = Math.cos(w);
    targetPoseMap = JSON.parse(JSON.stringify(holdBase));
    targetPoseMap.hips.pos[1] = -Math.abs(c) * 0.028;
    targetPoseMap.hips.rot[1] = s * 0.14;
    targetPoseMap.torso[0] += 0.06;
    targetPoseMap.hipL = [s * 0.56, 0, 0.04];
    targetPoseMap.hipR = [-s * 0.56, 0, -0.04];
    targetPoseMap.kneeL = [Math.max(0, -c) * 0.68, 0, 0];
    targetPoseMap.kneeR = [Math.max(0, c) * 0.68, 0, 0];

    if (weaponSpec.kind === 'staff') {
      targetPoseMap.shoulderR = [-0.15, -0.08, -0.06];
      targetPoseMap.elbowR = [-0.40, 0, 0];
      targetPoseMap.handR = [-2.65, -0.05, 0.05]; // staff held at side
      targetPoseMap.shoulderL[0] = s * 0.35;
    } else if (effectiveTwoHandWeight > 0.5) {
      targetPoseMap.shoulderR[0] += -s * 0.12;
      targetPoseMap.shoulderL[0] += s * 0.12;
    } else {
      targetPoseMap.shoulderR[0] += -s * 0.35;
      targetPoseMap.shoulderL[0] += s * 0.35;
    }
  } else if (name === 'run' || name === 'staffRun') {
    const w = t * 11.0;
    const s = Math.sin(w);
    const c = Math.cos(w);
    targetPoseMap = JSON.parse(JSON.stringify(holdBase));
    targetPoseMap.hips.pos[1] = Math.abs(s) * 0.045 - 0.03;
    targetPoseMap.hips.rot[1] = s * 0.22;
    targetPoseMap.torso[0] += 0.22;
    targetPoseMap.head[0] = -0.15;
    targetPoseMap.hipL = [s * 0.95, 0, 0.05];
    targetPoseMap.hipR = [-s * 0.95, 0, -0.05];
    targetPoseMap.kneeL = [0.2 + Math.max(0, -c) * 0.95, 0, 0];
    targetPoseMap.kneeR = [0.2 + Math.max(0, c) * 0.95, 0, 0];

    if (weaponSpec.kind === 'staff') {
      targetPoseMap.shoulderR = [-0.22, -0.10, -0.08];
      targetPoseMap.elbowR = [-0.45, 0, 0];
      targetPoseMap.handR = [-2.60, -0.05, 0.05]; // staff held at side
      targetPoseMap.shoulderL[0] = s * 0.55;
    } else if (effectiveTwoHandWeight > 0.5) {
      targetPoseMap.shoulderR[0] += -s * 0.20;
      targetPoseMap.shoulderL[0] += s * 0.20;
    } else {
      targetPoseMap.shoulderR[0] += -s * 0.55;
      targetPoseMap.shoulderL[0] += s * 0.55;
    }
  } else if (name === 'cast' || name === 'spellCast' || name === 'staffCast') {
    targetPoseMap = weaponSpec.castPose || holdBase;
    effectiveTwoHandWeight = 0.0;
  } else if (name === 'ultimateChannel' || name === 'ultimate' || name === 'staffUltimate') {
    targetPoseMap = weaponSpec.ultimatePose || holdBase;
    effectiveTwoHandWeight = 0.0;
  } else if (name === 'attack1' || name === 'attack2' || name === 'attack3') {
    const atkSpec = weaponSpec.attacks[name] || weaponSpec.attacks.attack1;
    targetPoseMap = evaluateAttackCurve(atkSpec, holdBase, t);
    effectiveTwoHandWeight = atkSpec.twoHandWeight !== undefined ? atkSpec.twoHandWeight : effectiveTwoHandWeight;
    if (weaponSpec.kind === 'bow') {
      const tWind = atkSpec.phases.windup[1];
      const tStrike = atkSpec.phases.strike[1];
      if (t < tWind) {
        const u = t / Math.max(0.001, tWind);
        const maxD = name === 'attack2' ? 1.0 : (name === 'attack3' ? 0.85 : 0.55);
        bowState = {
          drawAmount: u * maxD,
          arrowVisible: t >= 0.05,
          vibTime: -1
        };
      } else if (t < tStrike + 0.16) {
        bowState = {
          drawAmount: 0,
          arrowVisible: false,
          vibTime: t - tWind
        };
      } else {
        bowState = {
          drawAmount: 0,
          arrowVisible: false,
          vibTime: -1
        };
      }
      bowDrawDist = bowState.drawAmount * 0.38;
    }
  } else if (name === 'comboLoop') {
    const a1 = weaponSpec.attacks.attack1;
    const a2 = weaponSpec.attacks.attack2;
    const a3 = weaponSpec.attacks.attack3;
    const d1 = a1.duration;
    const d2 = a2.duration;
    const d3 = a3.duration;
    const totalCycle = d1 + d2 + d3 + 0.35;
    const modT = ((t % totalCycle) + totalCycle) % totalCycle;

    if (modT < d1) {
      targetPoseMap = evaluateAttackCurve(a1, holdBase, modT);
      effectiveTwoHandWeight = a1.twoHandWeight !== undefined ? a1.twoHandWeight : effectiveTwoHandWeight;
      if (weaponSpec.kind === 'bow') {
        const tWind = a1.phases.windup[1];
        if (modT < tWind) {
          bowState = { drawAmount: (modT / tWind) * 0.55, arrowVisible: modT >= 0.05, vibTime: -1 };
        } else {
          bowState = { drawAmount: 0, arrowVisible: false, vibTime: modT - tWind };
        }
      }
    } else if (modT < d1 + d2) {
      const subT = modT - d1;
      targetPoseMap = evaluateAttackCurve(a2, holdBase, subT);
      effectiveTwoHandWeight = a2.twoHandWeight !== undefined ? a2.twoHandWeight : effectiveTwoHandWeight;
      if (weaponSpec.kind === 'bow') {
        const tWind = a2.phases.windup[1];
        if (subT < tWind) {
          bowState = { drawAmount: (subT / tWind) * 1.0, arrowVisible: subT >= 0.05, vibTime: -1 };
        } else {
          bowState = { drawAmount: 0, arrowVisible: false, vibTime: subT - tWind };
        }
      }
    } else if (modT < d1 + d2 + d3) {
      const subT = modT - d1 - d2;
      targetPoseMap = evaluateAttackCurve(a3, holdBase, subT);
      effectiveTwoHandWeight = a3.twoHandWeight !== undefined ? a3.twoHandWeight : effectiveTwoHandWeight;
      if (weaponSpec.kind === 'bow') {
        const tWind = a3.phases.windup[1];
        if (subT < tWind) {
          bowState = { drawAmount: (subT / tWind) * 0.85, arrowVisible: subT >= 0.05, vibTime: -1 };
        } else {
          bowState = { drawAmount: 0, arrowVisible: false, vibTime: subT - tWind };
        }
      }
    } else {
      const restT = modT - d1 - d2 - d3;
      const alpha = easeInOutSine(clamp(restT / 0.35, 0, 1));
      targetPoseMap = interpolatePoseMap(evaluateAttackCurve(a3, holdBase, d3), holdBase, alpha);
      effectiveTwoHandWeight = 0.5;
      if (weaponSpec.kind === 'bow') {
        bowState = { drawAmount: 0, arrowVisible: false, vibTime: -1 };
      }
    }
    if (weaponSpec.kind === 'bow') {
      bowDrawDist = bowState.drawAmount * 0.38;
    }
  } else if (name === 'block') {
    if (shieldKind && SHIELD_OFFHAND_PROFILES[shieldKind] && weaponSpec.gripType === 'oneHand') {
      const shProfile = SHIELD_OFFHAND_PROFILES[shieldKind];
      targetPoseMap = JSON.parse(JSON.stringify(holdBase));
      targetPoseMap.shoulderL = [...shProfile.block.shoulderL];
      targetPoseMap.elbowL = [...shProfile.block.elbowL];
      targetPoseMap.handL = [...shProfile.block.handL];
      targetPoseMap.torso[0] += shProfile.block.torsoPitch || 0.12;
      effectiveTwoHandWeight = 0.0;
    } else {
      targetPoseMap = weaponSpec.block.pose;
      effectiveTwoHandWeight = weaponSpec.block.twoHandWeight !== undefined ? weaponSpec.block.twoHandWeight : effectiveTwoHandWeight;
    }
  } else if (name.startsWith('train') || name === 'mine') {
    let drillWeapon = weaponSpec;
    if (name === 'trainSword') drillWeapon = WEAPON_ANIMATIONS.sword;
    else if (name === 'trainGreatsword') drillWeapon = WEAPON_ANIMATIONS.greatsword;
    else if (name === 'trainSpear') drillWeapon = WEAPON_ANIMATIONS.spear;
    else if (name === 'trainDagger') drillWeapon = WEAPON_ANIMATIONS.dagger;
    else if (name === 'trainBow') drillWeapon = WEAPON_ANIMATIONS.bow;
    else if (name === 'trainStaff') drillWeapon = WEAPON_ANIMATIONS.staff;
    else if (name === 'trainMace') drillWeapon = WEAPON_ANIMATIONS.mace;
    else if (name === 'trainClub') drillWeapon = WEAPON_ANIMATIONS.club;
    else if (name === 'trainPickaxe' || name === 'mine') drillWeapon = WEAPON_ANIMATIONS.pickaxe;

    const trainSpec = drillWeapon.training;
    targetPoseMap = evaluateTrainingDrill(trainSpec, drillWeapon.hold.basePose, t);
    effectiveTwoHandWeight = trainSpec.twoHandWeight !== undefined ? trainSpec.twoHandWeight : drillWeapon.hold.twoHandWeight;
    if (drillWeapon.kind === 'bow') {
      const u = ((t % 1.60) + 1.60) % 1.60;
      if (u < 0.15) {
        bowState = { drawAmount: 0, arrowVisible: false, vibTime: -1 };
      } else if (u < 0.35) {
        bowState = { drawAmount: 0, arrowVisible: true, vibTime: -1 };
      } else if (u < 0.60) {
        bowState = { drawAmount: ((u - 0.35) / 0.25) * 0.10, arrowVisible: true, vibTime: -1 };
      } else if (u < 1.05) {
        bowState = { drawAmount: 0.10 + ((u - 0.60) / 0.45) * 0.90, arrowVisible: true, vibTime: -1 };
      } else if (u < 1.20) {
        bowState = { drawAmount: 1.0, arrowVisible: true, vibTime: -1 };
      } else if (u < 1.45) {
        bowState = { drawAmount: 0, arrowVisible: false, vibTime: u - 1.20 };
      } else {
        bowState = { drawAmount: 0, arrowVisible: false, vibTime: -1 };
      }
      bowDrawDist = bowState.drawAmount * 0.38;
    }
  } else {
    targetPoseMap = holdBase;
  }

  // 2. Off-Hand Shield Coordination for 1-Handed Weapons
  if (shieldKind && SHIELD_OFFHAND_PROFILES[shieldKind] && weaponSpec.gripType === 'oneHand' && name !== 'block') {
    const shProfile = SHIELD_OFFHAND_PROFILES[shieldKind];
    if (name === 'idle' || name === 'walk' || name === 'run') {
      targetPoseMap.shoulderL = [...shProfile.hold.shoulderL];
      targetPoseMap.elbowL = [...shProfile.hold.elbowL];
      targetPoseMap.handL = [...shProfile.hold.handL];
    } else if (name.startsWith('attack') || name === 'comboLoop') {
      targetPoseMap.shoulderL = [...shProfile.attackCounter.shoulderL];
      targetPoseMap.elbowL = [...shProfile.attackCounter.elbowL];
      targetPoseMap.handL = [...shProfile.attackCounter.handL];
    }
  }

  // 3. Pose Snapshot Crossfade Blender
  const rootObj = parts.root?.parent || parts.root;
  if (rootObj) {
    if (!rootObj.userData.animBlender) {
      rootObj.userData.animBlender = {
        lastAction: name,
        lastWeapon: weaponKind,
        blendElapsed: 1.0,
        blendDuration: 0.09,
        snapshot: null
      };
    }
    const blender = rootObj.userData.animBlender;

    if (blender.lastAction !== name || blender.lastWeapon !== weaponKind) {
      blender.snapshot = blender.current ? JSON.parse(JSON.stringify(blender.current)) : null;
      blender.blendElapsed = 0.0;
      blender.blendDuration = (name.startsWith('attack') && blender.lastAction.startsWith('attack')) ? 0.065 : 0.09;
      blender.lastAction = name;
      blender.lastWeapon = weaponKind;
    }

    if (blender.blendElapsed < blender.blendDuration && blender.snapshot) {
      blender.blendElapsed += dt;
      const progress = smoothstep(0, 1, blender.blendElapsed / blender.blendDuration);
      targetPoseMap = interpolatePoseMap(blender.snapshot, targetPoseMap, progress);
    }
    blender.current = targetPoseMap;
  }

  // 4. Apply pose transform values to parts
  applyPoseDict(parts, targetPoseMap, intensity);

  // 5. Analytical Two-Bone Arm IK Solver for Two-Handed Grips
  if (effectiveTwoHandWeight > 0.001) {
    solveTwoHandGripIK(parts, sockets, weaponSpec, effectiveTwoHandWeight, bowDrawDist);
  }

  // 6. Expose bowState for bow limb/string flexion & arrow visibility sync
  if (weaponSpec.kind === 'bow') {
    if (name === 'aim' && state.bowDraw !== undefined) {
      bowState.drawAmount = clamp(state.bowDraw, 0, 1);
      if (state.arrowVisible !== undefined) bowState.arrowVisible = Boolean(state.arrowVisible);
      if (state.vibTime !== undefined) bowState.vibTime = state.vibTime;
    }
    if (parts.root) parts.root.userData.bowState = bowState;
    if (parts.root?.parent) parts.root.parent.userData.bowState = bowState;
    if (parts.hips?.parent) parts.hips.parent.userData.bowState = bowState;
    if (sockets?.handL) sockets.handL.userData.bowState = bowState;
  }
}