/**
 * 輪迴 The Samsara board beside the Heaven List, shot off the real game.
 *
 * Two cultivators stand in the same place: one who has never reborn, and the same one
 * after a rebirth. The first sees the Heaven List and two tabs; the second sees a third,
 * the 輪迴 Samsara board, and the rows the server gave it. Each is shot at 320 and at 400
 * wide, and checked for what it says and where it stands.
 *
 *     npm run build && npx vite preview --port 4174 --strictPort &
 *     BASE=http://localhost:4174/ npm run samsara -- shots-samsara
 *
 * The ranked server cannot be reached from here, so its answers are stood in for, as
 * tools/ranks.mjs does: the sign-in, the sync and the board RPCs are answered by the route
 * below. The rows on the boards are therefore fabricated, and the shots say so in their
 * names. The save is fabricated too, and it is validated with the game's own validate() so
 * that a life dropped by a wrong field is caught here rather than measured as nothing.
 * The third shot runs with nothing answering at all: the screen must still show its tabs.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { validate } from '../src/sim/load.ts';

const BASE = process.env.BASE ?? 'http://localhost:4173/';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const API = 'https://yqppvmuwlhibswbbvjzz.supabase.co';
const dir = process.argv[2] ?? 'shots-samsara';
mkdirSync(dir, { recursive: true });
let failures = 0;
const check = (ok, what) => { if (!ok) { failures++; console.log(`  ✗ ${what}`); } else console.log(`  ✓ ${what}`); };

/**
 * A cultivator in the middle of the third realm. `lives` is the record of the lives behind
 * them: none for one who has never reborn, one for one who has.
 */
function cultivator(lives) {
  const now = Math.floor(Date.now() / 1000);
  return {
    v: 1, season: 's0', at: now, startedAt: now - 120 * 86400,
    realm: 3, layer: 4, qi: 5e6, materials: 900, wardenFell: false,
    levels: { technique: 6, method: 6, pills: 6, cores: 6 },
    killed: { rat: 40, hound: 30, frog: 20, serpent: 20, mantis: 15, bat: 12, beetle: 12, owl: 8 },
    worn: {}, chest: [], unlocked: [], self: 'woman', stance: 'swift', sequence: ['crane'],
    tribulation: 0, tribulationAt: 0, tower: 40,
    brewed: { body: 20, bane: 10, fortune: 10 },
    // A realm owes one card for each realm below it (sim/awaken.ts owed), so the third realm
    // has taken the first two, and no choice is left hanging over the rankings.
    awakened: ['feast', 'wolf'], met: [], metAt: 0, metPoints: 0,
    beds: [{ herb: null, at: 0 }, { herb: null, at: 0 }, { herb: null, at: 0 }], reaped: 0,
    runStep: -1, runAt: 0, runs: 0, quarryWeek: -1,
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones',
           'bestiary', 'salvage', 'fuse', 'whom', 'cave', 'secret'],
    lives,
  };
}
const NEVER = cultivator([]);
const REBORN = cultivator([{ marks: 3, at: Math.floor(Date.now() / 1000) - 40 * 86400 }]);

// The save has to load with what the screen is meant to show, or the shot measures nothing.
if (validate(NEVER, Math.floor(Date.now() / 1000)).lives.length !== 0) throw new Error('the never-reborn save lost its lives');
if (validate(REBORN, Math.floor(Date.now() / 1000)).lives.length !== 1) throw new Error('the reborn save lost its life');

// The sign-in the game keeps on a device that has joined the rankings (a guest, here).
const session = (now) => ({
  access_token: 'stand-in', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: 'stand-in',
  user: { id: '0b5e2f4a-1111-4222-8333-944455556666', aud: 'authenticated', role: 'authenticated', email: null, is_anonymous: true },
});
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };

// The boards a stand-in server answers with. Heaven never lists a cultivator who has reborn;
// the Samsara rows are the reborn, by the life they are living, with the first wearing no title.
const HEAVEN = [
  { rank: 1, name: '雲中君', climb: 80, marks: 3, tower: 88, gain: 14, title: '天下第一', me: false, calling: 'swordimmortal' },
  { rank: 2, name: 'Mistwalker', climb: 51, marks: 0, tower: 40, gain: 11, title: '期首', me: false, calling: 'qi:2' },
  { rank: 3, name: 'Old Pine of the Eastern Ridge', climb: 44, marks: 0, tower: 31, gain: 9, title: null, me: false, calling: 'sorcerer:9' },
  { rank: 4, name: '修士 0B5E', climb: 22, marks: 0, tower: 40, gain: 4, title: null, me: true, calling: null },
];
// Thunder marks are only ever earned past the summit (layer 80), so a row with marks is at 80.
const SAMSARA = [
  { rank: 1, name: 'Ten Thousand Years Hermit', climb: 80, marks: 2, tower: 0, gain: 0, title: null, me: false, calling: 'sword:2' },
  { rank: 2, name: '無極天衍長生真人', climb: 47, marks: 0, tower: 0, gain: 0, title: '期十', me: false, calling: 'wargod' },
  { rank: 3, name: '修士 0B5E', climb: 22, marks: 0, tower: 0, gain: 0, title: null, me: true, calling: null },
];

