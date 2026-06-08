import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/supabase/auth'
import SettingsBoard from '@/components/settings/SettingsBoard'

// Configuración — módulo restringido a admin (CLAUDE.md §3)
export default async function SettingsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/agenda')

  return <SettingsBoard />
}
