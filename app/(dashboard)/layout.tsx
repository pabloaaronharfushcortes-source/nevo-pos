import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/supabase/auth'
import LogoutButton from './LogoutButton'
import SidebarNav from './SidebarNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--surface-0)' }}>
      {/* Sidebar */}
      <aside
        className="w-48 flex flex-col flex-shrink-0 border-r"
        style={{
          background: 'var(--surface-0)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Marca */}
        <div
          className="px-5 py-5 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <p
            className="font-display text-lg font-medium tracking-wide leading-none"
            style={{ color: 'var(--ink-primary)' }}
          >
            NEVO
          </p>
          <p
            className="font-mono text-xs mt-0.5"
            style={{ color: 'var(--brass)', letterSpacing: '0.15em' }}
          >
            POS
          </p>
          <p
            className="text-xs mt-3 truncate"
            style={{ color: 'var(--ink-muted)', letterSpacing: '0.02em' }}
          >
            {user.name}
          </p>
          <p
            className="text-2xs mt-0.5 uppercase"
            style={{ color: 'var(--ink-muted)', letterSpacing: '0.1em' }}
          >
            {user.role}
          </p>
        </div>

        {/* Nav */}
        <SidebarNav />

        {/* Footer */}
        <div
          className="px-3 py-4 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <LogoutButton />
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
