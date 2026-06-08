# NEVO-POS — BLINDAJE5: Blindaje completo

> Instrucciones para Claude Code en la terminal (CLI).
> Objetivo: pasar de prototipo funcional a producto listo para go-live en una jornada.
> Tenant 0: **Mercurio Barbería** · Branch: `main`

---

## Antes de empezar

```
/autoaccept on
```

Lee este archivo completo antes de ejecutar cualquier cosa. Cada bloque tiene un criterio de aceptación — **no avances al siguiente bloque hasta que ese criterio pase**. El orden importa: seguridad primero, siempre.

**Alcance de esta sesión autónoma:** ejecuta los Bloques 1, 2 y 3 de principio a fin. Los Bloques 4 y 5 (infraestructura de producción, deploy, WhatsApp) requieren Supabase Pro, Vercel y Meta configurados con supervisión — NO los ejecutes en modo autónomo, quedan para la sesión del domingo. Al terminar el Bloque 3, genera un avance y detente.

Estado de entrada conocido:
- `npm run build` ✅ verde
- `npx tsc --noEmit` ✅ sin errores
- 12 módulos de Fase 1 completos y funcionando en dev
- Tests unit, E2E y `test:tenant-isolation` presentes pero sin blindaje de seguridad ni UX

---

## BLOQUE 1 — Seguridad (2.5 h) · No negociable

### 1.1 · Rate limiting en autenticación

```
Agrega rate limiting a /api/auth/login y /api/auth/verify-otp.

Reglas:
- /api/auth/login: máximo 10 intentos por IP cada 15 minutos. Al exceder, devuelve 429 con mensaje "Demasiados intentos. Intenta de nuevo en 15 minutos."
- /api/auth/verify-otp: máximo 5 intentos por cookie auth_pending. Al 6º intento incorrecto, invalida la cookie auth_pending y redirige al cliente a /login con error "Sesión expirada por intentos fallidos."
- Usa la misma estrategia que ya existe en lib/whatsapp/rate-limit.ts para mantener consistencia de patrones.
- Devuelve siempre 429 con JSON { error: string, retryAfter?: number } cuando se excede el límite.

Agrega en lib/auth/rate-limit.ts:
- loginRateLimit(ip: string): Promise<{ allowed: boolean; retryAfter?: number }>
- otpRateLimit(cookieId: string): Promise<{ allowed: boolean; attempts: number }>

Agrega un test en lib/auth/rate-limit.test.ts que verifique:
1. Al 6º OTP incorrecto la sesión se invalida y el test pasa
2. Al 11º intento de login desde la misma IP devuelve 429
```

**Criterio de aceptación:** `npm run test` verde. Probar manualmente: 5 OTPs incorrectos seguidos → al 6º regresa a /login con mensaje de error, no a /verify-otp.

---

### 1.2 · Validación Zod en todos los route handlers

```
Agrega validación de inputs con Zod a TODOS los route handlers bajo /api.

Instrucciones:
1. Crea lib/validation/ con un archivo por dominio:
   - lib/validation/appointments.ts
   - lib/validation/clients.ts
   - lib/validation/pos.ts
   - lib/validation/queue.ts
   - lib/validation/conversations.ts
   - lib/validation/auth.ts

2. Cada schema valida exactamente lo que el endpoint espera recibir (body, params, query).

3. En cada route handler, antes de cualquier lógica o consulta a Supabase:
   const parsed = schema.safeParse(body)
   if (!parsed.success) {
     return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
   }

4. Usa los datos de parsed.data (tipado) en lugar del body crudo en toda la lógica posterior.

5. No cambies la lógica de negocio existente — solo agrega la capa de validación de entrada.

Requisito adicional: un body completamente vacío a cualquier endpoint POST/PATCH debe devolver 400, nunca 500 ni un error de Supabase crudo.
```

