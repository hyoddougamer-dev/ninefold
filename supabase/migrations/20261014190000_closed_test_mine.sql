-- 舊 The closed-test copy the server keeps, readable by its own player and by nobody else.
--
-- Bruno, 2026-10-14, option 1: a player whose only copy of the closed-test cultivator was
-- in the cloud (a lost phone, a new device, a cleared browser) still gets it back after the
-- switch. 20261014130000_season0.sql keeps that copy in saves.closed_test, moved there once
-- by the trigger saves_keep_closed_test on the first update after season_start(). This is
-- the one way to read it: a function that answers for auth.uid() and nobody else.
--
-- What it answers, and only this: { save, at } or null.
--   before season_start()          null. The closed test is still being played.
--   closed_test is kept            that copy and closed_test_at.
--   not moved yet                  the row was last synced before the switch, so its latest
--                                  IS the closed-test copy: that, and latest_at. The trigger
--                                  still moves it on the row's next update, so the answer
--                                  never depends on which came first.
--   anything else                  null: an account begun in the season, or no row at all.
--
-- It is security definer because no player can read the saves table (RLS, no policy), and
-- it is never a grant on the table: the row is chosen by auth.uid() inside the function,
-- so there is no argument a caller could point at somebody else. Guests are signed in
-- (Supabase gives an anonymous sign-in the authenticated role), so a guest reads their own.
-- The anon role, nobody signed in, may not call it at all.
--
-- panel_players() and stats() are not touched: neither reads closed_test, and the schema
-- test holds them to that.
create or replace function public.closed_test_mine()
returns jsonb language sql stable security definer set search_path = public as $$
  select case
    when now() < season_start() then null
    when v.closed_test is not null
      then jsonb_build_object('save', v.closed_test, 'at', v.closed_test_at)
    when v.last_sync < season_start() and jsonb_typeof(v.latest) = 'object' and v.latest <> '{}'::jsonb
      then jsonb_build_object('save', v.latest, 'at', v.latest_at)
  end
  from saves v
  where v.user_id = auth.uid()
$$;
revoke all on function public.closed_test_mine() from public, anon;
grant execute on function public.closed_test_mine() to authenticated;
