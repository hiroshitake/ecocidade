create or replace function private.enforce_report_visibility_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.hidden_from_public is distinct from old.hidden_from_public then
    if not exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
        and p.city_id = old.city_id
        and p.city_id = new.city_id
    ) then
      raise exception 'not authorized to change report public visibility';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reports_protect_public_visibility on public.reports;
create trigger trg_reports_protect_public_visibility
before update on public.reports
for each row
execute function private.enforce_report_visibility_update();
