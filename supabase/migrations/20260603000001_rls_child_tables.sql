-- Blindaje 1.3 — RLS explícito en tablas hijas (barber_schedules y sale_items).
-- Estas tablas no tienen tenant_id propio: heredan el tenant de su tabla padre.
-- Patrón EXACTO del Paso 2: auth.jwt() ->> 'tenant_id' (NO se usa el claim por GUC),
-- igual que la política de `messages` (EXISTS sobre la tabla padre).
-- Un solo patrón de lectura del claim en todo el proyecto → test de aislamiento consistente.

-- Asegurar que RLS esté habilitado (idempotente)
alter table public.barber_schedules enable row level security;
alter table public.sale_items enable row level security;

-- barber_schedules: hereda el tenant de su barbero padre
drop policy if exists "tenant_isolation_barber_schedules" on public.barber_schedules;
create policy "tenant_isolation_barber_schedules" on public.barber_schedules
  for all
  to authenticated
  using (
    exists (
      select 1 from public.barbers b
      where b.id = barber_schedules.barber_id
        and b.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  )
  with check (
    exists (
      select 1 from public.barbers b
      where b.id = barber_schedules.barber_id
        and b.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- sale_items: hereda el tenant de su venta padre
drop policy if exists "tenant_isolation_sale_items" on public.sale_items;
create policy "tenant_isolation_sale_items" on public.sale_items
  for all
  to authenticated
  using (
    exists (
      select 1 from public.sales s
      where s.id = sale_items.sale_id
        and s.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  )
  with check (
    exists (
      select 1 from public.sales s
      where s.id = sale_items.sale_id
        and s.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );
