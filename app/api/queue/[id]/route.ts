import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { err } from '@/lib/utils/api-response'
import { updateTicketSchema } from '@/lib/validation/queue'
import { readJsonBody } from '@/lib/validation'
import type { Database } from '@/types/database'

type TicketUpdate = Database['public']['Tables']['queue_tickets']['Update']

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)

    const parsed = updateTicketSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      return err('Datos inválidos', 400, parsed.error.flatten())
    }
    const update: TicketUpdate = { status: parsed.data.status }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('queue_tickets')
      .update(update)
      .eq('id', params.id)
      .select(`
        id, tenant_id, client_id, barber_id, service_id,
        ticket_number, estimated_start_at, status, source, created_at,
        client:clients(id, name, phone),
        barber:barbers(id, name),
        service:services(id, name, duration_minutes)
      `)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('[api/queue/[id] PATCH]', error)
    return err('Error interno del servidor', 500)
  }
}
