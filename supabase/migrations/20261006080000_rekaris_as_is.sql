-- 認 rekaris keeps everything as it is: the save on their device becomes the one the
-- server measures from, and the mark comes off.
--
-- Bruno, 2026-10-06, an hour after the restore to floor 125 (20261006070000): "deve manter
-- tudo como está, apenas faz sync e limpa a marca. É fase de testes e ele tem dado imenso
-- feedback, não é relevante ele estar muito à frente." So the climb to floor 352 stands,
-- with its qi, and nothing is asked of rekaris.
--
-- The server cannot read a save it has not been sent, and the copy on the device is the
-- one that has to count. So the account is marked to rebase: the next sync rekaris's game
-- makes (every five minutes while it is open) is refused as always, but its save is taken
-- as the verified one, with the day and week windows restarted from it. The sync after
-- that is measured from there like anybody's, verifies, puts the climb and the floor on
-- the boards, and (through the pin, which this sets) takes the strikes and the review off.
--
-- An explicit write of pinned or rebase is a person's decision and is let through; the
-- sync function never names either column, so on its writes both carry over.
alter table public.saves add column if not exists rebase boolean not null default false;

create or replace function public.saves_pin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- 認 Rebase: the first save offered after a person asked for it becomes the verified one.
  if old.rebase and new.rebase and new.verified_at is not distinct from old.verified_at
     and new.latest is distinct from old.latest then
    new.verified := new.latest;
    new.verified_at := new.latest_at;
    new.day_state := new.latest;  new.day_at := new.latest_at;
    new.week_state := new.latest; new.week_at := new.latest_at;
    new.rebase := false;
    new.pinned := true;
    return new;
  end if;
  -- 還 Pinned: refused syncs cannot move the copy; the first that verifies frees it and
  -- takes the strikes and the review off.
  if old.pinned and new.pinned then
    if new.verified_at is not null and new.verified_at is distinct from old.verified_at then
      new.pinned := false;
      update profiles set strikes = 0, suspect = false where id = new.user_id;
    else
      new.latest := old.latest;
      new.latest_at := old.latest_at;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.saves_pin() from public, anon, authenticated;

-- The one player Bruno named, and nobody else. The restore's pin comes off, the rebase goes
-- on, and the mark is cleared now as well, so the boards hold nothing against them while
-- the two syncs go through.
do $$
declare who uuid;
begin
  select id into who from profiles where lower(btrim(name)) = 'rekaris';
  if who is not null then
    update saves set pinned = false, rebase = true where user_id = who;
    update profiles set strikes = 0, suspect = false where id = who;
    insert into panel_notes (user_id, note, cleared_at)
    values (who, 'Kept as is 2026-10-06 at Bruno''s request: the save on the device (floor 352) becomes the verified one on its next sync, and the mark is cleared. Testing phase; rekaris''s feedback matters more than the lead.', now())
    on conflict (user_id) do update set note = excluded.note, cleared_at = now(), updated_at = now();
  end if;
end $$;
