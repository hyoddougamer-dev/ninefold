-- 盾 What the audit of the anti-cheat found, closed on the database's side.
-- The sim's half is in src/sim/verify.ts and supabase/functions/sync/core.ts.

-- 限 A player's turn to sync, taken in one statement. The function used to read the last
-- sync time and write the new one in two steps, so ten syncs sent at once all read the
-- old time and all went through, and a strike counted once for all ten. The row lives in
-- a table of its own because a first sync has no save row yet to lock.
create table if not exists public.sync_turns (
  user_id     uuid primary key references auth.users on delete cascade,
  last_claim  timestamptz not null
);
alter table public.sync_turns enable row level security;
revoke all on public.sync_turns from anon, authenticated;

create or replace function public.claim_sync(uid uuid, gap_seconds int)
returns int language plpgsql security definer set search_path = public as $$
declare got timestamptz; prev timestamptz;
begin
  insert into sync_turns as t (user_id, last_claim) values (uid, now())
  on conflict (user_id) do update set last_claim = now()
    where t.last_claim < now() - make_interval(secs => gap_seconds)
  returning last_claim into got;
  if got is not null then return 0; end if;
  select last_claim into prev from sync_turns where user_id = uid;
  return greatest(1, ceil(gap_seconds - extract(epoch from (now() - prev))))::int;
end $$;

-- 罰 A strike and a flag added where they are kept, so two at once are two.
create or replace function public.mark_player(uid uuid, strike boolean, flag boolean, ban int)
returns jsonb language sql security definer set search_path = public as $$
  update profiles p
     set strikes = p.strikes + (case when strike then 1 else 0 end),
         suspect = p.suspect or flag,
         banned  = p.banned or (p.strikes + (case when strike then 1 else 0 end)) >= ban
   where p.id = uid
  returning jsonb_build_object('name', p.name, 'strikes', p.strikes, 'suspect', p.suspect, 'banned', p.banned);
$$;

revoke all on function public.claim_sync(uuid, int) from public, anon, authenticated;
revoke all on function public.mark_player(uuid, boolean, boolean, int) from public, anon, authenticated;
grant execute on function public.claim_sync(uuid, int) to service_role;
grant execute on function public.mark_player(uuid, boolean, boolean, int) to service_role;

-- 窗 The verified saves a day and a week behind, so every sync is also measured against a
-- whole day and a whole week, and a burst allowance cannot be collected sync by sync.
alter table public.saves
  add column if not exists day_state  jsonb,
  add column if not exists day_at     timestamptz,
  add column if not exists week_state jsonb,
  add column if not exists week_at    timestamptz;

-- 名 The same rules as cleanName() in core.ts: folded to one form, nothing invisible, Latin
-- letters, digits, CJK and a little punctuation, and never a title or the 修士 prefix a
-- default name wears. The old rule let through 天下第一, Cyrillic look-alikes and
-- full-width letters.
create or replace function public.set_name(new_name text)
returns text language plpgsql security definer set search_path = public as $$
declare clean text := btrim(regexp_replace(
  regexp_replace(normalize(coalesce(new_name, ''), NFKC), '[[:cntrl:]­​-‏‪-‮⁠-⁯﻿]', ' ', 'g'),
  '\s+', ' ', 'g'));
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if char_length(clean) < 2 or char_length(clean) > 20 then raise exception 'name length'; end if;
  if clean !~ '^[A-Za-z0-9 _\-\.㐀-鿿]+$' then raise exception 'name characters'; end if;
  if clean ~ '(天下第一|期首|期十|期百)' or clean like '修士%' then raise exception 'name reserved'; end if;
  insert into profiles (id, name) values (auth.uid(), clean)
    on conflict (id) do update set name = excluded.name;
  return clean;
exception when unique_violation then
  raise exception 'name taken';
end $$;
revoke all on function public.set_name(text) from public;
grant execute on function public.set_name(text) to anon, authenticated;
