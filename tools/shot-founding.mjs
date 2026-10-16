/**
 * 開山 Season 0, The Founding, shot off the built game: the season card in its three
 * states, Menu > Save without the closed-test section, the last-week notice, the Stele's
 * line and the 先行 seal in the Account block. Every state is a real one, made from a
 * fabricated save and a stand-in server (the sandbox cannot reach Supabase), at 320, 400
 * and PC.
 *
 *   npx vite preview --port 4191 &
 *   BASE=http://localhost:4191/ SHOTS=/some/dir node tools/shot-founding.mjs
 *
 * The card needs a closed-test save, so that one fixture carries no season marker and the
 * page's clock is installed past SEASON_START on purpose (CLAUDE.md, the traps). Every other
 * fixture is a season save and stamps season: 's0'.
 *
 * 8 drives a game left open across the switch: the clock starts before SEASON_START and runs
 * past it, and the season card has to arrive without anybody reloading (seasonSwitch.ts). The
 * audit of 16 October found such a tab still playing its closed-test cultivator ten minutes in.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4173/';
const SHOTS = process.env.SHOTS ?? 'founding-shots';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const API = 'https://yqppvmuwlhibswbbvjzz.supabase.co';
mkdirSync(SHOTS, { recursive: true });

const DAY = 86_400;
const SEASON_START = 1792972800;            // Monday 26 October 2026, 00:00 UTC (src/sim/season.ts)
const LAST_WEEK = SEASON_START - 7 * DAY;   // Monday 19 October
const AFTER = SEASON_START + 2 * 3600;      // two hours into the season

const SIZES = [['320', 320, 640, 2], ['400', 400, 860, 2], ['pc', 1280, 720, 1]];

let failed = 0;
const check = (ok, what, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${what}${ok ? '' : `  ${detail}`}`);
  if (!ok) failed++;
};

/** A cultivator in the middle of the seventh realm, as the closed-test build wrote it: no season field. */
function closedTest() {
  const at = SEASON_START - 2 * DAY;
  return {
    v: 1, at, startedAt: at - 60 * DAY, realm: 7, layer: 5, qi: 1e9, materials: 1e7,
    levels: { technique: 42, method: 42, pills: 42, cores: 36 },
    killed: { rat: 40, hound: 30, frog: 20, fox: 3, ape: 2, crane: 2, tiger: 2, turtle: 1, puppet: 1 },
    worn: {}, chest: [], self: 'woman', tribulation: 0, tower: 60,
    seen: ['guide', 'whom'],
  };
}

/** A season cultivator a few days in. */
function seasonSave(at, over = {}) {
  return {
    v: 1, season: 's0', at: at - 30, startedAt: at - 5 * DAY, realm: 3, layer: 4, qi: 2e5, materials: 4e3,
    levels: { technique: 14, method: 12, pills: 10, cores: 6 },
    killed: { rat: 30, hound: 20, frog: 12, fox: 1, ape: 1 },
    worn: { weapon: { id: 'w', template: 'sword3', rarity: 'earth', rolls: [{ affix: 'power', value: 22 }] } },
    chest: [], self: 'woman', tribulation: 0, tower: 12, awakened: ['feast', 'wolf'],
    seen: ['guide', 'whom', 'cap', 'cores', 'tower', 'platform', 'furnace', 'refine', 'record', 'workshop', 'pool'],
    ...over,
  };
}

const USER = { id: '0b5e2f4a-1111-4222-8333-944455556666', aud: 'authenticated', role: 'authenticated', email: null, is_anonymous: true };
const session = () => ({
  access_token: 'test-token', token_type: 'bearer', expires_in: 3600 * 24 * 60,
  expires_at: SEASON_START + 60 * DAY, refresh_token: 'test-refresh', user: USER,
});
const CORS = {
  'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
};

