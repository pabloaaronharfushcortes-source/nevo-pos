import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    // Solo tests unitarios colocados junto al código; E2E corre con Playwright.
    include: ['lib/**/*.test.ts', 'hooks/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
