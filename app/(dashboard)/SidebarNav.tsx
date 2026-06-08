'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  Users2,
  ShoppingBag,
  MessageSquare,
  BarChart3,
  Settings,
  ListOrdered,
} from 'lucide-react'

// adminOnly: Reportes y Configuración son módulos restringidos a admin (CLAUDE.md §3)
const NAV_ITEMS = [
  { href: '/agenda',        label: 'Agenda',          icon: CalendarDays },
  { href: '/queue',         label: 'Cola',             icon: ListOrdered },
  { href: '/pos',           label: 'POS',              icon: ShoppingBag },
  { href: '/clients',       label: 'Clientes',         icon: Users2 },
  { href: '/conversations', label: 'Conversaciones',   icon: MessageSquare },
  { href: '/reports',       label: 'Reportes',         icon: BarChart3,  adminOnly: true },
  { href: '/settings',      label: 'Configuración',    icon: Settings,   adminOnly: true },
]

export default function SidebarNav({ role }: { role?: string }) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter(item => !item.adminOnly || role === 'admin')

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors"
            style={{
              borderRadius: '8px',
              color:      active ? '#A259FF' : '#6B6B8A',
              background: active ? '#F0E6FF' : 'transparent',
              fontWeight: active ? 600 : 400,
            }}
            onMouseEnter={e => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.background = '#F5EEFF'
                ;(e.currentTarget as HTMLElement).style.color = '#A259FF'
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = '#6B6B8A'
              }
            }}
          >
            <Icon size={18} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
