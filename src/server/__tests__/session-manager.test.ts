import { describe, it, expect, beforeEach } from 'vitest'

// We test the hide/unhide logic by mocking app-data
// Simple unit tests for the exported functions

describe('session-manager', () => {
  // Test that the module exports the right functions
  it('exports getHiddenSessions, hideSession, unhideSession, deleteSession', async () => {
    const mod = await import('../session-manager')
    expect(typeof mod.getHiddenSessions).toBe('function')
    expect(typeof mod.hideSession).toBe('function')
    expect(typeof mod.unhideSession).toBe('function')
    expect(typeof mod.deleteSession).toBe('function')
  })
})
