-- 季 Season 0, "The Seal Falls 落印": the boards switch on their own. Nothing is deleted.
--
-- docs/SEASON0-PLAN.md, section 3.2. The season is a time, not a deploy: at season_start()
-- the boards, the titles and the panel stop reading the closed test's rows, and before it
-- they read exactly as they always have. The rows themselves stay where they are. Deleting
-- them is Push B, written only when Bruno names them in his own words (CLAUDE.md), and its
-- draft is text in docs/SEASON0-PUSHB-DRAFT.md, never a migration here.
--
-- One column pair is added (saves.closed_test, below), so that the season's first sync of an
-- account does not overwrite the only closed-test copy it may have.
--
-- What "a season row" means, table by table:
--   standings  updated_at on or after season_start(). The sync writes every standing with
--              its own clock, and from the switch it only writes season saves.
--   saves      last_sync on or after season_start() for the row; verified_at for the
--              verified copy, which a season row may still carry from before (a first
--              season sync that is waiting keeps the old verified copy as it was).
--   titles     weeks from week_of(season_start()). The closed test's last week is still
--              closed and kept, as history, but nobody wears it into the season.
--   sync_log   at on or after season_start().
--
-- close_week() is not changed: it closes week w from the standings of week w, and a
-- standing of a season week can only have been written in the season.

-- 始 The same instant as SEASON_START in src/sim/season.ts (Monday 26 October 2026, 00:00
-- UTC). The schema test fails if the two ever differ. Stable, not immutable, so that no plan
-- folds it in as a constant.
create or replace function public.season_start()
returns timestamptz language sql stable set search_path = public as $$
  select to_timestamp(1792972800)
$$;

-- 季 Whether a row written at t belongs to what is read now: every row before the switch,
-- and from it only the rows written since. A missing time reads as written before.
create or replace function public.in_season(t timestamptz)
returns boolean language sql stable set search_path = public as $$
  select now() < public.season_start() or coalesce(t >= public.season_start(), false)
$$;

-- 存 The closed test's cloud copy, kept when the season first writes over it. From the
-- switch the sync no longer keeps a deeper closed-test copy over a season save (the cloud
-- copy "only moves forward" within one season, never across it), so the first season sync of
-- an account would overwrite the cultivator it held. That copy may be the only one a player
-- has (a lost phone, a new device: plan, "Promise check" 2), and whether the server keeps an
-- archive of them is Bruno's decision D3. Until he decides, nothing is lost: the row's old
-- copy moves to closed_test, once, as it stood. Nobody reads it yet; no player can.
alter table public.saves
  add column if not exists closed_test    jsonb,
  add column if not exists closed_test_at timestamptz;

create or replace function public.saves_keep_closed_test()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if now() >= season_start() and old.last_sync < season_start()
     and old.closed_test is null and new.closed_test is null then
    new.closed_test := old.latest;
    new.closed_test_at := old.latest_at;
  end if;
  return new;
end $$;
revoke all on function public.saves_keep_closed_test() from public, anon, authenticated;
drop trigger if exists saves_keep_closed_test on public.saves;
create trigger saves_keep_closed_test before update on public.saves
  for each row execute function public.saves_keep_closed_test();

-- 冠 The title worn this week: last week's, unless last week was the closed test's.
create or replace function public.title_of(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select case when t.rank = 1 then '期首' when t.rank <= 10 then '期十' else '期百' end
       from titles t where t.user_id = uid and t.week = week_of() - 1 and t.board = 'week'
        and (now() < season_start() or t.week >= week_of(season_start()))
       order by t.rank limit 1),
    null)
$$;

-- 榜 The boards, as 20261011120000_samsara.sql left them, reading season rows only.
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
       and in_season(s.updated_at)
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

create or replace function public.samsara_board(lim int default 100)
returns table (rank bigint, name text, climb int, marks int, tower int, gain int, title text, me boolean, calling text)
language sql stable security definer set search_path = public as $$
  with live as (
    select s.user_id, s.calling, s.samsara_climb as climb, s.samsara_marks as marks, p.name,
           row_number() over (order by s.samsara_climb desc, s.samsara_marks desc, s.samsara_at asc) as r
      from standings s join profiles p on p.id = s.user_id
     where not p.suspect and not p.banned
       and in_season(s.updated_at)
       and s.lives > 0
  )
  select r, name, climb, marks, 0, 0, title_of(user_id), user_id = auth.uid(), calling
    from live
   where r <= least(greatest(lim, 1), 200) or user_id = auth.uid()
   order by r
