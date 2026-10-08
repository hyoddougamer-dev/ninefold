/**
 * 圍 境 The two things the testers asked for on 2026-10-08, shot off the real build at 400 and
 * 320 wide, and measured:
 *
 *   圍 rekaris: "Why only the best 60?" The Drive's window lists every piece the drive
 *      dropped (a 2000-kill drive here), draws sixty at a time, and Select all and Clear act
 *      on the whole filtered set.
 *   境 razielmorgenstern: the hunt list says which realm each beast belongs to.
 *
 *     npm run build && npm run preview &
 *     SMOKE_URL=http://localhost:4173/ npx tsx tools/shot-requests.ts <out dir> [pile|realm|both]
 *
 * The saves are fabricated from the sim itself (a real drive's real pieces) and planted with
 * the scripts blocked, as CLAUDE.md says: the app rewrites its save on unload. What the
 * window does is checked against the save the game wrote back (opened with seal.ts).
 */
import { chromium, type Page } from 'playwright';
import { mkdirSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { BEASTS, commonsOf } from '../src/data/bestiary.ts';
import { drive } from '../src/sim/hunt.ts';
import { holdDrops } from '../src/sim/pile.ts';
import { newState, validate, type State } from '../src/sim/state.ts';
import { open } from '../src/sim/seal.ts';
import { MARKS } from '../src/sim/record.ts';
import { DRIVE_MOST, PILE_PAGE } from '../src/sim/balance.ts';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const OUT = process.argv[2] ?? 'request-shots';
const MODE = process.argv[3] ?? 'both';
mkdirSync(OUT, { recursive: true });

const SEEN = ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage', 'fuse',
  'whom', 'cave', 'secret', 'crafts', 'workshop', 'whom'];

/** A fifth-realm cultivator. `known` is how many kills each common of the first five realms has. */
function cultivator(known: number, extra: Partial<State> = {}): State {
  const at = Math.floor(Date.now() / 1000) - 30;
  const killed: Record<string, number> = {};
  for (let r = 1; r <= 5; r++) for (const b of commonsOf(r)) killed[b.key] = known;
  const s = {
    ...newState(at), startedAt: at - 40 * 86_400, realm: 5, layer: 8, qi: 3e9, materials: 2e5,
    levels: { technique: 20, method: 20, pills: 20, cores: 12 }, killed, seen: SEEN, self: 'woman',
    awakened: ['feast', 'wolf', 'luckystar', 'platform'], ...extra,
  } as State;
  return validate(JSON.parse(JSON.stringify(s)), at + 30);
}

/** A real two-thousand-kill drive's pieces, on the table. Creation makes every kill a piece. */
function bigPile(): { state: State; rolled: number } {
  const base = cultivator(MARKS[1] + 5);
  const d = drive(base, commonsOf(5)[1], DRIVE_MOST, 4242, { always: true });
  const held = holdDrops(d.state, d);
  return { state: validate(JSON.parse(JSON.stringify(held)), base.at + 30), rolled: d.dropsRolled };
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function plant(width: number, s: State): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
  // tsx names every arrow it compiles; the page has no such helper.
  await page.addInitScript('window.__name = (f) => f');
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, b, v]) => { localStorage.clear(); localStorage.setItem(k, v); localStorage.setItem(b, v); },
    [SAVE_KEY, BACKUP_KEY, JSON.stringify(s)]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(700);
  return page;
}

async function clear(page: Page) {
  for (let i = 0; i < 8; i++) {
    const b = await page.$('.notice button, .awaken button, .back button');
    if (!b) break;
    try { await b.click({ timeout: 1200 }); } catch { break; }
    await page.waitForTimeout(220);
  }
}

async function tab(page: Page, han: string) {
  await clear(page);
  for (const t of await page.$$('nav.tabs button')) if ((await t.textContent())?.includes(han)) { await t.click(); break; }
  await page.waitForTimeout(500);
  await clear(page);
}

async function saved(page: Page): Promise<{ state: State; raw: string; rawPile: unknown[] }> {
  await page.waitForTimeout(4500);
  const raw = await page.evaluate((k) => localStorage.getItem(k), SAVE_KEY);
  assert(raw, 'the game wrote no save');
  const opened = raw!.startsWith('NF1.') ? open(raw!).json : raw!;
  assert(opened, 'the save would not open');
  const parsed = JSON.parse(opened!);
  const body = parsed.state ?? parsed;
  return { state: validate(body, Math.floor(Date.now() / 1000)), raw: raw!, rawPile: body.pile };
}

async function noOverflow(page: Page, width: number, what: string) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(over <= 0, `${what}: hangs ${over}px off a ${width} screen`);
}

const tiles = (page: Page) => page.locator('.dwin .dw-tile').count();
const text = async (page: Page, sel: string) => (await page.locator(sel).first().textContent())?.replace(/\s+/g, ' ').trim() ?? '';

/** The frame after the next two, so what a tap changed has been laid out and painted. */
const settle = (page: Page) => page.evaluate(() => new Promise<number>((res) => {
  const t = performance.now();
  requestAnimationFrame(() => requestAnimationFrame(() => res(performance.now() - t)));
}));

