create extension if not exists "uuid-ossp";

create table if not exists public.cities (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  latitude double precision not null,
  longitude double precision not null,
  radius_m integer not null default 5000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  name text,
  role text default 'user',
  city text,
  city_id uuid references public.cities(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  city text,
  city_id uuid references public.cities(id),
  title text not null,
  description text not null,
  latitude double precision not null,
  longitude double precision not null,
  category text not null,
  image_url text,
  severity text not null default 'medium',
  status text not null default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.danger_zones (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  latitude double precision not null,
  longitude double precision not null,
  radius integer not null default 300,
  severity text not null default 'media',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into public.cities (name, latitude, longitude, radius_m)
values
  ('Orlândia', -20.7200, -48.9100, 7000),
  ('Sales Oliveira', -20.7800, -47.8400, 7000),
  ('Nuporanga', -21.7400, -49.2200, 7000)
on conflict (name) do update
set latitude = excluded.latitude,
    longitude = excluded.longitude,
    radius_m = excluded.radius_m,
    updated_at = now();

alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.cities enable row level security;
alter table public.danger_zones enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;
drop policy if exists "profiles_self_insert" on public.profiles;
drop policy if exists "reports_select_public" on public.reports;
drop policy if exists "reports_insert_public" on public.reports;
drop policy if exists "reports_update_public" on public.reports;
drop policy if exists "cities_select_public" on public.cities;
drop policy if exists "cities_insert_public" on public.cities;
drop policy if exists "danger_zones_select" on public.danger_zones;
drop policy if exists "danger_zones_insert" on public.danger_zones;

create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles_self_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "cities_select_public" on public.cities
  for select using (true);

create policy "cities_insert_public" on public.cities
  for insert with check (true);

create policy "reports_select_public" on public.reports
  for select using (true);

create policy "reports_insert_public" on public.reports
  for insert with check (true);

create policy "reports_update_public" on public.reports
  for update using (true) with check (true);

create policy "danger_zones_select" on public.danger_zones
  for select using (true);

create policy "danger_zones_insert" on public.danger_zones
  for insert with check (true);

create or replace function public.sync_profile_city_reference()
returns trigger
language plpgsql
as $$
begin
  if new.city is not null and new.city <> '' then
    select id into new.city_id
    from public.cities
    where lower(name) = lower(new.city)
    limit 1;
  elsif new.city_id is not null then
    select name into new.city
    from public.cities
    where id = new.city_id
    limit 1;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.validate_report_location()
returns trigger
language plpgsql
as $$
declare
  city_record record;
  user_city_id uuid;
  distance_m double precision;
begin
  if new.city_id is null then
    select city_id into user_city_id
    from public.profiles
    where id = new.user_id;

    if user_city_id is null then
      raise exception 'Usuário sem cidade cadastrada.' using errcode = 'P0001';
    end if;

    new.city_id = user_city_id;
  end if;

  select * into city_record
  from public.cities
  where id = new.city_id;

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

  new.city = city_record.name;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_city_sync on public.profiles;
drop trigger if exists trg_reports_validate_location on public.reports;

create trigger trg_profiles_city_sync
before insert or update on public.profiles
for each row
execute function public.sync_profile_city_reference();

create trigger trg_reports_validate_location
before insert or update on public.reports
for each row
execute function public.validate_report_location();
