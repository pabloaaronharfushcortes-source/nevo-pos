/**
 * Orquestador del testing multi-agente (FASE 6).
 *
 * 1. Verifica que el servidor en BASE_URL responde.
 * 2. Corre los 3 agentes (admin, whatsapp, stress) con Promise.allSettled.
 * 3. Lanza la suite de Playwright (full-flow) y parsea su reporte JSON.
 * 4. Entrega todo al Juez → veredicto LISTO | CONDICIONAL | BLOQUEADO.
 * 5. Escribe TEST_REPORT.md.
 * 6. Sale 0 si LISTO/CONDICIONAL, 1 si BLOQUEADO.
 *
 * Requiere que un dev server esté corriendo en BASE_URL (3001) con
 * WHATSAPP_APP_SECRET/WHATSAPP_VERIFY_TOKEN inyectados — los mismos valores que usa
 * el harness (ver _shared TEST_WEBHOOK_SECRET/TEST_VERIFY_TOKEN).
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  type AgentResult,
  BASE_URL,
  ENV,
  TEST_VERIFY_TOKEN,
  TEST_WEBHOOK_SECRET,
} from './agents/_shared'
import { runAdminAgent } from './agents/admin-agent'
import { runWhatsappAgent } from './agents/whatsapp-agent'
import { runStressAgent } from './agents/stress-agent'
import { runJudge, type JudgeReport, type PlaywrightSummary } from './agents/judge-agent'

// ── utilidades ───────────────────────────────────────────────────────────────────

function log(msg: string): void {
  process.stdout.write(msg + '\n')
}

async function waitForServer(url: string, attempts = 20): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url + '/login', { redirect: 'manual' })
      if (res.status < 500) return true
    } catch { /* aún no responde */ }
    await new Promise(r => setTimeout(r, 1000))
  }
  return false
}

// ── Playwright ─────────────────────────────────────────────────────────────────

type PwSpec = { title: string; ok: boolean }

function collectSpecs(node: unknown, out: PwSpec[]): void {
  if (!node || typeof node !== 'object') return
  const n = node as { specs?: Array<{ title?: string; ok?: boolean }>; suites?: unknown[] }
  if (Array.isArray(n.specs)) {
    for (const s of n.specs) out.push({ title: s.title ?? '(sin título)', ok: s.ok !== false })
  }
  if (Array.isArray(n.suites)) for (const child of n.suites) collectSpecs(child, out)
}

function runPlaywright(): PlaywrightSummary {
  const port = new URL(BASE_URL).port || '3001'
  const reportFile = join(mkdtempSync(join(tmpdir(), 'pw-')), 'report.json')

  const env = {
    ...process.env,
    E2E_PORT: port,
    E2E_BASE_URL: BASE_URL,
    PLAYWRIGHT_JSON_OUTPUT_NAME: reportFile,
    TEST_ADMIN_EMAIL: ENV.TEST_ADMIN_EMAIL ?? 'admin@mercuriobarberia.com',
    TEST_ADMIN_PASSWORD: ENV.TEST_ADMIN_PASSWORD ?? 'MercurioAdmin2026!',
    NEXT_PUBLIC_TENANT_SLUG: ENV.NEXT_PUBLIC_TENANT_SLUG ?? 'mercurio-barberia',
  }

  const res = spawnSync(
    'npx',
    ['playwright', 'test', 'tests/e2e/full-flow.spec.ts', '--reporter=json'],
    { env, encoding: 'utf8', timeout: 180_000 }
  )

  if (!existsSync(reportFile)) {
    const stderr = (res.stderr ?? '').slice(-400)
    return { ran: false, passed: 0, failed: 0, total: 0, failures: [], note: `no se generó reporte JSON. ${stderr}`.trim() }
  }

  try {
    const report = JSON.parse(readFileSync(reportFile, 'utf8')) as {
      stats?: { expected?: number; unexpected?: number; flaky?: number; skipped?: number }
      suites?: unknown[]
    }
    const specs: PwSpec[] = []
    for (const s of report.suites ?? []) collectSpecs(s, specs)
    const stats = report.stats ?? {}
    const passed = stats.expected ?? specs.filter(s => s.ok).length
    const failed = stats.unexpected ?? specs.filter(s => !s.ok).length
    const total = specs.length || (passed + failed + (stats.skipped ?? 0))
    const failures = specs.filter(s => !s.ok).map(s => s.title)
    return { ran: true, passed, failed, total, failures }
  } catch (e) {
    return { ran: false, passed: 0, failed: 0, total: 0, failures: [], note: `parseo de reporte falló: ${(e as Error).message}` }
  }
}

