/**
 * 業 轉世 The workshop through a rebirth, shot off the real game: the Rebirth page saying
 * what is kept, the line a new life opens with, and the Crafts screen of the second life's
 * first hour with the carry and without it.
 *
 *     npm run build && npm run preview &
 *     node tools/shot-carry.mjs <dir>
 *
 * Every picture is the game on a fabricated save, never a mockup of one. The traps CLAUDE.md
 * records apply: the save is planted with the scripts blocked, and a notice is dismissed
 * before anything is tapped. Each shot is taken at 400 and at 320 wide, and the script
 * checks what it shoots: the carry row is on the page, nothing hangs off the side of the
 * screen, and the Crafts screen shows the carried levels (not level 1) in the new life.
 * The PNGs are converted to webp with sharp before they are committed (docs/shots-carry).
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const dir = process.argv[2] ?? 'shots-carry';
mkdirSync(dir, { recursive: true });

// 經 RuneScape's table, the same one data/crafts.ts builds.
const XP = [0, 0];
{ let p = 0; for (let l = 1; l < 99; l++) { p += Math.floor(l + 300 * 2 ** (l / 7)); XP[l + 1] = Math.floor(p / 4); } }
const SHARE = 0.25;
/** The levels the life that ends here reached in each craft. */
const ENDED = { herb: 80, vein: 76, render: 70, forge: 74, alchemy: 72, sigil: 66, array: 60 };
const xpOf = (levels, share = 1) => Object.fromEntries(Object.entries(levels).map(([k, l]) => [k, Math.floor((XP[l] + Math.floor((XP[l + 1] - XP[l]) * 0.4)) * share)]));

const TAKEN = ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought', 'formula', 'ninerungs',
  'quickfire', 'sealbreaker'];
const SEEN = ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones',
  'bestiary', 'salvage', 'fuse', 'whom', 'cave', 'secret'];

/** A cultivator at the summit with three marks crossed, the workshop at the levels the life ended on. */
function summit(lives = []) {
  const at = Math.floor(Date.now() / 1000);
  const cap = 9 * 6 + 6;
  const killed = { rat: 40, hound: 30, frog: 20, serpent: 20, mantis: 15, bat: 12, beetle: 12,
                   owl: 8, raven: 8, boar: 8, wolf: 6, vulture: 6, crab: 6, jellyfish: 5,
                   lizard: 5, centipede: 4, scorpion: 4, gargoyle: 3, minotaur: 3, squid: 3,
                   fox: 1, ape: 1, crane: 1, tiger: 1, turtle: 1, golem: 1, direwolf: 1, jiao: 1 };
  return {
    v: 1, at, startedAt: at - 160 * 86400,
    realm: 9, layer: 8, qi: 1e12, materials: 1e12, wardenFell: false,
    levels: { technique: cap, method: cap, pills: cap, cores: cap - 6 },
    killed,
    worn: { weapon: { id: 'w', template: 'sword9', rarity: 'heaven', rolls: [{ affix: 'power', value: 40 }] } },
    chest: [],
    unlocked: [], self: 'woman', stance: 'swift', sequence: ['crane'],
    tribulation: 3, tribulationAt: 0, tower: 160,
    brewed: { body: 60, bane: 50, fortune: 40 },
    awakened: TAKEN.slice(0, 9),
    met: [], metAt: 0, metPoints: 0,
    beds: [{ herb: null, at: 0 }, { herb: null, at: 0 }, { herb: null, at: 0 }], reaped: 0,
    runStep: -1, runAt: 0, runs: 0, quarryWeek: -1,
    seen: SEEN,
    crafts: { xp: xpOf(ENDED), since: at - 5, made: {}, tools: {}, arrays: [], carry: { elixir: null, sigil: null }, seek: 0 },
    lives,
  };
}

