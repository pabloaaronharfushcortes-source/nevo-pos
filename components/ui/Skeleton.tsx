export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ background: '#F0F0F5', borderRadius: 6, ...style }}
    />
  )
}

export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="px-4 py-4 space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3"
          style={{ border: '1px solid #EDEDED', borderRadius: 10, background: '#FFFFFF' }}
        >
          <Skeleton className="h-8 w-8 flex-shrink-0" style={{ borderRadius: '50%' }} />
          <Skeleton className="h-3.5" style={{ width: '30%' }} />
          <Skeleton className="h-3" style={{ width: '20%' }} />
          <Skeleton className="h-3 ml-auto" style={{ width: '10%' }} />
        </div>
      ))}
    </div>
  )
}
