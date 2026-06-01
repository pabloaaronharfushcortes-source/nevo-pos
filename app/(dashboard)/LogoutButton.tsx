'use client'

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
      className="w-full text-left text-xs uppercase px-2 py-2 transition-colors"
      style={{
        color: 'var(--ink-muted)',
        letterSpacing: '0.08em',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-secondary)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-muted)' }}
    >
      Salir
    </button>
  )
}
