'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Barber, Client, ClientWithProfile } from '@/types/app'
import ClientModal from './ClientModal'
import ClientProfilePanel from './ClientProfilePanel'

type Props = {
  barbers: Barber[]
}

type ListClient = Pick<
  Client,
  'id' | 'name' | 'phone' | 'email' | 'classification' | 'loyalty_stamps' | 'last_visit_at' | 'total_spent' | 'whatsapp_id' | 'preferred_barber_id'
>

type ApiResponse = {
  clients: ListClient[]
  total: number
  page: number
  limit: number
}

const CLASSIFICATION_STYLE: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  recurrent: 'bg-blue-100 text-blue-700',
  vip: 'bg-amber-100 text-amber-700',
}

const CLASSIFICATION_LABEL: Record<string, string> = {
  new: 'Nuevo',
  recurrent: 'Recurrente',
  vip: 'VIP',
}

const FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'new', label: 'Nuevos' },
  { value: 'recurrent', label: 'Recurrentes' },
  { value: 'vip', label: 'VIP' },
]

export default function ClientsBoard({ barbers }: Props) {
  const [search, setSearch] = useState('')
  const [classification, setClassification] = useState('')
  const [clients, setClients] = useState<ListClient[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [profile, setProfile] = useState<ClientWithProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchClients = useCallback(async (q: string, cls: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q.trim().length >= 2) params.set('search', q.trim())
      if (cls) params.set('classification', cls)

      const res = await fetch(`/api/clients?${params}`)
      if (res.ok) {
        const data: ApiResponse = await res.json()
        setClients(data.clients)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchClients(search, classification)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, classification, fetchClients])

  async function loadProfile(id: string) {
    setSelectedId(id)
    setProfileLoading(true)
    try {
      const res = await fetch(`/api/clients/${id}`)
      if (res.ok) {
        const data: ClientWithProfile = await res.json()
        setProfile(data)
      }
    } finally {
      setProfileLoading(false)
    }
  }

  function handleClientSaved(client: Client) {
    setShowNewModal(false)
    // Refrescar la lista y abrir el perfil
    fetchClients(search, classification)
    loadProfile(client.id)
  }

  function handleProfileUpdated(updated: Client) {
    // Actualizar en la lista
    setClients(prev => prev.map(c => c.id === updated.id
      ? { ...c, ...updated }
      : c
    ))
    // Actualizar el perfil en panel
    if (profile && profile.id === updated.id) {
      setProfile(prev => prev ? { ...prev, ...updated } : prev)
    }
  }

  return (
    <div className="flex h-full">
      {/* Panel izquierdo — lista */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r bg-white">
        {/* Búsqueda y filtros */}
        <div className="px-4 py-3 border-b space-y-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono…"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
          <div className="flex gap-1 flex-wrap">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setClassification(opt.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  classification === opt.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contador + botón nuevo */}
        <div className="px-4 py-2 border-b flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {loading ? 'Buscando…' : `${total} cliente${total !== 1 ? 's' : ''}`}
          </span>
          <button
            onClick={() => setShowNewModal(true)}
            className="text-xs px-2.5 py-1 bg-gray-900 text-white rounded hover:bg-gray-700 transition-colors"
          >
            + Nuevo
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {!loading && clients.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Sin resultados
            </div>
          ) : (
            clients.map(client => {
              const isSelected = client.id === selectedId
              const lastVisit = client.last_visit_at
                ? new Date(client.last_visit_at).toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'short',
                  })
                : null

              return (
                <button
                  key={client.id}
                  onClick={() => loadProfile(client.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-gray-50 border-l-2 border-l-gray-900' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{client.name}</span>
                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-xs font-medium ${CLASSIFICATION_STYLE[client.classification] ?? ''}`}>
                      {CLASSIFICATION_LABEL[client.classification] ?? client.classification}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-gray-400 truncate">
                      {client.phone ?? client.email ?? 'Sin contacto'}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400">{client.loyalty_stamps}★</span>
                      {lastVisit && <span className="text-xs text-gray-400">{lastVisit}</span>}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Panel derecho — perfil */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        {!selectedId ? (
          <div className="flex items-center justify-center h-full text-gray-400 flex-col gap-2">
            <p className="text-lg">Selecciona un cliente</p>
            <p className="text-sm">El perfil aparecerá aquí</p>
          </div>
        ) : profileLoading ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Cargando perfil…
          </div>
        ) : profile ? (
          <ClientProfilePanel
            profile={profile}
            barbers={barbers}
            onUpdated={handleProfileUpdated}
          />
        ) : null}
      </div>

      {showNewModal && (
        <ClientModal
          barbers={barbers}
          onClose={() => setShowNewModal(false)}
          onSaved={handleClientSaved}
        />
      )}
    </div>
  )
}
