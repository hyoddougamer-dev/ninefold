/**
 * 期屏 The week's three marks, shot off the real game.
 *
 * 圖 A change a player sees is not reported in words in this repository, and the week
 * leaves a mark on three different screens: 狩 the hunt, 洞天 the cave and 秘境 the vault.
 * So this drives the built app with a fabricated save whose `at` is pinned to a known
 * Monday, which makes the quarry, the season and the blessed room fixed rather than
 * whatever this container's clock happens to make them.
 *
 *     npm run build && npm run preview &
 *     node tools/shot-week.mjs shots-week
 *
 * 免 The two things this harness had to be told, both of them already written down in
 * CLAUDE.md: the app rewrites its save on unload, so the save is planted with the
 * scripts blocked, and a .notice card eats the first tap on every screen.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const dir = process.argv[2] ?? 'shots-week';
/**
 * 窄 The width to look at it at. 鬥 The arena cost this repository a bug Bruno
 * photographed because nothing in the build ever opened a screen narrower than 400, so
 * every new block gets looked at here too.
 */
const WIDTH = Number(process.env.WEEK_WIDTH ?? 400);
mkdirSync(dir, { recursive: true });

/**
 * 週 A Monday, so the same run always photographs the same week.
 *
 * It is not enough to stamp the save with it: the app pays out the hours between the
 * save's instant and the real clock on load, which would drag the fixture into whatever
 * week this container is having and put 歸 the welcome-back card over the first shot.
 * So the page's own clock is moved to it, the way CLAUDE.md already records for reading
 * 入定 off the real screen. The save is then thirty seconds old and nothing is owed.
 */
const MONDAY = Date.UTC(2026, 8, 21) / 1000;
const NOON = MONDAY + 12 * 3600;
/** How many weeks past it, so a second shot can be taken of a different week. */
const WEEKS = Number(process.env.WEEK_OFFSET ?? 0);

function cultivator(realm, weeks) {
  const at = NOON + weeks * 7 * 86400 - 30;
  const cap = realm * 6;
  const killed = { rat: 3, hound: 2, frog: 2, serpent: 3, mantis: 2, bat: 1, beetle: 2,
                   owl: 1, raven: 1, boar: 2, wolf: 1, vulture: 1, crab: 1 };
  ['fox', 'ape', 'crane', 'tiger'].slice(0, realm - 1).forEach((k) => { killed[k] = 1; });
  return {
    v: 1, at, startedAt: at - realm * 10 * 86400,
    realm, layer: 8, qi: 10 ** (realm + 2), materials: 10 ** (realm + 1), wardenFell: false,
    levels: { technique: cap, method: cap, pills: cap, cores: Math.max(0, cap - 6) },
    killed,
    worn: { weapon: { id: 'w', template: `sword${realm}`, rarity: 'earth', rolls: [{ affix: 'power', value: 22 }] } },
    chest: [],
    self: 'woman', stance: 'swift', sequence: ['crane'],
    tribulation: 0, tribulationAt: 0, tower: realm * 10,
    brewed: { body: 0, bane: 0, fortune: 0 },
    // 洞天 One bed planted and two empty, so the seed list opens on an empty one.
    beds: [{ herb: 'orchid', at: at - 3600 }, { herb: null, at: 0 }, { herb: null, at: 0 }],
    reaped: 0,
    // 秘境 Standing in the first room, so the path and a pair of doors are both drawn.
    runStep: 0, runAt: at - 86400, runs: 2,
    // 期 Never taken, so the band reads the qi it still owes.
    quarryWeek: -1,
    awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought']
      .slice(0, [0, 0, 2, 2, 4, 4, 6, 6, 8, 8][realm]),
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones',
           'bestiary', 'salvage', 'fuse', 'whom', 'cave', 'secret'],
  };
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
let page = null;

/**
 * 掩 Dismiss whatever is sitting over the screen: 註 a notice, 悟道 a card, 歸 the welcome
 * back. It gives up on a card it cannot reach rather than waiting thirty seconds for it,
 * because 秘境 the vault draws over the welcome-back card and is itself the shot.
 */
const clear = async () => {
  for (let i = 0; i < 8; i++) {
    const b = await page.$('.notice button, .awaken button, .back button');
    if (!b) break;
    try {
      await b.click({ timeout: 1200 });
    } catch {
      break;
    }
    await page.waitForTimeout(220);
  }
};

