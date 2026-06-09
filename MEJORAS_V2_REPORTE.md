# MEJORAS_V2 — Reporte de ejecución

> Generado al concluir los 4 módulos de mejora. Documenta lo que se hizo, las
> decisiones autónomas tomadas y **los pasos manuales que faltan por correr**.

---

## 0. Nota importante sobre `MEJORAS_V2.md`

**El archivo `MEJORAS_V2.md` no existe en el repositorio.** Se buscó en la raíz y
en todo el árbol del proyecto y no se encontró. Para no bloquear el trabajo, los 4
módulos se derivaron de:

1. Los títulos/bullets de la instrucción recibida:
   - Módulo 1: Agenda (nuevo layout columnas + modal con búsqueda de cliente)
   - Módulo 2: POS + Productos (tabla products, panel gestión, alerta stock)
   - Módulo 3: Reportes (5 secciones + exportar Excel)
   - Módulo 4: Barberos extendidos (perfil completo + bloqueos horario)
2. Las reglas de arquitectura, negocio y diseño de `CLAUDE.md`.

Todas las suposiciones quedan documentadas abajo. Si `MEJORAS_V2.md` aparece con un
alcance distinto, este reporte sirve de base para conciliar diferencias.

---

## 1. ⚠️ PASOS MANUALES REQUERIDOS ANTES DE USAR EN PRODUCCIÓN

Los cambios de **base de datos** NO se pudieron aplicar a la instancia remota de
Supabase desde este entorno (no hay `SUPABASE_ACCESS_TOKEN` ni contraseña de DB; la
`service_role` solo autentica PostgREST, no ejecuta DDL). Las migraciones quedaron
escritas y versionadas, pero **hay que aplicarlas manualmente**:

```bash
# 1) Aplicar las dos migraciones nuevas a la base remota
supabase db push
#    (o aplicar manualmente, en orden:)
#      supabase/migrations/20260608000002_products.sql
#      supabase/migrations/20260608000003_barber_profile_and_blocks.sql

# 2) Regenerar tipos desde el esquema real (recomendado para validar)
npm run generate:supabase-types

# 3) Re-sembrar para que existan productos + columnas nuevas de barbero
npm run seed
```

**Hasta que se corra `supabase db push`:**
- La pestaña **Productos** y la venta de productos en POS responderán con error de
  tabla inexistente (la UI lo maneja con toast, no se rompe).
- El **perfil extendido** de barbero (teléfono, email, bio, instagram, fecha de
  ingreso) y los **bloqueos de horario** no persistirán.
- La verificación de bloqueos al crear cita está hecha **a prueba de fallos**: si la
  tabla `barber_time_off` aún no existe, se omite con `console.warn` y la cita se crea
  normalmente (no bloquea la operación). Ver `app/api/appointments/route.ts`.

`types/database.ts` se editó a mano para reflejar el esquema previsto, de modo que
todo compila (`npm run build` → exit 0) aun antes de aplicar las migraciones.

---

## 2. Módulo 1 — Agenda (layout de columnas + modal con búsqueda de cliente)

**Objetivo:** vista de columnas por barbero como alternativa al calendario, y un
modal de agendado que permita buscar/seleccionar al cliente.

**Cambios:**
- `components/agenda/DayColumnsView.tsx` (NUEVO): vista de columnas por barbero para
  un día, una columna por profesional, con franjas horarias y huecos cliqueables.
  Comparte la paleta de color por barbero con `CalendarView`.
- `components/agenda/CalendarView.tsx`: alterna entre vista calendario y vista de
  columnas; modal de cita con búsqueda de cliente (filtra por nombre/teléfono).

**Decisiones:** la paleta de color por barbero es compartida
(`['#FF6B6B','#A259FF','#2DD4BF','#F59E0B','#EC4899','#6366F1','#10B981','#F472B6']`)
para mantener coherencia visual entre ambas vistas.

---

## 3. Módulo 2 — POS + Productos (inventario)

**Objetivo:** vender productos (no solo servicios) en el POS, con catálogo, control
de stock y alerta de stock bajo.

