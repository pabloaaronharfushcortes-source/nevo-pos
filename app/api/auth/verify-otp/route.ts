import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { decryptPending, verifyOtp } from '@/lib/auth/otp'
import type { Database } from '@/types/database'

const PENDING_COOKIE = 'auth_pending'

type PendingAuth = {
  accessToken: string
  refreshToken: string
  otp: string
  expiresAt: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { code?: string }
    const { code } = body

    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    const pendingToken = request.cookies.get(PENDING_COOKIE)?.value
    if (!pendingToken) {
      return NextResponse.json(
        { error: 'Sesión expirada, inicia sesión nuevamente' },
        { status: 401 }
      )
    }

    const secret = process.env.AUTH_OTP_SECRET
    if (!secret) throw new Error('AUTH_OTP_SECRET no configurado')

    const pending = decryptPending<PendingAuth>(pendingToken, secret)
    if (!pending) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    if (Date.now() > pending.expiresAt) {
      return NextResponse.json({ error: 'El código expiró, inicia sesión nuevamente' }, { status: 401 })
    }

    if (!verifyOtp(code, pending.otp)) {
      return NextResponse.json({ error: 'Código incorrecto' }, { status: 401 })
    }

    // OTP correcto — establecer la sesión real en cookies del navegador
    const response = NextResponse.json({ status: 'ok' })

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (list) => {
            list.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          }
        }
      }
    )

    await supabase.auth.setSession({
      access_token: pending.accessToken,
      refresh_token: pending.refreshToken
    })

    response.cookies.delete(PENDING_COOKIE)
    return response
  } catch (err) {
    console.error('[api/auth/verify-otp]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
