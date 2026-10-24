// src/enemies/poses/poseInfo.js
// Pose animation definition metadata and durations for all enemy types.

export const POSE_INFO = {
  idle: { loop: true, duration: 2.0 },
  walk: { loop: true, duration: 0.9 },
  run: { loop: true, duration: 0.6 },
  attack1: { loop: false, duration: 0.5 },
  attack2: { loop: false, duration: 0.65 },
  heavy: { loop: false, duration: 0.95 },
  cast: { loop: false, duration: 0.9 },
  shoot: { loop: false, duration: 0.7 },
  roar: { loop: false, duration: 1.2 },
  block: { loop: true, duration: 1.0 },
  pounce: { loop: false, duration: 0.9 },
  windup: { loop: true, duration: 1.0 },
  circle: { loop: true, duration: 1.2 },
  howl: { loop: false, duration: 1.5 },
  hit: { loop: false, duration: 0.25 },
  stagger: { loop: false, duration: 0.6 },
  flee: { loop: true, duration: 0.55 },
  hesitate: { loop: true, duration: 1.4 },
  spawn: { loop: false, duration: 1.0 },
  death: { loop: false, duration: 1.0 },
  ambushWait: { loop: true, duration: 2.4 },
  slam: { loop: false, duration: 0.9 },
  charge: { loop: true, duration: 0.55 },
  heal: { loop: false, duration: 0.8 },
  throw: { loop: false, duration: 0.6 }
};

export const ENEMY_POSES = Object.keys(POSE_INFO);
