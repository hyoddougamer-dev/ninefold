-- 師 The panel can now act, a little: a note on a player, and a flag taken off.
--
-- Bruno: "adiciona só uma opção para limpar a marcação e um campo de obs para dizeres o
-- que foi alterado. No caso do Jerokhna foi um teste." A strike is the anti-cheat's word,
-- and a person may overrule it when they know why it happened; the note is where they say
-- why, so the next person to look knows too.
--
-- The key check moves into panel_ok(), so a new key is one function with one hash.
-- Clearing a flag is all it does: strikes to nothing, suspect and banned off. It does not
-- rank anything. A save that could not have been played is still refused on every sync
-- after, because that is verify.ts on the save, not a flag on the player.
create or replace function public.panel_ok(key text)
returns boolean language sql immutable set search_path = public as $$
  select encode(sha256(convert_to(coalesce(key, ''), 'UTF8')), 'hex') = '2ee78e72ab366eb03c4495ee03430ac3c629d5673623855403dcc0d82e6c4fcc'
$$;
revoke all on function public.panel_ok(text) from public, anon, authenticated;

create table if not exists public.panel_notes (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  note       text not null default '' check (char_length(note) <= 500),
  cleared_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.panel_notes enable row level security;
revoke all on public.panel_notes from anon, authenticated;

create or replace function public.panel_players(key text)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not panel_ok(key) then raise exception 'wrong key'; end if;
  return coalesce((
    select jsonb_agg(r order by (r->>'last_seen') desc nulls last)
    from (
      select jsonb_build_object(
        'name', p.name,
        'joined', p.created_at,
        'last_seen', v.last_sync,
        'started', case when coalesce(v.verified->>'startedAt', v.latest->>'startedAt') ~ '^[0-9]+(\.[0-9]+)?$'
                        then to_timestamp(coalesce(v.verified->>'startedAt', v.latest->>'startedAt')::double precision) end,
        'realm', coalesce((v.verified->>'realm')::int, 1),
        'layer', coalesce((v.verified->>'layer')::int, 0),
        'climb', coalesce(s.climb, 0),
        'marks', coalesce(s.marks, 0),
        'tower', coalesce(s.tower, 0),
        'days', (select count(distinct date(l.at)) from sync_log l where l.user_id = p.id),
        'syncs7', (select count(*) from sync_log l where l.user_id = p.id and l.at > now() - interval '7 days'),
        'email', coalesce(u.email, '') <> '',
        'held', p.suspect or p.banned or p.strikes > 0,
        'note', coalesce(n.note, ''),
        'cleared', n.cleared_at
      ) as r
      from profiles p
      left join saves v on v.user_id = p.id
      left join standings s on s.user_id = p.id
      left join auth.users u on u.id = p.id
      left join panel_notes n on n.user_id = p.id
    ) x), '[]'::jsonb);
end $$;
revoke all on function public.panel_players(text) from public;
grant execute on function public.panel_players(text) to anon, authenticated;

-- 註 A note on a player, found by the name the boards show (names are unique).
create or replace function public.panel_note(key text, player text, note text)
returns void language plpgsql security definer set search_path = public as $$
declare who uuid;
begin
  if not panel_ok(key) then raise exception 'wrong key'; end if;
  select id into who from profiles where lower(name) = lower(btrim(player));
  if who is null then raise exception 'no such player'; end if;
  insert into panel_notes (user_id, note) values (who, left(coalesce(note, ''), 500))
  on conflict (user_id) do update set note = excluded.note, updated_at = now();
end $$;
revoke all on function public.panel_note(text, text, text) from public;
grant execute on function public.panel_note(text, text, text) to anon, authenticated;

-- 清 A flag taken off, with the note saying why, and the day it was done kept beside it.
create or replace function public.panel_clear(key text, player text, note text)
returns void language plpgsql security definer set search_path = public as $$
declare who uuid;
begin
  if not panel_ok(key) then raise exception 'wrong key'; end if;
  select id into who from profiles where lower(name) = lower(btrim(player));
  if who is null then raise exception 'no such player'; end if;
  update profiles set strikes = 0, suspect = false, banned = false where id = who;
  insert into panel_notes (user_id, note, cleared_at) values (who, left(coalesce(note, ''), 500), now())
  on conflict (user_id) do update set note = excluded.note, cleared_at = now(), updated_at = now();
end $$;
revoke all on function public.panel_clear(text, text, text) from public;
grant execute on function public.panel_clear(text, text, text) to anon, authenticated;
