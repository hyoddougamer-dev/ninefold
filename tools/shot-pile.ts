/**
 * 圍 留 The two things the testers asked for on 2026-10-06, shot off the real build at 400 and
 * 320 wide:
 *
 *   圍 the Drive's window: what dropped, a mark on what to keep, the rest melted, and the way
 *      out of a full chest from the same screen (rekaris, razielmorgenstern).
 *   留 Hold the layer: the switch under the ladder on 修, and the tap that opens a held layer
 *      (speculaether).
 *
 *     npm run build && npm run preview &
 *     SMOKE_URL=http://localhost:4173/ npx tsx tools/shot-pile.ts <out dir>
 *
 * The saves are fabricated from the sim itself (a real drive's real pieces) and read back
 * through validate(), and planted with the scripts blocked, as CLAUDE.md says: the app
 * rewrites its save on unload. It checks what it shoots against the save the game wrote
 * back (opened with seal.ts), and that nothing hangs off a 320 screen.
 */
import { chromium, type Page } from 'playwright';
import { mkdirSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { commonsOf } from '../src/data/bestiary.ts';
import { drive } from '../src/sim/hunt.ts';
import { holdDrops } from '../src/sim/pile.ts';
import { limitFor } from '../src/sim/stash.ts';
import { newState, type State } from '../src/sim/state.ts';
import { validate } from '../src/sim/load.ts';
import { layerCost } from '../src/sim/time.ts';
import { open } from '../src/sim/seal.ts';
import { MARKS } from '../src/sim/record.ts';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const OUT = process.argv[2] ?? 'pile-shots';
mkdirSync(OUT, { recursive: true });

const SEEN = ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage', 'fuse',
  'whom', 'cave', 'secret', 'crafts', 'workshop', 'whom'];

/** A fifth-realm cultivator who knows every common beast of the first five realms. */
function cultivator(extra: Partial<State> = {}): State {
  const at = Math.floor(Date.now() / 1000) - 30;
  const killed: Record<string, number> = {};
  for (let r = 1; r <= 5; r++) for (const b of commonsOf(r)) killed[b.key] = MARKS[1] + 5;
  const s = {
    ...newState(at), startedAt: at - 40 * 86_400, realm: 5, layer: 3, qi: 3e7, materials: 2e5,
    levels: { technique: 20, method: 20, pills: 20, cores: 12 }, killed, seen: SEEN, self: 'woman',
    awakened: ['feast', 'wolf', 'luckystar', 'platform'], ...extra,
  } as State;
  return validate(JSON.parse(JSON.stringify(s)), at + 30);
}

/** The chest filled to its limit with a real drive's pieces, and a second drive's waiting on the table. */
function withPile(): State {
  const base = cultivator();
  const beast = commonsOf(5)[1];
  const filler = drive(base, beast, 200, 11).drops;
  const full = { ...base, chest: filler.slice(-limitFor(base)) };
  const second = drive(full, beast, 200, 4242);
  return validate(JSON.parse(JSON.stringify(holdDrops(second.state, second))), base.at + 30);
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function plant(width: number, s: State): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, b, v]) => { localStorage.clear(); localStorage.setItem(k, v); localStorage.setItem(b, v); },
    [SAVE_KEY, BACKUP_KEY, JSON.stringify(s)]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(700);
  await clear(page);
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

/** The save the game wrote back, opened. */
async function saved(page: Page): Promise<State> {
  await page.waitForTimeout(4500);
  const raw = await page.evaluate((k) => localStorage.getItem(k), SAVE_KEY);
  assert(raw, 'the game wrote no save');
  const opened = raw!.startsWith('NF1.') ? open(raw!).json : raw!;
  assert(opened, 'the save would not open');
  const parsed = JSON.parse(opened!);
  return validate(parsed.state ?? parsed, Math.floor(Date.now() / 1000));
}

async function noOverflow(page: Page, width: number, what: string) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(over <= 0, `${what}: hangs ${over}px off a ${width} screen`);
}

