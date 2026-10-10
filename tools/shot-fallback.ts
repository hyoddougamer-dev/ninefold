/**
 * 爐 The crucible of the first set, off the real build, at 400 and at 320 wide (rekaris,
 * Discord 2026-10-08: the lines of a Mortal Iron piece asked for Fallen Star Iron, Jadewater
 * Jade, Thunderscript Ore and Immortal Gold, none of which a first-realm cultivator can have).
 *
 *     npm run build && npx vite preview --port 4391 &
 *     SMOKE_URL=http://localhost:4391/ npx tsx tools/shot-fallback.ts <out dir> [before|after]
 *
 * The save is a fabricated cultivator who has just reached the workshop's realm and forges
 * the first set at Earth, read back through validate() first and planted with the scripts
 * blocked, as CLAUDE.md says. Run it against a build from before the change and one from
 * after, and the two folders are the pictures.
 */
import { chromium, type Page } from 'playwright';
import { mkdirSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { XP_TABLE } from '../src/data/crafts.ts';
import { commonsOf, wardenOf } from '../src/data/bestiary.ts';
import { validate } from '../src/sim/load.ts';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const OUT = process.argv[2] ?? 'fallback-shots';
const WHEN = process.argv[3] === 'before' ? 'before' : 'after';
mkdirSync(OUT, { recursive: true });

const at = Math.floor(Date.now() / 1000);
const lvl = (l: number) => XP_TABLE[l] + Math.floor((XP_TABLE[l + 1] - XP_TABLE[l]) * 0.4);
const SEEN = ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage', 'fuse', 'whom',
  'cave', 'secret', 'crafts', 'workshop'];

/** 業 A second-realm cultivator, the first with a workshop: forging the Mortal Iron set at Earth. */
function crafter() {
  const killed: Record<string, number> = {};
  for (const b of commonsOf(1)) killed[b.key] = 40;
  killed[wardenOf(1).key] = 3;
  return {
    v: 1, at, startedAt: at - 12 * 86400, realm: 2, layer: 4, qi: 1e6, materials: 1e6, wardenFell: false,
    levels: { technique: 12, method: 12, pills: 12, cores: 8 }, killed, worn: {}, chest: [],
    self: 'woman', stance: 'swift', sequence: [], tribulation: 0, tribulationAt: 0, tower: 8,
    awakened: ['feast', 'wolf', 'slaughter'], seen: SEEN,
    crafts: {
      xp: { herb: lvl(14), vein: lvl(14), render: lvl(12), forge: lvl(20), alchemy: lvl(1), sigil: lvl(1), array: lvl(1) },
      task: null, since: at,
      pouch: { metal1: 20, iron: 80, stone: 12, cinnabar: 30, moss: 40, [`part:${wardenOf(1).key}`]: 20 },
      made: {}, tools: { herb: 1, vein: 1, render: 1, forge: 1 }, arrays: [], cut: {},
      carry: { elixir: null, sigil: null }, seek: 0,
    },
  };
}

const save = validate(JSON.parse(JSON.stringify(crafter())), at + 5);
assert.equal(save.realm, 2, 'the cultivator has only just reached the workshop');

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function open(width: number): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height: 860 }, deviceScaleFactor: 2 });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, b, x]) => { localStorage.clear(); localStorage.setItem(k, x); localStorage.setItem(b, x); },
    [SAVE_KEY, BACKUP_KEY, JSON.stringify(save)]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(800);
  for (let i = 0; i < 8; i++) {
    const b = await page.$('.back button, .notice button, .awaken .later, .awaken button, .home button');
    if (!b) break;
    await b.click({ timeout: 1200 }).catch(() => {});
    await page.waitForTimeout(220);
  }
  return page;
}

async function shoot(page: Page, name: string, selector: string, offset = 12) {
  await page.evaluate(([sel, off]) => {
    const el = document.querySelector(sel as string);
    const box = [...document.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 40
      && /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.contains(el));
    if (el && box) box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - (off as number);
  }, [selector, offset] as const);
  await page.waitForTimeout(300);
  const file = `${OUT}/${WHEN}-${name}.png`;
  await page.screenshot({ path: file });
  console.log(`  ${file}`);
}

for (const width of [400, 320]) {
  const page = await open(width);
  await page.click('nav.tabs button:has-text("業")');
  await page.waitForTimeout(500);
  await page.click('.crafts .cskill:has-text("Forging")');
  await page.waitForTimeout(250);
  await page.click('.crafts .cgroups button:has-text("Hundredfold")');
  await page.waitForTimeout(300);
  // The first set, Earth, and the three lines rekaris named: rarer gear, fusion, drop chance.
  await page.click('.hundred .hu-crucible .hu-field:first-child .hu-chips button:first-child');
  await page.waitForTimeout(250);
  await page.click('.hundred .hu-crucible .hu-chips button:has(i.mono):has-text("Earth")');
  await page.waitForTimeout(250);
  for (const [i, affix] of ['luck', 'refine', 'find'].entries()) {
    await page.selectOption(`.hundred .hu-lines select >> nth=${i}`, affix);
    await page.waitForTimeout(150);
  }
  const lines = await page.$eval('.hundred .hu-lines', (e) => e.textContent ?? '');
  const needs = await page.$eval('.hundred .hu-needs', (e) => e.textContent ?? '');
  const why = await page.$eval('.hundred .hu-why', (e) => e.textContent ?? '').catch(() => '');
  console.log(`  ${width} ${WHEN}: ${why || 'nothing in the way'}`);
  if (WHEN === 'after') {
    assert.ok(!lines.includes('opens at'), `${width}: no line waits on a later realm (${lines})`);
    assert.ok(lines.includes('Mortal Iron Ore') && needs.includes('Mortal Iron Ore'), `${width}: the set's own ore stands in`);
    assert.ok(!needs.includes('Fallen Star') && !needs.includes('Immortal Gold'), `${width}: nothing from the sixth or ninth realm is asked`);
    assert.equal(why, '', `${width}: nothing stands between the cultivator and the anvil`);
  } else {
    assert.ok(lines.includes('Vein Delving level 56, realm 6'), `${width}: the first rule still asks for Fallen Star Iron`);
  }
  await shoot(page, `${width}-1-lines`, '.hundred .hu-lines', 90);
  await shoot(page, `${width}-2-opens`, '.hundred .hu-opens', 8);
  await shoot(page, `${width}-3-needs`, '.hundred .hu-out', 8);
  // Heaven is still the rank that asks for the rare things.
  await page.click('.hundred .hu-crucible .hu-chips button:has(i.mono):has-text("Heaven")');
  await page.waitForTimeout(250);
  const heaven = await page.$eval('.hundred .hu-opens', (e) => e.textContent ?? '');
  if (WHEN === 'after') assert.ok(heaven.includes('Fallen Star Iron') && heaven.includes('Immortal Gold'), `${width}: Heaven asks for the usual materials`);
  await shoot(page, `${width}-4-heaven-opens`, '.hundred .hu-opens', 8);
  const over = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll('.hundred *')].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && (r.right > w + 1 || r.left < -1);
    }).length;
  });
  assert.equal(over, 0, `${width}: nothing hangs off the side`);
  await page.close();
}
await browser.close();
console.log(`✓ the crucible of the first set (${WHEN}), at 400 and 320`);
