import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'

const CONVERSATION_SELECT = `
  id, tenant_id, client_id, whatsapp_id, mode,
  last_message_at, last_message_preview, unread_human_count, created_at,
  client:clients(id, name, phone, classification)
`

// GET /api/conversations/:id — conversación con su hilo completo de mensajes.
// Marca los mensajes entrantes como leídos (unread_human_count = 0) al abrir.
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const supabase = await createClient()

    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .eq('id', params.id)
      .eq('tenant_id', user.tenantId)
      .single()

    if (error || !conversation) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
    }

    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', params.id)
      .order('created_at', { ascending: true })
      .limit(200)

    if (msgError) throw msgError

    // Al abrir la conversación, recepción ya leyó los pendientes
    if (conversation.unread_human_count > 0) {
      await supabase
        .from('conversations')
        .update({ unread_human_count: 0 })
        .eq('id', params.id)
        .eq('tenant_id', user.tenantId)
      conversation.unread_human_count = 0
    }

    return NextResponse.json({ ...conversation, messages: messages ?? [] })
  } catch (err) {
    console.error('[api/conversations/:id GET]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
