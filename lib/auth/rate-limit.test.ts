import { describe, it, expect, beforeEach } from 'vitest'
import { loginRateLimit, otpRateLimit, __resetRateLimitState } from './rate-limit'

describe('rate limiting de autenticación', () => {
  beforeEach(() => {
    __resetRateLimitState()
  })

  describe('otpRateLimit', () => {
    it('al 6º OTP incorrecto la sesión se invalida (allowed = false)', async () => {
      const cookieId = 'pending-cookie-abc'

      // Los primeros 5 intentos incorrectos siguen permitidos
      for (let i = 1; i <= 5; i += 1) {
        const result = await otpRateLimit(cookieId)
        expect(result.attempts).toBe(i)
        expect(result.allowed).toBe(true)
      }

      // El 6º intento incorrecto invalida la sesión
      const sixth = await otpRateLimit(cookieId)
      expect(sixth.attempts).toBe(6)
      expect(sixth.allowed).toBe(false)
    })

    it('cuenta intentos por cookie de forma independiente', async () => {
      const a = await otpRateLimit('cookie-a')
      const b = await otpRateLimit('cookie-b')
      expect(a.attempts).toBe(1)
      expect(b.attempts).toBe(1)
    })
  })

  describe('loginRateLimit', () => {
    it('al 11º intento desde la misma IP devuelve allowed = false (429)', async () => {
      const ip = '203.0.113.7'

      // Los primeros 10 intentos están permitidos
      for (let i = 1; i <= 10; i += 1) {
        const result = await loginRateLimit(ip)
        expect(result.allowed).toBe(true)
      }

      // El 11º intento se rechaza con retryAfter
      const eleventh = await loginRateLimit(ip)
      expect(eleventh.allowed).toBe(false)
      expect(eleventh.retryAfter).toBeGreaterThan(0)
    })

    it('aísla el conteo por IP', async () => {
      for (let i = 0; i < 10; i += 1) await loginRateLimit('10.0.0.1')
      const other = await loginRateLimit('10.0.0.2')
      expect(other.allowed).toBe(true)
    })
  })
})
