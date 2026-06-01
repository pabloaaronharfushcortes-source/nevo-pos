'use client'

import { useState } from 'react'
import type { Barber, Service, QueueTicketWithRelations } from '@/types/app'
import { useQueue } from '@/hooks/useQueue'
import NewTicketModal from './NewTicketModal'

type Props = {
  tenantId: string
  initialTickets: QueueTicketWithRelations[]
  barbers: Barber[]
  services: Service[]
}

type StatusConfig = {
  label: string
  badge: string
  nextStatus: string
  nextLabel: string
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  waiting: {
    label: 'En espera',
    badge: 'bg-blue-100 text-blue-700',
    nextStatus: 'called',
    nextLabel: 'Llamar',
  },
  called: {
    label: 'Llamado',
    badge: 'bg-amber-100 text-amber-700',
    nextStatus: 'in_progress',
    nextLabel: 'Pasar',
  },
  in_progress: {
    label: 'En progreso',
    badge: 'bg-orange-100 text-orange-700',
    nextStatus: 'completed',
    nextLabel: 'Completar',
  },
}

const STATUS_ORDER = ['waiting', 'called', 'in_progress']

export default function QueueBoard({ tenantId, initialTickets, barbers, services }: Props) {
  const { tickets, loading, refresh } = useQueue(tenantId, initialTickets)
  const [showNewModal, setShowNewModal] = useState(false)
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function updateStatus(ticketId: string, status: string) {
    setActionLoading(ticketId)
    try {
      await fetch(`/api/queue/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await refresh()
    } finally {
      setActionLoading(null)
      setConfirmCancelId(null)
    }
  }

  const counts = {
    waiting: tickets.filter(t => t.status === 'waiting').length,
    called: tickets.filter(t => t.status === 'called').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-3 bg-white border-b">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          {STATUS_ORDER.map(s => (
            <span key={s} className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[s]?.badge ?? ''}`}>
              {STATUS_CONFIG[s]?.label}: {counts[s as keyof typeof counts]}
            </span>
          ))}
          {loading && <span className="text-xs text-gray-400">Actualizando…</span>}
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
        >
          + Nueva ficha
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <p className="text-lg">No hay fichas activas</p>
            <p className="text-sm mt-1">Crea una ficha para comenzar</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl">
            {STATUS_ORDER.flatMap(status =>
              tickets
                .filter(t => t.status === status)
                .sort((a, b) => a.ticket_number - b.ticket_number)
                .map(ticket => {
                  const cfg = STATUS_CONFIG[ticket.status]
                  const isActioning = actionLoading === ticket.id

                  return (
                    <div
                      key={ticket.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border bg-white ${
                        ticket.status === 'called' ? 'border-amber-200 bg-amber-50' :
                        ticket.status === 'in_progress' ? 'border-orange-200 bg-orange-50' :
                        'border-gray-200'
                      }`}
                    >
                      {/* Número */}
                      <span className="text-3xl font-bold tabular-nums text-gray-900 w-12 text-center">
                        {String(ticket.ticket_number).padStart(2, '0')}
                      </span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg?.badge ?? ''}`}>
                            {cfg?.label}
                          </span>
                          <span className="text-xs text-gray-400">{ticket.source}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">
                          {ticket.client?.name ?? 'Walk-in anónimo'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {ticket.barber?.name ?? '—'}
                          {ticket.service && ` · ${ticket.service.name}`}
                          {' · '}
                          {new Date(ticket.estimated_start_at).toLocaleTimeString('es-MX', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {confirmCancelId === ticket.id ? (
                          <>
                            <span className="text-xs text-gray-500">¿Cancelar?</span>
                            <button
                              onClick={() => updateStatus(ticket.id, 'cancelled')}
                              disabled={isActioning}
                              className="px-2.5 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setConfirmCancelId(null)}
                              className="px-2.5 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <>
                            {cfg && (
                              <button
                                onClick={() => updateStatus(ticket.id, cfg.nextStatus)}
                                disabled={isActioning}
                                className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
                              >
                                {isActioning ? '…' : cfg.nextLabel}
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmCancelId(ticket.id)}
                              className="px-2.5 py-1.5 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        )}
      </div>

      {showNewModal && (
        <NewTicketModal
          barbers={barbers}
          services={services}
          onClose={() => setShowNewModal(false)}
          onCreated={() => {
            setShowNewModal(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}
