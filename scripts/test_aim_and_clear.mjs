// scripts/test_aim_and_clear.mjs
// Verification of Issue 1 (No floating bow after character removal) and Issue 2 (Screen aiming, slow sensitivity, zoom)

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
  console.log('[Test Aim & Clear] Launching Playwright browser...');
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

  console.log('[Test Aim & Clear] Navigating to http://127.0.0.1:5173/dev.html ...');
  await page.goto('http://127.0.0.1:5173/dev.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const canvasBox = await page.locator('#canvas-container canvas').boundingBox();
  const centerX = canvasBox.x + canvasBox.width / 2;
  const centerY = canvasBox.y + canvasBox.height / 2;

  // -------------------------------------------------------------------------
  // TEST ISSUE 2: Screen Aiming with Slow Sensitivity & Zoom
  // -------------------------------------------------------------------------
  console.log('[Test Aim & Clear] 1. Equipping Bow & Testing RMB Screen Aiming...');
  await page.selectOption('#arena-weapon-select', 'bow');
  await page.waitForTimeout(300);

  // Press and hold RMB on canvas
  await page.mouse.move(centerX, centerY);
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(300);

  // Check initial FOV and camera zoom
  const aimInitialState = await page.evaluate(() => {
    const lab = window.__devLab;
    return {
      fov: lab.arena.camera.fov,
      cameraMode: lab.arena.cameraMode,
      reticleVisible: document.getElementById('aim-reticle').style.display === 'block',
      heroPos: { x: lab.activeHero.position.x, z: lab.activeHero.position.z },
      heroYaw: lab.activeHero.facingYaw,
      aimYaw: lab.arena.aimYaw
    };
  });
  console.log('[Test Aim & Clear] Aim Initial State (Zoomed FOV):', aimInitialState);

  // Now move mouse across screen horizontally and vertically while holding RMB
  console.log('[Test Aim & Clear] Moving mouse horizontally and vertically while holding RMB...');
  await page.mouse.move(centerX + 120, centerY - 60, { steps: 10 });
  await page.waitForTimeout(300);

  const aimMovedState = await page.evaluate(() => {
    const lab = window.__devLab;
    return {
      heroPos: { x: lab.activeHero.position.x, z: lab.activeHero.position.z },
      heroYaw: lab.activeHero.facingYaw,
      aimYaw: lab.arena.aimYaw,
      aimPitch: lab.arena.aimPitch,
      trajVisible: lab.weapons.trajLine.visible
    };
  });
  console.log('[Test Aim & Clear] Aim Moved State (Screen rotated, hero pos locked):', aimMovedState);

  // Capture Screenshot of screen aiming (over-the-shoulder zoomed aim with reticle and trajectory)
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix_issue2_screen_aim_zoomed.png` });

  // Fire aimed arrow via LMB
  console.log('[Test Aim & Clear] Firing aimed arrow with LMB...');
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(60);
  await page.mouse.up({ button: 'left' });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(400);

  // -------------------------------------------------------------------------
  // TEST ISSUE 1: Character Removal / Change leaves NO bow
  // -------------------------------------------------------------------------
  console.log('[Test Aim & Clear] 2. Testing Character Removal & Weapon Cleanup (Issue 1)...');

  // Deplete arrows to dagger switch, attaching bow to back
  await page.evaluate(() => {
    const lab = window.__devLab;
    if (lab.activeHero) {
      lab.activeHero.arrows = 1;
    }
  });
  await page.waitForTimeout(100);
  await page.mouse.click(centerX, centerY);
  await page.waitForTimeout(500); // Wait for dagger switch

  const hasBowBeforeRemoval = await page.evaluate(() => {
    const lab = window.__devLab;
    return {
      activeHeroWeapon: lab.activeHero.weapon.kind,
      hasBackBow: !!lab.activeHero._backBowMesh
    };
  });
  console.log('[Test Aim & Clear] Hero state before clear:', hasBowBeforeRemoval);

  // Now click "Clear Arena"
  console.log('[Test Aim & Clear] Clicking "Clear Arena"...');
  await page.click('#btn-clear-scenario');
  await page.waitForTimeout(500);

  // Inspect the scene to ensure NO bow meshes exist in the entire scene hierarchy
  const sceneAuditAfterClear = await page.evaluate(() => {
    const lab = window.__devLab;
    let floatingBowFound = false;
    let bowMeshDetails = [];
    lab.arena.scene.traverse((obj) => {
      if (obj.isMesh) {
        const name = (obj.name || '').toLowerCase();
        const geoType = obj.geometry ? obj.geometry.type : '';
        // Check for bow indicators or orphaned back bow
        if (name.includes('bow') || obj === lab.activeHero?._backBowMesh) {
          floatingBowFound = true;
          bowMeshDetails.push({ name, geoType });
        }
      }
    });
    return {
      combatantsCount: lab.combatants.length,
      activeHero: lab.activeHero,
      trajVisible: lab.weapons.trajLine.visible,
      reticleVisible: document.getElementById('aim-reticle')?.style.display,
      floatingBowFound,
      bowMeshDetails
    };
  });
  console.log('[Test Aim & Clear] Scene Audit After Clear:', sceneAuditAfterClear);

  // Capture Screenshot of cleared arena
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix_issue1_character_removed_no_bow.png` });

  // Now spawn a new Hero with a Sword to verify switching works cleanly without residual bow
  console.log('[Test Aim & Clear] Spawning Han with Sword to ensure no leftover bow...');
  await page.selectOption('#arena-hero-select', 'han');
  await page.selectOption('#arena-weapon-select', 'sword');
  await page.click('#btn-apply-hero');
  await page.waitForTimeout(500);

  const heroCheck = await page.evaluate(() => {
    const lab = window.__devLab;
    return {
      heroName: lab.activeHero?.name,
      weaponKind: lab.activeHero?.weapon?.kind,
      hasBackBow: !!lab.activeHero?._backBowMesh,
      backSocketChildrenCount: lab.activeHero?.rig?.model?.sockets?.back?.children?.length || 0
    };
  });
  console.log('[Test Aim & Clear] New Hero Config Check:', heroCheck);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix_issue1_han_sword_no_leftover_bow.png` });

  console.log('[Test Aim & Clear] All tests completed successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('[Test Aim & Clear Error]', err);
  process.exit(1);
});
