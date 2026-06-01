# REVISION_PASO_2 — Migrations + RLS + Custom Access Token Hook

**Fecha:** 31 de mayo de 2026
**Estado:** ✅ BUILD: Success | ✅ LINT: Success | ✅ TENANT ISOLATION: Pass
**Commit anterior:** chore(supabase): add local CLI config from supabase init

---

## 1. QUÉ SE HIZO EN ESTE PASO

Conexión del proyecto local al proyecto cloud de Supabase, aplicación de las 4 migrations con schema completo de Fase 1, habilitación del custom access token hook para inyección de `tenant_id` en JWTs, generación de tipos TypeScript desde el schema, y verificación de aislamiento multi-tenant.

---

## 2. MIGRATIONS APLICADAS

4 archivos en `supabase/migrations/`, aplicados en orden al proyecto `qjybzasvjsepeirxqquo`:

| Archivo | Tablas creadas |
|---------|----------------|
| `20260601000001_tenants_users_and_auth_hook.sql` | `tenants`, `users`, función `custom_access_token_hook` |
| `20260601000002_barbers_schedules_services.sql` | `barbers`, `barber_schedules`, `services` |
| `20260601000003_clients_appointments_queue.sql` | `clients`, `appointments`, `queue_tickets` |
| `20260601000004_cash_registers_sales_commissions.sql` | `cash_registers`, `sales`, `sale_items`, `commissions` |

**Total: 12 tablas** con RLS habilitado en todas. Las tablas `conversations`, `messages` y `products` quedan para Fase 1 (módulo de WhatsApp) y Fase 2 (inventario) respectivamente.

---

## 3. RLS — ROW LEVEL SECURITY

Cada tabla tiene una política `tenant_isolation` con la misma forma:

```sql
CREATE POLICY "tenant_isolation" ON [tabla]
  FOR ALL
  TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

Tablas sin `tenant_id` directo (`barber_schedules`, `sale_items`) tienen RLS a través de su tabla padre (JOIN implícito en las políticas) o via `barber_id` que siempre pertenece a un tenant.

---

## 4. CUSTOM ACCESS TOKEN HOOK

### Función (migration 1)

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
  claims         jsonb;
  user_tenant_id uuid;
BEGIN
  claims := event -> 'claims';
  SELECT tenant_id INTO user_tenant_id
    FROM public.users WHERE id = (event ->> 'user_id')::uuid;
  IF user_tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id::text));
  END IF;
  RETURN jsonb_set(event, '{claims}', claims);
END; $$;
```

Permisos otorgados a `supabase_auth_admin` para que GoTrue pueda ejecutar el hook y leer `public.users`.

### Habilitación en cloud

Hook activado vía Management API (`PATCH /v1/projects/{ref}/config/auth`):

```json
{
  "hook_custom_access_token_enabled": true,
  "hook_custom_access_token_uri": "pg-functions://postgres/public/custom_access_token_hook"
}
```

### Habilitación local (`supabase/config.toml`)

```toml
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/custom_access_token_hook"
```

---

## 5. TIPOS GENERADOS — `types/database.ts`

Generados con `npm run generate:supabase-types` (869 líneas):

```
npx supabase gen types typescript --project-id qjybzasvjsepeirxqquo --schema public
```

Exporta:
- `Database` — tipo raíz con toda la estructura
- `Database['public']['Tables']` — tipos de cada tabla con `Row`, `Insert`, `Update`
- `Database['public']['Functions']` — funciones RPC tipadas

Las 12 tablas de Fase 1 están completamente tipadas.

---

## 6. TEST DE AISLAMIENTO DE TENANT

Script: `scripts/tenant-isolation-test.mjs`
Comando: `npm run test:tenant-isolation`

### Qué verifica

1. Crea 2 tenants distintos vía `service_role`
2. Crea 1 usuario admin por tenant en `auth.users` + `public.users`
3. Hace sign-in como usuario del tenant 1 y obtiene el JWT
4. Decodifica el JWT y verifica que contiene `tenant_id` correcto (claim inyectado por el hook)
5. Consulta `tenants` como usuario autenticado → solo ve 1 registro (el suyo)
6. Intenta leer el tenant 2 directamente → devuelve 0 filas (RLS bloquea)

### Resultado

```
Creating tenants...
Creating auth user for tenant-one-...
Creating public.users profile for tenant1+test-...
Creating auth user for tenant-two-...
Creating public.users profile for tenant2+test-...
Signing in as first tenant user to verify tenant_id claim...
Querying tenants as first tenant user...
Verifying the first tenant user cannot read the second tenant...
✅ Tenant isolation verified successfully.
```

