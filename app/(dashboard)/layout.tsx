import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/supabase/auth'
import LogoutButton from './LogoutButton'
import SidebarNav from './SidebarNav'
import ToastContainer from '@/components/ui/ToastContainer'
import MobileSidebar from '@/components/layout/MobileSidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--surface-0)' }}>
      {/* Sidebar — oculto en mobile, visible en md+ */}
      <aside
        className="hidden md:flex w-48 flex-col flex-shrink-0 border-r"
        style={{
          background: 'var(--surface-0)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div
          className="px-5 py-5 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <p className="font-display text-lg font-medium tracking-wide leading-none" style={{ color: 'var(--ink-primary)' }}>
            NEVO
          </p>
          <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--brass)', letterSpacing: '0.15em' }}>
            POS
          </p>
          <p className="text-xs mt-3 truncate" style={{ color: 'var(--ink-muted)', letterSpacing: '0.02em' }}>
            {user.name}
          </p>
          <p className="text-2xs mt-0.5 uppercase" style={{ color: 'var(--ink-muted)', letterSpacing: '0.1em' }}>
            {user.role}
          </p>
        </div>
        <SidebarNav role={user.role} />
        <div className="px-3 py-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <LogoutButton />
        </div>
      </aside>

      {/* Columna principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header mobile — solo visible en < 768px */}
        <header
          className="md:hidden flex items-center px-3 py-2 border-b flex-shrink-0"
          style={{ background: 'var(--surface-0)', borderColor: 'var(--border-subtle)' }}
        >
          <MobileSidebar
            userName={user.name}
            userRole={user.role}
            logoutButton={<LogoutButton />}
          />
          <p className="font-display text-base font-medium ml-2" style={{ color: 'var(--ink-primary)' }}>
            NEVO <span className="font-mono text-xs" style={{ color: 'var(--brass)' }}>POS</span>
          </p>
        </header>

        <main className="flex-1 overflow-auto min-w-0">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
