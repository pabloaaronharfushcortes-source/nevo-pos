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

export default function ClientModal({ barbers, client, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>({
    name: client?.name ?? '',
    phone: client?.phone ?? '',
    email: client?.email ?? '',
    whatsapp_id: client?.whatsapp_id ?? '',
    notes: client?.notes ?? '',
    preferred_barber_id: client?.preferred_barber_id ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name,
        phone: client.phone ?? '',
        email: client.email ?? '',
        whatsapp_id: client.whatsapp_id ?? '',
        notes: client.notes ?? '',
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
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      whatsapp_id: form.whatsapp_id.trim() || undefined,
      notes: form.notes.trim() || undefined,
      preferred_barber_id: form.preferred_barber_id || null,
    }

    try {
      const url = client ? `/api/clients/${client.id}` : '/api/clients'
      const method = client ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data: Client | { error: string } = await res.json()

      if (!res.ok || 'error' in data) {
        setError('error' in data ? data.error : 'Error al guardar')
        return
      }

      onSaved(data)
    } catch {
      setError('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  const isEdit = !!client

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
              placeholder="Nombre completo"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                placeholder="+521XXXXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Correo</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              WhatsApp ID
              <span className="text-gray-400 font-normal ml-1">(para reconocimiento del agente)</span>
            </label>
            <input
              type="text"
              value={form.whatsapp_id}
              onChange={e => set('whatsapp_id', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
              placeholder="521XXXXXXXXXX"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Barbero preferido</label>
            <select
              value={form.preferred_barber_id}
              onChange={e => set('preferred_barber_id', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              <option value="">Sin preferencia</option>
              {barbers.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
              placeholder="Tipo de cabello, alergias, preferencias…"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t flex-shrink-0 space-y-2">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
