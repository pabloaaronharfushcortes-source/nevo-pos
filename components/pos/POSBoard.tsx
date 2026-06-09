'use client'

import { useState } from 'react'
import { Receipt } from 'lucide-react'
import type { Barber, Service, Product, SaleWithRelations, CashRegister } from '@/types/app'
import CashRegisterWidget from './CashRegisterWidget'
import SaleModal from './SaleModal'
import { EmptyState } from '@/components/ui/EmptyState'

type Props = {
  tenantId: string
  barbers: Barber[]
  services: Service[]
  products: Product[]
  initialSales: SaleWithRelations[]
  initialRegister: CashRegister | null
}

type ModalContext = {
  preselectedBarberId?: string
  clientId?: string
  clientName?: string
  queueTicketId?: string
  appointmentId?: string
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  clip: 'Clip',
  getnet: 'Getnet',
  transfer: 'Transferencia',
}

export default function POSBoard({
  barbers,
  services,
  products,
  initialSales,
  initialRegister,
}: Props) {
  const [sales, setSales] = useState<SaleWithRelations[]>(initialSales)
  const [register, setRegister] = useState<CashRegister | null>(initialRegister)
  const [modalCtx, setModalCtx] = useState<ModalContext | null>(null)

  function handleSaved(sale: SaleWithRelations) {
    setSales(prev => [sale, ...prev])
    setModalCtx(null)
  }

  const totalHoy = sales.reduce((sum, s) => sum + s.total, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b flex-shrink-0" style={{ background: '#FFFFFF', borderColor: '#EDEDED' }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold" style={{ color: '#0E0D1A' }}>POS</h1>
            <p className="text-sm mt-0.5" style={{ color: '#6B6B8A' }}>
              {sales.length} {sales.length === 1 ? 'venta' : 'ventas'} hoy · Total: <span className="font-semibold tabular-nums" style={{ color: '#0E0D1A' }}>${totalHoy.toFixed(2)}</span>
            </p>
          </div>
          <button
            onClick={() => setModalCtx({})}
            className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors"
            style={{ background: '#FF6B6B' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E85555' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
          >
            + Nueva venta
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Turno de caja */}
        <CashRegisterWidget
          activeRegister={register}
          onOpened={setRegister}
          onClosed={() => setRegister(null)}
        />

        {/* Ventas del día */}
        {sales.length === 0 ? (
          <EmptyState
            icon={Receipt}
            message="No hay ventas registradas hoy"
            actionLabel="Nueva venta"
            onAction={() => setModalCtx({})}
          />
        ) : (
          <div className="space-y-2 max-w-2xl">
            {sales.map(sale => (
              <div
                key={sale.id}
                className="flex items-start gap-4 p-4 bg-white rounded-xl border-[1.5px]"
                style={{ borderColor: '#EDEDED' }}
              >
                {/* Hora */}
                <span className="text-sm tabular-nums flex-shrink-0 pt-0.5" style={{ color: '#9B9BB0' }}>
                  {new Date(sale.created_at).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: '#0E0D1A' }}>
                      {sale.client?.name ?? 'Walk-in anónimo'}
                    </span>
                    <span className="text-xs" style={{ color: '#D4D4E0' }}>·</span>
                    <span className="text-xs" style={{ color: '#6B6B8A' }}>{sale.barber?.name ?? '—'}</span>
                  </div>
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#6B6B8A' }}>
                    {sale.items.map(i => i.name).join(', ')}
                  </p>
                </div>

                {/* Pago y total */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums" style={{ color: '#0E0D1A' }}>
                    ${sale.total.toFixed(2)}
                  </p>
                  <span className="text-xs" style={{ color: '#9B9BB0' }}>
                    {METHOD_LABEL[sale.payment_method] ?? sale.payment_method}
                    {sale.tip > 0 && (
                      <span style={{ color: '#FF6B6B' }}> · propina ${sale.tip.toFixed(2)}</span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalCtx !== null && (
        <SaleModal
          barbers={barbers}
          services={services}
          products={products}
          preselectedBarberId={modalCtx.preselectedBarberId}
          clientId={modalCtx.clientId}
          clientName={modalCtx.clientName}
          queueTicketId={modalCtx.queueTicketId}
          appointmentId={modalCtx.appointmentId}
          cashRegisterId={register?.id ?? null}
          onClose={() => setModalCtx(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
