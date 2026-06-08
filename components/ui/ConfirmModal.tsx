'use client'

type Props = {
  isOpen: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  onConfirm: () => void
  onCancel: () => void
}

// Modal de confirmación reutilizable para acciones irreversibles.
// El botón de confirmación dice exactamente qué va a pasar.
export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: Props) {
  if (!isOpen) return null

  const confirmBg = variant === 'danger' ? '#B91C1C' : 'var(--brass)'
  const confirmColor = variant === 'danger' ? '#FFFFFF' : '#0C0A09'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_150ms_ease-out]"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm p-6 animate-[scaleIn_150ms_ease-out]"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="font-display text-lg font-medium" style={{ color: 'var(--ink-primary)' }}>
          {title}
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-secondary)' }}>
          {description}
        </p>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium uppercase tracking-wide transition-colors"
            style={{ border: '1px solid var(--border-default)', color: 'var(--ink-secondary)', letterSpacing: '0.08em' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-medium uppercase tracking-wide transition-opacity hover:opacity-90"
            style={{ background: confirmBg, color: confirmColor, letterSpacing: '0.08em' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
