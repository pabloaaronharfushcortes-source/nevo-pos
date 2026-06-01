import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Supabase = SupabaseClient<Database>
type Client = Database['public']['Tables']['clients']['Row']

export type Classification = 'new' | 'recurrent' | 'vip'

// new → 0-1 stamps, recurrent → 2-7, vip → 8+
export function computeClassification(loyaltyStamps: number): Classification {
  if (loyaltyStamps >= 8) return 'vip'
  if (loyaltyStamps >= 2) return 'recurrent'
  return 'new'
}

// Incrementa stamps, total_spent y last_visit_at tras una venta. Recalcula clasificación.
export async function updateClientAfterSale(
  supabase: Supabase,
  clientId: string,
  saleTotal: number
): Promise<void> {
  const { data: client } = await supabase
    .from('clients')
    .select('loyalty_stamps, total_spent')
    .eq('id', clientId)
    .single()

  if (!client) return

  const newStamps = client.loyalty_stamps + 1
  const newTotalSpent = Math.round((client.total_spent + saleTotal) * 100) / 100

  await supabase
    .from('clients')
    .update({
      loyalty_stamps: newStamps,
      total_spent: newTotalSpent,
      last_visit_at: new Date().toISOString(),
      classification: computeClassification(newStamps),
    })
    .eq('id', clientId)
}

// Usado por el agente de WhatsApp (Paso 10) para identificar al cliente por su WAID
export async function findClientByWhatsApp(
  supabase: Supabase,
  tenantId: string,
  whatsappId: string
): Promise<Client | null> {
  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('whatsapp_id', whatsappId)
    .maybeSingle()

  return data
}
