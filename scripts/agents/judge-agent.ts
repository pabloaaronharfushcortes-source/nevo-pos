/**
 * Agente JUEZ — emite el veredicto de go-live a partir de los resultados.
 *
 * Si hay ANTHROPIC_API_KEY, delega el juicio a Claude (modelo del proyecto) con un
 * prompt estructurado y exige una respuesta JSON. Si no hay clave —o si la llamada
 * falla o el JSON es inválido— cae a un motor de reglas determinista que aplica los
 * mismos criterios de go-live. El veredicto siempre indica su fuente ('claude' o
 * 'rule-based') para que el reporte sea transparente.
 */

import Anthropic from '@anthropic-ai/sdk'
import { type AgentResult, ENV } from './_shared'

export type PlaywrightSummary = {
  ran: boolean
  passed: number
  failed: number
  total: number
  failures: string[]
  note?: string
}

export type JudgeInput = {
  agents: AgentResult[]
  playwright: PlaywrightSummary
}

export type JudgeReport = {
  verdict: 'LISTO' | 'BLOQUEADO' | 'CONDICIONAL'
  blockers: string[]
  warnings: string[]
  minor: string[]
  goLiveRecommendation: string
  source: 'claude' | 'rule-based'
}

const MODEL = ENV.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'

// ── Detección de señales objetivas a partir de los resultados ────────────────────

type Signals = {
  serverErrors: Array<{ agent: string; op: string }>
  adminAvgMs: number
  concurrencyRace: { winners: number } | null
  tenantLeaks: number
  webhookSecurityOk: boolean
  rateLimitOk: boolean
  envLimited: number
  failedOps: Array<{ agent: string; op: string; status: number; note?: string }>
}

function collectSignals(input: JudgeInput): Signals {
  const s: Signals = {
    serverErrors: [],
    adminAvgMs: 0,
    concurrencyRace: null,
    tenantLeaks: 0,
    webhookSecurityOk: true,
    rateLimitOk: true,
    envLimited: 0,
    failedOps: [],
  }

  for (const agent of input.agents) {
    for (const op of agent.ops) {
      if (op.status >= 500) s.serverErrors.push({ agent: agent.agent, op: op.name })
      if (!op.ok) s.failedOps.push({ agent: agent.agent, op: op.name, status: op.status, note: op.note })
    }
    if (agent.agent === 'admin') s.adminAvgMs = agent.avgResponseMs

    if (agent.agent === 'whatsapp') {
      const extra = (agent.extra ?? {}) as Record<string, unknown>
      if (typeof extra.envLimited === 'number') s.envLimited += extra.envLimited
      // La seguridad del webhook falla si alguna prueba de firma/verificación falló.
      for (const op of agent.ops) {
        if (!op.ok && /firma|verificación/i.test(op.name)) s.webhookSecurityOk = false
        if (!op.ok && /rate limiting/i.test(op.name)) s.rateLimitOk = false
      }
    }

    if (agent.agent === 'stress') {
      const extra = agent.extra as
        | { conflict?: { winners: number; ok: boolean }; tenantIsolation?: { leaks: number } }
        | undefined
      if (extra?.conflict && !extra.conflict.ok && extra.conflict.winners > 1) {
        s.concurrencyRace = { winners: extra.conflict.winners }
      }
      if (extra?.tenantIsolation) s.tenantLeaks = extra.tenantIsolation.leaks
    }
  }

  return s
}

// ── Motor de reglas (fallback determinista) ──────────────────────────────────────

