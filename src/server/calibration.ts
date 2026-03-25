import { readAppData, writeAppData } from './app-data'

const CALIBRATION_FILE = 'calibration.json'

interface DeltaPoint {
  deltaApiPercent: number
  deltaLocalTokens: number
  timestamp: string
}

interface CalibrationStore {
  points: DeltaPoint[]
  lastApiUsage: number | null
  lastLocalTokens: number | null
  lastResetDate: string | null
  tokensPerPercent: number | null
}

const EMPTY_STORE: CalibrationStore = {
  points: [],
  lastApiUsage: null,
  lastLocalTokens: null,
  lastResetDate: null,
  tokensPerPercent: null,
}

export function computeTokensPerPercent(points: DeltaPoint[]): number | null {
  const valid = points.filter((p) => p.deltaApiPercent > 0)
  if (valid.length === 0) return null

  // Take last 10 points, weight recent ones 2x
  const recent = valid.slice(-10)
  let weightedSum = 0
  let totalWeight = 0
  recent.forEach((p, i) => {
    const ratio = p.deltaLocalTokens / p.deltaApiPercent
    const weight = i === recent.length - 1 ? 2 : 1 // most recent gets 2x
    weightedSum += ratio * weight
    totalWeight += weight
  })

  return weightedSum / totalWeight
}

export async function addCalibrationPoint(
  apiUsagePercent: number,
  localTokens: number,
  resetsAt: string
): Promise<void> {
  const store = await readAppData<CalibrationStore>(CALIBRATION_FILE, EMPTY_STORE)

  // Check for weekly reset (compare as timestamps to ignore microsecond differences)
  const lastResetTs = store.lastResetDate ? new Date(store.lastResetDate).getTime() : null
  const newResetTs = new Date(resetsAt).getTime()
  if (lastResetTs !== null && Math.abs(newResetTs - lastResetTs) > 60000) {
    // New week — clear points
    store.points = []
    store.lastApiUsage = null
    store.lastLocalTokens = null
  }

  store.lastResetDate = resetsAt

  // Compute delta if we have a previous point
  if (store.lastApiUsage !== null && store.lastLocalTokens !== null) {
    const deltaApi = apiUsagePercent - store.lastApiUsage
    const deltaTokens = localTokens - store.lastLocalTokens

    if (deltaApi > 0 && deltaTokens > 0) {
      store.points.push({
        deltaApiPercent: deltaApi,
        deltaLocalTokens: deltaTokens,
        timestamp: new Date().toISOString(),
      })
    }
  }

  store.lastApiUsage = apiUsagePercent
  store.lastLocalTokens = localTokens
  store.tokensPerPercent = computeTokensPerPercent(store.points)

  await writeAppData(CALIBRATION_FILE, store)
}

export async function getCalibrationData(): Promise<CalibrationStore> {
  return readAppData<CalibrationStore>(CALIBRATION_FILE, EMPTY_STORE)
}

export function predictRemaining(
  currentApiPercent: number,
  tokensPerPercent: number | null
): { percent: number; estimatedTokens: number | null } {
  const percent = Math.max(0, 100 - currentApiPercent)
  const estimatedTokens = tokensPerPercent ? Math.round(percent * tokensPerPercent) : null
  return { percent, estimatedTokens }
}
