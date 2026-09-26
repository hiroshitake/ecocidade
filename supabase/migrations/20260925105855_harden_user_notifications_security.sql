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
