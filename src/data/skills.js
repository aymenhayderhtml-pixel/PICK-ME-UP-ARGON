import { showSystemMessage } from '../ui/Hud.js';

export const SKILLS = {
  basic_swordsmanship: {
    id: 'basic_swordsmanship',
    name: 'Basic Swordsmanship',
    type: 'skill',
    maxLevel: 10,
    description: 'Fundamental sword technique increasing melee damage output.',
    effects: { damageMult: 0.04 },
  },
  basic_shield_technique: {
    id: 'basic_shield_technique',
    name: 'Basic Shield Technique',
    type: 'skill',
    maxLevel: 10,
    description: 'Foundational shield technique reducing block stamina cost and widening block windows.',
    effects: { blockStaminaMult: -0.03, blockWindow: 0.01 },
  },
  basic_spearmanship: {
    id: 'basic_spearmanship',
    name: 'Basic Spearmanship',
    type: 'skill',
    maxLevel: 10,
    description: 'Thrusting lance discipline granting extended reach during melee strikes.',
    effects: { reachAdd: 0.08 },
  },
  basic_dagger_technique: {
    id: 'basic_dagger_technique',
    name: 'Basic Dagger Technique',
    type: 'skill',
    maxLevel: 10,
    description: 'Nimble blade handling providing faster strike recovery and heightened critical chance.',
    effects: { attackSpeedMult: 0.03, critChance: 0.01 },
  },
  basic_archery: {
    id: 'basic_archery',
    name: 'Basic Archery',
    type: 'skill',
    maxLevel: 10,
    description: 'Essential bow training improving ranged shot precision and effective range.',
    effects: { rangedAccuracy: 0.03 },
  },
  stealth: {
    id: 'stealth',
    name: 'Stealth',
    type: 'skill',
    maxLevel: 10,
    description: 'Conceals presence to significantly reduce monster detection range.',
    effects: { aggroRangeMult: -0.04 },
  },
  composure: {
    id: 'composure',
    name: 'Composure',
    type: 'talent',
    maxLevel: 1,
    description: 'Unshakeable veteran mentality preventing panic, confusion, and fear in deadly battles.',
    effects: { panicResist: 1 },
  },
  keen_sight: {
    id: 'keen_sight',
    name: 'Keen Sight',
    type: 'talent',
    maxLevel: 1,
    description: 'Extraordinary ocular perception allowing early detection of lurking enemies and traps.',
    effects: { detectRangeAdd: 4 },
  },
  leadership: {
    id: 'leadership',
    name: 'Leadership',
    type: 'skill',
    maxLevel: 10,
    description: 'Inspires companion squad members to deal greater coordinated damage.',
    effects: { squadDamageMult: 0.02 },
  },
  berserk: {
    id: 'berserk',
    name: 'Berserk',
    type: 'skill',
    maxLevel: 10,
    description: 'Channels feral rage to trade defensive stability for vicious attack power.',
    effects: { damageMult: 0.08, defenseMult: -0.05 },
  },
  heavy_armor_mastery: {
    id: 'heavy_armor_mastery',
    name: 'Heavy Armor Mastery',
    type: 'skill',
    maxLevel: 10,
    description: 'Conditioning with heavy plating that minimizes stamina exhaustion while moving.',
    effects: { staminaDrainMult: -0.04 },
  },
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    type: 'skill',
    maxLevel: 10,
    description: 'Hurls an explosive sphere of concentrated flame inflicting devastating magical damage.',
    effects: { spellDamage: 12 },
  },
  mana_amplification: {
    id: 'mana_amplification',
    name: 'Mana Amplification',
    type: 'skill',
    maxLevel: 10,
    description: 'Purifies inner mana channels to boost all elemental spell potency.',
    effects: { spellDamageMult: 0.05 },
  },
  pain_tolerance: {
    id: 'pain_tolerance',
    name: 'Pain Tolerance',
    type: 'skill',
    maxLevel: 10,
    description: 'Endures punishment at the training ground. Each level shaves incoming damage by 1.5% and lets the hero keep fighting through critical wounds.',
    effects: { hpThresholdKeepFighting: 1, incomingDamageReduction: 0.015 },
  },
  evasion: {
    id: 'evasion',
    name: 'Evasion',
    type: 'skill',
    maxLevel: 10,
    description: 'Light-footed footwork that reduces dodge stamina consumption and lengthens roll invulnerability.',
    effects: { dodgeCostMult: -0.03, rollInvuln: 0.01 },
  },
  smithing: {
    id: 'smithing',
    name: 'Smithing',
    type: 'skill',
    maxLevel: 10,
    description: 'Mastery of metallurgy and the forge, increasing crafted item quality and reducing repair costs.',
    effects: { forgeQuality: 0.05, repairDiscount: 0.03 },
  },
  transcendence: {
    id: 'transcendence',
    name: 'Transcendence',
    type: 'talent',
    maxLevel: 1,
    description: 'Supreme awakening beyond mortal limitations, granting +10% to all combat parameters.',
    effects: { allStatsMult: 0.1 },
  },
  combat_logic: {
    id: 'combat_logic',
    name: 'Combat Logic',
    type: 'skill',
    maxLevel: 10,
    description: 'Calculates combat tempo and structural weak points with cold precision.',
    effects: { critChance: 0.01 },
  },
  intermediate_swordsmanship: {
    id: 'intermediate_swordsmanship',
    name: 'Intermediate Swordsmanship',
    type: 'skill',
    maxLevel: 10,
    description: 'Refined sword technique delivering sharper, higher-impact blade cuts.',
    effects: { damageMult: 0.06 },
  },
  knights_determination: {
    id: 'knights_determination',
    name: "Knight's Determination",
    type: 'skill',
    maxLevel: 10,
    description: 'Steadfast chivalric courage resisting panic and fortifying defense.',
    effects: { panicResist: 1, defenseMult: 0.03 },
  },
  superhuman_strength: {
    id: 'superhuman_strength',
    name: 'Superhuman Strength',
    type: 'talent',
    maxLevel: 1,
    description: 'Tremendous innate muscle density boosting physical strength and damage output by 15%.',
    effects: { strMult: 0.15 },
  },
  quick_learner: {
    id: 'quick_learner',
    name: 'Quick Learner',
    type: 'talent',
    maxLevel: 1,
    description: 'Rapid comprehension granting 1.5x experience acquisition for all combat skills.',
    effects: { skillXpMult: 1.5 },
  },
  natural_leader: {
    id: 'natural_leader',
    name: 'Natural Leader',
    type: 'talent',
    maxLevel: 1,
    description: 'Calm presence radiating composure to all surrounding squad members.',
    effects: { composureAura: 6 },
  },
  iron_stomach: {
    id: 'iron_stomach',
    name: 'Iron Stomach',
    type: 'talent',
    maxLevel: 1,
    description: 'Robust digestive resilience providing high tolerance to poor ration conditions.',
    effects: { foodTolerance: 25 },
  },

  // --- Training system skills ---------------------------------------------
  quiver_handling: {
    id: 'quiver_handling',
    name: 'Quiver Handling',
    type: 'skill',
    maxLevel: 10,
    description: 'Efficient arrow management speeding up the draw and improving volley rhythm.',
    effects: { reloadSpeedMult: 0.04 },
  },
  mana_control: {
    id: 'mana_control',
    name: 'Mana Control',
    type: 'skill',
    maxLevel: 10,
    description: 'Disciplined channeling reducing the mana cost of every spell.',
    effects: { manaCostReduction: 0.03 },
  },
  basic_fire_magic: {
    id: 'basic_fire_magic',
    name: 'Basic Fire Magic',
    type: 'skill',
    maxLevel: 10,
    description: 'Elemental fire fundamentals taught at the brazier target.',
    effects: { spellDamage: 6 },
  },

  // --- Combined skills (produced by SKILL_RECIPES) ------------------------
  basic_sword_shield: {
    id: 'basic_sword_shield',
    name: 'Basic Sword-Shield',
    type: 'skill',
    maxLevel: 20,
    description: 'Sword and shield drilled as one discipline.',
    effects: { damageMult: 0.06, blockStaminaMult: -0.04, blockWindow: 0.015 },
  },
  rapid_volley_archery: {
    id: 'rapid_volley_archery',
    name: 'Rapid Volley Archery',
    type: 'skill',
    maxLevel: 20,
    description: 'Bow and quiver fused into a relentless volley.',
    effects: { damageMult: 0.06, critChanceBonus: 0.02, reloadSpeedMult: 0.08 },
  },
  controlled_flamecraft: {
    id: 'controlled_flamecraft',
    name: 'Controlled Flamecraft',
    type: 'skill',
    maxLevel: 20,
    description: 'Fire and mana woven into a single disciplined art.',
    effects: { spellDamageMult: 0.07, manaCostReduction: 0.04 },
  },
  phantom_lancer_style: {
    id: 'phantom_lancer_style',
    name: 'Phantom Lancer Style',
    type: 'skill',
    maxLevel: 20,
    description: 'Spear and evasion fused into a ghost-like lunge.',
    effects: { damageMult: 0.06, dodgeWindowBonus: 0.02 },
  },
  shadow_assassination: {
    id: 'shadow_assassination',
    name: 'Shadow Assassination',
    type: 'skill',
    maxLevel: 20,
    description: 'Dagger and stealth fused into a shadow strike.',
    effects: { damageMult: 0.05, critDamageMult: 0.08 },
  },
};

