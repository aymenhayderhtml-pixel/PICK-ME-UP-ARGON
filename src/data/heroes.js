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
    personality: 'Observant & Anxious',
    baseStats: { str: 5, agi: 10, vit: 6, int: 6, wil: 7 },
    skills: [
      { id: 'basic_dagger_technique', level: 1 },
      { id: 'basic_archery', level: 1 },
    ],
    talents: ['keen_sight'],
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

const FANTASY_NAMES = [
  'Kaelen', 'Theron', 'Lyra', 'Varis', 'Gideon',
  'Rowan', 'Darian', 'Elowen', 'Kael', 'Boran',
  'Mireia', 'Corvin', 'Titus', 'Selene', 'Bryce',
  'Leona', 'Valerius', 'Karin', 'Orin', 'Sylvia'
];

export function generateNoviceHero({ job = null, forceUncooperative = false, rng = Math.random, existingHeroes = [] } = {}) {
  const chosenJob = job || PAST_JOBS[Math.floor(rng() * PAST_JOBS.length)];
  let isUncooperative = false;
  if (forceUncooperative) {
    isUncooperative = true;
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

  return {
    id: 'hero_novice_' + Date.now() + '_' + Math.floor(rng() * 100000),
    name,
    star: 1,
    level: 1,
    exp: 0,
    fatigue: 0,
    class: 'Novice',
    pastJob: chosenJob,
    cooperation: isUncooperative ? 'uncooperative' : 'cooperative',
    motivation: isUncooperative ? 'lazy' : rollMotivation(name),
    hair,
    armor: 0x445566,
    weapon: jobInfo.weapon,
    personality: isUncooperative ? 'Rebellious & Bitter' : 'Humble & Eager',
    stats,
    composure: Math.floor(rng() * 40) + 20, // 20 to 59
    skills: [
      { id: jobInfo.skillId, level: 1, exp: 0 }
    ],
    talents: [],
    alive: true,
  };
}

const CLASS_BASE_STATS = {
  Vanguard: { str: 8, agi: 6, vit: 9, int: 4, wil: 7 },
  Scout: { str: 6, agi: 9, vit: 6, int: 6, wil: 6 },
  Mage: { str: 4, agi: 6, vit: 5, int: 10, wil: 8 },
  Berserker: { str: 10, agi: 7, vit: 7, int: 3, wil: 5 },
  Healer: { str: 4, agi: 5, vit: 6, int: 8, wil: 10 },
  Artisan: { str: 9, agi: 5, vit: 11, int: 8, wil: 10 },
};

const CLASS_SKILL_POOLS = {
  Vanguard: ['basic_swordsmanship', 'basic_shield_technique', 'heavy_armor_mastery', 'leadership'],
  Scout: ['basic_dagger_technique', 'basic_archery', 'stealth', 'evasion'],
  Mage: ['fireball', 'mana_amplification', 'evasion'],
  Berserker: ['basic_swordsmanship', 'berserk', 'heavy_armor_mastery'],
  Healer: ['mana_amplification', 'leadership', 'basic_shield_technique'],
  Artisan: ['smithing', 'heavy_armor_mastery', 'basic_swordsmanship'],
};

const TALENT_POOL = ['composure', 'keen_sight', 'pain_tolerance'];

const CLASS_PALETTES = {
  Vanguard: { hair: 0x3d2715, armor: 0x48586c, weapon: 'Sword & Shield' },
  Scout: { hair: 0x8b4513, armor: 0x3e5f32, weapon: 'Shortbow' },
  Mage: { hair: 0x5b3270, armor: 0x2d3460, weapon: 'Wand' },
  Berserker: { hair: 0x221111, armor: 0x5a2323, weapon: 'Axe' },
  Healer: { hair: 0xddb875, armor: 0xd8d8e0, weapon: 'Scepter' },
  Artisan: { hair: 0x5a3d24, armor: 0x8b5a2b, weapon: 'Hammer' },
};

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

  const classes = ['Vanguard', 'Scout', 'Mage', 'Berserker', 'Healer'];
  const heroClass = classes[Math.floor(rng() * classes.length)];

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

  return {
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
    skills: heroSkills,
    talents,
    alive: true,
  };
}

export function rollMotivation(heroName, cooperation = null) {
  if (heroName === 'Han Islat') return 'diligent';
  if (cooperation === 'uncooperative') return 'lazy';
  const r = Math.random();
  if (r < 0.25) return 'diligent';
  if (r < 0.80) return 'normal';
  return 'lazy';
}

export function createHeroFromTemplate(templateKey) {
  const tpl = HERO_TEMPLATES[templateKey];
  if (!tpl) return null;
  return {
    id: tpl.id || ('hero_' + Date.now() + '_' + Math.floor(Math.random() * 100000)),
    name: tpl.name,
    star: tpl.star || 1,
    level: 1,
    exp: 0,
    fatigue: 0,
    stress: 0,
    class: tpl.class || 'Novice',
    motivation: rollMotivation(tpl.name, tpl.cooperation),
    hair: tpl.hair || 0x222222,
    armor: tpl.armor || 0x445566,
    weapon: tpl.weapon || 'sword',
    personality: tpl.personality || 'Disciplined',
    stats: { ...(tpl.baseStats || { str: 10, agi: 10, vit: 10, int: 10, wil: 10 }) },
    composure: tpl.composure || 50,
    skills: (tpl.skills || []).map((s) => ({ ...s })),
    talents: [...(tpl.talents || [])],
    hiddenTalent: tpl.hiddenTalent,
    isDwarf: tpl.isDwarf,
    scale: tpl.scale,
    alive: true,
  };
}
