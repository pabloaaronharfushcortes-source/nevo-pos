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

export default function MobileSidebar({ userName, userRole, logoutButton }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center w-9 h-9 transition-colors"
        style={{ color: '#6B6B8A', borderRadius: '8px' }}
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(14,13,26,0.40)' }}
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r transition-transform duration-200 md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          width: 240,
          background: '#FFFFFF',
          borderColor: '#EDEDED',
        }}
      >
        <div
          className="px-6 py-6 border-b flex items-start justify-between"
          style={{ borderColor: '#EDEDED' }}
        >
          <div>
            <p className="font-display text-xl font-semibold" style={{ color: '#0E0D1A' }}>
              NEVO <span className="text-base font-normal" style={{ color: '#A259FF' }}>POS</span>
            </p>
            <p className="text-xs mt-1" style={{ color: '#6B6B8A' }}>Mercurio Barbería</p>
            <p className="text-sm font-medium mt-3 truncate" style={{ color: '#0E0D1A' }}>{userName}</p>
            <p className="text-xs mt-0.5 capitalize" style={{ color: '#6B6B8A' }}>{userRole}</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 transition-colors"
            style={{ color: '#9B9BB0' }}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <SidebarNav role={userRole} />

        <div className="px-3 py-4 border-t" style={{ borderColor: '#EDEDED' }}>
          {logoutButton}
        </div>
      </div>
    </>
  )
}
