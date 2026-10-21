// scripts/test_devlab_fixes.mjs
// Automated verification for Dev Lab fixes (Issues 1-4)

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/lib/chatgpt/resources/cua_node/lib/node_modules/playwright-core');
import fs from 'fs';

const CHROME_PATH = '/home/aymen/.agent-browser/browsers/chrome-155.0.8059.84/chrome';
const SCREENSHOT_DIR = 'docs/screenshots_devlab';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('[DevLab Fixes Test] Launching Playwright browser...');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 }
  });

  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      console.error('[Browser Error]', text);
    } else {
      consoleLogs.push(text);
    }
  });
  page.on('pageerror', err => {
    console.error('[Browser Uncaught Page Error]', err);
  });

  console.log('[DevLab Fixes Test] Navigating to http://127.0.0.1:5173/dev.html ...');
  await page.goto('http://127.0.0.1:5173/dev.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Measure initial FPS & CPU tick
  const initialPerf = await page.evaluate(() => {
    return {
      fps: document.getElementById('tel-fps')?.textContent,
      cpu: document.getElementById('tel-cpu')?.textContent
    };
  });
  console.log(`[DevLab Fixes Test] Initial Performance: FPS=${initialPerf.fps}, CPU=${initialPerf.cpu}`);

  // Find canvas center
  const canvasBox = await page.locator('#canvas-container canvas').boundingBox();
  const centerX = canvasBox.x + canvasBox.width / 2;
  const centerY = canvasBox.y + canvasBox.height / 2;

  // -------------------------------------------------------------
  // TEST 1: LMB Click Attack (Light)
  // -------------------------------------------------------------
  console.log('[DevLab Fixes Test] 1. Testing LMB Light Attack...');
  // Move to center of canvas and tap LMB
  await page.mouse.move(centerX, centerY);
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(80);
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(120);

  const debugText1 = await page.locator('#input-hero-debug').innerText();
  console.log('[DevLab Fixes Test] Debug Text after LMB tap:', debugText1);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix_01_lmb_light.png` });

  // Wait for attack to finish completely so hero returns to IDLE
  await page.waitForTimeout(900);

  // -------------------------------------------------------------
  // TEST 2: LMB Hold Heavy Attack
  // -------------------------------------------------------------
  console.log('[DevLab Fixes Test] 2. Testing LMB Heavy Attack (Hold >= 350ms)...');
  await page.mouse.move(centerX, centerY);
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(500); // Hold over 350ms
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(150);

  const debugText2 = await page.locator('#input-hero-debug').innerText();
  console.log('[DevLab Fixes Test] Debug Text after LMB hold:', debugText2);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix_02_lmb_heavy.png` });

  // Wait for heavy attack to finish
  await page.waitForTimeout(900);

  // -------------------------------------------------------------
  // TEST 3: Switch to Bow & Test Aim Mode (RMB Hold + Reticle + OTS Camera)
  // -------------------------------------------------------------
  console.log('[DevLab Fixes Test] 3. Testing Bow Aim Mode (Hold RMB)...');
  // Select bow
  await page.selectOption('#arena-weapon-select', 'bow');
  await page.waitForTimeout(300);

  // Verify shield selector is hidden and message is shown
  const shieldWarningVisible = await page.evaluate(() => {
    const el = document.getElementById('shield-archers-notice');
    return el && el.style.display !== 'none';
  });
  console.log('[DevLab Fixes Test] Shield warning visible when bow selected:', shieldWarningVisible);

  // Press and hold RMB on canvas
  await page.mouse.move(centerX, centerY);
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(400); // Draw bow for 400ms

  const isReticleVisible = await page.evaluate(() => {
    const r = document.getElementById('aim-reticle');
    return r && r.style.display === 'block';
  });
  console.log('[DevLab Fixes Test] Aim reticle visible during RMB hold:', isReticleVisible);

  const debugText3 = await page.locator('#input-hero-debug').innerText();
  console.log('[DevLab Fixes Test] Debug Text during Bow Aim:', debugText3);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix_03_bow_aim_reticle.png` });

  // -------------------------------------------------------------
  // TEST 4: Fire Bow at Dummy & Detect Hit
  // -------------------------------------------------------------
  console.log('[DevLab Fixes Test] 4. Testing Bow Aim Fire & Hit Dummy...');
  // Tap LMB while holding RMB to fire aimed shot
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(50);
  await page.mouse.up({ button: 'left' });
  // Release RMB
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(220); // wait for arrow flight and hit

  const debugText4 = await page.locator('#input-hero-debug').innerText();
  console.log('[DevLab Fixes Test] Debug Text after Bow Fire:', debugText4);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix_04_bow_fire_hit.png` });

  // -------------------------------------------------------------
  // TEST 5: Deplete Quiver to 0 Arrows -> Trigger Dagger Switch
  // -------------------------------------------------------------
  console.log('[DevLab Fixes Test] 5. Depleting arrows to trigger 0.4s Dagger Switch...');
  // Set arrows to 1 via console/devLab to quickly test final shot transition
  await page.evaluate(() => {
    const lab = window.__devLab;
    const p = lab?.activeHero || lab?.combatants?.find(c => c.isPlayer);
    if (p) {
      p.arrows = 1;
    }
  });
  await page.waitForTimeout(100);

  // Fire the last arrow via quick tap
  await page.mouse.click(centerX, centerY);
  await page.waitForTimeout(550); // Allow 0.4s dagger swap animation

  const weaponAfterDeplete = await page.evaluate(() => {
    const lab = window.__devLab;
    const p = lab?.activeHero || lab?.combatants?.find(c => c.isPlayer);
    return {
      weaponKind: p?.weapon?.kind,
      arrows: p?.arrows,
      hasBowOnBack: !!p?.modelRig?.sockets?.back?.children?.length
    };
  });
  console.log('[DevLab Fixes Test] Weapon after quiver depleted:', weaponAfterDeplete);
  const debugText5 = await page.locator('#input-hero-debug').innerText();
  console.log('[DevLab Fixes Test] Debug Text after Dagger Swap:', debugText5);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix_05_dagger_switch.png` });

  // -------------------------------------------------------------
  // TEST 6: Arrow Pickup & Key X Swap back to Bow
  // -------------------------------------------------------------
  console.log('[DevLab Fixes Test] 6. Testing Arrow Pickup and Key X Toggle...');
  // Move player into arrow pickup position (2.5, 0, 0)
  await page.evaluate(() => {
    const lab = window.__devLab;
    const p = lab?.activeHero || lab?.combatants?.find(c => c.isPlayer);
    if (p && lab.arrowPickup) {
      // Step player directly onto the arrow pickup
      p.mesh.position.set(2.5, 0, 0);
      p.position.set(2.5, 0, 0);
    }
  });
  await page.waitForTimeout(300); // Allow pickup update to trigger refill

  // Now press 'KeyX' to swap back to bow
  await page.keyboard.press('KeyX');
  await page.waitForTimeout(300);

  const weaponAfterPickup = await page.evaluate(() => {
    const lab = window.__devLab;
    const p = lab?.activeHero || lab?.combatants?.find(c => c.isPlayer);
    return {
      weaponKind: p?.weapon?.kind,
      arrows: p?.arrows,
      hasBowInHand: !!p?.modelRig?.sockets?.handR?.children?.length
    };
  });
  console.log('[DevLab Fixes Test] Weapon after pickup and KeyX:', weaponAfterPickup);
  const debugText6 = await page.locator('#input-hero-debug').innerText();
  console.log('[DevLab Fixes Test] Debug Text after KeyX:', debugText6);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix_06_arrow_pickup.png` });

  // -------------------------------------------------------------
  // TEST 7: UI & Overhead Tag & Performance Audit
  // -------------------------------------------------------------
  console.log('[DevLab Fixes Test] 7. Testing Slider Values, UI Layout, and FPS with 10 enemies...');
  // Spawn 10 enemies
  await page.evaluate(() => {
    const slider = document.getElementById('slider-spawn-count');
    if (slider) {
      slider.value = 10;
      slider.dispatchEvent(new Event('input'));
    }
  });
  await page.click('#btn-spawn-batch');
  await page.waitForTimeout(800);

  const perfWith10 = await page.evaluate(() => {
    const lab = window.__devLab;
    return {
      fps: document.getElementById('tel-fps')?.textContent,
      cpu: document.getElementById('tel-cpu')?.textContent,
      combatantsCount: lab?.combatants?.length,
      visibleBadges: document.querySelectorAll('.combatant-overhead-tag:not([style*="display: none"])').length
    };
  });
  console.log('[DevLab Fixes Test] Perf with 10 enemies:', perfWith10);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix_07_overhead_tags_10_enemies.png` });

  console.log('[DevLab Fixes Test] All fix tests complete!');
  await browser.close();
}

run().catch(err => {
  console.error('[DevLab Fixes Test Error]', err);
  process.exit(1);
});
