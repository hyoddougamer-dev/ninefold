-- 題名崖 The Cliff of Names: the first 81 through each gate, carved for ever.
--
-- docs/SEASON0-THEME.md, 2c and 2f (Push A2). Nine columns, one per gate. Gates 1 to 8 are
-- the gates out of realms 1 to 8, each named for the warden who guards it; a cultivator is
-- through gate r when the server sees them in realm r+1, which is standings.climb >= 9 * r
-- (climb is layers opened, (realm - 1) * 9 + layer). Gate 9 is the Dragon: the first
-- tribulation crossed, standings.marks >= 1. The words say "through the gate", never "broke
-- the warden": from realm 5 the gate stays sealed for a day or two after the warden falls.
--
-- What is stored is every arrival, not only the first 81, with the server's clock at the sync
-- that first showed it. So the read, cliff(), can skip whoever is held for review or banned:
-- a player held drops off until cleared, then comes back at the original time. A carving is
-- written once and never rewritten (primary key, insert on conflict do nothing), and nothing
-- here ever updates or deletes a row: only an account's own deletion takes its carvings, with
-- the account (on delete cascade).
--
-- The trigger does nothing before season_start(), so the closed test carves nothing, and it
-- only reads a row the season wrote (updated_at in the season, which the sync sets to its own
-- now on every write), so a one-off statement over old rows after the switch carves nothing
-- either. A later season, or a Hundred side life, must never write here: the Cliff is
-- Season 0's, for good.
--
-- No client can write firsts: row level security on, no policy, every grant revoked, and the
-- trigger function revoked from every role that could call it.
create table if not exists public.firsts (
  gate     smallint not null check (gate between 1 and 9),
  user_id  uuid not null references auth.users on delete cascade,
  at       timestamptz not null default now(),
  primary key (gate, user_id)
);
create index if not exists firsts_gate_at on public.firsts (gate, at, user_id);
alter table public.firsts enable row level security;
revoke all on public.firsts from public, anon, authenticated;

create or replace function public.standings_carve()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if now() < public.season_start() or not coalesce(new.updated_at >= public.season_start(), false) then
    return null;
  end if;
  insert into public.firsts (gate, user_id, at)
  select g::smallint, new.user_id, now()
    from generate_series(1, 9) g
   where (g <= 8 and new.climb >= 9 * g) or (g = 9 and new.marks >= 1)
  on conflict do nothing;
  return null;
end $$;
revoke all on function public.standings_carve() from public, anon, authenticated;
drop trigger if exists standings_carve on public.standings;
create trigger standings_carve after insert or update on public.standings
  for each row execute function public.standings_carve();

-- 讀 The Cliff as the screen draws it: for each gate, the first 81 by the time they were seen
-- through it (ties by id, so the order never moves), skipping the banned, those held for
-- review (suspect, as every board skips them) and staff. rank counts 1 to 81 after the
-- skipping. Names only, never an id; forerunner so the foot of the Cliff and every carved name
-- can wear 先行.
create or replace function public.cliff()
returns table (gate smallint, rank int, name text, at timestamptz, forerunner boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select x.gate, x.r::int, x.name, x.at, public.is_forerunner(x.user_id)
    from (
      select f.gate, f.user_id, f.at, p.name,
             row_number() over (partition by f.gate order by f.at asc, f.user_id asc) as r
        from public.firsts f join public.profiles p on p.id = f.user_id
       where not p.banned and not p.suspect and not p.staff
    ) x
   where x.r <= 81
   order by x.gate, x.r
$$;
revoke all on function public.cliff() from public;
grant execute on function public.cliff() to anon, authenticated;
