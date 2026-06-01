import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import CalendarView from '@/components/agenda/CalendarView'

export default async function AgendaPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  const [{ data: barbers }, { data: services }] = await Promise.all([
    supabase
      .from('barbers')
      .select('id, tenant_id, user_id, name, photo_url, commission_rate, is_active, sort_order, created_at')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('services')
      .select('id, tenant_id, name, description, price, duration_minutes, category, is_active, sort_order, created_at')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 bg-white border-b flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">Agenda</h1>
      </div>
      <div className="flex-1 min-h-0">
        <CalendarView
          barbers={barbers ?? []}
          services={services ?? []}
        />
      </div>
    </div>
  )
}
