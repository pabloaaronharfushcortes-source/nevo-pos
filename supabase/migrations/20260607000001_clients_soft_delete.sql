-- Blindaje 2.3 — Soft delete para clientes.
-- Agrega deleted_at a la tabla clients para cumplir la regla de CLAUDE.md §11.
-- Los clientes eliminados se filtran automáticamente en las queries con .is('deleted_at', null).

alter table public.clients add column if not exists deleted_at timestamptz;
