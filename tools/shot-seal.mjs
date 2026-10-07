/**
 * 封屏 The seal, the forge's every shape and the Platform's grown edge, shot off the real
 * game (2026-10-07): the gate card on 修 sealed three ways (nothing to break it, a pill in
 * the pouch, a pill carried), the Carry panel with the pill's hand, the forge's gear list
 * one place at a time with every shape of a realm whose warden fell, and the Platform card
 * at the seventh realm.
 *
 *     npm run build && npm run preview &
 *     node tools/shot-seal.mjs shots-seal
 *     SEAL_WIDTH=320 node tools/shot-seal.mjs shots-seal-320
 *
 * 免 The save is planted with the scripts blocked and both keys written on a fresh page, and
 * the page's own clock is pinned to the save, as tools/shot-week.mjs explains.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const dir = process.argv[2] ?? 'shots-seal';
const WIDTH = Number(process.env.SEAL_WIDTH ?? 400);
mkdirSync(dir, { recursive: true });

const NOW = Date.UTC(2026, 9, 7, 12) / 1000;
const XP = [0, 0];
{ let p = 0; for (let l = 1; l < 99; l++) { p += Math.floor(l + 300 * 2 ** (l / 7)); XP[l + 1] = Math.floor(p / 4); } }
// Keys as the game spells them (CLAUDE.md: a wrong key is silently dropped by validate()).
const WARDENS = ['fox', 'ape', 'crane', 'tiger', 'turtle', 'golem', 'direwolf', 'jiao'];
const COMMONS = { 1: ['rat', 'hound', 'frog'], 2: ['serpent', 'mantis', 'bat'], 3: ['beetle', 'owl', 'raven'],
  4: ['boar', 'wolf', 'vulture'], 5: ['crab', 'jellyfish', 'lizard'], 6: ['centipede', 'scorpion', 'worm'],
  7: ['ogre', 'goblin', 'wraith'] };

/** A cultivator at the gate of `realm`, the warden out `hours` ago, and what the workshop holds. */
function cultivator(hours, crafts, realm = 6, extra = {}) {
  const at = NOW - 30;
  const cap = realm * 6;
  const killed = {};
  for (let r = 1; r <= realm; r++) for (const k of COMMONS[r] ?? []) killed[k] = 30 + r * 8;
  WARDENS.slice(0, realm - 1).forEach((k) => { killed[k] = 1; });
  const levels = { herb: 60, vein: 55, render: 56, forge: 64, alchemy: 62, sigil: 50 };
  const xp = {};
  for (const [k, l] of Object.entries(levels)) xp[k] = XP[l] + Math.floor((XP[l + 1] - XP[l]) * 0.45);
  return {
    v: 1, at, startedAt: at - 30 * 86400, realm, layer: 8, gateAt: at - hours * 3600,
    qi: 10 ** (realm + 2), materials: 10 ** (realm + 2), wardenFell: false,
    levels: { technique: cap, method: cap, pills: cap, cores: Math.max(0, cap - 6) }, killed,
    worn: { weapon: { id: 'w', template: `sword${realm}`, rarity: 'earth', rolls: [{ affix: 'power', value: 22 }] } },
    chest: [], self: 'woman', stance: 'swift', sequence: ['crane', 'tiger'], tribulation: 0, tribulationAt: 0,
    tower: 50, brewed: { body: 24, bane: 18, fortune: 6 }, quarryWeek: 99999,
    awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought']
      .slice(0, [0, 0, 2, 2, 4, 4, 6, 6, 8, 8][realm]),
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones',
           'bestiary', 'salvage', 'fuse', 'whom', 'cave', 'secret', 'crafts'],
    crafts: {
      xp, since: at - 5, made: {}, tools: {}, arrays: [], carry: { elixir: null, sigil: null, pill: null }, seek: 0,
      pouch: { 'guard6@2': 3, 'might5@1': 2, 'sigil:warding@2': 4, metal5: 40, metal6: 30, 'part:turtle': 12,
        lotus: 900, ginseng: 1200, cinnabar: 800 },
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

const click = async (selector, text) => {
  for (const b of await page.$$(selector)) {
    if (!text || (await b.textContent())?.includes(text)) { await b.click(); await page.waitForTimeout(350); return; }
  }
  throw new Error(`封 nothing at ${selector} saying ${text}`);
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
/** 鑄 From one element's top to another's foot, the whole run of them, scrolled or not. */
const span = async (name, from, to) => {
  const a = await page.$(from), b = await page.$(to);
  if (!a || !b) throw new Error(`封 nothing at ${from} or ${to} for ${name}`);
  const ra = await a.boundingBox(), rb = await b.boundingBox();
  // A viewport tall enough for the whole run, so the fixed tab bar sits below it.
  await page.setViewportSize({ width: WIDTH, height: Math.ceil(rb.y + rb.height + 400) });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const a2 = await a.boundingBox(), b2 = await b.boundingBox();
  const y = Math.max(0, a2.y - 6);
  const path = `${dir}/${name}.png`;
  await page.screenshot({ path, clip: { x: 0, y, width: WIDTH, height: b2.y + b2.height - y + 6 } });
  await page.setViewportSize({ width: WIDTH, height: 1100 });
  const wide = await page.evaluate(() => document.documentElement.scrollWidth);
  if (wide > WIDTH + 1) throw new Error(`封 ${name}: the page is ${wide}px wide at ${WIDTH}`);
  console.log(path);
  shots++;
};
const shot = async (name, selector) => {
  const el = selector ? await page.$(selector) : null;
  if (selector && !el) throw new Error(`封 nothing at ${selector} for ${name}`);
  if (el) await el.scrollIntoViewIfNeeded();
  const path = `${dir}/${name}.png`;
  if (el) await el.screenshot({ path }); else await page.screenshot({ path, fullPage: false });
  // 寬 Nothing on the page may push it wider than the phone.
  const wide = await page.evaluate(() => document.documentElement.scrollWidth);
  if (wide > WIDTH + 1) throw new Error(`封 ${name}: the page is ${wide}px wide at ${WIDTH}`);
  console.log(path);
  shots++;
};

const pill6 = 'breakthrough6@2';

// 封 The gate card on 修, sealed: six hours out, nothing to break it.
const card = '.c-side .card:has(.gateseal)';
await plant(cultivator(6, { pouch: { 'guard6@2': 3 } }));
await tab('修');
await shot('gate-sealed', card);
await shot('cultivate-sealed');
// A pill in the pouch, not carried yet: the card names what it would do.
await plant(cultivator(6, { pouch: { 'guard6@2': 3, [pill6]: 2 } }));
await tab('修');
await shot('gate-pill-held', card);
// The pill carried: the seal breaks, the bottleneck stands lower, the fight is open.
await plant(cultivator(6, { pouch: { 'guard6@2': 3, [pill6]: 2 }, carry: { elixir: 'guard6@2', sigil: null, pill: pill6 } }));
await tab('修');
await shot('gate-pill-carried', card);

// 攜 The Carry panel with the pill's hand, on the workshop's pouch side.
await tab('業');
const pouch = await page.$('.crafts .cswitch button:nth-child(2)');
if (pouch && await pouch.isVisible()) { await pouch.click(); await page.waitForTimeout(350); }
await shot('carry-pill', '.crafts .ccarry');

// 百形 The forge's gear list: the fifth realm's warden fell, so every shape of realm 5 forges;
// the sixth's still stands, so its line says what beating it opens.
await plant(cultivator(6, {}));
await tab('業');
await click('.crafts .cskill', 'Forging');
await click('.crafts .cgroups button', 'Gear');
await span('forge-weapon', '.crafts .cgroups', '.crafts .crecipes');
await click('.crafts .cslot button', 'Ring');
await span('forge-ring', '.crafts .cgroups', '.crafts .crecipes');
await click('.crafts .cslot button', 'All');
await span('forge-all', '.crafts .cgroups', '.crafts .crecipes');

// 擂 The Platform card at the seventh realm: the edge grown 12% over the fourth's.
await plant(cultivator(0, {}, 7, { layer: 4, gateAt: 0 }));
await tab('塔');
await shot('platform-7', '.platcard');
await plant(cultivator(0, {}, 4, { layer: 4, gateAt: 0 }));
await tab('塔');
await shot('platform-4', '.platcard');

await browser.close();
// 底 Every shot asked for, or it says so.
if (shots < 10) throw new Error(`封 only ${shots} shots`);
console.log(`${shots} shots at ${WIDTH}px`);
