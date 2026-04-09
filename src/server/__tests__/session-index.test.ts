import { describe, it, expect } from 'vitest'

import {
  buildIndexFromHistory,
  resolveOrphanProject,
  mergeIntoIndex,
} from '../session-index'

describe('buildIndexFromHistory', () => {
  it('creates entries from history lines with correct projectPath', () => {
    const historyLines = [
      { sessionId: 'abc-123', project: 'C:\\Users\\Cyril\\Documents\\Dev\\my-project', display: 'hello', timestamp: 1000 },
      { sessionId: 'def-456', project: 'C:\\Users\\Cyril\\Documents\\Dev\\other', display: 'world', timestamp: 2000 },
    ]
    const index = buildIndexFromHistory(historyLines)
    expect(index['abc-123']).toEqual({
      projectPath: 'C:\\Users\\Cyril\\Documents\\Dev\\my-project',
      projectName: 'my-project',
      source: 'cli',
      title: 'hello',
      timestamp: 1000,
    })
    expect(index['def-456'].projectName).toBe('other')
  })

  it('handles empty project path', () => {
    const historyLines = [
      { sessionId: 'abc-123', project: '', display: 'test', timestamp: 1000 },
    ]
    const index = buildIndexFromHistory(historyLines)
    expect(index['abc-123'].projectPath).toBe('')
    expect(index['abc-123'].projectName).toBe('unknown')
  })

  it('deduplicates by sessionId, keeping last entry', () => {
    const historyLines = [
      { sessionId: 'abc-123', project: 'C:\\path\\a', display: 'first', timestamp: 1000 },
      { sessionId: 'abc-123', project: 'C:\\path\\a', display: 'second', timestamp: 2000 },
    ]
    const index = buildIndexFromHistory(historyLines)
    expect(index['abc-123'].title).toBe('second')
    expect(index['abc-123'].timestamp).toBe(2000)
  })
})

describe('resolveOrphanProject', () => {
  it('matches encoded dir against known project paths', () => {
    const knownPaths = [
      'C:\\Users\\Cyril\\Documents\\Developpement\\MATCHEM\\data-flow-orchestrator',
      'C:\\Users\\Cyril\\Documents\\Developpement\\PANDAPROG\\ClaudeCockpit',
    ]
    const encodedDir = 'c--Users-Cyril-Documents-Developpement-MATCHEM-data-flow-orchestrator'
    const result = resolveOrphanProject(encodedDir, knownPaths)
    expect(result).toBe('C:\\Users\\Cyril\\Documents\\Developpement\\MATCHEM\\data-flow-orchestrator')
  })

  it('returns null when no match found', () => {
    const knownPaths = ['C:\\path\\a']
    const encodedDir = 'c--totally-unknown-path'
    const result = resolveOrphanProject(encodedDir, knownPaths)
    expect(result).toBeNull()
  })

  it('matches case-insensitively', () => {
    const knownPaths = ['C:\\Users\\Cyril\\Documents\\Dev\\MyProject']
    const encodedDir = 'c--users-cyril-documents-dev-myproject'
    const result = resolveOrphanProject(encodedDir, knownPaths)
    expect(result).toBe('C:\\Users\\Cyril\\Documents\\Dev\\MyProject')
  })
})

describe('mergeIntoIndex', () => {
  it('adds new entry to existing index', () => {
    const existing = {
      'abc-123': { projectPath: 'C:\\a', projectName: 'a', source: 'cli' as const, title: 'x', timestamp: 1000 },
    }
    const newEntry = { projectPath: 'C:\\b', projectName: 'b', source: 'cli' as const, title: 'y', timestamp: 2000 }
    const merged = mergeIntoIndex(existing, 'def-456', newEntry)
    expect(Object.keys(merged)).toHaveLength(2)
    expect(merged['def-456'].projectName).toBe('b')
  })

  it('does not overwrite existing entry', () => {
    const existing = {
      'abc-123': { projectPath: 'C:\\a', projectName: 'a', source: 'cli' as const, title: 'x', timestamp: 1000 },
    }
    const newEntry = { projectPath: 'C:\\b', projectName: 'b', source: 'cli' as const, title: 'y', timestamp: 2000 }
    const merged = mergeIntoIndex(existing, 'abc-123', newEntry)
    expect(merged['abc-123'].projectName).toBe('a')
  })
})
