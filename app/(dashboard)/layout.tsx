import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/supabase/auth'
import LogoutButton from './LogoutButton'

const NAV_ITEMS = [
  { href: '/agenda', label: 'Agenda' },
  { href: '/queue', label: 'Cola' },
  { href: '/pos', label: 'POS' },
  { href: '/clients', label: 'Clientes' },
  { href: '/conversations', label: 'Conversaciones' },
  { href: '/reports', label: 'Reportes' },
  { href: '/settings', label: 'Configuración' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-52 flex flex-col bg-gray-900 text-gray-100 flex-shrink-0">
        <div className="px-4 py-5 border-b border-gray-700">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">NEVO-POS</p>
          <p className="text-sm font-semibold mt-2 truncate">{user.name}</p>
          <p className="text-xs text-gray-400 capitalize">{user.role}</p>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-2 py-4 border-t border-gray-700">
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
