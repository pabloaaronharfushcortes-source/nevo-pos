# REVISION_PASO_3 — Auth: Clientes Supabase + Middleware + Login con OTP

**Fecha:** 31 de mayo de 2026
**Estado:** ✅ BUILD: Success | ✅ LINT: Success
**Commit anterior:** Paso 2: Migrations, RLS, custom access token hook y tipos generados

---

## 1. QUÉ SE HIZO EN ESTE PASO

Implementación completa del sistema de autenticación de dos factores para usuarios del sistema (admin, recepcionista, barbero):

1. Clientes Supabase para browser y servidor
2. Middleware de protección de rutas con refresco de sesión
3. `POST /api/auth/login` — valida credenciales y emite OTP cifrado
4. `POST /api/auth/verify-otp` — valida OTP y establece sesión real
5. Páginas `/login` y `/verify-otp`
6. Módulo criptográfico para OTP (AES-256-GCM, timing-safe comparison)

---

## 2. ARCHIVOS CREADOS

| Archivo | Descripción |
|---------|-------------|
| `lib/supabase/client.ts` | Browser client tipado con `Database` |
| `lib/supabase/server.ts` | Server client (sesión desde cookies) + service_role client |
| `lib/supabase/middleware.ts` | Helper `updateSession()` — refresca tokens en cada request |
| `middleware.ts` | Protección de rutas + redirects de auth |
| `lib/auth/otp.ts` | Generación, cifrado y verificación de OTP |
| `lib/email.ts` | Envío de OTP por email (Resend en prod, consola en dev) |
| `app/api/auth/login/route.ts` | `POST /api/auth/login` |
| `app/api/auth/verify-otp/route.ts` | `POST /api/auth/verify-otp` |
| `app/(auth)/layout.tsx` | Layout centrado para pantallas de auth |
| `app/(auth)/login/page.tsx` | Página de login (email + contraseña) |
| `app/(auth)/verify-otp/page.tsx` | Página de verificación OTP (6 inputs) |
| `types/app.ts` | Alias de tipos de DB + tipos de dominio |

**Archivos modificados:**

| Archivo | Cambio |
|---------|--------|
| `app/page.tsx` | Reemplazado boilerplate de Next.js por `redirect('/agenda')` |
| `.env.local.example` | Agregadas variables `AUTH_OTP_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM_*` |
| `.env.local` | Agregado `AUTH_OTP_SECRET` con valor generado |

---

## 3. CLIENTES SUPABASE

### Browser (`lib/supabase/client.ts`)

