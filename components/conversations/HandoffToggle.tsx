'use client'

import { useState } from 'react'
import ConfirmModal from '@/components/ui/ConfirmModal'

type Props = {
  mode: string
  onChange: (mode: 'agent' | 'human') => Promise<void>
}

// Interruptor de control de la conversación: agente (Claude) vs. humano (recepción).
// Ambas direcciones requieren confirmación (acción que altera quién responde al cliente).
export default function HandoffToggle({ mode, onChange }: Props) {
  const [pending, setPending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const isHuman = mode === 'human'

  async function confirmToggle() {
    setConfirming(false)
    setPending(true)
    try {
      await onChange(isHuman ? 'agent' : 'human')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        disabled={pending}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border-[1.5px] transition-colors disabled:opacity-40"
        style={
          isHuman
            ? { background: '#FF6B6B', color: '#FFFFFF', borderColor: '#FF6B6B' }
            : { borderColor: '#EDEDED', color: '#6B6B8A' }
        }
        title={isHuman ? 'Devolver el control al agente' : 'Tomar el control de la conversación'}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: isHuman ? '#FFFFFF' : '#FF6B6B' }}
        />
        {pending ? '…' : isHuman ? 'Control humano' : 'Tomar control'}
      </button>

      <ConfirmModal
        isOpen={confirming}
        title={isHuman ? 'Devolver al agente' : 'Tomar control humano'}
        description={
          isHuman
            ? 'El agente de WhatsApp volverá a responder automáticamente a este cliente.'
            : 'Tú responderás manualmente a este cliente; el agente dejará de contestar.'
        }
        confirmLabel={isHuman ? 'Sí, devolver al agente' : 'Sí, tomar control'}
        cancelLabel="Cancelar"
        variant="warning"
        onConfirm={confirmToggle}
        onCancel={() => setConfirming(false)}
      />
    </>
  )
}
