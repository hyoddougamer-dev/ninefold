-- 驗 After the Celestial and Platform release (2026-10-05 17:00 UTC): every refused or
-- flagged sync since, with its reasons, every name's state, and the latest and verified
-- saves of the players furthest up the tower, to measure real players against the
-- harness (rekaris, 2026-10-05: "player power was underestimated"). Read-only.
select json_build_object(
  'since', (select json_agg(json_build_object(
      'name', p.name, 'at', l.at, 'ok', l.ok, 'why', l.why, 'pace', l.pace, 'strike', l.strike, 'suspect', l.suspect)
      order by l.at)
    from sync_log l join profiles p on p.id = l.user_id
   where l.at > timestamptz '2026-10-05 16:58:00+00' and (not l.ok or l.strike or l.suspect)),
  'everyone', (select json_agg(json_build_object(
      'name', p.name, 'strikes', p.strikes, 'suspect', p.suspect, 'banned', p.banned,
      'last_sync', s.last_sync, 'verified_at', s.verified_at) order by s.last_sync desc nulls last)
    from profiles p left join saves s on s.user_id = p.id),
  'saves', (select json_agg(json_build_object('name', p.name, 'latest', s.latest, 'verified', s.verified,
      'verified_at', s.verified_at, 'day_state', s.day_state, 'day_at', s.day_at, 'week_state', s.week_state, 'week_at', s.week_at))
    from profiles p join saves s on s.user_id = p.id
   where p.name in ('Rekaris', 'Qin Mu', 'Raziel_Sama', 'esko', 'Hevon', '修士 059629D3', 'Gil'))
) as out;
