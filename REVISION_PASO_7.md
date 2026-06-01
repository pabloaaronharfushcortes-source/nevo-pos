# REVISION_PASO_7 — Módulo POS

**Fecha:** 31 de mayo de 2026
**Estado:** ✅ BUILD: Success | ✅ LINT: Success
**Commit anterior:** Paso 6 Revisión

---

## 1. QUÉ SE HIZO EN ESTE PASO

1. Utilidades `lib/utils/commissions.ts` — `getCurrentQuincena()` + `computeCommission()`
2. Utilidad `lib/utils/receipts.ts` — `formatSaleReceipt()` para ticket digital por WhatsApp (Paso 9)
3. Tipo `SaleWithRelations` en `types/app.ts`
4. API routes: `GET/POST /api/pos`, `GET/POST /api/pos/cash-register`, `PATCH /api/pos/cash-register/[id]`
5. Componente `SaleModal` — formulario de cobro con items, descuento, métodos de pago
6. Componente `CashRegisterWidget` — apertura y cierre de turno con cuadre de efectivo
7. Componente `POSBoard` — página principal del POS con lista de ventas del día
8. Página `/pos` — Server Component con datos iniciales
9. Botón "Cobrar" en `QueueBoard` para tickets `in_progress`

---

## 2. ARCHIVOS CREADOS/MODIFICADOS

| Archivo | Descripción |
|---------|-------------|
| `lib/utils/commissions.ts` | `getCurrentQuincena()` y `computeCommission()` |
| `lib/utils/receipts.ts` | `formatSaleReceipt()` para ticket por WhatsApp |
| `types/app.ts` | Añadido `SaleWithRelations` |
| `app/api/pos/route.ts` | GET (ventas de hoy) + POST (crear venta + comisión) |
| `app/api/pos/cash-register/route.ts` | GET (turno activo) + POST (abrir turno) |
| `app/api/pos/cash-register/[id]/route.ts` | PATCH (cerrar turno con cuadre) |
| `components/pos/SaleModal.tsx` | Modal de cobro con items, descuento y pago |
| `components/pos/CashRegisterWidget.tsx` | Widget de turno de caja |
| `components/pos/POSBoard.tsx` | Página POS completa |
| `app/(dashboard)/pos/page.tsx` | Server Component `/pos` |
| `components/queue/QueueBoard.tsx` | Añadido botón "Cobrar" en tickets `in_progress` |

---

## 3. FLUJO DE COBRO

### Desde `/queue` (QueueBoard)

```
Ticket en "in_progress"
  → Botón "Cobrar"
  → SaleModal abre con:
     - Barbero pre-seleccionado (read-only)
     - Servicio del ticket como item inicial (con precio del catálogo)
     - client_id y client_name si tiene cliente
     - queueTicketId para que el POST lo complete
  → POST /api/pos
     - Crea sale + sale_items
     - Crea commission (amount = total × commission_rate / 100)
     - PATCH queue_ticket.status = 'completed'
  → QueueBoard llama refresh() → el ticket desaparece
```

### Desde `/pos` (POSBoard)

```
Botón "+ Nueva venta"
  → SaleModal abre vacío (sin pre-llenado)
  → Seleccionar barbero + agregar servicios manualmente
  → POST /api/pos (sin queueTicketId ni appointmentId)
  → Venta aparece en la lista del día
```

---

## 4. API ROUTES

### POST /api/pos

```json
{
  "barberId": "uuid",
  "items": [
    { "serviceId?": "uuid", "name": "Corte", "price": 200, "quantity": 1 }
  ],
  "discount?": 0,
  "paymentMethod": "cash" | "clip" | "getnet" | "transfer",
  "paymentReference?": "...",
  "notes?": "...",
  "clientId?": "uuid",
  "queueTicketId?": "uuid",
  "appointmentId?": "uuid",
  "cashRegisterId?": "uuid"
}
```

Flujo interno:
1. Validar `barberId` pertenece al tenant del usuario
2. `subtotal = Σ(price × quantity)`; `total = max(0, subtotal − discount)`
3. INSERT `sales`
4. INSERT `sale_items` (snapshot de nombre y precio)
5. `computeCommission(total, barber.commission_rate)` → INSERT `commissions`
   - `period_start/end` de `getCurrentQuincena()`
   - Falla silenciosa: la venta ya está creada
6. Si `queueTicketId`: PATCH `queue_tickets.status = 'completed'`
7. Si `appointmentId`: PATCH `appointments.status = 'completed'`
8. Refetch con joins → devuelve `SaleWithRelations`

### GET /api/pos/cash-register
Devuelve el turno activo (`closed_at IS NULL`) más reciente del tenant, o `null`.

### POST /api/pos/cash-register
```json
{ "opening_amount": 500.00, "notes?": "..." }
```
Crea nuevo `cash_register` para el cashier (usuario autenticado).

### PATCH /api/pos/cash-register/[id]
```json
{ "closing_amount": 1200.00, "notes?": "..." }
```
Cálculo del cuadre:
```
cash_sales_sum = SUM(sales.total) WHERE payment_method='cash' AND created_at >= register.opened_at
expected_amount = opening_amount + cash_sales_sum
difference = closing_amount - expected_amount
```
Actualiza `closed_at`, `closing_amount`, `expected_amount`, `difference`.

