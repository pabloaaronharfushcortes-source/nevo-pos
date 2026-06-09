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
  tips: number
  salesCount: number
  commission: number
}

type TopItem = {
  type: string
  name: string
  quantity: number
  revenue: number
}

type DailyTrend = {
  date: string
  revenue: number
  count: number
}

type ReportData = {
  period: { from: string; to: string }
  summary: {
    serviceRevenue: number
    totalTips: number
    totalCollected: number
    totalDiscount: number
    saleCount: number
    averageTicket: number
    totalCommissions: number
    netRevenue: number
    productRevenue: number
    productUnits: number
  }
  byPaymentMethod: PaymentBreakdown
  byBarber: BarberRow[]
  topItems: TopItem[]
  dailyTrend: DailyTrend[]
}

// Escapa texto para incrustarlo de forma segura en HTML
function htmlEsc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
    <div className="p-4 rounded-xl" style={{ background: '#FAFAFA', border: '1.5px solid #EDEDED' }}>
      <p className="num text-2xl font-medium" style={{ color: accent ? '#FF6B6B' : '#0E0D1A' }}>
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

  // Exporta el reporte completo a Excel (.xls). Se genera un documento HTML con
  // tablas que Excel/Numbers/Sheets abren como hoja de cálculo nativa — sin
  // depender de librerías externas ni del servidor.
  function exportExcel() {
    if (!data) return

    const s = data.summary
    const th = 'style="background:#FF6B6B;color:#fff;text-align:left;padding:4px 8px;font-family:Arial"'
    const td = 'style="padding:4px 8px;font-family:Arial;border-bottom:1px solid #EDEDED"'
    const num = 'style="padding:4px 8px;font-family:Arial;border-bottom:1px solid #EDEDED;text-align:right"'
    const cap = 'style="font-family:Arial;font-size:13px;font-weight:bold;color:#0E0D1A;padding-top:14px"'

    const parts: string[] = []
    parts.push(
      `<h2 style="font-family:Arial;color:#0E0D1A">Reporte NEVO · ${htmlEsc(range.from)} a ${htmlEsc(range.to)}</h2>`,
    )

    // 1. Resumen
    parts.push(`<p ${cap}>Resumen</p>`)
    parts.push('<table><tr>' + `<th ${th}>Concepto</th><th ${th}>Valor</th></tr>` +
      `<tr><td ${td}>Ingresos por servicios</td><td ${num}>${s.serviceRevenue.toFixed(2)}</td></tr>` +
      `<tr><td ${td}>Ingresos por productos</td><td ${num}>${s.productRevenue.toFixed(2)}</td></tr>` +
      `<tr><td ${td}>Productos vendidos (uds)</td><td ${num}>${s.productUnits}</td></tr>` +
      `<tr><td ${td}>Propinas (a barberos)</td><td ${num}>${s.totalTips.toFixed(2)}</td></tr>` +
      `<tr><td ${td}>Total cobrado</td><td ${num}>${s.totalCollected.toFixed(2)}</td></tr>` +
      `<tr><td ${td}>Descuentos</td><td ${num}>${s.totalDiscount.toFixed(2)}</td></tr>` +
      `<tr><td ${td}>Ventas</td><td ${num}>${s.saleCount}</td></tr>` +
      `<tr><td ${td}>Ticket promedio</td><td ${num}>${s.averageTicket.toFixed(2)}</td></tr>` +
      `<tr><td ${td}>Comisiones</td><td ${num}>${s.totalCommissions.toFixed(2)}</td></tr>` +
      `<tr><td ${td}>Neto</td><td ${num}>${s.netRevenue.toFixed(2)}</td></tr>` +
      '</table>')

    // 2. Métodos de pago
    parts.push(`<p ${cap}>Métodos de pago</p>`)
    parts.push('<table><tr>' + `<th ${th}>Método</th><th ${th}>Ventas</th><th ${th}>Total</th></tr>` +
      Object.entries(data.byPaymentMethod).map(([method, info]) =>
        `<tr><td ${td}>${htmlEsc(PAYMENT_LABEL[method] ?? method)}</td><td ${num}>${info.count}</td><td ${num}>${info.total.toFixed(2)}</td></tr>`,
      ).join('') + '</table>')

    // 3. Por barbero
    parts.push(`<p ${cap}>Desempeño por barbero</p>`)
    parts.push('<table><tr>' + `<th ${th}>Barbero</th><th ${th}>Ventas</th><th ${th}>Ingresos</th><th ${th}>Propinas</th><th ${th}>Comisión</th></tr>` +
      data.byBarber.map(b =>
        `<tr><td ${td}>${htmlEsc(b.name)}</td><td ${num}>${b.salesCount}</td><td ${num}>${b.salesTotal.toFixed(2)}</td><td ${num}>${b.tips.toFixed(2)}</td><td ${num}>${b.commission.toFixed(2)}</td></tr>`,
      ).join('') + '</table>')

    // 4. Artículos más vendidos
    parts.push(`<p ${cap}>Artículos más vendidos</p>`)
    parts.push('<table><tr>' + `<th ${th}>Artículo</th><th ${th}>Tipo</th><th ${th}>Cantidad</th><th ${th}>Ingresos</th></tr>` +
      data.topItems.map(it =>
        `<tr><td ${td}>${htmlEsc(it.name)}</td><td ${td}>${it.type === 'product' ? 'Producto' : 'Servicio'}</td><td ${num}>${it.quantity}</td><td ${num}>${it.revenue.toFixed(2)}</td></tr>`,
      ).join('') + '</table>')

    // 5. Tendencia por día
    parts.push(`<p ${cap}>Tendencia por día</p>`)
    parts.push('<table><tr>' + `<th ${th}>Fecha</th><th ${th}>Ventas</th><th ${th}>Ingresos</th></tr>` +
      data.dailyTrend.map(d =>
        `<tr><td ${td}>${htmlEsc(d.date)}</td><td ${num}>${d.count}</td><td ${num}>${d.revenue.toFixed(2)}</td></tr>`,
      ).join('') + '</table>')

    const html =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">' +
      '<head><meta charset="utf-8"></head><body>' + parts.join('') + '</body></html>'

    const blob = new Blob([`﻿${html}`], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-${range.from}-a-${range.to}.xls`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header con presets de periodo */}
      <div
        className="px-4 md:px-6 py-3 border-b flex items-center gap-2 flex-wrap flex-shrink-0"
        style={{ background: '#FFFFFF', borderColor: '#EDEDED' }}
      >
        <h1 className="font-display text-2xl font-semibold mr-2" style={{ color: '#0E0D1A' }}>
          Reportes
        </h1>
        {PRESETS.map(p => {
          const active = preset === p.key
          return (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className="px-3 py-1 text-xs font-medium rounded-full transition-colors"
              style={
                active
                  ? { background: '#FF6B6B', color: '#FFFFFF' }
                  : { background: '#F5F5F7', color: '#6B6B8A' }
              }
            >
              {p.label}
            </button>
          )
        })}
        <div className="flex items-center gap-3 ml-auto">
          <span className="num text-xs" style={{ color: '#9B9BB0' }}>
            {range.from} → {range.to}
          </span>
          <button
            onClick={exportExcel}
            disabled={!data || data.summary.saleCount === 0}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border-[1.5px] transition-colors disabled:opacity-40"
            style={{ borderColor: '#EDEDED', color: '#6B6B8A' }}
            onMouseEnter={e => { if (data && data.summary.saleCount > 0) { (e.currentTarget as HTMLElement).style.background = '#F5EEFF'; (e.currentTarget as HTMLElement).style.borderColor = '#E4D6FF' } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = '#EDEDED' }}
          >
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
        {loading ? (
          <SkeletonList rows={6} />
        ) : error ? (
          <ErrorState onRetry={() => fetchReport(range.from, range.to)} />
        ) : !data || data.summary.saleCount === 0 ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
            <BarChart3 size={32} strokeWidth={1.5} style={{ color: '#9B9BB0' }} />
            <p className="mt-4 text-sm" style={{ color: '#6B6B8A' }}>
              No hay ventas registradas en este periodo
            </p>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <StatCard label="Ingresos por servicios" value={MXN(data.summary.serviceRevenue)} accent />
              <StatCard label="Ventas" value={String(data.summary.saleCount)} />
              <StatCard label="Ticket promedio" value={MXN(data.summary.averageTicket)} />
              <StatCard label="Propinas (a barberos)" value={MXN(data.summary.totalTips)} />
              <StatCard label="Comisiones" value={MXN(data.summary.totalCommissions)} />
              <StatCard label="Neto" value={MXN(data.summary.netRevenue)} />
            </div>

            {/* Métodos de pago (sobre el total cobrado, incluye propina) */}
            <div>
              <p className="label-caps mb-3">Métodos de pago</p>
              <div className="space-y-1.5">
                {Object.entries(data.byPaymentMethod).map(([method, info]) => {
                  const pct = data.summary.totalCollected > 0
                    ? (info.total / data.summary.totalCollected) * 100
                    : 0
                  return (
                    <div key={method} className="p-3 rounded-xl" style={{ background: '#FAFAFA', border: '1.5px solid #EDEDED' }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm" style={{ color: '#0E0D1A' }}>
                          {PAYMENT_LABEL[method] ?? method}
                          <span className="text-2xs ml-2" style={{ color: '#9B9BB0' }}>
                            {info.count} venta{info.count !== 1 ? 's' : ''}
                          </span>
                        </span>
                        <span className="num text-sm font-medium" style={{ color: '#0E0D1A' }}>
                          {MXN(info.total)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full" style={{ background: '#EDEDED' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#FF6B6B' }} />
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
                    <tr className="text-2xs tracking-wide text-left" style={{ color: '#9B9BB0' }}>
                      <th className="py-2 font-medium">Barbero</th>
                      <th className="py-2 font-medium text-right">Ventas</th>
                      <th className="py-2 font-medium text-right">Ingresos</th>
                      <th className="py-2 font-medium text-right">Propinas</th>
                      <th className="py-2 font-medium text-right">Comisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byBarber.map(b => (
                      <tr key={b.barberId} style={{ borderTop: '1px solid #F0F0F5' }}>
                        <td className="py-2.5" style={{ color: '#0E0D1A' }}>{b.name}</td>
                        <td className="py-2.5 num text-right" style={{ color: '#6B6B8A' }}>{b.salesCount}</td>
                        <td className="py-2.5 num text-right" style={{ color: '#0E0D1A' }}>{MXN(b.salesTotal)}</td>
                        <td className="py-2.5 num text-right" style={{ color: '#6B6B8A' }}>{MXN(b.tips)}</td>
                        <td className="py-2.5 num text-right" style={{ color: '#FF6B6B' }}>{MXN(b.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Artículos más vendidos (servicios y productos) */}
            {data.topItems.length > 0 && (
              <div>
                <p className="label-caps mb-3">Artículos más vendidos</p>
                <div className="space-y-1.5">
                  {(() => {
                    const maxRev = Math.max(...data.topItems.map(i => i.revenue), 1)
                    return data.topItems.map(it => {
                      const isProduct = it.type === 'product'
                      const pct = (it.revenue / maxRev) * 100
                      return (
                        <div key={`${it.type}-${it.name}`} className="p-3 rounded-xl" style={{ background: '#FAFAFA', border: '1.5px solid #EDEDED' }}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm flex items-center gap-2 min-w-0" style={{ color: '#0E0D1A' }}>
                              <span className="truncate">{it.name}</span>
                              <span
                                className="text-2xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
                                style={isProduct
                                  ? { background: '#FFE8E8', color: '#E85555' }
                                  : { background: '#F0E6FF', color: '#8B3FFF' }}
                              >
                                {isProduct ? 'Producto' : 'Servicio'}
                              </span>
                              <span className="text-2xs flex-shrink-0" style={{ color: '#9B9BB0' }}>×{it.quantity}</span>
                            </span>
                            <span className="num text-sm font-medium flex-shrink-0" style={{ color: '#0E0D1A' }}>
                              {MXN(it.revenue)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full" style={{ background: '#EDEDED' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: isProduct ? '#FF6B6B' : '#A259FF' }} />
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            )}

            {/* Tendencia por día */}
            {data.dailyTrend.length > 0 && (
              <div>
                <p className="label-caps mb-3">Tendencia por día</p>
                <div
                  className="p-4 rounded-xl flex items-end gap-1.5"
                  style={{ background: '#FAFAFA', border: '1.5px solid #EDEDED', height: 180 }}
                >
                  {(() => {
                    const maxRev = Math.max(...data.dailyTrend.map(d => d.revenue), 1)
                    return data.dailyTrend.map(d => {
                      const h = Math.max(2, (d.revenue / maxRev) * 130)
                      const label = new Date(`${d.date}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
                      return (
                        <div key={d.date} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1" title={`${label}: ${MXN(d.revenue)} · ${d.count} ventas`}>
                          <span className="num text-2xs" style={{ color: '#6B6B8A' }}>{MXN(d.revenue)}</span>
                          <div className="w-full rounded-t-md" style={{ height: h, background: '#FF6B6B', minWidth: 6 }} />
                          <span className="text-2xs whitespace-nowrap" style={{ color: '#9B9BB0' }}>{label}</span>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
