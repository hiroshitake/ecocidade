-- Danger zone notifications and proximity state tracking

alter table public.danger_zones
  add column if not exists city_id uuid references public.cities(id) on delete set null;

create index if not exists danger_zones_city_id_idx
  on public.danger_zones(city_id);

create table if not exists public.danger_zone_user_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  danger_zone_id uuid not null references public.danger_zones(id) on delete cascade,
  state text not null default 'outside',
  updated_at timestamptz not null default now(),
  primary key (user_id, danger_zone_id),
  constraint danger_zone_user_states_state_check
    check (state in ('outside', 'near', 'inside'))
);

alter table public.danger_zone_user_states enable row level security;

drop policy if exists "Users can view own danger zone states" on public.danger_zone_user_states;
create policy "Users can view own danger zone states"
  on public.danger_zone_user_states
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own danger zone states" on public.danger_zone_user_states;
create policy "Users can create own danger zone states"
  on public.danger_zone_user_states
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own danger zone states" on public.danger_zone_user_states;
create policy "Users can update own danger zone states"
  on public.danger_zone_user_states
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

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
  where p.role = 'user'
    and (
      new.city_id is null
      or p.city_id = new.city_id
    );

  return new;
end;
$function$;

drop trigger if exists danger_zones_notify_created on public.danger_zones;
create trigger danger_zones_notify_created
after insert on public.danger_zones
for each row execute function public.notify_danger_zone_created();

revoke execute on function public.notify_danger_zone_created() from public;
revoke execute on function public.notify_danger_zone_created() from anon;
revoke execute on function public.notify_danger_zone_created() from authenticated;

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
        'Você está a até 200 m da área de perigo "%s". Tenha atenção ao circular pelo local.',
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