/** The stand-in: answers every request the game makes to the server, the way the real one answers. */
function standIn(page, { boards, answering = true }) {
  page.route(`${API}/**`, async (route) => {
    if (!answering) return route.abort('connectionrefused');
    const req = route.request();
    const url = new URL(req.url());
    const reply = (status, body) => route.fulfill({ status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const body = req.postDataJSON?.() ?? null;
    switch (url.pathname) {
      case '/auth/v1/user': return reply(200, session(0).user);
      case '/functions/v1/sync':
        return reply(200, { ranked: true, state: 'verified', why: [], suspect: false, standing: null, behindHours: 0 });
      case '/rest/v1/rpc/board': return reply(200, boards.heaven);
      case '/rest/v1/rpc/samsara_board': return reply(200, boards.samsara);
      case '/rest/v1/rpc/my_standing':
        return reply(200, { name: '修士 0B5E', suspect: false, banned: false, climb: 22, marks: 0, tower: 40,
          verified_at: new Date().toISOString(), latest_at: new Date().toISOString(), title: null });
      default: return reply(404, { error: url.pathname, body });
    }
  });
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

/**
 * A fresh page with the save planted and the device signed in to the rankings as a guest
 * (scripts blocked while planting, so the app does not rewrite the save on unload). The
 * server is the stand-in with these boards, or, with `boards` null, one that refuses everything.
 */
async function open(width, save, boards) {
  const page = await browser.newPage({ viewport: { width, height: 860 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  standIn(page, { boards, answering: boards !== null });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, b, s, a, ok]) => {
    localStorage.clear();
    localStorage.setItem(k, JSON.stringify(s));
    localStorage.setItem(b, JSON.stringify(s));
    localStorage.setItem(a, JSON.stringify(ok));
    localStorage.setItem('ninefold.ranked', '1');
  }, [SAVE_KEY, BACKUP_KEY, save, 'ninefold.auth', session(Math.floor(Date.now() / 1000))]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(900);
  for (let i = 0; i < 8; i++) {
    const b = await page.$('.back button, .notice button, .awaken .later');
    if (!b) break;
    try { await b.click({ timeout: 1500 }); } catch { break; }
    await page.waitForTimeout(250);
  }
  return { page, errors };
}

/**
 * Nothing on the rankings may stand wider than the sheet it is on, nor a tab's words outside its
 * button. The page waits first: a press leaves a ripple that runs past the edge for a moment,
 * and the rows fade in, so neither is measured or shot mid-way.
 */
async function fits(page, what) {
  await page.waitForTimeout(1500);
  const over = await page.evaluate(() => {
    const sheet = document.querySelector('.ranks');
    if (!sheet) return ['no rankings sheet'];
    const r = sheet.getBoundingClientRect();
    const out = [];
    // The page may scroll sideways for a reason outside the sheet (the tab bar's rank badge, which
    // is measured and reported below); the sheet itself must not.
    for (const e of sheet.querySelectorAll('*')) {
      const b = e.getBoundingClientRect();
      if (b.width > 0 && (b.right > r.right + 0.5 || b.left < r.left - 0.5)) out.push(`${e.className || e.tagName} leaves the sheet`);
    }
    for (const btn of sheet.querySelectorAll('.rtabs button')) {
      const span = btn.querySelector('span');
      if (span && span.scrollWidth > span.clientWidth + 0.5) out.push(`tab "${span.textContent}" overflows its button`);
    }
    return out.slice(0, 5);
  });
  check(over.length === 0, `${what}: ${over.length ? over.join('; ') : 'nothing off the sheet'}`);
  const edge = await page.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    return document.documentElement.scrollWidth > cw
      ? [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > cw + 0.5)
        .slice(0, 3).map((e) => `${e.tagName}.${String(e.className?.baseVal ?? e.className).slice(0, 24)}`)
      : [];
  });
  if (edge.length) console.log(`  note: the page scrolls sideways, outside the sheet: ${edge.join(', ')}`);
}

const openRanks = async (page) => {
  await page.locator('nav.tabs button.ranktab').click();
  await page.waitForSelector('.ranks', { timeout: 8000 });
};

const tabs = (page) => page.locator('.ranks .rtabs button').allTextContents();

for (const width of [400, 320]) {
  console.log(`\n${width} wide`);

  // 1. Never reborn: the Heaven List, and no Samsara tab at all.
  {
    const { page, errors } = await open(width, NEVER, { heaven: HEAVEN, samsara: [] });
    await openRanks(page);
    await page.locator('.ranks .rtabs button', { hasText: 'Heaven' }).click();
    await page.waitForSelector('.ranks .rlist li', { timeout: 8000 });
    const names = (await tabs(page)).map((t) => t.trim());
    check(names.length === 3 && !names.some((t) => /Samsara|輪迴/.test(t)), `never reborn: three tabs, no Samsara (${names.join(' | ')})`);
    check(await page.locator('.ranks .rtabs button[aria-selected="true"]').textContent().then((t) => /Heaven/.test(t)), 'the Heaven List is the tab in view');
    const rows = await page.locator('.ranks .rlist li').count();
    check(rows === HEAVEN.length, `the Heaven rows are the server's (${rows})`);
    check(await page.locator('.ranks .rlist li[data-me="true"]').count() === 1, 'and the player is one of them, marked');
    await fits(page, `${width} Heaven`);
    await page.locator('.ranks').screenshot({ path: `${dir}/heaven-never-reborn-${width}.png` });
    console.log(`  → ${dir}/heaven-never-reborn-${width}.png`);
    check(errors.length === 0, `no errors on the page${errors.length ? `: ${errors.join(' | ')}` : ''}`);
    await page.close();
  }

  // 2. Reborn once: the Samsara tab appears, and opens onto the reborn cultivators.
  {
    const { page, errors } = await open(width, REBORN, { heaven: HEAVEN, samsara: SAMSARA });
    await openRanks(page);
    const names = (await tabs(page)).map((t) => t.trim());
    check(names.length === 4 && names.some((t) => /Samsara/.test(t)), `reborn: four tabs, the Samsara one among them (${names.join(' | ')})`);
    await page.locator('.ranks .rtabs button', { hasText: 'Samsara' }).click();
    await page.waitForSelector('.ranks .rlist li', { timeout: 8000 });
    check(await page.locator('.ranks .rtabs button[aria-selected="true"]').textContent().then((t) => /Samsara/.test(t)), 'the Samsara board is the tab in view');
    const rows = await page.locator('.ranks .rlist li').count();
    check(rows === SAMSARA.length, `the Samsara rows are the server's (${rows})`);
    check(await page.locator('.ranks .rlist li[data-me="true"]').count() === 1, 'the reborn player is on it, marked');
    const worn = await page.locator('.ranks .rlist .rw i').allTextContents();
    check(!worn.some((t) => t.includes('天下第一')), `no 天下第一 on the Samsara board (${worn.join(' | ') || 'no titles'})`);
    await fits(page, `${width} Samsara`);
    await page.locator('.ranks').screenshot({ path: `${dir}/samsara-reborn-${width}.png` });
    console.log(`  → ${dir}/samsara-reborn-${width}.png`);
    check(errors.length === 0, `no errors on the page${errors.length ? `: ${errors.join(' | ')}` : ''}`);
    await page.close();
  }

  // 3. Reborn, and nothing answers: the tabs still come from the save, and the boards say so.
  if (width === 400) {
    const { page } = await open(width, REBORN, null);
    await openRanks(page);
    const names = (await tabs(page)).map((t) => t.trim());
    check(names.length === 4, `unreachable server: the save alone gives four tabs (${names.join(' | ')})`);
    await page.locator('.ranks .rtabs button', { hasText: 'Samsara' }).click();
    await page.waitForTimeout(1500);
    const said = await page.locator('.ranks .rnote').first().textContent().catch(() => '');
    check(/cannot be reached/.test(said ?? ''), 'and the list says the boards cannot be reached, in words');
    await fits(page, `${width} unreachable`);
    await page.locator('.ranks').screenshot({ path: `${dir}/samsara-unreachable-${width}.png` });
    console.log(`  → ${dir}/samsara-unreachable-${width}.png`);
    await page.close();
  }
}

await browser.close();
if (failures) { console.log(`\n${failures} check(s) failed`); process.exitCode = 1; }
else console.log('\nall checks passed');
