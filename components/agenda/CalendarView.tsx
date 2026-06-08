'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type {
  EventClickArg,
  DateSelectArg,
  DatesSetArg,
  EventInput,
  EventDropArg,
  EventContentArg,
} from '@fullcalendar/core'
import esLocale from '@fullcalendar/core/locales/es'
import type { Barber, Service, AppointmentWithRelations } from '@/types/app'
import AppointmentModal from './AppointmentModal'
import { ErrorState } from '@/components/ui/ErrorState'
import { toast } from '@/hooks/useToast'

type ModalState =
  | { mode: 'closed' }
  | { mode: 'create'; start: Date; barberId?: string }
  | { mode: 'edit'; appointment: AppointmentWithRelations }

// Paleta NEVO-armónica: cada barbero recibe un color distinto pero on-brand
const BARBER_COLORS = [
  '#FF6B6B', // coral
  '#A259FF', // púrpura
  '#2DD4BF', // teal
  '#F59E0B', // ámbar
  '#EC4899', // rosa
  '#6366F1', // índigo
  '#10B981', // esmeralda
  '#F472B6', // rosa claro
]

// Estados que se muestran "apagados" (gris, sin color de barbero)
const STATUS_FADED = new Set(['cancelled', 'no_show'])

// Convierte #RRGGBB + alpha → rgba()
function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function barberColor(appt: AppointmentWithRelations, barbers: Barber[]): string {
  const idx = barbers.findIndex(b => b.id === appt.barber?.id)
  return idx >= 0 ? BARBER_COLORS[idx % BARBER_COLORS.length] : '#9B9BB0'
}

function toCalendarEvent(appt: AppointmentWithRelations, barbers: Barber[]): EventInput {
  const color = barberColor(appt, barbers)
  const faded = STATUS_FADED.has(appt.status)
  const completed = appt.status === 'completed'
  const pending = appt.status === 'pending'

  // Semántica de estado sobre el color del barbero:
  //  · cancelled/no_show → gris apagado
  //  · pending           → relleno tenue + borde de color (cita por confirmar)
  //  · completed         → color atenuado
  //  · confirmed/in_progress → color sólido
  let backgroundColor = color
  let borderColor = color
  let textColor = '#FFFFFF'

  if (faded) {
    backgroundColor = '#F0F0F5'
    borderColor = '#D4D4E0'
    textColor = '#9B9BB0'
  } else if (pending) {
    backgroundColor = withAlpha(color, 0.14)
    borderColor = color
    textColor = '#0E0D1A'
  } else if (completed) {
    backgroundColor = withAlpha(color, 0.55)
    borderColor = withAlpha(color, 0.55)
    textColor = '#FFFFFF'
  }

  return {
    id: appt.id,
    title: `${appt.client?.name ?? 'Sin cliente'} · ${appt.service?.name ?? ''}`,
    start: appt.starts_at,
    end: appt.ends_at,
    backgroundColor,
    borderColor,
    textColor,
    // cancelled/no_show no se pueden arrastrar
    editable: !faded,
    classNames: [`appt-${appt.status}`],
    extendedProps: { appointment: appt, statusKey: appt.status },
  }
}

