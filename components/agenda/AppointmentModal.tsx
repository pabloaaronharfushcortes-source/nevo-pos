'use client'

import { useState, useEffect, useRef } from 'react'
import type { Barber, Service, AppointmentWithRelations } from '@/types/app'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { toast } from '@/hooks/useToast'

type ClientResult = {
  id: string
  name: string
  phone: string | null
  classification: string
  loyalty_stamps: number
}

type Props = {
  mode: 'create' | 'edit'
  initialStart?: Date
  initialBarberId?: string
  appointment?: AppointmentWithRelations
  barbers: Barber[]
  services: Service[]
  onClose: () => void
  onSaved: () => void
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  in_progress: 'En progreso',
  completed: 'Completada',
  no_show: 'No asistió',
  cancelled: 'Cancelada',
}

const BOOKED_VIA_LABELS: Record<string, string> = {
  reception: 'Recepción',
  whatsapp: 'WhatsApp',
  web: 'Web',
  app: 'App',
}

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function AppointmentModal({
  mode,
  initialStart,
  initialBarberId,
  appointment,
  barbers,
  services,
  onClose,
  onSaved,
}: Props) {
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [clientSearch, setClientSearch] = useState(appointment?.client?.name ?? '')
  const [clientResults, setClientResults] = useState<ClientResult[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(
    appointment?.client
      ? { id: appointment.client.id, name: appointment.client.name, phone: appointment.client.phone, classification: '', loyalty_stamps: 0 }
      : null
  )
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  const [selectedBarberId, setSelectedBarberId] = useState(appointment?.barber?.id ?? initialBarberId ?? '')
  const [selectedServiceId, setSelectedServiceId] = useState(appointment?.service?.id ?? '')
  const [startsAtLocal, setStartsAtLocal] = useState(
    appointment ? toDatetimeLocal(new Date(appointment.starts_at)) : (initialStart ? toDatetimeLocal(initialStart) : '')
  )
  const [status, setStatus] = useState(appointment?.status ?? 'pending')
  const [notes, setNotes] = useState(appointment?.notes ?? '')
  const [bookedVia, setBookedVia] = useState(appointment?.booked_via ?? 'reception')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  const selectedService = services.find(s => s.id === selectedServiceId)

  const computedEndsAt = selectedService && startsAtLocal
    ? new Date(new Date(startsAtLocal).getTime() + selectedService.duration_minutes * 60_000)
    : null

  function handleClientSearchChange(value: string) {
    setClientSearch(value)
    setSelectedClient(null)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    if (value.trim().length < 2) {
      setClientResults([])
      setShowClientDropdown(false)
      return
    }

    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(value.trim())}`)
        if (res.ok) {
          const data: ClientResult[] = await res.json()
          setClientResults(data)
          setShowClientDropdown(data.length > 0)
        }
      } catch {
        // sin feedback al usuario para errores de búsqueda
      }
    }, 300)
  }

  function selectClient(client: ClientResult) {
    setSelectedClient(client)
    setClientSearch(client.name)
    setClientResults([])
    setShowClientDropdown(false)
  }

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  async function handleSave() {
    if (mode === 'create' && (!selectedClient || !selectedBarberId || !selectedServiceId || !startsAtLocal)) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (mode === 'create' && selectedClient) {
        const res = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: selectedClient.id,
            barberId: selectedBarberId,
            serviceId: selectedServiceId,
            startsAt: new Date(startsAtLocal).toISOString(),
            notes: notes.trim() || undefined,
            bookedVia,
          }),
        })

        if (!res.ok) {
          const data = await res.json() as { error?: string }
          setError(data.error ?? 'Error al crear la cita')
          toast.error('Algo salió mal. Intenta de nuevo.')
          return
        }
        toast.success('Cita registrada correctamente')
      } else if (mode === 'edit' && appointment) {
        const res = await fetch(`/api/appointments/${appointment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            notes: notes.trim() || null,
          }),
        })

        if (!res.ok) {
          const data = await res.json() as { error?: string }
          setError(data.error ?? 'Error al actualizar la cita')
          toast.error('Algo salió mal. Intenta de nuevo.')
          return
        }
        toast.success('Cita actualizada')
      }

      onSaved()
    } catch {
      setError('Error de conexión')
      toast.error('Algo salió mal. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCancelAppointment() {
    if (!appointment) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          cancellationReason: 'Cancelada desde agenda',
        }),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Error al cancelar')
        toast.error('Algo salió mal. Intenta de nuevo.')
        return
      }

      toast.success('Cita cancelada')
      onSaved()
    } catch {
      setError('Error de conexión')
      toast.error('Algo salió mal. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Nueva cita' : 'Editar cita'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Cliente */}
          {mode === 'create' && (
            <div className="relative">
              <label className={labelClass}>Cliente *</label>
              <input
                type="text"
                value={clientSearch}
                onChange={e => handleClientSearchChange(e.target.value)}
                onFocus={() => clientResults.length > 0 && setShowClientDropdown(true)}
                onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
                placeholder="Buscar por nombre…"
                className={inputClass}
                autoComplete="off"
              />
              {selectedClient && (
                <p className="mt-1 text-xs text-green-600">
                  Cliente seleccionado — {selectedClient.classification}
                </p>
              )}
              {showClientDropdown && (
                <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {clientResults.map(client => (
                    <li key={client.id}>
                      <button
                        onMouseDown={() => selectClient(client)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        <span className="font-medium">{client.name}</span>
                        {client.phone && <span className="text-gray-400 ml-2">{client.phone}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Modo edición: mostrar cliente como texto */}
          {mode === 'edit' && appointment?.client && (
            <div>
              <label className={labelClass}>Cliente</label>
              <p className="text-sm text-gray-900 px-3 py-2 bg-gray-50 rounded-md">
                {appointment.client.name}
                {appointment.client.phone && <span className="text-gray-400 ml-2">{appointment.client.phone}</span>}
              </p>
            </div>
          )}

          {/* Barbero */}
          <div>
            <label className={labelClass}>Barbero *</label>
            {mode === 'create' ? (
              <select
                value={selectedBarberId}
                onChange={e => setSelectedBarberId(e.target.value)}
                className={inputClass}
              >
                <option value="">Seleccionar barbero…</option>
                {barbers.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-900 px-3 py-2 bg-gray-50 rounded-md">
                {appointment?.barber?.name ?? '—'}
              </p>
            )}
          </div>

          {/* Servicio */}
          <div>
            <label className={labelClass}>Servicio *</label>
            {mode === 'create' ? (
              <select
                value={selectedServiceId}
                onChange={e => setSelectedServiceId(e.target.value)}
                className={inputClass}
              >
                <option value="">Seleccionar servicio…</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — ${s.price} ({s.duration_minutes} min)
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-900 px-3 py-2 bg-gray-50 rounded-md">
                {appointment?.service?.name ?? '—'}
                {appointment?.service && (
                  <span className="text-gray-400 ml-2">
                    ${appointment.service.price} · {appointment.service.duration_minutes} min
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Fecha y hora */}
          <div>
            <label className={labelClass}>Fecha y hora *</label>
            {mode === 'create' ? (
              <>
                <input
                  type="datetime-local"
                  value={startsAtLocal}
                  onChange={e => setStartsAtLocal(e.target.value)}
                  className={inputClass}
                />
                {computedEndsAt && (
                  <p className="mt-1 text-xs text-gray-500">
                    Finaliza a las {computedEndsAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    {' '}({selectedService?.duration_minutes} min)
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-900 px-3 py-2 bg-gray-50 rounded-md">
                {appointment && new Date(appointment.starts_at).toLocaleString('es-MX', {
                  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
          </div>

          {/* Estado (solo edición) */}
          {mode === 'edit' && (
            <div>
              <label className={labelClass}>Estado</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className={inputClass}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Origen (solo creación) */}
          {mode === 'create' && (
            <div>
              <label className={labelClass}>Agendado por</label>
              <select
                value={bookedVia}
                onChange={e => setBookedVia(e.target.value)}
                className={inputClass}
              >
                {Object.entries(BOOKED_VIA_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className={labelClass}>Notas</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Preferencias, instrucciones especiales…"
              className={`${inputClass} resize-none`}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3">
          {mode === 'edit' && appointment?.status !== 'cancelled' && (
            <button
              onClick={() => setConfirmingCancel(true)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Cancelar cita
            </button>
          )}

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cerrar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando…' : mode === 'create' ? 'Crear cita' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmingCancel}
        title="Cancelar cita"
        description="Esta acción marcará la cita como cancelada. No se puede deshacer."
        confirmLabel="Sí, cancelar cita"
        cancelLabel="No"
        variant="danger"
        onConfirm={handleCancelAppointment}
        onCancel={() => setConfirmingCancel(false)}
      />
    </div>
  )
}
