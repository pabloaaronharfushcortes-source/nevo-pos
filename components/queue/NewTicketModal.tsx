'use client'

import { useState, useRef, useEffect } from 'react'
import type { Barber, Service } from '@/types/app'

type ClientResult = {
  id: string
  name: string
  phone: string | null
}

type Props = {
  barbers: Barber[]
  services: Service[]
  onClose: () => void
  onCreated: () => void
}

export default function NewTicketModal({ barbers, services, onClose, onCreated }: Props) {
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<ClientResult[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [selectedBarberId, setSelectedBarberId] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        // silent — search is best-effort
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
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [])

  async function handleCreate() {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient?.id ?? undefined,
          barberId: selectedBarberId || undefined,
          serviceId: selectedServiceId || undefined,
          source: 'reception',
        }),
      })

      const data = await res.json() as { error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Error al crear el ticket')
        return
      }

      onCreated()
    } catch {
      setError('Error de conexión')
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Nueva ficha</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Cliente (opcional) */}
          <div className="relative">
            <label className={labelClass}>Cliente <span className="text-gray-400 font-normal">(opcional)</span></label>
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
              <p className="mt-1 text-xs text-green-600">Seleccionado: {selectedClient.name}</p>
            )}
            {showClientDropdown && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {clientResults.map(c => (
                  <li key={c.id}>
                    <button
                      onMouseDown={() => selectClient(c)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.phone && <span className="text-gray-400 ml-2 text-xs">{c.phone}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Barbero (opcional) */}
          <div>
            <label className={labelClass}>Barbero <span className="text-gray-400 font-normal">(el sistema asigna si no se elige)</span></label>
            <select value={selectedBarberId} onChange={e => setSelectedBarberId(e.target.value)} className={inputClass}>
              <option value="">Asignar automáticamente</option>
              {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Servicio (opcional) */}
          <div>
            <label className={labelClass}>Servicio <span className="text-gray-400 font-normal">(opcional)</span></label>
            <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} className={inputClass}>
              <option value="">Sin especificar (45 min)</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.duration_minutes} min</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Asignando…' : 'Crear ficha'}
          </button>
        </div>
      </div>
    </div>
  )
}
