import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computeWeekTokens, processUsageUpdate } from '../usage-processor'
import type { SessionEntry, UsageData } from '../../renderer/lib/types'

vi.mock('../app-data', () => ({ writeAppData: vi.fn() }))
vi.mock('../calibration', () => ({ addCalibrationPoint: vi.fn() }))
vi.mock('../sse', () => ({ broadcast: vi.fn() }))

import { writeAppData } from '../app-data'
import { addCalibrationPoint } from '../calibration'
import { broadcast } from '../sse'

const makeSession = (startedAt: string, totalTokens: number): SessionEntry => ({
  sessionId: 'test', title: '', projectPath: '', projectName: '', startedAt,
  endedAt: '', durationSeconds: 0, entrypoint: 'cli', models: [], primaryModel: '',
  usedThinking: false, tokens: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, total: totalTokens },
  estimatedCostUSD: 0
})

describe('computeWeekTokens', () => {
  it('sums tokens for sessions within the week window', () => {
    const resetsAt = '2026-03-27T00:00:00Z'
    const sessions = [
      makeSession('2026-03-22T10:00:00Z', 1500),
      makeSession('2026-03-10T10:00:00Z', 18000), // before the week
    ]
    expect(computeWeekTokens(sessions, resetsAt)).toBe(1500)
  })
})

describe('processUsageUpdate', () => {
  beforeEach(() => { vi.clearAllMocks() })

  const baseUsage: UsageData = {
    fiveHour: null, sevenDay: null, sevenDaySonnet: null, sevenDayOpus: null,
    extraUsage: null, fetchedAt: '2026-03-20T12:00:00Z', source: 'extension'
  }

  it('writes to cache and broadcasts SSE', async () => {
    await processUsageUpdate(baseUsage, [])
    expect(writeAppData).toHaveBeenCalledWith('usage-cache.json', baseUsage)
    expect(broadcast).toHaveBeenCalledWith('usage:updated', baseUsage)
  })

  it('calls addCalibrationPoint when sevenDay is present', async () => {
    const usage = { ...baseUsage, sevenDay: { utilization: 0.4, resetsAt: '2026-03-27T00:00:00Z' } }
    const sessions = [makeSession('2026-03-22T10:00:00Z', 5000)]
    await processUsageUpdate(usage, sessions)
    expect(addCalibrationPoint).toHaveBeenCalledWith(0.4, 5000, '2026-03-27T00:00:00Z')
  })

  it('does NOT call addCalibrationPoint when sevenDay is null', async () => {
    await processUsageUpdate(baseUsage, [])
    expect(addCalibrationPoint).not.toHaveBeenCalled()
  })
})
