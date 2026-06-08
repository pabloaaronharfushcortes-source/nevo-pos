'use client'

import { useState } from 'react'
import { ListChecks } from 'lucide-react'
import type { Barber, Service, QueueTicketWithRelations } from '@/types/app'
import { useQueue } from '@/hooks/useQueue'
import NewTicketModal from './NewTicketModal'
import SaleModal from '@/components/pos/SaleModal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { SkeletonList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'

type Props = {
  tenantId: string
  initialTickets: QueueTicketWithRelations[]
  barbers: Barber[]
  services: Service[]
}

type StatusConfig = {
  label: string
  badgeBg: string
  badgeText: string
  cardBg: string
  cardBorder: string
  nextStatus: string
  nextLabel: string
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  waiting: {
    label: 'En espera',
    badgeBg: '#F0E6FF',
    badgeText: '#8B3FFF',
    cardBg: '#FFFFFF',
    cardBorder: '#EDEDED',
    nextStatus: 'called',
    nextLabel: 'Llamar',
  },
  called: {
    label: 'Llamado',
    badgeBg: '#FFE8E8',
    badgeText: '#E85555',
    cardBg: '#FFF6F6',
    cardBorder: '#FFD9D9',
    nextStatus: 'in_progress',
    nextLabel: 'Pasar',
  },
  in_progress: {
    label: 'En progreso',
    badgeBg: '#D7F8F2',
    badgeText: '#0F9B8A',
    cardBg: '#F4FBFA',
    cardBorder: '#BFEEE6',
    nextStatus: 'completed',
    nextLabel: 'Completar',
  },
}

const STATUS_ORDER = ['waiting', 'called', 'in_progress']

// Estimación de espera para fichas en cola (relativo a ahora)
function waitLabel(ticket: QueueTicketWithRelations): string | null {
  if (ticket.status !== 'waiting') return null
  const mins = Math.round((new Date(ticket.estimated_start_at).getTime() - Date.now()) / 60_000)
  if (mins <= 0) return 'Disponible ahora'
  if (mins < 60) return `~${mins} min de espera`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `~${h}h ${m}m de espera` : `~${h}h de espera`
}

type SaleContext = {
  ticketId: string
  barberId: string
  barberName: string
  clientId?: string
  clientName?: string
  serviceId?: string
  serviceName?: string
  servicePrice?: number
}

