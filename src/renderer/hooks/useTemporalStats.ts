import { useMemo } from 'react'
import type { SessionEntry, TimePeriod, TimeBucket, TemporalStats } from '../lib/types'

// --- Helpers ---

function emptyTokens() {
  return { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, total: 0 }
}

function addSessionToBucket(bucket: TimeBucket, s: SessionEntry): void {
  bucket.sessionCount++
  bucket.tokens.input += s.tokens.input
  bucket.tokens.output += s.tokens.output
  bucket.tokens.cacheCreation += s.tokens.cacheCreation
  bucket.tokens.cacheRead += s.tokens.cacheRead
  bucket.tokens.total += s.tokens.total
  bucket.costUSD += s.estimatedCostUSD
  bucket.durationSeconds += s.durationSeconds
  bucket.models[s.primaryModel] = (bucket.models[s.primaryModel] ?? 0) + 1
  bucket.projects[s.projectName] = (bucket.projects[s.projectName] ?? 0) + 1
}

function makeBucket(label: string, start: Date, end: Date): TimeBucket {
  return {
    label,
    start: start.toISOString(),
    end: end.toISOString(),
    sessionCount: 0,
    tokens: emptyTokens(),
    costUSD: 0,
    durationSeconds: 0,
    models: {},
    projects: {},
  }
}

function formatWindowLabel(start: Date): string {
  const day = String(start.getDate()).padStart(2, '0')
  const month = String(start.getMonth() + 1).padStart(2, '0')
  const h1 = String(start.getHours()).padStart(2, '0')
  const end = new Date(start.getTime() + 5 * 3600_000)
  const h2 = String(end.getHours()).padStart(2, '0')
  return `${day}/${month} ${h1}h-${h2}h`
}

// --- 5h-window bucketing ---

const FIVE_HOURS_MS = 5 * 3600_000

export function bucket5hWindows(sessions: SessionEntry[]): TimeBucket[] {
  if (sessions.length === 0) return []
  const sorted = [...sessions].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
  const buckets: TimeBucket[] = []
  let windowStart: Date | null = null
  let windowEnd = 0
  let current: TimeBucket | null = null

  for (const s of sorted) {
    const t = new Date(s.startedAt).getTime()
    if (windowStart === null || t >= windowEnd) {
      windowStart = new Date(t)
      windowEnd = t + FIVE_HOURS_MS
      const endDate = new Date(windowEnd)
      current = makeBucket(formatWindowLabel(windowStart), windowStart, endDate)
      buckets.push(current)
    }
    addSessionToBucket(current!, s)
  }

  return buckets
}

// --- Hourly bucketing ---

export function bucketHourly(sessions: SessionEntry[]): TimeBucket[] {
  const map = new Map<string, TimeBucket>()

  for (const s of sessions) {
    const d = new Date(s.startedAt)
    const hourStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours())
    const key = hourStart.toISOString()

    if (!map.has(key)) {
      const hourEnd = new Date(hourStart.getTime() + 3600_000)
      const label = `${String(hourStart.getDate()).padStart(2, '0')}/${String(hourStart.getMonth() + 1).padStart(2, '0')} ${String(hourStart.getHours()).padStart(2, '0')}h`
      map.set(key, makeBucket(label, hourStart, hourEnd))
    }
    addSessionToBucket(map.get(key)!, s)
  }

  return Array.from(map.values()).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

// --- Daily bucketing ---

export function bucketDaily(sessions: SessionEntry[]): TimeBucket[] {
  const map = new Map<string, TimeBucket>()

  for (const s of sessions) {
    const d = new Date(s.startedAt)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const key = dayStart.toISOString()

    if (!map.has(key)) {
      const dayEnd = new Date(dayStart.getTime() + 86_400_000)
      const label = `${String(dayStart.getDate()).padStart(2, '0')}/${String(dayStart.getMonth() + 1).padStart(2, '0')}/${dayStart.getFullYear()}`
      map.set(key, makeBucket(label, dayStart, dayEnd))
    }
    addSessionToBucket(map.get(key)!, s)
  }

  return Array.from(map.values()).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

// --- Weekly bucketing (ISO: Monday to Sunday) ---

function getISOWeekStart(d: Date): Date {
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
  return monday
}

function getISOWeekNumber(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

export function bucketWeekly(sessions: SessionEntry[]): TimeBucket[] {
  const map = new Map<string, TimeBucket>()

  for (const s of sessions) {
    const d = new Date(s.startedAt)
    const monday = getISOWeekStart(d)
    const key = monday.toISOString()

    if (!map.has(key)) {
      const sunday = new Date(monday.getTime() + 7 * 86_400_000)
      const weekNum = getISOWeekNumber(d)
      const label = `S${weekNum} — ${String(monday.getDate()).padStart(2, '0')}/${String(monday.getMonth() + 1).padStart(2, '0')}`
      map.set(key, makeBucket(label, monday, sunday))
    }
    addSessionToBucket(map.get(key)!, s)
  }

  return Array.from(map.values()).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

// --- Totals computation ---

function computeTotals(buckets: TimeBucket[]): TemporalStats['totals'] {
  if (buckets.length === 0) {
    return { avgTokensPerBucket: 0, avgCostPerBucket: 0, avgSessionsPerBucket: 0, peakBucket: null }
  }
  const n = buckets.length
  const totalTokens = buckets.reduce((sum, b) => sum + b.tokens.total, 0)
  const totalCost = buckets.reduce((sum, b) => sum + b.costUSD, 0)
  const totalSessions = buckets.reduce((sum, b) => sum + b.sessionCount, 0)
  const peakBucket = buckets.reduce((max, b) => (b.costUSD > max.costUSD ? b : max), buckets[0])

  return {
    avgTokensPerBucket: Math.round(totalTokens / n),
    avgCostPerBucket: totalCost / n,
    avgSessionsPerBucket: totalSessions / n,
    peakBucket,
  }
}

// --- Main hook ---

export interface TemporalFilters {
  dateRange?: [Date, Date]
  project?: string
}

export function useTemporalStats(
  sessions: SessionEntry[],
  period: TimePeriod,
  filters: TemporalFilters
): TemporalStats {
  return useMemo(() => {
    let filtered = sessions
    if (filters.dateRange) {
      const [from, to] = filters.dateRange
      filtered = filtered.filter(s => {
        const t = new Date(s.startedAt).getTime()
        return t >= from.getTime() && t <= to.getTime()
      })
    }
    if (filters.project) {
      filtered = filtered.filter(s => s.projectName === filters.project)
    }

    let buckets: TimeBucket[]
    switch (period) {
      case '5h-window': buckets = bucket5hWindows(filtered); break
      case 'hourly':    buckets = bucketHourly(filtered);    break
      case 'daily':     buckets = bucketDaily(filtered);     break
      case 'weekly':    buckets = bucketWeekly(filtered);    break
    }

    const totals = computeTotals(buckets)
    return { period, buckets, totals }
  }, [sessions, period, filters.dateRange?.[0]?.getTime(), filters.dateRange?.[1]?.getTime(), filters.project])
}
