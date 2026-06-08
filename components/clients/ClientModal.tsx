'use client'

import { useState, useEffect } from 'react'
import type { Barber, Client } from '@/types/app'
import { toast } from '@/hooks/useToast'

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

const inputClass = 'w-full rounded-lg border-[1.5px] border-[#EDEDED] bg-[#FAFAFA] px-3 py-2.5 text-sm text-[#0E0D1A] focus:border-[#A259FF] focus:outline-none focus:ring-0 transition-colors'

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
      if (!res.ok || 'error' in data) {
        setError('error' in data ? data.error : 'Error al guardar')
        toast.error('Algo salió mal. Intenta de nuevo.')
        return
      }
      toast.success(client ? 'Perfil actualizado' : 'Cliente agregado')
      onSaved(data)
    } catch {
      setError('Error de conexión')
      toast.error('Algo salió mal. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const isEdit = !!client

  return (
    <div className="fixed inset-0 z-50 flex md:items-center md:justify-center items-end justify-center" style={{ background: 'rgba(14,13,26,0.40)' }}>
      <div
        className="w-full md:max-w-md md:mx-4 md:rounded-2xl rounded-t-2xl flex flex-col max-h-[90dvh] overflow-y-auto shadow-xl"
        style={{ background: '#FFFFFF' }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #EDEDED' }}>
          <h2 className="font-display text-xl font-semibold" style={{ color: '#0E0D1A' }}>
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
              placeholder="521XXXXXXXXXX"
            />
          </div>

          {/* Barbero preferido */}
          <div>
            <label className="label-caps block mb-2">Barbero preferido</label>
            <select
              value={form.preferred_barber_id}
              onChange={e => set('preferred_barber_id', e.target.value)}
              className={inputClass}
              style={{ color: form.preferred_barber_id ? '#0E0D1A' : '#9B9BB0' }}
            >
              <option value="">Sin preferencia</option>
              {barbers.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
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
              className={`${inputClass} resize-none`}
              placeholder="Tipo de cabello, alergias, preferencias…"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 space-y-3" style={{ borderTop: '1px solid #EDEDED' }}>
          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#E85555', background: '#FFF0F0' }}>{error}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg border-[1.5px] transition-colors"
              style={{ borderColor: '#EDEDED', color: '#6B6B8A' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FAFAFA' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors"
              style={{ background: '#FF6B6B' }}
              onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLElement).style.background = '#E85555' }}
              onMouseLeave={e => { if (!submitting) (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
            >
              {submitting ? '…' : isEdit ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
