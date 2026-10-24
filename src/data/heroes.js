import { EMOTION_CONFIG, getDefaultMentality, getDefaultMotivationScore } from './emotions.config.js';

export const HERO_TEMPLATES = {
  HAN: {
    id: 'hero_han',
    name: 'Han Islat',
    star: 1,
    class: 'Vanguard',
    hair: 0x111111, // Black
    armor: 0x2a303c, // Dark steel
    weapon: 'sword+shield',
    personality: 'Analytical & Cold',
    baseStats: { str: 7, agi: 7, vit: 8, int: 5, wil: 12 },
    skills: [
      { id: 'basic_swordsmanship', level: 1 },
      { id: 'basic_shield_technique', level: 1 },
    ],
    talents: [],
    hiddenTalent: 'composure', // Unlockable at 2 star
  },
  JENNA: {
    id: 'hero_jenna',
    name: 'Jenna',
    star: 1,
    class: 'Scout',
    hair: 0x993d18, // Reddish-orange
    armor: 0x3e6836, // Leather tunic
    weapon: 'dagger+bow',
    personality: 'Cheerful & Observant',
    baseStats: { str: 5, agi: 10, vit: 6, int: 6, wil: 7 },
    skills: [
      { id: 'basic_dagger_technique', level: 1 },
      { id: 'basic_archery', level: 1 },
    ],
    talents: ['keen_sight'],
    hiddenTalent: 'quick_learner',
    hiddenTalents: ['quick_learner'],
  },
  AARON: {
    id: 'hero_aaron',
    name: 'Aaron',
    star: 1,
    class: 'Vanguard Tank',
    hair: 0x4a2a14, // Short brown
    armor: 0x555560, // Plate armor
    weapon: 'spear',
    personality: 'Timid & Faithful',
    baseStats: { str: 9, agi: 5, vit: 10, int: 4, wil: 5 },
    skills: [
      { id: 'basic_spearmanship', level: 1 },
      { id: 'heavy_armor_mastery', level: 1 },
    ],
    talents: [],
  },
  VELKIST: {
    id: 'hero_velkist',
    name: 'Velkist',
    star: 1,
    class: 'Berserker',
    hair: 0x221111, // Wild dark
    armor: 0x442222, // Scarred leather
    weapon: 'greatsword',
    personality: 'Feral & Untamed',
    baseStats: { str: 11, agi: 7, vit: 8, int: 3, wil: 6 },
    skills: [
      { id: 'basic_swordsmanship', level: 1 },
      { id: 'berserk', level: 1 },
    ],
    talents: [],
  },
  EOLKA: {
    id: 'hero_eolka',
    name: 'Eolka',
    star: 4,
    class: 'Fire Mage',
    hair: 0xff6699, // Long pink
    armor: 0x881122, // Ornate crimson robe
    weapon: 'staff',
    personality: 'Arrogant & Noble',
    baseStats: { str: 4, agi: 6, vit: 7, int: 16, wil: 11 },
    skills: [
      { id: 'fireball', level: 3 },
      { id: 'mana_amplification', level: 2 },
    ],
    talents: [],
  },
  SIRRIS: {
    id: 'hero_sirris',
    name: 'Sirris',
    star: 4,
    class: 'Valkyrie',
    hair: 0xeeeeee, // Silver
    armor: 0xd4af37, // Noble gold armor
    weapon: 'dual swords',
    personality: 'Righteous & Disciplined',
    baseStats: { str: 12, agi: 12, vit: 11, int: 8, wil: 12 },
    skills: [
      { id: 'basic_swordsmanship', level: 5 },
      { id: 'evasion', level: 3 },
    ],
    talents: [],
  },
  CATIO: {
    id: 'hero_catio',
    name: 'Catio',
    star: 3,
    class: 'Artisan',
    hair: 0x5a3d24, // Brown hair
    armor: 0x8b5a2b, // Leather apron
    weapon: 'hammer',
    scale: 0.85,
    isDwarf: true,
    personality: 'Gruff & Meticulous',
    baseStats: { str: 9, agi: 5, vit: 11, int: 8, wil: 10 },
    skills: [
      { id: 'smithing', level: 3 },
      { id: 'heavy_armor_mastery', level: 1 },
    ],
    talents: [],
  },
  SHAY: {
    id: 'hero_shay',
    name: 'Shay Lannister',
    star: 4,
    class: 'Knight',
    hair: 0xf5d77f, // Golden blonde
    armor: 0x486581, // Steel knight plate
    weapon: 'sword+shield',
    personality: 'Loyal & Steadfast',
    baseStats: { str: 19, agi: 22, vit: 18, int: 10, wil: 12 },
    skills: [
      { id: 'combat_logic', name: 'Combat Logic', level: 1, exp: 0 },
      { id: 'intermediate_swordsmanship', name: 'Intermediate Swordsmanship', level: 1, exp: 0 },
      { id: 'knights_determination', name: "Knight's Determination", level: 1, exp: 0 },
    ],
    talents: [],
  },
  MOLMONT: {
    id: 'hero_molmont',
    name: 'Molmont',
    star: 2,
    class: 'Mercenary',
    hair: 0x6b4a2a, // Weathered brown
    armor: 0x4a4034, // Worn mercenary leathers
    weapon: 'sword+shield',
    pastJob: 'mercenary',
    motivation: 'lazy',
    personality: 'Cowardly & Survival-driven',
    baseStats: { str: 11, agi: 8, vit: 10, int: 5, wil: 9 },
    skills: [
      { id: 'basic_swordsmanship', level: 1 },
      { id: 'basic_shield_technique', level: 1 },
    ],
    talents: [],
    traits: ['cowardly'],
    hiddenTalent: 'pain_tolerance', // Unlockable at 2 star
  },

  // --- Chapter 5-8 1-star heroes ------------------------------------------
  ELSON: {
    id: 'hero_elson',
    name: 'Elson',
    star: 1,
    class: 'Vanguard',
    hair: 0x3a2a1a,
    armor: 0x4a5568,
    weapon: 'sword',
    personality: 'Steady & Loyal',
    baseStats: { str: 8, agi: 6, vit: 8, int: 4, wil: 6 },
    skills: [{ id: 'basic_swordsmanship', level: 1 }],
    talents: [],
  },
  TOBY: {
    id: 'hero_toby',
    name: 'Toby',
    star: 1,
    class: 'Scout',
    hair: 0x5a3a2a,
    armor: 0x3e5a36,
    weapon: 'dagger',
    personality: 'Eager & Curious',
    baseStats: { str: 5, agi: 9, vit: 6, int: 5, wil: 6 },
    skills: [{ id: 'basic_swordsmanship', level: 1 }],
    talents: [],
  },
  GIDE: {
    id: 'hero_gide',
    name: 'Gide',
    star: 1,
    class: 'Vanguard',
    hair: 0x2a2a2a,
    armor: 0x556070,
    weapon: 'sword',
    personality: 'Quiet & Disciplined',
    baseStats: { str: 9, agi: 5, vit: 9, int: 4, wil: 7 },
    skills: [{ id: 'basic_swordsmanship', level: 1 }],
    talents: [],
  },
  HANSEN: {
    id: 'hero_hansen',
    name: 'Hansen',
    star: 1,
    class: 'Vanguard',
    hair: 0x4a3a2a,
    armor: 0x4a5060,
    weapon: 'sword',
    personality: 'Gruff & Reliable',
    baseStats: { str: 8, agi: 6, vit: 9, int: 4, wil: 6 },
    skills: [{ id: 'basic_swordsmanship', level: 1 }],
    talents: [],
  },
  DIKA: {
    id: 'hero_dika',
    name: 'Dika',
    star: 1,
    class: 'Vanguard',
    hair: 0x1a1a1a,
    armor: 0x505868,
    weapon: 'sword',
    personality: 'Brave & Impulsive',
    baseStats: { str: 9, agi: 7, vit: 8, int: 4, wil: 6 },
    skills: [{ id: 'basic_swordsmanship', level: 1 }],
    talents: [],
  },
  DOLF: {
    id: 'hero_dolf',
    name: 'Dolf',
    star: 1,
    class: 'Novice',
    hair: 0x6a5a4a,
    armor: 0x666666,
    weapon: 'none',
    personality: 'Timid & Obedient',
    baseStats: { str: 4, agi: 4, vit: 5, int: 3, wil: 4 },
    skills: [],
    talents: [],
  },
  CHLOE: {
    id: 'hero_chloe',
    name: 'Chloe',
    star: 1,
    class: 'Novice',
    hair: 0x8a5a3a,
    armor: 0x776655,
    weapon: 'none',
    personality: 'Warm & Caring',
    baseStats: { str: 3, agi: 5, vit: 5, int: 6, wil: 7 },
    skills: [{ id: 'cooking', level: 1 }],
    talents: [],
  },
  ENOK: {
    id: 'hero_enok',
    name: 'Enok',
    star: 1,
    class: 'Novice',
    hair: 0x2a3a2a,
    armor: 0x556655,
    weapon: 'none',
    personality: 'Quiet & Observant',
    baseStats: { str: 4, agi: 5, vit: 5, int: 5, wil: 5 },
    skills: [],
    talents: [],
  },

  // --- Chapter 13 Party 4 heroes ------------------------------------------
  LOUIS: {
    id: 'hero_louis',
    name: 'Louis',
    star: 1,
    class: 'Vanguard',
    hair: 0x3a2a1a,
    armor: 0x4a5568,
    weapon: 'sword',
    personality: 'Steady & Loyal',
    baseStats: { str: 8, agi: 6, vit: 8, int: 4, wil: 6 },
    skills: [{ id: 'basic_swordsmanship', level: 1 }],
    talents: [],
  },
  JOFFREY: {
    id: 'hero_joffrey',
    name: 'Joffrey',
    star: 1,
    class: 'Scout',
    hair: 0x5a3a2a,
    armor: 0x3e5a36,
    weapon: 'dagger',
    personality: 'Eager & Curious',
    baseStats: { str: 5, agi: 9, vit: 6, int: 5, wil: 6 },
    skills: [{ id: 'basic_swordsmanship', level: 1 }],
    talents: [],
  },
  OWEN: {
    id: 'hero_owen',
    name: 'Owen',
    star: 1,
    class: 'Vanguard',
    hair: 0x2a2a2a,
    armor: 0x556070,
    weapon: 'sword',
    personality: 'Quiet & Disciplined',
    baseStats: { str: 9, agi: 5, vit: 9, int: 4, wil: 7 },
    skills: [{ id: 'basic_swordsmanship', level: 1 }],
    talents: [],
  },
};

