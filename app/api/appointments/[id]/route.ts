import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { err } from '@/lib/utils/api-response'
import { updateAppointmentSchema } from '@/lib/validation/appointments'
import { readJsonBody } from '@/lib/validation'
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
    if (!user) return err('No autorizado', 401)

    const parsed = updateAppointmentSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      return err('Datos inválidos', 400, parsed.error.flatten())
    }
    const body = parsed.data

    const supabase = await createClient()

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

    // ── Reagendado (drag-drop / resize): startsAt, barberId o serviceId ──
    const isReschedule =
      body.startsAt !== undefined ||
      body.barberId !== undefined ||
      body.serviceId !== undefined

    if (isReschedule) {
      // Cargar la cita actual para tomar los valores que no cambian
      const { data: current, error: currentError } = await supabase
        .from('appointments')
        .select('starts_at, barber_id, service_id')
        .eq('id', params.id)
        .single()

      if (currentError || !current) {
        return err('Cita no encontrada', 404)
      }

      const nextBarberId = body.barberId ?? current.barber_id
      const nextServiceId = body.serviceId ?? current.service_id
      const nextStartsAt = body.startsAt ?? current.starts_at

      // Duración a partir del servicio (puede haber cambiado)
      const { data: service, error: svcError } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', nextServiceId)
        .single()

      if (svcError || !service) {
        return err('Servicio no encontrado', 404)
      }

      const startsAtDate = new Date(nextStartsAt)
      const nextEndsAt = new Date(
        startsAtDate.getTime() + service.duration_minutes * 60_000
      ).toISOString()
      const nextStartsAtIso = startsAtDate.toISOString()

      // Verificación de conflictos (per CLAUDE.md §6) — excluye la propia cita
      const { count: conflicts, error: conflictError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('barber_id', nextBarberId)
        .neq('id', params.id)
        .neq('status', 'cancelled')
        .neq('status', 'no_show')
        .lt('starts_at', nextEndsAt)
        .gt('ends_at', nextStartsAtIso)

      if (conflictError) throw conflictError

      if (conflicts && conflicts > 0) {
        return err('Conflicto de horario: el barbero ya tiene una cita en ese horario', 409)
      }

      update.starts_at = nextStartsAtIso
      update.ends_at = nextEndsAt
      update.barber_id = nextBarberId
      update.service_id = nextServiceId
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(update)
      .eq('id', params.id)
      .select(APPOINTMENT_SELECT)
      .maybeSingle()

    // El EXCLUDE constraint (appointments_no_overlap) rechaza de forma atómica un
    // reagendado que solape otra cita del mismo barbero → 409, no 500.
    if (error) {
      if ((error as { code?: string }).code === '23P01') {
        return err('Conflicto de horario: el barbero ya tiene una cita en ese horario', 409)
      }
      throw error
    }
    // maybeSingle() devuelve null (sin error) cuando el id no existe → 404, no 500.
    if (!data) return err('Cita no encontrada', 404)

    return NextResponse.json(data)
  } catch (error) {
    console.error('[api/appointments/[id] PATCH]', error)
    return err('Error interno del servidor', 500)
  }
}
