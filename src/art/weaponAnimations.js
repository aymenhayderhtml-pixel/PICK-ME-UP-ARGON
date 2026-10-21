// src/art/weaponAnimations.js
// V2 Data-Driven Per-Weapon & Shield Animation System
// Verified Coordinate Space:
// Root/Hips: +X = Character Left, -X = Character Right, +Y = Up, +Z = Forward, -Z = Back
// Limb convention: limbs hang along -Y in rest pose.
// handR/L: weapon tip is along -Y in weapon local space.
// hand.rotation.x = -1.45 to -1.55 rotates -Y into +Z (pointing weapon forward).
// hand.rotation.x = -3.10 rotates -Y into +Y (pointing staff head upward).

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

export function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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

// -----------------------------------------------------------------------------
// 3. Complete WEAPON_ANIMATIONS Table for All 9 Weapons (V2)
// -----------------------------------------------------------------------------

export const WEAPON_ANIMATIONS = {
  // ---------------------------------------------------------------------------
  // 3.1 SWORD
  // ---------------------------------------------------------------------------
  sword: {
    kind: 'sword',
    gripType: 'oneHand',
    primaryHand: 'R',
    offHandGripLocal: [0, 0.12, 0],
    hold: {
      basePose: {
        hips: { pos: [0, -0.02, 0], rot: [0.02, -0.18, 0] },
        torso: [0.04, -0.12, 0],
        chest: [0.03, -0.10, 0],
        neck: [-0.03, 0.14, 0],
        head: [-0.02, 0.18, 0],
        shoulderR: [-0.32, -0.15, -0.18],
        elbowR: [-0.92, 0, 0],
        handR: [-0.60, -0.10, 0.08],
        shoulderL: [-0.26, 0.18, 0.14],
        elbowL: [-1.15, 0, 0],
        handL: [0.15, 0.55, -0.22],
        hipL: [-0.22, 0, 0.04],
        kneeL: [0.32, 0, 0],
        hipR: [0.22, 0, -0.04],
        kneeR: [0.26, 0, 0]
      },
      bobAmp: 0.015,
      swayAmp: 0.035,
      twoHandWeight: 0.0
    },
    attacks: {
      attack1: {
        name: 'Horizontal Cross Slash',
        duration: 0.46,
        phases: { windup: [0.00, 0.14], strike: [0.14, 0.27], recovery: [0.27, 0.46] },
        hitWindow: [0.16, 0.26],
        trailWindow: [0.15, 0.28],
        hitStop: 0.05,
        cameraShake: 0.16,
        twoHandWeight: 0.0,
        impactTime: 0.21,
        keyframes: {
          windup: {
            hips: { pos: [0, -0.03, -0.04], rot: [0.03, -0.42, 0] },
            torso: [0.05, -0.38, 0],
            chest: [0.04, -0.32, -0.05],
            head: [-0.02, 0.38, 0],
            shoulderR: [-0.38, -0.65, -0.55],
            elbowR: [-1.22, 0, 0],
            handR: [-0.35, -0.25, 0.15],
            shoulderL: [-0.18, 0.35, 0.28],
            elbowL: [-1.25, 0, 0],
            handL: [0.10, 0.50, -0.20],
            hipL: [-0.35, 0, 0.06],
            kneeL: [0.45, 0, 0],
            hipR: [0.28, 0, -0.08],
            kneeR: [0.35, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.04, 0.12], rot: [0.04, 0.45, 0] },
            torso: [0.12, 0.42, 0],
            chest: [0.10, 0.38, 0],
            head: [-0.04, -0.35, 0],
            shoulderR: [-0.95, 0.65, 0.35],
            elbowR: [-0.38, 0, 0],
            handR: [-1.30, 0.75, 0.0],
            shoulderL: [-0.28, -0.20, 0.10],
            elbowL: [-0.95, 0, 0],
            handL: [0.12, 0.35, -0.15],
            hipL: [0.22, 0, 0.05],
            kneeL: [0.22, 0, 0],
            hipR: [-0.45, 0, -0.05],
            kneeR: [0.55, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.02, 0.06], rot: [0.02, 0.28, 0] },
            torso: [0.06, 0.22, 0],
            chest: [0.04, 0.18, 0],
            head: [-0.02, -0.18, 0],
            shoulderR: [-0.65, 0.42, 0.20],
            elbowR: [-0.75, 0, 0],
            handR: [-0.95, 0.32, 0.05],
            shoulderL: [-0.25, 0.15, 0.12],
            elbowL: [-1.10, 0, 0],
            handL: [0.14, 0.52, -0.20],
            hipL: [0.10, 0, 0.04],
            kneeL: [0.25, 0, 0],
            hipR: [-0.25, 0, -0.04],
            kneeR: [0.35, 0, 0]
          }
        }
      },
      attack2: {
        name: 'Diagonal Rising Uppercut',
        duration: 0.48,
        phases: { windup: [0.00, 0.14], strike: [0.14, 0.28], recovery: [0.28, 0.48] },
        hitWindow: [0.16, 0.27],
        trailWindow: [0.15, 0.29],
        hitStop: 0.05,
        cameraShake: 0.18,
        twoHandWeight: 0.0,
        impactTime: 0.22,
        keyframes: {
          windup: {
            hips: { pos: [0, -0.06, -0.02], rot: [-0.02, 0.35, 0] },
            torso: [0.08, 0.30, 0],
            chest: [0.06, 0.25, 0],
            shoulderR: [-0.15, -0.35, -0.22],
            elbowR: [-0.55, 0, 0],
            handR: [-0.85, -0.22, 0.18],
            shoulderL: [-0.35, -0.15, 0.15],
            elbowL: [-1.15, 0, 0],
            handL: [0.12, 0.45, -0.18],
            hipL: [-0.42, 0, 0.05],
            kneeL: [0.55, 0, 0],
            hipR: [0.18, 0, -0.05],
            kneeR: [0.22, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.02, 0.10], rot: [0.06, -0.42, 0] },
            torso: [-0.05, -0.38, 0],
            chest: [-0.08, -0.35, 0],
            shoulderR: [-1.55, 0.35, -0.22],
            elbowR: [-0.25, 0, 0],
            handR: [-1.45, 0.20, 0.0],
            shoulderL: [-0.22, 0.32, 0.24],
            elbowL: [-1.25, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [0.15, 0, 0.04],
            kneeL: [0.20, 0, 0],
            hipR: [-0.48, 0, -0.06],
            kneeR: [0.58, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.01, 0.05], rot: [0.02, -0.22, 0] },
            torso: [0.02, -0.18, 0],
            chest: [0.00, -0.15, 0],
            shoulderR: [-1.15, 0.15, -0.15],
            elbowR: [-0.65, 0, 0],
            handR: [-1.05, 0.05, 0.05],
            shoulderL: [-0.25, 0.20, 0.16],
            elbowL: [-1.15, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [-0.05, 0, 0.04],
            kneeL: [0.25, 0, 0],
            hipR: [-0.25, 0, -0.04],
            kneeR: [0.35, 0, 0]
          }
        }
      },
      attack3: {
        name: 'Lunge Overhead Finisher Cleave',
        duration: 0.58,
        phases: { windup: [0.00, 0.18], strike: [0.18, 0.34], recovery: [0.34, 0.58] },
        hitWindow: [0.20, 0.33],
        trailWindow: [0.19, 0.35],
        hitStop: 0.065,
        cameraShake: 0.24,
        twoHandWeight: 0.0,
        impactTime: 0.26,
        keyframes: {
          windup: {
            hips: { pos: [0, 0.02, -0.06], rot: [-0.08, -0.15, 0] },
            torso: [-0.18, -0.12, 0],
            chest: [-0.22, -0.15, 0],
            shoulderR: [-1.85, -0.10, 0.12],
            elbowR: [-0.48, 0, 0],
            handR: [-0.85, 0.0, 0.0],
            shoulderL: [-0.45, 0.25, 0.20],
            elbowL: [-1.20, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [-0.45, 0, 0.05],
            kneeL: [0.65, 0, 0],
            hipR: [0.32, 0, -0.05],
            kneeR: [0.25, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.08, 0.22], rot: [0.12, 0.0, 0] },
            torso: [0.38, 0.0, 0],
            chest: [0.32, 0.0, 0],
            shoulderR: [-0.65, 0.08, 0.0],
            elbowR: [-0.22, 0, 0],
            handR: [-1.48, 0.0, 0.0],
            shoulderL: [-0.35, 0.32, 0.25],
            elbowL: [-1.25, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [0.35, 0, 0.06],
            kneeL: [0.22, 0, 0],
            hipR: [-0.62, 0, -0.06],
            kneeR: [0.75, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.04, 0.12], rot: [0.06, 0.0, 0] },
            torso: [0.15, 0.0, 0],
            chest: [0.12, 0.0, 0],
            shoulderR: [-0.55, 0.05, 0.0],
            elbowR: [-0.55, 0, 0],
            handR: [-1.15, 0.0, 0.0],
            shoulderL: [-0.28, 0.22, 0.16],
            elbowL: [-1.18, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [0.15, 0, 0.04],
            kneeL: [0.25, 0, 0],
            hipR: [-0.35, 0, -0.04],
            kneeR: [0.45, 0, 0]
          }
        }
      }
    },
    block: {
      twoHandWeight: 0.0,
      pose: {
        hips: { pos: [0, -0.05, 0], rot: [0.04, -0.25, 0] },
        torso: [0.12, -0.22, 0],
        chest: [0.10, -0.20, 0],
        shoulderR: [-0.48, -0.15, -0.15],
        elbowR: [-1.15, 0, 0],
        handR: [-0.85, -0.15, 0.12],
        shoulderL: [-0.75, 0.35, -0.15],
        elbowL: [-1.35, 0, 0],
        handL: [0.20, 0.70, -0.32],
        hipL: [-0.38, 0, 0.08],
        kneeL: [0.48, 0, 0],
        hipR: [0.28, 0, -0.08],
        kneeR: [0.36, 0, 0]
      }
    },
    training: {
      cycleDuration: 1.40,
      twoHandWeight: 0.0,
      keyframes: [
        { t: 0.00, ease: 'easeInOutSine', pose: { shoulderR: [-0.32, -0.15, -0.18], elbowR: [-0.92, 0, 0], handR: [-0.60, -0.10, 0.08], torso: [0.04, -0.12, 0] } },
        { t: 0.35, ease: 'easeOutBack', pose: { shoulderR: [-0.95, 0.65, 0.35], elbowR: [-0.38, 0, 0], handR: [-1.30, 0.75, 0.0], torso: [0.12, 0.42, 0] } },
        { t: 0.70, ease: 'easeInOutSine', pose: { shoulderR: [-0.15, -0.35, -0.22], elbowR: [-0.55, 0, 0], handR: [-0.85, -0.22, 0.18], torso: [0.08, 0.30, 0] } },
        { t: 1.05, ease: 'easeOutCubic', pose: { shoulderR: [-1.55, 0.35, -0.22], elbowR: [-0.25, 0, 0], handR: [-1.45, 0.20, 0.0], torso: [-0.05, -0.38, 0] } },
        { t: 1.40, ease: 'easeInOutSine', pose: { shoulderR: [-0.32, -0.15, -0.18], elbowR: [-0.92, 0, 0], handR: [-0.60, -0.10, 0.08], torso: [0.04, -0.12, 0] } }
      ]
    }
  },

  // ---------------------------------------------------------------------------
  // 3.2 GREATSWORD (Vom Tag Shoulder Rest & Heavy Cleaves)
  // ---------------------------------------------------------------------------
  greatsword: {
    kind: 'greatsword',
    gripType: 'twoHand',
    primaryHand: 'R',
    offHandGripLocal: [0, 0.20, 0],
    hold: {
      basePose: {
        hips: { pos: [0, -0.02, 0], rot: [0.04, -0.22, 0] },
        torso: [0.05, -0.15, 0],
        chest: [0.04, -0.12, 0],
        neck: [-0.03, 0.16, 0],
        head: [-0.02, 0.24, 0],
        shoulderR: [-1.25, -0.32, -0.20],
        elbowR: [-1.48, 0, 0],
        handR: [-0.30, -0.32, 0.12],
        shoulderL: [-0.85, 0.32, 0.22],
        elbowL: [-1.25, 0, 0],
        handL: [-0.20, 0.15, 0.10],
        hipL: [-0.26, 0, 0.05],
        kneeL: [0.36, 0, 0],
        hipR: [0.26, 0, -0.05],
        kneeR: [0.30, 0, 0]
      },
      bobAmp: 0.012,
      swayAmp: 0.025,
      twoHandWeight: 1.0
    },
    attacks: {
      attack1: {
        name: 'Horizontal Ground Cleave',
        duration: 0.68,
        phases: { windup: [0.00, 0.22], strike: [0.22, 0.42], recovery: [0.42, 0.68] },
        hitWindow: [0.25, 0.40],
        trailWindow: [0.23, 0.43],
        hitStop: 0.085,
        cameraShake: 0.26,
        twoHandWeight: 1.0,
        impactTime: 0.32,
        keyframes: {
          windup: {
            hips: { pos: [0, -0.05, -0.08], rot: [0.08, -0.65, 0] },
            torso: [0.12, -0.55, 0],
            chest: [0.08, -0.50, 0],
            head: [-0.03, 0.55, 0],
            shoulderR: [-0.75, -0.85, -0.45],
            elbowR: [-1.25, 0, 0],
            handR: [-0.45, -0.55, 0.18],
            shoulderL: [-0.45, -0.25, -0.15],
            elbowL: [-1.15, 0, 0],
            handL: [-0.35, -0.40, 0.15],
            hipL: [-0.42, 0, 0.08],
            kneeL: [0.55, 0, 0],
            hipR: [0.38, 0, -0.08],
            kneeR: [0.42, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.06, 0.16], rot: [0.06, 0.60, 0] },
            torso: [0.18, 0.55, 0],
            chest: [0.15, 0.50, 0],
            head: [-0.05, -0.50, 0],
            shoulderR: [-0.95, 0.55, 0.32],
            elbowR: [-0.45, 0, 0],
            handR: [-1.25, 0.65, 0.0],
            shoulderL: [-0.75, 0.45, 0.25],
            elbowL: [-0.65, 0, 0],
            handL: [-1.15, 0.55, 0.0],
            hipL: [0.35, 0, 0.06],
            kneeL: [0.28, 0, 0],
            hipR: [-0.58, 0, -0.06],
            kneeR: [0.72, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.03, 0.08], rot: [0.03, 0.35, 0] },
            torso: [0.08, 0.30, 0],
            chest: [0.06, 0.25, 0],
            shoulderR: [-0.75, 0.35, 0.18],
            elbowR: [-0.85, 0, 0],
            handR: [-0.95, 0.35, 0.05],
            shoulderL: [-0.65, 0.25, 0.15],
            elbowL: [-0.95, 0, 0],
            handL: [-0.85, 0.25, 0.05],
            hipL: [0.15, 0, 0.05],
            kneeL: [0.32, 0, 0],
            hipR: [-0.35, 0, -0.05],
            kneeR: [0.45, 0, 0]
          }
        }
      },
      attack2: {
        name: 'Diagonal Wheel Cleave',
        duration: 0.68,
        phases: { windup: [0.00, 0.22], strike: [0.22, 0.42], recovery: [0.42, 0.68] },
        hitWindow: [0.25, 0.40],
        trailWindow: [0.23, 0.43],
        hitStop: 0.08,
        cameraShake: 0.24,
        twoHandWeight: 1.0,
        impactTime: 0.32,
        keyframes: {
          windup: {
            hips: { pos: [0, -0.08, -0.05], rot: [-0.04, 0.45, 0] },
            torso: [0.15, 0.40, 0],
            chest: [0.12, 0.35, 0],
            shoulderR: [-0.35, -0.45, -0.32],
            elbowR: [-0.75, 0, 0],
            handR: [-0.65, -0.35, 0.15],
            shoulderL: [-0.55, -0.25, -0.15],
            elbowL: [-1.05, 0, 0],
            handL: [-0.55, -0.25, 0.15],
            hipL: [-0.52, 0, 0.06],
            kneeL: [0.65, 0, 0],
            hipR: [0.25, 0, -0.06],
            kneeR: [0.32, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.03, 0.14], rot: [0.08, -0.52, 0] },
            torso: [-0.08, -0.48, 0],
            chest: [-0.10, -0.42, 0],
            shoulderR: [-1.58, 0.42, -0.25],
            elbowR: [-0.35, 0, 0],
            handR: [-1.45, 0.25, 0.0],
            shoulderL: [-1.35, 0.35, -0.18],
            elbowL: [-0.55, 0, 0],
            handL: [-1.35, 0.18, 0.0],
            hipL: [0.25, 0, 0.05],
            kneeL: [0.25, 0, 0],
            hipR: [-0.55, 0, -0.06],
            kneeR: [0.68, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.02, 0.06], rot: [0.03, -0.25, 0] },
            torso: [0.02, -0.20, 0],
            chest: [0.01, -0.16, 0],
            shoulderR: [-1.15, 0.20, -0.18],
            elbowR: [-0.85, 0, 0],
            handR: [-1.05, 0.10, 0.05],
            shoulderL: [-0.95, 0.20, -0.12],
            elbowL: [-0.95, 0, 0],
            handL: [-0.95, 0.10, 0.05],
            hipL: [-0.05, 0, 0.04],
            kneeL: [0.30, 0, 0],
            hipR: [-0.30, 0, -0.05],
            kneeR: [0.40, 0, 0]
          }
        }
      },
      attack3: {
        name: 'Earth-Shattering Overhead Slam',
        duration: 0.78,
        phases: { windup: [0.00, 0.28], strike: [0.28, 0.50], recovery: [0.50, 0.78] },
        hitWindow: [0.30, 0.48],
        trailWindow: [0.29, 0.52],
        hitStop: 0.11,
        cameraShake: 0.35,
        twoHandWeight: 1.0,
        impactTime: 0.38,
        keyframes: {
          windup: {
            hips: { pos: [0, 0.06, -0.08], rot: [-0.15, -0.12, 0] },
            torso: [-0.25, -0.08, 0],
            chest: [-0.28, -0.10, 0],
            shoulderR: [-1.92, -0.12, 0.10],
            elbowR: [-0.55, 0, 0],
            handR: [-0.85, 0.0, 0.0],
            shoulderL: [-1.82, 0.12, -0.10],
            elbowL: [-0.65, 0, 0],
            handL: [-0.85, 0.0, 0.0],
            hipL: [-0.52, 0, 0.06],
            kneeL: [0.75, 0, 0],
            hipR: [0.38, 0, -0.06],
            kneeR: [0.32, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.12, 0.28], rot: [0.18, 0.0, 0] },
            torso: [0.45, 0.0, 0],
            chest: [0.38, 0.0, 0],
            shoulderR: [-0.68, 0.06, 0.0],
            elbowR: [-0.25, 0, 0],
            handR: [-1.52, 0.0, 0.0],
            shoulderL: [-0.62, -0.06, 0.0],
            elbowL: [-0.35, 0, 0],
            handL: [-1.52, 0.0, 0.0],
            hipL: [0.45, 0, 0.08],
            kneeL: [0.28, 0, 0],
            hipR: [-0.75, 0, -0.08],
            kneeR: [0.85, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.06, 0.15], rot: [0.08, 0.0, 0] },
            torso: [0.22, 0.0, 0],
            chest: [0.18, 0.0, 0],
            shoulderR: [-0.58, 0.04, 0.0],
            elbowR: [-0.65, 0, 0],
            handR: [-1.25, 0.0, 0.0],
            shoulderL: [-0.52, -0.04, 0.0],
            elbowL: [-0.75, 0, 0],
            handL: [-1.25, 0.0, 0.0],
            hipL: [0.22, 0, 0.05],
            kneeL: [0.35, 0, 0],
            hipR: [-0.45, 0, -0.05],
            kneeR: [0.55, 0, 0]
          }
        }
      }
    },
    block: {
      twoHandWeight: 1.0,
      pose: {
        hips: { pos: [0, -0.06, 0], rot: [0.08, -0.18, 0] },
        torso: [0.14, -0.15, 0],
        chest: [0.12, -0.12, 0],
        shoulderR: [-0.85, -0.15, -0.15],
        elbowR: [-1.25, 0, 0],
        handR: [-1.35, -0.15, 0.10],
        shoulderL: [-0.75, 0.25, 0.18],
        elbowL: [-1.35, 0, 0],
        handL: [-1.25, 0.15, 0.10],
        hipL: [-0.35, 0, 0.08],
        kneeL: [0.45, 0, 0],
        hipR: [0.32, 0, -0.08],
        kneeR: [0.40, 0, 0]
      }
    },
    training: {
      cycleDuration: 1.65,
      twoHandWeight: 1.0,
      keyframes: [
        { t: 0.00, ease: 'easeInOutSine', pose: { shoulderR: [-1.25, -0.32, -0.20], elbowR: [-1.48, 0, 0], handR: [-0.30, -0.32, 0.12], torso: [0.05, -0.15, 0] } },
        { t: 0.45, ease: 'easeOutBack', pose: { shoulderR: [-0.95, 0.55, 0.32], elbowR: [-0.45, 0, 0], handR: [-1.25, 0.65, 0.0], torso: [0.18, 0.55, 0] } },
        { t: 0.90, ease: 'easeInOutSine', pose: { shoulderR: [-0.35, -0.45, -0.32], elbowR: [-0.75, 0, 0], handR: [-0.65, -0.35, 0.15], torso: [0.15, 0.40, 0] } },
        { t: 1.35, ease: 'easeOutCubic', pose: { shoulderR: [-1.58, 0.42, -0.25], elbowR: [-0.35, 0, 0], handR: [-1.45, 0.25, 0.0], torso: [-0.08, -0.48, 0] } },
        { t: 1.65, ease: 'easeInOutSine', pose: { shoulderR: [-1.25, -0.32, -0.20], elbowR: [-1.48, 0, 0], handR: [-0.30, -0.32, 0.12], torso: [0.05, -0.15, 0] } }
      ]
    }
  },

  // ---------------------------------------------------------------------------
  // 3.3 SPEAR (Forward Guard & Piston Thrusts)
  // ---------------------------------------------------------------------------
  spear: {
    kind: 'spear',
    gripType: 'twoHand',
    primaryHand: 'R',
    offHandGripLocal: [0, -0.42, 0],
    hold: {
      basePose: {
        hips: { pos: [0, -0.03, 0], rot: [0.04, -0.35, 0] },
        torso: [0.06, -0.22, 0],
        chest: [0.05, -0.20, 0],
        neck: [-0.03, 0.22, 0],
        head: [-0.02, 0.28, 0],
        shoulderR: [-0.25, -0.15, -0.12],
        elbowR: [-0.85, 0, 0],
        handR: [-1.48, -0.08, 0.0],
        shoulderL: [-0.65, 0.18, 0.15],
        elbowL: [-0.75, 0, 0],
        handL: [-1.35, 0.05, 0.0],
        hipL: [-0.28, 0, 0.06],
        kneeL: [0.38, 0, 0],
        hipR: [0.28, 0, -0.06],
        kneeR: [0.30, 0, 0]
      },
      bobAmp: 0.014,
      swayAmp: 0.030,
      twoHandWeight: 1.0
    },
    attacks: {
      attack1: {
        name: 'Mid-Line Piston Thrust',
        duration: 0.44,
        phases: { windup: [0.00, 0.12], strike: [0.12, 0.24], recovery: [0.24, 0.44] },
        hitWindow: [0.14, 0.24],
        trailWindow: [0.13, 0.25],
        hitStop: 0.05,
        cameraShake: 0.16,
        twoHandWeight: 1.0,
        impactTime: 0.19,
        keyframes: {
          windup: {
            hips: { pos: [0, -0.04, -0.06], rot: [0.05, -0.45, 0] },
            torso: [0.08, -0.35, 0],
            chest: [0.06, -0.30, 0],
            shoulderR: [-0.08, -0.25, -0.18],
            elbowR: [-1.35, 0, 0],
            handR: [-1.45, -0.12, 0.0],
            shoulderL: [-0.55, 0.15, 0.12],
            elbowL: [-0.95, 0, 0],
            handL: [-1.32, 0.05, 0.0],
            hipL: [-0.38, 0, 0.06],
            kneeL: [0.48, 0, 0],
            hipR: [0.32, 0, -0.06],
            kneeR: [0.36, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.04, 0.18], rot: [0.06, 0.15, 0] },
            torso: [0.15, 0.12, 0],
            chest: [0.12, 0.10, 0],
            shoulderR: [-0.95, -0.05, 0.0],
            elbowR: [-0.15, 0, 0],
            handR: [-1.52, 0.0, 0.0],
            shoulderL: [-0.85, 0.05, 0.05],
            elbowL: [-0.35, 0, 0],
            handL: [-1.48, 0.0, 0.0],
            hipL: [0.30, 0, 0.05],
            kneeL: [0.25, 0, 0],
            hipR: [-0.52, 0, -0.06],
            kneeR: [0.65, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.03, 0.08], rot: [0.04, -0.15, 0] },
            torso: [0.08, -0.10, 0],
            chest: [0.06, -0.08, 0],
            shoulderR: [-0.55, -0.10, -0.08],
            elbowR: [-0.65, 0, 0],
            handR: [-1.48, -0.05, 0.0],
            shoulderL: [-0.72, 0.12, 0.10],
            elbowL: [-0.62, 0, 0],
            handL: [-1.40, 0.02, 0.0],
            hipL: [0.10, 0, 0.04],
            kneeL: [0.30, 0, 0],
            hipR: [-0.28, 0, -0.04],
            kneeR: [0.40, 0, 0]
          }
        }
      },
      attack2: {
        name: 'Low Sweep to High Thrust',
        duration: 0.46,
        phases: { windup: [0.00, 0.13], strike: [0.13, 0.26], recovery: [0.26, 0.46] },
        hitWindow: [0.15, 0.25],
        trailWindow: [0.14, 0.27],
        hitStop: 0.055,
        cameraShake: 0.18,
        twoHandWeight: 1.0,
        impactTime: 0.20,
        keyframes: {
          windup: {
            hips: { pos: [0, -0.07, -0.03], rot: [0.10, -0.40, 0] },
            torso: [0.18, -0.35, 0],
            chest: [0.14, -0.30, 0],
            shoulderR: [-0.15, -0.40, -0.22],
            elbowR: [-0.95, 0, 0],
            handR: [-1.25, -0.25, 0.10],
            shoulderL: [-0.48, 0.18, 0.15],
            elbowL: [-0.95, 0, 0],
            handL: [-1.20, 0.10, 0.0],
            hipL: [-0.45, 0, 0.08],
            kneeL: [0.58, 0, 0],
            hipR: [0.28, 0, -0.08],
            kneeR: [0.32, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.02, 0.14], rot: [0.02, 0.35, 0] },
            torso: [-0.05, 0.28, 0],
            chest: [-0.08, 0.25, 0],
            shoulderR: [-1.35, 0.35, 0.15],
            elbowR: [-0.25, 0, 0],
            handR: [-1.55, 0.15, 0.0],
            shoulderL: [-1.05, 0.25, 0.10],
            elbowL: [-0.45, 0, 0],
            handL: [-1.48, 0.10, 0.0],
            hipL: [0.22, 0, 0.05],
            kneeL: [0.22, 0, 0],
            hipR: [-0.48, 0, -0.05],
            kneeR: [0.60, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.02, 0.06], rot: [0.02, 0.15, 0] },
            torso: [0.02, 0.10, 0],
            chest: [0.01, 0.08, 0],
            shoulderR: [-0.85, 0.15, 0.05],
            elbowR: [-0.65, 0, 0],
            handR: [-1.48, 0.05, 0.0],
            shoulderL: [-0.78, 0.15, 0.08],
            elbowL: [-0.68, 0, 0],
            handL: [-1.40, 0.05, 0.0],
            hipL: [0.05, 0, 0.04],
            kneeL: [0.28, 0, 0],
            hipR: [-0.25, 0, -0.04],
            kneeR: [0.38, 0, 0]
          }
        }
      },
      attack3: {
        name: 'Vaulting Downward Piercing Cleave',
        duration: 0.54,
        phases: { windup: [0.00, 0.16], strike: [0.16, 0.32], recovery: [0.32, 0.54] },
        hitWindow: [0.18, 0.30],
        trailWindow: [0.17, 0.33],
        hitStop: 0.075,
        cameraShake: 0.22,
        twoHandWeight: 1.0,
        impactTime: 0.24,
        keyframes: {
          windup: {
            hips: { pos: [0, 0.04, -0.05], rot: [-0.10, -0.22, 0] },
            torso: [-0.20, -0.15, 0],
            chest: [-0.22, -0.12, 0],
            shoulderR: [-1.85, -0.12, 0.10],
            elbowR: [-0.55, 0, 0],
            handR: [-1.45, 0.0, 0.0],
            shoulderL: [-1.55, 0.15, 0.12],
            elbowL: [-0.75, 0, 0],
            handL: [-1.35, 0.0, 0.0],
            hipL: [-0.48, 0, 0.06],
            kneeL: [0.68, 0, 0],
            hipR: [0.35, 0, -0.06],
            kneeR: [0.28, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.08, 0.22], rot: [0.14, 0.0, 0] },
            torso: [0.38, 0.0, 0],
            chest: [0.32, 0.0, 0],
            shoulderR: [-0.75, 0.05, 0.0],
            elbowR: [-0.25, 0, 0],
            handR: [-1.52, 0.0, 0.0],
            shoulderL: [-0.85, 0.02, 0.0],
            elbowL: [-0.45, 0, 0],
            handL: [-1.48, 0.0, 0.0],
            hipL: [0.38, 0, 0.06],
            kneeL: [0.25, 0, 0],
            hipR: [-0.68, 0, -0.06],
            kneeR: [0.78, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.04, 0.12], rot: [0.06, 0.0, 0] },
            torso: [0.15, 0.0, 0],
            chest: [0.12, 0.0, 0],
            shoulderR: [-0.55, 0.02, 0.0],
            elbowR: [-0.65, 0, 0],
            handR: [-1.48, 0.0, 0.0],
            shoulderL: [-0.72, 0.05, 0.0],
            elbowL: [-0.65, 0, 0],
            handL: [-1.40, 0.0, 0.0],
            hipL: [0.15, 0, 0.04],
            kneeL: [0.32, 0, 0],
            hipR: [-0.35, 0, -0.04],
            kneeR: [0.45, 0, 0]
          }
        }
      }
    },
    block: {
      twoHandWeight: 1.0,
      pose: {
        hips: { pos: [0, -0.05, 0], rot: [0.06, -0.30, 0] },
        torso: [0.12, -0.25, 0],
        chest: [0.10, -0.22, 0],
        shoulderR: [-0.65, -0.15, -0.12],
        elbowR: [-1.15, 0, 0],
        handR: [-1.48, -0.15, 0.0],
        shoulderL: [-0.85, 0.25, 0.18],
        elbowL: [-1.05, 0, 0],
        handL: [-1.42, 0.15, 0.0],
        hipL: [-0.36, 0, 0.08],
        kneeL: [0.48, 0, 0],
        hipR: [0.30, 0, -0.08],
        kneeR: [0.38, 0, 0]
      }
    },
    training: {
      cycleDuration: 1.45,
      twoHandWeight: 1.0,
      keyframes: [
        { t: 0.00, ease: 'easeInOutSine', pose: { shoulderR: [-0.25, -0.15, -0.12], elbowR: [-0.85, 0, 0], handR: [-1.48, -0.08, 0.0], torso: [0.06, -0.22, 0] } },
        { t: 0.35, ease: 'easeOutBack', pose: { shoulderR: [-0.95, -0.05, 0.0], elbowR: [-0.15, 0, 0], handR: [-1.52, 0.0, 0.0], torso: [0.15, 0.12, 0] } },
        { t: 0.75, ease: 'easeInOutSine', pose: { shoulderR: [-0.08, -0.25, -0.18], elbowR: [-1.35, 0, 0], handR: [-1.45, -0.12, 0.0], torso: [0.08, -0.35, 0] } },
        { t: 1.10, ease: 'easeOutCubic', pose: { shoulderR: [-1.35, 0.35, 0.15], elbowR: [-0.25, 0, 0], handR: [-1.55, 0.15, 0.0], torso: [-0.05, 0.28, 0] } },
        { t: 1.45, ease: 'easeInOutSine', pose: { shoulderR: [-0.25, -0.15, -0.12], elbowR: [-0.85, 0, 0], handR: [-1.48, -0.08, 0.0], torso: [0.06, -0.22, 0] } }
      ]
    }
  },

  // ---------------------------------------------------------------------------
  // 3.4 DAGGER (Assassin Low Crouch & Forward Slashes)
  // ---------------------------------------------------------------------------
  dagger: {
    kind: 'dagger',
    gripType: 'oneHand',
    primaryHand: 'R',
    offHandGripLocal: [0, 0.08, 0],
    hold: {
      basePose: {
        hips: { pos: [0, -0.05, 0], rot: [0.06, -0.25, 0] },
        torso: [0.10, -0.18, 0],
        chest: [0.08, -0.15, 0],
        neck: [-0.04, 0.18, 0],
        head: [-0.02, 0.22, 0],
        shoulderR: [-0.25, -0.20, -0.15],
        elbowR: [-1.05, 0, 0],
        handR: [-0.75, -0.15, 0.15],
        shoulderL: [-0.45, 0.25, 0.22],
        elbowL: [-1.15, 0, 0],
        handL: [0.20, 0.35, -0.15],
        hipL: [-0.32, 0, 0.06],
        kneeL: [0.44, 0, 0],
        hipR: [0.28, 0, -0.06],
        kneeR: [0.38, 0, 0]
      },
      bobAmp: 0.012,
      swayAmp: 0.035,
      twoHandWeight: 0.0
    },
    attacks: {
      attack1: {
        name: 'Viper Throat Slash',
        duration: 0.36,
        phases: { windup: [0.00, 0.10], strike: [0.10, 0.22], recovery: [0.22, 0.36] },
        hitWindow: [0.12, 0.21],
        trailWindow: [0.11, 0.23],
        hitStop: 0.035,
        cameraShake: 0.12,
        twoHandWeight: 0.0,
        impactTime: 0.16,
        keyframes: {
          windup: {
            hips: { pos: [0, -0.06, -0.04], rot: [0.08, -0.42, 0] },
            torso: [0.12, -0.38, 0],
            chest: [0.10, -0.32, 0],
            shoulderR: [-0.35, -0.55, -0.45],
            elbowR: [-1.25, 0, 0],
            handR: [-0.55, -0.25, 0.22],
            shoulderL: [-0.35, 0.35, 0.25],
            elbowL: [-1.25, 0, 0],
            handL: [0.15, 0.40, -0.18],
            hipL: [-0.42, 0, 0.06],
            kneeL: [0.55, 0, 0],
            hipR: [0.28, 0, -0.06],
            kneeR: [0.38, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.06, 0.14], rot: [0.04, 0.45, 0] },
            torso: [0.15, 0.42, 0],
            chest: [0.12, 0.38, 0],
            shoulderR: [-0.85, 0.55, 0.25],
            elbowR: [-0.45, 0, 0],
            handR: [-1.35, 0.65, 0.0],
            shoulderL: [-0.45, -0.25, 0.10],
            elbowL: [-1.05, 0, 0],
            handL: [0.15, 0.25, -0.12],
            hipL: [0.22, 0, 0.05],
            kneeL: [0.25, 0, 0],
            hipR: [-0.45, 0, -0.06],
            kneeR: [0.58, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.04, 0.06], rot: [0.03, 0.20, 0] },
            torso: [0.08, 0.18, 0],
            chest: [0.06, 0.15, 0],
            shoulderR: [-0.55, 0.35, 0.15],
            elbowR: [-0.85, 0, 0],
            handR: [-0.95, 0.25, 0.08],
            shoulderL: [-0.40, 0.20, 0.18],
            elbowL: [-1.15, 0, 0],
            handL: [0.18, 0.32, -0.15],
            hipL: [0.05, 0, 0.04],
            kneeL: [0.32, 0, 0],
            hipR: [-0.22, 0, -0.05],
            kneeR: [0.42, 0, 0]
          }
        }
      },
      attack2: {
        name: 'Kidney Piston Thrust',
        duration: 0.38,
        phases: { windup: [0.00, 0.11], strike: [0.11, 0.23], recovery: [0.23, 0.38] },
        hitWindow: [0.13, 0.22],
        trailWindow: [0.12, 0.24],
        hitStop: 0.035,
        cameraShake: 0.14,
        twoHandWeight: 0.0,
        impactTime: 0.17,
        keyframes: {
          windup: {
            hips: { pos: [0, -0.06, -0.03], rot: [0.05, 0.28, 0] },
            torso: [0.10, 0.25, 0],
            chest: [0.08, 0.22, 0],
            shoulderR: [-0.15, -0.25, -0.18],
            elbowR: [-1.25, 0, 0],
            handR: [-0.85, -0.15, 0.12],
            shoulderL: [-0.42, -0.12, 0.15],
            elbowL: [-1.15, 0, 0],
            handL: [0.18, 0.35, -0.15],
            hipL: [-0.45, 0, 0.06],
            kneeL: [0.55, 0, 0],
            hipR: [0.22, 0, -0.06],
            kneeR: [0.28, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.04, 0.16], rot: [0.08, -0.35, 0] },
            torso: [0.12, -0.32, 0],
            chest: [0.10, -0.28, 0],
            shoulderR: [-1.15, 0.15, -0.10],
            elbowR: [-0.15, 0, 0],
            handR: [-1.48, 0.10, 0.0],
            shoulderL: [-0.35, 0.25, 0.20],
            elbowL: [-1.22, 0, 0],
            handL: [0.18, 0.40, -0.18],
            hipL: [0.25, 0, 0.05],
            kneeL: [0.22, 0, 0],
            hipR: [-0.52, 0, -0.06],
            kneeR: [0.65, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.03, 0.06], rot: [0.03, -0.15, 0] },
            torso: [0.05, -0.12, 0],
            chest: [0.04, -0.10, 0],
            shoulderR: [-0.75, 0.08, -0.08],
            elbowR: [-0.65, 0, 0],
            handR: [-1.15, 0.05, 0.05],
            shoulderL: [-0.40, 0.20, 0.18],
            elbowL: [-1.15, 0, 0],
            handL: [0.18, 0.35, -0.15],
            hipL: [0.05, 0, 0.04],
            kneeL: [0.30, 0, 0],
            hipR: [-0.25, 0, -0.05],
            kneeR: [0.40, 0, 0]
          }
        }
      },
      attack3: {
        name: 'Spinning Double Flurry',
        duration: 0.46,
        phases: { windup: [0.00, 0.13], strike: [0.13, 0.26], recovery: [0.26, 0.46] },
        hitWindow: [0.15, 0.25],
        trailWindow: [0.14, 0.27],
        hitStop: 0.05,
        cameraShake: 0.18,
        twoHandWeight: 0.0,
        impactTime: 0.19,
        keyframes: {
          windup: {
            hips: { pos: [0, -0.08, -0.05], rot: [-0.05, -0.55, 0] },
            torso: [0.12, -0.48, 0],
            chest: [0.10, -0.42, 0],
            shoulderR: [-0.55, -0.65, -0.55],
            elbowR: [-1.35, 0, 0],
            handR: [-0.65, -0.35, 0.25],
            shoulderL: [-0.55, 0.25, 0.22],
            elbowL: [-1.25, 0, 0],
            handL: [0.15, 0.42, -0.18],
            hipL: [-0.52, 0, 0.08],
            kneeL: [0.68, 0, 0],
            hipR: [0.32, 0, -0.08],
            kneeR: [0.35, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.04, 0.18], rot: [0.08, 0.55, 0] },
            torso: [0.20, 0.50, 0],
            chest: [0.18, 0.45, 0],
            shoulderR: [-1.15, 0.55, 0.28],
            elbowR: [-0.35, 0, 0],
            handR: [-1.45, 0.65, 0.0],
            shoulderL: [-0.65, -0.20, 0.12],
            elbowL: [-0.85, 0, 0],
            handL: [0.15, 0.32, -0.15],
            hipL: [0.28, 0, 0.06],
            kneeL: [0.25, 0, 0],
            hipR: [-0.55, 0, -0.06],
            kneeR: [0.68, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.03, 0.08], rot: [0.04, 0.25, 0] },
            torso: [0.08, 0.22, 0],
            chest: [0.06, 0.18, 0],
            shoulderR: [-0.65, 0.35, 0.15],
            elbowR: [-0.85, 0, 0],
            handR: [-1.05, 0.25, 0.05],
            shoulderL: [-0.45, 0.18, 0.15],
            elbowL: [-1.15, 0, 0],
            handL: [0.18, 0.35, -0.15],
            hipL: [0.10, 0, 0.05],
            kneeL: [0.32, 0, 0],
            hipR: [-0.30, 0, -0.05],
            kneeR: [0.42, 0, 0]
          }
        }
      }
    },
    block: {
      twoHandWeight: 0.0,
      pose: {
        hips: { pos: [0, -0.06, 0], rot: [0.08, -0.28, 0] },
        torso: [0.14, -0.22, 0],
        chest: [0.12, -0.18, 0],
        shoulderR: [-0.55, -0.18, -0.18],
        elbowR: [-1.25, 0, 0],
        handR: [-0.95, -0.18, 0.18],
        shoulderL: [-0.65, 0.25, 0.22],
        elbowL: [-1.35, 0, 0],
        handL: [0.25, 0.45, -0.20],
        hipL: [-0.38, 0, 0.08],
        kneeL: [0.52, 0, 0],
        hipR: [0.28, 0, -0.08],
        kneeR: [0.38, 0, 0]
      }
    },
    training: {
      cycleDuration: 1.15,
      twoHandWeight: 0.0,
      keyframes: [
        { t: 0.00, ease: 'easeInOutSine', pose: { shoulderR: [-0.25, -0.20, -0.15], elbowR: [-1.05, 0, 0], handR: [-0.75, -0.15, 0.15], torso: [0.10, -0.18, 0] } },
        { t: 0.28, ease: 'easeOutBack', pose: { shoulderR: [-0.85, 0.55, 0.25], elbowR: [-0.45, 0, 0], handR: [-1.35, 0.65, 0.0], torso: [0.15, 0.42, 0] } },
        { t: 0.58, ease: 'easeInOutSine', pose: { shoulderR: [-0.15, -0.25, -0.18], elbowR: [-1.25, 0, 0], handR: [-0.85, -0.15, 0.12], torso: [0.10, 0.25, 0] } },
        { t: 0.88, ease: 'easeOutCubic', pose: { shoulderR: [-1.15, 0.15, -0.10], elbowR: [-0.15, 0, 0], handR: [-1.48, 0.10, 0.0], torso: [0.12, -0.32, 0] } },
        { t: 1.15, ease: 'easeInOutSine', pose: { shoulderR: [-0.25, -0.20, -0.15], elbowR: [-1.05, 0, 0], handR: [-0.75, -0.15, 0.15], torso: [0.10, -0.18, 0] } }
      ]
    }
  },

  // ---------------------------------------------------------------------------
  // 3.5 BOW (Authentic Archer Side-On Stance & 6-Phase Draw Engine)
  // ---------------------------------------------------------------------------
  bow: {
    kind: 'bow',
    gripType: 'bow',
    primaryHand: 'L',
    offHandGripLocal: [0, 0, -0.13],
    nockRestLocal: [0, 0, -0.13],
    cheekAnchorLocal: [-0.08, 0.36, -0.02],
    elbowPole: [-0.60, 0.35, -0.75],
    hold: {
      // A.1 Relaxed Low Carry
      basePose: {
        hips: { pos: [0.00, -0.01, 0.00], rot: [0.02, -0.18, 0.00] },
        torso: [0.03, 0.08, 0.00],
        chest: [0.03, 0.10, 0.00],
        neck: [-0.03, 0.00, 0.00],
        head: [-0.03, 0.00, 0.00],
        shoulderL: [0.08, -0.05, 0.14],
        elbowL: [-0.28, 0.00, 0.00],
        handL: [1.32, 0.08, -0.12], // tilts bow horizontally along left thigh so limbs never clip floor
        shoulderR: [0.06, 0.04, -0.12],
        elbowR: [-0.22, 0.00, 0.00],
        handR: [0.10, 0.00, 0.00],
        hipL: [-0.10, 0.00, 0.04],
        kneeL: [0.18, 0.00, 0.00],
        hipR: [0.12, 0.00, -0.04],
        kneeR: [0.16, 0.00, 0.00]
      },
      bobAmp: 0.012,
      swayAmp: 0.025,
      twoHandWeight: 0.0
    },
    // A.2 Side-On Archery Ready Stance (Orthogonal Cancellation: net yaw facing +Z, bow upright +Y)
    aimReady: {
      hips: { pos: [0.00, -0.04, 0.00], rot: [0.04, -1.25, 0.00] },
      torso: [0.02, 0.20, -0.02],
      chest: [0.02, 0.15, -0.02],
      neck: [-0.02, 0.35, 0.02],
      head: [-0.02, 0.55, 0.03],
      shoulderL: [-1.51, 0.00, 0.90],
      elbowL: [-0.06, 0.00, 0.00],
      handL: [1.57, 0.00, -0.06], // bow upright +Y, arrow shelf +Z
      shoulderR: [-0.45, -0.25, -0.35],
      elbowR: [-1.05, 0.00, 0.00],
      handR: [0.25, 0.15, 0.00],
      hipL: [-0.22, 0.25, 0.08],
      kneeL: [0.26, 0.00, 0.00],
      hipR: [0.24, -0.15, -0.08],
      kneeR: [0.28, 0.00, 0.00]
    },
    // Distinct Archery Phase Keyframes (B.2)
    phases: {
      reach: {
        hips: { pos: [0, -0.03, 0], rot: [0.04, -1.05, 0] },
        torso: [0.04, 0.16, 0],
        chest: [0.04, 0.14, 0],
        neck: [-0.02, 0.30, 0],
        head: [0.05, 0.45, 0],
        shoulderL: [-0.95, 0.00, 0.75],
        elbowL: [-0.25, 0.00, 0.00],
        handL: [1.40, 0.00, -0.08],
        shoulderR: [0.28, -0.35, -0.25], // reaching to hip quiver
        elbowR: [-1.15, 0.00, 0.00],
        handR: [0.35, 0.20, 0.00],
        hipL: [-0.20, 0.22, 0.08],
        kneeL: [0.24, 0, 0],
        hipR: [0.20, -0.12, -0.08],
        kneeR: [0.26, 0, 0]
      },
      nock: {
        hips: { pos: [0, -0.04, 0], rot: [0.04, -1.18, 0] },
        torso: [0.03, 0.18, 0],
        chest: [0.03, 0.15, 0],
        neck: [-0.02, 0.32, 0],
        head: [0.02, 0.50, 0],
        shoulderL: [-1.15, 0.00, 0.82],
        elbowL: [-0.18, 0.00, 0.00],
        handL: [1.48, 0.00, -0.06],
        shoulderR: [-1.12, 0.35, -0.45], // at nock point
        elbowR: [-0.85, 0.00, 0.00],
        handR: [0.10, 0.45, 0.00],
        hipL: [-0.22, 0.25, 0.08],
        kneeL: [0.26, 0, 0],
        hipR: [0.22, -0.14, -0.08],
        kneeR: [0.28, 0, 0]
      },
      raise: {
        hips: { pos: [0, -0.04, 0], rot: [0.04, -1.25, 0] },
        torso: [0.02, 0.20, -0.02],
        chest: [0.02, 0.15, -0.02],
        neck: [-0.02, 0.35, 0.02],
        head: [-0.02, 0.55, 0.03],
        shoulderL: [-1.51, 0.00, 0.90],
        elbowL: [-0.06, 0.00, 0.00],
        handL: [1.57, 0.00, -0.06],
        shoulderR: [-1.38, 0.25, -0.78],
        elbowR: [-0.95, 0.00, 0.00],
        handR: [0.05, 0.50, 0.00],
        hipL: [-0.22, 0.25, 0.08],
        kneeL: [0.26, 0, 0],
        hipR: [0.24, -0.15, -0.08],
        kneeR: [0.28, 0, 0]
      },
      fullDraw: {
        hips: { pos: [0, -0.05, 0], rot: [0.02, -1.28, 0] },
        torso: [0.00, 0.22, -0.03],
        chest: [-0.02, 0.16, -0.03],
        neck: [0.00, 0.36, 0.03],
        head: [0.02, 0.56, 0.04],
        shoulderL: [-1.51, 0.00, 0.90],
        elbowL: [-0.05, 0.00, 0.00],
        handL: [1.57, 0.00, -0.06],
        shoulderR: [-1.42, -0.38, -1.28], // high horizontal elbow
        elbowR: [-1.48, 0.00, 0.00],
        handR: [0.00, 0.55, 0.00],
        hipL: [-0.24, 0.26, 0.08],
        kneeL: [0.28, 0, 0],
        hipR: [0.26, -0.16, -0.08],
        kneeR: [0.30, 0, 0]
      },
      release: {
        hips: { pos: [0, -0.05, -0.02], rot: [0.00, -1.30, 0] },
        torso: [-0.02, 0.24, -0.03],
        chest: [-0.04, 0.18, -0.04],
        neck: [-0.02, 0.38, 0.03],
        head: [0.00, 0.58, 0.05],
        shoulderL: [-1.54, 0.00, 0.92],
        elbowL: [-0.04, 0.00, 0.00],
        handL: [1.62, 0.00, -0.06],
        shoulderR: [-1.36, -0.58, -1.38], // 4cm recoil backward along jawline
        elbowR: [-1.52, 0.00, 0.00],
        handR: [-0.35, 0.65, 0.15], // fingers open
        hipL: [-0.24, 0.26, 0.08],
        kneeL: [0.28, 0, 0],
        hipR: [0.26, -0.16, -0.08],
        kneeR: [0.30, 0, 0]
      },
      vibrate: {
        hips: { pos: [0, -0.04, 0], rot: [0.03, -1.25, 0] },
        torso: [0.02, 0.20, -0.02],
        chest: [0.02, 0.15, -0.02],
        neck: [-0.02, 0.35, 0.02],
        head: [-0.02, 0.55, 0.03],
        shoulderL: [-1.44, 0.00, 0.88],
        elbowL: [-0.10, 0.00, 0.00],
        handL: [1.72, 0.00, -0.08], // bow forward dip
        shoulderR: [-0.85, -0.30, -0.65],
        elbowR: [-1.05, 0.00, 0.00],
        handR: [0.15, 0.25, 0.00],
        hipL: [-0.22, 0.25, 0.08],
        kneeL: [0.26, 0, 0],
        hipR: [0.24, -0.15, -0.08],
        kneeR: [0.28, 0, 0]
      }
    },
    attacks: {
      attack1: {
        name: 'Quick Archer Snapshot',
        duration: 0.48,
        phases: { windup: [0.00, 0.20], strike: [0.20, 0.32], recovery: [0.32, 0.48] },
        hitWindow: [0.20, 0.30],
        trailWindow: [0.20, 0.32],
        hitStop: 0.02,
        cameraShake: 0.10,
        twoHandWeight: 0.0,
        bowDrawDist: 0.22,
        impactTime: 0.20,
        keyframes: {
          windup: {
            hips: { pos: [0, -0.04, 0], rot: [0.04, -1.25, 0] },
            torso: [0.02, 0.20, -0.02],
            chest: [0.02, 0.15, -0.02],
            head: [-0.02, 0.55, 0.03],
            shoulderL: [-1.51, 0.00, 0.90],
            elbowL: [-0.06, 0, 0],
            handL: [1.57, 0, -0.06],
            shoulderR: [-1.38, 0.05, -1.05],
            elbowR: [-1.35, 0, 0],
            handR: [0.05, 0.52, 0],
            hipL: [-0.22, 0.25, 0.08],
            kneeL: [0.26, 0, 0],
            hipR: [0.24, -0.15, -0.08],
            kneeR: [0.28, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.05, -0.02], rot: [0.00, -1.30, 0] },
            torso: [-0.02, 0.24, -0.03],
            chest: [-0.04, 0.18, -0.04],
            head: [0.00, 0.58, 0.05],
            shoulderL: [-1.54, 0.00, 0.92],
            elbowL: [-0.04, 0, 0],
            handL: [1.62, 0, -0.06],
            shoulderR: [-1.36, -0.58, -1.38],
            elbowR: [-1.52, 0, 0],
            handR: [-0.35, 0.65, 0.15],
            hipL: [-0.24, 0.26, 0.08],
            kneeL: [0.28, 0, 0],
            hipR: [0.26, -0.16, -0.08],
            kneeR: [0.30, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.04, 0], rot: [0.03, -1.25, 0] },
            torso: [0.02, 0.20, -0.02],
            chest: [0.02, 0.15, -0.02],
            head: [-0.02, 0.55, 0.03],
            shoulderL: [-1.44, 0.00, 0.88],
            elbowL: [-0.10, 0, 0],
            handL: [1.72, 0, -0.08],
            shoulderR: [-0.85, -0.30, -0.65],
            elbowR: [-1.05, 0, 0],
            handR: [0.15, 0.25, 0],
            hipL: [-0.22, 0.25, 0.08],
            kneeL: [0.26, 0, 0],
            hipR: [0.24, -0.15, -0.08],
            kneeR: [0.28, 0, 0]
          }
        }
      },
      attack2: {
        name: 'Power Piercing Shot',
        duration: 0.58,
        phases: { windup: [0.00, 0.28], strike: [0.28, 0.40], recovery: [0.40, 0.58] },
        hitWindow: [0.28, 0.38],
        trailWindow: [0.28, 0.40],
        hitStop: 0.035,
        cameraShake: 0.15,
        twoHandWeight: 0.0,
        bowDrawDist: 0.38,
        impactTime: 0.28,
        keyframes: {
          windup: {
            hips: { pos: [0, -0.05, 0], rot: [0.02, -1.28, 0] },
            torso: [0.00, 0.22, -0.03],
            chest: [-0.02, 0.16, -0.03],
            head: [0.02, 0.56, 0.04],
            shoulderL: [-1.51, 0.00, 0.90],
            elbowL: [-0.05, 0, 0],
            handL: [1.57, 0, -0.06],
            shoulderR: [-1.42, -0.38, -1.28],
            elbowR: [-1.48, 0, 0],
            handR: [0.00, 0.55, 0],
            hipL: [-0.24, 0.26, 0.08],
            kneeL: [0.28, 0, 0],
            hipR: [0.26, -0.16, -0.08],
            kneeR: [0.30, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.05, -0.02], rot: [0.00, -1.30, 0] },
            torso: [-0.02, 0.24, -0.03],
            chest: [-0.04, 0.18, -0.04],
            head: [0.00, 0.58, 0.05],
            shoulderL: [-1.54, 0.00, 0.92],
            elbowL: [-0.04, 0, 0],
            handL: [1.62, 0, -0.06],
            shoulderR: [-1.36, -0.58, -1.38],
            elbowR: [-1.52, 0, 0],
            handR: [-0.35, 0.65, 0.15],
            hipL: [-0.24, 0.26, 0.08],
            kneeL: [0.28, 0, 0],
            hipR: [0.26, -0.16, -0.08],
            kneeR: [0.30, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.04, 0], rot: [0.03, -1.25, 0] },
            torso: [0.02, 0.20, -0.02],
            chest: [0.02, 0.15, -0.02],
            head: [-0.02, 0.55, 0.03],
            shoulderL: [-1.44, 0.00, 0.88],
            elbowL: [-0.10, 0, 0],
            handL: [1.74, 0, -0.08],
            shoulderR: [-0.85, -0.30, -0.65],
            elbowR: [-1.05, 0, 0],
            handR: [0.15, 0.25, 0],
            hipL: [-0.22, 0.25, 0.08],
            kneeL: [0.26, 0, 0],
            hipR: [0.24, -0.15, -0.08],
            kneeR: [0.28, 0, 0]
          }
        }
      },
      attack3: {
        name: 'Spread Volley Shot',
        duration: 0.52,
        phases: { windup: [0.00, 0.24], strike: [0.24, 0.36], recovery: [0.36, 0.52] },
        hitWindow: [0.24, 0.34],
        trailWindow: [0.24, 0.36],
        hitStop: 0.03,
        cameraShake: 0.16,
        twoHandWeight: 0.0,
        bowDrawDist: 0.32,
        impactTime: 0.24,
        keyframes: {
          windup: {
            hips: { pos: [0, -0.04, 0], rot: [0.04, -1.22, 0] },
            torso: [0.02, 0.20, -0.02],
            chest: [0.00, 0.16, -0.02],
            head: [-0.02, 0.55, 0.03],
            shoulderL: [-1.51, 0.00, 0.90],
            elbowL: [-0.05, 0, 0],
            handL: [1.57, 0, -0.06],
            shoulderR: [-1.40, -0.25, -1.20],
            elbowR: [-1.42, 0, 0],
            handR: [0.02, 0.54, 0],
            hipL: [-0.22, 0.25, 0.08],
            kneeL: [0.26, 0, 0],
            hipR: [0.24, -0.15, -0.08],
            kneeR: [0.28, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.05, -0.02], rot: [0.00, -1.30, 0] },
            torso: [-0.02, 0.24, -0.03],
            chest: [-0.04, 0.18, -0.04],
            head: [0.00, 0.58, 0.05],
            shoulderL: [-1.54, 0.00, 0.92],
            elbowL: [-0.04, 0, 0],
            handL: [1.62, 0, -0.06],
            shoulderR: [-1.36, -0.58, -1.38],
            elbowR: [-1.52, 0, 0],
            handR: [-0.35, 0.65, 0.15],
            hipL: [-0.24, 0.26, 0.08],
            kneeL: [0.28, 0, 0],
            hipR: [0.26, -0.16, -0.08],
            kneeR: [0.30, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.04, 0], rot: [0.03, -1.25, 0] },
            torso: [0.02, 0.20, -0.02],
            chest: [0.02, 0.15, -0.02],
            head: [-0.02, 0.55, 0.03],
            shoulderL: [-1.44, 0.00, 0.88],
            elbowL: [-0.10, 0, 0],
            handL: [1.70, 0, -0.08],
            shoulderR: [-0.85, -0.30, -0.65],
            elbowR: [-1.05, 0, 0],
            handR: [0.15, 0.25, 0],
            hipL: [-0.22, 0.25, 0.08],
            kneeL: [0.26, 0, 0],
            hipR: [0.24, -0.15, -0.08],
            kneeR: [0.28, 0, 0]
          }
        }
      }
    },
    block: {
      twoHandWeight: 0.0,
      pose: {
        hips: { pos: [0, -0.05, -0.08], rot: [0.08, -1.35, 0] },
        torso: [0.10, 0.20, -0.05],
        chest: [0.08, 0.18, -0.05],
        neck: [-0.02, 0.35, 0.02],
        head: [-0.04, 0.60, 0.05],
        shoulderL: [-1.20, 0.20, 0.85],
        elbowL: [-0.45, 0, 0],
        handL: [1.35, 0, -0.06], // bow held tight to chest in evasive brace
        shoulderR: [-0.75, -0.30, -0.40],
        elbowR: [-1.25, 0, 0],
        handR: [0.15, 0.10, 0],
        hipL: [-0.45, 0.25, 0.12],
        kneeL: [0.55, 0, 0],
        hipR: [0.40, -0.15, -0.12],
        kneeR: [0.45, 0, 0]
      }
    },
    training: {
      cycleDuration: 1.60,
      twoHandWeight: 0.0,
      bowDrawDist: 0.38,
      keyframes: [
        // 0.00s: Side-On Ready
        { t: 0.00, ease: 'easeInOutSine', pose: { shoulderL: [-1.51, 0, 0.90], elbowL: [-0.06, 0, 0], handL: [1.57, 0, -0.06], shoulderR: [-0.45, -0.25, -0.35], elbowR: [-1.05, 0, 0], handR: [0.25, 0.15, 0], torso: [0.02, 0.20, -0.02] } },
        // 0.15s: Reach Quiver
        { t: 0.15, ease: 'easeOutCubic', pose: { shoulderL: [-0.95, 0, 0.75], elbowL: [-0.25, 0, 0], handL: [1.40, 0, -0.08], shoulderR: [0.28, -0.35, -0.25], elbowR: [-1.15, 0, 0], handR: [0.35, 0.20, 0], torso: [0.04, 0.16, 0] } },
        // 0.35s: Seat Nock
        { t: 0.35, ease: 'easeInOutSine', pose: { shoulderL: [-1.15, 0, 0.82], elbowL: [-0.18, 0, 0], handL: [1.48, 0, -0.06], shoulderR: [-1.12, 0.35, -0.45], elbowR: [-0.85, 0, 0], handR: [0.10, 0.45, 0], torso: [0.03, 0.18, 0] } },
        // 0.60s: Raise Bow
        { t: 0.60, ease: 'easeInOutSine', pose: { shoulderL: [-1.51, 0, 0.90], elbowL: [-0.06, 0, 0], handL: [1.57, 0, -0.06], shoulderR: [-1.38, 0.25, -0.78], elbowR: [-0.95, 0, 0], handR: [0.05, 0.50, 0], torso: [0.02, 0.20, -0.02] } },
        // 1.05s: Full Draw Anchor
        { t: 1.05, ease: 'easeOutCubic', pose: { shoulderL: [-1.51, 0, 0.90], elbowL: [-0.05, 0, 0], handL: [1.57, 0, -0.06], shoulderR: [-1.42, -0.38, -1.28], elbowR: [-1.48, 0, 0], handR: [0.00, 0.55, 0], torso: [0.00, 0.22, -0.03] } },
        // 1.15s: Hold & Aim
        { t: 1.15, ease: 'easeInOutSine', pose: { shoulderL: [-1.51, 0, 0.90], elbowL: [-0.05, 0, 0], handL: [1.57, 0, -0.06], shoulderR: [-1.42, -0.38, -1.28], elbowR: [-1.48, 0, 0], handR: [0.00, 0.55, 0], torso: [0.00, 0.22, -0.03] } },
        // 1.20s: Loose / Release
        { t: 1.20, ease: 'easeInQuad', pose: { shoulderL: [-1.54, 0, 0.92], elbowL: [-0.04, 0, 0], handL: [1.62, 0, -0.06], shoulderR: [-1.36, -0.58, -1.38], elbowR: [-1.52, 0, 0], handR: [-0.35, 0.65, 0.15], torso: [-0.02, 0.24, -0.03] } },
        // 1.38s: Follow-Through & Bow Dip
        { t: 1.38, ease: 'easeOutCubic', pose: { shoulderL: [-1.44, 0, 0.88], elbowL: [-0.10, 0, 0], handL: [1.72, 0, -0.08], shoulderR: [-0.85, -0.30, -0.65], elbowR: [-1.05, 0, 0], handR: [0.15, 0.25, 0], torso: [0.02, 0.20, -0.02] } },
        // 1.60s: Settle back to Ready
        { t: 1.60, ease: 'easeInOutSine', pose: { shoulderL: [-1.51, 0, 0.90], elbowL: [-0.06, 0, 0], handL: [1.57, 0, -0.06], shoulderR: [-0.45, -0.25, -0.35], elbowR: [-1.05, 0, 0], handR: [0.25, 0.15, 0], torso: [0.02, 0.20, -0.02] } }
      ]
    }
  },

  // ---------------------------------------------------------------------------
  // 3.6 STAFF (Upright Wizard Guard & Arcane Slam)
  // ---------------------------------------------------------------------------
  staff: {
    kind: 'staff',
    gripType: 'staff',
    primaryHand: 'R',
    offHandGripLocal: [0, 0.35, 0],
    hold: {
      basePose: {
        hips: { pos: [0, -0.02, 0], rot: [0.02, -0.05, 0] },
        torso: [0.02, -0.04, 0],
        chest: [0.02, -0.04, 0],
        neck: [-0.02, 0.05, 0],
        head: [-0.02, 0.05, 0],
        shoulderR: [0.06, -0.04, -0.08],
        elbowR: [-0.08, 0, 0],
        handR: [3.071, -0.429, -0.097], // staff vertical, bottom rests ~8cm above ground, orb above head
        shoulderL: [0.05, 0.05, 0.12],
        elbowL: [-0.15, 0, 0],
        handL: [0.05, 0, 0], // left hand relaxed at side
        hipL: [-0.08, 0, 0.04],
        kneeL: [0.12, 0, 0],
        hipR: [0.08, 0, -0.04],
        kneeR: [0.12, 0, 0]
      },
      bobAmp: 0.015,
      swayAmp: 0.025,
      twoHandWeight: 0.0
    },
    castPose: {
      hips: { pos: [0, -0.03, 0.08], rot: [0.05, -0.15, 0] },
      torso: [0.10, -0.10, 0],
      chest: [0.08, -0.08, 0],
      neck: [-0.05, 0.10, 0],
      head: [-0.05, 0.12, 0],
      shoulderR: [-1.45, -0.18, 0.05], // staff raised and thrust forward
      elbowR: [-0.25, 0, 0],
      handR: [-3.00, 0.0, 0.0],
      shoulderL: [-0.95, 0.35, 0.15], // left hand free for casting
      elbowL: [-0.75, 0, 0],
      handL: [-0.40, 0.30, 0.10],
      hipL: [-0.28, 0, 0.04],
      kneeL: [0.38, 0, 0],
      hipR: [0.26, 0, -0.04],
      kneeR: [0.24, 0, 0]
    },
    ultimatePose: {
      hips: { pos: [0, -0.02, 0], rot: [0.0, 0.0, 0] },
      torso: [-0.12, 0.0, 0], // arched slightly backward
      chest: [-0.10, 0.0, 0],
      neck: [-0.22, 0.0, 0],
      head: [-0.28, 0.0, 0], // looking up toward glowing orb
      shoulderR: [-2.95, -0.18, -0.15], // staff raised overhead with both hands
      elbowR: [-0.30, 0, 0],
      handR: [-3.10, 0.0, 0.0],
      shoulderL: [-2.85, 0.22, 0.15],
      elbowL: [-0.45, 0, 0],
      handL: [-3.05, 0.0, 0.0],
      hipL: [-0.16, 0, 0.08],
      kneeL: [0.24, 0, 0],
      hipR: [-0.16, 0, -0.08],
      kneeR: [0.24, 0, 0]
    },
    attacks: {
      attack1: {
        name: 'Arcane Ground Slam',
        duration: 0.52,
        phases: { windup: [0.00, 0.16], strike: [0.16, 0.32], recovery: [0.32, 0.52] },
        hitWindow: [0.18, 0.30],
        trailWindow: [0.17, 0.31],
        hitStop: 0.05,
        cameraShake: 0.22,
        twoHandWeight: 1.0,
        impactTime: 0.23,
        keyframes: {
          windup: {
            hips: { pos: [0, 0.02, -0.04], rot: [-0.08, -0.15, 0] },
            torso: [-0.15, -0.10, 0],
            chest: [-0.18, -0.08, 0],
            shoulderR: [-1.45, -0.15, -0.10],
            elbowR: [-0.65, 0, 0],
            handR: [-3.10, -0.15, 0.10],
            shoulderL: [-1.35, 0.15, 0.10],
            elbowL: [-0.75, 0, 0],
            handL: [-3.05, 0.10, 0.05],
            hipL: [-0.38, 0, 0.06],
            kneeL: [0.55, 0, 0],
            hipR: [0.30, 0, -0.06],
            kneeR: [0.30, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.08, 0.16], rot: [0.12, 0.0, 0] },
            torso: [0.35, 0.0, 0],
            chest: [0.30, 0.0, 0],
            shoulderR: [-0.65, 0.05, 0.0],
            elbowR: [-0.25, 0, 0],
            handR: [-3.10, 0.0, 0.0],
            shoulderL: [-0.65, -0.05, 0.0],
            elbowL: [-0.35, 0, 0],
            handL: [-3.05, 0.0, 0.0],
            hipL: [0.35, 0, 0.06],
            kneeL: [0.25, 0, 0],
            hipR: [-0.58, 0, -0.06],
            kneeR: [0.72, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.04, 0.08], rot: [0.05, 0.0, 0] },
            torso: [0.15, 0.0, 0],
            chest: [0.12, 0.0, 0],
            shoulderR: [-0.50, 0.02, 0.0],
            elbowR: [-0.65, 0, 0],
            handR: [-3.10, 0.0, 0.0],
            shoulderL: [-0.55, -0.02, 0.0],
            elbowL: [-0.65, 0, 0],
            handL: [-3.05, 0.0, 0.0],
            hipL: [0.15, 0, 0.04],
            kneeL: [0.30, 0, 0],
            hipR: [-0.30, 0, -0.04],
            kneeR: [0.42, 0, 0]
          }
        }
      },
      attack2: {
        name: 'Quarterstaff Martial Sweep',
        duration: 0.48,
        phases: { windup: [0.00, 0.14], strike: [0.14, 0.28], recovery: [0.28, 0.48] },
        hitWindow: [0.16, 0.27],
        trailWindow: [0.15, 0.29],
        hitStop: 0.055,
        cameraShake: 0.18,
        twoHandWeight: 1.0,
        impactTime: 0.21,
        keyframes: {
          windup: {
            hips: { pos: [0, -0.05, -0.05], rot: [0.06, -0.45, 0] },
            torso: [0.10, -0.40, 0],
            chest: [0.08, -0.35, 0],
            shoulderR: [-0.45, -0.55, -0.35],
            elbowR: [-1.15, 0, 0],
            handR: [-3.05, -0.35, 0.15],
            shoulderL: [-0.55, 0.15, 0.12],
            elbowL: [-0.95, 0, 0],
            handL: [-3.00, 0.10, 0.05],
            hipL: [-0.42, 0, 0.06],
            kneeL: [0.55, 0, 0],
            hipR: [0.30, 0, -0.06],
            kneeR: [0.35, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.04, 0.14], rot: [0.05, 0.45, 0] },
            torso: [0.15, 0.42, 0],
            chest: [0.12, 0.38, 0],
            shoulderR: [-0.95, 0.45, 0.25],
            elbowR: [-0.45, 0, 0],
            handR: [-3.10, 0.45, 0.0],
            shoulderL: [-0.75, 0.35, 0.18],
            elbowL: [-0.55, 0, 0],
            handL: [-3.05, 0.35, 0.0],
            hipL: [0.25, 0, 0.05],
            kneeL: [0.25, 0, 0],
            hipR: [-0.48, 0, -0.05],
            kneeR: [0.62, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.02, 0.06], rot: [0.02, 0.22, 0] },
            torso: [0.06, 0.18, 0],
            chest: [0.04, 0.15, 0],
            shoulderR: [-0.65, 0.25, 0.15],
            elbowR: [-0.75, 0, 0],
            handR: [-3.10, 0.20, 0.05],
            shoulderL: [-0.60, 0.18, 0.12],
            elbowL: [-0.75, 0, 0],
            handL: [-3.05, 0.18, 0.05],
            hipL: [0.10, 0, 0.04],
            kneeL: [0.30, 0, 0],
            hipR: [-0.25, 0, -0.04],
            kneeR: [0.38, 0, 0]
          }
        }
      },
      attack3: {
        name: 'Charged Comet Thrust',
        duration: 0.52,
        phases: { windup: [0.00, 0.15], strike: [0.15, 0.30], recovery: [0.30, 0.52] },
        hitWindow: [0.17, 0.29],
        trailWindow: [0.16, 0.30],
        hitStop: 0.075,
        cameraShake: 0.24,
        twoHandWeight: 1.0,
        impactTime: 0.22,
        keyframes: {
          windup: {
            hips: { pos: [0, -0.04, -0.05], rot: [0.04, -0.32, 0] },
            torso: [0.08, -0.28, 0],
            chest: [0.06, -0.25, 0],
            shoulderR: [-0.25, -0.20, -0.15],
            elbowR: [-1.25, 0, 0],
            handR: [-1.48, -0.15, 0.0],
            shoulderL: [-0.55, 0.15, 0.12],
            elbowL: [-0.95, 0, 0],
            handL: [-1.35, 0.05, 0.0],
            hipL: [-0.38, 0, 0.06],
            kneeL: [0.48, 0, 0],
            hipR: [0.28, 0, -0.06],
            kneeR: [0.32, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.04, 0.16], rot: [0.06, 0.15, 0] },
            torso: [0.14, 0.12, 0],
            chest: [0.12, 0.10, 0],
            shoulderR: [-0.95, -0.05, 0.0],
            elbowR: [-0.15, 0, 0],
            handR: [-1.52, 0.0, 0.0],
            shoulderL: [-0.85, 0.05, 0.05],
            elbowL: [-0.35, 0, 0],
            handL: [-1.48, 0.0, 0.0],
            hipL: [0.30, 0, 0.05],
            kneeL: [0.22, 0, 0],
            hipR: [-0.52, 0, -0.06],
            kneeR: [0.65, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.02, 0.06], rot: [0.03, -0.10, 0] },
            torso: [0.06, -0.08, 0],
            chest: [0.05, -0.06, 0],
            shoulderR: [-0.55, -0.10, -0.08],
            elbowR: [-0.65, 0, 0],
            handR: [-1.48, -0.05, 0.0],
            shoulderL: [-0.72, 0.12, 0.10],
            elbowL: [-0.62, 0, 0],
            handL: [-1.40, 0.02, 0.0],
            hipL: [0.10, 0, 0.04],
            kneeL: [0.28, 0, 0],
            hipR: [-0.25, 0, -0.04],
            kneeR: [0.38, 0, 0]
          }
        }
      }
    },
    block: {
      twoHandWeight: 1.0,
      pose: {
        hips: { pos: [0, -0.04, 0], rot: [0.05, -0.25, 0] },
        torso: [0.10, -0.20, 0],
        chest: [0.08, -0.18, 0],
        shoulderR: [-0.65, -0.15, -0.15],
        elbowR: [-1.15, 0, 0],
        handR: [-3.10, -0.15, 0.10],
        shoulderL: [-0.85, 0.22, 0.18],
        elbowL: [-1.05, 0, 0],
        handL: [-3.05, 0.15, 0.08],
        hipL: [-0.35, 0, 0.08],
        kneeL: [0.45, 0, 0],
        hipR: [0.28, 0, -0.08],
        kneeR: [0.35, 0, 0]
      }
    },
    training: {
      cycleDuration: 1.45,
      twoHandWeight: 1.0,
      keyframes: [
        { t: 0.00, ease: 'easeInOutSine', pose: { shoulderR: [-0.35, -0.15, -0.15], elbowR: [-0.95, 0, 0], handR: [-3.10, -0.15, 0.10], torso: [0.04, -0.12, 0] } },
        { t: 0.35, ease: 'easeOutBack', pose: { shoulderR: [-0.65, 0.05, 0.0], elbowR: [-0.25, 0, 0], handR: [-3.10, 0.0, 0.0], torso: [0.35, 0.0, 0] } },
        { t: 0.75, ease: 'easeInOutSine', pose: { shoulderR: [-0.45, -0.55, -0.35], elbowR: [-1.15, 0, 0], handR: [-3.05, -0.35, 0.15], torso: [0.10, -0.40, 0] } },
        { t: 1.10, ease: 'easeOutCubic', pose: { shoulderR: [-0.95, 0.45, 0.25], elbowR: [-0.45, 0, 0], handR: [-3.10, 0.45, 0.0], torso: [0.15, 0.42, 0] } },
        { t: 1.45, ease: 'easeInOutSine', pose: { shoulderR: [-0.35, -0.15, -0.15], elbowR: [-0.95, 0, 0], handR: [-3.10, -0.15, 0.10], torso: [0.04, -0.12, 0] } }
      ]
    }
  },

  // ---------------------------------------------------------------------------
  // 3.7 MACE (Top-Heavy Ready & Bone-Crushing Slams)
  // ---------------------------------------------------------------------------
  mace: {
    kind: 'mace',
    gripType: 'oneHand',
    primaryHand: 'R',
    offHandGripLocal: [0, 0.10, 0],
    hold: {
      basePose: {
        hips: { pos: [0, -0.03, 0], rot: [0.03, -0.20, 0] },
        torso: [0.06, -0.14, 0],
        chest: [0.05, -0.12, 0],
        neck: [-0.03, 0.14, 0],
        head: [-0.02, 0.18, 0],
        shoulderR: [-0.45, -0.15, -0.22],
        elbowR: [-1.25, 0, 0],
        handR: [-0.85, -0.15, 0.15],
        shoulderL: [-0.25, 0.18, 0.15],
        elbowL: [-1.15, 0, 0],
        handL: [0.15, 0.55, -0.22],
        hipL: [-0.24, 0, 0.05],
        kneeL: [0.35, 0, 0],
        hipR: [0.24, 0, -0.05],
        kneeR: [0.28, 0, 0]
      },
      bobAmp: 0.014,
      swayAmp: 0.030,
      twoHandWeight: 0.0
    },
    attacks: {
      attack1: {
        name: 'Overhead Skull Crusher',
        duration: 0.52,
        phases: { windup: [0.00, 0.16], strike: [0.16, 0.32], recovery: [0.32, 0.52] },
        hitWindow: [0.18, 0.30],
        trailWindow: [0.17, 0.32],
        hitStop: 0.07,
        cameraShake: 0.24,
        twoHandWeight: 0.0,
        impactTime: 0.23,
        keyframes: {
          windup: {
            hips: { pos: [0, 0.02, -0.05], rot: [-0.06, -0.20, 0] },
            torso: [-0.15, -0.15, 0],
            chest: [-0.18, -0.12, 0],
            shoulderR: [-1.75, -0.15, 0.12],
            elbowR: [-0.65, 0, 0],
            handR: [-0.85, 0.0, 0.10],
            shoulderL: [-0.22, 0.25, 0.22],
            elbowL: [-1.25, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [-0.42, 0, 0.06],
            kneeL: [0.60, 0, 0],
            hipR: [0.30, 0, -0.06],
            kneeR: [0.28, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.08, 0.18], rot: [0.14, 0.0, 0] },
            torso: [0.38, 0.0, 0],
            chest: [0.32, 0.0, 0],
            shoulderR: [-0.65, 0.08, 0.0],
            elbowR: [-0.25, 0, 0],
            handR: [-1.48, 0.0, 0.0],
            shoulderL: [-0.32, 0.32, 0.25],
            elbowL: [-1.30, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [0.35, 0, 0.06],
            kneeL: [0.25, 0, 0],
            hipR: [-0.62, 0, -0.06],
            kneeR: [0.75, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.04, 0.10], rot: [0.06, 0.0, 0] },
            torso: [0.15, 0.0, 0],
            chest: [0.12, 0.0, 0],
            shoulderR: [-0.55, 0.05, 0.0],
            elbowR: [-0.55, 0, 0],
            handR: [-1.15, 0.0, 0.0],
            shoulderL: [-0.26, 0.20, 0.18],
            elbowL: [-1.20, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [0.15, 0, 0.04],
            kneeL: [0.30, 0, 0],
            hipR: [-0.32, 0, -0.04],
            kneeR: [0.45, 0, 0]
          }
        }
      },
      attack2: {
        name: 'Rib-Breaker Horizontal Swing',
        duration: 0.50,
        phases: { windup: [0.00, 0.15], strike: [0.15, 0.30], recovery: [0.30, 0.50] },
        hitWindow: [0.17, 0.29],
        trailWindow: [0.16, 0.31],
        hitStop: 0.07,
        cameraShake: 0.22,
        twoHandWeight: 0.0,
        impactTime: 0.22,
        keyframes: {
          windup: {
            hips: { pos: [0, -0.04, -0.05], rot: [0.04, -0.48, 0] },
            torso: [0.08, -0.42, 0],
            chest: [0.06, -0.38, 0],
            shoulderR: [-0.45, -0.75, -0.55],
            elbowR: [-1.25, 0, 0],
            handR: [-0.55, -0.35, 0.18],
            shoulderL: [-0.18, 0.35, 0.28],
            elbowL: [-1.25, 0, 0],
            handL: [0.10, 0.50, -0.20],
            hipL: [-0.40, 0, 0.06],
            kneeL: [0.52, 0, 0],
            hipR: [0.30, 0, -0.06],
            kneeR: [0.32, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.05, 0.14], rot: [0.06, 0.50, 0] },
            torso: [0.15, 0.45, 0],
            chest: [0.12, 0.40, 0],
            shoulderR: [-0.95, 0.60, 0.32],
            elbowR: [-0.42, 0, 0],
            handR: [-1.32, 0.70, 0.0],
            shoulderL: [-0.30, -0.15, 0.12],
            elbowL: [-1.05, 0, 0],
            handL: [0.15, 0.35, -0.15],
            hipL: [0.25, 0, 0.05],
            kneeL: [0.22, 0, 0],
            hipR: [-0.50, 0, -0.06],
            kneeR: [0.65, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.02, 0.06], rot: [0.03, 0.25, 0] },
            torso: [0.06, 0.20, 0],
            chest: [0.04, 0.18, 0],
            shoulderR: [-0.65, 0.38, 0.18],
            elbowR: [-0.78, 0, 0],
            handR: [-0.95, 0.28, 0.05],
            shoulderL: [-0.25, 0.15, 0.12],
            elbowL: [-1.15, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [0.10, 0, 0.04],
            kneeL: [0.28, 0, 0],
            hipR: [-0.28, 0, -0.04],
            kneeR: [0.38, 0, 0]
          }
        }
      },
      attack3: {
        name: 'Leaping Ground-Shatter Slam',
        duration: 0.62,
        phases: { windup: [0.00, 0.20], strike: [0.20, 0.38], recovery: [0.38, 0.62] },
        hitWindow: [0.22, 0.36],
        trailWindow: [0.21, 0.38],
        hitStop: 0.095,
        cameraShake: 0.30,
        twoHandWeight: 0.0,
        impactTime: 0.28,
        keyframes: {
          windup: {
            hips: { pos: [0, 0.04, -0.06], rot: [-0.12, -0.15, 0] },
            torso: [-0.20, -0.12, 0],
            chest: [-0.24, -0.15, 0],
            shoulderR: [-1.88, -0.12, 0.12],
            elbowR: [-0.52, 0, 0],
            handR: [-0.85, 0.0, 0.0],
            shoulderL: [-0.35, 0.25, 0.20],
            elbowL: [-1.20, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [-0.48, 0, 0.06],
            kneeL: [0.70, 0, 0],
            hipR: [0.35, 0, -0.06],
            kneeR: [0.28, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.10, 0.25], rot: [0.16, 0.0, 0] },
            torso: [0.42, 0.0, 0],
            chest: [0.35, 0.0, 0],
            shoulderR: [-0.68, 0.08, 0.0],
            elbowR: [-0.25, 0, 0],
            handR: [-1.52, 0.0, 0.0],
            shoulderL: [-0.35, 0.32, 0.25],
            elbowL: [-1.30, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [0.38, 0, 0.06],
            kneeL: [0.25, 0, 0],
            hipR: [-0.68, 0, -0.06],
            kneeR: [0.80, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.05, 0.12], rot: [0.08, 0.0, 0] },
            torso: [0.18, 0.0, 0],
            chest: [0.15, 0.0, 0],
            shoulderR: [-0.58, 0.05, 0.0],
            elbowR: [-0.58, 0, 0],
            handR: [-1.18, 0.0, 0.0],
            shoulderL: [-0.28, 0.22, 0.18],
            elbowL: [-1.20, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [0.18, 0, 0.04],
            kneeL: [0.32, 0, 0],
            hipR: [-0.38, 0, -0.04],
            kneeR: [0.48, 0, 0]
          }
        }
      }
    },
    block: {
      twoHandWeight: 0.0,
      pose: {
        hips: { pos: [0, -0.05, 0], rot: [0.06, -0.22, 0] },
        torso: [0.12, -0.20, 0],
        chest: [0.10, -0.18, 0],
        shoulderR: [-0.52, -0.15, -0.15],
        elbowR: [-1.20, 0, 0],
        handR: [-0.90, -0.15, 0.15],
        shoulderL: [-0.75, 0.35, -0.15],
        elbowL: [-1.35, 0, 0],
        handL: [0.20, 0.70, -0.32],
        hipL: [-0.36, 0, 0.08],
        kneeL: [0.48, 0, 0],
        hipR: [0.28, 0, -0.08],
        kneeR: [0.36, 0, 0]
      }
    },
    training: {
      cycleDuration: 1.40,
      twoHandWeight: 0.0,
      keyframes: [
        { t: 0.00, ease: 'easeInOutSine', pose: { shoulderR: [-0.45, -0.15, -0.22], elbowR: [-1.25, 0, 0], handR: [-0.85, -0.15, 0.15], torso: [0.06, -0.14, 0] } },
        { t: 0.35, ease: 'easeOutBack', pose: { shoulderR: [-0.65, 0.08, 0.0], elbowR: [-0.25, 0, 0], handR: [-1.48, 0.0, 0.0], torso: [0.38, 0.0, 0] } },
        { t: 0.70, ease: 'easeInOutSine', pose: { shoulderR: [-0.45, -0.75, -0.55], elbowR: [-1.25, 0, 0], handR: [-0.55, -0.35, 0.18], torso: [0.08, -0.42, 0] } },
        { t: 1.05, ease: 'easeOutCubic', pose: { shoulderR: [-0.95, 0.60, 0.32], elbowR: [-0.42, 0, 0], handR: [-1.32, 0.70, 0.0], torso: [0.15, 0.45, 0] } },
        { t: 1.40, ease: 'easeInOutSine', pose: { shoulderR: [-0.45, -0.15, -0.22], elbowR: [-1.25, 0, 0], handR: [-0.85, -0.15, 0.15], torso: [0.06, -0.14, 0] } }
      ]
    }
  },

  // ---------------------------------------------------------------------------
  // 3.8 CLUB (Thick Head Forward & Savage Haymakers)
  // ---------------------------------------------------------------------------
  club: {
    kind: 'club',
    gripType: 'oneHand',
    primaryHand: 'R',
    offHandGripLocal: [0, 0.10, 0],
    hold: {
      basePose: {
        hips: { pos: [0, -0.04, 0], rot: [0.04, -0.22, 0] },
        torso: [0.08, -0.16, 0],
        chest: [0.06, -0.14, 0],
        neck: [-0.03, 0.15, 0],
        head: [-0.02, 0.20, 0],
        shoulderR: [-0.42, -0.18, -0.20],
        elbowR: [-1.22, 0, 0],
        handR: [-0.85, -0.15, 0.15],
        shoulderL: [-0.25, 0.18, 0.15],
        elbowL: [-1.15, 0, 0],
        handL: [0.15, 0.55, -0.22],
        hipL: [-0.26, 0, 0.05],
        kneeL: [0.38, 0, 0],
        hipR: [0.26, 0, -0.05],
        kneeR: [0.30, 0, 0]
      },
      bobAmp: 0.015,
      swayAmp: 0.035,
      twoHandWeight: 0.0
    },
    attacks: {
      attack1: {
        name: 'Savage Overhead Smash',
        duration: 0.54,
        phases: { windup: [0.00, 0.17], strike: [0.17, 0.33], recovery: [0.33, 0.54] },
        hitWindow: [0.19, 0.32],
        trailWindow: [0.18, 0.34],
        hitStop: 0.075,
        cameraShake: 0.24,
        twoHandWeight: 0.0,
        impactTime: 0.24,
        keyframes: {
          windup: {
            hips: { pos: [0, 0.03, -0.06], rot: [-0.08, -0.22, 0] },
            torso: [-0.18, -0.16, 0],
            chest: [-0.20, -0.14, 0],
            shoulderR: [-1.80, -0.16, 0.12],
            elbowR: [-0.60, 0, 0],
            handR: [-0.85, 0.0, 0.10],
            shoulderL: [-0.25, 0.25, 0.22],
            elbowL: [-1.25, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [-0.45, 0, 0.06],
            kneeL: [0.65, 0, 0],
            hipR: [0.32, 0, -0.06],
            kneeR: [0.30, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.08, 0.20], rot: [0.15, 0.0, 0] },
            torso: [0.40, 0.0, 0],
            chest: [0.34, 0.0, 0],
            shoulderR: [-0.68, 0.08, 0.0],
            elbowR: [-0.25, 0, 0],
            handR: [-1.48, 0.0, 0.0],
            shoulderL: [-0.35, 0.32, 0.25],
            elbowL: [-1.30, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [0.38, 0, 0.06],
            kneeL: [0.25, 0, 0],
            hipR: [-0.65, 0, -0.06],
            kneeR: [0.78, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.04, 0.10], rot: [0.06, 0.0, 0] },
            torso: [0.16, 0.0, 0],
            chest: [0.14, 0.0, 0],
            shoulderR: [-0.55, 0.05, 0.0],
            elbowR: [-0.58, 0, 0],
            handR: [-1.15, 0.0, 0.0],
            shoulderL: [-0.28, 0.22, 0.18],
            elbowL: [-1.20, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [0.16, 0, 0.04],
            kneeL: [0.32, 0, 0],
            hipR: [-0.35, 0, -0.04],
            kneeR: [0.45, 0, 0]
          }
        }
      },
      attack2: {
        name: 'Wild Haymaker Sweep',
        duration: 0.52,
        phases: { windup: [0.00, 0.16], strike: [0.16, 0.32], recovery: [0.32, 0.52] },
        hitWindow: [0.18, 0.31],
        trailWindow: [0.17, 0.33],
        hitStop: 0.075,
        cameraShake: 0.22,
        twoHandWeight: 0.0,
        impactTime: 0.23,
        keyframes: {
          windup: {
            hips: { pos: [0, -0.05, -0.06], rot: [0.05, -0.52, 0] },
            torso: [0.10, -0.45, 0],
            chest: [0.08, -0.40, 0],
            shoulderR: [-0.48, -0.80, -0.58],
            elbowR: [-1.28, 0, 0],
            handR: [-0.55, -0.38, 0.20],
            shoulderL: [-0.18, 0.38, 0.30],
            elbowL: [-1.25, 0, 0],
            handL: [0.10, 0.50, -0.20],
            hipL: [-0.42, 0, 0.06],
            kneeL: [0.55, 0, 0],
            hipR: [0.32, 0, -0.06],
            kneeR: [0.35, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.05, 0.16], rot: [0.08, 0.55, 0] },
            torso: [0.18, 0.50, 0],
            chest: [0.15, 0.45, 0],
            shoulderR: [-0.98, 0.65, 0.35],
            elbowR: [-0.45, 0, 0],
            handR: [-1.35, 0.75, 0.0],
            shoulderL: [-0.32, -0.18, 0.12],
            elbowL: [-1.08, 0, 0],
            handL: [0.15, 0.35, -0.15],
            hipL: [0.28, 0, 0.05],
            kneeL: [0.22, 0, 0],
            hipR: [-0.55, 0, -0.06],
            kneeR: [0.68, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.02, 0.08], rot: [0.04, 0.28, 0] },
            torso: [0.08, 0.22, 0],
            chest: [0.06, 0.20, 0],
            shoulderR: [-0.68, 0.40, 0.20],
            elbowR: [-0.80, 0, 0],
            handR: [-0.98, 0.30, 0.05],
            shoulderL: [-0.26, 0.16, 0.14],
            elbowL: [-1.15, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [0.12, 0, 0.04],
            kneeL: [0.30, 0, 0],
            hipR: [-0.30, 0, -0.04],
            kneeR: [0.40, 0, 0]
          }
        }
      },
      attack3: {
        name: 'Berserker Double Slam',
        duration: 0.65,
        phases: { windup: [0.00, 0.22], strike: [0.22, 0.40], recovery: [0.40, 0.65] },
        hitWindow: [0.24, 0.39],
        trailWindow: [0.23, 0.41],
        hitStop: 0.105,
        cameraShake: 0.32,
        twoHandWeight: 0.0,
        impactTime: 0.30,
        keyframes: {
          windup: {
            hips: { pos: [0, 0.05, -0.07], rot: [-0.14, -0.16, 0] },
            torso: [-0.22, -0.14, 0],
            chest: [-0.26, -0.16, 0],
            shoulderR: [-1.92, -0.14, 0.14],
            elbowR: [-0.55, 0, 0],
            handR: [-0.85, 0.0, 0.0],
            shoulderL: [-0.38, 0.25, 0.20],
            elbowL: [-1.20, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [-0.50, 0, 0.06],
            kneeL: [0.72, 0, 0],
            hipR: [0.36, 0, -0.06],
            kneeR: [0.30, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.11, 0.28], rot: [0.18, 0.0, 0] },
            torso: [0.45, 0.0, 0],
            chest: [0.38, 0.0, 0],
            shoulderR: [-0.70, 0.08, 0.0],
            elbowR: [-0.25, 0, 0],
            handR: [-1.55, 0.0, 0.0],
            shoulderL: [-0.38, 0.32, 0.25],
            elbowL: [-1.30, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [0.42, 0, 0.06],
            kneeL: [0.25, 0, 0],
            hipR: [-0.72, 0, -0.06],
            kneeR: [0.85, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.06, 0.14], rot: [0.08, 0.0, 0] },
            torso: [0.20, 0.0, 0],
            chest: [0.16, 0.0, 0],
            shoulderR: [-0.60, 0.05, 0.0],
            elbowR: [-0.60, 0, 0],
            handR: [-1.20, 0.0, 0.0],
            shoulderL: [-0.30, 0.22, 0.18],
            elbowL: [-1.20, 0, 0],
            handL: [0.15, 0.55, -0.22],
            hipL: [0.20, 0, 0.04],
            kneeL: [0.35, 0, 0],
            hipR: [-0.40, 0, -0.04],
            kneeR: [0.50, 0, 0]
          }
        }
      }
    },
    block: {
      twoHandWeight: 0.0,
      pose: {
        hips: { pos: [0, -0.06, 0], rot: [0.08, -0.25, 0] },
        torso: [0.14, -0.22, 0],
        chest: [0.12, -0.20, 0],
        shoulderR: [-0.55, -0.18, -0.18],
        elbowR: [-1.25, 0, 0],
        handR: [-0.95, -0.18, 0.18],
        shoulderL: [-0.75, 0.35, -0.15],
        elbowL: [-1.35, 0, 0],
        handL: [0.20, 0.70, -0.32],
        hipL: [-0.38, 0, 0.08],
        kneeL: [0.52, 0, 0],
        hipR: [0.28, 0, -0.08],
        kneeR: [0.38, 0, 0]
      }
    },
    training: {
      cycleDuration: 1.45,
      twoHandWeight: 0.0,
      keyframes: [
        { t: 0.00, ease: 'easeInOutSine', pose: { shoulderR: [-0.42, -0.18, -0.20], elbowR: [-1.22, 0, 0], handR: [-0.85, -0.15, 0.15], torso: [0.08, -0.16, 0] } },
        { t: 0.35, ease: 'easeOutBack', pose: { shoulderR: [-0.68, 0.08, 0.0], elbowR: [-0.25, 0, 0], handR: [-1.48, 0.0, 0.0], torso: [0.40, 0.0, 0] } },
        { t: 0.70, ease: 'easeInOutSine', pose: { shoulderR: [-0.48, -0.80, -0.58], elbowR: [-1.28, 0, 0], handR: [-0.55, -0.38, 0.20], torso: [0.10, -0.45, 0] } },
        { t: 1.05, ease: 'easeOutCubic', pose: { shoulderR: [-0.98, 0.65, 0.35], elbowR: [-0.45, 0, 0], handR: [-1.35, 0.75, 0.0], torso: [0.18, 0.50, 0] } },
        { t: 1.45, ease: 'easeInOutSine', pose: { shoulderR: [-0.42, -0.18, -0.20], elbowR: [-1.22, 0, 0], handR: [-0.85, -0.15, 0.15], torso: [0.08, -0.16, 0] } }
      ]
    }
  },

  // ---------------------------------------------------------------------------
  // 3.9 PICKAXE (Beak Forward & Two-Hand Mining Slams)
  // ---------------------------------------------------------------------------
  pickaxe: {
    kind: 'pickaxe',
    gripType: 'twoHand',
    primaryHand: 'R',
    offHandGripLocal: [0, 0.18, 0],
    hold: {
      basePose: {
        hips: { pos: [0, -0.03, 0], rot: [0.04, -0.25, 0] },
        torso: [0.06, -0.18, 0],
        chest: [0.05, -0.15, 0],
        neck: [-0.03, 0.16, 0],
        head: [-0.02, 0.22, 0],
        shoulderR: [-0.35, -0.15, -0.15],
        elbowR: [-1.05, 0, 0],
        handR: [-1.45, -0.05, 0.0],
        shoulderL: [-0.55, 0.20, 0.18],
        elbowL: [-1.15, 0, 0],
        handL: [-1.40, 0.10, 0.0],
        hipL: [-0.25, 0, 0.05],
        kneeL: [0.35, 0, 0],
        hipR: [0.25, 0, -0.05],
        kneeR: [0.28, 0, 0]
      },
      bobAmp: 0.014,
      swayAmp: 0.030,
      twoHandWeight: 1.0
    },
    attacks: {
      attack1: {
        name: 'Pick Strike',
        duration: 0.50,
        phases: { windup: [0.00, 0.15], strike: [0.15, 0.30], recovery: [0.30, 0.50] },
        hitWindow: [0.17, 0.29],
        trailWindow: [0.16, 0.30],
        hitStop: 0.075,
        cameraShake: 0.22,
        twoHandWeight: 1.0,
        impactTime: 0.22,
        keyframes: {
          windup: {
            hips: { pos: [0, 0.03, -0.05], rot: [-0.08, -0.18, 0] },
            torso: [-0.18, -0.14, 0],
            chest: [-0.20, -0.12, 0],
            shoulderR: [-1.75, -0.12, 0.10],
            elbowR: [-0.55, 0, 0],
            handR: [-1.45, 0.0, 0.0],
            shoulderL: [-1.55, 0.15, 0.12],
            elbowL: [-0.75, 0, 0],
            handL: [-1.40, 0.0, 0.0],
            hipL: [-0.45, 0, 0.06],
            kneeL: [0.65, 0, 0],
            hipR: [0.32, 0, -0.06],
            kneeR: [0.28, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.08, 0.18], rot: [0.15, 0.0, 0] },
            torso: [0.42, 0.0, 0],
            chest: [0.35, 0.0, 0],
            shoulderR: [-0.68, 0.05, 0.0],
            elbowR: [-0.25, 0, 0],
            handR: [-1.52, 0.0, 0.0],
            shoulderL: [-0.78, 0.02, 0.0],
            elbowL: [-0.45, 0, 0],
            handL: [-1.48, 0.0, 0.0],
            hipL: [0.38, 0, 0.06],
            kneeL: [0.25, 0, 0],
            hipR: [-0.65, 0, -0.06],
            kneeR: [0.78, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.04, 0.10], rot: [0.06, 0.0, 0] },
            torso: [0.18, 0.0, 0],
            chest: [0.14, 0.0, 0],
            shoulderR: [-0.55, 0.02, 0.0],
            elbowR: [-0.65, 0, 0],
            handR: [-1.35, 0.0, 0.0],
            shoulderL: [-0.68, 0.05, 0.0],
            elbowL: [-0.65, 0, 0],
            handL: [-1.30, 0.0, 0.0],
            hipL: [0.15, 0, 0.04],
            kneeL: [0.32, 0, 0],
            hipR: [-0.35, 0, -0.04],
            kneeR: [0.45, 0, 0]
          }
        }
      },
      attack2: {
        name: 'Hooking Side Pick',
        duration: 0.48,
        phases: { windup: [0.00, 0.14], strike: [0.14, 0.28], recovery: [0.28, 0.48] },
        hitWindow: [0.16, 0.27],
        trailWindow: [0.15, 0.29],
        hitStop: 0.075,
        cameraShake: 0.20,
        twoHandWeight: 1.0,
        impactTime: 0.21,
        keyframes: {
          windup: {
            hips: { pos: [0, -0.04, -0.05], rot: [0.05, -0.45, 0] },
            torso: [0.10, -0.40, 0],
            chest: [0.08, -0.35, 0],
            shoulderR: [-0.45, -0.55, -0.35],
            elbowR: [-1.15, 0, 0],
            handR: [-1.45, -0.35, 0.0],
            shoulderL: [-0.55, 0.15, 0.12],
            elbowL: [-0.95, 0, 0],
            handL: [-1.35, 0.10, 0.0],
            hipL: [-0.42, 0, 0.06],
            kneeL: [0.55, 0, 0],
            hipR: [0.30, 0, -0.06],
            kneeR: [0.35, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.04, 0.14], rot: [0.05, 0.45, 0] },
            torso: [0.15, 0.42, 0],
            chest: [0.12, 0.38, 0],
            shoulderR: [-0.95, 0.45, 0.25],
            elbowR: [-0.45, 0, 0],
            handR: [-1.50, 0.45, 0.0],
            shoulderL: [-0.75, 0.35, 0.18],
            elbowL: [-0.55, 0, 0],
            handL: [-1.42, 0.35, 0.0],
            hipL: [0.25, 0, 0.05],
            kneeL: [0.25, 0, 0],
            hipR: [-0.48, 0, -0.05],
            kneeR: [0.62, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.02, 0.06], rot: [0.02, 0.22, 0] },
            torso: [0.06, 0.18, 0],
            chest: [0.04, 0.15, 0],
            shoulderR: [-0.65, 0.25, 0.15],
            elbowR: [-0.75, 0, 0],
            handR: [-1.45, 0.20, 0.0],
            shoulderL: [-0.60, 0.18, 0.12],
            elbowL: [-0.75, 0, 0],
            handL: [-1.35, 0.18, 0.0],
            hipL: [0.10, 0, 0.04],
            kneeL: [0.30, 0, 0],
            hipR: [-0.25, 0, -0.04],
            kneeR: [0.38, 0, 0]
          }
        }
      },
      attack3: {
        name: 'Armor-Piercing Heavy Slam',
        duration: 0.58,
        phases: { windup: [0.00, 0.18], strike: [0.18, 0.36], recovery: [0.36, 0.58] },
        hitWindow: [0.20, 0.34],
        trailWindow: [0.19, 0.36],
        hitStop: 0.095,
        cameraShake: 0.28,
        twoHandWeight: 1.0,
        impactTime: 0.27,
        keyframes: {
          windup: {
            hips: { pos: [0, 0.04, -0.06], rot: [-0.12, -0.15, 0] },
            torso: [-0.22, -0.12, 0],
            chest: [-0.24, -0.14, 0],
            shoulderR: [-1.88, -0.12, 0.12],
            elbowR: [-0.52, 0, 0],
            handR: [-1.45, 0.0, 0.0],
            shoulderL: [-1.65, 0.15, 0.10],
            elbowL: [-0.75, 0, 0],
            handL: [-1.40, 0.0, 0.0],
            hipL: [-0.48, 0, 0.06],
            kneeL: [0.70, 0, 0],
            hipR: [0.35, 0, -0.06],
            kneeR: [0.28, 0, 0]
          },
          strike: {
            hips: { pos: [0, -0.10, 0.24], rot: [0.18, 0.0, 0] },
            torso: [0.45, 0.0, 0],
            chest: [0.38, 0.0, 0],
            shoulderR: [-0.70, 0.08, 0.0],
            elbowR: [-0.25, 0, 0],
            handR: [-1.55, 0.0, 0.0],
            shoulderL: [-0.80, 0.02, 0.0],
            elbowL: [-0.45, 0, 0],
            handL: [-1.48, 0.0, 0.0],
            hipL: [0.42, 0, 0.06],
            kneeL: [0.25, 0, 0],
            hipR: [-0.68, 0, -0.06],
            kneeR: [0.82, 0, 0]
          },
          followThrough: {
            hips: { pos: [0, -0.05, 0.12], rot: [0.08, 0.0, 0] },
            torso: [0.20, 0.0, 0],
            chest: [0.16, 0.0, 0],
            shoulderR: [-0.58, 0.05, 0.0],
            elbowR: [-0.60, 0, 0],
            handR: [-1.35, 0.0, 0.0],
            shoulderL: [-0.70, 0.05, 0.0],
            elbowL: [-0.65, 0, 0],
            handL: [-1.30, 0.0, 0.0],
            hipL: [0.18, 0, 0.04],
            kneeL: [0.32, 0, 0],
            hipR: [-0.38, 0, -0.04],
            kneeR: [0.48, 0, 0]
          }
        }
      }
    },
    block: {
      twoHandWeight: 1.0,
      pose: {
        hips: { pos: [0, -0.05, 0], rot: [0.06, -0.25, 0] },
        torso: [0.12, -0.22, 0],
        chest: [0.10, -0.20, 0],
        shoulderR: [-0.65, -0.15, -0.12],
        elbowR: [-1.15, 0, 0],
        handR: [-1.48, -0.15, 0.0],
        shoulderL: [-0.85, 0.25, 0.18],
        elbowL: [-1.05, 0, 0],
        handL: [-1.42, 0.15, 0.0],
        hipL: [-0.36, 0, 0.08],
        kneeL: [0.48, 0, 0],
        hipR: [0.30, 0, -0.08],
        kneeR: [0.38, 0, 0]
      }
    },
    training: {
      cycleDuration: 1.20,
      twoHandWeight: 1.0,
      keyframes: [
        { t: 0.00, ease: 'easeInOutSine', pose: { shoulderR: [-0.35, -0.15, -0.15], elbowR: [-1.05, 0, 0], handR: [-1.45, -0.05, 0.0], torso: [0.06, -0.18, 0] } },
        { t: 0.35, ease: 'easeOutBack', pose: { shoulderR: [-0.68, 0.05, 0.0], elbowR: [-0.25, 0, 0], handR: [-1.52, 0.0, 0.0], torso: [0.42, 0.0, 0] } },
        { t: 0.70, ease: 'easeInOutSine', pose: { shoulderR: [-1.75, -0.12, 0.10], elbowR: [-0.55, 0, 0], handR: [-1.45, 0.0, 0.0], torso: [-0.18, -0.14, 0] } },
        { t: 0.95, ease: 'easeOutCubic', pose: { shoulderR: [-0.70, 0.08, 0.0], elbowR: [-0.25, 0, 0], handR: [-1.55, 0.0, 0.0], torso: [0.45, 0.0, 0] } },
        { t: 1.20, ease: 'easeInOutSine', pose: { shoulderR: [-0.35, -0.15, -0.15], elbowR: [-1.05, 0, 0], handR: [-1.45, -0.05, 0.0], torso: [0.06, -0.18, 0] } }
      ]
    }
  }
};

// -----------------------------------------------------------------------------
// 4. Analytical Two-Bone Arm IK Solver for Two-Handed Grips
// -----------------------------------------------------------------------------

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
