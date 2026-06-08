'use client'

import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors"
      style={{ color: '#6B6B8A', borderRadius: '8px' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = '#FFF0F0'
        ;(e.currentTarget as HTMLElement).style.color = '#E85555'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLElement).style.color = '#6B6B8A'
      }}
    >
      <LogOut size={18} />
      Cerrar sesión
    </button>
  )
}
