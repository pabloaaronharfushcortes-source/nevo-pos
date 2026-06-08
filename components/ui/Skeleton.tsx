// Rectángulo gris animado (pulse) para estados de carga.
// Replica el layout de listas/tablas sin dejar la pantalla en blanco.
export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ background: 'var(--surface-2)', borderRadius: 2, ...style }}
    />
  )
}

// Lista de filas-esqueleto que imita una tabla/lista del dashboard.
export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="px-6 py-4 space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-1)' }}
        >
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-3" style={{ width: '28%' }} />
          <Skeleton className="h-3" style={{ width: '18%' }} />
          <Skeleton className="h-3 ml-auto" style={{ width: '12%' }} />
        </div>
      ))}
    </div>
  )
}
