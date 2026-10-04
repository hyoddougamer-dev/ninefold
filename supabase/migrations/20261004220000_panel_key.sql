-- 鑰 A new panel key. Bruno, 2026-10-04: the old one was not on the phone he had with him,
-- and it lives only in a conversation, never in a file. Only its SHA-256 is here, as
-- 20260929020000_panel_notes.sql set up: panel_ok() is the one place the key is checked,
-- so the old key stops working the moment this deploys. The key itself was given to Bruno
-- in the chat.
create or replace function public.panel_ok(key text)
returns boolean language sql immutable set search_path = public as $$
  select encode(sha256(convert_to(coalesce(key, ''), 'UTF8')), 'hex') = '24d3f76bbded9d94aff97a8aeb1d76231554b37d17e5e1754b07634764cf3bf8'
$$;
revoke all on function public.panel_ok(text) from public, anon, authenticated;
