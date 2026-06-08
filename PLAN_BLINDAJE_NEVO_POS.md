# PLAN DE BLINDAJE — NEVO-POS

> De "funciona en mi Mac" a "producto profesional vendible".
> Objetivo: nivel profesional sin una sola falla en **1 día**. Vendible como SaaS en **1 semana**.
> Tenant 0: Mercurio Barbería. Branch: `main`.

---

## Cómo usar este documento

Cada bloque tiene un **prompt listo para pegar** en Claude Code y un **criterio de aceptación** (cómo sabes que quedó bien). Ejecuta en orden. No avances al siguiente bloque hasta que el criterio de aceptación pase.

Activa el modo autónomo al inicio de cada sesión:
```
/autoaccept on
```

---

# FASE 1 — BLINDAJE (mañana, 1 día)

El objetivo de hoy: que el sistema no tenga huecos de seguridad, no se rompa con inputs raros, y se sienta fluido. Es la diferencia entre un prototipo y un producto.

## Bloque 1 — Seguridad (lo primero, no negociable)

### 1.1 Rate limiting en autenticación

**Prompt:**
```
Agrega rate limiting a /api/auth/login y /api/auth/verify-otp.
- Máximo 5 intentos de OTP por cookie auth_pending. Al 6º intento,
  invalida la cookie y obliga a empezar de nuevo desde /login.
- Máximo 10 intentos de login por IP cada 15 minutos.
- Usa la misma estrategia de rate-limit que ya existe en el webhook
  de WhatsApp (lib/whatsapp/rate-limit.ts) para mantener consistencia.
- Devuelve 429 con mensaje claro cuando se excede.
Agrega un test que verifique que al 6º OTP incorrecto la sesión se invalida.
```

**Criterio de aceptación:** el test pasa. Probar manualmente: 5 OTPs incorrectos → al 6º regresa a login.

### 1.2 Validación de inputs con Zod en todas las rutas API

**Prompt:**
```
Agrega validación con Zod a TODOS los route handlers de /api.
Cada endpoint debe validar su body/params con un schema Zod antes
de tocar la base de datos. Si la validación falla, devuelve 400 con
el detalle del error. Crea los schemas en lib/validation/ organizados
por dominio (appointments, pos, clients, queue, conversations).
No cambies la lógica, solo agrega la capa de validación de entrada.
```

**Criterio de aceptación:** `npm run build` verde. Enviar un body malformado a cualquier endpoint devuelve 400, no 500.

### 1.3 Completar RLS en tablas hijas

**Prompt:**
```
Crea una migration nueva que agregue políticas RLS directas a
barber_schedules y sale_items usando subconsultas EXISTS sobre su
tabla padre (barbers y sales respectivamente), del mismo modo que
messages usa EXISTS sobre conversations. Aplica la migration y corre
npm run test:tenant-isolation para confirmar que sigue aislando.
```

**Criterio de aceptación:** test de aislamiento pasa. `rowsecurity = true` en las dos tablas.

### 1.4 Limpieza de secretos en historial

**Prompt:**
```
Verifica si dev-3001.log o cualquier archivo .log está en el historial
de git con: git log --all --full-history -- "*.log"
Si aparece alguno, dime cuál. Agrega *.log al .gitignore si no está.
Confirma que .env.local NUNCA estuvo en el historial con:
git log --all --full-history -- .env.local
```

**Criterio de aceptación:** ningún `.log` ni `.env.local` en el historial. Si aparecen, hay que limpiar el historial antes de cualquier cosa.

---

## Bloque 2 — Robustez (que no se rompa)

### 2.1 Manejo de errores global

**Prompt:**
```
Agrega manejo de errores consistente en toda la app:
- app/error.tsx — error boundary global con opción de reintentar
- app/(dashboard)/error.tsx — error boundary del dashboard
- En cada route handler: try/catch que devuelve un error tipado,
  nunca un stack trace crudo al cliente.
- Un helper lib/utils/api-response.ts con respuestas estándar
  { ok, data, error } para todos los endpoints.
Registra los errores del servidor en consola con contexto suficiente
para debugging, pero nunca expongas detalles internos al cliente.
```

**Criterio de aceptación:** forzar un error (apagar Supabase) muestra una pantalla amable, no un crash.

### 2.2 Estados de carga, vacío y error en cada vista

**Prompt:**
```
Cada módulo del dashboard (agenda, queue, pos, clients, conversations)
debe tener tres estados visuales bien resueltos:
- Loading: skeleton o spinner mientras carga, nunca pantalla en blanco
- Empty: mensaje claro cuando no hay datos ("No hay citas hoy",
  "Sin clientes aún") con una acción sugerida
- Error: mensaje de error con botón de reintentar
Aplica el sistema de diseño industrial/dark que ya usamos.
Mantén consistencia visual entre todos los módulos.
```

**Criterio de aceptación:** cada vista se ve bien con 0 datos, cargando, y con error. Nunca un flash en blanco.