export const PAST_JOBS = [
  'mercenary', 'shopkeeper', 'farmer', 'thief', 'student',
  'sailor', 'hunter', 'merchant', 'bard', 'bandit', 'noble', 'cook'
];

export const JOB_SKILL_MAP = {
  mercenary: { skillId: 'basic_swordsmanship', weapon: 'sword+shield' },
  hunter: { skillId: 'basic_archery', weapon: 'dagger+bow' },
  farmer: { skillId: 'basic_spearmanship', weapon: 'spear' },
  thief: { skillId: 'basic_dagger_technique', weapon: 'dagger' },
  bandit: { skillId: 'basic_dagger_technique', weapon: 'dagger' },
  merchant: { skillId: 'basic_dagger_technique', weapon: 'dagger' },
  cook: { skillId: 'basic_dagger_technique', weapon: 'dagger' },
  noble: { skillId: 'basic_swordsmanship', weapon: 'sword+shield' },
  student: { skillId: 'basic_swordsmanship', weapon: 'sword+shield' },
  sailor: { skillId: 'basic_spearmanship', weapon: 'spear' },
  bard: { skillId: 'basic_archery', weapon: 'dagger+bow' },
  shopkeeper: { skillId: 'basic_shield_technique', weapon: 'sword+shield' },
};

