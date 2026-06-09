-- =====================================================================
-- Migration: products (Fase 2 — inventario y venta de productos en POS)
-- =====================================================================
-- Catálogo de productos vendibles en el POS (pomadas, ceras, shampoos, etc).
-- A diferencia de los servicios, los productos llevan control de inventario
-- (stock_quantity) y NO entran en la base de comisión del barbero.
-- =====================================================================

create table public.products (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete restrict,
  name            text not null,
  description     text,
  sku             text,
  price           decimal(10,2) not null check (price >= 0),
  cost            decimal(10,2) check (cost >= 0),
  stock_quantity  int not null default 0,
  stock_minimum   int not null default 5 check (stock_minimum >= 0),
  unit            text not null default 'pieza',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index products_tenant_id_idx on public.products (tenant_id);

comment on column public.products.cost is
  'Costo de adquisición — para calcular ganancia real. Nullable.';
comment on column public.products.stock_minimum is
  'Nivel de alerta: si stock_quantity <= stock_minimum se muestra alerta.';

-- ---------------------------------------------------------------------
-- RLS — products
-- ---------------------------------------------------------------------
alter table public.products enable row level security;

create policy tenant_isolation on public.products
  for all
  to authenticated
  using      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ---------------------------------------------------------------------
-- FK pendiente de Fase 1: sale_items.product_id → products.id
-- (la columna ya existía sin FK; ahora que products existe la enlazamos)
-- ---------------------------------------------------------------------
alter table public.sale_items
  add constraint sale_items_product_id_fkey
  foreign key (product_id) references public.products (id) on delete set null;