// ── runner de agentes ─────────────────────────────────────────────────────────

async function runAgentSafe(name: string, fn: () => Promise<AgentResult>): Promise<AgentResult> {
  try {
    return await fn()
  } catch (e) {
    return { agent: name, passed: 0, failed: 1, errors: [`Excepción no controlada: ${(e as Error).message}`], ops: [], avgResponseMs: 0 }
  }
}

// ── reporte markdown ─────────────────────────────────────────────────────────────

function emoji(verdict: JudgeReport['verdict']): string {
  return verdict === 'LISTO' ? '🟢' : verdict === 'CONDICIONAL' ? '🟡' : '🔴'
}

function agentSection(r: AgentResult): string {
  const lines: string[] = []
  lines.push(`### Agente \`${r.agent}\` — ${r.passed} ✓ / ${r.failed} ✗  ·  latencia media ${r.avgResponseMs}ms`)
  lines.push('')
  if (r.ops.length > 0) {
    lines.push('| Operación | Método | HTTP | Resultado | ms | Nota |')
    lines.push('|---|---|---|---|---|---|')
    for (const o of r.ops) {
      const status = o.status === 0 ? '—' : String(o.status)
      const ms = o.ms === 0 ? '—' : String(o.ms)
      lines.push(`| ${o.name} | ${o.method} | ${status} | ${o.ok ? '✓' : '✗'} | ${ms} | ${o.note ?? ''} |`)
    }
  } else {
    lines.push('_Sin operaciones registradas._')
  }
  if (r.errors.length > 0) {
    lines.push('')
    lines.push('**Errores:**')
    for (const e of r.errors) lines.push(`- ${e}`)
  }
  if (r.extra) {
    lines.push('')
    lines.push('<details><summary>Datos adicionales</summary>')
    lines.push('')
    lines.push('```json')
    lines.push(JSON.stringify(r.extra, null, 2))
    lines.push('```')
    lines.push('')
    lines.push('</details>')
  }
  lines.push('')
  return lines.join('\n')
}

function buildReport(agents: AgentResult[], pw: PlaywrightSummary, judge: JudgeReport): string {
  const now = new Date().toISOString()
  const totalPassed = agents.reduce((a, r) => a + r.passed, 0) + pw.passed
  const totalFailed = agents.reduce((a, r) => a + r.failed, 0) + pw.failed

  const md: string[] = []
  md.push('# TEST_REPORT — Testing multi-agente NEVO-POS')
  md.push('')
  md.push(`> Generado: ${now}  ·  Objetivo: \`${BASE_URL}\``)
  md.push('')
  md.push('---')
  md.push('')
  md.push(`## ${emoji(judge.verdict)} Veredicto del Juez: **${judge.verdict}**`)
  md.push('')
  md.push(`- **Fuente del juicio:** ${judge.source === 'claude' ? 'Claude API' : 'motor de reglas (sin ANTHROPIC_API_KEY)'}`)
  md.push(`- **Recomendación de go-live:** ${judge.goLiveRecommendation}`)
  md.push(`- **Totales:** ${totalPassed} pruebas ✓ / ${totalFailed} ✗`)
  md.push('')
  if (judge.blockers.length > 0) {
    md.push('### 🔴 Bloqueantes')
    for (const b of judge.blockers) md.push(`- ${b}`)
    md.push('')
  }
  if (judge.warnings.length > 0) {
    md.push('### 🟡 Advertencias')
    for (const w of judge.warnings) md.push(`- ${w}`)
    md.push('')
  }
  if (judge.minor.length > 0) {
    md.push('### ⚪ Menores / limitaciones de entorno')
    for (const m of judge.minor) md.push(`- ${m}`)
    md.push('')
  }
  md.push('---')
  md.push('')
  md.push('## Resultados por agente')
  md.push('')
  for (const r of agents) md.push(agentSection(r))

  md.push('---')
  md.push('')
  md.push('## Playwright (E2E)')
  md.push('')
  if (pw.ran) {
    md.push(`- Ejecutado: **sí** · ${pw.passed} ✓ / ${pw.failed} ✗ de ${pw.total} pruebas`)
    if (pw.failures.length > 0) {
      md.push('- Fallos:')
      for (const f of pw.failures) md.push(`  - ${f}`)
    }
  } else {
    md.push(`- Ejecutado: **no** — ${pw.note ?? 'razón desconocida'}`)
  }
  md.push('')
  md.push('---')
  md.push('')
  md.push('## Notas de entorno (transparencia)')
  md.push('')
  md.push('- **OTP/2FA:** el harness recupera el OTP descifrando la cookie `auth_pending` (AES-256-GCM con `AUTH_OTP_SECRET`), sin leer la consola del servidor.')
  md.push(`- **WhatsApp:** \`WHATSAPP_APP_SECRET\`/\`WHATSAPP_VERIFY_TOKEN\` ${ENV.WHATSAPP_APP_SECRET ? 'provienen del entorno' : 'se inyectaron como valores de prueba en el dev server (no en .env.local)'} para poder probar la firma del webhook.`)
  md.push(`- **Claude:** ${ENV.ANTHROPIC_API_KEY ? 'el Juez usó la API de Claude.' : 'sin `ANTHROPIC_API_KEY`; el Juez usó el motor de reglas determinista y el comportamiento conversacional del agente quedó ENV-LIMITED.'}`)
  md.push('')
  md.push('_Las pruebas marcadas ENV-LIMITED no son defectos de código: requieren credenciales externas no disponibles en este entorno._')
  md.push('')
  return md.join('\n')
}

