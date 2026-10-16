/**
 * 榜 The rankings and the sign-in, walked in the built game against a stand-in server.
 *
 * The real server is Supabase and this container cannot reach it, so every request the
 * game makes to it is answered here, the way the real one answers (the schema and the
 * sync function are tested on their own in src/sim/__tests__). What this proves is the
 * game's half: a new player can join as a guest and see themselves on the board; the
 * sync carries the save and the name; a player arriving from an email link on a new
 * device is asked which cultivator goes on, and the one chosen is the one they get.
 *
 *   npm run ranks          (the preview must be running: npx vite preview --port 4173)
 */
import { chromium } from 'playwright';
import { isSealed, open as unsealText } from '../src/sim/seal.ts';
import { cliffRows, forerunnerRows, SEASON_START, UNCARVED } from './cliff-fixture.mjs';
// 封 The game seals what it writes; a save written here is plain, and both open.
const unseal = (raw) => (raw == null ? null : JSON.parse(isSealed(raw) ? unsealText(raw).json : raw));

const BASE = process.env.BASE ?? 'http://localhost:4173/';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SHOTS = process.env.SHOTS;
const API = 'https://yqppvmuwlhibswbbvjzz.supabase.co';
let failed = 0;
const check = (ok, what, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${what}${ok ? '' : `  ${detail}`}`);
  if (!ok) failed++;
};

const USER = { id: '0b5e2f4a-1111-4222-8333-944455556666', aud: 'authenticated', role: 'authenticated', email: null, is_anonymous: true };
const session = (user) => ({
  access_token: 'test-token', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'test-refresh', user,
});
const CORS = {
  'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
};

/** A stand-in for the project: auth, the sync function and the board RPCs. */
function server(page, { cloud = null, email = null, cliff = [], cliffDown = false, forerunners = null } = {}) {
  const seen = { syncs: [], names: [] };
  const user = email ? { ...USER, email, is_anonymous: false } : USER;
  page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const reply = (status, body) => route.fulfill({ status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const body = req.postDataJSON?.() ?? null;
    switch (url.pathname) {
      case '/auth/v1/signup': return reply(200, session(USER));
      case '/auth/v1/user': return reply(200, user);
      case '/auth/v1/otp': return reply(200, {});
      case '/auth/v1/verify': return reply(200, session({ ...USER, email: email ?? 'tester@example.com', is_anonymous: false }));
      case '/auth/v1/logout': return route.fulfill({ status: 204, headers: CORS });
      case '/auth/v1/token': return reply(200, session(user));
      case '/functions/v1/sync':
        if (body?.action === 'pull') return reply(200, { save: cloud, at: new Date().toISOString() });
        seen.syncs.push(body);
        if (body?.name) seen.names.push(body.name);
        return reply(200, { ranked: true, state: 'verified', why: [], suspect: false, standing: null, behindHours: 0 });
      case '/rest/v1/rpc/board': {
        const kind = body?.kind;
        const rows = [
          // 先行 Two Forerunners: one wearing a title as well, so the seal is seen beside it, not in its place.
          { rank: 1, name: '雲中君', climb: 62, marks: 0, tower: 88, gain: 14, title: '天下第一', me: false, calling: 'swordimmortal', forerunner: true },
          { rank: 2, name: 'Mistwalker', climb: 51, marks: 0, tower: 40, gain: 11, title: '期首', me: false, calling: 'qi:2', forerunner: false },
          { rank: 3, name: 'Old Pine', climb: 44, marks: 0, tower: 31, gain: 9, title: null, me: false, calling: 'sorcerer:9', forerunner: true },
          { rank: 4, name: seen.names.at(-1) ?? '修士 0B5E', climb: 3, marks: 0, tower: 0, gain: 3, title: null, me: true, forerunner: false },
        ];
        return reply(200, kind === 'tower' ? rows.filter((r) => r.tower > 0) : rows);
      }
      case '/rest/v1/rpc/my_standing':
        return reply(200, { name: seen.names.at(-1) ?? '修士 0B5E', suspect: false, banned: false, climb: 3, marks: 0, tower: 0, verified_at: new Date().toISOString(), latest_at: new Date().toISOString(), title: '期首', forerunner: !!cliff.length });
      case '/rest/v1/rpc/set_name': return reply(200, body?.new_name?.trim());
      case '/rest/v1/rpc/cliff': return cliffDown ? reply(500, { message: 'down' }) : reply(200, cliff);
      // 先行 Every Forerunner's name; left unanswered (as a server without it) unless given.
      case '/rest/v1/rpc/forerunners': return forerunners ? reply(200, forerunners) : reply(404, { message: 'no forerunners()' });
      default: return reply(404, { error: url.pathname });
    }
  });
  return seen;
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function fresh(page) {
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.unroute('**/assets/*.js');
}

// 榜 The rankings are a tab on the bar now, not a line in the corner menu.
async function openRanks(page) {
  await page.click('nav.tabs button.ranktab');
  await page.waitForSelector('.ranks');
}

for (const [label, W, H] of [['phone', 400, 860], ['desktop', 1440, 900]]) {
  console.log(`\n${label}`);
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const seen = server(page);
  await fresh(page);
  await page.goto(BASE);
  await page.waitForSelector('.prologue');
  check(await page.locator('.prologue .phave').isVisible(), 'the title page offers a way in for an existing cultivator');
  await page.click('.prologue button.act'); await page.waitForTimeout(300);
  await page.click('.prologue button.act'); await page.waitForTimeout(300);
  await page.locator('.whom .pick').first().click(); await page.waitForTimeout(500);
  for (let i = 0; i < 3; i++) { const x = await page.$('.notice button'); if (!x) break; await x.click(); }

  await openRanks(page);
  check(await page.locator('.ranks .rjoin').isVisible(), 'a player who is not signed in is asked to join');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${label}-join.png` });
  check(await page.locator('.ranks .rjoin button.act').first().isDisabled(), 'no name, no entry');
  // 名 A title is not a name: the join screen says so before the server has to.
  await page.fill('.ranks .rjoin input:not([type=email])', '天下第一');
  check(await page.locator('.ranks .rjoin [data-tone="bad"]').isVisible()
    && await page.locator('.ranks .rjoin button.act').first().isDisabled(), 'a title typed as a name is refused, in words');
  // 先行 The Forerunner mark is worn beside a name, never typed into one.
  await page.fill('.ranks .rjoin input:not([type=email])', '先行 Kai');
  check(/先行 Forerunner mark/.test(await page.locator('.ranks .rjoin [data-tone="bad"]').textContent().catch(() => ''))
    && await page.locator('.ranks .rjoin button.act').first().isDisabled(), 'the 先行 mark typed as a name is refused, in words');
  await page.fill('.ranks .rjoin input:not([type=email])', 'Lantern');
  await page.locator('.ranks .rjoin button.act').first().click();
  await page.waitForSelector('.ranks .rlist li[data-me="true"]', { timeout: 8000 }).catch(() => {});
  check(await page.locator('.ranks .rlist li[data-me="true"]').count() === 1, 'the new player is on the board, marked as them');
  check(seen.syncs.length >= 1 && seen.syncs[0]?.save?.v === 1, 'the sync carried the save', JSON.stringify(seen.syncs[0])?.slice(0, 80));
  check(seen.names.includes('Lantern'), 'and the name', seen.names.join(','));
  // 期 It opens on the week, the one board a newcomer can win (Raziel, 2026-10-02).
  const opened = await page.locator('.ranks .rtabs button[aria-selected="true"]').textContent();
  const first = await page.locator('.ranks .rtabs button').first().textContent();
  check(/This Week/.test(opened ?? '') && /This Week/.test(first ?? ''), 'the rankings open on This Week, the first tab', `${opened} / ${first}`);
  await page.waitForTimeout(400);
  check(await page.locator('.ranks .rstatus[data-tone="good"]').isVisible(), 'the status says the climb is ranked');
  check(await page.locator('.ranks .rlist .rcall').count() === 2,
    'each row names the class its save wears, and a class the game does not know shows nothing',
    await page.locator('.ranks .rlist .rcall').allTextContents());
  check((await page.locator('.ranks .rlist li').first().locator('.rcall').textContent()) === '劍仙 Sword Immortal',
    'in English beside the characters', await page.locator('.ranks .rlist .rcall').first().textContent());
  // 先行 The seal on exactly the rows the server marked, named in English, and beside a title, never in its place.
  check(await page.locator('.ranks .rlist .fore').count() === 2, 'the 先行 seal stands on the two rows the server marked, and no other',
    String(await page.locator('.ranks .rlist .fore').count()));
  check(await page.locator('.ranks .rlist li').first().locator('.fore[aria-label="Forerunner"]').count() === 1
    && /天下第一/.test(await page.locator('.ranks .rlist li').first().locator('.rw > i').textContent().catch(() => '')),
    'its label says Forerunner, and the 天下第一 title stays beside it');
  check(await page.locator('.ranks .rlist li[data-me="true"] .fore').count() === 0, 'a player the server did not mark wears nothing');
  await page.locator('.ranks .rlist .fore').first().click();
  await page.waitForTimeout(250);
  check(/closed test before the seal fell/.test(await page.locator('.termtip').textContent().catch(() => '')),
    'a tap on the seal answers with its note', await page.locator('.termtip').textContent().catch(() => 'none'));
  await page.locator('.ranks h2').click();
  // This part runs on the real clock, so it says what is true on either side of the switch.
  if (Date.now() / 1000 < SEASON_START) check(await page.locator('.ranks .rcliffdoor').count() === 0, 'before the switch there is no Cliff to open');
  else check(await page.locator('.ranks .rcliffdoor').count() === 1, 'from the switch, Rankings has a way to the Cliff');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${label}-board.png` });
  check(/Fair play/.test(await page.locator('.ranks').textContent()), 'the boards say, under them, how they are kept fair');
  // 試 And say it truly: until the switch the server ranks every save while the test runs.
  const fair = await page.locator('.ranks').textContent();
  if (Date.now() / 1000 < SEASON_START) check(/show every save while we test/.test(fair) && !/was checked by the server/.test(fair),
    'before the switch the fair-play line says the boards show every save while we test');
  else check(/was checked by the server/.test(fair) && !/while we test/.test(fair), 'from the switch the fair-play line says every climb was checked');
  check(await page.locator('.ranks .rstatus[data-tone="bad"]').count() === 0, 'and an untouched save hears nothing about editing');
  // 改 A save changed by hand: it plays on, and the rankings screen says so plainly.
  await page.evaluate(() => localStorage.setItem('ninefold.edited', '1'));
  await page.locator('.ranks .rtabs button', { hasText: 'Tower' }).click();
  await page.waitForTimeout(400);
  check(/changed outside the game/.test(await page.locator('.ranks .rstatus[data-tone="bad"]').textContent().catch(() => '')),
    'a save changed outside the game is told, in words, that the boards only count what verifies');
  if (SHOTS) {
    await page.locator('.ranks').evaluate((el) => { el.style.height = 'auto'; el.style.maxHeight = 'none'; el.style.overflow = 'visible'; });
    await page.locator('.ranks').screenshot({ path: `${SHOTS}/${label}-fair.png` });
    await page.reload();
  }
  await page.evaluate(() => localStorage.removeItem('ninefold.edited'));
  if (SHOTS) {
    await page.locator('nav.tabs .ranktab').click().catch(() => {});
    await page.waitForSelector('.ranks .rtabs', { timeout: 6000 }).catch(() => {});
    await page.locator('.ranks .rtabs button', { hasText: 'Tower' }).click();
    await page.waitForTimeout(400);
  }
  check(await page.locator('.ranks .rlist li').count() === 3, 'the tower board leaves off who has no floor');
  check(await page.evaluate(() => localStorage.getItem('ninefold.ranked')) === '1', 'the device remembers it signed in');
  await page.keyboard.press('Escape');
  await page.locator('.ranks button.act', { hasText: 'Back to the climb' }).click().catch(() => {});
  await page.waitForSelector('.wears', { timeout: 4000 }).catch(() => {});
  check(await page.locator('.wears').isVisible(), 'the title the boards gave is worn on 修, in English too',
    await page.locator('.wears').textContent().catch(() => 'none'));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${label}-title.png` });
  await page.waitForSelector('nav.tabs .ranktab .rankplace', { timeout: 4000 }).catch(() => {});
  check((await page.locator('nav.tabs .ranktab .rankplace').textContent().catch(() => '')) === '#4',
    'the rankings tab carries the player\'s place', await page.locator('nav.tabs .ranktab').textContent().catch(() => 'none'));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${label}-tab.png` });
  check(!/Rankings/.test(await (async () => { await page.click('.mainswitch'); await page.waitForTimeout(300);
    const t = (await page.textContent('.switchmenu').catch(() => '')) ?? ''; await page.click('.mainswitch'); return t; })()),
    'and the corner menu no longer hides them');
  check(errors.length === 0, 'no errors on the page', errors.join(' | '));
  await page.close();
}

// 雲 A new device: arriving from an email link, with a further cultivator in the cloud.
console.log('\na new device');
{
  const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
  const now = Math.floor(Date.now() / 1000);
  const cloud = { v: 1, season: 's0', at: now - 60, startedAt: now - 30 * 86400, realm: 5, layer: 3, qi: 5e6, materials: 900,
    wardenFell: false, levels: { technique: 20, method: 20, pills: 18, cores: 20 }, killed: { rat: 40, hound: 30 },
    self: 'woman', seen: ['guide', 'whom'] };
  server(page, { cloud, email: 'tester@example.com' });
  await fresh(page);
  // A link from an email opens the page from nothing. Only changing the # of a page that
  // is already open reloads nothing, and the game would never see the link at all.
  await page.goto('about:blank');
  await page.goto(`${BASE}#access_token=test-token&refresh_token=test-refresh&expires_in=3600&expires_at=${now + 3600}&token_type=bearer&type=magiclink`);
  await page.waitForSelector('.cloudpick', { timeout: 10000 }).catch(() => {});
  check(await page.locator('.cloudpick').isVisible(), 'the cloud holds a further cultivator, and the game asks');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/newdevice-pick.png` });
  await page.locator('.cloudpick button.act').first().click();
  await page.waitForTimeout(700);
  const realm = unseal(await page.evaluate(() => localStorage.getItem('ninefold.save.v1')))?.realm;
  check(realm === 5, 'continuing from the cloud brings the cultivator here', String(realm));
  check(!(await page.evaluate(() => location.hash)).includes('access_token'), 'and the link is taken out of the address');
  await page.close();
}

// 碼 The same, by the six digits, the way it goes inside the installed app.
console.log('\na new device, by the code in the email');
{
  const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
  const now = Math.floor(Date.now() / 1000);
  const cloud = { v: 1, season: 's0', at: now - 60, startedAt: now - 30 * 86400, realm: 4, layer: 6, qi: 5e6, materials: 900,
    wardenFell: false, levels: { technique: 18, method: 18, pills: 16, cores: 18 }, killed: { rat: 40, hound: 30 },
    self: 'man', seen: ['guide', 'whom'] };
  const seen = server(page, { cloud, email: 'tester@example.com' });
  await fresh(page);
  await page.goto(BASE);
  await page.waitForSelector('.prologue');
  await page.click('.prologue .phave');
  await page.waitForSelector('.ranks .rjoin');
  await page.fill('.ranks .rjoin input[type=email]', 'tester@example.com');
  await page.locator('.ranks .rjoin button.act.ghost').click();
  await page.waitForSelector('.ranks .rcode input', { timeout: 5000 }).catch(() => {});
  check(await page.locator('.ranks .rcode input').isVisible(), 'after the email is sent, the game asks for its code');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/code.png` });
  await page.fill('.ranks .rcode input', '123456');
  await page.locator('.ranks .rcode button').click();
  await page.waitForSelector('.cloudpick', { timeout: 8000 }).catch(() => {});
  check(await page.locator('.cloudpick').isVisible(), 'the code signs in, and the cloud cultivator is offered');
  check(seen.syncs.length === 0, 'nothing was synced before the choice, so the cloud copy is untouched', String(seen.syncs.length));
  await page.locator('.cloudpick button.act').first().click();
  await page.waitForTimeout(600);
  const realm = unseal(await page.evaluate(() => localStorage.getItem('ninefold.save.v1')))?.realm;
  check(realm === 4, 'and continuing brings it here', String(realm));
  await page.close();
}