/** The stand-in server: 'yes' says Forerunner, 'no' does not, 'offline' never answers. */
async function server(page, mode) {
  await page.route(`${API}/**`, async (route) => {
    if (mode === 'offline') return route.abort();
    const req = route.request();
    const url = new URL(req.url());
    const reply = (status, body) => route.fulfill({ status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const body = req.postDataJSON?.() ?? null;
    switch (url.pathname) {
      case '/auth/v1/user': return reply(200, USER);
      case '/auth/v1/token': return reply(200, session());
      case '/functions/v1/sync':
        // 'switch': the live server's answer from the switch on to a save that is not the season's.
        if (mode === 'switch' && await page.evaluate(() => Date.now() / 1000).catch(() => SEASON_START) >= SEASON_START) {
          return reply(409, { error: 'season' });
        }
        return reply(200, { ranked: true, state: 'verified', why: [], suspect: false, standing: null, behindHours: 0 });
      case '/rest/v1/rpc/board':
        return reply(200, [
          { rank: 1, name: 'Mistwalker', climb: 24, marks: 0, tower: 20, gain: 14, title: '期首', me: false, forerunner: true },
          { rank: 2, name: 'Old Pine', climb: 22, marks: 0, tower: 14, gain: 11, title: null, me: false, forerunner: false },
          { rank: 3, name: 'Ash', climb: 22, marks: 0, tower: 12, gain: 9, title: null, me: true, forerunner: mode === 'yes' },
        ].filter(() => body?.kind !== 'never'));
      case '/rest/v1/rpc/my_standing':
        return reply(200, { name: 'Ash', suspect: false, banned: false, climb: 22, marks: 0, tower: 12,
          verified_at: new Date().toISOString(), latest_at: new Date().toISOString(), title: null, forerunner: mode === 'yes' });
      case '/rest/v1/rpc/cliff': return reply(200, []);
      default: return reply(404, { error: url.pathname });
    }
  });
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

/** A fresh page at `time`, with the given keys written while the game's scripts are held back. */
async function plant({ size, time, keys, mode = null, tz = 'UTC', session: tab = {} }) {
  const [, W, H, scale] = size;
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: scale, timezoneId: tz });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install({ time: time * 1000 });
  if (mode) await server(page, mode);
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([kv, tab]) => {
    localStorage.clear(); sessionStorage.clear();
    for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v);
    for (const [k, v] of Object.entries(tab)) sessionStorage.setItem(k, v);
  }, [keys, tab]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForTimeout(1200);
  return { page, context, errors };
}

const signedIn = { 'ninefold.ranked': '1', 'ninefold.auth': JSON.stringify(session()) };