**Criterio de aceptación:** `npm run build` verde. Enviar un body `{}` o malformado a cualquier endpoint devuelve 400 con detalle del error, nunca 500. Enviar el body correcto sigue funcionando igual que antes.

---

### 1.3 · RLS completo en tablas hijas

> **IMPORTANTE — leer antes del prompt:** Para las políticas RLS de `barber_schedules` y `sale_items`, usa `auth.jwt() ->> 'tenant_id'` EXACTAMENTE igual que las políticas existentes del Paso 2. NO uses `current_setting('request.jwt.claims', ...)`. El proyecto debe tener un solo patrón de lectura del claim en todas las políticas para que el test de aislamiento sea consistente.

```
Crea una nueva migration de Supabase que agregue políticas RLS a las tablas hijas que aún no las tienen de forma directa: barber_schedules y sale_items.

Usa auth.jwt() ->> 'tenant_id' igual que las políticas del Paso 2 (NO current_setting). Mantén un solo patrón en todo el proyecto.

Patrón a seguir (igual que messages usa EXISTS sobre conversations):

-- barber_schedules: hereda el tenant de su barbero padre
CREATE POLICY "tenant_isolation_barber_schedules" ON barber_schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM barbers b
      WHERE b.id = barber_schedules.barber_id
        AND b.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM barbers b
      WHERE b.id = barber_schedules.barber_id
        AND b.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- sale_items: hereda el tenant de su venta padre
CREATE POLICY "tenant_isolation_sale_items" ON sale_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_items.sale_id
        AND s.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_items.sale_id
        AND s.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

Antes de crear las políticas, asegúrate de que RLS esté habilitado en ambas tablas:
  ALTER TABLE barber_schedules ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

Nombre de la migration: supabase/migrations/20260603000001_rls_child_tables.sql

Después de crear la migration, aplícala con:
  supabase db push

Luego corre:
  npm run test:tenant-isolation

Y confirma que rowsecurity = true en ambas tablas con:
  supabase db query "SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('barber_schedules', 'sale_items');"
```

**Criterio de aceptación:** `npm run test:tenant-isolation` pasa completamente. Las dos tablas muestran `rowsecurity = true`. Todas las políticas del proyecto usan `auth.jwt()`, ninguna usa `current_setting`.

---

### 1.4 · Limpieza de secretos en historial git

```
Ejecuta los siguientes comandos y reporta el resultado exacto de cada uno:

1. git log --all --full-history -- "*.log"
2. git log --all --full-history -- .env.local
3. git log --all --full-history -- "*.env*"

Si algún comando devuelve commits (no vacío):
- Reporta qué archivos aparecen y en qué commits
- NO limpies el historial automáticamente — espera instrucción explícita

Si todos los comandos devuelven vacío (ningún commit):
- Agrega al .gitignore si no están ya:
    *.log
    .env.local
    .env.*.local
- Borra dev-3001.log del directorio de trabajo si existe: rm -f dev-3001.log
- Haz commit: git add .gitignore && git commit -m "chore: add log and env files to gitignore"

Reporta al final: "Historial limpio ✅" o "Encontré archivos sensibles en: [lista]"
```

**Criterio de aceptación:** los tres comandos git devuelven vacío. `.gitignore` incluye `*.log` y `.env.local`. `dev-3001.log` eliminado del directorio de trabajo.

---

## BLOQUE 2 — Robustez (2.5 h) · Que no se rompa

### 2.1 · Error boundaries y manejo de errores global