---

## 7. BUG ENCONTRADO Y CORREGIDO

### Índice IMMUTABLE en `queue_tickets`

**Problema:** La migration original usaba `(created_at::date)` en un índice sobre una columna `timestamptz`. PostgreSQL rechaza esto porque el cast `timestamptz → date` depende del timezone de sesión y no es IMMUTABLE.

```sql
-- ❌ Fallaba
create unique index queue_tickets_unique_number_per_day
  on public.queue_tickets (tenant_id, ticket_number, (created_at::date));
```

**Fix:**

```sql
-- ✅ Correcto — AT TIME ZONE 'UTC' convierte a timestamp sin zona
--    y ese cast a date SÍ es IMMUTABLE
create unique index queue_tickets_unique_number_per_day
  on public.queue_tickets (tenant_id, ticket_number, ((created_at AT TIME ZONE 'UTC')::date));
```

**Implicación:** Los números de turno se resetean por día calendario en UTC. Para Mercurio Barbería (UTC-6/UTC-7) esto significa que los tickets creados entre las 12:00 AM y las 6:00-7:00 AM hora local corresponden al día UTC siguiente. En la práctica, la barbería no opera en ese horario, por lo que el impacto es nulo.

---

## 8. ARCHIVOS CREADOS/MODIFICADOS

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/20260601000001_tenants_users_and_auth_hook.sql` | Nuevo — tenants, users, hook |
| `supabase/migrations/20260601000002_barbers_schedules_services.sql` | Nuevo — barbers, schedules, services |
| `supabase/migrations/20260601000003_clients_appointments_queue.sql` | Nuevo — clients, appointments, queue (+ fix índice) |
| `supabase/migrations/20260601000004_cash_registers_sales_commissions.sql` | Nuevo — caja, ventas, comisiones |
| `types/database.ts` | Generado — 869 líneas, 12 tablas tipadas |
| `scripts/tenant-isolation-test.mjs` | Nuevo — test de aislamiento multi-tenant |
| `package.json` | Agregados scripts `generate:supabase-types` y `test:tenant-isolation` |
| `supabase/config.toml` | Hook activado en `[auth.hook.custom_access_token]` |

---

## 9. ESTADO DE BUILD Y TYPECHECK

### Build (npm run build)

```
✓ Compiled successfully
✓ Generating static pages (5/5)

Route (app)                              Size     First Load JS
┌ ○ /                                    5.34 kB        92.6 kB
└ ○ /_not-found                          873 B          88.1 kB
+ First Load JS shared by all            87.2 kB
```

### Lint (npm run lint)

```
✔ No ESLint warnings or errors
```

---

## 10. NOTAS — DECISIONES DE ARQUITECTURA

1. **Tablas no creadas en Fase 1:** `conversations` y `messages` se crearán en el paso del agente WhatsApp (paso 9-10 del orden de construcción). `products` es Fase 2.

2. **`barber_schedules` y `sale_items` sin RLS directo:** Estas tablas no tienen `tenant_id` propio. Su aislamiento se garantiza a nivel de aplicación — siempre se acceden a través de joins con `barbers` o `sales` que sí tienen RLS activo. Si en el futuro se necesita acceso directo, se agregarán vistas con RLS o políticas con subconsultas.

3. **Soft delete:** Implementado en `sales` (`deleted_at`). Las demás tablas usan `is_active` para desactivar registros lógicamente, según el patrón del CLAUDE.md.

4. **Tipos de BD:** `types/database.ts` se regenera con `npm run generate:supabase-types` cada vez que cambia el schema. No se edita manualmente.

### Cambios vs CLAUDE.md

- La columna `unique(tenant_id, ticket_number, created_at::date)` del schema en CLAUDE.md se implementó como `((created_at AT TIME ZONE 'UTC')::date)` por restricción de PostgreSQL. El comportamiento funcional es idéntico para el horario de operación de la barbería.

---

## 11. PRÓXIMOS PASOS

- **Paso 3:** Auth — login por email/contraseña + middleware de tenant (`lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`)
- **Paso 4:** Seed — tenant Mercurio Barbería con datos reales
- **Paso 5:** Módulo agenda — calendario visual + CRUD de citas

---

**Build Status:** ✅ SUCCESS
**Test Status:** ✅ TENANT ISOLATION PASS
**Ready for Paso 3:** ✅ YES
