/**
 * 承 The codex kept through a new life, on the real build: 譜 the codex page and 系 the sets
 * of a second life that carries sets an earlier life finished, and the Rebirth page of a
 * first life about to carry its codex across, at 400 and at 320 wide.
 *
 *     npm run build && npm run preview &
 *     SMOKE_URL=http://localhost:4173/ npx tsx tools/shot-codexkept.ts <out dir>
 *
 * Both saves are fabricated and read back through validate() first, so the screen is never
 * shown a state the game would refuse; they are planted with the scripts blocked, as
 * CLAUDE.md says (the app rewrites its save on unload). It checks what it shoots: every set
 * a life before finished reads as earned with the quiet note, the set this life finished
 * itself carries no note, the Rebirth page lists the codex among what carries, and nothing
 * hangs off a 320 screen.
 */
import { chromium, type Page } from 'playwright';
import { mkdirSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { XP_TABLE, hundredElite, hundredKey, type HundredRank } from '../src/data/crafts.ts';
import { SLOTS } from '../src/data/gear.ts';
import { commonsOf, wardenOf } from '../src/data/bestiary.ts';
import { codexHeld, codexRank, codexToKeep, hundredFits, keptRank } from '../src/sim/hundred.ts';
import { canReincarnate } from '../src/sim/rebirth.ts';
import { validate } from '../src/sim/load.ts';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const OUT = process.argv[2] ?? 'codexkept-shots';
mkdirSync(OUT, { recursive: true });

const DAY = 86_400;
const at = Math.floor(Date.now() / 1000);
const lvl = (l: number) => XP_TABLE[l] + Math.floor((XP_TABLE[l + 1] - XP_TABLE[l]) * 0.4);
const SEEN = ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage', 'fuse',
  'whom', 'cave', 'secret', 'crafts', 'workshop'];

/** Every beast up to `realm` known to Rendering: forty of each common, ten of each elite, every warden. */
function known(realm: number): Record<string, number> {
  const killed: Record<string, number> = {};
  for (let r = 1; r <= realm; r++) {
    for (const b of commonsOf(r)) killed[b.key] = 40;
    killed[hundredElite(r).key] = Math.max(killed[hundredElite(r).key] ?? 0, 12);
    killed[wardenOf(r).key] = 1;
  }
  return killed;
}
const all = (made: Record<string, number>, realm: number, rank: HundredRank) => {
  for (const slot of SLOTS) made[hundredKey(realm, slot, rank)] = 1;
};

/**
 * 世 A second life in the sixth realm. The life before finished 凡鐵 枯骨 古銅 and 落星 at
 * Heaven and 霜銀 at Earth; this one has made Mortal Iron again at Mystic (lower than kept,
 * so the kept rank shows) and finished Jadewater at Earth itself (no note).
 */
function second() {
  const made: Record<string, number> = {};
  all(made, 1, 'mystic');
  all(made, 5, 'mystic'); all(made, 5, 'earth');
  return {
    v: 1, at, startedAt: at - 150 * DAY, realm: 6, layer: 4, qi: 1e9, materials: 1e9, wardenFell: false,
    levels: { technique: 36, method: 36, pills: 36, cores: 30 }, killed: known(5), worn: {}, chest: [],
    self: 'woman', stance: 'swift', sequence: ['crane', 'tiger'], tribulation: 0, tribulationAt: 0, tower: 40,
    brewed: { body: 10, bane: 6, fortune: 4 }, awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard'],
    seen: SEEN,
    crafts: {
      xp: { herb: lvl(62), vein: lvl(60), render: lvl(66), forge: lvl(72), alchemy: lvl(56), sigil: lvl(50), array: lvl(30) },
      task: null, since: at - 3000, made, tools: { herb: 3, vein: 3, render: 2, forge: 4, alchemy: 2 }, arrays: [], cut: {},
      pouch: {}, carry: { elixir: null, sigil: null }, seek: 0,
    },
    lives: [{ marks: 3, at: at - 40 * DAY }],
    codexKept: [3, 3, 3, 2, 0, 3, 0, 0, 0],
  };
}

