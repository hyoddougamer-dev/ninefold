-- 始 A fresh start for the closed test, at Bruno's request on 2026-09-28 at 20:37 UTC:
-- "fazes reset ao que exista atualmente para começarem todos igualmente", and authorised
-- by him in these words at 20:50 UTC: "autorizo apagar as contas de ranking de teste
-- criadas antes de hoje às 20:37".
--
-- The boards held what the building of the game left on them: Bruno's own cultivators
-- and whatever the testing of the server made. The first testers were arriving as he
-- asked, so this removes exactly the players whose account existed before that moment,
-- and nobody who signed up after it.
--
-- 閘 A brake. If more than 25 accounts match, something is not what was expected (the
-- test would have to have filled up in minutes), so nothing is deleted and the migration
-- stops to be looked at. On an empty database (the schema test) it matches nothing.
--
-- What goes: each matched player's account, profile, cloud save and standing (those
-- cascade from auth.users), their sync history and claim turns, and any weekly title
-- they held. What stays: 罰 barred, the hashes of banned emails, because a fresh start
-- for the boards is not an amnesty for a cheat. A player's own game lives on their device
-- and is not touched by any of this; a tester who wants to start level starts a new save.
do $$
declare
  cutoff constant timestamptz := '2026-09-28 20:37:00+00';
  hits int;
begin
  select count(*) into hits from auth.users where created_at < cutoff;
  if hits = 0 then return; end if;
  if hits > 25 then
    raise exception 'fresh start: % accounts predate the cutoff, more than the 25 expected; nothing deleted', hits;
  end if;
  raise notice 'fresh start: removing % accounts created before %', hits, cutoff;
  delete from public.sync_log   where user_id in (select id from auth.users where created_at < cutoff);
  delete from public.titles     where user_id in (select id from auth.users where created_at < cutoff);
  delete from public.sync_turns where user_id in (select id from auth.users where created_at < cutoff);
  delete from auth.users        where created_at < cutoff;  -- profiles, saves, standings cascade
end $$;
