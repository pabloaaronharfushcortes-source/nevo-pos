import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import type { Database } from '@/types/database'

type ClientInsert = Database['public']['Tables']['clients']['Insert']

const VALID_CLASSIFICATIONS = ['new', 'recurrent', 'vip'] as const

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const classification = searchParams.get('classification') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = 40
  const offset = (page - 1) * limit

  const supabase = await createClient()

  let query = supabase
    .from('clients')
    .select(
      'id, name, phone, email, whatsapp_id, classification, loyalty_stamps, last_visit_at, total_spent, preferred_barber_id',
      { count: 'exact' }
    )
    .eq('tenant_id', user.tenantId)
    .order('name')
    .range(offset, offset + limit - 1)

  if (search.trim().length >= 2) {
    // Búsqueda por nombre o teléfono
    query = query.or(
      `name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`
    )
  }

  if (VALID_CLASSIFICATIONS.includes(classification as (typeof VALID_CLASSIFICATIONS)[number])) {
    query = query.eq('classification', classification)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ clients: data ?? [], total: count ?? 0, page, limit })
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json() as {
    name?: string
    phone?: string
    email?: string
    whatsapp_id?: string
    notes?: string
    preferred_barber_id?: string
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  }

  const supabase = await createClient()

  const insert: ClientInsert = {
    tenant_id: user.tenantId,
    name: body.name.trim(),
    phone: body.phone?.trim() || null,
    email: body.email?.trim() || null,
    whatsapp_id: body.whatsapp_id?.trim() || null,
    notes: body.notes?.trim() || null,
    preferred_barber_id: body.preferred_barber_id || null,
  }

  const { data, error } = await supabase
    .from('clients')
    .insert(insert)
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ya existe un cliente con ese número de WhatsApp' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
