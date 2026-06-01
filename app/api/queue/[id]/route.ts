import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import type { Database } from '@/types/database'

type TicketUpdate = Database['public']['Tables']['queue_tickets']['Update']

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json() as { status?: string }

    if (!body.status) {
      return NextResponse.json({ error: 'Campo status requerido' }, { status: 400 })
    }

    const update: TicketUpdate = { status: body.status }

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
  } catch (err) {
    console.error('[api/queue/[id] PATCH]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
