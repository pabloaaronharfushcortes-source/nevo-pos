'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Check, X } from 'lucide-react'
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

type Tab = 'services' | 'barbers' | 'business'

const MXN = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })

const TABS: { key: Tab; label: string }[] = [
  { key: 'services', label: 'Servicios' },
  { key: 'barbers', label: 'Barberos' },
  { key: 'business', label: 'Negocio' },
]

const fieldStyle = {
  background: 'var(--surface-0)',
  border: '1px solid var(--border-default)',
  color: 'var(--ink-primary)',
}

export default function SettingsBoard() {
  const [tab, setTab] = useState<Tab>('services')

  return (
    <div className="flex flex-col h-full">
      <div
        className="px-4 md:px-6 py-3 border-b flex items-center gap-2 flex-wrap flex-shrink-0"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
      >
        <h1 className="font-display text-lg font-medium mr-2" style={{ color: 'var(--ink-primary)' }}>
          Configuración
        </h1>
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-3 py-1 text-2xs font-medium uppercase tracking-wide transition-colors"
              style={
                active
                  ? { background: 'var(--brass)', color: '#0C0A09' }
                  : { background: 'var(--surface-3)', color: 'var(--ink-secondary)' }
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
          className="flex items-center gap-1 px-3 py-1.5 text-2xs font-medium uppercase tracking-wide"
          style={{ background: 'var(--surface-3)', color: 'var(--ink-secondary)' }}
        >
          <Plus size={13} /> Nuevo
        </button>
      </div>

      {adding && (
        <div className="p-3 space-y-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)' }}>
          <input
            value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del servicio"
            className="w-full px-3 py-2 text-sm" style={fieldStyle}
          />
          <div className="flex gap-2">
            <input
              value={price} onChange={e => setPrice(e.target.value)} placeholder="Precio (MXN)" inputMode="numeric"
              className="w-full px-3 py-2 text-sm" style={fieldStyle}
            />
            <input
              value={duration} onChange={e => setDuration(e.target.value)} placeholder="Minutos" inputMode="numeric"
              className="w-full px-3 py-2 text-sm" style={fieldStyle}
            />
          </div>
          <button
            onClick={create} disabled={saving}
            className="px-4 py-2 text-2xs font-medium uppercase tracking-wide disabled:opacity-50"
            style={{ background: 'var(--brass)', color: '#0C0A09' }}
          >
            {saving ? 'Guardando…' : 'Guardar servicio'}
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        {items.map(s => (
          <div
            key={s.id}
            className="flex items-center justify-between p-3"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', opacity: s.is_active ? 1 : 0.5 }}
          >
            <div>
              <span className="text-sm" style={{ color: 'var(--ink-primary)' }}>{s.name}</span>
              <span className="num text-2xs ml-2" style={{ color: 'var(--ink-muted)' }}>{s.duration_minutes} min</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="num text-sm font-medium" style={{ color: 'var(--ink-primary)' }}>{MXN(s.price)}</span>
              <button
                onClick={() => toggleActive(s)}
                className="flex items-center justify-center w-7 h-7"
                style={{ background: 'var(--surface-3)', color: s.is_active ? 'var(--brass)' : 'var(--ink-muted)' }}
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

// ─── Barberos ───
function BarbersTab() {
  const [items, setItems] = useState<Barber[] | null>(null)
  const [error, setError] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [rate, setRate] = useState('')
  const [saving, setSaving] = useState(false)

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
      const res = await fetch('/api/barbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), commission_rate: r }),
      })
      if (!res.ok) throw new Error()
      toast.success('Barbero creado')
      setName(''); setRate(''); setAdding(false)
      load()
    } catch {
      toast.error('No se pudo crear el barbero')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(b: Barber) {
    try {
      const res = await fetch(`/api/barbers/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !b.is_active }),
      })
      if (!res.ok) throw new Error()
      toast.success(b.is_active ? 'Barbero desactivado' : 'Barbero activado')
      load()
    } catch {
      toast.error('No se pudo actualizar')
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
          className="flex items-center gap-1 px-3 py-1.5 text-2xs font-medium uppercase tracking-wide"
          style={{ background: 'var(--surface-3)', color: 'var(--ink-secondary)' }}
        >
          <Plus size={13} /> Nuevo
        </button>
      </div>

      {adding && (
        <div className="p-3 space-y-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)' }}>
          <input
            value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del barbero"
            className="w-full px-3 py-2 text-sm" style={fieldStyle}
          />
          <input
            value={rate} onChange={e => setRate(e.target.value)} placeholder="Comisión % (ej. 40)" inputMode="numeric"
            className="w-full px-3 py-2 text-sm" style={fieldStyle}
          />
          <button
            onClick={create} disabled={saving}
            className="px-4 py-2 text-2xs font-medium uppercase tracking-wide disabled:opacity-50"
            style={{ background: 'var(--brass)', color: '#0C0A09' }}
          >
            {saving ? 'Guardando…' : 'Guardar barbero'}
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        {items.map(b => (
          <div
            key={b.id}
            className="flex items-center justify-between p-3"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', opacity: b.is_active ? 1 : 0.5 }}
          >
            <span className="text-sm" style={{ color: 'var(--ink-primary)' }}>{b.name}</span>
            <div className="flex items-center gap-3">
              <span className="num text-2xs" style={{ color: 'var(--brass)' }}>{b.commission_rate}% comisión</span>
              <button
                onClick={() => toggleActive(b)}
                className="flex items-center justify-center w-7 h-7"
                style={{ background: 'var(--surface-3)', color: b.is_active ? 'var(--brass)' : 'var(--ink-muted)' }}
                aria-label={b.is_active ? 'Desactivar' : 'Activar'}
              >
                {b.is_active ? <Check size={14} /> : <X size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>
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
          className="w-full px-3 py-2 text-sm" style={fieldStyle} />
      </Field>
      <Field label="Dirección">
        <input value={tenant.address ?? ''} onChange={e => set({ address: e.target.value })}
          className="w-full px-3 py-2 text-sm" style={fieldStyle} />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Teléfono">
          <input value={tenant.phone ?? ''} onChange={e => set({ phone: e.target.value })}
            className="w-full px-3 py-2 text-sm" style={fieldStyle} />
        </Field>
        <Field label="Email">
          <input value={tenant.email ?? ''} onChange={e => set({ email: e.target.value })}
            className="w-full px-3 py-2 text-sm" style={fieldStyle} />
        </Field>
      </div>
      <Field label="Sitio web">
        <input value={tenant.website ?? ''} onChange={e => set({ website: e.target.value })}
          className="w-full px-3 py-2 text-sm" style={fieldStyle} />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Tolerancia de retraso (min)">
          <input value={tenant.late_tolerance_minutes} inputMode="numeric"
            onChange={e => set({ late_tolerance_minutes: Number(e.target.value) || 0 })}
            className="w-full px-3 py-2 text-sm num" style={fieldStyle} />
        </Field>
        <Field label="Buffer entre citas (min)">
          <input value={tenant.appointment_buffer_minutes} inputMode="numeric"
            onChange={e => set({ appointment_buffer_minutes: Number(e.target.value) || 0 })}
            className="w-full px-3 py-2 text-sm num" style={fieldStyle} />
        </Field>
      </div>
      <Field label="Base de conocimiento del agente (WhatsApp)">
        <textarea value={tenant.agent_knowledge_base ?? ''} rows={8}
          onChange={e => set({ agent_knowledge_base: e.target.value })}
          className="w-full px-3 py-2 text-sm font-mono" style={fieldStyle} />
      </Field>

      <button
        onClick={save} disabled={saving}
        className="px-4 py-2 text-2xs font-medium uppercase tracking-wide disabled:opacity-50"
        style={{ background: 'var(--brass)', color: '#0C0A09' }}
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
