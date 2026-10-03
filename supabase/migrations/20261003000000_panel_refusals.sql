-- 拒 The panel says, per player, how many of their syncs the verifier refused in a day,
-- and for what.
--
-- 29% of all syncs are refused, and nearly all of those for 'too-fast'. That is either a
-- cheat or an honest player the verifier is holding back, and the counts in stats() cannot
-- tell which. Per player it can: one cultivator refused on every sync for a day is a
-- different story from a few refusals spread over everybody.
--
-- Nothing new is recorded. sync_log already keeps every sync with ok and its reasons
-- (why, an array, written by the sync function), so this only reads it:
--   syncs_day    every sync in the last 24 hours
--   refused_day  the ones that were not ok
--   refused_why  the reason found on most of those (ties to the first by name), or null
-- A reason is counted once per sync, because the day and week windows can both add
-- 'too-fast' to the same one. 'went-down' (an older copy) is a refusal in sync_log too, so
-- it shows here as itself.
--
-- The key check stays in panel_ok(), as 20260929020000_panel_notes.sql left it, and what
-- comes back still carries no email and no id.
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
        'started', case when coalesce(v.verified->>'startedAt', v.latest->>'startedAt') ~ '^[0-9]+(\.[0-9]+)?$'
                        then to_timestamp(coalesce(v.verified->>'startedAt', v.latest->>'startedAt')::double precision) end,
        'realm', coalesce((v.verified->>'realm')::int, 1),
        'layer', coalesce((v.verified->>'layer')::int, 0),
        'climb', coalesce(s.climb, 0),
        'marks', coalesce(s.marks, 0),
        'tower', coalesce(s.tower, 0),
        'days', (select count(distinct date(l.at)) from sync_log l where l.user_id = p.id),
        'syncs7', (select count(*) from sync_log l where l.user_id = p.id and l.at > now() - interval '7 days'),
        'syncs_day', (select count(*) from sync_log l where l.user_id = p.id and l.at > now() - interval '24 hours'),
        'refused_day', (select count(*) from sync_log l where l.user_id = p.id and l.at > now() - interval '24 hours' and not l.ok),
        'refused_why', (select w.why from sync_log l, lateral (select distinct unnest(l.why) as why) w
                         where l.user_id = p.id and l.at > now() - interval '24 hours' and not l.ok
                         group by w.why order by count(*) desc, w.why limit 1),
        'email', coalesce(u.email, '') <> '',
        'held', p.suspect or p.banned or p.strikes > 0,
        'note', coalesce(n.note, ''),
        'cleared', n.cleared_at
      ) as r
      from profiles p
      left join saves v on v.user_id = p.id
      left join standings s on s.user_id = p.id
      left join auth.users u on u.id = p.id
      left join panel_notes n on n.user_id = p.id
    ) x), '[]'::jsonb);
end $$;
revoke all on function public.panel_players(text) from public;
grant execute on function public.panel_players(text) to anon, authenticated;
