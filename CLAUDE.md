# NEVO-POS — CLAUDE.md
> Documento maestro del proyecto. Léelo completo antes de escribir cualquier línea de código. Actualízalo cuando cambien decisiones de arquitectura.

---

## 1. IDENTIDAD DEL PROYECTO

NEVO-POS es una plataforma SaaS multi-tenant de gestión para negocios basados en citas (barberías, salones, consultorios, etc.). **Mercurio Barbería** (Zapopan, Jalisco, MX) es el tenant 0 — el negocio de producción real donde el sistema se prueba y refina antes de venderse a otros negocios.

**Principio rector:** el sistema debe operar sin depender de personas muy dedicadas. Un recepcionista con mínimo entrenamiento debe poder manejarlo completamente.

**El nombre "NEVO-POS" vive en configuración — nunca hardcodeado en el código.** Al vender a otro negocio, solo cambia la config.

---

## 2. STACK TÉCNICO

| Capa | Tecnología |
|---|---|
| Frontend + Backend | Next.js 14 (App Router) + TypeScript strict |
| Base de datos | Supabase (PostgreSQL + RLS + Realtime + Storage) |
| Estilos | Tailwind CSS |
| Deploy | Vercel |
| Mensajería | Meta WhatsApp Cloud API |
| IA (agente) | Claude API — modelo: claude-sonnet-4-20250514 |
| Transcripción audio | OpenAI Whisper API |
| E2E testing | Playwright |
| Load testing | k6 |

---


---

## 3. ARQUITECTURA DE AUTENTICACIÓN

El sistema maneja **dos tipos de personas** con flujos de autenticación completamente distintos.

### Usuarios del sistema (admin, recepcionista, barbero)

Autenticación mediante Supabase Auth con **dos factores obligatorios:**

1. Email + contraseña
2. Código de verificación de 6 dígitos enviado al correo (OTP por email)

El OTP se genera en cada login y expira en 5 minutos. Sin él, no hay acceso aunque email y contraseña sean correctos.

**Flujo de login:**
```
POST /api/auth/login (email + password)
  → Supabase valida credenciales
  → Genera OTP de 6 dígitos → envía al email del usuario
  → Redirige a /verify-otp

POST /api/auth/verify-otp (código de 6 dígitos)
  → Valida OTP no expirado
  → Crea sesión con JWT que incluye { userId, tenantId, role }
  → Redirige al dashboard
```

El JWT debe incluir `tenant_id` como custom claim para que las políticas de RLS de Supabase funcionen automáticamente en cada query.

**Roles y accesos:**
| Rol | Acceso |
|---|---|
| `admin` | Todo — incluyendo configuración, reportes, comisiones y profesionales |
| `receptionist` | Agenda, POS, clientes, cola, panel de conversaciones de WhatsApp |
| `barber` | Solo vista de sus citas del día (módulo opcional, activable por tenant) |

### Clientes que agendan una cita

**No tienen cuenta. No hacen login. No existe pantalla de registro para ellos.**

Son registros en la tabla `clients`. Se identifican por su número de WhatsApp o correo. Al agendar, el sistema busca si ya existen o crea el registro automáticamente.

**Datos solicitados al agendar (mínimo necesario):**
- Nombre completo
- Correo electrónico
- Número de WhatsApp (`+521XXXXXXXXXX`)

El cliente no necesita contraseña ni login para agendar, consultar o cancelar. El agente de WhatsApp lo maneja todo.

**Regla crítica:** nunca crear cuentas de Supabase Auth para clientes — son solo filas en la tabla `clients`.

## 4. ESTRUCTURA DE CARPETAS

