/**
 * Agente STRESS — pone bajo presión las garantías de concurrencia y robustez.
 *
 * Pruebas:
 *   1. Conflicto concurrente de cita: 5 POST simultáneos al MISMO slot →
 *      debe ganar exactamente 1 (201) y los demás recibir 409. Si gana más de
 *      uno, es una condición de carrera REAL (read-then-insert sin lock) y se
 *      reporta como hallazgo, no se esconde.
 *   2. Carga del webhook: 100 POST firmados (WAIDs únicos) → 0 respuestas 5xx.
 *   3. Lecturas concurrentes del dashboard: 20 GET simultáneos → max < 2000ms.
 *   4. Aislamiento de tenant: endpoints protegidos sin sesión → 401 (sin fuga).
 */

import {
  type AgentResult,
  type OpResult,
  Session,
  avg,
  idOf,
  isoInDays,
  jsonInit,
  loadFixtures,
  loginWithOtp,
  postSignedWebhook,
  serviceClient,
  waMessagePayload,
} from './_shared'

type StressExtra = {
  conflict: { winners: number; conflicts: number; other: number; ok: boolean }
  webhookLoad: { total: number; ok2xx: number; rateLimited: number; serverErrors: number; totalMs: number; ok: boolean }
  dashboard: { concurrency: number; maxMs: number; avgMs: number; serverErrors: number; ok: boolean }
  tenantIsolation: { checked: number; leaks: number; endpoints: Array<{ path: string; status: number }>; ok: boolean }
}

