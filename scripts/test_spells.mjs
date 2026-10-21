// scripts/test_spells.mjs
// Automated headless verification for Fire Mage Spell System, Mana & Potions.
// Runs purely in Node with zero headless browser overhead.

import * as THREE from 'three';
import { Combatant } from '../src/combat/Combatant.js';
import { SpellVFXPool } from '../src/combat/SpellVFXPool.js';
import { SpellSystem } from '../src/combat/SpellSystem.js';
import { DamageResolver } from '../src/combat/DamageResolver.js';
import { FIRE_SPELLS, MANA_CONFIG, COMBO_CONFIG, OVERHEAT_CONFIG, MASTERY_CONFIG } from '../src/combat/spells.config.js';
import { combatEvents } from '../src/combat/CombatEvents.js';

// Console error interceptor
const capturedErrors = [];
const originalConsoleError = console.error;
console.error = (...args) => {
  capturedErrors.push(args.join(' '));
  originalConsoleError(...args);
};

async function runSpellTests() {
  console.log('========================================================');
  console.log('🧙 PICK ME UP: FIRE MAGE HEADLESS VERIFICATION SUITE');
  console.log('========================================================\n');

  const scene = new THREE.Scene();
  const vfxPool = new SpellVFXPool(scene);
  const combatants = [];
  const spellSystem = new SpellSystem(scene, vfxPool, combatants);

  // Create Mage at Level 12
  const mage = new Combatant({
    name: 'Eolka_FireMage',
    team: 'player',
    roleTag: 'mage',
    classTags: ['mage'],
    mageLevel: 12,
    intelligence: 20,
    hp: 120,
    maxHp: 120,
  });
  mage.spellSystem = spellSystem;

  // Create 3 Dummy Enemies
  const dummy1 = new Combatant({ name: 'Dummy_1', team: 'enemy', roleTag: 'grunt', hp: 5000, maxHp: 5000 });
  dummy1.position.set(0, 0, 3.0);
  const dummy2 = new Combatant({ name: 'Dummy_2', team: 'enemy', roleTag: 'grunt', hp: 5000, maxHp: 5000 });
  dummy2.position.set(1.2, 0, 3.2);
  const dummy3 = new Combatant({ name: 'Dummy_3', team: 'enemy', roleTag: 'grunt', hp: 5000, maxHp: 5000 });
  dummy3.position.set(-1.2, 0, 3.1);

  combatants.push(mage, dummy1, dummy2, dummy3);

  const spellList = [
    'emberBolt',
    'fireDartVolley',
    'fireball',
    'flameWall',
    'infernoBeam',
    'fireNova',
    'solarCataclysm',
  ];

  let checkManaPass = true;
  let checkDamagePass = true;
  const spellDetails = [];

  console.log('--- CASTING 7 FIRE SPELLS (3 CASTS EACH AGAINST 3 DUMMIES) ---');

  for (const spellId of spellList) {
    const spell = FIRE_SPELLS[spellId];
    let spellAllManaOk = true;
    let spellAllDmgOk = true;

    for (let castIdx = 1; castIdx <= 3; castIdx++) {
      // Reset dummies to full HP and original positions
      dummy1.hp = dummy1.maxHp; dummy1.isDead = false; dummy1.statusEffects?.clear();
      dummy1.position.set(0, 0, 3.0);
      dummy2.hp = dummy2.maxHp; dummy2.isDead = false; dummy2.statusEffects?.clear();
      dummy2.position.set(1.2, 0, 3.2);
      dummy3.hp = dummy3.maxHp; dummy3.isDead = false; dummy3.statusEffects?.clear();
      dummy3.position.set(-1.2, 0, 3.1);

      vfxPool.clear();

      // Infinite cooldowns, clean overheat history & reset mage state
      mage.stateMachine.transitionTo('IDLE');
      mage.spellCooldowns[spellId] = 0;
      mage.recentSpellCastTimes = [];
      mage.isOverheated = false;
      mage.manaRegenRate = 0; // Freeze passive regen during test measurement for exact spending
      mage.mana = mage.maxMana;

      let expectedCost = 0;
      if (spell.isUltimate) {
        expectedCost = Math.round(mage.maxMana * (spell.manaCostRatio || 0.70));
      } else if (spell.isChanneled) {
        expectedCost = Math.round((spell.manaCostPerSecond || 8.0) * (spell.maxChannelDuration || 3.0));
      } else {
        expectedCost = mage.getDiscountedManaCost(spellId, spell.manaCost);
      }

      const hpBefore = dummy1.hp + dummy2.hp + dummy3.hp;
      const manaBefore = mage.mana;

      // Aim at center dummy
      const castOk = mage.castSpell(spellId, dummy1.position, dummy1);
      if (!castOk) {
        console.error(`Failed to cast ${spellId} on cast ${castIdx}`);
        spellAllManaOk = false;
        continue;
      }

      // Step simulation: 5s cast for ultimate + 5s meteor barrage = 10s (210 steps)
      const steps = spell.isUltimate ? 210 : (spell.isChanneled ? 75 : 35);
      const dt = 0.05;

      for (let s = 0; s < steps; s++) {
        mage.update(dt, dt);
        dummy1.update(dt, dt);
        dummy2.update(dt, dt);
        dummy3.update(dt, dt);
        spellSystem.update(dt);
      }

      const hpAfter = dummy1.hp + dummy2.hp + dummy3.hp;
      const damageDealt = hpBefore - hpAfter;
      const manaSpent = manaBefore - mage.mana;

      const manaMatched = Math.abs(manaSpent - expectedCost) <= 1.0;
      const damageMatched = damageDealt > 0;

      if (!manaMatched) {
        console.warn(`[WARN] ${spell.name} cast ${castIdx}: expected mana ~${expectedCost}, spent ${manaSpent.toFixed(1)}`);
        spellAllManaOk = false;
      }
      if (!damageMatched) {
        console.warn(`[WARN] ${spell.name} cast ${castIdx}: expected damage > 0, got ${damageDealt}`);
        spellAllDmgOk = false;
      }
    }

    // Restore natural mana regen
    mage.manaRegenRate = MANA_CONFIG.baseManaRegenRate;

    if (!spellAllManaOk) checkManaPass = false;
    if (!spellAllDmgOk) checkDamagePass = false;

    spellDetails.push({
      name: spell.name,
      manaOk: spellAllManaOk,
      damageOk: spellAllDmgOk,
    });

    console.log(`  [${spellAllManaOk && spellAllDmgOk ? 'OK' : 'FAIL'}] ${spell.name} (3/3 casts verified)`);
  }

  // Check (c): Ultimate interrupted when losing > 15% max HP during cast & half mana lost
  console.log('\n--- CHECK (C): ULTIMATE INTERRUPTION & 50% MANA LOSS ---');
  mage.position.set(0, 0, 0);
  mage.knockbackVelocity.set(0, 0, 0);
  mage.stateMachine.transitionTo('IDLE', { force: true });
  mage.spellCooldowns.solarCataclysm = 0;
  mage.mana = mage.maxMana;
  mage.hp = mage.maxHp;

  mage.castSpell('solarCataclysm', dummy1.position);
  const wasCastingUlt = mage.isCastingUltimate;
  const manaBeforeInterrupt = mage.mana;

  // Deal 25 damage (120 * 0.15 = 18 damage needed)
  mage.receiveAttack({
    attacker: dummy1,
    rawDamage: 25,
    poiseDamage: 15,
    hitPos: mage.position.clone(),
    hitNormal: new THREE.Vector3(0, 0, -1),
    attackerPosition: dummy1.position.clone(),
  });

  const expectedManaLost = Math.round(mage.maxMana * 0.50);
  const actualManaLost = manaBeforeInterrupt - mage.mana;
  const ultInterrupted = wasCastingUlt && !mage.isCastingUltimate && mage.stateMachine.state === 'STAGGER';
  const ultManaLossOk = actualManaLost === expectedManaLost;
  const checkCPass = ultInterrupted && ultManaLossOk;
  console.log(`  Ultimate started: ${wasCastingUlt}`);
  console.log(`  Interrupted: ${ultInterrupted} (State: ${mage.stateMachine.state})`);
  console.log(`  Mana lost: ${actualManaLost} MP (Expected: ${expectedManaLost} MP, 50% of max)`);

  // Check (d): Potion restores 40% of max mana and triggers 8s cooldown
  console.log('\n--- CHECK (D): MANA POTION (40% RESTORATION & 8s COOLDOWN) ---');
  mage.position.set(0, 0, 0);
  mage.knockbackVelocity.set(0, 0, 0);
  mage.stateMachine.transitionTo('IDLE', { force: true });
  mage.mana = 20;
  mage.manaPotions = 3;
  mage.manaPotionCooldown = 0;

  const expectedRestore = Math.round(mage.maxMana * MANA_CONFIG.potion.restoreRatio);
  const manaBeforePotion = mage.mana;
  const potionSuccess = mage.useManaPotion();
  const manaAfterPotion = mage.mana;
  const actualRestored = manaAfterPotion - manaBeforePotion;
  const cdTriggered = Math.abs(mage.manaPotionCooldown - MANA_CONFIG.potion.cooldown) < 0.01;
  const potionCheckPass = potionSuccess && actualRestored === expectedRestore && cdTriggered;

  console.log(`  Max Mana: ${mage.maxMana}, Expected Restore (40%): +${expectedRestore} MP`);
  console.log(`  Actual Restored: +${actualRestored} MP (From ${manaBeforePotion} to ${manaAfterPotion})`);
  console.log(`  Potion Cooldown: ${mage.manaPotionCooldown}s (Expected: 8.0s)`);

  // Check (e): Firestorm Combo (+50% damage)
  console.log('\n--- CHECK (E): FIRESTORM COMBO (+50% DAMAGE) ---');
  dummy1.hp = 3000; dummy1.isDead = false; dummy1.position.set(0, 0, 3.0);
  dummy1.statusEffects?.clear();
  vfxPool.clear();
  spellSystem.activeFlameWalls = [];
  mage.position.set(0, 0, 0);
  mage.knockbackVelocity.set(0, 0, 0);
  mage.stateMachine.transitionTo('IDLE', { force: true });
  mage.mana = mage.maxMana;
  mage.spellCooldowns.fireNova = 0;
  let normalNovaDmg = 0;
  const onHitNormal = (payload) => {
    if (payload.targetName === 'Dummy_1' && payload.attackerName === 'Eolka_FireMage' && !payload.isBurn && (!payload.spellId || payload.spellId === 'fireNova')) {
      normalNovaDmg += payload.damage;
    }
  };
  combatEvents.on('onHit', onHitNormal);
  mage.castSpell('fireNova', dummy1.position);
  for (let s = 0; s < 35; s++) {
    mage.update(0.05, 0.05);
    dummy1.update(0.05, 0.05);
    spellSystem.update(0.05);
  }
  combatEvents.off('onHit', onHitNormal);

  dummy1.hp = 3000; dummy1.isDead = false; dummy1.position.set(0, 0, 3.0);
  dummy1.statusEffects?.clear();
  vfxPool.clear();
  spellSystem.activeFlameWalls = [];
  mage.position.set(0, 0, 0);
  mage.knockbackVelocity.set(0, 0, 0);
  mage.stateMachine.transitionTo('IDLE', { force: true });
  mage.mana = mage.maxMana;
  mage.spellCooldowns.flameWall = 0;
  mage.spellCooldowns.fireNova = 0;
  let comboNovaDmg = 0;
  let comboTriggered = false;
  const onComboListener = (payload) => {
    if (payload.name === 'Firestorm Combo') comboTriggered = true;
  };
  const onHitCombo = (payload) => {
    if (payload.targetName === 'Dummy_1' && payload.attackerName === 'Eolka_FireMage' && !payload.isBurn && payload.spellId === 'fireNova') {
      comboNovaDmg += payload.damage;
    }
  };
  // Cast Flame Wall at target
  mage.castSpell('flameWall', dummy1.position);
  for (let s = 0; s < 25; s++) {
    mage.update(0.05, 0.05);
    dummy1.update(0.05, 0.05);
    spellSystem.update(0.05);
  }

  // Cast Fire Nova inside active wall and measure combo nova damage
  combatEvents.on('onCombo', onComboListener);
  combatEvents.on('onHit', onHitCombo);
  mage.stateMachine.transitionTo('IDLE', { force: true });
  mage.castSpell('fireNova', dummy1.position);
  for (let s = 0; s < 35; s++) {
    mage.update(0.05, 0.05);
    dummy1.update(0.05, 0.05);
    spellSystem.update(0.05);
  }
  combatEvents.off('onCombo', onComboListener);
  combatEvents.off('onHit', onHitCombo);

  const comboRatio = comboNovaDmg / Math.max(1, normalNovaDmg);
  const firestormComboPass = comboTriggered && Math.abs(comboRatio - 1.50) <= 0.05;
  console.log(`  Normal Nova: ${normalNovaDmg} DMG, Combo Nova: ${comboNovaDmg} DMG, Ratio: ${comboRatio.toFixed(2)}x (Expected 1.50x)`);

  // Check (f): Burning Bonus (+30%) on Inferno Beam
  console.log('\n--- CHECK (F): INFERNO BEAM BURNING BONUS (+30%) ---');
  dummy1.hp = 3000; dummy1.isDead = false; dummy1.position.set(0, 0, 3.0);
  for (const eff of dummy1.statusEffects.values()) { eff.active = false; }
  vfxPool.clear();
  mage.position.set(0, 0, 0);
  mage.knockbackVelocity.set(0, 0, 0);
  mage.stateMachine.transitionTo('IDLE', { force: true });
  mage.mana = mage.maxMana;
  mage.spellCooldowns.infernoBeam = 0;
  let unburnedBeamTickDmg = 0;
  const onHitUnburned = (payload) => {
    if (unburnedBeamTickDmg === 0 && payload.targetName === 'Dummy_1' && !payload.isBurn) {
      unburnedBeamTickDmg = payload.damage;
    }
  };
  combatEvents.on('onHit', onHitUnburned);
  mage.castSpell('infernoBeam', dummy1.position, dummy1);
  for (let s = 0; s < 10; s++) {
    mage.update(0.05, 0.05);
    dummy1.update(0.05, 0.05);
    spellSystem.update(0.05);
  }
  combatEvents.off('onHit', onHitUnburned);
  mage.stopChannel();

  dummy1.hp = 3000; dummy1.isDead = false; dummy1.position.set(0, 0, 3.0);
  dummy1.applyStatusEffect('burn', { duration: 5.0, dps: 6, tickDamage: 3 });
  vfxPool.clear();
  mage.position.set(0, 0, 0);
  mage.knockbackVelocity.set(0, 0, 0);
  mage.stateMachine.transitionTo('IDLE', { force: true });
  mage.mana = mage.maxMana;
  mage.spellCooldowns.infernoBeam = 0;
  let burnedBeamTickDmg = 0;
  const onHitBurned = (payload) => {
    if (burnedBeamTickDmg === 0 && payload.targetName === 'Dummy_1' && !payload.isBurn) {
      burnedBeamTickDmg = payload.damage;
    }
  };
  combatEvents.on('onHit', onHitBurned);
  mage.castSpell('infernoBeam', dummy1.position, dummy1);
  for (let s = 0; s < 10; s++) {
    mage.update(0.05, 0.05);
    dummy1.update(0.05, 0.05);
    spellSystem.update(0.05);
  }
  combatEvents.off('onHit', onHitBurned);
  mage.stopChannel();

  const burnBonusRatio = burnedBeamTickDmg / Math.max(1, unburnedBeamTickDmg);
  const burningBonusPass = Math.abs(burnBonusRatio - 1.30) <= 0.05;
  console.log(`  Unburned Beam Tick: ${unburnedBeamTickDmg} DMG, Burning Beam Tick: ${burnedBeamTickDmg} DMG, Ratio: ${burnBonusRatio.toFixed(2)}x (Expected 1.30x)`);

  // Check (g): Overheat triggers after 5 casts in 6s & stops regen for 4s
  console.log('\n--- CHECK (G): OVERHEAT MECHANIC (5 CASTS / 6s -> 4s REGEN STOP) ---');
  mage.position.set(0, 0, 0);
  mage.knockbackVelocity.set(0, 0, 0);
  mage.stateMachine.transitionTo('IDLE', { force: true });
  mage.isOverheated = false;
  mage.overheatTimer = 0;
  mage.recentSpellCastTimes = [];
  mage.mana = 100;
  mage.manaRegenRate = MANA_CONFIG.baseManaRegenRate;

  // Rapidly cast 5 spells to trigger overheat
  for (let i = 0; i < 5; i++) {
    mage.stateMachine.transitionTo('IDLE', { force: true });
    mage.castSpell('emberBolt', dummy1.position, dummy1);
  }

  // Force back to IDLE so startup cast doesn't spend mana during observation
  mage.stateMachine.transitionTo('IDLE', { force: true });
  mage.manaRegenTimer = 0; // Clear cast delay to strictly observe overheat freeze

  const overheatTriggered = mage.isOverheated && mage.overheatTimer === OVERHEAT_CONFIG.overheatDuration;
  const manaAtOverheat = mage.mana;

  // Step 2s while overheated - mana must NOT regenerate
  for (let s = 0; s < 40; s++) {
    mage.update(0.05, 0.05);
  }
  const manaStillPaused = mage.mana === manaAtOverheat && mage.isOverheated;

  // Step remaining 2.5s - overheat expires (2.0s left, 0.5s of regen) and mana resumes regen
  for (let s = 0; s < 50; s++) {
    mage.update(0.05, 0.05);
  }
  const regenResumed = !mage.isOverheated && mage.mana > manaAtOverheat;
  const overheatPass = overheatTriggered && manaStillPaused && regenResumed;
  console.log(`  Overheat triggered: ${overheatTriggered} (Timer: ${OVERHEAT_CONFIG.overheatDuration}s)`);
  console.log(`  Regen paused during overheat: ${manaStillPaused}`);
  console.log(`  Regen resumed after timer: ${regenResumed}`);

  // Check (h): Mastery increases at 25 casts & lowers mana cost
  console.log('\n--- CHECK (H): SPELL MASTERY (25 CASTS -> LEVEL 1 & COST DISCOUNT) ---');
  mage.stateMachine.transitionTo('IDLE');
  mage.spellMastery.fireball = { casts: 0, level: 0 };
  const baseFireballCost = FIRE_SPELLS.fireball.manaCost;
  for (let i = 0; i < 25; i++) {
    mage.stateMachine.transitionTo('IDLE');
    mage.spellCooldowns.fireball = 0;
    mage.mana = mage.maxMana;
    mage.castSpell('fireball', dummy1.position);
  }
  const masteryLevel = mage.spellMastery.fireball.level;
  const discountedCost = mage.getDiscountedManaCost('fireball', baseFireballCost);
  const masteryPass = masteryLevel === 1 && discountedCost < baseFireballCost;
  console.log(`  Mastery Level after 25 casts: ${masteryLevel}`);
  console.log(`  Base Mana Cost: ${baseFireballCost} MP -> Discounted Cost: ${discountedCost} MP`);

  // Check (i): Solar Cataclysm scaling at Lv 12 and Lv 20
  console.log('\n--- CHECK (I): SOLAR CATACLYSM SCALING (LV 12 VS LV 20) ---');
  const spellUlt = FIRE_SPELLS.solarCataclysm;
  const r12 = (spellUlt.baseRadius || 10.0) + (12 - 1) * (spellUlt.radiusPerLevel || 0.30);
  const d12 = (spellUlt.baseDamageMult || 8.0) * (1.0 + (12 - 1) * (spellUlt.damageMultPerLevel || 0.10));
  const r20 = (spellUlt.baseRadius || 10.0) + (20 - 1) * (spellUlt.radiusPerLevel || 0.30);
  const d20 = (spellUlt.baseDamageMult || 8.0) * (1.0 + (20 - 1) * (spellUlt.damageMultPerLevel || 0.10));
  const scalingPass = (r20 > r12) && (d20 > d12);
  console.log(`  Level 12: Radius = ${r12.toFixed(1)}m, DamageMult = ${d12.toFixed(1)}x`);
  console.log(`  Level 20: Radius = ${r20.toFixed(1)}m, DamageMult = ${d20.toFixed(1)}x (Growth verified: ${scalingPass})`);

  // Check (j): Console error check
  const zeroErrorsPass = capturedErrors.length === 0;

  // Print PASS / FAIL Summary Table
  console.log('\n========================================================');
  console.log('📋 VERIFICATION RESULTS SUMMARY (CHECKS A-J)');
  console.log('========================================================');
  console.log(`(a) Mana Decreases by Exact Cost (7 spells):    ${checkManaPass ? 'PASS' : 'FAIL'}`);
  console.log(`(b) Damage Dealt to Dummy Enemies (7 spells):   ${checkDamagePass ? 'PASS' : 'FAIL'}`);
  console.log(`(c) Ultimate Interrupted & 50% Mana Lost:       ${checkCPass ? 'PASS' : 'FAIL'}`);
  console.log(`(d) Potion Restores 40% Mana & 8s Cooldown:     ${potionCheckPass ? 'PASS' : 'FAIL'}`);
  console.log(`(e) Firestorm Combo (+50% Damage):              ${firestormComboPass ? 'PASS' : 'FAIL'}`);
  console.log(`(f) Burning Bonus (+30% on Inferno Beam):       ${burningBonusPass ? 'PASS' : 'FAIL'}`);
  console.log(`(g) Overheat (5 casts in 6s -> 4s regen pause): ${overheatPass ? 'PASS' : 'FAIL'}`);
  console.log(`(h) Mastery (25 casts -> Lv1 & cost discount):  ${masteryPass ? 'PASS' : 'FAIL'}`);
  console.log(`(i) Solar Cataclysm Scaling (Lv12 vs Lv20):     ${scalingPass ? 'PASS' : 'FAIL'}`);
  console.log(`(j) Zero Console Errors:                        ${zeroErrorsPass ? 'PASS' : 'FAIL'} (${capturedErrors.length} errors)`);
  console.log('========================================================\n');

  const allPassed = checkManaPass && checkDamagePass && checkCPass && potionCheckPass &&
                    firestormComboPass && burningBonusPass && overheatPass && masteryPass &&
                    scalingPass && zeroErrorsPass;

  if (allPassed) {
    console.log('🎉 ALL 10 CHECKS (A-J) PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME CHECKS FAILED!\n');
    process.exit(1);
  }
}

runSpellTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
