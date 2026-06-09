-- =====================================================================
-- Migration: perfil extendido de barbero + bloqueos de horario
-- =====================================================================
-- Módulo 4: el barbero deja de ser solo {nombre, comisión} y pasa a tener
-- un perfil completo (contacto, bio, redes, fecha de ingreso). Además se
-- agregan "bloqueos" puntuales de agenda (vacaciones, citas médicas, etc.)
-- que se restan de la disponibilidad para evitar agendar sobre ellos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Perfil extendido en barbers
-- ---------------------------------------------------------------------
alter table public.barbers add column phone     text;
alter table public.barbers add column email     text;
alter table public.barbers add column bio       text;
alter table public.barbers add column instagram text;
alter table public.barbers add column hired_at  date;

comment on column public.barbers.bio is
  'Descripción corta / especialidades del barbero (visible en perfil).';
comment on column public.barbers.instagram is
  'Usuario de Instagram sin la arroba (ej: "mercurio.barber").';

-- ---------------------------------------------------------------------
-- TABLA: barber_time_off (bloqueos de agenda)
-- ---------------------------------------------------------------------
create table public.barber_time_off (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete restrict,
  barber_id   uuid not null references public.barbers (id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text,
  created_at  timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index barber_time_off_barber_id_idx on public.barber_time_off (barber_id);
create index barber_time_off_tenant_id_idx on public.barber_time_off (tenant_id);
create index barber_time_off_range_idx     on public.barber_time_off (barber_id, starts_at, ends_at);

comment on table public.barber_time_off is
  'Bloqueos puntuales de agenda por barbero (vacaciones, permisos, etc.). '
  'Se consideran al calcular disponibilidad y al verificar conflictos.';

-- ---------------------------------------------------------------------
-- RLS — barber_time_off
-- ---------------------------------------------------------------------
alter table public.barber_time_off enable row level security;

create policy tenant_isolation on public.barber_time_off
  for all
  to authenticated
  using      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