```
nevo-pos/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx               # Shell con nav lateral
│   │   ├── agenda/                  # Calendario de citas
│   │   ├── pos/                     # Punto de venta
│   │   ├── clients/                 # Registro de clientes
│   │   ├── queue/                   # Gestión de cola en recepción
│   │   ├── conversations/           # Panel WhatsApp + human handoff
│   │   ├── reports/                 # Reportes y comisiones
│   │   └── settings/                # Configuración del negocio
│   ├── display/                     # Pantalla TV — pública, sin auth
│   │   └── page.tsx
│   └── api/
│       ├── webhooks/
│       │   └── whatsapp/
│       │       └── route.ts
│       ├── agent/
│       │   └── route.ts
│       ├── appointments/
│       ├── queue/
│       └── conversations/
├── components/
│   ├── ui/                          # Primitivos: Button, Card, Badge, Modal
│   ├── agenda/                      # CalendarView, AppointmentCard, etc.
│   ├── pos/                         # SaleForm, PaymentMethod, Receipt
│   ├── queue/                       # QueueBoard, TicketCard
│   ├── display/                     # TvLayout, QueuePanel, VideoPlayer
│   └── conversations/               # ConversationList, MessageThread, HandoffToggle
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Cliente browser
│   │   ├── server.ts                # Cliente servidor (con service role)
│   │   └── middleware.ts
│   ├── claude/
│   │   ├── agent.ts                 # Lógica del agente
│   │   └── prompts.ts               # Construcción del system prompt
│   ├── whatsapp/
│   │   ├── send.ts                  # Envío de mensajes
│   │   └── receive.ts               # Parsing de webhooks
│   └── utils/
│       ├── queue.ts                 # Algoritmo de asignación de fichas
│       ├── slots.ts                 # Cálculo de slots disponibles
│       └── commissions.ts           # Cálculo de comisiones
├── hooks/
│   ├── useRealtime.ts               # Supabase Realtime genérico
│   ├── useQueue.ts
│   └── useConversations.ts
├── types/
│   ├── database.ts                  # Tipos generados de Supabase
│   └── app.ts                       # Tipos de la aplicación
├── scripts/
│   ├── seed.ts                      # Poblar Mercurio Barbería con datos reales
│   └── simulate.ts                  # Simular una semana de operación en minutos
└── tests/
    ├── e2e/                         # Tests de Playwright
    └── load/                        # Scripts de k6
```

---

## 5. BASE DE DATOS — SCHEMA COMPLETO

### tenants
```sql
id                    uuid primary key default gen_random_uuid()
name                  text not null
slug                  text unique not null            -- 'mercurio-barberia'
address               text
phone                 text
email                 text
website               text
logo_url              text
whatsapp_phone_number_id  text                        -- Meta phone number ID
whatsapp_access_token     text                        -- Meta access token (encriptado)
whatsapp_verify_token     text                        -- Token de verificación del webhook
agent_knowledge_base  text                            -- Markdown del KB del agente
timezone              text not null default 'America/Mexico_City'
late_tolerance_minutes int not null default 10
appointment_buffer_minutes int not null default 5     -- Buffer entre citas del mismo barbero (limpieza/orden)
is_active             boolean not null default true
created_at            timestamptz not null default now()
```

### users
```sql
id          uuid primary key references auth.users
tenant_id   uuid not null references tenants
role        text not null check (role in ('admin','receptionist','barber'))
name        text not null
email       text not null
avatar_url  text
is_active   boolean not null default true
created_at  timestamptz not null default now()
```

### barbers
```sql
id              uuid primary key default gen_random_uuid()
tenant_id       uuid not null references tenants
user_id         uuid references users                -- nullable: puede no tener login
name            text not null
photo_url       text
commission_rate decimal(5,2) not null default 40.00  -- porcentaje sobre el servicio
is_active       boolean not null default true
sort_order      int not null default 0
created_at      timestamptz not null default now()
```

### barber_schedules
```sql
id          uuid primary key default gen_random_uuid()
barber_id   uuid not null references barbers on delete cascade
day_of_week int not null check (day_of_week between 0 and 6)  -- 0=domingo, 1=lunes...
start_time  time not null
end_time    time not null
```

### services
```sql
id              uuid primary key default gen_random_uuid()
tenant_id       uuid not null references tenants
name            text not null
description     text
price           decimal(10,2) not null
duration_minutes int not null
category        text
is_active       boolean not null default true
sort_order      int not null default 0
created_at      timestamptz not null default now()
```

### clients
```sql
id                    uuid primary key default gen_random_uuid()
tenant_id             uuid not null references tenants
name                  text not null
phone                 text                            -- formato: +521XXXXXXXXXX
email                 text
whatsapp_id           text                            -- WAID de Meta (único por tenant)
notes                 text                            -- tipo de cabello, alergias, preferencias
preferred_barber_id   uuid references barbers
loyalty_stamps        int not null default 0
classification        text not null default 'new'
                      check (classification in ('new','recurrent','vip'))
last_visit_at         timestamptz
total_spent           decimal(10,2) not null default 0
created_at            timestamptz not null default now()
unique(tenant_id, whatsapp_id)
```

