-- 名 先行 is a mark, not a name (2026-10-15).
--
-- The Forerunner seal is its own column beside a name on every board and at the foot of the
-- Cliff (20261015100100_forerunner.sql). A name that carried the two glyphs would wear the mark
-- in plain text without having earned it, the way a name carrying 天下第一 would wear the title,
-- so it is kept out for the same reason and in the same place: set_name() as
-- 20261005140000_review.sql left it, with 先行 beside the titles. The sync's own check is
-- cleanName() in src/net/names.ts, which reads the same list. A name already chosen is not
-- touched.
create or replace function public.set_name(new_name text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare clean text := btrim(regexp_replace(
  regexp_replace(normalize(coalesce(new_name, ''), NFKC), '[[:cntrl:]­​-‏‪-‮⁠-⁯﻿]', ' ', 'g'),
  '\s+', ' ', 'g'));
  was jsonb;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if char_length(clean) < 2 or char_length(clean) > 20 then raise exception 'name length'; end if;
  if clean !~ '^[A-Za-z0-9 _\-\.㐀-鿿]+$' then raise exception 'name characters'; end if;
  if clean ~ '(天下第一|期首|期十|期百|先行)' or clean like '修士%' then raise exception 'name reserved'; end if;
  was := public.barred_for(auth.uid());
  insert into profiles (id, name, strikes, suspect, banned)
    values (auth.uid(), clean, coalesce((was->>'strikes')::int, 0), coalesce((was->>'suspect')::boolean, false),
            coalesce((was->>'banned')::boolean, false))
    on conflict (id) do update set name = excluded.name;
  return clean;
exception when unique_violation then
  raise exception 'name taken';
end $$;
revoke all on function public.set_name(text) from public;
grant execute on function public.set_name(text) to anon, authenticated;