### 2.3 Confirmaciones en acciones destructivas

**Prompt:**
```
Agrega diálogos de confirmación antes de cualquier acción irreversible:
cancelar cita, cerrar caja, eliminar cliente, tomar/devolver control
de conversación. Usa un componente Modal de confirmación reutilizable
en components/ui/. El botón destructivo en rojo, el de cancelar neutro.
```

**Criterio de aceptación:** ninguna acción destructiva ocurre con un solo clic accidental.

### 2.4 Notificaciones (toasts)

**Prompt:**
```
Agrega un sistema de toasts (notificaciones temporales) para feedback
de acciones: "Cita creada", "Venta registrada", "Error al guardar".
Crea components/ui/Toast.tsx y un hook useToast. Verde para éxito,
rojo para error, neutro para info. Reemplaza los alerts y mensajes
inline donde tenga sentido por toasts consistentes.
```

**Criterio de aceptación:** toda acción del usuario da feedback visual inmediato.

---

## Bloque 3 — Fluidez (que se sienta profesional)

### 3.1 Responsive y mobile

**Prompt:**
```
Haz que todo el dashboard funcione bien en móvil (la recepcionista
puede usar el celular). El sidebar colapsa a un menú hamburguesa en
pantallas chicas. Las tablas se vuelven cards apilables en móvil.
Los modales ocupan pantalla completa en móvil. Prueba a 375px de ancho.
La pantalla /display sigue optimizada para TV horizontal.
```

**Criterio de aceptación:** abrir cada vista en el inspector a 375px — todo usable, nada cortado.

### 3.2 Transiciones y microinteracciones

**Prompt:**
```
Lee .claude/skills/frontend-design/SKILL.md y aplica pulido de
microinteracciones en todo el dashboard: transiciones suaves de 150ms
en hovers y cambios de estado, feedback al hacer clic en botones,
animación sutil al aparecer modales y toasts. Sin efectos llamativos
ni gradientes — mantén la estética industrial/luxury dark. El objetivo
es que se sienta caro y preciso, como una herramienta de Linear o Vercel.
```

**Criterio de aceptación:** navegar la app se siente fluido, no brusco.

### 3.3 Optimización de carga de datos

**Prompt:**
```
Revisa los módulos que cargan listas (clientes, conversaciones, citas).
Implementa paginación o carga incremental donde una lista pueda crecer
mucho. Agrega búsqueda con debounce de 300ms donde haya buscador.
Evita recargar toda la lista cuando solo cambió un elemento — actualiza
en sitio. El objetivo es que con 1000 clientes la vista siga siendo rápida.
```

**Criterio de aceptación:** sembrar 1000 clientes de prueba y confirmar que la lista carga rápido y la búsqueda responde sin lag.

---

## Bloque 4 — Verificación final del día

**Prompt:**
```
Corre la suite completa y reporta:
- npm run build
- npx tsc --noEmit
- npm run test (unit)
- npx playwright test (E2E)
- npm run test:tenant-isolation
- npm run preflight
Luego corre scripts/simulate.ts con carga alta (500 mensajes,
100 walk-ins, 20 conflictos concurrentes) y reporta si algo falla.
Genera BLINDAJE_REPORTE.md con los resultados y haz commit.
```

**Criterio de aceptación:** todo verde. Si algo falla, se arregla antes de cerrar el día.

---

# FASE 2 — VENDIBLE COMO SAAS (resto de la semana)

Mercurio ya corre. Ahora lo conviertes en producto que cualquier barbería puede contratar. Esto es lo que justifica cobrar $99-149/mes.

## Día 2-3 — Onboarding multi-tenant

### Provisioning de nuevos tenants

**Prompt:**
```
Crea el flujo de alta de un nuevo tenant (barbería) sin tocar código:
- Página /signup donde un dueño de barbería crea su cuenta y su negocio
- Al registrarse: crea el tenant, el usuario admin, y siembra el catálogo
  base de servicios editable
- Asistente de configuración inicial (onboarding wizard): nombre del
  negocio, logo, horarios, barberos, servicios y precios
- Cada tenant arranca aislado por RLS automáticamente
- El slug del tenant define su subdominio o ruta
Aplica el sistema de diseño. El onboarding debe sentirse guiado y simple.
```

**Criterio de aceptación:** crear un tenant nuevo de cero por la UI, sin tocar la DB manualmente, y que quede funcional y aislado.

### Panel de configuración del negocio

**Prompt:**
```
Crea /settings completo para que cada tenant configure su negocio:
- Datos del negocio, logo, dirección, horarios
- Barberos: alta, baja, comisión individual, horario
- Servicios: catálogo editable con precios y duraciones
- Métodos de pago activos
- Credenciales de WhatsApp del tenant
- Personalización de marca (colores de su barbería)
Todo respetando RLS — un tenant nunca ve la config de otro.
```

**Criterio de aceptación:** un admin configura todo su negocio sin ayuda técnica.

