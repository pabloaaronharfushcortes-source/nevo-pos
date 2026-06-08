import { AlertTriangle } from 'lucide-react'

// Estado de error de carga: mensaje amable + botón de reintento.
// Nunca muestra detalles técnicos del error.
export function ErrorState({
  message = 'No se pudo cargar la información',
  onRetry,
}: {
  message?: string
  onRetry: () => void
}) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-6 text-center">
      <AlertTriangle size={32} strokeWidth={1.5} style={{ color: 'var(--brass)' }} />
      <p className="mt-4 text-sm" style={{ color: 'var(--ink-secondary)' }}>
        {message}
      </p>
      <button
        onClick={onRetry}
        className="mt-5 inline-flex items-center px-4 py-2 text-xs font-medium uppercase tracking-wide transition-colors"
        style={{ background: 'var(--brass)', color: '#0C0A09', letterSpacing: '0.08em' }}
      >
        Reintentar
      </button>
    </div>
  )
}
