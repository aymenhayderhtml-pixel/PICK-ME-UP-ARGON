export const LEVEL_CAP_PER_STAR = 10;
export const MAX_STAR = 7;
export const NATURAL_MAX_STAR = 6;
export const PARTY_SIZE = 5;

export const STAT_KEYS = ['str', 'agi', 'vit', 'int', 'wil'];

// XP needed to advance to level + 1: 10 * level^1.5 rounded
export function getXpForLevel(level) {
  return Math.round(10 * Math.pow(level, 1.5));
}

// Promotion cost in gems: 50 * star^2 (1->2 is 50, 2->3 is 200, 3->4 is 450...)
export function getPromotionCost(star) {
  return 50 * Math.pow(star, 2);
}

// Synthesis XP provided by a material hero: 15 * star * level
export function getSynthesisXp(star, level = 1) {
  return 15 * star * level;
}

// Skill inherit chance when synthesizing: 10% * material star, capped at 60%
export function getSkillInheritChance(materialStar) {
  return Math.min(0.6, 0.1 * materialStar);
}

// Skill level XP needed: 100 * skillLevel
export function getSkillXpNeeded(skillLevel) {
  return 100 * skillLevel;
}

// Training Grounds configuration
export const TRAINING_TICK_SECONDS = 5;
export const TRAINING_SKILL_XP_PER_TICK = 8; // At facility level 1

// Star Rarity Color Palette
export const RARITY_COLORS = {
  1: 0x9a9a9a, // Gray
  2: 0xcd7f32, // Bronze
  3: 0x3a7bff, // Blue
  4: 0xa84bff, // Purple
  5: 0xffc83a, // Gold
  6: 0xdc143c, // Crimson
  7: 0xffffff, // Rainbow (White with chromatic pulse)
};

export const RARITY_HEX_STRINGS = {
  1: '#9a9a9a',
  2: '#cd7f32',
  3: '#3a7bff',
  4: '#a84bff',
  5: '#ffc83a',
  6: '#dc143c',
  7: '#ffffff',
};

export function getRarityColor(star) {
  return RARITY_COLORS[star] || 0x9a9a9a;
}

export function getRarityHexString(star) {
  return RARITY_HEX_STRINGS[star] || '#9a9a9a';
}
