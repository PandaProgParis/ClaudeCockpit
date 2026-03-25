import { describe, it, expect, beforeEach } from 'vitest'
import { buildIndexFromRaw, searchIndex } from '../session-index'
import type { SearchScope } from '../../renderer/lib/types'

const ALL_SCOPE: SearchScope = { user: true, assistant: true, files: true }
const USER_ONLY: SearchScope = { user: true, assistant: false, files: false }
const ASSISTANT_ONLY: SearchScope = { user: false, assistant: true, files: false }
const FILES_ONLY: SearchScope = { user: false, assistant: false, files: true }

describe('searchIndex', () => {
  beforeEach(() => {
    buildIndexFromRaw([
      {
        sessionId: 'session-1',
        projectPath: 'MyProject',
        userMessages: ['Fix the authentication bug'],
        assistantText: ['I found the issue in login.ts'],
        filePaths: ['src/auth/login.ts'],
      },
      {
        sessionId: 'session-2',
        projectPath: 'OtherProject',
        userMessages: ['Add dark mode'],
        assistantText: ['Here is the dark mode implementation'],
        filePaths: ['src/theme.ts'],
      },
    ])
  })

  it('finds session by user message', () => {
    const results = searchIndex('authentication', ALL_SCOPE)
    expect(results).toHaveLength(1)
    expect(results[0].sessionId).toBe('session-1')
    expect(results[0].matchedIn).toBe('user')
  })

  it('finds session by assistant text', () => {
    const results = searchIndex('implementation', ALL_SCOPE)
    expect(results).toHaveLength(1)
    expect(results[0].sessionId).toBe('session-2')
    expect(results[0].matchedIn).toBe('assistant')
  })

  it('finds session by file path', () => {
    const results = searchIndex('login.ts', ALL_SCOPE)
    expect(results).toHaveLength(1)
    expect(results[0].sessionId).toBe('session-1')
    expect(results[0].matchedIn).toBe('file')
  })

  it('respects scope: user only', () => {
    const results = searchIndex('found', USER_ONLY)
    expect(results).toHaveLength(0)
  })

  it('respects scope: assistant only', () => {
    const results = searchIndex('issue', ASSISTANT_ONLY)
    expect(results).toHaveLength(1)
  })

  it('respects scope: files only', () => {
    const results = searchIndex('src', FILES_ONLY)
    expect(results).toHaveLength(2)
    expect(results.map(r => r.sessionId).sort()).toEqual(['session-1', 'session-2'])
  })

  it('returns each session at most once even when multiple scopes match', () => {
    // 'login.ts' appears in both assistant text ('I found the issue in login.ts') and file path ('src/auth/login.ts')
    const results = searchIndex('login.ts', ALL_SCOPE)
    expect(results).toHaveLength(1)
    expect(results[0].sessionId).toBe('session-1')
  })

  it('is case-insensitive', () => {
    const results = searchIndex('AUTHENTICATION', ALL_SCOPE)
    expect(results).toHaveLength(1)
  })

  it('returns empty array for empty query', () => {
    const results = searchIndex('', ALL_SCOPE)
    expect(results).toHaveLength(0)
  })

  it('snippet.match contains the exact matched term', () => {
    const results = searchIndex('authentication', ALL_SCOPE)
    expect(results[0].snippet.match.toLowerCase()).toBe('authentication')
  })

  it('snippet.before and after are max 80 chars', () => {
    const results = searchIndex('authentication', ALL_SCOPE)
    expect(results[0].snippet.before.length).toBeLessThanOrEqual(80)
    expect(results[0].snippet.after.length).toBeLessThanOrEqual(80)
  })
})
