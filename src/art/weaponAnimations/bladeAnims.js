export const BLADE_ANIMATIONS = {
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
  }
};