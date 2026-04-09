import { readdir } from 'fs/promises'
import { join, basename } from 'path'
import { homedir } from 'os'
import { findSessionDirBySessionId, resolveProjectDirName, parallel, streamLines, readHistoryIndex } from './history-parser'
import { readAppData, writeAppData } from './app-data'
import type { SearchScope, SearchResult, SessionEntry, SessionIndexEntry, SessionIndex } from '../renderer/lib/types'

// PROJECTS_DIR is not exported from history-parser.ts, so we keep it local here.
const PROJECTS_DIR = join(homedir(), '.claude', 'projects')
const INDEX_FILE = 'session-index.json'

// ─── Pure logic for session index (exported for testing) ─────

export function buildIndexFromHistory(
  historyLines: { sessionId: string; project: string; display: string; timestamp: number }[]
): Record<string, SessionIndexEntry> {
  const entries: Record<string, SessionIndexEntry> = {}
  for (const line of historyLines) {
    entries[line.sessionId] = {
      projectPath: line.project,
      projectName: line.project ? basename(line.project) : 'unknown',
      source: 'cli',
      title: line.display || '',
      timestamp: line.timestamp,
    }
  }
  return entries
}

export function resolveOrphanProject(
  encodedDir: string,
  knownPaths: string[]
): string | null {
  const encodedLower = encodedDir.toLowerCase()
  for (const p of knownPaths) {
    const encoded = resolveProjectDirName(p).toLowerCase()
    if (encoded === encodedLower) return p
  }
  return null
}

export function mergeIntoIndex(
  existing: Record<string, SessionIndexEntry>,
  sessionId: string,
  entry: SessionIndexEntry
): Record<string, SessionIndexEntry> {
  if (existing[sessionId]) return existing
  return { ...existing, [sessionId]: entry }
}

// ─── I/O layer for session index ──────────────────────────────

let memoryIndex: SessionIndex | null = null

export async function loadIndex(): Promise<SessionIndex> {
  if (memoryIndex) return memoryIndex
  memoryIndex = await readAppData<SessionIndex>(INDEX_FILE, { version: 1, builtAt: '', sessions: {} })
  return memoryIndex
}

export async function rebuildIndex(): Promise<SessionIndex> {
  // 1. Read history.jsonl
  const historyLines = await readHistoryIndex()
  const sessions = buildIndexFromHistory(historyLines)

  // 2. Collect all known project paths from history
  const knownPaths = [...new Set(historyLines.map(h => h.project).filter(Boolean))]

  // 3. Scan project directories for orphan sessions
  let projectDirs: string[] = []
  try {
    projectDirs = await readdir(PROJECTS_DIR)
  } catch { /* projects dir may not exist */ }

  // Build dir -> Set<sessionId> cache
  const dirSessionMap = new Map<string, Set<string>>()
  for (const dir of projectDirs) {
    const dirPath = join(PROJECTS_DIR, dir)
    try {
      const files = await readdir(dirPath)
      const sessionIds = new Set(files.filter(f => f.endsWith('.jsonl')).map(f => basename(f, '.jsonl')))
      dirSessionMap.set(dir, sessionIds)
    } catch { /* skip */ }
  }

  // First pass: resolve orphans against known paths, add ALL to index
  for (const [dir, sessionIds] of dirSessionMap) {
    const resolved = resolveOrphanProject(dir, knownPaths)
    for (const sessionId of sessionIds) {
      if (sessions[sessionId]) continue
      sessions[sessionId] = {
        projectPath: resolved,
        projectName: resolved ? basename(resolved) : dir,
        source: 'cli',
        title: '',
        timestamp: 0,
      }
    }
  }

  // 4. Discover more paths by scanning parent AND grandparent directories
  const parentDirs = [...new Set(knownPaths.map(p => join(p, '..')))]
  const grandparentDirs = [...new Set(parentDirs.map(p => join(p, '..')))]
  const allScanDirs = [...new Set([...parentDirs, ...grandparentDirs])]
  const discoveredPaths: string[] = [...knownPaths]

  for (const scanDir of allScanDirs) {
    try {
      const children = await readdir(scanDir)
      for (const child of children) {
        const childPath = join(scanDir, child)
        discoveredPaths.push(childPath)
        // Also scan one level deeper (e.g. PANDAPROG/ClaudeCockpit)
        try {
          const grandchildren = await readdir(childPath)
          for (const gc of grandchildren) {
            discoveredPaths.push(join(childPath, gc))
          }
        } catch { /* not a dir or inaccessible */ }
      }
    } catch { /* skip inaccessible dirs */ }
  }

  // Second pass: re-resolve still-unresolved orphans with expanded paths
  for (const [sessionId, entry] of Object.entries(sessions)) {
    if (entry.projectPath !== null) continue
    // Find which directory this session belongs to
    for (const [dir, sessionIds] of dirSessionMap) {
      if (!sessionIds.has(sessionId)) continue
      const resolved = resolveOrphanProject(dir, discoveredPaths)
      if (resolved) {
        entry.projectPath = resolved
        entry.projectName = basename(resolved)
      }
      break
    }
  }

  const index: SessionIndex = {
    version: 1,
    builtAt: new Date().toISOString(),
    sessions,
  }

  memoryIndex = index
  await writeAppData(INDEX_FILE, index)
  return index
}

