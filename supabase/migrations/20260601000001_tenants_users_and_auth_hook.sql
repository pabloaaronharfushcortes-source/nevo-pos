-- =====================================================================
-- Migration 1: tenants + users + custom_access_token_hook
-- =====================================================================
-- Crea las tablas raíz del modelo multi-tenant y el hook de Auth que
-- inyecta `tenant_id` como custom claim en cada JWT emitido por
-- Supabase Auth. Las políticas RLS de todas las migraciones siguientes
-- dependen de este claim, por eso el hook se define aquí (depende de
-- public.users existir).
--
-- Para activar el hook en el proyecto cloud:
--   Dashboard → Authentication → Hooks → Custom Access Token Hook →
--   habilitar y seleccionar `public.custom_access_token_hook`.
-- En local (supabase start) se activa vía supabase/config.toml.
-- =====================================================================

-- ---------------------------------------------------------------------
-- TABLA: tenants
-- ---------------------------------------------------------------------
create table public.tenants (
  id                          uuid primary key default gen_random_uuid(),
  name                        text        not null,
  slug                        text        not null unique,
  address                     text,
  phone                       text,
  email                       text,
  website                     text,
  logo_url                    text,
  whatsapp_phone_number_id    text,
  whatsapp_access_token       text,
  whatsapp_verify_token       text,
  agent_knowledge_base        text,
  timezone                    text        not null default 'America/Mexico_City',
  late_tolerance_minutes      int         not null default 10,
  appointment_buffer_minutes  int         not null default 5,
  is_active                   boolean     not null default true,
  created_at                  timestamptz not null default now()
);

comment on column public.tenants.appointment_buffer_minutes is
  'Buffer en minutos entre citas del mismo barbero (limpieza/orden).';

-- ---------------------------------------------------------------------
-- TABLA: users (perfil de aplicación, ligado 1:1 con auth.users)
-- ---------------------------------------------------------------------
create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  tenant_id   uuid not null references public.tenants (id) on delete restrict,
  role        text not null check (role in ('admin','receptionist','barber')),
  name        text not null,
  email       text not null,
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index users_tenant_id_idx on public.users (tenant_id);

-- ---------------------------------------------------------------------
-- RLS — tenants
-- ---------------------------------------------------------------------
alter table public.tenants enable row level security;

-- El usuario sólo puede ver / actuar sobre el tenant cuyo id == su claim tenant_id.
-- Los inserts de tenant los hace service_role (que bypasea RLS).
create policy tenant_isolation on public.tenants
  for all
  to authenticated
  using      (id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ---------------------------------------------------------------------
-- RLS — users
-- ---------------------------------------------------------------------
alter table public.users enable row level security;

create policy tenant_isolation on public.users
  for all
  to authenticated
  using      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =====================================================================
-- CUSTOM ACCESS TOKEN HOOK
-- =====================================================================
-- Esta función es llamada por GoTrue cada vez que emite un JWT. Lee
-- el tenant_id desde public.users (por el user_id del evento) y lo
-- inyecta en los claims. Si el user aún no tiene fila en public.users,
-- no se agrega el claim — RLS bloqueará todo, lo que es el comportamiento
-- correcto hasta que se complete el alta del perfil.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims          jsonb;
  user_tenant_id  uuid;
begin
  claims := event -> 'claims';

  select tenant_id
    into user_tenant_id
    from public.users
   where id = (event ->> 'user_id')::uuid;

  if user_tenant_id is not null then
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id::text));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Permisos para que GoTrue (supabase_auth_admin) ejecute el hook
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant select on table public.users to supabase_auth_admin;

-- El rol supabase_auth_admin debe poder leer public.users para resolver
-- el tenant_id de cualquier usuario en el momento del login. Le damos
-- una política dedicada de SELECT en lugar de bypass general.
create policy auth_admin_can_read_all_users on public.users
  for select
  to supabase_auth_admin
  using (true);

-- Bloqueamos el hook para roles no autorizados
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
