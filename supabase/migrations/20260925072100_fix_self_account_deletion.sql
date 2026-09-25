create or replace function public.delete_current_user()
returns boolean language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); deleted boolean := false;
begin
  if current_user_id is null then raise exception 'not authenticated'; end if;
  update public.reports set user_id = null where user_id = current_user_id;
  delete from public.profiles where id = current_user_id;
  delete from auth.users where id = current_user_id;
  if found then deleted := true; end if;
  if not deleted then raise exception 'user not found'; end if;
  return true;
end; $$;
revoke execute on function public.delete_current_user() from public;
revoke execute on function public.delete_current_user() from anon;
grant execute on function public.delete_current_user() to authenticated;