import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { err } from '@/lib/utils/api-response'

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
    if (!user) return err('No autorizado', 401)

    const supabase = await createClient()

    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .eq('id', params.id)
      .eq('tenant_id', user.tenantId)
      .single()

    if (error || !conversation) {
      return err('Conversación no encontrada', 404)
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
  } catch (error) {
    console.error('[api/conversations/:id GET]', error)
    return err('Error interno del servidor', 500)
  }
}
