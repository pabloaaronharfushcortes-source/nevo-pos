import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { ok, err } from '@/lib/utils/api-response'
import { reportsQuerySchema } from '@/lib/validation/reports'
import { searchParamsToObject } from '@/lib/validation'

// Resumen de ventas y comisiones para un rango de fechas.
// Solo admin — reportes son módulo restringido (CLAUDE.md §3).
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)
    if (user.role !== 'admin') return err('Acceso restringido', 403)

    const parsed = reportsQuerySchema.safeParse(searchParamsToObject(request.url))
    if (!parsed.success) {
      return err('Datos inválidos', 400, parsed.error.flatten())
    }
    const { from, to } = parsed.data

    const fromIso = `${from}T00:00:00.000Z`
    const toIso = `${to}T23:59:59.999Z`

    const supabase = await createClient()

    // Ventas del periodo (RLS filtra por tenant). Soft delete excluido.
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('id, total, subtotal, discount, payment_method, barber_id, created_at, barber:barbers(id, name)')
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
      .is('deleted_at', null)

    if (salesError) throw salesError

    const rows = sales ?? []

    // Totales generales
    const totalRevenue = rows.reduce((acc, s) => acc + Number(s.total), 0)
    const totalDiscount = rows.reduce((acc, s) => acc + Number(s.discount), 0)
    const saleCount = rows.length
    const averageTicket = saleCount > 0 ? totalRevenue / saleCount : 0

    // Desglose por método de pago
    const byPaymentMethod: Record<string, { count: number; total: number }> = {}
    for (const s of rows) {
      const key = s.payment_method
      if (!byPaymentMethod[key]) byPaymentMethod[key] = { count: 0, total: 0 }
      byPaymentMethod[key].count += 1
      byPaymentMethod[key].total += Number(s.total)
    }

    // Comisiones del periodo, agrupadas por barbero
    const { data: commissions, error: commError } = await supabase
      .from('commissions')
      .select('amount, barber_id, status, barber:barbers(id, name)')
      .gte('period_start', from)
      .lte('period_end', to)

    if (commError) throw commError

    const byBarber: Record<
      string,
      { barberId: string; name: string; salesTotal: number; salesCount: number; commission: number }
    > = {}

    for (const s of rows) {
      const b = (s.barber as { id: string; name: string } | null)
      const id = s.barber_id
      if (!byBarber[id]) {
        byBarber[id] = { barberId: id, name: b?.name ?? '—', salesTotal: 0, salesCount: 0, commission: 0 }
      }
      byBarber[id].salesTotal += Number(s.total)
      byBarber[id].salesCount += 1
    }

    for (const c of commissions ?? []) {
      const b = (c.barber as { id: string; name: string } | null)
      const id = c.barber_id
      if (!byBarber[id]) {
        byBarber[id] = { barberId: id, name: b?.name ?? '—', salesTotal: 0, salesCount: 0, commission: 0 }
      }
      byBarber[id].commission += Number(c.amount)
    }

    const totalCommissions = (commissions ?? []).reduce((acc, c) => acc + Number(c.amount), 0)

    return ok({
      period: { from, to },
      summary: {
        totalRevenue,
        totalDiscount,
        saleCount,
        averageTicket,
        totalCommissions,
        netRevenue: totalRevenue - totalCommissions,
      },
      byPaymentMethod,
      byBarber: Object.values(byBarber).sort((a, b) => b.salesTotal - a.salesTotal),
    })
  } catch (error) {
    console.error('[api/reports GET]', error)
    return err('Error interno del servidor', 500)
  }
}