### appointments
```sql
id              uuid primary key default gen_random_uuid()
tenant_id       uuid not null references tenants
client_id       uuid not null references clients
barber_id       uuid not null references barbers
service_id      uuid not null references services
starts_at       timestamptz not null
ends_at         timestamptz not null                  -- starts_at + service.duration_minutes
status          text not null default 'pending'
                check (status in ('pending','confirmed','in_progress','completed','no_show','cancelled'))
notes           text
booked_via      text not null default 'reception'
                check (booked_via in ('whatsapp','web','reception','app'))
created_at      timestamptz not null default now()
cancelled_at    timestamptz
cancellation_reason text
```

### queue_tickets
```sql
id                  uuid primary key default gen_random_uuid()
tenant_id           uuid not null references tenants
client_id           uuid references clients           -- nullable: walk-in anónimo
barber_id           uuid not null references barbers
service_id          uuid references services          -- nullable si no especificó
ticket_number       int not null                      -- secuencial por día y tenant
estimated_start_at  timestamptz not null
status              text not null default 'waiting'
                    check (status in ('waiting','called','in_progress','completed','cancelled'))
source              text not null default 'reception'
                    check (source in ('reception','whatsapp'))
created_at          timestamptz not null default now()
unique(tenant_id, ticket_number, created_at::date)
```

### sales
```sql
id                uuid primary key default gen_random_uuid()
tenant_id         uuid not null references tenants
appointment_id    uuid references appointments        -- nullable si es walk-in directo
queue_ticket_id   uuid references queue_tickets       -- nullable si es cita
client_id         uuid references clients             -- nullable si es walk-in anónimo
barber_id         uuid not null references barbers
cashier_id        uuid not null references users
cash_register_id  uuid references cash_registers
subtotal          decimal(10,2) not null
discount          decimal(10,2) not null default 0
total             decimal(10,2) not null
payment_method    text not null
                  check (payment_method in ('cash','clip','getnet','transfer'))
payment_reference text                               -- referencia de transferencia o terminal
notes             text
created_at        timestamptz not null default now()
deleted_at        timestamptz                         -- soft delete
```

### sale_items
```sql
id          uuid primary key default gen_random_uuid()
sale_id     uuid not null references sales on delete cascade
type        text not null check (type in ('service','product'))
name        text not null                             -- snapshot del nombre al vender
price       decimal(10,2) not null                   -- snapshot del precio al vender
quantity    int not null default 1
subtotal    decimal(10,2) not null
service_id  uuid references services                 -- referencia original
product_id  uuid references products
```

### commissions
```sql
id              uuid primary key default gen_random_uuid()
tenant_id       uuid not null references tenants
barber_id       uuid not null references barbers
sale_id         uuid not null references sales
amount          decimal(10,2) not null               -- total_sale * commission_rate / 100
rate            decimal(5,2) not null                -- snapshot de la tasa al calcular
period_start    date not null
period_end      date not null
status          text not null default 'pending'
                check (status in ('pending','paid'))
paid_at         timestamptz
created_at      timestamptz not null default now()
```

### conversations
```sql
id                    uuid primary key default gen_random_uuid()
tenant_id             uuid not null references tenants
client_id             uuid references clients         -- nullable hasta que se identifique
whatsapp_id           text not null                   -- WAID del cliente
mode                  text not null default 'agent'
                      check (mode in ('agent','human'))
last_message_at       timestamptz
last_message_preview  text
unread_human_count    int not null default 0          -- mensajes sin leer por el humano
created_at            timestamptz not null default now()
unique(tenant_id, whatsapp_id)
```

### messages
```sql
id                  uuid primary key default gen_random_uuid()
conversation_id     uuid not null references conversations on delete cascade
direction           text not null check (direction in ('inbound','outbound'))
type                text not null check (type in ('text','image','audio','video','document'))
content             text
media_url           text
whatsapp_message_id text unique
sent_by             text not null check (sent_by in ('agent','human','client'))
created_at          timestamptz not null default now()
```

### cash_registers
```sql
id              uuid primary key default gen_random_uuid()
tenant_id       uuid not null references tenants
cashier_id      uuid not null references users
opened_at       timestamptz not null default now()
closed_at       timestamptz
opening_amount  decimal(10,2) not null
closing_amount  decimal(10,2)
expected_amount decimal(10,2)                        -- calculado: opening + ventas en efectivo
difference      decimal(10,2)                        -- closing - expected
notes           text
```