## Día 4 — Suscripciones y cobro

### Integración de pagos

**Prompt:**
```
Integra Stripe para suscripciones SaaS:
- Tres planes: Básico, Pro, Premium (define límites por plan:
  número de barberos, conversaciones de WhatsApp/mes, módulos)
- Checkout de Stripe al contratar
- Webhook de Stripe que activa/suspende el tenant según el estado
  de la suscripción
- Página de facturación donde el tenant ve su plan y su próximo cobro
- Si la suscripción vence, el tenant entra en modo de solo lectura
  hasta que regularice
Nunca manejes datos de tarjeta directamente — todo vía Stripe Checkout.
```

**Criterio de aceptación:** contratar un plan de prueba con tarjeta de test de Stripe, ver el tenant activarse, cancelar y ver que se suspende.

## Día 5 — Cara comercial

### Landing page

**Prompt:**
```
Crea una landing page de venta para NEVO-POS en /(marketing)/page.tsx:
- Hero con propuesta de valor clara para barberías
- Secciones: agenda, cola, POS, agente de WhatsApp, reportes
- Capturas o mockups de cada módulo
- Tabla de precios de los tres planes
- Testimonios (placeholder por ahora)
- CTA a /signup
Lee .claude/skills/frontend-design/SKILL.md. Esta página es la primera
impresión del producto — debe verse premium, distintiva, memorable.
Estética coherente con el dashboard pero más vendedora.
```

**Criterio de aceptación:** la landing convence en 10 segundos de qué es y por qué vale la pena.

### Ambiente de demo

**Prompt:**
```
Crea un tenant de demo con datos realistas precargados, accesible con
un botón "Ver demo" en la landing. El demo es de solo lectura o se
resetea cada cierto tiempo. Permite que un prospecto explore el sistema
sin registrarse.
```

**Criterio de aceptación:** un prospecto entra al demo desde la landing y explora sin fricción.

---

# CRITERIOS DE "NIVEL PROFESIONAL, CERO FALLAS"

Antes de considerar el producto vendible, todo esto debe cumplirse:

**Seguridad**
- [ ] Rate limiting en auth y webhook
- [ ] Validación Zod en el 100% de endpoints
- [ ] RLS verificado en todas las tablas con test automatizado
- [ ] Ningún secreto en el historial de git
- [ ] Errores nunca exponen stack traces al cliente

**Robustez**
- [ ] Error boundaries globales
- [ ] Estados loading/empty/error en cada vista
- [ ] Confirmación en acciones destructivas
- [ ] La app no crashea con inputs malformados
- [ ] simulate.ts con carga alta pasa sin errores

**Fluidez**
- [ ] Responsive a 375px en todos los módulos
- [ ] Feedback visual (toasts) en cada acción
- [ ] Búsqueda con debounce, listas paginadas
- [ ] Microinteracciones pulidas, sin saltos bruscos
- [ ] Rápido con 1000+ registros

**Producto**
- [ ] Onboarding de tenant sin tocar código
- [ ] Panel de configuración completo por tenant
- [ ] Suscripciones con Stripe funcionando
- [ ] Landing page premium
- [ ] Ambiente de demo

**Calidad de código**
- [ ] build verde
- [ ] tsc sin errores
- [ ] tests unit + E2E verdes
- [ ] preflight ✅

---

# ORDEN DE EJECUCIÓN RESUMIDO

```
MAÑANA (Fase 1 — blindaje)
  Bloque 1 — Seguridad        (2-3 h)
  Bloque 2 — Robustez         (2-3 h)
  Bloque 3 — Fluidez          (2-3 h)
  Bloque 4 — Verificación     (1 h)

DOMINGO
  Go-live de Mercurio (docs/go-live.md) sobre la base ya blindada

DÍA 2-3   Onboarding multi-tenant + settings
DÍA 4     Stripe + suscripciones
DÍA 5     Landing + demo
DÍA 6-7   Pulido final + primer cliente externo de prueba
```

---

# NOTA ESTRATÉGICA

El producto técnico estará listo en una semana. Pero "vendible" también significa:

- **Definir el precio real** con base en el costo por tenter (~$30-40/mes) y el valor que reemplaza (AgendaPro y similares cobran $40-80/mes con menos funciones). Tu agente de WhatsApp con IA es el diferenciador que justifica cobrar más.
- **Tener a Mercurio como caso de éxito documentado** — métricas reales después de 2 semanas: citas gestionadas, conversaciones atendidas por el agente, tiempo ahorrado. Eso vende más que cualquier landing.
- **No vender hasta que Mercurio lleve 2 semanas estable** (regla del CLAUDE.md §14). El primer cliente externo paga por confianza, y esa confianza viene de tener un caso real funcionando sin fallas.

El código se construye en días. La confianza se construye con un negocio real corriendo sin caerse. Mercurio es tu mejor vendedor.

---

*NEVO-POS — Plan de blindaje y go-to-market · Mercuro.Studio*
