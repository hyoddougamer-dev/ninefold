/**
 * 百煉 The Hundredfold sets on the real build: the crucible forging a piece, a half-made set,
 * the codex page and the Artifact Spirit, at 400 and at 320 wide.
 *
 *     npm run build && npm run preview &
 *     npx tsx tools/shot-hundred.ts <out dir>            (both widths)
 *
 * The save is fabricated, and built with the sim's own pieceOf so every line on every piece
 * is one the crucible makes; it is read back through validate() and hundredFits() first,
 * so the screen is never shown a state the game would refuse. Planted with the scripts
 * blocked, as CLAUDE.md says (the app rewrites its save on unload).
 */
import { chromium, type Page } from 'playwright';
import { mkdirSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { XP_TABLE, hundredKey, type HundredRank } from '../src/data/crafts.ts';
import { GEAR, SLOTS, type Item, type Slot } from '../src/data/gear.ts';
import { codexRank, hundredFits, pieceOf, spiritOf, type Order } from '../src/sim/hundred.ts';
import { validate } from '../src/sim/load.ts';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const SAVE_KEY = 'ninefold.save.v1';
const OUT = process.argv[2] ?? 'hundredfold-shots';
mkdirSync(OUT, { recursive: true });

const at = Math.floor(Date.now() / 1000);
const COMMONS: Record<number, string[]> = { 1: ['rat', 'hound', 'frog'], 2: ['serpent', 'mantis', 'bat'], 3: ['beetle', 'owl', 'raven'],
  4: ['boar', 'wolf', 'vulture'], 5: ['crab', 'jellyfish', 'lizard'], 6: ['centipede', 'scorpion', 'worm'] };
const WARDENS = ['fox', 'ape', 'crane', 'tiger', 'turtle', 'golem'];
const lvl = (l: number) => XP_TABLE[l] + Math.floor((XP_TABLE[l + 1] - XP_TABLE[l]) * 0.4);

/** A piece the crucible makes: the power shape of a realm's place, power and sunder and qi and luck lines. */
function forged(realm: number, slot: Slot, rarity: HundredRank, id: string): Item {
  const shapes = GEAR.filter((g) => g.realm === realm && g.slot === slot);
  const tpl = shapes.find((g) => g.affix === 'power') ?? shapes[0];
  const axes = (['power', 'sunder', 'rate', 'luck', 'capacity'] as const).filter((a) => a !== tpl.affix);
  const n = { mystic: 2, earth: 3, heaven: 4 }[rarity];
  const o: Order = { template: tpl.key, rarity, main: 3, lines: axes.slice(0, n).map((affix, i) => ({ affix, n: (i % 3 + 1) as 1 | 2 | 3 })) };
  return pieceOf(o, id)!;
}

const made: Record<string, number> = {};
const put = (realm: number, slot: Slot, rank: HundredRank, n = 1) => { made[hundredKey(realm, slot, rank)] = n; };
// 凡鐵 枯骨 古銅 finished at Heaven, 霜銀 at Earth, 碧玉 half made, 落星 begun.
for (const r of [1, 2, 3]) for (const slot of SLOTS) { put(r, slot, 'mystic'); put(r, slot, 'heaven'); }
for (const slot of SLOTS) put(4, slot, 'earth');
put(5, 'weapon', 'earth'); put(5, 'robe', 'mystic'); put(5, 'crown', 'earth');
put(6, 'weapon', 'mystic');

const killed: Record<string, number> = {};
for (let r = 1; r <= 6; r++) for (const k of COMMONS[r]) killed[k] = 40 + r * 6;
WARDENS.slice(0, 5).forEach((k) => { killed[k] = 1; });
killed.golem = 1;

const order: Order = { template: 'sword6', rarity: 'earth', main: 3,
  lines: [{ affix: 'sunder', n: 3 }, { affix: 'luck', n: 2 }, { affix: 'rate', n: 1 }] };

/** 器靈 Six Heaven pieces of Elder Bronze worn: the spirit of the third realm's set is awake. */
const spiritWorn = Object.fromEntries(SLOTS.map((slot) => [slot, forged(3, slot, 'heaven', `w-${slot}`)]));
const plainWorn = { weapon: forged(5, 'weapon', 'earth', 'w-weapon'), robe: forged(5, 'robe', 'mystic', 'w-robe'),
  crown: forged(5, 'crown', 'earth', 'w-crown'), boots: { id: 'b', template: 'greaves6', rarity: 'earth', rolls: [{ affix: 'power', value: 30 }] } };

function save(worn: Record<string, unknown>) {
  return {
    v: 1, at, startedAt: at - 70 * 86400, realm: 6, layer: 6, qi: 1e9, materials: 1e9, wardenFell: false,
    levels: { technique: 36, method: 36, pills: 36, cores: 30 }, killed, worn, chest: [],
    self: 'woman', stance: 'swift', sequence: ['crane', 'tiger'], tribulation: 0, tribulationAt: 0, tower: 60,
    brewed: { body: 10, bane: 6, fortune: 4 }, awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard'],
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage', 'fuse', 'whom', 'cave', 'secret', 'crafts', 'workshop'],
    crafts: {
      xp: { herb: lvl(62), vein: lvl(60), render: lvl(66), forge: lvl(72), alchemy: lvl(56), sigil: lvl(50), array: lvl(30) },
      task: 'forge:hundred:6:weapon:earth', since: at - 3000, order,
      pouch: { metal6: 9, 'part:worm': 70, 'part:golem': 4, 'part:scorpion': 12, starfall: 40, fern: 90, cinnabar: 50, jade: 20, stone: 40,
        metal5: 6, 'part:lizard': 20, 'part:turtle': 3, ginseng: 30 },
      made, tools: { herb: 3, vein: 3, render: 2, forge: 4, alchemy: 2 }, arrays: [], cut: {},
      carry: { elixir: null, sigil: null }, seek: 0,
    },
  };
}

// 守 What the screen is shown is what the game would keep.
for (const [name, worn] of [['plain', plainWorn], ['spirit', spiritWorn]] as const) {
  const s = validate(JSON.parse(JSON.stringify(save(worn))), at + 5);
  assert(hundredFits(s), `${name}: the fabricated save is one the server would take`);
  assert.equal(s.crafts.task, 'forge:hundred:6:weapon:earth', `${name}: the forge is on the piece`);
  assert.equal(codexRank(s.crafts.made, 3), 3, `${name}: Elder Bronze finished at Heaven`);
  assert.equal(codexRank(s.crafts.made, 4), 2, `${name}: Frostsilver finished at Earth`);
  if (name === 'spirit') assert.equal(spiritOf(s.worn), 3, 'the spirit of Elder Bronze is awake');
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function clear(page: Page) {
  for (let i = 0; i < 8; i++) {
    const b = await page.$('.notice button, .awaken button, .home button');
    if (!b) break;
    await b.click({ timeout: 1200 }).catch(() => {});
    await page.waitForTimeout(220);
  }
}

async function open(width: number, worn: Record<string, unknown>, tab: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, s]) => localStorage.setItem(k, s), [SAVE_KEY, JSON.stringify(save(worn))]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(800);
  await clear(page);
  await page.click(`nav.tabs button:has-text("${tab}")`);
  await page.waitForTimeout(600);
  await clear(page);
  return page;
}

