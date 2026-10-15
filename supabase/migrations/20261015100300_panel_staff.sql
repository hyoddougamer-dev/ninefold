-- 師 Staff: the developer's own ranked account, marked from the panel and nowhere else.
--
-- docs/SEASON0-THEME.md, 2c and 2d (decided 2026-10-15): the developer's ranked account is not
-- marked 先行 and not carved on the Cliff. Which account that is never appears in this
-- repository, which is public: no id, no name. It is set from /painel/, behind the panel key,
-- exactly as panel_clear() and panel_note() work (panel_ok() is the one place the key is
-- checked). A staff account still plays and still sits on the boards like anyone; it is only
-- left off the Cliff (cliff()) and never wears 先行 (is_forerunner()).
--
-- Its arrivals are still recorded in firsts, so taking the flag off puts it back on the Cliff
-- at its true time, and putting it on takes it off without losing anything.
create or replace function public.panel_set_staff(key text, name text, "on" boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare who uuid;
begin
  if not panel_ok(panel_set_staff.key) then raise exception 'wrong key'; end if;
  select p.id into who from profiles p where lower(p.name) = lower(btrim(panel_set_staff.name));
  if who is null then raise exception 'no such player'; end if;
  update profiles p set staff = coalesce(panel_set_staff."on", false) where p.id = who;
  return coalesce(panel_set_staff."on", false);
end $$;
revoke all on function public.panel_set_staff(text, text, boolean) from public;
grant execute on function public.panel_set_staff(text, text, boolean) to anon, authenticated;

-- 師 The panel's list, as 20261014130000_season0.sql left it, with two answers more per player:
-- staff (so the panel shows the switch the right way round) and forerunner (whether the name
-- wears 先行). Still nothing that is an email or an id.
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
        'cleared', n.cleared_at,
        'staff', p.staff,
        'forerunner', is_forerunner(p.id)
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
