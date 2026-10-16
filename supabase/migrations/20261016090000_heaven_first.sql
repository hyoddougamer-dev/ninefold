-- 天 R0: the first under Heaven is the first on the Heaven List (docs/SEASON-RANKS.md, R0).
--
-- my_standing() (20261015100100_forerunner.sql) picked 天下第一 from every season row, while
-- board('climb') lists only the never-reborn (lives = 0, 20261011120000_samsara.sql). With
-- Samsara live, a reborn account whose account best was highest would have been told on 修 that
-- it wears 天下第一 while absent from the Heaven List, and the real first would see the crown on
-- its board row but not on its own screen. Now both read one rule: the same filters, the same
-- order, ties broken the same way.
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
    'forerunner', is_forerunner(p.id)
  )
  from profiles p
  left join standings s on s.user_id = p.id and in_season(s.updated_at)
  left join saves v on v.user_id = p.id and in_season(v.last_sync)
  where p.id = auth.uid()
$$;
grant execute on function public.my_standing() to anon, authenticated;
