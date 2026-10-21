// src/combat/CombatData.js
// Universal Combat Engine Phase 1 - Master Combat Data Tables

import { FIRE_SPELLS, MANA_CONFIG, calculateMaxMana } from './spells.config.js';
export { FIRE_SPELLS, MANA_CONFIG, calculateMaxMana };

export const GRADE_MULTS = Object.freeze({
  E: 0.8,
  D: 1.0,
  C: 1.2,
  B: 1.45,
  A: 1.75,
  S: 2.1,
  'S+': 2.6,
});

export const STAMINA_COSTS = Object.freeze({
  LIGHT_ATTACK: 12,
  CHARGED_HEAVY: 25,
  BLOCK_HOLD_PER_SEC: 6,
  BLOCK_HIT_MIN: 15,
  BLOCK_HIT_MAX: 35,
  DODGE_ROLL: 20,
  REGEN_DELAY: 0.80, // Seconds before stamina begins recovering
  REGEN_RATE: 35.0,  // Stamina restored per second
});

export const POISE_TIERS = Object.freeze({
  GRUNT: { maxPoise: 15, staggerDuration: 0.45 },
  ELITE: { maxPoise: 80, staggerDuration: 1.20 },
  BOSS: { maxPoise: 250, staggerDuration: 2.50 },
  PLAYER: { maxPoise: 100, staggerDuration: 0.65 },
  GUARD_BREAK_DURATION: 1.50,
  PARRY_STAGGER_DURATION: 1.00,
  REGEN_DELAY: 3.00, // Seconds unhit before poise regenerates
  REGEN_RATE: 25.0,  // Poise restored per second
});

export const ARCHERY_CONFIG = Object.freeze({
  HEADSHOT_DAMAGE_MULT: 3.0,
  HEADSHOT_POISE_DAMAGE: 65,
  BODY_POISE_DAMAGE: 25,
  HEADSHOT_HEIGHT_THRESHOLD: 0.74,
});

export const ATTACK_FRAME_DATA = Object.freeze({
  'sword.attack1': {
    duration: 0.46,
    hitWindow: [0.16, 0.26],
    hitStop: 0.05,
    moveMult: 1.00,
    poiseDamage: 20,
    cameraShake: 0.16,
  },
  'sword.attack2': {
    duration: 0.44,
    hitWindow: [0.14, 0.24],
    hitStop: 0.05,
    moveMult: 1.10,
    poiseDamage: 25,
    cameraShake: 0.16,
  },
  'sword.attack3': {
    duration: 0.54,
    hitWindow: [0.20, 0.32],
    hitStop: 0.08,
    moveMult: 1.45,
    poiseDamage: 45,
    cameraShake: 0.24,
  },
  'sword.heavy1': {
    duration: 0.68,
    hitWindow: [0.26, 0.40],
    hitStop: 0.09,
    moveMult: 1.85,
    poiseDamage: 85,
    cameraShake: 0.30,
  },
  'greatsword.attack1': {
    duration: 0.68,
    hitWindow: [0.25, 0.40],
    hitStop: 0.085,
    moveMult: 1.50,
    poiseDamage: 55,
    cameraShake: 0.26,
  },
  'spear.attack1': {
    duration: 0.44,
    hitWindow: [0.14, 0.24],
    hitStop: 0.05,
    moveMult: 1.05,
    poiseDamage: 22,
    cameraShake: 0.16,
  },
  'dagger.attack1': {
    duration: 0.36,
    hitWindow: [0.12, 0.21],
    hitStop: 0.035,
    moveMult: 0.75,
    poiseDamage: 12,
    cameraShake: 0.12,
  },
  'staff.attack1': {
    duration: 0.52,
    hitWindow: [0.18, 0.30],
    hitStop: 0.05,
    moveMult: 0.95,
    poiseDamage: 25,
    cameraShake: 0.22,
  },
});

