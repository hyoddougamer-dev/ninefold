# Push B, the Season 0 wipe: a draft

**NOT A MIGRATION. It needs the developer's named rows.**

**Its first write stamps 先行 Forerunner on every account the closed test saw, and only then
does it delete anything.** The evidence for the mark is `sync_log`, and Push B deletes the old
`sync_log` rows, so the order is the whole point. A schema test holds it
(`src/sim/__tests__/schema.test.ts`, "the Push B draft").

**It keeps no closed-test save.** Decided 2026-10-15: the closed-test save does not stay. No
keepsake, no copy, no file, no restore (`docs/SEASON0-THEME.md`, 2d and 3). That reverses the
option 1 of 2026-10-14 that this draft used to protect: `closed_test_mine()` and the trigger
`saves_keep_closed_test` are retired before the switch
(`supabase/migrations/20261015100000_retire_closed_copy.sql`), nothing ever wrote to
`saves.closed_test`, and the `saves` rows last synced before the switch are deleted here like
every other closed-test row.

This is text, kept in `docs/` on purpose, so that no workflow can ever run it. It becomes a
file in `supabase/migrations/` only after the developer has said, in his own message, which tables
and which rows go (CLAUDE.md: *"Deleting real rows on the live database is refused by the
safety check unless [the developer] asks for it by name and the migration is scoped to exactly what he
asked for"*). His words go into its header verbatim, with the date and the UTC time. If he
names fewer tables than below, the others stay. Nothing here fills a gap he left. The
Forerunner stamp is not a deletion and is not his to name: it goes first in every version.

The plan is `docs/SEASON0-PLAN.md`, section 3.4.

## Why there is no hurry

Push A (the release) and Push A2 (the carving) already make the switch harmless without
deleting anything:

- `supabase/functions/sync/core.ts` turns a closed-test save away from `SEASON_START` on
  (409, nothing written), reads every row written before the switch as absent, and never
  hands a closed-test cloud copy back (`pullable()`).
- `supabase/migrations/20261014130000_season0.sql` makes the boards, the titles, where I
  stand and the panel read only rows written since `season_start()`.
- `is_forerunner()` (`20261015100100_forerunner.sql`) reads `profiles.forerunner` **or** a
  `sync_log` row from before `season_start()`, so the mark is right before Push B and after
  it, with no second switch.
- `firsts`, the Cliff of Names (`20261015100200_cliff.sql`), holds only rows carved in the
  season (its trigger is silent before `season_start()`). Push B never touches it.

So Push B changes nothing a player sees. It tidies the database, and it can wait for the developer.

## Before it is written

1. **The developer names the rows** in his own words. The candidates, from the plan:
   - `saves` last synced before the switch (the closed-test cloud copies, unreadable since the
     first second of the season): **deleted**;
   - `standings` last written before the switch;
   - `titles` of weeks before the season's first;
   - `sync_log` from before the switch (only after the stamp, below);
   - `panel_notes` from before the switch, only if he wants them gone (D5);
   - strikes and review flags reset for everyone not banned (D5). Bans stay;
   - the two empty columns `saves.closed_test` and `saves.closed_test_at`, dropped, only if
     he names them. Nothing reads or writes them.
2. **The Forerunner stamp** is not a choice: it is the first write of the block whatever he
   names, because without it, deleting `sync_log` would take the mark off every tester. It
   stamps from the same evidence `is_forerunner()` reads (a `sync_log` row before the cutoff,
   whatever its `ok`), on every account, banned and staff included: `is_forerunner()` leaves
   those two out when it reads, so a ban lifted later still gives the mark back. The result
   is that `is_forerunner(id)` answers the same for every account before the block and after
   it.
3. **The brake number.** The developer reads the player count on `/painel/` (the top half, `stats()`)
   the day before; the brake is that number plus a margin. Over it, nothing is deleted (the
   stamp included: the block is one transaction, and a raise undoes all of it) and the run
   fails so someone can look.
4. **Pinned and rebasing rows.** `saves_pin()` rewrites `latest` on an *update* of a pinned or
   rebasing row (`20261006080000_rekaris_as_is.sql`); a delete is not an update, so the
   closed-test rows go whole. A row synced in the season that still carries `pinned` or
   `rebase` from the closed test has them set to false, if the developer names that.

## The draft itself

```sql
-- 季 Season 0. The developer, <date, UTC time>: "<his words, verbatim, naming each table below>"
do $$
declare
  cutoff constant timestamptz := '2026-10-26T00:00:00Z';   -- season_start(), SEASON_START 1792972800
  brake  constant int := <the developer's player count from the panel, plus a margin>;
  hits int;
begin
  if now() < cutoff then raise exception 'season 0 wipe: the season has not begun'; end if;
  if cutoff <> public.season_start() then raise exception 'season 0 wipe: the cutoff is not season_start()'; end if;
  select count(*) into hits from public.standings where updated_at < cutoff;
  if hits = 0 and not exists (select 1 from public.saves where last_sync < cutoff)
     and not exists (select 1 from public.sync_log where at < cutoff) then return; end if;
  if hits > brake then
    raise exception 'season 0 wipe: % standings predate the season, more than %; nothing deleted', hits, brake;
  end if;

  -- 先行 First, before anything is deleted: profiles.forerunner from the evidence is_forerunner()
  -- reads, for every account. Afterwards is_forerunner(id) reads the same without the old rows.
  update public.profiles p set forerunner = true
   where not p.forerunner
     and exists (select 1 from public.sync_log l where l.user_id = p.id and l.at < cutoff);

  -- The closed test's rows. The cloud copies go whole: none is kept (decided 2026-10-15).
  delete from public.saves       where last_sync < cutoff;
  delete from public.standings   where updated_at < cutoff;
  delete from public.titles      where week < public.week_of(cutoff);
  delete from public.sync_log    where at < cutoff;
  delete from public.panel_notes where updated_at < cutoff;                 -- only if named (D5)
  update public.saves set pinned = false, rebase = false
   where pinned or rebase;                                                  -- only if named
  update public.profiles set strikes = 0, suspect = false
   where not banned and (strikes > 0 or suspect);                           -- only if named (D5)
  alter table public.saves drop column if exists closed_test,
                           drop column if exists closed_test_at;           -- only if named
  raise notice 'season 0 wipe: % standings from the closed test removed', hits;
end $$;
```

What stays, whatever is named: `profiles` (names and accounts, plan 3.3, now carrying
`forerunner`), `firsts` (the Cliff, all of it from the season), `barred` ("a fresh start for
the boards is not an amnesty for a cheat"), `auth.users`, `sync_turns`, `pulse` and `meta`.

## The test that comes with it

`src/sim/__tests__/schema.test.ts` already runs this block's text, with the cutoff moved to a
day ago (and `season_start()` with it) and the brake filled in, on seeded closed-test and
season rows. It checks that:

- the stamp is the block's first write, before any `delete`;
- `is_forerunner()` answers the same for every account before and after, a banned tester
  included, and a ban lifted afterwards gives the mark back;
- only rows from before the cutoff went (the closed-test `saves` rows among them), and every
  season row and every carving in `firsts` is whole;
- `profiles` are whole, and a banned player is still banned;
- the brake raises over its number and changes nothing, the stamp included;
- the block raises when run before the cutoff, and a second run changes nothing.

When it becomes a migration, the test runs the migration file instead of this text. Then
`supabase.yml` runs `tools/ranked.ts` after the deploy, which is the first live run of the
season half of the attacks if Push A went out before the switch.
