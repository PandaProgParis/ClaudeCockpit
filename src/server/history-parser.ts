import { createReadStream } from 'fs'
import { readdir, access } from 'fs/promises'
import { homedir } from 'os'
import { join, basename } from 'path'
import { createInterface } from 'readline'
import type { SessionEntry } from '../renderer/lib/types'
import { estimateCost } from '../renderer/lib/cost'
import { lookupSession } from './session-index'

const CLAUDE_DIR = join(homedir(), '.claude')
const HISTORY_FILE = join(CLAUDE_DIR, 'history.jsonl')
const PROJECTS_DIR = join(CLAUDE_DIR, 'projects')

// --- Types for raw JSONL data ---

interface HistoryLine {
  display: string
  timestamp: number       // millisecond epoch
  project: string
  sessionId: string
}

interface AssistantMessage {
  id: string
  model: string
  content: { type: string }[]
  usage: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
}

interface SessionLine {
  type: string
  message?: AssistantMessage & { content?: ({ type: string; text?: string })[] }
  timestamp?: string      // ISO string
  entrypoint?: string
  cwd?: string
}

function basenameAny(p: string): string {
  const parts = p.split(/[/\\]/).filter(Boolean)
  return parts[parts.length - 1] ?? p
}

// --- Path resolution ---

export function resolveProjectDirName(projectPath: string): string {
  return projectPath.replace(/[^a-zA-Z0-9]/g, '-')
}

export async function findProjectDir(projectPath: string): Promise<string | null> {
  const encoded = resolveProjectDirName(projectPath)
  try {
    const dirs = await readdir(PROJECTS_DIR)
    const match = dirs.find((d) => d.toLowerCase() === encoded.toLowerCase())
    return match ? join(PROJECTS_DIR, match) : null
  } catch {
    return null
  }
}

export async function findSessionDirBySessionId(sessionId: string): Promise<string | null> {
  try {
    const dirs = await readdir(PROJECTS_DIR)
    for (const dir of dirs) {
      try {
        await access(join(PROJECTS_DIR, dir, `${sessionId}.jsonl`))
        return join(PROJECTS_DIR, dir)
      } catch {
        // not in this dir
      }
    }
    return null
  } catch {
    return null
  }
}

// --- File reading ---

export async function streamLines(filePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const lines: string[] = []
    const rl = createInterface({
      input: createReadStream(filePath, { encoding: 'utf-8' }),
      crlfDelay: Infinity
    })
    rl.on('line', (line) => {
      if (line.trim()) lines.push(line)
    })
    rl.on('close', () => resolve(lines))
    rl.on('error', reject)
  })
}

// --- Parsing ---

export async function readHistoryIndex(): Promise<HistoryLine[]> {
  let lines: string[]
  try {
    lines = await streamLines(HISTORY_FILE)
  } catch {
    return []
  }

  const sessionMap = new Map<string, HistoryLine>()

  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as HistoryLine
      if (!entry.sessionId) continue
      const existing = sessionMap.get(entry.sessionId)
      if (!existing) {
        sessionMap.set(entry.sessionId, entry)
      } else if (entry.display && !entry.display.startsWith('/') && (!existing.display || existing.display.startsWith('/'))) {
        // Replace with a better display (non-slash command)
        existing.display = entry.display
      }
    } catch {
      continue
    }
  }

  return Array.from(sessionMap.values())
}

interface ParsedSession {
  title: string
  models: string[]
  primaryModel: string
  usedThinking: boolean
  tokens: { input: number; output: number; cacheCreation: number; cacheRead: number; total: number }
  lastMessageInputTokens: number
  startedAt: string
  endedAt: string
  durationSeconds: number
  entrypoint: 'cli' | 'claude-vscode' | 'other'
  cwd: string | null
}