function ruleBasedVerdict(input: JudgeInput, signals: Signals): JudgeReport {
  const blockers: string[] = []
  const warnings: string[] = []
  const minor: string[] = []

  // BLOQUEANTES — riesgos de integridad/seguridad o caídas del servidor.
  if (signals.serverErrors.length > 0) {
    blockers.push(`${signals.serverErrors.length} operación(es) devolvieron HTTP 5xx: ` +
      signals.serverErrors.map(e => `${e.agent}/${e.op}`).join('; '))
  }
  if (signals.tenantLeaks > 0) {
    blockers.push(`Aislamiento de tenant comprometido: ${signals.tenantLeaks} endpoint(s) accesibles sin sesión`)
  }
  if (signals.concurrencyRace) {
    blockers.push(`Condición de carrera al crear citas: ${signals.concurrencyRace.winners} ganadores en el mismo slot (esperaba 1). Falta lock/constraint únicos.`)
  }
  if (!signals.webhookSecurityOk) {
    blockers.push('La capa de seguridad del webhook (firma/verificación) no se comportó como se espera')
  }
  if (input.playwright.ran && input.playwright.failed > 0) {
    blockers.push(`Playwright: ${input.playwright.failed} prueba(s) E2E fallaron: ${input.playwright.failures.slice(0, 5).join('; ')}`)
  }

  // ADVERTENCIAS — calidad/operación, no bloquean pero requieren atención.
  if (signals.adminAvgMs > 500) {
    warnings.push(`Latencia promedio del admin ${signals.adminAvgMs}ms supera el objetivo de 500ms`)
  }
  if (!signals.rateLimitOk) {
    warnings.push('El rate limiting del webhook no se observó dentro del umbral esperado')
  }
  if (!input.playwright.ran) {
    warnings.push(`Playwright no se ejecutó${input.playwright.note ? ` (${input.playwright.note})` : ''}`)
  }
  // Fallos no-5xx que no encajan en categorías anteriores.
  const otherFails = signals.failedOps.filter(f =>
    f.status < 500 &&
    !/aislamiento|conflicto concurrente|firma|verificación|rate limiting/i.test(f.op))
  for (const f of otherFails) {
    warnings.push(`${f.agent}/${f.op} → HTTP ${f.status}${f.note ? ` (${f.note})` : ''}`)
  }

  // MENORES — limitaciones de entorno, no defectos de código.
  if (signals.envLimited > 0) {
    minor.push(`${signals.envLimited} prueba(s) de comportamiento del agente quedaron ENV-LIMITED (faltan credenciales WhatsApp/Claude). No son fallos de código.`)
  }

  let verdict: JudgeReport['verdict']
  let goLiveRecommendation: string
  if (blockers.length > 0) {
    verdict = 'BLOQUEADO'
    goLiveRecommendation = 'NO desplegar. Resolver los bloqueantes listados (integridad de datos / seguridad / errores de servidor) y re-ejecutar la suite.'
  } else if (warnings.length > 0) {
    verdict = 'CONDICIONAL'
    goLiveRecommendation = 'Despliegue posible con monitoreo. Atender las advertencias en la primera iteración; ninguna compromete integridad ni seguridad.'
  } else {
    verdict = 'LISTO'
    goLiveRecommendation = 'Listo para producción. Las garantías críticas (seguridad del webhook, aislamiento de tenant, integridad de concurrencia, salud de API) se cumplen.'
  }

  return { verdict, blockers, warnings, minor, goLiveRecommendation, source: 'rule-based' }
}

// ── Juez con Claude (cuando hay clave) ───────────────────────────────────────────

async function claudeVerdict(input: JudgeInput, signals: Signals): Promise<JudgeReport | null> {
  const apiKey = ENV.ANTHROPIC_API_KEY
  if (!apiKey) return null

  try {
    const client = new Anthropic({ apiKey })
    const compact = {
      agents: input.agents.map(a => ({
        agent: a.agent, passed: a.passed, failed: a.failed,
        avgResponseMs: a.avgResponseMs, errors: a.errors,
        ops: a.ops.map(o => ({ name: o.name, status: o.status, ok: o.ok, ms: o.ms, note: o.note })),
        extra: a.extra,
      })),
      playwright: input.playwright,
      objectiveSignals: signals,
    }

    const system = `Eres el JUEZ de go-live de NEVO-POS, un SaaS multi-tenant para barberías (Next.js 14 + Supabase, RLS por tenant). Evalúas los resultados de una suite multi-agente y emites un veredicto.

CRITERIOS DE GO-LIVE:
- BLOQUEANTE: cualquier HTTP 5xx, fuga de aislamiento de tenant (endpoint protegido accesible sin sesión), condición de carrera que cree datos duplicados, fallo en la capa de seguridad del webhook (firma/verificación), o fallos E2E de Playwright que rompan guardas de auth.
- ADVERTENCIA (CONDICIONAL): latencia admin > 500ms, rate-limit fuera de umbral, Playwright no ejecutado, fallos funcionales no-5xx.
- MENOR: limitaciones de entorno (ENV-LIMITED) por falta de credenciales — NO son defectos de código.

VEREDICTO:
- "BLOQUEADO" si hay ≥1 bloqueante.
- "CONDICIONAL" si no hay bloqueantes pero sí advertencias.
- "LISTO" si no hay bloqueantes ni advertencias.

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto extra) con esta forma exacta:
{"verdict":"LISTO|BLOQUEADO|CONDICIONAL","blockers":[],"warnings":[],"minor":[],"goLiveRecommendation":"..."}`

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: `Resultados de la suite:\n\n${JSON.stringify(compact, null, 2)}` }],
    })

    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()

    // Extraer el primer bloque JSON aunque venga con texto alrededor.
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) return null
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<JudgeReport>

    if (!parsed.verdict || !['LISTO', 'BLOQUEADO', 'CONDICIONAL'].includes(parsed.verdict)) return null

    return {
      verdict: parsed.verdict,
      blockers: Array.isArray(parsed.blockers) ? parsed.blockers : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      minor: Array.isArray(parsed.minor) ? parsed.minor : [],
      goLiveRecommendation: parsed.goLiveRecommendation ?? '(sin recomendación)',
      source: 'claude',
    }
  } catch (err) {
    console.warn('[judge] Claude falló, usando motor de reglas:', err instanceof Error ? err.message : 'error')
    return null
  }
}

export async function runJudge(input: JudgeInput): Promise<JudgeReport> {
  const signals = collectSignals(input)
  const viaClaude = await claudeVerdict(input, signals)
  return viaClaude ?? ruleBasedVerdict(input, signals)
}
