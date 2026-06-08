import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { ok, err } from '@/lib/utils/api-response'
import { readJsonBody } from '@/lib/validation'
import { updateTenantSchema } from '@/lib/validation/settings'

const TENANT_COLS =
  'id, name, slug, address, phone, email, website, logo_url, timezone, late_tolerance_minutes, appointment_buffer_minutes, agent_knowledge_base'

// GET /api/settings — datos del negocio del tenant actual
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)
    if (user.role !== 'admin') return err('Acceso restringido', 403)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tenants')
      .select(TENANT_COLS)
      .eq('id', user.tenantId)
      .single()

    if (error) throw error
    return ok(data)
  } catch (error) {
    console.error('[api/settings GET]', error)
    return err('Error interno del servidor', 500)
  }
}

// PATCH /api/settings — actualizar datos del negocio
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)
    if (user.role !== 'admin') return err('Acceso restringido', 403)

    const parsed = updateTenantSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) return err('Datos inválidos', 400, parsed.error.flatten())

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tenants')
      .update(parsed.data)
      .eq('id', user.tenantId)
      .select(TENANT_COLS)
      .single()

    if (error) throw error
    return ok(data)
  } catch (error) {
    console.error('[api/settings PATCH]', error)
    return err('Error interno del servidor', 500)
  }
}
