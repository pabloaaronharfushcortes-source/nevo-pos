import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { ok, err } from '@/lib/utils/api-response'
import { readJsonBody, idParamSchema } from '@/lib/validation'
import { updateBarberSchema } from '@/lib/validation/settings'

const BARBER_COLS =
  'id, tenant_id, user_id, name, photo_url, commission_rate, is_active, sort_order, created_at'

type Params = { params: { id: string } }

// PATCH /api/barbers/:id — actualizar barbero (incluye desactivar con is_active=false)
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)
    if (user.role !== 'admin') return err('Acceso restringido', 403)

    const parsedParams = idParamSchema.safeParse(params)
    if (!parsedParams.success) return err('ID inválido', 400)

    const parsed = updateBarberSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) return err('Datos inválidos', 400, parsed.error.flatten())

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('barbers')
      .update(parsed.data)
      .eq('id', parsedParams.data.id)
      .select(BARBER_COLS)
      .single()

    if (error) throw error
    return ok(data)
  } catch (error) {
    console.error('[api/barbers/:id PATCH]', error)
    return err('Error interno del servidor', 500)
  }
}
