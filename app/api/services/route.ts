import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { ok, err } from '@/lib/utils/api-response'
import { readJsonBody } from '@/lib/validation'
import { createServiceSchema } from '@/lib/validation/settings'

const SERVICE_COLS =
  'id, tenant_id, name, description, price, duration_minutes, category, is_active, sort_order, created_at'

// GET /api/services — lista de servicios del tenant (incluye inactivos para administración)
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)
    if (user.role !== 'admin') return err('Acceso restringido', 403)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('services')
      .select(SERVICE_COLS)
      .order('sort_order')

    if (error) throw error
    return ok(data ?? [])
  } catch (error) {
    console.error('[api/services GET]', error)
    return err('Error interno del servidor', 500)
  }
}

// POST /api/services — crear servicio
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)
    if (user.role !== 'admin') return err('Acceso restringido', 403)

    const parsed = createServiceSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) return err('Datos inválidos', 400, parsed.error.flatten())
    const body = parsed.data

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('services')
      .insert({
        tenant_id: user.tenantId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        price: body.price,
        duration_minutes: body.duration_minutes,
        category: body.category?.trim() || null,
      })
      .select(SERVICE_COLS)
      .single()

    if (error) throw error
    return ok(data, 201)
  } catch (error) {
    console.error('[api/services POST]', error)
    return err('Error interno del servidor', 500)
  }
}