export function getSkill(id) {
  if (!id) return null;
  const key = id.toLowerCase().replace(/\s+/g, '_');
  return SKILLS[key] || null;
}

export function getSkillEffects(hero) {
  const totalEffects = {};

  if (!hero) return totalEffects;

  const normalize = (v) => String(v || '').toLowerCase().replace(/\s+/g, '_');
  const skills = hero.skills || [];

  // A skill that also exists as a talent must not apply its effects twice.
  const skillIds = new Set();
  for (const s of skills) {
    skillIds.add(normalize(typeof s === 'string' ? s : (s.id || s.name)));
  }

  // 1. Process active/passive skills. Skills that were merged into a combined
  //    skill keep their entry (and their level) but no longer grant effects.
  for (const s of skills) {
    if (typeof s === 'object' && s.merged === true) continue;
    const sId = typeof s === 'string' ? s : s.id || s.name;
    const sLevel = typeof s === 'object' ? s.level || 1 : 1;
    const def = getSkill(sId);
    if (def && def.effects) {
      for (const [key, val] of Object.entries(def.effects)) {
        totalEffects[key] = (totalEffects[key] || 0) + val * sLevel;
      }
    }
  }

  // 2. Process innate talents
  const talents = hero.talents || [];
  for (const t of talents) {
    const tId = typeof t === 'string' ? t : t.id || t.name;
    if (skillIds.has(normalize(tId))) continue;
    const def = getSkill(tId);
    if (def && def.effects) {
      for (const [key, val] of Object.entries(def.effects)) {
        totalEffects[key] = (totalEffects[key] || 0) + val;
      }
    }
  }

  return totalEffects;
}

