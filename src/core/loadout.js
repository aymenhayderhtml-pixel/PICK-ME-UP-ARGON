// src/core/loadout.js
/**
 * Single source of truth for a hero's combat loadout.
 *
 * Everything that needs to know "what is this hero holding and how does it
 * fight" (3D model, Equipment screen, HUD, combat input, save migration) must
 * call getHeroLoadout(hero). Nothing else is allowed to guess a weapon type
 * or fall back to a default sword and shield.
 */

import { mapItemToModel } from '../art/itemModels.js';
import { createItemInstance } from '../data/items.js';

export const ATTACK_MODES = Object.freeze({ SPELL: 'spell', BOW: 'bow', MELEE: 'melee' });
export const HUD_MODES = Object.freeze({ MAGE: 'mage', ARCHER: 'archer', MELEE: 'melee' });
export const POSE_SETS = Object.freeze({ STAFF: 'staff', BOW: 'bow', MELEE: 'melee', UNARMED: 'unarmed' });

const TWO_HANDED = Object.freeze(['staff', 'bow', 'greatsword', 'spear']);

/**
 * Class profiles.
 * - `specialised` classes define their own weapon kit and override the
 *   named-hero archetype table (a Mage Han may only wield a staff).
 * - `defaultWeapon` / `defaultOffhand` are the item templates handed to a
 *   hero of this class when no valid weapon is equipped.
 */
export const CLASS_PROFILES = Object.freeze({
  mage: {
    key: 'mage', label: 'Mage', specialised: true,
    allowedWeapons: ['staff'],
    defaultWeaponType: 'staff', defaultWeapon: 'mage_staff',
    defaultOffhandType: 'none', defaultOffhand: null,
  },
  healer: {
    key: 'healer', label: 'Healer', specialised: true,
    allowedWeapons: ['staff', 'mace'],
    defaultWeaponType: 'staff', defaultWeapon: 'mage_staff',
    defaultOffhandType: 'none', defaultOffhand: null,
  },
  archer: {
    key: 'archer', label: 'Archer', specialised: true,
    allowedWeapons: ['bow', 'dagger'],
    defaultWeaponType: 'bow', defaultWeapon: 'hunting_bow',
    defaultOffhandType: 'none', defaultOffhand: null,
  },
  knight: {
    key: 'knight', label: 'Knight', specialised: true,
    allowedWeapons: ['sword', 'shield', 'mace'],
    defaultWeaponType: 'sword', defaultWeapon: 'rusty_sword',
    defaultOffhandType: 'shield', defaultOffhand: 'wooden_shield',
  },
  vanguard: {
    key: 'vanguard', label: 'Vanguard', specialised: false,
    allowedWeapons: ['sword', 'spear', 'mace'],
    defaultWeaponType: 'sword', defaultWeapon: 'rusty_sword',
    defaultOffhandType: 'shield', defaultOffhand: 'wooden_shield',
  },
  tank: {
    key: 'tank', label: 'Vanguard Tank', specialised: false,
    allowedWeapons: ['sword', 'spear', 'mace'],
    defaultWeaponType: 'spear', defaultWeapon: 'iron_spear',
    defaultOffhandType: 'none', defaultOffhand: null,
  },
  berserker: {
    key: 'berserker', label: 'Berserker', specialised: false,
    allowedWeapons: ['greatsword', 'sword', 'mace'],
    defaultWeaponType: 'greatsword', defaultWeapon: 'greatsword',
    defaultOffhandType: 'none', defaultOffhand: null,
  },
  valkyrie: {
    key: 'valkyrie', label: 'Valkyrie', specialised: false,
    allowedWeapons: ['sword', 'shield', 'mace'],
    defaultWeaponType: 'sword', defaultWeapon: 'rusty_sword',
    defaultOffhandType: 'shield', defaultOffhand: 'wooden_shield',
  },
  artisan: {
    key: 'artisan', label: 'Artisan', specialised: false,
    allowedWeapons: ['hammer', 'mace', 'sword', 'dagger'],
    defaultWeaponType: 'mace', defaultWeapon: 'morning_star',
    defaultOffhandType: 'none', defaultOffhand: null,
  },
});

