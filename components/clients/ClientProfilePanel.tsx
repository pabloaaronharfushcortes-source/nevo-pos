'use client'

import { useState } from 'react'
import type { Barber, Client, ClientWithProfile, VisitEntry } from '@/types/app'
import ClientModal from './ClientModal'

type Props = {
  profile: ClientWithProfile
  barbers: Barber[]
  onUpdated: (client: Client) => void
}

const CLASSIFICATION_STYLE: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  recurrent: 'bg-blue-100 text-blue-700',
  vip: 'bg-amber-100 text-amber-700',
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

const STATUS_STYLE: Record<string, string> = {
  completed: 'text-green-600',
  paid: 'text-green-600',
  no_show: 'text-red-500',
  cancelled: 'text-gray-400',
  confirmed: 'text-blue-600',
  pending: 'text-gray-500',
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
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Tarjeta de lealtad</p>
        {cycles > 0 && (
          <span className="text-xs text-gray-500">{cycles} {cycles === 1 ? 'ciclo' : 'ciclos'} completado{cycles !== 1 ? 's' : ''}</span>
        )}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: STAMPS_GOAL }).map((_, i) => (
          <div
            key={i}
            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs transition-colors ${
              i < filled
                ? 'bg-gray-900 border-gray-900 text-white'
                : 'border-gray-300 text-gray-300'
            }`}
          >
            {i < filled ? '✓' : ''}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">
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
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-shrink-0 text-right">
        <p className="text-xs text-gray-500">{dateStr}</p>
        <p className="text-xs text-gray-400">{timeStr}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 truncate">{entry.services.join(', ')}</p>
        {entry.barber_name && (
          <p className="text-xs text-gray-500">{entry.barber_name}</p>
        )}
      </div>
      <div className="flex-shrink-0 text-right">
        {entry.total !== null && (
          <p className="text-sm font-medium text-gray-900">${entry.total.toFixed(2)}</p>
        )}
        <p className={`text-xs ${STATUS_STYLE[entry.status] ?? 'text-gray-400'}`}>
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
      <div className="px-6 py-5 border-b bg-white flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CLASSIFICATION_STYLE[profile.classification] ?? ''}`}>
                {CLASSIFICATION_LABEL[profile.classification] ?? profile.classification}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {profile.phone && (
                <span className="text-sm text-gray-500">{profile.phone}</span>
              )}
              {profile.email && (
                <span className="text-sm text-gray-500">{profile.email}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors flex-shrink-0"
          >
            Editar
          </button>
        </div>
      </div>

      <div className="px-6 py-4 space-y-6">
        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-center">
            <p className="text-2xl font-bold text-gray-900">{profile.loyalty_stamps}</p>
            <p className="text-xs text-gray-500 mt-0.5">sellos</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-center">
            <p className="text-2xl font-bold text-gray-900">${profile.total_spent.toFixed(0)}</p>
            <p className="text-xs text-gray-500 mt-0.5">total gastado</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-center">
            <p className="text-sm font-bold text-gray-900 leading-tight mt-1">{lastVisit}</p>
            <p className="text-xs text-gray-500 mt-0.5">última visita</p>
          </div>
        </div>

        {/* Tarjeta de lealtad */}
        <StampsCard stamps={profile.loyalty_stamps} />

        {/* Preferencias */}
        <div className="space-y-3">
          {profile.preferred_barber && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Barbero preferido</p>
              <p className="text-sm text-gray-900">{profile.preferred_barber.name}</p>
            </div>
          )}
          {profile.whatsapp_id && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">WhatsApp ID</p>
              <p className="text-sm text-gray-900 font-mono">{profile.whatsapp_id}</p>
            </div>
          )}
          {profile.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notas</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{profile.notes}</p>
            </div>
          )}
        </div>

        {/* Historial */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Historial de visitas
            {profile.visit_history.length > 0 && (
              <span className="text-gray-400 normal-case font-normal ml-1">
                ({profile.visit_history.length})
              </span>
            )}
          </p>
          {profile.visit_history.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Sin visitas registradas</p>
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
