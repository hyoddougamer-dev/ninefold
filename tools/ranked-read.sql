-- 驗 After the tower and gear update went live (2026-10-05 22:38 UTC): every refused or
-- flagged sync since, with its reasons, every name's state and standing, the latest and
-- verified saves of the players furthest up the tower, and rekaris's whole sync history
-- (Bruno, 2026-10-06: "limpa o rank e sync do Rekaris"), so the clear is measured before
-- it is written. Read-only.
select json_build_object(
  'since', (select json_agg(json_build_object(
      'name', p.name, 'at', l.at, 'ok', l.ok, 'why', l.why, 'pace', l.pace, 'strike', l.strike, 'suspect', l.suspect)
      order by l.at)
    from sync_log l join profiles p on p.id = l.user_id
   where l.at > timestamptz '2026-10-05 22:38:00+00' and (not l.ok or l.strike or l.suspect)),
  'everyone', (select json_agg(json_build_object(
      'name', p.name, 'strikes', p.strikes, 'suspect', p.suspect, 'banned', p.banned,
      'last_sync', s.last_sync, 'verified_at', s.verified_at,
      'climb', st.climb, 'marks', st.marks, 'tower', st.tower, 'tower_at', st.tower_at) order by s.last_sync desc nulls last)
    from profiles p left join saves s on s.user_id = p.id left join standings st on st.user_id = p.id),
  'rekaris', (select json_agg(json_build_object('at', l.at, 'ok', l.ok, 'why', l.why, 'pace', l.pace,
      'strike', l.strike, 'suspect', l.suspect) order by l.at)
    from sync_log l join profiles p on p.id = l.user_id where lower(btrim(p.name)) = 'rekaris'),
  'rekaris_titles', (select json_agg(t) from titles t join profiles p on p.id = t.user_id where lower(btrim(p.name)) = 'rekaris'),
  'saves', (select json_agg(json_build_object('name', p.name, 'latest', s.latest, 'verified', s.verified,
      'verified_at', s.verified_at, 'pinned', s.pinned, 'rebase', s.rebase, 'latest_at', s.latest_at, 'day_state', s.day_state, 'day_at', s.day_at, 'week_state', s.week_state, 'week_at', s.week_at))
    from profiles p join saves s on s.user_id = p.id
   where p.name in ('Rekaris', 'Qin Mu', 'Raziel_Sama', 'esko', 'Hevon', '修士 059629D3', 'Gil', 'Argun')),
  'argun_log', (select json_agg(json_build_object('at', l.at, 'ok', l.ok, 'why', l.why, 'pace', l.pace, 'strike', l.strike, 'suspect', l.suspect) order by l.at)
    from sync_log l join profiles p on p.id = l.user_id where p.name = 'Argun'),
  'argun_profile', (select json_agg(json_build_object('name', p.name, 'created', p.created_at, 'strikes', p.strikes, 'suspect', p.suspect)) from profiles p where p.name = 'Argun')
) as out;