export async function runStressAgent(): Promise<AgentResult> {
  const ops: OpResult[] = []
  const errors: string[] = []
  const session = new Session()

  try {
    await loginWithOtp(session)
  } catch (e) {
    return {
      agent: 'stress', passed: 0, failed: 1,
      errors: [`Login falló: ${(e as Error).message}`],
      ops: [], avgResponseMs: 0,
    }
  }

  // Fixtures: IDs reales del tenant (vía service role). No dependemos de /api/barbers
  // (que devuelve 500 por deriva de esquema) — esa salud la cubre el agente admin.
  const fx = await loadFixtures()
  if (!fx || fx.barbers.length === 0 || fx.services.length === 0 || fx.clients.length === 0) {
    return {
      agent: 'stress', passed: 0, failed: 1,
      errors: ['Fixtures vacíos — ¿corriste npm run seed?'],
      ops, avgResponseMs: 0,
    }
  }
  // Usa un barbero DISTINTO al del agente admin (que toma barbers[0]) para que ambos
  // corran en paralelo sin colisionar en el espacio de citas lejanas. Cae a barbers[0]
  // si el tenant solo tuviera uno.
  const barberA = fx.barbers[1] ?? fx.barbers[0]
  const serviceA = fx.services.find(s => /corte/i.test(s.name)) ?? fx.services[0]
  const clientA = fx.clients[0]

  // Reset idempotente: cancelar citas de prueba lejanas (día 90+) que corridas previas
  // pudieron dejar para este barbero, de modo que el slot del test de carrera esté limpio
  // y la medición (1 ganador vs. N) no quede enmascarada por residuos. No toca el seed
  // (≤7 días) ni al barbero del agente admin.
  try {
    const db = serviceClient()
    await db.from('appointments')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancellation_reason: 'reset stress multiagente' })
      .eq('barber_id', barberA.id)
      .gte('starts_at', isoInDays(90, 0, 0))
      .neq('status', 'cancelled')
  } catch { /* best-effort */ }

  // ── 1. Conflicto concurrente de cita ──────────────────────────────────────────
  const conflict = { winners: 0, conflicts: 0, other: 0, ok: false }
  {
    // Slot lejano y "raro" para no colisionar con el seed; se limpia al final.
    const startsAt = isoInDays(95, 16, 0)
    const N = 5
    const results = await Promise.allSettled(
      Array.from({ length: N }, () =>
        session.call('/api/appointments', jsonInit('POST', {
          clientId: clientA.id, barberId: barberA.id, serviceId: serviceA.id, startsAt, bookedVia: 'reception',
        }))
      )
    )
    const createdIds: string[] = []
    let maxMs = 0
    for (const r of results) {
      if (r.status !== 'fulfilled') { conflict.other++; continue }
      const { res, json, ms } = r.value
      maxMs = Math.max(maxMs, ms)
      if (res.status === 201) { conflict.winners++; const id = idOf(json); if (id) createdIds.push(id) }
      else if (res.status === 409) conflict.conflicts++
      else conflict.other++
    }
    conflict.ok = conflict.winners === 1 && conflict.conflicts === N - 1

    ops.push({
      name: `Conflicto concurrente: ${N} citas al mismo slot → 1 gana, ${N - 1}×409`,
      method: 'POST', path: '/api/appointments',
      status: conflict.winners === 1 ? 201 : 409, ok: conflict.ok, ms: maxMs,
      note: conflict.ok
        ? `1 ganador, ${conflict.conflicts}×409`
        : `CONDICIÓN DE CARRERA: ${conflict.winners} ganadores, ${conflict.conflicts}×409, ${conflict.other} otros`,
    })
    if (!conflict.ok) {
      errors.push(`Conflicto concurrente: ${conflict.winners} ganadores (esperaba 1) — posible race read-then-insert sin lock`)
    }

    // Limpieza: cancelar las citas creadas para no contaminar re-ejecuciones.
    for (const id of createdIds) {
      try {
        await session.call(`/api/appointments/${id}`, jsonInit('PATCH', { status: 'cancelled', cancellationReason: 'limpieza stress test' }))
      } catch { /* limpieza best-effort */ }
    }
  }

  // ── 2. Carga del webhook: 100 mensajes firmados, WAIDs únicos ──────────────────
  const webhookLoad = { total: 100, ok2xx: 0, rateLimited: 0, serverErrors: 0, totalMs: 0, ok: false }
  {
    const t0 = Date.now()
    const results = await Promise.allSettled(
      Array.from({ length: webhookLoad.total }, (_, i) => {
        const payload = waMessagePayload({ from: `52199${String(i).padStart(7, '0')}`, text: `carga ${i}` })
        return postSignedWebhook(session, payload)
      })
    )
    webhookLoad.totalMs = Date.now() - t0
    for (const r of results) {
      if (r.status !== 'fulfilled') { webhookLoad.serverErrors++; continue }
      const s = r.value.status
      if (s >= 200 && s < 300) webhookLoad.ok2xx++
      else if (s === 429) webhookLoad.rateLimited++
      else if (s >= 500) webhookLoad.serverErrors++
    }
    webhookLoad.ok = webhookLoad.serverErrors === 0
    ops.push({
      name: `Carga webhook: ${webhookLoad.total} mensajes firmados concurrentes`,
      method: 'POST', path: '/api/webhooks/whatsapp',
      status: webhookLoad.serverErrors === 0 ? 200 : 500, ok: webhookLoad.ok, ms: webhookLoad.totalMs,
      note: `2xx×${webhookLoad.ok2xx}, 429×${webhookLoad.rateLimited}, 5xx×${webhookLoad.serverErrors} en ${webhookLoad.totalMs}ms`,
    })
    if (!webhookLoad.ok) errors.push(`Carga webhook produjo ${webhookLoad.serverErrors} errores 5xx`)
  }

  // ── 3. Lecturas concurrentes del dashboard ─────────────────────────────────────
  const dashboard = { concurrency: 20, maxMs: 0, avgMs: 0, serverErrors: 0, ok: false }
  {
    // Endpoints sanos: medimos latencia real bajo concurrencia. /api/barbers y
    // /api/products quedan fuera porque su 500 (deriva de esquema) ya lo registra el
    // agente admin; incluirlos aquí enmascararía la señal de latencia con ruido 5xx.
    const today = new Date().toISOString().slice(0, 10)
    const readPaths = ['/api/services', '/api/clients', `/api/appointments?from=${today}&to=${today}`, '/api/conversations']
    const results = await Promise.allSettled(
      Array.from({ length: dashboard.concurrency }, (_, i) =>
        session.call(readPaths[i % readPaths.length])
      )
    )
    const lats: number[] = []
    for (const r of results) {
      if (r.status !== 'fulfilled') { dashboard.serverErrors++; continue }
      lats.push(r.value.ms)
      if (r.value.res.status >= 500) dashboard.serverErrors++
    }
    dashboard.maxMs = lats.length ? Math.max(...lats) : 0
    dashboard.avgMs = avg(lats)
    dashboard.ok = dashboard.serverErrors === 0 && dashboard.maxMs < 2000
    ops.push({
      name: `Dashboard: ${dashboard.concurrency} GET concurrentes (max < 2000ms)`,
      method: 'GET', path: '/api/* (lecturas)',
      status: dashboard.serverErrors === 0 ? 200 : 500, ok: dashboard.ok, ms: dashboard.maxMs,
      note: `max ${dashboard.maxMs}ms, avg ${dashboard.avgMs}ms, 5xx×${dashboard.serverErrors}`,
    })
    if (!dashboard.ok) {
      errors.push(`Dashboard concurrente: max ${dashboard.maxMs}ms / ${dashboard.serverErrors} errores 5xx`)
    }
  }

  // ── 4. Aislamiento de tenant: endpoints protegidos sin sesión → 401 ────────────
  const tenantIsolation = { checked: 0, leaks: 0, endpoints: [] as Array<{ path: string; status: number }>, ok: false }
  {
    const anon = new Session() // sin login → sin cookies de sesión
    const protectedPaths = ['/api/appointments', '/api/clients', '/api/barbers', '/api/reports', '/api/conversations']
    for (const p of protectedPaths) {
      const { res } = await anon.call(p)
      tenantIsolation.checked++
      tenantIsolation.endpoints.push({ path: p, status: res.status })
      // Fuga = una respuesta 200 con datos a un cliente NO autenticado.
      if (res.status === 200) tenantIsolation.leaks++
    }
    tenantIsolation.ok = tenantIsolation.leaks === 0
    ops.push({
      name: `Aislamiento: ${tenantIsolation.checked} endpoints protegidos rechazan acceso anónimo`,
      method: 'GET', path: '/api/* (protegidos)',
      status: tenantIsolation.leaks === 0 ? 401 : 200, ok: tenantIsolation.ok, ms: 0,
      note: tenantIsolation.ok
        ? 'todos los endpoints exigen sesión'
        : `FUGA: ${tenantIsolation.leaks} endpoint(s) respondieron 200 sin sesión`,
    })
    if (!tenantIsolation.ok) {
      errors.push(`Aislamiento de tenant: ${tenantIsolation.leaks} endpoint(s) accesibles sin sesión`)
    }
  }

  const extra: StressExtra = { conflict, webhookLoad, dashboard, tenantIsolation }
  const passed = ops.filter(o => o.ok).length
  const failed = ops.filter(o => !o.ok).length
  const latencies = ops.filter(o => o.ms > 0).map(o => o.ms)

  return {
    agent: 'stress',
    passed,
    failed,
    errors,
    ops,
    avgResponseMs: avg(latencies),
    extra: extra as unknown as Record<string, unknown>,
  }
}
