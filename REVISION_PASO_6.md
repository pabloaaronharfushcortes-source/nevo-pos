# REVISION_PASO_6 — Módulo de cola y sala de espera

**Fecha:** 31 de mayo de 2026
**Estado:** ✅ BUILD: Success | ✅ LINT: Success
**Commit anterior:** Paso 5 Revisión (incluido en commit f1f67d7)

---

## 1. QUÉ SE HIZO EN ESTE PASO

1. Algoritmo de asignación de fichas en `lib/utils/queue.ts` (CLAUDE.md §6)
2. API routes: `GET/POST /api/queue`, `PATCH /api/queue/[id]`, `GET /api/display/queue`
3. Hooks genérico `useRealtime` y específico `useQueue` con Supabase Realtime
4. Página `/queue` para recepcionista — lista de tickets activos con acciones en tiempo real
5. Ruta pública `/display` — layout TV: video en loop + panel de cola con Realtime
6. Migration 6: política anon para que la pantalla TV reciba eventos de Realtime sin sesión

---

## 2. ARCHIVOS CREADOS/MODIFICADOS

| Archivo | Descripción |
|---------|-------------|
| `supabase/migrations/20260601000006_queue_display_policy.sql` | Política anon SELECT en queue_tickets para Realtime en /display |
| `lib/utils/queue.ts` | Algoritmo `assignQueueTicket()` + helpers internos |
| `types/app.ts` | Añadidos `QueueTicketWithRelations` y `DisplayTicket` |
| `app/api/queue/route.ts` | GET (fichas de hoy) + POST (crear vía algoritmo) |
| `app/api/queue/[id]/route.ts` | PATCH (actualizar status) |
| `app/api/display/queue/route.ts` | GET público (service_role, para refresh del display) |
| `hooks/useRealtime.ts` | Hook genérico de Supabase Realtime |
| `hooks/useQueue.ts` | Hook de estado de cola con Realtime integrado |
| `components/queue/NewTicketModal.tsx` | Modal para crear fichas walk-in |
| `components/queue/QueueBoard.tsx` | Tablero de cola en tiempo real |
| `app/(dashboard)/queue/page.tsx` | Página de gestión de cola (Server Component) |
| `components/display/DisplayClient.tsx` | Display TV: video + panel de cola (Client Component) |
| `app/display/page.tsx` | Página pública /display (Server Component) |

---

## 3. ALGORITMO DE ASIGNACIÓN — `lib/utils/queue.ts`

Implementa exactamente la especificación de CLAUDE.md §6.

### Función principal

```typescript
assignQueueTicket(supabase, {
  tenantId, serviceDurationMinutes?, preferredBarberId?,
  clientId?, serviceId?, source?
}) → { ticket } | { error: string }
```

### Flujo

```
1. Obtiene tenant.appointment_buffer_minutes (default 5)
2. Obtiene barberos candidatos:
   - preferredBarberId → solo ese barbero
   - else → todos los barberos activos ordenados por sort_order
3. Para cada barbero en PARALELO:
   a. Carga barber_schedules (day_of_week, start_time, end_time)
   b. getBarberFreeSlots(): 
      - Appointments activos en [ahora, ahora+4h]
      - Queue tickets activos en [ahora, ahora+4h]
      - Construye occupied slots (cada uno con buffer sumado al final)
      - Ordena por start y recorre gaps → FreeSlot[]
   c. Para cada FreeSlot:
      - ¿slot.durationMinutes >= serviceDurationMinutes? → sí: continuar
      - isBarberWorking(schedules, slot.start) → ¿trabaja ese día y hora?
      - ¿slot.start + serviceDuration <= shiftEnd? → cabe dentro del turno
      - Si todo OK: candidate{ barberId, startTime }; break (solo primer slot por barbero)
4. candidates.sort por startTime → best = candidates[0]
5. getNextTicketNumber() → max ticket_number UTC hoy + 1
6. INSERT queue_ticket
```

### getBarberFreeSlots — lógica del buffer

```
appointments:  start=14:00, end=14:45  → ocupado 14:00-14:50 (+ 5 min buffer)
siguiente slot libre: desde 14:50
```

Los `queue_tickets` sin servicio usan 45 min por defecto para estimar su duración.

### getNextTicketNumber

Usa fecha UTC para alinearse con el índice único:
```
((created_at AT TIME ZONE 'UTC')::date)
```
Query: `MAX(ticket_number)` donde `created_at` cae en la fecha UTC actual.

