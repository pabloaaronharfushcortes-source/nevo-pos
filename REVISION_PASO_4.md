# REVISION_PASO_4 — Seed: Datos reales de Mercurio Barbería

**Fecha:** 31 de mayo de 2026
**Estado:** ✅ BUILD: Success | ✅ LINT: Success | ✅ SEED: Pass
**Commit anterior:** Paso 3 Revisión: Documentación de auth, middleware y login con OTP

---

## 1. QUÉ SE HIZO EN ESTE PASO

Creación del script de semilla para Mercurio Barbería (tenant 0) con datos reales extraídos del knowledge base del negocio. Adicionalmente se adelantó la migration 5 (`conversations` + `messages`) porque el seed la requería — las tablas no estaban en el esquema original de Fase 1.

---

## 2. ARCHIVOS CREADOS/MODIFICADOS

| Archivo | Descripción |
|---------|-------------|
| `supabase/migrations/20260601000005_conversations_messages.sql` | Tablas `conversations` y `messages` con RLS |
| `scripts/seed.ts` | Script de semilla completo e idempotente |
| `types/database.ts` | Regenerado — incluye `conversations` y `messages` (1,029 líneas) |
| `types/app.ts` | Actualizado con alias para los nuevos tipos |
| `package.json` | Añadido `"seed": "npx tsx scripts/seed.ts"` y `tsx` en devDependencies |

---

## 3. MIGRATION 5 — conversations + messages

Adelantada a Paso 9 del orden de construcción por requerimiento del seed.

### conversations
```sql
id, tenant_id, client_id (nullable), whatsapp_id,
mode CHECK ('agent','human'),
last_message_at, last_message_preview,
unread_human_count, created_at
UNIQUE (tenant_id, whatsapp_id)
```

### messages
```sql
id, conversation_id → conversations CASCADE,
direction CHECK ('inbound','outbound'),
type CHECK ('text','image','audio','video','document'),
content, media_url,
whatsapp_message_id UNIQUE,  -- deduplicación de webhooks
sent_by CHECK ('agent','human','client'),
created_at
```

### RLS

- `conversations`: política `tenant_isolation` estándar sobre `tenant_id`.
- `messages`: no tiene `tenant_id` directo. RLS vía EXISTS sobre `conversations`:

```sql
create policy tenant_isolation on public.messages
  using (
    exists (
      select 1 from public.conversations c
       where c.id = messages.conversation_id
         and c.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  )
```

---

## 4. SCRIPT DE SEMILLA — scripts/seed.ts

### Ejecución
```
npm run seed
```

El script es **idempotente**: detecta si el tenant `mercurio-barberia` ya existe, borra todos sus datos en orden inverso a las FK y recrea todo desde cero.

### Datos creados por ejecución

| Entidad | Cantidad |
|---------|----------|
| Tenant | 1 |
| Admin (auth + public.users) | 1 |
| Servicios | 8 |
| Barberos | 3 |
| Horarios por barbero | 7 (Lun–Dom) |
| Clientes | 30 |
| Caja registradora | 1 |
| Citas | 84 |
| Ventas | 46 |
| Sale items | 46 |
| Comisiones | 46 |
| Conversaciones | 5 |
| Mensajes | 23 |

---

## 5. CATÁLOGO DE SERVICIOS (real)

Extraído del knowledge base de Mercurio Barbería:

| Servicio | Precio | Duración | Categoría |
|----------|--------|----------|-----------|
| Corte de cabello | $200 | 45 min | Corte |
| Arreglo de barba | $150 | 25 min | Barba |
| Arreglo de ceja | $20 | 10 min | Complemento |
| Paquete Facial Detox | $100 | 20 min | Tratamiento |
| Paquete Premium | $450 | 105 min | Combo |
| Paquete Ondulación Permanente | $1,250 | 150 min | Tratamiento |
| Paquete Alaciado Permanente | $1,500 | 180 min | Tratamiento |
| Mechas | $1,400 | 120 min | Tratamiento |

---

## 6. BARBEROS

Tres placeholders — nombres reales pendientes de confirmar con el negocio:

