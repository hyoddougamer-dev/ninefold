/**
 * 壁屏 The walls, shot off the real game: 瓶頸 the warden's bottleneck on its card in three
 * states (nothing to break it with, a pouch that could, a kit carried), 霸 the elite's
 * chip on the hunt, and 爐 the furnace's pills with their numbers.
 *
 *     npm run build && npm run preview &
 *     node tools/shot-walls.mjs shots-walls
 *     WALLS_WIDTH=320 node tools/shot-walls.mjs shots-walls-320
 *
 * 免 The save is planted with the scripts blocked and both keys written on a fresh page,
 * and the page's own clock is pinned to the save, as tools/shot-week.mjs explains.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const dir = process.argv[2] ?? 'shots-walls';
const WIDTH = Number(process.env.WALLS_WIDTH ?? 400);
mkdirSync(dir, { recursive: true });

const NOW = Date.UTC(2026, 9, 6, 12) / 1000;
const XP = [0, 0];
{ let p = 0; for (let l = 1; l < 99; l++) { p += Math.floor(l + 300 * 2 ** (l / 7)); XP[l + 1] = Math.floor(p / 4); } }
const WARDENS = ['fox', 'ape', 'crane', 'tiger', 'turtle', 'golem', 'direwolf', 'jiao'];
const COMMONS = { 1: ['rat', 'hound', 'frog'], 2: ['serpent', 'mantis', 'bat'], 3: ['beetle', 'owl', 'raven'],
  4: ['boar', 'wolf', 'vulture'], 5: ['crab', 'jellyfish', 'lizard'] };

/** A fifth-realm cultivator at the gate, the warden come to it `hours` ago, and what the workshop holds. */
function cultivator(hours, crafts, realm = 5) {
  const at = NOW - 30;
  const cap = realm * 6;
  const killed = {};
  for (let r = 1; r <= realm; r++) for (const k of COMMONS[r] ?? []) killed[k] = 30 + r * 8;
  WARDENS.slice(0, realm - 1).forEach((k) => { killed[k] = 1; });
  const levels = { herb: 40, vein: 40, render: 30, forge: 30, alchemy: 52, sigil: 34 };
  const xp = {};
  for (const [k, l] of Object.entries(levels)) xp[k] = XP[l] + Math.floor((XP[l + 1] - XP[l]) * 0.45);
  return {
    v: 1, at, startedAt: at - 30 * 86400, realm, layer: realm === 9 ? 3 : 8, gateAt: realm === 9 ? 0 : at - hours * 3600,
    qi: 10 ** (realm === 9 ? 15 : realm + 2), materials: 10 ** (realm === 9 ? 10 : realm + 2), wardenFell: false,
    levels: { technique: cap, method: cap, pills: cap, cores: Math.max(0, cap - 6) }, killed,
    worn: { weapon: { id: 'w', template: `sword${realm}`, rarity: 'earth', rolls: [{ affix: 'power', value: 22 }] } },
    chest: [], self: 'woman', stance: 'swift', sequence: ['crane'], tribulation: 0, tribulationAt: 0,
    tower: 40, brewed: { body: 24, bane: 18, fortune: 6 }, quarryWeek: 99999,
    awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought']
      .slice(0, [0, 0, 2, 2, 4, 4, 6, 6, 8, 8][realm]),
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones',
           'bestiary', 'salvage', 'fuse', 'whom', 'cave', 'secret', 'crafts'],
    crafts: {
      xp, since: at - 5, made: {}, tools: {}, arrays: [], carry: { elixir: null, sigil: null }, seek: 0,
      pouch: { 'guard5@2': 3, 'might5@1': 2, 'sigil:warding@2': 4 }, ...crafts,
    },
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
    localStorage.setItem(k, JSON.stringify(s));
    localStorage.setItem(b, JSON.stringify(s));
  }, [SAVE_KEY, BACKUP_KEY, save]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(700);
  await clear();
};

const shot = async (name, selector) => {
  const el = selector ? await page.$(selector) : null;
  if (selector && !el) throw new Error(`壁 nothing at ${selector} for ${name}`);
  const path = `${dir}/${name}.png`;
  if (el) await el.screenshot({ path }); else await page.screenshot({ path });
  console.log(path);
};

// 瓶頸 The warden's card, three ways. The card is the one holding the bottleneck line.
const card = '.c-side .card:has(.bneck)';
await plant(cultivator(10, { pouch: {} }));
await tab('修');
await shot('warden-none', card);
await plant(cultivator(10, {}));
await tab('修');
await shot('warden-held', card);
await shot('cultivate-held');
await plant(cultivator(10, { carry: { elixir: 'guard5@2', sigil: 'sigil:warding@2' } }));
await tab('修');
await shot('warden-carried', card);

// 霸 The elite on the hunt, and 爐 the furnace with its numbers.
await tab('狩');
await shot('hunt');
await shot('elite', 'button.beast:has(.etag)');
await plant(cultivator(0, {}, 9));
await tab('塔');
const furnace = await page.$('button.pill');
if (!furnace) throw new Error('爐 no pills on the trials screen');
await furnace.scrollIntoViewIfNeeded();
await shot('furnace-pill', '.stack:has(button.pill)');

await browser.close();
