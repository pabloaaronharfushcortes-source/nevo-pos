'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Params = {
  channelName: string
  table: string
  filter?: string
  onEvent: () => void
}

export function useRealtime({ channelName, table, filter, onEvent }: Params) {
  // Ref para siempre tener el callback más reciente sin re-suscribirse
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        () => { onEventRef.current() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [channelName, table, filter])
}
