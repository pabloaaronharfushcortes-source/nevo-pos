-- =====================================================================
-- Migration: integridad anti-solape de citas a nivel de PostgreSQL
-- =====================================================================
-- La verificación de conflictos en la capa de aplicación (read-then-insert)
-- es vulnerable a condiciones de carrera: N requests concurrentes al mismo
-- slot pueden leer "libre" antes de que cualquiera inserte y todos ganar
-- (el harness de estrés observó 3-5 ganadores en el mismo slot).
--
-- Este EXCLUDE constraint hace que PostgreSQL rechace, de forma ATÓMICA, dos
-- citas del mismo barbero cuyos rangos [starts_at, ends_at) se solapen,
-- ignorando las canceladas y no-show. Es una garantía dura e independiente de
-- la app: aunque el chequeo de la aplicación falle bajo carga, la BD solo deja
-- pasar a uno. La capa de API traduce la violación (Postgres 23P01) a HTTP 409.
--
-- Requiere btree_gist para poder usar el operador de igualdad (=) sobre
-- barber_id (uuid) dentro de un índice GiST junto al operador de solape (&&)
-- del tstzrange.
-- =====================================================================

create extension if not exists btree_gist;

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    barber_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) where (status not in ('cancelled', 'no_show'));

comment on constraint appointments_no_overlap on public.appointments is
  'Impide dos citas solapadas del mismo barbero (excluye cancelled/no_show). '
  'Garantía de integridad ante condiciones de carrera del verificador de la app.';
