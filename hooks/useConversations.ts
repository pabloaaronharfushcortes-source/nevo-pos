'use client'

import { useState, useCallback } from 'react'
import { useRealtime } from './useRealtime'
import type { ConversationWithClient } from '@/types/app'

// Lista reactiva de conversaciones: se refresca ante cualquier cambio en la
// tabla conversations del tenant (mensaje nuevo, cambio de modo, etc.).
export function useConversations(
  tenantId: string,
  initial: ConversationWithClient[]
) {
  const [conversations, setConversations] = useState<ConversationWithClient[]>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/conversations')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: ConversationWithClient[] = await res.json()
      setConversations(data)
    } catch (err) {
      console.error('[useConversations] Error al refrescar:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useRealtime({
    channelName: `conversations:${tenantId}`,
    table: 'conversations',
    filter: `tenant_id=eq.${tenantId}`,
    onEvent: refresh,
  })

  return { conversations, loading, error, refresh, setConversations }
}
