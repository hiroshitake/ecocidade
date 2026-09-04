-- Permite que administradores autenticados consultem nome/e-mail dos denunciantes.
-- A função fica em um schema não exposto para evitar disponibilizá-la como API pública.

create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

drop policy if exists "profiles_admin_select" on public.profiles;
create policy "profiles_admin_select" on public.profiles
  for select
  to authenticated
  using (auth.uid() = id or private.is_admin());