/** The second life's first hour in the second realm, the workshop just open, with `share` of the last life's craft. */
function second(share) {
  const at = Math.floor(Date.now() / 1000);
  const killed = { rat: 40, hound: 30, frog: 20 };
  return {
    v: 1, at, startedAt: at - 160 * 86400,
    realm: 2, layer: 3, qi: 4e3, materials: 1.2e3, wardenFell: false,
    levels: { technique: 8, method: 6, pills: 6, cores: 2 },
    killed, worn: {}, chest: [], unlocked: [], self: 'woman', stance: 'swift', sequence: [],
    tribulation: 0, tribulationAt: 0, tower: 0, brewed: { body: 0, bane: 0, fortune: 0 }, awakened: ['feast'],
    met: [], metAt: 0, metPoints: 0, beds: [{ herb: null, at: 0 }, { herb: null, at: 0 }, { herb: null, at: 0 }], reaped: 0,
    runStep: -1, runAt: 0, runs: 0, quarryWeek: -1, seen: SEEN,
    crafts: { xp: xpOf(ENDED, share), since: at - 5, task: null, pouch: {}, made: {}, tools: {}, arrays: [], carry: { elixir: null, sigil: null }, seek: 0 },
    lives: [{ marks: 3, at: at - 3600 }],
  };
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
let page = null;
let failures = 0;
const check = (ok, what) => { if (!ok) { failures++; console.log(`  ✗ ${what}`); } };

const dismiss = async () => {
  for (let i = 0; i < 8; i++) {
    const b = await page.$('.back button, .notice button, .awaken .later');
    if (!b) break;
    try { await b.click({ timeout: 1500 }); } catch { break; }
    await page.waitForTimeout(250);
  }
};

const plant = async (save, width, height = 860) => {
  if (page) await page.close();
  page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
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
  await page.waitForTimeout(900);
  await dismiss();
};

const shot = async (name) => {
  const path = `${dir}/${name}.png`;
  await page.screenshot({ path });
  console.log(path);
};

const fits = async (what, sel) => {
  const over = await page.evaluate((q) => {
    const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll(q)]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > w + 0.5 || r.left < -0.5); })
      .map((e) => `${e.className || e.tagName} ${Math.round(e.getBoundingClientRect().right)}`).slice(0, 4);
  }, sel);
  check(over.length === 0, `${what}: off the side of the screen: ${over.join(', ')}`);
};

for (const width of [400, 320]) {
  // 1. The Rebirth page, from the Menu, at the summit: what is kept, with the workshop's row.
  await plant(summit(), width);
  await page.locator('nav.tabs button', { hasText: /cultivate/i }).first().click();
  await page.waitForTimeout(400);
  await dismiss();
  await page.evaluate(() => document.querySelector('.rebirthline')?.scrollIntoView({ block: 'center' }));
  await page.click('.rebirthline');
  await page.waitForSelector('.rebirthsheet', { timeout: 5000 });
  await page.waitForTimeout(400);
  const rows = await page.$$eval('.rb-carry li', (els) => els.map((e) => e.textContent ?? ''));
  const row = rows.find((t) => t.includes('The workshop')) ?? '';
  check(!!row, `${width}: the workshop has a row in what carries (${rows.length} rows)`);
  check(/25%/.test(row) && /begin at levels \d+ to \d+/.test(row), `${width}: the row says the share and where the crafts would begin (${row})`);
  const resets = await page.$eval('.rb-two .rb-card:last-child p', (e) => e.textContent ?? '');
  check(/but not its codex or its experience/.test(resets), `${width}: what begins again says the workshop keeps its experience (${resets.slice(0, 60)})`);
  await fits(`${width} page`, '.rebirthsheet *');
  await page.evaluate(() => document.querySelector('.rb-carry')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
  await shot(`${width}-1-carries`);

  // 2. The double tap, and the line the new life opens with.
  await page.click('.rb-confirm .act');
  await page.waitForTimeout(300);
  await page.click('.rb-confirm .act');
  await page.waitForSelector('.rebirthsheet[data-born="true"]', { timeout: 5000 });
  await page.waitForTimeout(500);
  const born = await page.$$eval('.rebirthsheet .rb-note', (els) => els.map((e) => e.textContent ?? ''));
  check(born.some((t) => /workshop comes with you in part/.test(t)), `${width}: the new life says the workshop came with it (${born.join(' | ')})`);
  await fits(`${width} born`, '.rebirthsheet *');
  await shot(`${width}-2-born`);

  // 3. The second life's first hour in the second realm, the Crafts screen: with the carry, and without it.
  for (const [tag, share] of [['with', SHARE], ['without', 0]]) {
    await plant(second(share), width);
    await page.waitForTimeout(1200);
    await dismiss();
    await page.click('nav.tabs button:has-text("業")');
    await page.waitForTimeout(700);
    await dismiss();
    const text = await page.evaluate(() => document.body.innerText);
    const total = Number((text.match(/Total(?: level)?\s+(\d+)/) ?? [])[1] ?? NaN);
    if (tag === 'with') check(total >= 300, `${width}: the Crafts screen of the second life shows the carried levels (total ${total} of 693)`);
    else check(total === 7, `${width}: without the carry every craft is back at level 1 (total ${total} of 693)`);
    await fits(`${width} crafts ${tag}`, '#root *');
    await shot(`${width}-3-crafts-${tag}`);
  }
}

await browser.close();
if (failures) { console.log(`✗ ${failures} checks failed`); process.exit(1); }
console.log('✓ the Rebirth page names the workshop, the new life says it came, and the Crafts screen shows the carried levels, at 400 and 320');
