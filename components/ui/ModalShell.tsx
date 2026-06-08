'use client'

// Contenedor de modal responsive:
// - Desktop: overlay centrado, max-w-md
// - Mobile (< 768px): bottom sheet que desliza desde abajo, 90% del alto
export default function ModalShell({
  onClose,
  children,
  className = '',
}: {
  onClose: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex md:items-center md:justify-center items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className={`
          w-full md:max-w-md
          md:max-h-[90vh]
          max-h-[90dvh]
          h-auto
          overflow-y-auto
          animate-[slideUp_200ms_ease-out]
          md:animate-[scaleIn_150ms_ease-out]
          ${className}
        `}
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  )
}
