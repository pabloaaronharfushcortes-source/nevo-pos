import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'

const CONVERSATION_SELECT = `
  id, tenant_id, client_id, whatsapp_id, mode,
  last_message_at, last_message_preview, unread_human_count, created_at,
  client:clients(id, name, phone, classification)
`

// GET /api/conversations — lista de conversaciones del tenant, ordenadas por actividad
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') // 'agent' | 'human' | null (todos)

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
  } catch (err) {
    console.error('[api/conversations GET]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
