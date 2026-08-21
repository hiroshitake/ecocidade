-- Script: Verificar presença e valores das colunas `radius` / `radius_m`
-- Execute no Supabase SQL Editor ou com psql conectado ao banco

-- 1) Procurar colunas 'radius' ou 'radius_m' em todas as tabelas do schema public
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('radius', 'radius_m')
ORDER BY table_name, column_name;

-- 2) Mostrar definição de colunas em `public.cities` e `public.danger_zones`
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'cities'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'danger_zones'
ORDER BY ordinal_position;

-- 3) Amostra dos valores em `cities` (ver se radius_m está populado)
SELECT id, name, latitude, longitude, radius_m, created_at, updated_at
FROM public.cities
ORDER BY name
LIMIT 200;

-- 4) Amostra dos valores em `danger_zones` (ver radius)
SELECT id, name, latitude, longitude, radius, active, created_at
FROM public.danger_zones
ORDER BY created_at DESC
LIMIT 200;

-- 5) Se faltar a coluna, instruções opcionais para adicionar (descomente e ajuste se desejar)
-- ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS radius_m integer NOT NULL DEFAULT 5000;
-- ALTER TABLE public.danger_zones ADD COLUMN IF NOT EXISTS radius integer NOT NULL DEFAULT 300;

-- 6) Verificar se alguma cidade tem radius_m = 0 (valor incorreto)
SELECT count(*) AS cities_with_zero_radius FROM public.cities WHERE radius_m = 0;

-- 7) Verificar se há cidades sem latitude/longitude válidas
SELECT id, name, latitude, longitude FROM public.cities
WHERE NOT (latitude IS NOT NULL AND longitude IS NOT NULL)
LIMIT 50;

-- Fim do script
