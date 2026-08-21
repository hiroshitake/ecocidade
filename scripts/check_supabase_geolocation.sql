-- Script: Verificar validade da validação de localização no Supabase
-- Use na Supabase SQL Editor ou via psql conectado ao banco

-- 1) Verificar se a função de validação existe e mostrar sua definição
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
WHERE p.proname = 'validate_report_location';

-- 2) Verificar se o trigger existe na tabela de reports
SELECT
  t.tgname AS trigger_name,
  t.tgenabled AS enabled,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
WHERE t.tgname = 'trg_reports_validate_location';

-- 3) Perfis sem city_id (usuários com cidade ausente no perfil)
SELECT count(*) AS profiles_missing_city_id FROM public.profiles WHERE city_id IS NULL;

SELECT id, email, name, city, city_id, created_at
FROM public.profiles
WHERE city_id IS NULL
ORDER BY created_at DESC
LIMIT 100;

-- 4) Denúncias sem city_id (inseridas sem referência de cidade)
SELECT count(*) AS reports_missing_city_id FROM public.reports WHERE city_id IS NULL;

SELECT id, user_id, city, city_id, latitude, longitude, created_at
FROM public.reports
WHERE city_id IS NULL
ORDER BY created_at DESC
LIMIT 200;

-- 5) Denúncias cuja distância até o centro da cidade é maior que o raio (fora da área)
-- Usa a mesma fórmula presente na trigger `validate_report_location` (Haversine-approx via acos)
SELECT
  r.id,
  r.user_id,
  r.city,
  r.city_id,
  r.latitude,
  r.longitude,
  c.name AS city_name,
  c.latitude AS city_lat,
  c.longitude AS city_lon,
  c.radius_m,
  6371000 * acos(
    least(1, greatest(-1,
      sin(radians(c.latitude)) * sin(radians(r.latitude)) +
      cos(radians(c.latitude)) * cos(radians(r.latitude)) *
      cos(radians(r.longitude - c.longitude))
    ))
  ) AS distance_m
FROM public.reports r
JOIN public.cities c ON c.id = r.city_id
WHERE
  6371000 * acos(
    least(1, greatest(-1,
      sin(radians(c.latitude)) * sin(radians(r.latitude)) +
      cos(radians(c.latitude)) * cos(radians(r.latitude)) *
      cos(radians(r.longitude - c.longitude))
    ))
  ) > c.radius_m
ORDER BY distance_m DESC
LIMIT 200;

-- 6) Denúncias fora da área nos últimos 7 dias (ajuste intervalo conforme necessário)
SELECT
  r.id,
  r.user_id,
  r.city_id,
  r.latitude,
  r.longitude,
  r.created_at,
  c.name AS city_name,
  c.radius_m,
  6371000 * acos(
    least(1, greatest(-1,
      sin(radians(c.latitude)) * sin(radians(r.latitude)) +
      cos(radians(c.latitude)) * cos(radians(r.latitude)) *
      cos(radians(r.longitude - c.longitude))
    ))
  ) AS distance_m
FROM public.reports r
JOIN public.cities c ON c.id = r.city_id
WHERE r.created_at >= now() - interval '7 days'
  AND (
    6371000 * acos(
      least(1, greatest(-1,
        sin(radians(c.latitude)) * sin(radians(r.latitude)) +
        cos(radians(c.latitude)) * cos(radians(r.latitude)) *
        cos(radians(r.longitude - c.longitude))
      ))
    )
  ) > c.radius_m
ORDER BY distance_m DESC;

-- 7) Contagem geral de denúncias e quantas têm city_id inconsistente com profiles
SELECT count(*) AS total_reports FROM public.reports;

-- Reports que têm city_id diferente do city_id do profile do usuário (se houver user_id)
SELECT
  count(*) AS reports_mismatched_user_city
FROM public.reports r
LEFT JOIN public.profiles p ON p.id = r.user_id
WHERE r.user_id IS NOT NULL
  AND p.city_id IS NOT NULL
  AND r.city_id IS NOT NULL
  AND r.city_id <> p.city_id;

-- 8) Sugestão: listar alguns exemplos para investigação manual
SELECT r.id, r.user_id, r.city, r.city_id, p.city_id AS profile_city_id, r.latitude, r.longitude, r.created_at
FROM public.reports r
LEFT JOIN public.profiles p ON p.id = r.user_id
WHERE (r.city_id IS NULL OR p.city_id IS NULL OR r.city_id <> p.city_id)
ORDER BY r.created_at DESC
LIMIT 200;

-- Fim do script
