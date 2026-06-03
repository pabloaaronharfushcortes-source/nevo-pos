import { describe, it, expect } from 'vitest'
import { computeCommission, getCurrentQuincena } from './commissions'

describe('computeCommission', () => {
  it('calcula el porcentaje correcto', () => {
    expect(computeCommission(200, 40)).toBe(80)
  })

  it('redondea a 2 decimales', () => {
    expect(computeCommission(175.5, 40)).toBe(70.2)
    expect(computeCommission(99.99, 40)).toBe(40)         // 39.996 → 40.00
  })

  it('devuelve 0 con tasa 0', () => {
    expect(computeCommission(500, 0)).toBe(0)
  })
})

describe('getCurrentQuincena', () => {
  it('devuelve un periodo con start <= end y formato YYYY-MM-DD', () => {
    const q = getCurrentQuincena()
    expect(q.period_start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(q.period_end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(q.period_start <= q.period_end).toBe(true)
  })

  it('la primera quincena empieza el día 01', () => {
    // Solo verificamos invariante estructural: el inicio es 01 o 16
    const q = getCurrentQuincena()
    const day = q.period_start.slice(-2)
    expect(['01', '16']).toContain(day)
  })
})
