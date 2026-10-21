// scripts/test_combat_p1_qa.mjs
// Automated Browser Validation & Benchmarking for Universal Combat Engine Phase 1

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/lib/chatgpt/resources/cua_node/lib/node_modules/playwright-core');

const CHROME_PATH = '/home/aymen/.agent-browser/browsers/chrome-155.0.8059.84/chrome';

async function run() {
  console.log('[QA] Launching Playwright browser for Phase 1 Combat verification...');
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

  console.log('[QA] Loading http://localhost:5173/combat-test.html ...');
  await page.goto('http://localhost:5173/combat-test.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Verify Sandbox & Entities Initialized
  const initCheck = await page.evaluate(() => {
    const sb = window.__combatSandbox;
    if (!sb) return { ok: false, error: 'window.__combatSandbox not found' };
    return {
      ok: true,
      combatantsCount: sb.combatants.length,
      heroHp: sb.hero.hp,
      heroStamina: sb.hero.stamina,
      heroPoise: sb.hero.poise,
      dummy1Hp: sb.dummy1.hp,
      dummy2Hp: sb.dummy2.hp,
      dummy3Hp: sb.dummy3.hp,
      dummy3Poise: sb.dummy3.poise
    };
  });
  console.log('[QA] Initial Sandbox Check:', initCheck);

  // Take baseline screenshot
  await page.screenshot({ path: 'docs/screenshots_combat_p1/01_arena_and_dummies.png' });
  console.log('[QA] Saved 01_arena_and_dummies.png');

  // 2. Enable Wireframes & Toggle Check
  await page.evaluate(() => {
    window.__combatSandbox.toggleWireframes();
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'docs/screenshots_combat_p1/02_wireframes_active.png' });
  console.log('[QA] Saved 02_wireframes_active.png');

  // 3. Test Attack on Passive Dummy (Dummy 1)
  console.log('[QA] Testing Light Attack Combo on Dummy 1...');
  const attackRes = await page.evaluate(async () => {
    const sb = window.__combatSandbox;
    // Move hero close to dummy 1 (at -3.5, 0, -3.0)
    sb.hero.position.set(-3.5, 0, -2.1);
    sb.hero.facingYaw = Math.PI; // Face towards dummy 1

    // Trigger attack1
    sb.hero.stateMachine.transitionTo('ATTACK', { heavy: false });

    // Step animation frames into active hitWindow (0.16s to 0.26s)
    let hitDetected = false;
    for (let f = 0; f < 25; f++) {
      // Small delay for animate loop to tick
      await new Promise(r => setTimeout(r, 16));
      if (sb.hero.hasHitCurrentSwing) {
        hitDetected = true;
        break;
      }
    }

    return {
      hitDetected,
      dummy1State: sb.dummy1.stateMachine.state,
      heroState: sb.hero.stateMachine.state,
      heroPhase: sb.hero.stateMachine.attackPhase,
      recentEvents: sb.combatEvents.getRecentLogs().map(l => l.detail)
    };
  });
  console.log('[QA] Attack Result:', attackRes);
  await page.screenshot({ path: 'docs/screenshots_combat_p1/03_light_combo_hit.png' });
  console.log('[QA] Saved 03_light_combo_hit.png');

  // 4. Test Dodge Roll with I-Frames
  console.log('[QA] Testing Directional Dodge Roll...');
  const dodgeRes = await page.evaluate(async () => {
    const sb = window.__combatSandbox;
    sb.hero.stateMachine.transitionTo('DODGE');
    const startIFrame = sb.hero.iFrameTimer;
    await new Promise(r => setTimeout(r, 100)); // 100ms into roll (within 0.05-0.22s i-frame window)
    const midIFrame = sb.hero.iFrameTimer;
    const midState = sb.hero.stateMachine.state;
    return { startIFrame, midIFrame, midState };
  });
  console.log('[QA] Dodge Roll Result:', dodgeRes);
  await page.screenshot({ path: 'docs/screenshots_combat_p1/04_hero_dodge_roll.png' });
  console.log('[QA] Saved 04_hero_dodge_roll.png');

  // 5. Test Parry on Incoming Attack
  console.log('[QA] Testing Parry against Timed Attacker Dummy...');
  const parryRes = await page.evaluate(async () => {
    const sb = window.__combatSandbox;
    // Position hero in front of dummy 2 (at 0, 0, -4.0)
    sb.hero.position.set(0, 0, -3.1);
    sb.hero.facingYaw = Math.PI; // Face north towards dummy 2
    sb.dummy2.facingYaw = 0;     // Face south towards hero

    // Start dummy 2 attack
    sb.dummy2.stateMachine.transitionTo('ATTACK');

    // Wait until right before active hit window (0.13s)
    await new Promise(r => setTimeout(r, 130));

    // Hero enters BLOCK (first 0.12s is PARRY window: 0.13s to 0.25s)
    sb.hero.stateMachine.transitionTo('BLOCK');

    // Step frames through strike contact (0.16s - 0.24s)
    let parrySucceeded = false;
    for (let f = 0; f < 25; f++) {
      await new Promise(r => setTimeout(r, 16));
      if (sb.dummy2.stateMachine.state === 'STAGGER' || sb.timeScale.slowMoActive || sb.hero.counterWindowTimer > 0) {
        parrySucceeded = true;
        break;
      }
    }

    return {
      parrySucceeded,
      heroCounterTimer: sb.hero.counterWindowTimer,
      dummy2State: sb.dummy2.stateMachine.state,
      slowMoActive: sb.timeScale.slowMoActive,
      recentEvents: sb.combatEvents.getRecentLogs().map(l => l.detail)
    };
  });
  console.log('[QA] Parry Result:', parryRes);
  await page.screenshot({ path: 'docs/screenshots_combat_p1/05_parry_and_counter.png' });
  console.log('[QA] Saved 05_parry_and_counter.png');

  // 6. Test Poise Break on Elite Dummy (Dummy 3)
  console.log('[QA] Testing Charged Heavy Poise Break on Elite Dummy...');
  const poiseRes = await page.evaluate(async () => {
    const sb = window.__combatSandbox;
    // Position hero in front of elite dummy (at 3.5, 0, -3.0)
    sb.hero.position.set(3.5, 0, -2.1);
    sb.hero.facingYaw = Math.PI;

    // Trigger Charged Heavy Attack (85 poise damage >= 80 elite maxPoise)
    sb.hero.stateMachine.transitionTo('ATTACK', { heavy: true });

    // Step frames to impact
    let poiseBroken = false;
    for (let f = 0; f < 35; f++) {
      await new Promise(r => setTimeout(r, 16));
      if (sb.dummy3.isPoiseBroken || sb.dummy3.stateMachine.state === 'STAGGER' || sb.dummy3.poise <= 0) {
        poiseBroken = true;
        break;
      }
    }

    return {
      poiseBroken,
      dummy3Poise: sb.dummy3.poise,
      dummy3State: sb.dummy3.stateMachine.state,
      recentEvents: sb.combatEvents.getRecentLogs().map(l => l.detail)
    };
  });
  console.log('[QA] Elite Poise Break Result:', poiseRes);
  await page.screenshot({ path: 'docs/screenshots_combat_p1/06_elite_poise_break.png' });
  console.log('[QA] Saved 06_elite_poise_break.png');

  // 7. Benchmark 30-Dummy Swarm Stress Test
  console.log('[QA] Benchmarking 30-Dummy Swarm Stress Test...');
  const benchmarkRes = await page.evaluate(async () => {
    const sb = window.__combatSandbox;
    sb.toggleStressTest(); // Spawns 27 extra dummies

    const frameTimes = [];
    for (let f = 0; f < 60; f++) {
      await new Promise(r => setTimeout(r, 16));
      frameTimes.push(sb.getCpuTickMs());
    }

    const avgCpuMs = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const maxCpuMs = Math.max(...frameTimes);

    return {
      totalCombatants: sb.combatants.length,
      avgCpuMs: Number(avgCpuMs.toFixed(3)),
      maxCpuMs: Number(maxCpuMs.toFixed(3)),
      frameTimesSample: frameTimes.slice(0, 10)
    };
  });
  console.log('[QA] Benchmark Results (31 Combatants):', benchmarkRes);
  await page.screenshot({ path: 'docs/screenshots_combat_p1/07_30_dummy_swarm_benchmark.png' });
  console.log('[QA] Saved 07_30_dummy_swarm_benchmark.png');

  await browser.close();
  console.log('[QA] Automated verification completed! Console errors encountered:', consoleErrors.length);
}

run().catch(err => {
  console.error('[QA Fatal Error]', err);
  process.exit(1);
});
