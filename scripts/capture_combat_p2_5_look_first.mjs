// scripts/capture_combat_p2_5_look_first.mjs
// Captures the complete Part 1 visual audit screenshot suite for combat-test.html

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/lib/chatgpt/resources/cua_node/lib/node_modules/playwright-core');

const CHROME_PATH = '/home/aymen/.agent-browser/browsers/chrome-155.0.8059.84/chrome';

async function capture() {
  console.log('[Look First] Launching Playwright browser...');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('[Browser Error]', msg.text());
    }
  });

  console.log('[Look First] Navigating to http://localhost:5173/combat-test.html ...');
  await page.goto('http://localhost:5173/combat-test.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Start View
  await page.screenshot({ path: 'docs/screenshots_combat_p2_5/01_start_view.png' });
  console.log('[Look First] Captured 01_start_view.png');

  // 2. Hero mid-attack
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    sb.hero.stateMachine.transitionTo('ATTACK', { heavy: false });
    // Advance to active strike
    sb.hero.stateMachine.stateTime = 0.15;
    sb.hero.stateMachine.attackPhase = 'ACTIVE';
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: 'docs/screenshots_combat_p2_5/02_hero_mid_attack.png' });
  console.log('[Look First] Captured 02_hero_mid_attack.png');

  // 3. Ally and enemy up close
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    // Move hero right next to Eolka ally and enemy dummy2
    sb.hero.position.set(-1.0, 0, 2.5);
    sb.hero.stateMachine.transitionTo('IDLE');
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screenshots_combat_p2_5/03_ally_and_enemy_up_close.png' });
  console.log('[Look First] Captured 03_ally_and_enemy_up_close.png');

  // 4. Wireframes on
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    document.getElementById('btn-wireframe').click();
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'docs/screenshots_combat_p2_5/04_wireframes_on.png' });
  console.log('[Look First] Captured 04_wireframes_on.png');

  // Turn wireframes back off for spell captures
  await page.evaluate(() => {
    const sb = window.__combatSandbox;
    document.getElementById('btn-wireframe').click();
    sb.setHeroRole('eolka');
    sb.eolka.mana = 100;
    // Position Eolka with good camera view
    sb.eolka.position.set(0, 0, 1.0);
  });
  await page.waitForTimeout(400);

  // Spell Helper to capture Cast, Flight, Impact
  async function captureSpell(spellKey, spellName, castP, flightP, impactP, targetOffset = { x: 3.5, y: 0, z: -4.0 }) {
    console.log(`[Look First] Capturing spell: ${spellName}...`);
    // Reset cooldowns and mana
    await page.evaluate((sKey) => {
      const sb = window.__combatSandbox;
      sb.eolka.mana = 100;
      sb.eolka.spellCooldowns[sKey] = 0;
      sb.timeScale.setDebugTimeScale(0.2); // Slow down for capturing
    }, spellKey);

    // Cast moment (Startup)
    await page.evaluate(({ sKey, targetOffset }) => {
      const sb = window.__combatSandbox;
      const target = sb.clusterDummies[0] ? sb.clusterDummies[0].position : new THREE.Vector3(targetOffset.x, targetOffset.y, targetOffset.z);
      sb.eolka.castSpell(sKey, target);
    }, { sKey: spellKey, targetOffset });
    await page.waitForTimeout(80);
    await page.screenshot({ path: `docs/screenshots_combat_p2_5/${castP}` });

    // Flight moment
    await page.waitForTimeout(300);
    await page.screenshot({ path: `docs/screenshots_combat_p2_5/${flightP}` });

    // Impact moment
    await page.waitForTimeout(800);
    await page.screenshot({ path: `docs/screenshots_combat_p2_5/${impactP}` });

    // Restore time scale
    await page.evaluate(() => {
      window.__combatSandbox.timeScale.setDebugTimeScale(1.0);
    });
    await page.waitForTimeout(200);
  }

  // 5-7. Fireball
  await captureSpell('fireball', 'Fireball', '05_spell_fireball_cast.png', '06_spell_fireball_flight.png', '07_spell_fireball_impact.png');

  // 8-10. Ice Spike
  await captureSpell('iceSpike', 'Ice Spike', '08_spell_icespike_cast.png', '09_spell_icespike_flight.png', '10_spell_icespike_impact.png');

  // 11-13. Lightning Chain
  await captureSpell('lightningChain', 'Lightning Chain', '11_spell_lightning_cast.png', '12_spell_lightning_flight.png', '13_spell_lightning_impact.png');

  // 14-16. Heal (target hurt ally)
  await captureSpell('heal', 'Heal', '14_spell_heal_cast.png', '15_spell_heal_flight.png', '16_spell_heal_impact.png', { x: -4.5, y: 0, z: -1.5 });

  // 17-19. Ward
  await captureSpell('ward', 'Arcane Ward', '17_spell_ward_cast.png', '18_spell_ward_flight.png', '19_spell_ward_impact.png');

  // 20-22. Meteor
  await captureSpell('meteor', 'Meteor', '20_spell_meteor_cast.png', '21_spell_meteor_flight.png', '22_spell_meteor_impact.png');

  console.log('[Look First] All 22 screenshots captured successfully.');
  await browser.close();
}

capture().catch(err => {
  console.error('[Look First Error]', err);
  process.exit(1);
});