**Base de datos:**
- `supabase/migrations/20260608000002_products.sql` (NUEVO): tabla `products`
  (`price`/`cost` con `check >= 0`, `stock_quantity`, `stock_minimum` default 5,
  `unit` default `'pieza'`, `is_active`), índice por `tenant_id`, **RLS
  `tenant_isolation`**, y la FK pendiente `sale_items.product_id → products.id`
  (`on delete set null`).

**Backend:**
- `app/api/products/route.ts` (NUEVO): `GET` (cualquier autenticado, ordena por
  nombre) y `POST` (solo `admin`).
- `app/api/products/[id]/route.ts` (NUEVO): `PATCH` (solo `admin`) — edita precio,
  stock, mínimo, activo, etc.
- `app/api/pos/route.ts`: la venta ahora acepta ítems de tipo `service` o `product`.
  Se descuenta stock (lectura-luego-escritura, **no fatal** si falla). Se respeta la
  regla de comisión (ver abajo).
- `lib/validation/products.ts` (NUEVO) y `lib/validation/pos.ts`: esquemas Zod.

**Regla de negocio (decisión autónoma, consistente con CLAUDE.md §6 y la regla de
propinas):**
- Los **productos NUNCA entran en la base de comisión** del barbero. La comisión es
  un porcentaje sobre el **servicio**.
- `commissionBase = max(0, subtotalServicios − descuento)`
- `goodsTotal` (lo que gasta el cliente, sin propina) `= max(0, subtotal − descuento)`
- `total = goodsTotal + propina`
- El `total_spent` del cliente se incrementa con `goodsTotal` (sin propina).

**Frontend:**
- `components/pos/SaleModal.tsx`: selector de **Servicio** y de **Producto** (muestra
  stock disponible / "Agotado", deshabilita si stock ≤ 0; topa la cantidad al stock).
- `components/pos/POSBoard.tsx` y `app/(dashboard)/pos/page.tsx`: cargan y pasan los
  productos activos al modal.
- `components/settings/SettingsBoard.tsx`: nueva pestaña **Productos** con alta,
  edición de stock inline (blur/Enter), toggle activo y **banner de alerta de stock
  bajo** (cuenta productos activos con `stock_quantity <= stock_minimum`).
- `scripts/seed.ts`: 6 productos de ejemplo (3 con stock bajo para demostrar la
  alerta).

---

## 4. Módulo 3 — Reportes (5 secciones + exportar a Excel)

**Objetivo:** reporte con 5 secciones y exportación a Excel.

**Backend (`app/api/reports/route.ts`):**
- Se agregaron `topItems` (top 10 artículos más vendidos, agrupados por `tipo|nombre`,
  con ingreso y unidades) y `dailyTrend` (tendencia diaria: fecha, ingreso = total −
  propina, conteo). El resumen incluye `productRevenue` y `productUnits`.

**Frontend (`components/reports/ReportsBoard.tsx`) — 5 secciones:**
1. **Resumen** (ingresos, ventas, ticket promedio, ingreso por productos).
2. **Métodos de pago.**
3. **Por barbero** (ventas y comisión).
4. **Artículos más vendidos** (barras; badge producto `#FF6B6B` / servicio `#A259FF`).
5. **Tendencia por día** (gráfica de barras por fecha).

**Exportar a Excel (decisión autónoma):** no hay librería `xlsx`/`exceljs` instalada,
así que la exportación genera un documento **HTML `<table>` con extensión `.xls`** y
mimetype `application/vnd.ms-excel` (+ BOM). Abre nativamente en Excel, Numbers y
Google Sheets sin agregar dependencias. El archivo incluye una tabla por sección.

---

## 5. Módulo 4 — Barberos extendidos (perfil completo + bloqueos de horario)

**Objetivo:** que el barbero tenga un perfil completo y que se puedan registrar
bloqueos puntuales de su agenda (vacaciones, permisos).

**Base de datos:**
- `supabase/migrations/20260608000003_barber_profile_and_blocks.sql` (NUEVO):
  - `barbers` += `phone`, `email`, `bio`, `instagram` (text) y `hired_at` (date).
  - Tabla `barber_time_off` (`barber_id` con `on delete cascade`, `starts_at`,
    `ends_at`, `reason`, `check (ends_at > starts_at)`), 3 índices y **RLS
    `tenant_isolation`**.

