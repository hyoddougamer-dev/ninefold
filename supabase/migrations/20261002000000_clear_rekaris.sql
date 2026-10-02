-- 清 rekaris's flag taken off, and a cleared flag that stays off.
--
-- Bruno, 2026-10-02: "limpa o strike do rekaris asap." Melting with Auto paid qi faster
-- than the game meant to, until the melt allowance went out that morning, and rekaris's
-- climb read as faster than anybody honest. It was the game's doing, not theirs.
--
-- Taking the flag off alone was not enough. The server also measures a climb against
-- where it stood a day and a week before, and those two windows still held the climb from
-- before the fix, so the next sync would have flagged it again. A flag a person clears
-- now restarts both windows from the last save that verified: the pace is measured from
-- the moment somebody looked, and a cultivator who keeps climbing too fast after that is
-- flagged again, exactly as before.
create or replace function public.clear_flag(who uuid, note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update profiles set strikes = 0, suspect = false, banned = false where id = who;
  update saves set day_state = verified, day_at = verified_at,
                   week_state = verified, week_at = verified_at
   where user_id = who and verified is not null and verified_at is not null;
  insert into panel_notes (user_id, note, cleared_at) values (who, left(coalesce(note, ''), 500), now())
  on conflict (user_id) do update set note = excluded.note, cleared_at = now(), updated_at = now();
end $$;
revoke all on function public.clear_flag(uuid, text) from public, anon, authenticated;

create or replace function public.panel_clear(key text, player text, note text)
returns void language plpgsql security definer set search_path = public as $$
declare who uuid;
begin
  if not panel_ok(key) then raise exception 'wrong key'; end if;
  select id into who from profiles where lower(name) = lower(btrim(player));
  if who is null then raise exception 'no such player'; end if;
  perform clear_flag(who, note);
end $$;
revoke all on function public.panel_clear(text, text, text) from public;
grant execute on function public.panel_clear(text, text, text) to anon, authenticated;

-- The one player Bruno named, and nobody else. A name that is not on the server changes
-- nothing, and the panel's own button does the same with whatever name is there.
do $$
declare who uuid;
begin
  select id into who from profiles where lower(btrim(name)) = 'rekaris';
  if who is not null then
    perform clear_flag(who, 'Cleared 2026-10-02 at Bruno''s request: melting with Auto paid too much qi before the melt allowance, which was the game''s fault.');
  end if;
end $$;