---

## 5. CÁLCULO DE COMISIÓN

```typescript
// lib/utils/commissions.ts
getCurrentQuincena() → { period_start: "YYYY-MM-01", period_end: "YYYY-MM-15" }
                     | { period_start: "YYYY-MM-16", period_end: "YYYY-MM-{lastDay}" }

computeCommission(total, rate) → Math.round((total * rate / 100) * 100) / 100
```

La comisión se crea una vez por venta (unique index en `commissions.sale_id`). Si el INSERT falla (duplicate), el error es silencioso — la venta ya fue guardada correctamente.

---

## 6. COMPONENTES

### SaleModal

Props clave:
- `preselectedBarberId` — si se pasa, el selector de barbero queda pre-elegido y bloqueado
- `initialItems` — items pre-llenados (desde el servicio del ticket)
- `queueTicketId` / `appointmentId` — si se pasa, el POST los completa automáticamente

UX:
- Selector de barbero (pre-elegido desde QueueBoard, libre desde POSBoard)
- Lista de items con `+`/`−` de cantidad y botón de eliminar
- Dropdown "Agregar" con los servicios del catálogo (usa `onMouseDown` para evitar conflicto con `onBlur`)
- Descuento en pesos
- 4 botones de método de pago
- Campo de referencia (visible solo para clip/getnet/transfer)
- Total en tiempo real
- "Cobrar $XXX" en el submit

### CashRegisterWidget

- Si no hay turno activo: muestra alerta amarilla + botón "Abrir turno" con formulario inline
- Si hay turno activo: muestra estado verde + botón "Cerrar turno" con formulario inline
- El formulario de cierre pide solo `closing_amount` — el servidor calcula el cuadre

### POSBoard

- Siempre visible el widget de turno arriba
- Lista de ventas del día con hora, cliente, barbero, servicios, total y método de pago
- Botón "+ Nueva venta" → SaleModal sin pre-llenado
- Totalizador: número de ventas + suma total del día

---

## 7. TICKET DIGITAL — `lib/utils/receipts.ts`

`formatSaleReceipt(data)` devuelve un string con formato WhatsApp (bold con `*`, cursiva con `_`):

```
*Mercurio Barbería*
📅 31/05/26, 14:30
👤 Juan Pérez
✂️ Carlos
─────────────────────
Corte  $200.00
Barba  $150.00
─────────────────────
Descuento: -$50.00
*Total: $300.00*
Pago: Efectivo
─────────────────────
_Folio: A1B2C3D4_
```

Se usará en Paso 9 (módulo conversaciones) para enviar el ticket al cliente por WhatsApp.

---

## 8. ESTADO DE BUILD Y TYPECHECK

### Build (npm run build)

```
✓ Compiled successfully
✓ Linting and checking validity of types

Route (app)                              Size     First Load JS
├ ƒ /api/pos                             0 B                0 B
├ ƒ /api/pos/cash-register               0 B                0 B
├ ƒ /api/pos/cash-register/[id]          0 B                0 B
├ ƒ /pos                                 2.4 kB         92.1 kB
├ ƒ /queue                               3.79 kB         159 kB
```

### Lint
```
✔ No ESLint warnings or errors
```

---

## 9. NOTAS — DECISIONES DE ARQUITECTURA

1. **Comisión por venta total, no por item.** Según CLAUDE.md §6: `amount = total × commission_rate / 100`. Todos los items del ticket aportan a la base de comisión. Si se aplica descuento, el descuento reduce la base.

2. **Falla silenciosa en commission INSERT.** El índice único en `commissions.sale_id` previene duplicados. Si el INSERT falla (edge case de retry), la venta ya fue guardada y el cliente pagó. Registrar la comisión después manualmente es preferible a revertir la venta.

3. **Snapshot de nombre y precio en sale_items.** Los campos `name` y `price` en `sale_items` capturan el estado al momento de la venta — si el servicio cambia de precio después, el historial no se ve afectado.

4. **cashRegisterId opcional.** La venta puede crearse sin un turno de caja abierto. Esto permite flexibilidad para pagos con terminal (clip/getnet) que no requieren control de efectivo.

5. **Precio del servicio en QueueBoard.** El ticket de cola solo guarda `service_id` y los campos `QueueTicketWithRelations.service` solo tienen `duration_minutes`, no `price`. El botón "Cobrar" busca el precio en el array `services` prop (ya cargado en el servidor) para pre-llenar el SaleModal.

6. **onMouseDown en el picker de servicios.** Mismo patrón que AppointmentModal: `onMouseDown` en los items del dropdown se ejecuta antes de que el `blur` cierre el panel, garantizando que el click registre.

---

## 10. PRÓXIMOS PASOS

- **Paso 8:** Módulo clientes — registro, perfil e historial de visitas
- **Paso 9:** Panel conversaciones WhatsApp + human handoff (usará `formatSaleReceipt` de este paso)
- **Paso 10:** Agente WhatsApp
- Aplicar migrations pendientes al proyecto cloud con `npx supabase db push`

---

**Build Status:** ✅ SUCCESS
**Lint Status:** ✅ PASS
**Ready for Paso 8:** ✅ YES
