# NEVO-POS

Plataforma SaaS multi-tenant de gestión para negocios basados en citas (barberías, salones,
consultorios). **Mercurio Barbería** es el tenant 0 — el negocio de producción donde el sistema
se prueba antes de venderse a otros.

> El documento maestro del proyecto es [`CLAUDE.md`](./CLAUDE.md). Léelo antes de tocar código.

## Stack

Next.js 14 (App Router, TS strict) · Supabase (Postgres + RLS + Realtime + Storage) · Tailwind ·
Vercel · Meta WhatsApp Cloud API · Claude API (agente) · OpenAI Whisper (audio) · Playwright · k6.

## Desarrollo

```bash
npm install
cp .env.local.example .env.local   # completar credenciales (ver CLAUDE.md §12)
npm run dev                         # http://localhost:3000
```

## Módulos (Fase 1)

| Ruta | Módulo |
|---|---|
| `/agenda` | Calendario de citas por barbero + CRUD |
| `/queue` | Cola walk-in + asignación de fichas |
| `/display` | Pantalla TV pública (Realtime, sin auth) |
| `/pos` | Punto de venta + comisiones + turno de caja |
| `/clients` | Registro, perfil, lealtad e historial |
| `/conversations` | Panel WhatsApp + human handoff |
| `/api/webhooks/whatsapp` | Agente: webhook + Claude + agenda |

## Scripts

```bash
npm run test                   # unit (vitest)
npm run test:e2e               # E2E (Playwright)
npm run test:load              # carga del webhook (k6)
npm run test:tenant-isolation  # aislamiento multi-tenant (RLS)
npm run seed                   # poblar Mercurio Barbería
npm run simulate               # simular una semana de operación
npm run preflight              # verificación de readiness para go-live
```

## Despliegue

Procedimiento de migración overnight y checklist de go-live en
[`docs/go-live.md`](./docs/go-live.md).

## Seguridad

RLS en todas las tablas, aislamiento por `tenant_id`, soft delete (`deleted_at`),
verificación de firma en el webhook de WhatsApp, secretos solo en env. Ver CLAUDE.md §11.
