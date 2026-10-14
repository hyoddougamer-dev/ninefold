# Push B, the Season 0 wipe: a draft

**NOT A MIGRATION. It needs Bruno's named rows.**

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
   - `saves` last synced before the switch (the closed-test cloud copies);
   - `titles` of weeks before the season's first;
   - `sync_log` from before the switch;
   - `panel_notes` from before the switch, only if he wants them gone (D5);
   - strikes and review flags reset for everyone not banned (D5). Bans stay.
2. **D3, the archive** (new, and it changes what "delete" may mean). The season's first sync
   of an account no longer keeps a deeper closed-test cloud copy, so Push A keeps it instead:
   the old copy moves to `saves.closed_test` (with `closed_test_at`) once, by the trigger
   `saves_keep_closed_test`. Two kinds of row hold a closed-test cultivator after the switch:
   - accounts that synced in the season: `closed_test`, on a row Push B does **not** delete
     (its `last_sync` is past the cutoff);
   - accounts that never came back: `latest`, on a row Push B **does** delete.

   If Bruno wants a server archive (so a player whose only copy was in the cloud can still
   take it out), it is copied from both into an archive table in the same block, before any
   delete. If he does not, `closed_test` is cleared in Push B as well, and named as such.
3. **The brake number.** Bruno reads the player count on `/painel/` (the top half, `stats()`)
   the day before; the brake is that number plus a margin. Over it, nothing is deleted and
   the run fails so someone can look.
4. **Pinned and rebasing rows** (new). `saves_pin()` rewrites `latest` on any update of a
   pinned or rebasing row (`20261006080000_rekaris_as_is.sql`). Deleting a row never fires it,
   so the plan's rule stands: delete, never update. Any row that survives (synced in the
   season) and still carries `pinned` or `rebase` from the closed test has them set to false,
   if Bruno names that.

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

  -- (D3, only if Bruno chose an archive) copy closed_test and the pre-cutoff latest out first, here.

  delete from public.standings   where updated_at < cutoff;
  delete from public.saves       where last_sync  < cutoff;
  delete from public.titles      where week < public.week_of(cutoff);
  delete from public.sync_log    where at < cutoff;
  delete from public.panel_notes where updated_at < cutoff;                 -- only if named (D5)
  update public.saves set closed_test = null, closed_test_at = null
   where closed_test is not null;                                           -- only if named (D3)
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
- `profiles` and `barred` are whole, and a banned player is still banned;
- the brake raises over its number, and deletes nothing;
- the block raises when run before the cutoff;
- it returns at once on an empty database (the test runs every migration on one).

Then `supabase.yml` runs `tools/ranked.ts` after the deploy, which is the first live run of
the season half of the attacks if Push A went out before the switch.
