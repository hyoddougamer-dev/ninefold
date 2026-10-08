/**
 * 形 開 宿慧 Four small things off the real build (2026-10-08), at 400 and at 320 wide:
 *
 *   - a crucible line not yet in reach saying when it opens, and the 'what opens when' list;
 *   - the crucible's shape picker, one chip a line with the looks under it;
 *   - the forge's gear list, one row a piece with a switcher of looks;
 *   - the Rebirth confirm at the first allowed moment, with the exact Echo it promises,
 *     checked against what the new life then carries.
 *
 *     npm run build && npx vite preview --port 4391 &
 *     SMOKE_URL=http://localhost:4391/ npx tsx tools/shot-looks.ts <out dir>
 *
 * The saves are fabricated and read back through validate() first; they are planted with
 * the scripts blocked, as CLAUDE.md says (the app rewrites its save on unload).
 */
import { chromium, type Page } from 'playwright';
import { mkdirSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { XP_TABLE } from '../src/data/crafts.ts';
import { CRUCIBLE } from '../src/data/hundred.ts';
import { materialGate, materialReached } from '../src/sim/hundred.ts';
import { validate } from '../src/sim/state.ts';
import { echoAfter } from '../src/sim/rebirth.ts';
import { ECHO_FIRST } from '../src/sim/balance.ts';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const OUT = process.argv[2] ?? 'looks-shots';
mkdirSync(OUT, { recursive: true });

const at = Math.floor(Date.now() / 1000);
const lvl = (l: number) => XP_TABLE[l] + Math.floor((XP_TABLE[l + 1] - XP_TABLE[l]) * 0.4);
const SEEN = ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage', 'fuse', 'whom',
  'cave', 'secret', 'crafts', 'workshop'];

/** 業 A fourth-realm crafter: rekaris's case, Vein Delving short of Fallen Star Iron's 56. */
function crafter() {
  const killed: Record<string, number> = {};
  for (const k of ['rat', 'hound', 'frog', 'serpent', 'mantis', 'bat', 'beetle', 'owl', 'raven', 'boar', 'wolf', 'vulture']) killed[k] = 40;
  for (const k of ['fox', 'ape', 'crane', 'tiger']) killed[k] = 1;
  return {
    v: 1, at, startedAt: at - 30 * 86400, realm: 4, layer: 4, qi: 1e7, materials: 1e7, wardenFell: false,
    levels: { technique: 22, method: 22, pills: 22, cores: 18 }, killed, worn: {}, chest: [],
    self: 'woman', stance: 'swift', sequence: ['crane', 'tiger'], tribulation: 0, tribulationAt: 0, tower: 20,
    awakened: ['feast', 'wolf', 'slaughter'], seen: SEEN,
    crafts: {
      xp: { herb: lvl(40), vein: lvl(40), render: lvl(42), forge: lvl(44), alchemy: lvl(10), sigil: lvl(1), array: lvl(1) },
      task: null, since: at, pouch: { metal1: 20, metal4: 20, 'part:hound': 20, 'part:fox': 4, cinnabar: 30, moss: 40, stone: 30 },
      made: {}, tools: { herb: 2, vein: 2, render: 2, forge: 2 }, arrays: [], cut: {},
      carry: { elixir: null, sigil: null }, seek: 0,
    },
  };
}

/** 轉世 At the summit with the first Dragon crossed: the first moment a life may end. */
function summit() {
  const killed = { rat: 40, hound: 30, frog: 20, serpent: 20, mantis: 15, bat: 12, beetle: 12, owl: 8, raven: 8, boar: 8,
    wolf: 6, vulture: 6, crab: 6, jellyfish: 5, lizard: 5, centipede: 4, scorpion: 4, gargoyle: 3, minotaur: 3, squid: 3,
    fox: 1, ape: 1, crane: 1, tiger: 1, turtle: 1, golem: 1, direwolf: 1, jiao: 1 };
  return {
    v: 1, at, startedAt: at - 160 * 86400, realm: 9, layer: 8, qi: 1e12, materials: 1e12, wardenFell: false,
    levels: { technique: 60, method: 60, pills: 60, cores: 54 }, killed,
    worn: { weapon: { id: 'w', template: 'sword9', rarity: 'heaven', rolls: [{ affix: 'power', value: 40 }] } }, chest: [],
    unlocked: [], self: 'woman', stance: 'swift', sequence: ['crane'], tribulation: 1, tribulationAt: 0, tower: 160,
    brewed: { body: 60, bane: 50, fortune: 40 },
    awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought', 'formula'],
    seen: SEEN.slice(0, 14), lives: [],
  };
}

// 守 What the screen is shown is what the game would keep, and the case is the one asked about.
const c = validate(JSON.parse(JSON.stringify(crafter())), at + 5);
const star = CRUCIBLE.luck(1);
assert.equal(c.realm, 4, 'the crafter is in the fourth realm');
assert.equal(materialReached(c, star), false, 'Fallen Star Iron is out of reach, as it was for rekaris');
assert.deepEqual(materialGate(star), { skill: 'vein', level: 56, realm: 6 });
const s = validate(JSON.parse(JSON.stringify(summit())), at + 5);
assert.equal(s.tribulation, 1, 'one mark crossed');
const promised = echoAfter(s);
assert.ok(Math.abs(promised - ECHO_FIRST) < 1e-9, 'the first allowed rebirth leaves ECHO_FIRST');

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function clear(page: Page) {
  for (let i = 0; i < 8; i++) {
    const b = await page.$('.back button, .notice button, .awaken .later, .awaken button, .home button');
    if (!b) break;
    await b.click({ timeout: 1200 }).catch(() => {});
    await page.waitForTimeout(220);
  }
}