$$;
revoke all on function public.samsara_board(int) from public;
grant execute on function public.samsara_board(int) to anon, authenticated;

-- 我 Where I stand: from the switch, a closed-test standing and cloud copy read as none, and
-- the first under Heaven is the season's first.
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
    'title', case when exists (select 1 from first where user_id = p.id) then '天下第一' else title_of(p.id) end
  )
  from profiles p
  left join standings s on s.user_id = p.id and in_season(s.updated_at)
  left join saves v on v.user_id = p.id and in_season(v.last_sync)
  where p.id = auth.uid()
$$;
grant execute on function public.my_standing() to anon, authenticated;

-- 脈 The panel's counts. Accounts are kept through the season (plan 3.3), so 'players',
-- 'new24', 'new7' and 'held' count accounts as before; what was played counts the season.
create or replace function public.stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'at', now(),
    'players', (select count(*) from profiles),
    'new24', (select count(*) from profiles where created_at > now() - interval '24 hours'),
    'new7', (select count(*) from profiles where created_at > now() - interval '7 days'),
    'active24', (select count(*) from saves where last_sync > now() - interval '24 hours' and in_season(last_sync)),
    'active7', (select count(*) from saves where last_sync > now() - interval '7 days' and in_season(last_sync)),
    'syncs24', (select count(*) from sync_log where at > now() - interval '24 hours' and in_season(at)),
    'refused24', (select count(*) from sync_log where at > now() - interval '24 hours' and not ok and in_season(at)),
    'strikes24', (select count(*) from sync_log where at > now() - interval '24 hours' and strike and in_season(at)),
    'held', (select count(*) from profiles where suspect or banned or strikes > 0),
    'realms', coalesce((
      select jsonb_agg(jsonb_build_object('realm', r, 'players', n) order by r)
        from (select least(greatest(coalesce(case when in_season(verified_at) then (verified->>'realm')::int end, 1), 1), 9) as r,
                     count(*) as n
                from saves where in_season(last_sync) group by 1) x), '[]'::jsonb),
    'pulse', coalesce((
      select jsonb_agg(jsonb_build_object('at', at, 'players', players, 'active24', active24,
                                          'discord', discord_members, 'online', discord_online) order by at)
        from pulse where at > now() - interval '30 days'), '[]'::jsonb)
  )
$$;
revoke all on function public.stats() from public;
grant execute on function public.stats() to anon, authenticated;

create or replace function public.take_pulse(members int, online int)
returns void language sql security definer set search_path = public as $$
  insert into pulse (at, players, active24, discord_members, discord_online)
  select date_trunc('hour', now()), (select count(*) from profiles),
         (select count(*) from saves where last_sync > now() - interval '24 hours' and in_season(last_sync)), members, online
  on conflict (at) do update set players = excluded.players, active24 = excluded.active24,
    discord_members = excluded.discord_members, discord_online = excluded.discord_online
$$;
revoke all on function public.take_pulse(int, int) from public, anon, authenticated;
grant execute on function public.take_pulse(int, int) to service_role;