| Placeholder | Comisión | Horario |
|-------------|----------|---------|
| Barbero1 | 40% | Lun–Sáb 11:00–20:00, Dom 10:00–16:00 |
| Barbero2 | 45% | Lun–Sáb 11:00–20:00, Dom 10:00–16:00 |
| Barbero3 | 40% | Lun–Sáb 11:00–20:00, Dom 10:00–16:00 |

Horario real del negocio: lunes a sábado 11am–8pm, domingos 10am–4pm.

---

## 7. CLIENTES (30)

Distribución por clasificación:

| Clasificación | Cantidad | Criterio |
|---------------|----------|----------|
| `vip` | 4 | 8–10 stamps, $2,400–$3,200 total |
| `recurrent` | 22 | 2–7 stamps, $480–$1,950 total |
| `new` | 4 | 0–1 stamps, $0–$280 total |

Los 4 VIP tienen `preferred_barber_id` asignado. Todos tienen `whatsapp_id = phone.replace('+', '')`.

Nombres: 30 hombres con nombre completo (nombre + dos apellidos) mexicanos realistas.

---

## 8. CITAS (84)

Distribución de 7 días (offset -3 a +3 desde hoy):

| Día | Status | Notas |
|-----|--------|-------|
| -3, -2, -1 | `completed` | 36 citas pasadas, todas con venta |
| 0 (hoy) | `completed` / `confirmed` | Slots 0–1: completed (con venta); Slots 2–3: confirmed |
| +1, +2, +3 | `pending` | 36 citas futuras, sin venta |

**Estructura:** 4 slots × 3 barberos × 7 días = 84 citas.
Slots de inicio: 11:00, 13:00, 15:00, 17:00 (hora México).
Servicios en rotación: Corte → Barba → Paquete Premium → Corte.
`booked_via` alterna entre `'whatsapp'` y `'reception'`.

---

## 9. VENTAS Y COMISIONES (46)

**Origen de las 46 ventas:**
- 36 citas completadas en días -3 a -1
- 6 citas completadas de hoy (slots 0 y 1, 3 barberos × 2 = 6)
- 4 walk-ins sin cita (`appointment_id: null`, nota `'Walk-in sin cita previa'`)

**Métodos de pago (ciclo determinístico sobre 40-slot base):**

| Método | Aprox. ventas |
|--------|---------------|
| `cash` | ~55% |
| `clip` | ~25% |
| `transfer` | ~10% |
| `getnet` | ~10% |

**Descuento:** primera venta del día -3 tiene un descuento de $20 (para probar el campo).

**Comisiones:**
- Calculadas como `total × commission_rate / 100`
- `period_start` / `period_end` según quincena del mes de la venta
- Status inicial: `'pending'`
- Índice único en `sale_id` — una comisión por venta

---

## 10. CONVERSACIONES DE WHATSAPP (5)

Escenarios de prueba:

| Cliente | Modo | Mensajes | Escenario |
|---------|------|----------|-----------|
| Alejandro García | `agent` | 6 | Agendamiento de corte exitoso |
| José González | `agent` | 5 | Consulta de ondulación permanente con upsell |
| Jorge Medina | `human` | 6 | Queja escalada — 2 mensajes sin leer por recepción |
| Andrés Reyes | `agent` | 4 | Cancelación de cita |
| Gabriel Zúñiga | `agent` | 2 | Consulta de nuevo cliente |

La conversación de Jorge Medina tiene `mode: 'human'` y `unread_human_count: 2` — simula una escalación activa que debe aparecer resaltada en el panel de recepción.

---

## 11. BUG ENCONTRADO Y CORREGIDO

### Desbordamiento de minutos en `ends_at`

**Problema:** La función `isoMx(daysOffset, hour, minute)` formateaba el tiempo directamente. Al pasar `svc.duration_minutes` como argumento `minute`, servicios con duración > 59 min producían timestamps inválidos.

```
2026-05-28T15:105:00-06:00  ← inválido (Paquete Premium, 105 min)
```

PostgreSQL rechazó el insert con `date/time field value out of range`.

**Fix:** función `isoMxEnd` que convierte la suma de minutos en horas y minutos correctos antes de formatear:

```typescript
function isoMxEnd(daysOffset: number, startHour: number, durationMinutes: number): string {
  const total = startHour * 60 + durationMinutes
  return isoMx(daysOffset, Math.floor(total / 60), total % 60)
}
```

---