async function open(width: number, save: unknown): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height: 860 }, deviceScaleFactor: 2 });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, b, x]) => { localStorage.clear(); localStorage.setItem(k, x); localStorage.setItem(b, x); },
    [SAVE_KEY, BACKUP_KEY, JSON.stringify(save)]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(800);
  await clear(page);
  return page;
}

/** Scroll so this element sits near the top of whatever scrolls, then shoot the phone. */
async function shoot(page: Page, name: string, selector: string, offset = 12) {
  await page.evaluate(([sel, off]) => {
    const el = document.querySelector(sel as string);
    const box = [...document.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 40
      && /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.contains(el));
    if (el && box) box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - (off as number);
  }, [selector, offset] as const);
  await page.waitForTimeout(300);
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file });
  console.log(`  ${file}`);
}

/** Nothing under these selectors hangs off a phone (CLAUDE.md: look at 320 as well as 400). */
async function fits(page: Page, scope: string, what: string) {
  const over = await page.evaluate((sc) => {
    const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll(`${sc} *`)].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && (r.right > w + 1 || r.left < -1);
    }).map((e) => `${e.tagName.toLowerCase()}.${(e as HTMLElement).className}`).slice(0, 5);
  }, scope);
  assert.deepEqual(over, [], `${what}: nothing hangs off the side`);
}

for (const width of [400, 320]) {
  // 開 The crucible, on the first set, with the rarer gear line chosen.
  const page = await open(width, crafter());
  await page.click('nav.tabs button:has-text("業")');
  await page.waitForTimeout(500);
  await clear(page);
  await page.click('.crafts .cskill:has-text("Forging")');
  await page.waitForTimeout(250);
  await page.click('.crafts .cgroups button:has-text("Hundredfold")');
  await page.waitForTimeout(300);
  await page.click('.hundred .hu-crucible .hu-field:first-child .hu-chips button:first-child');
  await page.waitForTimeout(250);
  await page.selectOption('.hundred .hu-lines select >> nth=0', 'luck');
  await page.waitForTimeout(250);
  const said = await page.$eval('.hundred .hu-lines', (e) => e.textContent ?? '');
  assert.ok(said.includes('opens at Vein Delving level 56, realm 6'), `${width}: the locked line says when it opens (${said})`);
  const why = await page.$eval('.hundred .hu-why', (e) => e.textContent ?? '').catch(() => '');
  console.log(`  ${width}: ${why}`);
  await fits(page, '.hundred', `crucible ${width}`);
  await shoot(page, `${width}-1-locked-line`, '.hundred .hu-lines', 90);
  await shoot(page, `${width}-2-opens-when`, '.hundred .hu-opens', 8);
  const rows = await page.$$eval('.hundred .hu-open', (es) => es.length);
  assert.equal(rows, 8, `${width}: every line is in the plan`);
  await shoot(page, `${width}-3-shape-picker`, '.hundred .hu-crucible .hu-field:nth-child(3)', 70);
  const lineChips = await page.$$eval('.hundred .hu-crucible .hu-field:nth-child(3) .hu-chips button', (es) => es.length);
  assert.equal(lineChips, 5, `${width}: five weapon lines, not nine shapes`);
  await page.click('.hundred .hu-looks button:nth-child(2)');
  await page.waitForTimeout(250);
  await shoot(page, `${width}-4-shape-picker-saber`, '.hundred .hu-crucible .hu-field:nth-child(3)', 70);

  // 形 The forge's gear list, weapons, grouped by line.
  await page.click('.crafts .cgroups button:has-text("Gear")');
  await page.waitForTimeout(300);
  await page.click('.crafts .cslot button:has-text("Weapon")').catch(() => {});
  await page.waitForTimeout(300);
  const groups = await page.$$eval('.crafts .crecipes .cr-looks', (es) => es.length);
  assert.ok(groups > 0, `${width}: some pieces come in several looks`);
  await fits(page, '.crafts .crecipes', `forge list ${width}`);
  await shoot(page, `${width}-5-forge-list`, '.crafts .ctier', 8);
  await page.close();

  // 宿慧 The Rebirth confirm at the first allowed moment.
  const rb = await open(width, summit());
  await rb.locator('nav.tabs button', { hasText: /cultivate/i }).first().click();
  await rb.waitForTimeout(400);
  await clear(rb);
  await rb.click('.rebirthline');
  await rb.waitForSelector('.rebirthsheet', { timeout: 5000 });
  await rb.click('.rb-confirm .act');
  await rb.waitForTimeout(300);
  const promise = await rb.$eval('.rb-promise', (e) => e.textContent ?? '');
  assert.ok(promise.includes('+5%'), `${width}: the confirm promises +5% (${promise})`);
  await rb.evaluate(() => { const x = document.querySelector('.rebirthsheet'); if (x) x.scrollTop = x.scrollHeight; });
  await rb.waitForTimeout(250);
  await fits(rb, '.rebirthsheet', `rebirth ${width}`);
  const file = `${OUT}/${width}-6-rebirth-confirm.png`;
  await rb.screenshot({ path: file });
  console.log(`  ${file}`);
  await rb.click('.rb-confirm .act');
  await rb.waitForSelector('.rebirthsheet[data-born="true"]', { timeout: 5000 });
  const born = await rb.$eval('.rebirthsheet', (e) => e.textContent ?? '');
  assert.ok(born.includes('+5%'), `${width}: the new life carries what was promised (${born.slice(0, 200)})`);
  await rb.close();
}
await browser.close();
console.log('✓ the locked line, the plan, the looks, the grouped forge and the exact Echo, at 400 and 320');
