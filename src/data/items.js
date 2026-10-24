export const ITEM_GRADES = {
  'E': { grade: 'E', rate: 0.45, mult: 0.8, color: '#9e9e9e', tier: 1 },
  'D': { grade: 'D', rate: 0.28, mult: 1.0, color: '#4caf50', tier: 1 },
  'C': { grade: 'C', rate: 0.14, mult: 1.2, color: '#2196f3', tier: 2 },
  'B': { grade: 'B', rate: 0.08, mult: 1.45, color: '#9c27b0', tier: 2 },
  'A': { grade: 'A', rate: 0.035, mult: 1.75, color: '#ff9800', tier: 3 },
  'S': { grade: 'S', rate: 0.013, mult: 2.1, color: '#e91e63', tier: 3 },
  'S+': { grade: 'S+', rate: 0.002, mult: 2.6, color: '#ffd700', tier: 4 },
};

export const ITEM_TEMPLATES = {
  rusty_sword: {
    templateId: 'rusty_sword',
    name: 'Rusty Sword',
    slot: 'weapon',
    weaponType: 'sword',
    grade: 'E',
    tier: 1,
    damageMult: 1.0,
    blockMult: 0,
    defense: 0,
    maxDurability: 40,
    description: 'A weathered iron blade with dull, chipped edges.',
  },
  wooden_shield: {
    templateId: 'wooden_shield',
    name: 'Wooden Shield',
    slot: 'offhand',
    weaponType: 'shield',
    grade: 'E',
    tier: 1,
    damageMult: 0,
    blockMult: 1.0,
    defense: 1,
    maxDurability: 50,
    description: 'Sturdy wooden planks bound by iron bands.',
  },
  e_iron_sword: {
    templateId: 'e_iron_sword',
    name: 'E-Rank Iron Sword',
    slot: 'weapon',
    weaponType: 'sword',
    grade: 'E',
    tier: 1,
    damageMult: 1.0,
    blockMult: 0,
    defense: 0,
    maxDurability: 40,
    description: 'Mass-produced iron sword of E rank.',
  },
  e_round_shield: {
    templateId: 'e_round_shield',
    name: 'E-Rank Round Shield',
    slot: 'offhand',
    weaponType: 'shield',
    grade: 'E',
    tier: 1,
    damageMult: 0,
    blockMult: 1.0,
    defense: 1,
    maxDurability: 50,
    description: 'Mass-produced round shield of E rank.',
  },
  iron_sword: {
    templateId: 'iron_sword',
    name: 'Iron Sword',
    slot: 'weapon',
    weaponType: 'sword',
    grade: 'D',
    tier: 2,
    damageMult: 1.25,
    blockMult: 0,
    defense: 0,
    maxDurability: 60,
    description: 'Forged military standard iron sword with a clean edge.',
  },
  morning_star: {
    templateId: 'morning_star',
    name: 'Morning Star',
    slot: 'weapon',
    weaponType: 'mace',
    grade: 'D',
    tier: 1,
    damageMult: 1.15,
    attackSpeedMult: 0.85,
    reach: 2.4,
    blockMult: 0,
    defense: 0,
    maxDurability: 60,
    description: 'A spiked iron morning star dealing heavy concussive strikes.',
  },
  iron_shield: {
    templateId: 'iron_shield',
    name: 'Iron Shield',
    slot: 'offhand',
    weaponType: 'shield',
    grade: 'D',
    tier: 2,
    damageMult: 0,
    blockMult: 1.2,
    defense: 3,
    maxDurability: 80,
    description: 'Solid forged round iron shield offering high deflection.',
  },
  steel_sword: {
    templateId: 'steel_sword',
    name: 'Steel Sword',
    slot: 'weapon',
    weaponType: 'sword',
    grade: 'B',
    tier: 3,
    damageMult: 1.5,
    blockMult: 0,
    defense: 0,
    maxDurability: 90,
    description: 'Masterwork steel blade reinforced with boss core essence.',
  },
  leather_armor: {
    templateId: 'leather_armor',
    name: 'Leather Armor',
    slot: 'armor',
    weaponType: null,
    grade: 'E',
    tier: 1,
    damageMult: 0,
    blockMult: 0,
    defense: 3,
    maxDurability: 50,
    description: 'Supple boiled leather armor granting basic protection without hindering speed.',
  },
  chain_armor: {
    templateId: 'chain_armor',
    name: 'Chain Armor',
    slot: 'armor',
    weaponType: null,
    grade: 'D',
    tier: 2,
    damageMult: 0,
    blockMult: 0,
    defense: 7,
    maxDurability: 80,
    description: 'Interlinked iron rings absorbing heavier blows.',
  },
  plate_armor: {
    templateId: 'plate_armor',
    name: 'Plate Armor',
    slot: 'armor',
    weaponType: null,
    grade: 'B',
    tier: 3,
    damageMult: 0,
    blockMult: 0,
    defense: 12,
    maxDurability: 120,
    description: 'Heavy steel breastplate. Drains stamina +10% unless the wearer has Heavy Armor Mastery.',
  },
  hunting_bow: {
    templateId: 'hunting_bow',
    name: 'Hunting Bow',
    slot: 'weapon',
    weaponType: 'bow',
    grade: 'E',
    tier: 1,
    damageMult: 1.15,
    blockMult: 0,
    defense: 0,
    maxDurability: 50,
    description: 'Curved wooden recurve bow suited for long-range scouts.',
  },
  iron_spear: {
    templateId: 'iron_spear',
    name: 'Iron Spear',
    slot: 'weapon',
    weaponType: 'spear',
    grade: 'D',
    tier: 2,
    damageMult: 1.25,
    blockMult: 0,
    defense: 0,
    maxDurability: 60,
    description: 'Long thrusting spear with a sharpened iron spearhead.',
  },
  well_forged_longsword: {
    templateId: 'well_forged_longsword',
    name: 'Well-Forged Longsword',
    slot: 'weapon',
    weaponType: 'sword',
    grade: 'C',
    tier: 3,
    damageMult: 1.35,
    blockMult: 0,
    defense: 0,
    maxDurability: 80,
    description: 'A well-forged longsword with a keen, balanced edge.',
  },
  balanced_shortbow: {
    templateId: 'balanced_shortbow',
    name: 'Balanced Shortbow',
    slot: 'weapon',
    weaponType: 'bow',
    grade: 'C',
    tier: 3,
    damageMult: 1.3,
    blockMult: 0,
    defense: 0,
    maxDurability: 75,
    description: 'A balanced shortbow tuned for quick, accurate shots.',
  },
  sharp_long_spear: {
    templateId: 'sharp_long_spear',
    name: 'Sharp Long Spear',
    slot: 'weapon',
    weaponType: 'spear',
    grade: 'C',
    tier: 3,
    damageMult: 1.4,
    blockMult: 0,
    defense: 0,
    maxDurability: 85,
    description: 'A long spear with a razor-sharp head for deep thrusts.',
  },
  hard_iron_shield: {
    templateId: 'hard_iron_shield',
    name: 'Hard Iron Shield',
    slot: 'offhand',
    weaponType: 'shield',
    grade: 'C',
    tier: 3,
    damageMult: 0,
    blockMult: 1.35,
    defense: 5,
    maxDurability: 100,
    description: 'A hard iron shield built to deflect heavy blows.',
  },
  short_dagger: {
    templateId: 'short_dagger',
    name: 'Short Dagger',
    slot: 'weapon',
    weaponType: 'dagger',
    grade: 'E',
    tier: 1,
    damageMult: 0.9,
    blockMult: 0,
    defense: 0,
    maxDurability: 45,
    description: 'Concealable steel dagger designed for rapid close-quarters slashing.',
  },
  greatsword: {
    templateId: 'greatsword',
    name: 'Greatsword',
    slot: 'weapon',
    weaponType: 'greatsword',
    grade: 'C',
    tier: 2,
    damageMult: 1.45,
    blockMult: 0,
    defense: 0,
    maxDurability: 70,
    description: 'Massive two-handed iron blade wielding crushing momentum.',
  },
  mage_staff: {
    templateId: 'mage_staff',
    name: 'Mage Staff',
    slot: 'weapon',
    weaponType: 'staff',
    grade: 'D',
    tier: 2,
    damageMult: 1.2,
    blockMult: 0,
    defense: 0,
    maxDurability: 50,
    description: 'Focus staff topped with a mana-resonant crystal.',
  },
};

