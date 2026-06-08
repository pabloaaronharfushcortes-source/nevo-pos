import type { LucideIcon } from 'lucide-react'

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
      <Icon size={32} strokeWidth={1.5} style={{ color: '#D4D4E0' }} />
      <p className="mt-4 text-sm" style={{ color: '#6B6B8A' }}>
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center px-5 py-2 text-sm font-medium text-white transition-colors"
          style={{ background: '#FF6B6B', borderRadius: '8px' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E85555' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
