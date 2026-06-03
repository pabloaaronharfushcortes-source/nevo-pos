import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'

// PATCH /api/conversations/:id/mode — alterna entre 'agent' y 'human'.
// Al devolver el control al agente, se limpian los mensajes sin leer.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json() as { mode?: string }
    if (body.mode !== 'agent' && body.mode !== 'human') {
      return NextResponse.json({ error: 'Modo inválido' }, { status: 400 })
    }

    const supabase = await createClient()

    const update: { mode: string; unread_human_count?: number } = { mode: body.mode }
    // Al regresar al agente, recepción ya cerró el hilo: sin pendientes
    if (body.mode === 'agent') update.unread_human_count = 0

    const { data, error } = await supabase
      .from('conversations')
      .update(update)
      .eq('id', params.id)
      .eq('tenant_id', user.tenantId)
      .select('id, mode, unread_human_count')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[api/conversations/:id/mode PATCH]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
