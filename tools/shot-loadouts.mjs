/**
 * 套 Ten loadouts (2026-10-09): the loadout list of the 器 Gear screen with eight saved
 * and room for two more, and the line under it saying how much of the chest they hold,
 * shot off the real game against a fabricated save.
 *
 *     npm run build && npx vite preview --port 4391 &
 *     SMOKE_URL=http://localhost:4391/ node tools/shot-loadouts.mjs loadout-shots
 *     SMOKE_URL=http://localhost:4391/ SHOT_WIDTH=320 node tools/shot-loadouts.mjs loadout-shots
 *
 * 免 The save is planted with the scripts blocked, as tools/shot-rekaris.mjs does.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const dir = process.argv[2] ?? 'loadout-shots';
const WIDTH = Number(process.env.SHOT_WIDTH ?? 400);
mkdirSync(dir, { recursive: true });

const NOW = Date.UTC(2026, 9, 9, 12) / 1000;
const NAMES = ['Boss killer', 'Qi gatherer', 'Sword Saint', 'Fusing outfit', 'Melting outfit', 'Refiner', 'Tower climb', 'Spare', 'Dragon run', 'Seclusion'];
const KEYS = { weapon: 'sword', robe: 'robe', crown: 'band', boots: 'bare', talisman: 'charm', ring: 'plainring' };
const piece = (id, slot, realm, rarity = 'earth') =>
  ({ id, template: `${KEYS[slot]}${realm}`, rarity, rolls: [{ affix: 'power', value: 12 + realm }] });

/** `crowd` sets of five chest pieces each, all locked, and the ring they share on the body. */
function cultivator(crowd) {
  const at = NOW - 30;
  const chest = [];
  const sets = [];
  const five = ['weapon', 'robe', 'crown', 'boots', 'talisman'];
  for (let k = 0; k < crowd; k++) {
    const ids = { ring: 'ring' };
    five.forEach((slot, j) => {
      const id = `s${k}-${slot}`;
      chest.push({ ...piece(id, slot, 2 + ((k + j) % 4), k % 2 ? 'mystic' : 'earth'), locked: true });
      ids[slot] = id;
    });
    sets.push({ name: NAMES[k], ids });
  }
  const worn = {};
  for (const slot of five) worn[slot] = { ...piece(`w-${slot}`, slot, 5) };
  worn.ring = { ...piece('ring', 'ring', 5), locked: true };
  const killed = {};
  for (const k of ['rat', 'hound', 'frog', 'serpent', 'mantis', 'bat', 'beetle', 'owl', 'raven', 'boar', 'wolf', 'vulture']) killed[k] = 60;
  return {
    v: 1, at, startedAt: at - 40 * 86400, realm: 5, layer: 6, qi: 1e7, materials: 1e6, wardenFell: false,
    levels: { technique: 30, method: 30, pills: 30, cores: 24 }, killed, worn, chest, sets, tasks: {},
    self: 'woman', stance: 'swift', sequence: ['crane', 'tiger'], tribulation: 0, tribulationAt: 0, tower: 40,
    quarryWeek: 99999, awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought', 'formula'],
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage', 'fuse', 'whom'],
  };
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
let page = null;

const clear = async () => {
  for (let i = 0; i < 8; i++) {
    const b = await page.$('.notice button, .awaken .later, .awaken button, .back button');
    if (!b) break;
    try { await b.click({ timeout: 1200 }); } catch { break; }
    await page.waitForTimeout(220);
  }
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
  for (const t of await page.$$('nav.tabs button')) {
    if ((await t.textContent())?.includes('器')) { await t.click(); break; }
  }
  await page.waitForTimeout(600);
  await clear();
};

const shot = async (name) => {
  const keeps = await page.$('.gkeeps');
  if (!keeps) throw new Error('nothing at .gkeeps');
  await keeps.scrollIntoViewIfNeeded();
  const box = await page.evaluate(() => {
    const head = [...document.querySelectorAll('h2.heading')].find((h) => h.textContent.includes('Loadouts'));
    const a = head.getBoundingClientRect();
    const b = document.querySelector('.gkeeps').getBoundingClientRect();
    return { x: 0, y: Math.max(0, a.top + window.scrollY - 8), width: innerWidth, height: b.bottom - a.top + 20 };
  });
  const path = `${dir}/${name}-${WIDTH}.png`;
  await page.screenshot({ path, fullPage: true, clip: box });
  const wide = await page.evaluate(() => document.documentElement.scrollWidth);
  if (wide > WIDTH) throw new Error(`${name}: page is ${wide}px wide at ${WIDTH}`);
  const text = (await page.textContent('.gkeeps'))?.trim();
  const slots = await page.$$eval('.gset', (n) => n.length);
  const add = await page.$$eval('.gs-new', (n) => n.length);
  console.log(`${path}: ${slots} loadouts, new-slot button ${add ? 'shown' : 'hidden'}, line: ${text}`);
};

await plant(cultivator(3));
await shot('three-sets');
await plant(cultivator(8));
await shot('eight-sets-crowded');
await plant(cultivator(10));
await shot('ten-sets-full');
await browser.close();
