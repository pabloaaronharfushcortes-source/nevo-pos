'use client'

import { useState } from 'react'
import type { Barber, Service, Product, SaleWithRelations } from '@/types/app'
import { toast } from '@/hooks/useToast'

type LineItem = {
  tempId: string
  type: 'service' | 'product'
  serviceId?: string
  productId?: string
  name: string
  price: number
  quantity: number
  maxStock?: number // tope de cantidad para productos (stock disponible)
}

type Props = {
  barbers: Barber[]
  services: Service[]
  products?: Product[]
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

// Propinas rápidas como % del subtotal de servicio
const TIP_PRESETS = [0, 10, 15, 20] as const

let tempCounter = 0
const nextId = () => String(++tempCounter)

function buildInitialItems(
  initialItems?: Props['initialItems']
): LineItem[] {
  if (!initialItems?.length) return []
  return initialItems.map(item => ({
    tempId: nextId(),
    type: 'service' as const,
    serviceId: item.serviceId,
    name: item.name,
    price: item.price,
    quantity: 1,
  }))
}

export default function SaleModal({
  barbers,
  services,
  products = [],
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
  const [tip, setTip] = useState(0)
  const [tipPreset, setTipPreset] = useState<number | null>(0)
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showServicePicker, setShowServicePicker] = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(false)

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const serviceTotal = Math.max(0, subtotal - discount)
  const total = Math.round((serviceTotal + tip) * 100) / 100

  function applyTipPreset(pct: number) {
    setTipPreset(pct)
    setTip(Math.round(serviceTotal * (pct / 100) * 100) / 100)
  }

  function setCustomTip(value: number) {
    setTipPreset(null)
    setTip(Math.max(0, value))
  }

  function addService(service: Service) {
    setItems(prev => [
      ...prev,
      { tempId: nextId(), type: 'service', serviceId: service.id, name: service.name, price: service.price, quantity: 1 },
    ])
    setShowServicePicker(false)
  }

  function addProduct(product: Product) {
    // Si ya está en el carrito, incrementa la cantidad (respetando stock)
    setItems(prev => {
      const existing = prev.find(i => i.type === 'product' && i.productId === product.id)
      if (existing) {
        const cap = existing.maxStock ?? Infinity
        return prev.map(i =>
          i.tempId === existing.tempId
            ? { ...i, quantity: Math.min(cap, i.quantity + 1) }
            : i,
        )
      }
      return [
        ...prev,
        {
          tempId: nextId(),
          type: 'product' as const,
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          maxStock: product.stock_quantity,
        },
      ]
    })
    setShowProductPicker(false)
  }

  function removeItem(tempId: string) {
    setItems(prev => prev.filter(i => i.tempId !== tempId))
  }

  function changeQty(tempId: string, delta: number) {
    setItems(prev =>
      prev.map(i => {
        if (i.tempId !== tempId) return i
        const cap = i.type === 'product' ? i.maxStock ?? Infinity : Infinity
        return { ...i, quantity: Math.min(cap, Math.max(1, i.quantity + delta)) }
      })
    )
  }

  async function handleSubmit() {
    if (!selectedBarberId) { setError('Selecciona un barbero'); return }
    if (!items.length) { setError('Agrega al menos un artículo'); return }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId: selectedBarberId,
          items: items.map(i => ({
            type: i.type,
            serviceId: i.serviceId,
            productId: i.productId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
          discount,
          tip,
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

  const inputClass = 'w-full rounded-lg border-[1.5px] border-[#EDEDED] bg-[#FAFAFA] px-3 py-2 text-sm text-[#0E0D1A] focus:border-[#A259FF] focus:outline-none focus:ring-0 transition-colors'
  const labelClass = 'block text-xs font-medium mb-1.5'

  return (
    <div
      className="fixed inset-0 z-50 flex md:items-center md:justify-center items-end justify-center"
      style={{ background: 'rgba(14,13,26,0.40)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full md:max-w-lg md:mx-4 md:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: '#EDEDED' }}>
          <div>
            <h2 className="font-display text-xl font-semibold" style={{ color: '#0E0D1A' }}>
              {clientName ? clientName : 'Nueva venta'}
            </h2>
            {clientName && <p className="text-sm" style={{ color: '#6B6B8A' }}>Walk-in</p>}
          </div>
          <button
            onClick={onClose}
            className="text-xl leading-none transition-colors"
            style={{ color: '#9B9BB0' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#6B6B8A' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9B9BB0' }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Barbero */}
          <div>
            <label className={labelClass} style={{ color: '#0E0D1A' }}>Barbero</label>
            <select
              value={selectedBarberId}
              onChange={e => setSelectedBarberId(e.target.value)}
              disabled={!!preselectedBarberId}
              className={`${inputClass} disabled:opacity-60`}
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
              <label className="text-xs font-medium" style={{ color: '#0E0D1A' }}>Artículos</label>
              <div className="flex items-center gap-2">
                {/* Picker de servicios */}
                <div className="relative">
                  <button
                    onClick={() => { setShowServicePicker(v => !v); setShowProductPicker(false) }}
                    className="text-xs px-2.5 py-1 rounded-md font-medium transition-colors"
                    style={{ background: '#F0E6FF', color: '#8B3FFF' }}
                  >
                    + Servicio
                  </button>
                  {showServicePicker && (
                    <div
                      className="absolute right-0 top-7 z-10 bg-white rounded-lg shadow-lg w-56 py-1 max-h-48 overflow-y-auto border-[1.5px]"
                      style={{ borderColor: '#EDEDED' }}
                    >
                      {services.length === 0 && (
                        <p className="px-3 py-2 text-sm" style={{ color: '#9B9BB0' }}>Sin servicios</p>
                      )}
                      {services.map(s => (
                        <button
                          key={s.id}
                          onMouseDown={() => addService(s)}
                          className="w-full text-left px-3 py-2 text-sm flex justify-between transition-colors hover:bg-[#F5EEFF]"
                        >
                          <span style={{ color: '#0E0D1A' }}>{s.name}</span>
                          <span style={{ color: '#6B6B8A' }}>${s.price.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Picker de productos */}
                <div className="relative">
                  <button
                    onClick={() => { setShowProductPicker(v => !v); setShowServicePicker(false) }}
                    className="text-xs px-2.5 py-1 rounded-md font-medium transition-colors"
                    style={{ background: '#FFE8E8', color: '#E85555' }}
                  >
                    + Producto
                  </button>
                  {showProductPicker && (
                    <div
                      className="absolute right-0 top-7 z-10 bg-white rounded-lg shadow-lg w-60 py-1 max-h-48 overflow-y-auto border-[1.5px]"
                      style={{ borderColor: '#EDEDED' }}
                    >
                      {products.filter(p => p.is_active).length === 0 && (
                        <p className="px-3 py-2 text-sm" style={{ color: '#9B9BB0' }}>Sin productos</p>
                      )}
                      {products.filter(p => p.is_active).map(p => {
                        const out = p.stock_quantity <= 0
                        return (
                          <button
                            key={p.id}
                            disabled={out}
                            onMouseDown={() => { if (!out) addProduct(p) }}
                            className="w-full text-left px-3 py-2 text-sm flex justify-between items-center gap-2 transition-colors hover:bg-[#FFF0F0] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="flex-1 min-w-0 truncate" style={{ color: '#0E0D1A' }}>{p.name}</span>
                            <span
                              className="text-2xs tabular-nums flex-shrink-0"
                              style={{ color: out ? '#E85555' : '#9B9BB0' }}
                            >
                              {out ? 'Agotado' : `${p.stock_quantity} ${p.unit}`}
                            </span>
                            <span className="flex-shrink-0" style={{ color: '#6B6B8A' }}>${p.price.toFixed(2)}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {items.length === 0 ? (
              <p
                className="text-sm py-4 text-center border border-dashed rounded-lg"
                style={{ color: '#9B9BB0', borderColor: '#D4D4E0' }}
              >
                Sin artículos — agrega un servicio o producto
              </p>
            ) : (
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.tempId} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 flex items-center gap-1.5 min-w-0">
                      <span className="truncate" style={{ color: '#0E0D1A' }}>{item.name}</span>
                      {item.type === 'product' && (
                        <span
                          className="text-2xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
                          style={{ background: '#FFE8E8', color: '#E85555' }}
                        >
                          Producto
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => changeQty(item.tempId, -1)}
                        className="w-6 h-6 rounded border-[1.5px] text-xs flex items-center justify-center transition-colors hover:bg-[#FAFAFA]"
                        style={{ borderColor: '#EDEDED', color: '#6B6B8A' }}
                      >
                        −
                      </button>
                      <span className="w-5 text-center tabular-nums" style={{ color: '#0E0D1A' }}>{item.quantity}</span>
                      <button
                        onClick={() => changeQty(item.tempId, 1)}
                        className="w-6 h-6 rounded border-[1.5px] text-xs flex items-center justify-center transition-colors hover:bg-[#FAFAFA]"
                        style={{ borderColor: '#EDEDED', color: '#6B6B8A' }}
                      >
                        +
                      </button>
                    </div>
                    <span className="w-20 text-right tabular-nums" style={{ color: '#0E0D1A' }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeItem(item.tempId)}
                      className="text-base leading-none flex-shrink-0 transition-colors"
                      style={{ color: '#D4D4E0' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#E85555' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#D4D4E0' }}
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
            <label className="text-xs font-medium w-24 flex-shrink-0" style={{ color: '#0E0D1A' }}>Descuento</label>
            <div className="flex items-center gap-1">
              <span className="text-sm" style={{ color: '#6B6B8A' }}>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount || ''}
                onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 rounded-lg border-[1.5px] border-[#EDEDED] bg-[#FAFAFA] px-2 py-1.5 text-sm focus:border-[#A259FF] focus:outline-none focus:ring-0 transition-colors"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Propina */}
          <div>
            <label className={labelClass} style={{ color: '#0E0D1A' }}>Propina</label>
            <div className="flex items-center gap-2 flex-wrap">
              {TIP_PRESETS.map(pct => {
                const active = tipPreset === pct
                return (
                  <button
                    key={pct}
                    onClick={() => applyTipPreset(pct)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border-[1.5px]"
                    style={
                      active
                        ? { background: '#FF6B6B', color: '#FFFFFF', borderColor: '#FF6B6B' }
                        : { background: '#FFFFFF', color: '#6B6B8A', borderColor: '#EDEDED' }
                    }
                  >
                    {pct === 0 ? 'Sin propina' : `${pct}%`}
                  </button>
                )
              })}
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-sm" style={{ color: '#6B6B8A' }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tip || ''}
                  onChange={e => setCustomTip(parseFloat(e.target.value) || 0)}
                  className="w-24 rounded-lg border-[1.5px] border-[#EDEDED] bg-[#FAFAFA] px-2 py-1.5 text-sm focus:border-[#A259FF] focus:outline-none focus:ring-0 transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: '#0E0D1A' }}>Método de pago</label>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map(m => {
                const active = paymentMethod === m.value
                return (
                  <button
                    key={m.value}
                    onClick={() => setPaymentMethod(m.value)}
                    className="py-2 px-1 rounded-lg border-[1.5px] text-xs font-medium transition-colors"
                    style={
                      active
                        ? { background: '#0E0D1A', color: '#FFFFFF', borderColor: '#0E0D1A' }
                        : { background: '#FFFFFF', color: '#6B6B8A', borderColor: '#EDEDED' }
                    }
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          {showReference && (
            <div>
              <label className={labelClass} style={{ color: '#0E0D1A' }}>Referencia de pago</label>
              <input
                type="text"
                value={paymentReference}
                onChange={e => setPaymentReference(e.target.value)}
                className={inputClass}
                placeholder="Número de autorización o folio…"
              />
            </div>
          )}

          {/* Notas */}
          <div>
            <label className={labelClass} style={{ color: '#0E0D1A' }}>Notas</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={inputClass}
              placeholder="Opcional…"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex-shrink-0 space-y-2" style={{ borderColor: '#EDEDED', background: '#FAFAFA' }}>
          {/* Totales */}
          <div className="flex justify-between text-sm">
            <span style={{ color: '#6B6B8A' }}>Subtotal</span>
            <span className="tabular-nums" style={{ color: '#0E0D1A' }}>${subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm" style={{ color: '#8B3FFF' }}>
              <span>Descuento</span>
              <span className="tabular-nums">-${discount.toFixed(2)}</span>
            </div>
          )}
          {tip > 0 && (
            <div className="flex justify-between text-sm" style={{ color: '#6B6B8A' }}>
              <span>Propina</span>
              <span className="tabular-nums">+${tip.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold border-t pt-2" style={{ borderColor: '#EDEDED', color: '#0E0D1A' }}>
            <span>Total</span>
            <span className="tabular-nums">${total.toFixed(2)}</span>
          </div>

          {error && <p className="text-sm" style={{ color: '#E85555' }}>{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border-[1.5px] text-sm font-medium transition-colors"
              style={{ borderColor: '#EDEDED', color: '#6B6B8A' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FFFFFF' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !items.length || !selectedBarberId}
              className="flex-1 py-2.5 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              style={{ background: '#FF6B6B' }}
              onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLElement).style.background = '#E85555' }}
              onMouseLeave={e => { if (!submitting) (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
            >
              {submitting ? 'Guardando…' : `Cobrar $${total.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
