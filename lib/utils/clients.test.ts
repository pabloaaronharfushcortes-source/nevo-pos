import { describe, it, expect } from 'vitest'
import { computeClassification } from './clients'

describe('computeClassification', () => {
  it('clasifica como new con 0 o 1 sellos', () => {
    expect(computeClassification(0)).toBe('new')
    expect(computeClassification(1)).toBe('new')
  })

  it('clasifica como recurrent entre 2 y 7 sellos', () => {
    expect(computeClassification(2)).toBe('recurrent')
    expect(computeClassification(7)).toBe('recurrent')
  })

  it('clasifica como vip con 8 o más sellos', () => {
    expect(computeClassification(8)).toBe('vip')
    expect(computeClassification(20)).toBe('vip')
  })
})
