'use client'

import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/agenda',        label: 'Agenda' },
  { href: '/queue',         label: 'Cola' },
  { href: '/pos',           label: 'POS' },
  { href: '/clients',       label: 'Clientes' },
  { href: '/conversations', label: 'Conversaciones' },
  { href: '/reports',       label: 'Reportes' },
  { href: '/settings',      label: 'Configuración' },
]

export default function SidebarNav() {
  return (
    <nav className="flex-1 px-3 py-4 space-y-px overflow-y-auto">
      {NAV_ITEMS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center px-2 py-2 text-xs uppercase transition-colors group"
          style={{
            letterSpacing: '0.08em',
            color: 'var(--ink-secondary)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--ink-primary)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--ink-secondary)'
          }}
        >
          <span
            className="w-0.5 h-3 mr-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'var(--brass)' }}
          />
          {label}
        </Link>
      ))}
    </nav>
  )
}
