'use client'

import { useState, useCallback } from 'react'
import { useRealtime } from './useRealtime'
import type { QueueTicketWithRelations } from '@/types/app'

export function useQueue(tenantId: string, initialTickets: QueueTicketWithRelations[]) {
  const [tickets, setTickets] = useState<QueueTicketWithRelations[]>(initialTickets)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const date = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/queue?date=${date}`)
      if (res.ok) {
        const data: QueueTicketWithRelations[] = await res.json()
        setTickets(data)
      }
    } catch (err) {
      console.error('[useQueue] Error al refrescar:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useRealtime({
    channelName: `queue:${tenantId}`,
    table: 'queue_tickets',
    filter: `tenant_id=eq.${tenantId}`,
    onEvent: refresh,
  })

  return { tickets, loading, refresh }
}
