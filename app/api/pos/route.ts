import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { getCurrentQuincena, computeCommission } from '@/lib/utils/commissions'
import { updateClientAfterSale } from '@/lib/utils/clients'
import { createSaleSchema } from '@/lib/validation/pos'
import { readJsonBody } from '@/lib/validation'
import { err } from '@/lib/utils/api-response'
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
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)

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

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('[api/pos GET]', error)
    return err('Error interno del servidor', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)

    const parsed = createSaleSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      return err('Datos inválidos', 400, parsed.error.flatten())
    }
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
  } = parsed.data

  const supabase = await createClient()

  const { data: barber } = await supabase
    .from('barbers')
    .select('id, commission_rate')
    .eq('id', barberId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!barber) return err('Barbero no encontrado', 404)

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
    throw saleError ?? new Error('No se pudo crear la venta')
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
  if (itemsError) throw itemsError

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

  if (fetchError) throw fetchError

    return NextResponse.json(fullSale, { status: 201 })
  } catch (error) {
    console.error('[api/pos POST]', error)
    return err('Error interno del servidor', 500)
  }
}
