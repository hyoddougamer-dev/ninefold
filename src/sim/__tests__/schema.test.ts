import { describe, expect, it, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * 榜 The ranked schema, run in a real Postgres (PGlite) with the three things Supabase
 * provides stood in for: the auth.users table, auth.uid(), and the anon and
 * authenticated roles. What it proves is the rule the schema is built on: **a player can
 * read the boards and choose a name, and can write nothing that is ranked.**
 */
const MIGRATIONS = 'supabase/migrations';
let db: PGlite;

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
const C = '33333333-3333-3333-3333-333333333333';

/** Run as a signed-in player: the role Supabase gives a user's JWT, and their id. */
async function as(id: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('test.uid', '${id ?? ''}', false);`);
  await db.exec(id ? 'set role authenticated' : 'set role anon');
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role');
  }
}

// 慢 Starting PGlite and running every migration took past vitest's ten-second default
// when the machine was busy (a build or a browser running beside it), and the whole file
// then skipped. A minute is room enough; a real hang still fails.
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text, created_at timestamptz not null default now());
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  for (const f of readdirSync(MIGRATIONS).sort()) {
    // pgcrypto is not in PGlite and nothing here uses it.
    await db.exec(readFileSync(`${MIGRATIONS}/${f}`, 'utf8').replace(/create extension[^;]*;/g, ''));
  }
  await db.exec(`
    insert into auth.users values ('${A}'), ('${B}'), ('${C}');
    insert into profiles (id, name) values ('${A}', 'Alpha'), ('${B}', 'Beta'), ('${C}', 'Gamma');
    insert into standings (user_id, climb, marks, tower, week, week_from) values
      ('${A}', 40, 0, 12, week_of(), 30),
      ('${B}', 55, 0, 3, week_of(), 54),
      ('${C}', 80, 4, 90, week_of(), 70);
    update profiles set suspect = true where id = '${C}';
  `);
}, 60_000);   // 慢 a database from nothing and every migration: over ten seconds on a busy machine

describe('榜 the ranked schema', () => {
  it('the boards read, suspects left off, ties to whoever was first', async () => {
    const climb = await as(A, `select rank, name, climb, me from board('climb')`);
    expect(climb.rows.map((r: any) => r.name)).toEqual(['Beta', 'Alpha']);
    expect((climb.rows as any[]).find((r) => r.name === 'Alpha').me).toBe(true);
    const week = await as(null, `select name, gain from board('week')`);
    expect(week.rows.map((r: any) => [r.name, r.gain])).toEqual([['Alpha', 10], ['Beta', 1]]);
    const tower = await as(null, `select name from board('tower')`);
    expect(tower.rows.map((r: any) => r.name)).toEqual(['Alpha', 'Beta']);
  });

  it('the first on the Heaven List wears 天下第一', async () => {
    const r = await as(null, `select name, title from board('climb') where rank = 1`);
    expect((r.rows[0] as any).title).toBe('天下第一');
  });

  it('a player can name themselves, within the rules, and nobody else', async () => {
    expect(((await as(A, `select set_name('  Alpha   Two ') as n`)).rows[0] as any).n).toBe('Alpha Two');
    await expect(as(A, `select set_name('x')`)).rejects.toThrow(/name length/);
    await expect(as(A, `select set_name('beta')`)).rejects.toThrow(/name taken/);
    await expect(as(A, `select set_name('<script>')`)).rejects.toThrow(/name characters/);
    expect(((await as(A, `select set_name('雲中君') as n`)).rows[0] as any).n).toBe('雲中君');
    await expect(as(null, `select set_name('Nobody')`)).rejects.toThrow(/not signed in/);
  });

  it('keeps the titles, the 修士 names and the look-alikes out of the names', async () => {
    await expect(as(A, `select set_name('天下第一')`)).rejects.toThrow(/name reserved/);
    await expect(as(A, `select set_name('期首 Alpha')`)).rejects.toThrow(/name reserved/);
    await expect(as(A, `select set_name('修士 Alpha')`)).rejects.toThrow(/name reserved/);
    await expect(as(A, `select set_name('Вeta')`)).rejects.toThrow(/name characters/);
    // Full-width letters fold into the name they look like, which is Beta's.
    await expect(as(A, `select set_name('ｂｅｔａ')`)).rejects.toThrow(/name taken/);
    expect(((await as(A, `select set_name(E'Al\u200Bpha') as n`)).rows[0] as any).n).toBe('Al pha');
    // The tests below were written to the name A carried before these rules; a default name
    // is still the server's to give, just not a player's to choose.
    await db.exec(`update profiles set name = '修士 Alpha' where id = '${A}'`);
  });

  it('takes a sync turn in one statement, and only the server may', async () => {
    await expect(as(A, `select claim_sync('${A}', 20)`)).rejects.toThrow(/permission denied/);
    await db.exec('set role service_role');
    try {
      const first = await db.query(`select claim_sync('${A}', 20) as w`);
      const second = await db.query(`select claim_sync('${A}', 20) as w`);
      expect((first.rows[0] as any).w).toBe(0);
      expect((second.rows[0] as any).w).toBeGreaterThan(0);
      const m = await db.query(`select mark_player('${B}', true, false, 3) as p`);
      expect((m.rows[0] as any).p.strikes).toBe(1);
      await db.query(`select mark_player('${B}', true, false, 3)`);
      const banned = await db.query(`select mark_player('${B}', true, true, 3) as p`);
      expect((banned.rows[0] as any).p).toMatchObject({ strikes: 3, suspect: true, banned: true });
    } finally {
      await db.exec('reset role');
      await db.exec(`update profiles set strikes = 0, suspect = false, banned = false where id = '${B}'`);
    }
    await expect(as(B, `select mark_player('${B}', false, false, 3)`)).rejects.toThrow(/permission denied/);
  });

  it('no player can read or write a table directly', async () => {
    for (const t of ['profiles', 'saves', 'standings', 'sync_log', 'titles', 'meta']) {
      await expect(as(A, `select * from ${t}`)).rejects.toThrow(/permission denied/);
      await expect(as(null, `select * from ${t}`)).rejects.toThrow(/permission denied/);
    }
    await expect(as(A, `update standings set climb = 80 where user_id = '${A}'`)).rejects.toThrow(/permission denied/);
    await expect(as(A, `insert into saves (user_id, latest) values ('${A}', '{}')`)).rejects.toThrow(/permission denied/);
    await expect(as(A, `update profiles set suspect = false where id = '${C}'`)).rejects.toThrow(/permission denied/);
  });

  it('closing a week is the server’s alone, and the winners wear it the week after', async () => {
    await expect(as(A, `select close_week(week_of())`)).rejects.toThrow(/permission denied/);
    await db.exec(`select close_week(week_of())`);
    await db.exec(`select close_week(week_of())`); // twice is once
    const t = await db.query(`select name, rank from titles order by rank`);
    // Gamma climbed the most and is a suspect, so is not among them.
    expect(t.rows.map((r: any) => r.name)).toEqual(['修士 Alpha', 'Beta']);
    const m = await db.query(`select value from meta where key = 'closed_week'`);
    expect((m.rows[0] as any).value).toBeGreaterThan(0);
  });

  it('a player can delete themselves, and only themselves', async () => {
    await expect(as(null, `select delete_me()`)).rejects.toThrow(/permission denied|not signed in/);
    await db.exec(`insert into sync_log (user_id, ok) values ('${B}', true)`);
    await as(B, `select delete_me()`);
    const left = await db.query(`select
      (select count(*) from auth.users where id = '${B}') as u,
      (select count(*) from profiles where id = '${B}') as p,
      (select count(*) from standings where user_id = '${B}') as s,
      (select count(*) from sync_log where user_id = '${B}') as l,
      (select count(*) from auth.users) as everyone`);
    const r = left.rows[0] as any;
    expect([Number(r.u), Number(r.p), Number(r.s), Number(r.l)]).toEqual([0, 0, 0, 0]);
    expect(Number(r.everyone)).toBe(2);
  });

  /**
   * 罰 A ban outlives the account. Deleting keeps a hash of the email and the strikes,
   * only for an account that had any, and a new account on the same email starts with
   * them. An honest player's deletion leaves nothing behind.
   */
  it('a struck player who deletes the account and comes back keeps the strikes', async () => {
    const D = '44444444-4444-4444-4444-444444444444';
    const E = '55555555-5555-5555-5555-555555555555';
    const H = '66666666-6666-6666-6666-666666666666';
    await db.exec(`insert into auth.users values ('${D}', 'Cheat@Example.com'), ('${H}', 'honest@example.com');
      insert into profiles (id, name, strikes, banned) values ('${D}', 'Delta', 2, false), ('${H}', 'Honest', 0, false);`);
    await as(D, `select delete_me()`);
    await as(H, `select delete_me()`);
    const kept = await db.query(`select email_hash, strikes, banned from barred`);
    expect(kept.rows.length).toBe(1);
    expect((kept.rows[0] as any).strikes).toBe(2);
    // The email itself is not kept, only its hash.
    expect(JSON.stringify(kept.rows)).not.toMatch(/cheat|example/i);
    // Back with the same email, differently written: the strikes are found.
    await db.exec(`insert into auth.users values ('${E}', ' cheat@example.COM ')`);
    await db.exec('set role service_role');
    const got = await db.query(`select barred_for('${E}') as b`);
    await db.exec('reset role');
    expect((got.rows[0] as any).b).toEqual({ strikes: 2, banned: false, suspect: false });
    // Nobody but the server can read it.
    await expect(as(E, `select * from barred`)).rejects.toThrow(/permission denied/);
    await expect(as(E, `select barred_for('${E}')`)).rejects.toThrow(/permission denied/);
  });

  it('a flagged player who deletes the account and names the new one keeps the flag and the strikes', async () => {
    const F = 'aaaaaaaa-7777-7777-7777-777777777777';
    const G = 'bbbbbbbb-8888-8888-8888-888888888888';
    await db.exec(`insert into auth.users values ('${F}', 'fast@example.com');
      insert into profiles (id, name, strikes, suspect, banned) values ('${F}', 'Foxtrot', 1, true, false);`);
    await as(F, `select delete_me()`);
    // Back on the same email: set_name makes the profile before any sync, and it carries them.
    await db.exec(`insert into auth.users values ('${G}', 'FAST@example.com')`);
    await as(G, `select set_name('Golf')`);
    const p = (await db.query(`select strikes, suspect, banned from profiles where id = '${G}'`)).rows[0] as any;
    expect(p).toEqual({ strikes: 1, suspect: true, banned: false });
  });

  it('the panel reads counts, never a row, and only the server takes a pulse', async () => {
    const st = ((await as(null, `select stats() as s`)).rows[0] as any).s;
    expect(st.players).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(st.realms) && Array.isArray(st.pulse)).toBe(true);
    const text = JSON.stringify(st);
    expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);        // no player id anywhere
    expect(text).not.toMatch(/@|Alpha|Beta|Gamma/);             // no email, no name
    await expect(as(null, `select take_pulse(5, 2)`)).rejects.toThrow(/permission denied/);
    await expect(as(A, `select * from pulse`)).rejects.toThrow(/permission denied/);
    await db.exec('set role service_role');
    try { await db.exec(`select take_pulse(12, 4)`); } finally { await db.exec('reset role'); }
    const after = ((await as(null, `select stats() as s`)).rows[0] as any).s;
    expect(after.pulse.at(-1)).toMatchObject({ discord: 12, online: 4 });
  });

  it('the private panel answers only its key, and never with an email', async () => {
    await expect(as(null, `select panel_players('guess')`)).rejects.toThrow(/wrong key/);
    await expect(as(A, `select panel_players(null)`)).rejects.toThrow(/wrong key/);
    // The real key is not in this repository; the same function under a test key is.
    const { createHash } = await import('node:crypto');
    const sql = readFileSync(`${MIGRATIONS}/20260929020000_panel_notes.sql`, 'utf8')
      .replace(/'[0-9a-f]{64}'/, `'${createHash('sha256').update('test-key').digest('hex')}'`);
    await db.exec(sql);
    // and the later migrations that redefine its functions, as they stand on the server
    await db.exec(readFileSync(`${MIGRATIONS}/20261002000000_clear_rekaris.sql`, 'utf8'));
    await db.exec(readFileSync(`${MIGRATIONS}/20261003000000_panel_refusals.sql`, 'utf8'));
    await db.exec(readFileSync(`${MIGRATIONS}/20261005140000_review.sql`, 'utf8'));
    // 拒 Gamma's day: two syncs refused for too-fast (one with it twice, from both windows),
    // one for the tower, one that went through, and a refusal two days old that is not today's.
    await db.exec(`insert into sync_log (user_id, at, ok, why) values
      ('${C}', now() - interval '1 hour', false, '{too-fast,too-fast}'),
      ('${C}', now() - interval '2 hours', false, '{too-fast}'),
      ('${C}', now() - interval '3 hours', false, '{tower}'),
      ('${C}', now() - interval '4 hours', true, '{}'),
      ('${C}', now() - interval '2 days', false, '{tower}'),
      ('${C}', now() - interval '3 days', false, '{tower}')`);
    const rows = ((await as(null, `select panel_players('test-key') as p`)).rows[0] as any).p;
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(Object.keys(rows[0]).sort()).toEqual(
      ['cleared', 'climb', 'days', 'email', 'held', 'joined', 'last_seen', 'layer', 'marks', 'name', 'note', 'realm',
        'refused_day', 'refused_why', 'started', 'syncs7', 'syncs_day', 'tower']);
    expect(JSON.stringify(rows)).not.toMatch(/@|[0-9a-f]{8}-[0-9a-f]{4}-/);
    expect(rows.every((r: any) => typeof r.email === 'boolean')).toBe(true);
    expect(rows.find((r: any) => r.name === 'Gamma')).toMatchObject({ syncs_day: 4, refused_day: 3, refused_why: 'too-fast' });
    // A player with nothing refused today has a count of nothing and no reason.
    expect(rows.find((r: any) => r.name === '修士 Alpha')).toMatchObject({ refused_day: 0, refused_why: null });
    // 疑 The Batota tab: who the verifier refused or flagged, and what each one tried.
    await expect(as(null, `select panel_cheats('guess')`)).rejects.toThrow(/wrong key/);
    await db.exec(`insert into sync_log (user_id, at, ok, why, strike, suspect, pace) values
      ('${C}', now() - interval '5 hours', false, '{tower}', true, false, 0.3),
      ('${C}', now() - interval '6 hours', false, '{gear,tower}', true, false, 0.3),
      ('${C}', now() - interval '7 hours', true, '{}', false, true, 0.71),
      ('${C}', now() - interval '8 hours', false, '{went-down,road}', false, false, 0.1)`);
    const cheats = ((await as(null, `select panel_cheats('test-key') as c`)).rows[0] as any).c;
    const g = cheats.find((r: any) => r.name === 'Gamma');
    expect(g).toMatchObject({ struck: 2, fast: 1 });
    expect(g.pace).toBeCloseTo(0.71, 2);
    expect(g.tried.map((t: any) => [t.why, t.n])).toEqual([['tower', 2], ['gear', 1]]);
    expect(g.recent).toHaveLength(3);
    expect(JSON.stringify(cheats)).not.toMatch(/@|[0-9a-f]{8}-[0-9a-f]{4}-/);
    await db.exec(`delete from sync_log where user_id = '${C}'`);

    // 清 A flag taken off, and a note, only with the key.
    const flagged = rows.find((r: any) => r.held) ?? rows[0];
    const was = (await db.query(`select strikes, suspect, banned from profiles where lower(name) = lower('${flagged.name}')`)).rows[0] as any;
    await db.exec(`update profiles set strikes = 2, suspect = true where lower(name) = lower('${flagged.name}')`);
    await expect(as(null, `select panel_clear('guess', '${flagged.name}', 'x')`)).rejects.toThrow(/wrong key/);
    await expect(as(null, `select panel_note('guess', '${flagged.name}', 'x')`)).rejects.toThrow(/wrong key/);
    await expect(as(null, `select panel_clear('test-key', 'Nobody At All', 'x')`)).rejects.toThrow(/no such player/);
    await as(null, `select panel_clear('test-key', '${flagged.name.toUpperCase()}', 'A test, said so on Discord.')`);
    const after = ((await as(null, `select panel_players('test-key') as p`)).rows[0] as any).p.find((r: any) => r.name === flagged.name);
    expect(after).toMatchObject({ held: false, note: 'A test, said so on Discord.' });
    expect(after.cleared).toBeTruthy();
    await as(null, `select panel_note('test-key', '${flagged.name}', 'Rewarded at launch.')`);
    const noted = ((await as(null, `select panel_players('test-key') as p`)).rows[0] as any).p.find((r: any) => r.name === flagged.name);
    expect(noted.note).toBe('Rewarded at launch.');
    expect(noted.cleared).toBe(after.cleared);
    await expect(as(A, `select * from panel_notes`)).rejects.toThrow(/permission denied/);
    await expect(as(null, `select panel_ok('test-key')`)).rejects.toThrow(/permission denied/);
    // and back as it was, for the tests after this one
    await db.exec(`update profiles set strikes = ${was.strikes}, suspect = ${was.suspect}, banned = ${was.banned} where lower(name) = lower('${flagged.name}')`);
  });

  /**
   * 清 A cleared flag has to stay cleared. The sync also measures the climb against where
   * it stood a day and a week before, so a flag taken off while those windows still held
   * the fast stretch came straight back on the next sync.
   */
  it('a cleared flag restarts the day and week windows, and rekaris is cleared alone', async () => {
    const R = '77777777-7777-7777-7777-777777777777';
    const D = '88888888-8888-8888-8888-888888888888';
    await db.exec(`
      insert into auth.users values ('${R}'), ('${D}');
      insert into profiles (id, name, strikes, suspect) values ('${R}', 'Rekaris', 1, true), ('${D}', 'Delta', 1, true);
      insert into saves (user_id, latest, verified, verified_at, day_state, day_at, week_state, week_at) values
        ('${R}', '{"at": 3}', '{"at": 2}', '2026-10-02T10:00:00Z', '{"at": 1}', '2026-10-01T10:00:00Z', '{"at": 0}', '2026-09-25T10:00:00Z'),
        ('${D}', '{"at": 3}', '{"at": 2}', '2026-10-02T10:00:00Z', '{"at": 1}', '2026-10-01T10:00:00Z', '{"at": 0}', '2026-09-25T10:00:00Z');
    `);
    await db.exec(readFileSync(`${MIGRATIONS}/20261002000000_clear_rekaris.sql`, 'utf8'));
    const read = async (id: string) => (await db.query(`
      select p.strikes, p.suspect, s.day_state, s.day_at, s.week_state, s.week_at, s.verified_at, n.cleared_at
        from profiles p join saves s on s.user_id = p.id left join panel_notes n on n.user_id = p.id
       where p.id = '${id}'`)).rows[0] as any;
    const r = await read(R);
    expect(r).toMatchObject({ strikes: 0, suspect: false, day_state: { at: 2 }, week_state: { at: 2 } });
    expect(r.day_at).toEqual(r.verified_at);
    expect(r.week_at).toEqual(r.verified_at);
    expect(r.cleared_at).toBeTruthy();
    // 他 Nobody else Bruno did not name is touched.
    expect(await read(D)).toMatchObject({ strikes: 1, suspect: true, day_state: { at: 1 }, week_state: { at: 0 }, cleared_at: null });
    // and the panel's own button now does the same
    await as(null, `select panel_clear('test-key', 'delta', 'checked')`);
    expect(await read(D)).toMatchObject({ strikes: 0, suspect: false, day_state: { at: 2 }, week_state: { at: 2 } });
    await expect(as(A, `select clear_flag('${D}', 'x')`)).rejects.toThrow(/permission denied/);
    await db.exec(`delete from profiles where id in ('${R}', '${D}'); delete from auth.users where id in ('${R}', '${D}');`);
  });

  /**
   * 還 rekaris taken back to the save that verified (Bruno, 2026-10-06). The cloud copy is
   * pinned there: a refused sync from the old device cannot write over it, and the first
   * save that verifies releases it and takes the strikes and the review off.
   */
  it('a pinned cloud copy outlasts refused syncs, and the first verified one frees it', async () => {
    const R = '99999999-7777-7777-7777-777777777777';
    const D = '99999999-8888-8888-8888-888888888888';
    await db.exec(`
      insert into auth.users values ('${R}'), ('${D}');
      insert into profiles (id, name, strikes, suspect) values ('${R}', 'rekaris ', 30, true), ('${D}', 'Delta', 2, true);
      insert into saves (user_id, latest, latest_at, verified, verified_at, day_state, day_at, week_state, week_at) values
        ('${R}', '{"tower": 352}', '2026-10-06T06:47:00Z', '{"tower": 125}', '2026-10-05T19:26:00Z', '{"tower": 100}', '2026-10-05T10:00:00Z', '{"tower": 80}', '2026-09-30T10:00:00Z'),
        ('${D}', '{"tower": 352}', '2026-10-06T06:47:00Z', '{"tower": 125}', '2026-10-05T19:26:00Z', '{"tower": 100}', '2026-10-05T10:00:00Z', '{"tower": 80}', '2026-09-30T10:00:00Z');
    `);
    await db.exec(readFileSync(`${MIGRATIONS}/20261006070000_restore_rekaris.sql`, 'utf8'));
    const read = async (id: string) => (await db.query(`
      select p.strikes, p.suspect, s.latest, s.latest_at, s.verified, s.verified_at, s.pinned, s.day_state, s.week_state, n.note
        from profiles p join saves s on s.user_id = p.id left join panel_notes n on n.user_id = p.id
       where p.id = '${id}'`)).rows[0] as any;
    const r = await read(R);
    expect(r).toMatchObject({ strikes: 0, suspect: false, latest: { tower: 125 }, pinned: true,
      day_state: { tower: 125 }, week_state: { tower: 125 } });
    expect(r.latest_at).toEqual(r.verified_at);
    expect(r.note).toMatch(/floor 125/);
    // 他 Nobody else is touched.
    expect(await read(D)).toMatchObject({ strikes: 2, suspect: true, latest: { tower: 352 }, pinned: false, note: null });

    // 拒 The old device syncs: refused, so verified stays, and the copy stays pinned.
    await db.exec(`update saves set latest = '{"tower": 353}', latest_at = now(), last_sync = now() where user_id = '${R}'`);
    await db.exec(`update profiles set strikes = strikes + 1 where id = '${R}'`);
    expect(await read(R)).toMatchObject({ latest: { tower: 125 }, pinned: true, strikes: 1 });
    // and the upsert the sync function writes takes the same road
    await db.exec(`insert into saves (user_id, latest, latest_at, verified, verified_at) values
      ('${R}', '{"tower": 354}', now(), '{"tower": 125}', '2026-10-05T19:26:00Z')
      on conflict (user_id) do update set latest = excluded.latest, latest_at = excluded.latest_at,
        verified = excluded.verified, verified_at = excluded.verified_at`);
    expect(await read(R)).toMatchObject({ latest: { tower: 125 }, pinned: true });

    // 還 The restored save verifies: it is the copy now, the pin is gone, and so is the flag.
    await db.exec(`update profiles set suspect = true where id = '${R}'`);
    await db.exec(`update saves set latest = '{"tower": 126}', latest_at = now(), verified = '{"tower": 126}', verified_at = now()
      where user_id = '${R}'`);
    expect(await read(R)).toMatchObject({ latest: { tower: 126 }, verified: { tower: 126 }, pinned: false, strikes: 0, suspect: false });
    // Unpinned, the copy moves as it always did.
    await db.exec(`update saves set latest = '{"tower": 127}' where user_id = '${R}'`);
    expect(await read(R)).toMatchObject({ latest: { tower: 127 }, pinned: false });
    await expect(as(A, `select saves_pin()`)).rejects.toThrow();
    await db.exec(`delete from profiles where id in ('${R}', '${D}'); delete from auth.users where id in ('${R}', '${D}');`);
  });

  /**
   * 認 Then Bruno chose to keep rekaris's climb as it is (2026-10-06): the next save the game
   * offers becomes the verified one, and the sync after it, measured from there, frees them.
   */
  it('a rebase takes the next offered save as verified, and the one after it clears the mark', async () => {
    const R = '99999999-9999-7777-7777-777777777777';
    const D = '99999999-9999-8888-8888-888888888888';
    await db.exec(`
      insert into auth.users values ('${R}'), ('${D}');
      insert into profiles (id, name, strikes, suspect) values ('${R}', 'Rekaris', 2, true), ('${D}', 'Delta', 2, true);
      insert into saves (user_id, latest, latest_at, verified, verified_at, pinned) values
        ('${R}', '{"tower": 125}', '2026-10-05T19:26:00Z', '{"tower": 125}', '2026-10-05T19:26:00Z', true),
        ('${D}', '{"tower": 125}', '2026-10-05T19:26:00Z', '{"tower": 125}', '2026-10-05T19:26:00Z', true);
    `);
    await db.exec(readFileSync(`${MIGRATIONS}/20261006080000_rekaris_as_is.sql`, 'utf8'));
    const read = async (id: string) => (await db.query(`
      select p.strikes, p.suspect, s.latest, s.verified, s.verified_at, s.latest_at, s.day_state, s.week_state, s.pinned, s.rebase, n.note
        from profiles p join saves s on s.user_id = p.id left join panel_notes n on n.user_id = p.id
       where p.id = '${id}'`)).rows[0] as any;
    expect(await read(R)).toMatchObject({ strikes: 0, suspect: false, pinned: false, rebase: true });
    expect((await read(R)).note).toMatch(/floor 352/);
    expect(await read(D)).toMatchObject({ strikes: 2, suspect: true, pinned: true, rebase: false, note: null });

    // 認 The game's next sync, refused, written the way the sync function writes.
    const upsert = (tower: number, verifiedAt: string) => db.exec(`insert into saves (user_id, latest, latest_at, verified, verified_at, last_sync)
      values ('${R}', '{"tower": ${tower}}', now(), '{"tower": 125}', '${verifiedAt}', now())
      on conflict (user_id) do update set latest = excluded.latest, latest_at = excluded.latest_at,
        verified = excluded.verified, verified_at = excluded.verified_at, last_sync = excluded.last_sync`);
    await upsert(352, '2026-10-05T19:26:00Z');
    await db.exec(`update profiles set strikes = strikes + 1 where id = '${R}'`);
    const r = await read(R);
    expect(r).toMatchObject({ latest: { tower: 352 }, verified: { tower: 352 }, day_state: { tower: 352 },
      week_state: { tower: 352 }, rebase: false, pinned: true, strikes: 1 });
    expect(r.verified_at).toEqual(r.latest_at);
    // The one after verifies against it: the mark goes, and the copy moves freely again.
    await db.exec(`update saves set latest = '{"tower": 352}', verified = '{"tower": 352}', verified_at = now() + interval '5 minutes'
      where user_id = '${R}'`);
    expect(await read(R)).toMatchObject({ pinned: false, rebase: false, strikes: 0, suspect: false });
    // and the other pinned player still holds, unmoved by a refused write
    await db.exec(`update saves set latest = '{"tower": 400}' where user_id = '${D}'`);
    expect(await read(D)).toMatchObject({ latest: { tower: 125 }, pinned: true });
    await db.exec(`delete from profiles where id in ('${R}', '${D}'); delete from auth.users where id in ('${R}', '${D}');`);
  });

  /**
   * 認 Every mark off (Bruno, 2026-10-08): the flagged are cleared and rebased, the banned
   * are left exactly as they were, the clean are not touched, and nothing is deleted.
   */
  it('clearing the marks takes them off the flagged, leaves the banned and the clean alone', async () => {
    const F = '99999999-aaaa-1111-1111-111111111111';
    const S = '99999999-aaaa-2222-2222-222222222222';
    const X = '99999999-aaaa-3333-3333-333333333333';
    const N = '99999999-aaaa-4444-4444-444444444444';
    await db.exec(`
      insert into auth.users values ('${F}'), ('${S}'), ('${X}'), ('${N}');
      insert into profiles (id, name, strikes, suspect, banned) values
        ('${F}', 'Flagged', 3, true, false), ('${S}', 'Struck', 1, false, false),
        ('${X}', 'Banned', 3, true, true), ('${N}', 'Clean', 0, false, false);
      insert into saves (user_id, latest, latest_at, verified, verified_at, pinned) values
        ('${F}', '{"tower": 548}', '2026-10-08T01:00:00Z', '{"tower": 100}', '2026-10-07T01:00:00Z', true),
        ('${S}', '{"tower": 9}', '2026-10-08T01:00:00Z', '{"tower": 8}', '2026-10-07T01:00:00Z', false),
        ('${X}', '{"tower": 9}', '2026-10-08T01:00:00Z', '{"tower": 8}', '2026-10-07T01:00:00Z', true),
        ('${N}', '{"tower": 9}', '2026-10-08T01:00:00Z', '{"tower": 8}', '2026-10-07T01:00:00Z', false);
      insert into barred (email_hash, strikes, banned) values ('h-struck', 2, false), ('h-banned', 3, true);
    `);
    await db.exec(readFileSync(`${MIGRATIONS}/20261008120000_clear_marks.sql`, 'utf8'));
    const read = async (id: string) => (await db.query(`
      select p.strikes, p.suspect, p.banned, s.pinned, s.rebase, n.cleared_at is not null as noted
        from profiles p join saves s on s.user_id = p.id left join panel_notes n on n.user_id = p.id
       where p.id = '${id}'`)).rows[0] as any;
    expect(await read(F)).toMatchObject({ strikes: 0, suspect: false, banned: false, pinned: false, rebase: true, noted: true });
    expect(await read(S)).toMatchObject({ strikes: 0, suspect: false, rebase: true, noted: true });
    expect(await read(X)).toMatchObject({ strikes: 3, suspect: true, banned: true, pinned: true, rebase: false, noted: false });
    expect(await read(N)).toMatchObject({ strikes: 0, rebase: false, noted: false });
    expect((await db.query(`select email_hash, strikes from barred where email_hash like 'h-%' order by email_hash`)).rows)
      .toEqual([{ email_hash: 'h-banned', strikes: 3 }, { email_hash: 'h-struck', strikes: 0 }]);
    // and nothing was deleted
    expect((await db.query(`select count(*)::int as n from profiles where id in ('${F}','${S}','${X}','${N}')`)).rows[0]).toEqual({ n: 4 });
    await db.exec(`delete from barred where email_hash in ('h-struck', 'h-banned');
      delete from profiles where id in ('${F}','${S}','${X}','${N}'); delete from auth.users where id in ('${F}','${S}','${X}','${N}');
      update profiles set suspect = true where id = '${C}';   -- the migration cleared the suite's own suspect too`);
  });

  it('where I stand, for the signed-in player only', async () => {
    const r = await as(A, `select my_standing() as s`);
    expect((r.rows[0] as any).s.name).toBe('修士 Alpha');
    // Alpha is the only honest cultivator left on the Heaven List, so wears its crown.
    expect((r.rows[0] as any).s.title).toBe('天下第一');
    const none = await as(null, `select my_standing() as s`);
    expect((none.rows[0] as any)?.s ?? null).toBe(null);
  });
});