export function addSkillExp(hero, skillId, expAmount) {
  if (!hero || !skillId || expAmount <= 0) return;
  const fx = getSkillEffects(hero);
  const effectiveExp = fx.skillXpMult ? Math.round(expAmount * fx.skillXpMult) : expAmount;
  const sKey = skillId.toLowerCase().replace(/\s+/g, '_');
  let skill = (hero.skills || []).find((s) => (s.id || s.name || '').toLowerCase().replace(/\s+/g, '_') === sKey);
  const def = getSkill(sKey);
  if (!skill) {
    if (!def) return;
    hero.skills = hero.skills || [];
    skill = { id: def.id, name: def.name, level: 1, exp: 0 };
    hero.skills.push(skill);
  }
  const skillName = def ? def.name : (skill.name || skill.id);
  skill.exp = (skill.exp || 0) + effectiveExp;
  const maxLevel = def ? def.maxLevel || 10 : 10;
  let neededXp = 100 * skill.level;
  while (skill.exp >= neededXp && skill.level < maxLevel) {
    skill.exp -= neededXp;
    skill.level += 1;
    showSystemMessage(`SKILL ${skillName.toUpperCase()} HAS REACHED LEVEL ${skill.level}.`);
    neededXp = 100 * skill.level;
  }
}

export function rollStatFromSkill(skillId) {
  const s = (skillId || '').toLowerCase().replace(/\s+/g, '_');
  const r = Math.random();
  if (s.includes('sword') || s.includes('armor') || s.includes('berserk')) {
    return r < 0.60 ? 'str' : r < 0.85 ? 'vit' : 'agi';
  }
  if (s.includes('shield')) {
    return r < 0.60 ? 'vit' : r < 0.85 ? 'str' : 'wil';
  }
  if (s.includes('dagger') || s.includes('archery') || s.includes('stealth') || s.includes('evasion')) {
    return r < 0.65 ? 'agi' : r < 0.85 ? 'str' : 'vit';
  }
  if (s.includes('fire') || s.includes('mana')) {
    return r < 0.70 ? 'int' : r < 0.90 ? 'wil' : 'vit';
  }
  if (s.includes('leader')) {
    return r < 0.50 ? 'wil' : r < 0.75 ? 'str' : 'vit';
  }
  if (s.includes('smith')) {
    return r < 0.40 ? 'str' : r < 0.80 ? 'vit' : 'wil';
  }
  const all = ['str', 'agi', 'vit', 'int', 'wil'];
  return all[Math.floor(r * all.length)];
}
