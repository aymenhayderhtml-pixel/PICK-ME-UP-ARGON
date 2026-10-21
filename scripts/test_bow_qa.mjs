// scripts/test_bow_qa.mjs
// Playwright Visual QA and Automated Validation for Bow Archery Engine (Slice 1-5)

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/lib/chatgpt/resources/cua_node/lib/node_modules/playwright-core');

const CHROME_PATH = '/home/aymen/.agent-browser/browsers/chrome-155.0.8059.84/chrome';

async function run() {
  console.log('[QA] Launching Playwright browser...');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 }
  });

  // ---------------------------------------------------------------------------
  // PART 1: art-weapon-test.html Visual Checks
  // ---------------------------------------------------------------------------
  console.log('[QA] Opening art-weapon-test.html...');
  await page.goto('http://localhost:5173/art-weapon-test.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Select Bow and Grade C and Show on Hero (Han)
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const heroBtn = btns.find(b => b.textContent.includes('Show on Hero'));
    if (heroBtn && heroBtn.textContent.includes('OFF')) {
      heroBtn.click();
    }
    const bowBtn = btns.find(b => b.textContent.trim().toLowerCase() === 'bow');
    if (bowBtn) bowBtn.click();
    const cGradeBtn = btns.find(b => b.textContent.trim().toUpperCase() === 'C');
    if (cGradeBtn) cGradeBtn.click();
  });
  await page.waitForTimeout(500);

  // 1. Idle Stance
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const idleBtn = btns.find(b => b.textContent.trim().toLowerCase() === 'idle');
    if (idleBtn) idleBtn.click();
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screenshots_bow_qa/qa_01_art_bow_idle.png' });
  console.log('[QA] Saved qa_01_art_bow_idle.png');

  // 2. Aim Ready Stance
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const readyBtn = btns.find(b => b.textContent.trim().toLowerCase() === 'aim ready');
    if (readyBtn) readyBtn.click();
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screenshots_bow_qa/qa_02_art_aim_ready.png' });
  console.log('[QA] Saved qa_02_art_aim_ready.png');

  // 3. Full Draw Stance
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const fullDrawBtn = btns.find(b => b.textContent.trim().toLowerCase() === 'full draw');
    if (fullDrawBtn) fullDrawBtn.click();
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screenshots_bow_qa/qa_03_art_full_draw.png' });
  console.log('[QA] Saved qa_03_art_full_draw.png');

  // 4. Aim Mode Cam Toggle in Preview
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const aimCamBtn = btns.find(b => b.textContent.includes('Aim Cam'));
    if (aimCamBtn) aimCamBtn.click();
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screenshots_bow_qa/qa_04_art_aim_cam.png' });
  console.log('[QA] Saved qa_04_art_aim_cam.png');

  // 5. Fire Test Arrow & Ballistics in Preview
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const fireBtn = btns.find(b => b.textContent.includes('Fire Test Arrow'));
    if (fireBtn) fireBtn.click();
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: 'docs/screenshots_bow_qa/qa_05_art_arrow_flight.png' });
  console.log('[QA] Saved qa_05_art_arrow_flight.png');

  await page.waitForTimeout(900);
  await page.screenshot({ path: 'docs/screenshots_bow_qa/qa_06_art_arrow_embedded.png' });
  console.log('[QA] Saved qa_06_art_arrow_embedded.png');

  // ---------------------------------------------------------------------------
  // PART 2: Live Combat & Gameplay in index.html
  // ---------------------------------------------------------------------------
  console.log('[QA] Opening live game at index.html...');
  await page.goto('http://localhost:5173/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Switch to Tower Scene & Equip Bow
  const setupResult = await page.evaluate(async () => {
    if (!window.sceneManager) return { error: 'No sceneManager' };
    window.sceneManager.switchTo('tower');
    await new Promise(r => setTimeout(r, 600));

    const tower = window.towerScene;
    if (!tower || !tower.player) return { error: 'No towerScene player' };

    // Equip Hunting Bow (C-Grade)
    tower.player.weapon = {
      id: 'hunting_bow',
      name: 'Hunting Recurve Bow',
      slot: 'weapon',
      weaponType: 'bow',
      kind: 'bow',
      grade: 'C',
      durability: 60,
      maxDurability: 60,
      damageMult: 1.3,
      blockMult: 0,
      attackSpeedMult: 1.0,
    };
    tower.player.shield = null;
    tower.player.rebuildWeaponMesh();

    return {
      equipped: tower.player.weapon.name,
      weaponKind: tower.player.rig?.weaponMapped?.kind,
      hasArrowPool: Boolean(tower.player.arrowPool)
    };
  });
  console.log('[QA] Setup result:', setupResult);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'docs/screenshots_bow_qa/qa_07_live_bow_equipped.png' });
  console.log('[QA] Saved qa_07_live_bow_equipped.png');

  // 6. Enter Aim Mode (Hold KeyV / RMB)
  console.log('[QA] Entering Aim Mode...');
  await page.keyboard.down('KeyV');
  await page.waitForTimeout(200);

  const aimState1 = await page.evaluate(() => {
    const p = window.towerScene?.player;
    const cam = window.towerScene?.thirdPersonCamera;
    const hud = window.towerScene?.hud;
    return {
      isAiming: p?.isAiming,
      drawAmount: p?.drawAmount,
      camIsAiming: cam?.isAiming,
      camDistance: cam?.distance,
      reticleVisible: hud?.reticle?.style.display !== 'none',
      reticleWidth: hud?.reticleCircle?.style.width
    };
  });
  console.log('[QA] Aim state at 0.2s:', aimState1);
  await page.screenshot({ path: 'docs/screenshots_bow_qa/qa_08_live_aim_drawing.png' });
  console.log('[QA] Saved qa_08_live_aim_drawing.png');

  // Full Draw State
  await page.waitForTimeout(450);
  const aimState2 = await page.evaluate(() => {
    const p = window.towerScene?.player;
    const hud = window.towerScene?.hud;
    return {
      isAiming: p?.isAiming,
      drawAmount: p?.drawAmount,
      reticleWidth: hud?.reticleCircle?.style.width,
      reticleBorderColor: hud?.reticleCircle?.style.borderColor
    };
  });
  console.log('[QA] Full draw state at 0.65s:', aimState2);
  await page.screenshot({ path: 'docs/screenshots_bow_qa/qa_09_live_full_draw_golden.png' });
  console.log('[QA] Saved qa_09_live_full_draw_golden.png');

  // 7. Strafing while Aiming
  console.log('[QA] Strafing while aiming...');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/screenshots_bow_qa/qa_10_live_aim_strafing.png' });
  console.log('[QA] Saved qa_10_live_aim_strafing.png');
  await page.keyboard.up('KeyD');

  // 8. Release Arrow from Aim Mode
  console.log('[QA] Releasing aimed shot...');
  await page.keyboard.up('KeyV');
  await page.waitForTimeout(80);
  await page.screenshot({ path: 'docs/screenshots_bow_qa/qa_11_live_aim_release.png' });
  console.log('[QA] Saved qa_11_live_aim_release.png');

  await page.waitForTimeout(500);

  // 9. Soft Auto-Aim Hipfire Snapshot (Tap LMB / KeyF without aiming)
  console.log('[QA] Testing Soft Auto-Aim Hipfire Snapshot...');
  const hipfireResult = await page.evaluate(() => {
    const tower = window.towerScene;
    if (!tower) return { error: 'No tower' };
    const p = tower.player;
    const enemies = tower.enemyManager?.enemies || [];

    // Trigger hipfire snapshot
    p.triggerHipfireSnapshot(enemies, tower.thirdPersonCamera, (dmg, pos, crit) => {
      tower.hud.showDamageNumber(dmg, pos, crit);
    });

    return {
      snapshotTimer: p.snapshotTimer,
      pendingShot: p.pendingSnapshotShot,
      enemyCount: enemies.length
    };
  });
  console.log('[QA] Hipfire trigger result:', hipfireResult);

  // Wait for snapshot release delay (0.10s) and capture arrow in flight
  await page.waitForTimeout(140);
  await page.screenshot({ path: 'docs/screenshots_bow_qa/qa_12_live_hipfire_snapshot.png' });
  console.log('[QA] Saved qa_12_live_hipfire_snapshot.png');

  await page.waitForTimeout(600);
  await page.screenshot({ path: 'docs/screenshots_bow_qa/qa_13_live_arrow_impact.png' });
  console.log('[QA] Saved qa_13_live_arrow_impact.png');

  await browser.close();
  console.log('[QA] All tests and screenshots completed successfully!');
}

run().catch(err => {
  console.error('[QA] Test runner failed:', err);
  process.exit(1);
});
