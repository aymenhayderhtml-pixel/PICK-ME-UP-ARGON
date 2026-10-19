// src/art/itemModels.js
/**
 * Maps game inventory/equipment item objects to 3D model properties
 * according to the Pick Me Up art contract.
 */

const TIER_TO_GRADE = {
  1: 'E',
  2: 'D',
  3: 'C',
  4: 'B',
  5: 'A'
};

const VALID_GRADES = new Set(['E', 'D', 'C', 'B', 'A', 'S', 'S+']);

export function mapItemToModel(item) {
  if (!item) return null;

  // Grade normalization
  let grade = 'E';
  if (item.grade && VALID_GRADES.has(String(item.grade).toUpperCase())) {
    grade = String(item.grade).toUpperCase();
  } else if (item.tier && TIER_TO_GRADE[item.tier]) {
    grade = TIER_TO_GRADE[item.tier];
  }

  // Enhance & Wear normalization
  const enhance = Number.isFinite(item.enhance) ? Math.max(0, Math.min(5, item.enhance)) : 0;
  let wear = 0;
  if (Number.isFinite(item.maxDurability) && item.maxDurability > 0 && Number.isFinite(item.durability)) {
    wear = Math.max(0, Math.min(1, 1 - (item.durability / item.maxDurability)));
  }

  // Determine category & slot
  const slot = item.slot || (item.weaponType === 'shield' ? 'offhand' : (item.armorType ? 'armor' : 'weapon'));
  const name = (item.name || item.templateId || item.id || '').toLowerCase();
  const rawType = (item.weaponType || item.type || '').toLowerCase();

  // 1. Armor category
  if (slot === 'armor' || name.includes('armor') || item.defense && !item.damageMult && !item.blockMult) {
    return {
      category: 'armor',
      kind: null,
      grade,
      enhance,
      wear
    };
  }

  // 2. Shield category
  const isShield = slot === 'offhand' || rawType === 'shield' || name.includes('shield');
  if (isShield) {
    let kind = 'woodenRound';
    if (name.includes('wooden')) {
      kind = 'woodenRound';
    } else if (name.includes('goblin') || name.includes('plank')) {
      kind = 'plank';
    } else if (name.includes('novice') || name.includes('iron')) {
      kind = 'ironRound';
    } else {
      if (grade === 'E' || grade === 'D') {
        kind = 'woodenRound';
      } else if (grade === 'C') {
        kind = 'ironRound';
      } else {
        // 'B', 'A', 'S', 'S+'
        kind = 'kite';
      }
    }

    return {
      category: 'shield',
      kind,
      grade,
      enhance,
      wear
    };
  }

  // 3. Weapon category
  let kind = 'sword';
  if (rawType === 'greatsword' || name.includes('greatsword')) {
    kind = 'greatsword';
  } else if (rawType === 'spear' || name.includes('spear')) {
    kind = 'spear';
  } else if (rawType === 'dagger' || name.includes('dagger')) {
    kind = 'dagger';
  } else if (rawType === 'bow' || name.includes('bow')) {
    kind = 'bow';
  } else if (rawType === 'staff' || name.includes('staff')) {
    kind = 'staff';
  } else if (rawType === 'mace' || name.includes('mace') || name.includes('morning_star') || name.includes('morning star')) {
    kind = 'mace';
  } else if (rawType === 'club' || name.includes('club')) {
    kind = 'club';
  } else if (rawType === 'pickaxe' || name.includes('pickaxe')) {
    kind = 'pickaxe';
  } else {
    // Default to sword
    kind = 'sword';
  }

  return {
    category: 'weapon',
    kind,
    grade,
    enhance,
    wear
  };
}
