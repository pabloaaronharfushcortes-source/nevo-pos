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
    <div className="flex h-screen overflow-hidden" style={{ background: '#FFFFFF' }}>
      {/* Sidebar desktop — visible en md+ */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 border-r"
        style={{
          width: 240,
          background: '#FFFFFF',
          borderColor: '#EDEDED',
        }}
      >
        {/* Brand */}
        <div className="px-6 py-6 border-b" style={{ borderColor: '#EDEDED' }}>
          <p className="font-display text-xl font-semibold" style={{ color: '#0E0D1A' }}>
            NEVO <span className="text-base font-normal" style={{ color: '#A259FF' }}>POS</span>
          </p>
          <p className="text-xs mt-1 truncate" style={{ color: '#6B6B8A' }}>
            Mercurio Barbería
          </p>
        </div>

        {/* Nav */}
        <SidebarNav role={user.role} />

        {/* User + logout */}
        <div className="px-3 py-4 border-t" style={{ borderColor: '#EDEDED' }}>
          <div className="px-3 mb-2">
            <p className="text-sm font-medium truncate" style={{ color: '#0E0D1A' }}>
              {user.name}
            </p>
            <p className="text-xs mt-0.5 capitalize" style={{ color: '#6B6B8A' }}>
              {user.role}
            </p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Columna principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header mobile */}
        <header
          className="md:hidden flex items-center px-4 py-3 border-b flex-shrink-0"
          style={{ background: '#FFFFFF', borderColor: '#EDEDED' }}
        >
          <MobileSidebar
            userName={user.name}
            userRole={user.role}
            logoutButton={<LogoutButton />}
          />
          <p className="font-display text-lg font-semibold ml-3" style={{ color: '#0E0D1A' }}>
            NEVO <span className="text-sm font-normal" style={{ color: '#A259FF' }}>POS</span>
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
