'use client'

import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import type { ToastItem } from '@/hooks/useToast'

const STYLES: Record<ToastItem['kind'], { bar: string; bg: string; textColor: string; icon: typeof Info }> = {
  success: { bar: '#FF6B6B', bg: '#FFFFFF',  textColor: '#0E0D1A', icon: CheckCircle2 },
  error:   { bar: '#E85555', bg: '#FFF0F0',  textColor: '#E85555', icon: AlertCircle },
  info:    { bar: '#A259FF', bg: '#F5EEFF',  textColor: '#A259FF', icon: Info },
}

export function Toast({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const { bar, bg, textColor, icon: Icon } = STYLES[item.kind]
  return (
    <div
      className="flex items-start gap-3 w-72 px-4 py-3 animate-[slideUp_150ms_ease-out]"
      style={{
        background: bg,
        borderLeft: `4px solid ${bar}`,
        boxShadow: '0 4px 12px rgba(14,13,26,0.12)',
        borderRadius: '0 8px 8px 0',
      }}
      role="status"
    >
      <Icon size={16} style={{ color: bar }} className="mt-0.5 flex-shrink-0" />
      <p className="flex-1 text-sm leading-snug" style={{ color: textColor }}>{item.message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 transition-opacity hover:opacity-60"
        style={{ color: '#9B9BB0' }}
        aria-label="Cerrar"
      >
        <X size={14} />
      </button>
    </div>
  )
}
