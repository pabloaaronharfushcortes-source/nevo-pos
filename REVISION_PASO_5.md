# REVISION_PASO_5 — Módulo Agenda: calendario visual + CRUD de citas

**Fecha:** 31 de mayo de 2026
**Estado:** ✅ BUILD: Success | ✅ LINT: Success
**Commit anterior:** Paso 4 Revisión: Documentación de seed, migration conversations/messages y datos reales

---

## 1. QUÉ SE HIZO EN ESTE PASO

Implementación completa del módulo de agenda:

1. Shell del dashboard con navegación lateral (aplica a todos los módulos futuros)
2. Helper de sesión autenticada para Server Components y Route Handlers
3. Tres API routes: `GET/POST /api/appointments`, `PATCH /api/appointments/[id]`, `GET /api/clients`
4. Componente `CalendarView` con FullCalendar v6 (timeGridWeek, filtro por barbero, colores)
5. Modal `AppointmentModal` para crear y editar citas con búsqueda de clientes
6. Página `/agenda` (Server Component) que pre-carga barberos y servicios

---

## 2. ARCHIVOS CREADOS/MODIFICADOS

| Archivo | Descripción |
|---------|-------------|
| `lib/supabase/auth.ts` | Helper `getSessionUser()` — obtiene usuario + perfil desde DB |
| `types/app.ts` | Añadido `AppointmentWithRelations` — cita con joins expandidos |
| `app/(dashboard)/layout.tsx` | Shell del dashboard: sidebar + navegación + logout |
| `app/(dashboard)/LogoutButton.tsx` | Botón de logout (client component, llama a signOut()) |
| `app/(dashboard)/agenda/page.tsx` | Página agenda (Server Component, pre-carga barbers + services) |
| `app/api/appointments/route.ts` | GET (lista por rango de fecha) + POST (crea con verificación de conflictos) |
| `app/api/appointments/[id]/route.ts` | PATCH (actualiza status, notas, cancela) |
| `app/api/clients/route.ts` | GET con búsqueda por nombre (para autocompletado en modal) |
| `components/agenda/CalendarView.tsx` | FullCalendar v6 con filtros, eventos por barbero, modal integrado |
| `components/agenda/AppointmentModal.tsx` | Modal crear/editar con búsqueda de clientes, validación, cancelación |

---

## 3. DASHBOARD LAYOUT

Shell compartido por todos los módulos del dashboard (`/agenda`, `/pos`, `/clientes`, etc.):

- **Sidebar** de 208px: nombre del negocio, nombre del usuario, rol, navegación, botón logout
- **Main** área scrollable con `overflow-auto`
- **Auth guard**: `getSessionUser()` → si no hay sesión, `redirect('/login')`
- **LogoutButton**: client component que llama `supabase.auth.signOut()` y redirige a `/login`

---

## 4. HELPER `getSessionUser()`

```typescript
// lib/supabase/auth.ts
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role, name')
    .eq('id', user.id)
    .single()

  return { id, email, tenantId, role, name }
}
```

Obtiene `tenant_id` desde la tabla `users` (no del JWT decodificado directamente) para evitar la deserialización manual de base64. El RLS garantiza que solo puede leer su propio perfil.

---

## 5. API ROUTES

### GET /api/appointments

Parámetros: `from` y `to` (ISO timestamps)

Retorna todas las citas del tenant autenticado en ese rango, con `client`, `barber` y `service` expandidos (joins).

### POST /api/appointments

Body: `{ clientId, barberId, serviceId, startsAt, notes?, bookedVia? }`

Flujo:
1. Obtiene duración del servicio → calcula `ends_at`
2. Ejecuta verificación de conflictos (per CLAUDE.md §6):
   ```typescript
   .neq('status', 'cancelled')
   .neq('status', 'no_show')
   .lt('starts_at', endsAt)
   .gt('ends_at', startsAt)
   ```
   Si `count > 0` → 409 Conflict con mensaje claro
3. Inserta la cita con `status: 'pending'`

### PATCH /api/appointments/[id]

Body: `{ status?, notes?, cancellationReason? }`

- Si `status === 'cancelled'` → también escribe `cancelled_at = now()`
- Usa tipo `AppointmentUpdate` de `types/database.ts` para satisfacer TypeScript strict

### GET /api/clients

Parámetro: `search` (mínimo 2 caracteres)

Retorna hasta 20 clientes con `ilike` sobre `name`. Usado por el autocompletado del modal.

---

## 6. COMPONENTE CalendarView

`components/agenda/CalendarView.tsx` — Client Component (`'use client'`)

### FullCalendar configuración

```typescript
plugins: [timeGridPlugin, dayGridPlugin, interactionPlugin]
initialView: 'timeGridWeek'
locale: esLocale  // importado de @fullcalendar/core/locales/es
firstDay: 1       // lunes primero
businessHours: [
  { daysOfWeek: [1,2,3,4,5,6], startTime: '11:00', endTime: '20:00' },
  { daysOfWeek: [0], startTime: '10:00', endTime: '16:00' },
]
slotMinTime: '08:00' / slotMaxTime: '22:00'
allDaySlot: false
selectable: true   // clic en slot vacío → crear cita
```

### Colores por barbero

8 colores asignados por índice:
```
Barbero1: #3B82F6 (blue)
Barbero2: #8B5CF6 (purple)
Barbero3: #10B981 (green)
...
```

Citas con status `cancelled` o `no_show` aparecen grises y con texto oscuro (opacidad reducida visualmente).

### Filtro de barbero

Botones pill en la barra superior. Al seleccionar un barbero, los eventos se filtran **client-side** usando `useMemo` sobre `allAppointments` (sin re-fetch). Toggle: clic de nuevo en el mismo barbero deselecciona.