// 題名崖 The Cliff of Names, after the switch: the game's own clock is set into the season.
/** A cultivator on this device, signed in unless told otherwise, with the clock `day` days into the season. */
async function seasonPage(W, H, day, opts) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const at = SEASON_START + day * 86400 + 11 * 3600;
  await page.clock.install({ time: new Date(at * 1000) });
  const seen = server(page, opts);
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([s, sess, signed]) => {
    localStorage.clear();
    localStorage.setItem('ninefold.save.v1', JSON.stringify(s));
    if (signed) { localStorage.setItem('ninefold.ranked', '1'); localStorage.setItem('ninefold.auth', JSON.stringify(sess)); }
  }, [{ v: 1, season: 's0', at: at - 30, startedAt: SEASON_START + 600, realm: 2, layer: 4, qi: 4e4, materials: 300,
    wardenFell: false, levels: { technique: 8, method: 8, pills: 6, cores: 2 }, killed: { rat: 60, hound: 30, fox: 1 },
    awakened: ['feast'], self: 'man', seen: ['guide', 'whom', 'marks', 'reach', 'gear', 'stance'] },
  { ...session(USER), expires_at: at + 3600 }, opts.signed !== false]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(700);
  for (let i = 0; i < 8; i++) {
    const x = await page.$('.awaken .acard') ?? await page.$('.notice button');
    if (!x) break;
    await x.click().catch(() => {}); await page.waitForTimeout(200);
  }
  await openRanks(page);
  return { page, errors, seen };
}

