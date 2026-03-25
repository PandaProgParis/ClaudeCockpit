import { writeAppData } from './app-data'
import { addCalibrationPoint } from './calibration'
import { broadcast } from './sse'
import type { UsageData, SessionEntry } from '../renderer/lib/types'

export function computeWeekTokens(sessions: SessionEntry[], resetsAt: string): number {
  const weekStart = new Date(new Date(resetsAt).getTime() - 7 * 24 * 3600 * 1000)
  return sessions
    .filter(s => new Date(s.startedAt) >= weekStart)
    .reduce((sum, s) => sum + s.tokens.total, 0)
}

export async function processUsageUpdate(
  usage: UsageData,
  sessions: SessionEntry[]
): Promise<void> {
  await writeAppData('usage-cache.json', usage)
  broadcast('usage:updated', usage)

  if (usage.sevenDay) {
    const weekTokens = computeWeekTokens(sessions, usage.sevenDay.resetsAt)
    await addCalibrationPoint(usage.sevenDay.utilization, weekTokens, usage.sevenDay.resetsAt)
  }
}