export function addToIndex(sessionId: string, entry: SessionIndexEntry): void {
  if (!memoryIndex) return
  if (memoryIndex.sessions[sessionId]) return
  memoryIndex.sessions[sessionId] = entry
  writeAppData(INDEX_FILE, memoryIndex).catch(() => {})
}

export function lookupSession(sessionId: string): SessionIndexEntry | null {
  return memoryIndex?.sessions[sessionId] ?? null
}

export function getAllIndexEntries(): Record<string, SessionIndexEntry> {
  return memoryIndex?.sessions ?? {}
}

// ─── Internal index ───────────────────────────────────────────

interface IndexedSession {
  sessionId:     string
  projectPath:   string
  userMessages:  string[]
  assistantText: string[]
  filePaths:     string[]
}

let index: IndexedSession[] = []

// Used for tests — allows injecting raw data without file I/O
export function buildIndexFromRaw(data: IndexedSession[]): void {
  index = data
}

// ─── JSONL parsing ────────────────────────────────────────────

async function extractIndexData(filePath: string): Promise<Omit<IndexedSession, 'sessionId' | 'projectPath'>> {
  const userMessages:  string[] = []
  const assistantText: string[] = []
  const filePaths:     string[] = []

  let lines: string[]
  try {
    lines = await streamLines(filePath)
  } catch {
    return { userMessages, assistantText, filePaths }
  }

  const seenMsgIds = new Set<string>()

  for (const line of lines) {
    let entry: any
    try { entry = JSON.parse(line) } catch { continue }

    // User messages
    if (entry.type === 'user' && entry.message) {
      const msg = entry.message
      if (typeof msg.content === 'string' && msg.content) {
        userMessages.push(msg.content)
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text' && block.text) userMessages.push(block.text)
        }
      }
    }

    // Assistant messages (deduplicated by message.id)
    if (entry.type === 'assistant' && entry.message?.id) {
      if (seenMsgIds.has(entry.message.id)) continue
      seenMsgIds.add(entry.message.id)

      if (Array.isArray(entry.message.content)) {
        for (const block of entry.message.content) {
          if (block.type === 'text' && block.text) assistantText.push(block.text)
          if (block.type === 'tool_use' && block.input) {
            const input = block.input as Record<string, unknown>
            const path = input.path ?? input.file_path
            if (typeof path === 'string' && path) filePaths.push(path)
          }
        }
      }
    }
  }

  return { userMessages, assistantText, filePaths }
}

// ─── Public API ───────────────────────────────────────────────

export async function buildIndex(sessions: SessionEntry[]): Promise<void> {
  const entries = await parallel(sessions, 20, async (s) => {
    let dir = s.projectPath
      ? join(PROJECTS_DIR, resolveProjectDirName(s.projectPath))
      : null
    // Fallback: scan for the file
    if (!dir) dir = await findSessionDirBySessionId(s.sessionId)
    if (!dir) return null

    const filePath = join(dir, `${s.sessionId}.jsonl`)
    const data = await extractIndexData(filePath)
    return { sessionId: s.sessionId, projectPath: s.projectPath, ...data }
  })
  index = entries.filter((e): e is IndexedSession => e !== null)
}

export async function updateIndexForSession(sessionId: string, projectPath: string): Promise<void> {
  const dir = projectPath
    ? join(PROJECTS_DIR, resolveProjectDirName(projectPath))
    : await findSessionDirBySessionId(sessionId)
  if (!dir) return

  const filePath = join(dir, `${sessionId}.jsonl`)
  const data = await extractIndexData(filePath)
  const existing = index.findIndex(e => e.sessionId === sessionId)
  const entry = { sessionId, projectPath, ...data }
  if (existing >= 0) index[existing] = entry
  else index.push(entry)
}

// ─── Snippet building ─────────────────────────────────────────

function buildSnippet(text: string, query: string): SearchResult['snippet'] {
  const lower = text.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx < 0) return { before: '', match: text.slice(0, 40), after: '' }
  const before = text.slice(Math.max(0, idx - 80), idx)
  const match  = text.slice(idx, idx + query.length)
  const after  = text.slice(idx + query.length, idx + query.length + 80)
  return { before, match, after }
}

// ─── Search ───────────────────────────────────────────────────

export function searchIndex(query: string, scope: SearchScope): SearchResult[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  const results: SearchResult[] = []

  for (const session of index) {
    let matched = false

    if (scope.user && !matched) {
      for (const msg of session.userMessages) {
        if (msg.toLowerCase().includes(q)) {
          results.push({ sessionId: session.sessionId, projectPath: session.projectPath, matchedIn: 'user', snippet: buildSnippet(msg, query) })
          matched = true
          break
        }
      }
    }

    if (scope.files && !matched) {
      for (const fp of session.filePaths) {
        if (fp.toLowerCase().includes(q)) {
          results.push({ sessionId: session.sessionId, projectPath: session.projectPath, matchedIn: 'file', snippet: buildSnippet(fp, query) })
          matched = true
          break
        }
      }
    }

    if (scope.assistant && !matched) {
      for (const text of session.assistantText) {
        if (text.toLowerCase().includes(q)) {
          results.push({ sessionId: session.sessionId, projectPath: session.projectPath, matchedIn: 'assistant', snippet: buildSnippet(text, query) })
          matched = true
          break
        }
      }
    }
  }

  return results
}
