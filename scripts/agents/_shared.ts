/**
 * Harness compartido para el testing multi-agente.
 *
 * Provee: carga de .env.local, cliente de Supabase con service role, un "cookie
 * jar" mínimo sobre fetch, y el flujo de login con OTP. El OTP en este proyecto
 * se entrega cifrado dentro de la cookie httpOnly `auth_pending` (AES-256-GCM con
 * AUTH_OTP_SECRET); como fetch sí puede leer cabeceras Set-Cookie, recuperamos el
 * OTP descifrando esa cookie — sin necesidad de leer la consola del servidor.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHmac } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { decryptPending } from '../../lib/auth/otp'
import type { Database } from '../../types/database'

// ─── env ──────────────────────────────────────────────────────────────────────

export function loadEnv(): Record<string, string> {
  const merged: Record<string, string> = { ...process.env } as Record<string, string>
  const path = resolve(process.cwd(), '.env.local')
  if (existsSync(path)) {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const key = t.slice(0, eq).trim()
      let val = t.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      // Las variables ya presentes en el shell tienen prioridad (igual que Next.js)
      if (process.env[key] === undefined) merged[key] = val
    }
  }
  return merged
}

export const ENV = loadEnv()

export const BASE_URL = ENV.TEST_BASE_URL ?? 'http://localhost:3001'

export function serviceClient(): SupabaseClient<Database> {
  return createClient<Database>(
    ENV.NEXT_PUBLIC_SUPABASE_URL,
    ENV.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// ─── tipos de resultados ───────────────────────────────────────────────────────

export type OpResult = {
  name: string
  method: string
  path: string
  status: number
  ok: boolean        // ¿cumplió la expectativa del escenario?
  ms: number
  note?: string
}

export type AgentResult = {
  agent: string
  passed: number
  failed: number
  errors: string[]
  ops: OpResult[]
  avgResponseMs: number
  extra?: Record<string, unknown>
}

// ─── cookie jar + fetch ──────────────────────────────────────────────────────

export class Session {
  private cookies = new Map<string, string>()

  private capture(res: Response) {
    // Node fetch agrega múltiples Set-Cookie como getSetCookie() (undici)
    const raw = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.()
      ?? (res.headers.get('set-cookie') ? [res.headers.get('set-cookie') as string] : [])
    for (const line of raw) {
      const first = line.split(';')[0]
      const eq = first.indexOf('=')
      if (eq === -1) continue
      const name = first.slice(0, eq).trim()
      const value = first.slice(eq + 1).trim()
      // maxAge=0 / valor vacío → borrar
      if (!value || /(^|;)\s*max-age=0\b/i.test(line)) this.cookies.delete(name)
      else this.cookies.set(name, value)
    }
  }

  cookieHeader(): string {
    return Array.from(this.cookies.entries()).map(([k, v]) => `${k}=${v}`).join('; ')
  }

  get(name: string): string | undefined {
    return this.cookies.get(name)
  }

  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const url = path.startsWith('http') ? path : BASE_URL + path
    const headers = new Headers(init.headers)
    const jar = this.cookieHeader()
    if (jar) headers.set('cookie', jar)
    const res = await fetch(url, { ...init, headers, redirect: 'manual' })
    this.capture(res)
    return res
  }

  /** fetch + medición de tiempo + parseo defensivo de JSON */
  async call(path: string, init: RequestInit = {}): Promise<{ res: Response; ms: number; json: unknown }> {
    const t0 = Date.now()
    const res = await this.fetch(path, init)
    const ms = Date.now() - t0
    let json: unknown = null
    const text = await res.text()
    try { json = text ? JSON.parse(text) : null } catch { json = text }
    return { res, ms, json }
  }
}

export function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }
}

// ─── login + OTP ────────────────────────────────────────────────────────────────

export type Credentials = { email: string; password: string }

export const ADMIN_CREDS: Credentials = {
  email: ENV.TEST_ADMIN_EMAIL ?? 'admin@mercuriobarberia.com',
  password: ENV.TEST_ADMIN_PASSWORD ?? 'MercurioAdmin2026!',
}

type PendingAuth = { accessToken: string; refreshToken: string; otp: string; expiresAt: number }

async function loginOnce(session: Session, creds: Credentials): Promise<void> {
  const login = await session.call('/api/auth/login', jsonInit('POST', creds))
  if (login.res.status !== 200) {
    throw new Error(`login falló: HTTP ${login.res.status} ${JSON.stringify(login.json)}`)
  }

  const pendingToken = session.get('auth_pending')
  if (!pendingToken) throw new Error('login no devolvió la cookie auth_pending')

  const secret = ENV.AUTH_OTP_SECRET
  if (!secret) throw new Error('AUTH_OTP_SECRET no configurado en el entorno')

  const pending = decryptPending<PendingAuth>(pendingToken, secret)
  if (!pending?.otp) throw new Error('no se pudo descifrar el OTP de auth_pending')

  const verify = await session.call('/api/auth/verify-otp', jsonInit('POST', { code: pending.otp }))
  if (verify.res.status !== 200) {
    throw new Error(`verify-otp falló: HTTP ${verify.res.status} ${JSON.stringify(verify.json)}`)
  }
}

/**
 * Realiza login + verificación de OTP y deja la Session autenticada (cookies sb-*).
 * El OTP se recupera descifrando la cookie auth_pending. Reintenta hasta `attempts`
 * veces: el flujo es lógicamente seguro bajo concurrencia (verify-otp es stateless
 * sobre la cookie), pero un blip transitorio de Supabase/servidor bajo carga no debe
 * tumbar a un agente completo. Lanza solo si TODOS los intentos fallan.
 */
