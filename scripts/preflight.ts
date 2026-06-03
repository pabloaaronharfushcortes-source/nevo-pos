/**
 * Pre-vuelo de go-live — Mercurio Barbería (tenant 0)
 *
 * Uso: npm run preflight
 *
 * Verifica que el entorno y la base de datos estén listos para producción:
 *  - Variables de entorno requeridas presentes
 *  - Conectividad con Supabase
 *  - Tablas de Fase 1 existentes (migrations aplicadas)
 *  - Tenant sembrado y activo, con credenciales de WhatsApp
 *  - Barberos, horarios y servicios activos
 *
 * Sale con código 1 si alguna verificación crítica falla.
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Database } from '../types/database'

function loadEnv(): Record<string, string> {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    let v = t.slice(eq + 1).trim()
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
    out[t.slice(0, eq).trim()] = v
  }
  return out
}

const env = { ...loadEnv(), ...process.env } as Record<string, string>

// Variables requeridas para que el sistema opere en producción
const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'WHATSAPP_APP_SECRET',
  'WHATSAPP_VERIFY_TOKEN',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_TENANT_SLUG',
  'AUTH_OTP_SECRET',
  'RESEND_API_KEY',
]

const FASE1_TABLES = [
  'tenants', 'users', 'barbers', 'barber_schedules', 'services',
  'clients', 'appointments', 'queue_tickets', 'sales', 'sale_items',
  'commissions', 'conversations', 'messages', 'cash_registers',
]

let failures = 0
let warnings = 0

function ok(label: string) { console.log(`  ✅ ${label}`) }
function fail(label: string) { console.log(`  ❌ ${label}`); failures++ }
function warn(label: string) { console.log(`  ⚠️  ${label}`); warnings++ }

async function main() {
  console.log('\n▶ Pre-vuelo de go-live\n')

  // ── 1. Variables de entorno ────────────────────────────────────────────────
  console.log('1) Variables de entorno')
  for (const key of REQUIRED_ENV) {
    if (env[key]?.trim()) ok(key)
    else fail(`${key} ausente`)
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.log('\n✗ Sin credenciales de Supabase no se puede continuar.\n')
    process.exit(1)
  }

  const db = createClient<Database>(url, serviceKey, { auth: { persistSession: false } })

  // ── 2. Tablas de Fase 1 ──────────────────────────────────────────────────────
  console.log('\n2) Tablas (migrations aplicadas)')
  for (const table of FASE1_TABLES) {
    const { error } = await db.from(table as keyof Database['public']['Tables']).select('*', { count: 'exact', head: true })
    if (error) fail(`${table}: ${error.message}`)
    else ok(table)
  }

  // ── 3. Tenant sembrado ───────────────────────────────────────────────────────
  console.log('\n3) Tenant de producción')
  const slug = env.NEXT_PUBLIC_TENANT_SLUG || 'mercurio-barberia'
  const { data: tenant } = await db
    .from('tenants')
    .select('id, name, is_active, timezone, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_verify_token, agent_knowledge_base')
    .eq('slug', slug)
    .maybeSingle()

  if (!tenant) {
    fail(`Tenant "${slug}" no existe — corre el seed`)
  } else {
    ok(`Tenant "${tenant.name}" existe`)
    tenant.is_active ? ok('Tenant activo') : fail('Tenant inactivo')
    tenant.timezone ? ok(`Timezone: ${tenant.timezone}`) : warn('Sin timezone (default America/Mexico_City)')
    tenant.whatsapp_phone_number_id ? ok('WhatsApp phone_number_id configurado') : fail('Falta whatsapp_phone_number_id')
    tenant.whatsapp_access_token ? ok('WhatsApp access_token configurado') : fail('Falta whatsapp_access_token')
    tenant.whatsapp_verify_token ? ok('WhatsApp verify_token configurado') : warn('Falta whatsapp_verify_token del tenant')
    tenant.agent_knowledge_base?.trim() ? ok('Knowledge base del agente presente') : warn('Knowledge base del agente vacío')

    // ── 4. Catálogo operativo ──────────────────────────────────────────────────
    console.log('\n4) Catálogo operativo')
    const [{ count: barbers }, { count: schedules }, { count: services }, { count: admins }] = await Promise.all([
      db.from('barbers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('is_active', true),
      db.from('barber_schedules').select('*', { count: 'exact', head: true }),
      db.from('services').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('is_active', true),
      db.from('users').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('role', 'admin').eq('is_active', true),
    ])

    ;(barbers ?? 0) > 0 ? ok(`${barbers} barbero(s) activo(s)`) : fail('Sin barberos activos')
    ;(schedules ?? 0) > 0 ? ok(`${schedules} bloque(s) de horario`) : fail('Sin horarios de barberos')
    ;(services ?? 0) > 0 ? ok(`${services} servicio(s) activo(s)`) : fail('Sin servicios activos')
    ;(admins ?? 0) > 0 ? ok(`${admins} admin(s) activo(s)`) : fail('Sin usuario admin activo')
  }

  // ── Resumen ──────────────────────────────────────────────────────────────────
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${failures === 0 ? '✅ LISTO PARA GO-LIVE' : '❌ NO LISTO — corrige lo anterior'}
  Fallas críticas: ${failures}
  Advertencias:    ${warnings}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

  if (failures > 0) process.exit(1)
}

main().catch(err => {
  console.error('\n✗ Pre-vuelo falló:', err)
  process.exit(1)
})
