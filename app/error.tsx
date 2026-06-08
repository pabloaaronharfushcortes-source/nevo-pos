'use client'

import { useEffect } from 'react'

// Error boundary global — captura errores no manejados en el árbol de la app.
// No expone stack traces ni mensajes internos al usuario (CLAUDE.md §11).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log para debugging; nunca se muestra al usuario
    console.error('[app/error]', error)
  }, [error])

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6"
      style={{ background: 'var(--surface-0)', color: 'var(--ink-primary)' }}
    >
      <div className="w-full max-w-sm text-center space-y-5">
        <p
          className="font-mono text-2xs uppercase"
          style={{ color: 'var(--brass)', letterSpacing: '0.2em' }}
        >
          Error
        </p>
        <h1 className="font-display text-2xl font-medium">Algo salió mal</h1>
        <p className="text-sm" style={{ color: 'var(--ink-secondary)' }}>
          Ocurrió un problema inesperado. Intenta de nuevo.
        </p>
        <button
          onClick={reset}
          className="mt-2 inline-flex items-center justify-center px-5 py-2.5 text-xs font-medium uppercase tracking-wide transition-colors"
          style={{ background: 'var(--brass)', color: '#0C0A09', letterSpacing: '0.08em' }}
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
