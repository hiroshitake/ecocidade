-- Exposes only the non-sensitive profile fields needed to identify a
-- reporter on the public report details modal. The avatars bucket remains private.
create or replace function public.get_public_reporters(user_ids uuid[])
returns table (
  id uuid,
  name text,
  avatar_path text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.name, p.avatar_path
  from public.profiles p
  where p.id = any(user_ids);
$$;

revoke all on function public.get_public_reporters(uuid[]) from public;
grant execute on function public.get_public_reporters(uuid[]) to authenticated;
