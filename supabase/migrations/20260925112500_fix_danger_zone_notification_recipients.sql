-- Fix danger zone notification recipients for legacy profiles

update public.profiles p
set city_id = c.id,
    updated_at = now()
from public.cities c
where p.city_id is null
  and p.city is not null
  and lower(trim(p.city)) = lower(trim(c.name));

create or replace function public.notify_danger_zone_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.notifications (user_id, type, title, message)
  select
    p.id,
    'danger_zone_created',
    'Nova área de perigo',
    format(
      'Uma nova área de perigo foi criada: %s. Nível: %s.',
      new.name,
      coalesce(new.severity, 'media')
    )
  from public.profiles p
  left join public.cities c on c.id = new.city_id
  where p.role = 'user'
    and (
      new.city_id is null
      or p.city_id = new.city_id
      or (
        p.city_id is null
        and p.city is not null
        and c.name is not null
        and lower(trim(p.city)) = lower(trim(c.name))
      )
    );

  return new;
end;
$function$;

revoke execute on function public.notify_danger_zone_created() from public;
revoke execute on function public.notify_danger_zone_created() from anon;
revoke execute on function public.notify_danger_zone_created() from authenticated;
