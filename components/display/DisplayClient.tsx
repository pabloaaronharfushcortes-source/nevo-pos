'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DisplayTicket } from '@/types/app'

type Props = {
  tenantId: string
  tenantSlug: string
  tenantName: string
  initialTickets: DisplayTicket[]
  videoUrls: string[]
}

function Clock() {
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return <span className="text-3xl font-bold tabular-nums text-white">{time}</span>
}

export default function DisplayClient({
  tenantId,
  tenantSlug,
  tenantName,
  initialTickets,
  videoUrls,
}: Props) {
  const [tickets, setTickets] = useState<DisplayTicket[]>(initialTickets)
  const [videoIndex, setVideoIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Realtime: suscripción con anon key — requiere política queue_display_read en migration 6
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`display:${tenantSlug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_tickets',
          filter: `tenant_id=eq.${tenantId}`,
        },
        async () => {
          try {
            const res = await fetch(`/api/display/queue?tenant=${tenantSlug}`)
            if (res.ok) {
              const data: DisplayTicket[] = await res.json()
              setTickets(data)
            }
          } catch {
            // silent — display sigue mostrando el último estado conocido
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tenantId, tenantSlug])

  function handleVideoEnded() {
    if (videoUrls.length > 1) {
      setVideoIndex(i => (i + 1) % videoUrls.length)
    } else if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play()
    }
  }

  const activeTickets = tickets
    .filter(t => t.status === 'waiting' || t.status === 'called')
    .sort((a, b) => a.ticket_number - b.ticket_number)

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden select-none">
      {/* Video — 2/3 */}
      <div className="w-2/3 relative bg-black flex-shrink-0">
        {videoUrls.length > 0 ? (
          <video
            ref={videoRef}
            key={videoIndex}
            src={videoUrls[videoIndex]}
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnded}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-7xl font-black text-white opacity-10 tracking-tight uppercase">
                {tenantName}
              </p>
              <p className="text-lg text-white opacity-5 uppercase tracking-widest">Bienvenido</p>
            </div>
          </div>
        )}
      </div>

      {/* Panel de cola — 1/3 */}
      <div className="w-1/3 flex flex-col border-l border-gray-800 min-w-0">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">En espera</p>
            <p className="text-2xl font-bold text-white mt-0.5">{activeTickets.length} turnos</p>
          </div>
          <Clock />
        </div>

        {/* Tickets */}
        <div className="flex-1 overflow-y-auto">
          {activeTickets.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-gray-600 text-sm">Sin turnos en espera</p>
            </div>
          ) : (
            activeTickets.map(ticket => {
              const isCalled = ticket.status === 'called'
              return (
                <div
                  key={ticket.id}
                  className={`flex items-center gap-5 px-6 py-5 border-b transition-colors ${
                    isCalled
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'border-gray-800'
                  }`}
                >
                  <span className={`text-5xl font-black tabular-nums w-16 text-center leading-none ${
                    isCalled ? 'text-amber-400' : 'text-white'
                  }`}>
                    {String(ticket.ticket_number).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-lg font-semibold truncate ${
                      isCalled ? 'text-amber-300' : 'text-white'
                    }`}>
                      {ticket.client_first_name}
                    </p>
                    <p className="text-sm text-gray-400 truncate">{ticket.barber_name}</p>
                  </div>
                  {isCalled && (
                    <span className="flex-shrink-0 text-xs font-bold text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded animate-pulse">
                      LLAMADO
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800">
          <p className="text-xs text-gray-600 uppercase tracking-wider">{tenantName}</p>
        </div>
      </div>
    </div>
  )
}
