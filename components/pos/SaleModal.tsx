'use client'

import { useState } from 'react'
import type { Barber, Service, SaleWithRelations } from '@/types/app'
import { toast } from '@/hooks/useToast'

type LineItem = {
  tempId: string
  serviceId?: string
  name: string
  price: number
  quantity: number
}

type Props = {
  barbers: Barber[]
  services: Service[]
  preselectedBarberId?: string
  initialItems?: Array<{ serviceId?: string; name: string; price: number }>
  clientId?: string
  clientName?: string
  queueTicketId?: string
  appointmentId?: string
  cashRegisterId?: string | null
  onClose: () => void
  onSaved: (sale: SaleWithRelations) => void
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'clip', label: 'Clip' },
  { value: 'getnet', label: 'Getnet' },
  { value: 'transfer', label: 'Transferencia' },
] as const

let tempCounter = 0
const nextId = () => String(++tempCounter)

function buildInitialItems(
  initialItems?: Props['initialItems']
): LineItem[] {
  if (!initialItems?.length) return []
  return initialItems.map(item => ({
    tempId: nextId(),
    serviceId: item.serviceId,
    name: item.name,
    price: item.price,
    quantity: 1,
  }))
}

export default function SaleModal({
  barbers,
  services,
  preselectedBarberId,
  initialItems,
  clientId,
  clientName,
  queueTicketId,
  appointmentId,
  cashRegisterId,
  onClose,
  onSaved,
}: Props) {
  const [selectedBarberId, setSelectedBarberId] = useState(preselectedBarberId ?? '')
  const [items, setItems] = useState<LineItem[]>(() => buildInitialItems(initialItems))
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showServicePicker, setShowServicePicker] = useState(false)

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = Math.max(0, subtotal - discount)

  function addService(service: Service) {
    setItems(prev => [
      ...prev,
      { tempId: nextId(), serviceId: service.id, name: service.name, price: service.price, quantity: 1 },
    ])
    setShowServicePicker(false)
  }

  function removeItem(tempId: string) {
    setItems(prev => prev.filter(i => i.tempId !== tempId))
  }

  function changeQty(tempId: string, delta: number) {
    setItems(prev =>
      prev.map(i => i.tempId === tempId
        ? { ...i, quantity: Math.max(1, i.quantity + delta) }
        : i
      )
    )
  }

  async function handleSubmit() {
    if (!selectedBarberId) { setError('Selecciona un barbero'); return }
    if (!items.length) { setError('Agrega al menos un servicio'); return }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId: selectedBarberId,
          items: items.map(i => ({
            serviceId: i.serviceId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
          discount,
          paymentMethod,
          paymentReference: paymentReference.trim() || undefined,
          notes: notes.trim() || undefined,
          clientId,
          queueTicketId,
          appointmentId,
          cashRegisterId: cashRegisterId ?? undefined,
        }),
      })

      const data: SaleWithRelations | { error: string } = await res.json()

      if (!res.ok || 'error' in data) {
        setError('error' in data ? data.error : 'Error al guardar')
        toast.error('Algo salió mal. Intenta de nuevo.')
        return
      }

      toast.success(`Venta registrada · $${total.toFixed(2)}`)
      onSaved(data)
    } catch {
      setError('Error de conexión')
      toast.error('Algo salió mal. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const showReference = paymentMethod !== 'cash'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {clientName ? clientName : 'Nueva venta'}
            </h2>
            {clientName && <p className="text-sm text-gray-500">Walk-in</p>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Barbero */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Barbero</label>
            <select
              value={selectedBarberId}
              onChange={e => setSelectedBarberId(e.target.value)}
              disabled={!!preselectedBarberId}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-50"
            >
              <option value="">Seleccionar barbero…</option>
              {barbers.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">Servicios</label>
              <div className="relative">
                <button
                  onClick={() => setShowServicePicker(v => !v)}
                  className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                >
                  + Agregar
                </button>
                {showServicePicker && (
                  <div className="absolute right-0 top-7 z-10 bg-white border border-gray-200 rounded-md shadow-lg w-56 py-1 max-h-48 overflow-y-auto">
                    {services.length === 0 && (
                      <p className="px-3 py-2 text-sm text-gray-400">Sin servicios</p>
                    )}
                    {services.map(s => (
                      <button
                        key={s.id}
                        onMouseDown={() => addService(s)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between"
                      >
                        <span>{s.name}</span>
                        <span className="text-gray-500">${s.price.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-md">
                Sin servicios — agrega uno
              </p>
            ) : (
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.tempId} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 text-gray-900">{item.name}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => changeQty(item.tempId, -1)}
                        className="w-6 h-6 rounded border border-gray-300 text-xs hover:bg-gray-50 flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="w-5 text-center tabular-nums">{item.quantity}</span>
                      <button
                        onClick={() => changeQty(item.tempId, 1)}
                        className="w-6 h-6 rounded border border-gray-300 text-xs hover:bg-gray-50 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                    <span className="w-20 text-right tabular-nums text-gray-700">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeItem(item.tempId)}
                      className="text-gray-300 hover:text-red-400 text-base leading-none flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Descuento */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-700 w-24 flex-shrink-0">Descuento</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount || ''}
                onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Método de pago</label>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={`py-2 px-1 rounded border text-xs font-medium transition-colors ${
                    paymentMethod === m.value
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {showReference && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Referencia de pago</label>
              <input
                type="text"
                value={paymentReference}
                onChange={e => setPaymentReference(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                placeholder="Número de autorización o folio…"
              />
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
              placeholder="Opcional…"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex-shrink-0 space-y-3">
          {/* Totales */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="tabular-nums">${subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento</span>
              <span className="tabular-nums">-${discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold border-t pt-2">
            <span>Total</span>
            <span className="tabular-nums">${total.toFixed(2)}</span>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !items.length || !selectedBarberId}
              className="flex-1 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Guardando…' : `Cobrar $${total.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
