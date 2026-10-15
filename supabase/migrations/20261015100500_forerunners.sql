-- 先行 Those who walked before: every Forerunner's name, for the foot of the Cliff.
--
-- docs/SEASON0-THEME.md, 2c and 2d (item 5): "At the foot of the Cliff: 先行 Those who walked
-- before, every Forerunner's name with no numbers." cliff() only carries the names carved in
-- a gate's first 81, so a tester who never reaches one (most of them, by December) would be
-- missing from the foot. This is the whole list: names only, never an id, never a number,
-- in the order of the names themselves so that nothing in it reads as a rank.
--
-- Who is on it is is_forerunner() exactly (not banned, not staff, the stamp or a sync from
-- before the switch), less those held for review, as every board leaves them off. Before the
-- switch that is everyone who has synced; the screen that shows it is a season screen.
-- Anybody may read it, as anybody reads the boards and the Cliff.
create or replace function public.forerunners()
returns table (name text)
language sql stable security definer set search_path = public, pg_temp as $$
  select p.name
    from public.profiles p
   where not p.suspect and public.is_forerunner(p.id)
   order by lower(p.name), p.name
   limit 5000
$$;
revoke all on function public.forerunners() from public;
grant execute on function public.forerunners() to anon, authenticated;
