import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { err } from '@/lib/utils/api-response'
import { sendWhatsAppText } from '@/lib/whatsapp/send'
import { sendMessageSchema } from '@/lib/validation/conversations'
import { readJsonBody } from '@/lib/validation'

// GET /api/conversations/:id/messages — hilo de mensajes (para polling/refresco ligero)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)

    const supabase = await createClient()

    // Verificar pertenencia al tenant antes de leer mensajes
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', params.id)
      .eq('tenant_id', user.tenantId)
      .single()

    if (!conv) return err('Conversación no encontrada', 404)

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', params.id)
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error('[api/conversations/:id/messages GET]', error)
    return err('Error interno del servidor', 500)
  }
}

// POST /api/conversations/:id/messages — envío manual del recepcionista (handoff humano).
// Envía por WhatsApp y persiste el mensaje saliente con sent_by = 'human'.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)

    const parsed = sendMessageSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      return err('Datos inválidos', 400, parsed.error.flatten())
    }
    const text = parsed.data.text.trim()

    const supabase = await createClient()

    // Cargar la conversación y las credenciales de WhatsApp del tenant
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, whatsapp_id, tenant_id')
      .eq('id', params.id)
      .eq('tenant_id', user.tenantId)
      .single()

    if (!conversation) {
      return err('Conversación no encontrada', 404)
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('whatsapp_phone_number_id, whatsapp_access_token')
      .eq('id', user.tenantId)
      .single()

    if (!tenant?.whatsapp_phone_number_id || !tenant?.whatsapp_access_token) {
      return err('El negocio no tiene WhatsApp configurado', 422)
    }

    const sent = await sendWhatsAppText({
      phoneNumberId: tenant.whatsapp_phone_number_id,
      accessToken: tenant.whatsapp_access_token,
      to: conversation.whatsapp_id,
      text,
    })

    if (!sent.ok) {
      return err('No se pudo enviar el mensaje por WhatsApp', 502)
    }

    // Persistir el mensaje saliente
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        direction: 'outbound',
        type: 'text',
        content: text,
        whatsapp_message_id: sent.messageId,
        sent_by: 'human',
      })
      .select('*')
      .single()

    if (insertError) throw insertError

    // Actualizar metadatos de la conversación
    await supabase
      .from('conversations')
      .update({
        last_message_at: message.created_at,
        last_message_preview: text.slice(0, 120),
      })
      .eq('id', conversation.id)
      .eq('tenant_id', user.tenantId)

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('[api/conversations/:id/messages POST]', error)
    return err('Error interno del servidor', 500)
  }
}