export const FORGE_RECIPES = [
  {
    id: 'forge_iron_sword',
    resultTemplateId: 'iron_sword',
    name: 'Iron Sword',
    slot: 'weapon',
    goldCost: 30,
    materials: { crude_iron: 3, goblin_hide: 1 },
    isMaterialResult: false,
  },
  {
    id: 'forge_iron_shield',
    resultTemplateId: 'iron_shield',
    name: 'Iron Shield',
    slot: 'offhand',
    goldCost: 30,
    materials: { crude_iron: 4, goblin_hide: 2 },
    isMaterialResult: false,
  },
  {
    id: 'forge_chain_armor',
    resultTemplateId: 'chain_armor',
    name: 'Chain Armor',
    slot: 'armor',
    goldCost: 60,
    materials: { crude_iron: 6, goblin_hide: 3 },
    isMaterialResult: false,
  },
  {
    id: 'forge_iron_spear',
    resultTemplateId: 'iron_spear',
    name: 'Iron Spear',
    slot: 'weapon',
    goldCost: 25,
    materials: { crude_iron: 3, goblin_tooth: 1 },
    isMaterialResult: false,
  },
  {
    id: 'forge_hunting_bow',
    resultTemplateId: 'hunting_bow',
    name: 'Hunting Bow',
    slot: 'weapon',
    goldCost: 25,
    materials: { crude_iron: 2, goblin_hide: 3 },
    isMaterialResult: false,
  },
  {
    id: 'forge_steel_sword',
    resultTemplateId: 'steel_sword',
    name: 'Steel Sword',
    slot: 'weapon',
    goldCost: 150,
    materials: { iron_ingot: 3, hobgoblin_core: 1 },
    isMaterialResult: false,
  },
  {
    id: 'forge_iron_ingot',
    resultMaterialId: 'iron_ingot',
    name: 'Iron Ingot',
    slot: 'material',
    goldCost: 10,
    materials: { crude_iron: 3 },
    isMaterialResult: true,
  },
  {
    id: 'forge_well_forged_longsword',
    resultTemplateId: 'well_forged_longsword',
    name: 'Well-Forged Longsword',
    slot: 'weapon',
    goldCost: 120,
    materials: { crude_iron: 4, goblin_hide: 2 },
    isMaterialResult: false,
  },
  {
    id: 'forge_balanced_shortbow',
    resultTemplateId: 'balanced_shortbow',
    name: 'Balanced Shortbow',
    slot: 'weapon',
    goldCost: 120,
    materials: { crude_iron: 3, goblin_hide: 3 },
    isMaterialResult: false,
  },
  {
    id: 'forge_sharp_long_spear',
    resultTemplateId: 'sharp_long_spear',
    name: 'Sharp Long Spear',
    slot: 'weapon',
    goldCost: 120,
    materials: { crude_iron: 4, goblin_tooth: 2 },
    isMaterialResult: false,
  },
  {
    id: 'forge_iron_ingot',
    resultMaterialId: 'iron_ingot',
    name: 'Iron Ingot',
    slot: 'material',
    goldCost: 10,
    materials: { crude_iron: 3 },
    isMaterialResult: true,
  },
  {
    id: 'forge_e_iron_sword',
    resultTemplateId: 'e_iron_sword',
    name: 'E-Rank Iron Sword',
    slot: 'weapon',
    goldCost: 15,
    materials: { crude_iron: 2 },
    isMaterialResult: false,
  },
  {
    id: 'forge_e_round_shield',
    resultTemplateId: 'e_round_shield',
    name: 'E-Rank Round Shield',
    slot: 'offhand',
    goldCost: 15,
    materials: { crude_iron: 2, goblin_hide: 1 },
    isMaterialResult: false,
  },
];