-- 師 Per player, as 20261003000000_panel_refusals.sql left it, reading the season only. The
-- key check is still panel_ok(), and nothing here returns an email or an id.
create or replace function public.panel_players(key text)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not panel_ok(key) then raise exception 'wrong key'; end if;
  return coalesce((
    select jsonb_agg(r order by (r->>'last_seen') desc nulls last)
    from (
      select jsonb_build_object(
        'name', p.name,
        'joined', p.created_at,
        'last_seen', v.last_sync,
        'started', case when coalesce(vv.verified->>'startedAt', v.latest->>'startedAt') ~ '^[0-9]+(\.[0-9]+)?$'
                        then to_timestamp(coalesce(vv.verified->>'startedAt', v.latest->>'startedAt')::double precision) end,
        'realm', coalesce((vv.verified->>'realm')::int, 1),
        'layer', coalesce((vv.verified->>'layer')::int, 0),
        'climb', coalesce(s.climb, 0),
        'marks', coalesce(s.marks, 0),
        'tower', coalesce(s.tower, 0),
        'days', (select count(distinct date(l.at)) from sync_log l where l.user_id = p.id and in_season(l.at)),
        'syncs7', (select count(*) from sync_log l where l.user_id = p.id and l.at > now() - interval '7 days' and in_season(l.at)),
        'syncs_day', (select count(*) from sync_log l where l.user_id = p.id and l.at > now() - interval '24 hours' and in_season(l.at)),
        'refused_day', (select count(*) from sync_log l where l.user_id = p.id and l.at > now() - interval '24 hours' and not l.ok and in_season(l.at)),
        'refused_why', (select w.why from sync_log l, lateral (select distinct unnest(l.why) as why) w
                         where l.user_id = p.id and l.at > now() - interval '24 hours' and not l.ok and in_season(l.at)
                         group by w.why order by count(*) desc, w.why limit 1),
        'email', coalesce(u.email, '') <> '',
        'held', p.suspect or p.banned or p.strikes > 0,
        'note', coalesce(n.note, ''),
        'cleared', n.cleared_at
      ) as r
      from profiles p
      left join saves v on v.user_id = p.id and in_season(v.last_sync)
      left join lateral (select case when in_season(v.verified_at) then v.verified end as verified) vv on true
      left join standings s on s.user_id = p.id and in_season(s.updated_at)
      left join auth.users u on u.id = p.id
      left join panel_notes n on n.user_id = p.id
    ) x), '[]'::jsonb);
end $$;
revoke all on function public.panel_players(text) from public;
grant execute on function public.panel_players(text) to anon, authenticated;

-- 疑 The Batota tab, as 20261005140000_review.sql left it, reading the season's syncs only. A
-- profile's own flags are the account's and stay shown until Push B clears them (D5).
create or replace function public.panel_cheats(key text)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not panel_ok(key) then raise exception 'wrong key'; end if;
  return coalesce((
    select jsonb_agg(r order by (r->>'last') desc nulls last)
    from (
      select jsonb_build_object(
        'name', p.name,
        'strikes', p.strikes,
        'suspect', p.suspect,
        'banned', p.banned,
        'last_seen', v.last_sync,
        'realm', coalesce((vv.verified->>'realm')::int, 1),
        'layer', coalesce((vv.verified->>'layer')::int, 0),
        'tower', coalesce(s.tower, 0),
        'note', coalesce(n.note, ''),
        'cleared', n.cleared_at,
        'last', (select max(l.at) from sync_log l where l.user_id = p.id and (l.strike or l.suspect) and in_season(l.at)),
        'struck', (select count(*) from sync_log l where l.user_id = p.id and l.strike and in_season(l.at)),
        'fast', (select count(*) from sync_log l where l.user_id = p.id and l.suspect and in_season(l.at)),
        'pace', (select max(l.pace) from sync_log l where l.user_id = p.id and l.suspect and in_season(l.at)),
        'tried', coalesce((
          select jsonb_agg(jsonb_build_object('why', w.why, 'n', w.n, 'first', w.first, 'last', w.last) order by w.n desc, w.why)
          from (
            select x.why, count(*) as n, min(l.at) as first, max(l.at) as last
              from sync_log l, lateral (select distinct unnest(l.why) as why) x
             where l.user_id = p.id and (l.strike or l.suspect) and in_season(l.at) and x.why not in ('went-down', 'shape')
             group by x.why) w), '[]'::jsonb),
        'recent', coalesce((
          select jsonb_agg(jsonb_build_object('at', l.at, 'why', l.why, 'strike', l.strike, 'suspect', l.suspect, 'pace', l.pace) order by l.at desc)
          from (select * from sync_log l where l.user_id = p.id and (l.strike or l.suspect) and in_season(l.at)
                 order by l.at desc limit 8) l), '[]'::jsonb)
      ) as r
      from profiles p
      left join saves v on v.user_id = p.id and in_season(v.last_sync)
      left join lateral (select case when in_season(v.verified_at) then v.verified end as verified) vv on true
      left join standings s on s.user_id = p.id and in_season(s.updated_at)
      left join panel_notes n on n.user_id = p.id
      where p.strikes > 0 or p.suspect or p.banned
         or exists (select 1 from sync_log l where l.user_id = p.id and (l.strike or l.suspect) and in_season(l.at))
    ) x), '[]'::jsonb);
end $$;
revoke all on function public.panel_cheats(text) from public;
grant execute on function public.panel_cheats(text) to anon, authenticated;
