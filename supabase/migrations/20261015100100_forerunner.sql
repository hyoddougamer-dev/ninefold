-- 先行 Forerunner: the mark of having walked the closed test (Bruno, 2026-10-15).
--
-- docs/SEASON0-THEME.md, 2d. One mark, the same for everyone, for good, and purely cosmetic: it
-- changes no number. It is its own column on the boards, never the title, so it sits beside
-- 天下第一 or 期首 instead of replacing them. Always the two glyphs 先行, never 先 alone (that
-- reads "the late" before a name).
--
-- Who wears it: an account that is not banned and not staff, and that either carries
-- profiles.forerunner or has at least one sync_log row from before season_start(), whatever
-- its ok. ok is the raw verdict, logged before the closed test's leniency turned a refused
-- save into an accepted one, so a tester who was on the boards may have only ok = false rows.
-- sync_log only grows (only delete_me(), the player's own button, takes a player's rows), so
-- the set is closed at the switch: nothing written after it can add to it.
--
-- profiles.forerunner is for Push B: its first statement stamps the column from this same
-- expression for every account, and only then deletes the old sync_log rows, so the one
-- expression below is right before Push B and after it (docs/SEASON0-PUSHB-DRAFT.md).
--
-- profiles.staff marks the developer's own ranked account, if he chooses: off the Cliff and
-- never a Forerunner. It is set only through panel_set_staff() behind the panel key
-- (20261015100300_panel_staff.sql), never by an id or a name in this public repository.
--
-- No client writes either column: profiles has row level security, no policy, and every
-- grant on it revoked (20260926000000_ranked.sql). set_name() writes the name alone.
alter table public.profiles
  add column if not exists forerunner boolean not null default false,
  add column if not exists staff      boolean not null default false;

create or replace function public.is_forerunner(uid uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((
    select not p.banned and not p.staff
           and (p.forerunner
                or exists (select 1 from public.sync_log l
                            where l.user_id = p.id and l.at < public.season_start()))
      from public.profiles p
     where p.id = uid), false)
$$;
-- Read inside the boards, which run as their owner. Nobody calls it from outside: an id is
-- not something a player is ever handed.
revoke all on function public.is_forerunner(uuid) from public, anon, authenticated;

-- 榜 The boards, as 20261014130000_season0.sql left them (every filter kept: suspects and the
-- banned off, the season's rows only, the week and the tower and the never-reborn as before),
-- with one column more. A table's columns cannot change under create or replace, so each is
-- dropped and made again, with its grants.
drop function if exists public.board(text, int);
create function public.board(kind text, lim int default 100)
returns table (rank bigint, name text, climb int, marks int, tower int, gain int, title text, me boolean,
               calling text, forerunner boolean)
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
       and in_season(s.updated_at)
       and (kind <> 'week' or (s.week = week_of() and s.climb + s.marks > s.week_from))
       and (kind <> 'tower' or s.tower > 0)
       and (kind <> 'climb' or s.lives = 0)
  )
  select r, name, climb, marks, tower, (climb + marks - week_from) as gain,
         case when kind = 'climb' and r = 1 then '天下第一' else title_of(user_id) end,
         user_id = auth.uid(),
         calling,
         is_forerunner(user_id)
    from live
   where r <= least(greatest(lim, 1), 200) or user_id = auth.uid()
   order by r
$$;
revoke all on function public.board(text, int) from public;
grant execute on function public.board(text, int) to anon, authenticated;

drop function if exists public.samsara_board(int);
create function public.samsara_board(lim int default 100)
returns table (rank bigint, name text, climb int, marks int, tower int, gain int, title text, me boolean,
               calling text, forerunner boolean)
language sql stable security definer set search_path = public as $$
  with live as (
    select s.user_id, s.calling, s.samsara_climb as climb, s.samsara_marks as marks, p.name,
           row_number() over (order by s.samsara_climb desc, s.samsara_marks desc, s.samsara_at asc) as r
      from standings s join profiles p on p.id = s.user_id
     where not p.suspect and not p.banned
       and in_season(s.updated_at)
       and s.lives > 0
  )
  select r, name, climb, marks, 0, 0, title_of(user_id), user_id = auth.uid(), calling, is_forerunner(user_id)
    from live
   where r <= least(greatest(lim, 1), 200) or user_id = auth.uid()
   order by r
$$;
revoke all on function public.samsara_board(int) from public;
grant execute on function public.samsara_board(int) to anon, authenticated;

-- 我 Where I stand, as 20261014130000_season0.sql left it, and whether I wear 先行. The season
-- card asks this once, signed in, to say "Your name now carries 先行 Forerunner" or nothing.
create or replace function public.my_standing()
returns jsonb language sql stable security definer set search_path = public as $$
  with first as (
    select s.user_id from standings s join profiles p on p.id = s.user_id
     where not p.suspect and not p.banned and in_season(s.updated_at)
     order by s.climb desc, s.marks desc, s.climbed_at asc
     limit 1
  )
  select jsonb_build_object(
    'name', p.name, 'suspect', p.suspect, 'banned', p.banned,
    'climb', s.climb, 'marks', s.marks, 'tower', s.tower,
    'verified_at', case when in_season(v.verified_at) then v.verified_at end, 'latest_at', v.latest_at,
    'title', case when exists (select 1 from first where user_id = p.id) then '天下第一' else title_of(p.id) end,
    'forerunner', is_forerunner(p.id)
  )
  from profiles p
  left join standings s on s.user_id = p.id and in_season(s.updated_at)
  left join saves v on v.user_id = p.id and in_season(v.last_sync)
  where p.id = auth.uid()
$$;
grant execute on function public.my_standing() to anon, authenticated;
