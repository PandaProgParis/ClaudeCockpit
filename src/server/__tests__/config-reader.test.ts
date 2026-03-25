import { describe, it, expect } from 'vitest'
import { mergeSettings } from '../config-reader'

describe('mergeSettings', () => {
  it('merges local overrides into base settings', () => {
    const base = { permissions: { allow: ['a', 'b'] }, defaultMode: 'dontAsk' }
    const local = { permissions: { allow: ['c'] } }
    const merged = mergeSettings(base, local)
    expect(merged.permissions.allow).toEqual(['a', 'b', 'c'])
    expect(merged.defaultMode).toBe('dontAsk')
  })

  it('handles missing local settings', () => {
    const base = { permissions: { allow: ['a'] }, defaultMode: 'ask' }
    const merged = mergeSettings(base, null)
    expect(merged.permissions.allow).toEqual(['a'])
  })

  it('merges deny arrays', () => {
    const base = { permissions: { allow: [], deny: ['x'] } }
    const local = { permissions: { deny: ['y'] } }
    const merged = mergeSettings(base, local)
    expect(merged.permissions.deny).toEqual(['x', 'y'])
  })

  it('local scalar fields override base', () => {
    const base = { defaultMode: 'ask', preferredLanguage: 'en' }
    const local = { defaultMode: 'dontAsk', effort: 'max' }
    const merged = mergeSettings(base, local)
    expect(merged.defaultMode).toBe('dontAsk')
    expect(merged.preferredLanguage).toBe('en')
    expect(merged.effort).toBe('max')
  })

  it('returns defaults for empty inputs', () => {
    const merged = mergeSettings(null, null)
    expect(merged.permissions?.allow ?? []).toEqual([])
    expect(merged.permissions?.deny ?? []).toEqual([])
  })
})
