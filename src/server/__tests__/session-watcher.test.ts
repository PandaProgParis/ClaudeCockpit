import { describe, it, expect } from 'vitest'
import { classifySessionStatus } from '../session-watcher'

describe('classifySessionStatus', () => {
  it('returns active for file modified <60s ago', () => {
    const now = Date.now()
    expect(classifySessionStatus(now - 30_000, now)).toBe('active')
  })
  it('returns idle for 60s-15min', () => {
    const now = Date.now()
    expect(classifySessionStatus(now - 300_000, now)).toBe('idle')
  })
  it('returns ended for >15min', () => {
    const now = Date.now()
    expect(classifySessionStatus(now - 1_000_000, now)).toBe('ended')
  })
})