export async function parseSessionFile(filePath: string): Promise<ParsedSession | null> {
  let lines: string[]
  try {
    lines = await streamLines(filePath)
  } catch {
    return null
  }

  const seenMsgIds = new Set<string>()
  const modelCount = new Map<string, number>()
  let usedThinking = false
  const tokens = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, total: 0 }
  let lastMessageInputTokens = 0  // input + cache_read + cache_creation of last message = real context size
  let entrypoint: 'cli' | 'claude-vscode' | 'other' = 'cli'
  const timestamps: number[] = []
  let title = ''
  let cwd: string | null = null

  for (const line of lines) {
    let entry: SessionLine
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }

    // Capture the first cwd we see — Claude CLI attaches it to most entries
    if (!cwd && entry.cwd) cwd = entry.cwd

    // Extract title from ai-title entry
    if (!title && entry.type === 'ai-title' && (entry as any).aiTitle) {
      title = (entry as any).aiTitle
    }

    // Collect entrypoint only from progress entries (where it actually appears)
    if (entry.type === 'progress' && entry.entrypoint) {
      if (entry.entrypoint === 'claude-vscode') entrypoint = 'claude-vscode'
      else if (entry.entrypoint !== 'cli') entrypoint = 'other'
    }

    // Collect timestamps
    if (entry.timestamp) {
      const t = new Date(entry.timestamp).getTime()
      if (!isNaN(t)) timestamps.push(t)
    }

    if (entry.type !== 'assistant' || !entry.message) continue
    const msg = entry.message
    if (!msg.id || seenMsgIds.has(msg.id)) continue
    seenMsgIds.add(msg.id)

    // Collect model (skip synthetic)
    if (msg.model && msg.model !== '<synthetic>') {
      modelCount.set(msg.model, (modelCount.get(msg.model) ?? 0) + 1)
    }

    // Check for thinking blocks
    if (!usedThinking && msg.content?.some((c) => c.type === 'thinking')) {
      usedThinking = true
    }

    // Accumulate tokens
    if (msg.usage) {
      tokens.input += msg.usage.input_tokens ?? 0
      tokens.output += msg.usage.output_tokens ?? 0
      tokens.cacheCreation += msg.usage.cache_creation_input_tokens ?? 0
      tokens.cacheRead += msg.usage.cache_read_input_tokens ?? 0
      lastMessageInputTokens = (msg.usage.input_tokens ?? 0)
        + (msg.usage.cache_read_input_tokens ?? 0)
        + (msg.usage.cache_creation_input_tokens ?? 0)
    }
  }

  tokens.total = tokens.input + tokens.output + tokens.cacheCreation + tokens.cacheRead

  // Primary model = most messages
  let primaryModel = 'unknown'
  let maxCount = 0
  for (const [model, count] of modelCount) {
    if (count > maxCount) {
      maxCount = count
      primaryModel = model
    }
  }

  // Duration from timestamps
  timestamps.sort((a, b) => a - b)
  const startMs = timestamps[0] ?? Date.now()
  const endMs = timestamps[timestamps.length - 1] ?? startMs
  const durationSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000))

  return {
    title,
    models: Array.from(modelCount.keys()),
    primaryModel,
    usedThinking,
    tokens,
    lastMessageInputTokens,
    startedAt: new Date(startMs).toISOString(),
    endedAt: new Date(endMs).toISOString(),
    durationSeconds,
    entrypoint,
    cwd,
  }
}

// --- Parallel helper ---