/** 頂 A first life at the summit, the first Dragon crossed, three sets finished at Heaven: what it would carry. */
function summit() {
  const made: Record<string, number> = {};
  for (const r of [1, 2, 3]) { all(made, r, 'mystic'); all(made, r, 'heaven'); }
  all(made, 4, 'earth');
  const cap = 9 * 6 + 6;
  return {
    v: 1, at, startedAt: at - 160 * DAY, realm: 9, layer: 8, qi: 1e12, materials: 1e12, wardenFell: false,
    levels: { technique: cap, method: cap, pills: cap, cores: cap - 6 }, killed: known(9),
    worn: { weapon: { id: 'w', template: 'sword9', rarity: 'heaven', rolls: [{ affix: 'power', value: 40 }] } }, chest: [],
    unlocked: [], self: 'woman', stance: 'swift', sequence: ['crane'], tribulation: 3, tribulationAt: 0, tower: 160,
    brewed: { body: 60, bane: 50, fortune: 40 },
    awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought', 'formula'],
    met: [], metAt: 0, metPoints: 0, runStep: -1, runAt: 0, runs: 0, quarryWeek: -1, seen: SEEN,
    crafts: {
      xp: { herb: lvl(80), vein: lvl(80), render: lvl(80), forge: lvl(90), alchemy: lvl(80), sigil: lvl(70), array: lvl(50) },
      task: null, since: at - 3000, made, tools: {}, arrays: [], cut: {}, pouch: {}, carry: { elixir: null, sigil: null }, seek: 0,
    },
    lives: [],
  };
}

// 守 What the screen is shown is what the game would keep.
const s2 = validate(JSON.parse(JSON.stringify(second())), at + 5);
assert(hundredFits(s2), 'second life: a save the server would take');
assert.deepEqual(s2.codexKept, [3, 3, 3, 2, 0, 3, 0, 0, 0], 'second life: the kept codex survives validate()');
assert.equal(codexRank(s2.crafts.made, 1), 1, 'second life: Mortal Iron made again at Mystic');
assert.equal(codexHeld(s2, 1), 3, 'second life: Mortal Iron reads at its kept Heaven');
assert.equal(codexRank(s2.crafts.made, 5), 2, 'second life: Jadewater finished at Earth in this life');
const notes = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((r) => keptRank(s2.codexKept, r) > codexRank(s2.crafts.made, r)).length;
const s1 = validate(JSON.parse(JSON.stringify(summit())), at + 5);
assert(canReincarnate(s1), 'summit: a life that may end');
assert.equal(codexToKeep(s1).filter((r) => r > 0).length, 4, 'summit: four sets finished, all four carried');

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
let failures = 0;
const check = (ok: boolean, what: string) => { if (!ok) { failures++; console.log(`  ✗ ${what}`); } };

async function clear(page: Page) {
  for (let i = 0; i < 8; i++) {
    const b = await page.$('.back button, .notice button, .awaken .later, .awaken button, .home button');
    if (!b) break;
    await b.click({ timeout: 1200 }).catch(() => {});
    await page.waitForTimeout(220);
  }
}

async function open(width: number, save: unknown): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, b, s]) => { localStorage.clear(); localStorage.setItem(k, s); localStorage.setItem(b, s); },
    [SAVE_KEY, BACKUP_KEY, JSON.stringify(save)]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(800);
  await clear(page);
  return page;
}

/** Scroll so this element sits near the top of whatever scrolls, then shoot the phone. */
async function shoot(page: Page, name: string, selector: string | null, offset = 12) {
  if (selector) {
    await page.evaluate(([sel, off]) => {
      const el = document.querySelector(sel as string);
      const boxes = [...document.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 40
        && /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.contains(el));
      const box = boxes[boxes.length - 1];
      if (el && box) box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - (off as number);
    }, [selector, offset]);
    await page.waitForTimeout(300);
  }
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file });
  console.log(`  ${file}`);
}

/** Off the page's right edge, or under its left: the 320 rule (CLAUDE.md). */
async function fits(page: Page, root: string, what: string) {
  const over = await page.evaluate((sel) => {
    const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll(`${sel} *`)].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && (r.right > w + 1 || r.left < -1);
    }).map((e) => `${e.tagName.toLowerCase()}.${(e as HTMLElement).className}`).slice(0, 5);
  }, root);
  check(over.length === 0, `${what}: nothing hangs off a phone (${over.join(', ')})`);
}