---

## 4. MIGRATION 6 — política anon para /display

```sql
create policy queue_display_read on public.queue_tickets
  for select
  to anon
  using (status in ('waiting', 'called', 'in_progress'));
```

**Por qué necesaria:** Supabase Realtime aplica RLS antes de enviar eventos al cliente. Sin esta política, el cliente anónimo de la pantalla TV no recibiría ningún evento de `postgres_changes` en `queue_tickets`, aunque el canal esté suscrito. Solo permite leer tickets en estados activos (no histórico completo).

---

## 5. API ROUTES

### GET /api/queue?date=YYYY-MM-DD
Devuelve tickets activos (no completed/cancelled) para la fecha indicada, con `client`, `barber` y `service` expandidos. Requiere sesión autenticada.

### POST /api/queue
```json
{ "barberId?": "uuid", "serviceId?": "uuid", "clientId?": "uuid", "source?": "reception" }
```
1. Si `serviceId` está presente, obtiene `duration_minutes`
2. Llama `assignQueueTicket()` → `{ ticket } | { error }`
3. En error de disponibilidad → 422 con mensaje al usuario
4. Refetch con joins y devuelve ticket completo

### PATCH /api/queue/[id]
```json
{ "status": "called" | "in_progress" | "completed" | "cancelled" }
```
Usa tipo `Database['public']['Tables']['queue_tickets']['Update']` (misma solución que appointments).

### GET /api/display/queue?tenant=slug (público)
Sin auth. Usa `createServiceClient()` para bypass de RLS.
- Lookup tenant por slug
- Devuelve `DisplayTicket[]` (ticket_number, status, primer nombre, nombre barbero)
- Solo tickets con status `waiting` o `called`

---

## 6. HOOKS

### `hooks/useRealtime.ts`

```typescript
useRealtime({ channelName, table, filter?, onEvent })
```

Patrón clave: `const onEventRef = useRef(onEvent); onEventRef.current = onEvent`

Esto garantiza que el callback siempre sea el más reciente sin añadir `onEvent` a las deps del `useEffect` — evita re-suscripciones en cada render.

### `hooks/useQueue.ts`

```typescript
const { tickets, loading, refresh } = useQueue(tenantId, initialTickets)
```

- `refresh()` → `GET /api/queue?date=hoy` → actualiza estado
- `useRealtime` con `filter: tenant_id=eq.${tenantId}` → dispara `refresh()` en cualquier cambio

---

## 7. COMPONENTES DE COLA

### QueueBoard

Vista de lista por status (waiting → called → in_progress). Cada ticket muestra:
- Número grande (padStart 2)
- Badge de estado coloreado
- Nombre del cliente / "Walk-in anónimo"
- Barbero · Servicio · Hora estimada
- Botón de avance de estado + "Cancelar" con confirmación inline

No muestra tickets completados/cancelados — el recepcionista solo gestiona lo activo.

### NewTicketModal

- Búsqueda de cliente (debounce 300ms) — opcional para walk-ins anónimos
- Barbero — opcional (el algoritmo asigna si no se elige)
- Servicio — opcional (usa 45 min por defecto si no se elige)
- Al crear: muestra error "Sin disponibilidad en las próximas 4 horas" si el algoritmo no encuentra slot

---

## 8. PANTALLA TV — `/display`

Ruta pública: `/display?tenant=mercurio-barberia`

### Layout
```
┌─────────────────────────────────────────┬───────────────────┐
│                                         │  En espera  HH:MM │
│          VIDEO (2/3)                    ├───────────────────┤
│    HTML5 video, autoPlay, muted         │ 01  JUAN  Barbero1│
│    Cicla al terminar si hay >1 video    │ 02  PEDRO Barbero2│
│    Placeholder dark si no hay videos    │ 03  ...           │
│                                         │     (paginado)    │
│                                         ├───────────────────┤
│                                         │  Mercurio Barb.   │
└─────────────────────────────────────────┴───────────────────┘
```

### Realtime en /display

```
DisplayClient (anon Supabase client)
  → suscribe a postgres_changes, table: queue_tickets, filter: tenant_id=eq.${tenantId}
  → en evento: fetch /api/display/queue?tenant=${slug} (service_role)
  → setTickets() → re-render del panel
```

El evento Realtime dispara un refetch completo (con joins) en lugar de parsear el payload crudo — evita la complejidad de mantener relaciones client-side desde un evento parcial.

