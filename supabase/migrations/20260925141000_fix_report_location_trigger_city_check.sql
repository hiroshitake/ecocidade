create or replace function public.validate_report_location()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  city_record record;
  user_city_id uuid;
  distance_m double precision;
begin
  if new.user_id is null then
    new.updated_at := now();
    return new;
  end if;

  if new.city_id is null then
    select p.city_id into user_city_id
    from public.profiles p
    where p.id = new.user_id
    limit 1;

    if user_city_id is null then
      raise exception 'Usuário sem cidade cadastrada.' using errcode = 'P0001';
    end if;

    new.city_id := user_city_id;
  end if;

  select c.id, c.name, c.latitude, c.longitude, c.radius_m
  into city_record
  from public.cities c
  where c.id = new.city_id;

  if city_record.id is null then
    raise exception 'Cidade do usuário não encontrada.' using errcode = 'P0001';
  end if;

  distance_m := 6371000 * acos(
    least(1,
      greatest(
        -1,
        sin(radians(city_record.latitude)) * sin(radians(new.latitude)) +
        cos(radians(city_record.latitude)) * cos(radians(new.latitude)) *
        cos(radians(new.longitude - city_record.longitude))
      )
    )
  );

  if distance_m > city_record.radius_m then
    raise exception 'Denúncia fora da área permitida da cidade.' using errcode = 'P0001';
  end if;

  new.city := city_record.name;
  new.updated_at := now();
  return new;
end;
$$;