const tab = async (han) => {
  await clear();
  for (const t of await page.$$('nav.tabs button')) {
    const txt = await t.textContent();
    if (txt?.includes(han)) { await t.click(); break; }
  }
  await page.waitForTimeout(500);
  await clear();
};

const plant = async (realm, weeks, over = {}) => {
  /**
   * 頁 A fresh page for every save, and both keys written.
   *
   * CLAUDE.md records that the app rewrites its save on unload, and that blocking its
   * scripts is how a fixture is planted. What it does not record, and this harness paid
   * for: planting a *second* fixture over a page that has already run the game does not
   * hold. The straggling write lands after the plant, and 備 the spare copy in
   * sim/save.ts is a second key the plant never touched, so the game comes back as
   * whatever it was before. Measured: a plant asking to be outside the vault came back
   * standing in room one, every time.
   *
   * A new page has neither problem: nothing of the old one is left to write, and both
   * keys are set before any script runs.
   */
  if (page) await page.close();
  page = await browser.newPage({ viewport: { width: WIDTH, height: 900 }, deviceScaleFactor: 2 });
  await page.clock.install({ time: (NOON + weeks * 7 * 86400) * 1000 });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  const save = { ...cultivator(realm, weeks), ...over };
  await page.evaluate(([k, b, s]) => {
    localStorage.setItem(k, JSON.stringify(s));
    localStorage.setItem(b, JSON.stringify(s));
  }, [SAVE_KEY, BACKUP_KEY, save]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(700);
  await clear();
  await page.waitForTimeout(400);
  await clear();
};

const shot = async (name, selector) => {
  const el = selector ? await page.$(selector) : null;
  const path = `${dir}/${name}.png`;
  if (el) await el.screenshot({ path });
  else await page.screenshot({ path });
  console.log(path);
};

/**
 * 秘境 The vault first, because a walker standing in a room is drawn over everything and
 * there is no tab that reaches past it. The save is simply planted
 * again outside the door for the rest, which is cheaper than walking a run out.
 */
await plant(5, WEEKS);
await clear();
await page.waitForSelector('.secret .path', { timeout: 15000 });
await shot('vault', '.secret');
await shot('path', '.secret .path');
// 狩 The band at the top of the hunt, and the same chip down on the quarry's own row.
await plant(5, WEEKS, { runStep: -1, runAt: 0 });
await tab('狩');
await shot('hunt');
const band = await page.$('.weekband');
if (!band) throw new Error('期 no band on the hunt screen');
await shot('band', '.weekband');
const row = await page.$('button.beast:has(.wtag)');
if (!row) throw new Error('期 no chip on any hunt row');
await shot('row', 'button.beast:has(.wtag)');

// 秘境 The door outside, which names the blessed room before the run starts.
await shot('door', '.door.open');

/**
 * 室 And the blessed room itself, walked into. Which room that is comes off the door
 * card rather than out of a constant here: the harness should never be able to disagree
 * with the screen about which room the week blessed.
 */
const said = await page.$eval('.door.open .body u', (e) => e.textContent ?? '');
const room = Number(said.match(/Room (\d+)/)?.[1]);
if (!room) throw new Error(`期 the door did not say which room: ${said}`);
console.log(`  the door says: ${said}`);
await plant(5, WEEKS, { runStep: room - 1 });
await page.waitForSelector('.secret .path', { timeout: 15000 });
await shot('blessed', '.secret');
await shot('blessedpath', '.secret .path');

await plant(5, WEEKS, { runStep: -1, runAt: 0 });

// 洞天 The cave, with the seed list open on an empty bed.
await tab('修');
for (const b of await page.$$('button')) {
  const txt = await b.textContent();
  if (txt?.trim().startsWith('Plant something')) { await b.click(); break; }
}
await page.waitForTimeout(500);
const seeds = await page.$('.seeds');
if (!seeds) throw new Error('期 the seed list did not open');
await seeds.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await shot('cave', '.seeds');
const seed = await page.$('.seed:has(.wtag)');
if (!seed) throw new Error('期 no chip in the seed list');
await shot('seed', '.seed:has(.wtag)');

/**
 * 窄 And the two widest new blocks at 320, which is the narrowest phone this game claims
 * to run on. The band carries a painting, three lines of sentence and a chip in one row,
 * which is exactly the shape that widened a grid cell and hung a beast off the side of
 * the arena.
 */
if (WIDTH === 400) {
  await page.close();
  page = null;
  process.env.WEEK_WIDTH = '320';
}

await browser.close();
