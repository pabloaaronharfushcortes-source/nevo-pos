import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import type { Database } from '@/types/database'

type RegisterUpdate = Database['public']['Tables']['cash_registers']['Update']

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json() as { closing_amount: number; notes?: string }

  if (typeof body.closing_amount !== 'number') {
    return NextResponse.json({ error: 'closing_amount requerido' }, { status: 400 })
  }

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
    return NextResponse.json({ error: 'Turno no encontrado o ya cerrado' }, { status: 404 })
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
