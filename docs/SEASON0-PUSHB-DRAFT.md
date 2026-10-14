# Push B, the Season 0 wipe: a draft

**NOT A MIGRATION. It needs Bruno's named rows.**

**It never deletes `saves.closed_test` or `saves.closed_test_at`.** Bruno chose option 1 on
2026-10-14: the closed-test copy the server keeps is readable by its own player
(`closed_test_mine()`, `supabase/migrations/20261014190000_closed_test_mine.sql`), so a player
whose only copy was in the cloud still gets it back. Push B may clear every other column of a
`saves` row, but it never deletes a `saves` row that holds a closed-test cultivator, and it
never clears those two columns.

This is text, kept in `docs/` on purpose, so that no workflow can ever run it. It becomes a
file in `supabase/migrations/` only after Bruno has said, in his own message, which tables
and which rows go (CLAUDE.md: *"Deleting real rows on the live database is refused by the
safety check unless Bruno asks for it by name and the migration is scoped to exactly what he
asked for"*). His words go into its header verbatim, with the date and the UTC time. If he
names fewer tables than below, the others stay. Nothing here fills a gap he left.

The plan is `docs/SEASON0-PLAN.md`, section 3.4. What changed since it was written is marked
**new** below.

## Why there is no hurry

Push A (the release) already makes the switch harmless without deleting anything:

- `supabase/functions/sync/core.ts` turns a closed-test save away from `SEASON_START` on
  (409, nothing written), and reads every row written before the switch as absent.
- `supabase/migrations/20261014130000_season0.sql` makes the boards, the titles, where I
  stand and the panel read only rows written since `season_start()`.

So Push B changes nothing a player sees. It tidies the database, and it can wait for Bruno.

## Before it is written

1. **Bruno names the rows** in his own words. The candidates, from the plan:
   - `standings` last written before the switch;
   - `saves` last synced before the switch (the closed-test cloud copies): **cleared, never
     deleted**. Their `latest` moves to `closed_test` first (see D3 below);
   - `titles` of weeks before the season's first;
   - `sync_log` from before the switch;
   - `panel_notes` from before the switch, only if he wants them gone (D5);
   - strikes and review flags reset for everyone not banned (D5). Bans stay.
2. **D3, the archive: decided, option 1 (Bruno, 2026-10-14).** The season's first sync of an
   account no longer keeps a deeper closed-test cloud copy, so Push A keeps it instead: the
   old copy moves to `saves.closed_test` (with `closed_test_at`) once, by the trigger
   `saves_keep_closed_test`, and its own player reads it back through `closed_test_mine()`.
   Two kinds of row hold a closed-test cultivator after the switch:
   - accounts that synced in the season: `closed_test`, on a row Push B leaves whole
     (its `last_sync` is past the cutoff);
   - accounts that never came back: `latest`, on a row last synced before the cutoff.
     `closed_test_mine()` already hands this `latest` back as the copy, so Push B must not
     delete these rows: it moves `latest` to `closed_test` first, then clears the rest.

   `closed_test` and `closed_test_at` are never cleared, and no `saves` row holding a
   closed-test cultivator is ever deleted. Only `delete_me()`, the player's own button,
   takes them, with the rest of the account.
3. **The brake number.** Bruno reads the player count on `/painel/` (the top half, `stats()`)
   the day before; the brake is that number plus a margin. Over it, nothing is deleted and
   the run fails so someone can look.
4. **Pinned and rebasing rows** (new). `saves_pin()` rewrites `latest` on any update of a
   pinned or rebasing row (`20261006080000_rekaris_as_is.sql`), but only while the new row
   still says `pinned` or `rebase`. The plan said "delete, never update"; for `saves` that rule
   now gives way to D3, because a deleted row would take its closed-test copy with it. The
   clearing update sets `pinned` and `rebase` to false in the same statement, which is what
   keeps `saves_pin()` out of it. Every other table is still deleted, never updated. Any row
   that survives (synced in the season) and still carries `pinned` or `rebase` from the closed
   test has them set to false, if Bruno names that.

## The draft itself

```
-- 季 Season 0. Bruno, <date, UTC time>: "<his words, verbatim, naming each table below>"
do $$
declare
  cutoff constant timestamptz := '2026-10-26T00:00:00Z';   -- season_start(), SEASON_START 1792972800
  brake  constant int := <Bruno's player count from the panel, plus a margin>;
  hits int;
begin
  if now() < cutoff then raise exception 'season 0 wipe: the season has not begun'; end if;
  if cutoff <> public.season_start() then raise exception 'season 0 wipe: the cutoff is not season_start()'; end if;
  select count(*) into hits from public.standings where updated_at < cutoff;
  if hits = 0 and not exists (select 1 from public.saves where last_sync < cutoff) then return; end if;
  if hits > brake then
    raise exception 'season 0 wipe: % standings predate the season, more than %; nothing deleted', hits, brake;
  end if;

  -- (D3, option 1) The closed-test copies are kept, never deleted. A row last synced before
  -- the cutoff holds its copy in latest: move it to closed_test (only where none is kept yet),
  -- then clear the rest of the row. pinned and rebase go false in the same statement, so
  -- saves_pin() cannot put latest back. latest is not null, so it becomes an empty object,
  -- which closed_test_mine() never hands back.
  update public.saves
     set closed_test    = coalesce(closed_test, latest),
         closed_test_at = case when closed_test is null then latest_at else closed_test_at end,
         latest = '{}'::jsonb, verified = null, verified_at = null,
         day_state = null, day_at = null, week_state = null, week_at = null,
         pinned = false, rebase = false
   where last_sync < cutoff;

  delete from public.standings   where updated_at < cutoff;
  delete from public.titles      where week < public.week_of(cutoff);
  delete from public.sync_log    where at < cutoff;
  delete from public.panel_notes where updated_at < cutoff;                 -- only if named (D5)
  update public.saves set pinned = false, rebase = false
   where pinned or rebase;                                                  -- only if named
  update public.profiles set strikes = 0, suspect = false
   where not banned and (strikes > 0 or suspect);                           -- only if named (D5)
  raise notice 'season 0 wipe: % standings from the closed test removed', hits;
end $$;
```

What stays, whatever is named: `profiles` (names and accounts, plan 3.3), `barred` ("a fresh
start for the boards is not an amnesty for a cheat"), `auth.users`, `sync_turns`, `pulse`
and `meta`.

## The test that comes with it

In `src/sim/__tests__/schema.test.ts`, as for `20260928210000_fresh_start.sql`: seed
closed-test rows and season rows in PGlite, move `season_start()` into the past as the
season test there already does, run the Push B file's text, and check that:

- only rows from before the cutoff went, and every season row is whole;
- every closed-test cultivator is still there: a pre-cutoff `saves` row is cleared, not
  deleted, its old `latest` is now its `closed_test`, a season row's `closed_test` and
  `closed_test_at` are unchanged, and `closed_test_mine()` hands each player the same copy
  after the block as before it;
- `profiles` and `barred` are whole, and a banned player is still banned;
- the brake raises over its number, and deletes nothing;
- the block raises when run before the cutoff;
- it returns at once on an empty database (the test runs every migration on one).

Then `supabase.yml` runs `tools/ranked.ts` after the deploy, which is the first live run of
the season half of the attacks if Push A went out before the switch.
