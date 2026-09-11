alter table public.reports add column if not exists hidden_from_public boolean not null default false;

create index if not exists reports_public_visibility_idx on public.reports (status, resolved_at, hidden_from_public);

drop policy if exists "reports_select_public" on public.reports;
create policy "reports_select_public"
on public.reports
for select
to public
using (
  category <> 'seguranca'
  and hidden_from_public = false
  and (
    status <> 'resolved'
    or resolved_at is null
    or resolved_at > now() - interval '3 days'
  )
);

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
on public.reports
for select
to public
using (
  (select auth.uid()) = user_id
  and hidden_from_public = false
  and (
    status <> 'resolved'
    or resolved_at is null
    or resolved_at > now() - interval '3 days'
  )
);

drop policy if exists "reports_admin_delete" on public.reports;
create policy "reports_admin_delete"
on public.reports
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.city_id = reports.city_id
  )
);

create or replace function public.set_report_public_visibility(p_report_id uuid, p_hidden boolean)
returns public.reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_report public.reports;
begin
  if not exists (
    select 1
    from public.profiles p
    join public.reports r on r.city_id = p.city_id
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and r.id = p_report_id
  ) then
    raise exception 'not authorized';
  end if;

  update public.reports
  set hidden_from_public = p_hidden,
      updated_at = now()
  where id = p_report_id
  returning * into updated_report;

  return updated_report;
end;
$$;

revoke all on function public.set_report_public_visibility(uuid, boolean) from public;
revoke all on function public.set_report_public_visibility(uuid, boolean) from anon;
grant execute on function public.set_report_public_visibility(uuid, boolean) to authenticated;

create or replace function private.delete_old_resolved_reports()
returns void
language sql
security definer
set search_path = 'pg_catalog', 'public'
as $$
  delete from public.reports
  where status = 'resolved'
    and resolved_at is not null
    and resolved_at <= now() - interval '10 days';
$$;