// ── main ─────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  log('🚀 Testing multi-agente NEVO-POS')
  log(`   Objetivo: ${BASE_URL}`)
  log(`   Webhook secret de prueba: ${TEST_WEBHOOK_SECRET.slice(0, 6)}…  ·  verify token: ${TEST_VERIFY_TOKEN.slice(0, 6)}…`)
  log('')

  log('⏳ Verificando que el servidor responde…')
  const up = await waitForServer(BASE_URL)
  if (!up) {
    log(`❌ El servidor en ${BASE_URL} no respondió. Inicia el dev server en ese puerto y reintenta.`)
    process.exit(1)
  }
  log('✅ Servidor arriba.')
  log('')

  // El agente STRESS satura adrede el servidor (100 webhooks + 20 lecturas + 5 POST
  // concurrentes). Si corriera EN PARALELO con el agente funcional admin, las mediciones
  // de latencia/disponibilidad de admin medirían "admin bajo carga de stress" — no su
  // línea base — y un GET de admin podía quedar starved por minutos (falso 401/timeout).
  // Por eso corremos admin+whatsapp juntos (carga ligera) y luego stress solo: la señal
  // de concurrencia del stress se conserva íntegra y ninguna medición contamina a la otra.
  log('🤖 Ejecutando agentes funcionales (admin, whatsapp)…')
  const funcSettled = await Promise.allSettled([
    runAgentSafe('admin', runAdminAgent),
    runAgentSafe('whatsapp', runWhatsappAgent),
  ])
  log('🔥 Ejecutando agente de estrés (concurrencia aislada)…')
  const stressSettled = await Promise.allSettled([
    runAgentSafe('stress', runStressAgent),
  ])
  const names = ['admin', 'whatsapp', 'stress']
  const settled = [...funcSettled, ...stressSettled]
  const agents: AgentResult[] = settled.map((s, i) => {
    const name = names[i]
    return s.status === 'fulfilled'
      ? s.value
      : { agent: name, passed: 0, failed: 1, errors: [`allSettled rechazó: ${String(s.reason)}`], ops: [], avgResponseMs: 0 }
  })
  for (const a of agents) log(`   • ${a.agent}: ${a.passed} ✓ / ${a.failed} ✗  (${a.avgResponseMs}ms)`)
  log('')

  log('🎭 Ejecutando Playwright (full-flow)…')
  const pw = runPlaywright()
  log(pw.ran ? `   • Playwright: ${pw.passed} ✓ / ${pw.failed} ✗` : `   • Playwright NO corrió: ${pw.note}`)
  log('')

  log('⚖️  Consultando al Juez…')
  const judge = await runJudge({ agents, playwright: pw })
  log('')
  log(`${emoji(judge.verdict)} VEREDICTO: ${judge.verdict}  (${judge.source})`)
  if (judge.blockers.length) log(`   Bloqueantes: ${judge.blockers.length}`)
  if (judge.warnings.length) log(`   Advertencias: ${judge.warnings.length}`)
  if (judge.minor.length) log(`   Menores: ${judge.minor.length}`)
  log(`   ${judge.goLiveRecommendation}`)
  log('')

  const report = buildReport(agents, pw, judge)
  const reportPath = join(process.cwd(), 'TEST_REPORT.md')
  writeFileSync(reportPath, report, 'utf8')
  log(`📝 Reporte escrito en ${reportPath}`)

  process.exit(judge.verdict === 'BLOQUEADO' ? 1 : 0)
}

main().catch(err => {
  log(`💥 Error fatal del orquestador: ${err instanceof Error ? err.stack ?? err.message : String(err)}`)
  process.exit(1)
})
