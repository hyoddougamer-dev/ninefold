/**
 * 題名崖 A fabricated Cliff of Names, the way cliff() answers it (docs/SEASON0-THEME.md, 2c).
 *
 * Shared by the harnesses that open the Cliff (ranks, han, tips) and by the screenshots, so
 * every one of them looks at the same mountain. The names are invented; none is a real
 * player's. The shape follows the proposal page's day 9: the Spirit Fox's column full, the
 * Stone Ape's well past half, five names through the Immortal Crane and two through the
 * Thunder Tiger, and the five gates above that still in ink.
 */

/** 始 Monday 26 October 2026, 00:00 UTC, in seconds (src/sim/season.ts). */
export const SEASON_START = 1792972800;

const FIRST = ['Lan', 'Mo', 'Bai', 'Yun', 'Qing', 'Shen', 'Hua', 'Jin', 'Xue', 'Feng', 'Ming', 'Lu'];
const SECOND = ['Feng', 'Qing', 'Ze', 'Shan', 'Yi', 'Ran', 'Ling', 'He', 'Xu', 'An'];
const ALONE = ['Kestrel', 'Ash', 'Yuki', 'Duan', 'Sora', 'Mireille', 'Tavi', 'Ren', 'Nox', 'Ilse', 'Corvo',
  'Hana', 'Oriel', 'Vesper', 'Tamsin', 'Aldo', 'Juniper', 'Sable', 'Kaito', 'Wren', 'Isolde', 'Brannoc',
  'Mistwalker', 'Old Pine', 'Quill', 'Saffi', 'Teodor', 'Rhiannon', 'Bastian', 'Linnea'];

/** Ninety names, every one different, in the same order every run. */
export const NAMES = (() => {
  const out = [...ALONE];
  for (let i = 0; out.length < 90; i++) out.push(`${FIRST[i % FIRST.length]} ${SECOND[(i * 7) % SECOND.length]}`);
  return [...new Set(out)];
})();

/** Who walked the closed test, by name: every fourth name, and the player's own. */
const forerunner = (name, me) => name === me || NAMES.indexOf(name) % 4 === 1;

/**
 * The Cliff as cliff() returns it on day 9 by default: one row per carving, ordered
 * by gate and then rank. `me` is carved where the proposal page lit it: 5th through the
 * Stone Ape's gate, and 23rd through the Spirit Fox's.
 *
 *   counts  how many are through each gate (index 0 is the Spirit Fox)
 */
export function cliffRows({ me = 'Kestrel', counts = [81, 60, 5, 2, 0, 0, 0, 0, 0] } = {}) {
  const rows = [];
  // Hours after the switch at which each gate saw its first name, and the spread after it.
  const opens = [0.68, 52, 130, 150, 0, 0, 0, 0, 0];
  const spread = [0.9, 2.4, 9, 20, 1, 1, 1, 1, 1];
  const others = NAMES.filter((n) => n !== me);
  counts.forEach((n, i) => {
    const gate = i + 1;
    const place = gate === 2 ? 5 : gate === 1 ? 23 : 0;
    let k = 0;
    for (let rank = 1; rank <= Math.min(81, n); rank++) {
      const name = rank === place ? me : others[(i * 11 + k++) % others.length];
      const at = new Date((SEASON_START + (opens[i] + (rank - 1) * spread[i]) * 3600) * 1000).toISOString();
      rows.push({ gate, rank, name, at, forerunner: forerunner(name, me) });
    }
  });
  return rows;
}

/** Day 0: the season has begun and nobody is through a gate yet. */
export const EMPTY = [];

/** 先行 Forerunners who never reached a gate: on the foot of the Cliff, on no column. */
export const UNCARVED = ['Quiet Lake', 'Rain Bell'];

/**
 * 先行 What forerunners() answers: every Forerunner's name, carved or not, once each, in the
 * order of the names themselves (lower(name), then name), as the server sorts them.
 */
export function forerunnerRows(cliff = cliffRows(), extra = UNCARVED) {
  const names = new Set([...cliff.filter((r) => r.forerunner).map((r) => r.name), ...extra]);
  return [...names].sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : a < b ? -1 : a > b ? 1 : 0))
    .map((name) => ({ name }));
}

/**
 * 榜 A stand-in for the ranked server, enough for Rankings and the Cliff to fill: a signed-in
 * guest, the boards with 先行 on some rows (one beside a title), my_standing() saying this
 * account walked the closed test, cliff() answering with `cliff`, and forerunners() with
 * `forerunners` (null leaves it unanswered, as a server without it would). The container cannot
 * reach Supabase, so every request the game makes to it is answered here.
 */
export const API = 'https://yqppvmuwlhibswbbvjzz.supabase.co';
export const USER = { id: '0b5e2f4a-1111-4222-8333-944455556666', aud: 'authenticated', role: 'authenticated', email: null, is_anonymous: true };
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS' };