/** The card's own scroller, top and end: a phone does not see all of it at once. */
async function card(page, name) {
  await page.waitForSelector('.season0', { timeout: 8000 });
  await page.waitForTimeout(900);   // the seal's fall, and the server's answer
  await page.screenshot({ path: `${SHOTS}/${name}-top.png` });
  await page.evaluate(() => { const c = document.querySelector('.season0'); c.scrollTop = c.scrollHeight; });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOTS}/${name}-end.png` });
}

for (const size of SIZES) {
  const tag = size[0];
  console.log(`\n${tag}`);

  // 1. 先行 Signed in, and the server says Forerunner.
  {
    const { page, context, errors } = await plant({ size, time: AFTER, mode: 'yes',
      keys: { 'ninefold.save.v1': JSON.stringify(closedTest()), 'ninefold.save.backup': JSON.stringify(closedTest()), ...signedIn } });
    await card(page, `card-forerunner-${tag}`);
    const text = await page.locator('.season0').textContent();
    check(/The Founding/.test(text) && /開山/.test(text), 'the card is The Founding 開山');
    check(/reached Unity \(realm 7\), layer 6\. Its road ends here, under the seal\./.test(text), 'the farewell line, from the four numbers');
    check(await page.locator('.season0 .s0fore .s0seal').count() === 1, 'the 先行 seal and the Forerunner line, on the server\'s word');
    check(!/Copy it|Save as a file/.test(text), 'nothing to copy and no file');
    const keys = await page.evaluate(() => Object.keys(localStorage));
    check(!keys.includes('ninefold.save.closedtest'), 'no keepsake key', keys.join(','));
    const planted = JSON.stringify(closedTest());
    const kept = await page.evaluate(() => [localStorage.getItem('ninefold.save.v1'), localStorage.getItem('ninefold.save.backup')]);
    check(kept.every((v) => v !== planted) && !kept.some((v) => v && v.includes('"realm":7')),
      'the closed-test save and its spare are gone (the keys hold the season\'s own)', JSON.stringify(kept.map((v) => v?.slice(0, 40))));
    check(keys.includes('ninefold.season.farewell') && keys.includes('ninefold.season.walked'), 'the four numbers wait for Begin');
    check(await page.evaluate(() => {
      const w = document.querySelector('.season0'); return w.scrollWidth <= w.clientWidth + 1;
    }), 'nothing runs off the side');
    // 註 The seal answers a tap.
    await page.locator('.season0 .s0fore button.term').click();
    await page.waitForTimeout(250);
    check(/A mark, not a save/.test(await page.locator('.termtip').textContent().catch(() => '')), 'the seal\'s note');
    await page.screenshot({ path: `${SHOTS}/card-forerunner-note-${tag}.png` });
    await page.keyboard.press('Escape');
    // 始 Begin clears the farewell.
    await page.locator('.season0 .s0acts button.act').click();
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => [localStorage.getItem('ninefold.season.farewell'), localStorage.getItem('ninefold.season.walked')]);
    check(after[0] === null && after[1] !== null, 'Begin clears the farewell; the Stele keeps its line', JSON.stringify(after));
    check(errors.length === 0, 'no page errors', errors.join(' | '));
    await context.close();
  }

  // 2. Signed out: the way to sign in, never "the server did not see you".
  {
    const { page, context } = await plant({ size, time: AFTER,
      keys: { 'ninefold.save.v1': JSON.stringify(closedTest()) } });
    await card(page, `card-signedout-${tag}`);
    check(await page.locator('.season0 .s0signed').count() === 1 && await page.locator('.season0 .s0fore').count() === 0,
      'signed out, it points to signing in');
    await context.close();
  }

  // 3. Signed in, no answer from the server (offline), or an answer of no: nothing at all.
  for (const mode of ['offline', 'no']) {
    const { page, context } = await plant({ size, time: AFTER, mode,
      keys: { 'ninefold.save.v1': JSON.stringify(closedTest()), ...signedIn } });
    await card(page, `card-${mode}-${tag}`);
    check(await page.locator('.season0 .s0signed, .season0 .s0fore').count() === 0, `signed in, ${mode}: no last line`);
    await context.close();
  }

  // 4. Menu > Save in the season: no closed-test section.
  {
    const { page, context } = await plant({ size, time: AFTER + 3 * DAY, mode: 'yes',
      keys: { 'ninefold.save.v1': JSON.stringify(seasonSave(AFTER + 3 * DAY)), ...signedIn, 'ninefold.season.card': '1' } });
    await page.click('.mainswitch');
    await page.locator('.switchmenu button', { hasText: 'Save' }).first().click();
    await page.waitForSelector('.savepanel');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/menu-save-${tag}.png` });
    check(!/Closed test|closed-test/i.test(await page.locator('.savepanel').textContent()), 'Menu > Save has no closed-test section');
    await context.close();
  }

  // 5. 終 The last-week notice, on a phone in Brazil and in UTC.
  for (const tz of ['America/Sao_Paulo', 'UTC']) {
    const t = LAST_WEEK + 3 * DAY + 12 * 3600;
    const { page, context } = await plant({ size, time: t, tz,
      keys: { 'ninefold.save.v1': JSON.stringify(seasonSave(t, { season: 's0', startedAt: t - 40 * DAY })) } });
    await page.waitForSelector('.notice', { timeout: 8000 }).catch(() => {});
    const text = await page.locator('.notice').textContent().catch(() => '');
    const where = tz === 'UTC' ? 'utc' : 'brazil';
    check(tz === 'UTC' ? /ends on Monday 26 October, 00:00 \(Monday 26 October, 00:00 UTC\)/.test(text)
      : /ends on Sunday 25 October, 21:00 \(Monday 26 October, 00:00 UTC\)/.test(text), `the notice, ${where}: the local day and time first`, text);
    await page.screenshot({ path: `${SHOTS}/notice-${where}-${tag}.png` });
    await context.close();
  }
  // And never after the switch.
  {
    const t = AFTER + DAY;
    const { page, context } = await plant({ size, time: t,
      keys: { 'ninefold.save.v1': JSON.stringify(seasonSave(t)), 'ninefold.season.card': '1' } });
    check(!/closed test ends/.test(await page.locator('.notice').textContent().catch(() => '')), 'no notice after the switch');
    await context.close();
  }

  // 6. 碑 The Stele's line on this device.
  {
    const t = AFTER + 3 * DAY;
    const { page, context } = await plant({ size, time: t,
      keys: { 'ninefold.save.v1': JSON.stringify(seasonSave(t)), 'ninefold.season.card': '1',
        'ninefold.season.walked': JSON.stringify({ realm: 7, layer: 6, marks: 0, rebirths: 0 }) } });
    await page.click('.mainswitch');
    await page.locator('.switchmenu button', { hasText: 'Stele' }).first().click();
    await page.waitForSelector('.stelepage .chwalked', { timeout: 5000 }).catch(() => {});
    check(/Walked the closed test on this device/.test(await page.locator('.stelepage .chwalked').textContent().catch(() => '')),
      'the Stele says it, for this device');
    await page.screenshot({ path: `${SHOTS}/stele-${tag}.png` });
    await context.close();
  }

  // 7. 先行 The Account block in Ranks.
  {
    const t = AFTER + 3 * DAY;
    const { page, context } = await plant({ size, time: t, mode: 'yes',
      keys: { 'ninefold.save.v1': JSON.stringify(seasonSave(t)), ...signedIn, 'ninefold.season.card': '1' } });
    await page.click('nav.tabs button.ranktab');
    await page.waitForSelector('.ranks .raccount .rafore', { timeout: 8000 }).catch(() => {});
    check(await page.locator('.ranks .raccount .rafore .raseal').count() === 1, 'the Account block wears 先行 Forerunner');
    await page.locator('.ranks .raccount').scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${SHOTS}/account-${tag}.png` });
    await context.close();
  }

  // 8. 開山 A game left open across the switch: the card arrives with nobody reloading.
  {
    const t0 = SEASON_START - 90;
    const open = { ...closedTest(), at: t0 - 30, seen: ['guide', 'whom', 'lastweek'] };
    const { page, context, errors } = await plant({ size, time: t0, mode: 'switch',
      keys: { 'ninefold.save.v1': JSON.stringify(open), ...signedIn } });
    let loads = 0;
    page.on('load', () => { loads++; });
    for (const b of await page.locator('.notice button').all()) await b.click({ timeout: 500 }).catch(() => {});
    check(await page.locator('.season0').count() === 0, 'open across the switch: before it, the closed test plays on');
    // Two minutes of the page's own clock, through the switch. The page reloads itself under
    // it, which can end the run early: that is the point, so it is waited for, not failed on.
    await page.clock.runFor(120_000).catch(() => {});
    const arrived = await page.waitForSelector('.season0', { timeout: 8000 }).then(() => true, () => false);
    check(arrived, 'open across the switch: the season card arrives without a reload by hand');
    check(loads === 1, 'open across the switch: the game reloaded itself once', `loads=${loads}`);
    if (arrived) {
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${SHOTS}/across-card-${tag}.png` });
      check(/Its road ends here, under the seal\./.test(await page.locator('.season0').textContent()), 'open across the switch: the farewell is the closed-test cultivator\'s');
    }
    // Run on: the season cultivator is not reloaded again.
    await page.clock.runFor(30_000).catch(() => {});
    await page.waitForTimeout(400);
    check(loads === 1, 'open across the switch: once, and never again', `loads=${loads}`);
    check(errors.length === 0, 'open across the switch: no page errors', errors.join(' | '));
    await context.close();
  }

  // 8b. The same tab, already reloaded once at the switch (the mark is in sessionStorage): it
  // never reloads twice, and 榜 Ranks says what to do in words that fit the case.
  {
    // Planted before the switch so the load keeps the closed-test cultivator, then run past it
    // and past the next five-minute sync, which the server refuses for its season.
    const t0 = SEASON_START - 60;
    const { page, context } = await plant({ size, time: t0, mode: 'switch',
      // In the first realm, so no 悟道 card of a realm behind it stands over the screen.
      keys: { 'ninefold.save.v1': JSON.stringify({ ...closedTest(), realm: 1, layer: 4, qi: 50, materials: 20, tower: 0,
        levels: { technique: 3, method: 2, pills: 1, cores: 0 }, killed: { rat: 4 }, at: t0 - 30, seen: ['guide', 'whom', 'lastweek'] }), ...signedIn },
      session: { 'ninefold.season.reloaded': String(SEASON_START) } });
    let loads = 0;
    page.on('load', () => { loads++; });
    for (const b of await page.locator('.notice button').all()) await b.click({ timeout: 500 }).catch(() => {});
    await page.clock.runFor(330_000).catch(() => {});
    await page.waitForTimeout(400);
    check(loads === 0 && await page.locator('.season0').count() === 0, 'a tab that already reloaded once does not reload again', `loads=${loads}`);
    for (const b of await page.locator('.notice button').all()) await b.click({ timeout: 500 }).catch(() => {});
    await page.click('nav.tabs button.ranktab').catch(() => {});
    await page.clock.runFor(2_000).catch(() => {});
    const said = await page.waitForSelector('text=Close the game and open it again to begin Season 0', { timeout: 8000 }).then(() => true, () => false);
    check(said, 'Ranks: close the game and open it again, then the clock');
    await page.screenshot({ path: `${SHOTS}/across-ranks-${tag}.png` });
    await context.close();
  }
}

await browser.close();
console.log(failed ? `\n✗ ${failed} failed` : '\n✓ all of it');
process.exit(failed ? 1 : 0);
