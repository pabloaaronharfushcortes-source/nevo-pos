-- =====================================================================
-- Migration 3: clients + appointments + queue_tickets
-- =====================================================================

-- ---------------------------------------------------------------------
-- TABLA: clients
-- ---------------------------------------------------------------------
create table public.clients (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants (id) on delete restrict,
  name                text not null,
  phone               text,
  email               text,
  whatsapp_id         text,
  notes               text,
  preferred_barber_id uuid references public.barbers (id) on delete set null,
  loyalty_stamps      int  not null default 0,
  classification      text not null default 'new'
                        check (classification in ('new','recurrent','vip')),
  last_visit_at       timestamptz,
  total_spent         decimal(10,2) not null default 0,
  created_at          timestamptz   not null default now(),
  unique (tenant_id, whatsapp_id)
);

create index clients_tenant_id_idx           on public.clients (tenant_id);
create index clients_preferred_barber_id_idx on public.clients (preferred_barber_id);

comment on column public.clients.phone is
  'Formato canónico: +521XXXXXXXXXX (México).';
comment on column public.clients.whatsapp_id is
  'WAID de Meta. Único por tenant. Nullable hasta que el cliente nos escriba por WA.';

-- ---------------------------------------------------------------------
-- TABLA: appointments
-- ---------------------------------------------------------------------
create table public.appointments (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants (id) on delete restrict,
  client_id           uuid not null references public.clients (id) on delete restrict,
  barber_id           uuid not null references public.barbers (id) on delete restrict,
  service_id          uuid not null references public.services (id) on delete restrict,
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  status              text not null default 'pending'
                        check (status in ('pending','confirmed','in_progress','completed','no_show','cancelled')),
  notes               text,
  booked_via          text not null default 'reception'
                        check (booked_via in ('whatsapp','web','reception','app')),
  created_at          timestamptz not null default now(),
  cancelled_at        timestamptz,
  cancellation_reason text,
  check (ends_at > starts_at)
);

create index appointments_tenant_id_idx                on public.appointments (tenant_id);
create index appointments_barber_id_starts_at_idx     on public.appointments (barber_id, starts_at);
create index appointments_client_id_starts_at_idx     on public.appointments (client_id, starts_at desc);

comment on column public.appointments.ends_at is
  'Calculado por la app al crear: starts_at + services.duration_minutes.';

-- ---------------------------------------------------------------------
-- TABLA: queue_tickets
-- ---------------------------------------------------------------------
create table public.queue_tickets (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants (id) on delete restrict,
  client_id          uuid references public.clients (id) on delete set null,
  barber_id          uuid not null references public.barbers (id) on delete restrict,
  service_id         uuid references public.services (id) on delete set null,
  ticket_number      int  not null,
  estimated_start_at timestamptz not null,
  status             text not null default 'waiting'
                       check (status in ('waiting','called','in_progress','completed','cancelled')),
  source             text not null default 'reception'
                       check (source in ('reception','whatsapp')),
  created_at         timestamptz not null default now()
);

create index queue_tickets_tenant_id_idx        on public.queue_tickets (tenant_id);
create index queue_tickets_barber_id_status_idx on public.queue_tickets (barber_id, status);

-- ticket_number es secuencial por día y por tenant.
-- UNIQUE inline no acepta expresiones, así que va como índice único.
create unique index queue_tickets_unique_number_per_day
  on public.queue_tickets (tenant_id, ticket_number, ((created_at AT TIME ZONE 'UTC')::date));

comment on column public.queue_tickets.client_id is
  'Nullable: walk-in anónimo.';
comment on column public.queue_tickets.service_id is
  'Nullable si el cliente no especificó servicio al tomar ficha.';

-- ---------------------------------------------------------------------
-- RLS — clients
-- ---------------------------------------------------------------------
alter table public.clients enable row level security;

create policy tenant_isolation on public.clients
  for all
  to authenticated
  using      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ---------------------------------------------------------------------
-- RLS — appointments
-- ---------------------------------------------------------------------
alter table public.appointments enable row level security;

create policy tenant_isolation on public.appointments
  for all
  to authenticated
  using      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ---------------------------------------------------------------------
-- RLS — queue_tickets
-- ---------------------------------------------------------------------
alter table public.queue_tickets enable row level security;

create policy tenant_isolation on public.queue_tickets
  for all
  to authenticated
  using      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
