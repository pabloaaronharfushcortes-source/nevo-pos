'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, DateSelectArg, DatesSetArg, EventInput } from '@fullcalendar/core'
import esLocale from '@fullcalendar/core/locales/es'
import type { Barber, Service, AppointmentWithRelations } from '@/types/app'
import AppointmentModal from './AppointmentModal'
import { ErrorState } from '@/components/ui/ErrorState'

type ModalState =
  | { mode: 'closed' }
  | { mode: 'create'; start: Date; barberId?: string }
  | { mode: 'edit'; appointment: AppointmentWithRelations }

const BARBER_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B',
  '#EF4444', '#06B6D4', '#EC4899', '#84CC16',
]

const STATUS_OPAQUE = new Set(['cancelled', 'no_show'])

function toCalendarEvent(appt: AppointmentWithRelations, barbers: Barber[]): EventInput {
  const idx = barbers.findIndex(b => b.id === appt.barber?.id)
  const color = idx >= 0 ? BARBER_COLORS[idx % BARBER_COLORS.length] : '#6B7280'
  const faded = STATUS_OPAQUE.has(appt.status)

  return {
    id: appt.id,
    title: `${appt.client?.name ?? 'Sin cliente'} — ${appt.service?.name ?? ''}`,
    start: appt.starts_at,
    end: appt.ends_at,
    backgroundColor: faded ? '#D1D5DB' : color,
    borderColor: faded ? '#9CA3AF' : color,
    textColor: faded ? '#6B7280' : '#FFFFFF',
    classNames: [appt.status],
    extendedProps: { appointment: appt },
  }
}

export default function CalendarView({
  barbers,
  services,
}: {
  barbers: Barber[]
  services: Service[]
}) {
  const calendarRef = useRef<FullCalendar>(null)
  const currentRangeRef = useRef<{ from: string; to: string } | null>(null)

  const [allAppointments, setAllAppointments] = useState<AppointmentWithRelations[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [filterBarberId, setFilterBarberId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })

  const fetchAppointments = useCallback(async (from: string, to: string) => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: AppointmentWithRelations[] = await res.json()
      setAllAppointments(data)
    } catch (err) {
      console.error('[CalendarView] Error al cargar citas:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const retry = useCallback(() => {
    if (currentRangeRef.current) {
      fetchAppointments(currentRangeRef.current.from, currentRangeRef.current.to)
    }
  }, [fetchAppointments])

  const handleDatesSet = useCallback((info: DatesSetArg) => {
    currentRangeRef.current = { from: info.startStr, to: info.endStr }
    fetchAppointments(info.startStr, info.endStr)
  }, [fetchAppointments])

  const handleEventClick = useCallback((info: EventClickArg) => {
    const appointment = info.event.extendedProps.appointment as AppointmentWithRelations
    setModal({ mode: 'edit', appointment })
  }, [])

  const handleDateSelect = useCallback((info: DateSelectArg) => {
    setModal({ mode: 'create', start: info.start })
    calendarRef.current?.getApi().unselect()
  }, [])

  const handleModalSaved = useCallback(() => {
    setModal({ mode: 'closed' })
    if (currentRangeRef.current) {
      fetchAppointments(currentRangeRef.current.from, currentRangeRef.current.to)
    }
  }, [fetchAppointments])

  const handleModalClose = useCallback(() => {
    setModal({ mode: 'closed' })
  }, [])

  const events = useMemo<EventInput[]>(() => {
    const filtered = filterBarberId
      ? allAppointments.filter(a => a.barber?.id === filterBarberId)
      : allAppointments
    return filtered.map(a => toCalendarEvent(a, barbers))
  }, [allAppointments, filterBarberId, barbers])

  return (
    <div className="flex flex-col h-full">
      {/* Barra de filtros */}
      <div className="flex items-center gap-2 px-6 py-3 bg-white border-b flex-wrap">
        <span className="text-xs text-gray-500 font-medium mr-1">Barbero:</span>
        <button
          onClick={() => setFilterBarberId(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            filterBarberId === null
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todos
        </button>
        {barbers.map((barber, i) => (
          <button
            key={barber.id}
            onClick={() => setFilterBarberId(prev => prev === barber.id ? null : barber.id)}
            style={filterBarberId === barber.id ? { backgroundColor: BARBER_COLORS[i % BARBER_COLORS.length] } : {}}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterBarberId === barber.id
                ? 'text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-1.5"
              style={{ backgroundColor: filterBarberId === barber.id ? 'white' : BARBER_COLORS[i % BARBER_COLORS.length] }}
            />
            {barber.name}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-3">
          {loading && <span className="text-xs text-gray-400">Cargando…</span>}
          <button
            onClick={() => setModal({ mode: 'create', start: new Date() })}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
          >
            + Nueva cita
          </button>
        </div>
      </div>

      {/* Calendario */}
      <div className="flex-1 px-4 pb-4 pt-3 min-h-0 relative">
        {error ? (
          <ErrorState onRetry={retry} />
        ) : (
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={esLocale}
          firstDay={1}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          slotMinTime="08:00:00"
          slotMaxTime="22:00:00"
          businessHours={[
            { daysOfWeek: [1, 2, 3, 4, 5, 6], startTime: '11:00', endTime: '20:00' },
            { daysOfWeek: [0], startTime: '10:00', endTime: '16:00' },
          ]}
          height="100%"
          events={events}
          selectable
          selectMirror
          nowIndicator
          allDaySlot={false}
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false, hour12: false }}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          select={handleDateSelect}
        />
        )}
        {/* Estado vacío sutil: no hay citas en el rango visible */}
        {!error && !loading && allAppointments.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 text-center">
            <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>No hay citas para hoy</p>
          </div>
        )}
      </div>

      {modal.mode !== 'closed' && (
        <AppointmentModal
          mode={modal.mode}
          initialStart={modal.mode === 'create' ? modal.start : undefined}
          initialBarberId={modal.mode === 'create' ? modal.barberId : undefined}
          appointment={modal.mode === 'edit' ? modal.appointment : undefined}
          barbers={barbers}
          services={services}
          onClose={handleModalClose}
          onSaved={handleModalSaved}
        />
      )}
    </div>
  )
}
