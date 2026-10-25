// Pure, allocation-free survival system helpers for Floor 5.
// All numbers come from FLOOR5_CONFIG; no Three.js or DOM dependencies.

export function getPacingAt(cfg, elapsedSec) {
  const frames = cfg.pacing;
  let result = frames[0];
  for (let i = 0; i < frames.length; i++) {
    if (frames[i].t <= elapsedSec) result = frames[i];
    else break;
  }
  return result;
}

export function isBlunt(hits, cfg) {
  return hits >= cfg.durability.killsUntilBlunt;
}

export function slashDamageMult(hits, cfg) {
  return isBlunt(hits, cfg) ? cfg.durability.bluntDamageMult : 1.0;
}

export function shouldShieldBash(hits, hasShield, cfg) {
  return hasShield && isBlunt(hits, cfg);
}

export function shieldBashDamage(cfg) {
  return cfg.durability.shieldBashDamage;
}

export function applyArrowShot(quiver) {
  return Math.max(0, quiver - 1);
}

export function recoverArrows(quiver, groundArrows, cfg, rng) {
  let recovered = 0;
  const r = rng || Math.random;
  for (let i = 0; i < groundArrows.length; i++) {
    const a = groundArrows[i];
    if (a.distance <= cfg.arrows.pickupRadius && r() < cfg.arrows.recoverChance) {
      recovered++;
    }
  }
  return quiver + recovered;
}

export function staminaRegenPerSec(base, isRear, cfg) {
  return isRear ? base * cfg.rotation.restStaminaRegenMult : base;
}

export function autoSwapNeeded(stamina, maxStamina, cfg) {
  return (stamina / maxStamina) <= cfg.rotation.autoSwapStaminaPct;
}

export function cleanHitStaminaSave(attackCost, cfg) {
  return attackCost * (1 - cfg.efficiency.oneCleanHitStaminaSavePct);
}

export function bleedingTick(hp, stamina, maxHp, cfg) {
  return {
    hp: hp - maxHp * cfg.bleeding.hpPctPerTick,
    stamina: stamina - cfg.bleeding.staminaDrain,
  };
}

export function isBleedingActive(remainingSec) {
  return remainingSec > 0;
}

export function fearActive(triggers, cfg) {
  if (!Array.isArray(triggers)) return false;
  for (let i = 0; i < triggers.length; i++) {
    if (cfg.fear.triggers.indexOf(triggers[i]) !== -1) return true;
  }
  return false;
}

export function fearStatMult(cfg) {
  return cfg.fear.statMult;
}

export function isNearDeath(hp, maxHp, cfg) {
  if (maxHp <= 0) return false;
  return (hp / maxHp) <= cfg.nearDeath.hpPct;
}

export function rescueWindowActive(elapsedSinceNearDeath, cfg) {
  return elapsedSinceNearDeath < cfg.nearDeath.rescueWindowSec;
}

export function shouldDissolve(elapsedSec, cfg) {
  return elapsedSec >= cfg.durationSec;
}

export function evalStressAwakening(cfg, elapsedSec, stressFlags) {
  const results = [];
  for (let i = 0; i < cfg.stressAwakenings.length; i++) {
    const s = cfg.stressAwakenings[i];
    if (elapsedSec < s.minElapsedSec) continue;
    if (stressFlags && stressFlags[s.trigger]) results.push(s.skillId);
  }
  return results;
}

export function berserkActive(remainingSec) {
  return remainingSec > 0;
}

export default {
  getPacingAt,
  isBlunt,
  slashDamageMult,
  shouldShieldBash,
  shieldBashDamage,
  applyArrowShot,
  recoverArrows,
  staminaRegenPerSec,
  autoSwapNeeded,
  cleanHitStaminaSave,
  bleedingTick,
  isBleedingActive,
  fearActive,
  fearStatMult,
  isNearDeath,
  rescueWindowActive,
  shouldDissolve,
  evalStressAwakening,
  berserkActive,
};