/**
 * The manhua's three "unnamed men".
 *
 * They are 1-star Commoners and each one carries the trait that defines him:
 * the first refuses to fight, the second looks for an exit, the third
 * complains about eating only potatoes.
 */
export const UNNAMED_MEN_RECRUITS = Object.freeze([
  Object.freeze({ job: 'farmer', heroClass: 'Commoner', trait: 'coward' }),
  Object.freeze({ job: 'student', heroClass: 'Commoner', trait: 'exit_seeker' }),
  Object.freeze({ job: 'shopkeeper', heroClass: 'Commoner', trait: 'food_complainer' }),
]);

const FANTASY_NAMES = [
  'Kaelen', 'Theron', 'Lyra', 'Varis', 'Gideon',
  'Rowan', 'Darian', 'Elowen', 'Kael', 'Boran',
  'Mireia', 'Corvin', 'Titus', 'Selene', 'Bryce',
  'Leona', 'Valerius', 'Karin', 'Orin', 'Sylvia'
];

/**
 * Generates a low-tier recruit.
 *
 * `heroClass` overrides the default 'Novice' class, which is how the manhua's
 * "unnamed men" (1-star Commoners) are produced. `traits` pins the
 * personality traits of the recruit instead of rolling them.
 */
export function generateNoviceHero({
  job = null,
  forceUncooperative = false,
  forceCooperative = false,
  heroClass = 'Novice',
  traits = null,
  rng = Math.random,
  existingHeroes = [],
} = {}) {
  const chosenJob = job || PAST_JOBS[Math.floor(rng() * PAST_JOBS.length)];
  let isUncooperative = false;
  if (forceUncooperative) {
    isUncooperative = true;
  } else if (forceCooperative) {
    isUncooperative = false;
  } else if (chosenJob === 'mercenary' || chosenJob === 'thief' || chosenJob === 'bandit') {
    isUncooperative = rng() < 0.6;
  } else {
    isUncooperative = rng() < 0.1;
  }

  const existingNames = new Set(
    existingHeroes.map((h) => (typeof h === 'string' ? h : h?.name)).filter(Boolean)
  );

  let name = FANTASY_NAMES[Math.floor(rng() * FANTASY_NAMES.length)];
  let attempts = 0;
  while (existingNames.has(name) && attempts < 20) {
    name = FANTASY_NAMES[Math.floor(rng() * FANTASY_NAMES.length)];
    attempts++;
  }
  if (existingNames.has(name)) {
    const romanNumerals = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    for (const r of romanNumerals) {
      const candidate = `${name} ${r}`;
      if (!existingNames.has(candidate)) {
        name = candidate;
        break;
      }
    }
  }

  const jobInfo = JOB_SKILL_MAP[chosenJob] || { skillId: 'basic_swordsmanship', weapon: 'sword+shield' };

  // Stats 8 to 14 with random spread
  const stats = {
    str: 8 + Math.floor(rng() * 7),
    agi: 8 + Math.floor(rng() * 7),
    vit: 8 + Math.floor(rng() * 7),
    int: 8 + Math.floor(rng() * 7),
    wil: 8 + Math.floor(rng() * 7),
  };

  const hairColors = [0x3d2715, 0x8b4513, 0x4a2a14, 0x221111, 0x5a3d24, 0xddb875];
  const hair = hairColors[Math.floor(rng() * hairColors.length)];

  return normalizeHeroEmotionFields({
    id: 'hero_novice_' + Date.now() + '_' + Math.floor(rng() * 100000),
    name,
    star: 1,
    level: 1,
    exp: 0,
    fatigue: 0,
    class: heroClass,
    pastJob: chosenJob,
    cooperation: isUncooperative ? 'uncooperative' : 'cooperative',
    motivation: isUncooperative ? 'lazy' : rollMotivation(name),
    hair,
    armor: 0x445566,
    weapon: jobInfo.weapon,
    personality: isUncooperative ? 'Rebellious & Bitter' : 'Humble & Eager',
    stats,
    composure: Math.floor(rng() * 40) + 20, // 20 to 59
    traits: Array.isArray(traits) ? [...traits] : [],
    skills: [
      { id: jobInfo.skillId, level: 1, exp: 0 }
    ],
    talents: [],
    alive: true,
  });
}

