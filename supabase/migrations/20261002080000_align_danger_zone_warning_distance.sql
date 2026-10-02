-- Keep the persisted danger-zone notification rule aligned with the
-- client-side 20m warning boundary.

create or replace function public.create_danger_zone_location_notification(
  p_danger_zone_id uuid,
  p_event text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
  zone_record record;
  previous_state text := 'outside';
  next_state text;
begin
  if current_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_event not in ('outside', 'near', 'inside') then
    raise exception 'Evento de área de perigo inválido.';
  end if;

  select id, name, radius, active
    into zone_record
  from public.danger_zones
  where id = p_danger_zone_id;

  if zone_record.id is null or zone_record.active is not true then
    return false;
  end if;

  select state
    into previous_state
  from public.danger_zone_user_states
  where user_id = current_user_id
    and danger_zone_id = p_danger_zone_id;

  next_state := p_event;

  if previous_state = next_state then
    update public.danger_zone_user_states
      set updated_at = now()
    where user_id = current_user_id
      and danger_zone_id = p_danger_zone_id;
    return false;
  end if;

  if previous_state = 'inside' and next_state = 'near' then
    insert into public.danger_zone_user_states (user_id, danger_zone_id, state, updated_at)
    values (current_user_id, p_danger_zone_id, next_state, now())
    on conflict (user_id, danger_zone_id)
    do update set state = excluded.state, updated_at = excluded.updated_at;
    return false;
  end if;

  if next_state = 'near' and previous_state <> 'inside' then
    insert into public.notifications (user_id, type, title, message)
    values (
      current_user_id,
      'danger_zone_near',
      'Área de perigo próxima',
      format(
        'Você está a até 20 m da borda da área de perigo "%s". Tenha atenção ao circular pelo local.',
        zone_record.name
      )
    );
  elsif next_state = 'inside' and previous_state <> 'inside' then
    insert into public.notifications (user_id, type, title, message)
    values (
      current_user_id,
      'danger_zone_entered',
      'Você entrou em uma área de perigo',
      format(
        'Você está dentro da área de perigo "%s". Tenha atenção ao circular pelo local.',
        zone_record.name
      )
    );
  end if;

  insert into public.danger_zone_user_states (user_id, danger_zone_id, state, updated_at)
  values (current_user_id, p_danger_zone_id, next_state, now())
  on conflict (user_id, danger_zone_id)
  do update set state = excluded.state, updated_at = excluded.updated_at;

  return next_state in ('near', 'inside');
end;
$function$;

revoke execute on function public.create_danger_zone_location_notification(uuid, text) from public;
revoke execute on function public.create_danger_zone_location_notification(uuid, text) from anon;
grant execute on function public.create_danger_zone_location_notification(uuid, text) to authenticated;
