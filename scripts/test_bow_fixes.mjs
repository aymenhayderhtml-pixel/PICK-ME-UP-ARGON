// scripts/test_bow_fixes.mjs
// Verification suite for Bow Fix Pass (Dev Lab dev.html)

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
  console.log('[Bow Fix Suite] Launching Playwright browser...');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') console.error('[Browser Error]', msg.text());
  });
  page.on('pageerror', err => console.error('[Page Error]', err));

  console.log('[Bow Fix Suite] Loading http://127.0.0.1:5173/dev.html ...');
  await page.goto('http://127.0.0.1:5173/dev.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Equip bow and clear arena
  console.log('[Bow Fix Suite] Setting up archer hero with bow...');
  await page.evaluate(() => {
    const lab = window.__devLab;
    lab.activeHero.position.set(0, 0, 0);
    lab.activeHero.facingYaw = 0;
    lab.weapons.setWeapon('bow');
    lab.weapons.setGrade('C');
    lab.activeHero.arrows = 50;
    lab.activeHero.maxArrows = 50;
    lab.clearEnemies();
  });
  await page.waitForTimeout(400);

  const canvasBox = await page.locator('#canvas-container canvas').boundingBox();
  const screenCenterX = canvasBox.x + canvasBox.width / 2;
  const screenCenterY = canvasBox.y + canvasBox.height / 2;

  // ---------------------------------------------------------------------------
  // TEST 1: Standing Grunt 8m 10-Shot Accuracy Test (Issue 1)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 1: Standing Grunt 8m 10-Shot Hit Rate Test ---');
  await page.evaluate(() => {
    const lab = window.__devLab;
    lab.clearEnemies();
    lab.activeHero.position.set(0, 0, 0);
    lab.activeHero.facingYaw = 0;
    // Spawn 1 grunt at distance exactly 8m (0, 0, -8.0)
    lab.spawnEnemyAt('grunt', 0, -8.0);
  });
  await page.waitForTimeout(500);

  // Hold RMB to enter aim mode
  await page.mouse.move(screenCenterX, screenCenterY);
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(200);

  let hits8m = 0;
  let headshots8m = 0;
  const initialStats = await page.evaluate(() => ({
    hits: window.__devLab.stats.hitsLanded,
    damageDealt: window.__devLab.stats.damageDealt
  }));

  for (let shot = 1; shot <= 10; shot++) {
    // Wait for full draw (draw time ~0.30s for grade C, wait 350ms)
    await page.waitForTimeout(350);

    const prevHits = await page.evaluate(() => window.__devLab.stats.hitsLanded);
    // Fire with LMB while holding RMB
    await page.mouse.down({ button: 'left' });
    await page.waitForTimeout(50);
    await page.mouse.up({ button: 'left' });

    // Wait for arrow flight (8m at ~24m/s = ~0.33s flight)
    await page.waitForTimeout(450);

    const curHits = await page.evaluate(() => window.__devLab.stats.hitsLanded);
    const didHit = curHits > prevHits;
    if (didHit) hits8m++;

    const isAimingStill = await page.evaluate(() => {
      const lab = window.__devLab;
      return lab.weapons.isBowAiming && lab.arena.cameraMode === 'aim';
    });

    console.log(`  Shot ${shot}/10: ${didHit ? 'HIT' : 'MISS'} (Total hits: ${hits8m}/10, Stayed aimed: ${isAimingStill})`);

    // Ensure dummy has HP for next shot
    await page.evaluate(() => {
      for (const c of window.__devLab.combatants) {
        if (c.team === 'enemy') {
          c.hp = c.maxHp;
          c.isDead = false;
        }
      }
    });
  }

  // Release RMB to leave aim mode
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(250);

  console.log(`[Result 8m Test]: ${hits8m}/10 hits (${hits8m * 10}%)`);

  // Capture screenshot of arena after 8m test at 1280x720
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bow_8m_test_1280x720.png` });

  // ---------------------------------------------------------------------------
  // TEST 2: Range Accuracy Tests: 3m, 15m, 25m, and Moving Target (Issue 1)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Multi-Range & Moving Target Accuracy Tests ---');
  const ranges = [3.0, 15.0, 25.0];
  const rangeResults = {};

  for (const r of ranges) {
    await page.evaluate((rangeDist) => {
      const lab = window.__devLab;
      lab.clearEnemies();
      lab.activeHero.position.set(0, 0, 0);
      lab.activeHero.facingYaw = 0;
      lab.spawnEnemyAt('grunt', 0, -rangeDist);
    }, r);
    await page.waitForTimeout(400);

    await page.mouse.down({ button: 'right' });
    await page.waitForTimeout(200);

    let hitsAtR = 0;
    const testShots = 5;
    for (let s = 1; s <= testShots; s++) {
      await page.waitForTimeout(350);
      const prevHits = await page.evaluate(() => window.__devLab.stats.hitsLanded);
      await page.mouse.down({ button: 'left' });
      await page.waitForTimeout(50);
      await page.mouse.up({ button: 'left' });

      // Flight time scales with distance
      await page.waitForTimeout(300 + r * 35);
      const curHits = await page.evaluate(() => window.__devLab.stats.hitsLanded);
      if (curHits > prevHits) hitsAtR++;

      await page.evaluate(() => {
        for (const c of window.__devLab.combatants) {
          if (c.team === 'enemy') { c.hp = c.maxHp; c.isDead = false; }
        }
      });
    }
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(250);

    rangeResults[`${r}m`] = `${hitsAtR}/${testShots} (${Math.round((hitsAtR / testShots) * 100)}%)`;
    console.log(`  Range ${r}m: ${rangeResults[`${r}m`]}`);
  }

  // Moving Target Test: Grunt pacing horizontally across crosshair at 10m
  console.log('\n--- Moving Target Test (Pacing at 10m) ---');
  await page.evaluate(() => {
    const lab = window.__devLab;
    lab.clearEnemies();
    lab.activeHero.position.set(0, 0, 0);
    const grunt = lab.spawnEnemyAt('grunt', -3.0, -10.0);
    if (grunt) {
      grunt._moveDir = 1;
      lab.aiUpdaters.push((dt) => {
        if (!grunt || grunt.isDead) return;
        grunt.position.x += grunt._moveDir * 2.5 * dt;
        if (grunt.position.x > 3.0) grunt._moveDir = -1;
        if (grunt.position.x < -3.0) grunt._moveDir = 1;
      });
    }
  });
  await page.waitForTimeout(400);

  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(200);

  let movingHits = 0;
  for (let s = 1; s <= 5; s++) {
    await page.waitForTimeout(350);
    const prevHits = await page.evaluate(() => window.__devLab.stats.hitsLanded);
    await page.mouse.down({ button: 'left' });
    await page.waitForTimeout(50);
    await page.mouse.up({ button: 'left' });
    await page.waitForTimeout(550);
    const curHits = await page.evaluate(() => window.__devLab.stats.hitsLanded);
    if (curHits > prevHits) movingHits++;
    await page.evaluate(() => {
      for (const c of window.__devLab.combatants) {
        if (c.team === 'enemy') { c.hp = c.maxHp; c.isDead = false; }
      }
    });
  }
  await page.mouse.up({ button: 'right' });
  rangeResults['moving_10m'] = `${movingHits}/5 (${Math.round((movingHits / 5) * 100)}%)`;
  console.log(`  Moving target at 10m: ${rangeResults['moving_10m']}`);

  // ---------------------------------------------------------------------------
  // TEST 3: Issue 2 & 3 Fast Archer Camera, Rapid Follow-up, Strafe (Issues 2 & 3)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Camera Zoom, Stay-Aimed, Rapid Follow-up, Slow Strafe ---');
  await page.evaluate(() => {
    const lab = window.__devLab;
    lab.clearEnemies();
    lab.activeHero.position.set(0, 0, 0);
    lab.spawnEnemyAt('grunt', 0, -8.0);
  });
  await page.waitForTimeout(300);

  // Press and hold RMB
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(250);

  const aimState1 = await page.evaluate(() => {
    const lab = window.__devLab;
    const heroPos = lab.activeHero.position;
    const camPos = lab.arena.camera.position;
    const distToHero = camPos.distanceTo(heroPos);
    return {
      cameraMode: lab.arena.cameraMode,
      fov: lab.arena.camera.fov,
      distToHero,
      heroState: lab.activeHero.stateMachine.state,
      reticleVisible: document.getElementById('aim-reticle').style.display === 'block',
      reticleTransform: document.getElementById('aim-reticle').style.transform
    };
  });
  console.log('  Aim State (RMB held):', aimState1);

  // Capture Screenshot of Aim Stance at 1280x720
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bow_aim_stance_1280x720.png` });

  // Fire shot 1 with RMB STILL HELD
  console.log('  Firing shot 1 while holding RMB...');
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(50);
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(100);

  // Check state immediately after shot (must NOT drop aim mode or camera)
  const afterShotState = await page.evaluate(() => {
    const lab = window.__devLab;
    return {
      cameraMode: lab.arena.cameraMode,
      isBowAiming: lab.weapons.isBowAiming,
      isRapidFollowUp: lab.weapons.isRapidFollowUp,
      reticleVisible: document.getElementById('aim-reticle').style.display === 'block'
    };
  });
  console.log('  State immediately after shot (RMB held):', afterShotState);

  // Capture Screenshot during rapid follow-up re-draw
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bow_rapid_redraw_1280x720.png` });

  // Wait 280ms for rapid follow-up to reach full draw again
  await page.waitForTimeout(280);
  const redrawState = await page.evaluate(() => {
    const lab = window.__devLab;
    return {
      bowDrawRatio: lab.weapons.bowDrawRatio,
      reticleTransform: document.getElementById('aim-reticle').style.transform
    };
  });
  console.log('  Rapid follow-up full draw state:', redrawState);

  // Test Slow Strafe with WASD while aimed
  console.log('  Testing slow strafe with WASD while aimed...');
  const posBeforeStrafe = await page.evaluate(() => ({
    x: window.__devLab.activeHero.position.x,
    z: window.__devLab.activeHero.position.z
  }));
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyD');
  const posAfterStrafe = await page.evaluate(() => ({
    x: window.__devLab.activeHero.position.x,
    z: window.__devLab.activeHero.position.z,
    state: window.__devLab.activeHero.stateMachine.state
  }));
  const strafeMoved = Math.abs(posAfterStrafe.x - posBeforeStrafe.x) > 0.1;
  console.log(`  Strafe moved: ${strafeMoved} (dx: ${(posAfterStrafe.x - posBeforeStrafe.x).toFixed(2)}, hero state: ${posAfterStrafe.state})`);

  // Release RMB: must exit aim mode cleanly
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(250);
  const releasedState = await page.evaluate(() => {
    const lab = window.__devLab;
    return {
      cameraMode: lab.arena.cameraMode,
      isBowAiming: lab.weapons.isBowAiming,
      reticleVisible: document.getElementById('aim-reticle').style.display !== 'none'
    };
  });
  console.log('  State after releasing RMB:', releasedState);

  // ---------------------------------------------------------------------------
  // TEST 4: Overhead Name Tags & Hit Marker (Issue 4a, 4b)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Overhead Name Tags Staggering & Hit Marker ---');
  await page.evaluate(() => {
    const lab = window.__devLab;
    lab.clearEnemies();
    lab.showDebugText = true;
    lab.addBatchCombatants({ typeKey: 'grunt', count: 6, team: 'enemy', pattern: 'cluster' });
  });
  await page.waitForTimeout(400);

  const tagStats = await page.evaluate(() => {
    const container = document.getElementById('overhead-hud-container');
    const visibleBadges = Array.from(container.children).filter(el => el.style.display !== 'none');
    return {
      totalVisibleTags: visibleBadges.length,
      positions: visibleBadges.map(el => ({ left: el.style.left, top: el.style.top }))
    };
  });
  console.log('  Visible overhead badges (max should be 4: hero + 3 enemies):', tagStats.totalVisibleTags);

  // Test Hit Marker display on hit
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(350);
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(50);
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(280);

  const hitMarkerCheck = await page.evaluate(() => {
    const marker = document.getElementById('hit-marker');
    return {
      opacity: marker ? window.getComputedStyle(marker).opacity : null
    };
  });
  console.log('  Hit marker opacity during hit:', hitMarkerCheck.opacity);
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(300);

  // High-Res 1920x1080 Full Verification Screenshot
  console.log('\n[Bow Fix Suite] Capturing 1920x1080 full verification screenshot...');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(400);

  // Enter aim mode on 1920x1080
  const box1080 = await page.locator('#canvas-container canvas').boundingBox();
  await page.mouse.move(box1080.x + box1080.width / 2, box1080.y + box1080.height / 2);
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bow_full_verification_1920x1080.png` });
  await page.mouse.up({ button: 'right' });

  await browser.close();

  // Print final summary report
  console.log('\n======================================================');
  console.log('             BOW FIX PASS TEST RESULTS                ');
  console.log('======================================================');
  console.log(`8m Standing Grunt Accuracy: ${hits8m}/10 hits (${hits8m * 10}%)`);
  for (const [k, v] of Object.entries(rangeResults)) {
    console.log(`Range ${k} Accuracy: ${v}`);
  }
  console.log(`Aim Mode persists during shot: ${afterShotState.cameraMode === 'aim' && afterShotState.isBowAiming}`);
  console.log(`Rapid follow-up re-draw: ${afterShotState.isRapidFollowUp}`);
  console.log(`Slow strafe in aim mode: ${strafeMoved}`);
  console.log(`Name tag clamping (hero + 3 enemies): ${tagStats.totalVisibleTags <= 4}`);
  console.log('======================================================\n');
}

run().catch(err => {
  console.error('[Bow Fix Suite Error]', err);
  process.exit(1);
});