export async function parallel<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let idx = 0
  async function worker() {
    while (idx < items.length) {
      const i = idx++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

// --- Main export ---

export type ProgressCallback = (done: number, total: number) => void

export async function parseAllSessions(onProgress?: ProgressCallback): Promise<SessionEntry[]> {
  const historyEntries = await readHistoryIndex()
  const seenSessionIds = new Set<string>()

  // Pre-cache project directory listing (single readdir instead of one per session)
  let projectDirNames: string[] = []
  try {
    projectDirNames = await readdir(PROJECTS_DIR)
  } catch { /* projects dir may not exist */ }
  const projectDirLower = new Map<string, string>()
  for (const d of projectDirNames) projectDirLower.set(d.toLowerCase(), d)

  // Build sessionId → project dir index for fast lookup
  const sessionToDir = new Map<string, string>()
  for (const dir of projectDirNames) {
    const dirPath = join(PROJECTS_DIR, dir)
    try {
      const files = await readdir(dirPath)
      for (const f of files) {
        if (f.endsWith('.jsonl')) sessionToDir.set(basename(f, '.jsonl'), dirPath)
      }
    } catch { /* skip */ }
  }

  function findProjectDirCached(projectPath: string): string | null {
    const encoded = resolveProjectDirName(projectPath).toLowerCase()
    const match = projectDirLower.get(encoded)
    return match ? join(PROJECTS_DIR, match) : null
  }

  // 1. Prepare tasks from history.jsonl
  interface HistoryTask { entry: HistoryLine; projectPath: string; projectName: string; projectDir: string | null }
  const historyTasks: HistoryTask[] = []
  for (const entry of historyEntries) {
    seenSessionIds.add(entry.sessionId)
    const projectPath = entry.project || ''
    const projectName = projectPath ? basename(projectPath) : 'unknown'
    const projectDir = findProjectDirCached(projectPath) ?? sessionToDir.get(entry.sessionId) ?? null
    historyTasks.push({ entry, projectPath, projectName, projectDir })
  }

  // 2. Collect orphan sessions (in projects/ but not in history.jsonl)
  interface OrphanTask { sessionId: string; dir: string; filePath: string }
  const orphanTasks: OrphanTask[] = []
  for (const [sessionId, dirPath] of sessionToDir) {
    if (!seenSessionIds.has(sessionId)) {
      seenSessionIds.add(sessionId)
      orphanTasks.push({ sessionId, dir: basename(dirPath), filePath: join(dirPath, `${sessionId}.jsonl`) })
    }
  }

  const totalTasks = historyTasks.length + orphanTasks.length
  let done = 0

  // 3. Parse history sessions in parallel
  const historyResults = await parallel(historyTasks, 20, async (task) => {
    const { entry, projectPath, projectName, projectDir } = task

    const fallback: SessionEntry = {
      sessionId: entry.sessionId, title: entry.display || '', projectPath, projectName,
      startedAt: new Date(entry.timestamp).toISOString(), endedAt: new Date(entry.timestamp).toISOString(),
      durationSeconds: 0, entrypoint: 'cli', models: [], primaryModel: 'unknown',
      usedThinking: false, tokens: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, total: 0 }, estimatedCostUSD: 0
    }

    if (!projectDir) { done++; onProgress?.(done, totalTasks); return fallback }

    const parsed = await parseSessionFile(join(projectDir, `${entry.sessionId}.jsonl`))
    done++; onProgress?.(done, totalTasks)
    if (!parsed) return fallback

    const title = entry.display && !entry.display.startsWith('/') ? entry.display : parsed.title

    return {
      sessionId: entry.sessionId, title, projectPath, projectName,
      startedAt: parsed.startedAt, endedAt: parsed.endedAt, durationSeconds: parsed.durationSeconds,
      entrypoint: parsed.entrypoint, models: parsed.models, primaryModel: parsed.primaryModel,
      usedThinking: parsed.usedThinking, tokens: parsed.tokens,
      estimatedCostUSD: estimateCost(parsed.primaryModel, parsed.tokens)
    }
  })

  // 4. Parse orphan sessions in parallel
  const orphanResults = await parallel(orphanTasks, 20, async (task) => {
    const parsed = await parseSessionFile(task.filePath)
    done++; onProgress?.(done, totalTasks)
    if (!parsed || (parsed.tokens.total === 0 && parsed.durationSeconds === 0)) return null

    const indexEntry = lookupSession(task.sessionId)
    // Priority: cwd from the JSONL itself (source of truth) > resolved index
    // entry > encoded dir name. The session-index may contain stale mappings
    // from a previous rebuild, so we trust the raw cwd first.
    const projectPath = parsed.cwd ?? indexEntry?.projectPath ?? task.dir
    const projectName = parsed.cwd
      ? basenameAny(parsed.cwd)
      : (indexEntry?.projectName ?? task.dir)
    return {
      sessionId: task.sessionId, title: parsed.title, projectPath, projectName,
      startedAt: parsed.startedAt, endedAt: parsed.endedAt, durationSeconds: parsed.durationSeconds,
      entrypoint: parsed.entrypoint, models: parsed.models, primaryModel: parsed.primaryModel,
      usedThinking: parsed.usedThinking, tokens: parsed.tokens,
      estimatedCostUSD: estimateCost(parsed.primaryModel, parsed.tokens)
    } as SessionEntry
  })

  const results = [...historyResults, ...orphanResults.filter((r): r is SessionEntry => r !== null)]

  return results.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  )
}
