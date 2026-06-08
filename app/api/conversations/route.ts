import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { err } from '@/lib/utils/api-response'
import { conversationsQuerySchema } from '@/lib/validation/conversations'
import { searchParamsToObject } from '@/lib/validation'

const CONVERSATION_SELECT = `
  id, tenant_id, client_id, whatsapp_id, mode,
  last_message_at, last_message_preview, unread_human_count, created_at,
  client:clients(id, name, phone, classification)
`

// GET /api/conversations — lista de conversaciones del tenant, ordenadas por actividad
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)

    const parsed = conversationsQuerySchema.safeParse(searchParamsToObject(request.url))
    if (!parsed.success) {
      return err('Datos inválidos', 400, parsed.error.flatten())
    }
    const mode = parsed.data.mode // 'agent' | 'human' | undefined (todos)

    const supabase = await createClient()

    let query = supabase
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .eq('tenant_id', user.tenantId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(100)

    if (mode === 'agent' || mode === 'human') {
      query = query.eq('mode', mode)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error('[api/conversations GET]', error)
    return err('Error interno del servidor', 500)
  }
}
