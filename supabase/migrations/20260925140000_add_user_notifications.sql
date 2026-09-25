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


create index if not exists notifications_report_id_idx
  on public.notifications (report_id);

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can mark own notifications as read" on public.notifications;
create policy "Users can mark own notifications as read"
  on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke execute on function public.create_report_notification() from anon;
revoke execute on function public.create_report_notification() from authenticated;
revoke execute on function public.create_report_status_notification() from anon;
revoke execute on function public.create_report_status_notification() from authenticated;
