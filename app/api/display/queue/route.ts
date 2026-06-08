import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { err } from '@/lib/utils/api-response'
import type { DisplayTicket } from '@/types/app'
import { z } from 'zod'
import { searchParamsToObject } from '@/lib/validation'

const displayQuerySchema = z.object({
  tenant: z.string().min(1, 'Parámetro tenant requerido'),
})

export async function GET(request: NextRequest) {
  const parsed = displayQuerySchema.safeParse(searchParamsToObject(request.url))
  if (!parsed.success) return err('Parámetro tenant requerido', 400)
  const { tenant: tenantSlug } = parsed.data


  try {
    const supabase = createServiceClient()

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .eq('is_active', true)
      .single()

    if (!tenant) {
      return err('Tenant no encontrado', 404)
    }

    const { data: tickets, error } = await supabase
      .from('queue_tickets')
      .select(`
        id, ticket_number, status, estimated_start_at,
        client:clients(name),
        barber:barbers(name)
      `)
      .eq('tenant_id', tenant.id)
      .in('status', ['waiting', 'called'])
      .order('ticket_number')

    if (error) throw error

    const displayTickets: DisplayTicket[] = (tickets ?? []).map(t => ({
      id: t.id,
      ticket_number: t.ticket_number,
      status: t.status,
      estimated_start_at: t.estimated_start_at,
      client_first_name: ((t.client as { name: string } | null)?.name ?? 'Sin nombre').split(' ')[0],
      barber_name: (t.barber as { name: string } | null)?.name ?? '—',
    }))

    return NextResponse.json(displayTickets)
  } catch (error) {
    console.error('[api/display/queue]', error)
    return err('Error interno del servidor', 500)
  }
}
