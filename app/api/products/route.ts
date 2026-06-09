import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { ok, err } from '@/lib/utils/api-response'
import { readJsonBody } from '@/lib/validation'
import { createProductSchema } from '@/lib/validation/products'

const PRODUCT_COLS =
  'id, tenant_id, name, description, sku, price, cost, stock_quantity, stock_minimum, unit, is_active, created_at'

// GET /api/products — lista de productos del tenant.
// Disponible para cualquier usuario autenticado (el POS necesita el catálogo).
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_COLS)
      .order('name')

    if (error) throw error
    return ok(data ?? [])
  } catch (error) {
    console.error('[api/products GET]', error)
    return err('Error interno del servidor', 500)
  }
}

// POST /api/products — crear producto (solo admin)
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)
    if (user.role !== 'admin') return err('Acceso restringido', 403)

    const parsed = createProductSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) return err('Datos inválidos', 400, parsed.error.flatten())
    const body = parsed.data

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .insert({
        tenant_id: user.tenantId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        sku: body.sku?.trim() || null,
        price: body.price,
        cost: body.cost ?? null,
        stock_quantity: body.stock_quantity ?? 0,
        stock_minimum: body.stock_minimum ?? 5,
        unit: body.unit?.trim() || 'pieza',
      })
      .select(PRODUCT_COLS)
      .single()

    if (error) throw error
    return ok(data, 201)
  } catch (error) {
    console.error('[api/products POST]', error)
    return err('Error interno del servidor', 500)
  }
}
