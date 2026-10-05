/**
 * 攜 丹符 The 2026-10-05 update on the real build, for Bruno: the crafts' recipes with their
 * numbers, a pill and a sigil carried up 塔 the tower (left below and taken up), and 金剛
 * the Vajra's Platform and class line. One seventh-realm cultivator, fabricated, played at
 * 400 and 320 pixels wide.
 *
 *     npm run build && npx vite preview --port 4183 --strictPort &
 *     SMOKE_URL=http://localhost:4183/ npx tsx tools/shot-kit.ts /tmp/shots after
 *
 * The floor it stands under is found with the sim itself (the first floor this body wins
 * less than half the time bare), so the card shows the kit changing something real.
 */
import { chromium, type Page } from 'playwright';
import { mkdirSync } from 'node:fs';
import { validate } from '../src/sim/state.ts';
import { odds } from '../src/sim/combat.ts';
import { floorBeast, floorPower } from '../src/sim/tower.ts';
import { XP_TABLE } from '../src/data/crafts.ts';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const SAVE_KEY = 'ninefold.save.v1';
const OUT = process.argv[2] ?? '/tmp/shots';
const LABEL = process.argv[3] ?? 'after';
mkdirSync(OUT, { recursive: true });

const WARDENS = ['fox', 'ape', 'crane', 'tiger', 'turtle', 'golem', 'direwolf', 'jiao'];
const COMMONS: Record<number, string[]> = { 1: ['rat', 'hound', 'frog'], 2: ['serpent', 'mantis', 'bat'], 3: ['beetle', 'owl', 'raven'],
  4: ['boar', 'wolf', 'vulture'], 5: ['crab', 'jellyfish', 'lizard'], 6: ['centipede', 'scorpion', 'worm'], 7: ['ogre', 'goblin', 'wraith'] };

const at = Math.floor(Date.now() / 1000);
const realm = 7;
const cap = realm * 6;
const killed: Record<string, number> = {};
for (let r = 1; r <= realm; r++) for (const k of COMMONS[r] ?? []) killed[k] = 30 + r * 8;
WARDENS.slice(0, realm - 1).forEach((k) => { killed[k] = 1; });
const lv = (l: number) => XP_TABLE[l] + Math.floor((XP_TABLE[l + 1] - XP_TABLE[l]) * 0.45);
// 金剛 Three Qi pieces and three Body pieces: the Vajra.
const piece = (id: string, template: string, affix: string) => ({ id, template, rarity: 'earth', rolls: [{ affix, value: 30 }] });
const save: Record<string, unknown> = {
  v: 1, at, startedAt: at - 40 * 86400, realm, layer: 5, qi: 1e9, materials: 1e10,
  wardenFell: false, levels: { technique: cap, method: cap, pills: cap, cores: cap - 6 }, killed,
  worn: {
    weapon: piece('w', `fan${realm}`, 'rate'), robe: piece('r', `robe${realm}`, 'rate'), crown: piece('c', `band${realm}`, 'rate'),
    boots: piece('b', `ironboots${realm}`, 'sunder'), talisman: piece('t', `bonecharm${realm}`, 'sunder'), ring: piece('g', `frostring${realm}`, 'sunder'),
  },
  chest: [], self: 'woman', stance: 'swift', sequence: ['crane'], tribulation: 0, tribulationAt: 0,
  tower: 0, brewed: { body: 0, bane: 0, fortune: 0 }, awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew'],
  seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage', 'fuse', 'whom'],
  crafts: {
    xp: { herb: lv(72), vein: lv(70), render: lv(68), forge: lv(66), alchemy: lv(76), sigil: lv(70), array: lv(40) },
    since: at - 5, task: 'alchemy:might7', made: { 'alchemy:might7': 6, 'sigil:fivethunder': 3 },
    tools: { herb: 4, vein: 4, render: 3, forge: 4, alchemy: 4, sigil: 3 }, arrays: [],
    pouch: { vine: 900, beard: 0, fern: 1200, bark: 2000, cinnabar: 900, thunderore: 400, 'part:ogre': 300, 'part:tiger': 300,
      'part:goblin': 120, 'part:wraith': 40, 'might7@2': 2, 'guard7@0': 1, 'sigil:fivethunder@1': 2, 'sigil:binding@0': 1 },
    carry: { elixir: 'might7@2', sigil: 'sigil:fivethunder@1' }, seek: 0,
  },
};
// 塔 Stand under the first floor this body wins less than half the time with nothing carried.
{
  const s = validate(save, at);
  let f = 1;
  while (f < 200 && odds(s, floorBeast(f), floorPower(f)) >= 0.45) f++;
  save.tower = f - 1;
  console.log(`  standing under floor ${f}`);
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function open(width: number): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height: 860 }, deviceScaleFactor: 2 });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(([k, s]) => { localStorage.clear(); localStorage.setItem(k, s); }, [SAVE_KEY, JSON.stringify(save)]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('nav.tabs button', { timeout: 20000 });
  await page.waitForTimeout(900);
  await clear(page);
  return page;
}

async function clear(page: Page) {
  for (let i = 0; i < 10; i++) {
    const b = await page.$('.notice button, .awaken button, .home button');
    if (!b) break;
    await b.click().catch(() => {});
    await page.waitForTimeout(220);
  }
}

async function tab(page: Page, han: string) {
  await page.click(`nav.tabs button:has-text("${han}")`);
  await page.waitForTimeout(600);
  await clear(page);
}

/** Scroll the screen so this element sits near the top, then shoot the phone. */
async function shoot(page: Page, name: string, selector: string | null, offset = 70) {
  if (selector) {
    await page.evaluate(([sel, off]) => {
      const el = document.querySelector(sel as string);
      const box = [...document.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 40
        && /(auto|scroll)/.test(getComputedStyle(e).overflowY));
      if (el && box) box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - (off as number);
    }, [selector, offset]);
    await page.waitForTimeout(350);
  }
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path });
  console.log(`  ${path}`);
}

for (const width of [400, 320]) {
  const page = await open(width);
  const w = `${width}-${LABEL}`;
  // 業 The recipes, with their numbers.
  await tab(page, '業');
  await page.click('.crafts .cskill:has-text("Alchemy")');
  await page.waitForTimeout(300);
  await shoot(page, `crafts-alchemy-${w}`, '.crafts .crow', 120);
  await page.click('.crafts .cskill:has-text("Sigil")');
  await page.waitForTimeout(300);
  await shoot(page, `crafts-sigils-${w}`, '.crafts .crow', 120);
  // 攜 The pouch's carry panel says where a kit goes.
  const views = await page.$('.crafts .cswitch button:nth-child(2)');
  if (views && await views.isVisible()) { await views.click(); await page.waitForTimeout(300); }
  await shoot(page, `crafts-carry-${w}`, '.crafts .ccarry', 12);
  // 塔 The tower's card: what is carried, left below, then taken up.
  await tab(page, '塔');
  await shoot(page, `tower-kit-left-${w}`, '.towerduo .card', 100);
  const take = await page.$('.towerkit .tk-switch button:nth-child(2)');
  if (take) {
    await take.click();
    await page.waitForTimeout(1200);
    await shoot(page, `tower-kit-taken-${w}`, '.towerduo .card', 100);
  }
  // 擂 The Platform for a Vajra, and 器 the class line.
  await shoot(page, `platform-vajra-${w}`, '.plrow', 160);
  await tab(page, '器');
  await shoot(page, `gear-vajra-${w}`, '.calling', 40);
  await page.close();
}
await browser.close();
