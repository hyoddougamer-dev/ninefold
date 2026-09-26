-- 去 The first live attack on the server (tools/ranked.ts, run at 10:58 UTC on the day the
-- server went live) did not clean up after itself, and left one guest called "Tester"
-- and a number on the public boards. The attack deletes its own player now; this removes
-- the one left before it did, at Bruno's request.
--
-- Scoped to exactly that player: the attack's own naming, created inside the minute that
-- run signed it up. If the match is ever anything but one row, nothing is deleted and
-- the migration stops, so this can never take a real player with it. On an empty
-- database (the schema test) it matches nothing and does nothing.
do $$
declare
  hits int;
  who uuid;
begin
  select count(*), min(id::text)::uuid into hits, who
    from public.profiles
   where name ~ '^Tester [0-9]{1,5}$'
     and created_at >= '2026-09-26 10:58:00+00'
     and created_at <  '2026-09-26 10:59:00+00';
  if hits = 0 then return; end if;
  if hits > 1 then raise exception 'expected one test player, found %', hits; end if;
  delete from public.sync_log where user_id = who;
  delete from public.titles   where user_id = who;
  delete from auth.users      where id = who;   -- profile, save and standing cascade
end $$;
