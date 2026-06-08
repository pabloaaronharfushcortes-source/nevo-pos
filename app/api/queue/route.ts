import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { err } from '@/lib/utils/api-response'
import { assignQueueTicket } from '@/lib/utils/queue'
import { queueQuerySchema, createTicketSchema } from '@/lib/validation/queue'
import { readJsonBody, searchParamsToObject } from '@/lib/validation'

const TICKET_SELECT = `
  id, tenant_id, client_id, barber_id, service_id,
  ticket_number, estimated_start_at, status, source, created_at,
  client:clients(id, name, phone),
  barber:barbers(id, name),
  service:services(id, name, duration_minutes)
`

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)

    const parsed = queueQuerySchema.safeParse(searchParamsToObject(request.url))
    if (!parsed.success) {
      return err('Datos inválidos', 400, parsed.error.flatten())
    }
    const date = parsed.data.date ?? new Date().toISOString().split('T')[0]

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('queue_tickets')
      .select(TICKET_SELECT)
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lt('created_at', `${date}T23:59:59.999Z`)
      .not('status', 'in', '("completed","cancelled")')
      .order('ticket_number')

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('[api/queue GET]', error)
    return err('Error interno del servidor', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)

    const parsed = createTicketSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      return err('Datos inválidos', 400, parsed.error.flatten())
    }
    const body = parsed.data

    const supabase = await createClient()

    let serviceDurationMinutes: number | undefined

    if (body.serviceId) {
      const { data: svc } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', body.serviceId)
        .single()

      if (svc) serviceDurationMinutes = svc.duration_minutes
    }

    const result = await assignQueueTicket(supabase, {
      tenantId: user.tenantId,
      serviceDurationMinutes,
      preferredBarberId: body.barberId,
      clientId: body.clientId,
      serviceId: body.serviceId,
      source: body.source ?? 'reception',
    })

    if ('error' in result) {
      return err(result.error, 422)
    }

    // Fetch with relations for the response
    const { data: ticket, error: fetchError } = await supabase
      .from('queue_tickets')
      .select(TICKET_SELECT)
      .eq('id', result.ticket.id)
      .single()

    if (fetchError) throw fetchError

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error('[api/queue POST]', error)
    return err('Error interno del servidor', 500)
  }
}
