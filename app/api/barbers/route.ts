import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { ok, err } from '@/lib/utils/api-response'
import { readJsonBody } from '@/lib/validation'
import { createBarberSchema } from '@/lib/validation/settings'

const BARBER_COLS =
  'id, tenant_id, user_id, name, photo_url, commission_rate, is_active, sort_order, created_at'

// GET /api/barbers — lista de barberos del tenant (incluye inactivos para administración)
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)
    if (user.role !== 'admin') return err('Acceso restringido', 403)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('barbers')
      .select(BARBER_COLS)
      .order('sort_order')

    if (error) throw error
    return ok(data ?? [])
  } catch (error) {
    console.error('[api/barbers GET]', error)
    return err('Error interno del servidor', 500)
  }
}

// POST /api/barbers — crear barbero
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)
    if (user.role !== 'admin') return err('Acceso restringido', 403)

    const parsed = createBarberSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) return err('Datos inválidos', 400, parsed.error.flatten())
    const body = parsed.data

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('barbers')
      .insert({
        tenant_id: user.tenantId,
        name: body.name.trim(),
        commission_rate: body.commission_rate,
        photo_url: body.photo_url?.trim() || null,
      })
      .select(BARBER_COLS)
      .single()

    if (error) throw error
    return ok(data, 201)
  } catch (error) {
    console.error('[api/barbers POST]', error)
    return err('Error interno del servidor', 500)
  }
}
