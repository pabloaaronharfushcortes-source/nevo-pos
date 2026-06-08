'use client'

import { useState } from 'react'
import type { CashRegister } from '@/types/app'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { toast } from '@/hooks/useToast'

type Props = {
  activeRegister: CashRegister | null
  onOpened: (register: CashRegister) => void
  onClosed: (register: CashRegister) => void
}

export default function CashRegisterWidget({ activeRegister, onOpened, onClosed }: Props) {
  const [showOpenForm, setShowOpenForm] = useState(false)
  const [showCloseForm, setShowCloseForm] = useState(false)
  const [openingAmount, setOpeningAmount] = useState('')
  const [closingAmount, setClosingAmount] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingClose, setConfirmingClose] = useState(false)

  async function handleOpen() {
    const amount = parseFloat(openingAmount)
    if (isNaN(amount) || amount < 0) { setError('Ingresa un monto válido'); return }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pos/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opening_amount: amount, notes: formNotes.trim() || undefined }),
      })
      const data: CashRegister | { error: string } = await res.json()
      if (!res.ok || 'error' in data) {
        setError('error' in data ? data.error : 'Error al abrir turno')
        toast.error('Algo salió mal. Intenta de nuevo.')
        return
      }
      setShowOpenForm(false)
      setOpeningAmount('')
      setFormNotes('')
      toast.success('Turno de caja iniciado')
      onOpened(data)
    } catch {
      setError('Error de conexión')
      toast.error('Algo salió mal. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Valida el monto y abre el modal de confirmación antes de cerrar el turno
  function requestClose() {
    const amount = parseFloat(closingAmount)
    if (isNaN(amount) || amount < 0) { setError('Ingresa el monto en caja'); return }
    setError(null)
    setConfirmingClose(true)
  }

  async function handleClose() {
    if (!activeRegister) return
    const amount = parseFloat(closingAmount)
    if (isNaN(amount) || amount < 0) { setError('Ingresa el monto en caja'); return }

    setConfirmingClose(false)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/pos/cash-register/${activeRegister.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closing_amount: amount, notes: formNotes.trim() || undefined }),
      })
      const data: CashRegister | { error: string } = await res.json()
      if (!res.ok || 'error' in data) {
        setError('error' in data ? data.error : 'Error al cerrar turno')
        toast.error('Algo salió mal. Intenta de nuevo.')
        return
      }
      setShowCloseForm(false)
      setClosingAmount('')
      setFormNotes('')
      toast.success('Turno de caja cerrado')
      onClosed(data)
    } catch {
      setError('Error de conexión')
      toast.error('Algo salió mal. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (activeRegister) {
    const openedAt = new Date(activeRegister.opened_at).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    })

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Turno abierto</p>
            <p className="text-sm text-green-800 mt-0.5">
              Apertura: <span className="font-semibold">${activeRegister.opening_amount.toFixed(2)}</span>
              {' · '}
              Desde: <span className="font-semibold">{openedAt}</span>
            </p>
          </div>
          <button
            onClick={() => { setShowCloseForm(v => !v); setError(null) }}
            className="text-xs px-3 py-1.5 border border-green-300 text-green-700 rounded hover:bg-green-100 transition-colors flex-shrink-0"
          >
            Cerrar turno
          </button>
        </div>

        {showCloseForm && (
          <div className="mt-3 pt-3 border-t border-green-200 flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-xs text-green-700 font-medium block mb-1">Monto en caja</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-green-600">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={closingAmount}
                  onChange={e => setClosingAmount(e.target.value)}
                  className="w-28 border border-green-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-400 bg-white"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 min-w-40">
              <label className="text-xs text-green-700 font-medium block mb-1">Notas</label>
              <input
                type="text"
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                className="w-full border border-green-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-400 bg-white"
                placeholder="Opcional…"
              />
            </div>
            <button
              onClick={requestClose}
              disabled={loading}
              className="px-4 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Cerrando…' : 'Confirmar cierre'}
            </button>
            {error && <p className="w-full text-xs text-red-600">{error}</p>}
          </div>
        )}

        <ConfirmModal
          isOpen={confirmingClose}
          title="Cerrar turno de caja"
          description="Se cerrará el turno y se calculará la diferencia contra lo esperado. No se puede reabrir."
          confirmLabel="Sí, cerrar caja"
          cancelLabel="Cancelar"
          variant="danger"
          onConfirm={handleClose}
          onCancel={() => setConfirmingClose(false)}
        />
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Sin turno activo</p>
          <p className="text-sm text-amber-800 mt-0.5">Abre el turno para comenzar a cobrar</p>
        </div>
        <button
          onClick={() => { setShowOpenForm(v => !v); setError(null) }}
          className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors flex-shrink-0"
        >
          Abrir turno
        </button>
      </div>

      {showOpenForm && (
        <div className="mt-3 pt-3 border-t border-amber-200 flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-amber-700 font-medium block mb-1">Efectivo en caja</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-amber-600">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={openingAmount}
                onChange={e => setOpeningAmount(e.target.value)}
                className="w-28 border border-amber-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 min-w-40">
            <label className="text-xs text-amber-700 font-medium block mb-1">Notas</label>
            <input
              type="text"
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              className="w-full border border-amber-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
              placeholder="Opcional…"
            />
          </div>
          <button
            onClick={handleOpen}
            disabled={loading}
            className="px-4 py-1.5 bg-gray-900 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Abriendo…' : 'Confirmar apertura'}
          </button>
          {error && <p className="w-full text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}