export const SPELLS_TABLE = Object.freeze({
  emberBolt: {
    ...FIRE_SPELLS.emberBolt,
    requiredTag: 'mage',
    type: 'projectile_direct',
    targetRule: 'hostile',
    animAction: 'attack3',
  },
  fireDartVolley: {
    ...FIRE_SPELLS.fireDartVolley,
    requiredTag: 'mage',
    type: 'projectile_spread',
    targetRule: 'hostile',
    animAction: 'attack3',
  },
  fireball: {
    ...FIRE_SPELLS.fireball,
    requiredTag: 'mage',
    type: 'projectile_aoe',
    targetRule: 'hostile',
    animAction: 'attack3',
    statusEffect: { type: 'burn', dps: 8, tickDamage: 4, tickInterval: 0.50, duration: 3.00 },
  },
  flameWall: {
    ...FIRE_SPELLS.flameWall,
    requiredTag: 'mage',
    type: 'persistent_wall',
    targetRule: 'hostile',
    animAction: 'attack3',
  },
  infernoBeam: {
    ...FIRE_SPELLS.infernoBeam,
    requiredTag: 'mage',
    type: 'channeled_beam',
    targetRule: 'hostile',
    animAction: 'attack3',
  },
  fireNova: {
    ...FIRE_SPELLS.fireNova,
    requiredTag: 'mage',
    type: 'radial_blast',
    targetRule: 'hostile',
    animAction: 'attack1',
  },
  solarCataclysm: {
    ...FIRE_SPELLS.solarCataclysm,
    requiredTag: 'mage',
    type: 'ultimate_barrage',
    targetRule: 'hostile',
    animAction: 'ultimateChannel',
  },

  iceSpike: {
    id: 'iceSpike',
    name: 'Ice Spike',
    requiredTag: 'mage',
    type: 'projectile_pierce',
    targetRule: 'hostile',
    manaCost: 20,
    cooldown: 2.00,
    castTime: 0.40,
    castPoint: 0.20,
    recoveryTime: 0.20,
    superArmor: false,
    range: 20.0,
    speed: 32.0,
    projectileRadius: 0.22,
    directDamage: 38,
    splashDamage: 0,
    splashRadius: 0.0,
    poiseDamage: 50,
    pierceCount: 2,
    knockbackSpeed: 2.0,
    statusEffect: { type: 'freeze_slow', speedMult: 0.60, duration: 3.50 },
    animAction: 'attack3',
    colorPrimary: 0x38bdf8,
    colorSecondary: 0xe0f2fe
  },

  lightningChain: {
    id: 'lightningChain',
    name: 'Lightning Chain',
    requiredTag: 'mage',
    type: 'instant_chain',
    targetRule: 'hostile',
    manaCost: 35,
    cooldown: 4.00,
    castTime: 0.45,
    castPoint: 0.30,
    recoveryTime: 0.15,
    superArmor: false,
    range: 14.0,
    chainJumps: 3,
    jumpRadius: 5.00,
    jumpFalloff: 0.15,
    directDamage: 55,
    poiseDamage: 30,
    statusEffect: { type: 'stun', duration: 0.40 },
    animAction: 'attack3',
    colorPrimary: 0xa855f7,
    colorSecondary: 0xf0abfc
  },

  heal: {
    id: 'heal',
    name: 'Restorative Surge',
    requiredTag: 'mage',
    type: 'targeted_ally_heal',
    targetRule: 'ally',
    manaCost: 30,
    cooldown: 5.00,
    castTime: 0.60,
    castPoint: 0.35,
    recoveryTime: 0.25,
    superArmor: false,
    range: 12.0,
    healAmount: 50,
    statusEffect: null,
    animAction: 'attack1',
    colorPrimary: 0x22c55e,
    colorSecondary: 0x86efac
  },

  ward: {
    id: 'ward',
    name: 'Arcane Ward',
    requiredTag: 'mage',
    type: 'aura_ally_barrier',
    targetRule: 'ally',
    manaCost: 40,
    cooldown: 8.00,
    castTime: 0.45,
    castPoint: 0.20,
    recoveryTime: 0.25,
    superArmor: false,
    range: 3.00,
    barrierHp: 60,
    duration: 6.00,
    statusEffect: { type: 'ward_barrier', barrierHp: 60, duration: 6.00 },
    animAction: 'attack2',
    colorPrimary: 0x06b6d4,
    colorSecondary: 0x67e8f9
  },

  meteor: {
    id: 'meteor',
    name: 'Meteor Bombardment',
    requiredTag: 'mage',
    type: 'delayed_ground_aoe',
    targetRule: 'hostile',
    manaCost: 65,
    cooldown: 10.00,
    castTime: 0.85,
    castPoint: 0.50,
    recoveryTime: 0.35,
    superArmor: true,
    range: 16.0,
    blastRadius: 4.00,
    impactDelay: 1.10,
    directDamage: 110,
    poiseDamage: 120,
    knockbackSpeed: 9.0,
    statusEffect: { type: 'burn', dps: 10, tickDamage: 5, tickInterval: 0.50, duration: 5.00 },
    animAction: 'attack1',
    colorPrimary: 0xdc2626,
    colorSecondary: 0xfbbf24
  }
});

export const MELEE_HIT_SECTORS = Object.freeze({
  dagger:     { radius: 1.7, angleDeg: 200, step: 0.35 },
  sword:      { radius: 2.0, angleDeg: 150, step: 0.30 },
  greatsword: { radius: 2.6, angleDeg: 190, step: 0.20 },
  spear:      { radius: 3.0, angleDeg:  50, step: 0.20 },
  mace:       { radius: 1.9, angleDeg: 130, step: 0.20 },
  club:       { radius: 1.9, angleDeg: 150, step: 0.20 },
  pickaxe:    { radius: 1.8, angleDeg:  90, step: 0.20 },
  staff:      { radius: 2.2, angleDeg: 120, step: 0.20 },
});

export const SQUAD_SKILLS_TABLE = Object.freeze([
  {
    slot: 1,
    heroName: 'Jenna',
    role: 'Scout / Archer',
    name: 'Piercing Volley',
    spellId: 'iceSpike',
    cooldown: 6.0,
    manaCost: 20,
    staminaCost: 0,
    description: 'High-velocity piercing ice bolt that slows enemies.'
  },
  {
    slot: 2,
    heroName: 'Aaron',
    role: 'Tank',
    name: 'Aegis Ward',
    spellId: 'ward',
    cooldown: 8.0,
    manaCost: 40,
    staminaCost: 0,
    description: 'Grants 60 HP Ward Barrier to self & allies within 3m.'
  },
  {
    slot: 3,
    heroName: 'Velkist',
    role: 'Berserker',
    name: 'Crimson Cleave',
    spellId: null,
    cooldown: 5.0,
    manaCost: 0,
    staminaCost: 25,
    description: 'Massive heavy cleave delivering 85 poise damage.'
  },
  {
    slot: 4,
    heroName: 'Eolka',
    role: 'Mage',
    name: 'Meteor Bombardment',
    spellId: 'meteor',
    cooldown: 10.0,
    manaCost: 65,
    staminaCost: 0,
    description: 'Calls down a devastating meteor with super-armor.'
  }
]);

export function getSpellData(spellId) {
  return SPELLS_TABLE[spellId] || null;
}

export function getMoveFrameData(weaponKind, moveName) {
  const key = `${weaponKind}.${moveName}`;
  if (ATTACK_FRAME_DATA[key]) {
    return ATTACK_FRAME_DATA[key];
  }
  // Fallback to sword attack1 if not specified
  return ATTACK_FRAME_DATA['sword.attack1'];
}
