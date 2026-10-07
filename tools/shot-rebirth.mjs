/**
 * 轉世屏 Rebirth, shot off the real game: the quiet offer at the summit, the page, the
 * double tap, the line a new life opens with, and the first screen of that life.
 *
 *     npm run build && npm run preview &
 *     node tools/shot-rebirth.mjs <dir>
 *
 * Each shot is taken at 400 and at 320 wide, and the page once more on the desktop shell.
 * The traps CLAUDE.md records apply: the save is planted with the scripts blocked, with the
 * spare copy beside it, and a notice is dismissed before anything is tapped. It also checks
 * what it shoots: the offer is there, two taps are needed, the new life is the first realm
 * with the Echo on its rate, and nothing hangs off the side of a 320 screen.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const dir = process.argv[2] ?? 'shots-rebirth';
mkdirSync(dir, { recursive: true });

/** 印 Every realm's and the first heavens' cards, in the order their trios offer them. */
const TAKEN = ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought', 'formula', 'ninerungs',
  'quickfire', 'sealbreaker'];

/** A cultivator at the summit with `marks` crossed, and `lives` already behind them. */
function summit(marks, lives = []) {
  const at = Math.floor(Date.now() / 1000);
  const cap = 9 * 6 + Math.ceil(marks / 3) * 6;
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
    tribulation: marks, tribulationAt: 0, tower: 160,
    brewed: { body: 60, bane: 50, fortune: 40 },
    awakened: TAKEN.slice(0, 8 + Math.ceil(marks / 3)),
    met: [], metAt: 0, metPoints: 0,
    beds: [{ herb: null, at: 0 }, { herb: null, at: 0 }, { herb: null, at: 0 }], reaped: 0,
    runStep: -1, runAt: 0, runs: 0, quarryWeek: -1,
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones',
           'bestiary', 'salvage', 'fuse', 'whom', 'cave', 'secret'],
    lives,
  };
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
let page = null;
let failures = 0;
const check = (ok, what) => { if (!ok) { failures++; console.log(`  ✗ ${what}`); } };

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
  await toCultivate();
};

/** 修 A notice's own button can lead to another tab, so the shots begin on 修 by hand. */
const toCultivate = async () => {
  await page.locator('nav.tabs button', { hasText: /cultivate/i }).first().click();
  await page.waitForTimeout(400);
  await dismiss();
};

/** 歸 Whatever card sits over the screen goes first: a notice blocks every tap under it. */
const dismiss = async () => {
  for (let i = 0; i < 8; i++) {
    const b = await page.$('.back button, .notice button, .awaken .later');
    if (!b) break;
    try { await b.click({ timeout: 1500 }); } catch { break; }
    await page.waitForTimeout(250);
  }
};

const shot = async (name) => {
  const path = `${dir}/${name}.png`;
  await page.screenshot({ path });
  console.log(path);
};

/** Nothing on the page may stand wider than the screen. */
const fits = async (what) => {
  const over = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll('.rebirthsheet *, .rebirthline, .lifewears, .echochip')]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > w + 0.5 || r.left < -0.5); })
      .map((e) => `${e.className || e.tagName} ${Math.round(e.getBoundingClientRect().right)}`).slice(0, 4);
  });
  check(over.length === 0, `${what}: off the side of the screen: ${over.join(', ')}`);
};

for (const width of [400, 320]) {
  // 1. The quiet offer, at the summit with three marks crossed.
  await plant(summit(3), width);
  const offer = await page.$('.rebirthline');
  check(!!offer, `${width}: the offer is on 修 at the summit`);
  if (offer) {
    await offer.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.querySelector('.rebirthline')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
  }
  await fits(`${width} offer`);
  await shot(`${width}-1-offer`);

  // 2. The page.
  await offer?.click();
  await page.waitForSelector('.rebirthsheet', { timeout: 5000 });
  await page.waitForTimeout(400);
  await fits(`${width} page`);
  await shot(`${width}-2-page`);
  await page.evaluate(() => { const s = document.querySelector('.rebirthsheet'); if (s) s.scrollTop = s.scrollHeight; });
  await page.waitForTimeout(250);
  await shot(`${width}-3-page-foot`);

  // 3. The first tap only asks.
  await page.click('.rb-confirm .act');
  await page.waitForTimeout(300);
  const asked = await page.$eval('.rb-confirm', (e) => e.textContent ?? '');
  check(asked.includes('Tap again'), `${width}: the first tap asks again (${asked})`);
  const still = await page.evaluate(() => document.querySelector('.rebirthsheet')?.getAttribute('data-born'));
  check(still !== 'true', `${width}: one tap ends nothing`);
  await page.evaluate(() => { const s = document.querySelector('.rebirthsheet'); if (s) s.scrollTop = s.scrollHeight; });
  await page.waitForTimeout(250);
  await fits(`${width} confirm`);
  await shot(`${width}-4-confirm`);

  // 4. The second tap: the new life, and its title.
  await page.click('.rb-confirm .act');
  await page.waitForSelector('.rebirthsheet[data-born="true"]', { timeout: 5000 });
  await page.waitForTimeout(500);
  await fits(`${width} born`);
  await shot(`${width}-5-born`);

  // 5. The first screen of the new life.
  await page.click('.rebirthsheet .act');
  await page.waitForTimeout(700);
  await dismiss();
  await toCultivate();
  await page.evaluate(() => { const s = document.querySelector('.sheet'); if (s) s.scrollTop = 0; });
  await page.waitForTimeout(300);
  const head = await page.$eval('.c-title', (e) => e.textContent ?? '');
  check(head.includes('life 2'), `${width}: the new life counts as life 2 (${head})`);
  const chip = await page.$('.echochip');
  check(!!chip, `${width}: the Echo stands beside the rate`);
  const title = await page.$('.lifewears');
  check(!!title, `${width}: the new life wears its title`);
  const saved = await page.evaluate((k) => localStorage.getItem(k)?.length ?? 0, SAVE_KEY);
  check(saved > 0, `${width}: the new life was written at once`);
  await fits(`${width} first screen`);
  await shot(`${width}-6-new-life`);

  // 6. And the page, opened again from the Menu by a cultivator three lives in.
  await plant({ ...summit(7, [{ marks: 3, at: Math.floor(Date.now() / 1000) - 120 * 86400 }, { marks: 7, at: Math.floor(Date.now() / 1000) - 50 * 86400 }]) }, width);
  await page.click('.mainswitch');
  await page.waitForTimeout(250);
  const item = page.locator('.switchmenu button', { hasText: 'Rebirth' });
  check(await item.count() === 1, `${width}: Rebirth is in the Menu`);
  await item.click();
  await page.waitForSelector('.rebirthsheet', { timeout: 5000 });
  await page.waitForTimeout(400);
  await fits(`${width} third life`);
  await shot(`${width}-7-third-life`);
}

// 桌 The desktop shell: the page must sit in its window, not break it.
await plant(summit(3), 1366, 820);
await page.click('.rebirthline');
await page.waitForSelector('.rebirthsheet', { timeout: 5000 });
await page.waitForTimeout(400);
await shot('desktop-page');

await browser.close();
if (failures) { console.log(`✗ ${failures} checks failed`); process.exit(1); }
console.log('✓ the offer, the page, the double tap and the new life, at 400 and 320 and on the desktop');
