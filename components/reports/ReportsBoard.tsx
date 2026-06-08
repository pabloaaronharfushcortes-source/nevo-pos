'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3 } from 'lucide-react'
import { SkeletonList } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'

type PaymentBreakdown = Record<string, { count: number; total: number }>

type BarberRow = {
  barberId: string
  name: string
  salesTotal: number
  salesCount: number
  commission: number
}

type ReportData = {
  period: { from: string; to: string }
  summary: {
    totalRevenue: number
    totalDiscount: number
    saleCount: number
    averageTicket: number
    totalCommissions: number
    netRevenue: number
  }
  byPaymentMethod: PaymentBreakdown
  byBarber: BarberRow[]
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  clip: 'Clip',
  getnet: 'Getnet',
  transfer: 'Transferencia',
}

const MXN = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })

// Calcula un rango de fechas para presets rápidos
function rangeForPreset(preset: 'today' | 'week' | 'quincena' | 'month'): { from: string; to: string } {
  const now = new Date()
  const iso = (d: Date) => d.toISOString().split('T')[0]
  const today = iso(now)

  if (preset === 'today') return { from: today, to: today }
  if (preset === 'week') {
    const from = new Date(now)
    from.setDate(now.getDate() - 6)
    return { from: iso(from), to: today }
  }
  if (preset === 'quincena') {
    const day = now.getDate()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    if (day <= 15) return { from: `${y}-${m}-01`, to: `${y}-${m}-15` }
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
    return { from: `${y}-${m}-16`, to: `${y}-${m}-${lastDay}` }
  }
  // month
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
  return { from: `${y}-${m}-01`, to: `${y}-${m}-${lastDay}` }
}

const PRESETS: { key: 'today' | 'week' | 'quincena' | 'month'; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: '7 días' },
  { key: 'quincena', label: 'Quincena' },
  { key: 'month', label: 'Mes' },
]

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)' }}>
      <p className="num text-2xl font-medium" style={{ color: accent ? 'var(--brass)' : 'var(--ink-primary)' }}>
        {value}
      </p>
      <p className="label-caps mt-1">{label}</p>
    </div>
  )
}

export default function ReportsBoard() {
  const [preset, setPreset] = useState<'today' | 'week' | 'quincena' | 'month'>('quincena')
  const [range, setRange] = useState(() => rangeForPreset('quincena'))
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchReport = useCallback(async (from: string, to: string) => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/reports?from=${from}&to=${to}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json.data as ReportData)
    } catch (err) {
      console.error('[ReportsBoard] Error al cargar reporte:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport(range.from, range.to)
  }, [range, fetchReport])

  function applyPreset(key: 'today' | 'week' | 'quincena' | 'month') {
    setPreset(key)
    setRange(rangeForPreset(key))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header con presets de periodo */}
      <div
        className="px-4 md:px-6 py-3 border-b flex items-center gap-2 flex-wrap flex-shrink-0"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
      >
        <h1 className="font-display text-lg font-medium mr-2" style={{ color: 'var(--ink-primary)' }}>
          Reportes
        </h1>
        {PRESETS.map(p => {
          const active = preset === p.key
          return (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className="px-3 py-1 text-2xs font-medium uppercase tracking-wide transition-colors"
              style={
                active
                  ? { background: 'var(--brass)', color: '#0C0A09' }
                  : { background: 'var(--surface-3)', color: 'var(--ink-secondary)' }
              }
            >
              {p.label}
            </button>
          )
        })}
        <span className="num text-2xs ml-auto" style={{ color: 'var(--ink-muted)' }}>
          {range.from} → {range.to}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
        {loading ? (
          <SkeletonList rows={6} />
        ) : error ? (
          <ErrorState onRetry={() => fetchReport(range.from, range.to)} />
        ) : !data || data.summary.saleCount === 0 ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
            <BarChart3 size={32} strokeWidth={1.5} style={{ color: 'var(--ink-muted)' }} />
            <p className="mt-4 text-sm" style={{ color: 'var(--ink-secondary)' }}>
              No hay ventas registradas en este periodo
            </p>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Ingresos" value={MXN(data.summary.totalRevenue)} accent />
              <StatCard label="Ventas" value={String(data.summary.saleCount)} />
              <StatCard label="Ticket promedio" value={MXN(data.summary.averageTicket)} />
              <StatCard label="Comisiones" value={MXN(data.summary.totalCommissions)} />
            </div>

            {/* Métodos de pago */}
            <div>
              <p className="label-caps mb-3">Métodos de pago</p>
              <div className="space-y-1.5">
                {Object.entries(data.byPaymentMethod).map(([method, info]) => {
                  const pct = data.summary.totalRevenue > 0
                    ? (info.total / data.summary.totalRevenue) * 100
                    : 0
                  return (
                    <div key={method} className="p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)' }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm" style={{ color: 'var(--ink-primary)' }}>
                          {PAYMENT_LABEL[method] ?? method}
                          <span className="text-2xs ml-2" style={{ color: 'var(--ink-muted)' }}>
                            {info.count} venta{info.count !== 1 ? 's' : ''}
                          </span>
                        </span>
                        <span className="num text-sm font-medium" style={{ color: 'var(--ink-primary)' }}>
                          {MXN(info.total)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full" style={{ background: 'var(--surface-0)' }}>
                        <div className="h-full" style={{ width: `${pct}%`, background: 'var(--brass)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Por barbero */}
            <div>
              <p className="label-caps mb-3">Desempeño por barbero</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: 'var(--ink-muted)' }} className="text-2xs uppercase tracking-wide text-left">
                      <th className="py-2 font-medium">Barbero</th>
                      <th className="py-2 font-medium text-right">Ventas</th>
                      <th className="py-2 font-medium text-right">Ingresos</th>
                      <th className="py-2 font-medium text-right">Comisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byBarber.map(b => (
                      <tr key={b.barberId} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <td className="py-2.5" style={{ color: 'var(--ink-primary)' }}>{b.name}</td>
                        <td className="py-2.5 num text-right" style={{ color: 'var(--ink-secondary)' }}>{b.salesCount}</td>
                        <td className="py-2.5 num text-right" style={{ color: 'var(--ink-primary)' }}>{MXN(b.salesTotal)}</td>
                        <td className="py-2.5 num text-right" style={{ color: 'var(--brass)' }}>{MXN(b.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
