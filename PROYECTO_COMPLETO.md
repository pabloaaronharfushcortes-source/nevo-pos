# NEVO-POS — Proyecto Completo (Fase 1)

> Estado consolidado del proyecto al cierre de la Fase 1. Tenant 0: **Mercurio Barbería** (Zapopan, Jalisco).
> Documento de referencia para el go-live. Para el procedimiento detallado de migración ver [docs/go-live.md](docs/go-live.md).
>
> Generado: 2026-06-02 · Branch: `main`

---

## 1. Resumen por paso (orden de construcción, CLAUDE.md §14)

| Paso | Descripción | Estado |
|---|---|---|
| 1 | Scaffold Next.js 14 (App Router) + Supabase + TypeScript strict + Tailwind + estructura de carpetas | ✅ |
| 2 | Migrations: todas las tablas de Fase 1 con RLS, hook de custom access token (tenant_id en JWT) y tipos generados | ✅ |
| 3 | Auth: clientes Supabase (browser/server/middleware), login email+password con **OTP de 6 dígitos** por email (cifrado AES-256-GCM en cookie `auth_pending`) | ✅ |
| 4 | Seed de Mercurio Barbería: tenant, admin, barberos, horarios, servicios, 30 clientes, citas, ventas, conversaciones | ✅ |
| 5 | Módulo Agenda: calendario visual por barbero + CRUD de citas con verificación de conflictos | ✅ |
| 6 | Módulo Cola: algoritmo de asignación de fichas walk-in + pantalla `/display` pública con Realtime | ✅ |
| 7 | Módulo POS: cobro conectado a cita/ficha, métodos de pago, comisiones automáticas y turno de caja | ✅ |
| 8 | Módulo Clientes: lista, perfil, lealtad e historial (migrado al sistema de diseño industrial) | ✅ |
| 9 | Panel Conversaciones: lista + thread + human handoff (toggle agente/humano) — sin agente todavía | ✅ |
| 10 | Agente WhatsApp: webhook (verificación de firma + rate limit), Claude, transcripción Whisper, integración con agenda y escalación `[ESCALATE]` | ✅ |
| 11 | Testing: unit (Vitest), E2E (Playwright), carga (k6) y `scripts/simulate.ts` | ✅ |
| 12 | Go live: `scripts/preflight.ts`, runbook de migración ([docs/go-live.md](docs/go-live.md)) y README | ✅ |

> Cada paso vive en un commit descriptivo propio en el historial de `git` (algunos con un commit de "Revisión" de documentación). El historial **no se reescribió**: ya estaba organizado un-commit-por-paso y ya publicado en `origin/main` (ver §6).

---

## 2. Archivos clave creados por paso

**Paso 1 — Scaffold:** `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.mjs`, `app/layout.tsx`, `app/globals.css`, `.env.local.example`, `CLAUDE.md`, estructura completa de carpetas.

**Paso 2 — DB:** `supabase/migrations/20260601000001_tenants_users_and_auth_hook.sql`, `…000002_barbers_schedules_services.sql`, `…000003_clients_appointments_queue.sql`, `…000004_cash_registers_sales_commissions.sql`, `types/database.ts`, `scripts/tenant-isolation-test.mjs`.

**Paso 3 — Auth:** `app/(auth)/login/page.tsx`, `app/(auth)/verify-otp/page.tsx`, `app/api/auth/login/route.ts`, `app/api/auth/verify-otp/route.ts`, `lib/auth/otp.ts`, `lib/email.ts`, `lib/supabase/{client,server,middleware}.ts`.

**Paso 4 — Seed:** `scripts/seed.ts`, migration `conversations`/`messages`.

**Paso 5 — Agenda:** `app/(dashboard)/agenda/page.tsx`, `app/(dashboard)/layout.tsx`, `app/(dashboard)/LogoutButton.tsx`, `app/api/appointments/route.ts` + `[id]/route.ts`, componentes de agenda.

**Paso 6 — Cola/Display:** `lib/utils/queue.ts`, `app/(dashboard)/queue/page.tsx`, `app/display/page.tsx`, `components/display/DisplayClient.tsx`, `components/queue/{QueueBoard,NewTicketModal}.tsx`, `hooks/{useQueue,useRealtime}.ts`, `app/api/queue/route.ts` + `[id]`, `app/api/display/queue/route.ts`, migration de policy de display.

**Paso 7 — POS:** `app/(dashboard)/pos/page.tsx`, `app/api/pos/route.ts`, `app/api/pos/cash-register/route.ts` + `[id]`, `components/pos/{POSBoard,SaleModal,CashRegisterWidget}.tsx`, `lib/utils/commissions.ts`, `lib/utils/receipts.ts`.

**Paso 8 — Clientes:** `app/(dashboard)/clients/page.tsx`, `app/api/clients/route.ts` + `[id]`, `components/clients/{ClientsBoard,ClientProfilePanel,ClientModal}.tsx`, `lib/utils/clients.ts`.

**Paso 9 — Conversaciones:** `app/(dashboard)/conversations/page.tsx`, `app/api/conversations/route.ts` + `[id]` + `[id]/mode` + `[id]/messages`, `components/conversations/{ConversationsBoard,ConversationList,MessageThread,HandoffToggle}.tsx`, `hooks/useConversations.ts`, `lib/whatsapp/send.ts`.

**Paso 10 — Agente WhatsApp:** `app/api/webhooks/whatsapp/route.ts`, `lib/claude/{agent,prompts}.ts`, `lib/whatsapp/{process,receive,rate-limit}.ts`, `lib/openai/whisper.ts`, `lib/utils/slots.ts`.

