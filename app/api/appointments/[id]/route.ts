import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import type { Database } from '@/types/database'

type AppointmentUpdate = Database['public']['Tables']['appointments']['Update']

const APPOINTMENT_SELECT = `
  id, tenant_id, client_id, barber_id, service_id,
  starts_at, ends_at, status, notes, booked_via, created_at,
  cancelled_at, cancellation_reason,
  client:clients(id, name, phone),
  barber:barbers(id, name),
  service:services(id, name, duration_minutes, price)
`

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json() as {
      status?: string
      notes?: string
      cancellationReason?: string
    }

    const update: AppointmentUpdate = {}

    if (body.status !== undefined) {
      update.status = body.status
      if (body.status === 'cancelled') {
        update.cancelled_at = new Date().toISOString()
      }
    }
    if ('notes' in body) update.notes = body.notes ?? null
    if (body.cancellationReason !== undefined) {
      update.cancellation_reason = body.cancellationReason
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('appointments')
      .update(update)
      .eq('id', params.id)
      .select(APPOINTMENT_SELECT)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    console.error('[api/appointments/[id] PATCH]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
