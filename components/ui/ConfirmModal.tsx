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

  const confirmBg    = variant === 'danger' ? '#FF6B6B' : '#A259FF'
  const confirmHover = variant === 'danger' ? '#E85555' : '#8B3FFF'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_150ms_ease-out]"
      style={{ background: 'rgba(14,13,26,0.40)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm p-6 animate-[scaleIn_150ms_ease-out]"
        style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="font-display text-xl font-medium" style={{ color: '#0E0D1A' }}>
          {title}
        </h2>
        <p className="mt-2 text-sm" style={{ color: '#6B6B8A' }}>
          {description}
        </p>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={{
              color: '#6B6B8A',
              background: 'transparent',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0E0D1A' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B6B8A' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white transition-colors"
            style={{ background: confirmBg, borderRadius: '8px' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = confirmHover }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = confirmBg }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
