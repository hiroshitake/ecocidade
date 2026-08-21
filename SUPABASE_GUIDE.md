# Guia rápido do Supabase para Ecocidade

Este arquivo reúne os comandos mais úteis para:
- criar cidades
- atualizar usuários e admins
- ajustar a cidade no perfil
- validar denúncias por cidade
- manter o uso do app consistente

---

## 1) Ver as cidades cadastradas

```sql
select *
from public.cities
order by name;
```

---

## 2) Criar ou atualizar uma cidade

Use este padrão para adicionar ou ajustar uma cidade com latitude, longitude e raio:

```sql
insert into public.cities (name, latitude, longitude, radius_m)
values
  ('Morro Agudo', -20.7315, -48.3316, 7000),
  ('Orlândia', -20.7200, -48.9100, 7000),
  ('Sales Oliveira', -20.7800, -47.8400, 7000),
  ('Nuporanga', -21.7400, -49.2200, 7000)
on conflict (lower(name)) do update
set latitude = excluded.latitude,
    longitude = excluded.longitude,
    radius_m = excluded.radius_m,
    updated_at = now();
```

Se a tabela ainda não tiver a regra de unicidade, rode antes:

```sql
create unique index if not exists cities_name_unique
on public.cities (lower(name));
```

---

## 3) Criar a tabela de cidades, se ela ainda não existir

```sql
create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  latitude double precision,
  longitude double precision,
  radius_m integer default 5000,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.cities
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists radius_m integer default 5000,
  add column if not exists updated_at timestamptz default now();

create unique index if not exists cities_name_unique
on public.cities (lower(name));
```

---

## 4) Ver os perfis e cidades dos usuários

```sql
select id, email, name, role, city, city_id
from public.profiles
order by city, email;
```

---

## 5) Vincular um usuário a uma cidade

Você pode usar o nome da cidade ou o `city_id`.

### Via nome da cidade

```sql
update public.profiles
set city = 'Orlândia',
    city_id = (
      select id from public.cities where lower(name) = lower('Orlândia') limit 1
    )
where email = 'usuario@email.com';
```

### Via `city_id`

```sql
update public.profiles
set city = 'Morro Agudo',
    city_id = 'UUID_DA_CIDADE'
where email = 'usuario@email.com';
```

---

## 6) Criar ou atualizar um usuário comum

Se o usuário já foi criado no Supabase Auth, basta atualizar o perfil:

```sql
insert into public.profiles (id, email, name, role, city, city_id)
values (
  'UUID_DO_USUARIO',
  'usuario@email.com',
  'Usuário Teste',
  'user',
  'Morro Agudo',
  (select id from public.cities where lower(name) = lower('Morro Agudo') limit 1)
)
on conflict (id) do update
set email = excluded.email,
    name = excluded.name,
    role = excluded.role,
    city = excluded.city,
    city_id = excluded.city_id,
    updated_at = now();
```

---

## 7) Criar ou atualizar um admin

```sql
insert into public.profiles (id, email, name, role, city, city_id)
values (
  'UUID_DO_ADMIN',
  'admin@email.com',
  'Admin Morro Agudo',
  'admin',
  'Morro Agudo',
  (select id from public.cities where lower(name) = lower('Morro Agudo') limit 1)
)
on conflict (id) do update
set email = excluded.email,
    name = excluded.name,
    role = excluded.role,
    city = excluded.city,
    city_id = excluded.city_id,
    updated_at = now();
```

---

## 8) Criar usuários e admins em lote

```sql
insert into public.profiles (id, email, name, role, city, city_id)
values
  ('UUID_1', 'user_orlandia@email.com', 'Usuário Orlândia', 'user', 'Orlândia', (select id from public.cities where lower(name) = lower('Orlândia') limit 1)),
  ('UUID_2', 'user_salesoliveira@email.com', 'Usuário Sales Oliveira', 'user', 'Sales Oliveira', (select id from public.cities where lower(name) = lower('Sales Oliveira') limit 1)),
  ('UUID_3', 'user_nuporanga@email.com', 'Usuário Nuporanga', 'user', 'Nuporanga', (select id from public.cities where lower(name) = lower('Nuporanga') limit 1)),
  ('UUID_4', 'admin_orlandia@email.com', 'Admin Orlândia', 'admin', 'Orlândia', (select id from public.cities where lower(name) = lower('Orlândia') limit 1)),
  ('UUID_5', 'admin_salesoliveira@email.com', 'Admin Sales Oliveira', 'admin', 'Sales Oliveira', (select id from public.cities where lower(name) = lower('Sales Oliveira') limit 1)),
  ('UUID_6', 'admin_nuporanga@email.com', 'Admin Nuporanga', 'admin', 'Nuporanga', (select id from public.cities where lower(name) = lower('Nuporanga') limit 1))
on conflict (id) do update
set email = excluded.email,
    name = excluded.name,
    role = excluded.role,
    city = excluded.city,
    city_id = excluded.city_id,
    updated_at = now();
```

---

## 9) Verificar se o admin loga corretamente

O app de admin usa autenticação por e-mail + senha. Verifique se o usuário autenticado existe no Auth e o perfil tem `role = 'admin'`.

```sql
select id, email, name, role, city
from public.profiles
where role = 'admin';
```

---

## 10) Inserir uma denúncia de teste

Para testar se a denúncia respeita a cidade:

```sql
insert into public.reports (
  user_id,
  city,
  city_id,
  title,
  description,
  latitude,
  longitude,
  category,
  severity,
  status
)
values (
  'UUID_DO_USUARIO',
  'Morro Agudo',
  (select id from public.cities where lower(name) = lower('Morro Agudo') limit 1),
  'Buraco na rua - teste',
  'Denúncia de teste para validar geolocalização e cidade.',
  -20.7315,
  -48.3316,
  'buraco',
  'medium',
  'pending'
);
```

---

## 11) Ver as denúncias

```sql
select *
from public.reports
order by created_at desc;
```

---

## 12) Limpar duplicatas quando houver conflitos

```sql
delete from public.cities a
using public.cities b
where a.id > b.id
  and lower(a.name) = lower(b.name);
```

Depois, recrie o índice único:

```sql
create unique index if not exists cities_name_unique
on public.cities (lower(name));
```

---

## 13) Resolver FK bloqueando exclusão de cidade

Se a cidade tiver perfis referenciando ela:

```sql
select *
from public.profiles
where city_id = 'UUID_DA_CIDADE';
```

Se quiser liberar a remoção:

```sql
update public.profiles
set city_id = null,
    city = null
where city_id = 'UUID_DA_CIDADE';
```

---

## 14) Dica final

Use sempre este padrão para adicionar novas cidades:

```sql
insert into public.cities (name, latitude, longitude, radius_m)
values
  ('Nome da Cidade', -XX.XXXX, -XX.XXXX, 7000)
on conflict (lower(name)) do update
set latitude = excluded.latitude,
    longitude = excluded.longitude,
    radius_m = excluded.radius_m,
    updated_at = now();
```

Assim você evita duplicidade e consegue manter o app e o banco sincronizados.
