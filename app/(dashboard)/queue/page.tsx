import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import QueueBoard from '@/components/queue/QueueBoard'

export default async function QueuePage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: tickets }, { data: barbers }, { data: services }] = await Promise.all([
    supabase
      .from('queue_tickets')
      .select(`
        id, tenant_id, client_id, barber_id, service_id,
        ticket_number, estimated_start_at, status, source, created_at,
        client:clients(id, name, phone),
        barber:barbers(id, name),
        service:services(id, name, duration_minutes)
      `)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)
      .not('status', 'in', '("completed","cancelled")')
      .order('ticket_number'),

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
      <div className="px-6 py-4 border-b flex-shrink-0" style={{ background: '#FFFFFF', borderColor: '#EDEDED' }}>
        <h1 className="font-display text-2xl font-semibold" style={{ color: '#0E0D1A' }}>Cola</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6B6B8A' }}>Fichas activas del día · walk-ins y citas en curso</p>
      </div>
      <div className="flex-1 min-h-0">
        <QueueBoard
          tenantId={user.tenantId}
          initialTickets={tickets ?? []}
          barbers={barbers ?? []}
          services={services ?? []}
        />
      </div>
    </div>
  )
}
