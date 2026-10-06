-- 還 rekaris back at the last save that verified, and a cloud copy that waits for them.
--
-- Bruno, 2026-10-06: "limpa o rank e sync do Rekaris". On 2026-10-05 rekaris climbed
-- from floor 125 to 352 with Swift, Fox Shadow and Dragon Might, which made the beast miss
-- every round (fixed that evening, b624b3d). The server held them at the last save that
-- verified, 19:26 UTC that day: realm 9, layer 6, floor 125, which the fixed combat still
-- reaches. Every sync since is refused, and always will be, because the save on their
-- device holds floors no build can win.
--
-- Clearing the flag alone would change nothing: the next sync is refused again. What
-- rekaris needs is the verified save back on the device, and the game already has the
-- door for that: a device with less on it that signs in is offered the cloud's copy when
-- the cloud's is further along. So the cloud copy becomes the verified save, and it is
-- pinned there. Until a save verifies against it, a sync (the old device, still open
-- somewhere) is logged and refused as always but cannot write over the copy. The first
-- save that verifies releases the pin and takes the strikes and the review off, which is
-- the moment the climb is honest again.
--
-- The pin is a column and a trigger, so it holds whichever version of the sync function is
-- running: the database refuses the overwrite, not the function.
alter table public.saves add column if not exists pinned boolean not null default false;

create or replace function public.saves_pin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.pinned then
    if new.verified_at is not null and new.verified_at is distinct from old.verified_at then
      new.pinned := false;
      update profiles set strikes = 0, suspect = false where id = new.user_id;
    else
      new.latest := old.latest;
      new.latest_at := old.latest_at;
      new.pinned := true;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.saves_pin() from public, anon, authenticated;

drop trigger if exists saves_pin on public.saves;
create trigger saves_pin before update on public.saves
  for each row execute function public.saves_pin();

-- The one player Bruno named, and nobody else. A name that is not on the server changes
-- nothing. The flag comes off now (strikes, review, and the day and week windows restarted
-- from the verified save), and the pin keeps the copy until rekaris takes it.
do $$
declare who uuid;
begin
  select id into who from profiles where lower(btrim(name)) = 'rekaris';
  if who is not null then
    perform clear_flag(who, 'Restored 2026-10-06 at Bruno''s request to the last verified save (realm 9, layer 6, floor 125): the climb past it used Swift with Fox Shadow and Dragon Might, fixed 2026-10-05. The cloud copy is pinned there until a save verifies against it.');
    update saves set latest = verified, latest_at = verified_at, pinned = true
     where user_id = who and verified is not null and verified_at is not null;
  end if;
end $$;