**Paso 11 — Testing:** `vitest.config.ts`, `playwright.config.ts`, `lib/**/*.test.ts`, `tests/e2e/smoke.spec.ts`, `tests/load/webhook.js`, `scripts/simulate.ts`.

**Paso 12 — Go live:** `scripts/preflight.ts`, `docs/go-live.md`, `README.md`.

**Post-Fase 1 — Fix:** `app/(dashboard)/SidebarNav.tsx` (extracción del nav del sidebar a Client Component).

---

## 3. Estado actual del build

- **`npm run build`**: ✅ verde — compila sin errores.
- **`npx tsc --noEmit`**: ✅ sin errores de tipos (TypeScript strict).
- **Rutas generadas:** 7 páginas (`/`, `/login`, `/verify-otp`, `/agenda`, `/clients`, `/conversations`, `/display`, `/pos`, `/queue`) + 20 route handlers de API + middleware (82.8 kB).
- **Dev server:** corre en `localhost:3001`; `/agenda` responde `200` tras el fix del sidebar.

---

## 4. Pendientes pre-go-live

**Bloqueantes (resolver antes del domingo):**
- [ ] **Confirmar nombres reales de los barberos** en `scripts/seed.ts` (hoy son placeholders Barbero1/2/3).
- [ ] Crear proyecto de **Supabase de producción** (separado del de dev) y aplicar migrations.
- [ ] App de **Meta WhatsApp en modo Live** (no test) con número de producción verificado.
- [ ] Cargar **todas las variables de entorno** en Vercel (Production) — ver CLAUDE.md §12 y [docs/go-live.md](docs/go-live.md) §1.
- [ ] Definir **dominio de producción** (ej. `app.mercuriobarberia.com`) con HTTPS.
- [ ] Configurar credenciales de WhatsApp **por-tenant** en la fila de `tenants` (`whatsapp_phone_number_id`, `whatsapp_access_token`, `whatsapp_verify_token`).

**Verificación:**
- [ ] `npm run test` (unit), `npx playwright test` (E2E) y `npm run preflight` en verde contra prod.
- [ ] `npm run test:tenant-isolation` — confirmar aislamiento de RLS por tenant.
- [ ] Subir videos de la TV a Supabase Storage en `display/mercurio-barberia/`.
- [ ] Decidir si el seed de prod arranca limpio (solo catálogo + admin + barberos) o con datos de ejemplo.

**Operativo:**
- [ ] Actualizar la URL del WebView del APK al dominio de producción (no requiere App Store).
- [ ] Borrar `dev-3001.log` (contiene OTPs en claro de dev — ver §5).

---

## 5. Credenciales de desarrollo

> ⚠️ **Solo desarrollo.** Los secretos reales viven en `.env.local` (git-ignored) — nunca se commitean. Plantilla en `.env.local.example`. En producción se cargan en Vercel.

**Login admin (generado por `npm run seed`, ya presente en `scripts/seed.ts`):**

| Campo | Valor |
|---|---|
| Email | `admin@mercuriobarberia.com` |
| Contraseña | `MercurioAdmin2026!` |
| OTP (dev) | Se imprime en consola del dev server: `[DEV] OTP para <email>: <código>` (ver `lib/email.ts`). En prod se envía por email vía Resend. |

**Secretos requeridos en `.env.local` (no incluidos aquí):** `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `WHATSAPP_*`, `AUTH_OTP_SECRET`, `RESEND_API_KEY`. Lista completa en CLAUDE.md §12.

---

## 6. Instrucciones para el domingo (deploy + WhatsApp + testing)

> El procedimiento completo y verificable está en **[docs/go-live.md](docs/go-live.md)**. Resumen del orden:

**A. Deploy**
1. Supabase prod: `supabase link --project-ref <PROD_REF>` → `supabase db push` (aplica migrations + RLS).
2. Verificar `rowsecurity = true` en todas las tablas (regla de seguridad #1).
3. Sembrar: `npm run seed` con `.env.local` apuntando a prod (ajustado a nombres reales de barberos).
4. Pre-vuelo: `npm run preflight` → debe decir **✅ LISTO PARA GO-LIVE** con 0 fallas.
5. Deploy: `vercel --prod` (o push a `main` con auto-deploy). Confirmar build verde + dominio con HTTPS.

**B. WhatsApp**
6. En Meta → WhatsApp → Configuration → Webhook:
   - Callback URL: `https://<dominio-prod>/api/webhooks/whatsapp`
   - Verify token: el `whatsapp_verify_token` del tenant
   - Suscribir el campo **messages** (Meta hace GET de verificación → 200 con `hub.challenge`).
7. Configurar credenciales reales de WhatsApp en la fila del tenant.
8. Enviar un WhatsApp real al número del negocio → confirmar que el agente responde y crea cita.

**C. Testing / humo en prod (madrugada, antes de abrir)**
9. Login con OTP por email.
10. Crear y borrar una cita en agenda; asignar una ficha walk-in en cola.
11. Cobrar una venta en POS y verificar que se generó la comisión.
12. Tomar control humano de una conversación y responder manual; devolver al agente.
13. `npm run test:tenant-isolation` para confirmar aislamiento de tenant.
14. Abrir `/display?tenant=mercurio-barberia` en la TV y confirmar Realtime.
15. Actualizar URL del WebView del APK.

**Rollback:** en Vercel *Promote* el deployment estable anterior; desuscribir webhook en Meta y atender manual; datos a salvo por soft delete + PITR de Supabase. Detalle en [docs/go-live.md](docs/go-live.md) §10.

> Recordatorio (CLAUDE.md §14): **no** iniciar Fase 2 hasta que Fase 1 lleve 2 semanas en producción sin incidentes críticos.

---

*NEVO-POS v1.0 — Fase 1 completa · Mercurio Barbería como tenant 0*
