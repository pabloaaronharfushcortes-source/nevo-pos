import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { ok, err } from '@/lib/utils/api-response'
import { idParamSchema } from '@/lib/validation'

type Params = { params: { id: string } }

// DELETE /api/barber-time-off/:id — eliminar un bloqueo (admin).
// Los bloqueos son configuración operativa, no registros de negocio
// auditables, por lo que se permite el borrado físico (no soft delete).
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)
    if (user.role !== 'admin') return err('Acceso restringido', 403)

    const parsedParams = idParamSchema.safeParse(params)
    if (!parsedParams.success) return err('ID inválido', 400)

    const supabase = await createClient()
    const { error } = await supabase
      .from('barber_time_off')
      .delete()
      .eq('id', parsedParams.data.id)
      .eq('tenant_id', user.tenantId)

    if (error) throw error
    return ok({ deleted: true })
  } catch (error) {
    console.error('[api/barber-time-off/:id DELETE]', error)
    return err('Error interno del servidor', 500)
  }
}
