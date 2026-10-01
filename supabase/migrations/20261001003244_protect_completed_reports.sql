-- Protect completed reports from manual administrator changes.

create or replace function public.admin_update_report_status(p_report_id uuid, p_status text)
returns public.reports
language plpgsql
security definer
set search_path = ''
as $function$
declare updated_report public.reports;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_status not in ('pending', 'in_progress', 'resolved') then raise exception 'invalid report status'; end if;
  if exists (select 1 from public.reports as r where r.id = p_report_id and r.status = 'resolved') then raise exception 'completed reports cannot be changed'; end if;
  update public.reports as r set status = p_status, updated_at = now()
  where r.id = p_report_id and exists (select 1 from public.profiles as p where p.id = auth.uid() and p.role = 'admin' and p.city_id = r.city_id)
  returning r.* into updated_report;
  if updated_report.id is null then raise exception 'not authorized or report not found'; end if;
  return updated_report;
end;
$function$;

create or replace function public.admin_delete_report(p_report_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare deleted_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.reports as r where r.id = p_report_id and r.status = 'resolved') then raise exception 'completed reports cannot be deleted manually'; end if;
  delete from public.reports as r where r.id = p_report_id and exists (select 1 from public.profiles as p where p.id = auth.uid() and p.role = 'admin' and p.city_id = r.city_id)
  returning r.id into deleted_id;
  if deleted_id is null then raise exception 'not authorized or report not found'; end if;
  return deleted_id;
end;
$function$;

create or replace function public.set_report_public_visibility(p_report_id uuid, p_hidden boolean)
returns public.reports
language plpgsql
security definer
set search_path = ''
as $function$
declare updated_report public.reports;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.reports as r where r.id = p_report_id and r.status = 'resolved') then raise exception 'completed reports cannot change public visibility'; end if;
  update public.reports as r set hidden_from_public = p_hidden, updated_at = now()
  where r.id = p_report_id and exists (select 1 from public.profiles as p where p.id = auth.uid() and p.role = 'admin' and p.city_id = r.city_id)
  returning r.* into updated_report;
  if updated_report.id is null then raise exception 'not authorized or report not found'; end if;
  return updated_report;
end;
$function$;