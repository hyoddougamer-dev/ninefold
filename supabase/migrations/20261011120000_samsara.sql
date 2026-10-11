-- 輪迴 The Samsara board: the cultivators who have reborn, by the life they are living now.
--
-- Decided 2026-10-11 (docs/DRAWER.md, 轉世 Rebirth, "Heaven record (poll 1), option C"):
--   - Heaven (天榜) lists only cultivators who have never reborn. One who has is no longer
--     listed there, and the Heaven values already stored for them are kept, never deleted.
--   - Samsara (輪迴榜) lists cultivators who have reborn at least once, ranked by the climb of
--     the life they are living now (its layers, then its marks past the summit). A rebirth
--     sets that record back to where the new life begins, so it reflects one life only.
--   - The weekly board (期榜) and the tower (塔榜) are not changed by this migration.
--   - The Samsara board is hidden in the game until the first rebirth, and has no title for
--     its first place and no tower.
--
-- Written only by the sync function, from the verified save (supabase/functions/sync/core.ts).
-- A player never sends lives or the record, and no policy lets one write them.

alter table public.standings
  add column if not exists lives          int not null default 0,  -- lives the verified save has lived through, never fewer
  add column if not exists samsara_climb  int not null default 0,  -- layers opened in the life being lived now
  add column if not exists samsara_marks  int not null default 0,  -- marks past the summit in the life being lived now
  add column if not exists samsara_at     timestamptz not null default now();  -- when that record last rose: earlier wins a tie

-- A cultivator who reborn before this migration leaves Heaven now, not at their next sync.
-- Read from the verified copy only. layersOpened() is (realm - 1) * 9 + layer (sim/state.ts),
-- with 9 the layers in a realm (LAYERS_PER_REALM in sim/balance.ts).
update public.standings s
   set lives         = x.lives,
       samsara_climb = x.climb,
       samsara_marks = x.marks,
       samsara_at    = x.at
  from (
    select v.user_id,
           jsonb_array_length(v.verified -> 'lives')::int as lives,
           ((coalesce((v.verified ->> 'realm')::numeric, 1)::int - 1) * 9
             + coalesce((v.verified ->> 'layer')::numeric, 0)::int) as climb,
           coalesce((v.verified ->> 'tribulation')::numeric, 0)::int as marks,
           coalesce(v.verified_at, now()) as at
      from public.saves v
     where jsonb_typeof(v.verified -> 'lives') = 'array'
       and jsonb_array_length(v.verified -> 'lives') > 0
  ) x
 where s.user_id = x.user_id;

-- 天 The Heaven List is the cultivators who have never reborn. The only change to board() is
-- that filter, and it applies to 'climb' alone: the weekly board and the tower read as before.
create or replace function public.board(kind text, lim int default 100)
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
       and (kind <> 'climb' or s.lives = 0)
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

-- 輪迴 The Samsara board: the same columns as board(), so the screen reads both alike, but the
-- numbers are the record of the life being lived (samsara_climb, samsara_marks). No title is
-- worn for the first place: 天下第一 belongs to the Heaven List alone. The tower and the week's
-- gain are not Samsara's to show, so they come back as zero.
create or replace function public.samsara_board(lim int default 100)
returns table (rank bigint, name text, climb int, marks int, tower int, gain int, title text, me boolean, calling text)
language sql stable security definer set search_path = public as $$
  with live as (
    select s.user_id, s.calling, s.samsara_climb as climb, s.samsara_marks as marks, p.name,
           row_number() over (order by s.samsara_climb desc, s.samsara_marks desc, s.samsara_at asc) as r
      from standings s join profiles p on p.id = s.user_id
     where not p.suspect and not p.banned
       and s.lives > 0
  )
  select r, name, climb, marks, 0, 0, title_of(user_id), user_id = auth.uid(), calling
    from live
   where r <= least(greatest(lim, 1), 200) or user_id = auth.uid()
   order by r
$$;
revoke all on function public.samsara_board(int) from public;
grant execute on function public.samsara_board(int) to anon, authenticated;
