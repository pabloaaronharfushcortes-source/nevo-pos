import { test, expect } from '@playwright/test'

// Humo: rutas públicas y guardas de autenticación. No requieren datos sembrados.

test.describe('Autenticación y rutas públicas', () => {
  test('la página de login se renderiza con email y contraseña', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
    await expect(page.getByPlaceholder(/email|correo/i).or(page.locator('input[type="email"]'))).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('acceder a una ruta del dashboard sin sesión redirige a login', async ({ page }) => {
    await page.goto('/agenda')
    await expect(page).toHaveURL(/\/login/)
  })

  test('el dashboard raíz sin sesión redirige a login', async ({ page }) => {
    await page.goto('/clients')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Pantalla TV pública', () => {
  test('/display sin parámetro tenant pide el parámetro', async ({ page }) => {
    await page.goto('/display')
    await expect(page.getByText(/tenant=/)).toBeVisible()
  })

  test('/display con tenant inválido no rompe (página pública sin auth)', async ({ page }) => {
    const res = await page.goto('/display?tenant=no-existe-xyz')
    // No redirige a login: la ruta es pública
    expect(page.url()).not.toContain('/login')
    expect(res?.status()).toBeLessThan(500)
  })
})
