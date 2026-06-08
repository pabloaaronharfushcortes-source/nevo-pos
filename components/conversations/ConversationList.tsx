'use client'

import { MessageSquare } from 'lucide-react'
import type { ConversationWithClient } from '@/types/app'
import { SkeletonList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'

type Props = {
  conversations: ConversationWithClient[]
  selectedId: string | null
  onSelect: (id: string) => void
  filter: string
  onFilterChange: (filter: string) => void
  loading: boolean
  error: boolean
  onRetry: () => void
}

const FILTER_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'human', label: 'Humano' },
  { value: 'agent', label: 'Agente' },
]

// Iniciales para el avatar (primer + último nombre)
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Formatea la hora del último mensaje de forma relativa y compacta
function formatTime(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) {
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  loading,
  error,
  onRetry,
}: Props) {
  const visible = filter
    ? conversations.filter(c => c.mode === filter)
    : conversations

  return (
    <div
      className={`flex-shrink-0 flex flex-col border-r w-full md:w-80 ${selectedId ? 'hidden md:flex' : 'flex'}`}
      style={{ background: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Filtros */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex gap-1.5">
          {FILTER_OPTIONS.map(opt => {
            const active = filter === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => onFilterChange(opt.value)}
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

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading && visible.length === 0 ? (
          <SkeletonList rows={6} />
        ) : error && visible.length === 0 ? (
          <ErrorState onRetry={onRetry} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            message={filter ? 'Sin conversaciones en este filtro' : 'No hay conversaciones activas'}
          />
        ) : (
          visible.map(conv => {
            const isSelected = conv.id === selectedId
            const name = conv.client?.name ?? conv.whatsapp_id
            const hasUnread = conv.unread_human_count > 0

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
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
                    style={{ background: '#F0E6FF', color: '#8B3FFF' }}
                  >
                    {initials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate" style={{ color: '#0E0D1A' }}>
                        {name}
                      </span>
                      <span className="text-2xs flex-shrink-0" style={{ color: '#9B9BB0' }}>
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs truncate" style={{ color: '#6B6B8A' }}>
                        {conv.last_message_preview ?? 'Sin mensajes'}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {conv.mode === 'human' && (
                          <span
                            className="text-2xs font-medium px-2 py-0.5 rounded-full"
                            style={{ background: '#FFE8E8', color: '#E85555' }}
                          >
                            Humano
                          </span>
                        )}
                        {hasUnread && (
                          <span
                            className="num text-2xs font-semibold text-white rounded-full min-w-4 h-4 px-1 flex items-center justify-center"
                            style={{ background: '#FF6B6B' }}
                          >
                            {conv.unread_human_count}
                          </span>
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
  )
}