/**
 * Named hero archetypes keep their designed weapon kit unless their class was
 * explicitly specialised (Mage / Archer / Knight).
 */
const ARCHETYPE_WEAPONS = Object.freeze({
  hero_han: ['sword', 'mace'],
  hero_jenna: ['bow', 'dagger'],
  hero_aaron: ['spear'],
  hero_velkist: ['greatsword', 'sword'],
  hero_eolka: ['staff'],
  hero_sirris: ['sword', 'shield', 'mace'],
  hero_catio: ['hammer', 'mace', 'sword', 'dagger'],
});

/**
 * Normalises a free-text hero class into a class profile key.
 */
export function getHeroClassKey(hero) {
  const c = String((hero && hero.class) || '').toLowerCase();
  if (!c) return null;
  if (c.includes('mage') || c.includes('wizard')) return 'mage';
  if (c.includes('cleric') || c.includes('healer') || c.includes('priest')) return 'healer';
  if (c.includes('archer') || c.includes('scout') || c.includes('ranger')) return 'archer';
  if (c.includes('knight')) return 'knight';
  // A mercenary fights with sword and shield: the knight profile is the one
  // that may hold a shield.
  if (c.includes('mercen')) return 'knight';
  if (c.includes('valkyrie')) return 'valkyrie';
  if (c.includes('berserk')) return 'berserker';
  if (c.includes('artisan') || c.includes('smith')) return 'artisan';
  if (c.includes('tank')) return 'tank';
  if (c.includes('vanguard')) return 'vanguard';
  // A commoner is a plain melee fighter.
  if (c.includes('commoner')) return 'vanguard';
  return null;
}

/**
 * Returns the class profile for a hero, or null when the class is generic.
 */
export function getHeroClassProfile(hero) {
  const key = getHeroClassKey(hero);
  return key ? CLASS_PROFILES[key] : null;
}

function weaponsFromHeroString(weaponStr) {
  const w = String(weaponStr || '').toLowerCase();
  if (w.includes('spear')) return ['spear'];
  if (w.includes('bow')) return ['bow', 'dagger'];
  if (w.includes('dagger')) return ['dagger', 'bow'];
  if (w.includes('greatsword')) return ['greatsword'];
  if (w.includes('staff') || w.includes('wand') || w.includes('scepter')) return ['staff'];
  if (w.includes('mace') || w.includes('hammer')) return ['mace', 'hammer'];
  return ['sword', 'mace'];
}

/**
 * The weapon types a hero is allowed to equip.
 * Specialised classes win, then named hero archetypes, then the class
 * profile, and finally the hero's weapon display string.
 */
export function getAllowedWeaponTypes(hero) {
  if (!hero) return ['sword', 'mace'];
  const profile = getHeroClassProfile(hero);
  if (profile && profile.specialised) return [...profile.allowedWeapons];
  const archetype = ARCHETYPE_WEAPONS[hero.id || ''];
  if (archetype) return [...archetype];
  if (profile) return [...profile.allowedWeapons];
  return weaponsFromHeroString(hero.weapon);
}

function isUsable(item) {
  if (!item) return false;
  if (item.durability === undefined || item.durability === null) return true;
  return item.durability > 0;
}

/**
 * Resolves a hero's combat loadout from their CLASS and their EQUIPPED ITEMS.
 *
 * @param {object} hero
 * @returns {object} loadout descriptor
 */
