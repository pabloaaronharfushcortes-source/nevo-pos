import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { sendWhatsAppText } from '@/lib/whatsapp/send'

// GET /api/conversations/:id/messages — hilo de mensajes (para polling/refresco ligero)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const supabase = await createClient()

    // Verificar pertenencia al tenant antes de leer mensajes
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', params.id)
      .eq('tenant_id', user.tenantId)
      .single()

    if (!conv) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', params.id)
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[api/conversations/:id/messages GET]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
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
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json() as { text?: string }
    const text = body.text?.trim()
    if (!text) return NextResponse.json({ error: 'El mensaje está vacío' }, { status: 400 })

    const supabase = await createClient()

    // Cargar la conversación y las credenciales de WhatsApp del tenant
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, whatsapp_id, tenant_id')
      .eq('id', params.id)
      .eq('tenant_id', user.tenantId)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('whatsapp_phone_number_id, whatsapp_access_token')
      .eq('id', user.tenantId)
      .single()

    if (!tenant?.whatsapp_phone_number_id || !tenant?.whatsapp_access_token) {
      return NextResponse.json(
        { error: 'El negocio no tiene WhatsApp configurado' },
        { status: 422 }
      )
    }

    const sent = await sendWhatsAppText({
      phoneNumberId: tenant.whatsapp_phone_number_id,
      accessToken: tenant.whatsapp_access_token,
      to: conversation.whatsapp_id,
      text,
    })

    if (!sent.ok) {
      return NextResponse.json({ error: sent.error }, { status: 502 })
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
  } catch (err) {
    console.error('[api/conversations/:id/messages POST]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
