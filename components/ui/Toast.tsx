'use client'

import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import type { ToastItem } from '@/hooks/useToast'

const STYLES: Record<ToastItem['kind'], { bar: string; icon: typeof Info }> = {
  success: { bar: '#15803D', icon: CheckCircle2 },
  error: { bar: '#B91C1C', icon: AlertCircle },
  info: { bar: 'var(--ink-muted)', icon: Info },
}

// Notificación individual: barra de color por tipo + ícono + cierre manual.
export function Toast({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const { bar, icon: Icon } = STYLES[item.kind]
  return (
    <div
      className="flex items-start gap-3 w-72 px-4 py-3 shadow-lg animate-[slideUp_150ms_ease-out]"
      style={{ background: 'var(--surface-3)', borderLeft: `2px solid ${bar}`, color: 'var(--ink-primary)' }}
      role="status"
    >
      <Icon size={16} style={{ color: bar }} className="mt-0.5 flex-shrink-0" />
      <p className="flex-1 text-sm leading-snug">{item.message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 transition-opacity hover:opacity-70"
        style={{ color: 'var(--ink-muted)' }}
        aria-label="Cerrar"
      >
        <X size={14} />
      </button>
    </div>
  )
}