/** Scroll so this element sits near the top, then shoot the phone. */
async function shoot(page: Page, name: string, selector: string | null, offset = 12) {
  if (selector) {
    await page.evaluate(([sel, off]) => {
      const el = document.querySelector(sel as string);
      const box = [...document.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 40
        && /(auto|scroll)/.test(getComputedStyle(e).overflowY));
      if (el && box) box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - (off as number);
    }, [selector, offset]);
    await page.waitForTimeout(300);
  }
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file });
  console.log(`  ${file}`);
}

/** Off the page's right edge, or under its left: the 320 rule (CLAUDE.md). */
async function fits(page: Page, what: string) {
  const over = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll('.hundred *')].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && (r.right > w + 1 || r.left < -1);
    }).map((e) => `${e.tagName.toLowerCase()}.${(e as HTMLElement).className}`).slice(0, 5);
  });
  assert.deepEqual(over, [], `${what}: nothing in the Hundredfold section hangs off a phone`);
}

for (const width of [400, 320]) {
  const page = await open(width, plainWorn, '業');
  await page.click('.crafts .cskill:has-text("Forging")');
  await page.waitForTimeout(250);
  await page.click('.crafts .cgroups button:has-text("Hundredfold")');
  await page.waitForTimeout(300);
  await shoot(page, `crucible-${width}`, '.crafts .cgroups', 8);
  await fits(page, `crucible ${width}`);
  await shoot(page, `crucible-lines-${width}`, '.hundred .hu-lines', 8);
  await shoot(page, `crucible-out-${width}`, '.hundred .hu-out', 8);
  await page.click('.hundred .hu-tabs button:nth-child(2)');
  await page.waitForTimeout(300);
  await shoot(page, `sets-${width}`, '.hundred .hu-tabs', 8);
  await fits(page, `sets ${width}`);
  await shoot(page, `sets-half-${width}`, '.hundred .hu-set:nth-of-type(5)', 120);
  await page.click('.hundred .hu-tabs button:nth-child(3)');
  await page.waitForTimeout(300);
  await shoot(page, `codex-${width}`, '.hundred .hu-tabs', 8);
  await fits(page, `codex ${width}`);
  await page.close();

  const sp = await open(width, spiritWorn, '業');
  await sp.click('.crafts .cskill:has-text("Forging")');
  await sp.waitForTimeout(250);
  await sp.click('.crafts .cgroups button:has-text("Hundredfold")');
  await sp.waitForTimeout(250);
  await sp.click('.hundred .hu-tabs button:nth-child(3)');
  await sp.waitForTimeout(300);
  await shoot(sp, `spirit-codex-${width}`, '.hundred .hu-spirit', 260);
  await sp.click('nav.tabs button:has-text("器")');
  await sp.waitForTimeout(700);
  await clear(sp);
  await shoot(sp, `spirit-gear-${width}`, '.wheel', 20);
  await sp.close();
}
await browser.close();