const CLASS_BASE_STATS = {
  Vanguard: { str: 8, agi: 6, vit: 9, int: 4, wil: 7 },
  Scout: { str: 6, agi: 9, vit: 6, int: 6, wil: 6 },
  Mage: { str: 4, agi: 6, vit: 5, int: 10, wil: 8 },
  Berserker: { str: 10, agi: 7, vit: 7, int: 3, wil: 5 },
  Healer: { str: 4, agi: 5, vit: 6, int: 8, wil: 10 },
  Artisan: { str: 9, agi: 5, vit: 11, int: 8, wil: 10 },
  Mercenary: { str: 9, agi: 7, vit: 9, int: 4, wil: 7 },
  Commoner: { str: 7, agi: 6, vit: 7, int: 5, wil: 6 },
  Novice: { str: 8, agi: 7, vit: 8, int: 5, wil: 6 },
};

const CLASS_SKILL_POOLS = {
  Vanguard: ['basic_swordsmanship', 'basic_shield_technique', 'heavy_armor_mastery', 'leadership'],
  Scout: ['basic_dagger_technique', 'basic_archery', 'stealth', 'evasion'],
  Mage: ['fireball', 'mana_amplification', 'evasion'],
  Berserker: ['basic_swordsmanship', 'berserk', 'heavy_armor_mastery'],
  Healer: ['mana_amplification', 'leadership', 'basic_shield_technique'],
  Artisan: ['smithing', 'heavy_armor_mastery', 'basic_swordsmanship'],
  Mercenary: ['basic_swordsmanship', 'basic_shield_technique', 'heavy_armor_mastery'],
  Commoner: ['basic_swordsmanship', 'basic_spearmanship', 'basic_dagger_technique'],
  Novice: ['basic_swordsmanship', 'basic_spearmanship', 'basic_dagger_technique'],
};

