// scripts/diagnose_weapons.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/lib/chatgpt/resources/cua_node/lib/node_modules/playwright-core');

const CHROME_PATH = '/home/aymen/.agent-browser/browsers/chrome-155.0.8059.84/chrome';

async function diagnose() {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:5173/combat-test.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const diag = await page.evaluate(() => {
    const sb = window.__combatSandbox;
    const hero = sb.hero;
    const rig = hero.rig;
    const model = rig.model;
    const handR = model.parts.handR;
    const socketR = model.sockets.handR;
    const weaponModel = rig.weaponModel;

    // Force matrices update
    rig.group.updateMatrixWorld(true);

    function getWorldPos(obj) {
      if (!obj) return null;
      obj.updateMatrixWorld(true);
      const e = obj.matrixWorld.elements;
      return { x: e[12], y: e[13], z: e[14] };
    }

    return {
      heroPos: { x: hero.position.x, y: hero.position.y, z: hero.position.z },
      groupPos: { x: rig.group.position.x, y: rig.group.position.y, z: rig.group.position.z },
      handRLocalPos: { x: handR.position.x, y: handR.position.y, z: handR.position.z },
      handRLocalRot: [handR.rotation.x, handR.rotation.y, handR.rotation.z],
      socketRLocalPos: { x: socketR.position.x, y: socketR.position.y, z: socketR.position.z },
      handRWorld: getWorldPos(handR),
      socketRWorld: getWorldPos(socketR),
      weaponWorld: getWorldPos(weaponModel?.group),
      elbowRWorld: getWorldPos(model.parts.elbowR),
      shoulderRWorld: getWorldPos(model.parts.shoulderR),
      weaponParentIsSocket: weaponModel ? weaponModel.group.parent === socketR : false,
      socketParentIsHand: socketR.parent === handR,
      handRParentIsElbow: handR.parent === model.parts.elbowR,
      capsuleHeight: hero.capsuleHeight,
      capsuleRadius: hero.capsuleRadius,
      capsuleBase: hero.capsuleBase
    };
  });

  console.log('DIAGNOSTICS:', JSON.stringify(diag, null, 2));
  await browser.close();
  process.exit(0);
}

diagnose().catch(err => {
  console.error(err);
  process.exit(1);
});
