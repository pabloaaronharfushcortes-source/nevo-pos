'use client'

import { useState, useCallback } from 'react'
import { useConversations } from '@/hooks/useConversations'
import { useRealtime } from '@/hooks/useRealtime'
import type { ConversationWithClient, ConversationWithMessages, Message } from '@/types/app'
import ConversationList from './ConversationList'
import MessageThread from './MessageThread'

type Props = {
  tenantId: string
  initialConversations: ConversationWithClient[]
}

export default function ConversationsBoard({ tenantId, initialConversations }: Props) {
  const { conversations, loading, error, refresh } = useConversations(tenantId, initialConversations)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [active, setActive] = useState<ConversationWithMessages | null>(null)
  const [filter, setFilter] = useState('')

  const loadConversation = useCallback(async (id: string) => {
    setSelectedId(id)
    try {
      const res = await fetch(`/api/conversations/${id}`)
      if (res.ok) {
        const data: ConversationWithMessages = await res.json()
        setActive(data)
      }
    } catch (err) {
      console.error('[ConversationsBoard] Error al cargar conversación:', err)
    }
  }, [])

  // Refrescar el hilo activo cuando llegan mensajes nuevos por Realtime.
  // Sin filtro por conversation_id (no soportado sobre relación), refrescamos
  // el hilo abierto ante cualquier inserción de mensaje del tenant.
  const refreshActive = useCallback(() => {
    if (selectedId) void loadConversation(selectedId)
    void refresh()
  }, [selectedId, loadConversation, refresh])

  useRealtime({
    channelName: `messages:${tenantId}`,
    table: 'messages',
    onEvent: refreshActive,
  })

  async function handleModeChange(mode: 'agent' | 'human') {
    if (!active) return
    const res = await fetch(`/api/conversations/${active.id}/mode`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    })
    if (res.ok) {
      setActive(prev => prev ? { ...prev, mode, unread_human_count: 0 } : prev)
      void refresh()
    }
  }

  function handleMessageSent(message: Message) {
    setActive(prev => prev ? { ...prev, messages: [...prev.messages, message] } : prev)
    void refresh()
  }

  return (
    <div className="flex h-full">
      <ConversationList
        conversations={conversations}
        selectedId={selectedId}
        onSelect={loadConversation}
        filter={filter}
        onFilterChange={setFilter}
        loading={loading}
        error={error}
        onRetry={refresh}
      />

      <div className="flex-1 overflow-hidden" style={{ background: 'var(--surface-0)' }}>
        {active ? (
          <MessageThread
            conversation={active}
            onModeChange={handleModeChange}
            onMessageSent={handleMessageSent}
          />
        ) : (
          <div className="flex items-center justify-center h-full flex-col gap-2" style={{ color: 'var(--ink-muted)' }}>
            <p className="font-display text-lg" style={{ color: 'var(--ink-secondary)' }}>Selecciona una conversación</p>
            <p className="text-2xs uppercase tracking-widest">El hilo aparecerá aquí</p>
          </div>
        )}
      </div>
    </div>
  )
}
