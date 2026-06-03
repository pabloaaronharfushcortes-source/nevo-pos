/**
 * Simulación de operación — Mercurio Barbería (tenant 0)
 *
 * Uso: npm run simulate
 * Requiere haber corrido `npm run seed` antes.
 *
 * Corre en paralelo (CLAUDE.md §13):
 *  - 50 walk-ins distribuidos, vía el algoritmo real de asignación de fichas
 *  - Test de conflicto: 2 clientes intentando el mismo slot simultáneamente
 *  - 200 mensajes de WhatsApp con 15 escenarios (POST firmados al webhook si hay
 *    BASE_URL + WHATSAPP_APP_SECRET; si no, se omite esa fase)
 *  - Reporte de resultados al terminar
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import crypto from 'node:crypto'
import type { Database } from '../types/database'
import { assignQueueTicket } from '../lib/utils/queue'

// ─── env ─────────────────────────────────────────────────────────────────────

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

const env = loadEnv()
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const APP_SECRET = process.env.WHATSAPP_APP_SECRET ?? env.WHATSAPP_APP_SECRET ?? ''
const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? env.NEXT_PUBLIC_TENANT_SLUG ?? 'mercurio-barberia'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const db = createClient<Database>(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// ─── reporte ───────────────────────────────────────────────────────────────

type Report = {
  walkInsOk: number
  walkInsRejected: number
  conflictPassed: boolean | null
  whatsappSent: number
  whatsappFailed: number
  errors: string[]
}

const report: Report = {
  walkInsOk: 0,
  walkInsRejected: 0,
  conflictPassed: null,
  whatsappSent: 0,
  whatsappFailed: 0,
  errors: [],
}

// ─── 15 escenarios de WhatsApp ───────────────────────────────────────────────

const SCENARIOS = [
  'Hola, ¿tienen lugar para un corte hoy?',
  '¿Cuánto cuesta corte y barba?',
  'Quiero agendar para mañana en la tarde',
  '¿A qué hora abren el domingo?',
  '¿Dónde están ubicados?',
  'Necesito cancelar mi cita de mañana',
  '¿Atienden niños?',
  'Quiero con el barbero de siempre',
  '¿Aceptan tarjeta?',
  'Se me hizo tarde, ¿alcanzo mi cita?',
  '¿Tienen estacionamiento?',
  'Quiero reagendar para el viernes',
  '¿Hacen diseños o líneas?',
  'Gracias, ahí estaré',
  'Una queja sobre mi último servicio',
]

// ─── helpers ──────────────────────────────────────────────────────────────

async function getTenant() {
  const { data, error } = await db
    .from('tenants')
    .select('id')
    .eq('slug', TENANT_SLUG)
    .single()
  if (error || !data) throw new Error(`Tenant ${TENANT_SLUG} no encontrado — ¿corriste el seed?`)
  return data
}

async function getActiveBarbers(tenantId: string) {
  const { data } = await db
    .from('barbers')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
  return data ?? []
}

async function getServices(tenantId: string) {
  const { data } = await db
    .from('services')
    .select('id, duration_minutes')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
  return data ?? []
}

// ── 50 walk-ins ──────────────────────────────────────────────────────────────

async function simulateWalkIns(tenantId: string, serviceIds: string[]) {
  const tasks = Array.from({ length: 50 }, (_, i) => {
    const serviceId = serviceIds[i % serviceIds.length]
    return assignQueueTicket(db, { tenantId, serviceId, source: 'reception' })
  })

  const results = await Promise.allSettled(tasks)
  for (const r of results) {
    if (r.status === 'fulfilled' && 'ticket' in r.value) report.walkInsOk++
    else report.walkInsRejected++
  }
}

// ── test de conflicto: 2 clientes, mismo slot, simultáneo ──────────────────────

async function simulateConflict(tenantId: string, serviceId: string, barberId: string) {
  // Slot fijo a 7 días en el futuro para no chocar con datos del seed
  const startsAt = new Date()
  startsAt.setDate(startsAt.getDate() + 7)
  startsAt.setHours(13, 0, 0, 0)

  const { data: svc } = await db.from('services').select('duration_minutes').eq('id', serviceId).single()
  const duration = svc?.duration_minutes ?? 45
  const endsAt = new Date(startsAt.getTime() + duration * 60_000)

  const { data: someClient } = await db.from('clients').select('id').eq('tenant_id', tenantId).limit(1).single()
  if (!someClient) { report.errors.push('Sin clientes para el test de conflicto'); return }

  // Replica la verificación de conflictos del API antes de insertar (CLAUDE.md §6)
  async function tryBook(): Promise<boolean> {
    const { count } = await db
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('barber_id', barberId)
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .neq('status', 'no_show')
      .lt('starts_at', endsAt.toISOString())
      .gt('ends_at', startsAt.toISOString())
    if (count && count > 0) return false
    const { error } = await db.from('appointments').insert({
      tenant_id: tenantId,
      client_id: someClient!.id,
      barber_id: barberId,
      service_id: serviceId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: 'pending',
      booked_via: 'reception',
    })
    return !error
  }

  const [a, b] = await Promise.all([tryBook(), tryBook()])
  // Idealmente exactamente una reserva tiene éxito (la otra ve el conflicto).
  report.conflictPassed = (a !== b)
}

// ── 200 mensajes de WhatsApp (opcional, requiere webhook accesible + secret) ───

function signPayload(body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(body).digest('hex')
}

async function simulateWhatsApp(phoneNumberId: string) {
  if (!APP_SECRET) {
    console.log('⚠ WHATSAPP_APP_SECRET ausente — se omite la simulación de WhatsApp')
    return
  }
  const url = `${BASE_URL}/api/webhooks/whatsapp`

  for (let i = 0; i < 200; i++) {
    const text = SCENARIOS[i % SCENARIOS.length]
    const waid = `52133${String(1000000 + (i % 25)).padStart(7, '0')}` // 25 remitentes distintos
    const payload = JSON.stringify({
      entry: [{
        changes: [{
          field: 'messages',
          value: {
            metadata: { phone_number_id: phoneNumberId },
            messages: [{ from: waid, id: `sim-${Date.now()}-${i}`, type: 'text', text: { body: text } }],
          },
        }],
      }],
    })

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': signPayload(payload) },
        body: payload,
      })
      if (res.ok) report.whatsappSent++
      else report.whatsappFailed++
    } catch {
      report.whatsappFailed++
    }
  }
}

// ─── main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('▶ Iniciando simulación de operación…\n')
  const tenant = await getTenant()

  const [barbers, services] = await Promise.all([
    getActiveBarbers(tenant.id),
    getServices(tenant.id),
  ])

  if (barbers.length === 0 || services.length === 0) {
    throw new Error('El tenant no tiene barberos o servicios activos — corre el seed')
  }

  const { data: tenantWa } = await db
    .from('tenants')
    .select('whatsapp_phone_number_id')
    .eq('id', tenant.id)
    .single()

  // Correr las fases en paralelo (CLAUDE.md §13)
  await Promise.all([
    simulateWalkIns(tenant.id, services.map(s => s.id)),
    simulateConflict(tenant.id, services[0].id, barbers[0].id),
    tenantWa?.whatsapp_phone_number_id
      ? simulateWhatsApp(tenantWa.whatsapp_phone_number_id)
      : Promise.resolve(console.log('⚠ Tenant sin phone_number_id — se omite WhatsApp')),
  ])

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Reporte de simulación

  Walk-ins asignados:   ${report.walkInsOk}
  Walk-ins rechazados:  ${report.walkInsRejected}  (sin disponibilidad)
  Test de conflicto:    ${report.conflictPassed === null ? 'no ejecutado' : report.conflictPassed ? '✅ exactamente 1 reserva ganó' : '❌ ambas o ninguna ganó'}
  WhatsApp enviados:    ${report.whatsappSent}
  WhatsApp fallidos:    ${report.whatsappFailed}
  Errores:              ${report.errors.length === 0 ? 'ninguno' : report.errors.join('; ')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

  if (report.conflictPassed === false) process.exitCode = 1
}

main().catch(err => {
  console.error('\n✗ Simulación falló:', err)
  process.exit(1)
})
