import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { openRegisterSchema } from '@/lib/validation/pos'
import { readJsonBody } from '@/lib/validation'
import { err } from '@/lib/utils/api-response'
import type { Database } from '@/types/database'

type RegisterInsert = Database['public']['Tables']['cash_registers']['Insert']

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('tenant_id', user.tenantId)
      .is('closed_at', null)
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('[api/pos/cash-register GET]', error)
    return err('Error interno del servidor', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)

    const parsed = openRegisterSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      return err('Datos inválidos', 400, parsed.error.flatten())
    }
    const body = parsed.data

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

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[api/pos/cash-register POST]', error)
    return err('Error interno del servidor', 500)
  }
}
