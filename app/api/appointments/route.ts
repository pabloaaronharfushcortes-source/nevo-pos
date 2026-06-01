import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'

const APPOINTMENT_SELECT = `
  id, tenant_id, client_id, barber_id, service_id,
  starts_at, ends_at, status, notes, booked_via, created_at,
  cancelled_at, cancellation_reason,
  client:clients(id, name, phone),
  barber:barbers(id, name),
  service:services(id, name, duration_minutes, price)
`

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json({ error: 'Parámetros from y to requeridos' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('appointments')
      .select(APPOINTMENT_SELECT)
      .gte('starts_at', from)
      .lte('starts_at', to)
      .order('starts_at')

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    console.error('[api/appointments GET]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json() as {
      clientId?: string
      barberId?: string
      serviceId?: string
      startsAt?: string
      notes?: string
      bookedVia?: string
    }

    const { clientId, barberId, serviceId, startsAt, notes, bookedVia } = body

    if (!clientId || !barberId || !serviceId || !startsAt) {
      return NextResponse.json(
        { error: 'Campos requeridos: clientId, barberId, serviceId, startsAt' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: service, error: svcError } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .single()

    if (svcError || !service) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })
    }

    const startsAtDate = new Date(startsAt)
    const endsAt = new Date(startsAtDate.getTime() + service.duration_minutes * 60_000).toISOString()

    // Verificación de conflictos de agenda (per CLAUDE.md §6)
    const { count: conflicts, error: conflictError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('barber_id', barberId)
      .neq('status', 'cancelled')
      .neq('status', 'no_show')
      .lt('starts_at', endsAt)
      .gt('ends_at', startsAt)

    if (conflictError) throw conflictError

    if (conflicts && conflicts > 0) {
      return NextResponse.json(
        { error: 'Conflicto de horario: el barbero ya tiene una cita en ese horario' },
        { status: 409 }
      )
    }

    const { data: appointment, error: insertError } = await supabase
      .from('appointments')
      .insert({
        tenant_id: user.tenantId,
        client_id: clientId,
        barber_id: barberId,
        service_id: serviceId,
        starts_at: startsAt,
        ends_at: endsAt,
        notes: notes ?? null,
        booked_via: bookedVia ?? 'reception',
        status: 'pending',
      })
      .select(APPOINTMENT_SELECT)
      .single()

    if (insertError) throw insertError

    return NextResponse.json(appointment, { status: 201 })
  } catch (err) {
    console.error('[api/appointments POST]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
