import { describe, it, expect } from 'vitest'
import { resolveProjectDirName } from '../history-parser'

describe('resolveProjectDirName', () => {
  it('converts Windows path to dir name', () => {
    expect(resolveProjectDirName('C:\\Users\\cyril\\Documents\\my-project')).toBe(
      'C--Users-cyril-Documents-my-project'
    )
  })

  it('converts path with underscores', () => {
    expect(resolveProjectDirName('C:\\Users\\cyril\\l2lt_api')).toBe('C--Users-cyril-l2lt-api')
  })

  it('converts macOS path', () => {
    expect(resolveProjectDirName('/Users/cyril/projects/myapp')).toBe(
      '-Users-cyril-projects-myapp'
    )
  })

  it('handles empty string', () => {
    expect(resolveProjectDirName('')).toBe('')
  })
})
