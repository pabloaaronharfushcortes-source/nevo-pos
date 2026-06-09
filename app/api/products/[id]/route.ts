import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { ok, err } from '@/lib/utils/api-response'
import { readJsonBody, idParamSchema } from '@/lib/validation'
import { updateProductSchema } from '@/lib/validation/products'

const PRODUCT_COLS =
  'id, tenant_id, name, description, sku, price, cost, stock_quantity, stock_minimum, unit, is_active, created_at'

type Params = { params: { id: string } }

// PATCH /api/products/:id — actualizar producto (incluye desactivar con is_active=false
// y ajustar stock). Solo admin.
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)
    if (user.role !== 'admin') return err('Acceso restringido', 403)

    const parsedParams = idParamSchema.safeParse(params)
    if (!parsedParams.success) return err('ID inválido', 400)

    const parsed = updateProductSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) return err('Datos inválidos', 400, parsed.error.flatten())

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .update(parsed.data)
      .eq('id', parsedParams.data.id)
      .select(PRODUCT_COLS)
      .single()

    if (error) throw error
    return ok(data)
  } catch (error) {
    console.error('[api/products/:id PATCH]', error)
    return err('Error interno del servidor', 500)
  }
}
