create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid null references public.reports(id) on delete set null,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_at_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read)
  where read = false;

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can mark own notifications as read" on public.notifications;
create policy "Users can mark own notifications as read"
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.create_report_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is null then
    return new;
  end if;

  insert into public.notifications (user_id, report_id, type, title, message)
  values (
    new.user_id,
    new.id,
    'report_created',
    'Denúncia registrada',
    'Sua denúncia foi recebida e está aguardando análise.'
  );

  return new;
end;
$$;

drop trigger if exists reports_notify_created on public.reports;
create trigger reports_notify_created
after insert on public.reports
for each row
execute function public.create_report_notification();

create or replace function public.create_report_status_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is null or new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'in_progress' then
    insert into public.notifications (user_id, report_id, type, title, message)
    values (
      new.user_id,
      new.id,
      'report_in_progress',
      'Denúncia em análise',
      'Sua denúncia está sendo analisada pela equipe responsável.'
    );
  elsif new.status = 'resolved' then
    insert into public.notifications (user_id, report_id, type, title, message)
    values (
      new.user_id,
      new.id,
      'report_resolved',
      'Denúncia concluída',
      'Sua denúncia foi marcada como concluída.'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists reports_notify_status_changed on public.reports;
create trigger reports_notify_status_changed
after update of status on public.reports
for each row
execute function public.create_report_status_notification();

revoke all on function public.create_report_notification() from public;
revoke all on function public.create_report_status_notification() from public;
