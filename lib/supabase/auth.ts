import { createClient } from './server'

export type SessionUser = {
  id: string
  email: string
  tenantId: string
  role: string
  name: string
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role, name')
      .eq('id', user.id)
      .single()

    if (!profile) return null

    return {
      id: user.id,
      email: user.email ?? '',
      tenantId: profile.tenant_id,
      role: profile.role,
      name: profile.name,
    }
  } catch {
    return null
  }
}
