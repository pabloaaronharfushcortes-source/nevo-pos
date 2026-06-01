import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import type { Database } from '@/types/database'

type RegisterInsert = Database['public']['Tables']['cash_registers']['Insert']

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cash_registers')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .is('closed_at', null)
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json() as { opening_amount: number; notes?: string }

  if (typeof body.opening_amount !== 'number') {
    return NextResponse.json({ error: 'opening_amount requerido' }, { status: 400 })
  }

  const supabase = await createClient()

  const insert: RegisterInsert = {
    tenant_id: user.tenantId,
    cashier_id: user.id,
    opening_amount: body.opening_amount,
    notes: body.notes ?? null,
  }

  const { data, error } = await supabase
    .from('cash_registers')
    .insert(insert)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
