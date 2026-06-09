'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Check, X, AlertTriangle, ChevronDown, Trash2, CalendarX } from 'lucide-react'
import { SkeletonList } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { toast } from '@/hooks/useToast'

type Service = {
  id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
  category: string | null
  is_active: boolean
  sort_order: number
}

type Barber = {
  id: string
  name: string
  photo_url: string | null
  commission_rate: number
  is_active: boolean
  sort_order: number
  phone: string | null
  email: string | null
  bio: string | null
  instagram: string | null
  hired_at: string | null
}

type TimeOff = {
  id: string
  barber_id: string
  starts_at: string
  ends_at: string
  reason: string | null
}

type Tenant = {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  late_tolerance_minutes: number
  appointment_buffer_minutes: number
  agent_knowledge_base: string | null
}

type Product = {
  id: string
  name: string
  description: string | null
  sku: string | null
  price: number
  cost: number | null
  stock_quantity: number
  stock_minimum: number
  unit: string
  is_active: boolean
}

type Tab = 'services' | 'products' | 'barbers' | 'business'

const MXN = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })

const TABS: { key: Tab; label: string }[] = [
  { key: 'services', label: 'Servicios' },
  { key: 'products', label: 'Productos' },
  { key: 'barbers', label: 'Barberos' },
  { key: 'business', label: 'Negocio' },
]

const inputClass =
  'w-full rounded-lg border-[1.5px] border-[#EDEDED] bg-[#FAFAFA] px-3 py-2.5 text-sm text-[#0E0D1A] focus:border-[#A259FF] focus:outline-none focus:ring-0 transition-colors'

export default function SettingsBoard() {
  const [tab, setTab] = useState<Tab>('services')

  return (
    <div className="flex flex-col h-full">
      <div
        className="px-4 md:px-6 py-3 border-b flex items-center gap-2 flex-wrap flex-shrink-0"
        style={{ background: '#FFFFFF', borderColor: '#EDEDED' }}
      >
        <h1 className="font-display text-2xl font-semibold mr-2" style={{ color: '#0E0D1A' }}>
          Configuración
        </h1>
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-3 py-1 text-xs font-medium rounded-full transition-colors"
              style={
                active
                  ? { background: '#FF6B6B', color: '#FFFFFF' }
                  : { background: '#F5F5F7', color: '#6B6B8A' }
              }
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
        <div className="max-w-3xl">
          {tab === 'services' && <ServicesTab />}
          {tab === 'products' && <ProductsTab />}
          {tab === 'barbers' && <BarbersTab />}
          {tab === 'business' && <BusinessTab />}
        </div>
      </div>
    </div>
  )
}