const STATUS_DOTS: Array<{ key: string; label: string; swatch: string; border?: string }> = [
  { key: 'pending', label: 'Por confirmar', swatch: 'transparent', border: '#9B9BB0' },
  { key: 'confirmed', label: 'Confirmada', swatch: '#6B6B8A' },
  { key: 'completed', label: 'Completada', swatch: 'rgba(107,107,138,0.55)' },
  { key: 'faded', label: 'Cancelada / No asistió', swatch: '#F0F0F5', border: '#D4D4E0' },
]

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

  // ── Reagendado por drag-drop / resize ──
  const persistReschedule = useCallback(
    async (
      appt: AppointmentWithRelations,
      startsAt: Date,
      revert: () => void,
    ) => {
      try {
        const res = await fetch(`/api/appointments/${appt.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startsAt: startsAt.toISOString() }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string }
          revert()
          toast.error(
            res.status === 409
              ? 'Conflicto de horario: el barbero ya tiene una cita ahí'
              : data.error ?? 'No se pudo reagendar la cita',
          )
          return
        }

        const updated: AppointmentWithRelations = await res.json()
        // Actualiza el estado local sin recargar todo el calendario
        setAllAppointments(prev => prev.map(a => (a.id === updated.id ? updated : a)))
        toast.success('Cita reagendada')
      } catch {
        revert()
        toast.error('Error de conexión al reagendar')
      }
    },
    [],
  )

  const handleEventDrop = useCallback(
    (info: EventDropArg) => {
      const appt = info.event.extendedProps.appointment as AppointmentWithRelations
      if (!info.event.start) {
        info.revert()
        return
      }
      persistReschedule(appt, info.event.start, info.revert)
    },
    [persistReschedule],
  )

  const events = useMemo<EventInput[]>(() => {
    const filtered = filterBarberId
      ? allAppointments.filter(a => a.barber?.id === filterBarberId)
      : allAppointments
    return filtered.map(a => toCalendarEvent(a, barbers))
  }, [allAppointments, filterBarberId, barbers])

  // Render de cada evento: hora + cliente + servicio, compacto
  const renderEvent = useCallback((arg: EventContentArg) => {
    const appt = arg.event.extendedProps.appointment as AppointmentWithRelations | undefined
    const strike = appt && STATUS_FADED.has(appt.status)
    return (
      <div className="px-1 py-0.5 overflow-hidden leading-tight">
        <div className="text-[11px] font-semibold tabular-nums">{arg.timeText}</div>
        <div
          className="text-[11px] truncate"
          style={strike ? { textDecoration: 'line-through' } : undefined}
        >
          {appt?.client?.name ?? 'Sin cliente'}
        </div>
        {appt?.service?.name && (
          <div className="text-[10px] opacity-80 truncate">{appt.service.name}</div>
        )}
      </div>
    )
  }, [])

  return (
    <div className="flex flex-col h-full nevo-calendar">
      {/* Barra de filtros */}
      <div
        className="flex items-center gap-2 px-6 py-3 border-b flex-wrap flex-shrink-0"
        style={{ background: '#FFFFFF', borderColor: '#EDEDED' }}
      >
        <span className="text-xs font-medium mr-1" style={{ color: '#9B9BB0' }}>Barbero:</span>
        <button
          onClick={() => setFilterBarberId(null)}
          className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
          style={
            filterBarberId === null
              ? { background: '#0E0D1A', color: '#FFFFFF' }
              : { background: '#F5F5F7', color: '#6B6B8A' }
          }
        >
          Todos
        </button>
        {barbers.map((barber, i) => {
          const color = BARBER_COLORS[i % BARBER_COLORS.length]
          const active = filterBarberId === barber.id
          return (
            <button
              key={barber.id}
              onClick={() => setFilterBarberId(prev => (prev === barber.id ? null : barber.id))}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors inline-flex items-center"
              style={
                active
                  ? { background: color, color: '#FFFFFF' }
                  : { background: '#F5F5F7', color: '#6B6B8A' }
              }
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-1.5"
                style={{ backgroundColor: active ? '#FFFFFF' : color }}
              />
              {barber.name}
            </button>
          )
        })}

        <div className="ml-auto flex items-center gap-3">
          {loading && <span className="text-xs" style={{ color: '#9B9BB0' }}>Cargando…</span>}
          <button
            onClick={() => setModal({ mode: 'create', start: new Date() })}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ background: '#FF6B6B' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E85555' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
          >
            + Nueva cita
          </button>
        </div>
      </div>

      {/* Leyenda de estados */}
      <div
        className="flex items-center gap-4 px-6 py-2 border-b flex-wrap flex-shrink-0"
        style={{ background: '#FAFAFA', borderColor: '#EDEDED' }}
      >
        {STATUS_DOTS.map(s => (
          <span key={s.key} className="inline-flex items-center text-[11px]" style={{ color: '#6B6B8A' }}>
            <span
              className="inline-block w-3 h-3 rounded-[3px] mr-1.5"
              style={{
                background: s.swatch,
                border: s.border ? `1.5px solid ${s.border}` : 'none',
              }}
            />
            {s.label}
          </span>
        ))}
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
          editable
          eventStartEditable
          eventDurationEditable={false}
          selectable
          selectMirror
          nowIndicator
          allDaySlot={false}
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false, hour12: false }}
          eventContent={renderEvent}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          select={handleDateSelect}
          eventDrop={handleEventDrop}
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
