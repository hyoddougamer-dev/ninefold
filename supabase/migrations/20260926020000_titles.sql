-- 冠 Where I stand now also says the title I wear, including the live one: the first on
-- the Heaven List wears 天下第一 for as long as they are first, and the game shows it
-- beside the realm's name on 修, where the player looks every visit.
create or replace function public.my_standing()
returns jsonb language sql stable security definer set search_path = public as $$
  with first as (
    select s.user_id from standings s join profiles p on p.id = s.user_id
     where not p.suspect and not p.banned
     order by s.climb desc, s.marks desc, s.climbed_at asc
     limit 1
  )
  select jsonb_build_object(
    'name', p.name, 'suspect', p.suspect, 'banned', p.banned,
    'climb', s.climb, 'marks', s.marks, 'tower', s.tower,
    'verified_at', v.verified_at, 'latest_at', v.latest_at,
    'title', case when exists (select 1 from first where user_id = p.id) then '天下第一' else title_of(p.id) end
  )
  from profiles p left join standings s on s.user_id = p.id left join saves v on v.user_id = p.id
  where p.id = auth.uid()
$$;
grant execute on function public.my_standing() to anon, authenticated;
