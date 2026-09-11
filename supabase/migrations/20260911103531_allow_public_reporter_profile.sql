-- Allow authenticated users to read only the name/avatar of users who have
-- at least one public (non-security) report. Email and other profile fields
-- remain excluded from the query and are not exposed by this policy.
drop policy if exists "profiles_reporter_public_select" on public.profiles;

create policy "profiles_reporter_public_select"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.reports
    where reports.user_id = profiles.id
      and lower(coalesce(reports.category, '')) <> 'seguranca'
  )
);
