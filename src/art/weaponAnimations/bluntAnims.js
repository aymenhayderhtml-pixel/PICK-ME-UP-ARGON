export const BLUNT_ANIMATIONS = {
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