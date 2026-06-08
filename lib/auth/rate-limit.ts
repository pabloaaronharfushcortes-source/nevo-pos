// Rate limiting best-effort en memoria para los endpoints de autenticación.
// Mismo patrón de ventana deslizante que lib/whatsapp/rate-limit.ts (CLAUDE.md §11).
// Nota: en entornos serverless la memoria no se comparte entre instancias;
// para un límite duro en producción conviene respaldarlo en Redis/Postgres.

// ── /api/auth/login: máximo 10 intentos por IP cada 15 minutos ──
const LOGIN_MAX_ATTEMPTS = 10
const LOGIN_WINDOW_MS = 15 * 60_000

// ── /api/auth/verify-otp: máximo 5 intentos por cookie auth_pending ──
// Al 6º intento incorrecto se invalida la sesión.
const OTP_MAX_ATTEMPTS = 5

const loginHits = new Map<string, number[]>()
const otpHits = new Map<string, number>()

// Devuelve si la IP puede intentar login y, si no, en cuántos segundos podrá reintentar.
export async function loginRateLimit(ip: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = Date.now()
  const timestamps = (loginHits.get(ip) ?? []).filter(t => now - t < LOGIN_WINDOW_MS)

  if (timestamps.length >= LOGIN_MAX_ATTEMPTS) {
    loginHits.set(ip, timestamps)
    // El más antiguo dentro de la ventana define cuándo se libera un cupo
    const oldest = timestamps[0]
    const retryAfter = Math.ceil((LOGIN_WINDOW_MS - (now - oldest)) / 1000)
    return { allowed: false, retryAfter }
  }

  timestamps.push(now)
  loginHits.set(ip, timestamps)

  // Limpieza oportunista para evitar crecimiento ilimitado del Map
  if (loginHits.size > 5000) {
    Array.from(loginHits.entries()).forEach(([key, ts]) => {
      if (ts.every((t: number) => now - t >= LOGIN_WINDOW_MS)) loginHits.delete(key)
    })
  }

  return { allowed: true }
}

// Registra un intento fallido de OTP para una cookie auth_pending y devuelve el conteo.
// allowed = false significa que se superó el límite (6º intento) → invalidar sesión.
export async function otpRateLimit(cookieId: string): Promise<{ allowed: boolean; attempts: number }> {
  const attempts = (otpHits.get(cookieId) ?? 0) + 1
  otpHits.set(cookieId, attempts)

  // Limpieza oportunista
  if (otpHits.size > 5000) {
    Array.from(otpHits.keys()).slice(0, otpHits.size - 5000).forEach(k => otpHits.delete(k))
  }

  return { allowed: attempts <= OTP_MAX_ATTEMPTS, attempts }
}

// Libera el contador de OTP cuando la sesión se invalida o se verifica con éxito.
export function resetOtpRateLimit(cookieId: string): void {
  otpHits.delete(cookieId)
}

// Helpers de prueba — reinician el estado en memoria entre tests.
export function __resetRateLimitState(): void {
  loginHits.clear()
  otpHits.clear()
}
