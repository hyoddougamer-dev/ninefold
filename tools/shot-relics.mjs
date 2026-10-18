/**
 * 神器 鬥關 The relics and the gates as effort, shot off the real game (2026-10-18): the hunt
 * with the relic band shut and open and the elite's shard tag, the gate card at a sealed
 * gate with wins already struck against it, and the verdict of a warden's first fall, which
 * leaves the first shard. Run against the build before them as well, for the before half.
 *
 *     python3 -m http.server 4430 -d <dist> &
 *     SMOKE_URL=http://localhost:4430/ SHOT_WIDTH=320 node tools/shot-relics.mjs <dir>
 *
 * 免 Planted as tools/shot-seal.mjs plants: scripts blocked, both keys written, the page's
 * clock pinned to the save. Every save is stamped season 's0' with 'whom' in seen.
 */
import { chromium } from '/home/user/ninefold/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4430/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const dir = process.argv[2] ?? 'shots-relics';
const WIDTH = Number(process.env.SHOT_WIDTH ?? 400);
mkdirSync(dir, { recursive: true });

const NOW = Date.UTC(2026, 9, 28, 12) / 1000;
const WARDENS = ['fox', 'ape', 'crane', 'tiger', 'turtle', 'golem', 'direwolf', 'jiao'];
const COMMONS = { 1: ['rat', 'hound', 'frog'], 2: ['serpent', 'mantis', 'bat'], 3: ['beetle', 'owl', 'raven'],
  4: ['boar', 'wolf', 'vulture'], 5: ['crab', 'jellyfish', 'lizard'], 6: ['centipede', 'scorpion', 'worm'],
  7: ['ogre', 'goblin', 'wraith'] };

/** A cultivator at the gate of `realm`, the warden out `hours` ago. */
function cultivator(realm, hours, extra = {}) {
  const at = NOW - 30;
  const cap = realm * 6;
  const killed = {};
  for (let r = 1; r <= realm; r++) for (const k of COMMONS[r] ?? []) killed[k] = 60 + r * 40;
  killed.frog = 2400; killed.bat = 1300; killed.raven = 900; killed.vulture = 140; killed.lizard = 60;
  WARDENS.slice(0, realm - 1).forEach((k) => { killed[k] = 1; });
  return {
    v: 1, season: 's0', at, startedAt: at - 30 * 86400, realm, layer: 8, gateAt: at - hours * 3600,
    qi: 10 ** (realm + 2), materials: 2.4e7, wardenFell: false, sealPaid: 0, sealFed: 0,
    levels: { technique: cap, method: cap, pills: cap, cores: Math.max(0, cap - 6) }, killed,
    worn: { weapon: { id: 'w', template: `sword${realm}`, rarity: 'earth', rolls: [{ affix: 'power', value: 22 }] } },
    chest: [], self: 'woman', stance: 'swift', sequence: ['crane', 'tiger'], tribulation: 0, tribulationAt: 0,
    tower: 40, brewed: { body: 24, bane: 18, fortune: 6 }, quarryWeek: 99999,
    awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew'].slice(0, [0, 0, 2, 2, 4, 4, 6, 6, 8, 8][realm]),
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones',
           'bestiary', 'salvage', 'fuse', 'whom', 'cave', 'secret', 'crafts', 'seal', 'relics'],
    relics: { shards: [0, 3, 2, 1, 1, 0, 0, 0, 0], made: [1] },
    ...extra,
  };
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
let page = null;

const clear = async () => {
  for (let i = 0; i < 8; i++) {
    const b = await page.$('.notice button, .awaken button, .back button');
    if (!b) break;
    try { await b.click({ timeout: 1200 }); } catch { break; }
    await page.waitForTimeout(220);
  }
};
const tab = async (han) => {
  await clear();
  for (const t of await page.$$('nav.tabs button')) {
    if ((await t.textContent())?.includes(han)) { await t.click(); break; }
  }
  await page.waitForTimeout(500);
  await clear();
};
const plant = async (save) => {
  if (page) await page.close();
  page = await browser.newPage({ viewport: { width: WIDTH, height: 1100 }, deviceScaleFactor: 2 });
  await page.clock.install({ time: NOW * 1000 });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, b, s]) => {
    localStorage.clear();
    localStorage.setItem(k, JSON.stringify(s));
    localStorage.setItem(b, JSON.stringify(s));
  }, [SAVE_KEY, BACKUP_KEY, save]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(700);
  await clear();
};

let shots = 0;
const wideCheck = async (name) => {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth);
  if (wide > WIDTH + 1) throw new Error(`神器 ${name}: the page is ${wide}px wide at ${WIDTH}`);
};
const shot = async (name, selector) => {
  const el = selector ? await page.$(selector) : null;
  if (selector && !el) { console.log(`(nothing at ${selector} for ${name})`); return; }
  if (el) await el.scrollIntoViewIfNeeded();
  const path = `${dir}/${name}.png`;
  if (el) await el.screenshot({ path }); else await page.screenshot({ path, fullPage: false });
  await wideCheck(name);
  console.log(path);
  shots++;
};
/** From one element's top down `height` pixels of the page, scrolled to it. */
const from = async (name, selector, height) => {
  const el = await page.$(selector);
  if (!el) { console.log(`(nothing at ${selector} for ${name})`); return; }
  await page.setViewportSize({ width: WIDTH, height: 2600 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const r = await el.boundingBox();
  const path = `${dir}/${name}.png`;
  await page.screenshot({ path, clip: { x: 0, y: Math.max(0, r.y - 8), width: WIDTH, height: height ?? Math.ceil(r.height + 16) } });
  await page.setViewportSize({ width: WIDTH, height: 1100 });
  await wideCheck(name);
  console.log(path);
  shots++;
};

// 狩 The hunt at the sixth realm's gate: the band shut, then open, and the elite's row.
await plant(cultivator(6, 5));
await tab('狩');
await from('hunt-top', '.huntrow', 900);
const band = await page.$('.relics .relicband');
if (band) {
  await band.click();
  await page.waitForTimeout(400);
  await from('hunt-relics-open', '.relics');
  await band.click();
  await page.waitForTimeout(300);
}
// Where the band sits, from the top of the screen.
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
await shot('hunt-screen');

// 修 The gate card at the sixth realm's sealed gate, five hours out, 120 wins struck.
await plant(cultivator(6, 5, { gateWins: 120 }));
await tab('修');
await shot('gate-fought', '.c-side .card:has(.gateseal)');
// And with none: what the cultivator who only waits sees.
await plant(cultivator(6, 5, { gateWins: 0 }));
await tab('修');
await shot('gate-waits', '.c-side .card:has(.gateseal)');

// 守 The fourth realm's warden, unsealed, beaten: its first fall leaves the first shard.
await plant(cultivator(4, 30, { relics: { shards: [0, 3, 2, 0, 0, 0, 0, 0, 0], made: [1] },
  levels: { technique: 40, method: 24, pills: 24, cores: 30 } }));
await tab('修');
const fightBtn = await page.$('button.act[data-coach="fight-warden"]');
if (fightBtn) {
  await fightBtn.click();
  await page.waitForTimeout(600);
  await page.click('.arena').catch(() => {});
  await page.waitForTimeout(900);
  await shot('verdict-warden', '.arena .verdict');
} else console.log('(no warden to fight)');

await browser.close();
if (shots < 5) throw new Error(`神器 only ${shots} shots`);
console.log(`${shots} shots at ${WIDTH}px`);
