import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { clientsQuerySchema, createClientSchema } from '@/lib/validation/clients'
import { readJsonBody, searchParamsToObject } from '@/lib/validation'
import { err } from '@/lib/utils/api-response'
import type { Database } from '@/types/database'

type ClientInsert = Database['public']['Tables']['clients']['Insert']

const VALID_CLASSIFICATIONS = ['new', 'recurrent', 'vip'] as const

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)

    const parsed = clientsQuerySchema.safeParse(searchParamsToObject(request.url))
    if (!parsed.success) {
      return err('Parámetros inválidos', 400, parsed.error.flatten())
    }
    const search = parsed.data.search ?? ''
    const classification = parsed.data.classification ?? ''
    const page = Math.max(1, parseInt(parsed.data.page ?? '1', 10))
    const limit = 40
    const offset = (page - 1) * limit

    const supabase = await createClient()

    let query = supabase
      .from('clients')
      .select(
        'id, name, phone, email, whatsapp_id, classification, loyalty_stamps, last_visit_at, total_spent, preferred_barber_id',
        { count: 'exact' }
      )
      .eq('tenant_id', user.tenantId)
      .order('name')
      .range(offset, offset + limit - 1)

    if (search.trim().length >= 2) {
      // Búsqueda por nombre o teléfono
      query = query.or(
        `name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`
      )
    }

    if (VALID_CLASSIFICATIONS.includes(classification as (typeof VALID_CLASSIFICATIONS)[number])) {
      query = query.eq('classification', classification)
    }

    const { data, error, count } = await query
    if (error) throw error

    // Forma de respuesta preservada (consumida por ClientsBoard)
    return NextResponse.json({ clients: data ?? [], total: count ?? 0, page, limit })
  } catch (error) {
    console.error('[api/clients GET]', error)
    return err('Error interno del servidor', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return err('No autorizado', 401)

    const parsed = createClientSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      return err('Datos inválidos', 400, parsed.error.flatten())
    }
    const body = parsed.data

    const supabase = await createClient()

    const insert: ClientInsert = {
      tenant_id: user.tenantId,
      name: body.name.trim(),
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      whatsapp_id: body.whatsapp_id?.trim() || null,
      notes: body.notes?.trim() || null,
      preferred_barber_id: body.preferred_barber_id || null,
    }

    const { data, error } = await supabase
      .from('clients')
      .insert(insert)
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        return err('Ya existe un cliente con ese número de WhatsApp', 409)
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[api/clients POST]', error)
    return err('Error interno del servidor', 500)
  }
}
