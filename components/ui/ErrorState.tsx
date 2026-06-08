import { AlertTriangle } from 'lucide-react'

export function ErrorState({
  message = 'No se pudo cargar la información',
  onRetry,
}: {
  message?: string
  onRetry: () => void
}) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-6 text-center">
      <AlertTriangle size={32} strokeWidth={1.5} style={{ color: '#FF6B6B' }} />
      <p className="mt-4 text-sm" style={{ color: '#6B6B8A' }}>
        {message}
      </p>
      <button
        onClick={onRetry}
        className="mt-5 inline-flex items-center px-5 py-2 text-sm font-medium text-white transition-colors"
        style={{ background: '#FF6B6B', borderRadius: '8px' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E85555' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
      >
        Reintentar
      </button>
    </div>
  )
}