export default function QueueBoard({ tenantId, initialTickets, barbers, services }: Props) {
  const { tickets, loading, error, refresh } = useQueue(tenantId, initialTickets)
  const [showNewModal, setShowNewModal] = useState(false)
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [saleCtx, setSaleCtx] = useState<SaleContext | null>(null)

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
      <div
        className="flex items-center gap-4 px-3 md:px-6 py-3 border-b"
        style={{ background: '#FFFFFF', borderColor: '#EDEDED' }}
      >
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          {STATUS_ORDER.map(s => {
            const cfg = STATUS_CONFIG[s]
            return (
              <span
                key={s}
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: cfg.badgeBg, color: cfg.badgeText }}
              >
                {cfg.label}: {counts[s as keyof typeof counts]}
              </span>
            )
          })}
          {loading && <span className="text-xs" style={{ color: '#9B9BB0' }}>Actualizando…</span>}
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors"
          style={{ background: '#FF6B6B' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E85555' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
        >
          + Nueva ficha
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4">
        {loading && tickets.length === 0 ? (
          <SkeletonList rows={5} />
        ) : error && tickets.length === 0 ? (
          <ErrorState onRetry={refresh} />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            message="No hay fichas activas en este momento"
            actionLabel="Crear ficha"
            onAction={() => setShowNewModal(true)}
          />
        ) : (
          <div className="space-y-2 max-w-2xl">
            {STATUS_ORDER.flatMap(status =>
              tickets
                .filter(t => t.status === status)
                .sort((a, b) => a.ticket_number - b.ticket_number)
                .map(ticket => {
                  const cfg = STATUS_CONFIG[ticket.status]
                  const isActioning = actionLoading === ticket.id
                  const wait = waitLabel(ticket)

                  return (
                    <div
                      key={ticket.id}
                      className="flex items-center gap-4 p-4 rounded-xl border-[1.5px]"
                      style={{ background: cfg?.cardBg ?? '#FFFFFF', borderColor: cfg?.cardBorder ?? '#EDEDED' }}
                    >
                      {/* Número */}
                      <span
                        className="text-3xl font-bold tabular-nums w-12 text-center flex-shrink-0"
                        style={{ color: '#0E0D1A' }}
                      >
                        {String(ticket.ticket_number).padStart(2, '0')}
                      </span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: cfg?.badgeBg, color: cfg?.badgeText }}
                          >
                            {cfg?.label}
                          </span>
                          <span className="text-xs" style={{ color: '#9B9BB0' }}>{ticket.source}</span>
                          {wait && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                              style={{ background: '#F5F5F7', color: '#6B6B8A' }}
                            >
                              {wait}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium mt-1" style={{ color: '#0E0D1A' }}>
                          {ticket.client?.name ?? 'Walk-in anónimo'}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#6B6B8A' }}>
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
                        {ticket.status === 'in_progress' && (
                          <button
                            onClick={() => {
                              const svc = ticket.service
                                ? services.find(s => s.id === ticket.service!.id)
                                : undefined
                              setSaleCtx({
                                ticketId: ticket.id,
                                barberId: ticket.barber_id,
                                barberName: ticket.barber?.name ?? '',
                                clientId: ticket.client?.id,
                                clientName: ticket.client?.name,
                                serviceId: ticket.service?.id,
                                serviceName: ticket.service?.name,
                                servicePrice: svc?.price,
                              })
                            }}
                            disabled={!!actionLoading}
                            className="px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50 transition-colors"
                            style={{ background: '#FF6B6B' }}
                            onMouseEnter={e => { if (!actionLoading) (e.currentTarget as HTMLElement).style.background = '#E85555' }}
                            onMouseLeave={e => { if (!actionLoading) (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
                          >
                            Cobrar
                          </button>
                        )}
                        {cfg && (
                          <button
                            onClick={() => updateStatus(ticket.id, cfg.nextStatus)}
                            disabled={isActioning}
                            className="px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50 transition-colors"
                            style={{ background: '#A259FF' }}
                            onMouseEnter={e => { if (!isActioning) (e.currentTarget as HTMLElement).style.background = '#8B3FFF' }}
                            onMouseLeave={e => { if (!isActioning) (e.currentTarget as HTMLElement).style.background = '#A259FF' }}
                          >
                            {isActioning ? '…' : cfg.nextLabel}
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmCancelId(ticket.id)}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border-[1.5px] transition-colors"
                          style={{ color: '#E85555', borderColor: '#FFD9D9' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FFF0F0' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                        >
                          Cancelar
                        </button>
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

      {saleCtx !== null && (
        <SaleModal
          barbers={barbers}
          services={services}
          preselectedBarberId={saleCtx.barberId}
          initialItems={
            saleCtx.serviceId && saleCtx.serviceName && saleCtx.servicePrice !== undefined
              ? [{ serviceId: saleCtx.serviceId, name: saleCtx.serviceName, price: saleCtx.servicePrice }]
              : []
          }
          clientId={saleCtx.clientId}
          clientName={saleCtx.clientName}
          queueTicketId={saleCtx.ticketId}
          onClose={() => setSaleCtx(null)}
          onSaved={() => {
            setSaleCtx(null)
            refresh()
          }}
        />
      )}

      <ConfirmModal
        isOpen={confirmCancelId !== null}
        title="Cancelar ficha"
        description="La ficha saldrá de la cola. Esta acción no se puede deshacer."
        confirmLabel="Sí, cancelar ficha"
        cancelLabel="No"
        variant="danger"
        onConfirm={() => { if (confirmCancelId) updateStatus(confirmCancelId, 'cancelled') }}
        onCancel={() => setConfirmCancelId(null)}
      />
    </div>
  )
}
