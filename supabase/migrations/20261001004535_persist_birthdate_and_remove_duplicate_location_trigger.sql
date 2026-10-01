-- Persist the birth date collected during registration.
alter table public.profiles
  add column if not exists birthdate date;

-- Keep a single report-location validation trigger.
drop trigger if exists trg_validate_report_location on public.reports;