const TALENT_POOL = ['composure', 'keen_sight', 'pain_tolerance'];

const CLASS_PALETTES = {
  Vanguard: { hair: 0x3d2715, armor: 0x48586c, weapon: 'Sword & Shield' },
  Scout: { hair: 0x8b4513, armor: 0x3e5f32, weapon: 'Shortbow' },
  Mage: { hair: 0x5b3270, armor: 0x2d3460, weapon: 'Wand' },
  Berserker: { hair: 0x221111, armor: 0x5a2323, weapon: 'Axe' },
  Healer: { hair: 0xddb875, armor: 0xd8d8e0, weapon: 'Scepter' },
  Artisan: { hair: 0x5a3d24, armor: 0x8b5a2b, weapon: 'Hammer' },
  Mercenary: { hair: 0x6b4a2a, armor: 0x4a4034, weapon: 'Sword & Shield' },
  Commoner: { hair: 0x3d2715, armor: 0x445566, weapon: 'Sword' },
  Novice: { hair: 0x3d2715, armor: 0x445566, weapon: 'Sword' },
};

// The class a procedurally generated hero belongs to. The weights differ per
// star: a 1-star pull is mostly humble Commoners (the manhua's "unnamed men")
// while a high-star pull is mostly specialised fighters.
const RANDOM_HERO_CLASS_WEIGHTS = Object.freeze({
  1: Object.freeze({ Commoner: 32, Novice: 12, Vanguard: 18, Scout: 12, Mage: 8, Berserker: 10, Healer: 8 }),
  2: Object.freeze({ Commoner: 18, Novice: 6, Vanguard: 22, Scout: 18, Mage: 14, Berserker: 12, Healer: 10 }),
  3: Object.freeze({ Commoner: 9, Novice: 0, Vanguard: 26, Scout: 20, Mage: 18, Berserker: 14, Healer: 13 }),
  4: Object.freeze({ Commoner: 5, Novice: 0, Vanguard: 28, Scout: 22, Mage: 20, Berserker: 14, Healer: 11 }),
});

// The highest star the class weight table knows about. Stars above it use
// the highest known table.
const RANDOM_HERO_CLASS_MAX_STAR = 4;

/**
 * Picks a hero class from the weighted pool of the given star.
 */
function rollHeroClass(star, rng) {
  const s = Math.max(1, Math.min(RANDOM_HERO_CLASS_MAX_STAR, star || 1));
  const table = RANDOM_HERO_CLASS_WEIGHTS[s];
  const entries = Object.entries(table).filter(([, w]) => w > 0);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return 'Commoner';
  let roll = rng() * total;
  for (const [id, w] of entries) {
    roll -= w;
    if (roll <= 0) return id;
  }
  return entries[entries.length - 1][0];
}

