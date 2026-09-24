/**
 * 鬥查 The arena, measured at every width a phone actually is.
 *
 * Bruno, with a photograph of his own screen: *"as arenas estão horrendas ... e há
 * algumas bem piores desalinhadas."* The arena had been looked at once, at 400 by 860,
 * against one beast, and it was fine there. His phone is narrower, and 巨蟹 the giant
 * crab is not the widest thing in the game.
 *
 * 框 The fault is a class rather than a case: the fighters were sized in pixels against a
 * fixed 74px gutter, so on a narrow screen a wide creature is wider than the half it has
 * and hangs off the edge. Nothing in the build could see that, because nothing had ever
 * opened the arena at 320.
 *
 * So this opens it at four widths against the widest, the tallest and the largest beast
 * in the game, and asserts three things that have to be true of every one of them:
 *
 *   出 neither fighter crosses the edge of the stage;
 *   立 both stand on the same floor line, within a pixel or two;
 *   隔 and they do not run into each other in the middle.
 *
 *     npm run build && npm run preview &
 *     npm run arena
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SAVE_KEY = 'ninefold.save.v1';
/** 闊 Every phone width worth caring about, from a small Android to a large iPhone. */
const WIDTHS = [320, 360, 400, 430];
/**
 * 獸 The shapes that break a layout: the widest painting, the tallest, a warden, and the
 * one Bruno was looking at. Read by name so adding a beast cannot silently change them.
 */
const CASES = [
  { realm: 3, beast: 'raven', han: '血鴉', why: 'the one in the first photograph' },
  // 彘 The fight in the photograph Bruno sent at midnight: *"a arena está péssima ...
  // cultivador menor que os monstros."* A boar is low and wide and she is seated, so it
  // is the case where a difference in size reads hardest.
  { realm: 4, beast: 'boar', han: '鐵根彘', why: 'the one in the second photograph' },
  { realm: 5, beast: 'crab', han: '巨蟹', why: 'the widest common' },
  { realm: 6, beast: 'centipede', han: '蜈蚣', why: 'long and low' },
  { realm: 9, beast: 'squid', han: '巨章', why: 'tall and wide at once' },
  // 王 A warden is not in the hunt list: it is fought from 修 the cultivate screen, at the
  // last layer. It is here because it is drawn larger than anything else and it is the
  // only case that exercises that.
  { realm: 2, beast: 'ape', han: '石猿', warden: true, why: 'a warden, drawn larger' },
];

mkdirSync('shots-arena', { recursive: true });

