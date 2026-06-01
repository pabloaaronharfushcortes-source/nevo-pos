import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { getCurrentQuincena, computeCommission } from '@/lib/utils/commissions'
import { updateClientAfterSale } from '@/lib/utils/clients'
import type { Database } from '@/types/database'

type SaleInsert = Database['public']['Tables']['sales']['Insert']
type SaleItemInsert = Database['public']['Tables']['sale_items']['Insert']
type CommissionInsert = Database['public']['Tables']['commissions']['Insert']

const SALE_SELECT = `
  id, tenant_id, appointment_id, queue_ticket_id, client_id, barber_id, cashier_id,
  cash_register_id, subtotal, discount, total, payment_method, payment_reference,
  notes, created_at, deleted_at,
  client:clients(id, name),
  barber:barbers(id, name),
  cashier:users(id, name),
  items:sale_items(id, type, name, price, quantity, subtotal, service_id)
` as const

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('sales')
    .select(SALE_SELECT)
    .eq('tenant_id', user.tenantId)
    .is('deleted_at', null)
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lt('created_at', `${today}T23:59:59.999Z`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

type IncomingItem = {
  serviceId?: string
  name: string
  price: number
  quantity: number
}

type PostBody = {
  barberId: string
  items: IncomingItem[]
  discount?: number
  paymentMethod: string
  paymentReference?: string
  notes?: string
  clientId?: string
  queueTicketId?: string
  appointmentId?: string
  cashRegisterId?: string
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json() as PostBody
  const {
    barberId,
    items,
    discount = 0,
    paymentMethod,
    paymentReference,
    notes,
    clientId,
    queueTicketId,
    appointmentId,
    cashRegisterId,
  } = body

  if (!barberId || !items?.length || !paymentMethod) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: barber } = await supabase
    .from('barbers')
    .select('id, commission_rate')
    .eq('id', barberId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!barber) return NextResponse.json({ error: 'Barbero no encontrado' }, { status: 404 })

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100)

  const saleInsert: SaleInsert = {
    tenant_id: user.tenantId,
    barber_id: barberId,
    cashier_id: user.id,
    client_id: clientId ?? null,
    appointment_id: appointmentId ?? null,
    queue_ticket_id: queueTicketId ?? null,
    cash_register_id: cashRegisterId ?? null,
    subtotal,
    discount,
    total,
    payment_method: paymentMethod,
    payment_reference: paymentReference ?? null,
    notes: notes ?? null,
  }

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert(saleInsert)
    .select('id')
    .single()

  if (saleError || !sale) {
    return NextResponse.json(
      { error: saleError?.message ?? 'Error al crear venta' },
      { status: 500 }
    )
  }

  const saleItemsInsert: SaleItemInsert[] = items.map(item => ({
    sale_id: sale.id,
    type: 'service',
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    subtotal: Math.round(item.price * item.quantity * 100) / 100,
    service_id: item.serviceId ?? null,
  }))

  const { error: itemsError } = await supabase.from('sale_items').insert(saleItemsInsert)
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  const quincena = getCurrentQuincena()
  const commissionInsert: CommissionInsert = {
    tenant_id: user.tenantId,
    barber_id: barberId,
    sale_id: sale.id,
    amount: computeCommission(total, barber.commission_rate),
    rate: barber.commission_rate,
    period_start: quincena.period_start,
    period_end: quincena.period_end,
  }
  // No es fatal si falla — la venta ya se creó
  await supabase.from('commissions').insert(commissionInsert)

  // Actualizar estadísticas del cliente (stamps, total_spent, clasificación)
  if (clientId) {
    await updateClientAfterSale(supabase, clientId, total)
  }

  // Marcar ticket/cita como completado
  if (queueTicketId) {
    await supabase
      .from('queue_tickets')
      .update({ status: 'completed' })
      .eq('id', queueTicketId)
      .eq('tenant_id', user.tenantId)
  }

  if (appointmentId) {
    await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointmentId)
      .eq('tenant_id', user.tenantId)
  }

  const { data: fullSale, error: fetchError } = await supabase
    .from('sales')
    .select(SALE_SELECT)
    .eq('id', sale.id)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  return NextResponse.json(fullSale, { status: 201 })
}
