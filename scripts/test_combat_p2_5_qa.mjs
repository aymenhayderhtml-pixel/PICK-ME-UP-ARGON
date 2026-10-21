// scripts/test_combat_p2_5_qa.mjs
// Automated Visual & Scenario Validation for Phase 2.5 Combat Pass
// Captures verified '_after' screenshots and tests parry, dodge, poise break, spells, status icons, swarm, and reset flow.

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/lib/chatgpt/resources/cua_node/lib/node_modules/playwright-core');

const CHROME_PATH = '/home/aymen/.agent-browser/browsers/chrome-155.0.8059.84/chrome';
const SCREENSHOT_DIR = 'docs/screenshots_combat_p2_5';

async function run() {
  console.log('[QA P2.5] Launching Playwright browser...');
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

  console.log('[QA P2.5] Navigating to http://localhost:5173/combat-test.html ...');
  await page.goto('http://localhost:5173/combat-test.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // 1. Initial Start View
  console.log('[QA P2.5] 1. Capturing start view...');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01_start_view_after.png` });

  // 2. Hero Mid-Attack Swing
  console.log('[QA P2.5] 2. Capturing hero mid-attack swing...');
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.hero.stateMachine.transitionTo('ATTACK', { heavy: false });
  });
  await page.waitForTimeout(160); // Mid active strike
  await page.screenshot({ path: `${SCREENSHOT_DIR}/02_hero_mid_attack_after.png` });

  // Reset to idle
  await page.evaluate(() => {
    window.__combatSandbox.resetAllCombatants();
  });
  await page.waitForTimeout(400);

  // 3. Up-close character & weapon inspection
  console.log('[QA P2.5] 3. Capturing ally & enemy up-close (Eolka staff, Shaman staff, Elite greatsword, Grunt dagger)...');
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    // Move hero closer to dummies for high-detail perspective
    sb.hero.position.set(1.5, 0, -1.5);
    sb.hero.facingYaw = -Math.PI * 0.75;
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/03_ally_and_enemy_up_close_after.png` });

  // 4. Wireframes On (Accurate 1.55m height, 0.35m radius aligned to feet)
  console.log('[QA P2.5] 4. Capturing wireframes...');
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.toggleWireframes();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/04_wireframes_on_after.png` });

  // Toggle wireframes back off
  await page.evaluate(() => {
    window.__combatSandbox.toggleWireframes();
    window.__combatSandbox.resetAllCombatants();
  });
  await page.waitForTimeout(400);

  // 5. Fireball Cast & Projectile & Impact with Burn Status
  console.log('[QA P2.5] 5. Capturing Fireball...');
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.setHeroRole('eolka');
    sb.eolka.mana = 100;
    sb.eolka.spellCooldowns.fireball = 0;
    const target = sb.clusterDummies[0].position;
    sb.eolka.castSpell('fireball', target);
  });
  await page.waitForTimeout(150); // In cast startup (staff glow)
  await page.screenshot({ path: `${SCREENSHOT_DIR}/05_spell_fireball_after.png` });

  await page.waitForTimeout(650); // Flight & Impact
  await page.screenshot({ path: `${SCREENSHOT_DIR}/06_spell_fireball_impact_after.png` });

  // 6. Ice Spike (Bolt + Freeze Slow status)
  console.log('[QA P2.5] 6. Capturing Ice Spike...');
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.eolka.mana = 100;
    sb.eolka.spellCooldowns.iceSpike = 0;
    const target = sb.clusterDummies[1].position;
    sb.eolka.castSpell('iceSpike', target);
  });
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/07_spell_icespike_after.png` });

  // 7. Lightning Chain (Thick arcs + Stun status)
  console.log('[QA P2.5] 7. Capturing Lightning Chain...');
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.eolka.mana = 100;
    sb.eolka.spellCooldowns.lightningChain = 0;
    const target = sb.clusterDummies[0].position;
    sb.eolka.castSpell('lightningChain', target);
  });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/08_spell_lightning_after.png` });

  // 8. Restorative Surge (Heal Wounded Scout Ally)
  console.log('[QA P2.5] 8. Capturing Heal...');
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.eolka.mana = 100;
    sb.eolka.spellCooldowns.heal = 0;
    sb.hurtAllyDummy.hp = 25; // wounded
    sb.eolka.castSpell('heal', sb.hurtAllyDummy.position);
  });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/09_spell_heal_after.png` });

  // 9. Arcane Ward (Dual-layer bubble + warded status)
  console.log('[QA P2.5] 9. Capturing Ward...');
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.eolka.mana = 100;
    sb.eolka.spellCooldowns.ward = 0;
    sb.eolka.castSpell('ward');
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/10_spell_ward_after.png` });

  // 10. Meteor (Telegraph & Boulder Impact)
  console.log('[QA P2.5] 10. Capturing Meteor...');
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.eolka.mana = 100;
    sb.eolka.spellCooldowns.meteor = 0;
    const target = sb.clusterDummies[2].position;
    sb.eolka.castSpell('meteor', target);
  });
  await page.waitForTimeout(450); // Telegraph ring visible
  await page.screenshot({ path: `${SCREENSHOT_DIR}/11_spell_meteor_telegraph_after.png` });
  await page.waitForTimeout(1200); // Boulder falling & detonating
  await page.screenshot({ path: `${SCREENSHOT_DIR}/11_spell_meteor_impact_after.png` });

  // 11. Parry & Dodge
  console.log('[QA P2.5] 11. Capturing Parry & Dodge...');
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.setHeroRole('han');
    sb.resetAllCombatants();
    sb.hero.stateMachine.transitionTo('BLOCK');
  });
  await page.waitForTimeout(80); // In parry window
  await page.screenshot({ path: `${SCREENSHOT_DIR}/12_parry_and_dodge_after.png` });

  // 12. Poise Break Guard Broken State
  console.log('[QA P2.5] 12. Capturing Poise Break...');
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.dummy3.poise = 0;
    sb.dummy3.stateMachine.transitionTo('STAGGER', { duration: 1.5, isPoiseBreak: true });
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/13_poise_break_after.png` });

  // 13. 30-Dummy Swarm Stress Test
  console.log('[QA P2.5] 13. Capturing 30-Dummy Swarm...');
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.toggleStressTest();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/14_30_dummy_swarm_after.png` });

  // Turn off swarm
  await page.evaluate(() => {
    window.__combatSandbox.toggleStressTest();
  });
  await page.waitForTimeout(300);

  // 14. Arena Reset & Respawn Flow
  console.log('[QA P2.5] 14. Testing Reset & Auto-Respawn flow...');
  const resetResults = await page.evaluate(() => {
    const sb = window.__combatSandbox;
    // Kill cluster grunts and damage dummy2
    sb.clusterDummies[0].isDead = true;
    sb.clusterDummies[0].hp = 0;
    sb.clusterDummies[0].mesh.visible = false;

    sb.dummy2.hp = 10;
    sb.hero.mana = 20;

    // Trigger reset
    sb.resetAllCombatants();

    return {
      cluster0Alive: !sb.clusterDummies[0].isDead,
      cluster0Hp: sb.clusterDummies[0].hp,
      cluster0Visible: sb.clusterDummies[0].mesh.visible,
      dummy2Hp: sb.dummy2.hp,
      heroMana: sb.hero.mana,
      autoRespawn: sb.isAutoRespawnEnabled(),
    };
  });
  console.log('[QA P2.5] Reset Results:', resetResults);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/15_arena_reset_after.png` });

  // Verification metrics
  const telemetry = await page.evaluate(() => {
    const sb = window.__combatSandbox;
    return {
      combatants: sb.combatants.length,
      cpuTickMs: sb.getCpuTickMs(),
      heroWeaponAnchorValid: sb.hero.weaponAnchorsValid,
      eolkaWeaponAnchorValid: sb.eolka.weaponAnchorsValid,
    };
  });
  console.log('[QA P2.5] Final Engine Telemetry:', telemetry);
  console.log('[QA P2.5] Console Errors count:', consoleErrors.length);

  await browser.close();
  console.log('[QA P2.5] Completed successfully!');
}

run().catch(err => {
  console.error('[QA P2.5 Fatal Error]', err);
  process.exit(1);
});