let itemUidCounter = 1;

export function createItemInstance(templateId, overrides = {}) {
  const tpl = ITEM_TEMPLATES[templateId] || ITEM_TEMPLATES.rusty_sword;
  const uniqueId = `item_${Date.now()}_${itemUidCounter++}_${Math.floor(Math.random() * 1000)}`;

  const maxDurability = overrides.maxDurability ?? tpl.maxDurability;
  const durability = overrides.durability ?? maxDurability;

  const grade = overrides.grade ?? tpl.grade ?? 'E';
  const gradeInfo = ITEM_GRADES[grade] || ITEM_GRADES.E;
  const tier = overrides.tier ?? tpl.tier ?? gradeInfo.tier ?? 1;

  return {
    id: uniqueId,
    templateId: tpl.templateId,
    name: overrides.name ?? tpl.name,
    slot: tpl.slot,
    weaponType: tpl.weaponType,
    grade,
    tier,
    damageMult: overrides.damageMult ?? tpl.damageMult,
    blockMult: overrides.blockMult ?? tpl.blockMult,
    defense: overrides.defense ?? tpl.defense,
    maxDurability,
    durability,
    enhance: overrides.enhance ?? 0,
    source: overrides.source ?? 'forge',
    quality: overrides.quality ?? 'Standard',
  };
}