**Backend:**
- `app/api/barbers/route.ts`: `GET`/`POST` incluyen los nuevos campos (instagram se
  guarda sin `@`; cadenas vacías → `null`).
- `app/api/barbers/[id]/route.ts`: `PATCH` normaliza cadenas vacías a `null` en
  campos nullable (clave para `hired_at: date`) y limpia el `@` de instagram. El
  payload se tipa como `TablesUpdate<'barbers'>`.
- `app/api/barber-time-off/route.ts` (NUEVO): `GET` (solo `admin`, filtra bloqueos
  vigentes/futuros) y `POST` (solo `admin`, valida que el barbero pertenezca al
  tenant).
- `app/api/barber-time-off/[id]/route.ts` (NUEVO): `DELETE` (solo `admin`).
- `app/api/appointments/route.ts`: al crear cita, además del chequeo de conflictos de
  citas, se verifica solape con `barber_time_off` (**a prueba de fallos** si la tabla
  no existe todavía — ver §1).
- `lib/validation/settings.ts`: `createBarberSchema`/`updateBarberSchema` extendidos y
  nuevo `createTimeOffSchema`.

**Decisión sobre borrado (consistente con CLAUDE.md §11.8):** los bloqueos de horario
se eliminan con **borrado físico**, no soft delete. La regla de soft delete aplica a
registros de negocio auditables (ventas, clientes, citas); un bloqueo es **config
operativa**, no un registro contable. Queda comentado así en el código.

**Frontend (`components/settings/SettingsBoard.tsx`):**
- El alta de barbero ahora pide también teléfono, email, instagram y fecha de ingreso.
- Cada barbero de la lista es **expandible**: editor de perfil completo (nombre,
  comisión, teléfono, email, instagram, fecha de ingreso, foto URL, bio) conectado a
  `PATCH /api/barbers/:id`.
- Sección **Bloqueos de horario** por barbero: alta (inicio/fin con `datetime-local`
  convertidos a ISO, motivo opcional), listado y borrado, contra los endpoints
  `/api/barber-time-off`.

**Páginas afectadas:** como `Barber = Tables['barbers']['Row']` ahora incluye los
campos nuevos, los `select` de barberos en `agenda`, `clients`, `pos` y `queue`
páginas se ampliaron para traer las columnas nuevas y mantener la compatibilidad de
tipos.

---

## 6. Verificación

- `npm run build` → **exit 0** después de cada módulo (Módulos 2, 3 y 4 verificados en
  verde; el 4 requirió ampliar los `select` de barberos y tipar el `PATCH` con
  `TablesUpdate<'barbers'>`).
- TypeScript strict respetado (sin `any`; un único `as`/aserción evitado vía tipos del
  esquema). Sin tags `<form>` (solo event handlers). RLS en cada tabla nueva.

---

## 7. Archivos tocados (resumen)

**Nuevos:**
- `supabase/migrations/20260608000002_products.sql`
- `supabase/migrations/20260608000003_barber_profile_and_blocks.sql`
- `app/api/products/route.ts`, `app/api/products/[id]/route.ts`
- `app/api/barber-time-off/route.ts`, `app/api/barber-time-off/[id]/route.ts`
- `components/agenda/DayColumnsView.tsx`
- `lib/validation/products.ts`
- `MEJORAS_V2_REPORTE.md` (este archivo)

**Modificados:**
- `types/database.ts`, `types/app.ts`
- `lib/validation/pos.ts`, `lib/validation/settings.ts`
- `app/api/pos/route.ts`, `app/api/reports/route.ts`
- `app/api/barbers/route.ts`, `app/api/barbers/[id]/route.ts`
- `app/api/appointments/route.ts`
- `app/(dashboard)/agenda/page.tsx`, `app/(dashboard)/clients/page.tsx`,
  `app/(dashboard)/pos/page.tsx`, `app/(dashboard)/queue/page.tsx`
- `components/agenda/CalendarView.tsx`, `components/pos/SaleModal.tsx`,
  `components/pos/POSBoard.tsx`, `components/reports/ReportsBoard.tsx`,
  `components/settings/SettingsBoard.tsx`
- `scripts/seed.ts`