for (const width of [400, 320]) {
  // 1. 譜 The codex page of the second life.
  const page = await open(width, second());
  await page.click('nav.tabs button:has-text("業")');
  await page.waitForTimeout(600);
  await clear(page);
  await page.click('.crafts .cskill:has-text("Forging")');
  await page.waitForTimeout(250);
  await page.click('.crafts .cgroups button:has-text("Hundredfold")');
  await page.waitForTimeout(300);
  await page.click('.hundred .hu-tabs button:nth-child(3)');
  await page.waitForTimeout(300);
  const earned = await page.$$eval('.hundred .hu-cx[data-earned]', (xs) => xs.length);
  const kept = await page.$$eval('.hundred .hu-cx .hu-kept', (xs) => xs.map((x) => x.textContent ?? ''));
  check(earned === 6, `${width}: six codex rows read as earned (${earned})`);
  check(kept.length === notes && kept.every((t) => t === 'kept from a past life'), `${width}: ${notes} rows say kept from a past life (${kept.length})`);
  const jade = await page.$eval('.hundred .hu-cx:nth-of-type(5)', (e) => e.textContent ?? '');
  check(!jade.includes('past life'), `${width}: the set this life finished itself carries no note`);
  await shoot(page, `codex-${width}`, '.hundred .hu-tabs', 8);
  await fits(page, '.hundred', `codex ${width}`);
  await shoot(page, `codex-rows-${width}`, '.hundred .hu-cx:nth-of-type(4)', 8);
  // 系 And the sets, where a set kept says so under this life's own six places.
  await page.click('.hundred .hu-tabs button:nth-child(2)');
  await page.waitForTimeout(300);
  const setNotes = await page.$$eval('.hundred .hu-set .hu-kept', (xs) => xs.length);
  check(setNotes === notes, `${width}: ${notes} sets say they were finished in a past life (${setNotes})`);
  await shoot(page, `sets-${width}`, '.hundred .hu-tabs', 8);
  await fits(page, '.hundred', `sets ${width}`);
  await page.close();

  // 2. 轉世 The Rebirth page of a first life with four sets finished, and the life after it.
  const rb = await open(width, summit());
  await rb.locator('nav.tabs button', { hasText: /cultivate/i }).first().click();
  await rb.waitForTimeout(400);
  await clear(rb);
  await rb.evaluate(() => document.querySelector('.rebirthline')?.scrollIntoView({ block: 'center' }));
  await rb.click('.rebirthline');
  await rb.waitForSelector('.rebirthsheet', { timeout: 5000 });
  await rb.waitForTimeout(400);
  const carry = await rb.$$eval('.rebirthsheet .rb-carry li', (xs) => xs.map((x) => x.textContent ?? ''));
  check(carry.some((t) => t.includes('譜') && t.includes('The codex') && t.includes('(4 sets now)')),
    `${width}: the codex is among what carries, with its four sets (${carry.join(' | ')})`);
  const resets = await rb.$eval('.rebirthsheet .rb-two .rb-card:nth-child(2) p', (e) => e.textContent ?? '');
  check(resets.includes('all but its codex'), `${width}: what begins again says the codex does not`);
  await fits(rb, '.rebirthsheet', `rebirth ${width}`);
  await shoot(rb, `rebirth-${width}`, '.rebirthsheet .rb-two', 60);
  await rb.evaluate(() => { const s = document.querySelector('.rebirthsheet'); if (s) s.scrollTop = s.scrollHeight; });
  await rb.click('.rb-confirm .act');
  await rb.waitForTimeout(250);
  await rb.click('.rb-confirm .act');
  await rb.waitForSelector('.rebirthsheet[data-born="true"]', { timeout: 5000 });
  await rb.waitForTimeout(500);
  const born = await rb.$eval('.rebirthsheet', (e) => e.textContent ?? '');
  check(born.includes('The codex comes with you: 4 sets'), `${width}: the new life says the codex came with it`);
  await fits(rb, '.rebirthsheet', `born ${width}`);
  await shoot(rb, `born-${width}`, null);
  await rb.close();
}

await browser.close();
if (failures) { console.log(`✗ ${failures} checks failed`); process.exit(1); }
console.log('✓ the codex kept reads as earned with its note, the sets say so, and the Rebirth page carries it, at 400 and 320');
