'use client'

import { useState, useEffect } from 'react'
import type { Barber, Client } from '@/types/app'

type Props = {
  barbers: Barber[]
  client?: Client
  onClose: () => void
  onSaved: (client: Client) => void
}

type FormState = {
  name: string
  phone: string
  email: string
  whatsapp_id: string
  notes: string
  preferred_barber_id: string
}

const inputClass = `
  w-full px-0 py-1.5 text-sm bg-transparent border-0 border-b
  focus:outline-none focus:ring-0 transition-colors
`.trim()

export default function ClientModal({ barbers, client, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>({
    name:                client?.name ?? '',
    phone:               client?.phone ?? '',
    email:               client?.email ?? '',
    whatsapp_id:         client?.whatsapp_id ?? '',
    notes:               client?.notes ?? '',
    preferred_barber_id: client?.preferred_barber_id ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (client) {
      setForm({
        name:                client.name,
        phone:               client.phone ?? '',
        email:               client.email ?? '',
        whatsapp_id:         client.whatsapp_id ?? '',
        notes:               client.notes ?? '',
        preferred_barber_id: client.preferred_barber_id ?? '',
      })
    }
  }, [client])

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    setSubmitting(true)
    setError(null)

    const payload = {
      name:                form.name.trim(),
      phone:               form.phone.trim() || undefined,
      email:               form.email.trim() || undefined,
      whatsapp_id:         form.whatsapp_id.trim() || undefined,
      notes:               form.notes.trim() || undefined,
      preferred_barber_id: form.preferred_barber_id || null,
    }

    try {
      const url    = client ? `/api/clients/${client.id}` : '/api/clients'
      const method = client ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data: Client | { error: string } = await res.json()
      if (!res.ok || 'error' in data) { setError('error' in data ? data.error : 'Error al guardar'); return }
      onSaved(data)
    } catch {
      setError('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  const isEdit = !!client

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div
        className="w-full max-w-md mx-4 flex flex-col max-h-[90vh]"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="font-display text-lg font-medium" style={{ color: 'var(--ink-primary)' }}>
            {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <button
            onClick={onClose}
            className="text-lg leading-none transition-colors"
            style={{ color: 'var(--ink-muted)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-muted)' }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Nombre */}
          <div>
            <label className="label-caps block mb-2">
              Nombre <span style={{ color: 'var(--brass)' }}>*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className={inputClass}
              style={{
                borderColor: 'var(--border-default)',
                color: 'var(--ink-primary)',
              }}
              onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brass)' }}
              onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)' }}
              placeholder="Nombre completo"
              autoFocus
            />
          </div>

          {/* Teléfono / Correo */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="label-caps block mb-2">Teléfono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className={inputClass}
                style={{ borderColor: 'var(--border-default)', color: 'var(--ink-primary)' }}
                onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brass)' }}
                onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)' }}
                placeholder="+521XXXXXXXXXX"
              />
            </div>
            <div>
              <label className="label-caps block mb-2">Correo</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className={inputClass}
                style={{ borderColor: 'var(--border-default)', color: 'var(--ink-primary)' }}
                onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brass)' }}
                onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)' }}
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>

          {/* WhatsApp ID */}
          <div>
            <label className="label-caps block mb-2">
              WhatsApp ID
              <span className="normal-case ml-1.5" style={{ color: 'var(--ink-muted)', letterSpacing: 0 }}>
                — para el agente
              </span>
            </label>
            <input
              type="text"
              value={form.whatsapp_id}
              onChange={e => set('whatsapp_id', e.target.value)}
              className={`${inputClass} font-mono`}
              style={{ borderColor: 'var(--border-default)', color: 'var(--ink-primary)' }}
              onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brass)' }}
              onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)' }}
              placeholder="521XXXXXXXXXX"
            />
          </div>

          {/* Barbero preferido */}
          <div>
            <label className="label-caps block mb-2">Barbero preferido</label>
            <select
              value={form.preferred_barber_id}
              onChange={e => set('preferred_barber_id', e.target.value)}
              className="w-full py-1.5 text-sm border-0 border-b focus:outline-none focus:ring-0 transition-colors bg-transparent"
              style={{
                borderColor: 'var(--border-default)',
                color: form.preferred_barber_id ? 'var(--ink-primary)' : 'var(--ink-muted)',
              }}
              onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brass)' }}
              onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)' }}
            >
              <option value="" style={{ background: 'var(--surface-2)', color: 'var(--ink-secondary)' }}>
                Sin preferencia
              </option>
              {barbers.map(b => (
                <option key={b.id} value={b.id} style={{ background: 'var(--surface-2)', color: 'var(--ink-primary)' }}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notas */}
          <div>
            <label className="label-caps block mb-2">Notas</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className="w-full px-0 py-1.5 text-sm bg-transparent border-0 border-b focus:outline-none focus:ring-0 resize-none transition-colors"
              style={{
                borderColor: 'var(--border-default)',
                color: 'var(--ink-primary)',
              }}
              onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brass)' }}
              onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)' }}
              placeholder="Tipo de cabello, alergias, preferencias…"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {error && (
            <p className="text-xs" style={{ color: '#E05252' }}>{error}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 text-xs uppercase transition-colors"
              style={{
                border: '1px solid var(--border-default)',
                color: 'var(--ink-secondary)',
                letterSpacing: '0.08em',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2 text-xs font-medium uppercase transition-opacity disabled:opacity-40"
              style={{
                background: 'var(--brass)',
                color: '#0C0A09',
                letterSpacing: '0.08em',
              }}
            >
              {submitting ? '…' : isEdit ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