async function pileShots() {
  const { state: pending, rolled } = bigPile();
  assert(pending.pile.length === rolled && rolled >= DRIVE_MOST, `the drive dropped ${rolled}, the table holds ${pending.pile.length}`);
  console.log(`pile: a ${DRIVE_MOST}-kill drive rolled ${rolled} pieces; the table holds ${pending.pile.length}`);

  for (const width of [400, 320]) {
    const w = String(width);
    const page = await plant(width, pending);
    // The game opens the window by itself for pieces nobody has answered for.
    await page.evaluate(() => {
      const w = window as unknown as { __long: number[] };
      w.__long = [];
      new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__long.push(e.duration); }).observe({ entryTypes: ['longtask'] });
    });
    await page.waitForSelector('[data-qol="pile-sheet"]', { timeout: 20000 });
    await page.waitForSelector('.dwin .dw-tile');
    await noOverflow(page, width, 'window with a full pile');
    assert.equal(await tiles(page), PILE_PAGE, 'the window should draw one page of tiles to begin with');
    const head = await text(page, '.dwin .heading');
    assert(head.includes(rolled.toLocaleString('en')), `the heading should name every piece: ${head}`);
    const shown = await text(page, '.dw-bulk i');
    assert(shown.includes(rolled.toLocaleString('en')), `the filter row should count them all: ${shown}`);
    await page.evaluate(() => { document.querySelector('.drivesheet')!.scrollTop = 0; });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/window-top-${w}.png` });

    // Open it again from the hunt list and time it: click to the first painted page of tiles.
    await page.click('[data-qol="pile-later"]');
    await page.waitForTimeout(300);
    await tab(page, '狩');
    await page.waitForSelector('[data-qol="pile-waiting"]');
    await page.evaluate(() => { (window as unknown as { __long: number[] }).__long.length = 0; });
    const open_ms = await page.evaluate(() => new Promise<number>((res) => {
      const t = performance.now();
      const done = () => {
        if (document.querySelector('.dwin .dw-tile')) requestAnimationFrame(() => requestAnimationFrame(() => res(performance.now() - t)));
        else requestAnimationFrame(done);
      };
      (document.querySelector('[data-qol="pile-waiting"]') as HTMLElement).click();
      done();
    }));
    const long = await page.evaluate(() => (window as unknown as { __long: number[] }).__long);
    console.log(`pile ${w}: window with ${rolled} pieces opens in ${open_ms.toFixed(0)} ms (longest long task ${Math.max(0, ...long).toFixed(0)} ms)`);

    // The foot: the button that draws the next page, and nothing draws it by itself.
    await page.locator('.dw-more').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    assert.equal(await tiles(page), PILE_PAGE, 'the foot must wait for a tap');
    await page.screenshot({ path: `${OUT}/window-foot-${w}.png` });
    const m0 = Date.now();
    await page.click('.dw-more');
    await settle(page);
    console.log(`pile ${w}: Show more draws the next page in ${Date.now() - m0} ms, ${await tiles(page)} tiles drawn`);
    assert.equal(await tiles(page), PILE_PAGE * 2, 'the foot should draw one more page');
    await page.evaluate(() => { document.querySelector('.drivesheet')!.scrollTop = 0; });
    await page.waitForTimeout(150);

    // Select all acts on the whole set, drawn or not.
    const t0 = Date.now();
    await page.click('[data-qol="pile-all"]');
    await settle(page);
    const allMs = Date.now() - t0;
    const sum = await text(page, '.dw-sum b');
    assert.equal(sum, `Keeping ${rolled.toLocaleString('en')} of ${rolled.toLocaleString('en')}`, `Select all should mark every piece: ${sum}`);
    console.log(`pile ${w}: Select all on ${rolled} pieces settles in ${allMs} ms`);
    await page.locator('.dw-sum').scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${OUT}/window-selected-all-${w}.png` });
    await page.evaluate(() => { document.querySelector('.drivesheet')!.scrollTop = 0; });
    await page.click('[data-qol="pile-none"]');
    await settle(page);
    assert((await text(page, '.dw-sum b')).startsWith('Keeping 0 of'), 'Clear should unmark every piece');

    // A filter: Select all then acts on what the filter matches, not on the rest.
    const slotBtn = page.locator('.dw-filter').first().locator('button').nth(2);
    const slotCount = Number((await slotBtn.locator('i').textContent())!.trim());
    await slotBtn.click();
    await settle(page);
    assert((await text(page, '.dw-bulk i')).startsWith(slotCount.toLocaleString('en')), 'the filter row should count the filtered set');
    await page.click('[data-qol="pile-all"]');
    await settle(page);
    assert.equal((await text(page, '.dw-sum b')), `Keeping ${slotCount.toLocaleString('en')} of ${rolled.toLocaleString('en')}`, 'Select all should mark exactly the filtered set');
    await page.screenshot({ path: `${OUT}/window-filtered-${w}.png` });
    await page.click('[data-qol="pile-none"]');
    await page.locator('.dw-filter').first().locator('button').first().click();
    await settle(page);

    // Keep three, answer, and read the save the game wrote.
    for (let i = 0; i < 3; i++) await page.click(`.dw-tile >> nth=${i}`);
    await page.locator('[data-qol="pile-keep"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${OUT}/window-keep-three-${w}.png` });
    await page.click('[data-qol="pile-keep"]');
    const out = await saved(page);
    assert.equal(out.state.pile.length, 0, 'the table should be empty after the answer');
    assert.equal(out.state.chest.length, 3, 'the three marked pieces should be in the chest');
    await noOverflow(page, width, 'after the answer');
    await page.close();

    // The save the game writes with the big pile still on the table: size, and the rows.
    const again = await plant(width, pending);
    await again.waitForSelector('[data-qol="pile-sheet"]', { timeout: 20000 });
    const kept = await saved(again);
    assert.equal(kept.state.pile.length, rolled, 'the pile should survive a reload whole');
    assert(Array.isArray(kept.rawPile[0]), 'the game should write the pile as rows');
    console.log(`pile ${w}: the game's own save with ${rolled} pieces is ${(kept.raw.length / 1024).toFixed(0)} KB sealed in localStorage (twice: save and backup)`);
    await again.close();
  }
}

