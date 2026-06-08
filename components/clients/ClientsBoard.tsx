'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Users } from 'lucide-react'
import type { Barber, Client, ClientWithProfile } from '@/types/app'
import ClientModal from './ClientModal'
import ClientProfilePanel from './ClientProfilePanel'
import { SkeletonList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'

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

// Clase de badge industrial por clasificación — definida en globals.css
const BADGE_CLASS: Record<string, string> = {
  new: 'badge-new',
  recurrent: 'badge-recurrent',
  vip: 'badge-vip',
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

// Iniciales para el avatar (primer + último nombre)
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ClientsBoard({ barbers }: Props) {
  const [search, setSearch] = useState('')
  const [classification, setClassification] = useState('')
  const [clients, setClients] = useState<ListClient[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [profile, setProfile] = useState<ClientWithProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchClients = useCallback(async (q: string, cls: string) => {
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams()
      if (q.trim().length >= 2) params.set('search', q.trim())
      if (cls) params.set('classification', cls)

      const res = await fetch(`/api/clients?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: ApiResponse = await res.json()
      setClients(data.clients)
      setTotal(data.total)
    } catch (err) {
      console.error('[ClientsBoard] Error al cargar clientes:', err)
      setError(true)
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
    setClients(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
    if (profile && profile.id === updated.id) {
      setProfile(prev => prev ? { ...prev, ...updated } : prev)
    }
  }

  function handleProfileDeleted(id: string) {
    setClients(prev => prev.filter(c => c.id !== id))
    setSelectedId(null)
    setProfile(null)
  }

  return (
    <div className="flex h-full">
      {/* Panel izquierdo — lista. En mobile: pantalla completa cuando no hay perfil seleccionado */}
      <div
        className={`flex-shrink-0 flex flex-col border-r ${selectedId ? 'hidden md:flex' : 'flex'} md:flex w-full md:w-80`}
        style={{ background: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
      >
        {/* Búsqueda y filtros */}
        <div
          className="px-4 py-3 space-y-3 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono…"
            className="w-full px-3 py-2 text-sm rounded-lg border-[1.5px] focus:outline-none transition-colors"
            style={{ background: '#FAFAFA', borderColor: '#EDEDED', color: '#0E0D1A' }}
            onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = '#A259FF' }}
            onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = '#EDEDED' }}
          />
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_OPTIONS.map(opt => {
              const active = classification === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setClassification(opt.value)}
                  className="px-3 py-1 text-xs font-medium rounded-full transition-colors"
                  style={
                    active
                      ? { background: '#FF6B6B', color: '#FFFFFF' }
                      : { background: '#F5F5F7', color: '#6B6B8A' }
                  }
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Contador + botón nuevo */}
        <div
          className="px-4 py-2 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <span className="text-xs" style={{ color: '#9B9BB0' }}>
            {loading ? 'Buscando…' : `${total} cliente${total !== 1 ? 's' : ''}`}
          </span>
          <button
            onClick={() => setShowNewModal(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors"
            style={{ background: '#FF6B6B' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E85555' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
          >
            + Nuevo
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <SkeletonList rows={7} />
          ) : error ? (
            <ErrorState onRetry={() => fetchClients(search, classification)} />
          ) : clients.length === 0 ? (
            <EmptyState
              icon={Users}
              message={search || classification ? 'Sin resultados para esta búsqueda' : 'Aún no tienes clientes registrados'}
              actionLabel="Agregar cliente"
              onAction={() => setShowNewModal(true)}
            />
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
                  className="w-full text-left px-4 py-3 border-b transition-colors"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    background: isSelected ? '#FFF6F6' : 'transparent',
                    borderLeft: isSelected ? '2px solid #FF6B6B' : '2px solid transparent',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#FAFAFA' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                      style={{ background: '#FFE8E8', color: '#E85555' }}
                    >
                      {initials(client.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate" style={{ color: '#0E0D1A' }}>
                          {client.name}
                        </span>
                        <span className={`flex-shrink-0 ${BADGE_CLASS[client.classification] ?? 'badge-new'}`}>
                          {CLASSIFICATION_LABEL[client.classification] ?? client.classification}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs truncate" style={{ color: '#9B9BB0' }}>
                          {client.phone ?? client.email ?? 'Sin contacto'}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="num text-xs" style={{ color: '#E85555' }}>
                            {client.loyalty_stamps}★
                          </span>
                          {lastVisit && (
                            <span className="text-xs" style={{ color: '#9B9BB0' }}>{lastVisit}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Panel derecho — perfil. En mobile: pantalla completa cuando hay perfil seleccionado */}
      <div className={`overflow-hidden ${selectedId ? 'flex flex-1' : 'hidden md:flex md:flex-1'}`} style={{ background: 'var(--surface-0)' }}>
        {!selectedId ? (
          <div className="flex items-center justify-center h-full flex-col gap-2" style={{ color: 'var(--ink-muted)' }}>
            <p className="font-display text-lg" style={{ color: 'var(--ink-secondary)' }}>Selecciona un cliente</p>
            <p className="text-2xs uppercase tracking-widest">El perfil aparecerá aquí</p>
          </div>
        ) : profileLoading ? (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--ink-muted)' }}>
            Cargando perfil…
          </div>
        ) : profile ? (
          <ClientProfilePanel
            profile={profile}
            barbers={barbers}
            onUpdated={handleProfileUpdated}
            onDeleted={handleProfileDeleted}
            onBack={() => { setSelectedId(null); setProfile(null) }}
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
