/**
 * 傳說 擊 The legendary works and the hard wins, shot off the real game (2026-10-18): 業 the
 * workshop's craft panel with its next goal, the Legendary list, the task card forging a work,
 * 狩 the hunt's elite row with what a hard win strikes, and 修 the gate card with the wins
 * counted as waited. The same saves are shot on the build before (3e92b8e), where none of it
 * exists, so each pair is the one screen as it was and as it is.
 *
 *     npm run build && npx vite preview --port 4432 &
 *     ASCENT_WIDTH=320 node tools/shot-ascent.mjs <dir> [after|before]
 *
 * 免 The save is planted with the scripts blocked, both keys written, and the page's own clock
 * pinned to the save, as tools/shot-seal.mjs does. Every save is stamped season 's0' and has
 * 'whom' in seen (CLAUDE.md: the question covers the screen until it is answered).
 */
import { chromium } from '/home/user/ninefold/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4432/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const dir = process.argv[2] ?? 'shots-ascent';
const which = process.argv[3] ?? 'after';
const WIDTH = Number(process.env.ASCENT_WIDTH ?? 400);
mkdirSync(dir, { recursive: true });

const NOW = Date.UTC(2026, 9, 27, 12) / 1000;
const XP = [0, 0];
{ let p = 0; for (let l = 1; l < 99; l++) { p += Math.floor(l + 300 * 2 ** (l / 7)); XP[l + 1] = Math.floor(p / 4); } }
const WARDENS = ['fox', 'ape', 'crane', 'tiger', 'turtle', 'golem', 'direwolf', 'jiao'];
const COMMONS = { 1: ['rat', 'hound', 'frog'], 2: ['serpent', 'mantis', 'bat'], 3: ['beetle', 'owl', 'raven'],
  4: ['boar', 'wolf', 'vulture'], 5: ['crab', 'jellyfish', 'lizard'], 6: ['centipede', 'scorpion', 'worm'],
  7: ['ogre', 'goblin', 'wraith'], 8: ['skeleton', 'gargoyle', 'minotaur'] };

