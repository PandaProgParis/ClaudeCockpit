import { describe, it, expect } from 'vitest'
import { computeTokensPerPercent } from '../calibration'

describe('computeTokensPerPercent', () => {
  it('returns null with no delta points', () => {
    expect(computeTokensPerPercent([])).toBeNull()
  })

  it('computes weighted average from delta points', () => {
    const points = [
      { deltaApiPercent: 5, deltaLocalTokens: 500000, timestamp: '2026-03-18T10:00:00Z' },
      { deltaApiPercent: 10, deltaLocalTokens: 1100000, timestamp: '2026-03-19T10:00:00Z' },
    ]
    const result = computeTokensPerPercent(points)
    expect(result).not.toBeNull()
    // Weighted avg: more recent point weighted 2x
    // Point 1: 500000/5 = 100000
    // Point 2: 1100000/10 = 110000 (weight 2)
    // (100000*1 + 110000*2) / 3 = 106666.67
    expect(result!).toBeCloseTo(106667, -2)
  })

  it('discards points where deltaApiPercent is 0', () => {
    const points = [
      { deltaApiPercent: 0, deltaLocalTokens: 100000, timestamp: '2026-03-18T10:00:00Z' },
      { deltaApiPercent: 5, deltaLocalTokens: 500000, timestamp: '2026-03-19T10:00:00Z' },
    ]
    const result = computeTokensPerPercent(points)
    expect(result).toBeCloseTo(100000, -2) // Only the valid point
  })
})
