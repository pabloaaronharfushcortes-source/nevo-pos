-- =====================================================================
-- Migration 4: cash_registers + sales + sale_items + commissions
-- =====================================================================
-- Tablas transaccionales. `sales` referencia múltiples padres; `sale_items`
-- y `commissions` cuelgan de `sales`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- TABLA: cash_registers (cortes de caja)
-- ---------------------------------------------------------------------
create table public.cash_registers (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete restrict,
  cashier_id      uuid not null references public.users (id) on delete restrict,
  opened_at       timestamptz   not null default now(),
  closed_at       timestamptz,
  opening_amount  decimal(10,2) not null,
  closing_amount  decimal(10,2),
  expected_amount decimal(10,2),
  difference      decimal(10,2),
  notes           text
);

create index cash_registers_tenant_id_idx  on public.cash_registers (tenant_id);
create index cash_registers_cashier_id_idx on public.cash_registers (cashier_id);
create index cash_registers_open_idx       on public.cash_registers (tenant_id) where closed_at is null;

comment on column public.cash_registers.expected_amount is
  'Calculado: opening_amount + ventas en efectivo del turno.';
comment on column public.cash_registers.difference is
  'closing_amount - expected_amount. Negativo = faltante.';

-- ---------------------------------------------------------------------
-- TABLA: sales
-- ---------------------------------------------------------------------
create table public.sales (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete restrict,
  appointment_id    uuid references public.appointments (id)  on delete set null,
  queue_ticket_id   uuid references public.queue_tickets (id) on delete set null,
  client_id         uuid references public.clients (id)       on delete set null,
  barber_id         uuid not null references public.barbers (id) on delete restrict,
  cashier_id        uuid not null references public.users (id)   on delete restrict,
  cash_register_id  uuid references public.cash_registers (id)   on delete set null,
  subtotal          decimal(10,2) not null,
  discount          decimal(10,2) not null default 0,
  total             decimal(10,2) not null,
  payment_method    text not null
                      check (payment_method in ('cash','clip','getnet','transfer')),
  payment_reference text,
  notes             text,
  created_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  check (subtotal >= 0),
  check (discount >= 0),
  check (total    >= 0)
);

create index sales_tenant_id_created_at_idx on public.sales (tenant_id, created_at desc);
create index sales_barber_id_idx            on public.sales (barber_id);
create index sales_cash_register_id_idx     on public.sales (cash_register_id);
create index sales_appointment_id_idx       on public.sales (appointment_id);
create index sales_queue_ticket_id_idx      on public.sales (queue_ticket_id);

comment on column public.sales.deleted_at is
  'Soft delete. Toda lectura productiva debe filtrar deleted_at IS NULL.';

-- ---------------------------------------------------------------------
-- TABLA: sale_items
-- ---------------------------------------------------------------------
-- product_id queda sin FK hasta que la tabla `products` exista en Fase 2.
-- Por ahora es un uuid suelto que se mantendrá nulo (sólo servicios en Fase 1).
create table public.sale_items (
  id         uuid primary key default gen_random_uuid(),
  sale_id    uuid not null references public.sales (id) on delete cascade,
  type       text not null check (type in ('service','product')),
  name       text not null,
  price      decimal(10,2) not null,
  quantity   int not null default 1 check (quantity > 0),
  subtotal   decimal(10,2) not null,
  service_id uuid references public.services (id) on delete set null,
  product_id uuid,                                                   -- FK se agrega en Fase 2
  check (price >= 0),
  check (subtotal >= 0)
);

create index sale_items_sale_id_idx on public.sale_items (sale_id);

comment on column public.sale_items.name is
  'Snapshot del nombre del servicio/producto al momento de la venta.';
comment on column public.sale_items.price is
  'Snapshot del precio al momento de la venta (independiente del catálogo actual).';
comment on column public.sale_items.product_id is
  'FK a public.products se agrega en migration de Fase 2.';

-- ---------------------------------------------------------------------
-- TABLA: commissions
-- ---------------------------------------------------------------------
create table public.commissions (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete restrict,
  barber_id    uuid not null references public.barbers (id) on delete restrict,
  sale_id      uuid not null references public.sales (id) on delete restrict,
  amount       decimal(10,2) not null,
  rate         decimal(5,2)  not null,
  period_start date not null,
  period_end   date not null,
  status       text not null default 'pending'
                 check (status in ('pending','paid')),
  paid_at      timestamptz,
  created_at   timestamptz not null default now(),
  check (period_end >= period_start),
  check (amount >= 0)
);

create index commissions_tenant_id_period_idx on public.commissions (tenant_id, period_start, period_end);
create index commissions_barber_id_status_idx on public.commissions (barber_id, status);
create unique index commissions_unique_per_sale on public.commissions (sale_id);

comment on column public.commissions.rate is
  'Snapshot del commission_rate del barbero al momento de calcular.';

-- ---------------------------------------------------------------------
-- RLS — cash_registers
-- ---------------------------------------------------------------------
alter table public.cash_registers enable row level security;

create policy tenant_isolation on public.cash_registers
  for all
  to authenticated
  using      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ---------------------------------------------------------------------
-- RLS — sales
-- ---------------------------------------------------------------------
alter table public.sales enable row level security;

create policy tenant_isolation on public.sales
  for all
  to authenticated
  using      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ---------------------------------------------------------------------
-- RLS — sale_items (no tiene tenant_id; pasa por sales)
-- ---------------------------------------------------------------------
alter table public.sale_items enable row level security;

create policy tenant_isolation on public.sale_items
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

-- ---------------------------------------------------------------------
-- RLS — commissions
-- ---------------------------------------------------------------------
alter table public.commissions enable row level security;

create policy tenant_isolation on public.commissions
  for all
  to authenticated
  using      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