const day9 = cliffRows({ me: '修士 0B5E' });
// 先行 At 320 the server answers forerunners(); on the PC window it does not, and the foot falls back.
for (const [label, W, H, whole] of [['320', 320, 720, true], ['desktop', 1280, 720, false]]) {
  console.log(`\nthe Cliff of Names, day 9, ${label}${whole ? '' : ', without forerunners()'}`);
  const { page, errors } = await seasonPage(W, H, 9, { cliff: day9, forerunners: whole ? forerunnerRows(day9) : null });
  check(await page.locator('.ranks .rcliffdoor').isVisible(), 'from the switch, Rankings has a way to the Cliff');
  await page.waitForSelector('.ranks .rmine', { timeout: 6000 }).catch(() => {});
  check(await page.locator('.ranks .rmine .rmseal[aria-label="Forerunner"]').count() === 1,
    'the head of Rankings carries the player\'s own 先行, on the server\'s word');
  await page.click('.ranks .rcliffdoor');
  await page.waitForSelector('.ranks .rcol', { timeout: 8000 }).catch(() => {});
  const cols = page.locator('.ranks .rcol');
  check(await cols.count() === 9, 'nine columns, one per gate', String(await cols.count()));
  const names = (await page.locator('.ranks .rcolname span').allTextContents()).join(',');
  check(names === 'Spirit Fox,Stone Ape,Immortal Crane,Thunder Tiger,Black Turtle,Stone Puppet,Demon Wolf,Serpent Dragon,Dragon',
    'each named for its warden, in English', names);
  const on = await page.locator('.ranks .rcol[data-on="true"]').count();
  check(on === 4, 'four gates have names on day 9, and five are still in ink', String(on));
  const filters = await page.$$eval('.ranks .rcolpic', (els) => els.map((e) => getComputedStyle(e).filter));
  check(filters.slice(0, 4).every((f) => f === 'none') && filters.slice(4).every((f) => /grayscale/.test(f)),
    'a column takes its colour with its first name, and stays in ink before it', filters.join(' | '));
  check(await page.locator('.ranks .rcol[data-gate="1"] .rcolrow').count() === 10,
    'a full column shows its first nine, and the player\'s own place under them');
  check(await page.locator('.ranks .rcolrow[data-me]').count() === 2
    && /23/.test(await page.locator('.ranks .rcol[data-gate="1"] .rcolrow[data-me] .rcoln').textContent().catch(() => '')),
    'the player\'s place is lit on both gates they are through');
  check((await page.locator('.ranks .rcliffmine p').count()) === 2, 'and said in words above the Cliff');
  check(/Oct/.test(await page.locator('.ranks .rcol[data-gate="1"] .rcolw i').first().textContent().catch(() => '')),
    'each name carries the server\'s date');
  const widths = await page.evaluate(() => {
    const sc = document.querySelector('.ranks .rcliffscroll');
    const sheet = document.querySelector('.ranks');
    return { doc: document.documentElement.scrollWidth, vw: innerWidth, sheet: sheet.scrollWidth - sheet.clientWidth,
      inner: sc.scrollWidth, frame: sc.clientWidth };
  });
  check(widths.doc <= widths.vw && widths.sheet <= 0, 'the page never scrolls sideways', JSON.stringify(widths));
  check(widths.inner > widths.frame, 'the nine columns scroll sideways inside their own frame', JSON.stringify(widths));
  await page.waitForTimeout(300);
  const foot = (await page.locator('.ranks .rcliffnames span').allTextContents()).map((n) => n.replace(/ · $/, ''));
  const footSays = await page.locator('.ranks .rclifffoot small').textContent().catch(() => '');
  if (whole) {
    const want = forerunnerRows(day9).map((r) => r.name);
    check(foot.length === want.length && foot.every((n, i) => n === want[i]) && UNCARVED.every((n) => foot.includes(n)),
      '先行 Those who walked before: every Forerunner, carved or not, once each, with no numbers', `${foot.length} of ${want.length}`);
    check(/Every Forerunner/.test(footSays), 'and it says it is every Forerunner', footSays);
  } else {
    const want = new Set(day9.filter((r) => r.forerunner).map((r) => r.name));
    check(foot.length === want.size && foot.every((n) => want.has(n)) && !UNCARVED.some((n) => foot.includes(n)),
      '先行 without forerunners(), the foot lists the Forerunners carved on the Cliff, once each', `${foot.length} of ${want.size}`);
    check(/carved on the Cliff/.test(footSays), 'and says that is all it lists', footSays);
  }
  await page.click('.ranks .rcliffall');
  check(await page.locator('.ranks .rcol[data-gate="1"] .rcolrow').count() === 81, 'every name, when asked for: 81 in a full column');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cliff-${label}.png` });
  await page.click('.ranks .rcliffback');
  check(await page.locator('.ranks .rtabs').isVisible(), 'and back to the boards');
  check(errors.length === 0, 'no errors on the page', errors.join(' | '));
  await page.close();
}

console.log('\nthe Cliff of Names, day 0, and when it cannot be reached');
{
  const { page, errors } = await seasonPage(400, 860, 0, { cliff: [] });
  await page.click('.ranks .rcliffdoor');
  await page.waitForSelector('.ranks .rcol', { timeout: 8000 }).catch(() => {});
  check(await page.locator('.ranks .rcol[data-on="false"]').count() === 9 && await page.locator('.ranks .rcliffempty').isVisible(),
    'on day 0 every column is in ink, and the Cliff says nobody is through yet');
  check(await page.locator('.ranks .rcolnone').count() === 9 && await page.locator('.ranks .rcliffnames').count() === 0,
    'each column says so, and the foot has no names to list');
  await page.click('.ranks .rcliffback');
  await page.waitForSelector('.ranks .rmine', { timeout: 6000 }).catch(() => {});
  check(await page.locator('.ranks .rmine').isVisible() && await page.locator('.ranks .rmine .rmseal').count() === 0,
    'an account the server did not mark wears no seal at the head');
  check(errors.length === 0, 'no errors on the page', errors.join(' | '));
  await page.close();
  const down = await seasonPage(400, 860, 3, { cliffDown: true, signed: false });
  check(await down.page.locator('.ranks .rjoin').isVisible() && await down.page.locator('.ranks .rcliffdoor').isVisible(),
    'a player who has not joined the boards can still open the Cliff');
  await down.page.click('.ranks .rcliffdoor');
  await down.page.waitForSelector('.ranks .rcliffnote:has-text("cannot be reached")', { timeout: 8000 }).catch(() => {});
  check(/cannot be reached/.test(await down.page.locator('.ranks .rcliffnote').textContent().catch(() => '')),
    'and a Cliff the server cannot give says so in words');
  await down.page.close();
}

await browser.close();
console.log(failed ? `\n${failed} failed` : '\n榜 the rankings and the sign-in hold.');
process.exit(failed ? 1 : 0);
