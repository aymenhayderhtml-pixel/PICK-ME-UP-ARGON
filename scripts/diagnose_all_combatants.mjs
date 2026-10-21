// scripts/diagnose_all_combatants.mjs
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
  await page.waitForTimeout(600);

  const data = await page.evaluate(() => {
    const sb = window.__combatSandbox;
    return sb.combatants.map(c => {
      const rig = c.rig;
      const model = rig?.model;
      const handR = model?.parts?.handR;
      const socketR = model?.sockets?.handR;
      const socketL = model?.sockets?.handL;
      const weaponModel = rig?.weaponModel;

      function getPos(obj) {
        if (!obj) return null;
        obj.updateMatrixWorld(true);
        const e = obj.matrixWorld.elements;
        return [parseFloat(e[12].toFixed(3)), parseFloat(e[13].toFixed(3)), parseFloat(e[14].toFixed(3))];
      }

      return {
        id: c.id,
        name: c.name,
        roleTag: c.roleTag,
        weaponKind: c.weapon.kind,
        rigWeaponKind: rig?.weaponKind,
        rigWeaponMappedKind: rig?.weaponMapped?.kind,
        pos: [parseFloat(c.position.x.toFixed(3)), parseFloat(c.position.y.toFixed(3)), parseFloat(c.position.z.toFixed(3))],
        handRWorld: getPos(handR),
        socketRWorld: getPos(socketR),
        weaponWorld: getPos(weaponModel?.group),
        weaponParent: weaponModel?.group?.parent?.name || (weaponModel?.group?.parent === socketR ? 'sockets.handR' : weaponModel?.group?.parent === socketL ? 'sockets.handL' : 'unknown')
      };
    });
  });

  console.log('ALL COMBATANTS:\n', JSON.stringify(data, null, 2));
  await browser.close();
  process.exit(0);
}

diagnose().catch(err => {
  console.error(err);
  process.exit(1);
});
