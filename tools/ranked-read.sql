-- 驗 After the fair-tower release (2026-10-05 11:38 UTC): every sync since, ok or not, with
-- its reasons, so a false strike from the new tower sum is seen at once, and every name's
-- state. Read-only.
select json_build_object(
  'since', (select json_agg(json_build_object(
      'name', p.name, 'at', l.at, 'ok', l.ok, 'why', l.why, 'pace', l.pace, 'strike', l.strike, 'suspect', l.suspect)
      order by l.at)
    from sync_log l join profiles p on p.id = l.user_id
   where l.at > timestamptz '2026-10-05 11:34:00+00' and (not l.ok or l.strike or l.suspect)),
  'counts', (select json_agg(json_build_object('name', x.name, 'ok', x.ok, 'refused', x.refused, 'last', x.last))
    from (select p.name, count(*) filter (where l.ok) as ok, count(*) filter (where not l.ok) as refused, max(l.at) as last
            from sync_log l join profiles p on p.id = l.user_id
           where l.at > timestamptz '2026-10-05 11:34:00+00' group by p.name) x),
  'everyone', (select json_agg(json_build_object(
      'name', p.name, 'strikes', p.strikes, 'suspect', p.suspect, 'banned', p.banned,
      'last_sync', s.last_sync, 'verified_at', s.verified_at) order by s.last_sync desc nulls last)
    from profiles p left join saves s on s.user_id = p.id)
) as out;
