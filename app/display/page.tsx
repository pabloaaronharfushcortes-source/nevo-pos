import { createServiceClient } from '@/lib/supabase/server'
import DisplayClient from '@/components/display/DisplayClient'
import type { DisplayTicket } from '@/types/app'

type Props = {
  searchParams: { tenant?: string }
}

export default async function DisplayPage({ searchParams }: Props) {
  const tenantSlug = searchParams.tenant

  if (!tenantSlug) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-400">
        <p>Parámetro <code className="bg-gray-800 px-1 rounded">?tenant=</code> requerido</p>
      </div>
    )
  }

  const supabase = createServiceClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', tenantSlug)
    .eq('is_active', true)
    .single()

  if (!tenant) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-400">
        <p>Tenant <strong className="text-white">{tenantSlug}</strong> no encontrado o inactivo</p>
      </div>
    )
  }

  const { data: rawTickets } = await supabase
    .from('queue_tickets')
    .select(`
      id, ticket_number, status, estimated_start_at,
      client:clients(name),
      barber:barbers(name)
    `)
    .eq('tenant_id', tenant.id)
    .in('status', ['waiting', 'called'])
    .order('ticket_number')

  const initialTickets: DisplayTicket[] = (rawTickets ?? []).map(t => ({
    id: t.id,
    ticket_number: t.ticket_number,
    status: t.status,
    estimated_start_at: t.estimated_start_at,
    client_first_name: ((t.client as { name: string } | null)?.name ?? 'Sin nombre').split(' ')[0],
    barber_name: (t.barber as { name: string } | null)?.name ?? '—',
  }))

  // Cargar videos desde Supabase Storage display/[tenant-slug]/
  const { data: videoFiles } = await supabase.storage
    .from('display')
    .list(tenantSlug, { limit: 20 })

  const videoUrls = (videoFiles ?? [])
    .filter(f => /\.(mp4|webm|mov)$/i.test(f.name))
    .map(f => {
      const { data } = supabase.storage.from('display').getPublicUrl(`${tenantSlug}/${f.name}`)
      return data.publicUrl
    })

  return (
    <DisplayClient
      tenantId={tenant.id}
      tenantSlug={tenantSlug}
      tenantName={tenant.name}
      initialTickets={initialTickets}
      videoUrls={videoUrls}
    />
  )
}