// ─── Servicios ───
function ServicesTab() {
  const [items, setItems] = useState<Service[] | null>(null)
  const [error, setError] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError(false)
    try {
      const res = await fetch('/api/services')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setItems(json.data as Service[])
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function create() {
    const p = Number(price)
    const d = Number(duration)
    if (!name.trim() || !Number.isFinite(p) || !Number.isFinite(d) || d <= 0) {
      toast.error('Completa nombre, precio y duración')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), price: p, duration_minutes: d }),
      })
      if (!res.ok) throw new Error()
      toast.success('Servicio creado')
      setName(''); setPrice(''); setDuration(''); setAdding(false)
      load()
    } catch {
      toast.error('No se pudo crear el servicio')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(s: Service) {
    try {
      const res = await fetch(`/api/services/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !s.is_active }),
      })
      if (!res.ok) throw new Error()
      toast.success(s.is_active ? 'Servicio desactivado' : 'Servicio activado')
      load()
    } catch {
      toast.error('No se pudo actualizar')
    }
  }

  if (error) return <ErrorState onRetry={load} />
  if (!items) return <SkeletonList rows={5} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="label-caps">Servicios del catálogo</p>
        <button
          onClick={() => setAdding(v => !v)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors"
          style={{ background: '#FF6B6B' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E85555' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
        >
          <Plus size={13} /> Nuevo
        </button>
      </div>

      {adding && (
        <div className="p-3 space-y-2 rounded-xl" style={{ background: '#FAFAFA', border: '1.5px solid #EDEDED' }}>
          <input
            value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del servicio"
            className={inputClass}
          />
          <div className="flex gap-2">
            <input
              value={price} onChange={e => setPrice(e.target.value)} placeholder="Precio (MXN)" inputMode="numeric"
              className={inputClass}
            />
            <input
              value={duration} onChange={e => setDuration(e.target.value)} placeholder="Minutos" inputMode="numeric"
              className={inputClass}
            />
          </div>
          <button
            onClick={create} disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50"
            style={{ background: '#FF6B6B' }}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.background = '#E85555' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
          >
            {saving ? 'Guardando…' : 'Guardar servicio'}
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        {items.map(s => (
          <div
            key={s.id}
            className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: '#FAFAFA', border: '1.5px solid #EDEDED', opacity: s.is_active ? 1 : 0.5 }}
          >
            <div>
              <span className="text-sm" style={{ color: '#0E0D1A' }}>{s.name}</span>
              <span className="num text-2xs ml-2" style={{ color: '#9B9BB0' }}>{s.duration_minutes} min</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="num text-sm font-medium" style={{ color: '#0E0D1A' }}>{MXN(s.price)}</span>
              <button
                onClick={() => toggleActive(s)}
                className="flex items-center justify-center w-7 h-7 rounded-lg"
                style={{ background: '#FFFFFF', border: '1.5px solid #EDEDED', color: s.is_active ? '#FF6B6B' : '#9B9BB0' }}
                aria-label={s.is_active ? 'Desactivar' : 'Activar'}
              >
                {s.is_active ? <Check size={14} /> : <X size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Productos (inventario) ───
function ProductsTab() {
  const [items, setItems] = useState<Product[] | null>(null)
  const [error, setError] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [cost, setCost] = useState('')
  const [stock, setStock] = useState('')
  const [minStock, setMinStock] = useState('')
  const [unit, setUnit] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError(false)
    try {
      const res = await fetch('/api/products')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setItems(json.data as Product[])
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function create() {
    const p = Number(price)
    if (!name.trim() || !Number.isFinite(p) || p < 0) {
      toast.error('Completa nombre y precio')
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = { name: name.trim(), price: p }
      if (cost.trim() && Number.isFinite(Number(cost))) body.cost = Number(cost)
      if (stock.trim() && Number.isFinite(Number(stock))) body.stock_quantity = Math.trunc(Number(stock))
      if (minStock.trim() && Number.isFinite(Number(minStock))) body.stock_minimum = Math.trunc(Number(minStock))
      if (unit.trim()) body.unit = unit.trim()

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success('Producto creado')
      setName(''); setPrice(''); setCost(''); setStock(''); setMinStock(''); setUnit(''); setAdding(false)
      load()
    } catch {
      toast.error('No se pudo crear el producto')
    } finally {
      setSaving(false)
    }
  }

  async function patch(id: string, patchBody: Record<string, unknown>, okMsg?: string) {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      })
      if (!res.ok) throw new Error()
      if (okMsg) toast.success(okMsg)
      load()
    } catch {
      toast.error('No se pudo actualizar')
    }
  }

  if (error) return <ErrorState onRetry={load} />
  if (!items) return <SkeletonList rows={5} />

  const lowStock = items.filter(p => p.is_active && p.stock_quantity <= p.stock_minimum)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="label-caps">Inventario de productos</p>
        <button
          onClick={() => setAdding(v => !v)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors"
          style={{ background: '#FF6B6B' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E85555' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
        >
          <Plus size={13} /> Nuevo
        </button>
      </div>

      {/* Alerta de stock bajo */}
      {lowStock.length > 0 && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl"
          style={{ background: '#FFF0F0', border: '1.5px solid #FFE8E8' }}
        >
          <AlertTriangle size={16} style={{ color: '#E85555' }} className="mt-0.5 flex-shrink-0" />
          <div className="text-xs" style={{ color: '#0E0D1A' }}>
            <span className="font-semibold">{lowStock.length} producto{lowStock.length === 1 ? '' : 's'} con stock bajo:</span>{' '}
            {lowStock.map(p => `${p.name} (${p.stock_quantity})`).join(', ')}
          </div>
        </div>
      )}

      {adding && (
        <div className="p-3 space-y-2 rounded-xl" style={{ background: '#FAFAFA', border: '1.5px solid #EDEDED' }}>
          <input
            value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del producto"
            className={inputClass}
          />
          <div className="flex gap-2">
            <input
              value={price} onChange={e => setPrice(e.target.value)} placeholder="Precio venta" inputMode="numeric"
              className={inputClass}
            />
            <input
              value={cost} onChange={e => setCost(e.target.value)} placeholder="Costo (opcional)" inputMode="numeric"
              className={inputClass}
            />
          </div>
          <div className="flex gap-2">
            <input
              value={stock} onChange={e => setStock(e.target.value)} placeholder="Stock inicial" inputMode="numeric"
              className={inputClass}
            />
            <input
              value={minStock} onChange={e => setMinStock(e.target.value)} placeholder="Mínimo (alerta)" inputMode="numeric"
              className={inputClass}
            />
            <input
              value={unit} onChange={e => setUnit(e.target.value)} placeholder="Unidad (pieza)"
              className={inputClass}
            />
          </div>
          <button
            onClick={create} disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50"
            style={{ background: '#FF6B6B' }}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.background = '#E85555' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
          >
            {saving ? 'Guardando…' : 'Guardar producto'}
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        {items.length === 0 && (
          <p className="text-sm py-6 text-center" style={{ color: '#9B9BB0' }}>
            Aún no hay productos. Crea el primero.
          </p>
        )}
        {items.map(p => (
          <ProductRow
            key={p.id}
            product={p}
            onSaveStock={(q) => patch(p.id, { stock_quantity: q }, 'Stock actualizado')}
            onToggleActive={() => patch(p.id, { is_active: !p.is_active }, p.is_active ? 'Producto desactivado' : 'Producto activado')}
          />
        ))}
      </div>
    </div>
  )
}

function ProductRow({
  product,
  onSaveStock,
  onToggleActive,
}: {
  product: Product
  onSaveStock: (q: number) => void
  onToggleActive: () => void
}) {
  const [stockDraft, setStockDraft] = useState(String(product.stock_quantity))

  useEffect(() => { setStockDraft(String(product.stock_quantity)) }, [product.stock_quantity])

  const low = product.stock_quantity <= product.stock_minimum
  const commitStock = () => {
    const n = Math.trunc(Number(stockDraft))
    if (Number.isFinite(n) && n >= 0 && n !== product.stock_quantity) onSaveStock(n)
    else setStockDraft(String(product.stock_quantity))
  }

  return (
    <div
      className="flex items-center justify-between gap-3 p-3 rounded-xl"
      style={{ background: '#FAFAFA', border: '1.5px solid #EDEDED', opacity: product.is_active ? 1 : 0.5 }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm truncate" style={{ color: '#0E0D1A' }}>{product.name}</span>
          {low && product.is_active && (
            <span
              className="text-2xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
              style={{ background: '#FFE8E8', color: '#E85555' }}
            >
              Stock bajo
            </span>
          )}
        </div>
        <span className="num text-2xs" style={{ color: '#9B9BB0' }}>
          {MXN(product.price)} · mín {product.stock_minimum} {product.unit}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-2xs" style={{ color: '#9B9BB0' }}>Stock</span>
          <input
            value={stockDraft}
            onChange={e => setStockDraft(e.target.value)}
            onBlur={commitStock}
            onKeyDown={e => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur() }}
            inputMode="numeric"
            className="num w-14 text-center rounded-lg border-[1.5px] bg-white px-2 py-1 text-sm focus:border-[#A259FF] focus:outline-none focus:ring-0 transition-colors"
            style={{ borderColor: low ? '#FFC4C4' : '#EDEDED', color: low ? '#E85555' : '#0E0D1A' }}
          />
        </div>
        <button
          onClick={onToggleActive}
          className="flex items-center justify-center w-7 h-7 rounded-lg"
          style={{ background: '#FFFFFF', border: '1.5px solid #EDEDED', color: product.is_active ? '#FF6B6B' : '#9B9BB0' }}
          aria-label={product.is_active ? 'Desactivar' : 'Activar'}
        >
          {product.is_active ? <Check size={14} /> : <X size={14} />}
        </button>
      </div>
    </div>
  )
}

// ─── Barberos ───
function BarbersTab() {
  const [items, setItems] = useState<Barber[] | null>(null)
  const [error, setError] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [rate, setRate] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [instagram, setInstagram] = useState('')
  const [hiredAt, setHiredAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(false)
    try {
      const res = await fetch('/api/barbers')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setItems(json.data as Barber[])
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function create() {
    const r = Number(rate)
    if (!name.trim() || !Number.isFinite(r) || r < 0 || r > 100) {
      toast.error('Completa nombre y comisión (0-100)')
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = { name: name.trim(), commission_rate: r }
      if (phone.trim()) body.phone = phone.trim()
      if (email.trim()) body.email = email.trim()
      if (instagram.trim()) body.instagram = instagram.trim()
      if (hiredAt.trim()) body.hired_at = hiredAt.trim()

      const res = await fetch('/api/barbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success('Barbero creado')
      setName(''); setRate(''); setPhone(''); setEmail(''); setInstagram(''); setHiredAt(''); setAdding(false)
      load()
    } catch {
      toast.error('No se pudo crear el barbero')
    } finally {
      setSaving(false)
    }
  }

  if (error) return <ErrorState onRetry={load} />
  if (!items) return <SkeletonList rows={4} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="label-caps">Equipo de barberos</p>
        <button
          onClick={() => setAdding(v => !v)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors"
          style={{ background: '#FF6B6B' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E85555' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
        >
          <Plus size={13} /> Nuevo
        </button>
      </div>

      {adding && (
        <div className="p-3 space-y-2 rounded-xl" style={{ background: '#FAFAFA', border: '1.5px solid #EDEDED' }}>
          <input
            value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del barbero"
            className={inputClass}
          />
          <div className="flex gap-2">
            <input
              value={rate} onChange={e => setRate(e.target.value)} placeholder="Comisión % (ej. 40)" inputMode="numeric"
              className={inputClass}
            />
            <input
              value={hiredAt} onChange={e => setHiredAt(e.target.value)} type="date" placeholder="Fecha de ingreso"
              className={`${inputClass} num`}
            />
          </div>
          <div className="flex gap-2">
            <input
              value={phone} onChange={e => setPhone(e.target.value)} placeholder="Teléfono"
              className={inputClass}
            />
            <input
              value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
              className={inputClass}
            />
          </div>
          <input
            value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="Instagram (sin @)"
            className={inputClass}
          />
          <button
            onClick={create} disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50"
            style={{ background: '#FF6B6B' }}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.background = '#E85555' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
          >
            {saving ? 'Guardando…' : 'Guardar barbero'}
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        {items.map(b => (
          <BarberRow
            key={b.id}
            barber={b}
            expanded={expanded === b.id}
            onToggleExpand={() => setExpanded(prev => (prev === b.id ? null : b.id))}
            onChanged={load}
          />
        ))}
      </div>
    </div>
  )
}

function BarberRow({
  barber,
  expanded,
  onToggleExpand,
  onChanged,
}: {
  barber: Barber
  expanded: boolean
  onToggleExpand: () => void
  onChanged: () => void
}) {
  const [name, setName] = useState(barber.name)
  const [rate, setRate] = useState(String(barber.commission_rate))
  const [phone, setPhone] = useState(barber.phone ?? '')
  const [email, setEmail] = useState(barber.email ?? '')
  const [instagram, setInstagram] = useState(barber.instagram ?? '')
  const [hiredAt, setHiredAt] = useState(barber.hired_at ?? '')
  const [bio, setBio] = useState(barber.bio ?? '')
  const [photoUrl, setPhotoUrl] = useState(barber.photo_url ?? '')
  const [saving, setSaving] = useState(false)

  // Re-sincroniza el formulario si el barbero cambia desde el servidor
  useEffect(() => {
    setName(barber.name)
    setRate(String(barber.commission_rate))
    setPhone(barber.phone ?? '')
    setEmail(barber.email ?? '')
    setInstagram(barber.instagram ?? '')
    setHiredAt(barber.hired_at ?? '')
    setBio(barber.bio ?? '')
    setPhotoUrl(barber.photo_url ?? '')
  }, [barber])

  async function patch(body: Record<string, unknown>, okMsg?: string) {
    const res = await fetch(`/api/barbers/${barber.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error()
    if (okMsg) toast.success(okMsg)
    onChanged()
  }

  async function saveProfile() {
    const r = Number(rate)
    if (!name.trim() || !Number.isFinite(r) || r < 0 || r > 100) {
      toast.error('Nombre y comisión (0-100) son obligatorios')
      return
    }
    setSaving(true)
    try {
      await patch({
        name: name.trim(),
        commission_rate: r,
        phone: phone.trim(),
        email: email.trim(),
        instagram: instagram.trim(),
        hired_at: hiredAt.trim(),
        bio: bio.trim(),
        photo_url: photoUrl.trim(),
      }, 'Perfil actualizado')
    } catch {
      toast.error('No se pudo actualizar el perfil')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive() {
    try {
      await patch({ is_active: !barber.is_active }, barber.is_active ? 'Barbero desactivado' : 'Barbero activado')
    } catch {
      toast.error('No se pudo actualizar')
    }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#FAFAFA', border: '1.5px solid #EDEDED', opacity: barber.is_active ? 1 : 0.6 }}>
      <div className="flex items-center justify-between p-3">
        <button onClick={onToggleExpand} className="flex items-center gap-2 min-w-0 flex-1 text-left">
          <ChevronDown
            size={15}
            style={{ color: '#9B9BB0', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
            className="flex-shrink-0"
          />
          <span className="text-sm truncate" style={{ color: '#0E0D1A' }}>{barber.name}</span>
        </button>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="num text-2xs" style={{ color: '#FF6B6B' }}>{barber.commission_rate}% comisión</span>
          <button
            onClick={toggleActive}
            className="flex items-center justify-center w-7 h-7 rounded-lg"
            style={{ background: '#FFFFFF', border: '1.5px solid #EDEDED', color: barber.is_active ? '#FF6B6B' : '#9B9BB0' }}
            aria-label={barber.is_active ? 'Desactivar' : 'Activar'}
          >
            {barber.is_active ? <Check size={14} /> : <X size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t" style={{ borderColor: '#EDEDED' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-3">
            <Field label="Nombre">
              <input value={name} onChange={e => setName(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Comisión %">
              <input value={rate} onChange={e => setRate(e.target.value)} inputMode="numeric" className={`${inputClass} num`} />
            </Field>
            <Field label="Teléfono">
              <input value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Email">
              <input value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Instagram">
              <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="sin @" className={inputClass} />
            </Field>
            <Field label="Fecha de ingreso">
              <input value={hiredAt} onChange={e => setHiredAt(e.target.value)} type="date" className={`${inputClass} num`} />
            </Field>
          </div>
          <Field label="Foto (URL)">
            <input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://…" className={inputClass} />
          </Field>
          <Field label="Bio">
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
          </Field>

          <button
            onClick={saveProfile} disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50"
            style={{ background: '#FF6B6B' }}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.background = '#E85555' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
          >
            {saving ? 'Guardando…' : 'Guardar perfil'}
          </button>

          <TimeOffSection barberId={barber.id} />
        </div>
      )}
    </div>
  )
}

// ─── Bloqueos de horario (vacaciones / permisos) ───
function TimeOffSection({ barberId }: { barberId: string }) {
  const [items, setItems] = useState<TimeOff[] | null>(null)
  const [error, setError] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError(false)
    try {
      const res = await fetch(`/api/barber-time-off?barberId=${barberId}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setItems(json.data as TimeOff[])
    } catch {
      setError(true)
    }
  }, [barberId])

  useEffect(() => { load() }, [load])

  async function create() {
    if (!start || !end) {
      toast.error('Indica inicio y fin del bloqueo')
      return
    }
    const startsAt = new Date(start)
    const endsAt = new Date(end)
    if (!(endsAt.getTime() > startsAt.getTime())) {
      toast.error('El fin debe ser posterior al inicio')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/barber-time-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barber_id: barberId,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          reason: reason.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Bloqueo creado')
      setStart(''); setEnd(''); setReason('')
      load()
    } catch {
      toast.error('No se pudo crear el bloqueo')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/barber-time-off/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Bloqueo eliminado')
      load()
    } catch {
      toast.error('No se pudo eliminar')
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('es-MX', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })

  return (
    <div className="pt-3 mt-1 border-t space-y-2" style={{ borderColor: '#EDEDED' }}>
      <div className="flex items-center gap-1.5">
        <CalendarX size={14} style={{ color: '#A259FF' }} />
        <p className="label-caps">Bloqueos de horario</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Field label="Inicio">
          <input value={start} onChange={e => setStart(e.target.value)} type="datetime-local" className={`${inputClass} num`} />
        </Field>
        <Field label="Fin">
          <input value={end} onChange={e => setEnd(e.target.value)} type="datetime-local" className={`${inputClass} num`} />
        </Field>
      </div>
      <input
        value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo (opcional): vacaciones, permiso…"
        className={inputClass}
      />
      <button
        onClick={create} disabled={saving}
        className="px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors disabled:opacity-50"
        style={{ background: '#A259FF' }}
        onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.background = '#8B3FFF' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#A259FF' }}
      >
        {saving ? 'Guardando…' : 'Agregar bloqueo'}
      </button>

      {error && <p className="text-2xs" style={{ color: '#E85555' }}>No se pudieron cargar los bloqueos.</p>}

      {items && items.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {items.map(t => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 p-2.5 rounded-lg"
              style={{ background: '#F5EEFF', border: '1.5px solid #F0E6FF' }}
            >
              <div className="min-w-0">
                <span className="num text-2xs block" style={{ color: '#0E0D1A' }}>
                  {fmt(t.starts_at)} → {fmt(t.ends_at)}
                </span>
                {t.reason && <span className="text-2xs" style={{ color: '#6B6B8A' }}>{t.reason}</span>}
              </div>
              <button
                onClick={() => remove(t.id)}
                className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
                style={{ background: '#FFFFFF', border: '1.5px solid #F0E6FF', color: '#E85555' }}
                aria-label="Eliminar bloqueo"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {items && items.length === 0 && (
        <p className="text-2xs" style={{ color: '#9B9BB0' }}>Sin bloqueos vigentes.</p>
      )}
    </div>
  )
}

// ─── Datos del negocio ───
function BusinessTab() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError(false)
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setTenant(json.data as Tenant)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!tenant) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenant.name,
          address: tenant.address,
          phone: tenant.phone,
          email: tenant.email,
          website: tenant.website,
          late_tolerance_minutes: tenant.late_tolerance_minutes,
          appointment_buffer_minutes: tenant.appointment_buffer_minutes,
          agent_knowledge_base: tenant.agent_knowledge_base,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Datos del negocio guardados')
    } catch {
      toast.error('No se pudieron guardar los datos')
    } finally {
      setSaving(false)
    }
  }

  if (error) return <ErrorState onRetry={load} />
  if (!tenant) return <SkeletonList rows={6} />

  const set = (patch: Partial<Tenant>) => setTenant({ ...tenant, ...patch })

  return (
    <div className="space-y-4">
      <p className="label-caps">Datos del negocio</p>

      <Field label="Nombre">
        <input value={tenant.name} onChange={e => set({ name: e.target.value })}
          className={inputClass} />
      </Field>
      <Field label="Dirección">
        <input value={tenant.address ?? ''} onChange={e => set({ address: e.target.value })}
          className={inputClass} />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Teléfono">
          <input value={tenant.phone ?? ''} onChange={e => set({ phone: e.target.value })}
            className={inputClass} />
        </Field>
        <Field label="Email">
          <input value={tenant.email ?? ''} onChange={e => set({ email: e.target.value })}
            className={inputClass} />
        </Field>
      </div>
      <Field label="Sitio web">
        <input value={tenant.website ?? ''} onChange={e => set({ website: e.target.value })}
          className={inputClass} />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Tolerancia de retraso (min)">
          <input value={tenant.late_tolerance_minutes} inputMode="numeric"
            onChange={e => set({ late_tolerance_minutes: Number(e.target.value) || 0 })}
            className={`${inputClass} num`} />
        </Field>
        <Field label="Buffer entre citas (min)">
          <input value={tenant.appointment_buffer_minutes} inputMode="numeric"
            onChange={e => set({ appointment_buffer_minutes: Number(e.target.value) || 0 })}
            className={`${inputClass} num`} />
        </Field>
      </div>
      <Field label="Base de conocimiento del agente (WhatsApp)">
        <textarea value={tenant.agent_knowledge_base ?? ''} rows={8}
          onChange={e => set({ agent_knowledge_base: e.target.value })}
          className={`${inputClass} font-mono resize-none`} />
      </Field>

      <button
        onClick={save} disabled={saving}
        className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50"
        style={{ background: '#FF6B6B' }}
        onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.background = '#E85555' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
      >
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-caps block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
