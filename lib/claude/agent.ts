import Anthropic from '@anthropic-ai/sdk'

// El modelo vive en config (env), nunca hardcodeado en lógica de negocio.
// Fallback al modelo documentado en CLAUDE.md §2.
const AGENT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
const MAX_TOKENS = 1024

export type AgentMessage = { role: 'user' | 'assistant'; content: string }

// Bloque de creación de cita extraído de la respuesta del agente
export type AppointmentIntent = {
  barberId: string
  serviceId: string
  startsAt: string
  clientName?: string   // requerido solo si el cliente aún no está registrado
}

export type AgentResult = {
  text: string                       // texto limpio para enviar al cliente
  escalate: boolean                  // true si pidió handoff humano
  appointment: AppointmentIntent | null
}

const ESCALATE_TAG = '[ESCALATE]'
const APPOINTMENT_RE = /<APPOINTMENT>([\s\S]*?)<\/APPOINTMENT>/

// Extrae el tag de cita (si existe) y lo remueve del texto visible.
function extractAppointment(text: string): { text: string; appointment: AppointmentIntent | null } {
  const match = text.match(APPOINTMENT_RE)
  if (!match) return { text, appointment: null }

  const cleaned = text.replace(APPOINTMENT_RE, '').trim()
  try {
    const parsed = JSON.parse(match[1].trim()) as Partial<AppointmentIntent>
    if (parsed.barberId && parsed.serviceId && parsed.startsAt) {
      return {
        text: cleaned,
        appointment: {
          barberId: parsed.barberId,
          serviceId: parsed.serviceId,
          startsAt: parsed.startsAt,
          clientName: parsed.clientName,
        },
      }
    }
  } catch {
    // JSON malformado → ignorar el bloque, conservar el texto limpio
  }
  return { text: cleaned, appointment: null }
}

// Procesa los tags [ESCALATE] y <APPOINTMENT> de la respuesta cruda del modelo.
export function parseAgentText(raw: string): AgentResult {
  let text = raw.trim()
  let escalate = false

  if (text.startsWith(ESCALATE_TAG)) {
    escalate = true
    text = text.slice(ESCALATE_TAG.length).trim()
  }

  const { text: finalText, appointment } = extractAppointment(text)
  return { text: finalText, escalate, appointment }
}

// Llama a Claude con el system prompt y el historial, y devuelve la respuesta parseada.
// El system prompt se cachea (cache_control) para abaratar turnos consecutivos.
export async function buildAgentResponse(params: {
  systemPrompt: string
  history: AgentMessage[]
}): Promise<AgentResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: AGENT_MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: 'text',
        text: params.systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: params.history.map(m => ({ role: m.role, content: m.content })),
  })

  const raw = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('')

  return parseAgentText(raw)
}
