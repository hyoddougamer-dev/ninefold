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
});

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
    expect((got.rows[0] as any).b).toEqual({ strikes: 2, banned: false });
    // Nobody but the server can read it.
    await expect(as(E, `select * from barred`)).rejects.toThrow(/permission denied/);
    await expect(as(E, `select barred_for('${E}')`)).rejects.toThrow(/permission denied/);
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
    const sql = readFileSync(`${MIGRATIONS}/20260929010000_panel.sql`, 'utf8')
      .replace(/'[0-9a-f]{64}'/, `'${createHash('sha256').update('test-key').digest('hex')}'`);
    await db.exec(sql);
    const rows = ((await as(null, `select panel_players('test-key') as p`)).rows[0] as any).p;
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(Object.keys(rows[0]).sort()).toEqual(
      ['climb', 'days', 'email', 'held', 'joined', 'last_seen', 'layer', 'marks', 'name', 'realm', 'started', 'syncs7', 'tower']);
    expect(JSON.stringify(rows)).not.toMatch(/@|[0-9a-f]{8}-[0-9a-f]{4}-/);
    expect(rows.every((r: any) => typeof r.email === 'boolean')).toBe(true);
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