### products (Fase 2)
```sql
id              uuid primary key default gen_random_uuid()
tenant_id       uuid not null references tenants
name            text not null
description     text
sku             text
price           decimal(10,2) not null
cost            decimal(10,2)                        -- para calcular ganancia real
stock_quantity  int not null default 0
stock_minimum   int not null default 5               -- nivel de alerta
unit            text not null default 'pieza'
is_active       boolean not null default true
created_at      timestamptz not null default now()
```

---

## 6. LÓGICA DE NEGOCIO CRÍTICA

### Algoritmo de asignación de ficha walk-in

```typescript
// lib/utils/queue.ts
async function assignQueueTicket(params: {
  tenantId: string
  serviceDurationMinutes?: number   // default 45 si no se especifica
  preferredBarberId?: string        // opcional
}): Promise<{ ticket: QueueTicket } | { error: string; estimatedWait: null }> {

  const now = new Date()
  const lookAheadHours = 4
  const candidates: Array<{ barberId: string; startTime: Date }> = []

  const barbers = preferredBarberId
    ? [await getBarber(preferredBarberId)]
    : await getActiveBarbers(tenantId)

  for (const barber of barbers) {
    // El buffer del tenant se suma al final de cada cita existente antes de calcular slots libres
    // Ej: cita termina 3:45 + 5 min buffer → próximo slot disponible desde 3:50
    const freeSlots = await getBarberFreeSlots(barber.id, now, addHours(now, lookAheadHours), tenant.appointment_buffer_minutes)
    const requiredDuration = serviceDurationMinutes ?? 45

    for (const slot of freeSlots) {
      if (slot.durationMinutes >= requiredDuration) {
        candidates.push({ barberId: barber.id, startTime: slot.start })
        break // solo el primer slot disponible por barbero
      }
    }
  }

  if (candidates.length === 0) {
    return { error: 'Sin disponibilidad', estimatedWait: null }
  }

  const best = candidates.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0]

  const ticketNumber = await getNextTicketNumber(tenantId)

  const ticket = await createQueueTicket({
    tenantId,
    barberId: best.barberId,
    estimatedStartAt: best.startTime,
    ticketNumber,
  })

  return { ticket }
}
```

### Verificación de conflictos de agenda (SIEMPRE ejecutar antes de crear cita o ficha)

```sql
-- Devuelve conflictos para un barbero en un rango de tiempo
SELECT COUNT(*) as conflicts FROM (
  SELECT id FROM appointments
  WHERE barber_id = $barber_id
    AND tenant_id = $tenant_id
    AND status NOT IN ('cancelled', 'no_show')
    AND starts_at < $new_ends_at
    AND ends_at > $new_starts_at

  UNION ALL

  SELECT id FROM queue_tickets
  WHERE barber_id = $barber_id
    AND tenant_id = $tenant_id
    AND status NOT IN ('cancelled', 'completed')
    AND estimated_start_at < $new_ends_at
    AND (estimated_start_at + (service_duration_minutes || ' minutes')::interval) > $new_starts_at
) conflicts
-- Si COUNT > 0, rechazar la operación con error claro
```

### Flujo de tolerancia de llegada tardía

```
cliente llega a recepción
  ↓
¿tiene cita agendada?
  ├─ NO → crear queue_ticket directo
  └─ SÍ → ¿llegó dentro de la ventana de tolerancia?
           ├─ SÍ → confirmar cita normalmente
           └─ NO → appointment.status = 'no_show'
                   crear queue_ticket para el siguiente slot disponible
                   (mismo barbero si hay hueco, cualquier barbero si no)
                   notificar al cliente por WhatsApp
```

### Cálculo de comisión (ejecutar al confirmar pago en POS)

```typescript
// Se ejecuta automáticamente en la API de POS al crear una sale
async function calculateCommission(saleId: string) {
  const sale = await getSaleWithBarber(saleId)
  const rate = sale.barber.commission_rate
  const amount = (sale.total * rate) / 100
  const period = getCurrentCommissionPeriod() // quincena actual

  await createCommission({
    tenantId: sale.tenantId,
    barberId: sale.barberId,
    saleId: sale.id,
    amount,
    rate,
    periodStart: period.start,
    periodEnd: period.end,
  })
}
```

---

## 7. AGENTE DE WHATSAPP

### Flujo completo del webhook

