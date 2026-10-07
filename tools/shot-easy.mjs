/**
 * 便 The small fixes the testers asked for on 2026-10-06, shot off the real game: the quality
 * on the worn wheel, the luck in all, a long row of saved filters, the melting allowance's
 * sentence, what the beasts-weaker line reaches, and what the full Qi school lifts.
 *
 *     npm run build && npm run preview &
 *     node tools/shot-easy.mjs shots-easy             (400 wide)
 *     EASY_WIDTH=320 node tools/shot-easy.mjs shots-easy-320
 *
 * 免 The save is planted with the scripts blocked, as tools/shot-walls.mjs explains.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const dir = process.argv[2] ?? 'shots-easy';
const WIDTH = Number(process.env.EASY_WIDTH ?? 400);
mkdirSync(dir, { recursive: true });

const NOW = Date.UTC(2026, 9, 6, 22) / 1000;
const piece = (id, template, rarity, value, extra = []) =>
  ({ id, template, rarity, rolls: [{ affix: 'rate', value }, ...extra] });

/** A cultivator wearing all six pieces of the Qi school, so the school is full and every tile has a quality. */
const save = (filters = []) => {
  const at = NOW - 30;
  return {
    v: 1, at, startedAt: at - 30 * 86400, realm: 5, layer: 6, qi: 1e8, materials: 2e5, wardenFell: false,
    levels: { technique: 30, method: 30, pills: 30, cores: 24 },
    killed: { rat: 150, hound: 40, frog: 40, serpent: 30, mantis: 30, bat: 30, beetle: 30, owl: 30, raven: 30, boar: 30, wolf: 30, vulture: 30, crab: 12 },
    worn: {
      weapon: piece('w', 'fan5', 'earth', 40, [{ affix: 'luck', value: 18 }, { affix: 'sunder', value: 6 }]),
      robe: piece('r', 'robe5', 'mystic', 14, [{ affix: 'luck', value: 9 }]),
      crown: piece('c', 'band5', 'earth', 55, [{ affix: 'find', value: 4 }]),
      boots: piece('b', 'bare5', 'heaven', 90, [{ affix: 'luck', value: 30 }]),
      talisman: piece('t', 'charm5', 'spirit', 4),
      ring: piece('g', 'topaz5', 'earth', 20),
    },
    chest: [piece('x1', 'robe5', 'spirit', 5), piece('x2', 'band5', 'common', 3), piece('x3', 'fan5', 'mystic', 25), piece('x4', 'charm5', 'common', 2), piece('x5', 'bare5', 'common', 2), piece('x6', 'topaz5', 'common', 2)],
    filters, self: 'woman', stance: 'swift', sequence: [], tribulation: 0, tribulationAt: 0, tower: 40,
    brewed: { body: 6, bane: 4, fortune: 8 }, awakened: ['feast', 'wolf', 'luckystar', 'platform'],
    melt: 3,
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage', 'fuse', 'whom', 'cave', 'secret', 'crafts', 'workshop'],
  };
};

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
const plant = async (s) => {
  if (page) await page.close();
  page = await browser.newPage({ viewport: { width: WIDTH, height: 1100 }, deviceScaleFactor: 2 });
  await page.clock.install({ time: NOW * 1000 });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, b, v]) => { localStorage.setItem(k, JSON.stringify(v)); localStorage.setItem(b, JSON.stringify(v)); },
    ['ninefold.save.v1', 'ninefold.save.backup', s]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(700);
  await clear();
};
const tab = async (han) => {
  await clear();
  for (const t of await page.$$('nav.tabs button')) if ((await t.textContent())?.includes(han)) { await t.click(); break; }
  await page.waitForTimeout(500);
  await clear();
};
const shot = async (name, selector) => {
  const el = selector ? await page.$(selector) : null;
  if (selector && !el) throw new Error(`便 nothing at ${selector} for ${name}`);
  const path = `${dir}/${name}.png`;
  if (el) { await el.scrollIntoViewIfNeeded(); await el.screenshot({ path }); } else await page.screenshot({ path });
  console.log(path);
};

const names = ['Rings', 'Luck', 'Qi robes', 'Fortune', 'Crowns', 'Boots', 'Swords', 'Heaven', 'Mystic', 'Keep', 'Melt', 'Fuse', 'Power', 'Find', 'Art', 'Refine', 'Capacity', 'Sunder', 'Spirit', 'Old', 'Sets', 'Early', 'Late', 'Odd'];
await plant(save(names.map((name) => ({ name, slot: 'all', school: 'any', lines: [] }))));
await tab('器');
await shot('wheel', '.wheel');
await shot('calling', '.calling');
await page.click('details.othereff summary');
await page.waitForTimeout(300);
await shot('other-effects', 'details.othereff');
// 破 What the beasts-weaker line reaches, as its note says it.
const sunder = await page.$('details.othereff .oe div:has-text("Beasts are weaker") button.term, details.othereff .oe div:has-text("Beasts are weaker") .term');
if (sunder) { await sunder.click(); await page.waitForTimeout(400); await shot('sunder-note'); await page.keyboard.press('Escape'); }
await shot('filters', '.gearpresets');
const allowance = await page.$('.allowance');
if (allowance) await shot('allowance', '.allowance');
await browser.close();
