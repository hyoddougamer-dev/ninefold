-- 榜 Ninefold ranked: profiles, cloud saves, verified standings, weekly titles.
--
-- The rule this schema is built on: **no client ever writes a number that is ranked.**
-- Every table here has row level security on and no policy that lets a player write to
-- it. The only way in is the `sync` Edge Function, which holds the service role, runs the
-- save through sim/verify.ts against the server's own clock, and writes what verified.
-- A player can read the boards, read their own standing, and choose a name. Nothing else.

create extension if not exists pgcrypto;

-- 期 The game's week, the same arithmetic as sim/week.ts weekOf(): Monday 00:00 UTC.
create or replace function public.week_of(t timestamptz default now())
returns int language sql immutable as $$
  select greatest(0, floor((extract(epoch from t) + 259200) / 604800))::int
$$;

-- 名 Who a player is on the boards. The row is created by the sync function on the first
-- sync; the name is the one thing a player may change, and only through set_name().
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text not null check (char_length(name) between 2 and 20),
  created_at  timestamptz not null default now(),
  strikes     int not null default 0,     -- impossibilities (see sim/verify.ts): never shown
  suspect     boolean not null default false, -- faster than anybody honest: off the boards until looked at
  banned      boolean not null default false
);
create unique index if not exists profiles_name_ci on public.profiles (lower(name));

-- 存 The cloud copy, and the last copy that verified. They are different on purpose: the
-- cloud keeps whatever the phone last had, so nothing is lost on a new device, and the
-- ranking only ever moves on what verified.
create table if not exists public.saves (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  latest       jsonb not null,
  latest_at    timestamptz not null default now(),
  verified     jsonb,
  verified_at  timestamptz,
  last_sync    timestamptz not null default now()
);

-- 榜 What the boards read. Written only by the sync function, from verified saves.
create table if not exists public.standings (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  climb       int not null default 0,   -- layers opened, 0..80
  marks       int not null default 0,   -- 雷印 thunder marks past the summit
  tower       int not null default 0,   -- 塔 highest floor
  climbed_at  timestamptz not null default now(),  -- when climb or marks last rose: earlier wins a tie
  tower_at    timestamptz not null default now(),
  week        int not null default public.week_of(),
  week_from   int not null default 0,   -- climb + marks when this week began
  updated_at  timestamptz not null default now()
);

-- 記 Every sync, kept for review. Nothing reads it but a person looking for a cheat.
create table if not exists public.sync_log (
  id       bigserial primary key,
  user_id  uuid not null,
  at       timestamptz not null default now(),
  ok       boolean not null,
  why      text[] not null default '{}',
  pace     real,
  strike   boolean not null default false,
  suspect  boolean not null default false
);
create index if not exists sync_log_user on public.sync_log (user_id, at desc);

-- 冠 Last week's winners, closed once and kept. A title is worn for the week after.
create table if not exists public.titles (
  week     int not null,
  board    text not null,
  rank     int not null,
  user_id  uuid not null,
  name     text not null,
  primary key (week, board, rank)
);

-- 期 Which week was closed last, so a new week is closed exactly once.
create table if not exists public.meta (
  key   text primary key,
  value int not null
);

alter table public.meta      enable row level security;
alter table public.profiles  enable row level security;
alter table public.saves     enable row level security;
alter table public.standings enable row level security;
alter table public.sync_log  enable row level security;
alter table public.titles    enable row level security;

-- Nobody reads or writes these tables directly. The functions below are the doors.
revoke all on public.profiles, public.saves, public.standings, public.sync_log, public.titles, public.meta
  from anon, authenticated;

-- 名 Choosing a name: two to twenty letters, digits, spaces or CJK, unique regardless of
-- case, and only for yourself. Returns the name as stored, or raises.
create or replace function public.set_name(new_name text)
returns text language plpgsql security definer set search_path = public as $$
declare clean text := btrim(regexp_replace(coalesce(new_name, ''), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if char_length(clean) < 2 or char_length(clean) > 20 then raise exception 'name length'; end if;
  if clean !~ '^[[:alnum:] _\-\.㐀-鿿]+$' then raise exception 'name characters'; end if;
  insert into profiles (id, name) values (auth.uid(), clean)
    on conflict (id) do update set name = excluded.name;
  return clean;
exception when unique_violation then
  raise exception 'name taken';
end $$;

-- 冠 The title a player wears this week, from last week's closed boards, plus the live
-- one for standing first on the Heaven List.
create or replace function public.title_of(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select case when t.rank = 1 then '期首' when t.rank <= 10 then '期十' else '期百' end
       from titles t where t.user_id = uid and t.week = week_of() - 1 and t.board = 'week'
       order by t.rank limit 1),
    null)
$$;

-- 榜 The boards. Suspects and the banned are left off; ties go to whoever got there first.
create or replace function public.board(kind text, lim int default 100)
returns table (rank bigint, name text, climb int, marks int, tower int, gain int, title text, me boolean)
language sql stable security definer set search_path = public as $$
  with live as (
    select s.*, p.name,
           case kind
             when 'tower' then row_number() over (order by s.tower desc, s.tower_at asc)
             when 'week'  then row_number() over (order by (s.climb + s.marks - s.week_from) desc, s.climbed_at asc)
             else row_number() over (order by s.climb desc, s.marks desc, s.climbed_at asc)
           end as r
      from standings s join profiles p on p.id = s.user_id
     where not p.suspect and not p.banned
       and (kind <> 'week' or (s.week = week_of() and s.climb + s.marks > s.week_from))
       and (kind <> 'tower' or s.tower > 0)
  )
  select r, name, climb, marks, tower, (climb + marks - week_from) as gain,
         case when kind = 'climb' and r = 1 then '天下第一' else title_of(user_id) end,
         user_id = auth.uid()
    from live
   where r <= least(greatest(lim, 1), 200) or user_id = auth.uid()
   order by r
$$;

-- 我 Where the signed-in player stands on each board, and whether the ranking is behind.
create or replace function public.my_standing()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', p.name, 'suspect', p.suspect, 'banned', p.banned,
    'climb', s.climb, 'marks', s.marks, 'tower', s.tower,
    'verified_at', v.verified_at, 'latest_at', v.latest_at,
    'title', title_of(p.id)
  )
  from profiles p left join standings s on s.user_id = p.id left join saves v on v.user_id = p.id
  where p.id = auth.uid()
$$;

-- 閉 Close a finished week: its top hundred keep their places for the week after. Called by
-- the sync function the first time it sees a new week, and safe to call any number of times.
create or replace function public.close_week(w int)
returns void language sql security definer set search_path = public as $$
  insert into meta (key, value) values ('closed_week', w)
    on conflict (key) do update set value = greatest(meta.value, excluded.value);
  insert into titles (week, board, rank, user_id, name)
  select w, 'week', r, user_id, name from (
    select s.user_id, p.name,
           row_number() over (order by (s.climb + s.marks - s.week_from) desc, s.climbed_at asc) r
      from standings s join profiles p on p.id = s.user_id
     where s.week = w and s.climb + s.marks > s.week_from and not p.suspect and not p.banned
  ) x where r <= 100
  on conflict do nothing
$$;

revoke all on function public.close_week(int) from anon, authenticated, public;
grant execute on function public.set_name(text), public.board(text, int), public.my_standing(), public.title_of(uuid)
  to anon, authenticated;