```
POST /api/webhooks/whatsapp

1. Verificar X-Hub-Signature-256 con WHATSAPP_APP_SECRET → si falla: 401
2. Verificar que el evento es 'messages' → si no: return 200 (ignorar otros eventos)
3. Extraer: mensaje, sender WAID, phone_number_id
4. Identificar tenant por phone_number_id → si no existe: return 200
5. Buscar o crear conversation por (tenant_id, whatsapp_id)
6. Guardar mensaje inbound en messages

── BIFURCACIÓN POR MODO ──

SI conversation.mode === 'human':
   - Incrementar unread_human_count
   - Emitir evento Realtime en canal conversations:[tenantId]
   - return 200 (NO llamar a Claude)

SI conversation.mode === 'agent':
   - Si tipo = 'audio': transcribir con Whisper → usar texto transcrito
   - Si tipo = 'image': preparar base64 para vision
   - Buscar client por whatsapp_id
   - Cargar últimos 10 mensajes del historial
   - Cargar disponibilidad de agenda: próximas 48 horas por barbero
   - Llamar a buildAgentResponse()
   - Si respuesta contiene [ESCALATE]:
       → remover [ESCALATE] del texto
       → conversation.mode = 'human'
       → emitir evento Realtime
   - Enviar respuesta por WhatsApp API
   - Guardar mensaje outbound en messages
   - return 200
```

### buildAgentResponse — construcción del system prompt

```typescript
function buildSystemPrompt(tenant: Tenant, client: Client | null, availability: AgendaSlot[]): string {
  return `
${tenant.agent_knowledge_base}

---
DISPONIBILIDAD ACTUAL DE LA AGENDA (próximas 48 horas):
${formatAvailability(availability)}

---
CLIENTE ACTUAL:
${client
  ? `Nombre: ${client.name}
     Visitas previas: ${client.visitCount}
     Barbero preferido: ${client.preferredBarber?.name ?? 'Sin preferencia'}
     Clasificación: ${client.classification}
     Último servicio: ${client.lastService ?? 'Sin registro'}`
  : 'Cliente nuevo — no está registrado en el sistema.'
}

---
INSTRUCCIÓN DE ESCALACIÓN:
Si determinas que debes escalar la conversación (según las reglas del Knowledge Base),
responde con [ESCALATE] al inicio de tu mensaje.
Ejemplo: "[ESCALATE] Para este caso te conecto con alguien del equipo, un momento."
El sistema procesará el tag automáticamente.

---
HERRAMIENTAS DISPONIBLES:
Puedes crear citas directamente. Para hacerlo, responde con un JSON al final del mensaje:
<APPOINTMENT>{"clientName":"...","barberId":"...","serviceId":"...","startsAt":"..."}</APPOINTMENT>
El sistema lo procesará y confirmará la cita antes de enviar tu respuesta al cliente.
  `
}
```

### Human handoff — panel de recepción

- `PATCH /api/conversations/:id/mode` — cambiar entre 'agent' y 'human'
- `POST /api/conversations/:id/messages` — envío manual del recepcionista
- Supabase Realtime: suscripción al canal `conversations:[tenantId]` para notificaciones en tiempo real
- Al devolver el control al agente: mode = 'agent', unread_human_count = 0

---

## 8. PANTALLA TV — `/display`

- Ruta pública. Parámetro: `/display?tenant=mercurio-barberia`
- **No requiere autenticación** — solo lee datos no sensibles
- Supabase Realtime: suscripción a `queue_tickets` y `appointments` filtrados por tenant
- Layout: `w-2/3` video en loop + `w-1/3` panel de cola
- Panel muestra solo tickets con status `'waiting'` o `'called'`
- Cada fila del panel: número de turno, nombre del cliente (solo primer nombre), nombre del barbero
- Videos: cargados desde Supabase Storage en `display/[tenant-slug]/`
- El panel se actualiza en tiempo real sin recargar la página

---

## 9. APK — ACTUALIZACIÓN

El APK existente en App Store es un WebView que apunta a una URL. Al terminar el deploy en Vercel, actualizar la URL del WebView al dominio de producción. No requiere cambios en App Store.

---

## 10. CONVENCIONES DE CÓDIGO

- **TypeScript strict: true** — nunca usar `any`, nunca usar `as` sin justificación
- **Variables y funciones:** camelCase en inglés
- **Tablas y columnas de DB:** snake_case en inglés
- **Componentes React:** PascalCase
- **Archivos:** kebab-case
- **Comentarios de lógica de negocio:** en español
- **Server Components por default** en App Router — usar `'use client'` solo cuando se necesita interactividad de browser
- **Queries a Supabase:** siempre desde Server Components o Route Handlers — nunca exponer service_role al cliente
- **Manejo de errores:** siempre try/catch explícito, nunca silenciar
- **Formularios:** sin tag `<form>` en componentes React — usar event handlers

