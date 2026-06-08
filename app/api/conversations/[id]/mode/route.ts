import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { err } from '@/lib/utils/api-response'
import { updateModeSchema } from '@/lib/validation/conversations'
import { readJsonBody } from '@/lib/validation'

// PATCH /api/conversations/:id/mode — alterna entre 'agent' y 'human'.
// Al devolver el control al agente, se limpian los mensajes sin leer.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)

    const parsed = updateModeSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      return err('Datos inválidos', 400, parsed.error.flatten())
    }
    const body = parsed.data

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
      return err('Conversación no encontrada', 404)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[api/conversations/:id/mode PATCH]', error)
    return err('Error interno del servidor', 500)
  }
}
