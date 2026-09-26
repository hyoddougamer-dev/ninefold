/**
 * 榜 The ranked server, attacked live.
 *
 * Run by the deploy workflow once the schema and the sync function are up, against the
 * real project, with only the public key a phone has. It plays a new player and then
 * plays a cheater, and fails the run if the server believes anything it should not.
 *
 *   SUPABASE_URL=… SUPABASE_KEY=… npx tsx tools/ranked.ts
 */
import { newState } from '../src/sim/state.ts';
import { advance } from '../src/sim/time.ts';

const URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_KEY!;
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

const guest = await call('/auth/v1/signup', {});
check(guest.status === 200 && !!guest.json?.access_token, 'a guest can sign in (anonymous sign-ins are on)', guest);
const token: string = guest.json?.access_token;

const now = Math.floor(Date.now() / 1000);
const fresh = advance(newState(now - 600), now);
const first = await call('/functions/v1/sync', { save: fresh, name: `Test ${now % 100000}` }, token);
check(first.status === 200 && first.json?.ranked === true, 'a new save syncs and is ranked', first);

const board = await call('/rest/v1/rpc/board', { kind: 'climb', lim: 10 }, token);
check(board.status === 200 && Array.isArray(board.json) && board.json.some((r: any) => r.me), 'the board shows the player', board.status);

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
check(refused.status === 200 && refused.json?.ranked === false, 'an edited save is not ranked', refused);

const tooSoon = await call('/functions/v1/sync', { save: fresh }, token);
check(tooSoon.status === 429, 'syncing again at once is refused', tooSoon.status);

// 去 And the test player leaves, or every deploy would put another Tester on the public
// boards for real players to read. It is the same button a player presses to leave.
const gone = await call('/rest/v1/rpc/delete_me', {}, token);
check(gone.status < 300, 'a player can delete themselves', gone);
const after = await call('/rest/v1/rpc/board', { kind: 'climb', lim: 100 }, KEY);
check(after.status === 200 && Array.isArray(after.json) && !after.json.some((r: any) => r.name === `Tester ${now % 100000}`),
  'and is gone from the board', after.status);

console.log(failed ? `\n${failed} failed` : '\n榜 the ranked server holds.');
process.exit(failed ? 1 : 0);
