import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import POSBoard from '@/components/pos/POSBoard'
import type { SaleWithRelations, CashRegister } from '@/types/app'

export default async function POSPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: rawSales }, { data: barbers }, { data: services }, { data: register }] =
    await Promise.all([
      supabase
        .from('sales')
        .select(`
          id, tenant_id, appointment_id, queue_ticket_id, client_id, barber_id, cashier_id,
          cash_register_id, subtotal, discount, total, payment_method, payment_reference,
          notes, created_at, deleted_at,
          client:clients(id, name),
          barber:barbers(id, name),
          cashier:users(id, name),
          items:sale_items(id, type, name, price, quantity, subtotal, service_id)
        `)
        .eq('tenant_id', user.tenantId)
        .is('deleted_at', null)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`)
        .order('created_at', { ascending: false }),

      supabase
        .from('barbers')
        .select('id, tenant_id, user_id, name, photo_url, commission_rate, is_active, sort_order, created_at')
        .eq('tenant_id', user.tenantId)
        .eq('is_active', true)
        .order('sort_order'),

      supabase
        .from('services')
        .select('id, tenant_id, name, description, price, duration_minutes, category, is_active, sort_order, created_at')
        .eq('tenant_id', user.tenantId)
        .eq('is_active', true)
        .order('sort_order'),

      supabase
        .from('cash_registers')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .is('closed_at', null)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  return (
    <div className="flex flex-col h-full">
      <POSBoard
        tenantId={user.tenantId}
        barbers={barbers ?? []}
        services={services ?? []}
        initialSales={(rawSales ?? []) as unknown as SaleWithRelations[]}
        initialRegister={register as CashRegister | null}
      />
    </div>
  )
}
