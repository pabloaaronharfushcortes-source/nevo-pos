import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''

    const supabase = await createClient()

    let query = supabase
      .from('clients')
      .select('id, name, phone, email, classification, loyalty_stamps')
      .order('name')
      .limit(20)

    if (search.trim().length >= 2) {
      query = query.ilike('name', `%${search.trim()}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    console.error('[api/clients GET]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
