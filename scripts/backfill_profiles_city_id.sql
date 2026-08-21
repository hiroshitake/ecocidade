-- Script: Preencher `city_id` em `public.profiles` a partir do valor `city`
-- 1) Mostrar perfis que têm `city` mas `city_id` NULL (antes)
SELECT id, email, name, city, city_id FROM public.profiles WHERE city IS NOT NULL AND city_id IS NULL ORDER BY created_at DESC LIMIT 200;

-- 2) Tentar preencher `city_id` usando correspondência por nome (case-insensitive)
-- Observação: ajusta acentos e pequenos desvios podem causar não correspondência.
WITH mapped AS (
  SELECT p.id AS profile_id, c.id AS city_id
  FROM public.profiles p
  JOIN public.cities c ON lower(c.name) = lower(p.city)
  WHERE p.city IS NOT NULL AND p.city_id IS NULL
)
UPDATE public.profiles p
SET city_id = m.city_id,
    updated_at = now()
FROM mapped m
WHERE p.id = m.profile_id
RETURNING p.id, p.email, p.name, p.city, p.city_id;

-- 3) Mostrar quantos ainda permanecem sem city_id
SELECT count(*) AS remaining_without_city_id FROM public.profiles WHERE city IS NOT NULL AND city_id IS NULL;

-- 4) Exemplos não mapeados (para investigação manual)
SELECT id, email, name, city, city_id, created_at
FROM public.profiles
WHERE city IS NOT NULL AND city_id IS NULL
ORDER BY created_at DESC
LIMIT 200;

-- 5) Se desejar, forçar mapeamento aproximado usando ILIKE (cuidado: pode mapear incorretamente)
-- Exemplo: descomente para tentar uma correspondência mais flexível
-- WITH mapped_approx AS (
--   SELECT p.id AS profile_id, c.id AS city_id
--   FROM public.profiles p
--   JOIN public.cities c ON c.name ILIKE '%' || p.city || '%' OR p.city ILIKE '%' || c.name || '%'
--   WHERE p.city IS NOT NULL AND p.city_id IS NULL
-- )
-- UPDATE public.profiles p
-- SET city_id = m.city_id, updated_at = now()
-- FROM mapped_approx m
-- WHERE p.id = m.profile_id
-- RETURNING p.id, p.email, p.name, p.city, p.city_id;

-- Fim do script