export function generateRandomHero(star = 1, rng = Math.random, existingHeroes = []) {
  const existingNames = new Set(
    existingHeroes.map((h) => (typeof h === 'string' ? h : h?.name)).filter(Boolean)
  );

  let name = FANTASY_NAMES[Math.floor(rng() * FANTASY_NAMES.length)];
  let attempts = 0;
  while (existingNames.has(name) && attempts < 20) {
    name = FANTASY_NAMES[Math.floor(rng() * FANTASY_NAMES.length)];
    attempts++;
  }
  if (existingNames.has(name)) {
    const romanNumerals = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    for (const r of romanNumerals) {
      const candidate = `${name} ${r}`;
      if (!existingNames.has(candidate)) {
        name = candidate;
        break;
      }
    }
  }

  const heroClass = rollHeroClass(star, rng);

  const baseClassStats = CLASS_BASE_STATS[heroClass];
  const stats = {};
  for (const stat of ['str', 'agi', 'vit', 'int', 'wil']) {
    stats[stat] = baseClassStats[stat] + star * 2 + Math.floor(rng() * 4); // 0 to 3
  }

  // 1 to 2 random skills matching class
  const skillPool = CLASS_SKILL_POOLS[heroClass];
  const skillCount = Math.floor(rng() * 2) + 1; // 1 or 2
  const shuffledSkills = [...skillPool].sort(() => rng() - 0.5);
  const heroSkills = shuffledSkills.slice(0, skillCount).map((sId) => ({
    id: sId,
    level: Math.max(1, Math.min(10, Math.floor(rng() * star) + 1)),
    exp: 0,
  }));

  // 20% chance for a random talent
  const talents = [];
  if (rng() < 0.2) {
    const talentId = TALENT_POOL[Math.floor(rng() * TALENT_POOL.length)];
    talents.push(talentId);
  }

  const palette = CLASS_PALETTES[heroClass] || CLASS_PALETTES.Vanguard;

  return normalizeHeroEmotionFields({
    id: 'hero_' + Date.now() + '_' + Math.floor(rng() * 100000),
    name,
    star,
    level: 1,
    exp: 0,
    fatigue: 0,
    stress: 0,
    class: heroClass,
    motivation: rollMotivation(name),
    hair: palette.hair,
    armor: palette.armor,
    weapon: palette.weapon,
    personality: 'Resolute & Eager',
    stats,
    traits: [],
    skills: heroSkills,
    talents,
    alive: true,
  });
}

export function rollMotivation(heroName, cooperation = null) {
  if (heroName === 'Han Islat') return 'diligent';
  if (cooperation === 'uncooperative') return 'lazy';
  const r = Math.random();
  if (r < 0.25) return 'diligent';
  if (r < 0.80) return 'normal';
  return 'lazy';
}

/**
 * The class-weighted pool a level-up or a training session draws its stat
 * gains from. Shared by the progression code and the training engine so both
 * grow a hero the same way.
 */
export function getWeightedStatsForClass(heroClass) {
  const c = (heroClass || '').toLowerCase();
  if (c.includes('tank') || c.includes('vanguard')) {
    return ['str', 'str', 'vit', 'vit', 'vit', 'wil', 'agi'];
  }
  if (c.includes('mercenary')) {
    return ['str', 'str', 'vit', 'vit', 'wil', 'agi'];
  }
  if (c.includes('commoner')) {
    return ['str', 'agi', 'agi', 'vit', 'wil'];
  }
  if (c.includes('scout') || c.includes('ranger') || c.includes('archer') || c.includes('rogue')) {
    return ['agi', 'agi', 'agi', 'str', 'wil', 'vit'];
  }
  if (c.includes('mage') || c.includes('wizard')) {
    return ['int', 'int', 'int', 'wil', 'wil', 'vit'];
  }
  if (c.includes('cleric') || c.includes('priest') || c.includes('healer')) {
    return ['wil', 'wil', 'int', 'int', 'vit', 'str'];
  }
  return ['str', 'agi', 'vit', 'int', 'wil'];
}

