'use client'

import { useState } from 'react'
import type { Barber, Client, ClientWithProfile, VisitEntry } from '@/types/app'
import ClientModal from './ClientModal'

type Props = {
  profile: ClientWithProfile
  barbers: Barber[]
  onUpdated: (client: Client) => void
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

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  clip: 'Clip',
  getnet: 'Getnet',
  transfer: 'Transferencia',
}

// Color del estado de cada entrada del historial
const STATUS_COLOR: Record<string, string> = {
  completed: '#7FA86B',
  paid: '#7FA86B',
  no_show: '#E05252',
  cancelled: 'var(--ink-muted)',
  confirmed: 'var(--brass)',
  pending: 'var(--ink-secondary)',
}

const STATUS_LABEL: Record<string, string> = {
  completed: 'Completada',
  paid: 'Pagada',
  no_show: 'No llegó',
  cancelled: 'Cancelada',
  confirmed: 'Confirmada',
  pending: 'Pendiente',
}

const STAMPS_GOAL = 10

function StampsCard({ stamps }: { stamps: number }) {
  const filled = Math.min(stamps % STAMPS_GOAL === 0 && stamps > 0 ? STAMPS_GOAL : stamps % STAMPS_GOAL, STAMPS_GOAL)
  const cycles = Math.floor(stamps / STAMPS_GOAL)
  const hasReward = stamps > 0 && stamps % STAMPS_GOAL === 0

  return (
    <div className="p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="label-caps">Tarjeta de lealtad</p>
        {cycles > 0 && (
          <span className="text-2xs" style={{ color: 'var(--brass-muted)' }}>
            {cycles} {cycles === 1 ? 'ciclo' : 'ciclos'} completado{cycles !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: STAMPS_GOAL }).map((_, i) => (
          <div
            key={i}
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors"
            style={
              i < filled
                ? { background: 'var(--brass)', border: '2px solid var(--brass)', color: '#0C0A09' }
                : { border: '2px solid var(--border-strong)', color: 'var(--ink-muted)' }
            }
          >
            {i < filled ? '✓' : ''}
          </div>
        ))}
      </div>
      <p className="text-2xs mt-3 uppercase tracking-wide" style={{ color: hasReward ? 'var(--brass)' : 'var(--ink-muted)' }}>
        {hasReward
          ? '¡Recompensa disponible! 🎉'
          : `${filled} de ${STAMPS_GOAL} sellos · faltan ${STAMPS_GOAL - filled}`}
      </p>
    </div>
  )
}

function VisitRow({ entry }: { entry: VisitEntry }) {
  const date = new Date(entry.date)
  const dateStr = date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="flex-shrink-0 text-right w-16">
        <p className="num text-2xs" style={{ color: 'var(--ink-secondary)' }}>{dateStr}</p>
        <p className="num text-2xs" style={{ color: 'var(--ink-muted)' }}>{timeStr}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: 'var(--ink-primary)' }}>{entry.services.join(', ')}</p>
        {entry.barber_name && (
          <p className="text-2xs" style={{ color: 'var(--ink-muted)' }}>{entry.barber_name}</p>
        )}
      </div>
      <div className="flex-shrink-0 text-right">
        {entry.total !== null && (
          <p className="num text-sm font-medium" style={{ color: 'var(--ink-primary)' }}>${entry.total.toFixed(2)}</p>
        )}
        <p className="text-2xs uppercase tracking-wide" style={{ color: STATUS_COLOR[entry.status] ?? 'var(--ink-muted)' }}>
          {entry.type === 'sale' && entry.payment_method
            ? PAYMENT_LABEL[entry.payment_method] ?? entry.payment_method
            : STATUS_LABEL[entry.status] ?? entry.status}
        </p>
      </div>
    </div>
  )
}

export default function ClientProfilePanel({ profile, barbers, onUpdated }: Props) {
  const [showEdit, setShowEdit] = useState(false)

  const lastVisit = profile.last_visit_at
    ? new Date(profile.last_visit_at).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : 'Sin visitas'

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div
        className="px-6 py-5 flex-shrink-0 border-b"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-xl font-medium" style={{ color: 'var(--ink-primary)' }}>{profile.name}</h2>
              <span className={BADGE_CLASS[profile.classification] ?? 'badge-new'}>
                {CLASSIFICATION_LABEL[profile.classification] ?? profile.classification}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {profile.phone && (
                <span className="num text-sm" style={{ color: 'var(--ink-secondary)' }}>{profile.phone}</span>
              )}
              {profile.email && (
                <span className="text-sm" style={{ color: 'var(--ink-secondary)' }}>{profile.email}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="text-xs uppercase tracking-wide px-3 py-1.5 transition-colors flex-shrink-0"
            style={{ border: '1px solid var(--border-default)', color: 'var(--ink-secondary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)' }}
          >
            Editar
          </button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)' }}>
            <p className="num text-2xl font-medium" style={{ color: 'var(--ink-primary)' }}>{profile.loyalty_stamps}</p>
            <p className="label-caps mt-1">sellos</p>
          </div>
          <div className="p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)' }}>
            <p className="num text-2xl font-medium" style={{ color: 'var(--brass)' }}>${profile.total_spent.toFixed(0)}</p>
            <p className="label-caps mt-1">total gastado</p>
          </div>
          <div className="p-3 text-center flex flex-col justify-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)' }}>
            <p className="text-sm font-medium leading-tight" style={{ color: 'var(--ink-primary)' }}>{lastVisit}</p>
            <p className="label-caps mt-1">última visita</p>
          </div>
        </div>

        {/* Tarjeta de lealtad */}
        <StampsCard stamps={profile.loyalty_stamps} />

        {/* Preferencias */}
        <div className="space-y-4">
          {profile.preferred_barber && (
            <div>
              <p className="label-caps mb-1">Barbero preferido</p>
              <p className="text-sm" style={{ color: 'var(--ink-primary)' }}>{profile.preferred_barber.name}</p>
            </div>
          )}
          {profile.whatsapp_id && (
            <div>
              <p className="label-caps mb-1">WhatsApp ID</p>
              <p className="num text-sm" style={{ color: 'var(--ink-primary)' }}>{profile.whatsapp_id}</p>
            </div>
          )}
          {profile.notes && (
            <div>
              <p className="label-caps mb-1">Notas</p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--ink-secondary)' }}>{profile.notes}</p>
            </div>
          )}
        </div>

        {/* Historial */}
        <div>
          <p className="label-caps mb-3">
            Historial de visitas
            {profile.visit_history.length > 0 && (
              <span className="normal-case ml-1" style={{ color: 'var(--ink-muted)', letterSpacing: 0 }}>
                ({profile.visit_history.length})
              </span>
            )}
          </p>
          {profile.visit_history.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--ink-muted)' }}>Sin visitas registradas</p>
          ) : (
            <div>
              {profile.visit_history.map(entry => (
                <VisitRow key={`${entry.type}-${entry.id}`} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <ClientModal
          barbers={barbers}
          client={profile}
          onClose={() => setShowEdit(false)}
          onSaved={updated => {
            setShowEdit(false)
            onUpdated(updated)
          }}
        />
      )}
    </div>
  )
}
