/**
 * 業 What rekaris asked of the walls and the workshop (2026-10-07), shot off the real game:
 * the gate card on 修 at the eighth realm with its seal as a bar that fills with time (no
 * pill, a pill in the pouch, a pill carried with an elixir and a sigil), the Carry panel
 * with the pill's hand, the Hundredfold crucible's piece with its minutes at the anvil, and
 * a fusion that used to read above ×1.50 made on the 煉 row, beside a piece fused before the
 * fix that the save keeps as it was.
 *
 *     npm run build && npx vite preview --port 4391 &
 *     SMOKE_URL=http://localhost:4391/ node tools/shot-rekaris.mjs shots-rekaris
 *     SMOKE_URL=http://localhost:4391/ SHOT_WIDTH=320 node tools/shot-rekaris.mjs shots-rekaris-320
 *
 * 免 The save is planted with the scripts blocked and both keys written on a fresh page, and
 * the page's own clock is pinned to the save, as tools/shot-seal.mjs does.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const dir = process.argv[2] ?? 'shots-rekaris';
const WIDTH = Number(process.env.SHOT_WIDTH ?? 400);
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
function cultivator(hours, crafts, realm = 8, extra = {}) {
  const at = NOW - 30;
  const cap = realm * 6;
  const killed = {};
  for (let r = 1; r <= realm; r++) for (const k of COMMONS[r] ?? []) killed[k] = 30 + r * 8;
  WARDENS.slice(0, realm - 1).forEach((k) => { killed[k] = 1; });
  const levels = { herb: 88, vein: 62, render: 84, forge: 72, alchemy: 86, sigil: 60 };
  const xp = {};
  for (const [k, l] of Object.entries(levels)) xp[k] = XP[l] + Math.floor((XP[l + 1] - XP[l]) * 0.45);
  return {
    v: 1, at, startedAt: at - 50 * 86400, realm, layer: 8, gateAt: at - hours * 3600,
    qi: 10 ** (realm + 2), materials: 10 ** (realm + 2), wardenFell: false,
    levels: { technique: cap, method: cap, pills: cap, cores: Math.max(0, cap - 6) }, killed,
    worn: { weapon: { id: 'w', template: `sword${realm}`, rarity: 'earth', rolls: [{ affix: 'power', value: 22 }] } },
    chest: [], self: 'woman', stance: 'swift', sequence: ['crane', 'tiger'], tribulation: 0, tribulationAt: 0,
    tower: 70, brewed: { body: 30, bane: 20, fortune: 8 }, quarryWeek: 99999,
    awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought'].slice(0, [0, 0, 2, 2, 4, 4, 6, 6, 8, 8][realm]),
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones',
           'bestiary', 'salvage', 'fuse', 'whom', 'cave', 'secret', 'crafts'],
    crafts: {
      xp, since: at - 5, made: {}, tools: {}, arrays: [], carry: { elixir: null, sigil: null, pill: null }, seek: 0,
      pouch: { 'might8@2': 3, 'sigil:thunder@2': 4, metal5: 400, metal6: 30, 'part:turtle': 60, 'part:lizard': 400,
        lotus: 900, ginseng: 1200, cinnabar: 800, jade: 300, stone: 300 },
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
  throw new Error(`業 nothing at ${selector} saying ${text}`);
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
const shot = async (name, selector) => {
  const el = selector ? await page.$(selector) : null;
  if (selector && !el) throw new Error(`業 nothing at ${selector} for ${name}`);
  if (el) await el.scrollIntoViewIfNeeded();
  const path = `${dir}/${name}.png`;
  if (el) await el.screenshot({ path }); else await page.screenshot({ path, fullPage: false });
  // 寬 Nothing on the page may push it wider than the phone.
  const wide = await page.evaluate(() => document.documentElement.scrollWidth);
  if (wide > WIDTH + 1) throw new Error(`業 ${name}: the page is ${wide}px wide at ${WIDTH}`);
  console.log(path);
  shots++;
};
const text = async (selector) => (await page.$eval(selector, (e) => e.textContent ?? '')).replace(/\s+/g, ' ').trim();

const pill8 = 'breakthrough8@2';
const card = '.c-side .card:has(.gateseal)';

// 封 Twelve hours into the eighth realm's two-day seal, nothing to break it: the bar a quarter full.
await plant(cultivator(12, { pouch: { 'might8@2': 3 } }));
await tab('修');
await shot('gate-sealed', card);
console.log(`  ${await text(`${card} .gateseal`)}`);
// A pill in the pouch, not carried yet: the card names what it would do.
await plant(cultivator(12, { pouch: { 'might8@2': 3, [pill8]: 2 } }));
await tab('修');
await shot('gate-pill-held', card);
console.log(`  ${await text(`${card} .gateseal`)}`);
// The pill carried with an elixir and a sigil: the seal broken, the wall far lower, the fight open.
await plant(cultivator(12, { pouch: { 'might8@2': 3, 'sigil:thunder@2': 4, [pill8]: 2 },
  carry: { elixir: 'might8@2', sigil: 'sigil:thunder@2', pill: pill8 } }));
await tab('修');
await shot('gate-pill-carried', card);
console.log(`  ${await text(`${card} .bneck`)}`);
console.log(`  ${await text(`${card} .gateseal`)}`);

// 攜 The Carry panel with the pill's hand, on the workshop's pouch side.
await tab('業');
const pouch = await page.$('.crafts .cswitch button:nth-child(2)');
if (pouch && await pouch.isVisible()) { await pouch.click(); await page.waitForTimeout(350); }
await shot('carry-pill', '.crafts .ccarry');
console.log(`  ${await text('.crafts .ccarry .ccarry-seal')}`);

// 百煉 The crucible's piece: twenty minutes at the anvil, and what it asks for.
await plant(cultivator(0, {}, 5, { layer: 4, gateAt: 0, killed: { ...cultivator(0, {}, 5).killed, lizard: 60, turtle: 1 } }));
await tab('業');
await click('.crafts .cskill', 'Forging');
await click('.crafts .cgroups button', 'Hundredfold');
await shot('hundred-piece', '.hundred .hu-out');
console.log(`  ${await text('.hundred .hu-out')}`);

// 藏 A fusion that used to read above ×1.50: three Earth Mortal Iron Mantles at their best
// roll (藏 3, ×1.50) fuse into a Heaven one. Rounded after the cap it came out 藏 5, ×1.67;
// now 藏 4, ×1.33. Beside them, a Heaven mantle fused before the fix at 藏 5, kept as it was.
const mantle = (id, rarity, value, from) => ({ id, template: 'mantle1', rarity, rolls: [{ affix: 'capacity', value }], from });
await plant(cultivator(0, {}, 3, { layer: 4, gateAt: 0, chest: [
  mantle('m1', 'earth', 3, 'rat'), mantle('m2', 'earth', 3, 'rat'), mantle('m3', 'earth', 3, 'rat'),
  mantle('old', 'heaven', 5, 'fused'),
] }));
await tab('器');
await shot('fuse-row', '.fuserow');
await click('.fuserow');
await clear();
await page.waitForTimeout(400);
const made = '.chest .chestit[aria-label^="Mortal Iron Mantle, Heaven, chest slots 4,"]';
await page.click(made);
await page.waitForTimeout(500);
await shot('fused-sheet', '.itemsheet');
console.log(`  ${await text('.itemsheet')}`.slice(0, 400));
await clear();
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await plant(cultivator(0, {}, 3, { layer: 4, gateAt: 0, chest: [mantle('old', 'heaven', 5, 'fused')] }));
await tab('器');
await page.click('.chest .chestit[aria-label^="Mortal Iron Mantle, Heaven, chest slots 5,"]');
await page.waitForTimeout(500);
await shot('fused-sheet-old-kept', '.itemsheet');

await browser.close();
// 底 Every shot asked for, or it says so.
if (shots < 8) throw new Error(`業 only ${shots} shots`);
console.log(`${shots} shots at ${WIDTH}px`);
