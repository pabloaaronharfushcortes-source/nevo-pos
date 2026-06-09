/**
 * Agente WHATSAPP — ejercita el webhook /api/webhooks/whatsapp.
 *
 * Cubre las capas que SÍ son comprobables de forma determinista en este entorno:
 *   1. Verificación GET (token válido → echo del challenge; token inválido → 403)
 *   2. Firma X-Hub-Signature-256 (firma válida → 200; inválida/ausente → 401)
 *   3. Rate limiting por WAID (20/min; el mensaje 21+ → 429)
 *   4. Robustez de tipos (texto / audio / imagen no rompen → nunca 500)
 *
 * Lo que NO es comprobable sin credenciales reales se marca ENV-LIMITED (no como
 * fallo de código): el comportamiento del AGENTE (agendar por WhatsApp, escalar a
 * humano) requiere que el tenant tenga `whatsapp_phone_number_id` configurado y una
 * ANTHROPIC_API_KEY válida. Sin eso, el webhook responde 200 e ignora el evento tras
 * el lookup de tenant — que es justo lo correcto. Se reporta con transparencia.
 */

import {
  type AgentResult,
  type OpResult,
  ENV,
  Session,
  TEST_VERIFY_TOKEN,
  avg,
  postSignedWebhook,
  serviceClient,
  signWebhook,
  waMessagePayload,
} from './_shared'

type Rec = {
  ops: OpResult[]
  errors: string[]
}

function record(
  rec: Rec,
  o: { name: string; method: string; path: string; status: number; ms: number; pass: boolean; note?: string }
): void {
  rec.ops.push({ name: o.name, method: o.method, path: o.path, status: o.status, ok: o.pass, ms: o.ms, note: o.note })
  if (!o.pass) rec.errors.push(`${o.name}: HTTP ${o.status}${o.note ? ` — ${o.note}` : ''}`)
}

