-- Notify the reporter one day before a resolved report leaves public visibility.
-- The existing pg_cron job continues to call private.delete_old_resolved_reports().
create or replace function private.delete_old_resolved_reports()
returns void
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
begin
  insert into public.notifications (user_id, report_id, type, title, message)
  select
    r.user_id,
    r.id,
    'report_visibility_expiring',
    'Sua denúncia será ocultada em breve',
    'Sua denúncia concluída deixará de aparecer para os usuários em aproximadamente 1 dia.'
  from public.reports r
  where r.status = 'resolved'
    and r.resolved_at is not null
    and r.resolved_at <= now() - interval '2 days'
    and r.resolved_at > now() - interval '3 days'
    and r.user_id is not null
    and not exists (
      select 1
      from public.notifications n
      where n.report_id = r.id
        and n.user_id = r.user_id
        and n.type = 'report_visibility_expiring'
    );

  delete from public.reports
  where status = 'resolved'
    and resolved_at is not null
    and resolved_at <= now() - interval '10 days';
end;
$$;
