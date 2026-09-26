-- 刪 A player can delete their own account, and with it everything the server holds on
-- them: the profile, the cloud copy, the standing, the titles and the sync log. The game
-- on their phone is untouched; it was never the server's to delete.
--
-- Required by the Play Store for any app with accounts, and right regardless.
create or replace function public.delete_me()
returns void language plpgsql security definer set search_path = public, auth as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  delete from public.sync_log where user_id = me;
  delete from public.titles where user_id = me;
  delete from auth.users where id = me;   -- profiles, saves and standings cascade from here
end $$;

revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;
