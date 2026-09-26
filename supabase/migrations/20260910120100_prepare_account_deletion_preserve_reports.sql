alter table public.reports
  drop constraint if exists reports_user_id_fkey;

alter table public.reports
  add constraint reports_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete set null;

alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id)
  references auth.users(id)
  on delete cascade;