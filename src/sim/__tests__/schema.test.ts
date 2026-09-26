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
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
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
    expect(((await as(A, `select set_name('修士 Alpha') as n`)).rows[0] as any).n).toBe('修士 Alpha');
    await expect(as(null, `select set_name('Nobody')`)).rejects.toThrow(/not signed in/);
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

  it('where I stand, for the signed-in player only', async () => {
    const r = await as(A, `select my_standing() as s`);
    expect((r.rows[0] as any).s.name).toBe('修士 Alpha');
    const none = await as(null, `select my_standing() as s`);
    expect((none.rows[0] as any)?.s ?? null).toBe(null);
  });
});
