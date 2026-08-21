-- Create cities table (if not present) and validation trigger for server DB

CREATE TABLE IF NOT EXISTS public.cities (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  latitude double precision not null,
  longitude double precision not null,
  radius_m integer not null default 5000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Function to validate report location against city center
CREATE OR REPLACE FUNCTION public.validate_report_location()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  city_record record;
  user_city_id uuid;
  distance_m double precision;
BEGIN
  IF NEW.city_id IS NULL THEN
    SELECT city_id INTO user_city_id
    FROM public.profiles
    WHERE id = NEW.user_id
    LIMIT 1;

    IF user_city_id IS NULL THEN
      RAISE EXCEPTION 'Usuário sem cidade cadastrada.' USING errcode = 'P0001';
    END IF;

    NEW.city_id = user_city_id;
  END IF;

  SELECT * INTO city_record
  FROM public.cities
  WHERE id = NEW.city_id;

  IF city_record.id IS NULL THEN
    RAISE EXCEPTION 'Cidade do usuário não encontrada.' USING errcode = 'P0001';
  END IF;

  distance_m := 6371000 * acos(
    least(1,
      greatest(
        -1,
        sin(radians(city_record.latitude)) * sin(radians(NEW.latitude)) +
        cos(radians(city_record.latitude)) * cos(radians(NEW.latitude)) *
        cos(radians(NEW.longitude - city_record.longitude))
      )
    )
  );

  IF distance_m > city_record.radius_m THEN
    RAISE EXCEPTION 'Denúncia fora da área permitida da cidade.' USING errcode = 'P0001';
  END IF;

  NEW.city = city_record.name;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger
DROP TRIGGER IF EXISTS trg_reports_validate_location ON public.reports;
CREATE TRIGGER trg_reports_validate_location
BEFORE INSERT OR UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.validate_report_location();
