'use client'

import { useState } from 'react'
import type { Barber, Service, SaleWithRelations, CashRegister } from '@/types/app'
import CashRegisterWidget from './CashRegisterWidget'
import SaleModal from './SaleModal'

type Props = {
  tenantId: string
  barbers: Barber[]
  services: Service[]
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
      <div className="px-6 py-4 bg-white border-b flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">POS</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {sales.length} {sales.length === 1 ? 'venta' : 'ventas'} hoy · Total: ${totalHoy.toFixed(2)}
            </p>
          </div>
          <button
            onClick={() => setModalCtx({})}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
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
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <p className="text-lg">Sin ventas hoy</p>
            <p className="text-sm mt-1">Crea una venta para comenzar</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl">
            {sales.map(sale => (
              <div key={sale.id} className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200">
                {/* Hora */}
                <span className="text-sm tabular-nums text-gray-400 flex-shrink-0 pt-0.5">
                  {new Date(sale.created_at).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">
                      {sale.client?.name ?? 'Walk-in anónimo'}
                    </span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{sale.barber?.name ?? '—'}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {sale.items.map(i => i.name).join(', ')}
                  </p>
                </div>

                {/* Pago y total */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-900 tabular-nums">
                    ${sale.total.toFixed(2)}
                  </p>
                  <span className="text-xs text-gray-400">
                    {METHOD_LABEL[sale.payment_method] ?? sale.payment_method}
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
