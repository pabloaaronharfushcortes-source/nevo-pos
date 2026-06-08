import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { decryptPending, verifyOtp } from '@/lib/auth/otp'
import { otpRateLimit, resetOtpRateLimit } from '@/lib/auth/rate-limit'
import { verifyOtpSchema } from '@/lib/validation/auth'
import { readJsonBody } from '@/lib/validation'
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
    const parsed = verifyOtpSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { code } = parsed.data

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
      // Cuenta el intento fallido por cookie auth_pending (máximo 5; al 6º se invalida)
      const limit = await otpRateLimit(pendingToken)
      if (!limit.allowed) {
        // 6º intento incorrecto: invalida la cookie y obliga a reiniciar sesión
        resetOtpRateLimit(pendingToken)
        const blocked = NextResponse.json(
          { error: 'Sesión expirada por intentos fallidos.', redirect: '/login' },
          { status: 429 }
        )
        blocked.cookies.delete(PENDING_COOKIE)
        return blocked
      }
      return NextResponse.json({ error: 'Código incorrecto' }, { status: 401 })
    }

    // OTP correcto — limpia el contador y establece la sesión real en cookies del navegador
    resetOtpRateLimit(pendingToken)
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
