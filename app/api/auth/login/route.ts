import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { generateOtp, encryptPending } from '@/lib/auth/otp'
import { loginRateLimit } from '@/lib/auth/rate-limit'
import { getClientIp } from '@/lib/auth/get-ip'
import { sendOtpEmail } from '@/lib/email'
import { loginSchema } from '@/lib/validation/auth'
import { readJsonBody } from '@/lib/validation'
import type { Database } from '@/types/database'

const PENDING_COOKIE = 'auth_pending'
const OTP_TTL_MS = 5 * 60 * 1000 // 5 minutos

export async function POST(request: NextRequest) {
  try {
    // Rate limiting por IP: máximo 10 intentos cada 15 minutos (CLAUDE.md §11)
    const ip = getClientIp(request)
    const limit = await loginRateLimit(ip)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.', retryAfter: limit.retryAfter },
        { status: 429 }
      )
    }

    const parsed = loginSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { email, password } = parsed.data

    // Interceptamos las cookies que Supabase quiere escribir — no se mandan al cliente
    // hasta que el OTP sea verificado
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {}
        }
      }
    )

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.user || !data.session) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    // Leer nombre del usuario para el email — usa service client para evitar RLS
    // circular (el usuario aún no tiene sesión en cookies)
    const serviceSupabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} }, auth: { persistSession: false } }
    )
    const { data: profile } = await serviceSupabase
      .from('users')
      .select('name')
      .eq('id', data.user.id)
      .single()

    const otp = generateOtp()
    const secret = process.env.AUTH_OTP_SECRET
    if (!secret) throw new Error('AUTH_OTP_SECRET no configurado')

    const pending = encryptPending(
      {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        otp,
        expiresAt: Date.now() + OTP_TTL_MS
      },
      secret
    )

    await sendOtpEmail({ to: email, name: profile?.name ?? email, otp })

    const response = NextResponse.json({ status: 'otp_required' })
    response.cookies.set(PENDING_COOKIE, pending, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300, // 5 min — mismo TTL que el OTP
      path: '/'
    })
    return response
  } catch (err) {
    console.error('[api/auth/login]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
