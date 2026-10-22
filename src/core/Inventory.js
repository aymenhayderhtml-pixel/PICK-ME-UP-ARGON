import { getSkill } from '../data/skills.js';
import { getAllowedWeaponTypes as resolveAllowedWeaponTypes, getHeroLoadout } from './loadout.js';
import { emitEquipmentChanged } from './equipmentEvents.js';

export const MAX_INVENTORY_CAPACITY = 40;

export const ENHANCE_RATES = {
  1: 0.90,
  2: 0.80,
  3: 0.65,
  4: 0.50,
  5: 0.35,
};

export function canHeroEquipItem(hero, item) {
  if (!hero || !item) {
    return { canEquip: false, reason: 'Invalid hero or item' };
  }
  if (item.exclusiveHeroId && item.exclusiveHeroId !== hero.id) {
    return { canEquip: false, reason: 'Exclusive to another hero' };
  }

  // 1. Armor can be worn by any hero
  if (item.slot === 'armor') {
    return { canEquip: true };
  }

  // 2. Offhand items (e.g. Shields)
  if (item.slot === 'offhand') {
    if (item.weaponType === 'shield') {
      const loadout = getHeroLoadout(hero);
      // Two-handed weapons prevent shields
      if (loadout.weaponType === 'greatsword' || loadout.weaponType === 'bow' || loadout.weaponType === 'staff') {
        return { canEquip: false, reason: 'Cannot equip shield with two-handed weapon' };
      }
      return { canEquip: true };
    }
    // Secondary daggers or weapons in offhand
    const allowed = getAllowedWeaponTypes(hero);
    if (allowed.includes(item.weaponType)) {
      return { canEquip: true };
    }
    return { canEquip: false, reason: 'Wrong weapon type' };
  }

  // 3. Main-hand Weapons
  if (item.slot === 'weapon') {
    const allowed = getAllowedWeaponTypes(hero);
    if (allowed.includes(item.weaponType)) {
      return { canEquip: true };
    }
    return { canEquip: false, reason: 'Wrong weapon type' };
  }

  return { canEquip: false, reason: 'Incompatible slot' };
}

/**
 * The weapon types a hero may equip. Delegates to the loadout source of truth
 * so the class always wins over a hardcoded per-hero default.
 */
export function getAllowedWeaponTypes(hero) {
  return resolveAllowedWeaponTypes(hero);
}

const GRADE_ORDER = { 'S+': 700, S: 600, A: 500, B: 400, C: 300, D: 200, E: 100 };

export function getItemScore(item) {
  if (!item) return -1;
  const gradeBase = GRADE_ORDER[item.grade] || 100;
  const enhanceBonus = (item.enhance || 0) * 50;
  const statVal = (item.damageMult || 0) * 100 + (item.defense || 0) * 10 + (item.blockMult || 0) * 50;
  return gradeBase + enhanceBonus + statVal;
}

export function autoEquipHero(hero, inventory) {
  if (!hero || !inventory) return 0;
  hero.equipment = hero.equipment || { weapon: null, offhand: null, armor: null };
  let count = 0;

  // 1. Best Weapon
  let bestW = null;
  let bestWScore = hero.equipment.weapon ? getItemScore(hero.equipment.weapon) : -1;
  if (hero.equipment.weapon && hero.equipment.weapon.exclusiveHeroId === hero.id) {
    bestWScore = Infinity;
  }
  for (const item of inventory) {
    if (item.slot === 'weapon' && canHeroEquipItem(hero, item).canEquip && (!item.exclusiveHeroId || item.exclusiveHeroId === hero.id)) {
      const s = getItemScore(item);
      if (s > bestWScore) {
        bestWScore = s;
        bestW = item;
      }
    }
  }
  if (bestW) {
    equipItem(hero, bestW, inventory);
    count++;
  }

  // 2. Best Armor
  let bestA = null;
  let bestAScore = hero.equipment.armor ? getItemScore(hero.equipment.armor) : -1;
  if (hero.equipment.armor && hero.equipment.armor.exclusiveHeroId === hero.id) {
    bestAScore = Infinity;
  }
  for (const item of inventory) {
    if (item.slot === 'armor' && canHeroEquipItem(hero, item).canEquip && (!item.exclusiveHeroId || item.exclusiveHeroId === hero.id)) {
      const s = getItemScore(item);
      if (s > bestAScore) {
        bestAScore = s;
        bestA = item;
      }
    }
  }
  if (bestA) {
    equipItem(hero, bestA, inventory);
    count++;
  }

  // 3. Best Offhand
  let bestO = null;
  let bestOScore = hero.equipment.offhand ? getItemScore(hero.equipment.offhand) : -1;
  if (hero.equipment.offhand && hero.equipment.offhand.exclusiveHeroId === hero.id) {
    bestOScore = Infinity;
  }
  for (const item of inventory) {
    if (item.slot === 'offhand' && canHeroEquipItem(hero, item).canEquip && (!item.exclusiveHeroId || item.exclusiveHeroId === hero.id)) {
      const s = getItemScore(item);
      if (s > bestOScore) {
        bestOScore = s;
        bestO = item;
      }
    }
  }
  if (bestO) {
    equipItem(hero, bestO, inventory);
    count++;
  }

  return count;
}

