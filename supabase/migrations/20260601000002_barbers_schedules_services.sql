-- =====================================================================
-- Migration 2: barbers + barber_schedules + services
-- =====================================================================

-- ---------------------------------------------------------------------
-- TABLA: barbers
-- ---------------------------------------------------------------------
create table public.barbers (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete restrict,
  user_id         uuid references public.users (id) on delete set null,
  name            text not null,
  photo_url       text,
  commission_rate decimal(5,2) not null default 40.00,
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

create index barbers_tenant_id_idx on public.barbers (tenant_id);
create index barbers_user_id_idx   on public.barbers (user_id);

comment on column public.barbers.commission_rate is
  'Porcentaje sobre el servicio (ej: 40.00 = 40%).';
comment on column public.barbers.user_id is
  'Nullable: un barbero puede no tener cuenta de login.';

-- ---------------------------------------------------------------------
-- TABLA: barber_schedules
-- ---------------------------------------------------------------------
create table public.barber_schedules (
  id          uuid primary key default gen_random_uuid(),
  barber_id   uuid not null references public.barbers (id) on delete cascade,
  day_of_week int  not null check (day_of_week between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  check (end_time > start_time)
);

create index barber_schedules_barber_id_idx on public.barber_schedules (barber_id);

comment on column public.barber_schedules.day_of_week is
  '0 = domingo, 1 = lunes, ..., 6 = sábado (Postgres extract(dow ...)).';

-- ---------------------------------------------------------------------
-- TABLA: services
-- ---------------------------------------------------------------------
create table public.services (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id) on delete restrict,
  name             text not null,
  description      text,
  price            decimal(10,2) not null,
  duration_minutes int not null check (duration_minutes > 0),
  category         text,
  is_active        boolean not null default true,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);

create index services_tenant_id_idx on public.services (tenant_id);

-- ---------------------------------------------------------------------
-- RLS — barbers
-- ---------------------------------------------------------------------
alter table public.barbers enable row level security;

create policy tenant_isolation on public.barbers
  for all
  to authenticated
  using      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ---------------------------------------------------------------------
-- RLS — barber_schedules (no tiene tenant_id; pasa por barbers)
-- ---------------------------------------------------------------------
alter table public.barber_schedules enable row level security;

create policy tenant_isolation on public.barber_schedules
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

-- ---------------------------------------------------------------------
-- RLS — services
-- ---------------------------------------------------------------------
alter table public.services enable row level security;

create policy tenant_isolation on public.services
  for all
  to authenticated
  using      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
