/**
 * 榜 The ranked server, attacked live.
 *
 * Run by the deploy workflow once the schema and the sync function are up, against the
 * real project, with only the public key a phone has. It plays a new player and then
 * plays a cheater, and fails the run if the server believes anything it should not.
 *
 *   SUPABASE_URL=… SUPABASE_KEY=… npx tsx tools/ranked.ts
 *
 * 盾 With CAPTCHA=on the server asks every sign-in for an hCaptcha answer, which a
 * script cannot give. The run then proves exactly that (a guest without one is turned
 * away) and makes its own two players with the secret key the workflow reads from the
 * project, which the auth server lets past the captcha as an administrator. The key is
 * masked in the log and never written anywhere.
 */
import { newState } from '../src/sim/state.ts';
import { advance } from '../src/sim/time.ts';
// 試 While the server is in testing (acceptsEverything, on until the season begins), it verifies
// what it refuses, so the cheats below are expected to be accepted. The same function is in the
// deployed one, read on the same clock.
import { acceptsEverything } from '../supabase/functions/sync/core.ts';
// 季 Every attack branches on the switch, so a run before it (Push A) and a run after it (Push B
// and every deploy since) each prove their own half against the live server.
import { SEASON, SEASON_START } from '../src/sim/season.ts';

const URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_KEY!;
const CAPTCHA = process.env.CAPTCHA === 'on';
const SECRET = process.env.SUPABASE_SECRET ?? '';
let failed = 0;
const check = (ok: boolean, what: string, detail: unknown = '') => {
  console.log(`${ok ? '✓' : '✗'} ${what}${ok ? '' : `  ${JSON.stringify(detail)}`}`);
  if (!ok) failed++;
};

