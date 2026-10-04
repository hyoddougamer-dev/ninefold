-- 驗 The players who reported stuck syncs on 2026-10-04, and how the server sees them now.
select p.name, p.strikes, p.suspect, p.banned,
       s.last_sync, s.verified_at, st.climb, st.tower, st.updated_at,
       (select json_agg(x) from (
          select l.at, l.ok, l.why, l.strike, l.suspect from sync_log l
           where l.user_id = p.id order by l.at desc limit 8) x) as recent
  from profiles p
  left join saves s on s.user_id = p.id
  left join standings st on st.user_id = p.id
 where lower(p.name) like any (array['%rekaris%', '%gil%', '%specter%', '%speculaether%', '%spec%']);