async function realmShots() {
  // Beasts of every realm up to the fifth, none of them finished, so the list is long and mixed.
  const base = cultivator(3);
  const chestDrive = drive(cultivator(MARKS[1] + 5), commonsOf(5)[1], 200, 11).drops.slice(0, 160);
  const s = validate(JSON.parse(JSON.stringify({ ...base, chest: chestDrive })), base.at + 30);
  for (const width of [400, 320]) {
    const w = String(width);
    const page = await plant(width, s);
    await tab(page, '狩');
    await page.waitForSelector('.beast');
    await noOverflow(page, width, 'hunt list');
    const tags = await page.$$eval('.stack .beast .rtag', (els) => els.map((e) => e.getAttribute('aria-label')));
    console.log(`realm ${w}: ${tags.length} realm marks on the hunt list: ${[...new Set(tags)].join(' | ')}`);
    // Every row has one (set NO_REALM_TAGS=1 to shoot a build from before the mark, for the "before" pictures).
    if (!process.env.NO_REALM_TAGS) {
      const rowsN = await page.locator('.stack .beast').count();
      assert.equal(tags.length, rowsN, `every hunt row should carry a realm mark (${tags.length} of ${rowsN})`);
    }
    // The mark must never push the row past the screen or wrap the name column.
    const wide = await page.$$eval('.stack .beast', (rows) => rows.filter((r) => r.scrollWidth > r.clientWidth + 1).length);
    assert.equal(wide, 0, 'a hunt row overflows its own width');
    // The list itself: from its first row, then a screen further down.
    // (the app scrolls inside its own column, so the row is brought to the top rather than the window)
    await page.locator('.stack .beast').first().evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/hunt-${w}.png` });
    const rows = await page.locator('.stack .beast').count();
    assert(rows >= 8, `only ${rows} hunt rows were reached`);
    await page.locator('.stack .beast').nth(5).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/hunt-scrolled-${w}.png` });

    // 器 The fuse groups share the row and must be untouched.
    await tab(page, '器');
    await page.waitForTimeout(400);
    const fuse = await page.$$('.beast.fuserow');
    const stray = await page.$$('.fuserow .rtag');
    assert.equal(stray.length, 0, 'the fuse rows must not carry a realm mark');
    console.log(`realm ${w}: ${fuse.length} fuse rows, none with a realm mark`);
    await noOverflow(page, width, 'fuse list');
    if (fuse[0]) await fuse[0].scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/fuse-${w}.png` });
    await page.close();

    // 狩 The same mark where the beast has a sheet of its own: the drive's, and the arena's.
    const known = await plant(width, cultivator(MARKS[1] + 5));
    await tab(known, '狩');
    await known.waitForSelector('.drivetag');
    await known.click('.drivetag >> nth=0');
    await known.waitForSelector('.drivesheet .size');
    assert(await known.$('.drivesheet .head .rtag'), 'the drive sheet should carry the realm mark');
    await noOverflow(known, width, 'drive sheet');
    await known.screenshot({ path: `${OUT}/drive-sheet-${w}.png` });
    await known.close();
    const fight = await plant(width, cultivator(3));
    await tab(fight, '狩');
    await fight.waitForSelector('.stack .beast');
    await fight.locator('.stack .beast').first().click();
    await fight.waitForSelector('.feet .who.r .nm');
    await fight.waitForTimeout(900);
    assert(await fight.$('.feet .who.r .rtag'), 'the arena should carry the realm mark on the beast');
    await noOverflow(fight, width, 'arena');
    await fight.screenshot({ path: `${OUT}/arena-${w}.png` });
    await fight.close();
  }
}

if (MODE === 'pile' || MODE === 'both') await pileShots();
if (MODE === 'realm' || MODE === 'both') await realmShots();
void BEASTS;
await browser.close();
console.log('done');
