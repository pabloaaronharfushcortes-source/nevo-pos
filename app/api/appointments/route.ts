import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { appointmentsQuerySchema, createAppointmentSchema } from '@/lib/validation/appointments'
import { readJsonBody, searchParamsToObject } from '@/lib/validation'
import { err } from '@/lib/utils/api-response'

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
    if (!user) return err('No autorizado', 401)

    const parsed = appointmentsQuerySchema.safeParse(searchParamsToObject(request.url))
    if (!parsed.success) {
      return err('Datos inválidos', 400, parsed.error.flatten())
    }
    const { from, to } = parsed.data

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('appointments')
      .select(APPOINTMENT_SELECT)
      .gte('starts_at', from)
      .lte('starts_at', to)
      .order('starts_at')

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('[api/appointments GET]', error)
    return err('Error interno del servidor', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)

    const parsed = createAppointmentSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      return err('Datos inválidos', 400, parsed.error.flatten())
    }
    const { clientId, barberId, serviceId, startsAt, notes, bookedVia } = parsed.data

    const supabase = await createClient()

    const { data: service, error: svcError } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .single()

    if (svcError || !service) {
      return err('Servicio no encontrado', 404)
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
      return err('Conflicto de horario: el barbero ya tiene una cita en ese horario', 409)
    }

    // Bloqueos de horario del barbero (vacaciones/permisos) — Módulo 4.
    // Se omite de forma segura si la tabla aún no existe (migración pendiente).
    const { count: blocks, error: blockError } = await supabase
      .from('barber_time_off')
      .select('*', { count: 'exact', head: true })
      .eq('barber_id', barberId)
      .lt('starts_at', endsAt)
      .gt('ends_at', startsAt)

    if (blockError) {
      console.warn('[api/appointments POST] verificación de bloqueos omitida:', blockError.message)
    } else if (blocks && blocks > 0) {
      return err('El barbero tiene un bloqueo de horario en ese periodo', 409)
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

    // Guardia DURO de concurrencia: el verificador read-then-insert de arriba puede
    // dejar pasar varios requests simultáneos al mismo slot (race). El EXCLUDE
    // constraint a nivel de BD (appointments_no_overlap) garantiza que solo UNO gane;
    // los demás reciben una violación de exclusión (Postgres 23P01) que traducimos a
    // 409 — misma semántica que el conflicto detectado en la app.
    if (insertError) {
      if ((insertError as { code?: string }).code === '23P01') {
        return err('Conflicto de horario: el barbero ya tiene una cita en ese horario', 409)
      }
      throw insertError
    }

    return NextResponse.json(appointment, { status: 201 })
  } catch (error) {
    console.error('[api/appointments POST]', error)
    return err('Error interno del servidor', 500)
  }
}
