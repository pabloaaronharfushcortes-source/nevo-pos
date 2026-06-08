'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import SidebarNav from '@/app/(dashboard)/SidebarNav'

type Props = {
  userName: string
  userRole: string
  logoutButton: React.ReactNode
}

// En mobile (< 768px): sidebar como drawer deslizante desde la izquierda.
// En desktop: invisible — el sidebar estático del layout toma el control.
export default function MobileSidebar({ userName, userRole, logoutButton }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Cierra el drawer al cambiar de ruta
  useEffect(() => { setOpen(false) }, [pathname])

  // Bloquea el scroll del body cuando el drawer está abierto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Botón hamburguesa — solo visible en mobile */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center w-10 h-10 transition-colors"
        style={{ color: 'var(--ink-secondary)' }}
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-48 flex flex-col border-r transition-transform duration-200 md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'var(--surface-0)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Header del drawer */}
        <div
          className="px-5 py-5 border-b flex items-start justify-between"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <p className="font-display text-lg font-medium tracking-wide leading-none" style={{ color: 'var(--ink-primary)' }}>
              NEVO
            </p>
            <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--brass)', letterSpacing: '0.15em' }}>
              POS
            </p>
            <p className="text-xs mt-3 truncate" style={{ color: 'var(--ink-muted)', letterSpacing: '0.02em' }}>
              {userName}
            </p>
            <p className="text-2xs mt-0.5 uppercase" style={{ color: 'var(--ink-muted)', letterSpacing: '0.1em' }}>
              {userRole}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 transition-colors"
            style={{ color: 'var(--ink-muted)' }}
            aria-label="Cerrar menú"
          >
            <X size={16} />
          </button>
        </div>

        <SidebarNav role={userRole} />

        <div className="px-3 py-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {logoutButton}
        </div>
      </div>
    </>
  )
}
