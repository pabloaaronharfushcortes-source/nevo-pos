import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

function parseDotenv(filePath) {
  const result = {}
  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex === -1) continue
    const key = trimmed.slice(0, equalsIndex).trim()
    let value = trimmed.slice(equalsIndex + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }
  return result
}

function decodeJwt(jwt) {
  const parts = jwt.split('.')
  if (parts.length < 2) throw new Error('Invalid JWT format')
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'))
}

async function main() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  const env = fs.existsSync(envPath) ? parseDotenv(envPath) : {}

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are set in .env.local or the environment.')
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    db: { schema: 'public' }
  })
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    db: { schema: 'public' }
  })

  const now = Date.now()
  const tenantsToInsert = [
    { slug: `tenant-one-${now}`, name: 'Tenant One' },
    { slug: `tenant-two-${now}`, name: 'Tenant Two' }
  ]

  console.log('Creating tenants...')
  const { data: tenants, error: tenantsError } = await adminClient
    .from('tenants')
    .insert(tenantsToInsert)
    .select('*')

  if (tenantsError) throw tenantsError
  if (!tenants || tenants.length !== 2) throw new Error('Failed to insert tenants')

  const userProfiles = []
  for (let i = 0; i < tenants.length; i += 1) {
    const tenant = tenants[i]
    const email = `tenant${i + 1}+test-${now}@nevo-pos.test`
    const password = `TenantTest!${now}${i}`

    console.log(`Creating auth user for ${tenant.slug}...`)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    if (authError) throw authError
    if (!authData?.user?.id) throw new Error('Failed to create auth user')

    const profile = {
      id: authData.user.id,
      tenant_id: tenant.id,
      role: 'admin',
      name: `Tenant ${i + 1} Admin`,
      email
    }

    console.log(`Creating public.users profile for ${email}...`)
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .insert(profile)
      .select('*')

    if (userError) throw userError
    userProfiles.push({ email, password, tenantId: tenant.id })
  }

  console.log('Signing in as first tenant user to verify tenant_id claim...')
  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email: userProfiles[0].email,
    password: userProfiles[0].password
  })
  if (signInError) throw signInError
  const accessToken = signInData?.session?.access_token
  if (!accessToken) throw new Error('Login did not return an access token')

  const claims = decodeJwt(accessToken)
  if (claims.tenant_id !== userProfiles[0].tenantId) {
    throw new Error(`Expected tenant_id claim ${userProfiles[0].tenantId}, got ${claims.tenant_id}`)
  }

  const tenantClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  })

  console.log('Querying tenants as first tenant user...')
  const { data: visibleTenants, error: visibleError } = await tenantClient
    .from('tenants')
    .select('*')

  if (visibleError) throw visibleError
  if (!visibleTenants || visibleTenants.length !== 1) {
    throw new Error(`Expected 1 tenant visible, got ${visibleTenants?.length}`)
  }
  if (visibleTenants[0].id !== userProfiles[0].tenantId) {
    throw new Error('Tenant isolation failed: visible tenant does not match authenticated tenant')
  }

  console.log('Verifying the first tenant user cannot read the second tenant...')
  const { data: forbiddenTenant, error: forbiddenError } = await tenantClient
    .from('tenants')
    .select('*')
    .eq('id', userProfiles[1].tenantId)

  if (forbiddenError) throw forbiddenError
  if (forbiddenTenant && forbiddenTenant.length > 0) {
    throw new Error('Tenant isolation failed: user can read another tenant record')
  }

  console.log('✅ Tenant isolation verified successfully.')
}

main().catch((error) => {
  console.error('Tenant isolation test failed:')
  console.error(error)
  process.exit(1)
})
