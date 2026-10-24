export const POLEARM_ANIMATIONS = {
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
  }
};