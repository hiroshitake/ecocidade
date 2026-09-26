drop policy if exists "danger_zones_insert" on public.danger_zones;

create policy "danger_zones_admin_insert_city"
on public.danger_zones
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.city_id = danger_zones.city_id
  )
);

drop policy if exists "danger_zones_admin_delete_city" on public.danger_zones;

create policy "danger_zones_admin_delete_city"
on public.danger_zones
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.city_id = danger_zones.city_id
  )
);
