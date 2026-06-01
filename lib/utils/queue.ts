import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Supabase = SupabaseClient<Database>

type FreeSlot = { start: Date; durationMinutes: number }

type BarberScheduleRow = {
  day_of_week: number
  start_time: string
  end_time: string
}

export type AssignResult =
  | { ticket: Database['public']['Tables']['queue_tickets']['Row'] }
  | { error: string }

function parseTime(timeStr: string, referenceDate: Date): Date {
  // handles both "HH:MM" and "HH:MM:SS"
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(referenceDate)
  d.setHours(h, m, 0, 0)
  return d
}

function isBarberWorking(
  schedules: BarberScheduleRow[],
  dateTime: Date
): { working: boolean; shiftEnd: Date | null } {
  const schedule = schedules.find(s => s.day_of_week === dateTime.getDay())
  if (!schedule) return { working: false, shiftEnd: null }

  const shiftStart = parseTime(schedule.start_time, dateTime)
  const shiftEnd = parseTime(schedule.end_time, dateTime)

  return {
    working: dateTime >= shiftStart && dateTime < shiftEnd,
    shiftEnd,
  }
}

async function getBarberFreeSlots(
  supabase: Supabase,
  barberId: string,
  tenantId: string,
  from: Date,
  to: Date,
  bufferMinutes: number
): Promise<FreeSlot[]> {
  const [{ data: appointments }, { data: tickets }] = await Promise.all([
    supabase
      .from('appointments')
      .select('starts_at, ends_at')
      .eq('barber_id', barberId)
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .neq('status', 'no_show')
      .lt('starts_at', to.toISOString())
      .gt('ends_at', from.toISOString()),

    supabase
      .from('queue_tickets')
      .select('estimated_start_at, service:services(duration_minutes)')
      .eq('barber_id', barberId)
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .neq('status', 'completed')
      .gte('estimated_start_at', from.toISOString())
      .lte('estimated_start_at', to.toISOString()),
  ])

  type OccupiedSlot = { start: Date; end: Date }
  const occupied: OccupiedSlot[] = []

  for (const appt of appointments ?? []) {
    occupied.push({
      start: new Date(appt.starts_at),
      end: new Date(new Date(appt.ends_at).getTime() + bufferMinutes * 60_000),
    })
  }

  for (const ticket of tickets ?? []) {
    const svc = ticket.service as { duration_minutes: number } | null
    const duration = svc?.duration_minutes ?? 45
    const start = new Date(ticket.estimated_start_at)
    occupied.push({
      start,
      end: new Date(start.getTime() + (duration + bufferMinutes) * 60_000),
    })
  }

  occupied.sort((a, b) => a.start.getTime() - b.start.getTime())

  const freeSlots: FreeSlot[] = []
  let cursor = from

  for (const slot of occupied) {
    if (slot.start > cursor) {
      freeSlots.push({
        start: cursor,
        durationMinutes: (slot.start.getTime() - cursor.getTime()) / 60_000,
      })
    }
    if (slot.end > cursor) cursor = slot.end
  }

  if (cursor < to) {
    freeSlots.push({
      start: cursor,
      durationMinutes: (to.getTime() - cursor.getTime()) / 60_000,
    })
  }

  return freeSlots
}

async function getNextTicketNumber(supabase: Supabase, tenantId: string): Promise<number> {
  // Usa fecha UTC para coincidir con el índice único: ((created_at AT TIME ZONE 'UTC')::date)
  const utcDate = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('queue_tickets')
    .select('ticket_number')
    .eq('tenant_id', tenantId)
    .gte('created_at', `${utcDate}T00:00:00.000Z`)
    .lt('created_at', `${utcDate}T23:59:59.999Z`)
    .order('ticket_number', { ascending: false })
    .limit(1)

  return ((data?.[0]?.ticket_number) ?? 0) + 1
}

export async function assignQueueTicket(
  supabase: Supabase,
  params: {
    tenantId: string
    serviceDurationMinutes?: number
    preferredBarberId?: string
    clientId?: string
    serviceId?: string
    source?: string
  }
): Promise<AssignResult> {
  const {
    tenantId,
    serviceDurationMinutes = 45,
    preferredBarberId,
    clientId,
    serviceId,
    source = 'reception',
  } = params

  const { data: tenant } = await supabase
    .from('tenants')
    .select('appointment_buffer_minutes')
    .eq('id', tenantId)
    .single()

  const bufferMinutes = tenant?.appointment_buffer_minutes ?? 5

  const now = new Date()
  const lookAheadEnd = new Date(now.getTime() + 4 * 60 * 60_000)

  let barberIds: string[]

  if (preferredBarberId) {
    barberIds = [preferredBarberId]
  } else {
    const { data: barbers } = await supabase
      .from('barbers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('sort_order')

    barberIds = (barbers ?? []).map(b => b.id)
  }

  if (barberIds.length === 0) {
    return { error: 'No hay barberos activos disponibles' }
  }

  type Candidate = { barberId: string; startTime: Date }
  const candidateResults = await Promise.all(
    barberIds.map(async (barberId): Promise<Candidate | null> => {
      const [{ data: schedules }, freeSlots] = await Promise.all([
        supabase
          .from('barber_schedules')
          .select('day_of_week, start_time, end_time')
          .eq('barber_id', barberId),
        getBarberFreeSlots(supabase, barberId, tenantId, now, lookAheadEnd, bufferMinutes),
      ])

      for (const slot of freeSlots) {
        if (slot.durationMinutes < serviceDurationMinutes) continue

        const { working, shiftEnd } = isBarberWorking(schedules ?? [], slot.start)
        if (!working || !shiftEnd) continue

        const slotEnd = new Date(slot.start.getTime() + serviceDurationMinutes * 60_000)
        if (slotEnd > shiftEnd) continue

        return { barberId, startTime: slot.start }
      }

      return null
    })
  )

  const candidates = candidateResults.filter((c): c is Candidate => c !== null)

  if (candidates.length === 0) {
    return { error: 'Sin disponibilidad en las próximas 4 horas' }
  }

  const best = candidates.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0]

  const ticketNumber = await getNextTicketNumber(supabase, tenantId)

  const { data: ticket, error: insertError } = await supabase
    .from('queue_tickets')
    .insert({
      tenant_id: tenantId,
      client_id: clientId ?? null,
      barber_id: best.barberId,
      service_id: serviceId ?? null,
      ticket_number: ticketNumber,
      estimated_start_at: best.startTime.toISOString(),
      status: 'waiting',
      source,
    })
    .select()
    .single()

  if (insertError || !ticket) {
    console.error('[assignQueueTicket] Insert error:', insertError)
    return { error: 'Error al crear el ticket' }
  }

  return { ticket }
}
