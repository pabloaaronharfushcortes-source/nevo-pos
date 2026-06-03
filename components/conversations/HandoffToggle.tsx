'use client'

import { useState } from 'react'

type Props = {
  mode: string
  onChange: (mode: 'agent' | 'human') => Promise<void>
}

// Interruptor de control de la conversación: agente (Claude) vs. humano (recepción).
export default function HandoffToggle({ mode, onChange }: Props) {
  const [pending, setPending] = useState(false)
  const isHuman = mode === 'human'

  async function toggle() {
    setPending(true)
    try {
      await onChange(isHuman ? 'agent' : 'human')
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="flex items-center gap-2 px-3 py-1.5 text-2xs font-medium uppercase tracking-wide transition-colors disabled:opacity-40"
      style={
        isHuman
          ? { background: 'var(--brass)', color: '#0C0A09' }
          : { border: '1px solid var(--border-default)', color: 'var(--ink-secondary)' }
      }
      title={isHuman ? 'Devolver el control al agente' : 'Tomar el control de la conversación'}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: isHuman ? '#0C0A09' : 'var(--brass)' }}
      />
      {pending ? '…' : isHuman ? 'Control humano' : 'Tomar control'}
    </button>
  )
}
