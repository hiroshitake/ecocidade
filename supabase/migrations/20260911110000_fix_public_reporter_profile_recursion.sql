-- Fix the reporter profile access path without making the profiles RLS policy
-- query reports. The previous policy caused a circular dependency during
-- report inserts: reports RLS queried profiles, while profiles RLS queried reports.

drop policy if exists "profiles_reporter_public_select" on public.profiles;

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
