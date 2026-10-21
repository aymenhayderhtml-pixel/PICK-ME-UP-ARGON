// scripts/test_loadout.mjs
// Automated headless verification that a hero's 3D model, animations, controls
// and HUD follow that hero's CLASS and EQUIPPED WEAPON.
// Runs purely in Node with zero headless browser overhead.

import * as THREE from 'three';

// A minimal localStorage so GameState can save/load inside Node.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const { gameState } = await import('../src/core/GameState.js');
const { getHeroLoadout, getAllowedWeaponTypes, reconcileHeroLoadout } = await import('../src/core/loadout.js');
const { equipItem, unequipItem, canHeroEquipItem, autoEquipHero } = await import('../src/core/Inventory.js');
const { createItemInstance } = await import('../src/data/items.js');
const { mapItemToModel } = await import('../src/art/itemModels.js');
const { HeroRig } = await import('../src/art/HeroRig.js');
const { Player } = await import('../src/player/Player.js');
const { PRESETS } = await import('../src/art/presets.js');

const capturedErrors = [];
const originalConsoleError = console.error;
console.error = (...args) => {
  capturedErrors.push(args.join(' '));
  originalConsoleError(...args);
};

const results = [];
function check(name, condition, extra = '') {
  if (condition) {
    console.log(`  [PASS] ${name}${extra ? ' - ' + extra : ''}`);
    results.push({ name, pass: true });
  } else {
    console.log(`  [FAIL] ${name}${extra ? ' - ' + extra : ''}`);
    results.push({ name, pass: false, extra });
  }
}

/** Collects the weapon / shield meshes actually attached to a rig. */
function collectGear(rig) {
  const weapons = [];
  const shields = [];
  rig.group.traverse((obj) => {
    if (typeof obj.name !== 'string') return;
    if (obj.name.startsWith('weapon_')) weapons.push(obj.name);
    else if (obj.name.startsWith('shield_')) shields.push(obj.name);
  });
  return { weapons, shields };
}

/** Which socket holds the equipped weapon group. */
function weaponSocket(rig) {
  const sockets = rig.model.sockets;
  const group = rig.weaponModel?.group;
  if (!group) return 'none';
  if (group.parent === sockets.staffHand) return 'staffHand';
  if (group.parent === sockets.handL) return 'handL';
  if (group.parent === sockets.handR) return 'handR';
  return 'other';
}

function makeHero(className, weaponTemplate, offhandTemplate = null) {
  return {
    id: 'hero_test_' + className.toLowerCase(),
    name: 'Test ' + className,
    class: className,
    star: 1,
    level: 1,
    alive: true,
    weapon: weaponTemplate || 'sword',
    stats: { str: 5, agi: 5, vit: 5, int: 5, wil: 5 },
    skills: [],
    equipment: {
      weapon: weaponTemplate ? createItemInstance(weaponTemplate, { source: 'test' }) : null,
      offhand: offhandTemplate ? createItemInstance(offhandTemplate, { source: 'test' }) : null,
      armor: null,
    },
  };
}

