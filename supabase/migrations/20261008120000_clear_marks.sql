-- 認 Every mark comes off, and every player carries on from the save they have.
--
-- Bruno, 2026-10-08: "Limpa as marcas em todos os players." This is the testing phase and
-- two fixes made the marks unfair: a fixed Fox, Dragon or Swift bug in the tower was read
-- as a forged floor on every sync, and one refused save was struck again on each repeat.
-- Both are corrected in the code (REPEAT_WINDOW in the sync function, the grandfathered
-- floors in verify.ts); this clears what they had already written.
--
-- Same mechanism as 20261006080000 (rekaris): the account is marked to rebase, so the next
-- save its game sends becomes the one the server measures from, and the sync after that is
-- verified like anybody's. Nothing is deleted. Only accounts that carry a strike or a review
-- flag are touched, and an account that was banned stays banned: a ban is a decision about a
-- person, and Bruno asked for the marks, not for any ban to be lifted.
--
-- saves.rebase and the saves_pin() trigger exist from 20261006080000.
do $$
declare cleared int; held int;
begin
  -- 還 The saves first, while the marks still say whose they are.
  update saves s set pinned = false, rebase = true
    from profiles p
   where p.id = s.user_id and not p.banned and (p.strikes > 0 or p.suspect);

  insert into panel_notes (user_id, note, cleared_at)
  select p.id, 'Marks cleared 2026-10-08 at Bruno''s request (testing phase): strikes and review flag off, and the next save the game sends becomes the verified one.', now()
    from profiles p
   where not p.banned and (p.strikes > 0 or p.suspect)
  on conflict (user_id) do update set note = excluded.note, cleared_at = now(), updated_at = now();

  update profiles set strikes = 0, suspect = false
   where not banned and (strikes > 0 or suspect);
  get diagnostics cleared = row_count;

  -- 罰 What a deleted account's email carried over, unless it carried a ban.
  update barred set strikes = 0 where not banned and strikes > 0;

  select count(*) into held from profiles where banned;
  raise notice 'marks cleared on % accounts; % banned accounts left as they were', cleared, held;
end $$;
