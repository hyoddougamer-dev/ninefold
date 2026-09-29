-- 脈 The pulse: what the test looks like from above, for the developer's panel (/painel/).
--
-- Bruno: "existe forma de criares uma app ou mini controlador, para perceber número de
-- players, rankings, etc, sem usar N aplicações e sites?" The panel is a page on the
-- game's own site, so it reads only what may be public: counts, never a row. No id, no
-- email, no save leaves through here; the names it shows are the ones the public boards
-- already show (board()). Everything below is a total or a distribution.
--
-- pulse keeps one row an hour, written by .github/workflows/watch.yml, so the panel can
-- draw how the test grew: players, who was active, and the Discord server beside them.
create table if not exists public.pulse (
  at              timestamptz primary key default now(),
  players         int not null,
  active24        int not null,
  discord_members int,
  discord_online  int
);
alter table public.pulse enable row level security;
revoke all on public.pulse from anon, authenticated;

create or replace function public.stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'at', now(),
    'players', (select count(*) from profiles),
    'new24', (select count(*) from profiles where created_at > now() - interval '24 hours'),
    'new7', (select count(*) from profiles where created_at > now() - interval '7 days'),
    'active24', (select count(*) from saves where last_sync > now() - interval '24 hours'),
    'active7', (select count(*) from saves where last_sync > now() - interval '7 days'),
    'syncs24', (select count(*) from sync_log where at > now() - interval '24 hours'),
    'refused24', (select count(*) from sync_log where at > now() - interval '24 hours' and not ok),
    'strikes24', (select count(*) from sync_log where at > now() - interval '24 hours' and strike),
    'held', (select count(*) from profiles where suspect or banned or strikes > 0),
    'realms', coalesce((
      select jsonb_agg(jsonb_build_object('realm', r, 'players', n) order by r)
        from (select least(greatest(coalesce((verified->>'realm')::int, 1), 1), 9) as r, count(*) as n
                from saves group by 1) x), '[]'::jsonb),
    'pulse', coalesce((
      select jsonb_agg(jsonb_build_object('at', at, 'players', players, 'active24', active24,
                                          'discord', discord_members, 'online', discord_online) order by at)
        from pulse where at > now() - interval '30 days'), '[]'::jsonb)
  )
$$;
revoke all on function public.stats() from public;
grant execute on function public.stats() to anon, authenticated;

-- Written by the hourly watch, as the service it runs as; never by a player.
create or replace function public.take_pulse(members int, online int)
returns void language sql security definer set search_path = public as $$
  insert into pulse (at, players, active24, discord_members, discord_online)
  select date_trunc('hour', now()), (select count(*) from profiles),
         (select count(*) from saves where last_sync > now() - interval '24 hours'), members, online
  on conflict (at) do update set players = excluded.players, active24 = excluded.active24,
    discord_members = excluded.discord_members, discord_online = excluded.discord_online
$$;
revoke all on function public.take_pulse(int, int) from public, anon, authenticated;
grant execute on function public.take_pulse(int, int) to service_role;