export const GACHA_BASE_TYPES = [
  { type: 'sword', templateId: 'iron_sword' },
  { type: 'bow', templateId: 'hunting_bow' },
  { type: 'morning_star', templateId: 'morning_star' },
  { type: 'spear', templateId: 'iron_spear' },
  { type: 'dagger', templateId: 'short_dagger' },
  { type: 'staff', templateId: 'mage_staff' },
  { type: 'shield', templateId: 'iron_shield' },
  { type: 'armor', templateId: 'chain_armor' },
];

function rollGrade(guaranteeDPlus = false) {
  const grades = ['E', 'D', 'C', 'B', 'A', 'S', 'S+'];
  if (guaranteeDPlus) {
    const dPlusGrades = ['D', 'C', 'B', 'A', 'S', 'S+'];
    const totalRate = 0.55;
    let roll = Math.random() * totalRate;
    for (const g of dPlusGrades) {
      const rate = ITEM_GRADES[g].rate;
      if (roll <= rate) return g;
      roll -= rate;
    }
    return 'D';
  }

  let roll = Math.random();
  for (const g of grades) {
    const rate = ITEM_GRADES[g].rate;
    if (roll <= rate) return g;
    roll -= rate;
  }
  return 'E';
}

export function rollEquipmentGacha(count = 1) {
  const items = [];
  let hasDPlus = false;

  for (let i = 0; i < count; i++) {
    const isLastOfTen = count === 10 && i === 9 && !hasDPlus;
    const grade = rollGrade(isLastOfTen);
    if (grade !== 'E') hasDPlus = true;

    const baseChoice = GACHA_BASE_TYPES[Math.floor(Math.random() * GACHA_BASE_TYPES.length)];
    const tpl = ITEM_TEMPLATES[baseChoice.templateId] || ITEM_TEMPLATES.iron_sword;
    const gradeInfo = ITEM_GRADES[grade] || ITEM_GRADES.D;
    const mult = gradeInfo.mult;

    const damageMult = tpl.damageMult ? Math.round(tpl.damageMult * mult * 100) / 100 : 0;
    const blockMult = tpl.blockMult ? Math.round(tpl.blockMult * mult * 100) / 100 : 0;
    const defense = tpl.defense ? Math.max(1, Math.round(tpl.defense * mult)) : 0;
    const maxDurability = Math.round(tpl.maxDurability * mult);

    const item = createItemInstance(tpl.templateId, {
      name: tpl.name,
      grade,
      tier: gradeInfo.tier,
      damageMult,
      blockMult,
      defense,
      maxDurability,
      durability: maxDurability,
      source: 'gacha',
    });

    items.push(item);
  }

  return items;
}

