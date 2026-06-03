import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { buildSystemPrompt, type AgentClient } from '@/lib/claude/prompts'
import { buildAgentResponse, type AgentMessage, type AppointmentIntent } from '@/lib/claude/agent'
import { getAgendaAvailability } from '@/lib/utils/slots'
import { sendWhatsAppText } from '@/lib/whatsapp/send'

type Supabase = SupabaseClient<Database>

type TenantContext = {
  id: string
  name: string
  timezone: string
  agent_knowledge_base: string | null
  whatsapp_phone_number_id: string | null
  whatsapp_access_token: string | null
}

type ConversationContext = {
  id: string
  whatsapp_id: string
  client_id: string | null
}

const HISTORY_LIMIT = 10

// Resuelve el cliente del intent de cita: usa el ya vinculado o crea uno nuevo
// con el WAID de la conversación (regla: los clientes son filas, no cuentas Auth).
async function resolveClientId(
  supabase: Supabase,
  tenantId: string,
  conversation: ConversationContext,
  clientName: string | undefined
): Promise<string | null> {
  if (conversation.client_id) return conversation.client_id

  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('whatsapp_id', conversation.whatsapp_id)
    .maybeSingle()

  if (existing) return existing.id

  if (!clientName?.trim()) return null

  const { data: created } = await supabase
    .from('clients')
    .insert({
      tenant_id: tenantId,
      name: clientName.trim(),
      whatsapp_id: conversation.whatsapp_id,
    })
    .select('id')
    .single()

  if (created) {
    // Vincular la conversación al cliente recién creado
    await supabase.from('conversations').update({ client_id: created.id }).eq('id', conversation.id)
  }

  return created?.id ?? null
}

// Crea la cita solicitada por el agente, validando conflictos (CLAUDE.md §6 y §15).
// Devuelve un mensaje de éxito/error para anexar a la respuesta del cliente.
async function createAgentAppointment(
  supabase: Supabase,
  tenantId: string,
  conversation: ConversationContext,
  intent: AppointmentIntent
): Promise<{ ok: boolean; note: string }> {
  const clientId = await resolveClientId(supabase, tenantId, conversation, intent.clientName)
  if (!clientId) {
    return { ok: false, note: '\n\n(No pude registrar la cita: necesito tu nombre completo.)' }
  }

  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', intent.serviceId)
    .eq('tenant_id', tenantId)
    .single()

  if (!service) {
    return { ok: false, note: '\n\n(No pude registrar la cita: el servicio no es válido.)' }
  }

  const startsAt = new Date(intent.startsAt)
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, note: '\n\n(No pude registrar la cita: la hora no es válida.)' }
  }
  const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60_000).toISOString()

  // Verificación de conflictos — NUNCA crear cita sin ejecutarla (CLAUDE.md §15)
  const { count: conflicts } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('barber_id', intent.barberId)
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .neq('status', 'no_show')
    .lt('starts_at', endsAt)
    .gt('ends_at', intent.startsAt)

  if (conflicts && conflicts > 0) {
    return { ok: false, note: '\n\n(Ese horario se acaba de ocupar. ¿Buscamos otra hora?)' }
  }

  const { error } = await supabase.from('appointments').insert({
    tenant_id: tenantId,
    client_id: clientId,
    barber_id: intent.barberId,
    service_id: intent.serviceId,
    starts_at: intent.startsAt,
    ends_at: endsAt,
    status: 'pending',
    booked_via: 'whatsapp',
  })

  if (error) {
    console.error('[process] Error al crear cita del agente:', error.message)
    return { ok: false, note: '\n\n(Hubo un problema al guardar la cita. Intentemos de nuevo.)' }
  }

  return { ok: true, note: '' }
}

