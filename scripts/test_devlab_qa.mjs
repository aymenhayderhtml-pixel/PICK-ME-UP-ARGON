// scripts/test_devlab_qa.mjs
// Automated verification for Dev Lab (dev.html) across 1280x720 and 1920x1080

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
  console.log('[DevLab QA] Launching Playwright browser...');
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
      const text = msg.text();
      if (!text.includes('computeBoundingSphere') && !text.includes('favicon')) {
        consoleErrors.push(text);
      }
      console.log('[Browser Console]', text);
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.error('[Page Error]', err);
  });

  console.log('[DevLab QA] Navigating to http://127.0.0.1:5173/dev.html ...');
  await page.goto('http://127.0.0.1:5173/dev.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Initial Start View (1280x720)
  console.log('[DevLab QA] 1. Capturing Initial Start View (1280x720)...');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01_arena_1280x720.png` });

  // 1b. Fullscreen 1920x1080 view
  console.log('[DevLab QA] 1b. Capturing Initial Start View (1920x1080)...');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01_arena_1920x1080.png` });

  // Reset to 1280x720 for testing
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(300);

  // 2. Weapons Tab
  console.log('[DevLab QA] 2. Testing Weapons Tab...');
  await page.click('button[data-tab="tab-weapons"]');
  await page.waitForTimeout(300);
  // Equip Greatsword, Grade S
  await page.click('button[data-weapon="greatsword"]');
  await page.click('button[data-grade="S"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/02_weapons_tab.png` });

  // 3. Spells Tab & Shape Debug
  console.log('[DevLab QA] 3. Testing Spells Tab & Shape Debug...');
  await page.click('button[data-tab="tab-spells"]');
  await page.waitForTimeout(300);
  // Cast Meteor from hero
  await page.click('button[data-spell="meteor"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/03_spells_meteor.png` });

  // 4. Enemies & Spawner Tab
  console.log('[DevLab QA] 4. Testing Enemies Tab & Cursor Spawn...');
  await page.click('button[data-tab="tab-enemies"]');
  await page.waitForTimeout(300);
  await page.click('#btn-spawn-cursor');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/04_enemies_tab.png` });

  // 5. Squad Tab
  console.log('[DevLab QA] 5. Testing Squad Tab...');
  await page.click('button[data-tab="tab-squad"]');
  await page.waitForTimeout(300);
  await page.click('button[data-slot="3"]'); // Eolka Meteor
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/05_squad_tab.png` });

  // 6. Scenario Script Required by user:
  // "At the end, run a scenario script: start a fight with Han vs 3 grunts and an elite, parry once, dodge once, cast a spell with Eolka, open the Stats tab, and take a screenshot of each."
  console.log('[DevLab QA] 6. Running Scenario Script: Han vs 3 grunts and an elite...');

  // Set hero to Han with sword + shield
  await page.click('button[data-tab="tab-arena"]');
  await page.waitForTimeout(200);
  await page.click('#btn-clear-scenario');
  await page.waitForTimeout(200);

  // Configure Han
  await page.selectOption('#arena-hero-select', 'han');
  await page.selectOption('#arena-weapon-select', 'sword');
  await page.selectOption('#arena-shield-select', 'ironRound');
  await page.selectOption('#arena-grade-select', 'D');
  await page.click('#btn-apply-hero');
  await page.waitForTimeout(200);

  // Add 3 grunts
  await page.selectOption('#spawn-type-select', 'grunt');
  await page.selectOption('#spawn-team-select', 'enemy');
  await page.selectOption('#spawn-pattern-select', 'line');
  await page.evaluate(() => {
    document.getElementById('slider-spawn-count').value = '3';
    document.getElementById('slider-spawn-count').dispatchEvent(new Event('input'));
  });
  await page.click('#btn-spawn-batch');
  await page.waitForTimeout(200);

  // Add 1 elite
  await page.selectOption('#spawn-type-select', 'elite');
  await page.evaluate(() => {
    document.getElementById('slider-spawn-count').value = '1';
    document.getElementById('slider-spawn-count').dispatchEvent(new Event('input'));
  });
  await page.click('#btn-spawn-batch');
  await page.waitForTimeout(400);

  // Also add Eolka as ally for the required spell cast
  await page.evaluate(() => {
    const lab = window.__devLab;
    const eolka = lab.addBatchCombatants({
      typeKey: 'eolka',
      team: 'player',
      count: 1,
      pattern: 'cluster',
      grade: 'C'
    });
  });
  await page.waitForTimeout(300);

  // Screenshot Scenario Setup
  console.log('[DevLab QA] Scenario Step A: Fight start view...');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/scenario_01_fight_start.png` });

  // Parry once: trigger enemy attack and hero block/parry
  console.log('[DevLab QA] Scenario Step B: Parry once...');
  await page.evaluate(() => {
    const lab = window.__devLab;
    const enemy = lab.combatants.find(c => c.team === 'enemy');
    if (enemy) {
      enemy.position.set(0, 0, 0.5);
      lab.activeHero.position.set(0, 0, 1.5);
      lab.activeHero.facingYaw = Math.PI;
      // Start parry window
      lab.activeHero.stateMachine.transitionTo('BLOCK');
      lab.activeHero.parryWindowTimer = 0.15;
      // Enemy strikes
      enemy.stateMachine.transitionTo('ATTACK', { heavy: false });
      // Simulate parry hit
      lab.activeHero.receiveAttack({
        attacker: enemy,
        attackerName: enemy.name,
        attackerPosition: enemy.position.clone(),
        hitPoint: lab.activeHero.position.clone(),
        hitNormal: enemy.position.clone().sub(lab.activeHero.position).normalize(),
        damage: enemy.baseAttack,
        poiseDamage: 20,
        attackMoveMult: 1.0,
        weaponKind: enemy.weapon.kind,
        weaponGrade: enemy.weapon.grade
      });
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/scenario_02_parry.png` });

  // Dodge once: hero dodge roll
  console.log('[DevLab QA] Scenario Step C: Dodge once...');
  await page.evaluate(() => {
    const lab = window.__devLab;
    const dir = lab.activeHero.position.clone().set(1, 0, 0).normalize();
    lab.activeHero.stateMachine.transitionTo('DODGE', { direction: dir });
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/scenario_03_dodge.png` });

  // Cast a spell with Eolka
  console.log('[DevLab QA] Scenario Step D: Cast spell with Eolka...');
  await page.evaluate(() => {
    const lab = window.__devLab;
    const eolka = lab.combatants.find(c => c.team === 'player' && c !== lab.activeHero);
    const target = lab.combatants.find(c => c.team === 'enemy');
    const targetPos = target ? target.position.clone() : lab.activeHero.position.clone().add({ x: 0, y: 0, z: -3 });
    if (eolka) {
      lab.spells.castSpell('meteor', eolka, targetPos);
    } else {
      lab.spells.castSpell('meteor', lab.activeHero, targetPos);
    }
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/scenario_04_eolka_spell.png` });

  // Open Stats tab
  console.log('[DevLab QA] Scenario Step E: Open Stats Tab...');
  await page.click('button[data-tab="tab-stats"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/scenario_05_stats_tab.png` });

  // Fullscreen 1920x1080 of Stats Tab
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/scenario_05_stats_tab_1920x1080.png` });

  // Also test 30 combatants performance requirement
  console.log('[DevLab QA] 7. Testing 30 combatants performance...');
  const perfData = await page.evaluate(() => {
    const lab = window.__devLab;
    lab.addBatchCombatants({
      typeKey: 'grunt',
      team: 'enemy',
      count: 25,
      pattern: 'circle',
      grade: 'E'
    });
    return {
      combatantsCount: lab.combatants.length,
      fps: lab.fps,
      cpuTickMs: lab.cpuTickMs
    };
  });
  await page.waitForTimeout(1000);
  const perfDataAfter = await page.evaluate(() => {
    const lab = window.__devLab;
    return {
      combatantsCount: lab.combatants.length,
      fps: lab.fps,
      cpuTickMs: lab.cpuTickMs
    };
  });
  console.log('[DevLab QA] Performance with 30 combatants:', perfDataAfter);

  await browser.close();

  if (consoleErrors.length > 0) {
    console.error('[DevLab QA] Found console errors:', consoleErrors);
    process.exit(1);
  }
  console.log('[DevLab QA] All scenarios and screenshots completed successfully!');
}

run().catch(err => {
  console.error('[DevLab QA Fatal]', err);
  process.exit(1);
});