export async function loginWithOtp(
  session: Session,
  creds: Credentials = ADMIN_CREDS,
  attempts = 3
): Promise<void> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      await loginOnce(session, creds)
      return
    } catch (e) {
      lastErr = e
      if (i < attempts - 1) await new Promise(r => setTimeout(r, 400 * (i + 1)))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('login falló tras reintentos')
}

// ─── helpers de parseo de respuestas (los endpoints mezclan estilos) ─────────────

/** Extrae un arreglo de una respuesta: {data}|{clients}|array directo. */
export function asList(json: unknown): unknown[] {
  if (Array.isArray(json)) return json
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>
    if (Array.isArray(o.data)) return o.data
    if (Array.isArray(o.clients)) return o.clients
  }
  return []
}

/** Extrae el id de un objeto creado: json.id | json.data.id. */
export function idOf(json: unknown): string | undefined {
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>
    if (typeof o.id === 'string') return o.id
    const d = o.data as Record<string, unknown> | undefined
    if (d && typeof d.id === 'string') return d.id
  }
  return undefined
}

export function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

export function isoInDays(days: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

// ─── fixtures (IDs reales del tenant vía service role) ────────────────────────────
//
// Algunos endpoints de catálogo (/api/barbers, /api/products) devuelven 500 por
// deriva de esquema (faltan columnas/tablas de migraciones MEJORAS_V2 sin aplicar).
// Esos 500 se registran honestamente como hallazgos de salud, pero para ejercitar el
// RESTO del sistema (crear citas, ventas, etc.) necesitamos IDs reales. Los tomamos
// directo de la base con el service client — sin depender de los endpoints rotos.

export type Fixtures = {
  tenantId: string
  barbers: Array<{ id: string; name: string }>
  services: Array<{ id: string; name: string; price: number }>
  clients: Array<{ id: string; name: string }>
}

export async function loadFixtures(): Promise<Fixtures | null> {
  const db = serviceClient()
  const slug = ENV.NEXT_PUBLIC_TENANT_SLUG ?? 'mercurio-barberia'
  const { data: t } = await db.from('tenants').select('id').eq('slug', slug).maybeSingle()
  if (!t) return null
  const tenantId = (t as { id: string }).id
  const [b, s, c] = await Promise.all([
    db.from('barbers').select('id, name').eq('tenant_id', tenantId).eq('is_active', true).order('sort_order'),
    db.from('services').select('id, name, price').eq('tenant_id', tenantId).eq('is_active', true).order('sort_order'),
    db.from('clients').select('id, name').eq('tenant_id', tenantId).limit(50),
  ])
  return {
    tenantId,
    barbers: (b.data ?? []) as Array<{ id: string; name: string }>,
    services: (s.data ?? []) as Array<{ id: string; name: string; price: number }>,
    clients: (c.data ?? []) as Array<{ id: string; name: string }>,
  }
}

// ─── webhook de WhatsApp (firma + payloads de prueba) ────────────────────────────
//
// El webhook valida X-Hub-Signature-256 con WHATSAPP_APP_SECRET y el GET de
// verificación con WHATSAPP_VERIFY_TOKEN. Si el entorno no los define, el
// orquestador inyecta estos valores de prueba en el dev server (puerto 3001) — así
// la capa de firma es comprobable sin tocar .env.local. Tanto el agente (que firma)
// como el servidor (que verifica) deben usar EXACTAMENTE el mismo secreto, por eso
// se centraliza aquí.

export const TEST_WEBHOOK_SECRET = ENV.WHATSAPP_APP_SECRET ?? 'nevo-test-app-secret-2026'
export const TEST_VERIFY_TOKEN = ENV.WHATSAPP_VERIFY_TOKEN ?? 'nevo-test-verify-token-2026'

/** Firma el cuerpo crudo igual que Meta: 'sha256=' + HMAC-SHA256(secret, body). */
export function signWebhook(rawBody: string): string {
  return 'sha256=' + createHmac('sha256', TEST_WEBHOOK_SECRET).update(rawBody).digest('hex')
}

/** Construye un payload de webhook en formato Meta con un único mensaje. */
export function waMessagePayload(opts: {
  phoneNumberId?: string
  from: string
  messageId?: string
  type?: 'text' | 'audio' | 'image'
  text?: string
  mediaId?: string
}): Record<string, unknown> {
  const {
    phoneNumberId = 'TEST_PHONE_NUMBER_ID',
    from,
    messageId = `wamid.${Math.random().toString(36).slice(2)}${Date.now()}`,
    type = 'text',
    text = 'Hola',
    mediaId = 'media-test-123',
  } = opts

  const message: Record<string, unknown> = {
    from,
    id: messageId,
    timestamp: `${Math.floor(Date.now() / 1000)}`,
    type,
  }
  if (type === 'text') message.text = { body: text }
  else if (type === 'audio') message.audio = { id: mediaId }
  else if (type === 'image') message.image = { id: mediaId, caption: text }

  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WABA_TEST',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '15550000000', phone_number_id: phoneNumberId },
              messages: [message],
            },
          },
        ],
      },
    ],
  }
}

/** Envía un POST firmado al webhook y devuelve {status, ms, body}. */
export async function postSignedWebhook(
  session: Session,
  payload: unknown,
  opts: { signature?: string; omitSignature?: boolean } = {}
): Promise<{ status: number; ms: number; body: unknown }> {
  const raw = JSON.stringify(payload)
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (!opts.omitSignature) headers['x-hub-signature-256'] = opts.signature ?? signWebhook(raw)
  const { res, ms, json } = await session.call('/api/webhooks/whatsapp', {
    method: 'POST',
    headers,
    body: raw,
  })
  return { status: res.status, ms, body: json }
}
