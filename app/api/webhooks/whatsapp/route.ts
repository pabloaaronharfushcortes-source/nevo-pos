import { type NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createServiceClient } from '@/lib/supabase/server'
import { verifySignature, parseWebhook, downloadMedia, type IncomingMessage } from '@/lib/whatsapp/receive'
import { transcribeAudio } from '@/lib/openai/whisper'
import { processAgentMessage } from '@/lib/whatsapp/process'
import { checkRateLimit } from '@/lib/whatsapp/rate-limit'

type Supabase = SupabaseClient<Database>

// El webhook recibe el cuerpo crudo para validar la firma — sin caché.
export const dynamic = 'force-dynamic'

// GET — verificación del webhook por Meta durante el alta de la app.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode !== 'subscribe' || !token) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Verify token global (alta de la app) o por-tenant (almacenado en tenants)
  if (token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? '', { status: 200 })
  }

  const supabase = createServiceClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('whatsapp_verify_token', token)
    .maybeSingle()

  if (tenant) {
    return new NextResponse(challenge ?? '', { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

// POST — recepción de mensajes entrantes.
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    // 1. Verificar firma X-Hub-Signature-256 (regla de seguridad 5)
    const appSecret = process.env.WHATSAPP_APP_SECRET ?? ''
    const signature = request.headers.get('x-hub-signature-256')
    if (!verifySignature(rawBody, signature, appSecret)) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 2. Parsear el evento — ignorar lo que no sea un mensaje
    const incoming = parseWebhook(JSON.parse(rawBody))
    if (!incoming) return new NextResponse('OK', { status: 200 })

    // 3. Rate limiting por número (regla de seguridad 6)
    if (!checkRateLimit(incoming.whatsappId)) {
      return new NextResponse('Too Many Requests', { status: 429 })
    }

    const supabase = createServiceClient()

    // 4. Identificar al tenant por phone_number_id
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, timezone, agent_knowledge_base, whatsapp_phone_number_id, whatsapp_access_token')
      .eq('whatsapp_phone_number_id', incoming.phoneNumberId)
      .maybeSingle()

    if (!tenant) return new NextResponse('OK', { status: 200 })

    // 5. Buscar o crear la conversación por (tenant_id, whatsapp_id)
    let conversation = await findConversation(supabase, tenant.id, incoming.whatsappId)
    if (!conversation) {
      conversation = await createConversation(supabase, tenant.id, incoming.whatsappId)
      if (!conversation) return new NextResponse('OK', { status: 200 })
    }

    // 6. Resolver el contenido del mensaje (audio → Whisper; otros → texto/caption)
    let inboundText = incoming.text ?? ''
    if (incoming.type === 'audio' && incoming.mediaId && tenant.whatsapp_access_token) {
      const media = await downloadMedia(incoming.mediaId, tenant.whatsapp_access_token)
      if (media) {
        const transcript = await transcribeAudio(media.buffer, media.mimeType)
        if (transcript) inboundText = transcript
      }
    }

    // 7. Guardar el mensaje entrante (deduplicado por whatsapp_message_id)
    const stored = await storeInbound(supabase, conversation.id, incoming, inboundText)
    if (!stored) return new NextResponse('OK', { status: 200 }) // duplicado → ya procesado

    // 8. Bifurcación por modo
    if (conversation.mode === 'human') {
      // Recepción tiene el control: solo incrementar pendientes y actualizar preview.
      // El cambio en la tabla dispara Realtime hacia el panel.
      await supabase
        .from('conversations')
        .update({
          unread_human_count: conversation.unread_human_count + 1,
          last_message_at: new Date().toISOString(),
          last_message_preview: (inboundText || `[${incoming.type}]`).slice(0, 120),
        })
        .eq('id', conversation.id)
      return new NextResponse('OK', { status: 200 })
    }

    // Modo agente — actualizar preview del entrante y procesar con Claude
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: (inboundText || `[${incoming.type}]`).slice(0, 120),
      })
      .eq('id', conversation.id)

    if (!inboundText.trim()) {
      // Sin texto utilizable (p. ej. imagen sin caption); no invocar al agente.
      return new NextResponse('OK', { status: 200 })
    }

    await processAgentMessage(
      supabase,
      tenant,
      { id: conversation.id, whatsapp_id: conversation.whatsapp_id, client_id: conversation.client_id },
      inboundText
    )

    return new NextResponse('OK', { status: 200 })
  } catch (err) {
    // No logueamos el contenido del mensaje (regla de seguridad 7)
    console.error('[webhook/whatsapp POST]', err instanceof Error ? err.message : 'error desconocido')
    return new NextResponse('OK', { status: 200 })
  }
}

// ---------------------------------------------------------------------------
// Helpers (usan service client — el webhook no tiene sesión de usuario)
// ---------------------------------------------------------------------------

type ConversationRow = {
  id: string
  whatsapp_id: string
  client_id: string | null
  mode: string
  unread_human_count: number
}

async function findConversation(supabase: Supabase, tenantId: string, whatsappId: string): Promise<ConversationRow | null> {
  const { data } = await supabase
    .from('conversations')
    .select('id, whatsapp_id, client_id, mode, unread_human_count')
    .eq('tenant_id', tenantId)
    .eq('whatsapp_id', whatsappId)
    .maybeSingle()
  return data
}

async function createConversation(supabase: Supabase, tenantId: string, whatsappId: string): Promise<ConversationRow | null> {
  // Vincular a un cliente existente si ya conocemos su WAID
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('whatsapp_id', whatsappId)
    .maybeSingle()

  const { data } = await supabase
    .from('conversations')
    .insert({
      tenant_id: tenantId,
      whatsapp_id: whatsappId,
      client_id: client?.id ?? null,
      mode: 'agent',
    })
    .select('id, whatsapp_id, client_id, mode, unread_human_count')
    .single()
  return data
}

async function storeInbound(
  supabase: Supabase,
  conversationId: string,
  incoming: IncomingMessage,
  content: string
): Promise<boolean> {
  // Deduplicar por whatsapp_message_id (Meta reintenta webhooks)
  const { data: existing } = await supabase
    .from('messages')
    .select('id')
    .eq('whatsapp_message_id', incoming.messageId)
    .maybeSingle()
  if (existing) return false

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    direction: 'inbound',
    type: incoming.type,
    content: content || null,
    whatsapp_message_id: incoming.messageId,
    sent_by: 'client',
  })

  return !error
}
