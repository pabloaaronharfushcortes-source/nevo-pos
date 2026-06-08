import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { closeRegisterSchema } from '@/lib/validation/pos'
import { readJsonBody } from '@/lib/validation'
import { err } from '@/lib/utils/api-response'
import type { Database } from '@/types/database'

type RegisterUpdate = Database['public']['Tables']['cash_registers']['Update']

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)

    const parsed = closeRegisterSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      return err('Datos inválidos', 400, parsed.error.flatten())
    }
    const body = parsed.data

    const supabase = await createClient()

    // Obtener el registro y su hora de apertura para calcular ventas en efectivo
    const { data: register } = await supabase
      .from('cash_registers')
      .select('id, opening_amount, opened_at')
      .eq('id', params.id)
      .eq('tenant_id', user.tenantId)
      .is('closed_at', null)
      .single()

    if (!register) {
      return err('Turno no encontrado o ya cerrado', 404)
    }

    // Sumar ventas en efectivo durante este turno
    const { data: cashSales } = await supabase
      .from('sales')
      .select('total')
      .eq('tenant_id', user.tenantId)
      .eq('payment_method', 'cash')
      .is('deleted_at', null)
      .gte('created_at', register.opened_at)

    const cashSum = (cashSales ?? []).reduce((sum, s) => sum + s.total, 0)

    const expectedAmount = Math.round((register.opening_amount + cashSum) * 100) / 100
    const difference = Math.round((body.closing_amount - expectedAmount) * 100) / 100

    const update: RegisterUpdate = {
      closed_at: new Date().toISOString(),
      closing_amount: body.closing_amount,
      expected_amount: expectedAmount,
      difference,
      notes: body.notes ?? null,
    }

    const { data, error } = await supabase
      .from('cash_registers')
      .update(update)
      .eq('id', params.id)
      .eq('tenant_id', user.tenantId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('[api/pos/cash-register/[id] PATCH]', error)
    return err('Error interno del servidor', 500)
  }
}
