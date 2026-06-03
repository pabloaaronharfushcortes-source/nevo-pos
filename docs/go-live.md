# Go Live — Migración overnight (Mercurio Barbería, tenant 0)

> Paso 12 del orden de construcción (CLAUDE.md §14). Procedimiento para poner NEVO-POS
> en producción reemplazando el sistema actual con interrupción mínima del negocio.
> La migración se hace de madrugada (barbería cerrada) para no afectar operación.

---

## 0. Pre-requisitos (días antes)

- [ ] Fase 1 completa y verde: `npm run test`, `npm run build`, `npx playwright test`
- [ ] Proyecto de Supabase de **producción** creado (separado del de desarrollo)
- [ ] App de Meta WhatsApp en modo **Live** (no test), número de producción verificado
- [ ] Cuenta de Vercel con el repo conectado
- [ ] Dominio de producción definido (ej. `app.mercuriobarberia.com`)
- [ ] Confirmar nombres reales de los barberos en `scripts/seed.ts` (placeholder actual: Barbero1/2/3)

---

## 1. Variables de entorno en Vercel

Cargar en el proyecto de Vercel (Production). Ver lista completa en CLAUDE.md §12 más:

| Variable | Origen |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase prod |
| `ANTHROPIC_API_KEY` | Consola Anthropic |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` (CLAUDE.md §2) |
| `OPENAI_API_KEY` | Para Whisper (transcripción de audios) |
| `WHATSAPP_APP_SECRET` / `WHATSAPP_VERIFY_TOKEN` | Meta App |
| `AUTH_OTP_SECRET` / `RESEND_API_KEY` / `EMAIL_FROM_*` | OTP de login por email |
| `NEXT_PUBLIC_APP_URL` | Dominio de producción |
| `NEXT_PUBLIC_TENANT_SLUG` | `mercurio-barberia` |

> Las credenciales de WhatsApp **por-tenant** (`whatsapp_phone_number_id`, `whatsapp_access_token`,
> `whatsapp_verify_token`) viven en la fila del tenant en la tabla `tenants`, no en env.

---

## 2. Base de datos de producción

```bash
# Apuntar el CLI de Supabase al proyecto de producción
supabase link --project-ref <PROD_PROJECT_REF>

# Aplicar todas las migrations (incluye RLS de todas las tablas)
supabase db push

# Regenerar tipos desde prod (opcional, para verificar)
npm run generate:supabase-types
```

Verificar RLS activado en todas las tablas (regla de seguridad 1):

```sql
select tablename, rowsecurity from pg_tables
 where schemaname = 'public' order by tablename;
-- rowsecurity debe ser true en todas
```

---

## 3. Sembrar el tenant de producción

```bash
# Con .env.local apuntando a producción
npm run seed
```

El seed crea el tenant, admin, barberos, horarios, servicios, clientes de ejemplo y
conversaciones de prueba. **Para go-live real**, ajustar el seed para no inflar con datos
ficticios de POS/citas si se prefiere arrancar limpio (dejar solo catálogo + admin + barberos).

Configurar en la fila del tenant (vía SQL o panel de Settings) las credenciales reales de WhatsApp.

---

## 4. Pre-vuelo

```bash
npm run preflight
```

Debe terminar en **✅ LISTO PARA GO-LIVE** con 0 fallas críticas. Corrige cualquier ❌ antes de seguir.

---

## 5. Deploy a Vercel

```bash
# Deploy de producción (o push a main con auto-deploy configurado)
vercel --prod
```

- [ ] Build verde en Vercel
- [ ] Dominio de producción resolviendo con HTTPS

---

## 6. Conectar el webhook de WhatsApp

En Meta → WhatsApp → Configuration → Webhook:

- **Callback URL:** `https://<dominio-prod>/api/webhooks/whatsapp`
- **Verify token:** el valor de `WHATSAPP_VERIFY_TOKEN` (o el `whatsapp_verify_token` del tenant)
- Suscribir el campo **messages**

Meta hará un GET de verificación → debe responder 200 con el `hub.challenge`.

Prueba: enviar un WhatsApp real al número del negocio y confirmar que el agente responde.

---

## 7. Pantalla TV

- [ ] Subir los videos a Supabase Storage en `display/mercurio-barberia/`
- [ ] Abrir `https://<dominio-prod>/display?tenant=mercurio-barberia` en la TV
- [ ] Confirmar que la cola se actualiza en tiempo real (Realtime)

---

## 8. Actualizar el APK (CLAUDE.md §9)

El APK en App Store es un WebView que apunta a una URL. **No requiere cambios en App Store.**

- [ ] Actualizar la URL del WebView al dominio de producción
- [ ] Verificar que la app abre el dashboard correctamente

---

## 9. Humo en producción (madrugada, antes de abrir)

- [ ] Login con OTP por email funciona
- [ ] Crear una cita de prueba en agenda (y borrarla)
- [ ] Asignar una ficha walk-in en cola
- [ ] Cobrar una venta de prueba en POS y verificar comisión generada
- [ ] Enviar un WhatsApp y confirmar respuesta del agente + creación de cita
- [ ] Tomar control humano de una conversación y responder manualmente
- [ ] Confirmar aislamiento de tenant: `npm run test:tenant-isolation`

---

## 10. Plan de rollback

Si algo crítico falla durante o tras el go-live:

1. **App:** en Vercel, *Promote* el deployment anterior estable (rollback instantáneo).
2. **WhatsApp:** desuscribir el webhook en Meta para detener el flujo del agente; recepción
   atiende manualmente por la app de WhatsApp Business mientras se corrige.
3. **Datos:** las migrations no destruyen datos previos; el sistema usa soft delete
   (`deleted_at`), nunca `DELETE`. Restaurar desde el backup automático de Supabase (PITR)
   solo si hubo corrupción.
4. Documentar el incidente y no reintentar el go-live hasta tener causa raíz.

> Recordatorio (CLAUDE.md §14): **no** iniciar Fase 2 (reportes, inventario) hasta que la
> Fase 1 lleve 2 semanas en producción sin incidentes críticos.
