import { describe, it, expect } from 'vitest'

import {
  parseCoworkSessionMeta,
  parseAuditResults,
  filterEnabledMcpTools,
  parseSpaces,
  parsePluginManifest,
} from '../cowork-parser'

describe('parseCoworkSessionMeta', () => {
  it('extracts session fields from local_*.json content', () => {
    const raw = {
      sessionId: 'local_abc-123',
      title: 'My Session',
      model: 'claude-opus-4-6',
      initialMessage: 'hello',
      createdAt: 1775662039975,
      lastActivityAt: 1775662050912,
      isArchived: false,
      vmProcessName: 'brave-knuth',
      hostLoopMode: false,
      slashCommands: ['pdf', 'docx'],
      enabledMcpTools: { 'local:db:query': true, 'local:db:write': false, 'local:fs:read': true },
    }
    const session = parseCoworkSessionMeta(raw, '2.1.92')
    expect(session.sessionId).toBe('local_abc-123')
    expect(session.title).toBe('My Session')
    expect(session.model).toBe('claude-opus-4-6')
    expect(session.processName).toBe('brave-knuth')
    expect(session.sdkVersion).toBe('2.1.92')
    expect(session.enabledMcpTools).toEqual(['local:db:query', 'local:fs:read'])
    expect(session.slashCommands).toEqual(['pdf', 'docx'])
    expect(session.durationSeconds).toBeGreaterThan(0)
    expect(session.hostLoopMode).toBe(false)
  })

  it('handles missing optional fields', () => {
    const raw = {
      sessionId: 'local_xyz',
      createdAt: 1000,
      lastActivityAt: 2000,
    }
    const session = parseCoworkSessionMeta(raw, '')
    expect(session.title).toBe('')
    expect(session.model).toBe('unknown')
    expect(session.enabledMcpTools).toEqual([])
    expect(session.slashCommands).toEqual([])
  })
})

describe('filterEnabledMcpTools', () => {
  it('returns only keys with true value', () => {
    const tools = { 'a:b': true, 'c:d': false, 'e:f': true }
    expect(filterEnabledMcpTools(tools)).toEqual(['a:b', 'e:f'])
  })

  it('returns empty array for null/undefined', () => {
    expect(filterEnabledMcpTools(null)).toEqual([])
    expect(filterEnabledMcpTools(undefined)).toEqual([])
  })
})

describe('parseAuditResults', () => {
  it('sums cost and tokens from result entries', () => {
    const lines = [
      '{"type":"user","message":{"role":"user","content":"hello"}}',
      '{"type":"result","subtype":"success","total_cost_usd":0.15,"usage":{"input_tokens":100,"output_tokens":50,"cache_creation_input_tokens":10,"cache_read_input_tokens":5}}',
      '{"type":"result","subtype":"success","total_cost_usd":0.25,"usage":{"input_tokens":200,"output_tokens":100,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}}',
    ]
    const result = parseAuditResults(lines)
    expect(result.estimatedCostUSD).toBeCloseTo(0.40)
    expect(result.tokens.input).toBe(300)
    expect(result.tokens.output).toBe(150)
    expect(result.tokens.cacheCreation).toBe(10)
    expect(result.tokens.cacheRead).toBe(5)
    expect(result.tokens.total).toBe(465)
  })

  it('returns zeros for empty input', () => {
    const result = parseAuditResults([])
    expect(result.estimatedCostUSD).toBe(0)
    expect(result.tokens.total).toBe(0)
  })
})

describe('parseSpaces', () => {
  it('parses spaces.json content', () => {
    const raw = {
      spaces: [
        {
          id: 'space-1',
          name: 'C:\\Users\\Downloads',
          folders: [{ path: 'C:\\Users\\Downloads' }],
          instructions: 'manage downloads',
          createdAt: 1000,
          updatedAt: 2000,
        },
      ],
    }
    const spaces = parseSpaces(raw)
    expect(spaces).toHaveLength(1)
    expect(spaces[0].name).toBe('C:\\Users\\Downloads')
    expect(spaces[0].folders).toEqual(['C:\\Users\\Downloads'])
    expect(spaces[0].instructions).toBe('manage downloads')
  })

  it('returns empty array for null/invalid input', () => {
    expect(parseSpaces(null)).toEqual([])
    expect(parseSpaces({})).toEqual([])
  })
})

describe('parsePluginManifest', () => {
  it('extracts plugin info from manifest', () => {
    const raw = {
      plugins: [
        { id: 'p1', name: 'data', marketplaceName: 'knowledge-work', installedBy: 'user' },
      ],
    }
    const plugins = parsePluginManifest(raw)
    expect(plugins).toHaveLength(1)
    expect(plugins[0].name).toBe('data')
    expect(plugins[0].marketplaceName).toBe('knowledge-work')
  })

  it('returns empty array for null input', () => {
    expect(parsePluginManifest(null)).toEqual([])
  })
})