---

## 11. SEGURIDAD — REGLAS IRROMPIBLES

1. Row Level Security activado en **todas** las tablas — verificar en cada migration
2. Política base en toda tabla con tenant_id:
   ```sql
   CREATE POLICY "tenant_isolation" ON [tabla]
   USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
   ```
3. **Nunca** hardcodear tenant IDs ni UUIDs en el código
4. **Todas** las variables sensibles en `.env.local` — nunca en código ni en git
5. Verificar `X-Hub-Signature-256` en cada request al webhook de WhatsApp
6. Rate limiting en `/api/webhooks/whatsapp`: máximo 20 requests por número por minuto
7. **Nunca** loguear contenido de mensajes de WhatsApp en producción
8. **Siempre** soft delete — columna `deleted_at`, nunca `DELETE`
9. La ruta `/display` es pública pero sus queries tienen RLS que filtra por tenant slug
10. `SUPABASE_SERVICE_ROLE_KEY` solo en scripts de server — **nunca** en el cliente

---

## 12. VARIABLES DE ENTORNO

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Claude API
ANTHROPIC_API_KEY=

# WhatsApp
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_APP_SECRET=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_BUSINESS_ACCOUNT_ID=

# OpenAI (Whisper)
OPENAI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_TENANT_SLUG=mercurio-barberia
```

---

## 13. TESTING

- **TDD obligatorio** — escribir el test antes de la implementación en toda lógica de negocio
- Test files: `[archivo].test.ts` junto al archivo fuente
- E2E: Playwright en `/tests/e2e/`
- Load: k6 en `/tests/load/`

### Seed script (`scripts/seed.ts`)
Debe crear el tenant Mercurio Barbería con:
- Servicios reales del catálogo (corte $200, barba $150, etc.)
- Barberos reales → **[CONFIRMAR: nombres de los barberos]**
- 30 clientes ficticios con nombres mexicanos realistas
- 7 días de citas distribuidas por barbero (pasadas y futuras)
- 40 transacciones de POS con métodos de pago variados
- Conversaciones de WhatsApp de prueba

### Simulate script (`scripts/simulate.ts`)
Corre en paralelo:
- 200 mensajes de WhatsApp con 15 escenarios distintos
- 50 walk-ins distribuidos en la semana
- Test de conflicto: 2 clientes intentando el mismo slot simultáneamente
- Genera reporte de resultados al terminar

---

## 14. ORDEN DE CONSTRUCCIÓN — FASE 1

Construir en este orden exacto. No avanzar al siguiente punto sin que el anterior funcione y tenga tests:

```
[ ] 1. Setup base: Next.js 14 + Supabase + TypeScript + Tailwind + Vercel
[ ] 2. Migrations: todas las tablas de Fase 1 con RLS
[ ] 3. Auth: login por email/contraseña, middleware de tenant
[ ] 4. Seed: tenant Mercurio Barbería con datos reales
[ ] 5. Módulo agenda: calendario visual por barbero + CRUD de citas
[ ] 6. Módulo cola: algoritmo de asignación + pantalla /display con Realtime
[ ] 7. Módulo POS: cobro conectado a cita completada + métodos de pago
[ ] 8. Módulo clientes: registro, perfil e historial
[ ] 9. Panel conversaciones: lista + human handoff (sin agente todavía)
[10] 10. Agente WhatsApp: webhook + Claude + integración con agenda
[11] 11. Testing: seed script, E2E con Playwright, load test con k6
[12] 12. Go live: migración overnight
```

**NO iniciar Fase 2 (reportes, estadísticas, inventario) hasta que Fase 1 lleve 2 semanas en producción sin incidentes críticos.**

---

## 15. LO QUE NUNCA HACES

- Nunca crear un endpoint sin validar el `tenant_id` del usuario autenticado
- Nunca responder desde el agente si `conversation.mode === 'human'`
- Nunca crear citas sin ejecutar la verificación de conflictos
- Nunca borrar registros con `DELETE` — siempre `deleted_at = now()`
- Nunca saltar el check de tolerancia antes de crear un queue_ticket a una cita tardía
- Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` al cliente
- Nunca hardcodear strings de tenant, precios o IDs en el código
- Nunca loguear mensajes de WhatsApp en producción
- Nunca usar `<form>` en componentes React — solo event handlers
- Nunca iniciar Fase 2 antes de que Fase 1 esté estable en producción

---

*NEVO-POS v1.0 — Mercurio Barbería como tenant 0*
