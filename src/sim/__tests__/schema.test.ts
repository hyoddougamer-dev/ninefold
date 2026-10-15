import { describe, expect, it, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { SEASON_START } from '../season.ts';

/**
 * 榜 The ranked schema, run in a real Postgres (PGlite) with the three things Supabase
 * provides stood in for: the auth.users table, auth.uid(), and the anon and
 * authenticated roles. What it proves is the rule the schema is built on: **a player can
 * read the boards and choose a name, and can write nothing that is ranked.**
 */
const MIGRATIONS = 'supabase/migrations';
/** 季 The season's migration: the boards and the panel read only rows written since the switch. */
const SEASON_FILE = '20261014130000_season0.sql';
let db: PGlite;

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
const C = '33333333-3333-3333-3333-333333333333';

/** A migration as the deploy runs it. pgcrypto is not in PGlite and nothing here uses it. */
const migration = (f: string) => readFileSync(`${MIGRATIONS}/${f}`, 'utf8').replace(/create extension[^;]*;/g, '');

/**
 * 季 Every migration from `from` on, run again in order, as the tests that move the clock or
 * re-run an older file need. 先行 board() and samsara_board() gained a column after the season's
 * migration, and a function's columns cannot change under create or replace, so an older file
 * that makes them could not run over the newer ones: both are dropped first, and the files
 * after it make them again, with their grants, exactly as the deploy left them.
 */
async function replay(from: string) {
  await db.exec('drop function if exists public.board(text, int); drop function if exists public.samsara_board(int);');
  for (const f of readdirSync(MIGRATIONS).sort().filter((f) => f >= from)) await db.exec(migration(f));
}

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
  for (const f of readdirSync(MIGRATIONS).sort()) await db.exec(migration(f));
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
    // 先行 is a mark beside a name, never inside it (20261015100400_name_mark.sql).
    await expect(as(A, `select set_name('先行 Alpha')`)).rejects.toThrow(/name reserved/);
    await expect(as(A, `select set_name('Alpha先行')`)).rejects.toThrow(/name reserved/);
    expect(((await as(A, `select set_name('先 Alpha 行') as n`)).rows[0] as any).n).toBe('先 Alpha 行');
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
    for (const t of ['profiles', 'saves', 'standings', 'sync_log', 'titles', 'meta', 'firsts']) {
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
    await replay(SEASON_FILE);
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
        'refused_day', 'refused_why', 'staff', 'started', 'syncs7', 'syncs_day', 'tower', 'forerunner'].sort());
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

  /**
   * 輪迴 The Samsara board (decided 2026-10-11). Heaven lists only the cultivators who have never
   * reborn; the Samsara board lists those who have, by the record of the life they are living,
   * which a rebirth sets back. The weekly board and the tower are not changed by it.
   */
  it('Heaven lists the never-reborn, the Samsara board the reborn by their current life, and the other boards read as before', async () => {
    const H = 'cccccccc-1000-0000-0000-000000000001'; // never reborn: Heaven 60
    const R = 'cccccccc-1000-0000-0000-000000000002'; // reborn once: Heaven 80 kept, this life 12 layers
    const T = 'cccccccc-1000-0000-0000-000000000003'; // reborn once: Heaven 90, this life 12 layers, 5 marks
    const U = 'cccccccc-1000-0000-0000-000000000004'; // reborn once: this life 12 layers, 5 marks, found later
    const Q = 'cccccccc-1000-0000-0000-000000000005'; // reborn twice: Heaven 81, this life 30 layers
    await db.exec(`
      insert into auth.users values ('${H}'), ('${R}'), ('${T}'), ('${U}'), ('${Q}');
      insert into profiles (id, name) values ('${H}', 'Samsara Honest'), ('${R}', 'Samsara Reborn'),
        ('${T}', 'Samsara Tops'), ('${U}', 'Samsara Later'), ('${Q}', 'Samsara Twice');
      insert into standings (user_id, climb, marks, tower, week, week_from, lives, samsara_climb, samsara_marks, samsara_at) values
        ('${H}', 60, 0, 5, week_of(), 0, 0, 60, 0, now() - interval '3 days'),
        ('${R}', 80, 2, 7, week_of(), 0, 1, 12, 0, now() - interval '3 days'),
        ('${T}', 90, 2, 0, week_of(), 0, 1, 12, 5, now() - interval '2 days'),
        ('${U}', 70, 1, 0, week_of(), 0, 1, 12, 5, now() - interval '1 day'),
        ('${Q}', 81, 4, 0, week_of(), 0, 2, 30, 0, now() - interval '5 days');
    `);
    const names = (rows: unknown[]) => (rows as any[]).map((r) => r.name);

    // Heaven: the never-reborn only, and that holds for the reborn player looking at it too.
    const heaven = names((await as(null, `select name from board('climb')`)).rows);
    expect(heaven).toContain('Samsara Honest');
    expect(heaven.filter((n) => n.startsWith('Samsara'))).toEqual(['Samsara Honest']);
    expect(names((await as(R, `select name from board('climb')`)).rows)).not.toContain('Samsara Reborn');

    // Samsara: the reborn, by this life's climb, then its marks, then who got there first.
    const samsara = (await as(null, `select rank, name, climb, marks, tower, gain, title, me, calling from samsara_board()`)).rows as any[];
    expect(samsara.map((r) => r.name)).toEqual(['Samsara Twice', 'Samsara Tops', 'Samsara Later', 'Samsara Reborn']);
    expect(samsara.map((r) => [Number(r.rank), r.climb, r.marks])).toEqual([[1, 30, 0], [2, 12, 5], [3, 12, 5], [4, 12, 0]]);
    // No tower and no week's gain on this board, and no 天下第一 for the first place.
    expect(samsara.every((r) => r.tower === 0 && r.gain === 0)).toBe(true);
    expect(samsara.some((r) => r.title === '天下第一')).toBe(false);
    expect(names(samsara)).not.toContain('Samsara Honest');
    // A reborn player sees their own place, marked as theirs, and nobody else's.
    const asR = (await as(R, `select name, me from samsara_board()`)).rows as any[];
    expect(asR.filter((r) => r.me).map((r) => r.name)).toEqual(['Samsara Reborn']);

    // The same public columns as Heaven, so the screen reads both alike.
    const cols = async (sql: string) => (await db.query(`${sql} limit 0`)).fields.map((f: any) => f.name);
    expect(await cols(`select * from samsara_board()`)).toEqual(await cols(`select * from board('climb')`));

    // The weekly board and the tower are as they were: a reborn cultivator is on both.
    expect(names((await as(null, `select name from board('week')`)).rows)).toContain('Samsara Reborn');
    expect(names((await as(null, `select name from board('tower')`)).rows)).toContain('Samsara Reborn');

    // The Heaven value a reborn cultivator leaves is kept, not deleted.
    expect((await db.query(`select climb from standings where user_id = '${R}'`)).rows[0]).toEqual({ climb: 80 });
    await db.exec(`delete from auth.users where id in ('${H}', '${R}', '${T}', '${U}', '${Q}')`);
  });

  /**
   * 輪迴 A cultivator who reborn before the Samsara migration is taken off Heaven by it, read from
   * the verified copy, at once rather than at their next sync. The migration is run again over
   * the seeded rows here: it is written to be run again (every statement is idempotent).
   */
  it('the migration takes a cultivator who had reborn off Heaven, from the verified copy', async () => {
    const W = 'cccccccc-2000-0000-0000-000000000001';
    await db.exec(`
      insert into auth.users values ('${W}');
      insert into profiles (id, name) values ('${W}', 'Samsara Before');
      insert into saves (user_id, latest, verified, verified_at, last_sync) values ('${W}', '{}',
        '{"realm": 2, "layer": 3, "tribulation": 4, "lives": [{"marks": 9, "at": 1700000000}]}', '2026-10-10T10:00:00Z', now());
      insert into standings (user_id, climb, marks, tower, week, week_from) values ('${W}', 90, 3, 0, week_of(), 0);
    `);
    const pre = (await db.query(`select lives from standings where user_id = '${W}'`)).rows[0] as any;
    expect(Number(pre.lives)).toBe(0);
    await replay('20261011120000_samsara.sql');
    const got = (await db.query(`select lives, samsara_climb, samsara_marks, samsara_at, climb from standings where user_id = '${W}'`)).rows[0] as any;
    expect(Number(got.lives)).toBe(1);
    expect(Number(got.samsara_climb)).toBe(12);           // realm 2, layer 3: (2 - 1) * 9 + 3
    expect(Number(got.samsara_marks)).toBe(4);
    expect(Number(got.climb)).toBe(90);                    // the Heaven value is kept
    expect(new Date(got.samsara_at).toISOString()).toBe('2026-10-10T10:00:00.000Z');
    expect((await as(null, `select name from board('climb')`)).rows.map((r: any) => r.name)).not.toContain('Samsara Before');
    expect((await as(null, `select name from samsara_board()`)).rows.map((r: any) => r.name)).toContain('Samsara Before');
    await db.exec(`delete from auth.users where id = '${W}'`);
  });

  it('no player can write or read the lives and the Samsara record except through the boards', async () => {
    await expect(as(A, `update standings set lives = 9 where user_id = '${A}'`)).rejects.toThrow(/permission denied/);
    await expect(as(A, `update standings set samsara_climb = 80 where user_id = '${A}'`)).rejects.toThrow(/permission denied/);
    await expect(as(A, `select samsara_climb from standings`)).rejects.toThrow(/permission denied/);
  });
  /**
   * 季 Season 0. season_start() is SEASON_START, and the boards, the titles, where I stand and
   * the panel read every row before it and only the season's rows from it. Nothing is deleted.
   * The switch cannot be waited for here, so the test moves it: season_start() is redefined to
   * this Monday 00:00 UTC (a season begins on a Monday, as the real one does), and put back.
   */
  it('season_start() is SEASON_START, to the second', async () => {
    await replay(SEASON_FILE);
    const r = (await db.query(`select extract(epoch from season_start())::bigint as t`)).rows[0] as any;
    expect(Number(r.t)).toBe(SEASON_START);
    expect(readFileSync(`${MIGRATIONS}/${SEASON_FILE}`, 'utf8')).toContain(`to_timestamp(${SEASON_START})`);
  });

  it('from the switch the boards, titles and panel read only season rows, and nothing is deleted', async () => {
    // Every migration that redefined these functions before it, run again above, is undone
    // by running this one and every one after it again: each is written to be run again.
    await replay(SEASON_FILE);
    const { createHash } = await import('node:crypto');
    await db.exec(readFileSync(`${MIGRATIONS}/20261004220000_panel_key.sql`, 'utf8')
      .replace(/'[0-9a-f]{64}'/, `'${createHash('sha256').update('test-key').digest('hex')}'`));
    const P = 'dddddddd-0000-0000-0000-000000000001'; // the closed test's best, last seen the day before
    const R = 'dddddddd-0000-0000-0000-000000000002'; // reborn in the closed test
    const Q = 'dddddddd-0000-0000-0000-000000000003'; // begun in the season
    const monday = `to_timestamp(week_of() * 604800 - 259200)`;
    await db.exec(`
      insert into auth.users values ('${P}'), ('${R}'), ('${Q}');
      insert into profiles (id, name) values ('${P}', 'Closed Best'), ('${R}', 'Closed Reborn'), ('${Q}', 'Season First');
      insert into standings (user_id, climb, marks, tower, week, week_from, lives, samsara_climb, updated_at) values
        ('${P}', 79, 6, 500, week_of() - 1, 0, 0, 79, ${monday} - interval '1 day'),
        ('${R}', 70, 2, 9, week_of() - 1, 0, 1, 30, ${monday} - interval '2 days'),
        ('${Q}', 3, 0, 1, week_of(), 0, 0, 3, now());
      insert into saves (user_id, latest, latest_at, verified, verified_at, last_sync) values
        ('${P}', '{"realm": 9, "startedAt": 1777593600, "tag": "kept-closed-copy"}', ${monday} - interval '1 day',
         '{"realm": 9, "layer": 8, "startedAt": 1777593600}', ${monday} - interval '1 day', ${monday} - interval '1 day'),
        ('${Q}', '{"realm": 1, "season": "s0"}', now(), '{"realm": 1, "layer": 3, "season": "s0"}', now(), now());
      insert into titles (week, board, rank, user_id, name) values (week_of() - 1, 'week', 1, '${P}', 'Closed Best');
      insert into sync_log (user_id, at, ok, why, strike) values ('${P}', ${monday} - interval '1 day', false, '{gear}', true);
    `);
    const names = async (sql: string, who: string | null = null) => ((await as(who, sql)).rows as any[]).map((r) => r.name);
    const panel = async (fn: string) => ((await as(null, `select ${fn}('test-key') as p`)).rows[0] as any).p as any[];

    // Before the switch: everything reads as it always has.
    expect(await names(`select name from board('climb')`)).toEqual(expect.arrayContaining(['Closed Best', 'Season First']));
    expect(await names(`select name from board('tower')`)).toContain('Closed Best');
    expect(await names(`select name from samsara_board()`)).toContain('Closed Reborn');
    expect(((await db.query(`select title_of('${P}') as t`)).rows[0] as any).t).toBe('期首');
    expect(((await as(P, `select my_standing() as s`)).rows[0] as any).s).toMatchObject({ climb: 79, title: '天下第一' });
    expect((await panel('panel_players')).find((r) => r.name === 'Closed Best')).toMatchObject({ realm: 9, climb: 79, tower: 500, days: 1 });
    expect((await panel('panel_cheats')).find((r) => r.name === 'Closed Best')).toMatchObject({ struck: 1 });
    const realms = async () => (((await as(null, `select stats() as s`)).rows[0] as any).s.realms as any[]);
    expect((await realms()).some((r) => r.realm === 9)).toBe(true);
    // 落 The closed-test copy was retired before the switch (20261015100000_retire_closed_copy.sql):
    // there is no door to it on either side of the switch, for its own player or anyone.
    await expect(as(P, `select closed_test_mine()`)).rejects.toThrow(/does not exist/);

    // The switch.
    await db.exec(`create or replace function public.season_start() returns timestamptz language sql stable
      set search_path = public as $$ select ${monday} $$`);
    try {
      const heaven = await names(`select name from board('climb')`);
      expect(heaven).toContain('Season First');
      expect(heaven).not.toContain('Closed Best');
      expect(await names(`select name from board('tower')`)).not.toContain('Closed Best');
      expect(await names(`select name from board('week')`)).not.toContain('Closed Best');
      expect(await names(`select name from samsara_board()`)).not.toContain('Closed Reborn');
      // The first under Heaven is the season's, and the closed test's last week is worn by nobody.
      expect(((await as(null, `select title from board('climb') where rank = 1`)).rows[0] as any).title).toBe('天下第一');
      expect(((await db.query(`select title_of('${P}') as t`)).rows[0] as any).t).toBeNull();
      const mine = ((await as(P, `select my_standing() as s`)).rows[0] as any).s;
      expect(mine).toMatchObject({ name: 'Closed Best', climb: null, tower: null, verified_at: null, latest_at: null });
      expect(mine.title).toBeNull();
      expect(((await as(Q, `select my_standing() as s`)).rows[0] as any).s).toMatchObject({ climb: 3 });
      // The panel: accounts are kept, what was played is the season's.
      const p = (await panel('panel_players')).find((r) => r.name === 'Closed Best');
      expect(p).toMatchObject({ realm: 1, climb: 0, marks: 0, tower: 0, days: 0, last_seen: null, started: null });
      expect((await panel('panel_players')).find((r) => r.name === 'Season First')).toMatchObject({ realm: 1, layer: 3, climb: 3 });
      expect((await panel('panel_cheats')).find((r) => r.name === 'Closed Best')).toBeUndefined();
      expect((await realms()).some((r) => r.realm === 9)).toBe(false);
      // Nothing was deleted: every row is where it was.
      const counts = (await db.query(`select
        (select count(*) from standings where user_id in ('${P}', '${R}'))::int as st,
        (select count(*) from saves where user_id = '${P}')::int as sv,
        (select count(*) from titles where user_id = '${P}')::int as ti,
        (select count(*) from sync_log where user_id = '${P}')::int as lg`)).rows[0];
      expect(counts).toEqual({ st: 2, sv: 1, ti: 1, lg: 1 });

      // 落 No door to the closed-test copy, for its own player, another, or nobody signed in.
      for (const who of [P, Q, null]) {
        await expect(as(who, `select closed_test_mine()`)).rejects.toThrow(/does not exist/);
      }

      // 落 The season's first sync of an account writes over its cloud copy, as the sync function
      // does (an upsert), and nothing is moved aside: the closed-test copy is not kept anywhere.
      const upsert = (latest: string) => db.exec(`insert into saves (user_id, latest, latest_at, verified, verified_at, last_sync)
        values ('${P}', '${latest}', now(), null, null, now())
        on conflict (user_id) do update set latest = excluded.latest, latest_at = excluded.latest_at,
          verified = excluded.verified, verified_at = excluded.verified_at, last_sync = excluded.last_sync`);
      await upsert('{"realm": 1, "season": "s0", "n": 1}');
      await upsert('{"realm": 1, "season": "s0", "n": 2}');
      const row = (await db.query(`select latest, closed_test, closed_test_at from saves where user_id = '${P}'`)).rows[0] as any;
      expect(row.latest).toMatchObject({ season: 's0', n: 2 });
      expect(row).toMatchObject({ closed_test: null, closed_test_at: null });
      expect(JSON.stringify((await db.query(`select * from saves`)).rows)).not.toContain('kept-closed-copy');
      await expect(as(P, `select closed_test from saves`)).rejects.toThrow(/permission denied/);
      // Nothing on the server keeps it again: no trigger on saves but the pin's, and no function
      // of the public schema reads or writes those two columns.
      const triggers = (await db.query(`select tgname from pg_trigger
        where tgrelid = 'public.saves'::regclass and not tgisinternal order by tgname`)).rows.map((r: any) => r.tgname);
      expect(triggers).not.toContain('saves_keep_closed_test');
      const reading = (await db.query(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosrc like '%closed_test%'`)).rows.map((r: any) => r.proname);
      expect(reading).toEqual([]);
      // The panel and the counts never carry it, by what they answer and by what they read.
      const told = JSON.stringify([await panel('panel_players'), await panel('panel_cheats'),
        ((await as(null, `select stats() as s`)).rows[0] as any).s]);
      expect(told).not.toContain('kept-closed-copy');
      expect(told).not.toContain('closed_test');
      for (const fn of ['panel_players', 'panel_cheats', 'stats']) {
        const def = ((await db.query(`select string_agg(pg_get_functiondef(p.oid), ' ') as d from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = $1`, [fn])).rows[0] as any).d;
        expect(def, fn).toBeTruthy();
        expect(def, fn).not.toContain('closed_test');
      }
    } finally {
      await replay(SEASON_FILE);
    }
    // Put back, the closed test reads as before, and a write before the switch keeps nothing aside.
    expect(await names(`select name from board('climb')`)).toContain('Closed Best');
    await db.exec(`update saves set latest = '{"realm": 2}' where user_id = '${Q}'`);
    expect((await db.query(`select closed_test from saves where user_id = '${Q}'`)).rows[0]).toEqual({ closed_test: null });
    await db.exec(`delete from titles where user_id = '${P}'; delete from sync_log where user_id = '${P}';
      delete from auth.users where id in ('${P}', '${R}', '${Q}')`);
  });
});

/**
 * 開山 Season 0, The Founding (docs/SEASON0-THEME.md, decided 2026-10-15): the 先行 Forerunner
 * mark, the carving of 題名崖 the Cliff of Names, and the staff flag. Every test that needs the
 * switch behind it moves season_start() to a fixed instant a day ago, and puts it back.
 */
describe('開山 the Founding: Forerunner, the Cliff, staff', () => {
  const at = (ms: number) => `'${new Date(ms).toISOString()}'::timestamptz`;
  const switchAt = (t: string) => db.exec(`create or replace function public.season_start() returns timestamptz
    language sql stable set search_path = public as $$ select ${t} $$`);
  const switchBack = () => switchAt(`to_timestamp(${SEASON_START})`);
  const SWITCH = Date.now() - 86_400_000;
  const id = (k: string, n: number) => `${k}-0000-0000-0000-${String(n).padStart(12, '0')}`;
  const forerunner = async (uid: string) => ((await db.query(`select is_forerunner($1) as f`, [uid])).rows[0] as any).f;
  const gates = async (uid: string) => (await db.query(`select gate, at from firsts where user_id = $1 order by gate`, [uid])).rows as any[];
  const testKey = async () => {
    const { createHash } = await import('node:crypto');
    await db.exec(readFileSync(`${MIGRATIONS}/20261004220000_panel_key.sql`, 'utf8')
      .replace(/'[0-9a-f]{64}'/, `'${createHash('sha256').update('test-key').digest('hex')}'`));
  };

  it('先行 is any sync before the switch, whatever its verdict; never the banned, never staff', async () => {
    const F = (n: number) => id('f0000000', n);
    await db.exec(`
      insert into auth.users values ('${F(1)}'), ('${F(2)}'), ('${F(3)}'), ('${F(4)}'), ('${F(5)}'), ('${F(6)}'), ('${F(7)}');
      insert into profiles (id, name, banned, staff, forerunner) values
        ('${F(1)}', 'Fore Refused', false, false, false),   -- only a refused sync before the switch
        ('${F(2)}', 'Fore Banned', true, false, false),
        ('${F(3)}', 'Fore Staff', false, true, false),
        ('${F(4)}', 'Fore Stamped', false, false, true),     -- stamped by Push B, its old rows gone
        ('${F(5)}', 'Fore Late', false, false, false),       -- first synced at or after the switch
        ('${F(6)}', 'Fore Stamped Banned', true, false, true),
        ('${F(7)}', 'Fore Never', false, false, false);      -- never synced at all
      insert into sync_log (user_id, at, ok) values
        ('${F(1)}', ${at(SWITCH)} - interval '2 days', false),
        ('${F(1)}', ${at(SWITCH)} + interval '1 hour', true),
        ('${F(2)}', ${at(SWITCH)} - interval '2 days', true),
        ('${F(3)}', ${at(SWITCH)} - interval '2 days', true),
        ('${F(5)}', ${at(SWITCH)} + interval '1 hour', true),
        ('${F(5)}', ${at(SWITCH)}, true);   -- the switch's own second is the season's
    `);
    await switchAt(at(SWITCH));
    try {
      const got = await Promise.all([1, 2, 3, 4, 5, 6, 7].map((n) => forerunner(F(n))));
      expect(got).toEqual([true, false, false, true, false, false, false]);
      expect(await forerunner('00000000-0000-0000-0000-000000000000')).toBe(false);   // no such account

      // On every board, as its own column after calling, and where I stand.
      await db.exec(`insert into standings (user_id, climb, marks, tower, week, week_from, lives, samsara_climb, updated_at) values
        ('${F(1)}', 70, 0, 400, week_of(), 0, 0, 70, now()), ('${F(4)}', 69, 0, 399, week_of(), 0, 1, 12, now()),
        ('${F(5)}', 68, 0, 398, week_of(), 0, 0, 68, now())`);
      const marked = (rows: any[]) => Object.fromEntries(rows.filter((r) => r.name.startsWith('Fore ')).map((r) => [r.name, r.forerunner]));
      expect(marked((await as(null, `select name, forerunner from board('climb')`)).rows as any[]))
        .toEqual({ 'Fore Refused': true, 'Fore Late': false });
      expect(marked((await as(A, `select name, forerunner from board('tower')`)).rows as any[]))
        .toEqual({ 'Fore Refused': true, 'Fore Stamped': true, 'Fore Late': false });
      expect(marked((await as(null, `select name, forerunner from samsara_board()`)).rows as any[]))
        .toEqual({ 'Fore Stamped': true });
      const cols = async (sql: string) => (await db.query(`${sql} limit 0`)).fields.map((f: any) => f.name);
      expect(await cols(`select * from board('climb')`)).toEqual(
        ['rank', 'name', 'climb', 'marks', 'tower', 'gain', 'title', 'me', 'calling', 'forerunner']);
      expect(await cols(`select * from samsara_board()`)).toEqual(await cols(`select * from board('climb')`));
      expect(((await as(F(1), `select my_standing() as s`)).rows[0] as any).s).toMatchObject({ name: 'Fore Refused', forerunner: true });
      expect(((await as(F(5), `select my_standing() as s`)).rows[0] as any).s).toMatchObject({ forerunner: false });
      expect(((await as(F(3), `select my_standing() as s`)).rows[0] as any).s).toMatchObject({ forerunner: false });

      // 先行 The foot of the Cliff: every Forerunner's name, carved or not, and nothing else.
      const foot = async (who: string | null = null) => ((await as(who, `select * from forerunners()`)).rows as any[])
        .map((r) => r.name).filter((n: string) => n.startsWith('Fore '));
      expect(await foot()).toEqual(['Fore Refused', 'Fore Stamped']);
      expect(await foot(F(5))).toEqual(['Fore Refused', 'Fore Stamped']);
      expect((await db.query(`select * from forerunners() limit 0`)).fields.map((f: any) => f.name)).toEqual(['name']);
      await db.exec(`update profiles set suspect = true where id = '${F(1)}'`);
      expect(await foot()).toEqual(['Fore Stamped']);   // held for review: off it, as off the boards
      await db.exec(`update profiles set suspect = false where id = '${F(1)}'`);

      // Nobody calls it from outside, and nobody stamps or unstamps an account but the server.
      await expect(as(null, `select is_forerunner('${F(1)}')`)).rejects.toThrow(/permission denied/);
      await expect(as(F(5), `select is_forerunner('${F(5)}')`)).rejects.toThrow(/permission denied/);
      await expect(as(F(5), `update profiles set forerunner = true where id = '${F(5)}'`)).rejects.toThrow(/permission denied/);
      await expect(as(null, `update profiles set forerunner = true`)).rejects.toThrow(/permission denied/);
      await expect(as(F(3), `update profiles set staff = false where id = '${F(3)}'`)).rejects.toThrow(/permission denied/);
      await expect(as(F(5), `insert into sync_log (user_id, at, ok) values ('${F(5)}', '2026-01-01', true)`)).rejects.toThrow(/permission denied/);
    } finally {
      await switchBack();
      await db.exec(`delete from sync_log where user_id::text like 'f0000000-%'; delete from auth.users where id::text like 'f0000000-%'`);
    }
  });

  it('題名崖 carves nothing before the switch, then each gate once, at the sync that showed it, never rewritten', async () => {
    const K = (n: number) => id('c0000000', n);
    await db.exec(`insert into auth.users values ('${K(1)}'), ('${K(2)}'), ('${K(3)}');
      insert into profiles (id, name) values ('${K(1)}', 'Carve One'), ('${K(2)}', 'Carve Old'), ('${K(3)}', 'Carve New');`);
    // As the sync function writes a standing: an upsert, updated_at its own now.
    const sync = (uid: string, climb: number, marks: number) => db.exec(`
      insert into standings (user_id, climb, marks, tower, updated_at) values ('${uid}', ${climb}, ${marks}, 0, now())
      on conflict (user_id) do update set climb = excluded.climb, marks = excluded.marks, updated_at = excluded.updated_at`);
    const later = () => new Promise((r) => setTimeout(r, 15));
    try {
      // The closed test: a cultivator at the summit, written again and again, carves nothing.
      await switchAt(`now() + interval '1 day'`);
      await sync(K(1), 80, 3);
      await sync(K(1), 80, 4);
      expect(await gates(K(1))).toEqual([]);

      // A row the closed test wrote, touched after the switch by anything but a season sync
      // (its updated_at is still from before), carves nothing either.
      await db.exec(`insert into standings (user_id, climb, marks, tower, updated_at) values ('${K(2)}', 80, 5, 0, ${at(SWITCH)} - interval '1 day')`);
      await switchAt(at(SWITCH));
      await db.exec(`update standings set tower = 7 where user_id = '${K(2)}'`);
      expect(await gates(K(2))).toEqual([]);

      // The season: K1's first season sync is into realm 3, so through the first two gates.
      await sync(K(1), 20, 0);
      const first = await gates(K(1));
      expect(first.map((g) => g.gate)).toEqual([1, 2]);
      await later();
      await sync(K(1), 27, 0);   // realm 4: the third gate, and the first two untouched
      const second = await gates(K(1));
      expect(second.map((g) => g.gate)).toEqual([1, 2, 3]);
      expect(second.slice(0, 2)).toEqual(first);
      expect(new Date(second[2].at).getTime()).toBeGreaterThan(new Date(first[0].at).getTime());
      await sync(K(1), 26, 0);   // a climb read lower carves nothing and takes nothing back
      expect(await gates(K(1))).toEqual(second);
      await later();
      await sync(K(1), 30, 1);   // the Dragon's gate is the first tribulation crossed, whatever the climb
      const dragon = await gates(K(1));
      expect(dragon.map((g) => g.gate)).toEqual([1, 2, 3, 9]);
      await later();
      await sync(K(1), 80, 6);
      await sync(K(1), 80, 7);
      const all = await gates(K(1));
      expect(all.map((g) => g.gate)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(all.filter((g) => g.gate <= 3)).toEqual(second);
      expect(all.find((g) => g.gate === 9)).toEqual(dragon.find((g) => g.gate === 9));
      // 8 is the last of the wardens' gates: realm 9 begins at climb 72; 71 is realm 8, layer 8.
      await sync(K(3), 71, 0);
      expect((await gates(K(3))).map((g) => g.gate)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      await sync(K(3), 72, 0);
      expect((await gates(K(3))).map((g) => g.gate)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      // Leaving takes the account's carvings with it, and nothing else.
      await as(K(3), `select delete_me()`);
      expect(await gates(K(3))).toEqual([]);
      expect(await gates(K(1))).toHaveLength(9);
    } finally {
      await switchBack();
      await db.exec(`delete from auth.users where id::text like 'c0000000-%'`);
    }
    expect((await db.query(`select count(*)::int as n from firsts where user_id::text like 'c0000000-%'`)).rows[0]).toEqual({ n: 0 });
  });

  it('題名崖 reads the first 81 through each gate by time, ties by id, skipping banned, held and staff', async () => {
    const E = (n: number) => id('e0000000', n);
    const base = Date.UTC(2026, 9, 26, 6, 0, 0);
    // Carver n is seen through the fifth gate n minutes in, but 3 shares 2's minute and 9 shares 11's.
    const t = (n: number) => base + (n === 3 ? 2 : n === 9 ? 11 : n) * 60_000;
    await db.exec(`
      insert into auth.users select ('e0000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid from generate_series(1, 90) g;
      insert into profiles (id, name) select ('e0000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'Carver ' || g
        from generate_series(1, 90) g;
      insert into firsts (gate, user_id, at) values
        ${Array.from({ length: 90 }, (_, i) => `(5, '${E(i + 1)}', ${at(t(i + 1))})`).join(',\n        ')},
        (1, '${E(7)}', ${at(base)}), (1, '${E(1)}', ${at(base + 1)});
      update profiles set banned = true where id = '${E(1)}';
      update profiles set suspect = true where id = '${E(4)}';
      update profiles set staff = true where id = '${E(6)}';
      insert into sync_log (user_id, at, ok) values ('${E(2)}', season_start() - interval '1 day', false);
    `);
    try {
      const read = async (who: string | null = null) => ((await as(who, `select gate, rank, name, at, forerunner from cliff()`)).rows as any[])
        .filter((r) => r.name.startsWith('Carver '));
      const five = (await read()).filter((r) => r.gate === 5);
      expect(five).toHaveLength(81);
      expect(five.map((r) => r.rank)).toEqual(Array.from({ length: 81 }, (_, i) => i + 1));
      // 2 and 3 share a minute (2 first, by id); 9 shares 11's (9 first); 1, 4 and 6 are skipped.
      expect(five.slice(0, 9).map((r) => r.name)).toEqual(
        ['Carver 2', 'Carver 3', 'Carver 5', 'Carver 7', 'Carver 8', 'Carver 10', 'Carver 9', 'Carver 11', 'Carver 12']);
      expect(five.at(-1).name).toBe('Carver 84');
      expect(new Date(five[0].at).getTime()).toBe(t(2));
      expect(five.filter((r) => r.forerunner).map((r) => r.name)).toEqual(['Carver 2']);
      // The first gate: the banned one first through it is skipped, and the next is first. A
      // signed-in player reads the same Cliff.
      expect((await read(A)).filter((r) => r.gate === 1).map((r) => [r.rank, r.name])).toEqual([[1, 'Carver 7']]);
      // What it answers: no id, nothing but these five.
      const cols = (await db.query(`select * from cliff() limit 0`)).fields.map((f: any) => f.name);
      expect(cols).toEqual(['gate', 'rank', 'name', 'at', 'forerunner']);
      expect(JSON.stringify(await read())).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);

      // Held for review, then cleared: back at the original time, ahead of those after it.
      await db.exec(`update profiles set suspect = false where id = '${E(4)}'`);
      const back = (await read()).filter((r) => r.gate === 5);
      expect(back.slice(0, 4).map((r) => r.name)).toEqual(['Carver 2', 'Carver 3', 'Carver 4', 'Carver 5']);
      expect(back.at(-1).name).toBe('Carver 83');
    } finally {
      await db.exec(`delete from sync_log where user_id::text like 'e0000000-%'; delete from auth.users where id::text like 'e0000000-%'`);
    }
  });

  it('every function the Founding made or remade as its owner searches pg_temp last', async () => {
    // A security definer function runs as its owner, so no table of a caller's own may stand in
    // for one of its names: pg_temp is searched first unless it is named, and named last here.
    const fns = ['board', 'samsara_board', 'my_standing', 'is_forerunner', 'cliff', 'standings_carve',
      'panel_set_staff', 'panel_players', 'set_name', 'forerunners'];
    const got = (await db.query(`select p.proname, p.prosecdef, array_to_string(p.proconfig, ',') as cfg
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = any($1::text[])`, [fns])).rows as any[];
    expect(got.map((r) => r.proname).sort()).toEqual([...fns].sort());
    for (const r of got) {
      expect(r.prosecdef, r.proname).toBe(true);
      expect(r.cfg, r.proname).toMatch(/^search_path=.*\bpg_temp$/);
    }
  });

  it('no player writes the Cliff, and no player calls the carving', async () => {
    for (const who of [A, null]) {
      await expect(as(who, `insert into firsts (gate, user_id) values (1, '${A}')`)).rejects.toThrow(/permission denied/);
      await expect(as(who, `update firsts set at = '2020-01-01'`)).rejects.toThrow(/permission denied/);
      await expect(as(who, `delete from firsts`)).rejects.toThrow(/permission denied/);
      await expect(as(who, `select * from firsts`)).rejects.toThrow(/permission denied/);
      await expect(as(who, `select standings_carve()`)).rejects.toThrow(/permission denied|trigger/);
    }
    // and the carving is a trigger on the table the sync writes.
    const trig = (await db.query(`select tgname from pg_trigger where tgrelid = 'public.standings'::regclass
      and tgname = 'standings_carve'`)).rows;
    expect(trig).toHaveLength(1);
  });

  it('staff is set only with the panel key, by name, and takes the account off the Cliff and the mark', async () => {
    await testKey();
    const S = id('5aff0000', 1);
    await db.exec(`insert into auth.users values ('${S}');
      insert into profiles (id, name) values ('${S}', 'Staff Test');
      insert into sync_log (user_id, at, ok) values ('${S}', season_start() - interval '3 days', true);
      insert into firsts (gate, user_id, at) values (2, '${S}', '2026-10-26T00:05:00Z');`);
    try {
      for (const who of [null, A, S]) {
        await expect(as(who, `select panel_set_staff('guess', 'Staff Test', true)`)).rejects.toThrow(/wrong key/);
        await expect(as(who, `select panel_set_staff(null, 'Staff Test', true)`)).rejects.toThrow(/wrong key/);
      }
      await expect(as(null, `select panel_set_staff('test-key', 'Nobody At All', true)`)).rejects.toThrow(/no such player/);
      const staff = async () => ((await db.query(`select staff from profiles where id = '${S}'`)).rows[0] as any).staff;
      const onCliff = async () => ((await as(null, `select name from cliff()`)).rows as any[]).some((r) => r.name === 'Staff Test');
      expect(await staff()).toBe(false);
      expect(await forerunner(S)).toBe(true);
      expect(await onCliff()).toBe(true);

      expect(((await as(null, `select panel_set_staff('test-key', '  staff TEST ', true) as s`)).rows[0] as any).s).toBe(true);
      expect(await staff()).toBe(true);
      expect(await forerunner(S)).toBe(false);
      expect(await onCliff()).toBe(false);
      const row = ((await as(null, `select panel_players('test-key') as p`)).rows[0] as any).p.find((r: any) => r.name === 'Staff Test');
      expect(row).toMatchObject({ staff: true, forerunner: false });

      // Off again: back on the Cliff at its true time, and the mark is back. Called by name, as
      // the panel's REST call makes it, every argument quoted ("on" is a keyword).
      await as(A, `select panel_set_staff("key" := 'test-key', "name" := 'Staff Test', "on" := false)`);
      expect(await staff()).toBe(false);
      expect(await forerunner(S)).toBe(true);
      expect(await onCliff()).toBe(true);
    } finally {
      await db.exec(`delete from sync_log where user_id = '${S}'; delete from auth.users where id = '${S}'`);
    }
  });

  /**
   * 先行 Push B (docs/SEASON0-PUSHB-DRAFT.md) deletes the closed test's sync_log rows, which are
   * the Forerunner evidence, so its first write stamps profiles.forerunner from them. Its text
   * is run here as it stands, the cutoff moved to a day ago with season_start(), the brake filled
   * in. Last in the file on purpose: it deletes every row from before the cutoff.
   */
  it('the Push B draft stamps every Forerunner before it deletes anything, and keeps no closed-test save', async () => {
    const draft = readFileSync('docs/SEASON0-PUSHB-DRAFT.md', 'utf8');
    const sql = draft.match(/```sql\n([\s\S]*?)```/)?.[1] ?? '';
    const body = sql.replace(/--[^\n]*/g, '');
    // The order, read off the text: the stamp is the first write.
    const stamp = body.search(/update\s+public\.profiles\s+p\s+set\s+forerunner\s*=\s*true/i);
    expect(stamp).toBeGreaterThan(0);
    const writes = [...body.matchAll(/\b(delete\s+from|update\s+public\.\w+|truncate|drop\s+column)\b/gi)].map((m) => m.index!);
    expect(Math.min(...writes)).toBe(stamp);
    expect(body).not.toMatch(/closed_test_mine|closed_test\s*=/);
    expect(body).toMatch(/delete\s+from\s+public\.saves\s+where\s+last_sync\s*<\s*cutoff/i);
    // Its cutoff is SEASON_START, and it is no migration.
    expect(Date.parse(sql.match(/cutoff constant timestamptz := '([^']+)'/)![1]) / 1000).toBe(SEASON_START);
    for (const f of readdirSync(MIGRATIONS)) expect(readFileSync(`${MIGRATIONS}/${f}`, 'utf8'), f).not.toMatch(/season 0 wipe/i);

    // Run it.
    const cutoff = new Date(Date.now() - 86_400_000).toISOString();
    const block = (brake: number, when = cutoff) => sql
      .replace(`'2026-10-26T00:00:00Z'`, `'${when}'`).replace(/<the developer's player count[^>]*>/, String(brake));
    const W = (n: number) => `b0000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
    const seed = () => db.exec(`
      insert into auth.users values ('${W(1)}'), ('${W(2)}'), ('${W(3)}'), ('${W(4)}') on conflict do nothing;
      insert into profiles (id, name, banned) values ('${W(1)}', 'Wipe Old', false), ('${W(2)}', 'Wipe Banned', true),
        ('${W(3)}', 'Wipe Season', false), ('${W(4)}', 'Wipe Both', false) on conflict do nothing;
      insert into sync_log (user_id, at, ok) values
        ('${W(1)}', '${cutoff}'::timestamptz - interval '3 days', false),
        ('${W(2)}', '${cutoff}'::timestamptz - interval '3 days', true),
        ('${W(3)}', now(), true),
        ('${W(4)}', '${cutoff}'::timestamptz - interval '9 days', true), ('${W(4)}', now(), true);
      insert into saves (user_id, latest, latest_at, last_sync, pinned) values
        ('${W(1)}', '{"realm": 9, "tag": "closed-copy"}', '${cutoff}'::timestamptz - interval '3 days', '${cutoff}'::timestamptz - interval '3 days', true),
        ('${W(3)}', '{"realm": 1, "season": "s0"}', now(), now(), false),
        ('${W(4)}', '{"realm": 2, "season": "s0"}', now(), now(), false)
        on conflict (user_id) do nothing;
      insert into standings (user_id, climb, marks, tower, updated_at) values
        ('${W(1)}', 79, 6, 500, '${cutoff}'::timestamptz - interval '3 days') on conflict do nothing;
      insert into titles (week, board, rank, user_id, name) values
        (week_of('${cutoff}'::timestamptz) - 1, 'week', 1, '${W(1)}', 'Wipe Old') on conflict do nothing;
      -- 疑 Flags: Wipe Old was struck and held in the closed test, Wipe Both is held by the season.
      update profiles set strikes = 2, suspect = true where id in ('${W(1)}', '${W(4)}');
      insert into sync_log (user_id, at, ok, strike, suspect) values
        ('${W(1)}', '${cutoff}'::timestamptz - interval '2 days', false, true, true),
        ('${W(4)}', now(), false, false, true);
    `);
    const flags = async (n: number) => (await db.query(`select strikes, suspect from profiles where id = '${W(n)}'`)).rows[0];
    const everyone = async () => (await db.query(`select id, name, is_forerunner(id) as f from profiles order by id`)).rows as any[];
    const rows = async () => (await db.query(`select
      (select count(*) from saves)::int as saves, (select count(*) from standings)::int as standings,
      (select count(*) from sync_log)::int as log, (select count(*) from titles)::int as titles,
      (select count(*) from profiles)::int as profiles, (select count(*) from firsts)::int as firsts,
      (select count(*) from profiles where forerunner)::int as stamped`)).rows[0] as any;

    await switchAt(`'${cutoff}'::timestamptz`);
    try {
      await seed();
      // A carving from the season, which the wipe never touches.
      await db.exec(`insert into standings (user_id, climb, marks, tower, updated_at) values ('${W(3)}', 9, 0, 0, now())`);
      const before = await everyone();
      expect(before.filter((r) => r.name.startsWith('Wipe ')).map((r) => [r.name, r.f]))
        .toEqual([['Wipe Old', true], ['Wipe Banned', false], ['Wipe Season', false], ['Wipe Both', true]]);
      const counts = await rows();

      // Over the brake: raises, and nothing at all is changed, the stamp included.
      await expect(db.exec(block(0))).rejects.toThrow(/more than 0; nothing deleted/);
      expect(await rows()).toEqual(counts);
      // Before its cutoff: raises.
      await expect(db.exec(block(1000, new Date(Date.now() + 86_400_000).toISOString()))).rejects.toThrow(/has not begun|not season_start/);

      await db.exec(block(1000));
      // 先行 Every account reads the same as before, with the old rows gone.
      expect(await everyone()).toEqual(before);
      expect((await db.query(`select count(*)::int as n from sync_log where at < '${cutoff}'`)).rows[0]).toEqual({ n: 0 });
      const stamped = (await db.query(`select name from profiles where forerunner and name like 'Wipe %' order by name`)).rows.map((r: any) => r.name);
      expect(stamped).toEqual(['Wipe Banned', 'Wipe Both', 'Wipe Old']);
      // A ban lifted afterwards gives the mark back.
      await db.exec(`update profiles set banned = false where id = '${W(2)}'`);
      expect(await forerunner(W(2))).toBe(true);
      await db.exec(`update profiles set banned = true where id = '${W(2)}'`);
      // The closed test's rows went, the closed-test cloud copy with them; the season's are whole.
      expect((await db.query(`select user_id from saves where user_id::text like 'b0000000-%' order by user_id`)).rows.map((r: any) => r.user_id))
        .toEqual([W(3), W(4)]);
      expect(JSON.stringify((await db.query(`select * from saves`)).rows)).not.toContain('closed-copy');
      expect((await db.query(`select count(*)::int as n from standings where user_id = '${W(1)}'`)).rows[0]).toEqual({ n: 0 });
      expect((await db.query(`select count(*)::int as n from titles where user_id = '${W(1)}'`)).rows[0]).toEqual({ n: 0 });
      const after = await rows() as any;
      expect(after).toMatchObject({ profiles: counts.profiles, firsts: counts.firsts });
      expect(after.firsts).toBeGreaterThan(0);
      expect((await db.query(`select banned from profiles where id = '${W(2)}'`)).rows[0]).toEqual({ banned: true });
      // 疑 The closed test's flags are cleared; a flag the season gave stays, so the wipe never puts
      // a player held for review back on the boards or the Cliff.
      expect(await flags(1)).toEqual({ strikes: 0, suspect: false });
      expect(await flags(4)).toEqual({ strikes: 2, suspect: true });
      // And a second run changes nothing.
      await db.exec(block(1000));
      expect(await rows()).toEqual(after);
      expect(await everyone()).toEqual(before);
    } finally {
      await switchBack();
    }
  });
});
