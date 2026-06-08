import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { ok, err } from '@/lib/utils/api-response'
import { readJsonBody, idParamSchema } from '@/lib/validation'
import { updateServiceSchema } from '@/lib/validation/settings'

const SERVICE_COLS =
  'id, tenant_id, name, description, price, duration_minutes, category, is_active, sort_order, created_at'

type Params = { params: { id: string } }

// PATCH /api/services/:id — actualizar servicio (incluye desactivar con is_active=false)
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)
    if (user.role !== 'admin') return err('Acceso restringido', 403)

    const parsedParams = idParamSchema.safeParse(params)
    if (!parsedParams.success) return err('ID inválido', 400)

    const parsed = updateServiceSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) return err('Datos inválidos', 400, parsed.error.flatten())

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('services')
      .update(parsed.data)
      .eq('id', parsedParams.data.id)
      .select(SERVICE_COLS)
      .single()

    if (error) throw error
    return ok(data)
  } catch (error) {
    console.error('[api/services/:id PATCH]', error)
    return err('Error interno del servidor', 500)
  }
}
