// scripts/test_integration.mjs
// Automated headless verification for Mage & Archer main game integration.
// Runs purely in Node with zero headless browser overhead.

import * as THREE from 'three';
import { gameState } from '../src/core/GameState.js';
import { Player } from '../src/player/Player.js';
import { Enemy } from '../src/combat/Enemy.js';
import { Boss } from '../src/combat/Boss.js';
import { FIRE_SPELLS, MANA_CONFIG, OVERHEAT_CONFIG } from '../src/combat/spells.config.js';
import { SpellSystem } from '../src/combat/SpellSystem.js';
import { SpellVFXPool } from '../src/combat/SpellVFXPool.js';

const capturedErrors = [];
const originalConsoleError = console.error;
console.error = (...args) => {
  capturedErrors.push(args.join(' '));
  originalConsoleError(...args);
};

async function runIntegrationTests() {
  console.log('========================================================');
  console.log('🏹 PICK ME UP: MAGE & ARCHER INTEGRATION VERIFICATION');
  console.log('========================================================\n');

  const scene = new THREE.Scene();
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

  console.log('--- 1. MAGE CLASS INTEGRATION ---');
  gameState.setPlayerClass('Mage');
  check('Class Selection: Mage', gameState.playerClass === 'Mage');

  const mage = new Player(scene);
  check('Mage Staff Equipped', mage.isStaffEquipped() === true, `Weapon: ${gameState.equippedWeapon?.id || 'none'}`);
  check('Mage Starting Potions', gameState.manaPotions === 3, `Count: ${gameState.manaPotions}`);
  check('Mage Starting Mana Initialized', mage.mana === mage.maxMana && mage.maxMana > 100, `Mana: ${mage.mana}/${mage.maxMana}`);

  // Test mana spend
  const boltCost = FIRE_SPELLS.emberBolt.manaCost;
  const initialMana = mage.mana;
  const castOk = mage.spendMana(boltCost);
  check('Mage Mana Spent on Ember Bolt', castOk && mage.mana === initialMana - boltCost, `Remaining: ${mage.mana} MP`);

  // Test mana potion (drain mana first)
  mage.mana = 20;
  const potRestoredExpected = Math.round(mage.maxMana * MANA_CONFIG.potion.restoreRatio);
  const potOk = mage.useManaPotion();
  check(
    'Mage Mana Potion Restore (40%)',
    potOk && mage.mana === 20 + potRestoredExpected && gameState.manaPotions === 2,
    `Restored to: ${mage.mana} MP, Remaining potions: ${gameState.manaPotions}`
  );
  check('Mage Mana Potion Cooldown Active', mage.manaPotionCooldown > 0, `Cooldown: ${mage.manaPotionCooldown.toFixed(1)}s`);
  const potRejected = mage.useManaPotion();
  check('Mage Mana Potion Rejected on Cooldown', potRejected === false);

  // Test insufficient mana fizzle
  mage.mana = 1;
  const fizzleCast = mage.spendMana(50);
  check('Cast Blocked with Insufficient Mana', fizzleCast === false);

  // Test Overheat via rapid castSpell
  mage.mana = mage.maxMana;
  for (let i = 0; i < 5; i++) {
    mage.castSpell('emberBolt');
  }
  check('Overheat Triggered After 5 Casts', mage.isOverheated === true, `Timer: ${mage.overheatTimer.toFixed(1)}s`);

  // Test Ultimate HP Interruption
  mage.setMageLevel(12);
  mage.mana = mage.maxMana;
  mage.castSpell('solarCataclysm');
  const hpBefore = mage.hp;
  const manaBeforeInterrupt = mage.mana;
  const damageTaken = mage.maxHp * 0.20; // 20% > 15% threshold
  mage.receiveAttack({ rawDamage: damageTaken });
  const expectedManaAfterInterrupt = Math.max(0, manaBeforeInterrupt - Math.round(mage.maxMana * 0.50));
  check(
    'Ultimate Interrupted by >15% HP Loss & 50% Mana Lost',
    mage.isCastingUltimate === false && mage.isCasting === false && mage.mana === expectedManaAfterInterrupt,
    `Casting: ${mage.isCasting}, Mana after: ${mage.mana} (Expected: ${expectedManaAfterInterrupt})`
  );

  console.log('\n--- 2. ARCHER CLASS INTEGRATION ---');
  gameState.setPlayerClass('Archer');
  check('Class Selection: Archer', gameState.playerClass === 'Archer');

  const archer = new Player(scene);
  check('Archer Bow Equipped', archer.isBowEquipped() === true, `Weapon: ${gameState.equippedWeapon?.id || 'none'}`);
  check('Archer Starting Quiver (20 Arrows)', gameState.arrows === 20, `Arrows: ${gameState.arrows}`);

  // Test arrow decrement
  archer.fireSoftAutoAimArrow();
  check('Archer Arrow Decremented on Shot', gameState.arrows === 19, `Arrows: ${gameState.arrows}`);

  // Empty quiver test
  archer.arrows = 0;
  gameState.arrows = 0;
  const emptyShot = archer.fireSoftAutoAimArrow();
  check('Archer Empty Quiver Cannot Shoot', !emptyShot && archer.arrows === 0);

  console.log('\n--- 3. SPELL SYSTEM WITH LEGACY LIVE-GAME ENTITIES ---');
  {
    // The live game feeds the spell system the legacy Player / Enemy / Boss.
    // None of them own a state machine, so the spell system must tolerate it.
    gameState.setPlayerClass('Mage');
    mage.syncLoadout();
    check('Mage restored for the spell test', mage.loadout.attackMode === 'spell', mage.loadout.attackMode);

    const vfxPool = new SpellVFXPool(scene);
    const spellSystem = new SpellSystem(scene, vfxPool, []);
    mage.spellSystem = spellSystem;

    const requiredApi = ['update', 'releaseSpell', 'startChanneledSpell', 'tickChanneledSpell', 'stopChanneledSpell'];
    const missingApi = requiredApi.filter((m) => typeof spellSystem[m] !== 'function');
    check('SpellSystem exposes every API the live Player calls', missingApi.length === 0, missingApi.join(','));
    check('Legacy caster exposes facingYaw', typeof mage.facingYaw === 'number', String(mage.facingYaw));

    const legacyEnemy = new Enemy(0, 0, 'GRUNT');
    const legacyBoss = new Boss('Hobgoblin Boss', 500, 2.0, 25);
    spellSystem.combatants = [mage, legacyEnemy, legacyBoss];

    let updateThrew = null;
    try {
      spellSystem.update(0.016);
    } catch (e) {
      updateThrew = e;
    }
    check('SpellSystem.update tolerates legacy combatants (no stateMachine)', updateThrew === null, updateThrew ? updateThrew.message : '');

    // The ultimate must spawn its magic circle for the legacy caster too.
    mage.setMageLevel(12);
    mage.mana = mage.maxMana;
    mage.guardBreakTimer = 0; // cleared by Player.update() in the live game
    mage.isRolling = false;
    const ultimateCastOk = mage.castSpell('solarCataclysm');
    check('Legacy caster can start the ultimate', ultimateCastOk === true, `isCasting=${mage.isCasting}`);
    spellSystem.update(0.016);
    check('Legacy caster spawns the ultimate magic circle', mage.hasSpawnedMagicCircle === true, String(mage.hasSpawnedMagicCircle));

    // Channeled beam: the live player drives the mana and the tick interval.
    mage.isCasting = false;
    mage.isCastingUltimate = false;
    mage.currentSpell = null;
    mage.channeledSpell = FIRE_SPELLS.infernoBeam;
    let channelThrew = null;
    try {
      spellSystem.startChanneledSpell(mage, FIRE_SPELLS.infernoBeam, mage.castTargetPos);
      spellSystem.tickChanneledSpell(mage, FIRE_SPELLS.infernoBeam, mage.castTargetPos);
    } catch (e) {
      channelThrew = e;
    }
    check('Channeled beam ticks for the legacy caster', channelThrew === null, channelThrew ? channelThrew.message : '');
    spellSystem.stopChanneledSpell(mage);
    mage.channeledSpell = null;
  }

  console.log('\n--- 4. ENEMY & BOSS HIT PIPELINE & BURN DOT ---');
  const enemy = new Enemy(0, 0, 'GRUNT');
  const enemyStartHp = enemy.hp;
  enemy.receiveAttack({ rawDamage: 12, statusEffect: { type: 'burn', duration: 2, tickDamage: 4, tickInterval: 0.5 } });
  check('Enemy receiveAttack Raw Damage', enemy.hp === enemyStartHp - 12, `HP: ${enemy.hp}/${enemyStartHp}`);
  check('Enemy Burn Status Effect Active', enemy.statusEffects.get('burn')?.active === true);

  const mockPlayer = { mesh: { position: new THREE.Vector3(5, 0, 5) } };
  enemy.update(0.6, mockPlayer, null, [], null, null, null);
  check('Enemy Burn DoT Tick Applied', enemy.hp === enemyStartHp - 12 - 4, `HP after tick: ${enemy.hp}`);

  const boss = new Boss('Hobgoblin Boss', 500, 2.0, 25);
  boss.receiveAttack({ rawDamage: 30, statusEffect: { type: 'burn', duration: 2, tickDamage: 6, tickInterval: 0.5 } });
  check('Boss receiveAttack Raw Damage', boss.hp === 470, `Boss HP: ${boss.hp}/500`);
  check('Boss Burn Status Effect Active', boss.statusEffects.get('burn')?.active === true);
  boss.update(0.6);
  check('Boss Burn DoT Tick Applied', boss.hp === 464, `Boss HP after tick: ${boss.hp}`);

  console.log('\n--- 5. SYSTEM HEALTH & CONSOLE INTEGRITY ---');
  check('Zero Console Errors', capturedErrors.length === 0, `Errors: ${capturedErrors.length}`);

  console.log('\n========================================================');
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log(`📋 INTEGRATION RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('========================================================\n');

  if (passed === total) {
    console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME INTEGRATION TESTS FAILED!');
    process.exit(1);
  }
}

runIntegrationTests().catch((err) => {
  console.error('Unhandled Test Runner Exception:', err);
  process.exit(1);
});
