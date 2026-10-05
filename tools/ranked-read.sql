-- 驗 Why syncs were refused on 2026-10-05: every refused sync of the last day with its
-- reasons, and the stored save of the one player the server banned that day (Heavenly
-- Demon), to replay against the server's own code. Read-only.
select json_build_object(
  'refused', (select json_agg(json_build_object(
      'name', p.name, 'at', l.at, 'why', l.why, 'pace', l.pace, 'strike', l.strike, 'suspect', l.suspect)
      order by p.name, l.at)
    from sync_log l join profiles p on p.id = l.user_id
   where not l.ok and l.at > now() - interval '1 day'),
  'saves', (select json_agg(json_build_object(
      'name', p.name, 'latest', s.latest, 'verified', s.verified, 'verified_at', s.verified_at,
      'last_sync', s.last_sync, 'day_state', s.day_state, 'day_at', s.day_at,
      'week_state', s.week_state, 'week_at', s.week_at))
    from profiles p join saves s on s.user_id = p.id
   where p.name in ('Heavenly Demon', 'Qin Mu'))
) as out;