### Gestión de rango de fechas

```typescript
const currentRangeRef = useRef<{ from: string; to: string } | null>(null)

const handleDatesSet = useCallback((info: DatesSetArg) => {
  currentRangeRef.current = { from: info.startStr, to: info.endStr }
  fetchAppointments(info.startStr, info.endStr)
}, [fetchAppointments])
```

`useRef` (no `useState`) para el rango actual evita stale closures en `handleModalSaved` sin agregar re-renders innecesarios.

---

## 7. COMPONENTE AppointmentModal

`components/agenda/AppointmentModal.tsx` — Client Component

### Modo crear

- **Búsqueda de cliente**: input con debounce 300ms → `GET /api/clients?search=X` → dropdown en posición `absolute`. Selección con `onMouseDown` (evita que `onBlur` cierre el dropdown antes del clic).
- **Barbero**: `<select>` con los barberos activos del tenant
- **Servicio**: `<select>` con precio y duración. Al seleccionar muestra hora estimada de finalización
- **datetime-local**: pre-llenado con la selección del calendario
- **Agendado por**: reception / whatsapp / web / app (default: reception)
- **Notas**: textarea opcional

### Modo editar

Campos principales en solo lectura (cliente, barbero, servicio, fecha). Editables: status y notas.

### Cancelación con confirmación inline

Sin `window.confirm()`. Al hacer clic en "Cancelar cita" aparece confirmación inline:
```
¿Confirmar cancelación? [Sí, cancelar] [No]
```
"Sí, cancelar" → `PATCH /api/appointments/[id]` con `status: 'cancelled'`.

### Cierre por backdrop

```tsx
<div onClick={e => { if (e.target === e.currentTarget) onClose() }}>
```

---

## 8. FLUJO COMPLETO

```
Usuario abre /agenda
  → Server Component carga barbers + services de DB
  → Renderiza CalendarView con esos props
  → datesSet dispara fetchAppointments para la semana actual
  → Eventos aparecen en el calendario coloreados por barbero

Usuario clic en slot vacío
  → select callback → setModal({ mode: 'create', start: Date })
  → AppointmentModal se abre con fecha/hora pre-llenada
  → Busca cliente por nombre → selecciona
  → Elige barbero y servicio
  → Clic "Crear cita" → POST /api/appointments → verificación de conflictos
  → Si OK: onSaved() → modal cierra → calendario re-fetch

Usuario clic en evento
  → eventClick callback → setModal({ mode: 'edit', appointment })
  → AppointmentModal se abre con datos del evento
  → Puede cambiar status o notas → PATCH
  → Puede cancelar con confirmación inline
```

---

## 9. BUG CORREGIDO EN BUILD

### `Record<string, string | null>` no es compatible con Supabase Update type

**Problema:** El PATCH route usaba un `Record<string, string | null>` genérico para el objeto de update. TypeScript strict rechaza esto porque Supabase genera tipos con `RejectExcessProperties<>` que bloquea índices de string genéricos.

**Fix:** Importar y usar el tipo generado:
```typescript
import type { Database } from '@/types/database'
type AppointmentUpdate = Database['public']['Tables']['appointments']['Update']
const update: AppointmentUpdate = {}
```

---

## 10. ESTADO DE BUILD Y TYPECHECK

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
├ ○ /login                               1.07 kB        88.4 kB
└ ○ /verify-otp                          1.44 kB        88.8 kB
+ First Load JS shared by all            87.3 kB

ƒ Middleware                             82.8 kB
```

Los 82.2 kB de `/agenda` incluyen FullCalendar v6 (plugins + locale es).

### Lint (npm run lint)

```
✔ No ESLint warnings or errors
```

---

## 11. NOTAS — DECISIONES DE ARQUITECTURA

1. **Filtro de barbero client-side.** Los eventos se filtran con `useMemo` sin re-fetch porque en una semana típica (3 barberos × ~12 citas/día × 7 días = ~252 eventos) la memoria es trivial y la respuesta es instantánea.

2. **`useRef` para currentRange.** `currentRangeRef` en lugar de `useState` evita que `handleModalSaved` capture un rango obsoleto sin agregar `currentRange` como dependencia de un `useCallback` que se recrea en cada cambio.

3. **`onMouseDown` en items del dropdown de clientes.** El evento `onBlur` del input ocurre antes de `onClick`. Si usara `onClick`, el dropdown se cerraría por blur antes de registrar el clic. `onMouseDown` ocurre antes del blur.

4. **Confirmación inline en lugar de `window.confirm()`** para la cancelación de citas. Mejor UX, consistente con el diseño del sistema, y no bloquea el event loop del navegador.

5. **`AppointmentWithRelations` en `types/app.ts`.** Tipo compartido entre los componentes de agenda y los API routes para mantener consistencia de tipos sin duplicación.

6. **No hay rescheduling (cambio de hora) en el PATCH.** El modal de edición solo permite cambiar status y notas. Mover citas en el calendario se deja para una iteración posterior — requeriría también re-verificar conflictos con la nueva hora.

---

## 12. PRÓXIMOS PASOS

- **Confirmar nombres de barberos reales** con el negocio → actualizar `BARBERS` en `seed.ts`
- **Paso 6:** Módulo cola — algoritmo de asignación de fichas + pantalla `/display` con Realtime
- **Paso 7:** Módulo POS — cobro conectado a cita completada + métodos de pago

---

**Build Status:** ✅ SUCCESS
**Lint Status:** ✅ PASS
**Ready for Paso 6:** ✅ YES
