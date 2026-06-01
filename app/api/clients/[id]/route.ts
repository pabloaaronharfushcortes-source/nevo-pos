import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { computeClassification } from '@/lib/utils/clients'
import type { Database } from '@/types/database'
import type { VisitEntry } from '@/types/app'

type ClientUpdate = Database['public']['Tables']['clients']['Update']

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = await createClient()

  const [{ data: client }, { data: appointments }, { data: sales }] = await Promise.all([
    supabase
      .from('clients')
      .select(`
        *,
        preferred_barber:barbers(id, name)
      `)
      .eq('id', params.id)
      .eq('tenant_id', user.tenantId)
      .single(),

    supabase
      .from('appointments')
      .select(`
        id, starts_at, status,
        barber:barbers(name),
        service:services(name, price)
      `)
      .eq('client_id', params.id)
      .eq('tenant_id', user.tenantId)
      .in('status', ['completed', 'no_show', 'cancelled', 'confirmed', 'pending'])
      .order('starts_at', { ascending: false })
      .limit(20),

    supabase
      .from('sales')
      .select(`
        id, created_at, total, payment_method,
        barber:barbers(name),
        items:sale_items(name)
      `)
      .eq('client_id', params.id)
      .eq('tenant_id', user.tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!client) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  // Construir historial unificado
  const apptEntries: VisitEntry[] = (appointments ?? []).map(a => ({
    id: a.id,
    date: a.starts_at,
    type: 'appointment' as const,
    barber_name: (a.barber as { name: string } | null)?.name ?? null,
    services: [(a.service as { name: string } | null)?.name ?? '—'],
    total: (a.service as { price: number } | null)?.price ?? null,
    status: a.status,
    payment_method: null,
  }))

  const saleEntries: VisitEntry[] = (sales ?? []).map(s => ({
    id: s.id,
    date: s.created_at,
    type: 'sale' as const,
    barber_name: (s.barber as { name: string } | null)?.name ?? null,
    services: ((s.items as Array<{ name: string }>) ?? []).map(i => i.name),
    total: s.total,
    status: 'paid',
    payment_method: s.payment_method,
  }))

  const visit_history = [...apptEntries, ...saleEntries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30)

  return NextResponse.json({ ...client, visit_history })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json() as {
    name?: string
    phone?: string
    email?: string
    whatsapp_id?: string
    notes?: string
    preferred_barber_id?: string | null
    loyalty_stamps?: number
  }

  const supabase = await createClient()

  // Verificar que el cliente existe y pertenece al tenant
  const { data: existing } = await supabase
    .from('clients')
    .select('id, loyalty_stamps')
    .eq('id', params.id)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  const update: ClientUpdate = {}

  if (body.name !== undefined) update.name = body.name.trim()
  if (body.phone !== undefined) update.phone = body.phone.trim() || null
  if (body.email !== undefined) update.email = body.email.trim() || null
  if (body.whatsapp_id !== undefined) update.whatsapp_id = body.whatsapp_id.trim() || null
  if (body.notes !== undefined) update.notes = body.notes.trim() || null
  if ('preferred_barber_id' in body) update.preferred_barber_id = body.preferred_barber_id ?? null
  if (typeof body.loyalty_stamps === 'number') {
    update.loyalty_stamps = body.loyalty_stamps
    update.classification = computeClassification(body.loyalty_stamps)
  }

  const { data, error } = await supabase
    .from('clients')
    .update(update)
    .eq('id', params.id)
    .eq('tenant_id', user.tenantId)
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya existe un cliente con ese número de WhatsApp' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