export function getHeroLoadout(hero) {
  const equipment = (hero && hero.equipment) || {};
  const weaponItem = equipment.weapon || null;
  const offhandItem = equipment.offhand || null;
  const armorItem = equipment.armor || null;

  const weaponMapped = mapItemToModel(weaponItem);
  const offhandMapped = mapItemToModel(offhandItem);

  const weaponOk = Boolean(
    weaponMapped && weaponMapped.category === 'weapon' && weaponMapped.kind && isUsable(weaponItem)
  );
  const offhandOk = Boolean(
    offhandMapped && offhandMapped.category === 'shield' && offhandMapped.kind && isUsable(offhandItem)
  );

  const weaponType = weaponOk ? weaponMapped.kind : 'none';
  const offhandType = offhandOk ? 'shield' : 'none';

  let poseSet = POSE_SETS.MELEE;
  let attackMode = ATTACK_MODES.MELEE;
  let hudMode = HUD_MODES.MELEE;

  if (weaponType === 'staff') {
    poseSet = POSE_SETS.STAFF;
    attackMode = ATTACK_MODES.SPELL;
    hudMode = HUD_MODES.MAGE;
  } else if (weaponType === 'bow') {
    poseSet = POSE_SETS.BOW;
    attackMode = ATTACK_MODES.BOW;
    hudMode = HUD_MODES.ARCHER;
  } else if (weaponType === 'none') {
    poseSet = POSE_SETS.UNARMED;
  }

  const profile = getHeroClassProfile(hero);

  return {
    heroId: (hero && hero.id) || null,
    heroName: (hero && hero.name) || '',
    heroClass: (hero && hero.class) || '',
    classKey: profile ? profile.key : null,
    profile,
    allowedWeapons: getAllowedWeaponTypes(hero),

    weapon: weaponItem,
    offhand: offhandItem,
    armor: armorItem,

    weaponType,
    offhandType,
    weaponKind: weaponOk ? weaponMapped.kind : null,
    offhandKind: offhandOk ? offhandMapped.kind : null,
    grade: weaponOk ? weaponMapped.grade : null,
    enhance: weaponOk ? weaponMapped.enhance : 0,
    wear: weaponOk ? weaponMapped.wear : 0,

    poseSet,
    attackMode,
    hudMode,

    isSpellcaster: attackMode === ATTACK_MODES.SPELL,
    isArcher: attackMode === ATTACK_MODES.BOW,
    isMelee: attackMode === ATTACK_MODES.MELEE,
    isTwoHanded: TWO_HANDED.includes(weaponType),
    canBlock: offhandType === 'shield' && !TWO_HANDED.includes(weaponType),
    isEmptyHanded: weaponType === 'none',
  };
}

function pushToInventory(inventory, item) {
  if (!inventory || !item) return;
  if (inventory.some((i) => i.id === item.id)) return;
  inventory.push(item);
}

/**
 * One-time save migration: repairs heroes whose equipped weapon does not match
 * their class, and removes a shield that is held together with a two-handed
 * weapon. Returns true when the hero was modified.
 */
export function reconcileHeroLoadout(hero, inventory) {
  if (!hero) return false;
  hero.equipment = hero.equipment || { weapon: null, offhand: null, armor: null };

  const profile = getHeroClassProfile(hero);
  if (!profile) return false;

  let changed = false;
  const loadout = getHeroLoadout(hero);
  const allowed = loadout.allowedWeapons;

  // 1. The main hand must be a weapon this class may wield.
  const hasValidWeapon = loadout.weaponType !== 'none' && allowed.includes(loadout.weaponType);
  const needsStarterWeapon = loadout.weaponType === 'none' && profile.specialised;
  if ((!hasValidWeapon && loadout.weaponType !== 'none') || needsStarterWeapon) {
    if (profile.defaultWeapon) {
      const oldWeapon = hero.equipment.weapon;
      hero.equipment.weapon = createItemInstance(profile.defaultWeapon, { source: 'migration' });
      if (oldWeapon) pushToInventory(inventory, oldWeapon);
      hero.weapon = profile.defaultWeaponType;
      changed = true;
    }
  }

  // 2. A shield cannot stay in the offhand while a two-handed weapon is equipped.
  const currentType = getHeroLoadout(hero).weaponType;
  if (TWO_HANDED.includes(currentType)) {
    const offhand = hero.equipment.offhand;
    const offhandMapped = mapItemToModel(offhand);
    if (offhand && offhandMapped && offhandMapped.category === 'shield') {
      hero.equipment.offhand = null;
      pushToInventory(inventory, offhand);
      changed = true;
    }
  }

  return changed;
}