// Procesa un mensaje entrante en modo agente: arma contexto, llama a Claude,
// crea cita si aplica, gestiona escalación, envía la respuesta y la persiste.
export async function processAgentMessage(
  supabase: Supabase,
  tenant: TenantContext,
  conversation: ConversationContext,
  userText: string
): Promise<void> {
  // 1. Cliente (si está identificado por WAID)
  const { data: clientRow } = await supabase
    .from('clients')
    .select('id, name, classification, loyalty_stamps, preferred_barber_id, preferred_barber:barbers(name)')
    .eq('tenant_id', tenant.id)
    .eq('whatsapp_id', conversation.whatsapp_id)
    .maybeSingle()

  let agentClient: AgentClient | null = null
  if (clientRow) {
    const { count: visitCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientRow.id)
      .eq('status', 'completed')

    agentClient = {
      id: clientRow.id,
      name: clientRow.name,
      classification: clientRow.classification,
      loyalty_stamps: clientRow.loyalty_stamps,
      preferred_barber_id: clientRow.preferred_barber_id,
      visitCount: visitCount ?? 0,
      preferredBarberName: (clientRow.preferred_barber as { name: string } | null)?.name ?? null,
    }
  }

  // 2. Historial (últimos 10 mensajes, en orden cronológico)
  const { data: recent } = await supabase
    .from('messages')
    .select('direction, content, type')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT)

  const history: AgentMessage[] = (recent ?? [])
    .reverse()
    .map(m => ({
      role: m.direction === 'inbound' ? 'user' as const : 'assistant' as const,
      content: m.content ?? `[${m.type}]`,
    }))
    .filter(m => m.content.trim().length > 0)

  // Asegurar que el último turno sea el mensaje actual del usuario
  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    history.push({ role: 'user', content: userText })
  }

  // 3. Contexto de agenda y catálogo
  const [availability, { data: services }, { data: barbers }] = await Promise.all([
    getAgendaAvailability(supabase, tenant.id, { hours: 48 }),
    supabase
      .from('services')
      .select('id, tenant_id, name, description, price, duration_minutes, category, is_active, sort_order, created_at')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('barbers')
      .select('id, name')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('sort_order'),
  ])

  // 4. System prompt + llamada al agente
  const systemPrompt = buildSystemPrompt({
    tenant: { agent_knowledge_base: tenant.agent_knowledge_base, timezone: tenant.timezone, name: tenant.name },
    client: agentClient,
    availability,
    services: services ?? [],
    barbers: barbers ?? [],
  })

  const result = await buildAgentResponse({ systemPrompt, history })

  // 5. Crear cita si el agente lo solicitó
  let outboundText = result.text
  if (result.appointment) {
    const { note } = await createAgentAppointment(supabase, tenant.id, conversation, result.appointment)
    outboundText += note
  }

  // 6. Escalación → pasar a modo humano
  if (result.escalate) {
    await supabase.from('conversations').update({ mode: 'human' }).eq('id', conversation.id)
  }

  // 7. Enviar la respuesta por WhatsApp
  if (!tenant.whatsapp_phone_number_id || !tenant.whatsapp_access_token) {
    console.error('[process] Tenant sin credenciales de WhatsApp:', tenant.id)
    return
  }

  const sent = await sendWhatsAppText({
    phoneNumberId: tenant.whatsapp_phone_number_id,
    accessToken: tenant.whatsapp_access_token,
    to: conversation.whatsapp_id,
    text: outboundText,
  })

  if (!sent.ok) {
    console.error('[process] Falló el envío de la respuesta del agente:', sent.error)
    return
  }

  // 8. Persistir el mensaje saliente + metadatos de la conversación
  const { data: outMsg } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      direction: 'outbound',
      type: 'text',
      content: outboundText,
      whatsapp_message_id: sent.messageId,
      sent_by: 'agent',
    })
    .select('created_at')
    .single()

  await supabase
    .from('conversations')
    .update({
      last_message_at: outMsg?.created_at ?? new Date().toISOString(),
      last_message_preview: outboundText.slice(0, 120),
    })
    .eq('id', conversation.id)
}