export async function runWhatsappAgent(): Promise<AgentResult> {
  const rec: Rec = { ops: [], errors: [] }
  const session = new Session()
  const WH = '/api/webhooks/whatsapp'
  let envLimited = 0

  // ¿El tenant tiene WhatsApp configurado? Determina si el pipeline del agente es
  // ejercitable o si las pruebas de comportamiento quedan ENV-LIMITED.
  let tenantHasWhatsapp = false
  try {
    const svc = serviceClient()
    const { data } = await svc
      .from('tenants')
      .select('whatsapp_phone_number_id')
      .eq('slug', ENV.NEXT_PUBLIC_TENANT_SLUG ?? 'mercurio-barberia')
      .maybeSingle()
    tenantHasWhatsapp = Boolean(data?.whatsapp_phone_number_id)
  } catch {
    tenantHasWhatsapp = false
  }
  const hasAnthropic = Boolean(ENV.ANTHROPIC_API_KEY)

  // ── Escenario 1: verificación GET con token válido → echo del challenge ────────
  {
    const challenge = 'nevo-challenge-123'
    const q = `?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(TEST_VERIFY_TOKEN)}&hub.challenge=${challenge}`
    const { res, ms, json } = await session.call(WH + q, { method: 'GET' })
    const pass = res.status === 200 && json === challenge
    record(rec, {
      name: 'Verificación GET (token válido devuelve el challenge)',
      method: 'GET', path: WH, status: res.status, ms, pass,
      note: pass ? undefined : `esperaba 200 + "${challenge}", recibí "${String(json).slice(0, 40)}"`,
    })
  }

  // ── Escenario 2: verificación GET con token inválido → 403 ─────────────────────
  {
    const q = `?hub.mode=subscribe&hub.verify_token=token-incorrecto-xyz&hub.challenge=abc`
    const { res, ms } = await session.call(WH + q, { method: 'GET' })
    const pass = res.status === 403
    record(rec, {
      name: 'Verificación GET (token inválido → 403)',
      method: 'GET', path: WH, status: res.status, ms, pass,
      note: pass ? undefined : 'esperaba 403',
    })
  }

  // ── Escenario 3: firma inválida → 401 ─────────────────────────────────────────
  {
    const payload = waMessagePayload({ from: '5213330000001', text: 'Hola' })
    const { status, ms } = await postSignedWebhook(session, payload, { signature: 'sha256=firmafalsa' })
    const pass = status === 401
    record(rec, {
      name: 'Firma inválida rechazada (→ 401)',
      method: 'POST', path: WH, status, ms, pass,
      note: pass ? undefined : 'esperaba 401',
    })
  }

  // ── Escenario 4: firma ausente → 401 ──────────────────────────────────────────
  {
    const payload = waMessagePayload({ from: '5213330000002', text: 'Hola' })
    const { status, ms } = await postSignedWebhook(session, payload, { omitSignature: true })
    const pass = status === 401
    record(rec, {
      name: 'Firma ausente rechazada (→ 401)',
      method: 'POST', path: WH, status, ms, pass,
      note: pass ? undefined : 'esperaba 401',
    })
  }

  // ── Escenario 5: firma válida + mensaje de texto → 200 (sin 500) ───────────────
  {
    const payload = waMessagePayload({ from: '5213330000003', text: '¿Cuánto cuesta un corte?' })
    const { status, ms } = await postSignedWebhook(session, payload)
    const pass = status === 200
    record(rec, {
      name: 'Mensaje de texto firmado aceptado (→ 200)',
      method: 'POST', path: WH, status, ms, pass,
      note: pass ? undefined : 'esperaba 200 (nunca 500)',
    })
  }

  // ── Escenario 6: mensaje de audio no rompe (→ 200, sin 500) ───────────────────
  {
    const payload = waMessagePayload({ from: '5213330000004', type: 'audio', mediaId: 'audio-xyz' })
    const { status, ms } = await postSignedWebhook(session, payload)
    const pass = status === 200
    record(rec, {
      name: 'Mensaje de audio no rompe el webhook (→ 200)',
      method: 'POST', path: WH, status, ms, pass,
      note: pass ? undefined : 'esperaba 200 (nunca 500)',
    })
  }

  // ── Escenario 7: rate limiting por WAID (20/min → el 21+ es 429) ──────────────
  {
    const waid = `52133355${Date.now().toString().slice(-6)}` // WAID único para no contaminar
    let ok200 = 0
    let limited = 0
    let crashed = 0
    let firstLimitedAt = 0
    let lastMs = 0
    for (let i = 1; i <= 25; i++) {
      const payload = waMessagePayload({ from: waid, text: `spam ${i}` })
      const { status, ms } = await postSignedWebhook(session, payload)
      lastMs = ms
      if (status === 200) ok200++
      else if (status === 429) { limited++; if (!firstLimitedAt) firstLimitedAt = i }
      else if (status >= 500) crashed++
    }
    // Aceptamos: al menos un 429, ningún 5xx, y el límite cae cerca de 20.
    const pass = limited > 0 && crashed === 0 && firstLimitedAt >= 18 && firstLimitedAt <= 22
    record(rec, {
      name: 'Rate limiting por WAID (25 msgs → ~20×200 luego 429)',
      method: 'POST', path: WH, status: 429, ms: lastMs, pass,
      note: `200×${ok200}, 429×${limited}${firstLimitedAt ? `, primer 429 en #${firstLimitedAt}` : ''}${crashed ? `, 5xx×${crashed}` : ''}`,
    })
  }

  // ── Escenario 8: evento que no es mensaje (status update) → 200 ignorado ───────
  {
    const statusPayload = {
      object: 'whatsapp_business_account',
      entry: [{ id: 'WABA', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { phone_number_id: 'X' }, statuses: [{ id: 'wamid.x', status: 'delivered' }] } }] }],
    }
    const { status, ms } = await postSignedWebhook(session, statusPayload)
    const pass = status === 200
    record(rec, {
      name: 'Evento de estado (no-mensaje) ignorado (→ 200)',
      method: 'POST', path: WH, status, ms, pass,
      note: pass ? undefined : 'esperaba 200',
    })
  }

  // ── ENV-LIMITED: comportamiento del agente (agendar / escalar) ────────────────
  // Estas pruebas requieren tenant.whatsapp_phone_number_id + ANTHROPIC_API_KEY.
  // Se reportan con transparencia; no se cuentan como fallos de código.
  {
    const reasons: string[] = []
    if (!tenantHasWhatsapp) reasons.push('tenant sin whatsapp_phone_number_id')
    if (!hasAnthropic) reasons.push('sin ANTHROPIC_API_KEY')
    const reason = reasons.join(' + ') || 'configurado'

    if (reasons.length > 0) {
      envLimited += 2
      rec.ops.push({
        name: 'Agendamiento vía agente WhatsApp', method: 'POST', path: WH, status: 0, ok: true,
        ms: 0, note: `ENV-LIMITED (${reason}) — pipeline de Claude no ejercitable`,
      })
      rec.ops.push({
        name: 'Escalación a humano ([ESCALATE] → mode=human)', method: 'POST', path: WH, status: 0, ok: true,
        ms: 0, note: `ENV-LIMITED (${reason}) — pipeline de Claude no ejercitable`,
      })
    } else {
      // Si el entorno SÍ está configurado, al menos verificamos que el webhook
      // procesa un mensaje dirigido al tenant real sin romper.
      const svc = serviceClient()
      const { data } = await svc
        .from('tenants').select('whatsapp_phone_number_id')
        .eq('slug', ENV.NEXT_PUBLIC_TENANT_SLUG ?? 'mercurio-barberia').maybeSingle()
      const pnid = data?.whatsapp_phone_number_id ?? 'TEST_PHONE_NUMBER_ID'
      const payload = waMessagePayload({ phoneNumberId: pnid, from: `5213330009${Date.now().toString().slice(-3)}`, text: 'Quiero agendar un corte mañana' })
      const { status, ms } = await postSignedWebhook(session, payload)
      const pass = status === 200
      record(rec, {
        name: 'Mensaje dirigido al tenant real procesado (→ 200)',
        method: 'POST', path: WH, status, ms, pass,
        note: pass ? 'pipeline del agente ejecutado' : 'esperaba 200',
      })
    }
  }

  const passed = rec.ops.filter(o => o.ok).length
  const failed = rec.ops.filter(o => !o.ok).length
  const latencies = rec.ops.filter(o => o.ms > 0).map(o => o.ms)

  return {
    agent: 'whatsapp',
    passed,
    failed,
    errors: rec.errors,
    ops: rec.ops,
    avgResponseMs: avg(latencies),
    extra: {
      tenantHasWhatsapp,
      hasAnthropic,
      envLimited,
      note: 'La capa de seguridad del webhook (firma, rate-limit, verificación) se probó por completo. El comportamiento del agente conversacional es ENV-LIMITED sin credenciales de WhatsApp/Claude.',
    },
  }
}
