import type { LucideIcon } from 'lucide-react'

// Estado vacío: ícono del módulo, mensaje contextual y una acción sugerida.
export function EmptyState({
  icon: Icon,
  message,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon
  message: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-6 text-center">
      <Icon size={32} strokeWidth={1.5} style={{ color: 'var(--ink-muted)' }} />
      <p className="mt-4 text-sm" style={{ color: 'var(--ink-secondary)' }}>
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center px-4 py-2 text-xs font-medium uppercase tracking-wide transition-colors"
          style={{ border: '1px solid var(--border-default)', color: 'var(--ink-primary)', letterSpacing: '0.08em' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