/** 修 From the qi number down to the hold card: `.c-hero` is display: contents on a phone, so a clip. */
async function heroShot(page: Page, path: string) {
  await page.locator('.holdcard').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const clip = await page.evaluate(() => {
    const top = document.querySelector('.bar')!.getBoundingClientRect();
    const bottom = document.querySelector('.holdcard')!.getBoundingClientRect();
    const y = Math.max(0, top.top - 24);
    return { x: 0, y, width: window.innerWidth, height: Math.min(window.innerHeight - y, bottom.bottom - y + 12) };
  });
  await page.screenshot({ path, clip });
}

async function sheetShots(page: Page, name: string) {
  const sheet = await page.$('.drivesheet');
  assert(sheet, `${name}: no sheet`);
  await page.evaluate(() => { document.querySelector('.drivesheet')!.scrollTop = 0; });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${name}-top.png` });
  const h = await page.evaluate(() => document.querySelector('.drivesheet')!.scrollHeight);
  const view = await page.evaluate(() => window.innerHeight);
  for (let i = 1; (i * view) * 0.85 < h - view; i++) {
    await page.evaluate((y) => { document.querySelector('.drivesheet')!.scrollTop = y; }, i * view * 0.85);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${OUT}/${name}-${i}.png` });
  }
  await page.evaluate((y) => { document.querySelector('.drivesheet')!.scrollTop = y; }, h);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${name}-end.png` });
}

for (const width of [400, 320]) {
  const w = String(width);

  // ── 留 hold the layer ───────────────────────────────────────────────────────
  {
    const rung = layerCost(5, 3);
    let page = await plant(width, cultivator({ qi: rung * 0.4 }));
    await tab(page, '修');
    await page.waitForSelector('.holdcard', { timeout: 8000 }).catch(async (e) => {
      await page.screenshot({ path: `${OUT}/fail-${w}.png` });
      throw e;
    });
    await noOverflow(page, width, 'hold, off');
    await heroShot(page, `${OUT}/hold-off-${w}.png`);
    // Tap the switch: on, bar not full yet.
    await page.click('.holdcard .hold-switch');
    await page.waitForTimeout(400);
    assert.equal(await page.getAttribute('.hold-switch', 'aria-checked'), 'true');
    await heroShot(page, `${OUT}/hold-on-${w}.png`);
    assert.equal((await saved(page)).hold, true, 'the switch did not reach the save');
    await page.close();

    // A full bar, held: the layer waits, and the button opens it.
    page = await plant(width, cultivator({ qi: rung * 2.4, hold: true }));
    await tab(page, '修');
    await page.waitForSelector('.hold-open');
    const before = await page.evaluate(() => document.querySelector('.ladder .lab')?.textContent);
    await noOverflow(page, width, 'hold, full');
    await heroShot(page, `${OUT}/hold-full-${w}.png`);
    await page.click('.hold-open');
    await page.waitForTimeout(500);
    const after = await saved(page);
    assert.equal(after.layer, 4, 'the tap opened one layer');
    assert(after.qi > rung * 0.9 && after.qi < rung * 1.6, `the tap took one layer's price (qi ${after.qi}, rung ${rung})`);
    assert.equal(after.hold, true);
    await heroShot(page, `${OUT}/hold-opened-${w}.png`);
    void before;
    await page.close();
  }

  // ── 圍 a drive taken on the screen, and its window ──────────────────────────
  {
    const start = cultivator();
    const full = { ...start, chest: drive(start, commonsOf(5)[1], 200, 11).drops.slice(-limitFor(start)) };
    const page = await plant(width, validate(JSON.parse(JSON.stringify(full)), start.at + 30));
    await tab(page, '狩');
    await page.click('.drivetag >> nth=0');
    await page.waitForSelector('.drivesheet .size');
    await page.screenshot({ path: `${OUT}/drive-sizes-${w}.png` });
    await page.click('.drivesheet .size >> nth=2');
    await page.waitForSelector('[data-qol="drive-pile"]');
    await noOverflow(page, width, 'drive window');
    await sheetShots(page, `drive-window-${w}`);
    // Drive again waits for an answer.
    assert.equal(await page.isDisabled('[data-qol="drive-again"]'), true, 'Drive again is open before the window is answered');
    // Keep the lot that the filters show: more than the full chest holds.
    await page.evaluate(() => { document.querySelector('.drivesheet')!.scrollTop = 0; });
    await page.click('[data-qol="pile-all"]');
    await page.waitForTimeout(200);
    assert.equal(await page.isDisabled('[data-qol="pile-keep"]'), true, 'a selection that does not fit must not finish the drive');
    await page.locator('[data-qol="pile-keep"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${OUT}/drive-toomany-${w}.png` });
    // Even with the bag melted, more than the chest can hold is more than it can hold.
    await page.click('[data-qol="pile-bag"]');
    await page.waitForTimeout(200);
    assert.equal(await page.isDisabled('[data-qol="pile-keep"]'), true, 'the bag cannot make room for more than the chest holds');
    // A smaller choice: six pieces, the chest full. It does not fit until the bag is melted.
    await page.click('[data-qol="pile-bag"]');
    await page.click('[data-qol="pile-none"]');
    for (let i = 0; i < 6; i++) await page.click(`.dw-tile >> nth=${i}`);
    await page.waitForTimeout(200);
    assert.equal(await page.isDisabled('[data-qol="pile-keep"]'), true, 'six pieces into a full chest must not finish the drive');
    await page.locator('[data-qol="pile-keep"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${OUT}/drive-full-${w}.png` });
    await page.click('[data-qol="pile-bag"]');
    await page.waitForTimeout(200);
    assert.equal(await page.isDisabled('[data-qol="pile-keep"]'), false, 'melting the bag did not make room');
    await page.locator('[data-qol="pile-keep"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${OUT}/drive-bag-${w}.png` });
    // Take a smaller selection: clear, then keep the game's pick only, with the bag melted.
    await page.click('[data-qol="pile-none"]');
    await page.click('.dw-tile >> nth=0');
    await page.click('.dw-tile >> nth=1');
    await page.locator('[data-qol="pile-keep"]').scrollIntoViewIfNeeded();
    await page.click('[data-qol="pile-keep"]');
    await page.waitForSelector('.pileline');
    await page.screenshot({ path: `${OUT}/drive-answered-${w}.png` });
    const out = await saved(page);
    assert.equal(out.pile.length, 0, 'the table is empty after the answer');
    assert.equal(out.chest.length, 2, 'the bag was melted and the two marked pieces kept');
    assert(await page.$('[data-qol="drive-again"]:not([disabled])'), 'Drive again opens once the window is answered');
    await page.close();
  }

  // ── 圍 a drive that ended with the game shut: the window is there on reopening ──
  {
    const pending = withPile();
    assert(pending.pile.length > 0, 'the fabricated drive dropped nothing');
    const page = await plant(width, pending);
    await page.waitForSelector('[data-qol="pile-sheet"]');
    await noOverflow(page, width, 'reopened window');
    await sheetShots(page, `reopened-${w}`);
    // Decide later: the sheet goes, the pieces stay, and 狩 says so.
    await page.click('[data-qol="pile-later"]');
    await page.waitForTimeout(300);
    await tab(page, '狩');
    await page.waitForSelector('[data-qol="pile-waiting"]');
    await page.screenshot({ path: `${OUT}/hunt-waiting-${w}.png` });
    const later = await saved(page);
    assert.equal(later.pile.length, pending.pile.length, 'deciding later lost pieces');
    // Let the game decide.
    await page.click('[data-qol="pile-waiting"]');
    await page.waitForSelector('[data-qol="pile-game"]');
    await page.click('[data-qol="pile-game"]');
    await page.waitForTimeout(300);
    const decided = await saved(page);
    assert.equal(decided.pile.length, 0);
    assert(decided.chest.some((x) => x.id === pending.pile[0].id) || decided.chest.length === limitFor(decided),
      'the game kept the best piece');
    await page.close();
  }
}

await browser.close();
console.log(`pile shots in ${OUT}`);
