import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { ok, err } from '@/lib/utils/api-response'
import { readJsonBody, searchParamsToObject } from '@/lib/validation'
import { createTimeOffSchema } from '@/lib/validation/settings'
import { z } from 'zod'

const TIME_OFF_COLS = 'id, tenant_id, barber_id, starts_at, ends_at, reason, created_at'

const listQuerySchema = z.object({
  barberId: z.string().uuid().optional(),
})

// GET /api/barber-time-off?barberId=… — bloqueos de horario (admin).
// Sin barberId devuelve los de todo el tenant (RLS filtra por tenant).
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)
    if (user.role !== 'admin') return err('Acceso restringido', 403)

    const parsed = listQuerySchema.safeParse(searchParamsToObject(request.url))
    if (!parsed.success) return err('Datos inválidos', 400, parsed.error.flatten())

    const supabase = await createClient()
    let query = supabase
      .from('barber_time_off')
      .select(TIME_OFF_COLS)
      .gte('ends_at', new Date().toISOString()) // solo bloqueos vigentes o futuros
      .order('starts_at', { ascending: true })

    if (parsed.data.barberId) query = query.eq('barber_id', parsed.data.barberId)

    const { data, error } = await query
    if (error) throw error
    return ok(data ?? [])
  } catch (error) {
    console.error('[api/barber-time-off GET]', error)
    return err('Error interno del servidor', 500)
  }
}

// POST /api/barber-time-off — crear bloqueo (admin)
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)
    if (user.role !== 'admin') return err('Acceso restringido', 403)

    const parsed = createTimeOffSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) return err('Datos inválidos', 400, parsed.error.flatten())
    const body = parsed.data

    const supabase = await createClient()

    // El barbero debe pertenecer al tenant (defensa extra además de RLS)
    const { data: barber } = await supabase
      .from('barbers')
      .select('id')
      .eq('id', body.barber_id)
      .eq('tenant_id', user.tenantId)
      .single()
    if (!barber) return err('Barbero no encontrado', 404)

    const { data, error } = await supabase
      .from('barber_time_off')
      .insert({
        tenant_id: user.tenantId,
        barber_id: body.barber_id,
        starts_at: body.starts_at,
        ends_at: body.ends_at,
        reason: body.reason?.trim() || null,
      })
      .select(TIME_OFF_COLS)
      .single()

    if (error) throw error
    return ok(data, 201)
  } catch (error) {
    console.error('[api/barber-time-off POST]', error)
    return err('Error interno del servidor', 500)
  }
}