// ---------------------------------------------------------------------------
// Personality traits
// ---------------------------------------------------------------------------
// Weighted trait pools per motivation. `uncooperative` heroes lean hot-headed,
// cowards and exit seekers.
const TRAIT_POOL_BY_MOTIVATION = {
  diligent: { diligent: 30, lazy: 4, brave: 12, cautious: 14, hot_headed: 8, coward: 3, exit_seeker: 3, food_complainer: 4 },
  normal: { diligent: 12, lazy: 12, brave: 14, cautious: 14, hot_headed: 10, coward: 8, exit_seeker: 8, food_complainer: 8 },
  lazy: { diligent: 4, lazy: 30, brave: 8, cautious: 18, hot_headed: 12, coward: 14, exit_seeker: 14, food_complainer: 10 },
};

// Extra trait weights per class. The humble Commoners of the manhua are the
// ones who refuse to fight, look for an exit and complain about the food.
const TRAIT_POOL_BY_CLASS = {
  Commoner: { coward: 14, exit_seeker: 14, food_complainer: 12 },
  Mercenary: { brave: 8, hot_headed: 4 },
};

/**
 * Rolls 1 (or sometimes 2) personality traits for a hero.
 * Returns trait ids from EMOTION_CONFIG.PERSONALITY_TRAITS.
 * 'diligent' and 'lazy' are mutually exclusive.
 */
export function rollPersonalityTraits(
  motivation = 'normal',
  cooperation = 'cooperative',
  rng = Math.random,
  heroClass = null
) {
  const pool = TRAIT_POOL_BY_MOTIVATION[motivation] || TRAIT_POOL_BY_MOTIVATION.normal;
  const weights = { ...pool };
  if (cooperation === 'uncooperative') {
    const mult = EMOTION_CONFIG.UNCOOPERATIVE_TRAIT_WEIGHT_MULT;
    weights.hot_headed = (weights.hot_headed || 0) * mult;
    weights.coward = (weights.coward || 0) * mult;
    weights.exit_seeker = (weights.exit_seeker || 0) * mult;
  }
  const classPool = TRAIT_POOL_BY_CLASS[heroClass];
  if (classPool) {
    for (const [id, w] of Object.entries(classPool)) {
      weights[id] = (weights[id] || 0) + w;
    }
  }

  const pick = () => {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    if (total <= 0) return 'cautious';
    let roll = rng() * total;
    for (const [id, w] of entries) {
      roll -= w;
      if (roll <= 0) return id;
    }
    return entries[entries.length - 1][0];
  };

  const traits = [];
  const first = pick();
  traits.push(first);
  if (rng() < 0.3) {
    const second = pick();
    if (second !== first && !(first === 'diligent' && second === 'lazy') && !(first === 'lazy' && second === 'diligent')) {
      traits.push(second);
    }
  }
  return traits;
}

// ---------------------------------------------------------------------------
// Emotion / training field helpers
// ---------------------------------------------------------------------------

/**
 * Sets the hero's Anger (0..100) and mirrors it onto the legacy `stress` field
 * so every existing consumer of `hero.stress` keeps working.
 */
export function setHeroAnger(hero, value) {
  if (!hero) return 0;
  const next = Math.max(0, Math.min(100, Math.round(value || 0)));
  hero.anger = next;
  hero.stress = next;
  return next;
}

/** Adds to the hero's Anger and returns the actual delta. */
export function addHeroAnger(hero, amount) {
  if (!hero || !amount) return 0;
  const prev = hero.anger ?? hero.stress ?? 0;
  const next = setHeroAnger(hero, prev + amount);
  return next - prev;
}

/**
 * Sets the hero's Hunger (0..100) and mirrors it onto the legacy
 * `satisfaction` field (satisfaction = 100 - hunger).
 */
export function setHeroHunger(hero, value) {
  if (!hero) return 0;
  const next = Math.max(0, Math.min(100, Math.round(value || 0)));
  hero.hunger = next;
  hero.satisfaction = Math.max(0, Math.min(100, 100 - next));
  return next;
}

/** Adds to the hero's Hunger and returns the actual delta. */
export function addHeroHunger(hero, amount) {
  if (!hero || !amount) return 0;
  const prev = hero.hunger ?? 0;
  const next = setHeroHunger(hero, prev + amount);
  return next - prev;
}

/**
 * Ensures a hero carries every emotion / training field with a sane default.
 *
 * `rawHero` is the pre-migration hero object; it is used to seed `hunger` from
 * the legacy `satisfaction` value BEFORE the legacy default is applied.
 */