async function run() {
  console.log('========================================================');
  console.log('🎽 PICK ME UP: HERO LOADOUT VERIFICATION SUITE');
  console.log('========================================================\n');

  console.log('--- 1. GETHERLOADOUT PER CLASS ---');
  const cases = [
    { cls: 'Mage', weapon: 'mage_staff', offhand: null, want: 'staff', wantOff: 'none', pose: 'staff', mode: 'spell', hud: 'mage' },
    { cls: 'Archer', weapon: 'hunting_bow', offhand: null, want: 'bow', wantOff: 'none', pose: 'bow', mode: 'bow', hud: 'archer' },
    { cls: 'Knight', weapon: 'rusty_sword', offhand: 'wooden_shield', want: 'sword', wantOff: 'shield', pose: 'melee', mode: 'melee', hud: 'melee' },
  ];

  for (const c of cases) {
    const hero = makeHero(c.cls, c.weapon, c.offhand);
    const lo = getHeroLoadout(hero);
    check(`${c.cls}: weaponType`, lo.weaponType === c.want, `got "${lo.weaponType}" want "${c.want}"`);
    check(`${c.cls}: offhandType`, lo.offhandType === c.wantOff, `got "${lo.offhandType}" want "${c.wantOff}"`);
    check(`${c.cls}: poseSet`, lo.poseSet === c.pose, `got "${lo.poseSet}"`);
    check(`${c.cls}: attackMode`, lo.attackMode === c.mode, `got "${lo.attackMode}"`);
    check(`${c.cls}: hudMode`, lo.hudMode === c.hud, `got "${lo.hudMode}"`);
  }

  console.log('\n--- 2. 3D MODEL ATTACHMENT ---');
  for (const c of cases) {
    const hero = makeHero(c.cls, c.weapon, c.offhand);
    const rig = new HeroRig(PRESETS.han);
    rig.equip({ weapon: hero.equipment.weapon, offhand: hero.equipment.offhand, armor: null });

    const wantWeapon = `weapon_${c.want}_${hero.equipment.weapon.grade}`;
    const wantShield = c.wantOff === 'shield'
      ? `shield_${mapItemToModel(hero.equipment.offhand).kind}_${hero.equipment.offhand.grade}`
      : null;

    const gear = collectGear(rig);
    check(`${c.cls}: exactly one weapon mesh`, gear.weapons.length === 1, gear.weapons.join(',') || 'none');
    check(`${c.cls}: weapon mesh is ${c.want}`, gear.weapons[0] === wantWeapon, gear.weapons[0] || 'none');
    if (c.want !== 'sword') {
      check(`${c.cls}: no stray sword`, !gear.weapons.some((n) => n.includes('sword')));
    }
    check(`${c.cls}: shield meshes`, gear.shields.length === (wantShield ? 1 : 0), gear.shields.join(',') || 'none');
    if (wantShield) {
      check(`${c.cls}: shield mesh is the equipped one`, gear.shields[0] === wantShield, gear.shields[0] || 'none');
    }
    if (c.want === 'staff') {
      check('Mage: staff attached to staffHand socket', weaponSocket(rig) === 'staffHand', weaponSocket(rig));
    } else if (c.want === 'bow') {
      check('Archer: bow attached to handL socket', weaponSocket(rig) === 'handL', weaponSocket(rig));
    }
    rig.dispose();
  }

  console.log('\n--- 3. EMPTY HANDS (NO WEAPON / NO OFFHAND) ---');
  {
    const hero = makeHero('Mage', null, null);
    const rig = new HeroRig(PRESETS.han);
    rig.equip({ weapon: null, offhand: null, armor: null });
    const gear = collectGear(rig);
    check('Empty hands: no weapon mesh', gear.weapons.length === 0, gear.weapons.join(',') || 'none');
    check('Empty hands: no shield mesh', gear.shields.length === 0, gear.shields.join(',') || 'none');
    check('Empty hands: weaponKind is null', rig.weaponKind === null, String(rig.weaponKind));
    const lo = getHeroLoadout(hero);
    check('Empty hands: loadout weaponType none', lo.weaponType === 'none');
    check('Empty hands: loadout offhandType none', lo.offhandType === 'none');
    rig.dispose();
  }

  console.log('\n--- 4. EQUIPMENT CHANGE UPDATES THE MODEL ---');
  {
    const hero = makeHero('Knight', 'rusty_sword', 'wooden_shield');
    const rig = new HeroRig(PRESETS.han);
    rig.equip({ weapon: hero.equipment.weapon, offhand: hero.equipment.offhand, armor: null });
    let gear = collectGear(rig);
    check('Knight: starts with sword', gear.weapons[0] === `weapon_sword_${hero.equipment.weapon.grade}`, gear.weapons.join(','));
    check('Knight: starts with shield', gear.shields.length === 1, gear.shields.join(',') || 'none');

    // Swap to a staff: the sword and the shield must disappear.
    const staff = createItemInstance('mage_staff', { source: 'test' });
    hero.equipment.weapon = staff;
    hero.equipment.offhand = null;
    rig.equip({ weapon: hero.equipment.weapon, offhand: hero.equipment.offhand, armor: null });
    gear = collectGear(rig);
    check('After swap: staff mesh attached', gear.weapons[0] === 'weapon_staff_D', gear.weapons.join(','));
    check('After swap: no extra sword', gear.weapons.length === 1 && !gear.weapons.some((n) => n.includes('sword')));
    check('After swap: no shield', gear.shields.length === 0, gear.shields.join(',') || 'none');
    check('After swap: staff socket', weaponSocket(rig) === 'staffHand', weaponSocket(rig));

    // Unequip the weapon: empty hands, no sword comes back.
    hero.equipment.weapon = null;
    rig.equip({ weapon: null, offhand: null, armor: null });
    gear = collectGear(rig);
    check('After unequip: no weapon mesh', gear.weapons.length === 0, gear.weapons.join(',') || 'none');
    rig.dispose();
  }

  console.log('\n--- 5. CLASS RESTRICTS THE EQUIPMENT (THE ORIGINAL BUG) ---');
  {
    const mage = makeHero('Mage', 'mage_staff', null);
    const sword = createItemInstance('iron_sword', { source: 'test' });
    const shield = createItemInstance('iron_shield', { source: 'test' });

    check('Mage may equip the Mage Staff', canHeroEquipItem(mage, sword).canEquip === false, 'sword must be refused');
    check('Mage may not equip a sword', canHeroEquipItem(mage, sword).canEquip === false, canHeroEquipItem(mage, sword).reason);
    check('Mage allowed weapons are staff only', JSON.stringify(getAllowedWeaponTypes(mage)) === JSON.stringify(['staff']), getAllowedWeaponTypes(mage).join(','));

    // Auto equip must never hand a Mage a sword and a shield.
    const inventory = [sword, shield];
    autoEquipHero(mage, inventory);
    const lo = getHeroLoadout(mage);
    check('Auto equip keeps the Mage on a staff', lo.weaponType === 'staff', `weapon="${lo.weaponType}"`);
    check('Auto equip gives the Mage no shield', lo.offhandType === 'none', `offhand="${lo.offhandType}"`);
  }

  console.log('\n--- 6. SAVE MIGRATION ---');
  {
    const mage = makeHero('Mage', null, null);
    mage.equipment.weapon = createItemInstance('iron_sword', { source: 'test' });
    mage.equipment.offhand = createItemInstance('iron_shield', { source: 'test' });
    const inventory = [];

    const changed = reconcileHeroLoadout(mage, inventory);
    const lo = getHeroLoadout(mage);
    check('Migration: Mage with a sword is repaired', changed === true);
    check('Migration: Mage now holds the Mage Staff', lo.weaponType === 'staff', `weapon="${lo.weaponType}"`);
    check('Migration: the shield is removed', lo.offhandType === 'none', `offhand="${lo.offhandType}"`);
    check('Migration: the sword is kept in the inventory', inventory.some((i) => i.weaponType === 'sword'));
    check('Migration: the shield is kept in the inventory', inventory.some((i) => i.weaponType === 'shield'));

    const emptyMage = makeHero('Mage', null, null);
    reconcileHeroLoadout(emptyMage, []);
    check('Migration: a Mage with no weapon gets the Mage Staff', getHeroLoadout(emptyMage).weaponType === 'staff');
  }

  console.log('\n--- 7. LIVE GAME: CLASS SELECTION, SAVE/LOAD AND WORLD MODEL ---');
  {
    gameState.setPlayerClass('Mage');
    const han = gameState.heroes.find((h) => h.id === 'hero_han');
    check('Mage selection: Han holds the Mage Staff', han.equipment.weapon.weaponType === 'staff', han.equipment.weapon.name);
    check('Mage selection: Han has no shield', !han.equipment.offhand);
    check('Mage selection: 3 mana potions', gameState.manaPotions === 3, String(gameState.manaPotions));

    gameState.setPlayerClass('Archer');
    check('Archer selection: Han holds a bow', han.equipment.weapon.weaponType === 'bow', han.equipment.weapon.name);
    check('Archer selection: Han has no shield', !han.equipment.offhand);
    check('Archer selection: 20 arrows', gameState.arrows === 20, String(gameState.arrows));

    gameState.setPlayerClass('Vanguard');
    check('Sword class: Han holds a sword', han.equipment.weapon.weaponType === 'sword', han.equipment.weapon.name);
    check('Sword class: Han holds a shield', han.equipment.offhand?.weaponType === 'shield');

    // The world model follows the class immediately.
    const scene = new THREE.Scene();
    const player = new Player(scene);
    gameState.setPlayerClass('Mage');
    player.syncLoadout();
    let gear = collectGear(player.rig);
    check('World model: Mage shows the staff', gear.weapons[0] === 'weapon_staff_D', gear.weapons.join(',') || 'none');
    check('World model: Mage shows no shield', gear.shields.length === 0, gear.shields.join(',') || 'none');
    check('World model: Mage controls are spell based', player.loadout.attackMode === 'spell' && player.isStaffEquipped() === true);
    check('World model: Mage HUD mode', player.loadout.hudMode === 'mage');

    gameState.setPlayerClass('Archer');
    player.syncLoadout();
    gear = collectGear(player.rig);
    check('World model: Archer shows the bow', gear.weapons[0] === 'weapon_bow_D', gear.weapons.join(',') || 'none');
    check('World model: Archer shows no shield', gear.shields.length === 0, gear.shields.join(',') || 'none');
    check('World model: Archer controls are bow based', player.loadout.attackMode === 'bow' && player.isBowEquipped() === true);
    check('World model: Archer HUD mode', player.loadout.hudMode === 'archer');

    // Save + reload must not destroy the chosen class.
    gameState.setPlayerClass('Mage');
    gameState.saveToLocalStorage();
    const reloaded = (await import('../src/core/GameState.js?reload=1')).gameState;
    const han2 = reloaded.heroes.find((h) => h.id === 'hero_han');
    check('Reload: the Mage class survives', han2.class === 'Mage', `class="${han2.class}"`);
    check('Reload: the Mage Staff survives', han2.equipment.weapon.weaponType === 'staff', han2.equipment.weapon?.name);
    check('Reload: the Mage still has no shield', !han2.equipment.offhand);
    check('Reload: the loadout is still spell based', getHeroLoadout(han2).attackMode === 'spell');

    // Changing the equipment through the real inventory path updates the model.
    gameState.setPlayerClass('Vanguard');
    player.syncLoadout();
    gear = collectGear(player.rig);
    check('World model: Vanguard shows the sword', gear.weapons[0] === 'weapon_sword_D', gear.weapons.join(',') || 'none');
    check('World model: Vanguard shows the shield', gear.shields.length === 1, gear.shields.join(',') || 'none');

    // A Vanguard may not swap in a staff: the class decides the kit.
    const staff = createItemInstance('mage_staff', { source: 'test' });
    const inventory = [];
    const refused = equipItem(han, staff, inventory);
    check('Inventory: a Vanguard cannot equip a staff', refused.success === false, refused.reason || '');
    check('Inventory: the model still shows the sword', collectGear(player.rig).weapons[0] === 'weapon_sword_D', collectGear(player.rig).weapons.join(','));

    // Swapping in a better sword rebuilds the model.
    const betterSword = createItemInstance('steel_sword', { source: 'test' });
    const swapRes = equipItem(han, betterSword, inventory);
    check('Inventory: equipping a better sword succeeds', swapRes.success === true, swapRes.reason || '');
    check('Inventory: the model shows the new sword', collectGear(player.rig).weapons[0] === `weapon_sword_${betterSword.grade}`, collectGear(player.rig).weapons.join(','));

    // A Mage swaps to the staff: the model and the controls follow.
    gameState.setPlayerClass('Mage');
    const mageRes = equipItem(han, staff, inventory);
    check('Inventory: a Mage can equip the Mage Staff', mageRes.success === true, mageRes.reason || '');
    check('Inventory: the model shows the staff', collectGear(player.rig).weapons[0] === 'weapon_staff_D', collectGear(player.rig).weapons.join(','));
    check('Inventory: the shield is hidden with a two-handed weapon', collectGear(player.rig).shields.length === 0, collectGear(player.rig).shields.join(',') || 'none');
    check('Inventory: the controls follow the staff', player.loadout.attackMode === 'spell', player.loadout.attackMode);

    const unequipRes = unequipItem(han, 'weapon', inventory);
    check('Inventory: unequipping succeeds', unequipRes.success === true);
    check('Inventory: the model shows empty hands', collectGear(player.rig).weapons.length === 0, collectGear(player.rig).weapons.join(',') || 'none');
    check('Inventory: the controls fall back to melee', player.loadout.attackMode === 'melee', player.loadout.attackMode);
  }

  console.log('\n--- 8. CONSOLE INTEGRITY ---');
  check('Zero Console Errors', capturedErrors.length === 0, `Errors: ${capturedErrors.length}`);

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log('\n========================================================');
  console.log(`📋 LOADOUT RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('========================================================\n');

  if (passed === total) {
    console.log('🎉 ALL LOADOUT TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME LOADOUT TESTS FAILED!');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unhandled Test Runner Exception:', err);
  process.exit(1);
});
