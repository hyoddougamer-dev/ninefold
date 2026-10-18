/**
 * 珍 冊 The trophies and the book, shot off the real game (2026-10-18): the hunt rows with the
 * trophy line under the bond, the bestiary opened on the trophy book (a whole page, a gilt
 * one, one waiting on the furnace, one ready for the forge), and the drive sheet before and
 * after a drive whose kills cross a trophy. Run against the build before them as well, for
 * the before half: the same save, so the difference is the change.
 *
 *     python3 -m http.server 4431 -d <dist> &
 *     SMOKE_URL=http://localhost:4431/ SHOT_WIDTH=320 npx tsx tools/shot-trophies.mjs <dir>
 *
 * 免 Planted as tools/shot-seal.mjs plants: scripts blocked, both keys written, the page's
 * clock pinned to the save. Every save is stamped season 's0' with 'whom' in seen.
 */
import { chromium } from '/home/user/ninefold/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import { found } from '../src/sim/trophies.ts';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4431/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const dir = process.argv[2] ?? 'shots-trophies';
const WIDTH = Number(process.env.SHOT_WIDTH ?? 400);
mkdirSync(dir, { recursive: true });

const NOW = Date.UTC(2026, 10, 30, 12) / 1000;
const AT = NOW - 30;
const STARTED = AT - 70 * 86400;
const WARDENS = ['fox', 'ape', 'crane', 'tiger', 'turtle', 'golem', 'direwolf', 'jiao'];

/** 珍 The kills of the squid at which a drive of 200 crosses its first trophy: the drive shot's save. */
function crossingAt(key, from, n) {
  const h = (k) => ({ killed: { [key]: k }, startedAt: STARTED, lives: [] });
  for (let k = from; k < 60000; k += 1) if (found(h(k), key) === 0 && found(h(k + n), key) > 0) return k;
  throw new Error(`珍 no crossing for ${key}`);
}
const squid = crossingAt('squid', 1000, 200);

/** A cultivator at the summit, seventy days in, who has been driving old beasts for the book. */
function cultivator(extra = {}) {
  const killed = {
    // 1: whole, with spares (gilt in the save below). 2: two of three, spares to render. 3: whole, spares to gild.
    rat: 200000, hound: 200000, frog: 200000,
    serpent: 200000, mantis: 200000, bat: 60,
    beetle: 200000, owl: 200000, raven: 200000,
    // 4 to 8: on the way.
    boar: 24000, wolf: 9000, vulture: 300, crab: 18000, jellyfish: 400, lizard: 2200,
    centipede: 1500, scorpion: 700, worm: 31000, ogre: 900, goblin: 700, wraith: 500,
    skeleton: 1200, gargoyle: 800, minotaur: 15000,
    // 9: the realm the hunt list leads with.
    harpy: 1500, unicorn: 3200, squid,
  };
  WARDENS.forEach((k) => { killed[k] = 1; });
  return {
    v: 1, season: 's0', at: AT, startedAt: STARTED, realm: 9, layer: 8, gateAt: 0,
    qi: 1e15, materials: 2e9, wardenFell: true, sealPaid: 0, sealFed: 0,
    levels: { technique: 54, method: 54, pills: 54, cores: 48 }, killed,
    worn: { weapon: { id: 'w', template: 'sword9', rarity: 'heaven', rolls: [{ affix: 'power', value: 60 }] } },
    chest: [], self: 'woman', stance: 'swift', sequence: ['crane', 'tiger'], tribulation: 3, tribulationAt: 0,
    tower: 70, brewed: { body: 40, bane: 30, fortune: 10 }, quarryWeek: 99999,
    awakened: [],
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones',
           'bestiary', 'salvage', 'fuse', 'whom', 'cave', 'secret', 'crafts', 'seal'],
    trophy: { used: { rat: 1, hound: 1, frog: 1 }, made: {}, gilt: [1], kept: [] },
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
  if (wide > WIDTH + 1) throw new Error(`珍 ${name}: the page is ${wide}px wide at ${WIDTH}`);
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
/** From one element's top down `height` pixels of the page. */
const from = async (name, selector, height) => {
  const el = await page.$(selector);
  if (!el) { console.log(`(nothing at ${selector} for ${name})`); return; }
  await page.setViewportSize({ width: WIDTH, height: 4000 });
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

// 狩 The hunt rows at the summit: the trophy line under 緣 the bond.
await plant(cultivator());
await tab('狩');
await from('hunt-rows', '.huntrow', 1000);

// 錄 The bestiary opened: 冊 the book line and the first three realms' pages.
const fold = await page.$('button.fold');
if (fold) {
  await fold.click();
  await page.waitForTimeout(500);
  const book = (await page.$('.tbook')) ? '.tbook' : 'button.fold';
  await from('bestiary-book', book, 1250);
}

// 圍 The drive sheet on the squid, before, and after a drive of 200 that crosses its trophy.
await plant(cultivator());
await tab('狩');
const rows = await page.$$('button.beast');
let opened = false;
for (const r of rows) {
  if (!(await r.textContent())?.includes('Colossal Squid')) continue;
  const tag = await r.$('.drivetag');
  if (tag) { await tag.click(); opened = true; }
  break;
}
if (opened) {
  await page.waitForTimeout(500);
  await shot('drive-before', '.drivesheet');
  const sizes = await page.$$('.drivesheet button.size');
  for (const b of sizes) if ((await b.textContent())?.trim().startsWith('200')) { await b.click(); break; }
  await page.waitForTimeout(700);
  await shot('drive-after', '.drivesheet');
} else console.log('(no squid drive tag)');

await browser.close();
if (shots < 3) throw new Error(`珍 only ${shots} shots`);
console.log(`${shots} shots at ${WIDTH}px (squid at ${squid} kills)`);