export function normalizeHeroEmotionFields(hero, rawHero = hero) {
  if (!hero) return hero;

  const star = hero.star || 1;
  const heroClass = hero.class || 'Novice';

  if (hero.mentality === undefined || hero.mentality === null) {
    const legacyComposure = rawHero && rawHero.composure !== undefined && rawHero.composure !== null
      ? rawHero.composure
      : null;
    const seed = legacyComposure !== null ? legacyComposure : getDefaultMentality(heroClass, star);
    hero.mentality = Math.max(0, Math.min(100, Math.round(seed)));
  }

  if (hero.hunger === undefined || hero.hunger === null) {
    const legacySatisfaction = rawHero && rawHero.satisfaction !== undefined && rawHero.satisfaction !== null
      ? rawHero.satisfaction
      : null;
    const seed = legacySatisfaction !== null
      ? 100 - legacySatisfaction
      : EMOTION_CONFIG.DEFAULT_HUNGER;
    hero.hunger = Math.max(0, Math.min(100, Math.round(seed)));
  }

  if (hero.fear === undefined || hero.fear === null) {
    hero.fear = EMOTION_CONFIG.DEFAULT_FEAR;
  }
  hero.fear = Math.max(0, Math.min(100, Math.round(hero.fear)));

  if (hero.anger === undefined || hero.anger === null) {
    hero.anger = hero.stress ?? EMOTION_CONFIG.DEFAULT_ANGER;
  }
  hero.anger = Math.max(0, Math.min(100, Math.round(hero.anger)));

  if (hero.motivationScore === undefined || hero.motivationScore === null) {
    hero.motivationScore = getDefaultMotivationScore(hero.motivation);
  }
  hero.motivationScore = Math.max(0, Math.min(100, Math.round(hero.motivationScore)));

  if (!Array.isArray(hero.traits)) hero.traits = [];
  if (!hero.traits.some((t) => EMOTION_CONFIG.PERSONALITY_TRAITS.includes(t))) {
    const rolled = rollPersonalityTraits(hero.motivation, hero.cooperation, Math.random, heroClass);
    hero.traits = hero.traits.concat(rolled);
  }

  if (hero.isSquadLeader === undefined) {
    hero.isSquadLeader = hero.id === 'hero_han';
  }
  if (!hero.currentActivity) hero.currentActivity = 'idle';
  if (hero.injury === undefined) hero.injury = null;
  if (!hero.painToleranceCounters) {
    hero.painToleranceCounters = { damageTaken: 0, damageHealed: 0 };
  }
  if (!hero.coTrainedPairs) hero.coTrainedPairs = {};
  if (!Array.isArray(hero.activityHistory)) hero.activityHistory = [];

  // Keep the legacy mirrors in sync.
  hero.stress = hero.anger;
  hero.satisfaction = Math.max(0, Math.min(100, 100 - hero.hunger));

  return hero;
}

export function createHeroFromTemplate(templateKey) {
  const tpl = HERO_TEMPLATES[templateKey];
  if (!tpl) return null;
  return normalizeHeroEmotionFields({
    id: tpl.id || ('hero_' + Date.now() + '_' + Math.floor(Math.random() * 100000)),
    name: tpl.name,
    star: tpl.star || 1,
    level: 1,
    exp: 0,
    fatigue: 0,
    stress: 0,
    class: tpl.class || 'Novice',
    motivation: tpl.motivation || rollMotivation(tpl.name, tpl.cooperation),
    hair: tpl.hair || 0x222222,
    armor: tpl.armor || 0x445566,
    weapon: tpl.weapon || 'sword',
    personality: tpl.personality || 'Disciplined',
    pastJob: tpl.pastJob,
    stats: { ...(tpl.baseStats || { str: 10, agi: 10, vit: 10, int: 10, wil: 10 }) },
    composure: tpl.composure || 50,
    traits: [...(tpl.traits || [])],
    skills: (tpl.skills || []).map((s) => ({ ...s })),
    talents: [...(tpl.talents || [])],
    hiddenTalent: tpl.hiddenTalent,
    hiddenTalents: tpl.hiddenTalents ? [...tpl.hiddenTalents] : undefined,
    isDwarf: tpl.isDwarf,
    scale: tpl.scale,
    alive: true,
  });
}
