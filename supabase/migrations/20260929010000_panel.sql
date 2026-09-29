-- 師 The developer's own view of the players, behind a key only he holds.
--
-- Bruno: "eu quero ter acesso aos nomes neste painel e tempo de jogo para eu perceber se
-- são ativos e que recompensas posteriormente dar no lançamento", and then, by name:
-- "autorizo o painel privado de jogadores com chave". That is per player, so it cannot be
-- public like stats(). The panel sends a key; only its SHA-256 lives here, and a random
-- key of 24 characters cannot be worked back from its hash. A new key is a new migration
-- with a new hash; the old one stops working the moment it deploys.
--
-- What comes back is what the rewards question needs and nothing more: the public name,
-- how far the verified save stands, when the player joined, began and was last seen, on
-- how many days they synced, whether the account has an email (never the email itself),
-- and whether the anti-cheat holds them.
create or replace function public.panel_players(key text)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  if encode(sha256(convert_to(coalesce(key, ''), 'UTF8')), 'hex') <> '2ee78e72ab366eb03c4495ee03430ac3c629d5673623855403dcc0d82e6c4fcc' then
    raise exception 'wrong key';
  end if;
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
        'held', p.suspect or p.banned or p.strikes > 0
      ) as r
      from profiles p
      left join saves v on v.user_id = p.id
      left join standings s on s.user_id = p.id
      left join auth.users u on u.id = p.id
    ) x), '[]'::jsonb);
end $$;
revoke all on function public.panel_players(text) from public;
grant execute on function public.panel_players(text) to anon, authenticated;
