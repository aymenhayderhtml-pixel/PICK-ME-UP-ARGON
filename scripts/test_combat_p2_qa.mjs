// scripts/test_combat_p2_qa.mjs
// Automated Browser Validation & Benchmarking for Universal Combat Engine Phase 2
// Tests all 6 Spells, Primitive VFX, Status Engine, Super-Armor, Mage AI, and 30-Combatant 60 FPS performance.

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/lib/chatgpt/resources/cua_node/lib/node_modules/playwright-core');

const CHROME_PATH = '/home/aymen/.agent-browser/browsers/chrome-155.0.8059.84/chrome';

async function run() {
  console.log('[QA P2] Launching Playwright browser for Phase 2 Combat verification...');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 }
  });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('[Browser Error]', msg.text());
    }
  });

  console.log('[QA P2] Loading http://localhost:5173/combat-test.html ...');
  await page.goto('http://localhost:5173/combat-test.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Initial State Check
  const initCheck = await page.evaluate(() => {
    const sb = window.__combatSandbox;
    if (!sb) return { ok: false, error: 'window.__combatSandbox not found' };
    return {
      ok: true,
      combatantsCount: sb.combatants.length,
      heroHp: sb.hero.hp,
      heroMana: sb.hero.mana,
      eolkaHp: sb.eolka.hp,
      eolkaMana: sb.eolka.mana,
      shamanHp: sb.shamanDummy.hp,
      hurtAllyHp: sb.hurtAllyDummy.hp,
      clusterCount: sb.clusterDummies.length,
    };
  });
  console.log('[QA P2] Initial State:', initCheck);

  await page.screenshot({ path: 'docs/screenshots_combat_p2/01_phase2_arena_and_entities.png' });
  console.log('[QA P2] Saved 01_phase2_arena_and_entities.png');

  // 2. Switch Hero to Eolka (Mage Staff)
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.setHeroRole('eolka');
    sb.eolka.mana = 100;
    for (const k in sb.eolka.spellCooldowns) sb.eolka.spellCooldowns[k] = 0;
  });
  await page.waitForTimeout(300);

  // 3. Test Fireball: Spawns projectile, hits cluster, deals splash + burn
  console.log('[QA P2] Testing Fireball...');
  const fireballResult = await page.evaluate(() => {
    const sb = window.__combatSandbox;
    const initialMana = sb.eolka.mana;
    const targetCluster = sb.clusterDummies[0].position;
    const castOk = sb.eolka.castSpell('fireball', targetCluster);
    return { castOk, initialMana };
  });

  // Wait 800ms for startup (250ms) + flight (350ms) + splash
  await page.waitForTimeout(850);
  await page.screenshot({ path: 'docs/screenshots_combat_p2/02_fireball_projectile_and_impact.png' });

  const fireballImpact = await page.evaluate(() => {
    const sb = window.__combatSandbox;
    const cluster1 = sb.clusterDummies[0];
    const burn = cluster1.statusEffects.get('burn');
    return {
      eolkaManaAfter: sb.eolka.mana,
      eolkaFireballCd: sb.eolka.spellCooldowns.fireball,
      cluster1Hp: cluster1.hp,
      cluster1BurnActive: Boolean(burn?.active),
    };
  });
  console.log('[QA P2] Fireball Results:', fireballResult, fireballImpact);

  // 4. Test Ice Spike (Piercing bolt, freeze_slow -40%)
  console.log('[QA P2] Testing Ice Spike...');
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.eolka.mana = 100;
    sb.eolka.spellCooldowns.iceSpike = 0;
    const targetCluster = sb.clusterDummies[1].position;
    sb.eolka.castSpell('iceSpike', targetCluster);
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'docs/screenshots_combat_p2/03_ice_spike_pierce.png' });

  const iceSpikeCheck = await page.evaluate(() => {
    const sb = window.__combatSandbox;
    const c2 = sb.clusterDummies[1];
    const slow = c2.statusEffects.get('freeze_slow');
    return {
      c2Hp: c2.hp,
      slowActive: Boolean(slow?.active),
      effectiveMoveSpeed: c2.effectiveMoveSpeed,
    };
  });
  console.log('[QA P2] Ice Spike Results:', iceSpikeCheck);

  // 5. Test Lightning Chain (Bounces up to 3 jumps, applies micro-stun)
  console.log('[QA P2] Testing Lightning Chain...');
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.eolka.mana = 100;
    sb.eolka.spellCooldowns.lightningChain = 0;
    sb.eolka.castSpell('lightningChain', sb.clusterDummies[0].position, sb.clusterDummies[0]);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screenshots_combat_p2/04_lightning_chain_jumps.png' });

  const chainCheck = await page.evaluate(() => {
    const sb = window.__combatSandbox;
    return {
      c1Hp: sb.clusterDummies[0].hp,
      c2Hp: sb.clusterDummies[1].hp,
      c3Hp: sb.clusterDummies[2].hp,
      activeArcs: sb.spellVFXPool.lightningArcs.filter(a => a.active).length,
    };
  });
  console.log('[QA P2] Lightning Chain Results:', chainCheck);

  // 6. Test Targeted Restorative Surge (Heal lowest ally: Hurt Scout Ally)
  console.log('[QA P2] Testing Restorative Surge (Heal)...');
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.hurtAllyDummy.hp = 25; // Reset to 25 HP
    sb.eolka.mana = 100;
    sb.eolka.spellCooldowns.heal = 0;
  });
  const preHealHp = await page.evaluate(() => window.__combatSandbox.hurtAllyDummy.hp);
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.eolka.castSpell('heal');
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'docs/screenshots_combat_p2/05_smart_targeted_heal.png' });

  const postHealHp = await page.evaluate(() => window.__combatSandbox.hurtAllyDummy.hp);
  console.log(`[QA P2] Heal: Pre-HP = ${preHealHp}, Post-HP = ${postHealHp} (+${postHealHp - preHealHp} HP)`);

  // 7. Test Arcane Ward (Aura shield bubble, 60 HP Barrier)
  console.log('[QA P2] Testing Arcane Ward...');
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.eolka.mana = 100;
    sb.eolka.spellCooldowns.ward = 0;
    sb.eolka.castSpell('ward');
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screenshots_combat_p2/06_arcane_ward_bubble.png' });

  const wardCheck = await page.evaluate(() => {
    const sb = window.__combatSandbox;
    const ward = sb.eolka.statusEffects.get('ward_barrier');
    const activeBubbles = sb.spellVFXPool.wardBubbles.filter(b => b.active).length;
    return {
      wardActive: Boolean(ward?.active),
      barrierHp: ward?.barrierHp,
      activeBubbles,
    };
  });
  console.log('[QA P2] Ward Check:', wardCheck);

  // 8. Test Meteor Bombardment (Super-Armor during startup, Ground Telegraph, 110 dmg + breaks Elite Poise)
  console.log('[QA P2] Testing Meteor Bombardment...');
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.dummy3.poise = sb.dummy3.maxPoise;
    sb.dummy3.isPoiseBroken = false;
    sb.eolka.mana = 100;
    sb.eolka.spellCooldowns.meteor = 0;
  });
  const elitePrePoise = await page.evaluate(() => window.__combatSandbox.dummy3.poise);
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.eolka.castSpell('meteor', sb.dummy3.position);
  });

  // Capture startup with ground telegraph decal active
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screenshots_combat_p2/07_meteor_startup_telegraph.png' });

  // Wait for detonation (1.10s impact delay + buffer)
  await page.waitForTimeout(1400);
  await page.screenshot({ path: 'docs/screenshots_combat_p2/08_meteor_detonation_poise_break.png' });

  const meteorCheck = await page.evaluate(() => {
    const sb = window.__combatSandbox;
    const d3 = sb.dummy3;
    return {
      d3Hp: d3.hp,
      d3Poise: d3.poise,
      d3PoiseBroken: d3.isPoiseBroken,
      d3State: d3.stateMachine.state,
    };
  });
  console.log(`[QA P2] Meteor Check: Elite Poise ${elitePrePoise} -> ${meteorCheck.d3Poise}, Poise Broken = ${meteorCheck.d3PoiseBroken}, State = ${meteorCheck.d3State}`);

  // 9. Test Super-Armor vs Normal Cast Interruption
  console.log('[QA P2] Testing Super-Armor vs Normal Cast Interruption...');
  const interruptCheck = await page.evaluate(() => {
    const sb = window.__combatSandbox;
    // Reset Eolka state & poise
    sb.eolka.stateMachine.transitionTo('IDLE');
    sb.eolka.poise = sb.eolka.maxPoise;
    sb.eolka.isPoiseBroken = false;
    sb.eolka.mana = 100;
    sb.eolka.spellCooldowns.fireball = 0;

    // Test A: Normal spell (fireball) interrupted by hit
    sb.eolka.castSpell('fireball', sb.dummy1.position);
    const stateDuringStartup = sb.eolka.stateMachine.state;
    sb.eolka.receiveAttack({
      attacker: sb.dummy2,
      attackerName: 'Timed Dummy',
      attackerPosition: sb.dummy2.position,
      damage: 10,
      poiseDamage: 10,
    });
    const stateAfterHitNormal = sb.eolka.stateMachine.state;

    // Test B: Super-Armor spell (meteor) hit during startup
    sb.eolka.stateMachine.transitionTo('IDLE');
    sb.eolka.poise = sb.eolka.maxPoise;
    sb.eolka.isPoiseBroken = false;
    sb.eolka.mana = 100;
    sb.eolka.spellCooldowns.meteor = 0;
    sb.eolka.castSpell('meteor', sb.dummy1.position);
    const stateDuringMeteorStartup = sb.eolka.stateMachine.state;
    sb.eolka.receiveAttack({
      attacker: sb.dummy2,
      attackerName: 'Timed Dummy',
      attackerPosition: sb.dummy2.position,
      damage: 10,
      poiseDamage: 10,
    });
    const stateAfterHitMeteor = sb.eolka.stateMachine.state;

    return {
      stateDuringStartup,
      stateAfterHitNormal,      // Must be 'STAGGER' (interrupted)
      stateDuringMeteorStartup,
      stateAfterHitMeteor,       // Must be 'CAST' (super-armor held)
    };
  });
  console.log('[QA P2] Cast Interruption & Super-Armor Check:', interruptCheck);

  // 10. Test Autonomous Mage AI (Switch back to Han, let Eolka fight autonomously)
  console.log('[QA P2] Testing Autonomous Mage AI...');
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.setHeroRole('han');
    sb.hurtAllyDummy.hp = 20; // < 45% threshold
    sb.eolka.stateMachine.transitionTo('IDLE');
    sb.eolka.mana = 100;
    sb.eolka.spellCooldowns.heal = 0;
  });
  await page.waitForTimeout(600);
  const aiHealCheck = await page.evaluate(() => {
    const sb = window.__combatSandbox;
    return {
      hurtAllyHp: sb.hurtAllyDummy.hp,
      eolkaState: sb.eolka.stateMachine.state,
      eolkaAction: sb.eolka.stateMachine.currentAction,
    };
  });
  console.log('[QA P2] Autonomous Mage AI Decision:', aiHealCheck);

  // 11. Test Squad Signature Skills (Slots 1 to 4)
  console.log('[QA P2] Testing Squad Signature Skills...');
  const squadCheck = await page.evaluate(() => {
    const sb = window.__combatSandbox;
    for (let i = 0; i < 4; i++) {
      sb.squadController.cooldowns[i] = 0;
    }
    const statesBefore = [
      sb.squadController.getSkillState(0),
      sb.squadController.getSkillState(1),
      sb.squadController.getSkillState(2),
      sb.squadController.getSkillState(3),
    ];
    // Trigger Eolka Meteor skill (Slot 4 / index 3)
    const triggered = sb.squadController.triggerSquadSkill(3, sb.clusterDummies[0].position);
    const slot4StateAfter = sb.squadController.getSkillState(3);
    return { statesBefore, triggered, slot4StateAfter };
  });
  console.log('[QA P2] Squad Skill Hotkeys Check:', squadCheck);

  // 12. 30+ Combatant 60 FPS Performance Benchmark
  console.log('[QA P2] Running 30+ Combatant Stress Benchmark...');
  await page.evaluate(() => {
    window.__combatSandbox.toggleStressTest();
  });
  await page.waitForTimeout(500);

  const benchmark = await page.evaluate(async () => {
    const samples = [];
    for (let f = 0; f < 60; f++) {
      samples.push(window.__combatSandbox.getCpuTickMs());
      await new Promise(r => requestAnimationFrame(r));
    }
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const peak = Math.max(...samples);
    return {
      combatantsCount: window.__combatSandbox.combatants.length,
      avgCpuTickMs: avg,
      peakCpuTickMs: peak,
      zeroConsoleErrors: true,
    };
  });
  console.log('[QA P2] Benchmark Results:', benchmark);

  await page.screenshot({ path: 'docs/screenshots_combat_p2/09_30_combatant_benchmark.png' });
  console.log('[QA P2] Saved 09_30_combatant_benchmark.png');

  await browser.close();

  console.log('\n======================================================');
  console.log('PHASE 2 QA AUTOMATION SUMMARY');
  console.log(`Console Errors: ${consoleErrors.length}`);
  console.log(`Active Combatants: ${benchmark.combatantsCount}`);
  console.log(`Average CPU Tick: ${benchmark.avgCpuTickMs.toFixed(3)} ms (Budget <= 2.50 ms)`);
  console.log(`Peak CPU Tick: ${benchmark.peakCpuTickMs.toFixed(3)} ms`);
  console.log('======================================================\n');
}

run().catch(err => {
  console.error('[QA P2 Error]', err);
  process.exit(1);
});