## 12. ESTRUCTURA DEL SCRIPT

```
scripts/seed.ts
├── loadEnv()             — carga .env.local sin dependencia de dotenv
├── TENANT, SERVICES,     — datos estáticos en constantes
│   BARBERS, SCHEDULE,
│   CLIENTS
├── isoMx()               — ISO con offset México (CDT = UTC-6)
├── isoMxEnd()            — suma durationMinutes correctamente
├── quincena()            — calcula period_start/end para comisiones
├── PAYMENT_CYCLE[]       — ciclo determinístico de métodos de pago
├── rows()                — helper insert+select, falla en error
├── run()                 — helper insert sin select, falla en error
├── wipeTenant()          — limpieza en orden inverso a FKs
└── main()
    ├── Verificación idempotencia
    ├── Tenant
    ├── Admin auth user
    ├── Servicios
    ├── Barberos + horarios
    ├── Clientes
    ├── Caja
    ├── Citas + ventas + comisiones (loop día × barbero × slot)
    ├── Walk-ins
    └── Conversaciones + mensajes
```

### Credenciales del admin seed

```
Email:      admin@mercuriobarberia.com
Contraseña: MercurioAdmin2026!
```

Estas credenciales son solo para desarrollo — deben reemplazarse antes de go-live.

---

## 13. ESTADO DE BUILD Y TYPECHECK

### Build (npm run build)

```
✓ Compiled successfully
✓ Linting and checking validity of types

Route (app)                              Size     First Load JS
┌ ○ /                                    142 B          87.4 kB
├ ○ /_not-found                          873 B          88.1 kB
├ ƒ /api/auth/login                      0 B                0 B
├ ƒ /api/auth/verify-otp                 0 B                0 B
├ ○ /login                               1.07 kB        88.3 kB
└ ○ /verify-otp                          1.44 kB        88.7 kB
```

### Lint (npm run lint)

```
✔ No ESLint warnings or errors
```

---

## 14. NOTAS — DECISIONES DE ARQUITECTURA

1. **Migration 5 adelantada.** En el orden original de construcción, `conversations` y `messages` son de Paso 9. Se adelantaron porque el seed requería insertarlas para simular conversaciones de WhatsApp de prueba. No hay impacto en pasos intermedios — las tablas existen pero no se usan hasta Paso 9.

2. **`ok()` dividido en `rows()` y `run()`.** El helper genérico `ok<T>` no satisface al compilador de TypeScript strict cuando `data` puede ser `T[] | null`. Se separó en dos funciones con tipos precisos: `rows<T>` para inserts con `.select()` (devuelve `T[]`) y `run` para inserts sin select (valida solo el error).

3. **Idempotencia por wipe-and-recreate.** En lugar de usar `upsert` en todas las tablas, el seed borra y recrea. Esto garantiza que los conteos y relaciones sean exactamente los esperados en cada ejecución. Apropiado para datos de desarrollo.

4. **46 ventas en lugar de 40.** El spec pedía "~40 transacciones". Se generan 46 (36 días pasados + 6 completadas hoy + 4 walk-ins). Las 6 de hoy emergen naturalmente del ciclo de citas y hacen los datos de la caja activa más realistas.

5. **Knowledge base real en `agent_knowledge_base`.** El campo del tenant en el seed carga el archivo `references/mercurio_knowledge_base.md` en su totalidad. El agente (Paso 10) lo recibirá como parte del system prompt.

### Cambios vs CLAUDE.md §13

- El spec decía "40 transacciones" → se generan 46 (ver punto 4).
- "Conversaciones de WhatsApp de prueba" incluidas correctamente: 5 conversaciones con escenarios representativos de la operación real.
- Barberos con nombres placeholder como se especificó: `[CONFIRMAR: nombres de los barberos]`.

---

## 15. PRÓXIMOS PASOS

- **Confirmar nombres de barberos reales** con Pablo/el negocio → actualizar `BARBERS` en `seed.ts`
- **Paso 5:** Módulo agenda — calendario visual por barbero + CRUD de citas
- **Paso 6:** Módulo cola + pantalla `/display` con Realtime

---

**Build Status:** ✅ SUCCESS
**Seed Status:** ✅ PASS (idempotente — ejecutable múltiples veces)
**Ready for Paso 5:** ✅ YES
