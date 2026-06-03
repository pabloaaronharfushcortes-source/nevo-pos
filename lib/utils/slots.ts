import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Supabase = SupabaseClient<Database>

// Bloque libre de un barbero dentro de su turno
export type AgendaSlot = { start: Date; end: Date }

// Disponibilidad de un barbero para mostrar al agente de WhatsApp
export type BarberAvailability = {
  barberId: string
  barberName: string
  slots: AgendaSlot[]
}

type ScheduleRow = { day_of_week: number; start_time: string; end_time: string }
type Occupied = { start: number; end: number }  // epoch ms

function parseTime(timeStr: string, reference: Date): Date {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(reference)
  d.setHours(h, m, 0, 0)
  return d
}

// Calcula los bloques libres de un barbero entre `from` y `to`, recortados a su
// turno por día y descontando citas/tickets ocupados más el buffer del tenant.
// Solo devuelve bloques que alcancen al menos `minDurationMinutes`.
function computeFreeSlots(
  schedules: ScheduleRow[],
  occupied: Occupied[],
  from: Date,
  to: Date,
  bufferMinutes: number,
  minDurationMinutes: number
): AgendaSlot[] {
  const result: AgendaSlot[] = []
  occupied.sort((a, b) => a.start - b.start)

  // Iterar día por día dentro del rango
  const dayCursor = new Date(from)
  dayCursor.setHours(0, 0, 0, 0)

  while (dayCursor <= to) {
    const schedule = schedules.find(s => s.day_of_week === dayCursor.getDay())
    if (schedule) {
      const shiftStart = parseTime(schedule.start_time, dayCursor)
      const shiftEnd = parseTime(schedule.end_time, dayCursor)

      // Recortar el turno al rango [from, to] solicitado
      let cursor = Math.max(shiftStart.getTime(), from.getTime())
      const end = Math.min(shiftEnd.getTime(), to.getTime())

      for (const occ of occupied) {
        if (occ.end <= cursor) continue
        if (occ.start >= end) break
        const occStart = occ.start - bufferMinutes * 60_000
        if (occStart > cursor) {
          const gap = (occStart - cursor) / 60_000
          if (gap >= minDurationMinutes) result.push({ start: new Date(cursor), end: new Date(occStart) })
        }
        cursor = Math.max(cursor, occ.end + bufferMinutes * 60_000)
      }

      if (end > cursor && (end - cursor) / 60_000 >= minDurationMinutes) {
        result.push({ start: new Date(cursor), end: new Date(end) })
      }
    }

    dayCursor.setDate(dayCursor.getDate() + 1)
  }

  return result
}

// Disponibilidad de todos los barberos activos del tenant en las próximas `hours`.
// Usada por el agente de WhatsApp para proponer horarios al cliente.
export async function getAgendaAvailability(
  supabase: Supabase,
  tenantId: string,
  options: { hours?: number; minDurationMinutes?: number } = {}
): Promise<BarberAvailability[]> {
  const { hours = 48, minDurationMinutes = 30 } = options

  const { data: tenant } = await supabase
    .from('tenants')
    .select('appointment_buffer_minutes')
    .eq('id', tenantId)
    .single()
  const bufferMinutes = tenant?.appointment_buffer_minutes ?? 5

  const { data: barbers } = await supabase
    .from('barbers')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('sort_order')

  if (!barbers || barbers.length === 0) return []

  const from = new Date()
  const to = new Date(from.getTime() + hours * 60 * 60_000)

  return Promise.all(
    barbers.map(async (barber): Promise<BarberAvailability> => {
      const [{ data: schedules }, { data: appts }, { data: tickets }] = await Promise.all([
        supabase
          .from('barber_schedules')
          .select('day_of_week, start_time, end_time')
          .eq('barber_id', barber.id),
        supabase
          .from('appointments')
          .select('starts_at, ends_at')
          .eq('barber_id', barber.id)
          .eq('tenant_id', tenantId)
          .neq('status', 'cancelled')
          .neq('status', 'no_show')
          .lt('starts_at', to.toISOString())
          .gt('ends_at', from.toISOString()),
        supabase
          .from('queue_tickets')
          .select('estimated_start_at, service:services(duration_minutes)')
          .eq('barber_id', barber.id)
          .eq('tenant_id', tenantId)
          .neq('status', 'cancelled')
          .neq('status', 'completed')
          .gte('estimated_start_at', from.toISOString())
          .lte('estimated_start_at', to.toISOString()),
      ])

      const occupied: Occupied[] = []
      for (const a of appts ?? []) {
        occupied.push({ start: new Date(a.starts_at).getTime(), end: new Date(a.ends_at).getTime() })
      }
      for (const t of tickets ?? []) {
        const svc = t.service as { duration_minutes: number } | null
        const dur = svc?.duration_minutes ?? 45
        const start = new Date(t.estimated_start_at).getTime()
        occupied.push({ start, end: start + dur * 60_000 })
      }

      const slots = computeFreeSlots(
        schedules ?? [],
        occupied,
        from,
        to,
        bufferMinutes,
        minDurationMinutes
      )

      return { barberId: barber.id, barberName: barber.name, slots }
    })
  )
}