/** A cultivator at the eighth realm's gate, a crafter who has mastered seven herbs. */
function cultivator(crafts = {}, extra = {}) {
  const realm = 8;
  const at = NOW - 30;
  const cap = realm * 6;
  const killed = {};
  for (let r = 1; r <= realm; r++) for (const k of COMMONS[r]) killed[k] = 400 + r * 60;
  WARDENS.slice(0, realm - 1).forEach((k) => { killed[k] = 1; });
  const levels = { herb: 82, vein: 72, render: 78, forge: 70, alchemy: 74, sigil: 60, array: 55 };
  const xp = {};
  for (const [k, l] of Object.entries(levels)) xp[k] = XP[l] + Math.floor((XP[l + 1] - XP[l]) * 0.45);
  const made = {};
  for (const h of ['moss', 'bark', 'orchid', 'dragonblood', 'lotus', 'ginseng', 'fern']) made[`herb:${h}`] = 2000;
  made['herb:vine'] = 1400;
  return {
    v: 1, season: 's0', at, startedAt: at - 60 * 86400, realm, layer: 8, gateAt: at - 6 * 3600, gateStruck: 4 * 3600,
    sealPaid: 0, sealFed: 0,
    qi: 10 ** (realm + 2), materials: 10 ** (realm + 3), wardenFell: false,
    levels: { technique: cap, method: cap, pills: cap, cores: Math.max(0, cap - 6) }, killed,
    worn: { weapon: { id: 'w', template: `sword${realm}`, rarity: 'heaven', rolls: [{ affix: 'power', value: 40 }] } },
    chest: [], self: 'woman', stance: 'swift', sequence: ['crane', 'tiger'], tribulation: 0, tribulationAt: 0,
    tower: 70, brewed: { body: 30, bane: 24, fortune: 8 }, quarryWeek: 99999,
    awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought'],
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones',
           'bestiary', 'salvage', 'fuse', 'whom', 'cave', 'secret', 'crafts'],
    crafts: {
      xp, since: at - 5, made, tools: {}, arrays: [], carry: { elixir: null, sigil: null, pill: null }, seek: 0,
      task: 'herb:vine', souls: 4,
      pouch: { beard: 15000, vine: 9200, fern: 15000, 'part:direwolf': 22, cinnabar: 800, lotus: 900 },
      ...crafts,
    },
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

const click = async (selector, text, optional = false) => {
  for (const b of await page.$$(selector)) {
    if (!text || (await b.textContent())?.includes(text)) { await b.click(); await page.waitForTimeout(350); return true; }
  }
  if (optional) return false;
  throw new Error(`傳說 nothing at ${selector} saying ${text}`);
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
const name = (n) => `${dir}/${n}-${which}-${WIDTH}.png`;
const wideCheck = async (n) => {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth);
  if (wide > WIDTH + 1) throw new Error(`傳說 ${n}: the page is ${wide}px wide at ${WIDTH}`);
};
/** From one element's top to another's foot. */
const span = async (n, from, to) => {
  const a = await page.$(from), b = await page.$(to);
  if (!a || !b) throw new Error(`傳說 nothing at ${from} or ${to} for ${n}`);
  const rb = await b.boundingBox();
  await page.setViewportSize({ width: WIDTH, height: Math.ceil(rb.y + rb.height + 400) });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const a2 = await a.boundingBox(), b2 = await b.boundingBox();
  const y = Math.max(0, a2.y - 6);
  await page.screenshot({ path: name(n), clip: { x: 0, y, width: WIDTH, height: Math.min(2400, b2.y + b2.height - y + 6) } });
  await page.setViewportSize({ width: WIDTH, height: 1100 });
  await wideCheck(n);
  console.log(name(n));
  shots++;
};
const shot = async (n, selector) => {
  const el = await page.$(selector);
  if (!el) throw new Error(`傳說 nothing at ${selector} for ${n}`);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await el.screenshot({ path: name(n) });
  await wideCheck(n);
  console.log(name(n));
  shots++;
};

const herb = async () => {
  await tab('業');
  await click('.crafts .cskill', 'Herb Gathering');
};

// 1 業 The craft panel: the next goal under the mastery line.
await plant(cultivator());
await herb();
await shot('workshop-goal', '.crafts .cpanel');
// 2 The Legendary list (before: the craft's only list, Paths).
if (!(await click('.crafts .cgroups button', 'Legendary', true))) console.log('(no Legendary list on this build)');
await span('legend-list', '.crafts .cpanel', '.crafts .crecipes');

// 3 The work on the anvil, forging, struck: the task card and its row.
await plant(cultivator({ task: 'legend:herb', legend: { key: 'legend:herb', done: 86_400 * 0.6, struck: 10 * 3600 },
  pouch: { cinnabar: 800, lotus: 900 }, souls: 0 }));
await herb();
await shot('legend-anvil', '.crafts .ctask');

// 4 狩 The hunt: the eighth realm's elite, the Bull Demon, with what a hard win strikes.
await tab('狩');
const elite = await page.evaluateHandle(() => [...document.querySelectorAll('.beast')].find((b) => b.textContent.includes('Bull Demon')));
if (!elite.asElement()) throw new Error('傳說 no Bull Demon row');
await elite.asElement().scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await elite.asElement().screenshot({ path: name('hunt-elite') });
await wideCheck('hunt-elite');
console.log(name('hunt-elite'));
shots++;

// 5 修 The gate card at the eighth realm: sealed, six hours out, four hours counted by hard wins.
await tab('修');
await shot('gate-struck', '.c-side .card:has(.gateseal)');

await browser.close();
if (shots < 5) throw new Error(`傳說 only ${shots} shots`);
console.log(`${shots} shots at ${WIDTH}px (${which})`);