export function autoEquipRoster(heroes, inventory) {
  if (!heroes || !inventory) return 0;
  let totalEquipped = 0;

  // Sort heroes: highest star and level first
  const sortedHeroes = [...heroes].filter((h) => h.alive).sort((a, b) => (b.star * 100 + b.level) - (a.star * 100 + a.level));

  for (const hero of sortedHeroes) {
    totalEquipped += autoEquipHero(hero, inventory);
  }

  return totalEquipped;
}

export function autoEquipParty(party, inventory, allHeroes = []) {
  if (!party || !inventory) return 0;
  let equippedCount = 0;

  for (const p of party) {
    const heroId = typeof p === 'string' ? p : p.id;
    const hero = allHeroes.find((h) => h.id === heroId) || (typeof p === 'object' && p.equipment ? p : null);
    if (!hero) continue;
    equippedCount += autoEquipHero(hero, inventory);
  }

  return equippedCount;
}

export function equipItem(hero, item, inventory) {
  const check = canHeroEquipItem(hero, item);
  if (!check.canEquip) {
    return { success: false, reason: check.reason };
  }

  hero.equipment = hero.equipment || { weapon: null, offhand: null, armor: null };
  const slot = item.slot;

  // Find index in inventory and remove
  const itemIdx = inventory.findIndex((i) => i.id === item.id);
  if (itemIdx !== -1) {
    inventory.splice(itemIdx, 1);
  }

  // If old item exists, put back into inventory
  const oldItem = hero.equipment[slot];
  if (oldItem) {
    inventory.push(oldItem);
  }

  hero.equipment[slot] = item;
  emitEquipmentChanged(hero, slot);
  return { success: true, oldItem, equipped: item };
}

export function unequipItem(hero, slot, inventory) {
  hero.equipment = hero.equipment || { weapon: null, offhand: null, armor: null };
  const item = hero.equipment[slot];
  if (!item) {
    return { success: false, reason: 'No item equipped in that slot' };
  }

  if (inventory.length >= MAX_INVENTORY_CAPACITY) {
    return { success: false, reason: `Inventory full (${MAX_INVENTORY_CAPACITY} max)` };
  }

  hero.equipment[slot] = null;
  inventory.push(item);
  emitEquipmentChanged(hero, slot);
  return { success: true, item };
}

export function getBestSmith(heroes) {
  let best = null;
  let maxLv = 0;

  for (const h of heroes || []) {
    if (!h.alive) continue;
    for (const sk of h.skills || []) {
      const sId = (sk.id || sk.name || '').toLowerCase().replace(/\s+/g, '_');
      if (sId === 'smithing') {
        const lv = sk.level || 1;
        if (lv > maxLv) {
          maxLv = lv;
          best = h;
        }
      }
    }
  }

  if (!best) return null;

  return {
    hero: best,
    level: maxLv,
    forgeQuality: maxLv * 0.05,
    repairDiscount: Math.min(0.60, maxLv * 0.03),
  };
}

export function calculateRepairCost(item, bestSmith) {
  if (!item || item.durability >= item.maxDurability) return 0;
  const missing = item.maxDurability - item.durability;
  if (!bestSmith) {
    // Basic repair without smith is double cost (4 gold per point)
    return Math.max(1, Math.round(missing * 4));
  }
  // Formula: missing * 2 * (1 - repairDiscount)
  const discount = bestSmith.repairDiscount || 0;
  return Math.max(1, Math.round(missing * 2 * (1 - discount)));
}

export function getEnhanceCost(item) {
  const current = item.enhance || 0;
  if (current >= 5) return null;
  const next = current + 1;
  return {
    targetEnhance: next,
    goldCost: next * 40,
    ironIngots: next,
    successRate: ENHANCE_RATES[next] || 0.35,
  };
}