```typescript
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Usado en Client Components para suscripciones Realtime y operaciones del lado del cliente.

### Server (`lib/supabase/server.ts`)

Dos clientes distintos:

- **`createClient()`** — lee y escribe cookies de sesión del usuario autenticado. Usado en Server Components y Route Handlers que operan en nombre del usuario.
- **`createServiceClient()`** — usa `SUPABASE_SERVICE_ROLE_KEY`, bypasea RLS, sin persistencia de sesión. Usado exclusivamente en scripts de servidor y operaciones administrativas.

### Middleware (`lib/supabase/middleware.ts`)

```typescript
export async function updateSession(request: NextRequest) {
  // ...
  const { data: { user } } = await supabase.auth.getUser()
  return { supabaseResponse, user }
}
```

Usa `getUser()` en lugar de `getSession()`. **Esta distinción es crítica:** `getSession()` lee el JWT desde cookies sin validarlo contra Supabase Auth — puede retornar sesiones expiradas o manipuladas. `getUser()` hace una llamada al servidor de Auth para validar el token en cada request.

---

## 4. MIDDLEWARE DE RUTAS

```
middleware.ts
```

**Rutas públicas (sin auth):**

| Ruta | Razón |
|------|-------|
| `/login` | Pantalla de login |
| `/verify-otp` | Pantalla de OTP |
| `/display` | Pantalla TV — pública por diseño |
| `/api/auth/login` | No requiere sesión para poder hacer login |
| `/api/auth/verify-otp` | No requiere sesión para verificar OTP |
| `/api/webhooks/whatsapp` | Webhook de Meta — auth por HMAC |

**Lógica de redirects:**

```
Sin sesión + ruta protegida   → redirect /login
Con sesión + /login o /verify-otp → redirect /agenda
```

Los archivos estáticos (`/_next/*`, `/favicon.ico`) se excluyen del matcher para no agregar overhead de auth.

---

## 5. FLUJO DE AUTENTICACIÓN DE DOS FACTORES

```
Usuario ingresa email + contraseña
        ↓
POST /api/auth/login
  1. signInWithPassword() — valida credenciales en Supabase Auth
  2. Lee nombre del usuario (service_role, sin cookie aún)
  3. Genera OTP de 6 dígitos (crypto.randomBytes, sin sesgo)
  4. Cifra { accessToken, refreshToken, otp, expiresAt } con AES-256-GCM
  5. Guarda cifrado en cookie httpOnly "auth_pending" (5 min, maxAge=300)
  6. Envía OTP al email del usuario
  7. Devuelve { status: 'otp_required' } — sin cookies de sesión
        ↓
Usuario ingresa código de 6 dígitos
        ↓
POST /api/auth/verify-otp
  1. Lee cookie "auth_pending"
  2. Descifra con AES-256-GCM (GCM autentica → falla si fue manipulado)
  3. Verifica que Date.now() < expiresAt
  4. Compara OTP con timingSafeEqual (evita timing attacks)
  5. Llama supabase.auth.setSession() → escribe cookies de sesión reales
  6. Elimina cookie "auth_pending"
  7. El cliente redirige a /agenda
```

**Invariante de seguridad:** entre el paso 1 y el 5, Supabase tiene la sesión creada pero el navegador no tiene ningún cookie de sesión. Solo la cookie `auth_pending` existe, y está cifrada con `AUTH_OTP_SECRET` que nunca sale del servidor.

---

## 6. MÓDULO CRIPTOGRÁFICO (`lib/auth/otp.ts`)

### Generación de OTP

```typescript
export function generateOtp(): string {
  let n: number
  do {
    n = randomBytes(4).readUInt32BE(0)
  } while (n >= 4_000_000_000) // elimina sesgo de módulo
  return (n % 1_000_000).toString().padStart(6, '0')
}
```

El loop descarta valores ≥ 4,000,000,000 para garantizar distribución uniforme en el módulo 1,000,000. Sin este descarte, los primeros 294,967,296 valores (0–294,967,295 mod 1,000,000) tendrían probabilidad ligeramente mayor.

### Cifrado del estado pendiente

```
Algoritmo:    AES-256-GCM (cifrado autenticado)
IV:           12 bytes aleatorios por mensaje
Auth tag:     16 bytes (detecta cualquier modificación del ciphertext)
Formato:      base64url(iv ‖ tag ‖ ciphertext)
Clave:        HMAC-SHA256(secret, contexto fijo) → 32 bytes
```

GCM garantiza tanto confidencialidad (nadie puede leer el OTP) como integridad (cualquier modificación de la cookie es detectada en el decrypt).

### Comparación timing-safe

```typescript
export function verifyOtp(submitted: string, stored: string): boolean {
  if (submitted.length !== 6 || stored.length !== 6) return false
  return timingSafeEqual(Buffer.from(submitted, 'utf8'), Buffer.from(stored, 'utf8'))
}
```

`timingSafeEqual` de Node.js `crypto` evita ataques de timing que podrían inferir el OTP correcto midiendo el tiempo de comparación carácter a carácter.

---

## 7. PÁGINAS DE AUTH

### `/login`

- Client Component con estado local (email, password, loading, error)
- Sin tag `<form>` — event handlers en `onClick` y `onKeyDown` (Enter)
- Deshabilita el botón si email o password están vacíos

### `/verify-otp`

- 6 inputs individuales para cada dígito
- Navegación automática al siguiente input al ingresar un dígito
- Backspace mueve al input anterior si el actual está vacío
- **Paste:** captura el evento, extrae dígitos y los distribuye en los 6 inputs — el usuario puede pegar el código directamente desde el email
- En error: limpia los 6 inputs y regresa el foco al primero
- Sin tag `<form>` — `onClick` en el botón de confirmación

---

## 8. TIPOS DE APLICACIÓN (`types/app.ts`)

Alias directos desde `Database['public']['Tables']` para no repetir la ruta larga en cada archivo:

```typescript
export type Tenant = Tables['tenants']['Row']
export type UserProfile = Tables['users']['Row']
// ... 12 tablas
```

Tipos de dominio adicionales:

```typescript
export type UserRole = 'admin' | 'receptionist' | 'barber'
export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | ...
export type QueueStatus = 'waiting' | 'called' | 'in_progress' | ...
export type PaymentMethod = 'cash' | 'clip' | 'getnet' | 'transfer'

export type AuthenticatedUser = {
  id: string
  email: string
  tenantId: string  // del claim JWT inyectado por custom_access_token_hook
  role: UserRole
  name: string
}
```

---

## 9. VARIABLES DE ENTORNO NUEVAS

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `AUTH_OTP_SECRET` | Secreto para AES-256-GCM del estado pendiente. Generar con `openssl rand -base64 32` | **Sí** |
| `RESEND_API_KEY` | API key de Resend para envío de emails en producción | Solo en prod |
| `EMAIL_FROM_NAME` | Nombre del remitente (default: `NEVO-POS`) | No |
| `EMAIL_FROM_ADDRESS` | Email del remitente (default: `no-reply@nevo-pos.app`) | No |

En desarrollo, el OTP se imprime en la consola del servidor — no se necesita configurar email.

---

## 10. ESTADO DE BUILD Y TYPECHECK

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
+ First Load JS shared by all            87.3 kB

ƒ Middleware                             82.8 kB
```

### Lint (npm run lint)

```
✔ No ESLint warnings or errors
```

---

## 11. NOTAS — DECISIONES DE ARQUITECTURA

1. **OTP en cookie cifrada, no en base de datos.** Se optó por cifrar el estado pendiente (tokens + OTP) en una cookie httpOnly en lugar de almacenarlo en una tabla `auth_otps`. Ventajas: sin migración extra, sin race conditions de DB, sin necesidad de job de limpieza de registros expirados. La cookie `maxAge=300` garantiza expiración automática por el browser.

2. **`signInWithPassword` antes del OTP, no después.** Valida las credenciales en el primer paso para dar feedback inmediato al usuario si la contraseña es incorrecta. Los tokens quedan cifrados en la cookie hasta que el OTP es correcto — el navegador nunca los ve directamente.

3. **`getUser()` en el middleware, nunca `getSession()`.** `getSession()` confía ciegamente en el JWT almacenado en cookies. Si un token fuera comprometido o manipulado, `getSession()` lo aceptaría hasta su expiración natural. `getUser()` valida contra el servidor de Supabase Auth en cada request, con overhead de ~1 llamada HTTP por request de navegación.

4. **Service client separado en `server.ts`.** `createServiceClient()` es explícitamente distinto de `createClient()` para evitar pasar accidentalmente el `SUPABASE_SERVICE_ROLE_KEY` en contextos donde solo se necesita la sesión del usuario. TypeScript y la separación de funciones hacen la distinción obvia.

5. **`/agenda` como landing post-login.** Todos los redirects post-autenticación apuntan a `/agenda`. Este módulo se construirá en Paso 5; por ahora la ruta devuelve 404 pero el middleware y el flujo son correctos.

### Cambios vs CLAUDE.md §3

- El flujo de login coincide exactamente con lo especificado: `POST /api/auth/login` → OTP → `POST /api/auth/verify-otp` → dashboard.
- La restricción "sin tag `<form>`" se cumple en ambas páginas.
- Los clientes se crean en `lib/supabase/` exactamente como especifica la sección 4.

---

## 12. PRÓXIMOS PASOS

- **Paso 4:** Seed — tenant Mercurio Barbería con datos reales para poder probar el login end-to-end
- **Paso 5:** Módulo agenda — calendario visual por barbero + CRUD de citas
- **Paso 6:** Módulo cola + pantalla `/display` con Realtime

---

**Build Status:** ✅ SUCCESS
**Test Coverage:** N/A (E2E de auth en Paso 11)
**Ready for Paso 4:** ✅ YES
