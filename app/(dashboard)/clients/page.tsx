import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import ClientsBoard from '@/components/clients/ClientsBoard'

export default async function ClientsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  const { data: barbers } = await supabase
    .from('barbers')
    .select('id, tenant_id, user_id, name, photo_url, commission_rate, is_active, sort_order, created_at')
    .eq('tenant_id', user.tenantId)
    .eq('is_active', true)
    .order('sort_order')

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--surface-0)' }}>
      <div
        className="px-6 py-4 flex-shrink-0 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <h1 className="font-display text-xl font-medium" style={{ color: 'var(--ink-primary)' }}>
          Clientes
        </h1>
      </div>
      <div className="flex-1 min-h-0">
        <ClientsBoard barbers={barbers ?? []} />
      </div>
    </div>
  )
}
