-- 罰 A ban that outlives the account it was earned on.
--
-- delete_me() is a player's right and it deletes everything, strikes included, so a
-- player with two strikes (or a ban) could delete the account, sign in again with the
-- same email and start clean. What is kept now is the least that stops that: a one-way
-- hash of the email, and the strikes and ban that went with it. Nothing else, and only
-- for an account that had a strike or a ban; an honest player's deletion leaves nothing.
-- A guest has no email, so a guest leaves nothing either: guests are held by the sign-in
-- rate limit instead (tools/auth-config.mjs).
create table if not exists public.barred (
  email_hash text primary key,
  strikes    int not null default 0,
  banned     boolean not null default false,
  at         timestamptz not null default now()
);
alter table public.barred enable row level security;
revoke all on public.barred from anon, authenticated;

create or replace function public.email_hash(e text)
returns text language sql immutable set search_path = public as $$
  select encode(sha256(convert_to(lower(btrim(e)), 'UTF8')), 'hex')
$$;
revoke all on function public.email_hash(text) from public, anon, authenticated;

create or replace function public.delete_me()
returns void language plpgsql security definer set search_path = public, auth as $$
declare me uuid := auth.uid(); mail text; had_strikes int; was_banned boolean;
begin
  if me is null then raise exception 'not signed in'; end if;
  select u.email into mail from auth.users u where u.id = me;
  select p.strikes, p.banned into had_strikes, was_banned from public.profiles p where p.id = me;
  if coalesce(mail, '') <> '' and (coalesce(had_strikes, 0) > 0 or coalesce(was_banned, false)) then
    insert into public.barred (email_hash, strikes, banned)
      values (public.email_hash(mail), had_strikes, was_banned)
    on conflict (email_hash) do update
      set strikes = greatest(barred.strikes, excluded.strikes),
          banned  = barred.banned or excluded.banned,
          at      = now();
  end if;
  delete from public.sync_log where user_id = me;
  delete from public.titles where user_id = me;
  delete from auth.users where id = me;   -- profiles, saves and standings cascade from here
end $$;
revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;

-- What a new account's email carried over from a deleted one: {strikes, banned}, or null.
create or replace function public.barred_for(uid uuid)
returns jsonb language sql stable security definer set search_path = public, auth as $$
  select jsonb_build_object('strikes', b.strikes, 'banned', b.banned)
    from public.barred b
    join auth.users u on u.id = uid and coalesce(u.email, '') <> ''
   where b.email_hash = public.email_hash(u.email);
$$;
revoke all on function public.barred_for(uuid) from public, anon, authenticated;
grant execute on function public.barred_for(uuid) to service_role;
