-- 疑 Review, never a machine ban, and the panel's 疑 Batota tab.
--
-- Bruno, 2026-10-05: "sem banir ninguém diretamente", and a tab in the panel that says
-- who really cheats and what they tried. The sync function no longer bans at three
-- strikes: it keeps the player off the boards for review (suspect), and a person decides.
-- What each refused sync tried is already in sync_log (why, strike, suspect, pace); this
-- reads it per player. A ban the database already holds stands, and stays the panel's to
-- lift.
--
-- And the audit of 2026-10-05 found two ways a flag was shed:
--   set_name()  created the profile with nothing against it, before the sync could read
--               what the email's deleted account had left in barred;
--   delete_me() kept strikes and bans, never a flag for review.

alter table public.barred add column if not exists suspect boolean not null default false;

create or replace function public.delete_me()
returns void language plpgsql security definer set search_path = public, auth as $$
declare me uuid := auth.uid(); mail text; had_strikes int; was_banned boolean; was_flagged boolean;
begin
  if me is null then raise exception 'not signed in'; end if;
  select u.email into mail from auth.users u where u.id = me;
  select p.strikes, p.banned, p.suspect into had_strikes, was_banned, was_flagged from public.profiles p where p.id = me;
  if coalesce(mail, '') <> '' and (coalesce(had_strikes, 0) > 0 or coalesce(was_banned, false) or coalesce(was_flagged, false)) then
    insert into public.barred (email_hash, strikes, banned, suspect)
      values (public.email_hash(mail), coalesce(had_strikes, 0), coalesce(was_banned, false), coalesce(was_flagged, false))
    on conflict (email_hash) do update
      set strikes = greatest(barred.strikes, excluded.strikes),
          banned  = barred.banned or excluded.banned,
          suspect = barred.suspect or excluded.suspect,
          at      = now();
  end if;
  delete from public.sync_log where user_id = me;
  delete from public.titles where user_id = me;
  delete from auth.users where id = me;   -- profiles, saves and standings cascade from here
end $$;
revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;

create or replace function public.barred_for(uid uuid)
returns jsonb language sql stable security definer set search_path = public, auth as $$
  select jsonb_build_object('strikes', b.strikes, 'banned', b.banned, 'suspect', b.suspect)
    from public.barred b
    join auth.users u on u.id = uid and coalesce(u.email, '') <> ''
   where b.email_hash = public.email_hash(u.email);
$$;
revoke all on function public.barred_for(uuid) from public, anon, authenticated;
grant execute on function public.barred_for(uuid) to service_role;

-- 名 The same rules as before; a profile it creates carries what barred holds for the email.
create or replace function public.set_name(new_name text)
returns text language plpgsql security definer set search_path = public as $$
declare clean text := btrim(regexp_replace(
  regexp_replace(normalize(coalesce(new_name, ''), NFKC), '[[:cntrl:]­​-‏‪-‮⁠-⁯﻿]', ' ', 'g'),
  '\s+', ' ', 'g'));
  was jsonb;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if char_length(clean) < 2 or char_length(clean) > 20 then raise exception 'name length'; end if;
  if clean !~ '^[A-Za-z0-9 _\-\.㐀-鿿]+$' then raise exception 'name characters'; end if;
  if clean ~ '(天下第一|期首|期十|期百)' or clean like '修士%' then raise exception 'name reserved'; end if;
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

-- 疑 Every player the verifier ever refused as impossible or flagged as too fast, with what
-- they tried: each reason once per sync, how often, first and last; the fastest pace a
-- flagged sync read; the last eight such syncs. 'went-down' and 'shape' are an older copy
-- or another run, never an attempt, and are left out. No email, no id.
create or replace function public.panel_cheats(key text)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not panel_ok(key) then raise exception 'wrong key'; end if;
  return coalesce((
    select jsonb_agg(r order by (r->>'last') desc nulls last)
    from (
      select jsonb_build_object(
        'name', p.name,
        'strikes', p.strikes,
        'suspect', p.suspect,
        'banned', p.banned,
        'last_seen', v.last_sync,
        'realm', coalesce((v.verified->>'realm')::int, 1),
        'layer', coalesce((v.verified->>'layer')::int, 0),
        'tower', coalesce(s.tower, 0),
        'note', coalesce(n.note, ''),
        'cleared', n.cleared_at,
        'last', (select max(l.at) from sync_log l where l.user_id = p.id and (l.strike or l.suspect)),
        'struck', (select count(*) from sync_log l where l.user_id = p.id and l.strike),
        'fast', (select count(*) from sync_log l where l.user_id = p.id and l.suspect),
        'pace', (select max(l.pace) from sync_log l where l.user_id = p.id and l.suspect),
        'tried', coalesce((
          select jsonb_agg(jsonb_build_object('why', w.why, 'n', w.n, 'first', w.first, 'last', w.last) order by w.n desc, w.why)
          from (
            select x.why, count(*) as n, min(l.at) as first, max(l.at) as last
              from sync_log l, lateral (select distinct unnest(l.why) as why) x
             where l.user_id = p.id and (l.strike or l.suspect) and x.why not in ('went-down', 'shape')
             group by x.why) w), '[]'::jsonb),
        'recent', coalesce((
          select jsonb_agg(jsonb_build_object('at', l.at, 'why', l.why, 'strike', l.strike, 'suspect', l.suspect, 'pace', l.pace) order by l.at desc)
          from (select * from sync_log l where l.user_id = p.id and (l.strike or l.suspect) order by l.at desc limit 8) l), '[]'::jsonb)
      ) as r
      from profiles p
      left join saves v on v.user_id = p.id
      left join standings s on s.user_id = p.id
      left join panel_notes n on n.user_id = p.id
      where p.strikes > 0 or p.suspect or p.banned
         or exists (select 1 from sync_log l where l.user_id = p.id and (l.strike or l.suspect))
    ) x), '[]'::jsonb);
end $$;
revoke all on function public.panel_cheats(text) from public;
grant execute on function public.panel_cheats(text) to anon, authenticated;