```
Agrega manejo de errores consistente en toda la app:

1. Crea app/error.tsx — error boundary global de Next.js con:
   - Mensaje amable al usuario ("Algo salió mal. Intenta de nuevo.")
   - Botón "Reintentar" que llama a reset()
   - Sin stack traces ni mensajes internos visibles
   - Estética consistente con el sistema de diseño dark/industrial

2. Crea app/(dashboard)/error.tsx — mismo patrón, para errores dentro del dashboard

3. Crea lib/utils/api-response.ts con helpers tipados:
   export function ok<T>(data: T, status = 200): NextResponse
   export function err(message: string, status: number, details?: unknown): NextResponse

   Formato estándar de respuesta:
   { ok: true, data: T }          // éxito
   { ok: false, error: string }   // error

4. Refactoriza todos los route handlers para usar estos helpers en lugar de NextResponse.json() directo

5. En cada route handler: envuelve toda la lógica en try/catch.
   - En el catch: console.error con contexto (ruta, método, mensaje de error) para debugging
   - Nunca exponer el error crudo, stack trace ni mensajes de Supabase al cliente
   - Devolver err("Error interno del servidor", 500)

Excepción: errores de validación Zod (bloque 1.2) sí pueden devolver los detalles porque son errores del cliente, no del servidor.
```

**Criterio de aceptación:** desconectar Supabase (o apuntar a una URL inválida temporalmente) y navegar el dashboard → aparece la pantalla de error amable, no un crash blanco ni un stack trace. El botón "Reintentar" funciona.

---

### 2.2 · Estados loading, empty y error en cada módulo

```
Cada módulo del dashboard (agenda, queue, pos, clients, conversations) debe tener tres estados visuales bien resueltos. Aplícalos en este orden de prioridad: agenda primero, luego clients, queue, pos, conversations.

Para cada módulo:

ESTADO LOADING:
- Skeleton: rectángulos grises animados (pulse) que replican el layout de la lista o tabla
- Nunca pantalla en blanco ni spinner centrado solo
- La barra lateral y el header se mantienen visibles durante la carga

ESTADO EMPTY:
- Ícono relacionado al módulo (lucide-react o similar)
- Mensaje claro y específico:
  agenda: "No hay citas para hoy"
  clients: "Aún no tienes clientes registrados"
  queue: "No hay fichas activas en este momento"
  pos: "No hay ventas registradas hoy"
  conversations: "No hay conversaciones activas"
- Una acción sugerida (botón o link): "Crear primera cita", "Agregar cliente", etc.

ESTADO ERROR:
- Mensaje: "No se pudo cargar la información"
- Botón "Reintentar" que vuelve a hacer el fetch
- Sin detalles técnicos del error

Mantén la estética industrial/luxury dark que ya tienen los módulos. Los skeletons usan el mismo tono oscuro de fondo con variación sutil de opacidad para el pulso.
```

**Criterio de aceptación:** navegar cada módulo con la DB desconectada → se ve el estado de error con botón de reintentar. Con DB conectada y sin datos → se ve el estado empty con mensaje contextual. Durante la carga → se ve el skeleton, nunca pantalla en blanco.

---

### 2.3 · Confirmaciones en acciones destructivas

```
Crea un componente Modal de confirmación reutilizable y aplícalo en todas las acciones irreversibles.

1. Crea components/ui/ConfirmModal.tsx:
   Props:
   - isOpen: boolean
   - title: string
   - description: string
   - confirmLabel: string (default: "Confirmar")
   - cancelLabel: string (default: "Cancelar")
   - variant: "danger" | "warning" (afecta el color del botón de confirmación)
   - onConfirm: () => void
   - onCancel: () => void

   Estética: modal centrado, overlay oscuro, botón destructivo en rojo, cancelar en gris neutro
   El botón destructivo dice exactamente qué va a pasar: "Sí, cancelar cita", "Sí, cerrar caja", etc.

2. Aplica el modal antes de ejecutar estas acciones:
   - Cancelar cita (agenda)
   - Eliminar cliente (clients)
   - Cerrar turno de caja (pos)
   - Tomar control humano de conversación (conversations → HandoffToggle al pasar de agente a humano)
   - Devolver conversación al agente (conversations → HandoffToggle al pasar de humano a agente)

3. Las acciones de lectura, creación y edición NO necesitan confirmación.
```

