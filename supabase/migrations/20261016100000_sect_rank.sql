-- 位 R1: the sect rank, from Outer Disciple to Ancestor (docs/SEASON-RANKS.md, section 3).
--
-- Derived, never stored: rung_of(climb + marks) of the account's verified bests on standings,
-- which only the sync writes and which only rise. Shown from the season's first second
-- (rung_on()), and only on season rows; before it every rung reads null, so this ships dormant.
-- A held or banned account wears none and counts in none. Thresholds mirror RUNG_AT in
-- src/sim/balance.ts; the schema test holds the two equal for every score from 0 to 120.

-- 時 When sect ranks show. One line, so the switch (or a later week) is one migration away.
create or replace function public.rung_on()
returns boolean language sql stable set search_path = public, pg_temp as $$
  select now() >= public.season_start()
$$;

-- 位 The rung for a score: 0 Outer Disciple .. 8 Ancestor. RUNG_AT less its leading 0.
create or replace function public.rung_of(score int)
returns smallint language sql immutable set search_path = public, pg_temp as $$
  select count(*)::smallint from unnest(array[9, 27, 45, 63, 81, 85, 90, 100]) t where coalesce(score, 0) >= t
$$;

drop function if exists public.board(text, int);
create function public.board(kind text, lim int default 100)
returns table (rank bigint, name text, climb int, marks int, tower int, gain int, title text, me boolean,
               calling text, forerunner boolean, rung smallint)
language sql stable security definer set search_path = public, pg_temp as $$
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
         is_forerunner(user_id),
         case when rung_on() then rung_of(climb + marks) end
    from live
   where r <= least(greatest(lim, 1), 200) or user_id = auth.uid()
   order by r
$$;
revoke all on function public.board(text, int) from public;
grant execute on function public.board(text, int) to anon, authenticated;

-- 輪迴 The Samsara board ranks the life being lived; the rung is the account's, which a rebirth
-- never lowers.
drop function if exists public.samsara_board(int);
create function public.samsara_board(lim int default 100)
returns table (rank bigint, name text, climb int, marks int, tower int, gain int, title text, me boolean,
               calling text, forerunner boolean, rung smallint)
language sql stable security definer set search_path = public, pg_temp as $$
  with live as (
    select s.user_id, s.calling, s.samsara_climb as climb, s.samsara_marks as marks, p.name,
           s.climb + s.marks as best,
           row_number() over (order by s.samsara_climb desc, s.samsara_marks desc, s.samsara_at asc) as r
      from standings s join profiles p on p.id = s.user_id
     where not p.suspect and not p.banned
       and in_season(s.updated_at)
       and s.lives > 0
  )
  select r, name, climb, marks, 0, 0, title_of(user_id), user_id = auth.uid(), calling, is_forerunner(user_id),
         case when rung_on() then rung_of(best) end
    from live
   where r <= least(greatest(lim, 1), 200) or user_id = auth.uid()
   order by r
$$;
revoke all on function public.samsara_board(int) from public;
grant execute on function public.samsara_board(int) to anon, authenticated;

-- 我 Where I stand, as 20261016090000_heaven_first.sql left it, with my rung (none while held)
-- and where the Cliff carved me, read exactly as cliff() reads it, for the one rise card.
create or replace function public.my_standing()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with first as (
    select s.user_id from standings s join profiles p on p.id = s.user_id
     where not p.suspect and not p.banned and in_season(s.updated_at) and s.lives = 0
     order by s.climb desc, s.marks desc, s.climbed_at asc
     limit 1
  )
  select jsonb_build_object(
    'name', p.name, 'suspect', p.suspect, 'banned', p.banned,
    'climb', s.climb, 'marks', s.marks, 'tower', s.tower,
    'verified_at', case when in_season(v.verified_at) then v.verified_at end, 'latest_at', v.latest_at,
    'title', case when exists (select 1 from first where user_id = p.id) then '天下第一' else title_of(p.id) end,
    'forerunner', is_forerunner(p.id),
    'rung', case when rung_on() and s.user_id is not null and not p.suspect and not p.banned
                 then rung_of(s.climb + s.marks) end,
    'carved', case when now() >= season_start() then coalesce((
      select jsonb_agg(jsonb_build_object('gate', x.gate, 'rank', x.r) order by x.gate)
        from (select f.gate, f.user_id,
                     row_number() over (partition by f.gate order by f.at asc, f.user_id asc) as r
                from firsts f join profiles q on q.id = f.user_id
               where not q.banned and not q.suspect and not q.staff) x
       where x.user_id = p.id and x.r <= 81), '[]'::jsonb) end
  )
  from profiles p
  left join standings s on s.user_id = p.id and in_season(s.updated_at)
  left join saves v on v.user_id = p.id and in_season(v.last_sync)
  where p.id = auth.uid()
$$;
grant execute on function public.my_standing() to anon, authenticated;

-- 位階 How many hold each rung: counts only, never a name or an id. Zeros before the switch.
create or replace function public.rungs()
returns table (rung smallint, players bigint)
language sql stable security definer set search_path = public, pg_temp as $$
  select g::smallint, count(x.user_id)
    from generate_series(0, 8) g
    left join (
      select s.user_id, rung_of(s.climb + s.marks) as k
        from standings s join profiles p on p.id = s.user_id
       where not p.suspect and not p.banned and in_season(s.updated_at) and rung_on()
    ) x on x.k = g
   group by g
   order by g
$$;
revoke all on function public.rungs() from public;
grant execute on function public.rungs() to anon, authenticated;

-- 名 The nine rank names are ranks, not names: refused as a whole name (spaces ignored, and the
-- simplified forms folded to the traditional), never as a part of one, so 長老鶴 stays a name.
-- set_name() as 20261015100400_name_mark.sql left it, with that one line more; cleanName() in
-- src/net/names.ts reads the same list. A name already chosen is not touched.
create or replace function public.set_name(new_name text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare clean text := btrim(regexp_replace(
  regexp_replace(normalize(coalesce(new_name, ''), NFKC), '[[:cntrl:]­​-‏‪-‮⁠-⁯﻿]', ' ', 'g'),
  '\s+', ' ', 'g'));
  was jsonb;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if char_length(clean) < 2 or char_length(clean) > 20 then raise exception 'name length'; end if;
  if clean !~ '^[A-Za-z0-9 _\-\.㐀-鿿]+$' then raise exception 'name characters'; end if;
  if clean ~ '(天下第一|期首|期十|期百|先行)' or clean like '修士%' then raise exception 'name reserved'; end if;
  if translate(replace(clean, ' ', ''), '门内传护长', '門內傳護長') in
     ('外門弟子', '內門弟子', '核心弟子', '真傳弟子', '護法', '長老', '峰主', '太上長老', '老祖') then
    raise exception 'name reserved';
  end if;
  was := public.barred_for(auth.uid());
  insert into profiles (id, name, strikes, suspect, banned)
    values (auth.uid(), clean, coalesce((was->>'strikes')::int, 0), coalesce((was->>'suspect')::boolean, false),
            coalesce((was->>'banned')::boolean, false))
    on conflict (id) do update set name = excluded.name;
  return clean;
exception when unique_violation then
  raise exception 'name taken';
end $$;
revoke all on function public.set_name(text) from public;
grant execute on function public.set_name(text) to anon, authenticated;
