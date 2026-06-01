-- =====================================================================
-- Migration 6: política de lectura pública para pantalla /display
-- =====================================================================
-- La pantalla TV (/display) usa la anon key de Supabase para suscribirse
-- a Realtime en queue_tickets sin sesión de usuario.
-- Sin esta política, los eventos de Realtime no llegan al cliente anónimo.
-- =====================================================================

create policy queue_display_read on public.queue_tickets
  for select
  to anon
  using (status in ('waiting', 'called', 'in_progress'));
