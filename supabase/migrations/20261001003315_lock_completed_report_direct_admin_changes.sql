-- Prevent direct administrator updates/deletes of already completed reports.

drop policy if exists reports_admin_city_update on public.reports;
create policy reports_admin_city_update on public.reports as permissive for update to authenticated
using (reports.status <> 'resolved' and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin' and p.city_id = reports.city_id))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin' and p.city_id = reports.city_id));

drop policy if exists reports_admin_delete on public.reports;
create policy reports_admin_delete on public.reports as permissive for delete to authenticated
using (reports.status <> 'resolved' and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin' and p.city_id = reports.city_id));