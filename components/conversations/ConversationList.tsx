'use client'

import type { ConversationWithClient } from '@/types/app'

type Props = {
  conversations: ConversationWithClient[]
  selectedId: string | null
  onSelect: (id: string) => void
  filter: string
  onFilterChange: (filter: string) => void
  loading: boolean
}

const FILTER_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'human', label: 'Humano' },
  { value: 'agent', label: 'Agente' },
]

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
}: Props) {
  const visible = filter
    ? conversations.filter(c => c.mode === filter)
    : conversations

  return (
    <div
      className="w-80 flex-shrink-0 flex flex-col border-r"
      style={{ background: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Filtros */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex gap-1">
          {FILTER_OPTIONS.map(opt => {
            const active = filter === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => onFilterChange(opt.value)}
                className="px-2.5 py-1 text-2xs font-medium uppercase tracking-wide transition-colors"
                style={
                  active
                    ? { background: 'var(--brass)', color: '#0C0A09' }
                    : { background: 'var(--surface-3)', color: 'var(--ink-secondary)' }
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
        {visible.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--ink-muted)' }}>
            {loading ? 'Cargando…' : 'Sin conversaciones'}
          </div>
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
                  background: isSelected ? 'var(--surface-3)' : 'transparent',
                  borderLeft: isSelected ? '2px solid var(--brass)' : '2px solid transparent',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--ink-primary)' }}>
                    {name}
                  </span>
                  <span className="text-2xs flex-shrink-0" style={{ color: 'var(--ink-muted)' }}>
                    {formatTime(conv.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-2xs truncate" style={{ color: 'var(--ink-secondary)' }}>
                    {conv.last_message_preview ?? 'Sin mensajes'}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {conv.mode === 'human' && (
                      <span
                        className="text-2xs uppercase tracking-wide px-1 py-0.5"
                        style={{ background: 'var(--brass-dark)', color: 'var(--brass)' }}
                      >
                        Humano
                      </span>
                    )}
                    {hasUnread && (
                      <span
                        className="num text-2xs rounded-full min-w-4 h-4 px-1 flex items-center justify-center"
                        style={{ background: 'var(--brass)', color: '#0C0A09' }}
                      >
                        {conv.unread_human_count}
                      </span>
                    )}
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
