'use client'

import { useMemo, useRef } from 'react'
import type { Barber, AppointmentWithRelations } from '@/types/app'

// Vista de día con una columna por barbero (estilo Agenda Pro).
// Las citas se posicionan absolutamente según su hora dentro de cada columna.

const DAY_START_HOUR = 8
const DAY_END_HOUR = 22
const HOUR_HEIGHT = 60 // px por hora
const TOTAL_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60
const SNAP_MINUTES = 15 // granularidad al hacer clic en un hueco

// Misma paleta que CalendarView para mantener consistencia de color por barbero
const BARBER_COLORS = [
  '#FF6B6B', '#A259FF', '#2DD4BF', '#F59E0B',
  '#EC4899', '#6366F1', '#10B981', '#F472B6',
]

const STATUS_FADED = new Set(['cancelled', 'no_show'])

function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

// Minutos desde DAY_START_HOUR para una fecha dada
function minutesFromDayStart(date: Date): number {
  return (date.getHours() - DAY_START_HOUR) * 60 + date.getMinutes()
}

type Props = {
  date: Date
  barbers: Barber[]
  visibleBarberIds: string[] // columnas a mostrar (respeta el filtro de barbero)
  appointments: AppointmentWithRelations[]
  onSlotClick: (barberId: string, start: Date) => void
  onAppointmentClick: (appt: AppointmentWithRelations) => void
}

export default function DayColumnsView({
  date,
  barbers,
  visibleBarberIds,
  appointments,
  onSlotClick,
  onAppointmentClick,
}: Props) {
  const bodyRef = useRef<HTMLDivElement>(null)

  // Color estable por barbero según su posición en el arreglo completo
  const colorOf = useMemo(() => {
    const map: Record<string, string> = {}
    barbers.forEach((b, i) => { map[b.id] = BARBER_COLORS[i % BARBER_COLORS.length] })
    return map
  }, [barbers])

  const columns = useMemo(
    () => barbers.filter(b => visibleBarberIds.includes(b.id)),
    [barbers, visibleBarberIds],
  )

  // Agrupa las citas del día por barbero
  const byBarber = useMemo(() => {
    const map: Record<string, AppointmentWithRelations[]> = {}
    for (const appt of appointments) {
      const id = appt.barber?.id ?? appt.barber_id
      if (!id) continue
      ;(map[id] ??= []).push(appt)
    }
    return map
  }, [appointments])

  const hours = useMemo(() => {
    const out: number[] = []
    for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) out.push(h)
    return out
  }, [])

  // Indicador de "ahora" solo si la fecha visible es hoy
  const now = new Date()
  const isToday = now.toDateString() === date.toDateString()
  const nowMinutes = minutesFromDayStart(now)
  const showNow = isToday && nowMinutes >= 0 && nowMinutes <= TOTAL_MINUTES

  function handleColumnClick(barberId: string, e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const rawMinutes = (y / HOUR_HEIGHT) * 60
    const snapped = Math.max(0, Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES)
    const start = new Date(date)
    start.setHours(DAY_START_HOUR, 0, 0, 0)
    start.setMinutes(snapped)
    onSlotClick(barberId, start)
  }

  if (columns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm" style={{ color: '#9B9BB0' }}>No hay barberos activos para mostrar</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Encabezado de columnas (barberos) */}
      <div className="flex flex-shrink-0 border-b" style={{ borderColor: '#EDEDED' }}>
        <div className="w-14 flex-shrink-0" />
        {columns.map(b => (
          <div
            key={b.id}
            className="flex-1 min-w-0 px-2 py-2.5 text-center border-l"
            style={{ borderColor: '#F0F0F5' }}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: colorOf[b.id] }} />
              <span className="text-sm font-medium truncate" style={{ color: '#0E0D1A' }}>{b.name}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Cuerpo desplazable: gutter de horas + columnas */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto">
        <div className="flex relative" style={{ height: TOTAL_MINUTES / 60 * HOUR_HEIGHT }}>
          {/* Gutter de horas */}
          <div className="w-14 flex-shrink-0 relative">
            {hours.map(h => (
              <div
                key={h}
                className="absolute right-2 text-2xs tabular-nums -translate-y-1/2"
                style={{ top: (h - DAY_START_HOUR) * HOUR_HEIGHT, color: '#9B9BB0' }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Columnas de barberos */}
          {columns.map(b => {
            const color = colorOf[b.id]
            const appts = byBarber[b.id] ?? []
            return (
              <div
                key={b.id}
                onClick={e => handleColumnClick(b.id, e)}
                className="flex-1 min-w-0 relative border-l cursor-pointer"
                style={{ borderColor: '#F0F0F5' }}
              >
                {/* Líneas de hora */}
                {hours.map(h => (
                  <div
                    key={h}
                    className="absolute inset-x-0"
                    style={{
                      top: (h - DAY_START_HOUR) * HOUR_HEIGHT,
                      borderTop: '1px solid #F5F5F7',
                    }}
                  />
                ))}

                {/* Citas */}
                {appts.map(appt => {
                  const start = new Date(appt.starts_at)
                  const end = new Date(appt.ends_at)
                  const top = (minutesFromDayStart(start) / 60) * HOUR_HEIGHT
                  const durMin = Math.max(20, (end.getTime() - start.getTime()) / 60_000)
                  const height = (durMin / 60) * HOUR_HEIGHT
                  const faded = STATUS_FADED.has(appt.status)
                  const pending = appt.status === 'pending'

                  const bg = faded
                    ? '#F0F0F5'
                    : pending
                      ? withAlpha(color, 0.14)
                      : appt.status === 'completed'
                        ? withAlpha(color, 0.55)
                        : color
                  const textColor = faded ? '#9B9BB0' : pending ? '#0E0D1A' : '#FFFFFF'
                  const borderC = faded ? '#D4D4E0' : color

                  return (
                    <button
                      key={appt.id}
                      onClick={e => { e.stopPropagation(); onAppointmentClick(appt) }}
                      className="absolute left-1 right-1 rounded-lg px-1.5 py-1 text-left overflow-hidden transition-shadow hover:shadow-md"
                      style={{
                        top,
                        height,
                        background: bg,
                        borderLeft: `3px solid ${borderC}`,
                        color: textColor,
                      }}
                    >
                      <div className="text-[11px] font-semibold tabular-nums leading-tight">
                        {start.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>
                      <div
                        className="text-[11px] truncate leading-tight"
                        style={faded ? { textDecoration: 'line-through' } : undefined}
                      >
                        {appt.client?.name ?? 'Sin cliente'}
                      </div>
                      {height > 40 && appt.service?.name && (
                        <div className="text-[10px] opacity-80 truncate leading-tight">{appt.service.name}</div>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}

          {/* Indicador de ahora — superpuesto sobre todo el ancho de columnas */}
          {showNow && (
            <div
              className="pointer-events-none absolute left-14 right-0 flex items-center"
              style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}
            >
              <span className="w-2 h-2 rounded-full -ml-1" style={{ background: '#FF6B6B' }} />
              <span className="flex-1 h-px" style={{ background: '#FF6B6B' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
