import { describe, it, expect } from 'vitest'
import { estimateCost } from '../../renderer/lib/cost'

describe('estimateCost', () => {
  it('calculates opus cost correctly', () => {
    const tokens = { input: 1_000_000, output: 0, cacheCreation: 0, cacheRead: 0 }
    expect(estimateCost('claude-opus-4-6', tokens)).toBeCloseTo(15, 2)
  })

  it('calculates sonnet output cost correctly', () => {
    const tokens = { input: 0, output: 1_000_000, cacheCreation: 0, cacheRead: 0 }
    expect(estimateCost('claude-sonnet-4-6', tokens)).toBeCloseTo(15, 2)
  })

  it('calculates cache read cost for opus', () => {
    const tokens = { input: 0, output: 0, cacheCreation: 0, cacheRead: 1_000_000 }
    expect(estimateCost('claude-opus-4-6', tokens)).toBeCloseTo(1.5, 2)
  })

  it('uses fallback for unknown model', () => {
    const tokens = { input: 1_000_000, output: 0, cacheCreation: 0, cacheRead: 0 }
    const cost = estimateCost('unknown-model', tokens)
    expect(cost).toBeCloseTo(10, 2)
  })

  it('returns 0 for zero tokens', () => {
    const tokens = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 }
    expect(estimateCost('claude-opus-4-6', tokens)).toBe(0)
  })

  it('handles haiku correctly', () => {
    const tokens = { input: 1_000_000, output: 0, cacheCreation: 0, cacheRead: 0 }
    expect(estimateCost('claude-haiku-4-5', tokens)).toBeCloseTo(0.8, 2)
  })
})
