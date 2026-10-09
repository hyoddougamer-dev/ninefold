/**
 * 鑰 The Realm Key's button on the secret realm door, shot off the real game: the door shut
 * after a walk, two keys held, and the line saying what the spring opens with.
 *
 *     npm run build && npx vite preview &
 *     node tools/shot-key.mjs <dir>
 *
 * A fabricated save, planted with the scripts blocked. Taken at 400 and at 320 wide, and the
 * script checks the button is there, says minutes, and does not hang off the screen.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium';
const dir = process.argv[2] ?? 'shots-key';
mkdirSync(dir, { recursive: true });
const SEEN = ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage', 'fuse', 'whom', 'cave', 'secret'];

function save() {
  const at = Math.floor(Date.now() / 1000);
  return {
    v: 1, at, startedAt: at - 20 * 86400,
    realm: 3, layer: 4, qi: 5e4, materials: 1e4, wardenFell: false,
    levels: { technique: 20, method: 20, pills: 20, cores: 10 },
    killed: { rat: 40, hound: 30, frog: 20, serpent: 20, mantis: 15 },
    worn: {}, chest: [], unlocked: [], self: 'woman', stance: 'swift', sequence: [],
    tribulation: 0, tribulationAt: 0, tower: 0, brewed: { body: 0, bane: 0, fortune: 0 }, awakened: ['feast', 'wolf', 'slaughter', 'platform'],
    met: [], metAt: 0, metPoints: 0, beds: [{ herb: null, at: 0 }, { herb: null, at: 0 }, { herb: null, at: 0 }], reaped: 0,
    runStep: -1, runAt: at - 600, runs: 4, quarryWeek: -1, seen: SEEN,
    spring: 1200, springAt: at - 600,
    crafts: { xp: { forge: 60000, vein: 20000, herb: 20000 }, since: at - 5, task: null, pouch: { 'forge:realmkey': 2, realmkey: 2 }, made: {}, tools: {}, arrays: [], carry: { elixir: null, sigil: null }, seek: 0 },
    lives: [],
  };
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
let failures = 0;
for (const width of [400, 320]) {
  const page = await browser.newPage({ viewport: { width, height: 860 }, deviceScaleFactor: 2 });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, s]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); localStorage.setItem('ninefold.save.backup', JSON.stringify(s)); }, ['ninefold.save.v1', save()]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(900);
  await page.waitForTimeout(1200);
  for (let i = 0; i < 8; i++) { const b = await page.$('.back button, .notice button, .awaken .later, .awaken button'); if (!b) break; try { await b.click({ timeout: 1500 }); } catch { break; } await page.waitForTimeout(400); }
  await page.locator('nav.tabs button', { hasText: /hunt/i }).first().click();
  await page.waitForTimeout(500);
  const key = page.locator('.doorkey');
  const n = await key.count();
  if (!n) { failures++; console.log('  ✗ no key button'); }
  else {
    await key.first().scrollIntoViewIfNeeded();
    const text = await key.first().innerText();
    if (!/min/.test(text)) { failures++; console.log(`  ✗ no minutes in: ${text}`); }
    const over = await page.evaluate(() => { const w = document.documentElement.clientWidth; const r = document.querySelector('.doorkey').getBoundingClientRect(); return r.right > w + 0.5 || r.left < -0.5; });
    if (over) { failures++; console.log('  ✗ off the side'); }
    console.log(width, text.replace(/\s+/g, ' '));
  }
  await page.screenshot({ path: `${dir}/key-${width}.png` });
  await page.close();
}
await browser.close();
process.exit(failures ? 1 : 0);
