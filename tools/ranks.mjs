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
function server(page, { cloud = null, email = null } = {}) {
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
      case '/auth/v1/logout': return route.fulfill({ status: 204, headers: CORS });
      case '/functions/v1/sync':
        if (body?.action === 'pull') return reply(200, { save: cloud, at: new Date().toISOString() });
        seen.syncs.push(body);
        if (body?.name) seen.names.push(body.name);
        return reply(200, { ranked: true, state: 'verified', why: [], suspect: false, standing: null, behindHours: 0 });
      case '/rest/v1/rpc/board': {
        const kind = body?.kind;
        const rows = [
          { rank: 1, name: '雲中君', climb: 62, marks: 0, tower: 88, gain: 14, title: '天下第一', me: false },
          { rank: 2, name: 'Mistwalker', climb: 51, marks: 0, tower: 40, gain: 11, title: '期首', me: false },
          { rank: 3, name: 'Old Pine', climb: 44, marks: 0, tower: 31, gain: 9, title: null, me: false },
          { rank: 4, name: seen.names.at(-1) ?? '修士 0B5E', climb: 3, marks: 0, tower: 0, gain: 3, title: null, me: true },
        ];
        return reply(200, kind === 'tower' ? rows.filter((r) => r.tower > 0) : rows);
      }
      case '/rest/v1/rpc/my_standing':
        return reply(200, { name: seen.names.at(-1) ?? '修士 0B5E', suspect: false, banned: false, climb: 3, marks: 0, tower: 0, verified_at: new Date().toISOString(), latest_at: new Date().toISOString(), title: null });
      case '/rest/v1/rpc/set_name': return reply(200, body?.new_name?.trim());
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

async function openRanks(page) {
  await page.click('.mainswitch');
  await page.locator('.switchmenu button', { hasText: 'Rankings' }).click();
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
  await page.fill('.ranks .rjoin input:not([type=email])', 'Bruno');
  await page.locator('.ranks .rjoin button.act').first().click();
  await page.waitForSelector('.ranks .rlist li[data-me="true"]', { timeout: 8000 }).catch(() => {});
  check(await page.locator('.ranks .rlist li[data-me="true"]').count() === 1, 'the new player is on the board, marked as them');
  check(seen.syncs.length >= 1 && seen.syncs[0]?.save?.v === 1, 'the sync carried the save', JSON.stringify(seen.syncs[0])?.slice(0, 80));
  check(seen.names.includes('Bruno'), 'and the name', seen.names.join(','));
  await page.waitForTimeout(400);
  check(await page.locator('.ranks .rstatus[data-tone="good"]').isVisible(), 'the status says the climb is ranked');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${label}-board.png` });
  await page.locator('.ranks .rtabs button', { hasText: 'Tower' }).click();
  await page.waitForTimeout(400);
  check(await page.locator('.ranks .rlist li').count() === 3, 'the tower board leaves off who has no floor');
  check(await page.evaluate(() => localStorage.getItem('ninefold.ranked')) === '1', 'the device remembers it signed in');
  check(errors.length === 0, 'no errors on the page', errors.join(' | '));
  await page.close();
}

// 雲 A new device: arriving from an email link, with a further cultivator in the cloud.
console.log('\na new device');
{
  const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
  const now = Math.floor(Date.now() / 1000);
  const cloud = { v: 1, at: now - 60, startedAt: now - 30 * 86400, realm: 5, layer: 3, qi: 5e6, materials: 900,
    wardenFell: false, levels: { technique: 20, method: 20, pills: 18, cores: 20 }, killed: { rat: 40, hound: 30 },
    self: 'woman', seen: ['guide', 'whom'] };
  server(page, { cloud, email: 'bruno@example.com' });
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
  const realm = await page.evaluate(() => JSON.parse(localStorage.getItem('ninefold.save.v1') ?? '{}').realm);
  check(realm === 5, 'continuing from the cloud brings the cultivator here', String(realm));
  check(!(await page.evaluate(() => location.hash)).includes('access_token'), 'and the link is taken out of the address');
  await page.close();
}

await browser.close();
console.log(failed ? `\n${failed} failed` : '\n榜 the rankings and the sign-in hold.');
process.exit(failed ? 1 : 0);