**Criterio de aceptación:** ninguna de las acciones listadas ejecuta con un solo clic. Todas abren el modal de confirmación primero. Presionar "Cancelar" en el modal no ejecuta nada.

---

### 2.4 · Sistema de toasts

```
Agrega un sistema de notificaciones temporales (toasts) para feedback de todas las acciones del usuario.

1. Crea components/ui/Toast.tsx y components/ui/ToastContainer.tsx
2. Crea hooks/useToast.ts con:
   - toast.success(message: string)
   - toast.error(message: string)
   - toast.info(message: string)
   Los toasts desaparecen solos a los 4 segundos. El usuario puede cerrarlos manualmente.

3. Integra ToastContainer en app/(dashboard)/layout.tsx

4. Reemplaza en todos los módulos:
   - console.log de confirmaciones → toast.success
   - alert() o mensajes inline de error → toast.error
   - Mensajes informativos inline → toast.info

5. Mensajes estándar por acción (usa exactamente estos textos):
   Cita creada: "Cita registrada correctamente"
   Cita cancelada: "Cita cancelada"
   Cita actualizada: "Cita actualizada"
   Cliente creado: "Cliente agregado"
   Cliente actualizado: "Perfil actualizado"
   Venta registrada: "Venta registrada · $[monto]"
   Caja abierta: "Turno de caja iniciado"
   Caja cerrada: "Turno de caja cerrado"
   Ficha asignada: "Ficha [número] asignada a [barbero]"
   Error genérico: "Algo salió mal. Intenta de nuevo."

Estética: esquina inferior derecha, apilados si hay varios, verde para success, rojo para error, gris oscuro para info. Consistente con el sistema dark.
```

**Criterio de aceptación:** crear una cita, registrar una venta, y provocar un error → cada acción muestra su toast correspondiente. Los toasts desaparecen solos. No quedan alerts ni mensajes inline donde había toasts.

---

## BLOQUE 3 — Fluidez (1.5 h) · Que se sienta profesional

### 3.1 · Responsive en todos los módulos

```
Haz que el dashboard completo funcione correctamente en celular (375px de ancho). La recepcionista debe poder usarlo desde su teléfono.

Cambios requeridos:

SIDEBAR:
- En pantallas < 768px: el sidebar se oculta completamente
- Agrega un botón hamburguesa (ícono de menú) en el header del dashboard
- Al presionar, el sidebar aparece como drawer deslizante desde la izquierda con overlay oscuro
- Al seleccionar una ruta, el drawer se cierra automáticamente

TABLAS:
- En < 768px: las tablas (clientes, agenda en lista, ventas) se convierten en cards apilables verticalmente
- Cada card muestra los 2-3 campos más importantes, el resto se puede omitir en mobile
- No forzar scroll horizontal en ninguna tabla

MODALES:
- En < 768px: los modales ocupan 100% del ancho y 90% del alto de la pantalla
- Se deslizan desde abajo (bottom sheet) en lugar de aparecer centrados

EXCEPCIONES que NO se modifican:
- La pantalla /display (diseñada para TV horizontal, queda como está)
- Los breakpoints de tablet (768px–1024px) son opcionales si el tiempo no alcanza — prioriza mobile primero

Prueba cada vista en el inspector del navegador a 375px antes de marcar como hecho.
```

**Criterio de aceptación:** abrir agenda, clientes, queue, pos y conversations en el inspector a 375px — todo es usable, nada está cortado, ningún elemento desborda el viewport horizontalmente.

---

### 3.2 · Microinteracciones y pulido visual

```
Lee .claude/skills/frontend-design/SKILL.md y aplica pulido de microinteracciones en todo el dashboard:
- Transiciones suaves de 150ms en hovers y cambios de estado
- Feedback visual al hacer clic en botones (estado active)
- Animación sutil de entrada al aparecer modales, toasts y drawers
- Sin efectos llamativos ni gradientes decorativos

Mantén la estética industrial/luxury dark. El objetivo es que se sienta caro y preciso, como una herramienta de Linear o Vercel. La intencionalidad es lo que importa — cada transición debe sentirse deliberada, no automática.
```