function cultivator(realm, beast) {
  const at = Math.floor(Date.now() / 1000);
  const cap = realm * 6;
  return {
    v: 1, at, startedAt: at - realm * 10 * 86400,
    realm, layer: 8, qi: 10 ** (realm + 2), materials: 10 ** (realm + 1), wardenFell: false,
    levels: { technique: cap, method: cap, pills: cap, cores: Math.max(0, cap - 6) },
    // 見 Every beast seen once, so the row is there and the odds are not a wall.
    killed: Object.fromEntries([beast, 'rat', 'hound', 'frog'].map((k) => [k, 2])),
    worn: {}, chest: [], self: 'woman', stance: 'swift', sequence: [],
    tribulation: 0, tribulationAt: 0, tower: 0, brewed: { body: 0, bane: 0, fortune: 0 },
    awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought']
      .slice(0, [0, 0, 2, 2, 4, 4, 6, 6, 8, 8][realm]),
    seen: ['guide', 'whom', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones',
           'bestiary', 'salvage', 'fuse'],
  };
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const problems = [];
const fail = (where, what) => { problems.push(`${where}: ${what}`); console.log(`  ✗ ${where}  ${what}`); };

for (const width of WIDTHS) {
  console.log(`\n  ${width} wide`);
  for (const c of CASES) {
    const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 2 });
    await page.route('**/assets/*.js', (r) => r.abort());
    await page.goto(BASE);
    await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)),
      [SAVE_KEY, cultivator(c.realm, c.beast)]);
    await page.unroute('**/assets/*.js');
    await page.goto(BASE);
    await page.waitForSelector('nav.tabs button', { timeout: 15000 });
    await page.waitForTimeout(700);
    const clear = async () => {
      for (let i = 0; i < 8; i++) {
        const b = await page.$('.notice button, .awaken button, .whom .pick');
        if (!b) break;
        await b.click().catch(() => {});
        await page.waitForTimeout(180);
      }
    };
    await clear();
    if (c.warden) {
      const go = await page.$('[data-coach="fight-warden"]');
      if (!go) { fail(`${width}/${c.beast}`, 'the warden card is not on the cultivate screen'); await page.close(); continue; }
      await go.click();
      await page.waitForTimeout(1100);
      await clear();
    } else {
    for (const t of await page.$$('nav.tabs button')) {
      const s = await t.textContent();
      if (s?.includes('狩')) { await t.click(); break; }
    }
    await page.waitForTimeout(500);
    await clear();
    // 列 The row for *this* beast, tapped at its right edge where no character sits.
    //
    // 名 It used to fall back to the first row when it could not find the one it wanted,
    // which meant the report said 巨蟹 and had measured 青蛇. A harness that names the
    // wrong case is the same fault as one that reaches nothing: it passes, and it passes
    // about somebody else. It fails now instead.
    const row = await page.$(`button.beast:has-text("${c.han}")`);
    if (!row) { fail(`${width}/${c.beast}`, `${c.han} is not in the hunt list for realm ${c.realm}`); await page.close(); continue; }
    const box = await row.boundingBox();
    await page.mouse.click(box.x + box.width - 10, box.y + box.height / 2);
    await page.waitForTimeout(1100);
    await clear();
    }

    const m = await page.evaluate(() => {
      const g = (sel) => { const e = document.querySelector(sel); if (!e) return null;
        const b = e.getBoundingClientRect();
        return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height }; };
      const stage = g('.stage');
      const cut = document.querySelector('.foe .beastcut');
      return { stage, you: g('.you .art'), foe: cut ? g('.foe .beastcut') : g('.foe .art'),
               floor: stage ? stage.b - stage.h * 0.127 : null, cut: !!cut };
    });
    const where = `${width}/${c.beast}`;
    if (!m.stage || !m.you || !m.foe) { fail(where, 'the arena never opened'); await page.close(); continue; }
    // 出 Inside the stage, both of them.
    if (m.foe.r > m.stage.r - 1) fail(where, `the beast runs ${Math.round(m.foe.r - m.stage.r)}px off the right edge`);
    if (m.foe.l < m.stage.l + 1) fail(where, `the beast runs ${Math.round(m.stage.l - m.foe.l)}px off the left edge`);
    if (m.you.l < m.stage.l - 1) fail(where, 'the cultivator runs off the left edge');
    // 立 On the same line. 滲 the cut put the figure's seat a tenth above its own box.
    const youFoot = m.you.b - m.you.h * 0.10;
    if (Math.abs(youFoot - m.floor) > 8) fail(where, `the cultivator stands ${Math.round(youFoot - m.floor)}px off the floor`);
    if (Math.abs(m.foe.b - m.floor) > 8) fail(where, `the beast stands ${Math.round(m.foe.b - m.floor)}px off the floor`);
    // 隔 Not touching.
    if (m.foe.l < m.you.r + 4) fail(where, 'the two of them overlap');
    await page.screenshot({ path: `shots-arena/${width}-${c.beast}.png`, clip: { x: 0, y: m.stage.t, width, height: m.stage.h } });
    await page.close();
  }
}
await browser.close();

console.log(problems.length
  ? `\n鬥 ${problems.length} problem(s) in the arena.\n`
  : '\n鬥 every fight is inside the stage, on the floor, and not on top of itself.\n');
process.exit(problems.length ? 1 : 0);
