export const MATERIALS = {
  goblin_hide: {
    id: 'goblin_hide',
    name: 'Goblin Hide',
    grade: 'E',
    color: 0x5a8f3a,
    description: 'Tough, dried goblin leather used for crafting light armor and straps.',
  },
  crude_iron: {
    id: 'crude_iron',
    name: 'Iron Ore (C)',
    grade: 'C',
    color: 0x888899,
    description: 'Unrefined iron scrap scavenged from forest scavengers.',
  },
  goblin_tooth: {
    id: 'goblin_tooth',
    name: 'Goblin Tooth',
    grade: 'E',
    color: 0xffffff,
    description: 'Sharp, jagged tooth favored for piercing spearheads.',
  },
  hobgoblin_core: {
    id: 'hobgoblin_core',
    name: 'Hobgoblin Core',
    grade: 'C',
    color: 0xdc143c,
    description: 'A pulsating, fiery boss core used for masterwork steel weapons.',
  },
  orc_tusk: {
    id: 'orc_tusk',
    name: 'Orc Tusk',
    grade: 'C',
    color: 0xddccaa,
    description: 'Heavy tusk harvested from brutal lowland orcs.',
  },
  iron_ingot: {
    id: 'iron_ingot',
    name: 'Iron Ingot',
    grade: 'C',
    color: 0x00e5ff,
    description: 'Refined iron smelted at the forge. Fundamental smithing metal.',
  },
  awakening_stone: {
    id: 'awakening_stone',
    name: 'Awakening Stone',
    grade: 'C',
    color: 0xff00ff,
    description: 'A rare celestial catalyst required for 7-star transcendence.',
  },
  steel: {
    id: 'steel',
    name: 'Steel (C)',
    grade: 'C',
    color: 0xa0b0c0,
    description: 'Refined high-grade alloy used in elite equipment.',
  },
  copper: {
    id: 'copper',
    name: 'Copper (C)',
    grade: 'C',
    color: 0xb87333,
    description: 'Malleable reddish metal used in versatile gear.',
  },
  leather: {
    id: 'leather',
    name: 'Leather (C)',
    grade: 'C',
    color: 0x8b5a2b,
    description: 'Tanned animal hide.',
  },
};

export function getMaterial(id) {
  return MATERIALS[id] || null;
}

export function createInitialMaterials() {
  return {
    goblin_hide: 0,
    crude_iron: 0,
    goblin_tooth: 0,
    hobgoblin_core: 0,
    orc_tusk: 0,
    iron_ingot: 0,
    awakening_stone: 0,
    steel: 0,
    copper: 0,
    leather: 0,
  };
}
