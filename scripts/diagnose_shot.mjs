// scripts/diagnose_shot.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/lib/chatgpt/resources/cua_node/lib/node_modules/playwright-core');

const CHROME_PATH = '/home/aymen/.agent-browser/browsers/chrome-155.0.8059.84/chrome';

async function run() {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://127.0.0.1:5173/dev.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const diag = await page.evaluate(async () => {
    const lab = window.__devLab;
    lab.clearEnemies();
    lab.activeHero.position.set(0, 0, 0);
    lab.activeHero.facingYaw = 0;
    lab.weapons.setWeapon('bow');
    lab.weapons.setGrade('C');
    lab.activeHero.arrows = 50;

    const grunt = lab.spawnEnemyAt('grunt', 0, -8.0);

    // Enter aim mode
    lab.arena.setAimMode(true, lab.activeHero);
    lab.weapons.startAim();
    // Wait for camera and hero to update over 400ms
    for (let f = 0; f < 30; f++) {
      lab.arena.update(lab.activeHero, 0.016);
      lab.weapons.update(0.016, lab.groundAimPoint, lab.combatants);
    }

    const aimPt = lab.arena.getScreenAimPoint(undefined, lab.combatants, lab.activeHero);
    const startPos = new THREE.Vector3();
    lab.activeHero.rig.getWeaponTipWorldPosition(startPos);

    // Fire arrow
    lab.weapons.fireBowAimed(aimPt, true);
    const arrow = lab.weapons.arrowPool.arrows.find(a => a.active);

    const logFrames = [];
    for (let step = 0; step < 40; step++) {
      const prevPos = arrow.position.clone();
      lab.weapons.arrowPool.update(0.016, {
        combatants: lab.combatants,
        shooter: lab.activeHero,
        onHit: (t, p) => logFrames.push({ event: 'onHit', point: { x: p.x, y: p.y, z: p.z } })
      });

      const distToGrunt = Math.hypot(arrow.position.x - grunt.position.x, arrow.position.z - grunt.position.z);
      logFrames.push({
        step,
        arrowPos: { x: +arrow.position.x.toFixed(3), y: +arrow.position.y.toFixed(3), z: +arrow.position.z.toFixed(3) },
        arrowVel: { x: +arrow.velocity.x.toFixed(3), y: +arrow.velocity.y.toFixed(3), z: +arrow.velocity.z.toFixed(3) },
        distXZToGrunt: +distToGrunt.toFixed(3),
        stuck: arrow.stuck
      });
      if (arrow.stuck) break;
    }

    return {
      heroPos: lab.activeHero.position,
      heroYaw: lab.activeHero.facingYaw,
      camPos: lab.arena.camera.position,
      camFov: lab.arena.camera.fov,
      aimYaw: lab.arena.aimYaw,
      aimPitch: lab.arena.aimPitch,
      aimPt,
      startPos,
      gruntPos: grunt.position,
      gruntHeight: grunt.capsuleHeight,
      gruntRadius: grunt.capsuleRadius,
      logFrames: logFrames.slice(0, 30)
    };
  });

  console.log('Diagnostic result:\n', JSON.stringify(diag, null, 2));
  await browser.close();
}

run().catch(console.error);
