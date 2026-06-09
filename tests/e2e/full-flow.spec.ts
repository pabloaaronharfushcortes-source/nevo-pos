import { test, expect } from '@playwright/test'

/**
 * FASE 3 — flujo E2E completo (multi-agente).
 *
 * Verifica el comportamiento de borde del usuario real en el navegador:
 *   1. La pantalla de login renderiza la identidad NEVO + campos.
 *   2. Credenciales válidas avanzan a la pantalla de verificación OTP (2FA).
 *   3. /display es pública (no redirige a login).
 *   4. Las rutas del dashboard exigen sesión (redirigen a /login).
 *   5. Salud de API: endpoints protegidos responden 401, nunca 5xx.
 *
 * Las credenciales se leen de TEST_ADMIN_EMAIL/PASSWORD (el orquestador las inyecta);
 * caen al admin sembrado por defecto.
 */

const EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@mercuriobarberia.com'
const PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'MercurioAdmin2026!'
const TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG ?? 'mercurio-barberia'

test.describe('NEVO-POS — flujo completo', () => {
  test('login renderiza identidad NEVO + email + contraseña + botón Continuar', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('NEVO').first()).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /continuar/i })).toBeVisible()
  })

  test('login con credenciales válidas llega a la verificación OTP (2FA)', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill(EMAIL)
    await page.locator('input[type="password"]').fill(PASSWORD)
    await page.getByRole('button', { name: /continuar/i }).click()

    // El 2FO es obligatorio: tras validar credenciales se pasa a /verify-otp.
    await page.waitForURL(/\/verify-otp/, { timeout: 15000 })
    await expect(page.getByText(/verificación/i)).toBeVisible()
    await expect(page.getByText(/6 dígitos/i)).toBeVisible()
  })

  test('/display es pública (no redirige a login)', async ({ page }) => {
    const res = await page.goto(`/display?tenant=${TENANT}`)
    expect(page.url()).not.toContain('/login')
    expect(res?.status() ?? 0).toBeLessThan(500)
  })

  test('las rutas del dashboard exigen sesión (redirigen a /login)', async ({ page }) => {
    for (const route of ['/agenda', '/pos', '/clients', '/queue', '/reports', '/settings']) {
      await page.goto(route)
      await expect(page, `${route} debería redirigir a /login`).toHaveURL(/\/login/)
    }
  })

  test('salud de API: endpoints protegidos exigen sesión, sin 5xx', async ({ request }) => {
    for (const path of ['/api/appointments', '/api/clients', '/api/barbers', '/api/reports']) {
      // Sin seguir redirects: el middleware redirige (307) las APIs protegidas a /login.
      const res = await request.get(path, { maxRedirects: 0 })
      expect(res.status(), `${path} no debe responder 5xx`).toBeLessThan(500)
      // Guarda de auth correcta: redirect a login (307/308) o 401/403 — nunca 200 con datos.
      expect([307, 308, 401, 403], `${path} debe estar protegido`).toContain(res.status())
    }
  })
})
