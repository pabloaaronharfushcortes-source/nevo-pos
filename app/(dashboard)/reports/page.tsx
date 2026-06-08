import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/supabase/auth'
import ReportsBoard from '@/components/reports/ReportsBoard'

// Reportes — módulo restringido a admin (CLAUDE.md §3)
export default async function ReportsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/agenda')

  return <ReportsBoard />
}