**Criterio de aceptación:** navegar la app se siente fluido y deliberado, sin saltos bruscos entre estados.

---

## BLOQUE 3 — Cierre de la sesión autónoma

Al terminar el Bloque 3, ejecuta esto y detente:

```
Corre la suite de verificación y reporta el resultado de cada comando:
1. npm run build
2. npx tsc --noEmit
3. npm run test
4. npm run test:tenant-isolation

Genera AVANCE_BLINDAJE.md con:
- Resultado de cada sub-bloque (1.1 a 3.2) con ✅ o ❌
- Resultado de cada comando de verificación
- Cualquier criterio de aceptación que no haya pasado y por qué
- Lista de lo que queda para los Bloques 4 y 5 (sesión del domingo)

Haz commit:
git add .
git commit -m "feat: blindaje bloques 1-3 — seguridad, robustez, fluidez"
git push origin main

DETENTE aquí. No ejecutes los Bloques 4 ni 5 — esos requieren Supabase Pro, Vercel y Meta con supervisión, y se hacen el domingo.
```

---

## Para el domingo (con supervisión, NO autónomo)

Estos bloques NO se ejecutan en esta sesión. Quedan documentados aquí para el día del go-live.

**Bloque 4 — Infraestructura de producción:**
- Supabase Pro + proyecto de producción separado del de dev
- Migrations + RLS aplicadas y verificadas en prod
- Nombres reales de barberos en el seed
- Todas las env vars en Vercel
- Credenciales de WhatsApp por-tenant en la fila del tenant
- Resend configurado y PROBADO con login real (sin esto nadie puede entrar)

**Bloque 5 — Deploy, WhatsApp y verificación:**
- `vercel --prod` con HTTPS
- Webhook de Meta apuntando a producción
- Videos de la TV en Supabase Storage
- Smoke test completo en producción
- Prueba de WhatsApp real con el agente respondiendo

---

## Criterios de éxito de los Bloques 1-3

Al cerrar esta sesión, todo esto debe estar en verde:

**Seguridad**
- [ ] Rate limiting en /api/auth/login (10/IP/15min) y /verify-otp (5 intentos → invalida cookie)
- [ ] Validación Zod en los 20 route handlers — body malformado → 400, nunca 500
- [ ] RLS en barber_schedules y sale_items con rowsecurity = true, usando auth.jwt()
- [ ] Historial git sin .log ni .env.local — dev-3001.log eliminado

**Robustez**
- [ ] Error boundaries en app/error.tsx y app/(dashboard)/error.tsx
- [ ] Estados loading (skeleton), empty (mensaje + acción) y error (retry) en los 5 módulos
- [ ] Modal de confirmación en las 5 acciones destructivas
- [ ] Sistema de toasts con los textos estándar definidos

**Fluidez**
- [ ] Sidebar hamburguesa funcional a 375px
- [ ] Tablas como cards en mobile
- [ ] Modales como bottom sheet en mobile
- [ ] Microinteracciones pulidas de 150ms

**Calidad**
- [ ] `npm run build` verde
- [ ] `npx tsc --noEmit` sin errores
- [ ] Unit + tenant-isolation verdes
- [ ] `AVANCE_BLINDAJE.md` generado y commiteado

---

> Recordatorio: no iniciar Fase 2 (multi-tenant SaaS) hasta que Mercurio lleve **2 semanas en producción sin incidentes críticos**. El primer cliente externo paga por confianza, y esa confianza se construye operando, no codificando.

---

*NEVO-POS · BLINDAJE5 · Bloques 1-3 autónomos · Mercurio Barbería como tenant 0 · Mercuro.Studio*
