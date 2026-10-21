// src/combat/spells.config.js
// Single source of truth for Fire Mage Spell System, Mana formulas, and Potion balancing.

export const MANA_CONFIG = Object.freeze({
  baseMaxMana: 80,
  manaPerIntelligence: 4.0,
  manaPerMageLevel: 6.0,
  baseManaRegenRate: 4.5, // units per second (slow natural regen)
  regenPauseAfterCast: 2.0, // 2.0s delay after casting before mana regen resumes
  potion: {
    restoreRatio: 0.40, // restores 40% of max mana instantly
    cooldown: 8.0, // 8 seconds potion cooldown
    initialCount: 3, // starts with 3 potions
  },
  fizzleFlashDuration: 0.35, // red flash on mana bar when failing to cast
});

export const FIRE_SPELLS = Object.freeze({
  emberBolt: {
    id: 'emberBolt',
    slot: 1,
    key: '1',
    name: 'Ember Bolt',
    icon: '🔥',
    unlockLevel: 1,
    castTime: 0.25,
    castPoint: 0.18,
    recoveryTime: 0.07,
    manaCost: 6,
    cooldown: 0.40,
    damageMult: 1.0,
    range: 22.0,
    speed: 34.0,
    projectileRadius: 0.20,
    poiseDamage: 18,
    knockbackSpeed: 1.5,
    description: 'A small, fast fireball fired in a straight line. Rapid spam spell.',
    colorPrimary: 0xff6611,
    colorSecondary: 0xffcc33,
    soundFreq: [650, 280],
    soundType: 'sawtooth',
  },

  fireDartVolley: {
    id: 'fireDartVolley',
    slot: 2,
    key: '2',
    name: 'Fire Dart Volley',
    icon: '✨',
    unlockLevel: 2,
    castTime: 0.40,
    castPoint: 0.26,
    recoveryTime: 0.14,
    manaCost: 12,
    cooldown: 2.00,
    damageMult: 0.60, // per dart (3 darts)
    dartCount: 3,
    spreadAngle: 0.24, // radians spread
    range: 18.0,
    speed: 30.0,
    projectileRadius: 0.16,
    poiseDamage: 14,
    knockbackSpeed: 2.0,
    description: 'Fires 3 piercing fire darts in a tight horizontal spread.',
    colorPrimary: 0xff8822,
    colorSecondary: 0xffdd44,
    soundFreq: [820, 360],
    soundType: 'square',
  },

  fireball: {
    id: 'fireball',
    slot: 3,
    key: '3',
    name: 'Fireball',
    icon: '💥',
    unlockLevel: 3,
    castTime: 0.70,
    castPoint: 0.45,
    recoveryTime: 0.25,
    manaCost: 22,
    cooldown: 4.00,
    damageMult: 2.20,
    range: 20.0,
    speed: 22.0,
    projectileRadius: 0.32,
    blastRadius: 2.50,
    burnDuration: 3.00,
    burnDpsRatio: 0.25, // DoT burn per second
    poiseDamage: 55,
    knockbackSpeed: 4.5,
    cameraShake: 0.25,
    description: 'Explosive projectile exploding in a 2.5m radius and burning enemies for 3s.',
    colorPrimary: 0xff3b11,
    colorSecondary: 0xf59e0b,
    soundFreq: [480, 110],
    soundType: 'triangle',
  },

  flameWall: {
    id: 'flameWall',
    slot: 4,
    key: '4',
    name: 'Flame Wall',
    icon: '🧱',
    unlockLevel: 5,
    castTime: 1.00,
    castPoint: 0.65,
    recoveryTime: 0.35,
    manaCost: 30,
    cooldown: 10.00,
    wallWidth: 8.0,
    wallDepth: 1.4,
    wallHeight: 2.2,
    duration: 6.00,
    tickInterval: 0.35,
    damageMultPerTick: 0.35,
    poiseDamagePerTick: 12,
    range: 14.0,
    description: 'Conjures an 8m wide fiery barricade lasting 6s. Enemies take damage and avoid it.',
    colorPrimary: 0xf97316,
    colorSecondary: 0xfde047,
    soundFreq: [320, 150],
    soundType: 'sawtooth',
  },

  infernoBeam: {
    id: 'infernoBeam',
    slot: 5,
    key: '5',
    name: 'Inferno Beam',
    icon: '⚡',
    unlockLevel: 7,
    isChanneled: true,
    maxChannelDuration: 3.00,
    manaCost: 8,
    manaCostPerSecond: 8.0,
    tickInterval: 0.20,
    damageMultPerTick: 0.80,
    poiseDamagePerTick: 15,
    mageMoveSpeedMult: 0.30, // slows mage movement to 30% while channeling
    range: 16.0,
    beamRadius: 0.40,
    cooldown: 5.00,
    description: 'Continuous focused heat ray channeled up to 3s. Slows mage to 30% speed.',
    colorPrimary: 0xff2200,
    colorSecondary: 0xffea00,
    soundFreq: [520, 480],
    soundType: 'sawtooth',
  },

  fireNova: {
    id: 'fireNova',
    slot: 6,
    key: '6',
    name: 'Fire Nova',
    icon: '🔆',
    unlockLevel: 9,
    castTime: 1.20,
    castPoint: 0.80,
    recoveryTime: 0.40,
    manaCost: 45,
    cooldown: 14.00,
    radius: 6.00,
    damageMult: 3.00,
    poiseDamage: 90,
    knockbackSpeed: 8.5,
    cameraShake: 0.40,
    description: 'High-risk radial detonation knocking back and searing all enemies within 6m.',
    colorPrimary: 0xef4444,
    colorSecondary: 0xfbbf24,
    soundFreq: [240, 60],
    soundType: 'triangle',
  },

  solarCataclysm: {
    id: 'solarCataclysm',
    slot: 7,
    key: 'R',
    name: 'Solar Cataclysm',
    icon: '☀️',
    unlockLevel: 12,
    isUltimate: true,
    castTime: 5.00,
    castPoint: 5.00,
    manaCostRatio: 0.70, // costs 70% of max mana (cannot cast under that)
    cooldown: 90.00,
    interruptDamageThresholdRatio: 0.15, // >15% max HP damage interrupts cast
    interruptManaLossRatio: 0.50, // 50% mana burnt on interruption
    baseDamageMult: 8.0,
    damageMultPerLevel: 0.10, // +10% per mage level
    baseRadius: 10.0,
    radiusPerLevel: 0.30, // +0.3m per mage level
    barrageDuration: 4.00,
    meteorCount: 22,
    meteorDelay: 0.18,
    poiseDamagePerMeteor: 110,
    cameraShake: 0.75,
    description: 'Raises staff overhead for 5s summoning an apocalyptic meteor storm. Allies must protect the mage!',
    colorPrimary: 0xffd700,
    colorSecondary: 0xff3300,
    soundFreq: [180, 45],
    soundType: 'sawtooth',
  },
});

/**
 * Calculates max mana based on base, intelligence stat, and mage level.
 */
export function calculateMaxMana(intelligence = 10, mageLevel = 1) {
  return Math.round(
    MANA_CONFIG.baseMaxMana +
    intelligence * MANA_CONFIG.manaPerIntelligence +
    (mageLevel - 1) * MANA_CONFIG.manaPerMageLevel
  );
}

export const COMBO_CONFIG = Object.freeze({
  firestormWallExplosionRadius: 5.0,
  firestormDamageMultBonus: 0.50, // +50% damage
  infernoBurningDamageBonus: 0.30, // +30% damage on burning targets
});

export const OVERHEAT_CONFIG = Object.freeze({
  castWindowSeconds: 6.0,
  maxCastsInWindow: 5,
  overheatDuration: 4.0, // stops mana regeneration for 4 seconds
});

export const MASTERY_CONFIG = Object.freeze({
  castsPerLevel: 25,
  maxLevel: 5,
  damageBonusPerLevel: 0.05, // +5% damage per mastery level
  manaCostReductionPerLevel: 0.03, // -3% mana cost per mastery level
});

