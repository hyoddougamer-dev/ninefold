-- 職 The class a player wears, beside their standing, so the boards can show it.
--
-- Written only by the sync function, from the same verified save the standing comes from
-- (src/sim/schools.ts callingKey): a school and its step, "sword:2", or one of the ten
-- pairs by its key, "wargod". Null when no school has woken.

alter table public.standings add column if not exists calling text;

-- The board returns one more column. A function's result type cannot be changed in
-- place, so it is dropped and made again, with the same grant.
drop function if exists public.board(text, int);
create function public.board(kind text, lim int default 100)
returns table (rank bigint, name text, climb int, marks int, tower int, gain int, title text, me boolean, calling text)
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
         user_id = auth.uid(),
         calling
    from live
   where r <= least(greatest(lim, 1), 200) or user_id = auth.uid()
   order by r
$$;
grant execute on function public.board(text, int) to anon, authenticated;