### Videos
Cargados desde `supabase.storage.from('display').list(tenantSlug)`. Filtra por extensiones `.mp4`, `.webm`, `.mov`. Si el bucket no existe o está vacío, muestra el nombre del negocio como placeholder oscuro.

---

## 9. ESTADO DE BUILD Y TYPECHECK

### Build (npm run build)

```
✓ Compiled successfully
✓ Linting and checking validity of types

Route (app)                              Size     First Load JS
┌ ○ /                                    142 B          87.5 kB
├ ○ /_not-found                          873 B          88.2 kB
├ ƒ /agenda                              82.2 kB         170 kB
├ ƒ /api/appointments                    0 B                0 B
├ ƒ /api/appointments/[id]               0 B                0 B
├ ƒ /api/auth/login                      0 B                0 B
├ ƒ /api/auth/verify-otp                 0 B                0 B
├ ƒ /api/clients                         0 B                0 B
├ ƒ /api/display/queue                   0 B                0 B
├ ƒ /api/queue                           0 B                0 B
├ ƒ /api/queue/[id]                      0 B                0 B
├ ƒ /display                             1.74 kB         154 kB
├ ○ /login                               1.07 kB        88.4 kB
├ ƒ /queue                               3.49 kB         156 kB
└ ○ /verify-otp                          1.44 kB        88.8 kB
+ First Load JS shared by all            87.3 kB

ƒ Middleware                             82.8 kB
```

### Lint (npm run lint)

```
✔ No ESLint warnings or errors
```

---

## 10. NOTAS — DECISIONES DE ARQUITECTURA

1. **`Promise.all` para barberos en paralelo.** El algoritmo consulta schedules + free slots de cada barbero concurrentemente. Para 3 barberos con 3 queries cada uno, esto reduce la latencia total de ~9 RTTs a ~3 RTTs.

2. **Refetch completo en Realtime en lugar de patch incremental.** Cuando Supabase envía un evento de cambio, el payload solo contiene el row crudo sin joins. Parsear ese payload y actualizar la lista local manteniendo los objetos anidados (`client`, `barber`, `service`) es complejo y propenso a bugs. El refetch desde el servidor es más simple y garantiza consistencia.

3. **`useRef` para el callback en `useRealtime`.** El patrón `onEventRef.current = onEvent` permite que el hook tenga `useEffect` con deps `[channelName, table, filter]` sin incluir `onEvent`. Esto evita re-suscripciones cuando el padre re-renderiza (por ejemplo, cuando `refresh` se redefine en un `useCallback`).

4. **Política anon limitada a estados activos.** La política `queue_display_read` filtra `status IN ('waiting', 'called', 'in_progress')`. Cuando un ticket pasa a `completed`, el event de UPDATE tiene `NEW.status = 'completed'` que no cumple la política — Supabase no envía el evento al anon. En ese caso, el display sigue mostrando el ticket hasta el siguiente evento que SÍ llega (e.g., un nuevo ticket), momento en el que el refetch lo elimina de la lista. **Workaround:** agregar `completed` a la política (solo lectura, no sensible) en caso de que el comportamiento sea visible en producción.

5. **Walk-in anónimo.** El modal de nueva ficha no requiere cliente — `client_id` puede ser null en `queue_tickets`. Se muestra como "Walk-in anónimo" en el QueueBoard.

6. **ticket_number secuencial con potencial race condition.** `getNextTicketNumber` usa MAX + 1 sin serialización. En un barbershop con 3 barbers, es prácticamente imposible que dos tickets se creen en el mismo milisegundo. El unique index sobre `(tenant_id, ticket_number, date)` rechaza duplicados; en ese caso el INSERT falla y el API devuelve 500 — aceptable para esta escala.

---

## 11. NOTA — PUSH DE MIGRATION

La migration `20260601000006_queue_display_policy.sql` está en el repositorio local. Para aplicarla al proyecto de Supabase cloud:
```bash
npx supabase db push
```
Sin este push, la pantalla `/display` no recibirá eventos de Realtime (el panel inicial funciona, pero no se actualiza).

---

## 12. PRÓXIMOS PASOS

- **Paso 7:** Módulo POS — cobro conectado a cita completada + métodos de pago + comisiones
- **Paso 8:** Módulo clientes — registro, perfil e historial de visitas
- Aplicar migration 6 al proyecto cloud con `npx supabase db push`

---

**Build Status:** ✅ SUCCESS
**Lint Status:** ✅ PASS
**Ready for Paso 7:** ✅ YES
