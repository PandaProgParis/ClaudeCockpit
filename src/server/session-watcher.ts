import type { FSWatcher } from 'chokidar'
import chokidar from 'chokidar'
import { stat } from 'fs/promises'
import { homedir } from 'os'
import { join, basename } from 'path'
import { parseSessionFile } from './history-parser'
import { estimateCost } from '../renderer/lib/cost'
import { getContextLimit } from '../renderer/lib/cost'
import { addToIndex, lookupSession } from './session-index'
import type { ActiveSession } from '../renderer/lib/types'

const PROJECTS_DIR = join(homedir(), '.claude', 'projects')
const ACTIVE_THRESHOLD = 60_000     // 60 seconds
const IDLE_THRESHOLD = 15 * 60_000  // 15 minutes

export function classifySessionStatus(mtimeMs: number, nowMs: number): 'active' | 'idle' | 'ended' {
  const age = nowMs - mtimeMs
  if (age < ACTIVE_THRESHOLD) return 'active'
  if (age < IDLE_THRESHOLD) return 'idle'
  return 'ended'
}

type WatcherEvent =
  | { type: 'session:active'; data: ActiveSession }
  | { type: 'session:idle'; data: { sessionId: string; lastActivityAt: string } }
  | { type: 'session:ended'; data: { sessionId: string } }

// Track known sessions: sessionId -> { filePath, lastMtimeMs, lastStatus }
const trackedSessions = new Map<string, { filePath: string; lastMtimeMs: number; lastStatus: string }>()

let watcher: FSWatcher | null = null
let pollInterval: ReturnType<typeof setInterval> | null = null

export async function getActiveSessions(): Promise<ActiveSession[]> {
  const results: ActiveSession[] = []
  const now = Date.now()

  for (const [sessionId, info] of trackedSessions) {
    const status = classifySessionStatus(info.lastMtimeMs, now)
    if (status === 'ended') continue

    const parsed = await parseSessionFile(info.filePath)
    if (!parsed) continue

    // Resolve projectPath/projectName via the session index (built from history.jsonl
    // with real paths). Fallback: extract last segment from the encoded dir name —
    // note: this fallback loses info for project names containing dashes (e.g. "redac-xsl").
    const indexEntry = lookupSession(sessionId)
    let projectPath: string
    let projectName: string
    if (indexEntry?.projectPath) {
      projectPath = indexEntry.projectPath
      projectName = indexEntry.projectName
    } else {
      const parts = info.filePath.split(/[\\/]/)
      const projectDirIndex = parts.indexOf('projects')
      const rawDirName = projectDirIndex >= 0 ? parts[projectDirIndex + 1] : 'unknown'
      const segments = rawDirName.split('-').filter(Boolean)
      const fallback = segments[segments.length - 1] || rawDirName
      projectPath = fallback
      projectName = fallback
    }

    // contextSize = input_tokens of the last assistant message (= what Claude currently "sees")
    const contextSize = parsed.lastMessageInputTokens
    const maxContextSize = getContextLimit(parsed.primaryModel)

    results.push({
      sessionId,
      title: parsed.title,
      projectPath,
      projectName,
      startedAt: parsed.startedAt,
      model: parsed.primaryModel,
      usedThinking: parsed.usedThinking,
      tokens: parsed.tokens,
      estimatedCostUSD: estimateCost(parsed.primaryModel, parsed.tokens),
      status,
      lastActivityAt: new Date(info.lastMtimeMs).toISOString(),
      contextSize,
      maxContextSize
    })
  }

  return results
}

// Detect Docker: /.dockerenv exists or running as PID 1 in cgroup
const IS_DOCKER = process.env.DOCKER === '1' || process.env.container === 'docker'

export function startWatcher(onEvent: (event: WatcherEvent) => void): void {
  // Watch the projects directory (not glob — glob fails on Windows paths)
  // In Docker with bind mounts, inotify doesn't work — must use polling
  watcher = chokidar.watch(PROJECTS_DIR, {
    ignoreInitial: false,
    depth: 2,
    usePolling: IS_DOCKER,
    interval: IS_DOCKER ? 2000 : undefined,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 250 }
  })

  const handleFile = async (filePath: string) => {
    if (!filePath.endsWith('.jsonl')) return
    const sessionId = basename(filePath, '.jsonl')
    try {
      const stats = await stat(filePath)
      const now = Date.now()
      const status = classifySessionStatus(stats.mtimeMs, now)
      // Only track if active or idle (skip old ended sessions on initial scan)
      if (status !== 'ended') {
        trackedSessions.set(sessionId, { filePath, lastMtimeMs: stats.mtimeMs, lastStatus: status })
      }
      // Add to session index
      addToIndex(sessionId, {
        projectPath: null,
        projectName: basename(join(filePath, '..')),
        source: 'cli',
        title: '',
        timestamp: Date.now(),
      })
    } catch { /* file may have been deleted */ }
  }

  watcher.on('add', handleFile)
  watcher.on('change', async (filePath: string) => {
    if (!filePath.endsWith('.jsonl')) return
    const sessionId = basename(filePath, '.jsonl')
    try {
      const stats = await stat(filePath)
      trackedSessions.set(sessionId, { filePath, lastMtimeMs: stats.mtimeMs, lastStatus: 'active' })
    } catch { /* file may have been deleted */ }
  })

  // Poll every 5 seconds to reclassify sessions
  pollInterval = setInterval(async () => {
    const now = Date.now()
    for (const [sessionId, info] of trackedSessions) {
      const newStatus = classifySessionStatus(info.lastMtimeMs, now)

      if (newStatus !== info.lastStatus) {
        info.lastStatus = newStatus

        if (newStatus === 'ended') {
          onEvent({ type: 'session:ended', data: { sessionId } })
          trackedSessions.delete(sessionId)
        } else if (newStatus === 'idle') {
          onEvent({ type: 'session:idle', data: { sessionId, lastActivityAt: new Date(info.lastMtimeMs).toISOString() } })
        } else {
          // Re-parse and emit active event
          const sessions = await getActiveSessions()
          const session = sessions.find(s => s.sessionId === sessionId)
          if (session) onEvent({ type: 'session:active', data: session })
        }
      }
    }
  }, 5000)
}

export function stopWatcher(): void {
  if (watcher) { watcher.close(); watcher = null }
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
  trackedSessions.clear()
}