async function call(path: string, body: unknown, token?: string) {
  const r = await fetch(`${URL}${path}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${token ?? KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json: any = null;
  try { json = await r.json(); } catch { /* empty */ }
  return { status: r.status, json };
}

/** A new guest: as a phone makes one, or past the captcha as the server's administrator. */
async function signup() {
  if (!CAPTCHA) return call('/auth/v1/signup', {});
  const r = await fetch(`${URL}/auth/v1/signup`, {
    method: 'POST', headers: { apikey: SECRET, 'Content-Type': 'application/json' }, body: '{}',
  });
  let json: any = null;
  try { json = await r.json(); } catch { /* empty */ }
  return { status: r.status, json };
}

if (CAPTCHA) {
  const bare = await call('/auth/v1/signup', {});
  check(bare.status >= 400 && !bare.json?.access_token, 'a guest with no captcha answer is turned away', bare.status);
}
const guest = await signup();
check(guest.status === 200 && !!guest.json?.access_token, 'a guest can sign in (anonymous sign-ins are on)', guest.status);
const token: string = guest.json?.access_token;

const now = Math.floor(Date.now() / 1000);
const LIVE = now >= SEASON_START;
const ACCEPT_EVERYTHING = acceptsEverything(now);
console.log(LIVE ? '季 Season 0 has begun: the season half runs.' : '季 Before the switch: the closed-test half runs.');
// 季 Never begun before the season once it has: within ten minutes of the switch, now - 600
// would be a closed-test save, and the server would turn it away.
const fresh = advance(newState(LIVE ? Math.max(now - 600, SEASON_START) : now - 600), now);
const first = await call('/functions/v1/sync', { save: fresh, name: `Test ${now % 100000}` }, token);
check(first.status === 200 && first.json?.ranked === true, 'a new save syncs and is ranked', first);

const board = await call('/rest/v1/rpc/board', { kind: 'climb', lim: 10 }, token);
check(board.status === 200 && Array.isArray(board.json) && board.json.some((r: any) => r.me), 'the board shows the player', board.status);
check(Array.isArray(board.json) && board.json.every((r: any) => 'calling' in r)
  && board.json.find((r: any) => r.me)?.calling === null,
  'every row carries the class its save wears, and a new save that wears nothing has none', board.json?.find?.((r: any) => r.me));

const named = await call('/rest/v1/rpc/set_name', { new_name: `Tester ${now % 100000}` }, token);
check(named.status === 200, 'a player can name themselves', named);

const direct = await call('/rest/v1/standings', { user_id: guest.json?.user?.id, climb: 80 }, token);
check(direct.status >= 400, 'a player cannot write a standing directly', direct.status);

const peek = await fetch(`${URL}/rest/v1/saves?select=*`, { headers: { apikey: KEY, Authorization: `Bearer ${token}` } });
check(peek.status >= 400 || (await peek.json()).length === 0, 'a player cannot read anybody’s saves', peek.status);

// Wait out the gap, then offer a save with a week of qi in it that took thirty seconds.
await new Promise((r) => setTimeout(r, 22_000));
const cheat = { ...fresh, at: now + 25, qi: 1e30 };
const refused = await call('/functions/v1/sync', { save: cheat }, token);
check(refused.status === 200 && refused.json?.ranked === ACCEPT_EVERYTHING,
  ACCEPT_EVERYTHING ? 'an edited save is accepted while testing' : 'an edited save is not ranked', refused);
check(refused.json && !('why' in refused.json), 'and the reply does not say which check it failed', refused.json);

const tooSoon = await call('/functions/v1/sync', { save: fresh }, token);
check(tooSoon.status === 429, 'syncing again at once is refused', tooSoon.status);

// 盾 What the audit found, tried against the live server.
const titled = await call('/rest/v1/rpc/set_name', { new_name: '天下第一' }, token);
check(titled.status >= 400, 'nobody may name themselves after a title', titled.status);
const cyrillic = await call('/rest/v1/rpc/set_name', { new_name: 'Вruno' }, token);
check(cyrillic.status >= 400, 'a look-alike letter from another alphabet is not a name', cyrillic.status);

await new Promise((r) => setTimeout(r, 22_000));
const racing = await Promise.all([0, 1, 2, 3, 4].map(() => call('/functions/v1/sync', { save: fresh }, token)));
check(racing.filter((r) => r.status === 200).length === 1, 'five syncs sent at once are one sync', racing.map((r) => r.status));

// A second guest, signed up this second, with a save that says it began weeks ago.
const other = await signup();
const otherToken: string = other.json?.access_token;
const month = advance(newState(now - 30 * 86_400), now);
// 季 In the season it wears the season's marker and a start date no earlier than the switch,
// or the door would turn it away before its month of play was ever weighed.
const weeks = LIVE ? { ...month, season: SEASON, startedAt: Math.max(month.startedAt, SEASON_START) } : month;
const forged = await call('/functions/v1/sync', { save: weeks, name: '天下第一' }, otherToken);
check(forged.status === 200 && forged.json?.ranked === ACCEPT_EVERYTHING
  && forged.json?.state === (ACCEPT_EVERYTHING ? 'verified' : 'waiting'),
  ACCEPT_EVERYTHING ? 'while testing, a guest signed up now is accepted with a month of play'
    : 'a guest signed up now cannot bring a month of play to their first sync', forged.json);
const otherMe = await call('/rest/v1/rpc/my_standing', {}, otherToken);
check(otherMe.status === 200 && otherMe.json?.name !== '天下第一' && /^修士 /.test(otherMe.json?.name ?? ''),
  'and a title sent as a name on the first sync becomes a plain 修士 name', otherMe.json?.name);

// 季 The season's door (docs/SEASON0-PLAN.md, 4.3): by the second guest before the switch, by a third after it.
const onBoard = async (t: string) => {
  const b = await call('/rest/v1/rpc/board', { kind: 'climb', lim: 1 }, t);
  return Array.isArray(b.json) && b.json.some((r: any) => r.me);
};
if (!LIVE) {
  // 6. A season save sent before the switch can only come from a clock running ahead.
  await new Promise((r) => setTimeout(r, 22_000));
  const early = await call('/functions/v1/sync', { save: { ...fresh, season: SEASON } }, otherToken);
  check(early.status === 409 && early.json?.error === 'season' && !('ranked' in (early.json ?? {})),
    'before the switch, a season save is turned away as from the wrong side of it', early);
} else {
  // A month-old closed-test cultivator, carried into the season three ways. A new guest of its
  // own, so the board and the cloud copy start empty and anything on them came from here.
  const third = await signup();
  const thirdToken: string = third.json?.access_token;
  const old = advance(newState(SEASON_START - 30 * 86_400), now);
  // 1. As it is: no season. Turned away, nothing written, nowhere on the board.
  const closed = await call('/functions/v1/sync', { save: old }, thirdToken);
  check(closed.status === 409 && closed.json?.error === 'season' && !('ranked' in (closed.json ?? {})),
    'after the switch, a closed-test save is turned away', closed);
  check(!(await onBoard(thirdToken)), 'and its player is not on the board');
  // 2. And the cloud has nothing to hand back.
  const pulled = await call('/functions/v1/sync', { action: 'pull' }, thirdToken);
  check(pulled.status === 200 && pulled.json?.save === null, 'and a pull returns no copy', pulled.json?.save === null);
  // 3. Relabelled with the season, its start date left where it was: turned away all the same.
  await new Promise((r) => setTimeout(r, 22_000));
  const relabelled = await call('/functions/v1/sync', { save: { ...old, season: SEASON } }, thirdToken);
  check(relabelled.status === 409 && relabelled.json?.error === 'season',
    'a closed-test save relabelled with the season, begun before it, is turned away', relabelled);
  // 4. And with its start date edited forward to the season's first second: measured from
  // there, a month of play in the season's first hours, it waits and is not ranked.
  await new Promise((r) => setTimeout(r, 22_000));
  const moved = await call('/functions/v1/sync', { save: { ...old, season: SEASON, startedAt: SEASON_START } }, thirdToken);
  check(moved.status === 200 && moved.json?.ranked === false && moved.json?.state !== 'verified',
    'an old run with its start date edited to the season’s first second is not ranked', moved.json);
  check(!(await onBoard(thirdToken)), 'and its player is still not on the board');
  await call('/rest/v1/rpc/delete_me', {}, thirdToken);
}
await call('/rest/v1/rpc/delete_me', {}, otherToken);

// 去 And the test player leaves, or every deploy would put another Tester on the public
// boards for real players to read. It is the same button a player presses to leave.
const gone = await call('/rest/v1/rpc/delete_me', {}, token);
check(gone.status < 300, 'a player can delete themselves', gone);
const after = await call('/rest/v1/rpc/board', { kind: 'climb', lim: 100 }, KEY);
check(after.status === 200 && Array.isArray(after.json) && !after.json.some((r: any) => r.name === `Tester ${now % 100000}`),
  'and is gone from the board', after.status);
check(Array.isArray(after.json) && !after.json.some((r: any) => /^Tester? \d{1,5}$/.test(r.name)),
  'no test player is left on the public board', after.json?.filter?.((r: any) => /^Tester? \d{1,5}$/.test(r.name)));

console.log(failed ? `\n${failed} failed` : '\n榜 the ranked server holds.');
process.exit(failed ? 1 : 0);
