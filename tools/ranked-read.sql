-- 驗 The players who reported stuck syncs on 2026-10-04: their stored saves, to replay the
-- next sync against the server's own code, and every name on the server with its state,
-- to find the ones whose board name is not the one they use on Discord.
select json_build_object(
  'saves', (select json_agg(json_build_object(
      'name', p.name, 'latest', s.latest, 'verified', s.verified, 'verified_at', s.verified_at,
      'last_sync', s.last_sync, 'day_state', s.day_state, 'day_at', s.day_at,
      'week_state', s.week_state, 'week_at', s.week_at))
    from profiles p join saves s on s.user_id = p.id
   where lower(p.name) in ('rekaris', 'gil')),
  'everyone', (select json_agg(json_build_object(
      'name', p.name, 'strikes', p.strikes, 'suspect', p.suspect, 'banned', p.banned,
      'last_sync', s.last_sync, 'verified_at', s.verified_at,
      'refused_day', (select count(*) from sync_log l where l.user_id = p.id and not l.ok and l.at > now() - interval '1 day'),
      'last_log', (select max(l.at) from sync_log l where l.user_id = p.id)) order by s.last_sync desc nulls last)
    from profiles p left join saves s on s.user_id = p.id)
) as out;
