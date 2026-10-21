// src/combat/TimeScale.js
// Universal Combat Engine Phase 1 - Global Time Scale & Local Hit-Stop Manager

export class TimeScaleManager {
  constructor() {
    this.currentScale = 1.0;
    this.targetScale = 1.0;
    this.debugScale = 1.0; // 1.0x, 0.5x, 0.2x, 0.05x for debug inspection

    // Slow-motion envelope state
    this.slowMoActive = false;
    this.slowMoTimer = 0.0;
    this.slowMoDuration = 0.0;
    this.slowMoBlendIn = 0.04;
    this.slowMoBlendOut = 0.08;
    this.slowMoTargetScale = 0.3;
  }

  requestSlowMo(scale = 0.3, duration = 0.25, blendIn = 0.04, blendOut = 0.08) {
    this.slowMoActive = true;
    this.slowMoTargetScale = Math.max(0.01, Math.min(1.0, scale));
    this.slowMoDuration = duration;
    this.slowMoTimer = duration;
    this.slowMoBlendIn = Math.max(0.001, blendIn);
    this.slowMoBlendOut = Math.max(0.001, blendOut);
  }

  setDebugTimeScale(scale = 1.0) {
    this.debugScale = Math.max(0.001, Math.min(5.0, scale));
  }

  applyHitStop(combatant, duration = 0.05) {
    if (!combatant) return;
    combatant.hitStopTimer = Math.max(combatant.hitStopTimer || 0, duration);
  }

  update(rawDt) {
    // 1. Advance slow-motion state
    if (this.slowMoActive) {
      this.slowMoTimer -= rawDt;
      if (this.slowMoTimer <= 0) {
        this.slowMoActive = false;
        this.slowMoTimer = 0;
        this.targetScale = 1.0;
      } else {
        const elapsed = this.slowMoDuration - this.slowMoTimer;
        // Blend in
        if (elapsed < this.slowMoBlendIn) {
          const t = elapsed / this.slowMoBlendIn;
          this.targetScale = 1.0 + (this.slowMoTargetScale - 1.0) * t;
        }
        // Blend out
        else if (this.slowMoTimer < this.slowMoBlendOut) {
          const t = 1.0 - (this.slowMoTimer / this.slowMoBlendOut);
          this.targetScale = this.slowMoTargetScale + (1.0 - this.slowMoTargetScale) * t;
        }
        // Plateau
        else {
          this.targetScale = this.slowMoTargetScale;
        }
      }
    } else {
      this.targetScale = 1.0;
    }

    // Smooth current scale towards target
    const blendRate = 25.0;
    this.currentScale += (this.targetScale - this.currentScale) * Math.min(1.0, rawDt * blendRate);

    // Return world delta time (affects simulation, camera, particles)
    return rawDt * this.currentScale * this.debugScale;
  }

  getCombatantDt(combatant, worldDt, rawDt = 0.016) {
    if (!combatant) return worldDt;

    // Localized Hit-Stop: freeze only this combatant while worldDt may still run
    if (combatant.hitStopTimer > 0) {
      combatant.hitStopTimer -= (rawDt > 0 ? rawDt : 0.016);
      if (combatant.hitStopTimer <= 0) {
        combatant.hitStopTimer = 0;
      }
      return 0.0; // Frozen this frame
    }

    return worldDt;
  }
}

export const timeScale = new TimeScaleManager();
