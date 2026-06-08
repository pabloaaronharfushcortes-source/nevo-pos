'use client'

import { useState, useRef, useEffect } from 'react'
import type { Barber, Service } from '@/types/app'
import { toast } from '@/hooks/useToast'

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

      const data = await res.json() as {
        error?: string
        ticket_number?: number
        barber?: { name?: string } | null
      }

      if (!res.ok) {
        setError(data.error ?? 'Error al crear el ticket')
        toast.error('Algo salió mal. Intenta de nuevo.')
        return
      }

      toast.success(`Ficha ${data.ticket_number ?? ''} asignada a ${data.barber?.name ?? 'barbero'}`.trim())
      onCreated()
    } catch {
      setError('Error de conexión')
      toast.error('Algo salió mal. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'block w-full rounded-lg border-[1.5px] border-[#EDEDED] bg-[#FAFAFA] px-3 py-2.5 text-sm text-[#0E0D1A] focus:border-[#A259FF] focus:outline-none focus:ring-0 transition-colors'
  const labelClass = 'block text-sm font-medium mb-1'

  return (
    <div
      className="fixed inset-0 z-50 flex md:items-center md:justify-center items-end justify-center"
      style={{ background: 'rgba(14,13,26,0.40)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full md:max-w-sm md:rounded-2xl rounded-t-2xl shadow-xl max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#EDEDED' }}>
          <h2 className="font-display text-xl font-semibold" style={{ color: '#0E0D1A' }}>Nueva ficha</h2>
          <button
            onClick={onClose}
            className="text-xl leading-none transition-colors"
            style={{ color: '#9B9BB0' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0E0D1A' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9B9BB0' }}
          >×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Cliente (opcional) */}
          <div className="relative">
            <label className={labelClass} style={{ color: '#0E0D1A' }}>Cliente <span className="font-normal" style={{ color: '#9B9BB0' }}>(opcional)</span></label>
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
              <p className="mt-1 text-xs font-medium" style={{ color: '#8B3FFF' }}>Seleccionado: {selectedClient.name}</p>
            )}
            {showClientDropdown && (
              <ul className="absolute z-10 mt-1 w-full bg-white border-[1.5px] rounded-lg shadow-lg max-h-40 overflow-y-auto" style={{ borderColor: '#EDEDED' }}>
                {clientResults.map(c => (
                  <li key={c.id}>
                    <button
                      onMouseDown={() => selectClient(c)}
                      className="w-full text-left px-3 py-2 text-sm transition-colors"
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5EEFF' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <span className="font-medium" style={{ color: '#0E0D1A' }}>{c.name}</span>
                      {c.phone && <span className="ml-2 text-xs" style={{ color: '#9B9BB0' }}>{c.phone}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Barbero (opcional) */}
          <div>
            <label className={labelClass} style={{ color: '#0E0D1A' }}>Barbero <span className="font-normal" style={{ color: '#9B9BB0' }}>(el sistema asigna si no se elige)</span></label>
            <select value={selectedBarberId} onChange={e => setSelectedBarberId(e.target.value)} className={inputClass}>
              <option value="">Asignar automáticamente</option>
              {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Servicio (opcional) */}
          <div>
            <label className={labelClass} style={{ color: '#0E0D1A' }}>Servicio <span className="font-normal" style={{ color: '#9B9BB0' }}>(opcional)</span></label>
            <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} className={inputClass}>
              <option value="">Sin especificar (45 min)</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.duration_minutes} min</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ color: '#E85555', background: '#FFF0F0' }}>{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: '#EDEDED' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border-[1.5px] transition-colors"
            style={{ color: '#6B6B8A', borderColor: '#EDEDED' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FAFAFA' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors"
            style={{ background: '#FF6B6B' }}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.background = '#E85555' }}
            onMouseLeave={e => { if (!saving) (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
          >
            {saving ? 'Asignando…' : 'Crear ficha'}
          </button>
        </div>
      </div>
    </div>
  )
}
