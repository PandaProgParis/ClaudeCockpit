import { describe, it, expect } from 'vitest'
import {
  computeCO2,
  computeEquivalences,
  getEcoScore,
  getEarthStep,
  DEFAULT_EMISSION_FACTORS,
  DEFAULT_EQUIVALENCE_FACTORS,
} from '../../renderer/lib/carbon'

describe('computeCO2', () => {
  it('computes CO2 for opus model', () => {
    const result = computeCO2('claude-opus-4-20260301', 100000, 50000, DEFAULT_EMISSION_FACTORS)
    // (100000 + 50000) * 0.0036 = 540
    expect(result).toBeCloseTo(540)
  })

  it('computes CO2 for sonnet model', () => {
    const result = computeCO2('claude-sonnet-4-20260301', 100000, 50000, DEFAULT_EMISSION_FACTORS)
    // (100000 + 50000) * 0.0014 = 210
    expect(result).toBeCloseTo(210)
  })

  it('computes CO2 for haiku model', () => {
    const result = computeCO2('claude-haiku-4-20260301', 100000, 50000, DEFAULT_EMISSION_FACTORS)
    // (100000 + 50000) * 0.00045 = 67.5
    expect(result).toBeCloseTo(67.5)
  })

  it('falls back to sonnet factor for unknown model', () => {
    const result = computeCO2('unknown-model', 100000, 0, DEFAULT_EMISSION_FACTORS)
    // 100000 * 0.0014 = 140
    expect(result).toBeCloseTo(140)
  })
})

describe('computeEquivalences', () => {
  it('computes all equivalences', () => {
    const eq = computeEquivalences(120, 150000, DEFAULT_EQUIVALENCE_FACTORS)
    expect(eq.carKm).toBeCloseTo(1) // 120 / 120
    expect(eq.flightMin).toBeCloseTo(120 / 2850)
    expect(eq.waterMl).toBeCloseTo(150000 * 0.0001) // 15
    expect(eq.phoneCharges).toBeCloseTo(120 / 8.2)
  })
})

describe('getEcoScore', () => {
  it('returns A for < 1g', () => {
    expect(getEcoScore(0.5)).toEqual({ letter: 'A', color: '#66BB6A', level: 1 })
  })
  it('returns B for 1-5g', () => {
    expect(getEcoScore(3)).toEqual({ letter: 'B', color: '#8BC34A', level: 2 })
  })
  it('returns C for 5-20g', () => {
    expect(getEcoScore(10)).toEqual({ letter: 'C', color: '#D4956A', level: 3 })
  })
  it('returns D for 20-100g', () => {
    expect(getEcoScore(50)).toEqual({ letter: 'D', color: '#FF7043', level: 4 })
  })
  it('returns E for > 100g', () => {
    expect(getEcoScore(150)).toEqual({ letter: 'E', color: '#ef5350', level: 5 })
  })
})

describe('getEarthStep', () => {
  it('returns step 1 (Eden) at 0%', () => {
    const step = getEarthStep(0)
    expect(step.index).toBe(1)
    expect(step.label).toBe('Eden')
  })
  it('returns step 10 at 47%', () => {
    const step = getEarthStep(47)
    expect(step.index).toBe(10)
  })
  it('returns step 20 at 99%', () => {
    const step = getEarthStep(99)
    expect(step.index).toBe(20)
  })
  it('returns step 21 (Brûlé) at >100%', () => {
    const step = getEarthStep(120)
    expect(step.index).toBe(21)
    expect(step.label).toBe('Brûlé !')
  })
})