/**
 * 位 The sect rank as rung_of() reads a score (src/sim/balance.ts RUNG_AT less its leading 0),
 * for the stand-ins: the season's rows carry it, and so does my_standing().
 */
export const rungOf = (score) => [9, 27, 45, 63, 81, 85, 90, 100].filter((t) => score >= t).length;
/** 位階 What rungs() answers on day 9: how many hold each rank, counts only. */
export const RUNG_COUNTS = [212, 148, 61, 9, 0, 0, 0, 0, 0];

export function standIn(page, { me = 'Kestrel', cliff = cliffRows({ me }), forerunners = forerunnerRows(cliff) } = {}) {
  return page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const reply = (status, body) => route.fulfill({ status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const body = req.postDataJSON?.() ?? null;
    switch (url.pathname) {
      case '/auth/v1/user': return reply(200, USER);
      case '/auth/v1/token': return reply(200, session(Math.floor(Date.now() / 1000)));
      case '/functions/v1/sync': return reply(200, { ranked: true, state: 'verified', why: [], suspect: false, standing: null, behindHours: 0 });
      case '/rest/v1/rpc/board': {
        const rows = [
          { rank: 1, name: 'Mistwalker', climb: 30, marks: 0, tower: 30, gain: 30, title: '天下第一', me: false, calling: 'swordimmortal', forerunner: true },
          { rank: 2, name: 'Lan Feng', climb: 27, marks: 0, tower: 22, gain: 27, title: '期首', me: false, calling: 'qi:2', forerunner: false },
          { rank: 3, name: 'Old Pine', climb: 25, marks: 0, tower: 18, gain: 25, title: null, me: false, calling: 'sorcerer:9', forerunner: true },
          { rank: 4, name: 'Yuki', climb: 24, marks: 0, tower: 15, gain: 24, title: null, me: false, calling: 'sword:2', forerunner: false },
          { rank: 5, name: me, climb: 22, marks: 0, tower: 12, gain: 22, title: '期十', me: true, calling: 'qi:2', forerunner: true },
          { rank: 6, name: 'Corvo', climb: 21, marks: 0, tower: 0, gain: 21, title: null, me: false, calling: null, forerunner: false },
        ];
        const ranked = rows.map((r) => ({ ...r, rung: rungOf(r.climb + r.marks) }));
        return reply(200, body?.kind === 'tower' ? ranked.filter((r) => r.tower > 0) : ranked);
      }
      case '/rest/v1/rpc/samsara_board': return reply(200, []);
      case '/rest/v1/rpc/my_standing':
        return reply(200, { name: me, suspect: false, banned: false, climb: 22, marks: 0, tower: 12,
          verified_at: new Date().toISOString(), latest_at: new Date().toISOString(), title: '期十', forerunner: true,
          rung: rungOf(22), carved: cliff.filter((r) => r.name === me).map((r) => ({ gate: r.gate, rank: r.rank })) });
      case '/rest/v1/rpc/rungs': return reply(200, RUNG_COUNTS.map((players, rung) => ({ rung, players })));
      case '/rest/v1/rpc/cliff': return reply(200, cliff);
      case '/rest/v1/rpc/forerunners': return forerunners ? reply(200, forerunners) : reply(404, { message: 'no forerunners()' });
      default: return reply(404, { error: url.pathname });
    }
  });
}

/** The session supabase-js keeps under ninefold.auth, good for an hour from `at` (seconds). */
export function session(at) {
  return { access_token: 'test-token', token_type: 'bearer', expires_in: 3600, expires_at: at + 3600, refresh_token: 'test-refresh', user: USER };
}

/**
 * 季 Open the built game `day` days into the season, signed in, with `save` on the device.
 * The app's scripts are blocked while localStorage is written (it rewrites its save on
 * unload), and the game's own clock is installed past SEASON_START, since nothing of the
 * season shows before it. The save is stamped season 's0' and begun inside the season.
 */
export async function inSeason(page, base, save, { day = 9, signed = true } = {}) {
  const at = SEASON_START + day * 86400 + 11 * 3600;
  await page.clock.install({ time: new Date(at * 1000) });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(base);
  await page.evaluate(([s, sess, on]) => {
    localStorage.clear();
    localStorage.setItem('ninefold.save.v1', JSON.stringify(s));
    if (on) { localStorage.setItem('ninefold.ranked', '1'); localStorage.setItem('ninefold.auth', JSON.stringify(sess)); }
  }, [{ ...save, at: at - 30, startedAt: SEASON_START + 600, season: 's0' }, session(at), signed]);
  await page.unroute('**/assets/*.js');
  await page.goto(base);
  return at;
}
